# digi2 Essentials

Component library for Webflow. One script tag, modular architecture, on-demand loading.

---

## Quick Start

Add a single script tag to your Webflow project's **Custom Code** (Site Settings → Head):

```html
<script
  src="https://cdn.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@latest/dist/digi2-loader.min.js"
  d2-google
  d2-popups
  d2-cookies
  d2-forms
  g-gtm-id="GTM-XXXXXXX"
></script>
```

Only the modules you declare via `d2-*` attributes get loaded. The loader itself is **1.9 KB**.

---

## Architecture

```
dist/
  digi2-loader.min.js       ← the only file you embed (1.9 KB)
  modules/
    google.min.js            ← Consent Mode V2 + GTM (2.2 KB)
    popups.min.js            ← Popup/modal manager (8.1 KB)
    cookies.min.js           ← Cookie helpers (961 B)
    forms.min.js             ← Form tracking + UTM (3.7 KB)
```

The loader reads its own `src` to derive the base URL, then injects `<script>` tags for each requested module. If the loader is loaded as `.min.js`, modules are also loaded as `.min.js` automatically.

---

## Available Modules

| Attribute | Module | Size (min) | Description |
|---|---|---|---|
| `d2-google` | `modules/google.js` | 2.2 KB | Consent Mode V2 + GTM injection + consent manager |
| `d2-popups` | `modules/popups.js` | 8.1 KB | Popup/modal manager with animations |
| `d2-cookies` | `modules/cookies.js` | 961 B | Cookie get/set/remove helpers |
| `d2-forms` | `modules/forms.js` | 3.7 KB | Form enhancement with UTM, IP, GA tracking |

---

## Loader Attributes

| Attribute | Required | Description |
|---|---|---|
| `d2-google` | No | Load the Google module |
| `d2-popups` | No | Load the Popups module |
| `d2-cookies` | No | Load the Cookies module |
| `d2-forms` | No | Load the Forms module |
| `g-gtm-id="GTM-XXX"` | If using `d2-google` | Your GTM container ID |

---

## Google Module

Handles Consent Mode V2, GTM injection, and a consent manager API.

### What it does automatically

1. Sets up `window.dataLayer` and `window.gtag()`
2. Applies Consent Mode V2 defaults — **all denied**
3. Restores consent from `localStorage` on return visits
4. Injects GTM into `<head>` + noscript iframe into `<body>`

### Consent Categories

| Category | Description |
|---|---|
| `ad_personalization` | Google Ads personalization |
| `ad_storage` | Google Ads cookies |
| `ad_user_data` | Google Ads conversion data |
| `analytics_storage` | Google Analytics cookies |
| `personalization_storage` | Recommendations / personalization |
| `functionality_storage` | Functionality (language, preferences) |
| `security_storage` | Auth & security |

### Consent API

```js
// Get current state
digi2.google.consent.get()
// → { ad_storage: 'denied', analytics_storage: 'denied', ... }

// Grant / deny single category
digi2.google.consent.grant('analytics_storage')
digi2.google.consent.deny('ad_storage')

// Bulk update
digi2.google.consent.update({
  analytics_storage: 'granted',
  functionality_storage: 'granted',
})

// Accept all / reject all (for cookie banner buttons)
digi2.google.consent.grantAll()
digi2.google.consent.denyAll()

// Reset saved consent
digi2.google.consent.reset()

// List category names
digi2.google.consent.categories()

// Push to dataLayer
digi2.google.dataLayerPush({ event: 'custom_event', value: 123 })

// Get configured GTM ID
digi2.google.getGtmId()
```

Every consent change persists to `localStorage` and pushes `gtag('consent', 'update', ...)` immediately.

---

## Popups Module

### Create a popup

