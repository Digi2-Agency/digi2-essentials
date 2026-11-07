const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'webflow-scripts', 'modules', 'booking.js');
const moduleCode = fs.readFileSync(modulePath, 'utf8');

// The API contract is the source of truth: every request and every refusal in
// this file is built from tests/fixtures/booking-api/, never typed by hand.
const fixturesDir = path.join(__dirname, 'fixtures', 'booking-api');
function fixture(name) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, name + '.json'), 'utf8'));
}
const CONFIG = fixture('config');
const BOOKING = fixture('booking');
const CHECKOUT = fixture('checkout-session');
const AVAILABILITY = fixture('availability');
const QUOTE = fixture('quote');
const STATUS = fixture('status');
const MANAGE = fixture('manage');
const REQUEST = fixture('request');
const CONTACT = fixture('contact');
const BALANCE = fixture('balance-checkout');
const PRODUCT_FIXTURE = fixture('product');
const PRODUCTS = fixture('products');
const ERRORS = fixture('errors').errors;

function refusalFixture(name) {
  const found = ERRORS.filter((e) => e.name === name)[0];
  if (!found) throw new Error('no such refusal in errors.json: ' + name);
  return found;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Mini-DOM — only what the module touches
// ---------------------------------------------------------------------------

// Selectors the module uses: [attr], [attr="value"], tag[attr], comma lists.
function matches(el, selector) {
  return selector.split(',').some((part) => {
    const one = part.trim();
    if (!one) return false;
    const m = /^([a-zA-Z-]*)\[([^\]=]+)(?:="([^"]*)")?\]$/.exec(one);
    if (!m) return el.tagName === one.toUpperCase();
    if (m[1] && el.tagName !== m[1].toUpperCase()) return false;
    const value = el.getAttribute(m[2]);
    return value !== null && (m[3] === undefined || value === m[3]);
  });
}

function descendants(el) {
  const out = [];
  (el.children || []).forEach((child) => {
    out.push(child);
    out.push(...descendants(child));
  });
  return out;
}

// The element the page focused last; document.activeElement reads it. Reset by
// page(), so one test never sees the focus of the one before.
let focused = null;

function element(attrs, tagName) {
  const el = {
    tagName: (tagName || 'DIV').toUpperCase(),
    attributes: Object.assign({}, attrs || {}),
    children: [],
    parentNode: null,
    style: {},
    ownText: '',
    value: '',
    listeners: {},
    // textContent as the DOM really behaves: reading it is the text of the
    // element and everything inside it, and writing it REPLACES every child
    // with one text node. A plain property could never show a module that
    // destroys the markup the Designer put inside a slot by writing the
    // slot's own text back into it.
    get textContent() {
      return this.ownText + this.children.map((child) => child.textContent).join('');
    },
    set textContent(text) {
      this.ownText = text === null || text === undefined ? '' : String(text);
      this.children.forEach((child) => { child.parentNode = null; });
      this.children = [];
    },
    get firstChild() { return this.children[0] || null; },
    focus() { focused = this; },
    cloneNode(deep) {
      const copy = element(this.attributes, this.tagName);
      copy.ownText = this.ownText;
      copy.value = this.value;
      copy.style = Object.assign({}, this.style);
      if (deep) this.children.forEach((child) => copy.appendChild(child.cloneNode(true)));
      return copy;
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
    },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    removeAttribute(name) { delete this.attributes[name]; },
    hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name); },
    appendChild(child) {
      if (child.parentNode) child.parentNode.removeChild(child);
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter((x) => x !== child);
      child.parentNode = null;
      return child;
    },
    querySelector(selector) { return descendants(this).filter((x) => matches(x, selector))[0] || null; },
    querySelectorAll(selector) { return descendants(this).filter((x) => matches(x, selector)); },
    addEventListener(type, fn, capture) {
      (this.listeners[type] = this.listeners[type] || []).push(fn);
      this.capturing = this.capturing || {};
      this.capturing[type] = !!capture;
    },
  };
  return el;
}

function fire(el, type, event) {
  (el.listeners[type] || []).forEach((fn) => fn(event || { preventDefault() {} }));
}

// A field: the input carries d2-booking-field, wrapped in a group with its label.
function fieldEl(name, value, extra) {
  const input = element(Object.assign({ 'd2-booking-field': name }, extra || {}), 'input');
  input.value = value == null ? '' : String(value);
  return input;
}

function buildForm(spec) {
  const form = element(Object.assign({ 'd2-booking-form': '' }, spec.attrs || {}), 'form');
  Object.keys(spec.fields || {}).forEach((name) => {
    const group = element({ 'd2-booking-field-group': '' }, 'div');
    group.appendChild(element({}, 'label'));
    group.appendChild(fieldEl(name, spec.fields[name]));
    form.appendChild(group);
  });
  (spec.errorSlots || []).forEach((name) => {
    form.appendChild(element({ 'd2-booking-error': name }, 'div'));
  });
  // The button the module has to disable while the booking is in flight.
  if (spec.submit) {
    form.appendChild(element({ 'd2-booking-submit': '', type: 'submit' }, 'button'));
  }
  return form;
}

// A <div d2-booking-widget>: the host of the fallback look. `inner` lists the
// parts the Designer built by hand, which must always win over the drawn ones.
function buildWidget(spec) {
  const el = element(Object.assign({ 'd2-booking-widget': '' }, spec.attrs || {}), 'div');
  (spec.inner || []).forEach((part) => {
    if (part === 'calendar') el.appendChild(element({ 'd2-booking-calendar': '' }, 'div'));
    else if (part === 'form') el.appendChild(buildForm({ fields: { name: 'Anna Nowak', email: 'anna@example.com' } }));
    else if (part === 'mark') el.appendChild(element({ 'd2-booking-mark': '' }, 'a'));
    else el.appendChild(element({ ['d2-booking-' + part]: '' }, 'div'));
  });
  return el;
}

// A <div d2-booking-return>: the page Stripe comes back to. `inner` lists the
// slots the Designer built by hand, which must always win over the drawn ones.
function buildBlock(host, spec) {
  const el = element(Object.assign({ [host]: '' }, (spec && spec.attrs) || {}), 'div');
  ((spec && spec.inner) || []).forEach((part) => {
    if (part === 'new' || part === 'account') el.appendChild(element({ [host + '-' + part]: '' }, 'a'));
    else if (part.indexOf('field:') === 0) {
      el.appendChild(element({ [host + '-field']: part.slice(6) }, 'span'));
    } else if (part.indexOf('action:') === 0) {
      el.appendChild(element({ [host + '-action']: part.slice(7), type: 'button' }, 'button'));
    } else if (part.indexOf('input:') === 0) {
      el.appendChild(element({ [host + '-input']: part.slice(6) }, 'input'));
    } else el.appendChild(element({ [host + '-' + part]: '' }, 'div'));
  });
  return el;
}

function submitOf(form) {
  return form.querySelector('[d2-booking-submit]');
}

function fieldOf(form, name) {
  return form.querySelector('[d2-booking-field="' + name + '"]');
}

// The price block, as the Designer would build it. `template` adds one row the
// module has to clone instead of drawing its own.
function buildPrice(spec) {
  const wrap = element({}, 'div');
  const breakdown = element({ 'd2-booking-breakdown': '' }, 'div');
  if (spec && spec.template) {
    const row = element({ 'd2-booking-line': '', class: 'price-row' }, 'div');
    row.appendChild(element({ 'd2-booking-line-label': '' }, 'span'));
    row.appendChild(element({ 'd2-booking-line-detail': '' }, 'span'));
    row.appendChild(element({ 'd2-booking-line-amount': '' }, 'span'));
    breakdown.appendChild(row);
  }
  wrap.appendChild(breakdown);
  wrap.appendChild(element({ 'd2-booking-total': '' }, 'strong'));
  wrap.appendChild(element({ 'd2-booking-deposit': '' }, 'span'));
  wrap.appendChild(element({ 'd2-booking-balance': '' }, 'span'));
  return wrap;
}

// The list of places, as the Designer would build it: a container holding one
// template row with the bind slots the page asked for. `inner` adds the
// controls the module fills in — they sit NEXT to the list, which is where a
// Webflow layout leaves them and where the rows cannot land on top of them.
function buildResults(spec) {
  const wrap = element({}, 'div');
  const box = element(Object.assign({ 'd2-booking-results': '' }, spec.attrs || {}), 'div');
  if (spec.template !== false) {
    const row = element(Object.assign({ 'd2-booking-template': '', class: 'karta' },
      spec.rowAttrs || {}), spec.rowTag || 'a');
    (spec.template === undefined || spec.template === true
      ? ['name', 'city_line', 'price', 'image']
      : spec.template).forEach((field) => {
      const slot = element({ 'd2-booking-bind': field },
        field === 'image' ? (spec.imageTag || 'img') : 'span');
      // A slot built as an icon beside a word, which is how a Designer builds
      // a badge: the markup inside it has to survive the binding.
      if ((spec.icons || []).indexOf(field) >= 0) {
        slot.appendChild(element({ class: 'ikona' }, 'i'));
        slot.ownText = 'na zapytanie';
      }
      row.appendChild(slot);
    });
    // Somebody duplicated the card inside the card.
    if (spec.nested) row.appendChild(element({ 'd2-booking-template': '' }, 'div'));
    // The whole card is the link, which is how a card is built; a page that
    // wants the link inside the row says so.
    if (spec.linkChild) row.appendChild(element({ 'd2-booking-link': spec.link || '' }, 'a'));
    else if (spec.link !== false) row.setAttribute('d2-booking-link', spec.link || '');
    if (spec.collection) {
      // What a published Collection List really is: the card sits two wrappers
      // and a Collection Item down, and the grid is .w-dyn-items.
      const list = element({ class: 'w-dyn-list' }, 'div');
      const items = element({ class: 'w-dyn-items' }, 'div');
      for (let i = 0; i < spec.collection; i++) {
        const item = element({ class: 'w-dyn-item w-col w-col-4' }, 'div');
        const card = i ? row.cloneNode(true) : row;
        if (spec.collectionWrap) {
          const inner = element({ class: 'wrap' }, 'div');
          inner.appendChild(card);
          item.appendChild(inner);
        } else {
          item.appendChild(card);
        }
        items.appendChild(item);
      }
      list.appendChild(items);
      box.appendChild(list);
      wrap.appendChild(box);
      return wrap;
    }
    box.appendChild(row);
    // A card built inside a Webflow Collection List is rendered once per CMS
    // item, so the published page carries the attribute on every one of them.
    for (let i = 1; i < (spec.copies || 1); i++) box.appendChild(row.cloneNode(true));
  }
  wrap.appendChild(box);
  (spec.inner || []).forEach((part) => {
    if (part === 'more') wrap.appendChild(element({ 'd2-booking-more': '', type: 'button' }, 'button'));
    else if (part === 'count') wrap.appendChild(element({ 'd2-booking-count': '' }, 'span'));
    else wrap.appendChild(element({ ['d2-booking-results-' + part]: '' }, 'div'));
  });
  return wrap;
}

// The search above the list, as the Designer would build it: a <form
// d2-booking-search> whose inputs carry d2-booking-search-field. `tags` turns
// one of them into a <select> (the page's own list of cities) and `calendar`
// puts stage 5's calendar in the form instead of two date inputs.
function buildSearch(spec) {
  const form = element(Object.assign({ 'd2-booking-search': '' }, spec.attrs || {}), 'form');
  const names = spec.fields || ['check_in', 'check_out', 'adults', 'children', 'location'];
  names.forEach((name) => {
    const el = element({ 'd2-booking-search-field': name },
      (spec.tags || {})[name] || 'input');
    const value = (spec.values || {})[name];
    el.value = value === undefined || value === null ? '' : String(value);
    form.appendChild(el);
  });
  if (spec.calendar) form.appendChild(element({ 'd2-booking-calendar': '' }, 'div'));
  if (spec.submit) form.appendChild(element({ type: 'submit' }, 'button'));
  return form;
}

// A clock frozen at one instant: the calendar's "today", the lead time and the
// month it opens on all read it, so the assertions do not drift with the date.
function frozenClock(iso) {
  const fixed = new Date(iso).getTime();
  class FrozenDate extends Date {
    constructor(...args) {
      if (args.length === 0) super(fixed);
      else super(...args);
    }
    static now() { return fixed; }
  }
  return FrozenDate;
}

function errorTextOf(form, name) {
  const el = form.querySelector('[d2-booking-error="' + name + '"]');
  return el ? String(el.textContent || '') : '';
}

// ---------------------------------------------------------------------------
// One page load
// ---------------------------------------------------------------------------

function response(status, body, headers) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h) => (headers && headers[h] !== undefined ? headers[h] : null) },
    json: () => Promise.resolve(clone(body)),
  };
}

/**
 * opts:
 *   key          value of d2-booking on the loader tag ('' = missing key)
 *   loaderAttrs  extra attributes on the loader tag (d2-booking-api, …)
 *   config       overrides merged into the /config fixture response
 *   forms        [{ fields, attrs, errorSlots }] — page markup
 *   refuse       { config|product|bookings|availability|quote: '<errors.json name>' | { status, body } }
 *   headers      response headers the stub exposes (Retry-After, …)
 *   offline      every fetch rejects, like a CORS refusal or a dead network
 *   now          ISO instant the clock is frozen at (today, lead time, month)
 *   availability overrides merged into the availability fixture response
 *   productData  overrides merged into the product fixture response
 *   quote        overrides merged into the quote fixture response
 *   calendar     true | { attrs } — a <div d2-booking-calendar> on the page
 *   status       true — the page carries its own [d2-booking-status]
 *   price        true | { template: true } — breakdown, total, deposit, balance
 *   widget       true | { attrs, inner: ['calendar', 'form', …] } — the host of
 *                the fallback look, optionally with parts the Designer built
 *   booking      overrides merged into the bookings fixture response
 *   checkout     overrides merged into the checkout-session fixture response
 *   search       query of the address ('?booking=…&payment=success')
 *   hash         fragment of the manage link ('#token=…&action=details')
 *   ret          true | { attrs, inner } — a <div d2-booking-return>
 *   manage       true | { attrs, inner } — a <div d2-booking-manage>
 *   results      true | { attrs, template, icons, copies, nested, link,
 *                linkChild, inner } — a <div d2-booking-results> with its
 *                template row, optionally rendered more than once (a Webflow
 *                Collection List) or holding a second pattern inside it
 *   searchForm   true | { attrs, fields, values, tags, calendar } — a
 *                <form d2-booking-search> above the list
 *   products     overrides merged into the products fixture response
 *   productsSeq  [overrides | { refuse: '<errors.json name>' }, …] — one per
 *                GET /products call; the last repeats, which is how a second
 *                page of the list, or a page that was refused, is built
 *   script       { <route>: [step, …] } — one step per call, before anything
 *                else answers: null = the normal answer, 'offline' = a dead
 *                network, { status, body, headers } = that response, and a
 *                function ({ response, merged }) => Promise = an answer the
 *                test releases itself. The steps run out, then it is normal.
 *   statusSeq    [overrides, …] — one per /status call; the last one repeats,
 *                which is how a poll that never settles is built
 *   manageData   overrides merged into the manage fixture response
 *   made         overrides merged into the requests fixture response
 *   balance      overrides merged into the balance-checkout fixture response
 */
function page(opts) {
  const o = opts || {};
  const calls = [];
  const events = [];
  const warnings = [];
  const logs = [];
  focused = null;

  const root = element({ lang: o.lang || '' }, 'html');
  const head = element({}, 'head');
  const body = element({}, 'body');
  root.appendChild(head);
  root.appendChild(body);

  const loaderTag = element(Object.assign(
    { 'd2-booking': o.key === undefined ? 'pk_test_123' : o.key },
    o.loaderAttrs || {}
  ), 'script');
  head.appendChild(loaderTag);

  const forms = (o.forms || [{ fields: { name: 'Anna Nowak', email: 'anna@example.com' } }])
    .map((spec) => body.appendChild(buildForm(spec)));

  const calendar = o.calendar
    ? body.appendChild(element(Object.assign({ 'd2-booking-calendar': '' },
      (o.calendar === true ? {} : o.calendar.attrs) || {}), 'div'))
    : null;
  const price = o.price ? body.appendChild(buildPrice(o.price === true ? {} : o.price)) : null;
  // A page that wants the sentence next to the price, not inside the calendar.
  if (o.status) body.appendChild(element({ 'd2-booking-status': '' }, 'div'));
  const widget = o.widget
    ? body.appendChild(buildWidget(o.widget === true ? {} : o.widget))
    : null;
  const ret = o.ret
    ? body.appendChild(buildBlock('d2-booking-return', o.ret === true ? {} : o.ret))
    : null;
  const manage = o.manage
    ? body.appendChild(buildBlock('d2-booking-manage', o.manage === true ? {} : o.manage))
    : null;
  // Above the list, which is where a search belongs.
  const searchForm = o.searchForm
    ? body.appendChild(buildSearch(o.searchForm === true ? {} : o.searchForm))
    : null;
  const results = o.results
    ? body.appendChild(buildResults(o.results === true ? {} : o.results))
    : null;

  const document = {
    readyState: 'complete',
    documentElement: root,
    body,
    createElement: (tag) => element({}, tag),
    querySelector: (selector) => root.querySelector(selector),
    querySelectorAll: (selector) => root.querySelectorAll(selector),
    addEventListener() {},
    get activeElement() { return focused; },
  };

  function configResponse() {
    const cfg = clone(CONFIG.response);
    Object.keys(o.config || {}).forEach((k) => { cfg[k] = clone(o.config[k]); });
    return cfg;
  }

  // The fixture answer with this test's overrides merged in; the shape always
  // stays the contract's.
  function merged(fixtureFile, overrides) {
    const out = clone(fixtureFile.response);
    Object.keys(overrides || {}).forEach((k) => { out[k] = clone(overrides[k]); });
    return out;
  }

  // One /status answer per call: a poll only settles because the answer
  // changed, so a fixed response could never prove the backoff works.
  let statusCall = 0;
  function statusResponse() {
    const seq = o.statusSeq && o.statusSeq.length ? o.statusSeq : [{}];
    const overrides = seq[Math.min(statusCall, seq.length - 1)];
    statusCall += 1;
    return merged(STATUS, overrides || {});
  }

  // One GET /products answer per call: a second page only differs because the
  // answer did, so a fixed response could never prove the paging works. An
  // entry that names a refusal of errors.json refuses that one call, which is
  // how a list that answered once and was refused next is built.
  let listCall = 0;
  function productsResponse() {
    const seq = o.productsSeq && o.productsSeq.length ? o.productsSeq : [o.products || {}];
    const overrides = seq[Math.min(listCall, seq.length - 1)] || {};
    listCall += 1;
    if (overrides.refuse) {
      const spec = refusalFixture(overrides.refuse);
      return response(spec.status, spec.body, o.headers);
    }
    return response(PRODUCTS.status, merged(PRODUCTS, overrides));
  }

  function fetchStub(url, init) {
    const text = String(url);
    const method = (init && init.method) || 'GET';
    calls.push({ url: text, method, body: init && init.body ? JSON.parse(init.body) : null, init });
    if (o.offline) return Promise.reject(new TypeError('Failed to fetch'));
    // Every guest route's path carries /bookings, so the longer ones are read
    // first and the plain POST .../bookings is what is left.
    const route = text.indexOf('/config') >= 0 ? 'config'
      : text.indexOf('/status') >= 0 ? 'status'
        : text.indexOf('/contact') >= 0 ? 'contact'
        : text.indexOf('/manage') >= 0 ? 'manage'
          : text.indexOf('/requests') >= 0 ? 'requests'
            : text.indexOf('/balance-checkout') >= 0 ? 'balance'
              : text.indexOf('/checkout-session') >= 0 ? 'checkout'
                : text.indexOf('/bookings') >= 0 ? 'bookings'
                  : text.indexOf('/availability') >= 0 ? 'availability'
                    : text.indexOf('/quote') >= 0 ? 'quote'
                      // GET /products/<ref>: the only route whose path takes
                      // a reference, so it is what is left of /products/.
                      : /\/products\/[^/?]+$/.test(text) ? 'product'
                        // GET /products with a query is the list; the single
                        // place is the one above, with a reference in the path.
                        : text.indexOf('/products') >= 0 ? 'products' : 'other';
    const steps = (o.script || {})[route];
    const step = steps && steps.length ? steps.shift() : null;
    if (step === 'offline') return Promise.reject(new TypeError('Failed to fetch'));
    if (typeof step === 'function') return step({ response, merged });
    if (step) return Promise.resolve(response(step.status, step.body, step.headers));
    const refuse = (o.refuse || {})[route];
    if (refuse) {
      const spec = typeof refuse === 'string' ? refusalFixture(refuse) : refuse;
      return Promise.resolve(response(spec.status, spec.body, o.headers));
    }
    if (route === 'config') return Promise.resolve(response(200, configResponse()));
    if (route === 'bookings') return Promise.resolve(response(BOOKING.status, merged(BOOKING, o.booking)));
    if (route === 'checkout') {
      return Promise.resolve(response(CHECKOUT.status, merged(CHECKOUT, o.checkout), o.headers));
    }
    if (route === 'availability') {
      return Promise.resolve(response(AVAILABILITY.status, merged(AVAILABILITY, o.availability)));
    }
    if (route === 'quote') return Promise.resolve(response(QUOTE.status, merged(QUOTE, o.quote)));
    if (route === 'product') {
      return Promise.resolve(response(PRODUCT_FIXTURE.status, merged(PRODUCT_FIXTURE, o.productData)));
    }
    if (route === 'products') return Promise.resolve(productsResponse());
    if (route === 'status') return Promise.resolve(response(STATUS.status, statusResponse()));
    if (route === 'contact') return Promise.resolve(response(CONTACT.status, clone(CONTACT.response)));
    if (route === 'manage') {
      return Promise.resolve(response(MANAGE.status, merged(MANAGE, o.manageData)));
    }
    if (route === 'requests') return Promise.resolve(response(REQUEST.status, merged(REQUEST, o.made)));
    if (route === 'balance') {
      return Promise.resolve(response(BALANCE.status, merged(BALANCE, o.balance), o.headers));
    }
    return Promise.resolve(response(404, { detail: 'Not found' }));
  }

  // Where the browser was sent. The module leaves the page for the payment, so
  // the test has to see the address instead of following it.
  const redirects = [];
  // What the page itself listens for: pageshow, when the Back button restores
  // the page from the cache.
  const pageListeners = {};
  // The address bar. The manage link carries the token in the fragment, so the
  // test has to see what the module leaves behind in it.
  const location = {
    origin: 'https://example.org',
    pathname: '/apartament',
    search: o.search || '',
    hash: o.hash || '',
    get href() { return this.origin + this.pathname + this.search + this.hash; },
    assign(url) { redirects.push(String(url)); },
  };
  const replaced = [];
  const window = {
    document,
    location,
    history: {
      replaceState(state, title, url) {
        replaced.push(String(url));
        const text = String(url);
        const cut = text.indexOf('#');
        location.hash = cut < 0 ? '' : text.slice(cut);
        const ask = text.indexOf('?');
        location.search = ask < 0 ? '' : text.slice(ask, cut < 0 ? text.length : cut);
      },
    },
    addEventListener(type, fn) { (pageListeners[type] = pageListeners[type] || []).push(fn); },
    digi2: {
      // What the module would have written to the console log. A token must
      // never reach it either, so the test has to be able to read it.
      log(...a) { logs.push(JSON.stringify(a)); },
      emit(name, data) { events.push({ name, data }); },
      on() {},
      // The loader's responsive reader: the base value wins on a wide viewport.
      attr(el, name, fallback) {
        if (!el) return fallback === undefined ? null : fallback;
        let v = el.getAttribute(name);
        if (v === null) v = el.getAttribute('data-' + name);
        if (v === null) return fallback === undefined ? null : fallback;
        return String(v).split(';')[0];
      },
    },
  };

  // Timers are collected, not run: the test decides when a debounce fires.
  // clearTimeout really cancels, so flush() never runs a timer the module
  // dropped (the fetch timeout of a settled request, for one).
  const timers = [];
  const context = vm.createContext({
    window,
    document,
    console: { log() {}, warn(...a) { warnings.push(a.join(' ')); }, error(...a) { warnings.push(a.join(' ')); } },
    setTimeout(fn, ms) { timers.push({ fn, ms, live: true }); return timers.length; },
    clearTimeout(id) { if (timers[id - 1]) timers[id - 1].live = false; },
    JSON, Math, Promise, Object, Array, String, Number, isFinite, parseInt, parseFloat, encodeURIComponent, Intl,
    Date: o.now ? frozenClock(o.now) : Date,
    fetch: fetchStub,
  });
  vm.runInContext(o.code || moduleCode, context, { filename: modulePath });

  return {
    window,
    document,
    booking: window.digi2.booking,
    forms,
    form: forms[0],
    calls,
    events,
    warnings,
    logs,
    loaderTag,
    calendar,
    price,
    widget,
    ret,
    manage,
    results,
    searchForm,
    redirects,
    location,
    replaced,
    submit(form) { fire(form || forms[0], 'submit'); return this.settled(); },
    // The Back button bringing the page back from the browser cache.
    pageshow() {
      (pageListeners.pageshow || []).forEach((fn) => fn({ persisted: true }));
    },
    async settled() {
      for (let i = 0; i < 30; i++) await new Promise((r) => setImmediate(r));
    },
    // Every wait the module ever asked for, in the order it asked. The fetch
    // timeout is always FETCH_TIMEOUT_MS, so a test filters it out by value.
    waits() { return timers.map((t) => t.ms); },
    // Every timer still waiting fires now — the debounce the module set.
    // With a limit, only the waits up to it: an answer the test is holding back
    // must not be ended by the fetch timeout firing along with the debounce.
    flush(limit) {
      const due = timers.filter((t) => t.live && (limit === undefined || t.ms <= limit));
      due.forEach((t) => { t.live = false; t.fn(); });
      return due.length;
    },
    async tick(limit) { this.flush(limit); await this.settled(); },
  };
}

// ---------------------------------------------------------------------------
// The calendar, as the page sees it
// ---------------------------------------------------------------------------

function dayOf(env, key) {
  return env.document.querySelector('[d2-booking-day="' + key + '"]');
}

function clickDay(env, key) {
  const btn = dayOf(env, key);
  assert.ok(btn, 'the calendar shows ' + key);
  fire(btn, 'click');
  return btn;
}

function keyOn(el, key) {
  let prevented = 0;
  fire(el, 'keydown', { key, preventDefault() { prevented += 1; } });
  return prevented;
}

function statusText(env) {
  const el = env.document.querySelector('[d2-booking-status]');
  return el ? String(el.textContent || '') : '';
}

function totalText(env) {
  const el = env.document.querySelector('[d2-booking-total]');
  return el ? String(el.textContent || '') : '';
}

function lineRows(env) {
  return env.document.querySelectorAll('[d2-booking-line]');
}

function textIn(row, attrName) {
  const el = row.querySelector('[' + attrName + ']');
  return el ? String(el.textContent || '') : '';
}

function quoteCalls(env) {
  return env.calls.filter((c) => c.url.indexOf('/quote') >= 0);
}

function money(amount, currency, lang) {
  return new Intl.NumberFormat(lang || CONFIG.response.default_language, {
    style: 'currency', currency,
  }).format(Number(amount));
}

// The fixture's busy period is 2027-05-10T22:00:00Z → 2027-05-12T22:00:00Z.
// Europe/Warsaw is UTC+2 in May, so the nights taken are 11 and 12 May: the
// 11th cannot be an arrival, the 13th can, and the 11th can still be a
// departure (the nights of the 9th and 10th are free).
const BUSY_NIGHTS = ['2027-05-11', '2027-05-12'];
// The nights immediately around that period: free with no buffer, and taken
// once a whole day of buffer widens a booking.
const BUSY_EDGES = ['2027-05-10', '2027-05-13'];
// The same window said to be of another kind. `kind: null` is an answer that
// carries no kind field at all, which is what an older backend sends.
function busyOfKind(kind) {
  const period = {
    starts_at: AVAILABILITY.response.busy[0].starts_at,
    ends_at: AVAILABILITY.response.busy[0].ends_at,
  };
  if (kind !== null) period.kind = kind;
  return [period];
}
// A clock inside the fixture's window, so the calendar opens on May 2027.
const MAY_2027 = '2027-05-01T10:00:00Z';
const PRODUCT = AVAILABILITY.response.product_id;

const STAY = {
  product: BOOKING.response.product_id,
  unit: BOOKING.request.unit,
  starts_at: BOOKING.request.starts_at,
  units_count: BOOKING.request.units_count,
};

