const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'webflow-scripts', 'modules', 'ma.js');
const kod = fs.readFileSync(modulePath, 'utf8');

const MIN = 60 * 1000;
const H = 60 * MIN;
const START = Date.UTC(2026, 9, 20, 10, 0, 0); // 12:00 w Warszawie

function klon(o) {
  return o == null ? o : JSON.parse(JSON.stringify(o));
}

// Magazyn w pamięci, który przeżywa „przeładowanie strony": każde env dostaje
// adapter nad tym samym obiektem `dysk`.
function magazyn(dysk) {
  return {
    kind: 'test',
    load() { return Promise.resolve({ views: klon(dysk.views || []), state: klon(dysk.state || null) }); },
    putViews(list) {
      dysk.views = dysk.views || [];
      list.forEach((v) => {
        const i = dysk.views.findIndex((x) => x.id === v.id);
        if (i >= 0) dysk.views[i] = klon(v); else dysk.views.push(klon(v));
      });
      return Promise.resolve();
    },
    deleteViews(ids) {
      dysk.views = (dysk.views || []).filter((v) => !ids.includes(v.id));
      return Promise.resolve();
    },
    putState(s, c) { dysk.state = klon(s); dysk.counters = klon(c); return Promise.resolve(); },
    clear() { dysk.views = []; dysk.state = null; dysk.counters = null; dysk.cleared = (dysk.cleared || 0) + 1; return Promise.resolve(); },
  };
}

function element(attrs) {
  return {
    tagName: 'DIV',
    attributes: Object.assign({}, attrs || {}),
    style: {},
    getAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attributes, n) ? this.attributes[n] : null; },
    setAttribute(n, v) { this.attributes[n] = String(v); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    appendChild(c) { return c; },
    addEventListener() {},
  };
}

/**
 * Jedna „odsłona strony". opts:
 *   dysk      wspólny magazyn między odsłonami
 *   zegar     { t } - wspólny czas
 *   koperta   obiekt koperty (fetch go zwraca) albo null = 404
 *   cfg       atrybuty tagu loadera
 *   search    location.search
 *   zgoda     stan Consent Mode w localStorage
 *   produkty  wynik d2estate.getProducts()
 */
