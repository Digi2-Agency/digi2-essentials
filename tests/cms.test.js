const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'webflow-scripts', 'modules', 'cms.js');

function createElement(tagName, attrs, textContent) {
  const classes = new Set();
  const attrList = [];
  const findAttr = (name) => { for (let i = 0; i < attrList.length; i++) if (attrList[i].name === name) return i; return -1; };
  const el = {
    tagName: tagName.toUpperCase(),
    attributes: attrList,
    children: [],
    parentNode: null,
    parentElement: null,
    style: {
      display: '',
      setProperty(name, value) {
        this[name] = value;
      },
    },
    textContent: textContent || '',
    offsetWidth: 0,
    _listeners: {},
    classList: {
      add(name) {
        classes.add(name);
      },
      remove(name) {
        classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      },
    },
    getAttribute(name) {
      const i = findAttr(name);
      return i === -1 ? null : attrList[i].value;
    },
    setAttribute(name, value) {
      const i = findAttr(name);
      if (i === -1) attrList.push({ name, value: String(value) });
      else attrList[i].value = String(value);
    },
    removeAttribute(name) {
      const i = findAttr(name);
      if (i !== -1) attrList.splice(i, 1);
    },
    hasAttribute(name) {
      return findAttr(name) !== -1;
    },
    get options() {
      return this.children.filter((c) => c.tagName === 'OPTION');
    },
    addEventListener(type, fn) {
      this._listeners[type] = fn;
    },
    removeEventListener(type) {
      delete this._listeners[type];
    },
    nodeType: 1,
    get firstChild() { return this.children[0] || null; },
    insertBefore(child, ref) {
      if (child.parentElement) {
        child.parentElement.children = child.parentElement.children.filter((item) => item !== child);
      }
      child.parentNode = this;
      child.parentElement = this;
      const at = this.children.indexOf(ref);
      if (at === -1) this.children.push(child);
      else this.children.splice(at, 0, child);
      return child;
    },
    appendChild(child) {
      if (child.parentElement) {
        child.parentElement.children = child.parentElement.children.filter((item) => item !== child);
      }
      child.parentNode = this;
      child.parentElement = this;
      this.children.push(child);
      return child;
    },
    contains(node) {
      if (node === this) return true;
      return this.children.some((child) => child.contains && child.contains(node));
    },
    closest(selector) {
      let node = this;
      while (node) {
        if (matchesSelector(node, selector)) return node;
        node = node.parentElement;
      }
      return null;
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector) {
      const results = [];
      const selectors = selector.split(',').map((item) => item.trim()).filter(Boolean);

      function walk(node) {
        node.children.forEach((child) => {
          if (selectors.some((sel) => matchesSelector(child, sel))) results.push(child);
          walk(child);
        });
      }

      walk(this);
      return results;
    },
    getBoundingClientRect() {
      return { left: 0, width: 100 };
    },
  };

  Object.entries(attrs || {}).forEach(([name, value]) => attrList.push({ name, value: String(value) }));

  if (attrs && attrs.class) {
    attrs.class.split(/\s+/).filter(Boolean).forEach((name) => classes.add(name));
  }

  return el;
}

function matchesSelector(node, selector) {
  if (!node || !selector) return false;
  const selectors = selector.split(',').map((item) => item.trim()).filter(Boolean);
  if (selectors.length > 1) {
    return selectors.some((sel) => matchesSelector(node, sel));
  }

  const parts = selector.trim().split(/\s+/);
  if (parts.length > 1) {
    const right = parts.pop();
    const left = parts.join(' ');
    if (!matchesSelector(node, right)) return false;
    let ancestor = node.parentElement;
    while (ancestor) {
      if (matchesSelector(ancestor, left)) return true;
      ancestor = ancestor.parentElement;
    }
    return false;
  }

  let simple = selector.trim();
  const notMatches = Array.from(simple.matchAll(/:not\(\[([^\]]+)\]\)/g)).map((match) => match[1]);
  simple = simple.replace(/:not\(\[[^\]]+\]\)/g, '');

  for (const attrName of notMatches) {
    if (node.hasAttribute(attrName)) return false;
  }

  const tagMatch = simple.match(/^[a-zA-Z][a-zA-Z0-9-]*/);
  if (tagMatch && node.tagName !== tagMatch[0].toUpperCase()) return false;

  if (simple.startsWith('.')) {
    return node.classList.contains(simple.slice(1));
  }

  const attrMatches = Array.from(simple.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g));
  for (const match of attrMatches) {
    const attrName = match[1];
    const expected = match[2];
    if (!node.hasAttribute(attrName)) return false;
    if (expected !== undefined && node.getAttribute(attrName) !== expected) return false;
  }

  return !!tagMatch || attrMatches.length > 0 || selector === '*';
}

function createItem(fields) {
  const item = createElement('div', { 'd2-cms-item': '' });
  Object.entries(fields).forEach(([name, value]) => {
    item.appendChild(createElement('span', { 'd2-cms-field': name }, String(value)));
  });
  return item;
}

function createPriceItem(value) {
  const item = createElement('div', { 'd2-cms-item': '' });
  item.appendChild(createElement('span', { 'd2-format-price': '' }, String(value)));
  return item;
}

function createEnvironment() {
  const body = createElement('body');
  const listeners = {};

  const document = {
    body,
    readyState: 'complete',
    addEventListener(type, fn) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    },
    removeEventListener() {},
    querySelector(selector) {
      return body.querySelector(selector);
    },
    querySelectorAll(selector) {
      return body.querySelectorAll(selector);
    },
    createElement,
  };

  const window = {
    digi2: {
      log() {},
    },
    location: { href: 'https://example.com/offers' },
  };

  window.document = document;

  return {
    context: vm.createContext({
      window,
      document,
      console,
      setTimeout,
      clearTimeout,
      URL,
      history: { replaceState() {} },
    }),
    window,
    document,
    body,
    listeners,
  };
}

function loadCmsModule(env) {
  const code = fs.readFileSync(modulePath, 'utf8');
  vm.runInContext(code, env.context, { filename: modulePath });
}

function flushTimers() {
  return new Promise((resolve) => setTimeout(resolve, 5));
}

function dispatchDocument(env, type, target) {
  const event = {
    target,
    defaultPrevented: false,
    propagationStopped: false,
    immediatePropagationStopped: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.propagationStopped = true;
    },
    stopImmediatePropagation() {
      this.immediatePropagationStopped = true;
    },
  };
  (env.listeners[type] || []).forEach((fn) => fn(event));
  return event;
}

test('filter trigger can target multiple CMS lists', async () => {
  const env = createEnvironment();
  const trigger = createElement('button', {
    'd2-cms-filter': 'status:Dostępne',
    'd2-cms-target': 'offers-list|offers-grid',
  });
  const list = createElement('div', { 'd2-cms-list': 'offers-list' });
  const grid = createElement('div', { 'd2-cms-list': 'offers-grid' });
  const listAvailable = createItem({ status: 'Dostępne' });
  const listSold = createItem({ status: 'Sprzedane' });
  const gridAvailable = createItem({ status: 'Dostępne' });
  const gridSold = createItem({ status: 'Sprzedane' });

  list.appendChild(listAvailable);
  list.appendChild(listSold);
  grid.appendChild(gridAvailable);
  grid.appendChild(gridSold);
  env.body.appendChild(trigger);
  env.body.appendChild(list);
  env.body.appendChild(grid);

  loadCmsModule(env);
  await flushTimers();

  dispatchDocument(env, 'click', trigger);

  assert.equal(listAvailable.style.display, '');
  assert.equal(listSold.style.display, 'none');
  assert.equal(gridAvailable.style.display, '');
  assert.equal(gridSold.style.display, 'none');
});

test('range slider can target multiple CMS lists', async () => {
  const env = createEnvironment();
  const range = createElement('div', {
    'd2-cms-range': '',
    'd2-cms-range-field': 'price',
    'd2-cms-range-min': '0',
    'd2-cms-range-max': '100',
    'd2-cms-range-step': '10',
    'd2-cms-target': 'offers-list|offers-grid',
  });
  const track = createElement('div', { 'd2-cms-range-track': '' });
  const fill = createElement('div', { 'd2-cms-range-fill': '' });
  const minHandle = createElement('button', { 'd2-cms-range-handle': 'min' });
  const maxHandle = createElement('button', { 'd2-cms-range-handle': 'max' });
  track.appendChild(fill);
  track.appendChild(minHandle);
  track.appendChild(maxHandle);
  range.appendChild(track);

  const list = createElement('div', { 'd2-cms-list': 'offers-list' });
  const grid = createElement('div', { 'd2-cms-list': 'offers-grid' });
  const listLow = createItem({ price: '40' });
  const listHigh = createItem({ price: '80' });
  const gridLow = createItem({ price: '40' });
  const gridHigh = createItem({ price: '80' });

  list.appendChild(listLow);
  list.appendChild(listHigh);
  grid.appendChild(gridLow);
  grid.appendChild(gridHigh);
  env.body.appendChild(range);
  env.body.appendChild(list);
  env.body.appendChild(grid);

  loadCmsModule(env);
  await flushTimers();

  track._listeners.pointerdown({
    target: track,
    clientX: 50,
    preventDefault() {},
  });

  assert.equal(listLow.style.display, 'none');
  assert.equal(listHigh.style.display, '');
  assert.equal(gridLow.style.display, 'none');
  assert.equal(gridHigh.style.display, '');
});

