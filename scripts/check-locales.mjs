// Vérifie que chaque langue a les mêmes clés et les mêmes variables {x} que le français.
// Usage : node scripts/check-locales.mjs
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../locales/', import.meta.url));
const flat = (obj, prefix = '') => Object.entries(obj).flatMap(([k, v]) =>
  v && typeof v === 'object' && !Array.isArray(v) ? flat(v, `${prefix}${k}.`)
  : Array.isArray(v) ? v.flatMap((item, i) => (typeof item === 'object' ? flat(item, `${prefix}${k}.${i}.`) : [[`${prefix}${k}.${i}`, item]]))
  : [[`${prefix}${k}`, v]]);
const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

const ref = new Map(flat((await import(dir + 'fr.js')).default));
let problems = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'fr.js')) {
  const map = new Map(flat((await import(dir + file)).default));
  for (const [k, v] of ref) {
    if (!map.has(k)) { console.error(`${file} : clé absente ${k}`); problems++; }
    else if (vars(map.get(k)) !== vars(v)) { console.error(`${file} : variables différentes pour ${k}`); problems++; }
    else if (v !== '' && map.get(k) === '') { console.error(`${file} : texte vide ${k}`); problems++; }
  }
  for (const k of map.keys()) if (!ref.has(k)) { console.error(`${file} : clé en trop ${k}`); problems++; }
  console.log(`${file} : ${map.size} textes`);
}
if (problems) process.exit(1);
console.log('Traductions OK');
