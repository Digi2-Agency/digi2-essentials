const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'webflow-scripts', 'modules', 'country-picker.js');

function createElement(tagName, attrs) {
  const classes = new Set();
  const el = {
    tagName: tagName.toUpperCase(),
    attributes: Object.assign({}, attrs || {}),
    children: [],
    parentNode: null,
    parentElement: null,
    style: {},
    value: '',
    textContent: '',
    offsetWidth: 64,
    _listeners: {},
    className: (attrs && attrs.class) || '',
    get firstChild() { return this.children[0] || null; },
    get nextSibling() {
      const parent = this.parentElement;
      if (!parent) return null;
      return parent.children[parent.children.indexOf(this) + 1] || null;
    },
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
    addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); },
    removeEventListener(type, fn) {
      if (this._listeners[type]) this._listeners[type] = this._listeners[type].filter((h) => h !== fn);
    },
    fire(type, event) {
      (this._listeners[type] || []).slice().forEach((fn) => fn(Object.assign({
        target: this, preventDefault() {},
      }, event || {})));
    },
    appendChild(child) {
      child.parentNode = this;
      child.parentElement = this;
      this.children.push(child);
      return child;
    },
    insertBefore(child, ref) {
      child.parentNode = this;
      child.parentElement = this;
      const at = this.children.indexOf(ref);
      if (at === -1) this.children.push(child);
      else this.children.splice(at, 0, child);
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter((c) => c !== child);
      child.parentNode = null;
      return child;
    },
    contains(other) {
      if (other === this) return true;
      return this.children.some((c) => c.contains && c.contains(other));
    },
    closest(selector) {
      let node = this;
      while (node) {
        if (matches(node, selector)) return node;
        node = node.parentElement;
      }
      return null;
    },
    get innerHTML() { return ''; },
    set innerHTML(_) { this.children = []; },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
    querySelectorAll(selector) {
      const out = [];
      const walk = (node) => node.children.forEach((c) => { if (matches(c, selector)) out.push(c); walk(c); });
      walk(this);
      return out;
    },
    focus() { this.focused = true; },
    scrollIntoView() {},
  };
  return el;
}

function matches(node, selector) {
  if (!node || !selector) return false;
  if (selector.includes(',')) return selector.split(',').some((s) => matches(node, s.trim()));
  let sel = selector.trim();

  const notMatch = sel.match(/^(.+):not\((.+)\)$/);
  if (notMatch) return matches(node, notMatch[1]) && !matches(node, notMatch[2]);

  if (sel.startsWith('.')) return node.className.split(/\s+/).includes(sel.slice(1));

  const attrMatch = sel.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
  if (attrMatch) {
    if (!node.hasAttribute(attrMatch[1])) return false;
    return attrMatch[2] === undefined || node.getAttribute(attrMatch[1]) === attrMatch[2];
  }
  return false;
}

function createEnvironment() {
  const body = createElement('body');
  const head = createElement('head');
  const docListeners = {};

  const document = {
    body,
    head,
    readyState: 'complete',
    addEventListener(type, fn) { (docListeners[type] = docListeners[type] || []).push(fn); },
    removeEventListener(type, fn) {
      if (docListeners[type]) docListeners[type] = docListeners[type].filter((h) => h !== fn);
    },
    createElement,
    querySelector(selector) { return body.querySelector(selector); },
    querySelectorAll(selector) { return body.querySelectorAll(selector); },
  };

  const events = [];
  const window = { digi2: { log() {}, emit(name, data) { events.push({ name, data }); } } };

  const env = {
    body, head, events, window, document,
    fireDoc(type, event) { (docListeners[type] || []).slice().forEach((fn) => fn(event)); },
    context: vm.createContext({
      window, document, console,
      setTimeout(fn) { if (typeof fn === 'function') fn(); return 0; },
      clearTimeout() {},
      requestAnimationFrame(fn) { fn(); return 1; },
      MutationObserver: undefined,
    }),
  };
  return env;
}

function load(env) {
  vm.runInContext(fs.readFileSync(modulePath, 'utf8'), env.context, { filename: modulePath });
}

// A phone field inside a form, already in the body.
function addField(env, attrs) {
  const form = createElement('form');
  const input = createElement('input', Object.assign({ type: 'tel', name: 'PHONE' }, attrs || {}));
  form.appendChild(input);
  env.body.appendChild(form);
  input.form = form;
  return { form, input };
}

