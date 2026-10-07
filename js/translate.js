// Traduction des phrases (relais Cloudflare → Workers AI : Llama 4 Scout, secours m2m100).
// source = étiquette complète de la liste (« ar-JO ») : le relais en déduit le dialecte.

import { CONFIG, IS_LOCAL } from './config.js';

// Toutes les langues de l'app sont traduisibles (grand modèle de langue côté relais).
// Renvoie le code de langue de base (« ar » pour « ar-JO ») ou null si l'étiquette est invalide.
export function translationCode(tagOrCode) {
  const base = String(tagOrCode || '').split('-')[0];
  return /^[a-z]{2,3}$/.test(base) ? base : null;
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
