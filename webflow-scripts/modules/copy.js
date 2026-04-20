/**
 * digi2 — Copy to Clipboard Module
 * Loaded automatically by digi2-loader.js when d2-copy is present.
 *
 * Webflow setup:
 *   <button d2-copy="Text to copy">Copy</button>
 *   <button d2-copy="#target-element">Copy from element</button>
 *   <button d2-copy d2-copy-target="#promo-code">Copy code</button>
 *
 * API:
 *   digi2.copy.init(options)
 *   digi2.copy.text('Hello')              — copy text programmatically
 *   digi2.copy.fromElement('#selector')   — copy element's text content
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  function _log(action, data) {
    if (window.digi2.log) window.digi2.log('copy', action, data);
  }

  var _options = {};
  var _initialized = false;

  var DEFAULTS = {
    selector: '[d2-copy]',
    feedbackDuration: 2000,          // ms to show "Copied!" state
    feedbackText: 'Copied!',
    feedbackClass: 'd2-copy-success',
    onCopy: null,                    // callback(text)
    showToast: true,                 // show toast if d2-toasts is loaded
  };

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    // Fallback for older browsers / non-HTTPS
    return new Promise(function (resolve, reject) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        resolve();
      } catch (err) {
        reject(err);
      }
      document.body.removeChild(textarea);
    });
  }

  function handleClick(e) {
    var trigger = e.target.closest(_options.selector);
    if (!trigger) return;

    e.preventDefault();

    var text = '';

    // Check for target element reference
    var targetSel = trigger.getAttribute('d2-copy-target');
    if (targetSel) {
      var targetEl = document.querySelector(targetSel);
      if (targetEl) text = targetEl.textContent.trim();
    }

    // Fall back to attribute value
    if (!text) {
      var attrVal = trigger.getAttribute('d2-copy');
      if (attrVal && attrVal.charAt(0) === '#') {
        // Selector reference
        var refEl = document.querySelector(attrVal);
        if (refEl) text = refEl.textContent.trim();
      } else if (attrVal) {
        text = attrVal;
      }
    }

    if (!text) {
      _log('nothing to copy');
      return;
    }

    copyToClipboard(text).then(function () {
      _log('copied', text.substring(0, 50));

      // Visual feedback on the trigger
      var origText = trigger.textContent;
      trigger.classList.add(_options.feedbackClass);
      trigger.setAttribute('d2-copy-original', origText);
      trigger.textContent = _options.feedbackText;

      setTimeout(function () {
        trigger.textContent = origText;
        trigger.classList.remove(_options.feedbackClass);
      }, _options.feedbackDuration);

      // Toast feedback
      if (_options.showToast && window.digi2.toasts && window.digi2.toasts.success) {
        window.digi2.toasts.success('Copied to clipboard', { duration: 1500 });
      }

      if (typeof _options.onCopy === 'function') {
        _options.onCopy(text);
      }
    }).catch(function (err) {
      _log('copy failed', err);
      if (window.digi2.toasts && window.digi2.toasts.error) {
        window.digi2.toasts.error('Failed to copy');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  window.digi2.copy = {
    init: function (options) {
      _options = Object.assign({}, DEFAULTS, options || {});

      if (!_initialized) {
        document.addEventListener('click', handleClick);
        _initialized = true;
      }

      _log('init', _options);
    },

    text: function (text) {
      return copyToClipboard(text).then(function () {
        _log('copied (programmatic)', text.substring(0, 50));
        if (typeof _options.onCopy === 'function') _options.onCopy(text);
      });
    },

    fromElement: function (selector) {
      var el = typeof selector === 'string' ? document.querySelector(selector) : selector;
      if (!el) return Promise.reject(new Error('Element not found'));
      return this.text(el.textContent.trim());
    },
  };
})();
