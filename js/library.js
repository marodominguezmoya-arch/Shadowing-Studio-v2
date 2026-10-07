// Bibliothèque de listes de phrases, stockée sur l'appareil (localStorage).
// Chaque liste garde sa langue et ses réglages. Les listes sont du texte : quelques Ko chacune.

import { load, save } from './storage.js';

const KEY = 'library';
const FORMAT = 'shadowing-studio-lists';
const DEFAULTS = { reps: 3, pause: 'auto', speed: 100 };
const MAX_IMPORT = 200;

let lib = null;

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function now() {
  return new Date().toISOString();
}

function persist() {
  save(KEY, lib);
}

// Charge la bibliothèque ; à la première ouverture, reprend le brouillon de la v2.0 (clé « studio »).
export function initLibrary({ defaultTag, defaultName }) {
  lib = load(KEY, null);
  if (lib && Array.isArray(lib.lists) && lib.lists.length) return;

  const old = load('studio', null);
  const list = newList({
    name: defaultName,
    tag: old?.tag || defaultTag,
    text: old?.text || '',
    reps: old?.reps ?? DEFAULTS.reps,
    pause: old?.pause ?? DEFAULTS.pause,
    speed: old?.speed ?? DEFAULTS.speed,
  });
  lib = { version: 1, currentId: list.id, lists: [list] };
  persist();
}

function newList(fields) {
  const at = now();
  return { id: uid(), name: '', tag: 'en-US', text: '', ...DEFAULTS, ...fields, createdAt: at, updatedAt: at };
}

export function allLists() {
  return [...lib.lists].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getList(id) {
  return lib.lists.find((l) => l.id === id) || null;
}

export function currentList() {
  return getList(lib.currentId) || lib.lists[0];
}

export function setCurrent(id) {
  if (!getList(id)) return;
  lib.currentId = id;
  persist();
}

// Met à jour la liste (champs partiels) et la date de modification.
export function updateList(id, fields) {
  const list = getList(id);
  if (!list) return;
  Object.assign(list, fields, { updatedAt: now() });
  persist();
}

export function createList({ name, tag, text = '' }) {
  const base = currentList();
  const list = newList({ name, tag: tag || base?.tag, text, reps: base?.reps, pause: base?.pause, speed: base?.speed });
  lib.lists.push(list);
  lib.currentId = list.id;
  persist();
  return list;
}

export function duplicateList(id, suffix) {
  const src = getList(id);
  if (!src) return null;
  const copy = newList({ ...src, id: undefined, name: `${src.name} ${suffix}`.trim() });
  copy.id = uid();
  lib.lists.push(copy);
  persist();
  return copy;
}

// Supprime ; s'il ne reste rien, recrée une liste vide (le studio a toujours une liste courante).
export function deleteList(id, fallbackName) {
  const removed = getList(id);
  lib.lists = lib.lists.filter((l) => l.id !== id);
  if (!lib.lists.length) lib.lists.push(newList({ name: fallbackName, tag: removed?.tag }));
  if (lib.currentId === id) lib.currentId = allLists()[0].id;
  persist();
}

// ---------------------------------------------------------------------------
// Export / import (fichier JSON)
// ---------------------------------------------------------------------------

export function exportBlob() {
  const data = {
    format: FORMAT,
    version: 1,
    exportedAt: now(),
    lists: lib.lists.map(({ id, name, tag, text, reps, pause, speed, translations, createdAt, updatedAt }) => ({
      id, name, tag, text, reps, pause, speed, translations: translations || {}, createdAt, updatedAt,
    })),
  };
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

// { fr: { "phrase": "traduction" }, … } — on ne garde que des chaînes, en quantité raisonnable.
function cleanTranslations(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [lang, map] of Object.entries(raw).slice(0, 20)) {
    if (!/^[a-z]{2,3}$/.test(lang) || !map || typeof map !== 'object') continue;
    out[lang] = {};
    for (const [k, v] of Object.entries(map).slice(0, 200)) {
      if (typeof v === 'string' && k.length <= 400) out[lang][k] = v.slice(0, 800);
    }
  }
  return out;
}

// Importe les listes d'un fichier exporté. Une liste déjà présente (même id) n'est remplacée
// que si la version importée est plus récente. Renvoie { added, updated, skipped }.
export function importData(json) {
  let data;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('invalid');
  }
  if (!data || data.format !== FORMAT || !Array.isArray(data.lists)) throw new Error('invalid');

  const result = { added: 0, updated: 0, skipped: 0 };
  for (const raw of data.lists.slice(0, MAX_IMPORT)) {
    const item = {
      id: str(raw.id, 40) || uid(),
      name: str(raw.name, 80) || '—',
      tag: str(raw.tag, 20) || 'en-US',
      text: str(raw.text, 40000),
      reps: Math.min(10, Math.max(1, Number(raw.reps) || DEFAULTS.reps)),
      pause: ['auto', '2', '3', '5', '8'].includes(String(raw.pause)) ? String(raw.pause) : DEFAULTS.pause,
      speed: Math.min(150, Math.max(50, Number(raw.speed) || DEFAULTS.speed)),
      translations: cleanTranslations(raw.translations),
      createdAt: str(raw.createdAt, 40) || now(),
      updatedAt: str(raw.updatedAt, 40) || now(),
    };
    const existing = getList(item.id);
    if (!existing) {
      lib.lists.push(item);
      result.added++;
    } else if (item.updatedAt > existing.updatedAt) {
      Object.assign(existing, item);
      result.updated++;
    } else result.skipped++;
  }
  persist();
  return result;
}
