const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'webflow-scripts', 'modules', 'datalayer.js');

// Minimal harness: the module only needs an event bus, a dataLayer array and a
// querySelector that can find the flag element.
function createEnvironment(cfg) {
  const listeners = {};
  const attrs = cfg || {};              // { only: '…', disable: '…' }
  const elFor = (attr, value) => (value == null ? null : {
    getAttribute(name) { return name === attr ? value : null; },
  });
  const window = {
    dataLayer: [],
    digi2: {
      log() {},
      on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
      emit(name, data) { (listeners[name] || []).forEach((fn) => fn(data)); },
    },
  };
  const document = {
    querySelector(sel) {
      const m = sel.match(/\[(d2-datalayer-(?:only|disable))\]/);
      if (!m) return null;
      const key = m[1] === 'd2-datalayer-only' ? 'only' : 'disable';
      return elFor(m[1], attrs[key]);
    },
  };
  const context = vm.createContext({ window, document, console });
  vm.runInContext(fs.readFileSync(modulePath, 'utf8'), context, { filename: modulePath });
  // vm objects come from another realm, so deepStrictEqual would reject them
  // on prototype identity alone — normalise through JSON when comparing.
  return {
    window, document, emit: window.digi2.emit,
    dl: () => JSON.parse(JSON.stringify(window.dataLayer)),
  };
}

test('popup open/close map onto GA4 promotion events', () => {
  const env = createEnvironment();
  env.emit('popup:open', { name: 'contact' });
  env.emit('popup:close', { name: 'contact' });

  assert.deepEqual(env.dl(), [
    { event: 'view_promotion', promotion_id: 'contact', promotion_name: 'contact', creative_slot: 'popup' },
    { event: 'close_promotion', promotion_id: 'contact', promotion_name: 'contact', creative_slot: 'popup' },
  ]);
});

test('filtering reports view_item_list with a flattened filter string and counts', () => {
  const env = createEnvironment();
  env.emit('cms:filter', {
    list: 'offers',
    filters: { rooms: ['1', '2'], status: 'Dostępne' },
    matching: 7,
    total: 84,
  });

  const [hit] = env.dl();
  assert.equal(hit.event, 'view_item_list');
  assert.equal(hit.item_list_name, 'offers');
  assert.equal(hit.filters, 'rooms:1|2,status:Dostępne');
  assert.equal(hit.filter_count, 2);
  assert.equal(hit.matching, 7);
  assert.equal(hit.total, 84);
});

test('sorting and load-more both report view_item_list with their own params', () => {
  const env = createEnvironment();
  env.emit('cms:sort', { list: 'offers', field: 'price', dir: 'asc' });
  env.emit('cms:items-added', { list: 'offers', count: 12 });

  const [sort, more] = env.dl();
  assert.equal(sort.event, 'view_item_list');
  assert.equal(sort.sort_field, 'price');
  assert.equal(sort.sort_direction, 'asc');
  assert.equal(more.event, 'view_item_list');
  assert.equal(more.loaded, 12);
});

test('expanding a product row reports select_item; forms report lead / error', () => {
  const env = createEnvironment();
  env.emit('tabs:change', { group: 'products', tab: 'b-1-05' });
  env.emit('form:submit', { name: 'contactPopup', formId: 'wf-form-Popup' });
  env.emit('form:invalid', { name: 'contactPopup', formId: 'wf-form-Popup' });

  const [item, lead, err] = env.dl();
  assert.equal(item.event, 'select_item');
  assert.equal(item.item_id, 'b-1-05');
  assert.equal(item.item_list_name, 'products');
  assert.equal(lead.event, 'generate_lead');
  assert.equal(lead.form_id, 'wf-form-Popup');
  assert.equal(err.event, 'form_error');
});

test('empty values are dropped so GA4 never gets blank params', () => {
  const env = createEnvironment();
  env.emit('lightbox:open', { index: 0, total: 5 });   // no src
  const [hit] = env.dl();
  assert.equal(hit.event, 'select_content');
  assert.equal(hit.content_type, 'image');
  assert.equal('item_id' in hit, false, 'missing src is not pushed as an empty key');
  assert.equal(hit.total, 5);
  // index 0 is falsy but meaningful — make sure it survived
  assert.equal(hit.index, 0);
});

test('d2-datalayer-disable switches a group off, everything else keeps reporting', () => {
  const env = createEnvironment({ disable: 'lightbox' });
  env.emit('lightbox:open', { index: 1, total: 3 });
  env.emit('popup:open', { name: 'contact' });

  assert.equal(env.dl().length, 1, 'only the popup got through');
  assert.equal(env.dl()[0].event, 'view_promotion');
  assert.equal(env.window.digi2.datalayer.enabled().indexOf('lightbox'), -1);
});

test('d2-datalayer-only limits reporting to the listed groups', () => {
  const env = createEnvironment({ only: 'popups forms' });
  env.emit('cms:filter', { list: 'offers', filters: {}, matching: 1, total: 1 });
  env.emit('tabs:change', { group: 'g', tab: 't' });
  env.emit('popup:open', { name: 'contact' });

  assert.equal(env.dl().length, 1);
  assert.equal(env.dl()[0].event, 'view_promotion');
});

test('runtime disable/enable and manual push', () => {
  const env = createEnvironment();
  env.window.digi2.datalayer.disable('popups');
  env.emit('popup:open', { name: 'x' });
  assert.equal(env.dl().length, 0);

  env.window.digi2.datalayer.enable('popups');
  env.emit('popup:open', { name: 'x' });
  assert.equal(env.dl().length, 1);

  env.window.digi2.datalayer.push({ event: 'custom_thing', foo: 1 });
  assert.equal(env.dl()[1].event, 'custom_thing');
  assert.equal(env.window.digi2.datalayer.push({ foo: 1 }), false, 'push without event is rejected');
});

test('-only and -disable combine: only narrows, disable subtracts from that', () => {
  const env = createEnvironment({ only: 'popups forms cms', disable: 'cms' });
  // enabled() returns a vm-realm array — compare by value, not identity
  assert.equal(env.window.digi2.datalayer.enabled().sort().join(','), 'forms,popups');

  env.emit('cms:filter', { list: 'offers', filters: {}, matching: 1, total: 1 });
  env.emit('popup:open', { name: 'contact' });
  assert.equal(env.dl().length, 1, 'cms was removed even though -only listed it');
  assert.equal(env.dl()[0].event, 'view_promotion');
});

test('an unknown group name warns instead of silently doing nothing', () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (msg) => warnings.push(String(msg));
  try {
    createEnvironment({ disable: 'lightbxo' });   // typo
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /unknown group\(s\): lightbxo/);
});

test('popup video reports GA4 video_complete and video_unmute', () => {
  const env = createEnvironment();
  env.emit('popup:video-end', { name: 'film' });
  env.emit('popup:video-unmute', { name: 'film' });

  assert.deepEqual(env.dl(), [
    { event: 'video_complete', video_title: 'film', video_provider: 'popup' },
    { event: 'video_unmute', video_title: 'film', video_provider: 'popup' },
  ]);
});

test('disabling the popups group silences the video events too', () => {
  const env = createEnvironment({ disable: 'popups' });
  env.emit('popup:video-end', { name: 'film' });
  assert.equal(env.dl().length, 0);
});
