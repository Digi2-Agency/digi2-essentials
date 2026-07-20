const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'webflow-scripts', 'modules', 'lightbox.js');

function createElement(tagName, attrs, textContent) {
  const classes = new Set();
  const el = {
    tagName: tagName.toUpperCase(),
    attributes: Object.assign({}, attrs || {}),
    children: [],
    parentNode: null,
    parentElement: null,
    style: { display: '', overflow: '', opacity: '', setProperty(name, value) { this[name] = value; } },
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

function createEnvironment() {
  const body = createElement('body');
  const documentElement = createElement('html');
  const docListeners = {};

  const document = {
    body,
    documentElement,
    readyState: 'complete',
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

  const window = { digi2: { log() {} } };
  window.document = document;

  const env = {
    context: vm.createContext({
      window,
      document,
      navigator: { userAgent: 'node-test' },
      console,
      setTimeout(fn) { return 0; },
      clearTimeout() {},
      Date,
    }),
    window,
    document,
    body,
    dispatchDoc(type, target, props) {
      const event = Object.assign(
        { target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } },
        props || {}
      );
      (docListeners[type] || []).forEach((fn) => fn(event));
      return event;
    },
  };
  return env;
}

function loadLightboxModule(env) {
  const code = fs.readFileSync(modulePath, 'utf8');
  vm.runInContext(code, env.context, { filename: modulePath });
}

function lb(env) { return env.window.digi2.lightbox; }
function builtin(env) { return env.body.querySelector('[d2-lightbox-default]'); }

// Gallery srcs copied into a host-realm array — vm-realm arrays fail
// deepStrictEqual on the prototype even when the contents match.
function srcs(env) {
  return Array.from(lb(env)._state.items).map((it) => it.src);
}

// A trigger img with a src, appended into `parent` (defaults to body).
function addThumb(env, src, extraAttrs, parent) {
  const attrs = Object.assign({ 'd2-lightbox': '', src }, extraAttrs || {});
  const img = createElement('img', attrs);
  (parent || env.body).appendChild(img);
  return img;
}

test('clicking a trigger injects and opens the built-in modal with the image', () => {
  const env = createEnvironment();
  loadLightboxModule(env);
  const thumb = addThumb(env, 'https://cdn.example.com/a.jpg', { alt: 'Taras' });

  env.dispatchDoc('click', thumb);

  const modal = builtin(env);
  assert.ok(modal, 'built-in modal should be injected');
  assert.equal(modal.style.display, 'flex');
  assert.equal(modal.querySelector('[d2-lightbox-image]').getAttribute('src'), 'https://cdn.example.com/a.jpg');
  assert.equal(env.body.style.overflow, 'hidden');
  assert.equal(lb(env).isOpen(), true);
  // caption falls back to the img alt
  assert.equal(modal.querySelector('[d2-lightbox-caption]').textContent, 'Taras');
});

test('custom [d2-lightbox-modal] is hidden on load and preferred over the built-in', () => {
  const env = createEnvironment();
  const modal = createElement('div', { 'd2-lightbox-modal': '' });
  const slot = createElement('img', { 'd2-lightbox-image': '' });
  modal.appendChild(slot);
  env.body.appendChild(modal);
  loadLightboxModule(env);

  assert.equal(modal.style.display, 'none', 'module hides the Designer-built modal on load');

  const thumb = addThumb(env, 'https://cdn.example.com/b.jpg');
  env.dispatchDoc('click', thumb);

  assert.equal(modal.style.display, 'flex');
  assert.equal(slot.getAttribute('src'), 'https://cdn.example.com/b.jpg');
  assert.equal(builtin(env), null, 'no built-in modal is injected when a custom one exists');
});

test('modal attribute value sets the open display', () => {
  const env = createEnvironment();
  const modal = createElement('div', { 'd2-lightbox-modal': 'grid' });
  modal.appendChild(createElement('img', { 'd2-lightbox-image': '' }));
  env.body.appendChild(modal);
  loadLightboxModule(env);

  env.dispatchDoc('click', addThumb(env, 'https://x/1.jpg'));
  assert.equal(modal.style.display, 'grid');
});

test('triggers inside a d2-cms-item form their own gallery', () => {
  const env = createEnvironment();
  loadLightboxModule(env);

  const itemA = createElement('div', { 'd2-cms-item': '' });
  const itemB = createElement('div', { 'd2-cms-item': '' });
  env.body.appendChild(itemA);
  env.body.appendChild(itemB);
  const a1 = addThumb(env, 'https://x/a1.jpg', null, itemA);
  addThumb(env, 'https://x/a2.jpg', null, itemA);
  addThumb(env, 'https://x/b1.jpg', null, itemB);

  env.dispatchDoc('click', a1);

  assert.deepEqual(srcs(env), ['https://x/a1.jpg', 'https://x/a2.jpg']);
  assert.equal(builtin(env).querySelector('[d2-lightbox-counter]').textContent, '1 / 2');

  lb(env).next();
  assert.equal(builtin(env).querySelector('[d2-lightbox-image]').getAttribute('src'), 'https://x/a2.jpg');
});

test('named galleries collect triggers across containers', () => {
  const env = createEnvironment();
  loadLightboxModule(env);

  const itemA = createElement('div', { 'd2-cms-item': '' });
  const itemB = createElement('div', { 'd2-cms-item': '' });
  env.body.appendChild(itemA);
  env.body.appendChild(itemB);
  const g1 = addThumb(env, 'https://x/g1.jpg', { 'd2-lightbox': 'gal' }, itemA);
  addThumb(env, 'https://x/g2.jpg', { 'd2-lightbox': 'gal' }, itemB);
  addThumb(env, 'https://x/other.jpg', null, itemA);

  env.dispatchDoc('click', g1);
  assert.deepEqual(srcs(env), ['https://x/g1.jpg', 'https://x/g2.jpg']);
});

test('d2-lightbox-group scopes bare triggers', () => {
  const env = createEnvironment();
  loadLightboxModule(env);

  const group = createElement('div', { 'd2-lightbox-group': '' });
  env.body.appendChild(group);
  const inGroup = addThumb(env, 'https://x/in1.jpg', null, group);
  addThumb(env, 'https://x/in2.jpg', null, group);
  addThumb(env, 'https://x/outside.jpg');

  env.dispatchDoc('click', inGroup);
  assert.deepEqual(srcs(env), ['https://x/in1.jpg', 'https://x/in2.jpg']);
});

test('full-size source: d2-lightbox-src wins, then img[d2-lightbox-full] twin, then the img itself', () => {
  const env = createEnvironment();
  loadLightboxModule(env);

  const group = createElement('div', { 'd2-lightbox-group': '' });
  env.body.appendChild(group);

  const explicit = addThumb(env, 'https://x/thumb1.jpg', { 'd2-lightbox-src': 'https://x/full1.jpg' }, group);

  const wrapper = createElement('div', { 'd2-lightbox': '' });
  wrapper.appendChild(createElement('img', { src: 'https://x/thumb2.jpg' }));
  wrapper.appendChild(createElement('img', { src: 'https://x/full2.jpg', 'd2-lightbox-full': '' }));
  group.appendChild(wrapper);

  addThumb(env, 'https://x/plain3.jpg', null, group);

  env.dispatchDoc('click', explicit);
  assert.deepEqual(srcs(env), [
    'https://x/full1.jpg',
    'https://x/full2.jpg',
    'https://x/plain3.jpg',
  ]);
});

test('close slot click and Escape both close and restore body scroll', () => {
  const env = createEnvironment();
  loadLightboxModule(env);
  env.body.style.overflow = 'scroll';

  const thumb = addThumb(env, 'https://x/1.jpg');
  env.dispatchDoc('click', thumb);
  assert.equal(env.body.style.overflow, 'hidden');

  env.dispatchDoc('click', builtin(env).querySelector('[d2-lightbox-close]'));
  assert.equal(lb(env).isOpen(), false);
  assert.equal(builtin(env).style.display, 'none');
  assert.equal(env.body.style.overflow, 'scroll');

  env.dispatchDoc('click', thumb);
  assert.equal(lb(env).isOpen(), true);
  env.dispatchDoc('keydown', env.body, { key: 'Escape' });
  assert.equal(lb(env).isOpen(), false);
});

test('clicking the modal root (backdrop) closes, clicking the image does not', () => {
  const env = createEnvironment();
  loadLightboxModule(env);
  env.dispatchDoc('click', addThumb(env, 'https://x/1.jpg'));

  const modal = builtin(env);
  env.dispatchDoc('click', modal.querySelector('[d2-lightbox-image]'));
  assert.equal(lb(env).isOpen(), true, 'click on the image keeps the lightbox open');

  env.dispatchDoc('click', modal);
  assert.equal(lb(env).isOpen(), false, 'click on the backdrop closes');
});

test('arrow keys navigate and the gallery wraps around by default', () => {
  const env = createEnvironment();
  loadLightboxModule(env);
  const group = createElement('div', { 'd2-lightbox-group': '' });
  env.body.appendChild(group);
  addThumb(env, 'https://x/1.jpg', null, group);
  const second = addThumb(env, 'https://x/2.jpg', null, group);

  env.dispatchDoc('click', second);
  assert.equal(lb(env)._state.index, 1);

  env.dispatchDoc('keydown', env.body, { key: 'ArrowRight' });
  assert.equal(lb(env)._state.index, 0, 'wraps from last to first');
  env.dispatchDoc('keydown', env.body, { key: 'ArrowLeft' });
  assert.equal(lb(env)._state.index, 1, 'wraps from first to last');
});

test('d2-lightbox-loop="false" stops at the ends', () => {
  const env = createEnvironment();
  const modal = createElement('div', { 'd2-lightbox-modal': '', 'd2-lightbox-loop': 'false' });
  modal.appendChild(createElement('img', { 'd2-lightbox-image': '' }));
  env.body.appendChild(modal);
  loadLightboxModule(env);

  const group = createElement('div', { 'd2-lightbox-group': '' });
  env.body.appendChild(group);
  addThumb(env, 'https://x/1.jpg', null, group);
  const last = addThumb(env, 'https://x/2.jpg', null, group);

  env.dispatchDoc('click', last);
  lb(env).next();
  assert.equal(lb(env)._state.index, 1, 'stays on the last image');
  lb(env).prev();
  lb(env).prev();
  assert.equal(lb(env)._state.index, 0, 'stays on the first image');
});

test('single-image gallery hides prev/next; counter template is honoured', () => {
  const env = createEnvironment();
  const modal = createElement('div', { 'd2-lightbox-modal': '' });
  modal.appendChild(createElement('img', { 'd2-lightbox-image': '' }));
  const prevBtn = createElement('div', { 'd2-lightbox-prev': '' });
  const nextBtn = createElement('div', { 'd2-lightbox-next': '' });
  const counter = createElement('div', { 'd2-lightbox-counter': '{current} z {total}' });
  modal.appendChild(prevBtn);
  modal.appendChild(nextBtn);
  modal.appendChild(counter);
  env.body.appendChild(modal);
  loadLightboxModule(env);

  env.dispatchDoc('click', addThumb(env, 'https://x/solo.jpg'));
  assert.equal(prevBtn.style.display, 'none');
  assert.equal(nextBtn.style.display, 'none');
  assert.equal(counter.textContent, '1 z 1');

  lb(env).close();
  const group = createElement('div', { 'd2-lightbox-group': '' });
  env.body.appendChild(group);
  const one = addThumb(env, 'https://x/m1.jpg', null, group);
  addThumb(env, 'https://x/m2.jpg', null, group);
  env.dispatchDoc('click', one);
  assert.equal(prevBtn.style.display, '');
  assert.equal(nextBtn.style.display, '');
  assert.equal(counter.textContent, '1 z 2');
});

test('duplicate URLs are deduped and slider clones are skipped', () => {
  const env = createEnvironment();
  loadLightboxModule(env);
  const group = createElement('div', { 'd2-lightbox-group': '' });
  env.body.appendChild(group);
  const first = addThumb(env, 'https://x/1.jpg', null, group);
  addThumb(env, 'https://x/1.jpg', null, group); // duplicate URL
  const clone = createElement('div', { 'd2-slide-clone': '' });
  group.appendChild(clone);
  addThumb(env, 'https://x/2.jpg', null, clone); // infinite-slider clone

  env.dispatchDoc('click', first);
  assert.deepEqual(srcs(env), ['https://x/1.jpg']);
});

test('empty caption hides the caption slot', () => {
  const env = createEnvironment();
  loadLightboxModule(env);
  env.dispatchDoc('click', addThumb(env, 'https://x/nocap.jpg'));
  const cap = builtin(env).querySelector('[d2-lightbox-caption]');
  assert.equal(cap.style.display, 'none');
  assert.equal(cap.textContent, '');
});

test('open by gallery name via the JS API', () => {
  const env = createEnvironment();
  loadLightboxModule(env);
  addThumb(env, 'https://x/n1.jpg', { 'd2-lightbox': 'rzuty' });
  addThumb(env, 'https://x/n2.jpg', { 'd2-lightbox': 'rzuty' });
  addThumb(env, 'https://x/other.jpg');

  lb(env).open('rzuty', 1);
  assert.equal(lb(env).isOpen(), true);
  assert.deepEqual(srcs(env), ['https://x/n1.jpg', 'https://x/n2.jpg']);
  assert.equal(lb(env)._state.index, 1);
});

test('swipe left/right on the modal navigates', () => {
  const env = createEnvironment();
  loadLightboxModule(env);
  const group = createElement('div', { 'd2-lightbox-group': '' });
  env.body.appendChild(group);
  const first = addThumb(env, 'https://x/s1.jpg', null, group);
  addThumb(env, 'https://x/s2.jpg', null, group);

  env.dispatchDoc('click', first);
  const modal = builtin(env);
  modal._listeners.touchstart({ changedTouches: [{ screenX: 300, screenY: 100 }] });
  modal._listeners.touchend({ changedTouches: [{ screenX: 180, screenY: 105 }] });
  assert.equal(lb(env)._state.index, 1, 'swipe left goes to the next image');

  modal._listeners.touchstart({ changedTouches: [{ screenX: 180, screenY: 100 }] });
  modal._listeners.touchend({ changedTouches: [{ screenX: 320, screenY: 95 }] });
  assert.equal(lb(env)._state.index, 0, 'swipe right goes back');
});

test('standalone URL triggers: d2-lightbox-src and d2-lightbox-image open that URL', () => {
  const env = createEnvironment();
  loadLightboxModule(env);

  const group = createElement('div', { 'd2-lightbox-group': '' });
  env.body.appendChild(group);
  const bySrc = createElement('div', { 'd2-lightbox-src': 'https://x/url1.jpg' });
  const byImage = createElement('div', { 'd2-lightbox-image': 'https://x/url2.jpg' });
  group.appendChild(bySrc);
  group.appendChild(byImage);

  env.dispatchDoc('click', bySrc);
  assert.equal(lb(env).isOpen(), true);
  assert.deepEqual(srcs(env), ['https://x/url1.jpg', 'https://x/url2.jpg']);
  assert.equal(builtin(env).querySelector('[d2-lightbox-image]').getAttribute('src'), 'https://x/url1.jpg');

  lb(env).close();
  env.dispatchDoc('click', byImage);
  assert.equal(builtin(env).querySelector('[d2-lightbox-image]').getAttribute('src'), 'https://x/url2.jpg');
});

test('d2-lightbox-image slot inside a modal is never treated as a trigger', () => {
  const env = createEnvironment();
  const modal = createElement('div', { 'd2-lightbox-modal': '' });
  const slot = createElement('img', { 'd2-lightbox-image': '' });
  modal.appendChild(slot);
  env.body.appendChild(modal);
  loadLightboxModule(env);

  env.dispatchDoc('click', slot);
  assert.equal(lb(env).isOpen(), false);
});

test('d2-lightbox-item is a trigger alias — an img opens its own src', () => {
  const env = createEnvironment();
  loadLightboxModule(env);

  const item = createElement('div', { 'd2-cms-item': '' });
  env.body.appendChild(item);
  const a = createElement('img', { 'd2-lightbox-item': '', src: 'https://x/i1.jpg' });
  const b = createElement('img', { 'd2-lightbox-item': '', src: 'https://x/i2.jpg' });
  item.appendChild(a);
  item.appendChild(b);

  env.dispatchDoc('click', a);
  assert.equal(lb(env).isOpen(), true);
  assert.deepEqual(srcs(env), ['https://x/i1.jpg', 'https://x/i2.jpg']);
});

test('d2-lightbox-item shares named galleries with d2-lightbox', () => {
  const env = createEnvironment();
  loadLightboxModule(env);
  const a = createElement('img', { 'd2-lightbox': 'mix', src: 'https://x/m1.jpg' });
  const b = createElement('img', { 'd2-lightbox-item': 'mix', src: 'https://x/m2.jpg' });
  env.body.appendChild(a);
  env.body.appendChild(b);

  env.dispatchDoc('click', b);
  assert.deepEqual(srcs(env), ['https://x/m1.jpg', 'https://x/m2.jpg']);
  assert.equal(lb(env)._state.index, 1);
});

test('mouse drag past the threshold navigates; the image follows the drag', () => {
  const env = createEnvironment();
  loadLightboxModule(env);
  const group = createElement('div', { 'd2-lightbox-group': '' });
  env.body.appendChild(group);
  const first = addThumb(env, 'https://x/d1.jpg', null, group);
  addThumb(env, 'https://x/d2.jpg', null, group);

  env.dispatchDoc('click', first);
  const modal = builtin(env);
  const img = modal.querySelector('[d2-lightbox-image]');

  modal._listeners.mousedown({ screenX: 300, screenY: 100, button: 0 });
  env.dispatchDoc('mousemove', env.body, { screenX: 200, screenY: 100 });
  assert.equal(img.style.transform, 'translateX(-100px)', 'image follows the drag');
  env.dispatchDoc('mouseup', env.body, { screenX: 180, screenY: 100 });

  assert.equal(lb(env)._state.index, 1, 'drag left goes to the next image');
  assert.equal(img.style.transform, '', 'transform is reset after the drag');

  // The click spawned by that drag is suppressed — the modal must stay open…
  env.dispatchDoc('click', modal);
  assert.equal(lb(env).isOpen(), true, 'drag-generated click does not close');
  // …but a genuine backdrop click afterwards closes as usual.
  env.dispatchDoc('click', modal);
  assert.equal(lb(env).isOpen(), false);
});

test('small mouse drag snaps back without navigating', () => {
  const env = createEnvironment();
  loadLightboxModule(env);
  const group = createElement('div', { 'd2-lightbox-group': '' });
  env.body.appendChild(group);
  const first = addThumb(env, 'https://x/s1.jpg', null, group);
  addThumb(env, 'https://x/s2.jpg', null, group);

  env.dispatchDoc('click', first);
  const modal = builtin(env);

  modal._listeners.mousedown({ screenX: 300, screenY: 100, button: 0 });
  env.dispatchDoc('mousemove', env.body, { screenX: 280, screenY: 100 });
  env.dispatchDoc('mouseup', env.body, { screenX: 280, screenY: 100 });

  assert.equal(lb(env)._state.index, 0, 'below-threshold drag stays put');
  assert.equal(lb(env).isOpen(), true);
});
