const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'webflow-scripts', 'modules', 'cms.js');

function createElement(tagName, attrs, textContent) {
  const classes = new Set();
  const el = {
    tagName: tagName.toUpperCase(),
    attributes: Object.assign({}, attrs || {}),
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
      return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name);
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