```js
digi2.popups.create('newsletter', {
  popupSelector: '#newsletter-overlay',
  animation: 'slide-up',
  openAfterDelay: 3,
  closeTriggerSelector: '.close-btn',
  cookieName: 'nl_seen',
  cookieDurationDays: 7,
})
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `popupSelector` | string | `'.popup__overlay'` | CSS selector for the popup element |
| `openTriggerSelector` | string | `null` | CSS selector — clicks open this popup |
| `closeTriggerSelector` | string | `null` | CSS selector — clicks close this popup |
| `dataTagTrigger` | boolean | `true` | Listen for `data-d2-show-popup="name"` clicks |
| `animation` | string | `'fade'` | `none` `fade` `slide-up` `slide-down` `slide-left` `slide-right` `zoom` |
| `animationDuration` | number | `0.4` | Animation duration in seconds |
| `openOnLoad` | boolean | `true` | Show immediately on page load |
| `openAfterDelay` | number | `null` | Show after N seconds |
| `openOnExitIntent` | boolean | `false` | Show on exit intent (mouse leave / mobile scroll up) |
| `openAfterPageViews` | number | `null` | Show after N page views (sessionStorage) |
| `cookieName` | string | `'popup_clicked'` | Dismissal cookie name |
| `cookieDurationDays` | number | `1` | How long dismissal lasts |
| `excludeUrls` | array | `[]` | URL patterns to skip |
| `containsUrls` | array | `['/']` | URL patterns required to show |
| `onOpen` | function | `null` | Callback(instance) on show |
| `onClose` | function | `null` | Callback(instance) on hide |

### Animations

| Value | Effect |
|---|---|
| `none` | Instant show/hide |
| `fade` | Opacity fade in/out |
| `slide-up` | Fade + slide from bottom |
| `slide-down` | Fade + slide from top |
| `slide-left` | Fade + slide from right |
| `slide-right` | Fade + slide from left |
| `zoom` | Fade + scale from 85% |

### API

```js
// Registry
digi2.popups.create('name', options)   // create instance
digi2.popups.get('name')               // get instance
digi2.popups.destroy('name')           // remove + cleanup
digi2.popups.list()                    // list registered names

// Show / close by name
digi2.popups.show('name')
digi2.popups.close('name')             // sets dismissal cookie
digi2.popups.close('name', false)      // close WITHOUT setting cookie

// Instance methods
var popup = digi2.popups.get('name')
popup.show()
popup.hide()
popup.destroy()
```

### Data Attribute Triggers

Any element on the page can open a popup by name:

```html
<button data-d2-show-popup="newsletter">Subscribe</button>
<a href="#" data-d2-show-popup="promo">See Offer</a>
```

Disable per-instance with `dataTagTrigger: false`.

---

## Cookies Module

```js
// Set a cookie
digi2.cookies.set('theme', 'dark', { days: 30 })
digi2.cookies.set('token', 'xyz', { days: 7, secure: true, sameSite: 'Strict' })
digi2.cookies.set('session', 'abc')          // session cookie (no expiry)

// Get
digi2.cookies.get('theme')       // 'dark'
digi2.cookies.get('missing')     // null

// Check
digi2.cookies.has('theme')       // true

// Get all
digi2.cookies.getAll()           // { theme: 'dark', session: 'abc', ... }

// Remove
digi2.cookies.remove('theme')
```

### Set Options

| Option | Type | Default | Description |
|---|---|---|---|
| `days` | number | — | Expiration in days. Omit for session cookie |
| `path` | string | `'/'` | Cookie path |
| `domain` | string | — | Cookie domain |
| `secure` | boolean | `false` | HTTPS only |
| `sameSite` | string | `'Lax'` | `Lax` `Strict` `None` |

---

## Forms Module

Enhances Webflow forms with auto-injected hidden fields for UTM tracking, click IDs, GA client ID, IP address, and page metadata.

### Setup in Webflow

Wrap your form in a div with `data-d2-form`:

```html
<div data-d2-form="contact">
  <form>
    <!-- your Webflow form fields -->
  </form>
</div>
```

### Create

```js
digi2.forms.create('contact', {
  utmTracking: true,
  clickIdTracking: true,
  gaClientId: true,
  ipTracking: true,
  pageMeta: true,
  customFields: {
    lead_source: 'website',
  },
})
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `formSelector` | string | `null` | CSS selector (alternative to `data-d2-form` wrapper) |
| `utmTracking` | boolean | `true` | Capture UTM params from URL → cookie → hidden field |
| `clickIdTracking` | boolean | `true` | Capture gclid, fbclid, msclkid |
| `gaClientId` | boolean | `true` | Capture GA4 client ID from `_ga` cookie |
| `ipTracking` | boolean | `false` | Fetch visitor IP via API |
| `pageMeta` | boolean | `true` | Inject page URL, title, referrer |
| `cookieDurationDays` | number | `365` | How long UTM/click ID cookies persist |
| `customFields` | object | `{}` | `{ name: 'value' }` — extra hidden fields |
| `ipApiUrl` | string | `'https://api.ipify.org?format=json'` | IP lookup endpoint |
| `onReady` | function | `null` | Callback(instance) after fields injected |
| `validation` | object | `null` | `{ fieldName: { rule: value, ... }, ... }` |
| `errorClass` | string | `'d2-error'` | CSS class added to invalid fields |
| `errorAttribute` | string | `'data-d2-error'` | Attribute set on invalid fields (value = error names) |
| `validateOn` | string | `'both'` | `'blur'` `'submit'` `'both'` |
| `onValidationError` | function | `null` | Callback(fieldName, errors, inputEl) |
| `onSubmit` | function | `null` | Callback(data, formEl) — only fires if valid |

### Validation Rules

