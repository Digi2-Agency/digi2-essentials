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