function cp(env) { return env.window.digi2.countryPicker; }

test('the country list is parsed with dialing codes and Polish names', () => {
  const env = createEnvironment();
  load(env);

  const all = cp(env).countries();
  assert.ok(all.length > 200, 'a full list, not a handful');
  const pl = all.find((c) => c.iso === 'PL');   // field by field: vm-realm objects fail deepEqual
  assert.equal(pl.dial, '48');
  assert.equal(pl.name, 'Polska');
  assert.equal(all.find((c) => c.iso === 'DE').name, 'Niemcy');
});

test('a field with d2-country-picker gets a picker on Polish by default', () => {
  const env = createEnvironment();
  const { input } = addField(env, { 'd2-country-picker': '' });
  load(env);

  const picker = cp(env).get(input);
  assert.ok(picker, 'auto-initialised');
  assert.equal(picker.getCountry().iso, 'PL');
  assert.equal(picker.dialEl.textContent, '+48');
  assert.equal(picker.flagEl.textContent, '🇵🇱');
  assert.equal(input.getAttribute('d2-country-picker-ready'), '');
});

test('the attribute value picks the starting country', () => {
  const env = createEnvironment();
  const { input } = addField(env, { 'd2-country-picker': 'DE' });
  load(env);
  assert.equal(cp(env).get(input).getCountry().iso, 'DE');
});

test('blur prefixes the typed number and drops the trunk zero', () => {
  const env = createEnvironment();
  const { input } = addField(env, { 'd2-country-picker': '' });
  load(env);

  input.value = '0601234567';
  input.fire('blur');
  assert.equal(input.value, '+48 601234567');
});

test('an empty field stays empty — a prefix would fake a filled-in answer', () => {
  const env = createEnvironment();
  const { input } = addField(env, { 'd2-country-picker': '' });
  load(env);

  input.fire('blur');
  assert.equal(input.value, '');
});

test('submit normalises the number before validation runs', () => {
  const env = createEnvironment();
  const { form, input } = addField(env, { 'd2-country-picker': '' });
  load(env);

  input.value = '601 234 567';
  form.fire('submit');
  assert.equal(input.value, '+48 601 234 567');
});

test('a number that already carries a code is left alone', () => {
  const env = createEnvironment();
  const { input } = addField(env, { 'd2-country-picker': '' });
  load(env);

  input.value = '+49 170 1234567';
  input.fire('blur');
  assert.equal(input.value, '+49 170 1234567');
});

test('typing a foreign code moves the flag to that country', () => {
  const env = createEnvironment();
  const { input } = addField(env, { 'd2-country-picker': '' });
  load(env);

  input.value = '+380 67 123 45 67';
  input.fire('input');

  const picker = cp(env).get(input);
  assert.equal(picker.getCountry().iso, 'UA');
  assert.equal(picker.dialEl.textContent, '+380');
});

test('switching country rewrites the prefix of an already typed number', () => {
  const env = createEnvironment();
  const { input } = addField(env, { 'd2-country-picker': '' });
  load(env);

  input.value = '+48 601234567';
  cp(env).get(input).setCountry('DE');
  assert.equal(input.value, '+49 601234567');
});

test('the picked country is announced on the bus', () => {
  const env = createEnvironment();
  const { input } = addField(env, { 'd2-country-picker': '' });
  load(env);

  cp(env).get(input).setCountry('CZ');
  const change = env.events.filter((e) => e.name === 'country-picker:change').pop();
  assert.equal(change.data.iso, 'CZ');
  assert.equal(change.data.dial, '420');
  assert.equal(change.data.input, input);
});

test('d2-country-picker-only limits the list, -preferred pins to the top', () => {
  const env = createEnvironment();
  const { input } = addField(env, {
    'd2-country-picker': 'PL',
    'd2-country-picker-only': 'PL|DE|CZ',
    'd2-country-picker-preferred': 'CZ',
  });
  load(env);

  const picker = cp(env).get(input);
  // CZ pinned first, the rest keeps the list's Polish alphabetical order
  // Array.from: the list comes from the vm realm and would fail on the prototype
  assert.deepEqual(Array.from(picker.list.map((c) => c.iso)), ['CZ', 'DE', 'PL']);
});

test('the toggle is type=button so it never submits the form', () => {
  const env = createEnvironment();
  const { input } = addField(env, { 'd2-country-picker': '' });
  load(env);
  // set as a property — in a real DOM that reflects to the attribute
  assert.equal(cp(env).get(input).toggle.type, 'button');
});

