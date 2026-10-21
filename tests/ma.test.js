const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// Testy liczą godziny jak przeglądarka w Polsce (12:10 = 10:10 UTC w październiku) —
// niezależnie od strefy maszyny (CI w UTC, Windows).
process.env.TZ = 'Europe/Warsaw';

const modulePath = path.join(__dirname, '..', 'webflow-scripts', 'modules', 'ma.js');
const kodModulu = fs.readFileSync(modulePath, 'utf8');

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

let uuidN = 0;

// Prosty dopasowywacz selektorów, których używa moduł: [a], [a="v"], #id, tag; reszta (:not) pomijana.
function pasuje(el, sel) {
  return sel.split(',').some((czesc) => {
    const c = czesc.trim().replace(/:not\([^)]*\)/g, '');
    if (c[0] === '#') return el.id === c.slice(1);
    const m = /^([a-z]*)\[([^\]=]+)(?:="([^"]*)")?\]$/.exec(c);
    if (!m) return false;
    if (m[1] && el.tagName !== m[1].toUpperCase()) return false;
    const v = el.getAttribute(m[2]);
    return v !== null && (m[3] === undefined || v === m[3]);
  });
}

function potomkowie(el) {
  const out = [];
  (el.children || []).forEach((c) => { out.push(c); out.push(...potomkowie(c)); });
  return out;
}

function element(attrs, tagName) {
  return {
    tagName: tagName || 'DIV',
    attributes: Object.assign({}, attrs || {}),
    style: { setProperty(n, v) { this[n] = v; } },
    getAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attributes, n) ? this.attributes[n] : null; },
    setAttribute(n, v) { this.attributes[n] = String(v); },
    removeAttribute(n) { delete this.attributes[n]; },
    getAttributeNames() { return Object.keys(this.attributes); },
    children: [],
    parentNode: null,
    querySelector(sel) { return potomkowie(this).find((x) => pasuje(x, sel)) || null; },
    querySelectorAll(sel) { return potomkowie(this).filter((x) => pasuje(x, sel)); },
    appendChild(c) { this.children = this.children.concat([c]); c.parentNode = this; return c; },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); return c; },
    get firstChild() { return this.children[0] || null; },
    addEventListener(n, f) { if (n === 'click') this._klik = f.bind(this); },
    closest(sel) {
      // Tylko to, czego używa moduł: 'form' i atrybut d2-ma-ignore.
      for (let el = this; el; el = el.parent) {
        if (sel === 'form' && el.tagName === 'FORM') return el;
        if (sel.indexOf('d2-ma-ignore') >= 0 && el.getAttribute && el.getAttribute('d2-ma-ignore') !== null) return el;
      }
      return null;
    },
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
 *   googleTag window.google_tag_data (stan zgody tagu Google / szablonu CMP)
 *   produkty  wynik d2estate.getProducts()
 *   elementy  elementy strony dla querySelectorAll (sloty, formularz testowy)
 *   dotyk     matchMedia('(hover: none)') = true
 *   kod       inny kod modułu (np. ma.3 do testu zgodności)
 *   bezUnicodeRegExp  przeglądarka sprzed ES2018: new RegExp(…, 'u') rzuca
 *   dymek     { open } - pełnoekranowy dymek mapy 2destate na telefonie
 *   idb       atrapa window.indexedDB zamiast magazynu testowego (prawdziwy idbStore)
 *   popupsProxy  moduł popupów jeszcze się ładuje: digi2.popups to proxy loadera
 *             (każda właściwość = funkcja zwracająca Promise), _loaded.popups = false;
 *             env.proxyWolania zlicza wywołania, env.zaladujPopups() podstawia moduł
 */
function strona(opts) {
  const o = opts || {};
  const zegar = o.zegar || { t: START };
  const timery = [];
  let idTimera = 0;
  const dataLayer = o.dataLayer || [];
  const popupy = [];
  const webhooki = [];
  const sygnaly = [];
  const ostrzezenia = [];
  const zdarzenia = {};
  const sluchacze = {};
  const klikProduktu = [];
  const filtry = [];
  const sortowania = [];
  const ustawioneFiltry = [];
  const zmianyPietra = [];
  const klatki = [];
  const naMape = [];
  const cfgEl = element(Object.assign({ 'd2-ma': '' }, o.cfg || {}));
  const naDokumencie = {};
  const naOknie = {};
  const elementy = o.elementy || [];

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
        name: n, opcje, popupElement: document.querySelector(opcje.popupSelector) || element(),
        show(x) { popupy.push({ name: n, auto: x && x.auto }); },
        hide() {},
      };
      this._rejestr[n] = inst;
      return inst;
    },
  };

  const document = {
    readyState: 'complete',
    visibilityState: 'visible',
    body: element(),
    documentElement: { scrollHeight: 3000, clientHeight: 1000, scrollTop: 0 },
    addEventListener(n, f) { (naDokumencie[n] = naDokumencie[n] || []).push(f); },
    createElement: (t) => element({}, String(t || 'div').toUpperCase()),
    querySelector(sel) {
      if (sel === '[d2-ma], [data-d2-ma]') return cfgEl;
      if (sel === '.imp-tooltips-container.is-fullscreen') return o.dymek && o.dymek.open ? element() : null;
      const s = o.szablon;
      if (s && (sel.indexOf('[d2-ma-popup="' + s.getAttribute('d2-ma-popup') + '"]') === 0 || (s.id && sel === '#' + s.id))) return s;
      // Element zbudowany przez moduł i dołożony do body (popup z szablonu).
      if (sel[0] === '#') return potomkowie(document.body).find((x) => x.id === sel.slice(1)) || null;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '*') return elementy.slice();
      return elementy.filter((el) => Object.keys(el.attributes).some((a) => {
        const v = el.attributes[a];
        return sel.indexOf('[' + a + ']') >= 0 || sel.indexOf('[' + a + '="' + v + '"]') >= 0;
      }));
    },
  };

  // Proxy loadera (digi2-loader.js createProxy): typeof p.list === 'function', p.list() = Promise.
  const proxyWolania = [];
  const popupsProxy = new Proxy({}, {
    get(_t, method) { return (...a) => { proxyWolania.push(String(method)); return Promise.resolve(); }; },
  });

  const window = {
    innerHeight: 1000,
    pageYOffset: 0,
    addEventListener(n, f) { (naOknie[n] = naOknie[n] || []).push(f); },
    document,
    dataLayer,
    location: { origin: 'https://demo.example', host: 'demo.example', hostname: 'demo.example', pathname: '/oferta', search: o.search || '', href: 'https://demo.example/oferta' + (o.search || '') },
    localStorage: {
      getItem(k) { return k === 'consentModeV2' && o.zgoda ? JSON.stringify(o.zgoda) : null; },
    },
    crypto: { randomUUID: () => '00000000-0000-4000-8000-' + String(++uuidN).padStart(12, '0') },
    digi2: {
      log() {},
      emit(n, d) {
        (zdarzenia[n] = zdarzenia[n] || []).push(d);
        (sluchacze[n] || []).forEach((f) => f(d));
      },
      on(n, f) { (sluchacze[n] = sluchacze[n] || []).push(f); },
      modules: { require: () => Promise.resolve(), check: () => false },
      _loaded: { popups: !o.popupsProxy },
      popups: o.popupsProxy ? popupsProxy : popupsApi,
      _maStore: o.idb ? undefined : magazyn(o.dysk || {}),
      _maEndpoint: o.endpoint || ('koperta' in o ? 'https://digi2.app/api/ma/scenario/demo.json' : null),
    },
  };
  if (o.idb) window.indexedDB = o.idb;
  if (o.googleTag) window.google_tag_data = o.googleTag;
  if (o.imp) window.ImageMapPro = o.imp;
  if (o.dotyk) window.matchMedia = (q) => ({ matches: q === '(hover: none)' });
  window.requestAnimationFrame = (f) => { klatki.push(f); };
  if (o.mapa !== false) {
    window.d2estate = {
      onProductClick(f) { klikProduktu.push(f); },
      // Atrapa wyszukiwarki 2destate core 1.7.0 (kontrakt §13.14), opcja wyszukiwarka: false = paczka sprzed 1.7.0.
      ...(o.wyszukiwarka === false ? {} : {
        onFilterChange(f) { filtry.push(f); },
        onSortChange(f) { sortowania.push(f); },
        setFilters(m, f, opt) { ustawioneFiltry.push([m, JSON.parse(JSON.stringify(f)), opt]); return true; },
        getFilters() { return {}; },
      }),
      onMapLoad(f) { naMape.push(f); },
      onFloorChange(f) { zmianyPietra.push(f); },
      getProducts: () => o.produkty || [],
    };
  }

  const pobrania = [];
  function fetch(url, init) {
    pobrania.push(String(url));
    if (url === 'https://digi2.app/api/ma/scenario/demo.json') {
      if (!o.koperta) return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(klon(o.koperta)) });
    }
    if (url.indexOf('/public/ma/') >= 0) {
      sygnaly.push({ url, body: JSON.parse(init.body), init });
      const st = (o.statusSygnalu && o.statusSygnalu(url)) || (url.indexOf('/revoke') >= 0 ? 204 : 202);
      return Promise.resolve({ ok: st >= 200 && st < 300, status: st, headers: { get: (h) => (h === 'Retry-After' ? (o.retryAfter || null) : null) } });
    }
    if (url.indexOf('hook.') >= 0 || url.indexOf('localhost') >= 0 || url.indexOf('/api/ma/channel/') >= 0) {
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
    JSON, Math, Intl, URL, URLSearchParams, Promise, Object, Array, String, Number, isFinite, parseFloat, parseInt, Uint8Array,
    fetch,
  });
  if (o.bezUnicodeRegExp) {
    const Natywny = vm.runInContext('RegExp', context);
    context.RegExp = function (src, flags) {
      if (String(flags || '').indexOf('u') >= 0) throw new SyntaxError('Invalid flags');
      return new Natywny(src, flags);
    };
  }
  vm.runInContext(o.kod || kodModulu, context, { filename: modulePath });

  const env = {
    window, zegar, dataLayer, popupy, webhooki, sygnaly, ostrzezenia, zdarzenia, ma: window.digi2.ma,
    proxyWolania,
    pobrania,
    /** Moduł popupów dociągnął się po d2-ma: loader podstawia prawdziwy obiekt i oznacza _loaded. */
    zaladujPopups() { window.digi2.popups = popupsApi; window.digi2._loaded.popups = true; },
    segmenty: () => dataLayer.filter((e) => e && typeof e.event === 'string' && e.event.indexOf('ma_') === 0 && e.event !== 'ma_form_field'),
    polaFormularza: () => dataLayer.filter((e) => e && e.event === 'ma_form_field').map((e) => ({ ...e })),
    async gotowe() { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); },
    /** Upływ czasu na otwartej stronie: odpalają się timery, które dojrzały. */
    async minie(ms) {
      zegar.t += ms;
      // Timer ustawiony przez inny timer też odpala, jeśli dojrzał.
      for (;;) {
        timery.sort((a, b) => a.at - b.at);
        if (!timery.length || timery[0].at > zegar.t) break;
        timery.shift().fn();
      }
      await env.gotowe();
    },
    naDokumencie, naOknie, document,
    /** Zdarzenie DOM na dokumencie albo oknie (sluchacze modułu). */
    dom(n, e) { (naDokumencie[n] || []).forEach((f) => f(e || {})); },
    okno(n, e) { (naOknie[n] || []).forEach((f) => f(e || {})); },
    /** Mapa 2destate zgłasza onMapLoad. */
    mapaGotowa() { naMape.forEach((f) => f()); },
    klik(produkt, meta) { klikProduktu.forEach((f) => f(produkt, Object.assign({ mapName: 'mapa' }, meta || {}))); },
    /** Zmiana filtra w wyszukiwarce (core 1.7.0). */
    filtr(filters, extra) { filtry.forEach((f) => f(Object.assign({ mapName: 'mapa', filters, resultCount: 7, resultIds: null, source: 'user' }, extra || {}))); },
    sortuj(by, dir, extra) { sortowania.forEach((f) => f(Object.assign({ mapName: 'mapa', sort: { by, dir }, source: 'user' }, extra || {}))); },
    ustawioneFiltry,
    /** Jedna klatka animacji: odpala to, co czekało na requestAnimationFrame. */
    klatka() { klatki.splice(0).forEach((f) => f()); },
    zmianaPietra() { zmianyPietra.forEach((f) => f()); },
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
    url: 'https://demo.example/oferta?sm-unit=PL-WRO-0167_01-D-02', image: null, promoText: null, source: '3destate',
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
  await env.minie(3001);
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
  assert.equal(p3.ma.profile().visitorId, p1.ma.profile().visitorId);
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
  assert.ok(!env._dysk.state, 'nic w magazynie');
  assert.ok(!(env._dysk.views || []).length);
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

test('mapa: podświetla lokale z bieżącego piętra po jednym na klatkę, bez grup i innych pięter', async () => {
  const wolny = (id, rooms) => ({ id, name: id, rooms, status: 'available' });
  const wywolania = [];
  const mapa = {
    artboardController: { currentArtboardId: 'p1' },
    store: { state: { artboards: [
      { id: 'p1', children: [
        { title: 'Grupa', type: 'group', assigned_product: 'u1', children: [{ title: 'A1', assigned_product: 'u1' }] },
        { title: 'A2', assigned_product: 'u2' },
        { title: 'A3', assigned_product: 'u3' },
        { title: 'A4', assigned_product: 'u4' },
      ] },
      { id: 'p2', children: [{ title: 'B1', assigned_product: 'u5' }] },
    ] } },
    products: [wolny('u1', 2), wolny('u2', 2), wolny('u3', 3), wolny('u4', 2), wolny('u5', 2)],
  };
  const imp = { instances: { mapa }, highlightObject(m, t) { wywolania.push(t); } };
  const env = await start({ koperta: koperta([]), cfg: { 'd2-ma-highlight': '' }, imp });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  env.ma.highlight();
  assert.deepEqual(wywolania, ['A1'], 'pierwszy kształt od razu, reszta czeka na klatkę');
  env.klatka();
  assert.deepEqual(wywolania, ['A1', 'A2']);
  env.klatka();
  env.klatka();
  assert.deepEqual(wywolania, ['A1', 'A2', 'A4'], 'bez grupy, bez 3 pokoi, bez piętra p2');

  // Zmiana piętra w trakcie kolejki: stare kształty odpadają, nowe piętro dostaje swoje.
  wywolania.length = 0;
  env.ma.highlight();
  mapa.artboardController.currentArtboardId = 'p2';
  env.zmianaPietra();
  env.klatka();
  env.klatka();
  assert.deepEqual(wywolania, ['A1', 'B1'], 'po zmianie piętra tylko B1');
  // Powrót na p1 nakłada podświetlenia od nowa (zmiana piętra je zgasiła).
  wywolania.length = 0;
  mapa.artboardController.currentArtboardId = 'p1';
  env.zmianaPietra();
  env.klatka(); env.klatka(); env.klatka();
  assert.deepEqual(wywolania, ['A1', 'A2', 'A4']);
});

test('mapa: highlightObject zgłaszający onFloorChange na tym samym piętrze nie zapętla kolejki', async () => {
  const wolny = (id) => ({ id, name: id, rooms: 2, status: 'available' });
  const wywolania = [];
  const mapa = {
    artboardController: { currentArtboardId: 'p1' },
    store: { state: { artboards: [{ id: 'p1', children: [
      { title: 'A1', assigned_product: 'u1' }, { title: 'A2', assigned_product: 'u2' }, { title: 'A3', assigned_product: 'u3' },
    ] }] } },
    products: [wolny('u1'), wolny('u2'), wolny('u3')],
  };
  let env;
  // Jak imagemappro: przełącza artboard (tu: ten sam) i od razu zgłasza zmianę piętra.
  const imp = { instances: { mapa }, highlightObject(m, t) { wywolania.push(t); env.zmianaPietra(); } };
  env = await start({ koperta: koperta([]), cfg: { 'd2-ma-highlight': '' }, imp });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  env.ma.highlight();
  env.klatka(); env.klatka(); env.klatka(); env.klatka();
  assert.deepEqual(wywolania, ['A1', 'A2', 'A3'], 'każdy kształt raz, w kolejnych klatkach');
});

test('mapa: preferencja z tej wizyty podświetla się po zmianie piętra; powtórzony tytuł pomijany', async () => {
  const wolny = (id) => ({ id, name: id, rooms: 2, status: 'available' });
  const wywolania = [];
  const mapa = {
    artboardController: { currentArtboardId: 'p1' },
    store: { state: { artboards: [
      { id: 'p1', children: [{ title: 'A1', assigned_product: 'u1' }] },
      { id: 'p2', children: [{ title: 'B1', assigned_product: 'u2' }, { title: 'A1', assigned_product: 'u3' }] },
    ] } },
    products: [wolny('u1'), wolny('u2'), wolny('u3')],
  };
  const imp = { instances: { mapa }, highlightObject(m, t) { wywolania.push(t); } };
  // Nowy odwiedzający: przy starcie nie ma preferencji, więc nic się nie podświetla.
  const env = await start({ koperta: koperta([]), cfg: { 'd2-ma-highlight': '' }, imp });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  mapa.artboardController.currentArtboardId = 'p2';
  env.zmianaPietra();
  env.klatka(); env.klatka();
  assert.deepEqual(wywolania, ['B1'], 'B1 tak, A1 (tytuł także na p1) nie');
});

test('2destate: obrazek z pola rejestru obrazek-popup, hasło z haslo-promocji', async () => {
  const env = await start({ koperta: koperta([]) });
  env.klik({ id: 'u1', name: 'A/1/02', rooms: 2, status: 'available', 'obrazek-popup': 'https://cdn.example/a.jpg', image: 'https://cdn.example/plan.png', 'haslo-promocji': 'Rabat 5%', promo_active: true });
  await env.gotowe();
  const u = env.ma.history()[0].unit;
  assert.equal(u.image, 'https://cdn.example/a.jpg');
  assert.equal(u.promoText, 'Rabat 5%');
  env.klik({ id: 'u2', name: 'A/1/03', rooms: 2, status: 'available', image: 'https://cdn.example/plan.png' });
  await env.gotowe();
  assert.equal(env.ma.history()[1].unit.image, 'https://cdn.example/plan.png', 'bez pola rejestru: image');
  assert.equal(env.ma.history()[1].unit.promoText, null);
  // Products API v2: pola rejestru tylko pod fields.
  env.klik({ id: 'u3', name: 'A/1/04', rooms: 2, status: 'available', promo_active: true, fields: { 'obrazek-popup': 'https://cdn.example/c.jpg', 'haslo-promocji': 'Ostatnie 3' } });
  await env.gotowe();
  assert.equal(env.ma.history()[2].unit.image, 'https://cdn.example/c.jpg');
  assert.equal(env.ma.history()[2].unit.promoText, 'Ostatnie 3');
  // Nie-tekst z rejestru (obiekt, liczba) = brak pola, nie „[object Object]".
  env.klik({ id: 'u4', name: 'A/1/05', rooms: 2, status: 'available', image: 'https://cdn.example/plan.png', 'obrazek-popup': { url: 'https://cdn.example/d.jpg' }, promo_active: true, fields: { 'haslo-promocji': 5 } });
  await env.gotowe();
  assert.equal(env.ma.history()[3].unit.image, 'https://cdn.example/plan.png');
  assert.equal(env.ma.history()[3].unit.promoText, null);
  // Promocja wyłączona, hasło zostało w rejestrze: nie pokazujemy go.
  env.klik({ id: 'u5', name: 'A/1/06', rooms: 2, status: 'available', promo_active: false, 'haslo-promocji': 'Rabat 5%' });
  await env.gotowe();
  assert.equal(env.ma.history()[4].unit.promoText, null);
});

test('mapa: grupa o tym samym tytule co kształt nie wyłącza jego podświetlenia', async () => {
  const wywolania = [];
  const mapa = {
    artboardController: { currentArtboardId: 'p1' },
    store: { state: { artboards: [{ id: 'p1', children: [
      { title: 'A/1/02', type: 'group', children: [{ title: 'A/1/02', assigned_product: 'u1' }] },
    ] }] } },
    products: [{ id: 'u1', name: 'A/1/02', rooms: 2, status: 'available' }],
  };
  const imp = { instances: { mapa }, highlightObject(m, t) { wywolania.push(t); } };
  const env = await start({ koperta: koperta([]), cfg: { 'd2-ma-highlight': '' }, imp });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  env.ma.highlight();
  assert.deepEqual(wywolania, ['A/1/02']);
});

test('mapa: highlightObject przełączający piętro synchronicznie nie odpala następnego kształtu w tej samej klatce', async () => {
  const wolny = (id) => ({ id, name: id, rooms: 2, status: 'available' });
  const wywolania = [];
  const mapa = {
    artboardController: { currentArtboardId: 'p1' },
    store: { state: { artboards: [
      { id: 'p1', children: [{ title: 'A1', assigned_product: 'u1' }] },
      { id: 'p2', children: [{ title: 'B1', assigned_product: 'u2' }] },
    ] } },
    products: [wolny('u1'), wolny('u2')],
  };
  let env;
  const imp = {
    instances: { mapa },
    highlightObject(m, t) {
      wywolania.push(t);
      if (t === 'A1') { mapa.artboardController.currentArtboardId = 'p2'; env.zmianaPietra(); }
    },
  };
  env = await start({ koperta: koperta([]), cfg: { 'd2-ma-highlight': '' }, imp });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  env.ma.highlight();
  assert.deepEqual(wywolania, ['A1'], 'B1 czeka na następną klatkę');
  env.klatka();
  assert.deepEqual(wywolania, ['A1', 'B1']);
});

// gtag() wkłada do dataLayer obiekt arguments, nie tablicę.
function gtag() { return arguments; }

