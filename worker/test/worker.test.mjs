// Tests du Worker sans réseau : l'API Notion et GitHub Pages sont simulées.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker, { validate, validateTranslate, parseTranslations, P, icpScore, isHot, emailDomainStatus } from '../src/index.js';

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
    if (String(url).startsWith('https://cloudflare-dns.com')) {
      calls.pop(); // la vérification DNS n'est pas un appel Notion
      const name = new URL(url).searchParams.get('name');
      if (name === 'nope-domain.com') return Response.json({ Status: 3 });
      if (name === 'nomx.com') return Response.json({ Status: 0, Answer: [] });
      return Response.json({ Status: 0, Answer: [{ type: 15, data: `10 mx.${name}.` }] });
    }
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

test('http:// redirige vers https:// (méthode conservée)', async () => {
  const res = await worker.fetch(new Request('http://maromoya.com/shadowingstudio/?x=1'), env);
  assert.equal(res.status, 308);
  assert.equal(res.headers.get('Location'), 'https://maromoya.com/shadowingstudio/?x=1');
  assert.equal(calls.length, 0);
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

test('cache navigateur : code revalidé, polices en cache long', async () => {
  const js = await worker.fetch(new Request('https://maromoya.com/shadowingstudio/js/main.js'), env);
  assert.equal(js.headers.get('Cache-Control'), 'no-cache');
  const font = await worker.fetch(new Request('https://maromoya.com/shadowingstudio/assets/fonts/a.woff2'), env);
  assert.equal(font.headers.get('Cache-Control'), 'public, max-age=604800');
});

test('réécrit les redirections GitHub vers maromoya.com', async () => {
  const res = await worker.fetch(new Request('https://maromoya.com/shadowingstudio/sub'), env);
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('Location'), '/shadowingstudio/sub/');
});

// --- Traduction ---------------------------------------------------------------

const translate = (body, extraEnv = {}, origin = 'https://maromoya.com') =>
  worker.fetch(new Request('https://maromoya.com/shadowingstudio/api/translate', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), { ...env, ...extraEnv });

test('traduit avec le LLM, en précisant le dialecte (arabe jordanien)', async () => {
  const runs = [];
  const AI = { run: async (model, input) => { runs.push({ model, input }); return { response: '["Tu vas où ?","Bonjour"]' }; } };
  const res = await translate({ texts: ['وين رايح؟', 'مرحبا'], source: 'ar-JO', target: 'fr' }, { AI });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { translations: ['Tu vas où ?', 'Bonjour'], model: 'llm' });
  assert.equal(runs.length, 1);
  assert.match(runs[0].model, /llama-4-scout/);
  assert.match(runs[0].input.messages[0].content, /Jordanian Arabic/);
  assert.match(runs[0].input.messages[0].content, /into natural, idiomatic French/);
});

test('réponse LLM inexploitable → secours m2m100 phrase par phrase', async () => {
  const runs = [];
  const AI = { run: async (model, input) => {
    runs.push(model);
    if (model.includes('llama')) return { response: 'Voici la traduction : bonjour' };
    return { translated_text: `[${input.source_lang}>${input.target_lang}] ${input.text}` };
  } };
  const res = await translate({ texts: ['Hei', 'Takk'], source: 'nb-NO', target: 'fr' }, { AI });
  assert.deepEqual(await res.json(), { translations: ['[no>fr] Hei', '[no>fr] Takk'], model: 'm2m100' });
  assert.equal(runs.length, 3);
});

test('parseTranslations : nombre d’éléments et contenu vérifiés', () => {
  assert.deepEqual(parseTranslations('```json\n["a","b"]\n```', 2), ['a', 'b']);
  assert.equal(parseTranslations('["a"]', 2), null);
  assert.equal(parseTranslations('["a",""]', 2), null);
  assert.deepEqual(parseTranslations(['x'], 1), ['x']);
});

test('traduction : refuse une autre origine et les données invalides', async () => {
  const AI = { run: async () => ({ response: '["x"]' }) };
  assert.equal((await translate({ texts: ['a'], source: 'en', target: 'fr' }, { AI }, 'https://evil.example')).status, 403);
  assert.equal(validateTranslate({ texts: [], source: 'en', target: 'fr' }).error, 'texts');
  assert.equal(validateTranslate({ texts: ['x'.repeat(401)], source: 'en', target: 'fr' }).error, 'texts');
  assert.equal(validateTranslate({ texts: ['ok'], source: 'english', target: 'fr' }).error, 'source');
  assert.equal(validateTranslate({ texts: ['ok'], source: 'ar-JO', target: 'fr' }).error, undefined);
  assert.equal(validateTranslate({ texts: ['ok'], source: 'en', target: '' }).error, 'target');
});

