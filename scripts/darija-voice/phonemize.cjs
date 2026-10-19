// Phonémise des textes avec EXACTEMENT le moteur de l'app (piper-wasm 1.0.0, espeak-ng).
// Usage : node phonemize.cjs voix < textes.jsonl > ids.jsonl   (une chaîne JSON par ligne)
// Un module neuf par lot : callMain répété finit par planter (mémoire).
const path = require('path');
const create = require('./pp.cjs');
const voice = process.argv[2] || 'ar';
const BATCH = Number(process.env.BATCH || 100);
const texts = require('fs').readFileSync(0, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

(async () => {
  for (let i = 0; i < texts.length; i += BATCH) {
    const out = [];
    const m = await create({
      print: (line) => out.push(line),
      printErr: (msg) => { const j = msg.indexOf('for: {'); if (j >= 0) out.push(msg.slice(j + 5)); },
      locateFile: (f) => path.join(__dirname, f),
    });
    const batch = texts.slice(i, i + BATCH);
    m.callMain(['-l', voice, '--input', JSON.stringify(batch.map((text) => ({ text }))), '--espeak_data', '/espeak-ng-data']);
    const parsed = out.filter((l) => l.startsWith('{')).map((l) => JSON.parse(l));
    if (parsed.length !== batch.length) throw new Error(`lot ${i}: ${parsed.length} résultats pour ${batch.length} textes`);
    for (const p of parsed) process.stdout.write(JSON.stringify({ ids: p.phoneme_ids, ipa: p.phonemes.join('') }) + '\n');
  }
})();
