const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');


// popups + lightbox in one document, sharing digi2.scrollLock. The DOM helpers
// are the popups suite's; both modules run against the same window.
const popupsPath = path.join(__dirname, '..', 'webflow-scripts', 'modules', 'popups.js');
const lightboxPath = path.join(__dirname, '..', 'webflow-scripts', 'modules', 'lightbox.js');

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
  if (selector.indexOf(',') !== -1) {
    return selector.split(',').map((s) => s.trim()).filter(Boolean)
      .some((s) => matchesSelector(node, s));
  }
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

function createEnvironment({ store = {}, pathname = '/', search = '', cookie = '' } = {}) {
  const body = createElement('body');
  const documentElement = createElement('html');
  const docListeners = {};
  const timers = [];

  const document = {
    body,
    documentElement,
    readyState: 'complete',
    cookie,
    visibilityState: 'visible',
    addEventListener(type, fn) {
      docListeners[type] = docListeners[type] || [];
      docListeners[type].push(fn);
    },
    removeEventListener(type, fn) {
      if (docListeners[type]) docListeners[type] = docListeners[type].filter((h) => h !== fn);
    },
    querySelector(selector) { return body.querySelector(selector); },
    querySelectorAll(selector) { return body.querySelectorAll(selector); },
    createElement,
  };

  const window = {
    digi2: { log() {} },
    location: { href: 'https://example.com' + pathname + search, pathname, search },
    scrollY: 0,
  };
  window.document = document;

  // window-level listeners — the start gate gives the page three ways to say
  // "go" and one of them is a DOM event on window.
  const winListeners = {};
  window.addEventListener = function (type, fn) {
    (winListeners[type] = winListeners[type] || []).push(fn);
  };
  window.removeEventListener = function (type, fn) {
    if (winListeners[type]) winListeners[type] = winListeners[type].filter((h) => h !== fn);
  };

  const sessionStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
  };

  // Capturing setTimeout — records (fn, ms) so tests can assert the delay and
  // fire the callback manually instead of waiting in real time.
  function fakeSetTimeout(fn, ms) {
    timers.push({ fn: fn, ms: ms });
    return timers.length - 1;
  }
  function fakeClearTimeout() {}

  const env = {
    context: vm.createContext({
      window,
      document,
      navigator: { userAgent: 'node-test' },
      sessionStorage,
      console,
      setTimeout: fakeSetTimeout,
      clearTimeout: fakeClearTimeout,
      Date,
      URLSearchParams,
    }),
    window,
    document,
    body,
    timers,
    dispatchWindow(type) {
      (winListeners[type] || []).slice().forEach((fn) => fn({ type }));
    },
    dispatchDoc(type, target, extra) {
      const event = Object.assign({ target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }, extra || {});
      (docListeners[type] || []).forEach((fn) => fn(event));
      return event;
    },
  };
  return env;
}

// The loader's event bus, in miniature — signal() remembers, when() replays.
// The popups module only ever calls when(); the rest is here so a test can
// signal the way a real page does.
function installBus(env) {
  const listeners = {};
  const signalled = {};
  const bus = env.window.digi2;
  bus.on = (event, fn) => { (listeners[event] = listeners[event] || []).push(fn); };
  bus.off = (event, fn) => {
    if (listeners[event]) listeners[event] = listeners[event].filter((f) => f !== fn);
  };
  bus.emit = (event, data) => { (listeners[event] || []).slice().forEach((fn) => fn(data)); };
  bus.signal = (event, data) => { signalled[event] = { data }; bus.emit(event, data); };
  bus.signalled = (event) => Object.prototype.hasOwnProperty.call(signalled, event);
  bus.when = (event, fn) => {
    if (signalled[event]) { fn(signalled[event].data); return () => {}; }
    let done = false;
    const once = (data) => { if (done) return; done = true; bus.off(event, once); fn(data); };
    bus.on(event, once);
    return () => bus.off(event, once);
  };
  return bus;
}

function load(env, file) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), env.context, { filename: file });
}

function fireTimers(env, ms) {
  const due = env.timers.filter((t) => t.ms === ms && !t.fired);
  due.forEach((t) => { t.fired = true; t.fn(); });
  return due.length;
}

