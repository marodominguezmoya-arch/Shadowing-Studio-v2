// Traductions de l'interface. Ajouter une langue = créer locales/xx.js et l'ajouter à LOCALES.

import fr from '../locales/fr.js';
import en from '../locales/en.js';
import es from '../locales/es.js';
import pt from '../locales/pt.js';
import ru from '../locales/ru.js';
import ar from '../locales/ar.js';
import de from '../locales/de.js';
import zh from '../locales/zh.js';
import ja from '../locales/ja.js';
import { load, save } from './storage.js';

const LOCALES = { fr, en, es, pt, de, ru, ar, zh, ja };

// Nom de chaque langue dans sa propre langue (menu de choix).
export const LOCALE_NAMES = {
  fr: 'Français', en: 'English', es: 'Español', pt: 'Português', de: 'Deutsch',
  ru: 'Русский', ar: 'العربية', zh: '中文', ja: '日本語',
};
const RTL = new Set(['ar', 'he', 'fa', 'ur']);
const DEFAULT = 'fr';

let current = DEFAULT;
const listeners = new Set();

export const availableLocales = Object.keys(LOCALES);

// Valeur d'une clé dans toutes les langues (ex. reconnaître un nom par défaut enregistré autrefois).
export function allTranslations(key) {
  return Object.values(LOCALES).map((dict) => lookup(dict, key)).filter((v) => typeof v === 'string');
}

export function initLocale() {
  const saved = load('locale');
  const browser = (navigator.language || '').slice(0, 2).toLowerCase();
  setLocale(LOCALES[saved] ? saved : LOCALES[browser] ? browser : DEFAULT, { persist: false });
}

export function getLocale() {
  return current;
}

export function setLocale(locale, { persist = true } = {}) {
  if (!LOCALES[locale]) return;
  current = locale;
  document.documentElement.lang = locale;
  document.documentElement.dir = RTL.has(locale) ? 'rtl' : 'ltr';
  if (persist) save('locale', locale);
  listeners.forEach((fn) => fn(locale));
}

export function onLocaleChange(fn) {
  listeners.add(fn);
}

// t('onboarding.title') ; t('x', { name: 'Maro' }) remplace {name}.
export function t(key, vars = {}) {
  const value = lookup(LOCALES[current], key) ?? lookup(LOCALES[DEFAULT], key) ?? key;
  if (typeof value !== 'string') return value;
  return value.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
}

function lookup(dict, key) {
  return key.split('.').reduce((obj, part) => (obj == null ? undefined : obj[part]), dict);
}
