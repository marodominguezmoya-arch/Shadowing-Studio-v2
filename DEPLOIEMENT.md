# Mise en ligne — guide pas à pas

Trois parties. **A** se fait maintenant ; **B** et **C** au moment de la mise en ligne (étape 5).

| Partie | Où | Durée |
|---|---|---|
| A. Base Notion + clé | Notion + Terminal | ~10 min |
| B. Dépôt GitHub | GitHub | ~5 min |
| C. Worker Cloudflare | Terminal | ~5 min |

> 🔒 **La clé Notion est un mot de passe.** Ne la collez jamais dans le chat, dans un fichier du projet
> ou sur GitHub. Elle ne va qu'à deux endroits : le terminal (masquée) et Cloudflare (secret chiffré).

---

## A. Notion ✅ (fait le 2026-10-06)

- Page **🎧 CRM Shadowing Studio** et base **« Shadowing Studio — CRM »** créées via le connecteur Notion
  de Claude. Identifiant de la base déjà inscrit dans `worker/wrangler.toml`.
- **Connexion interne** « Shadowing Studio » créée dans le portail développeur Notion
  (https://www.notion.so/developers/connections → *Build* → *Internal connections*), avec accès à la page.
  Son **API token** sera enregistré à l'étape C.

> Ne renommez pas les colonnes : le Worker les retrouve par leur nom exact.
> `scripts/notion-setup.mjs` reste disponible pour recréer la base si besoin.

---

## B. GitHub (étape 5)
1. Créez un dépôt public **`Shadowing-Studio-v2`** sur le compte `marodominguezmoya-arch`.
2. Envoyez-y le code du projet (Claude prépare les commandes).
3. **Settings → Pages** → Source : *Deploy from a branch* → `main` / `/ (root)` → **Save**.
4. Vérifiez que `https://marodominguezmoya-arch.github.io/Shadowing-Studio-v2/` s'affiche
   (elle renverra ensuite vers maromoya.com).

## C. Cloudflare (étape 5)
```bash
cd "/Users/marod/Shadowing Studio v2/worker" && npx wrangler@4 login
```
Une page Cloudflare s'ouvre : autorisez l'accès. Puis enregistrez l'API token de la connexion interne Notion comme secret chiffré (collez-le quand c'est demandé) :
```bash
cd "/Users/marod/Shadowing Studio v2/worker" && npx wrangler@4 secret put NOTION_TOKEN
```
Puis déployez :
```bash
cd "/Users/marod/Shadowing Studio v2/worker" && npm run deploy
```

Le Worker prend alors en charge **uniquement** `maromoya.com/shadowingstudio*` ; le reste de maromoya.com
ne change pas.

### Vérification finale
1. Ouvrir **https://maromoya.com/shadowingstudio** sur votre téléphone.
2. Remplir le formulaire avec votre propre email.
3. La fiche apparaît dans la base Notion. Un second envoi avec le même email **met à jour** la fiche.

### En cas de problème
```bash
cd "/Users/marod/Shadowing Studio v2/worker" && npx wrangler@4 tail
```
affiche en direct les erreurs du Worker (ex. clé Notion invalide, base non partagée avec l'intégration).
