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
    // closeOnEsc arrived after v1.8.2; a release/v1.8.x patch branch runs this
    // same spec without it. Where the option exists, Esc must work.
    const hasEsc = await page.evaluate(() => 'closeOnEsc' in (window.digi2.popups.get('promo').options || {}));
    test.skip(!hasEsc, 'this build has no closeOnEsc option');
    await page.click('#otworz');
    await expect(page.locator('#promo')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#promo')).toBeHidden();
    await pushed(page, 'close_promotion');
  });
});

// ---- booking: the calendar and the price ----------------------------------

// The API is stubbed inside the page from tests/fixtures/booking-api/, so this
// block proves what the mini-DOM in tests/booking.test.js cannot: real focus,
// real ARIA and real Intl output in a browser, from dist/.
test.describe('booking: the calendar and the price', () => {
  // The stub takes the 11th and the 12th of the shown month (a contract-shaped
  // busy period in UTC), so the gate does not depend on today's date.
  function busyDay(page) {
    return page.evaluate(() => document.querySelector('[d2-booking-day]')
      .getAttribute('d2-booking-day').slice(0, 8) + '11');
  }

  function openDays(page) {
    return page.evaluate(() => Array.prototype.filter
      .call(document.querySelectorAll('[d2-booking-day]'), (b) => !b.hasAttribute('aria-disabled'))
      .map((b) => b.getAttribute('d2-booking-day')));
  }

  const SLUG = 'apartament-rynek-wroclaw-3f2b7c1e';
  const ID = '3f2b7c1e-8a44-4c55-9a3e-0d1f6b2a7c10';

  test.beforeEach(async ({ page }) => {
    // The product is in the address, not in an attribute: one booking page
    // serving a whole CMS collection is the pattern this page stands for.
    await page.goto('/sandbox/gate-booking.html?apartament=' + SLUG);
    await page.waitForFunction(() => !!(window.digi2 && window.digi2.booking), null, { timeout: 10000 });
    await page.waitForSelector('[d2-booking-calendar-ready] [d2-booking-day]');
    // Late in the month there may be no room left for a stay; then the gate
    // works on the next one, which is always empty but for the stub's period.
    if ((await openDays(page)).length < 3) {
      await page.click('[d2-booking-calendar-next]');
      await page.waitForFunction(
        (seen) => document.querySelector('[d2-booking-calendar-month]').textContent !== seen,
        await page.textContent('[d2-booking-calendar-month]')
      );
    }
  });

  test('the apartment comes out of the address and the slug is resolved to an id', async ({ page }) => {
    const calls = await page.evaluate(() => window.__d2Calls);
    const asked = calls.filter((c) => /\/products\/[^/?]+$/.test(c));
    expect(asked.length, calls.join('\n')).toBe(1);
    expect(asked[0]).toContain('/products/' + SLUG);
    // And the {product_id} routes get the id of that answer, never the slug.
    const windows = calls.filter((c) => c.indexOf('/availability') >= 0);
    expect(windows.length).toBeGreaterThan(0);
    windows.forEach((c) => expect(c).toContain('/products/' + ID + '/availability'));
    expect(calls.filter((c) => c.indexOf('/products/' + SLUG + '/') >= 0)).toEqual([]);
  });

  test('a bare calendar gets its seven columns from the module, not from the page', async ({ page }) => {
    // This page styles no grid of its own: a Designer whose whole setup is an
    // empty <div d2-booking-calendar> must still get a month, not a column of
    // thirty-one buttons.
    const columns = await page.evaluate(() => getComputedStyle(
      document.querySelector('[d2-booking-calendar-grid] [role=row]')
    ).gridTemplateColumns.trim().split(/\s+/).length);
    expect(columns).toBe(7);
  });

  test('the month is a grid of real buttons the keyboard can walk', async ({ page }) => {
    await expect(page.locator('[d2-booking-calendar-grid]')).toHaveAttribute('role', 'grid');
    expect(await page.locator('[d2-booking-day]').count()).toBeGreaterThan(27);

    const notAButton = await page.evaluate(() => Array.prototype.filter.call(
      document.querySelectorAll('[d2-booking-day]'),
      (b) => b.tagName !== 'BUTTON' || !(b.getAttribute('aria-label') || '').length
    ).length);
    expect(notAButton, 'days that are not labelled buttons').toBe(0);

    // One stop in the tab order, and the arrows move it by a day and by a week.
    const stop = page.locator('[d2-booking-day][tabindex="0"]');
    await expect(stop).toHaveCount(1);
    const from = await stop.first().getAttribute('d2-booking-day');
    await stop.first().focus();
    await page.keyboard.press('ArrowRight');
    const next = await page.evaluate(() => document.activeElement.getAttribute('d2-booking-day'));
    expect(Date.parse(next) - Date.parse(from)).toBe(86400000);
    await expect(page.locator('[d2-booking-day][tabindex="0"]')).toHaveCount(1);
    await page.keyboard.press('ArrowDown');
    const week = await page.evaluate(() => document.activeElement.getAttribute('d2-booking-day'));
    expect(Date.parse(week) - Date.parse(next)).toBe(7 * 86400000);
  });

  test('choosing a day with the keyboard leaves the focus on that day', async ({ page }) => {
    // The grid is rebuilt on every pick, so the focused button really goes away
    // here, which the mini-DOM cannot show: focus would fall to <body>.
    const [day] = (await openDays(page)).slice(-1);
    await page.locator('[d2-booking-day="' + day + '"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[d2-booking-day="' + day + '"]')).toHaveAttribute('d2-booking-day-selected', '');
    expect(await page.evaluate(() => document.activeElement.getAttribute('d2-booking-day'))).toBe(day);
  });

  test('a busy night says it is taken and cannot be picked', async ({ page }) => {
    const taken = page.locator('[d2-booking-day="' + (await busyDay(page)) + '"]');
    await expect(taken).toHaveAttribute('d2-booking-day-busy', '');
    await expect(taken).toHaveAttribute('aria-disabled', 'true');
    expect(await taken.getAttribute('aria-label')).toContain('zajęte');

    // A real mouse click on an aria-disabled button does fire a click event (it
    // is not a native `disabled`), so the module has to refuse it itself.
    // dispatchEvent skips Playwright's enabled-check, which reads aria-disabled.
    await taken.dispatchEvent('click');
    expect(await page.evaluate(() => window.digi2.booking.stay())).toBeNull();
    await expect(page.locator('[d2-booking-day-selected]')).toHaveCount(0);
  });

  test('a chosen range is announced and priced from the answer', async ({ page }) => {
    const open = await openDays(page);
    const [arrival, departure] = open.slice(-2);
    await page.click('[d2-booking-day="' + arrival + '"]');
    await page.click('[d2-booking-day="' + departure + '"]');

    await expect(page.locator('[d2-booking-status]')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('[d2-booking-status]')).toContainText('noc');
    expect(await page.evaluate(() => window.digi2.booking.stay())).toMatchObject({
      starts_at: arrival + 'T00:00:00',
      units_count: Math.round((Date.parse(departure) - Date.parse(arrival)) / 86400000),
    });

    // The amounts are the answer's, formatted by Intl in the config language.
    const expected = await page.evaluate(() => ({
      total: new Intl.NumberFormat('pl', { style: 'currency', currency: 'PLN' }).format(550),
      deposit: new Intl.NumberFormat('pl', { style: 'currency', currency: 'PLN' }).format(165),
    }));
    await expect(page.locator('[d2-booking-total]')).toHaveText(expected.total);
    await expect(page.locator('[d2-booking-deposit]')).toHaveText(expected.deposit);
    await expect(page.locator('[d2-booking-line]')).toHaveCount(2);
    await expect(page.locator('[d2-booking-line]').first()).toContainText('Pobyt');
  });
});

