const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const loaderPath = path.join(__dirname, '..', 'webflow-scripts', 'digi2-loader.js');

// A DOM element thin enough for the loader's static-width code: it measures
// with getBoundingClientRect and writes to .style. `widthFor` lets a test say
// how wide the content wants to be at a given viewport, which is the whole
// point of re-measuring on a breakpoint flip.
function createElement(attrs, widthFor) {
  const el = {
    attributes: Object.assign({}, attrs || {}),
    style: {},
    children: [],
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
    },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name); },
    getBoundingClientRect() {
      // An explicit min-width lock wins, mirroring how a real box behaves.
      const locked = parseFloat(this.style.minWidth);
      const natural = widthFor ? widthFor(el._env.window.innerWidth) : 100;
      return { width: isNaN(locked) ? natural : Math.max(locked, natural) };
    },
  };
  return el;
}

function loadLoader({ innerWidth = 1200, elements = [], display = 'block' } = {}) {
  const script = {
    src: 'https://cdn.test/dist/digi2-loader.min.js',
    getAttribute: (n) => (n === 'src' ? 'https://cdn.test/dist/digi2-loader.min.js' : null),
    hasAttribute: () => false,
    attributes: [],
  };

  const resizeHandlers = [];
  const window = {
    innerWidth,
    addEventListener(type, fn) { if (type === 'resize') resizeHandlers.push(fn); },
    getComputedStyle: () => ({ display }),
    location: { href: 'https://example.com/' },
    requestAnimationFrame: (cb) => { cb(); return 1; },
  };

  const document = {
    readyState: 'complete',
    addEventListener() {},
    querySelectorAll: (sel) => (sel === '[d2-static-width]' ? elements : []),
    querySelector: () => null,
    currentScript: script,
    head: { appendChild() {} },
    body: { appendChild() {} },
    documentElement: {},
    createElement: () => ({ setAttribute() {}, addEventListener() {} }),
  };
  window.document = document;

  const context = vm.createContext({
    window, document, console, navigator: { userAgent: 'node-test' },
    setTimeout, MutationObserver: class { observe() {} },
  });

  const env = { window, document, resizeHandlers, context };
  elements.forEach((el) => { el._env = env; });
  vm.runInContext(fs.readFileSync(loaderPath, 'utf8'), context, { filename: loaderPath });
  return env;
}

test('d2-static-width anchors left by default and right below its breakpoint', () => {
  const wide = createElement({ 'd2-static-width': 'left;right@728' });
  loadLoader({ innerWidth: 1200, elements: [wide] });
  assert.equal(wide.style.textAlign, 'left', 'above the breakpoint: the default anchor');

  const narrow = createElement({ 'd2-static-width': 'left;right@728' });
  loadLoader({ innerWidth: 600, elements: [narrow] });
  assert.equal(narrow.style.textAlign, 'right', 'at 600px the @728 override wins');
});

test('the breakpoint is inclusive — exactly 728 already counts as below', () => {
  const el = createElement({ 'd2-static-width': 'left;right@728' });
  loadLoader({ innerWidth: 728, elements: [el] });
  assert.equal(el.style.textAlign, 'right');
});

test('a plain value still works and is unaffected by width', () => {
  const el = createElement({ 'd2-static-width': 'center' });
  loadLoader({ innerWidth: 400, elements: [el] });
  assert.equal(el.style.textAlign, 'center');
});

test('flex containers are anchored with justify-content, not text-align', () => {
  const el = createElement({ 'd2-static-width': 'left;right@728' });
  loadLoader({ innerWidth: 600, elements: [el], display: 'flex' });
  assert.equal(el.style.justifyContent, 'flex-end');
  assert.equal(el.style.textAlign, undefined, 'text-align is left alone on a flex box');
});

test('a breakpoint with no anchor clears the one another breakpoint set', () => {
  // "right" only below 728: above it there is no anchor at all.
  const el = createElement({ 'd2-static-width': 'right@728' });
  el.style.textAlign = 'right';        // as if set while the viewport was narrow
  loadLoader({ innerWidth: 1200, elements: [el] });
  assert.equal(el.style.textAlign, '', 'the stale alignment is removed');
});

test('the locked width is re-measured when the breakpoint bucket flips', () => {
  // Content wants 200px on desktop, 100px on mobile.
  const el = createElement({ 'd2-static-width': 'left;right@728' }, (w) => (w > 728 ? 200 : 100));
  const env = loadLoader({ innerWidth: 1200, elements: [el] });
  assert.equal(el.style.minWidth, '200px', 'locked to the desktop measurement');

  env.window.innerWidth = 600;
  env.resizeHandlers.forEach((fn) => fn());

  assert.equal(el.style.minWidth, '100px', 'a desktop lock does not cage the mobile layout');
  assert.equal(el.style.textAlign, 'right', 'and the anchor follows the new breakpoint');
});