test('currency displayformat alias formats the number without injecting a unit', async () => {
  const env = createEnvironment();
  const range = createElement('div', {
    'd2-cms-range': '',
    'd2-cms-range-field': 'price',
    'd2-cms-range-min': '0',
    'd2-cms-range-max': '2000',
    'd2-cms-range-step': '10',
    'd2-cms-range-displayformat': 'PLN',
    'd2-cms-target': 'offers-list',
  });
  const track = createElement('div', { 'd2-cms-range-track': '' });
  const fill = createElement('div', { 'd2-cms-range-fill': '' });
  const minHandle = createElement('button', { 'd2-cms-range-handle': 'min' });
  const maxHandle = createElement('button', { 'd2-cms-range-handle': 'max' });
  const minDisplay = createElement('div', { 'd2-cms-range-display': 'min' });
  const maxDisplay = createElement('div', { 'd2-cms-range-display': 'max' });
  track.appendChild(fill);
  track.appendChild(minHandle);
  track.appendChild(maxHandle);
  range.appendChild(minDisplay);
  range.appendChild(track);
  range.appendChild(maxDisplay);

  const list = createElement('div', { 'd2-cms-list': 'offers-list' });
  list.appendChild(createItem({ price: '40' }));
  list.appendChild(createItem({ price: '1500' }));
  env.body.appendChild(range);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  assert.doesNotMatch(minDisplay.textContent, /zł|PLN/);
  assert.match(maxDisplay.textContent, /\d/);
});

test('explicit range suffix still renders on a currency alias display', async () => {
  const env = createEnvironment();
  const range = createElement('div', {
    'd2-cms-range': '',
    'd2-cms-range-field': 'price',
    'd2-cms-range-min': '0',
    'd2-cms-range-max': '2000',
    'd2-cms-range-step': '10',
    'd2-cms-range-displayformat': 'PLN',
    'd2-cms-range-suffix': ' PLN',
    'd2-cms-target': 'offers-list',
  });
  const track = createElement('div', { 'd2-cms-range-track': '' });
  const fill = createElement('div', { 'd2-cms-range-fill': '' });
  const minHandle = createElement('button', { 'd2-cms-range-handle': 'min' });
  const maxHandle = createElement('button', { 'd2-cms-range-handle': 'max' });
  const minDisplay = createElement('div', { 'd2-cms-range-display': 'min' });
  track.appendChild(fill);
  track.appendChild(minHandle);
  track.appendChild(maxHandle);
  range.appendChild(minDisplay);
  range.appendChild(track);

  const list = createElement('div', { 'd2-cms-list': 'offers-list' });
  list.appendChild(createItem({ price: '40' }));
  list.appendChild(createItem({ price: '1500' }));
  env.body.appendChild(range);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  assert.match(minDisplay.textContent, /PLN$/);
});

test('webflow pagination load button resolves the sibling CMS list and prevents navigation', async () => {
  const env = createEnvironment();
  const dynList = createElement('div', { class: 'w-dyn-list' });
  const list = createElement('div', {
    'd2-cms-list': 'offers-list',
    'd2-cms-per-page': '1',
    'd2-cms-load-mode': 'more',
  });
  const pagination = createElement('div', { class: 'w-pagination-wrapper' });
  const loadButton = createElement('a', {
    href: '?offers_page=2',
    class: 'w-pagination-next',
    'd2-cms-loadcount': 'all',
  });
  const pageCount = createElement('div', { class: 'w-page-count' }, '1 / 1');
  const first = createItem({ status: 'Dostępne' });
  const second = createItem({ status: 'Dostępne' });

  list.appendChild(first);
  list.appendChild(second);
  pagination.appendChild(loadButton);
  pagination.appendChild(pageCount);
  dynList.appendChild(list);
  dynList.appendChild(pagination);
  env.body.appendChild(dynList);

  loadCmsModule(env);
  await flushTimers();

  assert.equal(first.style.display, '');
  assert.equal(second.style.display, 'none');

  const event = dispatchDocument(env, 'click', loadButton);
  await flushTimers();

  assert.equal(event.defaultPrevented, true);
  assert.equal(event.immediatePropagationStopped, true);
  assert.equal(first.style.display, '');
  assert.equal(second.style.display, '');
});

test('cms render refreshes price formatting when items are revealed later', async () => {
  const env = createEnvironment();
  const list = createElement('div', {
    'd2-cms-list': 'offers',
    'd2-cms-per-page': '1',
    'd2-cms-load-mode': 'more',
  });
  const first = createPriceItem('199999');
  const second = createPriceItem('422934.4');

  env.window.digi2.format = {
    refresh(root) {
      root.querySelectorAll('[d2-format-price]').forEach((el) => {
        const value = Number(String(el.textContent).replace(/[^\d.-]/g, ''));
        if (!Number.isNaN(value)) {
          el.textContent = Math.round(value).toLocaleString('pl-PL').replace(/\u00A0|\u202F/g, ' ');
        }
      });
    },
  };

  list.appendChild(first);
  list.appendChild(second);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  assert.equal(first.querySelector('[d2-format-price]').textContent, '199 999');
  assert.equal(second.querySelector('[d2-format-price]').textContent, '422 934');

  await env.window.digi2.cms.get('offers').loadMore(1);
  await flushTimers();

  assert.equal(second.querySelector('[d2-format-price]').textContent, '422 934');
});

test('inline d2-cms-field-<name> attribute is read like a nested field', async () => {
  const env = createEnvironment();
  const trigger = createElement('button', { 'd2-cms-filter': 'status:Dostępne', 'd2-cms-target': 'offers' });
  const list = createElement('div', { 'd2-cms-list': 'offers' });
  const okItem = createElement('div', { 'd2-cms-item': '', 'd2-cms-field-status': 'Dostępne' });
  const noItem = createElement('div', { 'd2-cms-item': '', 'd2-cms-field-status': 'Sprzedane' });
  list.appendChild(okItem);
  list.appendChild(noItem);
  env.body.appendChild(trigger);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  dispatchDocument(env, 'click', trigger);

  assert.equal(okItem.style.display, '');
  assert.equal(noItem.style.display, 'none');
});

test('select d2-cms-filter-field applies and clears a facet filter on change', async () => {
  const env = createEnvironment();
  const sel = createElement('select', { 'd2-cms-filter-field': 'floor', 'd2-cms-target': 'offers' });
  const list = createElement('div', { 'd2-cms-list': 'offers' });
  const f3 = createItem({ floor: '3' });
  const f2 = createItem({ floor: '2' });
  list.appendChild(f3);
  list.appendChild(f2);
  env.body.appendChild(sel);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  sel.value = '3';                 // user picks floor 3
  dispatchDocument(env, 'change', sel);
  assert.equal(f3.style.display, '');
  assert.equal(f2.style.display, 'none');

  sel.value = '';
  dispatchDocument(env, 'change', sel);
  assert.equal(f3.style.display, '');
  assert.equal(f2.style.display, '');
});

test('d2-cms-clear resets facet filters and range sliders', async () => {
  const env = createEnvironment();
  const filterBtn = createElement('button', { 'd2-cms-filter': 'status:Dostępne', 'd2-cms-target': 'offers' });
  const clearBtn = createElement('button', { 'd2-cms-clear': '', 'd2-cms-target': 'offers' });
  const range = createElement('div', {
    'd2-cms-range': '', 'd2-cms-range-field': 'price',
    'd2-cms-range-min': '0', 'd2-cms-range-max': '100', 'd2-cms-range-step': '10',
    'd2-cms-target': 'offers',
  });
  const track = createElement('div', { 'd2-cms-range-track': '' });
  const fill = createElement('div', { 'd2-cms-range-fill': '' });
  const minH = createElement('button', { 'd2-cms-range-handle': 'min' });
  const maxH = createElement('button', { 'd2-cms-range-handle': 'max' });
  track.appendChild(fill);
  track.appendChild(minH);
  track.appendChild(maxH);
  range.appendChild(track);

  const list = createElement('div', { 'd2-cms-list': 'offers' });
  const a = createItem({ status: 'Dostępne', price: '40' });
  const b = createItem({ status: 'Sprzedane', price: '80' });
  list.appendChild(a);
  list.appendChild(b);
  env.body.appendChild(filterBtn);
  env.body.appendChild(clearBtn);
  env.body.appendChild(range);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  dispatchDocument(env, 'click', filterBtn);           // filter status:Dostępne
  track._listeners.pointerdown({ target: track, clientX: 50, preventDefault() {} }); // narrow price range
  assert.equal(b.style.display, 'none');

  dispatchDocument(env, 'click', clearBtn);             // clear everything
  assert.equal(a.style.display, '');
  assert.equal(b.style.display, '');
});