// Every field of booking.json's request, as the Designer would mark them up.
const FULL_FIELDS = {
  name: BOOKING.request.customer_name,
  email: BOOKING.request.customer_email,
  phone: BOOKING.request.customer_phone,
  note: BOOKING.request.customer_note,
  adults: BOOKING.request.adults,
  children: BOOKING.request.children,
  child_ages: BOOKING.request.child_ages.join(', '),
  pets: BOOKING.request.pets,
  pets_over_threshold: BOOKING.request.pets_over_threshold,
};

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

test('the module asks /config once for the whole page, with no credentials', async () => {
  // MUTACJA: drop the cached /config promise (fetch per caller) and the second
  // form fetches the config again.
  const env = page({ forms: [{ fields: { name: 'A', email: 'a@b.pl' } }, { fields: { name: 'B', email: 'b@b.pl' } }] });
  await env.settled();
  await env.booking.config();
  await env.booking.config();
  const configCalls = env.calls.filter((c) => c.url.indexOf('/config') >= 0);
  assert.equal(configCalls.length, 1, 'one /config call for the page');
  assert.equal(
    configCalls[0].url,
    'https://api.2destate.com/api/v1/public/sites/pk_test_123/config',
    'the production base address and the key from the loader tag'
  );
  assert.equal(configCalls[0].method, 'GET');
  assert.equal(configCalls[0].init.credentials, 'omit', 'no cookies, no credentials');
  assert.equal(configCalls[0].init.body, undefined, 'a GET carries no body');
});

test('the base address comes raw from the loader tag, so ; and @ survive', async () => {
  // MUTACJA: read d2-booking-api through digi2.attr and everything after ';'
  // is cut off, so the address points somewhere else.
  const env = page({ loaderAttrs: { 'd2-booking-api': 'https://stage.example.org/api/v1;x@2' } });
  await env.settled();
  assert.equal(
    env.calls[0].url,
    'https://stage.example.org/api/v1;x@2/public/sites/pk_test_123/config'
  );
});

test('an address that is not https is refused and production is used instead', async () => {
  // MUTACJA: accept any d2-booking-api value and the key leaves over plain http.
  const env = page({ loaderAttrs: { 'd2-booking-api': 'http://evil.example.org/api/v1' } });
  await env.settled();
  assert.ok(env.calls[0].url.indexOf('https://api.2destate.com/api/v1/') === 0, env.calls[0].url);
  assert.ok(env.warnings.some((w) => w.indexOf('d2-booking-api') >= 0), env.warnings.join(' | '));
});

test('without a site key the module makes no request at all', async () => {
  // MUTACJA: call the API with an empty key and every page without the
  // attribute hits /public/sites//config.
  const env = page({ key: '' });
  await env.settled();
  assert.deepEqual(env.calls, []);
  const result = await env.booking.config();
  assert.ok(result, 'the form still gets a usable config');
  assert.ok(env.warnings.some((w) => w.indexOf('d2-booking') >= 0), env.warnings.join(' | '));
});

test('every refusal becomes a typed reason, never the message from the body', async () => {
  // MUTACJA: copy detail.message into the refusal and the page shows the
  // backend's English text instead of our own sentence.
  const cases = [
    ['site_key_not_found', 'config', {}],
    ['too_many_requests', 'bookings', {}],
    // errors.json gives 502 to the two payment routes, which is why this one
    // is the only case that has to ask for the reason by name.
    ['payment_provider_unavailable', 'bookings', { badGateway: 'payment_provider_unavailable' }],
    ['period_taken', 'bookings', {}],
    ['request_too_large', 'bookings', {}],
  ];
  for (const [name, route, opts] of cases) {
    const spec = refusalFixture(name);
    const env = page({ refuse: { [route]: name } });
    await env.settled();
    const res = route === 'config'
      ? await env.booking.request('GET', '/config', { notFound: 'site_key_not_found' })
      : await env.booking.request('POST', '/products/x/bookings', Object.assign({ body: {} }, opts));
    assert.equal(res.ok, false, name);
    assert.equal(res.reason, name, name + ' → reason');
    assert.equal(res.status, spec.status, name + ' → status');
    assert.ok(res.message && res.message.length > 5, name + ' → human message');
    const text = spec.body && spec.body.detail && spec.body.detail.message;
    if (text) assert.ok(res.message.indexOf(text) < 0, name + ': the body text is not shown');
  }
});

test('429 carries the Retry-After seconds', async () => {
  // MUTACJA: ignore the Retry-After header and the page cannot say how long
  // the guest has to wait.
  const env = page({ refuse: { bookings: 'too_many_requests' }, headers: { 'Retry-After': '45' } });
  await env.settled();
  const res = await env.booking.request('POST', '/products/x/bookings', { body: {} });
  assert.equal(res.reason, 'too_many_requests');
  assert.equal(res.retryAfter, 45);
});

test('rental_rules keeps its violation codes', async () => {
  // MUTACJA: drop detail.violations and the calendar cannot say why the stay
  // was refused.
  const env = page({ refuse: { bookings: 'rental_rules' } });
  await env.settled();
  const res = await env.booking.request('POST', '/products/x/bookings', { body: {} });
  assert.equal(res.reason, 'rental_rules');
  assert.deepEqual(res.violations, ['period_taken']);
  assert.ok(res.message.length > 5);
});

test('a dead network or a domain outside the key list reads as one network refusal', async () => {
  // MUTACJA: let the rejected fetch escape and the submit button stays stuck
  // with no message at all.
  const env = page({ offline: true });
  await env.settled();
  const res = await env.booking.request('GET', '/config', {});
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'network_error');
  assert.ok(res.message.length > 5);
});

test('a refusal with an unknown reason still shows a human message', async () => {
  // MUTACJA: return MESSAGES[reason] without a fallback and an unknown reason
  // leaves the guest with "undefined" or an empty box.
  const env = page({
    forms: [{ fields: FULL_FIELDS }],
    refuse: { bookings: { status: 409, body: { detail: { reason: 'moon_phase_wrong', message: 'The moon says no' } } } },
  });
  await env.settled();
  const res = await env.booking.book(env.form, STAY);
  assert.equal(res.reason, 'moon_phase_wrong');
  assert.equal(typeof res.message, 'string');
  assert.ok(res.message.length > 5, 'a sentence the guest can read: ' + res.message);
  assert.ok(res.message.indexOf('The moon says no') < 0, 'not the backend text');
  assert.ok(errorTextOf(env.form, 'form').length > 5, 'and it lands on the form');
});

// ---------------------------------------------------------------------------
// The form
// ---------------------------------------------------------------------------

test('a filled form sends exactly the body from booking.json', async () => {
  // MUTACJA: rename one payload key (customer_note → note, child_ages → ages)
  // and the request no longer matches the contract.
  const env = page({ forms: [{ fields: FULL_FIELDS }] });
  await env.settled();
  const res = await env.booking.book(env.form, STAY);
  assert.equal(res.ok, true, 'created: ' + JSON.stringify(res));
  const post = env.calls.filter((c) => c.method === 'POST')[0];
  assert.equal(
    post.url,
    'https://api.2destate.com/api/v1/public/sites/pk_test_123/products/'
      + BOOKING.response.product_id + '/bookings'
  );
  assert.equal(post.init.headers['Content-Type'], 'application/json');
  assert.deepEqual(post.body, BOOKING.request);
});

test('guests is adults plus children and never contradicts them', async () => {
  // MUTACJA: send guests from a field of its own (or adults only) and the
  // backend answers 422 for a contradicting guests.
  const env = page({ forms: [{ fields: { name: 'A', email: 'a@b.pl', adults: 2, children: 3 } }] });
  await env.settled();
  await env.booking.book(env.form, STAY);
  const post = env.calls.filter((c) => c.method === 'POST')[0];
  assert.equal(post.body.guests, 5);
  assert.equal(post.body.adults, 2);
  assert.equal(post.body.children, 3);
});

test('a field switched off in /config disappears from the DOM and is never sent', async () => {
  // MUTACJA: leave an "off" field in the page and the guest fills a field the
  // key does not ask for, which then rides along in the request.
  const env = page({
    config: { form_fields: { phone: 'optional', children: 'optional', child_ages: 'optional', pets: 'off', note: 'off' } },
    forms: [{ fields: FULL_FIELDS }],
  });
  await env.settled();
  assert.equal(fieldOf(env.form, 'note'), null, 'note is gone');
  assert.equal(fieldOf(env.form, 'pets'), null, 'pets is gone');
  assert.equal(fieldOf(env.form, 'pets_over_threshold'), null, 'and so is the pets sub-question');
  assert.ok(fieldOf(env.form, 'phone'), 'an optional field stays');
  await env.booking.book(env.form, STAY);
  const post = env.calls.filter((c) => c.method === 'POST')[0];
  assert.equal('customer_note' in post.body, false);
  assert.equal('pets' in post.body, false);
  assert.equal('pets_over_threshold' in post.body, false);
});

test('a group holding several fields loses only the field the key switched off', async () => {
  // MUTACJA: always remove the whole d2-booking-field-group and one "off" field
  // takes its neighbours with it — the guest count disappears from the page.
  const env = page({
    config: { form_fields: { phone: 'optional', children: 'off', child_ages: 'off', pets: 'optional', note: 'optional' } },
    forms: [{ fields: { name: 'A', email: 'a@b.pl' } }],
  });
  // One group, three fields and the message slot of the one that goes.
  const group = element({ 'd2-booking-field-group': '' }, 'div');
  group.appendChild(fieldEl('adults', 2));
  group.appendChild(fieldEl('children', 1));
  group.appendChild(fieldEl('child_ages', '7'));
  group.appendChild(element({ 'd2-booking-error': 'children' }, 'div'));
  env.form.appendChild(group);
  await env.booking.apply();

  assert.ok(fieldOf(env.form, 'adults'), 'the guest count survives');
  assert.equal(fieldOf(env.form, 'children'), null);
  assert.equal(fieldOf(env.form, 'child_ages'), null);
  assert.equal(group.parentNode, env.form, 'the shared group itself stays');
  assert.equal(env.form.querySelector('[d2-booking-error="children"]'), null,
    'and the message slot of the removed field goes with it');
});

test('children switched off also drops adults from the request, guests stays the sum', async () => {
  // MUTACJA: keep sending adults with children off and the booking claims two
  // adults for a stay priced for a different group (contract: KONTRAKT.md).
  const env = page({
    config: { form_fields: { phone: 'optional', children: 'off', child_ages: 'off', pets: 'optional', note: 'optional' } },
    forms: [{ fields: FULL_FIELDS }],
  });
  await env.settled();
  assert.equal(fieldOf(env.form, 'children'), null);
  assert.equal(fieldOf(env.form, 'child_ages'), null, 'the ages question goes with children');
  assert.ok(fieldOf(env.form, 'adults'), 'adults stays — it is the guest count now');
  await env.booking.book(env.form, STAY);
  const post = env.calls.filter((c) => c.method === 'POST')[0];
  assert.equal('adults' in post.body, false);
  assert.equal('children' in post.body, false);
  assert.equal('child_ages' in post.body, false);
  assert.equal(post.body.guests, BOOKING.request.adults);
});

test('an optional field is sent only when the guest filled it', async () => {
  // MUTACJA: send every optional field, empty ones included, and the booking
  // carries customer_phone: "" where the key expected nothing.
  const env = page({ forms: [{ fields: { name: 'A', email: 'a@b.pl', phone: '', note: '  ' } }] });
  await env.settled();
  const res = await env.booking.book(env.form, STAY);
  assert.equal(res.ok, true, JSON.stringify(res));
  const post = env.calls.filter((c) => c.method === 'POST')[0];
  assert.equal('customer_phone' in post.body, false);
  assert.equal('customer_note' in post.body, false);
});

test('a field required by /config blocks submit with a message on that field', async () => {
  // MUTACJA: stop checking "required" before the POST and an empty required
  // field goes to the backend, which answers 422 after a round trip.
  const env = page({
    config: { form_fields: { phone: 'required', children: 'optional', child_ages: 'optional', pets: 'optional', note: 'optional' } },
    forms: [{ fields: { name: 'A', email: 'a@b.pl', phone: '' } }],
  });
  await env.settled();
  const phone = fieldOf(env.form, 'phone');
  assert.equal(phone.getAttribute('d2-booking-required'), '', 'marked required from /config');
  const res = await env.booking.book(env.form, STAY);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'form_invalid');
  assert.equal(env.calls.filter((c) => c.method === 'POST').length, 0, 'nothing was sent');
  assert.equal(phone.getAttribute('d2-booking-invalid'), '');
  assert.equal(phone.getAttribute('aria-invalid'), 'true');
  assert.ok(errorTextOf(env.form, 'phone').length > 2, 'a message on the field');
});

test('name and email are required even though /config does not mention them', async () => {
  // MUTACJA: take required-ness from form_fields alone and a booking with no
  // name or e-mail is attempted.
  const env = page({ forms: [{ fields: { name: '', email: 'not-an-address' } }] });
  await env.settled();
  const res = await env.booking.book(env.form, STAY);
  assert.equal(res.ok, false);
  assert.equal(env.calls.filter((c) => c.method === 'POST').length, 0);
  assert.ok(errorTextOf(env.form, 'name').length > 2, 'name: ' + errorTextOf(env.form, 'name'));
  assert.ok(errorTextOf(env.form, 'email').length > 2, 'e-mail: ' + errorTextOf(env.form, 'email'));
});

test('a message slot the Designer prepared is used instead of a built one', async () => {
  // MUTACJA: always build a new message element and the Designer's styled slot
  // stays empty while an unstyled box appears next to the field.
  const env = page({ forms: [{ fields: { name: '', email: 'a@b.pl' }, errorSlots: ['name'] }] });
  await env.settled();
  await env.booking.book(env.form, STAY);
  const slots = env.form.querySelectorAll('[d2-booking-error="name"]');
  assert.equal(slots.length, 1, 'no second message element was built');
  assert.ok(String(slots[0].textContent).length > 2);
  assert.equal(slots[0].getAttribute('d2-booking-built'), null, 'it is the page\'s own element');
});

test('a child age above child_max_age is caught in the browser, kindly', async () => {
  // MUTACJA: skip the child_max_age check and the guest waits for a 422
  // field_invalid round trip instead of seeing it at once.
  const env = page({ forms: [{ fields: { name: 'A', email: 'a@b.pl', adults: 2, children: 1, child_ages: '15' } }] });
  await env.settled();
  const res = await env.booking.book(env.form, STAY);
  assert.equal(res.ok, false);
  assert.equal(env.calls.filter((c) => c.method === 'POST').length, 0);
  assert.ok(errorTextOf(env.form, 'child_ages').indexOf(String(CONFIG.response.child_max_age)) >= 0,
    'the message names the limit: ' + errorTextOf(env.form, 'child_ages'));
});

test('one age per child: a shorter list blocks submit', async () => {
  // MUTACJA: send child_ages of any length and the booking says two children
  // while naming one age.
  const env = page({ forms: [{ fields: { name: 'A', email: 'a@b.pl', adults: 2, children: 2, child_ages: '7' } }] });
  await env.settled();
  const res = await env.booking.book(env.form, STAY);
  assert.equal(res.ok, false);
  assert.ok(errorTextOf(env.form, 'child_ages').length > 2);
});

test('pets_over_threshold cannot be larger than pets', async () => {
  // MUTACJA: drop the comparison and the request charges a pet fee for more
  // heavy pets than there are pets.
  const env = page({ forms: [{ fields: { name: 'A', email: 'a@b.pl', pets: 1, pets_over_threshold: 2 } }] });
  await env.settled();
  const res = await env.booking.book(env.form, STAY);
  assert.equal(res.ok, false);
  assert.equal(env.calls.filter((c) => c.method === 'POST').length, 0);
  assert.ok(errorTextOf(env.form, 'pets_over_threshold').length > 2);
});

test('children without adults is caught before the backend says 422', async () => {
  // MUTACJA: let children ride without adults and the backend refuses with
  // 422, because guests cannot be worked out.
  const env = page({ forms: [{ fields: { name: 'A', email: 'a@b.pl', adults: '', children: 2 } }] });
  await env.settled();
  const res = await env.booking.book(env.form, STAY);
  assert.equal(res.ok, false);
  assert.equal(env.calls.filter((c) => c.method === 'POST').length, 0);
  assert.ok(errorTextOf(env.form, 'adults').length > 2);
});

test('422 field_required lands on the field the backend named', async () => {
  // MUTACJA: show the refusal on the form instead of the field and the guest
  // has to guess which answer is missing.
  const required = refusalFixture('field_required');
  const env = page({
    // The key asks for the phone, the browser check is out of the way: only the
    // backend refuses here.
    forms: [{ fields: { name: 'A', email: 'a@b.pl', phone: '+48 600 700 800' } }],
    refuse: { bookings: 'field_required' },
  });
  await env.settled();
  const res = await env.booking.book(env.form, STAY);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'field_required');
  assert.equal(res.field, required.body.detail.field);
  const phone = fieldOf(env.form, 'phone');
  assert.equal(phone.getAttribute('d2-booking-invalid'), '');
  assert.ok(errorTextOf(env.form, 'phone').length > 2);
});

test('422 validation_error lands on the field from loc', async () => {
  // MUTACJA: ignore detail[].loc and a refusal about the e-mail shows up on
  // the form, with every field looking fine.
  const env = page({
    forms: [{ fields: { name: 'A', email: 'a@b.pl' } }],
    refuse: {
      bookings: {
        status: 422,
        body: { detail: [{ type: 'string_pattern_mismatch', loc: ['body', 'customer_email'], msg: 'bad', input: {} }] },
      },
    },
  });
  await env.settled();
  const res = await env.booking.book(env.form, STAY);
  assert.equal(res.reason, 'validation_error');
  assert.equal(res.field, 'email', 'customer_email is the page\'s email field');
  assert.equal(fieldOf(env.form, 'email').getAttribute('d2-booking-invalid'), '');
  assert.ok(errorTextOf(env.form, 'email').length > 2);
});

test('a refusal about a field the key switched off falls back to the form', async () => {
  // MUTACJA: write the message into a removed element and nothing is shown at
  // all: the guest sees a form that does nothing on submit.
  const env = page({
    config: { form_fields: { phone: 'off', children: 'optional', child_ages: 'optional', pets: 'optional', note: 'optional' } },
    forms: [{ fields: { name: 'A', email: 'a@b.pl', phone: '+48 1' } }],
    refuse: { bookings: 'field_required' },
  });
  await env.settled();
  const res = await env.booking.book(env.form, STAY);
  assert.equal(res.reason, 'field_required');
  assert.ok(errorTextOf(env.form, 'form').length > 5, 'the form carries the message');
});

test('a second attempt clears the messages of the first', async () => {
  // MUTACJA: stop clearing old messages and a fixed field keeps its red text
  // for the rest of the visit.
  const env = page({ forms: [{ fields: { name: '', email: 'a@b.pl' } }] });
  await env.settled();
  await env.booking.book(env.form, STAY);
  assert.ok(errorTextOf(env.form, 'name').length > 2);
  fieldOf(env.form, 'name').value = 'Anna';
  const res = await env.booking.book(env.form, STAY);
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(errorTextOf(env.form, 'name'), '');
  assert.equal(fieldOf(env.form, 'name').getAttribute('d2-booking-invalid'), null);
});

test('submit on the form goes through the module, with no page reload', async () => {
  // MUTACJA: skip preventDefault (or never bind submit) and Webflow posts the
  // form to its own handler, reloading the page.
  let prevented = 0;
  const env = page({ forms: [{ fields: FULL_FIELDS, attrs: { 'd2-booking-product': BOOKING.response.product_id } }] });
  await env.settled();
  env.booking.select({ unit: STAY.unit, starts_at: STAY.starts_at, units_count: STAY.units_count });
  fire(env.form, 'submit', { preventDefault() { prevented += 1; } });
  await env.settled();
  assert.equal(prevented, 1, 'the browser submit was stopped');
  const post = env.calls.filter((c) => c.method === 'POST')[0];
  assert.ok(post, 'the booking was sent');
  assert.deepEqual(post.body, BOOKING.request);
  assert.ok(env.events.some((e) => e.name === 'booking:created'), 'and the page is told');
});

test('submit without a chosen stay asks for a date instead of calling the API', async () => {
  // MUTACJA: send the booking with no starts_at and the backend answers 422
  // validation_error on a form that looked complete.
  const env = page({ forms: [{ fields: FULL_FIELDS }] });
  await env.settled();
  const res = await env.booking.book(env.form, null);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'stay_required');
  assert.equal(env.calls.filter((c) => c.method === 'POST').length, 0);
  assert.ok(errorTextOf(env.form, 'form').length > 5);
});

test('an unreachable /config leaves the form usable and the backend deciding', async () => {
  // MUTACJA: block the form when /config fails and one hiccup in the API takes
  // the whole booking page down.
  const env = page({ refuse: { config: 'site_key_not_found' }, forms: [{ fields: FULL_FIELDS }] });
  await env.settled();
  assert.ok(fieldOf(env.form, 'note'), 'nothing was removed on a guess');
  const res = await env.booking.book(env.form, STAY);
  assert.equal(res.ok, true, 'the booking was attempted: ' + JSON.stringify(res));
  assert.equal(env.calls.filter((c) => c.method === 'POST').length, 1);
});

test('the page language is sent when the key speaks it', async () => {
  // MUTACJA: always send default_language and a guest reading the English page
  // gets Polish e-mails.
  const env = page({ lang: 'en-GB', forms: [{ fields: { name: 'A', email: 'a@b.pl' } }] });
  await env.settled();
  await env.booking.book(env.form, STAY);
  assert.equal(env.calls.filter((c) => c.method === 'POST')[0].body.locale, 'en');

  const other = page({ lang: 'de', forms: [{ fields: { name: 'A', email: 'a@b.pl' } }] });
  await other.settled();
  await other.booking.book(other.form, STAY);
  assert.equal(
    other.calls.filter((c) => c.method === 'POST')[0].body.locale,
    CONFIG.response.default_language,
    'a language the key does not have falls back to its default'
  );
});

test('a double click sends one booking', async () => {
  // MUTACJA: drop the busy guard and an impatient guest creates two bookings
  // and two holds on the same period.
  const env = page({ forms: [{ fields: FULL_FIELDS, attrs: { 'd2-booking-product': BOOKING.response.product_id } }] });
  await env.settled();
  env.booking.select({ unit: STAY.unit, starts_at: STAY.starts_at, units_count: STAY.units_count });
  fire(env.form, 'submit');
  fire(env.form, 'submit');
  await env.settled();
  // Submit also opens the payment, so the booking route is counted on its own.
  assert.equal(env.calls.filter((c) => c.method === 'POST' && /\/bookings$/.test(c.url)).length, 1);
});

test('an unknown d2-booking-field value is reported, not guessed', async () => {
  // MUTACJA: pass unknown field names into the payload and a typo invents a
  // request field the contract has never heard of.
  const env = page({ forms: [{ fields: { name: 'A', email: 'a@b.pl', surname: 'Nowak' } }] });
  await env.settled();
  await env.booking.book(env.form, STAY);
  const post = env.calls.filter((c) => c.method === 'POST')[0];
  assert.equal('surname' in post.body, false);
  assert.ok(env.warnings.some((w) => w.indexOf('surname') >= 0), env.warnings.join(' | '));
});

// ---------------------------------------------------------------------------
// The calendar
// ---------------------------------------------------------------------------

function calendarPage(extra) {
  return page(Object.assign({
    now: MAY_2027,
    calendar: true,
    loaderAttrs: { 'd2-booking-product': PRODUCT },
    forms: [{ fields: { name: 'Anna Nowak', email: 'anna@example.com' } }],
  }, extra || {}));
}

function availabilityCalls(env) {
  return env.calls.filter((c) => c.url.indexOf('/availability') >= 0);
}

function productCalls(env) {
  return env.calls.filter((c) => c.method === 'GET' && /\/products\/[^/?]+$/.test(c.url));
}

test('the calendar asks for the shown month and draws it as real buttons', async () => {
  // MUTACJA: draw the days as <div>s (or drop the aria-label) and a screen
  // reader announces a grid of bare numbers that cannot be reached by keyboard.
  const env = calendarPage();
  await env.settled();

  const got = availabilityCalls(env);
  assert.equal(got.length, 1, 'one window for the shown month');
  assert.ok(
    got[0].url.indexOf('date_from=' + encodeURIComponent('2027-05-01T00:00:00')) >= 0
    && got[0].url.indexOf('date_to=' + encodeURIComponent('2027-06-01T00:00:00')) >= 0,
    got[0].url
  );

  const days = env.document.querySelectorAll('[d2-booking-day]');
  assert.equal(days.length, 31, 'May has 31 days');
  days.forEach((btn) => {
    assert.equal(btn.tagName, 'BUTTON', 'a real button, not a div');
    assert.equal(btn.getAttribute('type'), 'button', 'never submits the form around it');
    assert.ok(String(btn.getAttribute('aria-label') || '').length > 5, 'every day says its date out loud');
  });
  assert.equal(
    days.filter((b) => b.getAttribute('tabindex') === '0').length, 1,
    'one stop in the tab order, the rest reached with the arrows'
  );
  const grid = env.document.querySelector('[d2-booking-calendar-grid]');
  assert.equal(grid.getAttribute('role'), 'grid');
  assert.ok(grid.getAttribute('aria-labelledby'), 'the grid is named by the month caption');
});

test('a busy night cannot be an arrival', async () => {
  // MUTACJA: ignore the busy list from the availability answer and the guest
  // books a period someone else already has.
  const env = calendarPage();
  await env.settled();

  BUSY_NIGHTS.forEach((key) => {
    const btn = dayOf(env, key);
    assert.equal(btn.getAttribute('aria-disabled'), 'true', key + ' is taken');
    assert.equal(btn.getAttribute('d2-booking-day-busy'), '', key + ' is marked for the stylesheet');
    assert.ok(String(btn.getAttribute('aria-label')).length > 10);
  });
  assert.equal(dayOf(env, '2027-05-09').getAttribute('aria-disabled'), null, 'a free night is not disabled');

  clickDay(env, BUSY_NIGHTS[0]);
  await env.settled();
  assert.equal(env.booking.stay(), null, 'nothing was chosen');
  assert.equal(
    env.document.querySelectorAll('[d2-booking-day-selected]').length, 0,
    'and no day pretends it was'
  );
});

test('the first busy day is still a departure: the nights before it are free', async () => {
  // MUTACJA: treat the busy end date as a busy night and both edges of a taken
  // period are lost — the last free stay before it cannot be booked and the
  // day it ends cannot be an arrival, so a free night is sold to nobody.
  const env = calendarPage();
  await env.settled();
  clickDay(env, '2027-05-09');
  clickDay(env, '2027-05-11');
  await env.settled();
  assert.deepEqual(env.booking.stay(), {
    product: PRODUCT,
    unit: 'day',
    starts_at: '2027-05-09T00:00:00',
    units_count: 2,
  });

  // The period ends at local midnight on the 13th, so the night of the 13th is
  // free and the guest before it left that morning.
  const after = dayOf(env, '2027-05-13');
  assert.equal(after.getAttribute('d2-booking-day-busy'), null, 'the 13th is a free night');
  assert.equal(after.getAttribute('aria-disabled'), null);
  clickDay(env, '2027-05-13');
  clickDay(env, '2027-05-14');
  await env.settled();
  assert.equal(env.booking.stay().starts_at, '2027-05-13T00:00:00', 'and an arrival of its own');
});

test('a range cannot be dragged across a busy period', async () => {
  // MUTACJA: check only the two ends of the range and a stay that swallows a
  // taken period is sent to the backend as if it were free.
  const env = calendarPage();
  await env.settled();
  clickDay(env, '2027-05-09');
  clickDay(env, '2027-05-13');
  await env.settled();
  assert.equal(env.booking.stay(), null, 'the departure was refused');
  assert.equal(dayOf(env, '2027-05-09').getAttribute('d2-booking-day-selected'), '', 'the arrival stays');
  assert.equal(statusText(env), env.booking.message('period_taken'), statusText(env));
});

test('a stay under the minimum is refused with the number from the answer', async () => {
  // MUTACJA: ignore min_units and the guest picks two nights, waits for the
  // price and only then learns the owner wants three.
  const env = calendarPage({ availability: { min_units: 3 }, price: true });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  await env.tick();
  assert.equal(env.booking.stay(), null, 'two nights were refused');
  assert.ok(statusText(env).indexOf('3') >= 0, statusText(env));
  assert.equal(quoteCalls(env).length, 0, 'and no price was asked for');

  clickDay(env, '2027-05-05');
  await env.settled();
  assert.equal(env.booking.stay().units_count, 3, 'three nights go through');
});

test('a stay over the maximum is refused too', async () => {
  // MUTACJA: ignore max_units and a 14-night cap lets someone book a year.
  const env = calendarPage({ availability: { max_units: 2 } });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-05');
  await env.settled();
  assert.equal(env.booking.stay(), null);
  assert.ok(statusText(env).indexOf('2') >= 0, statusText(env));
});

