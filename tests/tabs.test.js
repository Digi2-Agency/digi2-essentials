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
    parentElement: null,
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
      child.parentElement = this;
      this.children.push(child);
    },
    contains(node) {
      if (node === this) return true;
      return this.children.some((child) => child.contains && child.contains(node));
    },
    closest(selector) {
      let node = this;
      while (node) {
        if (selector === 'a[href]' && node.tagName === 'A' && node.hasAttribute('href')) return node;
        node = node.parentElement;
      }
      return null;
    },
    click() {
      if (this._listeners.click) {
        this._listeners.click({ preventDefault() {}, target: this });
      }
    },
    scrollIntoView(opts) {
      this._scrolledInto = opts || {};
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
        if (sel === '[d2-tab-scroll]') return node.hasAttribute('d2-tab-scroll');
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
      clearTimeout,
      history: { replaceState() {} },
      // Simulates CSS: an element flagged _classHidden renders display:none
      // unless an inline display overrides it.
      getComputedStyle: (el) => ({
        display: el._classHidden && !el.style.display
          ? 'none'
          : (el.style.display || 'block'),
      }),
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

test('accordion height animation shows/hides panels (fallback timers)', async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const env = createEnvironment();
  loadTabsModule(env);

  env.window.digi2.tabs.create('pricing', {
    mode: 'accordion',
    allowMultiple: false,
    animation: 'height',
    animationDuration: 0.01,
  });

  // Accordion: nothing open by default
  assert.equal(env.monthlyPanel.style.display, 'none');
  assert.equal(env.yearlyPanel.style.display, 'none');

  // Open monthly
  env.monthlyTrigger.click();
  await wait(90);
  assert.equal(env.monthlyPanel.style.display, '');

  // Open yearly → monthly closes (allowMultiple: false)
  env.yearlyTrigger.click();
  await wait(90);
  assert.equal(env.yearlyPanel.style.display, '');
  assert.equal(env.monthlyPanel.style.display, 'none');
});

test('nested tab groups do not steal each others triggers/panels', () => {
  const body = createElement('body');
  const outer = createElement('div', { 'd2-tab-group': 'outer' });
  const triggerList = createElement('button', { 'd2-tab-trigger': 'list' });
  const triggerGrid = createElement('button', { 'd2-tab-trigger': 'grid' });
  const listPanel = createElement('div', { 'd2-tab-instance': 'list' });
  const gridPanel = createElement('div', { 'd2-tab-instance': 'grid' });

  const inner = createElement('div', {
    'd2-tab-group': 'inner',
    'd2-tab-mode': 'accordion',
    'd2-tab-animation': 'none',
  });
  const rowTrigger = createElement('div', { 'd2-tab-trigger': 'row-a' });
  const rowPanel = createElement('div', { 'd2-tab-instance': 'row-a' });

  inner.appendChild(rowTrigger);
  inner.appendChild(rowPanel);
  listPanel.appendChild(inner);
  outer.appendChild(triggerList);
  outer.appendChild(triggerGrid);
  outer.appendChild(listPanel);
  outer.appendChild(gridPanel);
  body.appendChild(outer);

  const document = {
    body,
    readyState: 'complete',
    addEventListener() {},
    querySelector(selector) {
      if (selector === '[d2-tab-group="outer"]') return outer;
      if (selector === '[d2-tab-group="inner"]') return inner;
      return null;
    },
    querySelectorAll(selector) {
      return body.querySelectorAll(selector);
    },
  };
  const window = { digi2: { log() {} }, location: { hash: '' }, addEventListener() {} };
  const context = vm.createContext({
    window, document, console, setTimeout, clearTimeout, history: { replaceState() {} },
  });
  vm.runInContext(fs.readFileSync(modulePath, 'utf8'), context, { filename: modulePath });

  // Outer group defaults to list view; grid hidden.
  assert.equal(listPanel.style.display, '');
  assert.equal(gridPanel.style.display, 'none');

  // Clicking a nested accordion row must NOT collapse the outer list view.
  rowTrigger.click();
  assert.equal(listPanel.style.display, '', 'list view must stay visible');
  assert.equal(rowPanel.style.display, '', 'row panel must open');
});

test('scroll option tracks the opening panel and lands centered, not on default open', async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const env = createEnvironment();

  // Window scroll plumbing the module reads.
  const scrollCalls = [];
  env.window.innerHeight = 800;
  env.window.pageYOffset = 0;
  env.window.scrollTo = (opts) => scrollCalls.push(opts);
  // Panel geometry: 200px tall, 1000px down the page.
  env.yearlyPanel.getBoundingClientRect = () => ({ top: 1000, height: 200 });

  loadTabsModule(env);

  env.window.digi2.tabs.create('pricing', {
    animation: 'none',
    animationDuration: 0,
    scroll: true,
  });

  // Default-open (monthly) must NOT scroll the page on load.
  assert.equal(scrollCalls.length, 0);

  env.yearlyTrigger.click();
  await wait(200); // tracking loop runs ~80ms settle window

  assert.ok(scrollCalls.length >= 2, 'tracking loop scrolled across multiple frames');
  // center: elemTop(1000) - (viewport(800) - height(200)) / 2 = 700
  assert.equal(scrollCalls[scrollCalls.length - 1].top, 700, 'final frame lands centered');
});

