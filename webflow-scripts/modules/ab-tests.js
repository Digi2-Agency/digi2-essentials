/**
 * digi2 - A/B Tests Module
 * Loaded automatically by digi2-loader.js when d2-ab-tests="configName" is present.
 *
 * Config:
 *   window.sitemap = {
 *     pricing: {
 *       base: '/pricing',
 *       variants: { A: '/pricing-a', B: '/pricing-b' },
 *       weights: { A: 50, B: 50 } // optional
 *     }
 *   }
 *
 * API:
 *   digi2.abTests.init('sitemap')
 *   digi2.abTests.get('pricing')
 *   digi2.abTests.assign('pricing')
 *   digi2.abTests.rewriteLinks()
 *   digi2.abTests.list()
 *   digi2.abTests.destroy()
 */
(function () {
  'use strict';

  window.digi2 = window.digi2 || {};

  var STORAGE_PREFIX = 'd2ab:';
  var PENDING_EVENTS_KEY = 'd2ab:pendingEvents';
  var LINK_SELECTOR = 'a[href], [d2-ab-link]';

  var _configName = null;
  var _tests = {};
  var _observer = null;
  var _clickBound = false;
  var _initialized = false;

  function _log(action, data) {
    if (window.digi2.log) window.digi2.log('abTests', action, data);
  }

  function _emit(event, data) {
    if (window.digi2.emit) window.digi2.emit(event, data);
  }

  function _storageGet(key) {
    try {
      return window.localStorage ? window.localStorage.getItem(key) : null;
    } catch (e) {
      return null;
    }
  }

  function _storageSet(key, value) {
    try {
      if (window.localStorage) window.localStorage.setItem(key, value);
    } catch (e) {}
  }

  function _sessionGet(key) {
    try {
      return window.sessionStorage ? window.sessionStorage.getItem(key) : null;
    } catch (e) {
      return null;
    }
  }

  function _sessionSet(key, value) {
    try {
      if (window.sessionStorage) window.sessionStorage.setItem(key, value);
    } catch (e) {}
  }

  function _sessionRemove(key) {
    try {
      if (window.sessionStorage) window.sessionStorage.removeItem(key);
    } catch (e) {}
  }

  function _storageKey(testName) {
    return STORAGE_PREFIX + testName;
  }

  function _isObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
  }

  function _getOrigin() {
    return window.location && window.location.origin ? window.location.origin : 'https://example.com';
  }

  function _toUrl(value) {
    try {
      return new URL(value, _getOrigin());
    } catch (e) {
      return null;
    }
  }

  function _isRelativeUrl(value) {
    return typeof value === 'string' && !/^[a-z][a-z0-9+.-]*:/i.test(value) && value.indexOf('//') !== 0;
  }

  function _normalizePath(value) {
    var url = _toUrl(value);
    if (!url) return null;
    var path = url.pathname || '/';
    path = path.replace(/\/+$/, '') || '/';
    return path;
  }

  function _sameSiteHref(href) {
    var url = _toUrl(href);
    if (!url) return null;
    if (url.origin !== _getOrigin()) return null;
    return url;
  }

  function _loadConfig(configOrName) {
    if (typeof configOrName === 'string') {
      _configName = configOrName;
      return window[configOrName];
    }

    if (_isObject(configOrName)) {
      return configOrName;
    }

    _configName = window.digi2._abTestsConfigName || _configName;
    return _configName ? window[_configName] : null;
  }

  function _buildTests(config) {
    var tests = {};
    if (!_isObject(config)) return tests;

    for (var name in config) {
      if (!Object.prototype.hasOwnProperty.call(config, name)) continue;

      var item = config[name];
      if (!_isObject(item) || !item.base || !_isObject(item.variants)) continue;

      var variantNames = Object.keys(item.variants);
      if (!variantNames.length) continue;

      var basePath = _normalizePath(item.base);
      if (!basePath) continue;

      var variantPaths = {};
      for (var i = 0; i < variantNames.length; i++) {
        var variant = variantNames[i];
        var variantPath = _normalizePath(item.variants[variant]);
        if (variantPath) variantPaths[variant] = variantPath;
      }

      if (!Object.keys(variantPaths).length) continue;

      tests[name] = {
        name: name,
        base: item.base,
        basePath: basePath,
        variants: item.variants,
        variantPaths: variantPaths,
        weights: _isObject(item.weights) ? item.weights : null,
      };
    }

    return tests;
  }

  function _variantExists(test, variant) {
    return !!(test && variant && Object.prototype.hasOwnProperty.call(test.variants, variant));
  }

  function _getStoredVariant(testName) {
    var test = _tests[testName];
    var stored = _storageGet(_storageKey(testName));
    return _variantExists(test, stored) ? stored : null;
  }

  function _chooseVariant(test) {
    var variants = Object.keys(test.variants);
    if (!variants.length) return null;

    var weights = test.weights || {};
    var total = 0;
    var normalized = [];

    for (var i = 0; i < variants.length; i++) {
      var name = variants[i];
      var raw = Number(weights[name]);
      var weight = test.weights ? Math.max(0, isNaN(raw) ? 0 : raw) : 1;
      normalized.push({ name: name, weight: weight });
      total += weight;
    }

    if (total <= 0) {
      return variants[Math.floor(Math.random() * variants.length)];
    }

    var point = Math.random() * total;
    var cursor = 0;
    for (var j = 0; j < normalized.length; j++) {
      cursor += normalized[j].weight;
      if (point < cursor) return normalized[j].name;
    }

    return variants[variants.length - 1];
  }

  function _pushDataLayer(data) {
    var canUseGoogleModule = window.digi2.google &&
      typeof window.digi2.google.dataLayerPush === 'function' &&
      ((window.digi2._loaded && window.digi2._loaded.google) || window.digi2._gtmId);

    if (canUseGoogleModule) {
      try {
        window.digi2.google.dataLayerPush(data);
        return;
      } catch (e) {}
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
  }

  function _queuePendingEvent(data) {
    var events = [];
    var raw = _sessionGet(PENDING_EVENTS_KEY);
    if (raw) {
      try {
        events = JSON.parse(raw) || [];
      } catch (e) {
        events = [];
      }
    }
    events.push(data);
    _sessionSet(PENDING_EVENTS_KEY, JSON.stringify(events));
  }

  function _flushPendingEvents() {
    var raw = _sessionGet(PENDING_EVENTS_KEY);
    if (!raw) return [];

    var events = [];
    try {
      events = JSON.parse(raw) || [];
    } catch (e) {
      events = [];
    }

    _sessionRemove(PENDING_EVENTS_KEY);
    for (var i = 0; i < events.length; i++) {
      _pushDataLayer(events[i]);
    }

    return events;
  }

  function _trackAssigned(testName, variant, defer) {
    var payload = {
      event: 'digi2_ab_assigned',
      ab_test: testName,
      ab_variant: variant,
    };

    if (defer) {
      _queuePendingEvent(payload);
    } else {
      _pushDataLayer(payload);
    }

    _emit('ab:assigned', payload);
  }

  function _trackViewed(testName, variant, url, defer) {
    var payload = {
      event: 'digi2_ab_viewed',
      ab_test: testName,
      ab_variant: variant,
      ab_url: url,
    };

    if (defer) {
      _queuePendingEvent(payload);
    } else {
      _pushDataLayer(payload);
    }

    _emit('ab:viewed', payload);
  }

  function _trackClick(testName, variant, targetUrl) {
    var payload = {
      event: 'digi2_ab_click',
      ab_test: testName,
      ab_variant: variant,
      ab_target_url: targetUrl,
    };

    _pushDataLayer(payload);
    _emit('ab:click', payload);
  }

  function _setAssignment(testName, variant, options) {
    var test = _tests[testName];
    if (!_variantExists(test, variant)) return null;

    _storageSet(_storageKey(testName), variant);
    _trackAssigned(testName, variant, options && options.defer);
    return variant;
  }

  function _assign(testName, options) {
    var test = _tests[testName];
    if (!test) return null;

    var stored = _getStoredVariant(testName);
    if (stored) return stored;

    var variant = _chooseVariant(test);
    if (!variant) return null;

    return _setAssignment(testName, variant, options);
  }

  function _findVariantByPath(test, path) {
    for (var variant in test.variantPaths) {
      if (Object.prototype.hasOwnProperty.call(test.variantPaths, variant) && test.variantPaths[variant] === path) {
        return variant;
      }
    }
    return null;
  }

  function _findTestForPath(path) {
    for (var testName in _tests) {
      if (!Object.prototype.hasOwnProperty.call(_tests, testName)) continue;
      var test = _tests[testName];
      if (test.basePath === path) {
        return { testName: testName, test: test, variant: null, isBase: true };
      }
      var variant = _findVariantByPath(test, path);
      if (variant) {
        return { testName: testName, test: test, variant: variant, isBase: false };
      }
    }
    return null;
  }

  function _targetHref(test, variant, originalHref) {
    var targetValue = test.variants[variant];
    var targetUrl = _toUrl(targetValue);
    if (!targetUrl) return null;

    var originalUrl = originalHref ? _toUrl(originalHref) : null;
    if (originalUrl) {
      if (!targetUrl.search && originalUrl.search) targetUrl.search = originalUrl.search;
      if (!targetUrl.hash && originalUrl.hash) targetUrl.hash = originalUrl.hash;
    }

    if (_isRelativeUrl(targetValue)) {
      return targetUrl.pathname + targetUrl.search + targetUrl.hash;
    }

    return targetUrl.href;
  }

  function _rewriteLink(link) {
    if (!link || typeof link.getAttribute !== 'function') return;
    if (link.hasAttribute('d2-ab-ignore')) return;

    var explicitTest = link.getAttribute('d2-ab-link');
    var href = link.getAttribute('href') || '';
    var match = null;

    if (explicitTest && _tests[explicitTest]) {
      match = { testName: explicitTest, test: _tests[explicitTest] };
    } else if (href) {
      var url = _sameSiteHref(href);
      if (!url) return;
      match = _findTestForPath(_normalizePath(url.href));
    }

    if (!match || !match.test) return;

    var variant = _assign(match.testName);
    if (!variant) return;

    var nextHref = _targetHref(match.test, variant, href);
    if (!nextHref || nextHref === href) return;

    link.setAttribute('href', nextHref);
  }

  function _scanNode(node) {
    if (!node) return;

    if (typeof node.getAttribute === 'function') {
      var isLink = node.tagName && node.tagName.toLowerCase() === 'a' && node.hasAttribute('href');
      if (isLink || node.hasAttribute('d2-ab-link')) {
        _rewriteLink(node);
      }
    }

    if (typeof node.querySelectorAll === 'function') {
      var links = node.querySelectorAll(LINK_SELECTOR);
      for (var i = 0; i < links.length; i++) {
        _rewriteLink(links[i]);
      }
    }
  }

  function _rewriteLinks(root) {
    _scanNode(root || document);
  }

  function _handleMutations(mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var mutation = mutations[i];

      if (mutation.type === 'attributes') {
        _scanNode(mutation.target);
        continue;
      }

      if (mutation.addedNodes && mutation.addedNodes.length) {
        for (var j = 0; j < mutation.addedNodes.length; j++) {
          _scanNode(mutation.addedNodes[j]);
        }
      }
    }
  }

  function _startObserver() {
    if (typeof MutationObserver === 'undefined' || !document.body) return;

    if (_observer) _observer.disconnect();

    _observer = new MutationObserver(_handleMutations);
    _observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href', 'd2-ab-link', 'd2-ab-ignore'],
    });
  }

  function _viewAlreadyFlushed(events, testName, variant) {
    for (var i = 0; i < events.length; i++) {
      if (
        events[i] &&
        events[i].event === 'digi2_ab_viewed' &&
        events[i].ab_test === testName &&
        events[i].ab_variant === variant
      ) {
        return true;
      }
    }
    return false;
  }

  function _handleCurrentPage(flushedEvents) {
    var currentPath = _normalizePath(window.location.href);
    if (!currentPath) return;

    var match = _findTestForPath(currentPath);
    if (!match) return;

    if (match.isBase) {
      var variant = _assign(match.testName, { defer: true });
      var target = variant ? _targetHref(match.test, variant, window.location.href) : null;
      var targetPath = target ? _normalizePath(target) : null;

      if (target && targetPath && targetPath !== currentPath) {
        _trackViewed(match.testName, variant, target, true);
        window.location.href = target;
      } else if (variant && !_viewAlreadyFlushed(flushedEvents, match.testName, variant)) {
        _trackViewed(match.testName, variant, window.location.href);
      }
      return;
    }

    var stored = _getStoredVariant(match.testName);
    var activeVariant = stored || _setAssignment(match.testName, match.variant);

    if (activeVariant && !_viewAlreadyFlushed(flushedEvents, match.testName, activeVariant)) {
      _trackViewed(match.testName, activeVariant, window.location.href);
    }
  }

  function _findClosestLink(target) {
    var node = target;
    while (node && node !== document) {
      if (
        node.tagName &&
        node.tagName.toLowerCase() === 'a' &&
        typeof node.getAttribute === 'function' &&
        node.getAttribute('href')
      ) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  function _handleClick(event) {
    var link = _findClosestLink(event.target);
    if (!link || link.hasAttribute('d2-ab-ignore')) return;

    var explicitTest = link.getAttribute('d2-ab-link');
    var href = link.getAttribute('href');
    var match = null;

    if (explicitTest && _tests[explicitTest]) {
      match = { testName: explicitTest, test: _tests[explicitTest] };
    } else if (href) {
      var url = _sameSiteHref(href);
      if (!url) return;
      match = _findTestForPath(_normalizePath(url.href));
    }

    if (!match || !match.test) return;

    var variant = _assign(match.testName);
    if (!variant) return;

    _trackClick(match.testName, variant, href);
  }

  function _bindClickTracking() {
    if (_clickBound || !document.addEventListener) return;
    document.addEventListener('click', _handleClick, true);
    _clickBound = true;
  }

  function _init(configOrName) {
    var config = _loadConfig(configOrName);
    _tests = _buildTests(config);
    _initialized = true;

    var flushedEvents = _flushPendingEvents();
    _handleCurrentPage(flushedEvents);
    _rewriteLinks(document);
    _startObserver();
    _bindClickTracking();

    _log('init', { configName: _configName, tests: Object.keys(_tests) });
  }

  window.digi2.abTests = {
    init: function (configOrName) {
      _init(configOrName);
    },

    get: function (testName) {
      return _getStoredVariant(testName);
    },

    assign: function (testName) {
      return _assign(testName);
    },

    rewriteLinks: function (root) {
      _rewriteLinks(root || document);
    },

    list: function () {
      return Object.keys(_tests);
    },

    destroy: function () {
      if (_observer) {
        _observer.disconnect();
        _observer = null;
      }
      _initialized = false;
    },
  };

  function boot() {
    if (!_initialized) _init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
