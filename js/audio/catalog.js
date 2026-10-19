// Langues de pratique : libellés localisés et choix par défaut.

import { PRACTICE_LANGUAGES } from './voices-data.js';
import { NAME_OVERRIDES } from '../languages.js';

// Langues proposées (« hidden » : voix pas encore en ligne).
const VISIBLE = PRACTICE_LANGUAGES.filter((l) => !l.hidden);

export function practiceLanguages(locale) {
  const names = new Intl.DisplayNames([locale], { type: 'language' });
  const collator = new Intl.Collator(locale);
  return VISIBLE.map((l) => {
    let label = l.tag;
    try {
      const override = NAME_OVERRIDES[l.tag.split('-')[0]];
      label = override?.[locale] || override?.en || names.of(l.tag) || l.tag;
    } catch {
      /* garde le code */
    }
    return { ...l, label: label.charAt(0).toLocaleUpperCase(locale) + label.slice(1) };
  }).sort((a, b) => collator.compare(a.label, b.label));
}

export function findLanguage(tag) {
  return VISIBLE.find((l) => l.tag === tag) || null;
}

// Première langue visée du profil → variante avec voix locale en priorité.
export function defaultTag(profile) {
  const code = profile?.targets?.[0]?.lang;
  if (code) {
    const matches = VISIBLE.filter((l) => l.tag.split('-')[0] === code);
    const best = matches.find((l) => l.piper) || matches[0];
    if (best) return best.tag;
  }
  return 'en-US';
}