// ---- booking: the fallback look, the mark and the payment ------------------

// The page gives the module nothing but an empty <div d2-booking-widget>, so
// this block proves what the mini-DOM cannot: the drawn look really renders,
// its CSS variables really reach it, and submit really leaves for the checkout.
test.describe('booking: the drawn widget and the payment', () => {
  function openDays(page) {
    return page.evaluate(() => Array.prototype.filter
      .call(document.querySelectorAll('[d2-booking-day]'), (b) => !b.hasAttribute('aria-disabled'))
      .map((b) => b.getAttribute('d2-booking-day')));
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/sandbox/gate-booking-widget.html');
    await page.waitForFunction(() => !!(window.digi2 && window.digi2.booking), null, { timeout: 10000 });
    await page.waitForSelector('[d2-booking-widget-ready] [d2-booking-calendar-ready] [d2-booking-day]');
    // Late in the month there may be no room left for a stay; then the gate
    // works on the next one, which is always empty but for the stub's period.
    if ((await openDays(page)).length < 3) {
      await page.click('[d2-booking-calendar-next]');
      await page.waitForFunction(
        (seen) => document.querySelector('[d2-booking-calendar-month]').textContent !== seen,
        await page.textContent('[d2-booking-calendar-month]')
      );
    }
  });

  test('a submit never reaches the document, where webflow.js listens for it', async ({ page }) => {
    await page.evaluate(() => {
      window.reachedDocument = 0;
      document.addEventListener('submit', () => { window.reachedDocument += 1; });
      document.querySelector('[d2-booking-form]').requestSubmit();
    });
    await expect(page.locator('[d2-booking-status]')).not.toHaveText('');
    expect(await page.evaluate(() => window.reachedDocument)).toBe(0);
  });

  test('a form d2-forms refuses in the capture phase books nothing', async ({ page }) => {
    // The order the two modules loaded in must not matter, so the refusal is
    // added last, after booking has long been bound.
    await page.evaluate(() => {
      window.bookingAsked = 0;
      const realFetch = window.fetch;
      window.fetch = function (url, init) {
        if (init && init.method === 'POST') window.bookingAsked += 1;
        return realFetch.apply(this, arguments);
      };
      const form = document.querySelector('[d2-booking-form]');
      form.addEventListener('submit', (e) => { e.preventDefault(); e.stopImmediatePropagation(); }, true);
      form.requestSubmit();
    });
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.bookingAsked)).toBe(0);
    await expect(page.locator('[d2-booking-form]')).not.toHaveAttribute('d2-booking-busy', '');
  });

  test('an empty widget becomes a whole booking form', async ({ page }) => {
    // One of each, and every one of them drawn by the module.
    for (const part of ['[d2-booking-calendar]', '[d2-booking-status]', '[d2-booking-form]',
      '[d2-booking-breakdown]', '[d2-booking-total]', '[d2-booking-submit]', '[d2-booking-mark]']) {
      const found = page.locator(part);
      await expect(found).toHaveCount(1);
      await expect(found).toHaveAttribute('d2-booking-built', '');
    }
    await expect(page.locator('[d2-booking-field="name"]')).toBeVisible();
    await expect(page.locator('[d2-booking-field="email"]')).toBeVisible();
    await expect(page.locator('[d2-booking-field="adults"]')).toHaveValue('2');
    // The key of this stub does not ask for a phone number as required, but it
    // does ask for it — so the drawn form has one, and no field it refused.
    await expect(page.locator('[d2-booking-field="pets"]')).toHaveCount(1);

    // The pets sub-question explains itself: the threshold and the amount
    // come from the product's pet_fee, so the guest can answer it.
    const hint = page.locator('[d2-booking-hint="pets_over_threshold"]');
    await expect(hint).toHaveCount(1);
    await expect(hint).toContainText('10');
    await expect(hint).toContainText('50');

    const mark = page.locator('[d2-booking-mark]');
    await expect(mark).toHaveAttribute('href', 'https://digi2.agency');
    await expect(mark).toHaveAttribute('rel', 'noopener');
    await expect(mark).toContainText('digi2');
  });

  test('the drawn look is the stylesheet, and a CSS variable overrides it', async ({ page }) => {
    const button = page.locator('[d2-booking-submit]');
    // The default from the stylesheet — proof that it reached the page at all.
    await expect(button).toHaveCSS('background-color', 'rgb(31, 111, 92)');
    // And a page that only wants other colours sets one variable, with no
    // !important anywhere to fight.
    await page.evaluate(() => document.querySelector('[d2-booking-widget]')
      .style.setProperty('--d2-booking-accent', 'rgb(0, 0, 255)'));
    await expect(button).toHaveCSS('background-color', 'rgb(0, 0, 255)');
  });

  test('the drawn widget picks a stay, prices it and leaves for the checkout', async ({ page }) => {
    const open = await openDays(page);
    const [arrival, departure] = open.slice(-2);
    await page.click('[d2-booking-day="' + arrival + '"]');
    await page.click('[d2-booking-day="' + departure + '"]');

    const expected = await page.evaluate(() => new Intl.NumberFormat('pl', {
      style: 'currency', currency: 'PLN',
    }).format(550));
    await expect(page.locator('[d2-booking-total]')).toHaveText(expected);
    await expect(page.locator('[d2-booking-line]')).toHaveCount(2);

    await page.fill('[d2-booking-field="name"]', 'Anna Nowak');
    await page.fill('[d2-booking-field="email"]', 'anna@example.com');
    await page.click('[d2-booking-submit]');

    // The booking is created first and its id is what the checkout is asked
    // for, so landing on the return address proves both calls happened.
    await page.waitForURL(/payment=success/);
    await expect(page.locator('#wrocil')).toBeVisible();
  });
});

