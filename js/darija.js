// Normalisation du darija avant le moteur espeak (voix arabe) : lettres marocaines absentes d'espeak.
// Doit rester identique à la préparation des données d'entraînement de la voix (scripts/darija-voice/).
export function normalizeDarija(text) {
  return text
    .replace(/ـ/g, '')
    .replace(/[ڭگ]/g, 'ق')
    .replace(/ڤ/g, 'ف')
    .replace(/\s+/g, ' ')
    .trim();
}
