// Plan sur mesure (Premium, en test) : l'élève décrit ses situations à voix haute, le texte est
// transcrit par le Worker (Whisper) et reste modifiable. Écran caché : #/sur-mesure (aucun lien).

import { t, getLocale } from '../i18n.js';
import { esc } from '../dom.js';
import { load, save } from '../storage.js';
import { practiceLanguages, defaultTag } from '../audio/catalog.js';
import { initLibrary, currentList } from '../library.js';
import { draftCustomPlan, savePlan } from '../plan.js';

const MAX_SECONDS = 120;
let draft = load('customDraft', '');
let rec = null; // { recorder, stream, chunks, started, timer }
let status = ''; // '' | 'recording' | 'transcribing'
let message = '';
let planStatus = ''; // '' | 'generating' | 'preview' | 'saved'
let preview = null; // { gender, weeks: [{ source, phrases }], tag }

// Format accepté par le navigateur : MP4/AAC sur iPhone, WebM/Opus ailleurs.
function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  return ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
}

export function renderCustom(root) {
  const supported = !!navigator.mediaDevices?.getUserMedia && pickMime() !== null;
  const elapsed = rec ? Math.floor((Date.now() - rec.started) / 1000) : 0;
  initLibrary({ defaultTag: defaultTag(load('profile', {})) });
  const tag = currentList().tag; // langue du plan : celle de la liste en cours
  const langLabel = practiceLanguages(getLocale()).find((l) => l.tag === tag)?.label || tag;
  const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;

  root.innerHTML = `<div class="custom">
    <p class="back"><a href="#/listes"><span class="arrow" aria-hidden="true">←</span> ${t('library.myLists')}</a></p>
    <p class="eyebrow">${t('custom.eyebrow')}</p>
    <h1 class="studio-title">${t('custom.title')}</h1>
    <p class="lead">${t('custom.lead')}</p>

    <section class="card custom-mic">
      ${supported ? `
        <button type="button" class="mic ${status === 'recording' ? 'is-recording' : ''}" data-action="mic"
          ${status === 'transcribing' ? 'disabled' : ''} aria-pressed="${status === 'recording'}">
          <span class="mic-dot" aria-hidden="true"></span>
          ${status === 'recording' ? t('custom.stop') : t('custom.record')}
        </button>
        <p class="hint center" aria-live="polite">${status === 'recording' ? t('custom.recording', { time: clock })
          : status === 'transcribing' ? `<span class="spinner" aria-hidden="true"></span> ${t('custom.transcribing')}` : ''}</p>`
        : `<p class="hint">${t('custom.micUnsupported')}</p>`}
      ${message ? `<p class="alert" role="alert">${message}</p>` : ''}
    </section>

    <section class="card">
      <label class="label" for="c-text">${t('custom.label')}</label>
      <textarea class="input textarea" id="c-text" rows="7" placeholder="${esc(t('custom.placeholder'))}">${esc(draft)}</textarea>
      <p class="hint">${t('custom.hint')}</p>
      <p class="hint">${t('custom.langNote', { lang: esc(langLabel) })}</p>
      <button type="button" class="btn btn-primary btn-block" data-action="generate" ${planStatus === 'generating' || status ? 'disabled' : ''}>
        ${planStatus === 'generating' ? `<span class="spinner" aria-hidden="true"></span> ${t('custom.generating')}` : t('custom.create')}</button>
    </section>

    ${planStatus === 'preview' && preview ? `
      <section class="card custom-preview">
        <p class="label">${t('custom.preview')}</p>
        ${preview.weeks.map((week, w) => `
          <details ${w === 0 ? 'open' : ''}>
            <summary>${t('plan.weekName', { situation: t('custom.planLabel'), n: w + 1, theme: t(`plan.theme${w + 1}`) })}</summary>
            <ol class="preview-list">
              ${week.phrases.map((p, i) => `<li><span lang="${preview.tag}">${esc(p)}</span><small>${esc(week.source[i])}</small></li>`).join('')}
            </ol>
          </details>`).join('')}
        <div class="paste-actions">
          <button type="button" class="btn btn-primary btn-sm" data-action="save-plan">${t('custom.save')}</button>
          <button type="button" class="btn-link btn-link-sm" data-action="discard">${t('custom.redo')}</button>
        </div>
      </section>` : ''}
    ${planStatus === 'saved' ? `<p class="notice-box" role="status">${t('custom.saved')} <a href="#/listes">${t('library.myLists')}</a></p>` : ''}
  </div>`;

  const rerender = () => renderCustom(root);
  root.querySelector('#c-text').addEventListener('input', (e) => {
    draft = e.target.value;
    save('customDraft', draft);
  });

  root.querySelector('.custom').addEventListener('click', async (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'generate') return generate(tag, rerender);
    if (action === 'save-plan' && preview) {
      savePlan({ weeks: preview.weeks, tag: preview.tag, label: t('custom.planLabel'), plan: { custom: true } });
      preview = null;
      planStatus = 'saved';
      return rerender();
    }
    if (action === 'discard') {
      preview = null;
      planStatus = '';
      return rerender();
    }
    if (action !== 'mic') return;
    message = '';
    if (status === 'recording') return stopRecording(rerender);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      rec = { recorder, stream, chunks: [], started: Date.now() };
      recorder.ondataavailable = (ev) => ev.data.size && rec?.chunks.push(ev.data);
      recorder.onstop = () => transcribe(recorder.mimeType || mime || 'audio/webm', rerender);
      recorder.start();
      status = 'recording';
      // Horloge à l'écran, et arrêt automatique au bout de 2 minutes.
      rec.timer = setInterval(() => {
        if (Date.now() - rec.started >= MAX_SECONDS * 1000) stopRecording(rerender);
        else if (location.hash === '#/sur-mesure') rerender();
      }, 1000);
    } catch (err) {
      console.warn('[micro]', err);
      message = t('custom.micDenied');
    }
    rerender();
  });
}

async function generate(tag, rerender) {
  message = '';
  if (draft.trim().length < 20) {
    message = t('custom.tooShort');
    return rerender();
  }
  planStatus = 'generating';
  preview = null;
  rerender();
  try {
    const plan = await draftCustomPlan({ description: draft.trim(), tag });
    preview = { ...plan, tag };
    planStatus = 'preview';
  } catch (err) {
    console.warn('[plan sur mesure]', err);
    message = t('custom.genError');
    planStatus = '';
  }
  if (location.hash === '#/sur-mesure') rerender();
}

function stopRecording(rerender) {
  if (!rec) return;
  clearInterval(rec.timer);
  rec.recorder.stop();
  rec.stream.getTracks().forEach((tr) => tr.stop());
  status = 'transcribing';
  rerender();
}

async function transcribe(mime, rerender) {
  const blob = new Blob(rec.chunks, { type: mime });
  rec = null;
  try {
    const res = await fetch('api/transcribe', { method: 'POST', headers: { 'Content-Type': mime }, body: blob });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { text } = await res.json();
    if (text) draft = draft.trim() ? `${draft.trim()} ${text}` : text;
    save('customDraft', draft);
  } catch (err) {
    console.warn('[dictée]', err);
    message = t('custom.error');
  }
  status = '';
  if (location.hash === '#/sur-mesure') rerender();
}