test('d2-cms-clear="field" resets only that filter key and leaves others', async () => {
  const env = createEnvironment();
  const filterTag = createElement('button', { 'd2-cms-filter': 'tag:OFERTA', 'd2-cms-target': 'offers' });
  const filterStatus = createElement('button', { 'd2-cms-filter': 'status:Dostępne', 'd2-cms-target': 'offers' });
  const clearTag = createElement('button', { 'd2-cms-clear': 'tag', 'd2-cms-target': 'offers' });

  const list = createElement('div', { 'd2-cms-list': 'offers' });
  const itA = createItem({ tag: 'OFERTA', status: 'Dostępne' });
  const itB = createItem({ tag: 'PREMIERA', status: 'Dostępne' });
  const itC = createItem({ tag: 'OFERTA', status: 'Sprzedane' });
  list.appendChild(itA);
  list.appendChild(itB);
  list.appendChild(itC);
  env.body.appendChild(filterTag);
  env.body.appendChild(filterStatus);
  env.body.appendChild(clearTag);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  dispatchDocument(env, 'click', filterStatus);   // status:Dostępne → itA, itB
  dispatchDocument(env, 'click', filterTag);       // + tag:OFERTA → itA only
  assert.equal(itA.style.display, '');
  assert.equal(itB.style.display, 'none');
  assert.equal(itC.style.display, 'none');

  dispatchDocument(env, 'click', clearTag);        // clear ONLY tag; status stays
  assert.equal(itA.style.display, '');
  assert.equal(itB.style.display, '', 'tag filter cleared → PREMIERA reappears');
  assert.equal(itC.style.display, 'none', 'status:Dostępne must remain active');
  assert.equal(filterTag.hasAttribute('d2-cms-filter-active'), false, 'tag trigger de-activated (checkbox would uncheck)');
  assert.equal(filterStatus.hasAttribute('d2-cms-filter-active'), true, 'status trigger stays active');
});

test('list-level sort-order is base only: user sort replaces it, clearSort restores it', async () => {
  const env = createEnvironment();
  const sortArea = createElement('button', { 'd2-cms-sort': 'area', 'd2-cms-target': 'offers' });
  const list = createElement('div', {
    'd2-cms-list': 'offers',
    'd2-cms-sort-by': 'tag',
    'd2-cms-sort-order': 'OFERTA|PREMIERA',
  });
  // Base (tag) order puts itPremiera AFTER itOferta; pure area asc reverses them.
  const itOferta = createItem({ tag: 'OFERTA', area: '99' });
  const itPremiera = createItem({ tag: 'PREMIERA', area: '10' });
  list.appendChild(itOferta);
  list.appendChild(itPremiera);
  env.body.appendChild(sortArea);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  const idx = (node) => list.children.indexOf(node);

  // Initial render follows the collection-list base order (tag pipe order).
  assert.ok(idx(itOferta) < idx(itPremiera), 'base order: OFERTA first');

  // User sorts by area — base tag order must NOT rank the result anymore.
  dispatchDocument(env, 'click', sortArea);
  assert.ok(idx(itPremiera) < idx(itOferta), 'pure area asc: 10 before 99');

  // Clearing the sort restores the base order.
  env.window.digi2.cms.get('offers').clearSort();
  assert.ok(idx(itOferta) < idx(itPremiera), 'base order restored after clearSort');
});

test('sort label with d2-cms-target updates next to two lists; sort-active honors dir', async () => {
  const env = createEnvironment();
  const label = createElement('div', { 'd2-cms-sort-label': '', 'd2-cms-target': 'offers' }, 'Sortuj według');
  const optAsc = createElement('a', { 'd2-cms-sort': 'area', 'd2-cms-sort-dir': 'asc', 'd2-cms-target': 'offers' }, 'Od najmniejszych');
  const optDesc = createElement('a', { 'd2-cms-sort': 'area', 'd2-cms-sort-dir': 'desc', 'd2-cms-target': 'offers' }, 'Od największych');

  const list = createElement('div', { 'd2-cms-list': 'offers' });
  list.appendChild(createItem({ area: '10' }));
  list.appendChild(createItem({ area: '99' }));
  // Second list on the page — the label must still resolve via its target.
  const other = createElement('div', { 'd2-cms-list': 'other' });
  other.appendChild(createItem({ area: '1' }));

  env.body.appendChild(label);
  env.body.appendChild(optAsc);
  env.body.appendChild(optDesc);
  env.body.appendChild(list);
  env.body.appendChild(other);

  loadCmsModule(env);
  await flushTimers();

  dispatchDocument(env, 'click', optDesc);

  assert.equal(label.textContent, 'Od największych', 'label swaps to the chosen option text');
  assert.equal(optDesc.hasAttribute('d2-cms-sort-active'), true, 'desc option marked active');
  assert.equal(optAsc.hasAttribute('d2-cms-sort-active'), false, 'asc option NOT marked active');
});

test('d2-cms-count input sets the exact visible count; steppers adjust it', async () => {
  const env = createEnvironment();
  const input = createElement('input', {
    'd2-cms-count': '',
    'd2-cms-target': 'products',
  });
  input.value = '';
  const plus = createElement('button', {
    'd2-cms-count-step': '1',
    'd2-cms-target': 'products',
  });
  const minus = createElement('button', {
    'd2-cms-count-step': '-1',
    'd2-cms-target': 'products',
  });
  const list = createElement('div', { 'd2-cms-list': 'products' });
  const items = [];
  for (let i = 0; i < 5; i++) {
    const it = createItem({ title: 'Item ' + i });
    items.push(it);
    list.appendChild(it);
  }
  env.body.appendChild(input);
  env.body.appendChild(plus);
  env.body.appendChild(minus);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  // Type "2" and commit -> exactly 2 items visible, rest hidden.
  input.value = '2';
  dispatchDocument(env, 'change', input);
  await flushTimers();

  const visibleCount = () => items.filter((it) => it.style.display !== 'none').length;
  assert.equal(visibleCount(), 2, 'typing 2 reveals exactly 2 items');
  assert.equal(input.value, '2', 'input mirrors the applied count');

  // Increment -> 3 visible.
  dispatchDocument(env, 'click', plus);
  await flushTimers();
  assert.equal(visibleCount(), 3, 'stepper +1 reveals a third item');
  assert.equal(input.value, '3', 'input reflects the stepped count');

  // Decrement twice -> 1 visible.
  dispatchDocument(env, 'click', minus);
  dispatchDocument(env, 'click', minus);
  await flushTimers();
  assert.equal(visibleCount(), 1, 'two -1 steps leave a single item');
  assert.equal(input.value, '1', 'input reflects the decremented count');
});

test('d2-cms-toggle button hides/shows items and swaps its own label', async () => {
  const env = createEnvironment();
  const toggle = createElement('button', {
    'd2-cms-toggle': 'status:Sprzedane',
    'd2-cms-target': 'offers',
    'd2-cms-toggle-hide': 'Ukryj sprzedane',
    'd2-cms-toggle-show': 'Pokaz sprzedane',
  }, 'Ukryj sprzedane');
  const list = createElement('div', { 'd2-cms-list': 'offers' });
  const available = createItem({ status: 'Dostepne' });
  const sold = createItem({ status: 'Sprzedane' });
  list.appendChild(available);
  list.appendChild(sold);
  env.body.appendChild(toggle);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  // Initial: everything shown, label describes the hide action.
  assert.equal(sold.style.display, '', 'sold item starts visible');
  assert.equal(toggle.textContent, 'Ukryj sprzedane', 'label starts on the hide action');
  assert.equal(toggle.hasAttribute('d2-cms-toggle-active'), false);

  // First click -> sold hidden, label flips to the show action.
  dispatchDocument(env, 'click', toggle);
  await flushTimers();
  assert.equal(sold.style.display, 'none', 'sold item hidden after first click');
  assert.equal(available.style.display, '', 'available item stays visible');
  assert.equal(toggle.textContent, 'Pokaz sprzedane', 'label swaps to the show action');
  assert.equal(toggle.hasAttribute('d2-cms-toggle-active'), true, 'toggle marked active while hiding');

  // Second click -> sold shown again, label back to the hide action.
  dispatchDocument(env, 'click', toggle);
  await flushTimers();
  assert.equal(sold.style.display, '', 'sold item visible again after second click');
  assert.equal(toggle.textContent, 'Ukryj sprzedane', 'label swaps back to the hide action');
  assert.equal(toggle.hasAttribute('d2-cms-toggle-active'), false, 'active attribute cleared');
});

test('d2-cms-instance is an alias for d2-cms-list so target buttons resolve and sort', async () => {
  const env = createEnvironment();
  const sortBtn = createElement('button', {
    'd2-cms-sort': 'price',
    'd2-cms-sort-dir': 'asc',
    'd2-cms-target': 'list',
  });
  // List container named via d2-cms-instance (NOT d2-cms-list) — the burano bug.
  const list = createElement('div', { 'd2-cms-instance': 'list' });
  const cheap = createItem({ name: 'B', price: '100' });
  const pricey = createItem({ name: 'A', price: '900' });
  list.appendChild(pricey);
  list.appendChild(cheap);
  env.body.appendChild(sortBtn);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  // Instance must be discovered and the alias normalized onto d2-cms-list.
  assert.equal(list.getAttribute('d2-cms-list'), 'list', 'instance name normalized to d2-cms-list');

  // Clicking the target button must actually sort (ascending by price).
  dispatchDocument(env, 'click', sortBtn);
  await flushTimers();

  assert.equal(list.children[0], cheap, 'cheapest item sorts first');
  assert.equal(list.children[1], pricey, 'pricier item sorts second');
  assert.equal(sortBtn.getAttribute('d2-cms-sort-active'), 'asc', 'sort button reflects active asc state');
});

