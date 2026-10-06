// Politique de confidentialité (accessible avant et après l'onboarding).

import { t } from '../i18n.js';
import { CONFIG } from '../config.js';

export function renderPrivacy(root) {
  const contact = CONFIG.privacyContact;
  const sections = t('privacy.sections');

  root.innerHTML = `
    <p class="back"><a href="#/" data-action="back">← ${t('common.back')}</a></p>
    <p class="eyebrow">${t('privacy.eyebrow')}</p>
    <h1>${t('privacy.title')}</h1>
    <p class="faint">${t('privacy.updated')}</p>
    <div class="prose">
      ${sections.map((s) => `
        <h3>${s.h}</h3>
        ${s.p ? `<p>${s.p.replaceAll('{contact}', contact)}</p>` : ''}
        ${s.list ? `<ul>${s.list.map((li) => `<li>${li}</li>`).join('')}</ul>` : ''}
      `).join('')}
    </div>
  `;

  // Retour à l'écran précédent (ex. onboarding en cours) plutôt qu'à l'accueil.
  root.querySelector('[data-action="back"]').addEventListener('click', (e) => {
    if (history.length > 1) {
      e.preventDefault();
      history.back();
    }
  });
}
