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
        dataTagTrigger: true,         // listen for data-d2-show-popup="name" clicks globally
        cookieName: 'popup_clicked',
        cookieDurationDays: 1,
        openOnLoad: true,
        animation: 'fade',           // none | fade | slide-up | slide-down | slide-left | slide-right | zoom
        animationDuration: 0.4,
        excludeUrls: [],
        containsUrls: ['/'],
        openAfterDelay: null,
        openOnExitIntent: false,
        openAfterPageViews: null,
        sessionStorageKey: 'popupPageViews',
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
      this.popupElement = null;
    }

    // ---- Public API ---------------------------------------------------------

    show() {
      if (!this.popupElement || this.isVisible || this._animating) return;

      _log('show → ' + this.name, { animation: this.options.animation });
      this.isVisible = true;
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
        if (typeof this.options.onClose === 'function') this.options.onClose(this);
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

    // ---- Cookie helpers -----------------------------------------------------

    _isCookieSet() {
      return this._getCookie() === 'true';
    }

    _setCookie() {
      const date = new Date();
      date.setTime(date.getTime() + this.options.cookieDurationDays * 24 * 60 * 60 * 1000);
      document.cookie = `${this.options.cookieName}=true;expires=${date.toUTCString()};path=/`;
    }

    _getCookie() {
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
  // Global delegated listener for data-d2-show-popup="popupName"
  // One listener for all popups — clicks anywhere on the page are caught here.
  // Only triggers if the matching instance has dataTagTrigger: true (default).
  // ---------------------------------------------------------------------------
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-d2-show-popup]');
    if (!trigger) return;

    var name = trigger.getAttribute('data-d2-show-popup');
    var instance = registry[name];
    if (instance && instance.options.dataTagTrigger) {
      e.preventDefault();
      _log('data-tag trigger clicked → ' + name, trigger);
      instance.show();
    }
  });
})();