const RESUME_MS = 600;   // popups: the beat between a close and a parked open

// One document with the loader's bus, the lightbox and two popups. `order`
// is the load order — the shared lock must work whichever module comes first.
function pageEnv({ order = 'popups-first', overflow = '' } = {}) {
  const env = createEnvironment();
  installBus(env);
  env.window.requestAnimationFrame = () => 0;
  env.window.cancelAnimationFrame = () => {};
  env.body.style.overflow = overflow;
  if (order === 'popups-first') { load(env, popupsPath); load(env, lightboxPath); }
  else { load(env, lightboxPath); load(env, popupsPath); }
  ['form', 'promo'].forEach((n) => env.body.appendChild(createElement('div', { class: 'p-' + n })));
  const d2 = env.window.digi2;
  const form = d2.popups.create('form', { popupSelector: '.p-form', animation: 'none', cookieName: null });
  const promo = d2.popups.create('promo', { popupSelector: '.p-promo', animation: 'none', cookieName: null });
  return { env, d2, form, promo, body: env.body, lb: d2.lightbox };
}

function openGallery(t) { t.lb.open([{ src: 'https://x/1.jpg' }, { src: 'https://x/2.jpg' }]); }

['popups-first', 'lightbox-first'].forEach((order) => {
  ['', 'scroll'].forEach((overflow) => {
    const label = `${order}, page overflow "${overflow}"`;

    test(`lightbox, then a popup over it: closing the lightbox first gives the page back after the popup (${label})`, () => {
      // The bernardynska.com/galeria lock: the popup snapshotted the gallery's
      // "hidden", the lightbox restored "" first, the popup wrote "hidden" back
      // and nothing was open on a page that would not scroll.
      const t = pageEnv({ order, overflow });
      openGallery(t);
      t.form.show();
      assert.equal(t.body.style.overflow, 'hidden');
      t.lb.close();
      assert.equal(t.body.style.overflow, 'hidden', 'the popup is still up');
      t.form.hide();
      assert.equal(t.body.style.overflow, overflow, 'nothing open: the page value is back');
    });

    test(`lightbox, then a popup over it: closing the popup first (${label})`, () => {
      const t = pageEnv({ order, overflow });
      openGallery(t);
      t.form.show();
      t.form.hide();
      assert.equal(t.body.style.overflow, 'hidden', 'the gallery is still up');
      t.lb.close();
      assert.equal(t.body.style.overflow, overflow);
    });

    test(`a popup, then the lightbox over it, closed in either order (${label})`, () => {
      const a = pageEnv({ order, overflow });
      a.form.show();
      openGallery(a);
      a.form.hide();
      assert.equal(a.body.style.overflow, 'hidden');
      a.lb.close();
      assert.equal(a.body.style.overflow, overflow);

      const b = pageEnv({ order, overflow });
      b.form.show();
      openGallery(b);
      b.lb.close();
      assert.equal(b.body.style.overflow, 'hidden');
      b.form.hide();
      assert.equal(b.body.style.overflow, overflow);
    });
  });
});

test('both modules share one digi2.scrollLock, whichever loads first', () => {
  const t = pageEnv({ order: 'lightbox-first' });
  openGallery(t);
  t.form.show();
  const owners = Array.from(t.d2.scrollLock.owners());
  assert.equal(owners.length, 2);
  assert.ok(owners.includes('lightbox'));
  assert.ok(owners.some((o) => String(o).startsWith('popup:form')));
});

test('scrollLock: acquire is idempotent per owner, release of an unknown owner does nothing', () => {
  const t = pageEnv({ overflow: 'auto' });
  const lock = t.d2.scrollLock;
  assert.equal(lock.acquire('x'), true);
  assert.equal(lock.acquire('x'), false, 'second acquire by the same owner');
  assert.equal(lock.release('nobody'), false);
  assert.equal(t.body.style.overflow, 'hidden');
  assert.equal(lock.release('x'), true);
  assert.equal(t.body.style.overflow, 'auto', 'one release undoes one owner, however many acquires');
  assert.equal(lock.isLocked(), false);
  assert.equal(lock.release('x'), false, 'never unlock more than was locked');
  assert.equal(t.body.style.overflow, 'auto');
});

