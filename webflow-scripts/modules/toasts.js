/**
 * digi2 — Toasts Module
 * Loaded automatically by digi2-loader.js when d2-toasts is present.
 *
 * Show temporary notification messages. Auto-dismisses after duration.
 *
 * API:
 *   digi2.toasts.show('Message', options)
 *   digi2.toasts.success('Saved!')
 *   digi2.toasts.error('Something went wrong')
 *   digi2.toasts.warning('Check your input')
 *   digi2.toasts.info('New update available')
 *   digi2.toasts.dismiss(id)
 *   digi2.toasts.dismissAll()
 *   digi2.toasts.config(options)       — set global defaults
 *
 * Options:
 *   type:       'default'     — default | success | error | warning | info
 *   duration:   3000          — ms (0 = no auto-dismiss)
 *   position:   'top-right'   — top-left | top-center | top-right | bottom-left | bottom-center | bottom-right
 *   dismissible: true         — show close button
 *   animation:  'slide'       — slide | fade
 *   onClick:    null           — callback(toast)
 *   onDismiss:  null           — callback(toast)
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  function _log(action, data) {
    if (window.digi2.log) window.digi2.log('toasts', action, data);
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  var _idCounter = 0;
  var _containers = {};
  var _activeToasts = {};

  var _defaults = {
    type: 'default',
    duration: 3000,
    position: 'top-right',
    dismissible: true,
    animation: 'slide',
    onClick: null,
    onDismiss: null,
  };

  // ---------------------------------------------------------------------------
  // Styles (injected once)
  // ---------------------------------------------------------------------------
  var _stylesInjected = false;

  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;

    var css = ''
      + '.d2-toast-container{'
      +   'position:fixed;z-index:9999;pointer-events:none;'
      +   'display:flex;flex-direction:column;gap:8px;padding:16px;'
      +   'max-width:380px;width:100%;'
      + '}'
      + '.d2-toast-container--top-left{top:0;left:0;align-items:flex-start}'
      + '.d2-toast-container--top-center{top:0;left:50%;transform:translateX(-50%);align-items:center}'
      + '.d2-toast-container--top-right{top:0;right:0;align-items:flex-end}'
      + '.d2-toast-container--bottom-left{bottom:0;left:0;align-items:flex-start}'
      + '.d2-toast-container--bottom-center{bottom:0;left:50%;transform:translateX(-50%);align-items:center}'
      + '.d2-toast-container--bottom-right{bottom:0;right:0;align-items:flex-end}'
      + '.d2-toast{'
      +   'pointer-events:auto;display:flex;align-items:center;gap:10px;'
      +   'padding:12px 16px;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;'
      +   'font-size:13px;line-height:1.4;color:#fff;max-width:100%;'
      +   'box-shadow:0 4px 24px rgba(0,0,0,0.15);cursor:default;'
      +   'transition:all 0.3s cubic-bezier(0.22,1,0.36,1);'
      + '}'
      + '.d2-toast--default{background:#1e1e24;color:#e2e2e6}'
      + '.d2-toast--success{background:#16a34a}'
      + '.d2-toast--error{background:#dc2626}'
      + '.d2-toast--warning{background:#d97706;color:#000}'
      + '.d2-toast--info{background:#2563eb}'
      + '.d2-toast-msg{flex:1}'
      + '.d2-toast-close{'
      +   'background:none;border:none;color:inherit;opacity:0.7;cursor:pointer;'
      +   'font-size:16px;line-height:1;padding:0 0 0 8px;flex-shrink:0;'
      + '}'
      + '.d2-toast-close:hover{opacity:1}'
      + '.d2-toast-icon{flex-shrink:0;font-size:16px}'
      // Animation: slide
      + '.d2-toast-enter-slide{opacity:0;transform:translateX(80px)}'
      + '.d2-toast-container--top-left .d2-toast-enter-slide,'
      + '.d2-toast-container--bottom-left .d2-toast-enter-slide{transform:translateX(-80px)}'
      + '.d2-toast-container--top-center .d2-toast-enter-slide,'
      + '.d2-toast-container--bottom-center .d2-toast-enter-slide{transform:translateY(-20px)}'
      // Animation: fade
      + '.d2-toast-enter-fade{opacity:0;transform:scale(0.95)}'
      // Active
      + '.d2-toast-active{opacity:1;transform:translateX(0) translateY(0) scale(1)}'
      // Exit
      + '.d2-toast-exit{opacity:0;transform:scale(0.9);pointer-events:none}'
    ;

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  var ICONS = {
    success: '&#10003;',
    error: '&#10007;',
    warning: '&#9888;',
    info: '&#8505;',
  };

  function getContainer(position) {
    if (_containers[position]) return _containers[position];

    var el = document.createElement('div');
    el.className = 'd2-toast-container d2-toast-container--' + position;
    document.body.appendChild(el);
    _containers[position] = el;
    return el;
  }

  // ---------------------------------------------------------------------------
  // Core
  // ---------------------------------------------------------------------------

  function showToast(message, opts) {
    injectStyles();
    opts = Object.assign({}, _defaults, opts || {});

    var id = ++_idCounter;
    var container = getContainer(opts.position);

    // Build toast element
    var toast = document.createElement('div');
    toast.className = 'd2-toast d2-toast--' + opts.type + ' d2-toast-enter-' + opts.animation;
    toast.setAttribute('d2-toast-id', id);

    var html = '';
    if (ICONS[opts.type]) {
      html += '<span class="d2-toast-icon">' + ICONS[opts.type] + '</span>';
    }
    html += '<span class="d2-toast-msg">' + message + '</span>';
    if (opts.dismissible) {
      html += '<button class="d2-toast-close">&times;</button>';
    }
    toast.innerHTML = html;

    // Click handler
    if (typeof opts.onClick === 'function') {
      toast.style.cursor = 'pointer';
      toast.addEventListener('click', function (e) {
        if (!e.target.classList.contains('d2-toast-close')) {
          opts.onClick({ id: id, message: message, element: toast });
        }
      });
    }

    // Close button
    if (opts.dismissible) {
      toast.querySelector('.d2-toast-close').addEventListener('click', function () {
        dismissToast(id);
      });
    }

    // Add to container (bottom positions: prepend; top: append)
    if (opts.position.indexOf('bottom') === 0) {
      container.insertBefore(toast, container.firstChild);
    } else {
      container.appendChild(toast);
    }

    // Trigger enter animation
    void toast.offsetHeight;
    toast.classList.add('d2-toast-active');
    toast.classList.remove('d2-toast-enter-' + opts.animation);

    // Store
    _activeToasts[id] = {
      id: id,
      element: toast,
      container: container,
      opts: opts,
      timer: null,
    };

    // Auto-dismiss
    if (opts.duration > 0) {
      _activeToasts[id].timer = setTimeout(function () {
        dismissToast(id);
      }, opts.duration);
    }

    _log('show', { id: id, type: opts.type, message: message, duration: opts.duration });

    return id;
  }

  function dismissToast(id) {
    var data = _activeToasts[id];
    if (!data) return;

    if (data.timer) clearTimeout(data.timer);

    var toast = data.element;
    toast.classList.add('d2-toast-exit');
    toast.classList.remove('d2-toast-active');

    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
      if (typeof data.opts.onDismiss === 'function') {
        data.opts.onDismiss({ id: id });
      }
      delete _activeToasts[id];
    }, 300);

    _log('dismiss', { id: id });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  window.digi2.toasts = {
    show: function (message, options) {
      return showToast(message, options);
    },

    success: function (message, options) {
      return showToast(message, Object.assign({ type: 'success' }, options));
    },

    error: function (message, options) {
      return showToast(message, Object.assign({ type: 'error' }, options));
    },

    warning: function (message, options) {
      return showToast(message, Object.assign({ type: 'warning' }, options));
    },

    info: function (message, options) {
      return showToast(message, Object.assign({ type: 'info' }, options));
    },

    dismiss: function (id) {
      dismissToast(id);
    },

    dismissAll: function () {
      for (var id in _activeToasts) {
        if (_activeToasts.hasOwnProperty(id)) dismissToast(parseInt(id));
      }
    },

    config: function (options) {
      Object.assign(_defaults, options);
      _log('config updated', _defaults);
    },
  };
})();