test('reguła „lub”: zgoda wymagana, gdy JSON true albo atrybut true — cztery kombinacje', async () => {
  const przypadki = [
    { json: false, attr: null, wymagana: false },
    { json: false, attr: 'true', wymagana: true },
    { json: true, attr: null, wymagana: true },
    { json: true, attr: 'true', wymagana: true },
    { json: true, attr: 'false', wymagana: true }, // atrybut nie wyłącza zgody
  ];
  for (const p of przypadki) {
    const opis = 'JSON ' + p.json + ' × atrybut ' + p.attr;
    const env = await start({
      koperta: koperta([POKOJE], { storage: { consentRequired: p.json }, demoState: { crmCallResult: null, crmCallSeq: 0, timeScale: 60 } }),
      cfg: p.attr == null ? {} : { 'd2-ma-consent-required': p.attr },
    });
    for (const id of ['A_1', 'A_2', 'A_3']) { env.dataLayer.push(unitOpen(id)); await env.minie(6000); }
    if (!p.wymagana) {
      assert.equal(env._dysk.views.length, 3, opis);
      assert.equal(env.segmenty().length, 1, opis);
      continue;
    }
    assert.ok(!(env._dysk.views || []).length, opis + ': nic w IndexedDB');
    assert.ok(!env._dysk.state, opis + ': brak rekordu state');
    assert.equal(env.segmenty().length, 0, opis + ': brak dataLayer.push akcji');
    assert.equal(env.popupy.length, 0, opis);
    env.dataLayer.push(gtag('consent', 'update', { analytics_storage: 'granted' }));
    await env.gotowe();
    for (const id of ['A_4', 'A_5', 'A_6']) { env.dataLayer.push(unitOpen(id)); await env.minie(6000); }
    assert.equal(env._dysk.views.length, 3, opis + ': po zgodzie zapis rusza');
    assert.equal(env.segmenty().length, 1, opis + ': po zgodzie scenariusz rusza');
    // demoState działa przy JSON false także wtedy, gdy atrybut wymusza zgodę.
    assert.equal(env.ma.profile().timeScale, p.json ? 1 : 60, opis + ': demoState');
  }
});

