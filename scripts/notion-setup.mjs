// Crée la base Notion « Shadowing Studio — CRM » avec toutes ses colonnes.
//
// Usage (une seule fois) :
//   NOTION_TOKEN=ntn_xxx node scripts/notion-setup.mjs <lien ou ID de la page Notion parente>
//
// La page parente doit avoir été partagée avec l'intégration (… → Connexions).

import { P } from '../worker/src/index.js';

const token = process.env.NOTION_TOKEN;
const pageArg = process.argv[2];

if (!token || !pageArg) {
  console.error('Usage : NOTION_TOKEN=ntn_xxx node scripts/notion-setup.mjs <lien de la page Notion>');
  process.exit(1);
}

// Accepte un lien complet ou un ID ; extrait les 32 caractères hexadécimaux finaux.
const match = pageArg.replace(/-/g, '').match(/([0-9a-f]{32})(?:\?|$)/i);
if (!match) {
  console.error('Impossible de lire l’ID de page dans :', pageArg);
  process.exit(1);
}
const pageId = match[1];

const select = { select: { options: [] } };
const text = { rich_text: {} };

const res = await fetch('https://api.notion.com/v1/databases', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    parent: { type: 'page_id', page_id: pageId },
    title: [{ text: { content: 'Shadowing Studio — CRM' } }],
    properties: {
      [P.fullName]: { title: {} },
      [P.firstName]: text,
      [P.lastName]: text,
      [P.email]: { email: {} },
      [P.native]: select,
      [P.targets]: { multi_select: { options: [] } },
      [P.levels]: text,
      [P.occupation]: text,
      [P.newsletter]: { checkbox: {} },
      [P.uiLocale]: select,
      [P.createdAt]: { date: {} },
      [P.updatedAt]: { date: {} },
    },
  }),
});

const data = await res.json();
if (!res.ok) {
  console.error(`Échec (${res.status}) :`, data.message || data);
  if (res.status === 404) console.error('→ Vérifiez que la page est bien partagée avec l’intégration (… → Connexions).');
  process.exit(1);
}

console.log('Base créée :', data.url);
console.log('\nNOTION_DATABASE_ID à copier dans worker/wrangler.toml :\n');
console.log('  ' + data.id.replace(/-/g, ''));
