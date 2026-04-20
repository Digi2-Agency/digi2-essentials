/**
 * digi2 — Tabs & Accordions Module
 * Loaded automatically by digi2-loader.js when d2-tabs is present.
 *
 * Supports two modes: tabs (one panel visible) and accordion (collapsible, multiple open).
 * Uses same animation presets as popups module.
 *
 * Webflow setup:
 *   <div d2-tab-group="faq">
 *     <button d2-tab="item-1">Tab 1</button>
 *     <button d2-tab="item-2">Tab 2</button>
 *     <div d2-tab-content="item-1">Content 1</div>
 *     <div d2-tab-content="item-2">Content 2</div>
 *   </div>
 *
 * API:
 *   digi2.tabs.create('faq', { mode: 'tabs', animation: 'fade' })
 *   digi2.tabs.create('faq', { mode: 'accordion', allowMultiple: true })
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
        onChange: null,               // callback(tabId, instance)
        ...options,
      };

      this.groupEl = null;
      this.triggers = [];
      this.panels = [];
      this._activeTabs = new Set();
      this._animating = false;

      this._init();
    }

    // ---- Lifecycle ----------------------------------------------------------

    _init() {
      this.groupEl = this._findGroup();

      if (!this.groupEl) {
        console.warn('[digi2.tabs] "' + this.name + '" — group not found.');
        return;
      }

      this.triggers = Array.from(this.groupEl.querySelectorAll('[d2-tab]'));
      this.panels = Array.from(this.groupEl.querySelectorAll('[d2-tab-content]'));

      _log('init → ' + this.name, {
        mode: this.options.mode,
        triggers: this.triggers.length,
        panels: this.panels.length,
      });

      // Hide all panels initially
      this.panels.forEach(function (panel) {
        panel.style.display = 'none';
      });

      // Attach click listeners
      this._attachListeners();

      // Open default
      this._openDefault();

      // Hash sync
      if (this.options.hashSync) {
        this._syncFromHash();
        var self = this;
        window.addEventListener('hashchange', function () { self._syncFromHash(); });
      }
    }

    destroy() {
      this.triggers = [];
      this.panels = [];
      this._activeTabs.clear();
      this.groupEl = null;
      _log('destroy → ' + this.name);
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
        trigger.addEventListener('click', function (e) {
          e.preventDefault();
          var tabId = trigger.getAttribute('d2-tab');
          if (self.options.mode === 'accordion') {
            self.toggle(tabId);
          } else {
            self.open(tabId);
          }
        });
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

      // In tabs mode, close all others first
      if (this.options.mode === 'tabs') {
        var self = this;
        this._activeTabs.forEach(function (activeId) {
          if (activeId !== tabId) self._hidePanel(activeId);
        });
      }

      // In accordion mode with !allowMultiple, close others
      if (this.options.mode === 'accordion' && !this.options.allowMultiple) {
        var self2 = this;
        this._activeTabs.forEach(function (activeId) {
          if (activeId !== tabId) self2._hidePanel(activeId);
        });
      }

      this._showPanel(tabId);
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

    // ---- Internal -----------------------------------------------------------

    _getPanel(tabId) {
      return this.panels.find(function (p) {
        return p.getAttribute('d2-tab-content') === tabId;
      });
    }

    _getTrigger(tabId) {
      return this.triggers.find(function (t) {
        return t.getAttribute('d2-tab') === tabId;
      });
    }

    _showPanel(tabId) {
      var panel = this._getPanel(tabId);
      if (!panel) return;

      var anim = ANIMATIONS[this.options.animation] || ANIMATIONS.fade;
      var dur = this.options.animationDuration;

      if (anim === ANIMATIONS.none) {
        panel.style.display = '';
        return;
      }

      this._animating = true;
      applyStyles(panel, anim.setup(dur));
      panel.style.display = '';
      void panel.offsetHeight; // reflow
      applyStyles(panel, anim.in());

      var self = this;
      panel.addEventListener('transitionend', function handler() {
        self._animating = false;
        panel.removeEventListener('transitionend', handler);
      }, { once: true });

      // Fallback timeout in case transitionend doesn't fire
      setTimeout(function () { self._animating = false; }, dur * 1000 + 50);
    }

    _hidePanel(tabId) {
      var panel = this._getPanel(tabId);
      if (!panel) return;

      var anim = ANIMATIONS[this.options.animation] || ANIMATIONS.fade;
      var dur = this.options.animationDuration;

      if (anim === ANIMATIONS.none) {
        panel.style.display = 'none';
        applyStyles(panel, anim.reset());
        return;
      }

      applyStyles(panel, anim.out(dur));

      var self = this;
      panel.addEventListener('transitionend', function handler() {
        panel.style.display = 'none';
        applyStyles(panel, anim.reset());
        panel.removeEventListener('transitionend', handler);
      }, { once: true });

      // Fallback
      setTimeout(function () {
        if (panel.style.display !== 'none') {
          panel.style.display = 'none';
          applyStyles(panel, anim.reset());
        }
      }, dur * 1000 + 50);
    }

    _updateTriggers() {
      var activeClass = this.options.activeClass;
      var activeTabs = this._activeTabs;

      this.triggers.forEach(function (trigger) {
        var tabId = trigger.getAttribute('d2-tab');
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
      } else if (this.options.mode === 'tabs' && this.triggers.length > 0) {
        // Auto-open first tab
        this.open(this.triggers[0].getAttribute('d2-tab'));
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

  window.digi2.tabs = {
    create: function (name, options) {
      if (registry[name]) {
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
  };
})();
