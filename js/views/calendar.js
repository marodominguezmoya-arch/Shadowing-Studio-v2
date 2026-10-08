// Calendrier de pratique : les jours du mois en cours, à toucher pour cocher ceux où l'on a pratiqué.
// Stocké sur l'appareil (clé « practice » : liste de dates AAAA-MM-JJ).

import { getLocale } from '../i18n.js';
import { load, save } from '../storage.js';

const KEY = 'practice';

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

export function renderCalendar(box) {
  if (!box) return;
  const done = new Set(load(KEY, []));
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  const month = new Intl.DateTimeFormat(getLocale(), { month: 'long' }).format(today);
  const full = new Intl.DateTimeFormat(getLocale(), { weekday: 'long', day: 'numeric', month: 'long' });

  const cells = [];
  for (let d = 1; d <= days; d++) {
    const key = dayKey(y, m, d);
    const on = done.has(key);
    const future = d > today.getDate();
    cells.push(`<button type="button" class="day ${on ? 'is-done' : ''} ${d === today.getDate() ? 'is-today' : ''}"
      data-day="${key}" aria-pressed="${on}" aria-label="${full.format(new Date(y, m, d))}" ${future ? 'disabled' : ''}>${on ? '✓' : d}</button>`);
  }

  box.innerHTML = `<section class="card calendar">
    <p class="label calendar-title">${month.charAt(0).toLocaleUpperCase(getLocale()) + month.slice(1)}</p>
    <div class="days">${cells.join('')}</div>
  </section>`;

  box.querySelector('.days').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-day]');
    if (!btn) return;
    const key = btn.dataset.day;
    if (done.has(key)) done.delete(key);
    else done.add(key);
    save(KEY, [...done].sort());
    renderCalendar(box);
  });
}
