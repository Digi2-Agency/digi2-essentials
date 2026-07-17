# digi2 Essentials

Component library for Webflow. One script tag, modular architecture, on-demand loading.

**Contents:**
[Quick Start](#quick-start) ·
[Modules](#available-modules) ·
[Per-page modules](#per-page-modules) ·
[Responsive attributes](#responsive-attributes) ·
[Google / Consent](#google--consent) ·
[A/B Tests](#ab-tests) ·
[Popups](#popups) ·
[Cookies](#cookies) ·
[Forms](#forms) ·
[Tabs & Accordions](#tabs--accordions) ·
[Sliders](#sliders) ·
[Scroll Animations](#scroll-animations) ·
[Toasts](#toasts) ·
[Smooth Scroll](#smooth-scroll) ·
[Lazy Loading](#lazy-loading) ·
[Countdown](#countdown) ·
[CMS Filtering](#cms-filtering) ·
[CMS List](#cms-list-sort--filter--load-more) ·
[Format](#format) ·
[Copy](#copy-to-clipboard) ·
[Events](#events) ·
[Debug](#debug-mode) ·
[Attributes cheat-sheet](#data-attributes)

---

## Quick Start

```html
<script
  src="https://cdn.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@latest/dist/digi2-loader.min.js"
  d2-gtm="GTM-XXXXXXX"
  d2-popups
  d2-cookies
  d2-forms
  d2-tabs
  d2-sliders
  d2-animate
  d2-toasts
  d2-scroll
  d2-lazy
  d2-countdown
  d2-filter
  d2-format
  d2-copy
></script>
```

Only the modules you declare get loaded. Loader: **5.9 KB** min / **2.4 KB** gzipped.

> **Versioning:** `@latest` is cached by jsDelivr for up to ~12–24 h. During active development pin a commit hash instead (`…digi2-essentials@<sha>/dist/…`) and bump it on deploy — changes go live instantly and are immutable.

---

## Available Modules

| Attribute | Module | Min Size | Description |
|---|---|---|---|
| `d2-gtm="ID"` | google | 2.4 KB | Consent Mode V2 + GTM + consent manager |
| `d2-ab-tests="configName"` | ab-tests | 6.3 KB | A/B redirects and link rewriting from a sitemap config |
| `d2-popups` | popups | 23.3 KB | 22 animations, triggers, exit intent |
| `d2-cookies` | cookies | 1.2 KB | get/set/remove/getAll |
| `d2-forms` | forms | 18.9 KB | UTM tracking + validation + password toggle + consent master |
| `d2-tabs` | tabs | 5.8 KB | Tabs & accordions with animations |
| `d2-sliders` | sliders | 7.5 KB | Carousel with touch/drag, autoplay |
| `d2-animate` | animate | 5.2 KB | 22 scroll animation presets + stagger |
| `d2-toasts` | toasts | 4.7 KB | 5 types, 6 positions, auto-dismiss |
| `d2-scroll` | scroll | 2.4 KB | Smooth scroll + scroll spy |
| `d2-lazy` | lazy | 2.5 KB | Lazy images/video/iframes + blur-up |
| `d2-countdown` | countdown | 3.4 KB | Timer with pause/resume/reset |
| `d2-filter` | filter | 3.5 KB | CMS filtering with animations |
| `d2-format` | format | 2.7 KB | Number and price formatting |
| `d2-cms` | cms | 38.5 KB | CMS list: sort, filter, scroll/load-more (DOM-based) |
| `d2-copy` | copy | 2.0 KB | Clipboard copy with toast feedback |
| `d2-dropdowns` | dropdowns | 3.2 KB | Custom dropdowns — own open/close, close-on-select |
| `d2-interactions` | interactions | 14.3 KB | Interaction helpers |

Total (all modules): **167.6 KB min** / **49.7 KB** gzipped.

---

## Per-page modules

Keep the loader in the **global site head** (no flags) and request modules **per page** so each page only fetches what it uses. Drop a declaration element in the page's custom code — the loader scans on DOM-ready and loads exactly those modules.

```html
<!-- Site Settings → Custom Code → Head (once, every page) -->
<script src="https://cdn.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@latest/dist/digi2-loader.min.js"></script>

<!-- Page Settings → Custom Code (per page) -->
<digi2-module d2-forms d2-popups></digi2-module>

<!-- Or a space/comma list on any element -->
<div d2-modules="forms popups cookies"></div>
```

- Flags on the loader tag and every `<digi2-module>` on the page are **merged and de-duplicated**.
- `d2-gtm="GTM-XXX"` and `d2-ab-tests="configName"` work on the element too.
- Calling a module API auto-loads it on demand; use `<digi2-module>` for declarative features (`d2-show-popup`, consent masters, auto-format) that need the module present without a JS call.
- `digi2.modules.require('forms')` loads a module programmatically (returns a Promise).

---

## Responsive attributes

Any value-bearing `d2-*` attribute supports per-breakpoint overrides:

```html
<!-- "left" by default; "up" once viewport is <= 911px -->
<div d2-animation-direction="left;up@911"></div>

<!-- 12px default; 24px <=1200; 40px <=600 -->
<div d2-animation-distance="12px;24px@1200;40px@600"></div>
```

Format: entries separated by `;`. An entry without `@` is the default; `value@<maxWidthPx>` activates when `window.innerWidth <= maxWidthPx`. The smallest matching breakpoint wins.

The loader fires `digi2.on('responsive:change', fn)` only when the active bucket flips (not every resize pixel) — modules like `interactions` re-apply their visible state automatically.

JS API for module authors:

```js
digi2.parseResponsive(raw)         // → { default, bps: [{ max, value }] }
digi2.resolveResponsive(parsed, w) // → string  (uses innerWidth if w omitted)
digi2.attr(el, name, fallback)     // → resolved string for that el+attr
```

---

## Google / Consent

Configured via `d2-gtm="GTM-XXXXXXX"` on the loader tag. Auto-loads the google module.

Handles: Consent Mode V2 defaults (all denied), localStorage restore, GTM injection, noscript iframe.

### Consent Categories

| Category | Description |
|---|---|
| `ad_personalization` | Google Ads personalization |
| `ad_storage` | Google Ads cookies |
| `ad_user_data` | Google Ads conversion data |
| `analytics_storage` | Google Analytics cookies |
| `personalization_storage` | Recommendations |
| `functionality_storage` | Language, preferences |
| `security_storage` | Auth & security |

### API

```js
digi2.google.consent.get()
digi2.google.consent.grant('analytics_storage')
digi2.google.consent.deny('ad_storage')
digi2.google.consent.update({ analytics_storage: 'granted' })
digi2.google.consent.grantAll()
digi2.google.consent.denyAll()
digi2.google.consent.reset()
digi2.google.consent.categories()
digi2.google.dataLayerPush({ event: 'custom' })
digi2.google.getGtmId()
```

---

## A/B Tests

Runtime module for `d2-ab-tests="configName"` on the loader tag. The value points to a global object on `window` that is the test map.

Use this when Webflow Optimize is too expensive or too limited, and you want a lightweight A/B runtime that keeps each visitor on one stable variant.

### Setup

```html
<script>
window.sitemap = {
  pricing: {
    base: '/pricing',
    variants: {
      A: '/pricing-a',
      B: '/pricing-b'
    }
  }
}
</script>

<script
  src="https://cdn.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@latest/dist/digi2-loader.min.js"
  d2-gtm="GTM-XXXXXXX"
  d2-ab-tests="sitemap"
></script>
```

### Behavior

For each test, the module:

1. Reads the config object from `window[configName]`.
2. Uses that object as the test map.
3. Checks whether the current URL matches a test `base` URL or one of its variant URLs.
4. Assigns a visitor to one variant once.
5. Saves the assignment in `localStorage` as `d2ab:<testName>`.
6. Redirects from the base URL to the assigned variant URL.
7. Rewrites links on the page that point to the base URL or variant URLs so they keep the visitor on the assigned variant.
8. Watches later DOM changes with `MutationObserver` and rewrites newly added or changed links too.

Example storage entry:

```js
localStorage['d2ab:pricing'] = 'B'
```

The stored variant is stable. Weight changes do not affect visitors who already have an assignment. To reset an experiment, use a new test name, for example `pricing_v2`.

If the stored variant no longer exists in the config, the module assigns a new valid variant.

### Weights

`weights` is optional. If it is missing, variants are split evenly.

```js
window.sitemap = {
  pricing: {
    base: '/pricing',
    variants: {
      A: '/pricing-a',
      B: '/pricing-b'
    },
    // no weights => A 50%, B 50%
  }
}
```

For more than two variants, the split is also even:

```js
variants: {
  A: '/pricing-a',
  B: '/pricing-b',
  C: '/pricing-c'
}
// no weights => A/B/C split evenly
```

To override the split:

```js
window.sitemap = {
  pricing: {
    base: '/pricing',
    variants: {
      A: '/pricing-a',
      B: '/pricing-b'
    },
    weights: {
      A: 80,
      B: 20
    }
  }
}
```

Weights are used only when assigning a new visitor.

### Link Rewriting

By default, the module automatically rewrites all matching links:

```html
<a href="/pricing">See pricing</a>
<a href="/pricing-a">Pricing A</a>
<a href="/pricing-b">Pricing B</a>
```

If the visitor is assigned to `B`, all matching links become:

```html
<a href="/pricing-b">See pricing</a>
```

The first scan runs on module init. After that, a `MutationObserver` watches `document.body` for added nodes and changes to `href`, `d2-ab-link`, or `d2-ab-ignore`, so Webflow-rendered CMS lists, nav changes, or delayed embeds are handled automatically.

Use `d2-ab-ignore` to opt out:

```html
<a href="/pricing" d2-ab-ignore>Open base pricing page</a>
```

Use `d2-ab-link="<testName>"` when a link should be explicitly tied to a test:

```html
<a href="/pricing" d2-ab-link="pricing">See pricing</a>
```

### Redirect Rules

The default redirect rule is:

- when the visitor opens the base URL, redirect to the assigned variant URL;
- when the visitor opens an assigned variant URL directly, keep them there;
- when the visitor opens a different variant URL directly, do not force a redirect unless future config explicitly enables that behavior.

This keeps shared QA links and direct variant previews usable.

### Google Tag Manager

When `d2-gtm="GTM-XXXXXXX"` is present, the A/B module pushes assignment and click events through the existing Google module:

```js
digi2.google.dataLayerPush({
  event: 'digi2_ab_assigned',
  ab_test: 'pricing',
  ab_variant: 'B'
})
```

If the Google module is not available, it falls back to:

```js
window.dataLayer = window.dataLayer || []
window.dataLayer.push(...)
```

Recommended GTM events:

```js
{
  event: 'digi2_ab_assigned',
  ab_test: 'pricing',
  ab_variant: 'B'
}
```

```js
{
  event: 'digi2_ab_click',
  ab_test: 'pricing',
  ab_variant: 'B',
  ab_target_url: '/pricing-b'
}
```

### API

```js
digi2.abTests.get('pricing')       // current assignment for one test
digi2.abTests.assign('pricing')    // assign or return existing variant
digi2.abTests.rewriteLinks()       // re-apply link rewriting after DOM changes
digi2.abTests.list()               // known tests from the active config
digi2.abTests.destroy()            // disconnect the MutationObserver
```

---

## Popups

```js
digi2.popups.create('newsletter', {
  popupSelector: '#nl-popup',
  animation: 'slide-up',
  closeTriggerSelector: '.popup-close',
  cookieName: 'nl_seen',
  cookieDurationDays: 7,
})
```

### Options

| Option | Default | Description |
|---|---|---|
| `popupSelector` | `'.popup__overlay'` | CSS selector for the popup |
| `openTriggerSelector` | `null` | CSS selector — clicks open |
| `closeTriggerSelector` | `null` | CSS selector — clicks close |
| `dataTagTrigger` | `true` | Listen for `d2-show-popup` |
| `animation` | `'fade'` | See animations table |
| `animationDuration` | `0.4` | Seconds |
| `openOnLoad` | `false` | Show on page load |
| `openAfterDelay` | `null` | Seconds |
| `openOnExitIntent` | `false` | Mouse leave / mobile scroll |
| `openAfterPageViews` | `null` | Show after N views |
| `openOnOutsideClick` | `null` | Selector — click outside opens |
| `openOnElementMouseLeave` | `null` | Selector — mouseleave opens |
| `openOnElementHover` | `null` | Selector — mouseenter opens |
| `openOnTabBlur` | `false` | Open on tab switch |
| `openAfterScrollPercent` | `null` | Open at N% scroll depth |
| `openAfterScrollPastElement` | `null` | Selector — open when in viewport |
| `openAfterIdle` | `null` | Seconds of inactivity |
| `openOnRageClick` | `null` | `true` or N — N rapid clicks |
| `rageClickWindow` | `1000` | ms window for rage-click |
| `openOnSelectAbandon` | `null` | Form selector — fires on `<select>` interaction without change + mouseleave |
| `openOnScrollSpeed` | `null` | px/sec or `{ speed, direction }` — fast-scroll trigger |
| `interceptLinks` | `false` | `true` · selector · `{ device, selector }` — intercept link clicks, navigate on close |
| `schedule` | `null` | `{ from, to }` or `'YYYY-MM-DD HH:MM, YYYY-MM-DD HH:MM'` — only show within this window. See [Scheduling](#scheduling) |
| `cookieName` | `'popup_clicked'` | Dismissal cookie. `null` disables — re-shows every page load |
| `cookieDurationDays` | `1` | Cookie lifespan |
| `excludeUrls` | `[]` | URL fragments to skip — see [URL filters](#url-filters) |
| `containsUrls` | `['/']` | URL fragments required (whitelist) — see [URL filters](#url-filters) |
| `onOpen` / `onClose` | `null` | Callbacks |

### 22 Animations

| Basic | Slide (subtle) | Slide (full) | 3D | Physics | Transform |
|---|---|---|---|---|---|
| `none` | `slide-up` | `slide-full-up` | `flip` | `bounce` | `unfold` |
| `fade` | `slide-down` | `slide-full-down` | `flip-y` | `elastic` | `reveal` |
| `zoom` | `slide-left` | `slide-full-left` | `swing` | `drop` | |
| `zoom-in` | `slide-right` | `slide-full-right` | `rotate` | | |
| `blur` | | | | | |
| `zoom-blur` | | | | | |

### Triggers

| Method | Code |
|---|---|
| Data attribute | `<button d2-show-popup="name">` |
| Data attribute + delay | `<button d2-show-popup="name" d2-show-popup-delay="50">` — opens 50s after click (`data-d2-` prefix works too) |
| Programmatic | `digi2.popups.show('name')` / `.close('name')` |
| Open selector | `openTriggerSelector: '.btn'` |
| Close selector | `closeTriggerSelector: '.close'` |
| On load | `openOnLoad: true` |
| After delay | `openAfterDelay: 5` |
| Exit intent | `openOnExitIntent: true` |
| Page views | `openAfterPageViews: 3` |
| Outside click | `openOnOutsideClick: '.card'` |
| Element mouseleave | `openOnElementMouseLeave: '#form'` |
| Element hover | `openOnElementHover: '.target'` |
| Tab blur | `openOnTabBlur: true` |
| Scroll % | `openAfterScrollPercent: 50` |
| Scroll past element | `openAfterScrollPastElement: '#footer'` |
| Idle | `openAfterIdle: 30` |
| Rage click | `openOnRageClick: 4` |
| Select abandon | `openOnSelectAbandon: '#my-form'` |
| Fast scroll | `openOnScrollSpeed: 2500` or `{ speed: 2500, direction: 'up' }` |
| Link intercept | `interceptLinks: true` or `{ device: 'mobile' }` (navigates after close) |

### API

```js
digi2.popups.create('name', options)
digi2.popups.show('name')
digi2.popups.close('name')            // sets cookie
digi2.popups.close('name', false)     // no cookie
digi2.popups.get('name')
digi2.popups.destroy('name')
digi2.popups.list()
```

### Scheduling

Limit a popup to a date/time window. A schedule is a **gate**, not a trigger — every trigger you set still runs, but the popup will not appear outside the window. Parsed in the **visitor's local timezone**.

```js
// Object form (recommended) — pass to create()
digi2.popups.create('promo', {
  popupSelector: '#promo',
  closeTriggerSelector: '.popup-close',
  schedule: { from: '2026-07-01 18:00', to: '2026-07-15 23:59' },
})

// String form — same value the HTML attribute uses
schedule: '2026-07-01 18:00, 2026-07-15 23:59'

// Open-ended — drop either bound
schedule: { from: '2026-07-01 18:00' }   // from then on
schedule: { to:   '2026-07-15 23:59' }   // until then
```

Or set it declaratively on the popup element (no embed value needed):

```html
<div class="popup__overlay" d2-popup-schedule="2026-07-01 18:00, 2026-07-15 23:59">…</div>
```

| Form | Example | Notes |
|---|---|---|
| Full window | `2026-07-01 18:00, 2026-07-15 23:59` | `from, to` separated by a comma |
| Date + time | `YYYY-MM-DD HH:MM` | Seconds optional (`:SS`) |
| Date only | `2026-07-01` | Start → `00:00:00`, end → `23:59:59` of that day |
| Only start | `2026-07-01 18:00,` | Open-ended — from then on |
| Only end | `,2026-07-15 23:59` | Open-ended — until then |

- Either bound may be blank/omitted for an open-ended window.
- `data-d2-popup-schedule` works as a fallback if you prefer a `data-` prefix.
- Invalid value → console warning, that bound is ignored (never blocks forever).

### URL filters

Skip a popup on chosen subpages — straight from the Designer, on the popup element (pipe-separated URL fragments):

```html
<!-- never on these subpages -->
<div class="popup__overlay" d2-popup-exclude="/wyszukiwarka|/kontakt">…</div>

<!-- ONLY on these subpages (whitelist) -->
<div class="popup__overlay" d2-popup-include="/oferta|/produkty">…</div>
```

- Fragments match against `location.href` (`/wyszukiwarka` also blocks `/wyszukiwarka?floor=3`). A full `https://…` value requires an exact match.
- The block is **hard**: on an excluded page no trigger fires — not auto-triggers, not `d2-show-popup` clicks, not even `digi2.popups.show()`.
- `data-d2-popup-exclude` / `data-d2-popup-include` work too.
- JS equivalents: `excludeUrls: […]` (merges with the attribute) and `containsUrls: […]` (the attribute replaces the default match-everything).

### Webflow setup

A popup is two halves: the **structure + attributes** you build in the Designer, and one small **init embed** that registers it.

**In the Designer:**

| Element | Add | Role |
|---|---|---|
| Popup wrapper | Class `popup__overlay` | The element shown/hidden (`popupSelector`) |
| Popup wrapper | Attr `d2-popup-schedule="…"` | Optional display window |
| X button | Class `popup-close` | Click closes (`closeTriggerSelector`) |
| Trigger button | Attr `d2-show-popup="promo"` | Click opens the popup named `promo` |

**Then register it once** (Page Settings → Before `</body>`):

```html
<script>
  digi2.onReady(function () {
    digi2.popups.create('promo', {
      animation: 'slide-up',
      closeTriggerSelector: '.popup-close',
      // schedule: { from: '2026-07-01 18:00', to: '2026-07-15 23:59' },
    });
  });
</script>
```

> The `create('promo')` name must match `d2-show-popup="promo"`. `popupSelector` finds the element; the name wires the trigger — two separate links. A popup with no matching `create()` call never opens.

---

## Dropdowns

Own the open/close of a custom dropdown instead of relying on Webflow's built-in interaction (which can leave the menu open after a selection). Works on a plain structure **and** on a Webflow Dropdown element — just put `d2-dropdown` on the wrapper.

```html
<div class="w-dropdown" d2-dropdown>
  <div class="w-dropdown-toggle" d2-dropdown-toggle>
    <div d2-tab-label="view">Wyświetl według</div>
  </div>
  <nav class="w-dropdown-list" d2-dropdown-list>
    <a d2-tab-trigger="view:list" class="w-dropdown-link">Lista</a>
    <a d2-tab-trigger="view:grid" class="w-dropdown-link">Siatka</a>
  </nav>
</div>
```

- **Closes on select** by default — the option's own handler still runs (tab switch, filter, link), the module only collapses the menu. Pairs perfectly with `d2-tab-trigger`, `d2-cms-sort`, `d2-cms-filter` options.
- Also closes on **outside click** and **Esc**.
- Parts: `d2-dropdown-toggle` / `d2-dropdown-list` (fall back to `.w-dropdown-toggle` / `.w-dropdown-list`, so an existing Webflow dropdown works with just `d2-dropdown` on the wrapper).
- State for CSS: wrapper gets `[d2-dropdown-open]` + `.is-open`; on a Webflow dropdown the native `w--open` classes are synced too.

| Attribute | On | Purpose |
|---|---|---|
| `d2-dropdown` | wrapper | Enable the module on this dropdown |
| `d2-dropdown-toggle` | toggle | The click target (optional — defaults to `.w-dropdown-toggle`) |
| `d2-dropdown-list` | menu | The panel (optional — defaults to `.w-dropdown-list`) |
| `d2-dropdown-hover` | wrapper | Open on hover (also honors Webflow's `data-hover="true"`) |
| `d2-dropdown-keep-open` | wrapper | Don't auto-close after selecting an item |
| `d2-dropdown-item` | item | Extra "counts as a selectable option" marker (a/button/`.w-dropdown-link` already count) |

```js
digi2.dropdowns.open('#my-dropdown')   // or an element
digi2.dropdowns.close('#my-dropdown')
digi2.dropdowns.toggle('#my-dropdown')
digi2.dropdowns.closeAll()
```

---

## Cookies

```js
digi2.cookies.set('theme', 'dark', { days: 30 })
digi2.cookies.get('theme')        // 'dark'
digi2.cookies.has('theme')        // true
digi2.cookies.getAll()            // { theme: 'dark', ... }
digi2.cookies.remove('theme')
```

### Set Options

| Option | Default | Description |
|---|---|---|
| `days` | — | Expiration (omit for session) |
| `path` | `'/'` | Cookie path |
| `domain` | — | Cookie domain |
| `secure` | `false` | HTTPS only |
| `sameSite` | `'Lax'` | Lax / Strict / None |

---

## Forms

### Setup

```html
<div d2-form="contact">
  <form>
    <input type="text" name="NAME" />
    <input type="email" name="EMAIL" />
    <input type="tel" name="PHONE" />
    <textarea name="MESSAGE"></textarea>
    <label>
      <input type="checkbox" d2-consent-master="contact" />
      Select all consents
    </label>
    <input type="checkbox" name="CONSENT_GDPR" d2-consent-item="contact" />
    <input type="checkbox" name="CONSENT_EMAIL" d2-consent-item="contact" />
    <input type="checkbox" name="CONSENT_PHONE" d2-consent-item="contact" />
    <button type="submit">Send</button>
  </form>
</div>
```

```js
digi2.forms.create('contact', {
  ipTracking: true,
  inputOnError: { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.2)' },
  inputOnValid: { borderColor: '', boxShadow: '' },
})
```

### Options

| Option | Default | Description |
|---|---|---|
| `formSelector` | `null` | CSS selector (alt to d2-form wrapper) |
| `utmTracking` | `true` | Capture UTM params |
| `clickIdTracking` | `true` | gclid, fbclid, msclkid |
| `gaClientId` | `true` | GA4 client ID |
| `ipTracking` | `false` | Fetch visitor IP |
| `pageMeta` | `true` | page_url, page_title, page_referrer |
| `autoValidation` | `true` | Auto-detect standard field names |
| `validation` | `null` | Override/extend rules |
| `errorDisplay` | `'inline'` | `'inline'` or `'summary'` |
| `inputOnError` | `null` | CSS styles on invalid inputs |
| `inputOnValid` | `null` | CSS styles when valid |
| `validateOn` | `'both'` | `'blur'` / `'submit'` / `'both'` |
| `onSubmit` | `null` | Callback (only if valid) |

### Auto-Detected Fields

| Input `name` | Default Rules |
|---|---|
| `NAME` | required, minLength: 2, letters |
| `EMAIL` | required, email |
| `PHONE` | required, phone |
| `MESSAGE` | required, minLength: 10 |
| `CONSENT_GDPR` | required (checkbox) |
| `CONSENT_EMAIL` | required (checkbox) |
| `CONSENT_PHONE` | required (checkbox) |

### Consent Master Checkbox

Use `d2-consent-master="group"` for a checkbox that selects all consent items in that group.
Use `d2-consent-item="group"` on each child consent checkbox.

```html
<label>
  <input type="checkbox" d2-consent-master="contact" />
  Select all
</label>

<label>
  <input type="checkbox" name="CONSENT_GDPR" d2-consent-item="contact" />
  GDPR consent
</label>

<label>
  <input type="checkbox" name="CONSENT_EMAIL" d2-consent-item="contact" />
  Email consent
</label>

<label>
  <input type="checkbox" name="CONSENT_PHONE" d2-consent-item="contact" />
  Phone consent
</label>
```

Consent master checkboxes auto-initialize when `d2-forms` loads; `digi2.forms.create(...)` is not required for this feature. When the master is checked, all enabled items in the same form and group are checked. When a child item changes, the master updates automatically and uses the native `indeterminate` state when only some items are checked. Webflow custom checkbox visuals are synced via `w--redirected-checked`.

### Validation Rules

| Rule | Type | Description |
|---|---|---|
| `required` | boolean | Not empty |
| `email` | boolean | Valid email |
| `phone` | boolean | Valid phone |
| `url` | boolean | Valid URL |
| `number` / `integer` | boolean | Numeric |
| `letters` | boolean | Letters only |
| `numbers` | boolean | Digits only |
| `alphanumeric` | boolean | Letters + digits |
| `noSpaces` | boolean | No whitespace |
| `noSpecialChars` | boolean | No special chars |
| `minLength` / `maxLength` | number | String length |
| `min` / `max` | number | Numeric range |
| `pattern` | string/RegExp | Regex match |
| `equals` | string | Exact value |
| `matchField` | string | Match another field |

### Per-Rule Error Elements

```html
<label>
  Email
  <input type="email" name="EMAIL" />
  <div d2-form-error-required style="display:none">Email is required</div>
  <div d2-form-error-email style="display:none">Enter a valid email</div>
</label>
```

### Success / error state elements

Toggle-only elements inside the input wrapper — visibility only, no text injected, so they suit icons/badges (🟢 / 🔴):

| Attribute | Shown when |
|---|---|
| `d2-form-success` | field is valid **and** has a value |
| `d2-form-error` | field is invalid |
| `d2-form-error-text` | invalid — injects the message text (overwrites content) |

```html
<div class="input__wrapper">
  <input name="EMAIL" type="email">
  <span d2-form-success style="display:none">🟢</span>
  <span d2-form-error   style="display:none">🔴</span>
  <div  d2-form-error-text style="display:none"></div>
</div>
```

Use `d2-form-error` (toggle, keeps your icon) for badges; use `d2-form-error-text` when you want the message text. Found as a sibling in the field's wrapper. Text inputs flip on blur, checkboxes/selects on change. Start `display:none`; when shown the inline display is cleared so your CSS controls layout.

### Auto-Injected Hidden Inputs

| Input name | Source |
|---|---|
| `utm_campaign_hidden` | URL param → cookie |
| `utm_source_hidden` | URL param → cookie |
| `utm_medium_hidden` | URL param → cookie |
| `utm_content_hidden` | URL param → cookie |
| `utm_term_hidden` | URL param → cookie |
| `gclid` / `fbclid` / `msclkid` | URL param → cookie |
| `gaclientid` | `_ga` cookie |
| `page_url` / `page_title` / `page_referrer` | Page meta |
| `ip_address` | ipify API |

### Context Capture

Capture "which one did they click?" into the form. Put `d2-form-data-<field>="value"` on any container; a click inside it copies the value into the form as a hidden field named `<field>`. Ideal for a grid of product/plan cards that all open the same form popup.

```html
<div d2-form-data-product="Pro plan" d2-form-data-plan="annual">
  <!-- card content -->
  <button d2-show-popup="lead">Ask about this</button>
</div>
```

On click, the form gets hidden fields `product` and `plan`, submitted like any other field.

| Attribute | Role |
|---|---|
| `d2-form-data-<field>="value"` | Adds a hidden field named `<field>` |
| `d2-form-data-target="formName"` | Send only to this form (default: all registered forms) |
| `d2-form-data-prefix="p_"` | Prepend a prefix to every field name |

- `data-d2-` prefix works too. Re-clicking another card overwrites the field (no duplicates).
- The form must be created via `digi2.forms.create()` / `createAll()`.

```js
digi2.forms.captureFrom(element)              // capture from a container/element
digi2.forms.setField('lead', 'product', 'Pro plan')  // set one field on a named form
```

### Password Toggle

```html
<label>
  Password
  <input type="password" name="password">
  <button type="button" d2-password-toggle d2-password-show="Show" d2-password-hide="Hide">Show</button>
</label>
```

```js
digi2.forms.initPasswordToggles()
```

### API

```js
digi2.forms.create('name', options)
digi2.forms.get('name')
digi2.forms.destroy('name')
digi2.forms.list()
digi2.forms.validate(value, rules)      // standalone
digi2.forms.addRule('name', fn)         // custom rule
digi2.forms.initConsentMasters()        // re-scan consent master checkboxes

var form = digi2.forms.get('contact')
form.validateAll()
form.clearErrors()
form.getData()
form.setField('field', 'value')
```

---

## Tabs & Accordions

### Tabs Mode

```html
<div d2-tab-group="pricing">
  <button d2-tab-trigger="monthly">Monthly</button>
  <button d2-tab-trigger="yearly">Yearly</button>
  <div d2-tab-instance="monthly">Monthly plans...</div>
  <div d2-tab-instance="yearly">Yearly plans...</div>
</div>
```

Groups with `d2-tab-group` auto-initialize when `d2-tabs` loads. Call `create` only when you need custom options:

```js
digi2.tabs.create('pricing', { animation: 'fade' })
```

If one trigger already has `d2-tab-active` in the HTML, that tab opens first:

```html
<button d2-tab-trigger="yearly" class="d2-tab-active">Yearly</button>
```

Hidden tab instances are set to `display: none !important` on init and while inactive.

### External Triggers

Use `group:tab` when a button outside the tab group should open a tab and receive the active class.

```html
<button d2-tab-trigger="pricing:yearly">Show yearly pricing</button>
```

For triggers inside the same `d2-tab-group`, the short form also works:

```html
<button d2-tab-trigger="yearly">Show yearly pricing</button>
```

### Accordion Mode (attribute-only)

Everything configurable from the group element — no JS call needed:

```html
<div d2-tab-group="apartments"
     d2-tab-mode="accordion"
     d2-tab-animation="height"
     d2-tab-duration="0.4"
     d2-tab-scroll>
  <div d2-tab-trigger="row-1" class="row">…header…</div>
  <div d2-tab-instance="row-1" class="row-expanded">…details…</div>
  <div d2-tab-trigger="row-2" class="row">…</div>
  <div d2-tab-instance="row-2" class="row-expanded">…</div>
</div>
```

| Group attribute | Values | Description |
|---|---|---|
| `d2-tab-mode` | `tabs` \| `accordion` | Default `tabs` |
| `d2-tab-animation` | `none` \| `fade` \| `slide-up` \| `slide-down` \| `zoom` \| `height` | `height` = smooth max-height grow/collapse (classic accordion feel) |
| `d2-tab-duration` | seconds | Animation duration |
| `d2-tab-multiple` | present / `"false"` | Accordion: allow several panels open at once. Omit for "opening one closes the rest" |
| `d2-tab-active-class` | class name | Custom class for the active trigger + panel (default `d2-tab-active`; the `d2-is-active` attribute is always set too) |
| `d2-tab-default` | `id` or `a\|b` | Panel(s) open on load |
| `d2-tab-scroll` | *(empty)* \| `start` \| `center` \| `end` | On open, glide the page so the panel lands at that viewport position (default `center`). Works on the group element **or** any row inside it |

Or via JS:

```js
digi2.tabs.create('faq', {
  mode: 'accordion',
  allowMultiple: true,
  animation: 'height',
  animationDuration: 0.4,
  scroll: true,             // scrollBlock: 'start' | 'center' | 'end'
})
```

**`height` animation details** — the target height is measured from the real rendered layout (padding-safe, honors a fixed CSS height), so the panel never "jumps" at the end of the animation. Lazy images inside the opening panel are force-loaded and, whenever one arrives (during **or after** the animation), the panel re-targets / grows smoothly instead of popping.

**Predictive scroll (`d2-tab-scroll`)** — instead of chasing the live layout, the module precomputes the panel's **final** position and size (including a sibling panel collapsing above it) and glides straight there in one eased motion, synchronized with the animation. Manual scroll (wheel/touch) aborts the glide. The initial default-open never scrolls.

### Declarative accordion (`d2-accordion`)

For repeated components (FAQ items, CMS lists) where per-item ids are a pain — every part marked with its own attribute, **no ids and no structure guessing**:

```html
<div class="faq_list" d2-accordion>
  <div class="faq_item" d2-accordion-item>
    <div class="faq_item-trigger" d2-accordion-trigger>
      <h3>Question?</h3>
      <svg d2-accordion-indicator class="faq_item-indicator">…plus icon…</svg>
    </div>
    <div class="faq_item-body" d2-accordion-body>Answer…</div>
  </div>
  <div class="faq_item" d2-accordion-item>…</div>
</div>
```

- Ids are generated automatically; the shell desugars into the regular `d2-tab-*` API with **`mode: accordion` + `animation: height`** defaults.
- All group attributes work on the `[d2-accordion]` element too: `d2-tab-duration`, `d2-tab-multiple`, `d2-tab-default`, `d2-tab-scroll`, `d2-tab-animation` (override the `height` default).
- An item missing `d2-accordion-trigger` or `d2-accordion-body` is skipped; unmarked children are ignored entirely.
- **Open on load:** add `d2-accordion-open` to the item (or its trigger) you want open initially. Without `d2-tab-multiple` only the first flagged item opens. (Equivalent to `d2-tab-default="<name>-1"` when you name the accordion.)
- `d2-accordion="faq"` names the instance for the JS API (`digi2.tabs.get('faq')`); with no value a name is generated.
- The accordion lives in the **tabs** module — request `d2-tabs` (or `d2-accordion`, which the loader aliases to `tabs`) in your per-page modules.

**Indicator (`d2-accordion-indicator`)** — *optional*. Put it on the plus icon inside the trigger and the module styles it for free: while its item is open the icon rotates **45°** and takes `color: var(--swatch--primary, currentColor)` (0.3 s transition; the icon must use `fill="currentColor"`). Skip the attribute if you want to style state yourself — see below.

### Active state (`d2-is-active`)

Whenever a tab/accordion panel is open the module sets **`d2-is-active`** on both its **trigger** and its **panel** (in addition to the `d2-tab-active` class). Works in tabs mode too. Style anything from CSS — no JS, no reliance on class names:

```css
/* rotate your own indicator when the item is open */
[d2-is-active] .my-icon { transform: rotate(45deg); color: var(--swatch--primary); }

/* style the open panel / trigger */
[d2-is-active].faq_item-trigger { color: var(--swatch--primary); }

/* style the whole item via the trigger */
.faq_item:has([d2-tab-trigger][d2-is-active]) { … }
```

### View switch as a dropdown (`d2-tab-label`)

Turn a tab group (e.g. list ⇄ grid) into a Webflow-dropdown whose toggle text shows the current view — like the sort dropdown in the CMS module. The options are **external triggers** (`group:tab`) living inside the dropdown, outside the group:

```html
<!-- the two views (panels) -->
<div d2-tab-group="view">
  <div d2-tab-instance="list">…list…</div>
  <div d2-tab-instance="grid">…grid…</div>
</div>

<!-- the dropdown that switches them -->
<div class="w-dropdown">
  <div class="w-dropdown-toggle">
    <div d2-tab-label="view">Wyświetl według</div>  <!-- placeholder until a pick -->
  </div>
  <nav class="w-dropdown-list">
    <a d2-tab-trigger="view:list" class="w-dropdown-link">Lista</a>
    <a d2-tab-trigger="view:grid" class="w-dropdown-link">Siatka</a>
  </nav>
</div>
```

- The label keeps its **authored placeholder** on load (e.g. "Wyświetl według") and only swaps to the option text **after the user picks one** — the default-open never changes it.
- To make the menu **collapse after a pick**, add the [dropdowns module](#dropdowns) (`d2-dropdown` on the wrapper) — Webflow's own dropdown can stay open otherwise.
- `d2-tab-option-label="…"` on a trigger overrides the text it contributes (handy when the option has an icon or a longer label).
- `d2-tab-label-static` on the label → keep the placeholder forever (never swap), for a fixed "Wyświetl według" that just opens the menu.
- **Default view:** set `d2-tab-default="list"` (or `grid`) on the `d2-tab-group` element. Without it, the module auto-opens the first panel (since the triggers live outside the group).
- An unnamed `d2-tab-label` (no value) binds to whichever group has a trigger in the same `.w-dropdown` / `[d2-tab-label-scope]`.

### Behavior notes

- **Nested groups are isolated** — a view-switch `d2-tab-group` can wrap an accordion `d2-tab-group`; neither steals the other's triggers, panels, or `d2-tab-scroll`.
- **Real links inside a trigger navigate** — an `<a href="/product">` inside a trigger row opens the link instead of toggling. Hash/`javascript:` pseudo-links still toggle.
- **Class-hidden panels** — hidden panels get inline `display:none !important`; on show the inline style is removed **and** a class-based `display:none` (e.g. a `hidden` combo class) is overridden with inline `display:block`. Use `d2-tab-display="flex"` (or `grid`) on the panel when block is wrong.

### Options

| Option | Default | Description |
|---|---|---|
| `mode` | `'tabs'` | `'tabs'` or `'accordion'` |
| `allowMultiple` | `false` | Accordion: multiple open |
| `animation` | `'fade'` | none / fade / slide-up / slide-down / zoom / **height** |
| `animationDuration` | `0.25` | Seconds |
| `defaultOpen` | `null` | Tab id or array |
| `activeClass` | `'d2-tab-active'` | Class on active trigger |
| `hashSync` | `false` | Sync with URL hash |
| `scroll` | `false` | Glide the opened panel into view |
| `scrollBlock` | `'center'` | Where it lands: `start` / `center` / `end` |
| `onChange` | `null` | Callback(tabId, instance) |

### API

```js
instance.open('tab-id')
instance.close('tab-id')      // accordion
instance.toggle('tab-id')     // accordion
instance.getActive()
```

---

## Sliders

```html
<div d2-slider="hero">
  <div d2-slider-track>
    <div d2-slide>Slide 1</div>
    <div d2-slide>Slide 2</div>
    <div d2-slide>Slide 3</div>
  </div>
  <button d2-slider-prev>←</button>
  <button d2-slider-next>→</button>
  <div d2-slider-dots></div>
</div>
```

```js
digi2.sliders.create('hero', {
  autoplay: 4000,
  loop: true,
  slidesPerView: 1,
  gap: 16,
})
```

### Options

| Option | Default | Description |
|---|---|---|
| `direction` | `'horizontal'` | `'horizontal'` or `'vertical'` |
| `slidesPerView` | `1` | Visible slides |
| `gap` | `0` | px between slides |
| `loop` | `false` | Loop back |
| `autoplay` | `false` | `false` or ms |
| `pauseOnHover` | `true` | Pause on hover |
| `speed` | `400` | Transition ms |
| `draggable` | `true` | Touch/mouse drag |
| `dragThreshold` | `40` | px to trigger |

### CMS feed (`d2-slider-source` → `d2-slider-feed`)

Feed a slider with images from a Webflow Collection List — no custom scripts. Tag the (hidden) list as the **source** and the slider as the **feed target**; matching names pair them. Bind both to a CMS field (e.g. slug) to pair per item:

```html
<!-- hidden CMS list rendering the images -->
<div d2-slider-source="{{slug}}" class="hidden w-dyn-list">
  <div class="w-dyn-item"><img src="…"></div>
  <div class="w-dyn-item"><img src="…"></div>
</div>

<!-- the slider that receives them -->
<div d2-slider d2-slider-infinite d2-slider-feed="{{slug}}">
  <div d2-slider-track>
    <div d2-slide>…static slide…</div>
  </div>
</div>
```

- Items are **cloned, not moved** — one source can feed several sliders with the same name (e.g. a grid view and a list view sharing one slug-named source).
- Items taken: `[d2-slide]` descendants of the source; otherwise its direct children that are/contain an `<img>` (skips `w-dyn-empty` junk). Each clone gets `d2-slide` automatically.
- **Nested collection lists work** — put the attribute on the nested list (wrapper or items element; the module descends into `.w-dyn-items` automatically) inside each parent item and bind the name to the parent's slug. Mind Webflow's nested-list item limit (typically 5) — for larger galleries use a flat helper Collection List elsewhere on the page with the same slug-bound source name.
- `d2-slider-feed-position="start|end"` — where they land relative to existing slides (default `start`).
- The move happens **before the slider initializes**, so infinite clones and positions include the fed slides; the source is hidden afterwards.
- The source must be in the DOM at init (Webflow renders CMS lists server-side, so that's the normal case). Feeding an already-running slider is intentionally skipped.

### Behavior notes

- **Hidden-panel init:** a slider inside a hidden tab/accordion re-snaps automatically when it becomes visible (and on window resize) — no misparked track.
- **Drag is clamped** to the track's range with a small rubber-band — you can't fling slides out of view.
- **Single slide:** arrows + dots are hidden and dragging is disabled when there's nothing to navigate.

### API

```js
instance.next()
instance.prev()
instance.goTo(2)
instance.addSlide('<div>New</div>')
instance.removeSlide(0)
instance.play()
instance.pause()
instance.getActive()
instance.getCount()
```

---

## Scroll Animations

```html
<div d2-animate="fade-up">Appears on scroll</div>
<div d2-animate="zoom" d2-delay="200">Delayed</div>
<div d2-animate="slide-left" d2-duration="0.8">Custom duration</div>

<!-- Stagger -->
<div d2-stagger="100">
  <div d2-animate="fade-up">Item 1</div>
  <div d2-animate="fade-up">Item 2</div>
  <div d2-animate="fade-up">Item 3</div>
</div>
```

```js
digi2.animate.init({ once: true, threshold: 0.15 })
digi2.animate.refresh()    // after CMS/AJAX load
digi2.animate.reset()
digi2.animate.trigger(el)
digi2.animate.presets()    // list all preset names
```

22 presets: `fade`, `fade-up`, `fade-down`, `fade-left`, `fade-right`, `zoom`, `zoom-in`, `slide-up/down/left/right`, `flip`, `flip-y`, `rotate`, `blur`, `zoom-blur`, `bounce`, `elastic`, `drop`, `swing`, `unfold`, `reveal`.

Respects `prefers-reduced-motion` automatically.

---

## Toasts

```js
digi2.toasts.success('Saved!')
digi2.toasts.error('Something went wrong')
digi2.toasts.warning('Check your input')
digi2.toasts.info('New update available')
digi2.toasts.show('Custom message', { type: 'default', duration: 5000 })

digi2.toasts.dismiss(id)
digi2.toasts.dismissAll()
digi2.toasts.config({ position: 'bottom-center', duration: 4000 })
```

### Options

| Option | Default | Description |
|---|---|---|
| `type` | `'default'` | default / success / error / warning / info |
| `duration` | `3000` | ms (0 = no auto-dismiss) |
| `position` | `'top-right'` | top-left/center/right, bottom-left/center/right |
| `dismissible` | `true` | Show close button |
| `animation` | `'slide'` | slide / fade |
| `onClick` | `null` | Callback |
| `onDismiss` | `null` | Callback |

---

## Smooth Scroll

```html
<a d2-scroll="#features">Features</a>
<a d2-scroll="#pricing">Pricing</a>
<button d2-scroll-top>↑ Top</button>
```

```js
digi2.scroll.init({ offset: 80 })
digi2.scroll.to('#section')
digi2.scroll.toTop()
digi2.scroll.getActive()    // current section id
digi2.scroll.refresh()
```

### Options

| Option | Default | Description |
|---|---|---|
| `offset` | `80` | px for fixed headers |
| `speed` | `800` | Scroll duration ms |
| `activeClass` | `'d2-scroll-active'` | Class on active nav link |
| `scrollTopShow` | `300` | px to show back-to-top |
| `scrollTopClass` | `'d2-scroll-top-visible'` | Class on visible button |
| `onChange` | `null` | Callback(sectionId) |

---

## Lazy Loading

```html
<img d2-lazy="real-image.jpg" src="tiny-placeholder.jpg" alt="...">
<video d2-lazy="video.mp4" poster="poster.jpg"></video>
<iframe d2-lazy="https://youtube.com/embed/xxx"></iframe>
<div d2-lazy-bg="background.jpg">...</div>
```

```js
digi2.lazy.init({ blur: true, rootMargin: '200px 0px' })
digi2.lazy.refresh()       // after CMS/AJAX load
digi2.lazy.load(element)   // manual load
```

### Options

| Option | Default | Description |
|---|---|---|
| `rootMargin` | `'200px 0px'` | Load 200px before visible |
| `blur` | `true` | Blur-up effect |
| `blurAmount` | `15` | px blur |
| `fadeIn` | `true` | Fade in after load |
| `fadeDuration` | `0.4` | Seconds |
| `onLoad` | `null` | Callback(element) |
| `onError` | `null` | Callback(element) |

---

## Countdown

```html
<div d2-countdown="2025-12-31T23:59:59">
  <span d2-countdown-days>00</span>d
  <span d2-countdown-hours>00</span>h
  <span d2-countdown-minutes>00</span>m
  <span d2-countdown-seconds>00</span>s
</div>
```

```js
digi2.countdown.create('launch', {
  targetDate: '2025-12-31T23:59:59',
  expiredText: 'Event started!',
  onComplete: function () { console.log('Done!') },
})
```

### API

```js
instance.getRemaining()    // { days, hours, minutes, seconds, total }
instance.pause()
instance.resume()
instance.reset('2026-06-01')
instance.destroy()
```

---

## CMS Filtering

```html
<div d2-filter-group="portfolio">
  <button d2-filter="all">All</button>
  <button d2-filter="web">Web</button>
  <button d2-filter="branding">Branding</button>

  <div d2-filter-list>
    <div d2-filter-item d2-filter-category="web">Project 1</div>
    <div d2-filter-item d2-filter-category="branding">Project 2</div>
    <div d2-filter-item d2-filter-category="web,branding">Project 3</div>
  </div>
</div>
```

```js
digi2.filter.create('portfolio', { animation: 'zoom' })
```

### Options

| Option | Default | Description |
|---|---|---|
| `allKeyword` | `'all'` | Value for show-all filter |
| `animation` | `'fade'` | none / fade / zoom / slide-up |
| `animationDuration` | `0.3` | Seconds |
| `activeClass` | `'d2-filter-active'` | Class on active button |
| `matchMode` | `'any'` | `'any'` or `'all'` |
| `onChange` | `null` | Callback(filter, count, instance) |

### API

```js
instance.filterBy('web')
instance.filterBy('all')
instance.getActive()
instance.getVisibleCount()
```

---

## CMS List (sort + filter + load more)

Operates on a Webflow CMS Collection List that's already in the DOM (Webflow renders up to 100 items per list server-side). Provides:

- **Sort** — clickable column-header buttons that toggle asc / desc / off.
- **Filter** — toggle buttons grouped by key (`category:shoes`, `tag:new`, …). AND across keys, OR within a key.
- **Progressive reveal** — show only `perPage` items, reveal more on scroll or via a load-more button.

```html
<!-- The collection list (replace .w-dyn-items with whatever wraps your items) -->
<div d2-cms-list="products" class="w-dyn-items">
  <div d2-cms-item>
    <strong d2-cms-field="title">Alpha Sneaker</strong>
    <span d2-cms-field="price">129</span>
    <span d2-cms-field="category">shoes</span>
  </div>
  <div d2-cms-item>
    <strong d2-cms-field="title">Beta Cap</strong>
    <span d2-cms-field="price">29</span>
    <span d2-cms-field="category">hats</span>
  </div>
  <!-- bind Webflow CMS fields into the [d2-cms-field="…"] elements' text -->
</div>

<!-- Sort buttons (click toggles asc → desc → off) -->
<button d2-cms-target="products" d2-cms-sort="title">Title</button>
<button d2-cms-target="products" d2-cms-sort="price" d2-cms-sort-type="number">Price</button>

<!-- Filter buttons (click toggles on/off; key:value) -->
<button d2-cms-target="products" d2-cms-filter="category:shoes">Shoes</button>
<button d2-cms-target="products" d2-cms-filter="category:hats">Hats</button>

<!-- Optional load-more button (only used when loadMode: 'button') -->
<button d2-cms-target="products" d2-cms-load-more>Load more</button>

<!-- Optional empty-state element -->
<div d2-cms-target="products" d2-cms-empty>No matches.</div>
```

```js
digi2.cms.createList('products', {
  perPage: 12,
  loadMode: 'scroll',           // 'scroll' | 'button' | 'all'
  defaultSort: { field: 'price', dir: 'asc' },
});
```

### Attribute-only setup (no JS)

You can configure a list entirely from HTML — the module auto-initializes every `[d2-cms-list]` element on DOM ready. Any option below can be set via attribute, and clicking a `d2-cms-sort` button defaults to **A→Z / 0→9** (ascending) on its first click, then toggles to descending, then clears.

```html
<div d2-cms-list="products"
     d2-cms-per-page="8"
     d2-cms-load-mode="scroll"
     d2-cms-sort-by="status"
     d2-cms-sort-order="new|featured|sale|regular"   <!-- custom value order -->
     d2-cms-filter-match="AND"
     d2-cms-hidden-class="is-hidden"
     d2-cms-scroll-offset="300">
  …items…
</div>

<!-- Works on buttons too: -->
<button d2-cms-target="products"
        d2-cms-sort="status"
        d2-cms-sort-order="new|featured|sale|regular">By status</button>
```

Multiple lists can share one control — pipe the names: `d2-cms-target="products|products-grid"`.

### Base order vs persistent groups

Two distinct tools:

- **`d2-cms-sort-by` + `d2-cms-sort-order`** (on the list) — the **base ordering**. Drives the initial render only; a user-initiated sort replaces it entirely, and clearing the sort restores it.
- **`d2-cms-group-by` + `d2-cms-group-order`** (on the list) — a **persistent group**: the group order keeps ranking items even while the user sorts another column (e.g. "Available always first, sort by price within groups").

```html
<!-- initial: promo → finished → premiere; user sort takes over fully -->
<div d2-cms-list="apartments" d2-cms-sort-by="tag" d2-cms-sort-order="OFERTA|WYKOŃCZONE|PREMIERA">…</div>

<!-- Available always leads, regardless of the active sort -->
<div d2-cms-list="apartments" d2-cms-group-by="status" d2-cms-group-order="Dostępne|Zarezerwowane|Sprzedane">…</div>
```

### Custom dropdowns, selects, labels

```html
<!-- Sort dropdown (Webflow w-dropdown) — the label swaps to the picked option -->
<div class="w-dropdown">
  <div class="w-dropdown-toggle">
    <div d2-cms-sort-label d2-cms-target="products">Sortuj według</div>
  </div>
  <nav class="w-dropdown-list">
    <a d2-cms-target="products" d2-cms-sort="price" d2-cms-sort-dir="asc">Cena: rosnąco</a>
    <a d2-cms-target="products" d2-cms-sort="price" d2-cms-sort-dir="desc">Cena: malejąco</a>
  </nav>
</div>

<!-- Facet filter via native select (empty option clears the key) -->
<select d2-cms-target="products" d2-cms-filter-field="floor">
  <option value="">Wybierz piętro</option>
  <option value="2">2</option>
  <option value="3">3</option>
</select>

<!-- Filter dropdown label (same pattern as sort) -->
<div d2-cms-filter-label="floor" d2-cms-target="products">Dowolne piętro</div>
```

- With **more than one list on the page**, labels/controls outside a list **must** carry `d2-cms-target` — otherwise they're ambiguous and ignored.
- Labels are scoped to their `.w-dropdown` (or a `[d2-cms-sort-scope]` wrapper), so table-header sort buttons elsewhere don't hijack a dropdown's text. `d2-cms-sort-option-label="…"` overrides the text an option contributes.
- Checkboxes / radios carrying `d2-cms-filter="key:value"` sync their `checked` state automatically (also when cleared programmatically).
- **Preselect a filter on load** — add `d2-cms-filter-default` to the option that should start active; the list opens already filtered, the option gets `d2-cms-filter-active`, its `checked` syncs, and `d2-cms-filter-label` shows the selection:

  ```html
  <input type="radio" d2-cms-filter="investment:" data-value="Bernardyńska 4"
         d2-cms-filter-default d2-cms-target="apartments">
  ```

  Presence turns it on; `d2-cms-filter-default="false"` (or `off`/`0`) opts out, so the attribute can be CMS-bound and only certain rows enable it. Works with every filter form (`key:value`, trailing-colon + `value`/`data-value`, and `d2-cms-filter-value`). Multiple defaults across keys all apply. To let users get back to the full list, pair it with a `d2-cms-clear` button.

### Clear buttons

```html
<a d2-cms-target="products" d2-cms-clear>Wyczyść filtry</a>            <!-- facets + ranges -->
<a d2-cms-target="products" d2-cms-clear="all">Wyczyść wszystko</a>    <!-- + sort -->
<a d2-cms-target="products" d2-cms-clear="tag">Reset tagów</a>         <!-- ONLY the "tag" key -->
<a d2-cms-target="products" d2-cms-clear="tag|floor">Reset dwóch pól</a>
```

Field-scoped clear resets only that filter key / range field (unchecks its checkboxes, snaps its slider back) and leaves every other filter intact.

### Range sliders

```html
<div d2-cms-target="products" d2-cms-range d2-cms-range-field="price"
     d2-cms-range-step="10000" d2-cms-range-displayformat="pln">
  <div d2-cms-range-display="min">0</div>
  <div d2-cms-range-track>
    <div d2-cms-range-fill></div>
    <div d2-cms-range-handle="min"></div>
    <div d2-cms-range-handle="max"></div>
  </div>
  <div d2-cms-range-display="max">0</div>
</div>
```

Bounds auto-detect from item values (override with `d2-cms-range-min/max` or `d2-cms-range-default-min/max`). `d2-cms-range-displayformat="pln"` renders `1 600 000`-style values (no currency); a `0,000`-style pattern follows the browser locale instead.

Add `d2-cms-range-snap` for **outward** rounding to `d2-cms-range-step`. Two effects, both min-**down** / max-**up**:

- **Auto-detected bounds** round to the step (e.g. with `step="5"` a 7 → 207.25 dataset becomes 5 → 210). Explicitly set `d2-cms-range-min/max` are never snapped.
- **Dragging the handles** snaps the live value outward too — the min handle floors, the max handle ceils — so a handle never rounds *inward* and clips an item sitting just past it (drag min onto a `28.75` item → lands on `25`, keeps it in). Without the flag, handles round to the nearest tick (classic slider feel).

### Options

| Option | Default | Description |
|---|---|---|
| `listSelector` | `null` | CSS selector for the list container (alternative to `d2-cms-list="name"` attribute) |
| `itemSelector` | `null` | CSS selector for items (default: `[d2-cms-item]` if present, else direct children) |
| `perPage` | `12` | Initial visible count + increment per load |
| `loadMode` | `'scroll'` | `'scroll'` (IntersectionObserver), `'button'`, or `'all'` (no pagination) |
| `scrollOffset` | `200` | Px before sentinel triggers next reveal (rootMargin) |
| `defaultSort` | `null` | `{ field: 'price', dir: 'asc' }` |
| `defaultFilters` | `{}` | `{ category: ['shoes', 'hats'] }` |
| `filterMatchMode` | `'AND'` | `'AND'` across keys (always OR within a key's values) |
| `emptySelector` | `null` | Selector for the empty-state element (defaults to `[d2-cms-empty][d2-cms-target="<name>"]`) |
| `hiddenClass` | `null` | Optional CSS class for hidden items (default: inline `display:none`) |
| `hideNativePagination` | `true` | Hide sibling `.w-pagination-wrapper` |
| `onChange` | `null` | `(state) => {}` — fires after any sort / filter / reveal |
| `onSort` | `null` | `(field, dir) => {}` |
| `onFilter` | `null` | `(filters) => {}` |
| `onLoadMore` | `null` | `(visibleCount, totalMatching) => {}` |

### Attribute reference

| Attribute | On | Purpose |
|---|---|---|
| `d2-cms-list="name"` | list container | Marks the list and gives it a name (auto-inits it on DOM ready) |
| `d2-cms-per-page="8"` | list container | Attribute-init: items per page |
| `d2-cms-load-mode="scroll\|button\|all"` | list container | Attribute-init: reveal mode |
| `d2-cms-sort-by="field"` | list container | Attribute-init: default sort field (asc unless `d2-cms-sort-dir="desc"`) |
| `d2-cms-sort-dir="asc\|desc"` | list container OR sort button | List: override default sort direction. Button: force a fixed direction (no toggle) |
| `d2-cms-sort-order="a\|b\|c"` | list container OR sort button | Custom value order — items whose field equals `a` sort first, then `b`, then `c`, then anything else. Overrides type-based comparison |
| `d2-cms-filter-match="AND\|OR"` | list container | Attribute-init: filter match mode across keys |
| `d2-cms-hidden-class="..."` | list container | Attribute-init: CSS class for hidden items |
| `d2-cms-scroll-offset="300"` | list container | Attribute-init: px before sentinel triggers next reveal |
| `d2-cms-hide-pagination="false"` | list container | Attribute-init: keep Webflow's native `.w-pagination-wrapper` visible |
| `d2-cms-group-by="field"` + `d2-cms-group-order="a\|b"` | list container | **Persistent** group ranking — keeps ordering items even while the user sorts another column |
| `d2-cms-item` | each item (optional) | Explicit item marker; defaults to direct children |
| `d2-cms-field="{name}"` | element inside item | Field value — read from this element's `.textContent` |
| `d2-cms-field-{name}="value"` | item element | Inline field value from the attribute itself (no hidden span needed), e.g. `d2-cms-field-price="1468620"` |
| `d2-cms-field-type="number\|text\|date"` | on `[d2-cms-field]` | Optional. Forces the comparator type. Without it, type is auto-detected (numbers-as-numbers, dates-as-dates, else alphabetical) |
| `d2-cms-sort="field"` | button | Click toggles sort by this field — first click = asc (A→Z / 0→9), then desc, then asc again |
| `d2-cms-sort-dir="asc\|desc"` | sort button/option | Forces a fixed direction (no toggle) — use for explicit dropdown options |
| `d2-cms-sort-type="number\|text\|date"` | button | Override auto-detection of value type |
| `d2-cms-sort-label` | any element | Swaps its text to the active sort option's text (custom dropdown toggle); restores the original when sort clears. Scoped to its `.w-dropdown` / `[d2-cms-sort-scope]` |
| `d2-cms-sort-option-label="…"` | sort option | Overrides the text this option contributes to `d2-cms-sort-label` |
| `d2-cms-filter="key:value"` | button / checkbox / radio | Toggle a filter. Composites: `key:a\|b` (both values), `key:a&b` (AND) |
| `d2-cms-filter="key"` + `d2-cms-filter-value="…"` | CMS-generated control | Split form for CMS lists — Webflow binds whole attribute values only, so bind the **value** attribute to a CMS field and keep the key static |
| `d2-cms-filter="key:"` (trailing colon) | input (radio/checkbox) | Value read from the input's own `value` / `data-value` attribute (Webflow radios carry `data-value`) |
| `d2-cms-filter-field="key"` | `<select>` | Native select drives the filter; empty option clears the key |
| `d2-cms-filter-label="key"` | any element | Swaps its text to the active filter value(s); empty attr tracks any key |
| `d2-cms-clear` / `="all"` / `="key"` / `="key\|key2"` | button | Clear filters: everything / + sort / only the named field(s) — see [Clear buttons](#clear-buttons) |
| `d2-cms-range` (+ `-field`, `-step`, `-min/max`, `-displayformat`) | wrapper | Numeric range slider bound to a field — see [Range sliders](#range-sliders) |
| `d2-cms-load-more` | button | Reveal next `perPage` items |
| `d2-cms-loadcount="6\|all"` | button | Reveal N items (or everything) per click |
| `d2-cms-target="name"` or `"a\|b"` | sort/filter/load-more/display/empty/label elements | Target list(s) by name. Optional only when the element is nested inside `[d2-cms-list]`, OR when there is exactly one list on the page — **with two+ lists, controls outside a list require it** |
| `d2-cms-empty` | any element | Shown when 0 items match |
| `d2-cms-display="visible\|matching\|total\|hidden\|remaining"` | any element | Module writes the matching count into this element's textContent. With a pipe target (`d2-cms-target="a\|b"`) the counter is **shared**: only the currently VISIBLE list writes to it, and it hands over automatically on tab switches — one counter for several tabbed lists |
| `d2-cms-display-format="{visible} of {matching}"` | any element | Template with `{visible}`, `{matching}`, `{total}`, `{hidden}`, `{remaining}` placeholders — takes precedence over `d2-cms-display` |
| `d2-cms-sort-active="asc\|desc"` | button | (Set by module) Reflects current sort. A button with explicit `d2-cms-sort-dir` is marked only when the direction matches too — dropdown options highlight correctly |
| `d2-cms-filter-active` | button | (Set by module) Reflects active filter |
| `d2-cms-load-more-done` | button | (Set by module) Set when no more items to reveal (button is also hidden) |

### API

```js
const list = digi2.cms.get('products');

list.sort('price', 'asc')      // dir optional → toggles asc → desc → off
list.clearSort()
list.filter({ category: ['shoes'] })
list.addFilter('category', 'hats')
list.removeFilter('category', 'hats')
list.toggleFilter('category', 'shoes')
list.clearFilters()
list.loadMore()                // next perPage
list.loadAll()
list.reset()                   // no sort, no filters, first page
list.refresh()                 // re-scan items (after Webflow re-renders the list)
list.getState()                // { visible, totalMatching, total, sort, filters }
list.destroy()
```

---

## Format

Load with any of these loader attributes: `d2-format`, `d2-format-price`, or `d2-format-number`.

```html
<div d2-format-price>199999</div>
<div d2-format-number="price">422934.4</div>
<div class="format-price">199999</div>
```

They format the number only by default:

```text
199 999
422 934
```

**Separators are non-breaking (`U+00A0`) by default** — a formatted price never wraps mid-number (`1 468 620 zł` stays on one line). This covers the thousands separator and the space before a suffix/currency/unit. Opt back into regular, wrappable spaces with `d2-format-break`.

Optional overrides:

```html
<div d2-format-price d2-format-suffix=" PLN">199999</div>
<div d2-format-price d2-format-currency="EUR">199999</div>
<div d2-format-price d2-format-decimals="2">199999</div>
<div d2-format-price d2-format-unit="zł/m²">20500</div>            <!-- → 20 500 zł/m² -->
<div d2-format-price d2-format-suffix="zł/m²" d2-format-space>20500</div>  <!-- force the space Webflow trims -->
<div d2-format-price d2-format-break>1468620</div>                 <!-- regular spaces, may wrap -->
```

| Attribute | Description |
|---|---|
| `d2-format-currency="PLN"` | Append a currency (with a leading space) |
| `d2-format-suffix="…"` / `d2-format-prefix="…"` | Free-form text around the number |
| `d2-format-unit="zł/m²"` | Unit with a module-controlled leading space |
| `d2-format-space` | Force a space before the suffix when Webflow trimmed it |
| `d2-format-decimals="2"` | Fraction digits (default 0) |
| `d2-format-break` | Opt out of non-breaking spaces |

The module observes added/changed DOM, so Webflow CMS items loaded later are formatted automatically — and the CMS module re-formats after every render (sort / filter / load-more), including prices inside hidden accordion panels.

```js
digi2.format.price('199999')       // "199 999"
digi2.format.price('199999', { currency: 'PLN' }) // "199 999 PLN"
digi2.format.refresh()             // rescan document
```

---

## Copy to Clipboard

```html
<button d2-copy="Text to copy">Copy</button>
<button d2-copy d2-copy-target="#promo-code">Copy Code</button>
```

```js
digi2.copy.init({ showToast: true })
digi2.copy.text('Hello')
digi2.copy.fromElement('#selector')
```

Auto-shows "Copied!" feedback on the button + toast notification (if toasts module loaded).

---

## Events

```js
digi2.on('loaded', fn)              // all modules loaded
digi2.on('module:loaded', fn)       // single module (receives name)
digi2.on('module:error', fn)        // module failed
digi2.on('consent:updated', fn)     // consent changed
digi2.off('loaded', fn)
digi2.emit('custom', data)
digi2.onReady(fn)                   // alias for on('loaded')
```

---

## Module Management

```js
digi2.modules.check('cookies')                   // true / false
digi2.modules.list()                             // ['popups', 'cookies', ...]
await digi2.modules.require('forms')             // load on demand
await digi2.modules.requireAll(['cookies', 'forms'])
```

---

## Debug Mode

```html
<script src="...digi2-loader.min.js" d2-popups d2-debug-mode></script>
```

Logs all actions across all modules to console with colored prefixes.

```js
digi2.debug = true               // enable at runtime
digi2.log('module', 'action', data)
```

---

## Data Attributes

| Attribute | Element | Description |
|---|---|---|
| `d2-show-popup="name"` | Any | Click opens popup |
| `d2-popup-schedule="from, to"` | Popup element | Date/time window gate |
| `d2-popup-exclude="/a\|/b"` | Popup element | Never show on these subpages (hard block) |
| `d2-popup-include="/a\|/b"` | Popup element | Show ONLY on these subpages |
| `d2-form="name"` | Div | Form enhancement wrapper |
| `d2-form-error-{rule}` | Inside label | Per-rule error message |
| `d2-form-summary` | Inside form | Summary error container |
| `d2-password-toggle` | Button | Toggle password visibility |
| `d2-tab-group="name"` | Div | Tabs/accordion wrapper |
| `d2-accordion` | Div | Declarative accordion wrapper — ids auto-generated |
| `d2-accordion-item/-trigger/-body` | Parts | Required part markers (unmarked children are ignored) |
| `d2-accordion-indicator` | Icon in trigger | Optional — auto open state: rotates 45° + `var(--swatch--primary)` |
| `d2-is-active` | Trigger + panel | (Set by module) Present while open — style with `[d2-is-active]` in tabs & accordions |
| `d2-tab-mode="accordion"` | Group | Accordion mode (default tabs) |
| `d2-tab-animation="height"` | Group | Animation; `height` = smooth accordion |
| `d2-tab-duration="0.4"` | Group | Animation duration (s) |
| `d2-tab-multiple` | Group | Accordion: allow several open |
| `d2-tab-default="id"` | Group | Panel(s) open on load (`a\|b`) |
| `d2-tab-scroll` / `="start\|center\|end"` | Group or row | Glide opened panel into view (predictive) |
| `d2-tab-trigger="id"` | Button | Tab trigger (real links inside navigate) |
| `d2-tab-trigger="group:id"` | Any | External tab trigger |
| `d2-tab-instance="id"` | Div | Tab panel |
| `d2-tab-label="group"` | Any (dropdown toggle) | Placeholder until a pick, then shows the chosen tab's text; pairs with `d2-tab-option-label` |
| `d2-tab-label-static` | On a `d2-tab-label` | Keep the placeholder forever (never swap) |
| `d2-tab-default="id"` | Group | Default open view/panel on load |
| `d2-tab-active-class="is-active"` | Group | Custom active class on trigger + panel |
| `d2-tab-display="flex\|grid"` | Panel | Display used when overriding a class-based `display:none` |
| `d2-slider="name"` | Div | Slider container |
| `d2-slide` | Div | Slide item |
| `d2-slider-track` | Div | Slide track |
| `d2-slider-prev/next` | Button | Arrow navigation (auto-hidden when ≤1 view of slides) |
| `d2-slider-dots` | Div | Dot navigation |
| `d2-slider-source="name"` | CMS list | Its images become slides of the matching feed slider |
| `d2-slider-feed="name"` | Slider | Receives slides from matching `d2-slider-source` (+`d2-slider-feed-position="start\|end"`) |
| `d2-animate="preset"` | Any | Scroll animation |
| `d2-stagger="ms"` | Parent | Stagger children |
| `d2-delay="ms"` | Any | Animation delay |
| `d2-duration="s"` | Any | Animation duration |
| `d2-scroll="#id"` | Link | Smooth scroll to |
| `d2-scroll-top` | Button | Scroll to top |
| `d2-lazy="url"` | img/video/iframe | Lazy load src |
| `d2-lazy-bg="url"` | Div | Lazy background image |
| `d2-countdown="date"` | Div | Countdown target |
| `d2-countdown-days/hours/minutes/seconds` | Span | Timer display |
| `d2-filter-group="name"` | Div | Filter wrapper |
| `d2-filter="category"` | Button | Filter trigger |
| `d2-filter-item` | Div | Filterable item |
| `d2-filter-category="cat"` | Div | Item categories |
| `d2-copy="text"` | Button | Copy to clipboard |
| `d2-copy-target="#id"` | Button | Copy element content |
| `d2-dropdown` | Wrapper | Custom dropdown (open/close, close-on-select) |
| `d2-dropdown-toggle/-list` | Parts | Toggle button / menu (default `.w-dropdown-*`) |
| `d2-dropdown-keep-open` | Wrapper | Don't close after selecting |
| `d2-format-price` | Any | Format number as price (nbsp separators) |
| `d2-format-break` | On format element | Allow wrapping (regular spaces) |
| `d2-cms-list="name"` | Div | CMS list — full reference in [CMS List](#attribute-reference) |
| `d2-cms-clear` / `="tag"` | Button | Clear all filters / only one field |
| `d2-debug-mode` | Loader script | Enable debug |
| `d2-gtm="GTM-ID"` | Loader script | GTM container ID |

---

## Build

```bash
npm install
npm run build          # webflow-scripts/ → dist/ (minified)
npm run build:watch    # watch mode
```

---

## Project Structure

```
webflow-scripts/              ← source files
  digi2-loader.js
  digi2.js                    ← standalone build (no loader)
  modules/
    google.js, ab-tests.js, popups.js, cookies.js, forms.js,
    tabs.js, sliders.js, animate.js, toasts.js, scroll.js,
    lazy.js, countdown.js, filter.js, cms.js, format.js,
    copy.js, interactions.js

tests/                        ← node:test suites (node --test tests/)

dist/                         ← production (minified only)
  digi2-loader.min.js
  digi2.min.js
  modules/*.min.js

test/
  index.html                  ← interactive cheatsheet
```

---

## License

MIT
