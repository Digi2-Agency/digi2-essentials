# digi2 Essentials

Component library for Webflow. One script tag, modular architecture, on-demand loading.

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
  d2-copy
></script>
```

Only the modules you declare get loaded. Loader: **3.7 KB**.

---

## Available Modules

| Attribute | Module | Min Size | Description |
|---|---|---|---|
| `d2-gtm="ID"` | google | 2.4 KB | Consent Mode V2 + GTM + consent manager |
| `d2-popups` | popups | 14.3 KB | 22 animations, triggers, exit intent |
| `d2-cookies` | cookies | 1.2 KB | get/set/remove/getAll |
| `d2-forms` | forms | 12.8 KB | UTM tracking + validation + password toggle |
| `d2-tabs` | tabs | 5.8 KB | Tabs & accordions with animations |
| `d2-sliders` | sliders | 7.6 KB | Carousel with touch/drag, autoplay |
| `d2-animate` | animate | 4.8 KB | 22 scroll animation presets + stagger |
| `d2-toasts` | toasts | 4.3 KB | 5 types, 6 positions, auto-dismiss |
| `d2-scroll` | scroll | 2.3 KB | Smooth scroll + scroll spy |
| `d2-lazy` | lazy | 2.5 KB | Lazy images/video/iframes + blur-up |
| `d2-countdown` | countdown | 3.3 KB | Timer with pause/resume/reset |
| `d2-filter` | filter | 3.5 KB | CMS filtering with animations |
| `d2-cms` | cms | 10.8 KB | CMS list: sort, filter, scroll/load-more (DOM-based) |
| `d2-copy` | copy | 1.9 KB | Clipboard copy with toast feedback |

Total (all modules): **84.9 KB min** / ~30 KB gzipped.

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
| `cookieName` | `'popup_clicked'` | Dismissal cookie |
| `cookieDurationDays` | `1` | Cookie lifespan |
| `excludeUrls` | `[]` | URL patterns to skip |
| `containsUrls` | `['/']` | URL patterns required |
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
| Programmatic | `digi2.popups.show('name')` / `.close('name')` |
| Open selector | `openTriggerSelector: '.btn'` |
| Close selector | `closeTriggerSelector: '.close'` |
| On load | `openOnLoad: true` |
| After delay | `openAfterDelay: 5` |
| Exit intent | `openOnExitIntent: true` |
| Page views | `openAfterPageViews: 3` |

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
    <input type="checkbox" name="CONSENT_GDPR" />
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
  <button d2-tab="monthly">Monthly</button>
  <button d2-tab="yearly">Yearly</button>
  <div d2-tab-content="monthly">Monthly plans...</div>
  <div d2-tab-content="yearly">Yearly plans...</div>
</div>
```

```js
digi2.tabs.create('pricing', { animation: 'fade' })
```

### Accordion Mode

```js
digi2.tabs.create('faq', {
  mode: 'accordion',
  allowMultiple: true,
  animation: 'slide-down',
})
```

### Options

| Option | Default | Description |
|---|---|---|
| `mode` | `'tabs'` | `'tabs'` or `'accordion'` |
| `allowMultiple` | `false` | Accordion: multiple open |
| `animation` | `'fade'` | none / fade / slide-up / slide-down / zoom |
| `animationDuration` | `0.25` | Seconds |
| `defaultOpen` | `null` | Tab id or array |
| `activeClass` | `'d2-tab-active'` | Class on active trigger |
| `hashSync` | `false` | Sync with URL hash |
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

> **Attribute prefix note:** This module uses `d2-cms-*` attributes **without** the `data-` prefix (deliberate — keeps Webflow Designer's custom-attribute fields shorter). This is the only module in the library that does this. Don't "fix" it.

```html
<!-- The collection list (replace .w-dyn-items with whatever wraps your items) -->
<div d2-cms-list="products" class="w-dyn-items">
  <div d2-cms-item
       d2-cms-field-title="Alpha Sneaker"
       d2-cms-field-price="129"
       d2-cms-field-category="shoes">…</div>
  <div d2-cms-item
       d2-cms-field-title="Beta Cap"
       d2-cms-field-price="29"
       d2-cms-field-category="hats">…</div>
  <!-- … bind values from your Webflow CMS fields into these attributes in the Designer -->
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

You can also expose field values via nested elements instead of attributes:

```html
<div d2-cms-item>
  <h3 d2-cms-field="title">Alpha Sneaker</h3>
  <span d2-cms-field="price">129</span>
</div>
```

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
| `d2-cms-list="name"` | list container | Marks the list and gives it a name |
| `d2-cms-item` | each item (optional) | Explicit item marker; defaults to direct children |
| `d2-cms-field-{name}="value"` | item | Sortable / filterable field value |
| `d2-cms-field="{name}"` | element inside item | Alternative: read `.textContent` of this element |
| `d2-cms-sort="field"` | button | Click toggles sort by this field |
| `d2-cms-sort-type="number\|string\|date"` | button | Override auto-detection of value type |
| `d2-cms-sort-dir="asc\|desc"` | button | Force a fixed direction (no toggle) |
| `d2-cms-filter="key:value"` | button | Toggle a filter |
| `d2-cms-load-more` | button | Reveal next `perPage` items |
| `d2-cms-target="name"` | sort/filter/load-more buttons | Target a specific list by name (or place button inside `[d2-cms-list]` to scope automatically) |
| `d2-cms-empty` | any element | Shown when 0 items match |
| `d2-cms-sort-active="asc\|desc"` | button | (Set by module) Reflects current sort — style with `[d2-cms-sort-active="desc"]` selectors |
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
| `d2-form="name"` | Div | Form enhancement wrapper |
| `d2-form-error-{rule}` | Inside label | Per-rule error message |
| `d2-form-summary` | Inside form | Summary error container |
| `d2-password-toggle` | Button | Toggle password visibility |
| `d2-tab-group="name"` | Div | Tabs/accordion wrapper |
| `d2-tab="id"` | Button | Tab trigger |
| `d2-tab-content="id"` | Div | Tab panel |
| `d2-slider="name"` | Div | Slider container |
| `d2-slide` | Div | Slide item |
| `d2-slider-track` | Div | Slide track |
| `d2-slider-prev/next` | Button | Arrow navigation |
| `d2-slider-dots` | Div | Dot navigation |
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
    google.js, popups.js, cookies.js, forms.js,
    tabs.js, sliders.js, animate.js, toasts.js,
    scroll.js, lazy.js, countdown.js, filter.js, copy.js

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
