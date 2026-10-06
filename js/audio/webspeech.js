// Repli : lecture en direct avec les voix du navigateur (Web Speech API).
// Pas d'export possible, et la lecture s'arrête si l'écran se verrouille.

import { pauseFor } from './session.js';

export function webSpeechSupported() {
  return 'speechSynthesis' in window;
}

function voices() {
  return new Promise((resolve) => {
    const list = speechSynthesis.getVoices();
    if (list.length) return resolve(list);
    const done = () => resolve(speechSynthesis.getVoices());
    speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
}

// Meilleure voix pour une langue : correspondance exacte, puis même langue.
export async function findVoice(tag) {
  const list = await voices();
  const norm = (s) => s.toLowerCase().replace('_', '-');
  const t = norm(tag);
  return (
    list.find((v) => norm(v.lang) === t && v.localService) ||
    list.find((v) => norm(v.lang) === t) ||
    list.find((v) => norm(v.lang).split('-')[0] === t.split('-')[0]) ||
    null
  );
}

const wait = (ms, signal) =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });

function speak(text, { tag, voice, speed }, signal) {
  return new Promise((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = tag;
    if (voice) u.voice = voice;
    u.rate = speed;
    const started = performance.now();
    u.onend = () => resolve((performance.now() - started) / 1000);
    u.onerror = (e) => (e.error === 'interrupted' || e.error === 'canceled' ? resolve(0) : reject(new Error(e.error)));
    signal.addEventListener('abort', () => speechSynthesis.cancel());
    speechSynthesis.speak(u);
  });
}

// Lance la séance ; renvoie { stop, done }. onStep({ phrase, rep }) à chaque répétition.
export function playLive({ phrases, tag, reps, pause, speed, onStep }) {
  const controller = new AbortController();
  const { signal } = controller;

  const done = (async () => {
    const voice = await findVoice(tag);
    speechSynthesis.cancel();
    for (let phrase = 0; phrase < phrases.length && !signal.aborted; phrase++) {
      for (let rep = 0; rep < reps && !signal.aborted; rep++) {
        onStep?.({ phrase, rep });
        const spoken = await speak(phrases[phrase], { tag, voice, speed }, signal);
        await wait(pauseFor(pause, spoken) * 1000, signal);
      }
    }
  })();

  return {
    done,
    stop() {
      controller.abort();
      speechSynthesis.cancel();
    },
  };
}
