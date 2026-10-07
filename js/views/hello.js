// Écran « Hello » de la toute première visite (façon iPhone neuf) : des salutations qui défilent
// vers le haut, la première dans la langue du pays de connexion. Un toucher pour commencer.

import { t } from '../i18n.js';
import { IS_LOCAL } from '../config.js';

// [langue, salutation] — la langue sert aussi d'attribut lang (police, sens d'écriture).
const GREETINGS = [
  ['en', 'Hello'], ['fr', 'Bonjour'], ['es', 'Hola'], ['ar', 'مرحبا'], ['pt', 'Olá'], ['de', 'Hallo'],
  ['it', 'Ciao'], ['zh', '你好'], ['ja', 'こんにちは'], ['ru', 'Привет'], ['tr', 'Merhaba'], ['ko', '안녕하세요'],
  ['hi', 'नमस्ते'], ['el', 'Γεια σου'], ['he', 'שלום'], ['sv', 'Hej'], ['pl', 'Cześć'], ['nl', 'Hoi'],
  ['fa', 'سلام'], ['vi', 'Xin chào'], ['th', 'สวัสดี'], ['id', 'Halo'], ['sw', 'Jambo'], ['uk', 'Привіт'],
  ['lv', 'Sveiki'],
];
const RTL = new Set(['ar', 'he', 'fa']);

// Pays (ISO 3166) → langue de la première salutation.
const COUNTRY_LANG = {
  FR: 'fr', BE: 'fr', CH: 'fr', LU: 'fr', MC: 'fr', SN: 'fr', CI: 'fr', CM: 'fr', ML: 'fr', BF: 'fr', NE: 'fr',
  TG: 'fr', BJ: 'fr', GA: 'fr', CD: 'fr', CG: 'fr', MG: 'fr', HT: 'fr',
  JO: 'ar', SA: 'ar', EG: 'ar', AE: 'ar', LB: 'ar', SY: 'ar', IQ: 'ar', KW: 'ar', QA: 'ar', BH: 'ar', OM: 'ar',
  YE: 'ar', PS: 'ar', LY: 'ar', SD: 'ar', MA: 'ar', DZ: 'ar', TN: 'ar', MR: 'ar',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es', GT: 'es', CU: 'es', BO: 'es',
  DO: 'es', HN: 'es', PY: 'es', SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es', GQ: 'es',
  PT: 'pt', BR: 'pt', AO: 'pt', MZ: 'pt', CV: 'pt',
  DE: 'de', AT: 'de', LI: 'de', IT: 'it', SM: 'it', RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru', UA: 'uk',
  CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh', SG: 'zh', JP: 'ja', KR: 'ko', TR: 'tr', IN: 'hi', GR: 'el', CY: 'el',
  IL: 'he', IR: 'fa', AF: 'fa', PL: 'pl', SE: 'sv', NL: 'nl', VN: 'vi', TH: 'th', ID: 'id', KE: 'sw', TZ: 'sw',
  LV: 'lv',
};

const STEP_MS = 1800;

async function firstLanguage() {
  const fallback = (navigator.language || 'en').slice(0, 2).toLowerCase();
  if (IS_LOCAL) return fallback;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch('api/hello', { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(timer);
    const { country } = await res.json();
    return COUNTRY_LANG[country] || (country ? 'en' : fallback);
  } catch {
    return fallback; // hors connexion ou lent : langue du téléphone
  }
}

function ordered(first) {
  const start = GREETINGS.find(([lang]) => lang === first) || GREETINGS[0];
  return [start, ...GREETINGS.filter((g) => g !== start)];
}

// Affiche l'écran par-dessus toute l'app ; appelle onDone après le toucher.
export async function showHello({ onDone }) {
  const el = document.createElement('div');
  el.className = 'hello';
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', t('hello.tap'));
  el.innerHTML = `
    <div class="hello-stage" aria-hidden="true"></div>
    <p class="hello-tap">${t('hello.tap')}</p>
    <p class="hello-brand">SHADOWING STUDIO</p>`;
  document.body.append(el);
  document.body.classList.add('hello-open');
  el.focus();

  const stage = el.querySelector('.hello-stage');
  const list = ordered(await firstLanguage());
  let i = 0;
  let current = null;

  const show = () => {
    const [lang, word] = list[i % list.length];
    const next = document.createElement('span');
    next.className = 'hello-word entering';
    next.lang = lang;
    next.dir = RTL.has(lang) ? 'rtl' : 'ltr';
    next.textContent = word;
    stage.append(next);
    next.getBoundingClientRect(); // force le point de départ de l'animation
    next.classList.remove('entering');
    if (current) {
      const old = current;
      old.classList.add('leaving');
      setTimeout(() => old.remove(), 900);
    }
    current = next;
    i++;
  };
  show();
  const timer = setInterval(show, STEP_MS);
  setTimeout(() => el.classList.add('show-tap'), 1600);

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearInterval(timer);
    el.classList.add('closing');
    setTimeout(() => {
      el.remove();
      document.body.classList.remove('hello-open');
      onDone();
    }, 450);
  };
  el.addEventListener('click', finish);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      finish();
    }
  });
}
