// Écran « Liste partagée » : aperçu d'une liste reçue par lien, puis ajout à la bibliothèque.

import { t, getLocale } from '../i18n.js';
import { esc } from '../dom.js';
import { load, remove } from '../storage.js';
import { practiceLanguages, defaultTag } from '../audio/catalog.js';
import { initLibrary, createList } from '../library.js';
import { decodeShare } from '../share.js';

export async function renderShare(root, payload) {
  remove('pendingShare');
  let list;
  try {
    list = await decodeShare(payload);
  } catch {
    root.innerHTML = `
      <p class="eyebrow">${t('share.eyebrow')}</p>
      <h1 class="studio-title">${t('share.invalidTitle')}</h1>
      <p class="lead">${t('share.invalid')}</p>
      <a class="btn btn-primary btn-block" href="#/">${t('library.backToStudio')}</a>`;
    return;
  }

  const label = practiceLanguages(getLocale()).find((l) => l.tag === list.tag)?.label || list.tag;
  const phrases = list.text.split('\n');

  root.innerHTML = `<div class="share">
    <p class="eyebrow">${t('share.eyebrow')}</p>
    <h1 class="studio-title">${esc(list.name)}</h1>
    <p class="faint">${esc(label)} · ${phrases.length === 1 ? t('studio.countOne') : t('studio.countMany', { n: phrases.length })}</p>
    <section class="card">
      <ol class="paste-preview share-preview" lang="${list.tag}">${phrases.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
    </section>
    <button type="button" class="btn btn-primary btn-block" data-action="add">${t('share.add')}</button>
    <p class="center" style="margin-top:10px"><a href="#/">${t('share.decline')}</a></p>
  </div>`;

  root.querySelector('[data-action="add"]').addEventListener('click', () => {
    initLibrary({ defaultTag: defaultTag(load('profile', {})), defaultName: t('library.firstName') });
    createList(list); // devient la liste en cours
    location.hash = '#/';
  });
}
