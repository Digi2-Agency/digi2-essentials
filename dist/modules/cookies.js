/**
 * digi2 — Cookies Module
 * Loaded automatically by digi2-loader.js when d2-cookies is present.
 *
 * API:
 *   window.digi2.cookies.set(name, value, options)
 *   window.digi2.cookies.get(name)
 *   window.digi2.cookies.getAll()
 *   window.digi2.cookies.has(name)
 *   window.digi2.cookies.remove(name, options)
 *
 * Options for set():
 *   days:     7              — expiration in days (default: session cookie)
 *   path:     '/'            — cookie path (default: '/')
 *   domain:   '.example.com' — cookie domain (default: current)
 *   secure:   true           — HTTPS only (default: false)
 *   sameSite: 'Lax'          — Lax | Strict | None (default: 'Lax')
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  window.digi2.cookies = {

    /**
     * Set a cookie.
     * @param {string} name
     * @param {string} value
     * @param {object} options
     */
    set: function (name, value, options) {
      options = options || {};
      var parts = [
        encodeURIComponent(name) + '=' + encodeURIComponent(value),
      ];

      if (options.days) {
        var date = new Date();
        date.setTime(date.getTime() + options.days * 24 * 60 * 60 * 1000);
        parts.push('expires=' + date.toUTCString());
      }

      parts.push('path=' + (options.path || '/'));

      if (options.domain) {
        parts.push('domain=' + options.domain);
      }

      if (options.secure) {
        parts.push('secure');
      }

      parts.push('SameSite=' + (options.sameSite || 'Lax'));

      document.cookie = parts.join(';');
    },

    /**
     * Get a cookie value by name. Returns null if not found.
     * @param {string} name
     * @returns {string|null}
     */
    get: function (name) {
      var match = document.cookie.match(
        new RegExp('(?:^|;\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)')
      );
      return match ? decodeURIComponent(match[1]) : null;
    },

    /**
     * Get all cookies as a key-value object.
     * @returns {object}
     */
    getAll: function () {
      var result = {};
      if (!document.cookie) return result;

      document.cookie.split(';').forEach(function (pair) {
        var parts = pair.split('=');
        var key = decodeURIComponent(parts[0].trim());
        var val = parts.length > 1 ? decodeURIComponent(parts.slice(1).join('=')) : '';
        if (key) result[key] = val;
      });

      return result;
    },

    /**
     * Check if a cookie exists.
     * @param {string} name
     * @returns {boolean}
     */
    has: function (name) {
      return this.get(name) !== null;
    },

    /**
     * Remove a cookie by setting it to expired.
     * Pass the same path/domain used when setting it.
     * @param {string} name
     * @param {object} options  — { path, domain }
     */
    remove: function (name, options) {
      options = options || {};
      this.set(name, '', {
        days: -1,
        path: options.path || '/',
        domain: options.domain || undefined,
      });
    },
  };
})();
