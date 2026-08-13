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

  // Fire-and-forget bus event. The datalayer module listens to these and maps
  // them onto GA4; a page without it is unaffected.
  function _emitEvent(name, data) {
    try {
      if (window.digi2 && typeof window.digi2.emit === 'function') window.digi2.emit(name, data || {});
    } catch (e) { /* a listener must never break the module */ }
  }

  // Run a site-supplied callback without letting it take the module down with
  // it. A typo in onClose/canShow used to throw straight through show()/hide(),
  // which silently disabled the popup for every visitor — the only trace being
  // an uncaught error nobody reads. Now it warns, names the callback and the
  // popup, and carries on.
  //   Returns `fallback` when the callback throws (or isn't a function), so a
  //   broken canShow() can default to "allowed" rather than muting the popup.
  function _safeCall(fn, popupName, label, arg, fallback) {
    if (typeof fn !== 'function') return fallback;
    try {
      return fn(arg);
    } catch (e) {
      console.warn('[digi2.popups] "' + popupName + '" — ' + label + '() threw; ignoring it. '
        + 'Fix the callback: ' + (e && e.message ? e.message : e));
      _log(label + '() threw → ' + popupName, { error: e && e.message });
      return fallback;
    }
  }

  // Responsive-value resolver. If `raw` is a string with the responsive
  // syntax ("value;value@maxWidth"), pick the bucket that matches the current
  // viewport. Non-strings (numbers, null, etc.) pass through untouched so
  // existing JS-API options keep working.
  function resolveResponsiveValue(raw) {
    if (typeof raw !== 'string') return raw;
    if (window.digi2 && typeof window.digi2.parseResponsive === 'function') {
      var parsed = window.digi2.parseResponsive(raw);
      if (parsed.bps.length === 0) return raw; // not a responsive string
      var v = window.digi2.resolveResponsive(parsed);
      return v === '' ? raw : v;
    }
    return raw;
  }

  // Responsive-aware getAttribute. Falls back to raw read when the loader
  // hasn't installed digi2.attr yet (older builds, standalone usage).
  function attr(el, name) {
    if (!el) return null;
    if (window.digi2 && typeof window.digi2.attr === 'function') {
      return window.digi2.attr(el, name, null);
    }
    return el.getAttribute(name);
  }

  function _pad2(v) {
    v = String(v);
    return v.length < 2 ? '0' + v : v;
  }

  // Parse one side of a schedule range ("YYYY-MM-DD[ HH:MM[:SS]]").
  // Returns a local-time timestamp (number), null for a blank/omitted bound,
  // or undefined when a value is present but cannot be parsed.
  function _parseScheduleDate(str, isEnd) {
    if (str == null) return null;
    var s = String(str).trim();
    if (!s) return null;

    // Accept a space or ISO "T" between date and time.
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (!m) return undefined;

    var hh = m[4], mm = m[5], ss = m[6];
    if (hh == null) {
      // Date only → start of day, or end of day for the upper bound.
      hh = isEnd ? '23' : '00';
      mm = isEnd ? '59' : '00';
      ss = isEnd ? '59' : '00';
    }
    // Date-time forms without an offset are parsed as local time (per spec).
    var iso = m[1] + '-' + m[2] + '-' + m[3] + 'T' +
      _pad2(hh) + ':' + mm + ':' + (ss != null ? ss : '00');
    var t = new Date(iso).getTime();
    return isNaN(t) ? undefined : t;
  }

  // ---------------------------------------------------------------------------
  // PopupManager (internal)
  // ---------------------------------------------------------------------------
  class PopupManager {
    constructor(name, options = {}) {
      this.name = name;
      // Kept so defaults can tell "not set" from "set to the default value".
      this._rawOptions = options || {};

      this.options = {
        popupSelector: '.popup__overlay',
        openTriggerSelector: null,   // CSS selector — clicks open this popup
        closeTriggerSelector: null,   // CSS selector — clicks close this popup (in addition to overlay click)
        dataTagTrigger: true,         // listen for d2-show-popup="name" clicks globally
        cookieName: 'popup_clicked',
        cookieDurationDays: 1,
        setCookieOnClose: true,       // false → closing does NOT suppress the popup;
                                      // call instance.markSeen() when the goal is met
                                      // (video watched to the end, offer claimed, …)
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
        schedule: null,               // { from, to } or "YYYY-MM-DD HH:MM, YYYY-MM-DD HH:MM" — only show within this window (either bound may be blank for open-ended). Also read from d2-popup-schedule / data-d2-popup-schedule on the popup element.
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
        interceptLinks: false,            // boolean | CSS selector | { device: 'mobile'|'desktop'|'both', selector } — intercept link clicks, show popup first, navigate on close (skips #hash, mailto:, tel:, javascript:, target=_blank, modifier-key clicks)
        // ---- Video ---------------------------------------------------------
        // true → wire the first <video> in the popup. Or pass a selector, or
        // { selector, unmuteSelector, autoplay, resetOnClose, cookieOnEnd,
        //   closeOnEnd }. See _setupVideo() for what each one does.
        video: null,
        // ---- Callbacks -----------------------------------------------------
        canShow: null,                // () => boolean — vetoes show() from any
                                      // trigger. Returning false parks the request;
                                      // showIfPending() replays it later. Use it to
                                      // sequence popups: canShow: () => !other.isVisible
        onOpen: null,
        onClose: null,
        ...options,
      };

      this.popupElement = null;
      this.shown = false;
      this.isVisible = false;
      this.pendingShow = false;
      this._video = null;
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
      // Internal close listeners (used by sequences). Kept apart from the
      // site's onClose so neither can silence the other.
      this._closeHooks = [];
      this._idleTimerId = null;
      this._rageClicks = [];
      this._intersectionObserver = null;

      // Seed the active animation/duration from current options so any
      // pre-show inspection sees a sensible value.
      this._refreshResponsiveOpts();

      this._init();
    }

    // ---- Lifecycle ----------------------------------------------------------

    _init() {
      this.popupElement = document.querySelector(this.options.popupSelector);

      // create() called from <head>, before the markup exists? digi2.onReady()
      // only means "modules loaded" — the loader fetches them asynchronously and
      // regularly finishes before <body> is parsed. Wait for the DOM and retry
      // instead of leaving the popup permanently dead.
      if (!this.popupElement && document.readyState === 'loading' && !this._awaitingDom) {
        this._awaitingDom = true;
        var self = this;
        document.addEventListener('DOMContentLoaded', function () {
          self._awaitingDom = false;
          self._init();
        }, { once: true });
        return;
      }

      // Element-level URL filters must merge BEFORE the URL gate below.
      if (this.popupElement) this._mergeUrlFilterAttributes();

      if (this._shouldExcludeUrl() || !this._shouldContainUrl()) {
        // Hard-block every entry point on this URL — including direct show()
        // calls and d2-show-popup click triggers.
        this._urlBlocked = true;
        return;
      }

      if (!this.popupElement) {
        console.warn(
          `[digi2.popups] "${this.name}" — element not found: ${this.options.popupSelector}`
          + ' (if the markup exists, move this create() call to Before </body> —'
          + ' from <head> it can run before the element is parsed)'
        );
        return;
      }

      this.isMobile = /Mobi|Android/i.test(navigator.userAgent);
      this.lastScrollY = window.scrollY;

      this._parseScheduleOption();

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

      if (this.options.video) this._setupVideo();
    }

    // ---- Video --------------------------------------------------------------
    // A popup holding a <video> has to do four things nobody wants to rewrite
    // per site: start on open, stop and rewind on close, survive an autoplay
    // rejection, and (optionally) treat "watched to the end" as the real goal
    // rather than "dismissed".

    _setupVideo() {
      var opt = this.options.video;
      var cfg = (typeof opt === 'object' && opt !== null) ? opt : {};
      if (typeof opt === 'string') cfg = { selector: opt };

      this._video = {
        autoplay:     cfg.autoplay !== false,
        resetOnClose: cfg.resetOnClose !== false,
        cookieOnEnd:  cfg.cookieOnEnd === true,
        closeOnEnd:   cfg.closeOnEnd === true,
      };

      // "Cookie when the film ends" and "cookie when they close it" contradict
      // each other — closing always happens first, so the end-of-film rule would
      // never fire. Assume the intent unless the site said otherwise explicitly.
      if (this._video.cookieOnEnd && !('setCookieOnClose' in this._rawOptions)) {
        this.options.setCookieOnClose = false;
      }

      var el = cfg.selector
        ? this.popupElement.querySelector(cfg.selector)
        : this.popupElement.querySelector('video');

      if (!el) {
        console.warn('[digi2.popups] "' + this.name + '" — video: no <video> found in '
          + this.options.popupSelector);
        this._video = null;
        return;
      }
      this._video.el = el;

      // Muting is what makes autoplay legal, so an unmute affordance matters —
      // on iOS the native controls hide during playback and there is no other
      // way back to sound.
      var unmuteSel = cfg.unmuteSelector || '[d2-popup-unmute], [data-popup="unmute"]';
      var unmute = this.popupElement.querySelector(unmuteSel);
      if (unmute) {
        this._video.unmute = unmute;
        var onUnmute = () => {
          el.muted = false;
          el.volume = 1;
          var p = el.play();
          if (p && p.catch) p.catch(() => {});
          unmute.style.display = 'none';
          _emitEvent('popup:video-unmute', { name: this.name });
        };
        unmute.addEventListener('click', onUnmute);
        this._cleanupFns.push(() => unmute.removeEventListener('click', onUnmute));
      }

      var onEnded = () => {
        _emitEvent('popup:video-end', { name: this.name });
        if (this._video.cookieOnEnd) this._setCookie();
        if (this._video.closeOnEnd) this.hide();
      };
      el.addEventListener('ended', onEnded);
      this._cleanupFns.push(() => el.removeEventListener('ended', onEnded));

      _log('video wired → ' + this.name, { cookieOnEnd: this._video.cookieOnEnd });
    }

    _videoPlay() {
      var v = this._video;
      if (!v || !v.el) return;
      // preload="none" + data-src: don't fetch the file until it's actually needed.
      var lazy = v.el.getAttribute('data-src');
      if (!v.el.getAttribute('src') && lazy) v.el.setAttribute('src', lazy);
      if (v.unmute) v.unmute.style.display = v.el.muted ? '' : 'none';
      if (!v.autoplay) return;
      try {
        var p = v.el.play();
        // Safari/iOS can still refuse — fall back to the native controls.
        if (p && p.catch) p.catch(() => {});
      } catch (e) { /* no-op */ }
    }

    _videoStop() {
      var v = this._video;
      if (!v || !v.el || !v.resetOnClose) return;
      try {
        v.el.pause();
        v.el.currentTime = 0;
        v.el.muted = true;            // next open starts silent and autoplayable
      } catch (e) { /* no-op */ }
      if (v.unmute) v.unmute.style.display = '';
    }

    _canTrigger() {
      return !this._isCookieSet() && !this.isVisible && !this._animating && this._isWithinSchedule();
    }

    // ---- Scheduling ---------------------------------------------------------
    // Reads `schedule` from options, falling back to the popup element's
    // d2-popup-schedule / data-d2-popup-schedule attribute. Accepted forms:
    //   { from: "YYYY-MM-DD HH:MM", to: "YYYY-MM-DD HH:MM" }   (JS API)
    //   "YYYY-MM-DD HH:MM, YYYY-MM-DD HH:MM"                   (string / attribute)
    // Only shows within [from, to]. Either bound may be blank/omitted for an
    // open-ended window:
    //   { from: "2026-06-29 18:00" }   → from this moment on
    //   ",2026-07-01 23:59"            → until this moment
    // Parsed in the visitor's local timezone. A date with no time defaults to
    // 00:00 for the start bound and 23:59:59 for the end bound of that day.
    _parseScheduleOption() {
      var raw = this.options.schedule;
      if (raw == null && this.popupElement) {
        raw = attr(this.popupElement, 'd2-popup-schedule');
        if (raw == null) raw = this.popupElement.getAttribute('data-d2-popup-schedule');
      }

      this._schedule = null;
      if (raw == null) return;

      var fromRaw, toRaw;
      if (typeof raw === 'object') {
        fromRaw = raw.from;
        toRaw = raw.to;
      } else {
        if (String(raw).trim() === '') return;
        var parts = String(raw).split(',');
        fromRaw = parts[0];
        toRaw = parts.length > 1 ? parts[1] : null;
      }

      var start = _parseScheduleDate(fromRaw, false);
      var end = _parseScheduleDate(toRaw, true);

      if (start === undefined || end === undefined) {
        console.warn('[digi2.popups] "' + this.name + '" — invalid schedule: ' + JSON.stringify(raw));
      }
      // `undefined` = present but unparseable → ignore that bound rather than
      // suppressing the popup forever.
      start = typeof start === 'number' ? start : null;
      end = typeof end === 'number' ? end : null;
      if (start === null && end === null) return;

      this._schedule = { start: start, end: end };
    }

    _isWithinSchedule() {
      if (!this._schedule) return true;
      var now = Date.now();
      if (this._schedule.start !== null && now < this._schedule.start) return false;
      if (this._schedule.end !== null && now > this._schedule.end) return false;
      return true;
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
      if (this._urlBlocked) {
        _log('show suppressed — URL excluded → ' + this.name);
        return;
      }
      if (!this.popupElement || this.isVisible || this._animating) return;
      if (!this._isWithinSchedule()) {
        _log('show suppressed — outside schedule → ' + this.name, this._schedule);
        return;
      }

      // A veto is not a cancellation: remember that this popup wanted to open so
      // showIfPending() can let it through once the blocker clears (typically
      // another popup closing). Without this the delay trigger fires once into
      // the void and the popup never appears at all.
      // A throwing canShow() must not mute the popup — default to letting it
      // through, so a broken veto degrades to "no veto" instead of silence.
      if (!_safeCall(this.options.canShow, this.name, 'canShow', this, true)) {
        this.pendingShow = true;
        _log('show deferred — canShow() returned false → ' + this.name);
        return;
      }
      this.pendingShow = false;

      // Resolve responsive option strings (e.g. animation: 'fade;slide-up@911')
      // at show time so breakpoint changes take effect without re-create.
      this._refreshResponsiveOpts();

      _log('show → ' + this.name, { animation: this._activeAnimation });
      this.isVisible = true;

      if (this.options.lockScrollOnShow) {
        this._savedOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
      const anim = this._getAnimation();
      const dur = this._activeAnimationDuration;

      if (anim === ANIMATIONS.none) {
        this.popupElement.style.display = 'flex';
        this._videoPlay();
        _emitEvent('popup:open', { name: this.name });
        _safeCall(this.options.onOpen, this.name, 'onOpen', this);
        return;
      }

      this._animating = true;
      applyStyles(this.popupElement, anim.setup(dur));
      this.popupElement.style.display = 'flex';
      this._videoPlay();
      void this.popupElement.offsetHeight; // force reflow
      applyStyles(this.popupElement, anim.in());

      this.popupElement.addEventListener('transitionend', () => {
        this._animating = false;
        _emitEvent('popup:open', { name: this.name });
        _safeCall(this.options.onOpen, this.name, 'onOpen', this);
      }, { once: true });
    }

    /**
     * Subscribe to this popup's close, internally. Returns an unsubscribe fn.
     * Not part of the public API: sites use the onClose option.
     */
    _onCloseInternal(fn) {
      this._closeHooks.push(fn);
      return () => {
        const i = this._closeHooks.indexOf(fn);
        if (i !== -1) this._closeHooks.splice(i, 1);
      };
    }

    /**
     * Replay a show() that canShow() previously vetoed. Safe to call blindly —
     * it does nothing unless this popup actually asked to open.
     */
    showIfPending() {
      if (!this.pendingShow) return false;
      this.pendingShow = false;
      this.show();
      return this.isVisible;
    }

    /**
     * Write the suppression cookie without closing anything. This is the other
     * half of setCookieOnClose:false — the popup stays repeatable until the goal
     * is actually met, then you call this to stop showing it.
     */
    markSeen() {
      this._setCookie();
    }

    /**
     * Has this visitor already dismissed (or been marked as having seen) this
     * popup? show() deliberately ignores the cookie — it's an explicit command —
     * so chained popups need this to avoid re-opening something already closed:
     *   onClose: function () { if (!contact.wasSeen()) contact.show() }
     */
    wasSeen() {
      return this._isCookieSet();
    }

    // Closing by overlay/close-button. Whether that counts as "seen" is the
    // site's call: a promo is done once dismissed, a video popup should come
    // back until it has actually been watched.
    _closeByUser() {
      if (this.options.setCookieOnClose) this._setCookie();
      this.hide();
    }

    hide() {
      if (!this.popupElement || !this.isVisible || this._animating) return;

      // Re-resolve in case the breakpoint flipped while the popup was open.
      this._refreshResponsiveOpts();

      _log('hide → ' + this.name);
      this.isVisible = false;
      // Kill the sound now, not after the fade-out finishes.
      this._videoStop();
      const anim = this._getAnimation();
      const dur = this._activeAnimationDuration;

      const afterHide = () => {
        this.popupElement.style.display = 'none';
        applyStyles(this.popupElement, anim.reset());
        this._animating = false;

        if (this.options.lockScrollOnShow) {
          document.body.style.overflow = this._savedOverflow || '';
        }

        _emitEvent('popup:close', { name: this.name });
        _safeCall(this.options.onClose, this.name, 'onClose', this);
        // After the site's own handler, so a sequence advancing to its next
        // step never pre-empts an onClose that hands off to another popup.
        this._closeHooks.slice().forEach((fn) => {
          try { fn(this); } catch (e) { /* a hook must never break the close */ }
        });

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
      var key = this._activeAnimation || this.options.animation;
      return ANIMATIONS[key] || ANIMATIONS.fade;
    }

    // Resolve any option strings that support the responsive `value;v@max`
    // syntax. Cached on the instance as `_active*` so show()/hide() share a
    // consistent resolution across the open→close transition.
    _refreshResponsiveOpts() {
      this._activeAnimation = resolveResponsiveValue(this.options.animation);
      var dur = resolveResponsiveValue(this.options.animationDuration);
      // Allow numeric strings ("0.4") in the responsive syntax.
      if (typeof dur === 'string') {
        var n = parseFloat(dur);
        dur = isNaN(n) ? this.options.animationDuration : n;
      }
      this._activeAnimationDuration = dur;
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
            this._closeByUser();
          }
        };
        document.addEventListener('click', this._boundCloseHandler);
      }

      // --- Overlay backdrop click always closes ---
      this.popupElement.addEventListener('click', (e) => {
        if (e.target === this.popupElement) this._closeByUser();
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
      let filter = 'a[href]';
      let device = 'both';
      if (typeof opt === 'string') {
        filter = opt;
      } else if (opt && typeof opt === 'object') {
        if (opt.selector) filter = opt.selector;
        if (opt.device) device = opt.device;
      }
      if (device === 'mobile' && !this.isMobile) return;
      if (device === 'desktop' && this.isMobile) return;

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

    // Element-level URL filters, readable straight from the Designer:
    //   d2-popup-exclude="/wyszukiwarka|/kontakt"  → never on these subpages
    //   d2-popup-include="/oferta|/produkty"       → ONLY on these subpages
    // Values are pipe-separated URL fragments (matched against location.href,
    // same semantics as excludeUrls/containsUrls); data-d2-popup-* also works.
    // Exclude entries append to options.excludeUrls; include REPLACES
    // options.containsUrls (turning the default match-everything into a
    // whitelist).
    _mergeUrlFilterAttributes() {
      const el = this.popupElement;
      const read = (name) => {
        let raw = attr(el, name);
        if (raw == null) raw = el.getAttribute('data-' + name);
        if (raw == null || raw === '') return null;
        const list = String(raw).split('|').map((s) => s.trim()).filter(Boolean);
        return list.length ? list : null;
      };
      const exclude = read('d2-popup-exclude');
      if (exclude) this.options.excludeUrls = (this.options.excludeUrls || []).concat(exclude);
      const include = read('d2-popup-include');
      if (include) this.options.containsUrls = include;
    }

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

  // ---------------------------------------------------------------------------
  // Sequence — one chain of popups spread across a whole visit
  //
  //   digi2.popups.sequence([
  //     { popup: 'welcome',    after: 4 },                          // 4 s after arrival
  //     { popup: 'oferta',     after: 60, afterPageChange: true },  // 1 min, on another page
  //     { popup: 'newsletter', after: 180 },                        // 3 min after the last close
  //     { popup: 'kontakt',    after: 180 },                        // 3 min more, then silence
  //   ])
  //
  // Why this can't be built from openAfterDelay: that timer starts at page
  // load, so every navigation resets it. A visit-long chain needs a clock that
  // survives navigation (sessionStorage) and steps that start counting from
  // the previous popup's CLOSE, not from the pageview.
  //
  // The clock only advances while the tab is visible — someone who leaves a
  // tab open for an hour comes back to the step they were on, not to three
  // popups at once.
  //
  // Popups in a sequence should be created WITHOUT their own auto-triggers
  // (no openOnLoad / openAfterDelay) — the sequence is what opens them.
  // ---------------------------------------------------------------------------
  const SEQ_TICK_MS = 1000;
  const SEQ_STATE_VERSION = 1;

  function _seqPath() {
    try { return window.location.pathname || '/'; } catch (e) { return '/'; }
  }

  function _seqHidden() {
    return typeof document.visibilityState === 'string' && document.visibilityState === 'hidden';
  }

  // Accepts { popup, after, afterPageChange } or a bare popup name.
  function _normalizeStep(step) {
    if (!step) return null;
    if (typeof step === 'string') step = { popup: step };
    const name = step.popup || step.name;
    if (!name) return null;
    const after = parseFloat(step.after);
    return {
      popup: name,
      after: isNaN(after) ? 0 : Math.max(0, after),
      afterPageChange: step.afterPageChange === true || step.requirePageChange === true,
    };
  }

  class D2PopupSequence {
    constructor(steps, options = {}) {
      this.steps = (steps || []).map(_normalizeStep).filter(Boolean);
      this.storageKey = options.storageKey || 'd2PopupSequence';
      this._timerId = null;
      this._stopped = false;
      this._warned = {};

      if (!this.steps.length) {
        console.warn('[digi2.popups] sequence() needs at least one step.');
        return;
      }

      this.state = this._loadState();

      // Navigating away with the popup still open counts as dismissal —
      // otherwise the chain waits forever for a close that already scrolled
      // off with the old document.
      if (this.state.pending) {
        const leftOn = this.state.shownPath;
        this._advance();
        // That dismissal happened as they left the previous page, so a
        // following afterPageChange step is already satisfied by this
        // navigation — measure against the page they left, not this one.
        if (leftOn) { this.state.path = leftOn; this._save(); }
      }

      this._lastTickAt = Date.now();
      // Returning from a background tab must not credit the time spent away:
      // restart the delta from now.
      document.addEventListener('visibilitychange', () => { this._lastTickAt = Date.now(); });

      this._warnSharedCookies();
      this._evaluate();     // a step may already be due the moment this page loads
      this._tick();
      _log('sequence started', this.status());
    }

    // cookieName defaults to the same 'popup_clicked' for every popup, which is
    // harmless on its own but silently eats a chain: closing step one marks
    // step two as already seen, and the sequence skips straight to the end.
    _warnSharedCookies() {
      const seen = {};
      this.steps.forEach((step) => {
        const inst = registry[step.popup];
        const cookie = inst && inst.options.cookieName;
        if (!cookie) return;
        // The same popup listed twice is a deliberate repeat, not a clash.
        if (seen[cookie] && seen[cookie] !== step.popup) {
          console.warn(`[digi2.popups] sequence steps "${seen[cookie]}" and "${step.popup}" share `
            + `cookieName "${cookie}" — closing one marks the other as seen and it will be skipped. `
            + 'Give each step its own cookieName (or null).');
        }
        seen[cookie] = step.popup;
      });
    }

    // ---- State (sessionStorage — one visit) ---------------------------------

    _freshState() {
      return {
        v: SEQ_STATE_VERSION,
        n: this.steps.length,
        i: 0,                    // step waiting to fire
        t: 0,                    // visible seconds elapsed this visit
        due: this.steps[0].after,
        path: _seqPath(),
        // An afterPageChange step doesn't start counting until the visitor
        // actually moves to another page — see _evaluate.
        armed: !this.steps[0].afterPageChange,
        pending: false,          // a step is open, waiting to be closed
        done: false,
      };
    }

    _loadState() {
      let raw = null;
      try { raw = sessionStorage.getItem(this.storageKey); } catch (e) { /* private mode */ }
      if (raw) {
        try {
          const s = JSON.parse(raw);
          // A redeployed sequence with a different shape must not resume into
          // a step index that now means something else.
          if (s && s.v === SEQ_STATE_VERSION && s.n === this.steps.length) return s;
        } catch (e) { /* corrupt — start over */ }
      }
      return this._freshState();
    }

    _save() {
      try { sessionStorage.setItem(this.storageKey, JSON.stringify(this.state)); }
      catch (e) { /* storage full or blocked — the chain still works in-page */ }
    }

    // ---- Progression --------------------------------------------------------

    _advance() {
      const next = this.state.i + 1;
      this.state.pending = false;
      if (next >= this.steps.length) {
        this.state.done = true;
        _log('sequence finished');
      } else {
        this.state.i = next;
        this.state.due = this.state.t + this.steps[next].after;
        this.state.path = _seqPath();
        this.state.armed = !this.steps[next].afterPageChange;
      }
      this._save();
    }

    _evaluate() {
      const st = this.state;
      if (this._stopped || st.done || st.pending) return;
      const step = this.steps[st.i];
      if (!step) return;
      // An afterPageChange step is armed by the first navigation after the
      // previous step ended, and only then does its timer start — "moved on to
      // another page, gave them a minute there". Counting from the previous
      // close instead would let a long read on the old page consume the whole
      // delay, so the popup would land the instant the new page opened.
      // Arming survives further navigation: the clock keeps running, so
      // clicking through pages quickly can't postpone it forever.
      if (!st.armed) {
        if (_seqPath() === st.path) return;
        st.armed = true;
        st.due = st.t + step.after;
        this._save();
      }
      if (st.t < st.due) return;

      const inst = registry[step.popup];
      if (!inst) {
        // The popup may simply live on another page — keep waiting rather than
        // skipping the step. Warn once so a typo is still visible.
        if (!this._warned[step.popup]) {
          this._warned[step.popup] = true;
          console.warn(`[digi2.popups] sequence step "${step.popup}" is not created on this page — waiting.`);
        }
        return;
      }

      // Already dismissed for real (its cookie outlives this visit): skip the
      // step rather than re-opening something the visitor closed for good.
      if (inst.wasSeen()) {
        _log('sequence step already seen → ' + step.popup);
        this._advance();
        return;
      }

      const off = inst._onCloseInternal(() => this._stepClosed());
      inst.show();
      if (!inst.isVisible) {
        // Vetoed (canShow, schedule, URL filter) — undo and retry next tick.
        off();
        return;
      }
      this._offClose = off;
      st.pending = true;
      st.shownPath = _seqPath();   // where it was open, for the navigate-away case
      this._save();
      _log('sequence opened → ' + step.popup, { step: st.i, at: Math.round(st.t) + 's' });
    }

    _stepClosed() {
      if (this._offClose) { this._offClose(); this._offClose = null; }
      if (!this.state.pending) return;
      this._advance();
    }

    // ---- Clock --------------------------------------------------------------

    _tick() {
      if (this._stopped || this.state.done) return;
      this._timerId = setTimeout(() => {
        const now = Date.now();
        const delta = now - this._lastTickAt;
        this._lastTickAt = now;
        // Count only time the page could actually be seen. The cap stops a
        // throttled timer (background tabs are slowed to ~1/min) from
        // crediting a whole minute in one tick.
        if (!_seqHidden()) this.state.t += Math.min(delta, SEQ_TICK_MS * 2) / 1000;
        this._evaluate();
        this._save();
        this._tick();
      }, SEQ_TICK_MS);
    }

    // ---- Public -------------------------------------------------------------

    /** Snapshot for debugging: which step is next, how long the visit has run. */
    status() {
      if (!this.state) return null;
      const step = this.steps[this.state.i];
      return {
        step: this.state.i,
        popup: step ? step.popup : null,
        elapsed: Math.round(this.state.t),
        dueAt: this.state.due,
        waitingForClose: this.state.pending,
        done: this.state.done,
      };
    }

    /** Stop the chain for this page (state is kept — a reload resumes it). */
    stop() {
      this._stopped = true;
      clearTimeout(this._timerId);
    }

    /** Forget all progress and start the chain from step one. */
    reset() {
      try { sessionStorage.removeItem(this.storageKey); } catch (e) { /* ignore */ }
      this.state = this._freshState();
      this._save();
    }
  }

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
     * Chain popups across a whole visit: each step opens N seconds after the
     * previous one was closed, counting only time the tab was visible, and
     * surviving navigation between pages.
     *
     *   digi2.popups.sequence([
     *     { popup: 'welcome', after: 4 },
     *     { popup: 'oferta',  after: 60, afterPageChange: true },
     *   ])
     *
     * @param {Array} steps — { popup, after (seconds), afterPageChange? }
     * @param {Object} [options] — { storageKey } for a second, independent chain
     */
    sequence(steps, options) {
      return new D2PopupSequence(steps, options);
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
  // The attribute itself supports the responsive `name;name@max` syntax via
  // attr(), so different popups can be wired to the same trigger element per
  // breakpoint. Both d2-show-popup and data-d2-show-popup are recognised.
  //
  // Optional delay: add d2-show-popup-delay (or data-d2-show-popup-delay) in
  // seconds to open the popup N seconds after the click instead of instantly:
  //   <button d2-show-popup="lead" d2-show-popup-delay="50">Download</button>
  // ---------------------------------------------------------------------------
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[d2-show-popup], [data-d2-show-popup]');
    if (!trigger) return;

    var name = attr(trigger, 'd2-show-popup') || trigger.getAttribute('data-d2-show-popup');
    if (!name) return;
    var instance = registry[name];
    if (!instance || !instance.options.dataTagTrigger) return;

    e.preventDefault();

    var delayRaw = attr(trigger, 'd2-show-popup-delay');
    if (delayRaw == null) delayRaw = trigger.getAttribute('data-d2-show-popup-delay');
    var delay = parseFloat(delayRaw);

    if (!isNaN(delay) && delay > 0) {
      _log('data-tag trigger clicked → ' + name + ' (delay ' + delay + 's)', trigger);
      setTimeout(function () { instance.show(); }, delay * 1000);
    } else {
      _log('data-tag trigger clicked → ' + name, trigger);
      instance.show();
    }
  });

  // When the active responsive bucket changes, refresh resolved option
  // strings on every popup. If one is currently visible, re-apply the `in`
  // styles so its resting transition target picks up the new bucket's values
  // (so the next hide animates correctly).
  if (window.digi2 && typeof window.digi2.on === 'function') {
    window.digi2.on('responsive:change', function () {
      Object.keys(registry).forEach(function (k) {
        var inst = registry[k];
        if (!inst || !inst.popupElement) return;
        inst._refreshResponsiveOpts();
        if (inst.isVisible && !inst._animating) {
          var anim = inst._getAnimation();
          if (anim !== ANIMATIONS.none) {
            applyStyles(inst.popupElement, anim.in());
          }
        }
      });
    });
  }
})();
