// Onboarding obligatoire (une fois par appareil) : une question par écran, centrée,
// puis envoi au Worker → Notion.

import { t, getLocale } from '../i18n.js';
import { CONFIG } from '../config.js';
import { sortedLanguages, languageName, CEFR_LEVELS } from '../languages.js';
import { save } from '../storage.js';
import { esc } from '../dom.js';
import { mountGreetings } from './hello.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TEXT_FIELDS = {
  firstName: { autocomplete: 'given-name' },
  lastName: { autocomplete: 'family-name' },
  email: { type: 'email', autocomplete: 'email', inputmode: 'email' },
  occupation: { autocomplete: 'organization-title' },
};

// L'état survit aux changements de langue et à la visite de la page confidentialité.
const state = {
  screen: 'welcome',
  firstName: '',
  lastName: '',
  email: '',
  occupation: '',
  native: '',
  targets: [{ lang: '', level: '' }],
  newsletter: null, // null = pas encore répondu ; true/false = choix explicite
  privacy: false,
  hp: '', // champ piège anti-spam
};
let error = '';
let sending = false;
let direction = 'forward';

// Suite des écrans, recalculée à partir de l'état (le nombre de langues visées varie).
function sequence() {
  return [
    'welcome', 'firstName', 'lastName', 'email', 'occupation', 'native',
    ...state.targets.flatMap((_, i) => [`target-${i}`, `level-${i}`]),
    'more', 'newsletter', 'privacy',
  ];
}

let stopGreetings = null;

export function renderOnboarding(root, { onDone }) {
  stopGreetings?.();
  stopGreetings = null;
  root.innerHTML = template();
  const stage = root.querySelector('.greet-stage');
  if (stage) stopGreetings = mountGreetings(stage);
  bind(root, onDone);
  focusFirst(root);
}

// ---------------------------------------------------------------------------
// Gabarits
// ---------------------------------------------------------------------------

function template() {
  const seq = sequence();
  const index = seq.indexOf(state.screen);
  const progress = Math.round((index / (seq.length - 1)) * 100);
  const [kind, i] = state.screen.split('-');

  return `
    <section class="onb">
      ${state.screen !== 'welcome' ? `
        <div class="onb-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}" aria-label="${t('onboarding.progress')}">
          <span style="width:${progress}%"></span>
        </div>` : ''}

      <form id="onboarding-form" class="onb-card ${direction}" novalidate>
        ${kind === 'welcome' ? screenWelcome()
          : kind in TEXT_FIELDS ? screenText(kind)
          : kind === 'native' ? screenNative()
          : kind === 'target' ? screenTarget(+i)
          : kind === 'level' ? screenLevel(+i)
          : kind === 'more' ? screenMore()
          : kind === 'newsletter' ? screenNewsletter()
          : screenPrivacy()}

        <div class="hp" aria-hidden="true">
          <label>Website <input type="text" name="hp" tabindex="-1" autocomplete="off" value="${esc(state.hp)}"></label>
        </div>

        ${error ? `<p class="error onb-error" id="onb-error" role="alert">${error}</p>` : ''}
      </form>

      ${state.screen !== 'welcome' ? `
        <button type="button" class="onb-back" data-action="prev"><span class="arrow" aria-hidden="true">←</span> ${t('common.back')}</button>` : ''}
    </section>
  `;
}

function question(text, hint = '') {
  return `
    <h1 class="onb-q" id="onb-q" tabindex="-1">${text}</h1>
    ${hint ? `<p class="onb-hint">${hint}</p>` : ''}
  `;
}

function nextButton(label = t('common.next')) {
  return `<button type="submit" class="btn btn-primary onb-next">${label}</button>`;
}

function screenWelcome() {
  return `
    <div class="greet-stage" aria-hidden="true"></div>
    <p class="visually-hidden">${t('onboarding.eyebrow')}</p>
    <h1 class="onb-title" id="onb-q" tabindex="-1">${t('onboarding.title')}</h1>
    <p class="lead">${t('onboarding.lead')}</p>
    ${nextButton(t('onboarding.start'))}
    <p class="onb-hint" style="margin-top:14px">${t('onboarding.duration')}</p>
  `;
}

function screenText(name) {
  const attrs = { type: 'text', ...TEXT_FIELDS[name] };
  const extra = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
  return `
    ${question(t(`onboarding.q.${name}`, { name: esc(state.firstName.trim()) }), t(`onboarding.h.${name}`))}
    <label class="visually-hidden" for="f-${name}">${t(`onboarding.${name}`)}</label>
    <input class="input onb-input" id="f-${name}" name="${name}" ${extra}
      value="${esc(state[name])}" required maxlength="120" enterkeyhint="next"
      placeholder="${esc(t(`onboarding.p.${name}`))}"
      ${error ? 'aria-invalid="true" aria-describedby="onb-error"' : ''}>
    ${nextButton()}
  `;
}

