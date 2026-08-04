/**
 * digi2 — Webflow Module
 * Loaded automatically by digi2-loader.js when d2-webflow (or any
 * d2-webflow-* attribute) is present.
 *
 * Bridges custom code back into Webflow's own machinery — today: making any
 * element fire a Designer interaction (IX2) by the name you gave it.
 *
 * Webflow setup:
 *   <button d2-webflow-interaction="Show Form Popup">Zapytaj o ofertę</button>
 *
 * API:
 *   digi2.webflow.playInteraction('Show Form Popup')   // fire it from JS
 *   digi2.webflow.interactions()                       // every name on the page
 *   digi2.webflow.refresh()                            // re-scan for new triggers
 *
 * How it works
 * ------------
 * Webflow keeps interactions in ix2: `actionLists` (each carrying the name typed
 * in the Designer) and `events` binding a list to elements via `data-w-id`.
 * There is no public "play by name" entry point — ix2.actions.playbackRequested()
 * needs an `affectedElements` map only Webflow's own plumbing can build, and
 * firing it with an empty map is a silent no-op (verified on a live site).
 *
 * So instead of faking the playback, we make the element a REAL trigger: copy the
 * `data-w-id` that the interaction's click event points at onto our element and
 * call ix2.init(), which re-binds Webflow's listeners over the current DOM. From
 * then on Webflow drives it — same code path as a button built in the Designer,
 * so hover states and repeat clicks behave identically.
 *
 * This also works when NOTHING on the page carries that interaction yet, which is
 * the usual case for a section built entirely in custom code.
 */
(function () {
  'use strict';

  if (!window.digi2) window.digi2 = {};

  var ATTR = 'd2-webflow-interaction';

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

  function ix2() {
    try {
      var wf = window.Webflow;
      if (!wf || typeof wf.require !== 'function') return null;
      return wf.require('ix2') || null;
    } catch (e) {
      return null;
    }
  }

  function ixData(inst) {
    try {
      var i = inst || ix2();
      return (i && i.store) ? (i.store.getState().ixData || null) : null;
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

  // The data-w-id a click event for this action list points at. Webflow stores
  // "pageId|elementId" in ixData but writes only the element id into the DOM,
  // so hand back the bare id — that's what a trigger must carry.
  function clickTargetFor(data, actionListId) {
    if (!data.events) return null;
    for (var id in data.events) {
      if (!Object.prototype.hasOwnProperty.call(data.events, id)) continue;
      var ev = data.events[id];
      if (!ev || ev.eventTypeId !== 'MOUSE_CLICK') continue;
      if (!ev.action || !ev.action.config || ev.action.config.actionListId !== actionListId) continue;
      var target = ev.target && (ev.target.selector || ev.target.id);
      if (!target) continue;
      return target.indexOf('|') >= 0 ? target.split('|')[1] : target;
    }
    return null;
  }

  function targetForName(name) {
    var data = ixData();
    if (!data) {
      console.warn('[digi2.webflow] Webflow IX2 not available on this page.');
      return null;
    }
    var alId = actionListIdByName(data, name);
    if (!alId) {
      console.warn('[digi2.webflow] no interaction named "' + name + '" on this page.');
      return null;
    }
    var guid = clickTargetFor(data, alId);
    if (!guid) {
      console.warn('[digi2.webflow] "' + name + '" has no click event — only click-triggered '
        + 'interactions can be attached (hover/scroll ones have no id to borrow).');
      return null;
    }
    return guid;
  }

  // Re-binding is batched: ix2.init() re-reads the whole document, so doing it
  // once after wiring N triggers is both cheaper and avoids repeated resets.
  var reinitQueued = false;
  function queueReinit() {
    if (reinitQueued) return;
    reinitQueued = true;
    var run = function () {
      reinitQueued = false;
      var i = ix2();
      if (!i || typeof i.init !== 'function') return;
      try {
        i.init();
        _log('ix2 re-initialised');
      } catch (e) {
        console.warn('[digi2.webflow] ix2.init() failed:', e);
      }
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 0);
  }

  // ---- wiring --------------------------------------------------------------

  function wire(el, name) {
    var guid = targetForName(name);
    if (!guid) return false;

    var existing = el.getAttribute('data-w-id');
    if (existing === guid) return false;          // already wired
    if (existing) {
      // The element already belongs to another Webflow interaction — silently
      // overwriting it would break that one.
      console.warn('[digi2.webflow] element already has data-w-id="' + existing
        + '" — not overwriting it for "' + name + '".');
      return false;
    }

    el.setAttribute('data-w-id', guid);
    _log('wired trigger → ' + name, { dataWId: guid });
    return true;
  }

  function bindTriggers() {
    var els = document.querySelectorAll('[' + ATTR + ']');
    var wired = 0;
    Array.prototype.forEach.call(els, function (el) {
      if (el._d2WfWired) return;
      var name = attr(el, ATTR);
      if (!name) return;
      if (wire(el, name)) wired += 1;
      el._d2WfWired = true;
    });
    if (wired) queueReinit();
    return wired;
  }

  // Fire from JS with no trigger element of your own: borrow the id on a hidden
  // element, let Webflow bind it, click it, then clean up.
  function playInteraction(name) {
    var guid = targetForName(name);
    if (!guid) return false;

    var proxy = document.createElement('div');
    proxy.setAttribute('data-w-id', guid);
    proxy.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none';
    document.body.appendChild(proxy);

    var i = ix2();
    try {
      if (i && typeof i.init === 'function') i.init();
      proxy.click();
      _log('interaction → ' + name);
    } catch (e) {
      console.warn('[digi2.webflow] failed to play "' + name + '":', e);
      proxy.remove();
      return false;
    }
    // Leave the proxy in place for one frame so Webflow can read it, then drop it.
    setTimeout(function () { proxy.remove(); }, 60);
    return true;
  }

  // ---- public API ----------------------------------------------------------

  window.digi2.webflow = {
    playInteraction: playInteraction,

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

  // ix2 loads asynchronously — retry briefly until it's there, then bind.
  function boot(attempt) {
    if (ixData()) { bindTriggers(); return; }
    if ((attempt || 0) > 20) {
      if (document.querySelector('[' + ATTR + ']')) {
        console.warn('[digi2.webflow] Webflow IX2 never became available — triggers not wired.');
      }
      return;
    }
    setTimeout(function () { boot((attempt || 0) + 1); }, 150);
  }

  // CMS lists append rows after startup — pick up their triggers too.
  if (typeof window.digi2.on === 'function') {
    window.digi2.on('cms:items-added', function () { bindTriggers(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { boot(0); });
  } else {
    boot(0);
  }
})();
