/**
 * digi2 — Sliders Module
 * Loaded automatically by digi2-loader.js when d2-sliders is present.
 *
 * Lightweight carousel with native touch/drag, autoplay, loop, dots, arrows.
 * Supports horizontal and vertical directions.
 *
 * Webflow setup:
 *   <div data-d2-slider="hero">
 *     <div data-d2-slider-track>
 *       <div data-d2-slide>Slide 1</div>
 *       <div data-d2-slide>Slide 2</div>
 *       <div data-d2-slide>Slide 3</div>
 *     </div>
 *     <button data-d2-slider-prev>←</button>
 *     <button data-d2-slider-next>→</button>
 *     <div data-d2-slider-dots></div>
 *   </div>
 *
 * API:
 *   digi2.sliders.create('hero', options)
 *   digi2.sliders.get('hero')
 *   digi2.sliders.destroy('hero')
 *   digi2.sliders.list()
 *
 * Instance:
 *   instance.next()
 *   instance.prev()
 *   instance.goTo(index)
 *   instance.addSlide(htmlOrElement, index?)
 *   instance.removeSlide(index)
 *   instance.getActive()
 *   instance.getCount()
 *   instance.play()
 *   instance.pause()
 *   instance.destroy()
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  function _log(action, data) {
    if (window.digi2.log) window.digi2.log('sliders', action, data);
  }

  // ---------------------------------------------------------------------------
  // SliderManager (internal)
  // ---------------------------------------------------------------------------
  class SliderManager {
    constructor(name, options = {}) {
      this.name = name;

      this.options = {
        containerSelector: null,       // CSS selector override
        direction: 'horizontal',       // 'horizontal' | 'vertical'
        slidesPerView: 1,
        gap: 0,                        // px between slides
        loop: false,
        autoplay: false,               // false or ms (e.g. 3000)
        pauseOnHover: true,
        speed: 400,                    // transition speed in ms
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        startIndex: 0,
        draggable: true,
        dragThreshold: 40,             // px to trigger slide change
        activeClass: 'd2-slide-active',
        dotActiveClass: 'd2-dot-active',
        onChange: null,                // callback(index, instance)
        ...options,
      };

      this.containerEl = null;
      this.trackEl = null;
      this.slides = [];
      this.prevBtn = null;
      this.nextBtn = null;
      this.dotsContainer = null;
      this.dots = [];

      this._currentIndex = this.options.startIndex;
      this._autoplayTimer = null;
      this._isDragging = false;
      this._startPos = 0;
      this._currentTranslate = 0;
      this._prevTranslate = 0;

      this._init();
    }

    // ---- Lifecycle ----------------------------------------------------------

    _init() {
      this.containerEl = this._findContainer();

      if (!this.containerEl) {
        console.warn('[digi2.sliders] "' + this.name + '" — container not found.');
        return;
      }

      this.trackEl = this.containerEl.querySelector('[data-d2-slider-track]');
      if (!this.trackEl) {
        // If no explicit track, use direct children
        this.trackEl = this.containerEl;
      }

      this.slides = Array.from(this.trackEl.querySelectorAll('[data-d2-slide]'));
      this.prevBtn = this.containerEl.querySelector('[data-d2-slider-prev]');
      this.nextBtn = this.containerEl.querySelector('[data-d2-slider-next]');
      this.dotsContainer = this.containerEl.querySelector('[data-d2-slider-dots]');

      if (this.slides.length === 0) {
        console.warn('[digi2.sliders] "' + this.name + '" — no slides found.');
        return;
      }

      _log('init → ' + this.name, {
        slides: this.slides.length,
        direction: this.options.direction,
        draggable: this.options.draggable,
      });

      this._setupStyles();
      this._buildDots();
      this._attachListeners();
      this.goTo(this._currentIndex, false);

      if (this.options.autoplay) {
        this.play();
      }
    }

    destroy() {
      this.pause();
      this.containerEl = null;
      this.trackEl = null;
      this.slides = [];
      _log('destroy → ' + this.name);
    }

    // ---- Find container -----------------------------------------------------

    _findContainer() {
      if (this.options.containerSelector) {
        return document.querySelector(this.options.containerSelector);
      }
      return document.querySelector('[data-d2-slider="' + this.name + '"]');
    }

    // ---- Setup --------------------------------------------------------------

    _setupStyles() {
      var isH = this.options.direction === 'horizontal';
      var gap = this.options.gap;

      // Container
      this.containerEl.style.overflow = 'hidden';
      this.containerEl.style.position = 'relative';

      // Track
      this.trackEl.style.display = 'flex';
      this.trackEl.style.flexDirection = isH ? 'row' : 'column';
      this.trackEl.style.gap = gap + 'px';
      this.trackEl.style.transition = 'transform ' + this.options.speed + 'ms ' + this.options.easing;
      this.trackEl.style.willChange = 'transform';

      // Slides
      var perView = this.options.slidesPerView;
      var totalGap = gap * (perView - 1);
      var self = this;

      this.slides.forEach(function (slide) {
        if (isH) {
          slide.style.minWidth = 'calc((100% - ' + totalGap + 'px) / ' + perView + ')';
          slide.style.maxWidth = 'calc((100% - ' + totalGap + 'px) / ' + perView + ')';
        } else {
          slide.style.minHeight = 'calc((100% - ' + totalGap + 'px) / ' + perView + ')';
        }
        slide.style.flexShrink = '0';
      });
    }

    _buildDots() {
      if (!this.dotsContainer) return;

      this.dotsContainer.innerHTML = '';
      this.dots = [];
      var count = this._getMaxIndex() + 1;
      var self = this;

      for (var i = 0; i < count; i++) {
        var dot = document.createElement('button');
        dot.setAttribute('data-d2-dot', i);
        dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        (function (idx) {
          dot.addEventListener('click', function () { self.goTo(idx); });
        })(i);
        this.dotsContainer.appendChild(dot);
        this.dots.push(dot);
      }
    }

    // ---- Listeners ----------------------------------------------------------

    _attachListeners() {
      var self = this;

      // Arrows
      if (this.prevBtn) {
        this.prevBtn.addEventListener('click', function () { self.prev(); });
      }
      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', function () { self.next(); });
      }

      // Pause on hover
      if (this.options.autoplay && this.options.pauseOnHover) {
        this.containerEl.addEventListener('mouseenter', function () { self.pause(); });
        this.containerEl.addEventListener('mouseleave', function () { self.play(); });
      }

      // Touch / drag
      if (this.options.draggable) {
        this._setupDrag();
      }

      // Keyboard
      this.containerEl.setAttribute('tabindex', '0');
      this.containerEl.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); self.next(); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); self.prev(); }
      });
    }

    _setupDrag() {
      var self = this;
      var isH = this.options.direction === 'horizontal';

      function getPos(e) {
        return e.type.includes('mouse')
          ? (isH ? e.clientX : e.clientY)
          : (isH ? e.touches[0].clientX : e.touches[0].clientY);
      }

      function onStart(e) {
        self._isDragging = true;
        self._startPos = getPos(e);
        self._prevTranslate = self._currentTranslate;
        self.trackEl.style.transition = 'none';
        self.containerEl.style.cursor = 'grabbing';
      }

      function onMove(e) {
        if (!self._isDragging) return;
        var current = getPos(e);
        var diff = current - self._startPos;
        self._currentTranslate = self._prevTranslate + diff;
        self._setTranslate(self._currentTranslate);
      }

      function onEnd(e) {
        if (!self._isDragging) return;
        self._isDragging = false;
        self.containerEl.style.cursor = '';
        self.trackEl.style.transition = 'transform ' + self.options.speed + 'ms ' + self.options.easing;

        var diff = self._currentTranslate - self._prevTranslate;
        if (Math.abs(diff) > self.options.dragThreshold) {
          if (diff < 0) { self.next(); }
          else { self.prev(); }
        } else {
          self.goTo(self._currentIndex, true);
        }
      }

      // Mouse
      this.trackEl.addEventListener('mousedown', onStart);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);

      // Touch
      this.trackEl.addEventListener('touchstart', onStart, { passive: true });
      window.addEventListener('touchmove', onMove, { passive: true });
      window.addEventListener('touchend', onEnd);

      // Prevent image drag
      this.trackEl.addEventListener('dragstart', function (e) { e.preventDefault(); });
    }

    // ---- Translation --------------------------------------------------------

    _getSlideSize() {
      if (this.slides.length === 0) return 0;
      var isH = this.options.direction === 'horizontal';
      var slide = this.slides[0];
      var rect = slide.getBoundingClientRect();
      return (isH ? rect.width : rect.height) + this.options.gap;
    }

    _getMaxIndex() {
      return Math.max(0, this.slides.length - this.options.slidesPerView);
    }

    _setTranslate(px) {
      var isH = this.options.direction === 'horizontal';
      this.trackEl.style.transform = isH
        ? 'translateX(' + px + 'px)'
        : 'translateY(' + px + 'px)';
    }

    _slideTo(index, animate) {
      if (animate === undefined) animate = true;

      if (!animate) {
        this.trackEl.style.transition = 'none';
      }

      var size = this._getSlideSize();
      this._currentTranslate = -index * size;
      this._setTranslate(this._currentTranslate);

      if (!animate) {
        void this.trackEl.offsetHeight; // reflow
        this.trackEl.style.transition = 'transform ' + this.options.speed + 'ms ' + this.options.easing;
      }
    }

    // ---- Public API ---------------------------------------------------------

    next() {
      var maxIndex = this._getMaxIndex();
      var newIndex = this._currentIndex + 1;

      if (newIndex > maxIndex) {
        if (this.options.loop) { newIndex = 0; }
        else { return; }
      }

      this.goTo(newIndex);
    }

    prev() {
      var maxIndex = this._getMaxIndex();
      var newIndex = this._currentIndex - 1;

      if (newIndex < 0) {
        if (this.options.loop) { newIndex = maxIndex; }
        else { return; }
      }

      this.goTo(newIndex);
    }

    goTo(index, animate) {
      var maxIndex = this._getMaxIndex();
      index = Math.max(0, Math.min(index, maxIndex));
      this._currentIndex = index;

      _log('goTo → ' + index);

      this._slideTo(index, animate);
      this._updateState();

      if (typeof this.options.onChange === 'function') {
        this.options.onChange(index, this);
      }
    }

    addSlide(content, index) {
      var slide = typeof content === 'string'
        ? (function () { var d = document.createElement('div'); d.setAttribute('data-d2-slide', ''); d.innerHTML = content; return d; })()
        : content;

      if (index !== undefined && index < this.slides.length) {
        this.trackEl.insertBefore(slide, this.slides[index]);
      } else {
        this.trackEl.appendChild(slide);
      }

      this.slides = Array.from(this.trackEl.querySelectorAll('[data-d2-slide]'));
      this._setupStyles();
      this._buildDots();
      this._updateState();
      _log('addSlide', { index: index, total: this.slides.length });
    }

    removeSlide(index) {
      if (index < 0 || index >= this.slides.length) return;

      this.trackEl.removeChild(this.slides[index]);
      this.slides = Array.from(this.trackEl.querySelectorAll('[data-d2-slide]'));

      if (this._currentIndex >= this.slides.length) {
        this._currentIndex = Math.max(0, this.slides.length - 1);
      }

      this._setupStyles();
      this._buildDots();
      this.goTo(this._currentIndex, false);
      _log('removeSlide', { index: index, total: this.slides.length });
    }

    getActive() {
      return this._currentIndex;
    }

    getCount() {
      return this.slides.length;
    }

    play() {
      if (this._autoplayTimer) return;
      var self = this;
      var interval = typeof this.options.autoplay === 'number' ? this.options.autoplay : 3000;
      this._autoplayTimer = setInterval(function () { self.next(); }, interval);
      _log('autoplay started', { interval: interval });
    }

    pause() {
      if (this._autoplayTimer) {
        clearInterval(this._autoplayTimer);
        this._autoplayTimer = null;
        _log('autoplay paused');
      }
    }

    // ---- State update -------------------------------------------------------

    _updateState() {
      var self = this;
      var activeClass = this.options.activeClass;
      var dotActiveClass = this.options.dotActiveClass;
      var perView = this.options.slidesPerView;

      // Active slides
      this.slides.forEach(function (slide, i) {
        if (i >= self._currentIndex && i < self._currentIndex + perView) {
          slide.classList.add(activeClass);
        } else {
          slide.classList.remove(activeClass);
        }
      });

      // Dots
      this.dots.forEach(function (dot, i) {
        if (i === self._currentIndex) {
          dot.classList.add(dotActiveClass);
        } else {
          dot.classList.remove(dotActiveClass);
        }
      });

      // Arrow states (disable at bounds when no loop)
      if (!this.options.loop) {
        if (this.prevBtn) {
          this.prevBtn.disabled = this._currentIndex === 0;
        }
        if (this.nextBtn) {
          this.nextBtn.disabled = this._currentIndex >= this._getMaxIndex();
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Register module
  // ---------------------------------------------------------------------------
  var registry = {};

  window.digi2.sliders = {
    create: function (name, options) {
      if (registry[name]) {
        console.warn('[digi2.sliders] "' + name + '" already exists.');
        return registry[name];
      }
      var instance = new SliderManager(name, options);
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
