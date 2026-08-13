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

function createEnvironment({ store = {}, pathname = '/' } = {}) {
  const body = createElement('body');
  const documentElement = createElement('html');
  const docListeners = {};
  const timers = [];

  const document = {
    body,
    documentElement,
    readyState: 'complete',
    cookie: '',
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
    location: { href: 'https://example.com' + pathname, pathname },
    scrollY: 0,
  };
  window.document = document;

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
    }),
    window,
    document,
    body,
    timers,
    dispatchDoc(type, target) {
      const event = { target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
      (docListeners[type] || []).forEach((fn) => fn(event));
      return event;
    },
  };
  return env;
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

test('data-tag click trigger opens the popup after the configured delay', () => {
  const env = createEnvironment();
  loadPopupsModule(env);
  env.body.appendChild(createElement('div', { class: 'popup__overlay' }));
  const btn = createElement('button', { 'd2-show-popup': 'lead', 'd2-show-popup-delay': '50' });
  env.body.appendChild(btn);
  const inst = env.window.digi2.popups.create('lead', { animation: 'none' });

  env.dispatchDoc('click', btn);
  assert.equal(inst.isVisible, false);        // not opened yet
  assert.equal(env.timers.length, 1);
  assert.equal(env.timers[0].ms, 50000);      // 50s in ms

  env.timers[0].fn();                          // fire the timer
  assert.equal(inst.isVisible, true);
});

test('data-tag click without delay opens immediately', () => {
  const env = createEnvironment();
  loadPopupsModule(env);
  env.body.appendChild(createElement('div', { class: 'popup__overlay' }));
  const btn = createElement('button', { 'd2-show-popup': 'lead' });
  env.body.appendChild(btn);
  const inst = env.window.digi2.popups.create('lead', { animation: 'none' });

  env.dispatchDoc('click', btn);
  assert.equal(inst.isVisible, true);
  assert.equal(env.timers.length, 0);
});

test('delay is read from the data-d2- prefixed attribute too', () => {
  const env = createEnvironment();
  loadPopupsModule(env);
  env.body.appendChild(createElement('div', { class: 'popup__overlay' }));
  const btn = createElement('button', { 'data-d2-show-popup': 'lead', 'data-d2-show-popup-delay': '10' });
  env.body.appendChild(btn);
  const inst = env.window.digi2.popups.create('lead', { animation: 'none' });

  env.dispatchDoc('click', btn);
  assert.equal(inst.isVisible, false);
  assert.equal(env.timers[0].ms, 10000);
  env.timers[0].fn();
  assert.equal(inst.isVisible, true);
});

test('d2-popup-exclude keeps the popup inert on a matching subpage', () => {
  const env = createEnvironment();
  env.window.location.href = 'https://example.com/wyszukiwarka';
  loadPopupsModule(env);

  env.body.appendChild(createElement('div', {
    class: 'popup__overlay',
    'd2-popup-exclude': '/wyszukiwarka|/kontakt',
  }));
  const inst = env.window.digi2.popups.create('promo', { animation: 'none', openOnLoad: true });

  assert.equal(inst.isVisible, false);
  assert.notEqual(inst.popupElement && inst.popupElement.style.display, 'flex');

  // Even an explicit d2-show-popup click must not open it here.
  const btn = createElement('button', { 'd2-show-popup': 'promo' });
  env.body.appendChild(btn);
  env.dispatchDoc('click', btn);
  assert.equal(inst.isVisible, false);
});

test('d2-popup-exclude does not affect other subpages', () => {
  const env = createEnvironment();
  env.window.location.href = 'https://example.com/oferta';
  loadPopupsModule(env);

  env.body.appendChild(createElement('div', {
    class: 'popup__overlay',
    'd2-popup-exclude': '/wyszukiwarka|/kontakt',
  }));
  const inst = env.window.digi2.popups.create('promo', { animation: 'none', openOnLoad: true });

  assert.equal(inst.isVisible, true);
});