test('lead time closes the days that are already too close', async () => {
  // MUTACJA: ignore lead_time_hours and a key that needs two days of notice
  // takes a booking for tomorrow, which the backend then refuses.
  const env = calendarPage({ availability: { lead_time_hours: 48 } });
  await env.settled();
  // 10:00 UTC + 48 h is 12:00 on May 3 in Warsaw. A stay starts at midnight, so
  // May 3 is already behind that moment and May 4 is the first one the backend takes.
  ['2027-05-01', '2027-05-02', '2027-05-03'].forEach((key) => {
    const btn = dayOf(env, key);
    assert.equal(btn.getAttribute('aria-disabled'), 'true', key + ' is inside the notice period');
    assert.equal(btn.getAttribute('d2-booking-day-past'), '');
  });
  assert.equal(dayOf(env, '2027-05-04').getAttribute('aria-disabled'), null, 'the first allowed day is open');
  clickDay(env, '2027-05-01');
  await env.settled();
  assert.equal(env.booking.stay(), null);
});

test('the arrow keys walk the grid and carry the focus into the next month', async () => {
  // MUTACJA: drop the keydown handler (or keep tabindex="0" on every day) and
  // the calendar can only be used with a mouse.
  const env = calendarPage();
  await env.settled();
  const first = dayOf(env, '2027-05-02');
  assert.equal(first.getAttribute('tabindex'), '0', 'the focus starts on the first day on offer');

  assert.equal(keyOn(first, 'ArrowRight'), 1, 'the browser must not scroll the page');
  assert.equal(env.document.activeElement, dayOf(env, '2027-05-03'));
  assert.equal(dayOf(env, '2027-05-03').getAttribute('tabindex'), '0');
  assert.equal(dayOf(env, '2027-05-02').getAttribute('tabindex'), '-1', 'one stop at a time');

  keyOn(dayOf(env, '2027-05-03'), 'ArrowDown');
  assert.equal(env.document.activeElement, dayOf(env, '2027-05-10'), 'a week down');

  keyOn(dayOf(env, '2027-05-01'), 'ArrowLeft');
  await env.settled();
  assert.ok(dayOf(env, '2027-04-30'), 'the month before was drawn');
  assert.equal(env.document.activeElement, dayOf(env, '2027-04-30'));
});

test('the chosen range is announced, not only coloured', async () => {
  // MUTACJA: stop writing to the live region and a screen-reader user never
  // learns which period they just picked.
  const env = calendarPage();
  await env.settled();
  const live = env.document.querySelector('[d2-booking-status]');
  assert.equal(live.getAttribute('role'), 'status');
  assert.equal(live.getAttribute('aria-live'), 'polite');

  clickDay(env, '2027-05-09');
  await env.settled();
  assert.ok(statusText(env).length > 10, 'the arrival is said out loud: ' + statusText(env));
  const afterArrival = statusText(env);

  clickDay(env, '2027-05-11');
  await env.settled();
  assert.notEqual(statusText(env), afterArrival, 'and so is the finished range');
  assert.ok(/2/.test(statusText(env)), 'with the number of nights: ' + statusText(env));
});

test('one availability window per month, kept for the visit', async () => {
  // MUTACJA: fetch on every render and walking two months back and forth
  // hammers the API (and the rate limit) for windows already answered.
  const env = calendarPage();
  await env.settled();
  assert.equal(availabilityCalls(env).length, 1);

  fire(env.document.querySelector('[d2-booking-calendar-next]'), 'click');
  await env.settled();
  const second = availabilityCalls(env);
  assert.equal(second.length, 2, 'the next month has its own window');
  assert.ok(second[1].url.indexOf('date_from=' + encodeURIComponent('2027-06-01T00:00:00')) >= 0, second[1].url);

  fire(env.document.querySelector('[d2-booking-calendar-prev]'), 'click');
  await env.settled();
  assert.equal(availabilityCalls(env).length, 2, 'May was already answered');
  assert.ok(dayOf(env, '2027-05-11').getAttribute('d2-booking-day-busy') !== null, 'and still knows it is busy');
});

test('an unreadable availability leaves the month usable and says so in the console', async () => {
  // MUTACJA: close the calendar when the window cannot be read and one hiccup
  // in the API takes the booking page down; the backend decides anyway.
  const env = calendarPage({ refuse: { availability: 'too_many_requests' } });
  await env.settled();
  assert.equal(env.document.querySelectorAll('[d2-booking-day]').length, 31, 'the month is still drawn');
  assert.equal(env.document.querySelectorAll('[d2-booking-day-busy]').length, 0, 'nothing is guessed as busy');
  assert.ok(env.warnings.some((w) => w.indexOf('availability') >= 0), env.warnings.join(' | '));
  clickDay(env, '2027-05-09');
  clickDay(env, '2027-05-11');
  await env.settled();
  assert.ok(env.booking.stay(), 'and the guest can still choose');
});

// ---------------------------------------------------------------------------
// The price
// ---------------------------------------------------------------------------

test('quote is asked once per settled change, with the contract body', async () => {
  // MUTACJA: drop the debounce and every keystroke in the guest count is its
  // own quote call; or send the whole form body and quote carries the name,
  // the e-mail and the note of a guest who has not booked anything yet.
  const env = calendarPage({ price: true, forms: [{ fields: FULL_FIELDS }] });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  fire(env.form, 'input');
  fire(env.form, 'change');
  assert.equal(quoteCalls(env).length, 0, 'nothing is sent while the guest is still clicking');

  await env.tick();
  const got = quoteCalls(env);
  assert.equal(got.length, 1, 'one call for the whole burst');
  assert.equal(got[0].method, 'POST');
  assert.ok(got[0].url.indexOf('/products/' + PRODUCT + '/quote') >= 0, got[0].url);
  assert.deepEqual(got[0].body, Object.assign({}, QUOTE.request, { starts_at: '2027-05-02T00:00:00' }),
    'exactly the contract request, for the day that was clicked');
});

test('no price is asked for before the range is finished', async () => {
  // MUTACJA: quote on the arrival alone and the backend answers 422 about a
  // units_count the guest never chose.
  const env = calendarPage({ price: true });
  await env.settled();
  clickDay(env, '2027-05-09');
  await env.tick();
  assert.equal(quoteCalls(env).length, 0);
  assert.equal(totalText(env), '');

  // The same guard holds for a page that drives the stay itself: half a stay
  // is not a stay, and a missing length must never quietly become one night.
  env.booking.select({ product: PRODUCT, unit: 'day', starts_at: '2027-05-09T00:00:00' });
  await env.tick();
  assert.equal(quoteCalls(env).length, 0, 'a stay with no length asks for nothing');

  env.booking.select({ product: PRODUCT, unit: 'day', starts_at: '2027-05-09T00:00:00', units_count: 2 });
  await env.tick();
  assert.equal(quoteCalls(env).length, 1, 'and the whole stay does');
});

test('the printed total is the amount from the answer, never a sum of the rows', async () => {
  // MUTACJA: add up line_items in the browser and every discount, surcharge
  // and rounding the owner set server-side is quietly thrown away.
  const env = calendarPage({ price: true, quote: { amount_total: '480.00' } });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  await env.tick();
  assert.equal(totalText(env), money('480.00', QUOTE.response.currency), totalText(env));
  assert.notEqual(totalText(env), money('550.00', QUOTE.response.currency), 'not the sum of the two rows');
});

test('the amounts are formatted in the config language and the answer currency', async () => {
  // MUTACJA: hard-code zł (or the browser locale) and a key selling in euro
  // shows the wrong currency next to the right number.
  const env = calendarPage({ price: true, quote: { currency: 'EUR' } });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  await env.tick();
  assert.equal(totalText(env), money(QUOTE.response.amount_total, 'EUR'), totalText(env));
  assert.notEqual(totalText(env), money(QUOTE.response.amount_total, 'PLN'));
});

test('the breakdown is one row per line of the answer, from the template the page gave', async () => {
  // MUTACJA: ignore the template and draw our own rows — the price list loses
  // the styling of the site and shows up unstyled.
  const env = calendarPage({ price: { template: true } });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  await env.tick();

  const rows = lineRows(env);
  assert.equal(rows.length, QUOTE.response.line_items.length, 'one row per line');
  rows.forEach((row, i) => {
    const line = QUOTE.response.line_items[i];
    assert.equal(row.getAttribute('class'), 'price-row', 'the page template was cloned');
    assert.equal(row.getAttribute('d2-booking-line-kind'), line.kind);
    assert.ok(textIn(row, 'd2-booking-line-label').length > 2, 'the kind got a sentence');
    assert.equal(textIn(row, 'd2-booking-line-amount'), money(line.amount, QUOTE.response.currency));
  });
  assert.ok(
    textIn(rows[0], 'd2-booking-line-detail').indexOf(money(QUOTE.response.line_items[0].unit_amount, 'PLN')) >= 0,
    'and the nightly rate: ' + textIn(rows[0], 'd2-booking-line-detail')
  );
});

test('without a template the module draws plain rows of its own', async () => {
  // MUTACJA: need a template and a page that only put the container in shows
  // an empty price list.
  const env = calendarPage({ price: true });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  await env.tick();
  const rows = lineRows(env);
  assert.equal(rows.length, QUOTE.response.line_items.length);
  assert.equal(rows[0].getAttribute('d2-booking-built'), '', 'marked as ours, so CSS can tell');
  assert.equal(textIn(rows[1], 'd2-booking-line-amount'), money(QUOTE.response.line_items[1].amount, 'PLN'));
});

test('a second quote replaces the rows instead of piling them up', async () => {
  // MUTACJA: append the new rows and a guest who changes the dates twice sees
  // six rows and three totals.
  const env = calendarPage({ price: true });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  await env.tick();
  clickDay(env, '2027-05-05');
  clickDay(env, '2027-05-06');
  await env.tick();
  assert.equal(quoteCalls(env).length, 2);
  assert.equal(lineRows(env).length, QUOTE.response.line_items.length);
});

test('the deposit and the balance come from the minor units of the answer', async () => {
  // MUTACJA: print deposit_amount_minor as if it were złoty and a 165 zł
  // deposit turns into 16 500 zł.
  const env = calendarPage({ price: true });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  await env.tick();
  const deposit = env.document.querySelector('[d2-booking-deposit]');
  const balance = env.document.querySelector('[d2-booking-balance]');
  assert.equal(String(deposit.textContent), money(QUOTE.response.deposit_amount_minor / 100, 'PLN'));
  assert.equal(String(balance.textContent), money(QUOTE.response.balance_amount_minor / 100, 'PLN'));
});

test('nothing left to pay in advance empties the deposit instead of showing zero', async () => {
  // MUTACJA: format a null amount and the page shows "0,00 zł" to pay now.
  const env = calendarPage({ price: true, quote: { deposit_amount_minor: null, balance_amount_minor: null } });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  await env.tick();
  const deposit = env.document.querySelector('[d2-booking-deposit]');
  assert.equal(String(deposit.textContent), '');
  assert.equal(deposit.getAttribute('d2-booking-empty'), '');
});

test('a refused quote shows our own short sentence, not the backend text', async () => {
  // MUTACJA: show detail from the body and the guest reads "check_in and
  // check_out go together" in English under a Polish form.
  const env = calendarPage({ price: true, refuse: { quote: 'invalid_stay' } });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  await env.tick();
  assert.equal(statusText(env), env.booking.message('invalid_stay'));
  assert.ok(statusText(env).indexOf('check_in') < 0, statusText(env));
  assert.equal(totalText(env), '', 'and no price is left standing');
  assert.equal(lineRows(env).length, 0);
});

test('rental_rules is read through its violations, not as one blanket sentence', async () => {
  // MUTACJA: ignore detail.violations and every rule refusal becomes the same
  // vague sentence, so the guest cannot tell a taken period from a short stay.
  const env = calendarPage({ price: true, refuse: { quote: 'rental_rules' } });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  await env.tick();
  assert.equal(statusText(env), env.booking.message('period_taken'), statusText(env));
  assert.notEqual(statusText(env), env.booking.message('rental_rules'));
});

// The sentence a refused stay gets, through the quote answer's violations.
// One page per case: the rules the sentence takes its numbers from come from
// the availability answer, so each code is asked with the rules it needs.
async function refusedStaySays(availability, violations) {
  const env = calendarPage({ price: true, availability, quote: { available: false, violations } });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-05');
  await env.tick();
  return statusText(env);
}

test('a refused stay is named by the backend violation codes, not by field names', async () => {
  // MUTACJA: key VIOLATION_MESSAGES by the availability field names again
  // (min_units, max_units, lead_time, max_guests, closed) and every code the
  // backend really sends falls through to the generic sentence — the guest is
  // never told the shortest stay, the longest stay or that the party is too big.
  const generic = calendarPage().booking.message('rental_rules');

  assert.equal(await refusedStaySays({ min_units: 3 }, ['below_min_units']),
    'Najkrótszy pobyt to 3 noce.');
  assert.equal(await refusedStaySays({}, ['above_max_units']),
    'Najdłuższy pobyt to 30 nocy.');
  assert.equal(await refusedStaySays({}, ['too_many_guests']),
    'Za dużo osób na ten obiekt. Zmniejsz liczbę gości.');
  assert.equal(await refusedStaySays({}, ['blackout_overlap']),
    'W tym terminie obiekt nie przyjmuje gości.');
  assert.equal(await refusedStaySays({}, ['lead_time_too_short']),
    'Ten termin jest już za blisko. Wybierz późniejszy.');
  assert.equal(await refusedStaySays({}, ['buffer_conflict']),
    'Między pobytami musi zostać przerwa. Wybierz termin dzień dalej.');
  assert.equal(await refusedStaySays({}, ['period_taken']),
    calendarPage().booking.message('period_taken'));
  assert.equal(await refusedStaySays({}, ['unit_not_allowed']),
    'Taki pobyt nie jest tu dostępny.');

  // The two codes nothing in the module used to know: a stay the backend
  // cannot price, and a product that takes no bookings at all.
  const noPrice = await refusedStaySays({}, ['no_price_for_unit']);
  const notBookable = await refusedStaySays({}, ['product_not_bookable']);
  [noPrice, notBookable].forEach((said) => {
    assert.notEqual(said, generic, said);
    assert.ok(said.length > 10, said);
  });
  assert.notEqual(noPrice, notBookable);
});

test('a violation code the module does not know still reads as a sentence', async () => {
  // MUTACJA: write the raw code into the status region when the table has no
  // sentence for it and the guest reads "wobbly_rule" under a Polish form.
  const said = await refusedStaySays({}, ['some_rule_we_have_never_seen']);
  assert.equal(said, calendarPage().booking.message('rental_rules'));
  assert.ok(said.indexOf('some_rule') < 0, said);
  assert.ok(said.indexOf('{') < 0, said);
});

test('a 200 that says the stay is not available prints no price at all', async () => {
  // MUTACJA: print the total whenever the answer has one and the guest pays
  // for a stay the answer itself called unavailable.
  const env = calendarPage({ price: true, quote: { available: false, violations: ['below_min_units'] } });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  await env.tick();
  assert.equal(totalText(env), '');
  assert.equal(lineRows(env).length, 0);
  assert.ok(statusText(env).length > 10, statusText(env));
});

test('a status region the page built is the one that gets the sentence', async () => {
  // MUTACJA: look for the status region only inside the calendar and a page
  // that put its own next to the price gets a second, empty one built into the
  // calendar — two live regions, and a screen reader reading the wrong one.
  const env = calendarPage({ status: true });
  await env.settled();
  const regions = env.document.querySelectorAll('[d2-booking-status]');
  assert.equal(regions.length, 1, 'no second region was built');
  assert.equal(regions[0].getAttribute('d2-booking-built'), null, 'it is the page\'s own');

  clickDay(env, '2027-05-09');
  clickDay(env, '2027-05-11');
  await env.settled();
  assert.ok(String(regions[0].textContent).length > 10, statusText(env));
});

// ---------------------------------------------------------------------------
// The fallback look and the digi2 mark
// ---------------------------------------------------------------------------

function widgetPage(extra) {
  return page(Object.assign({
    now: MAY_2027,
    loaderAttrs: { 'd2-booking-product': PRODUCT },
    forms: [],
    widget: true,
  }, extra || {}));
}

function allOf(env, name) {
  return env.document.querySelectorAll('[' + name + ']');
}

function styleText(env) {
  const el = env.document.querySelector('[d2-booking-styles]');
  return el ? String(el.textContent || '') : '';
}

test('the fallback look is drawn inside d2-booking-widget and nowhere else', async () => {
  // MUTACJA: draw the widget on every page instead of only inside
  // [d2-booking-widget] and a page that only wanted the form gets a calendar,
  // a price list and a second submit button it never asked for.
  const env = widgetPage();
  await env.settled();
  const drawn = ['d2-booking-calendar', 'd2-booking-form', 'd2-booking-breakdown',
    'd2-booking-total', 'd2-booking-submit', 'd2-booking-status'];
  drawn.forEach((name) => {
    const found = allOf(env, name);
    assert.equal(found.length, 1, 'one ' + name + ' was drawn');
    assert.equal(found[0].getAttribute('d2-booking-built'), '', name + ' is marked as ours');
    assert.ok(found[0].parentNode, name + ' sits on the page');
  });
  assert.equal(env.widget.getAttribute('d2-booking-widget-ready'), '');
  assert.ok(fieldOf(env.document.querySelector('[d2-booking-form]'), 'name'), 'with the guest fields');

  const bare = page({ forms: [] });
  await bare.settled();
  drawn.forEach((name) => {
    assert.equal(allOf(bare, name).length, 0, 'a page without a widget keeps its ' + name + ' count at zero');
  });
});

test('an element the Designer built wins over the drawn one', async () => {
  // MUTACJA: always draw the parts and a page with its own calendar and form
  // shows two calendars, two forms and asks for the guest's name twice.
  const env = widgetPage({ widget: { inner: ['calendar', 'form'] } });
  await env.settled();
  const calendars = allOf(env, 'd2-booking-calendar');
  const forms = allOf(env, 'd2-booking-form');
  assert.equal(calendars.length, 1);
  assert.equal(forms.length, 1);
  assert.equal(calendars[0].getAttribute('d2-booking-built'), null, 'it is the page\'s own calendar');
  assert.equal(forms[0].getAttribute('d2-booking-built'), null, 'and the page\'s own form');
  assert.equal(allOf(env, 'd2-booking-submit').length, 0, 'their form keeps the button they gave it');
  // What the page left out is still filled in, so the widget stays usable.
  const total = allOf(env, 'd2-booking-total');
  assert.equal(total.length, 1);
  assert.equal(total[0].getAttribute('d2-booking-built'), '');
});

test('the drawn form only asks for the fields the key asks for', async () => {
  // MUTACJA: draw every field whatever /config says and a key that does not
  // ask about pets shows a pets field whose answer the backend drops.
  const env = widgetPage({
    config: { form_fields: { phone: 'required', children: 'off', pets: 'off', note: 'off' } },
  });
  await env.settled();
  const form = env.document.querySelector('[d2-booking-form]');
  ['name', 'email', 'phone', 'adults'].forEach((name) => {
    assert.ok(fieldOf(form, name), name + ' is drawn');
  });
  ['children', 'child_ages', 'pets', 'pets_over_threshold', 'note'].forEach((name) => {
    assert.equal(fieldOf(form, name), null, name + ' is not drawn');
  });
  assert.equal(fieldOf(form, 'phone').getAttribute('aria-required'), 'true');

  // And the other way round: the list the form asks from is the key's, not a
  // short one hard-coded here.
  const rich = widgetPage({
    config: {
      form_fields: {
        phone: 'optional', children: 'optional', child_ages: 'optional',
        pets: 'required', note: 'optional',
      },
    },
  });
  await rich.settled();
  const full = rich.document.querySelector('[d2-booking-form]');
  ['name', 'email', 'phone', 'adults', 'children', 'child_ages', 'pets',
    'pets_over_threshold', 'note'].forEach((name) => {
    assert.ok(fieldOf(full, name), name + ' is drawn when the key asks for it');
  });
});

test('the drawn look is styled through d2-booking CSS variables, injected once', async () => {
  // MUTACJA: inject the stylesheet per widget (or on every apply) and a page
  // that re-reads the DOM collects a new <style> on every call.
  const env = widgetPage();
  await env.settled();
  assert.equal(allOf(env, 'd2-booking-styles').length, 1);
  await env.booking.apply();
  await env.settled();
  assert.equal(allOf(env, 'd2-booking-styles').length, 1, 'still one stylesheet');

  const css = styleText(env);
  assert.ok(css.indexOf('var(--d2-booking-accent,') > 0, 'the accent is a variable with a default');
  assert.equal(css.indexOf('!important'), -1, 'nothing fights the site CSS');
  // Every colour is a variable with a default, so there is nothing in the look
  // a page cannot change without writing CSS of its own.
  const withoutVars = css.replace(/var\(--d2-booking-[a-z-]+,[^)]*\)/g, '');
  const stuck = withoutVars.match(/#[0-9a-f]{3,8}|rgba?\(/i);
  assert.equal(stuck, null, 'a colour nobody can override: ' + stuck);
  // Every selector starts inside the widget, so no rule can reach a calendar
  // or a form the Designer styled themselves.
  const selectors = css.split('}')
    .map((rule) => rule.split('{')[0])
    .filter((sel) => sel.trim().length);
  assert.ok(selectors.length > 10, 'the stylesheet has rules at all: ' + selectors.length);
  // The four hosts the module draws into. Every rule starts inside one of
  // them, so nothing in the sheet can reach a calendar, a form or a summary
  // the Designer styled themselves — and the list only when the module drew
  // its cards, never when the page brought a template of its own.
  // Plus the calendar grid, which is markup the module built itself: a month
  // is seven columns or it is nothing, and that rule has to reach a calendar
  // the Designer placed outside a widget too.
  const hosts = ['[d2-booking-widget]', '[d2-booking-return]', '[d2-booking-manage]',
    '[d2-booking-results][d2-booking-results-drawn]', '[d2-booking-calendar-grid]'];
  selectors.forEach((sel) => {
    sel.split(',').forEach((one) => {
      const text = one.trim();
      assert.ok(hosts.some((host) => text.indexOf(host) === 0), 'scoped to a host: ' + text);
    });
  });
  // And nothing outside the three drawn hosts says anything about a look.
  const loose = selectors.filter((sel) => sel.trim().indexOf('[d2-booking-calendar-grid]') === 0);
  assert.equal(loose.length, 1, 'one unscoped rule only: ' + loose.join(' | '));
  assert.ok(css.indexOf(loose[0] + '{display:grid;grid-template-columns:repeat(7,1fr)') === 0,
    'and it is the seven columns, nothing else');

  const bare = page({ forms: [] });
  await bare.settled();
  assert.equal(allOf(bare, 'd2-booking-styles').length, 0, 'a page without a widget gets no stylesheet');
});

test('the drawn widget carries the digi2 mark', async () => {
  // MUTACJA: skip the mark and the widget we drew ourselves goes out unsigned.
  const env = widgetPage();
  await env.settled();
  const marks = allOf(env, 'd2-booking-mark');
  assert.equal(marks.length, 1);
  assert.equal(marks[0].tagName, 'A');
  assert.ok(String(marks[0].getAttribute('href')).indexOf('digi2') > 0, marks[0].getAttribute('href'));
  assert.equal(marks[0].getAttribute('rel'), 'noopener');
  assert.ok(String(marks[0].textContent).length > 3, String(marks[0].textContent));
});

test('branding_hidden takes the mark off the page, the Designer\'s one too', async () => {
  // MUTACJA: ignore branding_hidden and a key that paid for no branding still
  // shows our mark on every booking page.
  const hidden = widgetPage({ config: { branding_hidden: true }, widget: { inner: ['mark'] } });
  await hidden.settled();
  assert.equal(allOf(hidden, 'd2-booking-mark').length, 0);

  const shown = widgetPage({ widget: { inner: ['mark'] } });
  await shown.settled();
  const marks = allOf(shown, 'd2-booking-mark');
  assert.equal(marks.length, 1, 'no second mark next to the one the page built');
  assert.equal(marks[0].getAttribute('d2-booking-built'), null);
  assert.ok(String(marks[0].getAttribute('href')).indexOf('digi2') > 0, 'the module fills in the empty one');
});

test('the drawn widget books the stay it shows', async () => {
  // MUTACJA: draw the parts without binding them and the drawn button submits
  // nothing, so a widget that looks finished cannot book.
  const env = widgetPage();
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  await env.tick();
  assert.equal(totalText(env), money(QUOTE.response.amount_total, 'PLN'), 'the price landed in the drawn total');

  const form = env.document.querySelector('[d2-booking-form]');
  fieldOf(form, 'name').value = 'Anna Nowak';
  fieldOf(form, 'email').value = 'anna@example.com';
  fire(form, 'submit');
  await env.settled();
  const post = env.calls.filter((c) => c.method === 'POST' && /\/bookings$/.test(c.url))[0];
  assert.ok(post, 'the drawn form submits the booking');
  assert.equal(post.body.starts_at, '2027-05-02T00:00:00');
  assert.equal(post.body.units_count, 2);
  assert.deepEqual(env.redirects, [CHECKOUT.response.checkout_url]);
});

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------

function payPage(extra) {
  return page(Object.assign({
    forms: [{
      fields: FULL_FIELDS,
      submit: true,
      attrs: { 'd2-booking-product': BOOKING.response.product_id },
    }],
  }, extra || {}));
}

function bookingPosts(env) {
  return env.calls.filter((c) => c.method === 'POST' && /\/bookings$/.test(c.url));
}

function checkoutPosts(env) {
  return env.calls.filter((c) => c.url.indexOf('/checkout-session') >= 0);
}

async function paySubmit(env) {
  await env.settled();
  env.booking.select({ unit: STAY.unit, starts_at: STAY.starts_at, units_count: STAY.units_count });
  fire(env.form, 'submit');
  await env.settled();
  return env;
}

test('submit creates the booking and then sends the guest to the checkout', async () => {
  // MUTACJA: stop after the booking is created and the guest never reaches the
  // payment, so the hold expires and the booking dies unpaid.
  const env = await paySubmit(payPage());
  assert.equal(bookingPosts(env).length, 1);
  assert.deepEqual(bookingPosts(env)[0].body, BOOKING.request);

  const checkout = checkoutPosts(env);
  assert.equal(checkout.length, 1);
  assert.equal(checkout[0].method, 'POST');
  assert.ok(
    checkout[0].url.indexOf('/bookings/' + BOOKING.response.id + '/checkout-session') > 0,
    checkout[0].url
  );
  assert.equal(checkout[0].body, null, 'the route takes no body');
  assert.deepEqual(env.redirects, [CHECKOUT.response.checkout_url]);
  assert.ok(env.events.some((e) => e.name === 'booking:payment'), 'and the page is told');
});

test('a double submit creates one booking and opens one checkout', async () => {
  // MUTACJA: drop the in-flight guard keyed on the request and two clicks make
  // two bookings, two holds on the same period and two Stripe sessions.
  const env = payPage();
  await env.settled();
  env.booking.select({ unit: STAY.unit, starts_at: STAY.starts_at, units_count: STAY.units_count });
  fire(env.form, 'submit');
  fire(env.form, 'submit');
  await env.settled();
  assert.equal(bookingPosts(env).length, 1);
  assert.equal(checkoutPosts(env).length, 1);
  assert.deepEqual(env.redirects, [CHECKOUT.response.checkout_url]);
  assert.equal(submitOf(env.form).disabled, true, 'the button went down with the first click');
});

test('a submit during a submit is the same attempt, not a second booking', async () => {
  // MUTACJA: drop the per-form in-flight guard and every caller gets an
  // attempt of its own, so two clicks race each other for the same period and
  // only the request key stands between the guest and two holds.
  const env = payPage();
  await env.settled();
  env.booking.select({ unit: STAY.unit, starts_at: STAY.starts_at, units_count: STAY.units_count });
  const first = env.booking.checkout(env.form, STAY);
  const second = env.booking.checkout(env.form, STAY);
  assert.equal(second, first, 'the second caller is handed the attempt already running');
  await env.settled();
  assert.equal(bookingPosts(env).length, 1);
  assert.equal(checkoutPosts(env).length, 1);
});

test('coming back from the checkout opens the form again', async () => {
  // MUTACJA: leave the form as the redirect left it and a guest who presses
  // Back finds a dead button under "taking you to the payment".
  const env = await paySubmit(payPage());
  assert.equal(submitOf(env.form).disabled, true, 'it went down for the redirect');
  env.pageshow();
  await env.settled();
  assert.equal(submitOf(env.form).disabled, false);
  assert.equal(env.form.getAttribute('d2-booking-payment'), null);
  assert.equal(errorTextOf(env.form, 'form'), '', 'and the sentence about leaving is gone');

  fire(env.form, 'submit');
  await env.settled();
  assert.equal(bookingPosts(env).length, 1, 'the booking it already made is the one being paid');
  assert.equal(checkoutPosts(env).length, 2);
});

