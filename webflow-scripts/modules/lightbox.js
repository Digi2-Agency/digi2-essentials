/**
 * digi2 — Lightbox Module
 * Loaded automatically by digi2-loader.js when d2-lightbox is present.
 *
 * Click any [d2-lightbox] element to open a fullscreen gallery. The gallery
 * shows a custom, Designer-built modal when the page has one — otherwise a
 * built-in dark modal is injected, so the module works with zero setup.
 *
 * Triggers (clickable thumbs — delegated, so CMS-rendered items just work):
 *   d2-lightbox                  — makes the element (an <img> or a wrapper) open the gallery.
 *                                  Optional value = gallery name: d2-lightbox="penthouse".
 *   d2-lightbox-item             — alias for d2-lightbox (same semantics, same optional name).
 *   d2-lightbox-src="URL"        — full-size image URL override (bindable to a CMS field).
 *                                  Also works STANDALONE: any element with just this attribute
 *                                  is clickable and opens that URL.
 *   d2-lightbox-image="URL"      — standalone URL trigger too (outside a modal); inside a
 *                                  [d2-lightbox-modal] the same attribute is the image slot.
 *   img[d2-lightbox-full]        — alternative: a (hidden) full-size twin <img> inside the
 *                                  trigger; its src is used instead of the thumb's.
 *   d2-lightbox-caption="text"   — caption for this image (fallback: the img's alt).
 *
 * Gallery grouping — which images end up in one gallery (checked in order):
 *   1. explicit name:            all triggers sharing d2-lightbox="name" on the page
 *   2. [d2-lightbox-group]       nearest ancestor with this attribute scopes its bare triggers
 *   3. [d2-cms-item]             inside a digi2 CMS list each item is its own gallery (zero config)
 *   4. otherwise                 all remaining bare triggers form one page-wide gallery
 *   Slider clones ([d2-slide-clone]) are skipped and duplicate URLs are deduped.
 *
 * Custom modal (built in the Designer — leave it visible, the module hides it on load):
 *   d2-lightbox-modal            — modal root. Optional value = display used when open
 *                                  (default "flex"): d2-lightbox-modal="grid".
 *   Slots inside the modal (all optional except the image):
 *     d2-lightbox-image          — <img> that receives the current photo (required)
 *     d2-lightbox-close          — click closes (any number of them)
 *     d2-lightbox-prev / -next   — navigation; auto-hidden when the gallery has 1 photo
 *     d2-lightbox-counter        — text like "3 / 12"; optional value = template,
 *                                  e.g. d2-lightbox-counter="{current} z {total}"
 *     d2-lightbox-current/-total — separate number slots
 *     d2-lightbox-caption        — element that receives the caption (hidden when empty)
 *     d2-lightbox-thumbs         — container the module fills with clickable thumbnail
 *                                  <img d2-lightbox-thumb="i"> elements; the active one
 *                                  carries d2-is-active (style it in CSS)
 *     d2-lightbox-backdrop       — clicking this closes (clicking the modal root itself also closes)
 *   d2-lightbox-loop="false"     — on the modal root: stop at the ends instead of wrapping.
 *
 * Built-in variants — set once where the module is imported, via the value of
 * the d2-lightbox flag:
 *   <script d2-lightbox="thumbs" src=".../digi2-loader.min.js"></script>
 *   <digi2-module d2-lightbox="counter"></digi2-module>
 *   "counter" (default)          — bottom shows "1 / 4"
 *   "thumbs"                     — bottom shows a clickable thumbnail strip instead
 * d2-lightbox-variant on a trigger or any of its ancestors (CMS item, section,
 * body) overrides the page default for that gallery.
 * Counter, thumbs and drag are all disabled for single-photo galleries.
 * Triggers get cursor: zoom-in, close/prev/next/thumb slots cursor: pointer
 * (one injected stylesheet, override in your own CSS if needed).
 * Hovering a trigger also shows a floating magnifier badge centered over it
 * (works for <img> triggers and CMS-rendered items — nothing is inserted into
 * your markup). Disable it with d2-lightbox-icon="false" on the trigger or
 * any ancestor (section, body).
 *
 * Native Webflow lightboxes: when this module is on the page it takes over
 * clicks on .w-lightbox links — they open in THIS lightbox (Webflow "group"
 * media lists are respected and merged in DOM order), so native and d2
 * galleries look identical. Video items stay native (this module is
 * image-only). Add d2-lightbox-skip to a .w-lightbox link to leave it alone.
 *
 * Behavior: Esc closes, arrow keys navigate, drag/swipe left-right with the
 * mouse or a finger (the image follows the drag), body scroll is locked while
 * open, adjacent images are preloaded.
 *
 * API:
 *   window.digi2.lightbox.open(triggerEl | 'groupName' | [{src, caption}], index?)
 *   window.digi2.lightbox.close()
 *   window.digi2.lightbox.next() / .prev()
 *   window.digi2.lightbox.isOpen()
 *   window.digi2.lightbox.refresh()   — re-hide custom modals added to the DOM later
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  function _log(action, data) {
    if (window.digi2.log) window.digi2.log('lightbox', action, data);
  }

  function _emit(event, data) {
    if (typeof window.digi2.emit === 'function') window.digi2.emit(event, data);
  }

  // Responsive-aware getAttribute. Falls back to raw read when the loader
  // hasn't installed digi2.attr yet (older builds, standalone usage).
  function attr(el, name) {
    if (!el) return null;
    if (window.digi2 && typeof window.digi2.attr === 'function') {
      return window.digi2.attr(el, name, null);
    }
    return el.getAttribute(name);
  }

  function toArray(list) {
    return Array.prototype.slice.call(list || []);
  }

  // ---------------------------------------------------------------------------
  // State — a single gallery can be open at a time
  // ---------------------------------------------------------------------------
  var state = {
    open: false,
    modal: null,        // active modal root element
    slots: null,        // resolved slot elements of the active modal
    items: [],          // [{ src, caption, thumb }]
    index: 0,
    loop: true,
    display: 'flex',
    variant: 'counter', // built-in bottom UI: 'counter' | 'thumbs'
    track: null,        // built-in modal: { viewport, track, slides:[img,img,img] }
    imageBg: '',        // background painted behind photos (fills transparent PNGs)
    savedOverflow: '',
    lastFocus: null,
  };

  var builtinModal = null; // cached injected fallback modal

  // ---------------------------------------------------------------------------
  // Source + caption resolution
  // ---------------------------------------------------------------------------

  // Prefer the src ATTRIBUTE over currentSrc: with Webflow's responsive srcset
  // currentSrc may be a small variant, while the attribute holds the original.
  function imgSrc(img) {
    if (!img) return null;
    var raw = img.getAttribute ? img.getAttribute('src') : null;
    return raw || img.currentSrc || img.src || null;
  }

  function resolveSrc(trigger) {
    var explicit = attr(trigger, 'd2-lightbox-src') || attr(trigger, 'd2-lightbox-image');
    if (explicit) return explicit;
    var full = trigger.querySelector ? trigger.querySelector('img[d2-lightbox-full]') : null;
    if (full) return imgSrc(full);
    if (trigger.tagName === 'IMG') return imgSrc(trigger);
    var img = trigger.querySelector ? trigger.querySelector('img') : null;
    return imgSrc(img);
  }

  function resolveCaption(trigger) {
    var c = attr(trigger, 'd2-lightbox-caption');
    if (c != null) return c;
    var img = trigger.tagName === 'IMG' ? trigger : (trigger.querySelector ? trigger.querySelector('img') : null);
    return (img && img.getAttribute && img.getAttribute('alt')) || '';
  }

  // Thumbnail strip source — prefer the small variant the trigger already
  // displays (currentSrc picks the responsive srcset candidate) over the
  // full-size gallery file.
  function resolveThumb(trigger) {
    var img = trigger.tagName === 'IMG' ? trigger : (trigger.querySelector ? trigger.querySelector('img') : null);
    if (!img) return null;
    return img.currentSrc || (img.getAttribute && img.getAttribute('src')) || null;
  }

  // ---------------------------------------------------------------------------
  // Gallery grouping
  // ---------------------------------------------------------------------------

  // A trigger is d2-lightbox / d2-lightbox-item (with or without a name), or a
  // bare URL attribute (d2-lightbox-src / d2-lightbox-image with a value).
  // d2-lightbox-image doubles as the modal's image slot — modal internals are
  // excluded from trigger matching, so the two roles never collide.
  var TRIGGER_SELECTOR = '[d2-lightbox], [d2-lightbox-item], [d2-lightbox-src], [d2-lightbox-image]';

  // Group identity uses the RAW attribute value — the responsive "a;b@911"
  // syntax makes no sense for gallery names.
  function groupName(trigger) {
    return trigger.getAttribute('d2-lightbox') || trigger.getAttribute('d2-lightbox-item') || '';
  }

  function isSliderClone(el) {
    return !!(el.closest && el.closest('[d2-slide-clone]'));
  }

  function allTriggers() {
    return toArray(document.querySelectorAll(TRIGGER_SELECTOR)).filter(function (el) {
      // Never treat modal internals as triggers, skip infinite-slider clones.
      return !isSliderClone(el) && !(el.closest && el.closest('[d2-lightbox-modal]'));
    });
  }

  function membersFor(trigger) {
    var all = allTriggers();
    var name = groupName(trigger);
    if (name) {
      return all.filter(function (el) { return groupName(el) === name; });
    }
    var container = trigger.closest && (trigger.closest('[d2-lightbox-group]') || trigger.closest('[d2-cms-item]'));
    if (container) {
      return all.filter(function (el) { return !groupName(el) && container.contains(el); });
    }
    // Page-wide gallery: bare triggers that no container claims.
    return all.filter(function (el) {
      if (groupName(el)) return false;
      return !(el.closest && (el.closest('[d2-lightbox-group]') || el.closest('[d2-cms-item]')));
    });
  }

  // Build the deduped item list; returns the clicked trigger's position in it.
  function buildItems(triggers, clickedSrc) {
    var seen = {};
    var items = [];
    var index = 0;
    triggers.forEach(function (t) {
      var src = resolveSrc(t);
      if (!src || seen[src]) return;
      seen[src] = true;
      if (src === clickedSrc) index = items.length;
      items.push({ src: src, caption: resolveCaption(t), thumb: resolveThumb(t) || src });
    });
    return { items: items, index: index };
  }

  // ---------------------------------------------------------------------------
  // Modal resolution + slots
  // ---------------------------------------------------------------------------

  function resolveModal() {
    var custom = null;
    toArray(document.querySelectorAll('[d2-lightbox-modal]')).forEach(function (m) {
      if (custom || m.hasAttribute('d2-lightbox-default')) return;
      custom = m;
    });
    if (custom) {
      if (custom.querySelector('[d2-lightbox-image]')) return custom;
      console.warn('[digi2.lightbox] Custom modal found but it has no [d2-lightbox-image] slot — using the built-in modal.');
    }
    return ensureBuiltin();
  }

  function resolveSlots(modal) {
    return {
      image: modal.querySelector('[d2-lightbox-image]'),
      close: toArray(modal.querySelectorAll('[d2-lightbox-close]')),
      prev: toArray(modal.querySelectorAll('[d2-lightbox-prev]')),
      next: toArray(modal.querySelectorAll('[d2-lightbox-next]')),
      counter: toArray(modal.querySelectorAll('[d2-lightbox-counter]')),
      current: toArray(modal.querySelectorAll('[d2-lightbox-current]')),
      total: toArray(modal.querySelectorAll('[d2-lightbox-total]')),
      caption: toArray(modal.querySelectorAll('[d2-lightbox-caption]')),
      thumbs: toArray(modal.querySelectorAll('[d2-lightbox-thumbs]')),
    };
  }

  // ---------------------------------------------------------------------------
  // Built-in fallback modal — created once, no innerHTML, inline styles only
  // (a tiny injected stylesheet adds hover/mobile polish on top).
  // ---------------------------------------------------------------------------

  // Icons are inline SVG data-URIs painted as centered backgrounds — text
  // glyphs (×, ‹, ›) sit off-center depending on the page's font metrics.
  function svgUrl(svg) {
    return 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '")';
  }
  var SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
  var X_SVG = SVG_OPEN + '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';
  var PREV_SVG = SVG_OPEN + '<polyline points="14 5 7 12 14 19"/></svg>';
  var NEXT_SVG = SVG_OPEN + '<polyline points="10 5 17 12 10 19"/></svg>';
  var ZOOM_SVG = SVG_OPEN.replace('stroke-width="2"', 'stroke-width="1.6"') +
    '<circle cx="11" cy="11" r="7"/><line x1="20.5" y1="20.5" x2="16" y2="16"/>' +
    '<line x1="11" y1="8.2" x2="11" y2="13.8"/><line x1="8.2" y1="11" x2="13.8" y2="11"/></svg>';

  var BUILTIN_CSS = '' +
    '.d2-lb-btn{transition:background-color .15s ease,opacity .15s ease;}' +
    '.d2-lb-btn:hover{background-color:rgba(255,255,255,0.22)!important;}' +
    '.d2-lb-thumbs{display:flex;}' +
    '.d2-lb-thumbs [d2-lightbox-thumb]{width:52px;height:52px;object-fit:cover;border-radius:4px;' +
    'opacity:.55;border:2px solid transparent;transition:opacity .15s ease,border-color .15s ease;}' +
    '.d2-lb-thumbs [d2-lightbox-thumb]:hover{opacity:.85;}' +
    '.d2-lb-thumbs [d2-lightbox-thumb][d2-is-active]{opacity:1;border-color:#fff;}' +
    '.d2-lb-viewport{touch-action:pan-y;}' +
    '@media (max-width:600px){' +
    '.d2-lb-prev{left:4px!important;}.d2-lb-next{right:4px!important;}' +
    '.d2-lb-close{top:8px!important;right:8px!important;}' +
    '.d2-lb-viewport{width:100vw!important;height:74vh!important;}' +
    '.d2-lb-img{border-radius:0!important;}' +
    '.d2-lb-thumbs [d2-lightbox-thumb]{width:40px;height:40px;}' +
    '}';

  // Page-wide styles, injected on load (independent of which modal is used):
  // triggers advertise themselves with a zoom-in cursor, control slots get a
  // pointer. Override freely in your own CSS — this carries no !important.
  var GLOBAL_CSS = '' +
    '[d2-lightbox],[d2-lightbox-item],[d2-lightbox-src],[d2-lightbox-image],' +
    '.w-lightbox:not([d2-lightbox-skip]){cursor:zoom-in;}' +
    '[d2-lightbox-modal] [d2-lightbox],[d2-lightbox-modal] [d2-lightbox-item],' +
    '[d2-lightbox-modal] [d2-lightbox-src],[d2-lightbox-modal] [d2-lightbox-image]{cursor:inherit;}' +
    '[d2-lightbox-close],[d2-lightbox-prev],[d2-lightbox-next],[d2-lightbox-thumb]{cursor:pointer;}';

  function injectGlobalStyles() {
    if (document.querySelector('[d2-lightbox-global-styles]')) return;
    var parent = document.head || document.body;
    if (!parent) return;
    var styleEl = document.createElement('style');
    styleEl.setAttribute('d2-lightbox-global-styles', '');
    styleEl.textContent = GLOBAL_CSS;
    parent.appendChild(styleEl);
  }

  // Page-wide default variant — the VALUE of the d2-lightbox flag where the
  // module is imported: <script d2-lightbox="thumbs" src="…"> or a
  // <digi2-module d2-lightbox="thumbs"> declaration. Never read from triggers
  // (there the value is a gallery name).
  var pageVariant = null;
  function readPageVariant() {
    var el = document.querySelector(
      'script[d2-lightbox], digi2-module[d2-lightbox], digi2-modules[d2-lightbox], [d2-module][d2-lightbox]'
    );
    var v = el ? String(el.getAttribute('d2-lightbox') || '').toLowerCase() : '';
    pageVariant = (v === 'thumbs' || v === 'counter') ? v : null;
  }

  function styleBtn(btn, iconUrl, extra) {
    Object.assign(btn.style, {
      position: 'absolute',
      width: '44px',
      height: '44px',
      background: 'rgba(255,255,255,0.1)',
      backgroundImage: iconUrl,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundSize: '20px 20px',
      border: '0',
      borderRadius: '999px',
      cursor: 'pointer',
      padding: '0',
      zIndex: '2',
    }, extra || {});
  }

  function ensureBuiltin() {
    if (builtinModal) return builtinModal;
    if (!document.body) return null;

    var doc = document;
    var root = doc.createElement('div');
    root.setAttribute('d2-lightbox-modal', 'flex');
    root.setAttribute('d2-lightbox-default', '');
    root.classList.add('d2-lb');
    Object.assign(root.style, {
      position: 'fixed',
      top: '0', left: '0', right: '0', bottom: '0',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(10,10,12,0.94)',
      zIndex: '99990',
      // No magnifier inside the open gallery — zoom-in belongs to the page
      // triggers only; controls get their pointer from the global stylesheet.
      cursor: 'default',
      userSelect: 'none',
      webkitUserSelect: 'none',
    });

    // Sliding carousel: a clipped viewport holds a 3-slide track (prev, current,
    // next). Dragging moves the whole track so the neighbouring photos are
    // really there on either side — they travel in instead of the single image
    // snapping back and swapping its src. The track re-centres invisibly after
    // each step so it can always slide one more in either direction.
    var viewport = doc.createElement('div');
    viewport.classList.add('d2-lb-viewport');
    Object.assign(viewport.style, {
      position: 'relative',
      width: '92vw',
      height: '84vh',
      overflow: 'hidden',
    });

    var track = doc.createElement('div');
    track.classList.add('d2-lb-track');
    Object.assign(track.style, {
      display: 'flex',
      width: '300%',
      height: '100%',
      transform: 'translateX(-33.3333%)',
      willChange: 'transform',
    });

    var slides = [];
    for (var si = 0; si < 3; si++) {
      var slide = doc.createElement('div');
      slide.classList.add('d2-lb-slide');
      Object.assign(slide.style, {
        flex: '0 0 33.3333%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
      });
      var simg = doc.createElement('img');
      if (si === 1) simg.setAttribute('d2-lightbox-image', ''); // slot for resolveSlots compat
      simg.setAttribute('alt', '');
      simg.classList.add('d2-lb-img');
      Object.assign(simg.style, {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
        borderRadius: '4px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
        cursor: 'default',
        userSelect: 'none',
        webkitUserDrag: 'none',
      });
      slide.appendChild(simg);
      track.appendChild(slide);
      slides.push(simg);
    }
    viewport.appendChild(track);
    root.appendChild(viewport);
    root._d2lbTrack = { viewport: viewport, track: track, slides: slides };

    var close = doc.createElement('button');
    close.setAttribute('type', 'button');
    close.setAttribute('d2-lightbox-close', '');
    close.setAttribute('aria-label', 'Zamknij');
    close.classList.add('d2-lb-btn');
    close.classList.add('d2-lb-close');
    styleBtn(close, svgUrl(X_SVG), { top: '16px', right: '16px' });
    root.appendChild(close);

    var prev = doc.createElement('button');
    prev.setAttribute('type', 'button');
    prev.setAttribute('d2-lightbox-prev', '');
    prev.setAttribute('aria-label', 'Poprzednie');
    prev.classList.add('d2-lb-btn');
    prev.classList.add('d2-lb-prev');
    styleBtn(prev, svgUrl(PREV_SVG), { left: '12px', top: '50%', transform: 'translateY(-50%)' });
    root.appendChild(prev);

    var next = doc.createElement('button');
    next.setAttribute('type', 'button');
    next.setAttribute('d2-lightbox-next', '');
    next.setAttribute('aria-label', 'Następne');
    next.classList.add('d2-lb-btn');
    next.classList.add('d2-lb-next');
    styleBtn(next, svgUrl(NEXT_SVG), { right: '12px', top: '50%', transform: 'translateY(-50%)' });
    root.appendChild(next);

    var bar = doc.createElement('div');
    bar.classList.add('d2-lb-bar');
    Object.assign(bar.style, {
      position: 'absolute',
      left: '0', right: '0', bottom: '14px',
      textAlign: 'center',
      color: '#fff',
      pointerEvents: 'none',
    });

    var caption = doc.createElement('div');
    caption.setAttribute('d2-lightbox-caption', '');
    caption.classList.add('d2-lb-caption');
    Object.assign(caption.style, { fontSize: '14px', opacity: '0.85', marginBottom: '4px' });
    bar.appendChild(caption);

    var thumbs = doc.createElement('div');
    thumbs.setAttribute('d2-lightbox-thumbs', '');
    thumbs.classList.add('d2-lb-thumbs');
    // display comes from the .d2-lb-thumbs class (flex); inline none hides it.
    Object.assign(thumbs.style, {
      display: 'none',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: '8px',
      margin: '6px auto 0',
      maxWidth: '92vw',
      pointerEvents: 'auto',
    });
    bar.appendChild(thumbs);

    var counter = doc.createElement('div');
    counter.setAttribute('d2-lightbox-counter', '');
    counter.classList.add('d2-lb-counter');
    Object.assign(counter.style, { fontSize: '12px', opacity: '0.6', letterSpacing: '0.04em', marginTop: '6px' });
    bar.appendChild(counter);

    root.appendChild(bar);

    // Hover/mobile polish — optional, the modal works without it.
    var styleParent = document.head || document.body;
    if (styleParent && !document.querySelector('[d2-lightbox-styles]')) {
      var styleEl = doc.createElement('style');
      styleEl.setAttribute('d2-lightbox-styles', '');
      styleEl.textContent = BUILTIN_CSS;
      styleParent.appendChild(styleEl);
    }

    document.body.appendChild(root);
    builtinModal = root;
    _log('built-in modal injected');
    return root;
  }

  // ---------------------------------------------------------------------------
  // Rendering the current image into the active modal's slots
  // ---------------------------------------------------------------------------

  function wrap(i, total) {
    if (total <= 0) return 0;
    return ((i % total) + total) % total;
  }

  // Built-in modal: paint the three track slides (prev, current, next) around
  // `index` and snap the track back to centre with no transition — so the next
  // drag/step can travel one image either way from a fresh centre.
  function paintTrack(index) {
    var t = state.track;
    if (!t) return;
    var total = state.items.length;
    var order = [wrap(index - 1, total), index, wrap(index + 1, total)];
    t.track.style.transition = 'none';
    t.track.style.transform = 'translateX(-33.3333%)';
    for (var i = 0; i < 3; i++) {
      var img = t.slides[i];
      var it = state.items[order[i]];
      if (!img || !it) continue;
      if (img.removeAttribute) { img.removeAttribute('srcset'); img.removeAttribute('sizes'); }
      img.style.background = state.imageBg || '';
      if (img.getAttribute('src') !== it.src) img.setAttribute('src', it.src);
      img.setAttribute('alt', i === 1 ? (it.caption || '') : '');
    }
    if (t.track.offsetHeight) { /* reflow so a later transition starts clean */ }
  }

  var SLIDE_MS = 300;
  var sliding = false;
  var slideTimer = null;

  // Built-in modal: animate the track one image left/right, then commit the new
  // index and re-centre. dir = +1 (next) / -1 (prev).
  function slideBuiltin(dir) {
    var t = state.track;
    var total = state.items.length;
    if (!t || total <= 1 || sliding) return false;
    if (!state.loop) {
      if (dir > 0 && state.index >= total - 1) return false;
      if (dir < 0 && state.index <= 0) return false;
    }
    sliding = true;
    var to = dir > 0 ? '-66.6666%' : '0%';
    t.track.style.transition = 'transform ' + SLIDE_MS + 'ms cubic-bezier(.22,.61,.36,1)';
    t.track.style.transform = 'translateX(' + to + ')';
    var target = wrap(state.index + dir, total);
    clearTimeout(slideTimer);
    slideTimer = setTimeout(function () {
      sliding = false;
      state.index = target;
      paintTrack(target);
      renderMeta(target);
    }, SLIDE_MS + 20);
    return true;
  }

  function show(index) {
    var total = state.items.length;
    if (!total) return;
    if (state.loop) {
      index = wrap(index, total);
    } else {
      index = Math.max(0, Math.min(total - 1, index));
    }
    state.index = index;

    var item = state.items[index];
    var slots = state.slots;

    if (state.track) {
      // Built-in sliding modal — the track owns the image rendering.
      paintTrack(index);
    } else if (slots.image) {
      var img = slots.image;
      // A Designer-placed slot img may carry srcset/sizes that would override
      // the src we set — strip them once we take control of the element.
      if (img.removeAttribute) {
        img.removeAttribute('srcset');
        img.removeAttribute('sizes');
      }
      img.style.background = state.imageBg || '';
      img.style.opacity = '0';
      void img.offsetHeight; // force reflow so the opacity transition restarts
      img.setAttribute('src', item.src);
      img.setAttribute('alt', item.caption || '');
      img.style.opacity = '1';
    }

    renderMeta(index);
  }

  // Counter / caption / thumbs / nav visibility / neighbour preload — shared by
  // show() (instant) and slideBuiltin() (after a slide commits).
  function renderMeta(index) {
    var total = state.items.length;
    var item = state.items[index];
    var slots = state.slots;

    // Single-photo galleries drop every navigation affordance: arrows,
    // counter ("1 / 1" is noise), thumbnails and dragging.
    var multi = total > 1;
    var isBuiltin = state.modal && state.modal.hasAttribute && state.modal.hasAttribute('d2-lightbox-default');
    // In the built-in modal the variant picks the bottom UI; a custom modal
    // shows whichever slots its author placed.
    var counterVisible = multi && !(isBuiltin && state.variant === 'thumbs');
    var thumbsVisible = multi && (!isBuiltin || state.variant === 'thumbs');

    var tpl;
    slots.counter.forEach(function (el) {
      tpl = attr(el, 'd2-lightbox-counter') || '{current} / {total}';
      el.textContent = tpl.replace('{current}', String(index + 1)).replace('{total}', String(total));
      el.style.display = counterVisible ? '' : 'none';
    });
    slots.current.forEach(function (el) {
      el.textContent = String(index + 1);
      el.style.display = multi ? '' : 'none';
    });
    slots.total.forEach(function (el) {
      el.textContent = String(total);
      el.style.display = multi ? '' : 'none';
    });

    slots.caption.forEach(function (el) {
      el.textContent = item.caption || '';
      el.style.display = item.caption ? '' : 'none';
    });

    slots.thumbs.forEach(function (el) {
      el.style.display = thumbsVisible ? '' : 'none';
      toArray(el.querySelectorAll('[d2-lightbox-thumb]')).forEach(function (th) {
        var i = parseInt(th.getAttribute('d2-lightbox-thumb'), 10);
        if (i === index) th.setAttribute('d2-is-active', '');
        else th.removeAttribute('d2-is-active');
      });
    });

    var navDisplay = multi ? '' : 'none';
    slots.prev.forEach(function (el) { el.style.display = navDisplay; });
    slots.next.forEach(function (el) { el.style.display = navDisplay; });

    // Preload neighbours for instant navigation.
    if (typeof Image !== 'undefined' && total > 1) {
      [index + 1, index - 1].forEach(function (i) {
        var neighbour = state.items[((i % total) + total) % total];
        if (neighbour) new Image().src = neighbour.src;
      });
    }

    _log('show', { index: index, src: item.src });
    _emit('lightbox:change', { index: index, total: total, src: item.src });
  }

  // Fill every [d2-lightbox-thumbs] container with one clickable thumb <img>
  // per gallery item. Rebuilt on each open — the gallery changes between opens.
  function populateThumbs() {
    state.slots.thumbs.forEach(function (c) {
      while (c.firstChild) c.removeChild(c.firstChild);
      state.items.forEach(function (item, i) {
        var th = document.createElement('img');
        th.setAttribute('d2-lightbox-thumb', String(i));
        th.setAttribute('src', item.thumb || item.src);
        th.setAttribute('alt', item.caption || '');
        c.appendChild(th);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Open / close / navigation
  // ---------------------------------------------------------------------------

  function open(target, startIndex) {
    var items = [];
    var index = typeof startIndex === 'number' ? startIndex : 0;
    var variantSource = null;

    if (Array.isArray(target)) {
      items = target.filter(function (it) { return it && it.src; }).map(function (it) {
        return { src: it.src, caption: it.caption || '', thumb: it.thumb || it.src };
      });
    } else if (typeof target === 'string') {
      var named = allTriggers().filter(function (el) { return groupName(el) === target; });
      variantSource = named[0] || null;
      items = buildItems(named, null).items;
    } else if (target) {
      variantSource = target;
      var built = buildItems(membersFor(target), resolveSrc(target));
      items = built.items;
      if (typeof startIndex !== 'number') index = built.index;
    }

    if (!items.length) {
      console.warn('[digi2.lightbox] Nothing to show — no resolvable images for', target);
      return;
    }

    var modal = resolveModal();
    if (!modal) return;

    state.items = items;
    state.modal = modal;
    state.slots = resolveSlots(modal);
    state.track = modal._d2lbTrack || null; // built-in modal → sliding track
    state.loop = attr(modal, 'd2-lightbox-loop') !== 'false';
    state.display = modal.getAttribute('d2-lightbox-modal') || 'flex';

    // Background painted behind every photo so transparent PNGs (e.g. floor
    // plans) don't vanish on the dark modal. Read d2-lightbox-bg from the
    // trigger/ancestor or the modal; default white. "transparent"/"none" opts out.
    var bg = '#ffffff';
    var bgEl = (variantSource && variantSource.closest && variantSource.closest('[d2-lightbox-bg]')) ||
      (modal.hasAttribute('d2-lightbox-bg') ? modal : null);
    if (bgEl) {
      var bgVal = String(attr(bgEl, 'd2-lightbox-bg') || '').trim();
      if (bgVal) bg = (bgVal === 'none') ? 'transparent' : bgVal;
    }
    state.imageBg = bg;

    // Built-in bottom UI: the import flag's value sets the page default
    // ("counter" when absent); d2-lightbox-variant on the trigger or any
    // ancestor (CMS item, section, body) overrides it per gallery.
    state.variant = pageVariant || 'counter';
    if (variantSource && variantSource.closest) {
      var vEl = variantSource.closest('[d2-lightbox-variant]');
      if (vEl) {
        var v = String(attr(vEl, 'd2-lightbox-variant') || '').toLowerCase();
        if (v === 'thumbs' || v === 'counter') state.variant = v;
      }
    }

    if (!state.open) {
      state.savedOverflow = document.body ? document.body.style.overflow : '';
      if (document.body) document.body.style.overflow = 'hidden';
      state.lastFocus = document.activeElement || null;
    }
    state.open = true;

    if (!modal.hasAttribute('role')) modal.setAttribute('role', 'dialog');
    if (!modal.hasAttribute('aria-modal')) modal.setAttribute('aria-modal', 'true');

    sliding = false;
    clearTimeout(slideTimer);
    hideHoverIcon();
    populateThumbs();
    modal.style.display = state.display;
    wireDrag(modal);
    show(index);

    if (!modal.hasAttribute('tabindex')) modal.setAttribute('tabindex', '-1');
    if (typeof modal.focus === 'function') modal.focus();

    _log('open', { items: items.length, index: state.index, builtin: modal.hasAttribute('d2-lightbox-default') });
    _emit('lightbox:open', { index: state.index, total: items.length });
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    sliding = false;
    clearTimeout(slideTimer);
    drag.active = false;
    drag.track = null;
    drag.img = null;
    if (state.modal) state.modal.style.display = 'none';
    if (document.body) document.body.style.overflow = state.savedOverflow || '';
    if (state.lastFocus && typeof state.lastFocus.focus === 'function') state.lastFocus.focus();
    state.lastFocus = null;
    _log('close');
    _emit('lightbox:close', {});
  }

  function next() {
    if (!state.open || state.items.length <= 1) return;
    if (!state.loop && state.index >= state.items.length - 1) return;
    if (state.track) slideBuiltin(1);
    else show(state.index + 1);
  }

  function prev() {
    if (!state.open || state.items.length <= 1) return;
    if (!state.loop && state.index <= 0) return;
    if (state.track) slideBuiltin(-1);
    else show(state.index - 1);
  }

  // ---------------------------------------------------------------------------
  // Drag / swipe — mouse and touch share one state machine. The image follows
  // the drag; past the threshold the release navigates, otherwise it snaps back.
  // ---------------------------------------------------------------------------
  var DRAG_NAV_PX = 50;   // horizontal distance that triggers prev/next
  var DRAG_MOVED_PX = 8;  // movement past this suppresses the trailing click

  var SNAP_EASE = 'transform ' + 220 + 'ms cubic-bezier(.22,.61,.36,1)';

  var drag = {
    active: false,
    fromTouch: false,
    moved: false,
    suppressClick: false,
    x0: 0, y0: 0, dx: 0, dy: 0,
    img: null,          // custom modal: the single image being dragged
    track: null,        // built-in modal: the sliding track being dragged
    prevTransform: '',
    prevTransition: '',
  };
  var lastTouchAt = 0;

  function dragStart(x, y, fromTouch) {
    // Single-photo galleries have nowhere to drag to — leave the mouse alone.
    if (!state.open || state.items.length <= 1 || sliding) return;
    drag.active = true;
    drag.fromTouch = fromTouch;
    drag.moved = false;
    drag.suppressClick = false;
    drag.x0 = x; drag.y0 = y;
    drag.dx = 0; drag.dy = 0;
    drag.track = state.track ? state.track.track : null;
    drag.img = state.track ? null : (state.slots && state.slots.image);
    if (drag.track) {
      drag.track.style.transition = 'none';
    } else if (drag.img) {
      drag.prevTransform = drag.img.style.transform || '';
      drag.prevTransition = drag.img.style.transition || '';
      drag.img.style.transition = 'none';
    }
  }

  function dragMove(x, y) {
    if (!drag.active) return;
    drag.dx = x - drag.x0;
    drag.dy = y - drag.y0;
    if (Math.abs(drag.dx) > DRAG_MOVED_PX || Math.abs(drag.dy) > DRAG_MOVED_PX) drag.moved = true;
    if (Math.abs(drag.dx) <= Math.abs(drag.dy)) return; // vertical intent → ignore
    if (drag.track) {
      // Move the whole track so the neighbouring photos slide in from the sides.
      drag.track.style.transform = 'translateX(calc(-33.3333% + ' + drag.dx + 'px))';
    } else if (drag.img) {
      drag.img.style.transform = 'translateX(' + drag.dx + 'px)';
    }
  }

  function dragEnd(x, y) {
    if (!drag.active) return;
    drag.active = false;
    if (typeof x === 'number') { drag.dx = x - drag.x0; drag.dy = y - drag.y0; }
    if (Math.abs(drag.dx) > DRAG_MOVED_PX) drag.moved = true;
    if (drag.moved) drag.suppressClick = true; // the mouseup/touchend spawns a click — eat it

    var navigates = Math.abs(drag.dx) >= DRAG_NAV_PX && Math.abs(drag.dx) > Math.abs(drag.dy);

    // Built-in modal: continue the drag into a real slide, or ease back to centre.
    if (drag.track) {
      var tr = drag.track;
      drag.track = null;
      var slid = navigates ? slideBuiltin(drag.dx < 0 ? 1 : -1) : false;
      if (!slid) {
        tr.style.transition = SNAP_EASE;
        tr.style.transform = 'translateX(-33.3333%)';
      }
      return;
    }

    // Custom modal: the single image snaps back, or navigation swaps its src.
    var img = drag.img;
    drag.img = null;
    if (img) {
      if (navigates) {
        img.style.transition = drag.prevTransition;
        img.style.transform = drag.prevTransform;
      } else {
        img.style.transition = 'transform .18s ease';
        img.style.transform = drag.prevTransform;
        (function (el, transition) {
          setTimeout(function () { el.style.transition = transition; }, 200);
        })(img, drag.prevTransition);
      }
    }
    if (navigates) {
      if (drag.dx < 0) next(); else prev();
    }
  }

  function wireDrag(modal) {
    if (modal._d2lbDragWired) return;
    modal._d2lbDragWired = true;

    modal.addEventListener('touchstart', function (e) {
      lastTouchAt = Date.now();
      var t = e.changedTouches && e.changedTouches[0];
      if (t) dragStart(t.screenX, t.screenY, true);
    }, { passive: true });
    modal.addEventListener('touchmove', function (e) {
      lastTouchAt = Date.now();
      var t = e.changedTouches && e.changedTouches[0];
      if (t) dragMove(t.screenX, t.screenY);
    }, { passive: true });
    modal.addEventListener('touchend', function (e) {
      lastTouchAt = Date.now();
      var t = e.changedTouches && e.changedTouches[0];
      dragEnd(t ? t.screenX : undefined, t ? t.screenY : undefined);
    }, { passive: true });

    modal.addEventListener('mousedown', function (e) {
      // Skip the compatibility mouse events some browsers emit after touch.
      if (Date.now() - lastTouchAt < 700) return;
      if (typeof e.button === 'number' && e.button !== 0) return;
      if (e.preventDefault) e.preventDefault(); // no text selection while dragging
      dragStart(e.screenX, e.screenY, false);
    });
    // Native image ghost-drag would swallow mousemove — kill it inside the modal.
    modal.addEventListener('dragstart', function (e) {
      if (e.preventDefault) e.preventDefault();
    });
  }

  // Mouse drags may leave the modal — track move/up at the document level.
  document.addEventListener('mousemove', function (e) {
    if (drag.active && !drag.fromTouch) dragMove(e.screenX, e.screenY);
  });
  document.addEventListener('mouseup', function (e) {
    if (drag.active && !drag.fromTouch) dragEnd(e.screenX, e.screenY);
  });

  // ---------------------------------------------------------------------------
  // Native Webflow lightbox takeover — .w-lightbox links open in this lightbox
  // so every gallery on the page looks the same. The listener runs in the
  // CAPTURE phase and stops propagation, so it beats webflow.js regardless of
  // whether that bound on the elements or via delegation.
  // ---------------------------------------------------------------------------

  function parseNativeConfig(link) {
    var script = link.querySelector ? link.querySelector('.w-json') : null;
    if (!script) return null;
    try {
      var cfg = JSON.parse(script.textContent || '');
      return (cfg && cfg.items && cfg.items.length) ? cfg : null;
    } catch (err) {
      return null;
    }
  }

  function nativeGallery(link) {
    var cfg = parseNativeConfig(link);
    if (!cfg) return null;
    var first = cfg.items[0];
    // Video lightboxes stay native — this module renders images only.
    if (!first || !first.url || first.type === 'video') return null;

    var links = [link];
    if (cfg.group) {
      links = toArray(document.querySelectorAll('.w-lightbox')).filter(function (l) {
        if (l === link) return true;
        if (l.hasAttribute && l.hasAttribute('d2-lightbox-skip')) return false;
        var c = parseNativeConfig(l);
        return !!c && c.group === cfg.group;
      });
    }

    var seen = {};
    var items = [];
    links.forEach(function (l) {
      var c = l === link ? cfg : parseNativeConfig(l);
      if (!c) return;
      c.items.forEach(function (it) {
        if (!it || !it.url || it.type === 'video' || seen[it.url]) return;
        seen[it.url] = true;
        items.push({ src: it.url, caption: it.caption || '', thumb: it.thumbnailUrl || it.url });
      });
    });
    if (!items.length) return null;

    var index = 0;
    for (var i = 0; i < items.length; i++) {
      if (items[i].src === first.url) { index = i; break; }
    }
    return { items: items, index: index };
  }

  document.addEventListener('click', function (e) {
    if (drag.suppressClick) return; // the bubble handler clears it
    var t = e.target;
    if (!t || !t.closest) return;
    var link = t.closest('.w-lightbox');
    if (!link) return;
    if (link.closest('[d2-lightbox-modal]')) return;
    if (link.hasAttribute && link.hasAttribute('d2-lightbox-skip')) return;

    var gallery = nativeGallery(link);
    if (!gallery) return; // no parsable image items → let Webflow handle it

    e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    open(gallery.items, gallery.index);
    _log('native w-lightbox intercepted', { items: gallery.items.length, index: gallery.index });
  }, true);

  // ---------------------------------------------------------------------------
  // Hover magnifier badge — one floating element centered over the hovered
  // trigger. Positioned from the trigger's rect, so it works for <img>
  // triggers (which can't hold children) and CMS items rendered later, and
  // never touches the page's own markup. Opt out with
  // d2-lightbox-icon="false" on the trigger or any ancestor.
  // ---------------------------------------------------------------------------

  var hoverIcon = null;
  var iconTrigger = null;

  function ensureHoverIcon() {
    if (hoverIcon || !document.body) return hoverIcon;
    var el = document.createElement('div');
    el.setAttribute('d2-lightbox-hover-icon', '');
    el.classList.add('d2-lb-hover-icon');
    Object.assign(el.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '44px',
      height: '44px',
      borderRadius: '999px',
      background: 'rgba(10,10,12,0.55)',
      backgroundImage: svgUrl(ZOOM_SVG),
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundSize: '55%',
      opacity: '0',
      transition: 'opacity .15s ease',
      pointerEvents: 'none',
      zIndex: '99980',
    });
    document.body.appendChild(el);
    hoverIcon = el;
    return el;
  }

  function showHoverIcon(trigger) {
    if (state.open || !trigger.getBoundingClientRect) return;
    var rect = trigger.getBoundingClientRect();
    if (!rect || rect.width < 28 || rect.height < 28) { hideHoverIcon(); return; }
    var el = ensureHoverIcon();
    if (!el) return;
    var size = Math.min(44, rect.width - 8, rect.height - 8);
    Object.assign(el.style, {
      width: size + 'px',
      height: size + 'px',
      left: (rect.left + rect.width / 2 - size / 2) + 'px',
      top: (rect.top + rect.height / 2 - size / 2) + 'px',
      opacity: '1',
    });
    iconTrigger = trigger;
  }

  function hideHoverIcon() {
    if (hoverIcon) hoverIcon.style.opacity = '0';
    iconTrigger = null;
  }

  document.addEventListener('mouseover', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var trigger = t.closest(TRIGGER_SELECTOR) || t.closest('.w-lightbox');
    if (!trigger || trigger === iconTrigger) return;
    if (trigger.closest('[d2-lightbox-modal]')) return;
    if (trigger.hasAttribute && trigger.hasAttribute('d2-lightbox-skip')) return;
    if (trigger.closest('[d2-lightbox-icon="false"]')) return;
    showHoverIcon(trigger);
  });

  document.addEventListener('mouseout', function (e) {
    if (!iconTrigger) return;
    var to = e.relatedTarget;
    if (to && iconTrigger.contains && iconTrigger.contains(to)) return; // still inside
    hideHoverIcon();
  });

  // The fixed-position badge would drift out of place on scroll/resize.
  if (window.addEventListener) {
    window.addEventListener('scroll', hideHoverIcon, { passive: true });
    window.addEventListener('resize', hideHoverIcon);
  }

  // ---------------------------------------------------------------------------
  // Wiring — delegated clicks, keyboard
  // ---------------------------------------------------------------------------

  document.addEventListener('click', function (e) {
    // A click generated by the end of a drag must not close/open anything.
    if (drag.suppressClick) {
      drag.suppressClick = false;
      if (e.preventDefault) e.preventDefault();
      return;
    }

    var t = e.target;
    if (!t || !t.closest) return;

    if (state.open && state.modal) {
      var closeEl = t.closest('[d2-lightbox-close]');
      if (closeEl && state.modal.contains(closeEl)) { e.preventDefault(); close(); return; }
      var prevEl = t.closest('[d2-lightbox-prev]');
      if (prevEl && state.modal.contains(prevEl)) { e.preventDefault(); prev(); return; }
      var nextEl = t.closest('[d2-lightbox-next]');
      if (nextEl && state.modal.contains(nextEl)) { e.preventDefault(); next(); return; }
      var thumbEl = t.closest('[d2-lightbox-thumb]');
      if (thumbEl && state.modal.contains(thumbEl)) {
        e.preventDefault();
        var ti = parseInt(thumbEl.getAttribute('d2-lightbox-thumb'), 10);
        if (!isNaN(ti)) show(ti);
        return;
      }
      var backdrop = t.closest('[d2-lightbox-backdrop]');
      if ((backdrop && state.modal.contains(backdrop)) || t === state.modal) { e.preventDefault(); close(); return; }
      if (state.modal.contains(t)) return; // clicks on other modal content do nothing
    }

    var trigger = t.closest(TRIGGER_SELECTOR);
    if (!trigger) return;
    if (trigger.closest('[d2-lightbox-modal]')) return;
    e.preventDefault();
    open(trigger);
  });

  document.addEventListener('keydown', function (e) {
    if (!state.open) return;
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowRight') {
      if (e.preventDefault) e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft') {
      if (e.preventDefault) e.preventDefault();
      prev();
    }
  });

  // Designer-built modals stay visible in the canvas; hide them on load so
  // nobody has to remember to set display:none manually.
  function hideModals() {
    toArray(document.querySelectorAll('[d2-lightbox-modal]')).forEach(function (m) {
      if (!state.open || m !== state.modal) m.style.display = 'none';
    });
  }

  function refresh() {
    hideModals();
    injectGlobalStyles();
    readPageVariant();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh);
  } else {
    refresh();
  }

  // ---------------------------------------------------------------------------
  // Register module on digi2 namespace
  // ---------------------------------------------------------------------------
  window.digi2.lightbox = {
    open: open,
    close: close,
    next: next,
    prev: prev,
    isOpen: function () { return state.open; },
    refresh: refresh,
    _state: state, // exposed for tests/debugging — not a public contract
  };
})();
