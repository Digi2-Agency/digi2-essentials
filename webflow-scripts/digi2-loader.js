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
 *
 * ─── Loader Attributes ──────────────────────────────────────────────────────
 *
 *   d2-gtm="GTM-XXXXXXX"               GTM container ID — auto-loads google module
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
 * ─── Popups Options ─────────────────────────────────────────────────────────
 *
 *   popupSelector:        '.popup__overlay'   CSS selector for the popup element
 *   openTriggerSelector:  null                CSS selector — clicks open this popup
 *   closeTriggerSelector: null                CSS selector — clicks close this popup
 *   dataTagTrigger:       true                Listen for data-d2-show-popup="name" clicks
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
 *   formSelector:         null                CSS selector (alternative to data-d2-form wrapper)
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
 *   data-d2-show-popup="name"           Click to open a popup by name
 *   data-d2-form="name"                 Wrapper for form enhancement
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
       'validate', 'addRule', 'consent', 'dataLayerPush', 'getGtmId'].forEach(function (method) {
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

  // ---- Discover requested modules from d2-* attributes --------------------
  var modules = [];
  var attrs = loaderScript.attributes;

  // Special: d2-gtm="GTM-XXX" — auto-loads google module and stores the ID
  var gtmAttr = loaderScript.getAttribute('d2-gtm');
  if (gtmAttr) {
    window.digi2._gtmId = gtmAttr;
    window.digi2.log('loader', 'd2-gtm detected → ' + gtmAttr);
  }

  for (var i = 0; i < attrs.length; i++) {
    var name = attrs[i].name;
    if (name === 'd2-gtm') {
      // d2-gtm="ID" loads the google module
      if (modules.indexOf('google') === -1) modules.push('google');
    } else if (name === 'd2-debug-mode') {
      // skip — not a module
    } else if (name.indexOf('d2-') === 0) {
      modules.push(name.substring(3)); // "d2-popups" → "popups"
    }
  }

  if (modules.length === 0) {
    console.warn('[digi2] No d2-* modules specified on the loader script tag.');
    window.digi2._allLoaded = true;
    window.digi2.emit('loaded');
    return;
  }

  // ---- Load initial modules (from d2-* attributes) -------------------------
  Promise.all(modules.map(function (moduleName) {
    return loadModule(moduleName);
  })).then(function () {
    window.digi2._allLoaded = true;
    window.digi2.emit('loaded');
  }).catch(function () {
    // Some modules failed — still mark as done so onReady fires
    window.digi2._allLoaded = true;
    window.digi2.emit('loaded');
  });
})();
