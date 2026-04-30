/**
 * digi2 — Countdown Module
 * Loaded automatically by digi2-loader.js when d2-countdown is present.
 *
 * Countdown timer for landing pages, promos, launches.
 *
 * Webflow setup:
 *   <div d2-countdown="2025-12-31T23:59:59">
 *     <span d2-countdown-days>00</span>d
 *     <span d2-countdown-hours>00</span>h
 *     <span d2-countdown-minutes>00</span>m
 *     <span d2-countdown-seconds>00</span>s
 *   </div>
 *
 * API:
 *   digi2.countdown.create('launch', options)
 *   digi2.countdown.get('launch')
 *   digi2.countdown.destroy('launch')
 *   digi2.countdown.list()
 *
 * Instance:
 *   instance.getRemaining()       — { days, hours, minutes, seconds, total }
 *   instance.pause()
 *   instance.resume()
 *   instance.reset(newDate)
 *   instance.destroy()
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
    if (window.digi2.log) window.digi2.log('countdown', action, data);
  }

  // ---------------------------------------------------------------------------
  // CountdownManager (internal)
  // ---------------------------------------------------------------------------
  class CountdownManager {
    constructor(name, options = {}) {
      this.name = name;

      this.options = {
        containerSelector: null,       // CSS selector override
        targetDate: null,              // Date object, string, or timestamp
        onTick: null,                  // callback({ days, hours, minutes, seconds, total })
        onComplete: null,              // callback() — fires when countdown reaches 0
        expiredText: null,             // text to show when expired (replaces container innerHTML)
        padZeros: true,                // pad single digits with 0
        updateInterval: 1000,          // ms
        ...options,
      };

      this.containerEl = null;
      this._targetTime = 0;
      this._intervalId = null;
      this._elements = {};
      this._completed = false;

      this._init();
    }

    _init() {
      this.containerEl = this._findContainer();

      if (!this.containerEl) {
        console.warn('[digi2.countdown] "' + this.name + '" — container not found.');
        return;
      }

      // Resolve target date
      var target = this.options.targetDate || attr(this.containerEl, 'd2-countdown');
      if (!target) {
        console.warn('[digi2.countdown] "' + this.name + '" — no target date.');
        return;
      }

      this._targetTime = new Date(target).getTime();

      if (isNaN(this._targetTime)) {
        console.warn('[digi2.countdown] "' + this.name + '" — invalid date: ' + target);
        return;
      }

      // Find display elements
      this._elements = {
        days: this.containerEl.querySelector('[d2-countdown-days]'),
        hours: this.containerEl.querySelector('[d2-countdown-hours]'),
        minutes: this.containerEl.querySelector('[d2-countdown-minutes]'),
        seconds: this.containerEl.querySelector('[d2-countdown-seconds]'),
      };

      _log('init → ' + this.name, { target: new Date(this._targetTime).toISOString() });

      this._tick();
      this.resume();
    }

    _findContainer() {
      if (this.options.containerSelector) {
        return document.querySelector(this.options.containerSelector);
      }
      return document.querySelector('[d2-countdown="' + this.options.targetDate + '"]')
        || document.querySelector('[d2-countdown]');
    }

    _tick() {
      var now = Date.now();
      var diff = Math.max(0, this._targetTime - now);

      var totalSeconds = Math.floor(diff / 1000);
      var days = Math.floor(totalSeconds / 86400);
      var hours = Math.floor((totalSeconds % 86400) / 3600);
      var minutes = Math.floor((totalSeconds % 3600) / 60);
      var seconds = totalSeconds % 60;

      var remaining = {
        days: days,
        hours: hours,
        minutes: minutes,
        seconds: seconds,
        total: totalSeconds,
      };

      // Update DOM
      var pad = this.options.padZeros;
      if (this._elements.days)    this._elements.days.textContent    = pad ? String(days).padStart(2, '0') : days;
      if (this._elements.hours)   this._elements.hours.textContent   = pad ? String(hours).padStart(2, '0') : hours;
      if (this._elements.minutes) this._elements.minutes.textContent = pad ? String(minutes).padStart(2, '0') : minutes;
      if (this._elements.seconds) this._elements.seconds.textContent = pad ? String(seconds).padStart(2, '0') : seconds;

      // Callback
      if (typeof this.options.onTick === 'function') {
        this.options.onTick(remaining);
      }

      // Completed
      if (diff <= 0 && !this._completed) {
        this._completed = true;
        this.pause();

        if (this.options.expiredText && this.containerEl) {
          this.containerEl.textContent = this.options.expiredText;
        }

        if (typeof this.options.onComplete === 'function') {
          this.options.onComplete();
        }

        _log('completed → ' + this.name);
      }
    }

    // ---- Public API ---------------------------------------------------------

    getRemaining() {
      var diff = Math.max(0, this._targetTime - Date.now());
      var totalSeconds = Math.floor(diff / 1000);
      return {
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
        total: totalSeconds,
      };
    }

    pause() {
      if (this._intervalId) {
        clearInterval(this._intervalId);
        this._intervalId = null;
        _log('paused → ' + this.name);
      }
    }

    resume() {
      if (this._intervalId || this._completed) return;
      var self = this;
      this._intervalId = setInterval(function () { self._tick(); }, this.options.updateInterval);
      _log('resumed → ' + this.name);
    }

    reset(newDate) {
      this._completed = false;
      if (newDate) {
        this._targetTime = new Date(newDate).getTime();
      }
      this._tick();
      this.resume();
      _log('reset → ' + this.name, { target: new Date(this._targetTime).toISOString() });
    }

    destroy() {
      this.pause();
      this.containerEl = null;
      this._elements = {};
      _log('destroy → ' + this.name);
    }
  }

  // ---------------------------------------------------------------------------
  // Register module
  // ---------------------------------------------------------------------------
  var registry = {};

  window.digi2.countdown = {
    create: function (name, options) {
      if (registry[name]) {
        console.warn('[digi2.countdown] "' + name + '" already exists.');
        return registry[name];
      }
      var instance = new CountdownManager(name, options);
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