test('shared (pipe-target) counter shows the VISIBLE list; tabs:change hands it over', async () => {
  const env = createEnvironment();

  // simple digi2 event bus for the test
  const bus = {};
  env.window.digi2.on = (ev, fn) => { (bus[ev] = bus[ev] || []).push(fn); };
  env.window.digi2.emit = (ev, d) => { (bus[ev] || []).forEach((fn) => fn(d)); };

  const counter = createElement('span', { 'd2-cms-display': 'matching', 'd2-cms-target': 'aaa|bbb' });

  const listA = createElement('div', { 'd2-cms-list': 'aaa' });
  listA.appendChild(createItem({ x: '1' }));
  listA.appendChild(createItem({ x: '2' }));               // A: 2 items
  const listB = createElement('div', { 'd2-cms-list': 'bbb' });
  listB.appendChild(createItem({ x: '1' }));               // B: 1 item

  // A visible, B hidden (0×0 rect)
  listA.getBoundingClientRect = () => ({ width: 100, height: 50 });
  listB.getBoundingClientRect = () => ({ width: 0, height: 0 });

  env.body.appendChild(counter);
  env.body.appendChild(listA);
  env.body.appendChild(listB);

  loadCmsModule(env);
  await flushTimers();

  assert.equal(counter.textContent, '2', 'visible list A owns the shared counter');

  // "Tab switch": A hides, B shows → tabs:change → B takes over.
  listA.getBoundingClientRect = () => ({ width: 0, height: 0 });
  listB.getBoundingClientRect = () => ({ width: 100, height: 50 });
  env.window.digi2.emit('tabs:change', { group: 'view', tab: 'b' });
  await flushTimers();

  assert.equal(counter.textContent, '1', 'after switch list B owns the counter');
});

test('CMS-bindable filter forms: d2-cms-filter-value and trailing-colon with data-value', async () => {
  const env = createEnvironment();

  // Form 1: static key + CMS-bound value attribute (a button)
  const btnW16 = createElement('button', {
    'd2-cms-filter': 'investment', 'd2-cms-filter-value': 'Wielka 16', 'd2-cms-target': 'offers',
  });
  // Form 2: trailing colon + value from the input's data-value (Webflow radio)
  const radioP18 = createElement('input', {
    type: 'radio', 'd2-cms-filter': 'investment:', 'data-value': 'Partynicka 18', 'd2-cms-target': 'offers',
  });
  radioP18.type = 'radio';
  radioP18.checked = false;

  const list = createElement('div', { 'd2-cms-list': 'offers' });
  const itW = createItem({ investment: 'Wielka 16' });
  const itP = createItem({ investment: 'Partynicka 18' });
  list.appendChild(itW);
  list.appendChild(itP);
  env.body.appendChild(btnW16);
  env.body.appendChild(radioP18);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  // Button (form 1) filters by its bound value.
  dispatchDocument(env, 'click', btnW16);
  assert.equal(itW.style.display, '');
  assert.equal(itP.style.display, 'none');
  assert.equal(btnW16.hasAttribute('d2-cms-filter-active'), true);
  dispatchDocument(env, 'click', btnW16);   // toggle off

  // Radio (form 2) — change event, value read from data-value.
  radioP18.checked = true;
  dispatchDocument(env, 'change', radioP18);
  assert.equal(itP.style.display, '');
  assert.equal(itW.style.display, 'none');
});

test('range-snap rounds auto-detected bounds to step: min down, max up', async () => {
  const env = createEnvironment();
  const range = createElement('div', {
    'd2-cms-range': '',
    'd2-cms-range-field': 'price',
    'd2-cms-range-step': '5',
    'd2-cms-range-snap': '',
    'd2-cms-range-displayformat': 'plain',
    'd2-cms-target': 'snap-list',
  });
  const track = createElement('div', { 'd2-cms-range-track': '' });
  const fill = createElement('div', { 'd2-cms-range-fill': '' });
  const minHandle = createElement('button', { 'd2-cms-range-handle': 'min' });
  const maxHandle = createElement('button', { 'd2-cms-range-handle': 'max' });
  const minDisp = createElement('div', { 'd2-cms-range-display': 'min' });
  const maxDisp = createElement('div', { 'd2-cms-range-display': 'max' });
  track.appendChild(fill);
  track.appendChild(minHandle);
  track.appendChild(maxHandle);
  range.appendChild(track);
  range.appendChild(minDisp);
  range.appendChild(maxDisp);

  const list = createElement('div', { 'd2-cms-list': 'snap-list' });
  list.appendChild(createItem({ price: '7' }));
  list.appendChild(createItem({ price: '207.25' }));
  env.body.appendChild(range);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  // 7 floored to nearest 5 → 5 ; 207.25 ceiled to nearest 5 → 210
  assert.equal(minDisp.textContent, '5');
  assert.equal(maxDisp.textContent, '210');
});

test('range-snap off leaves raw auto-detected bounds', async () => {
  const env = createEnvironment();
  const range = createElement('div', {
    'd2-cms-range': '',
    'd2-cms-range-field': 'price',
    'd2-cms-range-step': '5',
    'd2-cms-range-displayformat': 'plain',
    'd2-cms-target': 'nosnap-list',
  });
  const track = createElement('div', { 'd2-cms-range-track': '' });
  const fill = createElement('div', { 'd2-cms-range-fill': '' });
  const minHandle = createElement('button', { 'd2-cms-range-handle': 'min' });
  const maxHandle = createElement('button', { 'd2-cms-range-handle': 'max' });
  const minDisp = createElement('div', { 'd2-cms-range-display': 'min' });
  const maxDisp = createElement('div', { 'd2-cms-range-display': 'max' });
  track.appendChild(fill);
  track.appendChild(minHandle);
  track.appendChild(maxHandle);
  range.appendChild(track);
  range.appendChild(minDisp);
  range.appendChild(maxDisp);

  const list = createElement('div', { 'd2-cms-list': 'nosnap-list' });
  list.appendChild(createItem({ price: '7' }));
  list.appendChild(createItem({ price: '200' }));
  env.body.appendChild(range);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  assert.equal(minDisp.textContent, '7');
  assert.equal(maxDisp.textContent, '200');
});

test('range-snap: dragging handles rounds outward (min down, max up) so edge items stay included', async () => {
  const env = createEnvironment();
  const range = createElement('div', {
    'd2-cms-range': '',
    'd2-cms-range-field': 'sqm',
    'd2-cms-range-min': '0',
    'd2-cms-range-max': '100',
    'd2-cms-range-step': '5',
    'd2-cms-range-snap': '',
    'd2-cms-range-displayformat': 'plain',
    'd2-cms-target': 'snap-drag',
  });
  const track = createElement('div', { 'd2-cms-range-track': '' });
  const fill = createElement('div', { 'd2-cms-range-fill': '' });
  const minHandle = createElement('button', { 'd2-cms-range-handle': 'min' });
  const maxHandle = createElement('button', { 'd2-cms-range-handle': 'max' });
  const minDisp = createElement('div', { 'd2-cms-range-display': 'min' });
  const maxDisp = createElement('div', { 'd2-cms-range-display': 'max' });
  track.appendChild(fill);
  track.appendChild(minHandle);
  track.appendChild(maxHandle);
  range.appendChild(track);
  range.appendChild(minDisp);
  range.appendChild(maxDisp);

  const list = createElement('div', { 'd2-cms-list': 'snap-drag' });
  list.appendChild(createItem({ sqm: '28.75' }));
  env.body.appendChild(range);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  // track spans 0..100 over 100px (jsdom stub). Drag min to 28.75 → floors to 25.
  track.getBoundingClientRect = () => ({ left: 0, width: 100 });
  minHandle._listeners = minHandle._listeners || {};
  // Simulate a drag by invoking the pointer-value path via track click near 28.75
  track._listeners.pointerdown({ target: track, clientX: 28.75, preventDefault() {} });
  assert.equal(minDisp.textContent, '25');

  // Drag max to 71.25 → ceils to 75.
  track._listeners.pointerdown({ target: track, clientX: 71.25, preventDefault() {} });
  assert.equal(maxDisp.textContent, '75');
});

test('d2-cms-filter-default seeds a filter on load (one investment preselected)', async () => {
  const env = createEnvironment();

  // Radio options in a dropdown, trailing-colon form with data-value (like toscom)
  const optA = createElement('input', {
    type: 'radio', 'data-value': 'Bernardyńska 4',
    'd2-cms-filter': 'investment:', 'd2-cms-filter-default': '',
    'd2-cms-target': 'apts',
  });
  const optB = createElement('input', {
    type: 'radio', 'data-value': 'Wielka 16',
    'd2-cms-filter': 'investment:', 'd2-cms-target': 'apts',
  });
  const label = createElement('div', { 'd2-cms-filter-label': 'investment', 'd2-cms-target': 'apts' });

  const list = createElement('div', { 'd2-cms-list': 'apts' });
  const item1 = createItem({ investment: 'Bernardyńska 4' });
  const item2 = createItem({ investment: 'Wielka 16' });
  list.appendChild(item1);
  list.appendChild(item2);

  env.body.appendChild(optA);
  env.body.appendChild(optB);
  env.body.appendChild(label);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  // Only the Bernardyńska item is visible; its option is marked active and the
  // label tracks the selection. (checked-sync needs real input.type/.checked,
  // which the DOM stub doesn't model — covered in-browser.)
  assert.equal(item1.style.display, '');
  assert.equal(item2.style.display, 'none');
  assert.equal(optA.hasAttribute('d2-cms-filter-active'), true);
  assert.equal(optB.hasAttribute('d2-cms-filter-active'), false);
  assert.equal(label.textContent, 'Bernardyńska 4');
});

