// Assemblage d'une séance de shadowing et encodage WAV.
//
// Pour chaque phrase, répétée N fois :  bip → court blanc → phrase → silence pour répéter.

const LEAD_IN = 0.6; // s de silence au tout début
const BEEP = { freq: 880, duration: 0.12, gain: 0.25 };
const AFTER_BEEP = 0.25; // s entre le bip et la phrase

// Durée du silence pour répéter : « auto » = durée de la phrase × 1,2 + 0,4 s (min 1 s).
export function pauseFor(pause, phraseSeconds) {
  if (pause === 'auto') return Math.max(1, phraseSeconds * 1.2 + 0.4);
  return Number(pause);
}

function beep(sampleRate) {
  const n = Math.round(BEEP.duration * sampleRate);
  const out = new Float32Array(n);
  const fade = Math.round(0.01 * sampleRate);
  for (let i = 0; i < n; i++) {
    const env = Math.min(1, i / fade, (n - i) / fade); // fondu pour éviter les clics
    out[i] = Math.sin((2 * Math.PI * BEEP.freq * i) / sampleRate) * BEEP.gain * env;
  }
  return out;
}

// pcms : Float32Array par phrase. Renvoie { samples, sampleRate, timeline, duration }.
// timeline : [{ phrase, rep, start, speechStart, end }] en secondes.
export function buildSession({ pcms, sampleRate, reps, pause }) {
  const tone = beep(sampleRate);
  const sec = (s) => Math.round(s * sampleRate);

  const parts = [];
  const timeline = [];
  let cursor = sec(LEAD_IN);
  parts.push({ at: 0, data: null, length: cursor });

  pcms.forEach((pcm, phrase) => {
    const speech = pcm.length / sampleRate;
    const silence = sec(pauseFor(pause, speech));
    for (let rep = 0; rep < reps; rep++) {
      const start = cursor;
      parts.push({ at: cursor, data: tone });
      cursor += tone.length + sec(AFTER_BEEP);
      const speechStart = cursor;
      parts.push({ at: cursor, data: pcm });
      cursor += pcm.length + silence;
      timeline.push({
        phrase,
        rep,
        start: start / sampleRate,
        speechStart: speechStart / sampleRate,
        end: cursor / sampleRate,
      });
    }
  });

  const samples = new Float32Array(cursor);
  for (const part of parts) if (part.data) samples.set(part.data, part.at);

  return { samples, sampleRate, timeline, duration: cursor / sampleRate };
}

// WAV PCM 16 bits mono.
export function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const str = (offset, s) => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));

  str(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

// Index de l'entrée de timeline active à l'instant t (ou -1).
export function timelineIndexAt(timeline, t) {
  for (let i = timeline.length - 1; i >= 0; i--) if (t >= timeline[i].start) return i;
  return -1;
}
