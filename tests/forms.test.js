const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'webflow-scripts', 'modules', 'forms.js');

function createElement(tagName, attrs) {
  const classes = new Set();
  const el = {
    tagName: tagName.toUpperCase(),
    attributes: Object.assign({}, attrs || {}),
    children: [],
    parentNode: null,
    parentElement: null,
    style: {},
    textContent: '',
    value: '',
    checked: false,
    indeterminate: false,
    type: attrs && attrs.type ? attrs.type : '',
    name: attrs && attrs.name ? attrs.name : '',
    _listeners: {},
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === 'type') this.type = String(value);
      if (name === 'name') this.name = String(value);
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name);
    },
    addEventListener(type, fn) {
      this._listeners[type] = this._listeners[type] || [];
      this._listeners[type].push(fn);
    },
    removeEventListener(type, fn) {
      if (!this._listeners[type]) return;
      this._listeners[type] = this._listeners[type].filter((entry) => entry !== fn);
    },
    dispatchEvent(event) {
      event.target = event.target || this;
      const handlers = this._listeners[event.type] || [];
      handlers.slice().forEach((fn) => fn(event));
      if (event.bubbles && this.parentNode && this.parentNode.dispatchEvent) {
        this.parentNode.dispatchEvent(event);
      }
      return true;
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
      const index = this.children.indexOf(ref);
      if (index === -1) this.children.push(child);
      else this.children.splice(index, 0, child);
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter((entry) => entry !== child);
      child.parentNode = null;
      child.parentElement = null;
      return child;
    },
    closest(selector) {
      let current = this;
      while (current) {
        if (matches(current, selector)) return current;
        current = current.parentElement;
      }
      return null;
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector) {
      const results = [];
      function walk(node) {
        node.children.forEach((child) => {
          if (matches(child, selector)) results.push(child);
          walk(child);
        });
      }
      walk(this);
      return results;
    },
  };

  return el;
}

function matches(node, selector) {
  if (!node || !selector) return false;

  if (selector.indexOf(',') !== -1) {
    return selector.split(',').some((part) => matches(node, part.trim()));
  }

  if (selector === 'form') return node.tagName === 'FORM';
  if (selector === 'label') return node.tagName === 'LABEL';
  if (selector === '[d2-form]') return node.hasAttribute('d2-form');
  if (selector === '[data-d2-form]') return node.hasAttribute('data-d2-form');
  if (selector === '[d2-consent-master]') return node.hasAttribute('d2-consent-master');
  if (selector === '[d2-consent-item]') return node.hasAttribute('d2-consent-item');
  if (selector === 'input') return node.tagName === 'INPUT';
  if (selector === 'input, textarea, select') {
    return node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT';
  }

  let match = selector.match(/^\[d2-form="([^"]+)"\]$/);
  if (match) return node.getAttribute('d2-form') === match[1];

  match = selector.match(/^\[data-d2-form="([^"]+)"\]$/);
  if (match) return node.getAttribute('data-d2-form') === match[1];

  match = selector.match(/^input\[name="([^"]+)"\]$/);
  if (match) return node.tagName === 'INPUT' && node.name === match[1];

  match = selector.match(/^\[name="([^"]+)"\]$/);
  if (match) return node.name === match[1];

  match = selector.match(/^\[d2-consent-item="([^"]+)"\]$/);
  if (match) return node.getAttribute('d2-consent-item') === match[1];

  match = selector.match(/^\[d2-consent-master="([^"]+)"\]$/);
  if (match) return node.getAttribute('d2-consent-master') === match[1];

  return false;
}