test('d2-cms-filter-default="false" opts out (nothing preselected)', async () => {
  const env = createEnvironment();
  const optA = createElement('input', {
    type: 'radio', 'data-value': 'Bernardyńska 4',
    'd2-cms-filter': 'investment:', 'd2-cms-filter-default': 'false',
    'd2-cms-target': 'apts2',
  });
  const list = createElement('div', { 'd2-cms-list': 'apts2' });
  const item1 = createItem({ investment: 'Bernardyńska 4' });
  const item2 = createItem({ investment: 'Wielka 16' });
  list.appendChild(item1);
  list.appendChild(item2);
  env.body.appendChild(optA);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  assert.equal(item1.style.display, '');
  assert.equal(item2.style.display, '');
  assert.equal(optA.hasAttribute('d2-cms-filter-active'), false);
});

test('bare d2-cms-field-type is a real field named "type" (filter type:Lokale matches)', async () => {
  const env = createEnvironment();
  const trigger = createElement('button', { 'd2-cms-filter': 'type:Lokale', 'd2-cms-target': 'offers' });
  const list = createElement('div', { 'd2-cms-list': 'offers' });
  const apart = createElement('div', { 'd2-cms-item': '', 'd2-cms-field-type': 'Apartamenty' });
  const lokal = createElement('div', { 'd2-cms-item': '', 'd2-cms-field-type': 'Lokale' });
  list.appendChild(apart);
  list.appendChild(lokal);
  env.body.appendChild(trigger);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  dispatchDocument(env, 'click', trigger);

  assert.equal(lokal.style.display, '');      // Lokale stays visible
  assert.equal(apart.style.display, 'none');  // Apartamenty filtered out
});

test('range max display with bare d2-static-width gets right-anchored automatically', async () => {
  const env = createEnvironment();
  const range = createElement('div', {
    'd2-cms-range': '',
    'd2-cms-range-field': 'price',
    'd2-cms-range-min': '0',
    'd2-cms-range-max': '2000',
    'd2-cms-range-step': '10',
    'd2-cms-target': 'offers-list',
  });
  const track = createElement('div', { 'd2-cms-range-track': '' });
  const fill = createElement('div', { 'd2-cms-range-fill': '' });
  const minHandle = createElement('button', { 'd2-cms-range-handle': 'min' });
  const maxHandle = createElement('button', { 'd2-cms-range-handle': 'max' });
  const minDisplay = createElement('div', {
    'd2-cms-range-display': 'min',
    'd2-static-width': '',
  });
  // Max display nested inside a static-width wrapper (value + unit label)
  const maxWrap = createElement('div', { 'd2-static-width': '' });
  const maxDisplay = createElement('div', { 'd2-cms-range-display': 'max' });
  maxWrap.appendChild(maxDisplay);
  track.appendChild(fill);
  track.appendChild(minHandle);
  track.appendChild(maxHandle);
  range.appendChild(minDisplay);
  range.appendChild(track);
  range.appendChild(maxWrap);

  const list = createElement('div', { 'd2-cms-list': 'offers-list' });
  list.appendChild(createItem({ price: '40' }));
  list.appendChild(createItem({ price: '1500' }));
  env.body.appendChild(range);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  // Wrapper around the max display anchors right; min display stays untouched
  assert.equal(maxWrap.getAttribute('d2-static-width'), 'right');
  assert.equal(minDisplay.getAttribute('d2-static-width'), '');
});

test('explicit d2-static-width anchor on the max display is respected as-is', async () => {
  const env = createEnvironment();
  const range = createElement('div', {
    'd2-cms-range': '',
    'd2-cms-range-field': 'price',
    'd2-cms-range-min': '0',
    'd2-cms-range-max': '2000',
    'd2-cms-target': 'offers-list',
  });
  const track = createElement('div', { 'd2-cms-range-track': '' });
  const minHandle = createElement('button', { 'd2-cms-range-handle': 'min' });
  const maxHandle = createElement('button', { 'd2-cms-range-handle': 'max' });
  const maxDisplay = createElement('div', {
    'd2-cms-range-display': 'max',
    'd2-static-width': 'center',
  });
  track.appendChild(minHandle);
  track.appendChild(maxHandle);
  range.appendChild(track);
  range.appendChild(maxDisplay);

  const list = createElement('div', { 'd2-cms-list': 'offers-list' });
  list.appendChild(createItem({ price: '40' }));
  env.body.appendChild(range);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  assert.equal(maxDisplay.getAttribute('d2-static-width'), 'center');
});

test('d2-cms-apply defers filtering: clicks stage a draft, Apply commits it to the list', async () => {
  const env = createEnvironment();
  const filterBtn = createElement('button', {
    'd2-cms-filter': 'status:Dostępne',
    'd2-cms-target': 'offers',
  });
  const applyBtn = createElement('button', { 'd2-cms-apply': '', 'd2-cms-target': 'offers' });
  const list = createElement('div', { 'd2-cms-list': 'offers' });
  const available = createItem({ status: 'Dostępne' });
  const sold = createItem({ status: 'Sprzedane' });
  list.appendChild(available);
  list.appendChild(sold);
  env.body.appendChild(filterBtn);
  env.body.appendChild(applyBtn);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  // Click the filter — the DRAFT changes (button reflects active) but the list
  // stays frozen: the sold item is still visible until Apply.
  dispatchDocument(env, 'click', filterBtn);
  assert.equal(filterBtn.getAttribute('d2-cms-filter-active'), '', 'draft reflected on the control');
  assert.equal(applyBtn.getAttribute('d2-cms-apply-pending'), '', 'button flags a pending change');
  assert.equal(available.style.display, '', 'list unchanged before Apply');
  assert.equal(sold.style.display, '', 'sold NOT hidden yet — filtering is deferred');

  // Apply — now the committed state hides the sold item and clears pending.
  dispatchDocument(env, 'click', applyBtn);
  assert.equal(available.style.display, '');
  assert.equal(sold.style.display, 'none', 'sold hidden after Apply');
  assert.equal(applyBtn.hasAttribute('d2-cms-apply-pending'), false, 'pending cleared on Apply');
});

test('d2-cms-apply: native checkbox ticks immediately but the list waits for Apply', async () => {
  const env = createEnvironment();
  const checkbox = createElement('input', {
    'd2-cms-filter': 'status:Dostępne',
    'd2-cms-target': 'offers',
  });
  checkbox.type = 'checkbox';
  const applyBtn = createElement('button', { 'd2-cms-apply': '', 'd2-cms-target': 'offers' });
  const list = createElement('div', { 'd2-cms-list': 'offers' });
  const available = createItem({ status: 'Dostępne' });
  const sold = createItem({ status: 'Sprzedane' });
  list.appendChild(available);
  list.appendChild(sold);
  env.body.appendChild(checkbox);
  env.body.appendChild(applyBtn);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  // The browser ticks the box natively, THEN fires 'change'.
  checkbox.checked = true;
  dispatchDocument(env, 'change', checkbox);
  assert.equal(checkbox.checked, true, 'tick preserved (draft)');
  assert.equal(sold.style.display, '', 'list frozen — sold still visible until Apply');

  dispatchDocument(env, 'click', applyBtn);
  assert.equal(sold.style.display, 'none', 'sold hidden after Apply');
});

test('d2-cms-apply-count previews the draft result count live (and d2-cms-apply-empty overrides 0)', async () => {
  const env = createEnvironment();
  const keep = createElement('button', {
    'd2-cms-filter': 'status:Dostępne',
    'd2-cms-target': 'offers',
  });
  const none = createElement('button', {
    'd2-cms-filter': 'status:Nieistniejące',
    'd2-cms-target': 'offers',
  });
  const applyBtn = createElement('button', {
    'd2-cms-apply': '',
    'd2-cms-target': 'offers',
    'd2-cms-apply-count': 'Pokaż {count} wyników',
    'd2-cms-apply-empty': 'Brak wyników',
  });
  const list = createElement('div', { 'd2-cms-list': 'offers' });
  list.appendChild(createItem({ status: 'Dostępne' }));
  list.appendChild(createItem({ status: 'Dostępne' }));
  list.appendChild(createItem({ status: 'Sprzedane' }));
  env.body.appendChild(keep);
  env.body.appendChild(none);
  env.body.appendChild(applyBtn);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  // No draft filters yet → all 3 match.
  assert.equal(applyBtn.textContent, 'Pokaż 3 wyników', 'initial preview = full set');

  // Draft "status:Dostępne" → 2 match, list still frozen but the button previews 2.
  dispatchDocument(env, 'click', keep);
  assert.equal(applyBtn.textContent, 'Pokaż 2 wyników', 'live preview follows the draft');

  // Add a value that matches nothing → 0 → empty override text.
  dispatchDocument(env, 'click', keep);   // toggle Dostępne back off
  dispatchDocument(env, 'click', none);   // status:Nieistniejące → 0 matches
  assert.equal(applyBtn.textContent, 'Brak wyników', 'd2-cms-apply-empty overrides the 0 case');
});

test('unit codes like K1.10 sort naturally, not as stripped decimals', async () => {
  const env = createEnvironment();
  const list = createElement('div', { 'd2-cms-list': 'units', 'd2-cms-sort-by': 'name' });
  // Deliberately in the broken order: a numeric read of "K1.10" is 1.1, which
  // used to sort it ahead of K1.2.
  ['K1.1', 'K1.10', 'K1.11', 'K1.2', 'K1.9'].forEach((n) => {
    list.appendChild(createItem({ name: n }));
  });
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  const order = list.children
    .filter((c) => c.hasAttribute('d2-cms-item'))
    .map((c) => c.querySelector('[d2-cms-field="name"]').textContent);
  assert.deepEqual(order, ['K1.1', 'K1.2', 'K1.9', 'K1.10', 'K1.11']);
});

