/**
 * digi2 Loader — Component Library for Webflow
 * Auto-imports digi2 modules based on d2-* attributes on its own <script> tag.
 *
 * ─── Setup ──────────────────────────────────────────────────────────────────
 *
 *   <script src="https://cdn.jsdelivr.net/gh/YOUR_ORG/digi2@latest/digi2-loader.js"
 *     d2-gtm="GTM-XXXXXXX"
 *     d2-popups
 *     d2-cookies
 *     d2-forms
 *   ></script>
 *
 * ─── Available Modules ──────────────────────────────────────────────────────
 *
 *   d2-gtm="ID" →  modules/google.js    Consent Mode V2 + GTM + consent manager (auto-loaded)
 *   d2-popups   →  modules/popups.js    Popup/modal manager with animations
 *   d2-cookies  →  modules/cookies.js   Cookie get/set/remove helpers
 *   d2-forms    →  modules/forms.js     Form enhancement with UTM, IP, GA tracking
 *   d2-ab-tests →  modules/ab-tests.js  A/B redirects and link rewriting
 *   d2-format   →  modules/format.js    Number and price formatting
 *   d2-lightbox →  modules/lightbox.js  Image lightbox — custom Designer modal or built-in fallback
 *
 * ─── Loader Attributes ──────────────────────────────────────────────────────
 *
 *   d2-gtm="GTM-XXXXXXX"               GTM container ID — auto-loads google module
 *   d2-ab-tests="configName"           A/B test map on window[configName]
 *
 * ─── Module APIs ────────────────────────────────────────────────────────────
 *
 *   digi2.popups.create('name', options)   Create a named popup instance
 *   digi2.popups.show('name')              Show popup by name
 *   digi2.popups.close('name')             Close popup by name
 *   digi2.popups.get('name')               Get instance
 *   digi2.popups.destroy('name')           Remove instance & cleanup
 *   digi2.popups.list()                    List registered names
 *
 *   digi2.cookies.set(name, value, opts)   Set a cookie ({ days, path, domain, secure, sameSite })
 *   digi2.cookies.get(name)                Get cookie value (null if missing)
 *   digi2.cookies.getAll()                 Get all cookies as { key: value }
 *   digi2.cookies.has(name)                Check if cookie exists
 *   digi2.cookies.remove(name, opts)       Remove a cookie
 *
 *   digi2.forms.create('name', options)    Enhance a form with tracking fields
 *   digi2.forms.get('name')                Get instance
 *   digi2.forms.destroy('name')            Remove injected fields & cleanup
 *   digi2.forms.list()                     List registered names
 *
 *   digi2.google.consent.get()             Get current consent state
 *   digi2.google.consent.grant('category') Grant a single category
 *   digi2.google.consent.deny('category')  Deny a single category
 *   digi2.google.consent.update({...})     Bulk update consent
 *   digi2.google.consent.grantAll()        Grant all categories
 *   digi2.google.consent.denyAll()         Deny all categories
 *   digi2.google.consent.reset()           Clear saved consent
 *   digi2.google.consent.categories()      List category names
 *   digi2.google.dataLayerPush(data)       Push to dataLayer
 *   digi2.google.getGtmId()               Get configured GTM ID
 *
 *   digi2.abTests.get('pricing')           Current assignment for one test
 *   digi2.abTests.assign('pricing')        Assign or return existing variant
 *   digi2.abTests.rewriteLinks()           Re-apply link rewriting
 *   digi2.abTests.list()                   List active test names
 *
 * ─── Popups Options ─────────────────────────────────────────────────────────
 *
 *   popupSelector:        '.popup__overlay'   CSS selector for the popup element
 *   openTriggerSelector:  null                CSS selector — clicks open this popup
 *   closeTriggerSelector: null                CSS selector — clicks close this popup
 *   dataTagTrigger:       true                Listen for d2-show-popup="name" clicks
 *   animation:            'fade'              none | fade | slide-up | slide-down | slide-left | slide-right | zoom
 *   animationDuration:    0.4                 Seconds
 *   openOnLoad:           true                Show immediately on page load
 *   openAfterDelay:       null                Seconds — show after delay
 *   openOnExitIntent:     false               Show on exit intent (mouse/scroll)
 *   openAfterPageViews:   null                Show after N page views (sessionStorage)
 *   cookieName:           'popup_clicked'     Dismissal cookie name
 *   cookieDurationDays:   1                   How long dismissal lasts
 *   excludeUrls:          []                  URL patterns to skip
 *   containsUrls:         ['/']               URL patterns required to show
 *   onOpen:               null                Callback(instance) on show
 *   onClose:              null                Callback(instance) on hide
 *
 * ─── Google Options ─────────────────────────────────────────────────────────
 *
 *   Configured via loader attributes (not JS options):
 *
 *     d2-gtm="GTM-XXXXXXX"               Required — set on the loader script tag
 *
 *   Auto-handled:
 *     - Consent Mode V2 defaults (all denied)
 *     - Restores consent from localStorage ('consentModeV2') on return visits
 *     - Injects GTM into <head> + noscript iframe into <body>
 *     - Exposes window.gtag() and window.dataLayer globally
 *
 *   Consent categories managed:
 *     ad_personalization                  Google Ads personalization
 *     ad_storage                          Google Ads cookies
 *     ad_user_data                        Google Ads conversion data
 *     analytics_storage                   Google Analytics cookies
 *     personalization_storage             Recommendation/personalization
 *     functionality_storage               Functionality (language, preferences)
 *     security_storage                    Auth & security
 *
 * ─── Forms Options ──────────────────────────────────────────────────────────
 *
 *   formSelector:         null                CSS selector (alternative to d2-form wrapper)
 *   utmTracking:          true                Capture utm_source, utm_medium, utm_campaign, utm_content, utm_term
 *   clickIdTracking:      true                Capture gclid, fbclid, msclkid
 *   gaClientId:           true                Capture GA4 client ID from _ga cookie
 *   ipTracking:           false               Fetch & inject visitor IP address
 *   pageMeta:             true                Inject page_url, page_title, page_referrer
 *   cookieDurationDays:   365                 How long UTM/click cookies persist
 *   customFields:         {}                  { fieldName: 'value' } — extra hidden fields
 *   ipApiUrl:             'https://api.ipify.org?format=json'
 *   onReady:              null                Callback(instance) after all fields injected
 *
 *   Auto-injected hidden input names:
 *     utm_campaign_hidden, utm_source_hidden, utm_medium_hidden,
 *     utm_content_hidden, utm_term_hidden,
 *     gclid, fbclid, msclkid, gaclientid,
 *     page_url, page_title, page_referrer, ip_address
 *
 * ─── Events ─────────────────────────────────────────────────────────────────
 *
 *   digi2.on('loaded', fn)              All modules loaded
 *   digi2.on('module:loaded', fn)       Single module loaded (receives name)
 *   digi2.on('module:error', fn)        Module failed (receives name)
 *   digi2.on('consent:updated', fn)     Consent state changed (receives state)
 *   digi2.off('loaded', fn)             Remove listener
 *   digi2.emit('custom', data)          Emit custom event
 *   digi2.onReady(fn)                   Alias for digi2.on('loaded', fn)
 *
 * ─── Responsive Attributes ──────────────────────────────────────────────────
 *
 *   Any value-bearing d2-* attribute supports per-breakpoint overrides:
 *
 *     <div d2-animation-direction="left;up@911">           default left, up <=911px
 *     <div d2-animation-distance="12px;24px@1200;40px@600">
 *
 *   Format: entries separated by `;`. Plain "value" is the default; "value@<px>"
 *   applies when innerWidth <= <px>. Smallest matching breakpoint wins.
 *
 *   digi2.parseResponsive(raw)         { default, bps: [{ max, value }] }
 *   digi2.resolveResponsive(p, w?)     string at width w (or innerWidth)
 *   digi2.attr(el, name, fallback?)    resolved string for el+attr
 *   digi2.on('responsive:change', fn)  fires when active bucket flips
 *
 * ─── Module Management ──────────────────────────────────────────────────────
 *
 *   digi2.modules.check('cookies')                   true if loaded
 *   digi2.modules.list()                             ['popups', 'cookies', ...]
 *   digi2.modules.require('cookies')                 Load on the fly, returns Promise
 *   digi2.modules.requireAll(['cookies', 'forms'])   Load multiple, returns Promise
 *
 * ─── Debug Mode ──────────────────────────────────────────────────────────────
 *
 *   Add d2-debug-mode to the loader script tag to log all actions:
 *
 *   <script src="...digi2-loader.min.js" d2-popups d2-debug-mode></script>
 *
 *   digi2.log('module', 'action', data)   — logs only in debug mode
 *   digi2.debug                           — true/false
 *
 * ─── Data Attributes (HTML) ─────────────────────────────────────────────────
 *
 *   d2-show-popup="name"           Click to open a popup by name
 *   d2-form="name"                 Wrapper for form enhancement
 *   d2-debug-mode                       Enable debug logging (on loader script)
 *
 * ─── How It Works ───────────────────────────────────────────────────────────
 *
 *   The loader reads its own src to derive the base URL, scans its attributes
 *   for d2-* entries, and injects <script> tags for each matching module from
 *   the modules/ directory. Works with jsDelivr, any CDN, or self-hosted.
 */