test('d2-popup-include whitelists subpages (skips others)', () => {
  const env = createEnvironment();
  env.window.location.href = 'https://example.com/o-nas';
  loadPopupsModule(env);

  env.body.appendChild(createElement('div', {
    class: 'popup__overlay',
    'd2-popup-include': '/oferta|/produkty',
  }));
  const inst = env.window.digi2.popups.create('promo', { animation: 'none', openOnLoad: true });
  assert.equal(inst.isVisible, false);
});

test('create() from <head> retries once the DOM is parsed instead of dying', () => {
  const env = createEnvironment();
  env.document.readyState = 'loading';        // still parsing <head>
  loadPopupsModule(env);

  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (m) => warnings.push(String(m));
  let inst;
  try {
    inst = env.window.digi2.popups.create('late', {
      popupSelector: '.popup__overlay', animation: 'none', openOnLoad: true,
    });
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(warnings.length, 0, 'no warning yet — it is waiting for the DOM');
  assert.equal(inst.popupElement, null, 'markup does not exist yet');

  // Markup arrives, then DOMContentLoaded fires.
  const popup = createElement('div', { class: 'popup__overlay' });
  env.body.appendChild(popup);
  env.document.readyState = 'complete';
  env.dispatchDoc('DOMContentLoaded');

  assert.equal(inst.popupElement, popup, 'element picked up on the retry');
  assert.equal(inst.isVisible, true, 'openOnLoad still honoured after the retry');
});

test('a genuinely missing element still warns, with a hint about <head>', () => {
  const env = createEnvironment();           // readyState: 'complete'
  loadPopupsModule(env);
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (m) => warnings.push(String(m));
  try {
    env.window.digi2.popups.create('nope', { popupSelector: '.does-not-exist' });
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /element not found/);
  assert.match(warnings[0], /Before <\/body>/, 'points at the usual cause');
});

// ---- setCookieOnClose / canShow / showIfPending -----------------------------
// Sequenced popups: a welcome popup that must finish before a second one may
// appear, and a video popup that should keep coming back until actually watched.

function seqEnv() {
  const env = createEnvironment();
  loadPopupsModule(env);
  env.body.appendChild(createElement('div', { class: 'p-welcome' }));
  env.body.appendChild(createElement('div', { class: 'p-video' }));
  return env;
}

test('setCookieOnClose:false — closing does not suppress the popup', () => {
  const env = seqEnv();
  const video = env.window.digi2.popups.create('video', {
    popupSelector: '.p-video', animation: 'none',
    cookieName: 'popup_video_watched', setCookieOnClose: false,
  });

  video.show();
  assert.equal(video.isVisible, true);
  video._closeByUser();
  assert.equal(video.isVisible, false);
  assert.equal(env.document.cookie, '', 'dismissing it writes no cookie');

  // …until the goal is reached.
  video.markSeen();
  assert.match(env.document.cookie, /popup_video_watched=true/);
});

test('setCookieOnClose defaults to true — existing behaviour is unchanged', () => {
  const env = seqEnv();
  const promo = env.window.digi2.popups.create('promo', {
    popupSelector: '.p-welcome', animation: 'none', cookieName: 'promo_closed',
  });
  promo.show();
  promo._closeByUser();
  assert.match(env.document.cookie, /promo_closed=true/);
});

test('canShow() vetoes the open and showIfPending() replays it later', () => {
  const env = seqEnv();
  const welcome = env.window.digi2.popups.create('welcome', {
    popupSelector: '.p-welcome', animation: 'none', cookieName: null,
  });
  const video = env.window.digi2.popups.create('video', {
    popupSelector: '.p-video', animation: 'none', cookieName: null,
    canShow: () => !welcome.isVisible,
  });

  welcome.show();
  video.show();                       // blocked — welcome is on screen
  assert.equal(video.isVisible, false);
  assert.equal(video.pendingShow, true, 'the request is parked, not dropped');

  welcome.hide();
  assert.equal(video.showIfPending(), true);
  assert.equal(video.isVisible, true);
  assert.equal(video.pendingShow, false);
});

test('showIfPending() is a no-op when nothing was deferred', () => {
  const env = seqEnv();
  const video = env.window.digi2.popups.create('video', {
    popupSelector: '.p-video', animation: 'none', cookieName: null,
  });
  assert.equal(video.showIfPending(), false);
  assert.equal(video.isVisible, false);
});

// ---- video ------------------------------------------------------------------

function createVideo(attrs) {
  const v = createElement('video', attrs || {});
  v.muted = true;
  v.volume = 0;
  v.currentTime = 0;
  v.paused = true;
  v.playCalls = 0;
  v.play = function () { this.playCalls += 1; this.paused = false; return { catch() {} }; };
  v.pause = function () { this.paused = true; };
  return v;
}

function videoEnv({ videoOpt, unmuteAttrs } = {}) {
  const env = createEnvironment();
  loadPopupsModule(env);
  const popup = createElement('div', { id: 'popup-video', class: 'popup__overlay' });
  const vid = createVideo({ 'data-src': 'https://cdn.test/film.mp4' });
  popup.appendChild(vid);
  const unmute = createElement('button', unmuteAttrs || { 'data-popup': 'unmute' });
  popup.appendChild(unmute);
  env.body.appendChild(popup);

  const inst = env.window.digi2.popups.create('film', {
    popupSelector: '.popup__overlay', animation: 'none', cookieName: 'video_seen',
    video: videoOpt === undefined ? true : videoOpt,
  });
  return { env, inst, vid, unmute };
}

test('video: opening lazy-loads data-src and starts playback', () => {
  const { inst, vid } = videoEnv();
  assert.equal(vid.getAttribute('src'), null, 'nothing fetched before the popup opens');

  inst.show();
  assert.equal(vid.getAttribute('src'), 'https://cdn.test/film.mp4');
  assert.equal(vid.playCalls, 1);
});

test('video: closing pauses, rewinds and re-mutes so the next open can autoplay', () => {
  const { inst, vid, unmute } = videoEnv();
  inst.show();
  vid.muted = false;
  vid.currentTime = 42;

  inst.hide();
  assert.equal(vid.paused, true);
  assert.equal(vid.currentTime, 0);
  assert.equal(vid.muted, true);
  assert.equal(unmute.style.display, '', 'unmute button comes back');
});

test('video: the unmute button unmutes, replays and hides itself', () => {
  const { inst, vid, unmute } = videoEnv();
  inst.show();
  assert.equal(unmute.style.display, '', 'shown while muted');

  unmute._listeners.click();
  assert.equal(vid.muted, false);
  assert.equal(vid.volume, 1);
  assert.equal(unmute.style.display, 'none');
});

test('video: cookieOnEnd writes the cookie only once the film actually finishes', () => {
  const { env, inst, vid } = videoEnv({ videoOpt: { cookieOnEnd: true } });
  inst.show();
  inst._closeByUser();
  assert.equal(env.document.cookie, '', 'dismissing early is not "watched"');

  inst.show();
  vid._listeners.ended();
  assert.match(env.document.cookie, /video_seen=true/);
});

test('video: closeOnEnd hides the popup when playback finishes', () => {
  const { inst, vid } = videoEnv({ videoOpt: { closeOnEnd: true } });
  inst.show();
  assert.equal(inst.isVisible, true);
  vid._listeners.ended();
  assert.equal(inst.isVisible, false);
});

test('video: autoplay:false wires everything but does not start playback', () => {
  const { inst, vid } = videoEnv({ videoOpt: { autoplay: false } });
  inst.show();
  assert.equal(vid.getAttribute('src'), 'https://cdn.test/film.mp4', 'still lazy-loaded');
  assert.equal(vid.playCalls, 0);
});

test('video: a custom unmuteSelector is honoured', () => {
  const { inst, vid, unmute } = videoEnv({
    videoOpt: { unmuteSelector: '.sound-on' }, unmuteAttrs: { class: 'sound-on' },
  });
  inst.show();
  unmute._listeners.click();
  assert.equal(vid.muted, false);
});

test('video: no <video> in the popup warns instead of failing silently', () => {
  const env = createEnvironment();
  loadPopupsModule(env);
  env.body.appendChild(createElement('div', { class: 'popup__overlay' }));

  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (m) => warnings.push(String(m));
  try {
    env.window.digi2.popups.create('film', {
      popupSelector: '.popup__overlay', animation: 'none', video: true,
    });
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /no <video> found/);
});

test('video: cookieOnEnd flips setCookieOnClose off, but an explicit value wins', () => {
  const implied = videoEnv({ videoOpt: { cookieOnEnd: true } });
  assert.equal(implied.inst.options.setCookieOnClose, false, 'inferred from cookieOnEnd');

  // Explicit opt-in: cookie on BOTH close and end.
  const env = createEnvironment();
  loadPopupsModule(env);
  const popup = createElement('div', { class: 'popup__overlay' });
  popup.appendChild(createVideo({}));
  env.body.appendChild(popup);
  const inst = env.window.digi2.popups.create('film', {
    popupSelector: '.popup__overlay', animation: 'none', cookieName: 'seen',
    setCookieOnClose: true, video: { cookieOnEnd: true },
  });
  assert.equal(inst.options.setCookieOnClose, true, 'explicit setting is not overridden');
});

test('wasSeen() reflects dismissal, so chained popups can skip what was closed', () => {
  const env = seqEnv();
  const promo = env.window.digi2.popups.create('promo', {
    popupSelector: '.p-welcome', animation: 'none', cookieName: 'promo_seen',
  });
  assert.equal(promo.wasSeen(), false);

  promo.show();
  promo._closeByUser();
  assert.equal(promo.wasSeen(), true);

  // show() itself still ignores the cookie — it's an explicit command.
  promo.show();
  assert.equal(promo.isVisible, true, 'show() is not gated by wasSeen()');
});

test('a throwing canShow() does not mute the popup — it opens and warns', () => {
  const env = seqEnv();
  const warnings = [];
  const origWarn = console.warn;
  console.warn = (msg) => warnings.push(String(msg));
  try {
    const video = env.window.digi2.popups.create('video', {
      popupSelector: '.p-video', animation: 'none',
      // classic integration typo: references an undeclared variable
      canShow: function () { return !undeclaredPopup.isVisible; },
    });
    video.show();
    assert.equal(video.isVisible, true, 'a broken veto degrades to "no veto"');
  } finally {
    console.warn = origWarn;
  }
  assert.ok(warnings.some((w) => w.includes('canShow') && w.includes('video')),
    'the failure is reported with the popup name');
});

test('a throwing onClose() still closes the popup and writes the cookie', () => {
  const env = seqEnv();
  const warnings = [];
  const origWarn = console.warn;
  console.warn = (msg) => warnings.push(String(msg));
  try {
    const promo = env.window.digi2.popups.create('promo', {
      popupSelector: '.p-welcome', animation: 'none', cookieName: 'promo_seen',
      onClose: function () { missingPopup.showIfPending(); },
    });
    promo.show();
    promo._closeByUser();
    assert.equal(promo.isVisible, false, 'the popup closes despite the broken callback');
    assert.match(env.document.cookie, /promo_seen=true/, 'the cookie is still written');
  } finally {
    console.warn = origWarn;
  }
  assert.ok(warnings.some((w) => w.includes('onClose') && w.includes('promo')),
    'the failure is reported with the popup name');
});

// ---------------------------------------------------------------------------
// Sequences — a chain of popups spread across a whole visit
// ---------------------------------------------------------------------------

// The sequence clock reads Date.now() deltas, so tests need to move time
// themselves. Must be installed BEFORE the module runs.
function installFakeClock(env, startAt = 1700000000000) {
  let now = startAt;
  const RealDate = Date;
  function FakeDate(...args) {
    return args.length ? new RealDate(...args) : new RealDate(now);
  }
  FakeDate.now = () => now;
  FakeDate.parse = RealDate.parse;
  FakeDate.UTC = RealDate.UTC;
  FakeDate.prototype = RealDate.prototype;
  env.context.Date = FakeDate;
  return { advance(ms) { now += ms; } };
}

// One "page" of a visit: a fresh document sharing the visit's sessionStorage.
function chainPage(store, pathname = '/') {
  const env = createEnvironment({ store, pathname });
  const clock = installFakeClock(env);
  loadPopupsModule(env);
  ['welcome', 'oferta', 'newsletter', 'kontakt']
    .forEach((n) => env.body.appendChild(createElement('div', { class: 'p-' + n })));
  return { env, clock };
}

// Create the four chain popups on this page — each with its own cookie, none
// with an auto-trigger: the sequence is what opens them.
function chainPopups(env) {
  const made = {};
  ['welcome', 'oferta', 'newsletter', 'kontakt'].forEach((n) => {
    made[n] = env.window.digi2.popups.create(n, {
      popupSelector: '.p-' + n, animation: 'none', cookieName: 'seq_' + n,
    });
  });
  return made;
}

const CHAIN = [
  { popup: 'welcome', after: 4 },
  { popup: 'oferta', after: 60, afterPageChange: true },
  { popup: 'newsletter', after: 180 },
  { popup: 'kontakt', after: 180 },
];

// Advance the visible clock one second at a time, firing each queued tick.
function runSeconds(env, clock, seconds) {
  for (let i = 0; i < seconds; i++) {
    clock.advance(1000);
    const pending = env.timers.find((t) => t.ms === 1000 && !t.fired);
    if (!pending) return;
    pending.fired = true;
    pending.fn();
  }
}

test('sequence: each step opens the configured time after the previous one closed', () => {
  const store = {};
  const page1 = chainPage(store, '/');
  const popups = chainPopups(page1.env);
  page1.env.window.digi2.popups.sequence(CHAIN);

  runSeconds(page1.env, page1.clock, 3);
  assert.equal(popups.welcome.isVisible, false, 'not yet at 3 s');
  runSeconds(page1.env, page1.clock, 2);
  assert.equal(popups.welcome.isVisible, true, 'opens 4 s after arrival');

  popups.welcome._closeByUser();

  // Step two also needs a page change, so on this page it never fires.
  runSeconds(page1.env, page1.clock, 120);
  assert.equal(popups.oferta.isVisible, false, 'waits for another page');

  // ---- the visitor navigates ----
  const page2 = chainPage(store, '/oferta');
  const p2 = chainPopups(page2.env);
  page2.env.window.digi2.popups.sequence(CHAIN);

  assert.equal(p2.oferta.isVisible, false, 'the minute has to pass on the new page too');
  runSeconds(page2.env, page2.clock, 60);
  assert.equal(p2.oferta.isVisible, true, '1 min after the welcome was closed');

  p2.oferta._closeByUser();
  runSeconds(page2.env, page2.clock, 179);
  assert.equal(p2.newsletter.isVisible, false);
  runSeconds(page2.env, page2.clock, 2);
  assert.equal(p2.newsletter.isVisible, true, '3 min after the previous close');

  p2.newsletter._closeByUser();
  runSeconds(page2.env, page2.clock, 181);
  assert.equal(p2.kontakt.isVisible, true, 'and 3 min more for the last one');

  p2.kontakt._closeByUser();
  runSeconds(page2.env, page2.clock, 600);
  assert.equal(p2.welcome.isVisible, false, 'the chain is finished — nothing else opens');
  assert.equal(p2.oferta.isVisible, false);
  assert.equal(p2.newsletter.isVisible, false);
  assert.equal(p2.kontakt.isVisible, false);
});

test('sequence: the clock pauses while the tab is in the background', () => {
  const store = {};
  const { env, clock } = chainPage(store, '/');
  const popups = chainPopups(env);
  env.window.digi2.popups.sequence(CHAIN);

  env.document.visibilityState = 'hidden';
  runSeconds(env, clock, 30);
  assert.equal(popups.welcome.isVisible, false, 'time away from the tab does not count');

  env.document.visibilityState = 'visible';
  runSeconds(env, clock, 4);
  assert.equal(popups.welcome.isVisible, true, 'and resumes where it left off');
});

test('sequence: navigating away with a popup open counts as dismissing it', () => {
  const store = {};
  const page1 = chainPage(store, '/');
  const popups = chainPopups(page1.env);
  page1.env.window.digi2.popups.sequence(CHAIN);

  runSeconds(page1.env, page1.clock, 5);
  assert.equal(popups.welcome.isVisible, true);
  // …and the visitor leaves without closing it.

  const page2 = chainPage(store, '/oferta');
  const p2 = chainPopups(page2.env);
  const seq = page2.env.window.digi2.popups.sequence(CHAIN);

  assert.equal(seq.status().popup, 'oferta', 'the chain moved on instead of waiting forever');
  runSeconds(page2.env, page2.clock, 60);
  assert.equal(p2.oferta.isVisible, true);
});

test('sequence: a step already dismissed for good is skipped, not reopened', () => {
  const store = {};
  const { env, clock } = chainPage(store, '/');
  const popups = chainPopups(env);
  popups.welcome.markSeen();              // e.g. closed during an earlier visit
  env.window.digi2.popups.sequence(CHAIN);

  runSeconds(env, clock, 5);
  assert.equal(popups.welcome.isVisible, false, 'not reopened');

  // Step two takes over, still needing its page change.
  const page2 = chainPage(store, '/oferta');
  const p2 = chainPopups(page2.env);
  page2.env.window.digi2.popups.sequence(CHAIN);
  runSeconds(page2.env, page2.clock, 60);
  assert.equal(p2.oferta.isVisible, true);
});

test('sequence: steps sharing one cookieName are reported', () => {
  const store = {};
  const { env } = chainPage(store, '/');
  ['welcome', 'oferta'].forEach((n) => {
    env.window.digi2.popups.create(n, { popupSelector: '.p-' + n, animation: 'none' });
  });

  const warnings = [];
  const origWarn = console.warn;
  console.warn = (msg) => warnings.push(String(msg));
  try {
    env.window.digi2.popups.sequence([{ popup: 'welcome', after: 1 }, { popup: 'oferta', after: 1 }]);
  } finally {
    console.warn = origWarn;
  }

  assert.ok(warnings.some((w) => w.includes('cookieName') && w.includes('oferta')),
    'the default shared cookie is called out');
});

test('sequence: listing the same popup twice is a repeat, not a cookie clash', () => {
  const store = {};
  const { env } = chainPage(store, '/');
  const warnings = [];
  const origWarn = console.warn;
  console.warn = (msg) => warnings.push(String(msg));

  env.window.digi2.popups.create('promo', {
    popupSelector: '.p-welcome', animation: 'none', cookieName: 'popup_promo_clicked',
  });

  try {
    env.window.digi2.popups.sequence([
      { popup: 'promo', after: 4 },
      { popup: 'promo', after: 60 },
    ]);
  } finally {
    console.warn = origWarn;
  }

  assert.equal(warnings.length, 0, 'one popup repeated is deliberate — no warning');
});

test('sequence: setCookieOnClose:false lets a later step reopen the same popup', () => {
  const store = {};
  const { env, clock } = chainPage(store, '/');
  // Closing normally marks the popup dismissed for the rest of the page life
  // (in memory, regardless of cookieName), and the next step would skip it as
  // "already seen". setCookieOnClose:false is what makes a repeat work.
  const promo = env.window.digi2.popups.create('promo', {
    popupSelector: '.p-welcome', animation: 'none',
    cookieName: 'popup_promo_clicked', setCookieOnClose: false,
  });
  env.window.digi2.popups.sequence([
    { popup: 'promo', after: 4 },
    { popup: 'promo', after: 60 },
  ]);

  runSeconds(env, clock, 4);
  assert.equal(promo.isVisible, true, 'first showing');
  promo._closeByUser();
  assert.equal(promo.isVisible, false);

  runSeconds(env, clock, 60);
  assert.equal(promo.isVisible, true, 'and it comes back for the second step');
});