test('a currency/unit suffix still counts as a number for sorting', async () => {
  const env = createEnvironment();
  const list = createElement('div', { 'd2-cms-list': 'prices', 'd2-cms-sort-by': 'price' });
  // Text sorting would put "1 200 000 zł" before "90 000 zł".
  ['90 000 zł', '1 200 000 zł', '350 000 zł'].forEach((p) => {
    list.appendChild(createItem({ price: p }));
  });
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  const order = list.children
    .filter((c) => c.hasAttribute('d2-cms-item'))
    .map((c) => c.querySelector('[d2-cms-field="price"]').textContent);
  assert.deepEqual(order, ['90 000 zł', '350 000 zł', '1 200 000 zł']);
});

test('d2-cms-filter-no-sync stops one control from hijacking another on the same field', async () => {
  const env = createEnvironment();
  // A "1 or 2 rooms" shortcut and a 1/2/3/4 picker both drive `rooms`.
  const shortcut = createElement('input', { 'd2-cms-filter': 'rooms:1|2', 'd2-cms-target': 'offers' });
  shortcut.type = 'checkbox';
  const picker = createElement('select', {
    'd2-cms-filter-field': 'rooms', 'd2-cms-target': 'offers', 'd2-cms-filter-no-sync': '',
  });
  const list = createElement('div', { 'd2-cms-list': 'offers' });
  const r1 = createItem({ rooms: '1' });
  const r2 = createItem({ rooms: '2' });
  const r3 = createItem({ rooms: '3' });
  [r1, r2, r3].forEach((i) => list.appendChild(i));
  env.body.appendChild(shortcut);
  env.body.appendChild(picker);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  picker.value = '';                        // picker deliberately left on "any"
  shortcut.checked = true;
  dispatchDocument(env, 'change', shortcut);

  // Filtering itself still works…
  assert.equal(r1.style.display, '');
  assert.equal(r2.style.display, '');
  assert.equal(r3.style.display, 'none');
  // …but the opted-out picker was NOT moved to the filter's first value.
  assert.equal(picker.value, '', 'picker keeps its own value');
});

test('without d2-cms-filter-no-sync a select still mirrors the active filter', async () => {
  const env = createEnvironment();
  const shortcut = createElement('input', { 'd2-cms-filter': 'rooms:1|2', 'd2-cms-target': 'offers' });
  shortcut.type = 'checkbox';
  const picker = createElement('select', { 'd2-cms-filter-field': 'rooms', 'd2-cms-target': 'offers' });
  const list = createElement('div', { 'd2-cms-list': 'offers' });
  const r1 = createItem({ rooms: '1' });
  const r3 = createItem({ rooms: '3' });
  list.appendChild(r1);
  list.appendChild(r3);
  env.body.appendChild(shortcut);
  env.body.appendChild(picker);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  picker.value = '';
  shortcut.checked = true;
  dispatchDocument(env, 'change', shortcut);
  assert.equal(picker.value, '1', 'default behaviour: select reflects the filter');
});

test('apartment codes are not mistaken for dates (Date.parse is too liberal)', async () => {
  const env = createEnvironment();
  // Date.parse("A - A.M.0.2") returns a real timestamp (1 Feb 2000), so this
  // column used to sort as dates: 0.1 -> January, 0.2 -> February, which put
  // B.M.0.1 before A.M.0.2 regardless of the building letter.
  const sortBtn = createElement('button', { 'd2-cms-sort': 'name', 'd2-cms-target': 'offers' });
  const list = createElement('div', { 'd2-cms-list': 'offers' });
  const rows = ['C - C.M.0.1', 'A - A.M.0.2', 'B - B.M.0.1', 'A - A.M.0.1'];
  rows.forEach((n) => list.appendChild(createItem({ name: n })));
  env.body.appendChild(sortBtn);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  dispatchDocument(env, 'click', sortBtn);
  const order = list.children
    .filter((el) => el.getAttribute && el.getAttribute('d2-cms-item') !== null)
    .map((el) => el.querySelector('[d2-cms-field="name"]').textContent);

  assert.deepEqual(order, ['A - A.M.0.1', 'A - A.M.0.2', 'B - B.M.0.1', 'C - C.M.0.1'],
    'codes sort alphabetically, building letter first');
});

test('real ISO dates still sort as dates, not as the number 20260804', async () => {
  const env = createEnvironment();
  const sortBtn = createElement('button', { 'd2-cms-sort': 'added', 'd2-cms-target': 'offers' });
  const list = createElement('div', { 'd2-cms-list': 'offers' });
  ['2026-08-04T10:30:00Z', '2026-01-15T08:00:00Z', '2026-12-31T23:59:00Z']
    .forEach((d) => list.appendChild(createItem({ added: d })));
  env.body.appendChild(sortBtn);
  env.body.appendChild(list);

  loadCmsModule(env);
  await flushTimers();

  dispatchDocument(env, 'click', sortBtn);
  const order = list.children
    .filter((el) => el.getAttribute && el.getAttribute('d2-cms-item') !== null)
    .map((el) => el.querySelector('[d2-cms-field="added"]').textContent);

  assert.deepEqual(order,
    ['2026-01-15T08:00:00Z', '2026-08-04T10:30:00Z', '2026-12-31T23:59:00Z'],
    'chronological order');
});

// Build a price slider + one list of flats (300/500) and houses (900/1600).
function createFilteredRangeFixture(extraRangeAttrs) {
  const env = createEnvironment();
  const bus = {};
  env.window.digi2.on = (ev, fn) => { (bus[ev] = bus[ev] || []).push(fn); };
  env.window.digi2.emit = (ev, d) => { (bus[ev] || []).forEach((fn) => fn(d)); };

  const range = createElement('div', Object.assign({
    'd2-cms-range': '',
    'd2-cms-range-field': 'price',
    'd2-cms-range-step': '1',
    'd2-cms-range-displayformat': 'plain',
    'd2-cms-target': 'offers',
  }, extraRangeAttrs || {}));
  const track = createElement('div', { 'd2-cms-range-track': '' });
  const fill = createElement('div', { 'd2-cms-range-fill': '' });
  const minHandle = createElement('button', { 'd2-cms-range-handle': 'min' });
  const maxHandle = createElement('button', { 'd2-cms-range-handle': 'max' });
  const minDisp = createElement('div', { 'd2-cms-range-display': 'min' });
  const maxDisp = createElement('div', { 'd2-cms-range-display': 'max' });
  track.appendChild(fill);
  track.appendChild(minHandle);
  track.appendChild(maxHandle);
  range.appendChild(track);
  range.appendChild(minDisp);
  range.appendChild(maxDisp);

  const houseTab = createElement('a', { 'd2-cms-filter': 'type:house', 'd2-cms-target': 'offers' });
  const flatTab = createElement('a', { 'd2-cms-filter': 'type:flat', 'd2-cms-target': 'offers' });

  const list = createElement('div', { 'd2-cms-list': 'offers' });
  const items = {
    flatCheap: createItem({ type: 'flat', price: '300' }),
    flatDear: createItem({ type: 'flat', price: '500' }),
    houseCheap: createItem({ type: 'house', price: '900' }),
    houseDear: createItem({ type: 'house', price: '1600' }),
  };
  Object.values(items).forEach((it) => list.appendChild(it));

  env.body.appendChild(range);
  env.body.appendChild(houseTab);
  env.body.appendChild(flatTab);
  env.body.appendChild(list);

  return { env, track, minDisp, maxDisp, houseTab, flatTab, items };
}

test('a tab that filters the list rescales the slider to that tab\'s prices', async () => {
  const f = createFilteredRangeFixture();

  loadCmsModule(f.env);
  await flushTimers();

  assert.equal(f.minDisp.textContent, '300', 'unfiltered: whole dataset');
  assert.equal(f.maxDisp.textContent, '1600');

  dispatchDocument(f.env, 'click', f.houseTab);
  await flushTimers();

  assert.equal(f.minDisp.textContent, '900', 'houses tab: cheapest house');
  assert.equal(f.maxDisp.textContent, '1600', 'houses tab: dearest house');

  dispatchDocument(f.env, 'click', f.flatTab);   // houses off, flats on
  dispatchDocument(f.env, 'click', f.houseTab);
  await flushTimers();

  assert.equal(f.minDisp.textContent, '300', 'flats tab: cheapest flat');
  assert.equal(f.maxDisp.textContent, '500', 'flats tab: dearest flat');
  assert.equal(f.items.houseCheap.style.display, 'none', 'houses stay filtered out');
});

test('dragging a slider does not rescale its own track', async () => {
  const f = createFilteredRangeFixture();

  loadCmsModule(f.env);
  await flushTimers();

  // Track click at mid-point drags the min handle up to 950 — the scale itself
  // must not follow, or the user could never drag back down.
  f.track._listeners.pointerdown({ target: f.track, clientX: 50, preventDefault: () => {} });
  await flushTimers();
  assert.equal(f.minDisp.textContent, '950', 'the handle moved');

  // Click at the far left: reachable only if the track still starts at 300.
  f.track._listeners.pointerdown({ target: f.track, clientX: 0, preventDefault: () => {} });
  await flushTimers();

  assert.equal(f.minDisp.textContent, '300', 'own range filter is excluded from the measurement');
  assert.equal(f.maxDisp.textContent, '1600');
});

