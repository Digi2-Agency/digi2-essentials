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
 *     [d2-ma-field="name|price|image|rooms|floor|area|pricePerSqm|building|summary"]
 *     [d2-ma-cta]                 open_unit → href of the unit; contact → keeps its href
 *     [d2-ma-close]               Close button
 *   [d2-ma-profile="visits|views|lead|pref.rooms|pref.floor|last.name|last.price|segment|visitorId"]
 *   [d2-ma-history]               List of viewed units, newest first
 *     [d2-ma-history-item]        Optional row template with [d2-ma-field] inside
 *   [d2-ma-clear]                 Button — wipe the d2ma database
 *   [d2-ma-simulate-return]       Button — end the visit as if afterHours had passed
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

  var TRIGGERS = { unit_view: 1, type_view: 1, return_visit: 1, lead: 1, crm_call_result: 1 };
  var ACTIONS = { popup: 1, datalayer: 1, webhook: 1 };
  var DL_EVENTS = { ma_segment: 1, ma_segment_exit: 1 };
  var CHANNELS = { email: 1, sms: 1, ai_call: 1 };

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
  var gtagConsent = {};      // ostatnie komendy gtag('consent', …) z dataLayer

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
      image: null, source: '3destate'
    };
  }

  function unitLink(id) {
    return pageBase() + '?d2-unit=' + encodeURIComponent(id);
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
      image: str(p.popup_image || p.marketing_image || p.image), source: '2destate'
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
      if (buffer.length < MAX_BUFFER) buffer.push({ evt: evt, real: Date.now() });
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
    if (String(raw.version) !== CONTRACT_VERSION) {
      _warn('envelope version "' + raw.version + '" is not "' + CONTRACT_VERSION + '" — no scenario runs');
      return env;
    }
    if (env.storage.consentRequired !== true && raw.demoState && typeof raw.demoState === 'object') {
      env.demoState = raw.demoState;
    }
    (Array.isArray(raw.scenarios) ? raw.scenarios : []).forEach(function (s) {
      var sc = compileScenario(s);
      if (sc) env.scenarios.push(sc);
    });
    return env;
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
    if (evt.type === 'lead') return ctx;
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
          seq: evt.seq, result: evt.result, duration: evt.duration }, arm);
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
    var c = { unit: ctx.unit || lastUnit(), segment: ctx.segment || null, t: ctx.t };
    // Reguła 6: pominięta akcja nie kończy gałęzi i nie czeka swojego opóźnienia.
    if (skippedByFrequency(st, node, c.unit)) {
      _log('skipped by frequency → ' + sc.id + '/' + node.id);
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
      var payload = { event: node.event, segment: segment, ma_scenario: sc.id };
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(payload);
      ctx = { unit: ctx.unit, segment: segment, t: ctx.t };
      state.lastSegment = segment;
      recordFrequency(st, node, ctx.unit);
      _emit('ma:action', { scenarioId: sc.id, nodeId: node.id, 'do': 'datalayer', event: node.event, segment: segment });
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

  function sendWebhook(sc, node, ctx) {
    var where = 'scenario "' + sc.id + '": webhook "' + node.id + '"';
    if (node.testOnly !== true) {
      _warn(where + ' has no testOnly: true — not sent (contract v0 sends to agency test contacts only)');
      return false;
    }
    var ch = envelope.channels[node.channel];
    var url = ch && typeof ch.webhook === 'string' ? ch.webhook : '';
    if (!url || !webhookUrlAllowed(url)) {
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

  function merge(stored, fresh) {
    var out = _clone(stored);
    Object.keys(fresh).forEach(function (k) {
      if (k === 'url' || k === 'source') return;
      if (fresh[k] != null) out[k] = fresh[k];
    });
    return out;
  }

  // Świeży status i cena przed popupem: z mapy na stronie, inaczej z Products
  // API 2destate. Zwraca null, gdy lokalu nie wolno już promować.
  function freshUnit(unit) {
    var p = mapProduct(unit.unitId);
    if (p) return Promise.resolve(merge(unit, from2destate(p)));
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
      return merge(unit, from2destate(row));
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
    // Piętro zmieniło się w trakcie kolejki - ten kształt już nie jest na ekranie.
    if (map && currentArtboard(map) === item.artboard) {
      try { I.highlightObject(item.map, item.title); } catch (e) {}
    }
    hlBusy = true;
    nextFrame(function () { hlBusy = false; pumpHighlight(); });
  }

  // Zmiana piętra gasi podświetlenia: po powrocie na piętro trzeba je nałożyć znowu.
  function floorChanged() {
    highlighted = {};
    hlQueue = [];
    highlightProfile();
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
      var byId = {};
      products.forEach(function (p) { byId[String(p.id)] = p; });
      artboardsOf(map).forEach(function (board) {
        if (board.id !== current) return;
        walkObjects(board.children, function (n) {
          var p = n.assigned_product != null ? byId[String(n.assigned_product)] : null;
          if (!p || !n.title || n.type === 'group' || (Array.isArray(n.children) && n.children.length)) return;
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
    if (entry[0] === 'consent') { onConsentCommand(entry); return; }
    if (typeof entry.event !== 'string') return;
    // Baner z szablonu GTM zmienia zgodę bez komendy gtag - widać ją dopiero
    // w stanie tagu Google, więc sprawdzamy go przy każdym zdarzeniu.
    if (blocked && googleTagConsent() === 'granted') consentChanged(true);
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
      api.onProductClick(function (product) {
        var unit = from2destate(product);
        if (unit) intake({ type: 'view', unit: unit });
      });
      if (typeof api.onMapLoad === 'function') api.onMapLoad(function () { openFromUrl(); highlightProfile(); });
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
      image: null, source: '3destate', partial: true
    } });
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
  // arguments: [0] 'consent', [1] rodzaj, [2] stan kategorii.
  function onConsentCommand(args) {
    var kind = args[1], st = args[2];
    if ((kind !== 'default' && kind !== 'update') || !st || typeof st !== 'object') return;
    var cat = consentCategory();
    if (st[cat] !== 'granted' && st[cat] !== 'denied') return;
    // Domyślna wartość nie nadpisuje decyzji, którą baner już zgłosił.
    if (kind === 'default' && gtagConsent.update) return;
    gtagConsent[kind] = st[cat];
    if (kind === 'update') consentChanged(st[cat] === 'granted');
    else if (st[cat] === 'granted' && blocked) consentChanged(true);
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

  // Źródło Consent Mode na stronie: dataLayer i tag Google, a gdy ich brak -
  // moduł google biblioteki albo jego zapis w localStorage.
  function hasConsent() {
    var dl = gtagConsent.update || gtagConsent['default'] || null;
    var tag = googleTagConsent();
    if (dl || tag) return dl === 'granted' || tag === 'granted';
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
    if (granted && blocked) { blocked = false; openStore(); }
    if (!granted && tracking && consentRequired(envelope)) wipe('consent withdrawn');
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
    var s = store || window.digi2._maStore || idbStore() || memoryStore();
    _queue(function () { return s.clear(); });
    render();
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
    store = window.digi2._maStore || idbStore() || memoryStore();
    opening = store.load().then(null, function (e) {
      _log('IndexedDB unavailable, profile kept in memory', e);
      store = memoryStore();
      return store.load();
    }).then(function (data) {
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
      buffer = [];
      queued.forEach(function (q) { handle(q.evt, q.real + (state.shift || 0)); });
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
        image: str(unit.image), source: str(unit.source) || 'page'
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
    highlight: function () { highlighted = {}; hlQueue = []; highlightProfile(); },
    _real: true
  };

  window.digi2.ma = api;

  if (document.readyState === 'loading' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
