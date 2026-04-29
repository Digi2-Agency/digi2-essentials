/**
 * digi2 — Interactions Module
 * Loaded automatically by digi2-loader.js when d2-interactions is present.
 *
 * Components:
 *   - dock        Side-dock with mutually-exclusive sliding panels
 *                 (vertical floating column + slide-in panels, mobile-friendly)
 *
 * ─── Dock ──────────────────────────────────────────────────────────────────
 *
 * State machine:
 *   - Click trigger A   → if A active   → close A,  mark A previously_active
 *                       → if B active   → close B,  mark B previously_active, open A
 *                       → else          → open A
 *   - Hover any trigger → clear previously_active on all triggers
 *   - Click close-btn   → close active panel
 *   - Click outside     → close active panel
 *   - Press Escape      → close active panel
 *
 * Webflow / HTML setup (auto-init):
 *
 *   <div d2-dock="main">                              <!-- the dock host -->
 *     <button d2-dock-trigger="social">Social</button>
 *     <button d2-dock-trigger="contact">Contact</button>
 *   </div>
 *
 *   <div d2-dock-panel="social">                      <!-- the panel -->
 *     <button d2-dock-close>×</button>
 *     ...content...
 *   </div>
 *   <div d2-dock-panel="contact">
 *     <button d2-dock-close>×</button>
 *     ...content...
 *   </div>
 *
 * State classes (added/removed by the module):
 *   - .d2-active                 → trigger button while its panel is open
 *   - .d2-active                 → panel while it is open
 *   - .d2-previously-active      → trigger after closing-by-re-click
 *                                  (use this to hide the tooltip until next hover)
 *
 * JS API:
 *   digi2.interactions.dock('main', { ...options })
 *   digi2.interactions.dockAll({ ...options })   — init every [d2-dock] on the page
 *   digi2.interactions.get('dock', 'main')
 *   digi2.interactions.destroy('dock', 'main')
 *   digi2.interactions.list()
 *
 * Programmatic control:
 *   const dock = digi2.interactions.dock('main');
 *   dock.open('social');     — open a specific panel by trigger value
 *   dock.close();            — close whichever panel is open
 *   dock.toggle('contact');  — toggle a specific panel
 *
 * Options:
 *   triggerAttr:     'd2-dock-trigger'        — attribute on trigger buttons
 *   panelAttr:       'd2-dock-panel'          — attribute on panels
 *   closeAttr:       'd2-dock-close'          — attribute on close buttons inside panels
 *   activeClass:     'd2-active'              — class added to active trigger + panel
 *   prevActiveClass: 'd2-previously-active'   — class added to a trigger after re-click close
 *   closeOnOutside:  true                     — outside-click closes the active panel
 *   closeOnEscape:   true                     — Escape key closes the active panel
 *   injectStyles:    true                     — inject minimal slide animation CSS
 *   slideDuration:   '0.3s'                   — transition duration when injectStyles is on
 *   onOpen:          null                     — callback(panel, trigger, name)
 *   onClose:         null                     — callback(panel, trigger, name)
 *
 * Reference CSS (when injectStyles is off — style your own dock in Webflow):
 *
 *   [d2-dock-panel] {
 *     position: fixed; top: 50%; right: -400px;
 *     transform: translateY(-50%);
 *     transition: right 0.3s;
 *   }
 *   [d2-dock-panel].d2-active { right: 88px; }
 *
 *   @media (max-width: 767px) {
 *     [d2-dock-panel] { top: auto; right: auto; left: 6px;
 *       bottom: -400px; transform: none;
 *       transition: bottom 0.3s; }
 *     [d2-dock-panel].d2-active { bottom: 106px; }
 *   }
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  function _log(action, data) {
    if (window.digi2.log) window.digi2.log('interactions', action, data);
  }

  // ---------------------------------------------------------------------------
  // Style injection — minimum CSS for slide-in animation.
  // Idempotent: only injects once per page, no matter how many docks exist.
  // ---------------------------------------------------------------------------
  var _stylesInjected = false;

  function _injectBaseStyles(slideDuration) {
    if (_stylesInjected) return;
    _stylesInjected = true;

    var dur = slideDuration || '0.3s';
    var css =
      '[d2-dock-panel]{' +
        'position:fixed;top:50%;right:-400px;' +
        'transform:translateY(-50%);' +
        'transition:right ' + dur + ';' +
        'z-index:1002;' +
      '}' +
      '[d2-dock-panel].d2-active{right:88px;}' +
      '@media (max-width:767px){' +
        '[d2-dock-panel]{' +
          'top:auto;right:auto;left:6px;' +
          'bottom:-400px;transform:none;' +
          'transition:bottom ' + dur + ';' +
        '}' +
        '[d2-dock-panel].d2-active{bottom:106px;right:auto;}' +
      '}';

    var style = document.createElement('style');
    style.setAttribute('data-digi2-interactions', '');
    style.textContent = css;
    document.head.appendChild(style);
    _log('base styles injected');
  }

  // ---------------------------------------------------------------------------
  // Dock — mutually-exclusive panel switcher
  // ---------------------------------------------------------------------------
  class Dock {
    constructor(name, options) {
      this.name = name;

      this.options = Object.assign({
        dockSelector:    null,
        triggerAttr:     'd2-dock-trigger',
        panelAttr:       'd2-dock-panel',
        closeAttr:       'd2-dock-close',
        activeClass:     'd2-active',
        prevActiveClass: 'd2-previously-active',
        closeOnOutside:  true,
        closeOnEscape:   true,
        injectStyles:    true,
        slideDuration:   '0.3s',
        onOpen:          null,
        onClose:         null,
      }, options || {});

      this._dock = null;
      this._triggers = [];
      this._panels = {};
      this._activePanel = null;
      this._activeTrigger = null;

      this._listeners = []; // { el, type, handler }

      this._init();
    }

    _init() {
      var sel = this.options.dockSelector || '[d2-dock="' + this.name + '"]';
      this._dock = this.options._dockElement || document.querySelector(sel);
      if (!this._dock) {
        console.warn('[digi2.interactions] dock not found → ' + this.name);
        return;
      }

      if (this.options.injectStyles) {
        _injectBaseStyles(this.options.slideDuration);
      }

      this._triggers = Array.prototype.slice.call(
        this._dock.querySelectorAll('[' + this.options.triggerAttr + ']')
      );

      // Panels are matched globally by attribute value — they don't need to live
      // inside the dock, since they're typically positioned independently.
      var self = this;
      var panelEls = document.querySelectorAll('[' + this.options.panelAttr + ']');
      panelEls.forEach(function (p) {
        var key = p.getAttribute(self.options.panelAttr);
        // Don't clobber: if multiple docks share panel keys, first one wins.
        // Most setups use one dock per page.
        if (key && !self._panels[key]) {
          self._panels[key] = p;
        }
      });

      this._wireTriggers();
      this._wireCloseButtons();
      if (this.options.closeOnOutside) this._wireOutsideClick();
      if (this.options.closeOnEscape)  this._wireEscape();

      _log('dock init → ' + this.name, {
        triggers: this._triggers.length,
        panels:   Object.keys(this._panels).length,
      });
    }

    _addListener(el, type, handler) {
      el.addEventListener(type, handler);
      this._listeners.push({ el: el, type: type, handler: handler });
    }

    _wireTriggers() {
      var self = this;
      var triggerAttr     = this.options.triggerAttr;
      var activeClass     = this.options.activeClass;
      var prevActiveClass = this.options.prevActiveClass;

      this._triggers.forEach(function (btn) {
        var clickHandler = function (e) {
          e.stopPropagation();
          var key = btn.getAttribute(triggerAttr);
          var panel = self._panels[key];
          if (!panel) {
            console.warn('[digi2.interactions] no panel for trigger → ' + key);
            return;
          }

          // Re-click on already-active trigger → close + mark previously_active
          if (self._activePanel === panel) {
            self._closeActive();
            btn.classList.add(prevActiveClass);
            return;
          }

          // Switching from another panel → close it first, mark its trigger prev-active
          if (self._activePanel) {
            var prevPanel = self._activePanel;
            var prevTrigger = self._activeTrigger;
            prevPanel.classList.remove(activeClass);
            if (prevTrigger) {
              prevTrigger.classList.remove(activeClass);
              prevTrigger.classList.add(prevActiveClass);
            }
            if (typeof self.options.onClose === 'function') {
              self.options.onClose(prevPanel, prevTrigger, prevTrigger ? prevTrigger.getAttribute(triggerAttr) : null);
            }
            self._activePanel = null;
            self._activeTrigger = null;
          }

          // Opening this panel — clear prev-active from all triggers (the tooltip
          // for the freshly-opened trigger should not re-appear, but tooltips on
          // siblings that the user moves to should).
          self._triggers.forEach(function (b) { b.classList.remove(prevActiveClass); });

          panel.classList.add(activeClass);
          btn.classList.add(activeClass);
          self._activePanel = panel;
          self._activeTrigger = btn;

          if (typeof self.options.onOpen === 'function') {
            self.options.onOpen(panel, btn, key);
          }
          _log('open → ' + key);
        };

        var enterHandler = function () {
          // Once the pointer enters any trigger, prev-active flag is no longer
          // needed — tooltip suppression should only last while the pointer
          // hovers the trigger right after the close.
          self._triggers.forEach(function (b) { b.classList.remove(prevActiveClass); });
        };

        self._addListener(btn, 'click', clickHandler);
        self._addListener(btn, 'mouseenter', enterHandler);
      });
    }

    _wireCloseButtons() {
      var self = this;
      var closeAttr = this.options.closeAttr;

      Object.keys(this._panels).forEach(function (key) {
        var panel = self._panels[key];
        var closers = panel.querySelectorAll('[' + closeAttr + ']');
        closers.forEach(function (cb) {
          var handler = function (e) {
            e.stopPropagation();
            self._closeActive();
          };
          self._addListener(cb, 'click', handler);
        });
      });
    }

    _wireOutsideClick() {
      var self = this;
      var handler = function (e) {
        if (!self._activePanel) return;
        if (self._activePanel.contains(e.target)) return;
        if (self._dock && self._dock.contains(e.target)) return;
        // Close without marking prev-active — the user clicked away, not on a trigger.
        self._closeActive();
      };
      this._addListener(document, 'click', handler);
    }

    _wireEscape() {
      var self = this;
      var handler = function (e) {
        if (e.key === 'Escape' && self._activePanel) {
          self._closeActive();
        }
      };
      this._addListener(document, 'keydown', handler);
    }

    /** Close whichever panel is currently active. */
    _closeActive() {
      if (!this._activePanel) return;
      var panel = this._activePanel;
      var trigger = this._activeTrigger;
      var triggerAttr = this.options.triggerAttr;
      var activeClass = this.options.activeClass;
      var key = trigger ? trigger.getAttribute(triggerAttr) : null;

      panel.classList.remove(activeClass);
      if (trigger) trigger.classList.remove(activeClass);

      this._activePanel = null;
      this._activeTrigger = null;

      if (typeof this.options.onClose === 'function') {
        this.options.onClose(panel, trigger, key);
      }
      _log('close → ' + key);
    }

    // ---- Public methods ----------------------------------------------------

    open(name) {
      var self = this;
      var btn = this._triggers.find(function (b) {
        return b.getAttribute(self.options.triggerAttr) === name;
      });
      if (btn) btn.click();
    }

    close() {
      this._closeActive();
    }

    toggle(name) {
      var self = this;
      var btn = this._triggers.find(function (b) {
        return b.getAttribute(self.options.triggerAttr) === name;
      });
      if (btn) btn.click();
    }

    isOpen(name) {
      if (!name) return !!this._activePanel;
      var panel = this._panels[name];
      return !!panel && panel === this._activePanel;
    }

    destroy() {
      this._listeners.forEach(function (l) {
        l.el.removeEventListener(l.type, l.handler);
      });
      this._listeners = [];
      this._triggers = [];
      this._panels = {};
      this._dock = null;
      this._activePanel = null;
      this._activeTrigger = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  var registry = {};

  function _register(type, name, instance) {
    registry[type + ':' + name] = instance;
    return instance;
  }

  window.digi2.interactions = {
    /**
     * Create a single dock by name.
     *   digi2.interactions.dock('main', { ...options })
     */
    dock: function (name, options) {
      var key = 'dock:' + name;
      if (registry[key]) {
        console.warn('[digi2.interactions] dock "' + name + '" already exists. Destroy it first.');
        return registry[key];
      }
      return _register('dock', name, new Dock(name, options));
    },

    /**
     * Auto-initialize every [d2-dock] on the page with shared options.
     */
    dockAll: function (options) {
      var els = document.querySelectorAll('[d2-dock]');
      var created = [];
      els.forEach(function (el) {
        var name = el.getAttribute('d2-dock');
        if (!name || registry['dock:' + name]) return;
        var opts = Object.assign({}, options || {}, { _dockElement: el });
        created.push(_register('dock', name, new Dock(name, opts)));
      });
      _log('dockAll → ' + created.length + ' dock(s)');
      return created;
    },

    get: function (type, name) {
      return registry[type + ':' + name];
    },

    destroy: function (type, name) {
      var key = type + ':' + name;
      var instance = registry[key];
      if (instance && typeof instance.destroy === 'function') {
        instance.destroy();
        delete registry[key];
      }
    },

    list: function () {
      return Object.keys(registry);
    },
  };

  // ---------------------------------------------------------------------------
  // Auto-init: any [d2-dock] on the page gets a default Dock instance.
  // Skip this if the user has set d2-dock-manual on the element (they want JS
  // control with custom options).
  // ---------------------------------------------------------------------------
  function _autoInit() {
    var els = document.querySelectorAll('[d2-dock]:not([d2-dock-manual])');
    var count = 0;
    els.forEach(function (el) {
      var name = el.getAttribute('d2-dock');
      if (!name || registry['dock:' + name]) return;
      var opts = { _dockElement: el };
      _register('dock', name, new Dock(name, opts));
      count++;
    });
    if (count > 0) _log('auto-init → ' + count + ' dock(s)');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _autoInit);
  } else {
    _autoInit();
  }
})();
