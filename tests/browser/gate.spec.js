// Browser gate before a release: forms, popups and datalayer from dist/, in a
// real Chromium, on the local sandbox pages only. Nothing leaves localhost:
// every other request in the browser context (all pages, popups, workers) is
// aborted and fails the test, and the browser cannot resolve any other host
// (playwright.config.js) — no client form is ever reached.
const { test, expect } = require('@playwright/test');

const LOCAL = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//;

test.beforeEach(async ({ context, page }, testInfo) => {
  const outside = [];
  const errors = [];
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (LOCAL.test(url) || url.startsWith('data:')) return route.continue();
    outside.push(url);
    return route.abort();
  });
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console.error: ' + msg.text());
  });
  // A module that 404s or throws on load leaves the loader without it; the
  // assertions below would catch that too, but this names the cause.
  page.on('response', (res) => {
    if (res.status() >= 400) errors.push('HTTP ' + res.status() + ' ' + res.url());
  });
  testInfo.gate = { outside, errors };
});

test.afterEach(async ({}, testInfo) => {
  const { outside, errors } = testInfo.gate;
  expect(outside, 'requests outside localhost').toEqual([]);
  expect(errors, 'errors in the page').toEqual([]);
});

// dataLayer entries with an `event`, minus GTM-internal noise.
function events(page) {
  return page.evaluate(() => (window.dataLayer || [])
    .filter((e) => e && typeof e.event === 'string' && !/^gtm\./.test(e.event))
    .map((e) => JSON.parse(JSON.stringify(e))));
}

function names(list) {
  return list.map((e) => e.event);
}

// Popups report open/close when the animation ends, not when the element
// shows, so wait for the push instead of reading dataLayer once.
async function pushed(page, event) {
  await expect.poll(async () => names(await events(page)), { message: 'dataLayer event ' + event })
    .toContain(event);
  return (await events(page)).find((e) => e.event === event);
}

// Own timeout: a module that throws on load never appears, and the gate
// should say so without waiting out the whole test timeout.
async function ready(page, mod) {
  await page.waitForFunction((m) => !!(window.digi2 && window.digi2[m] && window.digi2.datalayer), mod, { timeout: 10000 });
}

// ---- forms ----------------------------------------------------------------

test.describe('forms + datalayer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sandbox/gate-forms.html?utm_source=gate&utm_medium=sandbox');
    await ready(page, 'forms');
    await page.waitForFunction(() => !!window.digi2.forms.get('kontakt'), null, { timeout: 10000 });
  });

  test('empty submit is blocked: form_error, errors shown, no lead', async ({ page }) => {
    await page.click('#wyslij');
    await expect(page.locator('#sandbox-form')).toBeVisible();
    await expect(page.locator('.w-form-done')).toBeHidden();

    const ev = names(await events(page));
    expect(ev).toContain('form_error');
    expect(ev).not.toContain('form_submit');
    expect(ev).not.toContain('generate_lead');

    await expect(page.locator('.w-form')).toHaveScreenshot('forms-invalid.png');
  });

  test('valid submit: hidden fields, form_submit → generate_lead → success', async ({ page }) => {
    await page.fill('#NAME', 'Jan Testowy');
    await page.fill('#EMAIL', 'jan@example.test');
    await page.check('input[name=CONSENT_GDPR]');

    // Hidden inputs injected by d2-forms before anything is sent.
    const form = page.locator('#sandbox-form');
    await expect(form.locator('input[name=UTM_SOURCE]')).toHaveValue('gate');
    await expect(form.locator('input[name=UTM_MEDIUM]')).toHaveValue('sandbox');
    await expect(form.locator('input[name=PAGE_URL]')).toHaveValue(/\/sandbox\/gate-forms\.html/);

    await expect(page.locator('.w-form')).toHaveScreenshot('forms-filled.png');

    await page.click('#wyslij');
    await expect(page.locator('.w-form-done')).toBeVisible();
    await pushed(page, 'form_submit_success');

    const list = await events(page);
    const ev = names(list);
    expect(ev).toEqual(expect.arrayContaining(['form_submit', 'generate_lead', 'form_submit_success']));
    expect(ev.indexOf('form_submit')).toBeLessThan(ev.indexOf('form_submit_success'));
    expect(ev).not.toContain('form_error');

    const submit = list.find((e) => e.event === 'form_submit');
    expect(submit).toMatchObject({ form_id: 'sandbox-form', form_name: 'kontakt' });

    // What was typed must never reach the dataLayer.
    const raw = JSON.stringify(list);
    expect(raw).not.toContain('jan@example.test');
    expect(raw).not.toContain('Jan Testowy');

    await expect(page.locator('.w-form')).toHaveScreenshot('forms-done.png');
  });
});

// ---- popups ---------------------------------------------------------------

test.describe('popups + datalayer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sandbox/gate-popups.html');
    await ready(page, 'popups');
    await page.waitForFunction(() => !!window.digi2.popups.get('promo'), null, { timeout: 10000 });
  });

  test('d2-show-popup opens, close button closes, both reported', async ({ page }) => {
    const popup = page.locator('#promo');
    await expect(popup).toBeHidden();

    await page.click('#otworz');
    await expect(popup).toBeVisible();
    await expect(popup).toHaveCSS('opacity', '1');

    expect(await pushed(page, 'view_promotion'))
      .toMatchObject({ promotion_id: 'promo', promotion_name: 'promo', creative_slot: 'popup' });
    await expect(page).toHaveScreenshot('popup-open.png');

    await page.click('.popup-close');
    await expect(popup).toBeHidden();
    expect(await pushed(page, 'close_promotion')).toMatchObject({ promotion_id: 'promo' });
    await expect(page).toHaveScreenshot('popup-closed.png');
  });

  test('Esc closes the popup', async ({ page }) => {
    await page.click('#otworz');
    await expect(page.locator('#promo')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#promo')).toBeHidden();
    await pushed(page, 'close_promotion');
  });
});
