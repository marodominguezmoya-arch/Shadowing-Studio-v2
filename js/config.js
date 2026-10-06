// Configuration globale de l'app.

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

export const IS_LOCAL = LOCAL_HOSTS.includes(location.hostname);

export const CONFIG = {
  // Relatif : en production, résolu en https://maromoya.com/shadowingstudio/api/onboard
  // (route servie par le Cloudflare Worker).
  onboardEndpoint: 'api/onboard',

  // En local, aucun Worker n'existe encore : l'envoi est simulé et affiché dans la console.
  mockOnboard: IS_LOCAL,

  privacyContact: 'maromoya.pro@gmail.com',

  // Nombre maximum de langues visées dans l'onboarding.
  maxTargets: 5,
};
