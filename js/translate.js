// Traduction des phrases (relais Cloudflare → Workers AI, modèle m2m100).

import { CONFIG, IS_LOCAL } from './config.js';

// Langues prises en charge par m2m100 (codes ISO 639-1) parmi celles de l'app.
const SUPPORTED = new Set([
  'af', 'ar', 'bn', 'ca', 'cs', 'da', 'de', 'el', 'en', 'es', 'fa', 'fi', 'fr', 'gl', 'he', 'hi', 'hr',
  'hu', 'id', 'it', 'ja', 'ko', 'ms', 'nl', 'no', 'pl', 'pt', 'ro', 'ru', 'sk', 'sv', 'sw', 'th', 'tr',
  'uk', 'ur', 'vi', 'yo', 'zh',
]);
const ALIASES = { nb: 'no' }; // norvégien bokmål → « no » pour le modèle

export function translationCode(tagOrCode) {
  const base = tagOrCode.split('-')[0];
  const code = ALIASES[base] || base;
  return SUPPORTED.has(code) ? code : null;
}

// Renvoie un tableau de traductions, dans l'ordre des textes.
export async function translateTexts(texts, source, target) {
  if (IS_LOCAL) {
    // Pas de relais en local : traduction simulée.
    await new Promise((r) => setTimeout(r, 300));
    return texts.map((t) => `[${target}] ${t}`);
  }
  const res = await fetch(CONFIG.translateEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, source, target }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.translations;
}