test('a pick that misses the new tab entirely is dropped, not clamped shut', async () => {
  const f = createFilteredRangeFixture();

  loadCmsModule(f.env);
  await flushTimers();

  // Narrow to the flats end (max handle down to ~950), then switch to houses.
  f.track._listeners.pointerdown({ target: f.track, clientX: 50, preventDefault: () => {} });
  dispatchDocument(f.env, 'click', f.flatTab);
  await flushTimers();

  assert.equal(f.minDisp.textContent, '300');
  assert.equal(f.maxDisp.textContent, '500', 'rescaled to the flats');
  assert.equal(f.items.flatCheap.style.display, '', 'both flats visible again');
  assert.equal(f.items.flatDear.style.display, '');
});

test('rescaling under d2-cms-apply does not leave a change waiting for Apply', async () => {
  const f = createFilteredRangeFixture();
  const applyBtn = createElement('button', { 'd2-cms-apply': '', 'd2-cms-target': 'offers' });
  f.env.body.appendChild(applyBtn);

  loadCmsModule(f.env);
  await flushTimers();

  // Narrow to the flats end, commit it, then stage + commit the houses tab.
  f.track._listeners.pointerdown({ target: f.track, clientX: 50, preventDefault: () => {} });
  dispatchDocument(f.env, 'click', applyBtn);
  dispatchDocument(f.env, 'click', f.houseTab);
  dispatchDocument(f.env, 'click', applyBtn);
  await flushTimers();

  // 950–1600 still overlaps the houses, so the pick is kept…
  assert.equal(f.minDisp.textContent, '950', 'the pick survives an overlapping rescale');
  assert.equal(applyBtn.hasAttribute('d2-cms-apply-pending'), false,
    'the rescale committed itself instead of staging a phantom change');
  assert.equal(f.items.houseDear.style.display, '', '1600 is inside the pick');
  assert.equal(f.items.houseCheap.style.display, 'none', '900 is below it');

  // …but the track now starts at the cheapest house, so 900 is reachable.
  f.track._listeners.pointerdown({ target: f.track, clientX: 0, preventDefault: () => {} });
  dispatchDocument(f.env, 'click', applyBtn);
  await flushTimers();

  assert.equal(f.minDisp.textContent, '900', 'rescaled to the houses');
  assert.equal(f.maxDisp.textContent, '1600');
  assert.equal(f.items.houseCheap.style.display, '', 'both houses shown again');
});

test('d2-cms-range-static-bounds keeps the bounds fixed while filters change', async () => {
  const f = createFilteredRangeFixture({ 'd2-cms-range-static-bounds': '' });

  loadCmsModule(f.env);
  await flushTimers();

  dispatchDocument(f.env, 'click', f.houseTab);
  await flushTimers();

  assert.equal(f.minDisp.textContent, '300', 'bounds span the whole dataset');
  assert.equal(f.maxDisp.textContent, '1600');
  assert.equal(f.items.flatCheap.style.display, 'none', 'the tab filter still applies');
});

test('three tabbed lists: the slider reads the open panel, not the one animating out', async () => {
  const env = createEnvironment();
  const bus = {};
  env.window.digi2.on = (ev, fn) => { (bus[ev] = bus[ev] || []).push(fn); };
  env.window.digi2.emit = (ev, d) => { (bus[ev] || []).forEach((fn) => fn(d)); };

  const range = createElement('div', {
    'd2-cms-range': '',
    'd2-cms-range-field': 'price',
    'd2-cms-range-step': '1',
    'd2-cms-range-displayformat': 'plain',
    'd2-cms-target': 'mieszkania|domy|lokale',
  });
  const track = createElement('div', { 'd2-cms-range-track': '' });
  const fill = createElement('div', { 'd2-cms-range-fill': '' });
  track.appendChild(fill);
  track.appendChild(createElement('button', { 'd2-cms-range-handle': 'min' }));
  track.appendChild(createElement('button', { 'd2-cms-range-handle': 'max' }));
  const minDisp = createElement('div', { 'd2-cms-range-display': 'min' });
  const maxDisp = createElement('div', { 'd2-cms-range-display': 'max' });
  range.appendChild(track);
  range.appendChild(minDisp);
  range.appendChild(maxDisp);
  env.body.appendChild(range);

  // Panel per tab; only "mieszkania" starts open. Every panel keeps a non-zero
  // rect throughout — the tabs module hides them only after the animation, so
  // the flag is the only trustworthy signal.
  const panels = {};
  [['mieszkania', [300, 500]], ['domy', [900, 1600]], ['lokale', [2000, 2400]]]
    .forEach(([name, prices]) => {
      const panel = createElement('div', { 'd2-tab-instance': name });
      const list = createElement('div', { 'd2-cms-list': name });
      prices.forEach((p) => list.appendChild(createItem({ price: String(p) })));
      panel.appendChild(list);
      env.body.appendChild(panel);
      panels[name] = panel;
    });
  panels.mieszkania.setAttribute('d2-is-active', '');

  loadCmsModule(env);
  await flushTimers();

  assert.equal(minDisp.textContent, '300', 'open tab only');
  assert.equal(maxDisp.textContent, '500');

  const openTab = (name) => {
    Object.entries(panels).forEach(([n, p]) => {
      if (n === name) p.setAttribute('d2-is-active', '');
      else p.removeAttribute('d2-is-active');
    });
    env.window.digi2.emit('tabs:change', { group: 'kat', tab: name });
  };

  openTab('domy');
  await flushTimers();
  assert.equal(minDisp.textContent, '900', 'domy tab');
  assert.equal(maxDisp.textContent, '1600');

  openTab('lokale');
  await flushTimers();
  assert.equal(minDisp.textContent, '2000', 'lokale tab');
  assert.equal(maxDisp.textContent, '2400');

  openTab('mieszkania');
  await flushTimers();
  assert.equal(minDisp.textContent, '300', 'back to the first tab');
  assert.equal(maxDisp.textContent, '500');
});

test('a slider shared by tabbed lists re-measures its bounds on tabs:change', async () => {
  const env = createEnvironment();

  const bus = {};
  env.window.digi2.on = (ev, fn) => { (bus[ev] = bus[ev] || []).push(fn); };
  env.window.digi2.emit = (ev, d) => { (bus[ev] || []).forEach((fn) => fn(d)); };

  const range = createElement('div', {
    'd2-cms-range': '',
    'd2-cms-range-field': 'price',
    'd2-cms-range-step': '1',
    'd2-cms-range-displayformat': 'plain',
    'd2-cms-target': 'flats|houses',
  });
  const track = createElement('div', { 'd2-cms-range-track': '' });
  const fill = createElement('div', { 'd2-cms-range-fill': '' });
  const minHandle = createElement('button', { 'd2-cms-range-handle': 'min' });
  const maxHandle = createElement('button', { 'd2-cms-range-handle': 'max' });
  const minDisp = createElement('div', { 'd2-cms-range-display': 'min' });
  const maxDisp = createElement('div', { 'd2-cms-range-display': 'max' });
  track.appendChild(fill);
  track.appendChild(minHandle);
  track.appendChild(maxHandle);
  range.appendChild(track);
  range.appendChild(minDisp);
  range.appendChild(maxDisp);

  const flats = createElement('div', { 'd2-cms-list': 'flats' });
  const flatCheap = createItem({ price: '300' });
  const flatDear = createItem({ price: '500' });
  flats.appendChild(flatCheap);
  flats.appendChild(flatDear);

  const houses = createElement('div', { 'd2-cms-list': 'houses' });
  const houseCheap = createItem({ price: '900' });
  const houseDear = createItem({ price: '1600' });
  houses.appendChild(houseCheap);
  houses.appendChild(houseDear);

  // Tab 1 open: flats visible, houses collapsed to 0×0.
  flats.getBoundingClientRect = () => ({ width: 100, height: 50 });
  houses.getBoundingClientRect = () => ({ width: 0, height: 0 });

  env.body.appendChild(range);
  env.body.appendChild(flats);
  env.body.appendChild(houses);

  loadCmsModule(env);
  await flushTimers();

  assert.equal(minDisp.textContent, '300', 'bounds come from the visible tab');
  assert.equal(maxDisp.textContent, '500');

  // Narrow the range on the flats tab, then switch to houses.
  track._listeners.pointerdown({ target: track, clientX: 50, preventDefault: () => {} });
  assert.equal(flatCheap.style.display, 'none', 'flats are filtered by the drag');

  flats.getBoundingClientRect = () => ({ width: 0, height: 0 });
  houses.getBoundingClientRect = () => ({ width: 100, height: 50 });
  env.window.digi2.emit('tabs:change', { group: 'view', tab: 'houses' });
  await flushTimers();

  assert.equal(minDisp.textContent, '900', 'bounds follow the new tab');
  assert.equal(maxDisp.textContent, '1600');
  assert.equal(houseCheap.style.display, '', 'handles reset — nothing filtered out');
  assert.equal(houseDear.style.display, '');
  assert.equal(flatCheap.style.display, '', 'the list we left drops its range filter');
});