function strona(opts) {
  const o = opts || {};
  const zegar = o.zegar || { t: START };
  const timery = [];
  let idTimera = 0;
  const dataLayer = o.dataLayer || [];
  const popupy = [];
  const webhooki = [];
  const ostrzezenia = [];
  const zdarzenia = {};
  const sluchacze = {};
  const klikProduktu = [];
  const cfgEl = element(Object.assign({ 'd2-ma': '' }, o.cfg || {}));

  class FakeDate extends Date {
    constructor(...a) { if (a.length) super(...a); else super(zegar.t); }
    static now() { return zegar.t; }
  }

  const popupsApi = {
    _rejestr: {},
    get(n) { return this._rejestr[n]; },
    destroy(n) { delete this._rejestr[n]; },
    create(n, opcje) {
      const inst = {
        name: n, opcje, popupElement: element(),
        show(x) { popupy.push({ name: n, auto: x && x.auto }); },
        hide() {},
      };
      this._rejestr[n] = inst;
      return inst;
    },
  };

  const document = {
    readyState: 'complete',
    body: element(),
    addEventListener() {},
    createElement: () => element(),
    querySelector(sel) {
      if (sel === '[d2-ma], [data-d2-ma]') return cfgEl;
      return null;
    },
    querySelectorAll() { return []; },
  };

  const window = {
    document,
    dataLayer,
    location: { origin: 'https://demo.example', pathname: '/oferta', search: o.search || '', href: 'https://demo.example/oferta' + (o.search || '') },
    localStorage: {
      getItem(k) { return k === 'consentModeV2' && o.zgoda ? JSON.stringify(o.zgoda) : null; },
    },
    crypto: { randomUUID: () => '11111111-2222-4333-8444-555555555555' },
    digi2: {
      log() {},
      emit(n, d) {
        (zdarzenia[n] = zdarzenia[n] || []).push(d);
        (sluchacze[n] || []).forEach((f) => f(d));
      },
      on(n, f) { (sluchacze[n] = sluchacze[n] || []).push(f); },
      modules: { require: () => Promise.resolve(), check: () => false },
      popups: popupsApi,
      _maStore: magazyn(o.dysk || {}),
      _maEndpoint: 'koperta' in o ? 'https://digi2.app/api/ma/scenario/demo.json' : null,
    },
  };
  if (o.mapa !== false) {
    window.d2estate = {
      onProductClick(f) { klikProduktu.push(f); },
      onMapLoad() {},
      onFloorChange() {},
      getProducts: () => o.produkty || [],
    };
  }

  function fetch(url, init) {
    if (url === 'https://digi2.app/api/ma/scenario/demo.json') {
      if (!o.koperta) return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(klon(o.koperta)) });
    }
    if (url.indexOf('hook.') >= 0 || url.indexOf('localhost') >= 0) {
      webhooki.push({ url, body: JSON.parse(init.body) });
      return Promise.resolve({ ok: true, status: 200 });
    }
    if (o.api && url.indexOf('/products') >= 0) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(o.api(JSON.parse(init.body))) });
    }
    return Promise.reject(new Error('offline: ' + url));
  }

  const context = vm.createContext({
    window, document,
    console: { log() {}, warn(...a) { ostrzezenia.push(a.join(' ')); }, error() {} },
    setTimeout(fn, ms) { const id = ++idTimera; timery.push({ id, at: zegar.t + (ms || 0), fn }); return id; },
    clearTimeout(id) { const i = timery.findIndex((x) => x.id === id); if (i >= 0) timery.splice(i, 1); },
    setInterval() { return 0; },
    clearInterval() {},
    Date: FakeDate,
    JSON, Math, Intl, URLSearchParams, Promise, Object, Array, String, Number, isFinite, parseFloat, parseInt, Uint8Array,
    fetch,
  });
  vm.runInContext(kod, context, { filename: modulePath });

  const env = {
    window, zegar, dataLayer, popupy, webhooki, ostrzezenia, zdarzenia, ma: window.digi2.ma,
    segmenty: () => dataLayer.filter((e) => e && typeof e.event === 'string' && e.event.indexOf('ma_') === 0),
    async gotowe() { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); },
    /** Upływ czasu na otwartej stronie: odpalają się timery, które dojrzały. */
    async minie(ms) {
      zegar.t += ms;
      timery.sort((a, b) => a.at - b.at);
      while (timery.length && timery[0].at <= zegar.t) timery.shift().fn();
      await env.gotowe();
    },
    klik(produkt) { klikProduktu.forEach((f) => f(produkt, { mapName: 'mapa' })); },
    zgoda(stan) { (sluchacze['consent:updated'] || []).forEach((f) => f(stan)); },
  };
  return env;
}

// Lokal z 3D Estate tak, jak wypycha go makieta (§3–§5 3destate-knowledge).
function unitOpen(id, custom, extra) {
  return Object.assign({
    event: 'oa3de__unit-open',
    data: { unit: { id, name: id.split('_').pop(), custom: Object.assign({ rooms: 2, floor: 1, area: 49.85, price: 829212, priceOfferPerSqm: 16634, building: 2, status: 1, isPromo: false }, custom || {}) } },
    appData: { us: '?sm-unit=' + id },
  }, extra || {});
}

function koperta(scenariusze, extra) {
  return Object.assign({
    version: '0', site: 'osiedle-demo', project2destate: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    storage: { retentionDays: 90, consentRequired: false },
    channels: {
      email: { webhook: 'https://hook.eu1.make.com/demo-email' },
      sms: { webhook: 'https://hook.eu1.make.com/demo-sms' },
    },
    demoState: { crmCallResult: null, crmCallSeq: 0, timeScale: 1 },
    scenarios: scenariusze,
  }, extra || {});
}

// Szablon „Powrót do lokalu" z §13.5.
const POWROT = {
  scenarioId: 'powrot-do-lokalu', revision: 1, active: true,
  nodes: [
    { id: 't1', type: 'trigger', when: { event: 'unit_view', unitIds: [], minCount: 1 } },
    { id: 't2', type: 'trigger', when: { event: 'return_visit', afterHours: 1 } },
    { id: 'c1', type: 'condition', if: { lead: false } },
    { id: 'a1', type: 'action', do: 'popup', template: 'last-unit', cta: 'open_unit', frequency: 'once_per_unit' },
    { id: 'a2', type: 'action', do: 'datalayer', event: 'ma_segment', params: { segment: 'powrot-do-lokalu' } },
  ],
  edges: [['t1', 't2'], ['t2', 'c1'], ['c1', 'a1'], ['c1', 'a2']],
};

