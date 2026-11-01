// Plan de 4 semaines : listes de phrases prêtes à répéter, choisies selon l'usage de la langue
// (onboarding) ou écrites d'après la description de l'élève (plan sur mesure, Premium), puis
// traduites par l'IA (Worker, mode « content ») dans la langue pratiquée.

import { CONFIG, IS_LOCAL } from './config.js';
import { t } from './i18n.js';
import { CORE, SITUATIONS } from './plan-content.js';
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

// Phrases anglaises → langue pratiquée, registre oral. gender : 'female' | 'male' | null.
export async function adapt(texts, target, gender = null) {
  if (target.split('-')[0] === 'en') return texts; // contenu écrit en anglais
  if (IS_LOCAL) {
    await new Promise((r) => setTimeout(r, 200)); // pas de Worker en local
    return texts.map((x) => `[${target}] ${x}`);
  }
  const res = await fetch(CONFIG.translateEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'content', source: 'en', target, texts, ...(gender ? { gender } : {}) }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { phrases } = await res.json();
  if (!Array.isArray(phrases) || phrases.length !== texts.length) throw new Error('réponse incomplète');
  return phrases;
}

// Une semaine : noyau d'autonomie + phrases de situation, traduits (darija du noyau écrit à la main).
async function buildWeek(w, situationPhrases, tag, gender, handwritten = null) {
  const source = [...CORE[w], ...situationPhrases];
  if (tag === 'ary-MA') {
    return { source, phrases: [...ARY_CORE[w], ...(handwritten || await adapt(situationPhrases, tag, gender))] };
  }
  return { source, phrases: await adapt(source, tag, gender) };
}

// Enregistre 4 semaines en listes « {label} · Semaine n : thème » ; la semaine 1 devient la liste en cours.
export function savePlan({ weeks, tag, label, plan }) {
  initLibrary({ defaultTag: tag });
  const empty = allLists().find((l) => !l.name && !l.text.trim()); // liste par défaut vide : remplacée

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
      plan: { ...plan, week: w + 1 },
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

// Plan d'une situation de l'onboarding. tag : langue pratiquée (ex. « tr-TR »). Renvoie les listes.
export async function generatePlan({ situation, tag, onProgress }) {
  let ready = 0;
  const weeks = await Promise.all([0, 1, 2, 3].map(async (w) => {
    const week = await buildWeek(w, SITUATIONS[situation][w], tag, null, ARY_SITUATIONS[situation]?.[w]);
    onProgress?.(++ready);
    return week;
  }));
  return savePlan({ weeks, tag, label: shortLabel(situationLabel(situation)), plan: { situation } });
}

// Plan sur mesure : la description de l'élève → 4 × 10 phrases (Worker), puis traduction.
// Renvoie { gender, weeks: [{ source, phrases }] } pour l'aperçu (rien n'est enregistré).
export async function draftCustomPlan({ description, tag }) {
  let plan;
  if (IS_LOCAL) {
    await new Promise((r) => setTimeout(r, 400)); // pas de Worker en local : plan d'exemple
    plan = { gender: 'unknown', weeks: SITUATIONS['general.daily'] };
  } else {
    const res = await fetch('api/custom-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, target: tag }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    plan = await res.json();
  }
  const gender = ['female', 'male'].includes(plan.gender) ? plan.gender : null;
  const weeks = await Promise.all(plan.weeks.map((phrases, w) => buildWeek(w, phrases, tag, gender)));
  return { gender, weeks };
}