test('a booking that needs no payment is never sent to the checkout', async () => {
  // MUTACJA: always ask for a checkout session and a key in on-request mode
  // sends the guest to Stripe for a booking nobody has accepted yet.
  const env = await paySubmit(payPage({ booking: { payment_required: false, status: 'pending' } }));
  assert.equal(bookingPosts(env).length, 1);
  assert.equal(checkoutPosts(env).length, 0);
  assert.deepEqual(env.redirects, []);
  const slot = env.form.querySelector('[d2-booking-error="form"]');
  assert.ok(String(slot.textContent).length > 10, String(slot.textContent));
  assert.equal(slot.getAttribute('d2-booking-ok'), '', 'and it reads as good news, not as an error');
});

test('a checkout answer without an address keeps the guest on the page', async () => {
  // MUTACJA: redirect to whatever checkout_url holds and a null address sends
  // the browser to /null instead of to the payment.
  const env = await paySubmit(payPage({ checkout: { checkout_url: null } }));
  assert.deepEqual(env.redirects, []);
  assert.ok(errorTextOf(env.form, 'form').length > 10, errorTextOf(env.form, 'form'));
  assert.equal(submitOf(env.form).disabled, false, 'and the guest may try again');
});

test('only an https checkout address is followed', async () => {
  // MUTACJA: follow any address the answer carries and a tampered answer walks
  // the guest off the site over plain http.
  const env = await paySubmit(payPage({ checkout: { checkout_url: 'http://evil.example.org/pay' } }));
  assert.deepEqual(env.redirects, []);
  assert.ok(env.warnings.some((w) => w.indexOf('checkout_url') >= 0), env.warnings.join(' | '));
  assert.ok(errorTextOf(env.form, 'form').length > 10);
});

test('every payment refusal gets a sentence of its own', async () => {
  // MUTACJA: answer every payment refusal with one generic sentence and the
  // guest cannot tell "already paid" from "the owner has no Stripe yet".
  const reasons = ['booking_not_payable', 'booking_already_paid', 'stripe_not_connected',
    'stripe_account_not_ready', 'payment_provider_unavailable'];
  const said = {};
  for (const name of reasons) {
    const env = await paySubmit(payPage({ refuse: { checkout: name } }));
    const text = errorTextOf(env.form, 'form');
    assert.equal(text, env.booking.message(name), name);
    assert.ok(text.length > 10, name + ': ' + text);
    assert.equal(said[text], undefined, name + ' repeats the sentence of ' + said[text]);
    said[text] = name;
    assert.deepEqual(env.redirects, [], name + ': nobody is sent to a checkout that refused');
    assert.ok(
      env.events.some((e) => e.name === 'booking:refused' && e.data.reason === name),
      name + ': the page is told which refusal it was'
    );
  }
});

test('a final payment refusal does not offer a retry', async () => {
  // MUTACJA: treat every payment refusal as retryable and a form whose booking
  // is already paid keeps asking Stripe for a session it will never get.
  const env = await paySubmit(payPage({ refuse: { checkout: 'booking_already_paid' } }));
  assert.equal(env.form.getAttribute('d2-booking-payment'), 'final');
  assert.equal(submitOf(env.form).disabled, true);
  fire(env.form, 'submit');
  await env.settled();
  assert.equal(bookingPosts(env).length, 1, 'no second booking');
  assert.equal(checkoutPosts(env).length, 1, 'and no second session');
});

test('a provider that is only unavailable offers a retry and pays the booking it has', async () => {
  // MUTACJA: create the booking again on a retry and a guest who tries once
  // more after a Stripe hiccup holds the period twice.
  const env = payPage({ refuse: { checkout: 'payment_provider_unavailable' } });
  await paySubmit(env);
  assert.equal(env.form.getAttribute('d2-booking-payment'), 'retry');
  assert.equal(submitOf(env.form).disabled, false, 'the guest may try again');
  fire(env.form, 'submit');
  await env.settled();
  assert.equal(bookingPosts(env).length, 1, 'the booking of the first attempt is the one being paid');
  assert.equal(checkoutPosts(env).length, 2);
});

test('a Retry-After past an hour is read as an hour, so no timer overflows', async () => {
  // MUTACJA: take the header as it comes, and 30 days overflow setTimeout,
  // which then opens the button at once.
  const env = page({ refuse: { bookings: 'too_many_requests' }, headers: { 'Retry-After': '2592000' } });
  await env.settled();
  const res = await env.booking.request('POST', '/products/x/bookings', { body: {} });
  assert.equal(res.retryAfter, 3600);
});

test('429 on the checkout waits exactly the Retry-After seconds', async () => {
  // MUTACJA: ignore Retry-After and the button opens at once, so the guest
  // hammers a rate limit that only grows longer.
  const env = payPage({ refuse: { checkout: 'too_many_requests' }, headers: { 'Retry-After': '45' } });
  await paySubmit(env);
  assert.ok(errorTextOf(env.form, 'form').indexOf('45') > 0, errorTextOf(env.form, 'form'));
  assert.equal(env.form.getAttribute('d2-booking-payment'), 'wait');
  assert.equal(submitOf(env.form).disabled, true, 'the button waits with the guest');
  env.flush();
  await env.settled();
  assert.equal(submitOf(env.form).disabled, false, 'and opens again when the wait is over');
  assert.equal(env.form.getAttribute('d2-booking-payment'), null);
});

test('a new attempt clears the payment state of the last one', async () => {
  // MUTACJA: leave d2-booking-payment from the previous attempt and CSS keyed
  // on "retry" keeps offering a retry over a refusal about the form.
  const env = payPage({ refuse: { checkout: 'payment_provider_unavailable' } });
  await paySubmit(env);
  assert.equal(env.form.getAttribute('d2-booking-payment'), 'retry');

  // The guest clears a required field, so the next submit never leaves the page.
  fieldOf(env.form, 'email').value = '';
  fire(env.form, 'submit');
  await env.settled();
  assert.equal(env.form.getAttribute('d2-booking-payment'), null, 'the stale state is gone');
  assert.ok(errorTextOf(env.form, 'email').length > 2);
});

test('a second form sending the same request joins it instead of booking again', async () => {
  // MUTACJA: let the joining form wait on the shared attempt without ever
  // being let go of, and a page with two forms leaves the second one disabled
  // for the rest of the visit.
  const twin = {
    fields: FULL_FIELDS,
    submit: true,
    attrs: { 'd2-booking-product': BOOKING.response.product_id },
  };
  const env = page({ forms: [twin, twin] });
  await env.settled();
  env.booking.select({ unit: STAY.unit, starts_at: STAY.starts_at, units_count: STAY.units_count });
  fire(env.forms[0], 'submit');
  fire(env.forms[1], 'submit');
  await env.settled();
  assert.equal(bookingPosts(env).length, 1, 'one booking for one stay');
  assert.equal(checkoutPosts(env).length, 1);
  assert.equal(submitOf(env.forms[1]).disabled, false, 'the form that joined is usable again');
});

// ---------------------------------------------------------------------------
// The return page — what happened to the booking we just paid for
// ---------------------------------------------------------------------------

const BOOKING_ID = MANAGE.response.booking_id;
// An example token, from the contract file. Opaque to the module: the only
// thing it may ever do with it is put it in the X-Booking-Token header.
const TOKEN = MANAGE.headers['X-Booking-Token'];

function returnPage(extra) {
  return page(Object.assign({
    forms: [],
    ret: true,
    search: '?booking=' + BOOKING_ID + '&payment=success',
  }, extra || {}));
}

function managePage(extra) {
  return page(Object.assign({
    forms: [],
    manage: true,
    search: '?booking=' + BOOKING_ID,
    hash: '#token=' + TOKEN + '&action=details',
  }, extra || {}));
}

function slotText(env, name) {
  const el = env.document.querySelector('[' + name + ']');
  return el ? String(el.textContent || '') : null;
}

function manageField(env, name) {
  const el = env.document.querySelector('[d2-booking-manage-field="' + name + '"]');
  return el ? String(el.textContent || '') : null;
}

function manageAction(env, kind) {
  return env.document.querySelector('[d2-booking-manage-action="' + kind + '"]');
}

function callsTo(env, part) {
  return env.calls.filter((c) => c.url.indexOf(part) >= 0);
}

// Every attribute and every word the page ended up carrying, as one string —
// what a reader (or a screenshot, or a referrer) could get at.
function dumpTree(el) {
  let out = JSON.stringify(el.attributes) + '|' + String(el.textContent || '') + '|';
  (el.children || []).forEach((child) => { out += dumpTree(child); });
  return out;
}

// The civil date of an instant in the rental's own timezone, as the guest
// reads it — computed here with Intl, never typed out, so the assertion holds
// in any month and any zone.
function dayWords(iso, timezone, lang) {
  // No timezone means the visitor's own clock, which is what the module falls
  // back to for an answer that carries none (/status has no timezone field).
  const civil = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || undefined, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(iso));
  return new Intl.DateTimeFormat(lang || CONFIG.response.default_language, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(civil + 'T00:00:00Z'));
}

function minorWords(minor, currency, lang) {
  return money(Number(minor) / 100, currency, lang);
}

test('the return block asks for the status of the booking in the address', async () => {
  // MUTACJA: read the booking id from anywhere but ?booking= (or skip the
  // call) and the guest coming back from Stripe is told nothing at all.
  const env = returnPage({ statusSeq: [{ status: 'confirmed' }] });
  await env.settled();
  const asked = callsTo(env, '/status');
  assert.equal(asked.length, 1);
  assert.equal(asked[0].method, 'GET');
  assert.ok(
    asked[0].url.indexOf('/bookings/' + BOOKING_ID + '/status') > 0,
    'the id from the address is the one asked about: ' + asked[0].url
  );
  // The status of a booking is not behind the token: the id is in the address
  // the guest was sent to, and nothing else is needed.
  assert.equal(asked[0].init.headers['X-Booking-Token'], undefined);
});

test('a confirmed booking says so and offers no new period', async () => {
  // MUTACJA: answer every status with the same sentence and a guest whose
  // booking is confirmed reads that the payment is still being checked.
  const env = returnPage({ statusSeq: [{ status: 'confirmed', paid: true }] });
  await env.settled();
  assert.equal(env.ret.getAttribute('d2-booking-return-state'), 'confirmed');
  assert.ok(slotText(env, 'd2-booking-return-message').length > 10,
    slotText(env, 'd2-booking-return-message'));
  assert.equal(env.document.querySelector('[d2-booking-return-new]'), null,
    'nothing to pick again: the stay is confirmed');
  // The mark signs the block, so it goes under everything the module drew —
  // not into the middle of it, which is where an early append would land it.
  const parts = env.ret.children;
  assert.equal(parts[parts.length - 1].getAttribute('d2-booking-mark'), '',
    'the mark is the last thing in the block');
});

test('paid but not yet accepted says the owner still has to answer', async () => {
  // MUTACJA: call a paid booking confirmed and a guest waiting for the owner's
  // yes reads that everything is settled, then arrives to a locked door.
  const env = returnPage({ statusSeq: [{ status: 'paid', paid: true }] });
  await env.settled();
  assert.equal(env.ret.getAttribute('d2-booking-return-state'), 'paid');
  const said = slotText(env, 'd2-booking-return-message');
  const confirmed = returnPage({ statusSeq: [{ status: 'confirmed', paid: true }] });
  await confirmed.settled();
  assert.notEqual(said, slotText(confirmed, 'd2-booking-return-message'),
    'waiting for the owner is not the same sentence as confirmed');
});

test('a hold that is gone sends the guest to pick a new period', async () => {
  // MUTACJA: keep polling (or say "still being checked") when hold_open is
  // false and the guest waits for a payment that can never be taken, instead
  // of being sent to choose another period while one is still free.
  const env = returnPage({
    statusSeq: [{ status: 'awaiting_payment', hold_open: false, paid: false }],
  });
  await env.settled();
  assert.equal(env.ret.getAttribute('d2-booking-return-state'), 'expired');
  const link = env.document.querySelector('[d2-booking-return-new]');
  assert.ok(link, 'the way to a new period is on the page');
  assert.equal(link.getAttribute('href'), STATUS.response.site_url);
  assert.ok(String(link.textContent || '').length > 3, String(link.textContent));
  assert.equal(callsTo(env, '/status').length, 1, 'and nothing is polled any more');
});

test('site_url null leaves the sentence and no dead link', async () => {
  // MUTACJA: build the link whatever site_url says and a key without a client
  // page shows "pick a new period" pointing at href="null".
  const env = returnPage({
    statusSeq: [{ status: 'expired', hold_open: false, paid: false, site_url: null }],
  });
  await env.settled();
  assert.equal(env.ret.getAttribute('d2-booking-return-state'), 'expired');
  assert.ok(slotText(env, 'd2-booking-return-message').length > 10);
  assert.equal(env.document.querySelector('[d2-booking-return-new]'), null);
  assert.equal(dumpTree(env.document.documentElement).indexOf('"href":"null"'), -1,
    'no dead link anywhere');
});

test('the status is polled with a growing wait until it settles', async () => {
  // MUTACJA: ask once and stop, and the guest who came back before Stripe's
  // webhook landed reads "still being checked" and never sees it settle.
  const env = returnPage({
    statusSeq: [{}, {}, { status: 'confirmed', paid: true }],
  });
  await env.settled();
  assert.equal(callsTo(env, '/status').length, 1);
  assert.equal(env.ret.getAttribute('d2-booking-return-state'), 'checking');

  await env.tick();
  assert.equal(callsTo(env, '/status').length, 2, 'the wait ran out and it asked again');
  await env.tick();
  assert.equal(callsTo(env, '/status').length, 3);
  assert.equal(env.ret.getAttribute('d2-booking-return-state'), 'confirmed');

  // Each wait is longer than the one before it, so a backend having a bad
  // minute is not asked ten times a second.
  const waits = env.waits().filter((ms) => ms !== 10000);
  assert.ok(waits.length >= 2, 'the waits were asked for: ' + waits.join(','));
  assert.ok(waits[1] > waits[0], 'the second wait is longer: ' + waits.join(','));

  await env.tick();
  assert.equal(callsTo(env, '/status').length, 3, 'a settled answer is not polled again');
});

test('a status that never settles gives up with a sentence, not forever', async () => {
  // MUTACJA: poll without a budget and a booking the backend never settles
  // keeps the tab asking for the rest of the visit.
  const env = returnPage({ statusSeq: [{}] });
  await env.settled();
  for (let i = 0; i < 40; i++) await env.tick();
  const asked = callsTo(env, '/status').length;
  assert.ok(asked > 2, 'it really did poll: ' + asked);
  assert.ok(asked < 20, 'and it stopped: ' + asked);
  assert.equal(env.ret.getAttribute('d2-booking-return-state'), 'checking');
  assert.ok(slotText(env, 'd2-booking-return-message').length > 10);
});

test('re-reading the page does not start a second poll', async () => {
  // MUTACJA: forget to mark the block as read and digi2.booking.apply() after
  // a DOM change starts a second poll beside the first — two timers, two calls
  // a second and two sentences fighting over the same slot.
  const env = returnPage({ statusSeq: [{}] });
  await env.settled();
  assert.equal(callsTo(env, '/status').length, 1);
  await env.booking.apply();
  await env.settled();
  assert.equal(callsTo(env, '/status').length, 1, 'the block was already read');
  await env.tick();
  assert.equal(callsTo(env, '/status').length, 2, 'and the one poll goes on');
});

test('a return address with no booking id asks the API nothing', async () => {
  // MUTACJA: call /bookings//status with an empty id and the backend answers
  // 404 for a booking the guest does have, which reads like a lost booking.
  const env = page({ forms: [], ret: true, search: '?payment=success' });
  await env.settled();
  assert.equal(callsTo(env, '/status').length, 0);
  assert.equal(env.ret.getAttribute('d2-booking-return-state'), 'unknown');
  assert.ok(slotText(env, 'd2-booking-return-message').length > 10);
});

test('payment=cancelled reads the status once and never polls', async () => {
  // MUTACJA: poll after a cancelled payment and a guest who closed Stripe on
  // purpose watches a spinner for forty seconds waiting for nothing.
  const env = returnPage({
    search: '?booking=' + BOOKING_ID + '&payment=cancelled',
    statusSeq: [{}],
  });
  await env.settled();
  assert.equal(env.ret.getAttribute('d2-booking-return-state'), 'cancelled');
  for (let i = 0; i < 5; i++) await env.tick();
  assert.equal(callsTo(env, '/status').length, 1);
});

test('a refused status shows one sentence and no state that reads as success', async () => {
  // MUTACJA: treat a refusal as an answer and a booking the key does not know
  // is reported as confirmed.
  const env = returnPage({ refuse: { status: 'booking_not_found' } });
  await env.settled();
  assert.equal(env.ret.getAttribute('d2-booking-return-state'), 'error');
  const said = slotText(env, 'd2-booking-return-message');
  assert.equal(said, env.booking.message('booking_not_found'));
  assert.equal(said.indexOf(refusalFixture('booking_not_found').body.detail), -1,
    'our sentence, not the backend text');
});

test('the balance left after the deposit is said in the guest currency', async () => {
  // MUTACJA: divide the minor units by a hard-coded 100 (or print them raw)
  // and the guest reads 70000 zł to pay instead of 700,00 zł.
  const env = returnPage({
    statusSeq: [{ status: 'confirmed', paid: true }],
  });
  await env.settled();
  const left = slotText(env, 'd2-booking-return-balance');
  const want = minorWords(STATUS.response.balance_due_minor, STATUS.response.currency);
  assert.ok(left.indexOf(want) >= 0, 'the amount from the answer: ' + left + ' / ' + want);
  assert.ok(
    left.indexOf(dayWords(STATUS.response.balance_due_at, null)) >= 0,
    'and the day it is due: ' + left
  );

  // Nothing left to pay is never "0,00 zł": a slot the Designer built is
  // emptied and marked, and one of ours is not drawn at all.
  const done = returnPage({
    ret: { inner: ['balance'] },
    statusSeq: [{ status: 'confirmed', paid: true, balance_due_minor: null, balance_due_at: null }],
  });
  await done.settled();
  const slot = done.document.querySelector('[d2-booking-return-balance]');
  assert.equal(String(slot.textContent), '');
  assert.equal(slot.getAttribute('d2-booking-empty'), '');

  const drawn = returnPage({
    statusSeq: [{ status: 'confirmed', paid: true, balance_due_minor: null, balance_due_at: null }],
  });
  await drawn.settled();
  assert.equal(drawn.document.querySelector('[d2-booking-return-balance]'), null);
});

test('a slot the Designer built on the return page is the one that is filled', async () => {
  // MUTACJA: always draw the slots and a page that styled its own message box
  // gets a second, unstyled one under it.
  const env = returnPage({
    ret: { inner: ['message', 'balance'] },
    statusSeq: [{ status: 'confirmed', paid: true }],
  });
  await env.settled();
  const slots = env.document.querySelectorAll('[d2-booking-return-message]');
  assert.equal(slots.length, 1);
  assert.equal(slots[0].getAttribute('d2-booking-built'), null, 'the page\'s own slot');
  assert.ok(String(slots[0].textContent).length > 10, 'and it carries the sentence');
});

test('the balance Stripe comes back from is read out of the status too', async () => {
  // MUTACJA: ignore payment=balance_success and a guest who just paid the rest
  // reads the sentence about the first payment, with the old balance beside it.
  const paying = returnPage({
    search: '?booking=' + BOOKING_ID + '&payment=balance_success',
    statusSeq: [{ status: 'confirmed', paid: true }],
  });
  await paying.settled();
  assert.equal(paying.ret.getAttribute('d2-booking-return-state'), 'checking',
    'the balance is still outstanding, so the webhook has not landed yet');

  const done = returnPage({
    search: '?booking=' + BOOKING_ID + '&payment=balance_success',
    statusSeq: [{ status: 'confirmed', paid: true, balance_due_minor: null, balance_due_at: null }],
  });
  await done.settled();
  assert.equal(done.ret.getAttribute('d2-booking-return-state'), 'balance_paid');
  assert.ok(slotText(done, 'd2-booking-return-message').length > 10);
});

// ---------------------------------------------------------------------------
// The manage page — the booking, through the token from the e-mail
// ---------------------------------------------------------------------------

test('the token travels in the header and never in the address, a log or a message', async () => {
  // MUTACJA: send the token as a query parameter (or leave it in the address
  // bar) and it goes out in every referrer, into the history and into whatever
  // the guest pastes to a friend — a link that reads their booking.
  const env = managePage();
  await env.settled();
  const asked = callsTo(env, '/manage');
  assert.equal(asked.length, 1);
  assert.equal(asked[0].init.headers['X-Booking-Token'], TOKEN);
  assert.equal(asked[0].url.indexOf(TOKEN), -1, 'not in the address: ' + asked[0].url);

  // Taken off the address bar at once, without a new history entry.
  assert.equal(env.location.hash, '');
  assert.equal(env.replaced.length, 1);
  assert.equal(env.replaced[0].indexOf('token'), -1, env.replaced[0]);

  // And nowhere on the page, in the console or in an event either.
  const seen = env.warnings.join(' ') + env.logs.join(' ') + JSON.stringify(env.events)
    + dumpTree(env.document.documentElement);
  assert.ok(env.logs.length > 0, 'the module did log something, so the scan means anything');
  assert.equal(seen.indexOf(TOKEN), -1, 'the token leaked somewhere a reader can see');
});

test('the token is taken out of the link exactly as it was written', async () => {
  // MUTACJA: decode the fragment the way a query is decoded (+ for a space)
  // and a token that happens to contain a plus sign reaches the backend with a
  // space in it — one refusal the guest can do nothing about, on a link that
  // is perfectly good. The token is opaque: the module may not reshape it.
  // A plus sign is legal in a fragment and needs no escaping there, so a link
  // may well carry it raw.
  const odd = 'manage.1800000000.a+b_c-d';
  const env = managePage({ hash: '#token=' + odd + '&action=details' });
  await env.settled();
  const asked = callsTo(env, '/manage');
  assert.equal(asked.length, 1);
  assert.equal(asked[0].init.headers['X-Booking-Token'], odd);
});

test('the fragment is stripped even on a page with no manage block', async () => {
  // MUTACJA: read the fragment only when a manage block is on the page and a
  // mistyped page leaves the token in the address bar for the whole visit.
  const env = page({ forms: [], hash: '#token=' + TOKEN + '&action=details' });
  await env.settled();
  assert.equal(env.location.hash, '');
  assert.equal(env.replaced.length, 1);
});

test('manage shows the place, the dates and the amounts the answer carries', async () => {
  // MUTACJA: print the instants as they came and the guest reads
  // 2027-04-01T14:00:00Z instead of the day they arrive.
  const env = managePage();
  await env.settled();
  const got = MANAGE.response;
  assert.equal(env.manage.getAttribute('d2-booking-manage-state'), 'ready');
  assert.equal(manageField(env, 'product_name'), got.product_name);
  const dates = manageField(env, 'dates');
  assert.ok(dates.indexOf(dayWords(got.starts_at, got.timezone)) >= 0, dates);
  assert.ok(dates.indexOf(dayWords(got.ends_at, got.timezone)) >= 0, dates);
  assert.equal(manageField(env, 'paid'), minorWords(got.amount_paid_minor, got.currency));
  assert.equal(env.manage.getAttribute('d2-booking-manage-status'), got.status);
  // Nothing was refunded, so there is no refund row to read; one that was
  // refunded gets its own.
  assert.equal(manageField(env, 'refunded'), null);
  const back = managePage({ manageData: { amount_refunded_minor: 12500 } });
  await back.settled();
  assert.equal(manageField(back, 'refunded'), minorWords(12500, got.currency));
});

test('the balance is shown only when the answer carries one', async () => {
  // MUTACJA: show the balance row whatever the answer says and a booking paid
  // in full is asked for 0,00 zł by a date that does not exist.
  const env = managePage();
  await env.settled();
  const got = MANAGE.response;
  const left = manageField(env, 'balance');
  assert.ok(left.indexOf(minorWords(got.amount_outstanding_minor, got.currency)) >= 0, left);
  assert.ok(left.indexOf(dayWords(got.balance_due_at, got.timezone)) >= 0, left);

  const settled = managePage({
    manage: { inner: ['field:balance'] },
    manageData: { amount_outstanding_minor: 0, balance_due_at: null, balance_payable: false },
  });
  await settled.settled();
  assert.equal(manageField(settled, 'balance'), '');
  assert.equal(
    settled.document.querySelector('[d2-booking-manage-field="balance"]')
      .getAttribute('d2-booking-empty'), ''
  );
  const drawn = managePage({
    manageData: { amount_outstanding_minor: 0, balance_due_at: null, balance_payable: false },
  });
  await drawn.settled();
  assert.equal(manageField(drawn, 'balance'), null, 'and never a drawn row saying 0,00');
});

test('the emergency phone appears only when the answer has one', async () => {
  // MUTACJA: draw the phone row whatever the answer says and a booking that is
  // neither paid nor confirmed shows an empty "emergency phone" line.
  const env = managePage();
  await env.settled();
  const slot = env.document.querySelector('[d2-booking-manage-field="emergency_phone"]');
  assert.ok(slot, 'the number is on the page');
  assert.equal(String(slot.textContent), MANAGE.response.emergency_phone);

  const none = managePage({ manageData: { emergency_phone: null } });
  await none.settled();
  const empty = none.document.querySelector('[d2-booking-manage-field="emergency_phone"]');
  assert.equal(empty, null, 'no slot at all, not an empty one');
});

test('an action the answer does not allow is not on the page', async () => {
  // MUTACJA: draw every action and a guest clicks "ask for a refund" on a
  // booking that cannot have one, to be told 409 by the backend.
  const env = managePage({
    manageData: { refund_available: false, date_change_available: true },
  });
  await env.settled();
  assert.equal(manageAction(env, 'refund'), null);
  assert.ok(manageAction(env, 'date_change'), 'the one the answer allows is there');

  // Including an action the Designer put on the page themselves.
  const built = managePage({
    manage: { inner: ['action:refund', 'action:date_change'] },
    manageData: { refund_available: false, date_change_available: false },
  });
  await built.settled();
  assert.equal(manageAction(built, 'refund'), null);
  assert.equal(manageAction(built, 'date_change'), null);
});

test('a balance that this link cannot pay points at the e-mail, not a button', async () => {
  // MUTACJA: offer the balance button on a manage token and the click is
  // refused by the backend as a booking that does not exist, which reads to
  // the guest like a lost booking (contract: the manage token cannot pay).
  const env = managePage();
  await env.settled();
  assert.equal(MANAGE.response.balance_payable, true, 'the fixture does allow a balance');
  assert.equal(manageAction(env, 'balance'), null, 'but not through this link');
  const said = slotText(env, 'd2-booking-manage-message');
  assert.ok(said.length > 10, said);
  const account = env.document.querySelector('[d2-booking-manage-account]');
  assert.ok(account, 'and the way to the account is there');
  assert.equal(account.getAttribute('href'), CONFIG.response.account_url);
});

test('the balance link pays through balance-checkout and leaves for Stripe', async () => {
  // MUTACJA: send the balance to the first-payment route (or with no token)
  // and the guest who came to pay the rest is told their booking is unknown.
  const env = managePage({ hash: '#token=' + TOKEN + '&action=balance' });
  await env.settled();
  const button = manageAction(env, 'balance');
  assert.ok(button, 'a balance link may pay');
  fire(button, 'click');
  await env.settled();

  const asked = callsTo(env, '/balance-checkout');
  assert.equal(asked.length, 1);
  assert.equal(asked[0].method, 'POST');
  assert.equal(asked[0].init.headers['X-Booking-Token'], TOKEN);
  assert.equal(asked[0].body, null, 'the route takes no body');
  assert.deepEqual(env.redirects, [BALANCE.response.checkout_url]);

  // And the refund and date-change actions are not offered by a balance link.
  assert.equal(manageAction(env, 'refund'), null);
  assert.equal(manageAction(env, 'date_change'), null);
});

test('a refused balance says why and keeps the guest on the page', async () => {
  // MUTACJA: follow the answer whatever it says and a balance already paid
  // sends the guest to a checkout address that is not there.
  const env = managePage({
    hash: '#token=' + TOKEN + '&action=balance',
    refuse: { balance: 'balance_already_paid' },
  });
  await env.settled();
  fire(manageAction(env, 'balance'), 'click');
  await env.settled();
  assert.deepEqual(env.redirects, []);
  assert.equal(slotText(env, 'd2-booking-manage-message'), env.booking.message('balance_already_paid'));
});

