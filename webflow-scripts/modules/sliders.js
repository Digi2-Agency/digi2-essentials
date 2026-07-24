/**
 * digi2 — Sliders Module
 * Loaded automatically by digi2-loader.js when d2-sliders is present.
 *
 * Lightweight carousel with native touch/drag, autoplay, loop, dots, arrows.
 * Supports horizontal and vertical directions.
 *
 * Webflow setup:
 *   <div d2-slider="hero">
 *     <div d2-slider-track>
 *       <div d2-slide>Slide 1</div>
 *       <div d2-slide>Slide 2</div>
 *       <div d2-slide>Slide 3</div>
 *     </div>
 *     <button d2-slider-prev>←</button>
 *     <button d2-slider-next>→</button>
 *     <div d2-slider-dots></div>
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
        loop: false,                   // rewind: snaps back to start at the end
        infinite: false,               // true endless loop (cloned slides, no rewind)
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

      // Infinite-loop (clone) state
      this._clones = 0;       // clones added on each side
      this._realCount = 0;    // number of real (non-clone) slides
      this._pos = 0;          // position over the extended track (incl. clones)
      this._animating = false;
      this._snapTimer = null;

      this._init();
    }

    // ---- Lifecycle ----------------------------------------------------------

    _init() {
      this.containerEl = this._findContainer();

      if (!this.containerEl) {
        console.warn('[digi2.sliders] "' + this.name + '" — container not found.');
        return;
      }

      // Mark so auto-init doesn't double-initialize this element.
      if (this.containerEl.setAttribute) this.containerEl.setAttribute('d2-slider-ready', '');

      this.trackEl = this.containerEl.querySelector('[d2-slider-track]');
      if (!this.trackEl) {
        // If no explicit track, use direct children
        this.trackEl = this.containerEl;
      }

      this.slides = Array.from(this.trackEl.querySelectorAll('[d2-slide]'));
      this.prevBtn = this.containerEl.querySelector('[d2-slider-prev]');
      this.nextBtn = this.containerEl.querySelector('[d2-slider-next]');
      this.dotsContainer = this.containerEl.querySelector('[d2-slider-dots]');

      if (this.slides.length === 0) {
        console.warn('[digi2.sliders] "' + this.name + '" — no slides found.');
        return;
      }

      this._realCount = this.slides.length;

      // Endless loop needs clones on both sides. Only when there are more
      // slides than fit in view — otherwise there is nothing to loop.
      if (this.options.infinite && this._realCount > this.options.slidesPerView) {
        this._setupClones();
      } else {
        this.options.infinite = false;
      }

      // Nothing to navigate (single slide / fewer than one view): hide the
      // arrows + dots and disable dragging — the track is static.
      this._static = this._realCount <= this.options.slidesPerView;
      if (this._static) {
        if (this.prevBtn) this.prevBtn.style.display = 'none';
        if (this.nextBtn) this.nextBtn.style.display = 'none';
        if (this.dotsContainer) this.dotsContainer.style.display = 'none';
      }

      _log('init → ' + this.name, {
        slides: this._realCount,
        infinite: this.options.infinite,
        direction: this.options.direction,
        draggable: this.options.draggable,
      });

      this._setupStyles();
      this._buildDots();
      this._attachListeners();
      this.goTo(this._currentIndex, false);
      this._setupResnap();

      if (this.options.autoplay) {
        this.play();
      }
    }

    // Re-apply the current position from a fresh measurement. A slider that
    // initializes inside a hidden panel (grid/list tab, accordion, modal)
    // measures slide width 0 and parks the track at translate(0) — which shows
    // a head CLONE and makes the first click jump two slides. When the panel
    // becomes visible (container size 0 → real) or the viewport resizes, we
    // silently re-snap the track to the stored position.
    _setupResnap() {
      var self = this;
      this._resnap = function () {
        if (!self.trackEl) return;
        // Still hidden / unmeasurable — wait for a real size.
        if (self._getSlideSize() <= self.options.gap) return;
        if (self.options.infinite) self._slideToPos(self._pos, false);
        else self._slideTo(self._currentIndex, false);
      };
      if (typeof ResizeObserver !== 'undefined') {
        this._ro = new ResizeObserver(function () { self._resnap(); });
        this._ro.observe(this.containerEl);
      }
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('resize', this._resnap);
      }
    }

    destroy() {
      this.pause();
      if (this._snapTimer) { clearTimeout(this._snapTimer); this._snapTimer = null; }
      if (this._ro) { this._ro.disconnect(); this._ro = null; }
      if (this._resnap && typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('resize', this._resnap);
      }
      this._resnap = null;
      this.containerEl = null;
      this.trackEl = null;
      this.slides = [];
      _log('destroy → ' + this.name);
    }

    // ---- Find container -----------------------------------------------------

    _findContainer() {
      if (this.options.containerEl) {
        return this.options.containerEl;
      }
      if (this.options.containerSelector) {
        return document.querySelector(this.options.containerSelector);
      }
      return document.querySelector('[d2-slider="' + this.name + '"]');
    }

    // ---- Setup --------------------------------------------------------------

    // For endless looping we clone `slidesPerView` slides onto each end:
    // tail clones (copies of the first slides) appended after the last real
    // slide, head clones (copies of the last slides) prepended before the
    // first. Navigating onto a clone animates seamlessly, then we silently
    // jump (no transition) to the matching real slide. this.slides becomes
    // the full visual sequence; real slides live at index [_clones, _clones+_realCount).
    _setupClones() {
      var P = this.options.slidesPerView;
      this._clones = P;

      var real = this.slides;
      var firstReal = real[0];

      // Tail clones: copies of the first P slides, in order, appended.
      for (var i = 0; i < P; i++) {
        var tail = real[i].cloneNode(true);
        tail.setAttribute('d2-slide-clone', '');
        this.trackEl.appendChild(tail);
      }

      // Head clones: copies of the last P slides, in order, prepended.
      for (var j = 0; j < P; j++) {
        var head = real[real.length - P + j].cloneNode(true);
        head.setAttribute('d2-slide-clone', '');
        this.trackEl.insertBefore(head, firstReal);
      }

      // Re-collect the full sequence (real + clones) for sizing/translate.
      this.slides = Array.from(this.trackEl.querySelectorAll('[d2-slide]'));
      this._pos = this._clones + this.options.startIndex;
    }

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
      var count = this.options.infinite ? this._realCount : (this._getMaxIndex() + 1);
      var self = this;

      for (var i = 0; i < count; i++) {
        var dot = document.createElement('button');
        dot.setAttribute('d2-dot', i);
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
        if (self._static) return;          // single slide — nothing to drag
        self._isDragging = true;
        self._startPos = getPos(e);
        self._prevTranslate = self._currentTranslate;
        self.trackEl.style.transition = 'none';
        self.containerEl.style.cursor = 'grabbing';
      }

      // Clamp the live drag to the track's real range so the track can't be
      // flung into the void ("nothing visible"). Beyond the edge only a small
      // rubber-band give remains (quarter of the overflow, max half a slide).
      function clampDrag(px) {
        var size = self._getSlideSize();
        if (size <= self.options.gap) return px;   // unmeasurable — don't clamp
        var max = 0;
        var min = self.options.infinite
          ? -(self.slides.length - 1) * size       // last slide incl. clones
          : -self._getMaxIndex() * size;
        var over = 0;
        if (px > max) { over = px - max; px = max; }
        else if (px < min) { over = px - min; px = min; }
        var give = Math.max(-size / 2, Math.min(size / 2, over * 0.25));
        return px + give;
      }

      function onMove(e) {
        if (!self._isDragging) return;
        var current = getPos(e);
        var diff = current - self._startPos;
        self._currentTranslate = clampDrag(self._prevTranslate + diff);
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

    // ---- Infinite-loop helpers ---------------------------------------------

    // Real (0-based) index currently shown, derived from the extended pos.
    _realIndex() {
      var n = this._realCount;
      return ((this._pos - this._clones) % n + n) % n;
    }

    // Move the track to an extended position (may be a clone).
    _slideToPos(pos, animate) {
      if (animate === false) this.trackEl.style.transition = 'none';

      var size = this._getSlideSize();
      this._currentTranslate = -pos * size;
      this._setTranslate(this._currentTranslate);

      if (animate === false) {
        void this.trackEl.offsetHeight; // reflow so the snap is instant
        this.trackEl.style.transition = 'transform ' + this.options.speed + 'ms ' + this.options.easing;
      }
    }

    // After animating onto a clone, jump (no transition) to the matching
    // real slide so the next move continues seamlessly forward/back.
    _maybeSnap() {
      var snapTo = null;
      if (this._pos >= this._clones + this._realCount) snapTo = this._pos - this._realCount;
      else if (this._pos < this._clones) snapTo = this._pos + this._realCount;
      if (snapTo === null) return;

      var self = this;
      this._animating = true;

      var done = function () {
        self.trackEl.removeEventListener('transitionend', done);
        if (self._snapTimer) { clearTimeout(self._snapTimer); self._snapTimer = null; }
        self._pos = snapTo;
        self._slideToPos(self._pos, false);
        self._animating = false;
      };

      this.trackEl.addEventListener('transitionend', done);
      // Fallback in case transitionend doesn't fire (tab blur, etc.)
      this._snapTimer = setTimeout(done, this.options.speed + 60);
    }

    // ---- Public API ---------------------------------------------------------

    next() {
      if (this.options.infinite) {
        if (this._animating) return;            // wait out a boundary snap
        this._pos += 1;
        this._currentIndex = this._realIndex();
        this._slideToPos(this._pos, true);
        this._updateState();
        if (typeof this.options.onChange === 'function') this.options.onChange(this._currentIndex, this);
        this._maybeSnap();
        return;
      }

      var maxIndex = this._getMaxIndex();
      var newIndex = this._currentIndex + 1;

      if (newIndex > maxIndex) {
        if (this.options.loop) { newIndex = 0; }
        else { return; }
      }

      this.goTo(newIndex);
    }

    prev() {
      if (this.options.infinite) {
        if (this._animating) return;
        this._pos -= 1;
        this._currentIndex = this._realIndex();
        this._slideToPos(this._pos, true);
        this._updateState();
        if (typeof this.options.onChange === 'function') this.options.onChange(this._currentIndex, this);
        this._maybeSnap();
        return;
      }

      var maxIndex = this._getMaxIndex();
      var newIndex = this._currentIndex - 1;

      if (newIndex < 0) {
        if (this.options.loop) { newIndex = maxIndex; }
        else { return; }
      }

      this.goTo(newIndex);
    }

    goTo(index, animate) {
      if (this.options.infinite) {
        var n = this._realCount;
        var real = ((index % n) + n) % n;
        this._currentIndex = real;
        this._pos = this._clones + real;

        _log('goTo → ' + real);

        this._slideToPos(this._pos, animate);
        this._updateState();

        if (typeof this.options.onChange === 'function') this.options.onChange(real, this);
        return;
      }

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
        ? (function () { var d = document.createElement('div'); d.setAttribute('d2-slide', ''); d.innerHTML = content; return d; })()
        : content;

      if (index !== undefined && index < this.slides.length) {
        this.trackEl.insertBefore(slide, this.slides[index]);
      } else {
        this.trackEl.appendChild(slide);
      }

      this.slides = Array.from(this.trackEl.querySelectorAll('[d2-slide]'));
      this._setupStyles();
      this._buildDots();
      this._updateState();
      _log('addSlide', { index: index, total: this.slides.length });
    }

    removeSlide(index) {
      if (index < 0 || index >= this.slides.length) return;

      this.trackEl.removeChild(this.slides[index]);
      this.slides = Array.from(this.trackEl.querySelectorAll('[d2-slide]'));

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

      // Active slides — in infinite mode indices are offset by the head clones,
      // and clones themselves never get the active class.
      var offset = this.options.infinite ? this._clones : 0;
      this.slides.forEach(function (slide, i) {
        var idx = i - offset;
        if (idx >= self._currentIndex && idx < self._currentIndex + perView) {
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

      // Arrow states (disable at bounds when neither loop nor infinite)
      if (!this.options.loop && !this.options.infinite) {
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
  var feedConfig = {}; // { feedName: { position, if } } — JS overrides for the CMS feed

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

    /**
     * Initialize every [d2-slider] element on the page (or those matching
     * `filter`). Each gets its own instance; duplicate names are made unique
     * (e.g. gallery, gallery-2, gallery-3). Handy when the same slider markup
     * repeats across CMS items — one call wires them all.
     *
     *   digi2.sliders.createAll({ loop: true })
     *   digi2.sliders.createAll('.card-slider', { loop: true })  // CSS filter
     *
     * @param {string} [filter]   Optional CSS selector to narrow the elements
     * @param {object} [options]  Shared options applied to every slider
     * @returns {object[]} created instances
     */
    createAll: function (filter, options) {
      if (typeof filter === 'object' && filter !== null) {
        options = filter;
        filter = null;
      }
      options = options || {};

      var selector = filter || '[d2-slider]';
      var els = document.querySelectorAll(selector);
      var created = [];
      var nameCount = {};

      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        var base = el.getAttribute('d2-slider') || 'slider';
        if (!base) base = 'slider';

        nameCount[base] = (nameCount[base] || 0) + 1;
        var key = nameCount[base] === 1 ? base : base + '-' + nameCount[base];
        while (registry[key]) { nameCount[base]++; key = base + '-' + nameCount[base]; }

        var opts = Object.assign({}, options, { containerEl: el });
        var instance = new SliderManager(key, opts);
        registry[key] = instance;
        created.push(instance);
      }

      _log('createAll → ' + created.length + ' sliders', { selector: selector });
      return created;
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

    /**
     * Configure the CMS feed for a source NAME from a script — an alternative
     * to the d2-slider-feed-position / -if attributes (handy when the value is
     * computed, or Webflow can't bind the field you need).
     *
     *   digi2.sliders.feed('rzuty', { position: 1 });      // 1 static · feed · rest
     *   digi2.sliders.feed('rzuty', { position: 'end' });
     *   digi2.sliders.feed('rzuty', { if: false });         // skip the feed
     *   digi2.sliders.feed('rzuty', { position: 'off' });   // also skips
     *
     * The feed runs BEFORE a slider initializes, so this re-feeds any matching
     * [d2-slider-feed="name"] that hasn't started yet (undoing a prior inject so
     * the new position applies). Call it early — before the slider is ready. A
     * slider that already initialized can't be repositioned without a rebuild;
     * destroy() + re-create it, or set the config before init.
     *
     * @param {string} name    The d2-slider-feed / d2-slider-source value
     * @param {object} config  { position?: 'start'|'end'|'off'|number, if?: boolean }
     * @returns {object} the sliders API (chainable)
     */
    feed: function (name, config) {
      if (name == null) return this;
      var key = String(name);
      feedConfig[key] = Object.assign(feedConfig[key] || {}, config || {});

      var all = document.querySelectorAll('[d2-slider-feed]');
      for (var i = 0; i < all.length; i++) {
        var sl = all[i];
        if (sl.getAttribute('d2-slider-feed') !== key) continue;
        if (sl.hasAttribute('d2-slider-ready')) {
          _log('feed() ignored — "' + key + '" already initialized; destroy() to reposition');
          continue;
        }
        // Undo a prior inject so the new position/gate applies cleanly.
        var track = sl.querySelector('[d2-slider-track]') || sl;
        var fed = Array.prototype.slice.call(track.querySelectorAll('[d2-slider-fed]'));
        for (var f = 0; f < fed.length; f++) {
          if (fed[f].parentNode) fed[f].parentNode.removeChild(fed[f]);
        }
        sl.removeAttribute('d2-slider-feed-done');
      }
      _ingestFeeds();
      return this;
    },

    // Exposed for tests — pure resolvers behind the feed attributes.
    _feedInsertIndex: _feedInsertIndex,
    _feedTruthy: _feedTruthy,
    _feedSuffixPosition: _feedSuffixPosition,
    _feedPositionOff: _feedPositionOff,
  };

  // ---------------------------------------------------------------------------
  // Declarative auto-init
  // Any [d2-slider] on the page is initialized automatically — no JS call
  // needed. Per-slider options come from attributes on the container:
  //   d2-slider-loop            d2-slider-autoplay="4000"
  //   d2-slider-infinite        d2-slider-per-view="2"
  //   d2-slider-gap="16"        d2-slider-direction="vertical"
  //   d2-slider-draggable="false"   d2-slider-speed="400"
  // A MutationObserver re-scans so sliders injected later (CMS render, an
  // attribute-mapping script, etc.) get picked up too.
  // ---------------------------------------------------------------------------
  function _boolAttr(el, name) {
    if (!el.hasAttribute(name)) return undefined;
    var v = el.getAttribute(name);
    return v === '' || v === 'true' || v === '1' || v === 'yes';
  }

  function _numAttr(el, name) {
    if (!el.hasAttribute(name)) return undefined;
    var n = parseFloat(el.getAttribute(name));
    return isNaN(n) ? undefined : n;
  }

  function _optsFromAttrs(el) {
    var o = {};
    var loop = _boolAttr(el, 'd2-slider-loop');
    if (loop !== undefined) o.loop = loop;

    var infinite = _boolAttr(el, 'd2-slider-infinite');
    if (infinite !== undefined) o.infinite = infinite;

    if (el.hasAttribute('d2-slider-autoplay')) {
      var ms = _numAttr(el, 'd2-slider-autoplay');
      o.autoplay = ms !== undefined ? ms : (_boolAttr(el, 'd2-slider-autoplay') ? 3000 : false);
    }

    var pv = _numAttr(el, 'd2-slider-per-view');
    if (pv === undefined) pv = _numAttr(el, 'd2-slider-slides-per-view');
    if (pv !== undefined) o.slidesPerView = pv;

    var gap = _numAttr(el, 'd2-slider-gap');
    if (gap !== undefined) o.gap = gap;

    var dir = el.getAttribute('d2-slider-direction');
    if (dir) o.direction = dir;

    var drag = _boolAttr(el, 'd2-slider-draggable');
    if (drag !== undefined) o.draggable = drag;

    var speed = _numAttr(el, 'd2-slider-speed');
    if (speed !== undefined) o.speed = speed;

    return o;
  }

  // ---- CMS feed: pull slides from a Collection List --------------------------
  // Tag a (hidden) collection list with d2-slider-source="name" — its items
  // are moved into the track of the slider marked d2-slider-feed="name"
  // BEFORE that slider initializes, so clones/positions include them.
  //
  //   <div d2-slider-source="{{slug}}" class="hidden">   ← CMS list with images
  //     <div class="w-dyn-item"><img src="…"></div>
  //   </div>
  //   <div d2-slider d2-slider-feed="{{slug}}"> <div d2-slider-track>…</div> </div>
  //
  // Bind both names to a CMS field (e.g. slug) to pair source↔slider per item.
  // Items taken: [d2-slide] descendants; else direct children that are/contain
  // an <img> (skips w-dyn-empty junk). Each gets d2-slide if missing.
  //   d2-slider-feed-position="start|end|N"   (on the slider; default "start")
  //     N = 0-based insertion index among the EXISTING slides = how many of them
  //     stay IN FRONT of the fed block. With 2 static slides: "1" drops the block
  //     in the middle, "2" (= slide count) appends at the end. Clamped to range;
  //     empty / non-numeric / <0 → "start". CMS-bindable for per-item control.
  //   d2-slider-feed-if="true|false"          (on the slider; optional gate)
  //     Only feed when the value is truthy. Bind a CMS Switch field so a slider
  //     pulls the collection images only for flagged items. Truthy = anything
  //     except empty / false / 0 / no / off / null. Absent attr = always feed.

  // Truthy test for the CMS-bound feed gate. Webflow Switch fields render
  // "true"/"false" text; yes/on/1 also count as true. Empty (a bound-but-false
  // switch may resolve to "") and the explicit falses are false.
  function _feedTruthy(v) {
    var s = String(v == null ? '' : v).trim().toLowerCase();
    if (s === '') return false;
    return !(s === 'false' || s === '0' || s === 'no' || s === 'off' ||
             s === 'null' || s === 'undefined');
  }

  // Explicit "don't feed" keywords for d2-slider-feed-position, so a single
  // bound Option/Text field can switch the feed OFF as well as place it —
  // Webflow can't bind a Switch to a custom attribute, but an Option field can.
  // Empty / absent stays "start" (back-compat); use an explicit "off" to skip.
  function _feedPositionOff(v) {
    var s = String(v == null ? '' : v).trim().toLowerCase();
    return s === 'off' || s === 'none' || s === 'false' || s === 'no';
  }

  // Pure resolver for d2-slider-feed-position → an index in [0, count] where the
  // fed block begins (count = append after the last existing slide).
  //   "start" / "" / null / <0 / non-numeric → 0
  //   "end"                                   → count
  //   "N" (0-based)                           → N, clamped to [0, count]
  function _feedInsertIndex(posRaw, count) {
    var p = String(posRaw == null ? '' : posRaw).trim().toLowerCase();
    if (p === 'end') return count;
    if (p === '' || p === 'start') return 0;
    var n = parseInt(p, 10);
    if (isNaN(n) || n < 0) return 0;
    return n > count ? count : n;
  }

  // CMS-driven position selector: d2-slider-feed-position-N="<truthy>". Webflow
  // can't bind a raw number into d2-slider-feed-position, but it CAN bind a
  // Switch field into a fixed attribute — so enumerate candidate positions as
  // suffixed attributes, each gated by its own boolean, and flip on the one you
  // want per item. N is the same 0-based index as feed-position (how many static
  // slides stay in front). The truthy suffix wins (smallest N breaks ties).
  //   Returns: null  → no suffixed attributes (caller uses feed-position)
  //            -1    → suffixed attributes exist but none is truthy → skip feed
  //            index → the chosen insertion index (clamped to [0, count])
  function _feedSuffixPosition(pairs, count) {
    var found = false;
    var best = null;
    for (var i = 0; i < pairs.length; i++) {
      var m = /^d2-slider-feed-position-(\d+)$/.exec(pairs[i].name);
      if (!m) continue;
      found = true;
      if (_feedTruthy(pairs[i].value)) {
        var n = parseInt(m[1], 10);
        if (best === null || n < best) best = n;
      }
    }
    if (!found) return null;
    if (best === null) return -1;
    return _feedInsertIndex(String(best), count);
  }

  // Collect an element's attributes as {name, value} pairs (DOM-agnostic).
  function _attrPairs(elm) {
    var out = [];
    var a = elm && elm.attributes;
    if (a) for (var i = 0; i < a.length; i++) out.push({ name: a[i].name, value: a[i].value });
    return out;
  }

  function _ingestFeeds() {
    var feeds = document.querySelectorAll('[d2-slider-feed]:not([d2-slider-feed-done])');
    for (var i = 0; i < feeds.length; i++) {
      var slider = feeds[i];
      var name = slider.getAttribute('d2-slider-feed');
      if (!name) { slider.setAttribute('d2-slider-feed-done', ''); continue; }

      // JS config (digi2.sliders.feed(name, {...})) overrides the attributes.
      var cfg = feedConfig[name] || null;

      // Conditional feed. Gate priority: cfg.if → d2-slider-feed-if attribute.
      var gate = (cfg && cfg.if !== undefined) ? cfg.if
        : (slider.hasAttribute('d2-slider-feed-if') ? slider.getAttribute('d2-slider-feed-if') : undefined);
      if (gate !== undefined && !_feedTruthy(gate)) {
        slider.setAttribute('d2-slider-feed-done', '');
        continue;
      }

      // Feed only BEFORE the slider initializes — injecting into a live
      // infinite slider would desync its clones/positions. Webflow renders
      // CMS lists server-side, so sources are present at init time.
      if (slider.hasAttribute('d2-slider-ready')) {
        slider.setAttribute('d2-slider-feed-done', '');
        continue;
      }

      var track = slider.querySelector('[d2-slider-track]') || slider;

      // Existing slides present BEFORE injection. The feed-position number is a
      // 0-based index into these (how many stay in front of the fed block), so
      // the block can land at the start, the end, or anywhere in between.
      var existing = Array.prototype.slice.call(track.querySelectorAll('[d2-slide]'));

      // Where (or whether) the block lands. Priority: JS config position →
      // suffixed boolean form (d2-slider-feed-position-N) → plain
      // d2-slider-feed-position (a Number/Option field binds straight to it;
      // "off"/"none" switches the feed off for this item).
      var at;
      if (cfg && cfg.position !== undefined) {
        if (_feedPositionOff(cfg.position)) { slider.setAttribute('d2-slider-feed-done', ''); continue; }
        at = _feedInsertIndex(cfg.position, existing.length);
      } else {
        var suffixPos = _feedSuffixPosition(_attrPairs(slider), existing.length);
        if (suffixPos === -1) { slider.setAttribute('d2-slider-feed-done', ''); continue; }
        if (suffixPos != null) {
          at = suffixPos;
        } else {
          var posAttr = slider.getAttribute('d2-slider-feed-position');
          if (posAttr != null && _feedPositionOff(posAttr)) {
            slider.setAttribute('d2-slider-feed-done', '');
            continue;
          }
          at = _feedInsertIndex(posAttr, existing.length);
        }
      }
      var ref = at < existing.length ? existing[at] : null;   // null → append at end

      var sources = document.querySelectorAll('[d2-slider-source]');
      var movedAny = false;
      for (var s = 0; s < sources.length; s++) {
        var src = sources[s];
        if (src.getAttribute('d2-slider-source') !== name) continue;
        if (track.contains(src)) continue;                 // never self-feed

        var list = Array.prototype.slice.call(src.querySelectorAll('[d2-slide]'));
        if (!list.length) {
          // Webflow: the attribute may sit on the Collection List WRAPPER —
          // descend into its .w-dyn-items child so each ITEM becomes a slide
          // (not the whole items container as one giant slide).
          var root = src;
          for (var c = 0; c < src.children.length; c++) {
            var ch = src.children[c];
            if (ch.classList && ch.classList.contains('w-dyn-items')) { root = ch; break; }
          }
          list = Array.prototype.slice.call(root.children).filter(function (el) {
            return el.tagName === 'IMG' || (el.querySelector && el.querySelector('img'));
          });
        }
        for (var k = 0; k < list.length; k++) {
          // CLONE (don't move): the same source can feed several sliders —
          // e.g. a grid view and a list view sharing one slug-named source.
          var el = list[k].cloneNode(true);
          el.removeAttribute('id');
          if (!el.hasAttribute('d2-slide')) el.setAttribute('d2-slide', '');
          el.setAttribute('d2-slider-fed', ''); // marker so feed() can undo a re-position
          if (ref) track.insertBefore(el, ref);
          else track.appendChild(el);
          movedAny = true;
        }
        src.style.display = 'none';
      }
      // Sources may not be in the DOM yet (async CMS) — only mark done once
      // something was ingested, so the MutationObserver rescan retries.
      if (movedAny) slider.setAttribute('d2-slider-feed-done', '');
    }
  }

  function _autoInit() {
    _ingestFeeds();
    var els = document.querySelectorAll('[d2-slider]:not([d2-slider-ready])');
    var nameCount = {};
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var base = el.getAttribute('d2-slider') || 'slider';
      if (!base) base = 'slider';

      nameCount[base] = (nameCount[base] || 0) + 1;
      var key = nameCount[base] === 1 ? base : base + '-' + nameCount[base];
      while (registry[key]) { nameCount[base]++; key = base + '-' + nameCount[base]; }

      var opts = _optsFromAttrs(el);
      opts.containerEl = el;
      registry[key] = new SliderManager(key, opts);
    }
  }

  var _autoMo = null;
  function _startAutoObserver() {
    if (typeof MutationObserver === 'undefined' || !document.body || _autoMo) return;
    var t = null;
    _autoMo = new MutationObserver(function () {
      if (t) return;
      t = setTimeout(function () { t = null; _autoInit(); }, 50);
    });
    _autoMo.observe(document.body, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['d2-slider'],
    });
  }

  function _boot() {
    _autoInit();
    _startAutoObserver();
  }

  // Safety nets. When the module is injected by the loader it can execute in a
  // window where its single _autoInit pass misses a server-rendered [d2-slider]
  // (present in the HTML but not seen by that pass), and then no later DOM
  // mutation fires the observer to catch it — so the slider never initializes.
  // Re-scan on full load and after short delays. _autoInit (+ _ingestFeeds) is
  // idempotent — already-initialized sliders (d2-slider-ready) and consumed
  // feeds (d2-slider-feed-done) are skipped — so extra passes are safe no-ops.
  function _bootWithRetries() {
    _boot();
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('load', function () { _startAutoObserver(); _autoInit(); });
    }
    setTimeout(function () { _startAutoObserver(); _autoInit(); }, 300);
    setTimeout(function () { _startAutoObserver(); _autoInit(); }, 1500);
  }

  if (document.readyState === 'loading' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', _bootWithRetries);
  } else {
    _bootWithRetries();
  }
})();
