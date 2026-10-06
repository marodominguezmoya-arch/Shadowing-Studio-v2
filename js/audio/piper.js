// Client du worker Piper : API à base de promesses pour le thread principal.

import { PIPER_BASE } from './voices-data.js';

let worker = null;
let seq = 0;
const pending = new Map();

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./tts-worker.js', import.meta.url));
  worker.onmessage = (e) => {
    const { id, ok, result, error, stage, progress } = e.data;
    const p = pending.get(id);
    if (!p) return;
    if (progress) return p.onProgress?.(progress);
    pending.delete(id);
    ok ? p.resolve(result) : p.reject(Object.assign(new Error(error), { stage }));
  };
  worker.onerror = (e) => {
    // Arrêt brutal du worker : souvent un manque de mémoire sur téléphone.
    const err = Object.assign(new Error(e.message || 'arrêt inattendu du moteur vocal'), { stage: 'crash' });
    pending.forEach((p) => p.reject(err));
    pending.clear();
    worker = null;
  };
  call('init', { piperBase: PIPER_BASE });
  return worker;
}

function call(type, payload = {}, onProgress) {
  const w = getWorker();
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    w.postMessage({ id, type, ...payload });
  });
}

export function isVoiceCached(voice) {
  return call('has', { voice: { key: voice.key, path: voice.path } }).then((r) => r.cached);
}

// onProgress({ loaded, total }) : fraction globale (phonémiseur + voix).
export async function loadVoice(voice, onProgress) {
  // Demande au navigateur de ne pas effacer les voix en cas de manque d'espace.
  navigator.storage?.persist?.().catch(() => {});
  return call('load', { voice: { key: voice.key, path: voice.path } }, onProgress);
}

export function deleteVoice(voice) {
  return call('delete', { voice: { key: voice.key, path: voice.path } });
}

// Renvoie { pcms: Float32Array[], sampleRate }.
export function synthesize(texts, speed = 1) {
  return call('synth', { texts, speed });
}
