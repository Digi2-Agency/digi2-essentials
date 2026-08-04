/**
 * digi2 — Webflow Module
 * Loaded automatically by digi2-loader.js when d2-webflow (or any
 * d2-webflow-* attribute) is present.
 *
 * Bridges custom code back into Webflow's own machinery — today: firing a
 * Designer interaction (IX2) by the name you gave it.
 *
 * Webflow setup:
 *   <button d2-webflow-interaction="Show Form Popup">Zapytaj o ofertę</button>
 *
 * API:
 *   digi2.webflow.playInteraction('Show Form Popup')       // page-wide
 *   digi2.webflow.playInteraction('Show Form Popup', el)   // scoped to el's row
 *   digi2.webflow.interactions()                           // every name on the page
 *   digi2.webflow.refresh()                                // re-scan for new triggers
 *
 * Why a click and not an API call
 * -------------------------------
 * Webflow keeps interactions in ix2: `actionLists` (each carrying the name typed
 * in the Designer) and `events` binding a list to elements that carry data-w-id.
 * There is no public "play this by name" entry point — ix2.actions
 * .playbackRequested() expects an `affectedElements` map that only Webflow's own
 * event plumbing knows how to build, and dispatching it with an empty map is a
 * silent no-op (verified on a live site: the action list runs, nothing moves).
 * So this module does what a visitor does: it finds an element already wired to
 * that interaction and clicks it.
 */
(function () {
  'use strict';

  if (!window.digi2) window.digi2 = {};

  function _log() {
    if (window.digi2 && typeof window.digi2.log === 'function') {
      window.digi2.log.apply(window.digi2, ['webflow'].concat(Array.prototype.slice.call(arguments)));
    }
  }

  function attr(el, name) {
    if (!el) return null;
    if (window.digi2 && typeof window.digi2.attr === 'function') {
      return window.digi2.attr(el, name, null);
    }
    return el.getAttribute(name);
  }

  // ---- ix2 access ----------------------------------------------------------

  function ixData() {
    try {
      var wf = window.Webflow;
      if (!wf || typeof wf.require !== 'function') return null;
      var ix2 = wf.require('ix2');
      return (ix2 && ix2.store) ? (ix2.store.getState().ixData || null) : null;
    } catch (e) {
      return null;
    }
  }

  function actionListIdByName(data, name) {
    var wanted = String(name == null ? '' : name).trim().toLowerCase();
    if (!wanted || !data.actionLists) return null;
    for (var k in data.actionLists) {
      if (!Object.prototype.hasOwnProperty.call(data.actionLists, k)) continue;
      var al = data.actionLists[k] || {};
      var title = al.title || al.name || k;
      if (String(title).trim().toLowerCase() === wanted) return k;
    }
    return null;
  }

  // Every element on the page wired to this action list by a click event.
  function carriersFor(data, actionListId) {
    var out = [];
    if (!data.events) return out;
    for (var id in data.events) {
      if (!Object.prototype.hasOwnProperty.call(data.events, id)) continue;
      var ev = data.events[id];
      if (!ev || ev.eventTypeId !== 'MOUSE_CLICK') continue;
      if (!ev.action || !ev.action.config || ev.action.config.actionListId !== actionListId) continue;
      var target = ev.target && (ev.target.selector || ev.target.id);
      if (!target) continue;
      // ixData stores "pageId|elementId"; the DOM only carries the element id.
      var ids = target.indexOf('|') >= 0 ? [target, target.split('|')[1]] : [target];
      for (var i = 0; i < ids.length; i++) {
        if (!ids[i]) continue;
        var found = document.querySelectorAll('[data-w-id="' + ids[i] + '"]');
        for (var j = 0; j < found.length; j++) out.push(found[j]);
      }
    }
    return out;
  }

  // An interaction bound inside a Collection List sits on EVERY row, so taking
  // the first match would fire the popup belonging to row 1. Walk up from the
  // caller and take the carrier under the nearest shared ancestor — the button
  // in the caller's own row.
  function nearestCarrier(carriers, fromEl) {
    if (!carriers.length) return null;
    if (!fromEl || !fromEl.parentElement) return carriers[0];
    var node = fromEl;
    while (node) {
      for (var i = 0; i < carriers.length; i++) {
        if (carriers[i] !== fromEl && node.contains && node.contains(carriers[i])) return carriers[i];
      }
      if (node === document.body) break;
      node = node.parentElement;
    }
    return carriers[0];
  }

  var firing = false;   // a carrier may itself carry the attribute — don't loop

  function playInteraction(name, fromEl) {
    var data = ixData();
    if (!data) {
      console.warn('[digi2.webflow] Webflow IX2 not available on this page.');
      return false;
    }
    var alId = actionListIdByName(data, name);
    if (!alId) {
      console.warn('[digi2.webflow] no interaction named "' + name + '" on this page.');
      return false;
    }
    var carrier = nearestCarrier(carriersFor(data, alId), fromEl || null);
    if (!carrier) {
      console.warn('[digi2.webflow] "' + name + '" exists but nothing on this page triggers it by click.');
      return false;
    }
    if (firing) return false;
    firing = true;
    try {
      carrier.click();
    } finally {
      setTimeout(function () { firing = false; }, 0);
    }
    _log('interaction → ' + name, { actionListId: alId });
    return true;
  }

  // ---- triggers ------------------------------------------------------------

  function bindTriggers() {
    var els = document.querySelectorAll('[d2-webflow-interaction]');
    var added = 0;
    Array.prototype.forEach.call(els, function (el) {
      if (el._d2WebflowBound) return;
      el._d2WebflowBound = true;
      added += 1;
      el.addEventListener('click', function (e) {
        var name = attr(el, 'd2-webflow-interaction');
        if (!name) return;
        e.preventDefault();
        playInteraction(name, el);
      });
    });
    if (added) _log('bound triggers', { added: added });
    return added;
  }

  // ---- public API ----------------------------------------------------------

  window.digi2.webflow = {
    playInteraction: function (name, fromEl) { return playInteraction(name, fromEl || null); },

    /** Names of every Webflow interaction available on this page. */
    interactions: function () {
      var data = ixData();
      if (!data || !data.actionLists) return [];
      return Object.keys(data.actionLists).map(function (k) {
        var al = data.actionLists[k] || {};
        return al.title || al.name || k;
      });
    },

    /** Re-scan for [d2-webflow-interaction] added after load (CMS rows, etc.). */
    refresh: bindTriggers,
  };

  // CMS lists append rows after startup — pick up their triggers too.
  if (typeof window.digi2.on === 'function') {
    window.digi2.on('cms:items-added', function () { bindTriggers(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindTriggers);
  } else {
    bindTriggers();
  }
})();
