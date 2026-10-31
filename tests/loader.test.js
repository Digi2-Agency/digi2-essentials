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
// A module that throws while it loads never replaces its proxy. The proxy used
// to replay the call on whatever sat on digi2.<ns> after loading — itself — and
// every replay resolved at once, so the page spun in microtasks forever: the
// whole tab froze, `load` never fired. Reproduced in Chromium on
// digi2.popups.create() inside digi2.onReady() with a throwing popups module.
function loadLoaderWithScripts(scriptAttrs, { noProxy = false } = {}) {
  const appended = [];
  const src = 'https://cdn.test/dist/digi2-loader.min.js';
  const script = {
    src,
    getAttribute: (n) => (n === 'src' ? src : Object.prototype.hasOwnProperty.call(scriptAttrs, n) ? scriptAttrs[n] : null),
    hasAttribute: (n) => Object.prototype.hasOwnProperty.call(scriptAttrs, n),
    attributes: Object.keys(scriptAttrs).map((name) => ({ name })),
  };
  const errors = [];
  const window = {
    innerWidth: 1200,
    addEventListener() {},
    getComputedStyle: () => ({ display: 'block' }),
    location: { href: 'https://example.com/' },
    requestAnimationFrame: (cb) => { cb(); return 1; },
  };
  const document = {
    readyState: 'complete',
    addEventListener() {},
    querySelectorAll: () => [],
    querySelector: () => null,
    currentScript: script,
    head: { appendChild(el) { appended.push(el); } },
    body: { appendChild() {} },
    documentElement: {},
    createElement: () => ({ setAttribute() {}, addEventListener() {} }),
  };
  window.document = document;
  const quietConsole = Object.assign({}, console, {
    error: (...a) => errors.push(a.join(' ')),
    warn() {}, log() {},
  });
  const globals = {
    window, document, console: quietConsole, navigator: { userAgent: 'node-test' },
    setTimeout, MutationObserver: class { observe() {} },
  };
  // A browser without Proxy gets the loader's fallback object instead.
  if (noProxy) globals.Proxy = undefined;
  const context = vm.createContext(globals);
  vm.runInContext(fs.readFileSync(loaderPath, 'utf8'), context, { filename: loaderPath });
  return { window, appended, errors };
}

for (const useProxy of [true, false]) {
  test('a module that throws on load: a call through its ' + (useProxy ? 'Proxy' : 'fallback object')
    + ' is not replayed forever', async () => {
    const env = loadLoaderWithScripts({ 'd2-popups': '' }, { noProxy: !useProxy });
    const d2 = env.window.digi2;

    // Count the proxy round-trips; past a sane number the old loop is back.
    // Throwing from the log call breaks the loop so the test ends red, not hung.
    let replays = 0;
    const log = d2.log;
    d2.log = function (scope, msg) {
      if (scope === 'loader' && /^auto-require "popups"/.test(String(msg)) && ++replays > 50) {
        throw new Error('proxy replayed ' + replays + ' times — infinite loop');
      }
      return log.apply(this, arguments);
    };

    const moduleErrors = [];
    d2.on('module:error', (name) => moduleErrors.push(name));

    const call = d2.popups.create('promo', {});
    // The module "loads" but throws before registering: the browser still
    // fires onload, digi2.popups is still the proxy.
    const tag = env.appended.find((el) => /modules\/popups\.min\.js$/.test(el.src));
    assert.ok(tag, 'the popups module was requested');
    tag.onload();

    const outcome = await call.then(() => 'settled', (e) => 'rejected: ' + e.message);
    assert.ok(replays <= 2, 'the call reached the proxy ' + replays + ' times (' + outcome + ')');
    assert.match(outcome, /^rejected: .*did not register digi2\.popups/, 'the caller learns the call did not run');
    assert.ok(env.errors.some((m) => /"popups"/.test(m) && /did not register/.test(m)),
      'the failure is reported on the console: ' + JSON.stringify(env.errors));
    assert.deepEqual(moduleErrors, ['popups'], 'module:error, not module:loaded');
    assert.notEqual(d2._loaded.popups, true, 'not marked as loaded');
  });
}

test('a module that registers itself: the proxied call is replayed once on the real module', async () => {
  const env = loadLoaderWithScripts({ 'd2-popups': '' });
  const d2 = env.window.digi2;
  const call = d2.popups.create('promo', { a: 1 });
  const tag = env.appended.find((el) => /modules\/popups\.min\.js$/.test(el.src));
  const seen = [];
  d2.popups = { create: (name, opts) => { seen.push([name, opts.a]); return 'instance'; } };
  tag.onload();
  assert.equal(await call, 'instance');
  assert.deepEqual(seen, [['promo', 1]]);
  assert.equal(d2._loaded.popups, true);
  assert.deepEqual(env.errors, []);
});
