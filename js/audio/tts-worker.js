// Web Worker (classique) : synthèse vocale Piper hors du thread principal.
//
// Messages reçus :
//   { id, type: 'load',  voice: { key, path } }          → charge (et met en cache) la voix
//   { id, type: 'synth', texts: [..], speed }            → { pcms: [Float32Array], sampleRate }
//   { id, type: 'ipa',   texts: [..], espeak }           → [chaîne API par texte] (transcription)
//   { id, type: 'has',   voice }                         → { cached: bool }
//   { id, type: 'delete', voice }                        → supprime la voix du cache
// Messages envoyés : { id, ok, result } | { id, ok: false, error } | { id, progress: { loaded, total, label } }

// 1.18 : dernière version avec une édition WebAssembly mono-thread (ort-wasm-simd.wasm).
// Les versions ≥ 1.19 n'ont plus que l'édition multi-thread, qui réserve une mémoire
// partagée trop grande pour Safari iOS (« RangeError: Out of memory » au démarrage).
const ORT_VERSION = '1.18.0';
const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
const PHONEMIZE_BASE = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/';
const CACHE_NAME = 'ss2-voices-v1';

let PIPER_BASE = '';

// Moteur chargé à la demande, depuis le cache de l'app s'il y est déjà : la voix fonctionne
// ainsi hors connexion, sans dépendre du service worker.
//  - script du phonémiseur (espeak-ng) : voix ET transcription phonétique
//  - ONNX Runtime : uniquement pour la voix
const blobUrl = (bytes, type) => URL.createObjectURL(new Blob([bytes], { type }));
let phonemizerScriptReady = null;
let ortReady = null;

function once(fn) {
  let p = null;
  return (...args) => (p ||= fn(...args).catch((err) => {
    p = null; // nouvel essai possible
    throw err;
  }));
}

const ensurePhonemizerScript = once(async (id) => {
  const js = await cachedFetch(PHONEMIZE_BASE + 'piper_phonemize.js', { id, label: 'engine', weight: 0.01, offset: 0.02, totalWeight: 1 });
  try {
    importScripts(blobUrl(js, 'text/javascript'));
  } catch (err) {
    throw staged('init', new Error(`chargement du phonémiseur impossible : ${err.message}`));
  }
});

const ensureOrt = once(async (id) => {
  const [ortJs, ortWasm] = await Promise.all([
    cachedFetch(ORT_BASE + 'ort.wasm.min.js', { id, label: 'engine', weight: 0.02, offset: 0, totalWeight: 1 }),
    cachedFetch(ORT_BASE + 'ort-wasm-simd.wasm', { id, label: 'engine', weight: 0.09, offset: 0.03, totalWeight: 1 }),
  ]);
  try {
    importScripts(blobUrl(ortJs, 'text/javascript'));
  } catch (err) {
    throw staged('init', new Error(`chargement du moteur impossible : ${err.message}`));
  }
  // Toujours mono-thread : ort-wasm-simd.wasm, sans mémoire partagée (compatible iPhone).
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = { 'ort-wasm-simd.wasm': blobUrl(ortWasm, 'application/wasm') };
});

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
    else if (type === 'ipa') result = await ipa(e.data.texts, e.data.espeak, id);
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

  // Content-Length peut être la taille *compressée* (Safari, réponse gzip/br) alors que le flux
  // est décompressé : on pré-alloue seulement sans compression, et on bascule sur des morceaux
  // si la taille réelle dépasse quand même l'annonce.
  const total = Number(res.headers.get('Content-Length')) || 0;
  const encoded = (res.headers.get('Content-Encoding') || 'identity') !== 'identity';
  const reader = res.body.getReader();
  let bytes = total && !encoded ? new Uint8Array(total) : null;
  let chunks = bytes ? null : [];
  let loaded = 0;
  let lastPost = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (bytes && loaded + value.length > bytes.length) {
        chunks = [bytes.subarray(0, loaded)];
        bytes = null;
      }
      if (bytes) bytes.set(value, loaded);
      else chunks.push(value);
      loaded += value.length;
      const now = Date.now();
      if (id != null && total && now - lastPost > 150) {
        lastPost = now;
        const fraction = Math.min(1, loaded / total);
        self.postMessage({ id, progress: { loaded: offset + fraction * weight, total: totalWeight, label } });
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
  await ensurePhonemizerScript(id);
  if (phonemizeUrls) return;
  const [wasm, data] = await Promise.all([
    cachedFetch(PHONEMIZE_BASE + 'piper_phonemize.wasm', { id, label: 'phonemizer', weight: 0.02, offset: 0.12, totalWeight: 1 }),
    cachedFetch(PHONEMIZE_BASE + 'piper_phonemize.data', { id, label: 'phonemizer', weight: 0.18, offset: 0.14, totalWeight: 1 }),
  ]);
  phonemizeUrls = {
    wasm: URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' })),
    data: URL.createObjectURL(new Blob([data])),
  };
}

async function loadVoice(voice, id) {
  if (current && current.key === voice.key) return { key: voice.key, sampleRate: current.config.audio.sample_rate };

  await ensureOrt(id);
  await ensurePhonemizer(id);
  const { model, config } = voiceUrls(voice);
  const configBytes = await cachedFetch(config, { id, label: 'config', weight: 0.01, offset: 0.32, totalWeight: 1 });
  let modelBytes = await cachedFetch(model, { id, label: 'voice', weight: 0.67, offset: 0.33, totalWeight: 1 });

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

// Le module espeak-ng est instancié une seule fois puis réutilisé (callMain est ré-appelable) :
// le recréer à chaque séance rechargerait ~18 Mo en mémoire, ce que l'iPhone supporte mal.
let phonemizer = null;
let phonemizeOutput = null;

async function getPhonemizer() {
  if (!phonemizer) {
    phonemizer = createPiperPhonemize({
      print: (line) => phonemizeOutput?.push(line),
      printErr: (msg) => console.warn('[phonemize]', msg),
      locateFile: (file) => (file.endsWith('.wasm') ? phonemizeUrls.wasm : file.endsWith('.data') ? phonemizeUrls.data : file),
    }).catch((err) => {
      phonemizer = null;
      throw err;
    });
  }
  return phonemizer;
}

// Phonémise plusieurs textes en un seul passage (une ligne de sortie JSON par texte).
async function phonemize(texts, espeakVoice) {
  const module = await getPhonemizer();
  phonemizeOutput = [];
  try {
    module.callMain(['-l', espeakVoice, '--input', JSON.stringify(texts.map((text) => ({ text }))), '--espeak_data', '/espeak-ng-data']);
    const results = [];
    for (const line of phonemizeOutput) {
      try {
        const parsed = JSON.parse(line);
        results.push({ ids: parsed.phoneme_ids, ipa: parsed.phonemes.join('') });
      } catch {
        /* ligne non JSON : ignorée */
      }
    }
    if (results.length !== texts.length) throw new Error(`phonémisation incomplète (${results.length}/${texts.length})`);
    return results;
  } finally {
    phonemizeOutput = null;
  }
}

// Prononciation (API) de chaque texte, pour la transcription phonétique. N'utilise pas de voix.
async function ipa(texts, espeakVoice, id) {
  await ensurePhonemizer(id);
  let res;
  try {
    res = await phonemize(texts, espeakVoice);
  } catch (err) {
    throw staged('phonemize', err);
  }
  return res.map((r) => r.ipa);
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
  for (const { ids: phonemeIds } of ids) {
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