test('predictive scroll accounts for a closing panel above the opening one', async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const env = createEnvironment();

  const scrollCalls = [];
  env.window.innerHeight = 800;
  env.window.pageYOffset = 0;
  env.window.scrollTo = (opts) => scrollCalls.push(opts);
  // Open monthly panel sits above: top 100, height 300 — it will collapse.
  env.monthlyPanel.getBoundingClientRect = () => ({ top: 100, height: 300 });
  env.monthlyPanel.offsetHeight = 300;
  // Yearly panel measured at its final size (animation 'none' shows full).
  env.yearlyPanel.getBoundingClientRect = () => ({ top: 1000, height: 200 });

  loadTabsModule(env);
  env.window.digi2.tabs.create('pricing', {
    animation: 'none',
    animationDuration: 0,
    scroll: true,
  });

  env.yearlyTrigger.click();
  await wait(200);

  assert.ok(scrollCalls.length >= 1, 'glide ran');
  // finalTop = 1000 - 300 (collapsing above) = 700; center: 700 - (800-200)/2 = 400
  assert.equal(scrollCalls[scrollCalls.length - 1].top, 400, 'predicted target includes sibling collapse');
});

test('class-based display:none panel gets an inline display when shown', () => {
  const env = createEnvironment();
  env.yearlyPanel._classHidden = true;   // simulates a "hidden" combo class

  loadTabsModule(env);
  env.window.digi2.tabs.create('pricing', { animation: 'none' });

  env.yearlyTrigger.click();
  assert.equal(env.yearlyPanel.style.display, 'block', 'inline display overrides the class');

  // d2-tab-display picks the value for flex/grid panels.
  env.monthlyPanel._classHidden = true;
  env.monthlyPanel.setAttribute('d2-tab-display', 'flex');
  env.monthlyTrigger.click();
  assert.equal(env.monthlyPanel.style.display, 'flex');
});

test('outer group does not inherit d2-tab-scroll from a nested accordion', () => {
  const body = createElement('body');
  const outer = createElement('div', { 'd2-tab-group': 'outer2' });
  const triggerList = createElement('button', { 'd2-tab-trigger': 'list' });
  const triggerGrid = createElement('button', { 'd2-tab-trigger': 'grid' });
  const listPanel = createElement('div', { 'd2-tab-instance': 'list' });
  const gridPanel = createElement('div', { 'd2-tab-instance': 'grid' });
  const inner = createElement('div', {
    'd2-tab-group': 'inner2', 'd2-tab-mode': 'accordion', 'd2-tab-animation': 'none',
  });
  const rowTrigger = createElement('div', { 'd2-tab-trigger': 'row-a' });
  const rowPanel = createElement('div', { 'd2-tab-instance': 'row-a', 'd2-tab-scroll': 'center' });

  inner.appendChild(rowTrigger);
  inner.appendChild(rowPanel);
  listPanel.appendChild(inner);
  outer.appendChild(triggerList);
  outer.appendChild(triggerGrid);
  outer.appendChild(listPanel);
  outer.appendChild(gridPanel);
  body.appendChild(outer);

  const document = {
    body,
    readyState: 'complete',
    addEventListener() {},
    querySelector(selector) {
      if (selector === '[d2-tab-group="outer2"]') return outer;
      if (selector === '[d2-tab-group="inner2"]') return inner;
      return null;
    },
    querySelectorAll(selector) { return body.querySelectorAll(selector); },
  };
  const window = { digi2: { log() {} }, location: { hash: '' }, addEventListener() {} };
  const context = vm.createContext({
    window, document, console, setTimeout, clearTimeout, history: { replaceState() {} },
  });
  vm.runInContext(fs.readFileSync(modulePath, 'utf8'), context, { filename: modulePath });

  // Switching the outer view must NOT scroll (its scroll option stays off) …
  triggerGrid.click();
  assert.equal(gridPanel._scrolledInto, undefined, 'outer tab switch must not scroll');
  // …while the inner accordion still scrolls to its opening row.
  triggerList.click();
  rowTrigger.click();
  assert.ok(rowPanel._scrolledInto, 'inner accordion row still scrolls');
});

test('a real link inside a trigger navigates instead of toggling the accordion', () => {
  const env = createEnvironment();
  loadTabsModule(env);
  env.window.digi2.tabs.create('pricing', { mode: 'accordion', animation: 'none' });

  const detailsLink = createElement('a', { href: '/products/a-3-12' });
  env.yearlyTrigger.appendChild(detailsLink);

  // Click landing on the link: no toggle, no preventDefault (browser navigates).
  let prevented = false;
  env.yearlyTrigger._listeners.click({ preventDefault() { prevented = true; }, target: detailsLink });
  assert.equal(env.yearlyPanel.style.display, 'none', 'accordion must NOT open');
  assert.equal(prevented, false, 'navigation must NOT be prevented');

  // Click elsewhere in the row still toggles.
  env.yearlyTrigger._listeners.click({ preventDefault() {}, target: env.yearlyTrigger });
  assert.equal(env.yearlyPanel.style.display, '', 'row click still opens the accordion');
});