test('a change request sends exactly the body from request.json', async () => {
  // MUTACJA: send the date with a zone on it (or skip requested_units_count)
  // and the rental's local check-in turns into an instant in the visitor's
  // own timezone — a request for the wrong day.
  const env = managePage({ manage: { inner: ['input:requested_starts_at', 'input:requested_units_count', 'input:customer_note'] } });
  await env.settled();
  const want = REQUEST.request;
  env.document.querySelector('[d2-booking-manage-input="requested_starts_at"]').value =
    want.requested_starts_at.slice(0, 16);
  env.document.querySelector('[d2-booking-manage-input="requested_units_count"]').value =
    String(want.requested_units_count);
  env.document.querySelector('[d2-booking-manage-input="customer_note"]').value = want.customer_note;

  fire(manageAction(env, 'date_change'), 'click');
  await env.settled();
  const asked = callsTo(env, '/requests');
  assert.equal(asked.length, 1);
  assert.equal(asked[0].method, 'POST');
  assert.equal(asked[0].init.headers['X-Booking-Token'], TOKEN);
  assert.deepEqual(asked[0].body, want);
});

test('a request that was saved says so and closes its own kind', async () => {
  // MUTACJA: leave the button up after a 201 and the guest sends the same
  // request again, to be told 409 that one is already waiting.
  const env = managePage();
  await env.settled();
  fire(manageAction(env, 'refund'), 'click');
  await env.settled();
  assert.equal(callsTo(env, '/requests').length, 1);
  assert.equal(callsTo(env, '/requests')[0].body.kind, 'refund');
  assert.ok(slotText(env, 'd2-booking-manage-message').length > 10);
  assert.equal(manageAction(env, 'refund'), null, 'one waiting request closes its kind');
});

test('a refused request says why without naming the token', async () => {
  // MUTACJA: show the backend sentence and a guest reads an English line
  // about a decision they never heard of.
  //
  // The two 409s of this route — a booking that is closed and a request of
  // this kind already waiting — both answer a plain English sentence meant for
  // logs (errors.json), so the module cannot tell them apart and gets one
  // sentence that covers both. Either way the kind is closed.
  for (const name of ['request_not_allowed', 'request_already_waiting']) {
    const env = managePage({ refuse: { requests: name } });
    await env.settled();
    fire(manageAction(env, 'refund'), 'click');
    await env.settled();
    const said = slotText(env, 'd2-booking-manage-message');
    assert.equal(said, env.booking.message('request_not_allowed'), name);
    assert.equal(said.indexOf(TOKEN), -1);
    assert.equal(said.indexOf(refusalFixture(name).body.detail), -1, 'not the backend text');
    assert.equal(manageAction(env, 'refund'), null, 'and the kind is closed either way');
  }
});

test('the requests the booking already has carry the owner decision', async () => {
  // MUTACJA: show only the kind and the guest never reads why the owner said
  // no, so they write the same request again.
  const env = managePage();
  await env.settled();
  const rows = env.document.querySelectorAll('[d2-booking-manage-request]');
  assert.equal(rows.length, MANAGE.response.requests.length);
  const first = MANAGE.response.requests[0];
  const row = rows[0];
  assert.ok(textIn(row, 'd2-booking-manage-request-kind').length > 2);
  assert.ok(textIn(row, 'd2-booking-manage-request-status').length > 2);
  assert.equal(textIn(row, 'd2-booking-manage-request-note'), first.resolution_note);
  assert.equal(row.getAttribute('d2-booking-manage-request-state'), first.status);
});

test('an invalid link shows one short sentence, no data and the way to the account', async () => {
  // MUTACJA: tell the guest which refusal it was (expired, foreign, wrong
  // purpose) — the backend answers the same booking_not_found for all of them,
  // so any such sentence is a guess, and a guess here is an oracle for anyone
  // trying tokens.
  const env = managePage({ refuse: { manage: 'booking_not_found' } });
  await env.settled();
  assert.equal(env.manage.getAttribute('d2-booking-manage-state'), 'invalid');
  assert.equal(slotText(env, 'd2-booking-manage-message'), env.booking.message('booking_not_found'));
  assert.equal(manageField(env, 'product_name'), null, 'no data at all');
  assert.equal(manageAction(env, 'refund'), null);
  assert.equal(manageAction(env, 'balance'), null);
  const account = env.document.querySelector('[d2-booking-manage-account]');
  assert.equal(account.getAttribute('href'), CONFIG.response.account_url);

  // A refusal that is not about the token is not an invalid link: a guest on a
  // flaky connection must not be told their e-mail is worthless.
  const flaky = managePage({ offline: true });
  await flaky.settled();
  assert.equal(flaky.manage.getAttribute('d2-booking-manage-state'), 'error');
  assert.equal(slotText(flaky, 'd2-booking-manage-message'), flaky.booking.message('network_error'));

  // A workspace with no slug has no account page: the sentence stands alone.
  const alone = managePage({
    refuse: { manage: 'booking_not_found' },
    config: { account_url: null },
  });
  await alone.settled();
  assert.equal(alone.document.querySelector('[d2-booking-manage-account]'), null);
  assert.ok(slotText(alone, 'd2-booking-manage-message').length > 10);
});

test('coming back from the balance payment is not an invalid link', async () => {
  // MUTACJA: say "this link is invalid" whenever the token is missing and the
  // guest coming back from the balance payment — Stripe returns to manage_url
  // with ?payment=balance_success and NO token (contract) — reads that their
  // link is dead right next to "the balance is paid".
  const env = page({
    forms: [],
    manage: true,
    ret: true,
    search: '?booking=' + BOOKING_ID + '&payment=balance_success',
    statusSeq: [{ status: 'confirmed', paid: true, balance_due_minor: null, balance_due_at: null }],
  });
  await env.settled();
  assert.equal(callsTo(env, '/manage').length, 0, 'there is no token to read it with');
  assert.equal(env.manage.getAttribute('d2-booking-manage-state'), 'returned');
  assert.equal(slotText(env, 'd2-booking-manage-message'), null, 'and it says nothing at all');
  // The return block is the one that answers, and it does.
  assert.equal(env.ret.getAttribute('d2-booking-return-state'), 'balance_paid');
  assert.ok(slotText(env, 'd2-booking-return-message').length > 10);
});

test('a manage page with no token in the link asks the API nothing', async () => {
  // MUTACJA: call /manage without the header and the backend answers 404 for
  // every visitor, so a page opened from the menu looks like a dead booking
  // instead of a link that is simply missing its token.
  const env = page({ forms: [], manage: true, search: '?booking=' + BOOKING_ID });
  await env.settled();
  assert.equal(callsTo(env, '/manage').length, 0);
  assert.equal(env.manage.getAttribute('d2-booking-manage-state'), 'invalid');
  assert.ok(slotText(env, 'd2-booking-manage-message').length > 10);
});

// ---------------------------------------------------------------------------
// The product — the reference, the id and the pet fee
// ---------------------------------------------------------------------------

const SLUG = PRODUCT_FIXTURE.response.slug;

test('a page with no product attribute takes the apartment from the address', async () => {
  // MUTACJA: read the product from the attribute only and one booking page
  // serving a whole CMS collection (/rezerwacja?apartament=<slug>) draws a
  // calendar with no availability and books nothing at all.
  const env = page({
    now: MAY_2027,
    calendar: true,
    search: '?apartament=' + SLUG,
    forms: [{ fields: { name: 'Anna Nowak', email: 'anna@example.com' } }],
  });
  await env.settled();

  const asked = productCalls(env);
  assert.equal(asked.length, 1, 'the slug from the address is resolved');
  assert.ok(asked[0].url.indexOf('/products/' + SLUG) > 0, asked[0].url);
  assert.equal(availabilityCalls(env).length, 1, 'and the month is really asked for');
  assert.equal(env.booking.stay(), null, 'nothing is chosen yet');
  assert.equal(
    env.document.querySelectorAll('[d2-booking-day]').length, 31,
    'the month is drawn from the answer, not from an empty calendar'
  );
});

test('an attribute always beats the apartment in the address', async () => {
  // MUTACJA: let ?apartament= win and a page that names its product in the
  // Designer books whatever the last link the guest clicked carried.
  const env = page({
    now: MAY_2027,
    calendar: true,
    search: '?apartament=some-other-apartment',
    loaderAttrs: { 'd2-booking-product': PRODUCT },
    forms: [{ fields: { name: 'Anna Nowak', email: 'anna@example.com' } }],
  });
  await env.settled();
  assert.ok(productCalls(env)[0].url.indexOf('/products/' + PRODUCT) > 0, productCalls(env)[0].url);
  assert.equal(
    env.calls.filter((c) => c.url.indexOf('some-other-apartment') >= 0).length, 0,
    'the address was never asked about'
  );
});

test('a slug is resolved once and the three {product_id} routes get the id', async () => {
  // MUTACJA: send the reference straight to availability, quote and bookings
  // and a Designer who writes the documented slug gets 404 Product not found
  // on every call, so nothing can be booked.
  const env = page({
    now: MAY_2027,
    calendar: true,
    price: true,
    loaderAttrs: { 'd2-booking-product': SLUG },
    forms: [{ fields: FULL_FIELDS, submit: true }],
  });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  await env.tick();
  fire(env.form, 'submit');
  await env.settled();

  assert.equal(productCalls(env).length, 1, 'one lookup for the whole visit');
  const id = PRODUCT_FIXTURE.response.id;
  const wrong = env.calls.filter((c) => c.url.indexOf('/products/' + SLUG + '/') >= 0);
  assert.deepEqual(wrong.map((c) => c.url), [], 'no {product_id} route is given the slug');
  assert.ok(availabilityCalls(env)[0].url.indexOf('/products/' + id + '/availability') > 0);
  assert.ok(quoteCalls(env)[0].url.indexOf('/products/' + id + '/quote') > 0);
  assert.ok(bookingPosts(env)[0].url.indexOf('/products/' + id + '/bookings') > 0);
});

test('a product that cannot be read sends the reference on as the page wrote it', async () => {
  // MUTACJA: give up when GET /products/<ref> refuses and one slow or
  // rate-limited lookup takes the whole calendar down with it.
  const env = page({
    now: MAY_2027,
    calendar: true,
    refuse: { product: 'too_many_requests' },
    loaderAttrs: { 'd2-booking-product': PRODUCT },
    forms: [{ fields: { name: 'Anna Nowak', email: 'anna@example.com' } }],
  });
  await env.settled();
  assert.equal(availabilityCalls(env).length, 1, 'the month is still asked for');
  assert.ok(availabilityCalls(env)[0].url.indexOf('/products/' + PRODUCT + '/availability') > 0);
  assert.ok(env.warnings.some((w) => w.indexOf(PRODUCT) >= 0), env.warnings.join(' | '));
});

test('the pets question says what the threshold is and what it costs', async () => {
  // MUTACJA: drop the pet_fee sentence and the drawn widget asks "how many
  // over the weight threshold?" without ever saying what the threshold is,
  // so the guest cannot answer and only meets the surcharge in the quote.
  const env = widgetPage({ config: { form_fields: { pets: 'optional' } } });
  await env.settled();
  const hint = env.document.querySelector('[d2-booking-hint="pets_over_threshold"]');
  assert.ok(hint, 'the question carries a slot for its own explanation');
  const said = String(hint.textContent);
  const fee = PRODUCT_FIXTURE.response.pet_fee;
  assert.ok(said.indexOf('10') >= 0, 'the threshold from the product: ' + said);
  assert.ok(said.indexOf(money(fee.amount, PRODUCT_FIXTURE.response.currency)) >= 0, said);
  assert.equal(hint.getAttribute('d2-booking-empty'), null);
});

test('a per-night pet fee says so, and no pet fee says nothing at all', async () => {
  // MUTACJA: print one sentence whatever pet_fee holds and a key with no pet
  // fee shows an empty hint, while a per-night fee reads as a flat one.
  const nightly = widgetPage({
    config: { form_fields: { pets: 'optional' } },
    productData: { pet_fee: { amount: '50.00', weight_threshold_kg: '10.0', mode: 'per_night' } },
  });
  await nightly.settled();
  const perNight = String(
    nightly.document.querySelector('[d2-booking-hint="pets_over_threshold"]').textContent
  );
  assert.ok(perNight.indexOf('noc') > 0, perNight);

  const none = widgetPage({
    config: { form_fields: { pets: 'optional' } },
    productData: { pet_fee: null },
  });
  await none.settled();
  assert.equal(none.document.querySelector('[d2-booking-field="pets_over_threshold"]'), null,
    'a question nothing on the page can explain is not asked');
  assert.ok(none.document.querySelector('[d2-booking-field="pets"]'), 'how many pets still is');

  // A lookup that failed says nothing about the fee, so the field stays.
  const failed = widgetPage({
    config: { form_fields: { pets: 'optional' } },
    refuse: { product: { status: 503, body: { detail: 'Unavailable' } } },
  });
  await failed.settled();
  assert.ok(failed.document.querySelector('[d2-booking-field="pets_over_threshold"]'));

  // And a fee with no threshold keeps the amount without inventing a weight.
  const flat = widgetPage({
    config: { form_fields: { pets: 'optional' } },
    productData: { pet_fee: { amount: '50.00', weight_threshold_kg: null, mode: 'per_stay' } },
  });
  await flat.settled();
  const said = String(
    flat.document.querySelector('[d2-booking-hint="pets_over_threshold"]').textContent
  );
  assert.ok(said.length > 5 && said.indexOf('{') < 0, said);
  assert.ok(said.indexOf('kg') < 0, 'no threshold wording without a threshold: ' + said);
});

test('a page that never asks about pets asks the API nothing about the product', async () => {
  // MUTACJA: fetch the product on every page and a form with no calendar and
  // no pets question spends a request on a sentence nobody will read.
  const env = page({
    loaderAttrs: { 'd2-booking-product': PRODUCT },
    config: { form_fields: { pets: 'off' } },
    forms: [{ fields: { name: 'Anna Nowak', email: 'anna@example.com' } }],
  });
  await env.settled();
  assert.deepEqual(productCalls(env).map((c) => c.url), []);
});

// ---------------------------------------------------------------------------
// Rules the calendar honours, and the sentences it says about them
// ---------------------------------------------------------------------------

test('buffer_minutes widens a booking before the nights are counted', async () => {
  // MUTACJA: ignore buffer_minutes and the calendar offers the night right
  // after a taken period, so the guest picks a day the cleaning gap closed
  // and the backend answers 409 rental_rules on a day we said was free.
  const plain = calendarPage();
  await plain.settled();
  assert.equal(dayOf(plain, '2027-05-13').getAttribute('d2-booking-day-busy'), null,
    'with no buffer the 13th is free');

  // The fixture's period is a booking, which is the only kind the buffer touches.
  assert.equal(AVAILABILITY.response.busy[0].kind, 'booking');
  const env = calendarPage({ availability: { buffer_minutes: 1440 } });
  await env.settled();
  BUSY_NIGHTS.forEach((key) => {
    assert.equal(dayOf(env, key).getAttribute('d2-booking-day-busy'), '', key);
  });
  assert.equal(dayOf(env, '2027-05-13').getAttribute('d2-booking-day-busy'), '',
    'a whole day of buffer takes the night after the period too');
  assert.equal(dayOf(env, '2027-05-10').getAttribute('d2-booking-day-busy'), '',
    'and the night before it');
  assert.equal(dayOf(env, '2027-05-13').getAttribute('aria-disabled'), 'true');
});

test('a blackout is an exact window: buffer_minutes never widens it', async () => {
  // MUTACJA: widen every busy period by buffer_minutes, whatever its kind, and
  // the nights touching a blackout are greyed out although the backend checks
  // the buffer only against a booking — the guest is shown no reason for a
  // night that would have been booked, and we lose it.
  const env = calendarPage({
    availability: { buffer_minutes: 1440, busy: busyOfKind('blackout') },
  });
  await env.settled();
  BUSY_NIGHTS.forEach((key) => {
    assert.equal(dayOf(env, key).getAttribute('d2-booking-day-busy'), '', key + ' is closed');
    assert.equal(dayOf(env, key).getAttribute('aria-disabled'), 'true', key);
  });
  BUSY_EDGES.forEach((key) => {
    assert.equal(dayOf(env, key).getAttribute('d2-booking-day-busy'), null,
      key + ' is a free night next to a blackout');
    assert.equal(dayOf(env, key).getAttribute('aria-disabled'), null, key + ' can be picked');
  });

  // And a square that only looks free is worth nothing: both edges really book.
  clickDay(env, '2027-05-09');
  clickDay(env, '2027-05-11');
  await env.settled();
  assert.deepEqual(env.booking.stay(), {
    product: PRODUCT,
    unit: 'day',
    starts_at: '2027-05-09T00:00:00',
    units_count: 2,
  }, 'the night before the blackout is a stay');
  clickDay(env, '2027-05-13');
  clickDay(env, '2027-05-14');
  await env.settled();
  assert.equal(env.booking.stay().starts_at, '2027-05-13T00:00:00',
    'and the night after it is an arrival');
});

test('a busy period with no kind at all is treated as a booking', async () => {
  // MUTACJA: treat a period whose kind is missing as a blackout and an answer
  // from before the field existed loses its buffer, so the calendar sells the
  // cleaning gap and the backend refuses the stay at submit.
  const env = calendarPage({
    availability: { buffer_minutes: 1440, busy: busyOfKind(null) },
  });
  await env.settled();
  assert.equal(busyOfKind(null)[0].kind, undefined, 'the answer really carries no kind');
  BUSY_EDGES.forEach((key) => {
    assert.equal(dayOf(env, key).getAttribute('d2-booking-day-busy'), '', key + ' is the buffer');
    assert.equal(dayOf(env, key).getAttribute('aria-disabled'), 'true', key);
  });
});

test('an unknown kind is treated as a booking, so the buffer still applies', async () => {
  // MUTACJA: skip the buffer for every kind other than the literal "booking"
  // and a kind the contract gains later goes out without its gap — a night
  // shown as free and refused at submit, which is worse than one greyed out
  // too often.
  const env = calendarPage({
    availability: { buffer_minutes: 1440, busy: busyOfKind('maintenance_hold') },
  });
  await env.settled();
  BUSY_EDGES.forEach((key) => {
    assert.equal(dayOf(env, key).getAttribute('d2-booking-day-busy'), '', key + ' is the buffer');
    assert.equal(dayOf(env, key).getAttribute('aria-disabled'), 'true', key);
  });
});

test('a blocked day says why, by the kind of period that blocks it', async () => {
  // MUTACJA: answer every blocked day with period_taken again and a guest
  // clicking a night the owner closed is told somebody just took it, while a
  // guest clicking the cleaning gap is told the same — neither sentence is
  // true and neither says what to do instead.
  const closed = calendarPage({ availability: { busy: busyOfKind('blackout') } });
  await closed.settled();
  clickDay(closed, '2027-05-11');
  await closed.settled();
  assert.equal(statusText(closed), 'W tym terminie obiekt nie przyjmuje gości.', statusText(closed));
  assert.equal(closed.booking.stay(), null, 'and nothing was chosen');

  const gap = calendarPage({ availability: { buffer_minutes: 1440 } });
  await gap.settled();
  clickDay(gap, '2027-05-13');
  await gap.settled();
  assert.equal(statusText(gap), 'Między pobytami musi zostać przerwa. Wybierz termin dzień dalej.',
    statusText(gap));
  clickDay(gap, '2027-05-11');
  await gap.settled();
  assert.equal(statusText(gap), gap.booking.message('period_taken'),
    'the taken nights themselves are taken, not a gap: ' + statusText(gap));
});

test('a night inside one period and beside another reads as taken, not as a gap', async () => {
  // MUTACJA: let the last period written win and a night that really is inside
  // a blackout is refused with "there must be a gap between stays" only
  // because the booking after it put its buffer on the same square.
  const env = calendarPage({
    availability: {
      // Two days of buffer, so the booking's gap reaches back over the 13th
      // and onto the 12th, which the blackout already holds.
      buffer_minutes: 2880,
      busy: [
        // 11-12 May closed by the owner, 14-15 May booked.
        { starts_at: '2027-05-10T22:00:00Z', ends_at: '2027-05-12T22:00:00Z', kind: 'blackout' },
        { starts_at: '2027-05-13T22:00:00Z', ends_at: '2027-05-15T22:00:00Z', kind: 'booking' },
      ],
    },
  });
  await env.settled();
  clickDay(env, '2027-05-12');
  await env.settled();
  assert.equal(statusText(env), 'W tym terminie obiekt nie przyjmuje gości.', statusText(env));
  // The 13th is nobody's night, only the gap the booking asks for.
  clickDay(env, '2027-05-13');
  await env.settled();
  assert.equal(statusText(env), 'Między pobytami musi zostać przerwa. Wybierz termin dzień dalej.',
    statusText(env));
});

test('a departure dragged over a blackout is refused as a blackout', async () => {
  // MUTACJA: report the first blocked night of a range as period_taken
  // whatever closed it and the guest is told the dates were just taken by
  // somebody else, which is not what happened.
  const env = calendarPage({ availability: { busy: busyOfKind('blackout') } });
  await env.settled();
  clickDay(env, '2027-05-09');
  clickDay(env, '2027-05-14');
  await env.settled();
  assert.equal(env.booking.stay(), null, 'the departure was refused');
  assert.equal(statusText(env), 'W tym terminie obiekt nie przyjmuje gości.', statusText(env));
});

test('every week day is a possible arrival: the contract has no check-in-day rule', async () => {
  // MUTACJA: bring back a check-in-day rule keyed off a field the availability
  // answer does not carry (availability.json has product_id, product_name,
  // timezone, currency, allowed_units, unit_prices, min_units, max_units,
  // lead_time_hours, buffer_minutes, payment_mode, hold_minutes, busy — and
  // nothing else) and the calendar closes week days the backend never closed.
  const fields = Object.keys(AVAILABILITY.response);
  assert.ok(fields.indexOf('check_in_days') < 0, fields.join(', '));

  // An answer carrying a field outside the contract changes nothing.
  const env = calendarPage({ availability: { check_in_days: ['sat'] } });
  await env.settled();
  // 1 May 2027 is a Saturday, so 2-7 May are Sunday through Friday.
  ['2027-05-02', '2027-05-03', '2027-05-04', '2027-05-05', '2027-05-06', '2027-05-07'].forEach((key) => {
    assert.equal(dayOf(env, key).getAttribute('aria-disabled'), null, key + ' is a possible arrival');
  });
  clickDay(env, '2027-05-04');
  clickDay(env, '2027-05-06');
  await env.settled();
  assert.equal(env.booking.stay().units_count, 2, 'a Tuesday arrival makes a stay like any other');
});

test('clicking a day that has already been is told it is past, not that it was taken', async () => {
  // MUTACJA: answer a past day with the period_taken sentence and the guest
  // hears "somebody just took this period" about yesterday, which contradicts
  // the same square's own aria-label.
  const env = calendarPage({ now: '2027-05-15T10:00:00Z' });
  await env.settled();
  const past = dayOf(env, '2027-05-02');
  assert.equal(past.getAttribute('d2-booking-day-past'), '');
  assert.equal(past.getAttribute('aria-disabled'), 'true');

  fire(past, 'click');
  await env.settled();
  const said = statusText(env);
  assert.notEqual(said, env.booking.message('period_taken'), said);
  assert.ok(said.indexOf('minął') > 0, said);
  assert.equal(env.booking.stay(), null, 'and nothing was chosen');
});

test('a calendar outside a widget still gets its seven columns', async () => {
  // MUTACJA: inject the stylesheet from the widget only and a page whose
  // whole setup is <div d2-booking-calendar> renders a vertical column of 31
  // buttons, because every colour rule — and the grid — is widget-scoped.
  const env = calendarPage();
  await env.settled();
  const sheets = allOf(env, 'd2-booking-styles');
  assert.equal(sheets.length, 1, 'a bare calendar page gets a stylesheet');
  const css = String(sheets[0].textContent);
  assert.ok(
    css.indexOf('[d2-booking-calendar-grid] [role=row]{display:grid') === 0,
    'and it is the grid, first thing: ' + css.slice(0, 120)
  );
  assert.equal(css.indexOf('[d2-booking-widget]'), -1, 'and nothing of the drawn look');
});

// ---------------------------------------------------------------------------
// Refusals: the sentence, the field and the wait
// ---------------------------------------------------------------------------

test('every refusal in errors.json has a sentence of its own', async () => {
  // MUTACJA: let a refusal fall through to the generic sentence — which is
  // what a fixture refresh that adds one does — and the guest reads "could
  // not finish the booking" about a balance that is already in.
  const env = page({ forms: [] });
  await env.settled();
  const generic = env.booking.message('a-reason-the-module-has-never-heard-of');
  assert.ok(generic.length > 10, generic);
  const said = {};
  ERRORS.forEach((e) => {
    const text = env.booking.message(e.name);
    assert.notEqual(text, generic, e.name + ' has no sentence of its own');
    assert.ok(text.length > 10, e.name + ': ' + text);
    said[text] = (said[text] || []).concat(e.name);
  });
  // Two refusals may legitimately read the same (validation_error and
  // form_invalid are both "fix the marked fields"), but not many.
  const shared = Object.keys(said).filter((t) => said[t].length > 1);
  assert.ok(shared.length <= 1, 'sentences doing double duty: ' + JSON.stringify(shared));
});

test('a 502 anywhere but the payment is a server error, not a Stripe outage', async () => {
  // MUTACJA: map every 502 to payment_provider_unavailable and a gateway
  // hiccup on the price tells a guest who has not touched a payment that the
  // payment provider is down.
  const env = calendarPage({ price: true, refuse: { quote: { status: 502, body: { detail: 'Bad gateway' } } } });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  await env.tick();
  const said = statusText(env);
  assert.equal(said, env.booking.message('server_error'), said);
  assert.notEqual(said, env.booking.message('payment_provider_unavailable'));
});

test('a 422 whose loc ends in an array index still names the field', async () => {
  // MUTACJA: answer the first part of the loc that is not body/query/path and
  // ["body","child_ages",0] resolves to "0", so a child age the backend
  // refused lands on the whole form with no field marked at all.
  const env = page({
    forms: [{
      fields: FULL_FIELDS,
      submit: true,
      errorSlots: ['child_ages', 'form'],
      attrs: { 'd2-booking-product': BOOKING.response.product_id },
    }],
    refuse: {
      bookings: {
        status: 422,
        body: {
          detail: [
            { type: 'less_than_equal', loc: ['body', 'child_ages', 0], msg: 'Input should be less than or equal to 12' },
          ],
        },
      },
    },
  });
  await env.settled();
  env.booking.select({ unit: STAY.unit, starts_at: STAY.starts_at, units_count: STAY.units_count });
  const res = await env.booking.book(env.form, Object.assign({}, env.booking.stay(), { product: PRODUCT }));
  assert.equal(res.reason, 'validation_error');
  assert.equal(res.field, 'child_ages');
  assert.equal(fieldOf(env.form, 'child_ages').getAttribute('d2-booking-invalid'), '');
  assert.ok(errorTextOf(env.form, 'child_ages').length > 5, errorTextOf(env.form, 'child_ages'));
});

test('429 on the bookings route waits the Retry-After before the button opens', async () => {
  // MUTACJA: re-enable the button at once on a 429 and the route most likely
  // to be rate-limited — a guest hammering Zarezerwuj — is the one that never
  // waits, so every click earns the next refusal.
  const env = payPage({ refuse: { bookings: 'too_many_requests' }, headers: { 'Retry-After': '60' } });
  await paySubmit(env);
  assert.equal(bookingPosts(env).length, 1);
  assert.ok(errorTextOf(env.form, 'form').indexOf('60') > 0, errorTextOf(env.form, 'form'));
  assert.equal(env.form.getAttribute('d2-booking-payment'), 'wait');
  assert.equal(submitOf(env.form).disabled, true, 'the button waits with the guest');

  fire(env.form, 'submit');
  await env.settled();
  assert.equal(bookingPosts(env).length, 1, 'and a click during the wait sends nothing');

  env.flush();
  await env.settled();
  assert.equal(submitOf(env.form).disabled, false, 'it opens when the wait is over');
  assert.equal(env.form.getAttribute('d2-booking-payment'), null);
});

// ---------------------------------------------------------------------------
// One hold per stay
// ---------------------------------------------------------------------------

test('a note fixed after a payment hiccup pays the booking that exists', async () => {
  // MUTACJA: key the kept booking on the whole request body and any edit to a
  // contact field after a retryable payment refusal POSTs a second booking
  // for the same nights — the double hold this module promises not to make.
  const env = payPage({ refuse: { checkout: 'payment_provider_unavailable' } });
  await paySubmit(env);
  assert.equal(bookingPosts(env).length, 1);
  assert.equal(env.form.getAttribute('d2-booking-payment'), 'retry');

  fieldOf(env.form, 'note').value = 'Przyjazd po 21:00';
  fire(env.form, 'submit');
  await env.settled();
  assert.equal(bookingPosts(env).length, 1, 'still one hold on those nights');
  assert.equal(checkoutPosts(env).length, 2, 'and the second try pays it');
});

