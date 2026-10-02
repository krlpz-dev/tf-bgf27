/* Board Game Fest Table Finder · app.js
   Vanilla JS. Screens: landing, account, location, games, loader, map.
   Map rendering lives in js/map.js (window.BGFMap). All UI strings live in js/i18n.js. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     Data and helpers
     ------------------------------------------------------------------ */
  var I18N = window.BGF_I18N || { fr: {}, en: {} };
  var GAMES = window.BGF_GAMES || [];
  var VENUES = window.BGF_VENUES || [];
  var GBY = {}; GAMES.forEach(function (g) { GBY[g.id] = g; });
  var VBY = {}; VENUES.forEach(function (v) { VBY[v.id] = v; });

  var DEMO_AREAS = ['75003', '75004', '75010', '75011', '75019', '75020'];
  var AREA_POS = {
    '75003': { lat: 48.8637, lng: 2.3615 },
    '75004': { lat: 48.8570, lng: 2.3605 },
    '75010': { lat: 48.8722, lng: 2.3612 },
    '75011': { lat: 48.8652, lng: 2.3768 },
    '75019': { lat: 48.8822, lng: 2.3805 },
    '75020': { lat: 48.8682, lng: 2.3915 },
    gps: { lat: 48.8691, lng: 2.3671 }
  };
  var DEFAULT_FAVS = ['loups-garous', 'catan', 'dixit', 'ticket-to-ride'];
  var TYPES = ['cafe', 'bar', 'shop', 'restaurant', 'bookshop', 'culture'];
  var TYPE_COLOR = { cafe: '#D9773A', bar: '#7A45E6', shop: '#F0457F', restaurant: '#D63A2F', bookshop: '#12935A', culture: '#0A9BE0' };
  var OCC_LEVELS = ['calm', 'lively', 'full'];

  var app = document.getElementById('app');
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var deskMQ = window.matchMedia('(min-width: 900px)');
  var fineMQ = window.matchMedia('(hover: hover) and (pointer: fine)');
  function reduced() { return reduceMQ.matches; }
  function isDesk() { return deskMQ.matches; }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function norm(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function store(k, v) {
    try {
      if (v === undefined) return window.localStorage.getItem(k);
      window.localStorage.setItem(k, v);
    } catch (e) { return null; }
    return null;
  }

  /* ------------------------------------------------------------------
     Icons (inline SVG, stroke based, 24 grid)
     ------------------------------------------------------------------ */
  var IC = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    caret: '<path d="M6 9l6 6 6-6"/>',
    walk: '<circle cx="13.5" cy="4.2" r="1.8"/><path d="M9.5 21l2.3-6.3 2.7 2.6V21M8 11.8l2.6-3.6h3.1l2.3 3.9 2.8 1M11.8 14.7L13.2 8.3"/>',
    pin: '<path d="M12 21s-7-6.4-7-12a7 7 0 0 1 14 0c0 5.6-7 12-7 12z"/><circle cx="12" cy="9" r="2.6"/>',
    phone: '<path d="M5.5 3.5h3.2l1.8 4.6-2.3 1.5a11.6 11.6 0 0 0 6.2 6.2l1.5-2.3 4.6 1.8v3.2a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3.5 5.7a2 2 0 0 1 2-2.2z"/>',
    copy: '<rect x="9" y="9" width="11.5" height="11.5" rx="2.5"/><path d="M5.5 15H5a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 5 3.5h8.5A1.5 1.5 0 0 1 15 5v.5"/>',
    table: '<rect x="3" y="7" width="18" height="3.2" rx="1"/><path d="M6 10.2V19M18 10.2V19M6 15h12"/>',
    pulse: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
    die: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.1"/><circle cx="15" cy="15" r="1.1"/><circle cx="15" cy="9" r="1.1"/><circle cx="9" cy="15" r="1.1"/>',
    store: '<path d="M4.5 10v10h15V10M3 10l2-6h14l2 6zM9.5 20v-5h5v5"/>',
    sort: '<path d="M7 4v16M3.5 16.5L7 20l3.5-3.5M17 20V4M13.5 7.5L17 4l3.5 3.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    route: '<path d="M4 11.5L20 4l-7.5 16-2-6.5z"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/>',
    ticket: '<path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"/><path d="M14.5 7.5v9" stroke-dasharray="2 2.4"/>',
    restart: '<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v4.5h4.5"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    reset: '<path d="M6 6l12 12M18 6L6 18"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z"/>',
    cafe: '<path d="M4 9h12v4.5A5.5 5.5 0 0 1 10.5 19h-1A5.5 5.5 0 0 1 4 13.5z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c0 1 1 1.4 1 2.5M12 3.5c0 1 1 1.4 1 2.5"/>',
    bar: '<path d="M5 4h14l-7 8.5z"/><path d="M12 12.5V20M8 20h8M8.5 8h7"/>',
    shop: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.1"/><circle cx="15" cy="15" r="1.1"/><circle cx="12" cy="12" r="1.1"/>',
    restaurant: '<path d="M7 3v8M4.8 3v5.2a2.2 2.2 0 0 0 4.4 0V3M7 11v10"/><path d="M17.5 21V3c-2.2 1.4-3.5 4-3.5 7.2V13h3.5"/>',
    bookshop: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v14.5H6.5A2.5 2.5 0 0 0 4 20z"/><path d="M4 20a1.5 1.5 0 0 0 1.5 1.5H20v-4M8.5 7.5h7"/>',
    culture: '<path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"/><path d="M14.5 7.5v9" stroke-dasharray="2 2.4"/>'
  };
  function icon(name, cls) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"' + (cls ? ' class="' + cls + '"' : '') + '>' + (IC[name] || '') + '</svg>';
  }
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z"/></svg>';
  var APPLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-2.99-.79-1.54.02-2.96.9-3.75 2.27-1.6 2.78-.41 6.89 1.15 9.14.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 2.99.72 1.24-.02 2.02-1.12 2.77-2.23.88-1.28 1.24-2.52 1.26-2.59-.03-.01-2.41-.93-2.43-3.65zM14.1 5.84c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.1 1.75-.96 2.79 1.01.08 2.05-.52 2.68-1.27z"/></svg>';
  var GOOGLE = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';

  /* drawn 3D objects, used until the image files exist */
  var OBJ_SVG = {
    'obj-die': '<svg viewBox="0 0 100 100"><g stroke="#1F1F1F" stroke-width="3.5" stroke-linejoin="round"><path d="M50 8l40 22-40 22-40-22z" fill="#fff"/><path d="M10 30l40 22v42L10 72z" fill="#EDE9E1"/><path d="M90 30L50 52v42l40-22z" fill="#D8D3C8"/></g><g fill="#1F1F1F"><ellipse cx="50" cy="30" rx="6" ry="3.6"/><ellipse cx="22" cy="48" rx="3.6" ry="5"/><ellipse cx="38" cy="74" rx="3.6" ry="5"/><ellipse cx="62" cy="62" rx="3.6" ry="5"/><ellipse cx="70" cy="57" rx="3.6" ry="5" opacity="0"/><ellipse cx="78" cy="52" rx="3.6" ry="5"/><ellipse cx="62" cy="80" rx="3.6" ry="5"/><ellipse cx="78" cy="70" rx="3.6" ry="5"/></g><path d="M50 12l-30 16" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/></svg>',
    'obj-meeple': '<svg viewBox="0 0 100 100"><path d="M50 7c10 0 17 7 17 16 0 6-3 10-7 13l22 8c6 2 9 6 9 11s-4 8-10 8H69l13 22c2 4 0 8-5 8H62L50 75 38 93H23c-5 0-7-4-5-8l13-22H19c-6 0-10-3-10-8s3-9 9-11l22-8c-4-3-7-7-7-13 0-9 7-16 17-16z" fill="#FF4D8D" stroke="#1F1F1F" stroke-width="3.5" stroke-linejoin="round"/><path d="M42 17c2-3 6-4 9-3" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".75"/></svg>',
    'obj-card': '<svg viewBox="0 0 100 130"><g transform="rotate(12 50 65)"><rect x="12" y="8" width="76" height="114" rx="10" fill="#01B0FF" stroke="#1F1F1F" stroke-width="3.5"/><rect x="20" y="16" width="60" height="98" rx="6" fill="#fff" stroke="#1F1F1F" stroke-width="2.5"/><path d="M50 40l6 12 13 2-9.5 9 2.3 13L50 70l-11.8 6 2.3-13-9.5-9 13-2z" fill="#FFBC03" stroke="#1F1F1F" stroke-width="2.5" stroke-linejoin="round"/></g></svg>',
    'pin-3d': '<svg viewBox="0 0 140 170"><defs><radialGradient id="pinG" cx="35%" cy="28%" r="75%"><stop offset="0" stop-color="#FFE07A"/><stop offset=".55" stop-color="#FFBC03"/><stop offset="1" stop-color="#E29A00"/></radialGradient></defs><ellipse cx="70" cy="158" rx="30" ry="8" fill="rgba(90,55,0,.25)"/><path d="M70 8C41 8 18 31 18 60c0 38 52 86 52 86s52-48 52-86C122 31 99 8 70 8z" fill="url(#pinG)" stroke="#1F1F1F" stroke-width="5" stroke-linejoin="round"/><circle cx="70" cy="58" r="25" fill="#1F1F1F"/><path d="M62 50.5c2.3-2.6 5.6-3.6 9-3.3 5.3.5 8 3.9 8 8.8V69h-6.2v-2c-1.6 1.7-3.8 2.5-6.4 2.5-4.6 0-7.6-2.8-7.6-6.6 0-4 3.1-6.5 8.4-6.5h5.5c0-2.4-1.5-3.7-4-3.7-1.9 0-3.4.7-4.6 2z M68.4 61c-1.9 0-3 .8-3 2s1 2 2.8 2c2.2 0 4.6-1.3 4.6-3.3V61z" fill="#fff"/><path d="M38 44c4-12 14-20 26-22" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none" opacity=".55"/></svg>'
  };

  /* ------------------------------------------------------------------
     i18n
     ------------------------------------------------------------------ */
  var S = {
    lang: 'fr',
    screen: 'landing',
    name: '',
    authMode: 'signup',
    postcode: '',
    areaKey: '',
    locValid: false,
    user: AREA_POS['75011'],
    favs: new Set(),
    f: { tables: 0, occ: new Set(), games: new Set(), types: new Set() },
    sort: 'distance',
    list: [],
    activeId: null,
    detailId: null,
    bookings: {},
    live: {},
    lastCount: 0
  };
  VENUES.forEach(function (v) { S.live[v.id] = v.occupancy; });

  function t(key, vars) {
    var d = I18N[S.lang] || {};
    var s = d[key];
    if (s == null) s = (I18N.fr || {})[key];
    if (s == null) s = key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  }
  function has(key) { return (I18N[S.lang] || {})[key] != null || (I18N.fr || {})[key] != null; }
  function tp(base, n, vars) {
    var v = Object.assign({ n: n }, vars || {});
    if (n === 0 && has(base + '.zero')) return t(base + '.zero', v);
    if (n === 1 && has(base + '.one')) return t(base + '.one', v);
    return t(base + '.other', v);
  }
  function L(obj) { return obj ? (obj[S.lang] || obj.fr || '') : ''; }
  function gName(g, full) { return full ? L(g.name) : L(g.short || g.name); }
  function pct(p) { return S.lang === 'fr' ? p + ' %' : p + '%'; }
  function hourLabel(h) {
    var hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    if (S.lang === 'fr') return (hh % 24) + '\u00a0h' + (mm ? '\u00a0' + String(mm).padStart(2, '0') : '');
    var h12 = hh % 12 === 0 ? 12 : hh % 12;
    return h12 + (mm ? '.' + String(mm).padStart(2, '0') : '') + (hh % 24 < 12 ? ' am' : ' pm');
  }

  function applyI18n(root) {
    $$('[data-i18n]', root).forEach(function (el) {
      var txt = t(el.getAttribute('data-i18n'));
      if (el.classList.contains('display')) {
        // keep hyphenated words and French punctuation together in big titles
        el.innerHTML = esc(txt.replace(/ ([?:!;])/g, '\u00a0$1')).replace(/(\S+-\S+)/g, '<span class="nowrap">$1</span>');
      } else el.textContent = txt;
    });
    $$('[data-i18n-attr]', root).forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var p = pair.split(':');
        if (p.length === 2) el.setAttribute(p[0].trim(), t(p[1].trim()));
      });
    });
  }

  var langRenderers = [];
  function onLang(fn) { langRenderers.push(fn); }

  function renderLangToggles() {
    $$('[data-lang-toggle]').forEach(function (host) {
      var soft = !!host.closest('.map-bar');
      host.innerHTML = '<div class="lang' + (soft ? ' lang--soft' : '') + '" role="group" data-lang="' + S.lang + '" aria-label="' + esc(t('lang.label')) + '">' +
        '<span class="lang__thumb" aria-hidden="true"></span>' +
        '<button type="button" data-set-lang="fr" lang="fr" aria-pressed="' + (S.lang === 'fr') + '">FR</button>' +
        '<button type="button" data-set-lang="en" lang="en" aria-pressed="' + (S.lang === 'en') + '">EN</button></div>';
    });
  }
  function syncLangToggles() {
    $$('.lang').forEach(function (el) {
      el.setAttribute('data-lang', S.lang);
      el.setAttribute('aria-label', t('lang.label'));
      $$('button', el).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-lang') === S.lang)); });
    });
  }

  function setLang(lang, animate) {
    if (lang === S.lang || !I18N[lang]) return;
    var swap = function () {
      S.lang = lang;
      store('bgf-lang', lang);
      document.documentElement.lang = lang;
      document.title = t('doc.title');
      applyI18n(document);
      langRenderers.forEach(function (fn) { try { fn(); } catch (e) { /* keep going */ } });
      syncLangToggles();
    };
    if (!animate || reduced()) { swap(); return; }
    // move the thumb right away, swap texts under a short fade
    $$('.lang').forEach(function (el) { el.setAttribute('data-lang', lang); });
    app.classList.add('is-switching');
    setTimeout(function () {
      swap();
      requestAnimationFrame(function () { app.classList.remove('is-switching'); });
    }, 170);
  }

  /* ------------------------------------------------------------------
     Toast
     ------------------------------------------------------------------ */
  var toastEl = document.getElementById('toast');
  var toastTimer;
  function toast(msg, ic) {
    toastEl.innerHTML = icon(ic || 'check') + '<span>' + esc(msg) + '</span>';
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2400);
  }

  /* ------------------------------------------------------------------
     Image helper: never a broken image icon
     ------------------------------------------------------------------ */
  function img(src, cls, alt, lazy) {
    var el = new Image();
    if (lazy) el.loading = 'lazy'; // must be set before src, or the fetch starts at once
    el.decoding = 'async';
    el.alt = alt || '';
    el.draggable = false;
    if (cls) el.className = cls;
    el.addEventListener('load', function () { el.classList.add('is-loaded'); });
    el.addEventListener('error', function () { el.remove(); });
    el.src = src;
    return el;
  }
  function loadObj(el) {
    var name = el.getAttribute('data-obj');
    var probe = new Image();
    probe.alt = '';
    probe.draggable = false;
    probe.onload = function () { el.innerHTML = ''; el.appendChild(probe); };
    probe.onerror = function () { el.innerHTML = OBJ_SVG[name] || ''; };
    probe.src = 'img/ui/' + name + '.webp';
  }

  /* ------------------------------------------------------------------
     Geometry
     ------------------------------------------------------------------ */
  function walkMin(v) {
    var R = 6371, toR = Math.PI / 180;
    var dLat = (v.lat - S.user.lat) * toR, dLng = (v.lng - S.user.lng) * toR;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(S.user.lat * toR) * Math.cos(v.lat * toR) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var km = 2 * R * Math.asin(Math.sqrt(a));
    return Math.max(1, Math.round(km * 1.3 / 4.8 * 60));
  }
  function occLevel(p) { return p < 45 ? 'calm' : (p <= 80 ? 'lively' : 'full'); }
  var LVL_BAND = { calm: [8, 44], lively: [45, 80], full: [81, 98] };

  /* ------------------------------------------------------------------
     Screens
     ------------------------------------------------------------------ */
  var ONB_STEPS = { account: 1, location: 2, games: 3 };
  var enterHooks = {};

  function screenEl(name) { return document.getElementById('s-' + name); }

  function go(name, opts) {
    opts = opts || {};
    if (S.screen === name && !opts.force) return;
    closeAllOverlays();
    var from = screenEl(S.screen), to = screenEl(name);
    app.classList.toggle('is-back', !!opts.back);
    if (from && from !== to) {
      from.classList.add('is-leaving');
      from.classList.remove('is-active');
      from.setAttribute('aria-hidden', 'true');
      setTimeout(function () { from.classList.remove('is-leaving'); }, 650);
    }
    to.classList.add('is-active');
    to.removeAttribute('aria-hidden');
    to.scrollTop = 0;
    S.screen = name;
    app.classList.toggle('is-map', name === 'map');
    if (enterHooks[name]) enterHooks[name](opts);
    var heading = $('h1, h2', to);
    if (heading && name !== 'map' && opts.focus !== false) {
      heading.setAttribute('tabindex', '-1');
      setTimeout(function () { try { heading.focus({ preventScroll: true }); } catch (e) { /* noop */ } }, 60);
    }
  }

  function renderOnbTops() {
    $$('[data-onb-top]').forEach(function (host) {
      var sc = host.closest('.screen');
      var step = ONB_STEPS[sc.getAttribute('data-screen')] || 1;
      var keys = ['step.account', 'step.location', 'step.games'];
      var items = keys.map(function (k, i) {
        var n = i + 1;
        var cls = n < step ? 'is-done' : (n === step ? 'is-current' : '');
        return '<div class="stepper__item ' + cls + '"' + (n === step ? ' aria-current="step"' : '') + '>' +
          '<span class="stepper__label"><b>' + n + '</b><span>' + esc(t(k)) + '</span></span>' +
          '<span class="stepper__bar"></span></div>';
      }).join('');
      host.innerHTML =
        '<div class="onb-top__left">' +
          '<button class="icon-btn icon-btn--line" type="button" data-action="back" aria-label="' + esc(t('a11y.back')) + '">' + icon('left') + '</button>' +
          '<img class="onb-top__logo" src="img/brand/asmodee-logo.webp" alt="asmodee" width="700" height="274">' +
        '</div>' +
        '<nav class="stepper" aria-label="' + esc(t('step.of', { n: step })) + '">' +
          '<div class="stepper__items">' + items + '</div>' +
          '<span class="stepper__mobile">' + esc(t('step.of', { n: step })) + '</span>' +
        '</nav>' +
        '<div class="topbar__right"><div data-lang-toggle></div></div>';
    });
  }

  /* ------------------------------------------------------------------
     1. Landing: parallax, phone mockup
     ------------------------------------------------------------------ */
  var stage = document.getElementById('landing-stage');
  (function parallax() {
    var floats = $$('.float, .phone', stage);
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    function loop() {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      floats.forEach(function (el) {
        var d = parseFloat(el.getAttribute('data-depth') || (el.classList.contains('phone') ? 8 : 0));
        el.style.translate = (cx * d).toFixed(2) + 'px ' + (cy * d).toFixed(2) + 'px';
      });
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) raf = requestAnimationFrame(loop); else raf = 0;
    }
    screenEl('landing').addEventListener('pointermove', function (e) {
      if (!fineMQ.matches || reduced()) return;
      var r = app.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    screenEl('landing').addEventListener('pointerleave', function () {
      tx = 0; ty = 0;
      if (!raf) raf = requestAnimationFrame(loop);
    });
  })();

  function buildMockMap() {
    var host = document.getElementById('mock-map');
    var s = '<svg viewBox="0 0 300 630" preserveAspectRatio="xMidYMid slice" aria-hidden="true">';
    s += '<rect width="300" height="630" fill="#EDE8DD"/>';
    s += '<g transform="rotate(-17 150 315)">';
    for (var y = -260, r = 0; y < 900; y += 56, r++) {
      for (var x = -260, c = 0; x < 560; x += 70, c++) {
        var hh = hash(r + ':' + c);
        var w = 56 + (hh % 8), h = 42 + ((hh >> 3) % 8);
        var fill = (hh % 11 === 0) ? '#D7EBC6' : '#F8F4EB';
        s += '<rect x="' + (x + (r % 2) * 18) + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" fill="' + fill + '"/>';
      }
    }
    s += '</g>';
    s += '<path d="M188 168c34-14 72 2 82 30 8 26-12 54-44 58-34 4-58-14-60-42-1-20 8-38 22-46z" fill="#CFE6B9"/>';
    s += '<path d="M62 -20C84 110 50 210 112 312S160 520 116 660" fill="none" stroke="#A9DCF2" stroke-width="15" stroke-linecap="round"/>';
    s += '<path d="M-20 430L320 250M-20 170L320 360" stroke="#fff" stroke-width="11" stroke-linecap="round"/>';
    var pins = [[96, 214, 8], [176, 252, 12], [222, 196, 5], [128, 318, 16], [214, 336, 7], [70, 392, 10], [168, 420, 9], [246, 438, 6], [118, 470, 4]];
    s += '<g transform="translate(150 360)"><circle r="8" fill="#01B0FF" class="mock-me" opacity=".5"/><circle r="7" fill="#01B0FF" stroke="#fff" stroke-width="3"/></g>';
    pins.forEach(function (p, i) {
      var sel = i === 3;
      var sc = sel ? 1.3 : 1;
      s += '<g transform="translate(' + p[0] + ' ' + p[1] + ') scale(' + sc + ')"><g class="mock-pin" style="animation-delay:' + (0.25 + i * 0.12) + 's">' +
        '<path d="M0 0C-8-9-14-15-14-23a14 14 0 0 1 28 0c0 8-6 14-14 23z" fill="' + (sel ? '#1F1F1F' : '#FFBC03') + '" stroke="#1F1F1F" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<text x="0" y="-19" text-anchor="middle" font-family="Rowdies, sans-serif" font-size="12" fill="' + (sel ? '#FFBC03' : '#1F1F1F') + '">' + p[2] + '</text></g></g>';
    });
    s += '</svg>';
    host.innerHTML = s;
  }

  var mockTimer = null, mockIdx = 0;
  var MOCK_IDS = ['v03', 'v22', 'v07', 'v12'];
  function renderMockCards() {
    var host = document.getElementById('mock-card');
    host.innerHTML = '';
    MOCK_IDS.forEach(function (id, i) {
      var v = VBY[id]; if (!v) return;
      var item = document.createElement('div');
      item.className = 'mock-card__item' + (i === mockIdx ? ' is-on' : '');
      var ph = document.createElement('div');
      ph.className = 'mock-card__ph';
      ph.style.setProperty('--c', TYPE_COLOR[v.type]);
      ph.appendChild(img('img/venues/' + v.photos[0] + '.webp'));
      item.appendChild(ph);
      var tx = document.createElement('div');
      tx.className = 'mock-card__txt';
      tx.innerHTML = '<span class="mock-card__type">' + esc(t('type.' + v.type)) + '</span>' +
        '<span class="mock-card__name">' + esc(v.name) + '</span>' +
        '<span class="mock-card__meta"><b>' + esc(t('mock.tables', { n: v.tables })) + '</b><span>' + esc(t('mock.walk', { m: 4 + i * 3 })) + '</span></span>';
      item.appendChild(tx);
      host.appendChild(item);
    });
  }
  function startMock() {
    stopMock();
    if (reduced()) return;
    mockTimer = setInterval(function () {
      var items = $$('.mock-card__item');
      if (!items.length) return;
      var cur = items[mockIdx];
      mockIdx = (mockIdx + 1) % items.length;
      cur.classList.remove('is-on'); cur.classList.add('is-off');
      setTimeout(function () { cur.classList.remove('is-off'); }, 600);
      items[mockIdx].classList.add('is-on');
    }, 3200);
  }
  function stopMock() { if (mockTimer) clearInterval(mockTimer); mockTimer = null; }
  enterHooks.landing = function () { startMock(); };

  /* ------------------------------------------------------------------
     2. Account
     ------------------------------------------------------------------ */
  var form = document.getElementById('account-form');
  var fFirst = document.getElementById('f-firstname');
  var fEmail = document.getElementById('f-email');
  var fPw = document.getElementById('f-password');
  var touched = {};

  function fieldBox(input) { return input.closest('.field'); }
  function check(name) {
    if (name === 'firstname') return S.authMode === 'login' || fFirst.value.trim().length >= 1;
    if (name === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fEmail.value.trim());
    if (name === 'password') return fPw.value.length >= 8;
    return true;
  }
  var ERR = { firstname: 'err.firstname', email: 'err.email', password: 'err.password' };
  var INPUT = { firstname: fFirst, email: fEmail, password: fPw };
  function paintField(name, showErr) {
    var input = INPUT[name], box = fieldBox(input), ok = check(name);
    var err = document.getElementById('e-' + name);
    box.classList.toggle('is-valid', ok && input.value.length > 0);
    var bad = !ok && (showErr || touched[name]);
    box.classList.toggle('is-invalid', bad);
    input.setAttribute('aria-invalid', String(bad));
    err.textContent = bad ? t(ERR[name]) : '';
  }
  function pwLevel(pw) {
    if (!pw) return 0;
    if (pw.length < 8) return 1;
    var sc = 1;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) sc++;
    if (/\d/.test(pw)) sc++;
    if (/[^A-Za-z0-9]/.test(pw)) sc++;
    if (pw.length >= 12) sc++;
    return clamp(sc, 1, 4);
  }
  function paintMeter() {
    var meter = document.getElementById('pw-meter');
    var pw = fPw.value, lvl = pwLevel(pw);
    meter.setAttribute('data-level', String(lvl));
    var label = document.getElementById('pw-meter-label');
    if (!pw) label.textContent = '';
    else if (pw.length < 8) label.textContent = t('pw.s0');
    else {
      var sc = 1;
      if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) sc++;
      if (/\d/.test(pw)) sc++;
      if (/[^A-Za-z0-9]/.test(pw)) sc++;
      if (pw.length >= 12) sc++;
      label.textContent = t('pw.s' + clamp(sc, 1, 4));
    }
  }
  ['firstname', 'email', 'password'].forEach(function (name) {
    var input = INPUT[name];
    input.addEventListener('input', function () { paintField(name, false); if (name === 'password') paintMeter(); });
    input.addEventListener('blur', function () { if (input.value.length) touched[name] = true; paintField(name, false); });
  });
  document.getElementById('pw-eye').addEventListener('click', function () {
    var on = fPw.type === 'password';
    fPw.type = on ? 'text' : 'password';
    this.setAttribute('aria-pressed', String(on));
    this.setAttribute('aria-label', t(on ? 'pw.hide' : 'pw.show'));
  });

  function paintAuthMode() {
    var login = S.authMode === 'login';
    var title = document.getElementById('account-title');
    title.setAttribute('data-i18n', login ? 'account.title.login' : 'account.title');
    document.getElementById('account-lead').setAttribute('data-i18n', login ? 'account.lead.login' : 'account.lead');
    $('#account-submit span').setAttribute('data-i18n', login ? 'account.submit.login' : 'account.submit');
    document.getElementById('switch-q').setAttribute('data-i18n', login ? 'account.switch.toSignup.q' : 'account.switch.toLogin.q');
    document.getElementById('switch-mode').setAttribute('data-i18n', login ? 'account.switch.toSignup' : 'account.switch.toLogin');
    fieldBox(fFirst).classList.toggle('is-hidden', login);
    fPw.setAttribute('autocomplete', login ? 'current-password' : 'new-password');
    document.getElementById('pw-meter').hidden = login;
    applyI18n(screenEl('account'));
  }
  document.getElementById('switch-mode').addEventListener('click', function () {
    S.authMode = S.authMode === 'login' ? 'signup' : 'login';
    touched = {};
    ['firstname', 'email', 'password'].forEach(function (n) { paintField(n, false); });
    paintAuthMode();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var names = ['firstname', 'email', 'password'].filter(function (n) { return !(n === 'firstname' && S.authMode === 'login'); });
    var firstBad = null;
    names.forEach(function (n) { touched[n] = true; paintField(n, true); if (!check(n) && !firstBad) firstBad = INPUT[n]; });
    if (firstBad) {
      var card = form.closest('.card-hard');
      card.classList.remove('is-shake'); void card.offsetWidth; card.classList.add('is-shake');
      firstBad.focus();
      return;
    }
    var btn = document.getElementById('account-submit');
    btn.classList.add('is-loading');
    setTimeout(function () {
      btn.classList.remove('is-loading');
      if (S.authMode === 'login') {
        var local = fEmail.value.trim().split('@')[0].split(/[._-]/)[0] || t('demo.name');
        S.name = local.charAt(0).toUpperCase() + local.slice(1);
      } else {
        S.name = fFirst.value.trim();
      }
      toast(t('auth.hello', { name: S.name }), 'check');
      go('location');
    }, reduced() ? 50 : 750);
  });

  /* Apple / Google simulated sign in */
  var authSheet = document.getElementById('auth-sheet');
  var authTimers = [];
  function openAuth(provider) {
    closeAuth(true);
    var name = t('demo.name');
    authSheet.hidden = false;
    authSheet.classList.remove('is-closing');
    authSheet.setAttribute('role', 'dialog');
    authSheet.setAttribute('aria-modal', 'true');
    authSheet.setAttribute('aria-label', t('auth.' + provider + '.title'));
    authSheet.innerHTML =
      '<div class="auth-box auth-box--' + provider + '">' +
        '<div class="auth-box__logo">' + (provider === 'apple' ? APPLE : GOOGLE) + '</div>' +
        '<p class="auth-box__title">' + esc(t('auth.' + provider + '.title')) + '</p>' +
        '<div class="auth-box__state"><span class="auth-ring"></span><span class="auth-check"><svg viewBox="0 0 24 24">' + IC.check + '</svg></span></div>' +
        '<p class="auth-box__msg" aria-live="polite">' + esc(t('auth.wait')) + '</p>' +
        '<div class="auth-box__acct"><i>' + esc(name.charAt(0)) + '</i><span>' + esc(t('demo.email')) + '</span></div>' +
        '<button class="link-btn" type="button" data-action="auth-cancel">' + esc(t('auth.cancel')) + '</button>' +
      '</div>';
    var box = $('.auth-box', authSheet);
    $('.link-btn', authSheet).focus();
    authTimers.push(setTimeout(function () {
      box.classList.add('is-done');
      $('.auth-box__msg', box).textContent = t('auth.done') + ' · ' + t('auth.hello', { name: name });
      S.name = name;
    }, reduced() ? 300 : 1500));
    authTimers.push(setTimeout(function () {
      closeAuth();
      go('location');
    }, reduced() ? 700 : 2500));
  }
  function closeAuth(instant) {
    authTimers.forEach(clearTimeout); authTimers = [];
    if (authSheet.hidden) return;
    if (instant) { authSheet.hidden = true; authSheet.innerHTML = ''; return; }
    authSheet.classList.add('is-closing');
    setTimeout(function () { authSheet.hidden = true; authSheet.innerHTML = ''; authSheet.classList.remove('is-closing'); }, 200);
  }
  authSheet.addEventListener('click', function (e) { if (e.target === authSheet) closeAuth(); });

  enterHooks.account = function (opts) {
    if (opts.mode) { S.authMode = opts.mode; paintAuthMode(); }
  };

  /* ------------------------------------------------------------------
     3. Location
     ------------------------------------------------------------------ */
  var codeBox = document.getElementById('code-box');
  var codeInput = document.getElementById('f-postcode');
  var codeSlots = $$('.code__slots span', codeBox);
  var locStatus = document.getElementById('loc-status');
  var locSubmit = document.getElementById('loc-submit');
  var btnLocate = document.getElementById('btn-locate');
  var locStatusState = null;
  var locBusy = false;

  function isFrenchPostcode(c) { return /^(?:0[1-9]|[1-8]\d|9[0-5]|97|98)\d{3}$/.test(c) && c !== '00000'; }

  function paintSlots(prev) {
    var val = codeInput.value;
    codeSlots.forEach(function (sl, i) {
      var ch = val.charAt(i);
      var was = sl.textContent;
      sl.textContent = ch;
      sl.classList.toggle('is-filled', !!ch);
      sl.classList.toggle('is-caret', i === Math.min(val.length, 4) && (val.length < 5 || i === 4));
      if (ch && ch !== was) { sl.classList.remove('is-pop'); void sl.offsetWidth; sl.classList.add('is-pop'); }
    });
  }
  function setLocStatus(kind, data) {
    locStatusState = kind ? { kind: kind, data: data || {} } : null;
    paintLocStatus();
  }
  function paintLocStatus() {
    var st = locStatusState;
    if (!st) { locStatus.innerHTML = ''; locStatus.className = 'loc-status'; return; }
    var ic = { ok: 'check', info: 'info', err: 'close', hint: '' }[st.kind];
    var html = '';
    if (st.kind === 'ok') {
      html = '<span class="loc-status__icon">' + icon('check') + '</span><span class="loc-status__area"><span>' + esc(t(st.data.areaKey)) + '</span><small>' + esc(t(st.data.gps ? 'loc.found' : 'loc.ok')) + '</small></span>';
    } else if (st.kind === 'info') {
      html = '<span class="loc-status__icon">' + icon('info') + '</span><span>' + esc(t('loc.outside')) + '</span>';
    } else if (st.kind === 'err') {
      html = '<span class="loc-status__icon">' + icon(ic) + '</span><span>' + esc(t('loc.invalid')) + '</span>';
    } else if (st.kind === 'hint') {
      html = '<span>' + esc(tp('loc.typing', st.data.n)) + '</span>';
    } else if (st.kind === 'search') {
      html = '<span>' + esc(t('loc.searching')) + '</span>';
    }
    locStatus.className = 'loc-status loc-status--' + st.kind;
    locStatus.innerHTML = html;
  }
  function evalCode(fromGps) {
    var val = codeInput.value;
    codeBox.classList.remove('is-valid', 'is-invalid');
    S.locValid = false;
    if (val.length < 5) {
      setLocStatus(val.length ? 'hint' : null, { n: 5 - val.length });
    } else if (!isFrenchPostcode(val)) {
      setLocStatus('err');
      void codeBox.offsetWidth;
      codeBox.classList.add('is-invalid');
    } else {
      S.locValid = true;
      codeBox.classList.add('is-valid');
      if (fromGps) {
        S.postcode = '75011'; S.areaKey = 'area.gps'; S.user = AREA_POS.gps;
        setLocStatus('ok', { areaKey: 'area.gps', gps: true });
      } else if (DEMO_AREAS.indexOf(val) >= 0) {
        S.postcode = val; S.areaKey = 'area.' + val; S.user = AREA_POS[val];
        setLocStatus('ok', { areaKey: 'area.' + val });
      } else {
        S.postcode = '75011'; S.areaKey = 'area.75011'; S.user = AREA_POS['75011'];
        setLocStatus('info');
      }
    }
    locSubmit.disabled = !S.locValid;
  }
  codeInput.addEventListener('input', function () {
    if (locBusy) return;
    var clean = codeInput.value.replace(/\D/g, '').slice(0, 5);
    if (clean !== codeInput.value) codeInput.value = clean;
    btnLocate.classList.remove('is-found');
    $('.btn--locate__label', btnLocate).setAttribute('data-i18n', 'loc.use');
    $('.btn--locate__label', btnLocate).textContent = t('loc.use');
    paintSlots();
    evalCode(false);
  });
  codeInput.addEventListener('focus', function () { codeBox.classList.add('is-focus'); paintSlots(); });
  codeInput.addEventListener('blur', function () { codeBox.classList.remove('is-focus'); });

  btnLocate.addEventListener('click', function () {
    if (locBusy) return;
    locBusy = true;
    btnLocate.classList.remove('is-found');
    btnLocate.classList.add('is-searching');
    btnLocate.setAttribute('aria-busy', 'true');
    var label = $('.btn--locate__label', btnLocate);
    label.setAttribute('data-i18n', 'loc.searching');
    label.textContent = t('loc.searching');
    codeInput.value = '';
    codeBox.classList.remove('is-valid', 'is-invalid');
    paintSlots();
    setLocStatus(null);
    locSubmit.disabled = true;
    setTimeout(function () {
      var digits = '75011'.split(''), k = 0;
      (function typeNext() {
        codeInput.value += digits[k++];
        paintSlots();
        if (k < digits.length) setTimeout(typeNext, reduced() ? 0 : 75);
        else {
          btnLocate.classList.remove('is-searching');
          btnLocate.classList.add('is-found');
          btnLocate.removeAttribute('aria-busy');
          label.setAttribute('data-i18n', 'loc.found');
          label.textContent = t('loc.found');
          locBusy = false;
          evalCode(true);
          locSubmit.focus({ preventScroll: true });
        }
      })();
    }, reduced() ? 200 : 1500);
  });

  document.getElementById('loc-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!S.locValid) {
      if (codeInput.value.length === 5) { codeBox.classList.remove('is-invalid'); void codeBox.offsetWidth; codeBox.classList.add('is-invalid'); }
      codeInput.focus();
      return;
    }
    go('games');
  });
  onLang(paintLocStatus);

  /* ------------------------------------------------------------------
     4. Games
     ------------------------------------------------------------------ */
  var tilesEl = document.getElementById('game-tiles');
  function renderTiles() {
    tilesEl.innerHTML = '';
    GAMES.forEach(function (g, i) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tile';
      b.setAttribute('data-game', g.id);
      b.setAttribute('aria-pressed', String(S.favs.has(g.id)));
      b.style.setProperty('--c', g.color);
      b.innerHTML =
        '<span class="tile__fallback" aria-hidden="true">' + g.emblem + '</span>' +
        '<span class="tile__media" aria-hidden="true"></span>' +
        '<span class="tile__shade" aria-hidden="true"></span>' +
        '<span class="tile__emblem" aria-hidden="true">' + g.emblem + '</span>' +
        '<span class="tile__check" aria-hidden="true"><svg viewBox="0 0 24 24">' + IC.check + '</svg></span>' +
        '<span class="tile__body"><span class="tile__name">' + esc(gName(g, true)) + '</span>' +
        '<span class="tile__meta"><span>' + esc(L(g.tag)) + '</span><span>' + esc(t('games.players', { p: g.players })) + '</span><span>' + esc(t('games.minutes', { m: g.duration })) + '</span></span></span>';
      $('.tile__media', b).appendChild(img('img/games/' + g.id + '.webp'));
      li.appendChild(b);
      tilesEl.appendChild(li);
    });
    paintGamesCount(false);
  }
  function paintGamesCount(bump) {
    var n = S.favs.size;
    var count = document.getElementById('games-count');
    var str = esc(tp('games.count', n)).replace(String(n), '<b>' + n + '</b>');
    if (n === 0) str = esc(tp('games.count', 0));
    count.innerHTML = str;
    if (bump) { var b = $('b', count); if (b) b.classList.add('is-bump'); }
    var all = document.getElementById('games-all');
    all.textContent = t(n === GAMES.length ? 'games.none' : 'games.all');
    var go_ = document.getElementById('games-go');
    go_.disabled = n === 0;
    document.getElementById('games-go-label').textContent = tp('games.cta', n);
  }
  tilesEl.addEventListener('click', function (e) {
    var b = e.target.closest('.tile');
    if (!b) return;
    var id = b.getAttribute('data-game');
    if (S.favs.has(id)) S.favs.delete(id); else S.favs.add(id);
    b.setAttribute('aria-pressed', String(S.favs.has(id)));
    paintGamesCount(true);
  });
  document.getElementById('games-all').addEventListener('click', function () {
    var all = S.favs.size === GAMES.length;
    S.favs = all ? new Set() : new Set(GAMES.map(function (g) { return g.id; }));
    $$('.tile', tilesEl).forEach(function (b, i) {
      setTimeout(function () { b.setAttribute('aria-pressed', String(!all)); }, reduced() ? 0 : i * 28);
    });
    paintGamesCount(true);
  });
  document.getElementById('games-go').addEventListener('click', function () {
    if (!S.favs.size) return;
    resetFilters(true);
    go('loader');
  });
  onLang(function () {
    $$('.tile', tilesEl).forEach(function (b) {
      var g = GBY[b.getAttribute('data-game')];
      $('.tile__name', b).textContent = gName(g, true);
      var m = $$('.tile__meta span', b);
      m[0].textContent = L(g.tag);
      m[1].textContent = t('games.players', { p: g.players });
      m[2].textContent = t('games.minutes', { m: g.duration });
    });
    paintGamesCount(false);
  });

  /* ------------------------------------------------------------------
     5. Loader
     ------------------------------------------------------------------ */
  var loaderTimers = [];
  var loaderAnim = null;
  function buildLoaderArt() {
    var pips = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
    $$('[data-die]').forEach(function (cube) {
      var html = '';
      [1, 6, 3, 4, 5, 2].forEach(function (n) {
        html += '<div class="die__face">';
        for (var i = 0; i < 9; i++) html += '<i' + (pips[n].indexOf(i) >= 0 ? ' class="on"' : '') + '></i>';
        html += '</div>';
      });
      cube.innerHTML = html;
    });
  }
  function buildLoaderCards() {
    var ids = Array.from(S.favs);
    DEFAULT_FAVS.forEach(function (id) { if (ids.length < 3 && ids.indexOf(id) < 0) ids.push(id); });
    ids = ids.slice(0, 3);
    var conf = [{ r: '-14deg', x: '-74px', d: '0s' }, { r: '0deg', x: '0px', d: '.25s' }, { r: '14deg', x: '74px', d: '.5s' }];
    document.getElementById('lcards').innerHTML = ids.map(function (id, i) {
      var g = GBY[id];
      return '<div class="lcard" style="--r:' + conf[i].r + ';--x:' + conf[i].x + ';--d:' + conf[i].d + ';--c:' + g.color + '"><div class="lcard__in">' +
        '<div class="lcard__back"><img src="img/brand/asmodee-a.webp" alt="" width="207" height="220"></div>' +
        '<div class="lcard__face">' + g.emblem + '</div></div></div>';
    }).join('');
  }
  function loaderSteps() {
    var tables = 0;
    computeList().forEach(function (v) { tables += v.tables; });
    return [
      t('loader.step1', { area: t(S.areaKey || 'area.75011') }),
      tp('loader.step2', S.favs.size),
      t('loader.step3', { n: tables })
    ];
  }
  function paintLoaderSteps(state) {
    var ol = document.getElementById('loader-steps');
    var txt = loaderSteps();
    ol.innerHTML = txt.map(function (s, i) {
      var cls = i < state ? 'is-done' : (i === state ? 'is-active' : '');
      return '<li class="' + cls + '"><i><svg viewBox="0 0 24 24">' + IC.check + '</svg></i><span>' + esc(s) + '</span></li>';
    }).join('');
    ol.setAttribute('data-state', String(state));
  }
  enterHooks.loader = function () {
    loaderTimers.forEach(clearTimeout); loaderTimers = [];
    buildLoaderCards();
    var screen = screenEl('loader');
    screen.setAttribute('aria-busy', 'true');
    var total = reduced() ? 1200 : 3200;
    var bar = document.getElementById('loader-bar');
    if (loaderAnim) { try { loaderAnim.cancel(); } catch (e) { /* noop */ } loaderAnim = null; }
    if (bar.animate) {
      loaderAnim = bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(.38)', offset: .33 }, { transform: 'scaleX(.7)', offset: .66 }, { transform: 'scaleX(1)' }],
        { duration: total - 200, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    } else { bar.style.transform = 'scaleX(1)'; }
    paintLoaderSteps(0);
    ensureMap();
    [1, 2, 3].forEach(function (st, i) {
      loaderTimers.push(setTimeout(function () { paintLoaderSteps(st); }, total * (i + 1) / 3.25));
    });
    loaderTimers.push(setTimeout(function () {
      screen.setAttribute('aria-busy', 'false');
      go('map', { reveal: true });
    }, total + 250));
  };
  onLang(function () {
    var ol = document.getElementById('loader-steps');
    if (ol.children.length) paintLoaderSteps(parseInt(ol.getAttribute('data-state') || '0', 10));
  });

  /* ------------------------------------------------------------------
     6. Map: map instance
     ------------------------------------------------------------------ */
  var mapScreen = screenEl('map');
  var canvas = document.getElementById('map-canvas');
  var mapTop = document.getElementById('map-top');
  var mapBottom = document.getElementById('map-bottom');
  var car = document.getElementById('carousel');
  var map = null;
  var mapSelecting = false;

  function mapCall(fn) {
    if (!map || typeof map[fn] !== 'function') return;
    var args = Array.prototype.slice.call(arguments, 1);
    try { return map[fn].apply(map, args); } catch (e) { if (window.console) console.warn('BGFMap.' + fn, e); }
  }
  var mapClickT = 0;
  document.getElementById('map-canvas').addEventListener('dblclick', function () { clearTimeout(mapClickT); });
  function ensureMap() {
    if (map) { mapCall('setUser', S.user); return map; }
    var API = window.BGFMap;
    if (!API || typeof API.create !== 'function') return null;
    try {
      map = API.create(canvas, {
        venues: VENUES,
        center: S.user,
        lang: S.lang,
        onSelect: onPinSelect,
        onMove: function () { },
        onMapClick: function () {
          var busy = (sList && !sList.hidden) || menuState || openPanelState;
          closeSearch(); if (menuState) closeMenu(true);
          // desktop: a click on the bare map closes the side panel (a double click zooms instead)
          if (!busy && S.detailId && isDesk()) {
            clearTimeout(mapClickT);
            mapClickT = setTimeout(closeDetail, 280);
          }
        }
      });
    } catch (e) {
      if (window.console) console.warn('BGFMap.create', e);
      map = null;
      return null;
    }
    mapCall('setUser', S.user);
    return map;
  }
  function mapSelect(id, pan) {
    if (!id) return;
    mapSelecting = true;
    mapCall('select', id, { pan: !!pan });
    setTimeout(function () { mapSelecting = false; }, 0);
  }
  function onPinSelect(id) {
    if (mapSelecting || !id) return;
    if (S.list.every(function (v) { return v.id !== id; })) return;
    var wasActive = id === S.activeId;
    setActive(id, { scroll: true, pan: true, from: 'map' });
    if (S.detailId) openDetail(id);
    else if (wasActive) openDetail(id);
  }

  var padRaf = 0;
  function updatePadding(sync) {
    if (sync === true) { if (padRaf) { cancelAnimationFrame(padRaf); padRaf = 0; } computePadding(); return; }
    if (padRaf) return;
    padRaf = requestAnimationFrame(function () { padRaf = 0; computePadding(); });
  }
  function computePadding() {
    {
      var ar = app.getBoundingClientRect();
      var topB = mapTop.getBoundingClientRect().bottom - ar.top;
      var chipsEl = document.getElementById('chips');
      if (chipsEl) topB = chipsEl.getBoundingClientRect().bottom - ar.top;
      var botEl = mapBottom;
      var bTop = botEl.getBoundingClientRect().top - ar.top;
      var bottomH = Math.max(0, ar.height - bTop);
      mapScreen.style.setProperty('--bottom-h', Math.round(bottomH) + 'px');
      app.style.setProperty('--bottom-h', Math.round(bottomH) + 'px');
      app.classList.toggle('has-detail', !!S.detailId);
      var pad = { top: Math.round(topB + 8), bottom: Math.round(bottomH + 8), left: 16, right: 16 };
      if (isDesk()) {
        // keep the zoom / recenter column (and the side panel) out of the free area
        var ctrls = document.getElementById('map-ctrls');
        var gut = parseFloat(getComputedStyle(ctrls).right) || 24;
        if (S.detailId) gut = detailEl.offsetWidth + 24 + 12 + (parseFloat(getComputedStyle(app).getPropertyValue('--gutter')) || 24);
        pad.right = Math.round(gut + ctrls.offsetWidth + 12);
      }
      if (S.detailId && !isDesk()) pad.bottom = Math.round(detailEl.getBoundingClientRect().height + 12);
      mapCall('setPadding', pad);
    }
  }
  app.addEventListener('scroll', function () { if (app.scrollTop || app.scrollLeft) { app.scrollTop = 0; app.scrollLeft = 0; } });
  mapScreen.addEventListener('scroll', function () { if (mapScreen.scrollTop || mapScreen.scrollLeft) { mapScreen.scrollTop = 0; mapScreen.scrollLeft = 0; } });
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(updatePadding);
    ro.observe(mapTop); ro.observe(mapBottom);
  }
  window.addEventListener('resize', function () { updatePadding(); positionOpenPop(); });

  enterHooks.map = function (opts) {
    stopMock();
    ensureMap();
    if (!S.name) S.name = t('demo.name');
    document.getElementById('avatar-initial').textContent = S.name.charAt(0).toUpperCase();
    renderChips();
    applyFilters({ initial: true });
    updatePadding(true);
    setTimeout(function () {
      updatePadding(true);
      frameInitial();
      if (opts.reveal !== false) mapCall('reveal');
      if (S.activeId) setTimeout(function () { mapSelect(S.activeId, false); }, reduced() ? 0 : 700);
    }, opts.reveal ? 120 : 60);
  };

  /* first view: the user dot, the closest venues and the flagship, all clear of the bars */
  function frameInitial() {
    if (!S.list.length) { mapCall('recenter'); return; }
    var short = app.clientHeight < 520; // phone in landscape: little free map, keep the framing tight
    var ids = S.list.slice(0, short ? 3 : isDesk() ? 7 : 5).map(function (v) { return v.id; });
    if (!short) S.list.forEach(function (v) { if (v.flagship && ids.indexOf(v.id) < 0 && walkMin(v) <= 14) ids.push(v.id); });
    if (map && map.fitTo.length >= 2) mapCall('fitTo', ids, { include: [S.user] });
    else mapCall('fitTo', ids);
  }

  /* ------------------------------------------------------------------
     6. Map: filters
     ------------------------------------------------------------------ */
  function gamesActive() { return S.f.games.size > 0 && S.f.games.size < GAMES.length; }
  function setsEqual(a, b) { if (a.size !== b.size) return false; var ok = true; a.forEach(function (x) { if (!b.has(x)) ok = false; }); return ok; }
  function mineOn() { return S.favs.size > 0 && setsEqual(S.f.games, S.favs); }
  function anyFilter() { return S.f.tables > 0 || S.f.occ.size > 0 || gamesActive() || S.f.types.size > 0; }

  function passes(v, skip) {
    if (skip !== 'tables' && S.f.tables && v.tables < S.f.tables) return false;
    if (skip !== 'occ' && S.f.occ.size && !S.f.occ.has(occLevel(S.live[v.id]))) return false;
    if (skip !== 'games' && gamesActive() && !v.games.some(function (g) { return S.f.games.has(g); })) return false;
    if (skip !== 'types' && S.f.types.size && !S.f.types.has(v.type)) return false;
    return true;
  }
  function computeList() {
    var list = VENUES.filter(function (v) { return passes(v); });
    var key = S.sort;
    list.sort(function (a, b) {
      if (key === 'tables') return b.tables - a.tables || walkMin(a) - walkMin(b);
      if (key === 'occ') return S.live[a.id] - S.live[b.id];
      return walkMin(a) - walkMin(b) || b.tables - a.tables;
    });
    return list;
  }
  function resetFilters(fromFavs) {
    S.f.tables = 0;
    S.f.occ = new Set();
    S.f.types = new Set();
    S.f.games = fromFavs ? new Set(S.favs) : new Set();
    S.sort = 'distance';
  }

  function applyFilters(opts) {
    opts = opts || {};
    var prev = S.list.map(function (v) { return v.id; }).join(',');
    S.list = computeList();
    var ids = S.list.map(function (v) { return v.id; });
    var changed = prev !== ids.join(',');
    if (!S.activeId || ids.indexOf(S.activeId) < 0) S.activeId = ids[0] || null;
    if (changed || opts.initial || opts.force) renderCarousel(opts.initial || changed);
    paintResults();
    paintChips();
    mapCall('setVisible', ids);
    if (!opts.initial && changed && ids.length) {
      if (opts.fit !== false && anyFilter()) mapCall('fitTo', ids);
      setTimeout(function () { mapSelect(S.activeId, !anyFilter()); }, 40);
    }
    if (openPanelState) syncPanel();
  }

  /* results count, animated */
  var countRaf = 0;
  function paintResults() {
    var n = S.list.length;
    var numEl = document.getElementById('results-n');
    var from = S.lastCount, to = n;
    S.lastCount = n;
    cancelAnimationFrame(countRaf);
    if (reduced() || from === to) numEl.textContent = String(to);
    else {
      var t0 = performance.now();
      (function step(now) {
        var k = clamp((now - t0) / 420, 0, 1);
        var e = 1 - Math.pow(1 - k, 3);
        numEl.textContent = String(Math.round(from + (to - from) * e));
        if (k < 1) countRaf = requestAnimationFrame(step);
      })(t0);
    }
    document.getElementById('results-word').textContent = tp('results', n);
    document.getElementById('results-sort').textContent = n ? t('results.sortedBy.' + S.sort) : '';
    document.getElementById('results-sort').hidden = !n;
    document.getElementById('empty').hidden = n > 0;
    car.hidden = n === 0;
    paintArrows();
  }

  /* chips */
  var chipsEl = document.getElementById('chips');
  var CHIP_DEF = [
    { k: 'tables', ic: 'table', label: 'filter.tables' },
    { k: 'occ', ic: 'pulse', label: 'filter.occ' },
    { k: 'games', ic: 'die', label: 'filter.games' },
    { k: 'types', ic: 'store', label: 'filter.type' }
  ];
  function renderChips() {
    var html = CHIP_DEF.map(function (c) {
      return '<button class="chip" type="button" data-panel="' + c.k + '" aria-haspopup="dialog" aria-expanded="false"></button>';
    }).join('');
    html += '<span class="chips__sep" aria-hidden="true"></span>';
    html += '<button class="chip chip--sort" type="button" data-panel="sort" aria-haspopup="dialog" aria-expanded="false"></button>';
    html += '<button class="chip chip--reset" type="button" data-action="reset-filters" hidden></button>';
    chipsEl.innerHTML = html;
    paintChips();
  }
  function paintChips() {
    $$('.chip[data-panel]', chipsEl).forEach(function (b) {
      var k = b.getAttribute('data-panel');
      var on = false, label = '', extra = '', ic = 'sort';
      if (k === 'tables') {
        ic = 'table'; on = S.f.tables > 0;
        label = on ? t('filter.tables.chip', { n: S.f.tables }) : t('filter.tables');
      } else if (k === 'occ') {
        ic = 'pulse'; on = S.f.occ.size > 0;
        label = t('filter.occ');
        if (on) extra = '<span class="chip__dots" aria-hidden="true">' + OCC_LEVELS.filter(function (l) { return S.f.occ.has(l); }).map(function (l) { return '<i style="background:var(--occ-' + l + ')"></i>'; }).join('') + '</span>';
      } else if (k === 'games') {
        ic = 'die'; on = gamesActive();
        label = mineOn() ? t('filter.games.mine') : t('filter.games');
        if (on) extra = '<span class="chip__n">' + S.f.games.size + '</span>';
      } else if (k === 'types') {
        ic = 'store'; on = S.f.types.size > 0;
        label = t('filter.type');
        if (on) extra = '<span class="chip__n">' + S.f.types.size + '</span>';
      } else if (k === 'sort') {
        ic = 'sort';
        label = t('sort.short.' + S.sort);
      }
      b.classList.toggle('is-on', on);
      b.innerHTML = icon(ic) + '<span>' + esc(label) + '</span>' + extra + icon('caret', 'chip__caret');
      var title = k === 'sort' ? t('filter.sort.title') + ' : ' + t('sort.' + S.sort) : label;
      b.setAttribute('aria-label', title + (on && extra ? ', ' + (k === 'occ' ? S.f.occ.size : (k === 'games' ? S.f.games.size : S.f.types.size)) : ''));
    });
    var reset = $('.chip--reset', chipsEl);
    var wasShown = !reset.hidden;
    reset.hidden = !anyFilter();
    if (wasShown && reset.hidden && chipsEl.scrollLeft > 0) chipsEl.scrollTo({ left: 0, behavior: reduced() ? 'auto' : 'smooth' });
    reset.innerHTML = icon('reset') + '<span>' + esc(t('filter.reset')) + '</span>';
  }
  chipsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.chip[data-panel]');
    if (!b) return;
    var k = b.getAttribute('data-panel');
    if (openPanelState && openPanelState.kind === k) { closePanel(); return; }
    openPanel(k, b);
  });

  /* ------------------------------------------------------------------
     Panels: popover on desktop, bottom sheet on mobile
     ------------------------------------------------------------------ */
  var overlayRoot = document.getElementById('overlay-root');
  var openPanelState = null;

  function countWith(skip, test) {
    return VENUES.filter(function (v) { return passes(v, skip) && test(v); }).length;
  }

  function panelBody(kind) {
    var h = '';
    if (kind === 'tables') {
      h += '<div class="seg" role="radiogroup" aria-label="' + esc(t('filter.tables.title')) + '">';
      [0, 2, 6, 10, 20].forEach(function (n) {
        h += '<button type="button" role="radio" data-val="' + n + '" class="' + (n ? '' : 'seg__any') + '" aria-checked="' + (S.f.tables === n) + '">' + esc(n ? t('filter.tables.min', { n: n }) : t('filter.tables.any')) + '</button>';
      });
      h += '</div>';
    } else if (kind === 'occ') {
      h += '<div class="opt-list" role="group" aria-label="' + esc(t('filter.occ.title')) + '">';
      OCC_LEVELS.forEach(function (l) {
        h += '<button type="button" class="opt-row" role="checkbox" data-val="' + l + '" aria-checked="' + S.f.occ.has(l) + '" style="--oc:var(--occ-' + l + ')">' +
          '<span class="opt-row__dot"></span><span class="opt-row__t"><b>' + esc(t('occ.' + l)) + '</b><span>' + esc(t('occ.' + l + '.hint')) + '</span></span>' +
          '<span class="opt-row__n" data-count></span><span class="tick">' + icon('check') + '</span></button>';
      });
      h += '</div>';
    } else if (kind === 'games') {
      h += '<button type="button" class="switch-row" role="switch" data-mine aria-checked="' + mineOn() + '"' + (S.favs.size ? '' : ' disabled') + '>' +
        '<span class="opt-row__t"><b>' + esc(t('filter.games.mine')) + '</b><span>' + esc(t('filter.games.mine.hint', { n: S.favs.size })) + '</span></span><span class="switch"></span></button>';
      h += '<div class="opt-grid" role="group" aria-label="' + esc(t('filter.games.title')) + '">';
      GAMES.forEach(function (g) {
        h += '<button type="button" class="opt-game" role="checkbox" data-val="' + g.id + '" aria-checked="' + S.f.games.has(g.id) + '" style="--c:' + g.color + '">' +
          '<span class="opt-game__ic">' + g.emblem + '</span><b>' + esc(gName(g)) + '</b><span class="tick">' + icon('check') + '</span></button>';
      });
      h += '</div><p class="panel__hint" data-games-hint style="margin-top:12px"></p>';
    } else if (kind === 'types') {
      h += '<div class="opt-grid" role="group" aria-label="' + esc(t('filter.type.title')) + '">';
      TYPES.forEach(function (ty) {
        h += '<button type="button" class="opt-tile" role="checkbox" data-val="' + ty + '" aria-checked="' + S.f.types.has(ty) + '">' +
          icon(ty) + '<b>' + esc(t('type.' + ty)) + '</b><span data-count></span></button>';
      });
      h += '</div>';
    } else if (kind === 'sort') {
      h += '<div class="opt-list" role="radiogroup" aria-label="' + esc(t('filter.sort.title')) + '">';
      [['distance', 'walk'], ['tables', 'table'], ['occ', 'pulse']].forEach(function (s) {
        h += '<button type="button" class="opt-row" role="radio" data-val="' + s[0] + '" aria-checked="' + (S.sort === s[0]) + '">' +
          '<span class="opt-row__ic">' + icon(s[1]) + '</span><span class="opt-row__t"><b>' + esc(t('sort.' + s[0])) + '</b></span><span class="tick tick--radio">' + icon('check') + '</span></button>';
      });
      h += '</div>';
    }
    return h;
  }
  var PANEL_TITLE = { tables: 'filter.tables.title', occ: 'filter.occ.title', games: 'filter.games.title', types: 'filter.type.title', sort: 'filter.sort.title' };
  var PANEL_HINT = { tables: 'filter.tables.hint', occ: 'filter.occ.hint' };

  function buildPanel(kind, mode) {
    var p = document.createElement('div');
    p.className = 'panel panel--' + mode;
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-modal', mode === 'sheet' ? 'true' : 'false');
    p.setAttribute('aria-labelledby', 'panel-title');
    p.setAttribute('data-kind', kind);
    var hint = PANEL_HINT[kind] ? '<p class="panel__hint">' + esc(t(PANEL_HINT[kind])) + '</p>' : '';
    p.innerHTML =
      '<span class="panel__grab" aria-hidden="true"></span>' +
      '<div class="panel__head"><div><h3 class="panel__title" id="panel-title">' + esc(t(PANEL_TITLE[kind])) + '</h3>' + hint + '</div>' +
      '<button class="icon-btn panel__close" type="button" data-close-panel aria-label="' + esc(t('a11y.close')) + '">' + icon('close') + '</button></div>' +
      '<div class="panel__body">' + panelBody(kind) + '</div>' +
      (kind === 'sort' ? '' :
        '<div class="panel__foot"><button class="reset-btn" type="button" data-panel-reset>' + esc(t('filter.reset')) + '</button>' +
        '<button class="btn btn--primary" type="button" data-close-panel data-apply></button></div>');
    return p;
  }

  function openPanel(kind, anchor) {
    closePanel(true);
    closeSearch();
    var mode = isDesk() ? 'pop' : 'sheet';
    var scrim = document.createElement('div');
    scrim.className = 'scrim-o' + (mode === 'pop' ? ' scrim-o--clear' : '');
    scrim.addEventListener('click', function () { closePanel(); });
    var p = buildPanel(kind, mode);
    overlayRoot.appendChild(scrim);
    overlayRoot.appendChild(p);
    openPanelState = { kind: kind, el: p, scrim: scrim, anchor: anchor, mode: mode };
    if (anchor) anchor.setAttribute('aria-expanded', 'true');
    positionOpenPop();
    syncPanel();
    p.addEventListener('click', onPanelClick);
    var first = $('[aria-checked="true"]', p) || $('.panel__body button:not([disabled])', p);
    setTimeout(function () { if (first) first.focus({ preventScroll: true }); }, 30);
  }
  function positionOpenPop() {
    var st = openPanelState;
    if (!st || st.mode !== 'pop' || !st.anchor) return;
    var ar = app.getBoundingClientRect(), r = st.anchor.getBoundingClientRect();
    var w = st.el.offsetWidth || 360;
    var left = clamp(r.left - ar.left, 16, ar.width - w - 16);
    st.el.style.left = left + 'px';
    st.el.style.top = (r.bottom - ar.top + 10) + 'px';
    st.el.style.setProperty('--ox', (r.left - ar.left + r.width / 2 - left) + 'px');
  }
  function closePanel(instant) {
    var st = openPanelState;
    if (!st) return;
    openPanelState = null;
    if (st.anchor) st.anchor.setAttribute('aria-expanded', 'false');
    var done = function () { st.el.remove(); st.scrim.remove(); };
    if (instant || reduced()) done();
    else {
      st.el.classList.add('is-closing'); st.scrim.classList.add('is-closing');
      setTimeout(done, 240);
    }
    if (!instant && st.anchor && document.contains(st.anchor)) st.anchor.focus({ preventScroll: true });
  }
  function syncPanel() {
    var st = openPanelState;
    if (!st) return;
    var p = st.el, kind = st.kind;
    if (kind === 'tables') $$('[data-val]', p).forEach(function (b) { b.setAttribute('aria-checked', String(+b.getAttribute('data-val') === S.f.tables)); });
    if (kind === 'occ') $$('[data-val]', p).forEach(function (b) {
      var l = b.getAttribute('data-val');
      b.setAttribute('aria-checked', String(S.f.occ.has(l)));
      $('[data-count]', b).textContent = countWith('occ', function (v) { return occLevel(S.live[v.id]) === l; });
    });
    if (kind === 'games') {
      $$('[data-val]', p).forEach(function (b) { b.setAttribute('aria-checked', String(S.f.games.has(b.getAttribute('data-val')))); });
      var sw = $('[data-mine]', p);
      if (sw) sw.setAttribute('aria-checked', String(mineOn()));
      var hint = $('[data-games-hint]', p);
      if (hint) hint.textContent = gamesActive() ? '' : t('filter.games.anyHint');
    }
    if (kind === 'types') $$('[data-val]', p).forEach(function (b) {
      var ty = b.getAttribute('data-val');
      b.setAttribute('aria-checked', String(S.f.types.has(ty)));
      $('[data-count]', b).textContent = countWith('types', function (v) { return v.type === ty; });
    });
    if (kind === 'sort') $$('[data-val]', p).forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-val') === S.sort)); });
    var apply = $('[data-apply]', p);
    if (apply) {
      apply.textContent = tp('filter.apply', S.list.length);
    }
    var reset = $('[data-panel-reset]', p);
    if (reset) {
      var active = kind === 'tables' ? S.f.tables > 0 : kind === 'occ' ? S.f.occ.size > 0 : kind === 'games' ? !mineOn() || !S.favs.size : S.f.types.size > 0;
      if (kind === 'games') active = !(S.favs.size ? mineOn() : S.f.games.size === 0);
      reset.disabled = !active;
    }
  }
  function onPanelClick(e) {
    var st = openPanelState;
    if (!st) return;
    if (e.target.closest('[data-close-panel]')) { closePanel(); return; }
    if (e.target.closest('[data-panel-reset]')) {
      if (st.kind === 'tables') S.f.tables = 0;
      if (st.kind === 'occ') S.f.occ = new Set();
      if (st.kind === 'games') S.f.games = new Set(S.favs);
      if (st.kind === 'types') S.f.types = new Set();
      applyFilters();
      return;
    }
    var sw = e.target.closest('[data-mine]');
    if (sw) {
      S.f.games = mineOn() ? new Set() : new Set(S.favs);
      applyFilters();
      return;
    }
    var b = e.target.closest('[data-val]');
    if (!b) return;
    var val = b.getAttribute('data-val');
    if (st.kind === 'tables') S.f.tables = +val;
    if (st.kind === 'occ') { if (S.f.occ.has(val)) S.f.occ.delete(val); else S.f.occ.add(val); }
    if (st.kind === 'games') { if (S.f.games.has(val)) S.f.games.delete(val); else S.f.games.add(val); }
    if (st.kind === 'types') { if (S.f.types.has(val)) S.f.types.delete(val); else S.f.types.add(val); }
    if (st.kind === 'sort') {
      S.sort = val;
      applyFilters({ force: true, fit: false });
      scrollToActive(false);
      setTimeout(function () { closePanel(); }, reduced() ? 0 : 260);
      return;
    }
    applyFilters();
  }

  /* ------------------------------------------------------------------
     Carousel
     ------------------------------------------------------------------ */
  function gaugeHTML(v, extraCls) {
    var p = S.live[v.id], lvl = occLevel(p);
    return '<span class="gauge' + (extraCls || '') + '" data-gauge="' + v.id + '" data-lvl="' + lvl + '" role="img" aria-label="' + esc(t('filter.occ') + ' : ' + t('occ.' + lvl) + ', ' + pct(p)) + '">' +
      '<i class="gauge__live" aria-hidden="true"></i><span class="gauge__bar" aria-hidden="true"><i style="--p:' + (p / 100).toFixed(2) + '"></i></span>' +
      '<span class="gauge__pct" aria-hidden="true">' + pct(p) + '</span></span>';
  }
  function gamesChips(v, max) {
    var favs = v.games.filter(function (g) { return S.favs.has(g); });
    var rest = v.games.filter(function (g) { return !S.favs.has(g); });
    var ordered = favs.concat(rest);
    var shown = max ? ordered.slice(0, max) : ordered;
    var h = shown.map(function (id) {
      var g = GBY[id]; if (!g) return '';
      return '<span class="gchip' + (S.favs.has(id) ? ' is-fav' : '') + '" style="--c:' + g.color + '"><span class="gchip__ic">' + g.emblem + '</span>' + esc(gName(g)) + '</span>';
    }).join('');
    if (max && ordered.length > max) h += '<span class="gchip gchip--more">' + esc(t('card.morGames', { n: ordered.length - max })) + '</span>';
    return h;
  }
  function commonCount(v) { return v.games.filter(function (g) { return S.favs.has(g); }).length; }

  function cardEl(v, k, enter) {
    var el = document.createElement('article');
    el.className = 'vcard' + (v.id === S.activeId ? ' is-active' : '') + (enter && !reduced() ? ' is-enter' : '');
    el.setAttribute('role', 'listitem');
    el.setAttribute('data-id', v.id);
    el.style.setProperty('--k', Math.min(k, 8));
    el.style.setProperty('--tc', TYPE_COLOR[v.type]);
    var common = commonCount(v);
    var booked = S.bookings[v.id];
    el.innerHTML =
      '<button class="vcard__hit" type="button" aria-label="' + esc(t('card.open', { venue: v.name })) + '"></button>' +
      '<div class="vcard__media">' +
        '<div class="ph-fallback" aria-hidden="true">' + icon(v.type) + '</div>' +
        '<div class="ph-stack"></div>' +
        '<button class="ph-zone ph-zone--prev" type="button" tabindex="-1" aria-label="' + esc(t('detail.prevPhoto')) + '"></button>' +
        '<button class="ph-zone ph-zone--next" type="button" tabindex="-1" aria-label="' + esc(t('detail.nextPhoto')) + '"></button>' +
        '<div class="ph-dots" aria-hidden="true">' + v.photos.map(function (p, i) { return '<i' + (i === 0 ? ' class="is-cur"' : '') + '></i>'; }).join('') + '</div>' +
        (v.flagship ? '<span class="vcard__badge">' + STAR + esc(t('card.flagship')) + '</span>' : '') +
        (booked ? '<span class="vcard__booked">' + esc(t('card.booked')) + '</span>' : '') +
      '</div>' +
      '<div class="vcard__body">' +
        '<div class="vcard__top"><span class="vcard__type">' + esc(t('type.' + v.type)) + '</span>' +
          (common ? '<span class="vcard__common">' + STAR + esc(tp('card.common', common)) + '</span>' : '') + '</div>' +
        '<h3 class="vcard__name">' + esc(v.name) + '</h3>' +
        '<p class="vcard__meta">' + icon('walk') + '<b>' + esc(t('card.walk', { m: walkMin(v) })) + '</b><span>· ' + esc(v.address) + '</span></p>' +
        '<p class="vcard__phone">' + icon('phone') + '<span class="num">' + esc(v.phone) + '</span>' +
          '<button class="copy-btn" type="button" data-copy="' + esc(v.phone) + '" aria-label="' + esc(t('card.copy') + ' ' + v.phone) + '">' + icon('copy') + '</button></p>' +
        '<div class="vcard__stats"><span class="tables-pill">' + icon('table') + esc(tp('card.tables', v.tables)) + '</span>' + gaugeHTML(v) + '</div>' +
        '<div class="vcard__games" aria-label="' + esc(t('detail.games')) + '">' + gamesChips(v, 3) + '</div>' +
      '</div>';
    var stack = $('.ph-stack', el);
    v.photos.forEach(function (pid, i) {
      var im = img('img/venues/' + pid + '.webp', i === 0 ? 'is-cur' : '', '', i > 0 || k > 3);
      stack.appendChild(im);
    });
    el._ph = 0;
    return el;
  }
  function renderCarousel(enter) {
    var keep = car.scrollLeft;
    car.innerHTML = '';
    S.list.forEach(function (v, k) { car.appendChild(cardEl(v, k, enter)); });
    if (enter) scrollToActive(false);
    else car.scrollLeft = keep;
  }
  function cardById(id) { return car.querySelector('.vcard[data-id="' + id + '"]'); }
  /* desktop: the rail is aligned on the left gutter (active card = first visible card);
     mobile: the active card is centred with a peek on both sides */
  function carTarget(c) {
    if (isDesk()) return c.offsetLeft - (parseFloat(getComputedStyle(car).paddingLeft) || 0);
    return c.offsetLeft - (car.clientWidth - c.offsetWidth) / 2;
  }
  function nearestCard(pos) {
    var best = null, bd = 1e9;
    $$('.vcard', car).forEach(function (c) {
      var d = Math.abs(carTarget(c) - pos);
      if (d < bd) { bd = d; best = c; }
    });
    return best;
  }
  function scrollToActive(smooth) {
    var c = cardById(S.activeId);
    if (!c) return;
    var left = carTarget(c);
    if (smooth && !reduced()) car.scrollTo({ left: left, behavior: 'smooth' });
    else car.scrollLeft = left;
    programmaticUntil = performance.now() + (smooth ? 700 : 80);
  }
  var programmaticUntil = 0;
  function setActive(id, opts) {
    opts = opts || {};
    if (!id) return;
    var changed = id !== S.activeId;
    S.activeId = id;
    $$('.vcard', car).forEach(function (c) { c.classList.toggle('is-active', c.getAttribute('data-id') === id); });
    if (opts.scroll) scrollToActive(true);
    if (changed || opts.pan) mapSelect(id, opts.pan !== false);
    paintArrows();
  }
  function paintArrows() {
    var i = S.list.findIndex(function (v) { return v.id === S.activeId; });
    document.getElementById('car-prev').disabled = i <= 0;
    document.getElementById('car-next').disabled = i < 0 || i >= S.list.length - 1;
  }
  function stepActive(d) {
    var i = S.list.findIndex(function (v) { return v.id === S.activeId; });
    var n = S.list[clamp(i + d, 0, S.list.length - 1)];
    if (n) {
      setActive(n.id, { scroll: true, pan: true });
      if (S.detailId) openDetail(n.id);
    }
  }
  document.getElementById('car-prev').addEventListener('click', function () { stepActive(-1); });
  document.getElementById('car-next').addEventListener('click', function () { stepActive(1); });

  var settleT = 0;
  car.addEventListener('scroll', function () {
    clearTimeout(settleT);
    settleT = setTimeout(onCarSettle, 120);
  }, { passive: true });
  function onCarSettle() {
    if (drag && drag.moved) return;
    if (performance.now() < programmaticUntil) return;
    var best = nearestCard(car.scrollLeft);
    if (best && best.getAttribute('data-id') !== S.activeId) setActive(best.getAttribute('data-id'), { pan: true });
  }

  /* mouse drag on desktop */
  var drag = null, suppressClick = false;
  car.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    if (e.target.closest('.copy-btn, .vcard__phone .num')) return;
    drag = { x: e.clientX, sl: car.scrollLeft, moved: false, id: e.pointerId, vx: 0, lx: e.clientX, lt: performance.now() };
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 5) {
      drag.moved = true;
      car.classList.add('is-dragging');
    }
    if (drag.moved) {
      var now = performance.now();
      drag.vx = (e.clientX - drag.lx) / Math.max(1, now - drag.lt);
      drag.lx = e.clientX; drag.lt = now;
      car.scrollLeft = drag.sl - dx;
    }
  });
  window.addEventListener('pointerup', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var moved = drag.moved, vx = drag.vx;
    drag = null;
    if (!moved) return;
    suppressClick = true;
    setTimeout(function () { suppressClick = false; }, 60);
    car.classList.remove('is-dragging');
    var best = nearestCard(car.scrollLeft - vx * 180);
    if (best) setActive(best.getAttribute('data-id'), { scroll: true, pan: true });
  });
  car.addEventListener('click', function (e) {
    if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
    var c = e.target.closest('.vcard');
    if (!c) return;
    var id = c.getAttribute('data-id');
    var copy = e.target.closest('.copy-btn');
    if (copy) { copyText(copy.getAttribute('data-copy'), copy, t('card.copied'), $('.num', c)); return; }
    var zone = e.target.closest('.ph-zone');
    if (zone) {
      if (id !== S.activeId && !isDesk()) { setActive(id, { scroll: true, pan: true }); return; }
      cyclePhoto(c, zone.classList.contains('ph-zone--next') ? 1 : -1);
      return;
    }
    if (e.target.closest('.vcard__phone')) return;
    if (id !== S.activeId && !isDesk()) { setActive(id, { scroll: true, pan: true }); return; }
    setActive(id, { scroll: true, pan: true });
    openDetail(id);
  }, true);
  car.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      stepActive(e.key === 'ArrowRight' ? 1 : -1);
      var c = cardById(S.activeId);
      if (c) $('.vcard__hit', c).focus({ preventScroll: true });
    }
  });
  function cyclePhoto(c, d) {
    var imgs = $$('.ph-stack img', c), dots = $$('.ph-dots i', c);
    var n = dots.length;
    c._ph = ((c._ph || 0) + d + n) % n;
    imgs.forEach(function (im, i) { im.classList.toggle('is-cur', i === c._ph); });
    dots.forEach(function (dt, i) { dt.classList.toggle('is-cur', i === c._ph); });
  }

  /* live occupancy, small fluctuations within each venue's band */
  setInterval(function () {
    if (S.screen !== 'map' || document.hidden) return;
    VENUES.forEach(function (v) {
      if (Math.random() > 0.45) return;
      var band = LVL_BAND[occLevel(v.occupancy)];
      var lo = Math.max(band[0], v.occupancy - 7), hi = Math.min(band[1], v.occupancy + 7);
      var nv = clamp(S.live[v.id] + Math.round((Math.random() - 0.5) * 6), lo, hi);
      if (nv === S.live[v.id]) return;
      S.live[v.id] = nv;
      $$('[data-gauge="' + v.id + '"]').forEach(function (g) {
        var lvl = occLevel(nv);
        g.setAttribute('data-lvl', lvl);
        g.setAttribute('aria-label', t('filter.occ') + ' : ' + t('occ.' + lvl) + ', ' + pct(nv));
        var bar = $('.gauge__bar i', g); if (bar) bar.style.setProperty('--p', (nv / 100).toFixed(2));
        var pc = $('.gauge__pct', g); if (pc) pc.textContent = pct(nv);
      });
      $$('[data-live-pct="' + v.id + '"]').forEach(function (x) { x.textContent = pct(nv); });
    });
  }, 3200);

  /* ------------------------------------------------------------------
     Copy helper
     ------------------------------------------------------------------ */
  function selectText(el) {
    try {
      var r = document.createRange(); r.selectNodeContents(el);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    } catch (e) { /* noop */ }
  }
  function copyText(text, btn, okMsg, selEl) {
    var done = function () {
      toast(okMsg, 'check');
      if (btn) { btn.classList.add('is-copied'); setTimeout(function () { btn.classList.remove('is-copied'); }, 1600); }
    };
    var fail = function () {
      if (selEl) selectText(selEl);
      toast(t('card.copyFallback'), 'info');
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fail);
      } else fail();
    } catch (e) { fail(); }
  }

  /* ------------------------------------------------------------------
     Detail sheet / panel
     ------------------------------------------------------------------ */
  var detailEl = document.getElementById('detail');
  var detailScroll = document.getElementById('detail-scroll');
  var detailFoot = document.getElementById('detail-foot');
  var detailScrim = document.getElementById('detail-scrim');
  var sheetState = 'half';
  var lastFocus = null;

  function routeUrl(v) {
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(v.name + ', ' + v.address + ', ' + v.postcode + ' ' + v.city);
  }
  function renderDetail(v) {
    var common = commonCount(v);
    var html =
      '<div class="gal" style="--tc:' + TYPE_COLOR[v.type] + '">' +
        '<div class="gal__track" tabindex="0" aria-label="' + esc(t('card.photo', { i: 1, total: v.photos.length })) + '">' +
          v.photos.map(function (p) { return '<div class="gal__slide"><div class="ph-fallback" aria-hidden="true">' + icon(v.type) + '</div></div>'; }).join('') +
        '</div>' +
        '<button class="icon-btn icon-btn--float gal__nav gal__nav--prev" type="button" data-gal="-1" aria-label="' + esc(t('detail.prevPhoto')) + '">' + icon('left') + '</button>' +
        '<button class="icon-btn icon-btn--float gal__nav gal__nav--next" type="button" data-gal="1" aria-label="' + esc(t('detail.nextPhoto')) + '">' + icon('right') + '</button>' +
        '<div class="ph-dots" aria-hidden="true">' + v.photos.map(function (p, i) { return '<i' + (i === 0 ? ' class="is-cur"' : '') + '></i>'; }).join('') + '</div>' +
        '<div class="gal__badges"><span class="pill-dark">' + esc(t('type.' + v.type)) + '</span>' + (v.flagship ? '<span class="vcard__badge">' + STAR + esc(t('card.flagship')) + '</span>' : '') + '</div>' +
      '</div>' +
      '<div class="dhead"><h2 class="dhead__name" id="detail-name">' + esc(v.name) + '</h2>' +
        '<p class="dhead__addr">' + esc(v.address + ', ' + v.postcode + ' ' + v.city) + '</p></div>' +
      '<div class="dstats">' +
        '<div class="dstat"><span class="dstat__k">' + esc(t('detail.tables')) + '</span><span class="dstat__v">' + v.tables + '</span></div>' +
        '<div class="dstat"><span class="dstat__k">' + esc(t('detail.occ')) + '</span><span class="dstat__v" data-live-pct="' + v.id + '">' + pct(S.live[v.id]) + '</span>' + gaugeHTML(v) + '</div>' +
        '<div class="dstat"><span class="dstat__k">' + esc(t('detail.walk')) + '</span><span class="dstat__v">' + walkMin(v) + '<small>min</small></span></div>' +
      '</div>' +
      '<p class="dblurb">' + esc(L(v.blurb)) + '</p>' +
      '<h3 class="dh"><span class="mark">' + esc(t('detail.june')) + '</span></h3>' +
      '<div class="june"><div class="june__date" aria-hidden="true"><b>11</b><span>' + esc(t('detail.month')) + '</span></div><p>' + esc(L(v.june11)) + '</p></div>' +
      '<h3 class="dh">' + esc(t('detail.practical')) + '</h3>' +
      '<div class="prac">' +
        '<div class="prac__row"><span class="prac__ic">' + icon('pin') + '</span><span class="prac__t"><span>' + esc(t('detail.address')) + '</span><b>' + esc(v.address) + '</b></span>' +
          '<a class="btn btn--ghost" href="' + esc(routeUrl(v)) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(t('detail.route.label', { venue: v.name })) + '">' + icon('route') + '<span>' + esc(t('detail.route')) + '</span></a></div>' +
        '<div class="prac__row"><span class="prac__ic">' + icon('phone') + '</span><span class="prac__t"><span>' + esc(t('detail.phone')) + '</span><b class="num" id="detail-phone">' + esc(v.phone) + '</b></span>' +
          '<button class="btn btn--ghost" type="button" data-copy-phone>' + icon('copy') + '<span>' + esc(t('card.copyShort')) + '</span></button></div>' +
        '<div class="prac__row"><span class="prac__ic">' + icon('clock') + '</span><span class="prac__t"><span>' + esc(t('detail.hours')) + '</span><b>' + esc(L(v.hours)) + '</b></span></div>' +
      '</div>' +
      '<h3 class="dh">' + esc(t('detail.games')) + '</h3>' +
      '<div class="dgames">' + gamesChips(v, 0) + '</div>' +
      (common ? '<p class="dlegend"><i></i>' + esc(t('detail.yours')) + '</p>' : '') +
      '<div class="dspacer"></div>';
    detailScroll.innerHTML = html;
    var slides = $$('.gal__slide', detailScroll);
    v.photos.forEach(function (pid, i) { slides[i].appendChild(img('img/venues/' + pid + '.webp', '', '')); });
    bindGallery(v);
    paintDetailFoot(v);
  }
  function paintDetailFoot(v) {
    var b = S.bookings[v.id];
    if (b) {
      detailFoot.innerHTML = '<button class="btn btn--booked btn--block" type="button" data-show-ticket>' + icon('check') + '<span>' + esc(t('detail.joined', { time: hourLabel(b.h) })) + '</span></button>';
    } else {
      detailFoot.innerHTML = '<button class="btn btn--primary btn--block" type="button" data-join>' + icon('ticket') + '<span>' + esc(t('detail.join')) + '</span></button>';
    }
  }
  function bindGallery(v) {
    var track = $('.gal__track', detailScroll);
    var dots = $$('.gal .ph-dots i', detailScroll);
    var prev = $('.gal__nav--prev', detailScroll), next = $('.gal__nav--next', detailScroll);
    function cur() { return Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); }
    function paint() {
      var i = cur();
      dots.forEach(function (d, k) { d.classList.toggle('is-cur', k === i); });
      prev.disabled = i <= 0; next.disabled = i >= v.photos.length - 1;
      track.setAttribute('aria-label', t('card.photo', { i: i + 1, total: v.photos.length }));
    }
    track.addEventListener('scroll', function () { requestAnimationFrame(paint); }, { passive: true });
    [prev, next].forEach(function (b) {
      b.addEventListener('click', function () {
        var i = clamp(cur() + parseInt(b.getAttribute('data-gal'), 10), 0, v.photos.length - 1);
        track.scrollTo({ left: i * track.clientWidth, behavior: reduced() ? 'auto' : 'smooth' });
      });
    });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        var i = clamp(cur() + (e.key === 'ArrowRight' ? 1 : -1), 0, v.photos.length - 1);
        track.scrollTo({ left: i * track.clientWidth, behavior: reduced() ? 'auto' : 'smooth' });
      }
    });
    paint();
  }

  function sheetHeight(state) {
    var h = app.clientHeight;
    if (state === 'full') return h - 10 - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0);
    return Math.round(h * 0.64);
  }
  function setSheet(state) {
    sheetState = state;
    if (isDesk()) { detailEl.style.removeProperty('--sheet-h'); return; }
    detailEl.style.setProperty('--sheet-h', sheetHeight(state) + 'px');
    updatePadding();
  }

  function openDetail(id) {
    var v = VBY[id];
    if (!v) return;
    var wasOpen = !!S.detailId;
    if (!wasOpen) lastFocus = document.activeElement;
    S.detailId = id;
    renderDetail(v);
    detailScroll.scrollTop = 0;
    document.getElementById('detail-bar-name').textContent = v.name;
    detailEl.classList.remove('is-scrolled');
    if (!wasOpen) setSheet(app.clientHeight < 520 ? 'full' : 'half');
    detailEl.classList.add('is-open');
    detailEl.setAttribute('aria-hidden', 'false');
    detailEl.setAttribute('role', 'dialog');
    mapScreen.classList.add('has-detail');
    detailScrim.classList.toggle('is-on', !isDesk());
    if (id !== S.activeId) setActive(id, { scroll: true, pan: false });
    updatePadding();
    setTimeout(function () { mapSelect(id, true); }, wasOpen ? 0 : 120);
    if (!wasOpen) setTimeout(function () { var c = $('.detail__close', detailEl); if (c) c.focus({ preventScroll: true }); }, 80);
  }
  function closeDetail() {
    if (!S.detailId) return;
    S.detailId = null;
    detailEl.classList.remove('is-open');
    detailEl.setAttribute('aria-hidden', 'true');
    mapScreen.classList.remove('has-detail');
    detailScrim.classList.remove('is-on');
    updatePadding();
    setTimeout(function () { if (S.activeId) mapSelect(S.activeId, true); }, 80);
    var c = cardById(S.activeId);
    var target = c ? $('.vcard__hit', c) : lastFocus;
    if (target && document.contains(target)) target.focus({ preventScroll: true });
  }
  detailFoot.addEventListener('click', function (e) {
    if (e.target.closest('[data-join]')) openJoin(S.detailId);
    if (e.target.closest('[data-show-ticket]')) showDone(S.detailId, true);
  });
  detailScroll.addEventListener('click', function (e) {
    var cp = e.target.closest('[data-copy-phone]');
    if (cp) {
      var v = VBY[S.detailId];
      copyText(v.phone, cp, t('card.copied'), document.getElementById('detail-phone'));
    }
  });
  detailScroll.addEventListener('scroll', function () {
    var gal = $('.gal', detailScroll);
    detailEl.classList.toggle('is-scrolled', detailScroll.scrollTop > (gal ? gal.offsetHeight - 60 : 120));
    if (!isDesk() && sheetState === 'half' && detailScroll.scrollTop > 30) setSheet('full');
  }, { passive: true });

  /* sheet drag */
  (function sheetDrag() {
    var grab = document.getElementById('detail-grab');
    var st = null;
    grab.addEventListener('pointerdown', function (e) {
      if (isDesk()) return;
      st = { y: e.clientY, h: detailEl.getBoundingClientRect().height, t: performance.now(), vy: 0, ly: e.clientY, moved: false };
      detailEl.classList.add('is-dragging');
      try { grab.setPointerCapture(e.pointerId); } catch (er) { /* noop */ }
    });
    grab.addEventListener('pointermove', function (e) {
      if (!st) return;
      var dy = e.clientY - st.y;
      if (Math.abs(dy) > 3) st.moved = true;
      var now = performance.now();
      st.vy = (e.clientY - st.ly) / Math.max(1, now - st.t);
      st.ly = e.clientY; st.t = now;
      var h = clamp(st.h - dy, 120, sheetHeight('full') + 20);
      detailEl.style.setProperty('--sheet-h', h + 'px');
    });
    function end() {
      if (!st) return;
      detailEl.classList.remove('is-dragging');
      var h = detailEl.getBoundingClientRect().height, vy = st.vy, moved = st.moved;
      st = null;
      if (!moved) { setSheet(sheetState === 'full' ? 'half' : 'full'); return; }
      var half = sheetHeight('half'), full = sheetHeight('full');
      if (vy > 0.9 || h < half * 0.62) { closeDetail(); return; }
      if (vy < -0.6) { setSheet('full'); return; }
      setSheet(Math.abs(h - full) < Math.abs(h - half) ? 'full' : 'half');
    }
    grab.addEventListener('pointerup', end);
    grab.addEventListener('pointercancel', end);
    document.getElementById('detail-handle').addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') { e.preventDefault(); setSheet('full'); }
      if (e.key === 'ArrowDown') { e.preventDefault(); if (sheetState === 'full') setSheet('half'); else closeDetail(); }
    });
  })();
  deskMQ.addEventListener && deskMQ.addEventListener('change', function () {
    closePanel(true);
    if (S.detailId) { setSheet(sheetState); detailScrim.classList.toggle('is-on', !isDesk()); }
    updatePadding();
    if (S.screen === 'map') setTimeout(function () { scrollToActive(false); }, 30);
  });

  /* ------------------------------------------------------------------
     Join a table: slot picker, confirmation, ticket
     ------------------------------------------------------------------ */
  var modal = null;
  function closeHour(v) {
    var s = (v.hours && v.hours.fr) || '';
    if (/minuit/.test(s)) return 24;
    var m = s.match(/(\d{1,2}) h(?: (\d{2}))?(?!.*\d{1,2} h)/);
    if (!m) return 23;
    var h = parseInt(m[1], 10) + (m[2] ? parseInt(m[2], 10) / 60 : 0);
    return h < 7 ? h + 24 : h;
  }
  function slotsFor(v) {
    var close = closeHour(v), seed = hash(v.id);
    return [12, 14, 16, 18, 20, 22].filter(function (h) { return h <= close - 1.5; }).slice(-6).map(function (h, i) {
      var seats = (seed >>> (i * 3)) % 7;
      if (v.occupancy > 80 && i === 2) seats = 0;
      if (seats === 0 && i === 0) seats = 3;
      return { h: h, seats: seats };
    });
  }
  function openModal(kind) {
    closeModal(true);
    var mode = isDesk() ? 'center' : 'sheet';
    var scrim = document.createElement('div');
    scrim.className = 'scrim-o';
    scrim.addEventListener('click', function () { closeModal(); });
    var p = document.createElement('div');
    p.className = 'panel panel--' + mode;
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-modal', 'true');
    p.setAttribute('aria-labelledby', 'modal-title');
    p.setAttribute('data-kind', kind);
    overlayRoot.appendChild(scrim);
    overlayRoot.appendChild(p);
    modal = { el: p, scrim: scrim, kind: kind };
    return p;
  }
  function closeModal(instant) {
    if (!modal) return;
    var m = modal; modal = null;
    var done = function () { m.el.remove(); m.scrim.remove(); };
    if (instant || reduced()) done();
    else { m.el.classList.add('is-closing'); m.scrim.classList.add('is-closing'); setTimeout(done, 240); }
    if (!instant && S.detailId) { var f = $('button', detailFoot); if (f) f.focus({ preventScroll: true }); }
  }
  function openJoin(id) {
    var v = VBY[id]; if (!v) return;
    var slots = slotsFor(v), pick = null;
    var p = openModal('join');
    function paint() {
      p.innerHTML =
        '<span class="panel__grab" aria-hidden="true"></span>' +
        '<div class="panel__head"><div><h3 class="panel__title" id="modal-title">' + esc(t('join.title')) + '</h3><p class="panel__hint">' + esc(t('join.lead', { venue: v.name })) + '</p></div>' +
        '<button class="icon-btn panel__close" type="button" data-x aria-label="' + esc(t('a11y.close')) + '">' + icon('close') + '</button></div>' +
        '<div class="panel__body"><div class="slots" role="radiogroup" aria-label="' + esc(t('join.title')) + '">' +
          slots.map(function (s, i) {
            var lvl = s.seats === 0 ? 'full' : (s.seats <= 2 ? 'lively' : 'calm');
            return '<button type="button" class="slot" role="radio" data-i="' + i + '" aria-checked="' + (pick === i) + '"' + (s.seats ? '' : ' disabled') + ' style="--oc:var(--occ-' + lvl + ')">' +
              '<b>' + esc(hourLabel(s.h)) + '</b><span><i></i>' + esc(tp('join.seats', s.seats)) + '</span></button>';
          }).join('') +
        '</div><p class="join-note">' + icon('info') + '<span>' + esc(t('join.note')) + '</span></p></div>' +
        '<div class="panel__foot"><button class="btn btn--primary btn--block" type="button" data-confirm' + (pick == null ? ' disabled' : '') + '>' + esc(pick == null ? t('join.confirm.pick') : t('join.confirm')) + '</button></div>';
    }
    paint();
    p.addEventListener('click', function (e) {
      if (e.target.closest('[data-x]')) { closeModal(); return; }
      var s = e.target.closest('.slot');
      if (s && !s.disabled) {
        pick = +s.getAttribute('data-i');
        $$('.slot', p).forEach(function (b) { b.setAttribute('aria-checked', String(+b.getAttribute('data-i') === pick)); });
        var c = $('[data-confirm]', p); c.disabled = false; c.textContent = t('join.confirm');
        return;
      }
      var conf = e.target.closest('[data-confirm]');
      if (conf && pick != null) {
        conf.classList.add('is-loading');
        setTimeout(function () {
          var code = 'BGF-' + makeCode(v.id);
          S.bookings[v.id] = { h: slots[pick].h, code: code };
          showDone(v.id, false);
          paintDetailFoot(v);
          var card = cardById(v.id);
          if (card) {
            var media = $('.vcard__media', card);
            if (!$('.vcard__booked', media)) media.insertAdjacentHTML('beforeend', '<span class="vcard__booked">' + esc(t('card.booked')) + '</span>');
          }
        }, reduced() ? 50 : 850);
      }
    });
    p._repaint = paint;
    setTimeout(function () { var f = $('.slot:not([disabled])', p); if (f) f.focus({ preventScroll: true }); }, 40);
  }
  function makeCode(seed) {
    var A = 'ACDEFGHJKLMNPQRTUVWXY3479', s = '';
    var h = hash(seed + ':' + Date.now());
    for (var i = 0; i < 4; i++) { s += A.charAt(h % A.length); h = Math.floor(h / A.length) + 7919 * (i + 1); }
    return s;
  }
  function showDone(id, again) {
    var v = VBY[id], b = S.bookings[id];
    if (!v || !b) return;
    var p = modal && modal.kind === 'join' ? modal.el : openModal('done');
    if (modal) modal.kind = 'done';
    var wolf = GBY['loups-garous'] ? GBY['loups-garous'].emblem : '';
    p.innerHTML =
      '<span class="panel__grab" aria-hidden="true"></span>' +
      '<button class="icon-btn panel__close" type="button" data-x aria-label="' + esc(t('a11y.close')) + '" style="position:absolute;top:14px;right:14px;z-index:6">' + icon('close') + '</button>' +
      '<div class="panel__body" style="padding:0 20px 8px;position:relative">' +
        '<div class="done">' +
          '<div class="done__check"><svg viewBox="0 0 24 24">' + IC.check + '</svg></div>' +
          '<h3 class="done__title" id="modal-title">' + esc(t('done.title')) + '</h3>' +
          '<p class="done__text">' + esc(t('done.text', { venue: v.name })) + '</p>' +
          '<div class="ticket"><div class="ticket__main"><span class="ticket__k">' + esc(t('done.code')) + '</span><span class="ticket__code" id="ticket-code">' + esc(b.code) + '</span>' +
            '<span class="ticket__when">' + esc(t('done.when', { time: hourLabel(b.h) })) + ' · ' + esc(v.name) + '</span></div>' +
            '<div class="ticket__side"><button type="button" data-copy-code aria-label="' + esc(t('done.copy')) + '">' + icon('copy') + '</button></div></div>' +
          '<div class="gift"><div class="gift__card" aria-hidden="true">' + wolf + '</div><div><b>' + esc(t('done.gift.title')) + '</b><p>' + esc(t('done.gift')) + '</p></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="panel__foot"><button class="btn btn--primary btn--block" type="button" data-x>' + esc(t('done.ok')) + '</button></div>';
    if (!again && !reduced()) confetti(p);
    if (!p._doneBound) {
      p._doneBound = true;
      p.addEventListener('click', function (e) {
        if (modal && modal.kind !== 'done') return;
        if (e.target.closest('[data-x]')) { closeModal(); return; }
        var cc = e.target.closest('[data-copy-code]');
        if (cc) copyText($('#ticket-code', p).textContent, cc, t('done.copied'), $('#ticket-code', p));
      });
    }
    setTimeout(function () { var f = $('.panel__foot .btn', p); if (f) f.focus({ preventScroll: true }); }, 60);
  }
  function confetti(host) {
    var box = document.createElement('div');
    box.className = 'confetti';
    var cols = ['#FFBC03', '#FF4D8D', '#01B0FF', '#8B4DFF', '#1F1F1F'];
    var html = '';
    for (var i = 0; i < 46; i++) {
      html += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;background:' + cols[i % cols.length] +
        ';--dx:' + Math.round((Math.random() - 0.5) * 160) + 'px;--rot:' + Math.round(Math.random() * 720 - 360) + 'deg;animation-delay:' + (Math.random() * 0.35).toFixed(2) + 's;animation-duration:' + (1.2 + Math.random() * 0.9).toFixed(2) + 's"></i>';
    }
    box.innerHTML = html;
    host.appendChild(box);
    setTimeout(function () { box.remove(); }, 2600);
  }

  /* ------------------------------------------------------------------
     Avatar menu
     ------------------------------------------------------------------ */
  var avatarBtn = document.getElementById('avatar-btn');
  var menuState = null;
  function openMenu() {
    closePanel(true); closeSearch();
    var ar = app.getBoundingClientRect(), r = avatarBtn.getBoundingClientRect();
    var scrim = document.createElement('div');
    scrim.className = 'scrim-o scrim-o--clear';
    scrim.addEventListener('click', closeMenu);
    var p = document.createElement('div');
    p.className = 'panel panel--pop menu';
    p.setAttribute('role', 'menu');
    p.setAttribute('aria-label', t('map.avatar'));
    var bk = Object.keys(S.bookings);
    p.innerHTML =
      '<div class="menu__hello"><i aria-hidden="true">' + esc(S.name.charAt(0).toUpperCase()) + '</i><div><b>' + esc(t('menu.hello', { name: S.name })) + '</b><span>' + esc(t(S.areaKey || 'area.75011')) + '</span></div></div>' +
      '<div class="menu__list">' +
        '<button class="menu__item" type="button" role="menuitem" data-m="games">' + icon('heart') + esc(t('menu.games')) + '</button>' +
        '<button class="menu__item" type="button" role="menuitem" data-m="bookings">' + icon('ticket') + esc(t('menu.bookings')) + '</button>' +
        '<div class="menu__bookings">' + (bk.length ? bk.map(function (id) {
          return '<span><b>' + esc(VBY[id].name) + '</b> · ' + esc(hourLabel(S.bookings[id].h)) + '</span>';
        }).join('') : '<span>' + esc(t('menu.bookings.none')) + '</span>') + '</div>' +
        '<button class="menu__item menu__item--danger" type="button" role="menuitem" data-m="restart">' + icon('restart') + esc(t('menu.restart')) + '</button>' +
      '</div>' +
      '<p class="menu__foot">' + esc(t('menu.shortcuts')) + '</p>';
    overlayRoot.appendChild(scrim);
    overlayRoot.appendChild(p);
    var w = p.offsetWidth;
    p.style.left = clamp(r.right - ar.left - w, 16, ar.width - w - 16) + 'px';
    p.style.top = (r.bottom - ar.top + 10) + 'px';
    p.style.setProperty('--ox', (w - r.width / 2) + 'px');
    menuState = { el: p, scrim: scrim };
    avatarBtn.setAttribute('aria-expanded', 'true');
    p.addEventListener('click', function (e) {
      var it = e.target.closest('[data-m]');
      if (!it) return;
      var m = it.getAttribute('data-m');
      closeMenu(true);
      if (m === 'games') openPanel('games', $('.chip[data-panel="games"]', chipsEl));
      if (m === 'bookings') {
        var ids = Object.keys(S.bookings);
        if (ids.length) openDetail(ids[ids.length - 1]);
        else toast(t('menu.bookings.none'), 'info');
      }
      if (m === 'restart') restart();
    });
    setTimeout(function () { $('.menu__item', p).focus({ preventScroll: true }); }, 30);
  }
  function closeMenu(instant) {
    if (!menuState) return;
    var m = menuState; menuState = null;
    avatarBtn.setAttribute('aria-expanded', 'false');
    var done = function () { m.el.remove(); m.scrim.remove(); };
    if (instant === true || reduced()) done();
    else { m.el.classList.add('is-closing'); setTimeout(done, 200); m.scrim.remove(); }
    if (instant !== true) avatarBtn.focus({ preventScroll: true });
  }
  avatarBtn.addEventListener('click', function () { if (menuState) closeMenu(); else openMenu(); });

  /* ------------------------------------------------------------------
     Search
     ------------------------------------------------------------------ */
  var sInput = document.getElementById('search-input');
  var sList = document.getElementById('search-list');
  var sClear = document.getElementById('search-clear');
  var sOpts = [], sIdx = -1;

  function hl(text, q) {
    if (!q) return esc(text);
    var n = norm(text), i = n.indexOf(q);
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }
  function searchResults(q) {
    var out = { venues: [], games: [], areas: [] };
    if (!q) {
      out.venues = computeList().slice(0, 3);
      return out;
    }
    out.venues = VENUES.filter(function (v) {
      return norm(v.name).indexOf(q) >= 0 || norm(v.address).indexOf(q) >= 0 || norm(t('type.' + v.type)).indexOf(q) >= 0;
    }).slice(0, 5);
    out.games = GAMES.filter(function (g) {
      return norm(L(g.name)).indexOf(q) >= 0 || norm(L(g.short || g.name)).indexOf(q) >= 0 || norm(g.name.en).indexOf(q) >= 0 || norm(g.name.fr).indexOf(q) >= 0;
    }).slice(0, 4);
    out.areas = DEMO_AREAS.filter(function (pc) {
      return VENUES.some(function (v) { return v.postcode === pc; }) && (pc.indexOf(q) >= 0 || norm(t('area.' + pc)).indexOf(q) >= 0);
    });
    return out;
  }
  function renderSearch() {
    var raw = sInput.value.trim(), q = norm(raw);
    sClear.hidden = !raw;
    var r = searchResults(q);
    var h = '', i = 0;
    sOpts = [];
    function group(label, items, fn) {
      if (!items.length) return;
      h += '<div class="search__group" role="presentation">' + esc(label) + '</div>';
      items.forEach(function (it) {
        var o = fn(it);
        sOpts.push(o.act);
        h += '<div class="search__opt" role="option" id="sopt-' + i + '" data-i="' + i + '" aria-selected="false"' + (o.c ? ' style="--c:' + o.c + '"' : '') + '>' +
          '<span class="search__opt-ic">' + o.ic + '</span><span class="search__opt-t"><b>' + o.t + '</b><span>' + o.s + '</span></span></div>';
        i++;
      });
    }
    group(t('map.search.venues'), r.venues, function (v) {
      return { ic: icon(v.type), c: TYPE_COLOR[v.type], t: hl(v.name, q), s: esc(t('type.' + v.type) + ' · ' + v.address), act: { kind: 'venue', id: v.id } };
    });
    group(t('map.search.games'), r.games, function (g) {
      var n = VENUES.filter(function (v) { return v.games.indexOf(g.id) >= 0; }).length;
      return { ic: g.emblem, c: g.color, t: hl(gName(g, true), q), s: esc(tp('search.venues', n)), act: { kind: 'game', id: g.id } };
    });
    group(t('map.search.areas'), r.areas, function (pc) {
      var n = VENUES.filter(function (v) { return v.postcode === pc; }).length;
      return { ic: icon('pin'), t: hl(t('area.' + pc), q), s: esc(tp('search.venues', n)), act: { kind: 'area', id: pc } };
    });
    if (!sOpts.length) h = '<p class="search__empty">' + esc(t('map.search.empty')) + '</p>';
    sList.innerHTML = h;
    sList.hidden = false;
    sInput.setAttribute('aria-expanded', 'true');
    sIdx = -1;
    sInput.removeAttribute('aria-activedescendant');
  }
  function closeSearch() {
    sList.hidden = true;
    sInput.setAttribute('aria-expanded', 'false');
    sInput.removeAttribute('aria-activedescendant');
  }
  function moveSearch(d) {
    if (!sOpts.length) return;
    sIdx = (sIdx + d + sOpts.length) % sOpts.length;
    $$('.search__opt', sList).forEach(function (o, k) { o.setAttribute('aria-selected', String(k === sIdx)); });
    var cur = document.getElementById('sopt-' + sIdx);
    if (cur) { sInput.setAttribute('aria-activedescendant', cur.id); cur.scrollIntoView({ block: 'nearest' }); }
  }
  function runSearch(i) {
    var a = sOpts[i];
    if (!a) return;
    closeSearch();
    sInput.blur();
    if (a.kind === 'venue') {
      sInput.value = VBY[a.id].name;
      sClear.hidden = false;
      if (S.list.every(function (v) { return v.id !== a.id; })) { resetFilters(false); applyFilters({ force: true }); }
      setActive(a.id, { scroll: true, pan: true });
      openDetail(a.id);
    } else if (a.kind === 'game') {
      sInput.value = gName(GBY[a.id], true);
      sClear.hidden = false;
      S.f.games = new Set([a.id]);
      applyFilters();
      toast(t('toast.game', { game: gName(GBY[a.id], true) }), 'check');
    } else if (a.kind === 'area') {
      sInput.value = t('area.' + a.id);
      sClear.hidden = false;
      var ids = VENUES.filter(function (v) { return v.postcode === a.id; }).map(function (v) { return v.id; });
      mapCall('fitTo', ids);
      var first = S.list.filter(function (v) { return v.postcode === a.id; })[0];
      if (first) setActive(first.id, { scroll: true, pan: false });
      toast(t('map.search.center', { area: t('area.short.' + a.id) }), 'pin');
    }
  }
  sInput.addEventListener('focus', renderSearch);
  sInput.addEventListener('input', renderSearch);
  sInput.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (sList.hidden) renderSearch(); moveSearch(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSearch(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); runSearch(sIdx >= 0 ? sIdx : 0); }
    else if (e.key === 'Escape') { e.stopPropagation(); closeSearch(); }
  });
  sList.addEventListener('mousedown', function (e) { e.preventDefault(); });
  sList.addEventListener('click', function (e) {
    var o = e.target.closest('.search__opt');
    if (o) runSearch(+o.getAttribute('data-i'));
  });
  sClear.addEventListener('click', function () {
    sInput.value = '';
    sClear.hidden = true;
    sInput.focus();
  });
  document.addEventListener('pointerdown', function (e) {
    if (!sList.hidden && !e.target.closest('#search')) closeSearch();
  });

  /* ------------------------------------------------------------------
     Global actions and shortcuts
     ------------------------------------------------------------------ */
  function closeAllOverlays() {
    closePanel(true);
    closeModal(true);
    closeMenu(true);
    closeSearch();
    closeAuth(true);
    if (S.detailId) {
      S.detailId = null;
      detailEl.classList.remove('is-open');
      detailEl.setAttribute('aria-hidden', 'true');
      mapScreen.classList.remove('has-detail');
      detailScrim.classList.remove('is-on');
    }
  }

  function skipToMap() {
    if (S.screen === 'map') return;
    if (!S.name) S.name = t('demo.name');
    if (!S.locValid) {
      S.postcode = '75011'; S.areaKey = 'area.75011'; S.user = AREA_POS['75011'];
    }
    if (!S.favs.size) {
      S.favs = new Set(DEFAULT_FAVS);
      $$('.tile', tilesEl).forEach(function (b) { b.setAttribute('aria-pressed', String(S.favs.has(b.getAttribute('data-game')))); });
      paintGamesCount(false);
    }
    resetFilters(true);
    ensureMap();
    go('map', { reveal: true });
  }

  function restart() {
    closeAllOverlays();
    loaderTimers.forEach(clearTimeout); loaderTimers = [];
    S.name = ''; S.authMode = 'signup'; S.postcode = ''; S.areaKey = ''; S.locValid = false;
    S.user = AREA_POS['75011'];
    S.favs = new Set(); resetFilters(false);
    S.activeId = null; S.bookings = {}; S.list = []; S.lastCount = 0;
    VENUES.forEach(function (v) { S.live[v.id] = v.occupancy; });
    form.reset(); touched = {};
    ['firstname', 'email', 'password'].forEach(function (n) { paintField(n, false); });
    fPw.type = 'password';
    paintMeter(); paintAuthMode();
    codeInput.value = ''; paintSlots(); codeBox.classList.remove('is-valid', 'is-invalid'); setLocStatus(null);
    locSubmit.disabled = true;
    btnLocate.classList.remove('is-found', 'is-searching');
    $('.btn--locate__label', btnLocate).setAttribute('data-i18n', 'loc.use');
    $('.btn--locate__label', btnLocate).textContent = t('loc.use');
    $$('.tile', tilesEl).forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    paintGamesCount(false);
    sInput.value = ''; sClear.hidden = true;
    go('landing', { back: true });
  }

  document.addEventListener('click', function (e) {
    var langBtn = e.target.closest('[data-set-lang]');
    if (langBtn) { setLang(langBtn.getAttribute('data-set-lang'), true); return; }
    var a = e.target.closest('[data-action]');
    if (!a) return;
    var act = a.getAttribute('data-action');
    if (act === 'signup') go('account', { mode: 'signup' });
    else if (act === 'login') go('account', { mode: 'login' });
    else if (act === 'skip') skipToMap();
    else if (act === 'auth') openAuth(a.getAttribute('data-provider'));
    else if (act === 'auth-cancel') closeAuth();
    else if (act === 'back') {
      var order = ['landing', 'account', 'location', 'games'];
      var i = order.indexOf(S.screen);
      go(order[Math.max(0, i - 1)], { back: true });
    }
    else if (act === 'home') go('landing', { back: true });
    else if (act === 'close-detail') closeDetail();
    else if (act === 'reset-filters') { resetFilters(false); applyFilters({ force: true }); toast(t('toast.reset'), 'check'); }
  });
  $$('[data-map]').forEach(function (b) {
    b.addEventListener('click', function () {
      var fn = b.getAttribute('data-map');
      if (fn === 'recenter') { mapCall('setUser', S.user); mapCall('recenter'); }
      else mapCall(fn);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (modal) { closeModal(); return; }
      if (menuState) { closeMenu(); return; }
      if (openPanelState) { closePanel(); return; }
      if (!authSheet.hidden) { closeAuth(); return; }
      if (S.detailId) { closeDetail(); return; }
      return;
    }
    var tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'm' || e.key === 'M') { skipToMap(); }
    else if ((e.key === 'r' || e.key === 'R') && S.screen !== 'landing') { restart(); }
  });

  /* ------------------------------------------------------------------
     Language-dependent repaint for the map UI
     ------------------------------------------------------------------ */
  onLang(function () {
    mapCall('setLang', S.lang);
    renderOnbTops();
    renderLangToggles();
    renderMockCards();
    if (S.screen === 'map' || S.list.length) {
      paintChips();
      paintResults();
      var keep = car.scrollLeft;
      renderCarousel(false);
      car.scrollLeft = keep;
      if (S.detailId) {
        var st = detailScroll.scrollTop;
        renderDetail(VBY[S.detailId]);
        detailScroll.scrollTop = st;
      }
      if (openPanelState) {
        var k = openPanelState.kind, anchor = openPanelState.anchor;
        closePanel(true);
        openPanel(k, anchor);
      }
      if (modal && modal.kind === 'done' && S.detailId) showDone(S.detailId, true);
      else if (modal && modal.kind === 'join' && modal.el._repaint) modal.el._repaint();
      if (menuState) { closeMenu(true); openMenu(); }
      if (!sList.hidden) renderSearch();
    }
    var eye = document.getElementById('pw-eye');
    eye.setAttribute('aria-label', t(fPw.type === 'text' ? 'pw.hide' : 'pw.show'));
    paintMeter();
    ['firstname', 'email', 'password'].forEach(function (n) { paintField(n, false); });
  });

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  function boot() {
    var saved = store('bgf-lang');
    if (saved && I18N[saved]) S.lang = saved;
    else if ((navigator.language || '').slice(0, 2) === 'en') S.lang = 'en';
    document.documentElement.lang = S.lang;
    document.title = t('doc.title');

    renderOnbTops();
    renderLangToggles();
    applyI18n(document);
    paintAuthMode();
    buildMockMap();
    renderMockCards();
    buildLoaderArt();
    renderTiles();
    paintSlots();
    $$('[data-obj]').forEach(loadObj);
    $$('.screen').forEach(function (sc) {
      $$('[data-stagger]', sc).forEach(function (el, i) { el.style.setProperty('--i', i); });
      if (!sc.classList.contains('is-active')) sc.setAttribute('aria-hidden', 'true');
    });
    codeBox.addEventListener('click', function () { codeInput.focus(); });

    var first = screenEl('landing');
    first.classList.add('is-active');
    first.removeAttribute('aria-hidden');
    S.screen = 'landing';
    startMock();
  }
  boot();
})();
