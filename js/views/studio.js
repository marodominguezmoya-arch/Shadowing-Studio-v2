// Studio de shadowing : phrases, langue, réglages → séance audio (voix locale Piper)
// ou lecture en direct (voix du navigateur) quand aucune voix locale n'existe.

import { t, getLocale } from '../i18n.js';
import { load, save } from '../storage.js';
import { initLibrary, currentList, updateList, allLists } from '../library.js';
import { splitSentences } from '../split.js';
import { translationCode, translateTexts } from '../translate.js';
import { installMode, promptInstall, dismissInstall, onInstallChange } from '../install.js';
import { esc } from '../dom.js';
import { practiceLanguages, findLanguage, defaultTag } from '../audio/catalog.js';
import { isVoiceCached, loadVoice, deleteVoice, synthesize, phonemesOf } from '../audio/piper.js';
import { TRANSCRIPTION_TARGETS, espeakVoiceFor, ipaToSpelling, STRESS_ON, STRESS_OFF } from '../phonetic.js';
import { buildSession, encodeWav, timelineIndexAt } from '../audio/session.js';
import { playLive, findVoice, webSpeechSupported } from '../audio/webspeech.js';

const MAX_PHRASES = 40;
const MAX_CHARS = 400;
const PAUSES = ['auto', '2', '3', '5', '8'];
const SYNTH_BATCH = 4;

const profile = load('profile', {});
// « prefs » = la liste courante de la bibliothèque (objet modifié en place puis sauvegardé).
let prefs = null;

// Prononciation et traduction : interrupteurs globaux, éteints par défaut (la traduction envoie les
// phrases à Cloudflare). Langue utilisée : la langue maternelle si possible, sinon celle de l'interface.
let phonOn = load('phoneticOn', null) ?? (load('phonetic', 'none') !== 'none');
let translateOn = load('translateOn', null) ?? (load('translateTo', 'none') !== 'none');
// Changer cette valeur fait retraduire automatiquement les listes (ex. changement de modèle).
const TRANSLATION_VERSION = 'llm-1';
const phonCache = new Map(); // « espeak|cible|texte » → HTML
let phonPending = false;


// État d'exécution (survit aux re-rendus : changement de langue d'interface, etc.).
const rt = {
  voice: 'unknown', // unknown | cached | missing | downloading | browser | none
  progress: 0,
  busy: false,
  status: '',
  error: '',
  session: null, // { url, timeline, phrases, duration, mb, sig, tag, listId }
  pasteOpen: false,
  pastePreview: null, // phrases découpées en attente de validation
  revealPhon: false, // prononciation de la phrase en cours affichée ?
  revealTrans: false, // traduction de la phrase en cours affichée ?
  translateBusy: false,
  translateError: '',
  live: null, // { stop, step }
};
const pcmCache = new Map();

// Un seul lecteur audio pour toute l'app : la lecture continue écran verrouillé.
const audio = new Audio();
audio.preload = 'auto';

let root = null;

