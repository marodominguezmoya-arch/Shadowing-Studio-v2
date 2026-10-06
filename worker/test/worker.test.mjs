// Tests du Worker sans réseau : l'API Notion et GitHub Pages sont simulées.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker, { validate, P } from '../src/index.js';

const env = {
  ORIGIN_BASE: 'https://example.github.io/shadowing-studio-v2',
  NOTION_DATABASE_ID: 'db123',
  NOTION_TOKEN: 'secret',
  ALLOWED_ORIGINS: 'https://maromoya.com',
};

const valid = () => ({
  firstName: ' Ana ', lastName: 'López', email: 'Ana@Example.com', occupation: 'Médecin',
  nativeLanguage: 'es', targets: [{ lang: 'en', level: 'B2' }, { lang: 'fr', level: 'A2' }],
  newsletter: true, privacyAccepted: true, uiLocale: 'fr', hp: '',
});

let calls;
let existing;
beforeEach(() => {
  calls = [];
  existing = null;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('/query')) return Response.json({ results: existing ? [existing] : [] });
    if (String(url).startsWith('https://api.notion.com')) return Response.json({ id: 'p1' });
    if (String(url).endsWith('/sub')) return new Response(null, { status: 301, headers: { Location: 'https://example.github.io/shadowing-studio-v2/sub/' } });
    return new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } });
  };
});

const post = (body, origin = 'https://maromoya.com') =>
  worker.fetch(new Request('https://maromoya.com/shadowingstudio/api/onboard', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), env);

test('crée une fiche Notion pour un nouvel email', async () => {
  const res = await post(valid());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, action: 'created' });
  const query = JSON.parse(calls[0].init.body);
  assert.equal(query.filter.email.equals, 'ana@example.com');
  const props = JSON.parse(calls[1].init.body).properties;
  assert.equal(props[P.fullName].title[0].text.content, 'Ana López');
  assert.equal(props[P.native].select.name, 'Espagnol');
  assert.deepEqual(props[P.targets].multi_select.map((o) => o.name), ['Anglais', 'Français']);
  assert.equal(props[P.levels].rich_text[0].text.content, 'Anglais : B2, Français : A2');
  assert.equal(props[P.newsletter].checkbox, true);
  assert.ok(props[P.createdAt]);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer secret');
});

test('met à jour la fiche existante (même email) sans toucher à la date d’inscription', async () => {
  existing = { id: 'page-42' };
  const res = await post(valid());
  assert.deepEqual(await res.json(), { ok: true, action: 'updated' });
  assert.equal(calls[1].init.method, 'PATCH');
  assert.ok(calls[1].url.endsWith('/pages/page-42'));
  assert.equal(JSON.parse(calls[1].init.body).properties[P.createdAt], undefined);
});

test('champ piège rempli : réponse OK mais rien n’est envoyé à Notion', async () => {
  const res = await post({ ...valid(), hp: 'spam' });
  assert.equal(res.status, 200);
  assert.equal(calls.length, 0);
});

test('refuse une autre origine', async () => {
  const res = await post(valid(), 'https://evil.example');
  assert.equal(res.status, 403);
  assert.equal(calls.length, 0);
});

test('refuse les données invalides', () => {
  const cases = [
    [{ email: 'pas-un-email' }, 'email'],
    [{ firstName: '' }, 'firstName'],
    [{ privacyAccepted: false }, 'privacyAccepted'],
    [{ nativeLanguage: 'xx' }, 'nativeLanguage'],
    [{ targets: [] }, 'targets'],
    [{ targets: [{ lang: 'en', level: 'B2' }, { lang: 'en', level: 'C1' }] }, 'targets'],
    [{ targets: [{ lang: 'en', level: 'Z9' }] }, 'targets'],
  ];
  for (const [patch, field] of cases) {
    assert.ok(validate({ ...valid(), ...patch }).errors.includes(field), field);
  }
  assert.deepEqual(validate(valid()).errors, []);
});

test('newsletter absente = non consentie', () => {
  const { newsletter, ...rest } = valid();
  assert.equal(validate(rest).data.newsletter, false);
});

test('erreur Notion → 502', async () => {
  globalThis.fetch = async () => new Response('boom', { status: 500 });
  const res = await post(valid());
  assert.equal(res.status, 502);
});

test('GET sur l’API → 405', async () => {
  const res = await worker.fetch(new Request('https://maromoya.com/shadowingstudio/api/onboard'), env);
  assert.equal(res.status, 405);
});

test('/shadowingstudio redirige vers /shadowingstudio/', async () => {
  const res = await worker.fetch(new Request('https://maromoya.com/shadowingstudio'), env);
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('Location'), 'https://maromoya.com/shadowingstudio/');
});

test('sert l’app depuis GitHub Pages', async () => {
  const res = await worker.fetch(new Request('https://maromoya.com/shadowingstudio/css/app.css?v=2'), env);
  assert.equal(await res.text(), '<html>app</html>');
  assert.equal(calls[0].url, 'https://example.github.io/shadowing-studio-v2/css/app.css?v=2');
});

test('réécrit les redirections GitHub vers maromoya.com', async () => {
  const res = await worker.fetch(new Request('https://maromoya.com/shadowingstudio/sub'), env);
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('Location'), '/shadowingstudio/sub/');
});
