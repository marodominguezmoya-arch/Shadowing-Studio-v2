// Plan de 4 semaines : listes de phrases prêtes à répéter, choisies selon l'usage de la langue
// (onboarding) et traduites par l'IA (Worker, mode « content ») dans la langue pratiquée.

import { CONFIG, IS_LOCAL } from './config.js';
import { t } from './i18n.js';
import { CORE, SITUATIONS, weekPhrases } from './plan-content.js';
import { ARY_CORE, ARY_SITUATIONS } from './plan-content-ary.js';
import { initLibrary, createList, updateList, allLists, setCurrent, deleteList, saveLibrary } from './library.js';
import { TRANSLATION_VERSION } from './translate.js';

export const USE_GROUPS = {
  work: ['office', 'sales', 'health', 'hospitality', 'tech', 'education'],
  study: ['university', 'exam', 'school', 'vocational'],
  general: ['travel', 'daily', 'family', 'fun'],
};
export const PLAN_SITUATIONS = Object.keys(SITUATIONS); // « work.office », …

// « work.health » → « Santé » (libellé de l'onboarding, dans la langue de l'interface).
export function situationLabel(situation) {
  const [group, detail] = situation.split('.');
  return t(`onboarding.c.${group}.${detail}`);
}

// Version courte pour les noms de listes : « Le quotidien (vivre là-bas) » → « Le quotidien ».
const shortLabel = (label) => label.split(/[(（,，、]/)[0].trim();

async function adapt(texts, target) {
  if (target.split('-')[0] === 'en') return texts; // contenu écrit en anglais
  if (IS_LOCAL) {
    await new Promise((r) => setTimeout(r, 200)); // pas de Worker en local
    return texts.map((x) => `[${target}] ${x}`);
  }
  const res = await fetch(CONFIG.translateEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'content', source: 'en', target, texts }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { phrases } = await res.json();
  if (!Array.isArray(phrases) || phrases.length !== texts.length) throw new Error('réponse incomplète');
  return phrases;
}

// Crée les 4 listes (semaine 1 devient la liste en cours). tag : langue pratiquée (ex. « tr-TR »).
// onProgress(n) : semaines prêtes. Renvoie les listes créées.
export async function generatePlan({ situation, tag, onProgress }) {
  const label = shortLabel(situationLabel(situation));
  let ready = 0;
  const weeks = await Promise.all([0, 1, 2, 3].map(async (w) => {
    const source = weekPhrases(situation, w);
    const phrases = tag === 'ary-MA'
      // Darija écrit à la main quand il existe (l'IA le fait mal), sinon IA pour la partie situation.
      ? [...ARY_CORE[w], ...(ARY_SITUATIONS[situation]?.[w] || await adapt(SITUATIONS[situation][w], tag))]
      : await adapt(source, tag);
    onProgress?.(++ready);
    return { source, phrases };
  }));
  initLibrary({ defaultTag: tag });

  // Liste par défaut encore vide (nouvel utilisateur) : remplacée par le plan.
  const empty = allLists().find((l) => !l.name && !l.text.trim());

  // La bibliothèque montre les listes les plus récentes d'abord : dates échelonnées pour que
  // la semaine 1 soit en haut (créées dans la même milliseconde, l'ordre serait aléatoire).
  const base = Date.now();
  const created = [];
  for (let w = 3; w >= 0; w--) {
    const { source, phrases } = weeks[w];
    const list = createList({
      name: t('plan.weekName', { situation: label, n: w + 1, theme: t(`plan.theme${w + 1}`) }),
      tag,
      text: phrases.join('\n'),
    });
    // L'anglais d'origine sert de traduction toute prête pour une interface en anglais.
    updateList(list.id, {
      plan: { situation, week: w + 1 },
      translations: { en: Object.fromEntries(phrases.map((p, i) => [p, source[i]])) },
      translationsVersion: TRANSLATION_VERSION,
    });
    list.updatedAt = new Date(base - w * 1000).toISOString();
    created.unshift(list);
  }

  if (empty) deleteList(empty.id);
  saveLibrary();
  setCurrent(created[0].id);
  return created;
}
