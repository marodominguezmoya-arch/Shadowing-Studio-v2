// Web Worker (classique) : synthèse vocale Piper hors du thread principal.
//
// Messages reçus :
//   { id, type: 'load',  voice: { key, path } }          → charge (et met en cache) la voix
//   { id, type: 'synth', texts: [..], speed }            → { pcms: [Float32Array], sampleRate }
//   { id, type: 'has',   voice }                         → { cached: bool }
//   { id, type: 'delete', voice }                        → supprime la voix du cache
// Messages envoyés : { id, ok, result } | { id, ok: false, error } | { id, progress: { loaded, total, label } }

const ORT_VERSION = '1.22.0';
const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
const PHONEMIZE_BASE = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/';
const CACHE_NAME = 'ss2-voices-v1';

let PIPER_BASE = '';

importScripts(ORT_BASE + 'ort.wasm.min.js', PHONEMIZE_BASE + 'piper_phonemize.js');

ort.env.wasm.wasmPaths = ORT_BASE;
// Multi-thread uniquement si la page est « cross-origin isolated » ; sinon ORT reste sur 1 thread.
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;

let current = null; // { key, session, config }
let phonemizeUrls = null; // { wasm, data } en blob: URLs

self.onmessage = async (e) => {
  const { id, type } = e.data;
  try {
    let result;
    if (type === 'init') {
      PIPER_BASE = e.data.piperBase;
      result = true;
    } else if (type === 'load') result = await loadVoice(e.data.voice, id);
    else if (type === 'synth') result = await synth(e.data.texts, e.data.speed);
    else if (type === 'has') result = { cached: await hasVoice(e.data.voice) };
    else if (type === 'delete') result = await deleteVoice(e.data.voice);
    else throw new Error('type inconnu : ' + type);

    const transfer = result && result.pcms ? result.pcms.map((p) => p.buffer) : [];
    self.postMessage({ id, ok: true, result }, transfer);
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err && err.message ? err.message : err) });
  }
};

// ---------------------------------------------------------------------------
// Téléchargement avec cache + progression
// ---------------------------------------------------------------------------

async function cachedFetch(url, { id, label, weight = 1, offset = 0, totalWeight = 1 } = {}) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(url);
  if (hit) return hit.blob();

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Téléchargement impossible (${res.status}) : ${label}`);

  const total = Number(res.headers.get('Content-Length')) || 0;
  const reader = res.body.getReader();
  const chunks = [];
  let loaded = 0;
  let lastPost = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    const now = Date.now();
    if (id != null && total && now - lastPost > 150) {
      lastPost = now;
      self.postMessage({ id, progress: { loaded: offset + (loaded / total) * weight, total: totalWeight, label } });
    }
  }
  const blob = new Blob(chunks);
  await cache.put(url, new Response(blob, { headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream' } }));
  return blob;
}

function voiceUrls(voice) {
  const model = PIPER_BASE + encodeURI(voice.path);
  return { model, config: model + '.json' };
}

async function hasVoice(voice) {
  const cache = await caches.open(CACHE_NAME);
  const { model, config } = voiceUrls(voice);
  return Boolean((await cache.match(model)) && (await cache.match(config)));
}

async function deleteVoice(voice) {
  const cache = await caches.open(CACHE_NAME);
  const { model, config } = voiceUrls(voice);
  await cache.delete(model);
  await cache.delete(config);
  if (current && current.key === voice.key) current = null;
  return true;
}

// Le phonémiseur (espeak-ng, ~18 Mo) est commun à toutes les langues.
async function ensurePhonemizer(id) {
  if (phonemizeUrls) return;
  const [wasm, data] = await Promise.all([
    cachedFetch(PHONEMIZE_BASE + 'piper_phonemize.wasm', { id, label: 'phonemizer', weight: 0.03, offset: 0, totalWeight: 1 }),
    cachedFetch(PHONEMIZE_BASE + 'piper_phonemize.data', { id, label: 'phonemizer', weight: 0.22, offset: 0.03, totalWeight: 1 }),
  ]);
  phonemizeUrls = { wasm: URL.createObjectURL(wasm), data: URL.createObjectURL(data) };
}

async function loadVoice(voice, id) {
  if (current && current.key === voice.key) return { key: voice.key, sampleRate: current.config.audio.sample_rate };

  await ensurePhonemizer(id);
  const { model, config } = voiceUrls(voice);
  const configBlob = await cachedFetch(config, { id, label: 'config', weight: 0.01, offset: 0.25, totalWeight: 1 });
  const modelBlob = await cachedFetch(model, { id, label: 'voice', weight: 0.74, offset: 0.26, totalWeight: 1 });

  const cfg = JSON.parse(await configBlob.text());
  const session = await ort.InferenceSession.create(await modelBlob.arrayBuffer(), { executionProviders: ['wasm'] });
  current = { key: voice.key, session, config: cfg };
  return { key: voice.key, sampleRate: cfg.audio.sample_rate };
}

// ---------------------------------------------------------------------------
// Synthèse
// ---------------------------------------------------------------------------

// Phonémise plusieurs textes en un seul passage (une ligne de sortie JSON par texte).
function phonemize(texts, espeakVoice) {
  return new Promise((resolve, reject) => {
    const results = [];
    createPiperPhonemize({
      print: (line) => {
        try {
          results.push(JSON.parse(line).phoneme_ids);
        } catch {
          /* ligne non JSON : ignorée */
        }
      },
      printErr: (msg) => console.warn('[phonemize]', msg),
      locateFile: (file) => (file.endsWith('.wasm') ? phonemizeUrls.wasm : file.endsWith('.data') ? phonemizeUrls.data : file),
    })
      .then((module) => {
        const input = JSON.stringify(texts.map((text) => ({ text })));
        module.callMain(['-l', espeakVoice, '--input', input, '--espeak_data', '/espeak-ng-data']);
        if (results.length !== texts.length) {
          reject(new Error(`phonémisation incomplète (${results.length}/${texts.length})`));
        } else resolve(results);
      })
      .catch(reject);
  });
}

async function synth(texts, speed = 1) {
  if (!current) throw new Error('Aucune voix chargée');
  const { session, config } = current;
  const inf = config.inference || {};
  const ids = await phonemize(texts, config.espeak.voice);
  const multiSpeaker = Object.keys(config.speaker_id_map || {}).length > 0;
  // length_scale > 1 = plus lent : on divise par la vitesse voulue.
  const lengthScale = (inf.length_scale ?? 1) / Math.max(0.3, speed);

  const pcms = [];
  for (const phonemeIds of ids) {
    const feeds = {
      input: new ort.Tensor('int64', BigInt64Array.from(phonemeIds.map(BigInt)), [1, phonemeIds.length]),
      input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(phonemeIds.length)]), [1]),
      scales: new ort.Tensor('float32', Float32Array.from([inf.noise_scale ?? 0.667, lengthScale, inf.noise_w ?? 0.8]), [3]),
    };
    if (multiSpeaker) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([0n]), [1]);
    const out = await session.run(feeds);
    pcms.push(Float32Array.from(out.output.data));
  }
  return { pcms, sampleRate: config.audio.sample_rate };
}