test('traduction : erreur des deux modèles → 502', async () => {
  const AI = { run: async () => { throw new Error('boom'); } };
  assert.equal((await translate({ texts: ['a'], source: 'en', target: 'fr' }, { AI })).status, 502);
});

test('api/hello renvoie le pays fourni par Cloudflare, sans cache', async () => {
  const req = new Request('https://maromoya.com/shadowingstudio/api/hello');
  Object.defineProperty(req, 'cf', { value: { country: 'JO' } });
  const res = await worker.fetch(req, env);
  assert.deepEqual(await res.json(), { country: 'JO' });
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
  const none = await worker.fetch(new Request('https://maromoya.com/shadowingstudio/api/hello'), env);
  assert.deepEqual(await none.json(), { country: null });
});

const v2 = () => ({
  firstName: 'Sam', email: 'sam@example.com', profile: 'executive', nativeLanguage: 'fr',
  targets: [{ lang: 'en', level: 'B2' }], why: 'work', blocker: 'speak', deadline: 'year',
  source: 'instagram', newsletter: false, privacyAccepted: true, uiLocale: 'fr', hp: '',
});

test('nouveau formulaire : une colonne par réponse, score et profil chaud', async () => {
  const res = await post(v2());
  assert.equal(res.status, 200);
  const props = JSON.parse(calls[1].init.body).properties;
  assert.equal(props[P.fullName].title[0].text.content, 'Sam');
  assert.equal(props[P.lastName], undefined);
  assert.equal(props[P.occupation], undefined);
  assert.equal(props[P.profile].select.name, 'Dirigeant·e ou cadre');
  assert.equal(props[P.why].select.name, 'Travail / carrière');
  assert.equal(props[P.blocker].select.name, 'Comprend mais ne parle pas');
  assert.equal(props[P.deadline].select.name, "Dans l'année");
  assert.equal(props[P.source].select.name, 'Instagram');
  assert.equal(props[P.icpScore].number, 4);
  assert.equal(props[P.hot].checkbox, true);
});

test('blocage « Autre » : les mots exacts sont gardés', async () => {
  await post({ ...v2(), blocker: 'other', blockerOther: '  Je panique au téléphone ' });
  const props = JSON.parse(calls[1].init.body).properties;
  assert.equal(props[P.blocker].select.name, 'Autre');
  assert.equal(props[P.blockerOther].rich_text[0].text.content, 'Je panique au téléphone');
  assert.equal(props[P.hot].checkbox, false);
});

test('refuse un code de choix inconnu', () => {
  for (const k of ['profile', 'why', 'blocker', 'deadline', 'source']) {
    assert.ok(validate({ ...v2(), [k]: 'nimporte' }).errors.includes(k), k);
  }
  assert.deepEqual(validate(v2()).errors, []);
});

test('score ICP', () => {
  assert.equal(icpScore({ level: 'A1', blocker: 'vocab', why: 'fun', deadline: 'none' }), 0);
  assert.equal(isHot({ level: 'C2', blocker: 'speak', why: 'abroad', deadline: '3m' }), true);
  assert.equal(isHot({ level: 'B1', blocker: 'grammar', why: 'work', deadline: '3m' }), false);
});

test('email : domaine inexistant, sans MX ou jetable refusé', async () => {
  assert.equal(await emailDomainStatus('gmail.com'), 'ok');
  assert.equal(await emailDomainStatus('nope-domain.com'), 'invalid');
  assert.equal(await emailDomainStatus('nomx.com'), 'invalid');
  assert.equal(await emailDomainStatus('yopmail.com'), 'disposable');
  assert.equal(await emailDomainStatus('pas un domaine'), 'invalid');
  const res = await post({ ...v2(), email: 'sam@nope-domain.com' });
  assert.equal(res.status, 400);
  assert.deepEqual((await res.json()).fields, ['email']);
  assert.equal(calls.length, 0);
});

test('email-check : renvoie le résultat pour un domaine', async () => {
  const res = await worker.fetch(new Request('https://maromoya.com/shadowingstudio/api/email-check?domain=yopmail.com'), env);
  assert.deepEqual(await res.json(), { result: 'disposable' });
});

test('email : DNS injoignable → on laisse passer', async () => {
  const saved = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline'); };
  assert.equal(await emailDomainStatus('example.org'), 'ok');
  globalThis.fetch = saved;
});
