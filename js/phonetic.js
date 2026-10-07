// Transcription phonétique : prononciation réelle (API, produite par espeak-ng via le phonémiseur
// de Piper) réécrite avec l'orthographe d'une langue « lectrice » (fr, en, es, pt, ru, ar).
//
// Exemple : anglais « Thank you » → API « θˈæŋk juː » → pour un lecteur français : « s<è>nk you ».
// La voyelle accentuée est marquée (rendue en gras), les tons (chinois, vietnamien, thaï) en exposant.

export const TRANSCRIPTION_TARGETS = ['fr', 'en', 'es', 'pt', 'ru', 'ar'];

// Langue de pratique (BCP 47) → voix espeak-ng. null = transcription indisponible.
const ESPEAK = {
  af: 'af', ar: 'ar', bn: 'bn', ca: 'ca', cs: 'cs', da: 'da', de: 'de', el: 'el', eu: 'eu',
  fa: 'fa', fi: 'fi', fr: 'fr', he: 'he', hi: 'hi', hr: 'hr', hu: 'hu', id: 'id', it: 'it',
  ko: 'ko', ms: 'ms', nb: 'nb', nl: 'nl', pl: 'pl', ro: 'ro', ru: 'ru', sk: 'sk', sv: 'sv',
  sw: 'sw', th: 'th', tr: 'tr', uk: 'uk', ur: 'ur', vi: 'vi', zh: 'cmn',
  en: 'en', es: 'es', pt: 'pt',
  ja: null, yo: null,
};
const ESPEAK_REGIONAL = {
  'en-US': 'en-us', 'es-MX': 'es-419', 'es-AR': 'es-419', 'es-CO': 'es-419', 'pt-BR': 'pt-br',
};

export function espeakVoiceFor(tag) {
  if (tag in ESPEAK_REGIONAL) return ESPEAK_REGIONAL[tag];
  return ESPEAK[tag.split('-')[0]] ?? null;
}

// ---------------------------------------------------------------------------
// Découpage de l'API en unités
// ---------------------------------------------------------------------------

