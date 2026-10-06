// Installation sur l'écran d'accueil (PWA) + enregistrement du service worker.

import { load, save } from './storage.js';

let deferredPrompt = null;
const listeners = new Set();

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const register = () => navigator.serviceWorker.register('sw.js').catch((err) => console.warn('[sw]', err));
  // La page peut déjà être chargée quand ce module s'exécute.
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

// Android / Chrome : le navigateur propose l'installation ; on garde l'événement pour notre bouton.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  listeners.forEach((fn) => fn());
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  save('installDismissed', true);
  listeners.forEach((fn) => fn());
});

export function onInstallChange(fn) {
  listeners.add(fn);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// 'prompt' (bouton Installer), 'ios' (instructions Partager), ou null (rien à afficher).
export function installMode() {
  if (isStandalone() || load('installDismissed', false)) return null;
  if (deferredPrompt) return 'prompt';
  if (isIOS()) return 'ios';
  return null;
}

export async function promptInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice.catch(() => {});
  deferredPrompt = null;
  listeners.forEach((fn) => fn());
}

export function dismissInstall() {
  save('installDismissed', true);
  listeners.forEach((fn) => fn());
}
