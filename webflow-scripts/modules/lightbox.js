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
 *   d2-lightbox-src="URL"        — full-size image URL override (bindable to a CMS field).
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
 *     d2-lightbox-backdrop       — clicking this closes (clicking the modal root itself also closes)
 *   d2-lightbox-loop="false"     — on the modal root: stop at the ends instead of wrapping.
 *
 * Behavior: Esc closes, arrow keys navigate, swipe left/right on touch, body
 * scroll is locked while open, adjacent images are preloaded.
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
    items: [],          // [{ src, caption }]
    index: 0,
    loop: true,
    display: 'flex',
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
    var explicit = attr(trigger, 'd2-lightbox-src');
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

  // ---------------------------------------------------------------------------
  // Gallery grouping
  // ---------------------------------------------------------------------------

  // Group identity uses the RAW attribute value — the responsive "a;b@911"
  // syntax makes no sense for gallery names.
  function groupName(trigger) {
    return trigger.getAttribute('d2-lightbox') || '';
  }

  function isSliderClone(el) {
    return !!(el.closest && el.closest('[d2-slide-clone]'));
  }

  function allTriggers() {
    return toArray(document.querySelectorAll('[d2-lightbox]')).filter(function (el) {
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
      items.push({ src: src, caption: resolveCaption(t) });
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
    };
  }

  // ---------------------------------------------------------------------------
  // Built-in fallback modal — created once, no innerHTML, inline styles only
  // (a tiny injected stylesheet adds hover/mobile polish on top).
  // ---------------------------------------------------------------------------

  var BUILTIN_CSS = '' +
    '.d2-lb-btn{transition:background .15s ease,opacity .15s ease;}' +
    '.d2-lb-btn:hover{background:rgba(255,255,255,0.22)!important;}' +
    '@media (max-width:600px){' +
    '.d2-lb-prev{left:4px!important;}.d2-lb-next{right:4px!important;}' +
    '.d2-lb-close{top:8px!important;right:8px!important;}' +
    '.d2-lb-img{max-width:100vw!important;max-height:78vh!important;border-radius:0!important;}' +
    '}';

  function styleBtn(btn, extra) {
    Object.assign(btn.style, {
      position: 'absolute',
      width: '44px',
      height: '44px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      background: 'rgba(255,255,255,0.1)',
      border: '0',
      borderRadius: '999px',
      fontSize: '28px',
      lineHeight: '1',
      fontFamily: 'inherit',
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
      cursor: 'zoom-out',
    });

    var img = doc.createElement('img');
    img.setAttribute('d2-lightbox-image', '');
    img.setAttribute('alt', '');
    img.classList.add('d2-lb-img');
    Object.assign(img.style, {
      maxWidth: '92vw',
      maxHeight: '84vh',
      objectFit: 'contain',
      borderRadius: '4px',
      boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
      cursor: 'default',
      transition: 'opacity .18s ease',
    });
    root.appendChild(img);

    var close = doc.createElement('button');
    close.setAttribute('type', 'button');
    close.setAttribute('d2-lightbox-close', '');
    close.setAttribute('aria-label', 'Zamknij');
    close.classList.add('d2-lb-btn');
    close.classList.add('d2-lb-close');
    close.textContent = '×'; // ×
    styleBtn(close, { top: '16px', right: '16px' });
    root.appendChild(close);

    var prev = doc.createElement('button');
    prev.setAttribute('type', 'button');
    prev.setAttribute('d2-lightbox-prev', '');
    prev.setAttribute('aria-label', 'Poprzednie');
    prev.classList.add('d2-lb-btn');
    prev.classList.add('d2-lb-prev');
    prev.textContent = '‹'; // ‹
    styleBtn(prev, { left: '12px', top: '50%', transform: 'translateY(-50%)' });
    root.appendChild(prev);

    var next = doc.createElement('button');
    next.setAttribute('type', 'button');
    next.setAttribute('d2-lightbox-next', '');
    next.setAttribute('aria-label', 'Następne');
    next.classList.add('d2-lb-btn');
    next.classList.add('d2-lb-next');
    next.textContent = '›'; // ›
    styleBtn(next, { right: '12px', top: '50%', transform: 'translateY(-50%)' });
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

    var counter = doc.createElement('div');
    counter.setAttribute('d2-lightbox-counter', '');
    counter.classList.add('d2-lb-counter');
    Object.assign(counter.style, { fontSize: '12px', opacity: '0.6', letterSpacing: '0.04em' });
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

  function show(index) {
    var total = state.items.length;
    if (!total) return;
    if (state.loop) {
      index = ((index % total) + total) % total;
    } else {
      index = Math.max(0, Math.min(total - 1, index));
    }
    state.index = index;

    var item = state.items[index];
    var slots = state.slots;

    if (slots.image) {
      var img = slots.image;
      // A Designer-placed slot img may carry srcset/sizes that would override
      // the src we set — strip them once we take control of the element.
      if (img.removeAttribute) {
        img.removeAttribute('srcset');
        img.removeAttribute('sizes');
      }
      img.style.opacity = '0';
      void img.offsetHeight; // force reflow so the opacity transition restarts
      img.setAttribute('src', item.src);
      img.setAttribute('alt', item.caption || '');
      img.style.opacity = '1';
    }

    var tpl;
    slots.counter.forEach(function (el) {
      tpl = attr(el, 'd2-lightbox-counter') || '{current} / {total}';
      el.textContent = tpl.replace('{current}', String(index + 1)).replace('{total}', String(total));
    });
    slots.current.forEach(function (el) { el.textContent = String(index + 1); });
    slots.total.forEach(function (el) { el.textContent = String(total); });

    slots.caption.forEach(function (el) {
      el.textContent = item.caption || '';
      el.style.display = item.caption ? '' : 'none';
    });

    // With a single photo the arrows are dead weight — hide them.
    var navDisplay = total > 1 ? '' : 'none';
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

  // ---------------------------------------------------------------------------
  // Open / close / navigation
  // ---------------------------------------------------------------------------

  function open(target, startIndex) {
    var items = [];
    var index = typeof startIndex === 'number' ? startIndex : 0;

    if (Array.isArray(target)) {
      items = target.filter(function (it) { return it && it.src; }).map(function (it) {
        return { src: it.src, caption: it.caption || '' };
      });
    } else if (typeof target === 'string') {
      var named = allTriggers().filter(function (el) { return groupName(el) === target; });
      items = buildItems(named, null).items;
    } else if (target) {
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
    state.loop = attr(modal, 'd2-lightbox-loop') !== 'false';
    state.display = modal.getAttribute('d2-lightbox-modal') || 'flex';

    if (!state.open) {
      state.savedOverflow = document.body ? document.body.style.overflow : '';
      if (document.body) document.body.style.overflow = 'hidden';
      state.lastFocus = document.activeElement || null;
    }
    state.open = true;

    if (!modal.hasAttribute('role')) modal.setAttribute('role', 'dialog');
    if (!modal.hasAttribute('aria-modal')) modal.setAttribute('aria-modal', 'true');

    modal.style.display = state.display;
    wireTouch(modal);
    show(index);

    if (!modal.hasAttribute('tabindex')) modal.setAttribute('tabindex', '-1');
    if (typeof modal.focus === 'function') modal.focus();

    _log('open', { items: items.length, index: state.index, builtin: modal.hasAttribute('d2-lightbox-default') });
    _emit('lightbox:open', { index: state.index, total: items.length });
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    if (state.modal) state.modal.style.display = 'none';
    if (document.body) document.body.style.overflow = state.savedOverflow || '';
    if (state.lastFocus && typeof state.lastFocus.focus === 'function') state.lastFocus.focus();
    state.lastFocus = null;
    _log('close');
    _emit('lightbox:close', {});
  }

  function next() {
    if (!state.open) return;
    if (!state.loop && state.index >= state.items.length - 1) return;
    show(state.index + 1);
  }

  function prev() {
    if (!state.open) return;
    if (!state.loop && state.index <= 0) return;
    show(state.index - 1);
  }

  // ---------------------------------------------------------------------------
  // Wiring — delegated clicks, keyboard, touch
  // ---------------------------------------------------------------------------

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    if (state.open && state.modal) {
      var closeEl = t.closest('[d2-lightbox-close]');
      if (closeEl && state.modal.contains(closeEl)) { e.preventDefault(); close(); return; }
      var prevEl = t.closest('[d2-lightbox-prev]');
      if (prevEl && state.modal.contains(prevEl)) { e.preventDefault(); prev(); return; }
      var nextEl = t.closest('[d2-lightbox-next]');
      if (nextEl && state.modal.contains(nextEl)) { e.preventDefault(); next(); return; }
      var backdrop = t.closest('[d2-lightbox-backdrop]');
      if ((backdrop && state.modal.contains(backdrop)) || t === state.modal) { e.preventDefault(); close(); return; }
      if (state.modal.contains(t)) return; // clicks on other modal content do nothing
    }

    var trigger = t.closest('[d2-lightbox]');
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

  function wireTouch(modal) {
    if (modal._d2lbTouchWired) return;
    modal._d2lbTouchWired = true;
    var x0 = 0, y0 = 0;
    modal.addEventListener('touchstart', function (e) {
      var t = e.changedTouches && e.changedTouches[0];
      if (t) { x0 = t.screenX; y0 = t.screenY; }
    }, { passive: true });
    modal.addEventListener('touchend', function (e) {
      var t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      var dx = t.screenX - x0;
      var dy = t.screenY - y0;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) next(); else prev();
    }, { passive: true });
  }

  // Designer-built modals stay visible in the canvas; hide them on load so
  // nobody has to remember to set display:none manually.
  function hideModals() {
    toArray(document.querySelectorAll('[d2-lightbox-modal]')).forEach(function (m) {
      if (!state.open || m !== state.modal) m.style.display = 'none';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideModals);
  } else {
    hideModals();
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
    refresh: hideModals,
    _state: state, // exposed for tests/debugging — not a public contract
  };
})();