export function renderStudio(el) {
  root = el;
  initLibrary({ defaultTag: defaultTag(profile), defaultName: t('library.firstName') });
  prefs = currentList();
  if (!findLanguage(prefs.tag)) prefs.tag = defaultTag(profile);
  const langs = practiceLanguages(getLocale());
  const count = allLists().length;

  root.innerHTML = `<div class="studio">
    <p class="eyebrow">${t('studio.eyebrow')}${profile.firstName ? ` · ${t('studio.greeting', { name: esc(profile.firstName) })}` : ''}</p>
    <div class="list-head">
      <h1 class="studio-title">${esc(prefs.name)}</h1>
      <a class="btn btn-ghost btn-sm" href="#/listes">${t('library.myLists')} (${count})</a>
    </div>

    <section class="card">
      <label class="label" for="s-lang">${t('studio.language')}</label>
      <select class="select" id="s-lang">
        ${langs.map((l) => `<option value="${l.tag}" ${l.tag === prefs.tag ? 'selected' : ''}>${esc(l.label)}${l.piper ? ' ★' : ''}</option>`).join('')}
      </select>
      <div id="s-voice" class="voice-box" aria-live="polite"></div>
    </section>

    <section class="card">
      <label class="label" for="s-text">${t('studio.phrases')}</label>
      <textarea class="input textarea" id="s-text" rows="6" placeholder="${esc(t('studio.phrasesPlaceholder'))}" spellcheck="true">${esc(prefs.text)}</textarea>
      <p class="hint"><span id="s-count"></span> · ${t('studio.phrasesHint')}</p>
      <button type="button" class="btn-link" data-action="paste-toggle">${t('paste.open')}</button>
      <div id="s-paste"></div>
    </section>

    <section class="card">
      <p class="label">${t('studio.settings')}</p>
      <div class="setting">
        <span id="l-reps">${t('studio.reps')}</span>
        <div class="stepper" role="group" aria-labelledby="l-reps">
          <button type="button" data-step="-1" aria-label="${t('studio.less')}">−</button>
          <output id="s-reps">${prefs.reps}</output>
          <button type="button" data-step="1" aria-label="${t('studio.more')}">+</button>
        </div>
      </div>
      <div class="setting">
        <label for="s-pause">${t('studio.pause')}</label>
        <select class="select select-sm" id="s-pause">
          ${PAUSES.map((p) => `<option value="${p}" ${String(prefs.pause) === p ? 'selected' : ''}>${p === 'auto' ? t('studio.pauseAuto') : t('studio.seconds', { n: p })}</option>`).join('')}
        </select>
      </div>
      <div class="setting setting-col">
        <label for="s-speed">${t('studio.speed')} <output id="s-speed-val">${prefs.speed} %</output></label>
        <input type="range" id="s-speed" min="50" max="150" step="5" value="${prefs.speed}">
      </div>
      <div class="setting">
        <label for="s-phon">${t('studio.phoneticToggle', { lang: languageLabel(phonTarget()) })}</label>
        <input type="checkbox" role="switch" class="switch" id="s-phon" ${phonOn ? 'checked' : ''}>
      </div>
      <p class="hint" id="s-phon-hint"></p>
      <div class="setting">
        <label for="s-trans">${t('studio.translateToggle', { lang: languageLabel(translateTarget() || getLocale()) })}</label>
        <input type="checkbox" role="switch" class="switch" id="s-trans" ${translateOn ? 'checked' : ''}>
      </div>
      <p class="hint" id="s-trans-hint"></p>
    </section>

    <div id="s-action"></div>
    <div id="s-player"></div>
    <div id="s-install"></div>

  </div>`;

  bind();
  updateCount();
  updatePhoneticHint();
  updateTranslateHint();
  renderPaste();
  refreshVoice();
  renderAction();
  renderPlayer();
  renderInstall();
}

function renderInstall() {
  const box = root?.querySelector('#s-install');
  if (!box) return;
  const mode = installMode();
  box.innerHTML = mode
    ? `<section class="card install">
         <p class="label">${t('install.title')}</p>
         <p class="hint" style="margin:0 0 12px">${mode === 'ios' ? t('install.ios') : t('install.text')}</p>
         <div class="paste-actions">
           ${mode === 'prompt' ? `<button type="button" class="btn btn-primary btn-sm" data-action="install">${t('install.button')}</button>` : ''}
           <button type="button" class="btn-link btn-link-sm" data-action="install-dismiss">${t('install.dismiss')}</button>
         </div>
       </section>`
    : '';
}
onInstallChange(() => renderInstall());

// ---------------------------------------------------------------------------
// Données
// ---------------------------------------------------------------------------

function persist() {
  updateList(prefs.id, {});
}

function phrases() {
  return prefs.text.split('\n').map((s) => s.trim()).filter(Boolean);
}

function signature() {
  return JSON.stringify([prefs.tag, phrases(), prefs.reps, prefs.pause, prefs.speed]);
}

function currentLang() {
  return findLanguage(prefs.tag);
}

function validate(list) {
  if (!list.length) return t('studio.errors.noPhrases');
  if (list.length > MAX_PHRASES) return t('studio.errors.tooMany', { max: MAX_PHRASES });
  const long = list.findIndex((p) => p.length > MAX_CHARS);
  if (long >= 0) return t('studio.errors.tooLong', { n: long + 1, max: MAX_CHARS });
  return '';
}

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

