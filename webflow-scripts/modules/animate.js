/**
 * digi2 — Scroll Animations Module
 * Loaded automatically by digi2-loader.js when d2-animate is present.
 *
 * Intersection Observer wrapper. Add data-d2-animate="fade-up" to any element
 * and it animates when scrolled into view. Supports stagger for lists.
 *
 * Webflow setup:
 *   <div data-d2-animate="fade-up">Animates on scroll</div>
 *   <div data-d2-animate="zoom" data-d2-delay="200">With delay</div>
 *   <div data-d2-animate="slide-left" data-d2-duration="0.6">Custom duration</div>
 *
 *   Stagger (parent):
 *   <div data-d2-stagger="100">
 *     <div data-d2-animate="fade-up">Item 1</div>
 *     <div data-d2-animate="fade-up">Item 2</div>
 *     <div data-d2-animate="fade-up">Item 3</div>
 *   </div>
 *
 * API:
 *   digi2.animate.init(options)        — scan and observe all [data-d2-animate] elements
 *   digi2.animate.refresh()            — re-scan for new elements (after CMS load, AJAX, etc.)
 *   digi2.animate.reset()              — reset all animations (re-triggers on scroll)
 *   digi2.animate.trigger(element)     — manually trigger animation on an element
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  function _log(action, data) {
    if (window.digi2.log) window.digi2.log('animate', action, data);
  }

  // ---------------------------------------------------------------------------
  // Animation presets — initial (hidden) and final (visible) states
  // ---------------------------------------------------------------------------
  var PRESETS = {
    'fade':           { from: { opacity: '0' },                                                        to: { opacity: '1' } },
    'fade-up':        { from: { opacity: '0', transform: 'translateY(30px)' },                         to: { opacity: '1', transform: 'translateY(0)' } },
    'fade-down':      { from: { opacity: '0', transform: 'translateY(-30px)' },                        to: { opacity: '1', transform: 'translateY(0)' } },
    'fade-left':      { from: { opacity: '0', transform: 'translateX(30px)' },                         to: { opacity: '1', transform: 'translateX(0)' } },
    'fade-right':     { from: { opacity: '0', transform: 'translateX(-30px)' },                        to: { opacity: '1', transform: 'translateX(0)' } },
    'zoom':           { from: { opacity: '0', transform: 'scale(0.85)' },                              to: { opacity: '1', transform: 'scale(1)' } },
    'zoom-in':        { from: { opacity: '0', transform: 'scale(1.15)' },                              to: { opacity: '1', transform: 'scale(1)' } },
    'slide-up':       { from: { opacity: '0', transform: 'translateY(60px)' },                         to: { opacity: '1', transform: 'translateY(0)' } },
    'slide-down':     { from: { opacity: '0', transform: 'translateY(-60px)' },                        to: { opacity: '1', transform: 'translateY(0)' } },
    'slide-left':     { from: { opacity: '0', transform: 'translateX(60px)' },                         to: { opacity: '1', transform: 'translateX(0)' } },
    'slide-right':    { from: { opacity: '0', transform: 'translateX(-60px)' },                        to: { opacity: '1', transform: 'translateX(0)' } },
    'flip':           { from: { opacity: '0', transform: 'perspective(800px) rotateX(-15deg)' },       to: { opacity: '1', transform: 'perspective(800px) rotateX(0)' } },
    'flip-y':         { from: { opacity: '0', transform: 'perspective(800px) rotateY(-15deg)' },       to: { opacity: '1', transform: 'perspective(800px) rotateY(0)' } },
    'rotate':         { from: { opacity: '0', transform: 'scale(0.8) rotate(-8deg)' },                 to: { opacity: '1', transform: 'scale(1) rotate(0)' } },
    'blur':           { from: { opacity: '0', filter: 'blur(12px)' },                                  to: { opacity: '1', filter: 'blur(0)' } },
    'zoom-blur':      { from: { opacity: '0', transform: 'scale(0.85)', filter: 'blur(8px)' },        to: { opacity: '1', transform: 'scale(1)', filter: 'blur(0)' } },
    'bounce':         { from: { opacity: '0', transform: 'scale(0.4)' },                               to: { opacity: '1', transform: 'scale(1)' }, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    'elastic':        { from: { opacity: '0', transform: 'scale(0.6) translateY(20px)' },              to: { opacity: '1', transform: 'scale(1) translateY(0)' }, easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' },
    'drop':           { from: { opacity: '0', transform: 'translateY(-60px) scale(0.9)' },             to: { opacity: '1', transform: 'translateY(0) scale(1)' }, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    'swing':          { from: { opacity: '0', transform: 'perspective(600px) rotateX(-30deg)', transformOrigin: 'top center' }, to: { opacity: '1', transform: 'perspective(600px) rotateX(0)' }, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    'unfold':         { from: { opacity: '0', transform: 'scaleY(0)', transformOrigin: 'top center' }, to: { opacity: '1', transform: 'scaleY(1)' } },
    'reveal':         { from: { opacity: '0', transform: 'scaleX(0)', transformOrigin: 'left center' }, to: { opacity: '1', transform: 'scaleX(1)' } },
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  var _options = {};
  var _observer = null;
  var _observed = new Set();

  var DEFAULTS = {
    selector: '[data-d2-animate]',
    duration: 0.5,                    // seconds
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    threshold: 0.15,                  // 0-1, how much element must be visible
    rootMargin: '0px 0px -50px 0px',  // trigger slightly before fully in view
    once: true,                       // animate only once (true) or every time (false)
    disabled: false,                  // disable all animations (accessibility)
  };

  // ---------------------------------------------------------------------------
  // Core
  // ---------------------------------------------------------------------------

  function applyFrom(el, preset) {
    for (var key in preset.from) {
      if (preset.from.hasOwnProperty(key)) el.style[key] = preset.from[key];
    }
  }

  function applyTo(el, preset, duration, delay, easing) {
    // Build transition string from all properties in 'to'
    var props = Object.keys(preset.to);
    // Add filter if present in from
    if (preset.from.filter && props.indexOf('filter') === -1) props.push('filter');

    var transitionStr = props.map(function (p) {
      return p + ' ' + duration + 's ' + easing + ' ' + delay + 's';
    }).join(', ');

    el.style.transition = transitionStr;

    for (var key in preset.to) {
      if (preset.to.hasOwnProperty(key)) el.style[key] = preset.to[key];
    }
    // Also clear filter if going to blur(0)
    if (preset.to.filter) el.style.filter = preset.to.filter;
  }

  function animateElement(el) {
    var animName = el.getAttribute('data-d2-animate');
    var preset = PRESETS[animName];
    if (!preset) {
      _log('unknown animation: ' + animName);
      return;
    }

    var duration = parseFloat(el.getAttribute('data-d2-duration')) || _options.duration;
    var delay = parseFloat(el.getAttribute('data-d2-delay') || '0') / 1000; // ms to s
    var easing = preset.easing || _options.easing;

    // Calculate stagger delay from parent
    var staggerParent = el.closest('[data-d2-stagger]');
    if (staggerParent) {
      var staggerMs = parseInt(staggerParent.getAttribute('data-d2-stagger'), 10) || 100;
      var siblings = Array.from(staggerParent.querySelectorAll('[data-d2-animate]'));
      var idx = siblings.indexOf(el);
      if (idx > 0) delay += (idx * staggerMs) / 1000;
    }

    _log('animate → ' + animName, { delay: delay + 's', duration: duration + 's' });

    applyTo(el, preset, duration, delay, easing);
    el.setAttribute('data-d2-animated', 'true');
  }

  function resetElement(el) {
    var animName = el.getAttribute('data-d2-animate');
    var preset = PRESETS[animName];
    if (!preset) return;

    el.style.transition = 'none';
    applyFrom(el, preset);
    el.removeAttribute('data-d2-animated');
  }

  function setupObserver() {
    if (_observer) _observer.disconnect();

    _observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateElement(entry.target);
          if (_options.once) {
            _observer.unobserve(entry.target);
            _observed.delete(entry.target);
          }
        } else if (!_options.once) {
          resetElement(entry.target);
        }
      });
    }, {
      threshold: _options.threshold,
      rootMargin: _options.rootMargin,
    });
  }

  function scanAndObserve() {
    var elements = document.querySelectorAll(_options.selector);
    var count = 0;

    elements.forEach(function (el) {
      if (_observed.has(el)) return; // already being watched
      if (el.getAttribute('data-d2-animated') === 'true' && _options.once) return;

      var animName = el.getAttribute('data-d2-animate');
      var preset = PRESETS[animName];
      if (!preset) return;

      // Set initial (hidden) state
      applyFrom(el, preset);
      // Set transformOrigin if preset requires it
      if (preset.from.transformOrigin) el.style.transformOrigin = preset.from.transformOrigin;

      _observer.observe(el);
      _observed.add(el);
      count++;
    });

    _log('scanned', { found: elements.length, newObserved: count, total: _observed.size });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  window.digi2.animate = {
    /**
     * Initialize scroll animations. Call once after DOM is ready.
     * @param {object} options
     */
    init: function (options) {
      _options = Object.assign({}, DEFAULTS, options || {});

      if (_options.disabled) {
        _log('disabled — skipping init');
        return;
      }

      // Respect prefers-reduced-motion
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        _log('prefers-reduced-motion detected — disabling');
        return;
      }

      _log('init', _options);
      setupObserver();
      scanAndObserve();
    },

    /**
     * Re-scan the DOM for new [data-d2-animate] elements.
     * Call after dynamically adding content (CMS, AJAX, etc.).
     */
    refresh: function () {
      if (!_observer) return;
      scanAndObserve();
    },

    /**
     * Reset all animations — elements return to hidden state and re-trigger on scroll.
     */
    reset: function () {
      _observed.forEach(function (el) {
        _observer.unobserve(el);
        resetElement(el);
      });
      _observed.clear();
      scanAndObserve();
      _log('reset');
    },

    /**
     * Manually trigger animation on a specific element.
     * @param {Element} el
     */
    trigger: function (el) {
      if (el) animateElement(el);
    },

    /**
     * Get all available animation preset names.
     * @returns {string[]}
     */
    presets: function () {
      return Object.keys(PRESETS);
    },
  };
})();
