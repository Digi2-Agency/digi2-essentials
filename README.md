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
[Promo](#promo) ·
[Cookies](#cookies) ·
[Forms](#forms) ·
[Country Picker](#country-picker) ·
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

> **Versioning:** `@latest` follows the newest **semver tag** — so shipping means
> tagging. A push alone changes nothing for sites on `@latest`.
>
> **Releasing:**
> ```bash
> scripts/release.sh v1.1.0 "…"   # gate → tag → push tag → purge changed dist/ files
> ```
> The script stops before `git tag` when the [release gate](#release-gate) is
> red. By hand it is the same steps:
> ```bash
> npm run release:check -- v1.1.0   # build, dist/ committed, npm test, browser gate
> git tag -a v1.1.0 -m "…" && git push origin v1.1.0
> # then flush the CDN for every file you changed:
> curl -s "https://purge.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@latest/dist/modules/popups.min.js"
> ```
> Purge returns JSON with `"status": "finished"`; verify with
> `curl -s https://cdn.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@latest/dist/… | wc -c`
> against the local file.
>
> **Why tags are not optional here:** with no semver tag in the repo, jsDelivr
> can't resolve `latest` at all (`data.jsdelivr.com/…/resolved?specifier=latest`
> returns `version: null`). It then pins an arbitrary commit and *no amount of
> purging moves it* — the staleness is in version resolution, not in the file
> cache. That is how every site on `@latest` sat on an eight-day-old build until
> v1.0.0 was tagged.
>
> **Purging the CDN is not the whole story.** jsDelivr serves
> `cache-control: max-age=604800, s-maxage=43200` — 12 h at the edge, but **7 days
> in every visitor's browser**. A purge clears the CDN; it cannot reach a browser
> that already downloaded the file and will not ask again for a week. So on
> `@latest` a new release reaches first-time visitors immediately and returning
> ones up to seven days later — which shows up as "it works for you but not for
> me". Your own browser included: hard-reload (Cmd/Ctrl+Shift+R) before
> concluding a release is broken.
>
> **The fix is the URL, not the cache.** Point sites at a version
> (`…@v1.1.0/dist/…`) and bump it on deploy: a different URL is a different
> resource, so every browser fetches it at once. Immutable, no purge, no waiting.
> `@latest` is fine for a site where a week's lag doesn't matter.

---

## Available Modules

| Attribute | Module | Min Size | Description |
|---|---|---|---|
| `d2-gtm="ID"` | google | 2.4 KB | Consent Mode V2 + GTM + consent manager |
| `d2-ab-tests="configName"` | ab-tests | 6.3 KB | A/B redirects and link rewriting from a sitemap config |
| `d2-popups` | popups | 43.4 KB | 22 animations, triggers, exit intent |
| `d2-cookies` | cookies | 1.2 KB | get/set/remove/getAll |
| `d2-forms` | forms | 18.9 KB | UTM tracking + validation + password toggle + consent master |
| `d2-country-picker` | country-picker | 24.2 KB | Phone country picker — flag + dialing code written into the number |
| `d2-tabs` | tabs | 5.8 KB | Tabs & accordions with animations |
| `d2-sliders` | sliders | 7.8 KB | Carousel with touch/drag, autoplay, CMS feed (start/end/index) |
| `d2-animate` | animate | 5.2 KB | 22 scroll animation presets + stagger |
| `d2-toasts` | toasts | 4.7 KB | 5 types, 6 positions, auto-dismiss |
| `d2-scroll` | scroll | 2.4 KB | Smooth scroll + scroll spy |
| `d2-lazy` | lazy | 2.5 KB | Lazy images/video/iframes + blur-up |
| `d2-countdown` | countdown | 3.4 KB | Timer with pause/resume/reset |
| `d2-filter` | filter | 3.5 KB | CMS filtering with animations |
| `d2-format` | format | 2.7 KB | Number and price formatting |
| `d2-cms` | cms | 40.3 KB | CMS list: sort, filter (immediate or deferred), scroll/load-more (DOM-based) |
| `d2-copy` | copy | 2.0 KB | Clipboard copy with toast feedback |
| `d2-lightbox` | lightbox | 23.1 KB | Image lightbox — custom Designer modal or built-in fallback |
| `d2-dropdowns` | dropdowns | 4.0 KB | Custom dropdowns — own open/close, close-on-select |
| `d2-interactions` | interactions | 14.3 KB | Interaction helpers |
| `d2-webflow` | webflow | 3.4 KB | Fire a Webflow (IX2) interaction by name from custom code |
| `d2-datalayer` | datalayer | 3.0 KB | Push module activity to `dataLayer` using GA4 event names |
| `d2-promo="<url>"` | promo | 5.6 KB | Show/hide elements from a promotion running in 2destate |
| `d2-ma="<url>"` | ma | 66.1 KB | Marketing automation (demo, contract v0 + §13.8 + §13.9 + §13.11): unit views → profile in IndexedDB → scenarios from digi2.app |
| `d2-booking="pk_…"` | booking | 65.2 KB | Booking a rental from the page: the guest's form, the calendar, the price and the payment, answered by the 2destate public site API (contract v1) |

Total (all modules): **466.2 KB min** / **146.8 KB** gzipped.

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

This includes the loader's own `d2-static-width` — `d2-static-width="left;right@728"` flips a label's anchor below 728px. See [Range sliders](#range-sliders).

digi2.on('promo:resolved', (e) => {});  // promotion state decided — e.source tells you how
digi2.on('promo:change', (e) => {});    // state changed while the page was open
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
| `minPageViews` | `null` | `2` — never open *automatically* before the visitor has seen this many pages this session. A gate, so it combines with any trigger. Also readable from `d2-popup-min-pageviews` |
| `startOn` | `null` | `'intro:done'` or `{ event, timeout }` — hold the automatic triggers until that milestone. See [Waiting for an intro](#waiting-for-an-intro--the-starton-option) |
| `cookieName` | `'popup_clicked'` | Dismissal cookie. `null` disables — re-shows every page load |
| `cookieDurationDays` | `1` | Cookie lifespan |
| `setCookieOnClose` | `true` | `false` → closing doesn't suppress the popup. See [Sequencing](#sequencing-two-popups) |
| `excludeUrls` | `[]` | URL fragments to skip — see [URL filters](#url-filters) |
| `containsUrls` | `['/']` | URL fragments required (whitelist) — see [URL filters](#url-filters) |
| `canShow` | `null` | `() => boolean` — veto an open. See [Sequencing](#sequencing-two-popups) |
| `manageFocus` | `true` | On open, focus goes to the close button (`closeTriggerSelector`) or the dialog itself — never into a form field, which would pop the phone keyboard; Tab and Shift+Tab stay inside; on close focus returns to what had it, unless the visitor already moved it. The dialog (`[role=dialog]` inside the overlay, else the overlay) gets `role="dialog"`, `aria-modal="true"` and `aria-labelledby` from its first heading — only where the page didn't set them |
| `closeOnEsc` | `true` | Esc closes the popup like the close button, dismissal cookie included. Independent of `manageFocus`: either works without the other |

With several windows open (a popup over a popup, a lightbox over a popup) only
the **top** popup answers Esc and Tab; a key another layer already handled
(`defaultPrevented` — the lightbox marks its Esc so) is left alone, and focus
sitting in a `[d2-lightbox-modal]` or another `aria-modal` dialog is never
pulled back. A popup the page hid without `hide()` (no client rects) traps
nothing, and `destroy()` on an open popup drops its key handler, hides the popup
and releases its scroll lock.

For **2 seconds after opening**, focus that the page moves outside the popup
(Webflow's anchor scroll focuses the `#section` a link points to, after its
animation) is brought back to the close button / dialog — unless it went into
another modal layer. After that window the page's own focus moves are left
alone; Tab stays trapped as before.
| `video` | `null` | `true` · selector · `{…}` — wire a `<video>` inside the popup. See [Video popups](#video-popups) |
| `onOpen` / `onClose` | `null` | Callbacks |

### Video popups

`video: true` wires the first `<video>` in the popup: it plays on open, and
pauses / rewinds / re-mutes on close so the next open can autoplay again.

```html
<div id="popup-video" class="popup__overlay">
  <video class="popup__video" data-src="/film.mp4" controls muted playsinline preload="none"></video>
  <button d2-popup-unmute>Włącz dźwięk</button>
</div>
```

```js
digi2.popups.create('film', {
  popupSelector: '#popup-video',
  openAfterDelay: 30,
  cookieName: 'film_watched',
  cookieDurationDays: 7,
  video: { cookieOnEnd: true },     // 7 days of silence only once it's watched
})
```

`data-src` is copied to `src` on first open, so `preload="none"` really means
nothing is fetched until the popup appears. Autoplay needs `muted`; the unmute
button matters most on iOS, where native controls hide during playback. It is
found by `[d2-popup-unmute]` or `[data-popup="unmute"]`, shown while muted and
hidden after use.

| Key | Default | Description |
|---|---|---|
| `selector` | first `<video>` | Which element to wire |
| `unmuteSelector` | `[d2-popup-unmute], [data-popup="unmute"]` | Unmute button |
| `autoplay` | `true` | Play on open. A browser refusal is caught — controls still work |
| `resetOnClose` | `true` | Pause, rewind to 0 and re-mute on close |
| `cookieOnEnd` | `false` | Write the dismissal cookie when playback finishes. Implies `setCookieOnClose: false` unless you set it yourself |
| `closeOnEnd` | `false` | Close the popup when playback finishes |

Emits `popup:video-end` and `popup:video-unmute` on the bus.

### Sequencing two popups

A welcome popup followed by a video popup needs two things a single popup can't
express: don't stack them, and don't treat "closed" as "done".

```js
var welcome = digi2.popups.create('welcome', {
  popupSelector: '#popup-welcome',
  cookieName: 'popup_welcome_closed',
  openOnLoad: true,
  onClose: function () { video.showIfPending() },    // let the queued one through
})

var video = digi2.popups.create('video', {
  popupSelector: '#popup-video',
  cookieName: 'popup_video_watched',
  cookieDurationDays: 7,
  openAfterDelay: 30,
  setCookieOnClose: false,                     // dismissing it isn't "watched"
  canShow: function () { return !welcome.isVisible },
})

videoEl.addEventListener('ended', function () { video.markSeen() })  // now it is
```

`canShow()` returning `false` **parks** the request instead of dropping it — a
delay trigger fires exactly once, so without this the popup would never appear
at all. `showIfPending()` replays it and is a safe no-op otherwise.

| Method | Description |
|---|---|
| `showIfPending()` | Replay a `show()` that `canShow()` vetoed. Returns whether it opened |
| `markSeen()` | Write the dismissal cookie without closing — the other half of `setCookieOnClose: false` |
| `wasSeen()` | Already dismissed? `show()` ignores the cookie by design, so chain with `if (!other.wasSeen()) other.show()` |

### Repeating one popup — the `sequence` option

Showing the *same* popup a few times during a visit is just an option on the
popup itself — numbers are seconds, the first counting from arrival, each
next one from the previous **close**:

```js
digi2.popups.create('promo', {
  popupSelector: '#popup-promo',
  animation: 'fade',
  sequence: [4, { after: 60, afterPageChange: true }, 180, 180],
})
```

Four showings: 4 s in, a minute after moving to another page, then three
minutes after each close — and silence. Any entry may be a number or an object
(`{ after, afterPageChange }`).

> **Should it show to returning visitors?** Then use `cookieName: null`. A
> dismissal cookie still on the visitor's machine — typically written by an
> earlier version of the same popup — marks every step as already seen, so the
> chain runs to its end without showing anything. New visitors get the full run,
> returning ones get nothing, which reads as "it works for some people". The
> module warns in the console when it starts a sequence on a popup whose cookie
> is already set.

This implies `setCookieOnClose: false`, because a popup that repeats can't treat
"closed" as "done with it" — the dismissal would make every later showing skip
and you'd see the popup exactly once. Set the flag yourself to override that;
call `markSeen()` when the goal is genuinely met.

Each popup keeps its own progress, so two popups can repeat independently. All
the timing rules below apply — visible-time clock, surviving navigation, one
visit per session.

### Traffic targeting — show a popup only to one campaign

A popup can be scoped to the traffic it was written for:

```html
<div class="popup" d2-popup-utm="utm_source:facebook|instagram">…</div>
<div class="popup" d2-popup-utm-exclude="utm_medium:cpc">…</div>
```

Or from JS: `create('promo', { utm: 'utm_source:facebook', utmExclude: 'utm_medium:cpc' })`.

Grammar is the codebase's usual `key:value|value` — pipe is OR within the key,
matching is case-insensitive and exact (so `google` never matches `googleads`).
A bare key (`d2-popup-utm="utm_campaign"`) or `*` means "any non-empty value".
An exclude match beats an include match. No attribute at all means everyone,
exactly like `d2-popup-include`.

**The value survives navigation.** A campaign parameter only exists in the URL
of the landing page, so a gate that read the query string alone would go dark
the moment the visitor clicked through — taking `openAfterDelay`,
`openAfterPageViews` and sequences with it. The module reads the URL first and
falls back to a cookie it writes itself on first touch, under the same name
`forms.js` uses (`utm_source`, …), so both modules share one value instead of
keeping two copies. `utmCookie: false` turns that write off; `utmCookieDays`
(default 365) sets how long it lasts.

The key is not restricted to `utm_*` — `d2-popup-utm="ref:partner-a"` works for
any query parameter.

> These two attributes are read raw, not through the [responsive parser](#responsive-attributes),
> because a campaign value may legitimately contain `;` or `@`. Per-breakpoint
> values are meaningless here anyway — traffic source doesn't depend on viewport width.

**Where the gate sits:** URL filters first (they block everything, including
`digi2.popups.show()`), then traffic, then schedule, then promo, then a d2-ma
condition on the overlay (`d2-ma-show-*` / `d2-ma-hide-*`, d2-ma ma.5 — parked
like promo, d2-ma resumes it once the condition holds; no veto without d2-ma
on the page), then `canShow`.
A traffic mismatch is *not* parked for `showIfPending()` — unlike a promo that
ends or another popup closing, it can never resolve during the visit. It does
stop `show()` and `d2-show-popup` clicks: a popup written for one campaign
shouldn't open for someone else just because a button was clicked. With
`digi2.debug = true`, a refusal in `show()` names the gate that turned it down.

In a [sequence](#sequences--a-chain-across-the-whole-visit) a step whose popup
doesn't match the visitor's traffic is **skipped**, not waited on — the chain
carries on to the next step. Waiting would be waiting on something that cannot
change before the visit ends, and would take every later step down with it.

### Sequences — a chain across the whole visit

For a chain of **different** popups, `digi2.popups.sequence()` is the same
mechanism one level up. `openAfterDelay` starts counting at page load, so every
navigation resets it — it can't express "and three minutes after that one is
closed". A sequence can: one chain, stepping forward as the visitor moves
through the site.

```js
digi2.popups.sequence([
  { popup: 'welcome',    after: 4 },                          // 4 s after arriving
  { popup: 'oferta',     after: 60, afterPageChange: true },  // a minute into another page
  { popup: 'newsletter', after: 180 },                        // 3 min after the previous close
  { popup: 'kontakt',    after: 180 },                        // 3 min more — then silence
])
```

- **`after` counts from the previous step's close**, not from page load. Leave a
  popup open and the next one waits; the chain never stacks two popups.
- **The clock only runs while the tab is visible.** Someone who parks the tab for
  an hour comes back to where they were, not to the whole chain at once.
- **It survives navigation** (sessionStorage), and a new browser session starts
  the chain over.
- **`afterPageChange: true`** holds the step until the visitor opens a different
  page, and *then* starts its timer. Leaving with the popup still open counts as
  dismissing it — the chain moves on instead of waiting for a close that never
  comes.
- A step whose popup was already dismissed for good (its cookie is still set) is
  skipped rather than reopened. A step whose popup doesn't exist on the current
  page just waits — put a popup on one page only and the chain pauses until the
  visitor gets there.

Create the popups **without their own auto-triggers** — no `openOnLoad`, no
`openAfterDelay`. The sequence is what opens them:

```js
['welcome', 'oferta', 'newsletter', 'kontakt'].forEach(function (name) {
  digi2.popups.create(name, {
    popupSelector: '#popup-' + name,
    closeTriggerSelector: '#popup-' + name + ' [data-popup="close"]',
    cookieName: 'popup_' + name,        // ← one per popup, see below
  })
})
```

**One popup at a time — always.** Two modals on top of each other read as
broken: whichever one the visitor closes leaves the other behind, and it looks
like the close button did nothing. Who yields depends on who asked for it:

| Opened by | With another popup on screen |
|---|---|
| **automatically** — `openAfterDelay`, exit-intent, scroll, idle, page views, a sequence step | **waits.** It parks itself and opens ~0.6 s after the screen frees up. The promo does not cover the form the visitor is filling in, and does not close it either. |
| **the visitor** — a click on a trigger, `digi2.popups.show()`, an intercepted link | **wins.** What is on screen closes first and the new popup opens once that close has finished, so the two never overlap. |

A deferred popup re-runs the full check when its turn comes: a dismissal cookie
written while it waited, a schedule that has since closed or a `canShow()` veto
all still apply. It waits for the screen — it does not queue up a guaranteed
appearance.

An open **lightbox** counts as a busy screen too, for automatic opens only: they
park and come ~0.6 s after `lightbox:close`, and a sequence step waits the same
way. A popup the visitor asks for (a button inside the gallery, `d2-show-popup`)
still opens over the gallery.

"Is the lightbox open" is asked of the loader first: until the `lightbox` module
is loaded (`digi2._loaded.lightbox`), `digi2.lightbox` is the loader's proxy,
whose `isOpen()` would fetch the module and return a Promise — truthy, so on a
page without `d2-lightbox` every automatic popup used to park for a
`lightbox:close` that never comes (v1.8.1, fixed in v1.8.2). Only `isOpen() ===
true` counts as open; the check never pulls the lightbox module in.

**The page scroll lock always comes back off.** The lock is shared by every
popup and the lightbox (`digi2.scrollLock`, below) and released when the last
holder closes — but the release used
to hang on a `transitionend` that the browser does not always send (`display:
none`, reduced motion, a CSS override, a backgrounded tab) and that also fires
for transitions bubbling up from buttons *inside* the popup. Either way the
close stalled halfway: popup gone, lock still held, page dead to scrolling with
nothing on screen to close. The animation now settles on the popup's own event
or on a timer just past its duration, whichever lands first — and a close
arriving mid-open (an impatient click on the ✕) settles the open first instead
of being ignored.

**One scroll lock for popups and the lightbox — `digi2.scrollLock`.** Each popup
and the lightbox used to snapshot `body.style.overflow` on open and write it back
on close. A popup opened over the gallery snapshotted the gallery's `hidden`; the
visitor closed the gallery (restoring `""`), then the popup (restoring `hidden`),
and the page stayed locked with nothing open. Now both modules use one lock with a
set of owners:

```js
digi2.scrollLock.acquire(owner)   // first owner in: remember overflow, set "hidden"
digi2.scrollLock.release(owner)   // last owner out: put the remembered value back
digi2.scrollLock.isLocked()
digi2.scrollLock.owners()         // e.g. ['lightbox', 'popup:form#1']
```

- `acquire` is idempotent per owner and returns `false` on a repeat; `release` of an
  owner that holds nothing is a no-op, so nothing ever unlocks more than it locked.
- The restored value is the page's own value from before the **first** acquire,
  whatever the closing order.
- Popups use the owner `popup:<name>#<n>` (unique per instance, so a popup re-created
  under the same name never releases the old one's hold); the lightbox uses `lightbox`.
- Both modules carry the same implementation and install it only if
  `digi2.scrollLock` is not there yet, so the load order does not matter and each
  module still works on its own. Mixed versions (one module from before this change)
  fall back to the old per-module snapshot for that module.
- Any other script that covers the page (a full-screen map tooltip, a menu) should
  acquire/release with its own owner name instead of saving and restoring
  `overflow` itself, or it can write a stale `hidden` back over the shared lock.

`digi2.popups.destroy(name)` on an open (or fading) popup cancels the animation,
hides the element, releases its lock and lets a parked popup through. It fires no
`popup:close` / `onClose` — nobody closed it.

> **Give every popup its own `cookieName`.** The default is the same
> `popup_clicked` for all of them, so closing step one would mark the rest as
> seen and the chain would skip to the end. The module warns in the console if
> it spots two steps sharing a cookie.

**Repeating one popup across steps** works too — list it more than once — but it
needs `setCookieOnClose: false`. Closing a popup marks it dismissed for the rest
of the page life (in memory, whatever `cookieName` says), and the later step
would skip it as already seen. With that flag the close is no longer "done with
it", so the chain can bring it back; call `markSeen()` yourself when the goal is
actually met.

| Method | Description |
|---|---|
| `sequence(steps, opts)` | Start a chain. `opts.storageKey` runs a second, independent chain |
| `status()` | `{ step, popup, elapsed, dueAt, waitingForClose, done }` — for debugging |
| `stop()` | Stop on this page; a reload resumes where it left off |
| `reset()` | Forget the progress and start from step one |

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
| Repeated across the visit | `sequence: [4, 60, 180]` — see [Repeating one popup](#repeating-one-popup--the-sequence-option) |
| Chained with other popups | `digi2.popups.sequence([…])` — see [Sequences](#sequences--a-chain-across-the-whole-visit) |
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
| Held until an intro ends | `startOn: 'intro:done'` — not a trigger; it moves the starting line of the ones above. See [Waiting for an intro](#waiting-for-an-intro--the-starton-option) |

### API

```js
digi2.popups.create('name', options)
digi2.popups.show('name')
digi2.popups.close('name')            // sets cookie
digi2.popups.close('name', false)     // no cookie
digi2.popups.get('name')
digi2.popups.destroy('name')         // an open popup is hidden, its scroll lock released
digi2.popups.list()
```

### Requiring a few pages first — `minPageViews`

`openAfterPageViews: 2` *is* the trigger: it opens the moment the second page loads, and it cannot
be combined with a delay (the triggers are an either/or chain). When the rule is "they have been
around a bit **and** stayed a while", use the gate instead:

```js
digi2.popups.create('oferta', {
  openAfterDelay: 30,   // 30 s on the page…
  minPageViews: 2,      // …and not before the second page of the visit
  cookieName: 'popup_oferta_seen',
  cookieDurationDays: 3,
})
```

In the Designer: `d2-popup-min-pageviews="2"` on the popup wrapper (`data-d2-` prefix works too).

It holds back **automatic** opens only. A click on `d2-show-popup`, `openTriggerSelector` or
`digi2.popups.show()` still opens the popup — a button that does nothing on page one is worse than
a popup shown early. A blocked automatic open is dropped rather than parked: the count only moves
on navigation, and that means a new document with fresh triggers anyway.

The counter lives in `sessionStorage` under `sessionStorageKey` (default `popupPageViews`) and
counts one view per **document**, however many popups that document carries.

### Waiting for an intro — the `startOn` option

A page that opens with a loader animation breaks every timed trigger. `openAfterDelay: 7`
counts from page load, so on a six-second intro the popup opens behind the curtain and has
already been sitting there a second by the time the animation lifts. `startOn` moves the
starting line:

```js
digi2.popups.create('promo', {
  popupSelector: '#popup-promo',
  startOn: 'intro:done',   // wait for the milestone
  openAfterDelay: 7,       // …then count seven seconds
})

// wherever the animation finishes:
digi2.signal('intro:done')
```

In the Designer, without touching the site's JS:

| Attribute | Element | Value |
|---|---|---|
| `d2-popup-start-on` | popup wrapper | `intro:done` |
| `d2-popup-start-timeout` | popup wrapper | `12` (seconds) or `never` |

The name is arbitrary — `startOn` waits for whatever string it is given, so one page can gate
on `'intro:done'` and another on `'video:ended'`. Both attributes take the `data-d2-` prefix too.

**Three sources, because whoever owns the animation is rarely whoever owns the popup:**

| From | Code |
|---|---|
| digi2 bus (preferred) | `digi2.signal('intro:done')` |
| window | `window.dispatchEvent(new CustomEvent('intro:done'))` |
| document | `document.dispatchEvent(new CustomEvent('intro:done'))` |

`digi2.signal()` is the one to reach for because it is **remembered**. `emit()` reaches only
whoever is already subscribed, and modules are fetched asynchronously — an intro that finishes
before `popups.js` lands would emit into an empty room, and the gate would never open. The read
side of the same mechanism is `digi2.when(name, fn)` (runs once, immediately if the signal
already fired, and returns an unsubscribe fn) and `digi2.signalled(name)`.

**The failsafe.** An animation can simply not arrive: a plugin that 404s, a reduced-motion
visitor whose intro never plays, an error three lines earlier. Losing every automatic popup on
the page to that is worse than opening a little early, so the gate opens on its own after
**10 seconds**.

| Value | Failsafe |
|---|---|
| `startOn: 'intro:done'` | 10 s |
| `startOn: { event: 'intro:done', timeout: 12 }` | 12 s |
| `startOn: { event: 'intro:done', timeout: false }` | none — waits indefinitely |
| `d2-popup-start-timeout="never"` | none |

Set it a little longer than the animation actually runs; a gate that opens early is the bug
being fixed here.

**What the gate holds back.** Only what the *page* decided on its own: `openOnLoad`,
`openAfterDelay`, `openOnExitIntent`, `openAfterPageViews`, `openAfterIdle`,
`openAfterScrollPercent`, `openAfterScrollPastElement`, `openOnScrollSpeed`, `openOnTabBlur`,
and a [sequence](#sequences--a-chain-across-the-whole-visit)'s clock. Everything the *visitor*
reaches for stays live — `d2-show-popup`, `openTriggerSelector`, `digi2.popups.show()`, hover,
outside click, rage click, select abandon, intercepted links. Somebody who clicks has asked for
the popup, and an intro covering the screen is exactly when nobody is clicking anything anyway.

A sequence takes it as an option of its own, and the time spent waiting is not credited to the
visit — the clock starts when the gate opens:

```js
digi2.popups.sequence([
  { popup: 'welcome', after: 4 },
  { popup: 'oferta',  after: 60, afterPageChange: true },
], { startOn: 'intro:done' })
```

With a `sequence` passed to `create()`, the popup's own `startOn` covers the chain as well.

Without `startOn` nothing changes: the gate is already open and every trigger is wired exactly
as before.

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
- To scope a popup by **where the visitor came from** rather than which page they're on, see [Traffic targeting](#traffic-targeting--show-a-popup-only-to-one-campaign) (`d2-popup-utm`).

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

## Promo

Elements on the page follow a promotion running in 2destate. Turn the campaign
on and the promo bar appears; let it end and the page goes back to normal on its
own — no republish, nobody clicking at midnight.

```html
<script src="https://cdn.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@latest/dist/digi2-loader.min.js"
  d2-promo="https://api.2destate.com/api/v1/projects/<PROJECT_ID>/promo-state"
  d2-popups
></script>

<!-- Promo bar: only while a campaign runs -->
<div d2-promo-when="active">Sale on now</div>

<!-- Newsletter popup: stands down while it runs -->
<div class="popup__overlay" d2-promo-when="inactive"> … </div>

<!-- Narrowed to one campaign, one tag, or a floor on discounted products -->
<div d2-promo-when="active" d2-promo-campaign="autumn-sale"> … </div>
<div d2-promo-when="active" d2-promo-tag="special-offer"> … </div>
<div d2-promo-when="active" d2-promo-min-products="5"> … </div>
```

### Attributes

| Attribute | Element | Description |
|---|---|---|
| `d2-promo="<url>"` | `<script>` | Endpoint returning the project's promotion state |
| `d2-promo-state` | `<script>` | State baked into the page: `active`, `inactive`, or the JSON payload |
| `d2-promo-when` | any | `active` shows while conditions hold, `inactive` hides |
| `d2-promo-campaign` | any | Campaign key from 2destate |
| `d2-promo-tag` | any | Tag key carried by a discounted product |
| `d2-promo-min-products` | any | Minimum number of discounted products |

Conditions on one element combine with AND. With none of them, the plain fact
that a campaign is running decides.

### API

```js
digi2.promo.state()            // { active, campaigns, tags, product_count, valid_until }
digi2.promo.isActive('autumn-sale')  // true while that campaign runs
digi2.promo.hasTag('special-offer')  // true when a discounted product carries it
digi2.promo.refresh()          // ask 2destate again, bypassing the browser cache
digi2.promo.apply()            // re-apply after adding elements yourself
```

### How the state gets there

Three paths, in order, so nothing flashes and nothing blocks:

1. **`d2-promo-state`** — baked into the page, true from the first frame.
2. **localStorage** — what the last visit saw, painted instantly.
3. **fetch** — the truth, which replaces both.

The response carries `valid_until`: the midnight at which the state actually
changes. The module sets one timer for that moment instead of polling. A failed
request leaves the page looking exactly as it does with no promotion running —
the site is never held hostage by an API.

### Popups

A popup carrying `d2-promo-when="inactive"` will not open while the promotion
runs — not on load, not on exit intent, not from `digi2.popups.show()`, not from
a `d2-show-popup` click. The request is parked, so `showIfPending()` releases it
once the promotion ends.

### Preview

`?d2-promo-preview=<campaign-key>` forces that campaign on, `=on` forces a
generic promotion, `=off` forces everything off. Marketing can check the promo
version of the page before midnight without touching the campaign.

### Sandbox

`sandbox/promo.html` is a full page wired up this way — promo bar, popup,
buttons and sections, with a live readout of the state. `sandbox/imagemappro.html`
does the same around an embedded map.

---

## Marketing Automation (d2-ma)

> **Demo — contract v0.** The format lives in the engine repo,
> `docs/architecture/marketing-automation.md` §13, and may change without a
> transition period until spec M1. Load a pinned build (`@v1.9.0-ma.1` or a
> commit). A new tag that becomes `@latest` reaches every client site at once,
> and this module is not ready for that.

The page remembers which units a visitor looked at, keeps the profile in the
visitor's own browser and runs the scenarios published from digi2.app.

```html
<script src="https://cdn.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@v1.9.0-ma.1/dist/digi2-loader.min.js"
  d2-ma="https://digi2.app/api/ma/scenario/osiedle-demo.json"
  d2-ma-consent-required="true"
  d2-popups
></script>
```

| Loader attribute | Default | Description |
|---|---|---|
| `d2-ma="<url>"` | — | Scenario envelope (§13.3). Empty = `digi2.ma.load()` from JS — **ma.31:** the module waits for the first `load()` before it opens the database and counts the visit (so `return_visit` sees the scenarios); an envelope passed before start is kept; without `load()` it starts with no envelope after 10 s — so with consent known a page view shorter than 10 s without `load()` isn't counted, and after that fallback start `return_visit` runs without scenarios. The protection against overwriting covers only an envelope from `load()` given before start or while the attribute's envelope is being fetched; with a non-empty `d2-ma`, a `load()` called before the module boots is replaced by the attribute's envelope. **ma.23:** only `https://digi2.app/…` or `https://api.2destate.com/…` (no port, no login) — any other address, also in `digi2.ma.load(url)`, is not fetched: `console.warn`, the page runs without MA. A local JSON for tests goes in as an object: `digi2.ma.load({…})` |
| `d2-ma-consent-required` | required | Fallback when the envelope can't be read; `"true"` forces consent regardless |
| `d2-ma-consent` | `analytics_storage` | Consent Mode category that unlocks storage |
| `d2-ma-products-api` | `https://api.2destate.com/api/v1` | Fresh status before a popup |
| `d2-ma-highlight` | off | Highlight units with the preferred room count on the 2destate map |
| `d2-ma-refresh="30"` | off | Re-read the envelope every N s (≥ 5) |
| `d2-ma-context="off"` | on | Switch off the [lead context fields](#lead-context-in-forms-ma16-1313) in forms |
| `d2-ma-search-events="off"` | on | Switch off the GA4 events of the 2destate search (ma.17) |

The envelope URL is read raw, not through `digi2.attr()`: a query string may
contain `;` or `@`.

**ma.39:** every envelope fetch (start, `load(url)`, `reload()`, `d2-ma-refresh`)
adds `?s=ma.N&e=<engine>` to the request, not to the stored URL. `e` is
`2destate` or `3destate`, left out while no engine is visible (the map script may
still be on its way). No visitor id, `credentials: 'omit'`. **This request runs
before consent** and always has: the envelope carries `consentRequired`, so it
can't wait for it. The server sees the browser's IP and origin as with any
request, so anything it stores from `s` / `e` should be aggregated, without the IP.
The server must accept the extra parameters. Versions before ma.39 send the bare URL.

Consent is read from whatever banner the page has, as long as it speaks
Consent Mode. The first source that knows the category decides (ma.31 order —
see the three states below):

1. A `gtag('consent', 'update', {...})` command in the `dataLayer`, including
   one pushed before the module started (a CMP restoring a saved choice). An
   `update` that denies the category deletes the `d2ma` database.
2. An `update` in the Google tag's own consent state (`google_tag_data.ics`).
   This is where a CMP template inside GTM writes without a `gtag` command. It
   is checked again on every `dataLayer` event, so a grant or a denial made
   this way applies at the CMP's next event, in the same visit. `update: false`
   is an explicit denial.
3. The choice saved by the `google` module (`d2-gtm`, `localStorage`
   `consentModeV2`) — the visitor's own decision. The module replays it as a
   `default` on start, so it is read before every `default`; a saved denial
   deletes the database. Without a saved choice it is skipped (the module's
   `get()` would return its built-in denials, which are no decision).
4. A grant in the Google tag's `default` (already accounts for `region`).
5. A `default` with `region` or a denied `default` never grants and never
   deletes: consent stays **unknown** and the module waits. A regional grant is
   never taken, and a general grant never overrides a regional `default`.
6. A granted `gtag('consent', 'default', {...})` without `region`.

Only real `gtag()` commands count (an `arguments` object). A plain array
`['consent', …]` is ignored, because the Google tag doesn't run it either. A
denial that arrives while the database is opening keeps it closed.

Either an envelope with `consentRequired: true` or the attribute
`d2-ma-consent-required="true"` makes consent required. The attribute can
force consent but never switch it off. `demoState` follows only the envelope,
so a demo envelope with `false` plus the attribute `"true"` waits for the
banner and then runs with the demo data. Before consent nothing is stored and
no action runs. Events seen while waiting are dropped, not replayed, including
ones seen while the envelope was loading.

**ma.31: three consent states** (Piotr's decision, 28.10.2026: "Trzy stany +
2 bezpieczniki"). A CMP loaded through GTM (Cookiebot and the like) sends its
`update` 30 ms to 5 s after the module starts, and ma.29 counted that gap as a
refusal: a returning visitor who had consented lost the profile on every page.

| State | When | What happens |
|---|---|---|
| granted | `update` granted (`dataLayer` or the Google tag), Google tag `default` granted, `default` granted without `region`, a saved choice of the `google` module | the database opens |
| denied | an explicit refusal: `gtag('consent', 'update', … 'denied')`, `update: false` in `google_tag_data.ics`, a refusal saved by the `google` module | the database is deleted — at start and also while the module waits |
| unknown | nothing yet, or only `default` denied (also with `region`) — a CMP template in GTM always sets that before the banner | the database is not opened, read, written or deleted; the module waits for an `update` |

Two safeguards while consent is unknown. The module reads only the `state`
record (like `peekState` for revoke) and deletes the database when: (a) it was
never opened with consent — `state.consentAt` is missing (collected while
consent wasn't required, or before ma.31: such databases go once), or (b) the
last opening with consent is older than the retention (`storage.retentionDays`,
90), so retention also applies to a visitor who never answers the banner again.
There is no "delete after N seconds" timeout. An envelope that switches to
`consentRequired: true` mid-visit deletes the database only on a refusal or
when it was opened without consent.

> **On a client site always put `d2-ma-consent-required="true"` on the tag.**
> Without the attribute the envelope decides, and an envelope published with
> `consentRequired: false` (a demo setting, a panel mistake) would switch
> consent off for that site. With `"true"` the page needs consent whatever the
> envelope says. `d2-ma-consent-required="false"` is for our demo copy only.
>
> **Demo only:** `d2-ma-refresh` and `demoState` (`timeScale`, CRM call result).
> A client site doesn't poll the envelope, and with consent required the module
> ignores `demoState` anyway.

### Sources → `unit_view`

| Source | How |
|---|---|
| 3D Estate | wraps `dataLayer.push` and listens to **one** name, `oa3de__unit-open` (the app pushes every event twice; `oa3de_unit_open` is ignored). Entries already in `dataLayer` when the module loads are read too |
| 3D Estate deep link | `?sm-unit=` on load — the app sends no `unit-open` then. Saved with `unitId` and `url` only (`partial`); the first full event of that unit fills the gaps in place |
| 2destate | `window.d2estate.onProductClick`; polls for `d2estate` up to 30 s and listens to `2destateLoaded` |
| Other | `digi2.ma.track(unit)` |
| Lead | `generate_lead` or `oa3de__contact-form-make-inquiry` |

Normalised shape: `{ unitId, name, rooms, floor, area, price, pricePerSqm,
building, status, isPromo, url, image, source }`. `url` is never the page
address as it stands: it is `origin + pathname + ?sm-unit=<id>` (3D Estate) or
`?d2-unit=<id>` (2destate), and a URL passed to `track()` keeps only those two
parameters — `gclid`, `fbclid`, UTM or an `?email=` from a campaign link never
reach `d2ma` or the webhook. 3D Estate statuses map by
number (`1` available, `2` reserved, `3` or `isNotAvailable` sold, other →
`other`) because the names are the developer's own dictionary. 2destate price is
`promo_price_gross` while `promo_active`, else `price_gross`; `building` is
`building_name` when the map sends it, otherwise `null`; `image` is read from
the registry field `obrazek-popup`, then `marketing_image` / `image`;
`promoText` (`d2-ma-field="promoText"`) from the registry field
`haslo-promocji`. The map sends registry fields both flat and under `fields`,
while Products API v2 sends them only under `fields`, so both places are read. Only string values count; anything else (an object
from the API) is treated as missing. Products API has a different model than
the map (no `building_name`, a `building_id` instead), so a popup takes only
the changing fields from it: `status`, price, promotion, `image` and
`promoText`. Name, building and the rest stay as recorded from the map click,
and an empty fresh field doesn't overwrite a stored one, except `promoText` and
`image`. A promotion removed in 2destate must not keep showing from
IndexedDB, so an empty slogan or image from a successful fresh read (map or
API) clears the stored one. From the API this happens only when the row
carries a `fields` object; without it the registry state is unknown and
nothing is cleared. A failed read, or a row without `id`, keeps the stored
unit. `promoText` is read only while the promotion is on (`promo_active`). The
slogan field stays in the 2destate registry after a promotion ends, and a
switched-off promotion never shows it.
Registry keys in 2destate must contain a hyphen, so the
earlier guess `popup_image` can't exist and is no longer read. The same `unitId` within 5 s counts once (two apps on a page,
or the double push).

### Storage

IndexedDB `d2ma`, three stores: `views` (key `id`), `counters` (record
`profile`), `state` (record `main`). The module loads everything into memory at
start, works in memory and writes through, one write at a time — so `clear()`
can never be overtaken by a write issued before it. No IndexedDB (private mode,
blocked) → an in-memory store; the page behaves the same, the profile lives
until reload.

- **Visit:** a new one after 30 min without activity (page load, unit view,
  click / key / scroll / touch, throttled to one write per 15 s). A timer that
  runs a deferred action is not activity and doesn't extend the visit.
- **Profile:** computed from history on demand — `pref.rooms` is the most
  viewed room count, a tie goes to the most recently viewed; same for
  `pref.floor`.
- **Retention:** `storage.retentionDays` (90), pruned at start; at most 2000
  views. The `state` record too: a profile not seen for longer than that starts
  over with a new `visitorId`, and older path steps and frequency records go.
- **Consent:** with `consentRequired` and no consent nothing is recorded — not
  even into a buffer to replay later — and an existing `d2ma` is deleted (a
  database from before consent was required, or an envelope switched to
  `consentRequired: true` while the page is open). `consent:updated` granting
  the category starts the module; withdrawing it deletes the database.
- **`visitorId`:** `crypto.randomUUID()` — the only identifier that leaves the
  page (webhook body).

### Scenario engine (§13.3a)

Each event (`unit_view`, `return_visit`, `lead`, `crm_call_result`, and from ma.4
`exit_intent`, `engagement`, `form_abandon`) runs through
the active scenarios in envelope order. A node's progress is `{ at, unit,
segment }` in `state.scenarios[scenarioId].nodes`.

- **Arming:** a root trigger is always armed; any other trigger is armed once a
  predecessor is done, and only events strictly after that moment count (rule 1
  and 2) — the same millisecond is not "after". An event of a visit is always
  after the visit start (a view that opened it, a deep link buffered before the
  store opened), and a CRM result read at page load counts as just before it, so
  "no answer → came back" works within one load. A condition or action reached by an event
  is stamped with `max(event time, now)`, so the view that started a path is
  never counted again by a trigger after that action. Counting triggers count views since then — a root counts the whole
  history.
- **Same event, two triggers:** the firing set is decided on the state *before*
  the event, so a trigger armed by another trigger that fired on this very
  event waits for the next one.
- **Path unit:** the unit of the view that fired the nearest unit trigger,
  carried along the path; a path without one uses the last viewed unit.
  `once_per_unit` keys on it, the popup shows it, the webhook sends it.
- **Frequency** per scenario + node: `visit` (visit number), `units` (list),
  `at` (time). A skipped action marks itself done and its successors run at
  once (rule 6). Popups record frequency when the decision is made and undo it
  if the unit turns out to be sold — otherwise a popup deferred from the last
  visit and the same popup from a new trigger could both open.
- **`delayMinutes`:** stored in `state.pending` with `due` and `created`; a
  timer runs it while the page is open, otherwise the next start does. Void 24 h
  after `created` (real time, `timeScale` doesn't shorten it).
- **Popup conflict:** one popup per event pass; the next one is stored with
  `afterVisit` and runs on a later visit. (ma.27) A pass is one interaction,
  not one `dispatch()`: `handle()` shares it between the visit start
  (`return_visit` from `touch()`), the event itself and the `runDue()` after
  it; the page open shares it between the CRM event, the visit, the buffered
  events and `runDue()`; `simulateReturn()` and the activity listener the same.
  Before, a click that opened a new visit and also met a view trigger showed
  two popups. `pass.popup` is set when the popup is *decided*, not when it is
  shown: a popup skipped later (unit sold, popup on screen) still sends a
  second popup of the same interaction to the next visit.
- **Popup on screen (ma.27):** the scenario popup opens with
  `show({ auto: true, park: false })`. If another popup is on screen (or the
  popups module refused for any other reason), it is not parked — popups.js
  would otherwise open it ~0.6 s after the other one closes, as a second popup
  for the same interaction. It counts as skipped: frequency entry undone, no
  `ma:action`. (ma.32) `ma:action` for a popup fires only when this `show()`
  turned it from hidden to visible. The same popup already on screen, or still
  closing (`_onScreen`), is skipped before its content is touched — before,
  `fill()` swapped the visible popup's unit and it counted as shown.
- **Map tooltip (ma.6):** on a phone the first tap on a 2destate unit opens the
  map's full-screen tooltip (`.imp-tooltips-container.is-fullscreen`).
  (ma.27) Image Map Pro keeps that class on the closed container
  (`display: none`), so "open" means the container is actually shown —
  computed `display` / `visibility`, a client rect and a non-zero size. With
  no such container at all (desktop) the popup opens at once; with one, it
  first waits 500 ms, because the tooltip opens just after the popup decision
  made by the same tap. A
  popup due at that moment waits (checked every 250 ms) until the visitor
  closes it, so they see the unit they tapped first. After 5 minutes with the
  tooltip still open (clock time, not ticks — background tabs slow timers)
  the popup is dropped and its frequency entry is undone, so it can come next
  time. "Clear" or a consent wipe while it waits (or while the fresh status is
  being read) bumps a profile epoch and cancels the wait: no popup from a
  deleted profile, also after consent is given again. One popup waits per
  template — a newer one replaces it; with `once_per_unit` only the replaced
  popup's own unit is given back, and a popup replaced by another node or
  scenario gets its frequency entry undone (it never showed).
- **Popup from a panel template (ma.7, §13.9.3):** when the page has no
  `[d2-ma-popup="<template>"]` of its own and the envelope carries
  `templates.popup[]` with that `templateId`, the module builds the popup from
  it instead of the built-in card. The page's own element always wins (it is
  only filled through `[d2-ma-field]`).
  - `blocks` (≤ 8, the rest ignored): `title` (`text` ≤ 80, `fallback` ≤ 160),
    `text` (≤ 300, `fallback`), `image` (`src`: `{{unit.image}}` or `https:` on
    the page host / `media.digi2.app`; `alt` ≤ 120), `cta` (`label` ≤ 40,
    `action`: `open_unit` | `contact` | `link`). A `link` `href` must be
    `https:` on **the page's own host** (`host`, port included) and carry no
    user name or password — the envelope is public JSON, and a button to
    another site in the client's own look would be a phishing tool. Not even
    `*.2destate.com`: `{slug}.booking.2destate.com` hosts other clients'
    portals. Anything else drops the block with `console.warn`; 2destate is
    reached through `open_unit`. `contact` has no address of its own: the click doesn't
    jump to `#`. Texts
    may use the §13.9.2 fields; a field without a value shows `fallback` or
    drops the block — never "null". The popup's CTA behaviour comes from the
    template's `cta` block.
  - **Buttons with actions (ma.37, contract with 2destate 2.11.2026):** up to
    **2** `cta` blocks per template; the third and later are dropped with
    `console.warn` (the panel rejects them on publish). `action` is a closed
    list: `open_unit`, `contact`, `link` (as above), `filter_rooms`,
    `scroll_to`, `close`; anything else drops the block. `href` only with
    `link`, `target` only with `scroll_to` (elsewhere: warning, ignored).
    - `filter_rooms`: `d2estate.setFilters(map, { rooms: [pref.rooms] })` on
      every 2destate map, like `prefer_filters by: rooms`, but with
      `{ source: "user" }` — it is the visitor's click. ImageMapPro 2destate
      1.7.1 and later record it as the visitor's filter (`search_filter`
      trigger, GA4 search events). An older package ignores the option and
      records `source: "api"`: no `search_filter`, no GA4 search event, and a
      rooms field the visitor touched stays (`skipped`, logged). The page
      loads the 2destate package (usually `@latest`, browser cache up to 7
      days), not d2-ma, so both cases happen in the field. Closes the
      popup and scrolls to the results list (`[data-imp-detached-menu]`)
      either way. Without `pref.rooms` (a number ≥ 1) the button is not
      rendered.
    - `scroll_to`: `target` `"#id"` (`#[A-Za-z][\w-]{0,60}`, nothing else);
      closes the popup and scrolls to the element.
    - `close`: closes the popup only.
    - For 5 s after a template button click no scenario popup opens (it is
      skipped and gives its frequency back): with ImageMapPro ≥ 1.7.1
      `filter_rooms` is the visitor's filter, and a `search_filter` scenario
      would otherwise open another popup 500 ms after this one closed.
    - `contact` closes the popup and scrolls to the contact form: the first
      `[d2-ma-contact]` (alias `data-d2-ma-contact`), else `#kontakt`; with
      neither it only closes. Only in a popup built from a panel template —
      the built-in popups and a page's own `[d2-ma-popup]` keep closing only
      (their page handles the form itself, e.g. the demo footer script).
    - Each button takes its action from its own block: `open_unit` gets the
      unit's address, `link` keeps its `href`, in any order.
    - Scrolling waits 450 ms: the popup gives back the page scroll as it
      closes, and scrolling earlier would be undone.
    - Every template button click: `ma:action` `{ do: "popup_cta", action,
      template }` and `dataLayer` `{ event: "ma_popup_cta", action }` — no
      visitor data; 2destate scoring does not count it. The built-in
      `promo-filter` button (`contact`) carries the same marker and pushes the
      event too; a page's own `[d2-ma-popup]` buttons do not.
  - `layout`: `position` `center` | `bottom-right` | `bottom` | `top`, `size`
    `sm` (320 px) | `md` (380) | `lg` (520).
  - `style`: only page tokens, `token:<name>` → `var(--<name>, <fallback>)`
    (ma.38: the fallback is the unstyled look — `#fff` background, `#1a1d1c`
    text and CTA, `inherit` font — so a page without these CSS variables gets
    a readable white card, not a transparent one): `background`
    (dialog background), `text` (colour), `accent` (CTA background), `font`
    (font family), and `radius` `none` | `sm` | `md` | `lg`
    (`var(--radius-sm|md|lg)`, falling back to 6 / 14 / 22 px). Webflow
    variables are usually named differently (e.g. `--_radius---md`), so the
    page either defines `--radius-sm|md|lg` once (Site Settings → Custom Code:
    `:root { --radius-md: var(--_radius---md); }`) or lives with the fallback.
    No HEX or other values (MA-D22).
  - Everything is `createElement` + `textContent`, styles through
    `style.setProperty` on that whitelist only. Unknown fields → `console.warn`
    and ignored; an invalid block is dropped; a template without a valid block
    is dropped; `templates` over 100 KB → popup templates ignored.
  - ma.8: a new envelope revision (`d2-ma-refresh`, `digi2.ma.load()`) with a
    changed template rebuilds the popup on its next show — the old shell had
    the old position, size and style. Focus, Tab, Esc and the dialog labels
    come from the popups module (`manageFocus`, `closeOnEsc`).
- **Fresh status:** from `d2estate.getProducts()` when the map is on the page,
  else `POST {api}/projects/{project2destate}/products` with `product_ids` (only
  for 2destate UUIDs, 3 s timeout). Sold or no longer returned → no popup. A
  failed request falls back to the stored unit.
- **`crm_call_result`:** `demoState.crmCallSeq` is read at start and on
  `reload()` / `load()`. Arming a CRM trigger snapshots the current seq; it fires
  when a later seq arrives with the matching `result`. A root CRM trigger only
  snapshots on first sight, so a result already sitting in the envelope isn't
  new. `minDurationSec` needs `demoState.crmCallDurationSec`, which the
  contract doesn't define yet — without it the node doesn't fire.
- **New `revision`:** the scenario's progress, frequency and deferred actions
  start over. A root `unit_view` / `type_view` back-fills from history without
  running actions, so "viewed → came back" works on the first return after
  publishing.
- **Validation:** unknown `type` / `event` / `do` / channel / datalayer event,
  or a popup template that isn't a plain name → node skipped with
  `console.warn`. A node with no edges is ignored; a non-trigger with no
  incoming edge is ignored with a warning. `version` ≠ `"0"` → no scenario,
  history still recorded. The successors of a skipped node never run (its
  branch stops); other branches of the same node do. An unknown **condition
  key** is ignored and the path goes on — so new filters live in `when` of new
  triggers, never in `if` (§13.8.1): an older script stops at the trigger it
  doesn't know instead of letting the action through. `minScript` higher than
  `ma.4` → `console.warn`, nothing else.
- **`cooldownMinutes`** (0–10080) on any action: minimum gap between its runs
  in this scenario, across visits, on top of `frequency`. Shortened by
  `timeScale` like `once_per_days`.

### Time in the demo

`demoState.timeScale` (1–3600) divides `afterHours`, `delayMinutes`,
`once_per_days` **and the 30-minute visit gap**. The contract names the first
three; without the gap a one-minute `afterHours` would still wait half an hour
for a new visit. `simulateReturn()` adds `max(gap, longest afterHours) + 1 s`
to a clock offset kept in `state.shift` and starts the visit, so everything
behaves as if that time had passed — deferred actions included.

### Actions

- **popup** — `digi2.popups.create('d2-ma-<template>', { popupSelector, cookieName: null, dataTagTrigger: false })`
  on `[d2-ma-popup="<template>"]` or a built-in card, then `show({ auto: true })`,
  so it waits its turn behind anything on screen. Values go in via `textContent`
  only. `image` goes into `src` only when it is `https:`; the CTA `href` only when
  it is `https:` or the page's own origin — otherwise the image is hidden and
  the link keeps its own `href`. Built-in labels exist for `last-unit` and
  `promo-rooms`.
- **datalayer** — `{ event, segment, ma_scenario }`. From ma.4 also
  `ma_exit_intent`, `ma_engaged` (+ `seconds`, `scroll_pct` from the trigger),
  `ma_form_abandon` (+ `form_id`) and `ma_content` (+ `slot`, `template_id`
  from the content action before it). Those carry `segment` only when the node
  has `params.segment`, and only `ma_segment` / `ma_segment_exit` change the
  profile's segment.
- **webhook** — `POST` JSON `{ scenarioId, revision, nodeId, channel, template,
  unit, segment, visitorId, testOnly: true, ts }`, `keepalive`, no credentials.
  Refused without `testOnly: true` on the node, and for anything but
  `https://` (or `http://localhost` for testing). Channels: `email`, `sms`,
  `ai_call`. A channel with any `via` (§13.10) is never sent from the page —
  `console.warn`, the branch goes on: per MA-D30 (Piotr, 20.10) the browser
  never orders an e-mail, SMS or call; only a lead on our side does. There is
  no `sales_notify` channel (unknown channel → node skipped). The address is
  public: rate limits, template whitelist and recipients are Make's job
  (§13.4).
- **content** (ma.4) — `slot` + exactly one of `text` (≤ 160 chars) or
  `templateId`. Fields in double braces, the §13.9.2 list: `{{pref.rooms}}`,
  `{{pref.floor}}`, `{{pref.roomsLabel}}`, `{{unit.name}}`, `{{unit.rooms}}`,
  `{{unit.roomsLabel}}`, `{{unit.floor}}`, `{{unit.area}}`, `{{unit.price}}`,
  `{{unit.pricePerSqm}}`, `{{unit.building}}`. `roomsLabel` declines the noun
  ("1 pokój", "2 pokoje", "5 pokoi", "12 pokoi", "22 pokoje"); area and prices
  are formatted as in the popup. A field outside the list (also
  `{{unit.image}}` and the not-yet-existing `{{unit.promoText}}`) makes the node
  invalid at compile time, with `console.warn`. `templateId` comes from the
  envelope's `templates.content[]` (`{ templateId, text }`, the panel's
  library, validated like `text`); the built-in ones are only a fallback. Written with `textContent` into every
  `[d2-ma-slot="<slot>"]`; the original text comes back on `clear()` and when
  consent is withdrawn. A field without a value, an unknown field or no slot
  on the page → nothing changes **and the branch stops**, so a following
  `ma_content` never reports a change that didn't happen. Built-in fallback
  templates: `pref-rooms` ("{{pref.roomsLabel}} — wybrane dla Ciebie"),
  `last-unit` ("Wróć do lokalu {{unit.name}}"), `last-unit-price`
  ("{{unit.name}} — {{unit.price}}"). A content action skipped by `frequency`
  still hands its `slot` to a following `ma_content`.
- **`templates.popup[].design` (ma.41)** — every field is copied only from a closed
  list; a bad value is warned about and dropped, the template stays, and envelope text
  never reaches a style.

  | Field | Values | Effect |
  |---|---|---|
  | `placement` | `center`, `side-left`, `side-right`, `bar-bottom`, `bar-top`, `slide-in` | Beats `layout.position`. `side-*`: full height, scrolls, radius 0. `bar-*`: full width row, radius 0, image blocks are 48 px thumbnails |
  | `colors.background`, `.text`, `.accent`, `.accentText`, `.overlay` | hex 3, 6 or 8 | Beat `style` and tokens |
  | `backgroundImage.src`, `.fit`, `.scrim` | `{{unit.image}}` or `mediaUrl()`; `cover`, `contain`; 0-80 | Window background under a dark layer |
  | `typography.font`, `.titleSize`, `.textSize`, `.align` | `inherit`, `sans`, `serif`, `mono`; `sm`-`xl` (18/22/28/34 px); `sm`-`lg` (14/16/18 px); `left`, `center` | |
  | `radiusPx` | 0-40 | Beats `style.radius` |
  | `cta.shape`, `.variant`, `.fullWidth` | `square`, `rounded`, `pill`; `solid`, `outline`; bool | |
  | `imageLayout` | `top`, `left`, `right` | `left` / `right`: first image with a valid URL goes to a 40% column, one column at ≤ 480 px; none valid = `top` |
  | `spacing` | `compact`, `normal`, `roomy` | Padding 14/16, 20/22, 32/34 px |
  | `overlay` | `none`, `light`, `dark` | `none`: page stays clickable and scrollable (`lockScrollOnShow: false`) |
  | `behavior.delaySeconds` | 0-120 | Wait at the start of `showPopup`, so all its checks run afterwards. A newer trigger for the template replaces the waiting one; leaving the page or a removed scenario returns the frequency; `clear()` or consent withdrawal drops it. In memory only, and steps after the popup have already run |
  | `behavior.closeButton` | bool | `false` removes × only when a `close` button actually rendered |
  | `behavior.closeOnOverlay` | bool | `false`: a capture listener on the overlay, registered before `popups.create`, stops the click. No `popups.js` option, because that module can come from another version on `@latest` |
  | `behavior.animation` | `none`, `fade`, `slide` | Own `<style>`, only under `prefers-reduced-motion: no-preference` |

  With `overlay: "none"` the dialog keeps `aria-modal` and the Tab trap from `popups.js`,
  as the contract asks, though the page behind stays usable by mouse.
- **`templates.content[].action` (ma.41)** — a plain `{ templateId, text }` stays a
  string in the library and goes through `setSlot` as before. With `action` or `selector`
  it is an object: unknown action, a selector outside the `SELECTOR_RE` subset of
  `ma_content_schema.py` (forbidden tags, `.imp-`, `.d2-ma-`, ≤ 120 chars) or an invalid
  value skips the template. Target: `selector`, else `[d2-ma-slot]` of the step, through
  `querySelectorAll` in `try/catch`, at most 20 elements, never inside or around a
  `[d2-ma-popup]`. The forbidden tag list also applies to the matched element, because
  `.body` (Webflow's default class) hits `<body>`. `attr` value and `image.alt` take no fields.
  None = the branch ends, as for an empty slot. The step still needs `slot` for
  `validNode`.

  | `action` | Effect |
  |---|---|
  | `text` | `textContent`, fields through `contentText`; with a selector the element's children return on undo |
  | `html` | `rich[]` (`text`, `bold`, `italic`, `href`, `br`) built with `createElement` and text nodes, never `innerHTML`. A run with a field without value skips the step; a bad `href` (`safePageLink`) leaves plain text |
  | `image` | `mediaUrl`; `IMG` gets `src` / `alt` and loses `srcset` / `sizes` (they would keep the old file), another element gets an `img` |
  | `hide` | `d2-ma-hidden` and `display: none !important` |
  | `show` | `d2-ma-shown`, removes inline `display`; still hidden by page CSS: `display: revert`. On `[d2-ma-cond]` the computed `display` stays inline with `!important`, because `applyConditions` takes the marker away on the next render |
  | `attr` | `alt`, `title`, `aria-label`, `href` (`safePageLink`), `src` (`mediaUrl`) |

  Every change goes to `slotOriginals`, per element and per attribute, so `clear()`,
  consent withdrawal and a new revision of the scenario that last changed the element
  undo them. Plain slot text (`action: "text"` without a selector) doesn't undo on a
  new revision, as before.
- **Engine (ma.39)** — `engine()` is the one place that tells `2destate` from
  `3destate`: the 2destate API first, then 3destate traces
  (`AppLauncher3DEOAConfig`, `#sm3de`, the launcher script, any `oa3de*` event),
  then a 2destate package still loading. On 3destate `map_mark`, `map_order`
  and (ma.40) `prefer_filters` don't run: `ma:action { status: "skipped", reason:
  "engine_3destate" }`, once per page view, frequency not used, `delayMinutes`
  ignored, the branch goes on. ma.39 alone tried `props.unitFilterOverride` for
  `prefer_filters`; removed in ma.40, which is the version to pin.
  On either engine their frequency is recorded only after the action ran (no
  map, map still loading, nothing matching, `markProducts` returning 0 on every map,
  visitor's own sort: free for the next trigger, without `ma:action`). `delayMinutes`
  doesn't use it either (also `prefer_filters`): a second trigger is recognised by the
  queue of deferred actions. One trigger per node waits for the map; replaying
  `every_time` doesn't touch frequency.
- **map_mark** (ma.4) — 2destate only. Ranks `d2estate.getProducts()` against
  the profile: matching rooms count 2, matching floor 1 (`by`: `rooms`,
  `floor`, `both` — both first, then rooms, then floor), sold units out, within
  a group the order of `getProducts()`; takes `limit` (1–20, default 5). With
  `d2estate.markProducts(mapName, ids, { className })` it marks them all.
  `className` must match `^(?!imp-|d2-ma-)[a-z0-9-]{1,40}$` — `imp-*` are the
  map's own classes (`imp-object-hidden` would hide units) — else the default
  `d2-preferred`; `null` back
  means the map applies it after load, `0` means nothing matched. Without
  `markProducts` (2destate 1.6.9): `ImageMapPro.changeArtboard` to the best
  unit's floor and `highlightObject` on it, no tooltip. An empty
  `getProducts()` waits for `onMapLoad`; no 2destate on the page →
  `console.info`, the branch goes on.

### Map (`d2-ma-highlight`, CTA)

The object for a product is found by walking `ImageMapPro.instances[map].store.state.artboards`
for `assigned_product`. `highlightObject()` switches the map to the object's
artboard, and in imagemappro an object or a group off the current artboard can
stall its queue. So the highlight covers single shapes on the artboard on
screen only, never groups, once per artboard + room count. Back-to-back calls
drop shapes, so the module queues them one `requestAnimationFrame` apart and
drops queued shapes whose artboard is no longer on screen. A floor change
clears highlights (so does hovering a shape), and the module puts them back on
`onFloorChange`, but only when the map's artboard actually changed:
`highlightObject` fires `onFloorChange` itself, even on the same floor, and
re-applying on that would loop. A map that was never highlighted (a new
visitor whose room preference formed during this visit) counts as changed.
`highlightObject` looks a title up across the whole map, so a shape whose
title repeats on another artboard is skipped, because it could switch the floor
(group titles don't count; with `d2-debug` the log says how many were skipped). The popup CTA for a 2destate unit with the map on the page calls
`highlightObject` + `showTooltip` instead of navigating; the link it carries
(`?d2-unit=<id>`) does the same after load on another page.

### Contract v1 triggers (ma.4, §13.8)

Listeners go on only when an active scenario of the envelope has that trigger,
and only after the store opened with consent — a client page without these
nodes gets no extra listener. Before consent nothing is collected.

- **`exit_intent`** — `mouseout` with no `relatedTarget` and `clientY ≤ 0`,
  once a visit (`state.exitVisit`). No listener when
  `matchMedia('(hover: none)')` matches: touch screens have no reliable exit
  signal.
- **`engagement`** — `minSeconds` (active time on this page view, counted only
  while `visibilityState` is not `hidden`), `minScrollPct` (deepest scroll,
  `scrollY / (scrollHeight − innerHeight)`; a page that doesn't scroll is 100),
  optional `utm: { source?, medium?, campaign? }`. At least one of the three,
  else the node is skipped. One timer to the nearest threshold, no polling.
  Each trigger fires once a page view. UTM is read from `utm_source`,
  `utm_medium`, `utm_campaign` only (≤ 100 chars), stored as `state.utm` when
  a visit starts and kept for the whole visit; lists match case-insensitively,
  every given list must match, one value in a list is enough. `minSeconds: 0,
  minScrollPct: 0` + `utm` = "came from the campaign", fires on load.
- **`form_abandon`** — `focusin` / `input` / `change` on a field of a `form`
  (not hidden, submit or button; not inside `[d2-ma-ignore]`), then no
  `submit` and `idleSeconds` (10–600, default 60) without activity, or
  `pagehide`. `formIds` limits it to forms by `id`, `data-name` or `name`;
  only a missing field means "any form" — present, it must be a list of 1–20
  names (1–80 chars), else the node is skipped with `console.warn` (an empty
  list or a bare string never widens it to every form). A click counts even
  without focus (Safari doesn't focus checkboxes, radios and selects).
  Once per form per visit — the visit it was abandoned in (`state.abandoned`).
  On `pagehide` nothing is sent: the module only stores the fact in
  `state.formExits` (`formId`, `data-name`, number of fields, time) and runs
  the branch on the next page view, like a deferred action, void after 24 h —
  no webhook, no `dataLayer`, no `sendBeacon` while the page closes. Only the
  form id, its `data-name` and the number of fields touched leave the
  listener — never values or field names. The `pagehide` write is best effort:
  a tab closed outright may not get the IndexedDB write committed, and then
  that abandonment is simply not counted.

`clear()` and a consent wipe also reset the page's signals (form timers,
fired `engagement` triggers), so a trigger can fire again on the same page.

### Hot lead comes back (ma.12, MA-D38 stage 1, variant D′)

Demo and agency test leads only (Piotr, 21.10.2026). Engine spec:
`docs/architecture/ma-hot-lead-2destate.md` §6.2. Opt-in with
`d2-ma-hot-lead` on the loader tag; its value is the 2destate API base, empty =
`https://api.2destate.com/api/v1`. **ma.23:** only `https://api.2destate.com/…` —
any other host (there is no 2destate staging with `/public/ma/*`), `http`, a port or a
login means no `/visit` and no `/revoke` request at all, with one `console.warn`
(ma.13 fell back to production instead).

- **Link:** instead of a signed lead token, 2destate gets the `d2ma`
  `visitorId` with the form, field `d2ma_visitor_id`. The page takes it from
  `digi2.ma.visitorId()` or from a hidden `input[d2-ma-visitor-id]`, which the
  module fills on `submit` in the capture phase (before the page's handler).
  Without consent, or without the attribute, it is `null` / empty — since
  ma.35 also with `consentRequired: false` (consent not known yet counts as no
  consent; until ma.34 the id went out there without consent). The module
  never submits or blocks the form.
- **Real lead token (ma.36):** a form script that posts the inquiry to 2destate
  itself (`/webhooks/s/{slug}` from the browser) gets `ma_token` in the
  response and hands it over with `digi2.ma.leadToken(token)` or a `window`
  `CustomEvent('d2:lead-token', { detail: { token } })` — never `dataLayer`
  (the token would reach GTM and third-party tags). The token is opaque; the
  module reads only `exp` and `site` from its payload. It is kept only with
  consent (also with `consentRequired: false`; consent not known yet = no):
  without it, expired, `site` ≠ `location.origin` or not `payload.signature`
  in base64url (≤ 2048 chars) → `false` and nothing is stored. An accepted
  token links the browser in this visit (replacing a `visitorId` link), and
  return visits send `/visit` with `{ token }` instead of `{ visitorId }` —
  never both (the server answers 422). 401 or 403 drops the token and the
  link, no retry. Past `exp` the link goes and no `/visit` is sent, but the
  token stays (`revokeOnly`) for a later `/revoke` — the server deletes the
  history on an expired token too. Such a token does not block a later
  `visitorId` link (an agency test lead in the same browser) and goes only
  with the profile's retention or "Clear". "Clear", refusal and withdrawal send
  `/revoke { token }`, plus `/revoke { visitorId }` when the id also went to
  a form. A second token replaces the first **without** `/revoke`: revoke
  works per person and would wipe the new lead's history as well; the old
  pseudonym expires on its own. Before the database opens (start of the page,
  envelope not loaded yet) `leadToken()` returns `false` and the token is
  lost, so call it after the inquiry response, not on page load. The token
  never shows in `profile()`, `context()` or the lead context fields, and the
  debug log masks it. The browser cannot tell a real lead from an agency test
  lead, so `d2ma_visitor_id` stays on the form; 2destate never links a real
  lead on it.
- **Refusal after the id went out (ma.35, `consentRequired: false`):** the
  database stays, but the link does not: `/revoke {visitorId}` and the local
  link (`idShared`, `hotLead`) goes, also when the refusal came between visits
  (caught on the next page view), and the browser gets a **new** `visitorId`
  (ma.36; the rest of the profile stays) — `profile().visitorId` and
  `visitorId()` return the new one, so a page that kept the old value must
  read it again. 2destate never links a revoked id to
  a new lead, so without the new id a later form would link locally, get 401
  and never link again. Consent given later does not bring the old link back;
  only a new form with a lead does. With `consentRequired: true` the refusal
  deletes the whole database with `/revoke`, as before.
- **MA-D30:** the browser is linked only when, **in the same visit**, the id
  was handed out *and* a lead was recorded (`generate_lead`, the 3D Estate
  inquiry, `digi2.ma.lead()`), in either order. A failed submit with no lead
  links nothing, so a visitor 2destate doesn't know never sends signals.
- **Visit signal:** `POST {api}/public/ma/visit` with
  `{ visitorId, units, pageviews, source: "return_visit" }` — up to 20
  unique 2destate unit ids (UUID) viewed this visit (ma.24: always sent, `[]`
  when none — the 2destate server requires the field and answers 422 without it),
  page views of the visit (1–50). Once per visit, then only when new units
  were viewed and at most every 5 minutes. Never in the form's visit. No form
  data; UTM and the landing path only in `touchpoint` (ma.37, below);
  `credentials: 'omit'`, JSON with a CORS preflight.
- **Visit source (ma.37, 2destate 4110bf3e):** `/visit` carries `touchpoint`,
  **one** touchpoints v1 entry (an `items[]` element from the section
  „Touchpoints — visit source history” below: `ts`, `click_type`, UTMs,
  `referrer_host`, `landing_path`; no `v` / `items`) — the first entry of
  this visit, i.e. its way in. Every POST of the visit (same `visitNo`) sends
  the same entry: the server keeps the one with the earliest `ts`, so a new
  campaign mid-visit (a second history entry) does not change it. Consent
  given during the visit: the entry has the visit's start time, like the
  history. No source history consent (`openedWithConsent`) or no entry for
  this visit → no `touchpoint` key. The server drops a bad entry and keeps
  the visit (202). It also skips the source when the project has no
  „lead context” scope (`is_context_allowed` in 2destate) — the visit counts,
  the source is not stored. The browser cannot see that scope and sends the
  entry anyway.
- **Behaviour events (ma.34):** every `/visit` also carries `visitNo`
  (`state.visits`) and `time_on_site_s` (0–14400, **active** time of this visit:
  tab visible and activity in the last 5 minutes, so it understates a visitor who
  reads without moving), plus `events` when anything happened:
  `{ list_view: {n}, map_view: {n}, price_history_view: {n, units?},
  card_download: {n, units?}, plan_dwell: {n, units?, dwell_s: {id: s}} }`. In
  `plan_dwell`, `units` and `n` cover only units at 180 s or more, because the server
  scores every listed unit at once; shorter times stay in `dwell_s`. `n` is
  capped at 50, lists at the 20 newest UUIDs, `dwell_s` at 3600. Each send is the
  **state of the whole visit**, not a delta; the server merges by
  `(visitorId, visitNo)`, taking the max per field, so a duplicate or lost send
  does no harm. Sources: `[d2-ma-event="map_view|list_view"]` in view for about
  1 s, once per visit; a click on `[d2-ma-event="card_download|price_history_view"]`
  with `d2-ma-unit="<uuid>"`; time in view of `[d2-ma-dwell][d2-ma-unit]`; a
  visitor's filter change (`list_view`); `digi2.ma.event(key, { unitId, seconds })`
  from a widget. In view means at least half of the element or half of the screen;
  with several `d2-ma-dwell` elements in view the second goes to the largest.
  Counted only for a linked lead on a return visit, with granted consent, also
  when the envelope says `consentRequired: false`, and not while the signal is
  paused or muted (403, 404, 422, 429, 503), because `/visit` is the only sender; behaviour before the lead doesn't reach the
  server. New events follow the 5-minute limit and leave at once when the tab is
  hidden or the page closes, at least 60 s after the last send; time alone leaves
  only then, after growing by 30 s. A state the server didn't take (network, 429,
  503) isn't retried on its own, and only events and time count as unsent, not the
  unit list: they go with the next send attempt. After a network error that is the
  next check on an open page or the next page view of that visit; after 429 or 503
  it waits out the block, then goes with the next page view, counted event or leaving
  the page. It is lost if the visit ends first. The same goes for a visit shorter than 60 s after the last
  send: an event right before leaving is lost. `/visit` needs granted consent, also with
  `consentRequired: false` (Piotr, 2.11.2026): without a decision nothing is sent
  until consent arrives, and an explicit refusal also deletes the counters.
  **Deploy the server first:** without the new fields it answers 422 and the
  module mutes the visit. An old visit's unsent last counters are dropped.
- **Answers:** 202 done; 401 (unknown, revoked or expired visitor) → link
  dropped; 403 (Origin off the project's list or lead not eligible — one code
  for both) → paused 24 h, link kept, since a wrong Origin is a setup error;
  404 (route not live) → paused 24 h, so an undeployed route isn't hit every
  5 minutes; 413 / 422 → no more signals this visit; 429 / 503 → wait
  `Retry-After` (1 h default); anything else → console warning.
- **"Clear" and consent withdrawn:** `POST {api}/public/ma/revoke
  {visitorId}` first, then the profile goes locally whatever the answer.
  Sent whenever the id was ever handed out (`idShared`), not only for a
  locally linked profile: 2destate links on `d2ma_visitor_id` alone, even
  when the page never saw the lead, and `/revoke` answers 204 for an unknown
  id, so it reveals nothing. Consent withdrawn between visits is found in
  `decide()` before the store is open: `wipe()` then reads only the `state`
  record of `d2ma` (`peekState()`), only to take the `visitorId` for
  `/revoke`, and clears it right after. A browser with no `d2ma` yet gets
  none: `peekState()` aborts `onupgradeneeded` instead of creating it (ma.15).
- **Attribute value:** anything that isn't `https://…` (a typo,
  `http://localhost`) logs a warning and falls back to production — on
  purpose, so a broken value never sends to an unchecked host.
- **Pinning:** load MA from a tag, `@v1.9.0-ma.N/dist/digi2-loader.min.js`,
  never `@latest`. jsDelivr resolves `@latest` per file: `dist/modules/ma.min.js`
  is missing from the latest stable tag, so `@latest` serves the newest tag that
  has it. Loader 1.8.0 doesn't know d2-ma and never asks for it.
- **Envelope from 2destate:** `d2-ma` already takes any URL, so switching the
  source is `d2-ma="https://api.2destate.com/api/v1/public/ma/scenario/<site>.json"`
  — same v0 shape, no code change.

### Page conditions (ma.5, §13.11.2a)

Personalisation decided in the browser from the `d2ma` profile, with attributes
on any element — no code, nothing sent anywhere. Every attribute also works as
`data-d2-ma-*`.

```html
<!-- d2-ma-cond marks every element with conditions (the page CSS hides it) -->
<!-- show when it matches; several attributes on one element = AND -->
<div d2-ma-cond d2-ma-show-visits="3+/30d" d2-ma-show-segment="2-pokoje|3-pokoje">…</div>
<!-- hide when it matches; a hide beats a show -->
<div d2-ma-cond d2-ma-hide-lead="true">…</div>
<!-- alternatives: the first matching variant wins, else "default" -->
<div d2-ma-variants>
  <h1 d2-ma-variant="2-pokoje" d2-ma-show-pref-rooms="2">Dwa pokoje dla Ciebie</h1>
  <h1 d2-ma-variant="3-pokoje" d2-ma-show-pref-rooms="3">Trzy pokoje dla Ciebie</h1>
  <h1 d2-ma-variant="default">Mieszkania w Pabianicach</h1>
</div>
```

| Key | Value | Meaning |
|---|---|---|
| `visits` | counter | visits (§13.2, 30 min of silence) |
| `views` | counter | units viewed |
| `views-rooms` / `views-floor` | `<value>:<counter>` | `3:2+` = 3-room units viewed ≥ 2 times; `-1:1+` = floor −1 |
| `views-unit` | `<unitId>:<counter>` | that unit (`[A-Za-z0-9._-]{1,64}`) |
| `segment` | `name\|name` | the profile has that segment |
| `lead` | `true` \| `false` | lead flag |
| `pref-rooms` / `pref-floor` | `2\|3`, `-1\|0` | the preference is exactly that |

Counter: `3+` at least 3, `3` exactly 3, `0` none, `0..2` at most 2; `/30d`
or `/12h` counts only that window (visits by the time they started, views by
their time); no window = the whole history. `|` is OR within a key; OR across
keys = two elements or variants. A minus is only ever a floor/rooms value,
never part of a counter.

- **Segments:** a `datalayer` action with `ma_segment` stores its segment in
  `state.segments` (name → time); `ma_segment_exit` removes **its own**
  `params.segment`. Without `params.segment` either action warns and changes
  nothing. Segments and visit starts (`state.visitLog`) follow
  `storage.retentionDays` like the history; "Clear" and a consent wipe drop
  them with the rest of the profile. They live in the `state` record of `d2ma`,
  not in a store of their own, so no IndexedDB upgrade for existing visitors.
- **The page hides, the module decides.** Every element with conditions carries
  the bare marker `d2-ma-cond` (CSS cannot select `[d2-ma-show-*]`). The module
  only sets attributes: `d2-ma-shown` when every show condition holds and no
  hide does (an element with only `d2-ma-hide-*` gets it while its exclusion
  doesn't match), `d2-ma-hidden` when a hide holds or a condition is malformed,
  and on variants `d2-ma-shown` on the chosen block plus `d2-ma-matched` on the
  container (variant blocks need no marker). An element with conditions but
  without `d2-ma-cond` — a typo in Webflow — gets `hidden` from the script and a
  `console.warn`, so conditional content never shows to everyone — though until
  the script runs it is visible for a moment, since the page CSS only knows
  `[d2-ma-cond]`. The script
  never injects `<style>` (CSP), so the page carries this CSS once (Webflow →
  Site Settings → Custom Code → Head):

  ```css
  [d2-ma-cond]:not([d2-ma-shown]),
  [d2-ma-variant]:not([d2-ma-variant="default"]):not([d2-ma-shown]),
  [d2-ma-variants][d2-ma-matched] > [d2-ma-variant="default"] { display: none; }
  ```
- **Fail-closed:** an unknown key or a malformed value (in show *or* hide) hides
  the element, with one `console.warn` per element.
- **No consent, no profile, or an older script:** no show condition matches, so
  the default content stays and the conditional blocks stay hidden by the CSS.
- **Popup:** conditions on a popup overlay veto its opening (see popups,
  "Where the gate sits"); the module calls `showIfPending()` on such a parked
  popup when its condition starts to hold. Triggers stay in the popup options.
  d2-ma asks the loader whether the popups module is in (`digi2._loaded.popups`)
  before it touches `digi2.popups` — before the module arrives that object is the
  loader's proxy, whose every method auto-loads the module and returns a Promise.
  A popups module that loads after d2-ma asks `digi2.ma.allows()` itself when
  it opens, so nothing is lost; an exception thrown by the popups module while
  resuming is logged (`popups resume failed`) and does not stop d2-ma.
- **When it runs:** on every profile change. Elements are collected once;
  after changing the DOM (a CMS list, a tab loaded later) call
  `digi2.ma.apply()`. `digi2.ma.allows(el)` answers for one element.
- **Preview:** `?d2-ma-preview=<name>` treats that segment / variant as matching
  — for checking the page in Webflow. It needs no consent, writes nothing to
  `d2ma` and pushes nothing to `dataLayer`. Anyone can add the parameter: these
  conditions are personalisation, **not access control** — never hide anything
  behind them that a visitor must not see.
- Limits (§13.11.4): one profile per device and browser; Safari (ITP) clears
  script storage after 7 days without interaction, so a `/30d` window on
  Safari sees about a week.

### Lead context in forms (ma.16, §13.13)

On submit of **every** form on the page (not inside `[d2-ma-ignore]`) the
module writes a hidden input `d2ma_context`: a Polish sentence for the sales
rep summarising what this visitor did on this site, ≤ 2 000 characters:

```
3 wizyty (18.10, 20.10, 21.10) · 5 obejrzanych lokali, najczęściej M12 (3 pok., 2 p., 64 m², 689 000 zł) ×3 · lokale: M12 ×3 (21.10 14:02), M8 ×1 (20.10 09:15), … · preferencja: 3 pokoje, 2 p. · segmenty: powrot-do-lokalu · lead: tak (20.10) · ostatni lokal: M12 · strona: /mieszkania/m12 · źródło: meta / cpc / jesien
```

A form with `d2-ma-context="json"` (opt-in — in Webflow's native e-mail the
JSON would be noise; the 2destate webhook wants it) also gets
`d2ma_context_json`, compact JSON ≤ 4 kB (UTF-8 bytes):

```json
{ "v": 1,
  "visits": [{ "t": "2026-10-21T12:02:11.000Z", "path": "/mieszkania/m12" }],
  "units": [{ "id": "A_M12", "name": "M12", "rooms": 3, "floor": 2, "area": 64, "price": 689000, "views": 3, "last": "2026-10-21T12:02:11.000Z" }],
  "pref": { "rooms": 3, "floor": 2 }, "segments": ["powrot-do-lokalu"],
  "last_unit": { "id": "A_M12", "name": "M12" }, "lead": true,
  "source": { "utm_source": "meta", "utm_medium": "cpc", "utm_campaign": "jesien" },
  "touchpoints": { "v": 1, "items": [ … ] } }
```

`touchpoints` (ma.33): visit source history, defined in
[Touchpoints](#touchpoints--visit-source-history-ma33-contract-v1).

| Case | Behaviour |
|---|---|
| Consent and a profile | Both values rebuilt at every submit from the profile (§13.2): visit starts (`visitLog`), views grouped per unit (newest data of the unit, count, last view), `pref`, segments, last unit, lead flag, this visit's UTM |
| No consent, or no profile yet | `d2ma_context` = `brak kontekstu (brak zgody)`; `d2ma_context_json` is not added (on a `d2-ma-context="json"` form a page's own field of that name is emptied) |
| Form without `d2-ma-context="json"` | A page's own `d2ma_context_json` field is neither filled nor emptied |
| `d2ma_consent` (ma.18) | `1` on every submit while the profile is active (same gate as `d2ma_context`) — the 2destate server stores the context only with it. Without consent the field is not added and a page's own field of that name is emptied |
| The form already has a field of that name | Its value is overwritten — never a second input |
| Too long | Text drops the oldest visit dates first (`…, 20.10, 21.10`), then the oldest units from the list; counts stay true. JSON drops the oldest visits, then the oldest units (keeps the 30 most recent units, 60 visits at most) |
| `path` | Known only for the current page (`location.pathname`) on the last visit entry — the module does not store page paths of earlier visits |
| What is never there | Values of this or other forms, IP, user agent, geolocation, anything from another site |
| Off | `d2-ma-context="off"` on the loader tag, or `[d2-ma-ignore]` on the form |

**When:** in the capture phase on `document`, on `submit` and on a click on a
submit button — so before Webflow's own handler (bubbling on the form) and
before d2-forms (capture on the form). `new FormData(form)` sees both fields;
a script that lists fields explicitly must add them. `digi2.ma.context()`
returns `{ text, json }` (`null` without consent) and
`digi2.ma.fillContext(form)` fills a form by hand, e.g. before building a
webhook body.

### Touchpoints — visit source history (ma.33, contract v1)

**This section is the only definition of `touchpoints` v1.** Other repos (the
2destate validator, lead card, chat preview, audiences tab) link here. Commission:
Piotr, 29.10.2026 — *„zapisywać, że ktoś raz wszedł z utm_source=google drugi
raz z utm_source=meta_ads trzeci raz z utm_source=tiktok itd. łącznie z
utm_campaign i wszystkimi innymi utm-ami po to żeby była historia”*; frame from
architekt-it.

```json
{ "v": 1, "items": [
  { "ts": "2026-10-20T10:00:00.000Z", "utm_source": "google", "utm_medium": "cpc",
    "utm_campaign": "jesien", "click_type": "gclid", "referrer_host": "www.google.com",
    "landing_path": "/oferta" },
  { "ts": "2026-10-22T18:30:00.000Z", "utm_source": "meta_ads", "utm_medium": "paid_social",
    "click_type": "fbclid", "referrer_host": "l.facebook.com", "landing_path": "/oferta" },
  { "ts": "2026-10-24T08:05:00.000Z", "click_type": "none", "landing_path": "/" } ] }
```

**A missing field means an empty value** (`null`): empty `utm_*` and
`referrer_host` are left out to save bytes in the 4 kB lead JSON; `ts` and
`click_type` are always there, `landing_path` whenever the page URL parses.
Readers (the 2destate validator) must treat an absent key exactly like `null`.
Entries stored before ma.38 pass the same filters on the way out
(`touchpoints()`, lead JSON, `/visit`).

| Field | Meaning |
|---|---|
| `ts` | Start of the touchpoint, ISO 8601 UTC |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `utm_id` | From the landing URL, trimmed, ≤ 100 characters. **Left out when empty.** A value with a non-printable character (control, format such as zero-width, a separator other than the plain space, e.g. a no-break space; Python `str.isprintable()` in 2destate) is `null` — the server would reject the whole entry (ma.38). Personal data is dropped (`null`): a value with `@` in any field; a phone-like value (`+48…`, digits grouped with spaces or dashes, or exactly 9 digits) only in `utm_content` / `utm_term`. `utm_campaign` and `utm_id` are never cleared for digits — campaign ids are long numbers (Google 10–11, Meta 18–19). The filter applies to touchpoints only; the visit's `source` and the `utm` trigger read the URL as before |
| `click_type` | `gclid` \| `gbraid` \| `wbraid` \| `dclid` \| `fbclid` \| `ttclid` \| `msclkid` \| `none` — which click id the URL had (first in that order). Closed list for v1. The id's value is never read into the profile. Always present |
| `referrer_host` | Host of `document.referrer`, lower case, only when it is another site — a page of this site (also `www.` ↔ no `www.`) is not a source. Left out when empty. A host over 100 characters or not a plain domain (IPv6 in brackets, `_` in a label) is `null`, not cut — a cut host would make 2destate reject the whole entry (ma.38) |
| `landing_path` | `location.pathname` of the page that made the entry — no query, no fragment, ≤ 200 characters; only for `http(s)` pages. A path with `@` (also `%40`), e.g. `/wypisz/jan@x.pl`, gives `null` — the entry stays (same rule in 2destate, review #271) |

| Rule | Behaviour |
|---|---|
| New entry | Every new visit (30 min without activity, the same gap as `visits`) — also a direct or referral visit, with `click_type: "none"` and no UTM. Inside a visit only a page view with another campaign: `utm_source` / `utm_medium` / `utm_campaign` differ from the last entry, or only the click id differs **and the referrer is another site or empty** (a `gclid` passed along internal links by GTM's `url_passthrough` is not a new ad click) |
| Once per page load | A page's source is considered once. A second visit within the same page load (tab left open 2 h, then a scroll) adds no entry — the URL still carries the old ad |
| Direct | A page view without UTM or click id inside a visit adds nothing — direct never overwrites the source |
| Internal link with a click id | A new visit that starts from a page of this site with a `gclid` passed along gets `click_type: "none"` |
| Known blind spot | A second ad click of the same platform inside a visit, with no UTM and the same click id kind, is not visible as a new entry |
| Limit | The 20 most recent entries; older ones drop off |
| Retention | Like the profile (`storage.retentionDays`, 90): older entries are pruned; a profile not seen for longer starts over |
| Consent | Only with **expressed** consent — also when the envelope doesn't require consent, since this is profiling (architekt-it's decision on #42). Without it `digi2.ma.touchpoints()` is `{ v: 1, items: [] }` and nothing is recorded; consent given later on the page adds this page's entry. A refusal deletes the history: with consent required the whole database goes (§13.2), without the requirement only `touchpoints` (and the consent marker) go and the rest of the profile stays. A refusal known before the database opens deletes the stored history too; consent not known yet leaves it (hidden). What already left the browser — a sent lead, a copy in the chat — does not disappear on refusal |
| Classification | The module records facts only. Telling organic from social, or a campaign from a referrer, is the reader's job (2destate keeps the dictionary); the module never guesses a campaign |

Where it goes:

- **Lead:** `d2ma_context_json` gets `touchpoints: { v: 1, items }` next to
  `visits`, `units`, `pref`… — at most the **10** most recent (the profile keeps
  20). When the JSON is over 4 kB the oldest touchpoints go first, then the
  oldest visits, then units: the 2destate server drops the whole
  `context_json` above 4096 B. `d2ma_context` (text) adds
  `źródła wizyt: google/cpc → meta_ads/paid_social → www.otodom.pl` (5 most
  recent; a visit without UTM shows its click id, referrer host or
  `bezpośrednio`).
- **JS:** `digi2.ma.touchpoints()` → `{ v, items }` — e.g. for the 2destate
  chat widget on a page with d2-ma.
- **Parser without storage:** `digi2.ma.parseTouchpoint(href, referrer)` →
  one entry without `ts` (all keys, `null` when empty, plus
  `referrer_internal: true|false` — a page of this site vs. no referrer, which
  both give `referrer_host: null`; this key is never stored or sent); with no
  arguments it reads this page. Pure: no consent needed, nothing stored — for a script that
  needs the same rules (chat widget, path C) instead of a copy.

### Form field analytics (ma.5, MA-D13)

With a `form_abandon` trigger in the envelope, and only after consent, the
module also measures each field of a form the visitor started — only forms the
trigger watches (its `formIds`; no `formIds` field = any form):

- **name** only from `name` / `data-name` or a static `<label for>` — never a
  placeholder or typed text; letters, digits, space, `_`, `-`, ≤ 40 chars
  (`\p{L}` built at runtime; a browser without Unicode regex falls back to
  Latin + Polish letters); a name that looks like an e-mail or a phone number
  becomes `pole-N`;
- **time on the field** (focus → blur, ms) and **focuses and clicks on that
  field** — a click that focuses the field counts once (`focusin` + `click`
  within 500 ms); nothing outside form fields;
- never values; `type="password"` / `hidden`, and any field or form inside
  `d2-ma-ignore`, are skipped; at most 20 fields per form.

On abandonment (idle) or on submit it pushes one `ma_form_field` per field —
`{ form_id, field_name, time_ms, clicks }` — once per form. When the visitor
leaves the page, the numbers go into the stored form exit and are pushed on the
next page view, like the scenario itself. `ma_form_abandon` from a `datalayer`
action carries `fields_touched` next to `form_id`.

### Image and video in `content` (ma.5, MA-D14)

`content` takes exactly one of `text`, `templateId`, `image` or `video`:

- **`image: { src, alt }`** — `src` `https:` on the page's host or the panel's
  image CDN (`media.digi2.app`, MA-D19), `alt` ≤ 120. A slot that is an `<img>`
  gets `src` / `alt`; any other slot gets an `<img>` built by the script in
  place of its children.
- **`video: { provider, id | src, poster? }`** — `youtube` (11-char id) and
  `vimeo` (numeric id) are embedded by the script as an `<iframe>`
  (`youtube-nocookie.com/embed/<id>`, `player.vimeo.com/video/<id>?dnt=1`,
  `sandbox="allow-scripts allow-same-origin allow-presentation"`,
  `referrerpolicy="strict-origin-when-cross-origin"`), and **only after
  marketing consent** (`ad_storage`) because the embed sets third-party
  cookies. `d2-ma-video-consent="ad_storage analytics_storage"` on the loader
  tag can only **add** categories (all must be granted); a list without
  `ad_storage` warns and still requires it — the same idea as
  `d2-ma-consent-required`, which can only force consent. Until then the slot shows the `poster` from
  the panel CDN (never a YouTube thumbnail) and "Wideo po zgodzie na
  ciasteczka"; a `gtag('consent', 'update', …)` granting it swaps in the player.
  `mp4` (`src` on the page host or the CDN) becomes a `<video controls>`.
  The page's CSP has to allow `frame-src` for `www.youtube-nocookie.com` /
  `player.vimeo.com`.
- Everything is built with `createElement`, never HTML from the envelope. A
  value outside these rules makes the node invalid with `console.warn`. "Clear"
  and a consent wipe put the slot's original children / `src` back.

### 2destate search: filters, sort, `prefer_filters` (ma.17, §13.14)

Needs 2destate core 1.7.0 (`onFilterChange`, `onSortChange`, `setFilters`,
`setProductOrder` on the result list). An older package simply has none of it —
nothing breaks, the new nodes are skipped.

| From core | d2-ma does |
|---|---|
| `onFilterChange({ mapName, filters: { rooms[], floor[], areaMin/Max, priceMin/Max, status[], building[] }, resultCount, resultIds, source })` | `source: "user"` only: profile state `filters` (last user filter), `filterLog` (≤ 50), event `search_filter`, GA4 `view_item_list`. `source: "api"` (a script, e.g. our `prefer_filters`) is ignored |
| `onSortChange({ mapName, sort: { by, dir }, source })` | A user sort (not `api`, not `by: "custom"` — that is our own `setProductOrder`) wins over the profile until the visit ends: `map_order` is skipped. GA4 `view_item_list` |
| `onProductClick(product, { mapName, source })` | As before (`unit_view`), plus GA4 `view_flat`; with `source: "list"` also `select_item` |

**Nodes**

- trigger `search_filter` — `when: { rooms?, floor?, minCount? }` (keys as
  `type_view`): the visitor's filter includes that room count / floor; no key =
  any filter. `minCount` counts matching filter changes after the previous step.
  There is no sort trigger.
- action `prefer_filters` — `by: rooms | floor | both`: `setFilters(map,
  { rooms: [pref.rooms], floor: [pref.floor] }, { source: "api" })`, once a visit
  by default. Skipped (without using its frequency) when the visitor already
  filtered in this visit or the profile has no preference; core does not
  overwrite a field the visitor touched. Waits for the map if it is not loaded yet.
- `map_order` — unchanged, now also orders the result list (core 1.7.0); skipped
  after a user sort in the visit.

**Profile:** `pref.rooms` / `pref.floor` fall back to the last user filter
**only while no unit has been viewed** — so a `{{pref.roomsLabel}}` popup works
from the first filter; the first view takes over. `digi2.ma.profile()` gets
`filters` and `sort`. The lead context gets `filtrował: 2–3 pokoje, do 700 000 zł,
tylko wolne` and `filters` in the JSON.

**Popup `promo-filter`** — built in like `promo-rooms`, but needs **no unit**:
„Szukasz mieszkania 2-pokojowego? Pokażemy wolne lokale i aktualne
promocje.”, CTA contact. The number is `pref.rooms` as an adjective in the
genitive, `N-pokojowego` for every N ≥ 1 (1-, 5-, 12-pokojowego — the hyphenated
form has no plural endings to get wrong); before ma.29 it said „2 pokoje”.
`pref.rooms` is always one number (a filter `[2, 3]` gives 2), so there is no
„2- lub 3-pokojowego”. Skipped without `pref.rooms` (or with 0). The adjective is
only for this built-in text — it is not an envelope field like `roomsLabel`. A `templates.popup[]`
entry with that id wins over the built-in one, and the page's own
`[d2-ma-popup="promo-filter"]` over both. Any envelope template without
`{{unit.*}}` now also opens when the path has no unit.

**GA4 events** (dataLayer, no visitor data, independent of the d2-ma profile
consent — GA4 consent is Consent Mode's job; `d2-ma-search-events="off"` on the
loader tag switches them off):

```js
{ event: 'view_item_list', item_list_name: 'wyszukiwarka',
  filters: 'rooms=2|3;floor=1;area=40-60;price=-700000;status=available;building=B',
  filter_count: 6, matching: 5, total: 120, item_list_sort: 'price_asc' }   // user filter/sort, debounced 500 ms
{ event: 'select_item', item_list_name: 'wyszukiwarka', item_id, item_name } // click in the result list
{ event: 'view_flat', flat_id, flat_name, flat_rooms, flat_rooms_group /* 1…4, 5+ */, flat_floor, flat_area,
  flat_type, flat_building, flat_availability, flat_price, flat_isPromo, view_source: 'wyszukiwarka' | 'mapa' }
```

Every contract key is in every push; a missing value is sent as `undefined`, not left out (ma.21) — a GTM Data Layer Variable reads the data model, so a missing key would keep the previous push's value. `item_list_sort` only for `price`, `area`, `floor` × `asc` / `desc` (ma.18) — for `rooms`, `name`, `custom` it is left out. A filter change reaches the profile and the scenarios once, after 500 ms of quiet (ma.18: a price slider is one `search_filter`, not ten). Only `source: "user"` counts — a missing `source` does not. A change still waiting for those 500 ms is written at once on form submit (so it is in the lead context — `search_filter` scenario actions may run at that moment), with the time of the last change (ma.19). On `pagehide` only the fact is stored in `d2ma` (ma.20): no scenario action at exit — no dataLayer push, webhook or popup, like form exits — and the trigger is not replayed on the next page; the filter stays in the profile, the lead context and `filterLog`. A list ordered `custom` (our own `setProductOrder`) sends no `view_item_list`, and the next list event has no `item_list_sort`. `digi2.ma.clear()` also resets the search: `setFilters(map, { rooms: null, floor: null, areaMin: null, areaMax: null, priceMin: null, priceMax: null, status: null, building: null }, { source: 'api' })` — explicit nulls, because core 1.7.0 merges filters and `{}` would change nothing; fields the visitor touched stay (ma.26). `prefer_filters` reads the `{ applied, skipped }` result: when nothing was applied (a touched field, no search panel) it does not count as done and tries again next visit (ma.26). `total` is `getProducts().length`; `flat_price` is
the promo price while a promotion runs.

### State actions: `every_time`, `map_order` (ma.5)

- **`frequency: "every_time"`** — only for `content`, `map_mark` and
  `map_order` (elsewhere → `console.warn`, `once_per_visit`). A changed text or
  a map mark lives until the page reloads; with `every_time` the module re-applies
  it on every page load once the path has reached that action (no frequency
  recorded, no further steps — it restores state, it is not a new event).
  Needs `minScript: "ma.5"`: ma.4 turns `every_time` into `once_per_visit`.
- **`map_order`** — `by`, `limit` (1–50, default 20): the same ranking as
  `map_mark` → `d2estate.setProductOrder(mapName, ids)` (the units first, the
  rest in their order; `null` = the map orders itself after load). Without
  `setProductOrder` (2destate before that release) → `console.info`, no
  fallback. "Clear" and a consent wipe call `setProductOrder(mapName, [])`.

### API

```js
digi2.ma.version            // ma.28: "ma.28" — the loaded script (same numbering as the envelope's minScript)
digi2.ma.profile()          // { visitorId, visits, lead, views, pref, lastUnit, segment, counters, tracking, store, timeScale }
                            // visitorId changes after a refusal once the id went out (ma.36) — read it fresh, don't cache it
digi2.ma.history()          // views, oldest first
digi2.ma.context()          // ma.16: { text, json } for the lead context fields, null without consent
digi2.ma.fillContext(form)  // ma.16: write d2ma_context (+ _json with d2-ma-context="json") now
digi2.ma.track(unit)        // another source
digi2.ma.lead()
digi2.ma.event('card_download', { unitId }) // ma.34, d2-ma-hot-lead: behaviour event, false if not accepted
digi2.ma.visitorId()        // ma.12, d2-ma-hot-lead: id for the 2destate form; null without consent; new after a refusal (ma.36)
digi2.ma.load(urlOrObject)  // read an envelope (URL only from digi2.app / api.2destate.com, ma.23)
digi2.ma.reload()
digi2.ma.simulateReturn()
digi2.ma.clear()            // Promise
digi2.ma.highlight()
digi2.ma.apply()            // ma.5: re-collect d2-ma-show-* / -hide- elements after a DOM change
digi2.ma.allows(el)         // ma.5: may this element show (used by popups)
// events: ma:ready { tracking, store }, ma:view { unit }, ma:action { scenarioId, nodeId, do, … }, ma:change
```

`ma:change` also fires when the module wipes the database for lack of consent:
`{ cleared: true, tracking: false, reason }`, where `reason` is
`consent withdrawn`, `consent withdrawn while opening`, `consent denied`,
`profile not opened with consent`, `consent older than retention` (ma.31; the
last two come from the safeguards while consent is unknown) or
`envelope now requires consent`. Before ma.31 `consent required` fired on
every start without known consent. After it `profile()` returns `null`.
Before this, a withdrawal mid-visit cleared the `[d2-ma-profile]` fields
without any event, so a page section with its own "no consent" state could
not tell. `digi2.ma.clear()` keeps emitting `{ cleared: true }`, with
tracking still on.

### Page elements

`[d2-ma-popup]` with `[d2-ma-field]`, `[d2-ma-cta]`, `[d2-ma-close]`;
`[d2-ma-profile]`, `[d2-ma-history]` (+ `[d2-ma-history-item]` template,
`d2-ma-history-limit`), `[d2-ma-clear]`, `[d2-ma-simulate-return]`,
`[d2-ma-map]`, and from ma.4 `[d2-ma-slot]`, `[d2-ma-ignore]`. Every one also works as `data-d2-ma-*`.

### Sandbox

`sandbox/ma.html` + `sandbox/ma-koperta.json` (loaded as an object with `digi2.ma.load(k)`, since ma.23 a relative URL is not fetched): fake units, both search engines
simulated, a lead button (no form), "phone result" buttons acting as the panel,
and a webhook that never leaves the browser.

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
| `MESSAGE` | required |
| `CONSENT_GDPR` | required (checkbox) |
| `CONSENT_EMAIL` | required (checkbox) |
| `CONSENT_PHONE` | required (checkbox) |

These apply **automatically** to any field carrying one of those names (`autoValidation`, on by default) — you don't have to list them in `validation`.

**Gotcha — `validation` extends these rules, it doesn't replace them.** Your entry is merged *on top* of the defaults per field, so a rule you don't mention survives:

```js
NAME: { required: false }                    // ❌ still enforces minLength: 2 + letters
NAME: { required: false, minLength: false }  // ✅ pass false to switch a default off
```

Same trap with the consent fields: they default to **required**, so an optional marketing consent must say so explicitly — `CONSENT_EMAIL: { required: false }`. To opt out of every default at once, set `autoValidation: false` and declare all rules yourself.

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

### Autofill looks like typing

Chrome and Safari repaint an autofilled field with their own background and text
colour — on a dark form that means pale blue boxes with dark text, next to
typed-in fields that look nothing like them. The module puts that right on every
form on the page, no `create()` needed: the background is painted over and the
text takes **the field's own colour** (`currentColor`), so a filled-in value is
indistinguishable from a typed one. The caret follows too.

Opt out with `d2-form-autofill="false"` on the form, a wrapper or `<body>`.

> The colour comes from the field, not from its parent. A wrapper styled grey
> around a white field used to turn every autofilled value grey — that was
> `inherit`, and it is fixed.

### Coming back from "Thank you"

Webflow's success state is terminal: it hides the `<form>` and leaves
`.w-form-done` up until the page reloads. On anything people submit more than
once — a booking widget, "report another", a form inside a popup that reopens —
that's the wrong resting state. Put the form back after N seconds:

```html
<div class="w-form" d2-form-reset="30">   <!-- seconds; a bare attribute = 30 -->
```

Or without touching the markup:

```js
digi2.forms.autoReset(30)                          // every .w-form on the page
digi2.forms.create('contact', { resetAfterSuccess: 30 })
digi2.forms.restore('#contact-form')               // right now, e.g. from a popup's onOpen
```

What a restore does: clears the fields, hides the success message, brings the
form back, and drops any validation error styling.

- **Hidden tracking values survive.** `form.reset()` restores DOM defaults, and
  for the injected `UTM_*`, `GCLID` and `IP_ADDRESS` fields that default is
  empty — they were written by JS, not by markup. They're carried across, so the
  next submission is still attributed.
- **An error state is treated differently.** Only the message goes; every field
  keeps what the visitor typed. Wiping a filled-in form because the server
  hiccuped would be its own bug.
- Detection watches Webflow's own show/hide (a `MutationObserver` on the
  wrapper), so it works regardless of how the form was submitted. Without
  `MutationObserver` the feature no-ops rather than guessing.

### Auto-Injected Hidden Inputs

Names are **uppercase** — this table used to list them lowercase with a
`_hidden` suffix, which is not what the module injects. Anything mapping these
by name (a CRM, a Make scenario) needs the names as written here.

| Input name | Source |
|---|---|
| `UTM_CAMPAIGN` | URL param → cookie |
| `UTM_SOURCE` | URL param → cookie |
| `UTM_MEDIUM` | URL param → cookie |
| `UTM_CONTENT` | URL param → cookie |
| `UTM_TERM` | URL param → cookie |
| `GCLID` / `FBCLID` / `MSCLKID` | URL param → cookie (skipped when empty) |
| `GOOGLE_ANALYTICS_ID` | `_ga` cookie |
| `PAGE_URL` / `PAGE_TITLE` / `PAGE_REFERRER` | Page meta |
| `IP_ADDRESS` | ipify — off by default (`ipTracking: true`) |
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
digi2.forms.autoReset(30, root)         // leave the success state after 30 s
digi2.forms.restore(formOrWrapper)      // put one form back right now
digi2.forms.refreshResets(root)         // re-scan [d2-form-reset] after injecting markup

var form = digi2.forms.get('contact')
form.validateAll()
form.clearErrors()
form.getData()
form.setField('field', 'value')
```

---

## Country Picker

One attribute on a phone field and it gets a country selector that puts the
dialing code into the number. No init call, no config:

```html
<input type="tel" name="PHONE" d2-country-picker>
```

That gives you 🇵🇱 +48 inside the field (absolutely positioned, so the field
keeps every style it has in the Designer), a searchable list of 245 countries
with Polish names, and a number that leaves as `+48 601 234 567`.

**Nothing is added to the payload.** The dialing code goes into the phone field
itself — no hidden inputs, no second field to map in your CRM.

### What it does on its own

| Moment | Behaviour |
|---|---|
| On load | Country from the attribute (`d2-country-picker="DE"`), or read from a number the field already holds, else Poland. The field is **not** pre-filled — a lone `+48` would make a `required` check think the visitor answered |
| While typing | Paste or type `+380…` and the flag follows the number |
| On blur | The typed number gets its prefix: `0601234567` → `+48 601234567` (the national trunk zero goes) |
| On submit | Normalised again in the capture phase, so `d2-forms` validates the final number |
| Switching country | Rewrites an existing prefix: PL → DE turns `+48 601…` into `+49 601…` |

### Options

```html
<input type="tel" name="PHONE"
       d2-country-picker="PL"
       d2-country-picker-preferred="PL|DE|UA"
       d2-country-picker-only="PL|DE|CZ|UA"
       d2-country-picker-search="false"
       d2-country-picker-flags="false">
```

| Attribute | Description |
|---|---|
| `d2-country-picker="PL"` | Country selected on load (ISO 3166-1 alpha-2). Empty = Poland |
| `d2-country-picker-preferred="PL\|DE"` | Pinned to the top of the list, in that order |
| `d2-country-picker-only="PL\|DE\|CZ"` | Restrict the list — e.g. the countries you actually sell to |
| `d2-country-picker-search="false"` | Hide the search box (it appears on its own for lists over 8 entries) |
| `d2-country-picker-flags="false"` | Dialing codes only. Worth knowing: **Windows has no emoji flags** and renders two letters instead, so on a Windows-heavy audience this is the safer look |
| `d2-country-picker-lang="en"` | List language: `pl` (default) or `en`. Without it the URL decides — see [Language](#language) |
| `d2-country-picker-layout="split"` | Flag as its own box **next to** the field instead of inside it — see [Two layouts](#two-layouts) |
| `d2-country-picker-toggle="PHONE"` | **On your own element**, not the field: that element becomes the picker — see [Your own toggle](#your-own-toggle-built-in-the-designer) |
| `d2-country-picker-flag` / `-dial` | Slots inside your toggle the module writes the flag and the code into |
| `d2-country-picker-mode="separate"` | Keep the field digits-only and send the code in a hidden input instead — see [Two modes](#two-modes) |
| `d2-country-picker-dial-field="PHONE_DIAL"` | Name of the hidden dialing-code field (separate mode; default `<pole>_DIAL`) |
| `d2-country-picker-country-field="PHONE_COUNTRY"` | Name of the hidden country field (default `<pole>_COUNTRY`) |

Any one of these switches the picker on — a field carrying only
`d2-country-picker-mode="separate"` works, the bare `d2-country-picker` is not required.

### Your own toggle, built in the Designer

The two layouts above draw the button for you. When the design is specific — your
own flag box, your own arrow icon, your own spacing — build it in Webflow and
hand it to the module instead. Put `d2-country-picker-toggle` on **your element**
with the phone field's `name` as the value:

```html
<label>
  <span>Telefon</span>
  <div class="row">                                  <!-- your flex row -->

    <div class="country-box" d2-country-picker-toggle="PHONE">
      <span d2-country-picker-flag></span>
      <span d2-country-picker-dial></span>
      <svg class="my-caret">…</svg>                   <!-- your own arrow -->
    </div>

    <input type="tel" name="PHONE" d2-country-picker="PL">
  </div>
</label>
```

What the module does — and does not do:

- **The field is not wrapped, not moved and not padded.** Your row, your classes,
  your spacing stay exactly as built.
- It writes the flag into `[d2-country-picker-flag]` and the code into
  `[d2-country-picker-dial]`. No slots? It prepends its own two spans and leaves
  the rest of your markup (arrow, icon, divider) where it is.
- The list is appended **inside** your element and positioned from it (the module
  sets `position: relative` only if yours is `static`).
- A `<div>` or a Link Block gets `role="button"` and `tabindex="0"`, and answers
  to Enter / Space. A real `<button>` gets `type="button"` so it can't submit.
- Leave the value empty (`d2-country-picker-toggle`) and it takes the phone field
  in the same `<label>` or `<form>`. With several fields, name them.

**In Webflow:** Div Block next to the field → Element settings → Custom attributes
→ `d2-country-picker-toggle` = `PHONE`. Inside it two Text Blocks with
`d2-country-picker-flag` and `d2-country-picker-dial` (leave them empty — the
module fills them), plus your arrow. On the field itself `d2-country-picker` =
`PL`. Then `d2-country-picker` in the loader tag, and publish.

### Language

The list ships with Polish and English names and picks the language by itself:

1. `d2-country-picker-lang="en"` on the field (or on `<html>`) — wins over everything,
2. the **URL**: any `/en` segment switches to English, `/pl` back to Polish — a
   bilingual Webflow site needs nothing else,
3. `<html lang>`,
4. Polish.

Sorting follows the names on screen (`Czechy` sits under C in Polish, `Czechia`
under C in English but `Germany` moves from N to G), and so do the search
placeholder, the empty state and the button's `aria-label`.

**Search matches both languages regardless of what is displayed** — someone
typing "Germany" into a Polish list still finds Niemcy, and "niemcy" in an
English one still finds Germany. Codes work too: `DE`, `+49`, `49`.

```js
digi2.countryPicker.countries('en')   // [{ iso:'DE', dial:'49', name:'Germany', pl:'Niemcy', en:'Germany' }, …]
digi2.countryPicker.language()        // what the module detected on this page
```

### Two layouts

**`inside` (default)** — the flag sits inside the field, intl-tel-input style. The
module measures its button and pads the field from the left so the number never
runs under it.

**`split`** — flag with a caret on the left as its own box, the number field on
the right:

```html
<label>
  <span>Telefon</span>
  <input type="tel" name="PHONE" placeholder="601 234 567"
         d2-country-picker="PL" d2-country-picker-layout="split">
</label>
```

In Webflow that is just the phone field inside your label plus one attribute —
the module wraps the field in a flex row on its own, puts the button **before**
it in the DOM (so Tab reaches the country first, then the number) and stretches
both to the same height. It never touches the field's own padding here.

Style the button to match your field by overriding `.d2-cp-toggle` — border,
radius, background, width. E.g. to make it look like the input next to it:

```css
.d2-cp-split .d2-cp-toggle {
  border: 1px solid var(--white-smoke);
  border-radius: 8px;
  min-height: 50px;
  padding-inline: 1rem;
}
```

### Two modes

| | `prefix` (default) | `separate` |
|---|---|---|
| Field value | `+48 601 234 567` | `601234567` — digits only |
| Extra fields | none | `PHONE_DIAL` = `+48`, `PHONE_COUNTRY` = `PL` |
| Good for | a plain Webflow form where the number goes straight into the notification e-mail | a form with `pattern="\d+"`, or a CRM that assembles E.164 itself |

```html
<input type="tel" name="PHONE" d2-country-picker="PL" d2-country-picker-mode="separate">
```

In separate mode the module never touches what the visitor types. Paste a full
international number and the code moves out of the field into the hidden input
(the leftover is reduced to digits, so a `pattern="\d+"` field still submits).

### Adding it to a Webflow form

**Prefix mode — one attribute, nothing else:**

1. Select the phone field → **Element settings** → **Custom attributes** → `+`
2. Name `d2-country-picker`, value `PL` (or leave the value empty — Poland is the default)
3. Add `d2-country-picker` to the loader tag in **Project settings → Custom code → Head**
4. Publish. The field keeps its class and styles; the flag lands inside it

**Separate mode — plus the hidden fields.** The module creates them by itself,
but Webflow only lists fields it knows about in **Forms → Submissions** and in the
notification e-mail template. So declare them yourself and the module will reuse
them (matched by name, no duplicates):

5. Drop an **Embed** element *inside the form* (Add panel → Components → Embed) with:

   ```html
   <input type="hidden" name="PHONE_DIAL">
   <input type="hidden" name="PHONE_COUNTRY">
   ```

6. On the phone field add `d2-country-picker-mode` = `separate`
7. Name them differently if you like — then point the field at them with
   `d2-country-picker-dial-field` / `d2-country-picker-country-field`

**When the field already has a left icon** (`padding-left` for it), drop that
class from the phone field — the flag becomes the icon, and the module sets the
padding itself from the button's real width.

**Replacing intl-tel-input on an existing form:** remove its script, its CSS and
its init code first — two pickers on one field means two flags and two paddings.
Watch out for a `pattern="\d+"` left over from that setup: it goes with
`separate` mode, or the pattern has to be relaxed to something like `[\d+\s]+`.

### Styling

Every part carries a `.d2-cp-*` class and the injected CSS has no `!important`:
`.d2-cp` (wrapper), `.d2-cp-toggle`, `.d2-cp-flag`, `.d2-cp-dial`, `.d2-cp-caret`,
`.d2-cp-list`, `.d2-cp-search`, `.d2-cp-option` (`.d2-cp-option-name` /
`-dial`). The open wrapper gets `[d2-cp-open]`, the selected option
`[d2-is-active]`, the keyboard-highlighted one `[d2-cp-cursor]`.

### API

```js
var picker = digi2.countryPicker.get('#PHONE')      // or .create(input, opts)
picker.setCountry('DE')
picker.getCountry()        // { iso: 'DE', dial: '49', name: 'Niemcy' }
picker.getNumber()         // normalises first, then returns the field value
digi2.countryPicker.countries()   // all 245 entries
digi2.countryPicker.destroy('#PHONE')

digi2.on('country-picker:change', function (e) { console.log(e.iso, e.dial) })
```

Fields added later (CMS rows, a form inside a popup) are picked up automatically
— the module watches the DOM, same as the other modules.

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
instance.rescan()             // wire up triggers/panels added after init

digi2.tabs.rescan('faq')      // one group
digi2.tabs.rescan()           // every group — returns how many triggers were added
```

### Accordions inside a CMS list that loads more rows

A `[d2-cms-list]` with `d2-cms-load-mode="scroll"` / `"button"` fetches further
Webflow pagination pages **after** the page has loaded. Tabs scans the DOM once at
startup, so those later rows would have no click handling — the list works at the
top and goes dead further down, with their panels stuck open (nothing ever closed
them).

This is handled automatically: the CMS module emits `cms:items-added` after
appending rows and the tabs module re-scans, attaching **only** the new triggers
(existing ones keep their single listener, and an open panel stays open). Call
`digi2.tabs.rescan()` yourself only when you inject rows with your own code.

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
- `d2-slider-feed-position="start|end|N"` — where the fed block lands relative to the existing static slides (default `start`). A **number** is a 0-based index = **how many existing slides stay in front of the block**: with 2 static slides, `1` drops the collection **in the middle** (`A · …collection… · B`), `0` = start, `2` (= slide count) = end. Out-of-range / non-numeric / negative → `start`. **CMS-bindable** — bind it to a per-item number field to place (or skip, when empty → start) the gallery differently per product/apartment.
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

## DataLayer (GA4)

Reports what the other modules do to `window.dataLayer`, using GA4 event names —
so GTM sees popups, filtering, product expands and form submits with no per-site
glue code. Module: **datalayer** (`d2-datalayer`).

```html
<script src=".../digi2-loader.min.js" d2-datalayer d2-popups d2-cms d2-forms></script>
```

Everything reports by default. Narrow it down with two explicit attributes:

```html
<!-- everything except the lightbox -->
<script src=".../digi2-loader.min.js" d2-datalayer d2-datalayer-disable="lightbox"></script>

<!-- nothing except these two -->
<script src=".../digi2-loader.min.js" d2-datalayer d2-datalayer-only="popups forms"></script>
```

| Attribute | Effect |
|---|---|
| `d2-datalayer` | Load the module — everything reports |
| `d2-datalayer-disable="a b"` | Everything **except** these groups |
| `d2-datalayer-only="a b"` | **Only** these groups |

Groups: `popups`, `cms`, `tabs`, `forms`, `forms-detail`, `lightbox`, `ab`. Using both is allowed —
`-only` narrows first, then `-disable` subtracts from that. A group name that
doesn't exist logs a warning with the valid list, instead of silently reporting
nothing. Either attribute alone also loads the module, so `d2-datalayer` on its
own is only needed when you want the defaults.

### Event map

| What happened | GA4 event | Key params |
|---|---|---|
| Popup opened | `view_promotion` | `promotion_name`, `creative_slot: 'popup'` |
| Popup closed | `close_promotion` | `promotion_name` |
| Popup video watched to the end | `video_complete` | `video_title`, `video_provider: 'popup'` |
| Popup video unmuted | `video_unmute` | `video_title`, `video_provider: 'popup'` |
| List filtered | `view_item_list` | `item_list_name`, `filters`, `filter_count`, `matching`, `total` |
| List sorted | `view_item_list` | `item_list_name`, `sort_field`, `sort_direction` |
| More rows loaded | `view_item_list` | `item_list_name`, `loaded` |
| Product row expanded | `select_item` | `item_list_name`, `item_id`; inside a `[d2-cms-item]` also `item_name`, `item_<field>`, `interaction: 'expand'` — see below |
| Image opened | `select_content` | `content_type: 'image'`, `item_id`, `index`, `total` |
| Form submitted (valid) | `form_submit` | `form_id`, `form_name` |
| **Server accepted the submission** | `form_submit_success` | `form_id`, `form_name`, `form_location`, `lead_source`, `lead_medium`, `lead_campaign`, `has_gclid`, `has_fbclid`, `consent_marketing` |
| Server refused the submission | `form_submit_error` | `form_id`, `form_name` |
| Form rejected by validation | `form_error` | `form_id`, `form_name` |
| A lead | `generate_lead` | fires on **`form_submit` by default** — see below |
| First interaction with a form | `form_start` | `form_id`, `form_name` |
| A field filled in | `form_field_interaction` | `field_name`, `field_type` |
| Submit button pressed | `form_submit_click` | `form_id`, `form_name` |
| A/B variant shown | `experiment_impression` | `experiment_id`, `variant_id` |
| A/B variant clicked | `select_promotion` | `promotion_id`, `creative_name` |

`view_promotion`, `view_item_list`, `select_item`, `select_content`,
`generate_lead`, `select_promotion` and `video_complete` are GA4 recommended
events, so they land in standard reports. `close_promotion`, `form_error`,
`video_unmute` and `experiment_impression` have no GA4 equivalent — they're
custom names in the same snake_case style and GA4 reports them as-is.

Video events belong to the `popups` group, so `d2-datalayer-disable="popups"`
silences them along with the open/close pair.

### Product expands carry the product

A tab or accordion opening inside a `[d2-cms-item]` pushes `select_item` with
that row's fields, read the same way `cms.js` reads them — inline
`d2-cms-field-x="…"` on the item and nested `[d2-cms-field="x"]`, nested first.
The cms module doesn't have to be loaded; the attributes are enough.

```html
<div d2-accordion-item d2-cms-item
     d2-cms-field-name="B.1.05" d2-cms-field-floor="1"
     d2-cms-field-area="52,30 m²" d2-cms-field-price="689 000 zł"
     d2-cms-field-status="Dostępne">…</div>
```

```js
{ event: 'select_item', item_list_id: 'lokale', item_list_name: 'lokale',
  item_id: 'B.1.05', item_name: 'B.1.05', item_floor: 1, item_area: 52.3,
  item_price: 689000, item_status: 'Dostępne', interaction: 'expand' }
```

| Param | Source |
|---|---|
| `item_id` | field `id` → `name` → `title` → the tab id |
| `item_name` | field `name`, else `title` |
| `item_<field>` | every other field; the key is lowercased, non `[a-z0-9_]` → `_` |
| `item_list_id` / `item_list_name` | nearest ancestor `d2-cms-list` value, else the tab group |
| `interaction` | `'expand'` |

Edge cases, and why:

- **Only on open.** `tabs:change` fires on open, never on close, so collapsing a
  row reports nothing.
- **Not on load.** `tabs.js` now emits `{ group, tab, panel, trigger, initial }`;
  `initial` is true for `d2-tab-default` / `d2-accordion-open`. A product row
  opened that way is skipped — nobody expanded it. A plain tab keeps reporting
  its default-open as before, so existing sites see no change there.
- **Numbers.** A value that is digits with an optional decimal comma/dot, spaces
  as thousands separators and a trailing unit (`"52,30 m²"`, `"689 000 zł"`) is
  sent as a number, so GA4 can sum and compare it. Anything else stays text:
  `"B1.05"` (letters first), `"52 m2"` (a digit in the unit), `"1.250.000 zł"`
  (ambiguous separators). `d2-cms-field-type-<name>="number"` (or
  `d2-cms-field-type` on a nested field) forces the loose parse cms uses.
  `id` and `name` are always text — flat "12" is a label.
- **Fixed keys win.** `item_list_*`, `item_id`, `item_name` and `interaction` are
  set after the fields, so a field called `list_name` can't overwrite them.
- **GA4 limits.** Text is cut at 100 characters. GA4 keeps 25 params per event,
  so a row with a long tail of `d2-cms-field-*` loses the excess there, not here.
- **Neutral on purpose.** No `view_flat`, no `ViewContent`: GTM maps this one
  payload onto the vertical's event, and the library stays the same for a flat
  search and a car dealer.
- Rows outside a `[d2-cms-item]` keep the old payload (`item_list_name` = group,
  `item_id` = tab id).

### A/B events land twice

The ab-tests module pushes `digi2_ab_assigned` / `digi2_ab_click` itself, and
this bridge maps the same bus events onto `experiment_impression` /
`select_promotion`. With both modules loaded, one assignment reaches the
dataLayer twice under two names.

Both keep firing by default — sites have GTM triggers wired to the `digi2_*`
names and dropping them silently would break those. Where the bridge is doing
the job, switch the module's own push off:

```html
<script src=".../digi2-loader.min.js" d2-ab-tests="myTests" d2-ab-datalayer="false" d2-datalayer></script>
```

### The funnel — where people drop out

Submitted / not submitted says nothing about *why*. Three events in their own
`forms-detail` group answer that:

| Event | Fires |
|---|---|
| `form_start` | On the first interaction with the form — **once per visit**, not per pageview |
| `form_field_interaction` | On the **first change of each field**, carrying `field_name` and `field_type` |
| `form_submit_click` | When the button is pressed, **before** validation runs |

Together with the events above that's a full funnel: `form_start →
form_field_interaction → form_submit_click → form_submit / form_error →
generate_lead / form_submit_error`. `form_submit_click` minus `form_submit` is
"pressed the button and got bounced by validation" — the field people fail on
shows up as the last `form_field_interaction` before they give up.

> **Never a value.** These carry the *name* and *type* of a field, never its
> contents. No emails, phone numbers or message bodies reach the dataLayer —
> that is both a GDPR line and a GA4 terms-of-use line.

`form_field_interaction` fires on a field's **first** change rather than every
blur: a 12-field form would otherwise push a dozen events per visitor and
swamp GA4's event limits. The whole group can go with
`d2-datalayer-disable="forms-detail"`, which leaves the submit and lead events
untouched.

### Where `generate_lead` fires

By default it fires on `form_submit` — the click, once client-side validation
passed. That is what this module has always done, and it is **wrong**: Webflow
hasn't sent the request yet, so a spam-guard refusal, a plan limit or a dropped
connection all count as conversions. Since `generate_lead` is typically a key
event in GA4 and imported into Google Ads, that inflated signal is what the
bidding algorithms learn from.

The honest signal is Webflow confirming the submission. Move `generate_lead`
onto it with one attribute:

```html
<script src=".../digi2-loader.min.js" d2-forms d2-datalayer d2-datalayer-lead="success"></script>
```

| Value | `generate_lead` fires on |
|---|---|
| `submit` (default) | the submit handler, after client-side validation |
| `success` | Webflow showing `.w-form-done` — the server took it |

**The default stays `submit` deliberately.** Moving it silently would change
the numbers on every site already running this library, and any site with
`generate_lead` imported into Ads would see its conversion volume shift with no
warning. Flip a site over once you've checked its GA4 key events and Ads import.

`form_submit`, `form_submit_success` and `form_submit_error` are pushed either
way, so you can build the correct conversion in GTM and verify it against live
traffic *before* flipping the switch. The gap between `form_submit` and
`form_submit_success` is also a free outage indicator: if they diverge, the form
is failing somewhere between the browser and Webflow.

Detection watches Webflow's own success/error state on every `.w-form`, armed
whether or not the form was registered with `create()` — so a confirmed lead is
reported even on pages that never call it. A success state already on screen
when the page loads is not reported: only a transition into it counts.

Filters are flattened into one string (`rooms:1|2,status:Dostępne`) because GA4
parameters can't hold objects. Empty values are dropped so no blank parameters
reach the tag.

```js
digi2.datalayer.push({ event: 'custom', … })   // same guard, still logged
digi2.datalayer.enabled()                      // groups currently reporting
digi2.datalayer.disable('lightbox')            // at runtime
digi2.datalayer.enable('lightbox')
```

> The module listens on the digi2 event bus, so it must be loaded for events to
> be captured — anything fired before it loads is not replayed. Request it on the
> loader tag (not per page) if you care about popups that open on load.

---

## Webflow Interactions (IX2)

Make any element fire a Webflow interaction, by the name you gave it in the
Designer. Module: **webflow** (`d2-webflow`).

```html
<!-- per page -->
<digi2-module d2-modules="webflow"></digi2-module>
<!-- or on the loader tag: d2-webflow -->

<button d2-webflow-interaction="Show Form Popup">Zapytaj o ofertę</button>
```

Requesting the module is enough — any `d2-webflow-*` attribute also resolves to
it, so `d2-modules="webflow-interaction"` works as well.

```js
digi2.webflow.playInteraction('Show Form Popup')   // fire it from JS
digi2.webflow.interactions()                       // every name on the page
digi2.webflow.refresh()                            // re-scan for new triggers
```

### How it works

Webflow keeps interactions in ix2: `actionLists` (each carrying the name typed in
the Designer) and `events` binding a list to elements via `data-w-id`. There is
**no public "play by name" API** — `ix2.actions.playbackRequested()` needs an
`affectedElements` map only Webflow's own plumbing can build, and dispatching it
with an empty map is a silent no-op.

So the module doesn't fake the playback. It makes your element a **real trigger**:
it copies the `data-w-id` that the interaction's click event points at onto your
element, then calls `ix2.init()` so Webflow re-binds its listeners over the
current DOM. From there Webflow drives everything — the same code path as a
button built in the Designer, so repeat clicks and hover states behave identically.

Crucially this works even when **nothing on the page carries that interaction
yet**, which is the normal case for a section built entirely in custom code.

Re-binding is batched into one `ix2.init()` per scan, and triggers added later
(CMS rows fetched by `d2-cms-load-mode`) are wired automatically via
`cms:items-added`. Call `digi2.webflow.refresh()` if you inject markup yourself.

### Limits

- Only interactions with a **click** trigger can be attached — hover/scroll ones
  expose no id to borrow, and the module says so in the console.
- An element that already has its own `data-w-id` is left alone (overwriting it
  would break the interaction it already belongs to) — you'll get a warning.
- The interaction must exist **in this site's ix2 data**; a name that only lives
  on another page logs a warning and does nothing.

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

### Deferred filtering — apply on button click

By default every filter change re-renders the list immediately. Drop a **`d2-cms-apply`** button targeting the list and the list switches to **deferred mode**: checkboxes, buttons and sliders still update visually as the user picks, but the list, its counters and the `onFilter` callback only update when the **Apply** button is clicked. One click = one render for the whole basket, instead of one per tick.

```html
<!-- filters as usual -->
<input type="checkbox" d2-cms-target="apartments" d2-cms-filter="type:Apartamenty">
<input type="checkbox" d2-cms-target="apartments" d2-cms-filter="type:Lokale">
<div d2-cms-range d2-cms-target="apartments" d2-cms-range-field="price"> … </div>

<!-- its presence turns the whole list deferred; no flag on the list needed -->
<button d2-cms-target="apartments" d2-cms-apply>Pokaż wyniki</button>
```

- **Nothing hits the list until Apply.** Ticks and active states (`d2-cms-filter-active`, native `checked`) reflect the *draft* instantly; the visible items, `d2-cms-count`/display elements and `onFilter` wait for the click.
- While there is an un-applied change the button carries **`d2-cms-apply-pending`** (empty attribute) — style your "apply to see results" state off it.
- `d2-cms-clear` also stages in deferred mode (clears the draft; commit with Apply) — consistent with everything else.
- **Sort, load-more and the hide/show toggle (`d2-cms-toggle`) stay immediate** — they act on the already-shown results and aren't part of the filter basket.
- Multiple lists sharing the controls (`d2-cms-target="a|b"`): point the Apply button at all of them so one click commits both.

**Optional live count on the button** — add `d2-cms-apply-count` with a `{count}` token and the label previews how many items the current draft would show, before the user commits:

```html
<button d2-cms-target="apartments"
        d2-cms-apply
        d2-cms-apply-count="Pokaż {count} wyników"
        d2-cms-apply-empty="Brak wyników">           <!-- optional: overrides the 0 case -->
  <span d2-cms-apply-label>Pokaż wyniki</span>        <!-- optional: only this text is rewritten, icons survive -->
</button>
```

- No `{count}` token in the string → the number is appended (`"Pokaż wyniki 24"`).
- `d2-cms-apply-empty` swaps the whole label when the draft matches nothing.
- Wrap the text in a `[d2-cms-apply-label]` child to keep an icon/markup in the button untouched; without it, the button's own text is rewritten.
- The preview loads the full server-paginated dataset once on init so the count is exact (only when a count template is present — a plain Apply button skips that fetch).

#### Labels in two languages, and Polish plurals

Webflow Localization translates text, not custom attributes — one
`d2-cms-apply-count` would speak Polish on the `/en` page. And "Pokaż 1 wyników"
is wrong even in one language.

**The straightforward way: keep the templates as text, inside the button.** Hidden
Text Blocks sitting next to the label — the editor translates them per locale
like any other copy, and nobody has to touch attributes again:

```html
<button d2-cms-target="apartments" d2-cms-apply>
  <svg class="icon">…</svg>
  Pokaż wyniki

  <div d2-cms-apply-count-text        style="display:none">Pokaż {count} wyników</div>
  <div d2-cms-apply-count-text="one"  style="display:none">Pokaż {count} wynik</div>
  <div d2-cms-apply-count-text="few"  style="display:none">Pokaż {count} wyniki</div>
  <div d2-cms-apply-empty-text        style="display:none">Brak wyników</div>
</button>
```

In the Designer: a Text Block per form, hidden, dropped inside the button. The
attribute value names the plural category the variant is for; the one without a
value is the fallback.

**You don't have to add `[d2-cms-apply-label]` yourself.** A button carrying
templates can't have its whole content rewritten — that would wipe them — so the
module carves out a label: it moves the button's own text into a
`[d2-cms-apply-label]` span, or adopts the Text Block that already holds the
words. Icons stay outside it and survive every rewrite.

The templates can also live anywhere on the page instead, with
`d2-cms-target="apartments"` on each — useful when several buttons share them.
`d2-cms-display-format-text` works the same way for counters.

Templates in text win over the attribute forms below, so you can start with
attributes and move to text elements when the second language arrives.

**The attribute way**, if you'd rather keep everything on the button — suffixes
on the same attribute:

```html
<button d2-cms-target="apartments" d2-cms-apply
        d2-cms-apply-count="Pokaż {count} wyników"
        d2-cms-apply-count-one="Pokaż {count} wynik"
        d2-cms-apply-count-few="Pokaż {count} wyniki"
        d2-cms-apply-count-en="Show {count} results"
        d2-cms-apply-count-en-one="Show {count} result"
        d2-cms-apply-empty="Brak wyników"
        d2-cms-apply-empty-en="No results">
  <span d2-cms-apply-label>Pokaż wyniki</span>
</button>
```

Resolved most specific first: `-{lang}-{plural}` → `-{lang}` → `-{plural}` →
the bare attribute. Anything you don't declare falls back, so two attributes are
a perfectly good start.

- **Language** comes from `<html lang>` (Webflow sets it per locale), falling
  back to the first URL segment (`/en/…`).
- **Plural categories** come from `Intl.PluralRules`, so Polish gets
  `one` / `few` / `many` (1 · 2,3,22 · 5,12) and English `one` / `other` —
  the module knows nothing about either grammar, the browser does.

`d2-cms-display-format` takes the same suffixes:

```html
<div d2-cms-target="apartments"
     d2-cms-display-format="Znaleziono {matching} mieszkań"
     d2-cms-display-format-one="Znaleziono {matching} mieszkanie"
     d2-cms-display-format-few="Znaleziono {matching} mieszkania"
     d2-cms-display-format-en="Found {matching} apartments"></div>
```

Programmatic equivalent: `list.applyFilters()` commits the current draft. In deferred mode the JS setters (`addFilter`, `filter(...)`, `setRange`, …) also stage — call `applyFilters()` to commit.

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

**Bounds follow the facets.** Auto-detected bounds are measured from the items that pass the current **facet** filters — tabs, chips, dropdowns, checkboxes — and re-measured after every such change. Switch to a "Domy" tab and the price slider runs from the cheapest to the dearest house, not from the cheapest row in the whole CMS.

- **Range filters are excluded from that measurement — this slider's and every other slider's.** Bounds answer "what is on offer in this tab", which is a question about facets. Two sliders over one list would otherwise measure each other: drag the area handle far enough in, the price set is down to a single flat, and the price scale collapses to `min === max` — no span, so dragging, arrows and track clicks all do nothing and the widget is stuck.
- **The slider being dragged is never re-measured mid-drag.** Re-measuring moves the value/pixel mapping under the finger: the same screen position resolves to a different number between two pointer events, and the handle jumps.
- Handles keep the user's pick when it still overlaps the new scale (clamped into it), and fall back to the full extent when it doesn't — a 300–500k selection meeting a 900k–1.6M tab would otherwise pin both handles together and show nothing.
- If the new filter combination matches nothing, the last real scale stays on screen so there's still a slider to drag back out with.

**One slider over tabbed lists.** With a pipe target (`d2-cms-target="flats|houses"`) the slider drives whichever list the open tab shows: on `tabs:change` it re-measures against the newly visible list and drops its range filter from the tab you left. Same visibility rule the shared `d2-cms-display` counters use.

Add `d2-cms-range-static-bounds` to opt out of all of the above — bounds are then measured once across the whole dataset (every target included) and never move.

Displays pair well with the loader's `d2-static-width` (locks the element's width to its widest observed value so the layout doesn't shift while dragging). The attribute value picks the edge the content anchors to when shorter than the locked box: `d2-static-width="right"` / `"center"` (default left; flex containers get `justify-content` instead of `text-align`). A bare `d2-static-width` on the **max** display — or on a wrapper around it — is auto-anchored `right` by the CMS module, so the value stays glued to the track's right edge instead of drifting left as it gets shorter.

The anchor takes [per-breakpoint values](#responsive-attributes) like any other `d2-*` attribute, so a label can sit left on desktop and hug the right edge once the layout tightens:

```html
<div d2-static-width="left;right@728">1 600 000</div>
```

An entry that doesn't apply at the current width clears the anchor rather than leaving the previous one in place, and the locked width itself is re-measured when the breakpoint flips — a width measured on desktop would otherwise cage the element on mobile, where the same text wraps into a narrower box.

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
| `d2-cms-field-type="number\|text\|date"` | on `[d2-cms-field]` | Optional. Forces the comparator type. Auto-detection checks **dates first** (a digit-shaped date: ISO, `YYYY/M/D`), then numbers, else alphabetical. Values like `A - A.M.0.2` or `K1.10` stay text — `Date.parse()` would happily turn them into timestamps and `parseLooseNumber()` into decimals. Text dates (`4 sierpnia 2026`) need this attribute set explicitly |
| `d2-cms-field-type="Apartamenty"` | item element | **`type` is also a valid inline field name.** On the item element, `d2-cms-field-type` is read as a normal field literally called `type` (e.g. property type), so `d2-cms-filter="type:Lokale"` works. Only the `d2-cms-field-type-{name}` form is reserved for declaring an inline field's comparator type |
| `d2-cms-sort="field"` | button | Click toggles sort by this field — first click = asc (A→Z / 0→9), then desc, then asc again |
| `d2-cms-sort-dir="asc\|desc"` | sort button/option | Forces a fixed direction (no toggle) — use for explicit dropdown options |
| `d2-cms-sort-type="number\|text\|date"` | button | Override auto-detection of value type |
| `d2-cms-sort-label` | any element | Swaps its text to the active sort option's text (custom dropdown toggle); restores the original when sort clears. Scoped to its `.w-dropdown` / `[d2-cms-sort-scope]` |
| `d2-cms-sort-option-label="…"` | sort option | Overrides the text this option contributes to `d2-cms-sort-label` |
| `d2-cms-filter="key:value"` | button / checkbox / radio | Toggle a filter. Composites: `key:a\|b` (both values), `key:a&b` (AND) |
| `d2-cms-filter="key"` + `d2-cms-filter-value="…"` | CMS-generated control | Split form for CMS lists — Webflow binds whole attribute values only, so bind the **value** attribute to a CMS field and keep the key static |
| `d2-cms-filter="key:"` (trailing colon) | input (radio/checkbox) | Value read from the input's own `value` / `data-value` attribute (Webflow radios carry `data-value`) |
| `d2-cms-filter-field="key"` | `<select>` | Native select drives the filter; empty option clears the key |
| `d2-cms-filter-no-sync` | any filter control | Stop the module from writing this control's own state (`checked` / `select.value`). Use it when **two controls drive the same field** — e.g. a "1 or 2 rooms" shortcut (`d2-cms-filter="rooms:1\|2"`) next to a 1/2/3/4 `<select d2-cms-filter-field="rooms">`. Without it, ticking the shortcut snaps the select to the filter's first value ("1"), which reads as if you'd picked one room. The filter itself still applies normally; only the visual echo is suppressed |
| `d2-cms-filter-label="key"` | any element | Swaps its text to the active filter value(s); empty attr tracks any key |
| `d2-cms-clear` / `="all"` / `="key"` / `="key\|key2"` | button | Clear filters: everything / + sort / only the named field(s) — see [Clear buttons](#clear-buttons) |
| `d2-cms-apply` | button | Turns the target list **deferred**: filter picks stage a draft and only hit the list on click — see [Deferred filtering](#deferred-filtering--apply-on-button-click) |
| `d2-cms-apply-count="Pokaż {count} wyników"` | apply button | Live label preview of the draft result count (`{count}` token; appended if no token) |
| `d2-cms-apply-empty="Brak wyników"` | apply button | Label override when the draft matches 0 items |
| `d2-cms-apply-label` | child of apply button | Only this child's text is rewritten by the count preview (keeps icons/markup) |
| `d2-cms-apply-pending` | apply button | (Set by module) Present while there is an un-applied draft change — style your "apply to see results" state off it |
| `d2-cms-range` (+ `-field`, `-step`, `-min/max`, `-displayformat`) | wrapper | Numeric range slider bound to a field — see [Range sliders](#range-sliders) |
| `d2-cms-range-static-bounds` | range wrapper | Bounds normally re-measure after every filter change (and follow the visible list with a pipe target) — this flag freezes them to one measurement across the whole dataset |
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
list.applyFilters()            // deferred mode: commit the staged draft to the list
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

### Sums (`d2-format-sum-*`)

Element text becomes the sum of its `d2-format-sum-*` attribute values — bind each part to a CMS field (e.g. terrace + balcony area):

```html
<div d2-format-sum-1="28.75" d2-format-sum-2="1.5" d2-format-unit="m²">0</div>
<!-- → 30,25 m² -->
```

- Parts that are blank or non-numeric are **skipped** — an empty balcony field simply adds nothing. When *no* part parses, the element keeps its authored text (your fallback).
- Decimals default to the **widest fraction among the parts** (`28.75 + 1` → `29,75`); override with `d2-format-decimals`. Polish-comma values (`28,75`) parse fine.
- Composes with the rest of the module: add `d2-format-price` / `d2-format-currency` / `d2-format-unit` etc. to style the result.
- Discovery covers the bare `d2-format-sum` plus numbered parts `-1` … `-9`; other suffixes still count toward the sum once the element matches.
- Loader flag alias: any `d2-format-*` flag (including `d2-format-sum`) loads the format module.

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

## Lightbox

Click any `[d2-lightbox]` element to open a fullscreen gallery — Esc closes, arrow keys navigate, dragging left/right with the mouse or a finger moves between photos (the image follows the drag and snaps back below the threshold), body scroll locks, adjacent images preload. The scroll lock is the shared `digi2.scrollLock` (see Popups), so a popup opened over the gallery and the gallery itself can close in either order; automatic popups wait for the gallery to close. The gallery UI is either **your own modal built in the Designer** or, when the page has none, a **built-in dark modal** injected automatically (zero setup) with a close ✕ in the top-right corner.

```html
<!-- zero-config: each CMS item is its own gallery -->
<div d2-cms-item>
  <img src="photo-1.jpg" d2-lightbox alt="Taras">
  <img src="photo-2.jpg" d2-lightbox alt="Salon">
</div>
```

### Triggers & full-size sources

`d2-lightbox` (or its alias `d2-lightbox-item`) marks the clickable element — an `<img>` or a wrapper around one. The full-size URL is resolved in order:

1. `d2-lightbox-src="URL"` / `d2-lightbox-image="URL"` on the trigger (bind it to a CMS image field),
2. a (hidden) full-size twin `<img d2-lightbox-full>` inside the trigger,
3. the trigger's own `src` (or its first inner `<img>`).

Both URL attributes also work **standalone** — an element that only carries `d2-lightbox-src="URL"` or `d2-lightbox-image="URL"` (outside a modal) is clickable on its own and opens that URL:

```html
<div d2-lightbox-image="https://cdn.example.com/plan.jpg">Zobacz rzut</div>
<img d2-lightbox-item src="photo.jpg">   <!-- alias: opens its own src -->
```

Captions come from `d2-lightbox-caption` on the trigger, falling back to the image `alt`.

### Opening from a button (`d2-lightbox-button`)

Sometimes the thing you click is not a photo — a "Zobacz galerię" button, an icon,
a link under a listing. `d2-lightbox-button` marks an **opener**: it opens a
gallery it is not part of.

```html
<button d2-lightbox-button="rzuty">Zobacz galerię</button>

<div style="display:none">
  <img d2-lightbox="rzuty" src="salon.jpg"   alt="Salon">
  <img d2-lightbox="rzuty" src="taras.jpg"   alt="Taras">
  <img d2-lightbox="rzuty" src="kuchnia.jpg" alt="Kuchnia">
</div>
```

- **The button never becomes a photo.** An icon `<img>` inside it is ignored too,
  so the gallery stays exactly what you listed — no stray logo as slide one.
- **No magnifier.** The hover badge is skipped and the cursor is `pointer`, not
  `zoom-in`. A button doesn't advertise itself as something you zoom into.
- **Grouping works like everywhere else**: a value names the gallery
  (`d2-lightbox-button="rzuty"`); a bare `d2-lightbox-button` opens the gallery of
  its nearest `[d2-lightbox-group]` / `[d2-cms-item]`, which is what you want for
  a per-item "Galeria" button inside a CMS list.
- Opens on the first photo; for another starting point use
  `digi2.lightbox.open('rzuty', 2)`.

The photos still need to exist in the DOM — hidden is fine (`display:none`), and
they don't need to be `<img>` at all: `d2-lightbox-src` (bindable to a CMS image
field) with an optional `d2-lightbox-caption` is enough. Note that the `thumbs`
variant then has no small image to reuse and falls back to the full-size files.

### Grouping — which photos form one gallery

1. **Named**: `d2-lightbox="rzuty"` — all triggers sharing the name, anywhere on the page.
2. **Container**: bare triggers inside the nearest `[d2-lightbox-group]`.
3. **CMS item**: bare triggers inside the nearest `[d2-cms-item]` — inside a digi2 CMS list every item is its own gallery with zero config.
4. **Page-wide**: remaining bare triggers form one gallery.

Infinite-slider clones (`[d2-slide-clone]`) are skipped and duplicate URLs deduped.

### Native Webflow lightboxes are taken over

When the module is on the page, clicks on native Webflow lightbox links (`.w-lightbox`) open in **this** lightbox instead — so native and d2 galleries look identical. Webflow media groups are respected: all links sharing a `group` merge into one gallery in DOM order, starting at the clicked link; URLs are deduped. Interception happens in the capture phase, so it wins regardless of how webflow.js bound its handlers. Video items stay native (the module is image-only), malformed configs are left alone, and `d2-lightbox-skip` on a link opts it out:

```html
<a href="#" class="w-lightbox" d2-lightbox-skip>…stays a native Webflow lightbox…</a>
```

### Custom modal (Designer-built)

Build the modal in Webflow and leave it visible — the module hides it on load. The attribute value sets the display used when open (default `flex`).

```html
<div d2-lightbox-modal="flex">
  <div d2-lightbox-backdrop></div>          <!-- click closes -->
  <img d2-lightbox-image>                   <!-- required slot -->
  <a d2-lightbox-close>✕</a>
  <a d2-lightbox-prev>‹</a>                 <!-- auto-hidden for 1-photo galleries -->
  <a d2-lightbox-next>›</a>
  <div d2-lightbox-counter="{current} z {total}"></div>
  <div d2-lightbox-caption></div>           <!-- hidden when caption is empty -->
</div>
```

Extra slots: `d2-lightbox-current` / `d2-lightbox-total` (separate numbers) and `d2-lightbox-thumbs` — a container the module fills with one clickable `<img d2-lightbox-thumb="i">` per photo (click jumps to it; the active thumb carries `d2-is-active` — style both in your CSS). Clicking the modal root itself also closes. `d2-lightbox-loop="false"` on the modal stops navigation at the ends instead of wrapping. Without a custom modal the built-in one is used — its elements carry `.d2-lb-*` classes if you want to restyle it with CSS.

### Built-in variants, single-photo behavior & cursors

The built-in modal has two bottom-bar variants. Pick the page default **where you import the module** — as the value of the `d2-lightbox` flag:

```html
<script d2-lightbox="thumbs" src=".../digi2-loader.min.js"></script>
<!-- or per page: -->
<digi2-module d2-lightbox="thumbs"></digi2-module>
```

| Variant | Bottom bar |
|---|---|
| `counter` (default, bare `d2-lightbox` flag) | "1 / 4" counter |
| `thumbs` | clickable thumbnail strip — squares that jump to the photo |

A single gallery can override the page default with `d2-lightbox-variant` on the trigger or any ancestor (CMS item, section, `body`):

```html
<div d2-cms-item d2-lightbox-variant="counter">   <!-- this gallery: counter, rest of page: thumbs -->
  <img d2-lightbox src="...">
</div>
```

The thumb strip reuses the small image each trigger already displays (falling back to the full-size file), so it costs no extra bandwidth. With a **single photo** every navigation affordance disappears: no arrows, no "1 / 1" counter, no thumbs, and dragging is disabled.

**The strip is one scrollable line.** It used to wrap, so a gallery of thirty
photos stacked into rows deep enough to push the photo itself off screen — the
lightbox got taller the more there was to look at. Now it stays one line
whatever the count, with its own small arrows at either end:

- **centred while it fits**, so a four-photo gallery sits in the middle of the
  bar rather than shoved to the left; it switches to left-aligned only once
  there is more than fits, because centring an overflowing flex row makes its
  first items unreachable
- arrows appear **only when the strip doesn't fit**, and dim at whichever end
  you've reached
- one press moves about 80% of the visible width, leaving a couple of thumbs in
  view so you can tell where you landed
- **the strip follows the gallery**: changing photo scrolls the matching
  thumbnail into view and centres it where there's room, so the active one is
  never stranded off to the side
- it respects `prefers-reduced-motion` (jumps instead of animating) and
  re-checks itself on resize, so rotating a phone gets the arrows right

The scrollbar is hidden — drag, swipe, arrows and picking a photo all move the
strip. On a custom modal your own `[d2-lightbox-thumbs]` container keeps
whatever CSS you gave it; the auto-scroll to the active thumb still applies if
the container scrolls, and the arrows are built-in-only.

An injected stylesheet (no `!important`, override freely) gives triggers `cursor: zoom-in` (magnifier) and close/prev/next/thumb slots `cursor: pointer`. Hovering a trigger also shows a **floating magnifier badge** centered over it — one fixed-position element placed by the module, so it works on `<img>` triggers (which can't hold children) and on CMS items rendered later, without touching your markup. Disable it with `d2-lightbox-icon="false"` on the trigger or any ancestor (section, `body`). The built-in modal's close/prev/next buttons use centered SVG icons (no font-dependent glyphs), styleable via `.d2-lb-*`.

### API & events

```js
digi2.lightbox.open(triggerEl)          // same as a click
digi2.lightbox.open('rzuty', 1)         // named gallery at index 1
digi2.lightbox.open([{ src: '/a.jpg', caption: 'Taras' }, { src: '/b.jpg' }])
digi2.lightbox.next() / .prev() / .close() / .isOpen()
digi2.lightbox.refresh()                // re-hide custom modals added later

digi2.on('lightbox:open',   ({ index, total }) => {})
digi2.on('lightbox:change', ({ index, total, src }) => {})
digi2.on('lightbox:close',  () => {})
```

---

## Booking (d2-booking)

Booking a rental straight from the page. The module talks to the **public site
API** of 2destate — `/api/v1/public/sites/{public_key}/…` — whose contract lives
in `tests/fixtures/booking-api/` (one file per route, `errors.json` with every
refusal, `KONTRAKT.md` with the file format). Contract version **1**.

```html
<script src="https://cdn.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@vX.Y.Z/dist/digi2-loader.min.js"
  d2-booking="pk_live_…"
  d2-booking-product="3f2b7c1e-8a44-4c55-9a3e-0d1f6b2a7c10"
></script>
```

| Attribute | Element | Description |
|---|---|---|
| `d2-booking="pk_…"` | loader tag | **Site key.** Public, non-secret: it sits in the page's HTML on purpose. The backend protects itself with the key's domain allowlist, rate limits and server-side prices — there is nothing to hide here. Read with `getAttribute`, not `digi2.attr`: a key is not a responsive value. |
| `d2-booking-api="<base>"` | loader tag | API base address. Default `https://api.2destate.com/api/v1`. `https` only (`http://localhost` and `http://127.0.0.1` are allowed while building); anything else is refused with a console warning and the default is used. Read raw — an address may legally contain `;` and `@`. |
| `d2-booking-product="<uuid\|slug>"` | loader tag, the form, the calendar or the widget | Product (apartment) this page books — a uuid or a slug. The calendar may pick another one. **Optional:** with no attribute anywhere the module reads `?apartament=<slug>` off the address, which is how one booking page serves a whole CMS collection (`/rezerwacja?apartament=apartament-rynek-wroclaw`). An attribute always wins over the address; an empty or missing parameter is simply no product. |
| `d2-booking-lang="<code>"` | loader tag | The language the guest reads — `pl`, `en`, `de` or `uk`, and one of the languages the key allows (`/config` `languages`). **Optional:** without it the key's `default_language` decides, and `<html lang>` is honoured the same way. A language the key does not allow, or one the module has no dictionary for, is refused in favour of the default with a console warning. Read with `digi2.attr`. See [Languages](#languages). |

### The API client

One small client over `fetch`. It **adds no credentials** (`credentials: 'omit'`,
no cookies, no tokens of ours), sends and accepts JSON, and turns every answer
into one of two shapes:

```js
{ ok: true,  status: 200, data: { … } }
{ ok: false, status: 409, reason: 'period_taken', message: 'Ten termin…',
  field: 'phone', violations: ['period_taken'], retryAfter: 45 }
```

`reason` is the **typed** reason from `errors.json` and is the only thing the
module acts on. The `detail.message` / `detail` sentence from the backend is
**never shown to the guest**: it is written for logs, in whatever language the
API speaks. `message` is always our own sentence, in the language the guest reads
([Languages](#languages)), and a reason the module has never heard of still
gets one (the generic "nie udało się…" / "The booking could not be…"). Where the body
carries no reason of its own, it comes from the status plus what the caller knows
about its own route (`notFound`, `conflict`, `badRequest` options):

| Answer | `reason` |
|---|---|
| `detail.reason` / `detail.code` | that string (`period_taken`, `rental_rules`, `field_required`, `request_too_large`, …) |
| `detail` is a list (FastAPI 422) | `validation_error`, and `field` from `loc` (`["body","customer_email"]` → the `email` field). A `loc` that ends in an array index is walked past it, so `["body","child_ages",0]` still marks `child_ages`, and an entry naming nothing we know leaves the next entry its chance. |
| 400 | `invalid_request` (or the caller's `badRequest`, e.g. `invalid_stay`) |
| 403 | `origin_not_allowed` |
| 404 | the caller's `notFound` — `site_key_not_found`, `product_not_found`, `booking_not_found` |
| 409 with a sentence | the caller's `conflict` — `request_not_allowed`, `request_already_waiting` |
| 413 / 429 | `request_too_large` / `too_many_requests` (+ `retryAfter` seconds from `Retry-After`) |
| 502 | `payment_provider_unavailable` **only on the two payment routes** (`checkout-session`, `balance-checkout`), which ask for it by name — `errors.json` documents that refusal for them alone. A bad gateway on the calendar or the price is a `server_error`, because telling a guest who has not touched a payment that the payment provider is down is a lie. |
| 5xx, unreadable body | `server_error`, `bad_response` |
| `fetch` rejected | `network_error` |

A refusal from a **domain outside the key's allowlist** carries no
`Access-Control-Allow-Origin`, so the browser never lets the page read it: in
the browser it is a `network_error`, like a dead connection. That is the one
refusal shape the module cannot name.

### The reference and the id

`d2-booking-product` (and `?apartament=`) takes a **uuid or a slug**, but only
one route of the contract accepts a reference: `GET /products/{ref}`.
Availability, quote and bookings are all spelled `{product_id}`. So the module
resolves the reference **once per visit** through that route and uses the `id`
of the answer everywhere else — a slug sent to a `{product_id}` route would
come back `404 Product not found` and nothing could be booked.

The same answer carries `pet_fee`, which is where the sentence beside the pets
question comes from (below). The lookup is made when a calendar, a quote, a
booking or a pets hint needs it — a page that needs none of them makes none.
A lookup that is refused is logged and the reference goes out **as the page
wrote it**: the backend then decides, exactly as it would have anyway.

### /config, read once

On start the module reads `GET /config` **once** and keeps the answer for the
whole page (every form shares it): `form_fields`, `child_max_age`, `languages`,
`default_language`, `branding_hidden`, `account_url`. A `/config` that cannot be
read never closes the form — the page keeps the fields the Designer built, logs
a warning, and the backend decides on submit.

### Languages

Every sentence a guest reads lives in a **dictionary**, one per language: a flat
`key → sentence` table in the same shape as the portal's i18next JSON (owner's
decision D7), so the same key is greppable on both sides. The module cannot use
i18next — it has no dependencies at all — so these tables are the whole of its
translation. Shipped: **pl, en, de, uk** — the four languages the portal starts
with (D7).

Polish is the original wording and the one the tests pin literally; English was
written beside it. **German and Ukrainian are machine translations awaiting a
native reading** — they are pinned by tests all the same, so the reading that
comes is a deliberate change of a sentence and not a quiet drift. German is
addressed formally (`Sie`), Ukrainian too (`ви`); Polish is informal, because
Polish web copy is.

```html
<script src=".../digi2-loader.min.js" d2-booking="pk_live_…" d2-booking-lang="de"></script>
```

Which language a guest gets:

1. `d2-booking-lang`, when the key allows it **and** the module has a dictionary
2. `<html lang>` (`en-GB` → `en`), under the same two conditions
3. the key's `default_language` from `/config`

A language the key does not allow — or one no dictionary covers — is **refused
in favour of the default**; an explicit `d2-booking-lang` refused that way says
so in the console (`<html lang>` is the quiet version of the question, so a
refusal there is quiet too). Half a page in German promises a service the owner
cannot give. A key whose `/config` lists no `languages` at all is **not** policed
(there is nothing to check against): the attribute stands, and everything else
stays as it was, on the key's default.

The **default itself** is held to the same rule: a key whose `default_language`
is a language this module has no dictionary for falls back to `pl` and says so
in the console once. Otherwise the sentences would come out of the base
dictionary while every `Intl` format — dates, month names, amounts, the first
day of the week — followed a language nobody on the page reads.

The chosen language is also what goes out as the booking's `locale` (so the
portal's e-mails match the page) and what every `Intl` format follows: the
amounts, the percentages, the month and weekday names, and which day a week
starts on.

| Case | What happens |
|---|---|
| a key missing from one dictionary | read in the next language of the chain (asked → the key's default → `pl`), so there is no hole in the page |
| a key no dictionary has | nothing is rendered and the console says which key — a guest must never read `manage_label_nights` |
| a `{placeholder}` with no value | the whole sentence is dropped and the caller falls back to one that needs none — never a printed brace |
| a counted word | one key per form (`nights_one` / `nights_few` / `nights_many` in Polish and Ukrainian, `nights_one` / `nights_other` in English and German); which one a number takes is the `plural` function **of that dictionary**, which is why Ukrainian keeps its own three-form rule: it says *21 ніч* where Polish says *21 nocy*, and English and German count in two. Two words are counted today: `nights` and `years` (the child-age limit — *2 lata* against *12 lat*) |
| a refusal `reason`, a line `kind`, a `status`, a request kind or a price unit the dictionary does not know | shown as the answer's own value (a line kind) or not at all (a status), and never reported: those come from the backend, which may name things this version has not heard of |

The **browser-side form check** says its sentences out of the same tables, the
four it writes itself included: `required`, `email`, `number`,
`adults_required` (children count into the party), `child_age_max`,
`child_ages_count` and `too_many_pets_over_threshold`. Nothing a guest can read
is a literal in the code.

One sentence quotes a label of the portal's e-mail, so the two have to agree:
`manage_balance_elsewhere` sends the guest to the balance link **by name** —
`„Dopłata”` (pl), `“Balance”` (en), `„Restzahlung“` (de), `«Доплата»` (uk).
Those four strings are the contract for the portal's own translation; an e-mail
that labels that link anything else sends the guest hunting in his inbox.

`digi2.booking.text('submit_label')` gives a page the module's own wording in
the guest's language, and `digi2.booking.texts('uk')` the whole table (a copy).

#### Adding a language

1. One more entry in `DICTIONARIES` (`webflow-scripts/modules/booking.js`): its
   own `plural` function and a `texts` table with **every** key the base one has
   — the counted word as one key per form its rule can return.
2. The key's `/config` has to list the code in `languages`, or the module
   refuses it in favour of `default_language`: the module speaking a language
   the owner never set up would promise e-mails and a portal in it.
3. Nothing else changes. The tests do the policing: one proves every dictionary
   has exactly the same key set (so a language cannot ship half-filled), one
   reads every key the module looks up **out of the source** and checks it
   against every dictionary — a key reached only by a branch no test walks is
   exactly the one that goes missing in a translation — one probes each `plural`
   over 0…150 and demands every form it can answer (`nights_few` missing is
   invisible to a key-set test, which folds the forms off), and one refuses a
   sentence **nothing looks up**, so a dead key is never translated four times.
4. `npm run build`, because `dist/` is committed, and the browser gate
   (`sandbox/gate-booking-lang.html`) proves a non-default language end to end
   in a real Chromium, Cyrillic and all.

### The list of places

```html
<div d2-booking-results>
  <a d2-booking-template d2-booking-link class="karta">
    <img d2-booking-bind="image">
    <h3 d2-booking-bind="name"></h3>
    <span d2-booking-bind="city_line"></span>
    <span d2-booking-bind="price"></span>
  </a>
</div>

<button d2-booking-more>Pokaż więcej</button>
<span d2-booking-count></span>
<div d2-booking-results-empty>Nic nie znaleźliśmy.</div>
```

`GET /products` answers the list, and the row the page built is the row the
guest reads: `[d2-booking-template]` is remembered, **taken off the page**
before anything shows, and cloned once per entry — markup, classes and nesting
as the Designer wrote them. The clone loses `d2-booking-template` and gains
`d2-booking-item`. A template left where it stood would be an empty card above
every real one.

**Every** pattern leaves the page, not only the first one, and the attribute is
stripped from the inside of the clone as well: a card built inside a Webflow
Collection List is rendered once per CMS item, so the published page carries
`d2-booking-template` on every one of them, and a copy left standing would be a
clickable placeholder card that no later render ever clears (only
`[d2-booking-item]` rows are). The first one is the pattern, the rest are
dropped, and the module says in the console how many it found.

Rows are **appended** to the container, so a button, a count or an empty state
belongs **next to** the list, not inside it — which is where a Webflow layout
leaves them anyway. One put inside is still filled in and never removed (only
`[d2-booking-item]` rows are cleared); the rows simply follow it. With one list
on the page the controls may stand anywhere; with two, each list has to hold
its own, because a button standing between them belongs to neither.

| Attribute | Element | Description |
|---|---|---|
| `d2-booking-results` | any Div | The list, read once per visit. |
| `d2-booking-results-limit="<n>"` | the list | How many places one page asks for. Default `24`; the key has its own maximum. |
| `d2-booking-results-link="<shape>"` | the list | The address shape every card of this list leads to (below). Read raw — an address may legally contain `;` and `@`. |
| `d2-booking-template` | any element in the list | The row. Taken out of the page and cloned per place; never shown itself. |
| `d2-booking-bind="<field>"` | any element in the row, the row itself included | One field of the entry, as text (below). |
| `d2-booking-link[="<shape>"]` | Link, or the row itself | Where this card leads. A whole card is usually one link, so the attribute may sit on the template. |
| `d2-booking-more` | Button | Asks for the next page (`limit`/`offset`) and **appends** it. Disabled while a page is in flight, hidden once the answer says `has_more` is false. |
| `d2-booking-count` | any element | The `count` the answer carries — every place that matches, not the ones on screen. |
| `d2-booking-results-empty` | any element | Shown **only** when the answer has nothing. Hidden until the answer arrives, and hidden on a refusal. |
| `d2-booking-results-message` | any element **inside** the list | The sentence of a refusal, in the module's own words. Unlike the button, the count and the empty state — which may also stand beside the list — this one is looked for inside it; a missing one is built there, with `role="status"` and `aria-live="polite"` and marked `d2-booking-built`. |
| `d2-booking-item` | set by the module | On every rendered row. |
| `d2-booking-empty` | set by the module | On a slot the answer had nothing for. |
| `d2-booking-results-state` | set by the module | `loading` \| `ready` \| `empty` \| `error`. |
| `d2-booking-results-drawn` | set by the module | This list had no template, so the module drew the cards itself. |
| `d2-booking-busy` | set by the module | A page of the list is in flight. |

**Every scalar field of the contract binds by its own name** — `name`,
`project_name`, `city`, `city_line`, `address_line`, `rooms`, `area`, `floor`,
`beds`, `max_guests`, `description`, `rental_kind`, `timezone`, `latitude`,
`longitude`, `min_units`, `max_units`, `payment_mode`… — so a page is never
limited to a list somebody hardcoded. Four values read differently:

| Value | What the module writes |
|---|---|
| `image` | `image_url`. On an `<img>` the `src`, with the place's `name` as the `alt` (an unnamed picture gets an empty `alt` on purpose, so a screen reader skips it instead of reading an address out loud); anywhere else the `background-image`. |
| `price` | The entry's own `price.price` in the entry's own `currency`, through the same `Intl` formatting as the quote. The module computes no amount here either. |
| `price_unit` | What that amount is the price of ("za noc"). A unit this module does not know shows nothing rather than a bare code. |
| a list of scalars (`amenities`, `allowed_units`, `image_urls`) | joined with commas |

A missing or `null` field — eighteen fields of the contract are nullable, so
this is most pages and not an edge case — leaves the element empty and marked
`d2-booking-empty`, never the word `null`. So does `""`, an object (`pet_fee`,
`prices`) rather than `[object Object]`, a name the answer does not carry at
all (a typo, or `constructor` — the field has to be the entry's own, or a slot
would read `function Object() { [native code] }`), and a flag that is `false`
(`requires_approval`); a flag that is `true` leaves the slot **exactly as the
Designer built it** — the text and the markup inside it, an icon beside the
word "na zapytanie" included, and not marked `d2-booking-empty` either. A
declared `0` (the ground `floor`) is an answer, not a gap, and is written.

**Nothing out of the answer is ever markup**: a value goes in with
`textContent`, an address with `setAttribute`, and a picture only once its
address reads as one — `https:`, `/…` or `data:image/`, with no quote, bracket
or backslash. A `src` is one click from running and a background goes into a
style property, where a single quote ends the declaration and starts whatever
came with the answer. These names come out of a CMS this module does not own.

#### Where a card leads

The default is `?apartament=<slug>` — the very query the booking page reads —
so the list and the booking page fit together with nothing written. A client
whose apartments are CMS pages under their own addresses writes the shape
instead, on the link or on the whole list:

| Shape | `href` |
|---|---|
| none | `?apartament=apartament-rynek-wroclaw` |
| `/apartamenty/{slug}` | `/apartamenty/apartament-rynek-wroclaw` |
| `/rezerwacja` (no placeholder) | `/rezerwacja?apartament=apartament-rynek-wroclaw` |

`{slug}` and `{id}` are the two references the booking page can resolve, and
both go out `encodeURIComponent`-escaped. Each placeholder is the field it
names and nothing else: an entry whose `slug` is `null` (a nullable field of
the contract) under a `/apartamenty/{slug}` shape leaves the card **without an
`href`** and marked `d2-booking-empty`, rather than pointing at a CMS address
built out of a UUID that cannot exist. So does an entry with neither reference
under the default shape.

#### Paging, and a page that was refused

Paging is `limit` and `offset`. The first page replaces the rows and every
later one is appended, so the guest keeps what they were already reading. A
page that was refused **leaves the offset where it was** — the next click asks
for that same page again instead of skipping it — and says why in
`[d2-booking-results-message]`, in the module's own words (the backend's own
sentence is for logs), with `[d2-booking-results-empty]` taken down: a refusal
is not an offer with nothing in it. A `400` on this route is about what the
filter asked for: the period (`invalid_stay`), or the period and the city once
the search named one (`invalid_search`). An answer that said `has_more: false`
is final: that button asks for nothing more.

A `429` is the one refusal the button does **not** stay open for: it waits
exactly `Retry-After` seconds, like every other button of this module that
meets a rate limit, because opening it at once only buys the guest the next
`429`. A click that gets past the disabled button spends no call either.

`booking:list` reports every page — `{ count, shown, has_more }`, or
`{ reason, status }` when the page was refused.

#### The search above the list

```html
<form d2-booking-search>
  <input type="date"   d2-booking-search-field="check_in">
  <input type="date"   d2-booking-search-field="check_out">
  <input type="number" d2-booking-search-field="adults" value="2">
  <input type="number" d2-booking-search-field="children">
  <select d2-booking-search-field="location">…</select>
  <button type="submit">Szukaj</button>
</form>
```

A submit searches **without reloading the page**: every `[d2-booking-results]`
on the page goes back to its first page with the new filter, and the search
goes into the page address, so a reload keeps it and the link is worth sharing.
The module reads those parameters on start — **before** the first page of any
list — and fills the form with them, so a shared link opens its own result
under a form that shows what was asked for. Webflow's own form handler never
runs: the module takes the submit.

The form and the address are **merged**, not one or the other: a field the form
carries answers for its own key even when it is empty (the guest can see that
field, so clearing it is an answer), and so does anything the form knows
without a field of its own — the calendar's period, a pinned city. Every key
the form has no field for keeps what the address said. A search form built
around the calendar and a party field therefore keeps the city of the link it
was opened with, and a submit in it does not widen the list to the whole
country.

| Attribute | Element | Description |
|---|---|---|
| `d2-booking-search` | Form Block | The search. One form drives every list on the page. |
| `d2-booking-search-field="<name>"` | Input, Select | `check_in` \| `check_out` \| `adults` \| `children` \| `location`. Any other name is ignored with a console warning. |
| `d2-booking-location="<city>"` | the search form, or a list | Pins the city; the guest cannot change it. On a list it wins for that list. Read with raw `getAttribute`. |
| `d2-booking-pinned` | set by the module | On a `location` field under a pin: the value is the pinned city and the field is `disabled`. |
| `d2-booking-search-option` | set by the module | On an `<option>` the module added to a `<select>`, because the city it had to show — out of a link or a pin — was not among the page's own options. |
| `d2-booking-search-bound` | set by the module | This form's submit is taken; a second `apply()` does not take it twice. |

What goes out is what `GET /products` takes and nothing else:

| Parameter | Rule |
|---|---|
| `check_in`, `check_out` | Both or neither — the route takes them together (`errors.json`: a 400 "check_in and check_out go together"). A typed time is dropped, because a filter asks about days, and text that is not a date narrows nothing. |
| `guests` | **adults + children.** The route takes no `adults` and no `children`, so nothing can contradict the sum — a `guests` that does is a `422` (KONTRAKT.md). A page that asks about neither sends no `guests` at all. |
| `location` | The pinned city if there is one, otherwise the `location` field. |
| `limit`, `offset` | The list's own paging, back at `offset=0`. |

The period may be **typed** into the two date fields or **picked** in a
`[d2-booking-calendar]` standing inside the search form — the same calendar the
booking form uses, and the only one: the search reads the stay that calendar
already announced through `select()`. A typed field wins over it, because a
value the guest can see on the page is what they think they are searching for.

**Edge cases**

- Half a period, or a departure that is not after the arrival, asks the API
  **nothing** and says one sentence in `[d2-booking-results-message]`
  (`stay_required` / `invalid_stay`). The route would answer a 400 whose
  sentence is for logs, and the guest would see a list that went empty for no
  reason they can read.
- A **pinned** city beats the `location` field and the address alike, and is
  never written into the address: it is the page's decision, not the guest's
  search. A list may carry a pin with no search form anywhere near it — that is
  how a page of one city is built. Two lists may pin two different cities; each
  list's own pin wins for that list.
- The city is read with raw `getAttribute`, never `digi2.attr`: a place name
  may legally contain `;` or `@`, which the responsive syntax would cut.
- The address keeps the two questions the page asked
  (`?check_in=…&check_out=…&adults=2&children=1&location=Wrocław`), not the sum
  we send, so a shared link can put the party back into the form. Everything
  else the address carried — `?apartament=`, a campaign, a language — stays
  exactly as it was written. The entry is **replaced** and not pushed
  (`replaceState`), so Back still leaves the page instead of walking through
  every narrowing of a filter.
- A `<select>` takes only a value one of **its own** `<option>`s carries: a
  browser answers anything else with `selectedIndex = -1`, so the field stands
  blank and reads back empty. A link naming a city the page does not offer
  (`?location=Gdańsk` over a select of two cities) would therefore lose that
  city twice over — off the screen, and out of the merge, where a field answers
  for its own key even when it is empty — and the guest would get the whole
  offer under an address still promising one city. **The link wins:** the
  module adds the one `<option>` it needs (marked `d2-booking-search-option`)
  and selects it, so the result, the field and the address all name the same
  city, even when that result is empty. The same repair serves a pinned city a
  select does not offer; the page's own options stay what the guest can choose
  between, and the added one is the search they arrived with. A text `<input>`
  takes any city as it is and is never touched.
- A link whose search carries half a period opens the **whole offer** rather
  than a refusal: that sentence belongs to a guest who just pressed search, not
  to a page that is only opening. The city in such a link still applies.
- An answer still in flight when a new search goes out is **dropped**: it would
  show places nobody asked about, and its `offset` would send the paging past
  the rows now on screen, so the next "more" would skip apartments.
- A refusal says the module's own sentence and never the API's: `invalid_stay`,
  `invalid_search` when the filter also named a city, and a `429` that says how
  long to wait from its `Retry-After`. `[d2-booking-results-empty]` goes down
  with every refusal, the module's own included — "nothing found" and "we could
  not ask" are not the same sentence and never stand together.
- A search that **cannot go out** leaves the filter in force exactly as it was:
  the rows on screen and the `offset` beside them belong to it, so the next
  "more" still asks for the next page of the search the guest is reading rather
  than mixing two result sets in one column.
- Two clicks on "Szukaj" ask **once**: a submit repeating a question whose
  first page is still in flight is ignored, so a double click spends one call
  of the key's rate limit and not two. A submit after the answer came back —
  the same question or another — always goes out, because that is a retry.
- A `[d2-booking-search]` searches the lists **of its own page**. On a page with
  no `[d2-booking-results]` the submit is still taken (nothing reloads) and the
  console says so: a hero search form belongs on the page that holds the list.

`booking:search` reports every search —
`{ search: { check_in, check_out, guests, location } }`, plus `message` when
the search was not sent at all.

#### A page that brought no template

A bare `<div d2-booking-results></div>` gets cards the module draws itself —
picture, name, city line, price and its unit, all inside one link — out of the
same injected stylesheet and the same `--d2-booking-*` variables as the drawn
widget. Every rule is scoped to
`[d2-booking-results][d2-booking-results-drawn]`, so a list the Designer built
keeps its own look down to the last card.

### The form

```html
<form d2-booking-form>
  <div d2-booking-field-group>
    <label for="phone">Telefon</label>
    <input id="phone" d2-booking-field="phone">
    <div d2-booking-error="phone"></div>
  </div>
  …
  <div d2-booking-error="form"></div>
</form>
```

| Attribute | Element | Description |
|---|---|---|
| `d2-booking-form` | Form | The booking form. Its own submit is stopped; the module sends the booking. |
| `d2-booking-field="…"` | Input / Select / Textarea / Checkbox | `name`, `email`, `phone`, `note`, `adults`, `children`, `child_ages`, `pets`, `pets_over_threshold`. An unknown value is reported in the console and never sent. |
| `d2-booking-field-group` | wrapper | Optional. Removed together with its field when the key does not ask for it, so the label goes too. Without it only the field itself is removed. A group holding **several** fields where the others stay keeps its place: only the switched-off field and its own message slot go, so one `off` field never takes its neighbours (e.g. the guest count) with it. |
| `d2-booking-error="<field>"` | any element | Where the message for that field is written. `"form"` is the message for the whole form. A missing one is built next to the field and marked `d2-booking-built`. |
| `d2-booking-hint="<field>"` | any element | Where a sentence the **key** decides goes. Today there is one: `pets_over_threshold` gets the product's `pet_fee` — the weight threshold, the amount and whether it is per stay or per night ("Zwierzę powyżej 10 kg: 50,00 zł za pobyt."). Without it the question is unanswerable: nothing on the page says what the threshold is. The drawn widget builds one; a Designer-built form gets the sentence by putting the attribute where they want it. A `pet_fee` of `null` (or an amount we cannot format) leaves the slot empty and marked `d2-booking-empty`, and a `weight_threshold_kg` of `null` drops the threshold wording instead of printing a hole. |
| `d2-booking-required` | set by the module | On every field the key requires (plus `aria-required="true"`). |
| `d2-booking-invalid` | set by the module | On the field a message is pointing at (plus `aria-invalid="true"`). |
| `d2-booking-ready` / `d2-booking-bound` / `d2-booking-busy` | set by the module | `/config` applied / submit bound / a booking is in flight (a second click is ignored, so one impatient guest never creates two holds). |

**Required-ness comes from `/config` `form_fields`**, never from the page:

| State | What happens |
|---|---|
| `off` | the field (and its group) is **removed from the DOM** and never sent |
| `optional` | sent only when the guest filled it — an empty optional field is left out, not sent as `""` |
| `required` | submit is blocked with a message on the field |

`name` and `email` are always required even though `form_fields` does not mention
them. `pets_over_threshold` follows `pets` (it disappears with it, but never
blocks a submit of its own — it is a sub-question). `child_ages` goes `off`
together with `children`. `adults` is never switched off: with `children` off it
*is* the guest count.

The browser-side check is there to be kind, not to be the judge — the backend
decides. It catches an empty required field, a malformed e-mail, a non-number
where a count belongs, a child older than `child_max_age`, an ages list that
does not match the number of children, `pets_over_threshold` larger than `pets`,
and children declared without adults. A `422` that still comes back lands on the
field the backend named (`field_required` → `detail.field`, `validation_error` →
`detail[].loc`); when that field was switched `off`, the message lands on the
form.

**Group composition and `guests`** (`KONTRAKT.md`): `guests` is always
**adults + children**, so no request can contradict itself — the module never
sends a `guests` of its own next to a different sum. With `children` off,
`adults` is left out of the request as well and `guests` carries the count: a
booking must not claim two adults for a stay priced for a different group. A
form with a `children` field but no `adults` field sends `guests` only.

`locale` is the page's own language (`<html lang>`) when the key speaks it
(`languages`), otherwise `default_language`.

### The calendar

```html
<div d2-booking-calendar></div>
```

One empty element is the whole setup: the module draws the month inside it and
never touches what the Designer put there before it. The squares come from
`GET /products/<ref>/availability`, **one window per month**, kept for the whole
visit — walking back and forth never asks the API (or its rate limit) twice for
the same month.

| Attribute | Element | Description |
|---|---|---|
| `d2-booking-calendar` | any Div | The calendar. The product is `d2-booking-product` on this element or on the loader tag, or `?apartament=` from the address. |
| `d2-booking-status` | any element | Optional. Where the chosen range and every refusal about the stay is written, for eyes and for screen readers alike. The module builds one inside the calendar when the page has none (`role="status"`, `aria-live="polite"`); a page may put its own anywhere, and every one of them gets the sentence. |
| `d2-booking-calendar-built` / `-head` / `-month` / `-grid` / `-prev` / `-next` / `-weekdays` | built by the module | The parts of the drawn calendar, so CSS can reach them. |
| `d2-booking-day="YYYY-MM-DD"` | built by the module | One day, always a real `<button type="button">`. |
| `d2-booking-day-busy` / `-past` | set by the module | A night nobody can book — taken, closed by the owner or inside a booking's buffer / before the earliest stay (today plus `lead_time_hours`). |
| `d2-booking-day-selected` / `-checkout` / `-in-range` / `-today` / `-blank` | set by the module | The arrival / the departure / a night between them / today / a leading or trailing empty square. |
| `d2-booking-calendar-ready` / `d2-booking-busy` | set by the module | The month is drawn / a window is in flight. |

**The rules come from the answer, not from the page.** `min_units` and
`max_units` bound the number of nights, `lead_time_hours` closes the days that
are already too close, and `buffer_minutes` widens a busy period of kind
`booking`. That is the whole of what the availability answer carries about the
rules
(`tests/fixtures/booking-api/availability.json`): there is **no check-in-day
rule** in the contract, so the calendar never closes a week day on its own and
every day of the week is a possible arrival.

**`buffer_minutes` widens a booking, and only a booking.** Every entry of `busy`
carries a `kind`: `booking` (someone's stay) or `blackout` (the owner closing
the days). A booking is widened **on both sides** before the nights are counted,
so a cleaning gap really closes the night next to a taken period instead of
letting the guest pick a day the backend will refuse with `409 rental_rules`. A
blackout is an **exact window** and is never widened: "renovation until 12:00"
means the flat is free at 12:00, so the nights touching a blackout stay
bookable. That is how the backend counts it (`rental_violations` in
`services/rental_availability.py` tests the widened stay against periods of kind
`booking` only), and a calendar that widened every period would grey out nights
the backend would have taken — the guest would see a closed square with no
reason given and the booking would be lost. A `kind` the module does not know is
counted as a `booking`, buffer included: a night refused for nothing can be won
back, a double booking cannot.

A blocked square refuses with the code that fits it, so the sentence the guest
reads is true: `period_taken` inside a booking, `blackout_overlap` inside a
blackout, `buffer_conflict` only on the nights the buffer itself took. Where two
periods reach the same night, the overlap wins over the gap — a night inside one
period and merely next to another reads as taken, not as a missing gap.

**A square is a date, never an instant.** Busy periods arrive as UTC instants;
the module converts them to dates in the rental's own `timezone` with `Intl` and
then counts in whole days, so no daylight saving change can move a night. A
period that ends at **local midnight leaves its last date free**: the guest who
leaves that morning never slept there. That is why the first day of a taken
period is still a possible **departure** — a stay of the two nights before a
taken period is bookable, and a stay that would swallow the taken nights is not.

**Two clicks make a stay.** The first is the arrival, the second the departure.
A day before the arrival (or the arrival itself) starts over; a day the rules
refuse says why in the live region and **leaves the arrival where it is**, so
the guest never has to guess which half of the range the calendar dropped. Only
a complete range reaches `digi2.booking.select()` — half a stay is not a stay,
and a missing length never quietly becomes one night.

**Keyboard and screen readers.** The grid is `role="grid"` named by the month
caption, with rows of `role="gridcell"` holding real buttons. The month is one
tab stop (roving `tabindex`), and inside it:

| Key | Moves |
|---|---|
| `←` / `→` | one day; across the edge of the month it draws the next one and keeps the focus on the day |
| `↑` / `↓` | one week |
| `Home` / `End` | start / end of that week |
| `PageUp` / `PageDown` | one month, same day of the month |
| `Enter` / `Space` | picks the day — left to the browser, which already clicks a `<button>` |

A day a guest may not pick carries **`aria-disabled="true"`, never the `disabled`
property**: a day that cannot be reached is a day nobody can be told about. It
stays focusable, says why in its `aria-label`, and a click on it answers with
the reason instead of doing nothing — and with the **right** reason: a day
behind the earliest bookable one answers "this day has passed", never
`period_taken`, because nobody took yesterday and the square's own label
already says it is gone. Every day's label is its full date plus its
state ("11 maja 2027, zajęte"), the month caption is `aria-live="polite"`, and
the chosen range is announced in `[d2-booking-status]`.

### The price

```html
<div d2-booking-breakdown>
  <div d2-booking-line>                 <!-- optional: cloned per line -->
    <span d2-booking-line-label></span>
    <span d2-booking-line-detail></span>
    <span d2-booking-line-amount></span>
  </div>
</div>
<strong d2-booking-total></strong>
<span d2-booking-deposit></span> <span d2-booking-balance></span>
```

| Attribute | Element | Description |
|---|---|---|
| `d2-booking-breakdown` | any Div | Where the rows of the price go. |
| `d2-booking-line` | row inside the breakdown | Optional **template**: the first one the page carries is remembered and cloned per line of the answer, so the price list keeps the styling of the site. Without it the module draws plain rows marked `d2-booking-built`. |
| `d2-booking-line-label` / `-detail` / `-amount` | inside the row | The name of the line / the quantity and the rate / the amount. A slot the template does not have is simply not filled. |
| `d2-booking-line-kind` / `-negative` | set by the module | The `kind` from the answer (`base`, `season`, `weekend`, `season_weekend`, `extra_guest_fee`, `pet_fee`, `cleaning_fee`, `length_discount`) / the amount is below zero, so a discount can be coloured. |
| `d2-booking-total` | any element | The total of the answer. |
| `d2-booking-deposit` / `d2-booking-balance` | any element | What is paid now and what is left for later, from the `…_minor` fields. |
| `d2-booking-empty` | set by the module | On an amount element with nothing to show — `null` is shown as empty, never as "0,00". |

**One quote per settled change.** A chosen range and a changed guest count both
ask `POST /products/<id>/quote`, debounced by 300 ms: clicking a range and
typing a number is one decision, not five. A slower answer to an older question
never overwrites a newer one. Nothing is asked for until the period **and** the
party are known.

**And one quote per question.** The form fires on every keystroke, including in
fields that cannot move the price, so the module remembers the body it last
sent: a settled change whose request would be **byte for byte** the one already
answered is served from that answer and spends no call. Writing a long note
after a priced range costs nothing; changing the party costs exactly one call.

The party comes from the **first `[d2-booking-form]` on the page** (the stay is
one per page, so the price is too), and only the group composition travels:
`guests`, `adults`, `children`, `child_ages`, `pets`, `pets_over_threshold`. The
name, the e-mail and the note are none of the price's business and are never
sent to `quote` — they go with the booking itself. A page with no form at all
still gets a price for the period alone.

**The module prints the answer and computes nothing.** `amount_total` is the
total — never the sum of the rows, because every discount, surcharge and
rounding the owner set lives on the server. Each line is one row. A `…_minor`
amount is divided only by the number of digits `Intl` says that currency has
(two for PLN, none for JPY, three for TND), never by a hard-coded 100. All of it
is formatted with `Intl.NumberFormat` in the language of `/config` and the
**currency of the answer**.

Line labels: a `label` in the answer always wins; otherwise the `kind` gets a
sentence from one table in the module, and an unknown kind is shown by its own
name. `length_discount` carries its rate in the label when the answer has one —
and without it when the answer says `null`, which is what a key with
`merge_cleaning_fee` sends (`KONTRAKT.md`).

**When there is no price to show.** An answer with `available: false`, a `409
rental_rules` and a `400` about the period all **clear** the breakdown and the
total and leave one short sentence in the live region. A price beside "this stay
cannot be had" would be an offer nobody can keep. The sentence comes from the
`violations` codes when the answer has them, from one table at the top of the
module. Its keys are the backend's own `VIOLATION_*` constants
(`services/rental_availability.py`), pinned by
`tests/fixtures/booking-api/errors.json`, all ten of them:
`product_not_bookable`, `unit_not_allowed`, `below_min_units`,
`above_max_units`, `lead_time_too_short`, `blackout_overlap`, `period_taken`,
`buffer_conflict`, `no_price_for_unit` and `too_many_guests`. The numbers in a
sentence are taken from the rental's own rules — "the shortest stay is 3
nights" says 3. An unknown code, and a sentence whose number we do not have,
falls back to the generic one, so no guest ever reads a raw code or a leftover
brace. The calendar refuses with the same codes (plus its own `past`, which the
backend never sends: a day behind today is not a period somebody took), so a
rule caught in the browser and the same rule caught by the backend read alike.

### The drawn widget

```html
<div d2-booking-widget></div>
```

An empty element is the whole setup. Inside it the module draws **every part the
page does not have**: the calendar, the live region, the form (party row, guest
fields, message slot and the submit button), the breakdown, the total and the
deposit/balance. Everything it draws is marked `d2-booking-built`, and the
widget itself gets `d2-booking-widget-ready` so a second `apply()` leaves it
alone.

**The Designer always wins.** A part is looked for on the **whole page**, not
only inside the widget: the price, the form and the live region are one per page
in this module (the quote takes its party from the first `[d2-booking-form]`,
`writeAmount` fills every `[d2-booking-total]`), so a second one would be a
second, silent form. A widget holding the Designer's own calendar and form only
gets what they left out. One page books one stay, so a second
`[d2-booking-widget]` finds every part taken, stays empty and says so in the
console. `d2-booking-product` on the widget is copied onto the calendar and the
form it draws.

The drawn form asks only what the key asks for (`form_fields` decides which
fields exist at all, so `applyFields` has nothing to remove afterwards), a
required field gets a `*` in its label, and `adults` starts at `2` — the party
nearly every rental is priced for, visible in the field and editable, so nobody
is booked for a group they cannot see.

**The look is variables, not opinions.** One `<style d2-booking-styles>` is
injected once. Every colour and spacing rule is scoped to `[d2-booking-widget]`
(and to `[d2-booking-return]` / `[d2-booking-manage]` for the guest's own two
blocks, and to `[d2-booking-results][d2-booking-results-drawn]` for a list that
brought no template) — nothing can reach a calendar, a form or a list styled
by hand outside one — nothing is `!important`, and every colour and measure is
a CSS variable with a default.

There is **one** unscoped rule, and it is layout, not look:
`[d2-booking-calendar-grid] [role=row] { display: grid; grid-template-columns:
repeat(7, 1fr) }`. A month is seven columns or it is nothing, and the grid it
applies to is markup the module built itself, so it can reach nothing the
Designer wrote. That rule alone is injected on a page whose only booking
markup is a bare `<div d2-booking-calendar>`; a page with a widget gets the
whole sheet, which starts with the same rule.

```css
[d2-booking-widget] {
  --d2-booking-accent: #1f6f5c;       /* chosen days, the button */
  --d2-booking-accent-text: #fff;
  --d2-booking-text: #1a1d1c;
  --d2-booking-muted: #6b6f6d;        /* labels, details, the mark */
  --d2-booking-bg: #fff;
  --d2-booking-surface: #f6f5f3;      /* a free day */
  --d2-booking-border: #e0ded9;
  --d2-booking-busy: #fbe7e4;         /* a night someone has */
  --d2-booking-range: #e9f2ef;        /* between arrival and departure */
  --d2-booking-error: #b3261e;
  --d2-booking-radius: 12px;
  --d2-booking-gap: 12px;
  --d2-booking-pad: 16px;
  --d2-booking-width: 420px;
  --d2-booking-font: inherit;
}
```

The drawn `[d2-booking-summary]` ("Razem") and `[d2-booking-later]`
("Teraz … · później …") hide themselves until there is a price — their amount
slots start with `d2-booking-empty` and the sheet hides the row with `:has()`.
A browser without `:has()` simply shows the empty row.

Edge cases worth knowing: a widget placed **inside a Webflow Form block** makes
the drawn `<form>` a nested one. The DOM allows it (we build it with
`createElement`, not the HTML parser) and submit still works, but Webflow's own
handler sits on the outer form — put the widget outside it. And a page that
wants the price somewhere else simply builds `[d2-booking-total]` there: the
widget then draws everything but that.

### The digi2 mark

A widget the module drew carries `[d2-booking-mark]` at its end — an `<a>` to
`https://digi2.agency`, `target="_blank" rel="noopener"`. A page that built its
own widget decides where it goes: put `d2-booking-mark` on any element and the
module fills in the address and the text (an element that already has them keeps
them). A key whose `/config` says `branding_hidden` has **no mark at all** — the
one the page placed is removed too, because the attribute is ours and the key
decides.

The module shows the mark only where a `[d2-booking-mark]` exists or where it
drew the widget itself: injecting a brand link into a page the Designer built by
hand would be a surprise in someone else's layout.

### Payment

Submit is the whole way: `POST …/bookings` creates the booking, then
`POST /bookings/<id>/checkout-session` asks for the payment, then the browser
goes to the address the answer carries. The checkout route takes **no body** —
what is paid and where the provider returns to is the backend's business
(`KONTRAKT.md`: Stripe comes back to `manage_url`). Only an `https` address is
followed (`http://localhost|127.0.0.1` while building); anything else is a
console warning naming `checkout_url`, one sentence for the guest and no
redirect. A redirect is the one thing a tampered answer could use.

**One booking per request.** The submit buttons (`[d2-booking-submit]`, and any
`button[type="submit"]` in the form) are really `disabled` on the first click,
and the attempt is kept twice over:

- `form._d2BookingFlight` — one attempt per form. A second submit is handed the
  promise of the attempt already running, so a guest who corrects a field
  mid-flight does not start a second one.
- a registry keyed on **what the hold stands on** — the product id, the unit,
  `starts_at`, `units_count` and the party. The same request from another form,
  or from the page's own code, joins the attempt in flight (and is released
  when it settles, so the form that joined is not left disabled); and the
  booking it created is remembered, so a retry after a payment hiccup pays that
  booking instead of holding the period twice. The contact fields are
  deliberately **out** of the key: a guest who fixes a typo in their note
  between the refusal and the retry must pay the booking they already hold, not
  ask for a second hold on the same nights. Change the period or the party and
  it is a different stay, so a different booking.

A new attempt clears `d2-booking-payment` first, so CSS keyed on `retry` never
keeps offering a retry over a refusal about the form.

`digi2.booking.book()` still only creates the booking; `checkout()` is the one
that pays, and that is what submit calls.

Refusals are read by `reason`, never by the body's `message` (the same refusal
comes from two routes with different English text):

| Reason | What happens |
|---|---|
| `booking_not_payable`, `booking_already_paid`, `stripe_not_connected`, `stripe_account_not_ready` | Final **for that stay**: its own sentence, the button stays down, `d2-booking-payment="final"`. A further `checkout()` for the *same* period and party answers with the stored refusal instead of calling the API; **another** period is a booking the guest is still entitled to make, and submit sends it. `booking_not_payable` also drops the dead booking from the registry — a hold that expired is exactly the moment somebody reaches for other dates. |
| `payment_provider_unavailable` (502) | `d2-booking-payment="retry"`, the button opens again, the next submit pays the same booking. |
| `too_many_requests` (429) | `d2-booking-payment="wait"`: the sentence names the seconds from `Retry-After` and the button opens again exactly that late. The **same** wait is honoured on the create-booking route, which is the one an impatient guest hammers; a submit that gets past the disabled button during the wait is handed the stored refusal and sends nothing. |
| `payment_required: false` in the 201 | Nothing is paid: `d2-booking-payment="done"`, and the guest reads that the booking is in and the owner decides. |
| no `checkout_url`, or one that is not https | `retry`: the booking is saved, the guest is told so and may try again. |

A good-news sentence (the booking is in, taking you to the payment) goes into
the same `[d2-booking-error="form"]` slot — the place the guest already looks —
marked `d2-booking-ok` so CSS can stop painting it red.

**Back from the checkout.** `pageshow` with `persisted` (the Back button
restoring the page from the browser cache) clears `d2-booking-payment="opening"`
and re-enables the form: a restored page would otherwise show a dead button
under "taking you to the payment". The created booking is remembered, so the
next submit pays that one.

### The return page

```html
<div d2-booking-return></div>
```

The page the payment provider sends the guest back to:
`…?booking=<id>&payment=<success|cancelled|balance_success|balance_cancelled>`.
One empty element is the whole setup — the module reads the booking id out of
the address (or out of the element's own value when the page knows it), asks
`GET /bookings/<id>/status` and says what became of the booking.

The card clears before the webhook lands, so the status is asked **again after
a longer wait each time** — `1, 2, 3, 5, 8, 8, 8, 8` seconds, eight tries over
about forty — and then the block stops and says the payment is still being
checked. A cancelled payment is read **once** and never polled: nothing is on
its way, and a guest who closed the payment on purpose must not watch a
spinner. Re-reading the page (`digi2.booking.apply()`) never starts a second
poll: the block is marked `d2-booking-return-ready` before the first call.

| Attribute | Where | What |
|---|---|---|
| `d2-booking-return` / `d2-booking-return="<id>"` | any element | The block; its value is the booking id when the page knows it. |
| `d2-booking-return-message` | any element | The sentence. Built with `role="status"` / `aria-live="polite"` when the page has none. |
| `d2-booking-return-balance` | any element | What is left to pay and by when (`balance_due_minor`, `balance_due_at`). |
| `d2-booking-return-new` | `<a>` | The way to another period, from the answer's `site_url`. Removed when it is `null` or not an https address. |
| `d2-booking-return-state` | set by the module | `loading`, `checking`, `confirmed`, `paid`, `pending`, `balance_paid`, `cancelled`, `rejected`, `expired`, `unknown`, `error`. |

| The answer | The state | Why |
|---|---|---|
| `status: "confirmed"` | `confirmed` | Nothing more to do. |
| `paid: true` or `status: "paid"` | `paid` | A different sentence from "confirmed": arriving at a locked door is worse than waiting for an e-mail. |
| `status: "expired"`, or `awaiting_payment` with `hold_open: false` | `expired` + the `site_url` link | Nothing was paid and the period is back in the offer. Saying "still being checked" here would keep the guest waiting while the dates go to somebody else. |
| `status: "cancelled"` / `"rejected"` | its own, + the link | |
| `status: "pending"` | `pending`, settled | `payment_mode` tells a prepaid booking from an on-request one, and `pending` is where the second one sits: the booking is in and the owner decides. There is no payment to check, so there is nothing to poll — calling it "still being checked" would leave the guest watching a spinner for forty seconds over a payment that does not exist. |
| `payment=cancelled` in the address | `cancelled` | With the hold still open the guest is pointed back at the link in their e-mail; once it is gone, at a new period. |
| `payment=balance_success` | `balance_paid` only once `balance_due_minor` is gone | The webhook is what moves the money in our books, not what Stripe said in the address. |
| anything else | `checking` | A status the module does not know is **never** guessed into a verdict. |

Only those two cases are ever called expired, because they are the two the
contract makes unambiguous. `site_url: null` means the key has no page to send
the guest to, so the link is removed rather than pointed at `null` — a link
that goes nowhere is worse than no link.

Edge cases:

- A slot the page built is **always** written to: with nothing to say it is
  emptied and marked `d2-booking-empty`, so the Designer's layout keeps its
  place. A slot of ours is drawn **only** when there is something to put in it
  — an empty row we invented is a hole in the page, not a layout.
- `/status` carries no `timezone`, so `balance_due_at` is read on the visitor's
  own clock. It is a date near midday, so no zone moves it.
- A refusal is `state="error"` with our own sentence, never a state that could
  be mistaken for success.

### The manage page

```html
<div d2-booking-return></div>   <!-- the balance comes back here with no token -->
<div d2-booking-manage></div>
```

The link from the e-mail is
`<manage_url>?booking=<id>#token=<token>&action=<details|balance|refund|change-date>`.
The module reads the token out of the fragment **once**, takes it off the
address bar at once with `history.replaceState` (so not even a history entry
keeps it) and sends it only in the `X-Booking-Token` header. It never reaches
the page, the address, an event or `digi2.log`, and the module never looks
inside it: what the link is for comes from `action`, never from the token's
shape — "opaque" forbids exactly that guess. The fragment is read and wiped on
boot **even on a page with no manage block**, so a mistyped page does not leave
a token in the address bar for the whole visit.

The honest price: a reload has no token any more and needs the link from the
e-mail again. The alternative — keeping it in the address or in storage — is a
link that reads someone's booking sitting in a referrer, a screenshot or a
shared URL.

| Attribute | Where | What |
|---|---|---|
| `d2-booking-manage` / `="<id>"` | any element | The block. |
| `d2-booking-manage-field="<name>"` | any element | `booking_id`, `product_name`, `dates`, `starts_at`, `ends_at`, `status`, `paid`, `outstanding`, `refunded`, `balance`, `balance_due_at`, `emergency_phone`. An `<a>` for the phone gets a `tel:` address. |
| `d2-booking-manage-action="<kind>"` | `<button>` | `balance`, `refund`, `date_change`. |
| `d2-booking-manage-input="<name>"` | input / textarea | `requested_starts_at`, `requested_units_count`, `customer_note`. |
| `d2-booking-manage-requests` | any element | The list of the guest's own requests. |
| `d2-booking-manage-request` | row | Optional template, cloned per request, with `…-kind`, `…-status`, `…-date`, `…-note`; gets `d2-booking-manage-request-state`. |
| `d2-booking-manage-message` | any element | The one sentence. |
| `d2-booking-manage-account` | `<a>` | `account_url` from `/config`. Removed when the key has none, or when it is not an https address. |
| `d2-booking-manage-state` | set by the module | `loading`, `ready`, `invalid`, `error`, `returned`. |
| `d2-booking-manage-status` | set by the module | The booking status straight from the answer, for CSS. |

What each link may do (the contract's own table):

| Link | Read | `requests` | `balance-checkout` |
|---|---|---|---|
| `action=details` / `refund` / `change-date` (a `manage` token) | yes | yes, when `refund_available` / `date_change_available` | no |
| `action=balance` (a `balance` token) | yes | no | yes, when `balance_payable` |

`balance_payable: true` on a manage link means the balance *can* be paid, just
not with this link, so the guest is pointed at the balance link in their e-mail
or at `account_url`. An action the answer does not allow is **removed** from
the page, the Designer's own button included: a button the backend would refuse
is an invitation to an error.

Edge cases:

- A `201` on a request means **saved**: the booking does not change, no money
  moves, the owner decides in the panel. The button goes (one waiting request
  closes its kind) and the request joins the list — that list is the only place
  the owner's decision ever reaches the guest, because no e-mail goes out.
- A `409` on `/requests` is either "this booking is closed" or "a request of
  this kind is already waiting". Both answer a plain English sentence meant for
  logs, so the module cannot tell them apart and must not try: one sentence
  covers both, and the kind is closed either way.
- `requested_starts_at` is sent as the rental's **local** time with no zone
  (`2027-05-10T14:00:00`). A zone marker on the input is dropped, not converted
  — the guest picked a day at the rental, not an instant. A `type="date"` input
  becomes midnight and the backend applies its own check-in time.
- Every refusal of a token is the same `booking_not_found` — missing, wrong,
  expired, for another purpose, from another booking or outside the key — so
  the block shows **one** sentence about an invalid link, no data at all and
  the way to `account_url`. Naming a cause would be a guess, and a guess here
  is an oracle for whoever is trying tokens. A refusal that is *not* about the
  token (a dead network, a rate limit) says so under `state="error"`: telling
  that guest their e-mail is worthless sends them looking for a link they
  already have.
- Stripe comes back from the balance to the same manage page **without** a
  token, with `?payment=balance_success`. The manage block then goes quiet
  (`state="returned"`, no sentence) and the return block on the same page reads
  the status — otherwise the guest would read "this link is invalid" next to
  "the balance is paid".
- The group composition does not come back in `manage` and the module does not
  show one: a child's age is not for everyone who knows a booking id (contract).
- A **balance** refusal is read by `reason`, like the first payment, and the
  two paths agree. `no_balance`, `balance_already_paid`, `booking_not_payable`,
  `stripe_not_connected` and `stripe_account_not_ready` take the button with
  them — nothing a click can mend, and a guest clicking anyway spends the
  key's rate limit until the 429. `balance_processing` and
  `payment_provider_unavailable` keep the button, because those really are
  worth another try; a 429 keeps it down for exactly the `Retry-After`
  seconds.

### Module API

```js
await digi2.booking.config();            // /config, read once per page
await digi2.booking.request('GET', '/products/' + ref, { notFound: 'product_not_found' });
digi2.booking.values(form);              // what this form would send right now
digi2.booking.validate(form);            // true / false, marks the fields
digi2.booking.select({ product, unit: 'day', starts_at: '2027-05-01T00:00:00', units_count: 2 });
digi2.booking.stay();                    // the stay chosen right now
await digi2.booking.quote();             // ask for the price now, skipping the debounce
digi2.booking.price();                   // the last quote answer the module printed
digi2.booking.money('550.00', 'PLN');    // amount in whole currency -> guest text
digi2.booking.moneyMinor(16500, 'PLN');  // amount in minor units -> guest text
await digi2.booking.book(form, digi2.booking.stay());      // create the booking only
await digi2.booking.checkout(form, digi2.booking.stay());  // ...and open the payment (what submit does)
await digi2.booking.pay(bookingId);      // payment of a booking that exists
await digi2.booking.status(bookingId);   // read a booking's status once (the return page)
digi2.booking.returned();                // { state, status } — the last status printed
digi2.booking.managed();                 // the last manage answer (never the token)
digi2.booking.message('period_taken');   // the guest's sentence for a reason
digi2.booking.language();                // 'pl' | 'en' | 'de' | 'uk' — what the guest reads
digi2.booking.text('submit_label');      // one sentence out of the dictionary
digi2.booking.text('nights', { count: 21 });           // 'nocy' / 'nights' / 'Nächte' / 'ніч'
digi2.booking.texts('uk');               // that language's own table (a copy)
digi2.booking.apply();                   // re-read the page after a DOM change

digi2.on('booking:ready',   ({ config }) => {});
digi2.on('booking:stay',    ({ stay }) => {});            // chosen or cleared
digi2.on('booking:quote',   ({ quote, reason }) => {});   // price answered or refused
digi2.on('booking:created', ({ booking, form }) => {});
digi2.on('booking:payment', ({ booking_id, url, session, form }) => {});  // leaving for the checkout
digi2.on('booking:refused', ({ reason, status, form }) => {});
digi2.on('booking:return',  ({ booking_id, state, status }) => {});
digi2.on('booking:list',    ({ count, shown, has_more }) => {});  // or ({ reason, status })
digi2.on('booking:search',  ({ search }) => {});          // + message when it was not sent
digi2.on('booking:manage',  ({ booking_id, booking }) => {});
digi2.on('booking:request', ({ booking_id, request }) => {});   // a request was saved
```

Guest-facing copy lives in the dictionaries (see [Languages](#languages)): one
flat table per language, in the shape the portal's i18next files have.

---

## Events

```js
digi2.on('loaded', fn)              // all modules loaded
digi2.on('module:loaded', fn)       // single module (receives name)
digi2.on('module:error', fn)        // module failed
digi2.on('consent:updated', fn)     // consent changed
digi2.on('cms:items-added', fn)     // a CMS list fetched extra rows ({ list, count })
digi2.off('loaded', fn)
digi2.emit('custom', data)
digi2.onReady(fn)                   // alias for on('loaded')
```

### Signals — milestones a late listener still hears

`emit()` reaches whoever is subscribed at that moment. That is the wrong shape for a one-off
milestone such as "the intro animation finished": modules are fetched asynchronously, so on a
fast connection the listener subscribes *after* the milestone and waits forever, while on a slow
one it works — a race that reads as "the popup sometimes never opens".

```js
digi2.signal('intro:done')          // emit AND remember
digi2.when('intro:done', fn)        // run once — immediately if already signalled
digi2.signalled('intro:done')       // → true / false
```

`when()` returns an unsubscribe function and never fires its callback twice. This is what the
popups' [`startOn`](#waiting-for-an-intro--the-starton-option) option is built on.

---

## Module Management

```js
digi2.modules.check('cookies')                   // true / false
digi2.modules.list()                             // ['popups', 'cookies', ...]
await digi2.modules.require('forms')             // load on demand
await digi2.modules.requireAll(['cookies', 'forms'])
```

**Calling a module before it has loaded.** Until a module arrives,
`digi2.popups`, `digi2.forms`, … are the loader's stubs: every method loads the
module, then runs the call on it and returns a Promise of the result. If the
module file loads but throws before it registers `digi2.<namespace>` (a broken
build, a browser too old for its syntax, a clash with another script), the
loader reports it as a failed load:

- `console.error` naming the module, `module:error` on the bus, `digi2.modules.check()` stays `false`;
- the call's Promise is **rejected** and the call is not run;
- `onReady` / `loaded` still fire for the rest of the page — but **early**:
  as soon as one requested module fails, without waiting for the others still
  downloading. A callback that calls another module through its stub still
  works (the stub loads it first); one that reads `digi2.modules.check()` or a
  module's state directly may run before that module has arrived;
- **no retry**: the failed load is remembered, so every later call to that
  module (and `digi2.modules.require()`) is rejected at once until the page
  is reloaded.

Before 1.8.3 the stub replayed the call on itself forever — an endless
microtask loop that froze the whole tab (`load` never fired).

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
| `d2-promo="<url>"` | Loader script | Endpoint with the project's promotion state |
| `d2-promo-state` | Loader script | Promotion state baked into the page |
| `d2-promo-when` | Any | `active` / `inactive` — follow the running promotion |
| `d2-promo-campaign` | Any | Narrow to one campaign key |
| `d2-promo-tag` | Any | Narrow to a tag on discounted products |
| `d2-promo-min-products` | Any | Narrow to a floor on discounted products |

---

## Build

```bash
npm install
npm run build          # webflow-scripts/ → dist/ (minified)
npm run build:watch    # watch mode
```

### Release gate

`npm run release:check [-- vX.Y.Z]` — run before every tag; exit code ≠ 0 means
do not tag. `scripts/release.sh vX.Y.Z "…"` runs it first and stops on red.

| Step | Fails when |
|---|---|
| version (only with an argument) | not `vX.Y.Z[-pre]`; tag already exists locally or on origin; origin cannot be asked; no `## vX.Y.Z` heading in `CHANGELOG.md`; for a stable tag: HEAD is neither on `origin/main` nor the tip of `origin/release/vX.Y.Z` |
| build | terser fails, or `dist/` differs from the committed build (the tag would ship something nobody tested) |
| `npm test` | any node:test suite fails |
| browser gate | `npx playwright test --update-snapshots=none` fails — see below — or a screenshot baseline changed / appeared during the run |

**Only a commit checked for that version can be tagged.** On green, with a
version argument and a clean working tree, the gate appends
`<date> green vX.Y.Z` to `.git/release-gate/<sha>`. The `pre-push` hook
(`.githooks/pre-push`) pushes a `v*` tag only if its commit has a line for
exactly that version — a run without a version, or for another one, does not
count, because the version checks (CHANGELOG, branch, tag free) did not run for
it. A hand-made `git tag` or `npm version` stops at the push.
`npm install` enables the hook (`core.hooksPath .githooks`), and so does
`scripts/release.sh`. `git push --no-verify` still gets past it — without CI
that cannot be closed, but skipping the gate is now a deliberate act.

`scripts/release.sh` also refuses a dirty tree, untracked files included, and
cuts stable tags only from `main` or `release/vX.Y.Z` (a patch from the
previous stable tag, as with v1.8.2 / v1.8.3). It exits non-zero when a
jsDelivr purge does not answer `"status": "finished"` (the tag is pushed by
then: repeat the purge by hand).

The browser gate (`tests/browser/gate.spec.js`, Playwright + headless Chromium)
opens `sandbox/gate-forms.html`, `sandbox/gate-popups.html` and the
`sandbox/gate-booking*.html` pages from a local server
(`tests/browser/serve.js`, 127.0.0.1:5179). They all load
`dist/digi2-loader.min.js`, so the modules come from `dist/` — the exact files
jsDelivr serves after the tag. It checks, in a real browser:

- **forms** — an empty submit is blocked (`form_error`, no `form_submit` /
  `generate_lead`); a valid one gets the hidden fields (`UTM_*`, `PAGE_URL`),
  pushes `form_submit` → `generate_lead` → `form_submit_success`, and nothing
  typed reaches the dataLayer. Webflow's own submit is a stub in the page
  (hides the form, shows `.w-form-done`); `action="#"`.
- **popups** — `d2-show-popup` opens, the close button and Esc close;
  `view_promotion` / `close_promotion` are pushed.
- **datalayer** — the pushes above, through the real bus.
- **booking** — the calendar, the drawn widget and the payment, the list and
  the search, the return and the manage page, each on its own sandbox page with
  the API stubbed from `tests/fixtures/booking-api/`. `gate-booking-lang.html`
  is the dictionaries end to end: a page whose shell is Polish asks for German
  with `d2-booking-lang`, and the widget, the calendar's spoken labels, the
  amounts and the dates all come out German — plus all four tables really
  shipping in `dist/`, Cyrillic through minification and the server included.
- **screenshots** — compared with `tests/browser/__screenshots__/` (at most
  30 differing pixels). A missing baseline fails; it is never written by the
  gate. After a deliberate visual change:
  `npm run test:browser -- --update-snapshots`, look at the new PNGs, commit
  them. Baselines exist for Linux only (`-linux.png`) and use the system
  font, so the gate is meant to run on this machine.
- **every test** — fails on any `pageerror` / `console.error`, any HTTP ≥ 400
  (a module missing from `dist/`) and any request outside localhost.

**Nothing leaves the machine.** `context.route` aborts (and reports) every
non-local request of the whole browser context — every page, popup window and
worker; service workers are blocked; and Chromium starts with
`--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost`,
so no other host resolves at all (WebSockets and `sendBeacon` included). No
client form is ever reached.

**Coverage.** Only forms, popups, booking and datalayer are exercised — 4 of
~24 modules. The others are covered by `npm test` (mini-DOM, no browser). Next
step worth taking: one test per `dist/modules/*.min.js` that loads it through
the loader and fails on any `pageerror`.

Runs in ~10 s (browser part ~3 s) on an idle machine; `globalTimeout` fails a
browser run over 2 minutes. On this low-RAM machine the script caps the
browser with `systemd-run --user --scope -p MemoryMax=4G` when available, and
warns when it runs without the cap.
First time on a machine: `npm install && npx playwright install --only-shell chromium`.
Open the pages by hand with `npm run sandbox`. Failure screenshots and diffs
land in `tests/browser/.results/` (git-ignored).

---

## Project Structure

```
webflow-scripts/              ← source files
  digi2-loader.js
  digi2.js                    ← standalone build (no loader)
  modules/
    google.js, ab-tests.js, popups.js, promo.js, ma.js, cookies.js, forms.js,
    tabs.js, sliders.js, animate.js, toasts.js, scroll.js,
    lazy.js, countdown.js, filter.js, cms.js, format.js,
    copy.js, interactions.js

tests/                        ← node:test suites (node --test tests/)
  browser/                    ← release gate: Playwright spec, screenshots, static server

sandbox/                      ← local test pages (gate-*.html = release gate)
scripts/                      ← release-check.sh, release.sh

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