function bind() {
  const $ = (sel) => root.querySelector(sel);

  $('#s-lang').addEventListener('change', (e) => {
    prefs.tag = e.target.value;
    persist();
    stopLive();
    updatePhoneticHint();
    updateTranslateHint();
    rt.error = '';
    refreshVoice();
    renderAction();
    renderPlayer();
  });

  $('#s-text').addEventListener('input', (e) => {
    prefs.text = e.target.value;
    persist();
    updateCount();
    onSettingsChanged();
  });

  root.querySelector('.stepper').addEventListener('click', (e) => {
    const step = Number(e.target.closest('[data-step]')?.dataset.step);
    if (!step) return;
    prefs.reps = Math.min(10, Math.max(1, prefs.reps + step));
    $('#s-reps').textContent = prefs.reps;
    persist();
    onSettingsChanged();
  });

  $('#s-pause').addEventListener('change', (e) => {
    prefs.pause = e.target.value;
    persist();
    onSettingsChanged();
  });

  $('#s-trans').addEventListener('change', (e) => {
    translateOn = e.target.checked;
    save('translateOn', translateOn);
    rt.translateError = '';
    updateTranslateHint();
    if (translateOn) ensureTranslations(rt.live?.phrases || rt.session?.phrases || phrases());
    renderReveals();
  });

  $('#s-phon').addEventListener('change', (e) => {
    phonOn = e.target.checked;
    save('phoneticOn', phonOn);
    updatePhoneticHint();
    renderReveals();
  });

  $('#s-speed').addEventListener('input', (e) => {
    prefs.speed = Number(e.target.value);
    $('#s-speed-val').textContent = `${prefs.speed} %`;
    persist();
    onSettingsChanged();
  });

  // Sur le conteneur recréé à chaque rendu (pas sur root) : pas d'écouteurs empilés.
  root.querySelector('.studio').addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    ({
      create: createSession,
      listen: startLive,
      stop: stopLive,
      download: downloadVoiceOnly,
      'delete-voice': removeVoice,
      toggle: togglePlay,
      prev: () => jump(-1),
      next: () => jump(1),
      'reveal-trans': () => {
        rt.revealTrans = !rt.revealTrans;
        renderReveals();
      },
      'reveal-phon': () => {
        rt.revealPhon = !rt.revealPhon;
        renderReveals();
      },
      'paste-toggle': () => {
        rt.pasteOpen = !rt.pasteOpen;
        rt.pastePreview = null;
        renderPaste();
      },
      'paste-split': splitPasted,
      install: promptInstall,
      'install-dismiss': dismissInstall,
      'paste-add': () => applyPaste(false),
      'paste-replace': () => applyPaste(true),
    })[action]?.();
  });
}

function onSettingsChanged() {
  if (rt.error) {
    rt.error = '';
    renderAction();
  }
  renderPlayer(); // affiche « séance à recréer » si besoin
}

function updateCount() {
  const n = phrases().length;
  root.querySelector('#s-count').textContent = n === 1 ? t('studio.countOne') : t('studio.countMany', { n });
}

// ---------------------------------------------------------------------------
// Prononciation écrite et traduction (cachées, révélées au toucher)
// ---------------------------------------------------------------------------

function languageLabel(code) {
  try {
    return new Intl.DisplayNames([getLocale()], { type: 'language' }).of(code) || code;
  } catch {
    return code;
  }
}

// Alphabet de la prononciation : langue maternelle si c'est une langue lectrice, sinon l'interface.
function phonTarget() {
  return [profile.native, getLocale()].find((c) => TRANSCRIPTION_TARGETS.includes(c)) || 'en';
}

// Langue de traduction : maternelle, sinon interface — mais jamais la langue pratiquée.
function translateTarget() {
  const practised = translationCode(prefs.tag);
  return [profile.native, getLocale()].map((c) => translationCode(c || '')).find((c) => c && c !== practised) || null;
}

function updatePhoneticHint() {
  const el = root?.querySelector('#s-phon-hint');
  if (!el) return;
  el.textContent = !phonOn ? '' : espeakVoiceFor(prefs.tag) ? t('studio.phoneticHint') : t('studio.phoneticUnavailable');
}

const phonKey = (espeak, target, text) => `${espeak}|${target}|${text}`;