// Szablon „Preferencja pokoi" z §13.5.
const POKOJE = {
  scenarioId: 'preferencja-2', revision: 1, active: true,
  nodes: [
    { id: 't1', type: 'trigger', when: { event: 'type_view', rooms: 2, minCount: 3 } },
    { id: 'c1', type: 'condition', if: { 'pref.rooms': 2, lead: false } },
    { id: 'a1', type: 'action', do: 'datalayer', event: 'ma_segment', params: { segment: '2-pokoje' } },
    { id: 'a2', type: 'action', do: 'popup', template: 'promo-rooms', cta: 'contact', frequency: 'once_per_days:3' },
  ],
  edges: [['t1', 'c1'], ['c1', 'a1'], ['a1', 'a2']],
};

// Szablon „Lead bez kontaktu" z §13.5.
const LEAD = {
  scenarioId: 'lead-bez-kontaktu', revision: 1, active: true,
  nodes: [
    { id: 't1', type: 'trigger', when: { event: 'lead' } },
    { id: 'a1', type: 'action', do: 'datalayer', event: 'ma_segment_exit', params: { segment: 'sprzedaz' } },
    { id: 't2', type: 'trigger', when: { event: 'crm_call_result', result: 'no_answer' } },
    { id: 't3', type: 'trigger', when: { event: 'return_visit' } },
    { id: 'a2', type: 'action', do: 'webhook', channel: 'email', template: 'handlowiec-zadzwon', testOnly: true },
    { id: 'a3', type: 'action', do: 'webhook', channel: 'sms', template: 'termin', testOnly: true, delayMinutes: 15 },
  ],
  edges: [['t1', 'a1'], ['a1', 't2'], ['t2', 't3'], ['t3', 'a2'], ['a2', 'a3']],
};

/** Następna odsłona tej samej przeglądarki po `ms`. */
async function powrot(poprzednia, ms, opts) {
  poprzednia.zegar.t += ms;
  const env = strona(Object.assign({ dysk: poprzednia._dysk, zegar: poprzednia.zegar }, poprzednia._opts, opts || {}));
  env._dysk = poprzednia._dysk;
  env._opts = Object.assign({}, poprzednia._opts, opts || {});
  await env.gotowe();
  return env;
}

async function start(opts) {
  const dysk = (opts && opts.dysk) || {};
  const env = strona(Object.assign({ dysk }, opts));
  env._dysk = dysk;
  env._opts = Object.assign({}, opts);
  delete env._opts.dysk;
  await env.gotowe();
  return env;
}

// ---------------------------------------------------------------------------
// (a) Adapter zdarzeń
// ---------------------------------------------------------------------------

test('3D Estate: unit-open daje unit_view w kształcie §13.1, duplikat nazwy jest pomijany', async () => {
  const env = await start({ koperta: koperta([]) });
  env.dataLayer.push(unitOpen('PL-WRO-0167_01-D-02'));
  env.dataLayer.push(Object.assign(unitOpen('PL-WRO-0167_01-D-02'), { event: 'oa3de_unit_open' }));
  await env.gotowe();
  const h = env.ma.history();
  assert.equal(h.length, 1);
  assert.deepEqual(h[0].unit, {
    unitId: 'PL-WRO-0167_01-D-02', name: '01-D-02', rooms: 2, floor: 1, area: 49.85,
    price: 829212, pricePerSqm: 16634, building: '2', status: 'available', isPromo: false,
    url: 'https://demo.example/oferta?sm-unit=PL-WRO-0167_01-D-02', image: null, source: '3destate',
  });
});

test('3D Estate: statusy po numerze, isNotAvailable = sprzedany', async () => {
  const env = await start({ koperta: koperta([]) });
  env.dataLayer.push(unitOpen('A_1', { status: 2 }));
  env.dataLayer.push(unitOpen('A_2', { status: 3, price: '' }));
  env.dataLayer.push(unitOpen('A_3', { status: 1, isNotAvailable: true }));
  env.dataLayer.push(unitOpen('A_4', { status: 7 }));
  await env.gotowe();
  const h = env.ma.history().map((v) => [v.unit.status, v.unit.price]);
  assert.deepEqual(h, [['reserved', 829212], ['sold', null], ['sold', 829212], ['other', 829212]]);
});

test('ten sam lokal w ciągu 5 s liczy się raz, po 5 s znowu', async () => {
  const env = await start({ koperta: koperta([]) });
  env.dataLayer.push(unitOpen('A_1'));
  await env.minie(2000);
  env.dataLayer.push(unitOpen('A_1'));
  await env.minie(3000);
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.equal(env.ma.history().length, 2);
});