test('search matches Polish names without diacritics, and dialing codes', () => {
  const env = createEnvironment();
  const { input } = addField(env, { 'd2-country-picker': '' });
  load(env);

  const picker = cp(env).get(input);
  picker._renderOptions('wegry');
  let shown = picker.optionsBox.children.map((o) => o.getAttribute('d2-cp-iso'));
  assert.deepEqual(shown, ['HU'], 'diacritics-insensitive');

  picker._renderOptions('+420');
  shown = picker.optionsBox.children.map((o) => o.getAttribute('d2-cp-iso'));
  assert.deepEqual(shown, ['CZ'], 'by dialing code');
});

test('destroy() puts the field back the way it was', () => {
  const env = createEnvironment();
  const { form, input } = addField(env, { 'd2-country-picker': '' });
  load(env);

  cp(env).destroy(input);
  assert.equal(cp(env).get(input), null);
  assert.equal(input.parentElement, form, 'no wrapper left around it');
  assert.equal(input.hasAttribute('d2-country-picker-ready'), false);
  assert.equal(input.style.paddingLeft, '');
});

test('shared dialing codes resolve to the country people mean', () => {
  const env = createEnvironment();
  const { input } = addField(env, { 'd2-country-picker': '' });
  load(env);
  const picker = cp(env).get(input);

  const detect = (value) => {
    input.value = value;
    input.fire('input');
    return picker.getCountry().iso;
  };

  assert.equal(detect('+44 7700 900123'), 'GB', 'not Guernsey');
  assert.equal(detect('+1 202 555 0142'), 'US', 'not Anguilla');
  assert.equal(detect('+7 495 1234567'), 'RU', 'not Kazakhstan');
  assert.equal(detect('+39 06 1234567'), 'IT', 'not the Vatican');
  assert.equal(detect('+48 601234567'), 'PL', 'unshared codes are unaffected');
});

test('separate mode keeps the field digits-only and fills hidden inputs', () => {
  const env = createEnvironment();
  const { form, input } = addField(env, {
    'd2-country-picker': 'PL',
    'd2-country-picker-mode': 'separate',
  });
  load(env);

  const dial = form.querySelector('[name="PHONE_DIAL"]');
  const country = form.querySelector('[name="PHONE_COUNTRY"]');
  assert.ok(dial && country, 'both hidden fields exist');
  assert.equal(dial.attributes.type, 'hidden');

  input.value = '601234567';
  form.fire('submit');
  assert.equal(input.value, '601234567', 'the number itself is left alone');
  assert.equal(dial.value, '+48');
  assert.equal(country.value, 'PL');

  cp(env).get(input).setCountry('UA');
  assert.equal(dial.value, '+380');
  assert.equal(country.value, 'UA');
  assert.equal(input.value, '601234567', 'switching country never touches the number');
});

test('separate mode moves a pasted international code out of the field', () => {
  const env = createEnvironment();
  const { form, input } = addField(env, { 'd2-country-picker-mode': 'separate' });
  load(env);

  input.value = '+49 170 1234567';
  input.fire('blur');

  assert.equal(input.value, '1701234567', 'digits only — a pattern="\\d+" field still submits');
  assert.equal(form.querySelector('[name="PHONE_DIAL"]').value, '+49');
  assert.equal(cp(env).get(input).getCountry().iso, 'DE');
});

test('separate mode reuses hidden fields the author built in the Designer', () => {
  const env = createEnvironment();
  const { form, input } = addField(env, {
    'd2-country-picker-mode': 'separate',
    'd2-country-picker-dial-field': 'KIERUNKOWY',
  });
  const own = createElement('input', { type: 'hidden', name: 'KIERUNKOWY' });
  form.appendChild(own);
  load(env);

  assert.equal(form.querySelectorAll('[name="KIERUNKOWY"]').length, 1, 'no duplicate field');
  assert.equal(own.value, '+48', 'the author\'s own field gets the value');
});

test('destroy() removes only the hidden fields the module created', () => {
  const env = createEnvironment();
  const { form, input } = addField(env, { 'd2-country-picker-mode': 'separate' });
  load(env);
  assert.ok(form.querySelector('[name="PHONE_DIAL"]'));

  cp(env).destroy(input);
  assert.equal(form.querySelector('[name="PHONE_DIAL"]'), null);
});

