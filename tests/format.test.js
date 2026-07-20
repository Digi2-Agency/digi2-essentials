const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'webflow-scripts', 'modules', 'format.js');

// Formatted output uses non-breaking spaces by default; nb() rewrites the
// regular spaces in an expected literal to U+00A0 so assertions stay readable.
const nb = (s) => s.replace(/ /g, String.fromCharCode(160));

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

  assert.equal(price.textContent, nb('199 999'));
  assert.equal(env.window.digi2.format.price('422934.4'), nb('422 934'));
});

test('d2-format-number price alias formats dynamically added elements', async () => {
  const env = createEnvironment();

  loadFormatModule(env);
  await flushTimers();

  const price = createElement('div', { 'd2-format-number': 'price' }, '422934.4');
  env.body.appendChild(price);
  env.observers.forEach((observer) => observer.callback());
  await flushTimers();

  assert.equal(price.textContent, nb('422 934'));
});

test('legacy format-price class is treated as a price formatter without default suffix', async () => {
  const env = createEnvironment();
  const price = createElement('div', { class: 'format-price' }, '199999');
  env.body.appendChild(price);

  loadFormatModule(env);
  await flushTimers();

  assert.equal(price.textContent, nb('199 999'));
});

test('price formatter appends currency only when configured', async () => {
  const env = createEnvironment();
  const price = createElement('div', { 'd2-format-price': '', 'd2-format-currency': 'PLN' }, '199999');
  const suffixed = createElement('div', { 'd2-format-price': '', 'd2-format-suffix': ' PLN netto' }, '422934.4');
  env.body.appendChild(price);
  env.body.appendChild(suffixed);

  loadFormatModule(env);
  await flushTimers();

  assert.equal(price.textContent, nb('199 999 PLN'));
  assert.equal(suffixed.textContent, nb('422 934 PLN netto'));
});

test('d2-format-unit prepends a module-controlled space before the unit', async () => {
  const env = createEnvironment();
  const el = createElement('div', { 'd2-format-price': '', 'd2-format-unit': 'zł/m²' }, '20500');
  env.body.appendChild(el);

  loadFormatModule(env);
  await flushTimers();

  assert.equal(el.textContent, nb('20 500 zł/m²'));
  assert.equal(env.window.digi2.format.price('20500', { unit: 'zł/m²' }), nb('20 500 zł/m²'));
});

test('d2-format-space forces a space before a suffix trimmed by Webflow', async () => {
  const env = createEnvironment();
  const el = createElement('div', { 'd2-format-price': '', 'd2-format-suffix': 'zł/m²', 'd2-format-space': '' }, '20500');
  env.body.appendChild(el);

  loadFormatModule(env);
  await flushTimers();

  assert.equal(el.textContent, nb('20 500 zł/m²'));
});

test('d2-format-space does not double an existing leading space', async () => {
  const env = createEnvironment();
  const el = createElement('div', { 'd2-format-price': '', 'd2-format-currency': 'PLN', 'd2-format-space': '' }, '199999');
  env.body.appendChild(el);

  loadFormatModule(env);
  await flushTimers();

  assert.equal(el.textContent, nb('199 999 PLN'));
});

test('d2-format-price inside a hidden nested panel (accordion) still formats', async () => {
  const env = createEnvironment();
  // Mirrors the list layout: item → hidden accordion panel → price
  const item = createElement('div', { 'd2-cms-item': '' });
  const panel = createElement('div', { 'd2-tab-instance': 'a-3-12' });
  const price = createElement('div', { 'd2-format-price': '' }, '1683540');
  panel.appendChild(price);
  item.appendChild(panel);
  env.body.appendChild(item);

  loadFormatModule(env);
  await flushTimers();

  assert.equal(price.textContent, nb('1 683 540'), 'hidden nested price must format');
});

test('d2-format-nbsp keeps separators as non-breaking spaces (no wrap)', async () => {
  const env = createEnvironment();
  const price = createElement('div', { 'd2-format-price': '', 'd2-format-nbsp': '' }, '1468620');
  env.body.appendChild(price);

  loadFormatModule(env);
  await flushTimers();

  assert.equal(price.textContent, '1 468 620', 'thousands separators must be U+00A0');
  assert.equal(/[  ]/.test(price.textContent), false, 'no regular/narrow spaces remain');

  const withCur = createElement('div', {
    'd2-format-price': '', 'd2-format-currency': 'PLN', 'd2-format-nbsp': '',
  }, '1468620');
  env.body.appendChild(withCur);
  env.window.digi2.format.refresh();
  assert.equal(withCur.textContent, '1 468 620 PLN', 'suffix space must be non-breaking too');
});

test('d2-format-break opts back into regular, wrappable spaces', async () => {
  const env = createEnvironment();
  const price = createElement('div', { 'd2-format-price': '', 'd2-format-break': '' }, '1468620');
  env.body.appendChild(price);

  loadFormatModule(env);
  await flushTimers();

  assert.equal(price.textContent, '1 468 620', 'regular spaces when opted out');
  assert.equal(/ /.test(price.textContent), false, 'no non-breaking spaces remain');
});

test('d2-format-sum-* sets element text to the sum of its attribute values', async () => {
  const env = createEnvironment();
  const total = createElement('div', {
    'd2-format-sum-1': '28.75',
    'd2-format-sum-2': '1.5',
  }, '0');
  env.body.appendChild(total);

  loadFormatModule(env);
  await flushTimers();

  assert.equal(total.textContent, '30,25');
});

test('sum skips blank parts and keeps decimals from the parsed ones', async () => {
  const env = createEnvironment();
  // Polish-comma value + a blank CMS binding (no balcony)
  const total = createElement('div', {
    'd2-format-sum-1': '28,75',
    'd2-format-sum-2': '',
    'd2-format-unit': 'm²',
  }, '0');
  env.body.appendChild(total);

  loadFormatModule(env);
  await flushTimers();

  assert.equal(total.textContent, nb('28,75 m²'));
});

test('sum with no parsable parts leaves the authored fallback text alone', async () => {
  const env = createEnvironment();
  const total = createElement('div', {
    'd2-format-sum-1': '',
    'd2-format-sum-2': '',
  }, '—');
  env.body.appendChild(total);

  loadFormatModule(env);
  await flushTimers();

  assert.equal(total.textContent, '—');
});

test('explicit d2-format-decimals overrides the inferred sum decimals', async () => {
  const env = createEnvironment();
  const total = createElement('div', {
    'd2-format-sum-1': '28.75',
    'd2-format-sum-2': '1.5',
    'd2-format-decimals': '0',
  }, '0');
  env.body.appendChild(total);

  loadFormatModule(env);
  await flushTimers();

  assert.equal(total.textContent, '30');
});

test('sum composes with d2-format-price styling', async () => {
  const env = createEnvironment();
  const total = createElement('div', {
    'd2-format-sum-1': '422934',
    'd2-format-sum-2': '15000',
    'd2-format-price': '',
    'd2-format-currency': 'PLN',
  }, '0');
  env.body.appendChild(total);

  loadFormatModule(env);
  await flushTimers();

  assert.equal(total.textContent, nb('437 934 PLN'));
});
