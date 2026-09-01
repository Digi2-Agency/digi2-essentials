const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'webflow-scripts', 'modules', 'promo.js');

// Minimalny DOM w konwencji pozostałych testów: tylko to, czego moduł dotyka.
function createElement(tagName, attrs) {
  const el = {
    tagName: tagName.toUpperCase(),
    attributes: Object.assign({}, attrs || {}),
    children: [],
    style: {
      _wlasciwosci: {},
      setProperty(name, value) { this._wlasciwosci[name] = value; },
      removeProperty(name) { delete this._wlasciwosci[name]; },
      getPropertyValue(name) { return this._wlasciwosci[name] || ''; },
    },
    textContent: '',
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name)
        ? this.attributes[name]
        : null;
    },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name);
    },
    appendChild(child) { this.children.push(child); return child; },
    addEventListener() {},
  };
  return el;
}

/** Czy element jest po decyzji modułu widoczny. */
function widoczny(el) {
  return el.getAttribute('data-d2-promo') === 'shown';
}

function createEnv(options) {
  const opts = options || {};
  const elementy = opts.elementy || [];
  const glowa = createElement('head');

  const document = {
    readyState: 'complete',
    head: glowa,
    documentElement: createElement('html'),
    body: createElement('body'),
    addEventListener() {},
    createElement,
    querySelector(selector) {
      if (selector === 'style[data-d2-promo]') {
        return glowa.children.find((el) => el.hasAttribute('data-d2-promo')) || null;
      }
      if (selector === 'script[d2-promo]' || selector === 'script[d2-promo-state]') {
        return null; // Konfigurację podajemy przez window.digi2._promo*
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[d2-promo-when]') {
        return elementy.filter((el) => el.hasAttribute('d2-promo-when'));
      }
      return [];
    },
  };

  const zdarzenia = {};
  const window = {
    digi2: {
      log() {},
      emit(nazwa, dane) {
        (zdarzenia[nazwa] = zdarzenia[nazwa] || []).push(dane);
      },
      _promoEndpoint: opts.endpoint || null,
      _promoState: opts.stanWTagu || null,
    },
    location: { search: opts.search || '' },
    localStorage: (function () {
      const magazyn = Object.assign({}, opts.pamiec || {});
      return {
        getItem(k) {
          return Object.prototype.hasOwnProperty.call(magazyn, k) ? magazyn[k] : null;
        },
        setItem(k, v) { magazyn[k] = String(v); },
        removeItem(k) { delete magazyn[k]; },
      };
    })(),
  };
  window.document = document;

  const context = vm.createContext({
    window,
    document,
    console,
    setTimeout() { return 0; },
    clearTimeout() {},
    Date,
    JSON,
    URLSearchParams,
    // Bez fetcha moduł ma zejść do stanu „brak promocji", nie wywalić się.
    fetch: opts.fetch,
    AbortController: opts.AbortController,
    MutationObserver: undefined,
  });

  vm.runInContext(fs.readFileSync(modulePath, 'utf8'), context, { filename: modulePath });
  return { window, document, zdarzenia, promo: window.digi2.promo };
}

// ---------------------------------------------------------------------------

test('bez endpointu strona wygląda jak bez promocji', () => {
  const pasek = createElement('div', { 'd2-promo-when': 'active' });
  const popup = createElement('div', { 'd2-promo-when': 'inactive' });
  const env = createEnv({ elementy: [pasek, popup] });

  assert.equal(env.promo.state().active, false);
  assert.equal(widoczny(pasek), false);
  assert.equal(widoczny(popup), true);
});

test('stan wpisany w stronę obowiązuje od pierwszej klatki', () => {
  const pasek = createElement('div', { 'd2-promo-when': 'active' });
  const env = createEnv({ stanWTagu: 'active', elementy: [pasek] });

  assert.equal(env.promo.state().active, true);
  assert.equal(widoczny(pasek), true);
  // Bez zapytania po sieci - decyzja zapadła z samego atrybutu.
  assert.equal(env.zdarzenia['promo:resolved'][0].source, 'inline');
});

test('stan z poprzedniej wizyty maluje stronę natychmiast', () => {
  const pasek = createElement('div', { 'd2-promo-when': 'active' });
  const env = createEnv({
    endpoint: 'https://api.test/promo',
    pamiec: {
      d2_promo_state: JSON.stringify({
        v: 1,
        endpoint: 'https://api.test/promo',
        state: { active: true, product_count: 4, campaigns: [], tags: [] },
      }),
    },
    elementy: [pasek],
  });

  assert.equal(widoczny(pasek), true);
  assert.equal(env.zdarzenia['promo:resolved'][0].source, 'storage');
});

