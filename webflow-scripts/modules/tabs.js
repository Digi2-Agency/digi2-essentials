/**
 * digi2 — Tabs & Accordions Module
 * Loaded automatically by digi2-loader.js when d2-tabs is present.
 *
 * Supports two modes: tabs (one panel visible) and accordion (collapsible, multiple open).
 * Animations: none | fade | slide-up | slide-down | zoom | height.
 *   'height' = smooth max-height collapse (best for accordions with variable
 *   content — e.g. expanding table rows).
 *
 *   digi2.tabs.create('rows', { groupSelector: '.list', mode: 'accordion',
 *                               allowMultiple: false, animation: 'height',
 *                               animationDuration: 0.4 })
 *
 * Webflow setup:
 *   <div d2-tab-group="faq">
 *     <button d2-tab-trigger="item-1">Tab 1</button>
 *     <button d2-tab-trigger="item-2">Tab 2</button>
 *     <div d2-tab-instance="item-1">Content 1</div>
 *     <div d2-tab-instance="item-2">Content 2</div>
 *   </div>
 *
 * API:
 *   // d2-tab-group elements auto-initialize on load.
 *   digi2.tabs.create('faq', { mode: 'tabs', animation: 'fade' })
 *   digi2.tabs.create('faq', { mode: 'accordion', allowMultiple: true })
 *   digi2.tabs.init()
 *   digi2.tabs.get('faq')
 *   digi2.tabs.destroy('faq')
 *   digi2.tabs.list()
 *
 * Instance methods:
 *   instance.open('item-1')
 *   instance.close('item-1')      — accordion only
 *   instance.toggle('item-1')     — accordion only
 *   instance.getActive()          — returns active tab id(s)
 *   instance.destroy()
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  // Responsive-aware getAttribute. Falls back to raw read when the loader
  // hasn't installed digi2.attr yet (older builds, standalone usage).
  function attr(el, name) {
    if (!el) return null;
    if (window.digi2 && typeof window.digi2.attr === 'function') {
      return window.digi2.attr(el, name, null);
    }
    return el.getAttribute(name);
  }

  function _log(action, data) {
    if (window.digi2.log) window.digi2.log('tabs', action, data);
  }

  // ---------------------------------------------------------------------------
  // Animation presets (same structure as popups)
  // ---------------------------------------------------------------------------
  var ANIMATIONS = {
    none: {
      setup: function () { return {}; },
      in:    function () { return {}; },
      out:   function () { return {}; },
      reset: function () { return {}; },
    },
    fade: {
      setup: function (d) { return { opacity: '0', transition: 'opacity ' + d + 's ease' }; },
      in:    function ()  { return { opacity: '1' }; },
      out:   function (d) { return { opacity: '0', transition: 'opacity ' + d + 's ease' }; },
      reset: function ()  { return { opacity: '', transition: '' }; },
    },
    'slide-up': {
      setup: function (d) { return { opacity: '0', transform: 'translateY(12px)', transition: 'opacity ' + d + 's ease, transform ' + d + 's ease' }; },
      in:    function ()  { return { opacity: '1', transform: 'translateY(0)' }; },
      out:   function (d) { return { opacity: '0', transform: 'translateY(12px)', transition: 'opacity ' + d + 's ease, transform ' + d + 's ease' }; },
      reset: function ()  { return { opacity: '', transform: '', transition: '' }; },
    },
    'slide-down': {
      setup: function (d) { return { opacity: '0', transform: 'translateY(-12px)', transition: 'opacity ' + d + 's ease, transform ' + d + 's ease' }; },
      in:    function ()  { return { opacity: '1', transform: 'translateY(0)' }; },
      out:   function (d) { return { opacity: '0', transform: 'translateY(-12px)', transition: 'opacity ' + d + 's ease, transform ' + d + 's ease' }; },
      reset: function ()  { return { opacity: '', transform: '', transition: '' }; },
    },
    zoom: {
      setup: function (d) { return { opacity: '0', transform: 'scale(0.95)', transition: 'opacity ' + d + 's ease, transform ' + d + 's ease' }; },
      in:    function ()  { return { opacity: '1', transform: 'scale(1)' }; },
      out:   function (d) { return { opacity: '0', transform: 'scale(0.95)', transition: 'opacity ' + d + 's ease, transform ' + d + 's ease' }; },
      reset: function ()  { return { opacity: '', transform: '', transition: '' }; },
    },
  };

  function applyStyles(el, styles) {
    for (var key in styles) {
      if (styles.hasOwnProperty(key)) el.style[key] = styles[key];
    }
  }

  function showElement(el) {
    if (!el || !el.style) return;
    if (typeof el.style.removeProperty === 'function') {
      el.style.removeProperty('display');
    } else {
      el.style.display = '';
    }
  }

  function hideElement(el) {
    if (!el || !el.style) return;
    if (typeof el.style.setProperty === 'function') {
      el.style.setProperty('display', 'none', 'important');
    } else {
      el.style.display = 'none';
    }
  }

  // ---------------------------------------------------------------------------
  // TabManager (internal)
  // ---------------------------------------------------------------------------
  class TabManager {
    constructor(name, options = {}) {
      this.name = name;

      this.options = {
        groupSelector: null,          // CSS selector override (alternative to d2-tab-group)
        mode: 'tabs',                 // 'tabs' | 'accordion'
        allowMultiple: false,         // accordion only: allow multiple panels open
        animation: 'fade',            // none | fade | slide-up | slide-down | zoom
        animationDuration: 0.25,
        defaultOpen: null,            // tab id to open by default (string or array for accordion)
        activeClass: 'd2-tab-active', // class added to active trigger
        hashSync: false,              // sync active tab with URL hash
        scroll: false,                // on open, scroll the panel into view
        scrollBlock: 'center',        // where the opened panel lands: start|center|end
        onChange: null,               // callback(tabId, instance)
        ...options,
      };

      this.groupEl = null;
      this.triggers = [];
      this.externalTriggers = [];
      this.panels = [];
      this._activeTabs = new Set();
      this._animating = false;
      this._initializing = false;
      this._initialActiveTabId = null;

      this._init();
    }

    // ---- Lifecycle ----------------------------------------------------------

    _init() {
      this.groupEl = this._findGroup();

      if (!this.groupEl) {
        console.warn('[digi2.tabs] "' + this.name + '" — group not found.');
        return;
      }

      var self = this;
      this.triggers = Array.from(this.groupEl.querySelectorAll('[d2-tab-trigger], [d2-tab]'))
        .filter(function (el) { return self._ownsElement(el); });
      this.panels = Array.from(this.groupEl.querySelectorAll('[d2-tab-instance], [d2-tab-content]'))
        .filter(function (el) { return self._ownsElement(el); });
      this.externalTriggers = this._findExternalTriggers();
      var initialActiveTrigger = this._getInitialActiveTrigger();
      this._initialActiveTabId = initialActiveTrigger ? this._getTriggerTabId(initialActiveTrigger) || this._getExternalTriggerTabId(initialActiveTrigger) : null;

      _log('init → ' + this.name, {
        mode: this.options.mode,
        triggers: this.triggers.length,
        externalTriggers: this.externalTriggers.length,
        panels: this.panels.length,
      });

      // Hide all panels initially
      this.panels.forEach(function (panel) {
        hideElement(panel);
      });

      // Attach click listeners
      this._attachListeners();

      // Open default
      this._initializing = true;
      this._openDefault();
      this._initializing = false;

      // Hash sync
      if (this.options.hashSync) {
        this._syncFromHash();
        var self = this;
        window.addEventListener('hashchange', function () { self._syncFromHash(); });
      }
    }

    destroy() {
      this.triggers = [];
      this.externalTriggers = [];
      this.panels = [];
      this._activeTabs.clear();
      this.groupEl = null;
      _log('destroy → ' + this.name);
    }

    updateOptions(options) {
      options = options || {};

      var previousActiveClass = this.options.activeClass;
      this.options = {
        ...this.options,
        ...options,
      };

      this._animating = false;
      this.panels.forEach(function (panel) {
        hideElement(panel);
      });
      this._activeTabs.clear();
      this._initializing = true;
      this._openDefault();
      this._initializing = false;

      if (previousActiveClass !== this.options.activeClass) {
        this.triggers.concat(this.externalTriggers).forEach(function (trigger) {
          if (!trigger.classList) return;
          trigger.classList.remove(previousActiveClass);
        });
        this._updateTriggers();
      }

      return this;
    }

    // An element belongs to THIS group only when no other [d2-tab-group] sits
    // between it and this.groupEl. Otherwise it belongs to a nested group and
    // must be ignored here — this stops an outer group (e.g. a list/grid view
    // switch) from stealing a nested accordion's triggers/panels and hiding
    // the whole view when a row is clicked.
    _ownsElement(el) {
      var node = el.parentElement;
      while (node && node !== this.groupEl) {
        if (node.hasAttribute && node.hasAttribute('d2-tab-group')) {
          return false;
        }
        node = node.parentElement;
      }
      return node === this.groupEl;
    }

    // ---- Find group ---------------------------------------------------------

    _findGroup() {
      if (this.options.groupSelector) {
        return document.querySelector(this.options.groupSelector);
      }
      return document.querySelector('[d2-tab-group="' + this.name + '"]');
    }

    // ---- Listeners ----------------------------------------------------------

    _attachListeners() {
      var self = this;
      this.triggers.forEach(function (trigger) {
        self._attachTrigger(trigger, function () {
          return self._getTriggerTabId(trigger);
        });
      });

      this.externalTriggers.forEach(function (trigger) {
        self._attachTrigger(trigger, function () {
          return self._getExternalTriggerTabId(trigger);
        });
      });
    }

    _attachTrigger(trigger, getTabId) {
      var self = this;
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        var tabId = getTabId();
        if (!tabId) return;
        if (self.options.mode === 'accordion') {
          self.toggle(tabId);
        } else {
          self.open(tabId);
        }
      });
    }

    // ---- Public API ---------------------------------------------------------

    /**
     * Open a tab/panel by id.
     */
    open(tabId) {
      if (this._animating) return;

      var panel = this._getPanel(tabId);
      if (!panel) return;

      // Already open
      if (this._activeTabs.has(tabId) && this.options.mode === 'tabs') return;

      _log('open → ' + tabId);

      // Record the geometry of panels about to close BEFORE their collapse
      // starts — their current heights feed the predictive scroll target (a
      // closing panel above the opening one shifts it up by its full height).
      var self = this;
      var willCloseOthers = this.options.mode === 'tabs'
        || (this.options.mode === 'accordion' && !this.options.allowMultiple);
      var closingInfo = [];
      if (willCloseOthers) {
        this._activeTabs.forEach(function (activeId) {
          if (activeId === tabId) return;
          var p = self._getPanel(activeId);
          if (p && typeof p.getBoundingClientRect === 'function') {
            var r = p.getBoundingClientRect();
            closingInfo.push({ top: r.top, height: (p.offsetHeight || r.height || 0) });
          }
        });
        this._activeTabs.forEach(function (activeId) {
          if (activeId !== tabId) {
            self._hidePanel(activeId);
            self._activeTabs.delete(activeId);
          }
        });
      }

      // Predictive scroll: compute the panel's FINAL position + size up front
      // (opening growth + siblings collapsing above) and glide straight there
      // in one motion. Skipped during the initial default-open.
      var shouldScroll = this.options.scroll && !this._initializing;
      this._showPanel(tabId, null);
      if (shouldScroll) this._scrollToTab(tabId, closingInfo);
      this._activeTabs.add(tabId);
      this._updateTriggers();

      if (this.options.hashSync) {
        history.replaceState(null, '', '#' + tabId);
      }

      if (typeof this.options.onChange === 'function') {
        this.options.onChange(tabId, this);
      }
    }

    /**
     * Close a panel by id (accordion only).
     */
    close(tabId) {
      if (!this._activeTabs.has(tabId)) return;

      _log('close → ' + tabId);

      this._hidePanel(tabId);
      this._activeTabs.delete(tabId);
      this._updateTriggers();

      if (typeof this.options.onChange === 'function') {
        this.options.onChange(null, this);
      }
    }

    /**
     * Toggle a panel (accordion).
     */
    toggle(tabId) {
      if (this._activeTabs.has(tabId)) {
        this.close(tabId);
      } else {
        this.open(tabId);
      }
    }

    /**
     * Get active tab id(s).
     * @returns {string|string[]} single id for tabs, array for accordion
     */
    getActive() {
      var arr = Array.from(this._activeTabs);
      return this.options.mode === 'tabs' ? (arr[0] || null) : arr;
    }

    // Predictive scroll: instead of chasing the live layout, compute where the
    // panel will sit AFTER all animations finish and glide straight there.
    //   final height = the measured expansion target (panel._d2TargetHeight,
    //                  set by _showPanelHeight) — or the current rect for
    //                  non-height animations (already at full size);
    //   final top    = the panel's top right now minus the summed heights of
    //                  closing panels that sit above it (they collapse to 0).
    // The glide runs over the animation's duration with ease-out and aborts if
    // the user scrolls manually (wheel/touch) so we never fight their input.
    _scrollToTab(tabId, closingInfo) {
      var target = this._getPanel(tabId) || this._getTrigger(tabId);
      if (!target) return;

      var win = (typeof window !== 'undefined') ? window : null;
      var block = this.options.scrollBlock || 'center';

      if (!win || typeof target.getBoundingClientRect !== 'function' || typeof win.scrollTo !== 'function') {
        // No window plumbing (or exotic embed) — one-shot native fallback.
        if (typeof target.scrollIntoView === 'function') {
          try {
            target.scrollIntoView({ behavior: 'smooth', block: block === 'end' ? 'end' : (block === 'start' ? 'start' : 'center') });
          } catch (e) { target.scrollIntoView(); }
        }
        return;
      }

      // Cancel a previous glide (rapid open/open on another row).
      if (this._scrollCancel) this._scrollCancel();

      var self = this;
      var rect = target.getBoundingClientRect();
      var pageY = win.pageYOffset != null ? win.pageYOffset : (win.scrollY || 0);
      var viewport = win.innerHeight || 0;

      // Predicted final geometry.
      var finalHeight = (target._d2TargetHeight != null) ? target._d2TargetHeight : rect.height;
      var closingAbove = 0;
      if (closingInfo && closingInfo.length) {
        for (var ci = 0; ci < closingInfo.length; ci++) {
          if (closingInfo[ci].top < rect.top) closingAbove += closingInfo[ci].height || 0;
        }
      }
      var finalTop = rect.top + pageY - closingAbove;

      var destY;
      if (block === 'start') {
        destY = finalTop;
      } else if (block === 'end') {
        destY = finalTop - Math.max(0, viewport - finalHeight);
      } else { // center — clamp when taller than the viewport
        destY = finalHeight > viewport ? finalTop : finalTop - (viewport - finalHeight) / 2;
      }
      // Clamp to the PREDICTED document range (current height + panel growth
      // − collapsing siblings), so end-of-list targets don't overshoot.
      var docEl = (typeof document !== 'undefined') && document.documentElement;
      if (docEl && docEl.scrollHeight) {
        var predictedDocHeight = docEl.scrollHeight + (finalHeight - rect.height) - closingAbove;
        destY = Math.min(destY, Math.max(0, predictedDocHeight - viewport));
      }
      destY = Math.max(0, destY);

      var dur = Math.max(0, (this.options.animationDuration || 0) * 1000);
      var total = dur + 80;               // glide a touch past the animation
      var startY = pageY;
      var t0 = Date.now();
      var cancelled = false;
      var raf = typeof win.requestAnimationFrame === 'function'
        ? function (fn) { win.requestAnimationFrame(fn); }
        : function (fn) { setTimeout(fn, 16); };

      // Ease-out: moves immediately and decelerates — mirrors the panel's CSS
      // 'ease' timing, so the scroll rides along from the first frame.
      function easeOut(p) {
        return 1 - Math.pow(1 - p, 3);
      }

      function cancel() {
        cancelled = true;
        if (typeof win.removeEventListener === 'function') {
          win.removeEventListener('wheel', cancel);
          win.removeEventListener('touchstart', cancel);
        }
        if (self._scrollCancel === cancel) self._scrollCancel = null;
      }
      this._scrollCancel = cancel;
      if (typeof win.addEventListener === 'function') {
        win.addEventListener('wheel', cancel, { passive: true });
        win.addEventListener('touchstart', cancel, { passive: true });
      }

      function step() {
        if (cancelled) return;
        var p = total > 0 ? Math.min(1, (Date.now() - t0) / total) : 1;
        var y = startY + (destY - startY) * easeOut(p);
        try { win.scrollTo({ top: y }); } catch (e) { win.scrollTo(0, y); }
        if (p < 1) raf(step);
        else cancel();                    // done — detach listeners
      }
      step();
    }

    // ---- Internal -----------------------------------------------------------

    _getPanel(tabId) {
      return this.panels.find(function (p) {
        return (attr(p, 'd2-tab-instance') || attr(p, 'd2-tab-content')) === tabId;
      });
    }

    _getTrigger(tabId) {
      var self = this;
      return this.triggers.find(function (t) {
        return self._getTriggerTabId(t) === tabId;
      });
    }

    _findExternalTriggers() {
      if (!document.querySelectorAll) return [];

      var self = this;
      return Array.from(document.querySelectorAll('[d2-tab-trigger]')).filter(function (trigger) {
        if (self.groupEl && self.groupEl.contains && self.groupEl.contains(trigger)) return false;
        var tabId = self._getExternalTriggerTabId(trigger);
        return !!(tabId && self._getPanel(tabId));
      });
    }

    _getTriggerTabId(trigger) {
      var value = attr(trigger, 'd2-tab-trigger');
      if (value) return this._resolveTriggerValue(trigger, value, true);
      return attr(trigger, 'd2-tab');
    }

    _resolveTriggerValue(trigger, value, allowLocal) {
      if (!value) return null;

      var separator = value.indexOf(':');
      if (separator > -1) {
        var groupName = value.slice(0, separator).trim();
        var tabId = value.slice(separator + 1).trim();
        return groupName === this.name ? tabId || null : null;
      }

      var targetGroup = attr(trigger, 'd2-tab-target') || attr(trigger, 'd2-tab-group-trigger');
      if (targetGroup) {
        return targetGroup === this.name ? value : null;
      }

      if (allowLocal && this.groupEl && this.groupEl.contains && this.groupEl.contains(trigger)) {
        return value;
      }

      return null;
    }

    _getExternalTriggerTabId(trigger) {
      return this._resolveTriggerValue(trigger, attr(trigger, 'd2-tab-trigger'), false);
    }

    _getInitialActiveTrigger() {
      var configuredActiveClass = this.options.activeClass;
      return this.triggers.concat(this.externalTriggers).find(function (trigger) {
        if (!trigger.classList) return false;
        return (
          trigger.classList.contains(configuredActiveClass) ||
          trigger.classList.contains('d2-tab-active')
        );
      });
    }

    _showPanel(tabId, onDone) {
      var panel = this._getPanel(tabId);
      if (!panel) return;

      var dur = this.options.animationDuration;
      var done = typeof onDone === 'function' ? onDone : function () {};

      if (this._initializing) { showElement(panel); done(); return; }

      // Height collapse — smooth accordion grow. Animates the exact height
      // 0 → scrollHeight → auto (padding-safe, no end-of-animation jump).
      if (this.options.animation === 'height') { this._showPanelHeight(panel, dur, done); return; }

      var anim = ANIMATIONS[this.options.animation] || ANIMATIONS.fade;
      if (anim === ANIMATIONS.none) { showElement(panel); done(); return; }

      this._animating = true;
      applyStyles(panel, anim.setup(dur));
      showElement(panel);
      void panel.offsetHeight; // reflow
      applyStyles(panel, anim.in());

      var self = this;
      var finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        self._animating = false;
        done();
      }
      panel.addEventListener('transitionend', function handler() {
        panel.removeEventListener('transitionend', handler);
        finish();
      }, { once: true });

      // Fallback timeout in case transitionend doesn't fire
      setTimeout(finish, dur * 1000 + 50);
    }

    _hidePanel(tabId) {
      var panel = this._getPanel(tabId);
      if (!panel) return;

      var dur = this.options.animationDuration;

      if (this.options.animation === 'height' && !this._initializing) {
        this._hidePanelHeight(panel, dur); return;
      }

      var anim = ANIMATIONS[this.options.animation] || ANIMATIONS.fade;

      if (anim === ANIMATIONS.none || this.options.animation === 'height') {
        hideElement(panel);
        if (anim.reset) applyStyles(panel, anim.reset());
        return;
      }

      applyStyles(panel, anim.out(dur));

      var self = this;
      panel.addEventListener('transitionend', function handler() {
        hideElement(panel);
        applyStyles(panel, anim.reset());
        panel.removeEventListener('transitionend', handler);
      }, { once: true });

      // Fallback
      setTimeout(function () {
        if (panel.style.display !== 'none') {
          hideElement(panel);
          applyStyles(panel, anim.reset());
        }
      }, dur * 1000 + 50);
    }

    // --- max-height collapse animation (accordion "height" mode) -----------
    // Target height is measured with offsetHeight while max-height is briefly
    // lifted — NOT scrollHeight, which omits the panel's bottom padding when
    // content overflows, making the panel "jump" by that padding at the end.
    _showPanelHeight(panel, dur, onDone) {
      var self = this;
      var done = typeof onDone === 'function' ? onDone : function () {};
      this._animating = true;

      // Measure the real rendered height (incl. padding + CSS height rules).
      showElement(panel);
      panel.style.transition = 'none';
      panel.style.maxHeight = 'none';
      panel.style.overflow = 'hidden';
      var target = panel.offsetHeight;
      // Expose the final height for the predictive scroll (see _scrollToTab).
      panel._d2TargetHeight = target;

      // Collapse and animate up to the measured target.
      panel.style.maxHeight = '0px';
      void panel.offsetHeight;                       // commit the 0 state
      panel.style.transition = 'max-height ' + dur + 's ease';
      panel.style.maxHeight = target + 'px';

      var finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        panel.removeEventListener('transitionend', handler);
        // Let the panel grow naturally afterwards (nested media, etc.)
        panel.style.maxHeight = 'none';
        panel.style.overflow = '';
        panel.style.transition = '';
        self._animating = false;
        done();
      }
      function handler(e) {
        if (e && e.propertyName && e.propertyName !== 'max-height') return;
        finish();
      }
      panel.addEventListener('transitionend', handler);
      setTimeout(finish, dur * 1000 + 60);
    }

    _hidePanelHeight(panel, dur) {
      var finished = false;
      panel.style.overflow = 'hidden';
      panel.style.transition = 'none';
      panel.style.maxHeight = panel.offsetHeight + 'px';   // pin real rendered height
      void panel.offsetHeight;                             // commit the pin
      panel.style.transition = 'max-height ' + dur + 's ease';
      panel.style.maxHeight = '0px';

      function finish() {
        if (finished) return;
        finished = true;
        panel.removeEventListener('transitionend', handler);
        hideElement(panel);
        panel.style.maxHeight = '';
        panel.style.overflow = '';
        panel.style.transition = '';
      }
      function handler(e) {
        if (e && e.propertyName && e.propertyName !== 'max-height') return;
        finish();
      }
      panel.addEventListener('transitionend', handler);
      setTimeout(finish, dur * 1000 + 60);
    }

    _updateTriggers() {
      var activeClass = this.options.activeClass;
      var activeTabs = this._activeTabs;
      var self = this;

      this.triggers.concat(this.externalTriggers).forEach(function (trigger) {
        var tabId = self._getTriggerTabId(trigger) || self._getExternalTriggerTabId(trigger);
        if (activeTabs.has(tabId)) {
          trigger.classList.add(activeClass);
          trigger.setAttribute('aria-selected', 'true');
        } else {
          trigger.classList.remove(activeClass);
          trigger.setAttribute('aria-selected', 'false');
        }
      });
    }

    _openDefault() {
      var def = this.options.defaultOpen;

      if (def) {
        if (Array.isArray(def)) {
          var self = this;
          def.forEach(function (id) { self.open(id); });
        } else {
          this.open(def);
        }
      } else {
        var activeTabId = this._initialActiveTabId;
        if (activeTabId) {
          this.open(activeTabId);
        } else if (this.options.mode === 'tabs' && this.triggers.length > 0) {
          // Auto-open first tab
          this.open(this._getTriggerTabId(this.triggers[0]));
        }
      }
      // Accordion: nothing open by default unless specified
    }

    _syncFromHash() {
      var hash = window.location.hash.slice(1);
      if (hash) {
        var panel = this._getPanel(hash);
        if (panel) this.open(hash);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Register module
  // ---------------------------------------------------------------------------
  var registry = {};

  function autoInit() {
    if (!document.querySelectorAll) return [];

    var initialized = [];
    var groups = Array.from(document.querySelectorAll('[d2-tab-group]'));

    // Read config from the group element's attributes so accordions can be
    // set up fully declaratively (no digi2.tabs.create call):
    //   d2-tab-mode="accordion"        (tabs | accordion; default tabs)
    //   d2-tab-animation="height"      (none | fade | slide-up | slide-down | zoom | height)
    //   d2-tab-duration="0.4"          (seconds)
    //   d2-tab-multiple                (accordion: allow several open at once)
    //   d2-tab-default="item-1"        (id, or "a|b" for multiple)
    //   d2-tab-scroll                  (on open, scroll panel to center; value
    //                                   start|center|end overrides position)
    function _optionsFromGroup(group) {
      var o = { animation: 'none' };
      var mode = attr(group, 'd2-tab-mode');
      if (mode) o.mode = String(mode).trim().toLowerCase() === 'accordion' ? 'accordion' : 'tabs';
      var anim = attr(group, 'd2-tab-animation');
      if (anim) o.animation = String(anim).trim();
      if (group.hasAttribute && group.hasAttribute('d2-tab-multiple')) {
        o.allowMultiple = String(attr(group, 'd2-tab-multiple')) !== 'false';
      }
      var dur = parseFloat(attr(group, 'd2-tab-duration'));
      if (!isNaN(dur)) o.animationDuration = dur;
      // d2-tab-scroll            → scroll opened panel into view (centered)
      // d2-tab-scroll="start"    → override position (start|center|end)
      // Accept it on the group element OR on any descendant (trigger/panel),
      // so putting it on the rows works too.
      var scrollEl = (group.hasAttribute && group.hasAttribute('d2-tab-scroll'))
        ? group
        : (group.querySelector ? group.querySelector('[d2-tab-scroll]') : null);
      if (scrollEl) {
        o.scroll = true;
        var sb = String(attr(scrollEl, 'd2-tab-scroll') || '').trim().toLowerCase();
        if (sb === 'start' || sb === 'center' || sb === 'end') o.scrollBlock = sb;
      }
      var def = attr(group, 'd2-tab-default');
      if (def) o.defaultOpen = def.indexOf('|') !== -1 ? def.split('|').map(function (s) { return s.trim(); }).filter(Boolean) : def;
      return o;
    }

    groups.forEach(function (group) {
      var name = attr(group, 'd2-tab-group');
      if (!name || registry[name]) return;

      registry[name] = new TabManager(name, _optionsFromGroup(group));
      initialized.push(name);
    });

    return initialized;
  }

  window.digi2.tabs = {
    create: function (name, options) {
      if (registry[name]) {
        if (options) return registry[name].updateOptions(options);
        console.warn('[digi2.tabs] "' + name + '" already exists.');
        return registry[name];
      }
      var instance = new TabManager(name, options);
      registry[name] = instance;
      return instance;
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

    init: autoInit,
  };

  function boot() {
    autoInit();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
