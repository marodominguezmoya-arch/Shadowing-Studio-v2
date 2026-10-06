// Vérifie que sw.js liste tous les fichiers de l'app (et seulement des fichiers existants).
// Usage : node scripts/check-sw.mjs
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
const listed = new Set([...sw.matchAll(/^\s+'([^']+)',$/gm)].map((m) => m[1]));

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [relative(root, p)];
});
const expected = [...walk(join(root, 'js')), ...walk(join(root, 'locales')), 'css/app.css', 'index.html', 'manifest.webmanifest']
  .filter((f) => /\.(js|css|html|webmanifest)$/.test(f));

const missing = expected.filter((f) => !listed.has(f));
const ghost = [...listed].filter((f) => f !== './' && !existsSync(join(root, f)));
if (missing.length || ghost.length) {
  console.error('Absents de sw.js :', missing, '\nListés mais introuvables :', ghost);
  process.exit(1);
}
console.log(`sw.js OK (${listed.size} fichiers)`);