test('zdarzenia sprzed załadowania modułu (już w dataLayer) też się liczą', async () => {
  const env = await start({ koperta: koperta([]), dataLayer: [unitOpen('A_1')] });
  assert.equal(env.ma.history().length, 1);
});

test('deep link ?sm-unit= zapisuje sam unitId, pierwsze pełne zdarzenie uzupełnia resztę', async () => {
  const env = await start({ koperta: koperta([]), search: '?sm-unit=A_9&sm-media=Dollhouse' });
  let h = env.ma.history();
  assert.equal(h.length, 1);
  assert.equal(h[0].unit.unitId, 'A_9');
  assert.equal(h[0].unit.rooms, null);
  await env.minie(60 * 1000);
  env.dataLayer.push(unitOpen('A_9', { rooms: 3 }));
  await env.gotowe();
  h = env.ma.history();
  assert.equal(h.length, 2);
  assert.equal(h[0].unit.rooms, 3, 'wpis z deep linku dostał pola z pełnego zdarzenia');
  assert.equal(h[0].partial, undefined);
});

test('2destate: onProductClick → unit_view, cena promocyjna przy promo_active, building_name albo null', async () => {
  const env = await start({ koperta: koperta([]) });
  env.klik({ id: 'p-1', name: 'B.1.05', rooms: 3, floor: 1, area: 52.3, price_gross: 700000, price_gross_m2: 13384,
    promo_active: true, promo_price_gross: 650000, promo_price_gross_m2: 12428, status: 'reserved' });
  env.klik({ id: 'p-2', name: 'B.1.06', rooms: 2, floor: 1, area: 40, price_gross: 500000, price_gross_m2: 12500,
    promo_active: false, promo_price_gross: 1, status: 'available', building_name: 'B' });
  await env.gotowe();
  const [a, b] = env.ma.history().map((v) => v.unit);
  assert.equal(a.price, 650000);
  assert.equal(a.pricePerSqm, 12428);
  assert.equal(a.isPromo, true);
  assert.equal(a.building, null);
  assert.equal(a.status, 'reserved');
  assert.equal(a.source, '2destate');
  assert.equal(a.url, 'https://demo.example/oferta?d2-unit=p-1');
  assert.equal(b.price, 500000);
  assert.equal(b.building, 'B');
});

// ---------------------------------------------------------------------------
// (b) Magazyn: wizyty, profil, retencja, wyczyść
// ---------------------------------------------------------------------------

test('visitorId zostaje między odsłonami, nowa wizyta po 30 min ciszy', async () => {
  const p1 = await start({ koperta: koperta([]) });
  assert.equal(p1.ma.profile().visits, 1);
  const p2 = await powrot(p1, 10 * MIN);
  assert.equal(p2.ma.profile().visits, 1);
  const p3 = await powrot(p2, 31 * MIN);
  assert.equal(p3.ma.profile().visits, 2);
  assert.equal(p3.ma.profile().visitorId, '11111111-2222-4333-8444-555555555555');
});

test('pref.rooms = najczęściej oglądane, remis rozstrzyga ostatnio obejrzany', async () => {
  const env = await start({ koperta: koperta([]) });
  for (const [id, rooms] of [['A_1', 3], ['A_2', 2], ['A_3', 2], ['A_4', 3]]) {
    env.dataLayer.push(unitOpen(id, { rooms }));
    await env.minie(6000);
  }
  assert.equal(env.ma.profile().pref.rooms, 3, 'remis 2:2, ostatnio obejrzany ma 3 pokoje');
  env.dataLayer.push(unitOpen('A_5', { rooms: 2 }));
  await env.gotowe();
  assert.equal(env.ma.profile().pref.rooms, 2);
});

test('retencja: wpisy starsze niż retentionDays znikają przy starcie', async () => {
  const p1 = await start({ koperta: koperta([], { storage: { retentionDays: 2, consentRequired: false } }) });
  p1.dataLayer.push(unitOpen('A_1'));
  await p1.gotowe();
  const p2 = await powrot(p1, 3 * 24 * H);
  assert.equal(p2.ma.history().length, 0);
  assert.equal(p2._dysk.views.length, 0);
});

