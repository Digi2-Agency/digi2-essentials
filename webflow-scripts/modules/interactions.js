/**
 * digi2 — Interactions Module
 * Loaded automatically by digi2-loader.js when d2-interactions is present.
 *
 * Declarative show/hide interactions with animations, plus a JS API.
 *
 * ─── Concepts ────────────────────────────────────────────────────────────────
 *
 *   d2-instance="ns:foo"            Addressable name for any element.
 *                                    Triggers reference targets by instance ID.
 *
 *   d2-interaction-trigger="hover"  Marks the element as a trigger.
 *                                    Values: hover | click | focus | mouseenter
 *                                            mouseleave | manual
 *
 *   d2-interaction-target="ns:foo"  Instance ID of the element to show/hide.
 *
 *   d2-animation="fade"             none | fade | slide | zoom | flip
 *   d2-animation-direction="up"     up | down | left | right (slide / flip)
 *   d2-animation-duration="0.3"     seconds
 *   d2-animation-easing="ease-out"  CSS easing
 *   d2-animation-distance="12px"    slide offset
 *
 *   d2-interaction-group="dock"     Mutually-exclusive group: showing one
 *                                    target in this group hides the others.
 *
 *   d2-interaction-delay="200"      ms — show after delay
 *   d2-interaction-leave-delay="80" ms — hide after delay (default 80 for hover)
 *   d2-interaction-initial="visible"  start visible (default: hidden)
 *   d2-interaction-close="ns:foo"   Click this element to hide instance "ns:foo"
 *   d2-interaction-outside-close    On click triggers — outside click closes
 *   d2-interaction-escape-close     Esc key closes
 *
 *   Animation/group attributes can be on the trigger OR target.
 *   Target wins when both are present.
 *
 * ─── Floating dock with tooltips ─────────────────────────────────────────────
 *
 *   <div class="dock">
 *     <button d2-instance="dock:btn:home"
 *             d2-interaction-trigger="hover"
 *             d2-interaction-target="dock:tip:home">Home</button>
 *     <button d2-instance="dock:btn:about"
 *             d2-interaction-trigger="hover"
 *             d2-interaction-target="dock:tip:about">About</button>
 *   </div>
 *
 *   <div d2-instance="dock:tip:home"
 *        d2-animation="slide" d2-animation-direction="up"
 *        d2-interaction-group="dock-tooltips">Home page</div>
 *   <div d2-instance="dock:tip:about"
 *        d2-animation="slide" d2-animation-direction="up"
 *        d2-interaction-group="dock-tooltips">About us</div>
 *
 * ─── JS API ──────────────────────────────────────────────────────────────────
 *
 *   digi2.interactions.create('name', { trigger, target, on, animation, ... })
 *   digi2.interactions.show('name')       digi2.interactions.hide('name')
 *   digi2.interactions.toggle('name')     digi2.interactions.get('name')
 *   digi2.interactions.destroy('name')    digi2.interactions.list()
 *   digi2.interactions.showInstance('dock:tip:home')
 *   digi2.interactions.hideInstance('dock:tip:home')
 *   digi2.interactions.refresh()           — re-scan DOM (for late content)
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  function _log(action, data) {
    if (window.digi2.log) window.digi2.log('interactions', action, data);
  }

  // ---------------------------------------------------------------------------
  // Defaults
  // ---------------------------------------------------------------------------
  var DEFAULTS = {
    on: 'hover',
    animation: 'fade',
    direction: 'up',
    duration: 0.3,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    distance: '12px',
    enterDelay: 0,
    leaveDelay: 80,
    group: null,
    bridgedHover: true,        // hover stays open while cursor is over target
    closeOnOutsideClick: true, // click triggers — outside click hides target
    closeOnEscape: false,
    initial: 'hidden',
    onShow: null,
    onHide: null,
  };

  // ---------------------------------------------------------------------------
  // Registries
  // ---------------------------------------------------------------------------
  var INSTANCE_REGISTRY = new Map();   // instance ID  → element
  var GROUP_VISIBLE = new Map();       // group name   → Set of visible target els
  var TARGET_INTERACTIONS = new WeakMap(); // target el → Set of Interaction

  function rebuildInstanceRegistry() {
    INSTANCE_REGISTRY.clear();
    var els = document.querySelectorAll('[d2-instance]');
    for (var i = 0; i < els.length; i++) {
      INSTANCE_REGISTRY.set(els[i].getAttribute('d2-instance'), els[i]);
    }
    _log('instance registry → ' + INSTANCE_REGISTRY.size);
  }

  function getInstanceElement(id) {
    if (!id) return null;
    if (INSTANCE_REGISTRY.has(id)) {
      var cached = INSTANCE_REGISTRY.get(id);
      if (cached && cached.isConnected) return cached;
      INSTANCE_REGISTRY.delete(id);
    }
    var el = null;
    try {
      el = document.querySelector('[d2-instance="' + id.replace(/"/g, '\\"') + '"]');
    } catch (_e) { /* invalid selector */ }
    if (el) INSTANCE_REGISTRY.set(id, el);
    return el;
  }

  // ---------------------------------------------------------------------------
  // Animation engine — uses standalone translate/scale/rotate properties so
  // user CSS that sets `transform` (e.g. for centering) keeps working.
  // ---------------------------------------------------------------------------
  function directionalTranslate(dir, distance) {
    var d = distance || '12px';
    switch (dir) {
      case 'down':  return '0 -' + d;
      case 'left':  return d + ' 0';
      case 'right': return '-' + d + ' 0';
      case 'up':
      default:      return '0 ' + d;
    }
  }

  function buildHiddenStyles(opts) {
    if (opts.animation === 'none') {
      return { display: 'none' };
    }
    var base = { opacity: '0', visibility: 'hidden', pointerEvents: 'none' };
    switch (opts.animation) {
      case 'slide':
        base.translate = directionalTranslate(opts.direction, opts.distance);
        break;
      case 'zoom':
        base.scale = '0.92';
        break;
      case 'flip':
        base.rotate = (opts.direction === 'left' || opts.direction === 'right')
          ? 'y -15deg'
          : 'x -15deg';
        break;
      // 'fade' → opacity only
    }
    return base;
  }

  function buildVisibleStyles(opts) {
    if (opts.animation === 'none') {
      return { display: '' };
    }
    return {
      opacity: '1',
      visibility: 'visible',
      pointerEvents: 'auto',
      translate: '',
      scale: '',
      rotate: '',
    };
  }

  function buildTransition(opts, isShowing) {
    if (opts.animation === 'none') return '';
    var d = opts.duration + 's';
    var e = opts.easing;
    var parts = ['opacity ' + d + ' ' + e, 'translate ' + d + ' ' + e,
                 'scale ' + d + ' ' + e, 'rotate ' + d + ' ' + e];
    // visibility snaps; delay it when hiding so element stays visible during fade-out
    parts.push('visibility 0s ' + (isShowing ? '0s' : d));
    return parts.join(', ');
  }

  function applyStyles(el, styles) {
    for (var k in styles) {
      if (styles.hasOwnProperty(k)) el.style[k] = styles[k];
    }
  }

  function setTargetVisible(targetEl, opts) {
    targetEl.style.transition = buildTransition(opts, true);
    void targetEl.offsetHeight;  // flush so transition picks up
    applyStyles(targetEl, buildVisibleStyles(opts));
    targetEl.setAttribute('data-d2-visible', 'true');
  }

  function setTargetHidden(targetEl, opts) {
    targetEl.style.transition = buildTransition(opts, false);
    applyStyles(targetEl, buildHiddenStyles(opts));
    targetEl.setAttribute('data-d2-visible', 'false');
  }

  // ---------------------------------------------------------------------------
  // Group exclusivity
  // ---------------------------------------------------------------------------
  function hideOthersInGroup(groupName, exceptTargetEl) {
    if (!groupName) return;
    var visible = GROUP_VISIBLE.get(groupName);
    if (!visible || visible.size === 0) return;
    visible.forEach(function (targetEl) {
      if (targetEl === exceptTargetEl) return;
      var set = TARGET_INTERACTIONS.get(targetEl);
      if (!set) return;
      set.forEach(function (i) { i._silentHide(); });
    });
  }

  // ---------------------------------------------------------------------------
  // Element resolver — accepts instance ID, CSS selector, or Element
  // ---------------------------------------------------------------------------
  function resolveElement(input) {
    if (!input) return null;
    if (input instanceof Element) return input;
    if (typeof input !== 'string') return null;
    // Instance ID first
    var byInstance = getInstanceElement(input);
    if (byInstance) return byInstance;
    // Fall back to CSS selector
    try { return document.querySelector(input); } catch (_e) { return null; }
  }

  // ---------------------------------------------------------------------------
  // Interaction class
  // ---------------------------------------------------------------------------
  class Interaction {
    constructor(name, options) {
      this.name = name;
      this.options = Object.assign({}, DEFAULTS, options || {});

      this.trigger = resolveElement(this.options.trigger);
      this.target = resolveElement(this.options.target);

      if (!this.target) {
        console.warn('[digi2.interactions] "' + name + '" — target not found:', this.options.target);
        return;
      }

      if (!TARGET_INTERACTIONS.has(this.target)) {
        TARGET_INTERACTIONS.set(this.target, new Set());
      }
      TARGET_INTERACTIONS.get(this.target).add(this);

      this._visible = false;
      this._enterTimer = null;
      this._leaveTimer = null;
      this._listeners = [];

      this._applyInitial();
      this._bind();

      _log('create → ' + name, {
        on: this.options.on,
        animation: this.options.animation,
        direction: this.options.direction,
        group: this.options.group,
      });
    }

    _applyInitial() {
      // Skip if another Interaction already set initial state on this target
      if (this.target.hasAttribute('data-d2-visible')) {
        this._visible = this.target.getAttribute('data-d2-visible') === 'true';
        if (this._visible) this._registerVisible();
        return;
      }
      var prev = this.target.style.transition;
      this.target.style.transition = 'none';
      if (this.options.initial === 'visible') {
        applyStyles(this.target, buildVisibleStyles(this.options));
        this.target.setAttribute('data-d2-visible', 'true');
        this._visible = true;
        this._registerVisible();
      } else {
        applyStyles(this.target, buildHiddenStyles(this.options));
        this.target.setAttribute('data-d2-visible', 'false');
        this._visible = false;
      }
      void this.target.offsetHeight;
      this.target.style.transition = prev;
    }

    _bind() {
      var self = this;
      var on = this.options.on;

      if (!this.trigger) {
        if (on !== 'manual') {
          console.warn('[digi2.interactions] "' + this.name + '" — trigger not found.');
        }
        return;
      }

      switch (on) {
        case 'hover':
          this._listen(this.trigger, 'mouseenter', function () { self._scheduleShow(); });
          this._listen(this.trigger, 'mouseleave', function () { self._scheduleHide(); });
          if (this.options.bridgedHover) {
            this._listen(this.target, 'mouseenter', function () { self._cancelHide(); });
            this._listen(this.target, 'mouseleave', function () { self._scheduleHide(); });
          }
          break;
        case 'click':
          this._listen(this.trigger, 'click', function (e) {
            e.preventDefault();
            self.toggle();
          });
          if (this.options.closeOnOutsideClick) {
            this._listen(document, 'click', function (e) {
              if (!self._visible) return;
              if (self.target.contains(e.target)) return;
              if (self.trigger && self.trigger.contains(e.target)) return;
              self.hide();
            });
          }
          break;
        case 'focus':
          this._listen(this.trigger, 'focus', function () { self._scheduleShow(); });
          this._listen(this.trigger, 'blur', function () { self._scheduleHide(); });
          break;
        case 'mouseenter':
          this._listen(this.trigger, 'mouseenter', function () { self._scheduleShow(); });
          break;
        case 'mouseleave':
          this._listen(this.trigger, 'mouseleave', function () { self._scheduleShow(); });
          break;
        case 'manual':
          break;
        default:
          console.warn('[digi2.interactions] unknown trigger: ' + on);
      }

      if (this.options.closeOnEscape) {
        this._listen(document, 'keydown', function (e) {
          if (e.key === 'Escape' && self._visible) self.hide();
        });
      }
    }

    _listen(el, type, fn) {
      el.addEventListener(type, fn);
      this._listeners.push({ el: el, type: type, fn: fn });
    }

    _scheduleShow() {
      this._cancelHide();
      var self = this;
      if (this.options.enterDelay > 0) {
        this._enterTimer = setTimeout(function () { self.show(); }, this.options.enterDelay);
      } else {
        this.show();
      }
    }

    _scheduleHide() {
      this._cancelShow();
      var self = this;
      if (this.options.leaveDelay > 0) {
        this._leaveTimer = setTimeout(function () { self.hide(); }, this.options.leaveDelay);
      } else {
        this.hide();
      }
    }

    _cancelShow() {
      if (this._enterTimer) { clearTimeout(this._enterTimer); this._enterTimer = null; }
    }
    _cancelHide() {
      if (this._leaveTimer) { clearTimeout(this._leaveTimer); this._leaveTimer = null; }
    }

    show() {
      this._cancelShow();
      if (this._visible) return;
      hideOthersInGroup(this.options.group, this.target);
      setTargetVisible(this.target, this.options);
      this._visible = true;
      this._registerVisible();
      _log('show → ' + this.name);
      if (typeof this.options.onShow === 'function') {
        this.options.onShow(this.target, this);
      }
    }

    hide() {
      this._cancelHide();
      if (!this._visible) return;
      setTargetHidden(this.target, this.options);
      this._visible = false;
      this._unregisterVisible();
      _log('hide → ' + this.name);
      if (typeof this.options.onHide === 'function') {
        this.options.onHide(this.target, this);
      }
    }

    // Used by group exclusivity — same as hide() but no recursion concerns.
    _silentHide() { this.hide(); }

    toggle() { this._visible ? this.hide() : this.show(); }

    isVisible() { return !!this._visible; }

    _registerVisible() {
      if (!this.options.group) return;
      if (!GROUP_VISIBLE.has(this.options.group)) {
        GROUP_VISIBLE.set(this.options.group, new Set());
      }
      GROUP_VISIBLE.get(this.options.group).add(this.target);
    }

    _unregisterVisible() {
      if (!this.options.group) return;
      var set = GROUP_VISIBLE.get(this.options.group);
      if (set) set.delete(this.target);
    }

    destroy() {
      this._cancelShow();
      this._cancelHide();
      this._listeners.forEach(function (l) {
        l.el.removeEventListener(l.type, l.fn);
      });
      this._listeners = [];
      var set = TARGET_INTERACTIONS.get(this.target);
      if (set) set.delete(this);
      this._unregisterVisible();
    }
  }

  // ---------------------------------------------------------------------------
  // FOUC preloader — inject CSS that hides target instances before module
  // ready. Only hides instances that are referenced by some trigger.
  // ---------------------------------------------------------------------------
  function injectPreloadCSS() {
    var ids = new Set();
    document.querySelectorAll('[d2-interaction-target]').forEach(function (el) {
      ids.add(el.getAttribute('d2-interaction-target'));
    });
    if (ids.size === 0) return;
    var sels = [];
    ids.forEach(function (id) {
      sels.push('[d2-instance="' + id.replace(/"/g, '\\"') + '"]:not([data-d2-visible])');
    });
    var css = sels.join(',') + '{opacity:0!important;visibility:hidden!important;pointer-events:none!important}';
    var style = document.createElement('style');
    style.setAttribute('data-d2-interactions', '');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // Auto-init from DOM attributes
  // ---------------------------------------------------------------------------
  var registry = {};
  var nameCounter = 0;

  function attr(el, name) { return el ? el.getAttribute(name) : null; }

  function autoInit() {
    rebuildInstanceRegistry();
    injectPreloadCSS();

    var triggers = document.querySelectorAll('[d2-interaction-trigger]');
    var created = 0;

    triggers.forEach(function (triggerEl) {
      if (triggerEl._d2Interaction) return;

      var on = triggerEl.getAttribute('d2-interaction-trigger') || 'hover';
      var targetId = triggerEl.getAttribute('d2-interaction-target');
      if (!targetId) {
        _log('trigger has no d2-interaction-target', triggerEl);
        return;
      }
      var targetEl = getInstanceElement(targetId);
      if (!targetEl) {
        _log('target not found → ' + targetId);
        return;
      }

      // Target attrs win over trigger attrs
      var animation = attr(targetEl, 'd2-animation') || attr(triggerEl, 'd2-animation') || DEFAULTS.animation;
      var direction = attr(targetEl, 'd2-animation-direction') || attr(triggerEl, 'd2-animation-direction') || DEFAULTS.direction;
      var duration = parseFloat(attr(targetEl, 'd2-animation-duration') || attr(triggerEl, 'd2-animation-duration')) || DEFAULTS.duration;
      var easing = attr(targetEl, 'd2-animation-easing') || attr(triggerEl, 'd2-animation-easing') || DEFAULTS.easing;
      var distance = attr(targetEl, 'd2-animation-distance') || attr(triggerEl, 'd2-animation-distance') || DEFAULTS.distance;
      var group = attr(targetEl, 'd2-interaction-group') || attr(triggerEl, 'd2-interaction-group') || null;
      var initial = attr(targetEl, 'd2-interaction-initial') || DEFAULTS.initial;

      var enterDelay = parseInt(attr(triggerEl, 'd2-interaction-delay'), 10);
      if (isNaN(enterDelay)) enterDelay = DEFAULTS.enterDelay;
      var leaveDelay = parseInt(attr(triggerEl, 'd2-interaction-leave-delay'), 10);
      if (isNaN(leaveDelay)) leaveDelay = (on === 'hover') ? DEFAULTS.leaveDelay : 0;

      var closeOnOutsideClick = triggerEl.hasAttribute('d2-interaction-outside-close')
        ? true
        : (on === 'click' ? DEFAULTS.closeOnOutsideClick : false);
      var closeOnEscape = triggerEl.hasAttribute('d2-interaction-escape-close');

      var triggerInstance = attr(triggerEl, 'd2-instance');
      var name = (triggerInstance || 'auto-' + (++nameCounter)) + '→' + targetId;
      while (registry[name]) name = name + '#' + (++nameCounter);

      var interaction = new Interaction(name, {
        trigger: triggerEl,
        target: targetEl,
        on: on,
        animation: animation,
        direction: direction,
        duration: duration,
        easing: easing,
        distance: distance,
        group: group,
        initial: initial,
        enterDelay: enterDelay,
        leaveDelay: leaveDelay,
        closeOnOutsideClick: closeOnOutsideClick,
        closeOnEscape: closeOnEscape,
      });

      triggerEl._d2Interaction = interaction;
      registry[name] = interaction;
      created++;
    });

    // [d2-interaction-close="instanceId"] — click to close that target
    var closers = document.querySelectorAll('[d2-interaction-close]');
    closers.forEach(function (closer) {
      if (closer._d2Closer) return;
      var targetId = closer.getAttribute('d2-interaction-close');
      var fn = function (e) {
        e.preventDefault();
        api.hideInstance(targetId);
      };
      closer.addEventListener('click', fn);
      closer._d2Closer = fn;
    });

    _log('autoInit → ' + created + ' interactions');
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  var api = {
    create: function (name, options) {
      if (registry[name]) {
        console.warn('[digi2.interactions] "' + name + '" already exists.');
        return registry[name];
      }
      var i = new Interaction(name, options);
      registry[name] = i;
      return i;
    },

    get: function (name) { return registry[name]; },
    list: function () { return Object.keys(registry); },

    show: function (name) { var i = registry[name]; if (i) i.show(); },
    hide: function (name) { var i = registry[name]; if (i) i.hide(); },
    toggle: function (name) { var i = registry[name]; if (i) i.toggle(); },

    showInstance: function (instanceId) {
      var el = getInstanceElement(instanceId);
      if (!el) return;
      var set = TARGET_INTERACTIONS.get(el);
      if (set && set.size > 0) {
        set.values().next().value.show();
      }
    },

    hideInstance: function (instanceId) {
      var el = getInstanceElement(instanceId);
      if (!el) return;
      var set = TARGET_INTERACTIONS.get(el);
      if (set) set.forEach(function (i) { i.hide(); });
    },

    toggleInstance: function (instanceId) {
      var el = getInstanceElement(instanceId);
      if (!el) return;
      var set = TARGET_INTERACTIONS.get(el);
      if (set && set.size > 0) {
        set.values().next().value.toggle();
      }
    },

    destroy: function (name) {
      var i = registry[name];
      if (!i) return;
      i.destroy();
      delete registry[name];
    },

    refresh: autoInit,

    // Lower-level utility — useful for custom integrations.
    Interaction: Interaction,
  };

  window.digi2.interactions = api;

  // Run early for FOUC prevention; re-run on DOM ready to catch late content.
  if (document.readyState === 'loading') {
    injectPreloadCSS();  // run preload now if possible
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
