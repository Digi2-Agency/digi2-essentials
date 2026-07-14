/**
 * digi2 — Dropdowns Module
 * Loaded automatically by digi2-loader.js when d2-dropdowns is present.
 *
 * Own open/close behavior for custom dropdowns — no reliance on Webflow's
 * built-in interaction (which can leave the menu open after a selection).
 * Works on a plain structure AND on a Webflow Dropdown element.
 *
 * Webflow setup (put d2-dropdown on the wrapper):
 *   <div class="w-dropdown" d2-dropdown>
 *     <div class="w-dropdown-toggle" d2-dropdown-toggle>
 *       <div d2-tab-label="view">Wyświetl według</div>
 *     </div>
 *     <nav class="w-dropdown-list" d2-dropdown-list>
 *       <a d2-tab-trigger="view:list" class="w-dropdown-link">Lista</a>
 *       <a d2-tab-trigger="view:grid" class="w-dropdown-link">Siatka</a>
 *     </nav>
 *   </div>
 *
 * - toggle: [d2-dropdown-toggle] (falls back to .w-dropdown-toggle)
 * - list:   [d2-dropdown-list]   (falls back to .w-dropdown-list)
 * - Opens on toggle click, closes on: outside click, Esc, or selecting an item
 *   inside the list (default). The item's own handler still runs (tab switch,
 *   filter, link) — we only collapse the menu.
 * - Options on the wrapper:
 *     d2-dropdown-hover        open on hover (also honors Webflow data-hover)
 *     d2-dropdown-keep-open    don't auto-close after selecting an item
 * - State for CSS: wrapper gets [d2-dropdown-open] + class `is-open`; on a
 *   Webflow dropdown the native w--open classes are toggled too.
 *
 * API: digi2.dropdowns.open(elOrSelector) / .close(...) / .toggle(...) /
 *      .closeAll() / .init()
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  function attr(el, name) {
    if (!el) return null;
    if (window.digi2 && typeof window.digi2.attr === 'function') return window.digi2.attr(el, name, null);
    return el.getAttribute(name);
  }
  function _log(action, data) { if (window.digi2.log) window.digi2.log('dropdowns', action, data); }

  var OPEN = 'd2-dropdown-open';
  var ITEM_SEL = 'a, button, [d2-dropdown-item], .w-dropdown-link, [d2-tab-trigger], [d2-cms-sort], [d2-cms-filter], [d2-cms-clear]';
  var _open = [];             // currently-open wrappers
  var _cssInjected = false;

  function _injectCSS() {
    if (_cssInjected || !document.head || !document.createElement) return;
    _cssInjected = true;
    var s = document.createElement('style');
    // Plain (non-Webflow) structure: hide the list until open. Webflow lists
    // (.w-dropdown-list) are left to Webflow's own CSS + the w--open class.
    s.textContent =
      '[d2-dropdown] [d2-dropdown-list]:not(.w-dropdown-list){display:none}' +
      '[d2-dropdown][d2-dropdown-open] [d2-dropdown-list]:not(.w-dropdown-list){display:block}';
    document.head.appendChild(s);
  }

  function _isWebflow(wrap) {
    return !!(wrap.classList && wrap.classList.contains('w-dropdown'));
  }

  function _parts(wrap) {
    return {
      toggle: wrap.querySelector('[d2-dropdown-toggle]') || wrap.querySelector('.w-dropdown-toggle'),
      list: wrap.querySelector('[d2-dropdown-list]') || wrap.querySelector('.w-dropdown-list'),
    };
  }

  function open(wrap) {
    var p = wrap._d2dd;
    if (!p) return;
    wrap.setAttribute(OPEN, '');
    if (wrap.classList) wrap.classList.add('is-open');
    if (p.toggle) p.toggle.setAttribute('aria-expanded', 'true');
    if (_isWebflow(wrap)) {
      wrap.classList.add('w--open');
      if (p.toggle) p.toggle.classList.add('w--open');
      if (p.list) { p.list.classList.add('w--open'); p.list.style.display = 'block'; }
    }
    if (_open.indexOf(wrap) === -1) _open.push(wrap);
    _log('open');
  }

  function close(wrap) {
    var p = wrap._d2dd;
    wrap.removeAttribute(OPEN);
    if (wrap.classList) wrap.classList.remove('is-open');
    if (p && p.toggle) p.toggle.setAttribute('aria-expanded', 'false');
    if (_isWebflow(wrap)) {
      wrap.classList.remove('w--open');
      if (p && p.toggle) p.toggle.classList.remove('w--open');
      if (p && p.list) { p.list.classList.remove('w--open'); p.list.style.display = ''; }
    }
    var i = _open.indexOf(wrap);
    if (i > -1) _open.splice(i, 1);
  }

  function toggle(wrap) { (wrap.hasAttribute(OPEN) ? close : open)(wrap); }
  function closeAll(except) { _open.slice().forEach(function (w) { if (w !== except) close(w); }); }

  function enhance(wrap) {
    if (wrap._d2ddReady) return;
    var p = _parts(wrap);
    if (!p.toggle || !p.list) return;
    wrap._d2ddReady = true;
    wrap._d2dd = p;
    _injectCSS();

    // Own the toggle click. Capture + stopImmediatePropagation neutralizes
    // Webflow's built-in dropdown handler so we're the sole controller.
    p.toggle.addEventListener('click', function (e) {
      e.preventDefault();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      else e.stopPropagation();
      var wasOpen = wrap.hasAttribute(OPEN);
      closeAll(wrap);
      if (wasOpen) close(wrap); else open(wrap);
    }, true);

    var hover = wrap.hasAttribute('d2-dropdown-hover') || wrap.getAttribute('data-hover') === 'true';
    if (hover) {
      wrap.addEventListener('mouseenter', function () { open(wrap); });
      wrap.addEventListener('mouseleave', function () { close(wrap); });
    }

    // Close after choosing an option (unless told to stay open). Runs on
    // bubble, so the item's own click handler (tab switch / filter / link)
    // has already executed — we just collapse.
    if (!wrap.hasAttribute('d2-dropdown-keep-open')) {
      p.list.addEventListener('click', function (e) {
        var item = e.target && e.target.closest ? e.target.closest(ITEM_SEL) : null;
        if (item && p.list.contains(item)) close(wrap);
      });
    }

    close(wrap);   // start collapsed
  }

  function autoInit() {
    if (!document.querySelectorAll) return;
    var wraps = document.querySelectorAll('[d2-dropdown]');
    for (var i = 0; i < wraps.length; i++) enhance(wraps[i]);
  }

  function _resolve(elOrSel) {
    if (!elOrSel) return null;
    if (typeof elOrSel === 'string') return document.querySelector(elOrSel);
    return elOrSel;
  }

  window.digi2.dropdowns = {
    init: autoInit,
    open: function (x) { var w = _resolve(x); if (w) open(w); },
    close: function (x) { var w = _resolve(x); if (w) close(w); },
    toggle: function (x) { var w = _resolve(x); if (w) toggle(w); },
    closeAll: function () { closeAll(); },
  };

  // Global: outside-click and Esc close open dropdowns.
  if (document.addEventListener) {
    document.addEventListener('click', function (e) {
      if (!_open.length) return;
      for (var i = _open.length - 1; i >= 0; i--) {
        var w = _open[i];
        if (!(w.contains && w.contains(e.target))) close(w);
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') closeAll();
    });
  }

  var _mo = null;
  function _boot() {
    autoInit();
    if (typeof MutationObserver !== 'undefined' && document.body && !_mo) {
      var t = null;
      _mo = new MutationObserver(function () {
        if (t) return;
        t = setTimeout(function () { t = null; autoInit(); }, 50);
      });
      _mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['d2-dropdown'] });
    }
    _log('init');
  }

  if (document.readyState === 'loading' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    _boot();
  }
})();
