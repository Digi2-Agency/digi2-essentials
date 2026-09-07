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
      const m = sel.match(/\[(d2-datalayer-(?:only|disable|lead))\]/);
      if (!m) return null;
      const key = m[1] === 'd2-datalayer-only' ? 'only'
        : m[1] === 'd2-datalayer-disable' ? 'disable' : 'lead';
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

  // form_submit is new alongside generate_lead; the lead itself is untouched.
  const [item, lead, submit, err] = env.dl();
  assert.equal(item.event, 'select_item');
  assert.equal(item.item_id, 'b-1-05');
  assert.equal(item.item_list_name, 'products');
  assert.equal(lead.event, 'generate_lead');
  assert.equal(lead.form_id, 'wf-form-Popup');
  assert.equal(submit.event, 'form_submit');
  assert.equal(submit.form_id, 'wf-form-Popup');
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

// ---------------------------------------------------------------------------
// form_submit / generate_lead / form_submit_error
// ---------------------------------------------------------------------------

const SUCCESS = {
  formId: 'email-form', name: 'kontakt', formLocation: '/mieszkania',
  leadSource: 'facebook', leadMedium: 'cpc', leadCampaign: 'wiosna',
  hasGclid: false, hasFbclid: true, consentMarketing: true,
};

test('by default generate_lead keeps firing exactly where it always did', () => {
  // The whole point of the default: a site with generate_lead marked as a key
  // event in GA4 and imported into Ads sees no change until it opts in.
  const env = createEnvironment();
  env.emit('form:submit', { name: 'kontakt', formId: 'email-form' });

  assert.deepEqual(env.dl(), [
    { event: 'generate_lead', form_id: 'email-form', form_name: 'kontakt' },
    { event: 'form_submit', form_id: 'email-form', form_name: 'kontakt' },
  ]);
});

test('the confirmed submission is reported even on the default setting', () => {
  const env = createEnvironment();
  env.emit('form:success', SUCCESS);

  assert.deepEqual(env.dl(), [{
    event: 'form_submit_success',
    form_id: 'email-form', form_name: 'kontakt', form_location: '/mieszkania',
    lead_source: 'facebook', lead_medium: 'cpc', lead_campaign: 'wiosna',
    has_gclid: false, has_fbclid: true, consent_marketing: true,
  }], 'false survives clean() — "not from Google Ads" is information, not a blank');
});

test('d2-datalayer-lead="success" moves generate_lead onto the server confirmation', () => {
  const env = createEnvironment({ lead: 'success' });

  env.emit('form:submit', { name: 'kontakt', formId: 'email-form' });
  assert.deepEqual(env.dl(), [
    { event: 'form_submit', form_id: 'email-form', form_name: 'kontakt' },
  ], 'the click alone is no longer a lead');

  env.emit('form:success', SUCCESS);
  const events = env.dl().map((e) => e.event);
  assert.deepEqual(events, ['form_submit', 'generate_lead', 'form_submit_success']);

  const lead = env.dl().find((e) => e.event === 'generate_lead');
  assert.equal(lead.lead_source, 'facebook');
  assert.equal(lead.has_fbclid, true);
  assert.equal(lead.form_location, '/mieszkania');
});

test('a refused submission is reported and is never a lead', () => {
  const env = createEnvironment({ lead: 'success' });
  env.emit('form:failure', { name: 'kontakt', formId: 'email-form' });

  assert.deepEqual(env.dl(), [
    { event: 'form_submit_error', form_id: 'email-form', form_name: 'kontakt' },
  ]);
});

test('an unknown d2-datalayer-lead value falls back to the safe default', () => {
  const warnings = [];
  const orig = console.warn;
  console.warn = (m) => warnings.push(String(m));
  let env;
  try { env = createEnvironment({ lead: 'whenever' }); } finally { console.warn = orig; }

  env.emit('form:submit', { name: 'kontakt', formId: 'email-form' });
  assert.ok(env.dl().some((e) => e.event === 'generate_lead'), 'behaves as "submit"');
  assert.ok(warnings.some((w) => w.includes('d2-datalayer-lead')), 'and says so');
});

test('disabling the forms group silences all of it, new events included', () => {
  const env = createEnvironment({ disable: 'forms' });
  env.emit('form:submit', { name: 'kontakt', formId: 'email-form' });
  env.emit('form:success', SUCCESS);
  env.emit('form:failure', { name: 'kontakt', formId: 'email-form' });
  assert.deepEqual(env.dl(), []);
});

test('A/B events carry their parameters instead of arriving empty', () => {
  const env = createEnvironment();
  env.emit('ab:assigned', { ab_test: 'hero', ab_variant: 'B' });
  env.emit('ab:click', { ab_test: 'hero', ab_variant: 'B' });

  assert.deepEqual(env.dl(), [
    { event: 'experiment_impression', experiment_id: 'hero', variant_id: 'B' },
    { event: 'select_promotion', promotion_id: 'hero', creative_name: 'B' },
  ]);
});

test('select_content carries the image it opened', () => {
  const env = createEnvironment();
  env.emit('lightbox:open', { index: 2, total: 9, src: '/img/salon.jpg' });

  assert.deepEqual(env.dl(), [
    { event: 'select_content', content_type: 'image', item_id: '/img/salon.jpg', index: 2, total: 9 },
  ]);
});

// ---------------------------------------------------------------------------
// Funnel — the forms-detail group
// ---------------------------------------------------------------------------

test('the funnel maps onto GA4 form events', () => {
  const env = createEnvironment();
  env.emit('form:start', { name: 'kontakt', formId: 'email-form' });
  env.emit('form:field', { name: 'kontakt', formId: 'email-form', fieldName: 'EMAIL', fieldType: 'email' });
  env.emit('form:submitclick', { name: 'kontakt', formId: 'email-form' });

  assert.deepEqual(env.dl(), [
    { event: 'form_start', form_id: 'email-form', form_name: 'kontakt' },
    {
      event: 'form_field_interaction', form_id: 'email-form', form_name: 'kontakt',
      field_name: 'EMAIL', field_type: 'email',
    },
    { event: 'form_submit_click', form_id: 'email-form', form_name: 'kontakt' },
  ]);
});

test('forms-detail can be switched off without losing the lead events', () => {
  const env = createEnvironment({ disable: 'forms-detail' });
  env.emit('form:start', { name: 'kontakt', formId: 'email-form' });
  env.emit('form:field', { name: 'kontakt', formId: 'email-form', fieldName: 'EMAIL', fieldType: 'email' });
  env.emit('form:submitclick', { name: 'kontakt', formId: 'email-form' });
  assert.deepEqual(env.dl(), [], 'the chatty group is silent');

  env.emit('form:submit', { name: 'kontakt', formId: 'email-form' });
  const events = env.dl().map((e) => e.event);
  assert.ok(events.includes('generate_lead'), 'conversions keep reporting');
  assert.ok(events.includes('form_submit'));
});

test('forms-detail is a known group name', () => {
  const warnings = [];
  const orig = console.warn;
  console.warn = (m) => warnings.push(String(m));
  try { createEnvironment({ disable: 'forms-detail' }); } finally { console.warn = orig; }
  assert.equal(warnings.length, 0, 'no "unknown group" warning');
});
