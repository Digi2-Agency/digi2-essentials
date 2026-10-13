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
 *   product expanded    → select_item        (tab/accordion opened; inside a
 *                                            [d2-cms-item]: + item_name and
 *                                            item_<field> per d2-cms-field,
 *                                            interaction: 'expand')
 *   image opened        → select_content     (content_type: 'image')
 *   form submitted      → form_submit          (client-side validation passed)
 *   server accepted it  → form_submit_success   (+ generate_lead with d2-datalayer-lead="success")
 *   server refused it   → form_submit_error
 *   form rejected       → form_error            (client-side validation failed)
 *
 *   funnel, group `forms-detail` (switch off with d2-datalayer-disable):
 *   first interaction   → form_start             (once per visit)
 *   a field filled in   → form_field_interaction (once per field, name+type only)
 *   button pressed      → form_submit_click      (before validation)
 *
 *   generate_lead fires on form_submit by default — see leadOn below.
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

  // forms-detail is its own group on purpose: the funnel is chatty compared to
  // the submit/lead events, and a site should be able to drop it without
  // losing the events its conversions depend on.
  var GROUPS = ['popups', 'cms', 'tabs', 'forms', 'forms-detail', 'lightbox', 'ab'];
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

  // ---- when does generate_lead fire ----------------------------------------
  // 'submit'  (default) — on the submit handler, i.e. what this module has
  //                       always done. Kept as the default on purpose: sites
  //                       already have generate_lead marked as a key event in
  //                       GA4 and imported into Ads, and silently moving it
  //                       would break their conversions without warning.
  // 'success' — on Webflow confirming the submission (.w-form-done). This is
  //             the honest signal; switch a site over once its GA4/Ads config
  //             has been checked.
  //
  //   <script ... d2-datalayer d2-datalayer-lead="success"></script>
  //
  // Either way form_submit / form_submit_success / form_submit_error are all
  // pushed, so a site can build the correct conversion in GTM before flipping.
  var leadOn = (function () {
    var el = document.querySelector('script[d2-datalayer-lead]')
      || document.querySelector('[d2-datalayer-lead]');
    var raw = el ? String(el.getAttribute('d2-datalayer-lead') || '').trim().toLowerCase() : '';
    if (raw && raw !== 'submit' && raw !== 'success') {
      console.warn('[digi2.datalayer] d2-datalayer-lead="' + raw + '" — expected "submit" or "success". Using "submit".');
      return 'submit';
    }
    return raw || 'submit';
  })();

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

  // ---- product row (tab/accordion inside a [d2-cms-item]) ------------------

  function hasA(el, name) {
    return !!(el && el.hasAttribute && (el.hasAttribute(name) || el.hasAttribute('data-' + name)));
  }

  function getA(el, name) {
    if (!el || !el.getAttribute) return null;
    var v = el.getAttribute(name);
    return v != null ? v : el.getAttribute('data-' + name);
  }

  function closestWith(el, name) {
    for (var n = el; n; n = n.parentElement) {
      if (hasA(n, name)) return n;
    }
    return null;
  }

  function cmsItemOf(el) { return closestWith(el, 'd2-cms-item'); }

  // The same two sources cms.js reads: nested [d2-cms-field="x"] elements
  // (their text) and inline d2-cms-field-x="…" on the item, nested first.
  // Read here rather than through digi2.cms so the push works on a page that
  // marks its rows for analytics without loading the cms module.
  function readFields(item) {
    var fields = {};
    var types = {};
    var nested = item.querySelectorAll ? item.querySelectorAll('[d2-cms-field]') : [];
    for (var i = 0; i < nested.length; i++) {
      var key = String(nested[i].getAttribute('d2-cms-field') || '').trim().toLowerCase();
      if (!key || key in fields) continue;
      fields[key] = String(nested[i].textContent || '').trim();
      var t = nested[i].getAttribute('d2-cms-field-type');
      if (t) types[key] = String(t).trim().toLowerCase();
    }
    var attrs = item.attributes || [];
    for (var a = 0; a < attrs.length; a++) {
      var an = String(attrs[a].name).toLowerCase().replace(/^data-/, '');
      if (an.indexOf('d2-cms-field-') !== 0) continue;
      var suffix = an.slice('d2-cms-field-'.length);
      if (!suffix || suffix.indexOf('type-') === 0 || suffix in fields) continue;
      fields[suffix] = String(attrs[a].value || '').trim();
      var it = getA(item, 'd2-cms-field-type-' + suffix);
      if (it) types[suffix] = String(it).trim().toLowerCase();
    }
    return { fields: fields, types: types };
  }

  // "52,30 m²", "1 250 000 zł", "3" → numbers, so GA4 can sum and compare
  // them. Anything with letters before the digits or more digits after the
  // unit ("B1.05", "52 m2") stays text; d2-cms-field-type="number" forces
  // the loose parse ("1.250.000,00 PLN").
  function toNumber(raw, forced) {
    var s = String(raw).replace(/[\s  ]/g, '');
    if (forced) {
      s = s.replace(/[^\d,.\-]/g, '');
      var lastDot = s.lastIndexOf('.');
      var lastComma = s.lastIndexOf(',');
      if (lastDot !== -1 && lastComma !== -1) {
        s = lastDot > lastComma ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.');
      } else if (lastComma !== -1) {
        var parts = s.split(',');
        s = parts.length === 2 && parts[1].length <= 2 ? parts[0] + '.' + parts[1] : s.replace(/,/g, '');
      }
      var f = parseFloat(s);
      return isNaN(f) ? null : f;
    }
    var m = s.match(/^[$€£]?(-?\d+(?:[.,]\d+)?)[^\d.,]*$/);
    return m ? parseFloat(m[1].replace(',', '.')) : null;
  }

  var NUMBER_TYPES = { number: 1, num: 1, int: 1, float: 1 };

  function productPayload(item, d) {
    var r = readFields(item);
    var f = r.fields;
    var listEl = closestWith(item, 'd2-cms-list');
    var list = (listEl && String(getA(listEl, 'd2-cms-list') || '').trim()) || d.group;
    var nameKey = f.name ? 'name' : (f.title ? 'title' : null);

    var out = { event: 'select_item' };
    Object.keys(f).forEach(function (k) {
      if (k === 'id' || k === nameKey) return;
      var v = f[k];
      var n = toNumber(v, !!NUMBER_TYPES[r.types[k]]);
      out['item_' + k.replace(/[^a-z0-9_]/g, '_')] = n !== null ? n : v.slice(0, 100);
    });
    // Set last so a field that happens to be called list_name can't overwrite them.
    out.item_list_id = list;
    out.item_list_name = list;
    // id and name stay text: flat "12" is a label, not a quantity.
    out.item_id = f.id || (nameKey && f[nameKey]) || d.tab;
    out.item_name = nameKey ? f[nameKey] : undefined;
    out.interaction = 'expand';
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
    // Inside a [d2-cms-item] the push carries the product's own fields; a
    // plain tab (view switch, FAQ) reports the bare group/tab as before.
    listen('tabs:change', 'tabs', function (d) {
      var item = cmsItemOf(d.panel) || cmsItemOf(d.trigger);
      if (item) {
        // The default-open on page load is not a visitor expanding anything.
        if (d.initial) return null;
        return productPayload(item, d);
      }
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
      // The click, once client-side validation passed. Not a lead yet.
      if (leadOn === 'submit') {
        push(clean({ event: 'generate_lead', form_id: d.formId, form_name: d.name }));
      }
      return {
        event: 'form_submit',
        form_id: d.formId,
        form_name: d.name,
      };
    });

    // The server took it. This is the lead.
    listen('form:success', 'forms', function (d) {
      if (leadOn === 'success') {
        push(clean({
          event: 'generate_lead',
          form_id: d.formId,
          form_name: d.name,
          form_location: d.formLocation,
          lead_source: d.leadSource,
          lead_medium: d.leadMedium,
          lead_campaign: d.leadCampaign,
          has_gclid: d.hasGclid,
          has_fbclid: d.hasFbclid,
          consent_marketing: d.consentMarketing,
        }));
      }
      return {
        event: 'form_submit_success',
        form_id: d.formId,
        form_name: d.name,
        form_location: d.formLocation,
        lead_source: d.leadSource,
        lead_medium: d.leadMedium,
        lead_campaign: d.leadCampaign,
        has_gclid: d.hasGclid,
        has_fbclid: d.hasFbclid,
        consent_marketing: d.consentMarketing,
      };
    });

    // The server refused it — spam guard, plan limit, network. The gap between
    // form_submit and form_submit_success is a free outage indicator.
    listen('form:failure', 'forms', function (d) {
      return {
        event: 'form_submit_error',
        form_id: d.formId,
        form_name: d.name,
      };
    });

    // ---- funnel (forms-detail) ----------------------------------------------
    listen('form:start', 'forms-detail', function (d) {
      return { event: 'form_start', form_id: d.formId, form_name: d.name };
    });

    listen('form:field', 'forms-detail', function (d) {
      return {
        event: 'form_field_interaction',
        form_id: d.formId,
        form_name: d.name,
        // The field's name and type. Never its value.
        field_name: d.fieldName,
        field_type: d.fieldType,
      };
    });

    listen('form:submitclick', 'forms-detail', function (d) {
      return { event: 'form_submit_click', form_id: d.formId, form_name: d.name };
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
        // ab-tests.js emits { ab_test, ab_variant }; reading d.test/d.variant
        // meant clean() dropped both and pushed a bare event with no params.
        experiment_id: d.ab_test || d.test || d.name,
        variant_id: d.ab_variant || d.variant,
      };
    });

    listen('ab:click', 'ab', function (d) {
      return {
        event: 'select_promotion',
        promotion_id: d.ab_test || d.test || d.name,
        creative_name: d.ab_variant || d.variant,
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
