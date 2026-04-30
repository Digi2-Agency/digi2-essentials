/**
 * digi2 — Lazy Loading Module
 * Loaded automatically by digi2-loader.js when d2-lazy is present.
 *
 * Lazy load images, videos, and iframes with optional blur-up placeholder.
 * Uses Intersection Observer for performance.
 *
 * Webflow setup:
 *   <img d2-lazy="real-image.jpg" src="tiny-placeholder.jpg" alt="...">
 *   <img d2-lazy="image.jpg" alt="...">
 *   <video d2-lazy="video.mp4" poster="poster.jpg"></video>
 *   <iframe d2-lazy="https://youtube.com/embed/xxx"></iframe>
 *
 *   Background images:
 *   <div d2-lazy-bg="image.jpg">...</div>
 *
 * API:
 *   digi2.lazy.init(options)
 *   digi2.lazy.refresh()               — re-scan for new elements
 *   digi2.lazy.load(element)           — manually load a specific element
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
    if (window.digi2.log) window.digi2.log('lazy', action, data);
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  var _options = {};
  var _observer = null;
  var _observed = new Set();
  var _stylesInjected = false;

  var DEFAULTS = {
    selector: '[d2-lazy], [d2-lazy-bg]',
    rootMargin: '200px 0px',       // start loading 200px before visible
    threshold: 0,
    blur: true,                     // blur-up effect on images
    blurAmount: 15,                 // px
    fadeIn: true,                   // fade in after load
    fadeDuration: 0.4,              // seconds
    loadedClass: 'd2-lazy-loaded',
    errorClass: 'd2-lazy-error',
    onLoad: null,                   // callback(element)
    onError: null,                  // callback(element)
  };

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------
  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;

    var css = ''
      + '[d2-lazy]:not(.d2-lazy-loaded){'
      +   'filter:blur(' + (_options.blurAmount || 15) + 'px);'
      +   'transition:filter ' + (_options.fadeDuration || 0.4) + 's ease, opacity ' + (_options.fadeDuration || 0.4) + 's ease;'
      + '}'
      + '[d2-lazy].d2-lazy-loaded{'
      +   'filter:blur(0);'
      + '}'
      + '[d2-lazy-bg]:not(.d2-lazy-loaded){'
      +   'opacity:0;'
      +   'transition:opacity ' + (_options.fadeDuration || 0.4) + 's ease;'
      + '}'
      + '[d2-lazy-bg].d2-lazy-loaded{'
      +   'opacity:1;'
      + '}'
    ;

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // Core
  // ---------------------------------------------------------------------------

  function loadElement(el) {
    var lazySrc = attr(el, 'd2-lazy');
    var lazyBg = attr(el, 'd2-lazy-bg');

    if (lazySrc) {
      loadMedia(el, lazySrc);
    } else if (lazyBg) {
      loadBackground(el, lazyBg);
    }
  }

  function loadMedia(el, src) {
    var tag = el.tagName.toLowerCase();

    if (tag === 'img') {
      var img = new Image();
      img.onload = function () {
        el.src = src;
        onLoaded(el);
      };
      img.onerror = function () { onError(el); };
      img.src = src;

      // Also handle srcset
      var srcset = attr(el, 'd2-lazy-srcset');
      if (srcset) {
        img.srcset = srcset;
        el.srcset = srcset;
      }

    } else if (tag === 'video') {
      el.src = src;
      el.addEventListener('loadeddata', function () { onLoaded(el); }, { once: true });
      el.addEventListener('error', function () { onError(el); }, { once: true });
      el.load();

    } else if (tag === 'iframe') {
      el.src = src;
      el.addEventListener('load', function () { onLoaded(el); }, { once: true });
      el.addEventListener('error', function () { onError(el); }, { once: true });

    } else {
      // Fallback: treat as background image
      loadBackground(el, src);
    }
  }

  function loadBackground(el, src) {
    var img = new Image();
    img.onload = function () {
      el.style.backgroundImage = 'url("' + src + '")';
      onLoaded(el);
    };
    img.onerror = function () { onError(el); };
    img.src = src;
  }

  function onLoaded(el) {
    el.classList.add(_options.loadedClass);
    el.removeAttribute('d2-lazy');
    el.removeAttribute('d2-lazy-bg');
    _log('loaded', el.src || el.style.backgroundImage);

    if (typeof _options.onLoad === 'function') {
      _options.onLoad(el);
    }
  }

  function onError(el) {
    el.classList.add(_options.errorClass);
    _log('error loading', attr(el, 'd2-lazy') || attr(el, 'd2-lazy-bg'));

    if (typeof _options.onError === 'function') {
      _options.onError(el);
    }
  }

  function setupObserver() {
    if (_observer) _observer.disconnect();

    _observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          loadElement(entry.target);
          _observer.unobserve(entry.target);
          _observed.delete(entry.target);
        }
      });
    }, {
      rootMargin: _options.rootMargin,
      threshold: _options.threshold,
    });
  }

  function scanAndObserve() {
    var elements = document.querySelectorAll(_options.selector);
    var count = 0;

    elements.forEach(function (el) {
      if (_observed.has(el)) return;
      if (el.classList.contains(_options.loadedClass)) return;

      _observer.observe(el);
      _observed.add(el);
      count++;
    });

    _log('scanned', { found: elements.length, newObserved: count });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  window.digi2.lazy = {
    init: function (options) {
      _options = Object.assign({}, DEFAULTS, options || {});

      if (_options.blur || _options.fadeIn) {
        injectStyles();
      }

      _log('init', _options);
      setupObserver();
      scanAndObserve();
    },

    refresh: function () {
      if (!_observer) return;
      scanAndObserve();
    },

    load: function (el) {
      if (el) loadElement(el);
    },
  };
})();