function createEnvironment() {
  const body = createElement('body');
  const head = createElement('head');
  const wrapper = createElement('div', { 'd2-form': 'contact' });
  const form = createElement('form');
  const master = createElement('input', { type: 'checkbox', 'd2-consent-master': 'contact' });
  const gdpr = createElement('input', { type: 'checkbox', name: 'CONSENT_GDPR', 'd2-consent-item': 'contact' });
  const email = createElement('input', { type: 'checkbox', name: 'CONSENT_EMAIL', 'd2-consent-item': 'contact' });
  const phone = createElement('input', { type: 'checkbox', name: 'CONSENT_PHONE', 'd2-consent-item': 'contact' });

  form.appendChild(master);
  form.appendChild(gdpr);
  form.appendChild(email);
  form.appendChild(phone);
  wrapper.appendChild(form);
  body.appendChild(wrapper);

  const document = {
    body,
    head,
    title: '',
    referrer: '',
    createElement(tagName) {
      return createElement(tagName);
    },
    querySelector(selector) {
      if (selector === '[d2-form="contact"]') return wrapper;
      return body.querySelector(selector);
    },
    querySelectorAll(selector) {
      return body.querySelectorAll(selector);
    },
  };

  const window = {
    digi2: {
      log() {},
    },
    location: { search: '', href: 'https://example.com/contact' },
  };

  return {
    context: vm.createContext({
      window,
      document,
      console,
      Event,
      setTimeout,
      URLSearchParams,
      getComputedStyle: () => ({ display: '', visibility: '', opacity: '1' }),
      fetch: () => Promise.resolve({ json: () => Promise.resolve({}) }),
    }),
    window,
    master,
    gdpr,
    email,
    phone,
  };
}

function createWebflowCheckbox(input) {
  const label = createElement('label');
  const visual = createElement('div');
  visual.classList.add('w-checkbox-input');
  label.appendChild(visual);
  label.appendChild(input);
  return { label, visual };
}

function createWebflowEnvironment() {
  const env = createEnvironment();
  const form = env.master.parentElement;
  form.children = [];

  const masterWrap = createWebflowCheckbox(env.master);
  const gdprWrap = createWebflowCheckbox(env.gdpr);
  const emailWrap = createWebflowCheckbox(env.email);
  const phoneWrap = createWebflowCheckbox(env.phone);

  form.appendChild(masterWrap.label);
  form.appendChild(gdprWrap.label);
  form.appendChild(emailWrap.label);
  form.appendChild(phoneWrap.label);

  return Object.assign(env, {
    masterVisual: masterWrap.visual,
    gdprVisual: gdprWrap.visual,
    emailVisual: emailWrap.visual,
    phoneVisual: phoneWrap.visual,
  });
}

function loadFormsModule(env) {
  const code = fs.readFileSync(modulePath, 'utf8');
  vm.runInContext(code, env.context, { filename: modulePath });
}

function change(input) {
  input.dispatchEvent({ type: 'change', bubbles: true });
}

function createForm(env) {
  return env.window.digi2.forms.create('contact', {
    utmTracking: false,
    clickIdTracking: false,
    gaClientId: false,
    pageMeta: false,
    autoValidation: false,
  });
}

function tick() {
  return new Promise((resolve) => setTimeout(resolve, 5));
}

test('consent master checkbox toggles all consent items in the same group', () => {
  const env = createEnvironment();
  loadFormsModule(env);
  createForm(env);

  env.master.checked = true;
  change(env.master);

  assert.equal(env.gdpr.checked, true);
  assert.equal(env.email.checked, true);
  assert.equal(env.phone.checked, true);
  assert.equal(env.master.indeterminate, false);

  env.master.checked = false;
  change(env.master);

  assert.equal(env.gdpr.checked, false);
  assert.equal(env.email.checked, false);
  assert.equal(env.phone.checked, false);
});

test('consent items update master checked and indeterminate state', () => {
  const env = createEnvironment();
  loadFormsModule(env);
  createForm(env);

  env.gdpr.checked = true;
  change(env.gdpr);

  assert.equal(env.master.checked, false);
  assert.equal(env.master.indeterminate, true);

  env.email.checked = true;
  change(env.email);
  env.phone.checked = true;
  change(env.phone);

  assert.equal(env.master.checked, true);
  assert.equal(env.master.indeterminate, false);

  env.email.checked = false;
  change(env.email);

  assert.equal(env.master.checked, false);
  assert.equal(env.master.indeterminate, true);
});

test('consent master syncs Webflow custom checkbox checked classes', () => {
  const env = createWebflowEnvironment();
  loadFormsModule(env);
  createForm(env);

  env.master.checked = true;
  change(env.master);

  assert.equal(env.gdpr.checked, true);
  assert.equal(env.gdprVisual.classList.contains('w--redirected-checked'), true);
  assert.equal(env.emailVisual.classList.contains('w--redirected-checked'), true);
  assert.equal(env.phoneVisual.classList.contains('w--redirected-checked'), true);

  env.email.checked = false;
  change(env.email);

  assert.equal(env.master.checked, false);
  assert.equal(env.master.indeterminate, true);
  assert.equal(env.masterVisual.classList.contains('w--redirected-checked'), false);
  assert.equal(env.masterVisual.classList.contains('d2-consent-indeterminate'), true);
});