test('a hold that died frees the form for another period', async () => {
  // MUTACJA: keep the dead booking and lock the whole form on a final
  // refusal, and a guest whose hold expired between the refusal and the retry
  // cannot book any period at all without reloading the page.
  const env = payPage({ refuse: { checkout: 'booking_not_payable' } });
  await paySubmit(env);
  assert.equal(env.form.getAttribute('d2-booking-payment'), 'final');
  assert.equal(submitOf(env.form).disabled, true, 'this stay is closed');

  fire(env.form, 'submit');
  await env.settled();
  assert.equal(bookingPosts(env).length, 1, 'the same stay is not tried again');

  // Another period is another booking, and the guest is entitled to make it.
  // A real guest gets there through the button, not by firing submit, so it
  // has to come back: a disabled button also blocks Enter in a field.
  env.booking.select({ unit: STAY.unit, starts_at: '2027-06-01T00:00:00', units_count: 2 });
  assert.equal(submitOf(env.form).disabled, false, 'another period opens the button again');
  assert.equal(env.form.getAttribute('d2-booking-payment'), 'final', 'the dead stay stays refused');
  fire(env.form, 'submit');
  await env.settled();
  assert.equal(bookingPosts(env).length, 2, 'the new period really was sent');
  assert.equal(bookingPosts(env)[1].body.starts_at, '2027-06-01T00:00:00');
});

test('booking:created says nothing about the guest', async () => {
  // MUTACJA: hand the whole answer on, and a GTM listener pushing the detail to
  // the dataLayer sends the guest's e-mail to every tag on the page.
  const env = await paySubmit(payPage());
  const created = env.events.find((e) => e.name === 'booking:created');
  assert.ok(created);
  assert.equal(created.data.booking.id, BOOKING.response.id, 'the booking itself is there');
  ['customer_name', 'customer_email', 'customer_phone', 'customer_note'].forEach((k) => {
    assert.ok(!(k in created.data.booking), k);
  });
});

test('booking:created hands the page a copy, never the object we are about to pay', async () => {
  // MUTACJA: emit res.data itself and a page listener that reshapes the
  // payload changes which booking the checkout step is given.
  const env = payPage();
  await env.settled();
  env.window.digi2.emit = (name, data) => {
    if (name === 'booking:created') delete data.booking.id;
  };
  env.booking.select({ unit: STAY.unit, starts_at: STAY.starts_at, units_count: STAY.units_count });
  fire(env.form, 'submit');
  await env.settled();
  assert.equal(checkoutPosts(env).length, 1, 'the payment still knows its booking');
  assert.ok(checkoutPosts(env)[0].url.indexOf('/bookings/' + BOOKING.response.id + '/') > 0,
    checkoutPosts(env)[0].url);
});

// ---------------------------------------------------------------------------
// The price: what is asked for, and what the rows say
// ---------------------------------------------------------------------------

test('typing where the price cannot change asks for no second quote', async () => {
  // MUTACJA: send a quote for every settled keystroke and writing one note
  // spends five to ten calls of the key's rate limit on the identical body.
  const env = calendarPage({ price: true, forms: [{ fields: FULL_FIELDS }] });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  await env.tick();
  assert.equal(quoteCalls(env).length, 1);

  fieldOf(env.form, 'note').value = 'Przyjazd po 20:00, prosimy o pokój od podwórza';
  fire(env.form, 'input');
  await env.tick();
  assert.equal(quoteCalls(env).length, 1, 'the question has not changed, so neither has the answer');
  assert.equal(totalText(env), money(QUOTE.response.amount_total, QUOTE.response.currency));

  // A changed party is a changed question, and that one is asked.
  fieldOf(env.form, 'adults').value = '3';
  fire(env.form, 'input');
  await env.tick();
  assert.equal(quoteCalls(env).length, 2);
});

test('a line carries its rate only when the answer has one', async () => {
  // MUTACJA: print a rate whatever percent holds and a cleaning fee folded
  // into the stay (percent null, by contract) shows the guest a discount
  // percentage that does not match the amount beside it.
  const withRate = calendarPage({
    price: true,
    quote: {
      line_items: QUOTE.response.line_items.concat([
        { kind: 'length_discount', label: null, quantity: 1, unit_amount: null, amount: '-55.00', percent: '10' },
      ]),
    },
  });
  await withRate.settled();
  clickDay(withRate, '2027-05-02');
  clickDay(withRate, '2027-05-04');
  await withRate.tick();
  const rows = lineRows(withRate);
  assert.equal(rows.length, 3);
  const label = textIn(rows[2], 'd2-booking-line-label');
  // "10" in the answer is ten percent, so the guest reads 10%, never 1000%
  // and never 0,1% beside a 55 zloty discount on a 550 zloty stay.
  const rate = new Intl.NumberFormat(CONFIG.response.default_language, {
    style: 'percent', maximumFractionDigits: 2,
  }).format(0.1);
  assert.ok(label.indexOf('(' + rate + ')') > 0, label + ' / ' + rate);

  const merged = calendarPage({
    price: true,
    quote: {
      line_items: QUOTE.response.line_items.concat([
        { kind: 'length_discount', label: null, quantity: 1, unit_amount: null, amount: '-55.00', percent: null },
      ]),
    },
  });
  await merged.settled();
  clickDay(merged, '2027-05-02');
  clickDay(merged, '2027-05-04');
  await merged.tick();
  const bare = textIn(lineRows(merged)[2], 'd2-booking-line-label');
  assert.equal(bare.indexOf('%'), -1, bare);
  assert.ok(bare.length > 3, bare);
});

// ---------------------------------------------------------------------------
// The guest's own pages
// ---------------------------------------------------------------------------

test('a booking waiting for the owner is settled, not a payment under inspection', async () => {
  // MUTACJA: fall through to "the payment is still being checked" and an
  // on-request booking — which has no payment at all — is polled eight times
  // over forty seconds to say the same wrong thing.
  const env = returnPage({
    statusSeq: [{ status: 'pending', payment_mode: 'on_request', paid: false, balance_due_minor: null }],
    search: '?booking=' + BOOKING_ID,
  });
  await env.settled();
  assert.equal(env.ret.getAttribute('d2-booking-return-state'), 'pending');
  const said = slotText(env, 'd2-booking-return-message');
  assert.notEqual(said, env.booking.message('bad_response'));
  assert.ok(said.length > 10, said);
  assert.equal(callsTo(env, '/status').length, 1);

  for (let i = 0; i < 10; i++) await env.tick();
  assert.equal(callsTo(env, '/status').length, 1, 'a settled booking is not polled');
});

test('a balance refusal no retry can mend takes its button with it', async () => {
  // MUTACJA: re-open the balance button on every refusal and a guest whose
  // owner has no Stripe clicks it again and again, each click a fresh POST
  // against the key's rate limit until the 429.
  for (const name of ['stripe_not_connected', 'balance_already_paid', 'no_balance']) {
    const env = managePage({
      hash: '#token=' + TOKEN + '&action=balance',
      refuse: { balance: name },
    });
    await env.settled();
    fire(manageAction(env, 'balance'), 'click');
    await env.settled();
    assert.equal(callsTo(env, '/balance-checkout').length, 1, name);
    assert.equal(manageAction(env, 'balance'), null, name + ': the button is gone');
    assert.equal(slotText(env, 'd2-booking-manage-message'), env.booking.message(name), name);
  }
});

test('a balance the provider only fumbled keeps its button', async () => {
  // MUTACJA: close the button on every refusal and a guest whose payment is
  // merely in the post (or whose Stripe had a bad minute) is left with no way
  // to try again on a page that has nothing else on it.
  for (const name of ['balance_processing', 'payment_provider_unavailable']) {
    const env = managePage({
      hash: '#token=' + TOKEN + '&action=balance',
      refuse: { balance: name },
    });
    await env.settled();
    fire(manageAction(env, 'balance'), 'click');
    await env.settled();
    const button = manageAction(env, 'balance');
    assert.ok(button, name + ': the button is still there');
    assert.equal(button.disabled, false, name + ': and it is clickable');
  }
});

test('the pets sentence follows the product of the widget, not only the loader tag', async () => {
  // MUTACJA: look the product up on the loader tag only and a widget that
  // names its own apartment asks about the wrong one — or about none at all,
  // and the guest reads an empty hint under a question about a threshold.
  const env = widgetPage({
    loaderAttrs: {},
    widget: { attrs: { 'd2-booking-product': SLUG } },
    config: { form_fields: { pets: 'optional' } },
  });
  await env.settled();
  const asked = productCalls(env);
  assert.equal(asked.length, 1, 'one lookup: ' + asked.map((c) => c.url).join(' | '));
  assert.ok(asked[0].url.indexOf('/products/' + SLUG) > 0, asked[0].url);
  const hint = env.document.querySelector('[d2-booking-hint="pets_over_threshold"]');
  assert.ok(String(hint.textContent).indexOf('10') >= 0, String(hint.textContent));
});

// ---------------------------------------------------------------------------
// The list of places — GET /products into the template the page built
// ---------------------------------------------------------------------------

function listPage(extra) {
  return page(Object.assign({ forms: [], results: true }, extra || {}));
}

// `n` entries built off the fixture's one, each with its own id, slug and
// name, so one card can be told from the card beside it.
function places(n, from) {
  const base = PRODUCTS.response.data[0];
  const out = [];
  for (let i = 0; i < n; i++) {
    const k = (from || 0) + i;
    out.push(Object.assign(clone(base), {
      id: 'id-' + k,
      slug: 'apartament-' + k,
      name: 'Apartament ' + k,
    }));
  }
  return out;
}

function answerOf(list, count, more) {
  return { data: list, count: count === undefined ? list.length : count, has_more: !!more };
}

function rowsOf(env) {
  return env.document.querySelectorAll('[d2-booking-item]');
}

function bindOf(row, field) {
  return row.querySelector('[d2-booking-bind="' + field + '"]');
}

function bindText(row, field) {
  const el = bindOf(row, field);
  return el ? String(el.textContent || '') : null;
}

// GET /products with a query is the list; /products/<ref> is one place.
function listCalls(env) {
  return env.calls.filter((c) => /\/products\?/.test(c.url));
}

function listBox(env) {
  return env.document.querySelector('[d2-booking-results]');
}

test('the template is cloned once per place and never stands in the list itself', async () => {
  // MUTACJA: render the rows from innerHTML, or leave the template where it
  // stands, and every list opens with one empty card above the apartments —
  // and a name out of the API could bring its own markup with it.
  const env = listPage({ products: answerOf(places(3), 3) });
  await env.settled();

  const rows = rowsOf(env);
  assert.equal(rows.length, 3);
  assert.equal(env.document.querySelectorAll('[d2-booking-template]').length, 0);
  // The card keeps the class the Designer put on the template.
  assert.equal(rows[0].getAttribute('class'), 'karta');
  assert.deepEqual(rows.map((r) => bindText(r, 'name')),
    ['Apartament 0', 'Apartament 1', 'Apartament 2']);
  assert.equal(bindText(rows[0], 'city_line'), PRODUCTS.response.data[0].city_line);
  assert.equal(listBox(env).getAttribute('d2-booking-results-state'), 'ready');
  assert.equal(listCalls(env).length, 1);
});

test('a field the answer left null leaves an empty marked slot, never "null"', async () => {
  // MUTACJA: write String(value) whatever it holds and every apartment with
  // no city line reads "null" — the contract calls eighteen of these fields
  // nullable, so that is not an edge case but most pages.
  const [one] = places(1);
  one.name = null;
  one.city_line = null;
  one.image_url = null;
  const env = listPage({
    results: { template: ['name', 'city_line', 'image', 'description'] },
    products: answerOf([one]),
  });
  await env.settled();

  const row = rowsOf(env)[0];
  for (const field of ['name', 'city_line']) {
    assert.equal(bindText(row, field), '', field);
    assert.equal(bindOf(row, field).getAttribute('d2-booking-empty'), '', field);
  }
  const img = bindOf(row, 'image');
  assert.equal(img.getAttribute('src'), null);
  assert.equal(img.getAttribute('d2-booking-empty'), '');
  // A field the answer does carry is still filled, and not marked.
  assert.equal(bindText(row, 'description'), PRODUCTS.response.data[0].description);
  assert.equal(bindOf(row, 'description').getAttribute('d2-booking-empty'), null);
});

test('the link carries the slug in the address shape the page asked for', async () => {
  // MUTACJA: hard-code ?apartament= and a client whose apartments are CMS
  // pages under SEO addresses cannot send a guest anywhere they actually live.
  const list = answerOf(places(1));

  const own = listPage({ products: list });
  await own.settled();
  // The default is the one the booking page itself reads off the address.
  assert.equal(rowsOf(own)[0].getAttribute('href'), '?apartament=apartament-0');

  const seo = listPage({ results: { link: '/apartamenty/{slug}' }, products: list });
  await seo.settled();
  assert.equal(rowsOf(seo)[0].getAttribute('href'), '/apartamenty/apartament-0');

  const whole = listPage({
    results: { attrs: { 'd2-booking-results-link': '/oferta/{slug}' }, linkChild: true },
    products: list,
  });
  await whole.settled();
  assert.equal(rowsOf(whole)[0].querySelector('[d2-booking-link]')
    .getAttribute('href'), '/oferta/apartament-0');

  // No slug in the answer: the id is a reference the booking page resolves
  // just as well, so the card still leads somewhere.
  const noSlug = places(1);
  noSlug[0].slug = null;
  const byId = listPage({ products: answerOf(noSlug) });
  await byId.settled();
  assert.equal(rowsOf(byId)[0].getAttribute('href'), '?apartament=id-0');
});

test('the more button asks for the next page, appends it and then goes', async () => {
  // MUTACJA: ask for the same offset again, or re-render instead of appending,
  // and the second page is the first one twice — with the button still
  // offering a third.
  const env = listPage({
    results: { attrs: { 'd2-booking-results-limit': '3' }, inner: ['more', 'count'] },
    productsSeq: [answerOf(places(3), 5, true), answerOf(places(2, 3), 5, false)],
  });
  await env.settled();

  const more = env.document.querySelector('[d2-booking-more]');
  assert.equal(rowsOf(env).length, 3);
  assert.equal(more.getAttribute('hidden'), null);
  assert.equal(slotText(env, 'd2-booking-count'), '5');
  assert.ok(listCalls(env)[0].url.indexOf('limit=3&offset=0') > 0, listCalls(env)[0].url);

  fire(more, 'click');
  await env.settled();
  assert.equal(listCalls(env).length, 2);
  assert.ok(listCalls(env)[1].url.indexOf('limit=3&offset=3') > 0, listCalls(env)[1].url);
  assert.equal(rowsOf(env).length, 5);
  assert.deepEqual(rowsOf(env).map((r) => bindText(r, 'name')).slice(3),
    ['Apartament 3', 'Apartament 4']);
  assert.equal(more.getAttribute('hidden'), '');

  // A button the answer has finished with asks for nothing more.
  fire(more, 'click');
  await env.settled();
  assert.equal(listCalls(env).length, 2);
});

test('an answer with nothing in it shows the empty state and no rows', async () => {
  // MUTACJA: leave the empty state hidden and a filter that found nothing is
  // a blank strip of page that reads as broken.
  const env = listPage({
    results: { inner: ['more', 'count', 'empty'] },
    products: answerOf([], 0),
  });
  await env.settled();

  assert.equal(rowsOf(env).length, 0);
  assert.equal(env.document.querySelector('[d2-booking-results-empty]').style.display, '');
  assert.equal(slotText(env, 'd2-booking-count'), '0');
  assert.equal(env.document.querySelector('[d2-booking-more]').getAttribute('hidden'), '');
  assert.equal(listBox(env).getAttribute('d2-booking-results-state'), 'empty');

  // A list that found something keeps that same element out of sight.
  const found = listPage({ results: { inner: ['empty'] }, products: answerOf(places(1)) });
  await found.settled();
  assert.equal(found.document.querySelector('[d2-booking-results-empty]').style.display, 'none');
});

test("a list with no template gets the module's own cards and its stylesheet", async () => {
  // MUTACJA: give up without a template and a page that only had time for a
  // container shows nothing at all; draw the cards without the stylesheet and
  // they come out as a column of bare text.
  const entry = PRODUCTS.response.data[0];
  const env = listPage({
    results: { template: false },
    products: answerOf(places(1)),
  });
  await env.settled();

  const row = rowsOf(env)[0];
  assert.ok(row, 'a card was drawn');
  assert.equal(row.getAttribute('d2-booking-built'), '');
  assert.equal(row.tagName, 'A');
  assert.equal(row.getAttribute('href'), '?apartament=apartament-0');
  assert.equal(bindText(row, 'name'), 'Apartament 0');
  assert.equal(bindText(row, 'price'), money(entry.price.price, entry.currency));
  assert.equal(bindOf(row, 'image').getAttribute('src'), entry.image_url);
  // The amount says what it is an amount of; the contract's only unit is a day.
  assert.ok(String(bindText(row, 'price_unit')).length > 0, bindText(row, 'price_unit'));

  // The same stylesheet as the drawn widget, injected the same way.
  const sheet = env.document.querySelector('[d2-booking-styles]');
  assert.ok(sheet && String(sheet.textContent).indexOf('--d2-booking-accent') > 0);
  assert.equal(listBox(env).getAttribute('d2-booking-results-drawn'), '');
});

test('nothing the API answers becomes markup or a style of its own', async () => {
  // MUTACJA: write a bound value with innerHTML, or an image address into
  // url(…) unchecked, and one apartment name out of somebody else's CMS runs
  // script on the client's page.
  const [one] = places(1);
  one.name = '<img src=x onerror="alert(1)">';
  one.city_line = '"><script>alert(2)</script>';
  one.image_url = 'javascript:alert(3)';
  const env = listPage({
    results: { template: ['name', 'city_line', 'image'] },
    products: answerOf([one]),
  });
  await env.settled();

  const row = rowsOf(env)[0];
  // The text is the answer's text, character for character — and it is text.
  assert.equal(bindText(row, 'name'), one.name);
  assert.equal(bindOf(row, 'name').children.length, 0);
  assert.equal(bindText(row, 'city_line'), one.city_line);
  // An address that is not an image address is no image at all.
  assert.equal(bindOf(row, 'image').getAttribute('src'), null);
  assert.equal(bindOf(row, 'image').getAttribute('d2-booking-empty'), '');

  // The same answer in a slot that is not an <img>: the address would go into
  // a style property, where one quote ends the declaration and starts another.
  const [two] = places(1);
  two.image_url = 'https://cdn.example.org/a.jpg") ; background: url("http://evil.example';
  const styled = listPage({
    results: { template: ['image'], imageTag: 'div' },
    products: answerOf([two]),
  });
  await styled.settled();
  const slot = bindOf(rowsOf(styled)[0], 'image');
  assert.equal(slot.style.backgroundImage, '');
  assert.equal(slot.getAttribute('d2-booking-empty'), '');

  // And an address that is an address does become the background.
  const good = listPage({
    results: { template: ['image'], imageTag: 'div' },
    products: answerOf(places(1)),
  });
  await good.settled();
  assert.equal(bindOf(rowsOf(good)[0], 'image').style.backgroundImage,
    'url("' + PRODUCTS.response.data[0].image_url + '")');
});

test('any other scalar of the answer binds by its own name', async () => {
  // MUTACJA: bind a fixed list of fields and a page that wants the floor, the
  // beds or the rental kind waits for the next release of the module instead
  // of writing one attribute.
  const [one] = places(1);
  one.currency = 'EUR';
  one.floor = 0;
  const env = listPage({
    results: {
      template: ['price', 'rooms', 'area', 'floor', 'beds', 'max_guests',
        'rental_kind', 'amenities', 'requires_approval', 'pet_fee'],
    },
    products: answerOf([one]),
  });
  await env.settled();

  const row = rowsOf(env)[0];
  // The amount is the entry's own price in the entry's own currency.
  assert.equal(bindText(row, 'price'), money('250.00', 'EUR'));
  assert.equal(bindText(row, 'rooms'), '2');
  assert.equal(bindText(row, 'area'), '48.50');
  assert.equal(bindText(row, 'beds'), '2');
  assert.equal(bindText(row, 'max_guests'), '4');
  assert.equal(bindText(row, 'rental_kind'), 'apartment');
  assert.equal(bindText(row, 'amenities'), 'wifi');
  // The ground floor is a floor, not a missing value.
  assert.equal(bindText(row, 'floor'), '0');
  assert.equal(bindOf(row, 'floor').getAttribute('d2-booking-empty'), null);
  // false is the answer "no", not the word "false".
  assert.equal(bindText(row, 'requires_approval'), '');
  assert.equal(bindOf(row, 'requires_approval').getAttribute('d2-booking-empty'), '');
  // An object is three fields, and none of them is "[object Object]".
  assert.equal(bindText(row, 'pet_fee'), '');
});

test('a refused list says so and leaves the button for another try', async () => {
  // MUTACJA: print the backend's own sentence, or nothing at all, and a list
  // behind a rate limit looks like an offer with nothing in it.
  const env = listPage({
    results: { inner: ['more', 'count', 'empty'] },
    refuse: { products: 'too_many_requests' },
  });
  await env.settled();

  assert.equal(listBox(env).getAttribute('d2-booking-results-state'), 'error');
  assert.equal(rowsOf(env).length, 0);
  assert.equal(slotText(env, 'd2-booking-results-message'), env.booking.message('too_many_requests'));
  // A refusal is not an empty offer, so nothing says the offer is empty.
  assert.equal(env.document.querySelector('[d2-booking-results-empty]').style.display, 'none');

  // The button is still there and the next click asks for the same page again.
  fire(env.document.querySelector('[d2-booking-more]'), 'click');
  await env.settled();
  assert.equal(listCalls(env).length, 2);
  assert.ok(listCalls(env)[1].url.indexOf('offset=0') > 0, listCalls(env)[1].url);
});

// ---------------------------------------------------------------------------
// The search above the list — the period, the party and the city
// ---------------------------------------------------------------------------

// The query GET /products takes, straight out of the contract fixture.
const LIST_QUERY = PRODUCTS.query;

function searchFieldOf(env, name) {
  return env.searchForm.querySelector('[d2-booking-search-field="' + name + '"]');
}

test('a search sends the period, the city and guests as the sum of the party', async () => {
  // MUTACJA: send adults and children beside guests (or instead of it) and the
  // route answers 422 — GET /products takes guests and nothing else, and a
  // guests that contradicts the sum of the party is a refusal (KONTRAKT.md).
  const env = listPage({
    searchForm: {
      values: {
        check_in: LIST_QUERY.check_in,
        check_out: LIST_QUERY.check_out,
        adults: LIST_QUERY.guests - 1,
        children: 1,
        location: LIST_QUERY.location,
      },
    },
    productsSeq: [answerOf(places(3), 3), answerOf(places(1), 1)],
  });
  await env.settled();
  assert.equal(listCalls(env).length, 1, 'the page opens with one page of the list');

  fire(env.searchForm, 'submit');
  await env.settled();
  assert.equal(listCalls(env).length, 2);
  const asked = listCalls(env)[1].url;
  assert.ok(asked.indexOf('check_in=' + LIST_QUERY.check_in) > 0, asked);
  assert.ok(asked.indexOf('check_out=' + LIST_QUERY.check_out) > 0, asked);
  assert.ok(asked.indexOf('guests=' + LIST_QUERY.guests) > 0, asked);
  assert.ok(asked.indexOf('location=' + encodeURIComponent(LIST_QUERY.location)) > 0, asked);
  assert.ok(asked.indexOf('adults=') < 0, asked);
  assert.ok(asked.indexOf('children=') < 0, asked);
  // A search is the same page with another list, so nothing reloads.
  assert.deepEqual(env.redirects, []);

  // A page that asks about neither adults nor children sends no guests at all:
  // an invented party would filter out apartments the guest can have.
  const nobody = listPage({ searchForm: { fields: ['check_in', 'check_out', 'location'] } });
  await nobody.settled();
  fire(nobody.searchForm, 'submit');
  await nobody.settled();
  assert.ok(listCalls(nobody)[1].url.indexOf('guests=') < 0, listCalls(nobody)[1].url);
});

test('a pinned city wins over the page select and the guest cannot change it', async () => {
  // MUTACJA: let the select answer for the location, or read the pin with
  // digi2.attr, and the pilot's one-city page either wanders off its city or
  // sends half a name — everything after a ';' is cut by the responsive reader.
  const PIN = 'Warszawa; Praga-Północ';
  const env = listPage({
    searchForm: {
      attrs: { 'd2-booking-location': PIN },
      tags: { location: 'select' },
      values: { location: 'Kraków' },
    },
  });
  await env.settled();

  const select = searchFieldOf(env, 'location');
  assert.equal(select.value, PIN);
  assert.equal(select.disabled, true);
  assert.equal(select.getAttribute('d2-booking-pinned'), '');
  assert.ok(listCalls(env)[0].url.indexOf('location=' + encodeURIComponent(PIN)) > 0,
    listCalls(env)[0].url);

  // A guest who sets the select anyway still gets the city the page pinned.
  select.value = 'Kraków';
  fire(env.searchForm, 'submit');
  await env.settled();
  assert.ok(listCalls(env)[1].url.indexOf('location=' + encodeURIComponent(PIN)) > 0,
    listCalls(env)[1].url);
  assert.ok(listCalls(env)[1].url.indexOf('Krak') < 0, listCalls(env)[1].url);
  // The pin is the page's own decision, so it is not part of the shared link.
  assert.ok(String(env.location.search).indexOf('location=') < 0, env.location.search);
});

test('a city pinned on the list alone filters it with no search form at all', async () => {
  // MUTACJA: read d2-booking-location off a form only, and a city landing page
  // with no search on it shows the whole country.
  const env = listPage({ results: { attrs: { 'd2-booking-location': LIST_QUERY.location } } });
  await env.settled();
  assert.equal(listCalls(env).length, 1);
  assert.ok(listCalls(env)[0].url.indexOf('location=' + encodeURIComponent(LIST_QUERY.location)) > 0,
    listCalls(env)[0].url);
});

test('a search goes into the page address and keeps what the address carried', async () => {
  // MUTACJA: drop replaceState and a reload loses the search while the link is
  // worth nothing to share; rewrite the whole query instead of only the search
  // keys and ?apartament= and the campaign that brought the guest here go too.
  const env = listPage({
    search: '?utm_source=newsletter',
    searchForm: {
      values: {
        check_in: LIST_QUERY.check_in,
        check_out: LIST_QUERY.check_out,
        adults: LIST_QUERY.guests,
        location: LIST_QUERY.location,
      },
    },
  });
  await env.settled();

  fire(env.searchForm, 'submit');
  await env.settled();
  const where = String(env.location.search);
  assert.ok(where.indexOf('utm_source=newsletter') > 0, where);
  assert.ok(where.indexOf('check_in=' + LIST_QUERY.check_in) > 0, where);
  assert.ok(where.indexOf('check_out=' + LIST_QUERY.check_out) > 0, where);
  assert.ok(where.indexOf('adults=' + LIST_QUERY.guests) > 0, where);
  assert.ok(where.indexOf('location=' + encodeURIComponent(LIST_QUERY.location)) > 0, where);
  // The address keeps the two questions the page asked, not the sum we send:
  // a shared link has to be able to put the party back into the form.
  assert.ok(where.indexOf('guests=') < 0, where);
  assert.deepEqual(env.redirects, []);
});

test('a link with a search in it opens its own result and fills the form', async () => {
  // MUTACJA: ignore the query on start and a shared link opens the whole offer
  // under a form that shows the search nobody performed.
  const env = listPage({
    search: '?check_in=' + LIST_QUERY.check_in + '&check_out=' + LIST_QUERY.check_out
      + '&adults=' + LIST_QUERY.guests + '&location=' + encodeURIComponent(LIST_QUERY.location),
    searchForm: true,
  });
  await env.settled();

  assert.equal(listCalls(env).length, 1);
  const asked = listCalls(env)[0].url;
  assert.ok(asked.indexOf('check_in=' + LIST_QUERY.check_in) > 0, asked);
  assert.ok(asked.indexOf('guests=' + LIST_QUERY.guests) > 0, asked);
  assert.ok(asked.indexOf('location=' + encodeURIComponent(LIST_QUERY.location)) > 0, asked);
  assert.equal(searchFieldOf(env, 'check_in').value, LIST_QUERY.check_in);
  assert.equal(searchFieldOf(env, 'check_out').value, LIST_QUERY.check_out);
  assert.equal(searchFieldOf(env, 'adults').value, String(LIST_QUERY.guests));
  assert.equal(searchFieldOf(env, 'location').value, LIST_QUERY.location);
});

