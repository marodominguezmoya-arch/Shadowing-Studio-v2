// Langues proposées dans l'onboarding (langue maternelle et langues visées).
// Les noms sont générés dans la langue de l'interface via Intl.DisplayNames :
// aucune table de traduction à maintenir.

export const LANGUAGE_CODES = [
  'af', 'ar', 'ary', 'bn', 'ca', 'cs', 'da', 'de', 'el', 'en', 'es', 'eu', 'fa', 'fi', 'fr',
  'gl', 'he', 'hi', 'hr', 'hu', 'id', 'it', 'ja', 'ko', 'lv', 'ms', 'nb', 'nl', 'pl', 'pt',
  'ro', 'ru', 'sk', 'sv', 'sw', 'th', 'tr', 'uk', 'ur', 'vi', 'yo', 'zh',
];

// Noms que les navigateurs ne connaissent pas tous (Safari affiche « Ary » pour le darija).
export const NAME_OVERRIDES = {
  ary: {
    fr: 'darija (arabe marocain)', en: 'Darija (Moroccan Arabic)', es: 'darija (árabe marroquí)',
    pt: 'darija (árabe marroquino)', de: 'Darija (marokkanisches Arabisch)', ru: 'дарижа (марокканский арабский)',
    ar: 'الدارجة المغربية', zh: '达里贾语（摩洛哥阿拉伯语）', ja: 'ダリジャ（モロッコ・アラビア語）',
  },
};

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// capitalize: false pour l'insérer en milieu de phrase (« votre niveau en anglais »).
export function languageName(code, locale, { capitalize = true } = {}) {
  try {
    const base = String(code).split('-')[0];
    const name = NAME_OVERRIDES[base]?.[locale] || NAME_OVERRIDES[base]?.en || new Intl.DisplayNames([locale], { type: 'language' }).of(code);
    if (!name) return code;
    return capitalize ? name.charAt(0).toLocaleUpperCase(locale) + name.slice(1) : name;
  } catch {
    return code;
  }
}

// Liste triée alphabétiquement dans la langue de l'interface.
export function sortedLanguages(locale) {
  const collator = new Intl.Collator(locale);
  return LANGUAGE_CODES
    .map((code) => ({ code, name: languageName(code, locale) }))
    .sort((a, b) => collator.compare(a.name, b.name));
}