// ---- booking: the list of places ------------------------------------------

// Two lists on one page, because there are two ways to build one: the first
// carries a template the page built (classes, nesting and CSS all its own),
// the second is a bare div the module draws into. That is what the mini-DOM
// cannot show — that a clone really keeps the site's styling, that the drawn
// cards really get the stylesheet, and that "pokaż więcej" really appends.
test.describe('booking: the list of places', () => {
  const OWN = '#ze-wzorcem';
  const DRAWN = '#rysowana';

  test.beforeEach(async ({ page }) => {
    await page.goto('/sandbox/gate-booking-list.html');
    await page.waitForFunction(() => !!(window.digi2 && window.digi2.booking), null, { timeout: 10000 });
    await page.waitForSelector(OWN + '[d2-booking-results-state="ready"]');
    await page.waitForSelector(DRAWN + '[d2-booking-results-state="ready"]');
  });

  test("the page's own template becomes the cards, with nothing left of itself", async ({ page }) => {
    const cards = page.locator(OWN + ' [d2-booking-item]');
    await expect(cards).toHaveCount(3);
    // The pattern is gone from the page, so no empty card stands above the
    // real ones, and every clone kept the class the Designer gave it.
    await expect(page.locator('[d2-booking-template]')).toHaveCount(0);
    await expect(cards.first()).toHaveClass('karta');
    await expect(cards.first().locator('[d2-booking-bind="name"]')).toHaveText('Apartament 0');
    // The amount is the entry's own, formatted like every other amount.
    const price = await page.evaluate(() => new Intl.NumberFormat('pl', {
      style: 'currency', currency: 'PLN',
    }).format(250));
    await expect(cards.first().locator('[d2-booking-bind="price"]')).toHaveText(price);
    // The shape the page asked for, with the slug in it.
    await expect(cards.first()).toHaveAttribute('href', '/apartamenty/apartament-0');
    await expect(page.locator(OWN + ' [d2-booking-count]')).toHaveText('5');
    // Something was found, so nothing says the offer is empty.
    await expect(page.locator(OWN + ' [d2-booking-results-empty]')).toBeHidden();

    // The stub's third place has no picture and the fourth no city line: an
    // empty marked slot, never the word "null".
    const noImage = cards.nth(2).locator('[d2-booking-bind="image"]');
    await expect(noImage).toHaveAttribute('d2-booking-empty', '');
    expect(await noImage.getAttribute('src')).toBe(null);
  });

  test('"pokaż więcej" appends the next page and then goes', async ({ page }) => {
    const cards = page.locator(OWN + ' [d2-booking-item]');
    const more = page.locator(OWN + ' [d2-booking-more]');
    await expect(more).toBeVisible();

    await more.click();
    await expect(cards).toHaveCount(5);
    // Appended, not re-rendered: the first page is still the first page.
    await expect(cards.first().locator('[d2-booking-bind="name"]')).toHaveText('Apartament 0');
    await expect(cards.nth(4).locator('[d2-booking-bind="name"]')).toHaveText('Apartament 4');
    // The answer said there is no next page, so the button is not there to be
    // clicked a third time.
    await expect(more).toBeHidden();
    expect(await page.evaluate(() => window.__d2Calls.filter((c) => /\/products\?/.test(c)).length))
      .toBe(3);
  });

  test('a bare list gets the drawn cards, and a CSS variable repaints them', async ({ page }) => {
    const cards = page.locator(DRAWN + ' [d2-booking-item]');
    await expect(cards).toHaveCount(2);
    await expect(page.locator(DRAWN)).toHaveAttribute('d2-booking-results-drawn', '');
    await expect(cards.first()).toHaveAttribute('href', '?apartament=apartament-0');
    // The stub's picture is a data: pixel, which the module accepts exactly
    // like an https address — nothing in this gate leaves localhost.
    expect(await cards.first().locator('[d2-booking-bind="image"]').getAttribute('src'))
      .toMatch(/^data:image\/gif;base64,/);

    // The default from the stylesheet — proof it reached the page at all.
    await expect(cards.first()).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await page.evaluate(() => document.querySelector('#rysowana')
      .style.setProperty('--d2-booking-bg', 'rgb(0, 0, 255)'));
    await expect(cards.first()).toHaveCSS('background-color', 'rgb(0, 0, 255)');

    // And the sheet never reaches the list the Designer built: that card keeps
    // the page's own border radius.
    await expect(page.locator(OWN + ' [d2-booking-item]').first())
      .toHaveCSS('border-top-left-radius', '10px');
  });

  test('a search narrows the list, resets the paging and lands in the address', async ({ page }) => {
    const cards = page.locator(OWN + ' [d2-booking-item]');
    const more = page.locator(OWN + ' [d2-booking-more]');
    // The guest is already reading the second page when they search.
    await more.click();
    await expect(cards).toHaveCount(5);

    await page.locator('#szukaj [d2-booking-search-field="check_in"]').fill('2027-05-01');
    await page.locator('#szukaj [d2-booking-search-field="check_out"]').fill('2027-05-04');
    await page.locator('#szukaj [d2-booking-search-field="location"]').selectOption('Wrocław');
    await page.locator('#szukaj button[type="submit"]').click();

    // Three places are in that city, and the list starts again at the first
    // page instead of appending them under the five it had.
    await expect(cards).toHaveCount(3);
    await expect(cards.first().locator('[d2-booking-bind="name"]')).toHaveText('Apartament 2');
    await expect(page.locator(OWN + ' [d2-booking-count]')).toHaveText('3');
    await expect(more).toBeHidden();
    // The page never reloaded, and the address can be shared.
    await expect(page).toHaveURL(/\?check_in=2027-05-01&check_out=2027-05-04&adults=2&location=Wroc/);
    const asked = await page.evaluate(() => window.__d2Calls
      .filter((c) => /\/products\?/.test(c)).pop());
    expect(asked).toMatch(/offset=0/);
    expect(asked).toMatch(/guests=2/);

    // The list with its own city pinned stayed where the page put it.
    await expect(page.locator(DRAWN + ' [d2-booking-item]')).toHaveCount(2);
    await expect(page.locator(DRAWN + ' [d2-booking-item]').first()
      .locator('[d2-booking-bind="city_line"]')).toContainText('Kraków');
  });

  test('a link with a search in it opens its own result', async ({ page }) => {
    await page.goto('/sandbox/gate-booking-list.html?location=Krak%C3%B3w&adults=2');
    await page.waitForSelector(OWN + '[d2-booking-results-state="ready"]');
    await expect(page.locator(OWN + ' [d2-booking-item]')).toHaveCount(2);
    // And the form shows the search the link carries, not an empty one.
    await expect(page.locator('#szukaj [d2-booking-search-field="location"]'))
      .toHaveValue('Kraków');
    await expect(page.locator('#szukaj [d2-booking-search-field="adults"]')).toHaveValue('2');
  });

  // The one thing only a real browser shows: a <select> refuses a value no
  // <option> of its own carries — it goes to selectedIndex -1 and reads back
  // empty. A link naming a city this page does not offer must still open the
  // result it promised, and the select must say which city that is.
  // MUTACJA: drop the option the module adds for a value the select cannot
  // show (showFieldValue in booking.js) — the select reads back empty, the
  // merge takes that empty answer over the city in the link, and the list
  // opens on the whole offer while the address still names that city.
  test('a link naming a city the select does not offer still opens its own result',
    async ({ page }) => {
      await page.goto('/sandbox/gate-booking-list.html?location=Gda%C5%84sk&adults=2');
      // An answered first page, whether it found anything or not: a city the
      // page does not offer is a legitimate empty result.
      await page.waitForFunction((sel) => {
        const state = document.querySelector(sel).getAttribute('d2-booking-results-state');
        return state === 'ready' || state === 'empty';
      }, OWN, { timeout: 10000 });
      await expect(page.locator(OWN)).toHaveAttribute('d2-booking-results-state', 'empty');
      const select = page.locator('#szukaj [d2-booking-search-field="location"]');

      // The city the link asked for went out, and the page offers nothing
      // there: an empty result, not somebody else's city.
      const asked = await page.evaluate(() => window.__d2Calls
        .filter((c) => /\/products\?/.test(c))[0]);
      expect(asked).toMatch(/location=Gda/);
      await expect(page.locator(OWN + ' [d2-booking-item]')).toHaveCount(0);
      await expect(page.locator(OWN + ' [d2-booking-results-empty]')).toBeVisible();
      await expect(page.locator(OWN + ' [d2-booking-count]')).toHaveText('0');

      // The select shows that city instead of standing blank over the result.
      await expect(select).toHaveValue('Gdańsk');
      expect(await select.evaluate((el) => el.selectedIndex)).toBeGreaterThan(-1);
      expect(await select.evaluate((el) => el.options[el.selectedIndex].textContent))
        .toBe('Gdańsk');
      // The address still says what the guest is looking at.
      await expect(page).toHaveURL(/location=Gda%C5%84sk/);

      // The list with its own city pinned is the page's decision and not the
      // link's: it stays on the city the page pinned.
      await expect(page.locator(DRAWN + ' [d2-booking-item]')).toHaveCount(2);
    });
});

