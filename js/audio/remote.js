// Voix en ligne (darija, serveur HADRA via le Worker) : même interface que piper.js.
// Chaque phrase générée est gardée sur l'appareil (Cache API) : la relire est immédiat, même hors connexion.

import { CONFIG } from '../config.js';

const CACHE = 'ss2-remote-v1';
const TIMEOUT = 240000; // le serveur gratuit peut mettre plusieurs minutes à se réveiller

const cacheKey = (voice, speed, text) =>
  new URL(`remote-voice/${voice}/${speed}/${encodeURIComponent(text)}`, location.href).href;

// Réveille le serveur dès que la langue est choisie, pour gagner du temps.
export function wakeRemote() {
  fetch(CONFIG.ttsEndpoint, { cache: 'no-store' }).catch(() => {});
}

// WAV PCM 16 bits mono → Float32Array.
function decodeWav(buf) {
  const view = new DataView(buf);
  let pos = 12;
  let sampleRate = 24000;
  while (pos + 8 <= view.byteLength) {
    const id = String.fromCharCode(...new Uint8Array(buf, pos, 4));
    const size = view.getUint32(pos + 4, true);
    if (id === 'fmt ') sampleRate = view.getUint32(pos + 12, true);
    if (id === 'data') {
      const n = Math.floor(Math.min(size, view.byteLength - pos - 8) / 2);
      const pcm = new Float32Array(n);
      for (let i = 0; i < n; i++) pcm[i] = view.getInt16(pos + 8 + i * 2, true) / 32768;
      return { pcm, sampleRate };
    }
    pos += 8 + size + (size % 2);
  }
  throw new Error('WAV invalide');
}

async function fetchPhrase(voice, speed, text) {
  const key = cacheKey(voice, speed, text);
  const cache = await caches.open(CACHE).catch(() => null);
  const hit = await cache?.match(key);
  if (hit) return hit.arrayBuffer();

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  let res;
  try {
    res = await fetch(CONFIG.ttsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, speed }),
      signal: ctrl.signal,
    });
  } catch (err) {
    throw Object.assign(new Error(err.name === 'AbortError' ? 'délai dépassé' : err.message), { stage: 'remote' });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw Object.assign(new Error(error || `HTTP ${res.status}`), { stage: 'remote', code: error });
  }
  const buf = await res.arrayBuffer();
  cache?.put(key, new Response(buf.slice(0), { headers: { 'Content-Type': 'audio/wav' } })).catch(() => {});
  return buf;
}

// Même forme que piper.synthesize : { pcms: Float32Array[], sampleRate }.
// onPhrase(i) : appelé avant chaque phrase (progression).
export async function synthesizeRemote(texts, speed, voice, onPhrase) {
  const pcms = [];
  let sampleRate = 24000;
  for (let i = 0; i < texts.length; i++) {
    onPhrase?.(i);
    const decoded = decodeWav(await fetchPhrase(voice, Math.round(speed * 20) / 20, texts[i]));
    pcms.push(decoded.pcm);
    sampleRate = decoded.sampleRate;
  }
  return { pcms, sampleRate };
}

// Phrases déjà gardées sur l'appareil (pour annoncer le temps d'attente).
export async function countCached(texts, speed, voice) {
  const cache = await caches.open(CACHE).catch(() => null);
  if (!cache) return 0;
  const hits = await Promise.all(texts.map((t) => cache.match(cacheKey(voice, Math.round(speed * 20) / 20, t))));
  return hits.filter(Boolean).length;
}
