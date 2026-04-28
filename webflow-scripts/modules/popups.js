/**
 * digi2 — Popups Module
 * Loaded automatically by digi2-loader.js when d2-popups is present.
 *
 * API:
 *   window.digi2.popups.create('name', { ...options })
 *   window.digi2.popups.get('name')
 *   window.digi2.popups.destroy('name')
 *   window.digi2.popups.list()
 *
 * Options:
 *   openTriggerSelector:  '.my-open-btn'        — any CSS selector, clicks open this popup
 *   closeTriggerSelector: '.my-close-btn'        — any CSS selector, clicks close this popup
 *   animation:            'fade'                 — none | fade | slide-up | slide-down | slide-left | slide-right | zoom
 *   animationDuration:    0.4                    — seconds
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  // ---------------------------------------------------------------------------
  // Animation presets — each returns { setup, in, out } style objects
  // setup:  applied immediately when showing (before reflow)
  // in:     applied after reflow to trigger the transition
  // out:    applied to start the hide transition
  // reset:  applied after hide completes to clean up
  // ---------------------------------------------------------------------------
  const ANIMATIONS = {
    none: {
      setup: () => ({}),
      in:    () => ({}),
      out:   () => ({}),
      reset: () => ({}),
    },
    fade: {
      setup: (d) => ({ opacity: '0', transition: `opacity ${d}s ease` }),
      in:    ()  => ({ opacity: '1' }),
      out:   (d) => ({ opacity: '0', transition: `opacity ${d}s ease` }),
      reset: ()  => ({ opacity: '', transition: '' }),
    },
    'slide-up': {
      setup: (d) => ({ opacity: '0', transform: 'translateY(30px)', transition: `opacity ${d}s ease, transform ${d}s ease` }),
      in:    ()  => ({ opacity: '1', transform: 'translateY(0)' }),
      out:   (d) => ({ opacity: '0', transform: 'translateY(30px)', transition: `opacity ${d}s ease, transform ${d}s ease` }),
      reset: ()  => ({ opacity: '', transform: '', transition: '' }),
    },
    'slide-down': {
      setup: (d) => ({ opacity: '0', transform: 'translateY(-30px)', transition: `opacity ${d}s ease, transform ${d}s ease` }),
      in:    ()  => ({ opacity: '1', transform: 'translateY(0)' }),
      out:   (d) => ({ opacity: '0', transform: 'translateY(-30px)', transition: `opacity ${d}s ease, transform ${d}s ease` }),
      reset: ()  => ({ opacity: '', transform: '', transition: '' }),
    },
    'slide-left': {
      setup: (d) => ({ opacity: '0', transform: 'translateX(30px)', transition: `opacity ${d}s ease, transform ${d}s ease` }),
      in:    ()  => ({ opacity: '1', transform: 'translateX(0)' }),
      out:   (d) => ({ opacity: '0', transform: 'translateX(30px)', transition: `opacity ${d}s ease, transform ${d}s ease` }),
      reset: ()  => ({ opacity: '', transform: '', transition: '' }),
    },
    'slide-right': {
      setup: (d) => ({ opacity: '0', transform: 'translateX(-30px)', transition: `opacity ${d}s ease, transform ${d}s ease` }),
      in:    ()  => ({ opacity: '1', transform: 'translateX(0)' }),
      out:   (d) => ({ opacity: '0', transform: 'translateX(-30px)', transition: `opacity ${d}s ease, transform ${d}s ease` }),
      reset: ()  => ({ opacity: '', transform: '', transition: '' }),
    },
    zoom: {
      setup: (d) => ({ opacity: '0', transform: 'scale(0.85)', transition: `opacity ${d}s ease, transform ${d}s ease` }),
      in:    ()  => ({ opacity: '1', transform: 'scale(1)' }),
      out:   (d) => ({ opacity: '0', transform: 'scale(0.85)', transition: `opacity ${d}s ease, transform ${d}s ease` }),
      reset: ()  => ({ opacity: '', transform: '', transition: '' }),
    },
    'zoom-in': {
      setup: (d) => ({ opacity: '0', transform: 'scale(1.15)', transition: `opacity ${d}s ease, transform ${d}s ease` }),
      in:    ()  => ({ opacity: '1', transform: 'scale(1)' }),
      out:   (d) => ({ opacity: '0', transform: 'scale(1.15)', transition: `opacity ${d}s ease, transform ${d}s ease` }),
      reset: ()  => ({ opacity: '', transform: '', transition: '' }),
    },
    'flip': {
      setup: (d) => ({ opacity: '0', transform: 'perspective(800px) rotateX(-15deg)', transition: `opacity ${d}s ease, transform ${d}s ease` }),
      in:    ()  => ({ opacity: '1', transform: 'perspective(800px) rotateX(0)' }),
      out:   (d) => ({ opacity: '0', transform: 'perspective(800px) rotateX(15deg)', transition: `opacity ${d}s ease, transform ${d}s ease` }),
      reset: ()  => ({ opacity: '', transform: '', transition: '' }),
    },
    'flip-y': {
      setup: (d) => ({ opacity: '0', transform: 'perspective(800px) rotateY(-15deg)', transition: `opacity ${d}s ease, transform ${d}s ease` }),
      in:    ()  => ({ opacity: '1', transform: 'perspective(800px) rotateY(0)' }),
      out:   (d) => ({ opacity: '0', transform: 'perspective(800px) rotateY(15deg)', transition: `opacity ${d}s ease, transform ${d}s ease` }),
      reset: ()  => ({ opacity: '', transform: '', transition: '' }),
    },
    'rotate': {
      setup: (d) => ({ opacity: '0', transform: 'scale(0.8) rotate(-8deg)', transition: `opacity ${d}s ease, transform ${d}s ease` }),
      in:    ()  => ({ opacity: '1', transform: 'scale(1) rotate(0)' }),
      out:   (d) => ({ opacity: '0', transform: 'scale(0.8) rotate(8deg)', transition: `opacity ${d}s ease, transform ${d}s ease` }),
      reset: ()  => ({ opacity: '', transform: '', transition: '' }),
    },
    'blur': {
      setup: (d) => ({ opacity: '0', filter: 'blur(12px)', transition: `opacity ${d}s ease, filter ${d}s ease` }),
      in:    ()  => ({ opacity: '1', filter: 'blur(0)' }),
      out:   (d) => ({ opacity: '0', filter: 'blur(12px)', transition: `opacity ${d}s ease, filter ${d}s ease` }),
      reset: ()  => ({ opacity: '', filter: '', transition: '' }),
    },
    'bounce': {
      setup: (d) => ({ opacity: '0', transform: 'scale(0.4)', transition: `opacity ${d * 0.4}s ease, transform ${d}s cubic-bezier(0.34, 1.56, 0.64, 1)` }),
      in:    ()  => ({ opacity: '1', transform: 'scale(1)' }),
      out:   (d) => ({ opacity: '0', transform: 'scale(0.4)', transition: `opacity ${d * 0.6}s ease, transform ${d}s cubic-bezier(0.36, 0, 0.66, -0.56)` }),
      reset: ()  => ({ opacity: '', transform: '', transition: '' }),
    },
    'elastic': {
      setup: (d) => ({ opacity: '0', transform: 'scale(0.6) translateY(20px)', transition: `opacity ${d * 0.5}s ease, transform ${d}s cubic-bezier(0.68, -0.55, 0.265, 1.55)` }),
      in:    ()  => ({ opacity: '1', transform: 'scale(1) translateY(0)' }),
      out:   (d) => ({ opacity: '0', transform: 'scale(0.6) translateY(20px)', transition: `opacity ${d * 0.5}s ease, transform ${d}s ease-in` }),
      reset: ()  => ({ opacity: '', transform: '', transition: '' }),
    },
    'drop': {
      setup: (d) => ({ opacity: '0', transform: 'translateY(-60px) scale(0.9)', transition: `opacity ${d * 0.5}s ease, transform ${d}s cubic-bezier(0.34, 1.56, 0.64, 1)` }),
      in:    ()  => ({ opacity: '1', transform: 'translateY(0) scale(1)' }),
      out:   (d) => ({ opacity: '0', transform: 'translateY(-60px) scale(0.9)', transition: `opacity ${d * 0.4}s ease, transform ${d}s ease-in` }),
      reset: ()  => ({ opacity: '', transform: '', transition: '' }),
    },
    'swing': {
      setup: (d) => ({ opacity: '0', transform: 'perspective(600px) rotateX(-30deg)', transformOrigin: 'top center', transition: `opacity ${d * 0.4}s ease, transform ${d}s cubic-bezier(0.34, 1.56, 0.64, 1)` }),
      in:    ()  => ({ opacity: '1', transform: 'perspective(600px) rotateX(0)' }),
      out:   (d) => ({ opacity: '0', transform: 'perspective(600px) rotateX(-30deg)', transition: `opacity ${d * 0.4}s ease, transform ${d}s ease-in` }),
      reset: ()  => ({ opacity: '', transform: '', transformOrigin: '', transition: '' }),
    },
    'slide-full-up': {
      setup: (d) => ({ opacity: '0', transform: 'translateY(100%)', transition: `opacity ${d * 0.3}s ease, transform ${d}s cubic-bezier(0.22, 1, 0.36, 1)` }),
      in:    ()  => ({ opacity: '1', transform: 'translateY(0)' }),
      out:   (d) => ({ opacity: '0', transform: 'translateY(100%)', transition: `opacity ${d * 0.3}s ease, transform ${d}s ease-in` }),
      reset: ()  => ({ opacity: '', transform: '', transition: '' }),
    },
    'slide-full-down': {
      setup: (d) => ({ opacity: '0', transform: 'translateY(-100%)', transition: `opacity ${d * 0.3}s ease, transform ${d}s cubic-bezier(0.22, 1, 0.36, 1)` }),
      in:    ()  => ({ opacity: '1', transform: 'translateY(0)' }),
      out:   (d) => ({ opacity: '0', transform: 'translateY(-100%)', transition: `opacity ${d * 0.3}s ease, transform ${d}s ease-in` }),
      reset: ()  => ({ opacity: '', transform: '', transition: '' }),
    },
    'slide-full-left': {
      setup: (d) => ({ opacity: '0', transform: 'translateX(100%)', transition: `opacity ${d * 0.3}s ease, transform ${d}s cubic-bezier(0.22, 1, 0.36, 1)` }),
      in:    ()  => ({ opacity: '1', transform: 'translateX(0)' }),
      out:   (d) => ({ opacity: '0', transform: 'translateX(100%)', transition: `opacity ${d * 0.3}s ease, transform ${d}s ease-in` }),
      reset: ()  => ({ opacity: '', transform: '', transition: '' }),
    },
    'slide-full-right': {
      setup: (d) => ({ opacity: '0', transform: 'translateX(-100%)', transition: `opacity ${d * 0.3}s ease, transform ${d}s cubic-bezier(0.22, 1, 0.36, 1)` }),
      in:    ()  => ({ opacity: '1', transform: 'translateX(0)' }),
      out:   (d) => ({ opacity: '0', transform: 'translateX(-100%)', transition: `opacity ${d * 0.3}s ease, transform ${d}s ease-in` }),
      reset: ()  => ({ opacity: '', transform: '', transition: '' }),
    },
    'unfold': {
      setup: (d) => ({ opacity: '0', transform: 'scaleY(0)', transformOrigin: 'top center', transition: `opacity ${d * 0.3}s ease, transform ${d}s cubic-bezier(0.22, 1, 0.36, 1)` }),
      in:    ()  => ({ opacity: '1', transform: 'scaleY(1)' }),
      out:   (d) => ({ opacity: '0', transform: 'scaleY(0)', transition: `opacity ${d * 0.3}s ease, transform ${d}s ease-in` }),
      reset: ()  => ({ opacity: '', transform: '', transformOrigin: '', transition: '' }),
    },
    'reveal': {
      setup: (d) => ({ opacity: '0', transform: 'scaleX(0)', transformOrigin: 'left center', transition: `opacity ${d * 0.3}s ease, transform ${d}s cubic-bezier(0.22, 1, 0.36, 1)` }),
      in:    ()  => ({ opacity: '1', transform: 'scaleX(1)' }),
      out:   (d) => ({ opacity: '0', transform: 'scaleX(0)', transition: `opacity ${d * 0.3}s ease, transform ${d}s ease-in` }),
      reset: ()  => ({ opacity: '', transform: '', transformOrigin: '', transition: '' }),
    },
    'zoom-blur': {
      setup: (d) => ({ opacity: '0', transform: 'scale(0.85)', filter: 'blur(8px)', transition: `opacity ${d}s ease, transform ${d}s ease, filter ${d}s ease` }),
      in:    ()  => ({ opacity: '1', transform: 'scale(1)', filter: 'blur(0)' }),
      out:   (d) => ({ opacity: '0', transform: 'scale(0.85)', filter: 'blur(8px)', transition: `opacity ${d}s ease, transform ${d}s ease, filter ${d}s ease` }),
      reset: ()  => ({ opacity: '', transform: '', filter: '', transition: '' }),
    },
  };

  // Helper — apply a style object to an element
  function applyStyles(el, styles) {
    Object.assign(el.style, styles);
  }

  // Debug helper
  function _log(action, data) {
    if (window.digi2.log) window.digi2.log('popups', action, data);
  }

  // ---------------------------------------------------------------------------
  // PopupManager (internal)
  // ---------------------------------------------------------------------------
  class PopupManager {
    constructor(name, options = {}) {
      this.name = name;

      this.options = {
        popupSelector: '.popup__overlay',
        openTriggerSelector: null,   // CSS selector — clicks open this popup
        closeTriggerSelector: null,   // CSS selector — clicks close this popup (in addition to overlay click)
        dataTagTrigger: true,         // listen for d2-show-popup="name" clicks globally
        cookieName: 'popup_clicked',
        cookieDurationDays: 1,
        openOnLoad: false,
        animation: 'fade',           // none | fade | slide-up | slide-down | slide-left | slide-right | zoom
        animationDuration: 0.4,
        excludeUrls: [],
        containsUrls: ['/'],
        openAfterDelay: null,
        openOnExitIntent: false,
        openAfterPageViews: null,
        sessionStorageKey: 'popupPageViews',
        lockScrollOnShow: true,       // lock body scroll when popup is visible
        // ---- New triggers --------------------------------------------------
        openOnOutsideClick: null,         // CSS selector — clicks anywhere outside this element open popup
        openOnElementMouseLeave: null,    // CSS selector — mouse leaving this element opens popup
        openOnElementHover: null,         // CSS selector — mouse entering this element opens popup
        openOnTabBlur: false,             // boolean — open when user switches away from the tab
        openAfterScrollPercent: null,     // number 0-100 — open after scrolling this % of the page
        openAfterScrollPastElement: null, // CSS selector — open when this element enters viewport
        openAfterIdle: null,              // number (seconds) — open after this many seconds of no user activity
        openOnRageClick: null,            // boolean | number — open on N rapid clicks (default 3) within 1s
        rageClickWindow: 1000,            // ms window for rage-click detection
        openOnSelectAbandon: null,        // CSS selector for a form/container — open if user focuses a <select> inside, doesn't change it to a non-default value, and then mouses out of the container
        openOnScrollSpeed: null,          // number (px/sec) or { speed, direction: 'up'|'down'|'any' } — open when scroll velocity exceeds threshold
        interceptLinks: false,            // boolean | CSS selector — intercept link clicks, show popup first, navigate on close. true = all <a href> (skips #hash, mailto:, tel:, javascript:, target=_blank, modifier-key clicks)
        // ---- Callbacks -----------------------------------------------------
        onOpen: null,
        onClose: null,
        ...options,
      };

      this.popupElement = null;
      this.shown = false;
      this.isVisible = false;
      this._animating = false;

      // Mobile exit-intent state
      this.isMobile = false;
      this.lastScrollY = 0;
      this.throttleTimer = null;
      this.scrollTriggered = false;

      // Bound references for cleanup
      this._boundHandleMouseOut = null;
      this._boundHandleScroll = null;
      this._boundOpenHandler = null;
      this._boundCloseHandler = null;
      this._delayTimerId = null;

      // Cleanup registry for new triggers — each entry is a fn that detaches its trigger
      this._cleanupFns = [];
      this._idleTimerId = null;
      this._rageClicks = [];
      this._intersectionObserver = null;

      this._init();
    }

    // ---- Lifecycle ----------------------------------------------------------

    _init() {
      if (this._shouldExcludeUrl() || !this._shouldContainUrl()) return;

      this.popupElement = document.querySelector(this.options.popupSelector);

      if (!this.popupElement) {
        console.warn(
          `[digi2.popups] "${this.name}" — element not found: ${this.options.popupSelector}`
        );
        return;
      }

      this.isMobile = /Mobi|Android/i.test(navigator.userAgent);
      this.lastScrollY = window.scrollY;

      _log('init → ' + this.name, this.options);

      this._attachTriggers();
      this._updatePageViews();

      this.shown = this._isCookieSet();
      if (this.shown) return;

      if (this.options.openOnExitIntent) {
        this._setupExitIntent();
      } else if (this.options.openAfterDelay !== null) {
        this._setupDelayTrigger();
      } else if (this.options.openAfterPageViews !== null) {
        this._setupPageViewsTrigger();
      } else if (this.options.openOnLoad) {
        this.show();
      }

      // New triggers — additive, each guards via _canTrigger() so they can combine safely
      if (this.options.openOnOutsideClick) this._setupOutsideClickTrigger();
      if (this.options.openOnElementMouseLeave) this._setupElementMouseLeaveTrigger();
      if (this.options.openOnElementHover) this._setupElementHoverTrigger();
      if (this.options.openOnTabBlur) this._setupTabBlurTrigger();
      if (this.options.openAfterScrollPercent !== null) this._setupScrollPercentTrigger();
      if (this.options.openAfterScrollPastElement) this._setupScrollPastElementTrigger();
      if (this.options.openAfterIdle !== null) this._setupIdleTrigger();
      if (this.options.openOnRageClick) this._setupRageClickTrigger();
      if (this.options.openOnSelectAbandon) this._setupSelectAbandonTrigger();
      if (this.options.openOnScrollSpeed) this._setupScrollSpeedTrigger();
      if (this.options.interceptLinks) this._setupLinkInterceptTrigger();
    }

    _canTrigger() {
      return !this._isCookieSet() && !this.isVisible && !this._animating;
    }

    destroy() {
      _log('destroy → ' + this.name);
      if (this._boundHandleMouseOut) {
        document.documentElement.removeEventListener('mouseout', this._boundHandleMouseOut);
      }
      if (this._boundHandleScroll) {
        document.removeEventListener('scroll', this._boundHandleScroll);
      }
      if (this._boundOpenHandler) {
        document.removeEventListener('click', this._boundOpenHandler);
      }
      if (this._boundCloseHandler) {
        document.removeEventListener('click', this._boundCloseHandler);
      }
      if (this._delayTimerId) {
        clearTimeout(this._delayTimerId);
      }
      if (this._idleTimerId) {
        clearTimeout(this._idleTimerId);
      }
      if (this._intersectionObserver) {
        this._intersectionObserver.disconnect();
        this._intersectionObserver = null;
      }
      while (this._cleanupFns.length) {
        try { this._cleanupFns.pop()(); } catch (e) { /* swallow — cleanup must not throw */ }
      }
      this.popupElement = null;
    }

    // ---- Public API ---------------------------------------------------------

    show() {
      if (!this.popupElement || this.isVisible || this._animating) return;

      _log('show → ' + this.name, { animation: this.options.animation });
      this.isVisible = true;

      if (this.options.lockScrollOnShow) {
        this._savedOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
      const anim = this._getAnimation();
      const dur = this.options.animationDuration;

      if (anim === ANIMATIONS.none) {
        this.popupElement.style.display = 'flex';
        if (typeof this.options.onOpen === 'function') this.options.onOpen(this);
        return;
      }

      this._animating = true;
      applyStyles(this.popupElement, anim.setup(dur));
      this.popupElement.style.display = 'flex';
      void this.popupElement.offsetHeight; // force reflow
      applyStyles(this.popupElement, anim.in());

      this.popupElement.addEventListener('transitionend', () => {
        this._animating = false;
        if (typeof this.options.onOpen === 'function') this.options.onOpen(this);
      }, { once: true });
    }

    hide() {
      if (!this.popupElement || !this.isVisible || this._animating) return;

      _log('hide → ' + this.name);
      this.isVisible = false;
      const anim = this._getAnimation();
      const dur = this.options.animationDuration;

      const afterHide = () => {
        this.popupElement.style.display = 'none';
        applyStyles(this.popupElement, anim.reset());
        this._animating = false;

        if (this.options.lockScrollOnShow) {
          document.body.style.overflow = this._savedOverflow || '';
        }

        if (typeof this.options.onClose === 'function') this.options.onClose(this);

        if (this._pendingNavigation) {
          const target = this._pendingNavigation;
          this._pendingNavigation = null;
          window.location.href = target;
        }
      };

      if (anim === ANIMATIONS.none) {
        afterHide();
        return;
      }

      this._animating = true;
      applyStyles(this.popupElement, anim.out(dur));
      this.popupElement.addEventListener('transitionend', afterHide, { once: true });
    }

    // ---- Animation helper ---------------------------------------------------

    _getAnimation() {
      return ANIMATIONS[this.options.animation] || ANIMATIONS.fade;
    }

    // ---- Triggers -----------------------------------------------------------

    _attachTriggers() {
      if (!this.popupElement) return;

      // --- Open triggers (delegated on document) ---
      if (this.options.openTriggerSelector) {
        this._boundOpenHandler = (e) => {
          const trigger = e.target.closest(this.options.openTriggerSelector);
          if (trigger) {
            e.preventDefault();
            this.show();
          }
        };
        document.addEventListener('click', this._boundOpenHandler);
      }

      // --- Close triggers (delegated on document) ---
      if (this.options.closeTriggerSelector) {
        this._boundCloseHandler = (e) => {
          const trigger = e.target.closest(this.options.closeTriggerSelector);
          if (trigger) {
            e.preventDefault();
            this._setCookie();
            this.hide();
          }
        };
        document.addEventListener('click', this._boundCloseHandler);
      }

      // --- Overlay backdrop click always closes ---
      this.popupElement.addEventListener('click', (e) => {
        if (e.target === this.popupElement) {
          this._setCookie();
          this.hide();
        }
      });
    }

    // ---- Exit Intent --------------------------------------------------------

    _setupExitIntent() {
      if (this.isMobile) {
        this._boundHandleScroll = () => {
          if (this.throttleTimer) return;
          this.throttleTimer = setTimeout(() => {
            this._handleMobileScroll();
            this.throttleTimer = null;
          }, 150);
        };
        document.addEventListener('scroll', this._boundHandleScroll);
      } else {
        this._boundHandleMouseOut = (e) => this._handleMouseOut(e);
        document.documentElement.addEventListener('mouseout', this._boundHandleMouseOut);
      }
    }

    _handleMouseOut(e) {
      if (this._isCookieSet() || this.isVisible) return;
      if (e.clientY <= 10) {
        _log('exit-intent triggered (desktop) → ' + this.name);
        this.show();
      }
    }

    _handleMobileScroll() {
      if (this._isCookieSet() || this.isVisible || this.scrollTriggered) return;

      const currentScrollY = window.scrollY;

      if (
        currentScrollY < this.lastScrollY &&
        this.lastScrollY - currentScrollY > 100 &&
        currentScrollY > 0
      ) {
        this.scrollTriggered = true;
        _log('exit-intent triggered (mobile scroll) → ' + this.name);
        this.show();
      }

      this.lastScrollY = currentScrollY <= 0 ? 0 : currentScrollY;
    }

    // ---- Delay trigger ------------------------------------------------------

    _setupDelayTrigger() {
      this._delayTimerId = setTimeout(() => {
        if (!this._isCookieSet() && !this.isVisible) {
          this.show();
        }
      }, this.options.openAfterDelay * 1000);
    }

    // ---- Page-views trigger -------------------------------------------------

    _updatePageViews() {
      let views = parseInt(sessionStorage.getItem(this.options.sessionStorageKey) || '0', 10);
      views++;
      sessionStorage.setItem(this.options.sessionStorageKey, views.toString());
      return views;
    }

    _getPageViews() {
      return parseInt(sessionStorage.getItem(this.options.sessionStorageKey) || '0', 10);
    }

    _setupPageViewsTrigger() {
      if (this._getPageViews() >= this.options.openAfterPageViews) {
        if (!this._isCookieSet() && !this.isVisible) {
          this.show();
        }
      }
    }

    // ---- Outside-click trigger ---------------------------------------------
    // Opens popup when the user clicks anywhere outside the configured element
    // (and outside the popup itself, to avoid loops once it's open).
    _setupOutsideClickTrigger() {
      const sel = this.options.openOnOutsideClick;
      const handler = (e) => {
        if (!this._canTrigger()) return;
        const inside = e.target.closest(sel);
        if (inside) return;
        if (this.popupElement && this.popupElement.contains(e.target)) return;
        _log('outside-click triggered → ' + this.name, sel);
        this.show();
      };
      document.addEventListener('click', handler, true);
      this._cleanupFns.push(() => document.removeEventListener('click', handler, true));
    }

    // ---- Element mouseleave trigger ----------------------------------------
    _setupElementMouseLeaveTrigger() {
      const els = document.querySelectorAll(this.options.openOnElementMouseLeave);
      if (!els.length) {
        console.warn(`[digi2.popups] "${this.name}" — openOnElementMouseLeave: no elements match ${this.options.openOnElementMouseLeave}`);
        return;
      }
      const handler = () => {
        if (!this._canTrigger()) return;
        _log('element-mouseleave triggered → ' + this.name);
        this.show();
      };
      els.forEach((el) => el.addEventListener('mouseleave', handler));
      this._cleanupFns.push(() => els.forEach((el) => el.removeEventListener('mouseleave', handler)));
    }

    // ---- Element hover trigger ---------------------------------------------
    _setupElementHoverTrigger() {
      const els = document.querySelectorAll(this.options.openOnElementHover);
      if (!els.length) {
        console.warn(`[digi2.popups] "${this.name}" — openOnElementHover: no elements match ${this.options.openOnElementHover}`);
        return;
      }
      const handler = () => {
        if (!this._canTrigger()) return;
        _log('element-hover triggered → ' + this.name);
        this.show();
      };
      els.forEach((el) => el.addEventListener('mouseenter', handler));
      this._cleanupFns.push(() => els.forEach((el) => el.removeEventListener('mouseenter', handler)));
    }

    // ---- Tab-blur trigger --------------------------------------------------
    // Fires once when the document becomes hidden (tab switch / window minimize).
    _setupTabBlurTrigger() {
      const handler = () => {
        if (document.visibilityState !== 'hidden') return;
        if (!this._canTrigger()) return;
        _log('tab-blur triggered → ' + this.name);
        this.show();
      };
      document.addEventListener('visibilitychange', handler);
      this._cleanupFns.push(() => document.removeEventListener('visibilitychange', handler));
    }

    // ---- Scroll-percent trigger --------------------------------------------
    _setupScrollPercentTrigger() {
      const target = Math.max(0, Math.min(100, this.options.openAfterScrollPercent));
      let throttle = null;
      const check = () => {
        const doc = document.documentElement;
        const scrollable = (doc.scrollHeight - doc.clientHeight) || 1;
        const pct = (window.scrollY / scrollable) * 100;
        if (pct < target) return;
        if (!this._canTrigger()) return;
        _log('scroll-percent triggered → ' + this.name, { pct: pct.toFixed(1), target });
        this.show();
      };
      const handler = () => {
        if (throttle) return;
        throttle = setTimeout(() => { check(); throttle = null; }, 100);
      };
      document.addEventListener('scroll', handler, { passive: true });
      this._cleanupFns.push(() => {
        document.removeEventListener('scroll', handler);
        if (throttle) clearTimeout(throttle);
      });
      check(); // initial check in case page loads already past the threshold
    }

    // ---- Scroll-past-element trigger ---------------------------------------
    _setupScrollPastElementTrigger() {
      const el = document.querySelector(this.options.openAfterScrollPastElement);
      if (!el) {
        console.warn(`[digi2.popups] "${this.name}" — openAfterScrollPastElement: no element matches ${this.options.openAfterScrollPastElement}`);
        return;
      }
      this._intersectionObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (!this._canTrigger()) return;
          _log('scroll-past-element triggered → ' + this.name);
          this.show();
          this._intersectionObserver.disconnect();
          this._intersectionObserver = null;
          return;
        }
      });
      this._intersectionObserver.observe(el);
    }

    // ---- Idle trigger ------------------------------------------------------
    // Opens popup after N seconds with no mouse, scroll, keyboard, or touch input.
    _setupIdleTrigger() {
      const ms = this.options.openAfterIdle * 1000;
      const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
      const fire = () => {
        if (!this._canTrigger()) return;
        _log('idle triggered → ' + this.name);
        this.show();
      };
      const reset = () => {
        if (this._idleTimerId) clearTimeout(this._idleTimerId);
        this._idleTimerId = setTimeout(fire, ms);
      };
      events.forEach((ev) => document.addEventListener(ev, reset, { passive: true }));
      this._cleanupFns.push(() => events.forEach((ev) => document.removeEventListener(ev, reset)));
      reset(); // start the timer
    }

    // ---- Rage-click trigger ------------------------------------------------
    // Opens popup when N rapid clicks happen within rageClickWindow ms.
    _setupRageClickTrigger() {
      const threshold = typeof this.options.openOnRageClick === 'number'
        ? this.options.openOnRageClick
        : 3;
      const windowMs = this.options.rageClickWindow;
      const handler = () => {
        const now = Date.now();
        this._rageClicks.push(now);
        // keep only clicks inside the rolling window
        this._rageClicks = this._rageClicks.filter((t) => now - t <= windowMs);
        if (this._rageClicks.length < threshold) return;
        if (!this._canTrigger()) {
          this._rageClicks = [];
          return;
        }
        _log('rage-click triggered → ' + this.name, { clicks: this._rageClicks.length });
        this._rageClicks = [];
        this.show();
      };
      document.addEventListener('click', handler);
      this._cleanupFns.push(() => document.removeEventListener('click', handler));
    }

    // ---- Select-abandon trigger --------------------------------------------
    // Fires when the user focuses a <select> inside the configured form/container,
    // does NOT change its value to a non-default selection, and then mouses out
    // of the container. If any select inside the container is changed to a
    // non-default value, the popup is suppressed for the lifetime of the form.
    _setupSelectAbandonTrigger() {
      const sel = this.options.openOnSelectAbandon;
      const form = document.querySelector(sel);
      if (!form) {
        console.warn(`[digi2.popups] "${this.name}" — openOnSelectAbandon: no element matches ${sel}`);
        return;
      }
      const selects = form.querySelectorAll('select');
      if (!selects.length) {
        console.warn(`[digi2.popups] "${this.name}" — openOnSelectAbandon: no <select> elements inside ${sel}`);
        return;
      }

      // Snapshot the initial value of each select so we can tell whether the
      // user actually changed it (vs. reverting back to the page-load value).
      const initialValues = new Map();
      selects.forEach((s) => initialValues.set(s, s.value));
      const selectsArr = Array.from(selects);

      let interacted = false;
      let selected = false;
      let mouseInside = true;

      const tryFire = () => {
        if (!interacted || selected) return;
        if (mouseInside) return;
        // Only guard when a *non-select* field in the form is focused — that
        // means the user is engaged elsewhere. If the select itself is still
        // focused while the mouse is outside the form, the dropdown was
        // already dismissed (the OS suspends mouse events while it's open,
        // so we wouldn't have gotten mouseleave otherwise).
        const ae = document.activeElement;
        if (ae && form.contains(ae) && !selectsArr.includes(ae)) return;
        if (!this._canTrigger()) return;
        _log('select-abandon triggered → ' + this.name);
        this.show();
      };

      const onFocus = () => { interacted = true; };
      const onChange = (e) => {
        const s = e.target;
        const initial = initialValues.get(s);
        if (s.value !== '' && s.value !== initial) selected = true;
      };
      // setTimeout 0 lets document.activeElement settle before we read it.
      const onBlur = () => setTimeout(tryFire, 0);
      const onEnter = () => { mouseInside = true; };
      const onLeave = () => { mouseInside = false; tryFire(); };

      selects.forEach((s) => {
        s.addEventListener('focus', onFocus);
        s.addEventListener('change', onChange);
        s.addEventListener('blur', onBlur);
      });
      form.addEventListener('mouseenter', onEnter);
      form.addEventListener('mouseleave', onLeave);

      this._cleanupFns.push(() => {
        selects.forEach((s) => {
          s.removeEventListener('focus', onFocus);
          s.removeEventListener('change', onChange);
          s.removeEventListener('blur', onBlur);
        });
        form.removeEventListener('mouseenter', onEnter);
        form.removeEventListener('mouseleave', onLeave);
      });
    }

    // ---- Scroll-speed trigger ----------------------------------------------
    // Fires when the user scrolls faster than `speed` px/sec. Accepts either a
    // bare number (any direction) or { speed, direction: 'up' | 'down' | 'any' }.
    // Velocity is computed per scroll event; samples shorter than 10 ms or longer
    // than 200 ms are skipped to avoid noise from coalesced/stale events.
    _setupScrollSpeedTrigger() {
      const opt = this.options.openOnScrollSpeed;
      const cfg = typeof opt === 'number'
        ? { speed: opt, direction: 'any' }
        : { speed: opt.speed || 2500, direction: opt.direction || 'any' };

      let lastY = window.scrollY;
      let lastT = performance.now();

      const handler = () => {
        const now = performance.now();
        const y = window.scrollY;
        const dt = now - lastT;
        const dy = y - lastY;
        lastY = y;
        lastT = now;

        if (dt < 10 || dt > 200) return;
        if (dy === 0) return;

        const speed = Math.abs(dy) / dt * 1000; // px/sec
        const direction = dy < 0 ? 'up' : 'down';

        if (speed < cfg.speed) return;
        if (cfg.direction !== 'any' && cfg.direction !== direction) return;
        if (!this._canTrigger()) return;

        _log('scroll-speed triggered → ' + this.name, { speed: Math.round(speed), direction });
        this.show();
      };

      document.addEventListener('scroll', handler, { passive: true });
      this._cleanupFns.push(() => document.removeEventListener('scroll', handler));
    }

    // ---- Link-intercept trigger --------------------------------------------
    // Catches <a> clicks, shows the popup, and navigates after the popup closes.
    // Skips: target=_blank, modifier-key clicks (cmd/ctrl/shift/alt/middle),
    // hash-only links, mailto:/tel:/javascript: protocols, and links inside the
    // popup itself. If the dismissal cookie/flag is already set we never
    // intercept — user has seen it once, let them navigate freely.
    _setupLinkInterceptTrigger() {
      const opt = this.options.interceptLinks;
      const filter = typeof opt === 'string' ? opt : 'a[href]';

      const handler = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (this._isCookieSet() || this.isVisible || this._animating) return;

        const link = e.target.closest(filter);
        if (!link) return;
        if (this.popupElement && this.popupElement.contains(link)) return;

        const target = link.getAttribute('target');
        if (target === '_blank' || target === '_new') return;

        const href = link.getAttribute('href');
        if (!href) return;
        if (href.startsWith('#')) return;
        if (/^(javascript:|mailto:|tel:|sms:)/i.test(href)) return;

        e.preventDefault();
        this._pendingNavigation = link.href;
        _log('link-intercept triggered → ' + this.name, link.href);
        this.show();
      };

      document.addEventListener('click', handler);
      this._cleanupFns.push(() => document.removeEventListener('click', handler));
    }

    // ---- Cookie helpers -----------------------------------------------------

    _isCookieSet() {
      if (this._dismissed) return true;
      if (!this.options.cookieName) return false;
      return this._getCookie() === 'true';
    }

    _setCookie() {
      this._dismissed = true;
      if (!this.options.cookieName) return;
      const date = new Date();
      date.setTime(date.getTime() + this.options.cookieDurationDays * 24 * 60 * 60 * 1000);
      document.cookie = `${this.options.cookieName}=true;expires=${date.toUTCString()};path=/`;
    }

    _getCookie() {
      if (!this.options.cookieName) return '';
      const name = this.options.cookieName + '=';
      const decoded = decodeURIComponent(document.cookie);
      const parts = decoded.split(';');
      for (let i = 0; i < parts.length; i++) {
        let c = parts[i].trimStart();
        if (c.indexOf(name) === 0) {
          return c.substring(name.length);
        }
      }
      return '';
    }

    // ---- URL filters --------------------------------------------------------

    _shouldContainUrl() {
      const href = window.location.href;
      return this.options.containsUrls.some((url) => {
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return href === url;
        }
        return new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(href);
      });
    }

    _shouldExcludeUrl() {
      const href = window.location.href;
      return this.options.excludeUrls.some((url) => {
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return href === url;
        }
        return new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(href);
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Register module on digi2 namespace
  // ---------------------------------------------------------------------------
  const registry = {};

  window.digi2.popups = {
    create(name, options = {}) {
      if (registry[name]) {
        console.warn(`[digi2.popups] "${name}" already exists. Destroy it first or use a different name.`);
        return registry[name];
      }
      const instance = new PopupManager(name, options);
      registry[name] = instance;
      return instance;
    },

    get(name) {
      return registry[name];
    },

    destroy(name) {
      const instance = registry[name];
      if (instance) {
        instance.destroy();
        delete registry[name];
      }
    },

    list() {
      return Object.keys(registry);
    },

    /**
     * Show a popup by name.
     * @param {string} name
     */
    show(name) {
      const instance = registry[name];
      if (!instance) {
        console.warn(`[digi2.popups] "${name}" not found. Create it first.`);
        return;
      }
      instance.show();
    },

    /**
     * Close a popup by name.
     * @param {string} name
     * @param {boolean} setCookie — set dismissal cookie (default: true)
     */
    close(name, setCookie) {
      const instance = registry[name];
      if (!instance) {
        console.warn(`[digi2.popups] "${name}" not found.`);
        return;
      }
      if (setCookie !== false) instance._setCookie();
      instance.hide();
    },
  };

  // ---------------------------------------------------------------------------
  // Global delegated listener for d2-show-popup="popupName"
  // One listener for all popups — clicks anywhere on the page are caught here.
  // Only triggers if the matching instance has dataTagTrigger: true (default).
  // ---------------------------------------------------------------------------
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[d2-show-popup]');
    if (!trigger) return;

    var name = trigger.getAttribute('d2-show-popup');
    var instance = registry[name];
    if (instance && instance.options.dataTagTrigger) {
      e.preventDefault();
      _log('data-tag trigger clicked → ' + name, trigger);
      instance.show();
    }
  });
})();
