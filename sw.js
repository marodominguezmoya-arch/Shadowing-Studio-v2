// Service worker : app utilisable hors connexion.
//
// - Fichiers de l'app : réseau d'abord (les mises à jour arrivent tout de suite),
//   copie locale en secours si le réseau est absent ou trop lent.
// - Moteur vocal sur jsDelivr (versions figées, donc immuables) : copie locale d'abord.
// - Voix (HuggingFace) et API : non gérées ici (les voix ont leur propre cache).

const VERSION = '2.11.0';
const SHELL = `ss2-shell-${VERSION}`;
const CDN = 'ss2-cdn-v1';
const NETWORK_TIMEOUT = 4000;

// Liste vérifiée par scripts/check-sw.mjs (tous les fichiers de l'app doivent y figurer).
const APP_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/main.js',
  'js/config.js',
  'js/dom.js',
  'js/i18n.js',
  'js/languages.js',
  'js/library.js',
  'js/split.js',
  'js/phonetic.js',
  'js/translate.js',
  'js/share.js',
  'js/storage.js',
  'js/install.js',
  'js/icp.js',
  'js/email-check.js',
  'js/views/library.js',
  'js/views/onboarding.js',
  'js/views/privacy.js',
  'js/views/share.js',
  'js/views/hello.js',
  'js/views/studio.js',
  'js/views/calendar.js',
  'js/audio/catalog.js',
  'js/audio/piper.js',
  'js/audio/session.js',
  'js/audio/tts-worker.js',
  'js/audio/voices-data.js',
  'js/audio/webspeech.js',
  'locales/fr.js',
  'locales/en.js',
  'locales/es.js',
  'locales/pt.js',
  'locales/ru.js',
  'locales/ar.js',
  'locales/de.js',
  'locales/zh.js',
  'locales/ja.js',
  'assets/fonts/inter-latin-wght-normal.woff2',
  'assets/fonts/inter-latin-ext-wght-normal.woff2',
  'assets/fonts/inter-cyrillic-wght-normal.woff2',
  'assets/fonts/ibm-plex-mono-latin-400-normal.woff2',
  'assets/fonts/ibm-plex-mono-latin-500-normal.woff2',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then((cache) => cache.addAll(APP_FILES.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ss2-shell-') && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(cacheFirst(req));
    return;
  }

  const scope = new URL(self.registration.scope);
  if (url.origin === scope.origin && url.pathname.startsWith(scope.pathname) && !url.pathname.includes('/api/')) {
    event.respondWith(networkFirst(req));
  }
});

async function networkFirst(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT)),
    ]);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = (await cache.match(req, { ignoreSearch: true })) ||
      (req.mode === 'navigate' ? await cache.match('index.html') : null);
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CDN);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}