test('wyczyść kasuje bazę i zaczyna od nowego profilu', async () => {
  const env = await start({ koperta: koperta([]) });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  await env.ma.clear();
  assert.equal(env._dysk.cleared, 1);
  assert.equal(env.ma.history().length, 0);
  assert.equal(env.ma.profile().visits, 0);
});

test('consentRequired: bez zgody nic nie trafia do bazy, po zgodzie moduł rusza', async () => {
  const env = await start({ koperta: koperta([POKOJE], { storage: { consentRequired: true }, demoState: { timeScale: 60 } }) });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.equal(env._dysk.state, undefined);
  assert.equal(env.ma.profile(), null);
  env.zgoda({ analytics_storage: 'granted' });
  await env.gotowe();
  env.dataLayer.push(unitOpen('A_2'));
  await env.gotowe();
  assert.equal(env.ma.history().length, 1, 'liczy się tylko to, co po zgodzie');
  assert.equal(env.ma.profile().timeScale, 1, 'demoState ignorowany przy consentRequired');
});

test('koperta nie do pobrania: historia się zapisuje, akcji brak (reguła 10)', async () => {
  const env = await start({ koperta: null, cfg: { 'd2-ma-consent-required': 'false' } });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.equal(env.ma.history().length, 1);
  assert.equal(env.segmenty().length, 0);
});

test('koperta nie do pobrania i brak atrybutu: zgoda wymagana, nic nie zapisujemy', async () => {
  const env = await start({ koperta: null });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.equal(env.ma.profile(), null);
});

// ---------------------------------------------------------------------------
// (c) Silnik reguł
// ---------------------------------------------------------------------------

test('Powrót do lokalu: obejrzał → wrócił po godzinie → popup z tym lokalem i segment', async () => {
  const p1 = await start({ koperta: koperta([POWROT]) });
  p1.dataLayer.push(unitOpen('A_1'));
  await p1.gotowe();
  assert.equal(p1.popupy.length, 0);
  const p2 = await powrot(p1, 2 * H);
  assert.equal(p2.popupy.length, 1);
  assert.equal(p2.popupy[0].name, 'd2-ma-last-unit');
  assert.equal(p2.popupy[0].auto, true);
  const akcja = p2.zdarzenia['ma:action'].find((a) => a.do === 'popup');
  assert.equal(akcja.unit.unitId, 'A_1');
  assert.deepEqual(p2.segmenty().map((e) => [e.event, e.segment, e.ma_scenario]),
    [['ma_segment', 'powrot-do-lokalu', 'powrot-do-lokalu']]);
  // Kolejny powrót bez nowego lokalu: popup once_per_unit już był, segment idzie (reguła 6).
  const p3 = await powrot(p2, 2 * H);
  assert.equal(p3.popupy.length, 0);
  assert.equal(p3.segmenty().length, 1);
});

test('reguła 1: powrót bez wcześniejszego obejrzenia nie uruchamia ścieżki', async () => {
  const p1 = await start({ koperta: koperta([POWROT]) });
  const p2 = await powrot(p1, 2 * H);
  p2.dataLayer.push(unitOpen('A_1'));
  await p2.gotowe();
  assert.equal(p2.popupy.length, 0);
  assert.equal(p2.segmenty().length, 0);
});

test('afterHours liczone od końca poprzedniej wizyty', async () => {
  const sc = klon(POWROT);
  sc.nodes[1].when.afterHours = 3;
  const p1 = await start({ koperta: koperta([sc]) });
  p1.dataLayer.push(unitOpen('A_1'));
  await p1.gotowe();
  const p2 = await powrot(p1, 2 * H);
  assert.equal(p2.segmenty().length, 0, 'nowa wizyta, ale za wcześnie');
  const p3 = await powrot(p2, 4 * H);
  assert.equal(p3.segmenty().length, 1);
});

test('warunek lead: false zatrzymuje gałąź po wysłaniu formularza', async () => {
  const p1 = await start({ koperta: koperta([POWROT]) });
  p1.dataLayer.push(unitOpen('A_1'));
  p1.dataLayer.push({ event: 'generate_lead' });
  await p1.gotowe();
  const p2 = await powrot(p1, 2 * H);
  assert.equal(p2.popupy.length, 0);
  assert.equal(p2.segmenty().length, 0);
  assert.equal(p2.ma.profile().lead, true);
});

