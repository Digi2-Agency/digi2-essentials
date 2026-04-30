/**
 * digi2 — Scroll Module
 * Loaded automatically by digi2-loader.js when d2-scroll is present.
 *
 * Smooth scroll to anchors, scroll spy for nav highlights, scroll-to-top button.
 *
 * Webflow setup:
 *   <a d2-scroll="#features">Features</a>
 *   <a d2-scroll="#pricing">Pricing</a>
 *   <button d2-scroll-top>↑</button>
 *
 * API:
 *   digi2.scroll.init(options)
 *   digi2.scroll.to('#section')           — smooth scroll to selector
 *   digi2.scroll.to(element)              — smooth scroll to element
 *   digi2.scroll.toTop()                  — scroll to top
 *   digi2.scroll.getActive()              — current active section id
 *   digi2.scroll.refresh()                — re-scan links and sections
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
    if (window.digi2.log) window.digi2.log('scroll', action, data);
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  var _options = {};
  var _links = [];
  var _sections = [];
  var _scrollTopBtn = null;
  var _activeId = null;
  var _ticking = false;

  var DEFAULTS = {
    selector: '[d2-scroll]',
    scrollTopSelector: '[d2-scroll-top]',
    offset: 80,                       // px offset from top (for fixed headers)
    speed: 800,                       // ms scroll duration
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    activeClass: 'd2-scroll-active',
    scrollTopShow: 300,               // px from top to show scroll-to-top button
    scrollTopClass: 'd2-scroll-top-visible',
    spyThreshold: 0.3,               // how far into viewport to trigger active
    onChange: null,                    // callback(sectionId)
  };

  // ---------------------------------------------------------------------------
  // Smooth scroll implementation
  // ---------------------------------------------------------------------------
  function smoothScrollTo(targetY, duration) {
    var startY = window.scrollY;
    var diff = targetY - startY;
    var startTime = null;

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var easedProgress = easeOutCubic(progress);

      window.scrollTo(0, startY + diff * easedProgress);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  // ---------------------------------------------------------------------------
  // Core
  // ---------------------------------------------------------------------------

  function scanLinks() {
    _links = Array.from(document.querySelectorAll(_options.selector));
    _sections = [];
    var seen = {};

    _links.forEach(function (link) {
      var target = attr(link, 'd2-scroll');
      if (target && target.charAt(0) === '#' && !seen[target]) {
        var section = document.querySelector(target);
        if (section) {
          _sections.push({ id: target.slice(1), el: section });
          seen[target] = true;
        }
      }
    });

    _scrollTopBtn = document.querySelector(_options.scrollTopSelector);

    _log('scanned', { links: _links.length, sections: _sections.length, scrollTopBtn: !!_scrollTopBtn });
  }

  function attachListeners() {
    // Click handlers on scroll links
    document.addEventListener('click', function (e) {
      var link = e.target.closest(_options.selector);
      if (!link) return;

      var target = attr(link, 'd2-scroll');
      if (!target) return;

      e.preventDefault();
      scrollToTarget(target);
    });

    // Scroll-to-top button
    document.addEventListener('click', function (e) {
      var btn = e.target.closest(_options.scrollTopSelector);
      if (btn) {
        e.preventDefault();
        scrollToTop();
      }
    });

    // Scroll spy + scroll-to-top visibility
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initial check
  }

  function onScroll() {
    if (_ticking) return;
    _ticking = true;

    requestAnimationFrame(function () {
      updateSpy();
      updateScrollTopButton();
      _ticking = false;
    });
  }

  function updateSpy() {
    if (_sections.length === 0) return;

    var scrollY = window.scrollY + _options.offset + window.innerHeight * _options.spyThreshold;
    var newActive = null;

    for (var i = _sections.length - 1; i >= 0; i--) {
      var section = _sections[i];
      var top = section.el.getBoundingClientRect().top + window.scrollY;
      if (scrollY >= top) {
        newActive = section.id;
        break;
      }
    }

    if (newActive !== _activeId) {
      _activeId = newActive;

      // Update active classes on links
      _links.forEach(function (link) {
        var target = attr(link, 'd2-scroll');
        if (target === '#' + newActive) {
          link.classList.add(_options.activeClass);
        } else {
          link.classList.remove(_options.activeClass);
        }
      });

      _log('active section → ' + (_activeId || 'none'));

      if (typeof _options.onChange === 'function') {
        _options.onChange(_activeId);
      }
    }
  }

  function updateScrollTopButton() {
    if (!_scrollTopBtn) return;

    if (window.scrollY > _options.scrollTopShow) {
      _scrollTopBtn.classList.add(_options.scrollTopClass);
    } else {
      _scrollTopBtn.classList.remove(_options.scrollTopClass);
    }
  }

  function scrollToTarget(target) {
    var el;
    if (typeof target === 'string') {
      if (target.charAt(0) !== '#') target = '#' + target;
      el = document.querySelector(target);
    } else {
      el = target;
    }

    if (!el) {
      _log('target not found: ' + target);
      return;
    }

    var top = el.getBoundingClientRect().top + window.scrollY - _options.offset;
    smoothScrollTo(top, _options.speed);
    _log('scrollTo → ' + (typeof target === 'string' ? target : 'element'));
  }

  function scrollToTop() {
    smoothScrollTo(0, _options.speed);
    _log('scrollToTop');
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  window.digi2.scroll = {
    init: function (options) {
      _options = Object.assign({}, DEFAULTS, options || {});
      _log('init', _options);
      scanLinks();
      attachListeners();
    },

    to: function (target) {
      scrollToTarget(target);
    },

    toTop: function () {
      scrollToTop();
    },

    getActive: function () {
      return _activeId;
    },

    refresh: function () {
      scanLinks();
      _log('refreshed');
    },
  };
})();
