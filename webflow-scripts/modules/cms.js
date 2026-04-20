/**
 * digi2 — CMS Module
 * Loaded automatically by digi2-loader.js when d2-cms is present.
 *
 * Client-side sort, filter, and progressive reveal ("load more") for
 * Webflow CMS Collection Lists. Operates entirely on items already in
 * the DOM (Webflow renders up to 100 items server-side per list) — no
 * fetch, no extra HTTP requests.
 *
 * NOTE on attributes: this module uses `d2-cms-*` attributes WITHOUT the
 * `data-` prefix (deliberate, per author preference). Browsers handle
 * non-`data-` attributes fine via getAttribute/setAttribute; the only
 * loss is the `element.dataset` shortcut.
 *
 * Webflow setup:
 *   <div d2-cms-list="products" class="w-dyn-items">
 *     <div d2-cms-item>
 *       <h3   d2-cms-field="title">Alpha</h3>
 *       <span d2-cms-field="price" d2-cms-field-type="number">100</span>
 *       <span d2-cms-field="category">shoes</span>
 *     </div>
 *     <div d2-cms-item>
 *       <h3   d2-cms-field="title">Beta</h3>
 *       <span d2-cms-field="price" d2-cms-field-type="number">50</span>
 *       <span d2-cms-field="category">hats,shoes</span>
 *     </div>
 *     …
 *   </div>
 *
 *   Each sortable/filterable field lives on a nested element whose
 *   `d2-cms-field` attribute names the field; its textContent is the
 *   value. Put the element anywhere inside the item; hide it with CSS
 *   if the value shouldn't be rendered.
 *
 *   Optional `d2-cms-field-type="number|text|date"` on the same element
 *   forces the comparator type (useful for numbers that could be parsed
 *   as dates, or text that happens to look numeric). Without it, the
 *   type is auto-detected from the values — text sorts alphabetically
 *   (locale-aware, case-insensitive, asc = A→Z).
 *
 *   <button d2-cms-target="products" d2-cms-sort="price">Price ▼</button>
 *   <button d2-cms-target="products" d2-cms-filter="category:shoes">Shoes</button>
 *   <button d2-cms-target="products" d2-cms-load-more>Load more</button>
 *   <div    d2-cms-target="products" d2-cms-empty>No matches.</div>
 *
 * API:
 *   digi2.cms.createList('products', { perPage: 12, loadMode: 'scroll', ... })
 *   digi2.cms.create(...)              // alias of createList
 *   digi2.cms.get('products')
 *   digi2.cms.destroy('products')
 *   digi2.cms.list()
 *
 * Instance:
 *   list.sort(field, dir)              // dir: 'asc' | 'desc' | undefined (toggle)
 *   list.clearSort()
 *   list.filter(filters)               // replace { key: [values] } object
 *   list.addFilter(key, value)
 *   list.removeFilter(key, value)
 *   list.clearFilters()
 *   list.loadMore(n)                   // reveal next n (default: perPage)
 *   list.loadAll()
 *   list.reset()
 *   list.refresh()                     // re-scan items (after Webflow re-render)
 *   list.getState()
 *   list.destroy()
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  function _log(action, data) {
    if (window.digi2.log) window.digi2.log('cms', action, data);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  /**
   * Read sortable/filterable field values (and optional types) from an item.
   * Each nested [d2-cms-field="name"] element contributes one field:
   *   - name  = the attribute VALUE
   *   - value = the element's trimmed textContent
   *   - type  = optional `d2-cms-field-type` attribute ("number" | "text" | "date")
   * If multiple elements share a name, the first one wins.
   *
   * Returns { fields: {name: value}, types: {name: type} }.
   */
  function readItemFields(itemEl) {
    var fields = {};
    var types = {};
    var nested = itemEl.querySelectorAll('[d2-cms-field]');
    for (var i = 0; i < nested.length; i++) {
      var el = nested[i];
      var key = el.getAttribute('d2-cms-field');
      if (!key || (key in fields)) continue;
      fields[key] = (el.textContent || '').trim();
      var t = el.getAttribute('d2-cms-field-type');
      if (t) types[key] = normalizeType(t);
    }
    return { fields: fields, types: types };
  }

  function normalizeType(t) {
    if (!t) return null;
    t = String(t).toLowerCase().trim();
    if (t === 'text' || t === 'string' || t === 'str') return 'string';
    if (t === 'number' || t === 'num' || t === 'int' || t === 'float') return 'number';
    if (t === 'date' || t === 'datetime' || t === 'time') return 'date';
    return null;
  }

  function detectType(values) {
    var nonEmpty = [];
    for (var i = 0; i < values.length && nonEmpty.length < 5; i++) {
      if (values[i] != null && values[i] !== '') nonEmpty.push(values[i]);
    }
    if (!nonEmpty.length) return 'string';

    var allNumber = nonEmpty.every(function (v) {
      return !isNaN(parseFloat(v)) && isFinite(v);
    });
    if (allNumber) return 'number';

    var allDate = nonEmpty.every(function (v) {
      var t = Date.parse(v);
      return !isNaN(t);
    });
    if (allDate) return 'date';

    return 'string';
  }

  function compareValues(a, b, type) {
    var aEmpty = a == null || a === '';
    var bEmpty = b == null || b === '';
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;   // empties always sort to the end
    if (bEmpty) return -1;

    if (type === 'number') {
      return parseFloat(a) - parseFloat(b);
    }
    if (type === 'date') {
      return Date.parse(a) - Date.parse(b);
    }
    return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
  }

  function parseFilterAttr(raw) {
    // "category:shoes" → { key: 'category', value: 'shoes' }
    // "shoes"          → { key: '_default', value: 'shoes' }
    if (!raw) return null;
    var idx = raw.indexOf(':');
    if (idx === -1) return { key: '_default', value: raw.trim() };
    return {
      key: raw.substring(0, idx).trim(),
      value: raw.substring(idx + 1).trim(),
    };
  }

  // ---------------------------------------------------------------------------
  // CMSList (internal)
  // ---------------------------------------------------------------------------
  class CMSList {
    constructor(name, options) {
      this.name = name;

      this.options = Object.assign({
        listSelector: null,           // CSS selector for the list container
        itemSelector: null,           // CSS selector for items (default: direct children)
        perPage: 12,
        loadMode: 'scroll',           // 'scroll' | 'button' | 'all'
        scrollOffset: 200,            // px (rootMargin) before sentinel triggers load
        defaultSort: null,            // { field, dir }
        defaultFilters: {},           // { key: [values] }
        filterMatchMode: 'AND',       // AND across keys (always OR within a key)
        emptySelector: null,          // element shown when 0 matches
        hiddenClass: null,            // CSS class for hidden items (default: inline display:none)
        hideNativePagination: true,   // hide sibling .w-pagination-wrapper if present
        onChange: null,
        onSort: null,
        onFilter: null,
        onLoadMore: null,
      }, options || {});

      this.listEl = null;
      this.items = [];                // [{ el, fields, _match }]
      this._originalNodes = [];       // snapshot of original DOM order for reset
      this._sentinel = null;
      this._observer = null;
      this._emptyEls = [];            // cached [d2-cms-empty] elements for this list

      this._sort = null;              // { field, dir }
      this._filters = {};             // { key: Set<value> }
      this._visibleCount = 0;

      this._init();
    }

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------
    _init() {
      this.listEl = this._findList();
      if (!this.listEl) {
        console.warn('[digi2.cms] "' + this.name + '" — list element not found.');
        return;
      }

      // Tag list with its name so global click handler can resolve targets
      if (!this.listEl.getAttribute('d2-cms-list')) {
        this.listEl.setAttribute('d2-cms-list', this.name);
      }

      this._scanItems();

      // Hide Webflow's native pagination when we're managing the list
      if (this.options.hideNativePagination) {
        var sib = this.listEl.parentElement && this.listEl.parentElement.querySelector('.w-pagination-wrapper');
        if (sib) sib.style.display = 'none';
      }

      // Apply defaults
      var df = this.options.defaultFilters || {};
      for (var k in df) {
        if (Object.prototype.hasOwnProperty.call(df, k)) {
          var values = Array.isArray(df[k]) ? df[k] : [df[k]];
          this._filters[k] = new Set(values);
        }
      }
      if (this.options.defaultSort && this.options.defaultSort.field) {
        var dsOrder = this.options.defaultSort.order;
        this._sort = {
          field: this.options.defaultSort.field,
          dir: this.options.defaultSort.dir === 'desc' ? 'desc' : 'asc',
          order: Array.isArray(dsOrder) && dsOrder.length ? dsOrder.slice() : null,
        };
      }

      this._visibleCount = this.options.perPage;
      this._setupSentinel();
      this._cacheEmptyElements();
      this._render();

      _log('init → ' + this.name, { items: this.items.length });
    }

    destroy() {
      if (this._observer) {
        this._observer.disconnect();
        this._observer = null;
      }
      if (this._sentinel && this._sentinel.parentNode) {
        this._sentinel.parentNode.removeChild(this._sentinel);
      }
      this._sentinel = null;

      // Restore original DOM order
      var listEl = this.listEl;
      if (listEl) {
        for (var i = 0; i < this._originalNodes.length; i++) {
          var node = this._originalNodes[i];
          // Reset inline styles we may have added
          node.style.display = '';
          if (this.options.hiddenClass) node.classList.remove(this.options.hiddenClass);
          listEl.appendChild(node);
        }
      }

      // Restore empty-state elements to their original inline display
      (this._emptyEls || []).forEach(function (el) {
        if (el._d2CmsOrigDisplay !== undefined) {
          el.style.display = el._d2CmsOrigDisplay;
          delete el._d2CmsOrigDisplay;
        }
      });
      this._emptyEls = [];

      this.listEl = null;
      this.items = [];
      this._originalNodes = [];
      this._filters = {};
      this._sort = null;
      _log('destroy → ' + this.name);
    }

    // -----------------------------------------------------------------------
    // Public API — sort
    // -----------------------------------------------------------------------
    sort(field, dir, order) {
      if (!field) { this.clearSort(); return; }

      // Toggle when same field clicked again and no explicit dir given
      if (dir === undefined && this._sort && this._sort.field === field) {
        if (this._sort.dir === 'asc') dir = 'desc';
        else if (this._sort.dir === 'desc') { this.clearSort(); return; }
        else dir = 'asc';
      }
      if (dir !== 'asc' && dir !== 'desc') dir = 'asc';

      this._sort = {
        field: field,
        dir: dir,
        order: Array.isArray(order) && order.length ? order.slice() : null,
      };
      this._render();

      if (typeof this.options.onSort === 'function') {
        this.options.onSort(field, dir);
      }
      _log('sort', this._sort);
    }

    clearSort() {
      this._sort = null;
      this._render();
      if (typeof this.options.onSort === 'function') this.options.onSort(null, null);
      _log('clearSort');
    }

    // -----------------------------------------------------------------------
    // Public API — filter
    // -----------------------------------------------------------------------
    filter(filters) {
      this._filters = {};
      if (filters && typeof filters === 'object') {
        for (var k in filters) {
          if (!Object.prototype.hasOwnProperty.call(filters, k)) continue;
          var values = Array.isArray(filters[k]) ? filters[k] : [filters[k]];
          this._filters[k] = new Set(values);
        }
      }
      this._visibleCount = this.options.perPage;
      this._render();
      this._fireFilter();
    }

    addFilter(key, value) {
      if (!key || value == null) return;
      if (!this._filters[key]) this._filters[key] = new Set();
      this._filters[key].add(String(value));
      this._visibleCount = this.options.perPage;
      this._render();
      this._fireFilter();
    }

    removeFilter(key, value) {
      if (!this._filters[key]) return;
      if (value === undefined) {
        delete this._filters[key];
      } else {
        this._filters[key].delete(String(value));
        if (this._filters[key].size === 0) delete this._filters[key];
      }
      this._visibleCount = this.options.perPage;
      this._render();
      this._fireFilter();
    }

    toggleFilter(key, value) {
      if (this._filters[key] && this._filters[key].has(String(value))) {
        this.removeFilter(key, value);
      } else {
        this.addFilter(key, value);
      }
    }

    clearFilters() {
      this._filters = {};
      this._visibleCount = this.options.perPage;
      this._render();
      this._fireFilter();
    }

    _fireFilter() {
      if (typeof this.options.onFilter === 'function') {
        this.options.onFilter(this._filtersAsObject());
      }
      _log('filter', this._filtersAsObject());
    }

    _filtersAsObject() {
      var out = {};
      for (var k in this._filters) {
        if (Object.prototype.hasOwnProperty.call(this._filters, k)) {
          out[k] = Array.from(this._filters[k]);
        }
      }
      return out;
    }

    // -----------------------------------------------------------------------
    // Public API — load more
    // -----------------------------------------------------------------------
    loadMore(n) {
      var step = (typeof n === 'number' && n > 0) ? n : this.options.perPage;
      var matchingTotal = this._countMatching();
      this._visibleCount = Math.min(this._visibleCount + step, matchingTotal);
      this._render();

      if (typeof this.options.onLoadMore === 'function') {
        this.options.onLoadMore(this._visibleCount, matchingTotal);
      }
      _log('loadMore', { visible: this._visibleCount, total: matchingTotal });
    }

    loadAll() {
      this._visibleCount = this._countMatching();
      this._render();
      if (typeof this.options.onLoadMore === 'function') {
        this.options.onLoadMore(this._visibleCount, this._visibleCount);
      }
    }

    reset() {
      this._sort = null;
      this._filters = {};
      this._visibleCount = this.options.perPage;
      this._render();
    }

    refresh() {
      this._scanItems();
      this._cacheEmptyElements();
      this._render();
      _log('refresh', { items: this.items.length });
    }

    getState() {
      return {
        visible: Math.min(this._visibleCount, this._countMatching()),
        totalMatching: this._countMatching(),
        total: this.items.length,
        sort: this._sort ? { field: this._sort.field, dir: this._sort.dir } : null,
        filters: this._filtersAsObject(),
      };
    }

    // -----------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------
    _findList() {
      if (this.options.listSelector) {
        return document.querySelector(this.options.listSelector);
      }
      return document.querySelector('[d2-cms-list="' + this.name + '"]');
    }

    _scanItems() {
      var listEl = this.listEl;
      var nodes;
      if (this.options.itemSelector) {
        nodes = Array.prototype.slice.call(listEl.querySelectorAll(this.options.itemSelector));
      } else {
        // Prefer explicit [d2-cms-item] markers if any; fall back to direct children.
        var explicit = listEl.querySelectorAll('[d2-cms-item]');
        if (explicit.length) {
          nodes = Array.prototype.slice.call(explicit);
        } else {
          nodes = Array.prototype.slice.call(listEl.children);
        }
      }
      // Exclude the sentinel and any pagination element from items
      var self = this;
      nodes = nodes.filter(function (n) {
        if (n === self._sentinel) return false;
        if (n.classList && n.classList.contains('w-pagination-wrapper')) return false;
        return true;
      });

      this._originalNodes = nodes.slice();
      this.items = nodes.map(function (el) {
        var parsed = readItemFields(el);
        return { el: el, fields: parsed.fields, types: parsed.types, _match: true };
      });
    }

    _countMatching() {
      var n = 0;
      for (var i = 0; i < this.items.length; i++) if (this.items[i]._match) n++;
      return n;
    }

    _applyFilters() {
      var filterKeys = Object.keys(this._filters);
      var mode = this.options.filterMatchMode === 'OR' ? 'OR' : 'AND';

      if (!filterKeys.length) {
        for (var i = 0; i < this.items.length; i++) this.items[i]._match = true;
        return;
      }

      for (var k = 0; k < this.items.length; k++) {
        var item = this.items[k];
        var perKey = filterKeys.map(function (key) {
          var requested = this._filters[key]; // Set of values
          var rawVal = item.fields[key];
          if (rawVal == null) return false;
          // Item value may be comma-separated (e.g. multi-reference fields)
          var itemVals = String(rawVal).split(',').map(function (v) { return v.trim(); });
          // OR within a key
          for (var v of requested) {
            if (itemVals.indexOf(String(v)) !== -1) return true;
          }
          return false;
        }, this);

        if (mode === 'AND') {
          item._match = perKey.every(function (b) { return b; });
        } else {
          item._match = perKey.some(function (b) { return b; });
        }
      }
    }

    _applySort(matching) {
      if (!this._sort || !this._sort.field) return matching;
      var field = this._sort.field;
      var dir = this._sort.dir === 'desc' ? -1 : 1;

      // Custom value order overrides type-based comparison entirely.
      // Values listed explicitly sort by their position in the array;
      // anything not in the list goes to the end (stable, case-insensitive match).
      var order = this._sort.order;
      if (order && order.length) {
        var orderMap = {};
        for (var i = 0; i < order.length; i++) {
          orderMap[String(order[i]).toLowerCase().trim()] = i;
        }
        var UNRANKED = order.length; // anything unknown lands after the known set
        var rank = function (val) {
          if (val == null || val === '') return UNRANKED + 1;
          var key = String(val).toLowerCase().trim();
          return key in orderMap ? orderMap[key] : UNRANKED;
        };
        matching.sort(function (a, b) {
          return dir * (rank(a.fields[field]) - rank(b.fields[field]));
        });
        return matching;
      }

      // Resolve type with this priority:
      //   1. `d2-cms-sort-type` on the sort button (explicit override)
      //   2. `d2-cms-field-type` on any item's [d2-cms-field] element (first wins)
      //   3. Auto-detect from the values themselves
      var type = this._sortTypeOverride(field)
        || this._fieldTypeFromItems(field)
        || detectType(matching.map(function (it) { return it.fields[field]; }));

      // Stable sort (Array.prototype.sort is stable in modern browsers)
      matching.sort(function (a, b) {
        return dir * compareValues(a.fields[field], b.fields[field], type);
      });
      return matching;
    }

    _sortTypeOverride(field) {
      var btn = document.querySelector('[d2-cms-sort="' + field + '"][d2-cms-sort-type]');
      if (!btn) return null;
      return normalizeType(btn.getAttribute('d2-cms-sort-type'));
    }

    _fieldTypeFromItems(field) {
      for (var i = 0; i < this.items.length; i++) {
        var t = this.items[i].types && this.items[i].types[field];
        if (t) return t;
      }
      return null;
    }

    _render() {
      this._applyFilters();

      var matching = [];
      var nonMatching = [];
      for (var i = 0; i < this.items.length; i++) {
        if (this.items[i]._match) matching.push(this.items[i]);
        else nonMatching.push(this.items[i]);
      }

      this._applySort(matching);

      // Reorder DOM nodes (matching first, in sorted order; non-matching after)
      var listEl = this.listEl;
      var hiddenClass = this.options.hiddenClass;
      var visibleCount = Math.min(this._visibleCount, matching.length);

      for (var m = 0; m < matching.length; m++) {
        var node = matching[m].el;
        listEl.appendChild(node);
        if (m < visibleCount) {
          node.style.display = '';
          if (hiddenClass) node.classList.remove(hiddenClass);
        } else {
          if (hiddenClass) {
            node.classList.add(hiddenClass);
            node.style.display = '';
          } else {
            node.style.display = 'none';
          }
        }
      }
      for (var nm = 0; nm < nonMatching.length; nm++) {
        var nnode = nonMatching[nm].el;
        listEl.appendChild(nnode);
        if (hiddenClass) {
          nnode.classList.add(hiddenClass);
          nnode.style.display = '';
        } else {
          nnode.style.display = 'none';
        }
      }

      // Re-append sentinel so it's the last child
      if (this._sentinel) listEl.appendChild(this._sentinel);

      // Toggle empty element(s)
      this._updateEmptyElement(matching.length === 0);

      // Update sort/filter button visual states
      this._reflectButtonStates();

      // Update load-more button enabled state
      this._reflectLoadMoreButtons(visibleCount, matching.length);

      // Sentinel observation: only observe if there are more to reveal
      this._observeSentinel(visibleCount < matching.length);

      // onChange callback
      if (typeof this.options.onChange === 'function') {
        this.options.onChange(this.getState());
      }
    }

    /**
     * Finsweet-style empty-state handling:
     *   - when 0 matches  → element is SHOWN with its original display value
     *                       (or CSS default if the original inline style was "none",
     *                        which is common to avoid a flash before JS runs)
     *   - when ≥1 match   → element is HIDDEN (display:none)
     *
     * The element's original inline display is remembered ONCE at init so we
     * don't wipe things like `display:flex` / `display:grid` when toggling.
     */
    _cacheEmptyElements() {
      var selector;
      if (this.options.emptySelector) {
        selector = this.options.emptySelector;
      } else {
        selector = '[d2-cms-empty][d2-cms-target="' + this.name + '"], '
          + '[d2-cms-list="' + this.name + '"] [d2-cms-empty]';
      }
      this._emptyEls = Array.prototype.slice.call(document.querySelectorAll(selector));

      this._emptyEls.forEach(function (el) {
        if (el._d2CmsOrigDisplay === undefined) {
          var current = el.style.display;
          // Treat a pre-set `display:none` as "no preference" — we want the
          // element to become visible (CSS default) when the list is empty.
          el._d2CmsOrigDisplay = (current === 'none') ? '' : current;
        }
      });
    }

    _updateEmptyElement(isEmpty) {
      (this._emptyEls || []).forEach(function (el) {
        if (isEmpty) {
          el.style.display = el._d2CmsOrigDisplay != null ? el._d2CmsOrigDisplay : '';
        } else {
          el.style.display = 'none';
        }
      });
    }

    _reflectButtonStates() {
      // Sort buttons
      var sortBtns = this._buttonsForName('[d2-cms-sort]');
      var self = this;
      sortBtns.forEach(function (btn) {
        var field = btn.getAttribute('d2-cms-sort');
        if (self._sort && self._sort.field === field) {
          btn.setAttribute('d2-cms-sort-active', self._sort.dir);
        } else {
          btn.removeAttribute('d2-cms-sort-active');
        }
      });

      // Filter buttons
      var filterBtns = this._buttonsForName('[d2-cms-filter]');
      filterBtns.forEach(function (btn) {
        var parsed = parseFilterAttr(btn.getAttribute('d2-cms-filter'));
        if (!parsed) return;
        var active = self._filters[parsed.key] && self._filters[parsed.key].has(parsed.value);
        if (active) btn.setAttribute('d2-cms-filter-active', '');
        else btn.removeAttribute('d2-cms-filter-active');
      });
    }

    _reflectLoadMoreButtons(visible, totalMatching) {
      var btns = this._buttonsForName('[d2-cms-load-more]');
      var done = visible >= totalMatching;
      btns.forEach(function (btn) {
        if (done) {
          btn.setAttribute('d2-cms-load-more-done', '');
          btn.style.display = 'none';
        } else {
          btn.removeAttribute('d2-cms-load-more-done');
          btn.style.display = '';
        }
      });
    }

    /**
     * Find buttons that target THIS list. A button targets this list when:
     *   - It has d2-cms-target="<name>"; OR
     *   - It is inside [d2-cms-list="<name>"] and has no d2-cms-target attr; OR
     *   - It has no d2-cms-target and there is only one registered list (handled at click time).
     * For visual-state reflection we only consider explicit matches.
     */
    _buttonsForName(attrSelector) {
      var name = this.name;
      var explicit = Array.prototype.slice.call(
        document.querySelectorAll(attrSelector + '[d2-cms-target="' + name + '"]')
      );
      var scoped = Array.prototype.slice.call(
        document.querySelectorAll('[d2-cms-list="' + name + '"] ' + attrSelector + ':not([d2-cms-target])')
      );
      return explicit.concat(scoped);
    }

    // -----------------------------------------------------------------------
    // IntersectionObserver sentinel for scroll mode
    // -----------------------------------------------------------------------
    _setupSentinel() {
      if (this.options.loadMode !== 'scroll') return;
      if (typeof IntersectionObserver === 'undefined') return;

      this._sentinel = document.createElement('div');
      this._sentinel.setAttribute('d2-cms-sentinel', this.name);
      this._sentinel.style.cssText = 'width:100%;height:1px;flex:0 0 100%;';
      this.listEl.appendChild(this._sentinel);

      var self = this;
      var rootMargin = (this.options.scrollOffset || 0) + 'px';
      this._observer = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (!entries[i].isIntersecting) continue;
          var matching = self._countMatching();
          if (self._visibleCount < matching) {
            self.loadMore(self.options.perPage);
          }
        }
      }, { root: null, rootMargin: rootMargin + ' 0px', threshold: 0 });
    }

    _observeSentinel(shouldObserve) {
      if (!this._observer || !this._sentinel) return;
      this._observer.unobserve(this._sentinel);
      if (shouldObserve) this._observer.observe(this._sentinel);
    }
  }

  // ---------------------------------------------------------------------------
  // Module registration
  // ---------------------------------------------------------------------------
  var registry = {};

  function _resolveTargetName(triggerEl) {
    var explicit = triggerEl.getAttribute('d2-cms-target');
    if (explicit) return explicit;
    var ancestor = triggerEl.closest('[d2-cms-list]');
    if (ancestor) return ancestor.getAttribute('d2-cms-list');
    var keys = Object.keys(registry);
    if (keys.length === 1) return keys[0];
    return null;
  }

  window.digi2.cms = {
    createList: function (name, options) {
      if (registry[name]) {
        console.warn('[digi2.cms] "' + name + '" already exists. Destroy it first or use a different name.');
        return registry[name];
      }
      var instance = new CMSList(name, options);
      registry[name] = instance;
      return instance;
    },

    create: function (name, options) {
      return this.createList(name, options);
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

  // ---------------------------------------------------------------------------
  // Attribute-only init — lets users configure lists entirely via HTML, no JS
  // required. Scans the DOM for [d2-cms-list] elements and creates a list for
  // each one that hasn't already been registered via digi2.cms.createList().
  //
  //   <div d2-cms-list="products"
  //        d2-cms-per-page="8"
  //        d2-cms-load-mode="scroll"
  //        d2-cms-sort-by="price"           ← default sort field (asc by default)
  //        d2-cms-sort-dir="desc"           ← optional override ("desc")
  //        d2-cms-filter-match="AND"
  //        d2-cms-hidden-class="is-hidden"
  //        d2-cms-scroll-offset="300"> … </div>
  //
  // Any option not provided falls back to the constructor defaults. Sort dir
  // defaults to 'asc' (A→Z / 0→9) — a plain `d2-cms-sort-by="title"` is enough.
  // ---------------------------------------------------------------------------
  function _optionsFromAttributes(el) {
    var opts = {};
    var v;

    v = el.getAttribute('d2-cms-per-page');
    if (v != null && v !== '') { var n = parseInt(v, 10); if (!isNaN(n)) opts.perPage = n; }

    v = el.getAttribute('d2-cms-load-mode');
    if (v === 'scroll' || v === 'button' || v === 'all') opts.loadMode = v;

    v = el.getAttribute('d2-cms-scroll-offset');
    if (v != null && v !== '') { var so = parseInt(v, 10); if (!isNaN(so)) opts.scrollOffset = so; }

    v = el.getAttribute('d2-cms-sort-by');
    if (v) {
      var dir = el.getAttribute('d2-cms-sort-dir');
      var orderRaw = el.getAttribute('d2-cms-sort-order');
      var order = orderRaw ? orderRaw.split('|').map(function (s) { return s.trim(); }).filter(Boolean) : null;
      opts.defaultSort = {
        field: v,
        dir: dir === 'desc' ? 'desc' : 'asc',
        order: order && order.length ? order : undefined,
      };
    }

    v = el.getAttribute('d2-cms-filter-match');
    if (v === 'AND' || v === 'OR') opts.filterMatchMode = v;

    v = el.getAttribute('d2-cms-hidden-class');
    if (v) opts.hiddenClass = v;

    v = el.getAttribute('d2-cms-hide-pagination');
    if (v === 'false') opts.hideNativePagination = false;

    return opts;
  }

  function _autoInitFromDOM() {
    var nodes = document.querySelectorAll('[d2-cms-list]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var name = el.getAttribute('d2-cms-list');
      if (!name || registry[name]) continue;
      // Skip elements that are inside another list (they'd be items, not lists)
      if (el.parentElement && el.parentElement.closest('[d2-cms-list]')) continue;
      window.digi2.cms.createList(name, _optionsFromAttributes(el));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _autoInitFromDOM);
  } else {
    // Defer one tick so any synchronous digi2.cms.createList(...) user script
    // running right after the module loads wins over auto-init.
    setTimeout(_autoInitFromDOM, 0);
  }

  // ---------------------------------------------------------------------------
  // Global delegated click handler — handles sort, filter, load-more buttons
  // for ANY registered list without each instance attaching its own listeners.
  // ---------------------------------------------------------------------------
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!target || !target.closest) return;

    var sortBtn = target.closest('[d2-cms-sort]');
    var filterBtn = target.closest('[d2-cms-filter]');
    var loadBtn = target.closest('[d2-cms-load-more]');

    var btn = sortBtn || filterBtn || loadBtn;
    if (!btn) return;

    var name = _resolveTargetName(btn);
    if (!name) return;
    var instance = registry[name];
    if (!instance) return;

    e.preventDefault();

    if (sortBtn) {
      var field = sortBtn.getAttribute('d2-cms-sort');
      var forced = sortBtn.getAttribute('d2-cms-sort-dir');
      var orderRaw = sortBtn.getAttribute('d2-cms-sort-order');
      var order = orderRaw ? orderRaw.split('|').map(function (s) { return s.trim(); }).filter(Boolean) : undefined;
      instance.sort(field, forced || undefined, order);
    } else if (filterBtn) {
      var parsed = parseFilterAttr(filterBtn.getAttribute('d2-cms-filter'));
      if (parsed) instance.toggleFilter(parsed.key, parsed.value);
    } else if (loadBtn) {
      instance.loadMore();
    }
  });
})();
