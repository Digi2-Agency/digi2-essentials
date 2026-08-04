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
 *   <!-- everything is on by default; narrow it down: -->
 *   <script src=".../digi2-loader.min.js" d2-datalayer d2-datalayer-disable="lightbox"></script>
 *   <script src=".../digi2-loader.min.js" d2-datalayer d2-datalayer-only="popups forms"></script>
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

  // Two explicit attributes instead of one overloaded value:
  //   d2-datalayer-disable="lightbox sliders"   everything except these
  //   d2-datalayer-only="popups forms"          nothing except these
  // Both may sit on the loader tag or on a <digi2-module> declaration. If both
  // are present, -only narrows first and -disable subtracts from that.
  (function readConfig() {
    function readAttr(name) {
      var el = document.querySelector('script[' + name + ']') || document.querySelector('[' + name + ']');
      var raw = el ? el.getAttribute(name) : null;
      return String(raw || '').split(/[\s,]+/).filter(Boolean);
    }
    var only = readAttr('d2-datalayer-only');
    var disabled = readAttr('d2-datalayer-disable');

    if (only.length) {
      GROUPS.forEach(function (g) { if (only.indexOf(g) === -1) off[g] = true; });
    }
    disabled.forEach(function (g) { off[g] = true; });

    var unknown = only.concat(disabled).filter(function (g) { return GROUPS.indexOf(g) === -1; });
    if (unknown.length) {
      console.warn('[digi2.datalayer] unknown group(s): ' + unknown.join(', ')
        + '. Known: ' + GROUPS.join(', ') + '.');
    }
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

    // video_complete is a GA4 recommended event, so a popup video reports the
    // same way an embedded player would.
    listen('popup:video-end', 'popups', function (d) {
      return {
        event: 'video_complete',
        video_title: d.name,
        video_provider: 'popup',
      };
    });

    listen('popup:video-unmute', 'popups', function (d) {
      return {
        event: 'video_unmute',
        video_title: d.name,
        video_provider: 'popup',
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