test('consent masters auto initialize without digi2.forms.create', () => {
  const env = createWebflowEnvironment();
  loadFormsModule(env);

  env.master.checked = true;
  change(env.master);

  assert.equal(env.gdpr.checked, true);
  assert.equal(env.email.checked, true);
  assert.equal(env.phone.checked, true);
  assert.equal(env.gdprVisual.classList.contains('w--redirected-checked'), true);
});

test('consent master re-checks state after delayed Webflow checkbox updates', async () => {
  const env = createWebflowEnvironment();
  loadFormsModule(env);

  env.master.addEventListener('change', () => {
    env.master.checked = true;
  });
  change(env.master);

  await tick();

  assert.equal(env.gdpr.checked, true);
  assert.equal(env.email.checked, true);
  assert.equal(env.phone.checked, true);
  assert.equal(env.gdprVisual.classList.contains('w--redirected-checked'), true);
});

test('consent master does not dispatch child change events that Webflow can invert', async () => {
  const env = createWebflowEnvironment();
  loadFormsModule(env);

  [env.gdpr, env.email, env.phone].forEach((item) => {
    item.addEventListener('change', () => {
      item.checked = !item.checked;
    });
  });

  env.master.checked = true;
  change(env.master);
  await tick();

  assert.equal(env.master.checked, true);
  assert.equal(env.gdpr.checked, true);
  assert.equal(env.email.checked, true);
  assert.equal(env.phone.checked, true);
});

test('checkbox validation error clears when checkbox changes', () => {
  const env = createWebflowEnvironment();
  loadFormsModule(env);

  env.window.digi2.forms.create('contact', {
    utmTracking: false,
    clickIdTracking: false,
    gaClientId: false,
    pageMeta: false,
    autoValidation: false,
    validation: {
      CONSENT_GDPR: { required: true },
    },
    inputOnError: { borderColor: '#cc3300' },
    inputOnValid: { borderColor: '' },
  });

  const form = env.master.closest('form');
  form.dispatchEvent({
    type: 'submit',
    preventDefault() {},
    stopImmediatePropagation() {},
  });

  assert.equal(env.gdpr.parentElement.classList.contains('d2-error'), true);

  env.gdpr.checked = true;
  change(env.gdpr);

  assert.equal(env.gdpr.parentElement.classList.contains('d2-error'), false);
  assert.equal(env.gdpr.parentElement.getAttribute('d2-error'), null);
});

test('createAll binds wrappers using the data-d2-form fallback and injects UTM', () => {
  const body = createElement('body');
  const head = createElement('head');
  const wrapper = createElement('div', { 'data-d2-form': 'contact-form' });
  const form = createElement('form');
  wrapper.appendChild(form);
  body.appendChild(wrapper);

  const document = {
    body,
    head,
    title: '',
    referrer: '',
    cookie: '',
    createElement(tagName) { return createElement(tagName); },
    querySelector(selector) { return body.querySelector(selector); },
    querySelectorAll(selector) { return body.querySelectorAll(selector); },
  };

  const window = {
    digi2: { log() {} },
    location: { search: '?utm_source=newsletter', href: 'https://example.com/contact' },
  };

  const context = vm.createContext({
    window, document, console, Event, setTimeout, URLSearchParams,
    getComputedStyle: () => ({ display: '', visibility: '', opacity: '1' }),
    fetch: () => Promise.resolve({ json: () => Promise.resolve({}) }),
  });

  vm.runInContext(fs.readFileSync(modulePath, 'utf8'), context, { filename: modulePath });

  const created = window.digi2.forms.createAll('contact-form', {
    utmTracking: true,
    clickIdTracking: false,
    gaClientId: false,
    pageMeta: false,
    autoValidation: false,
  });

  assert.equal(created.length, 1);
  const utm = form.querySelector('input[name="UTM_SOURCE"]');
  assert.ok(utm, 'UTM_SOURCE hidden input should be injected');
  assert.equal(utm.value, 'newsletter');
});