(function () {
  'use strict';

  // ---- Namespace -----------------------------------------------------------
  window.digi2 = window.digi2 || {};
  window.digi2._loaded = window.digi2._loaded || {};

  // ---- Debug mode ----------------------------------------------------------
  // Detected from d2-debug-mode attribute on the loader script tag.
  // digi2.log(module, action, data) — only outputs when debug is on.
  var _debugDetected = false;
  var _loaderTag = document.currentScript;
  if (_loaderTag) {
    _debugDetected = _loaderTag.hasAttribute('d2-debug-mode');
  }
  window.digi2.debug = _debugDetected;

  var _logStyles = 'color:#7c3aed;font-weight:bold';

  window.digi2.log = function (module, action, data) {
    if (!window.digi2.debug) return;
    var prefix = '%c[digi2.' + module + ']';
    if (data !== undefined) {
      console.log(prefix + ' ' + action, _logStyles, data);
    } else {
      console.log(prefix + ' ' + action, _logStyles);
    }
  };

  // ---- Event system --------------------------------------------------------
  var listeners = {};

  window.digi2.on = function (event, fn) {
    if (typeof fn !== 'function') return;
    // If subscribing to 'loaded' after it already fired, call immediately
    if (event === 'loaded' && window.digi2._allLoaded) {
      fn();
      return;
    }
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  };

  window.digi2.off = function (event, fn) {
    if (!listeners[event]) return;
    if (!fn) {
      delete listeners[event];
      return;
    }
    listeners[event] = listeners[event].filter(function (f) { return f !== fn; });
  };

  window.digi2.emit = function (event, data) {
    window.digi2.log('events', 'emit → ' + event, data);
    if (!listeners[event]) return;
    listeners[event].forEach(function (fn) { fn(data); });
  };

  // ---- Backwards-compatible onReady (wraps the event system) ---------------
  window.digi2.onReady = function (fn) {
    window.digi2.on('loaded', fn);
  };

  // ---- Responsive attribute parser -----------------------------------------
  // Any d2-* attribute that takes a value can carry per-breakpoint overrides:
  //
  //   d2-animation-direction="left;up@911"
  //     → "left" by default, "up" when innerWidth <= 911
  //   d2-animation-distance="12px;24px@1200;40px@600"
  //     → 12px default; 24px <=1200; 40px <=600
  //
  // Format: entries separated by `;`. Each entry is either a plain value
  // (the default) or `value@<maxWidthPx>`. The smallest matching breakpoint
  // wins; if none match, the default is used. If no default is given and no
  // breakpoint matches, the fallback passed to digi2.attr() is returned.
  //
  // API:
  //   digi2.parseResponsive(raw)         → { default, bps: [{max, value}] }
  //   digi2.resolveResponsive(p, w?)     → string  (uses innerWidth if w omitted)
  //   digi2.attr(el, name, fallback?)    → resolved string for that el+attr
  //   digi2.on('responsive:change', fn)  → fn(width) when active bucket changes
  var _parseCache = (typeof Map !== 'undefined') ? new Map() : null;
  var _bpKeys = []; // sorted unique breakpoint widths from all parsed values

  function parseResponsive(raw) {
    if (raw == null) return { default: '', bps: [] };
    raw = String(raw);
    if (_parseCache && _parseCache.has(raw)) return _parseCache.get(raw);
    var parts = raw.split(';');
    var defaultValue = '';
    var bps = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (!p) continue;
      var at = p.indexOf('@');
      if (at < 0) {
        defaultValue = p;
      } else {
        var v = p.slice(0, at).trim();
        var n = parseInt(p.slice(at + 1).trim(), 10);
        if (!isNaN(n)) {
          bps.push({ max: n, value: v });
          if (_bpKeys.indexOf(n) === -1) {
            _bpKeys.push(n);
            _bpKeys.sort(function (a, b) { return a - b; });
          }
        }
      }
    }
    bps.sort(function (a, b) { return a.max - b.max; });
    var parsed = { default: defaultValue, bps: bps };
    if (_parseCache) _parseCache.set(raw, parsed);
    return parsed;
  }

  function resolveResponsive(parsed, width) {
    if (!parsed) return '';
    if (typeof width === 'undefined') width = window.innerWidth;
    for (var i = 0; i < parsed.bps.length; i++) {
      if (width <= parsed.bps[i].max) return parsed.bps[i].value;
    }
    return parsed.default;
  }

  function digi2Attr(el, name, fallback) {
    if (!el || typeof el.getAttribute !== 'function') {
      return fallback === undefined ? null : fallback;
    }
    var raw = el.getAttribute(name);
    if (raw === null) return fallback === undefined ? null : fallback;
    var v = resolveResponsive(parseResponsive(raw));
    if (v === '' && fallback !== undefined) return fallback;
    return v;
  }

  window.digi2.parseResponsive = parseResponsive;
  window.digi2.resolveResponsive = resolveResponsive;
  window.digi2.attr = digi2Attr;

  // Emit `responsive:change` only when the active breakpoint *bucket* changes
  // — not on every resize pixel. The bucket is the smallest registered
  // breakpoint >= innerWidth, or Infinity if none. This lets modules cheaply
  // re-render only on meaningful viewport transitions.
  function _activeBucket(w) {
    for (var i = 0; i < _bpKeys.length; i++) {
      if (w <= _bpKeys[i]) return _bpKeys[i];
    }
    return Infinity;
  }
  var _lastBucket = _activeBucket(window.innerWidth);
  var _resizeRaf = null;
  window.addEventListener('resize', function () {
    if (_resizeRaf) return;
    _resizeRaf = (window.requestAnimationFrame || function (cb) { return setTimeout(cb, 16); })(function () {
      _resizeRaf = null;
      var w = window.innerWidth;
      var b = _activeBucket(w);
      if (b !== _lastBucket) {
        _lastBucket = b;
        window.digi2.emit('responsive:change', w);
      }
    });
  });

  // ---- Detect own script tag & base URL ------------------------------------
  var loaderScript = document.currentScript;

  if (!loaderScript) {
    console.error('[digi2] Cannot detect loader script. Use a regular <script> tag (not async/defer with document.currentScript polyfill).');
    return;
  }

  // Derive the base URL from the loader's own src
  // e.g. "https://cdn.jsdelivr.net/gh/org/digi2@latest/digi2-loader.js" → "https://cdn.jsdelivr.net/gh/org/digi2@latest/"
  var src = loaderScript.getAttribute('src');
  var baseUrl = src.substring(0, src.lastIndexOf('/') + 1);

  // Auto-detect minified mode: if the loader itself is loaded as .min.js, load .min.js modules
  var useMin = /\.min\.js(\?|$)/.test(src);

  window.digi2.log('loader', 'initialized', { baseUrl: baseUrl, minified: useMin, debug: window.digi2.debug });

  // ---- Internal: load a single module by name (returns a Promise) ----------
  var _loadPromises = {};

  function loadModule(moduleName) {
    // Already loaded
    if (window.digi2._loaded[moduleName]) {
      return Promise.resolve(moduleName);
    }

    // Already loading — return existing promise
    if (_loadPromises[moduleName]) {
      return _loadPromises[moduleName];
    }

    _loadPromises[moduleName] = new Promise(function (resolve, reject) {
      var ext = useMin ? '.min.js' : '.js';
      var url = baseUrl + 'modules/' + moduleName + ext;
      window.digi2.log('loader', 'loading module → ' + moduleName, url);
      var script = document.createElement('script');
      script.src = url;
      script.onload = function () {
        window.digi2._loaded[moduleName] = true;
        window.digi2.log('loader', 'module loaded ✓ ' + moduleName);
        window.digi2.emit('module:loaded', moduleName);
        resolve(moduleName);
      };
      script.onerror = function () {
        console.error('[digi2] Failed to load module "' + moduleName + '" from ' + url);
        window.digi2.emit('module:error', moduleName);
        reject(new Error('[digi2] Module "' + moduleName + '" failed to load'));
      };
      document.head.appendChild(script);
    });

    return _loadPromises[moduleName];
  }

  // ---- digi2.modules — public API ------------------------------------------

  window.digi2.modules = {
    /**
     * Check if a module is loaded.
     *   digi2.modules.check('cookies')  →  true / false
     */
    check: function (name) {
      return !!window.digi2._loaded[name];
    },

    /**
     * List all currently loaded module names.
     *   digi2.modules.list()  →  ['popups', 'cookies']
     */
    list: function () {
      return Object.keys(window.digi2._loaded).filter(function (k) {
        return window.digi2._loaded[k];
      });
    },

    /**
     * Require a module — loads it on the fly if not already loaded.
     * Returns a Promise that resolves when the module is ready.
     *   digi2.modules.require('cookies').then(() => { ... })
     *   await digi2.modules.require('cookies')
     */
    require: function (name) {
      return loadModule(name);
    },

    /**
     * Require multiple modules at once. Returns a Promise.
     *   digi2.modules.requireAll(['cookies', 'forms']).then(() => { ... })
     */
    requireAll: function (names) {
      return Promise.all(names.map(function (name) {
        return loadModule(name);
      }));
    },
  };

  // ---- Auto-require proxies ------------------------------------------------
  // If someone calls digi2.popups.create() before the module is loaded,
  // the proxy intercepts it, loads the module, then replays the call.
  // Once the real module loads, it overwrites the proxy on window.digi2.

  var MODULE_MAP = {
    popups: 'popups',
    forms: 'forms',
    cookies: 'cookies',
    google: 'google',
    tabs: 'tabs',
    sliders: 'sliders',
    animate: 'animate',
    toasts: 'toasts',
    scroll: 'scroll',
    lazy: 'lazy',
    countdown: 'countdown',
    filter: 'filter',
    format: 'format',
    copy: 'copy',
    cms: 'cms',
    interactions: 'interactions',
    abTests: 'ab-tests',
    lightbox: 'lightbox',
  };

  function createProxy(namespace, moduleName) {
    // Don't overwrite if the real module already loaded
    if (window.digi2[namespace] && window.digi2._loaded[moduleName]) return;

    var queue = [];

    var handler = {
      get: function (_target, method) {
        return function () {
          var args = Array.prototype.slice.call(arguments);
          window.digi2.log('loader', 'auto-require "' + moduleName + '" for ' + namespace + '.' + method + '()');

          return loadModule(moduleName).then(function () {
            var real = window.digi2[namespace];
            if (real && typeof real[method] === 'function') {
              return real[method].apply(real, args);
            } else {
              console.error('[digi2] ' + namespace + '.' + method + ' not found after loading module.');
            }
          });
        };
      },
    };

    // Use Proxy if available (all modern browsers), fallback to a simple object
    if (typeof Proxy !== 'undefined') {
      window.digi2[namespace] = new Proxy({}, handler);
    } else {
      // Basic fallback — cover the most common methods
      var fallback = {};
      ['create', 'get', 'destroy', 'list', 'show', 'close', 'set', 'remove', 'has', 'getAll',
       'validate', 'addRule', 'consent', 'dataLayerPush', 'getGtmId', 'init', 'assign', 'rewriteLinks'].forEach(function (method) {
        fallback[method] = function () {
          var args = Array.prototype.slice.call(arguments);
          window.digi2.log('loader', 'auto-require "' + moduleName + '" for ' + namespace + '.' + method + '()');
          return loadModule(moduleName).then(function () {
            var real = window.digi2[namespace];
            if (real && typeof real[method] === 'function') {
              return real[method].apply(real, args);
            }
          });
        };
      });
      window.digi2[namespace] = fallback;
    }
  }

  // Set up proxies for all known modules (only if not already loaded)
  for (var ns in MODULE_MAP) {
    if (MODULE_MAP.hasOwnProperty(ns)) {
      createProxy(ns, MODULE_MAP[ns]);
    }
  }

  // ---- d2-static-width — lock element width to its natural max ------------
  // Any element with [d2-static-width] has its rendered width measured and
  // applied as min-width, so dynamic content swaps don't cause layout shift.
  // The lock tracks the max observed width — if content later needs more
  // space, min-width is bumped up; it never shrinks.
  //
  // The attribute value picks which edge the content stays anchored to when
  // it's narrower than the locked box: d2-static-width="right" | "center"
  // (default/empty = left, the browser's natural flow). Without an anchor
  // the spare space always lands on the right, which visually detaches
  // right-side labels (e.g. a range slider's max value) from their edge.
  //
  // API:
  //   digi2.staticWidth.apply(el)   re-measure + lock a single element
  //   digi2.staticWidth.refresh()   scan the DOM + (re)apply to all marked elements
  function _applyStaticWidth(el) {
    if (!el) return;
    var current = parseFloat(el.style.minWidth) || 0;
    el.style.minWidth = '';
    var natural = el.getBoundingClientRect().width;
    var next = Math.max(current, natural);
    if (next > 0) el.style.minWidth = next + 'px';
    var anchor = (el.getAttribute('d2-static-width') || '').toLowerCase();
    if (anchor === 'right' || anchor === 'center' || anchor === 'left') {
      // Flex containers ignore text-align for element children — anchor via
      // justify-content there instead.
      var display = '';
      try { display = window.getComputedStyle(el).display || ''; } catch (e) {}
      if (display.indexOf('flex') !== -1) {
        el.style.justifyContent =
          anchor === 'right' ? 'flex-end' : anchor === 'center' ? 'center' : 'flex-start';
      } else {
        el.style.textAlign = anchor;
      }
    }
  }

  function _initStaticWidth() {
    var els = document.querySelectorAll('[d2-static-width]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el._d2StaticWidth) {
        _applyStaticWidth(el);
        continue;
      }
      el._d2StaticWidth = true;
      _applyStaticWidth(el);
      if (typeof MutationObserver !== 'undefined') {
        (function (target) {
          var mo = new MutationObserver(function () { _applyStaticWidth(target); });
          mo.observe(target, { childList: true, characterData: true, subtree: true });
        })(el);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initStaticWidth);
  } else {
    _initStaticWidth();
  }
  // Re-measure once web fonts finish loading (text metrics can shift)
  if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
    document.fonts.ready.then(_initStaticWidth);
  }

  window.digi2.staticWidth = {
    apply: _applyStaticWidth,
    refresh: _initStaticWidth,
  };

  // ---- Discover requested modules -----------------------------------------
  // Modules can be declared two ways:
  //   1. d2-* flags on the loader <script> tag — global, every page.
  //   2. Per page, via a declaration element in the page's custom code:
  //        <digi2-module d2-forms d2-popups></digi2-module>
  //        <div d2-modules="forms popups"></div>   <!-- list form -->
  //      Use this when the loader lives in the global site <head> but each
  //      page needs a different set of modules — drop the tag in the page.
  //
  // A declaration element placed in the <body> (or page <head> below the
  // loader) isn't parsed yet when the loader first runs, so we re-scan once
  // the DOM is ready.

  function _pushModule(into, name) {
    if (name && into.indexOf(name) === -1) into.push(name);
  }

  // Read module flags from one element's d2-* attributes (+ d2-modules list).
  function _collectModules(el, into) {
    if (!el || !el.attributes) return;
    var a = el.attributes;
    for (var i = 0; i < a.length; i++) {
      var name = a[i].name;
      if (name === 'd2-gtm') {
        var id = el.getAttribute('d2-gtm');
        if (id) window.digi2._gtmId = id;
        _pushModule(into, 'google');
      } else if (name === 'd2-ab-tests') {
        var cfg = el.getAttribute('d2-ab-tests');
        if (cfg) window.digi2._abTestsConfigName = cfg;
        _pushModule(into, 'ab-tests');
      } else if (name === 'd2-debug-mode' || name === 'd2-module' || name === 'd2-modules') {
        // not a module flag
      } else if (name.indexOf('d2-') === 0) {
        var m = name.substring(3); // "d2-popups" -> "popups"
        if (m.indexOf('format-') === 0) m = 'format'; // format-price/-number/-sum → format
        if (m.indexOf('lightbox-') === 0) m = 'lightbox'; // lightbox-modal/-group → lightbox
        if (m === 'accordion' || m.indexOf('accordion-') === 0) m = 'tabs'; // accordion lives in tabs
        if (m === 'dropdown' || m.indexOf('dropdown-') === 0) m = 'dropdowns'; // singular/parts → module
        _pushModule(into, m);
      }
    }
    // List form: d2-modules="forms popups, cookies"
    var list = el.getAttribute('d2-modules');
    if (list) {
      list.split(/[\s,]+/).forEach(function (raw) {
        if (!raw) return;
        var m = raw.replace(/^d2-/, '');
        if (m === 'gtm') m = 'google';
        if (m.indexOf('format-') === 0) m = 'format'; // format-price/-number/-sum → format
        if (m.indexOf('lightbox-') === 0) m = 'lightbox'; // lightbox-modal/-group → lightbox
        if (m === 'accordion' || m.indexOf('accordion-') === 0) m = 'tabs';
        if (m === 'dropdown' || m.indexOf('dropdown-') === 0) m = 'dropdowns';
        _pushModule(into, m);
      });
    }
  }

  // Scan the document for per-page declaration elements.
  function _scanDeclarations(into) {
    var els = document.querySelectorAll('digi2-module, digi2-modules, [d2-module], [d2-modules]');
    for (var i = 0; i < els.length; i++) _collectModules(els[i], into);
  }

  var modules = [];
  _collectModules(loaderScript, modules); // loader tag (global)
  _scanDeclarations(modules);             // declarations already in the DOM

  // Load whatever is known right now — loader-tag modules start ASAP.
  modules.forEach(function (m) { loadModule(m); });

  function _finalizeLoad() {
    _scanDeclarations(modules); // body / page declarations are now parsed

    if (modules.length === 0) {
      console.warn('[digi2] No modules requested. Add d2-* flags to the loader tag or a <digi2-module> element on the page.');
      window.digi2._allLoaded = true;
      window.digi2.emit('loaded');
      return;
    }

    window.digi2.log('loader', 'modules requested', modules);

    Promise.all(modules.map(function (m) { return loadModule(m); })).then(function () {
      window.digi2._allLoaded = true;
      window.digi2.emit('loaded');
    }).catch(function () {
      // Some modules failed — still mark done so onReady fires
      window.digi2._allLoaded = true;
      window.digi2.emit('loaded');
    });
  }

  if (document.readyState === 'loading' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', _finalizeLoad);
  } else {
    _finalizeLoad();
  }
})();
