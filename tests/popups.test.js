const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'webflow-scripts', 'modules', 'popups.js');

function createElement(tagName, attrs, textContent) {
  const classes = new Set();
  const el = {
    tagName: tagName.toUpperCase(),
    attributes: Object.assign({}, attrs || {}),
    children: [],
    parentNode: null,
    parentElement: null,
    style: { display: '', overflow: '', setProperty(name, value) { this[name] = value; } },
    textContent: textContent || '',
    offsetHeight: 0,
    _listeners: {},
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
    },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    removeAttribute(name) { delete this.attributes[name]; },
    hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name); },
    addEventListener(type, fn) { this._listeners[type] = fn; },
    removeEventListener(type) { delete this._listeners[type]; },
    appendChild(child) {
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
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
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
  };

  if (attrs && attrs.class) {
    attrs.class.split(/\s+/).filter(Boolean).forEach((name) => classes.add(name));
  }
  return el;
}

function matchesSelector(node, selector) {
  if (!node || !selector) return false;
  let simple = selector.trim();
  const tagMatch = simple.match(/^[a-zA-Z][a-zA-Z0-9-]*/);
  if (tagMatch && node.tagName !== tagMatch[0].toUpperCase()) return false;
  if (simple.startsWith('.')) return node.classList.contains(simple.slice(1));
  const attrMatches = Array.from(simple.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g));
  for (const match of attrMatches) {
    if (!node.hasAttribute(match[1])) return false;
    if (match[2] !== undefined && node.getAttribute(match[1]) !== match[2]) return false;
  }
  return !!tagMatch || attrMatches.length > 0;
}

function createEnvironment() {
  const body = createElement('body');
  const documentElement = createElement('html');
  const store = {};

  const document = {
    body,
    documentElement,
    readyState: 'complete',
    cookie: '',
    visibilityState: 'visible',
    addEventListener() {},
    removeEventListener() {},
    querySelector(selector) { return body.querySelector(selector); },
    querySelectorAll(selector) { return body.querySelectorAll(selector); },
    createElement,
  };

  const window = {
    digi2: { log() {} },
    location: { href: 'https://example.com/', pathname: '/' },
    scrollY: 0,
  };
  window.document = document;

  const sessionStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
  };

  return {
    context: vm.createContext({
      window,
      document,
      navigator: { userAgent: 'node-test' },
      sessionStorage,
      console,
      setTimeout,
      clearTimeout,
      Date,
    }),
    window,
    document,
    body,
  };
}

function loadPopupsModule(env) {
  const code = fs.readFileSync(modulePath, 'utf8');
  vm.runInContext(code, env.context, { filename: modulePath });
}

// Format a timestamp as "YYYY-MM-DD HH:MM:SS" in local time — matching how the
// module parses schedule bounds (local, no offset).
function fmtLocal(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const HOUR = 3600 * 1000;

function buildPopup(env, { schedule, scheduleAttr, dataAttr } = {}) {
  const attrs = { class: 'popup__overlay' };
  if (scheduleAttr) attrs['d2-popup-schedule'] = scheduleAttr;
  if (dataAttr) attrs['data-d2-popup-schedule'] = dataAttr;
  env.body.appendChild(createElement('div', attrs));

  const options = { animation: 'none', openOnLoad: true };
  if (schedule !== undefined) options.schedule = schedule;
  return env.window.digi2.popups.create('promo', options);
}

test('popup inside its scheduled window opens on load', () => {
  const env = createEnvironment();
  loadPopupsModule(env);
  const now = Date.now();
  const inst = buildPopup(env, { schedule: `${fmtLocal(now - HOUR)}, ${fmtLocal(now + HOUR)}` });
  assert.equal(inst.isVisible, true);
  assert.equal(inst.popupElement.style.display, 'flex');
});

test('popup before its scheduled window stays hidden', () => {
  const env = createEnvironment();
  loadPopupsModule(env);
  const now = Date.now();
  const inst = buildPopup(env, { schedule: `${fmtLocal(now + HOUR)}, ${fmtLocal(now + 2 * HOUR)}` });
  assert.equal(inst.isVisible, false);
  assert.notEqual(inst.popupElement.style.display, 'flex');
});

test('popup after its scheduled window stays hidden', () => {
  const env = createEnvironment();
  loadPopupsModule(env);
  const now = Date.now();
  const inst = buildPopup(env, { schedule: `${fmtLocal(now - 2 * HOUR)}, ${fmtLocal(now - HOUR)}` });
  assert.equal(inst.isVisible, false);
  assert.notEqual(inst.popupElement.style.display, 'flex');
});

test('schedule is read from the d2-popup-schedule attribute', () => {
  const env = createEnvironment();
  loadPopupsModule(env);
  const now = Date.now();
  const inst = buildPopup(env, { scheduleAttr: `${fmtLocal(now - HOUR)}, ${fmtLocal(now + HOUR)}` });
  assert.equal(inst.isVisible, true);
});

test('schedule falls back to data-d2-popup-schedule', () => {
  const env = createEnvironment();
  loadPopupsModule(env);
  const now = Date.now();
  const inst = buildPopup(env, { dataAttr: `${fmtLocal(now + HOUR)}, ${fmtLocal(now + 2 * HOUR)}` });
  assert.equal(inst.isVisible, false);
});

test('open-ended start (no end bound) keeps the popup live afterwards', () => {
  const env = createEnvironment();
  loadPopupsModule(env);
  const now = Date.now();
  const inst = buildPopup(env, { schedule: `${fmtLocal(now - HOUR)},` });
  assert.equal(inst.isVisible, true);
});

test('open-ended end (no start bound) suppresses once past', () => {
  const env = createEnvironment();
  loadPopupsModule(env);
  const now = Date.now();
  const inst = buildPopup(env, { schedule: `,${fmtLocal(now - HOUR)}` });
  assert.equal(inst.isVisible, false);
});

test('no schedule means always allowed', () => {
  const env = createEnvironment();
  loadPopupsModule(env);
  const inst = buildPopup(env, {});
  assert.equal(inst.isVisible, true);
});

test('object form { from, to } opens inside the window', () => {
  const env = createEnvironment();
  loadPopupsModule(env);
  const now = Date.now();
  const inst = buildPopup(env, { schedule: { from: fmtLocal(now - HOUR), to: fmtLocal(now + HOUR) } });
  assert.equal(inst.isVisible, true);
});

test('object form { from, to } stays hidden before the window', () => {
  const env = createEnvironment();
  loadPopupsModule(env);
  const now = Date.now();
  const inst = buildPopup(env, { schedule: { from: fmtLocal(now + HOUR), to: fmtLocal(now + 2 * HOUR) } });
  assert.equal(inst.isVisible, false);
});

test('object form with only { from } stays open-ended afterwards', () => {
  const env = createEnvironment();
  loadPopupsModule(env);
  const now = Date.now();
  const inst = buildPopup(env, { schedule: { from: fmtLocal(now - HOUR) } });
  assert.equal(inst.isVisible, true);
});

test('object form with only { to } suppresses once past', () => {
  const env = createEnvironment();
  loadPopupsModule(env);
  const now = Date.now();
  const inst = buildPopup(env, { schedule: { to: fmtLocal(now - HOUR) } });
  assert.equal(inst.isVisible, false);
});

test('empty object schedule imposes no restriction', () => {
  const env = createEnvironment();
  loadPopupsModule(env);
  const inst = buildPopup(env, { schedule: { from: '', to: '' } });
  assert.equal(inst.isVisible, true);
});
