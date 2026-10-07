// Bibliothèque : mes listes de phrases, export / import.

import { t, getLocale } from '../i18n.js';
import { esc } from '../dom.js';
import { load } from '../storage.js';
import { practiceLanguages } from '../audio/catalog.js';
import { defaultTag } from '../audio/catalog.js';
import {
  initLibrary, allLists, currentList, setCurrent, createList, updateList,
  duplicateList, deleteList, exportBlob, importData,
} from '../library.js';

let notice = ''; // message après import/export

export function renderLibrary(root) {
  initLibrary({ defaultTag: defaultTag(load('profile', {})), defaultName: t('library.firstName') });
  const lists = allLists();
  const current = currentList();
  const labels = Object.fromEntries(practiceLanguages(getLocale()).map((l) => [l.tag, l.label]));
  const date = new Intl.DateTimeFormat(getLocale(), { day: 'numeric', month: 'short' });

  root.innerHTML = `<div class="library">
    <p class="back"><a href="#/"><span class="arrow" aria-hidden="true">←</span> ${t('library.backToStudio')}</a></p>
    <p class="eyebrow">${t('library.eyebrow')}</p>
    <h1 class="studio-title">${t('library.myLists')}</h1>

    <button type="button" class="btn btn-primary btn-block" data-action="new">+ ${t('library.new')}</button>

    <ul class="lists">
      ${lists.map((l) => {
        const n = l.text.split('\n').filter((x) => x.trim()).length;
        return `
        <li class="card list-card ${l.id === current.id ? 'is-current' : ''}">
          <button type="button" class="list-open" data-action="open" data-id="${l.id}">
            <span class="list-name">${esc(l.name)}</span>
            ${l.id === current.id ? `<span class="badge">${t('library.current')}</span>` : ''}
            <span class="list-meta">${esc(labels[l.tag] || l.tag)} · ${n === 1 ? t('studio.countOne') : t('studio.countMany', { n })} · ${date.format(new Date(l.updatedAt))}</span>
          </button>
          <div class="list-actions">
            <button type="button" class="btn-link btn-link-sm" data-action="rename" data-id="${l.id}">${t('library.rename')}</button>
            <button type="button" class="btn-link btn-link-sm" data-action="duplicate" data-id="${l.id}">${t('library.duplicate')}</button>
            <button type="button" class="btn-link btn-link-sm danger" data-action="delete" data-id="${l.id}">${t('library.delete')}</button>
          </div>
        </li>`;
      }).join('')}
    </ul>

    <section class="card">
      <p class="label">${t('library.backupTitle')}</p>
      <p class="hint" style="margin:0 0 14px">${t('library.backupHint')}</p>
      <div class="paste-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-action="export">⬇ ${t('library.export')}</button>
        <label class="btn btn-ghost btn-sm file-btn">⬆ ${t('library.import')}
          <input type="file" accept="application/json,.json" id="l-import" hidden>
        </label>
      </div>
      ${notice ? `<p class="hint" role="status" style="margin-top:12px">${notice}</p>` : ''}
    </section>
  </div>`;

  const rerender = () => renderLibrary(root);

  root.querySelector('.library').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    notice = '';

    switch (btn.dataset.action) {
      case 'open':
        setCurrent(id);
        location.hash = '#/';
        break;
      case 'new': {
        const name = prompt(t('library.newPrompt'), t('library.defaultName', { n: lists.length + 1 }));
        if (name === null) return;
        createList({ name: name.trim() || t('library.defaultName', { n: lists.length + 1 }) });
        location.hash = '#/';
        break;
      }
      case 'rename': {
        const list = lists.find((l) => l.id === id);
        const name = prompt(t('library.renamePrompt'), list.name);
        if (name === null || !name.trim()) return;
        updateList(id, { name: name.trim().slice(0, 80) });
        rerender();
        break;
      }
      case 'duplicate':
        duplicateList(id, t('library.copySuffix'));
        rerender();
        break;
      case 'delete': {
        const list = lists.find((l) => l.id === id);
        if (!confirm(t('library.deleteConfirm', { name: list.name }))) return;
        deleteList(id, t('library.defaultName', { n: 1 }));
        rerender();
        break;
      }
      case 'export': {
        const url = URL.createObjectURL(exportBlob());
        const a = Object.assign(document.createElement('a'), {
          href: url,
          download: `shadowing-studio-listes-${new Date().toISOString().slice(0, 10)}.json`,
        });
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        notice = t('library.exported');
        rerender();
        break;
      }
    }
  });

  root.querySelector('#l-import').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const r = importData(await file.text());
      notice = t('library.imported', { added: r.added, updated: r.updated, skipped: r.skipped });
    } catch {
      notice = t('library.importError');
    }
    rerender();
  });
}
