# UNLOCK — International Founder Performance Coaching

Site d'acquisition premium pour le programme de coaching UNLOCK (Maro Moya).
Stack : React 19 + Vite + Tailwind CSS + Framer Motion + Lucide Icons.

## Structure du projet

```
src/
  components/     Un composant par section de la page (Hero, Method, Application, ...)
  data/content.js Toutes les copies/textes du site, centralisées ici
  lib/analytics.js Wiring GA4 + Meta Pixel (no-op tant que les IDs ne sont pas définis)
  hooks/          Hooks utilitaires (scroll progress, etc.)
public/           Favicon, robots.txt, sitemap.xml
```

Pour changer un texte (titre, paragraphe, item FAQ, étape du framework...), modifiez
`src/data/content.js` — les composants n'ont pas de texte en dur.

La version de Node est figée via `.nvmrc` et le champ `engines` de `package.json`
(`^20.19.0 || >=22.12.0`, requis par Vite 8) — Cloudflare Pages et votre machine locale
utiliseront automatiquement la bonne version si vous utilisez `nvm`.

## Développement local

```bash
npm install
npm run dev
```

## Mettre le projet sur GitHub

Depuis la racine de ce dossier (`founder-english/`) :

```bash
git init
git add .
git commit -m "Initial commit — UNLOCK landing page"
git branch -M main
git remote add origin https://github.com/<votre-compte>/<nom-du-repo>.git
git push -u origin main
```

Créez d'abord un repo vide sur GitHub (sans README ni .gitignore générés automatiquement,
pour éviter un conflit avec ceux déjà présents ici), copiez son URL, et remplacez
`<votre-compte>/<nom-du-repo>` ci-dessus. Le `.gitignore` fourni exclut déjà `node_modules`,
`dist` et les fichiers `.env` — rien de superflu ne sera poussé.

## Build de production

```bash
npm run build   # génère le dossier dist/
npm run preview # sert dist/ localement pour vérification
```

## Variables d'environnement (analytics)

Copiez `.env.example` vers `.env` et renseignez :

```
VITE_GA4_ID=G-XXXXXXX
VITE_META_PIXEL_ID=XXXXXXXXXXXXXXX
```

Sans ces valeurs, le site fonctionne normalement — les appels analytics sont simplement
des no-ops. Le tracking d'événement custom (`application_submitted`) est déjà posé sur
la soumission du formulaire de candidature dans `src/components/Application.jsx`.

Pour Google Search Console : ajoutez la balise de vérification fournie par Google dans
`index.html` (`<meta name="google-site-verification" ...>`), ou passez par la vérification
DNS directement dans Cloudflare.

## Formulaire de candidature

Le composant `Application.jsx` gère un formulaire multi-étapes complet côté client
(validation, progression, état de succès). Il ne fait actuellement **aucun appel réseau** —
`handleSubmit` est le point d'intégration à brancher sur votre outil de destination :

- Un endpoint Cloudflare Pages Function (`functions/api/apply.js`) qui relaie vers votre CRM,
- Ou directement un webhook (Zapier/Make) vers Notion, Airtable, Google Sheets, etc.,
- Ou un provider d'emailing (Mailerlite, Brevo...) via leur API REST.

## Déploiement sur Cloudflare Pages

### Option A — via le dashboard Cloudflare

1. Poussez ce projet sur un repo GitHub/GitLab.
2. Dans Cloudflare Pages → **Create a project** → **Connect to Git** → sélectionnez le repo.
3. Paramètres de build :
   - **Framework preset** : Vite
   - **Build command** : `npm run build`
   - **Build output directory** : `dist`
   - Cloudflare Pages détecte normalement `.nvmrc`. Si le build échoue pour une raison de
     version Node, ajoutez la variable d'environnement `NODE_VERSION=22` dans
     **Settings → Environment variables**.
4. Ajoutez les variables d'environnement (`VITE_GA4_ID`, `VITE_META_PIXEL_ID`) dans
   **Settings → Environment variables**.
5. Déployez. Chaque push sur la branche principale redéploie automatiquement.

### Option B — via Wrangler CLI

```bash
npm install -g wrangler
npm run build
wrangler pages deploy dist --project-name=unlock-maromoya
```

Un fichier `wrangler.toml` minimal est fourni à la racine pour le nommage du projet.

### Nom de domaine

Dans Cloudflare Pages → **Custom domains**, ajoutez votre domaine (ex. `unlock.maromoya.com`)
et suivez les instructions DNS (le domaine doit déjà être sur Cloudflare, ou ajoutez le
enregistrement CNAME fourni chez votre registrar actuel).

## Checklist avant mise en ligne

- [ ] Remplacer `public/og-cover-placeholder.txt` par un vrai visuel Open Graph
      `public/og-cover.jpg` (1200×630px) et mettre à jour les balises `og:image` dans `index.html`.
- [ ] Renseigner `VITE_GA4_ID` et `VITE_META_PIXEL_ID`.
- [ ] Brancher `handleSubmit` dans `Application.jsx` sur votre destination réelle (CRM, Airtable...).
- [ ] Relire chaque texte de `src/data/content.js` (témoignages, métriques) et remplacer les
      exemples illustratifs par vos vrais chiffres et retours clients.
- [ ] Vérifier `index.html` : URL canonique, `og:url`, domaine réel.
- [ ] Ajouter la balise de vérification Google Search Console si nécessaire.
