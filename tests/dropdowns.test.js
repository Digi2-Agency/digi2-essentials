const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'webflow-scripts', 'modules', 'dropdowns.js');

function createElement(tagName, attrs) {
  const classes = new Set();
  const el = {
    tagName: tagName.toUpperCase(),
    attributes: Object.assign({}, attrs || {}),
    children: [],
    parentNode: null,
    parentElement: null,
    textContent: '',
    style: { display: '', setProperty(n, v) { this[n] = v; } },
    _listeners: {},           // { type: [ {fn, capture} ] }
    classList: {
      add(n) { classes.add(n); }, remove(n) { classes.delete(n); }, contains(n) { return classes.has(n); },
    },
    getAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attributes, n) ? this.attributes[n] : null; },
    setAttribute(n, v) { this.attributes[n] = String(v); },
    removeAttribute(n) { delete this.attributes[n]; },
    hasAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attributes, n); },
    addEventListener(type, fn, opts) {
      (this._listeners[type] = this._listeners[type] || []).push({ fn, capture: !!(opts && (opts === true || opts.capture)) });
    },
    removeEventListener() {},
    appendChild(child) { child.parentNode = this; child.parentElement = this; this.children.push(child); return child; },
    contains(node) { if (node === this) return true; return this.children.some((c) => c.contains && c.contains(node)); },
    closest(selector) {
      let node = this;
      while (node) { if (matchesSelector(node, selector)) return node; node = node.parentElement; }
      return null;
    },
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
    querySelectorAll(selector) {
      const out = [];
      (function walk(node) {
        node.children.forEach((c) => { if (matchesSelector(c, selector)) out.push(c); walk(c); });
      })(this);
      return out;
    },
    // test helper: fire a click, honoring capture order + stopImmediatePropagation
    _click(target) {
      const t = target || this;
      let stop = false;
      const e = {
        target: t, defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; },
        stopImmediatePropagation() { stop = true; },
        stopPropagation() {},
      };
      // capture (toggle) then bubble up the ancestor chain
      const chain = [];
      let n = t;
      while (n) { chain.push(n); n = n.parentElement; }
      // capture: outermost → target
      for (let i = chain.length - 1; i >= 0 && !stop; i--) {
        (chain[i]._listeners.click || []).filter((l) => l.capture).forEach((l) => { if (!stop) l.fn(e); });
      }
      // bubble: target → outermost
      for (let i = 0; i < chain.length && !stop; i++) {
        (chain[i]._listeners.click || []).filter((l) => !l.capture).forEach((l) => { if (!stop) l.fn(e); });
      }
      return e;
    },
  };
  if (attrs && attrs.class) attrs.class.split(/\s+/).filter(Boolean).forEach((n) => classes.add(n));
  return el;
}

function matchesSelector(node, selector) {
  return selector.split(',').map((s) => s.trim()).filter(Boolean).some((sel) => {
    if (sel.startsWith('.')) return node.classList.contains(sel.slice(1));
    const tag = sel.match(/^[a-zA-Z][\w-]*/);
    if (tag && !/[[.]/.test(sel)) return node.tagName === tag[0].toUpperCase();
    const m = sel.match(/^\[([^\]=]+)\]$/);
    if (m) return node.hasAttribute(m[1]);
    return false;
  });
}

function createEnv(body) {
  const docListeners = {};
  const document = {
    body, readyState: 'complete', head: createElement('head'), createElement,
    addEventListener(t, fn) { (docListeners[t] = docListeners[t] || []).push(fn); },
    querySelector(s) { return body.querySelector(s); },
    querySelectorAll(s) { return body.querySelectorAll(s); },
  };
  const window = { digi2: { log() {} } };
  window.document = document;
  const context = vm.createContext({ window, document, console, setTimeout, clearTimeout, MutationObserver: undefined });
  vm.runInContext(fs.readFileSync(modulePath, 'utf8'), context, { filename: modulePath });
  return { window, document, docListeners, fireDoc(type, target) { (docListeners[type] || []).forEach((fn) => fn({ target, key: type === 'keydown' ? target : undefined })); } };
}

function buildWebflowDropdown() {
  const body = createElement('body');
  const wrap = createElement('div', { class: 'w-dropdown', 'd2-dropdown': '' });
  const toggle = createElement('div', { class: 'w-dropdown-toggle', 'd2-dropdown-toggle': '' });
  const list = createElement('nav', { class: 'w-dropdown-list', 'd2-dropdown-list': '' });
  const optList = createElement('a', { class: 'w-dropdown-link', 'd2-tab-trigger': 'view:list' });
  const optGrid = createElement('a', { class: 'w-dropdown-link', 'd2-tab-trigger': 'view:grid' });
  list.appendChild(optList); list.appendChild(optGrid);
  wrap.appendChild(toggle); wrap.appendChild(list);
  body.appendChild(wrap);
  return { body, wrap, toggle, list, optList, optGrid };
}

test('toggle opens and closes; Webflow w--open class is synced', () => {
  const dom = buildWebflowDropdown();
  createEnv(dom.body);

  assert.equal(dom.wrap.hasAttribute('d2-dropdown-open'), false);
  dom.toggle._click();
  assert.equal(dom.wrap.hasAttribute('d2-dropdown-open'), true);
  assert.equal(dom.wrap.classList.contains('w--open'), true);
  assert.equal(dom.list.classList.contains('w--open'), true);

  dom.toggle._click();
  assert.equal(dom.wrap.hasAttribute('d2-dropdown-open'), false);
  assert.equal(dom.wrap.classList.contains('w--open'), false);
});

test('selecting an option closes the dropdown (item handler still runs)', () => {
  const dom = buildWebflowDropdown();
  createEnv(dom.body);

  // Attach a "tab switch" handler to the option (like the tabs module does).
  let switched = null;
  dom.optGrid.addEventListener('click', () => { switched = 'grid'; });

  dom.toggle._click();
  assert.equal(dom.wrap.hasAttribute('d2-dropdown-open'), true);

  dom.optGrid._click();
  assert.equal(switched, 'grid', 'option handler ran');
  assert.equal(dom.wrap.hasAttribute('d2-dropdown-open'), false, 'menu collapsed after select');
});

test('d2-dropdown-keep-open leaves the menu open after selecting', () => {
  const dom = buildWebflowDropdown();
  dom.wrap.setAttribute('d2-dropdown-keep-open', '');
  createEnv(dom.body);

  dom.toggle._click();
  dom.optList._click();
  assert.equal(dom.wrap.hasAttribute('d2-dropdown-open'), true);
});

test('outside click and Escape close the dropdown', () => {
  const dom = buildWebflowDropdown();
  const outside = createElement('div', {});
  dom.body.appendChild(outside);
  const env = createEnv(dom.body);

  dom.toggle._click();
  assert.equal(dom.wrap.hasAttribute('d2-dropdown-open'), true);
  env.fireDoc('click', outside);
  assert.equal(dom.wrap.hasAttribute('d2-dropdown-open'), false, 'outside click closed it');

  dom.toggle._click();
  assert.equal(dom.wrap.hasAttribute('d2-dropdown-open'), true);
  env.fireDoc('keydown', 'Escape');
  assert.equal(dom.wrap.hasAttribute('d2-dropdown-open'), false, 'Esc closed it');
});
