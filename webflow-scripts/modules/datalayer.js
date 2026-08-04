/**
 * digi2 — DataLayer Module
 * Loaded automatically by digi2-loader.js when d2-datalayer is present.
 *
 * Pushes what the other modules do into window.dataLayer using GA4 naming, so
 * GTM/GA4 sees popups, filtering, product expands and form submits without any
 * per-site glue code.
 *
 * Webflow setup:
 *   <script src=".../digi2-loader.min.js" d2-datalayer d2-popups d2-cms d2-forms></script>
 *
 *   <!-- everything is on by default; switch groups off: -->
 *   <script src=".../digi2-loader.min.js" d2-datalayer="-lightbox -sliders"></script>
 *
 * API:
 *   digi2.datalayer.push({ event: 'custom', … })   push through the same guard
 *   digi2.datalayer.enabled()                      groups currently reporting
 *   digi2.datalayer.disable('lightbox')            turn a group off at runtime
 *   digi2.datalayer.enable('lightbox')
 *
 * Event map (GA4 recommended events where one fits, otherwise snake_case in the
 * same style — GA4 accepts custom event names and reports them as-is):
 *
 *   popup opened        → view_promotion     (creative_slot: 'popup')
 *   popup closed        → close_promotion
 *   list filtered       → view_item_list     (+ filters, matching, total)
 *   list sorted         → view_item_list     (+ sort_field, sort_direction)
 *   more rows loaded    → view_item_list     (+ loaded)
 *   product expanded    → select_item        (tab/accordion opened)
 *   image opened        → select_content     (content_type: 'image')
 *   form submitted      → generate_lead
 *   form rejected       → form_error
 *   A/B variant shown   → experiment_impression
 *   A/B variant clicked → select_promotion
 */
(function () {
  'use strict';

  if (!window.digi2) window.digi2 = {};

  function _log() {
    if (window.digi2 && typeof window.digi2.log === 'function') {
      window.digi2.log.apply(window.digi2, ['datalayer'].concat(Array.prototype.slice.call(arguments)));
    }
  }

  // ---- which groups report -------------------------------------------------

  var GROUPS = ['popups', 'cms', 'tabs', 'forms', 'lightbox', 'ab'];
  var off = {};

  // The flag's value tunes the defaults: "-lightbox -sliders" switches those off,
  // "popups forms" (no minus) means ONLY those. Empty value = everything.
  (function readFlag() {
    var raw = null;
    try {
      if (window.digi2 && typeof window.digi2.flagValue === 'function') {
        raw = window.digi2.flagValue('d2-datalayer');
      }
    } catch (e) { /* fall through */ }
    if (raw == null) {
      var el = document.querySelector('[d2-datalayer]');
      var scr = document.querySelector('script[d2-datalayer]');
      raw = (scr && scr.getAttribute('d2-datalayer')) || (el && el.getAttribute('d2-datalayer')) || '';
    }
    var tokens = String(raw).split(/[\s,]+/).filter(Boolean);
    if (!tokens.length) return;

    var negative = tokens.filter(function (t) { return t.charAt(0) === '-'; })
      .map(function (t) { return t.slice(1); });
    if (negative.length) {
      negative.forEach(function (g) { off[g] = true; });
      return;
    }
    // Allow-list form: everything not listed is off.
    GROUPS.forEach(function (g) { if (tokens.indexOf(g) === -1) off[g] = true; });
  })();

  function on(group) { return !off[group]; }

  // ---- push ----------------------------------------------------------------

  function push(payload) {
    if (!payload || !payload.event) return false;
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(payload);
      _log('push', payload);
      return true;
    } catch (e) {
      return false;
    }
  }

  function clean(obj) {
    var out = {};
    for (var k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      var v = obj[k];
      if (v === undefined || v === null || v === '') continue;
      out[k] = v;
    }
    return out;
  }

  // ---- bridge --------------------------------------------------------------

  function listen(name, group, map) {
    if (typeof window.digi2.on !== 'function') return;
    window.digi2.on(name, function (data) {
      if (!on(group)) return;
      var payload = map(data || {});
      if (payload) push(clean(payload));
    });
  }

  function wire() {
    listen('popup:open', 'popups', function (d) {
      return {
        event: 'view_promotion',
        promotion_id: d.name,
        promotion_name: d.name,
        creative_slot: 'popup',
      };
    });

    listen('popup:close', 'popups', function (d) {
      return {
        event: 'close_promotion',
        promotion_id: d.name,
        promotion_name: d.name,
        creative_slot: 'popup',
      };
    });

    listen('cms:filter', 'cms', function (d) {
      var f = d.filters || {};
      var pairs = Object.keys(f).map(function (k) {
        var v = f[k];
        return k + ':' + (Array.isArray(v) ? v.join('|') : v);
      });
      return {
        event: 'view_item_list',
        item_list_id: d.list,
        item_list_name: d.list,
        filters: pairs.join(','),
        filter_count: pairs.length,
        matching: d.matching,
        total: d.total,
      };
    });

    listen('cms:sort', 'cms', function (d) {
      return {
        event: 'view_item_list',
        item_list_id: d.list,
        item_list_name: d.list,
        sort_field: d.field,
        sort_direction: d.dir,
      };
    });

    listen('cms:items-added', 'cms', function (d) {
      return {
        event: 'view_item_list',
        item_list_id: d.list,
        item_list_name: d.list,
        loaded: d.count,
      };
    });

    // A tab/accordion opening is how a product row gets expanded in these builds.
    listen('tabs:change', 'tabs', function (d) {
      return {
        event: 'select_item',
        item_list_id: d.group,
        item_list_name: d.group,
        item_id: d.tab,
      };
    });

    listen('lightbox:open', 'lightbox', function (d) {
      return {
        event: 'select_content',
        content_type: 'image',
        item_id: d.src,
        index: d.index,
        total: d.total,
      };
    });

    listen('form:submit', 'forms', function (d) {
      return {
        event: 'generate_lead',
        form_id: d.formId,
        form_name: d.name,
      };
    });

    listen('form:invalid', 'forms', function (d) {
      return {
        event: 'form_error',
        form_id: d.formId,
        form_name: d.name,
      };
    });

    listen('ab:assigned', 'ab', function (d) {
      return {
        event: 'experiment_impression',
        experiment_id: d.test || d.name,
        variant_id: d.variant,
      };
    });

    listen('ab:click', 'ab', function (d) {
      return {
        event: 'select_promotion',
        promotion_id: d.test || d.name,
        creative_name: d.variant,
      };
    });

    _log('wired', { off: Object.keys(off) });
  }

  // ---- public API ----------------------------------------------------------

  window.digi2.datalayer = {
    push: function (payload) { return push(payload); },
    enabled: function () { return GROUPS.filter(on); },
    disable: function (group) { off[group] = true; },
    enable: function (group) { delete off[group]; },
  };

  wire();
})();
