// Plan sur mesure (Premium, en test) : l'élève décrit ses situations à voix haute, le texte est
// transcrit par le Worker (Whisper) et reste modifiable. Écran caché : #/sur-mesure (aucun lien).

import { t } from '../i18n.js';
import { esc } from '../dom.js';
import { load, save } from '../storage.js';

const MAX_SECONDS = 120;
let draft = load('customDraft', '');
let rec = null; // { recorder, stream, chunks, started, timer }
let status = ''; // '' | 'recording' | 'transcribing'
let message = '';

// Format accepté par le navigateur : MP4/AAC sur iPhone, WebM/Opus ailleurs.
function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  return ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
}

export function renderCustom(root) {
  const supported = !!navigator.mediaDevices?.getUserMedia && pickMime() !== null;
  const elapsed = rec ? Math.floor((Date.now() - rec.started) / 1000) : 0;
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
      <button type="button" class="btn btn-primary btn-block" disabled>${t('custom.create')}</button>
      <p class="hint center">${t('custom.soon')}</p>
    </section>
  </div>`;

  const rerender = () => renderCustom(root);
  root.querySelector('#c-text').addEventListener('input', (e) => {
    draft = e.target.value;
    save('customDraft', draft);
  });

  root.querySelector('.custom').addEventListener('click', async (e) => {
    if (!e.target.closest('[data-action="mic"]')) return;
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