test('Preferencja pokoi: trzeci 2-pokojowy → segment, potem popup; once_per_days', async () => {
  const env = await start({ koperta: koperta([POKOJE]) });
  env.dataLayer.push(unitOpen('A_0', { rooms: 3 }));
  await env.minie(6000);
  for (const id of ['A_1', 'A_2']) { env.dataLayer.push(unitOpen(id)); await env.minie(6000); }
  assert.equal(env.segmenty().length, 0, '3-pokojowy nie liczy się do rooms: 2');
  env.dataLayer.push(unitOpen('A_3'));
  await env.gotowe();
  assert.deepEqual(env.segmenty().map((e) => e.segment), ['2-pokoje']);
  assert.equal(env.popupy.length, 1);
  assert.equal(env.popupy[0].name, 'd2-ma-promo-rooms');
  // Czwarty: segment znowu nie (once_per_visit), popup nie (3 dni).
  await env.minie(6000);
  env.dataLayer.push(unitOpen('A_4'));
  await env.gotowe();
  assert.equal(env.segmenty().length, 1);
  assert.equal(env.popupy.length, 1);
});

test('reguła 6: akcja pominięta przez frequency nie kończy gałęzi', async () => {
  const sc = klon(POKOJE);
  sc.nodes[2].frequency = 'once_per_days:7';
  sc.nodes[3].frequency = 'once_per_unit';
  const env = await start({ koperta: koperta([sc]) });
  for (const id of ['A_1', 'A_2', 'A_3']) { env.dataLayer.push(unitOpen(id)); await env.minie(6000); }
  assert.equal(env.segmenty().length, 1);
  assert.equal(env.popupy.length, 1);
  env.dataLayer.push(unitOpen('A_4'));
  await env.gotowe();
  assert.equal(env.segmenty().length, 1, 'segment pominięty (7 dni)');
  assert.equal(env.popupy.length, 2, 'popup za pominiętym segmentem i tak idzie (nowy lokal)');
});

test('timeScale skraca once_per_days', async () => {
  const env = await start({ koperta: koperta([POKOJE], { demoState: { timeScale: 60 } }) });
  for (const id of ['A_1', 'A_2', 'A_3']) { env.dataLayer.push(unitOpen(id)); await env.minie(6000); }
  assert.equal(env.popupy.length, 1);
  await env.minie(3 * 24 * H / 60);
  env.dataLayer.push(unitOpen('A_4'));
  await env.gotowe();
  assert.equal(env.popupy.length, 2);
});

test('konflikt: dwa popupy w tej samej chwili — wygrywa wcześniejszy scenariusz, drugi czeka do następnej wizyty', async () => {
  const drugi = klon(POWROT);
  drugi.scenarioId = 'drugi';
  drugi.nodes[3].template = 'inny';
  drugi.nodes[4].params.segment = 'drugi';
  const p1 = await start({ koperta: koperta([POWROT, drugi]) });
  p1.dataLayer.push(unitOpen('A_1'));
  await p1.gotowe();
  const p2 = await powrot(p1, 2 * H);
  assert.deepEqual(p2.popupy.map((p) => p.name), ['d2-ma-last-unit']);
  assert.deepEqual(p2.segmenty().map((e) => e.segment), ['powrot-do-lokalu', 'drugi'], 'datalayer bez konfliktu, w kolejności scenariuszy');
  const p3 = await powrot(p2, 2 * H);
  assert.deepEqual(p3.popupy.map((p) => p.name), ['d2-ma-inny']);
});

test('popup nie promuje sprzedanego lokalu (świeży status z mapy)', async () => {
  const p1 = await start({ koperta: koperta([POWROT]) });
  p1.klik({ id: 'p-1', name: 'B.1.05', rooms: 2, status: 'available', price_gross: 1 });
  await p1.gotowe();
  const p2 = await powrot(p1, 2 * H, { produkty: [{ id: 'p-1', name: 'B.1.05', rooms: 2, status: 'sold' }] });
  assert.equal(p2.popupy.length, 0);
  assert.equal(p2.segmenty().length, 1, 'segment idzie dalej');
});

test('popup: status z Products API 2destate, gdy mapy nie ma na stronie', async () => {
  const id = '12345678-1234-4234-8234-123456789012';
  const p1 = await start({ koperta: koperta([POWROT]) });
  p1.klik({ id, name: 'B.1.05', rooms: 2, status: 'available', price_gross: 1 });
  await p1.gotowe();
  const zapytania = [];
  const p2 = await powrot(p1, 2 * H, { mapa: false, api: (body) => { zapytania.push(body); return [{ id, status: 'sold' }]; } });
  assert.deepEqual(zapytania, [{ product_ids: [id] }]);
  assert.equal(p2.popupy.length, 0);
});

