/**
 * digi2 — Filter Module
 * Loaded automatically by digi2-loader.js when d2-filter is present.
 *
 * Client-side filtering for Webflow CMS items with animated show/hide.
 *
 * Webflow setup:
 *   <div d2-filter-group="portfolio">
 *     <button d2-filter="all">All</button>
 *     <button d2-filter="web">Web</button>
 *     <button d2-filter="branding">Branding</button>
 *
 *     <div d2-filter-list>
 *       <div d2-filter-item d2-filter-category="web">Project 1</div>
 *       <div d2-filter-item d2-filter-category="branding">Project 2</div>
 *       <div d2-filter-item d2-filter-category="web,branding">Project 3</div>
 *     </div>
 *   </div>
 *
 * API:
 *   digi2.filter.create('portfolio', options)
 *   digi2.filter.get('portfolio')
 *   digi2.filter.destroy('portfolio')
 *   digi2.filter.list()
 *
 * Instance:
 *   instance.filterBy('web')
 *   instance.filterBy('all')
 *   instance.getActive()
 *   instance.getVisibleCount()
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  function _log(action, data) {
    if (window.digi2.log) window.digi2.log('filter', action, data);
  }

  // ---------------------------------------------------------------------------
  // FilterManager (internal)
  // ---------------------------------------------------------------------------
  class FilterManager {
    constructor(name, options = {}) {
      this.name = name;

      this.options = {
        groupSelector: null,           // CSS selector override
        allKeyword: 'all',             // value for "show all" filter
        animation: 'fade',             // none | fade | zoom | slide-up
        animationDuration: 0.3,
        activeClass: 'd2-filter-active',
        hiddenClass: 'd2-filter-hidden',
        matchMode: 'any',              // 'any' = match any category | 'all' = match all
        onChange: null,                 // callback(activeFilter, visibleCount, instance)
        ...options,
      };

      this.groupEl = null;
      this.buttons = [];
      this.items = [];
      this._activeFilter = this.options.allKeyword;

      this._init();
    }

    _init() {
      this.groupEl = this._findGroup();

      if (!this.groupEl) {
        console.warn('[digi2.filter] "' + this.name + '" — group not found.');
        return;
      }

      this.buttons = Array.from(this.groupEl.querySelectorAll('[d2-filter]'));
      this.items = Array.from(this.groupEl.querySelectorAll('[d2-filter-item]'));

      _log('init → ' + this.name, { buttons: this.buttons.length, items: this.items.length });

      this._attachListeners();
      this._applyFilter(this._activeFilter, false);
    }

    _findGroup() {
      if (this.options.groupSelector) {
        return document.querySelector(this.options.groupSelector);
      }
      return document.querySelector('[d2-filter-group="' + this.name + '"]');
    }

    _attachListeners() {
      var self = this;
      this.buttons.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          var filter = btn.getAttribute('d2-filter');
          self.filterBy(filter);
        });
      });
    }

    // ---- Public API ---------------------------------------------------------

    filterBy(filter) {
      this._activeFilter = filter;
      this._applyFilter(filter, true);

      _log('filterBy → ' + filter, { visible: this.getVisibleCount() });

      if (typeof this.options.onChange === 'function') {
        this.options.onChange(filter, this.getVisibleCount(), this);
      }
    }

    getActive() {
      return this._activeFilter;
    }

    getVisibleCount() {
      var hidden = this.options.hiddenClass;
      return this.items.filter(function (item) {
        return !item.classList.contains(hidden);
      }).length;
    }

    destroy() {
      this.groupEl = null;
      this.buttons = [];
      this.items = [];
      _log('destroy → ' + this.name);
    }

    // ---- Internal -----------------------------------------------------------

    _applyFilter(filter, animate) {
      var self = this;
      var allKw = this.options.allKeyword;
      var hiddenClass = this.options.hiddenClass;
      var activeClass = this.options.activeClass;
      var dur = this.options.animationDuration;
      var animType = this.options.animation;
      var matchMode = this.options.matchMode;

      // Update button states
      this.buttons.forEach(function (btn) {
        if (btn.getAttribute('d2-filter') === filter) {
          btn.classList.add(activeClass);
        } else {
          btn.classList.remove(activeClass);
        }
      });

      // Filter items
      this.items.forEach(function (item) {
        var categories = (item.getAttribute('d2-filter-category') || '').split(',').map(function (c) { return c.trim(); });
        var show = false;

        if (filter === allKw) {
          show = true;
        } else {
          var filters = filter.split(',').map(function (f) { return f.trim(); });
          if (matchMode === 'all') {
            show = filters.every(function (f) { return categories.indexOf(f) !== -1; });
          } else {
            show = filters.some(function (f) { return categories.indexOf(f) !== -1; });
          }
        }

        if (show) {
          self._showItem(item, animate, dur, animType, hiddenClass);
        } else {
          self._hideItem(item, animate, dur, animType, hiddenClass);
        }
      });
    }

    _showItem(item, animate, dur, animType, hiddenClass) {
      if (!item.classList.contains(hiddenClass) && item.style.display !== 'none') return;

      item.classList.remove(hiddenClass);

      if (!animate || animType === 'none') {
        item.style.display = '';
        item.style.opacity = '';
        item.style.transform = '';
        item.style.transition = '';
        return;
      }

      // Set initial state
      item.style.display = '';
      item.style.opacity = '0';

      if (animType === 'zoom') item.style.transform = 'scale(0.8)';
      else if (animType === 'slide-up') item.style.transform = 'translateY(20px)';
      else item.style.transform = '';

      item.style.transition = 'opacity ' + dur + 's ease, transform ' + dur + 's ease';
      void item.offsetHeight;

      item.style.opacity = '1';
      item.style.transform = '';
    }

    _hideItem(item, animate, dur, animType, hiddenClass) {
      if (item.classList.contains(hiddenClass)) return;

      if (!animate || animType === 'none') {
        item.classList.add(hiddenClass);
        item.style.display = 'none';
        item.style.opacity = '';
        item.style.transform = '';
        item.style.transition = '';
        return;
      }

      item.style.transition = 'opacity ' + dur + 's ease, transform ' + dur + 's ease';
      item.style.opacity = '0';

      if (animType === 'zoom') item.style.transform = 'scale(0.8)';
      else if (animType === 'slide-up') item.style.transform = 'translateY(20px)';

      setTimeout(function () {
        item.classList.add(hiddenClass);
        item.style.display = 'none';
        item.style.transform = '';
        item.style.transition = '';
      }, dur * 1000);
    }
  }

  // ---------------------------------------------------------------------------
  // Register module
  // ---------------------------------------------------------------------------
  var registry = {};

  window.digi2.filter = {
    create: function (name, options) {
      if (registry[name]) {
        console.warn('[digi2.filter] "' + name + '" already exists.');
        return registry[name];
      }
      var instance = new FilterManager(name, options);
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
