# Shadowing Studio v2 — Spécification

> Réécriture complète de la v1 (https://marodominguezmoya-arch.github.io/Shadowing-Studio-by-Maro-Moya/).
> Document issu de l'entretien du 2026-10-06. Aucun code n'est écrit à ce stade.

---

## 1. Vision

Une app web mobile d'abord pour pratiquer le **shadowing** : l'utilisateur saisit des phrases, l'app les fait
prononcer par une voix native, avec répétitions, pauses et vitesse réglables, en direct ou sous forme
de **fichier audio fiable** à écouter partout, même écran verrouillé.

Accessible à **https://maromoya.com/shadowingstudio**, dans l'univers visuel de maromoya.com (UNLOCK).

## 2. Public cible

| Priorité | Profil | Besoin |
|---|---|---|
| 1 (égalité) | **Apprenants autonomes** | Pratiquer seuls la prononciation et la fluidité, surtout sur téléphone. |
| 1 (égalité) | **Maro (usage perso)** | Outil quotidien + source de contacts pour un CRM Notion. |
| Hors cible | Profs / classes | Pas de fonctions dédiées. |

## 3. Problèmes de la v1 à résoudre

1. **Bips à la place des phrases dans le WAV exporté.** Cause confirmée dans le code v1 : les voix du
   navigateur ne pouvant pas être enregistrées, l'export récupère l'audio de Google Translate TTS
   (point d'accès non officiel) via 4 proxys CORS publics (allorigins, corsproxy, thingproxy, codetabs).
   Quand ils échouent, la v1 insère volontairement un bip. Ce détournement est instable et non autorisé.
   → Résolu par un moteur de synthèse **local** (§5.2).
2. **Son coupé quand l'écran se verrouille** (tous appareils). La Web Speech API s'arrête en arrière-plan.
   → Résolu en jouant un **vrai fichier audio** via un élément `<audio>` + Media Session API.
3. **Voix inégales** selon l'appareil. → Voix neuronales locales identiques partout pour les langues couvertes.

## 4. Fonctions

### 4.1 Conservées de la v1
- Saisie d'une liste de phrases.
- Réglages de séance : **répétitions**, **pause (s)**, **vitesse (%)**.
- **Lecture directe** (« Play session ») et **export audio** (phrase + silence pour répéter ; le bip de la v1 a été retiré à la demande de Maro, jugé gênant).
- **~50 langues et variantes régionales** (es-ES, es-MX, fr-CA, en-IN, ar-EG…).
- **Transcription phonétique** : comment un locuteur natif d'une autre langue lirait la phrase.
  Peu utilisée par Maro : conservée, non prioritaire.
- Raccourci clavier Ctrl+Entrée pour lancer la lecture (desktop).

### 4.2 Nouvelles
- **Onboarding obligatoire + CRM Notion** (§6).
- **Bibliothèque de listes** : créer, nommer, renommer, dupliquer, supprimer des listes de phrases,
  stockées sur l'appareil (localStorage : du texte, quelques Ko par liste). Chaque liste garde sa langue
  et ses réglages ; la liste en cours est enregistrée automatiquement.
  - **Export / import** de la bibliothèque en fichier JSON (pour changer d'appareil, sans compte).
  - **Coller un texte long** → découpage automatique en phrases (modifiable avant validation).
- **PWA installable** (ajout à l'écran d'accueil) et **fonctionnement hors-ligne** après la première visite
  (app + voix déjà téléchargées).
- **Interface multilingue** : FR, EN, ES, PT, RU, AR, avec prise en charge **droite-à-gauche** pour l'arabe.

### 4.3 Plus tard (hors périmètre v2.0)
- ~~Lien de partage d'une liste~~ → **fait** (2026-10-07, voir §14).
- ~~S'enregistrer au micro et comparer au modèle~~ → écarté par Maro (2026-10-07).
- ~~Traduction des phrases~~ → **fait** (2026-10-07, voir §13).

## 5. Audio

### 5.1 Principe
Deux moteurs, choisis automatiquement par langue :

| Moteur | Langues | Lecture directe | Export audio | Écran verrouillé |
|---|---|---|---|---|
| **Voix locale neuronale** (type Piper / ONNX en WebAssembly) | ~30–40 langues couvertes | ✅ | ✅ | ✅ |
| **Repli : voix du navigateur** (Web Speech API) | toutes les autres | ✅ | ❌ (badge « export indisponible ») | ❌ |

### 5.2 Voix locale
- Le modèle d'une voix (~20–60 Mo) est téléchargé **une seule fois**, à la demande, avec barre de
  progression et taille annoncée avant téléchargement ; mis en cache pour le hors-ligne.
- Gestion des voix téléchargées (voir l'espace occupé, supprimer).
- Génération de la séance complète en mémoire : pour chaque phrase × répétitions →
  phrase (à la vitesse choisie) → silence (= durée de la phrase × facteur ou pause fixe). **Pas de bip.**
- La séance générée est **jouée comme un fichier** (lecture continue écran verrouillé, contrôles
  sur l'écran de verrouillage via Media Session) et **téléchargeable** (WAV ; MP3/M4A si faisable
  sans dépendance lourde, pour réduire la taille).
- **Aucun son de substitution** : si une phrase échoue, l'erreur est affichée clairement et la phrase
  signalée — jamais de remplacement silencieux.

### 5.3 Implémentation (v2.0)
- **Piper** (voix libres, licence MIT) exécuté dans un Web Worker : phonémiseur espeak-ng en WebAssembly
  (`@diffusionstudio/piper-wasm`, ~18 Mo, commun à toutes les langues) + `onnxruntime-web` **1.18 mono-thread** (jsDelivr) — les versions ≥ 1.19 plantent au démarrage sur Safari iOS (mémoire).
- Voix téléchargées depuis `rhasspy/piper-voices` (HuggingFace, révision figée), mises en cache (Cache API).
- **39 langues/variantes sur 54** ont une voix locale (catalogue : `js/audio/voices-data.js`) ; les autres
  utilisent la voix du navigateur en lecture directe.
- Vitesse via le paramètre `length_scale` du modèle : voix ralentie/accélérée sans déformation.
- Pause « auto » = durée de la phrase × 1,2 + 0,4 s (min 1 s), ou 2 / 3 / 5 / 8 s.
- Mesuré sur ordinateur : 3 phrases × 3 répétitions générées en 1,5 s (voix déjà téléchargée).
- À vérifier sur téléphone réel : temps de génération, mémoire, lecture écran verrouillé (iOS/Android).

## 6. Onboarding & CRM Notion

### 6.1 Parcours
1. Première visite → écran d'accueil puis onboarding **obligatoire** avant l'app : **une question par écran,
   centrée**, barre de progression, bouton retour ; les choix (niveau, oui/non, liste) font avancer seuls.
2. Envoi réussi → l'appareil retient que l'onboarding est fait (stockage local) : plus jamais redemandé
   sur cet appareil.
3. Nouvel appareil → formulaire à nouveau ; la même adresse email **met à jour** la fiche Notion
   existante au lieu de créer un doublon.
4. La première visite nécessite une connexion (l'envoi doit aboutir) ; ensuite l'app fonctionne hors-ligne.

### 6.2 Champs

| Champ | Type | Obligatoire |
|---|---|---|
| Prénom | texte | oui |
| Nom | texte | oui |
| Email | email validé | oui |
| Langue maternelle | liste | oui |
| Langues visées | 1 ou plusieurs, chacune avec un **niveau CECRL** (A1–C2, avec description courte) | oui (≥ 1) |
| Profession / occupation | texte | oui |
| Accepte de recevoir la newsletter / nouveautés | choix explicite Oui / Non (rien de présélectionné) | réponse requise, « Non » possible |
| Accepte la politique de confidentialité (information) | case | oui |

### 6.3 Base Notion « Shadowing Studio — CRM » (à créer)

| Propriété | Type Notion |
|---|---|
| Nom complet | Title |
| Prénom | Text |
| Nom | Text |
| Email | Email |
| Langue maternelle | Select |
| Langues visées | Multi-select |
| Niveaux | Text (ex. `EN: B2, ES: A2`) |
| Profession | Text |
| Newsletter | Checkbox |
| Langue d'interface | Select |
| Première inscription | Date |
| Dernière mise à jour | Date |

### 6.4 Architecture
Notion n'accepte pas d'appels directs depuis une page web (CORS + clé secrète exposée).

```
Navigateur ──► maromoya.com/shadowingstudio/*  ──► Cloudflare Worker
                                                    ├─ /shadowingstudio/…       → proxy vers GitHub Pages (app statique)
                                                    └─ /shadowingstudio/api/onboard → validation → API Notion (clé en secret Worker)
```

- maromoya.com est déjà derrière **Cloudflare** (compte de Maro) : une route Worker
  `maromoya.com/shadowingstudio*` ne touche pas au reste du site.
- Le Worker : valide les champs, vérifie l'origine, **anti-spam** (champ piège caché + limitation de débit
  par IP), recherche l'email dans Notion → crée ou met à jour la fiche.
- Clé Notion stockée uniquement en **secret Cloudflare**, jamais dans le dépôt.
- Coût : 0 € (offres gratuites Cloudflare Workers, GitHub Pages, Notion).

### 6.5 RGPD
- Mention d'information sous le formulaire : responsable (Maro Moya), finalités (statistiques d'usage ;
  newsletter si consentie), durée de conservation, droits (accès, rectification, suppression).
- **Newsletter = consentement séparé, facultatif, décoché** ; l'accès à l'app n'en dépend jamais.
- Page **Politique de confidentialité** dans l'app (dans les 6 langues d'interface).
- Demandes d'accès / suppression : **maromoya.pro@gmail.com**.
- Les phrases, listes et voix restent **sur l'appareil** ; seules les données du formulaire sont envoyées.

## 7. Contraintes

- **Gratuit** pour l'utilisateur et pour Maro (pas d'API payante).
- **Sans compte / sans mot de passe** (l'onboarding n'est pas un compte : aucune connexion).
- **Hébergement** : code statique sur **GitHub Pages**, servi sous **maromoya.com/shadowingstudio**
  via Cloudflare Worker.
- **Mobile d'abord** : conçu pour une main sur téléphone, puis élargi au desktop.
- **Code simple, sans build** : HTML/CSS/JS purs (modules ES), modifiables directement sur GitHub.
  Seule exception : le Worker Cloudflare (un fichier JS).
- Toutes les URLs internes relatives au préfixe `/shadowingstudio/`.

## 8. Design

Cohérent avec **maromoya.com** (lui-même inspiré de danieldalen.com) :

| Jeton | Valeur relevée |
|---|---|
| Fond | `#0B0B0D` (surfaces `#141416`, `#242427`) |
| Texte | `#F2F0EA` (variantes à 60–90 % d'opacité) |
| Accent | or `#C9A961` |
| Texte secondaire | `#93939A` |
| Titres | Inter, graisse 800, très grands, serrés |
| Étiquettes | IBM Plex Mono, petites capitales espacées |
| Boutons | pilule claire sur fond sombre |

- Thème **sombre** (comme le site) + thème **clair** appliqué automatiquement selon le réglage de l'appareil
  (`prefers-color-scheme`) ; palette claire dérivée : fond crème `#F2F0EA`, texte `#0B0B0D`, accent or conservé.
- Grandes zones tactiles (≥ 44 px), un seul bouton principal par écran.
- Mise en page miroir correcte en arabe (RTL).
- Accessibilité : contrastes AA, navigation clavier, libellés lecteurs d'écran.

## 9. Phasage

| Phase | Contenu | Statut |
|---|---|---|
| **v2.0 (lancement)** — **en ligne** (2026-10-06) | Interface FR + EN ; onboarding + Worker + CRM Notion + RGPD ; lecture directe + **export audio fiable** (voix locales + repli) + lecture écran verrouillé ; réglages de séance | **Obligatoire** |
| v2.1 | Bibliothèque de listes, export/import JSON, découpage de texte collé ; PWA hors-ligne | **Fait** (2026-10-07) |
| v2.2 | Interface complète FR/EN/ES/PT/RU/AR (RTL) ; transcription phonétique | **Fait** (2026-10-07) |

## 10. Questions ouvertes

1. ~~Langue(s) de l'interface en v2.0~~ → **Décidé : FR + EN dès v2.0**, architecture i18n prête pour
   ES/PT/RU/AR (ajoutées en v2.2).
2. ~~Transcription phonétique~~ → **Résolu** : la v1 utilise des **règles locales** par paire de langues
   (`applyPhoneticRules` dans `app.js`), sans service externe. On reprend et on nettoie ces règles en v2.2.
   Le champ de clé API Anthropic encore présent dans la v1 est abandonné.
3. ~~Avenir de l'URL v1~~ → **Décidé** : à la mise en ligne de la v2, l'adresse github.io de la v1
   **redirige** vers maromoya.com/shadowingstudio (page de redirection dans le dépôt v1).
4. ~~Mode clair~~ → **Décidé** : sombre + clair automatique selon l'appareil (§8).
5. ~~Email de contact RGPD~~ → **Décidé** : `maromoya.pro@gmail.com`.

_Toutes les questions ouvertes sont tranchées._

## 11. Notes techniques v2.1

- **Hors-ligne** : `sw.js` (réseau d'abord avec repli sur la copie locale, délai 4 s) pour les fichiers de
  l'app ; le moteur vocal (ONNX Runtime, phonémiseur) et les voix sont mis en cache par le Web Worker
  lui-même (Cache API `ss2-voices-v1`), ce qui ne dépend pas du service worker.
- **Ajouter un fichier à l'app** = l'ajouter à `APP_FILES` dans `sw.js` et augmenter `VERSION` ;
  `node scripts/check-sw.mjs` vérifie la liste.
- **Découpage** : `Intl.Segmenter` (règles de la langue de la liste), abréviations courtes recollées
  (« M. Dupont »), phrases > 400 caractères recoupées aux virgules.
- **Icônes** : `python3 scripts/make-icons.py`.

## 12. Notes techniques v2.2

- **Interface** : `locales/{fr,en,es,pt,de,ru,ar,zh,ja}.js` (pt = portugais du Brésil, ar = arabe standard
  moderne, zh = mandarin en caractères simplifiés ; de/zh/ja ajoutés le 2026-10-07),
  menu de langue dans la barre du haut, `dir="rtl"` pour l'arabe. `node scripts/check-locales.mjs` vérifie que
  chaque langue a les mêmes textes et variables que le français. Traductions à faire relire par des natifs.
- **Transcription phonétique** (`js/phonetic.js`) : la v1 utilisait des règles de remplacement de lettres
  (22 paires). La v2 part de la **prononciation réelle** (API) produite par espeak-ng — le phonémiseur déjà
  utilisé pour les voix — puis la réécrit avec l'orthographe d'une langue lectrice : fr, en, es, pt (latin),
  ru (cyrillique), ar (écriture arabe). Syllabe accentuée en gras, tons en exposant. Disponible pour toutes
  les langues de pratique sauf le japonais et le yoruba (pas de données espeak-ng). Ne nécessite pas de voix
  téléchargée (phonémiseur seul, ~19 Mo, en cache).

## 13. Prononciation écrite et traduction (rappel actif)

- **Deux interrupteurs** dans les réglages (éteints par défaut) : « Prononciation écrite » et « Traduction ».
  Pas de choix de langue : langue maternelle du profil, sinon langue de l'interface (jamais la langue pratiquée).
- En séance, deux boutons « Voir la prononciation » / « Voir la traduction » sous la phrase : chacun se
  révèle au toucher, se recache au toucher et à chaque nouvelle phrase. Aucun panneau d'édition des
  traductions (retiré à la demande de Maro, 2026-10-07).
- Traduction automatique via le Worker : `POST /shadowingstudio/api/translate` → Workers AI
  **`@cf/meta/llama-4-scout-17b-16e-instruct`** (une requête pour toutes les phrases, réponse JSON vérifiée),
  avec la variante de la liste (ex. `ar-JO` → « Jordanian Arabic (Levantine dialect) »). Secours :
  `@cf/meta/m2m100-1.2b`. m2m100 seul a été abandonné le 2026-10-07 : inutilisable sur l'arabe dialectal
  (« وين رايح هلأ؟ » → « Winston Churchill est-il parti ? »). Coût mesuré : ~8 neurones pour 7 phrases.
- Les traductions sont stockées dans la liste (`translations[langue][phrase]` + `translationsVersion`) :
  disponibles hors connexion et exportées. Changer `TRANSLATION_VERSION` (studio.js) fait tout retraduire
  automatiquement (utilisé pour remplacer les traductions m2m100).
- Confidentialité : les phrases ne quittent l'appareil que si la traduction est activée (mention dans les
  6 langues).

## 14. Partage d'une liste par lien

- « Mes listes » → **Partager** : feuille de partage du téléphone (`navigator.share`), sinon copie du lien.
- Le lien contient la liste (nom, langue, phrases, réglages) compressée (deflate-raw + base64url) dans le
  fragment : `https://maromoya.com/shadowingstudio/#/partage/z…`. Aucun stockage serveur ; le fragment n'est
  pas envoyé au réseau. ~250 caractères pour 4 phrases, ~340 pour 40. Les traductions ne sont pas incluses
  (le destinataire les obtient dans sa propre langue).
- Destinataire : écran « Liste partagée » (aperçu → « Ajouter à mes listes », crée une nouvelle liste).
  Nouvel utilisateur : le lien est gardé pendant l'onboarding (`pendingShare`), puis l'écran s'affiche.
- Liens préparés à l'avance à l'affichage de la bibliothèque : Safari iOS n'ouvre la feuille de partage que
  juste après un toucher.