test('a search replaces the list and sends the paging back to the first page', async () => {
  // MUTACJA: append the answer of a search, or keep the offset, and the second
  // search shows the first one's apartments and asks for a page past its end.
  const env = listPage({
    results: { attrs: { 'd2-booking-results-limit': '3' }, inner: ['more', 'count'] },
    searchForm: { values: { location: LIST_QUERY.location } },
    productsSeq: [answerOf(places(3), 5, true), answerOf(places(2, 7), 2, false)],
  });
  await env.settled();
  assert.equal(rowsOf(env).length, 3);

  fire(env.searchForm, 'submit');
  await env.settled();
  assert.ok(listCalls(env)[1].url.indexOf('limit=3&offset=0') > 0, listCalls(env)[1].url);
  assert.deepEqual(rowsOf(env).map((r) => bindText(r, 'name')), ['Apartament 7', 'Apartament 8']);
  assert.equal(slotText(env, 'd2-booking-count'), '2');
  assert.equal(env.document.querySelector('[d2-booking-more]').getAttribute('hidden'), '');
  assert.equal(listBox(env).getAttribute('d2-booking-results-state'), 'ready');
  assert.equal(env.events.filter((e) => e.name === 'booking:search').length, 1);
});

test('a page still in flight when the search goes out no longer counts', async () => {
  // MUTACJA: let the answer to a page asked for under the old filter still
  // move the offset, and the first click after a search skips as many
  // apartments as that answer carried.
  const env = listPage({
    results: { attrs: { 'd2-booking-results-limit': '3' }, inner: ['more'] },
    searchForm: { values: { location: LIST_QUERY.location } },
    productsSeq: [
      answerOf(places(3), 9, true),
      answerOf(places(3, 3), 9, true),
      answerOf(places(2, 7), 9, true),
    ],
  });
  await env.settled();

  // The next page is asked for and the guest searches before it comes back.
  fire(env.document.querySelector('[d2-booking-more]'), 'click');
  fire(env.searchForm, 'submit');
  await env.settled();
  assert.equal(listCalls(env).length, 3);
  assert.deepEqual(rowsOf(env).map((r) => bindText(r, 'name')), ['Apartament 7', 'Apartament 8']);

  fire(env.document.querySelector('[d2-booking-more]'), 'click');
  await env.settled();
  assert.ok(listCalls(env)[3].url.indexOf('offset=2') > 0, listCalls(env)[3].url);
});

test('half a period asks the API nothing and says one short sentence', async () => {
  // MUTACJA: send one date without the other and the route answers 400 "check_in
  // and check_out go together", whose sentence is for logs; the guest would see
  // a list that went empty for no reason they can read.
  const env = listPage({
    searchForm: { values: { check_in: LIST_QUERY.check_in, location: LIST_QUERY.location } },
  });
  await env.settled();
  assert.equal(listCalls(env).length, 1);

  fire(env.searchForm, 'submit');
  await env.settled();
  assert.equal(listCalls(env).length, 1, 'nothing was asked for');
  assert.equal(slotText(env, 'd2-booking-results-message'), env.booking.message('stay_required'));
  assert.equal(listBox(env).getAttribute('d2-booking-results-state'), 'error');

  // A departure that is not after the arrival is the same kind of mistake, and
  // the module knows it before the route does.
  searchFieldOf(env, 'check_in').value = LIST_QUERY.check_out;
  searchFieldOf(env, 'check_out').value = LIST_QUERY.check_in;
  fire(env.searchForm, 'submit');
  await env.settled();
  assert.equal(listCalls(env).length, 1);
  assert.equal(slotText(env, 'd2-booking-results-message'), env.booking.message('invalid_stay'));
});

test('a refused search says the module’s own sentence, never the API’s', async () => {
  // MUTACJA: print detail from the body, or the same sentence whatever the
  // filter asked for, and a guest who mistyped a city is told to check their
  // dates while the backend's English goes on the page.
  const dates = listPage({
    searchForm: { fields: ['check_in', 'check_out'] },
    refuse: { products: 'invalid_stay' },
  });
  await dates.settled();
  assert.equal(slotText(dates, 'd2-booking-results-message'),
    dates.booking.message('invalid_stay'));

  const city = listPage({
    results: { attrs: { 'd2-booking-location': 'Atlantyda' } },
    refuse: { products: 'invalid_stay' },
  });
  await city.settled();
  const said = slotText(city, 'd2-booking-results-message');
  assert.equal(said, city.booking.message('invalid_search'));
  assert.notEqual(said, city.booking.message('invalid_stay'));
  assert.ok(said.indexOf(refusalFixture('invalid_stay').body.detail) < 0, said);

  // 429 carries Retry-After, and the sentence says how long to wait.
  const waiting = listPage({
    searchForm: true,
    refuse: { products: 'too_many_requests' },
    headers: { 'Retry-After': '30' },
  });
  await waiting.settled();
  assert.ok(String(slotText(waiting, 'd2-booking-results-message')).indexOf('30 s') > 0,
    slotText(waiting, 'd2-booking-results-message'));
});

test('the calendar in the search form is the period, with no second calendar', async () => {
  // MUTACJA: read the period from the date inputs only and a search form built
  // around stage 5's calendar searches without dates — every click on it
  // narrowing nothing.
  const env = listPage({
    now: MAY_2027,
    loaderAttrs: { 'd2-booking-product': PRODUCT },
    searchForm: { fields: ['adults'], values: { adults: 2 }, calendar: true },
  });
  await env.settled();

  clickDay(env, '2027-05-05');
  clickDay(env, '2027-05-08');
  fire(env.searchForm, 'submit');
  await env.settled();

  const asked = listCalls(env)[1].url;
  assert.ok(asked.indexOf('check_in=2027-05-05') > 0, asked);
  assert.ok(asked.indexOf('check_out=2027-05-08') > 0, asked);
  assert.ok(asked.indexOf('guests=2') > 0, asked);
  // One calendar on the page, and it is the one the Designer put there.
  assert.equal(env.document.querySelectorAll('[d2-booking-calendar]').length, 1);
});

test('a search field the route does not know is reported and not sent', async () => {
  // MUTACJA: take a field name without checking it against the five the route
  // knows, and a typo ("city" for "location") filters nothing while nothing on
  // the page or in the console says why — the list simply ignores one field.
  const env = listPage({
    searchForm: { fields: ['location', 'city'], values: { location: LIST_QUERY.location, city: 'Gdańsk' } },
  });
  await env.settled();

  fire(env.searchForm, 'submit');
  await env.settled();
  const asked = listCalls(env)[1].url;
  assert.ok(asked.indexOf('city=') < 0, asked);
  assert.ok(asked.indexOf('Gda') < 0, asked);
  assert.ok(asked.indexOf('location=' + encodeURIComponent(LIST_QUERY.location)) > 0, asked);
  assert.ok(env.warnings.some((w) => w.indexOf('d2-booking-search-field="city"') >= 0),
    env.warnings.join(' | '));
});

// ---------------------------------------------------------------------------
// What a real page does to the list: a Collection List, a nullable slug, a
// rate limit and a search that cannot go out
// ---------------------------------------------------------------------------

test('every pattern leaves the list, not only the first one', async () => {
  // MUTACJA: take the first [d2-booking-template] and drop that one alone, and
  // a card built inside a Webflow Collection List — rendered once per CMS item,
  // so the published page carries the attribute N times — leaves every copy
  // but one standing above the apartments as a clickable placeholder card that
  // clearRows() never touches.
  const env = listPage({
    results: { copies: 3, inner: ['count'] },
    products: answerOf(places(2), 2),
  });
  await env.settled();

  assert.equal(rowsOf(env).length, 2);
  assert.equal(env.document.querySelectorAll('[d2-booking-template]').length, 0);
  assert.equal(listBox(env).children.length, 2, 'nothing but the rows is left in the list');
  assert.ok(env.warnings.some((w) => w.indexOf('d2-booking-template') >= 0),
    env.warnings.join(' | '));

  // A pattern inside the pattern would otherwise be cloned into every card.
  const inner = listPage({ results: { nested: true }, products: answerOf(places(2), 2) });
  await inner.settled();
  assert.equal(rowsOf(inner).length, 2);
  assert.equal(inner.document.querySelectorAll('[d2-booking-template]').length, 0);
});

test('a CMS address shape with no slug to put in it leaves the card unlinked', async () => {
  // MUTACJA: fall back to the id inside a {slug} path and a page whose
  // apartments are CMS pages gets href="/apartamenty/<uuid>" — a collection
  // address that cannot exist — for every entry whose slug is null (a nullable
  // field of the contract).
  const noSlug = places(1);
  noSlug[0].slug = null;
  const env = listPage({
    results: { link: '/apartamenty/{slug}' },
    products: answerOf(noSlug),
  });
  await env.settled();

  const row = rowsOf(env)[0];
  assert.equal(row.getAttribute('href'), null);
  assert.equal(row.getAttribute('d2-booking-empty'), '');

  // The id is still a reference the booking page resolves, so a shape that
  // asks for the id by name, and the default query, both lead somewhere.
  const byId = listPage({ results: { link: '/oferta/{id}' }, products: answerOf(noSlug) });
  await byId.settled();
  assert.equal(rowsOf(byId)[0].getAttribute('href'), '/oferta/id-0');
});

test('a flag that is true leaves its slot exactly as the Designer built it', async () => {
  // MUTACJA: write the slot's own text back into it and the badge loses the
  // markup inside it (textContent replaces every child with one text node),
  // while a badge built as an icon alone is marked d2-booking-empty under a
  // flag that is true — so the page's CSS hides it.
  const flagged = places(1);
  flagged[0].requires_approval = true;
  const env = listPage({
    results: { template: ['name', 'requires_approval'], icons: ['requires_approval'] },
    products: answerOf(flagged),
  });
  await env.settled();

  const slot = bindOf(rowsOf(env)[0], 'requires_approval');
  assert.equal(slot.getAttribute('d2-booking-empty'), null, 'true is an answer, not a gap');
  assert.equal(slot.children.length, 1, 'the icon the Designer put in the slot is still there');
  assert.ok(String(slot.textContent).indexOf('na zapytanie') >= 0, String(slot.textContent));

  // false still empties the slot, icon and all: nobody reads "false" here.
  const plain = places(1);
  plain[0].requires_approval = false;
  const off = listPage({
    results: { template: ['name', 'requires_approval'], icons: ['requires_approval'] },
    products: answerOf(plain),
  });
  await off.settled();
  const empty = bindOf(rowsOf(off)[0], 'requires_approval');
  assert.equal(String(empty.textContent), '');
  assert.equal(empty.getAttribute('d2-booking-empty'), '');
});

test('a bind name the answer does not carry empties its slot', async () => {
  // MUTACJA: read entry[field] with no hasOwnProperty guard and a mistyped
  // bind name renders JavaScript into the card: "constructor" comes out as
  // "function Object() { [native code] }".
  const env = listPage({
    results: { template: ['name', 'constructor', 'toString', 'city'] },
    products: answerOf(places(1)),
  });
  await env.settled();

  const row = rowsOf(env)[0];
  for (const field of ['constructor', 'toString']) {
    assert.equal(bindText(row, field), '', field);
    assert.equal(bindOf(row, field).getAttribute('d2-booking-empty'), '', field);
  }
  // A field the answer really carries is untouched by the guard.
  assert.equal(bindText(row, 'city'), PRODUCTS.response.data[0].city);
});

test('a list behind a rate limit holds its button for exactly Retry-After', async () => {
  // MUTACJA: unlock [d2-booking-more] at once after a 429 and every click
  // inside the window spends another call of the key's rate limit on another
  // 429 — the rule the module states for every other button that meets one.
  const env = listPage({
    results: { inner: ['more', 'count'] },
    refuse: { products: 'too_many_requests' },
    headers: { 'Retry-After': '30' },
  });
  await env.settled();

  const more = env.document.querySelector('[d2-booking-more]');
  assert.ok(String(slotText(env, 'd2-booking-results-message')).indexOf('30 s') > 0,
    slotText(env, 'd2-booking-results-message'));
  assert.equal(more.disabled, true);
  assert.equal(more.getAttribute('disabled'), '');
  assert.ok(env.waits().indexOf(30000) >= 0, env.waits().join(','));

  // A click that got past the disabled button spends nothing either.
  fire(more, 'click');
  await env.settled();
  assert.equal(listCalls(env).length, 1, 'nothing was asked for during the wait');

  // The wait is over: the button is one click from another try, like every
  // other refusal of a page.
  env.flush();
  await env.settled();
  assert.equal(more.disabled, false);
  assert.equal(more.getAttribute('disabled'), null);
  fire(more, 'click');
  await env.settled();
  assert.equal(listCalls(env).length, 2);
  assert.ok(listCalls(env)[1].url.indexOf('offset=0') > 0, listCalls(env)[1].url);
});

test('a refusal takes the empty state down with it', async () => {
  // MUTACJA: leave [d2-booking-results-empty] where the answer before it left
  // it and the guest reads "Nic nie znaleźliśmy." and the refusal sentence at
  // the same time — a refusal is not an offer with nothing in it, which is
  // what all four doc places promise.
  const env = listPage({
    results: { inner: ['empty', 'count'] },
    searchForm: { values: { location: LIST_QUERY.location } },
    productsSeq: [answerOf([], 0), { refuse: 'too_many_requests' }],
  });
  await env.settled();
  const empty = env.document.querySelector('[d2-booking-results-empty]');
  assert.equal(empty.style.display, '', 'the first answer found nothing and says so');

  // The server refused the next page of the search.
  fire(env.searchForm, 'submit');
  await env.settled();
  assert.equal(listBox(env).getAttribute('d2-booking-results-state'), 'error');
  assert.equal(slotText(env, 'd2-booking-results-message'),
    env.booking.message('too_many_requests'));
  assert.equal(empty.style.display, 'none');

  // And a search the module refuses itself answers the same way.
  const typed = listPage({
    results: { inner: ['empty'] },
    searchForm: { values: { location: LIST_QUERY.location } },
    products: answerOf([], 0),
  });
  await typed.settled();
  assert.equal(typed.document.querySelector('[d2-booking-results-empty]').style.display, '');
  searchFieldOf(typed, 'check_in').value = LIST_QUERY.check_in;
  fire(typed.searchForm, 'submit');
  await typed.settled();
  assert.equal(slotText(typed, 'd2-booking-results-message'),
    typed.booking.message('stay_required'));
  assert.equal(typed.document.querySelector('[d2-booking-results-empty]').style.display, 'none');
});

test('a search that cannot go out leaves the list on the filter its rows came from', async () => {
  // MUTACJA: install the new search before checking it and the rows on screen
  // belong to the old filter while the next [d2-booking-more] asks for the
  // next offset under the new one — two result sets in one column, with the
  // apartments of the overlap shown twice and the rest skipped.
  const env = listPage({
    results: { attrs: { 'd2-booking-results-limit': '3' }, inner: ['more'] },
    searchForm: {
      values: {
        check_in: LIST_QUERY.check_in,
        check_out: LIST_QUERY.check_out,
        location: LIST_QUERY.location,
      },
    },
    productsSeq: [answerOf(places(3), 9, true), answerOf(places(3, 3), 9, true)],
  });
  await env.settled();
  assert.ok(listCalls(env)[0].url.indexOf('check_in=' + LIST_QUERY.check_in) > 0,
    listCalls(env)[0].url);

  // The guest clears the departure and presses search: half a period.
  searchFieldOf(env, 'check_out').value = '';
  fire(env.searchForm, 'submit');
  await env.settled();
  assert.equal(listCalls(env).length, 1, 'nothing was asked for');
  assert.equal(slotText(env, 'd2-booking-results-message'), env.booking.message('stay_required'));
  assert.equal(rowsOf(env).length, 3, 'the rows of the search that did happen stay');

  // The next page belongs to the search those rows came from.
  fire(env.document.querySelector('[d2-booking-more]'), 'click');
  await env.settled();
  const asked = listCalls(env)[1].url;
  assert.ok(asked.indexOf('offset=3') > 0, asked);
  assert.ok(asked.indexOf('check_in=' + LIST_QUERY.check_in) > 0, asked);
  assert.ok(asked.indexOf('check_out=' + LIST_QUERY.check_out) > 0, asked);
  assert.equal(rowsOf(env).length, 6);
});

test('a search in the address survives a form that does not ask about it', async () => {
  // MUTACJA: read the form back over the link and every search parameter the
  // form has no field for is dropped on open — a shared link opens the whole
  // offer, and a reload loses the period of a form built around the calendar.
  const link = '?check_in=' + LIST_QUERY.check_in + '&check_out=' + LIST_QUERY.check_out
    + '&location=' + encodeURIComponent(LIST_QUERY.location);
  const env = listPage({
    search: link,
    searchForm: { fields: ['adults'], values: { adults: 2 } },
  });
  await env.settled();

  assert.equal(listCalls(env).length, 1);
  const asked = listCalls(env)[0].url;
  assert.ok(asked.indexOf('check_in=' + LIST_QUERY.check_in) > 0, asked);
  assert.ok(asked.indexOf('check_out=' + LIST_QUERY.check_out) > 0, asked);
  assert.ok(asked.indexOf('location=' + encodeURIComponent(LIST_QUERY.location)) > 0, asked);
  assert.ok(asked.indexOf('guests=2') > 0, asked);

  // And a submit in that form keeps them too, instead of searching the whole
  // country because the guest changed the party.
  searchFieldOf(env, 'adults').value = '3';
  fire(env.searchForm, 'submit');
  await env.settled();
  const again = listCalls(env)[1].url;
  assert.ok(again.indexOf('check_in=' + LIST_QUERY.check_in) > 0, again);
  assert.ok(again.indexOf('location=' + encodeURIComponent(LIST_QUERY.location)) > 0, again);
  assert.ok(again.indexOf('guests=3') > 0, again);
  // A field the form does carry still answers for its own key when the guest
  // empties it: they can see it, so clearing it is an answer.
  const dated = listPage({
    search: link,
    searchForm: { fields: ['check_in', 'check_out'] },
  });
  await dated.settled();
  const only = listCalls(dated)[0].url;
  assert.ok(only.indexOf('location=' + encodeURIComponent(LIST_QUERY.location)) > 0, only);
  assert.ok(only.indexOf('check_in=' + LIST_QUERY.check_in) > 0, only);
});

test('two clicks on Szukaj ask the same question once', async () => {
  // MUTACJA: let every submit start another first page and a double click
  // spends two calls of the key's rate limit on one search, the second one
  // abandoning the answer to the first.
  const env = listPage({
    searchForm: { values: { location: LIST_QUERY.location } },
    products: answerOf(places(2), 2),
  });
  await env.settled();
  assert.equal(listCalls(env).length, 1);

  fire(env.searchForm, 'submit');
  fire(env.searchForm, 'submit');
  await env.settled();
  assert.equal(listCalls(env).length, 2, listCalls(env).map((c) => c.url).join(' | '));
  assert.equal(rowsOf(env).length, 2);
  assert.equal(listBox(env).getAttribute('d2-booking-results-state'), 'ready');
  assert.equal(env.events.filter((e) => e.name === 'booking:search').length, 1);

  // A list that is idle searches again: the same question after a refusal, or
  // after reading a page, is a retry and has to go out.
  fire(env.searchForm, 'submit');
  await env.settled();
  assert.equal(listCalls(env).length, 3);
});

test('a search form with no list on the page says so in the console', async () => {
  // MUTACJA: bind the submit and say nothing, and a hero search form on a page
  // with no [d2-booking-results] is a button that cancels the submit and does
  // nothing at all, with nothing anywhere to explain why.
  const env = page({ forms: [], searchForm: { values: { location: LIST_QUERY.location } } });
  await env.settled();

  fire(env.searchForm, 'submit');
  await env.settled();
  assert.equal(listCalls(env).length, 0);
  assert.ok(env.warnings.some((w) => w.indexOf('d2-booking-results') >= 0
    && w.indexOf('d2-booking-search') >= 0), env.warnings.join(' | '));
});

// ---------------------------------------------------------------------------
// Review of #60
// ---------------------------------------------------------------------------

function deferred() {
  let release;
  const promise = new Promise((resolve) => { release = resolve; });
  return { promise, release };
}

test('submit stops on the form, on the way up to the document handler of Webflow', async () => {
  // MUTACJA: only preventDefault, and webflow.js, which listens on the document
  // and ignores it, also posts the guest's details to Webflow Forms. Or bind in
  // the capture phase, and d2-forms can no longer stop an invalid form.
  const env = calendarPage();
  await env.settled();
  assert.equal(env.form.capturing.submit, false);
  let stopped = 0;
  fire(env.form, 'submit', { preventDefault() {}, stopPropagation() { stopped += 1; } });
  await env.settled();
  assert.equal(stopped, 1);
});

test('a keystroke during a pending quote joins it and the new price is printed', async () => {
  // MUTACJA: write lastQuoteKey when asking, and the keystroke is answered from
  // the previous quote while the real answer fails the sequence check: the
  // old price stays beside the new stay, marked busy for good.
  const held = deferred();
  const env = calendarPage({
    price: true,
    script: { quote: [null, ({ response, merged }) => held.promise.then(() => response(200, merged(QUOTE, { marker: 'new' })))] },
  });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  await env.tick(1000);
  assert.equal(quoteCalls(env).length, 1);

  env.booking.select({ product: PRODUCT, unit: 'day', starts_at: '2027-05-02T00:00:00', units_count: 3 });
  await env.tick(1000);
  assert.equal(quoteCalls(env).length, 2);

  fire(env.form, 'input');
  await env.tick(1000);
  assert.equal(quoteCalls(env).length, 2, 'the same question is not asked twice');

  held.release();
  await env.settled();
  assert.equal(env.booking.price().marker, 'new');
  assert.equal(env.document.querySelector('[d2-booking-breakdown][d2-booking-busy]'), null);
});

test('going back to the printed stay during a pending quote clears the busy mark', async () => {
  // MUTACJA: answer from memory without setPriceBusy(false). The pending answer
  // is dropped as stale, so nothing else ever clears the mark.
  const held = deferred();
  const env = calendarPage({
    price: true,
    script: { quote: [null, () => held.promise] },
  });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  await env.tick(1000);
  const shown = env.booking.price();
  env.booking.select({ product: PRODUCT, unit: 'day', starts_at: '2027-05-02T00:00:00', units_count: 3 });
  await env.tick(1000);
  assert.ok(env.document.querySelector('[d2-booking-busy]'), 'the second question is on its way');

  env.booking.select({ product: PRODUCT, unit: 'day', starts_at: '2027-05-02T00:00:00', units_count: 2 });
  await env.tick(1000);
  assert.equal(quoteCalls(env).length, 2, 'answered from the price already printed');
  assert.equal(env.document.querySelector('[d2-booking-busy]'), null);
  assert.deepEqual(env.booking.price(), shown);
});

test('a late quote does not print a price for a stay the guest let go of', async () => {
  // MUTACJA: clear the price without moving quoteSeq, and the answer on its way
  // prints a total beside an empty calendar.
  const held = deferred();
  const env = calendarPage({
    price: true,
    script: { quote: [({ response, merged }) => held.promise.then(() => response(200, merged(QUOTE)))] },
  });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  await env.tick(1000);
  env.booking.select(null);
  await env.tick(1000);
  held.release();
  await env.settled();
  assert.equal(env.booking.price(), null);
  assert.equal(env.document.querySelector('[d2-booking-busy]'), null);
});

test('today is never on offer: a stay starts at midnight, which has already gone', async () => {
  // MUTACJA: compare calendar days. The day looks free and the backend answers
  // lead_time_too_short, because period.starts_at < now.
  const env = calendarPage();
  await env.settled();
  assert.equal(dayOf(env, '2027-05-01').getAttribute('aria-disabled'), 'true');
  assert.equal(dayOf(env, '2027-05-02').getAttribute('aria-disabled'), null);
  clickDay(env, '2027-05-01');
  await env.settled();
  assert.equal(statusText(env), 'Ten termin jest już za blisko. Wybierz późniejszy.');
});

test('the first day on offer is counted in the zone of the rental', async () => {
  // 21:59 UTC + 2 h is 01:59 on May 2 in Warsaw, so May 2 has started already.
  const env = calendarPage({ now: '2027-05-01T21:59:00Z', availability: { lead_time_hours: 2 } });
  await env.settled();
  assert.equal(dayOf(env, '2027-05-02').getAttribute('aria-disabled'), 'true');
  assert.equal(dayOf(env, '2027-05-03').getAttribute('aria-disabled'), null);
});

test('the calendar sends nights as days whatever unit comes first', async () => {
  // MUTACJA: send allowed_units[0], and 2 nights go out as 2 months, which the
  // backend prices and books as exactly that.
  const env = calendarPage({ availability: { allowed_units: ['month', 'day'] } });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  await env.settled();
  assert.equal(env.booking.stay().unit, 'day');
  assert.equal(env.booking.stay().units_count, 2);
});

test('a product that does not rent by the day cannot be picked on the calendar', async () => {
  // MUTACJA: let the range through, and the guest books months while the
  // calendar shows nights.
  const env = calendarPage({ availability: { allowed_units: ['month'] } });
  await env.settled();
  clickDay(env, '2027-05-02');
  clickDay(env, '2027-05-04');
  await env.settled();
  assert.equal(env.booking.stay(), null);
  assert.equal(statusText(env), 'Taki pobyt nie jest tu dostępny.');
});

test('a failed product lookup is asked again, and the slug never reaches {product_id}', async () => {
  // MUTACJA: keep the failed promise, and one blip sends the slug to every
  // route for the whole visit, where the backend answers 422.
  const env = calendarPage({
    loaderAttrs: { 'd2-booking-product': 'rynek-1' },
    script: { product: [{ status: 503, body: { detail: 'Unavailable' } }] },
  });
  await env.settled();
  assert.equal(productCalls(env).length, 2);
  assert.ok(availabilityCalls(env)[0].url.indexOf('/products/' + PRODUCT_FIXTURE.response.id + '/availability') > 0,
    availabilityCalls(env)[0].url);
});

test('a product the backend does not know is not asked for again', async () => {
  // MUTACJA: forget every failure, and a 404 costs one call per click.
  const env = calendarPage({
    loaderAttrs: { 'd2-booking-product': 'rynek-1' },
    refuse: { product: { status: 404, body: { detail: 'Not found' } } },
  });
  await env.settled();
  assert.equal(productCalls(env).length, 1);
});

test('a failed start is not repeated at once by the same page load', async () => {
  // MUTACJA: forget the failed month, and start() asks for it twice in a row:
  // five calls and up to 50 s before the calendar draws anything.
  const down = { status: 503, body: { detail: 'Unavailable' } };
  const env = calendarPage({ refuse: { availability: down } });
  await env.settled();
  assert.equal(availabilityCalls(env).length, 1);
});

test('a 429 on the product is not asked again before its wait is over', async () => {
  // MUTACJA: retry at once, and an already limited key is hit again.
  const env = calendarPage({
    loaderAttrs: { 'd2-booking-product': 'rynek-1' },
    script: { product: [{ status: 429, body: { detail: 'x' }, headers: { 'Retry-After': '30' } }] },
  });
  await env.settled();
  assert.equal(productCalls(env).length, 1);
});

test('another party opens a final refusal too', async () => {
  // MUTACJA: reopen only on select(), and the party is a dead end although
  // send() would take it as a new request.
  const env = payPage({ refuse: { checkout: 'booking_not_payable' } });
  await paySubmit(env);
  assert.equal(submitOf(env.form).disabled, true);
  fire(env.form, 'input');
  assert.equal(submitOf(env.form).disabled, true, 'the same request stays closed');
  fieldOf(env.form, 'adults').value = '3';
  fire(env.form, 'input');
  assert.equal(submitOf(env.form).disabled, false);
});

test('a month that could not be read is asked for again on the way back', async () => {
  // MUTACJA: keep the mark, and the month shows every night free for the visit.
  const env = calendarPage({ script: { availability: [{ status: 503, body: { detail: 'Unavailable' } }] } });
  await env.settled();
  const asked = availabilityCalls(env).length;
  keyOn(dayOf(env, '2027-05-02'), 'PageDown');
  await env.settled();
  keyOn(env.document.activeElement, 'PageUp');
  await env.settled();
  const may = availabilityCalls(env).filter((c) => c.url.indexOf(encodeURIComponent('2027-05-01T00:00:00')) >= 0);
  assert.equal(may.length, 2, 'asked ' + asked + ' then again');
});

test('choosing a day keeps the focus on that day', async () => {
  // MUTACJA: render(false) in pick. The grid is rebuilt, the focused button is
  // gone and a keyboard user falls to <body> between arrival and departure.
  const env = calendarPage();
  await env.settled();
  clickDay(env, '2027-05-02');
  assert.equal(env.document.activeElement, dayOf(env, '2027-05-02'));
  clickDay(env, '2027-05-04');
  assert.equal(env.document.activeElement, dayOf(env, '2027-05-04'));
});