test('an automatic popup waits for the open lightbox and comes after lightbox:close', () => {
  const t = pageEnv();
  openGallery(t);
  t.promo.show({ auto: true });                 // a delay / exit-intent firing
  assert.equal(t.promo.isVisible, false, 'it does not land on the gallery');
  assert.equal(t.promo.pendingShow, true, 'it is parked, not dropped');

  t.lb.close();
  assert.equal(t.body.style.overflow, '', 'the page scrolls in the beat before it');
  fireTimers(t.env, RESUME_MS);
  assert.equal(t.promo.isVisible, true, 'the gallery closed: its turn');
  assert.equal(t.body.style.overflow, 'hidden');
  t.promo.hide();
  assert.equal(t.body.style.overflow, '');
});

test('openAfterDelay coming due during the gallery waits for it', () => {
  const t = pageEnv();
  t.env.body.appendChild(createElement('div', { class: 'p-delayed' }));
  const delayed = t.d2.popups.create('delayed', {
    popupSelector: '.p-delayed', animation: 'none', cookieName: null, openAfterDelay: 3,
  });
  openGallery(t);
  fireTimers(t.env, 3000);
  assert.equal(delayed.isVisible, false);
  t.lb.close();
  fireTimers(t.env, RESUME_MS);
  assert.equal(delayed.isVisible, true);
});

test('a popup the visitor asks for still opens over the lightbox', () => {
  const t = pageEnv();
  openGallery(t);
  t.form.show();
  assert.equal(t.form.isVisible, true);
  assert.equal(t.lb.isOpen(), true, 'the gallery stays underneath');
});

test('a parked popup does not open while the lightbox is still up after another popup closes', () => {
  const t = pageEnv();
  openGallery(t);
  t.form.show();                                // visitor-opened, over the gallery
  t.promo.show({ auto: true });                 // parks
  t.form.hide();
  fireTimers(t.env, RESUME_MS);
  assert.equal(t.promo.isVisible, false, 'the gallery is still on screen');
  t.lb.close();
  fireTimers(t.env, RESUME_MS);
  assert.equal(t.promo.isVisible, true);
});

test('destroy() on a visible popup hides it and gives back the lock', () => {
  const t = pageEnv({ overflow: 'scroll' });
  const el = t.form.popupElement;
  t.form.show();
  t.d2.popups.destroy('form');
  assert.equal(el.style.display, 'none', 'no orphan popup left on screen');
  assert.equal(t.body.style.overflow, 'scroll');
  assert.equal(t.d2.scrollLock.isLocked(), false);
});

test('destroy() on a visible popup over the lightbox keeps the gallery locked', () => {
  const t = pageEnv();
  openGallery(t);
  t.form.show();
  t.d2.popups.destroy('form');
  assert.equal(t.body.style.overflow, 'hidden', 'the gallery is still open');
  t.lb.close();
  assert.equal(t.body.style.overflow, '');
});

test('destroy() mid-fade settles nothing later and leaves no lock', () => {
  const t = pageEnv();
  t.env.body.appendChild(createElement('div', { class: 'p-fade' }));
  const fade = t.d2.popups.create('fade', { popupSelector: '.p-fade', cookieName: null });
  const el = fade.popupElement;
  let opened = 0;
  t.d2.on('popup:open', () => { opened++; });
  fade.show();                                  // fade-in still running
  t.d2.popups.destroy('fade');
  assert.equal(t.body.style.overflow, '');
  assert.equal(el.style.display, 'none');
  fireTimers(t.env, 0.4 * 1000 + 80);           // the fade timer would have fired here
  assert.equal(opened, 0, 'no popup:open for a popup that is gone');
  assert.equal(t.body.style.overflow, '');
});

test('destroy() on a visible popup lets a parked one through', () => {
  const t = pageEnv();
  t.form.show();
  t.promo.show({ auto: true });
  assert.equal(t.promo.pendingShow, true);
  t.d2.popups.destroy('form');
  fireTimers(t.env, RESUME_MS);
  assert.equal(t.promo.isVisible, true);
});
