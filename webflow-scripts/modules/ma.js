/**
 * digi2 MA — marketing automation on the page: what the visitor looked at,
 * a profile kept in their own browser, and scenario rules published from
 * digi2.app. Loaded automatically by digi2-loader.js when d2-ma is present.
 *
 * Contract (source of truth): digi2-ads-engine
 * docs/architecture/marketing-automation.md §13 — version "0", demo only.
 *
 * ─── Setup ──────────────────────────────────────────────────────────────────
 *
 *   <script src=".../digi2-loader.min.js"
 *     d2-ma="https://digi2.app/api/ma/scenario/osiedle-demo.json"
 *     d2-ma-consent-required="false"   <!-- fallback when the JSON is unreachable -->
 *     d2-ma-highlight                  <!-- light up the visitor's units on the map -->
 *   ></script>
 *
 *   d2-ma="<url>"                 Scenario envelope (§13.3). Empty = digi2.ma.load()
 *   d2-ma-consent-required        "true" | "false". The envelope's storage.consentRequired
 *                                 decides; this is what applies when it cannot be read.
 *                                 "true" forces consent whatever the envelope says.
 *                                 Without either: consent required.
 *   d2-ma-consent="analytics_storage"   Consent Mode category that unlocks storage.
 *                                 Read from any banner that speaks Consent Mode:
 *                                 gtag('consent', 'default'|'update', …) in the
 *                                 dataLayer, the Google tag's own consent state
 *                                 (CMP templates in GTM), or the google module.
 *   d2-ma-products-api="https://api.2destate.com/api/v1"   Fresh status before a popup
 *   d2-ma-highlight               Highlight units matching pref.rooms on the 2destate map
 *   d2-ma-refresh="30"            Re-read the envelope every N seconds (demo: a CRM call
 *                                 result sent from the panel reaches an open page)
 *
 * ─── Sources of unit_view (§13.1) ───────────────────────────────────────────
 *
 *   3D Estate   dataLayer event "oa3de__unit-open" (the duplicate
 *               "oa3de_unit_open" is ignored), plus ?sm-unit= on page load —
 *               a deep link sends no event of its own
 *   2destate    window.d2estate.onProductClick
 *   any page    digi2.ma.track({ unitId, name, rooms, … })
 *
 *   The same unitId within 5 s counts once. A lead is dataLayer
 *   "generate_lead" or "oa3de__contact-form-make-inquiry".
 *
 * ─── Page elements ──────────────────────────────────────────────────────────
 *
 *   [d2-ma-popup="last-unit"]     Designer popup for that template (else built-in)
 *     [d2-ma-field="name|price|image|rooms|floor|area|pricePerSqm|building|summary|promoText"]
 *     [d2-ma-cta]                 open_unit → href of the unit; contact → keeps its href
 *     [d2-ma-close]               Close button
 *   [d2-ma-profile="visits|views|lead|pref.rooms|pref.floor|last.name|last.price|segment|visitorId"]
 *   [d2-ma-history]               List of viewed units, newest first
 *     [d2-ma-history-item]        Optional row template with [d2-ma-field] inside
 *   [d2-ma-clear]                 Button — wipe the d2ma database
 *   [d2-ma-simulate-return]       Button — end the visit as if afterHours had passed
 *   [d2-ma-slot="hero-title"]     Text the content action may replace (textContent only)
 *   form[d2-ma-ignore]            Never counted by form_abandon
 *
 * ─── Contract v1 nodes (ma.4, §13.8) — listening only when the envelope uses them
 *
 *   trigger exit_intent           Mouse leaves through the top edge, once a visit.
 *                                 Nothing on touch screens.
 *   trigger engagement            Active seconds on this page (tab visible) and the
 *                                 deepest scroll; optional utm filter (first entry of
 *                                 the visit). Once a page view.
 *   trigger form_abandon          Focus in a form, no submit, then idleSeconds or
 *                                 pagehide (stored, run on the next page view). Only the
 *                                 form id and the number of fields touched — never values
 *                                 or field names.
 *   action content                [d2-ma-slot] text with {{pref.*}} / {{unit.*}} fields,
 *                                 or a templateId from the envelope's templates.content[]
 *   action map_mark               Units matching the profile on the 2destate map
 *   channels.<k>.via              Any via → the page sends nothing (MA-D30: e-mail, SMS
 *                                 and calls go from our side, never from the browser)
 *   cooldownMinutes               Minimum gap between runs of an action
 *
 * ─── Module API ─────────────────────────────────────────────────────────────
 *
 *   digi2.ma.load(urlOrEnvelope)  Read an envelope (a local file for tests)
 *   digi2.ma.reload()             Re-read the current envelope URL
 *   digi2.ma.track(unit)          Record a unit_view from any other source
 *   digi2.ma.lead()               Mark the visitor as a lead
 *   digi2.ma.profile()            { visitorId, visits, lead, pref, lastUnit, views, … }
 *   digi2.ma.history()            Viewed units, oldest first
 *   digi2.ma.simulateReturn()     Same as the [d2-ma-simulate-return] button
 *   digi2.ma.clear()              Delete the whole d2ma database (Promise)
 *   digi2.ma.highlight()          Re-apply the map highlight
 *
 *   digi2.on('ma:ready' | 'ma:view' | 'ma:action' | 'ma:change', fn)
 *     ma:change { cleared: true, tracking: false, reason } — consent withdrawn
 *     or required; the database is wiped and profile() returns null
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  var CONTRACT_VERSION = '0';
  var DB_NAME = 'd2ma';
  var DB_VERSION = 1;
  var DEDUPE_MS = 5000;
  var VISIT_GAP_MS = 30 * 60 * 1000;
  var HOUR_MS = 60 * 60 * 1000;
  var DAY_MS = 24 * HOUR_MS;
  // Odłożona akcja jest ważna dobę od odłożenia (§13.3a reguła 5) - zegarem
  // prawdziwym, timeScale tego nie skraca.
  var PENDING_TTL_MS = DAY_MS;
  var DEFAULT_RETENTION_DAYS = 90;
  var MAX_VIEWS = 2000;
  var MAX_BUFFER = 100;
  var FETCH_TIMEOUT_MS = 5000;
  var STATUS_TIMEOUT_MS = 3000;
  var TOUCH_THROTTLE_MS = 15000;
  var EVENT_3DE_VIEW = 'oa3de__unit-open';
  var EVENT_3DE_LEAD = 'oa3de__contact-form-make-inquiry';
  var EVENT_LEAD = 'generate_lead';
  var DEFAULT_PRODUCTS_API = 'https://api.2destate.com/api/v1';
  var DEFAULT_CONSENT = 'analytics_storage';
  var CONSENT_STORAGE_KEY = 'consentModeV2';
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var TEMPLATE_RE = /^[A-Za-z0-9_-]+$/;

  var TRIGGERS = { unit_view: 1, type_view: 1, return_visit: 1, lead: 1, crm_call_result: 1,
    exit_intent: 1, engagement: 1, form_abandon: 1 };
  var ACTIONS = { popup: 1, datalayer: 1, webhook: 1, content: 1, map_mark: 1 };
  var DL_EVENTS = { ma_segment: 1, ma_segment_exit: 1, ma_exit_intent: 1, ma_engaged: 1, ma_form_abandon: 1, ma_content: 1 };
  // Parametry zdarzeń dataLayer z wyzwalacza albo akcji na ścieżce (§13.8.3).
  var DL_PARAMS = { ma_engaged: ['seconds', 'scroll_pct'], ma_form_abandon: ['form_id'], ma_content: ['slot', 'template_id'] };
  var CHANNELS = { email: 1, sms: 1, ai_call: 1 };
  var SCRIPT_VERSION = 4;    // ma.4 - porównywane z minScript koperty
  var SLOT_RE = /^[a-z0-9-]{1,64}$/;
  // Bez imp- (klasy mapy 2destate, np. imp-object-hidden ukryłby lokale) i d2-ma-.
  var CLASS_RE = /^(?!imp-|d2-ma-)[a-z0-9-]{1,40}$/;
  var MAP_BY = { rooms: 1, floor: 1, both: 1 };
  // Pola tekstu z listy §13.9.2 (bez unit.image - tylko w bloku obrazu - i bez
  // unit.promoText, które w 2destate jeszcze nie istnieje).
  var CONTENT_FIELDS = ['pref.rooms', 'pref.floor', 'pref.roomsLabel', 'unit.name', 'unit.rooms', 'unit.roomsLabel',
    'unit.floor', 'unit.area', 'unit.price', 'unit.pricePerSqm', 'unit.building'];
  var FIELD_RE = /\{\{\s*([a-zA-Z.]+)\s*\}\}/g;
  // Zapas dla content.templateId, gdy koperta nie ma templates.content[] z tym id.
  var CONTENT_TEMPLATES = {
    'pref-rooms': '{{pref.roomsLabel}} — wybrane dla Ciebie',
    'last-unit': 'Wróć do lokalu {{unit.name}}',
    'last-unit-price': '{{unit.name}} — {{unit.price}}'
  };

  function _log(action, data) {
    if (window.digi2.log) window.digi2.log('ma', action, data);
  }

  function _warn(msg, data) {
    if (data !== undefined) console.warn('[digi2.ma] ' + msg, data);
    else console.warn('[digi2.ma] ' + msg);
  }

  function _emit(name, data) {
    try {
      if (typeof window.digi2.emit === 'function') window.digi2.emit(name, data || {});
    } catch (e) {}
  }

  function _attr(el, name) {
    if (!el) return null;
    var v = el.getAttribute(name);
    if (v === null) v = el.getAttribute('data-' + name);
    return v;
  }

  function _clone(o) {
    return o == null ? o : JSON.parse(JSON.stringify(o));
  }

  // Konfiguracja z tagu loadera albo z elementu deklaracji <digi2-module d2-ma>.
  // Surowy getAttribute, nie digi2.attr: adres koperty może mieć ';' i '@'.
  var _cfgEl = null;
  function _cfg(name) {
    if (!_cfgEl) {
      try { _cfgEl = document.querySelector('[d2-ma], [data-d2-ma]'); } catch (e) { _cfgEl = null; }
    }
    return _attr(_cfgEl, name);
  }

  function _uuid() {
    var c = window.crypto;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
    var b = [];
    for (var i = 0; i < 16; i++) b.push(Math.floor(Math.random() * 256));
    if (c && typeof c.getRandomValues === 'function') {
      var arr = new Uint8Array(16);
      c.getRandomValues(arr);
      for (var j = 0; j < 16; j++) b[j] = arr[j];
    }
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = b.map(function (x) { return (x + 0x100).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  // ---------------------------------------------------------------------------
  // Stan
  // ---------------------------------------------------------------------------

  var store = null;          // adapter magazynu (IndexedDB albo pamięć)
  var views = [];            // historia, rosnąco po ts
  var state = null;          // rekord 'main' magazynu 'state'
  var tracking = false;      // magazyn otwarty i wolno zapisywać
  var blocked = false;       // zgoda wymagana i jej brak - nic nie zbieramy
  var envelope = null;       // skompilowana koperta
  var envelopeUrl = null;
  var buffer = [];           // zdarzenia sprzed otwarcia magazynu
  var timeScale = 1;
  var crmSeq = null;         // demoState.crmCallSeq z ostatniego odczytu
  var dueTimer = null;
  var writeChain = Promise.resolve();
  var booted = false;
  var gtagConsent = {};      // komendy gtag('consent', …) z dataLayer: update, default, regionDenied
  var revoked = false;       // odmowa w trakcie otwierania magazynu
  var pageUtm = null;        // utm_source / utm_medium / utm_campaign z adresu tej odsłony

  function now() {
    return Date.now() + ((state && state.shift) || 0);
  }

  // timeScale skraca afterHours, delayMinutes, once_per_days i przerwę między
  // wizytami - bez tej ostatniej powrót po „minucie zamiast godziny" i tak
  // czekałby pół godziny na nową wizytę.
  function scaled(ms) {
    return ms / timeScale;
  }

  function freshState() {
    return {
      key: 'main', visitorId: _uuid(), visits: 0, visitStart: null, lastSeen: null,
      prevEnd: null, lead: false, leadAt: null, shift: 0, lastSegment: null,
      scenarios: {}, pending: [], seq: 0
    };
  }

  // ---------------------------------------------------------------------------
  // Magazyn: IndexedDB d2ma (views, counters, state), w razie czego pamięć
  // ---------------------------------------------------------------------------

  function idbStore() {
    var idb;
    try { idb = window.indexedDB; } catch (e) { idb = null; }
    if (!idb) return null;
    var dbp = null;
    var handle = null;

    function open() {
      if (dbp) return dbp;
      dbp = new Promise(function (resolve, reject) {
        var req;
        try { req = idb.open(DB_NAME, DB_VERSION); } catch (e) { reject(e); return; }
        req.onupgradeneeded = function () {
          var db = req.result;
          if (!db.objectStoreNames.contains('views')) db.createObjectStore('views', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('counters')) db.createObjectStore('counters', { keyPath: 'key' });
          if (!db.objectStoreNames.contains('state')) db.createObjectStore('state', { keyPath: 'key' });
        };
        req.onsuccess = function () {
          handle = req.result;
          // Druga karta kasuje bazę („wyczyść") - puszczamy ją, zamiast blokować.
          handle.onversionchange = function () { try { handle.close(); } catch (e) {} dbp = null; handle = null; };
          resolve(handle);
        };
        req.onerror = function () { dbp = null; reject(req.error); };
        req.onblocked = function () { dbp = null; reject(new Error('d2ma open blocked')); };
      });
      return dbp;
    }

    function write(stores, fn) {
      return open().then(function (db) {
        return new Promise(function (resolve, reject) {
          var t = db.transaction(stores, 'readwrite');
          fn(t);
          t.oncomplete = function () { resolve(); };
          t.onerror = t.onabort = function () { reject(t.error); };
        });
      });
    }

    return {
      kind: 'indexeddb',
      load: function () {
        return open().then(function (db) {
          return new Promise(function (resolve, reject) {
            var t = db.transaction(['views', 'state'], 'readonly');
            var rv = t.objectStore('views').getAll();
            var rs = t.objectStore('state').get('main');
            t.oncomplete = function () { resolve({ views: rv.result || [], state: rs.result || null }); };
            t.onerror = t.onabort = function () { reject(t.error); };
          });
        });
      },
      putViews: function (list) {
        return write(['views'], function (t) {
          var s = t.objectStore('views');
          list.forEach(function (v) { s.put(v); });
        });
      },
      deleteViews: function (ids) {
        return write(['views'], function (t) {
          var s = t.objectStore('views');
          ids.forEach(function (id) { s['delete'](id); });
        });
      },
      putState: function (st, counters) {
        return write(['state', 'counters'], function (t) {
          t.objectStore('state').put(st);
          t.objectStore('counters').put(counters);
        });
      },
      clear: function () {
        if (handle) { try { handle.close(); } catch (e) {} }
        handle = null;
        dbp = null;
        return new Promise(function (resolve) {
          var req;
          try { req = idb.deleteDatabase(DB_NAME); } catch (e) { resolve(); return; }
          req.onsuccess = req.onerror = req.onblocked = function () { resolve(); };
        });
      }
    };
  }

  // Prywatne okno albo przeglądarka bez IndexedDB: profil żyje tylko do
  // przeładowania, ale strona działa tak samo.
  function memoryStore() {
    var b = { views: [], state: null };
    return {
      kind: 'memory',
      load: function () { return Promise.resolve({ views: _clone(b.views), state: _clone(b.state) }); },
      putViews: function (list) {
        list.forEach(function (v) {
          var i = b.views.findIndex(function (x) { return x.id === v.id; });
          if (i >= 0) b.views[i] = _clone(v); else b.views.push(_clone(v));
        });
        return Promise.resolve();
      },
      deleteViews: function (ids) {
        b.views = b.views.filter(function (v) { return ids.indexOf(v.id) < 0; });
        return Promise.resolve();
      },
      putState: function (st) { b.state = _clone(st); return Promise.resolve(); },
      clear: function () { b.views = []; b.state = null; return Promise.resolve(); }
    };
  }

  // Zapisy po kolei: transakcja „wyczyść" nie może wyprzedzić zapisu sprzed niej.
  function _queue(fn) {
    writeChain = writeChain.then(fn).catch(function (e) { _log('write failed', e); });
    return writeChain;
  }

  function persistViews(list) {
    if (!tracking || !list.length) return;
    var copy = _clone(list);
    _queue(function () { return store.putViews(copy); });
  }

  function save() {
    if (!tracking) return;
    var st = _clone(state);
    var c = counters();
    _queue(function () { return store.putState(st, c); });
  }

  // ---------------------------------------------------------------------------
  // Profil liczony z historii (§13.2) - nie trzymamy sumy
  // ---------------------------------------------------------------------------

  function prefOf(key) {
    var counts = {};
    var last = {};
    views.forEach(function (v) {
      var val = v.unit && v.unit[key];
      if (val == null) return;
      counts[val] = (counts[val] || 0) + 1;
      if (!(last[val] >= v.ts)) last[val] = v.ts;
    });
    var best = null;
    Object.keys(counts).forEach(function (k) {
      if (best === null || counts[k] > counts[best] || (counts[k] === counts[best] && last[k] > last[best])) best = k;
    });
    return best === null ? null : Number(best);
  }

  function lastUnit() {
    return views.length ? views[views.length - 1].unit : null;
  }

  function counters() {
    var c = { key: 'profile', units: {}, rooms: {}, floors: {}, visits: state.visits,
      lastVisitAt: state.visitStart, lead: !!state.lead };
    views.forEach(function (v) {
      var u = v.unit || {};
      c.units[u.unitId] = (c.units[u.unitId] || 0) + 1;
      if (u.rooms != null) c.rooms[u.rooms] = (c.rooms[u.rooms] || 0) + 1;
      if (u.floor != null) c.floors[u.floor] = (c.floors[u.floor] || 0) + 1;
    });
    return c;
  }

  // ---------------------------------------------------------------------------
  // Normalizacja do unit_view (§13.1)
  // ---------------------------------------------------------------------------

  function num(v) {
    if (v == null || v === '' || typeof v === 'boolean') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var n = parseFloat(String(v).replace(/[\s ]/g, '').replace(',', '.'));
    return isFinite(n) ? n : null;
  }

  function str(v) {
    return v == null || v === '' ? null : String(v);
  }

  function pageBase() {
    var l = window.location || {};
    return (l.origin || '') + (l.pathname || '');
  }

  // Adres lokalu bez reszty adresu strony: gclid, fbclid, UTM albo ?email=
  // z linku kampanii nie mogą trafić do d2ma ani do webhooka. Zostaje tylko
  // to, co wskazuje lokal.
  var UNIT_PARAMS = ['sm-unit', 'd2-unit'];
  function cleanUrl(raw) {
    var l = window.location || {};
    var u;
    try { u = new URL(raw, l.href); } catch (e) { return null; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    var q = [];
    UNIT_PARAMS.forEach(function (k) {
      var v = u.searchParams.get(k);
      if (v) q.push(k + '=' + encodeURIComponent(v));
    });
    return u.origin + u.pathname + (q.length ? '?' + q.join('&') : '');
  }

  function smUnitLink(id) {
    return pageBase() + '?sm-unit=' + encodeURIComponent(id);
  }

  // Do src obrazka tylko https:, do href linku https: albo ten sam origin -
  // pole z koperty czy API nie może wstawić na stronę javascript: ani data:.
  function safeImage(v) {
    try {
      var u = new URL(v, (window.location || {}).href);
      return u.protocol === 'https:' ? u.href : null;
    } catch (e) {
      return null;
    }
  }

  function safeLink(v) {
    var l = window.location || {};
    try {
      var u = new URL(v, l.href);
      if (u.protocol === 'https:' || (l.origin && u.origin === l.origin)) return u.href;
    } catch (e) {}
    return null;
  }

  function status3de(c) {
    if (c.isNotAvailable === true) return 'sold';
    var s = num(c.status);
    if (s === 1) return 'available';
    if (s === 2) return 'reserved';
    if (s === 3) return 'sold';
    return 'other';
  }

  function statusOf(s) {
    s = String(s || '').toLowerCase();
    return s === 'available' || s === 'reserved' || s === 'sold' ? s : 'other';
  }

  function from3destate(entry) {
    var u = entry && entry.data && entry.data.unit;
    if (!u || u.id == null) return null;
    var c = u.custom || {};
    return {
      unitId: String(u.id), name: str(u.name), rooms: num(c.rooms), floor: num(c.floor),
      area: num(c.area), price: num(c.price), pricePerSqm: num(c.priceOfferPerSqm),
      building: c.building == null || c.building === '' ? null : String(c.building),
      status: status3de(c), isPromo: !!c.isPromo,
      url: smUnitLink(u.id),
      image: null, promoText: null, source: '3destate'
    };
  }

  function unitLink(id) {
    return pageBase() + '?d2-unit=' + encodeURIComponent(id);
  }

  // Pole rejestru 2destate: mapa podaje je płasko i pod fields, Products API
  // v2 tylko pod fields (kluczem jest slug). Tylko tekst - obiekt z API dałby
  // w popupie „[object Object]" i zły adres obrazka.
  function regField(p, key) {
    if (typeof p[key] === 'string' && p[key] !== '') return p[key];
    var f = p.fields && typeof p.fields === 'object' ? p.fields[key] : null;
    return typeof f === 'string' && f !== '' ? f : null;
  }

  function from2destate(p) {
    if (!p || p.id == null) return null;
    var promo = !!p.promo_active;
    var price = promo && p.promo_price_gross != null ? p.promo_price_gross
      : (p.price_gross != null ? p.price_gross : p.price);
    var perSqm = promo && p.promo_price_gross_m2 != null ? p.promo_price_gross_m2 : p.price_gross_m2;
    var building = p.building_name != null ? p.building_name
      : (p.building && typeof p.building === 'object' ? p.building.name : p.building);
    return {
      unitId: String(p.id), name: str(p.name), rooms: num(p.rooms), floor: num(p.floor),
      area: num(p.area), price: num(price), pricePerSqm: num(perSqm), building: str(building),
      status: statusOf(p.status), isPromo: promo, url: unitLink(p.id),
      // Pola rejestru 2destate mają klucze z myślnikiem.
      image: str(regField(p, 'obrazek-popup') || p.marketing_image || p.image),
      // Hasło tylko przy włączonej promocji - pole w rejestrze zostaje po jej końcu.
      promoText: promo ? str(regField(p, 'haslo-promocji')) : null, source: '2destate'
    };
  }

  // Dopisz pola, których brakowało (wejście deep linkiem zna sam unitId).
  function patch(target, from) {
    var changed = false;
    Object.keys(from).forEach(function (k) {
      if (target[k] == null && from[k] != null) { target[k] = from[k]; changed = true; }
    });
    return changed;
  }

  // ---------------------------------------------------------------------------
  // Wizyty i zdarzenia
  // ---------------------------------------------------------------------------

  // Wizyta = odsłony bez przerwy dłuższej niż 30 min. Zwraca zdarzenie
  // return_visit, gdy właśnie zaczęła się kolejna wizyta.
  function touch() {
    var t = now();
    var ev = null;
    if (state.lastSeen == null || t - state.lastSeen >= scaled(VISIT_GAP_MS)) {
      if (state.lastSeen != null) {
        state.prevEnd = state.lastSeen;
        ev = { type: 'return_visit', t: t, gap: t - state.lastSeen };
      }
      state.visits += 1;
      state.visitStart = t;
      // UTM z pierwszego wejścia w wizycie (§13.8.2); do profilu tylko po zgodzie.
      state.utm = pageUtm;
    }
    state.lastSeen = t;
    return ev;
  }

  function lastViewOf(unitId) {
    for (var i = views.length - 1; i >= 0; i--) {
      if (views[i].unit.unitId === unitId) return views[i];
    }
    return null;
  }

  function recordView(unit, t) {
    var changed = [];
    views.forEach(function (v) {
      if (v.partial && v.unit.unitId === unit.unitId && !unit.partial) {
        patch(v.unit, unit);
        delete v.partial;
        changed.push(v);
      }
    });
    var last = lastViewOf(unit.unitId);
    if (last && t - last.ts < DEDUPE_MS) {
      if (patch(last.unit, unit) && changed.indexOf(last) < 0) changed.push(last);
      persistViews(changed);
      _log('duplicate view within 5 s → ' + unit.unitId);
      return null;
    }
    state.seq = (state.seq || 0) + 1;
    var v = { id: t + '-' + state.seq, ts: t, unit: unit };
    if (unit.partial) { v.partial = true; delete unit.partial; }
    views.push(v);
    changed.push(v);
    persistViews(changed);
    if (views.length > MAX_VIEWS) {
      var drop = views.splice(0, views.length - MAX_VIEWS).map(function (x) { return x.id; });
      _queue(function () { return store.deleteViews(drop); });
    }
    return v;
  }

  // Wejście do modułu z każdego źródła. Przed otwarciem magazynu czeka w buforze.
  function intake(evt) {
    if (blocked) return;
    if (!tracking) {
      // Zdarzenie sprzed zgody nie wraca, gdy zgoda przyjdzie w trakcie startu.
      if (buffer.length < MAX_BUFFER) buffer.push({ evt: evt, real: Date.now(), consent: hasConsent() });
      return;
    }
    handle(evt);
    afterChange();
  }

  function handle(evt, at) {
    var visit = touch();
    if (visit) dispatch(visit);
    var t = at != null ? at : now();
    // Zdarzenie wizyty jest po jej początku (reguła 1) - także obejrzenie,
    // które ją otworzyło, i deep link z bufora sprzed otwarcia magazynu.
    if (state.visitStart != null && t <= state.visitStart) t = state.visitStart + 1;
    if (evt.type === 'view') {
      var v = recordView(_clone(evt.unit), t);
      if (!v) return;
      _emit('ma:view', { unit: v.unit });
      dispatch({ type: 'unit_view', t: t, unit: v.unit });
      runDue();
    } else if (evt.type === 'lead') {
      state.lead = true;
      state.leadAt = t;
      dispatch({ type: 'lead', t: t });
    } else if (evt.type === 'exit_intent') {
      // Raz na wizytę (§13.8.2).
      if (state.exitVisit === state.visits) return;
      state.exitVisit = state.visits;
      dispatch({ type: 'exit_intent', t: t });
    } else if (evt.type === 'engagement' || evt.type === 'form_abandon') {
      dispatch({ type: evt.type, t: t, data: evt.data });
    }
  }

  // ---------------------------------------------------------------------------
  // Koperta i kompilacja scenariuszy (§13.3, reguły 7-9)
  // ---------------------------------------------------------------------------

  function compile(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var env = {
      raw: raw, scenarios: [], channels: raw.channels && typeof raw.channels === 'object' ? raw.channels : {},
      storage: raw.storage && typeof raw.storage === 'object' ? raw.storage : {},
      project: str(raw.project2destate), demoState: null
    };
    var min = /^ma\.(\d+)$/.exec(String(raw.minScript || ''));
    if (min && parseInt(min[1], 10) > SCRIPT_VERSION) {
      _warn('envelope needs d2-ma ' + raw.minScript + ', this is ma.' + SCRIPT_VERSION
        + ' — nodes it does not know stop their branch');
    }
    if (String(raw.version) !== CONTRACT_VERSION) {
      _warn('envelope version "' + raw.version + '" is not "' + CONTRACT_VERSION + '" — no scenario runs');
      return env;
    }
    env.contentTemplates = contentLibrary(raw.templates);
    compiling = env;
    if (env.storage.consentRequired !== true && raw.demoState && typeof raw.demoState === 'object') {
      env.demoState = raw.demoState;
    }
    (Array.isArray(raw.scenarios) ? raw.scenarios : []).forEach(function (s) {
      var sc = compileScenario(s);
      if (sc) env.scenarios.push(sc);
    });
    compiling = null;
    return env;
  }

  var compiling = null;      // koperta w trakcie kompilacji (szablony treści dla validNode)

  // Tekst content z polami wyłącznie z listy §13.9.2; inaczej null.
  function contentTextValid(text) {
    if (typeof text !== 'string' || !text.length || text.length > 160) return false;
    var ok = true;
    text.replace(FIELD_RE, function (m, key) { if (CONTENT_FIELDS.indexOf(key) < 0) ok = false; return m; });
    return ok;
  }

  // Biblioteka szablonów treści z panelu: templates.content[] = { templateId, text }.
  function contentLibrary(t) {
    var lib = {};
    var list = t && typeof t === 'object' && Array.isArray(t.content) ? t.content : [];
    list.forEach(function (c) {
      if (!c || !SLOT_RE.test(String(c.templateId || '')) || !contentTextValid(c.text)) {
        _warn('content template "' + (c && c.templateId) + '" is not valid (id [a-z0-9-], text ≤ 160, fields from §13.9.2) — skipped');
        return;
      }
      lib[c.templateId] = c.text;
    });
    return lib;
  }

  function contentTemplate(id) {
    var lib = (compiling || envelope || {}).contentTemplates || {};
    if (Object.prototype.hasOwnProperty.call(lib, id)) return lib[id];
    return Object.prototype.hasOwnProperty.call(CONTENT_TEMPLATES, id) ? CONTENT_TEMPLATES[id] : null;
  }

  function compileScenario(s) {
    if (!s || typeof s !== 'object' || s.active !== true || s.scenarioId == null) return null;
    var sc = { id: String(s.scenarioId), revision: s.revision, nodes: {}, order: [], out: {}, inc: {}, triggers: [] };
    (Array.isArray(s.nodes) ? s.nodes : []).forEach(function (n) {
      if (!n || n.id == null) return;
      var node = _clone(n);
      node.id = String(n.id);
      node.invalid = !validNode(sc.id, node);
      sc.nodes[node.id] = node;
      sc.order.push(node.id);
      sc.out[node.id] = [];
      sc.inc[node.id] = [];
    });
    (Array.isArray(s.edges) ? s.edges : []).forEach(function (e) {
      if (!Array.isArray(e) || e.length < 2) return;
      var from = String(e[0]);
      var to = String(e[1]);
      if (!sc.nodes[from] || !sc.nodes[to]) {
        _warn('scenario "' + sc.id + '": edge ' + from + ' → ' + to + ' points at a missing node');
        return;
      }
      sc.out[from].push(to);
      sc.inc[to].push(from);
    });
    sc.order.forEach(function (id) {
      var node = sc.nodes[id];
      if (!sc.out[id].length && !sc.inc[id].length) {
        _log('node without edges ignored → ' + sc.id + '/' + id);
        node.invalid = true;
        return;
      }
      if (!sc.inc[id].length && node.type !== 'trigger') {
        _warn('scenario "' + sc.id + '": node "' + id + '" has no incoming edge and is not a trigger — ignored');
        node.invalid = true;
        return;
      }
      if (!node.invalid && node.type === 'trigger') sc.triggers.push(node);
    });
    return sc;
  }

  function validNode(scId, node) {
    var where = 'scenario "' + scId + '": node "' + node.id + '"';
    if (node.type === 'trigger') {
      var ev = node.when && node.when.event;
      if (!TRIGGERS[ev]) { _warn(where + ' — unknown trigger event "' + ev + '", skipped'); return false; }
      var w = node.when;
      if (ev === 'engagement' && !(num(w.minSeconds) > 0 || num(w.minScrollPct) > 0 || (w.utm && typeof w.utm === 'object'))) {
        _warn(where + ' — engagement needs minSeconds, minScrollPct or utm, skipped');
        return false;
      }
      return true;
    }
    if (node.type === 'condition') {
      if (!node['if'] || typeof node['if'] !== 'object') node['if'] = {};
      return true;
    }
    if (node.type === 'action') {
      if (!ACTIONS[node['do']]) { _warn(where + ' — unknown action "' + node['do'] + '", skipped'); return false; }
      if (node['do'] === 'popup' && !TEMPLATE_RE.test(String(node.template || ''))) {
        _warn(where + ' — popup template "' + node.template + '" is not a plain name, skipped');
        return false;
      }
      if (node['do'] === 'datalayer' && !DL_EVENTS[node.event]) {
        _warn(where + ' — unknown datalayer event "' + node.event + '", skipped');
        return false;
      }
      if (node['do'] === 'content') {
        var hasText = node.text != null;
        var hasTpl = node.templateId != null;
        if (!SLOT_RE.test(String(node.slot || '')) || hasText === hasTpl) {
          _warn(where + ' — content needs a slot and exactly one of text / a known templateId, skipped');
          return false;
        }
        if (hasText && !contentTextValid(node.text)) {
          _warn(where + ' — content text over 160 characters or with a field outside §13.9.2, skipped');
          return false;
        }
        if (hasTpl && contentTemplate(String(node.templateId)) == null) {
          _warn(where + ' — content templateId "' + node.templateId + '" is not in templates.content, skipped');
          return false;
        }
      }
      if (node['do'] === 'map_mark' && !MAP_BY[node.by]) {
        _warn(where + ' — map_mark by "' + node.by + '" is not rooms, floor or both, skipped');
        return false;
      }
      if (node['do'] === 'webhook' && !CHANNELS[node.channel]) {
        _warn(where + ' — unknown channel "' + node.channel + '", skipped');
        return false;
      }
      return true;
    }
    _warn(where + ' — unknown node type "' + node.type + '", skipped');
    return false;
  }

  // Stan scenariusza w d2ma, per scenarioId. Nowa rewizja = ścieżka od zera.
  function scState(sc) {
    var st = state.scenarios[sc.id];
    if (!st || st.rev !== sc.revision) {
      st = state.scenarios[sc.id] = { rev: sc.revision, nodes: {}, freq: {}, crm: {} };
      state.pending = state.pending.filter(function (p) { return p.sc !== sc.id; });
      backfill(sc, st);
    }
    return st;
  }

  // Scenariusz opublikowany po tym, jak ktoś już oglądał lokale: pierwszy
  // wyzwalacz liczy historię, żeby „obejrzał X → wrócił" zadziałało przy
  // pierwszym powrocie. Akcje za nim nie ruszają - historia to nie zdarzenie.
  function backfill(sc, st) {
    sc.triggers.forEach(function (node) {
      if (sc.inc[node.id].length) return;
      var ev = node.when.event;
      if (ev !== 'unit_view' && ev !== 'type_view') return;
      var match = views.filter(function (v) { return viewMatches(node.when, v.unit); });
      if (match.length >= minCount(node.when)) {
        var last = match[match.length - 1];
        st.nodes[node.id] = { at: last.ts, unit: last.unit, segment: null };
      }
    });
  }

  function applyEnvelope(env) {
    envelope = env;
    timeScale = 1;
    if (env && env.demoState) {
      var ts = num(env.demoState.timeScale);
      if (ts && ts > 0) timeScale = Math.min(Math.max(ts, 1), 3600);
    }
    if (!env || !tracking) return;
    env.scenarios.forEach(scState);
    var ids = env.scenarios.map(function (s) { return s.id; });
    // Scenariusz zniknął z koperty albo jest wyłączony - jego odłożone akcje przepadają.
    state.pending = state.pending.filter(function (p) { return ids.indexOf(p.sc) >= 0; });
  }

  function crmEvent(atStart) {
    if (!envelope || !envelope.demoState) return null;
    var seq = num(envelope.demoState.crmCallSeq);
    if (seq == null) return null;
    crmSeq = seq;
    // Przy starcie wynik telefonu zapadł przed tą odsłoną, więc jest „przed"
    // wizytą, która zaczyna się teraz - „nie odebrał → wrócił" działa w jednym
    // wejściu. Odczyt w trakcie (reload) to zwykłe „teraz".
    return { type: 'crm_call_result', t: atStart ? now() - 1 : now(), seq: seq, result: envelope.demoState.crmCallResult,
      duration: num(envelope.demoState.crmCallDurationSec) };
  }

  // ---------------------------------------------------------------------------
  // Wykonanie grafu (§13.3a)
  // ---------------------------------------------------------------------------

  function minCount(when) {
    var n = num(when.minCount);
    return n && n > 0 ? n : 1;
  }

  function viewMatches(when, unit) {
    if (!unit) return false;
    if (when.event === 'unit_view') {
      var ids = Array.isArray(when.unitIds) ? when.unitIds.map(String) : [];
      return !ids.length || ids.indexOf(unit.unitId) >= 0;
    }
    if (when.rooms != null && unit.rooms !== num(when.rooms)) return false;
    if (when.floor != null && unit.floor !== num(when.floor)) return false;
    return true;
  }

  // Kiedy wyzwalacz jest „uzbrojony": korzeń zawsze, reszta po poprzednim
  // kroku (reguły 1-2). Zwraca { at, ctx } albo null.
  function armOf(sc, st, node) {
    var inc = sc.inc[node.id];
    if (!inc.length) return { at: -Infinity, ctx: { unit: null, segment: null } };
    var best = null;
    inc.forEach(function (id) {
      var d = st.nodes[id];
      if (d && (best === null || d.at < best.at)) best = d;
    });
    return best ? { at: best.at, ctx: { unit: best.unit, segment: best.segment } } : null;
  }

  function warsawHour(t) {
    try {
      var h = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Warsaw', hour: 'numeric', hourCycle: 'h23' })
        .format(new Date(t));
      return parseInt(h, 10);
    } catch (e) {
      return new Date(t).getHours();
    }
  }

  function check(sc, st, node, evt, arm) {
    var w = node.when;
    var ctx = { unit: arm.ctx.unit, segment: arm.ctx.segment };
    if (evt.type === 'unit_view' || evt.type === 'type_view') {
      if (!viewMatches(w, evt.unit)) return null;
      var count = views.filter(function (v) { return v.ts > arm.at && viewMatches(w, v.unit); }).length;
      if (count < minCount(w)) return null;
      ctx.unit = evt.unit;
      return ctx;
    }
    // Reguła 1: „po" znaczy później, nie w tej samej milisekundzie.
    if (evt.t <= arm.at) return null;
    if (evt.type === 'return_visit') {
      var after = num(w.afterHours);
      if (after == null || after < 0) after = 1;
      return evt.gap >= scaled(after * HOUR_MS) ? ctx : null;
    }
    if (evt.type === 'lead' || evt.type === 'exit_intent') return ctx;
    if (evt.type === 'engagement') {
      var e = evt.data || {};
      var key = sc.id + '/' + node.id;
      if (engFired[key] || !engagementMet(w, e.seconds, e.scrollPct)) return null;
      engFired[key] = true;
      ctx.signal = { seconds: e.seconds, scroll_pct: e.scrollPct };
      return ctx;
    }
    if (evt.type === 'form_abandon') {
      var f = evt.data || {};
      if (!formListed(w, f.formId)) return null;
      if (!f.exit && (f.idle == null || f.idle < idleOf(w))) return null;
      // Raz na formularz na wizytę (§13.8.2) - tej, w której go porzucono.
      var fk = (f.visit != null ? f.visit : state.visits) + '|' + sc.id + '/' + node.id + '/' + (f.formId || '');
      var done = state.abandoned || (state.abandoned = []);
      if (done.indexOf(fk) >= 0) return null;
      done.push(fk);
      if (done.length > 50) done.shift();
      ctx.signal = { form_id: f.formId || null };
      return ctx;
    }
    if (evt.type === 'crm_call_result') {
      var seen = st.crm[node.id];
      st.crm[node.id] = evt.seq;
      // Pierwszy odczyt bez poprzedniego kroku: to, co już leży w kopercie, nie jest nowym wynikiem.
      if (seen == null || evt.seq <= seen) return null;
      if (evt.result !== w.result) return null;
      if (w.minDurationSec != null) {
        if (evt.result !== 'answered' || evt.duration == null || evt.duration < num(w.minDurationSec)) return null;
      }
      if (Array.isArray(w.hours) && w.hours.length === 2) {
        var h = warsawHour(Date.now());
        if (h < num(w.hours[0]) || h >= num(w.hours[1])) return null;
      }
      return ctx;
    }
    return null;
  }

  // Jedno zdarzenie przechodzi przez wszystkie aktywne scenariusze, w kolejności
  // koperty - stąd pierwszeństwo popupu wcześniejszego scenariusza.
  function dispatch(evt) {
    if (!envelope || !tracking) return;
    var pass = { popup: false };
    // Typ zdarzenia z listy scenariusza: wyzwalacze unit_view i type_view
    // słuchają tego samego obejrzenia lokalu.
    var types = evt.type === 'unit_view' ? ['unit_view', 'type_view'] : [evt.type];
    envelope.scenarios.forEach(function (sc) {
      var st = scState(sc);
      var firing = [];
      // Najpierw decyzja na stanie sprzed zdarzenia: wyzwalacz uzbrojony przez
      // inny, który odpalił tym samym zdarzeniem, czeka na następne.
      sc.triggers.forEach(function (node) {
        if (types.indexOf(node.when.event) < 0) return;
        var arm = armOf(sc, st, node);
        if (!arm) return;
        var ctx = check(sc, st, node, { type: node.when.event, t: evt.t, unit: evt.unit, gap: evt.gap,
          seq: evt.seq, result: evt.result, duration: evt.duration, data: evt.data }, arm);
        if (ctx) firing.push({ node: node, ctx: ctx });
      });
      firing.forEach(function (f) {
        f.ctx.t = evt.t;
        _log('trigger → ' + sc.id + '/' + f.node.id, evt.type);
        done(st, f.node, f.ctx, evt.t);
        propagate(sc, st, f.node, f.ctx, pass, {});
      });
    });
  }

  // Krok zapisuje się nie wcześniej niż zdarzenie, które go uruchomiło. Czas
  // zdarzenia bywa o 1 ms po now() (obejrzenie otwierające wizytę), a krok
  // zapisany wcześniej niż ono policzyłby je następnemu wyzwalaczowi jako „po".
  function done(st, node, ctx, t) {
    var at = t != null ? t : now();
    if (ctx.t != null && ctx.t > at) at = ctx.t;
    st.nodes[node.id] = { at: at, unit: ctx.unit || null, segment: ctx.segment || null };
  }

  function propagate(sc, st, node, ctx, pass, seen) {
    sc.out[node.id].forEach(function (toId) {
      var target = sc.nodes[toId];
      if (!target || target.invalid) return;
      if (target.type === 'trigger') {
        // Wynik telefonu liczy się dopiero ten, który przyjdzie po tym kroku.
        if (target.when.event === 'crm_call_result') st.crm[toId] = crmSeq;
        return;
      }
      if (seen[toId]) return;
      seen[toId] = true;
      if (target.type === 'condition') {
        if (!conditionHolds(target['if'])) {
          _log('condition not met → ' + sc.id + '/' + toId);
          return;
        }
        done(st, target, ctx);
        propagate(sc, st, target, ctx, pass, seen);
        return;
      }
      runAction(sc, st, target, ctx, pass, seen);
    });
  }

  function conditionHolds(cond) {
    var ok = true;
    Object.keys(cond).forEach(function (k) {
      var v = cond[k];
      if (k === 'pref.rooms') { if (prefOf('rooms') !== num(v)) ok = false; }
      else if (k === 'pref.floor') { if (prefOf('floor') !== num(v)) ok = false; }
      else if (k === 'lead') { if (!!state.lead !== (v === true)) ok = false; }
      else if (k === 'visits') {
        var min = v && typeof v === 'object' ? num(v.min) : null;
        if (min != null && state.visits < min) ok = false;
      }
      // Nieznany warunek nie zatrzymuje ścieżki (reguła 8).
    });
    return ok;
  }

  function frequencyOf(node) {
    var f = node.frequency;
    if (f == null || f === 'once_per_visit') return { kind: 'visit' };
    if (f === 'once_per_unit') return { kind: 'unit' };
    var m = /^once_per_days:(\d+(?:\.\d+)?)$/.exec(String(f));
    if (m) return { kind: 'days', days: parseFloat(m[1]) };
    _warn('node "' + node.id + '" — unknown frequency "' + f + '", using once_per_visit');
    return { kind: 'visit' };
  }

  function unitKey(unit) {
    return unit && unit.unitId != null ? unit.unitId : '';
  }

  function skippedByFrequency(st, node, unit) {
    var f = frequencyOf(node);
    var r = st.freq[node.id];
    if (!r) return false;
    // cooldownMinutes: odstęp między wykonaniami, także między wizytami (§13.8.1).
    var cool = num(node.cooldownMinutes);
    if (cool > 0 && r.at != null && now() - r.at < scaled(Math.min(cool, 10080) * 60 * 1000)) return true;
    if (f.kind === 'visit') return r.visit === state.visits;
    if (f.kind === 'unit') return (r.units || []).indexOf(unitKey(unit)) >= 0;
    return r.at != null && now() - r.at < scaled(f.days * DAY_MS);
  }

  function recordFrequency(st, node, unit) {
    var r = st.freq[node.id] || (st.freq[node.id] = {});
    r.visit = state.visits;
    r.at = now();
    if (frequencyOf(node).kind === 'unit') {
      r.units = r.units || [];
      if (r.units.indexOf(unitKey(unit)) < 0) r.units.push(unitKey(unit));
      if (r.units.length > 500) r.units.shift();
    }
  }

  function runAction(sc, st, node, ctx, pass, seen) {
    var c = { unit: ctx.unit || lastUnit(), segment: ctx.segment || null, t: ctx.t, signal: ctx.signal || null };
    // Reguła 6: pominięta akcja nie kończy gałęzi i nie czeka swojego opóźnienia.
    if (skippedByFrequency(st, node, c.unit)) {
      _log('skipped by frequency → ' + sc.id + '/' + node.id);
      // Treść z tej akcji już stoi na stronie - ma_content za nią zna swój slot.
      if (node['do'] === 'content') c.signal = { slot: node.slot, template_id: node.templateId == null ? null : node.templateId };
      done(st, node, c);
      propagate(sc, st, node, c, pass, seen);
      return;
    }
    var delay = num(node.delayMinutes) || 0;
    if (delay > 0) {
      // Popup zapisuje częstotliwość w chwili wykonania (execute), reszta teraz:
      // drugi wyzwalacz w czasie opóźnienia nie odkłada tej samej akcji drugi raz.
      if (node['do'] !== 'popup') recordFrequency(st, node, c.unit);
      defer(sc, node, c, now() + scaled(delay * 60 * 1000), null);
      return;
    }
    execute(sc, st, node, c, pass, seen);
  }

  function defer(sc, node, ctx, due, afterVisit) {
    state.pending.push({ sc: sc.id, node: node.id, due: due, created: now(), afterVisit: afterVisit, ctx: _clone(ctx) });
    _log('deferred → ' + sc.id + '/' + node.id, { due: due, afterVisit: afterVisit });
  }

  function execute(sc, st, node, ctx, pass, seen) {
    var kind = node['do'];
    if (kind === 'popup') {
      // Konflikt dotyczy tylko popupów: drugi w tej samej chwili czeka do następnej wizyty.
      if (pass.popup) {
        defer(sc, node, ctx, now(), state.visits);
        return;
      }
      pass.popup = true;
      // Częstotliwość od razu, nie po pokazaniu: popup odłożony z poprzedniej
      // wizyty i ten sam popup z nowego wyzwalacza nie mogą przejść oba.
      // Gdy lokal okaże się sprzedany, wpis wraca do stanu sprzed decyzji.
      var before = _clone(st.freq[node.id]);
      recordFrequency(st, node, ctx.unit);
      showPopup(node, ctx, function (shownUnit) {
        _emit('ma:action', { scenarioId: sc.id, nodeId: node.id, 'do': 'popup', template: node.template, unit: shownUnit });
      }, function () {
        if (before) st.freq[node.id] = before; else delete st.freq[node.id];
        save();
      });
    } else if (kind === 'datalayer') {
      var segment = node.params && node.params.segment != null ? String(node.params.segment) : null;
      var segEvent = node.event === 'ma_segment' || node.event === 'ma_segment_exit';
      var payload = { event: node.event };
      if (segEvent || segment != null) payload.segment = segment;
      payload.ma_scenario = sc.id;
      (DL_PARAMS[node.event] || []).forEach(function (k) {
        if (ctx.signal && ctx.signal[k] != null) payload[k] = ctx.signal[k];
      });
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(payload);
      // Segment profilu zmieniają tylko zdarzenia segmentu, nie ma_engaged itp.
      if (segEvent) {
        ctx = { unit: ctx.unit, segment: segment, t: ctx.t, signal: ctx.signal };
        state.lastSegment = segment;
      }
      recordFrequency(st, node, ctx.unit);
      _emit('ma:action', { scenarioId: sc.id, nodeId: node.id, 'do': 'datalayer', event: node.event, segment: segment });
    } else if (kind === 'content') {
      var text = contentText(node, ctx.unit);
      var n = text == null ? 0 : setSlot(node.slot, text);
      // Pole bez wartości albo brak slotu na stronie: treść się nie zmienia, a dalsze
      // kroki (np. ma_content) by o tym kłamały - gałąź się kończy.
      if (!n) {
        _log((text == null ? 'content skipped — a field has no value → ' : 'content skipped — no [d2-ma-slot] → ')
          + sc.id + '/' + node.id);
        return;
      }
      recordFrequency(st, node, ctx.unit);
      ctx = { unit: ctx.unit, segment: ctx.segment, t: ctx.t,
        signal: { slot: node.slot, template_id: node.templateId == null ? null : node.templateId } };
      _emit('ma:action', { scenarioId: sc.id, nodeId: node.id, 'do': 'content', slot: node.slot });
    } else if (kind === 'map_mark') {
      recordFrequency(st, node, ctx.unit);
      mapMark(sc, node);
    } else if (kind === 'webhook') {
      if (sendWebhook(sc, node, ctx)) {
        recordFrequency(st, node, ctx.unit);
        _emit('ma:action', { scenarioId: sc.id, nodeId: node.id, 'do': 'webhook', channel: node.channel });
      }
    }
    done(st, node, ctx);
    propagate(sc, st, node, ctx, pass, seen);
  }

  // Odłożone akcje: po czasie, w kolejności scenariuszy koperty.
  function runDue() {
    if (!envelope || !tracking || !state.pending.length) { scheduleDue(); return; }
    var t = now();
    var due = [];
    state.pending = state.pending.filter(function (p) {
      if (t - p.created > PENDING_TTL_MS) { _log('deferred action expired → ' + p.sc + '/' + p.node); return false; }
      if (p.due <= t && (p.afterVisit == null || state.visits > p.afterVisit)) { due.push(p); return false; }
      return true;
    });
    var order = envelope.scenarios.map(function (s) { return s.id; });
    due.sort(function (a, b) { return (order.indexOf(a.sc) - order.indexOf(b.sc)) || (a.due - b.due); });
    var pass = { popup: false };
    due.forEach(function (p) {
      var sc = envelope.scenarios[order.indexOf(p.sc)];
      var node = sc && sc.nodes[p.node];
      if (!node || node.invalid) return;
      var st = scState(sc);
      if (node['do'] === 'popup' && skippedByFrequency(st, node, p.ctx.unit)) {
        done(st, node, p.ctx);
        propagate(sc, st, node, p.ctx, pass, {});
        return;
      }
      execute(sc, st, node, p.ctx, pass, {});
    });
    scheduleDue();
  }

  function scheduleDue() {
    if (dueTimer) { clearTimeout(dueTimer); dueTimer = null; }
    if (!tracking || !state || !state.pending.length) return;
    var next = null;
    state.pending.forEach(function (p) {
      if (p.afterVisit != null) return;
      if (next === null || p.due < next) next = p.due;
    });
    if (next === null) return;
    var wait = Math.min(Math.max(next - now(), 0) + 50, 2147483000);
    // Bez touch(): odłożona akcja, która dojrzała, nie jest aktywnością
    // odwiedzającego i nie przedłuża wizyty.
    dueTimer = setTimeout(function () {
      dueTimer = null;
      runDue();
      afterChange();
    }, wait);
  }

  function afterChange() {
    save();
    render();
    _emit('ma:change', {});
  }

  // ---------------------------------------------------------------------------
  // Akcja webhook (§13.4) - bez danych osobowych, tylko testowe kontakty
  // ---------------------------------------------------------------------------

  function webhookUrlAllowed(url) {
    if (/^https:\/\//i.test(url)) return true;
    // Odbiornik testowy na tym komputerze.
    return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(url);
  }

  // Adres kanału: webhook z koperty v0. Kanał z via (§13.10) strona pomija -
  // e-mail, SMS i telefon zleca wyłącznie lead po naszej stronie (MA-D30).
  function channelUrl(ch, name) {
    if (!ch || typeof ch !== 'object') return '';
    if (ch.via != null) {
      _warn('channel "' + name + '" has via "' + ch.via + '" — the page does not send it (MA-D30)');
      return '';
    }
    var url = typeof ch.webhook === 'string' ? ch.webhook : '';
    return url && webhookUrlAllowed(url) ? url : '';
  }

  function sendWebhook(sc, node, ctx) {
    var where = 'scenario "' + sc.id + '": webhook "' + node.id + '"';
    if (node.testOnly !== true) {
      _warn(where + ' has no testOnly: true — not sent (contract v0 sends to agency test contacts only)');
      return false;
    }
    var url = channelUrl(envelope.channels[node.channel], node.channel);
    if (!url) {
      _warn(where + ' — channel "' + node.channel + '" has no usable webhook address');
      return false;
    }
    if (typeof fetch !== 'function') return false;
    var body = {
      scenarioId: sc.id, revision: sc.revision, nodeId: node.id, channel: node.channel,
      template: node.template == null ? null : String(node.template),
      unit: ctx.unit || null, segment: ctx.segment || null,
      visitorId: state.visitorId, testOnly: true, ts: Date.now()
    };
    try {
      fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        keepalive: true, credentials: 'omit', mode: 'cors'
      }).then(function (r) {
        if (r && !r.ok) _warn(where + ' — webhook answered ' + r.status);
      }, function (e) { _warn(where + ' — webhook failed', e); });
    } catch (e) {
      _warn(where + ' — webhook failed', e);
      return false;
    }
    _log('webhook → ' + node.channel, body);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Akcja content - tekst w [d2-ma-slot], wyłącznie przez textContent (§13.8.3)
  // ---------------------------------------------------------------------------

  var slotOriginals = [];    // { el, text } - oryginał wraca przy „Wyczyść"

  // „1 pokój", „2 pokoje", „5 pokoi", „12 pokoi", „22 pokoje".
  function roomsLabel(n) {
    if (n == null) return null;
    var word = 'pokoi';
    if (n === 1) word = 'pokój';
    else if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) word = 'pokoje';
    return n + ' ' + word;
  }

  function contentValue(key, unit) {
    if (key === 'pref.rooms' || key === 'pref.floor') {
      var p = prefOf(key.slice(5));
      return p == null ? null : String(p);
    }
    if (key === 'pref.roomsLabel') return roomsLabel(prefOf('rooms'));
    var f = key.slice(5);
    if (f === 'roomsLabel') return roomsLabel(unit ? unit.rooms : null);
    if (f === 'rooms' || f === 'floor') return unit && unit[f] != null ? String(unit[f]) : null;
    return fieldValue(f, unit);
  }

  // null, gdy któreś pole nie ma wartości - na stronę nie trafia „null" ani dziura.
  function contentText(node, unit) {
    var tpl = node.text != null ? String(node.text) : contentTemplate(String(node.templateId));
    if (tpl == null) return null;
    var missing = false;
    var out = tpl.replace(FIELD_RE, function (m, key) {
      var v = CONTENT_FIELDS.indexOf(key) >= 0 ? contentValue(key, unit) : null;
      if (v == null || v === '') missing = true;
      return v == null ? '' : v;
    });
    return missing ? null : out;
  }

  function setSlot(slot, text) {
    if (!document.querySelectorAll) return 0;
    var els = document.querySelectorAll('[d2-ma-slot="' + slot + '"], [data-d2-ma-slot="' + slot + '"]');
    for (var i = 0; i < els.length; i++) {
      var known = false;
      for (var j = 0; j < slotOriginals.length; j++) if (slotOriginals[j].el === els[i]) known = true;
      if (!known) slotOriginals.push({ el: els[i], text: els[i].textContent });
      els[i].textContent = text;
    }
    return els.length;
  }

  function restoreSlots() {
    slotOriginals.forEach(function (o) { o.el.textContent = o.text; });
    slotOriginals = [];
  }

  // ---------------------------------------------------------------------------
  // Akcja map_mark - lokale z preferencji na mapie 2destate (§13.8.3)
  // ---------------------------------------------------------------------------

  var markWaiting = [];      // map_mark, które czekają na onMapLoad
  var lastMapName = null;    // nazwa mapy z ostatniego kliknięcia

  function mapNames() {
    var I = imp();
    var names = I && I.instances ? Object.keys(I.instances) : [];
    if (!names.length && lastMapName) names.push(lastMapName);
    return names;
  }

  // Ranking z profilu (§13.8.3): przy both najpierw pasujące w obu, potem w
  // jednym (pokoje przed piętrem), w grupie kolejność z getProducts(); bez
  // sprzedanych. Zwraca listę id, najlepszy pierwszy.
  function rankUnits(products, by) {
    var rooms = prefOf('rooms');
    var floor = prefOf('floor');
    var list = [];
    products.forEach(function (p, i) {
      var u = from2destate(p);
      if (!u || u.status === 'sold') return;
      var score = 0;
      if (by !== 'floor' && rooms != null && u.rooms === rooms) score += 2;
      if (by !== 'rooms' && floor != null && u.floor === floor) score += 1;
      if (score > 0) list.push({ id: u.unitId, score: score, i: i });
    });
    list.sort(function (a, b) { return (b.score - a.score) || (a.i - b.i); });
    return list.map(function (x) { return x.id; });
  }

  function mapMark(sc, node) {
    var api = mapApi();
    if (!api || typeof api.getProducts !== 'function') {
      if (window.console && console.info) console.info('[digi2.ma] map_mark skipped — no 2destate map on this page');
      return;
    }
    var products = [];
    try { products = api.getProducts() || []; } catch (e) {}
    if (!products.length) {
      // Mapa jeszcze się ładuje - oznaczamy po onMapLoad.
      markWaiting.push({ sc: sc, node: node });
      _log('map_mark waits for the map → ' + sc.id + '/' + node.id);
      return;
    }
    var limit = Math.min(Math.max(num(node.limit) || 5, 1), 20);
    var ids = rankUnits(products, node.by).slice(0, limit);
    if (!ids.length) { _log('map_mark — nothing on the map matches the profile'); return; }
    var className = CLASS_RE.test(String(node.className || '')) ? node.className : 'd2-preferred';
    try {
      if (typeof api.markProducts === 'function') {
        // null = mapa jeszcze się ładuje i nałoży oznaczenie sama, 0 = nic nie pasuje.
        mapNames().forEach(function (m) {
          if (api.markProducts(m, ids, { className: className }) === 0) _log('map_mark — map "' + m + '" marked nothing');
        });
      } else {
        // Fallback z 2destate 1.6.9: piętro i podświetlenie najlepszego lokalu, bez dymka.
        var o = mapObjectFor(ids[0]);
        var I = imp();
        if (!o || !I) { _log('map_mark — best unit has no shape on the map'); return; }
        if (typeof I.changeArtboard === 'function' && o.artboard != null) I.changeArtboard(o.map, o.artboard);
        if (typeof I.highlightObject === 'function') I.highlightObject(o.map, o.title);
      }
    } catch (e) {
      _warn('map_mark failed', e);
      return;
    }
    _emit('ma:action', { scenarioId: sc.id, nodeId: node.id, 'do': 'map_mark', units: ids });
  }

  // ---------------------------------------------------------------------------
  // Akcja popup - na module popupów
  // ---------------------------------------------------------------------------

  function timeoutFetch(url, opts, ms) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error('timeout')); }, ms);
      fetch(url, opts).then(function (r) { clearTimeout(timer); resolve(r); },
        function (e) { clearTimeout(timer); reject(e); });
    });
  }

  function mapApi() {
    return window.d2estate || window['2destate'] || null;
  }

  function mapProduct(id) {
    var api = mapApi();
    if (!api || typeof api.getProducts !== 'function') return null;
    try {
      var list = api.getProducts() || [];
      for (var i = 0; i < list.length; i++) if (String(list[i].id) === id) return list[i];
    } catch (e) {}
    return null;
  }

  // Hasło promocji i obrazek ze świeżego odczytu obowiązują także puste:
  // promocji usuniętej w 2destate nie wolno dalej pokazywać z IndexedDB.
  var CLEARABLE = ['promoText', 'image'];

  // only: lista pól do odświeżenia; bez niej - wszystko poza url i source.
  // Puste pole świeżych danych nie nadpisuje zapisanego, chyba że jest na
  // liście clear.
  function merge(stored, fresh, only, clear) {
    var out = _clone(stored);
    Object.keys(fresh).forEach(function (k) {
      if (k === 'url' || k === 'source') return;
      if (only && only.indexOf(k) < 0) return;
      if (fresh[k] != null || (clear && clear.indexOf(k) >= 0)) out[k] = fresh[k];
    });
    return out;
  }

  // Products API ma inny model niż mapa (bez building_name, building_id zamiast
  // nazwy) - bierzemy z niego tylko to, co się zmienia: status, cenę, promocję
  // i pola rejestru. Reszta zostaje z zapisu kliknięcia na mapie.
  var API_FRESH = ['status', 'price', 'pricePerSqm', 'isPromo', 'image', 'promoText'];

  // Świeży status i cena przed popupem: z mapy na stronie, inaczej z Products
  // API 2destate. Zwraca null, gdy lokalu nie wolno już promować.
  function freshUnit(unit) {
    var p = mapProduct(unit.unitId);
    if (p) return Promise.resolve(merge(unit, from2destate(p), null, CLEARABLE));
    var project = envelope && envelope.project;
    if (unit.source !== '2destate' || !project || !UUID_RE.test(unit.unitId) || typeof fetch !== 'function') {
      return Promise.resolve(unit);
    }
    var api = (_cfg('d2-ma-products-api') || DEFAULT_PRODUCTS_API).replace(/\/+$/, '');
    return timeoutFetch(api + '/projects/' + encodeURIComponent(project) + '/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_ids: [unit.unitId] }), credentials: 'omit'
    }, STATUS_TIMEOUT_MS).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (list) {
      var row = Array.isArray(list) ? list[0] : (list && Array.isArray(list.data) ? list.data[0] : null);
      // Publiczne API nie zwraca lokalu wycofanego z oferty - tego też nie promujemy.
      if (!row) return null;
      var u = from2destate(row);
      if (!u) return unit;
      // Wiersz bez obiektu fields nie mówi nic o polach rejestru - nie czyścimy.
      var known = row.fields && typeof row.fields === 'object';
      return merge(unit, u, API_FRESH, known ? CLEARABLE : null);
    }, function (e) {
      _log('status refresh failed, using stored unit', e);
      return unit;
    });
  }

  function popupsApi() {
    var m = window.digi2.modules;
    if (m && typeof m.require === 'function') {
      return m.require('popups').then(function () { return window.digi2.popups; });
    }
    var p = window.digi2.popups;
    return p && typeof p.create === 'function' ? Promise.resolve(p) : Promise.reject(new Error('popups module missing'));
  }

  var LABELS = {
    'last-unit': { heading: 'Ostatnio oglądany lokal', cta: 'Zobacz lokal' },
    'promo-rooms': { heading: 'Wybrane dla Ciebie', cta: 'Zobacz ofertę' }
  };

  // Wbudowany popup, gdy strona nie ma własnego [d2-ma-popup="<szablon>"].
  // Szkielet bez danych; dane wchodzą przez textContent w fill().
  function buildFallback(template) {
    var l = LABELS[template] || { heading: 'Dla Ciebie', cta: 'Zobacz' };
    var el = document.createElement('div');
    el.setAttribute('d2-ma-popup', template);
    el.setAttribute('d2-ma-builtin', '');
    el.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;'
      + 'padding:16px;background:rgba(15,18,24,.55);z-index:9999';
    el.innerHTML =
      '<div role="dialog" aria-modal="true" style="position:relative;width:100%;max-width:380px;'
      + 'background:#fff;color:#1a1d1c;border-radius:14px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.3);'
      + 'font:15px/1.5 -apple-system,BlinkMacSystemFont,\'Segoe UI\',system-ui,sans-serif">'
      + '<button type="button" d2-ma-close aria-label="Zamknij" style="position:absolute;top:8px;right:8px;'
      + 'width:36px;height:36px;border:0;border-radius:18px;background:rgba(255,255,255,.9);font-size:22px;'
      + 'line-height:1;cursor:pointer;color:#1a1d1c">&times;</button>'
      + '<img d2-ma-field="image" alt="" style="display:none;width:100%;height:auto">'
      + '<div style="padding:20px 22px 22px">'
      + '<p d2-ma-heading style="margin:0 0 4px;font-size:13px;color:#6b7370"></p>'
      + '<h3 d2-ma-field="name" style="margin:0 0 6px;font-size:22px;line-height:1.2"></h3>'
      + '<p d2-ma-field="summary" style="margin:0 0 6px;color:#3d4442"></p>'
      + '<p d2-ma-field="price" style="margin:0 0 16px;font-size:19px;font-weight:700"></p>'
      + '<a d2-ma-cta href="#" style="display:block;text-align:center;padding:12px 16px;border-radius:10px;'
      + 'background:#1a1d1c;color:#fff;text-decoration:none;font-weight:600"></a>'
      + '</div></div>';
    var heading = el.querySelector('[d2-ma-heading]');
    if (heading) heading.textContent = l.heading;
    var cta = el.querySelector('[d2-ma-cta]');
    if (cta) cta.textContent = l.cta;
    var dialog = el.querySelector('[role="dialog"]');
    if (dialog) dialog.setAttribute('aria-label', l.heading);
    document.body.appendChild(el);
    return el;
  }

  function fmtNumber(v, digits) {
    try {
      return new Intl.NumberFormat('pl-PL', { maximumFractionDigits: digits }).format(v);
    } catch (e) {
      return String(v);
    }
  }

  function fieldValue(key, unit) {
    if (!unit) return null;
    var v;
    switch (key) {
      case 'price':
      case 'pricePerSqm':
        v = unit[key];
        return v == null ? null : fmtNumber(v, 0) + ' zł' + (key === 'pricePerSqm' ? '/m²' : '');
      case 'area':
        return unit.area == null ? null : fmtNumber(unit.area, 2) + ' m²';
      case 'summary':
        var parts = [];
        if (unit.rooms != null) parts.push(unit.rooms + ' pok.');
        if (unit.area != null) parts.push(fmtNumber(unit.area, 2) + ' m²');
        if (unit.floor != null) parts.push(unit.floor === 0 ? 'parter' : 'piętro ' + unit.floor);
        return parts.length ? parts.join(' · ') : null;
      case 'time':
        return null;
      default:
        v = unit[key];
        return v == null || v === '' ? null : String(v);
    }
  }

  function fill(root, unit) {
    var fields = root.querySelectorAll('[d2-ma-field], [data-d2-ma-field]');
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var v = fieldValue(_attr(f, 'd2-ma-field'), unit);
      if (f.tagName === 'IMG') {
        var src = v ? safeImage(v) : null;
        if (src) { f.setAttribute('src', src); f.style.display = 'block'; } else { f.style.display = 'none'; }
      } else {
        f.textContent = v == null ? '' : v;
        f.style.display = v == null ? 'none' : '';
      }
    }
  }

  function wireCta(root, name, unit, cta) {
    var links = root.querySelectorAll('[d2-ma-cta], [data-d2-ma-cta]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      a._d2maUnit = unit;
      a._d2maCta = cta;
      var href = cta === 'open_unit' && unit.url ? safeLink(unit.url) : null;
      if (href && a.tagName === 'A') a.setAttribute('href', href);
      if (a._d2maBound) continue;
      a._d2maBound = true;
      a.addEventListener('click', function (e) {
        var u = this._d2maUnit;
        var inst = window.digi2.popups && window.digi2.popups.get && window.digi2.popups.get(name);
        if (this._d2maCta === 'open_unit' && u && u.source === '2destate' && mapObjectFor(u.unitId)) {
          e.preventDefault();
          if (inst) inst.hide();
          openOnMap(u.unitId);
          return;
        }
        if (inst) inst.hide();
      });
    }
  }

  function showPopup(node, ctx, onShown, onSkipped) {
    var unit = ctx.unit;
    if (!unit) { _log('popup skipped — no unit in the path'); onSkipped(); return; }
    freshUnit(unit).then(function (fresh) {
      if (!fresh || fresh.status === 'sold') {
        _log('popup skipped — unit no longer on offer → ' + unit.unitId);
        onSkipped();
        return null;
      }
      return popupsApi().then(function (popups) {
        var name = 'd2-ma-' + node.template;
        var inst = popups.get(name);
        if (!inst || !inst.popupElement) {
          if (inst) popups.destroy(name);
          var el = document.querySelector('[d2-ma-popup="' + node.template + '"], [data-d2-ma-popup="' + node.template + '"]')
            || buildFallback(node.template);
          if (!el.id) el.id = name;
          inst = popups.create(name, {
            popupSelector: '#' + el.id, cookieName: null, dataTagTrigger: false, openOnLoad: false,
            closeTriggerSelector: '#' + el.id + ' [d2-ma-close], #' + el.id + ' [data-d2-ma-close]'
          });
        }
        if (!inst || !inst.popupElement) { onSkipped(); return null; }
        fill(inst.popupElement, fresh);
        wireCta(inst.popupElement, name, fresh, node.cta);
        inst.show({ auto: true });
        onShown(fresh);
        return null;
      });
    })['catch'](function (e) { _warn('popup failed', e); onSkipped(); });
  }

  // ---------------------------------------------------------------------------
  // Mapa 2destate: otwarcie lokalu i podświetlenie lokali z profilu
  // ---------------------------------------------------------------------------

  function imp() {
    return window.ImageMapPro || null;
  }

  function walkObjects(nodes, fn) {
    if (!Array.isArray(nodes)) return;
    nodes.forEach(function (n) {
      if (!n) return;
      fn(n);
      if (Array.isArray(n.children)) walkObjects(n.children, fn);
    });
  }

  function artboardsOf(map) {
    if (map && map.store && map.store.state && Array.isArray(map.store.state.artboards)) return map.store.state.artboards;
    return (map && map.config && map.config.artboards) || [];
  }

  // Kształt mapy z przypisanym produktem: { map, title, artboard }.
  function mapObjectFor(productId) {
    var I = imp();
    if (!I || !I.instances) return null;
    var found = null;
    Object.keys(I.instances).forEach(function (mapName) {
      if (found) return;
      artboardsOf(I.instances[mapName]).forEach(function (board) {
        walkObjects(board.children, function (n) {
          if (!found && n.assigned_product != null && String(n.assigned_product) === productId && n.title) {
            found = { map: mapName, title: n.title, artboard: board.id };
          }
        });
      });
    });
    return found;
  }

  function openOnMap(productId) {
    var o = mapObjectFor(productId);
    var I = imp();
    if (!o || !I) return false;
    // Jeden lokal świadomie, także z innego piętra - kolejka podświetleń
    // z obecnego piętra przestaje mieć sens.
    hlQueue = [];
    try {
      var anchor = document.querySelector('[d2-ma-map], [data-d2-ma-map]');
      if (anchor && anchor.scrollIntoView) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (typeof I.highlightObject === 'function') I.highlightObject(o.map, o.title);
      if (typeof I.showTooltip === 'function') I.showTooltip(o.map, o.title);
    } catch (e) {
      _log('open on map failed', e);
      return false;
    }
    return true;
  }

  // highlightObject przełącza mapę na piętro obiektu, a obiekt albo grupa spoza
  // piętra potrafi zablokować kolejkę imagemappro - podświetlamy więc tylko
  // pojedyncze kształty z piętra, które jest na ekranie, raz na piętro.
  // Seria wywołań bez przerwy gubi kształty: między wywołaniami jedna klatka.
  var highlighted = {};
  var hlQueue = [];
  var hlBusy = false;
  var hlFloor = {};          // piętro na ekranie przy ostatnim podświetleniu, per mapa

  function nextFrame(fn) {
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(fn);
    else setTimeout(fn, 16);
  }

  function currentArtboard(map) {
    return map && map.artboardController && map.artboardController.currentArtboardId;
  }

  function pumpHighlight() {
    if (hlBusy) return;
    var item = hlQueue.shift();
    if (!item) return;
    var I = imp();
    var map = I && I.instances && I.instances[item.map];
    // Blokada przed wywołaniem: highlightObject potrafi synchronicznie zgłosić
    // onFloorChange, a ten wraca tutaj.
    hlBusy = true;
    // Piętro zmieniło się w trakcie kolejki - ten kształt już nie jest na ekranie.
    if (map && currentArtboard(map) === item.artboard) {
      try { I.highlightObject(item.map, item.title); } catch (e) {}
    }
    nextFrame(function () { hlBusy = false; pumpHighlight(); });
  }

  // Zmiana piętra gasi podświetlenia: po powrocie na piętro trzeba je nałożyć
  // znowu. Sam highlightObject też zgłasza onFloorChange (przełącza artboard
  // nawet na tym samym piętrze) - liczy się tylko realna zmiana piętra mapy.
  function floorChanged() {
    var I = imp();
    var moved = false;
    // Mapa, której jeszcze nie podświetlaliśmy (nowy odwiedzający, preferencja
    // powstała w tej wizycie), też się liczy - blokadą jest highlighted[key].
    Object.keys((I && I.instances) || {}).forEach(function (mapName) {
      var map = I.instances[mapName];
      if (hlFloor[mapName] !== undefined && currentArtboard(map) === hlFloor[mapName]) return;
      moved = true;
      delete hlFloor[mapName];
      Object.keys(highlighted).forEach(function (k) { if (k.indexOf(mapName + '|') === 0) delete highlighted[k]; });
      hlQueue = hlQueue.filter(function (q) { return q.map !== mapName; });
    });
    if (moved) highlightProfile();
  }
  function highlightProfile() {
    if (!tracking || _cfg('d2-ma-highlight') === null) return;
    var rooms = prefOf('rooms');
    var I = imp();
    if (rooms == null || !I || !I.instances || typeof I.highlightObject !== 'function') return;
    Object.keys(I.instances).forEach(function (mapName) {
      var map = I.instances[mapName];
      var current = currentArtboard(map);
      var products = (map && Array.isArray(map.products)) ? map.products : [];
      var key = mapName + '|' + current + '|' + rooms;
      if (!current || highlighted[key]) return;
      highlighted[key] = true;
      hlFloor[mapName] = current;
      var byId = {};
      products.forEach(function (p) { byId[String(p.id)] = p; });
      // highlightObject szuka po tytule w całej mapie: tytuł powtórzony na innym
      // piętrze mógłby przełączyć piętro - takie kształty pomijamy.
      // Liczą się tylko pojedyncze kształty - grupa o tym samym tytule nie jest lokalem.
      var titles = {};
      var dupes = 0;
      artboardsOf(map).forEach(function (board) {
        walkObjects(board.children, function (n) {
          if (!n.title || n.type === 'group' || (Array.isArray(n.children) && n.children.length)) return;
          titles[n.title] = (titles[n.title] || 0) + 1;
          if (titles[n.title] === 2) dupes++;
        });
      });
      if (dupes) _log('map "' + mapName + '": ' + dupes + ' shape title(s) repeat across floors - skipped in highlight');
      artboardsOf(map).forEach(function (board) {
        if (board.id !== current) return;
        walkObjects(board.children, function (n) {
          var p = n.assigned_product != null ? byId[String(n.assigned_product)] : null;
          if (!p || !n.title || titles[n.title] > 1 || n.type === 'group' || (Array.isArray(n.children) && n.children.length)) return;
          var u = from2destate(p);
          if (u.rooms === rooms && u.status === 'available') {
            hlQueue.push({ map: mapName, title: n.title, artboard: current });
          }
        });
      });
    });
    pumpHighlight();
  }

  // ---------------------------------------------------------------------------
  // Źródła zdarzeń
  // ---------------------------------------------------------------------------

  function onDataLayer(entry) {
    if (!entry || typeof entry !== 'object') return;
    if (isGtagCommand(entry)) { onConsentCommand(entry); return; }
    if (typeof entry.event !== 'string') return;
    // Baner z szablonu GTM zmienia zgodę bez komendy gtag - widać ją dopiero
    // w stanie tagu Google, więc sprawdzamy go przy każdym zdarzeniu. Komenda
    // update z dataLayer ma pierwszeństwo, a stan tagu może za nią nie nadążać.
    if (!gtagConsent.update) {
      var tag = googleTagConsent();
      if (blocked && tag === 'granted') consentChanged(true);
      else if ((tracking || opening) && tag === 'denied') consentChanged(false);
    }
    var ev = entry.event;
    if (ev === EVENT_3DE_VIEW) {
      var unit = from3destate(entry);
      if (unit) intake({ type: 'view', unit: unit });
    } else if (ev === EVENT_LEAD || ev === EVENT_3DE_LEAD) {
      intake({ type: 'lead' });
    }
  }

  function hookDataLayer() {
    var dl = window.dataLayer = window.dataLayer || [];
    if (dl._d2maHooked) return;
    dl._d2maHooked = true;
    for (var i = 0; i < dl.length; i++) {
      try { onDataLayer(dl[i]); } catch (e) {}
    }
    var original = dl.push;
    dl.push = function () {
      var r = original.apply(dl, arguments);
      for (var j = 0; j < arguments.length; j++) {
        try { onDataLayer(arguments[j]); } catch (e) { _log('dataLayer entry failed', e); }
      }
      return r;
    };
  }

  var mapHooked = false;
  function hookMap() {
    function attach() {
      var api = mapApi();
      if (mapHooked || !api || typeof api.onProductClick !== 'function') return mapHooked;
      mapHooked = true;
      api.onProductClick(function (product, meta) {
        if (meta && meta.mapName) lastMapName = String(meta.mapName);
        var unit = from2destate(product);
        if (unit) intake({ type: 'view', unit: unit });
      });
      if (typeof api.onMapLoad === 'function') {
        api.onMapLoad(function () {
          openFromUrl();
          highlightProfile();
          var waiting = tracking ? markWaiting : [];
          markWaiting = [];
          waiting.forEach(function (m) { mapMark(m.sc, m.node); });
        });
      }
      if (typeof api.onFloorChange === 'function') api.onFloorChange(floorChanged);
      return true;
    }
    if (attach()) return;
    if (document.addEventListener) document.addEventListener('2destateLoaded', attach);
    var tries = 0;
    var timer = setInterval(function () {
      if (attach() || ++tries > 60) clearInterval(timer);
    }, 500);
  }

  function param(name) {
    try {
      return new URLSearchParams((window.location && window.location.search) || '').get(name);
    } catch (e) {
      return null;
    }
  }

  // Link z popupu (?d2-unit=) otwiera lokal na mapie, gdy ta jest gotowa.
  var openedFromUrl = false;
  function openFromUrl() {
    var id = param('d2-unit');
    if (!id || openedFromUrl) return;
    if (openOnMap(id)) openedFromUrl = true;
  }

  // Wejście deep linkiem do 3D Estate nie wysyła unit-open (§13.1).
  function deepLinkView() {
    var id = param('sm-unit');
    if (!id) return;
    intake({ type: 'view', unit: {
      unitId: id, name: null, rooms: null, floor: null, area: null, price: null, pricePerSqm: null,
      building: null, status: null, isPromo: null, url: smUnitLink(id),
      image: null, promoText: null, source: '3destate', partial: true
    } });
  }

  // ---------------------------------------------------------------------------
  // Sygnały z §13.8: wyjście, zaangażowanie, porzucony formularz. Nasłuch
  // tylko wtedy, gdy koperta ma taki wyzwalacz, i dopiero po zgodzie.
  // ---------------------------------------------------------------------------

  function usesTrigger(ev) {
    return !!envelope && envelope.scenarios.some(function (sc) {
      return sc.triggers.some(function (n) { return n.when.event === ev; });
    });
  }

  function readUtm() {
    var u = {};
    var any = false;
    ['source', 'medium', 'campaign'].forEach(function (k) {
      var v = param('utm_' + k);
      if (v) { u[k] = String(v).slice(0, 100); any = true; }
    });
    return any ? u : null;
  }

  // Każda podana lista musi pasować (I), w liście wystarczy jedna wartość (LUB).
  function utmMatches(f) {
    if (!f || typeof f !== 'object') return true;
    var u = (state && state.utm) || {};
    return ['source', 'medium', 'campaign'].every(function (k) {
      var list = f[k];
      if (!Array.isArray(list) || !list.length) return true;
      var v = u[k] == null ? null : String(u[k]).toLowerCase();
      return v != null && list.some(function (x) { return String(x).toLowerCase() === v; });
    });
  }

  function engagementMet(w, seconds, scrollPct) {
    return seconds >= (num(w.minSeconds) || 0) && scrollPct >= (num(w.minScrollPct) || 0) && utmMatches(w.utm);
  }

  var exitHooked = false;
  function hookExitIntent() {
    if (exitHooked || !usesTrigger('exit_intent') || !document.addEventListener) return;
    // Ekrany dotykowe nie dają wiarygodnego sygnału wyjścia (§13.8.2).
    try { if (window.matchMedia && window.matchMedia('(hover: none)').matches) return; } catch (e) {}
    exitHooked = true;
    document.addEventListener('mouseout', function (e) {
      if (!e || e.relatedTarget || e.toElement || !(e.clientY <= 0)) return;
      intake({ type: 'exit_intent' });
    });
  }

  // Zaangażowanie na tej odsłonie: aktywny czas (karta widoczna) i największe
  // przewinięcie. Bez odpytywania - jeden timer do najbliższego progu.
  var eng = null;
  var engFired = {};         // wyzwalacz engagement, który odpalił na tej odsłonie

  function scrollPct() {
    var de = document.documentElement || {};
    var h = Math.max(de.scrollHeight || 0, (document.body && document.body.scrollHeight) || 0);
    var vh = window.innerHeight || de.clientHeight || 0;
    if (!h || h <= vh) return 100;
    var y = window.pageYOffset || de.scrollTop || 0;
    return Math.min(100, Math.max(0, Math.round(y / (h - vh) * 100)));
  }

  function activeMs() {
    return eng.active + (eng.since != null ? Date.now() - eng.since : 0);
  }

  function engCheck() {
    if (!eng || !envelope || !tracking) return;
    if (eng.timer) { clearTimeout(eng.timer); eng.timer = null; }
    var ms = activeMs();
    var seconds = Math.floor(ms / 1000);
    var hit = false;
    var wait = null;
    envelope.scenarios.forEach(function (sc) {
      sc.triggers.forEach(function (n) {
        var key = sc.id + '/' + n.id;
        if (n.when.event !== 'engagement' || eng.signalled[key]) return;
        if (engagementMet(n.when, seconds, eng.scroll)) { eng.signalled[key] = true; hit = true; return; }
        var left = (num(n.when.minSeconds) || 0) * 1000 - ms;
        if (left > 0 && eng.since != null && (wait === null || left < wait)) wait = left;
      });
    });
    if (wait !== null) eng.timer = setTimeout(engCheck, wait + 20);
    if (hit) intake({ type: 'engagement', data: { seconds: seconds, scrollPct: eng.scroll } });
  }

  function hookEngagement() {
    if (eng || !usesTrigger('engagement') || !document.addEventListener) return;
    eng = { active: 0, since: document.visibilityState === 'hidden' ? null : Date.now(), scroll: scrollPct(),
      timer: null, signalled: {} };
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        if (eng.since != null) { eng.active += Date.now() - eng.since; eng.since = null; }
      } else if (eng.since == null) {
        eng.since = Date.now();
      }
      engCheck();
    });
    window.addEventListener('scroll', function () {
      var p = scrollPct();
      if (p > eng.scroll) { eng.scroll = p; engCheck(); }
    }, { passive: true });
    engCheck();
  }

  // Porzucony formularz: fokus w polu, potem brak wysłania i bezczynność albo
  // wyjście ze strony. Bez wartości i nazw pól - tylko id formularza i liczba pól.
  var forms = [];
  var formsHooked = false;

  function idleOf(w) {
    var n = num(w.idleSeconds);
    return n == null ? 60 : Math.min(Math.max(n, 10), 600);
  }

  function formListed(w, formId) {
    var ids = Array.isArray(w.formIds) ? w.formIds.map(String) : [];
    return !ids.length || (formId != null && ids.indexOf(formId) >= 0);
  }

  function formKeyOf(form) {
    return form.getAttribute('id') || form.getAttribute('data-name') || form.getAttribute('name') || null;
  }

  function formEntry(target) {
    var t = target;
    if (!t || !t.tagName || !/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return null;
    var type = String(t.getAttribute('type') || '').toLowerCase();
    if (type === 'hidden' || type === 'submit' || type === 'button') return null;
    var form = t.closest ? t.closest('form') : null;
    if (!form || form.closest('[d2-ma-ignore], [data-d2-ma-ignore]')) return null;
    for (var i = 0; i < forms.length; i++) if (forms[i].form === form) return forms[i];
    var ent = { form: form, id: formKeyOf(form), fields: [], timers: [], submitted: false };
    forms.push(ent);
    return ent;
  }

  function abandon(ent, idle, exit) {
    if (ent.submitted || !ent.fields.length) return;
    intake({ type: 'form_abandon', data: { formId: ent.id, fields: ent.fields.length, idle: idle, exit: exit } });
  }

  function armForm(ent) {
    ent.timers.forEach(clearTimeout);
    ent.timers = [];
    var idles = [];
    envelope.scenarios.forEach(function (sc) {
      sc.triggers.forEach(function (n) {
        if (n.when.event !== 'form_abandon' || !formListed(n.when, ent.id)) return;
        var s = idleOf(n.when);
        if (idles.indexOf(s) < 0) idles.push(s);
      });
    });
    idles.forEach(function (s) {
      ent.timers.push(setTimeout(function () { abandon(ent, s, false); }, s * 1000));
    });
  }

  function onFormActivity(e) {
    if (!tracking || !envelope) return;
    var ent = formEntry(e && e.target);
    if (!ent || ent.submitted) return;
    if (ent.fields.indexOf(e.target) < 0) ent.fields.push(e.target);
    armForm(ent);
  }

  function hookForms() {
    if (formsHooked || !usesTrigger('form_abandon') || !document.addEventListener) return;
    formsHooked = true;
    ['focusin', 'input', 'change'].forEach(function (n) { document.addEventListener(n, onFormActivity, true); });
    document.addEventListener('submit', function (e) {
      for (var i = 0; i < forms.length; i++) {
        if (e && forms[i].form === e.target) { forms[i].submitted = true; forms[i].timers.forEach(clearTimeout); }
      }
    }, true);
    if (window.addEventListener) window.addEventListener('pagehide', formsOnExit);
  }

  // Przy wyjściu ze strony tylko fakt w d2ma - akcje gałęzi idą przy następnej
  // odsłonie (jak odłożone, ważne 24 h). Żadnego webhooka ani dataLayer teraz.
  function formsOnExit() {
    if (!tracking || !state) return;
    var added = false;
    forms.forEach(function (ent) {
      if (ent.submitted || !ent.fields.length || ent.exitSaved) return;
      ent.exitSaved = true;
      state.formExits = state.formExits || [];
      state.formExits.push({ formId: ent.id, name: ent.form.getAttribute('data-name') || null,
        fields: ent.fields.length, t: now(), created: Date.now(), visit: state.visits });
      added = true;
    });
    if (added) save();
  }

  // Zapisane wyjścia z formularza z poprzedniej odsłony.
  function replayFormExits() {
    var list = state.formExits || [];
    if (!list.length) return;
    state.formExits = [];
    list.forEach(function (x) {
      if (Date.now() - x.created > PENDING_TTL_MS) { _log('form exit older than 24 h dropped → ' + x.formId); return; }
      dispatch({ type: 'form_abandon', t: now(), data: { formId: x.formId, fields: x.fields, exit: true, visit: x.visit } });
    });
  }

  function resetSignals() {
    forms.forEach(function (ent) { ent.timers.forEach(clearTimeout); });
    forms = [];
    engFired = {};
    if (eng) {
      if (eng.timer) { clearTimeout(eng.timer); eng.timer = null; }
      eng.signalled = {};
    }
  }

  function hookSignals() {
    hookExitIntent();
    hookEngagement();
    hookForms();
  }

  // ---------------------------------------------------------------------------
  // Elementy strony: „co o Tobie wie strona", wyczyść, symuluj powrót
  // ---------------------------------------------------------------------------

  function profileValue(key) {
    if (!state) return null;
    var last = lastUnit();
    switch (key) {
      case 'visits': return String(state.visits);
      case 'views': return String(views.length);
      case 'lead': return state.lead ? 'tak' : 'nie';
      case 'pref.rooms': return prefOf('rooms') == null ? null : String(prefOf('rooms'));
      case 'pref.floor': return prefOf('floor') == null ? null : String(prefOf('floor'));
      case 'segment': return state.lastSegment;
      case 'visitorId': return state.visitorId;
      default:
        if (key && key.indexOf('last.') === 0) return fieldValue(key.slice(5), last);
        return null;
    }
  }

  var historyTemplates = [];
  function render() {
    if (!document.querySelectorAll) return;
    var els = document.querySelectorAll('[d2-ma-profile], [data-d2-ma-profile]');
    for (var i = 0; i < els.length; i++) {
      var v = profileValue(_attr(els[i], 'd2-ma-profile'));
      els[i].textContent = v == null ? '—' : v;
    }
    var lists = document.querySelectorAll('[d2-ma-history], [data-d2-ma-history]');
    for (var j = 0; j < lists.length; j++) renderHistory(lists[j]);
  }

  function renderHistory(list) {
    var entry = null;
    for (var k = 0; k < historyTemplates.length; k++) if (historyTemplates[k].list === list) entry = historyTemplates[k];
    if (!entry) {
      var tpl = list.querySelector('[d2-ma-history-item], [data-d2-ma-history-item]');
      if (tpl && tpl.parentNode) tpl.parentNode.removeChild(tpl);
      entry = { list: list, tpl: tpl };
      historyTemplates.push(entry);
    }
    while (list.firstChild) list.removeChild(list.firstChild);
    var limit = num(_attr(list, 'd2-ma-history-limit')) || 20;
    var rows = views.slice(-limit).reverse();
    rows.forEach(function (v) {
      var when = '';
      try { when = new Date(v.ts).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) {}
      if (entry.tpl) {
        var row = entry.tpl.cloneNode(true);
        fill(row, v.unit);
        var times = row.querySelectorAll('[d2-ma-field="time"], [data-d2-ma-field="time"]');
        for (var t = 0; t < times.length; t++) { times[t].textContent = when; times[t].style.display = ''; }
        list.appendChild(row);
      } else {
        var li = document.createElement(list.tagName === 'UL' || list.tagName === 'OL' ? 'li' : 'div');
        var parts = [v.unit.name || v.unit.unitId, fieldValue('summary', v.unit), fieldValue('price', v.unit), when];
        li.textContent = parts.filter(Boolean).join(' · ');
        list.appendChild(li);
      }
    });
  }

  function bindUi() {
    if (!document.addEventListener) return;
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target : null;
      if (!t) return;
      if (t.closest('[d2-ma-clear], [data-d2-ma-clear]')) { e.preventDefault(); api.clear(); return; }
      if (t.closest('[d2-ma-simulate-return], [data-d2-ma-simulate-return]')) { e.preventDefault(); api.simulateReturn(); }
    });
    var lastTouch = 0;
    function activity() {
      if (!tracking) return;
      var t = Date.now();
      if (t - lastTouch < TOUCH_THROTTLE_MS) return;
      lastTouch = t;
      var visit = touch();
      if (visit) { dispatch(visit); runDue(); }
      afterChange();
    }
    ['click', 'keydown', 'scroll', 'touchstart'].forEach(function (n) {
      document.addEventListener(n, activity, { passive: true });
    });
  }

  // ---------------------------------------------------------------------------
  // Zgody (§13.2): przy consentRequired nic nie zapisujemy bez zgody
  // ---------------------------------------------------------------------------

  function consentRequired(env) {
    var a = _cfg('d2-ma-consent-required');
    if (a === '' || a === 'true') return true;
    if (env && env.storage && typeof env.storage.consentRequired === 'boolean') return env.storage.consentRequired;
    return a !== 'false';
  }

  function consentCategory() {
    return _cfg('d2-ma-consent') || DEFAULT_CONSENT;
  }

  // gtag('consent', 'default'|'update', {...}) wkłada do dataLayer obiekt
  // arguments: [0] 'consent', [1] rodzaj, [2] stan kategorii. Zwykłej tablicy
  // ['consent', …] tag Google nie wykonuje, więc i my jej nie liczymy.
  function isGtagCommand(entry) {
    return Object.prototype.toString.call(entry) === '[object Arguments]' && entry[0] === 'consent';
  }

  function onConsentCommand(args) {
    var kind = args[1], st = args[2];
    if ((kind !== 'default' && kind !== 'update') || !st || typeof st !== 'object') return;
    var cat = consentCategory();
    var v = st[cat];
    if (v !== 'granted' && v !== 'denied') return;
    if (kind === 'update') {
      gtagConsent.update = v;
      consentChanged(v === 'granted');
      return;
    }
    // default z region dotyczy tylko tamtych krajów; nie wiemy, gdzie jest
    // odwiedzający, więc liczy się wyłącznie jako odmowa.
    if (st.region != null) {
      if (v === 'denied') gtagConsent.regionDenied = true;
      return;
    }
    gtagConsent['default'] = v;
    if (v === 'granted' && blocked && hasConsent()) consentChanged(true);
  }

  // Stan zgody tagu Google (gtag.js / GTM), także ustawiony szablonem CMP.
  function googleTagConsent() {
    try {
      var e = window.google_tag_data.ics.entries[consentCategory()];
      if (!e) return null;
      var v = e.update !== undefined ? e.update : e['default'];
      return v === true ? 'granted' : v === false ? 'denied' : null;
    } catch (x) { return null; }
  }

  // Kolejność źródeł Consent Mode: update z dataLayer rozstrzyga, potem stan
  // tagu Google (liczy region), potem default z region (tylko jako odmowa),
  // potem default bez region. Gdy żadne nie zna kategorii - moduł google biblioteki
  // albo jego zapis w localStorage.
  function hasConsent() {
    if (gtagConsent.update) return gtagConsent.update === 'granted';
    var tag = googleTagConsent();
    if (tag) return tag === 'granted';
    // Regionalna odmowa przed ogólnym default: bez stanu tagu Google (wolny
    // gtag.js, adblock) nie wiemy, czy odwiedzający nie jest w tamtym regionie.
    if (gtagConsent.regionDenied) return false;
    if (gtagConsent['default']) return gtagConsent['default'] === 'granted';
    var c = null;
    try {
      if (window.digi2.modules && window.digi2.modules.check && window.digi2.modules.check('google')) {
        c = window.digi2.google.consent.get();
      } else {
        c = JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY) || 'null');
      }
    } catch (e) { c = null; }
    return !!(c && c[consentCategory()] === 'granted');
  }

  function consentChanged(granted) {
    if (granted) revoked = false;
    if (granted && blocked) { blocked = false; openStore(); }
    if (!granted && consentRequired(envelope)) {
      if (tracking) wipe('consent withdrawn');
      else if (opening) revoked = true;
    }
  }

  // Zgoda wymagana, a jej nie ma: przestajemy i kasujemy to, co było zebrane
  // (wycofana zgoda, koperta przełączona na consentRequired, baza z czasów,
  // gdy zgoda nie była wymagana).
  function wipe(reason) {
    _log('no consent — d2ma deleted (' + reason + ')');
    tracking = false;
    blocked = true;
    views = [];
    state = null;
    buffer = [];
    if (dueTimer) { clearTimeout(dueTimer); dueTimer = null; }
    markWaiting = [];
    restoreSlots();
    resetSignals();
    var s = store || window.digi2._maStore || idbStore() || memoryStore();
    _queue(function () { return s.clear(); });
    render();
    _emit('ma:change', { cleared: true, tracking: false, reason: reason });
  }

  var consentHooked = false;
  function waitForConsent() {
    if (consentHooked || typeof window.digi2.on !== 'function') return;
    consentHooked = true;
    window.digi2.on('consent:updated', function (s) {
      consentChanged(!!(s && s[consentCategory()] === 'granted'));
    });
  }

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------

  function fetchEnvelope(url) {
    if (!url || typeof fetch !== 'function') return Promise.resolve(null);
    return timeoutFetch(url, { credentials: 'omit' }, FETCH_TIMEOUT_MS).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(null, function (e) {
      // Reguła 10: bez koperty strona działa jak bez MA, historia zapisuje się dalej.
      _log('envelope unavailable → ' + url, e);
      return null;
    });
  }

  function decide(env) {
    if (consentRequired(env) && !hasConsent()) {
      wipe('consent required');
      waitForConsent();
      _log('waiting for consent → ' + consentCategory());
      _emit('ma:ready', { tracking: false });
      return Promise.resolve();
    }
    waitForConsent();
    return openStore();
  }

  var opening = null;
  function openStore() {
    if (tracking) return Promise.resolve();
    if (opening) return opening;
    revoked = false;
    store = window.digi2._maStore || idbStore() || memoryStore();
    opening = store.load().then(null, function (e) {
      _log('IndexedDB unavailable, profile kept in memory', e);
      store = memoryStore();
      return store.load();
    }).then(function (data) {
      if (revoked) {
        // Odmowa przyszła, gdy baza się otwierała.
        opening = null;
        revoked = false;
        wipe('consent withdrawn while opening');
        _emit('ma:ready', { tracking: false });
        return;
      }
      views = (data.views || []).slice().sort(function (a, b) { return a.ts - b.ts; });
      state = data.state || freshState();
      if (!state.scenarios) state.scenarios = {};
      if (!state.pending) state.pending = [];
      tracking = true;
      blocked = false;
      prune();
      applyEnvelope(envelope);
      var visit = touch();
      var crm = crmEvent(true);
      if (crm) dispatch(crm);
      if (visit) dispatch(visit);
      var queued = buffer;
      var required = consentRequired(envelope);
      buffer = [];
      queued.forEach(function (q) {
        if (required && !q.consent) return;
        handle(q.evt, q.real + (state.shift || 0));
      });
      // Po touch(): UTM wizyty już jest w stanie, gdy wyzwalacz „z kampanii" sprawdza go od razu.
      hookSignals();
      replayFormExits();
      runDue();
      afterChange();
      highlightProfile();
      opening = null;
      _emit('ma:ready', { tracking: true, store: store.kind });
    }, function (e) {
      opening = null;
      throw e;
    });
    return opening;
  }

  function prune() {
    var days = envelope && num(envelope.storage.retentionDays);
    if (!days || days <= 0) days = DEFAULT_RETENTION_DAYS;
    var limit = now() - days * DAY_MS;
    // Retencja dotyczy też rekordu state: profil nieodwiedzany dłużej niż
    // retencja zaczyna się od nowa (nowy visitorId), a stare kroki ścieżek
    // i wpisy częstotliwości znikają.
    if (state.lastSeen != null && state.lastSeen < limit) {
      _log('profile older than retention — starting over');
      state = freshState();
    }
    Object.keys(state.scenarios).forEach(function (id) {
      var st = state.scenarios[id];
      Object.keys(st.nodes || {}).forEach(function (n) { if (st.nodes[n].at < limit) delete st.nodes[n]; });
      Object.keys(st.freq || {}).forEach(function (n) { if (st.freq[n].at != null && st.freq[n].at < limit) delete st.freq[n]; });
    });
    var old = views.filter(function (v) { return v.ts < limit; }).map(function (v) { return v.id; });
    if (!old.length) return;
    views = views.filter(function (v) { return v.ts >= limit; });
    _queue(function () { return store.deleteViews(old); });
  }

  function boot() {
    if (booted) return;
    booted = true;
    hookDataLayer();
    hookMap();
    bindUi();
    deepLinkView();
    pageUtm = readUtm();
    envelopeUrl = window.digi2._maEndpoint || _cfg('d2-ma') || null;
    fetchEnvelope(envelopeUrl).then(function (raw) {
      envelope = compile(raw);
      return decide(envelope);
    })['catch'](function (e) { _warn('start failed', e); });
    var every = num(_cfg('d2-ma-refresh'));
    if (every && every >= 5) setInterval(function () { api.reload(); }, every * 1000);
  }

  // Nowa koperta w trakcie wizyty: nowe rewizje, nowy wynik telefonu.
  function useEnvelope(raw) {
    var env = compile(raw);
    if (!env) return Promise.resolve(false);
    if (!tracking) {
      // Magazyn się otwiera albo czekamy na zgodę - openStore() weźmie tę kopertę.
      envelope = env;
      if (blocked || !booted || opening) return Promise.resolve(true);
      return decide(env).then(function () { return true; });
    }
    if (consentRequired(env) && !hasConsent()) {
      envelope = env;
      wipe('envelope now requires consent');
      waitForConsent();
      return Promise.resolve(true);
    }
    var before = crmSeq;
    applyEnvelope(env);
    hookSignals();
    var crm = crmEvent();
    if (crm && crm.seq !== before) dispatch(crm);
    runDue();
    afterChange();
    return Promise.resolve(true);
  }

  var api = {
    load: function (src) {
      if (src && typeof src === 'object') return useEnvelope(src);
      envelopeUrl = src || envelopeUrl;
      return fetchEnvelope(envelopeUrl).then(function (raw) { return raw ? useEnvelope(raw) : false; });
    },
    reload: function () {
      if (!envelopeUrl) return Promise.resolve(false);
      return api.load(envelopeUrl);
    },
    track: function (unit) {
      if (!unit || unit.unitId == null) return;
      var u = {
        unitId: String(unit.unitId), name: str(unit.name), rooms: num(unit.rooms), floor: num(unit.floor),
        area: num(unit.area), price: num(unit.price), pricePerSqm: num(unit.pricePerSqm),
        building: str(unit.building), status: unit.status == null ? null : statusOf(unit.status),
        isPromo: !!unit.isPromo, url: (unit.url ? cleanUrl(String(unit.url)) : null) || pageBase(),
        image: str(unit.image), promoText: str(unit.promoText), source: str(unit.source) || 'page'
      };
      intake({ type: 'view', unit: u });
    },
    lead: function () { intake({ type: 'lead' }); },
    profile: function () {
      if (!state) return null;
      return {
        visitorId: state.visitorId, visits: state.visits, lead: !!state.lead, views: views.length,
        pref: { rooms: prefOf('rooms'), floor: prefOf('floor') }, lastUnit: _clone(lastUnit()),
        segment: state.lastSegment, counters: counters(), tracking: tracking,
        store: store ? store.kind : null, timeScale: timeScale
      };
    },
    history: function () { return _clone(views); },
    simulateReturn: function () {
      if (!tracking) return;
      var maxAfter = 1;
      if (envelope) {
        envelope.scenarios.forEach(function (sc) {
          sc.triggers.forEach(function (n) {
            var a = n.when.event === 'return_visit' ? num(n.when.afterHours) : null;
            if (a != null && a > maxAfter) maxAfter = a;
          });
        });
      }
      state.shift = (state.shift || 0) + Math.max(scaled(VISIT_GAP_MS), scaled(maxAfter * HOUR_MS)) + 1000;
      _log('simulated return, clock moved by ' + Math.round(state.shift / 1000) + ' s in total');
      var visit = touch();
      if (visit) dispatch(visit);
      runDue();
      afterChange();
    },
    clear: function () {
      var wasTracking = tracking;
      views = [];
      highlighted = {};
      markWaiting = [];
      restoreSlots();
      resetSignals();
      if (dueTimer) { clearTimeout(dueTimer); dueTimer = null; }
      var s = store;
      state = wasTracking ? freshState() : null;
      // Nowy profil zaczyna od zera i do bazy trafia dopiero z następnym zdarzeniem.
      tracking = false;
      return _queue(function () { return s ? s.clear() : null; }).then(function () {
        if (wasTracking) {
          tracking = true;
          if (envelope) envelope.scenarios.forEach(scState);
          var queued = buffer;
          buffer = [];
          queued.forEach(function (q) { handle(q.evt, q.real + (state.shift || 0)); });
        }
        render();
        _emit('ma:change', { cleared: true });
      });
    },
    highlight: function () { highlighted = {}; hlFloor = {}; hlQueue = []; highlightProfile(); },
    _real: true
  };

  window.digi2.ma = api;

  if (document.readyState === 'loading' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
