const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'webflow-scripts', 'modules', 'sliders.js');

// --- Minimal DOM stub, just enough for the CMS-feed ingest path -------------
// Supports: children, attributes, classList.contains, style, appendChild,
// insertBefore, firstChild, contains, cloneNode(deep), and querySelector(All)
// for the simple `[attr]`, `[attr="v"]` and `:not([attr])` selectors the feed
// code uses.
function qsa(root, selector) {
  const req = [];
  const eq = [];
  const neg = [];
  const re = /(:not\(\[([^\]=]+)(?:="([^"]*)")?\]\))|\[([^\]=]+)(?:="([^"]*)")?\]/g;
  let m;
  while ((m = re.exec(selector))) {
    if (m[1]) neg.push([m[2], m[3]]);
    else if (m[5] !== undefined) eq.push([m[4], m[5]]);
    else req.push(m[4]);
  }
  const out = [];
  (function walk(n) {
    n.children.forEach((ch) => {
      const ok =
        req.every((a) => a in ch.attrs) &&
        eq.every(([a, v]) => ch.attrs[a] === v) &&
        neg.every(([a, v]) => (v === undefined ? !(a in ch.attrs) : ch.attrs[a] !== v));
      if (ok) out.push(ch);
      walk(ch);
    });
  })(root);
  return out;
}

function el(tag, attrs) {
  const node = {
    tagName: tag.toUpperCase(),
    children: [],
    attrs: Object.assign({}, attrs),
    style: {},
    parentNode: null,
    classList: {
      contains(c) {
        return String(node.attrs.class || '').split(/\s+/).indexOf(c) !== -1;
      },
    },
    getAttribute(n) {
      return n in node.attrs ? node.attrs[n] : null;
    },
    setAttribute(n, v) {
      node.attrs[n] = String(v);
    },
    hasAttribute(n) {
      return n in node.attrs;
    },
    removeAttribute(n) {
      delete node.attrs[n];
    },
    appendChild(c) {
      if (c.parentNode) c.parentNode.children = c.parentNode.children.filter((x) => x !== c);
      c.parentNode = node;
      node.children.push(c);
      return c;
    },
    insertBefore(c, ref) {
      if (c.parentNode) c.parentNode.children = c.parentNode.children.filter((x) => x !== c);
      c.parentNode = node;
      if (ref == null) {
        node.children.push(c);
      } else {
        const i = node.children.indexOf(ref);
        node.children.splice(i < 0 ? node.children.length : i, 0, c);
      }
      return c;
    },
    removeChild(c) {
      node.children = node.children.filter((x) => x !== c);
      if (c) c.parentNode = null;
      return c;
    },
    get firstChild() {
      return node.children[0] || null;
    },
    get attributes() {
      return Object.keys(node.attrs).map((name) => ({ name, value: node.attrs[name] }));
    },
    contains(other) {
      if (other === node) return true;
      return node.children.some((ch) => ch.contains && ch.contains(other));
    },
    cloneNode() {
      const copy = el(tag, node.attrs);
      node.children.forEach((ch) => copy.appendChild(ch.cloneNode(true)));
      return copy;
    },
    querySelector(sel) {
      return qsa(node, sel)[0] || null;
    },
    querySelectorAll(sel) {
      return qsa(node, sel);
    },
  };
  return node;
}

// A collection-list source of `count` slide items, each tagged with a marker.
function source(name, markers) {
  const src = el('div', { 'd2-slider-source': name });
  markers.forEach((mk) => src.appendChild(el('div', { 'd2-slide': '', m: mk })));
  return src;
}

// A feed slider whose track already holds `staticMarkers` slides.
function feedSlider(name, position, staticMarkers) {
  const attrs = { 'd2-slider-feed': name };
  if (position !== undefined) attrs['d2-slider-feed-position'] = position;
  const slider = el('div', attrs);
  const track = el('div', { 'd2-slider-track': '' });
  staticMarkers.forEach((mk) => track.appendChild(el('div', { 'd2-slide': '', m: mk })));
  slider.appendChild(track);
  slider._track = track;
  return slider;
}

function loadSliders(body) {
  const document = {
    readyState: 'complete',
    body,
    addEventListener() {},
    removeEventListener() {},
    querySelector(sel) {
      return qsa(body, sel)[0] || null;
    },
    querySelectorAll(sel) {
      return qsa(body, sel);
    },
    createElement(tag) {
      return el(tag, {});
    },
  };
  const window = {};
  window.document = document;
  const context = vm.createContext({ window, document, console, setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync(modulePath, 'utf8'), context, { filename: modulePath });
  return window.digi2.sliders;
}

function trackMarkers(slider) {
  return slider._track.children.map((c) => c.getAttribute('m'));
}

// --- Pure resolver ----------------------------------------------------------
test('_feedInsertIndex resolves start/end/number/clamp/garbage', () => {
  const s = loadSliders(el('body', {}));
  const idx = s._feedInsertIndex;

  assert.equal(idx('start', 2), 0);
  assert.equal(idx('', 2), 0);
  assert.equal(idx(null, 2), 0);
  assert.equal(idx(undefined, 2), 0);
  assert.equal(idx('end', 2), 2, '"end" = append after the last of 2 slides');
  assert.equal(idx('END', 2), 2, 'case-insensitive');
  assert.equal(idx('1', 2), 1, 'the middle of 2 static slides');
  assert.equal(idx('2', 2), 2, 'N = slide count → append');
  assert.equal(idx('5', 2), 2, 'past the end is clamped to count');
  assert.equal(idx('-1', 2), 0, 'negative → start');
  assert.equal(idx('abc', 2), 0, 'non-numeric → start');
  assert.equal(idx('0', 3), 0);
});

// --- Actual DOM injection order --------------------------------------------
test('feed default drops the collection block at the START', () => {
  const body = el('body', {});
  body.appendChild(source('gal', ['C1', 'C2']));
  const slider = feedSlider('gal', undefined, ['A', 'B']);
  body.appendChild(slider);

  loadSliders(body);
  assert.deepEqual(trackMarkers(slider), ['C1', 'C2', 'A', 'B']);
});

test('feed position="end" appends the collection block after the static slides', () => {
  const body = el('body', {});
  body.appendChild(source('gal', ['C1', 'C2']));
  const slider = feedSlider('gal', 'end', ['A', 'B']);
  body.appendChild(slider);

  loadSliders(body);
  assert.deepEqual(trackMarkers(slider), ['A', 'B', 'C1', 'C2']);
});

test('feed position="1" drops the collection block in the MIDDLE of 2 static slides', () => {
  const body = el('body', {});
  body.appendChild(source('gal', ['C1', 'C2']));
  const slider = feedSlider('gal', '1', ['A', 'B']);
  body.appendChild(slider);

  loadSliders(body);
  assert.deepEqual(trackMarkers(slider), ['A', 'C1', 'C2', 'B']);
});

test('feed numeric position past the slide count clamps to the end (append)', () => {
  const body = el('body', {});
  body.appendChild(source('gal', ['C1']));
  const slider = feedSlider('gal', '9', ['A', 'B']);
  body.appendChild(slider);

  loadSliders(body);
  assert.deepEqual(trackMarkers(slider), ['A', 'B', 'C1']);
});

// --- Conditional feed (d2-slider-feed-if) ----------------------------------
test('_feedTruthy gates the conditional feed', () => {
  const t = loadSliders(el('body', {}))._feedTruthy;
  ['true', 'TRUE', ' yes ', 'on', '1', 'anything'].forEach((v) => assert.equal(t(v), true, String(v)));
  ['false', 'FALSE', '', 'no', 'off', '0', null, undefined].forEach((v) => assert.equal(t(v), false, String(v)));
});

test('feed-if truthy injects the block: 1 static · feed · 2 static (position=1)', () => {
  const body = el('body', {});
  body.appendChild(source('gal', ['C1', 'C2']));
  const slider = feedSlider('gal', '1', ['A', 'B', 'C']);
  slider.setAttribute('d2-slider-feed-if', 'true');
  body.appendChild(slider);

  loadSliders(body);
  assert.deepEqual(trackMarkers(slider), ['A', 'C1', 'C2', 'B', 'C']);
});

test('feed-if falsy skips the feed entirely — only the static slides remain', () => {
  const body = el('body', {});
  body.appendChild(source('gal', ['C1', 'C2']));
  const slider = feedSlider('gal', '1', ['A', 'B', 'C']);
  slider.setAttribute('d2-slider-feed-if', 'false');
  body.appendChild(slider);

  loadSliders(body);
  assert.deepEqual(trackMarkers(slider), ['A', 'B', 'C']);
});

// --- CMS-driven position via suffixed booleans (d2-slider-feed-position-N) ---
test('_feedSuffixPosition resolves suffixed boolean positions', () => {
  const s = loadSliders(el('body', {}));
  const f = s._feedSuffixPosition;
  const P = (obj) => Object.keys(obj).map((name) => ({ name, value: obj[name] }));

  assert.equal(f(P({ 'd2-slider': '' }), 3), null, 'no suffixed attrs → null (use feed-position)');
  assert.equal(f(P({ 'd2-slider-feed-position-1': 'true' }), 3), 1, 'the truthy suffix picks the index');
  assert.equal(f(P({ 'd2-slider-feed-position-1': 'false', 'd2-slider-feed-position-2': 'true' }), 3), 2,
    'only the truthy suffix counts');
  assert.equal(f(P({ 'd2-slider-feed-position-1': 'true', 'd2-slider-feed-position-2': 'true' }), 3), 1,
    'smallest N breaks ties');
  assert.equal(f(P({ 'd2-slider-feed-position-1': 'false', 'd2-slider-feed-position-2': 'false' }), 3), -1,
    'present but all false → skip');
  assert.equal(f(P({ 'd2-slider-feed-position-9': 'true' }), 3), 3, 'clamped to the slide count');
});

test('feed-position-N boolean drops the block at the chosen index (CMS Switch)', () => {
  const body = el('body', {});
  body.appendChild(source('gal', ['C1', 'C2']));
  const slider = feedSlider('gal', undefined, ['A', 'B', 'C']);
  slider.setAttribute('d2-slider-feed-position-1', 'true');   // Switch = on
  body.appendChild(slider);

  loadSliders(body);
  assert.deepEqual(trackMarkers(slider), ['A', 'C1', 'C2', 'B', 'C']);
});

test('feed-position-N all false → the feed is skipped for that item', () => {
  const body = el('body', {});
  body.appendChild(source('gal', ['C1', 'C2']));
  const slider = feedSlider('gal', undefined, ['A', 'B', 'C']);
  slider.setAttribute('d2-slider-feed-position-1', 'false');
  slider.setAttribute('d2-slider-feed-position-2', 'false');
  body.appendChild(slider);

  loadSliders(body);
  assert.deepEqual(trackMarkers(slider), ['A', 'B', 'C']);
});

test('a truthy feed-position-N overrides the plain feed-position', () => {
  const body = el('body', {});
  body.appendChild(source('gal', ['C1']));
  const slider = feedSlider('gal', 'end', ['A', 'B']); // plain says "end"
  slider.setAttribute('d2-slider-feed-position-1', 'true'); // suffix says middle → wins
  body.appendChild(slider);

  loadSliders(body);
  assert.deepEqual(trackMarkers(slider), ['A', 'C1', 'B']);
});

// --- JS API: digi2.sliders.feed(name, config) -------------------------------
test('feed(name, {position}) repositions the block on re-feed (no duplicates)', () => {
  const body = el('body', {});
  body.appendChild(source('gal', ['C1', 'C2']));
  const slider = feedSlider('gal', undefined, ['A', 'B', 'C']); // default → start
  body.appendChild(slider);

  const S = loadSliders(body);
  assert.deepEqual(trackMarkers(slider), ['C1', 'C2', 'A', 'B', 'C'], 'default feed at start');

  S.feed('gal', { position: 1 }); // 1 static · feed · rest
  assert.deepEqual(trackMarkers(slider), ['A', 'C1', 'C2', 'B', 'C'], 'undoes prior inject, re-feeds at 1');
});

test('feed(name, { if: false }) skips the feed', () => {
  const body = el('body', {});
  body.appendChild(source('gal', ['C1', 'C2']));
  const slider = feedSlider('gal', undefined, ['A', 'B']);
  body.appendChild(slider);

  const S = loadSliders(body);
  assert.deepEqual(trackMarkers(slider), ['C1', 'C2', 'A', 'B']);
  S.feed('gal', { if: false });
  assert.deepEqual(trackMarkers(slider), ['A', 'B'], 'gate off → only static slides');
});

test('feed(name, { position: "off" }) also skips the feed', () => {
  const body = el('body', {});
  body.appendChild(source('gal', ['C1']));
  const slider = feedSlider('gal', undefined, ['A', 'B']);
  body.appendChild(slider);

  const S = loadSliders(body);
  S.feed('gal', { position: 'off' });
  assert.deepEqual(trackMarkers(slider), ['A', 'B']);
});

test('feed() position overrides the plain feed-position attribute', () => {
  const body = el('body', {});
  body.appendChild(source('gal', ['C1']));
  const slider = feedSlider('gal', 'end', ['A', 'B']); // attribute says "end"
  body.appendChild(slider);

  const S = loadSliders(body);
  assert.deepEqual(trackMarkers(slider), ['A', 'B', 'C1'], 'attribute end');
  S.feed('gal', { position: 'start' }); // config wins
  assert.deepEqual(trackMarkers(slider), ['C1', 'A', 'B']);
});