// HTML de la prononciation d'une phrase ('' si désactivée / indisponible, « … » si en calcul).
function phoneticHtml(text) {
  const espeak = espeakVoiceFor(prefs.tag);
  if (!phonOn || !espeak || !text) return '';
  const cached = phonCache.get(phonKey(espeak, phonTarget(), text));
  if (cached === undefined) {
    requestPhonetics();
    return '…';
  }
  return cached;
}

async function requestPhonetics() {
  const espeak = espeakVoiceFor(prefs.tag);
  const target = phonTarget();
  if (phonPending || !phonOn || !espeak) return;
  const list = rt.live?.phrases || rt.session?.phrases || phrases();
  const todo = [...new Set(list.filter((x) => !phonCache.has(phonKey(espeak, target, x))))];
  if (!todo.length) return;
  phonPending = true;
  try {
    const ipas = await phonemesOf(todo, espeak);
    todo.forEach((x, i) => {
      const html = esc(ipaToSpelling(ipas[i], target)).replaceAll(STRESS_ON, '<strong>').replaceAll(STRESS_OFF, '</strong>');
      phonCache.set(phonKey(espeak, target, x), html);
    });
  } catch (err) {
    console.warn('[phonetic]', err);
    todo.forEach((x) => phonCache.set(phonKey(espeak, target, x), ''));
  } finally {
    phonPending = false;
  }
  renderReveals();
}

function translationPair() {
  if (!translateOn) return null;
  const target = translateTarget();
  return translationCode(prefs.tag) && target ? { source: prefs.tag, target } : null; // étiquette complète : dialecte
}

function updateTranslateHint() {
  const el = root?.querySelector('#s-trans-hint');
  if (!el) return;
  el.textContent = !translateOn ? '' : translationPair() ? t('studio.translateHint') : t('studio.translateSame');
}

function translationFor(text) {
  const pair = translationPair();
  return pair ? prefs.translations?.[pair.target]?.[text] || '' : '';
}

// Traduit les phrases sans traduction ; retraduit tout si les traductions de la liste datent
// d'un ancien modèle (TRANSLATION_VERSION).
async function ensureTranslations(list) {
  const pair = translationPair();
  if (!pair) return;
  const stale = prefs.translationsVersion !== TRANSLATION_VERSION;
  if (stale) prefs.translations = {};
  prefs.translations ||= {};
  const map = (prefs.translations[pair.target] ||= {});
  const todo = [...new Set(list.filter((x) => !map[x]))].slice(0, 40);
  if (!todo.length) return;
  rt.translateBusy = true;
  rt.translateError = '';
  renderReveals();
  try {
    const out = await translateTexts(todo, pair.source, pair.target);
    todo.forEach((x, i) => {
      if (out[i]) map[x] = out[i];
    });
    prefs.translationsVersion = TRANSLATION_VERSION;
    persist();
  } catch (err) {
    console.warn('[translate]', err);
    rt.translateError = navigator.onLine === false ? t('studio.translateOffline') : t('studio.translateError');
  } finally {
    rt.translateBusy = false;
    renderReveals();
  }
}

// Boutons « Voir la prononciation » / « Voir la traduction » sous la phrase en cours.
function revealsHtml(text) {
  if (!text) return '';
  const parts = [];

  if (phonOn && espeakVoiceFor(prefs.tag)) {
    const html = phoneticHtml(text);
    const target = phonTarget();
    parts.push(rt.revealPhon && html
      ? `<button type="button" class="phonetic revealed" data-action="reveal-phon" lang="${target}" dir="${target === 'ar' ? 'rtl' : 'ltr'}" aria-label="${t('studio.hidePhonetic')}">${html}</button>`
      : `<button type="button" class="reveal" data-action="reveal-phon" aria-expanded="false">${t('studio.revealPhonetic')}</button>`);
  }

  const pair = translationPair();
  if (pair) {
    const tr = translationFor(text);
    if (tr) {
      parts.push(rt.revealTrans
        ? `<button type="button" class="translation revealed" data-action="reveal-trans" lang="${pair.target}" dir="auto" aria-label="${t('studio.hideTranslation')}">${esc(tr)}</button>`
        : `<button type="button" class="reveal" data-action="reveal-trans" aria-expanded="false">${t('studio.reveal')}</button>`);
    } else if (rt.translateBusy) parts.push(`<p class="hint">${t('studio.translating')}</p>`);
    else if (rt.translateError) parts.push(`<p class="hint">${rt.translateError}</p>`);
  }
  return parts.join('');
}

