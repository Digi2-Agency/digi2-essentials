const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'webflow-scripts', 'modules', 'datalayer.js');

// Minimal harness: the module only needs an event bus, a dataLayer array and a
// querySelector that can find the flag element.
function createEnvironment(flagValue) {
  const listeners = {};
  const flagEl = flagValue == null ? null : {
    getAttribute(name) { return name === 'd2-datalayer' ? flagValue : null; },
  };
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
      if (sel === 'script[d2-datalayer]' || sel === '[d2-datalayer]') return flagEl;
      return null;
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

test('"-group" switches one group off, everything else keeps reporting', () => {
  const env = createEnvironment('-lightbox');
  env.emit('lightbox:open', { index: 1, total: 3 });
  env.emit('popup:open', { name: 'contact' });

  assert.equal(env.dl().length, 1, 'only the popup got through');
  assert.equal(env.dl()[0].event, 'view_promotion');
  assert.deepEqual(env.window.digi2.datalayer.enabled().includes('lightbox'), false);
});

test('a bare list is an allow-list: only those groups report', () => {
  const env = createEnvironment('popups forms');
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
