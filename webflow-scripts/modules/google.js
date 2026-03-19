/**
 * digi2 — Google Module
 * Loaded automatically by digi2-loader.js when d2-google is present.
 *
 * Handles:
 *   1. Consent Mode V2 — defaults all to 'denied', restores from localStorage
 *   2. GTM injection — loads GTM snippet into <head>
 *   3. Consent manager — API to grant/deny/update consent categories
 *
 * Loader attributes:
 *   g-gtm-id="GTM-XXXXXXX"    — your GTM container ID (required)
 *
 * API:
 *   digi2.google.consent.grant('analytics_storage')         Grant a single category
 *   digi2.google.consent.deny('ad_storage')                 Deny a single category
 *   digi2.google.consent.update({ analytics_storage: 'granted', ... })   Bulk update
 *   digi2.google.consent.grantAll()                         Grant everything
 *   digi2.google.consent.denyAll()                          Deny everything
 *   digi2.google.consent.get()                              Get current consent state
 *   digi2.google.consent.reset()                            Clear saved consent (resets to denied)
 *   digi2.google.dataLayerPush(data)                        Push to dataLayer
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  // ---------------------------------------------------------------------------
  // Config — read from loader script attributes
  // ---------------------------------------------------------------------------
  var loaderScript = document.querySelector('script[src*="digi2-loader"]');
  var gtmId = loaderScript ? loaderScript.getAttribute('g-gtm-id') : null;

  // ---------------------------------------------------------------------------
  // Consent categories
  // ---------------------------------------------------------------------------
  var STORAGE_KEY = 'consentModeV2';

  var CONSENT_CATEGORIES = [
    'ad_personalization',
    'ad_storage',
    'ad_user_data',
    'analytics_storage',
    'personalization_storage',
    'functionality_storage',
    'security_storage',
  ];

  var DEFAULTS = {};
  CONSENT_CATEGORIES.forEach(function (cat) {
    DEFAULTS[cat] = 'denied';
  });

  // ---------------------------------------------------------------------------
  // 1. dataLayer + gtag setup
  // ---------------------------------------------------------------------------
  window.dataLayer = window.dataLayer || [];

  function gtag() {
    window.dataLayer.push(arguments);
  }

  // Make gtag available globally (GTM expects it)
  if (!window.gtag) window.gtag = gtag;

  // ---------------------------------------------------------------------------
  // 2. Consent Mode V2 — set defaults
  // ---------------------------------------------------------------------------
  var saved = null;
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch (e) {
    // corrupted data — ignore
  }

  if (saved) {
    gtag('consent', 'default', saved);
  } else {
    gtag('consent', 'default', DEFAULTS);
  }

  // ---------------------------------------------------------------------------
  // 3. GTM injection
  // ---------------------------------------------------------------------------
  if (gtmId) {
    (function (w, d, s, l, i) {
      w[l] = w[l] || [];
      w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
      var f = d.getElementsByTagName(s)[0];
      var j = d.createElement(s);
      var dl = l !== 'dataLayer' ? '&l=' + l : '';
      j.async = true;
      j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
      f.parentNode.insertBefore(j, f);
    })(window, document, 'script', 'dataLayer', gtmId);

    // noscript iframe — inject into body when ready
    function injectNoscript() {
      var ns = document.createElement('noscript');
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.googletagmanager.com/ns.html?id=' + gtmId;
      iframe.height = '0';
      iframe.width = '0';
      iframe.style.display = 'none';
      iframe.style.visibility = 'hidden';
      ns.appendChild(iframe);
      document.body.insertBefore(ns, document.body.firstChild);
    }

    if (document.body) {
      injectNoscript();
    } else {
      document.addEventListener('DOMContentLoaded', injectNoscript);
    }
  } else {
    console.warn('[digi2.google] No g-gtm-id attribute found on loader script. GTM not injected.');
  }

  // ---------------------------------------------------------------------------
  // 4. Consent manager — public API
  // ---------------------------------------------------------------------------
  function getCurrentConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}

    // Return a copy of defaults
    var state = {};
    CONSENT_CATEGORIES.forEach(function (cat) {
      state[cat] = 'denied';
    });
    return state;
  }

  function saveAndUpdate(consentState) {
    // Persist
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consentState));

    // Push update to GTM
    gtag('consent', 'update', consentState);

    // Emit event
    if (window.digi2.emit) {
      window.digi2.emit('consent:updated', consentState);
    }
  }

  window.digi2.google = {
    consent: {
      /**
       * Get current consent state.
       * @returns {object} { ad_storage: 'granted'|'denied', ... }
       */
      get: function () {
        return getCurrentConsent();
      },

      /**
       * Grant a single consent category.
       * @param {string} category
       */
      grant: function (category) {
        var state = getCurrentConsent();
        state[category] = 'granted';
        saveAndUpdate(state);
      },

      /**
       * Deny a single consent category.
       * @param {string} category
       */
      deny: function (category) {
        var state = getCurrentConsent();
        state[category] = 'denied';
        saveAndUpdate(state);
      },

      /**
       * Bulk update consent.
       * @param {object} updates  { analytics_storage: 'granted', ad_storage: 'denied', ... }
       */
      update: function (updates) {
        var state = getCurrentConsent();
        for (var key in updates) {
          if (updates.hasOwnProperty(key)) {
            state[key] = updates[key];
          }
        }
        saveAndUpdate(state);
      },

      /**
       * Grant all consent categories.
       */
      grantAll: function () {
        var state = {};
        CONSENT_CATEGORIES.forEach(function (cat) {
          state[cat] = 'granted';
        });
        saveAndUpdate(state);
      },

      /**
       * Deny all consent categories.
       */
      denyAll: function () {
        var state = {};
        CONSENT_CATEGORIES.forEach(function (cat) {
          state[cat] = 'denied';
        });
        saveAndUpdate(state);
      },

      /**
       * Reset — clear saved consent, reverts to denied on next page load.
       */
      reset: function () {
        localStorage.removeItem(STORAGE_KEY);
        var state = {};
        CONSENT_CATEGORIES.forEach(function (cat) {
          state[cat] = 'denied';
        });
        gtag('consent', 'update', state);
        if (window.digi2.emit) {
          window.digi2.emit('consent:updated', state);
        }
      },

      /**
       * List all consent category names.
       * @returns {string[]}
       */
      categories: function () {
        return CONSENT_CATEGORIES.slice();
      },
    },

    /**
     * Push data to the dataLayer.
     * @param {object} data
     */
    dataLayerPush: function (data) {
      window.dataLayer.push(data);
    },

    /**
     * Get the GTM container ID (or null if not set).
     */
    getGtmId: function () {
      return gtmId;
    },
  };
})();