function renderReveals() {
  if (rt.live) return renderPlayer();
  const box = root?.querySelector('#p-reveals');
  const s = rt.session;
  if (!box || !s) return;
  const i = Math.max(0, timelineIndexAt(s.timeline, audio.currentTime));
  box.innerHTML = revealsHtml(s.phrases[s.timeline[i].phrase]);
}

// ---------------------------------------------------------------------------
// Coller un texte long → phrases
// ---------------------------------------------------------------------------

function renderPaste() {
  const box = root?.querySelector('#s-paste');
  if (!box) return;
  if (!rt.pasteOpen) {
    box.innerHTML = '';
    return;
  }
  const preview = rt.pastePreview;
  box.innerHTML = `
    <div class="paste">
      <label class="visually-hidden" for="s-paste-text">${t('paste.label')}</label>
      <textarea class="input textarea" id="s-paste-text" rows="5" placeholder="${esc(t('paste.placeholder'))}"></textarea>
      <button type="button" class="btn btn-ghost btn-sm" data-action="paste-split">${t('paste.split')}</button>
      ${preview ? `
        <p class="hint">${preview.length === 1 ? t('studio.countOne') : t('studio.countMany', { n: preview.length })}</p>
        <ol class="paste-preview" lang="${prefs.tag}">${preview.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
        <div class="paste-actions">
          <button type="button" class="btn btn-primary btn-sm" data-action="paste-add">${t('paste.add')}</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="paste-replace">${t('paste.replace')}</button>
        </div>` : ''}
    </div>
  `;
  if (!preview) box.querySelector('#s-paste-text').focus();
}

function splitPasted() {
  const text = root.querySelector('#s-paste-text').value;
  const list = splitSentences(text, prefs.tag);
  rt.pastePreview = list.length ? list : null;
  renderPaste();
  if (rt.pastePreview) root.querySelector('#s-paste-text').value = text;
}

function applyPaste(replace) {
  const added = rt.pastePreview || [];
  const lines = replace ? added : [...phrases(), ...added];
  prefs.text = lines.join('\n');
  persist();
  root.querySelector('#s-text').value = prefs.text;
  rt.pasteOpen = false;
  rt.pastePreview = null;
  renderPaste();
  updateCount();
  onSettingsChanged();
}

// ---------------------------------------------------------------------------
// Voix
// ---------------------------------------------------------------------------

async function refreshVoice() {
  const lang = currentLang();
  if (!lang.piper) {
    rt.voice = webSpeechSupported() && (await findVoice(lang.tag)) ? 'browser' : 'none';
  } else if (rt.voice !== 'downloading') {
    rt.voice = 'unknown';
    renderVoice();
    try {
      rt.voice = (await isVoiceCached(lang.piper)) ? 'cached' : 'missing';
    } catch {
      rt.voice = 'missing';
    }
  }
  if (currentLang() === lang) {
    renderVoice();
    renderAction();
  }
}

function renderVoice() {
  const box = root?.querySelector('#s-voice');
  if (!box) return;
  const lang = currentLang();
  const mb = lang.piper?.mb;

  box.innerHTML = {
    unknown: '<p class="voice-line faint">…</p>',
    cached: `<p class="voice-line ok">✓ ${t('studio.voiceReady')}
               <button type="button" class="btn-link btn-link-sm" data-action="delete-voice">${t('studio.deleteVoice')}</button></p>`,
    missing: `<p class="voice-line">${t('studio.voiceToDownload', { mb })}</p>
              <button type="button" class="btn btn-ghost btn-sm" data-action="download" ${rt.busy ? 'disabled' : ''}>${t('studio.download')}</button>`,
    downloading: `<p class="voice-line">${t('studio.downloading', { pct: rt.progress })}</p>
                  <div class="bar"><span style="width:${rt.progress}%"></span></div>`,
    browser: `<p class="voice-line faint">${t('studio.voiceBrowser')}</p>`,
    none: `<p class="voice-line warn">${t('studio.noBrowserVoice')}</p>`,
  }[rt.voice];
}

async function ensureVoiceLoaded() {
  const lang = currentLang();
  const wasCached = rt.voice === 'cached';
  if (!wasCached) {
    rt.voice = 'downloading';
    rt.progress = 0;
    renderVoice();
  }
  try {
    await loadVoice(lang.piper, (p) => {
      const pct = Math.min(100, Math.round((p.loaded / p.total) * 100));
      if (pct <= rt.progress) return; // progression monotone
      rt.progress = pct;
      if (rt.voice === 'downloading') renderVoice();
      else setStatus(t('studio.loadingVoice', { pct }));
    });
    rt.voice = 'cached';
  } catch (err) {
    rt.voice = 'missing';
    throw Object.assign(err, { kind: err.stage === 'download' ? 'download' : 'engine' });
  } finally {
    if (currentLang() === lang) renderVoice();
  }
}

async function downloadVoiceOnly() {
  if (rt.busy) return;
  rt.busy = true;
  rt.error = '';
  renderAction();
  try {
    await ensureVoiceLoaded();
  } catch (err) {
    rt.error = errorMessage(err);
  }
  rt.busy = false;
  renderAction();
}

async function removeVoice() {
  const lang = currentLang();
  await deleteVoice(lang.piper);
  for (const key of pcmCache.keys()) if (key.startsWith(lang.piper.key + '|')) pcmCache.delete(key);
  rt.voice = 'missing';
  renderVoice();
}

// ---------------------------------------------------------------------------
// Création de séance (voix locale)
// ---------------------------------------------------------------------------

function setStatus(text) {
  rt.status = text;
  const el = root?.querySelector('#s-status');
  if (el) el.textContent = text;
}

async function createSession() {
  const list = phrases();
  rt.error = validate(list);
  if (rt.error || rt.busy) return renderAction();

  const lang = currentLang();
  const sig = signature();
  const speed = prefs.speed / 100;
  rt.busy = true;
  setStatus('');
  renderAction();

  const translations = ensureTranslations(list); // en parallèle, sans bloquer la séance
  try {
    await ensureVoiceLoaded();

    const key = (text) => `${lang.piper.key}|${speed}|${text}`;
    const todo = [...new Set(list.filter((p) => !pcmCache.has(key(p))))];
    let sampleRate = pcmCache.get('sr:' + lang.piper.key);
    for (let i = 0; i < todo.length; i += SYNTH_BATCH) {
      setStatus(t('studio.creating', { n: Math.min(i + SYNTH_BATCH, todo.length), total: todo.length }));
      const batch = todo.slice(i, i + SYNTH_BATCH);
      let res;
      try {
        res = await synthesize(batch, speed);
      } catch (err) {
        throw Object.assign(err, { kind: 'synth' });
      }
      sampleRate = res.sampleRate;
      pcmCache.set('sr:' + lang.piper.key, sampleRate);
      batch.forEach((text, j) => pcmCache.set(key(text), res.pcms[j]));
    }

    const built = buildSession({
      pcms: list.map((p) => pcmCache.get(key(p))),
      sampleRate,
      reps: prefs.reps,
      pause: prefs.pause,
    });
    const wav = encodeWav(built.samples, built.sampleRate);

    if (rt.session) URL.revokeObjectURL(rt.session.url);
    rt.session = {
      url: URL.createObjectURL(wav),
      timeline: built.timeline,
      phrases: list,
      duration: built.duration,
      mb: (wav.size / 1e6).toFixed(1),
      sig,
      tag: lang.tag,
      listId: prefs.id,
      label: practiceLanguages(getLocale()).find((l) => l.tag === lang.tag)?.label || lang.tag,
    };
    audio.src = rt.session.url;
    rt.revealPhon = rt.revealTrans = false;
    rt.busy = false;
    setStatus('');
    renderAction();
    renderPlayer();
    audio.play().catch(() => {}); // peut être bloqué si le geste utilisateur a expiré
    translations.then(() => renderReveals());
  } catch (err) {
    console.error('[studio]', err);
    rt.busy = false;
    rt.error = errorMessage(err);
    setStatus('');
    renderAction();
  }
}

// Message lisible + détail technique (à transmettre en cas de problème).
function errorMessage(err) {
  const main =
    err.kind === 'download' ? t('studio.errors.download')
    : err.kind === 'engine' || err.stage === 'crash' || err.stage === 'init' ? t('studio.errors.engine')
    : t('studio.errors.synth');
  const detail = `${err.stage || err.kind || '?'} — ${err.message || err}`.slice(0, 240);
  return `${main}<br><small class="err-detail">${t('studio.errors.detail')} : ${esc(detail)}</small>`;
}

// ---------------------------------------------------------------------------
// Lecture en direct (voix du navigateur)
// ---------------------------------------------------------------------------

function startLive() {
  const list = phrases();
  rt.error = validate(list);
  if (rt.error) return renderAction();

  audio.pause();
  const live = playLive({
    phrases: list,
    tag: prefs.tag,
    reps: prefs.reps,
    pause: prefs.pause,
    speed: prefs.speed / 100,
    onStep: (step) => {
      if (live.step?.phrase !== step.phrase) rt.revealPhon = rt.revealTrans = false;
      live.step = step;
      renderPlayer();
    },
  });
  rt.live = Object.assign(live, { phrases: list, step: null });
  ensureTranslations(list);
  live.done
    .catch(() => {
      rt.error = t('studio.errors.browserVoice');
    })
    .finally(() => {
      if (rt.live === live) rt.live = null;
      renderAction();
      renderPlayer();
    });
  renderAction();
}

function stopLive() {
  if (!rt.live) return;
  rt.live.stop();
  rt.live = null;
  renderAction();
  renderPlayer();
}

// ---------------------------------------------------------------------------
// Bouton principal
// ---------------------------------------------------------------------------

function renderAction() {
  const box = root?.querySelector('#s-action');
  if (!box) return;
  const lang = currentLang();
  let button;

  if (rt.live) {
    button = `<button type="button" class="btn btn-primary btn-block" data-action="stop">■ ${t('studio.stop')}</button>`;
  } else if (!lang.piper) {
    button = `<button type="button" class="btn btn-primary btn-block" data-action="listen" ${rt.voice === 'none' ? 'disabled' : ''}>▶ ${t('studio.listen')}</button>`;
  } else {
    button = `<button type="button" class="btn btn-primary btn-block" data-action="create" ${rt.busy ? 'disabled' : ''}>
      ${rt.busy ? `<span class="spinner" aria-hidden="true"></span>` : ''}${t('studio.create')}</button>`;
  }

  box.innerHTML = `
    ${button}
    <p class="hint center" id="s-status" aria-live="polite">${rt.busy ? esc(rt.status) : ''}</p>
    ${rt.error ? `<p class="alert" role="alert">${rt.error}</p>` : ''}
  `;
}

// ---------------------------------------------------------------------------
// Lecteur
// ---------------------------------------------------------------------------

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function renderPlayer() {
  const box = root?.querySelector('#s-player');
  if (!box) return;

  // Lecture en direct : on affiche seulement la phrase en cours.
  if (rt.live) {
    const step = rt.live.step;
    box.innerHTML = step
      ? `<section class="card player">
           <p class="now-phrase" lang="${prefs.tag}">${esc(rt.live.phrases[step.phrase])}</p>
           <div class="reveal-box">${revealsHtml(rt.live.phrases[step.phrase])}</div>
           <p class="faint center">${t('studio.phraseOf', { n: step.phrase + 1, total: rt.live.phrases.length })} · ${t('studio.repOf', { n: step.rep + 1, total: prefs.reps })}</p>
         </section>`
      : '';
    return;
  }

  const s = rt.session;
  if (!s || s.tag !== prefs.tag || s.listId !== prefs.id) {
    box.innerHTML = '';
    return;
  }

  const outdated = s.sig !== signature();
  const filename = `shadowing-${s.tag}-${new Date().toISOString().slice(0, 10)}.wav`;
  box.innerHTML = `
    <section class="card player ${outdated ? 'is-outdated' : ''}">
      <p class="eyebrow center">${t('studio.playerTitle')}</p>
      ${outdated ? `<p class="hint center warn">${t('studio.outdated')}</p>` : ''}
      <p class="now-phrase" id="p-phrase" lang="${s.tag}"></p>
      <div id="p-reveals" class="reveal-box"></div>
      <p class="faint center" id="p-count"></p>
      <input type="range" class="seek" id="p-seek" min="0" max="${s.duration.toFixed(1)}" step="0.1" value="0" aria-label="Position">
      <p class="times"><span id="p-time">0:00</span><span>${fmt(s.duration)}</span></p>
      <div class="transport">
        <button type="button" class="round" data-action="prev" aria-label="${t('studio.prev')}">⏮</button>
        <button type="button" class="round round-main" data-action="toggle" id="p-toggle"></button>
        <button type="button" class="round" data-action="next" aria-label="${t('studio.next')}">⏭</button>
      </div>
      <a class="btn btn-ghost btn-block" href="${s.url}" download="${filename}">⬇ ${t('studio.downloadWav', { mb: s.mb })}</a>
    </section>
  `;

  box.querySelector('#p-seek').addEventListener('input', (e) => {
    audio.currentTime = Number(e.target.value);
  });
  syncPlayer(true);
}

let lastPhonPhrase = null;

function syncPlayer(forcePhonetic = false) {
  const s = rt.session;
  const box = root?.querySelector('#s-player');
  if (!s || !box || !box.querySelector('#p-phrase')) return;

  const i = Math.max(0, timelineIndexAt(s.timeline, audio.currentTime));
  const entry = s.timeline[i];
  const phrase = s.phrases[entry.phrase];

  box.querySelector('#p-phrase').textContent = phrase;
  // Transcription et traduction : redessinées seulement au changement de phrase (ou sur demande),
  // pas à chaque « timeupdate » — sinon le bouton « Voir la traduction » serait recréé en continu.
  const phraseChanged = phrase !== lastPhonPhrase;
  if (phraseChanged) {
    rt.revealPhon = rt.revealTrans = false; // nouvelle phrase : tout est recaché
    lastPhonPhrase = phrase;
  }
  if (forcePhonetic === true || phraseChanged) {
    box.querySelector('#p-reveals').innerHTML = revealsHtml(phrase);
  }
  box.querySelector('#p-count').textContent =
    `${t('studio.phraseOf', { n: entry.phrase + 1, total: s.phrases.length })} · ${t('studio.repOf', { n: entry.rep + 1, total: prefs.reps })}`;
  const seek = box.querySelector('#p-seek');
  if (document.activeElement !== seek) seek.value = audio.currentTime.toFixed(1);
  box.querySelector('#p-time').textContent = fmt(audio.currentTime);
  const toggle = box.querySelector('#p-toggle');
  toggle.textContent = audio.paused ? '▶' : '❚❚';
  toggle.setAttribute('aria-label', audio.paused ? t('studio.play') : t('studio.pauseBtn'));

  updateMediaSession(phrase);
}

function togglePlay() {
  audio.paused ? audio.play().catch(() => {}) : audio.pause();
}

// Saute au début de la phrase précédente / suivante.
function jump(dir) {
  const s = rt.session;
  if (!s) return;
  const i = Math.max(0, timelineIndexAt(s.timeline, audio.currentTime));
  const phrase = s.timeline[i].phrase + dir;
  const target = s.timeline.find((e) => e.phrase === Math.max(0, phrase));
  // +20 ms : le lecteur peut se placer une fraction avant la cible et rester sur la phrase précédente.
  if (target && phrase < s.phrases.length) audio.currentTime = target.start + 0.02;
}

let lastMediaTitle = '';
function updateMediaSession(phrase) {
  if (!('mediaSession' in navigator) || phrase === lastMediaTitle) return;
  lastMediaTitle = phrase;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: phrase,
    artist: 'Shadowing Studio',
    album: `${t('studio.sessionTitle')} — ${rt.session.label}`,
  });
}

if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  ms.setActionHandler('play', () => audio.play());
  ms.setActionHandler('pause', () => audio.pause());
  ms.setActionHandler('previoustrack', () => jump(-1));
  ms.setActionHandler('nexttrack', () => jump(1));
  try {
    ms.setActionHandler('seekto', (d) => (audio.currentTime = d.seekTime));
  } catch {
    /* non supporté */
  }
}

['timeupdate', 'play', 'pause', 'seeked', 'ended'].forEach((ev) => audio.addEventListener(ev, syncPlayer));
