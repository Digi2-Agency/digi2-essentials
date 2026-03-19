/**
 * digi2 — Forms Module
 * Loaded automatically by digi2-loader.js when d2-forms is present.
 *
 * Wraps Webflow forms with UTM tracking, IP detection, GA client ID capture,
 * and page metadata — all via auto-injected hidden inputs.
 *
 * Setup in Webflow:
 *   Wrap your form in a div with: data-d2-form="formName"
 *   The module finds the <form> inside and enhances it.
 *
 * API:
 *   digi2.forms.create('contact', { ...options })
 *   digi2.forms.get('contact')
 *   digi2.forms.destroy('contact')
 *   digi2.forms.list()
 *
 * Options:
 *   formSelector:       null           — override: target form by CSS selector instead of data-d2-form wrapper
 *   utmTracking:        true           — capture & inject UTM params (utm_source, utm_medium, utm_campaign, utm_content, utm_term)
 *   clickIdTracking:    true           — capture gclid, fbclid, msclkid
 *   gaClientId:         true           — capture GA4 client ID
 *   ipTracking:         false          — fetch & inject visitor IP (uses free API)
 *   pageMeta:           true           — inject page_url, page_title, page_referrer
 *   cookieDurationDays: 365            — how long UTM/click ID cookies persist
 *   customFields:       {}             — { fieldName: 'value' } — inject arbitrary hidden fields
 *   ipApiUrl:           'https://api.ipify.org?format=json' — IP lookup endpoint
 *   onReady:            null           — callback after all fields are injected
 *
 * Auto-injected hidden input names (matching standard conventions):
 *   utm_campaign_hidden, utm_source_hidden, utm_medium_hidden, utm_content_hidden, utm_term_hidden
 *   gclid, fbclid, msclkid
 *   gaclientid
 *   page_url, page_title, page_referrer
 *   ip_address
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  // ---------------------------------------------------------------------------
  // Cookie helpers — use digi2.cookies if available, fallback to internal
  // ---------------------------------------------------------------------------
  function _setCookie(name, value, days) {
    if (window.digi2.cookies && window.digi2.cookies.set) {
      window.digi2.cookies.set(name, value, { days: days, path: '/', sameSite: 'Lax' });
    } else {
      var date = new Date();
      date.setTime(date.getTime() + days * 864e5);
      document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value) +
        ';expires=' + date.toUTCString() + ';path=/;SameSite=Lax';
    }
  }

  function _getCookie(name) {
    if (window.digi2.cookies && window.digi2.cookies.get) {
      return window.digi2.cookies.get(name);
    }
    var match = document.cookie.match(
      new RegExp('(?:^|;\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)')
    );
    return match ? decodeURIComponent(match[1]) : null;
  }

  // ---------------------------------------------------------------------------
  // UTM & click ID param names
  // ---------------------------------------------------------------------------
  var UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var CLICK_IDS = ['gclid', 'fbclid', 'msclkid'];

  // ---------------------------------------------------------------------------
  // FormManager (internal)
  // ---------------------------------------------------------------------------
  class FormManager {
    constructor(name, options = {}) {
      this.name = name;

      this.options = {
        formSelector: null,
        utmTracking: true,
        clickIdTracking: true,
        gaClientId: true,
        ipTracking: false,
        pageMeta: true,
        cookieDurationDays: 365,
        customFields: {},
        ipApiUrl: 'https://api.ipify.org?format=json',
        onReady: null,
        ...options,
      };

      this.formElement = null;
      this._injectedInputs = [];

      this._init();
    }

    // ---- Lifecycle ----------------------------------------------------------

    _init() {
      this.formElement = this._findForm();

      if (!this.formElement) {
        console.warn(`[digi2.forms] "${this.name}" — form not found.`);
        return;
      }

      // 1. Capture URL params into cookies
      this._captureUrlParams();

      // 2. Inject hidden fields
      this._injectTrackingFields();

      // 3. IP tracking (async)
      if (this.options.ipTracking) {
        this._fetchAndInjectIp();
      } else {
        this._fireReady();
      }
    }

    destroy() {
      this._injectedInputs.forEach(function (input) {
        if (input.parentNode) input.parentNode.removeChild(input);
      });
      this._injectedInputs = [];
      this.formElement = null;
    }

    // ---- Find form ----------------------------------------------------------

    _findForm() {
      // Option 1: explicit CSS selector
      if (this.options.formSelector) {
        return document.querySelector(this.options.formSelector);
      }

      // Option 2: data-d2-form="name" wrapper
      var wrapper = document.querySelector('[data-d2-form="' + this.name + '"]');
      if (wrapper) {
        // If the wrapper IS a form, use it directly
        if (wrapper.tagName === 'FORM') return wrapper;
        // Otherwise find the form inside
        return wrapper.querySelector('form');
      }

      return null;
    }

    // ---- Capture URL params to cookies --------------------------------------

    _captureUrlParams() {
      var days = this.options.cookieDurationDays;

      try {
        var urlParams = new URLSearchParams(window.location.search);

        // UTMs
        if (this.options.utmTracking) {
          UTM_PARAMS.forEach(function (param) {
            var val = urlParams.get(param);
            if (val) _setCookie(param, val, days);
          });
        }

        // Click IDs
        if (this.options.clickIdTracking) {
          CLICK_IDS.forEach(function (param) {
            var val = urlParams.get(param);
            if (val) _setCookie(param, val, days);
          });
        }

        // GA Client ID
        if (this.options.gaClientId && !_getCookie('gaclientid')) {
          var clientId = this._getGAClientId();
          if (clientId) _setCookie('gaclientid', clientId, days);
        }
      } catch (e) {
        console.error('[digi2.forms] Error capturing URL params:', e);
      }
    }

    _getGAClientId() {
      var gaCookie = _getCookie('_ga');
      if (gaCookie) {
        var parts = gaCookie.split('.');
        if (parts.length === 4) return parts[2] + '.' + parts[3];
      }
      return null;
    }

    // ---- Inject hidden fields -----------------------------------------------

    _injectTrackingFields() {
      // UTMs — named: utm_campaign_hidden, utm_source_hidden, etc.
      if (this.options.utmTracking) {
        var self = this;
        UTM_PARAMS.forEach(function (param) {
          self._injectField(param + '_hidden', _getCookie(param) || '');
        });
      }

      // Click IDs — named as-is: gclid, fbclid, msclkid
      if (this.options.clickIdTracking) {
        var self2 = this;
        CLICK_IDS.forEach(function (param) {
          self2._injectField(param, _getCookie(param) || '');
        });
      }

      // GA Client ID — named: gaclientid
      if (this.options.gaClientId) {
        this._injectField('gaclientid', _getCookie('gaclientid') || '');
      }

      // Page meta — named: page_url, page_title, page_referrer
      if (this.options.pageMeta) {
        this._injectField('page_url', window.location.href);
        this._injectField('page_title', document.title);
        this._injectField('page_referrer', document.referrer || '');
      }

      // Custom fields — named as provided
      var custom = this.options.customFields;
      for (var key in custom) {
        if (custom.hasOwnProperty(key)) {
          this._injectField(key, custom[key]);
        }
      }
    }

    _injectField(name, value) {
      if (!this.formElement) return;

      // Don't duplicate if already injected
      var existing = this.formElement.querySelector('input[name="' + name + '"]');
      if (existing) {
        existing.value = value;
        return;
      }

      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      this.formElement.appendChild(input);
      this._injectedInputs.push(input);
    }

    // ---- IP tracking --------------------------------------------------------

    _fetchAndInjectIp() {
      var self = this;

      fetch(this.options.ipApiUrl)
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var ip = data.ip || data.IP || '';
          self._injectField('ip_address', ip);
        })
        .catch(function (err) {
          console.warn('[digi2.forms] IP fetch failed:', err);
          self._injectField('ip_address', '');
        })
        .finally(function () {
          self._fireReady();
        });
    }

    // ---- Ready callback -----------------------------------------------------

    _fireReady() {
      if (typeof this.options.onReady === 'function') {
        this.options.onReady(this);
      }
    }

    // ---- Public helpers -----------------------------------------------------

    /**
     * Get all injected tracking data as an object.
     * @returns {object}
     */
    getData() {
      var data = {};
      this._injectedInputs.forEach(function (input) {
        data[input.name] = input.value;
      });
      return data;
    }

    /**
     * Manually set a hidden field value (creates it if missing).
     * @param {string} name  — field name (prefix is NOT auto-added)
     * @param {string} value
     */
    setField(name, value) {
      this._injectField(name, value);
    }
  }

  // ---------------------------------------------------------------------------
  // Register module on digi2 namespace
  // ---------------------------------------------------------------------------
  var registry = {};

  window.digi2.forms = {
    create: function (name, options) {
      if (registry[name]) {
        console.warn('[digi2.forms] "' + name + '" already exists. Destroy it first or use a different name.');
        return registry[name];
      }
      var instance = new FormManager(name, options);
      registry[name] = instance;
      return instance;
    },

    get: function (name) {
      return registry[name];
    },

    destroy: function (name) {
      var instance = registry[name];
      if (instance) {
        instance.destroy();
        delete registry[name];
      }
    },

    list: function () {
      return Object.keys(registry);
    },
  };
})();