test('the default mode still writes the prefix into the number', () => {
  const env = createEnvironment();
  const { form, input } = addField(env, { 'd2-country-picker': '' });
  load(env);

  input.value = '601234567';
  input.fire('blur');
  assert.equal(input.value, '+48 601234567');
  assert.equal(form.querySelector('[name="PHONE_DIAL"]'), null, 'no hidden fields unless asked');
});

test('layout="split" puts the flag beside the field, not inside it', () => {
  const env = createEnvironment();
  const { input } = addField(env, { 'd2-country-picker-layout': 'split' });
  load(env);

  const picker = cp(env).get(input);
  assert.equal(picker.wrap.className, 'd2-cp d2-cp-split');
  assert.equal(picker.wrap.getAttribute('d2-cp-layout'), 'split');
  assert.equal(input.style.paddingLeft, '', 'the field keeps its own padding');
  assert.equal(picker.getCountry().iso, 'PL', 'the attribute alone switches the picker on');
});

test('the default layout still reserves room inside the field', () => {
  const env = createEnvironment();
  const { input } = addField(env, { 'd2-country-picker': '' });
  load(env);

  const picker = cp(env).get(input);
  assert.equal(picker.wrap.getAttribute('d2-cp-layout'), 'inside');
  assert.equal(input.style.paddingLeft, '68px', 'toggle width (64) + 4');
});

test('split layout puts the button before the field in the DOM', () => {
  const env = createEnvironment();
  const { input } = addField(env, { 'd2-country-picker-layout': 'split' });
  load(env);

  const picker = cp(env).get(input);
  const order = picker.wrap.children;
  assert.equal(order[0], picker.toggle, 'flag first');
  assert.equal(order[1], input, 'then the number');
});

// The author's own toggle, built in the Designer and placed next to the field.
function addCustomToggle(env, form, attrs, children) {
  const el = createElement('div', Object.assign({ 'd2-country-picker-toggle': 'PHONE' }, attrs || {}));
  (children || []).forEach((c) => el.appendChild(c));
  form.insertBefore(el, form.children[0]);
  return el;
}

test('an element with d2-country-picker-toggle becomes the picker, untouched', () => {
  const env = createEnvironment();
  const { form, input } = addField(env, { 'd2-country-picker': 'PL' });
  const own = addCustomToggle(env, form);
  load(env);

  const picker = cp(env).get(input);
  assert.equal(picker.wrap, own, 'the author element is the picker');
  assert.equal(picker.toggle, own);
  assert.equal(input.parentElement, form, 'the field is never wrapped or moved');
  assert.equal(input.style.paddingLeft, '', 'and never padded');
  assert.equal(own.getAttribute('d2-cp-layout'), 'custom');
  assert.equal(own.getAttribute('role'), 'button', 'a div still answers as a button');
  assert.equal(own.getAttribute('tabindex'), '0');
});

test('the flag and dialing code go into the author slots', () => {
  const env = createEnvironment();
  const { form, input } = addField(env, { 'd2-country-picker': 'DE' });
  const flag = createElement('span', { 'd2-country-picker-flag': '' });
  const dial = createElement('span', { 'd2-country-picker-dial': '' });
  const caret = createElement('svg', { class: 'moja-strzalka' });
  addCustomToggle(env, form, null, [flag, dial, caret]);
  load(env);

  assert.equal(flag.textContent, '🇩🇪');
  assert.equal(dial.textContent, '+49');
  const picker = cp(env).get(input);
  assert.equal(picker.wrap.children.length, 4, 'their caret survives, list appended');
  assert.equal(picker.wrap.children[2], caret);
});

test('without slots the module prepends its own, keeping the author markup', () => {
  const env = createEnvironment();
  const { form } = addField(env, { 'd2-country-picker': 'PL' });
  const caret = createElement('div', { class: 'moja-strzalka' });
  const own = addCustomToggle(env, form, null, [caret]);
  load(env);

  assert.equal(own.children[0].className, 'd2-cp-flag');
  assert.equal(own.children[1].className, 'd2-cp-dial');
  assert.equal(own.children[2], caret, 'the caret stays where it was, after them');
});

