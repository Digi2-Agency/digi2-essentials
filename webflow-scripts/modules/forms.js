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
 *     errorMessages:  { minLength: 'Too short!', required: 'Fill this in.' },  — optional custom error messages
 *     autoErrorElements: true,         — auto-create [d2-form-error-text] with <label> wrapping + position:absolute
 *     errorFontSize:  '12px',          — font-size for auto-created error text
 *     errorColor:     '#ef4444',       — color for auto-created error text
 *     errorLocation:  'below',         — 'below' | 'above' (relative to input)
 *     errorWrapClass: '',              — CSS class for auto-created <label> wrapper
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
 *   UTM_CAMPAIGN, UTM_SOURCE, UTM_MEDIUM, UTM_CONTENT, UTM_TERM,
 *   GCLID, FBCLID, MSCLKID, GOOGLE_ANALYTICS_ID,
 *   PAGE_URL, PAGE_TITLE, PAGE_REFERRER, IP_ADDRESS
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
    // Always use direct cookie setting — avoids proxy/Promise issues
    // when the cookies module hasn't loaded yet.
    var date = new Date();
    date.setTime(date.getTime() + days * 864e5);
    document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value) +
      ';expires=' + date.toUTCString() + ';path=/;SameSite=Lax';
  }

  function _getCookie(name) {
    // Always use direct cookie parsing — avoids proxy/Promise issues
    // when the cookies module hasn't loaded yet.
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
  // Default error messages for built-in rules
  // Use {param} placeholder for the rule parameter value.
  // ---------------------------------------------------------------------------
  var DEFAULT_ERROR_MESSAGES = {
    required:        'This field is required.',
    email:           'Please enter a valid email address.',
    phone:           'Please enter a valid phone number.',
    url:             'Please enter a valid URL.',
    number:          'Please enter a valid number.',
    integer:         'Please enter a whole number.',
    letters:         'Only letters are allowed.',
    numbers:         'Only numbers are allowed.',
    alphanumeric:    'Only letters and numbers are allowed.',
    noSpaces:        'Spaces are not allowed.',
    noSpecialChars:  'Special characters are not allowed.',
    minLength:       'Must be at least {param} characters.',
    maxLength:       'Must be no more than {param} characters.',
    min:             'Must be at least {param}.',
    max:             'Must be no more than {param}.',
    pattern:         'Invalid format.',
    equals:          'Values do not match.',
    matchField:      'Fields do not match.',
  };

  // ---------------------------------------------------------------------------
  // Default validation rules for standard field names
  // Auto-applied when autoValidation is true (default).
  // User-provided validation rules override/extend these.
  // ---------------------------------------------------------------------------
  var DEFAULT_FIELD_RULES = {
    'NAME':           { required: true, minLength: 2, letters: true },
    'EMAIL':          { required: true, email: true },
    'PHONE':          { required: true, phone: true },
    'MESSAGE':        { required: true, minLength: 30 },
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
        errorSelector: '[d2-form-error-text]', // selector for error message element inside input's parent
        errorDisplay: 'inline',       // 'inline' = per-field errors | 'summary' = one block above submit
        errorMessages: null,          // { ruleName: 'Custom message', ... } — overrides default error messages
        autoErrorElements: false,     // auto-create [d2-form-error-text] elements for each validated field
        errorFontSize: '12px',        // font-size for auto-created error text
        errorColor: '#ef4444',        // color for auto-created error text
        errorLocation: 'below',       // 'below' | 'above' — placement relative to input
        errorWrapClass: '',           // CSS class for auto-created <label> wrapper
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
      this._autoCreatedElements = [];
      this._autoCreatedWrappers = [];
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

      _log('init → ' + this.name, { errorMessages: !!this.options.errorMessages, options: this.options });

      // 1. Neutralize browser autofill background color
      this._injectAutofillReset();

      // 2. Capture URL params into cookies
      this._captureUrlParams();

      // 3. Inject hidden fields
      this._injectTrackingFields();

      // 4. Build validation rules (auto-detect + user overrides)
      this._resolvedValidation = this._buildValidationRules();

      if (this._resolvedValidation && Object.keys(this._resolvedValidation).length > 0) {
        _log('validation setup → ' + this.name, this._resolvedValidation);

        // 4b. Auto-create error text elements if enabled
        this._createAutoErrorElements();

        this._setupValidation();

        // Remove native `required` attributes on fields that digi2 validates.
        // Browser validation fires before JS submit handlers, blocking digi2
        // from showing its own inline errors on the first click.
        var self = this;
        for (var fieldName in this._resolvedValidation) {
          if (!this._resolvedValidation.hasOwnProperty(fieldName)) continue;
          var input = this.formElement.querySelector('[name="' + fieldName + '"]');
          if (input && input.hasAttribute('required')) {
            input.removeAttribute('required');
            _log('removed native required → ' + fieldName);
          }
        }
        // Also disable Webflow's novalidate isn't always set
        this.formElement.setAttribute('novalidate', '');
      }

      // 5. IP tracking (async)
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

      // Clean up auto-created error elements
      this._autoCreatedElements.forEach(function (el) {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      this._autoCreatedElements = [];

      // Unwrap auto-created label wrappers (move input back, remove label)
      this._autoCreatedWrappers.forEach(function (entry) {
        var wrapper = entry.wrapper;
        var input = entry.input;
        var parent = wrapper.parentNode;
        if (!parent) return;
        parent.insertBefore(input, wrapper);
        parent.removeChild(wrapper);
      });
      this._autoCreatedWrappers = [];

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
      // Direct element reference (used by createAll)
      if (this.options._formElement) {
        return this.options._formElement;
      }

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

    // ---- Autofill background reset -----------------------------------------

    /**
     * Inject a <style> tag that removes the browser autofill background color
     * (Chrome/Safari's yellow/blue :-webkit-autofill highlight).
     * Scoped to this form's inputs only.
     */
    _injectAutofillReset() {
      if (!this.formElement) return;

      var formSel = this.formElement.id
        ? '#' + this.formElement.id
        : '[data-d2-form="' + this.name + '"] form';

      var css =
        formSel + ' input:-webkit-autofill,' +
        formSel + ' input:-webkit-autofill:hover,' +
        formSel + ' input:-webkit-autofill:focus,' +
        formSel + ' input:-webkit-autofill:active,' +
        formSel + ' textarea:-webkit-autofill,' +
        formSel + ' select:-webkit-autofill {' +
        '  -webkit-box-shadow: 0 0 0 1000px transparent inset !important;' +
        '  -webkit-text-fill-color: inherit !important;' +
        '  transition: background-color 5000s ease-in-out 0s;' +
        '}';

      var style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);

      _log('autofill background reset injected → ' + this.name);
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
      var autoFound = [];
      if (this.options.autoValidation && this.formElement) {
        for (var fieldName in DEFAULT_FIELD_RULES) {
          if (!DEFAULT_FIELD_RULES.hasOwnProperty(fieldName)) continue;
          var input = this.formElement.querySelector('[name="' + fieldName + '"]');
          if (input) {
            merged[fieldName] = Object.assign({}, DEFAULT_FIELD_RULES[fieldName]);
            autoFound.push(fieldName);
          }
        }
        if (autoFound.length > 0) {
          _log('auto-detected fields', autoFound);
        } else {
          _log('no standard fields found (NAME, EMAIL, PHONE, MESSAGE, CONSENT_*)');
        }
      }

      // Auto-detect [required] attribute on any input not already in merged
      var requiredFound = [];
      if (this.options.autoValidation && this.formElement) {
        var allInputs = this.formElement.querySelectorAll('input[required], textarea[required], select[required]');
        allInputs.forEach(function (el) {
          if (!el.name || el.type === 'hidden') return;
          if (!merged[el.name]) {
            merged[el.name] = { required: true };
            requiredFound.push(el.name);
          }
        });
        if (requiredFound.length > 0) {
          _log('auto-detected [required] fields', requiredFound);
        }
      }

      // Log all form fields for debugging
      if (this.formElement) {
        var debugInputs = this.formElement.querySelectorAll('input, textarea, select');
        var inputNames = [];
        debugInputs.forEach(function (el) {
          if (el.name && el.type !== 'hidden') inputNames.push(el.name);
        });
        _log('all form fields found', inputNames);
      }

      // User overrides: merge on top (per-field, per-rule)
      if (this.options.validation) {
        var userFields = [];
        for (var key in this.options.validation) {
          if (!this.options.validation.hasOwnProperty(key)) continue;
          if (merged[key]) {
            Object.assign(merged[key], this.options.validation[key]);
          } else {
            merged[key] = Object.assign({}, this.options.validation[key]);
          }
          userFields.push(key);
        }
        _log('user validation overrides', userFields);
      }

      // Log final resolved rules
      var resolvedNames = Object.keys(merged);
      if (resolvedNames.length > 0) {
        _log('final validation rules', merged);
      } else {
        _log('no validation rules to apply');
      }

      return merged;
    }

    // ---- Error message resolution -------------------------------------------

    /**
     * Resolve the human-readable error message for a given rule.
     * Priority: user errorMessages > default messages > rule name fallback.
     * @param {string} ruleName   e.g. 'minLength'
     * @param {*}      ruleParam  e.g. 30 (the param value from the rule config)
     * @returns {string}
     */
    _getErrorMessage(ruleName, ruleParam) {
      var userMessages = this.options.errorMessages;
      var isCustom = !!(userMessages && userMessages[ruleName]);
      var msg = (isCustom ? userMessages[ruleName] : null) || DEFAULT_ERROR_MESSAGES[ruleName] || ruleName;
      _log('error message → ' + ruleName, { custom: isCustom, message: msg });
      if (ruleParam !== undefined && ruleParam !== true) {
        msg = msg.replace(/\{param\}/g, String(ruleParam));
      }
      return msg;
    }

    // ---- Auto-create error text elements --------------------------------------

    /**
     * For each validated field, auto-create a [d2-form-error-text] element
     * inside a <label> wrapper with position:absolute so it doesn't affect layout.
     *
     * If the input is already inside a <label>, reuses it.
     * Otherwise creates a new <label> and wraps the input.
     */
    _createAutoErrorElements() {
      if (!this.options.autoErrorElements || !this.formElement) return;
      if (!this._resolvedValidation) return;

      var opts = this.options;
      var created = [];

      for (var fieldName in this._resolvedValidation) {
        if (!this._resolvedValidation.hasOwnProperty(fieldName)) continue;

        var input = this.formElement.querySelector('[name="' + fieldName + '"]');
        if (!input || input.type === 'hidden' || input.type === 'checkbox' || input.type === 'radio') continue;

        // Skip if an error element already exists for this input
        if (this._findErrorElement(input)) continue;

        // --- Ensure input is inside a <label> with position:relative ---
        var existingLabel = input.closest('label');
        var wrapper;

        if (existingLabel) {
          wrapper = existingLabel;
          wrapper.style.position = 'relative';
          wrapper.style.display = 'block';
        } else {
          wrapper = document.createElement('label');
          wrapper.style.position = 'relative';
          wrapper.style.display = 'block';
          if (opts.errorWrapClass) wrapper.className = opts.errorWrapClass;

          input.parentNode.insertBefore(wrapper, input);
          wrapper.appendChild(input);

          this._autoCreatedWrappers.push({ wrapper: wrapper, input: input });
        }

        // --- Create error text element (absolutely positioned) ---
        var errorEl = document.createElement('div');
        errorEl.setAttribute('d2-form-error-text', '');
        errorEl.style.display = 'none';
        errorEl.style.position = 'absolute';
        errorEl.style.left = '0';
        errorEl.style.width = '100%';
        errorEl.style.fontSize = opts.errorFontSize;
        errorEl.style.color = opts.errorColor;
        errorEl.style.pointerEvents = 'none';

        if (opts.errorLocation === 'above') {
          errorEl.style.bottom = '100%';
        } else {
          errorEl.style.top = '100%';
        }

        wrapper.appendChild(errorEl);
        this._autoCreatedElements.push(errorEl);
        created.push(fieldName);
      }

      if (created.length > 0) {
        _log('auto-created error elements', created);
      }
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

      // Submit validation — use capture phase to run BEFORE Webflow's handler
      if (validateOn === 'submit' || validateOn === 'both') {
        this._boundSubmitHandler = function (e) {
          var allValid = self.validateAll();

          if (!allValid) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
          }

          // If onSubmit callback exists, prevent default and call it
          if (typeof self.options.onSubmit === 'function') {
            e.preventDefault();
            self.options.onSubmit(self.getData(), self.formElement);
          }
        };
        this.formElement.addEventListener('submit', this._boundSubmitHandler, true);
      }
    }

    /**
     * Find the closest [d2-form-error-text] element for a given input.
     * Searches siblings first, then walks up to 3 parent levels.
     */
    _findErrorElement(inputEl) {
      if (!inputEl) return null;
      var parent = inputEl.parentElement;
      for (var i = 0; i < 3 && parent; i++) {
        var el = parent.querySelector('[d2-form-error-text]');
        if (el) return el;
        parent = parent.parentElement;
      }
      return null;
    }

    /**
     * Show or hide the error element for a field.
     *
     * Uses a single [d2-form-error-text] element per field.
     * Text content is set from errorMessages (custom or default).
     * Shows the first failed rule's message.
     *
     * Webflow setup:
     *   <label>
     *     <input name="EMAIL">
     *     <div d2-form-error-text style="display:none"></div>
     *   </label>
     */
    _updateErrorElement(errorEl, errors, isValid, fieldRules) {
      if (!errorEl) return;

      if (isValid) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
        return;
      }

      // Show the first error message
      var firstRule = errors[0];
      var ruleParam = fieldRules ? fieldRules[firstRule] : undefined;
      var msg = this._getErrorMessage(firstRule, ruleParam);
      errorEl.textContent = msg;
      errorEl.style.display = 'block';

      _log('show error → ' + firstRule, msg);
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

      // Find the closest [d2-form-error-text] element for this input
      var errorEl = this._findErrorElement(inputEl);

      // Determine the target element for error styling.
      // If the input is hidden (checkbox, opacity:0, display:none, type:hidden),
      // apply error styles to the closest <label> parent instead.
      var computedStyle = getComputedStyle(inputEl);
      var isHidden = inputEl.type === 'hidden' ||
        inputEl.type === 'checkbox' ||
        inputEl.type === 'radio' ||
        computedStyle.display === 'none' ||
        computedStyle.visibility === 'hidden' ||
        parseFloat(computedStyle.opacity) < 0.1;

      var styleTarget = isHidden ? inputEl.closest('label') || inputEl : inputEl;

      // Apply/remove error indicators
      if (result.valid) {
        styleTarget.classList.remove(this.options.errorClass);
        styleTarget.removeAttribute(this.options.errorAttribute);
        if (this.options.inputOnValid) {
          Object.assign(styleTarget.style, this.options.inputOnValid);
        }
      } else {
        styleTarget.classList.add(this.options.errorClass);
        styleTarget.setAttribute(this.options.errorAttribute, result.errors.join(','));
        if (this.options.inputOnError) {
          Object.assign(styleTarget.style, this.options.inputOnError);
        }

        if (typeof this.options.onValidationError === 'function') {
          this.options.onValidationError(fieldName, result.errors, inputEl);
        }
      }

      // Update inline error element with message text
      if (this.options.errorDisplay === 'inline') {
        this._updateErrorElement(errorEl, result.errors, result.valid, rules);
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
      var self = this;

      if (allValid) {
        summaryEl.style.display = 'none';
        summaryEl.innerHTML = '';
        return;
      }

      var html = '<p>' + this.options.summaryMessage + '</p><ul>';
      failedFields.forEach(function (field) {
        var fieldRules = self._resolvedValidation[field.name] || {};
        var messages = field.errors.map(function (ruleName) {
          return self._getErrorMessage(ruleName, fieldRules[ruleName]);
        });
        html += '<li><strong>' + field.name + '</strong>: ' + messages.join(', ') + '</li>';
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

      // Hide all inline error elements
      var allErrorEls = this.formElement.querySelectorAll('[d2-form-error-text]');
      allErrorEls.forEach(function (el) {
        el.style.display = 'none';
        el.textContent = '';
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

    /**
     * Check if the form already has a field with this name (any case).
     * Prevents duplicate tracking fields when the user already placed
     * equivalent fields in Webflow (e.g. UTM_SOURCE vs utm_source_hidden).
     */
    _hasField(name) {
      if (!this.formElement) return false;
      // Exact match
      if (this.formElement.querySelector('input[name="' + name + '"]')) return true;

      // Known aliases: digi2 field name → common Webflow equivalents (uppercase)
      var ALIASES = {
        'GCLID':              ['GOOGLE_ADS_ID'],
        'FBCLID':             ['META_ADS_ID'],
        'MSCLKID':            ['BING_ADS_ID'],
        'GOOGLE_ANALYTICS_ID':['GACLIENTID', 'GA_CLIENT_ID'],
        'PAGE_URL':           [],
        'PAGE_TITLE':         [],
        'PAGE_REFERRER':      ['REFERRER'],
        'IP_ADDRESS':         [],
      };

      // Build list of names to check
      var upper = name.toUpperCase();
      var namesToCheck = [upper];
      var aliases = ALIASES[upper];
      if (aliases) {
        namesToCheck = namesToCheck.concat(aliases);
      }

      var inputs = this.formElement.querySelectorAll('input');
      for (var i = 0; i < inputs.length; i++) {
        var inputUpper = inputs[i].name.toUpperCase();
        for (var j = 0; j < namesToCheck.length; j++) {
          if (inputUpper === namesToCheck[j]) return true;
        }
      }
      return false;
    }

    _injectTrackingFields() {
      if (this.options.utmTracking) {
        var self = this;
        UTM_PARAMS.forEach(function (param) {
          var fieldName = param.toUpperCase();
          if (!self._hasField(fieldName)) {
            self._injectField(fieldName, _getCookie(param) || '');
          } else {
            _log('skip duplicate → ' + fieldName);
          }
        });
      }

      if (this.options.clickIdTracking) {
        var self2 = this;
        CLICK_IDS.forEach(function (param) {
          var fieldName = param.toUpperCase();
          var val = _getCookie(param) || '';
          if (!val) {
            _log('skip empty click ID → ' + fieldName);
            return;
          }
          if (!self2._hasField(fieldName)) {
            self2._injectField(fieldName, val);
          } else {
            _log('skip duplicate → ' + fieldName);
          }
        });
      }

      if (this.options.gaClientId) {
        if (!this._hasField('GOOGLE_ANALYTICS_ID')) {
          this._injectField('GOOGLE_ANALYTICS_ID', _getCookie('gaclientid') || '');
        } else {
          _log('skip duplicate → GOOGLE_ANALYTICS_ID');
        }
      }

      if (this.options.pageMeta) {
        if (!this._hasField('PAGE_URL')) {
          this._injectField('PAGE_URL', window.location.href);
        }
        if (!this._hasField('PAGE_TITLE')) {
          this._injectField('PAGE_TITLE', document.title);
        }
        if (!this._hasField('PAGE_REFERRER')) {
          this._injectField('PAGE_REFERRER', document.referrer || '');
        }
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
          self._injectField('IP_ADDRESS', ip);
        })
        .catch(function (err) {
          console.warn('[digi2.forms] IP fetch failed:', err);
          self._injectField('IP_ADDRESS', '');
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

    /**
     * Auto-initialize [data-d2-form] elements on the page.
     *
     * Usage:
     *   createAll({ ...options })               — all [data-d2-form] elements
     *   createAll('contact-form', { ...opts })  — only [data-d2-form="contact-form"]
     *
     * Multiple elements with the same name get unique registry keys:
     *   contact-form, contact-form-2, contact-form-3, etc.
     *
     * @param {string} [nameFilter]  — only init elements with this data-d2-form value
     * @param {object} [options]     — shared options applied to all forms
     * @returns {object[]} array of created FormManager instances
     */
    createAll: function (nameFilter, options) {
      // Allow createAll({ opts }) without name filter
      if (typeof nameFilter === 'object' && nameFilter !== null) {
        options = nameFilter;
        nameFilter = null;
      }
      options = options || {};

      var selector = nameFilter
        ? '[data-d2-form="' + nameFilter + '"]'
        : '[data-d2-form]';
      var wrappers = document.querySelectorAll(selector);
      var created = [];
      var nameCount = {};

      wrappers.forEach(function (wrapper) {
        var baseName = wrapper.getAttribute('data-d2-form');
        if (!baseName) return;

        // Generate unique registry key for duplicates
        nameCount[baseName] = (nameCount[baseName] || 0) + 1;
        var registryKey = nameCount[baseName] === 1
          ? baseName
          : baseName + '-' + nameCount[baseName];

        if (registry[registryKey]) return;

        // Pass the wrapper element directly via formSelector so
        // FormManager doesn't re-query and hit the first match only
        var form = wrapper.tagName === 'FORM' ? wrapper : wrapper.querySelector('form');
        if (!form) {
          _log('createAll: no <form> found in → ' + baseName);
          return;
        }

        // Pass direct element reference — avoids duplicate ID issues
        var opts = Object.assign({}, options, { _formElement: form });
        var instance = new FormManager(registryKey, opts);
        registry[registryKey] = instance;
        created.push(instance);
      });

      _log('createAll → ' + created.length + ' forms', created.map(function (f) { return f.name; }));
      return created;
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

    /**
     * Initialize password toggle on all [data-d2-password-toggle] elements.
     * Clicking toggles the associated input between type="password" and type="text".
     *
     * Webflow setup:
     *   <label>
     *     Password
     *     <input type="password" name="password">
     *     <button type="button" data-d2-password-toggle>Show</button>
     *   </label>
     *
     * Options:
     *   data-d2-password-toggle            — toggles sibling/parent input
     *   data-d2-password-toggle="#my-input" — toggles specific input by selector
     *   data-d2-password-show="Show"       — text when password is hidden
     *   data-d2-password-hide="Hide"       — text when password is visible
     */
    initPasswordToggles: function () {
      document.addEventListener('click', function (e) {
        var toggle = e.target.closest('[data-d2-password-toggle]');
        if (!toggle) return;

        e.preventDefault();

        // Find the target input
        var targetSel = toggle.getAttribute('data-d2-password-toggle');
        var input = null;

        if (targetSel && targetSel !== '') {
          input = document.querySelector(targetSel);
        }

        if (!input) {
          // Look for sibling or parent input
          var parent = toggle.parentElement;
          if (parent) input = parent.querySelector('input[type="password"], input[type="text"][data-d2-pw]');
        }

        if (!input) return;

        if (input.type === 'password') {
          input.type = 'text';
          input.setAttribute('data-d2-pw', 'visible');
          var hideText = toggle.getAttribute('data-d2-password-hide');
          if (hideText) toggle.textContent = hideText;
          _log('password toggle → visible');
        } else {
          input.type = 'password';
          input.removeAttribute('data-d2-pw');
          var showText = toggle.getAttribute('data-d2-password-show');
          if (showText) toggle.textContent = showText;
          _log('password toggle → hidden');
        }
      });

      _log('password toggles initialized');
    },
  };
})();
