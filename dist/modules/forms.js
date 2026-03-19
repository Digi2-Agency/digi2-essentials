/**
 * digi2 — Forms Module
 * Loaded automatically by digi2-loader.js when d2-forms is present.
 *
 * Features:
 *   - UTM tracking, click IDs, GA client ID, IP, page meta (auto-injected hidden inputs)
 *   - Validation engine with built-in rules + custom patterns
 *   - On-blur + on-submit validation with CSS class + data-attribute error feedback
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
 *   digi2.forms.validate(value, rules)            — standalone validation utility
 *   digi2.forms.addRule('ruleName', fn)            — register a custom rule globally
 *
 * Validation in create():
 *   digi2.forms.create('contact', {
 *     validation: {
 *       name:  { required: true, minLength: 2, letters: true, spaces: true },
 *       email: { required: true, email: true },
 *       phone: { required: true, phone: true },
 *     },
 *     errorClass:     'd2-error',
 *     errorAttribute: 'data-d2-error',
 *     validateOn:     'blur',          — 'blur' | 'submit' | 'both' (default: 'both')
 *     onValidationError: null,         — callback(fieldName, errors, inputEl)
 *     onSubmit: null,                  — callback(data, formEl) — fires only if valid
 *   })
 *
 * Standalone:
 *   digi2.forms.validate('hello', { required: true, minLength: 3 })
 *   → { valid: true, errors: [] }
 *
 *   digi2.forms.validate('', { required: true })
 *   → { valid: false, errors: ['required'] }
 *
 * Auto-injected hidden input names:
 *   utm_campaign_hidden, utm_source_hidden, utm_medium_hidden,
 *   utm_content_hidden, utm_term_hidden,
 *   gclid, fbclid, msclkid, gaclientid,
 *   page_url, page_title, page_referrer, ip_address
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  function _log(action, data) {
    if (window.digi2.log) window.digi2.log('forms', action, data);
  }

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
  // Validation Engine
  // ---------------------------------------------------------------------------
  var BUILT_IN_RULES = {
    required: function (val) {
      return val !== null && val !== undefined && String(val).trim().length > 0;
    },
    email: function (val) {
      if (!val) return true; // not required by itself — pair with required
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val));
    },
    phone: function (val) {
      if (!val) return true;
      return /^[\d\s\-\+\(\)\.]{6,20}$/.test(String(val));
    },
    url: function (val) {
      if (!val) return true;
      return /^https?:\/\/.+\..+/.test(String(val));
    },
    number: function (val) {
      if (!val) return true;
      return /^-?\d+(\.\d+)?$/.test(String(val));
    },
    integer: function (val) {
      if (!val) return true;
      return /^-?\d+$/.test(String(val));
    },
    letters: function (val) {
      if (!val) return true;
      // only letters (Unicode-aware via no digits/specials check)
      return /^[a-zA-ZÀ-ÿĀ-žА-яёЁ\s\-']+$/.test(String(val));
    },
    numbers: function (val) {
      if (!val) return true;
      return /^\d+$/.test(String(val));
    },
    alphanumeric: function (val) {
      if (!val) return true;
      return /^[a-zA-Z0-9]+$/.test(String(val));
    },
    noSpaces: function (val) {
      if (!val) return true;
      return !/\s/.test(String(val));
    },
    noSpecialChars: function (val) {
      if (!val) return true;
      return /^[a-zA-Z0-9\s]+$/.test(String(val));
    },
  };

  // Rules that take a parameter value (not just boolean)
  var PARAM_RULES = {
    minLength: function (val, min) {
      if (!val) return true;
      return String(val).length >= min;
    },
    maxLength: function (val, max) {
      if (!val) return true;
      return String(val).length <= max;
    },
    min: function (val, min) {
      if (!val) return true;
      return Number(val) >= min;
    },
    max: function (val, max) {
      if (!val) return true;
      return Number(val) <= max;
    },
    pattern: function (val, regex) {
      if (!val) return true;
      var re = regex instanceof RegExp ? regex : new RegExp(regex);
      return re.test(String(val));
    },
    equals: function (val, other) {
      return String(val) === String(other);
    },
    matchField: function (val, fieldName, _form) {
      // special — resolved at validation time with form context
      if (!_form) return true;
      var otherInput = _form.querySelector('[name="' + fieldName + '"]');
      return otherInput ? String(val) === String(otherInput.value) : true;
    },
  };

  // Custom rules registered via digi2.forms.addRule()
  var customRules = {};

  // ---------------------------------------------------------------------------
  // Default validation rules for standard field names
  // Auto-applied when autoValidation is true (default).
  // User-provided validation rules override/extend these.
  // ---------------------------------------------------------------------------
  var DEFAULT_FIELD_RULES = {
    'NAME':           { required: true, minLength: 2, letters: true },
    'EMAIL':          { required: true, email: true },
    'PHONE':          { required: true, phone: true },
    'MESSAGE':        { required: true, minLength: 10 },
    'CONSENT_GDPR':   { required: true },
    'CONSENT_EMAIL':  { required: true },
    'CONSENT_PHONE':  { required: true },
  };

  /**
   * Validate a single value against a rules object.
   * @param {*}      value
   * @param {object} rules  e.g. { required: true, minLength: 3, email: true }
   * @param {Element} [formEl]  optional form element (for matchField)
   * @returns {{ valid: boolean, errors: string[] }}
   */
  function validateValue(value, rules, formEl) {
    var errors = [];
    var val = value !== null && value !== undefined ? String(value) : '';

    for (var ruleName in rules) {
      if (!rules.hasOwnProperty(ruleName)) continue;
      var ruleVal = rules[ruleName];

      // Skip disabled rules
      if (ruleVal === false) continue;

      var passed = true;

      if (BUILT_IN_RULES[ruleName]) {
        // Boolean rules: { required: true, email: true }
        passed = BUILT_IN_RULES[ruleName](val);
      } else if (PARAM_RULES[ruleName]) {
        // Parameterized rules: { minLength: 3 }
        passed = PARAM_RULES[ruleName](val, ruleVal, formEl);
      } else if (customRules[ruleName]) {
        // Custom rules
        passed = customRules[ruleName](val, ruleVal, formEl);
      } else {
        console.warn('[digi2.forms] Unknown validation rule: ' + ruleName);
        continue;
      }

      if (!passed) {
        errors.push(ruleName);
      }
    }

    return { valid: errors.length === 0, errors: errors };
  }

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
        autoValidation: true,         // auto-detect NAME, EMAIL, PHONE, etc. and apply default rules
        validation: null,             // { fieldName: { rule: value, ... }, ... } — overrides/extends auto rules
        errorClass: 'd2-error',       // CSS class added to invalid fields
        errorAttribute: 'data-d2-error', // attribute set on invalid fields (value = error names)
        errorSelector: '[data-d2-form-error]', // selector for error message element inside input's parent
        errorDisplay: 'inline',       // 'inline' = per-field errors | 'summary' = one block above submit
        inputOnError: null,           // CSS object applied to invalid inputs, e.g. { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.2)' }
        inputOnValid: null,           // CSS object applied when input becomes valid (resets), e.g. { borderColor: '', boxShadow: '' }
        summarySelector: '[data-d2-form-summary]', // selector for summary error container (errorDisplay: 'summary')
        summaryMessage: 'Please fix the following errors:', // heading text for summary
        validateOn: 'both',           // 'blur' | 'submit' | 'both'
        onValidationError: null,      // callback(fieldName, errors, inputEl)
        onSubmit: null,               // callback(data, formEl) — only fires if valid
        onReady: null,
        ...options,
      };

      this.formElement = null;
      this._injectedInputs = [];
      this._boundBlurHandler = null;
      this._boundSubmitHandler = null;

      this._init();
    }

    // ---- Lifecycle ----------------------------------------------------------

    _init() {
      this.formElement = this._findForm();

      if (!this.formElement) {
        console.warn(`[digi2.forms] "${this.name}" — form not found.`);
        return;
      }

      _log('init → ' + this.name, this.options);

      // 1. Capture URL params into cookies
      this._captureUrlParams();

      // 2. Inject hidden fields
      this._injectTrackingFields();

      // 3. Build validation rules (auto-detect + user overrides)
      this._resolvedValidation = this._buildValidationRules();

      if (this._resolvedValidation && Object.keys(this._resolvedValidation).length > 0) {
        _log('validation setup → ' + this.name, this._resolvedValidation);
        this._setupValidation();
      }

      // 4. IP tracking (async)
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

      if (this.formElement && this._boundBlurHandler) {
        this.formElement.removeEventListener('focusout', this._boundBlurHandler);
      }
      if (this.formElement && this._boundSubmitHandler) {
        this.formElement.removeEventListener('submit', this._boundSubmitHandler);
      }

      this.formElement = null;
    }

    // ---- Find form ----------------------------------------------------------

    _findForm() {
      if (this.options.formSelector) {
        return document.querySelector(this.options.formSelector);
      }

      var wrapper = document.querySelector('[data-d2-form="' + this.name + '"]');
      if (wrapper) {
        if (wrapper.tagName === 'FORM') return wrapper;
        return wrapper.querySelector('form');
      }

      return null;
    }

    // ---- Auto-detection of validation rules --------------------------------

    /**
     * Build final validation rules by:
     * 1. Scanning the form for inputs with known names (NAME, EMAIL, etc.)
     * 2. Applying default rules from DEFAULT_FIELD_RULES
     * 3. Merging/overriding with user-provided validation option
     */
    _buildValidationRules() {
      var merged = {};

      // Auto-detect: scan form for inputs matching known field names
      if (this.options.autoValidation && this.formElement) {
        for (var fieldName in DEFAULT_FIELD_RULES) {
          if (!DEFAULT_FIELD_RULES.hasOwnProperty(fieldName)) continue;
          var input = this.formElement.querySelector('[name="' + fieldName + '"]');
          if (input) {
            // Copy default rules for this field
            merged[fieldName] = Object.assign({}, DEFAULT_FIELD_RULES[fieldName]);
            _log('auto-detected field → ' + fieldName, merged[fieldName]);
          }
        }
      }

      // User overrides: merge on top (per-field, per-rule)
      if (this.options.validation) {
        for (var key in this.options.validation) {
          if (!this.options.validation.hasOwnProperty(key)) continue;
          if (merged[key]) {
            // Merge: user rules override individual defaults
            Object.assign(merged[key], this.options.validation[key]);
          } else {
            merged[key] = Object.assign({}, this.options.validation[key]);
          }
        }
      }

      return merged;
    }

    // ---- Validation ---------------------------------------------------------

    _setupValidation() {
      var self = this;
      var validateOn = this.options.validateOn;

      // Blur validation (delegated via focusout)
      if (validateOn === 'blur' || validateOn === 'both') {
        this._boundBlurHandler = function (e) {
          var input = e.target;
          if (!input || !input.name) return;
          var fieldName = input.name;
          if (self._resolvedValidation[fieldName]) {
            self._validateField(fieldName, input);
          }
        };
        this.formElement.addEventListener('focusout', this._boundBlurHandler);
      }

      // Submit validation
      if (validateOn === 'submit' || validateOn === 'both') {
        this._boundSubmitHandler = function (e) {
          var allValid = self.validateAll();

          if (!allValid) {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }

          // If onSubmit callback exists, prevent default and call it
          if (typeof self.options.onSubmit === 'function') {
            e.preventDefault();
            self.options.onSubmit(self.getData(), self.formElement);
          }
        };
        this.formElement.addEventListener('submit', this._boundSubmitHandler);
      }
    }

    /**
     * Find the error container for a given input.
     * Walks up to 3 parent levels from the input.
     * Returns the parent element to search error elements within.
     */
    _findErrorContainer(inputEl) {
      if (!inputEl) return null;
      var parent = inputEl.parentElement;
      for (var i = 0; i < 3 && parent; i++) {
        // Check if this container has ANY error elements
        if (parent.querySelector('[data-d2-form-error]') ||
            parent.querySelector('[data-d2-form-error-required]') ||
            parent.querySelector('[data-d2-form-error-email]')) {
          return parent;
        }
        parent = parent.parentElement;
      }
      // Fallback: return immediate parent
      return inputEl.parentElement;
    }

    /**
     * Show/hide per-rule error elements within a container.
     *
     * Error elements use data attributes matching rule names:
     *   data-d2-form-error-required    — shown when 'required' fails
     *   data-d2-form-error-email       — shown when 'email' fails
     *   data-d2-form-error-minLength   — shown when 'minLength' fails
     *   data-d2-form-error-phone       — shown when 'phone' fails
     *   ... etc for any rule name
     *
     *   data-d2-form-error             — generic fallback, shown when ANY rule fails
     *                                    (only if no specific per-rule element matched)
     *
     * The attribute value is the error message text.
     * Elements should be set to display:none in Webflow by default.
     * When shown, display is set to 'flex'. When valid, back to 'none'.
     */
    _updateErrorElements(container, errors, isValid) {
      if (!container) return;

      // All possible per-rule error elements in this container
      var allErrorEls = container.querySelectorAll('[data-d2-form-error-required], [data-d2-form-error-email], [data-d2-form-error-phone], [data-d2-form-error-minLength], [data-d2-form-error-maxLength], [data-d2-form-error-min], [data-d2-form-error-max], [data-d2-form-error-letters], [data-d2-form-error-numbers], [data-d2-form-error-pattern], [data-d2-form-error-url], [data-d2-form-error-matchField], [data-d2-form-error-integer], [data-d2-form-error-alphanumeric], [data-d2-form-error-noSpaces], [data-d2-form-error-noSpecialChars], [data-d2-form-error-number], [data-d2-form-error-equals]');

      var genericEl = container.querySelector('[data-d2-form-error]');
      var specificMatched = false;

      if (isValid) {
        // Hide everything
        allErrorEls.forEach(function (el) { el.style.display = 'none'; });
        if (genericEl) genericEl.style.display = 'none';
        return;
      }

      // Hide all first, then show only the ones that match failed rules
      allErrorEls.forEach(function (el) { el.style.display = 'none'; });

      errors.forEach(function (ruleName) {
        var selector = '[data-d2-form-error-' + ruleName + ']';
        var el = container.querySelector(selector);
        if (el) {
          el.style.display = 'flex';
          specificMatched = true;
          _log('show error element → ' + ruleName, el.getAttribute('data-d2-form-error-' + ruleName));
        }
      });

      // Generic fallback — only show if no specific error element was found
      if (genericEl) {
        if (specificMatched) {
          genericEl.style.display = 'none';
        } else {
          genericEl.style.display = 'flex';
        }
      }
    }

    /**
     * Validate a single field by name.
     * @param {string} fieldName
     * @param {Element} [inputEl] — auto-found if not provided
     * @returns {{ valid: boolean, errors: string[] }}
     */
    _validateField(fieldName, inputEl) {
      if (!inputEl) {
        inputEl = this.formElement.querySelector('[name="' + fieldName + '"]');
      }
      if (!inputEl) return { valid: true, errors: [] };

      var rules = this._resolvedValidation[fieldName];
      if (!rules) return { valid: true, errors: [] };

      // For checkboxes, use checked state as the value
      var val = inputEl.type === 'checkbox' ? (inputEl.checked ? 'on' : '') : inputEl.value;

      var result = validateValue(val, rules, this.formElement);

      _log('validate field → ' + fieldName, { value: val, valid: result.valid, errors: result.errors });

      // Find error container and update error elements
      var container = this._findErrorContainer(inputEl);

      // Apply/remove error indicators on the input itself
      if (result.valid) {
        inputEl.classList.remove(this.options.errorClass);
        inputEl.removeAttribute(this.options.errorAttribute);
        // Restore styles
        if (this.options.inputOnValid) {
          Object.assign(inputEl.style, this.options.inputOnValid);
        }
      } else {
        inputEl.classList.add(this.options.errorClass);
        inputEl.setAttribute(this.options.errorAttribute, result.errors.join(','));
        // Apply error styles
        if (this.options.inputOnError) {
          Object.assign(inputEl.style, this.options.inputOnError);
        }

        if (typeof this.options.onValidationError === 'function') {
          this.options.onValidationError(fieldName, result.errors, inputEl);
        }
      }

      // Update error display (inline per-field or summary — handled separately)
      if (this.options.errorDisplay === 'inline') {
        this._updateErrorElements(container, result.errors, result.valid);
      }

      return result;
    }

    /**
     * Validate all fields defined in the resolved validation rules.
     * @returns {boolean} true if all valid
     */
    validateAll() {
      var allValid = true;
      var validation = this._resolvedValidation;
      var failedFields = [];

      for (var fieldName in validation) {
        if (!validation.hasOwnProperty(fieldName)) continue;
        var result = this._validateField(fieldName);
        if (!result.valid) {
          allValid = false;
          failedFields.push({ name: fieldName, errors: result.errors });
        }
      }

      // Summary mode: update the summary block
      if (this.options.errorDisplay === 'summary') {
        this._updateSummary(failedFields, allValid);
      }

      return allValid;
    }

    // ---- Summary error display ----------------------------------------------

    /**
     * Find or create the summary error container.
     * Looks for [data-d2-form-summary] inside the form.
     * If not found, creates one and inserts it before the submit button.
     */
    _getSummaryElement() {
      if (!this.formElement) return null;

      var el = this.formElement.querySelector(this.options.summarySelector);
      if (el) return el;

      // Auto-create: insert before submit button
      el = document.createElement('div');
      el.setAttribute('data-d2-form-summary', '');
      el.style.display = 'none';

      var submitBtn = this.formElement.querySelector('[type="submit"], button:not([type])');
      if (submitBtn) {
        submitBtn.parentNode.insertBefore(el, submitBtn);
      } else {
        this.formElement.appendChild(el);
      }

      _log('summary element auto-created');
      return el;
    }

    /**
     * Update the summary block with failed field names / errors.
     */
    _updateSummary(failedFields, allValid) {
      var summaryEl = this._getSummaryElement();
      if (!summaryEl) return;

      if (allValid) {
        summaryEl.style.display = 'none';
        summaryEl.innerHTML = '';
        return;
      }

      var html = '<p>' + this.options.summaryMessage + '</p><ul>';
      failedFields.forEach(function (field) {
        html += '<li><strong>' + field.name + '</strong>: ' + field.errors.join(', ') + '</li>';
      });
      html += '</ul>';

      summaryEl.innerHTML = html;
      summaryEl.style.display = 'flex';

      _log('summary updated', failedFields);
    }

    /**
     * Clear all validation errors from the form.
     */
    clearErrors() {
      if (!this.formElement) return;
      var self = this;
      var errorClass = this.options.errorClass;
      var errorAttr = this.options.errorAttribute;

      // Remove error class, attribute, and restore styles on inputs
      var errorInputs = this.formElement.querySelectorAll('.' + errorClass);
      errorInputs.forEach(function (el) {
        el.classList.remove(errorClass);
        el.removeAttribute(errorAttr);
        if (self.options.inputOnValid) {
          Object.assign(el.style, self.options.inputOnValid);
        }
      });

      // Hide all inline error message elements (generic + per-rule)
      var allErrorEls = this.formElement.querySelectorAll(
        '[data-d2-form-error], ' +
        '[data-d2-form-error-required], [data-d2-form-error-email], [data-d2-form-error-phone], ' +
        '[data-d2-form-error-minLength], [data-d2-form-error-maxLength], [data-d2-form-error-letters], ' +
        '[data-d2-form-error-numbers], [data-d2-form-error-pattern], [data-d2-form-error-url], ' +
        '[data-d2-form-error-min], [data-d2-form-error-max], [data-d2-form-error-matchField], ' +
        '[data-d2-form-error-number], [data-d2-form-error-integer], [data-d2-form-error-alphanumeric], ' +
        '[data-d2-form-error-noSpaces], [data-d2-form-error-noSpecialChars], [data-d2-form-error-equals]'
      );
      allErrorEls.forEach(function (el) {
        el.style.display = 'none';
      });

      // Hide summary block
      var summaryEl = this.formElement.querySelector(this.options.summarySelector);
      if (summaryEl) {
        summaryEl.style.display = 'none';
        summaryEl.innerHTML = '';
      }
    }

    // ---- Capture URL params to cookies --------------------------------------

    _captureUrlParams() {
      var days = this.options.cookieDurationDays;

      try {
        var urlParams = new URLSearchParams(window.location.search);

        if (this.options.utmTracking) {
          UTM_PARAMS.forEach(function (param) {
            var val = urlParams.get(param);
            if (val) _setCookie(param, val, days);
          });
        }

        if (this.options.clickIdTracking) {
          CLICK_IDS.forEach(function (param) {
            var val = urlParams.get(param);
            if (val) _setCookie(param, val, days);
          });
        }

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
      if (this.options.utmTracking) {
        var self = this;
        UTM_PARAMS.forEach(function (param) {
          self._injectField(param + '_hidden', _getCookie(param) || '');
        });
      }

      if (this.options.clickIdTracking) {
        var self2 = this;
        CLICK_IDS.forEach(function (param) {
          self2._injectField(param, _getCookie(param) || '');
        });
      }

      if (this.options.gaClientId) {
        this._injectField('gaclientid', _getCookie('gaclientid') || '');
      }

      if (this.options.pageMeta) {
        this._injectField('page_url', window.location.href);
        this._injectField('page_title', document.title);
        this._injectField('page_referrer', document.referrer || '');
      }

      var custom = this.options.customFields;
      for (var key in custom) {
        if (custom.hasOwnProperty(key)) {
          this._injectField(key, custom[key]);
        }
      }
    }

    _injectField(name, value) {
      if (!this.formElement) return;

      _log('inject field → ' + name, value);

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

    getData() {
      var data = {};
      this._injectedInputs.forEach(function (input) {
        data[input.name] = input.value;
      });
      return data;
    }

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

    /**
     * Standalone validation utility — validate any value against rules.
     * @param {*}      value
     * @param {object} rules   e.g. { required: true, minLength: 3, email: true }
     * @returns {{ valid: boolean, errors: string[] }}
     */
    validate: function (value, rules) {
      return validateValue(value, rules);
    },

    /**
     * Register a custom validation rule globally.
     * @param {string}   name  Rule name
     * @param {function} fn    (value, ruleParam, formEl) → boolean
     */
    addRule: function (name, fn) {
      if (typeof fn !== 'function') {
        console.warn('[digi2.forms] addRule expects a function.');
        return;
      }
      customRules[name] = fn;
    },
  };
})();