test('Lead bez kontaktu: lead → wyjście z grupy → nieodebrany telefon → powrót → e-mail, SMS po 15 min', async () => {
  const k = (seq, result) => koperta([LEAD], { demoState: { crmCallResult: result, crmCallSeq: seq, timeScale: 1 } });
  const p1 = await start({ koperta: k(4, 'no_answer') });
  p1.dataLayer.push({ event: 'oa3de__contact-form-make-inquiry', data: { units: [] } });
  await p1.gotowe();
  assert.deepEqual(p1.segmenty().map((e) => [e.event, e.segment]), [['ma_segment_exit', 'sprzedaz']]);
  // Wynik, który leżał w kopercie przed leadem, nie jest nowy.
  const p2 = await powrot(p1, 2 * H);
  assert.equal(p2.webhooki.length, 0);
  // Panel wysyła „nie odebrał" (seq 5), odwiedzający przeładowuje stronę w tej samej wizycie…
  const p3 = await powrot(p2, MIN, { koperta: k(5, 'no_answer') });
  assert.equal(p3.webhooki.length, 0);
  // …a potem wraca.
  const p4 = await powrot(p3, 2 * H, { koperta: k(5, 'no_answer') });
  assert.equal(p4.webhooki.length, 1);
  const w = p4.webhooki[0];
  assert.equal(w.url, 'https://hook.eu1.make.com/demo-email');
  assert.deepEqual(Object.keys(w.body).sort(), ['channel', 'nodeId', 'revision', 'scenarioId', 'segment', 'template', 'testOnly', 'ts', 'unit', 'visitorId']);
  assert.equal(w.body.testOnly, true);
  assert.equal(w.body.segment, 'sprzedaz');
  assert.equal(w.body.template, 'handlowiec-zadzwon');
  await p4.minie(14 * MIN);
  assert.equal(p4.webhooki.length, 1);
  await p4.minie(2 * MIN);
  assert.equal(p4.webhooki.length, 2);
  assert.equal(p4.webhooki[1].url, 'https://hook.eu1.make.com/demo-sms');
});

test('crm_call_result: inny wynik niż w węźle nie rusza ścieżki', async () => {
  const k = (seq, result) => koperta([LEAD], { demoState: { crmCallResult: result, crmCallSeq: seq } });
  const p1 = await start({ koperta: k(0, null) });
  p1.dataLayer.push({ event: 'generate_lead' });
  await p1.gotowe();
  const p2 = await powrot(p1, MIN, { koperta: k(1, 'answered') });
  const p3 = await powrot(p2, 2 * H);
  assert.equal(p3.webhooki.length, 0);
});

test('reload() łapie nowy wynik telefonu na otwartej stronie', async () => {
  const env = await start({ koperta: koperta([LEAD], { demoState: { crmCallResult: null, crmCallSeq: 0 } }) });
  env.dataLayer.push({ event: 'generate_lead' });
  await env.gotowe();
  await env.ma.load(koperta([LEAD], { demoState: { crmCallResult: 'no_answer', crmCallSeq: 1 } }));
  assert.equal(env.webhooki.length, 0);
  env.ma.simulateReturn();
  await env.gotowe();
  assert.equal(env.webhooki.length, 1);
});

test('odłożona akcja przepada po 24 h', async () => {
  const sc = klon(LEAD);
  sc.nodes[1] = { id: 'a1', type: 'action', do: 'webhook', channel: 'email', template: 'x', testOnly: true, delayMinutes: 60 };
  sc.edges = [['t1', 'a1']];
  const p1 = await start({ koperta: koperta([sc]) });
  p1.dataLayer.push({ event: 'generate_lead' });
  await p1.gotowe();
  assert.equal(p1.webhooki.length, 0);
  const p2 = await powrot(p1, 25 * H);
  assert.equal(p2.webhooki.length, 0);
});

test('odłożony webhook idzie przy najbliższej wizycie, gdy strona była zamknięta', async () => {
  const sc = klon(LEAD);
  sc.nodes[1] = { id: 'a1', type: 'action', do: 'webhook', channel: 'email', template: 'x', testOnly: true, delayMinutes: 60 };
  sc.edges = [['t1', 'a1']];
  const p1 = await start({ koperta: koperta([sc]) });
  p1.dataLayer.push({ event: 'generate_lead' });
  await p1.gotowe();
  const p2 = await powrot(p1, 2 * H);
  assert.equal(p2.webhooki.length, 1);
});