test('Consent Mode z banera: komendy gtag w dataLayer odblokowują i wycofują', async () => {
  const k = koperta([], { storage: { consentRequired: true } });
  // Baner zgłosił zgodę, zanim moduł wystartował (zapisana decyzja z ciasteczka CMP).
  const dl = [gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied' }), gtag('consent', 'update', { analytics_storage: 'granted' })];
  const env = await start({ koperta: k, dataLayer: dl });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.equal(env._dysk.views.length, 1, 'zgoda z dataLayer sprzed startu');
  env.dataLayer.push(gtag('consent', 'update', { analytics_storage: 'denied' }));
  await env.gotowe();
  assert.equal(env._dysk.cleared, 1, 'wycofanie kasuje bazę');
  env.dataLayer.push(unitOpen('A_2'));
  await env.gotowe();
  assert.ok(!env._dysk.views.length);

  // Sama domyślna odmowa nie otwiera, inna kategoria też nie.
  const p2 = await start({ koperta: k, dataLayer: [gtag('consent', 'default', { analytics_storage: 'denied' })] });
  p2.dataLayer.push(gtag('consent', 'update', { ad_storage: 'granted' }));
  p2.dataLayer.push(unitOpen('A_1'));
  await p2.gotowe();
  assert.ok(!(p2._dysk.views || []).length);
  p2.dataLayer.push(gtag('consent', 'update', { analytics_storage: 'granted' }));
  p2.dataLayer.push(unitOpen('A_2'));
  await p2.gotowe();
  assert.equal(p2._dysk.views.length, 1, 'zgoda nadana w trakcie wizyty');
});

test('Consent Mode: kolejność źródeł — update, tag Google, default, default z region tylko jako odmowa', async () => {
  const k = koperta([], { storage: { consentRequired: true } });
  const zapisuje = async (opts) => {
    const env = await start(Object.assign({ koperta: k }, opts));
    env.dataLayer.push(unitOpen('A_1'));
    await env.gotowe();
    return (env._dysk.views || []).length === 1;
  };
  const ics = (v) => ({ ics: { entries: { analytics_storage: { default: v } } } });
  // update z dataLayer rozstrzyga, nawet wbrew stanowi tagu Google, który za nim nie nadąża.
  assert.equal(await zapisuje({ dataLayer: [gtag('consent', 'update', { analytics_storage: 'granted' })], googleTag: ics(false) }), true);
  assert.equal(await zapisuje({ dataLayer: [gtag('consent', 'update', { analytics_storage: 'denied' })], googleTag: ics(true) }), false);
  // Bez update: tag Google przed default.
  assert.equal(await zapisuje({ dataLayer: [gtag('consent', 'default', { analytics_storage: 'denied' })], googleTag: ics(true) }), true);
  // default z region dla EOG + default granted: tag Google (liczy region) ma odmowę → odmowa.
  // (osobna tablica na każde wejście: moduł podpina się pod dataLayer raz)
  const regiony = () => [gtag('consent', 'default', { analytics_storage: 'denied', region: ['PL', 'DE'] }), gtag('consent', 'default', { analytics_storage: 'granted' })];
  assert.equal(await zapisuje({ dataLayer: regiony(), googleTag: ics(false) }), false);
  // Bez tagu Google (wolny gtag.js, adblock): regionalna odmowa wygrywa z ogólnym default.
  assert.equal(await zapisuje({ dataLayer: regiony() }), false);
  // Sam default bez region rozstrzyga.
  assert.equal(await zapisuje({ dataLayer: [gtag('consent', 'default', { analytics_storage: 'granted' })] }), true);
  // Sam default z region: odmowa liczy się, zgoda nie.
  assert.equal(await zapisuje({ dataLayer: [gtag('consent', 'default', { analytics_storage: 'denied', region: ['PL'] })], zgoda: { analytics_storage: 'granted' } }), false);
  assert.equal(await zapisuje({ dataLayer: [gtag('consent', 'default', { analytics_storage: 'granted', region: ['PL'] })] }), false);
  // Zwykła tablica to nie komenda gtag - tag Google jej nie wykona.
  assert.equal(await zapisuje({ dataLayer: [['consent', 'update', { analytics_storage: 'granted' }]] }), false);
});

test('Consent Mode z szablonu CMP: odmowa w stanie tagu Google kasuje bazę w tej samej wizycie', async () => {
  const tag = { ics: { entries: { analytics_storage: { default: false, update: true } } } };
  const env = await start({ koperta: koperta([], { storage: { consentRequired: true } }), googleTag: tag });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.equal(env._dysk.views.length, 1);
  tag.ics.entries.analytics_storage.update = false;
  env.dataLayer.push({ event: 'cookie_consent_update' });
  await env.gotowe();
  assert.equal(env._dysk.cleared, 1, 'odmowa z szablonu kasuje bazę od razu');
  env.dataLayer.push(unitOpen('A_2'));
  await env.gotowe();
  assert.ok(!env._dysk.views.length);
});

test('Consent Mode: odmowa w trakcie otwierania bazy nie otwiera jej', async () => {
  const env = await start({ koperta: koperta([], { storage: { consentRequired: true } }) });
  env.dataLayer.push(gtag('consent', 'update', { analytics_storage: 'granted' }));
  env.dataLayer.push(gtag('consent', 'update', { analytics_storage: 'denied' }));
  await env.gotowe();
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.ok(!(env._dysk.views || []).length);
  assert.equal(env.ma.profile(), null);
});

test('Consent Mode: obejrzenie sprzed zgody nie wraca, gdy zgoda przyjdzie w trakcie startu', async () => {
  const dl = [unitOpen('A_1'), gtag('consent', 'update', { analytics_storage: 'granted' }), unitOpen('A_2')];
  const env = await start({ koperta: koperta([], { storage: { consentRequired: true } }), dataLayer: dl });
  assert.deepEqual(env._dysk.views.map((v) => v.unit.unitId), ['A_2'], 'tylko to, co po zgodzie');
  // Bez wymaganej zgody bufor wraca w całości.
  const p2 = await start({ koperta: koperta([]), dataLayer: [unitOpen('A_1')] });
  assert.equal(p2._dysk.views.length, 1);
});

test('Consent Mode z szablonu CMP w GTM: stan tagu Google odblokowuje', async () => {
  const tag = { ics: { entries: { analytics_storage: { default: false } } } };
  const env = await start({ koperta: koperta([], { storage: { consentRequired: true } }), googleTag: tag });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.ok(!(env._dysk.views || []).length, 'domyślna odmowa');
  tag.ics.entries.analytics_storage.update = true;
  env.dataLayer.push({ event: 'cookie_consent_update' });
  await env.gotowe();
  env.dataLayer.push(unitOpen('A_2'));
  await env.gotowe();
  assert.equal(env._dysk.views.length, 1, 'zgoda z szablonu widoczna przy następnym zdarzeniu');

  const p2 = await start({ koperta: koperta([], { storage: { consentRequired: true } }), googleTag: { ics: { entries: { analytics_storage: { default: false, update: true } } } } });
  p2.dataLayer.push(unitOpen('A_1'));
  await p2.gotowe();
  assert.equal(p2._dysk.views.length, 1, 'zgoda z tagu Google przy starcie');
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

test('popup: z Products API tylko pola zmienne, budynek i nazwa zostają z kliknięcia na mapie', async () => {
  const id = '12345678-1234-4234-8234-123456789012';
  const pola = {};
  const el = (k) => (pola[k] = element({ 'd2-ma-field': k }, k === 'image' ? 'IMG' : 'DIV'));
  const lista = ['image', 'name', 'building', 'price', 'promoText'].map(el);
  const s = element({ 'd2-ma-popup': 'last-unit' });
  s.querySelectorAll = (sel) => (sel.indexOf('d2-ma-field') >= 0 ? lista : []);
  const p1 = await start({ koperta: koperta([POWROT]), szablon: s });
  p1.klik({ id, name: 'B.1.05', building_name: 'Budynek B', rooms: 2, status: 'available', price_gross: 600000 });
  await p1.gotowe();
  const api = () => [{ id, name: 'inna nazwa', building_id: 7, status: 'available', price_gross: 580000,
    promo_active: true, fields: { 'obrazek-popup': 'https://cdn.example/a.jpg', 'haslo-promocji': 'Rabat 5%' } }];
  const p2 = await powrot(p1, 2 * H, { mapa: false, api, szablon: s });
  assert.equal(p2.popupy.length, 1);
  assert.equal(pola.name.textContent, 'B.1.05');
  assert.equal(pola.building.textContent, 'Budynek B', 'API bez building_name nie czyści budynku');
  assert.equal(pola.price.textContent.replace(/\s/g, ' '), '580 000 zł', 'cena świeża z API');
  assert.equal(pola.promoText.textContent, 'Rabat 5%');
  assert.equal(pola.image.getAttribute('src'), 'https://cdn.example/a.jpg');
});

test('popup: promocja usunięta w 2destate znika po świeżym odczycie (API i mapa)', async () => {
  const id = '12345678-1234-4234-8234-123456789012';
  const pola = {};
  const lista = ['image', 'promoText'].map((k) => (pola[k] = element({ 'd2-ma-field': k }, k === 'image' ? 'IMG' : 'DIV')));
  const s = element({ 'd2-ma-popup': 'last-unit' });
  s.querySelectorAll = (sel) => (sel.indexOf('d2-ma-field') >= 0 ? lista : []);
  const produkt = { id, name: 'B.1.05', rooms: 2, status: 'available', promo_active: true, 'obrazek-popup': 'https://cdn.example/a.jpg', 'haslo-promocji': 'Rabat 5%' };
  const p1 = await start({ koperta: koperta([POWROT]), szablon: s });
  p1.klik(produkt);
  await p1.gotowe();
  assert.equal(p1.ma.history()[0].unit.promoText, 'Rabat 5%');
  // Strona bez mapy: Products API już bez hasła i obrazka.
  const p2 = await powrot(p1, 2 * H, { mapa: false, szablon: s, api: () => [{ id, status: 'available', fields: {} }] });
  assert.equal(p2.popupy.length, 1);
  assert.notEqual(pola.promoText.textContent, 'Rabat 5%', 'wygasła promocja nie wraca z IndexedDB');
  assert.equal(pola.promoText.style.display, 'none');
  assert.equal(pola.image.style.display, 'none');
  // Strona z mapą (osobny odwiedzający): produkt na mapie już bez hasła.
  pola.promoText.textContent = '';
  pola.promoText.style.display = '';
  const m1 = await start({ koperta: koperta([POWROT]), szablon: s });
  m1.klik(produkt);
  await m1.gotowe();
  const m2 = await powrot(m1, 2 * H, { szablon: s, produkty: [{ id, name: 'B.1.05', rooms: 2, status: 'available' }] });
  assert.equal(m2.popupy.length, 1);
  assert.equal(pola.promoText.style.display, 'none', 'mapa bez hasła = brak hasła');
});

test('popup: wiersz API bez fields nie czyści hasła ani obrazka; wiersz bez id zostawia zapis', async () => {
  const id = '12345678-1234-4234-8234-123456789012';
  const pola = {};
  const lista = ['image', 'promoText', 'name'].map((k) => (pola[k] = element({ 'd2-ma-field': k }, k === 'image' ? 'IMG' : 'DIV')));
  const s = element({ 'd2-ma-popup': 'last-unit' });
  s.querySelectorAll = (sel) => (sel.indexOf('d2-ma-field') >= 0 ? lista : []);
  const produkt = { id, name: 'B.1.05', rooms: 2, status: 'available', promo_active: true, 'obrazek-popup': 'https://cdn.example/a.jpg', 'haslo-promocji': 'Rabat 5%' };
  const p1 = await start({ koperta: koperta([POWROT]), szablon: s });
  p1.klik(produkt);
  await p1.gotowe();
  const p2 = await powrot(p1, 2 * H, { mapa: false, szablon: s, api: () => [{ id, status: 'available', promo_active: true }] });
  assert.equal(p2.popupy.length, 1);
  assert.equal(pola.promoText.textContent, 'Rabat 5%', 'bez fields: nie wiemy, nie czyścimy');
  assert.equal(pola.image.getAttribute('src'), 'https://cdn.example/a.jpg');
  // Wiersz bez id: bez wyjątku, popup z zapisanego lokalu.
  const m1 = await start({ koperta: koperta([POWROT]), szablon: s });
  m1.klik(produkt);
  await m1.gotowe();
  pola.name.textContent = '';
  const m2 = await powrot(m1, 2 * H, { mapa: false, szablon: s, api: () => [{ status: 'sold' }] });
  assert.equal(m2.popupy.length, 1);
  assert.equal(pola.name.textContent, 'B.1.05');
  assert.equal(m2.ostrzezenia.length, 0);
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
  await env.minie(1000);
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

// ---------------------------------------------------------------------------
// Poprawki z recenzji (U1–U6)
// ---------------------------------------------------------------------------

function szablonPopupu() {
  const img = element({ 'd2-ma-field': 'image' }, 'IMG');
  const nazwa = element({ 'd2-ma-field': 'name' });
  const cta = element({ 'd2-ma-cta': '' }, 'A');
  const s = element({ 'd2-ma-popup': 'last-unit' });
  s.querySelectorAll = (sel) => (sel.indexOf('d2-ma-field') >= 0 ? [img, nazwa] : sel.indexOf('d2-ma-cta') >= 0 ? [cta] : []);
  return { s, img, nazwa, cta };
}

async function popupZLokalem(unit) {
  const t = szablonPopupu();
  const p1 = await start({ koperta: koperta([POWROT]), szablon: t.s });
  p1.ma.track(unit);
  await p1.gotowe();
  const p2 = await powrot(p1, 2 * H);
  assert.equal(p2.popupy.length, 1);
  return t;
}

test('U1: adres lokalu bez gclid, UTM i innych parametrów strony', async () => {
  const env = await start({ koperta: koperta([]), search: '?sm-unit=A_9&gclid=abc&utm_source=fb&email=x%40y.pl' });
  const e = unitOpen('A_1');
  e.appData.us = '?sm-unit=A_1&sm-media=Tour&fbclid=zzz';
  env.dataLayer.push(e);
  env.ma.track({ unitId: 'B_1', url: 'https://demo.example/lokal?utm_campaign=x&d2-unit=B_1#top' });
  env.ma.track({ unitId: 'B_2', url: 'javascript:alert(1)' });
  await env.gotowe();
  assert.deepEqual(env.ma.history().map((v) => v.unit.url), [
    'https://demo.example/oferta?sm-unit=A_9',
    'https://demo.example/oferta?sm-unit=A_1',
    'https://demo.example/lokal?d2-unit=B_1',
    'https://demo.example/oferta',
  ]);
});

test('U4: obrazek popupu tylko z https:', async () => {
  const zly = await popupZLokalem({ unitId: 'A_1', name: 'A.1', image: 'javascript:alert(1)' });
  assert.equal(zly.img.getAttribute('src'), null);
  assert.equal(zly.img.style.display, 'none');
  const http = await popupZLokalem({ unitId: 'A_1', name: 'A.1', image: 'http://cdn.example/a.jpg' });
  assert.equal(http.img.getAttribute('src'), null);
  const ok = await popupZLokalem({ unitId: 'A_1', name: 'A.1', image: 'https://cdn.example/a.jpg' });
  assert.equal(ok.img.getAttribute('src'), 'https://cdn.example/a.jpg');
  assert.equal(ok.nazwa.textContent, 'A.1');
});

test('U5: link CTA tylko https: albo ten sam origin', async () => {
  const obcy = await popupZLokalem({ unitId: 'A_1', url: 'http://obcy.example/x' });
  assert.equal(obcy.cta.getAttribute('href'), null);
  const swoj = await popupZLokalem({ unitId: 'A_1', url: 'https://demo.example/oferta?sm-unit=A_1' });
  assert.equal(swoj.cta.getAttribute('href'), 'https://demo.example/oferta?sm-unit=A_1');
});

test('U6: reguła 1 — zdarzenie w tej samej milisekundzie co poprzedni krok nie jest „po"', async () => {
  const sc = {
    scenarioId: 'lead-potem-lokal', revision: 1, active: true,
    nodes: [
      { id: 't1', type: 'trigger', when: { event: 'lead' } },
      { id: 't2', type: 'trigger', when: { event: 'unit_view', unitIds: [] } },
      { id: 'a1', type: 'action', do: 'datalayer', event: 'ma_segment', params: { segment: 'po-leadzie' } },
    ],
    edges: [['t1', 't2'], ['t2', 'a1']],
  };
  const env = await start({ koperta: koperta([sc]) });
  await env.minie(1000);
  env.dataLayer.push({ event: 'generate_lead' });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.equal(env.segmenty().length, 0);
  await env.minie(1);
  env.dataLayer.push(unitOpen('A_2'));
  await env.gotowe();
  assert.equal(env.segmenty().length, 1);
});

test('reguła 1: obejrzenie zaraz po otwarciu wizyty liczy się jako „po powrocie"', async () => {
  const sc = {
    scenarioId: 'wrocil-i-oglada', revision: 1, active: true,
    nodes: [
      { id: 't1', type: 'trigger', when: { event: 'return_visit' } },
      { id: 't2', type: 'trigger', when: { event: 'unit_view', unitIds: [] } },
      { id: 'a1', type: 'action', do: 'datalayer', event: 'ma_segment', params: { segment: 'wrocil' } },
    ],
    edges: [['t1', 't2'], ['t2', 'a1']],
  };
  const p1 = await start({ koperta: koperta([sc]) });
  const p2 = await powrot(p1, 2 * H, { search: '?sm-unit=A_1' });
  assert.equal(p2.segmenty().length, 1);
});

test('wycofanie zgody kasuje bazę', async () => {
  const env = await start({ koperta: koperta([], { storage: { consentRequired: true } }), zgoda: { analytics_storage: 'granted' } });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.equal(env._dysk.views.length, 1);
  env.zgoda({ analytics_storage: 'denied' });
  await env.gotowe();
  assert.equal(env._dysk.cleared, 1);
  assert.ok(!env._dysk.views.length);
  assert.equal(env.ma.profile(), null);
  const zmiany = env.zdarzenia['ma:change'] || [];
  assert.deepEqual({ ...zmiany[zmiany.length - 1] }, { cleared: true, tracking: false, reason: 'consent withdrawn' },
    'strona dostaje zdarzenie, żeby pokazać „brak zgody"');
  env.dataLayer.push(unitOpen('A_2'));
  await env.gotowe();
  assert.ok(!env._dysk.views.length, 'po wycofaniu nic nie wraca do bazy');
});

test('U3: koperta przełączona na consentRequired kasuje bazę — w trakcie i przy następnym wejściu', async () => {
  const p1 = await start({ koperta: koperta([]) });
  p1.dataLayer.push(unitOpen('A_1'));
  await p1.gotowe();
  await p1.ma.load(koperta([], { storage: { consentRequired: true } }));
  await p1.gotowe();
  assert.equal(p1._dysk.cleared, 1);
  assert.equal(p1.ma.profile(), null);
  // Baza z czasów bez zgody, następne wejście już z wymaganą zgodą.
  const dysk = {};
  const p2 = await start({ dysk, koperta: koperta([]) });
  p2.dataLayer.push(unitOpen('A_1'));
  await p2.gotowe();
  const p3 = await powrot(p2, MIN, { koperta: koperta([], { storage: { consentRequired: true } }) });
  assert.equal(p3._dysk.cleared, 1);
  assert.ok(!p3._dysk.views.length);
});

test('retencja rekordu state: profil starszy niż retencja zaczyna się od nowa', async () => {
  const k = koperta([POKOJE], { storage: { retentionDays: 90, consentRequired: false } });
  const p1 = await start({ koperta: k });
  for (const id of ['A_1', 'A_2', 'A_3']) { p1.dataLayer.push(unitOpen(id)); await p1.minie(6000); }
  const id1 = p1.ma.profile().visitorId;
  assert.ok(p1._dysk.state.scenarios['preferencja-2'].freq.a2);
  const p2 = await powrot(p1, 91 * 24 * H);
  assert.notEqual(p2.ma.profile().visitorId, id1);
  assert.equal(p2.ma.profile().visits, 1);
  assert.deepEqual(p2._dysk.state.scenarios['preferencja-2'].freq, {});
});

test('U6: lead w tej samej milisekundzie co obejrzenie nie jest „po" nim', async () => {
  const sc = {
    scenarioId: 'lokal-potem-lead', revision: 1, active: true,
    nodes: [
      { id: 't1', type: 'trigger', when: { event: 'unit_view', unitIds: [] } },
      { id: 't2', type: 'trigger', when: { event: 'lead' } },
      { id: 'a1', type: 'action', do: 'datalayer', event: 'ma_segment_exit', params: { segment: 'lead' } },
    ],
    edges: [['t1', 't2'], ['t2', 'a1']],
  };
  const env = await start({ koperta: koperta([sc]) });
  await env.minie(1000);
  env.dataLayer.push(unitOpen('A_1'));
  env.dataLayer.push({ event: 'generate_lead' });
  await env.gotowe();
  assert.equal(env.segmenty().length, 0);
  await env.minie(1);
  env.dataLayer.push({ event: 'generate_lead' });
  await env.gotowe();
  assert.equal(env.segmenty().length, 1);
});

test('U7: obejrzenie, które uruchomiło ścieżkę, nie liczy się do następnego wyzwalacza za akcją', async () => {
  const sc = {
    scenarioId: 'u7', revision: 1, active: true,
    nodes: [
      { id: 't1', type: 'trigger', when: { event: 'unit_view', unitIds: ['A_1'] } },
      { id: 'a1', type: 'action', do: 'datalayer', event: 'ma_segment', params: { segment: 'first' } },
      { id: 't2', type: 'trigger', when: { event: 'type_view', rooms: 2, minCount: 2 } },
      { id: 'a2', type: 'action', do: 'datalayer', event: 'ma_segment', params: { segment: 'second' } },
    ],
    edges: [['t1', 'a1'], ['a1', 't2'], ['t2', 'a2']],
  };
  const env = await start({ koperta: koperta([sc]) });
  // Pierwsze obejrzenie otwiera wizytę - jego czas jest podbity do visitStart + 1.
  env.dataLayer.push(unitOpen('A_1'));
  await env.minie(6000);
  env.dataLayer.push(unitOpen('A_2'));
  await env.gotowe();
  assert.deepEqual(env.segmenty().map((e) => e.segment), ['first'], 'po a1 było tylko jedno obejrzenie');
  await env.minie(6000);
  env.dataLayer.push(unitOpen('A_3'));
  await env.gotowe();
  assert.deepEqual(env.segmenty().map((e) => e.segment), ['first', 'second']);
});

// ---------------------------------------------------------------------------
// §13.8 (ma.4): wyjście, zaangażowanie, porzucony formularz, treść, mapa, kanały
// ---------------------------------------------------------------------------

/** Scenariusz z jednym wyzwalaczem i akcjami po kolei. */
function scenariusz(id, when, akcje, extra) {
  const nodes = [{ id: 't1', type: 'trigger', when }].concat(akcje.map((a, i) => Object.assign({ id: 'a' + (i + 1), type: 'action' }, a)));
  const edges = akcje.map((a, i) => [i ? 'a' + i : 't1', 'a' + (i + 1)]);
  return Object.assign({ scenarioId: id, revision: 1, active: true, nodes, edges }, extra || {});
}

const DL = (event, params) => ({ do: 'datalayer', event, params });

test('§13.8 opt-in: koperta bez nowych wyzwalaczy nie dokłada nasłuchu na stronie', async () => {
  const env = await start({ koperta: koperta([POWROT, POKOJE, LEAD]) });
  for (const n of ['mouseout', 'focusin', 'input', 'visibilitychange']) {
    assert.equal((env.naDokumencie[n] || []).length, 0, n);
  }
  // Kontekst leadu (ma.16) słucha submit niezależnie od koperty — i tylko on
  // (click ma już przyciski strony: d2-ma-clear, d2-ma-simulate-return).
  assert.equal((env.naDokumencie.submit || []).length, 1, 'submit: tylko kontekst leadu');
  assert.equal((env.naOknie.scroll || []).length, 0);
  assert.equal((env.naOknie.pagehide || []).length, 0);
});

test('exit_intent: mysz przez górną krawędź, raz na wizytę; dotyk i brak zgody — nic', async () => {
  const k = koperta([scenariusz('wyjscie', { event: 'exit_intent' }, [Object.assign(DL('ma_exit_intent'), { frequency: 'once_per_days:0' })])]);
  const env = await start({ koperta: k });
  env.dom('mouseout', { clientY: 40, relatedTarget: null });
  env.dom('mouseout', { clientY: -2, relatedTarget: { tagName: 'DIV' } });
  await env.gotowe();
  assert.equal(env.segmenty().length, 0, 'ruch wewnątrz strony to nie wyjście');
  env.dom('mouseout', { clientY: -2, relatedTarget: null });
  env.dom('mouseout', { clientY: 0, relatedTarget: null });
  await env.gotowe();
  assert.deepEqual(env.segmenty().map((e) => ({ ...e })), [{ event: 'ma_exit_intent', ma_scenario: 'wyjscie' }]);

  const dotyk = await start({ koperta: k, dotyk: true });
  assert.equal((dotyk.naDokumencie.mouseout || []).length, 0, 'ekran dotykowy: bez nasłuchu');

  const bez = await start({ koperta: koperta(k.scenarios, { storage: { consentRequired: true } }) });
  assert.equal((bez.naDokumencie.mouseout || []).length, 0, 'bez zgody: bez nasłuchu');
  assert.equal(bez.ma.profile(), null);
});

test('engagement: aktywny czas (bez ukrytej karty) i przewinięcie, raz na odsłonę', async () => {
  const k = koperta([scenariusz('zaangazowany', { event: 'engagement', minSeconds: 30, minScrollPct: 50 },
    [DL('ma_engaged', { segment: 'nie-zmienia' })])]);
  const env = await start({ koperta: k });
  await env.minie(31000);
  assert.equal(env.segmenty().length, 0, 'czas jest, przewinięcia brak');
  env.window.pageYOffset = 1200; // 60% z 3000 − 1000
  env.okno('scroll');
  await env.gotowe();
  const e = env.segmenty();
  assert.equal(e.length, 1);
  assert.equal(e[0].event, 'ma_engaged');
  assert.ok(e[0].seconds >= 30 && e[0].scroll_pct === 60, JSON.stringify(e[0]));
  env.window.pageYOffset = 2000;
  env.okno('scroll');
  await env.minie(60000);
  assert.equal(env.segmenty().length, 1, 'raz na odsłonę');
  assert.equal(env.ma.profile().segment, null, 'segment z params ma_engaged nie zmienia segmentu profilu');

  // Ukryta karta nie liczy się do czasu.
  const k2 = koperta([scenariusz('czas', { event: 'engagement', minSeconds: 20 }, [DL('ma_engaged')])]);
  const env2 = await start({ koperta: k2 });
  await env2.minie(10000);
  env2.document.visibilityState = 'hidden';
  env2.dom('visibilitychange');
  await env2.minie(60000);
  assert.equal(env2.segmenty().length, 0, 'w tle czas stoi');
  env2.document.visibilityState = 'visible';
  env2.dom('visibilitychange');
  await env2.minie(9000);
  assert.equal(env2.segmenty().length, 0, '19 s aktywnie');
  await env2.minie(2000);
  assert.equal(env2.segmenty().length, 1, '21 s aktywnie');
});

test('engagement: filtr utm z adresu pierwszego wejścia w wizycie, bez wielkości liter; profil bez segmentu z ma_engaged', async () => {
  // once_per_days:0 - akcja za każdym razem, żeby było widać wyzwalacz na drugiej odsłonie.
  const z = (id, utm) => scenariusz(id, { event: 'engagement', minSeconds: 0, minScrollPct: 0, utm },
    [Object.assign(DL('ma_engaged'), { frequency: 'once_per_days:0' })]);
  const k = koperta([z('fb', { source: ['facebook', 'instagram'], campaign: ['2-pokoje'] }), z('google', { source: ['google'] })]);
  const env = await start({ koperta: k, search: '?utm_source=Facebook&utm_campaign=2-POKOJE&gclid=abc' });
  assert.deepEqual(env.segmenty().map((e) => e.ma_scenario), ['fb'], 'od razu, tylko pasujący');
  assert.equal(env.ma.profile().segment, null, 'ma_engaged nie zmienia segmentu');
  assert.deepEqual({ ...env._dysk.state.utm }, { source: 'Facebook', campaign: '2-POKOJE' }, 'bez gclid i innych parametrów');
  // Druga odsłona w tej samej wizycie bez UTM w adresie: wizyta nadal „z kampanii".
  const p2 = await powrot(env, 5 * MIN, { search: '' });
  assert.deepEqual(p2.segmenty().map((e) => e.ma_scenario), ['fb']);
  // Kolejna odsłona tej wizyty z innym UTM: liczy się pierwsze wejście.
  const p3 = await powrot(p2, 5 * MIN, { search: '?utm_source=google' });
  assert.deepEqual(p3.segmenty().map((e) => e.ma_scenario), ['fb']);
});

/** Formularz z polem e-mail (bez wartości w module). */
function formularz(attrs) {
  const form = element(Object.assign({ id: 'kontakt' }, attrs || {}), 'FORM');
  const pole = element({ type: 'email', name: 'email' }, 'INPUT');
  pole.parent = form;
  pole.value = 'jan@example.com';
  return { form, pole };
}

test('form_abandon: fokus bez wysłania → po idleSeconds; tylko id formularza, nigdy wartości', async () => {
  const k = koperta([scenariusz('porzucony', { event: 'form_abandon', idleSeconds: 60 },
    [Object.assign(DL('ma_form_abandon'), { frequency: 'once_per_days:0' })])]);
  const env = await start({ koperta: k });
  const { form, pole } = formularz();
  env.dom('focusin', { target: pole });
  await env.minie(30000);
  env.dom('input', { target: pole }); // pisze dalej - licznik od nowa
  await env.minie(45000);
  assert.equal(env.segmenty().length, 0);
  await env.minie(20000);
  const e = env.segmenty();
  assert.deepEqual(e.map((x) => ({ ...x })), [{ event: 'ma_form_abandon', ma_scenario: 'porzucony', form_id: 'kontakt', fields_touched: 1 }]);
  assert.ok(!JSON.stringify(env._dysk).includes('jan@example.com') && !JSON.stringify(env.dataLayer).includes('jan@'),
    'wartość pola nie trafia ani do bazy, ani do dataLayer');
  env.okno('pagehide');
  await env.gotowe();
  assert.equal(env.segmenty().length, 1, 'raz na formularz na wizytę');
  const p2 = await powrot(env, 5 * MIN);
  assert.equal(p2.segmenty().length, 0, 'wyjście po porzuceniu w tej wizycie nie liczy się drugi raz');
  void form;
});

test('form_abandon: wysłany formularz się nie liczy; d2-ma-ignore i formIds', async () => {
  const k = koperta([scenariusz('porzucony', { event: 'form_abandon', formIds: ['kontakt', 'ukryty'] },
    [Object.assign(DL('ma_form_abandon'), { frequency: 'once_per_days:0' })])]);
  const env = await start({ koperta: k });
  const a = formularz();
  env.dom('focusin', { target: a.pole });
  env.dom('submit', { target: a.form });
  await env.minie(10 * MIN);
  env.okno('pagehide');
  await env.gotowe();
  assert.equal(env.segmenty().length, 0, 'wysłany');
  assert.equal((await powrot(env, 5 * MIN)).segmenty().length, 0, 'wysłany — także po wyjściu');

  const env2 = await start({ koperta: k });
  const inny = formularz({ id: 'newsletter' });
  const ign = formularz({ id: 'ukryty', 'd2-ma-ignore': '' });
  const b = formularz();
  env2.dom('focusin', { target: inny.pole });
  env2.dom('focusin', { target: ign.pole });
  env2.dom('focusin', { target: b.pole });
  await env2.minie(61000);
  assert.deepEqual(env2.segmenty().map((e) => e.form_id), ['kontakt'], 'tylko formIds, bez d2-ma-ignore');
  env2.okno('pagehide');
  await env2.gotowe();
  assert.deepEqual((await powrot(env2, 5 * MIN)).segmenty().map((e) => e.form_id), [], 'po wyjściu też tylko formIds');
});

test('form_abandon przy pagehide: tylko fakt w d2ma, akcje przy następnej odsłonie (≤ 24 h), nic w chwili wyjścia', async () => {
  const k = koperta([scenariusz('porzucony', { event: 'form_abandon' },
    [DL('ma_form_abandon'), { do: 'webhook', channel: 'email', testOnly: true }])]);
  const env = await start({ koperta: k });
  const { pole, form } = formularz({ 'data-name': 'Kontakt' });
  env.dom('focusin', { target: pole });
  env.okno('pagehide');
  await env.gotowe();
  assert.equal(env.segmenty().length, 0, 'bez dataLayer przy wyjściu');
  assert.equal(env.webhooki.length, 0, 'bez webhooka przy wyjściu');
  const fakt = env._dysk.state.formExits;
  assert.equal(fakt.length, 1);
  assert.deepEqual([fakt[0].formId, fakt[0].name, fakt[0].fields], ['kontakt', 'Kontakt', 1]);
  assert.ok(!JSON.stringify(fakt).includes('jan@'));

  const p2 = await powrot(env, 10 * MIN);
  assert.deepEqual(p2.segmenty().map((e) => e.form_id), ['kontakt'], 'na następnej odsłonie');
  assert.equal(p2.webhooki.length, 1);
  assert.deepEqual([...(p2._dysk.state.formExits || [])], [], 'fakt zużyty');
  const p3 = await powrot(p2, 10 * MIN);
  assert.equal(p3.segmenty().length, 0, 'raz');

  // Starszy niż 24 h przepada.
  const e2 = await start({ koperta: k });
  e2.dom('focusin', { target: formularz().pole });
  e2.okno('pagehide');
  await e2.gotowe();
  const late = await powrot(e2, 25 * H);
  assert.equal(late.segmenty().length, 0);
  void form;
});

test('content: tekst z polami w [d2-ma-slot] przez textContent; brak wartości = bez zmiany; Wyczyść przywraca', async () => {
  const slot = element({ 'd2-ma-slot': 'hero-title' }, 'H1');
  slot.textContent = 'Mieszkania w Pabianicach';
  const tresc = (text) => scenariusz('naglowek', { event: 'type_view', rooms: 2, minCount: 1 },
    [{ do: 'content', slot: 'hero-title', text }, DL('ma_content')]);
  const env = await start({ koperta: koperta([tresc('{{pref.rooms}} pokoje — zobacz {{unit.name}} za {{unit.price}}')]), elementy: [slot] });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.equal(slot.textContent.replace(/\s/g, ' '), '2 pokoje — zobacz 1 za 829 212 zł');
  assert.deepEqual({ ...env.segmenty()[0] }, { event: 'ma_content', ma_scenario: 'naglowek', slot: 'hero-title' });
  await env.ma.clear();
  assert.equal(slot.textContent, 'Mieszkania w Pabianicach');

  const slot2 = element({ 'd2-ma-slot': 'hero-title' }, 'H1');
  slot2.textContent = 'Oryginał';
  const env2 = await start({ koperta: koperta([tresc('{{unit.building}} — {{unit.name}}')]), elementy: [slot2] });
  env2.dataLayer.push(unitOpen('A_1', { building: null }));
  await env2.gotowe();
  assert.equal(slot2.textContent, 'Oryginał', 'pole bez wartości: treść bez zmian');
  assert.equal(env2.segmenty().length, 0, 'ma_content nie idzie, skoro nic się nie zmieniło');
});

test('content: szablon z listy ma.4; zły węzeł (text i templateId, slot spoza [a-z0-9-]) jest pomijany', async () => {
  const slot = element({ 'd2-ma-slot': 'cta' }, 'P');
  slot.textContent = '—';
  const k = koperta([
    scenariusz('szablon', { event: 'type_view', rooms: 2, minCount: 1 }, [{ do: 'content', slot: 'cta', templateId: 'last-unit' }]),
    scenariusz('zly', { event: 'type_view', rooms: 2, minCount: 1 }, [{ do: 'content', slot: 'cta', text: 'x', templateId: 'last-unit' }]),
    scenariusz('zly-slot', { event: 'type_view', rooms: 2, minCount: 1 }, [{ do: 'content', slot: 'a"]', text: 'x' }]),
  ]);
  const env = await start({ koperta: k, elementy: [slot] });
  env.dataLayer.push(unitOpen('B_7'));
  await env.gotowe();
  assert.equal(slot.textContent, 'Wróć do lokalu 7');
  assert.equal(env.ostrzezenia.filter((w) => w.includes('content needs a slot')).length, 2);
});

test('map_mark: ranking z profilu bez sprzedanych; markProducts, a bez niego piętro + highlightObject', async () => {
  const p = (id, rooms, floor, status) => ({ id, name: id, rooms, floor, status });
  const produkty = [p('u1', 3, 1, 'available'), p('u2', 2, 1, 'sold'), p('u3', 2, 0, 'reserved'), p('u4', 2, 1, 'available'), p('u5', 2, 3, 'available')];
  const mapa = { artboardController: { currentArtboardId: 'p0' }, store: { state: { artboards: [
    { id: 'p1', children: [{ title: 'A4', assigned_product: 'u4' }] },
  ] } }, products: produkty };
  const wywolania = [];
  const imp = { instances: { mapa }, changeArtboard(m, a) { wywolania.push('piętro ' + a); }, highlightObject(m, t) { wywolania.push(t); } };
  const k = koperta([scenariusz('mapa', { event: 'type_view', rooms: 2, minCount: 2 }, [{ do: 'map_mark', by: 'both', limit: 2 }])]);
  const env = await start({ koperta: k, produkty, imp });
  env.dataLayer.push(unitOpen('X_1', { rooms: 2, floor: 1 }));
  env.dataLayer.push(unitOpen('X_2', { rooms: 2, floor: 1 }));
  await env.gotowe();
  assert.deepEqual(wywolania, ['piętro p1', 'A4'], 'najlepszy: 2 pokoje i 1. piętro, bez dymka');
  assert.deepEqual([...env.zdarzenia['ma:action'].find((a) => a.do === 'map_mark').units], ['u4', 'u3'],
    'u2 sprzedany odpada; w grupie kolejność z getProducts(), także zarezerwowany');

  const oznaczone = [];
  const env2 = await start({ koperta: k, produkty, imp });
  env2.window.d2estate.markProducts = (m, ids, o) => { oznaczone.push([m, [...ids], o.className]); return 2; };
  env2.dataLayer.push(unitOpen('X_1', { rooms: 2, floor: 1 }));
  env2.dataLayer.push(unitOpen('X_2', { rooms: 2, floor: 1 }));
  await env2.gotowe();
  assert.deepEqual(oznaczone, [['mapa', ['u4', 'u3'], 'd2-preferred']]);

  // className z prefiksem imp- (np. imp-object-hidden ukryłby lokale) albo d2-ma- → domyślna.
  for (const zla of ['imp-object-hidden', 'd2-ma-x']) {
    const ozn = [];
    const kz = koperta([scenariusz('mapa', { event: 'type_view', rooms: 2, minCount: 1 }, [{ do: 'map_mark', by: 'rooms', className: zla }])]);
    const e = await start({ koperta: kz, produkty, imp });
    e.window.d2estate.markProducts = (m, ids, o) => { ozn.push(o.className); return 1; };
    e.dataLayer.push(unitOpen('X_1', { rooms: 2, floor: 1 }));
    await e.gotowe();
    assert.deepEqual(ozn, ['d2-preferred'], zla);
  }
});

test('map_mark: strona bez 2destate — pominięty; mapa w trakcie ładowania — po onMapLoad', async () => {
  const k = koperta([scenariusz('mapa', { event: 'type_view', rooms: 2, minCount: 1 }, [{ do: 'map_mark', by: 'rooms' }, DL('ma_segment', { segment: 'dalej' })])]);
  const bez = await start({ koperta: k, mapa: false });
  bez.dataLayer.push(unitOpen('A_1'));
  await bez.gotowe();
  assert.deepEqual(bez.segmenty().map((e) => e.segment), ['dalej'], 'gałąź idzie dalej');

  const produkty = [];
  const oznaczone = [];
  const env = await start({ koperta: k, produkty, imp: { instances: { mapa: {} } } });
  env.window.d2estate.markProducts = (m, ids) => { oznaczone.push([...ids]); return 1; };
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.equal(oznaczone.length, 0, 'getProducts() puste - czeka');
  produkty.push({ id: 'u9', name: 'u9', rooms: 2, floor: 1, status: 'available' });
  env.mapaGotowa();
  assert.deepEqual(oznaczone, [['u9']], 'po onMapLoad');
  env.mapaGotowa();
  assert.equal(oznaczone.length, 1, 'raz');
});

test('minScript wyższy niż ma.4 ostrzega, scenariusze bez nowych węzłów działają', async () => {
  const env = await start({ koperta: koperta([POWROT], { minScript: 'ma.99' }) });
  assert.ok(env.ostrzezenia.some((w) => w.includes('needs d2-ma ma.99')));
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.equal(env.ma.history().length, 1);
});

test('§13.8.1 test zgodności: return_visit → popup i → engagement (utm) → popup; ma.3 tylko pierwsza gałąź', async () => {
  const sc = {
    scenarioId: 'zgodnosc', revision: 1, active: true,
    nodes: [
      { id: 't1', type: 'trigger', when: { event: 'return_visit', afterHours: 1 } },
      { id: 'a1', type: 'action', do: 'datalayer', event: 'ma_segment', params: { segment: 'powrot' } },
      { id: 't2', type: 'trigger', when: { event: 'engagement', minSeconds: 0, minScrollPct: 0, utm: { source: ['facebook'] } } },
      { id: 'a2', type: 'action', do: 'datalayer', event: 'ma_segment', params: { segment: 'kampania' } },
    ],
    edges: [['t1', 'a1'], ['t1', 't2'], ['t2', 'a2']],
  };
  const kod3 = fs.readFileSync(path.join(__dirname, 'fixtures', 'ma-v1.9.0-ma.3.js'), 'utf8');
  for (const [nazwa, kod, oczekiwane] of [['ma.4', null, ['powrot', 'kampania']], ['ma.3', kod3, ['powrot']]]) {
    const p1 = await start({ koperta: koperta([sc]), kod });
    p1.dataLayer.push(unitOpen('A_1'));
    await p1.gotowe();
    const p2 = await powrot(p1, 2 * H, { search: '?utm_source=facebook' });
    assert.deepEqual(p2.segmenty().map((e) => e.segment), oczekiwane, nazwa);
    if (nazwa === 'ma.3') assert.ok(p2.ostrzezenia.some((w) => w.includes('unknown trigger event "engagement"')));
  }
  // Koperta bez węzłów §13.8: ten sam wynik na obu.
  const wyniki = [];
  for (const kod of [null, kod3]) {
    const p1 = await start({ koperta: koperta([POWROT, POKOJE]), kod });
    for (const id of ['A_1', 'A_2', 'A_3']) { p1.dataLayer.push(unitOpen(id)); await p1.minie(6000); }
    const p2 = await powrot(p1, 2 * H);
    wyniki.push(JSON.stringify([p1.segmenty(), p1.popupy, p2.segmenty(), p2.popupy]));
  }
  assert.equal(wyniki[0], wyniki[1]);
});

test('content: roomsLabel z odmianą, pricePerSqm; pole spoza §13.9.2 albo unit.image w tekście = węzeł pominięty', async () => {
  const slot = element({ 'd2-ma-slot': 's' }, 'P');
  const k = (text) => koperta([scenariusz('t', { event: 'unit_view' }, [{ do: 'content', slot: 's', text, frequency: 'once_per_days:0' }])]);
  for (const [rooms, label] of [[1, '1 pokój'], [2, '2 pokoje'], [4, '4 pokoje'], [5, '5 pokoi'], [12, '12 pokoi'], [14, '14 pokoi'], [22, '22 pokoje'], [25, '25 pokoi']]) {
    const env = await start({ koperta: k('{{unit.roomsLabel}} · {{unit.pricePerSqm}}'), elementy: [slot] });
    env.dataLayer.push(unitOpen('A_' + rooms, { rooms }));
    await env.gotowe();
    assert.equal(slot.textContent.replace(/\s/g, ' '), label + ' · 16 634 zł/m²');
  }
  const pref = await start({ koperta: k('{{pref.roomsLabel}} dla Ciebie'), elementy: [slot] });
  pref.dataLayer.push(unitOpen('B_1', { rooms: 3 }));
  await pref.gotowe();
  assert.equal(slot.textContent, '3 pokoje dla Ciebie');
  for (const zly of ['{{unit.image}}', '{{unit.promoText}}', '{{unit.cokolwiek}}']) {
    const env = await start({ koperta: k('Lokal ' + zly) });
    assert.ok(env.ostrzezenia.some((w) => w.includes('field outside §13.9.2')), zly);
  }
});

test('content.templateId z templates.content[] koperty; wbudowany jako zapas; nieznany = węzeł pominięty', async () => {
  const slot = element({ 'd2-ma-slot': 's' }, 'P');
  const sc = (templateId) => scenariusz('t-' + templateId, { event: 'unit_view' }, [{ do: 'content', slot: 's', templateId }]);
  const k = koperta([sc('naglowek-2')], { templates: { content: [
    { templateId: 'naglowek-2', text: '{{unit.roomsLabel}} — zobacz {{unit.name}}' },
    { templateId: 'zly', text: '{{unit.image}}' },
  ] } });
  const env = await start({ koperta: k, elementy: [slot] });
  env.dataLayer.push(unitOpen('A_7'));
  await env.gotowe();
  assert.equal(slot.textContent, '2 pokoje — zobacz 7');
  assert.ok(env.ostrzezenia.some((w) => w.includes('content template "zly" is not valid')));

  const zapas = await start({ koperta: koperta([sc('last-unit')]), elementy: [slot] });
  zapas.dataLayer.push(unitOpen('A_8'));
  await zapas.gotowe();
  assert.equal(slot.textContent, 'Wróć do lokalu 8');

  const brak = await start({ koperta: koperta([sc('nie-ma')]) });
  assert.ok(brak.ostrzezenia.some((w) => w.includes('templateId "nie-ma" is not in templates.content')));
});

test('Wyczyść zeruje sygnały odsłony: engagement może odpalić znowu, timery formularzy nie wiszą', async () => {
  const k = koperta([scenariusz('z', { event: 'engagement', minSeconds: 10 }, [DL('ma_engaged')])]);
  const env = await start({ koperta: k });
  await env.minie(11000);
  assert.equal(env.segmenty().length, 1);
  await env.ma.clear();
  env.window.pageYOffset = 10;
  env.okno('scroll');
  await env.gotowe();
  assert.equal(env.segmenty().length, 2, 'po Wyczyść profil od zera, wyzwalacz znowu');
});

test('content pominięty przez frequency: ma_content za nim nadal zna slot', async () => {
  const slot = element({ 'd2-ma-slot': 'hero' }, 'H1');
  const k = koperta([scenariusz('n', { event: 'unit_view' }, [
    { do: 'content', slot: 'hero', text: '{{unit.name}}' },
    Object.assign(DL('ma_content'), { frequency: 'once_per_days:0' }),
  ])]);
  const env = await start({ koperta: k, elementy: [slot] });
  env.dataLayer.push(unitOpen('A_1'));
  await env.minie(6000);
  env.dataLayer.push(unitOpen('A_2'));
  await env.gotowe();
  assert.deepEqual(env.segmenty().map((e) => e.slot), ['hero', 'hero']);
});

test('kanał z via (§13.10) strona pomija — MA-D30; sales_notify nieznany; cooldownMinutes na webhooku v0', async () => {
  const k = koperta([scenariusz('kanaly', { event: 'lead' }, [
    { do: 'webhook', channel: 'sms', testOnly: true },
    { do: 'webhook', channel: 'ai_call', testOnly: true },
    { do: 'webhook', channel: 'email', testOnly: true, cooldownMinutes: 1440 },
  ]), scenariusz('handlowiec', { event: 'lead' }, [{ do: 'webhook', channel: 'sales_notify', testOnly: true }])],
  { channels: {
    email: { webhook: 'https://hook.eu1.make.com/demo-email' },
    sms: { via: 'digi2', webhook: 'https://hook.eu1.make.com/sms' },
    ai_call: { via: 'make', webhook: 'https://hook.eu1.make.com/call', temporary: true },
  } });
  const env = await start({ koperta: k });
  env.dataLayer.push({ event: 'generate_lead', email: 'jan@example.com' });
  await env.gotowe();
  assert.deepEqual(env.webhooki.map((w) => w.url), ['https://hook.eu1.make.com/demo-email'], 'tylko kanał v0 bez via');
  assert.ok(!JSON.stringify(env.webhooki).includes('jan@'));
  assert.ok(env.ostrzezenia.some((w) => w.includes('"sms" has via "digi2"')));
  assert.ok(env.ostrzezenia.some((w) => w.includes('"ai_call" has via "make"')));
  assert.ok(env.ostrzezenia.some((w) => w.includes('unknown channel "sales_notify"')));
  // Drugi lead w ciągu doby: cooldown.
  await env.minie(2 * H);
  env.dataLayer.push({ event: 'generate_lead' });
  await env.gotowe();
  assert.equal(env.webhooki.length, 1, 'cooldownMinutes 1440');
  await env.minie(23 * H);
  env.dataLayer.push({ event: 'generate_lead' });
  await env.gotowe();
  assert.equal(env.webhooki.length, 2, 'po dobie znowu');
});

// ---------------------------------------------------------------------------
// ma.5: d2-ma-show-* / d2-ma-hide-*, bloki d2-ma-variant, segmenty, every_time, map_order
// ---------------------------------------------------------------------------

const SEG = (segment) => DL('ma_segment', { segment });
const pokazany = (el) => el.getAttribute('d2-ma-shown') !== null;
const ukryty = (el) => el.getAttribute('d2-ma-hidden') !== null;

/** Kontener d2-ma-variants z dziećmi (rodzic ustawiony jak w DOM). */
function warianty(dzieci) {
  const box = element({ 'd2-ma-variants': '' });
  box.children = dzieci;
  dzieci.forEach((d) => { d.parent = box; d.parentNode = box; });
  return [box].concat(dzieci);
}

test('d2-ma-show-visits: licznik i okno /30d z początków wizyt; bez zgody nic; data- alias', async () => {
  const el = element({ 'd2-ma-cond': '', 'd2-ma-show-visits': '3+/30d' });
  const dokladnie = element({ 'd2-ma-cond': '', 'data-d2-ma-show-visits': '1' });
  const najwyzej = element({ 'd2-ma-cond': '', 'd2-ma-show-visits': '0..2' });
  const elementy = [el, dokladnie, najwyzej];
  const p1 = await start({ koperta: koperta([]), elementy });
  p1.dataLayer.push(unitOpen('A_1'));
  await p1.gotowe();
  assert.deepEqual([pokazany(el), pokazany(dokladnie), pokazany(najwyzej)], [false, true, true]);
  const p2 = await powrot(p1, 40 * 24 * H);
  const p3 = await powrot(p2, 2 * H);
  const p4 = await powrot(p3, 2 * H);
  assert.equal(p4.ma.profile().visits, 4);
  assert.equal(pokazany(el), true, '3 wizyty w ostatnich 30 dniach (pierwsza 40 dni temu się nie liczy)');
  assert.equal(pokazany(najwyzej), false);
  const p5 = await powrot(p4, 50 * 24 * H);
  assert.equal(pokazany(el), false, 'po 50 dniach w oknie została jedna wizyta');

  const bez = element({ 'd2-ma-cond': '', 'd2-ma-show-visits': '0+' });
  const env = await start({ koperta: koperta([], { storage: { consentRequired: true } }), elementy: [bez] });
  assert.equal(pokazany(bez), false, 'bez zgody żaden warunek show nie pasuje');
  void p5; void env;
});

test('d2-ma-show: views, views-rooms, views-floor z piętrem −1, views-unit, pref, lead; kilka atrybutów = I', async () => {
  const e = {
    views: element({ 'd2-ma-cond': '', 'd2-ma-show-views': '2+' }),
    rooms: element({ 'd2-ma-cond': '', 'd2-ma-show-views-rooms': '3:2+' }),
    floor: element({ 'd2-ma-cond': '', 'd2-ma-show-views-floor': '-1:1+' }),
    unit: element({ 'd2-ma-cond': '', 'd2-ma-show-views-unit': 'A_2:1+' }),
    pref: element({ 'd2-ma-cond': '', 'd2-ma-show-pref-rooms': '1|3' }),
    lead: element({ 'd2-ma-cond': '', 'd2-ma-show-lead': 'false' }),
    oba: element({ 'd2-ma-cond': '', 'd2-ma-show-views-rooms': '3:2+', 'd2-ma-show-lead': 'true' }),
    wyklucz: element({ 'd2-ma-cond': '', 'd2-ma-show-views': '1+', 'd2-ma-hide-lead': 'true' }),
  };
  const env = await start({ koperta: koperta([]), elementy: Object.values(e) });
  env.dataLayer.push(unitOpen('A_1', { rooms: 3, floor: -1 }));
  await env.minie(6000);
  env.dataLayer.push(unitOpen('A_2', { rooms: 3, floor: 2 }));
  await env.gotowe();
  const stan = () => Object.fromEntries(Object.entries(e).map(([k, v]) => [k, pokazany(v)]));
  assert.deepEqual(stan(), { views: true, rooms: true, floor: true, unit: true, pref: true, lead: true, oba: false, wyklucz: true });
  env.dataLayer.push({ event: 'generate_lead' });
  await env.gotowe();
  assert.deepEqual([pokazany(e.lead), pokazany(e.oba), pokazany(e.wyklucz), ukryty(e.wyklucz)], [false, true, false, true],
    'hide wygrywa z pasującym show');
});

test('segmenty profilu: ma_segment dodaje, ma_segment_exit zdejmuje tylko swój; bez segmentu ostrzeżenie; hide wygrywa', async () => {
  const pokaz = element({ 'd2-ma-cond': '', 'd2-ma-show-segment': '2-pokoje|3-pokoje' });
  const oba = element({ 'd2-ma-cond': '', 'd2-ma-show-segment': '2-pokoje', 'd2-ma-hide-lead': 'true' });
  const k = koperta([
    scenariusz('pokoje', { event: 'unit_view' }, [SEG('2-pokoje')]),
    scenariusz('lead', { event: 'lead' }, [DL('ma_segment_exit', { segment: 'sprzedaz' })]),
    scenariusz('wyjscie', { event: 'exit_intent' }, [DL('ma_segment_exit', { segment: '2-pokoje' })]),
    scenariusz('zly', { event: 'exit_intent' }, [DL('ma_segment_exit')]),
  ]);
  const env = await start({ koperta: k, elementy: [pokaz, oba] });
  assert.equal(pokazany(pokaz), false);
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.deepEqual([pokazany(pokaz), pokazany(oba)], [true, true]);
  assert.ok(env._dysk.state.segments['2-pokoje'] > 0);
  env.ma.lead();
  await env.gotowe();
  assert.deepEqual([pokazany(pokaz), pokazany(oba), ukryty(oba)], [true, false, true],
    'wyjście z "sprzedaz" nie zdejmuje 2-pokoje; hide-lead wygrywa');
  env.dom('mouseout', { clientY: -1, relatedTarget: null });
  await env.gotowe();
  assert.equal(pokazany(pokaz), false, 'wyjście z 2-pokoje zdejmuje ten segment');
  assert.ok(env.ostrzezenia.some((w) => w.includes('"a1" has no params.segment')));
});

test('retencja segmentów i początków wizyt jak historii; Wyczyść je zeruje', async () => {
  const k = koperta([scenariusz('pokoje', { event: 'unit_view' }, [SEG('2-pokoje')])], { storage: { retentionDays: 10, consentRequired: false } });
  const p1 = await start({ koperta: k });
  p1.dataLayer.push(unitOpen('A_1'));
  await p1.gotowe();
  assert.ok(p1._dysk.state.segments['2-pokoje']);
  const p2 = await powrot(p1, 3 * 24 * H);
  p2.dataLayer.push(unitOpen('A_2'));
  await p2.gotowe();
  await p2.ma.clear();
  assert.equal(p2.ma.profile().segment, null);
  assert.deepEqual({ ...(p2._dysk.state || {}).segments }, {});
  const q1 = await start({ koperta: k });
  q1.dataLayer.push(unitOpen('B_1'));
  await q1.gotowe();
  const q2 = await powrot(q1, 5 * 24 * H);
  const q3 = await powrot(q2, 6 * 24 * H); // pierwsza wizyta i segment sprzed 11 dni
  assert.equal(Object.keys(q3._dysk.state.segments || {}).length, 0, 'segment starszy niż retencja');
  assert.equal(q3._dysk.state.visitLog.length, 2, 'początek wizyty starszy niż retencja');
});

test('element z d2-ma-show-* bez znacznika d2-ma-cond: ukryty przez skrypt (hidden) z ostrzeżeniem', async () => {
  const bez = element({ 'd2-ma-show-views': '0+' });
  const env = await start({ koperta: koperta([]), elementy: [bez] });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.equal(bez.getAttribute('hidden'), '');
  assert.equal(pokazany(bez), false);
  assert.equal(env.ostrzezenia.filter((w) => w.includes('has no d2-ma-cond')).length, 1);
  assert.equal(env.ma.allows(bez), false);
  const sam = element({ 'd2-ma-cond': '', 'd2-ma-hide-lead': 'true' });
  const e2 = await start({ koperta: koperta([]), elementy: [sam] });
  assert.equal(pokazany(sam), true, 'sam hide bez trafienia: d2-ma-shown, bo CSS ukrywa [d2-ma-cond] bez niego');
});

test('błędny albo nieznany warunek: element ukryty (fail-closed) z console.warn — także w hide', async () => {
  const zle = ['d2-ma-show-visits="3>"', 'd2-ma-show-visit="3+"', 'd2-ma-show-views-floor="x:1+"', 'd2-ma-hide-segment="Duże"',
    'd2-ma-show-visits="5..2"', 'd2-ma-show-views-unit="a b:1+"'];
  const els = zle.map((a) => { const [k, v] = a.split('='); return element({ 'd2-ma-cond': '', [k]: JSON.parse(v) }); });
  const env = await start({ koperta: koperta([]), elementy: els });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  els.forEach((el, i) => {
    assert.equal(pokazany(el), false, zle[i]);
    assert.equal(ukryty(el), true, zle[i]);
  });
  assert.equal(env.ostrzezenia.filter((w) => w.includes('malformed d2-ma-show-/hide-')).length, els.length, 'raz na element');
});

test('d2-ma-variants: pierwszy pasujący wariant wygrywa, default gdy żaden; kontener d2-ma-matched', async () => {
  const dwa = element({ 'd2-ma-variant': '2-pokoje', 'd2-ma-show-pref-rooms': '2' });
  const trzy = element({ 'd2-ma-variant': '3-pokoje', 'd2-ma-show-pref-rooms': '3' });
  const kazdy = element({ 'd2-ma-variant': 'ktos', 'd2-ma-show-views': '1+' });
  const def = element({ 'd2-ma-variant': 'default' });
  const elementy = warianty([dwa, trzy, kazdy, def]);
  const box = elementy[0];
  const env = await start({ koperta: koperta([]), elementy });
  assert.deepEqual([dwa, trzy, kazdy].map(pokazany), [false, false, false]);
  assert.equal(box.getAttribute('d2-ma-matched'), null, 'bez historii: domyślny');
  env.dataLayer.push(unitOpen('A_1', { rooms: 3 }));
  await env.gotowe();
  assert.deepEqual([dwa, trzy, kazdy].map(pokazany), [false, true, false], 'pierwszy pasujący, nie oba');
  assert.equal(box.getAttribute('d2-ma-matched'), '');
});

test('?d2-ma-preview=<segment|wariant>: podgląd bez zgody, bez zapisu w d2ma i bez dataLayer', async () => {
  const seg = element({ 'd2-ma-cond': '', 'd2-ma-show-segment': '2-pokoje' });
  const inny = element({ 'd2-ma-cond': '', 'd2-ma-show-segment': '3-pokoje' });
  const war = element({ 'd2-ma-variant': '2-pokoje', 'd2-ma-show-pref-rooms': '2' });
  const elementy = [seg, inny].concat(warianty([war]));
  const env = await start({ koperta: koperta([], { storage: { consentRequired: true } }), elementy, search: '?d2-ma-preview=2-pokoje' });
  assert.deepEqual([pokazany(seg), pokazany(inny), pokazany(war)], [true, false, true]);
  assert.equal(env.ma.profile(), null);
  assert.ok(!env._dysk.views || !env._dysk.views.length);
  assert.equal(env.segmenty().length, 0);
});

test('apply() zbiera elementy od nowa po zmianie DOM; allows() dla popupów', async () => {
  const elementy = [];
  const env = await start({ koperta: koperta([]), elementy });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  const nowy = element({ 'd2-ma-cond': '', 'd2-ma-show-views': '1+' });
  elementy.push(nowy);
  env.dataLayer.push(unitOpen('A_2'));
  await env.gotowe();
  assert.equal(pokazany(nowy), false, 'bez apply() nowy element nie jest znany');
  env.ma.apply();
  assert.equal(pokazany(nowy), true);
  assert.equal(env.ma.allows(element({ 'd2-ma-cond': '', 'd2-ma-show-views': '5+' })), false);
  assert.equal(env.ma.allows(element({ 'd2-ma-cond': '', 'd2-ma-show-views': '1+' })), true);
  assert.equal(env.ma.allows(element({ 'd2-ma-cond': '', 'd2-ma-hide-views': '1+' })), false);
  assert.equal(env.ma.allows(element({ class: 'x' })), true, 'bez warunków - bez veta');
});

test('popup z warunkiem d2-ma czekający w module popupów dostaje showIfPending, gdy warunek zaczyna pasować', async () => {
  const nakladka = element({ 'd2-ma-cond': '', 'd2-ma-show-segment': '2-pokoje' });
  const env = await start({ koperta: koperta([scenariusz('s', { event: 'unit_view' }, [SEG('2-pokoje')])]) });
  const wznowione = [];
  env.window.digi2.popups.list = () => ['promo', 'inny'];
  const get = env.window.digi2.popups.get.bind(env.window.digi2.popups);
  env.window.digi2.popups.get = (n) => (n === 'promo'
    ? { pendingShow: true, popupElement: nakladka, showIfPending(o) { wznowione.push(o); } }
    : n === 'inny' ? { pendingShow: true, popupElement: element(), showIfPending() { wznowione.push('inny'); } } : get(n));
  env.ma.apply();
  assert.equal(wznowione.length, 0);
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.deepEqual(wznowione.map((o) => ({ ...o })), [{ auto: true }], 'tylko popup z warunkiem d2-ma');
});

test('#16: moduł popupów ładuje się po d2-ma (proxy loadera) — start kończy się, ma:ready wychodzi, proxy nietknięte', async () => {
  const nakladka = element({ 'd2-ma-cond': '', 'd2-ma-show-segment': '2-pokoje' });
  const env = await start({ koperta: koperta([scenariusz('s', { event: 'unit_view' }, [SEG('2-pokoje')])]), popupsProxy: true });
  assert.deepEqual(env.ostrzezenia.filter((w) => w.includes('start failed')), [], 'start d2-ma nie pada na proxy');
  assert.ok((env.zdarzenia['ma:ready'] || []).some((d) => d.tracking === true), 'ma:ready z tracking: true');
  assert.deepEqual(env.proxyWolania, [], 'żadna metoda proxy nie wywołana — d2-ma nie dociąga popups na siłę');

  // Zmiana profilu, zanim popups się załaduje: dalej bez błędu i bez dotykania proxy.
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.deepEqual(env.ostrzezenia.filter((w) => w.includes('failed')), []);
  assert.deepEqual(env.proxyWolania, []);

  // Moduł dociągnął się później (segment już pasuje): odłożony popup dostaje drugą szansę
  // przy pierwszym przeliczeniu warunków z prawdziwym modułem.
  env.zaladujPopups();
  const wznowione = [];
  env.window.digi2.popups.list = () => ['promo'];
  env.window.digi2.popups.get = () => ({ pendingShow: true, popupElement: nakladka, showIfPending(o) { wznowione.push(o); } });
  env.ma.apply();
  assert.deepEqual(wznowione.map((o) => ({ ...o })), [{ auto: true }]);
});

test('#16: wyjątek w module popupów przy wznawianiu nie zatrzymuje d2-ma', async () => {
  const env = await start({ koperta: koperta([scenariusz('s', { event: 'unit_view' }, [SEG('2-pokoje')])]) });
  env.window.digi2.popups.list = () => { throw new Error('popups broken'); };
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.ok(env.ostrzezenia.some((w) => w.includes('popups resume failed')));
  assert.ok((env.zdarzenia['ma:change'] || []).length >= 1, 'render doszedł do końca, ma:change wyszło');
});

test('every_time: treść wraca na każdej odsłonie, gdy ścieżka już do niej doszła; dla popupu niedozwolone', async () => {
  const slot = element({ 'd2-ma-slot': 'hero' }, 'H1');
  slot.textContent = 'Domyślny';
  const k = koperta([scenariusz('n', { event: 'type_view', rooms: 2, minCount: 1 },
    [{ do: 'content', slot: 'hero', text: '{{pref.roomsLabel}} dla Ciebie', frequency: 'every_time' }])]);
  const p1 = await start({ koperta: k, elementy: [slot] });
  p1.dataLayer.push(unitOpen('A_1'));
  await p1.gotowe();
  assert.equal(slot.textContent, '2 pokoje dla Ciebie');
  slot.textContent = 'Domyślny'; // przeładowanie strony
  await powrot(p1, 5 * MIN, { elementy: [slot] });
  assert.equal(slot.textContent, '2 pokoje dla Ciebie', 'ta sama wizyta, nowa odsłona');

  const slot2 = element({ 'd2-ma-slot': 'hero' }, 'H1');
  slot2.textContent = 'Domyślny';
  const k2 = koperta([scenariusz('n', { event: 'type_view', rooms: 2, minCount: 1 },
    [{ do: 'content', slot: 'hero', text: 'x' }])]);
  const q1 = await start({ koperta: k2, elementy: [slot2] });
  q1.dataLayer.push(unitOpen('A_1'));
  await q1.gotowe();
  slot2.textContent = 'Domyślny';
  await powrot(q1, 5 * MIN, { elementy: [slot2] });
  assert.equal(slot2.textContent, 'Domyślny', 'once_per_visit: druga odsłona pokazuje oryginał');

  const zly = await start({ koperta: koperta([scenariusz('p', { event: 'unit_view' }, [{ do: 'popup', template: 'last-unit', frequency: 'every_time' }])]) });
  zly.dataLayer.push(unitOpen('A_1'));
  await zly.gotowe();
  assert.ok(zly.ostrzezenia.some((w) => w.includes('every_time is only for content, map_mark and map_order')));
});

test('map_order: setProductOrder z rankingu (limit domyślnie 20); bez metody — pominięty, bez fallbacku', async () => {
  const p = (id, rooms, status) => ({ id, name: id, rooms, floor: 1, status });
  const produkty = [p('u1', 3, 'available'), p('u2', 2, 'available'), p('u3', 2, 'sold'), p('u4', 2, 'reserved')];
  const k = koperta([scenariusz('kolejnosc', { event: 'type_view', rooms: 2, minCount: 1 }, [{ do: 'map_order', by: 'rooms' }])], { minScript: 'ma.5' });
  const kolejnosc = [];
  const env = await start({ koperta: k, produkty, imp: { instances: { mapa: {} } } });
  env.window.d2estate.setProductOrder = (m, ids) => { kolejnosc.push([m, [...ids]]); return ids.length; };
  env.dataLayer.push(unitOpen('X', { rooms: 2 }));
  await env.gotowe();
  assert.deepEqual(kolejnosc, [['mapa', ['u2', 'u4']]]);
  await env.ma.clear();
  assert.deepEqual(kolejnosc[1], ['mapa', []], 'Wyczyść przywraca kolejność listy');
  assert.ok(!env.ostrzezenia.some((w) => w.includes('needs d2-ma')), 'minScript ma.5 to ta wersja');

  const wywolania = [];
  const bez = await start({ koperta: k, produkty, imp: { instances: { mapa: {} }, highlightObject() { wywolania.push(1); } } });
  bez.dataLayer.push(unitOpen('X', { rooms: 2 }));
  await bez.gotowe();
  assert.equal(wywolania.length, 0, 'bez setProductOrder nie ma zastępstwa');
  assert.ok(!bez.ostrzezenia.some((w) => w.includes('map_order failed')), 'pominięty po cichu, nie błąd');
});

test('MA-D13 pola formularza: nazwa z name / data-name / label, czas i kliknięcia, bez wartości; e-mail jako nazwa → pole-N', async () => {
  const k = koperta([scenariusz('porzucony', { event: 'form_abandon', idleSeconds: 60 }, [DL('ma_form_abandon')])]);
  const env = await start({ koperta: k });
  const form = element({ id: 'kontakt' }, 'FORM');
  const pole = (attrs) => { const el = element(attrs, 'INPUT'); el.parent = form; el.value = 'jan@example.com'; return el; };
  const imie = pole({ name: 'Imię i nazwisko!' });
  const tel = pole({ 'data-name': '+48 600 100 200' });
  const haslo = pole({ type: 'password', name: 'haslo' });
  const ign = pole({ name: 'zgoda', 'd2-ma-ignore': '' });
  env.dom('focusin', { type: 'focusin', target: imie });
  await env.minie(4000);
  env.dom('click', { type: 'click', target: imie });
  env.dom('focusout', { type: 'focusout', target: imie });
  env.dom('focusin', { type: 'focusin', target: tel });
  env.dom('focusin', { type: 'focusin', target: haslo });
  env.dom('focusin', { type: 'focusin', target: ign });
  await env.minie(1000);
  env.dom('focusout', { type: 'focusout', target: tel });
  await env.minie(61000);
  const pola = env.polaFormularza();
  assert.deepEqual(pola.map((x) => [x.field_name, x.clicks]), [['Imię i nazwisko', 2], ['pole-2', 1]], 'bez hasła i d2-ma-ignore');
  assert.ok(pola[0].time_ms >= 4000 && pola[1].time_ms >= 1000);
  assert.ok(pola.every((x) => x.form_id === 'kontakt'));
  assert.deepEqual({ ...env.segmenty()[0] }, { event: 'ma_form_abandon', ma_scenario: 'porzucony', form_id: 'kontakt', fields_touched: 2 });
  assert.ok(!JSON.stringify(env.dataLayer).includes('jan@') && !JSON.stringify(env._dysk).includes('jan@'));
  env.dom('submit', { target: form });
  env.okno('pagehide');
  await env.gotowe();
  assert.equal(env.polaFormularza().length, 2, 'raz na formularz — także gdy potem go wysłał');
});

test('MA-D13: zdarzenia pól przy wysłaniu formularza; przy pagehide dopiero na następnej odsłonie; najwyżej 20 pól', async () => {
  const k = koperta([scenariusz('porzucony', { event: 'form_abandon' }, [DL('ma_form_abandon')])]);
  const env = await start({ koperta: k });
  const a = formularz();
  env.dom('focusin', { type: 'focusin', target: a.pole });
  env.dom('submit', { target: a.form });
  await env.gotowe();
  assert.deepEqual(env.polaFormularza().map((x) => x.field_name), ['email']);
  assert.equal(env.segmenty().length, 0, 'wysłany to nie porzucony');

  const e2 = await start({ koperta: k });
  const form = element({ id: 'dlugi' }, 'FORM');
  for (let i = 0; i < 25; i++) {
    const el = element({ name: 'p' + i }, 'INPUT');
    el.parent = form;
    e2.dom('focusin', { type: 'focusin', target: el });
  }
  e2.okno('pagehide');
  await e2.gotowe();
  assert.equal(e2.polaFormularza().length, 0, 'nic w chwili wyjścia');
  const n = await powrot(e2, 5 * MIN);
  assert.equal(n.polaFormularza().length, 20);
  assert.equal(n.segmenty()[0].fields_touched, 25);
});

/** gtag() kładzie do dataLayer obiekt arguments, nie tablicę. */
function gtagArgs() { return arguments; }

test('MA-D14 obraz: slot IMG dostaje src i alt, inny slot — <img> w środku; Wyczyść przywraca; host spoza listy = węzeł pominięty', async () => {
  const img = element({ 'd2-ma-slot': 'hero-img', src: 'https://demo.example/stary.jpg', alt: 'stary' }, 'IMG');
  const box = element({ 'd2-ma-slot': 'hero-box' }, 'DIV');
  const stare = element({}, 'P');
  box.appendChild(stare);
  const obraz = (slot, src) => ({ do: 'content', slot, image: { src, alt: 'Lokal 2-pokojowy' } });
  const k = koperta([scenariusz('o', { event: 'unit_view' }, [
    obraz('hero-img', 'https://media.digi2.app/a.jpg'), obraz('hero-box', 'https://demo.example/b.webp'),
  ]), scenariusz('zly', { event: 'unit_view' }, [obraz('hero-img', 'https://evil.example/x.jpg')]),
  scenariusz('http', { event: 'unit_view' }, [obraz('hero-img', 'http://demo.example/x.jpg')])]);
  const env = await start({ koperta: k, elementy: [img, box] });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.deepEqual([img.getAttribute('src'), img.getAttribute('alt')], ['https://media.digi2.app/a.jpg', 'Lokal 2-pokojowy']);
  assert.equal(box.children.length, 1);
  assert.equal(box.children[0].tagName, 'IMG');
  assert.equal(box.children[0].getAttribute('src'), 'https://demo.example/b.webp');
  assert.equal(env.ostrzezenia.filter((w) => w.includes('content image needs an https src')).length, 2);
  await env.ma.clear();
  assert.deepEqual([img.getAttribute('src'), img.getAttribute('alt')], ['https://demo.example/stary.jpg', 'stary']);
  assert.deepEqual(box.children, [stare]);
});

test('MA-D14 wideo YouTube / Vimeo: bez zgody marketingowej miniatura z podpisem; po gtag update ad_storage — ramka nocookie z sandbox', async () => {
  const slot = element({ 'd2-ma-slot': 'film' }, 'DIV');
  const k = koperta([scenariusz('w', { event: 'unit_view' }, [{ do: 'content', slot: 'film',
    video: { provider: 'youtube', id: 'dQw4w9WgXcQ', poster: 'https://media.digi2.app/film.jpg' } }])]);
  const env = await start({ koperta: k, elementy: [slot] });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  const ph = slot.children[0];
  assert.equal(ph.getAttribute('d2-ma-video-placeholder'), '');
  assert.equal(ph.children[0].getAttribute('src'), 'https://media.digi2.app/film.jpg', 'miniatura z CDN panelu, nie z YouTube');
  assert.equal(ph.children[1].textContent, 'Wideo po zgodzie na ciasteczka');
  env.dataLayer.push(gtagArgs('consent', 'update', { ad_storage: 'granted' }));
  await env.gotowe();
  const fr = slot.children[0];
  assert.equal(fr.tagName, 'IFRAME');
  assert.equal(fr.getAttribute('src'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  assert.equal(fr.getAttribute('sandbox'), 'allow-scripts allow-same-origin allow-presentation');
  assert.equal(fr.getAttribute('referrerpolicy'), 'strict-origin-when-cross-origin');

  const s2 = element({ 'd2-ma-slot': 'film' }, 'DIV');
  const k2 = koperta([scenariusz('w', { event: 'unit_view' }, [{ do: 'content', slot: 'film', video: { provider: 'vimeo', id: '123456789' } }])]);
  const e2 = await start({ koperta: k2, elementy: [s2], dataLayer: [gtagArgs('consent', 'default', { ad_storage: 'granted' })] });
  e2.dataLayer.push(unitOpen('A_1'));
  await e2.gotowe();
  assert.equal(s2.children[0].getAttribute('src'), 'https://player.vimeo.com/video/123456789?dnt=1');
});

test('MA-D14 wideo MP4: element video z hosta strony lub CDN panelu; złe id i obcy host = węzeł pominięty', async () => {
  const slot = element({ 'd2-ma-slot': 'film' }, 'DIV');
  const v = (video) => scenariusz('w-' + JSON.stringify(video).length, { event: 'unit_view' }, [{ do: 'content', slot: 'film', video }]);
  const k = koperta([v({ provider: 'mp4', src: 'https://demo.example/spacer.mp4' }),
    v({ provider: 'youtube', id: 'krótki' }), v({ provider: 'vimeo', id: 'abc' }),
    v({ provider: 'mp4', src: 'https://cdn.obcy.example/a.mp4' }), v({ provider: 'iframe', src: 'https://demo.example/x' })]);
  const env = await start({ koperta: k, elementy: [slot] });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.equal(slot.children[0].tagName, 'VIDEO');
  assert.equal(slot.children[0].getAttribute('src'), 'https://demo.example/spacer.mp4');
  assert.equal(env.ostrzezenia.filter((w) => w.includes('content video is not youtube')).length, 4);
});

test('d2-ma-video-consent tylko dokłada kategorie: bez ad_storage ostrzeżenie i ad_storage dalej wymagane; lista = wszystkie', async () => {
  const yt = koperta([scenariusz('w', { event: 'unit_view' }, [{ do: 'content', slot: 'film', video: { provider: 'youtube', id: 'dQw4w9WgXcQ' } }])]);
  const run = async (attr, zgody) => {
    const slot = element({ 'd2-ma-slot': 'film' }, 'DIV');
    const env = await start({ koperta: yt, elementy: [slot], cfg: { 'd2-ma-video-consent': attr }, dataLayer: [gtagArgs('consent', 'default', zgody)] });
    env.dataLayer.push(unitOpen('A_1'));
    await env.gotowe();
    return { tag: slot.children[0].tagName, env };
  };
  const slabsza = await run('analytics_storage', { analytics_storage: 'granted', ad_storage: 'denied' });
  assert.equal(slabsza.tag, 'DIV', 'analytics_storage nie zastępuje ad_storage');
  assert.ok(slabsza.env.ostrzezenia.some((w) => w.includes('without ad_storage')));
  assert.equal((await run('ad_storage analytics_storage', { ad_storage: 'granted', analytics_storage: 'denied' })).tag, 'DIV', 'obie wymagane');
  assert.equal((await run('ad_storage analytics_storage', { ad_storage: 'granted', analytics_storage: 'granted' })).tag, 'IFRAME');
  assert.equal((await run('analytics_storage', { ad_storage: 'granted', analytics_storage: 'granted' })).tag, 'IFRAME');
});

test('MA-D13: tylko formularze z formIds wyzwalaczy; klik w pole to jedno wejście; nazwa bez \\p{L} na starszej przeglądarce', async () => {
  const k = koperta([scenariusz('p', { event: 'form_abandon', formIds: ['kontakt'] }, [DL('ma_form_abandon')])]);
  for (const bezUnicodeRegExp of [false, true]) {
    const env = await start({ koperta: k, bezUnicodeRegExp });
    const obcy = formularz({ id: 'newsletter' });
    env.dom('focusin', { type: 'focusin', target: obcy.pole });
    env.dom('submit', { target: obcy.form });
    const form = element({ id: 'kontakt' }, 'FORM');
    const pole = element({ name: 'Ulica i nr — łąka!' }, 'INPUT');
    pole.parent = form;
    env.dom('focusin', { type: 'focusin', target: pole });
    env.dom('click', { type: 'click', target: pole });
    await env.minie(2000);
    env.dom('click', { type: 'click', target: pole });
    env.dom('submit', { target: form });
    await env.gotowe();
    assert.deepEqual(env.polaFormularza().map((x) => [x.form_id, x.field_name, x.clicks]), [['kontakt', 'Ulica i nr łąka', 2]],
      'newsletter poza formIds pominięty; focusin + click = 1, drugi klik później = 2');
    env.okno('pagehide');
    await env.gotowe();
    assert.ok(!(env._dysk.state.formExits || []).some((x) => x.formId === 'newsletter'), 'poza formIds także bez zapisu wyjścia');
  }
});

test('form_abandon formIds: tylko brak pola = dowolny formularz; [], napis, null, > 20 albo pusty napis = węzeł pominięty', async () => {
  for (const formIds of [[], 'kontakt', null, Array.from({ length: 21 }, (_, i) => 'f' + i), [''], [5]]) {
    const env = await start({ koperta: koperta([scenariusz('p', { event: 'form_abandon', formIds }, [DL('ma_form_abandon')])]) });
    assert.ok(env.ostrzezenia.some((w) => w.includes('formIds must be a list of 1–20 names')), JSON.stringify(formIds));
    const a = formularz();
    env.dom('focusin', { type: 'focusin', target: a.pole });
    await env.minie(61000);
    assert.equal(env.segmenty().length, 0, 'nie łapie każdego formularza: ' + JSON.stringify(formIds));
  }
});

test('Safari: klik w checkbox bez fokusu liczy się i otwiera licznik porzucenia', async () => {
  const k = koperta([scenariusz('p', { event: 'form_abandon' }, [DL('ma_form_abandon')])]);
  const env = await start({ koperta: k });
  const form = element({ id: 'kontakt' }, 'FORM');
  const zgoda = element({ type: 'checkbox', name: 'zgoda' }, 'INPUT');
  zgoda.parent = form;
  env.dom('click', { type: 'click', target: zgoda });
  env.dom('click', { type: 'click', target: zgoda });
  await env.minie(61000);
  assert.deepEqual(env.polaFormularza().map((x) => [x.field_name, x.clicks]), [['zgoda', 2]]);
  assert.equal(env.segmenty().length, 1);
});

test('#5: popup ze scenariusza czeka, aż gość zamknie pełnoekranowy dymek mapy; po 5 min rezygnuje i oddaje częstotliwość', async () => {
  const dymek = { open: true };
  const k = koperta([POKOJE]);
  const env = await start({ koperta: k, dymek });
  for (const id of ['A_1', 'A_2', 'A_3']) { env.dataLayer.push(unitOpen(id)); await env.minie(6000); }
  assert.equal(env.popupy.length, 0, 'dymek otwarty - popup czeka');
  await env.minie(10000);
  assert.equal(env.popupy.length, 0);
  dymek.open = false;
  await env.minie(300);
  assert.deepEqual(env.popupy.map((p) => p.name), ['d2-ma-promo-rooms'], 'po zamknięciu dymku');

  const d2 = { open: true };
  const e2 = await start({ koperta: k, dymek: d2 });
  for (const id of ['B_1', 'B_2', 'B_3']) { e2.dataLayer.push(unitOpen(id)); await e2.minie(6000); }
  // Zegar testu skacze od razu do końca, więc timer ustawiany co 250 ms trzeba prowadzić krokami.
  for (let i = 0; i < 61; i++) await e2.minie(5000);
  assert.equal(e2.popupy.length, 0, 'po 5 min z otwartym dymkiem - bez popupu');
  assert.ok(!(e2._dysk.state.scenarios['preferencja-2'].freq.a2), 'częstotliwość oddana');
  d2.open = false;
  await e2.minie(1000);
  assert.equal(e2.popupy.length, 0, 'nie wyskakuje po fakcie');

  const e3 = await start({ koperta: k });
  for (const id of ['C_1', 'C_2', 'C_3']) { e3.dataLayer.push(unitOpen(id)); await e3.minie(6000); }
  assert.equal(e3.popupy.length, 1, 'bez dymku od razu, jak dotąd');
});

test('#5: zgoda wycofana w czasie czekania na dymek — popup się nie pokazuje', async () => {
  const dymek = { open: true };
  const env = await start({ koperta: koperta([POKOJE], { storage: { consentRequired: true } }), zgoda: { analytics_storage: 'granted' }, dymek });
  for (const id of ['A_1', 'A_2', 'A_3']) { env.dataLayer.push(unitOpen(id)); await env.minie(6000); }
  env.zgoda({ analytics_storage: 'denied' });
  dymek.open = false;
  await env.minie(1000);
  assert.equal(env.popupy.length, 0);
});

const RAZ_NA_LOKAL = scenariusz('ogladany', { event: 'unit_view' }, [{ do: 'popup', template: 'last-unit', cta: 'open_unit', frequency: 'once_per_unit' }]);

test('#5: „Wyczyść” albo wycofanie i ponowna zgoda w czasie czekania na dymek — popup z usuniętego profilu się nie pokazuje', async () => {
  const dymek = { open: true };
  const env = await start({ koperta: koperta([RAZ_NA_LOKAL]), dymek });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  await env.ma.clear();
  dymek.open = false;
  for (let i = 0; i < 4; i++) await env.minie(300);
  assert.equal(env.popupy.length, 0, 'po Wyczyść');

  const d2 = { open: true };
  const e2 = await start({ koperta: koperta([RAZ_NA_LOKAL], { storage: { consentRequired: true } }), zgoda: { analytics_storage: 'granted' }, dymek: d2 });
  e2.dataLayer.push(unitOpen('B_1'));
  await e2.gotowe();
  e2.zgoda({ analytics_storage: 'denied' });
  e2.zgoda({ analytics_storage: 'granted' });
  await e2.gotowe();
  d2.open = false;
  for (let i = 0; i < 4; i++) await e2.minie(300);
  assert.equal(e2.popupy.length, 0, 'po wycofaniu i ponownej zgodzie');
});

test('#5: „Wyczyść” w czasie odczytu świeżego statusu — popup się nie pokazuje', async () => {
  let oddaj;
  const api = () => new Promise((r) => { oddaj = r; });
  const env = await start({ koperta: koperta([RAZ_NA_LOKAL]), mapa: false, api });
  env.ma.track({ unitId: 'aaaaaaaa-bbbb-4ccc-8ddd-000000000001', name: 'A1', rooms: 2, source: '2destate' });
  await env.gotowe();
  await env.ma.clear();
  oddaj([{ id: 'aaaaaaaa-bbbb-4ccc-8ddd-000000000001', name: 'A1', status: 'available' }]);
  await env.gotowe();
  assert.equal(env.popupy.length, 0);

  const e2 = await start({ koperta: koperta([RAZ_NA_LOKAL], { storage: { consentRequired: true } }), zgoda: { analytics_storage: 'granted' }, mapa: false, api });
  e2.ma.track({ unitId: 'aaaaaaaa-bbbb-4ccc-8ddd-000000000002', name: 'A2', rooms: 2, source: '2destate' });
  await e2.gotowe();
  e2.zgoda({ analytics_storage: 'denied' });
  e2.zgoda({ analytics_storage: 'granted' });
  await e2.gotowe();
  oddaj([{ id: 'aaaaaaaa-bbbb-4ccc-8ddd-000000000002', name: 'A2', status: 'available' }]);
  await e2.gotowe();
  assert.equal(e2.popupy.length, 0, 'wycofanie i ponowna zgoda w czasie odczytu');
});

test('#5: drugi lokal w czasie czekania — jeden czekający popup na szablon; once_per_unit oddaje tylko pierwszy lokal', async () => {
  const dymek = { open: true };
  const env = await start({ koperta: koperta([RAZ_NA_LOKAL]), dymek });
  env.dataLayer.push(unitOpen('A_1'));
  await env.minie(6000);
  env.dataLayer.push(unitOpen('A_2'));
  await env.gotowe();
  dymek.open = false;
  for (let i = 0; i < 4; i++) await env.minie(300);
  assert.equal(env.popupy.length, 1, 'jeden popup, nie dwa');
  assert.deepEqual([...env._dysk.state.scenarios.ogladany.freq.a1.units], ['A_2'], 'A_1 oddany, A_2 został');
  await env.minie(6000);
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.equal(env.popupy.length, 2, 'A_1 może przyjść później');
});

// ---------------------------------------------------------------------------
// ma.7: popup z szablonu panelu (templates.popup[], §13.9.3)
// ---------------------------------------------------------------------------

const SZABLON = {
  templateId: 'last-unit', version: 2,
  blocks: [
    { type: 'image', src: '{{unit.image}}', alt: '{{unit.name}}' },
    { type: 'title', text: '{{unit.name}} — {{unit.roomsLabel}}' },
    { type: 'text', text: '{{unit.building}}', fallback: 'Zobacz szczegóły lokalu' },
    { type: 'cta', label: 'Zobacz lokal', action: 'open_unit' },
  ],
  layout: { position: 'bottom-right', size: 'lg' },
  style: { background: 'token:surface', text: 'token:on-surface', accent: 'token:brand', font: 'token:body', radius: 'md' },
};

async function powrotZPopupem(k, opts) {
  const p1 = await start(Object.assign({ koperta: k }, opts || {}));
  p1.dataLayer.push(unitOpen('A_7', { building: null }, { data: { unit: { id: 'A_7', name: '7', custom: { rooms: 2, floor: 1, area: 49.85, price: 829212, building: null, status: 1 } } } }));
  await p1.gotowe();
  const p2 = await powrot(p1, 2 * H);
  return p2;
}

function oknoPopupu(env) {
  const nak = potomkowie(env.window.document.body).find((x) => x.getAttribute && x.getAttribute('d2-ma-template') !== null);
  return { nak, okno: nak && nak.querySelector('[d2-ma-template-body]') };
}

test('popup z szablonu: bloki przez createElement i textContent, fallback przy pustym polu, układ i tokeny stylu', async () => {
  const env = await powrotZPopupem(koperta([POWROT], { templates: { popup: [SZABLON] } }));
  assert.deepEqual(env.popupy.map((p) => p.name), ['d2-ma-last-unit']);
  const { nak, okno } = oknoPopupu(env);
  assert.ok(nak, 'nakładka z szablonu, nie wbudowana');
  assert.match(nak.style.cssText, /align-items:flex-end;justify-content:flex-end/);
  assert.match(okno.style.cssText, /max-width:520px/);
  assert.equal(okno.style['background-color'], 'var(--surface)');
  assert.equal(okno.style.color, 'var(--on-surface)');
  assert.equal(okno.style['font-family'], 'var(--body)');
  const dzieci = okno.children.map((c) => [c.tagName, c.textContent]);
  assert.deepEqual(dzieci.slice(1), [['H3', '7 — 2 pokoje'], ['P', 'Zobacz szczegóły lokalu'], ['A', 'Zobacz lokal']],
    'obraz pominięty (lokal bez zdjęcia), budynek pusty → fallback');
  assert.equal(okno.children[0].getAttribute('d2-ma-close'), '');
  assert.equal(okno.children[3].style['background-color'], 'var(--brand)');
});

test('popup z szablonu: własny [d2-ma-popup] strony wygrywa; bez templates.popup — wbudowany jak dotąd', async () => {
  const wlasny = element({ 'd2-ma-popup': 'last-unit' });
  wlasny.id = 'moj';
  const link = element({ 'd2-ma-cta': '', href: '#kontakt' }, 'A');
  wlasny.appendChild(link);
  const zKontaktem = Object.assign({}, SZABLON, { blocks: [{ type: 'cta', label: 'Napisz', action: 'contact' }] });
  const env = await powrotZPopupem(koperta([POWROT], { templates: { popup: [zKontaktem] } }), { szablon: wlasny });
  assert.equal(env.popupy.length, 1);
  assert.ok(!oknoPopupu(env).nak, 'nic nie zbudowane z szablonu');
  assert.equal(link.getAttribute('href'), 'https://demo.example/oferta?sm-unit=A_7', 'CTA z węzła (open_unit), nie z szablonu');
  const bez = await powrotZPopupem(koperta([POWROT]));
  assert.ok(!oknoPopupu(bez).nak);
  assert.ok(potomkowie(bez.window.document.body).some((x) => x.getAttribute && x.getAttribute('d2-ma-builtin') !== null));
});

test('popup z szablonu: nieznane pola — ostrzeżenie i pominięcie; złe bloki odpadają; styl tylko token:, bez HEX; > 8 bloków', async () => {
  const zly = {
    templateId: 'last-unit', html: '<b>x</b>',
    blocks: [
      { type: 'title', text: '{{unit.name}}', onclick: 'alert(1)' },
      { type: 'html', text: '<script>' },
      { type: 'image', src: 'https://evil.example/x.jpg' },
      { type: 'text', text: '{{unit.image}}' },
      { type: 'cta', label: 'Idź', action: 'link', href: 'javascript:alert(1)' },
    ].concat(Array.from({ length: 6 }, (_, i) => ({ type: 'text', text: 'T' + i }))),
    style: { background: '#ff0000', text: 'token:ok', position: 'absolute' },
  };
  const env = await powrotZPopupem(koperta([POWROT], { templates: { popup: [zly] } }));
  const w = env.ostrzezenia.join('\n');
  for (const frag of ['unknown field "html"', 'unknown field "onclick"', 'unknown block type', 'image src must be',
    'field outside §13.9.2', 'cta link needs an https href', 'style background must be token:', 'unknown field "position"', 'more than 8 blocks']) {
    assert.ok(w.includes(frag), frag);
  }
  const { okno } = oknoPopupu(env);
  assert.deepEqual(okno.children.slice(1).map((c) => c.textContent), ['7', 'T0', 'T1', 'T2'], 'tylko poprawne bloki z pierwszych 8');
  assert.equal(okno.style['background-color'], undefined, 'HEX odrzucony');
  assert.equal(okno.style.color, 'var(--ok)');
});

test('popup z szablonu: cta link — href przez safeLink; obraz z media.digi2.app; szablon bez poprawnych bloków odpada', async () => {
  const t = { templateId: 'last-unit', blocks: [
    { type: 'image', src: 'https://media.digi2.app/a.jpg', alt: 'Osiedle' },
    { type: 'cta', label: 'Cennik', action: 'link', href: 'https://demo.example/cennik' },
  ] };
  const env = await powrotZPopupem(koperta([POWROT], { templates: { popup: [t, { templateId: 'pusty', blocks: [{ type: 'x' }] }] } }));
  const { okno } = oknoPopupu(env);
  assert.equal(okno.children[1].getAttribute('src'), 'https://media.digi2.app/a.jpg');
  assert.equal(okno.children[2].getAttribute('href'), 'https://demo.example/cennik');
  assert.ok(env.ostrzezenia.some((x) => x.includes('popup template "pusty" — no valid block')));
});

test('#5: popup zastąpiony przez inny węzeł tego samego szablonu oddaje swoją częstotliwość (once_per_visit)', async () => {
  const dymek = { open: true };
  const k = koperta([
    scenariusz('pierwszy', { event: 'unit_view', unitIds: ['A_1'] }, [{ do: 'popup', template: 'last-unit' }]),
    scenariusz('drugi', { event: 'unit_view', unitIds: ['A_2'] }, [{ do: 'popup', template: 'last-unit' }]),
  ]);
  const env = await start({ koperta: k, dymek });
  env.dataLayer.push(unitOpen('A_1'));
  await env.minie(6000);
  env.dataLayer.push(unitOpen('A_2'));
  await env.gotowe();
  dymek.open = false;
  for (let i = 0; i < 4; i++) await env.minie(300);
  assert.equal(env.popupy.length, 1);
  const sc = env._dysk.state.scenarios;
  assert.ok(!sc.pierwszy.freq.a1, 'zastąpiony nie zajmuje swojego once_per_visit');
  assert.ok(sc.drugi.freq.a1, 'pokazany ma wpis');
});

test('popup z szablonu: link przycisku tylko https na hoście strony (z portem) — 2destate, obcy host, http i dane logowania odpadają', async () => {
  const cta = (href) => ({ templateId: 'last-unit', blocks: [{ type: 'title', text: 'T' }, { type: 'cta', label: 'Idź', action: 'link', href }] });
  for (const [href, ok] of [['https://demo.example/cennik', true], ['/kontakt', true],
    ['https://evil.booking.2destate.com/', false], ['https://acme.booking.2destate.com/', false], ['https://2destate.com/', false],
    ['https://evil.example/login', false], ['http://demo.example/cennik', false], ['https://demo.example.evil.com/', false],
    ['https://demo.example:8443/', false], ['https://user:pass@demo.example/', false], ['https://user@demo.example/', false], ['https://:sekret@demo.example/', false]]) {
    const env = await powrotZPopupem(koperta([POWROT], { templates: { popup: [cta(href)] } }));
    const { okno } = oknoPopupu(env);
    const a = okno.children.find((c) => c.tagName === 'A');
    assert.equal(!!a, ok, href);
    if (ok) assert.equal(a.getAttribute('href'), new URL(href, 'https://demo.example/oferta').href);
    else assert.ok(env.ostrzezenia.some((w) => w.includes('cta link needs an https href on this site')), href);
  }
});

test('popup z szablonu: przycisk contact nie skacze na „#” (preventDefault)', async () => {
  const t = { templateId: 'last-unit', blocks: [{ type: 'title', text: 'T' }, { type: 'cta', label: 'Napisz', action: 'contact' }] };
  const env = await powrotZPopupem(koperta([POWROT], { templates: { popup: [t] } }));
  const { okno } = oknoPopupu(env);
  const a = okno.children.find((c) => c.tagName === 'A');
  let zatrzymany = false;
  a._klik({ preventDefault() { zatrzymany = true; } });
  assert.equal(zatrzymany, true);
});

test('#10: nowa koperta ze zmienionym szablonem przebudowuje popup (d2-ma-refresh)', async () => {
  const k1 = koperta([RAZ_NA_LOKAL], { templates: { popup: [Object.assign({}, SZABLON, { layout: { position: 'top', size: 'sm' } })] } });
  const env = await start({ koperta: k1 });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.match(oknoPopupu(env).okno.style.cssText, /max-width:320px/);
  await env.ma.load(koperta([RAZ_NA_LOKAL], { templates: { popup: [Object.assign({}, SZABLON, { layout: { position: 'center', size: 'lg' } })] } }));
  await env.minie(6000);
  env.dataLayer.push(unitOpen('A_2'));
  await env.gotowe();
  const zbudowane = potomkowie(env.window.document.body).filter((x) => x.getAttribute && x.getAttribute('d2-ma-template') !== null);
  assert.equal(zbudowane.length, 1, 'stary szkielet usunięty');
  assert.match(oknoPopupu(env).okno.style.cssText, /max-width:520px/);
  assert.equal(env.popupy.length, 2);
});

// ---------------------------------------------------------------------------
// Kontekst leadu w formularzu (ma.16): d2ma_context / d2ma_context_json
// ---------------------------------------------------------------------------

function formKontekst(attrs) {
  return element(attrs || {}, 'FORM');
}
const pole = (form, name) => form.querySelector('[name="' + name + '"]');

test('kontekst leadu: submit dopisuje d2ma_context (tekst PL) i, przy d2-ma-context="json", d2ma_context_json; drugi submit nadpisuje, nie dubluje', async () => {
  const env = await start({
    koperta: koperta([scenariusz('s', { event: 'unit_view' }, [SEG('powrot-do-lokalu')])]),
    search: '?utm_source=meta&utm_medium=cpc&utm_campaign=jesien',
  });
  env.dataLayer.push(unitOpen('A_M12', { rooms: 3, floor: 2, area: 64, price: 689000 }));
  await env.gotowe();
  await env.minie(10 * MIN);
  env.dataLayer.push(unitOpen('A_M12', { rooms: 3, floor: 2, area: 64, price: 689000 }));
  await env.minie(MIN);
  env.dataLayer.push(unitOpen('A_M8', { rooms: 2, floor: 0, area: 41.5, price: 455000 }));
  await env.gotowe();

  const form = formKontekst({ 'd2-ma-context': 'json' });
  env.dom('submit', { target: form });
  const txt = pole(form, 'd2ma_context');
  const json = pole(form, 'd2ma_context_json');
  assert.ok(txt && json, 'oba pola dopisane');
  assert.equal(txt.getAttribute('type'), 'hidden');
  assert.equal(json.getAttribute('type'), 'hidden');
  assert.equal(pole(form, 'd2ma_consent').value, '1', 'ma.18: znacznik zgody');
  assert.equal(form.children.length, 3);

  const t = txt.value;
  assert.ok(t.startsWith('1 wizyta (20.10)'), t);
  assert.ok(t.includes('2 obejrzane lokale, najczęściej M12 (3 pok., 2 p., 64 m², 689'), t);
  assert.ok(t.includes('×2'), t);
  assert.ok(t.includes('lokale: M8 ×1 (20.10 12:11), M12 ×2 (20.10 12:10)'), 'lista od najnowszego: ' + t);
  assert.ok(t.includes('preferencja: 3 pokoje'), t);
  assert.ok(t.includes('segmenty: powrot-do-lokalu'), t);
  assert.ok(t.includes('ostatni lokal: M8'), t);
  assert.ok(t.includes('strona: /oferta'), t);
  assert.ok(t.includes('źródło: meta / cpc / jesien'), t);
  assert.ok(t.length <= 2000);

  const j = JSON.parse(json.value);
  assert.equal(j.v, 1);
  assert.equal(j.visits.length, 1);
  assert.ok(/^2026-10-20T/.test(j.visits[0].t), j.visits[0].t);
  assert.equal(j.visits[0].path, '/oferta');
  assert.deepEqual(j.units.map((u) => [u.id, u.name, u.views, u.rooms, u.price]), [['A_M8', 'M8', 1, 2, 455000], ['A_M12', 'M12', 2, 3, 689000]]);
  assert.ok(/^2026-10-20T/.test(j.units[0].last));
  assert.deepEqual(j.pref, { rooms: 3, floor: 2 });
  assert.deepEqual(j.segments, ['powrot-do-lokalu']);
  assert.deepEqual(j.last_unit, { id: 'A_M8', name: 'M8' });
  assert.equal(j.lead, false);
  assert.deepEqual(j.source, { utm_source: 'meta', utm_medium: 'cpc', utm_campaign: 'jesien' });
  assert.ok(Buffer.byteLength(json.value, 'utf8') <= 4096);

  // Lead i kolejne obejrzenie: drugi submit nadpisuje wartości w tych samych polach.
  env.dataLayer.push({ event: 'generate_lead' });
  await env.gotowe();
  env.dom('submit', { target: form });
  assert.equal(form.children.length, 3, 'bez duplikatów');
  assert.ok(pole(form, 'd2ma_context').value.includes('lead: tak (20.10)'));
  assert.equal(JSON.parse(pole(form, 'd2ma_context_json').value).lead, true);

  // digi2.ma.context() daje to samo, co pola.
  const c = env.ma.context();
  assert.equal(c.text, pole(form, 'd2ma_context').value);
  assert.equal(c.json, pole(form, 'd2ma_context_json').value);
});

test('kontekst leadu: bez d2-ma-context="json" tylko tekst; własne pole strony o tej nazwie jest nadpisywane, nie dublowane', async () => {
  const env = await start({ koperta: koperta([]) });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  const form = formKontekst();
  const wlasne = element({ type: 'text', name: 'd2ma_context', value: 'stare' }, 'INPUT');
  wlasne.value = 'stare';
  form.appendChild(wlasne);
  env.dom('submit', { target: form });
  assert.equal(form.children.length, 2, 'własne pole + d2ma_consent, bez JSON');
  assert.ok(wlasne.value.startsWith('1 wizyta'), wlasne.value);
  assert.equal(pole(form, 'd2ma_context_json'), null);
});

test('kontekst leadu: bez zgody „brak kontekstu (brak zgody)”, JSON pominięty, a własne pole JSON strony opróżnione', async () => {
  const env = await start({ koperta: koperta([], { storage: { retentionDays: 90, consentRequired: true } }) });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  assert.equal(env.ma.profile(), null, 'bez zgody brak profilu');
  const form = formKontekst({ 'd2-ma-context': 'json' });
  const wlasne = element({ type: 'hidden', name: 'd2ma_context_json' }, 'INPUT');
  wlasne.value = '{"stare":1}';
  form.appendChild(wlasne);
  env.dom('submit', { target: form });
  assert.equal(pole(form, 'd2ma_context').value, 'brak kontekstu (brak zgody)');
  assert.equal(form.children.length, 2, 'tekst dopisany, JSON nie');
  assert.equal(wlasne.value, '');
  assert.equal(env.ma.context(), null);
});

test('kontekst leadu: formularz z d2-ma-ignore i strona z d2-ma-context="off" na tagu loadera zostają nietknięte', async () => {
  const env = await start({ koperta: koperta([]) });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  const ignorowany = formKontekst({ 'd2-ma-ignore': '', 'd2-ma-context': 'json' });
  env.dom('submit', { target: ignorowany });
  assert.equal(ignorowany.children.length, 0);
  assert.equal(env.ma.fillContext(ignorowany), false);
  const nieFormularz = element({ 'd2-ma-context': 'json' });
  env.dom('submit', { target: nieFormularz });
  assert.equal(nieFormularz.children.length, 0);

  const off = await start({ koperta: koperta([]), cfg: { 'd2-ma-context': 'off' } });
  off.dataLayer.push(unitOpen('A_1'));
  await off.gotowe();
  const form = formKontekst({ 'd2-ma-context': 'json' });
  off.dom('submit', { target: form });
  assert.equal(form.children.length, 0, 'wyłączone na tagu loadera');
  assert.equal(off.ma.fillContext(form), false);
});

test('kontekst leadu: limity — tekst ≤ 2000 znaków ucina najstarsze wizyty i lokale, JSON ≤ 4 kB zachowuje najnowsze lokale', async () => {
  const env = await start({ koperta: koperta([]) });
  for (let i = 0; i < 120; i++) {
    env.dataLayer.push(unitOpen('B_Lokal-o-bardzo-dlugiej-nazwie-' + i, { rooms: (i % 4) + 1, floor: i % 6, area: 40 + i, price: 400000 + i * 1000 }));
    await env.minie(45 * MIN);   // każde obejrzenie w nowej wizycie (przerwa > VISIT_GAP)
  }
  const form = formKontekst({ 'd2-ma-context': 'json' });
  env.dom('submit', { target: form });
  const t = pole(form, 'd2ma_context').value;
  assert.ok(t.length <= 2000, 'tekst ' + t.length);
  assert.ok(t.startsWith('120 wizyt (…, '), t.slice(0, 40));
  assert.ok(t.includes('120 obejrzanych lokali'), t.slice(0, 200));
  assert.ok(t.includes('Lokal-o-bardzo-dlugiej-nazwie-119 ×1'), 'najnowszy lokal zostaje');
  assert.ok(t.includes(', …'), 'lista lokali ucięta');
  const js = pole(form, 'd2ma_context_json').value;
  assert.ok(Buffer.byteLength(js, 'utf8') <= 4096, 'json ' + Buffer.byteLength(js, 'utf8'));
  const j = JSON.parse(js);
  assert.equal(j.units[0].id, 'B_Lokal-o-bardzo-dlugiej-nazwie-119');
  assert.ok(j.units.length < 120 && j.units.length > 0);
  assert.ok(j.visits.length >= 1 && j.visits.length <= 60);
  assert.equal(j.visits[j.visits.length - 1].path, '/oferta');
});


// ---------------------------------------------------------------------------
// Wyszukiwarka 2destate (ma.17, §13.14): search_filter, prefer_filters, sort, GA4
// ---------------------------------------------------------------------------

const czyste = (x) => JSON.parse(JSON.stringify(x));
const bezNbsp = (x) => String(x).replace(/\u00a0/g, ' ');
const dlZdarzenia = (env, name) => env.dataLayer.filter((e) => e && e.event === name).map((e) => ({ ...e }));
const produkt2d = (id, rooms, extra) => Object.assign({ id, name: id, rooms, floor: 1, area: 50.5, price_gross: 600000, status: 'available', building_name: 'B' }, extra || {});

test('search_filter: filtr gościa (source user) z pokojami odpala wyzwalacz; source api i inny pokój — nie; minCount liczy filtry', async () => {
  const k = koperta([
    scenariusz('filtr2', { event: 'search_filter', rooms: 2 }, [Object.assign(SEG('filtr-2-pokoje'), { frequency: 'once_per_days:0' })]),
    scenariusz('filtr3x2', { event: 'search_filter', rooms: 3, minCount: 2 }, [Object.assign(SEG('filtr-3-pokoje'), { frequency: 'once_per_days:0' })]),
  ], { minScript: 'ma.17' });
  const env = await start({ koperta: k });
  assert.ok(!env.ostrzezenia.some((w) => w.includes('needs d2-ma')), 'ma.17 zna nowe węzły');
  env.filtr({ rooms: [2] }, { source: 'api' });
  env.filtr({ rooms: [2] }, { source: undefined });
  await env.minie(600);
  assert.equal(env.segmenty().length, 0, 'zmiana ze skryptu (i bez source) nie jest zachowaniem gościa');
  env.filtr({ rooms: [1] });
  await env.minie(600);
  assert.equal(env.segmenty().length, 0);
  env.filtr({ rooms: [2, 3], priceMax: 700000 });
  await env.minie(600);
  assert.deepEqual(env.segmenty().map((e) => e.segment), ['filtr-2-pokoje'], '3 pokoje: dopiero drugi filtr');
  env.filtr({ rooms: [3] });
  await env.minie(600);
  assert.deepEqual(env.segmenty().map((e) => e.segment), ['filtr-2-pokoje', 'filtr-3-pokoje']);
  const p = env.ma.profile();
  assert.deepEqual(czyste(p.filters.rooms), [3]);
  assert.equal(p.filters.visit, 1);
});

test('pref z filtra tylko przy pustej historii; pierwsze obejrzenie przejmuje preferencję', async () => {
  const env = await start({ koperta: koperta([]) });
  env.filtr({ rooms: [2], floor: [3] });
  await env.minie(600);
  assert.deepEqual(czyste(env.ma.profile().pref), { rooms: 2, floor: 3 });
  env.dataLayer.push(unitOpen('A_1', { rooms: 4, floor: 0 }));
  await env.gotowe();
  assert.deepEqual(czyste(env.ma.profile().pref), { rooms: 4, floor: 0 }, 'filtr nie przebija obejrzeń');
});

test('popup promo-filter: search_filter rooms=2 przy pustej historii → wbudowany popup bez lokalu; filtr bez pokoi — pominięty', async () => {
  const k = koperta([scenariusz('promo', { event: 'search_filter' }, [{ do: 'popup', template: 'promo-filter', cta: 'contact', frequency: 'once_per_days:0' }])], { minScript: 'ma.17' });
  const bez = await start({ koperta: k });
  bez.filtr({ priceMax: 500000 });
  await bez.minie(600);
  assert.equal(bez.popupy.length, 0, 'bez pref.rooms nie ma czego wstawić — popup pominięty');

  const env = await start({ koperta: k });
  const akcje = [];
  env.window.digi2.on('ma:action', (a) => akcje.push(a));
  env.filtr({ rooms: [2] });
  await env.minie(600);
  assert.deepEqual(env.popupy.map((x) => x.name), ['d2-ma-promo-filter']);
  assert.ok(akcje.some((a) => a.do === 'popup' && a.template === 'promo-filter' && a.unit == null));
  assert.ok(potomkowie(env.window.document.body).some((x) => x.getAttribute && x.getAttribute('d2-ma-popup') === 'promo-filter' && x.getAttribute('d2-ma-builtin') !== null));
  assert.equal(env.ostrzezenia.filter((w) => w.includes('popup failed')).length, 0);
});

test('prefer_filters: powrót ustawia filtr pokoi z profilu (source api) raz na wizytę; gość, który już filtrował — bez zmian', async () => {
  const k = koperta([scenariusz('pref', { event: 'return_visit', afterHours: 1 }, [{ do: 'prefer_filters', by: 'rooms' }])], { minScript: 'ma.17' });
  const p1 = await start({ koperta: k, imp: { instances: { mapa: {} } } });
  p1.dataLayer.push(unitOpen('A_1', { rooms: 3 }));
  await p1.gotowe();
  assert.equal(p1.ustawioneFiltry.length, 0);
  const p2 = await powrot(p1, 2 * H);
  assert.deepEqual(czyste(p2.ustawioneFiltry), [['mapa', { rooms: [3] }, { source: 'api' }]]);
  // Echo z core (source api) nie jest filtrem gościa: nie zmienia profilu.
  p2.filtr({ rooms: [3] }, { source: 'api' });
  await p2.gotowe();
  assert.equal(p2.ma.profile().filters, null);

  // Kolejna wizyta: gość zdążył filtrować sam, zanim przyszedł powrót — prefer_filters ustępuje.
  const p3 = await powrot(p2, 2 * H);
  assert.equal(p3.ustawioneFiltry.length, 1, 'nowa wizyta, nowe ustawienie');
  // Wyzwalacz w trakcie wizyty (obejrzenie lokalu): gość filtrował wcześniej w tej wizycie → ustępuje.
  const k2 = koperta([scenariusz('pref2', { event: 'type_view', rooms: 3, minCount: 1 }, [{ do: 'prefer_filters', by: 'both', frequency: 'once_per_days:0' }])], { minScript: 'ma.17' });
  const nowa = await start({ koperta: k2, imp: { instances: { mapa: {} } } });
  nowa.filtr({ rooms: [1] });
  await nowa.minie(600);
  nowa.dataLayer.push(unitOpen('A_1', { rooms: 3, floor: 2 }));
  await nowa.gotowe();
  assert.equal(nowa.ustawioneFiltry.length, 0, 'filtr gościa w tej wizycie wygrywa');
  const nowa2 = await powrot(nowa, 2 * H);
  nowa2.dataLayer.push(unitOpen('A_2', { rooms: 3, floor: 2 }));
  await nowa2.gotowe();
  assert.deepEqual(czyste(nowa2.ustawioneFiltry), [['mapa', { rooms: [3], floor: [2] }, { source: 'api' }]], 'nowa wizyta bez filtra — by: both');

  const stara = await start({ koperta: k, imp: { instances: { mapa: {} } }, wyszukiwarka: false });
  stara.dataLayer.push(unitOpen('A_1', { rooms: 3 }));
  await stara.gotowe();
  const s2 = await powrot(stara, 2 * H);
  assert.equal(s2.ostrzezenia.filter((w) => w.includes('prefer_filters failed')).length, 0, 'bez core 1.7.0 pominięte po cichu');
});

test('map_order ustępuje sortowaniu gościa do końca wizyty; sort custom (nasz) i api się nie liczą', async () => {
  const produkty = [produkt2d('u1', 3), produkt2d('u2', 2)];
  const k = koperta([scenariusz('kol', { event: 'type_view', rooms: 2, minCount: 1 }, [{ do: 'map_order', by: 'rooms', frequency: 'every_time' }])], { minScript: 'ma.17' });
  const kolejnosc = [];
  const env = await start({ koperta: k, produkty, imp: { instances: { mapa: {} } } });
  env.window.d2estate.setProductOrder = (m, ids) => { kolejnosc.push([...ids]); return ids.length; };
  env.sortuj('custom', 'asc');
  env.sortuj('price', 'asc', { source: 'api' });
  env.dataLayer.push(unitOpen('X', { rooms: 2 }));
  await env.gotowe();
  assert.deepEqual(kolejnosc, [['u2']], 'custom / api to nie wybór gościa');
  env.sortuj('price', 'asc');
  await env.minie(6000);
  env.dataLayer.push(unitOpen('Y', { rooms: 2 }));
  await env.gotowe();
  assert.equal(kolejnosc.length, 1, 'gość wybrał sortowanie — profil nie przestawia listy');
  assert.deepEqual(czyste(env.ma.profile().sort), { by: 'price', dir: 'asc' });
});

test('GA4: view_item_list po 500 ms (jedno zdarzenie z ostatnim stanem), select_item + view_flat z listy, view_flat z mapy; api bez zdarzenia; d2-ma-search-events="off"', async () => {
  const produkty = [produkt2d('u1', 3), produkt2d('u2', 2), produkt2d('u3', 6)];
  const env = await start({ koperta: koperta([]), produkty });
  env.filtr({ rooms: [2] });
  env.filtr({ rooms: [2, 3], floor: [1], areaMin: 40, areaMax: 60, priceMax: 700000, status: ['available'], building: ['B'] }, { resultCount: 5 });
  env.sortuj('price', 'asc');
  await env.minie(400);
  assert.equal(dlZdarzenia(env, 'view_item_list').length, 0, 'debounce');
  await env.minie(200);
  assert.deepEqual(dlZdarzenia(env, 'view_item_list'), [{
    event: 'view_item_list', item_list_name: 'wyszukiwarka', filters: 'rooms=2|3;floor=1;area=40-60;price=-700000;status=available;building=B',
    filter_count: 6, matching: 5, total: 3, item_list_sort: 'price_asc',
  }]);
  env.filtr({ rooms: [2] }, { source: 'api' });
  await env.minie(600);
  assert.equal(dlZdarzenia(env, 'view_item_list').length, 1, 'zmiana ze skryptu bez zdarzenia');

  env.klik(produkt2d('u3', 6, { promo_active: true, promo_price_gross: 550000, type: 'mieszkanie' }), { source: 'list' });
  await env.gotowe();
  assert.deepEqual(dlZdarzenia(env, 'select_item'), [{ event: 'select_item', item_list_name: 'wyszukiwarka', item_id: 'u3', item_name: 'u3' }]);
  env.klik(produkt2d('u2', 2));
  await env.gotowe();
  assert.deepEqual(dlZdarzenia(env, 'view_flat'), [
    { event: 'view_flat', flat_id: 'u3', flat_name: 'u3', flat_rooms: 6, flat_rooms_group: '5+', flat_floor: 1, flat_area: 50.5, flat_type: 'mieszkanie',
      flat_building: 'B', flat_availability: 'available', flat_price: 550000, flat_isPromo: true, view_source: 'wyszukiwarka' },
    { event: 'view_flat', flat_id: 'u2', flat_name: 'u2', flat_rooms: 2, flat_rooms_group: '2', flat_floor: 1, flat_area: 50.5, flat_type: undefined,
      flat_building: 'B', flat_availability: 'available', flat_price: 600000, flat_isPromo: false, view_source: 'mapa' },
  ]);
  assert.equal(dlZdarzenia(env, 'select_item').length, 1, 'klik w mapę to nie select_item');

  const off = await start({ koperta: koperta([]), produkty, cfg: { 'd2-ma-search-events': 'off' } });
  off.filtr({ rooms: [2] });
  off.klik(produkt2d('u2', 2), { source: 'list' });
  await off.minie(600);
  assert.equal(off.dataLayer.filter((e) => e && ['view_item_list', 'select_item', 'view_flat'].includes(e.event)).length, 0);
  assert.equal(off.ma.history().length, 1, 'wyłączone zdarzenia GA4, profil działa dalej');
});

test('kontekst leadu: „filtrował: …” w tekście i filters w JSON (ma.17)', async () => {
  const env = await start({ koperta: koperta([]) });
  env.filtr({ rooms: [2, 3], priceMax: 700000, status: ['available'] });
  await env.minie(600);
  const form = element({ 'd2-ma-context': 'json' }, 'FORM');
  env.dom('submit', { target: form });
  const t = bezNbsp(form.querySelector('[name="d2ma_context"]').value);
  assert.ok(t.includes('filtrował: 2–3 pokoje, do 700 000 zł, tylko wolne'), t);
  assert.ok(t.includes('preferencja: 2 pokoje'), 'pref z filtra przy pustej historii: ' + t);
  const j = JSON.parse(form.querySelector('[name="d2ma_context_json"]').value);
  assert.deepEqual(Object.assign({}, j.filters, { t: 0 }), { rooms: [2, 3], priceMax: 700000, status: ['available'], t: 0 });
  assert.ok(/^2026-10-20T/.test(j.filters.t));
});

test('kontekst leadu: klik w przycisk wysyłki wypełnia pola przed submit; alias data-d2-ma-context; bez opt-in własne pole JSON strony nietknięte', async () => {
  const env = await start({ koperta: koperta([]) });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  const form = element({ 'data-d2-ma-context': 'json' }, 'FORM');
  const btn = element({ type: 'submit' }, 'BUTTON');
  form.appendChild(btn);
  btn.parent = form;
  env.dom('click', { target: btn });
  assert.ok(form.querySelector('[name="d2ma_context"]').value.startsWith('1 wizyta'));
  assert.ok(JSON.parse(form.querySelector('[name="d2ma_context_json"]').value).v === 1, 'alias data-d2-ma-context');
  const zwykly = element({}, 'FORM');
  const przycisk = element({ type: 'button' }, 'BUTTON');
  zwykly.appendChild(przycisk);
  przycisk.parent = zwykly;
  env.dom('click', { target: przycisk });
  assert.equal(zwykly.querySelector('[name="d2ma_context"]'), null, 'przycisk type=button nie wysyła');
  const wlasne = element({ type: 'hidden', name: 'd2ma_context_json' }, 'INPUT');
  wlasne.value = 'strony';
  zwykly.appendChild(wlasne);
  env.dom('submit', { target: zwykly });
  assert.equal(wlasne.value, 'strony', 'bez d2-ma-context="json" pole JSON strony ani wypełniane, ani opróżniane');
});


test('ma.18 d2ma_consent: "1" tylko przy aktywnym profilu; bez zgody nie dodawane, a własne pole strony opróżnione; d2-ma-ignore — nietknięte', async () => {
  const env = await start({ koperta: koperta([]) });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  const form = element({}, 'FORM');
  env.dom('submit', { target: form });
  const c = form.querySelector('[name="d2ma_consent"]');
  assert.ok(c, 'dopisane także bez d2-ma-context="json"');
  assert.equal(c.value, '1');
  assert.equal(c.getAttribute('type'), 'hidden');
  env.dom('submit', { target: form });
  assert.equal(form.children.filter((x) => x.getAttribute('name') === 'd2ma_consent').length, 1, 'bez duplikatu');

  const bez = await start({ koperta: koperta([], { storage: { retentionDays: 90, consentRequired: true } }) });
  const f2 = element({}, 'FORM');
  bez.dom('submit', { target: f2 });
  assert.equal(f2.querySelector('[name="d2ma_consent"]'), null, 'bez zgody pola nie ma');
  const f3 = element({}, 'FORM');
  const wlasne = element({ type: 'hidden', name: 'd2ma_consent' }, 'INPUT');
  wlasne.value = '1';
  f3.appendChild(wlasne);
  bez.dom('submit', { target: f3 });
  assert.equal(wlasne.value, '', 'własne pole strony opróżnione');
  assert.equal(f3.querySelector('[name="d2ma_context"]').value, 'brak kontekstu (brak zgody)');

  const ign = element({ 'd2-ma-ignore': '' }, 'FORM');
  env.dom('submit', { target: ign });
  assert.equal(ign.children.length, 0);
});


test('ma.18 (#23 recenzja): seria zmian filtra w 500 ms = jedno trafienie search_filter i jeden wpis filterLog; item_list_sort tylko price|area|floor; Wyczyść zeruje filtry', async () => {
  const k = koperta([scenariusz('dwa', { event: 'search_filter', minCount: 2 }, [Object.assign(SEG('filtr-x2'), { frequency: 'once_per_days:0' })])], { minScript: 'ma.17' });
  const env = await start({ koperta: k, imp: { instances: { mapa: {} } } });
  for (let i = 0; i < 6; i++) { env.filtr({ priceMax: 500000 + i * 10000 }); await env.minie(100); }
  await env.minie(600);
  assert.equal(env.segmenty().length, 0, 'suwak = jedno zdarzenie, minCount 2 nie nabity');
  assert.equal(czyste(env.ma.profile().filters).priceMax, 550000, 'ostatnia wartość serii');
  env.filtr({ priceMax: 600000 });
  await env.minie(600);
  assert.deepEqual(env.segmenty().map((e) => e.segment), ['filtr-x2'], 'druga, osobna zmiana');

  for (const [by, want] of [['rooms', undefined], ['name', undefined], ['area', 'area_desc'], ['floor', 'floor_desc']]) {
    env.sortuj(by, 'desc');
    await env.minie(600);
    const ev = dlZdarzenia(env, 'view_item_list').pop();
    assert.equal(ev.item_list_sort, want, by);
  }

  await env.ma.clear();
  assert.deepEqual(czyste(env.ustawioneFiltry.pop()), ['mapa', {}, { source: 'api' }], 'Wyczyść');
});


test('ma.19: filtr zmieniony < 500 ms przed wysyłką trafia do kontekstu (flush), z czasem ostatniej zmiany; pagehide też zapisuje', async () => {
  const env = await start({ koperta: koperta([]) });
  await env.minie(MIN);
  const t0 = env.zegar.t;
  env.filtr({ rooms: [2] });
  await env.minie(200);
  const form = element({ 'd2-ma-context': 'json' }, 'FORM');
  env.dom('submit', { target: form });
  assert.ok(bezNbsp(form.querySelector('[name="d2ma_context"]').value).includes('filtrował: 2 pokoje'), 'flush przed kontekstem');
  assert.equal(JSON.parse(form.querySelector('[name="d2ma_context_json"]').value).filters.t, new Date(t0).toISOString(), 'at = chwila zmiany, nie wysyłki');
  await env.minie(600);
  assert.equal(env.ma.profile().filters.ts, t0, 'timer nie dubluje: jeden wpis');

  const p2 = await start({ koperta: koperta([]) });
  p2.filtr({ rooms: [4] });
  await p2.minie(100);
  p2.okno('pagehide');
  await p2.gotowe();
  assert.deepEqual(czyste(p2.ma.profile().filters.rooms), [4], 'pagehide');
});

test('ma.19: item_list_sort — price_asc jest; custom (nasz setProductOrder) nie daje zdarzenia, a następne zdarzenie listy idzie bez parametru', async () => {
  const env = await start({ koperta: koperta([]) });
  env.sortuj('price', 'asc');
  await env.minie(600);
  assert.equal(dlZdarzenia(env, 'view_item_list').pop().item_list_sort, 'price_asc');
  const przed = dlZdarzenia(env, 'view_item_list').length;
  env.sortuj('custom', 'asc');
  await env.minie(600);
  assert.equal(dlZdarzenia(env, 'view_item_list').length, przed, 'custom to nie wybór gościa — bez zdarzenia');
  env.filtr({ rooms: [2] });
  env.sortuj('custom', 'asc', { source: 'user' });
  await env.minie(600);
  assert.equal(dlZdarzenia(env, 'view_item_list').pop().item_list_sort, undefined, 'lista ułożona custom (nasz setProductOrder) — bez item_list_sort');
});

test('SCRIPT_VERSION w ma.js = numer najwyższego wpisu v1.9.0-ma.N w CHANGELOG', () => {
  const kod = fs.readFileSync(modulePath, 'utf8');
  const v = Number(/var SCRIPT_VERSION = (\d+);/.exec(kod)[1]);
  const log = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
  const top = Number(/^## v\d+\.\d+\.\d+-ma\.(\d+)/m.exec(log)[1]);
  assert.equal(v, top, 'podbij SCRIPT_VERSION razem z wpisem w CHANGELOG');
});


test('ma.20: pagehide z odłożonym filtrem zapisuje tylko fakt — 0 webhooków, 0 nowych wpisów dataLayer, bez popupu; następna odsłona nie odtwarza', async () => {
  const k = koperta([scenariusz('f', { event: 'search_filter', rooms: 2 }, [
    Object.assign(SEG('filtr-2'), { frequency: 'once_per_days:0' }),
    { do: 'webhook', channel: 'email', template: 't', testOnly: true },
    { do: 'popup', template: 'promo-filter', cta: 'contact' },
  ])], { minScript: 'ma.20' });
  const env = await start({ koperta: k });
  await env.minie(MIN);
  const t0 = env.zegar.t;
  env.filtr({ rooms: [2] });
  await env.minie(100);
  const dlPrzed = env.dataLayer.length;
  env.okno('pagehide');
  await env.gotowe();
  assert.equal(env.webhooki.length, 0, 'bez webhooka przy wyjściu');
  assert.equal(env.dataLayer.length, dlPrzed, 'bez nowych wpisów dataLayer');
  assert.equal(env.popupy.length, 0);
  assert.deepEqual(czyste(env.ma.profile().filters.rooms), [2]);
  assert.equal(env.ma.profile().filters.ts, t0, 'czas ostatniej zmiany');
  await env.minie(600);
  assert.equal(env.segmenty().length, 0, 'timer zdjęty — nic nie dochodzi po wyjściu');

  const p2 = await powrot(env, 5 * MIN);
  assert.equal(p2.segmenty().length, 0, 'następna odsłona nie odtwarza wyzwalacza');
  assert.equal(p2.webhooki.length, 0);
  assert.deepEqual(czyste(p2.ma.profile().filters.rooms), [2], 'fakt w d2ma przetrwał');
});

test('ma.20: flush bez zgody — przy wysyłce i przy wyjściu nic nie trafia do d2ma ani do scenariuszy', async () => {
  const k = koperta([scenariusz('f', { event: 'search_filter' }, [SEG('filtr')])], { storage: { retentionDays: 90, consentRequired: true } });
  const env = await start({ koperta: k });
  env.filtr({ rooms: [3] });
  await env.minie(100);
  const form = element({}, 'FORM');
  env.dom('submit', { target: form });
  assert.equal(form.querySelector('[name="d2ma_context"]').value, 'brak kontekstu (brak zgody)');
  env.filtr({ rooms: [4] });
  env.okno('pagehide');
  await env.minie(600);
  assert.equal(env.ma.profile(), null);
  assert.equal(env.segmenty().length, 0);
  assert.equal(JSON.stringify(env._dysk).includes('rooms'), false, 'nic w magazynie');
});


test('ma.21: zdarzenia GA4 wyszukiwarki mają każdy klucz kontraktu — brak wartości = undefined, nie brak klucza (DLV nie bierze wartości z poprzedniego pushu)', async () => {
  const env = await start({ koperta: koperta([]), produkty: [produkt2d('u1', 2)] });
  env.klik(produkt2d('u1', 2, { price_gross: 640000 }));
  env.klik({ id: 'u2', name: 'u2', rooms: 3, floor: 2, status: 'available' });
  await env.gotowe();
  const vf = env.dataLayer.filter((e) => e && e.event === 'view_flat');
  assert.equal(vf[0].flat_price, 640000);
  assert.ok(Object.prototype.hasOwnProperty.call(vf[1], 'flat_price'), 'klucz flat_price obecny');
  assert.equal(vf[1].flat_price, undefined);
  for (const k of ['flat_id', 'flat_name', 'flat_rooms', 'flat_rooms_group', 'flat_floor', 'flat_area', 'flat_type', 'flat_building',
    'flat_availability', 'flat_price', 'flat_isPromo', 'view_source']) assert.ok(k in vf[1], k);

  env.sortuj('price', 'asc');
  await env.minie(600);
  env.sortuj('rooms', 'asc');
  await env.minie(600);
  const vil = env.dataLayer.filter((e) => e && e.event === 'view_item_list');
  assert.equal(vil[0].item_list_sort, 'price_asc');
  assert.ok(Object.prototype.hasOwnProperty.call(vil[1], 'item_list_sort'), 'klucz item_list_sort obecny');
  assert.equal(vil[1].item_list_sort, undefined);
  for (const k of ['item_list_name', 'filters', 'filter_count', 'matching', 'total', 'item_list_sort']) assert.ok(k in vil[1], k);

  env.klik({ id: 'u3', rooms: 1, status: 'available' }, { source: 'list' });
  await env.gotowe();
  const si = env.dataLayer.filter((e) => e && e.event === 'select_item').pop();
  assert.ok('item_name' in si && si.item_name === undefined, 'select_item bez nazwy: klucz z undefined');

  // ma_segment nie przechodzi przez dlPush — bez zmian (bez kluczy z undefined).
  const seg = await start({ koperta: koperta([scenariusz('s', { event: 'unit_view' }, [DL('ma_segment')])]) });
  seg.dataLayer.push(unitOpen('A_1'));
  await seg.gotowe();
  const e = seg.dataLayer.find((x) => x && x.event === 'ma_segment');
  assert.deepEqual(Object.keys(e).sort(), ['event', 'ma_scenario', 'segment']);
});

// ---------------------------------------------------------------------------
// ma.12: gorący lead wraca — MA-D38 etap 1, wariant D′ (visitorId, 2destate)
// ---------------------------------------------------------------------------

const UID = (n) => 'aaaaaaaa-bbbb-4ccc-8ddd-' + String(n).padStart(12, '0');
const HOT = { 'd2-ma-hot-lead': '' };
const VISIT = 'https://api.2destate.com/api/v1/public/ma/visit';
const REVOKE = 'https://api.2destate.com/api/v1/public/ma/revoke';

/** Formularz dema z ukrytym polem [d2-ma-visitor-id]. */
function formularzDema() {
  const form = element({ id: 'demo' }, 'FORM');
  const ukryte = element({ type: 'hidden', name: 'd2ma_visitor_id', 'd2-ma-visitor-id': '' }, 'INPUT');
  ukryte.value = 'stare';
  form.appendChild(ukryte);
  return { form, ukryte };
}

/** Pierwsza wizyta: formularz z visitorId i lead (generate_lead). */
async function leadDema(opts) {
  const env = await start(Object.assign({ koperta: koperta([]), cfg: HOT }, opts || {}));
  const { form, ukryte } = formularzDema();
  env.dom('submit', { target: form });
  env.dataLayer.push({ event: 'generate_lead' });
  await env.gotowe();
  env._ukryte = ukryte;
  return env;
}

test('MA-D38 D′: ukryte pole i digi2.ma.visitorId() dostają visitorId tylko z d2-ma-hot-lead i po zgodzie', async () => {
  const env = await leadDema();
  assert.equal(env._ukryte.value, env.ma.profile().visitorId);
  assert.equal(env.ma.visitorId(), env.ma.profile().visitorId);

  const bezZgody = await start({ koperta: koperta([], { storage: { consentRequired: true } }), cfg: HOT });
  const a = formularzDema();
  bezZgody.dom('submit', { target: a.form });
  await bezZgody.gotowe();
  assert.equal(a.ukryte.value, '', 'bez zgody pole puste');
  assert.equal(bezZgody.ma.visitorId(), null);

  const wylaczony = await start({ koperta: koperta([]) });
  const b = formularzDema();
  wylaczony.dom('submit', { target: b.form });
  await wylaczony.gotowe();
  assert.equal(b.ukryte.value, 'stare', 'bez d2-ma-hot-lead pole nietknięte');
  assert.equal(wylaczony.ma.visitorId(), null);
});

test('MA-D38 D′: bez leada albo bez oddanego visitorId w tej samej wizycie nic nie wychodzi (MA-D30)', async () => {
  const samLead = await start({ koperta: koperta([]), cfg: HOT });
  samLead.dataLayer.push({ event: 'generate_lead' });
  await samLead.gotowe();
  assert.equal((await powrot(samLead, 26 * H)).sygnaly.length, 0, 'lead bez visitorId');

  const samoId = await start({ koperta: koperta([]), cfg: HOT });
  samoId.ma.visitorId();
  await samoId.gotowe();
  const p2 = await powrot(samoId, 26 * H);
  assert.equal(p2.sygnaly.length, 0, 'visitorId bez leada');
  p2.dataLayer.push({ event: 'generate_lead' });
  await p2.gotowe();
  assert.equal((await powrot(p2, 26 * H)).sygnaly.length, 0, 'lead w innej wizycie niż oddanie id');

  const wylaczony = await start({ koperta: koperta([]) });
  wylaczony.ma.visitorId();
  wylaczony.dataLayer.push({ event: 'generate_lead' });
  await wylaczony.gotowe();
  assert.equal((await powrot(wylaczony, 26 * H)).sygnaly.length, 0, 'bez d2-ma-hot-lead');
});

test('MA-D38 D′: powrót → POST /api/v1/public/ma/visit {visitorId, units, pageviews, source}; przyrost co 5 min', async () => {
  const p1 = await leadDema();
  const id = p1.ma.profile().visitorId;
  p1.ma.track({ unitId: UID(9), name: 'A9', source: '2destate' });
  await p1.minie(6 * MIN);
  assert.equal(p1.sygnaly.length, 0, 'wizyta formularza to nie powrót');
  const p2 = await powrot(p1, 26 * H);
  assert.equal(p2.sygnaly.length, 1);
  assert.equal(p2.sygnaly[0].url, VISIT);
  assert.deepEqual(czyste(p2.sygnaly[0].body), { visitorId: id, pageviews: 1, source: 'return_visit', units: [] }, 'ma.24: units zawsze, także []');
  assert.equal(p2.sygnaly[0].init.credentials, 'omit');
  p2.ma.track({ unitId: UID(1), name: 'A1', source: '2destate' });
  await p2.gotowe();
  assert.equal(p2.sygnaly.length, 1, 'nowy lokal, ale nie minęło 5 min');
  await p2.minie(5 * MIN + 100);
  assert.equal(p2.sygnaly.length, 2);
  assert.deepEqual([...p2.sygnaly[1].body.units], [UID(1)]);
  p2.ma.track({ unitId: 'A_ze_spoza_2destate', name: 'X' });
  await p2.minie(6 * MIN);
  assert.equal(p2.sygnaly.length, 2, 'lokal bez UUID 2destate nie jest przyrostem');
  const p3 = await powrot(p2, 3 * MIN);
  assert.equal(p3.sygnaly.length, 0, 'kolejna odsłona tej samej wizyty bez nowych lokali');
  const p4 = await powrot(p3, 26 * H, { cfg: { 'd2-ma-hot-lead': 'https://api.2destate.com/api/v1/' } });
  assert.equal(p4.sygnaly[0].url, 'https://api.2destate.com/api/v1/public/ma/visit', 'baza z atrybutu, końcowy / zdjęty');
});

test('MA-D38 D′: 401 zrywa powiązanie; 403 wstrzymuje na dobę; 429/503 czeka Retry-After', async () => {
  const a1 = await leadDema({ statusSygnalu: () => 401 });
  const a2 = await powrot(a1, 26 * H);
  assert.equal(a2.sygnaly.length, 1);
  assert.ok(!a2._dysk.state.hotLead, '401 zrywa');
  assert.equal((await powrot(a2, 26 * H)).sygnaly.length, 0);

  const b1 = await leadDema({ statusSygnalu: () => 403 });
  const b2 = await powrot(b1, 26 * H);
  assert.ok(b2._dysk.state.hotLead, '403 nie zrywa');
  const b3 = await powrot(b2, 2 * H);
  assert.equal(b3.sygnaly.length, 0, 'w ciągu doby cisza');
  assert.equal((await powrot(b3, 23 * H)).sygnaly.length, 1, 'po dobie znowu');

  for (const st of [429, 503]) {
    const q1 = await leadDema({ statusSygnalu: () => st, retryAfter: '7200' });
    const q2 = await powrot(q1, 26 * H);
    assert.equal(q2.sygnaly.length, 1);
    assert.equal((await powrot(q2, H)).sygnaly.length, 0, st + ': w oknie Retry-After cisza');
    assert.ok(q2._dysk.state.hotLead);
  }
});

test('MA-D38 D′: „Wyczyść" i wycofanie zgody wysyłają /revoke {visitorId}, potem nowy profil', async () => {
  const env = await leadDema();
  const id = env.ma.profile().visitorId;
  await env.ma.clear();
  await env.gotowe();
  assert.deepEqual(env.sygnaly.map((s) => [s.url, { ...s.body }]), [[REVOKE, { visitorId: id }]]);
  assert.notEqual(env.ma.profile().visitorId, id);
  await env.ma.clear();
  await env.gotowe();
  assert.equal(env.sygnaly.length, 1, 'profil bez powiązania nie wysyła revoke');

  const z = await leadDema({ koperta: koperta([], { storage: { consentRequired: true } }), zgoda: { analytics_storage: 'granted' } });
  const idZ = z.ma.profile().visitorId;
  z.zgoda({ analytics_storage: 'denied' });
  await z.gotowe();
  assert.deepEqual(z.sygnaly.map((s) => [s.url, { ...s.body }]), [[REVOKE, { visitorId: idZ }]]);
  assert.equal(z.ma.profile(), null);
});

// ma.13: poprawki z recenzji #17

test('MA-D38 D′ (ma.13): visitorId oddany bez leada — „Wyczyść" i tak wysyła /revoke (2destate wiąże po samym polu)', async () => {
  const env = await start({ koperta: koperta([]), cfg: HOT });
  const { form } = formularzDema();
  env.dom('submit', { target: form });
  await env.gotowe();
  const id = env.ma.profile().visitorId;
  assert.ok(!env._dysk.state.hotLead, 'bez leada nie ma lokalnego powiązania');
  await env.ma.clear();
  await env.gotowe();
  assert.deepEqual(env.sygnaly.map((s) => [s.url, { ...s.body }]), [[REVOKE, { visitorId: id }]]);

  const nic = await start({ koperta: koperta([]), cfg: HOT });
  await nic.ma.clear();
  await nic.gotowe();
  assert.equal(nic.sygnaly.length, 0, 'id nigdy nie oddany — revoke nie idzie');
});

test('MA-D38 D′ (ma.13): zgoda wycofana między wizytami — przy starcie /revoke z visitorId z bazy, potem baza pusta', async () => {
  const k = koperta([], { storage: { consentRequired: true } });
  const p1 = await leadDema({ koperta: k, zgoda: { analytics_storage: 'granted' } });
  const id = p1.ma.profile().visitorId;
  const p2 = await powrot(p1, 26 * H, { zgoda: { analytics_storage: 'denied' } });
  assert.deepEqual(p2.sygnaly.map((s) => [s.url, { ...s.body }]), [[REVOKE, { visitorId: id }]]);
  assert.equal(p2._dysk.state, null, 'baza skasowana');
  assert.equal(p2.ma.profile(), null);
  const p3 = await powrot(p2, 26 * H, { zgoda: { analytics_storage: 'denied' } });
  assert.equal(p3.sygnaly.length, 0, 'pusta baza — nic do odwołania');

  const bezAtrybutu = await leadDema({ koperta: k, zgoda: { analytics_storage: 'granted' } });
  const q = await powrot(bezAtrybutu, 26 * H, { zgoda: { analytics_storage: 'denied' }, cfg: {} });
  assert.equal(q.sygnaly.length, 0, 'strona bez d2-ma-hot-lead nie wysyła revoke');
  assert.equal(q._dysk.state, null);
});

test('MA-D38 D′ (ma.13): 404 wstrzymuje na dobę; 413 / 422 — koniec sygnałów w tej wizycie', async () => {
  const a1 = await leadDema({ statusSygnalu: () => 404 });
  const a2 = await powrot(a1, 26 * H);
  assert.equal(a2.sygnaly.length, 1);
  assert.ok(a2.ostrzezenia.some((w) => w.includes('404')));
  const a3 = await powrot(a2, 2 * H);
  assert.equal(a3.sygnaly.length, 0, 'w ciągu doby cisza');
  assert.equal((await powrot(a3, 23 * H)).sygnaly.length, 1, 'po dobie znowu');

  for (const st of [413, 422]) {
    const b1 = await leadDema({ statusSygnalu: () => st });
    const b2 = await powrot(b1, 26 * H);
    assert.equal(b2.sygnaly.length, 1);
    b2.ma.track({ unitId: UID(2), name: 'A2', source: '2destate' });
    await b2.minie(6 * MIN);
    assert.equal(b2.sygnaly.length, 1, st + ': przyrost w tej wizycie nie idzie');
    assert.ok(b2._dysk.state.hotLead, st + ': powiązanie zostaje');
    assert.equal((await powrot(b2, 26 * H)).sygnaly.length, 1, st + ': następna wizyta znowu');
  }
});

test('ma.23: d2-ma-hot-lead spoza listy (http, inny host, staging, port, login) — ostrzeżenie i zero żądań /visit i /revoke', async () => {
  for (const zly of ['http://localhost:8000/api/v1', 'https://staging.2destate.example/api/v1', 'https://api.dev.2destate.com/api/v1',
    'https://api.2destate.com:8443/api/v1', 'https://x@api.2destate.com/api/v1', 'https://api.2destate.com.evil.example/api/v1']) {
    const p1 = await leadDema({ cfg: { 'd2-ma-hot-lead': zly } });
    const p2 = await powrot(p1, 26 * H);
    assert.equal(p2.sygnaly.length, 0, zly);
    assert.ok(p2.ostrzezenia.some((w) => w.includes('is not https://api.2destate.com')), zly);
    await p2.ma.clear();
    assert.equal(p2.sygnaly.length, 0, 'bez revoke: ' + zly);
  }
  const p1 = await leadDema();
  const pusty = await powrot(p1, 26 * H, { cfg: HOT });
  assert.equal(pusty.sygnaly[0].url, VISIT, 'puste = produkcja');
  assert.ok(!pusty.ostrzezenia.some((w) => w.includes('is not https://api.2destate.com')), 'puste — bez ostrzeżenia');
});

// ma.15: wipe() przy starcie nie zakłada bazy d2ma, której nie ma (IndexedDB)

/** Atrapa window.indexedDB: open / onupgradeneeded / abort, sam rekord state, deleteDatabase. */
function atrapaIdb(bazy) {
  const log = { utworzone: 0, usuniete: 0 };
  const pozniej = (f) => setImmediate(f);
  return {
    log, bazy,
    open(nazwa) {
      const req = {};
      pozniej(() => {
        let przerwane = false;
        req.result = {
          objectStoreNames: { contains: (n) => n === 'state' },
          close() {},
          transaction() {
            return { objectStore: () => ({ get() {
              const r = {};
              pozniej(() => { r.result = (bazy[nazwa] || {}).state || undefined; if (r.onsuccess) r.onsuccess(); });
              return r;
            } }) };
          },
        };
        if (!Object.prototype.hasOwnProperty.call(bazy, nazwa)) {
          req.transaction = { abort() { przerwane = true; } };
          if (req.onupgradeneeded) req.onupgradeneeded();
          if (przerwane) { req.error = new Error('AbortError'); if (req.onerror) req.onerror(); return; }
          bazy[nazwa] = {};
          log.utworzone++;
        }
        if (req.onsuccess) req.onsuccess();
      });
      return req;
    },
    deleteDatabase(nazwa) {
      const req = {};
      pozniej(() => { delete bazy[nazwa]; log.usuniete++; if (req.onsuccess) req.onsuccess(); });
      return req;
    },
  };
}

test('MA-D38 D′ (ma.15): brak zgody przy starcie, przeglądarka bez bazy d2ma — baza nie powstaje, revoke nie idzie', async () => {
  const idb = atrapaIdb({});
  const env = await start({ koperta: koperta([], { storage: { consentRequired: true } }), cfg: HOT, idb });
  assert.equal(idb.log.utworzone, 0, 'peekState nie zakłada bazy');
  assert.ok(!('d2ma' in idb.bazy));
  assert.equal(env.sygnaly.length, 0);
});

test('MA-D38 D′ (ma.15): brak zgody przy starcie, baza z oddanym visitorId — /revoke z rekordu state, baza usunięta', async () => {
  const idb = atrapaIdb({ d2ma: { state: { key: 'main', visitorId: UID(7), idShared: 1, visits: 1 } } });
  const env = await start({ koperta: koperta([], { storage: { consentRequired: true } }), cfg: HOT, idb });
  assert.deepEqual(env.sygnaly.map((s) => [s.url, { ...s.body }]), [[REVOKE, { visitorId: UID(7) }]]);
  assert.ok(!('d2ma' in idb.bazy), 'baza usunięta');
  assert.equal(idb.log.utworzone, 0);
});

test('ma.22: gorący lead razem z kontekstem leadu — formularz dostaje visitorId, d2ma_context i d2ma_consent; bez zgody visitorId puste i brak znacznika', async () => {
  const env = await start({ koperta: koperta([]), cfg: HOT });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  const form = element({}, 'FORM');
  const id = element({ type: 'hidden', name: 'd2ma_visitor_id', 'd2-ma-visitor-id': '' }, 'INPUT');
  form.appendChild(id);
  env.dom('submit', { target: form });
  assert.equal(id.value, env.ma.profile().visitorId);
  assert.ok(form.querySelector('[name="d2ma_context"]').value.startsWith('1 wizyta'));
  assert.equal(form.querySelector('[name="d2ma_consent"]').value, '1');

  const bez = await start({ koperta: koperta([], { storage: { retentionDays: 90, consentRequired: true } }), cfg: HOT });
  const f2 = element({}, 'FORM');
  const id2 = element({ type: 'hidden', name: 'd2ma_visitor_id', 'd2-ma-visitor-id': '' }, 'INPUT');
  id2.value = 'stare';
  f2.appendChild(id2);
  bez.dom('submit', { target: f2 });
  assert.equal(id2.value, '');
  assert.equal(f2.querySelector('[name="d2ma_consent"]'), null);
  assert.equal(f2.querySelector('[name="d2ma_context"]').value, 'brak kontekstu (brak zgody)');
});


test('ma.23: koperta tylko z digi2.app i api.2destate.com po https — inny adres bez fetch, z ostrzeżeniem; także digi2.ma.load()', async () => {
  for (const [url, ok] of [
    ['https://digi2.app/api/ma/scenario/demo.json', true],
    ['https://api.2destate.com/api/v1/public/ma/scenario/demo.json', true],
    ['http://digi2.app/api/ma/scenario/demo.json', false],
    ['https://evil.example/koperta.json', false],
    ['https://digi2.app.evil.example/x.json', false],
    ['https://user@digi2.app/x.json', false],
    ['https://digi2.app:444/x.json', false],
    ['/ma-koperta.json', false],
  ]) {
    const env = await start({ koperta: koperta([]) });
    env.pobrania.length = 0;
    await env.ma.load(url);
    await env.gotowe();
    assert.equal(env.pobrania.includes(url), ok, url);
    assert.equal(env.ostrzezenia.some((w) => w.includes('not on digi2.app or api.2destate.com')), !ok, 'warn: ' + url);
  }
  // Atrybut loadera (start strony): adres spoza listy — zero fetch koperty, strona działa bez MA.
  const zla = strona({ koperta: koperta([]) });
  await zla.gotowe();
  assert.ok(zla.pobrania.includes('https://digi2.app/api/ma/scenario/demo.json'), 'kontrola: adres z listy pobrany przy starcie');
  const obca = strona({ koperta: koperta([]), endpoint: 'https://evil.example/k.json' });
  await obca.gotowe();
  assert.equal(obca.pobrania.length, 0);
  assert.ok(obca.ostrzezenia.some((w) => w.includes('not on digi2.app or api.2destate.com')));
});


test('ma.24: visitorId wpisywany także przy kliku w przycisk wysyłki (jak kontekst leadu); type=button nie', async () => {
  const env = await start({ koperta: koperta([]), cfg: HOT });
  env.dataLayer.push(unitOpen('A_1'));
  await env.gotowe();
  const form = element({}, 'FORM');
  const id = element({ type: 'hidden', name: 'd2ma_visitor_id', 'd2-ma-visitor-id': '' }, 'INPUT');
  const btn = element({ type: 'submit' }, 'BUTTON');
  form.appendChild(id); form.appendChild(btn); btn.parent = form; id.parent = form;
  env.dom('click', { target: btn });
  assert.equal(id.value, env.ma.profile().visitorId);
  const f2 = element({}, 'FORM');
  const id2 = element({ type: 'hidden', 'd2-ma-visitor-id': '' }, 'INPUT');
  const b2 = element({ type: 'button' }, 'BUTTON');
  f2.appendChild(id2); f2.appendChild(b2); b2.parent = f2;
  id2.value = 'x';
  env.dom('click', { target: b2 });
  assert.equal(id2.value, 'x', 'przycisk type=button nie wysyła');
});
