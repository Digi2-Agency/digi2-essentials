/**
 * digi2 Promo — show and hide page elements from a running 2destate promotion.
 * Loaded automatically by digi2-loader.js when d2-promo is present.
 *
 * ─── Setup ──────────────────────────────────────────────────────────────────
 *
 *   <script src=".../digi2-loader.min.js"
 *     d2-promo="https://api.2destate.com/api/v1/projects/<PROJECT_ID>/promo-state"
 *     d2-promo-state='{"active":true}'   <!-- optional, see "Two ways in" -->
 *     d2-popups
 *   ></script>
 *
 * 2destate owns the answer to "is a promotion running". The trading day flips
 * at midnight Warsaw time and the visitor's browser sits in whatever timezone
 * it likes, so the page never works this out for itself — it asks and obeys.
 *
 * ─── Element attributes ─────────────────────────────────────────────────────
 *
 *   d2-promo-when="active"          Show while the conditions hold
 *   d2-promo-when="inactive"        Hide while they hold (newsletter popup, …)
 *   d2-promo-campaign="key"         Narrow to one campaign (key from 2destate)
 *   d2-promo-tag="key"              Narrow to products carrying that tag
 *   d2-promo-min-products="5"       Narrow to a floor on discounted products
 *
 * Conditions on one element combine with AND. With none of them, the plain
 * fact that some campaign is running in the project decides.
 *
 * ─── Two ways in ────────────────────────────────────────────────────────────
 *
 * The state reaches the page by three paths, in this order, so nothing ever
 * flashes and nothing ever blocks:
 *
 *   1. d2-promo-state on the script tag — baked into the page, true from the
 *      first frame. Either a full JSON payload or the word "active".
 *   2. localStorage — what the last visit saw, painted instantly.
 *   3. fetch — the truth, which then replaces both of the above.
 *
 * A failed request leaves the page looking exactly as it does with no
 * promotion running. The site is never held hostage by an API.
 *
 * ─── Module API ─────────────────────────────────────────────────────────────
 *
 *   digi2.promo.state()             Current state object (null before resolve)
 *   digi2.promo.isActive(key)       Is any campaign running / that one campaign
 *   digi2.promo.hasTag(key)         Does a discounted product carry that tag
 *   digi2.promo.matches(el)         Would this element be shown right now
 *   digi2.promo.refresh()           Re-fetch and re-apply
 *   digi2.promo.apply()             Re-apply to the DOM (after adding elements)
 *
 * ─── Events ─────────────────────────────────────────────────────────────────
 *
 *   digi2.on('promo:resolved', fn)  First decision made — fn({ state, source })
 *   digi2.on('promo:change', fn)    State changed — fn({ state, previous })
 *
 * ─── Preview ────────────────────────────────────────────────────────────────
 *
 *   ?d2-promo-preview=<campaign-key>   Force that campaign on
 *   ?d2-promo-preview=on               Force a generic promotion on
 *   ?d2-promo-preview=off              Force everything off
 *
 * Marketing checks the promo version of the page before midnight without
 * touching the campaign.
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  var STORAGE_KEY = 'd2_promo_state';
  var STORAGE_VERSION = 1;
  var FETCH_TIMEOUT_MS = 5000;
  // Nawet gdy backend nie poda granicy, wracamy po godzinie - kampanię można
  // wyłączyć ręcznie w panelu i strona ma to kiedyś zauważyć.
  var FALLBACK_REFRESH_MS = 60 * 60 * 1000;

  function _log(action, data) {
    if (window.digi2.log) window.digi2.log('promo', action, data);
  }

  function _emit(name, data) {
    try {
      if (window.digi2 && typeof window.digi2.emit === 'function') {
        window.digi2.emit(name, data || {});
      }
    } catch (e) {}
  }

  function attr(el, name) {
    if (window.digi2 && typeof window.digi2.attr === 'function') {
      return window.digi2.attr(el, name);
    }
    return el.getAttribute(name);
  }

  // ---------------------------------------------------------------------------
  // Stan
  // ---------------------------------------------------------------------------

  var state = null;          // ostatni znany stan
  var resolved = false;      // czy zapadła pierwsza decyzja
  var refreshTimer = null;
  var inFlight = null;       // deduplikacja równoległych zapytań
  var endpoint = null;

  var PUSTY = { active: false, campaigns: [], tags: [], product_count: 0 };

  function _znormalizuj(surowy) {
    if (!surowy || typeof surowy !== 'object') return null;
    return {
      active: !!surowy.active,
      product_count: Number(surowy.product_count) || 0,
      campaigns: Array.isArray(surowy.campaigns) ? surowy.campaigns : [],
      tags: Array.isArray(surowy.tags) ? surowy.tags : [],
      valid_until: surowy.valid_until || null,
      hash: surowy.hash || null
    };
  }

  // --- Pamięć przeglądarki ---------------------------------------------------
  // Prywatne okno i zablokowane ciasteczka rzucają przy samym dostępie, więc
  // każdy odczyt i zapis siedzi w try/catch - brak pamięci ma tylko znaczyć
  // "pierwsza wizyta", nie "moduł nie działa".

  function _zPamieci() {
    try {
      var surowy = window.localStorage.getItem(STORAGE_KEY);
      if (!surowy) return null;
      var zapis = JSON.parse(surowy);
      if (!zapis || zapis.v !== STORAGE_VERSION) return null;
      if (zapis.endpoint !== endpoint) return null;
      return _znormalizuj(zapis.state);
    } catch (e) {
      return null;
    }
  }

  function _doPamieci(nowy) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ v: STORAGE_VERSION, endpoint: endpoint, state: nowy })
      );
    } catch (e) {}
  }

  // --- Podgląd ---------------------------------------------------------------

  function _podglad() {
    var wartosc;
    try {
      wartosc = new URLSearchParams(window.location.search).get('d2-promo-preview');
    } catch (e) {
      return null;
    }
    if (!wartosc) return null;
    if (wartosc === 'off') return _znormalizuj(PUSTY);
    if (wartosc === 'on') {
      return _znormalizuj({ active: true, product_count: 1, campaigns: [], tags: [] });
    }
    return _znormalizuj({
      active: true,
      product_count: 1,
      campaigns: [{ key: wartosc, name: wartosc, product_count: 1 }],
      tags: [{ key: wartosc, name: wartosc, product_count: 1 }]
    });
  }

  // ---------------------------------------------------------------------------
  // Warunki
  // ---------------------------------------------------------------------------

  function _maKampanie(klucz) {
    if (!state || !state.active) return false;
    if (!klucz) return true;
    var szukany = String(klucz).toLowerCase();
    return state.campaigns.some(function (k) {
      return String(k.key || '').toLowerCase() === szukany;
    });
  }

  function _maTag(klucz) {
    if (!state || !state.active || !klucz) return false;
    var szukany = String(klucz).toLowerCase();
    return state.tags.some(function (t) {
      return String(t.key || '').toLowerCase() === szukany;
    });
  }

  /** Czy warunki opisane na elemencie są dziś spełnione (bez „when"). */
  function _warunkiSpelnione(el) {
    if (!state || !state.active) return false;

    var kampania = attr(el, 'd2-promo-campaign');
    if (kampania && !_maKampanie(kampania)) return false;

    var tag = attr(el, 'd2-promo-tag');
    if (tag && !_maTag(tag)) return false;

    var minimum = attr(el, 'd2-promo-min-products');
    if (minimum) {
      var prog = parseInt(minimum, 10);
      if (!isNaN(prog) && state.product_count < prog) return false;
    }

    return true;
  }

  /** Czy element ma być widoczny - z uwzględnieniem „active" / „inactive". */
  function _maBycWidoczny(el) {
    var tryb = (attr(el, 'd2-promo-when') || 'active').toLowerCase();
    var spelnione = _warunkiSpelnione(el);
    return tryb === 'inactive' ? !spelnione : spelnione;
  }

  // ---------------------------------------------------------------------------
  // Nakładanie na DOM
  // ---------------------------------------------------------------------------

  // Element schowany przez promocję znika z układu (display:none), a nie tylko
  // z widoku - pasek promocyjny nie ma zostawiać po sobie dziury.
  function _pokaz(el) {
    if (el.getAttribute('data-d2-promo') === 'shown') return;
    el.style.removeProperty('display');
    el.setAttribute('data-d2-promo', 'shown');
    el.setAttribute('data-d2-promo-resolved', '');
  }

  function _ukryj(el) {
    if (el.getAttribute('data-d2-promo') === 'hidden') return;
    el.style.setProperty('display', 'none', 'important');
    el.setAttribute('data-d2-promo', 'hidden');
    el.setAttribute('data-d2-promo-resolved', '');
  }

  function apply() {
    var elementy = document.querySelectorAll('[d2-promo-when]');
    var pokazane = 0;
    for (var i = 0; i < elementy.length; i++) {
      if (_maBycWidoczny(elementy[i])) {
        _pokaz(elementy[i]);
        pokazane++;
      } else {
        _ukryj(elementy[i]);
      }
    }
    _log('applied', { elements: elementy.length, shown: pokazane, active: !!(state && state.active) });
  }

  // Zanim moduł zdecyduje, elementy warunkowe są niewidoczne - inaczej pasek
  // promocyjny mignąłby na każdej stronie bez promocji. Ukrywamy tylko te,
  // które same o to poprosiły atrybutem.
  function _wstrzyknijCssStartowy() {
    if (document.querySelector('style[data-d2-promo]')) return;
    var style = document.createElement('style');
    style.setAttribute('data-d2-promo', '');
    style.textContent =
      '[d2-promo-when]:not([data-d2-promo-resolved]){visibility:hidden!important}';
    (document.head || document.documentElement).appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // Pobieranie stanu
  // ---------------------------------------------------------------------------

  function _ustawStan(nowy, zrodlo) {
    var poprzedni = state;
    var zmiana = !poprzedni || JSON.stringify(poprzedni) !== JSON.stringify(nowy);
    state = nowy;
    apply();

    if (!resolved) {
      resolved = true;
      _log('resolved', { source: zrodlo, active: nowy.active });
      _emit('promo:resolved', { state: nowy, source: zrodlo });
    } else if (zmiana) {
      _log('changed', { source: zrodlo, active: nowy.active });
      _emit('promo:change', { state: nowy, previous: poprzedni });
    }
  }

  function _zaplanujOdswiezenie() {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    if (!endpoint) return;

    var za = FALLBACK_REFRESH_MS;
    if (state && state.valid_until) {
      var doZmiany = new Date(state.valid_until).getTime() - Date.now();
      // Sekunda zapasu, żeby obudzić się już po granicy dnia, nie w jej trakcie.
      if (!isNaN(doZmiany) && doZmiany > 0) za = Math.min(doZmiany + 1000, FALLBACK_REFRESH_MS);
    }
    // setTimeout powyżej ~24 dni przekręca się na natychmiastowe wywołanie.
    za = Math.min(za, 2147483647);
    refreshTimer = setTimeout(function () {
      refresh({ swieze: true });
    }, za);
    _log('refresh scheduled', { in_ms: za });
  }

  /**
   * @param {{ swieze?: boolean }} [opcje] `swieze` omija cache przeglądarki.
   *   Pobranie na starcie korzysta z `max-age`, bo odciąża CDN. Ale odświeżenie
   *   wywołane ręcznie albo budzikiem po `valid_until` pyta o stan właśnie
   *   dlatego, że mógł się zmienić - odpowiedź sprzed minuty jest wtedy
   *   bezużyteczna.
   */
  function refresh(opcje) {
    if (!endpoint) return Promise.resolve(state);
    if (inFlight) return inFlight;
    if (typeof fetch !== 'function') return Promise.resolve(state);
    var swieze = !!(opcje && opcje.swieze);

    var url = endpoint;
    if (state && state.hash) {
      url += (url.indexOf('?') === -1 ? '?' : '&') + 'known_hash=' + encodeURIComponent(state.hash);
    }

    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timeout = setTimeout(function () {
      if (controller) controller.abort();
    }, FETCH_TIMEOUT_MS);

    var ustawienia = { cache: swieze ? 'no-cache' : 'default' };
    if (controller) ustawienia.signal = controller.signal;

    inFlight = fetch(url, ustawienia)
      .then(function (odpowiedz) {
        if (!odpowiedz.ok) throw new Error('HTTP ' + odpowiedz.status);
        return odpowiedz.json();
      })
      .then(function (dane) {
        if (dane && dane.unchanged) {
          _log('unchanged', { hash: dane.hash });
          // Stan bez zmian, ale granica mogła się przesunąć.
          if (state && dane.valid_until) state.valid_until = dane.valid_until;
          return state;
        }
        var nowy = _znormalizuj(dane);
        if (!nowy) throw new Error('Malformed payload');
        _doPamieci(nowy);
        _ustawStan(nowy, 'fetch');
        return nowy;
      })
      .catch(function (blad) {
        // Awaria sieci nie może zatrzymać strony. Bez wcześniejszego stanu
        // zachowujemy się dokładnie tak, jak przy braku promocji.
        console.warn('[digi2.promo] state fetch failed:', blad && blad.message);
        if (!resolved) _ustawStan(_znormalizuj(PUSTY), 'error');
        return state;
      })
      .then(function (wynik) {
        clearTimeout(timeout);
        inFlight = null;
        _zaplanujOdswiezenie();
        return wynik;
      });

    return inFlight;
  }

  // ---------------------------------------------------------------------------
  // Elementy dokładane później (CMS, popupy, Webflow interactions)
  // ---------------------------------------------------------------------------

  var _mo = null;
  var _moThrottle = null;

  function _obserwuj() {
    if (_mo || typeof MutationObserver !== 'function' || !document.body) return;
    _mo = new MutationObserver(function () {
      if (_moThrottle) return;
      _moThrottle = setTimeout(function () {
        _moThrottle = null;
        if (resolved) apply();
      }, 50);
    });
    _mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['d2-promo-when', 'd2-promo-campaign', 'd2-promo-tag', 'd2-promo-min-products']
    });
  }

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------

  function _konfiguracja() {
    // Loader przepisuje wartość atrybutu do window.digi2._promoEndpoint; przy
    // samodzielnym użyciu modułu czytamy tag script bezpośrednio.
    if (window.digi2._promoEndpoint) return window.digi2._promoEndpoint;
    var tag = document.querySelector('script[d2-promo]');
    return tag ? tag.getAttribute('d2-promo') : null;
  }

  function _stanZTagu() {
    var tag = document.querySelector('script[d2-promo-state]');
    var surowy = window.digi2._promoState || (tag && tag.getAttribute('d2-promo-state'));
    if (!surowy) return null;
    var przyciety = String(surowy).trim();
    if (przyciety === 'active') {
      return _znormalizuj({ active: true, product_count: 1, campaigns: [], tags: [] });
    }
    if (przyciety === 'inactive') return _znormalizuj(PUSTY);
    try {
      return _znormalizuj(JSON.parse(przyciety));
    } catch (e) {
      console.warn('[digi2.promo] d2-promo-state is not valid JSON — ignoring');
      return null;
    }
  }

  function boot() {
    endpoint = _konfiguracja();
    _wstrzyknijCssStartowy();

    var podglad = _podglad();
    if (podglad) {
      _ustawStan(podglad, 'preview');
      _obserwuj();
      _log('preview mode', { active: podglad.active });
      return; // Podgląd jest ważniejszy niż prawda - o to w nim chodzi.
    }

    // Stan wpisany w stronę bije ten z poprzedniej wizyty: został tam
    // umieszczony świadomie, przy publikacji.
    var wstepny = _stanZTagu();
    var zrodlo = 'inline';
    if (!wstepny) {
      wstepny = _zPamieci();
      zrodlo = 'storage';
    }
    if (wstepny) _ustawStan(wstepny, zrodlo);

    _obserwuj();

    if (endpoint) {
      refresh();
    } else if (!resolved) {
      console.warn('[digi2.promo] no endpoint configured — add d2-promo="<url>" to the loader');
      _ustawStan(_znormalizuj(PUSTY), 'no-endpoint');
    }
  }

  // ---------------------------------------------------------------------------
  // Publiczne API
  // ---------------------------------------------------------------------------

  window.digi2.promo = {
    state: function () {
      return state;
    },
    isActive: function (klucz) {
      return _maKampanie(klucz);
    },
    hasTag: function (klucz) {
      return _maTag(klucz);
    },
    matches: function (el) {
      return el ? _maBycWidoczny(el) : false;
    },
    /** Czy element wolno pokazać - używane przez moduł popups. */
    allows: function (el) {
      if (!el) return true;
      if (!el.hasAttribute || !el.hasAttribute('d2-promo-when')) return true;
      return _maBycWidoczny(el);
    },
    apply: apply,
    refresh: function (opcje) {
      return refresh(opcje || { swieze: true });
    },
    resolved: function () {
      return resolved;
    }
  };

  // CSS startowy musi zdążyć przed pierwszym malowaniem - stąd wywołanie
  // jeszcze przed DOMContentLoaded, tak jak robi to moduł interactions.
  _wstrzyknijCssStartowy();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