test('webhook bez testOnly: true nie wychodzi', async () => {
  const sc = klon(LEAD);
  sc.nodes[1] = { id: 'a1', type: 'action', do: 'webhook', channel: 'email', template: 'x' };
  sc.edges = [['t1', 'a1']];
  const env = await start({ koperta: koperta([sc]) });
  env.dataLayer.push({ event: 'generate_lead' });
  await env.gotowe();
  assert.equal(env.webhooki.length, 0);
  assert.ok(env.ostrzezenia.some((w) => w.includes('testOnly')));
});

test('symuluj powrót zamyka wizytę tak, jakby minęło afterHours', async () => {
  const sc = klon(POWROT);
  sc.nodes[1].when.afterHours = 24;
  const env = await start({ koperta: koperta([sc]) });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  env.ma.simulateReturn();
  await env.gotowe();
  assert.equal(env.ma.profile().visits, 2);
  assert.equal(env.popupy.length, 1);
});

test('reguła 9: version ≠ "0" → żaden scenariusz, tylko ostrzeżenie', async () => {
  const p1 = await start({ koperta: koperta([POWROT], { version: '1' }) });
  p1.dataLayer.push(unitOpen('A_1'));
  await p1.gotowe();
  const p2 = await powrot(p1, 2 * H);
  assert.equal(p2.segmenty().length, 0);
  assert.equal(p2.ma.history().length, 1, 'historia działa dalej');
  assert.ok(p2.ostrzezenia.some((w) => w.includes('version')));
});

test('reguła 8: nieznana akcja pominięta z ostrzeżeniem, nieznane pole bez skutku, reszta działa', async () => {
  const sc = klon(POWROT);
  sc.nodes[3] = { id: 'a1', type: 'action', do: 'push_notification' };
  sc.nodes[4].color = 'red';
  sc.extra = { cokolwiek: true };
  const p1 = await start({ koperta: koperta([sc], { nowePole: 1 }) });
  p1.dataLayer.push(unitOpen('A_1'));
  await p1.gotowe();
  const p2 = await powrot(p1, 2 * H);
  assert.equal(p2.popupy.length, 0);
  assert.equal(p2.segmenty().length, 1);
  assert.ok(p2.ostrzezenia.some((w) => w.includes('"a1"') && w.includes('push_notification')));
});

test('reguła 7: węzeł bez krawędzi wchodzącej, który nie jest triggerem, jest ignorowany', async () => {
  const sc = klon(POKOJE);
  sc.nodes.push({ id: 'a9', type: 'action', do: 'datalayer', event: 'ma_segment', params: { segment: 'samotny' } });
  sc.edges.push(['a9', 'a2']);
  const env = await start({ koperta: koperta([sc]) });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.equal(env.segmenty().length, 0);
  assert.ok(env.ostrzezenia.some((w) => w.includes('"a9"')));
});

test('scenariusz z active: false nie działa', async () => {
  const sc = klon(POKOJE);
  sc.active = false;
  const env = await start({ koperta: koperta([sc]) });
  for (const id of ['A_1', 'A_2', 'A_3']) { env.dataLayer.push(unitOpen(id)); await env.minie(6000); }
  assert.equal(env.segmenty().length, 0);
});

test('scenariusz opublikowany po obejrzeniu: pierwszy wyzwalacz bierze historię, akcje nie ruszają od razu', async () => {
  const p1 = await start({ koperta: koperta([]) });
  p1.dataLayer.push(unitOpen('A_1'));
  await p1.gotowe();
  const p2 = await powrot(p1, 2 * H, { koperta: koperta([POWROT]) });
  assert.equal(p2.popupy.length, 1);
});

test('nowa rewizja scenariusza zaczyna ścieżkę od zera', async () => {
  const p1 = await start({ koperta: koperta([POKOJE]) });
  for (const id of ['A_1', 'A_2', 'A_3']) { p1.dataLayer.push(unitOpen(id)); await p1.minie(6000); }
  assert.equal(p1.popupy.length, 1);
  const nowa = klon(POKOJE);
  nowa.revision = 2;
  const p2 = await powrot(p1, MIN, { koperta: koperta([nowa]) });
  p2.dataLayer.push(unitOpen('A_4'));
  await p2.gotowe();
  assert.equal(p2.popupy.length, 1, 'częstotliwość z rewizji 1 nie blokuje rewizji 2');
});