test('a blip while polling the status does not end the poll', async () => {
  // MUTACJA: end on any failure, and a guest who has just paid reads an error
  // and may pay again, seconds before the page would have said confirmed.
  const env = returnPage({
    script: { status: [null, { status: 503, body: { detail: 'Unavailable' } }, 'offline'] },
    statusSeq: [{}, { status: 'confirmed', paid: true }],
  });
  await env.settled();
  assert.equal(env.ret.getAttribute('d2-booking-return-state'), 'checking');
  await env.tick();
  assert.equal(env.ret.getAttribute('d2-booking-return-state'), 'checking', 'the 503 changes nothing');
  await env.tick();
  assert.equal(env.ret.getAttribute('d2-booking-return-state'), 'checking', 'nor does the dead network');
  await env.tick();
  assert.equal(env.ret.getAttribute('d2-booking-return-state'), 'confirmed');
});

test('a blip on the last try leaves the sentence that the payment is being checked', async () => {
  // MUTACJA: end in the error sentence, and a guest who has just paid is sent
  // back to pay again by the very last try.
  const down = { status: 503, body: { detail: 'Unavailable' } };
  const env = returnPage({ script: { status: [null, down, down, down, down, down, down, down] } });
  await env.settled();
  assert.equal(env.ret.getAttribute('d2-booking-return-state'), 'checking');
  for (let i = 0; i < 10; i += 1) await env.tick();
  assert.equal(callsTo(env, '/status').length, 8);
  assert.equal(env.ret.getAttribute('d2-booking-return-state'), 'checking');
});

test('a long Retry-After does not park the return page', async () => {
  // MUTACJA: wait what the header says, and the guest watches "loading" for an hour.
  const env = returnPage({ script: { status: [{ status: 429, body: { detail: 'x' }, headers: { 'Retry-After': '2976' } }] } });
  await env.settled();
  assert.ok(env.waits().filter((ms) => ms !== 10000).every((ms) => ms <= 30000), env.waits().join(','));
});

test('an answer about the booking ends the poll at once', async () => {
  // MUTACJA: retry everything, and a booking that does not exist is asked for
  // eight times while the guest watches a spinner.
  const env = returnPage({ refuse: { status: { status: 404, body: { detail: 'Not found' } } } });
  await env.settled();
  assert.equal(env.ret.getAttribute('d2-booking-return-state'), 'error');
  await env.tick();
  assert.equal(callsTo(env, '/status').length, 1);
});

test('the poll gives up on a backend that stays down', async () => {
  // MUTACJA: retry without a limit, and the page polls for as long as it is open.
  const env = returnPage({ refuse: { status: { status: 503, body: { detail: 'Unavailable' } } } });
  await env.settled();
  for (let i = 0; i < 12; i += 1) await env.tick();
  assert.equal(env.ret.getAttribute('d2-booking-return-state'), 'error');
  assert.equal(callsTo(env, '/status').length, 8);
});

// ---------------------------------------------------------------------------
// Contact change and idempotency: contact.json, and contact_token and the
// Idempotency-Key header in booking.json.
// ---------------------------------------------------------------------------

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const OFFLINE_ONCE = ['offline'];

function keyOf(call) { return call.init.headers['Idempotency-Key']; }
function contactPosts(env) { return env.calls.filter((c) => /\/contact$/.test(c.url)); }
function failedPayment(extra) {
  return payPage(Object.assign({
    booking: { contact_token: 'secret-contact' },
    script: { checkout: [{ status: 502, body: { detail: 'Bad gateway' } }] },
  }, extra || {}));
}

test('the contract fixtures name the two additions the module relies on', () => {
  // MUTACJA: a copy of the contract without them, and these tests stop meaning
  // what they say.
  assert.match(BOOKING.headers['Idempotency-Key'], UUID_V4);
  assert.ok(BOOKING.response.contact_token);
  assert.ok(CONTACT.route.indexOf('/contact') > 0);
  assert.equal(CONTACT.headers['X-Booking-Token'], BOOKING.response.contact_token);
});

test('every booking carries an Idempotency-Key in the form of a UUID v4', async () => {
  // MUTACJA: send no key, and a request that timed out here but landed there
  // leaves the guest refused by their own invisible hold.
  const env = payPage();
  await paySubmit(env);
  assert.match(keyOf(bookingPosts(env)[0]), UUID_V4);
});

test('a retry after a lost answer repeats the key and pays the booking it recovers', async () => {
  // MUTACJA: a new key per attempt, and the retry gets period_taken.
  const env = payPage({ script: { bookings: OFFLINE_ONCE.slice() } });
  await paySubmit(env);
  assert.equal(checkoutPosts(env).length, 0);
  fire(env.form, 'submit');
  await env.settled();
  assert.equal(bookingPosts(env).length, 2);
  assert.equal(keyOf(bookingPosts(env)[1]), keyOf(bookingPosts(env)[0]));
  assert.equal(checkoutPosts(env).length, 1);
});

test('a changed party is a new request under a new key', async () => {
  // MUTACJA: one key per form, and the backend answers idempotency_key_reused.
  const env = payPage({ script: { bookings: OFFLINE_ONCE.slice() } });
  await paySubmit(env);
  fieldOf(env.form, 'adults').value = '3';
  fire(env.form, 'submit');
  await env.settled();
  assert.notEqual(keyOf(bookingPosts(env)[1]), keyOf(bookingPosts(env)[0]));
});

test('an e-mail corrected after a lost answer recovers the hold and follows through /contact', async () => {
  // MUTACJA: tie the key to the whole form, and the guest who fixed a typo is
  // refused by their own hold (period_taken) instead of paying it.
  const env = payPage({
    booking: { contact_token: 'secret-contact' },
    script: { bookings: OFFLINE_ONCE.slice() },
  });
  await paySubmit(env);
  fieldOf(env.form, 'email').value = 'nowy@example.com';
  fire(env.form, 'submit');
  await env.settled();
  const posts = bookingPosts(env);
  assert.equal(posts.length, 2);
  assert.equal(keyOf(posts[1]), keyOf(posts[0]), 'the same hold, the same key');
  assert.deepEqual(posts[1].body, posts[0].body, 'and the body that key was first sent with');
  const sent = contactPosts(env);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body.customer_email, 'nowy@example.com');
  assert.equal(checkoutPosts(env).length, 1, 'then the booking is paid');
  assert.ok(env.calls.indexOf(sent[0]) < env.calls.indexOf(checkoutPosts(env)[0]), 'contact before payment');
});

test('an e-mail corrected after a 422 goes out as a new request, not the first body', async () => {
  // MUTACJA: keep the first body after a refusal the backend did read, and the
  // guest who fixed the e-mail it named is refused again for a day.
  const env = payPage({
    script: { bookings: [{ status: 422, body: { detail: [{ type: 'value_error', loc: ['body', 'customer_email'], msg: 'bad', input: {} }] } }] },
  });
  await paySubmit(env);
  fieldOf(env.form, 'email').value = 'nowy@example.com';
  fire(env.form, 'submit');
  await env.settled();
  const posts = bookingPosts(env);
  assert.equal(posts.length, 2);
  assert.equal(posts[1].body.customer_email, 'nowy@example.com');
  assert.notEqual(keyOf(posts[1]), keyOf(posts[0]));
});

test('a note shortened after a 413 goes out shortened', async () => {
  // MUTACJA: the same, for request_too_large: the long note goes out again.
  const env = payPage({ script: { bookings: [{ status: 413, body: { detail: 'Too large' } }] } });
  await paySubmit(env);
  fieldOf(env.form, 'note').value = 'Krótko';
  fire(env.form, 'submit');
  await env.settled();
  assert.equal(bookingPosts(env)[1].body.customer_note, 'Krótko');
});

test('a phone the guest emptied is cleared, not left as it was', async () => {
  // MUTACJA: leave the empty phone out, and the backend keeps the old number,
  // which it reads as "unchanged".
  const env = failedPayment();
  await paySubmit(env);
  fieldOf(env.form, 'phone').value = '';
  fire(env.form, 'submit');
  await env.settled();
  const sent = contactPosts(env);
  assert.equal(sent.length, 1);
  assert.ok(Object.prototype.hasOwnProperty.call(sent[0].body, 'customer_phone'));
  assert.equal(sent[0].body.customer_phone, null);
});

test('a key older than a day is not used again', async () => {
  // MUTACJA: keep the key for ever. The backend keeps it, the module promised not to.
  const env = payPage({ script: { bookings: OFFLINE_ONCE.slice() } });
  await paySubmit(env);
  env.form._d2BookingAttempt.at -= 25 * 3600 * 1000;
  fire(env.form, 'submit');
  await env.settled();
  assert.notEqual(keyOf(bookingPosts(env)[1]), keyOf(bookingPosts(env)[0]));
});

test('a recovered booking whose hold ran out is not paid, and the next try is new', async () => {
  // MUTACJA: treat the 200 as a live booking, and the guest is sent to pay a
  // hold that no longer exists.
  const dead = Object.assign({}, BOOKING.response, { status: 'expired' });
  const env = payPage({ status: true, script: { bookings: ['offline', { status: 200, body: dead }] } });
  await paySubmit(env);
  fire(env.form, 'submit');
  await env.settled();
  assert.equal(checkoutPosts(env).length, 0);
  assert.equal(submitOf(env.form).disabled, false);
  assert.ok(env.events.some((e) => e.name === 'booking:refused' && e.data.reason === 'hold_expired'));
  assert.ok(statusText(env).indexOf('Czas na opłacenie') >= 0, statusText(env));
  fire(env.form, 'submit');
  await env.settled();
  assert.notEqual(keyOf(bookingPosts(env)[2]), keyOf(bookingPosts(env)[1]));
  assert.equal(checkoutPosts(env).length, 1);
});

test('the contact token reaches no event and no booking the page can read', async () => {
  // MUTACJA: leave it on the booking, and any script on the page can move the
  // confirmation to its own address.
  const env = failedPayment();
  await paySubmit(env);
  const created = env.events.filter((e) => e.name === 'booking:created');
  assert.equal(created.length, 1);
  assert.equal(JSON.stringify(created[0].data.booking).indexOf('secret-contact'), -1);
  assert.equal((env.warnings.join(' ') + env.logs.join(' ')).indexOf('secret-contact'), -1);
  assert.equal(dumpTree(env.document.documentElement).indexOf('secret-contact'), -1);
});

test('a corrected e-mail goes to the booking before it is paid', async () => {
  // MUTACJA: pay without sendContact. This is the decision of 2026-11-05: the
  // confirmation and the link go to the address the guest typed last.
  const env = failedPayment();
  await paySubmit(env);
  fieldOf(env.form, 'email').value = 'nowy@example.com';
  fire(env.form, 'submit');
  await env.settled();
  assert.equal(bookingPosts(env).length, 1, 'still one booking');
  const sent = contactPosts(env);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body.customer_email, 'nowy@example.com');
  Object.keys(sent[0].body).forEach((key) => {
    assert.ok(Object.prototype.hasOwnProperty.call(CONTACT.request, key), key + ' is not in the contract');
  });
  assert.equal(sent[0].init.headers['X-Booking-Token'], 'secret-contact');
  assert.equal(checkoutPosts(env).length, 2);
  assert.ok(env.calls.indexOf(sent[0]) < env.calls.indexOf(checkoutPosts(env)[1]), 'before the payment');
});

test('an unchanged contact sends nothing, also on the try after a correction', async () => {
  // MUTACJA: always post it, and every retry spends the 10 per hour limit.
  const env = failedPayment({
    script: { checkout: [1, 2, 3].map(() => ({ status: 502, body: { detail: 'x' } })) },
  });
  await paySubmit(env);
  fire(env.form, 'submit');
  await env.settled();
  assert.equal(contactPosts(env).length, 0);
  fieldOf(env.form, 'email').value = 'nowy@example.com';
  fire(env.form, 'submit');
  await env.settled();
  assert.equal(env.form.getAttribute('d2-booking-payment'), 'retry', 'the form is still open for one more try');
  fire(env.form, 'submit');
  await env.settled();
  assert.equal(checkoutPosts(env).length, 4, 'that try really happened');
  assert.equal(contactPosts(env).length, 1);
});

test('a contact the backend will not change stops the payment and says so', async () => {
  // MUTACJA: pay anyway, and the guest believes the new address was taken.
  const refused = failedPayment({ refuse: { contact: { status: 404, body: { detail: 'Not found' } } } });
  await paySubmit(refused);
  fieldOf(refused.form, 'email').value = 'nowy@example.com';
  fire(refused.form, 'submit');
  await refused.settled();
  assert.equal(checkoutPosts(refused).length, 1, 'only the first, failed one');
  assert.equal(submitOf(refused.form).disabled, false);
  const said = refused.form.querySelector('[d2-booking-error="form"]').textContent;
  assert.ok(said.indexOf('danych kontaktowych') >= 0, said);
});

test('no contact token means no change and no silent payment', async () => {
  // MUTACJA: skip the check, and a booking from a backend without the token is
  // paid under the old address.
  const env = failedPayment({ booking: { contact_token: null } });
  await paySubmit(env);
  fieldOf(env.form, 'email').value = 'nowy@example.com';
  fire(env.form, 'submit');
  await env.settled();
  assert.equal(contactPosts(env).length, 0);
  assert.equal(checkoutPosts(env).length, 1);
});

test('a hold that ended before the contact change closes the form like a payment refusal', async () => {
  // MUTACJA: treat it as a plain refusal, and the dead booking is kept and retried.
  const env = failedPayment({
    refuse: { contact: { status: 409, body: { detail: { reason: 'booking_not_payable' } } } },
  });
  await paySubmit(env);
  fieldOf(env.form, 'email').value = 'nowy@example.com';
  fire(env.form, 'submit');
  await env.settled();
  assert.equal(env.form.getAttribute('d2-booking-payment'), 'final');
});

// ---------------------------------------------------------------------------
// Review of #61
// ---------------------------------------------------------------------------

const REFUSED_503 = { status: 503, body: { detail: 'Unavailable' } };
function refused429(seconds) {
  return { status: 429, body: { detail: 'Too many' }, headers: { 'Retry-After': String(seconds) } };
}
function radio(form, value, checked) {
  const el = element({ 'd2-booking-search-field': 'location', type: 'radio' }, 'input');
  el.type = 'radio';
  el.value = value;
  el.checked = !!checked;
  form.appendChild(el);
  return el;
}

test('a search stops on the form, on the way up to the document handler of Webflow', async () => {
  // MUTACJA: preventDefault alone, and every search is posted to Webflow Forms
  // and the form hides behind .w-form-done.
  const env = listPage({ searchForm: true });
  await env.settled();
  assert.equal(env.searchForm.capturing.submit, false);
  let stopped = 0;
  fire(env.searchForm, 'submit', { preventDefault() {}, stopPropagation() { stopped += 1; } });
  await env.settled();
  assert.equal(stopped, 1);
});

test('the drawn stylesheet does not hide a whole card that has no address', async () => {
  // MUTACJA: hide every d2-booking-empty. The card is its own link, so an entry
  // with slug null vanishes while the count still counts it.
  const env = listPage({ results: { template: false }, products: answerOf(places(1), 1) });
  await env.settled();
  const css = dumpTree(env.document.documentElement);
  assert.ok(css.indexOf('[d2-booking-empty]:not([d2-booking-item]){display:none}') >= 0);
});

test('a picture drops the srcset the Webflow image came with', async () => {
  // MUTACJA: set src alone. The browser prefers srcset, so every card shows the
  // Designer's placeholder.
  const env = listPage({ products: answerOf(places(1), 1) });
  const row = env.document.querySelector('[d2-booking-template]');
  const img = row.querySelector('[d2-booking-bind="image"]');
  img.setAttribute('srcset', 'placeholder.png 500w');
  img.setAttribute('sizes', '100vw');
  await env.settled();
  const shown = rowsOf(env)[0].querySelector('[d2-booking-bind="image"]');
  assert.equal(shown.getAttribute('srcset'), null);
  assert.equal(shown.getAttribute('sizes'), null);
});

test('rows go into the grid of a Collection List and the empty items leave', async () => {
  // MUTACJA: append to the box, and the rows land outside the Designer's grid
  // beside a column of blank cells.
  const env = listPage({ results: { collection: 3 }, products: answerOf(places(2), 2) });
  await env.settled();
  const grid = listBox(env).children[0].children[0];
  assert.equal(grid.getAttribute('class'), 'w-dyn-items');
  assert.equal(rowsOf(env).length, 2);
  assert.equal(grid.children.length, 2, 'the rows and nothing else: no empty Collection Item is left');
  assert.equal(rowsOf(env)[0].parentNode, grid);
  assert.equal(rowsOf(env)[0].getAttribute('class'), 'w-dyn-item w-col w-col-4', 'the columns of the grid stay');
});

test('a card deeper inside a Collection Item takes the whole item with it', async () => {
  // MUTACJA: look at the direct parent only, and every row lands in the first
  // grid cell beside a column of empty ones.
  const env = listPage({ results: { collection: 3, collectionWrap: true }, products: answerOf(places(2), 2) });
  await env.settled();
  const grid = listBox(env).children[0].children[0];
  assert.equal(grid.children.length, 2);
  assert.equal(rowsOf(env).length, 2);
  assert.equal(env.document.querySelectorAll('[d2-booking-template]').length, 0);
});

test('a repeat apply leaves the search in force alone', async () => {
  // MUTACJA: re-read the form on apply(), and the next page goes out under a
  // filter nobody searched for, appended to rows of the old one.
  const env = listPage({
    results: { inner: ['more'] },
    searchForm: { values: { location: 'Sopot' } },
    productsSeq: [answerOf(places(3), 5, true), answerOf(places(2, 3), 5, false)],
  });
  await env.settled();
  searchFieldOf(env, 'location').value = 'Gdańsk';
  await env.booking.apply();
  await env.settled();
  fire(env.document.querySelector('[d2-booking-more]'), 'click');
  await env.settled();
  assert.ok(listCalls(env)[1].url.indexOf('location=Sopot') >= 0, listCalls(env)[1].url);
  assert.equal(searchFieldOf(env, 'location').value, 'Gdańsk', 'what the guest typed stays');
});

test('a refused first page takes the old rows away and leaves a way to ask again', async () => {
  // MUTACJA: keep them, and rows of Wrocław stand under ?location=Gdańsk with
  // no button, because the last answer said there was no next page.
  const env = listPage({
    results: { inner: ['more', 'count'] },
    searchForm: true,
    products: answerOf(places(2), 2, false),
    script: { products: [null, REFUSED_503] },
  });
  await env.settled();
  assert.equal(rowsOf(env).length, 2);
  searchFieldOf(env, 'location').value = 'Gdańsk';
  fire(env.searchForm, 'submit');
  await env.settled();
  assert.equal(rowsOf(env).length, 0);
  assert.equal(env.document.querySelector('[d2-booking-count]').textContent, '');
  assert.equal(env.document.querySelector('[d2-booking-more]').getAttribute('hidden'), null);
});

test('a later page refused keeps the rows the guest is reading', async () => {
  // MUTACJA: clear on every refusal, and a blip wipes three pages of reading.
  const env = listPage({
    results: { inner: ['more'] },
    products: answerOf(places(2), 5, true),
    script: { products: [null, REFUSED_503] },
  });
  await env.settled();
  fire(env.document.querySelector('[d2-booking-more]'), 'click');
  await env.settled();
  assert.equal(rowsOf(env).length, 2);
});

test('a radio group answers with the checked one, wherever it stands', async () => {
  // MUTACJA: let the last element win, and an unchecked radio clears the city.
  const env = listPage({ searchForm: { fields: ['adults'] } });
  await env.settled();
  radio(env.searchForm, 'Wrocław', true);
  radio(env.searchForm, 'Gdańsk', false);
  fire(env.searchForm, 'submit');
  await env.settled();
  assert.ok(listCalls(env).pop().url.indexOf('location=' + encodeURIComponent('Wrocław')) >= 0);
});

test('clearing the visible copy of a field built twice is an answer', async () => {
  // MUTACJA: let any non-empty copy win, and the hidden one brings the city
  // back: the guest can never clear the search.
  const env = listPage({ searchForm: { fields: ['location'], values: { location: 'Gdańsk' } } });
  await env.settled();
  const visible = searchFieldOf(env, 'location');
  const hidden = element({ 'd2-booking-search-field': 'location' }, 'input');
  hidden.value = 'Gdańsk';
  hidden.offsetParent = null;
  env.searchForm.appendChild(hidden);
  visible.value = '';
  fire(env.searchForm, 'submit');
  await env.settled();
  assert.equal(listCalls(env).pop().url.indexOf('location='), -1);
});

test('the order of the two copies does not matter', async () => {
  // MUTACJA: skip an empty visible copy, and a hidden copy standing first in
  // the markup keeps the city the guest has just cleared.
  const env = listPage({ searchForm: { fields: ['location'], values: { location: 'Gdańsk' } } });
  await env.settled();
  searchFieldOf(env, 'location').offsetParent = null;
  const visible = element({ 'd2-booking-search-field': 'location' }, 'input');
  visible.value = '';
  env.searchForm.appendChild(visible);
  fire(env.searchForm, 'submit');
  await env.settled();
  assert.equal(listCalls(env).pop().url.indexOf('location='), -1);
});

test('a hidden field alone still speaks', async () => {
  // MUTACJA: read visible fields only, and a page pinning a value in a hidden
  // input loses it.
  const env = listPage({ searchForm: { fields: ['adults'] } });
  await env.settled();
  const hidden = element({ 'd2-booking-search-field': 'location' }, 'input');
  hidden.value = 'Sopot';
  hidden.offsetParent = null;
  env.searchForm.appendChild(hidden);
  fire(env.searchForm, 'submit');
  await env.settled();
  assert.ok(listCalls(env).pop().url.indexOf('location=Sopot') >= 0);
});

test('a link checks the radio it names and leaves the values of the others', async () => {
  // MUTACJA: write .value on each, and every radio becomes Gdańsk with none checked.
  const env = listPage({ search: '?location=' + encodeURIComponent('Gdańsk'), searchForm: { fields: ['adults'] } });
  const one = radio(env.searchForm, 'Wrocław', false);
  const two = radio(env.searchForm, 'Gdańsk', false);
  await env.settled();
  assert.equal(one.value, 'Wrocław');
  assert.equal(one.checked, false);
  assert.equal(two.checked, true);
});

test('a bad period from a link does not trap a form with no date fields', async () => {
  // MUTACJA: keep it, and the guest is told to pick dates with no field for it,
  // on every submit, for good.
  const env = listPage({
    search: '?check_in=2027-05-01&location=Sopot',
    searchForm: { fields: ['adults', 'location'], values: { location: 'Sopot' } },
  });
  await env.settled();
  const before = listCalls(env).length;
  fire(env.searchForm, 'submit');
  await env.settled();
  assert.equal(listCalls(env).length, before + 1, 'the search went out');
  assert.equal(listCalls(env).pop().url.indexOf('check_in'), -1);
});

test('a bad period the guest can mend is still refused', async () => {
  // MUTACJA: drop half a period on every form, and a guest who forgot the
  // departure gets the whole offer without a word.
  const env = listPage({ searchForm: { values: { check_in: '2027-05-01' } } });
  await env.settled();
  const before = listCalls(env).length;
  fire(env.searchForm, 'submit');
  await env.settled();
  assert.equal(listCalls(env).length, before);
});

test('the calendar does not wait for the list', async () => {
  // MUTACJA: put applyResults in the same Promise.all, and the calendar stays
  // blank until /products answers, up to ten seconds on a slow API.
  const held = deferred();
  const env = calendarPage({
    results: true,
    forms: [],
    script: { products: [({ response }) => held.promise.then(() => response(200, answerOf(places(1), 1)))] },
  });
  await env.settled();
  assert.ok(availabilityCalls(env).length > 0, 'the calendar asked while the list was still out');
  held.release();
  await env.settled();
});

test('during a 429 wait the search spends no call and its button is down', async () => {
  // MUTACJA: runSearch ignores the wait, and every click on Szukaj earns the
  // next 429.
  const env = listPage({
    results: { inner: ['more'] },
    searchForm: { submit: true },
    script: { products: [refused429(30)] },
  });
  await env.settled();
  const button = env.searchForm.querySelector('button');
  assert.equal(button.disabled, true);
  const before = listCalls(env).length;
  fire(env.searchForm, 'submit');
  await env.settled();
  assert.equal(listCalls(env).length, before);

  await env.tick();
  assert.equal(button.disabled, false, 'the wait is over');
  fire(env.searchForm, 'submit');
  await env.settled();
  assert.equal(listCalls(env).length, before + 1);
});

test('with two lists waiting out a 429, the search opens only when the longer wait ends', async () => {
  // MUTACJA: let the first list's timer open the search, and the click it
  // invites lands inside the second list's wait and earns the next 429.
  const env = listPage({
    results: { inner: ['more'] },
    searchForm: { submit: true },
    script: { products: [refused429(10), refused429(30)] },
  });
  const second = element({ 'd2-booking-results': '' }, 'div');
  env.document.body.appendChild(second);
  await env.booking.apply();
  await env.settled();
  const button = env.searchForm.querySelector('button');
  assert.equal(button.disabled, true);
  assert.ok(env.waits().indexOf(10000) >= 0 && env.waits().indexOf(30000) >= 0, env.waits().join(','));
  await env.tick(10000);
  assert.equal(button.disabled, true, 'the other list is still waiting');
  await env.tick();
  assert.equal(button.disabled, false, 'both waits are over');
});

test('a field in a position: fixed panel counts as the one the guest sees', async () => {
  // MUTACJA: trust offsetParent alone, and the drawer's emptied field loses to
  // the hidden desktop copy: the guest cannot clear the city on a phone.
  const env = listPage({ searchForm: { fields: ['location'], values: { location: 'Gdańsk' } } });
  await env.settled();
  const hidden = searchFieldOf(env, 'location');
  hidden.offsetParent = null;
  hidden.getClientRects = () => [];
  const drawer = element({ 'd2-booking-search-field': 'location' }, 'input');
  drawer.value = '';
  drawer.offsetParent = null;
  drawer.getClientRects = () => [{ width: 300, height: 40 }];
  env.searchForm.appendChild(drawer);
  fire(env.searchForm, 'submit');
  await env.settled();
  assert.equal(listCalls(env).pop().url.indexOf('location='), -1);
});

test('payments that are not switched on are not painted as the guest\'s mistake', async () => {
  // MUTACJA: show it like any refusal, and a guest who did everything right
  // reads a red error about the owner's Stripe account.
  const env = payPage({ refuse: { checkout: 'stripe_not_connected' } });
  await paySubmit(env);
  const slot = env.form.querySelector('[d2-booking-error="form"]');
  assert.equal(slot.getAttribute('d2-booking-ok'), '');
  fire(env.form, 'submit');
  await env.settled();
  assert.equal(slot.getAttribute('d2-booking-ok'), '', 'and it stays so on the stored refusal');
});

test('a hold that ended is still a refusal to look at', async () => {
  // MUTACJA: mark every final refusal, and a dead booking reads as information.
  const env = payPage({ refuse: { checkout: 'booking_not_payable' } });
  await paySubmit(env);
  assert.equal(env.form.querySelector('[d2-booking-error="form"]').getAttribute('d2-booking-ok'), null);
});

test('a long wait is said in minutes', async () => {
  // MUTACJA: print the seconds, and the guest reads "za 2976 s".
  const long = page({ refuse: { bookings: 'too_many_requests' }, headers: { 'Retry-After': '2976' } });
  await long.settled();
  const waited = await long.booking.request('POST', '/products/x/bookings', { body: {} });
  assert.equal(waited.message, 'Zbyt wiele prób. Spróbuj ponownie za 50 min.');
  const short = page({ refuse: { bookings: 'too_many_requests' }, headers: { 'Retry-After': '45' } });
  await short.settled();
  const brief = await short.booking.request('POST', '/products/x/bookings', { body: {} });
  assert.equal(brief.message, 'Zbyt wiele prób. Spróbuj ponownie za 45 s.');
});

test('the threshold field goes even from a form with no hint slot', async () => {
  // MUTACJA: return early when there is no hint, and the question stays on a
  // Designer's form and goes out in the quote and in the hold key.
  const env = page({
    config: { form_fields: { pets: 'optional' } },
    forms: [{ fields: { pets_over_threshold: '' }, attrs: { 'd2-booking-product': PRODUCT } }],
    productData: { pet_fee: null },
  });
  await env.settled();
  assert.equal(env.document.querySelector('[d2-booking-field="pets_over_threshold"]'), null);
});

test('no sentence sends the guest to an e-mail that does not exist', async () => {
  // MUTACJA: bring back "link do płatności masz w e-mailu". No e-mail carries a
  // first-payment link, so the guest searches their inbox for nothing.
  const env = payPage();
  await env.settled();
  ['checkout_url_missing', 'return_cancelled_hold', 'booking_received'].forEach((name) => {
    const said = env.booking.message(name);
    assert.equal(/masz w e-mailu|Sprawdź e-mail|wysłaliśmy/.test(said), false, said);
  });
});