| Rule | Type | Description |
|---|---|---|
| `required` | boolean | Field must not be empty |
| `email` | boolean | Valid email format |
| `phone` | boolean | Valid phone (digits, spaces, dashes, parens, +) |
| `url` | boolean | Valid URL starting with http(s):// |
| `number` | boolean | Valid number (integer or decimal) |
| `integer` | boolean | Valid integer only |
| `letters` | boolean | Letters, spaces, hyphens, apostrophes only |
| `numbers` | boolean | Digits only |
| `alphanumeric` | boolean | Letters and digits only |
| `noSpaces` | boolean | No whitespace allowed |
| `noSpecialChars` | boolean | Letters, digits, spaces only |
| `minLength` | number | Minimum string length |
| `maxLength` | number | Maximum string length |
| `min` | number | Minimum numeric value |
| `max` | number | Maximum numeric value |
| `pattern` | string/RegExp | Must match regex pattern |
| `equals` | string | Must equal exact value |
| `matchField` | string | Must match another field's value (by name) |

### Validation Example

```js
digi2.forms.create('contact', {
  validation: {
    name:     { required: true, minLength: 2, letters: true },
    email:    { required: true, email: true },
    phone:    { phone: true },
    password: { required: true, minLength: 8 },
    confirm:  { required: true, matchField: 'password' },
    age:      { number: true, min: 18, max: 120 },
    website:  { url: true },
    username: { required: true, alphanumeric: true, minLength: 3, maxLength: 20 },
  },
  errorClass: 'd2-error',
  validateOn: 'both',
  onValidationError: function (field, errors, el) {
    console.log(field + ' failed:', errors);
  },
})
```

In Webflow, style invalid fields with a combo class:

```css
.d2-error {
  border-color: #ef4444;
}
```

Or target the attribute for per-rule styling:

```css
input[data-d2-error*="required"] { /* ... */ }
input[data-d2-error*="email"]    { /* ... */ }
```

### Standalone Validation

Use without a form instance:

```js
digi2.forms.validate('hello@test.com', { required: true, email: true })
// → { valid: true, errors: [] }

digi2.forms.validate('', { required: true, minLength: 3 })
// → { valid: false, errors: ['required', 'minLength'] }

digi2.forms.validate('abc', { pattern: /^\d+$/ })
// → { valid: false, errors: ['pattern'] }
```

### Custom Rules

```js
digi2.forms.addRule('noBadWords', function (value, ruleParam) {
  var banned = ['spam', 'test'];
  return !banned.some(function (w) { return value.toLowerCase().includes(w); });
});

// Use it
digi2.forms.create('feedback', {
  validation: {
    message: { required: true, noBadWords: true },
  },
})
```

### Auto-Injected Hidden Inputs

| Input `name` | Source | Option |
|---|---|---|
| `utm_campaign_hidden` | URL param → cookie | `utmTracking` |
| `utm_source_hidden` | URL param → cookie | `utmTracking` |
| `utm_medium_hidden` | URL param → cookie | `utmTracking` |
| `utm_content_hidden` | URL param → cookie | `utmTracking` |
| `utm_term_hidden` | URL param → cookie | `utmTracking` |
| `gclid` | URL param → cookie | `clickIdTracking` |
| `fbclid` | URL param → cookie | `clickIdTracking` |
| `msclkid` | URL param → cookie | `clickIdTracking` |
| `gaclientid` | `_ga` cookie | `gaClientId` |
| `page_url` | `window.location.href` | `pageMeta` |
| `page_title` | `document.title` | `pageMeta` |
| `page_referrer` | `document.referrer` | `pageMeta` |
| `ip_address` | ipify.org API | `ipTracking` |

### API

```js
// Registry
digi2.forms.create('name', options)
digi2.forms.get('name')
digi2.forms.destroy('name')
digi2.forms.list()

// Standalone validation
digi2.forms.validate(value, rules)          // → { valid, errors }
digi2.forms.addRule('name', fn)             // register custom rule

// Instance methods
var form = digi2.forms.get('contact')
form.getData()                              // { utm_source_hidden: 'google', ... }
form.setField('custom_field', '42')         // add/update a hidden field
form.validateAll()                          // validate all fields, returns boolean
form.clearErrors()                          // remove all error indicators
```

---

## Events

Global event system on the `digi2` namespace:

```js
digi2.on('loaded', fn)              // all modules loaded
digi2.on('module:loaded', fn)       // single module loaded (receives name)
digi2.on('module:error', fn)        // module failed (receives name)
digi2.on('consent:updated', fn)     // consent changed (receives state object)
digi2.off('loaded', fn)             // remove specific listener
digi2.off('loaded')                 // remove all listeners for event
digi2.emit('custom', data)          // emit custom event
digi2.onReady(fn)                   // alias for digi2.on('loaded', fn)
```