test('clicking the author element opens the list inside it', () => {
  const env = createEnvironment();
  const { form, input } = addField(env, { 'd2-country-picker': 'PL' });
  const own = addCustomToggle(env, form);
  load(env);

  own.fire('click');
  assert.equal(own.hasAttribute('d2-cp-open'), true);
  assert.equal(own.getAttribute('aria-expanded'), 'true');
  assert.ok(own.querySelector('[role="listbox"]'), 'the list hangs off the author element');

  own.querySelector('[d2-cp-iso="CZ"]').fire('click');
  assert.equal(cp(env).get(input).getCountry().iso, 'CZ');
  assert.equal(own.hasAttribute('d2-cp-open'), false);
});

test('two fields each take their own toggle, matched by name', () => {
  const env = createEnvironment();
  const { form, input } = addField(env, { 'd2-country-picker': 'PL' });
  const second = createElement('input', { type: 'tel', name: 'PHONE2', 'd2-country-picker': 'DE' });
  form.appendChild(second);
  second.form = form;

  const first = addCustomToggle(env, form, { 'd2-country-picker-toggle': 'PHONE' });
  const other = addCustomToggle(env, form, { 'd2-country-picker-toggle': 'PHONE2' });
  load(env);

  assert.equal(cp(env).get(input).toggle, first);
  assert.equal(cp(env).get(second).toggle, other);
});

test('two forms repeating the field name each pair with their own toggle', () => {
  const env = createEnvironment();

  // Section form and popup form — both call the field PHONE, both have a box.
  const build = (country) => {
    const form = createElement('form');
    const toggle = createElement('div', { 'd2-country-picker-toggle': 'PHONE' });
    const input = createElement('input', { type: 'tel', name: 'PHONE', 'd2-country-picker': country });
    form.appendChild(toggle);
    form.appendChild(input);
    env.body.appendChild(form);
    input.form = form;
    return { toggle, input };
  };
  const sekcja = build('PL');
  const popup = build('DE');

  load(env);

  assert.equal(cp(env).get(sekcja.input).toggle, sekcja.toggle, 'section field → section box');
  assert.equal(cp(env).get(popup.input).toggle, popup.toggle, 'popup field → popup box');
});

test('the loader tag carrying the flag is not mistaken for a field', () => {
  const env = createEnvironment();
  const loader = createElement('script', { src: '…/digi2-loader.min.js', 'd2-country-picker': '' });
  env.body.appendChild(loader);
  const { input } = addField(env, { 'd2-country-picker': 'PL' });

  const warnings = [];
  const realWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  try { load(env); } finally { console.warn = realWarn; }

  assert.equal(warnings.length, 0, 'no console noise about the <script>');
  assert.ok(cp(env).get(input), 'the real field still gets its picker');
  assert.equal(loader.hasAttribute('d2-country-picker-ready'), false);
});

test('the field re-pads when the button changes width', () => {
  const env = createEnvironment();
  let observed = null;
  env.context.ResizeObserver = function (cb) {
    this.observe = (el) => { observed = { el, cb }; };
    this.disconnect = () => { observed = null; };
  };
  const { input } = addField(env, { 'd2-country-picker': 'PL' });
  load(env);

  const picker = cp(env).get(input);
  assert.equal(input.style.paddingLeft, '68px', 'measured once on init');
  assert.equal(observed.el, picker.toggle, 'and the button is watched');

  picker.toggle.offsetWidth = 120;      // site CSS made it wider
  observed.cb();
  assert.equal(input.style.paddingLeft, '124px', 'the field follows');

  picker.destroy();
  assert.equal(observed, null, 'and stops watching when destroyed');
});

test('a toggle the author positioned keeps its own position', () => {
  const env = createEnvironment();
  env.context.getComputedStyle = () => ({ position: 'absolute', display: 'block' });

  const { form, input } = addField(env, { 'd2-country-picker': 'PL' });
  const own = createElement('div', { 'd2-country-picker-toggle': 'PHONE' });
  form.insertBefore(own, form.children[0]);
  load(env);

  assert.equal(cp(env).get(input).toggle, own);
  assert.equal(own.style.position, undefined, 'the module does not touch a positioned box');
});

test('a static toggle gets a positioning context for the list', () => {
  const env = createEnvironment();
  env.context.getComputedStyle = () => ({ position: 'static', display: 'block' });

  const { form, input } = addField(env, { 'd2-country-picker': 'PL' });
  const own = createElement('div', { 'd2-country-picker-toggle': 'PHONE' });
  form.insertBefore(own, form.children[0]);
  load(env);

  assert.equal(cp(env).get(input).toggle.style.position, 'relative');
});