test('d2-cms-range-static-bounds keeps one range across every tabbed list', async () => {
  const env = createEnvironment();

  const bus = {};
  env.window.digi2.on = (ev, fn) => { (bus[ev] = bus[ev] || []).push(fn); };
  env.window.digi2.emit = (ev, d) => { (bus[ev] || []).forEach((fn) => fn(d)); };

  const range = createElement('div', {
    'd2-cms-range': '',
    'd2-cms-range-field': 'price',
    'd2-cms-range-step': '1',
    'd2-cms-range-displayformat': 'plain',
    'd2-cms-range-static-bounds': '',
    'd2-cms-target': 'a-list|b-list',
  });
  const track = createElement('div', { 'd2-cms-range-track': '' });
  const fill = createElement('div', { 'd2-cms-range-fill': '' });
  const minHandle = createElement('button', { 'd2-cms-range-handle': 'min' });
  const maxHandle = createElement('button', { 'd2-cms-range-handle': 'max' });
  const minDisp = createElement('div', { 'd2-cms-range-display': 'min' });
  const maxDisp = createElement('div', { 'd2-cms-range-display': 'max' });
  track.appendChild(fill);
  track.appendChild(minHandle);
  track.appendChild(maxHandle);
  range.appendChild(track);
  range.appendChild(minDisp);
  range.appendChild(maxDisp);

  const listA = createElement('div', { 'd2-cms-list': 'a-list' });
  listA.appendChild(createItem({ price: '300' }));
  listA.appendChild(createItem({ price: '500' }));
  const listB = createElement('div', { 'd2-cms-list': 'b-list' });
  listB.appendChild(createItem({ price: '900' }));
  listB.appendChild(createItem({ price: '1600' }));

  listA.getBoundingClientRect = () => ({ width: 100, height: 50 });
  listB.getBoundingClientRect = () => ({ width: 0, height: 0 });

  env.body.appendChild(range);
  env.body.appendChild(listA);
  env.body.appendChild(listB);

  loadCmsModule(env);
  await flushTimers();

  assert.equal(minDisp.textContent, '300', 'bounds span both lists');
  assert.equal(maxDisp.textContent, '1600');

  listA.getBoundingClientRect = () => ({ width: 0, height: 0 });
  listB.getBoundingClientRect = () => ({ width: 100, height: 50 });
  env.window.digi2.emit('tabs:change', { group: 'view', tab: 'b' });
  await flushTimers();

  assert.equal(minDisp.textContent, '300', 'a tab switch leaves them alone');
  assert.equal(maxDisp.textContent, '1600');
});

test('apply button label follows the page language and Polish plurals', async () => {
  const env = createEnvironment();
  env.document.documentElement = createElement('html', { lang: 'pl' });

  const list = createElement('div', { 'd2-cms-list': 'flats' });
  [1, 2, 5, 5, 5].forEach(() => list.appendChild(createItem({ tag: 'x' })));
  env.body.appendChild(list);

  const btn = createElement('button', {
    'd2-cms-target': 'flats',
    'd2-cms-apply': '',
    'd2-cms-apply-count': 'Pokaż {count} wyników',
    'd2-cms-apply-count-one': 'Pokaż {count} wynik',
    'd2-cms-apply-count-few': 'Pokaż {count} wyniki',
    'd2-cms-apply-count-en': 'Show {count} results',
    'd2-cms-apply-count-en-one': 'Show {count} result',
  });
  env.body.appendChild(btn);

  loadCmsModule(env);
  await flushTimers();

  const instance = env.window.digi2.cms.get('flats');
  const labelFor = (n) => {
    instance._countDraftMatches = () => n;
    instance._updateApplyButtons();
    return btn.textContent;
  };

  assert.equal(labelFor(1), 'Pokaż 1 wynik', 'one');
  assert.equal(labelFor(3), 'Pokaż 3 wyniki', 'few');
  assert.equal(labelFor(12), 'Pokaż 12 wyników', 'many — the base template');

  env.document.documentElement.setAttribute('lang', 'en-GB');
  assert.equal(labelFor(1), 'Show 1 result', 'English singular');
  assert.equal(labelFor(7), 'Show 7 results', 'English plural');
});

test('label templates can live as text in hidden elements (translatable in Webflow)', async () => {
  const env = createEnvironment();
  env.document.documentElement = createElement('html', { lang: 'pl' });

  const list = createElement('div', { 'd2-cms-list': 'flats' });
  [1, 2, 3].forEach(() => list.appendChild(createItem({ tag: 'x' })));
  env.body.appendChild(list);

  // hidden Text Blocks — what a Webflow editor translates per locale
  const wiele = createElement('div', { 'd2-cms-target': 'flats', 'd2-cms-apply-count-text': '' }, 'Pokaż {count} wyników');
  const jeden = createElement('div', { 'd2-cms-target': 'flats', 'd2-cms-apply-count-text': 'one' }, 'Pokaż {count} wynik');
  const kilka = createElement('div', { 'd2-cms-target': 'flats', 'd2-cms-apply-count-text': 'few' }, 'Pokaż {count} wyniki');
  const pusto = createElement('div', { 'd2-cms-target': 'flats', 'd2-cms-apply-empty-text': '' }, 'Brak wyników');
  [wiele, jeden, kilka, pusto].forEach((el) => env.body.appendChild(el));

  // the attribute is still there and must lose to the text element
  const btn = createElement('button', {
    'd2-cms-target': 'flats',
    'd2-cms-apply': '',
    'd2-cms-apply-count': 'ATRYBUT {count}',
  });
  env.body.appendChild(btn);

  loadCmsModule(env);
  await flushTimers();

  const instance = env.window.digi2.cms.get('flats');
  const labelFor = (n) => {
    instance._countDraftMatches = () => n;
    instance._updateApplyButtons();
    return btn.textContent;
  };

  assert.equal(labelFor(1), 'Pokaż 1 wynik');
  assert.equal(labelFor(3), 'Pokaż 3 wyniki');
  assert.equal(labelFor(12), 'Pokaż 12 wyników');
  assert.equal(labelFor(0), 'Brak wyników');

  // translating that one text is all the /en page needs
  wiele.textContent = 'Show {count} results';
  jeden.textContent = 'Show {count} result';
  kilka.textContent = 'Show {count} results';
  assert.equal(labelFor(7), 'Show 7 results');
  assert.equal(labelFor(1), 'Show 1 result');
});

test('templates live inside the button, next to the label, and survive the rewrite', async () => {
  const env = createEnvironment();
  env.document.documentElement = createElement('html', { lang: 'pl' });

  const list = createElement('div', { 'd2-cms-list': 'flats' });
  [1, 2].forEach(() => list.appendChild(createItem({ tag: 'x' })));
  env.body.appendChild(list);

  // the whole button as one package in the Designer — no [d2-cms-apply-label] at all
  const btn = createElement('button', { 'd2-cms-target': 'flats', 'd2-cms-apply': '' });
  const ikona = createElement('svg', { class: 'ikona' });
  btn.appendChild(ikona);
  btn.appendChild(createElement('span', {}, 'Pokaż wyniki'));
  btn.appendChild(createElement('div', { 'd2-cms-apply-count-text': '' }, 'Pokaż {count} wyników'));
  btn.appendChild(createElement('div', { 'd2-cms-apply-count-text': 'one' }, 'Pokaż {count} wynik'));
  btn.appendChild(createElement('div', { 'd2-cms-apply-count-text': 'few' }, 'Pokaż {count} wyniki'));
  btn.appendChild(createElement('div', { 'd2-cms-apply-empty-text': '' }, 'Brak wyników'));
  env.body.appendChild(btn);

  loadCmsModule(env);
  await flushTimers();

  const instance = env.window.digi2.cms.get('flats');
  const labelFor = (n) => {
    instance._countDraftMatches = () => n;
    instance._updateApplyButtons();
    return btn.querySelector('[d2-cms-apply-label]').textContent;
  };

  assert.equal(labelFor(1), 'Pokaż 1 wynik');
  assert.equal(labelFor(5), 'Pokaż 5 wyników');
  assert.equal(labelFor(0), 'Brak wyników');

  // the templates are still there after several rewrites
  assert.equal(btn.querySelectorAll('[d2-cms-apply-count-text]').length, 3, 'templates survived');
  // the icon stays a sibling of the label — inside it, the next rewrite would eat it
  assert.ok(btn.querySelector('.ikona'), 'icon survived');
  assert.equal(btn.querySelector('[d2-cms-apply-label] .ikona'), null, 'and stayed out of the label');
});

test('a text template counts as a count preview, so the number cannot jump on apply', async () => {
  const env = createEnvironment();
  const list = createElement('div', { 'd2-cms-list': 'flats' });
  list.appendChild(createItem({ rooms: '2' }));
  env.body.appendChild(list);

  const btn = createElement('button', { 'd2-cms-target': 'flats', 'd2-cms-apply': '' });
  btn.appendChild(createElement('div', { 'd2-cms-apply-count-text': '' }, 'Pokaż {count} wyników'));
  env.body.appendChild(btn);

  loadCmsModule(env);
  await flushTimers();

  const instance = env.window.digi2.cms.get('flats');
  assert.equal(instance._hasCountPreview(), true, 'text template alone must trigger the preload');

  // the attribute form still counts, and a plain button still does not
  btn.children = [];                     // stub DOM: detach the template
  assert.equal(instance._hasCountPreview(), false);
  btn.setAttribute('d2-cms-apply-count', 'Pokaż {count}');
  assert.equal(instance._hasCountPreview(), true);
});