const VOWELS = new Set([...'iyɨʉɯuɪʏʊeøɘɵɤoəɛœɜɞʌɔæɐaɶɑɒɚɝ']);
const FRONT = new Set([...'iyɪʏeøɛœæ']); // pour « gu » devant e / i
const MULTI = ['tʃ', 'dʒ', 'ts', 'dz', 'tɕ', 'dʑ', 'aɪ', 'aʊ', 'eɪ', 'oʊ', 'əʊ', 'ɔɪ', 'eə', 'ɪə', 'ʊə'];
const TONES = { 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶' };
const PUNCT = new Set([...',.?!;:¿¡']);

function tokenize(ipa) {
  const units = [];
  let stress = false;
  for (let i = 0; i < ipa.length; ) {
    const ch = ipa[i];
    const two = ipa.slice(i, i + 2);
    if (ch === 'ˈ') { stress = true; i++; continue; }
    if (ch === 'ˌ' || ch === 'ː' || ch === 'ˑ' || ch === 'ʰ' || ch === 'ʷ' || ch === '-') { i++; continue; }
    if (ch === ' ') { units.push({ t: 'space' }); i++; continue; }
    if (PUNCT.has(ch)) { units.push({ t: 'punct', v: ch }); i++; continue; }
    if (TONES[ch]) { units.push({ t: 'tone', v: TONES[ch] }); i++; continue; }
    if (ch === 'ʲ') { units.push({ t: 'pal' }); i++; continue; }
    if (/[̀-ͯ]/.test(ch)) {
      const prev = units[units.length - 1];
      if (prev && ch === '̃') prev.nasal = true;            // voyelle nasale (ɑ̃)
      else if (prev && ch === '̧' && prev.v === 'c') prev.v = 'ç'; // ç allemand (ich)
      i++;
      continue;
    }
    const v = MULTI.includes(two) ? two : ch;
    const isVowel = VOWELS.has(v[0]) && !['tʃ', 'dʒ', 'ts', 'dz', 'tɕ', 'dʑ'].includes(v);
    units.push({ t: isVowel ? 'vowel' : 'cons', v, stress: isVowel && stress });
    if (isVowel) stress = false;
    i += v.length;
  }
  return units;
}

// ---------------------------------------------------------------------------
// Tables par langue lectrice
// ---------------------------------------------------------------------------

const BASE_CONS = { p: 'p', b: 'b', t: 't', d: 'd', k: 'k', ɡ: 'g', g: 'g', f: 'f', v: 'v', s: 's', z: 'z', m: 'm', n: 'n', l: 'l' };

const TABLES = {
  fr: {
    vowels: {
      i: 'i', ɪ: 'i', y: 'u', ʏ: 'u', ɨ: 'i', ʉ: 'u', e: 'é', ɛ: 'è', æ: 'è', a: 'a', ɐ: 'a', ɑ: 'a', ɒ: 'o', ɔ: 'o', o: 'o',
      ʊ: 'ou', u: 'ou', ɯ: 'eu', ʌ: 'a', ə: 'e', ɜ: 'eu', ɚ: 'eur', ɝ: 'eur', ø: 'eu', œ: 'eu', ɤ: 'eu', ɘ: 'e', ɵ: 'eu',
      aɪ: 'aï', aʊ: 'aou', eɪ: 'éï', oʊ: 'o', əʊ: 'o', ɔɪ: 'oï', eə: 'èe', ɪə: 'ia', ʊə: 'oua',
    },
    nasal: { ɑ: 'an', a: 'an', ɐ: 'an', ɛ: 'in', e: 'in', i: 'in', ɔ: 'on', o: 'on', œ: 'un', u: 'oun', ʊ: 'oun' },
    cons: {
      ...BASE_CONS, ʃ: 'ch', ʒ: 'j', tʃ: 'tch', dʒ: 'dj', ts: 'ts', dz: 'dz', tɕ: 'tch', dʑ: 'dj', ɕ: 'ch', ʑ: 'j',
      θ: 's', ð: 'z', ŋ: 'ng', ɲ: 'gn', ʎ: 'ly', j: 'y', w: 'ou', ɥ: 'u', h: 'h', ɦ: 'h', ħ: 'h', x: 'kh', χ: 'kh',
      ɣ: 'gh', ʁ: 'r', r: 'r', ɾ: 'r', ɹ: 'r', ɻ: 'r', ɽ: 'r', ɭ: 'l', ɫ: 'l', ʋ: 'v', β: 'b', ɸ: 'f', ç: 'ch', c: 'ky',
      ɟ: 'dy', q: 'k', ʔ: "'", ʕ: "'", ɡ: 'g',
    },
    pal: 'i',
    gu: true,
    doubleS: true,
  },
  en: {
    vowels: {
      i: 'ee', ɪ: 'i', y: 'ew', ʏ: 'ew', ɨ: 'i', ʉ: 'oo', e: 'eh', ɛ: 'eh', æ: 'a', a: 'ah', ɐ: 'uh', ɑ: 'ah', ɒ: 'o', ɔ: 'aw',
      o: 'oh', ʊ: 'oo', u: 'oo', ɯ: 'uu', ʌ: 'uh', ə: 'uh', ɜ: 'ur', ɚ: 'er', ɝ: 'er', ø: 'ur', œ: 'ur', ɤ: 'uh', ɘ: 'uh', ɵ: 'ur',
      aɪ: 'ai', aʊ: 'ow', eɪ: 'ay', oʊ: 'oh', əʊ: 'oh', ɔɪ: 'oy', eə: 'air', ɪə: 'eer', ʊə: 'oor',
    },
    nasal: { ɑ: 'ahn', a: 'ahn', ɐ: 'uhn', ɛ: 'an', e: 'en', i: 'een', ɔ: 'ohn', o: 'ohn', œ: 'un', u: 'oon', ʊ: 'oon' },
    cons: {
      ...BASE_CONS, ʃ: 'sh', ʒ: 'zh', tʃ: 'ch', dʒ: 'j', ts: 'ts', dz: 'dz', tɕ: 'ch', dʑ: 'j', ɕ: 'sh', ʑ: 'zh',
      θ: 'th', ð: 'th', ŋ: 'ng', ɲ: 'ny', ʎ: 'ly', j: 'y', w: 'w', ɥ: 'w', h: 'h', ɦ: 'h', ħ: 'h', x: 'kh', χ: 'kh',
      ɣ: 'gh', ʁ: 'r', r: 'r', ɾ: 'r', ɹ: 'r', ɻ: 'r', ɽ: 'r', ɭ: 'l', ɫ: 'l', ʋ: 'v', β: 'b', ɸ: 'f', ç: 'h', c: 'ky',
      ɟ: 'gy', q: 'k', ʔ: "'", ʕ: "'", ɡ: 'g',
    },
    pal: 'y',
  },
  es: {
    vowels: {
      i: 'i', ɪ: 'i', y: 'iu', ʏ: 'iu', ɨ: 'i', ʉ: 'u', e: 'e', ɛ: 'e', æ: 'e', a: 'a', ɐ: 'a', ɑ: 'a', ɒ: 'o', ɔ: 'o', o: 'o',
      ʊ: 'u', u: 'u', ɯ: 'u', ʌ: 'a', ə: 'e', ɜ: 'e', ɚ: 'er', ɝ: 'er', ø: 'e', œ: 'e', ɤ: 'e', ɘ: 'e', ɵ: 'e',
      aɪ: 'ai', aʊ: 'au', eɪ: 'ei', oʊ: 'ou', əʊ: 'ou', ɔɪ: 'oi', eə: 'ea', ɪə: 'ia', ʊə: 'ua',
    },
    nasal: { ɑ: 'an', a: 'an', ɐ: 'an', ɛ: 'en', e: 'en', i: 'in', ɔ: 'on', o: 'on', œ: 'en', u: 'un', ʊ: 'un' },
    cons: {
      ...BASE_CONS, z: 's', ʃ: 'sh', ʒ: 'y', tʃ: 'ch', dʒ: 'y', ts: 'ts', dz: 'ds', tɕ: 'ch', dʑ: 'y', ɕ: 'sh', ʑ: 'y',
      θ: 'z', ð: 'd', ŋ: 'n', ɲ: 'ñ', ʎ: 'll', j: 'y', w: 'u', ɥ: 'u', h: 'j', ɦ: 'j', ħ: 'j', x: 'j', χ: 'j',
      ɣ: 'g', ʁ: 'r', r: 'r', ɾ: 'r', ɹ: 'r', ɻ: 'r', ɽ: 'r', ɭ: 'l', ɫ: 'l', ʋ: 'v', β: 'b', ɸ: 'f', ç: 'j', c: 'ky',
      ɟ: 'y', q: 'k', ʔ: "'", ʕ: "'", ɡ: 'g',
    },
    pal: 'i',
    gu: true,
  },
  pt: {
    vowels: {
      i: 'i', ɪ: 'i', y: 'iu', ʏ: 'iu', ɨ: 'i', ʉ: 'u', e: 'ê', ɛ: 'é', æ: 'é', a: 'a', ɐ: 'â', ɑ: 'a', ɒ: 'ó', ɔ: 'ó', o: 'ô',
      ʊ: 'u', u: 'u', ɯ: 'u', ʌ: 'â', ə: 'e', ɜ: 'ê', ɚ: 'er', ɝ: 'er', ø: 'ê', œ: 'é', ɤ: 'e', ɘ: 'e', ɵ: 'ô',
      aɪ: 'ai', aʊ: 'au', eɪ: 'ei', oʊ: 'ou', əʊ: 'ou', ɔɪ: 'ói', eə: 'éa', ɪə: 'ia', ʊə: 'ua',
    },
    nasal: { ɑ: 'ã', a: 'ã', ɐ: 'ã', ɛ: 'ẽ', e: 'ẽ', i: 'im', ɔ: 'õ', o: 'õ', œ: 'ã', u: 'um', ʊ: 'um' },
    cons: {
      ...BASE_CONS, ʃ: 'x', ʒ: 'j', tʃ: 'tch', dʒ: 'dj', ts: 'ts', dz: 'dz', tɕ: 'tch', dʑ: 'dj', ɕ: 'x', ʑ: 'j',
      θ: 's', ð: 'd', ŋ: 'ng', ɲ: 'nh', ʎ: 'lh', j: 'i', w: 'u', ɥ: 'u', h: 'rr', ɦ: 'rr', ħ: 'rr', x: 'rr', χ: 'rr',
      ɣ: 'g', ʁ: 'rr', r: 'r', ɾ: 'r', ɹ: 'r', ɻ: 'r', ɽ: 'r', ɭ: 'l', ɫ: 'l', ʋ: 'v', β: 'b', ɸ: 'f', ç: 'rr', c: 'ki',
      ɟ: 'di', q: 'k', ʔ: "'", ʕ: "'", ɡ: 'g',
    },
    pal: 'i',
    gu: true,
    doubleS: true,
  },
  ru: {
    vowels: {
      i: 'и', ɪ: 'и', y: 'ю', ʏ: 'ю', ɨ: 'ы', ʉ: 'ю', e: 'э', ɛ: 'э', æ: 'э', a: 'а', ɐ: 'а', ɑ: 'а', ɒ: 'о', ɔ: 'о', o: 'о',
      ʊ: 'у', u: 'у', ɯ: 'ы', ʌ: 'а', ə: 'э', ɜ: 'ё', ɚ: 'эр', ɝ: 'эр', ø: 'ё', œ: 'ё', ɤ: 'ы', ɘ: 'э', ɵ: 'ё',
      aɪ: 'ай', aʊ: 'ау', eɪ: 'эй', oʊ: 'оу', əʊ: 'оу', ɔɪ: 'ой', eə: 'эа', ɪə: 'иа', ʊə: 'уа',
    },
    nasal: { ɑ: 'ан', a: 'ан', ɐ: 'ан', ɛ: 'эн', e: 'эн', i: 'ин', ɔ: 'он', o: 'он', œ: 'ён', u: 'ун', ʊ: 'ун' },
    cons: {
      p: 'п', b: 'б', t: 'т', d: 'д', k: 'к', ɡ: 'г', g: 'г', f: 'ф', v: 'в', s: 'с', z: 'з', m: 'м', n: 'н', l: 'л',
      ʃ: 'ш', ʒ: 'ж', tʃ: 'ч', dʒ: 'дж', ts: 'ц', dz: 'дз', tɕ: 'ч', dʑ: 'дж', ɕ: 'щ', ʑ: 'ж',
      θ: 'с', ð: 'з', ŋ: 'нг', ɲ: 'нь', ʎ: 'ль', j: 'й', w: 'у', ɥ: 'ю', h: 'х', ɦ: 'х', ħ: 'х', x: 'х', χ: 'х',
      ɣ: 'г', ʁ: 'р', r: 'р', ɾ: 'р', ɹ: 'р', ɻ: 'р', ɽ: 'р', ɭ: 'л', ɫ: 'л', ʋ: 'в', β: 'б', ɸ: 'ф', ç: 'х', c: 'кь',
      ɟ: 'дь', q: 'к', ʔ: '', ʕ: '',
    },
    pal: 'ь',
    // Après й / ь, les voyelles deviennent « molles » : йа → я, ьу → ю, etc.
    softVowels: { а: 'я', у: 'ю', э: 'е', о: 'ё' },
  },
  ar: {
    vowels: {
      i: 'ي', ɪ: 'ي', y: 'يو', ʏ: 'يو', ɨ: 'ي', ʉ: 'و', e: 'ي', ɛ: 'ي', æ: 'ا', a: 'ا', ɐ: 'ا', ɑ: 'ا', ɒ: 'و', ɔ: 'و', o: 'و',
      ʊ: 'و', u: 'و', ɯ: 'و', ʌ: 'ا', ə: '', ɜ: 'ي', ɚ: 'ر', ɝ: 'ر', ø: 'و', œ: 'و', ɤ: '', ɘ: '', ɵ: 'و',
      aɪ: 'اي', aʊ: 'او', eɪ: 'ي', oʊ: 'و', əʊ: 'و', ɔɪ: 'وي', eə: 'يا', ɪə: 'يا', ʊə: 'وا',
    },
    nasal: { ɑ: 'ان', a: 'ان', ɐ: 'ان', ɛ: 'ين', e: 'ين', i: 'ين', ɔ: 'ون', o: 'ون', œ: 'ون', u: 'ون', ʊ: 'ون' },
    cons: {
      p: 'پ', b: 'ب', t: 'ت', d: 'د', k: 'ك', ɡ: 'گ', g: 'گ', f: 'ف', v: 'ڤ', s: 'س', z: 'ز', m: 'م', n: 'ن', l: 'ل',
      ʃ: 'ش', ʒ: 'ج', tʃ: 'تش', dʒ: 'ج', ts: 'تس', dz: 'دز', tɕ: 'تش', dʑ: 'ج', ɕ: 'ش', ʑ: 'ج',
      θ: 'ث', ð: 'ذ', ŋ: 'نغ', ɲ: 'ني', ʎ: 'لي', j: 'ي', w: 'و', ɥ: 'و', h: 'ه', ɦ: 'ه', ħ: 'ح', x: 'خ', χ: 'خ',
      ɣ: 'غ', ʁ: 'غ', r: 'ر', ɾ: 'ر', ɹ: 'ر', ɻ: 'ر', ɽ: 'ر', ɭ: 'ل', ɫ: 'ل', ʋ: 'ڤ', β: 'ب', ɸ: 'ف', ç: 'خ', c: 'كي',
      ɟ: 'دي', q: 'ق', ʔ: 'ء', ʕ: 'ع',
    },
    pal: '',
    rtl: true,
    punct: { ',': '،', '?': '؟', ';': '؛' },
  },
};

// Marqueurs internes de la voyelle accentuée (remplacés par <strong> à l'affichage).
export const STRESS_ON = '\u0001';
export const STRESS_OFF = '\u0002';

// ipa : chaîne API (ex. « ð ə k w ˈɪ k ») ; target : 'fr' | 'en' | 'es' | 'pt' | 'ru' | 'ar'.
export function ipaToSpelling(ipa, target) {
  const table = TABLES[target];
  if (!table) return '';
  const units = tokenize(ipa);
  const words = [];
  let word = [];
  const flush = () => {
    if (word.length) words.push(word);
    word = [];
  };
  for (const u of units) {
    if (u.t === 'space') { flush(); continue; }
    if (u.t === 'punct') { flush(); words.push([{ punct: (table.punct || {})[u.v] ?? u.v }]); continue; }
    word.push(u);
  }
  flush();

  const out = [];
  for (const units of words) {
    if (units[0].punct !== undefined) {
      if (out.length) out[out.length - 1] += units[0].punct;
      continue;
    }
    out.push(renderWord(units, table));
  }
  return out.join(' ');
}

function renderWord(units, table) {
  const vowelCount = units.filter((u) => u.t === 'vowel').length;
  let s = '';
  units.forEach((u, i) => {
    const next = units[i + 1];
    const prev = units[i - 1];
    if (u.t === 'tone') { s += u.v; return; }
    if (u.t === 'pal') {
      // Russe : la voyelle suivante porte la mollesse (дʲe → де) ; ailleurs, « y » / « i ».
      if (table.softVowels && next?.t === 'vowel') return;
      // Devant un « i », la mouillure s'entend déjà : rien à ajouter.
      if (next?.t === 'vowel' && (next.v[0] === 'i' || next.v[0] === 'ɪ')) return;
      s += table.pal;
      return;
    }
    if (u.t === 'vowel') {
      let v = u.nasal ? table.nasal[u.v[0]] ?? table.vowels[u.v] : table.vowels[u.v];
      v ??= stripMarks(u.v);
      if (table.softVowels && (prev?.t === 'pal' || (prev?.v === 'j' && prev.t === 'cons'))) {
        v = (table.softVowels[v[0]] ?? v[0]) + v.slice(1);
        if (prev?.v === 'j') s = s.slice(0, -1); // й + а → я
      }
      // Arabe : une voyelle en début de mot s'écrit sur un alif (اـ / إـ).
      if (table.rtl && i === 0 && v && !v.startsWith('ا')) v = (/^[ieɪɛ]/.test(u.v) ? 'إ' : 'ا') + v;
      s += u.stress && vowelCount > 1 ? STRESS_ON + v + STRESS_OFF : v;
      return;
    }
    let c = table.cons[u.v] ?? stripMarks(u.v);
    if (table.gu && (u.v === 'ɡ' || u.v === 'g') && next?.t === 'vowel' && FRONT.has(next.v[0])) c += 'u';
    if (table.doubleS && u.v === 's' && prev?.t === 'vowel' && next?.t === 'vowel') c = 'ss';
    s += c;
  });
  return s;
}

function stripMarks(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}]/gu, '');
}