test('pamięć spod innego endpointu jest ignorowana', () => {
  // Inaczej sandbox przełączony na drugi projekt malowałby cudzy stan.
  const pasek = createElement('div', { 'd2-promo-when': 'active' });
  const env = createEnv({
    endpoint: 'https://api.test/projekt-B',
    pamiec: {
      d2_promo_state: JSON.stringify({
        v: 1,
        endpoint: 'https://api.test/projekt-A',
        state: { active: true, product_count: 4, campaigns: [], tags: [] },
      }),
    },
    elementy: [pasek],
  });

  assert.equal(widoczny(pasek), false);
});

test('warunek kampanii wymaga zgodnego klucza', () => {
  const nasza = createElement('div', {
    'd2-promo-when': 'active',
    'd2-promo-campaign': 'wyprzedaz-jesienna',
  });
  const cudza = createElement('div', {
    'd2-promo-when': 'active',
    'd2-promo-campaign': 'czarny-piatek',
  });
  const env = createEnv({
    stanWTagu: JSON.stringify({
      active: true,
      product_count: 2,
      campaigns: [{ key: 'wyprzedaz-jesienna', name: 'Wyprzedaż jesienna' }],
      tags: [],
    }),
    elementy: [nasza, cudza],
  });

  assert.equal(widoczny(nasza), true);
  assert.equal(widoczny(cudza), false);
  assert.equal(env.promo.isActive('wyprzedaz-jesienna'), true);
  assert.equal(env.promo.isActive('czarny-piatek'), false);
});

test('warunek tagu i próg liczby produktów', () => {
  const zTagiem = createElement('div', {
    'd2-promo-when': 'active',
    'd2-promo-tag': 'oferta-specjalna',
  });
  const doProgu = createElement('div', {
    'd2-promo-when': 'active',
    'd2-promo-min-products': '5',
  });
  const env = createEnv({
    stanWTagu: JSON.stringify({
      active: true,
      product_count: 3,
      campaigns: [],
      tags: [{ key: 'oferta-specjalna', name: 'Oferta specjalna' }],
    }),
    elementy: [zTagiem, doProgu],
  });

  assert.equal(widoczny(zTagiem), true);
  // Trzy produkty to za mało na próg pięciu.
  assert.equal(widoczny(doProgu), false);
  assert.equal(env.promo.hasTag('oferta-specjalna'), true);
});

test('warunki na jednym elemencie łączą się przez AND', () => {
  const el = createElement('div', {
    'd2-promo-when': 'active',
    'd2-promo-campaign': 'wyprzedaz-jesienna',
    'd2-promo-tag': 'nieistniejacy',
  });
  createEnv({
    stanWTagu: JSON.stringify({
      active: true,
      product_count: 9,
      campaigns: [{ key: 'wyprzedaz-jesienna' }],
      tags: [{ key: 'oferta-specjalna' }],
    }),
    elementy: [el],
  });

  // Kampania się zgadza, tag nie - element zostaje ukryty.
  assert.equal(widoczny(el), false);
});

test('podgląd wymusza stan bez pytania backendu', () => {
  const pasek = createElement('div', { 'd2-promo-when': 'active' });
  const popup = createElement('div', { 'd2-promo-when': 'inactive' });
  const env = createEnv({
    endpoint: 'https://api.test/promo',
    search: '?d2-promo-preview=wyprzedaz-jesienna',
    elementy: [pasek, popup],
    fetch() {
      throw new Error('podgląd nie ma prawa wołać sieci');
    },
  });

  assert.equal(widoczny(pasek), true);
  assert.equal(widoczny(popup), false);
  assert.equal(env.promo.isActive('wyprzedaz-jesienna'), true);
});

test('podgląd off gasi promocję mimo stanu w stronie', () => {
  const pasek = createElement('div', { 'd2-promo-when': 'active' });
  createEnv({ stanWTagu: 'active', search: '?d2-promo-preview=off', elementy: [pasek] });

  assert.equal(widoczny(pasek), false);
});

test('allows() przepuszcza elementy bez atrybutu', () => {
  // Moduł popups pyta o każdy popup; ten bez konfiguracji ma działać jak dotąd.
  const env = createEnv({ stanWTagu: 'active' });
  const zwykly = createElement('div', {});
  const promocyjny = createElement('div', { 'd2-promo-when': 'inactive' });

  assert.equal(env.promo.allows(zwykly), true);
  assert.equal(env.promo.allows(promocyjny), false);
});
