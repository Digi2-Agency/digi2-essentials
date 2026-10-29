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
 *                                 (ma.23) only https://digi2.app/… or https://api.2destate.com/…;
 *                                 anything else is not fetched (console.warn), also in load()
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
 *   d2-ma-hot-lead="<api>"        ma.12, demo / test leads (MA-D38 stage 1, D′): visitorId
 *                                 for the 2destate form, return-visit signal POST
 *                                 {api}/public/ma/visit, /revoke on clear / consent withdrawn
 *                                 (whenever the id was handed out). Empty =
 *                                 https://api.2destate.com/api/v1; (ma.23) any other host or
 *                                 not https = no request at all. Pin MA with @v1.9.0-ma.N.
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
 *   form[d2-ma-ignore]            Never counted by form_abandon; gets no lead context
 *   input[d2-ma-visitor-id]       With d2-ma-hot-lead: visitorId on submit (empty without consent)
 *
 * ─── Lead context in forms (ma.16) ──────────────────────────────────────────
 *
 *   On submit of every form (not inside [d2-ma-ignore]) the module writes a
 *   hidden input, overwriting a field of the same name when the page has one:
 *     d2ma_context        Polish text for the sales rep, ≤ 2000 chars
 *   A form with d2-ma-context="json" also gets:
 *     d2ma_context_json   compact JSON ≤ 4 kB: { v:1, visits:[{t,path}],
 *                         units:[{id,name,rooms,floor,area,price,views,last}],
 *                         pref:{rooms,floor}, segments:[], last_unit, lead,
 *                         source:{utm_source,utm_medium,utm_campaign},
 *                         touchpoints:{v:1,items:[…]} }   (ma.33, README „Touchpoints”)
 *   Only with consent (the profile's own gate). Without it d2ma_context is
 *   "brak kontekstu (brak zgody)" and the JSON field is left out. Only this
 *   site's behaviour — never other forms' values, IP, UA or location.
 *   d2ma_consent = "1"        (ma.18) only with consent — the 2destate server stores
 *                         the context only then; without consent it is not added
 *                         and a page's own field of that name is emptied.
 *   d2-ma-context="off" on the loader tag switches it off.
 *   digi2.ma.context() → { text, json } | null; digi2.ma.fillContext(form).
 *
 * ─── 2destate search (ma.17, §13.14) — core 1.7.0 ─────────────────────────────
 *
 *   d2estate.onFilterChange({ mapName, filters, resultCount, resultIds, source })
 *   d2estate.onSortChange({ mapName, sort: { by, dir }, source })
 *   Only source "user" counts; "api" is a script (prefer_filters) and is ignored.
 *   trigger search_filter         when: { rooms?, floor?, minCount? } — the
 *                                 visitor's filter includes that room count / floor
 *   action  prefer_filters        by: rooms | floor | both — d2estate.setFilters with
 *                                 the profile's preference, once a visit, only if the
 *                                 visitor has not touched the filters in this visit
 *   (ma.19) a pending filter change is flushed on form submit (scenario actions
 *   may run then), with the time of the last change; (ma.20) on pagehide only
 *   the fact is stored — no scenario action at exit, no replay on the next page;
 *   (ma.21) GA4 events carry every contract key, a missing value is undefined
 *   (ma.18) filter changes debounced 500 ms before the profile; item_list_sort only
 *   price|area|floor; d2ma_consent="1" in forms with an active profile
 *   action  map_order             also skipped once the visitor picked a sort in
 *                                 this visit (their choice wins until the visit ends)
 *   state   filters               last user filter; pref.rooms / pref.floor fall back
 *                                 to it while no unit has been viewed
 *   popup   promo-filter          built-in, needs no unit: "Szukasz mieszkania
 *                                 2-pokojowego? …" (ma.29: N-pokojowego for any
 *                                 N ≥ 1); skipped without pref.rooms
 *   GA4 (dataLayer, no visitor data; d2-ma-search-events="off" switches off):
 *     view_item_list  { item_list_name: "wyszukiwarka", filters: "rooms=2|3;floor=1;
 *                     area=40-60;price=-700000;status=available;building=B",
 *                     filter_count, matching, total, item_list_sort: "price_asc" }
 *                     on a user filter / sort change, debounced 500 ms
 *     select_item     { item_list_name, item_id, item_name } on a click in the list
 *     view_flat       { flat_id, flat_name, flat_rooms, flat_rooms_group, flat_floor,
 *                     flat_area, flat_type, flat_building, flat_availability,
 *                     flat_price, flat_isPromo, view_source: "wyszukiwarka"|"mapa" }
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
 * ─── Page conditions (ma.5, §13.11.2a) ─────────────────────────────────────
 *
 *   [d2-ma-cond]                  Required marker on every element with conditions
 *                                 (page CSS: [d2-ma-cond]:not([d2-ma-shown]){display:none})
 *   [d2-ma-show-<key>="value"]    Show when it matches; several = AND, | = OR.
 *                                 visits / views "3+/30d" "3" "0..2", views-rooms /
 *                                 views-floor "3:2+" "-1:1+", views-unit "<id>:1+",
 *                                 segment "a|b", lead "true|false", pref-rooms /
 *                                 pref-floor "2|3". Sets d2-ma-shown.
 *   [d2-ma-hide-<key>="value"]    Hide when it matches (beats show). Sets d2-ma-hidden.
 *   [d2-ma-variants] > [d2-ma-variant="name|default"]   First match wins.
 *   ?d2-ma-preview=<name>         Preview a segment / variant, nothing stored
 *   frequency "every_time"        content / map_mark / map_order re-applied each page
 *   action map_order              d2estate.setProductOrder with the profile ranking
 *   content image / video         <img>, YouTube / Vimeo frame (after ad_storage consent; d2-ma-
 *                                 video-consent can only add categories) or <video> for mp4
 *   ma_form_field                 Per-field time and clicks (name only, never values)
 *   templates.popup[]             (ma.7) popup built from a panel template when the page has
 *                                 no [d2-ma-popup] of its own: blocks, layout, token styles
 *
 * ─── Module API ─────────────────────────────────────────────────────────────
 *
 *   digi2.ma.load(urlOrEnvelope)  Read an envelope: an object (a local file for tests), or an
 *                                 https URL on digi2.app / api.2destate.com (ma.23)
 *   digi2.ma.reload()             Re-read the current envelope URL
 *   digi2.ma.track(unit)          Record a unit_view from any other source
 *   digi2.ma.lead()               Mark the visitor as a lead
 *   digi2.ma.visitorId()          With d2-ma-hot-lead: id for the 2destate form, null without consent
 *   digi2.ma.profile()            { visitorId, visits, lead, pref, lastUnit, views, … }
 *   digi2.ma.history()            Viewed units, oldest first
 *   digi2.ma.touchpoints()        ma.33: { v:1, items } — source of every visit; items [] without consent
 *   digi2.ma.parseTouchpoint(h,r) ma.33: one entry, no storage, no consent needed
 *   digi2.ma.simulateReturn()     Same as the [d2-ma-simulate-return] button
 *   digi2.ma.clear()              Delete the whole d2ma database (Promise)
 *   digi2.ma.highlight()          Re-apply the map highlight
 *   digi2.ma.apply()              Re-collect d2-ma-show-/-hide- elements after a DOM change
 *   digi2.ma.allows(el)           May this element show (popups ask it)
 *
 *   digi2.on('ma:ready' | 'ma:view' | 'ma:action' | 'ma:change', fn)
 *     ma:change { cleared: true, tracking: false, reason } — consent denied or
 *     withdrawn (ma.31: unknown consent only waits); the database is wiped
 *     and profile() returns null
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
  // ma.31: pusty d2-ma czeka tyle na pierwsze digi2.ma.load(), potem startuje bez koperty.
  var ENVELOPE_WAIT_MS = 10000;
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
  // ma.23 (§13.3, §13.8.1 pkt 5): jedyne hosty, spod których d2-ma pobiera kopertę.
  var ENVELOPE_HOSTS = { 'digi2.app': 1, 'api.2destate.com': 1 };

  // Adres https z hostem z listy — bez portu, loginu i hasła (nic do obejścia przez „@”).
  function allowedUrl(url, hosts) {
    var m = /^https:\/\/([^\/?#]*)([\/?#]|$)/i.exec(String(url || ''));
    if (!m) return false;
    var host = m[1].toLowerCase();
    if (!host || /[@:\s\\]/.test(host)) return false;
    return Object.prototype.hasOwnProperty.call(hosts, host);
  }

  var TRIGGERS = { unit_view: 1, type_view: 1, return_visit: 1, lead: 1, crm_call_result: 1,
    exit_intent: 1, engagement: 1, form_abandon: 1, search_filter: 1 };
  var ACTIONS = { popup: 1, datalayer: 1, webhook: 1, content: 1, map_mark: 1, map_order: 1, prefer_filters: 1 };
  // Akcje stanu strony: żyją do przeładowania, every_time wolno tylko im (§13.8.3a).
  var STATE_ACTIONS = { content: 1, map_mark: 1, map_order: 1 };
  var DL_EVENTS = { ma_segment: 1, ma_segment_exit: 1, ma_exit_intent: 1, ma_engaged: 1, ma_form_abandon: 1, ma_content: 1 };
  // Parametry zdarzeń dataLayer z wyzwalacza albo akcji na ścieżce (§13.8.3).
  var DL_PARAMS = { ma_engaged: ['seconds', 'scroll_pct'], ma_form_abandon: ['form_id', 'fields_touched'],
    ma_content: ['slot', 'template_id'] };
  var CHANNELS = { email: 1, sms: 1, ai_call: 1 };
  var SCRIPT_VERSION = 33;   // ma.19 = numer tagu (test pilnuje zgodności z CHANGELOG); porównywane z minScript koperty
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
  // ma.31: każda koperta z load() podbija licznik - start nie nadpisuje jej swoją.
  var envelopeSeq = 0;
  var envelopeWait = null;
  var gtagConsent = {};      // komendy gtag('consent', …) z dataLayer: update, default, regionDenied
  var revoked = false;       // odmowa w trakcie otwierania magazynu
  var holding = false;       // ma.31: zgoda nieznana - czekamy, bazy nie ruszamy
  var openedWithConsent = false; // ma.31: magazyn otwarty za zgodą (nie tylko bez wymogu)
  var pageUtm = null;        // utm_source / utm_medium / utm_campaign z adresu tej odsłony
  var pageTouch = null;      // ma.33: wpis touchpoints tej odsłony (bez ts) - parseTouchpoint()
  var pageTouchUsed = false; // ma.33: źródło tej odsłony już rozpatrzone (raz na załadowanie strony)
  var touchVisitPending = false; // ma.33: wizyta zaczęta na tej odsłonie przed zgodą - wpis po zgodzie

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
      // Sam rekord state, bez zakładania bazy, której nie ma (wipe() przy
      // starcie): nowa baza = onupgradeneeded, wtedy przerywamy i wraca null.
      // To samo przy bazie ze starszą DB_VERSION: upgrade przerwany, null -
      // bezpieczniki ma.31 (hold) wtedy nic nie kasują.
      peekState: function () {
        return new Promise(function (resolve) {
          var req;
          try { req = idb.open(DB_NAME, DB_VERSION); } catch (e) { resolve(null); return; }
          var fresh = false;
          req.onupgradeneeded = function () {
            fresh = true;
            try { req.transaction.abort(); } catch (e) {}
          };
          req.onsuccess = function () {
            var db = req.result;
            if (fresh || !db.objectStoreNames.contains('state')) { try { db.close(); } catch (e) {} resolve(null); return; }
            try {
              var r = db.transaction(['state'], 'readonly').objectStore('state').get('main');
              r.onsuccess = function () { try { db.close(); } catch (e) {} resolve(r.result || null); };
              r.onerror = function () { try { db.close(); } catch (e) {} resolve(null); };
            } catch (e) { try { db.close(); } catch (x) {} resolve(null); }
          };
          req.onerror = req.onblocked = function () { resolve(null); };
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
      peekState: function () { return Promise.resolve(_clone(b.state)); },
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
    if (best === null) {
      // Bez obejrzeń (ma.17): preferencja z ostatniego filtra gościa — popup
      // promo-filter i {{pref.roomsLabel}} działają od pierwszego filtra. Obejrzenia zawsze wygrywają.
      var f = state && state.filters;
      if (!views.length && f && Array.isArray(f[key]) && f[key].length) return Number(f[key][0]);
      return null;
    }
    return Number(best);
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

  // Link przycisku z szablonu panelu (§13.9.3): publiczny JSON koperty nie może
  // prowadzić poza stronę w wyglądzie strony klienta - tylko https: na tym samym
  // hoście z portem, bez danych logowania w adresie. Nawet *.2destate.com nie:
  // pod {slug}.booking.2destate.com stoją portale innych klientów. Do 2destate
  // prowadzi open_unit (safeLink, bez zmian).
  function safePageLink(v) {
    var l = window.location || {};
    try {
      var u = new URL(v, l.href);
      if (u.protocol === 'https:' && !u.username && !u.password && l.host && u.host === l.host) return u.href;
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
      // Początki wizyt dla okna czasu w d2-ma-show-visits="3+/30d" (§13.11.2a).
      state.visitLog = (state.visitLog || []).concat([t]).slice(-200);
      // ma.33: każda wizyta to wpis historii źródeł, także bez UTM (direct, polecenie).
      addTouchpoint(t, true);
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
      if (buffer.length < MAX_BUFFER) buffer.push({ evt: evt, real: evt.realAt != null ? evt.realAt : Date.now(), consent: hasConsent() });
      return;
    }
    // realAt: chwila zdarzenia, gdy dociera później (filtr po debounce, ma.19).
    handle(evt, evt.realAt != null ? evt.realAt + ((state && state.shift) || 0) : null);
    afterChange();
  }

  // Fakt filtra w stanie (bez scenariuszy) — wspólne dla zdarzenia i dla wyjścia ze strony.
  function storeFilter(f, t) {
    state.filters = Object.assign({}, f, { ts: t, visit: state.visits });
    state.filterLog = (state.filterLog || []).concat([{ t: t, rooms: f.rooms || null, floor: f.floor || null }]).slice(-50);
  }

  function handle(evt, at, pass) {
    // Jedna interakcja = jeden pass: początek wizyty (return_visit), samo
    // zdarzenie i dojrzałe odłożone akcje dzielą strażnika „jeden popup naraz".
    // Osobne passy pokazywały dwa popupy na jedno kliknięcie (ma.27).
    pass = pass || { popup: false };
    var visit = touch();
    if (visit) dispatch(visit, pass);
    var t = at != null ? at : now();
    // Zdarzenie wizyty jest po jej początku (reguła 1) - także obejrzenie,
    // które ją otworzyło, i deep link z bufora sprzed otwarcia magazynu.
    if (state.visitStart != null && t <= state.visitStart) t = state.visitStart + 1;
    if (evt.type === 'view') {
      var v = recordView(_clone(evt.unit), t);
      if (!v) return;
      _emit('ma:view', { unit: v.unit });
      sendVisitSignal();
      dispatch({ type: 'unit_view', t: t, unit: v.unit }, pass);
      runDue(pass);
    } else if (evt.type === 'lead') {
      state.lead = true;
      state.leadAt = t;
      state.leadVisit = state.visits;
      bindHotLead();
      dispatch({ type: 'lead', t: t }, pass);
    } else if (evt.type === 'exit_intent') {
      // Raz na wizytę (§13.8.2).
      if (state.exitVisit === state.visits) return;
      state.exitVisit = state.visits;
      dispatch({ type: 'exit_intent', t: t }, pass);
    } else if (evt.type === 'engagement' || evt.type === 'form_abandon') {
      dispatch({ type: evt.type, t: t, data: evt.data }, pass);
    } else if (evt.type === 'search_filter') {
      var f = evt.filter || {};
      storeFilter(f, t);
      dispatch({ type: 'search_filter', t: t, data: { filter: f, results: evt.results } }, pass);
    } else if (evt.type === 'search_sort') {
      state.sortVisit = state.visits;
      state.sort = evt.sort;
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
    env.popupTemplates = popupLibrary(raw.templates);
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
  function fieldsKnown(text) {
    var ok = true;
    text.replace(FIELD_RE, function (m, key) { if (CONTENT_FIELDS.indexOf(key) < 0) ok = false; return m; });
    return ok;
  }

  function contentTextValid(text) {
    return typeof text === 'string' && text.length > 0 && text.length <= 160 && fieldsKnown(text);
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
      // formIds: brak pola = dowolny formularz; pole obecne musi być listą 1–20 napisów
      // (pusta lista albo napis nie znaczą „dowolny" - inaczej łapałyby wszystko).
      if (ev === 'form_abandon' && Object.prototype.hasOwnProperty.call(w, 'formIds') && !(Array.isArray(w.formIds)
        && w.formIds.length >= 1 && w.formIds.length <= 20 && w.formIds.every(function (f) {
          return typeof f === 'string' && f.length >= 1 && f.length <= 80;
        }))) {
        _warn(where + ' — form_abandon formIds must be a list of 1–20 names, skipped');
        return false;
      }
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
        var kinds = [hasText, hasTpl, node.image != null, node.video != null].filter(Boolean).length;
        if (!SLOT_RE.test(String(node.slot || '')) || kinds !== 1) {
          _warn(where + ' — content needs a slot and exactly one of text / templateId / image / video, skipped');
          return false;
        }
        if (node.image != null && !imageValid(node.image)) {
          _warn(where + ' — content image needs an https src on this site or ' + MEDIA_HOSTS.join(', ') + ' and alt ≤ 120, skipped');
          return false;
        }
        if (node.video != null && !videoValid(node.video)) {
          _warn(where + ' — content video is not youtube (11-char id), vimeo (numeric id) or an mp4 on an allowed host, skipped');
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
      if ((node['do'] === 'map_mark' || node['do'] === 'map_order' || node['do'] === 'prefer_filters') && !MAP_BY[node.by]) {
        _warn(where + ' — ' + node['do'] + ' by "' + node.by + '" is not rooms, floor or both, skipped');
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

  // search_filter: filtr gościa zawiera liczbę pokoi / piętro z when (brak klucza = dowolne).
  function filterMatches(when, f) {
    if (!f) return false;
    var r = num(when.rooms);
    var fl = num(when.floor);
    if (r != null && !(Array.isArray(f.rooms) && f.rooms.indexOf(r) >= 0)) return false;
    if (fl != null && !(Array.isArray(f.floor) && f.floor.indexOf(fl) >= 0)) return false;
    return true;
  }

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
    if (evt.type === 'search_filter') {
      var sf = (evt.data && evt.data.filter) || {};
      if (!filterMatches(w, sf)) return null;
      var hits = (state.filterLog || []).filter(function (x) { return x.t > arm.at && filterMatches(w, x); }).length;
      if (hits < minCount(w)) return null;
      ctx.signal = { filter: sf };
      return ctx;
    }
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
      ctx.signal = { form_id: f.formId || null, fields_touched: f.fields == null ? null : f.fields };
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
  // pass: wspólny dla kilku dispatchy tej samej interakcji (handle) - bez niego własny.
  function dispatch(evt, pass) {
    if (!envelope || !tracking) return;
    pass = pass || { popup: false };
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
    if (f === 'every_time') {
      if (STATE_ACTIONS[node['do']]) return { kind: 'every' };
      _warn('node "' + node.id + '" — every_time is only for content, map_mark and map_order, using once_per_visit');
      return { kind: 'visit' };
    }
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
    if (f.kind === 'every') return false;
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
      }, function (replaced) {
        // once_per_unit: oddajemy tylko własny lokal - inny mógł w międzyczasie
        // dopisać swój. Popup zastąpiony nowszym z TEGO SAMEGO węzła nie oddaje
        // reszty (wpis należy już do tamtego); zastąpiony przez inny węzeł albo
        // scenariusz wraca do stanu sprzed decyzji, bo sam się nie pokazał.
        var r = st.freq[node.id];
        if (frequencyOf(node).kind === 'unit') {
          if (r && r.units) r.units = r.units.filter(function (u) { return u !== unitKey(ctx.unit); });
        } else if (replaced !== 'same') {
          if (before) st.freq[node.id] = before; else delete st.freq[node.id];
        }
        save();
      }, sc.id + '/' + node.id);
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
        // Segmenty profilu dla d2-ma-show-segment (§13.11.3): ma_segment dodaje,
        // ma_segment_exit zdejmuje swój. Bez params.segment koperta jest błędna.
        state.segments = state.segments || {};
        if (!segment) _warn('scenario "' + sc.id + '": ' + node.event + ' "' + node.id + '" has no params.segment — profile segments unchanged');
        else if (node.event === 'ma_segment') state.segments[segment] = now();
        else delete state.segments[segment];
      }
      recordFrequency(st, node, ctx.unit);
      _emit('ma:action', { scenarioId: sc.id, nodeId: node.id, 'do': 'datalayer', event: node.event, segment: segment });
    } else if (kind === 'content') {
      var text = node.image || node.video ? '' : contentText(node, ctx.unit);
      var n = text == null ? 0 : applyContent(node, text);
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
    } else if (kind === 'map_mark' || kind === 'map_order') {
      recordFrequency(st, node, ctx.unit);
      mapMark(sc, node);
    } else if (kind === 'prefer_filters') {
      // Gość już filtrował w tej wizycie: jego wybór zostaje, a akcja nie zużywa
      // swojej częstotliwości (spróbuje przy następnej wizycie).
      if (!preferFilters(sc, node, true)) return;
      recordFrequency(st, node, ctx.unit);
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
  function runDue(pass) {
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
    pass = pass || { popup: false };
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

  // „1-pokojowego", „2-pokojowego", „5-pokojowego" (ma.29) — przymiotnik w dopełniaczu
  // do zdania popupu promo-filter. Tylko do tekstu wbudowanego, nie pole koperty.
  function roomsAdj(n) {
    if (n == null || !isFinite(n) || n < 1) return null;
    return n + '-pokojowego';
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
    slotOriginals.forEach(function (o) {
      if (o.kids) {
        while (o.el.firstChild) o.el.removeChild(o.el.firstChild);
        o.kids.forEach(function (k) { o.el.appendChild(k); });
      } else if (o.img) {
        ['src', 'alt'].forEach(function (a) {
          if (o.img[a] == null) o.el.removeAttribute(a); else o.el.setAttribute(a, o.img[a]);
        });
      } else {
        o.el.textContent = o.text;
      }
    });
    slotOriginals = [];
    mountedVideos = [];
  }

  // Obraz i wideo w content (MA-D14): tylko https z domeny strony albo z CDN
  // obrazów panelu, elementy budowane createElement - nigdy HTML z koperty.
  var MEDIA_HOSTS = ['media.digi2.app'];
  var YT_RE = /^[A-Za-z0-9_-]{11}$/;
  var VIMEO_RE = /^[0-9]{6,12}$/;
  var VIDEO_CAPTION = 'Wideo po zgodzie na ciasteczka';
  var mountedVideos = [];    // { el, video } - wideo z embedem czeka na zgodę marketingową

  function mediaUrl(v) {
    var src = typeof v === 'string' ? safeImage(v) : null;
    if (!src) return null;
    var host = new URL(src).hostname;
    var own = window.location && window.location.hostname;
    return host === own || MEDIA_HOSTS.indexOf(host) >= 0 ? src : null;
  }

  function imageValid(img) {
    return !!img && typeof img === 'object' && !!mediaUrl(img.src) && (img.alt == null || (typeof img.alt === 'string' && img.alt.length <= 120));
  }

  function videoValid(v) {
    if (!v || typeof v !== 'object') return false;
    if (v.poster != null && !mediaUrl(v.poster)) return false;
    if (v.provider === 'youtube') return YT_RE.test(String(v.id || ''));
    if (v.provider === 'vimeo') return VIMEO_RE.test(String(v.id || ''));
    return v.provider === 'mp4' && !!mediaUrl(v.src);
  }

  // Zgoda na kategorię Consent Mode inną niż analityczna (wideo = marketingowa).
  function categoryGranted(cat) {
    var dl = window.dataLayer || [];
    var def = null;
    for (var i = dl.length - 1; i >= 0; i--) {
      var e = dl[i];
      if (!isGtagCommand(e) || !e[2] || typeof e[2] !== 'object') continue;
      var v = e[2][cat];
      if (v !== 'granted' && v !== 'denied') continue;
      if (e[1] === 'update') return v === 'granted';
      if (e[1] === 'default' && e[2].region == null && def === null) def = v === 'granted';
    }
    try {
      var x = window.google_tag_data.ics.entries[cat];
      if (x) {
        var t = x.update !== undefined ? x.update : x['default'];
        if (t === true || t === false) return t;
      }
    } catch (err) {}
    if (def !== null) return def;
    try {
      var c = JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY) || 'null');
      return !!(c && c[cat] === 'granted');
    } catch (err2) { return false; }
  }

  // Embed YouTube / Vimeo stawia ciasteczka podmiotu trzeciego: ad_storage jest
  // zawsze wymagane, atrybut może tylko dołożyć kategorie (jak consent-required
  // może tylko wymusić zgodę). Lista bez ad_storage - ostrzeżenie i ad_storage.
  var videoWarned = false;
  function videoCategories() {
    var raw = String(_cfg('d2-ma-video-consent') || '').split(/[\s,]+/).filter(function (c) {
      return /^[a-z_]{1,40}$/.test(c);
    });
    if (raw.length && raw.indexOf('ad_storage') < 0) {
      if (!videoWarned) { videoWarned = true; _warn('d2-ma-video-consent without ad_storage — ad_storage is still required'); }
    }
    if (raw.indexOf('ad_storage') < 0) raw.unshift('ad_storage');
    return raw;
  }

  function videoAllowed() {
    return videoCategories().every(categoryGranted);
  }

  function videoNode(v) {
    var el;
    if (v.provider === 'mp4') {
      el = document.createElement('video');
      el.setAttribute('src', mediaUrl(v.src));
      el.setAttribute('controls', '');
      el.setAttribute('playsinline', '');
      el.setAttribute('preload', 'metadata');
      if (v.poster) el.setAttribute('poster', mediaUrl(v.poster));
      return el;
    }
    if (!videoAllowed()) {
      // Bez zgody marketingowej - miniatura z CDN panelu i podpis, bez ramki YouTube / Vimeo.
      el = document.createElement('div');
      el.setAttribute('d2-ma-video-placeholder', '');
      if (v.poster) {
        var img = document.createElement('img');
        img.setAttribute('src', mediaUrl(v.poster));
        img.setAttribute('alt', '');
        el.appendChild(img);
      }
      var cap = document.createElement('p');
      cap.textContent = VIDEO_CAPTION;
      el.appendChild(cap);
      return el;
    }
    el = document.createElement('iframe');
    el.setAttribute('src', v.provider === 'youtube'
      ? 'https://www.youtube-nocookie.com/embed/' + v.id
      : 'https://player.vimeo.com/video/' + v.id + '?dnt=1');
    el.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    el.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    el.setAttribute('allow', 'fullscreen; picture-in-picture');
    el.setAttribute('loading', 'lazy');
    el.setAttribute('title', 'Wideo');
    return el;
  }

  function remember(el, entry) {
    for (var j = 0; j < slotOriginals.length; j++) if (slotOriginals[j].el === el) return;
    entry.el = el;
    slotOriginals.push(entry);
  }

  function mount(el, node) {
    var kids = [];
    while (el.firstChild) { kids.push(el.firstChild); el.removeChild(el.firstChild); }
    remember(el, { kids: kids });
    el.appendChild(node);
  }

  // Treść content w slotach: tekst, obraz albo wideo. Zwraca liczbę slotów.
  function applyContent(node, text) {
    if (!node.image && !node.video) return setSlot(node.slot, text);
    if (!document.querySelectorAll) return 0;
    var els = document.querySelectorAll('[d2-ma-slot="' + node.slot + '"], [data-d2-ma-slot="' + node.slot + '"]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (node.image && el.tagName === 'IMG') {
        remember(el, { img: { src: el.getAttribute('src'), alt: el.getAttribute('alt') } });
        el.setAttribute('src', mediaUrl(node.image.src));
        el.setAttribute('alt', node.image.alt || '');
      } else if (node.image) {
        var img = document.createElement('img');
        img.setAttribute('src', mediaUrl(node.image.src));
        img.setAttribute('alt', node.image.alt || '');
        mount(el, img);
      } else {
        mount(el, videoNode(node.video));
        if (node.video.provider !== 'mp4') mountedVideos.push({ el: el, video: node.video });
      }
    }
    return els.length;
  }

  // Zgoda marketingowa przyszła po wstawieniu miniatury - podmień na odtwarzacz.
  function refreshVideos() {
    mountedVideos.forEach(function (m) {
      while (m.el.firstChild) m.el.removeChild(m.el.firstChild);
      m.el.appendChild(videoNode(m.video));
    });
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

  var ordered = false;       // map_order przestawił listę na tej odsłonie

  // „Wyczyść" (§13.2): lista 2destate wraca do swojej kolejności.
  // „Wyczyść” (ma.18): wyszukiwarka wraca do pustego filtra, jak po wejściu.
  // ma.26: core scala filtry (mergeFilters), więc {} niczego nie zdejmuje — każde
  // pole jawnie null. Pola dotknięte przez gościa core i tak zostawia (touched).
  var FILTER_RESET = { rooms: null, floor: null, areaMin: null, areaMax: null, priceMin: null, priceMax: null, status: null, building: null };
  function resetFilters() {
    var api = mapApi();
    if (filterTimer) { clearTimeout(filterTimer); filterTimer = null; }
    pendingFilter = null;
    if (!api || typeof api.setFilters !== 'function') return;
    try { mapNames().forEach(function (m) { api.setFilters(m, _clone(FILTER_RESET), { source: 'api' }); }); } catch (e) {}
  }

  function resetOrder() {
    var api = mapApi();
    if (!ordered || !api || typeof api.setProductOrder !== 'function') return;
    ordered = false;
    try { mapNames().forEach(function (m) { api.setProductOrder(m, []); }); } catch (e) {}
  }

  function mapMark(sc, node) {
    var kind = node['do'];
    var api = mapApi();
    if (!api || typeof api.getProducts !== 'function') {
      if (window.console && console.info) console.info('[digi2.ma] ' + kind + ' skipped — no 2destate map on this page');
      return;
    }
    if (kind === 'prefer_filters') { preferFilters(sc, node, false); return; }
    // ma.17: sortowanie wybrane przez gościa wygrywa z profilem do końca wizyty.
    if (kind === 'map_order' && userSorted()) {
      _log('map_order skipped — the visitor picked a sort in this visit');
      return;
    }
    // map_order nie ma zastępstwa: bez setProductOrder (paczka 2destate) nic nie robi.
    if (kind === 'map_order' && typeof api.setProductOrder !== 'function') {
      if (window.console && console.info) console.info('[digi2.ma] map_order skipped — 2destate has no setProductOrder yet');
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
    var limit = kind === 'map_order' ? Math.min(Math.max(num(node.limit) || 20, 1), 50)
      : Math.min(Math.max(num(node.limit) || 5, 1), 20);
    var ids = rankUnits(products, node.by).slice(0, limit);
    if (!ids.length) { _log(kind + ' — nothing on the map matches the profile'); return; }
    if (kind === 'map_order') {
      // Wskazane lokale najpierw, reszta w dotychczasowej kolejności; null = mapa
      // ułoży listę sama po załadowaniu.
      try {
        mapNames().forEach(function (m) { api.setProductOrder(m, ids); });
        ordered = true;
      } catch (e) {
        _warn('map_order failed', e);
        return;
      }
      _emit('ma:action', { scenarioId: sc.id, nodeId: node.id, 'do': 'map_order', units: ids });
      return;
    }
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

  // ---------------------------------------------------------------------------
  // Wyszukiwarka 2destate (ma.17, §13.14, core 1.7.0): filtry, sortowanie,
  // prefer_filters i zdarzenia GA4 listy. Tylko source "user" zasila profil.
  // ---------------------------------------------------------------------------
  var sortTouchedPage = false;   // sortowanie gościa przed otwarciem magazynu / bez zgody
  var search = { filters: null, sort: null, matching: null, mapName: null, timer: null, user: false };
  var LIST_NAME = 'wyszukiwarka';
  var LIST_DEBOUNCE_MS = 500;

  function normFilters(f) {
    var o = {};
    if (!f || typeof f !== 'object') return o;
    ['rooms', 'floor'].forEach(function (k) {
      if (!Array.isArray(f[k])) return;
      var list = f[k].map(num).filter(function (x) { return x != null; }).slice(0, 20);
      if (list.length) o[k] = list;
    });
    ['areaMin', 'areaMax', 'priceMin', 'priceMax'].forEach(function (k) {
      var v = num(f[k]);
      if (v != null) o[k] = v;
    });
    ['status', 'building'].forEach(function (k) {
      if (!Array.isArray(f[k])) return;
      var list = f[k].filter(function (x) { return x != null && x !== ''; })
        .map(function (x) { return String(x).slice(0, 40); }).slice(0, 20);
      if (list.length) o[k] = list;
    });
    return o;
  }

  function userSorted() {
    return sortTouchedPage || !!(state && state.sortVisit != null && state.sortVisit === state.visits);
  }

  function searchEventsOff() {
    var v = _cfg('d2-ma-search-events');
    return v === 'off' || v === 'false';
  }

  var SORT_GA = { price: 1, area: 1, floor: 1 };
  var filterTimer = null;
  var pendingFilter = null;     // ostatnia zmiana gościa czekająca na 500 ms ciszy
  var flushHooked = false;

  // Odłożona zmiana filtra trafia do profilu od razu: przed wysyłką formularza
  // (kontekst leadu) i przy wyjściu ze strony. Czas = chwila ostatniej zmiany.
  function flushFilter() {
    if (filterTimer) { clearTimeout(filterTimer); filterTimer = null; }
    var p = pendingFilter;
    pendingFilter = null;
    if (p) intake({ type: 'search_filter', filter: p.filter, results: p.results, realAt: p.realAt });
  }

  // Wyjście ze strony (ma.20): tylko fakt w d2ma — jak formsOnExit, żadnych akcji
  // scenariusza (dataLayer, webhook, popup) w chwili wyjścia. Wyzwalacza
  // search_filter nie odtwarzamy przy następnej odsłonie: filtr dotyczył strony,
  // której już nie ma; zostaje w profilu, kontekście leadu i filterLog (minCount).
  function filterOnExit() {
    if (filterTimer) { clearTimeout(filterTimer); filterTimer = null; }
    var p = pendingFilter;
    pendingFilter = null;
    if (!p || !tracking || !state || blocked) return;
    storeFilter(p.filter, p.realAt + (state.shift || 0));
    save();
  }

  function onFilterChange(p) {
    if (!p || typeof p !== 'object') return;
    var user = p.source === 'user';
    if (p.mapName) lastMapName = String(p.mapName);
    search.filters = normFilters(p.filters);
    search.matching = num(p.resultCount);
    search.mapName = p.mapName ? String(p.mapName) : search.mapName;
    if (user) {
      scheduleListEvent();
      // Suwak ceny daje serię zmian: do profilu i scenariuszy idzie jedna, ostatnia
      // po 500 ms ciszy — inaczej minCount nabija się jednym ruchem, a filterLog puchnie.
      pendingFilter = { filter: search.filters, results: search.matching, realAt: Date.now() };
      // pagehide dopiero od pierwszego filtra gościa: strona bez wyszukiwarki nie dostaje nasłuchu.
      if (!flushHooked && window.addEventListener) { flushHooked = true; window.addEventListener('pagehide', filterOnExit); }
      if (filterTimer) clearTimeout(filterTimer);
      filterTimer = setTimeout(flushFilter, LIST_DEBOUNCE_MS);
    }
  }

  function onSortChange(p) {
    if (!p || typeof p !== 'object' || !p.sort) return;
    var by = String(p.sort.by || '');
    var dir = p.sort.dir === 'desc' ? 'desc' : 'asc';
    search.sort = by ? { by: by, dir: dir } : null;
    if (p.mapName) lastMapName = String(p.mapName);
    // custom = kolejność nadana przez setProductOrder (nasza), nie wybór gościa.
    if (p.source !== 'user' || by === 'custom') return;
    sortTouchedPage = true;
    scheduleListEvent();
    intake({ type: 'search_sort', sort: search.sort });
  }

  function rangeOf(min, max) {
    if (min == null && max == null) return null;
    return (min == null ? '' : min) + '-' + (max == null ? '' : max);
  }

  // "rooms=2|3;floor=1;area=40-60;price=-700000;status=available;building=B"
  function filtersString(f) {
    var parts = [];
    if (f.rooms) parts.push('rooms=' + f.rooms.join('|'));
    if (f.floor) parts.push('floor=' + f.floor.join('|'));
    var a = rangeOf(f.areaMin, f.areaMax);
    if (a) parts.push('area=' + a);
    var pr = rangeOf(f.priceMin, f.priceMax);
    if (pr) parts.push('price=' + pr);
    if (f.status) parts.push('status=' + f.status.join('|'));
    if (f.building) parts.push('building=' + f.building.join('|'));
    return { text: parts.join(';'), count: parts.length };
  }

  function dlPush(o) {
    if (searchEventsOff()) return;
    // Każdy klucz kontraktu w każdym pushu (ma.21, zasada 9 standardu GTM): zmienna
    // DLV czyta model danych, więc brakujący klucz dałby wartość z poprzedniego
    // pushu. Brak wartości = undefined jako własny klucz, nie usunięcie.
    Object.keys(o).forEach(function (k) { if (o[k] == null) o[k] = undefined; });
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(o);
  }

  function scheduleListEvent() {
    if (searchEventsOff()) return;
    if (search.timer) clearTimeout(search.timer);
    search.timer = setTimeout(function () {
      search.timer = null;
      var fs = filtersString(search.filters || {});
      var total = null;
      var api = mapApi();
      try { if (api && typeof api.getProducts === 'function') total = (api.getProducts() || []).length || null; } catch (e) {}
      dlPush({ event: 'view_item_list', item_list_name: LIST_NAME, filters: fs.text, filter_count: fs.count,
        matching: search.matching, total: total,
        // Tylko price | area | floor × asc | desc; rooms, name, custom — parametr pominięty.
        item_list_sort: search.sort && SORT_GA[search.sort.by] ? search.sort.by + '_' + search.sort.dir : null });
    }, LIST_DEBOUNCE_MS);
  }

  function roomsGroup(n) {
    if (n == null) return null;
    return n >= 5 ? '5+' : String(n);
  }

  // Klik w lokal (mapa albo lista wyników core 1.7.0: meta.source "list").
  function productAnalytics(product, meta) {
    var u = from2destate(product);
    if (!u) return;
    var fromList = !!(meta && (meta.source === 'list' || meta.source === 'search'));
    if (fromList) dlPush({ event: 'select_item', item_list_name: LIST_NAME, item_id: u.unitId, item_name: u.name });
    dlPush({ event: 'view_flat', flat_id: u.unitId, flat_name: u.name, flat_rooms: u.rooms, flat_rooms_group: roomsGroup(u.rooms),
      flat_floor: u.floor, flat_area: u.area, flat_type: str(product.type != null ? product.type : product.flat_type),
      flat_building: u.building, flat_availability: u.status, flat_price: u.price, flat_isPromo: u.isPromo,
      view_source: fromList ? LIST_NAME : 'mapa' });
  }

  // prefer_filters: ustawia filtr wyszukiwarki z preferencji profilu. now=true
  // w chwili akcji (false przy ponowieniu po załadowaniu mapy). Zwraca, czy
  // akcja zrobiła swoje (albo czeka na mapę) — false = gość już filtrował, brak
  // preferencji albo brak setFilters.
  function preferFilters(sc, node, now) {
    if (state && state.filters && state.filters.visit === state.visits) {
      _log('prefer_filters skipped — the visitor already filtered in this visit');
      return false;
    }
    var f = {};
    var rooms = node.by !== 'floor' ? prefOf('rooms') : null;
    var floor = node.by !== 'rooms' ? prefOf('floor') : null;
    if (rooms != null) f.rooms = [rooms];
    if (floor != null) f.floor = [floor];
    if (!f.rooms && !f.floor) { _log('prefer_filters skipped — no preference in the profile'); return false; }
    var api = mapApi();
    if (!api || typeof api.setFilters !== 'function') {
      if (window.console && console.info) console.info('[digi2.ma] prefer_filters skipped — 2destate has no setFilters (core 1.7.0)');
      return false;
    }
    var maps = mapNames();
    if (!maps.length) {
      if (now) markWaiting.push({ sc: sc, node: node });
      _log('prefer_filters waits for the map → ' + sc.id + '/' + node.id);
      return true;
    }
    var applied = false;
    try {
      maps.forEach(function (m) {
        var r = api.setFilters(m, f, { source: 'api' });
        // core 1.7.0: { applied, skipped }. Nic nie weszło (pole dotknięte przez gościa,
        // panel wyszukiwarki wyłączony) = akcja nie zrobiła swojego. Starsza paczka: bez wyniku.
        if (!r || typeof r !== 'object' || !Array.isArray(r.applied) || r.applied.length) applied = true;
      });
    } catch (e) {
      _warn('prefer_filters failed', e);
      return false;
    }
    if (!applied) {
      _log('prefer_filters — 2destate applied nothing (field touched by the visitor or no search panel)');
      return false;
    }
    _emit('ma:action', { scenarioId: sc.id, nodeId: node.id, 'do': 'prefer_filters', filters: f });
    return true;
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
    'promo-rooms': { heading: 'Wybrane dla Ciebie', cta: 'Zobacz ofertę' },
    'promo-filter': { heading: 'Dla Ciebie', cta: 'Porozmawiajmy' }
  };
  // Popupy bez lokalu (ma.17): treść tylko z pref.*; bez wartości popup jest pomijany.
  // ma.29: „Szukasz mieszkania 2-pokojowego?" zamiast „… 2 pokoje?".
  var UNITLESS_TEXT = {
    'promo-filter': function () {
      var adj = roomsAdj(prefOf('rooms'));
      return adj == null ? null : 'Szukasz mieszkania ' + adj + '? Pokażemy wolne lokale i aktualne promocje.';
    }
  };
  // null także dla szablonu spoza UNITLESS_TEXT: szablon koperty bez {{unit.*}},
  // który zniknął po d2-ma-refresh, ma pominąć popup, nie rzucić TypeError.
  function unitlessText(template) {
    return typeof UNITLESS_TEXT[template] === 'function' ? UNITLESS_TEXT[template]() : null;
  }

  // Popup bez lokalu: promo-filter zawsze; szablon z koperty bez {{unit.*}} tylko
  // wtedy, gdy ścieżka nie ma lokalu (z lokalem zostaje jak dotąd).
  function unitlessPopup(template, tpl, unit) {
    if (Object.prototype.hasOwnProperty.call(UNITLESS_TEXT, template)) return true;
    if (unit || !tpl) return false;
    var js = JSON.stringify(tpl);
    return !/\{\{\s*unit\./.test(js);
  }

  // ---------------------------------------------------------------------------
  // Popup z szablonu panelu (templates.popup[], §13.9.3). Własny [d2-ma-popup]
  // strony wygrywa. Bloki to dane: elementy z createElement, tekst przez
  // textContent, style tylko z białej listy i tylko jako tokeny strony.
  // ---------------------------------------------------------------------------

  var TPL_BLOCKS = {
    title: { text: 80, fallback: 160 },
    text: { text: 300, fallback: 160 },
    image: { src: 0, alt: 120 },
    cta: { label: 40, action: 0, href: 0 }
  };
  var TPL_POSITIONS = { center: 'center|center', 'bottom-right': 'flex-end|flex-end', bottom: 'flex-end|center', top: 'flex-start|center' };
  var TPL_SIZES = { sm: 320, md: 380, lg: 520 };
  var TPL_RADIUS = { none: '0', sm: 'var(--radius-sm, 6px)', md: 'var(--radius-md, 14px)', lg: 'var(--radius-lg, 22px)' };
  var TPL_STYLE = { background: 1, text: 1, accent: 1, font: 1, radius: 1 };
  var TOKEN_RE = /^token:([a-z0-9-]{1,40})$/;
  var MAX_TEMPLATES_BYTES = 100 * 1024;

  function onlyKeys(obj, allowed, where) {
    Object.keys(obj).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(allowed, k)) _warn(where + ' — unknown field "' + k + '" ignored');
    });
  }

  // Pola w tekście bloku: lista §13.9.2 bez unit.image (to wolno tylko w src obrazu).
  function tplText(v, max) {
    return typeof v === 'string' && v.length >= 1 && v.length <= max && fieldsKnown(v);
  }

  function tplBlock(b, where) {
    if (!b || typeof b !== 'object' || !TPL_BLOCKS[b.type]) { _warn(where + ' — unknown block type, skipped'); return null; }
    var spec = TPL_BLOCKS[b.type];
    var allowed = { type: 1 };
    Object.keys(spec).forEach(function (k) { allowed[k] = 1; });
    onlyKeys(b, allowed, where);
    var out = { type: b.type };
    if (b.type === 'title' || b.type === 'text') {
      if (!tplText(b.text, spec.text)) { _warn(where + ' — ' + b.type + ' text missing, too long or with a field outside §13.9.2, skipped'); return null; }
      out.text = b.text;
      if (b.fallback != null) {
        if (typeof b.fallback === 'string' && b.fallback.length <= 160 && b.fallback.indexOf('{{') < 0) out.fallback = b.fallback;
        else _warn(where + ' — fallback must be plain text ≤ 160, ignored');
      }
    } else if (b.type === 'image') {
      if (b.src !== '{{unit.image}}' && !mediaUrl(b.src)) { _warn(where + ' — image src must be {{unit.image}} or https on this site / ' + MEDIA_HOSTS.join(', ') + ', skipped'); return null; }
      out.src = b.src;
      if (b.alt != null) {
        if (typeof b.alt === 'string' && b.alt.length <= 120 && fieldsKnown(b.alt)) out.alt = b.alt;
        else _warn(where + ' — alt ignored');
      }
    } else {
      if (typeof b.label !== 'string' || !b.label.length || b.label.length > 40 || !fieldsKnown(b.label)) { _warn(where + ' — cta label missing or > 40, skipped'); return null; }
      if (b.action !== 'open_unit' && b.action !== 'contact' && b.action !== 'link') { _warn(where + ' — cta action must be open_unit, contact or link, skipped'); return null; }
      if (b.action === 'link' && !(typeof b.href === 'string' && safePageLink(b.href))) {
        _warn(where + ' — cta link needs an https href on this site, skipped');
        return null;
      }
      out.label = b.label;
      out.action = b.action;
      if (b.action === 'link') out.href = safePageLink(b.href);
    }
    return out;
  }

  function popupLibrary(t) {
    var lib = {};
    var list = t && typeof t === 'object' && Array.isArray(t.popup) ? t.popup : [];
    if (!list.length) return lib;
    var size = 0;
    try { size = JSON.stringify(t).length; } catch (e) { size = Infinity; }
    if (size > MAX_TEMPLATES_BYTES) { _warn('envelope templates over 100 KB — popup templates ignored'); return lib; }
    list.forEach(function (p) {
      var id = p && p.templateId;
      var where = 'popup template "' + id + '"';
      if (!p || typeof p !== 'object' || !SLOT_RE.test(String(id || ''))) { _warn(where + ' — needs a templateId [a-z0-9-], skipped'); return; }
      onlyKeys(p, { templateId: 1, version: 1, blocks: 1, layout: 1, style: 1 }, where);
      var blocks = (Array.isArray(p.blocks) ? p.blocks.slice(0, 8) : []).map(function (b, i) {
        return tplBlock(b, where + ' block ' + (i + 1));
      }).filter(Boolean);
      if (Array.isArray(p.blocks) && p.blocks.length > 8) _warn(where + ' — more than 8 blocks, the rest ignored');
      if (!blocks.length) { _warn(where + ' — no valid block, skipped'); return; }
      var layout = p.layout && typeof p.layout === 'object' ? p.layout : {};
      onlyKeys(layout, { position: 1, size: 1 }, where + ' layout');
      var style = {};
      if (p.style && typeof p.style === 'object') {
        onlyKeys(p.style, TPL_STYLE, where + ' style');
        Object.keys(TPL_STYLE).forEach(function (k) {
          var v = p.style[k];
          if (v == null) return;
          if (k === 'radius') { if (TPL_RADIUS[v] != null) style.radius = v; else _warn(where + ' — radius must be none, sm, md or lg, ignored'); return; }
          var m = TOKEN_RE.exec(String(v));
          if (m) style[k] = m[1]; else _warn(where + ' — style ' + k + ' must be token:<name>, ignored');
        });
      }
      lib[id] = {
        id: id, blocks: blocks, style: style,
        position: TPL_POSITIONS[layout.position] ? layout.position : 'center',
        size: TPL_SIZES[layout.size] ? layout.size : 'md'
      };
    });
    return lib;
  }

  function popupTemplate(id) {
    var lib = (envelope && envelope.popupTemplates) || {};
    return Object.prototype.hasOwnProperty.call(lib, id) ? lib[id] : null;
  }

  function tokenVar(name) {
    return 'var(--' + name + ')';
  }

  // Szkielet popupu z szablonu: nakładka i okno. Bloki dochodzą w renderTemplate().
  function buildFromTemplate(tpl) {
    var el = document.createElement('div');
    el.setAttribute('d2-ma-popup', tpl.id);
    el.setAttribute('d2-ma-template', '');
    var pos = TPL_POSITIONS[tpl.position].split('|');
    el.style.cssText = 'position:fixed;inset:0;display:none;align-items:' + pos[0] + ';justify-content:' + pos[1] + ';'
      + 'padding:16px;background:rgba(15,18,24,.55);z-index:9999';
    var dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('d2-ma-template-body', '');
    dialog.style.cssText = 'position:relative;width:100%;max-width:' + TPL_SIZES[tpl.size] + 'px;background:#fff;color:#1a1d1c;'
      + 'border-radius:14px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.3);padding:20px 22px 22px';
    if (tpl.style.background) dialog.style.setProperty('background-color', tokenVar(tpl.style.background));
    if (tpl.style.text) dialog.style.setProperty('color', tokenVar(tpl.style.text));
    if (tpl.style.font) dialog.style.setProperty('font-family', tokenVar(tpl.style.font));
    if (tpl.style.radius) dialog.style.setProperty('border-radius', TPL_RADIUS[tpl.style.radius]);
    el.appendChild(dialog);
    document.body.appendChild(el);
    return el;
  }

  // Wypełnia okno blokami dla lokalu. Pole bez wartości: fallback albo blok ukryty.
  function renderTemplate(el, tpl, unit) {
    var dialog = el.querySelector('[d2-ma-template-body]');
    if (!dialog) return;
    while (dialog.firstChild) dialog.removeChild(dialog.firstChild);
    var close = document.createElement('button');
    close.setAttribute('type', 'button');
    close.setAttribute('d2-ma-close', '');
    close.setAttribute('aria-label', 'Zamknij');
    close.style.cssText = 'position:absolute;top:8px;right:8px;width:36px;height:36px;border:0;border-radius:18px;'
      + 'background:rgba(255,255,255,.9);font-size:22px;line-height:1;cursor:pointer;color:#1a1d1c';
    close.textContent = '×';
    dialog.appendChild(close);
    tpl.blocks.forEach(function (b) {
      var node;
      if (b.type === 'image') {
        var src = b.src === '{{unit.image}}' ? (unit && unit.image ? safeImage(unit.image) : null) : mediaUrl(b.src);
        if (!src) return;
        node = document.createElement('img');
        node.setAttribute('src', src);
        var alt = b.alt ? contentText({ text: b.alt }, unit) : '';
        node.setAttribute('alt', alt || '');
        node.style.cssText = 'display:block;width:calc(100% + 44px);height:auto;margin:-20px -22px 16px';
      } else if (b.type === 'cta') {
        var label = contentText({ text: b.label }, unit);
        if (label == null) return;
        node = document.createElement('a');
        node.setAttribute('d2-ma-cta', '');
        node.setAttribute('d2-ma-template-cta', b.action);
        node.setAttribute('href', b.action === 'link' ? b.href : '#');
        node.textContent = label;
        node.style.cssText = 'display:block;text-align:center;padding:12px 16px;border-radius:10px;background:#1a1d1c;'
          + 'color:#fff;text-decoration:none;font-weight:600;margin-top:12px';
        if (tpl.style.accent) node.style.setProperty('background-color', tokenVar(tpl.style.accent));
      } else {
        var text = contentText({ text: b.text }, unit);
        if (text == null) text = b.fallback || null;
        if (text == null) return;
        node = document.createElement(b.type === 'title' ? 'h3' : 'p');
        node.textContent = text;
        node.style.cssText = b.type === 'title' ? 'margin:0 0 6px;font-size:22px;line-height:1.2' : 'margin:0 0 6px';
      }
      dialog.appendChild(node);
    });
  }

  function templateCta(tpl) {
    for (var i = 0; i < tpl.blocks.length; i++) if (tpl.blocks[i].type === 'cta') return tpl.blocks[i].action;
    return null;
  }

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

  // Wbudowany popup bez lokalu (promo-filter): nagłówek, zdanie z pref.*, przycisk kontaktu.
  function buildUnitless(template) {
    var l = LABELS[template] || { heading: 'Dla Ciebie', cta: 'Porozmawiajmy' };
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
      + '<div style="padding:22px 22px 22px">'
      + '<p d2-ma-heading style="margin:0 0 4px;font-size:13px;color:#6b7370"></p>'
      + '<h3 d2-ma-unitless-text style="margin:0 0 16px;font-size:20px;line-height:1.3"></h3>'
      + '<a d2-ma-cta d2-ma-template-cta="contact" href="#" style="display:block;text-align:center;padding:12px 16px;'
      + 'border-radius:10px;background:#1a1d1c;color:#fff;text-decoration:none;font-weight:600"></a>'
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
      var href = cta === 'open_unit' && unit && unit.url ? safeLink(unit.url) : null;
      if (href && a.tagName === 'A') a.setAttribute('href', href);
      if (a._d2maBound) continue;
      a._d2maBound = true;
      a.addEventListener('click', function (e) {
        var u = this._d2maUnit;
        // Przycisk „kontakt" z szablonu nie ma własnego adresu - bez skoku na „#".
        if (this.getAttribute && this.getAttribute('d2-ma-template-cta') === 'contact' && e && e.preventDefault) e.preventDefault();
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

  // Na telefonie pierwsze stuknięcie lokalu otwiera dymek mapy 2destate na cały
  // ekran (#5). Popup ze scenariusza czeka, aż gość go zamknie - najpierw widzi
  // lokal, który kliknął. Po 5 minutach z otwartym dymkiem rezygnujemy (wpis
  // częstotliwości wraca, popup może przyjść następnym razem).
  var TOOLTIP_SEL = '.imp-tooltips-container.is-fullscreen';
  var TOOLTIP_POLL_MS = 250;
  var TOOLTIP_MAX_MS = 5 * 60 * 1000;
  // Dymek otwiera się chwilę po stuknięciu (po decyzji o popupie z tego samego
  // kliknięcia), więc ukryty kontener jeszcze nic nie mówi - najpierw dajemy mu czas.
  var TOOLTIP_SETTLE_MS = 500;

  // Image Map Pro zostawia klasę is-fullscreen po zamknięciu dymka (kontener
  // dostaje display:none), więc sama klasa nie znaczy „otwarty" - liczy się,
  // czy kontener faktycznie jest na ekranie. Inaczej popup czekał 5 min i przepadał (ma.27).
  function shownOnScreen(el) {
    // visibility dziedziczy się w computed style; display:none przodka daje puste getClientRects().
    var cs = window.getComputedStyle ? window.getComputedStyle(el) : el.style;
    if (cs && (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse')) return false;
    if (el.getClientRects && !el.getClientRects().length) return false;
    if (el.getBoundingClientRect) {
      var r = el.getBoundingClientRect();
      if (!r.width && !r.height) return false;
    }
    return true;
  }

  function mapTooltips() {
    return document.querySelectorAll ? document.querySelectorAll(TOOLTIP_SEL) : [];
  }

  function mapTooltipOpen() {
    var list = mapTooltips();
    for (var i = 0; i < list.length; i++) if (shownOnScreen(list[i])) return true;
    return false;
  }

  // Profil z chwili decyzji: „Wyczyść" i wycofanie zgody podbijają epokę, więc
  // popup czekający na dymek albo na świeży status nie pokaże lokalu z usuniętego profilu.
  var profileEpoch = 0;
  var tooltipWaits = {};     // szablon → { timer, giveUp } - jeden czekający popup na szablon

  function cancelTooltipWaits() {
    Object.keys(tooltipWaits).forEach(function (k) { clearTimeout(tooltipWaits[k].timer); });
    tooltipWaits = {};
  }

  function whenMapTooltipClosed(key, owner, epoch, go, giveUp) {
    // Nowszy popup tego samego szablonu zastępuje czekający.
    var prev = tooltipWaits[key];
    if (prev) { clearTimeout(prev.timer); delete tooltipWaits[key]; prev.giveUp(prev.owner === owner ? 'same' : 'other'); }
    // Bez kontenera pełnoekranowego (desktop, strona bez mapy) - od razu.
    if (!mapTooltips().length) { go(); return; }
    _log('popup waits for the map tooltip to close');
    // Czas z zegara, nie z liczby tyknięć - karta w tle spowalnia timery.
    var since = Date.now();
    var wait = { timer: null, giveUp: giveUp, owner: owner };
    tooltipWaits[key] = wait;
    (function tick() {
      wait.timer = setTimeout(function () {
        if (tooltipWaits[key] !== wait) return;
        // Zgoda wycofana albo profil wyczyszczony w trakcie czekania - nic nie pokazujemy.
        if (!tracking || epoch !== profileEpoch) { delete tooltipWaits[key]; return; }
        if (!mapTooltipOpen()) {
          if (Date.now() - since < TOOLTIP_SETTLE_MS) { tick(); return; }
          delete tooltipWaits[key];
          go();
        }
        else if (Date.now() - since >= TOOLTIP_MAX_MS) {
          delete tooltipWaits[key];
          _log('map tooltip still open after 5 min — popup skipped');
          giveUp(false);
        } else tick();
      }, TOOLTIP_POLL_MS);
    })();
  }

  function showPopup(node, ctx, onShown, onSkipped, owner) {
    var epoch = profileEpoch;
    var tplLib = popupTemplate(node.template);
    var noUnit = unitlessPopup(node.template, tplLib, ctx.unit);
    // Popup bez lokalu (promo-filter): lokal z historii go nie dotyczy.
    var unit = noUnit ? null : ctx.unit;
    if (!unit && !noUnit) { _log('popup skipped — no unit in the path'); onSkipped(); return; }
    if (noUnit && !tplLib && unitlessText(node.template) == null) {
      _log('popup skipped — ' + node.template + ' needs pref.rooms');
      onSkipped();
      return;
    }
    (noUnit ? Promise.resolve({ noUnit: true }) : freshUnit(unit)).then(function (fresh) {
      // Profil wyczyszczony albo zgoda wycofana, gdy szedł odczyt statusu.
      if (epoch !== profileEpoch || !tracking) return null;
      if (fresh && fresh.noUnit) fresh = null;
      else if (!fresh || fresh.status === 'sold') {
        _log('popup skipped — unit no longer on offer → ' + unit.unitId);
        onSkipped();
        return null;
      }
      return popupsApi().then(function (popups) {
        var name = 'd2-ma-' + node.template;
        var inst = popups.get(name);
        var own = document.querySelector('[d2-ma-popup="' + node.template + '"]:not([d2-ma-template]):not([d2-ma-builtin]), '
          + '[data-d2-ma-popup="' + node.template + '"]');
        var tpl = own ? null : popupTemplate(node.template);
        // Nowa rewizja koperty (d2-ma-refresh) zmieniła szablon - szkielet z
        // pierwszego renderu ma stare położenie i styl, więc budujemy od nowa.
        var sig = tpl ? JSON.stringify(tpl) : null;
        if (inst && inst.popupElement && inst.popupElement._d2maTplSig !== undefined && inst.popupElement._d2maTplSig !== sig) {
          var old = inst.popupElement;
          popups.destroy(name);
          if (old.parentNode) old.parentNode.removeChild(old);
          inst = null;
        }
        if (!inst || !inst.popupElement) {
          if (inst) popups.destroy(name);
          var el = own || (tpl ? buildFromTemplate(tpl) : (noUnit ? buildUnitless(node.template) : buildFallback(node.template)));
          if (!own) el._d2maTplSig = sig;
          if (!el.id) el.id = name;
          inst = popups.create(name, {
            popupSelector: '#' + el.id, cookieName: null, dataTagTrigger: false, openOnLoad: false,
            closeTriggerSelector: '#' + el.id + ' [d2-ma-close], #' + el.id + ' [data-d2-ma-close]'
          });
        }
        if (!inst || !inst.popupElement) { onSkipped(); return null; }
        // ma.32: ten sam popup już na ekranie (albo jeszcze się zamyka) - nie
        // podmieniamy mu treści i nie liczymy go jako pokazanego (recenzja #32).
        if (inst.isVisible || inst._onScreen) {
          _log('popup skipped — the same popup is already on screen → ' + name);
          onSkipped();
          return null;
        }
        if (tpl) renderTemplate(inst.popupElement, tpl, fresh);
        if (noUnit && !tpl && !own) {
          var txt = unitlessText(node.template);
          if (txt == null) { onSkipped(); return null; }
          var body = inst.popupElement.querySelector('[d2-ma-unitless-text]');
          if (body) body.textContent = txt;
        }
        fill(inst.popupElement, fresh);
        wireCta(inst.popupElement, name, fresh, tpl ? (templateCta(tpl) || node.cta) : node.cta);
        whenMapTooltipClosed(node.template, owner, epoch, function () {
          // park: false - popup ze scenariusza nie czeka za innym popupem na
          // ekranie (popups.js pokazałby go po zamknięciu tamtego, ~1 s później,
          // jako drugi na tę samą interakcję). Nie wszedł na ekran = pominięty:
          // bez ma:action, a wpis częstotliwości wraca (onSkipped).
          // Pokazany = przejście z niewidocznego na widoczny w tym show().
          var wasVisible = inst.isVisible || inst._onScreen;
          inst.show({ auto: true, park: false });
          if (!wasVisible && inst.isVisible) { onShown(fresh); return; }
          inst.pendingShow = false;
          _log('popup skipped — popups module did not show it (another popup or the lightbox on screen) → ' + name);
          onSkipped();
        }, onSkipped);
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
      else if (holding && googleTagDenied()) consentChanged(false);
      else if (tracking && !openedWithConsent && tag === 'granted') consentChanged(true);
      else if (tracking && openedWithConsent && googleTagDenied()) consentChanged(false);
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
        try { productAnalytics(product, meta); } catch (e) { _warn('view_flat failed', e); }
        var unit = from2destate(product);
        if (unit) intake({ type: 'view', unit: unit });
      });
      if (typeof api.onFilterChange === 'function') api.onFilterChange(onFilterChange);
      if (typeof api.onSortChange === 'function') api.onSortChange(onSortChange);
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
      var v = utmValue(param('utm_' + k));
      if (v) { u[k] = v; any = true; }
    });
    return any ? u : null;
  }

  // ---------------------------------------------------------------------------
  // Historia źródeł wizyt — touchpoints v1 (ma.33). Jedyna definicja kontraktu:
  // README „Touchpoints”. Wpis: ts (ISO UTC), utm_source / utm_medium /
  // utm_campaign / utm_content / utm_term / utm_id (≤ 100 znaków), click_type
  // (gclid | fbclid | ttclid | msclkid | none — sam rodzaj, nigdy wartość),
  // referrer_host (sama domena, obca), landing_path (bez query i fragmentu).
  // ---------------------------------------------------------------------------

  var TOUCH_UTM = ['source', 'medium', 'campaign', 'content', 'term', 'id'];
  // Kolejność = pierwszeństwo, gdy adres ma kilka (v1: lista zamknięta).
  var TOUCH_CLICK_IDS = ['gclid', 'gbraid', 'wbraid', 'dclid', 'fbclid', 'ttclid', 'msclkid'];
  var TOUCHPOINTS_MAX = 20;

  // Czysta funkcja: adres strony i referrer → wpis bez ts. Bez zgody i bez
  // magazynu - może jej użyć inny skrypt (np. widżet czatu) zamiast kopiować logikę.
  function parseTouchpoint(href, referrer) {
    var u = null;
    try { u = new URL(String(href || ''), 'https://invalid.local/'); } catch (e) { u = null; }
    var web = !!u && u.hostname !== 'invalid.local' && (u.protocol === 'https:' || u.protocol === 'http:');
    var q = u ? u.searchParams : null;
    var e = {};
    TOUCH_UTM.forEach(function (k) { e['utm_' + k] = utmValue(q ? q.get('utm_' + k) : null); });
    e.click_type = 'none';
    for (var i = 0; q && i < TOUCH_CLICK_IDS.length; i++) {
      if (q.get(TOUCH_CLICK_IDS[i])) { e.click_type = TOUCH_CLICK_IDS[i]; break; }
    }
    var own = web ? siteHost(u.hostname) : null;
    var ref = null;
    try { ref = referrer ? new URL(String(referrer)).hostname.toLowerCase() : null; } catch (x) { ref = null; }
    // Przejście wewnątrz strony (także www. ↔ bez www.) to nie źródło -
    // referrer_internal odróżnia je od braku referrera (oba dają referrer_host null).
    e.referrer_internal = !!ref && siteHost(ref) === own;
    e.referrer_host = ref && !e.referrer_internal ? ref.slice(0, 100) : null;
    e.landing_path = web ? (u.pathname || '/').slice(0, 200) : null;
    return e;
  }

  function siteHost(h) {
    return String(h || '').toLowerCase().replace(/^www\./, '');
  }

  // Wartość UTM: przycięta, ≤ 100 znaków; wygląda na dane osobowe (e-mail,
  // ciąg ≥ 9 cyfr - telefon, PESEL) → null (ma.33, decyzja architekt-it).
  function utmValue(v) {
    v = v == null ? '' : String(v).replace(/^\s+|\s+$/g, '');
    if (!v || v.indexOf('@') >= 0 || /\d{9,}/.test(v)) return null;
    return v.slice(0, 100);
  }

  function readTouchpoint() {
    var href = null, ref = null;
    try { href = window.location && window.location.href; } catch (e) { href = null; }
    try { ref = document.referrer || null; } catch (e) { ref = null; }
    return parseTouchpoint(href, ref);
  }

  function utmKey(e) {
    return [e.utm_source, e.utm_medium, e.utm_campaign].join('|');
  }

  // W trakcie wizyty: nowa kampania = inne source / medium / campaign. Sam inny
  // identyfikator kliknięcia liczy się tylko przy obcym albo pustym referrerze -
  // gclid doklejany do linków wewnętrznych (url_passthrough w GTM) to nie nowa reklama.
  function newCampaign(e, last) {
    var utm = !!(e.utm_source || e.utm_medium || e.utm_campaign);
    if (utm && (!last || utmKey(last) !== utmKey(e))) return true;
    if (e.click_type === 'none' || e.referrer_internal) return false;
    return !last || last.click_type !== e.click_type || utmKey(last) !== utmKey(e);
  }

  // Źródło tej odsłony rozpatrujemy raz na załadowanie strony: nowa wizyta
  // dopisuje wpis zawsze (także direct), odsłona w trwającej wizycie tylko przy
  // nowej kampanii. Kolejna wizyta w tym samym załadowaniu (karta otwarta 2 h,
  // potem przewinięcie) nie dostaje wpisu - adres strony to wciąż stara reklama.
  // Tylko przy wyrażonej zgodzie, także gdy zgoda nie jest wymagana (profilowanie).
  function addTouchpoint(t, newVisit) {
    if (!pageTouch || !state || pageTouchUsed) return;
    if (!openedWithConsent) { if (newVisit) touchVisitPending = true; return; }
    pageTouchUsed = true;
    var list = state.touchpoints || [];
    var last = list.length ? list[list.length - 1] : null;
    if (!newVisit && !newCampaign(pageTouch, last)) return;
    var e = Object.assign({ ts: t }, pageTouch);
    delete e.referrer_internal;
    list.push(e);
    state.touchpoints = list.slice(-TOUCHPOINTS_MAX);
  }

  // Kontrakt v1: ts jako ISO UTC, pola bez wartości pominięte (poza click_type).
  function touchpointsOut(list) {
    return (list || []).map(function (e) {
      var o = { ts: ctxIso(e.ts) };
      TOUCH_UTM.forEach(function (k) { if (e['utm_' + k] != null) o['utm_' + k] = e['utm_' + k]; });
      o.click_type = e.click_type || 'none';
      if (e.referrer_host) o.referrer_host = e.referrer_host;
      if (e.landing_path) o.landing_path = e.landing_path;
      return o;
    });
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
    if (w.formIds === undefined) return true;
    return Array.isArray(w.formIds) && formId != null && w.formIds.indexOf(formId) >= 0;
  }

  function formWatched(id) {
    return !!envelope && envelope.scenarios.some(function (sc) {
      return sc.triggers.some(function (n) { return n.when.event === 'form_abandon' && formListed(n.when, id); });
    });
  }

  function formKeyOf(form) {
    return form.getAttribute('id') || form.getAttribute('data-name') || form.getAttribute('name') || null;
  }

  var MAX_FORM_FIELDS = 20;
  // \p{L} to ES2018 - literał w kodzie wywróciłby parsowanie całego modułu na
  // starszej przeglądarce, więc wzorzec ze stałego tekstu, a zapas z polskimi literami.
  var FIELD_NAME_STRIP = (function () {
    try { return new RegExp('[^\\p{L}0-9 _-]', 'gu'); } catch (e) {
      return /[^A-Za-z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ _-]/g;
    }
  })();

  function formEntry(target) {
    var t = target;
    if (!t || !t.tagName || !/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return null;
    var type = String(t.getAttribute('type') || '').toLowerCase();
    if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'password') return null;
    // Pole albo formularz z d2-ma-ignore - closest() łapie oba.
    if (t.closest && t.closest('[d2-ma-ignore], [data-d2-ma-ignore]')) return null;
    var form = t.closest ? t.closest('form') : null;
    if (!form) return null;
    for (var i = 0; i < forms.length; i++) if (forms[i].form === form) return forms[i];
    // Opt-in dotyczy konkretnych formularzy: tylko te z formIds któregoś wyzwalacza.
    var id = formKeyOf(form);
    if (!formWatched(id)) return null;
    var ent = { form: form, id: id, fields: [], stats: [], timers: [], submitted: false };
    forms.push(ent);
    return ent;
  }

  // Nazwa pola do analityki (MA-D13): tylko name / data-name albo statyczny
  // <label for>, nigdy placeholder ani wpisany tekst. Wygląda na e-mail albo
  // telefon → pole-N. Do 40 znaków: litery, cyfry, spacja, _ i -.
  function fieldName(el, n) {
    var raw = el.getAttribute('name') || el.getAttribute('data-name') || '';
    var id = el.getAttribute('id');
    if (!raw && id && /^[A-Za-z][\w-]*$/.test(id) && document.querySelector) {
      var label = document.querySelector('label[for="' + id + '"]');
      if (label) raw = label.textContent || '';
    }
    raw = String(raw);
    if (/@/.test(raw) || /^\+?[\d\s()-]{7,}$/.test(raw.trim())) return 'pole-' + n;
    var clean = raw.replace(FIELD_NAME_STRIP, '').replace(/\s+/g, ' ').trim().slice(0, 40);
    return clean || 'pole-' + n;
  }

  function fieldStat(ent, el) {
    for (var i = 0; i < ent.stats.length; i++) if (ent.stats[i].el === el) return ent.stats[i];
    if (ent.stats.length >= MAX_FORM_FIELDS) return null;
    var st = { el: el, name: fieldName(el, ent.stats.length + 1), ms: 0, clicks: 0, since: null };
    ent.stats.push(st);
    return st;
  }

  function fieldStats(ent) {
    return ent.stats.map(function (x) {
      var ms = x.ms + (x.since != null ? Date.now() - x.since : 0);
      return { name: x.name, ms: ms, clicks: x.clicks };
    });
  }

  // ma_form_field: jedno zdarzenie na pole, bez treści (§13.8.2a).
  function pushFieldEvents(formId, stats) {
    if (!tracking || !stats || !stats.length) return;
    window.dataLayer = window.dataLayer || [];
    stats.forEach(function (x) {
      window.dataLayer.push({ event: 'ma_form_field', form_id: formId, field_name: x.name, time_ms: x.ms, clicks: x.clicks });
    });
  }

  function sendFieldsOnce(ent) {
    if (ent.fieldsSent) return;
    ent.fieldsSent = true;
    pushFieldEvents(ent.id, fieldStats(ent));
  }

  function abandon(ent, idle, exit) {
    if (ent.submitted || !ent.fields.length) return;
    sendFieldsOnce(ent);
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
    var st = fieldStat(ent, e.target);
    if (st) {
      // Klik w pole daje focusin i zaraz click - to jedno wejście, nie dwa.
      if (e.type === 'focusin') { st.clicks += 1; st.focusAt = Date.now(); if (st.since == null) st.since = Date.now(); }
      // Safari nie daje fokusu checkboksom, radiom ani selectom po kliknięciu -
      // click liczy się także bez fokusu, byle nie tuż po focusin.
      else if (e.type === 'click' && !(st.focusAt != null && Date.now() - st.focusAt <= 500)) st.clicks += 1;
      else if (e.type === 'focusout' && st.since != null) { st.ms += Date.now() - st.since; st.since = null; }
    }
    if (e.type !== 'focusout') armForm(ent);
  }

  function hookForms() {
    if (formsHooked || !usesTrigger('form_abandon') || !document.addEventListener) return;
    formsHooked = true;
    ['focusin', 'focusout', 'click', 'input', 'change'].forEach(function (n) {
      document.addEventListener(n, onFormActivity, true);
    });
    document.addEventListener('submit', function (e) {
      for (var i = 0; i < forms.length; i++) {
        if (e && forms[i].form === e.target && !forms[i].submitted) {
          forms[i].submitted = true;
          forms[i].timers.forEach(clearTimeout);
          sendFieldsOnce(forms[i]);
        }
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
        fields: ent.fields.length, t: now(), created: Date.now(), visit: state.visits,
        stats: ent.fieldsSent ? null : fieldStats(ent) });
      ent.fieldsSent = true;
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
      pushFieldEvents(x.formId, x.stats);
      dispatch({ type: 'form_abandon', t: now(), data: { formId: x.formId, fields: x.fields, exit: true, visit: x.visit } });
    });
  }

  // Akcje stanu z every_time (§13.8.3a): treść i mapa żyją do przeładowania, więc
  // na każdej odsłonie wracają, jeśli ścieżka już do nich doszła. Bez częstotliwości
  // i bez dalszych kroków - to odtworzenie stanu, nie nowe zdarzenie.
  function replayStateActions() {
    if (!envelope) return;
    envelope.scenarios.forEach(function (sc) {
      var st = scState(sc);
      sc.order.forEach(function (id) {
        var node = sc.nodes[id];
        if (node.invalid || node.type !== 'action' || !STATE_ACTIONS[node['do']] || !st.nodes[id]) return;
        if (frequencyOf(node).kind !== 'every') return;
        if (node['do'] === 'content') {
          var text = node.image || node.video ? '' : contentText(node, st.nodes[id].unit || lastUnit());
          if (text != null) applyContent(node, text);
        } else {
          mapMark(sc, node);
        }
      });
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
  // Gorący lead wraca (MA-D38 etap 1, wariant D′; silnik
  // docs/architecture/ma-hot-lead-2destate.md §6.2). Opt-in atrybutem
  // d2-ma-hot-lead na tagu loadera - tylko strona dema i leady testowe
  // (Piotr 21.10). Zamiast tokenu leada 2destate dostaje visitorId z d2ma:
  // strona dokłada go do zgłoszenia ([d2-ma-visitor-id] albo
  // digi2.ma.visitorId()), a po powrocie d2-ma wysyła sygnał wizyty.
  // Ruch anonimowy nie wychodzi z przeglądarki (MA-D30): sygnał idzie tylko,
  // gdy w tej samej wizycie visitorId oddano formularzowi I był lead.
  // ---------------------------------------------------------------------------

  var VISIT_RESEND_MS = 5 * 60 * 1000;
  // ma.23: hot lead tylko do API produkcji 2destate (stagingu z /public/ma/* nie ma — 2destate 21.10).
  var HOT_LEAD_HOSTS = { 'api.2destate.com': 1 };
  var MAX_SIGNAL_UNITS = 20;
  var DEFAULT_HOT_LEAD_API = 'https://api.2destate.com/api/v1';
  var hotLeadTimer = null;

  function hotLeadOn() {
    return _cfg('d2-ma-hot-lead') !== null;
  }

  // Wartość atrybutu = baza API 2destate (https), pusta = produkcja.
  var hotLeadApiWarned = false;
  // null = adres spoza listy (ma.23): żadnego fetch do /visit ani /revoke.
  function hotLeadApi() {
    var v = _cfg('d2-ma-hot-lead') || '';
    if (!v) return DEFAULT_HOT_LEAD_API;
    if (allowedUrl(v, HOT_LEAD_HOSTS)) return v.replace(/\/+$/, '');
    if (!hotLeadApiWarned) {
      hotLeadApiWarned = true;
      _warn('d2-ma-hot-lead="' + v.slice(0, 120) + '" is not https://api.2destate.com — no visit signal, no revoke');
    }
    return null;
  }

  // visitorId oddany stronie (formularz) - zapamiętujemy wizytę, w której to było.
  function shareVisitorId() {
    if (!hotLeadOn() || !tracking || !state) return null;
    if (state.idShared !== state.visits) {
      state.idShared = state.visits;
      bindHotLead();
      save();
    }
    return state.visitorId;
  }

  // Powiązanie z leadem: identyfikator oddany i lead w tej samej wizycie.
  function bindHotLead() {
    if (!state || state.hotLead || state.idShared == null || state.idShared !== state.leadVisit) return;
    state.hotLead = { visit: state.visits, at: Date.now() };
    _log('hot lead bound — return visits signal 2destate');
  }

  function dropHotLead() {
    if (!state) return;
    delete state.hotLead;
    delete state.hotLeadSent;
    delete state.hotLeadRetryAt;
    if (hotLeadTimer) { clearTimeout(hotLeadTimer); hotLeadTimer = null; }
  }

  function viewedThisVisit() {
    var from = state.visitStart == null ? -Infinity : state.visitStart;
    var out = [];
    for (var i = views.length - 1; i >= 0 && out.length < MAX_SIGNAL_UNITS; i--) {
      var v = views[i];
      if (v.ts < from) break;
      var id = v.unit && v.unit.unitId;
      if (id && UUID_RE.test(id) && out.indexOf(id) < 0) out.push(id);
    }
    return out;
  }

  function retryAfter(r, fallbackS) {
    var s = r.headers && typeof r.headers.get === 'function' ? parseInt(r.headers.get('Retry-After'), 10) : NaN;
    return Date.now() + (isFinite(s) && s > 0 ? s : fallbackS) * 1000;
  }

  // Sygnał raz na wizytę powrotu, potem przyrost lokali najwyżej co 5 minut.
  function sendVisitSignal() {
    if (!hotLeadOn() || !tracking || !state || !state.hotLead || typeof fetch !== 'function' || !hotLeadApi()) return;
    if (state.visits <= state.hotLead.visit) return;    // wizyta formularza to nie powrót
    var nowReal = Date.now();
    if (state.hotLeadRetryAt && nowReal < state.hotLeadRetryAt) return;
    if (state.hotLeadMuteVisit === state.visits) return;
    var units = viewedThisVisit();
    var sent = state.hotLeadSent;
    if (sent && sent.visit === state.visits) {
      var fresh = units.some(function (u) { return sent.units.indexOf(u) < 0; });
      if (!fresh) return;
      var wait = VISIT_RESEND_MS - (nowReal - sent.at);
      if (wait > 0) {
        if (!hotLeadTimer) hotLeadTimer = setTimeout(function () { hotLeadTimer = null; sendVisitSignal(); }, wait + 50);
        return;
      }
    }
    var id = state.visitorId;
    state.hotLeadSent = { visit: state.visits, units: units, at: nowReal };
    save();
    var body = { visitorId: id, pageviews: Math.min(Math.max(state.visitPageviews || 1, 1), 50),
      source: 'return_visit' };
    // ma.24: units zawsze, także [] — serwer 2destate #189 wymaga pola (bez niego 422 i wyciszona wizyta).
    body.units = units;
    try {
      var base = hotLeadApi();
      if (!base) return;
      fetch(base + '/public/ma/visit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        credentials: 'omit', mode: 'cors', keepalive: true
      }).then(function (r) {
        if (!r || r.ok) return;
        var same = state && state.visitorId === id;
        if (r.status === 401) {
          // Nieznany, odwołany albo wygasły visitorId - powiązania już nie ma.
          _log('visit signal refused (401) — hot lead unbound');
          if (same) { dropHotLead(); save(); }
        } else if (r.status === 403) {
          // Zły Origin albo lead niekwalifikowany - nie zrywamy, wstrzymujemy na dobę.
          _warn('visit signal refused (403) — Origin not on the project list or lead not eligible; paused 24 h');
          if (same) { state.hotLeadRetryAt = Date.now() + DAY_MS; save(); }
        } else if (r.status === 404) {
          // Trasa jeszcze niewdrożona - nie pukamy co 5 minut, wracamy za dobę.
          _warn('visit signal answered 404 — route not live; paused 24 h');
          if (same) { state.hotLeadRetryAt = Date.now() + DAY_MS; save(); }
        } else if (r.status === 413 || r.status === 422) {
          // Treść odrzucona - w tej wizycie ten sam sygnał nie przejdzie.
          _warn('visit signal answered ' + r.status + ' — no more signals this visit');
          if (same) { state.hotLeadMuteVisit = state.visits; save(); }
        } else if (r.status === 429 || r.status === 503) {
          if (same) { state.hotLeadRetryAt = retryAfter(r, 3600); save(); }
        } else {
          _warn('visit signal answered ' + r.status);
        }
      }, function (e) { _log('visit signal failed', e); });
    } catch (e) {
      _log('visit signal failed', e);
    }
    _log('visit signal → 2destate', body);
  }

  // „Wyczyść" i wycofanie zgody: najpierw /revoke w 2destate, potem lokalnie
  // (bez czekania na odpowiedź). Wystarczy oddany visitorId - 2destate wiąże
  // lead po samym d2ma_visitor_id, także gdy strona nie zobaczyła leada;
  // /revoke odpowiada 204 i dla nieznanego id, więc nic nie zdradza.
  function revokeHotLead(st) {
    st = st || state;
    if (!st || (st.idShared == null && !st.hotLead) || !st.visitorId) return;
    if (!hotLeadOn() || typeof fetch !== 'function' || !hotLeadApi()) return;
    try {
      var rbase = hotLeadApi();
      if (!rbase) return;
      fetch(rbase + '/public/ma/revoke', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: st.visitorId }),
        credentials: 'omit', mode: 'cors', keepalive: true
      }).then(null, function (e) { _log('revoke failed', e); });
    } catch (e) { _log('revoke failed', e); }
  }

  // Ukryte pole [d2-ma-visitor-id] dostaje visitorId w chwili wysłania
  // formularza (faza capture, przed handlerami strony). Bez zgody - puste.
  // d2-ma niczego nie wysyła sam i nie blokuje wysyłki.
  var idFieldsHooked = false;
  function hookVisitorIdFields() {
    if (idFieldsHooked || !hotLeadOn() || !document.addEventListener) return;
    idFieldsHooked = true;
    document.addEventListener('submit', function (e) { fillVisitorId(e && e.target); }, true);
    // ma.24: jak kontekst leadu — klik w przycisk wysyłki wyprzedza submit.
    document.addEventListener('click', function (e) { fillVisitorId(submitFormOf(e && e.target)); }, true);
  }

  function fillVisitorId(form) {
    if (!form || !form.querySelectorAll) return;
    var fields = form.querySelectorAll('[d2-ma-visitor-id], [data-d2-ma-visitor-id]');
    if (!fields.length) return;
    var id = shareVisitorId();
    for (var i = 0; i < fields.length; i++) fields[i].value = id || '';
  }

  // Formularz, który wyśle klik w ten element (przycisk / input type=submit), albo null.
  function submitFormOf(t) {
    if (!t || typeof t.closest !== 'function') return null;
    var form = t.closest('form');
    if (!form) return null;
    var btn = t.closest('button, input[type="submit"]') || t;
    var type = (btn.getAttribute && btn.getAttribute('type')) || '';
    if (!type && btn.tagName && String(btn.tagName).toUpperCase() === 'BUTTON') type = 'submit';
    return String(type).toLowerCase() === 'submit' ? form : null;
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

  // ---------------------------------------------------------------------------
  // Atrybuty d2-ma-show-* / d2-ma-hide-* i bloki d2-ma-variant (ma.5, §13.11.2a).
  // Decyzja w przeglądarce, z profilu d2ma; atrybut niczego nie wysyła. Bez zgody
  // żaden warunek show nie pasuje - zostaje treść domyślna. Błędny warunek = ukryty.
  // ---------------------------------------------------------------------------

  var COND_KEYS = { visits: 1, views: 1, 'views-rooms': 1, 'views-floor': 1, 'views-unit': 1, segment: 1, lead: 1,
    'pref-rooms': 1, 'pref-floor': 1 };
  var COND_RE = /^(?:data-)?d2-ma-(show|hide)-(.+)$/;
  var COUNTER_RE = /^(\d{1,3})(\+|\.\.(\d{1,3}))?(?:\/(\d{1,3})([dh]))?$/;
  var FEATURE_RE = /^-?\d{1,3}$/;
  var UNIT_ID_RE = /^[A-Za-z0-9._-]{1,64}$/;
  var NAME_RE = /^[a-z0-9-]{1,40}$/;
  var condEls = null;        // elementy z warunkami, zebrane raz (apply() zbiera od nowa)

  function condAttrs(el) {
    var out = [];
    var names = [];
    if (el && typeof el.getAttributeNames === 'function') names = el.getAttributeNames();
    else if (el && el.attributes) for (var j = 0; j < el.attributes.length; j++) names.push(el.attributes[j].name);
    for (var i = 0; i < names.length; i++) {
      var m = COND_RE.exec(String(names[i]).toLowerCase());
      if (m) out.push({ mode: m[1], key: m[2], value: el.getAttribute(names[i]) });
    }
    return out;
  }

  function scanConditions() {
    condEls = [];
    if (!document.querySelectorAll) return;
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var c = condAttrs(all[i]);
      if (c.length) condEls.push({ el: all[i], conds: c });
    }
  }

  // "3+" co najmniej, "3" dokładnie, "0..2" najwyżej 2; "/30d" albo "/12h" = okno.
  function parseCounter(v) {
    var m = COUNTER_RE.exec(v);
    if (!m) return null;
    var min = parseInt(m[1], 10);
    var max = m[2] === '+' ? Infinity : (m[3] != null ? parseInt(m[3], 10) : min);
    if (max < min) return null;
    return { min: min, max: max, win: m[4] ? parseInt(m[4], 10) * (m[5] === 'd' ? DAY_MS : HOUR_MS) : null };
  }

  function inCounter(c, n) {
    return n >= c.min && n <= c.max;
  }

  function viewsSince(c, test) {
    var from = c.win == null ? -Infinity : now() - c.win;
    return views.filter(function (v) { return v.ts >= from && test(v.unit || {}); }).length;
  }

  // Dzielone na ostatnim „:" - cecha może być ujemna (piętro −1).
  function splitLast(v) {
    var i = v.lastIndexOf(':');
    return i < 1 ? null : [v.slice(0, i), v.slice(i + 1)];
  }

  // true / false; null = błędna wartość (element zostaje ukryty).
  function altMatches(key, v, profile) {
    var c, parts, f;
    switch (key) {
      case 'visits':
        if (!(c = parseCounter(v))) return null;
        if (!profile) return false;
        if (c.win == null) return inCounter(c, state.visits);
        var from = now() - c.win;
        return inCounter(c, (state.visitLog || []).filter(function (t) { return t >= from; }).length);
      case 'views':
        if (!(c = parseCounter(v))) return null;
        return profile ? inCounter(c, viewsSince(c, function () { return true; })) : false;
      case 'views-rooms':
      case 'views-floor':
        if (!(parts = splitLast(v)) || !FEATURE_RE.test(parts[0]) || !(c = parseCounter(parts[1]))) return null;
        f = parseInt(parts[0], 10);
        var field = key === 'views-rooms' ? 'rooms' : 'floor';
        return profile ? inCounter(c, viewsSince(c, function (u) { return u[field] === f; })) : false;
      case 'views-unit':
        if (!(parts = splitLast(v)) || !UNIT_ID_RE.test(parts[0]) || !(c = parseCounter(parts[1]))) return null;
        return profile ? inCounter(c, viewsSince(c, function (u) { return u.unitId === parts[0]; })) : false;
      case 'segment':
        if (!NAME_RE.test(v)) return null;
        return profile ? !!(state.segments && state.segments[v] != null) : false;
      case 'lead':
        if (v !== 'true' && v !== 'false') return null;
        return profile ? !!state.lead === (v === 'true') : false;
      case 'pref-rooms':
      case 'pref-floor':
        if (!FEATURE_RE.test(v)) return null;
        return profile ? prefOf(key.slice(5)) === parseInt(v, 10) : false;
    }
    return null;
  }

  function condMatches(cond, profile) {
    if (!COND_KEYS[cond.key]) return null;
    var any = false;
    var alts = String(cond.value == null ? '' : cond.value).split('|');
    for (var i = 0; i < alts.length; i++) {
      var r = altMatches(cond.key, alts[i].trim(), profile);
      if (r === null) return null;
      if (r) any = true;
    }
    return any;
  }

  // ?d2-ma-preview=<segment|wariant> - podgląd w Webflow: element z tym segmentem
  // albo wariant o tej nazwie pasuje, bez zapisu w d2ma i bez dataLayer.
  function previewName() {
    var p = param('d2-ma-preview');
    return p && NAME_RE.test(p) ? p : null;
  }

  // { show, hidden, invalid } dla elementu z warunkami.
  function evaluate(el, conds) {
    var profile = tracking && !!state;
    var preview = previewName();
    var hasShow = false;
    var showOk = true;
    var hidden = false;
    var invalid = false;
    conds.forEach(function (c) {
      var r = condMatches(c, profile);
      if (r === null) { invalid = true; return; }
      if (preview) {
        if (c.mode === 'show') {
          hasShow = true;
          if (!(c.key === 'segment' && String(c.value).split('|').indexOf(preview) >= 0)) showOk = false;
        }
        return;
      }
      if (c.mode === 'show') { hasShow = true; if (!r) showOk = false; } else if (r) { hidden = true; }
    });
    if (invalid && !el._d2maWarned) {
      el._d2maWarned = true;
      _warn('element with an unknown or malformed d2-ma-show-/hide- condition stays hidden', conds.map(function (c) {
        return 'd2-ma-' + c.mode + '-' + c.key + '="' + c.value + '"';
      }).join(' '));
    }
    return { show: hasShow && showOk && !hidden && !invalid, hidden: hidden || invalid, hasShow: hasShow };
  }

  function flag(el, name, on) {
    if (on) { if (el.getAttribute(name) === null) el.setAttribute(name, ''); } else if (el.getAttribute(name) !== null) {
      el.removeAttribute(name);
    }
  }

  function inVariants(el) {
    return _attr(el, 'd2-ma-variant') !== null && el.parentNode && _attr(el.parentNode, 'd2-ma-variants') !== null;
  }

  // CSS strony ukrywa [d2-ma-cond]:not([d2-ma-shown]) - stąd d2-ma-shown także
  // na elemencie z samym hide, gdy wykluczenie nie pasuje. Element z warunkami
  // bez znacznika d2-ma-cond (literówka w Webflow) ukrywa skrypt atrybutem hidden.
  function applyConditions() {
    if (!document.querySelectorAll) return;
    if (!condEls) scanConditions();
    condEls.forEach(function (x) {
      if (inVariants(x.el)) return;
      var r = evaluate(x.el, x.conds);
      var marked = _attr(x.el, 'd2-ma-cond') !== null;
      if (!marked && !x.el._d2maNoMark) {
        x.el._d2maNoMark = true;
        _warn('element with d2-ma-show-/hide- has no d2-ma-cond — hidden by the script');
      }
      var shown = !r.hidden && (!r.hasShow || r.show);
      flag(x.el, 'd2-ma-shown', marked && shown);
      flag(x.el, 'd2-ma-hidden', r.hidden || !marked);
      if (!marked) flag(x.el, 'hidden', true);
    });
    // Bloki alternatywne: pierwszy pasujący wygrywa, domyślny znika, gdy któryś pasuje.
    var boxes = document.querySelectorAll('[d2-ma-variants], [data-d2-ma-variants]');
    var preview = previewName();
    for (var i = 0; i < boxes.length; i++) {
      var kids = boxes[i].children || [];
      var chosen = null;
      for (var j = 0; j < kids.length; j++) {
        var name = _attr(kids[j], 'd2-ma-variant');
        if (name === null || name === 'default') continue;
        var ok = false;
        if (preview && name === preview) ok = true;
        else {
          var r = evaluate(kids[j], condAttrs(kids[j]));
          ok = r.hasShow && r.show;
        }
        if (ok && !chosen) chosen = kids[j];
      }
      for (var k = 0; k < kids.length; k++) {
        if (_attr(kids[k], 'd2-ma-variant') !== null) flag(kids[k], 'd2-ma-shown', kids[k] === chosen);
      }
      flag(boxes[i], 'd2-ma-matched', !!chosen);
    }
    resumePopups();
  }

  // Popup z warunkiem d2-ma, który czekał (veto w module popupów), dostaje drugą szansę.
  // Zanim moduł popupów się załaduje, digi2.popups to proxy loadera: każda
  // właściwość jest funkcją, która dociąga moduł i zwraca Promise. Test kształtu
  // ją przepuszcza, a list().forEach rzucało i przerywało start d2-ma (#16).
  // Dlatego pytamy loader, czy moduł już jest; bez loadera zostaje test kształtu.
  // Popup, który załaduje się później, sam pyta digi2.ma.allows() przy otwarciu,
  // a kolejna zmiana profilu trafia już w prawdziwy moduł.
  function resumePopups() {
    var loaded = window.digi2._loaded;
    if (loaded && !loaded.popups) return;
    var p = window.digi2.popups;
    if (!p || typeof p.list !== 'function' || typeof p.get !== 'function') return;
    try {
      var names = p.list();
      if (!names || typeof names.forEach !== 'function') return;
      names.forEach(function (name) {
        var inst = p.get(name);
        if (inst && inst.pendingShow && inst.popupElement && condAttrs(inst.popupElement).length && allows(inst.popupElement)) {
          inst.showIfPending({ auto: true });
        }
      });
    } catch (e) {
      // Błąd w module popupów nie może zatrzymać d2-ma (render, ma:ready, podświetlenie mapy).
      _warn('popups resume failed', e);
    }
  }

  // Czy element wolno pokazać - pyta moduł popupów (veto jak canShow, §13.11.3).
  function allows(el) {
    if (!el) return true;
    var conds = condAttrs(el);
    if (!conds.length) return true;
    var r = evaluate(el, conds);
    return !r.hidden && (!r.hasShow || r.show) && (_attr(el, 'd2-ma-cond') !== null || inVariants(el));
  }

  var historyTemplates = [];
  function render() {
    applyConditions();
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
      if (visit) { var pass = { popup: false }; state.visitPageviews = 1; dispatch(visit, pass); sendVisitSignal(); runDue(pass); }
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
    if (kind === 'update' && mountedVideos.length && videoCategories().some(function (c) { return st[c] != null; })) refreshVideos();
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

  // ma.31: odmowa w stanie tagu Google tylko z update - samo default to nie
  // decyzja gościa (szablon CMP w GTM stawia je zawsze przed banerem).
  function googleTagDenied() {
    try {
      var e = window.google_tag_data.ics.entries[consentCategory()];
      return !!e && e.update === false;
    } catch (x) { return false; }
  }

  function googleTagUpdated() {
    try {
      var e = window.google_tag_data.ics.entries[consentCategory()];
      return !!e && e.update !== undefined;
    } catch (x) { return false; }
  }

  // Kolejność źródeł Consent Mode: update z dataLayer rozstrzyga, potem stan
  // tagu Google (liczy region), potem default z region (tylko jako odmowa),
  // potem default bez region. Gdy żadne nie zna kategorii - moduł google biblioteki
  // albo jego zapis w localStorage.
  //
  // ma.31 (decyzja Piotra 28.10.2026): trzy stany. 'granted' otwiera bazę,
  // 'denied' to jawna odmowa (update w dataLayer albo w tagu Google, zapis
  // modułu google) i kasuje bazę, null = nieznana (nic albo samo default,
  // także z region): bazy nie otwieramy, nie zapisujemy i nie kasujemy.
  function consentState() {
    if (gtagConsent.update) return gtagConsent.update;
    var tag = googleTagConsent();
    if (tag === 'granted' && googleTagUpdated()) return tag;
    if (googleTagDenied()) return 'denied';
    // Zapis modułu google to decyzja gościa, a moduł odtwarza ją przy starcie
    // jako default - dlatego przed gałęziami default (ma.31, recenzja #38).
    var saved = savedConsent();
    if (saved) return saved;
    if (tag === 'granted') return tag;
    if (tag === 'denied') return null;
    // Regionalna odmowa przed ogólnym default: bez stanu tagu Google (wolny
    // gtag.js, adblock) nie wiemy, czy odwiedzający nie jest w tamtym regionie.
    if (gtagConsent.regionDenied) return null;
    if (gtagConsent['default']) return gtagConsent['default'] === 'granted' ? 'granted' : null;
    return null;
  }

  // Wybór zapisany przez moduł google po decyzji na banerze. Jego get() bez
  // zapisu zwraca same domyślne odmowy, więc czytamy sam zapis.
  function savedConsent() {
    var c = null;
    try { c = JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY) || 'null'); } catch (e) { c = null; }
    var v = c && c[consentCategory()];
    return v === 'granted' || v === 'denied' ? v : null;
  }

  function hasConsent() {
    return consentState() === 'granted';
  }

  function consentChanged(granted) {
    if (granted) revoked = false;
    if (granted && blocked) { blocked = false; holding = false; openStore(); }
    // ma.33: zgoda przyszła, gdy baza była już otwarta bez niej (zgoda niewymagana) -
    // od teraz zbieramy historię źródeł, z wpisem tej odsłony.
    if (granted && tracking && !openedWithConsent) {
      openedWithConsent = true;
      state.consentAt = now();
      addTouchpoint(now(), touchVisitPending);
      touchVisitPending = false;
      afterChange();
    }
    // ma.33: odmowa przy niewymaganej zgodzie - baza zostaje, historia źródeł znika.
    if (!granted && tracking && !consentRequired(envelope) && openedWithConsent) {
      openedWithConsent = false;
      delete state.consentAt;
      delete state.touchpoints;
      afterChange();
    }
    if (!granted && consentRequired(envelope)) {
      if (tracking) wipe('consent withdrawn');
      else if (opening) revoked = true;
      // ma.31: jawna odmowa w trakcie czekania kasuje bazę z poprzednich wizyt.
      // Przed decide() (koperta jeszcze nieznana) rozstrzyga sam decide().
      else if (holding) wipe('consent denied');
    }
  }

  // Zgoda wymagana, a jej nie ma: przestajemy i kasujemy to, co było zebrane
  // (wycofana zgoda, koperta przełączona na consentRequired, baza z czasów,
  // gdy zgoda nie była wymagana).
  function wipe(reason) {
    _log('no consent — d2ma deleted (' + reason + ')');
    var hadState = !!state;
    holding = false;
    openedWithConsent = false;
    pageTouchUsed = false;
    touchVisitPending = false;
    revokeHotLead();
    if (hotLeadTimer) { clearTimeout(hotLeadTimer); hotLeadTimer = null; }
    tracking = false;
    blocked = true;
    views = [];
    state = null;
    buffer = [];
    if (dueTimer) { clearTimeout(dueTimer); dueTimer = null; }
    markWaiting = [];
    profileEpoch++;
    cancelTooltipWaits();
    restoreSlots();
    resetSignals();
    resetOrder();
    var s = store || window.digi2._maStore || idbStore() || memoryStore();
    _queue(function () {
      // Zgoda wycofana między wizytami (wykryta przy starcie): stanu nie ma
      // w pamięci, więc visitorId do /revoke czytamy z bazy tuż przed jej
      // usunięciem - sam rekord state i tylko w tym celu. Bazy, której nie
      // ma, peekState nie zakłada.
      var peek = !hadState && hotLeadOn()
        ? (typeof s.peekState === 'function' ? s.peekState()
          : typeof s.load === 'function' ? s.load().then(function (d) { return d && d.state; }) : null)
        : null;
      var before = peek ? Promise.resolve(peek).then(function (st) { revokeHotLead(st); }, function () {}) : null;
      return Promise.resolve(before).then(function () { return s.clear(); });
    });
    render();
    _emit('ma:change', { cleared: true, tracking: false, reason: reason });
  }

  // ---------------------------------------------------------------------------
  // Kontekst leadu w formularzu (ma.16): dwa ukryte pola z profilu przy każdej
  // wysyłce (poza [d2-ma-ignore]); tylko po zgodzie — ta sama bramka co profil.
  // d2ma_context: tekst po polsku dla handlowca (≤ 2000 znaków, ucinany od
  // najstarszych wizyt, potem lokali); d2ma_context_json: zwięzły JSON (≤ 4 kB).
  // Pola dopisujemy w fazie przechwytywania na dokumencie, więc przed Webflow
  // (bąbelkowanie na formularzu) i przed d2-forms (przechwytywanie na formularzu).
  // ---------------------------------------------------------------------------
  var CTX_FIELD = 'd2ma_context';
  var CTX_JSON_FIELD = 'd2ma_context_json';
  // ma.18: znacznik zgody dla serwera 2destate (#203) — zapisuje kontekst tylko przy "1".
  var CTX_CONSENT_FIELD = 'd2ma_consent';
  var CTX_TEXT_MAX = 2000;
  var CTX_JSON_MAX = 4096;
  var CTX_NO_CONSENT = 'brak kontekstu (brak zgody)';
  var CTX_UNITS_MAX = 30;
  var CTX_VISITS_MAX = 60;
  var CTX_TOUCHPOINTS_MAX = 10;

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function ctxDay(ts) { var d = new Date(ts); return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1); }
  function ctxTime(ts) { var d = new Date(ts); return ctxDay(ts) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function ctxIso(ts) { try { return new Date(ts).toISOString(); } catch (e) { return null; } }
  function ctxPlural(n, one, few, many) {
    if (n === 1) return one;
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) return few;
    return many;
  }
  function ctxFloor(f) {
    if (f == null) return null;
    if (f === 0) return 'parter';
    return f < 0 ? 'poziom ' + f : f + ' p.';
  }
  function utf8Len(str) {
    var n = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) n += 1;
      else if (c < 0x800) n += 2;
      else if (c >= 0xD800 && c < 0xDC00) { n += 4; i++; }
      else n += 3;
    }
    return n;
  }

  // Dane kontekstu z profilu (§13.2). null = brak zgody albo brak profilu.
  function contextData() {
    if (!tracking || !state) return null;
    var byId = {};
    var units = [];
    views.forEach(function (v) {
      var u = v.unit || {};
      if (u.unitId == null) return;
      var e = byId[u.unitId];
      if (!e) {
        e = { id: u.unitId, name: null, rooms: null, floor: null, area: null, price: null, views: 0, last: 0 };
        byId[u.unitId] = e;
        units.push(e);
      }
      e.views += 1;
      if (v.ts > e.last) e.last = v.ts;
      // Najświeższe dane lokalu (cena mogła się zmienić między obejrzeniami).
      ['name', 'rooms', 'floor', 'area', 'price'].forEach(function (k) { if (u[k] != null) e[k] = u[k]; });
    });
    units.sort(function (a, b) { return b.last - a.last; });
    var log = (state.visitLog || []).slice();
    if (!log.length && state.visitStart != null) log = [state.visitStart];
    var visits = log.map(function (t) { return { t: t }; });
    var path = null;
    try { path = (window.location && window.location.pathname) || null; } catch (e) {}
    // Ścieżka znana tylko dla bieżącej odsłony: wizyt wstecz moduł nie zapisuje.
    if (visits.length && path) visits[visits.length - 1].path = path;
    var utm = state.utm || null;
    var last = lastUnit();
    return {
      visits: visits, visitCount: state.visits, units: units,
      pref: { rooms: prefOf('rooms'), floor: prefOf('floor') },
      segments: Object.keys(state.segments || {}),
      lastUnit: last ? { id: last.unitId, name: last.name || null } : null,
      lead: !!state.lead, leadAt: state.leadAt || null,
      source: utm ? { utm_source: utm.source || null, utm_medium: utm.medium || null, utm_campaign: utm.campaign || null } : null,
      path: path,
      filters: state.filters ? _clone(state.filters) : null,
      touchpoints: openedWithConsent ? (state.touchpoints || []).slice() : []
    };
  }

  // „filtrował: 2–3 pokoje, piętro 1, 40–60 m², do 700 000 zł, budynek B” (ma.17).
  function filtersLabel(f) {
    if (!f) return null;
    var bits = [];
    if (f.rooms && f.rooms.length) {
      var r = f.rooms.slice().sort(function (a, b) { return a - b; });
      var contiguous = r.length > 1 && r[r.length - 1] - r[0] === r.length - 1;
      bits.push(r.length === 1 ? roomsLabel(r[0]) : (contiguous ? r[0] + '–' + r[r.length - 1] : r.join(', ')) + ' pokoje');
    }
    if (f.floor && f.floor.length) bits.push(f.floor.length === 1 ? (ctxFloor(f.floor[0]) === 'parter' ? 'parter' : 'piętro ' + f.floor[0]) : 'piętra ' + f.floor.join(', '));
    if (f.areaMin != null || f.areaMax != null) {
      bits.push(f.areaMin != null && f.areaMax != null ? fmtNumber(f.areaMin, 1) + '–' + fmtNumber(f.areaMax, 1) + ' m²'
        : (f.areaMin != null ? 'od ' + fmtNumber(f.areaMin, 1) : 'do ' + fmtNumber(f.areaMax, 1)) + ' m²');
    }
    if (f.priceMin != null || f.priceMax != null) {
      bits.push(f.priceMin != null && f.priceMax != null ? fmtNumber(f.priceMin, 0) + '–' + fmtNumber(f.priceMax, 0) + ' zł'
        : (f.priceMin != null ? 'od ' + fmtNumber(f.priceMin, 0) : 'do ' + fmtNumber(f.priceMax, 0)) + ' zł');
    }
    if (f.building && f.building.length) bits.push('budynek ' + f.building.join(', '));
    if (f.status && f.status.length && !(f.status.length === 1 && f.status[0] === 'available')) bits.push('status ' + f.status.join(', '));
    else if (f.status && f.status[0] === 'available') bits.push('tylko wolne');
    return bits.length ? bits.join(', ') : null;
  }

  function ctxUnitLabel(e) {
    var bits = [];
    if (e.rooms != null) bits.push(e.rooms + ' pok.');
    if (e.floor != null) bits.push(ctxFloor(e.floor));
    if (e.area != null) bits.push(fmtNumber(e.area, 1) + ' m²');
    if (e.price != null) bits.push(fmtNumber(e.price, 0) + ' zł');
    return (e.name || e.id) + (bits.length ? ' (' + bits.join(', ') + ')' : '');
  }

  // Tekst dla handlowca. Za długi: najpierw znikają najstarsze daty wizyt,
  // potem najstarsze lokale z listy; liczby wizyt i lokali zostają prawdziwe.
  function contextText(d) {
    var dates = d.visits.map(function (v) { return ctxDay(v.t); });
    var list = d.units.slice();   // od najnowszego
    var top = null;
    d.units.forEach(function (e) { if (!top || e.views > top.views) top = e; });
    for (;;) {
      var parts = [];
      var n = d.visitCount;
      var dropped = d.visits.length - dates.length;
      parts.push(n + ' ' + ctxPlural(n, 'wizyta', 'wizyty', 'wizyt')
        + (dates.length ? ' (' + (dropped ? '…, ' : '') + dates.join(', ') + ')' : ''));
      if (d.units.length) {
        var m = d.units.length;
        parts.push(m + ' ' + ctxPlural(m, 'obejrzany lokal', 'obejrzane lokale', 'obejrzanych lokali')
          + ', najczęściej ' + ctxUnitLabel(top) + ' ×' + top.views);
        if (list.length) {
          parts.push('lokale: ' + list.map(function (e) {
            return (e.name || e.id) + ' ×' + e.views + ' (' + ctxTime(e.last) + ')';
          }).join(', ') + (list.length < d.units.length ? ', …' : ''));
        }
      } else {
        parts.push('bez obejrzanych lokali');
      }
      var pref = [];
      if (d.pref.rooms != null) pref.push(roomsLabel(d.pref.rooms));
      if (d.pref.floor != null) pref.push(ctxFloor(d.pref.floor));
      if (pref.length) parts.push('preferencja: ' + pref.join(', '));
      var fl = filtersLabel(d.filters);
      if (fl) parts.push('filtrował: ' + fl);
      if (d.segments.length) parts.push('segmenty: ' + d.segments.join(', '));
      if (d.lead) parts.push('lead: tak' + (d.leadAt ? ' (' + ctxDay(d.leadAt) + ')' : ''));
      if (d.lastUnit) parts.push('ostatni lokal: ' + (d.lastUnit.name || d.lastUnit.id));
      if (d.path) parts.push('strona: ' + d.path);
      if (d.source) {
        parts.push('źródło: ' + [d.source.utm_source, d.source.utm_medium, d.source.utm_campaign]
          .filter(function (x) { return x; }).join(' / '));
      }
      // ma.33: źródła kolejnych wizyt, najwyżej 5 ostatnich.
      var tps = (d.touchpoints || []).slice(-5);
      if (tps.length > 1) {
        parts.push('źródła wizyt: ' + ((d.touchpoints.length > tps.length) ? '…, ' : '') + tps.map(function (e) {
          return e.utm_source ? e.utm_source + (e.utm_medium ? '/' + e.utm_medium : '')
            : e.click_type !== 'none' ? e.click_type : e.referrer_host || 'bezpośrednio';
        }).join(' → '));
      }
      var text = parts.join(' · ');
      if (text.length <= CTX_TEXT_MAX) return text;
      if (dates.length > 1) dates.shift();
      else if (list.length) list.pop();
      else return text.slice(0, CTX_TEXT_MAX - 1) + '…';
    }
  }

  // JSON ≤ 4 kB (bajty UTF-8): za duży traci najstarsze wizyty, potem lokale.
  function contextJson(d) {
    var units = d.units.slice(0, CTX_UNITS_MAX);
    var visits = d.visits.slice(-CTX_VISITS_MAX);
    // ma.33: w JSON-ie najwyżej 10 ostatnich (pełne 20 zostaje w profilu);
    // przy przepełnieniu odpadają przed wizytami - serwer 2destate odrzuca
    // cały context_json > 4096 B.
    var touches = (d.touchpoints || []).slice(-CTX_TOUCHPOINTS_MAX);
    for (;;) {
      var o = {
        v: 1,
        visits: visits.map(function (v) { var x = { t: ctxIso(v.t) }; if (v.path) x.path = v.path; return x; }),
        units: units.map(function (e) {
          return { id: e.id, name: e.name, rooms: e.rooms, floor: e.floor, area: e.area, price: e.price, views: e.views, last: ctxIso(e.last) };
        }),
        pref: d.pref, segments: d.segments, last_unit: d.lastUnit, lead: d.lead, source: d.source
      };
      if (touches.length) o.touchpoints = { v: 1, items: touchpointsOut(touches) };
      if (d.filters) {
        var jf = {};
        ['rooms', 'floor', 'areaMin', 'areaMax', 'priceMin', 'priceMax', 'status', 'building'].forEach(function (k) {
          if (d.filters[k] != null) jf[k] = d.filters[k];
        });
        jf.t = ctxIso(d.filters.ts);
        o.filters = jf;
      }
      var str = JSON.stringify(o);
      if (utf8Len(str) <= CTX_JSON_MAX) return str;
      if (touches.length) touches.shift();
      else if (visits.length > 1) visits.shift();
      else if (units.length) units.pop();
      else return str;
    }
  }

  function ctxOff() {
    var v = _cfg('d2-ma-context');
    return v === 'off' || v === 'false';
  }

  function ctxField(form, name) {
    try { return form.querySelector('[name="' + name + '"]'); } catch (e) { return null; }
  }

  function setCtxField(form, name, value) {
    var el = ctxField(form, name);
    if (!el) {
      el = document.createElement('input');
      el.setAttribute('type', 'hidden');
      el.setAttribute('name', name);
      el.setAttribute('data-name', name);
      el.type = 'hidden';
      el.name = name;
      form.appendChild(el);
    }
    el.value = value;
    el.setAttribute('value', value);
  }

  // Dopisuje (albo nadpisuje) pola w formularzu. true = formularz obsłużony.
  // Tekst zawsze; JSON tylko dla formularza z d2-ma-context="json" (opt-in:
  // w natywnym mailu Webflow JSON byłby śmieciem; dostaje go webhook 2destate).
  function fillContext(form) {
    if (!form || !form.tagName || String(form.tagName).toUpperCase() !== 'FORM') return false;
    if (ctxOff()) return false;
    if (form.closest && form.closest('[d2-ma-ignore], [data-d2-ma-ignore]')) return false;
    // Filtr zmieniony tuż przed wysyłką (< 500 ms) też jest w kontekście (ma.19).
    flushFilter();
    var wantJson = _attr(form, 'd2-ma-context') === 'json';
    var d = contextData();
    if (!d) {
      setCtxField(form, CTX_FIELD, CTX_NO_CONSENT);
      // Bez zgody znacznika nie dokładamy; własne pole strony o tej nazwie opróżniamy.
      var c = ctxField(form, CTX_CONSENT_FIELD);
      if (c) { c.value = ''; c.setAttribute('value', ''); }
      // Własne pole strony na JSON zostaje, ale puste; nowego nie dokładamy.
      var j = wantJson ? ctxField(form, CTX_JSON_FIELD) : null;
      if (j) { j.value = ''; j.setAttribute('value', ''); }
      return true;
    }
    setCtxField(form, CTX_FIELD, contextText(d));
    setCtxField(form, CTX_CONSENT_FIELD, '1');
    if (wantJson) setCtxField(form, CTX_JSON_FIELD, contextJson(d));
    return true;
  }

  var ctxHooked = false;
  function hookContext() {
    if (ctxHooked || ctxOff() || !document.addEventListener) return;
    ctxHooked = true;
    document.addEventListener('submit', function (e) { fillContext(e && e.target); }, true);
    // Klik w przycisk wysyłki wyprzedza submit: skrypt strony, który czyta
    // formularz już w handlerze kliknięcia, też dostaje pola.
    document.addEventListener('click', function (e) {
      var form = submitFormOf(e && e.target);
      if (form) fillContext(form);
    }, true);
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
    // ma.23 (§13.3): koperta tylko z digi2.app albo api.2destate.com, po https.
    if (!allowedUrl(url, ENVELOPE_HOSTS)) {
      _warn('envelope address "' + String(url).slice(0, 120) + '" is not on digi2.app or api.2destate.com (https) — not fetched, the page runs without MA');
      return Promise.resolve(null);
    }
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
    var cs = consentRequired(env) ? consentState() : 'granted';
    if (cs === 'denied') {
      wipe('consent denied');
      waitForConsent();
      _log('consent denied → ' + consentCategory());
      _emit('ma:ready', { tracking: false });
      return Promise.resolve();
    }
    if (cs !== 'granted') return hold(env);
    waitForConsent();
    return openStore();
  }

  // ma.31: zgoda jeszcze nieznana (CMP z GTM odpowiada po starcie modułu).
  // Bazy nie otwieramy i nie kasujemy - czytamy tylko rekord state i kasujemy
  // bazę, gdy nie była otwarta za zgodą (zebrana bez wymogu albo sprzed ma.31)
  // albo ostatnie otwarcie za zgodą jest starsze niż retencja.
  function hold(env) {
    blocked = true;
    holding = true;
    // Warunki d2-ma-show-* i podgląd ?d2-ma-preview liczą się bez profilu, jak po wipe().
    render();
    waitForConsent();
    _log('waiting for consent → ' + consentCategory());
    _emit('ma:ready', { tracking: false });
    var s = window.digi2._maStore || idbStore() || memoryStore();
    var peek = typeof s.peekState === 'function' ? s.peekState()
      : typeof s.load === 'function' ? s.load().then(function (d) { return d && d.state; }) : null;
    return Promise.resolve(peek).then(function (st) {
      if (!st || !holding || tracking || opening) return;
      var days = env && num(env.storage.retentionDays);
      if (!days || days <= 0) days = DEFAULT_RETENTION_DAYS;
      if (st.consentAt == null) wipe('profile not opened with consent');
      else if (Date.now() + (st.shift || 0) - st.consentAt > days * DAY_MS) wipe('consent older than retention');
    }, function () {});
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
      holding = false;
      prune();
      // ma.31: znacznik dla startu z nieznaną zgodą (hold) - baza otwarta za zgodą i kiedy.
      openedWithConsent = hasConsent();
      // Znacznik = ostatnie otwarcie za zgodą; otwarcie bez wymogu go zdejmuje.
      if (openedWithConsent) state.consentAt = now();
      else delete state.consentAt;
      applyEnvelope(envelope);
      var visitsBefore = state.visits;
      var visit = touch();
      // ma.33: odsłona w trwającej wizycie - wpis tylko przy nowej kampanii.
      if (state.visits === visitsBefore) addTouchpoint(now(), false);
      // Odsłony tej wizyty - dla sygnału powrotu gorącego leada.
      state.visitPageviews = visit || state.visitPageviews == null ? 1 : state.visitPageviews + 1;
      var crm = crmEvent(true);
      // Otwarcie strony to jedna chwila: CRM, wizyta, zdarzenia z bufora i dojrzałe akcje - jeden popup.
      var pass = { popup: false };
      if (crm) dispatch(crm, pass);
      if (visit) dispatch(visit, pass);
      var queued = buffer;
      var required = consentRequired(envelope);
      buffer = [];
      queued.forEach(function (q) {
        if (required && !q.consent) return;
        handle(q.evt, q.real + (state.shift || 0), pass);
      });
      // Po touch(): UTM wizyty już jest w stanie, gdy wyzwalacz „z kampanii" sprawdza go od razu.
      hookSignals();
      replayFormExits();
      replayStateActions();
      sendVisitSignal();
      runDue(pass);
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
    // Segmenty i początki wizyt mają tę samą retencję co historia.
    Object.keys(state.segments || {}).forEach(function (k) { if (state.segments[k] < limit) delete state.segments[k]; });
    if (state.visitLog) state.visitLog = state.visitLog.filter(function (t) { return t >= limit; });
    if (state.touchpoints) state.touchpoints = state.touchpoints.filter(function (e) { return e.ts >= limit; });
    var old = views.filter(function (v) { return v.ts < limit; }).map(function (v) { return v.id; });
    if (!old.length) return;
    views = views.filter(function (v) { return v.ts >= limit; });
    _queue(function () { return store.deleteViews(old); });
  }

  function boot() {
    if (booted) return;
    booted = true;
    hookDataLayer();
    hookContext();
    hookMap();
    bindUi();
    deepLinkView();
    hookVisitorIdFields();
    pageUtm = readUtm();
    pageTouch = readTouchpoint();
    var startUrl = window.digi2._maEndpoint || _cfg('d2-ma') || null;
    // ma.25: adres spoza listy nie zostaje jako envelopeUrl — reload / d2-ma-refresh go nie ponawiają.
    envelopeUrl = startUrl && allowedUrl(startUrl, ENVELOPE_HOSTS) ? startUrl : null;
    if (!startUrl) {
      // ma.31: pusty d2-ma = koperta z digi2.ma.load(). Bez niej magazyn się nie
      // otwiera - inaczej wizyta (return_visit) przeszłaby bez scenariuszy.
      // Koperta podana przed startem rusza od razu; bez load() start po 10 s.
      if (envelope) {
        decide(envelope)['catch'](function (e) { _warn('start failed', e); });
      } else {
        envelopeWait = setTimeout(function () {
          envelopeWait = null;
          _log('no digi2.ma.load() within ' + ENVELOPE_WAIT_MS / 1000 + ' s — starting without an envelope');
          decide(envelope)['catch'](function (e) { _warn('start failed', e); });
        }, ENVELOPE_WAIT_MS);
      }
    } else {
      var seq = envelopeSeq;
      fetchEnvelope(startUrl).then(function (raw) {
        // Koperta z load() w trakcie pobierania wygrywa z tą z atrybutu - i to
        // load() już wywołał decide(), więc drugi raz go nie wołamy.
        if (envelopeSeq !== seq) return null;
        envelope = compile(raw);
        return decide(envelope);
      })['catch'](function (e) { _warn('start failed', e); });
    }
    var every = num(_cfg('d2-ma-refresh'));
    if (every && every >= 5) setInterval(function () { api.reload(); }, every * 1000);
  }

  // Nowa koperta w trakcie wizyty: nowe rewizje, nowy wynik telefonu.
  function useEnvelope(raw) {
    var env = compile(raw);
    if (!env) return Promise.resolve(false);
    envelopeSeq++;
    if (envelopeWait) { clearTimeout(envelopeWait); envelopeWait = null; }
    if (!tracking) {
      // Magazyn się otwiera albo czekamy na zgodę - openStore() weźmie tę kopertę.
      envelope = env;
      // Czekanie na zgodę (hold) kończy też koperta, która zgody nie wymaga.
      if (holding && !consentRequired(env)) { blocked = false; holding = false; }
      if (blocked || !booted || opening) return Promise.resolve(true);
      return decide(env).then(function () { return true; });
    }
    // ma.31: nieznana zgoda nie kasuje bazy otwartej za zgodą - tylko jawna
    // odmowa albo baza zebrana bez wymogu zgody.
    var cs = consentRequired(env) ? consentState() : 'granted';
    if (cs === 'denied' || (cs !== 'granted' && !openedWithConsent)) {
      envelope = env;
      wipe('envelope now requires consent');
      waitForConsent();
      return Promise.resolve(true);
    }
    var before = crmSeq;
    applyEnvelope(env);
    hookSignals();
    var crm = crmEvent();
    var pass = { popup: false };
    if (crm && crm.seq !== before) dispatch(crm, pass);
    runDue(pass);
    afterChange();
    return Promise.resolve(true);
  }

  var api = {
    // ma.28: wersja skryptu, którą strona faktycznie załadowała ("ma.28") - do
    // sprawdzenia w konsoli po podmianie tagu; ten sam numer co minScript koperty.
    version: 'ma.' + SCRIPT_VERSION,
    load: function (src) {
      if (src && typeof src === 'object') return useEnvelope(src);
      var url = src || envelopeUrl;
      // ma.25: zapamiętujemy adres dopiero po kontroli listy — zły adres nie podmienia dobrego.
      if (url && allowedUrl(url, ENVELOPE_HOSTS)) envelopeUrl = url;
      return fetchEnvelope(url).then(function (raw) { return raw ? useEnvelope(raw) : false; });
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
    // visitorId dla zgłoszenia do 2destate (d2-ma-hot-lead). null bez zgody,
    // bez d2-ma-hot-lead albo przed otwarciem magazynu.
    visitorId: function () { return shareVisitorId(); },
    profile: function () {
      if (!state) return null;
      return {
        visitorId: state.visitorId, visits: state.visits, lead: !!state.lead, views: views.length,
        pref: { rooms: prefOf('rooms'), floor: prefOf('floor') }, lastUnit: _clone(lastUnit()),
        segment: state.lastSegment, counters: counters(), tracking: tracking,
        filters: state.filters ? _clone(state.filters) : null, sort: userSorted() && state.sort ? _clone(state.sort) : null,
        store: store ? store.kind : null, timeScale: timeScale
      };
    },
    history: function () { return _clone(views); },
    // ma.33: historia źródeł wizyt (touchpoints v1); bez zgody pusta lista.
    touchpoints: function () {
      return { v: 1, items: state && tracking && openedWithConsent ? touchpointsOut(state.touchpoints) : [] };
    },
    // ma.33: parser wpisu bez zapisu i bez zgody (adres i referrer domyślnie z tej strony).
    parseTouchpoint: function (href, referrer) {
      return arguments.length ? parseTouchpoint(href, referrer) : readTouchpoint();
    },
    // Kontekst leadu (ma.16): to, co trafia do ukrytych pól formularza.
    context: function () {
      var d = contextData();
      return d ? { text: contextText(d), json: contextJson(d) } : null;
    },
    fillContext: function (form) { return fillContext(form); },
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
      var pass = { popup: false };
      if (visit) { state.visitPageviews = 1; dispatch(visit, pass); sendVisitSignal(); }
      runDue(pass);
      afterChange();
    },
    clear: function () {
      var wasTracking = tracking;
      revokeHotLead();
      if (hotLeadTimer) { clearTimeout(hotLeadTimer); hotLeadTimer = null; }
      views = [];
      highlighted = {};
      markWaiting = [];
      profileEpoch++;
      cancelTooltipWaits();
      restoreSlots();
      resetSignals();
      resetOrder();
      resetFilters();
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
    // Po zmianie DOM (np. lista CMS) - zbierz elementy z warunkami od nowa.
    apply: function () { condEls = null; applyConditions(); },
    allows: allows,
    _real: true
  };

  window.digi2.ma = api;

  if (document.readyState === 'loading' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
