// Two loaders on one page: the site-wide one (often @latest, an older version)
// and a second one pinned for a single module (d2-booking in an Embed). Both
// used to install their own digi2.on/emit and both announced 'loaded', so every
// digi2.onReady callback registered after the second tag ran twice — and page
// code that added listeners in it pushed analytics events twice.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const CURRENT = path.join(__dirname, '..', 'webflow-scripts', 'digi2-loader.js');
// The stable loader as it sits on @latest today. A second loader has to work
// next to it, because the site-wide tag is not something we can change.
const STABLE = path.join(__dirname, 'fixtures', 'loader', 'digi2-loader-v1.8.3.js');

function page(opts) {
  const o = opts || {};
  const injected = [];
  // A test that needs the clock passes its own; the rest run on the real one.
  const timers = [];
  const clock = o.fakeClock
    ? (fn, ms) => { timers.push({ fn, ms }); return timers.length; }
    : setTimeout;
  const window = {
    innerWidth: 1200,
    addEventListener() {},
    getComputedStyle: () => ({ display: 'block' }),
    location: { href: 'https://example.com/booking' },
    requestAnimationFrame: (cb) => { cb(); return 1; },
  };
  const document = {
    readyState: 'complete',
    addEventListener() {},
    querySelectorAll: () => [],
    querySelector: () => null,
    currentScript: null,
    head: { appendChild(el) { injected.push(el); } },
    body: { appendChild() {} },
    documentElement: {},
    createElement: () => ({ setAttribute() {}, addEventListener() {} }),
  };
  window.document = document;
  const context = vm.createContext({
    window, document, console, navigator: { userAgent: 'node-test' },
    setTimeout: clock, MutationObserver: class { observe() {} }, Promise,
  });

  function runLoader(file, src, attrs) {
    document.currentScript = {
      src,
      getAttribute: (n) => (n === 'src' ? src : Object.prototype.hasOwnProperty.call(attrs, n) ? attrs[n] : null),
      hasAttribute: (n) => Object.prototype.hasOwnProperty.call(attrs, n),
      attributes: Object.keys(attrs).map((name) => ({ name })),
    };
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
    document.currentScript = null;
  }

  // The module file arrives: it registers its namespace, then onload fires.
  function arrive(module, namespace) {
    const script = injected.find((s) => s.src.indexOf('/modules/' + module + '.') !== -1 && !s._done);
    assert.ok(script, 'module "' + module + '" was requested');
    script._done = true;
    window.digi2[namespace || module] = { real: module };
    script.onload();
  }

  const settle = () => new Promise((r) => setImmediate(r));
  return { window, document, injected, runLoader, arrive, settle, timers };
}

const SITE = 'https://cdn.jsdelivr.net/gh/x/y@latest/dist/digi2-loader.min.js';
const EMBED = 'https://cdn.jsdelivr.net/gh/x/y@v1.9.0-ma.99/dist/digi2-loader.min.js';

for (const [label, first] of [['stable v1.8.3', STABLE], ['current', CURRENT]]) {
  test(`${label} + current: onReady after the second tag runs once, after both loaders`, async () => {
    const p = page();
    p.runLoader(first, SITE, { 'd2-forms': '' });
    p.runLoader(CURRENT, EMBED, { 'd2-booking': 'pk_test' });
    let calls = 0;
    let bookingThen = null;
    p.window.digi2.onReady(() => {
      calls++;
      bookingThen = p.window.digi2.booking && p.window.digi2.booking.real;
    });

    p.arrive('forms');
    await p.settle();
    assert.equal(calls, 0, 'the first loader alone must not announce the page ready while booking is still on its way');

    p.arrive('booking');
    await p.settle();
    assert.equal(calls, 1, 'exactly one loaded');
    assert.equal(bookingThen, 'booking', 'booking is the real module when the callback runs');
  });

  test(`${label} + current: second loader finishing first still gives one loaded`, async () => {
    const p = page();
    p.runLoader(first, SITE, { 'd2-forms': '' });
    p.runLoader(CURRENT, EMBED, { 'd2-booking': 'pk_test' });
    let calls = 0;
    p.window.digi2.onReady(() => { calls++; });

    p.arrive('booking');
    await p.settle();
    assert.equal(calls, 0, 'forms of the first loader not here yet');
    p.arrive('forms');
    await p.settle();
    assert.equal(calls, 1);
  });

  test(`${label} + current: a callback registered between the two tags runs once`, async () => {
    const p = page();
    p.runLoader(first, SITE, { 'd2-forms': '' });
    let calls = 0;
    p.window.digi2.onReady(() => { calls++; });
    p.runLoader(CURRENT, EMBED, { 'd2-booking': 'pk_test' });
    p.arrive('forms');
    p.arrive('booking');
    await p.settle();
    await p.settle();
    assert.equal(calls, 1);
  });

  test(`${label} + current: each module comes from its own loader, none twice`, async () => {
    const p = page();
    p.runLoader(first, SITE, { 'd2-forms': '' });
    p.runLoader(CURRENT, EMBED, { 'd2-booking': 'pk_test' });
    const srcs = p.injected.map((s) => s.src);
    assert.deepEqual(srcs.filter((s) => s.indexOf('/modules/forms.') !== -1),
      ['https://cdn.jsdelivr.net/gh/x/y@latest/dist/modules/forms.min.js']);
    assert.deepEqual(srcs.filter((s) => s.indexOf('/modules/booking.') !== -1),
      ['https://cdn.jsdelivr.net/gh/x/y@v1.9.0-ma.99/dist/modules/booking.min.js']);
    assert.equal(p.window.digi2._bookingKey, 'pk_test');
  });

  test(`${label} + current: the second loader keeps the first one's event bus`, () => {
    const p = page();
    p.runLoader(first, SITE, { 'd2-forms': '' });
    const { on, off, emit, onReady, attr } = p.window.digi2;
    p.runLoader(CURRENT, EMBED, { 'd2-booking': 'pk_test' });
    assert.equal(p.window.digi2.on, on);
    assert.equal(p.window.digi2.off, off);
    assert.equal(p.window.digi2.onReady, onReady);
    assert.equal(p.window.digi2.attr, attr, 'one responsive parser, so responsive:change knows every breakpoint');
    // emit may be wrapped (to hold 'loaded'), but other events pass straight through
    let got = null;
    p.window.digi2.on('custom', (d) => { got = d; });
    p.window.digi2.emit('custom', 42);
    assert.equal(got, 42);
  });
}