function languageSelect(id, name, value, exclude = []) {
  const langs = sortedLanguages(getLocale()).filter((l) => !exclude.includes(l.code));
  return `
    <select class="select onb-input" id="${id}" name="${name}" required
      ${error ? 'aria-invalid="true" aria-describedby="onb-error"' : ''}>
      <option value="">${t('onboarding.choose')}</option>
      ${langs.map((l) => `<option value="${l.code}" ${l.code === value ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}
    </select>
  `;
}

function screenNative() {
  return `
    ${question(t('onboarding.q.native'))}
    <label class="visually-hidden" for="f-native">${t('onboarding.nativeLanguage')}</label>
    ${languageSelect('f-native', 'native', state.native)}
    ${nextButton()}
  `;
}

function screenTarget(i) {
  const others = state.targets.filter((_, j) => j !== i).map((x) => x.lang);
  return `
    ${question(t(i === 0 ? 'onboarding.q.target' : 'onboarding.q.targetMore'))}
    <label class="visually-hidden" for="f-target">${t('onboarding.targetLanguage', { n: i + 1 })}</label>
    ${languageSelect('f-target', `target-${i}`, state.targets[i].lang, [state.native, ...others])}
    ${nextButton()}
  `;
}

function screenLevel(i) {
  const target = state.targets[i];
  const lang = languageName(target.lang, getLocale(), { capitalize: false });
  return `
    ${question(t('onboarding.q.level', { lang: esc(lang) }), t('onboarding.h.level'))}
    <div class="onb-choices" role="radiogroup" aria-labelledby="onb-q">
      ${CEFR_LEVELS.map((lvl) => `
        <button type="button" class="choice ${target.level === lvl ? 'selected' : ''}" role="radio"
          aria-checked="${target.level === lvl}" data-level="${lvl}" data-index="${i}">
          <span class="choice-code">${lvl}</span>
          <span class="choice-text">${cefrLabel(lvl)}</span>
        </button>`).join('')}
    </div>
  `;
}

// « Intermédiaire avancé — je discute… » → libellé en gras + description discrète.
function cefrLabel(lvl) {
  const [label, desc] = t(`cefr.${lvl}`).split(' — ');
  return `<strong>${label}</strong>${desc ? `<small>${desc}</small>` : ''}`;
}

function screenMore() {
  const atMax = state.targets.length >= CONFIG.maxTargets;
  const chips = state.targets.map((x, i) => `
    <li class="chip">
      ${esc(languageName(x.lang, getLocale()))} · ${x.level}
      ${state.targets.length > 1 ? `
        <button type="button" data-action="remove-target" data-index="${i}"
          aria-label="${t('common.remove')} ${esc(languageName(x.lang, getLocale()))}">×</button>` : ''}
    </li>`).join('');

  return `
    ${question(t(atMax ? 'onboarding.q.moreMax' : 'onboarding.q.more'))}
    <ul class="chips">${chips}</ul>
    <div class="onb-choices">
      ${atMax ? '' : `<button type="button" class="choice choice-center" data-action="add-target">${t('onboarding.moreYes')}</button>`}
      <button type="button" class="choice choice-center" data-action="next">${t('onboarding.moreNo')}</button>
    </div>
  `;
}

function screenNewsletter() {
  return `
    ${question(t('onboarding.q.newsletter'), t('onboarding.h.newsletter'))}
    <div class="onb-choices" role="radiogroup" aria-labelledby="onb-q">
      <button type="button" class="choice choice-center ${state.newsletter === true ? 'selected' : ''}" role="radio"
        aria-checked="${state.newsletter === true}" data-newsletter="yes">${t('onboarding.newsletterYes')}</button>
      <button type="button" class="choice choice-center ${state.newsletter === false ? 'selected' : ''}" role="radio"
        aria-checked="${state.newsletter === false}" data-newsletter="no">${t('onboarding.newsletterNo')}</button>
    </div>
  `;
}

function screenPrivacy() {
  return `
    ${question(t('onboarding.q.privacy'))}
    <label class="check ${error ? 'invalid' : ''}">
      <input type="checkbox" name="privacy" ${state.privacy ? 'checked' : ''}
        ${error ? 'aria-invalid="true" aria-describedby="onb-error"' : ''}>
      <span>${t('onboarding.privacy')}</span>
    </label>
    <p class="notice">${t('onboarding.notice')}</p>
    <button type="submit" class="btn btn-primary onb-next" ${sending ? 'disabled' : ''}>
      ${sending ? t('onboarding.sending') : t('onboarding.submit')}
    </button>
  `;
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function go(screen, dir = 'forward') {
  state.screen = screen;
  direction = dir;
  error = '';
}

function next() {
  const seq = sequence();
  go(seq[seq.indexOf(state.screen) + 1]);
}

function prev() {
  const seq = sequence();
  const [kind, i] = state.screen.split('-');
  // Revenir d'une langue supplémentaire encore vide = annuler son ajout.
  if (kind === 'target' && +i > 0 && !state.targets[+i].lang) {
    state.targets.splice(+i, 1);
    go('more', 'back');
    return;
  }
  go(seq[Math.max(0, seq.indexOf(state.screen) - 1)], 'back');
}

function validateScreen() {
  const [kind, i] = state.screen.split('-');
  const req = t('onboarding.errors.required');

  if (kind in TEXT_FIELDS) {
    const value = state[kind].trim();
    if (!value) return req;
    if (kind === 'email' && !EMAIL_RE.test(value)) return t('onboarding.errors.email');
  }
  if (kind === 'native' && !state.native) return req;
  if (kind === 'target') {
    const lang = state.targets[+i].lang;
    if (!lang) return req;
    if (state.targets.some((x, j) => j !== +i && x.lang === lang)) return t('onboarding.errors.duplicate');
  }
  if (kind === 'level' && !state.targets[+i].level) return t('onboarding.errors.level');
  if (kind === 'newsletter' && state.newsletter === null) return t('onboarding.errors.choose');
  if (kind === 'privacy' && !state.privacy) return t('onboarding.errors.privacy');
  return '';
}

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

function bind(root, onDone) {
  const form = root.querySelector('#onboarding-form');
  const rerender = () => renderOnboarding(root, { onDone });

  form.addEventListener('input', (e) => {
    const { name, value, type, checked } = e.target;
    if (!name) return;
    if (type === 'checkbox') state[name] = checked;
    else if (name.startsWith('target-')) state.targets[+name.split('-')[1]].lang = value;
    else if (name in state) state[name] = value;
  });

  // Un choix dans une liste déroulante fait avancer directement — sauf au clavier,
  // où les flèches changent la valeur à chaque appui.
  let keyboardSelect = false;
  form.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'SELECT') keyboardSelect = e.key !== 'Enter';
  });
  form.addEventListener('change', (e) => {
    if (e.target.tagName === 'SELECT' && e.target.value && !keyboardSelect) form.requestSubmit();
  });

  // Écouteur sur la section (recréée à chaque écran) : pas d'accumulation sur root.
  root.querySelector('.onb').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || btn.type === 'submit') return;

    if (btn.dataset.level) {
      state.targets[+btn.dataset.index].level = btn.dataset.level;
      return advance();
    }
    if (btn.dataset.newsletter) {
      state.newsletter = btn.dataset.newsletter === 'yes';
      return advance();
    }

    switch (btn.dataset.action) {
      case 'prev':
        prev();
        return rerender();
      case 'next':
        return advance();
      case 'add-target':
        state.targets.push({ lang: '', level: '' });
        go(`target-${state.targets.length - 1}`);
        return rerender();
      case 'remove-target':
        state.targets.splice(+btn.dataset.index, 1);
        return rerender();
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    advance();
  });

  async function advance() {
    if (sending) return;
    error = validateScreen();
    if (error) return rerender();

    if (state.screen !== 'privacy') {
      next();
      return rerender();
    }

    sending = true;
    rerender();
    try {
      await submit();
      save('onboarded', { at: new Date().toISOString() });
      save('profile', {
        firstName: state.firstName.trim(),
        native: state.native,
        targets: state.targets,
      });
      sending = false;
      onDone();
    } catch (err) {
      sending = false;
      error = navigator.onLine === false ? t('onboarding.errors.offline') : t('onboarding.errors.server');
      console.error('[onboarding]', err);
      rerender();
    }
  }
}

// Focus sur le champ de l'écran (curseur en fin de texte), sinon sur la question.
function focusFirst(root) {
  const el = root.querySelector('.onb-input') || root.querySelector('#onb-q');
  if (!el) return;
  el.focus({ preventScroll: true });
  if (el.tagName === 'INPUT' && el.value) {
    const v = el.value;
    el.value = '';
    el.value = v; // place le curseur à la fin (marche aussi pour type="email")
  }
}

// ---------------------------------------------------------------------------
// Envoi
// ---------------------------------------------------------------------------

function payload() {
  return {
    firstName: state.firstName.trim(),
    lastName: state.lastName.trim(),
    email: state.email.trim().toLowerCase(),
    occupation: state.occupation.trim(),
    nativeLanguage: state.native,
    targets: state.targets.map(({ lang, level }) => ({ lang, level })),
    newsletter: state.newsletter === true,
    privacyAccepted: state.privacy,
    uiLocale: getLocale(),
    hp: state.hp,
  };
}

async function submit() {
  const body = payload();

  if (CONFIG.mockOnboard) {
    console.info('[onboarding] Envoi simulé (local) :', body);
    await new Promise((r) => setTimeout(r, 600));
    return;
  }

  const res = await fetch(CONFIG.onboardEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