// ---- booking: the return page and the manage page -------------------------

// Both guest blocks on one page, as a real client's manage page carries them.
// The stub REQUIRES the X-Booking-Token header on the guest routes and answers
// the contract's 404 without it, so this block proves the real path of the
// token — and that it never lands in the address bar of a real browser, which
// is the one thing the mini-DOM cannot show.
test.describe('booking: the return and the manage page', () => {
  const BOOKING = '3f2a9c1e-5b7d-4e60-9a11-2c4d6e8f0a12';
  const TOKEN = 'manage.1800000000.przykladowy-podpis';

  async function open(page, query, hash) {
    await page.goto('/sandbox/gate-booking-manage.html' + (query || '') + (hash || ''));
    await page.waitForFunction(() => !!(window.digi2 && window.digi2.booking), null, { timeout: 10000 });
  }

  test('the manage link shows the booking and leaves no token behind', async ({ page }) => {
    await open(page, '?booking=' + BOOKING, '#token=' + TOKEN + '&action=details');
    await page.waitForSelector('[d2-booking-manage-state="ready"]');

    // The token reached the backend in the header, and only there.
    expect(await page.evaluate(() => window.__d2Token)).toBe(TOKEN);
    expect(await page.evaluate(() => window.__d2Calls.join('\n'))).not.toContain(TOKEN);
    // And the address bar is clean, with no history entry holding it either.
    expect(page.url()).not.toContain('token');
    expect(await page.evaluate(() => location.hash)).toBe('');
    // Nowhere in the document either — not in an attribute, not in a text node.
    expect(await page.evaluate(() => document.body.innerHTML)).not.toContain(TOKEN);

    const manage = page.locator('[d2-booking-manage]');
    await expect(manage).toContainText('Apartament Rynek 1');
    await expect(manage).toContainText('+48 500 600 700');
    await expect(manage).toHaveAttribute('d2-booking-manage-status', 'confirmed');
    // The balance is 700,00 zł in the answer's own currency, through Intl.
    const owed = await page.evaluate(() => new Intl.NumberFormat('pl', {
      style: 'currency', currency: 'PLN',
    }).format(700));
    await expect(page.locator('[d2-booking-manage-field="balance"]')).toContainText(owed);
    // A manage link may ask, but it may not pay the balance (contract).
    await expect(page.locator('[d2-booking-manage-action="refund"]')).toHaveCount(1);
    await expect(page.locator('[d2-booking-manage-action="date_change"]')).toHaveCount(1);
    await expect(page.locator('[d2-booking-manage-action="balance"]')).toHaveCount(0);
    // The request the booking already has, with the owner's own words.
    await expect(page.locator('[d2-booking-manage-request]')).toHaveCount(1);
    await expect(page.locator('[d2-booking-manage-request]'))
      .toContainText('Zwrot jest możliwy do 14 dni przed przyjazdem.');
  });

  test('a request is sent with the token and closes its own kind', async ({ page }) => {
    await open(page, '?booking=' + BOOKING, '#token=' + TOKEN + '&action=details');
    await page.waitForSelector('[d2-booking-manage-state="ready"]');

    await page.fill('[d2-booking-manage-input="customer_note"]', 'Prosimy o zwrot');
    await page.click('[d2-booking-manage-action="refund"]');

    await expect(page.locator('[d2-booking-manage-action="refund"]')).toHaveCount(0);
    await expect(page.locator('[d2-booking-manage-message]')).toContainText('Prośba');
    const sent = await page.evaluate(() => window.__d2Calls.filter((c) => c.indexOf('/requests') >= 0));
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatch(/^POST /);
    // The new request joined the list the guest reads.
    await expect(page.locator('[d2-booking-manage-request]')).toHaveCount(2);
  });

  test('a balance link pays the balance and comes back to the same page', async ({ page }) => {
    await open(page, '?booking=' + BOOKING,
      '#token=balance.1800000000.przykladowy-podpis&action=balance');
    await page.waitForSelector('[d2-booking-manage-state="ready"]');

    // A balance link may pay, and may not ask for anything else (contract).
    await expect(page.locator('[d2-booking-manage-action="balance"]')).toHaveCount(1);
    await expect(page.locator('[d2-booking-manage-action="refund"]')).toHaveCount(0);
    await page.click('[d2-booking-manage-action="balance"]');

    // Back from the "checkout" with no token: the manage block has nothing to
    // say and the return block is the one that answers.
    await page.waitForURL(/payment=balance_success/);
    await expect(page.locator('[d2-booking-return-state="balance_paid"]')).toHaveCount(1);
    await expect(page.locator('[d2-booking-manage]'))
      .toHaveAttribute('d2-booking-manage-state', 'returned');
    await expect(page.locator('[d2-booking-manage-message]')).toHaveCount(0);
  });

  test('the return page reads the status and sends an expired hold on', async ({ page }) => {
    await open(page, '?booking=' + BOOKING + '&payment=success');
    await expect(page.locator('[d2-booking-return-state="confirmed"]')).toHaveCount(1);
    await expect(page.locator('[d2-booking-return-message]')).toContainText('Rezerwacja');
    await expect(page.locator('[d2-booking-return-new]')).toHaveCount(0);

    await open(page, '?booking=' + BOOKING + '&payment=success&stan=expired');
    await expect(page.locator('[d2-booking-return-state="expired"]')).toHaveCount(1);
    const again = page.locator('[d2-booking-return-new]');
    await expect(again).toHaveAttribute('href', 'https://client.example.org');
    await expect(again).toContainText('termin');
  });
});
