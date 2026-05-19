const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'webflow-scripts', 'modules', 'tabs.js');

function createElement(tagName, attrs) {
  const classes = new Set();
  const el = {
    tagName: tagName.toUpperCase(),
    attributes: Object.assign({}, attrs || {}),
    children: [],
    parentNode: null,
    style: {
      _priorities: {},
      setProperty(name, value, priority) {
        this[name] = value;
        this._priorities[name] = priority || '';
      },
      removeProperty(name) {
        this[name] = '';
        delete this._priorities[name];
      },
      getPropertyPriority(name) {
        return this._priorities[name] || '';
      },
    },
    _listeners: {},
    offsetHeight: 0,
    classList: {
      add(name) {
        classes.add(name);
      },
      remove(name) {
        classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      },
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name);
    },
    addEventListener(type, fn) {
      this._listeners[type] = fn;
    },
    removeEventListener(type) {
      delete this._listeners[type];
    },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
    },
    contains(node) {
      if (node === this) return true;
      return this.children.some((child) => child.contains && child.contains(node));
    },
    click() {
      if (this._listeners.click) {
        this._listeners.click({ preventDefault() {}, target: this });
      }
    },
    querySelectorAll(selector) {
      const results = [];
      const selectors = selector.split(',').map((item) => item.trim());

      function matchesOne(node, sel) {
        if (sel === '[d2-tab]') return node.hasAttribute('d2-tab');
        if (sel === '[d2-tab-content]') return node.hasAttribute('d2-tab-content');
        if (sel === '[d2-tab-group]') return node.hasAttribute('d2-tab-group');
        if (sel === '[d2-tab-trigger]') return node.hasAttribute('d2-tab-trigger');
        if (sel === '[d2-tab-instance]') return node.hasAttribute('d2-tab-instance');
        return false;
      }

      function matches(node) {
        return selectors.some((sel) => matchesOne(node, sel));
      }

      function walk(node) {
        node.children.forEach((child) => {
          if (matches(child)) results.push(child);
          walk(child);
        });
      }

      walk(this);
      return results;
    },
  };

  return el;
}

function createEnvironment() {
  const body = createElement('body');
  const group = createElement('div', { 'd2-tab-group': 'pricing' });
  const monthlyTrigger = createElement('button', { 'd2-tab-trigger': 'monthly' });
  const yearlyTrigger = createElement('button', { 'd2-tab-trigger': 'yearly' });
  const monthlyPanel = createElement('div', { 'd2-tab-instance': 'monthly' });
  const yearlyPanel = createElement('div', { 'd2-tab-instance': 'yearly' });
  const externalTrigger = createElement('button', { 'd2-tab-trigger': 'pricing:yearly' });

  group.appendChild(monthlyTrigger);
  group.appendChild(yearlyTrigger);
  group.appendChild(monthlyPanel);
  group.appendChild(yearlyPanel);
  body.appendChild(group);
  body.appendChild(externalTrigger);

  const document = {
    body,
    readyState: 'complete',
    addEventListener() {},
    querySelector(selector) {
      if (selector === '[d2-tab-group="pricing"]') return group;
      return null;
    },
    querySelectorAll(selector) {
      return body.querySelectorAll(selector);
    },
  };

  const window = {
    digi2: {
      log() {},
    },
    location: { hash: '' },
    addEventListener() {},
  };

  return {
    context: vm.createContext({
      window,
      document,
      console,
      setTimeout,
      history: { replaceState() {} },
    }),
    window,
    monthlyTrigger,
    yearlyTrigger,
    monthlyPanel,
    yearlyPanel,
    externalTrigger,
  };
}

function loadTabsModule(env) {
  const code = fs.readFileSync(modulePath, 'utf8');
  vm.runInContext(code, env.context, { filename: modulePath });
}

test('external tab trigger opens tab and receives active class', () => {
  const env = createEnvironment();
  loadTabsModule(env);

  env.window.digi2.tabs.create('pricing', {
    animation: 'none',
    activeClass: 'is-active',
  });

  assert.equal(env.monthlyPanel.style.display, '');
  assert.equal(env.yearlyPanel.style.display, 'none');
  assert.equal(env.externalTrigger.classList.contains('is-active'), false);

  env.externalTrigger.click();

  assert.equal(env.monthlyPanel.style.display, 'none');
  assert.equal(env.yearlyPanel.style.display, '');
  assert.equal(env.monthlyTrigger.classList.contains('is-active'), false);
  assert.equal(env.yearlyTrigger.classList.contains('is-active'), true);
  assert.equal(env.externalTrigger.classList.contains('is-active'), true);
});

test('module auto initializes declarative tab groups', () => {
  const env = createEnvironment();
  loadTabsModule(env);

  assert.equal(env.monthlyPanel.style.display, '');
  assert.equal(env.yearlyPanel.style.display, 'none');

  env.yearlyTrigger.click();

  assert.equal(env.monthlyPanel.style.display, 'none');
  assert.equal(env.yearlyPanel.style.display, '');
  assert.equal(env.monthlyTrigger.classList.contains('d2-tab-active'), false);
  assert.equal(env.yearlyTrigger.classList.contains('d2-tab-active'), true);
});

test('trigger with d2-tab-active class is used as default tab', () => {
  const env = createEnvironment();
  env.yearlyTrigger.classList.add('d2-tab-active');

  loadTabsModule(env);

  env.window.digi2.tabs.create('pricing', {
    animation: 'none',
  });

  assert.equal(env.monthlyPanel.style.display, 'none');
  assert.equal(env.yearlyPanel.style.display, '');
  assert.equal(env.monthlyTrigger.classList.contains('d2-tab-active'), false);
  assert.equal(env.yearlyTrigger.classList.contains('d2-tab-active'), true);
});

test('auto initialized group can be reconfigured as accordion without inheriting generated active tab', () => {
  const env = createEnvironment();
  loadTabsModule(env);

  env.window.digi2.tabs.create('pricing', {
    mode: 'accordion',
    animation: 'none',
  });

  assert.equal(env.monthlyPanel.style.display, 'none');
  assert.equal(env.yearlyPanel.style.display, 'none');

  env.yearlyTrigger.click();

  assert.equal(env.monthlyPanel.style.display, 'none');
  assert.equal(env.yearlyPanel.style.display, '');
});

test('hidden tab instances use display none important', () => {
  const env = createEnvironment();
  loadTabsModule(env);

  env.window.digi2.tabs.create('pricing', {
    animation: 'none',
  });

  assert.equal(env.monthlyPanel.style.display, '');
  assert.equal(env.yearlyPanel.style.display, 'none');
  assert.equal(env.yearlyPanel.style.getPropertyPriority('display'), 'important');

  env.yearlyTrigger.click();

  assert.equal(env.monthlyPanel.style.display, 'none');
  assert.equal(env.monthlyPanel.style.getPropertyPriority('display'), 'important');
  assert.equal(env.yearlyPanel.style.display, '');
});
