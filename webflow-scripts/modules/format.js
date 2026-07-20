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
 *   Separators are non-breaking (U+00A0) by default so a price never wraps
 *   mid-number. Opt into regular, wrappable spaces with d2-format-break:
 *   <div d2-format-price d2-format-break>1468620</div>         -> 1 468 620 (regular spaces)
 *
 *   Sums — element text becomes the sum of its d2-format-sum-* values:
 *   <div d2-format-sum-1="28.75" d2-format-sum-2="1.5">0</div>  -> 30,25
 *   <div d2-format-sum-1="28.75" d2-format-sum-2="1.5" d2-format-unit="m²">…
 *   Bind the values to CMS fields (e.g. terrace + balcony area). Blank or
 *   non-numeric parts are skipped; when NO part parses, the element's own
 *   text is left untouched (your authored fallback). Decimals default to
 *   the widest fraction among the parts (28.75+1 -> 29,75) — override with
 *   d2-format-decimals. Combine with d2-format-price for price styling.
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

  // Force every regular/narrow space to a non-breaking space so a formatted
  // number never wraps mid-value (e.g. "1 468 620 z\u0142" stays on one line).
  function toNbsp(value) {
    return String(value).replace(/[ \u202F]/g, '\u00A0');
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

    var out = (options.prefix || '') + body + (suffix || '');
    // Non-breaking spaces are the DEFAULT so a number never wraps mid-value
    // ("1 468 620 zł" stays on one line). Opt out with d2-format-break
    // (options.nbsp === false) to allow regular, wrappable spaces.
    return options.nbsp === false ? normalSpaces(out) : toNbsp(out);
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
      nbsp: options.nbsp,
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
    // nbsp is the default; d2-format-break opts back into wrappable spaces.
    var nbsp = !(el && el.hasAttribute && el.hasAttribute('d2-format-break'));
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
      nbsp: nbsp,
    };
  }

  // ---- d2-format-sum-* — element text = sum of its attribute values -------
  // <div d2-format-sum-1="28.75" d2-format-sum-2="1.5">0</div> -> "30,25"
  // Any suffix after "d2-format-sum-" names a part (bare d2-format-sum works
  // too); values parse with the same loose rules as displayed numbers, so
  // CMS-bound "28,75" is fine. Parts that don't parse are skipped — a blank
  // balcony field simply adds nothing.
  function sumAttrNames(el) {
    var attrs = el && el.attributes;
    var names = [];
    if (!attrs) return names;
    if (typeof attrs.length === 'number') {
      for (var i = 0; i < attrs.length; i++) {
        if (attrs[i] && attrs[i].name) names.push(attrs[i].name);
      }
    } else {
      // Plain-object attribute maps (non-DOM harnesses)
      for (var key in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, key)) names.push(key);
      }
    }
    return names.filter(function (name) {
      return name === 'd2-format-sum' || name.indexOf('d2-format-sum-') === 0;
    });
  }

  // Returns null when the element has no sum attributes at all. `decimals`
  // is the widest fraction among the parsed parts, so 28.75 + 1 renders
  // with 2 decimals instead of getting truncated to "29".
  function sumInfo(el) {
    var names = sumAttrNames(el);
    if (!names.length) return null;
    var sum = 0;
    var any = false;
    var decimals = 0;
    for (var i = 0; i < names.length; i++) {
      var parsed = parseNumber(attr(el, names[i]));
      if (isNaN(parsed)) continue;
      any = true;
      sum += parsed;
      var frac = String(parsed).split('.')[1];
      if (frac && frac.length > decimals) decimals = frac.length;
    }
    return { hasValue: any, sum: sum, decimals: decimals };
  }

  function formatElement(el) {
    if (!el) return;

    var sum = sumInfo(el);
    var mode = el.hasAttribute('d2-format-price') || hasClass(el, 'format-price') || hasClass(el, 'format_price')
      ? 'price'
      : (attr(el, 'd2-format-number') || '').trim().toLowerCase();

    if (!mode && !sum) return;
    // No part parsed → keep the element's authored text as the fallback.
    if (sum && !sum.hasValue) return;

    var options = optionsFromElement(el, mode || 'number');
    if (sum && integerOrNull(attr(el, 'd2-format-decimals')) == null) {
      options.decimals = sum.decimals;
    }

    var raw = sum ? sum.sum : el.textContent;
    var formatted = mode === 'price'
      ? formatPrice(raw, options)
      : formatNumber(raw, options);

    if (!formatted || el.textContent === formatted) return;
    el.textContent = formatted;
  }

  // querySelectorAll can't wildcard attribute NAMES, so sum elements are
  // discovered via the bare attribute and numbered parts 1–9. Parts with
  // other suffixes still count toward the sum once the element is found.
  var SUM_SELECTOR = (function () {
    var parts = ['[d2-format-sum]'];
    for (var i = 1; i <= 9; i++) parts.push('[d2-format-sum-' + i + ']');
    return parts.join(', ');
  })();

  function refresh(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var els = scope.querySelectorAll('[d2-format-price], [d2-format-number="price"], .format-price, .format_price, ' + SUM_SELECTOR);
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
