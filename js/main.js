// Point d'entrée : langue, routage par hash, garde d'onboarding.

import { initLocale, setLocale, getLocale, onLocaleChange, t, availableLocales, LOCALE_NAMES } from './i18n.js';
import { load, remove } from './storage.js';
import { IS_LOCAL } from './config.js';
import { renderOnboarding } from './views/onboarding.js';
import { renderPrivacy } from './views/privacy.js';
import { renderStudio } from './views/studio.js';
import { renderLibrary } from './views/library.js';
import { registerServiceWorker } from './install.js';

const view = document.getElementById('view');

// La copie brute sur github.io n'a pas d'API : on renvoie vers l'adresse officielle.
if (location.hostname.endsWith('github.io')) {
  location.replace('https://maromoya.com/shadowingstudio/' + location.hash);
}

// Outil de dev : http://localhost:8080/?reset efface l'onboarding pour le retester.
if (IS_LOCAL && new URLSearchParams(location.search).has('reset')) {
  ['onboarded', 'profile'].forEach(remove);
  history.replaceState(null, '', location.pathname);
}

function route() {
  const hash = location.hash.replace(/^#\/?/, '');

  if (hash === 'confidentialite') {
    renderPrivacy(view);
  } else if (!load('onboarded')) {
    renderOnboarding(view, {
      onDone: () => {
        location.hash = '#/';
        route();
        view.focus();
      },
    });
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