Subscribing to `loaded` after modules already loaded calls `fn` immediately — no race conditions.

---

## Debug Mode

Add `d2-debug-mode` to the loader script tag to log all actions to the console:

```html
<script src="...digi2-loader.min.js" d2-popups d2-forms d2-debug-mode></script>
```

This enables colored console output for every action across all modules:

```
[digi2.loader]  initialized              { baseUrl: '...', minified: true, debug: true }
[digi2.loader]  loading module → popups  https://cdn.../modules/popups.min.js
[digi2.loader]  module loaded ✓ popups
[digi2.popups]  init → newsletter        { popupSelector: '#nl-overlay', ... }
[digi2.popups]  show → newsletter        { animation: 'slide-up' }
[digi2.forms]   init → contact           { utmTracking: true, ... }
[digi2.forms]   inject field → utm_source_hidden  'google'
[digi2.forms]   validate field → email   { value: '', valid: false, errors: ['required'] }
[digi2.google]  consent update           { analytics_storage: 'granted', ... }
[digi2.events]  emit → consent:updated   { ... }
```

### Programmatic Control

```js
// Check if debug is on
digi2.debug                              // true / false

// Enable at runtime (without the attribute)
digi2.debug = true

// Manual logging from your own code
digi2.log('myModule', 'some action', { data: 123 })
```

Remove `d2-debug-mode` for production — all `digi2.log()` calls become no-ops with zero overhead.

---

## Module Management

Load modules on the fly at runtime:

```js
// Check if loaded
digi2.modules.check('cookies')                   // true / false

// List loaded modules
digi2.modules.list()                             // ['google', 'popups']

// Load on demand (returns Promise)
await digi2.modules.require('forms')

// Load multiple
await digi2.modules.requireAll(['cookies', 'forms'])
```

---

## Data Attributes

| Attribute | Element | Description |
|---|---|---|
| `data-d2-show-popup="name"` | Any | Click opens popup by name |
| `data-d2-form="name"` | Div wrapping a form | Marks form for enhancement |

---

## Build

```bash
npm install            # install terser
npm run build          # minify webflow-scripts/ → dist/
npm run build:watch    # watch mode, rebuild on changes
```

### Output

| File | Source | Minified |
|---|---|---|
| `digi2-loader.js` | 14.2 KB | 1.9 KB |
| `modules/google.js` | 7.6 KB | 2.2 KB |
| `modules/popups.js` | 15.8 KB | 8.1 KB |
| `modules/cookies.js` | 3.0 KB | 961 B |
| `modules/forms.js` | 10.4 KB | 3.7 KB |
| **Total** | **66.7 KB** | **25.5 KB** |

---

## Project Structure

```
webflow-scripts/              ← source files (development)
  digi2-loader.js             ← loader with full docs in header
  digi2.js                    ← standalone build (all-in-one, no loader needed)
  modules/
    google.js
    popups.js
    cookies.js
    forms.js

dist/                         ← built files (production)
  digi2-loader.js             ← raw copy
  digi2-loader.min.js         ← minified
  modules/
    *.js                      ← raw copies
    *.min.js                  ← minified

build.js                      ← build script (Terser)
package.json
```

---

## Full Example

```html
<!-- In Webflow: Site Settings → Custom Code → Head Code -->
<script
  src="https://cdn.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@latest/dist/digi2-loader.min.js"
  d2-google
  d2-popups
  d2-cookies
  d2-forms
  g-gtm-id="GTM-WF7W3BH4"
></script>

<script>
  digi2.onReady(function () {

    // Exit-intent popup
    digi2.popups.create('newsletter', {
      popupSelector: '#nl-overlay',
      animation: 'slide-up',
      openOnExitIntent: true,
      openOnLoad: false,
      closeTriggerSelector: '.nl-close',
      cookieName: 'nl_seen',
      cookieDurationDays: 7,
    });

    // Enhance contact form with tracking
    digi2.forms.create('contact', {
      ipTracking: true,
      customFields: { lead_source: 'website' },
    });

    // Cookie consent banner buttons
    document.querySelector('.accept-all').addEventListener('click', function () {
      digi2.google.consent.grantAll();
      digi2.popups.close('cookie-banner');
    });

    document.querySelector('.reject-all').addEventListener('click', function () {
      digi2.google.consent.denyAll();
      digi2.popups.close('cookie-banner');
    });

  });
</script>
```

```html
<!-- Anywhere in your Webflow page -->
<button data-d2-show-popup="newsletter">Subscribe</button>

<div data-d2-form="contact">
  <form>
    <input type="text" name="name" placeholder="Name">
    <input type="email" name="email" placeholder="Email">
    <button type="submit">Send</button>
    <!-- hidden tracking fields are auto-injected here -->
  </form>
</div>
```

---

## License

MIT
