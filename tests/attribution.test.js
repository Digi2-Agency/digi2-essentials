const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const loaderPath = path.join(__dirname, '..', 'webflow-scripts', 'digi2-loader.js');
const loaderCode = fs.readFileSync(loaderPath, 'utf8');

const DAY = 864e5;
// Noon UTC: the same calendar day in every time zone the tests may run in.
const T0 = Date.UTC(2026, 9, 2, 12, 0, 0);   // 2026-10-02

function makeStorage(init) {
  const data = Object.assign({}, init || {});
  return {
    data,
    getItem(k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem(k, v) { data[k] = String(v); },
    removeItem(k) { delete data[k]; },
  };
}

function cookieJar(initial) {
  const jar = {};
  (initial || '').split(/;\s*/).filter(Boolean).forEach((p) => {
    const i = p.indexOf('=');
    jar[p.slice(0, i)] = p.slice(i + 1);
  });
  return {
    jar,
    get() { return Object.keys(jar).map((k) => k + '=' + jar[k]).join('; '); },
    set(str) {
      const [pair, ...attrs] = str.split(';');
      const i = pair.indexOf('=');
      const name = pair.slice(0, i).trim();
      if (attrs.some((a) => /expires=Thu, 01 Jan 1970/.test(a))) delete jar[name];
      else jar[name] = pair.slice(i + 1);
    },
  };
}

// One pageview: the loader runs with the given URL, referrer, clock and the
// visitor's localStorage (shared across calls to model the next pageview).
function pageview({
  url = 'https://site.pl/', referrer = '', now = T0, storage = makeStorage(),
  flag = true, scriptAttrs = {}, dataLayer, cookie = '', forms = [],
} = {}) {
  const attrs = Object.assign({}, flag ? { 'd2-attribution': '' } : {}, scriptAttrs);
  const script = {
    src: 'https://cdn.test/dist/digi2-loader.min.js',
    getAttribute: (n) => (n === 'src' ? script.src
      : Object.prototype.hasOwnProperty.call(attrs, n) ? attrs[n] : null),
    hasAttribute: (n) => Object.prototype.hasOwnProperty.call(attrs, n),
    attributes: Object.keys(attrs).map((name) => ({ name })),
  };
  const injected = [];
  const jar = cookieJar(cookie);
  const u = new URL(url);
  const window = {
    innerWidth: 1200,
    addEventListener() {},
    getComputedStyle: () => ({ display: 'block' }),
    location: { href: url, search: u.search },
    localStorage: storage,
    requestAnimationFrame: (cb) => { cb(); return 1; },
  };
  if (dataLayer) window.dataLayer = dataLayer;
  const document = {
    readyState: 'complete',
    referrer,
    addEventListener() {},
    querySelectorAll: (sel) => (/d2-attribution-fill/.test(sel) ? forms : []),
    querySelector: () => null,
    currentScript: script,
    head: { appendChild(el) { injected.push(el.src); } },
    body: { appendChild() {} },
    documentElement: {},
    createElement: () => ({ setAttribute() {}, addEventListener() {} }),
  };
  Object.defineProperty(document, 'cookie', { get: () => jar.get(), set: (v) => jar.set(v) });
  window.document = document;
  class FakeDate extends Date {
    constructor(...a) { if (a.length) super(...a); else super(now); }
    static now() { return now; }
  }
  const quiet = { log() {}, warn() {}, error() {} };
  const context = vm.createContext({
    window, document, console: quiet, navigator: { userAgent: 'node-test' },
    setTimeout, MutationObserver: class { observe() {} }, URL, URLSearchParams, Date: FakeDate,
  });
  vm.runInContext(loaderCode, context, { filename: loaderPath });
  return { window, document, storage, injected, jar: jar.jar, attribution: window.digi2.attribution };
}

const GRANTED = JSON.stringify({ analytics_storage: 'granted', ad_storage: 'denied' });
const ALL = JSON.stringify({ analytics_storage: 'granted', ad_storage: 'granted' });
const DENIED = JSON.stringify({ analytics_storage: 'denied', ad_storage: 'denied' });

function gtagArgs() { return (function () { return arguments; }).apply(null, arguments); }

test('without the flag nothing changes: no digi2.attribution, nothing stored', () => {
  const storage = makeStorage({ consentModeV2: GRANTED });
  const p = pageview({ flag: false, url: 'https://site.pl/?utm_source=a', storage, cookie: 'utm_source=old' });
  assert.equal(p.attribution, undefined);
  assert.equal(storage.getItem('d2_attribution'), null);
  assert.equal(p.jar.utm_source, 'old', 'legacy cookies untouched without the flag');
});

test('the flag is part of the loader, not a module to fetch', () => {
  const p = pageview({ scriptAttrs: { 'd2-attribution-days': '30' } });
  assert.ok(p.attribution && p.attribution.enabled);
  assert.deepEqual(p.injected, [], 'no modules/attribution.min.js request');
});

test('data-d2-attribution works as an alias', () => {
  const p = pageview({ flag: false, scriptAttrs: { 'data-d2-attribution': '' } });
  assert.ok(p.attribution && p.attribution.enabled);
});

test('without consent: this pageview only, in memory — nothing written, old cookies removed', () => {
  const storage = makeStorage();
  const p = pageview({
    url: 'https://site.pl/?utm_source=newsletter&utm_medium=email&utm_campaign=dni-otwarte',
    storage, cookie: 'utm_source=old; utm_content=stale; gclid=x; other=keep',
  });
  const f = p.attribution.fields();
  assert.equal(f.UTM_SOURCE, 'newsletter');
  assert.equal(f.UTM_CAMPAIGN, 'dni-otwarte');
  assert.equal(f.UTM_CONTENT, '', 'never mixed with an old cookie');
  assert.equal(f.ATTRIBUTION_STATUS, 'no-consent');
  assert.equal(f.ATTRIBUTION_PATH, '2026-10-02 newsletter/email/dni-otwarte');
  assert.equal(storage.getItem('d2_attribution'), null, 'nothing stored without consent');
  assert.deepEqual(Object.keys(p.jar), ['other'], 'utm_* / click id cookies of forms and popups removed');
});

test('without consent the next pageview has nothing to go on (MP-D13 a)', () => {
  const storage = makeStorage();
  pageview({ url: 'https://site.pl/?utm_source=newsletter', storage });
  const next = pageview({ url: 'https://site.pl/kontakt', referrer: 'https://site.pl/', now: T0 + 60e3, storage });
  const f = next.attribution.fields();
  assert.equal(f.UTM_SOURCE, '');
  assert.equal(f.ATTRIBUTION_PATH, '2026-10-02 (direct)/(none)/(not set)');
  assert.equal(f.ATTRIBUTION_STATUS, 'no-consent');
});

test('with analytics consent: the visit history survives pageviews and visits', () => {
  const storage = makeStorage({ consentModeV2: GRANTED });
  pageview({ url: 'https://site.pl/?utm_source=google&utm_medium=cpc&utm_campaign=search&utm_content=ad1', storage });
  // Same visit, another page: no new entry.
  pageview({ url: 'https://site.pl/oferta', referrer: 'https://site.pl/', now: T0 + 5 * 60e3, storage });
  // A week later, a newsletter link without utm_content.
  const later = pageview({
    url: 'https://site.pl/?utm_source=newsletter&utm_medium=email&utm_campaign=nov',
    now: T0 + 7 * DAY, storage,
  });
  const f = later.attribution.fields();
  assert.equal(f.UTM_SOURCE, 'newsletter');
  assert.equal(f.UTM_CONTENT, '', 'the whole set is replaced — no ad1 from the old campaign');
  assert.equal(f.ATTRIBUTION_STATUS, 'stored');
  assert.equal(f.ATTRIBUTION_PATH, '2026-10-02 google/cpc/search > 2026-10-09 newsletter/email/nov');
});

test('a direct visit keeps the last source in UTM_* (last non-direct) but shows in the path', () => {
  const storage = makeStorage({ consentModeV2: GRANTED });
  pageview({ url: 'https://site.pl/?utm_source=meta&utm_medium=paid&utm_campaign=lato', storage });
  pageview({ url: 'https://site.pl/', now: T0 + DAY, storage });
  const p = pageview({ url: 'https://site.pl/', now: T0 + DAY + 2 * 3600e3, storage });
  const f = p.attribution.fields();
  assert.equal(f.UTM_SOURCE, 'meta');
  assert.equal(f.ATTRIBUTION_PATH, '2026-10-02 meta/paid/lato > 2026-10-03 (direct)/(none)/(not set) x2');
});

test('a referral is a source of its own, without UTM', () => {
  const storage = makeStorage({ consentModeV2: GRANTED });
  const p = pageview({ url: 'https://site.pl/', referrer: 'https://www.google.com/', storage });
  assert.equal(p.attribution.fields().ATTRIBUTION_PATH, '2026-10-02 www.google.com/(referral)/(not set)');
  assert.equal(p.attribution.fields().ATTRIBUTION_STATUS, 'url');
});

test('click id values only with ad_storage; the kind of click always', () => {
  const url = 'https://site.pl/?utm_source=google&utm_medium=cpc&utm_campaign=s&gclid=Cj0abc';
  const noAds = pageview({ url, storage: makeStorage({ consentModeV2: GRANTED }) });
  assert.equal(noAds.attribution.fields().GCLID, '');
  assert.match(noAds.attribution.fields().ATTRIBUTION_PATH, /google\/cpc\/s \[gclid\]$/);
  assert.equal(JSON.parse(noAds.storage.getItem('d2_attribution')).clicks.gclid, undefined);

  const ads = pageview({ url, storage: makeStorage({ consentModeV2: ALL }) });
  assert.equal(ads.attribution.fields().GCLID, 'Cj0abc');
  assert.deepEqual(Object.assign({}, ads.attribution.get().clicks), { gclid: 'Cj0abc' });

  const none = pageview({ url, storage: makeStorage() });
  assert.equal(none.attribution.fields().GCLID, '', 'no consent at all: no value');
});

test('withdrawing ad_storage drops stored click ids', () => {
  const storage = makeStorage({ consentModeV2: ALL });
  pageview({ url: 'https://site.pl/?gclid=Cj0abc', storage });
  storage.setItem('consentModeV2', GRANTED);
  const p = pageview({ url: 'https://site.pl/', now: T0 + 60e3, storage });
  assert.equal(p.attribution.fields().GCLID, '');
  assert.deepEqual(JSON.parse(storage.getItem('d2_attribution')).clicks, {});
});

test('consent given on the page (gtag update) stores this pageview at once', () => {
  const storage = makeStorage();
  const dl = [];
  const p = pageview({ url: 'https://site.pl/?utm_source=newsletter&utm_medium=email&utm_campaign=x', storage, dataLayer: dl });
  assert.equal(storage.getItem('d2_attribution'), null);
  let seen = null;
  p.window.digi2.on('attribution:change', (s) => { seen = s.status; });
  dl.push(gtagArgs('consent', 'update', { analytics_storage: 'granted' }));
  const stored = JSON.parse(storage.getItem('d2_attribution'));
  assert.equal(stored.touches.length, 1);
  assert.equal(stored.touches[0].utm_source, 'newsletter');
  assert.equal(seen, 'url');
  assert.equal(p.attribution.fields().ATTRIBUTION_STATUS, 'url');
});

test('consent denied on the page deletes the stored history', () => {
  const storage = makeStorage({ consentModeV2: GRANTED });
  const dl = [];
  pageview({ url: 'https://site.pl/?utm_source=a', storage, dataLayer: dl });
  assert.ok(storage.getItem('d2_attribution'));
  const p = pageview({ url: 'https://site.pl/', now: T0 + 60e3, storage, dataLayer: [] });
  p.window.dataLayer.push(gtagArgs('consent', 'update', { analytics_storage: 'denied' }));
  assert.equal(storage.getItem('d2_attribution'), null);
  assert.equal(p.attribution.fields().ATTRIBUTION_STATUS, 'no-consent');
});

test('a saved refusal deletes the history on the next pageview', () => {
  const storage = makeStorage({ consentModeV2: GRANTED });
  pageview({ url: 'https://site.pl/?utm_source=a', storage });
  storage.setItem('consentModeV2', DENIED);
  pageview({ url: 'https://site.pl/', now: T0 + DAY, storage });
  assert.equal(storage.getItem('d2_attribution'), null);
});

test('unknown consent neither reads nor deletes an existing history', () => {
  const storage = makeStorage({ consentModeV2: GRANTED });
  pageview({ url: 'https://site.pl/?utm_source=a', storage });
  const kept = storage.getItem('d2_attribution');
  storage.removeItem('consentModeV2');
  const p = pageview({ url: 'https://site.pl/', now: T0 + DAY, storage });
  assert.equal(storage.getItem('d2_attribution'), kept);
  assert.equal(p.attribution.fields().UTM_SOURCE, '');
  assert.equal(p.attribution.fields().ATTRIBUTION_STATUS, 'no-consent');
});

test('entries older than 13 months are dropped; d2-attribution-days changes it', () => {
  const storage = makeStorage({ consentModeV2: GRANTED });
  pageview({ url: 'https://site.pl/?utm_source=old', storage });
  const p = pageview({ url: 'https://site.pl/', now: T0 + 396 * DAY, storage });
  assert.equal(p.attribution.fields().UTM_SOURCE, '');
  assert.equal(p.attribution.get().touches.length, 1);

  const s2 = makeStorage({ consentModeV2: GRANTED });
  pageview({ url: 'https://site.pl/?utm_source=old', storage: s2, scriptAttrs: { 'd2-attribution-days': '30' } });
  const q = pageview({ url: 'https://site.pl/', now: T0 + 31 * DAY, storage: s2, scriptAttrs: { 'd2-attribution-days': '30' } });
  assert.equal(q.attribution.fields().UTM_SOURCE, '');
});

test('path: last 10 entries, "... > " when cut, ASCII only', () => {
  const storage = makeStorage({ consentModeV2: GRANTED });
  let p;
  for (let i = 0; i < 12; i++) {
    p = pageview({ url: 'https://site.pl/?utm_source=s' + i + '&utm_medium=m&utm_campaign=c', now: T0 + i * DAY, storage });
  }
  const f = p.attribution.fields().ATTRIBUTION_PATH;
  assert.ok(f.startsWith('... > 2026-10-04 s2/m/c > '), f);
  assert.equal(f.split(' > ').length, 11);
  assert.match(f, /^[\x20-\x7e]*$/, 'ASCII only');
});

test('path: at most 500 characters', () => {
  const storage = makeStorage({ consentModeV2: GRANTED });
  const long = 'x'.repeat(90);
  let p;
  for (let i = 0; i < 6; i++) {
    p = pageview({
      url: `https://site.pl/?utm_source=${long}${i}&utm_medium=${long}&utm_campaign=${long}`,
      now: T0 + i * DAY, storage,
    });
  }
  const f = p.attribution.fields().ATTRIBUTION_PATH;
  assert.ok(f.length <= 500, String(f.length));
  assert.ok(f.startsWith('... > '));
});

test('values cannot break the field: "/", "<", ">" replaced, new lines and e-mails dropped', () => {
  const storage = makeStorage({ consentModeV2: GRANTED });
  const p = pageview({
    url: 'https://site.pl/?utm_source=a%2Fb&utm_medium=%3Cx%3E&utm_campaign=line%0Abreak&utm_term=jan%40x.pl',
    storage,
  });
  const f = p.attribution.fields();
  assert.equal(f.ATTRIBUTION_PATH, '2026-10-02 a-b/-x-/(not set)');
  assert.equal(f.UTM_TERM, '', 'an e-mail in a UTM never reaches the lead');
  assert.doesNotMatch(f.ATTRIBUTION_PATH, /[\r\n<]/);
});

test('value(): utm_* from the last source, other keys from this URL only', () => {
  const storage = makeStorage({ consentModeV2: GRANTED });
  pageview({ url: 'https://site.pl/?utm_source=facebook&refID=x', storage });
  const p = pageview({ url: 'https://site.pl/kontakt', referrer: 'https://site.pl/', now: T0 + 60e3, storage });
  assert.equal(p.attribution.value('utm_source'), 'facebook');
  assert.equal(p.attribution.value('refID'), '', 'not remembered (AT-D7)');
});

test('<form d2-attribution-fill> gets the hidden fields, refreshed on submit', () => {
  const inputs = [];
  const listeners = {};
  const form = {
    querySelector(sel) {
      const m = /name="([^"]+)"/.exec(sel);
      return inputs.find((i) => i.name === m[1]) || null;
    },
    appendChild(el) { inputs.push(el); },
    addEventListener(type, fn) { listeners[type] = fn; },
  };
  const storage = makeStorage();
  const dl = [];
  const p = pageview({ url: 'https://site.pl/?utm_source=newsletter', storage, dataLayer: dl, forms: [form] });
  // createElement in the stub DOM returns a bare object; give inputs a name/value.
  const byName = (n) => inputs.find((i) => i.name === n);
  assert.equal(byName('UTM_SOURCE').value, 'newsletter');
  assert.equal(byName('ATTRIBUTION_STATUS').value, 'no-consent');
  assert.equal(byName('GCLID'), undefined, 'empty click ids are not added');
  dl.push(gtagArgs('consent', 'update', { analytics_storage: 'granted' }));
  listeners.submit();
  assert.equal(byName('ATTRIBUTION_STATUS').value, 'url');
  assert.ok(p.attribution);
});
