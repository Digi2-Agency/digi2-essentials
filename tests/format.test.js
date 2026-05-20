const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'webflow-scripts', 'modules', 'format.js');

function createElement(tagName, attrs, textContent) {
  const classes = new Set();
  const el = {
    tagName: tagName.toUpperCase(),
    attributes: Object.assign({}, attrs || {}),
    children: [],
    parentElement: null,
    parentNode: null,
    textContent: textContent || '',
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name);
    },
    classList: {
      contains(name) {
        return classes.has(name);
      },
    },
    appendChild(child) {
      child.parentElement = this;
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    querySelectorAll(selector) {
      const selectors = selector.split(',').map((item) => item.trim()).filter(Boolean);
      const results = [];

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
  if (selector.startsWith('.')) {
    return node.classList.contains(selector.slice(1));
  }

  const attrMatches = Array.from(selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g));
  if (!attrMatches.length) return false;

  return attrMatches.every((match) => {
    const name = match[1];
    const expected = match[2];
    if (!node.hasAttribute(name)) return false;
    return expected === undefined || node.getAttribute(name) === expected;
  });
}

function createEnvironment() {
  const body = createElement('body');
  const observers = [];

  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }

    observe() {}
    disconnect() {}
  }

  const document = {
    body,
    readyState: 'complete',
    addEventListener() {},
    querySelectorAll(selector) {
      return body.querySelectorAll(selector);
    },
  };

  const window = {
    digi2: {
      log() {},
    },
  };

  window.document = document;

  return {
    context: vm.createContext({
      window,
      document,
      console,
      MutationObserver: FakeMutationObserver,
      setTimeout,
      clearTimeout,
    }),
    window,
    document,
    body,
    observers,
  };
}

function loadFormatModule(env) {
  const code = fs.readFileSync(modulePath, 'utf8');
  vm.runInContext(code, env.context, { filename: modulePath });
}

function flushTimers() {
  return new Promise((resolve) => setTimeout(resolve, 5));
}

test('d2-format-price formats plain CMS text without a default currency suffix', async () => {
  const env = createEnvironment();
  const price = createElement('div', { 'd2-format-price': '' }, '199999');
  env.body.appendChild(price);

  loadFormatModule(env);
  await flushTimers();

  assert.equal(price.textContent, '199 999');
  assert.equal(env.window.digi2.format.price('422934.4'), '422 934');
});

test('d2-format-number price alias formats dynamically added elements', async () => {
  const env = createEnvironment();

  loadFormatModule(env);
  await flushTimers();

  const price = createElement('div', { 'd2-format-number': 'price' }, '422934.4');
  env.body.appendChild(price);
  env.observers.forEach((observer) => observer.callback());
  await flushTimers();

  assert.equal(price.textContent, '422 934');
});

test('legacy format-price class is treated as a price formatter without default suffix', async () => {
  const env = createEnvironment();
  const price = createElement('div', { class: 'format-price' }, '199999');
  env.body.appendChild(price);

  loadFormatModule(env);
  await flushTimers();

  assert.equal(price.textContent, '199 999');
});

test('price formatter appends currency only when configured', async () => {
  const env = createEnvironment();
  const price = createElement('div', { 'd2-format-price': '', 'd2-format-currency': 'PLN' }, '199999');
  const suffixed = createElement('div', { 'd2-format-price': '', 'd2-format-suffix': ' PLN netto' }, '422934.4');
  env.body.appendChild(price);
  env.body.appendChild(suffixed);

  loadFormatModule(env);
  await flushTimers();

  assert.equal(price.textContent, '199 999 PLN');
  assert.equal(suffixed.textContent, '422 934 PLN netto');
});
