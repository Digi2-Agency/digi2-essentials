/**
 * digi2 - Format Module
 * Loaded automatically by digi2-loader.js when d2-format, d2-format-price,
 * or d2-format-number is present on the loader tag.
 *
 * Webflow setup:
 *   <div d2-format-price>199999</div>                  -> 199 999
 *   <div d2-format-number="price">199999</div>         -> 199 999
 *   <div class="format-price">199999</div>             -> 199 999
 *   <div d2-format-price d2-format-currency="PLN">199999</div>
 *   <div d2-format-price d2-format-currency="EUR">199999</div>
 *   <div d2-format-price d2-format-decimals="2">199999</div>
 *   <div d2-format-price d2-format-unit="zł/m²">20500</div>       -> 20 500 zł/m²
 *   <div d2-format-price d2-format-suffix="zł/m²" d2-format-space>20500</div>
 *
 * Uwaga: Webflow przycina spacje na krańcach wartości atrybutu, więc
 *   d2-format-suffix=" zł/m²"  ->  "zł/m²" (bez odstępu). Dlatego użyj:
 *     d2-format-unit="zł/m²"   (jednostka zawsze poprzedzona spacją), albo
 *     d2-format-space          (wymusza spację przed suffixem/walutą).
 *
 * API:
 *   digi2.format.price(199999)                         -> "199 999"
 *   digi2.format.price(199999, { currency: 'PLN' })    -> "199 999 PLN"
 *   digi2.format.refresh()
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  function attr(el, name, fallback) {
    if (!el) return fallback === undefined ? null : fallback;
    if (window.digi2 && typeof window.digi2.attr === 'function') {
      return window.digi2.attr(el, name, fallback === undefined ? null : fallback);
    }
    var value = el.getAttribute(name);
    return value == null ? (fallback === undefined ? null : fallback) : value;
  }

  function _log(action, data) {
    if (window.digi2.log) window.digi2.log('format', action, data);
  }

  function parseNumber(value) {
    if (value == null || value === '') return NaN;
    var raw = String(value).trim();
    var cleaned = raw.replace(/[^\d,.\-]/g, '');
    if (!cleaned) return NaN;

    var dot = cleaned.lastIndexOf('.');
    var comma = cleaned.lastIndexOf(',');
    if (dot !== -1 && comma !== -1) {
      cleaned = dot > comma
        ? cleaned.replace(/,/g, '')
        : cleaned.replace(/\./g, '').replace(',', '.');
    } else if (comma !== -1) {
      var parts = cleaned.split(',');
      cleaned = parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2
        ? parts[0] + '.' + parts[1]
        : cleaned.replace(/,/g, '');
    }

    var parsed = parseFloat(cleaned);
    return isNaN(parsed) ? NaN : parsed;
  }

  function normalSpaces(value) {
    return String(value).replace(/\u00A0|\u202F/g, ' ');
  }

  function integerOrNull(value) {
    if (value == null || value === '') return null;
    var parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }

  function hasClass(el, name) {
    if (!el) return false;
    if (el.classList && typeof el.classList.contains === 'function') {
      return el.classList.contains(name);
    }
    var classAttr = el.getAttribute && el.getAttribute('class');
    return (' ' + (classAttr || '') + ' ').indexOf(' ' + name + ' ') !== -1;
  }

  function formatNumber(value, options) {
    options = options || {};
    var number = typeof value === 'number' ? value : parseNumber(value);
    if (isNaN(number)) return '';

    var locale = options.locale || 'pl-PL';
    var decimals = typeof options.decimals === 'number' ? options.decimals : 0;
    var body;

    try {
      body = number.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    } catch (err) {
      body = number.toFixed(decimals);
    }

    var suffix = options.suffix;
    // jednostka: zawsze poprzedzona spacją kontrolowaną przez moduł (Webflow nie tnie)
    if ((suffix == null || suffix === '') && options.unit != null && options.unit !== '') {
      suffix = ' ' + options.unit;
    }
    // wymuszenie spacji przed suffixem (gdy Webflow ją przyciął)
    if (options.space && suffix && !/^\s/.test(suffix)) suffix = ' ' + suffix;

    return normalSpaces((options.prefix || '') + body + (suffix || ''));
  }

  function formatPrice(value, options) {
    options = options || {};
    var currency = options.currency == null ? '' : String(options.currency);
    var suffix = options.suffix;
    // brak jawnego suffixu i brak jednostki -> domyślnie waluta (ze spacją)
    if (suffix == null && (options.unit == null || options.unit === '') && currency) {
      suffix = ' ' + currency;
    }

    return formatNumber(value, {
      locale: options.locale || 'pl-PL',
      decimals: typeof options.decimals === 'number' ? options.decimals : 0,
      prefix: options.prefix || '',
      suffix: suffix,
      unit: options.unit,
      space: options.space,
    });
  }

  function optionsFromElement(el, type) {
    var isPrice = type === 'price';
    var locale = attr(el, 'd2-format-locale') || 'pl-PL';
    var decimals = integerOrNull(attr(el, 'd2-format-decimals'));
    var prefix = attr(el, 'd2-format-prefix') || '';
    var suffix = attr(el, 'd2-format-suffix');
    var unit = attr(el, 'd2-format-unit');
    var space = !!(el && el.hasAttribute && el.hasAttribute('d2-format-space'));
    var currency = attr(el, 'd2-format-currency');

    if (isPrice) {
      var priceAttr = attr(el, 'd2-format-price');
      if ((currency == null || currency === '') && priceAttr && priceAttr !== 'true') {
        currency = priceAttr;
      }
    }
    // suffix/unit/waluta rozwiązywane w formatPrice/formatNumber

    return {
      locale: locale,
      decimals: decimals == null ? 0 : decimals,
      prefix: prefix,
      suffix: suffix,
      currency: currency,
      unit: unit,
      space: space,
    };
  }

  function formatElement(el) {
    if (!el) return;

    var mode = el.hasAttribute('d2-format-price') || hasClass(el, 'format-price') || hasClass(el, 'format_price')
      ? 'price'
      : (attr(el, 'd2-format-number') || '').trim().toLowerCase();

    if (!mode) return;

    var raw = el.textContent;
    var options = optionsFromElement(el, mode);
    var formatted = mode === 'price'
      ? formatPrice(raw, options)
      : formatNumber(raw, options);

    if (!formatted || el.textContent === formatted) return;
    el.textContent = formatted;
  }

  function refresh(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var els = scope.querySelectorAll('[d2-format-price], [d2-format-number="price"], .format-price, .format_price');
    for (var i = 0; i < els.length; i++) formatElement(els[i]);
  }

  var _observer = null;
  var _queued = false;

  function queueRefresh() {
    if (_queued) return;
    _queued = true;
    setTimeout(function () {
      _queued = false;
      refresh();
    }, 0);
  }

  function init() {
    refresh();

    if (!_observer && typeof MutationObserver !== 'undefined' && document.body) {
      _observer = new MutationObserver(queueRefresh);
      _observer.observe(document.body, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    _log('init');
  }

  window.digi2.format = {
    init: init,
    refresh: refresh,
    element: formatElement,
    number: formatNumber,
    price: formatPrice,
    parseNumber: parseNumber,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }
})();
