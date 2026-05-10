const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'webflow-scripts', 'modules', 'ab-tests.js');

function createElement(tagName, attrs) {
  const el = {
    tagName: tagName.toUpperCase(),
    attributes: Object.assign({}, attrs || {}),
    children: [],
    parentNode: null,
    style: {},
    _listeners: {},
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
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
    },
    querySelectorAll(selector) {
      const results = [];
      const selectors = selector.split(',').map((item) => item.trim());

      function matches(node, sel) {
        if (sel === 'a[href]') return node.tagName === 'A' && node.hasAttribute('href');
        if (sel === '[d2-ab-link]') return node.hasAttribute('d2-ab-link');
        return false;
      }

      function walk(node) {
        if (selectors.some((sel) => matches(node, sel))) results.push(node);
        node.children.forEach(walk);
      }

      this.children.forEach(walk);
      return results;
    },
  };

  return el;
}

function createEnvironment() {
  const body = createElement('body');
  const observers = [];

  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.options = null;
      this.target = null;
      observers.push(this);
    }

    observe(target, options) {
      this.target = target;
      this.options = options;
    }

    disconnect() {
      this.target = null;
    }
  }

  const storage = {};
  const localStorage = {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
    },
    setItem(key, value) {
      storage[key] = String(value);
    },
    removeItem(key) {
      delete storage[key];
    },
  };

  const events = [];
  const window = {
    digi2: {
      _abTestsConfigName: 'sitemap',
      log() {},
      emit(event, data) {
        events.push({ event, data });
      },
    },
    sitemap: {
      pricing: {
        base: '/pricing',
        variants: {
          A: '/pricing-a',
          B: '/pricing-b',
        },
      },
    },
    localStorage,
    sessionStorage: localStorage,
    dataLayer: [],
    location: {
      href: 'https://example.com/landing',
      origin: 'https://example.com',
      pathname: '/landing',
      search: '',
      hash: '',
      replace(url) {
        this.href = url;
      },
    },
    MutationObserver: FakeMutationObserver,
  };

  const document = {
    body,
    readyState: 'complete',
    addEventListener() {},
    querySelectorAll(selector) {
      return body.querySelectorAll(selector);
    },
  };

  window.document = document;

  return {
    context: vm.createContext({
      window,
      document,
      localStorage,
      sessionStorage: localStorage,
      MutationObserver: FakeMutationObserver,
      console,
      setTimeout,
      clearTimeout,
      URL,
    }),
    body,
    localStorage,
    observers,
  };
}

function loadAbTestsModule(env) {
  const code = fs.readFileSync(modulePath, 'utf8');
  vm.runInContext(code, env.context, { filename: modulePath });
}

test('MutationObserver rewrites matching links added after init', () => {
  const env = createEnvironment();
  env.localStorage.setItem('d2ab:pricing', 'B');

  loadAbTestsModule(env);

  assert.equal(env.observers.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(env.observers[0].options)), {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['href', 'd2-ab-link', 'd2-ab-ignore'],
  });

  const link = createElement('a', { href: '/pricing' });
  env.body.appendChild(link);
  env.observers[0].callback([{ type: 'childList', addedNodes: [link] }]);

  assert.equal(link.getAttribute('href'), '/pricing-b');
});
