// Découpe un texte collé en phrases, selon les règles de la langue (Intl.Segmenter).

const MAX_CHARS = 400;

export function splitSentences(text, tag) {
  const clean = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
  const out = [];

  // Les retours à la ligne séparent toujours ; puis découpage en phrases dans chaque bloc.
  for (const block of clean.split(/\n+/)) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    for (const sentence of segment(trimmed, tag)) {
      out.push(...splitLong(sentence));
    }
  }
  return out;
}

function segment(text, tag) {
  let parts = null;
  if ('Segmenter' in Intl) {
    try {
      const seg = new Intl.Segmenter(tag, { granularity: 'sentence' });
      parts = [...seg.segment(text)].map((s) => s.segment.trim()).filter(Boolean);
    } catch {
      /* langue non prise en charge : repli ci-dessous */
    }
  }
  parts ||= text.match(/[^.!?。！？]+[.!?。！？]*\s*/g)?.map((s) => s.trim()).filter(Boolean) || [text];
  return mergeAbbreviations(parts);
}

// « M. » / « Mme. » / « Dr. » / « St. » isolés : abréviation, pas une phrase → recollée à la suivante.
const ABBREVIATION = /^\p{Lu}\p{L}{0,3}\.$/u;

function mergeAbbreviations(parts) {
  const out = [];
  for (const part of parts) {
    const prev = out[out.length - 1];
    if (prev && ABBREVIATION.test(prev.split(/\s+/).pop()) && prev.split(/\s+/).length === 1) {
      out[out.length - 1] = `${prev} ${part}`;
    } else out.push(part);
  }
  return out;
}

// Phrase trop longue pour une séance : coupe aux virgules / points-virgules, puis aux espaces.
function splitLong(sentence) {
  if (sentence.length <= MAX_CHARS) return [sentence];
  const parts = [];
  let current = '';
  for (const piece of sentence.split(/(?<=[,;:，；])\s*/)) {
    if ((current + ' ' + piece).trim().length > MAX_CHARS && current) {
      parts.push(current.trim());
      current = '';
    }
    current += ' ' + piece;
  }
  if (current.trim()) parts.push(current.trim());
  return parts.flatMap((p) => (p.length <= MAX_CHARS ? [p] : p.match(new RegExp(`.{1,${MAX_CHARS}}(\\s|$)`, 'g')).map((s) => s.trim())));
}
