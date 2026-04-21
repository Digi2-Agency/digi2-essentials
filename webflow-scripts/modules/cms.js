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

  /**
   * Loose number parse: strips currency symbols, whitespace and non-numeric
   * decoration so values like "660 000 zł", "$1,250.50" or "€1.250,50" are
   * still sortable as numbers. Returns NaN if no digits found.
   */
  function parseLooseNumber(v) {
    if (v == null || v === '') return NaN;
    var s = String(v).trim();
    // Keep digits, minus, comma and dot; drop everything else (spaces, currency, letters)
    s = s.replace(/[^\d,.\-]/g, '');
    if (!s) return NaN;
    // If both separators exist, assume the LAST one is the decimal and the
    // other is a thousands separator. Otherwise just strip commas.
    var lastDot = s.lastIndexOf('.');
    var lastComma = s.lastIndexOf(',');
    if (lastDot !== -1 && lastComma !== -1) {
      if (lastDot > lastComma) {
        s = s.replace(/,/g, '');            // "1,250.50" → "1250.50"
      } else {
        s = s.replace(/\./g, '').replace(',', '.'); // "1.250,50" → "1250.50"
      }
    } else if (lastComma !== -1) {
      // Only comma — treat as decimal if there's exactly one and ≤2 trailing digits,
      // else treat as thousands separator.
      var parts = s.split(',');
      if (parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2) {
        s = parts[0] + '.' + parts[1];
      } else {
        s = s.replace(/,/g, '');
      }
    }
    var n = parseFloat(s);
    return isNaN(n) ? NaN : n;
  }

  function detectType(values) {
    var nonEmpty = [];
    for (var i = 0; i < values.length && nonEmpty.length < 5; i++) {
      if (values[i] != null && values[i] !== '') nonEmpty.push(values[i]);
    }
    if (!nonEmpty.length) return 'string';

    var allNumber = nonEmpty.every(function (v) {
      return !isNaN(parseLooseNumber(v));
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
      var an = parseLooseNumber(a);
      var bn = parseLooseNumber(b);
      // Unparseable numbers sort to the end (same rule as empty values)
      if (isNaN(an) && isNaN(bn)) return 0;
      if (isNaN(an)) return 1;
      if (isNaN(bn)) return -1;
      return an - bn;
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
        groupBy: null,                // field name for persistent secondary sort (tiebreaker)
        groupOrder: null,             // array of values defining the group order
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
      this._mo = null;                // MutationObserver watching the list for external injections
      this._moTimer = null;           // debounce timer for mutation refreshes
      this._emptyEls = [];            // cached [d2-cms-empty] elements for this list

      this._sort = null;              // { field, dir }
      this._userInitiatedSort = false; // true once the user has clicked a sort button
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

      // If we have a group order but no explicit group field (or the field
      // doesn't actually contain the listed values), auto-detect which field
      // the order values belong to. Handles the common case of writing
      // `d2-cms-sort-by="price"` + `d2-cms-sort-order="dostępne|…"` where the
      // order values are clearly meant for a different field.
      if (this.options.groupOrder && this.options.groupOrder.length) {
        if (!this.options.groupBy || !this._fieldMatchesOrder(this.options.groupBy, this.options.groupOrder)) {
          var detected = this._detectOrderField(this.options.groupOrder);
          if (detected) this.options.groupBy = detected;
        }
      }

      // Same sanity check for the active sort's own `order` (from defaultSort):
      // if the listed values don't belong to the sort field, don't use them as
      // a primary rank — that would produce a no-op tie-sort.
      if (this._sort && this._sort.order && this._sort.order.length
          && !this._fieldMatchesOrder(this._sort.field, this._sort.order)) {
        this._sort.order = null;
      }

      this._visibleCount = this.options.perPage;
      this._setupSentinel();
      this._cacheEmptyElements();
      this._render();
      this._setupMutationWatcher();

      // Safety net: some external renderers (Webflow CMS delayed hydrate,
      // third-party CMS plugins) inject items after initial DOM-ready. Do a
      // deferred refresh so those late arrivals get folded into our sort.
      var self = this;
      setTimeout(function () {
        if (!self.listEl) return;
        var expected = self.items.length + (self._sentinel ? 1 : 0);
        var actual = 0;
        var kids = self.listEl.children;
        for (var i = 0; i < kids.length; i++) {
          var k = kids[i];
          if (k.classList && k.classList.contains('w-pagination-wrapper')) continue;
          actual++;
        }
        if (actual !== expected) self.refresh();
      }, 250);

      _log('init → ' + this.name, { items: this.items.length });
    }

    // Watches the list container for external child injections (e.g. Webflow
    // CMS re-render, other scripts adding items) and auto-refreshes so
    // sort/filter stay correct. Our own _render() disconnects this observer
    // during its appendChild loop and reconnects after, so only foreign
    // mutations reach the callback.
    _setupMutationWatcher() {
      if (typeof MutationObserver === 'undefined' || !this.listEl) return;
      var self = this;
      this._mo = new MutationObserver(function () {
        if (self._moTimer) clearTimeout(self._moTimer);
        self._moTimer = setTimeout(function () {
          self._moTimer = null;
          if (!self.listEl) return;
          self.refresh();
        }, 50);
      });
      this._mo.observe(this.listEl, { childList: true });
    }

    destroy() {
      if (this._observer) {
        this._observer.disconnect();
        this._observer = null;
      }
      if (this._mo) {
        this._mo.disconnect();
        this._mo = null;
      }
      if (this._moTimer) {
        clearTimeout(this._moTimer);
        this._moTimer = null;
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

      // Toggle when same field clicked again and no explicit dir given.
      // Skip the toggle on the very first USER click for the matching
      // default-active field — that first click should start fresh at 'asc'
      // instead of flipping the default direction.
      if (dir === undefined && this._sort && this._sort.field === field) {
        if (this._userInitiatedSort) {
          dir = this._sort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          dir = 'asc';
        }
      }
      if (dir !== 'asc' && dir !== 'desc') dir = 'asc';
      this._userInitiatedSort = true;

      // Resolve the custom order:
      //   - caller provided one        → use it (only if values match this field)
      //   - same field, no new         → keep the previous order
      //   - field matches groupBy      → fall back to the configured groupOrder
      //                                  so the list-level d2-cms-sort-order
      //                                  is still honored after returning to
      //                                  the group field from another column
      //   - different field, no group  → no order (fresh sort)
      var finalOrder = null;
      if (Array.isArray(order) && order.length) {
        finalOrder = order.slice();
      } else if (this._sort && this._sort.field === field && this._sort.order) {
        finalOrder = this._sort.order.slice();
      } else if (this.options.groupBy === field
          && Array.isArray(this.options.groupOrder)
          && this.options.groupOrder.length) {
        finalOrder = this.options.groupOrder.slice();
      }

      // Drop the primary order if its values don't correspond to this field
      // (avoids the all-tied / no-op ranking when an order list from a
      // different field got carried in). Promote the values to the persistent
      // group order instead, detecting the owning field automatically.
      if (finalOrder && finalOrder.length && !this._fieldMatchesOrder(field, finalOrder)) {
        var detected = this._detectOrderField(finalOrder);
        if (detected) {
          this.options.groupBy = detected;
          this.options.groupOrder = finalOrder.slice();
        }
        finalOrder = null;
      }

      this._sort = { field: field, dir: dir, order: finalOrder };
      this._render();

      if (typeof this.options.onSort === 'function') {
        this.options.onSort(field, dir);
      }
      _log('sort', this._sort);
    }

    clearSort() {
      this._sort = null;
      this._userInitiatedSort = false;
      this._render();
      if (typeof this.options.onSort === 'function') this.options.onSort(null, null);
      _log('clearSort');
    }

    // Set the direction of the current sort. `dir` may be 'asc', 'desc', or
    // 'toggle'. No-op when there's no active sort field.
    setDirection(dir) {
      if (!this._sort || !this._sort.field) return;
      var next;
      if (dir === 'toggle') {
        next = this._sort.dir === 'desc' ? 'asc' : 'desc';
      } else if (dir === 'asc' || dir === 'desc') {
        next = dir;
      } else {
        return;
      }
      if (next === this._sort.dir) return;
      this._sort.dir = next;
      this._render();
      if (typeof this.options.onSort === 'function') {
        this.options.onSort(this._sort.field, next);
      }
      _log('setDirection → ' + next);
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
      var groupRanker = this._buildGroupRanker();
      // Group rank is PRIMARY — the collection-list group order (e.g.
      // status: dostępne → zarezerwowane → sprzedane) takes precedence
      // over whatever column the user clicked, so "dostępne" always leads.
      // Exception: when the user explicitly sorts the group field itself,
      // their direction drives the ordering and we suspend the group rank.
      var groupActive = !!groupRanker
        && (!this._sort || this._sort.field !== this.options.groupBy);

      if (!this._sort || !this._sort.field) {
        if (groupActive) {
          matching.sort(function (a, b) { return groupRanker(a) - groupRanker(b); });
        }
        return matching;
      }

      var field = this._sort.field;
      var dir = this._sort.dir === 'desc' ? -1 : 1;

      // Custom value order ON THE SORT FIELD overrides type-based comparison.
      var order = this._sort.order;
      if (order && order.length) {
        var orderMap = {};
        for (var i = 0; i < order.length; i++) {
          orderMap[String(order[i]).toLowerCase().trim()] = i;
        }
        var UNRANKED = order.length;
        var EMPTY_RANK = UNRANKED + 1;
        var rank = function (val) {
          if (val == null || val === '') return EMPTY_RANK;
          var key = String(val).toLowerCase().trim();
          return key in orderMap ? orderMap[key] : UNRANKED;
        };
        matching.sort(function (a, b) {
          if (groupActive) {
            var gr = groupRanker(a) - groupRanker(b);
            if (gr !== 0) return gr;
          }
          var ar = rank(a.fields[field]);
          var br = rank(b.fields[field]);
          // Empties sort to the end of their group, regardless of direction
          var aE = ar === EMPTY_RANK, bE = br === EMPTY_RANK;
          if (aE && !bE) return 1;
          if (!aE && bE) return -1;
          if (aE && bE) return 0;
          return dir * (ar - br);
        });
        return matching;
      }

      // Resolve sort type:
      //   1. d2-cms-sort-type on the sort button
      //   2. d2-cms-field-type on any item's [d2-cms-field] element
      //   3. Auto-detect from the values
      var type = this._sortTypeOverride(field)
        || this._fieldTypeFromItems(field)
        || detectType(matching.map(function (it) { return it.fields[field]; }));

      // "Empty for sort" = null, "", or unparseable for the chosen type.
      // Keeping this independent of `dir` is critical — otherwise descending
      // sort would flip empties to the top.
      var isSortEmpty = function (v) {
        if (v == null || v === '') return true;
        if (type === 'number') return isNaN(parseLooseNumber(v));
        if (type === 'date') return isNaN(Date.parse(v));
        return false;
      };

      matching.sort(function (a, b) {
        if (groupActive) {
          var gr = groupRanker(a) - groupRanker(b);
          if (gr !== 0) return gr;
        }
        var av = a.fields[field], bv = b.fields[field];
        var aE = isSortEmpty(av), bE = isSortEmpty(bv);
        // Empties sort to the end of their group, regardless of direction
        if (aE && !bE) return 1;
        if (!aE && bE) return -1;
        if (aE && bE) return 0;
        return dir * compareValues(av, bv, type);
      });
      return matching;
    }

    // True if at least one item has a value for `field` that appears in the
    // given `order` list (case-insensitive, trimmed). Used to detect when a
    // supplied order actually corresponds to the field being sorted.
    _fieldMatchesOrder(field, order) {
      if (!field || !Array.isArray(order) || !order.length) return false;
      var set = {};
      for (var i = 0; i < order.length; i++) {
        set[String(order[i]).toLowerCase().trim()] = true;
      }
      for (var j = 0; j < this.items.length; j++) {
        var v = this.items[j].fields[field];
        if (v == null || v === '') continue;
        if (set[String(v).toLowerCase().trim()]) return true;
      }
      return false;
    }

    // Given a value-order list, find which item field has values matching it.
    // Returns the field name with the most matches, or null if nothing matches.
    _detectOrderField(order) {
      var set = {};
      for (var i = 0; i < order.length; i++) {
        set[String(order[i]).toLowerCase().trim()] = true;
      }
      var counts = {};
      for (var j = 0; j < this.items.length; j++) {
        var fields = this.items[j].fields;
        for (var k in fields) {
          if (!Object.prototype.hasOwnProperty.call(fields, k)) continue;
          var v = fields[k];
          if (v == null || v === '') continue;
          if (set[String(v).toLowerCase().trim()]) {
            counts[k] = (counts[k] || 0) + 1;
          }
        }
      }
      var best = null, bestCount = 0;
      for (var f in counts) {
        if (counts[f] > bestCount) { best = f; bestCount = counts[f]; }
      }
      return best;
    }

    // Build a ranker that maps items to a numeric position based on the
    // configured group field + order (`options.groupBy` / `options.groupOrder`).
    // Returns null if no group sort is configured. Values not listed get a
    // rank past the listed ones; missing/empty values go even further back.
    _buildGroupRanker() {
      var gf = this.options.groupBy;
      var go = this.options.groupOrder;
      if (!gf || !Array.isArray(go) || !go.length) return null;
      var map = {};
      for (var i = 0; i < go.length; i++) {
        map[String(go[i]).toLowerCase().trim()] = i;
      }
      var UNK = go.length;
      var EMPTY = UNK + 1;
      return function (item) {
        var v = item.fields[gf];
        if (v == null || v === '') return EMPTY;
        var key = String(v).toLowerCase().trim();
        return key in map ? map[key] : UNK;
      };
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

      // Pause the mutation watcher so our own appendChild loop doesn't
      // trigger a self-refresh. Reconnected after the reorder completes.
      var moPaused = false;
      if (this._mo) {
        this._mo.disconnect();
        moPaused = true;
      }

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

      // Update display/counter elements
      this._updateDisplayElements({
        visible: visibleCount,
        matching: matching.length,
        total: this.items.length,
        hidden: this.items.length - matching.length,
        remaining: Math.max(0, matching.length - visibleCount),
      });

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

      // Reconnect the mutation watcher now that our reorder has fully settled
      if (moPaused && this._mo && this.listEl) {
        this._mo.observe(this.listEl, { childList: true });
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
      if (this.options.emptySelector) {
        this._emptyEls = Array.prototype.slice.call(
          document.querySelectorAll(this.options.emptySelector)
        );
      } else {
        var scopedSel = '[d2-cms-empty][d2-cms-target="' + this.name + '"], '
          + '[d2-cms-list="' + this.name + '"] [d2-cms-empty]:not([d2-cms-target])';
        this._emptyEls = Array.prototype.slice.call(document.querySelectorAll(scopedSel));
        if (this._isSoloList()) {
          this._emptyEls = this._emptyEls.concat(this._orphansBySelector('[d2-cms-empty]'));
        }
      }

      this._emptyEls.forEach(function (el) {
        if (el._d2CmsOrigDisplay === undefined) {
          var current = el.style.display;
          // Treat a pre-set `display:none` as "no preference" — we want the
          // element to become visible (CSS default) when the list is empty.
          el._d2CmsOrigDisplay = (current === 'none') ? '' : current;
        }
      });
    }

    /**
     * Whether this is the only registered list. Used to let [d2-cms-empty],
     * [d2-cms-display], [d2-cms-sort], [d2-cms-filter], [d2-cms-load-more]
     * work without either a `d2-cms-target` attribute OR being nested inside
     * a `[d2-cms-list]` element — the common single-list case.
     *
     * During initial construction the registry is empty (the instance is
     * registered only AFTER new CMSList(...) returns), so "empty registry"
     * also counts as solo.
     */
    _isSoloList() {
      var keys = Object.keys(registry);
      if (keys.length === 0) return true;
      return keys.length === 1 && keys[0] === this.name;
    }

    /**
     * Return elements that match `baseSelector`, have no `d2-cms-target` attr,
     * AND are not nested inside any [d2-cms-list] element. These are "orphans"
     * that belong to whoever is the only registered list.
     */
    _orphansBySelector(baseSelector) {
      var nodes = document.querySelectorAll(baseSelector + ':not([d2-cms-target])');
      var out = [];
      for (var i = 0; i < nodes.length; i++) {
        if (!nodes[i].closest('[d2-cms-list]')) out.push(nodes[i]);
      }
      return out;
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

    /**
     * Display/counter elements. Put `d2-cms-display="<kind>"` on any element
     * and the module writes the matching number (or text) into it on every
     * render. Supported kinds:
     *   "visible"   — items currently shown on screen (after pagination)
     *   "matching"  — items matching current filters (total visible if loadAll)
     *   "total"     — total items in the list (ignores filters)
     *   "hidden"    — items hidden by filters (total - matching)
     *   "remaining" — items that would be revealed on next load (matching - visible)
     *
     * Or use `d2-cms-display-format="{visible} of {matching}"` on the element
     * for a templated string; any of the tokens above work inside {…}.
     * A `d2-cms-display-format` value takes precedence over `d2-cms-display`.
     *
     * Scoping: element is claimed by this list if it has `d2-cms-target="<name>"`
     * OR is nested inside `[d2-cms-list="<name>"]`. If neither is set and this
     * is the only registered list, the orphan element is claimed automatically.
     */
    _updateDisplayElements(counts) {
      var name = this.name;
      var scopedSel = '[d2-cms-display][d2-cms-target="' + name + '"], '
        + '[d2-cms-display-format][d2-cms-target="' + name + '"], '
        + '[d2-cms-list="' + name + '"] [d2-cms-display]:not([d2-cms-target]), '
        + '[d2-cms-list="' + name + '"] [d2-cms-display-format]:not([d2-cms-target])';
      var els = Array.prototype.slice.call(document.querySelectorAll(scopedSel));
      if (this._isSoloList()) {
        els = els
          .concat(this._orphansBySelector('[d2-cms-display]'))
          .concat(this._orphansBySelector('[d2-cms-display-format]'));
      }

      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        var format = el.getAttribute('d2-cms-display-format');
        var kind = el.getAttribute('d2-cms-display');
        var text;
        if (format) {
          text = format.replace(/\{(\w+)\}/g, function (_, token) {
            return (token in counts) ? String(counts[token]) : '{' + token + '}';
          });
        } else if (kind && kind in counts) {
          text = String(counts[kind]);
        } else {
          continue;
        }
        if (el.textContent !== text) el.textContent = text;
      }
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

      // Filter buttons (and <input type="checkbox|radio"> carrying d2-cms-filter)
      var filterBtns = this._buttonsForName('[d2-cms-filter]');
      filterBtns.forEach(function (btn) {
        var parsed = parseFilterAttr(btn.getAttribute('d2-cms-filter'));
        if (!parsed) return;
        var active = !!(self._filters[parsed.key] && self._filters[parsed.key].has(parsed.value));
        if (active) btn.setAttribute('d2-cms-filter-active', '');
        else btn.removeAttribute('d2-cms-filter-active');

        // Sync native checkbox/radio checked state with the filter. Matters
        // when filters are changed programmatically or from another trigger.
        if (btn.tagName === 'INPUT') {
          var t = btn.type;
          if ((t === 'checkbox' || t === 'radio') && btn.checked !== active) {
            btn.checked = active;
          }
        }
      });

      // Direction buttons — reflect the current sort dir (asc/desc). A
      // "toggle" button simply reports whichever direction is active so CSS
      // can still style it based on the current state.
      var dirBtns = this._buttonsForName('[d2-cms-direction]');
      var activeDir = self._sort ? self._sort.dir : null;
      dirBtns.forEach(function (btn) {
        var want = (btn.getAttribute('d2-cms-direction') || 'toggle').trim();
        var isActive;
        if (want === 'asc' || want === 'desc') {
          isActive = activeDir === want;
        } else {
          // toggle: active whenever there IS a sort
          isActive = !!activeDir;
        }
        if (isActive && activeDir) {
          btn.setAttribute('d2-cms-direction-active', activeDir);
        } else {
          btn.removeAttribute('d2-cms-direction-active');
        }
      });

      // Native <select> sort controls — sync select.value to the active sort
      this._reflectSortSelects();

      // Sort-label elements (custom dropdown trigger text, standalone display)
      this._reflectSortLabels();

      // Filter-label elements (custom dropdown trigger text for filters)
      this._reflectFilterLabels();
    }

    // For each <select> whose options carry d2-cms-sort, find the option that
    // matches the current _sort state and sync the select's value to it.
    // This keeps a native select in sync when sort is changed programmatically
    // or via a different UI element (e.g. custom dropdown item).
    _reflectSortSelects() {
      var self = this;
      var selects = document.querySelectorAll('select');
      Array.prototype.forEach.call(selects, function (sel) {
        var sortEnabled = false;
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].hasAttribute('d2-cms-sort')) { sortEnabled = true; break; }
        }
        if (!sortEnabled) return;
        if (_resolveTargetName(sel) !== self.name) return;

        var best = null, fieldOnly = null, clearOpt = null;
        for (var j = 0; j < sel.options.length; j++) {
          var o = sel.options[j];
          if (!o.hasAttribute('d2-cms-sort')) continue;
          var f = o.getAttribute('d2-cms-sort');
          if (!f) { if (!clearOpt) clearOpt = o; continue; }
          if (!self._sort || f !== self._sort.field) continue;
          var d = o.getAttribute('d2-cms-sort-dir');
          if (d === self._sort.dir) { best = o; break; }
          if (!d && !fieldOnly) fieldOnly = o;
        }
        var chosen = best || fieldOnly || (!self._sort ? clearOpt : null);
        if (chosen && sel.value !== chosen.value) sel.value = chosen.value;
      });
    }

    // Update any [d2-cms-sort-label] elements to the text of the option that
    // matches the current sort. Works with both native <option> inside a
    // <select> and custom [d2-cms-sort] items (divs / buttons). Original
    // textContent is remembered and restored when no sort is active.
    _reflectSortLabels() {
      var self = this;
      var labels = this._buttonsForName('[d2-cms-sort-label]');
      labels.forEach(function (label) {
        if (label._d2CmsSortLabelDefault == null) {
          label._d2CmsSortLabelDefault = label.textContent;
        }
        var def = label._d2CmsSortLabelDefault;
        if (!self._sort || !self._sort.field) {
          if (label.textContent !== def) label.textContent = def;
          return;
        }
        // Scope the lookup: when the label sits inside a Webflow dropdown (or
        // any [d2-cms-sort-scope] wrapper), only options within that same
        // scope can drive its text. This prevents unrelated sort triggers
        // elsewhere on the page (e.g. table-header sort buttons) from
        // hijacking a dropdown's trigger label.
        var scope = label.closest('[d2-cms-sort-scope], .w-dropdown') || null;
        var text = self._findActiveSortOptionText(self._sort.field, self._sort.dir, scope);
        var next = (text != null && text !== '') ? text : def;
        if (label.textContent !== next) label.textContent = next;
      });
    }

    // Returns the text (or `d2-cms-sort-option-label` override) of whichever
    // option element — <option> inside a targeted <select> or a targeted
    // [d2-cms-sort] div — best matches the active sort field + direction.
    // When `scope` is provided, only candidates inside that element count.
    _findActiveSortOptionText(field, dir, scope) {
      var self = this;
      var candidates = [];

      // <option> candidates — scope by their parent select's target
      var opts = document.querySelectorAll('option[d2-cms-sort]');
      for (var i = 0; i < opts.length; i++) {
        var sel = opts[i].closest('select');
        if (!sel) continue;
        if (_resolveTargetName(sel) !== self.name) continue;
        if (scope && !scope.contains(opts[i])) continue;
        candidates.push(opts[i]);
      }
      // [d2-cms-sort] divs / buttons targeting this list
      var btnCands = this._buttonsForName('[d2-cms-sort]');
      for (var b = 0; b < btnCands.length; b++) {
        if (scope && !scope.contains(btnCands[b])) continue;
        candidates.push(btnCands[b]);
      }

      var exact = null, fieldOnly = null;
      for (var j = 0; j < candidates.length; j++) {
        var c = candidates[j];
        if (c.getAttribute('d2-cms-sort') !== field) continue;
        var cDir = c.getAttribute('d2-cms-sort-dir');
        if (cDir === dir) { exact = c; break; }
        if (!cDir && !fieldOnly) fieldOnly = c;
      }
      var chosen = exact || fieldOnly;
      if (!chosen) return null;
      var explicit = chosen.getAttribute('d2-cms-sort-option-label');
      if (explicit) return explicit;
      return (chosen.textContent || '').trim();
    }

    // Update any [d2-cms-filter-label] elements to reflect the active filter.
    // Works like sort labels: original textContent is remembered once and
    // restored whenever no filter is active for the bound key.
    //
    //   <div d2-cms-filter-label="status">Any status</div>   ← tracks "status" key
    //   <div d2-cms-filter-label>All filters</div>            ← tracks any key
    //
    // If multiple values are active for the key they're joined with ", ".
    _reflectFilterLabels() {
      var self = this;
      var labels = this._buttonsForName('[d2-cms-filter-label]');
      labels.forEach(function (label) {
        if (label._d2CmsFilterLabelDefault == null) {
          label._d2CmsFilterLabelDefault = label.textContent;
        }
        var def = label._d2CmsFilterLabelDefault;
        var key = label.getAttribute('d2-cms-filter-label');
        // Only options inside the same dropdown/scope as the label can drive
        // its text — keeps unrelated filter triggers outside this dropdown
        // from overwriting the label.
        var scope = label.closest('[d2-cms-filter-scope], .w-dropdown') || null;

        var activeValues = [];
        if (key) {
          if (self._filters[key] && self._filters[key].size) {
            activeValues = Array.from(self._filters[key]);
          }
        } else {
          // No explicit key — show values from any active filter
          for (var k in self._filters) {
            if (!Object.prototype.hasOwnProperty.call(self._filters, k)) continue;
            if (!self._filters[k] || !self._filters[k].size) continue;
            var vs = Array.from(self._filters[k]);
            for (var i = 0; i < vs.length; i++) activeValues.push(vs[i]);
          }
        }

        // When scoped, keep only values whose matching [d2-cms-filter] option
        // lives inside this label's scope. A dropdown of "status" options
        // should stay on its default text when the user activates a different
        // filter (e.g. from a table-header chip).
        if (scope && activeValues.length) {
          activeValues = activeValues.filter(function (val) {
            return self._findActiveFilterOptionText(key, val, scope) != null;
          });
        }

        if (!activeValues.length) {
          if (label.textContent !== def) label.textContent = def;
          return;
        }

        var texts = activeValues.map(function (val) {
          var t = self._findActiveFilterOptionText(key, val, scope);
          return (t != null && t !== '') ? t : val;
        });
        var next = texts.join(', ');
        if (label.textContent !== next) label.textContent = next;
      });
    }

    // Returns the text (or `d2-cms-filter-option-label` override) of the
    // [d2-cms-filter] element matching the given key+value pair. When `key`
    // is null/empty the lookup matches on value alone. When `scope` is set,
    // only candidates inside that element count.
    _findActiveFilterOptionText(key, value, scope) {
      var candidates = this._buttonsForName('[d2-cms-filter]');
      for (var i = 0; i < candidates.length; i++) {
        if (scope && !scope.contains(candidates[i])) continue;
        var parsed = parseFilterAttr(candidates[i].getAttribute('d2-cms-filter'));
        if (!parsed) continue;
        if (key && parsed.key !== key) continue;
        if (parsed.value !== value) continue;
        var explicit = candidates[i].getAttribute('d2-cms-filter-option-label');
        if (explicit) return explicit;
        return (candidates[i].textContent || '').trim();
      }
      return null;
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
     *   - It is an orphan (no target, not inside any list) AND this is the only registered list.
     * Used for visual-state reflection — matches the click handler's resolution.
     */
    _buttonsForName(attrSelector) {
      var name = this.name;
      var explicit = Array.prototype.slice.call(
        document.querySelectorAll(attrSelector + '[d2-cms-target="' + name + '"]')
      );
      var scoped = Array.prototype.slice.call(
        document.querySelectorAll('[d2-cms-list="' + name + '"] ' + attrSelector + ':not([d2-cms-target])')
      );
      var result = explicit.concat(scoped);
      if (this._isSoloList()) {
        result = result.concat(this._orphansBySelector(attrSelector));
      }
      return result;
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

  // Close the nearest Webflow dropdown containing `el`. Webflow auto-closes
  // when a `.w-dropdown-link` is clicked, but our custom [d2-cms-sort] /
  // [d2-cms-filter] / [d2-cms-direction] triggers aren't dropdown-links — so
  // the dropdown stays open after a selection. We mirror Webflow's own close
  // path: strip `w--open` from the dropdown, toggle and list, flip aria, and
  // blur the toggle so it visually deactivates.
  function _closeContainingDropdown(el) {
    if (!el || !el.closest) return;
    var dd = el.closest('.w-dropdown');
    if (!dd) return;
    var toggle = dd.querySelector('.w-dropdown-toggle');
    var list = dd.querySelector('.w-dropdown-list');
    dd.classList.remove('w--open');
    if (toggle) {
      toggle.classList.remove('w--open');
      toggle.setAttribute('aria-expanded', 'false');
      if (typeof toggle.blur === 'function') toggle.blur();
    }
    if (list) list.classList.remove('w--open');
  }

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
      // A list-level sort-by + sort-order also establishes a persistent "group"
      // secondary sort. This way, when the user later clicks a different sort
      // button (e.g. price), the custom status order still applies to group
      // empty-price items / ties by status.
      if (order && order.length) {
        opts.groupBy = v;
        opts.groupOrder = order.slice();
      }
    }

    // Explicit group-sort attributes override the implicit default above.
    var gb = el.getAttribute('d2-cms-group-by');
    var goRaw = el.getAttribute('d2-cms-group-order');
    if (gb && goRaw) {
      var go = goRaw.split('|').map(function (s) { return s.trim(); }).filter(Boolean);
      if (go.length) {
        opts.groupBy = gb;
        opts.groupOrder = go;
      }
    }

    v = el.getAttribute('d2-cms-filter-match');
    if (v === 'AND' || v === 'OR') opts.filterMatchMode = v;

    v = el.getAttribute('d2-cms-hidden-class');
    if (v) opts.hiddenClass = v;

    v = el.getAttribute('d2-cms-hide-pagination');
    if (v === 'false') opts.hideNativePagination = false;

    return opts;
  }

  var _autoNameCounter = 0;
  function _autoInitFromDOM() {
    var nodes = document.querySelectorAll('[d2-cms-list]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      // Skip elements that are inside another list (they'd be items, not lists)
      if (el.parentElement && el.parentElement.closest('[d2-cms-list]')) continue;

      var name = el.getAttribute('d2-cms-list');
      if (!name) {
        // Auto-generate a name when `d2-cms-list` is present but empty
        do { name = '_auto_' + (++_autoNameCounter); } while (registry[name]);
        el.setAttribute('d2-cms-list', name);
      }
      if (registry[name]) continue;
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
    var dirBtn = target.closest('[d2-cms-direction]');

    // Checkbox/radio inputs drive filters via the 'change' event — let the
    // browser toggle `checked` natively and skip the click path here.
    if (filterBtn && filterBtn.tagName === 'INPUT'
        && (filterBtn.type === 'checkbox' || filterBtn.type === 'radio')) {
      filterBtn = null;
    }

    var btn = sortBtn || filterBtn || loadBtn || dirBtn;
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
    } else if (dirBtn) {
      var dirVal = (dirBtn.getAttribute('d2-cms-direction') || 'toggle').trim();
      instance.setDirection(dirVal || 'toggle');
    }

    // Close any Webflow dropdown wrapping the clicked trigger. No-op when the
    // trigger isn't inside a .w-dropdown (e.g. standalone buttons, load-more).
    _closeContainingDropdown(btn);
  });

  // ---------------------------------------------------------------------------
  // Delegated 'change' handler — native <select> sort controls
  //
  //   <select d2-cms-target="apartments">
  //     <option value="none">Default order</option>   <!-- clears sort -->
  //     <option value="price-asc"  d2-cms-sort="price" d2-cms-sort-dir="asc">Price: low → high</option>
  //     <option value="price-desc" d2-cms-sort="price" d2-cms-sort-dir="desc">Price: high → low</option>
  //     <option value="area-desc"  d2-cms-sort="area"  d2-cms-sort-dir="desc">Biggest first</option>
  //   </select>
  //
  // Selected option's attrs drive the sort. An option with no `d2-cms-sort`
  // (or an empty value) clears the sort. Selects are explicit choices — no
  // toggle behavior; direction defaults to 'asc' when the option omits it.
  // ---------------------------------------------------------------------------
  document.addEventListener('change', function (e) {
    var target = e.target;
    if (!target) return;

    // ---- <input type="checkbox|radio" d2-cms-filter="key:value"> ----
    // Checkbox → toggle the value for its key (multi-select semantics).
    // Radio    → replace whatever is active for the key with this value
    //            (single-select semantics; unchecking another radio of the
    //            same group is handled by the browser, which doesn't fire
    //            a `change` event for the deselected one — so we clear the
    //            key before adding to keep state clean).
    if (target.tagName === 'INPUT' && target.hasAttribute('d2-cms-filter')
        && (target.type === 'checkbox' || target.type === 'radio')) {
      var fparsed = parseFilterAttr(target.getAttribute('d2-cms-filter'));
      if (!fparsed) return;
      var fname = _resolveTargetName(target);
      if (!fname) return;
      var finstance = registry[fname];
      if (!finstance) return;

      if (target.type === 'radio') {
        finstance.removeFilter(fparsed.key);
        if (target.checked) finstance.addFilter(fparsed.key, fparsed.value);
      } else {
        if (target.checked) finstance.addFilter(fparsed.key, fparsed.value);
        else finstance.removeFilter(fparsed.key, fparsed.value);
      }
      return;
    }

    if (target.tagName !== 'SELECT') return;

    // Only handle selects that carry any sort-bound option
    var sortEnabled = false;
    for (var i = 0; i < target.options.length; i++) {
      if (target.options[i].hasAttribute('d2-cms-sort')) { sortEnabled = true; break; }
    }
    if (!sortEnabled) return;

    var opt = target.options[target.selectedIndex];
    var name = _resolveTargetName(target) || (opt ? _resolveTargetName(opt) : null);
    if (!name) return;
    var instance = registry[name];
    if (!instance) return;

    var field = opt ? opt.getAttribute('d2-cms-sort') : null;
    if (!field) {
      instance.clearSort();
      return;
    }

    var forced = opt.getAttribute('d2-cms-sort-dir');
    var orderRaw = opt.getAttribute('d2-cms-sort-order');
    var order = orderRaw
      ? orderRaw.split('|').map(function (s) { return s.trim(); }).filter(Boolean)
      : undefined;
    instance.sort(field, forced || 'asc', order);
  });
})();
