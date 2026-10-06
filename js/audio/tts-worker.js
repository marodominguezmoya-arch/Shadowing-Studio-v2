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

try {
  importScripts(ORT_BASE + 'ort.wasm.min.js', PHONEMIZE_BASE + 'piper_phonemize.js');
} catch (err) {
  // Signalé à la première requête (voir onmessage).
  self.bootError = `chargement du moteur impossible : ${err.message}`;
}

if (self.ort) {
  ort.env.wasm.wasmPaths = ORT_BASE;
  // Multi-thread uniquement si la page est « cross-origin isolated » ; sinon ORT reste sur 1 thread.
  ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
}

let current = null; // { key, session, config }
let phonemizeUrls = null; // { wasm, data } en blob: URLs

self.onmessage = async (e) => {
  const { id, type } = e.data;
  try {
    if (self.bootError) throw staged('init', new Error(self.bootError));
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
    self.postMessage({
      id,
      ok: false,
      stage: (err && err.stage) || 'unknown',
      error: String(err && err.message ? err.message : err),
    });
  }
};

// Erreur annotée de l'étape où elle s'est produite (download | init | phonemize | synth).
function staged(stage, err) {
  const e = err instanceof Error ? err : new Error(String(err));
  e.stage ||= stage;
  return e;
}

// ---------------------------------------------------------------------------
// Téléchargement avec cache + progression
// ---------------------------------------------------------------------------

// Renvoie un Uint8Array. Un seul tampon en mémoire (important sur iPhone, où la page est
// coupée au-delà d'un certain volume).
async function cachedFetch(url, { id, label, weight = 1, offset = 0, totalWeight = 1 } = {}) {
  let cache = null;
  try {
    cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(url);
    if (hit) return new Uint8Array(await hit.arrayBuffer());
  } catch (err) {
    console.warn('[cache]', err); // cache indisponible : on télécharge quand même
    cache = null;
  }

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw staged('download', new Error(`réseau (${label}) : ${err.message}`));
  }
  if (!res.ok) throw staged('download', new Error(`HTTP ${res.status} (${label})`));

  const total = Number(res.headers.get('Content-Length')) || 0;
  const reader = res.body.getReader();
  let bytes = total ? new Uint8Array(total) : null;
  const chunks = total ? null : [];
  let loaded = 0;
  let lastPost = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (bytes) {
        if (loaded + value.length > bytes.length) throw new Error('taille inattendue');
        bytes.set(value, loaded);
      } else chunks.push(value);
      loaded += value.length;
      const now = Date.now();
      if (id != null && total && now - lastPost > 150) {
        lastPost = now;
        self.postMessage({ id, progress: { loaded: offset + (loaded / total) * weight, total: totalWeight, label } });
      }
    }
  } catch (err) {
    throw staged('download', new Error(`interrompu (${label}, ${loaded} octets) : ${err.message}`));
  }
  if (bytes && loaded !== bytes.length) bytes = bytes.subarray(0, loaded);
  if (!bytes) {
    bytes = new Uint8Array(loaded);
    let pos = 0;
    for (const c of chunks) {
      bytes.set(c, pos);
      pos += c.length;
    }
  }

  if (cache) {
    try {
      await cache.put(url, new Response(bytes, { headers: { 'Content-Type': 'application/octet-stream' } }));
    } catch (err) {
      console.warn('[cache.put]', err); // ex. quota dépassé : la voix marche, mais sera re-téléchargée
    }
  }
  return bytes;
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
  phonemizeUrls = {
    wasm: URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' })),
    data: URL.createObjectURL(new Blob([data])),
  };
}

async function loadVoice(voice, id) {
  if (current && current.key === voice.key) return { key: voice.key, sampleRate: current.config.audio.sample_rate };

  await ensurePhonemizer(id);
  const { model, config } = voiceUrls(voice);
  const configBytes = await cachedFetch(config, { id, label: 'config', weight: 0.01, offset: 0.25, totalWeight: 1 });
  let modelBytes = await cachedFetch(model, { id, label: 'voice', weight: 0.74, offset: 0.26, totalWeight: 1 });

  const cfg = JSON.parse(new TextDecoder().decode(configBytes));
  // Libère l'éventuelle voix précédente avant d'en charger une autre.
  if (current) {
    await current.session.release?.().catch(() => {});
    current = null;
  }
  let session;
  try {
    session = await ort.InferenceSession.create(modelBytes, {
      executionProviders: ['wasm'],
      // Réduit la mémoire réservée par ONNX Runtime (utile sur téléphone).
      enableCpuMemArena: false,
      enableMemPattern: false,
    });
  } catch (err) {
    throw staged('init', err);
  } finally {
    modelBytes = null;
  }
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
  let ids;
  try {
    ids = await phonemize(texts, config.espeak.voice);
  } catch (err) {
    throw staged('phonemize', err);
  }
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
    let out;
    try {
      out = await session.run(feeds);
    } catch (err) {
      throw staged('synth', err);
    }
    pcms.push(Float32Array.from(out.output.data));
  }
  return { pcms, sampleRate: config.audio.sample_rate };
}