test('second loader arriving after the page was already announced ready: no second loaded', async () => {
  const p = page();
  p.runLoader(STABLE, SITE, { 'd2-forms': '' });
  let early = 0;
  p.window.digi2.onReady(() => { early++; });
  p.arrive('forms');
  await p.settle();
  assert.equal(early, 1);

  p.runLoader(CURRENT, EMBED, { 'd2-booking': 'pk_test' });
  let late = 0;
  p.window.digi2.onReady(() => { late++; });
  p.arrive('booking');
  await p.settle();
  assert.equal(early, 1, 'a listener that already ran is not called again');
  assert.equal(late, 1, 'a late callback runs once');
});

test('a single loader still announces loaded once', async () => {
  const p = page();
  p.runLoader(CURRENT, SITE, { 'd2-forms': '' });
  let calls = 0;
  p.window.digi2.onReady(() => { calls++; });
  p.arrive('forms');
  await p.settle();
  assert.equal(calls, 1);
});

test('a module failing in the second loader does not keep the page from loaded', async () => {
  const p = page();
  p.runLoader(STABLE, SITE, { 'd2-forms': '' });
  p.runLoader(CURRENT, EMBED, { 'd2-booking': 'pk_test' });
  let calls = 0;
  p.window.digi2.onReady(() => { calls++; });
  const errors = console.error;
  console.error = () => {};
  try {
    p.arrive('forms');
    p.injected.find((s) => s.src.indexOf('/modules/booking.') !== -1).onerror();
    await p.settle();
    await p.settle();
  } finally { console.error = errors; }
  assert.equal(calls, 1);
});

test('current + current: an early call on the booking stub fetches booking once, from the second loader', async () => {
  const p = page();
  p.runLoader(CURRENT, SITE, { 'd2-forms': '' });
  p.runLoader(CURRENT, EMBED, { 'd2-booking': 'pk_test' });
  p.window.digi2.booking.config(); // page code calling before the module arrived
  await p.settle();
  const booking = p.injected.map((s) => s.src).filter((s) => s.indexOf('/modules/booking.') !== -1);
  assert.deepEqual(booking, ['https://cdn.jsdelivr.net/gh/x/y@v1.9.0-ma.99/dist/modules/booking.min.js']);
});

test('page declarations are scanned by the first loader only', () => {
  const p = page();
  const decl = {
    attributes: [{ name: 'd2-tabs' }],
    getAttribute: () => null,
  };
  p.document.querySelectorAll = (sel) => (sel.indexOf('digi2-module') !== -1 ? [decl] : []);
  p.runLoader(CURRENT, SITE, { 'd2-forms': '' });
  p.runLoader(CURRENT, EMBED, { 'd2-booking': 'pk_test' });
  const tabs = p.injected.map((s) => s.src).filter((s) => s.indexOf('/modules/tabs.') !== -1);
  assert.deepEqual(tabs, ['https://cdn.jsdelivr.net/gh/x/y@latest/dist/modules/tabs.min.js']);
});

for (const [label, first] of [['stable v1.8.3', STABLE], ['current', CURRENT]]) {
  test(`${label} + current: a guest module that never arrives holds onReady for 10 s at most`, async () => {
    // MUTACJA: drop the timeout and a hung request for booking.min.js (no
    // onload, no onerror) keeps forms.create in onReady from ever running.
    const p = page({ fakeClock: true });
    p.runLoader(first, SITE, { 'd2-forms': '' });
    p.runLoader(CURRENT, EMBED, { 'd2-booking': 'pk_test' });
    let calls = 0;
    p.window.digi2.onReady(() => { calls++; });
    p.arrive('forms');
    await p.settle();
    assert.equal(calls, 0, 'still waiting for booking');

    const guard = p.timers.filter((t) => t.ms === 10000);
    assert.equal(guard.length, 1, 'one 10 s guard');
    const warn = console.warn;
    const said = [];
    console.warn = (m) => { said.push(String(m)); };
    try { guard[0].fn(); } finally { console.warn = warn; }
    await p.settle();
    assert.equal(calls, 1, 'onReady goes ahead without booking');
    assert.ok(said.some((m) => m.indexOf('booking') >= 0), 'and says which module it gave up on');

    p.arrive('booking'); // the module turns up late after all
    await p.settle();
    assert.equal(calls, 1, 'no second loaded when it does');
  });
}

test('the guard does nothing once the guest modules are in', async () => {
  const p = page({ fakeClock: true });
  p.runLoader(STABLE, SITE, { 'd2-forms': '' });
  p.runLoader(CURRENT, EMBED, { 'd2-booking': 'pk_test' });
  let calls = 0;
  p.window.digi2.onReady(() => { calls++; });
  p.arrive('forms');
  p.arrive('booking');
  await p.settle();
  assert.equal(calls, 1);
  p.timers.filter((t) => t.ms === 10000).forEach((t) => t.fn());
  await p.settle();
  assert.equal(calls, 1);
});
