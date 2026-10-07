// Point d'entrée : langue, routage par hash, garde d'onboarding.

import { initLocale, setLocale, getLocale, onLocaleChange, t, availableLocales, LOCALE_NAMES } from './i18n.js';
import { load, save, remove } from './storage.js';
import { IS_LOCAL } from './config.js';
import { renderOnboarding } from './views/onboarding.js';
import { renderPrivacy } from './views/privacy.js';
import { renderStudio } from './views/studio.js';
import { renderLibrary } from './views/library.js';
import { renderShare } from './views/share.js';
import { showHello } from './views/hello.js';
import { registerServiceWorker } from './install.js';

const view = document.getElementById('view');
let helloShowing = false;

// La copie brute sur github.io n'a pas d'API : on renvoie vers l'adresse officielle.
if (location.hostname.endsWith('github.io')) {
  location.replace('https://maromoya.com/shadowingstudio/' + location.hash);
}

// Outil de dev : http://localhost:8080/?reset efface l'onboarding pour le retester.
if (IS_LOCAL && new URLSearchParams(location.search).has('reset')) {
  ['onboarded', 'profile', 'helloSeen'].forEach(remove);
  history.replaceState(null, '', location.pathname);
}

function route() {
  const hash = location.hash.replace(/^#\/?/, '');

  // Lien de partage reçu par un nouvel utilisateur : on le garde pendant l'onboarding.
  if (hash.startsWith('partage/') && !load('onboarded')) save('pendingShare', hash.slice('partage/'.length));

  if (hash === 'confidentialite') {
    renderPrivacy(view);
  } else if (!load('onboarded')) {
    // Toute première visite : écran « Hello » par-dessus le formulaire, une seule fois.
    if (!load('helloSeen') && !helloShowing) {
      helloShowing = true;
      showHello({
        onDone: () => {
          save('helloSeen', true);
          helloShowing = false;
          view.querySelector('#onb-q')?.focus();
        },
      });
    }
    renderOnboarding(view, {
      onDone: () => {
        const pending = load('pendingShare');
        location.hash = pending ? `#/partage/${pending}` : '#/';
        route();
        view.focus();
      },
    });
  } else if (hash.startsWith('partage/')) {
    renderShare(view, hash.slice('partage/'.length));
  } else if (hash === 'listes') {
    renderLibrary(view);
  } else {
    renderStudio(view);
  }
}

function syncFooter() {
  document.getElementById('footer-privacy').textContent = t('privacy.title');
  document.getElementById('footer-copyright').textContent = t('common.copyright', { year: new Date().getFullYear() });
}

const localeSelect = document.getElementById('locale-select');
localeSelect.innerHTML = availableLocales
  .map((code) => `<option value="${code}" lang="${code}">${LOCALE_NAMES[code]}</option>`)
  .join('');
localeSelect.addEventListener('change', () => setLocale(localeSelect.value));

function syncLocaleButtons() {
  localeSelect.value = getLocale();
}

onLocaleChange(() => {
  syncLocaleButtons();
  syncFooter();
  route();
});

window.addEventListener('hashchange', () => {
  route();
  window.scrollTo(0, 0);
});

registerServiceWorker();
initLocale();
syncLocaleButtons();
syncFooter();
route();
