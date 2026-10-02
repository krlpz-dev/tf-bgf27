/* BGF 2027 Table Finder · BGFMap, a self-contained map engine for the demo zone (Paris est).
 * Canvas vector rendering of window.BGF_MAPDATA + HTML pins. No tiles, no network, no dependency.
 *
 * const map = BGFMap.create(containerEl, {
 *   venues,                 // defaults to window.BGF_VENUES
 *   center:{lat,lng},       // initial center (default: demo zone center)
 *   zoom,                   // optional initial zoom (default 15 on phones, 15.5 on desktop)
 *   lang:'fr'|'en',         // aria strings
 *   onSelect:(id)=>{},      // user clicked/tapped a pin (not called for programmatic select)
 *   onMove:(view)=>{},      // every rendered frame where the view changed, view = {center:{lat,lng}, zoom, byUser}
 *   onMoveEnd:(view)=>{},   // optional, when a gesture or animation settles
 *   onMapClick:()=>{},      // optional, tap on the map background (no drag)
 *   autoReveal:false        // pins stay hidden until map.reveal() unless true
 * });
 * map.select(id, {pan:true}) · map.select(null) · map.setVisible(ids|null) · map.setPadding({top,bottom,left,right})
 * map.setUser({lat,lng}) · map.reveal() · map.fitTo(ids) · map.zoomIn() · map.zoomOut() · map.recenter() · map.destroy()
 * extras: map.setLang(lang) · map.getView() · map.resize()
 */
(function () {
  'use strict';

  var TILE = 256, U = TILE * 65536; // path units = world * 256 * 2^16 (zoom 16 pixels)
  var EARTH = 40075016.686;

  function mx(lng) { return (lng + 180) / 360; }
  function my(lat) { var s = Math.sin(lat * Math.PI / 180); return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); }
  function ilng(x) { return x * 360 - 180; }
  function ilat(y) { var n = Math.PI - 2 * Math.PI * y; return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function now() { return performance.now(); }

  var COLORS = {
    bg: '#ECE8E1', land: '#F8F6F2', block: '#ECE7DF', landuse: '#E6E1D9', rail: '#E4E0D8', track: '#D2CBC0',
    park: '#D3EAC6', parkEdge: '#BFDDB0', cemetery: '#DCE6D1', square: '#D3EAC6', promenade: '#D9EDCD',
    plaza: '#FBFAF7', plazaEdge: '#E7E2D9', water: '#BEEAFD', waterEdge: '#8FD8F8',
    road: '#FFFFFF', caseMinor: '#E2DDD4', caseMid: '#D8D0C3', caseMajor: '#C9BEAC', major: '#FFFDF7',
    tStreet: '#7A7366', tDistrict: '#A0978A', tWater: '#1E98D0', tPark: '#4D7F40', tPoi: '#8A8276'
  };

  var ICONS = {
    cafe: '<path d="M5 9.5h11v4.5a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 14V9.5z"/><path d="M16 11h1.2a2.4 2.4 0 0 1 0 4.8H16"/><path d="M8.5 3.5c-.8.9.8 1.6 0 2.6M12 3.5c-.8.9.8 1.6 0 2.6"/>',
    bar: '<path d="M6.5 4h11l-1.3 5.6a4.3 4.3 0 0 1-8.4 0L6.5 4z"/><path d="M12 14v5.5M8.5 20h7"/>',
    shop: '<rect x="4.5" y="4.5" width="15" height="15" rx="3.2"/><circle cx="9" cy="9" r="1.15" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.15" fill="currentColor" stroke="none"/>',
    restaurant: '<path d="M7 3.5v5a2 2 0 0 0 4 0v-5M9 3.5V20.5"/><path d="M17 20.5V3.5c-2 1.4-3 4.2-3 7.8h3"/>',
    bookshop: '<path d="M12 6.5C10.3 5.2 8 4.6 4.5 4.8v12.6c3.5-.2 5.8.4 7.5 1.7 1.7-1.3 4-1.9 7.5-1.7V4.8C16 4.6 13.7 5.2 12 6.5z"/><path d="M12 6.5v12.6"/>',
    culture: '<path d="M12 3.8l2.5 5.1 5.6.8-4 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-4 5.6-.8z"/>'
  };
  var STAR_FILL = '<path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z" fill="currentColor" stroke="none"/>';
  function svg(inner) { return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + inner + '</svg>'; }

  var STR = {
    fr: { map: 'Carte des lieux du Board Game Fest', tables: 'tables', table: 'table', cluster: 'lieux, zoomer', you: 'Ta position', flagship: 'QG du Board Game Fest', tag: 'QG' },
    en: { map: 'Map of Board Game Fest venues', tables: 'tables', table: 'table', cluster: 'venues, zoom in', you: 'Your location', flagship: 'Board Game Fest HQ', tag: 'HQ' }
  };

  var CSS = [
    '.bgfm{position:relative;overflow:hidden;overflow:clip;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;background:' + COLORS.bg + ';outline:none;cursor:grab;contain:strict}',
    '.bgfm.is-dragging{cursor:grabbing}',
    '.bgfm:focus-visible{box-shadow:inset 0 0 0 3px var(--bgf-cyan,#01B0FF)}',
    '.bgfm-canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block}',
    '.bgfm-layer{position:absolute;left:0;top:0;width:0;height:0}',
    '.bgfm-pos{position:absolute;left:0;top:0;will-change:transform}',
    '.bgfm-pin{position:absolute;left:0;bottom:0;transform:translate(-50%,0);margin:0;padding:0 0 9px;border:0;background:none;cursor:pointer;font:inherit;color:inherit;-webkit-appearance:none;appearance:none;outline:none}',
    '.bgfm-pin-in{position:relative;display:block;transform-origin:50% 100%;transition:transform .32s cubic-bezier(.34,1.56,.64,1),opacity .22s ease}',
    '.bgfm-body{position:relative;display:flex;align-items:center;gap:3px;height:30px;padding:0 10px 0 6px;border-radius:15px;background:var(--bgf-ink,#1F1F1F);color:var(--bgf-white,#fff);font:700 13px/1 var(--font-body,"Inter"),system-ui,sans-serif;letter-spacing:-.01em;white-space:nowrap;box-shadow:0 0 0 2px var(--bgf-white,#fff),0 3px 8px rgba(31,31,31,.28);transition:background-color .2s ease,color .2s ease,box-shadow .2s ease}',
    '.bgfm-body svg{display:block;flex:none}',
    '.bgfm-tip{position:absolute;left:50%;bottom:-5px;width:10px;height:10px;margin-left:-5px;background:var(--bgf-ink,#1F1F1F);transform:rotate(45deg);border-radius:0 0 2px 0;box-shadow:2px 2px 0 0 var(--bgf-white,#fff);transition:background-color .2s ease}',
    '.bgfm-occ{position:absolute;right:-3px;top:-3px;width:9px;height:9px;border-radius:50%;box-shadow:0 0 0 2px var(--bgf-white,#fff)}',
    '.bgfm-occ.o-calm{background:var(--bgf-cyan,#01B0FF)}.bgfm-occ.o-busy{background:var(--bgf-yellow,#FFBC03)}.bgfm-occ.o-full{background:var(--bgf-pink,#FF4D8D)}',
    '.bgfm-label{position:absolute;left:50%;top:100%;margin-top:12px;transform:translateX(-50%);font:600 12px/1.15 var(--font-body,"Inter"),system-ui,sans-serif;color:var(--bgf-ink,#1F1F1F);white-space:nowrap;text-shadow:0 0 2px #fff,0 0 3px #fff,0 0 4px #fff,0 0 6px #fff;opacity:0;transition:opacity .2s ease;pointer-events:none}',
    '.bgfm.z-hi .bgfm-label{opacity:1}',
    '.bgfm-pin:hover .bgfm-pin-in{transform:translateY(-2px) scale(1.07)}',
    '.bgfm-pin:hover .bgfm-body{box-shadow:0 0 0 2px var(--bgf-white,#fff),0 6px 14px rgba(31,31,31,.32)}',
    '.bgfm-pin:focus-visible .bgfm-body{box-shadow:0 0 0 2px var(--bgf-white,#fff),0 0 0 5px var(--bgf-cyan,#01B0FF)}',
    /* flagship */
    '.bgfm-pin.is-flag .bgfm-body{height:38px;padding:0 13px 0 8px;border-radius:19px;font-size:15px;gap:5px;box-shadow:0 0 0 2px var(--bgf-yellow,#FFBC03),0 0 0 4px var(--bgf-ink,#1F1F1F),0 4px 12px rgba(31,31,31,.35)}',
    '.bgfm-pin.is-flag .bgfm-body svg{width:22px;height:22px;color:var(--bgf-yellow,#FFBC03)}',
    '.bgfm-pin.is-flag .bgfm-tag{font:400 11px/1 var(--font-display,"Rowdies"),var(--font-body,"Inter"),sans-serif;letter-spacing:.02em;color:var(--bgf-yellow,#FFBC03);margin-left:2px;padding-left:6px;border-left:1px solid rgba(255,255,255,.25)}',
    '.bgfm-pin.is-flag .bgfm-tip{bottom:-6px;width:12px;height:12px;margin-left:-6px;box-shadow:2px 2px 0 0 var(--bgf-yellow,#FFBC03),4px 4px 0 0 var(--bgf-ink,#1F1F1F)}',
    '.bgfm-pin.is-flag .bgfm-pin-in::before{content:"";position:absolute;left:50%;top:19px;width:38px;height:38px;margin:-19px 0 0 -19px;border-radius:50%;background:var(--bgf-yellow,#FFBC03);opacity:0;animation:bgfm-ring 2.4s ease-out infinite;pointer-events:none}',
    /* selected */
    '.bgfm-pin.is-sel .bgfm-pin-in{transform:scale(1.2)}',
    '.bgfm-pin.is-sel:hover .bgfm-pin-in{transform:translateY(-2px) scale(1.22)}',
    '.bgfm-pin.is-sel .bgfm-body{background:var(--bgf-yellow,#FFBC03);color:var(--bgf-ink,#1F1F1F);box-shadow:0 0 0 2px var(--bgf-ink,#1F1F1F),3px 3px 0 2px var(--bgf-ink,#1F1F1F)}',
    '.bgfm-pin.is-sel .bgfm-tip{background:var(--bgf-yellow,#FFBC03);box-shadow:2px 2px 0 0 var(--bgf-ink,#1F1F1F),4px 4px 0 1px var(--bgf-ink,#1F1F1F)}',
    '.bgfm-pin.is-sel .bgfm-occ{box-shadow:0 0 0 2px var(--bgf-ink,#1F1F1F)}',
    '.bgfm-pin.is-sel.is-flag .bgfm-body svg,.bgfm-pin.is-sel.is-flag .bgfm-tag{color:var(--bgf-ink,#1F1F1F)}',
    '.bgfm-pin.is-sel.is-flag .bgfm-tag{border-left-color:rgba(31,31,31,.3)}',
    '.bgfm-pin.is-sel .bgfm-label{opacity:1;font-weight:700}',
    /* hidden / clustered / pre-reveal */
    '.bgfm-pin.is-off .bgfm-pin-in{transform:scale(.35);opacity:0}',
    '.bgfm-pin.is-off{pointer-events:none}',
    '.bgfm-pin.is-gone{visibility:hidden}',
    '.bgfm-pin.is-pre .bgfm-pin-in{transform:translateY(-34px) scale(.6);opacity:0;transition:none}',
    '.bgfm-pin.is-drop .bgfm-pin-in{animation:bgfm-drop .62s cubic-bezier(.2,.8,.3,1) both}',
    '.bgfm-pin.is-pop .bgfm-pin-in{animation:bgfm-pop .38s cubic-bezier(.34,1.56,.64,1) both}',
    /* clusters */
    '.bgfm-cluster{position:absolute;left:0;top:0;width:42px;height:42px;margin:-21px 0 0 -21px;padding:0;border:0;border-radius:50%;background:var(--bgf-ink,#1F1F1F);color:var(--bgf-white,#fff);font:400 16px/42px var(--font-display,"Rowdies"),var(--font-body,"Inter"),sans-serif;text-align:center;cursor:pointer;box-shadow:0 0 0 2px var(--bgf-white,#fff),5px -4px 0 -1px var(--bgf-yellow,#FFBC03),5px -4px 0 1px var(--bgf-ink,#1F1F1F),0 4px 10px rgba(31,31,31,.3);transition:transform .3s cubic-bezier(.34,1.56,.64,1),opacity .2s ease;outline:none;-webkit-appearance:none;appearance:none}',
    '.bgfm-cluster:hover{transform:scale(1.08)}',
    '.bgfm-cluster:focus-visible{box-shadow:0 0 0 2px #fff,0 0 0 5px var(--bgf-cyan,#01B0FF)}',
    '.bgfm-cluster.is-off{transform:scale(.3);opacity:0;pointer-events:none}',
    /* user */
    '.bgfm-user{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none}',
    '.bgfm-user i{position:absolute;left:-9px;top:-9px;width:18px;height:18px;border-radius:50%;background:var(--bgf-cyan,#01B0FF);box-shadow:0 0 0 3px #fff,0 2px 8px rgba(0,60,90,.35)}',
    '.bgfm-user b{position:absolute;left:-40px;top:-40px;width:80px;height:80px;border-radius:50%;background:var(--bgf-cyan,#01B0FF);opacity:.18;animation:bgfm-pulse 2.2s ease-out infinite}',
    '.bgfm-user em{position:absolute;left:-22px;top:-22px;width:44px;height:44px;border-radius:50%;background:var(--bgf-cyan,#01B0FF);opacity:.16}',
    '@keyframes bgfm-pulse{0%{transform:scale(.25);opacity:.45}80%{opacity:0}100%{transform:scale(1);opacity:0}}',
    '@keyframes bgfm-ring{0%{transform:scale(.8);opacity:.55}100%{transform:scale(2.1);opacity:0}}',
    '@keyframes bgfm-drop{0%{transform:translateY(-46px) scale(.55);opacity:0}45%{opacity:1}62%{transform:translateY(3px) scale(1.06,.92)}80%{transform:translateY(-3px) scale(.98,1.03)}100%{transform:none;opacity:1}}',
    '@keyframes bgfm-pop{0%{transform:scale(.35);opacity:0}100%{transform:none;opacity:1}}',
    '@media (prefers-reduced-motion:reduce){.bgfm-pin-in,.bgfm-body,.bgfm-tip,.bgfm-cluster,.bgfm-label{transition:none!important}.bgfm-pin.is-drop .bgfm-pin-in,.bgfm-pin.is-pop .bgfm-pin-in{animation:none!important;opacity:1}.bgfm-user b,.bgfm-pin.is-flag .bgfm-pin-in::before{animation:none!important;opacity:0}}'
  ].join('\n');

  function injectCSS() {
    if (document.getElementById('bgfm-style')) return;
    var st = document.createElement('style');
    st.id = 'bgfm-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ---------------------------------------------------------------- geometry, built once */
  var GEO = null;
  function buildGeometry(D) {
    if (GEO && GEO.src === D) return GEO;
    var b = D.bbox;
    var ox = mx((b[0] + b[2]) / 2), oy = my((b[1] + b[3]) / 2);
    function addLine(path, f) {
      path.moveTo((mx(f[0]) - ox) * U, (my(f[1]) - oy) * U);
      for (var i = 2; i < f.length; i += 2) path.lineTo((mx(f[i]) - ox) * U, (my(f[i + 1]) - oy) * U);
    }
    function addRings(path, rings) {
      for (var r = 0; r < rings.length; r++) { addLine(path, rings[r]); path.closePath(); }
    }
    function polys(list, pick) {
      var p = new Path2D();
      for (var i = 0; i < list.length; i++) addRings(p, pick ? pick(list[i]) : list[i]);
      return p;
    }
    var g = { src: D, ox: ox, oy: oy };
    var e = D.extent || b;
    g.land = new Path2D();
    g.land.rect((mx(e[0]) - ox) * U, (my(e[3]) - oy) * U, (mx(e[2]) - mx(e[0])) * U, (my(e[1]) - my(e[3])) * U);
    g.blocks = polys(D.blocks || []);
    g.landuse = polys(D.landuse || [], function (o) { return o.r; });
    g.rail = polys(D.rail || []);
    g.tracks = new Path2D(); (D.tracks || []).forEach(function (l) { addLine(g.tracks, l); });
    g.water = polys(D.water || []);
    g.plazas = polys(D.plazas || [], function (o) { return o.r; });
    var parks = D.parks || [];
    g.green = polys(parks.filter(function (p) { return p.k === 'park' || p.k === 'square'; }), function (o) { return o.r; });
    g.cemetery = polys(parks.filter(function (p) { return p.k === 'cemetery'; }), function (o) { return o.r; });
    g.promenade = polys(parks.filter(function (p) { return p.k === 'promenade'; }), function (o) { return o.r; });
    var R = D.roads || {};
    g.minor = new Path2D(); (R.minor || []).forEach(function (l) { addLine(g.minor, l); });
    g.mid = new Path2D(); (R.mid || []).forEach(function (o) { addLine(g.mid, o.c); });
    g.major = new Path2D(); (R.major || []).forEach(function (o) { addLine(g.major, o.c); });
    g.foot = new Path2D(); (D.foot || []).forEach(function (l) { addLine(g.foot, l); });
    g.named = [];
    ['major', 'mid'].forEach(function (k) {
      (R[k] || []).forEach(function (o) {
        var pts = [];
        for (var i = 0; i < o.c.length; i += 2) pts.push([mx(o.c[i]), my(o.c[i + 1])]);
        g.named.push({ t: o.n, k: k, pts: pts, w: 0, font: '' });
      });
    });
    g.labels = (D.labels || []).filter(function (l) { return l.k !== 'major' && l.k !== 'mid'; }).map(function (l) {
      return { t: l.t, k: l.k, x: mx(l.p[0]), y: my(l.p[1]), a: (l.a || 0) * Math.PI / 180, w: 0, font: '' };
    });
    g.bx0 = mx(b[0]); g.bx1 = mx(b[2]); g.by0 = my(b[3]); g.by1 = my(b[1]);
    g.widths = D.widths || { major: 22, mid: 13, minor: 9 };
    g.coslat = Math.cos(((b[1] + b[3]) / 2) * Math.PI / 180);
    GEO = g;
    return g;
  }

  var LABEL_STYLE = {
    water: { font: 'italic 600 12px', color: COLORS.tWater, min: 14.2, max: 99, pri: 0 },
    park: { font: '600 12px', color: COLORS.tPark, min: 14.4, max: 99, pri: 1 },
    district: { font: '700 10.5px', color: COLORS.tDistrict, min: 0, max: 16.3, pri: 2, spacing: 1.6, upper: true },
    major: { font: '500 11.5px', color: COLORS.tStreet, min: 15.2, max: 99, pri: 3 },
    poi: { font: '600 11px', color: COLORS.tPoi, min: 15.0, max: 99, pri: 4 },
    mid: { font: '500 11px', color: COLORS.tStreet, min: 16.3, max: 99, pri: 5 },
    square: { font: '600 10.5px', color: COLORS.tPark, min: 16.5, max: 99, pri: 6 }
  };

  /* ---------------------------------------------------------------- instance */
  function create(container, opts) {
    opts = opts || {};
    injectCSS();
    var D = window.BGF_MAPDATA;
    if (!D) throw new Error('BGFMap: window.BGF_MAPDATA is missing (load data/mapdata.js first)');
    var G = buildGeometry(D);
    var venues = (opts.venues || window.BGF_VENUES || []).slice();
    var lang = opts.lang === 'en' ? 'en' : 'fr';
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var dprMax = 2;

    var root = document.createElement('div');
    root.className = 'bgfm';
    root.tabIndex = 0;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-roledescription', 'map');
    root.setAttribute('aria-label', STR[lang].map);
    root.style.position = 'absolute'; root.style.inset = '0';
    var cs = window.getComputedStyle(container);
    if (cs.position === 'static') container.style.position = 'relative';
    var canvas = document.createElement('canvas');
    canvas.className = 'bgfm-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    var layer = document.createElement('div'); layer.className = 'bgfm-layer';
    root.appendChild(canvas); root.appendChild(layer);
    container.appendChild(root);
    var ctx = canvas.getContext('2d');

    var W = 1, H = 1, dpr = 1;
    var cx, cy, z;
    var pad = { top: 0, bottom: 0, left: 0, right: 0 };
    var minZ = 13.5, maxZ = 18;
    var selected = null, visibleSet = null, revealed = !!opts.autoReveal;
    var user = null, userEl = null;
    var raf = 0, destroyed = false;
    var anim = null, inertia = null, wheel = null;
    var moved = false, byUser = false, wasMoving = false;
    var lastClusterZ = -1, clusterDirty = true;
    var initial = null, sized = false;

    /* ---- pins */
    var pins = venues.map(function (v, i) {
      var pos = document.createElement('div'); pos.className = 'bgfm-pos';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bgfm-pin' + (v.flagship ? ' is-flag' : '') + (revealed ? '' : ' is-pre is-off');
      btn.setAttribute('data-id', v.id);
      var occ = v.occupancy < 40 ? 'o-calm' : v.occupancy < 80 ? 'o-busy' : 'o-full';
      var icon = v.flagship ? svg(STAR_FILL) : svg(ICONS[v.type] || ICONS.culture);
      btn.innerHTML = '<span class="bgfm-pin-in"><span class="bgfm-body">' + icon + '<span class="bgfm-n">' + v.tables + '</span>' +
        (v.flagship ? '<span class="bgfm-tag">' + STR[lang].tag + '</span>' : '') +
        '<span class="bgfm-occ ' + occ + '"></span></span><span class="bgfm-tip"></span><span class="bgfm-label"></span></span>';
      btn.querySelector('.bgfm-label').textContent = v.name;
      pos.appendChild(btn);
      layer.appendChild(pos);
      var p = { v: v, id: v.id, i: i, x: mx(v.lng), y: my(v.lat), pos: pos, btn: btn, vis: true, clustered: false, off: !revealed, sx: 0, sy: 0 };
      btn.addEventListener('click', function (e) {
        if (suppressClick) { e.preventDefault(); return; }
        e.stopPropagation();
        selectInternal(v.id, { pan: true }, true);
      });
      return p;
    });
    var byId = {}; pins.forEach(function (p) { byId[p.id] = p; });
    function ariaPins() {
      pins.forEach(function (p) {
        var s = STR[lang], v = p.v;
        p.btn.setAttribute('aria-label', v.name + (v.flagship ? ', ' + s.flagship : '') + ', ' + v.tables + ' ' + (v.tables > 1 ? s.tables : s.table));
        var tg = p.btn.querySelector('.bgfm-tag'); if (tg) tg.textContent = s.tag;
      });
    }
    ariaPins();

    var clusters = []; // pool of {el, members, x, y}
    function clusterEl() {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'bgfm-cluster is-off';
      var c = { el: b, members: [], x: 0, y: 0, on: false };
      b.addEventListener('click', function (e) {
        if (suppressClick) return;
        e.stopPropagation();
        fitIds(c.members.map(function (p) { return p.id; }), true);
      });
      layer.appendChild(b);
      return c;
    }

    /* ---- view math */
    function S(zz) { return TILE * Math.pow(2, zz === undefined ? z : zz); }
    function ppm(zz) { return S(zz) / (EARTH * G.coslat); }
    function padOffset(zz) { // world offset of the padded content center relative to the screen center
      var s = S(zz);
      return { x: (pad.left - pad.right) / 2 / s, y: (pad.top - pad.bottom) / 2 / s };
    }
    function bounds(zz) {
      var s = S(zz), hw = W / 2 / s, hh = H / 2 / s;
      var x0 = G.bx0 + hw - pad.left / s, x1 = G.bx1 - hw + pad.right / s;
      var y0 = G.by0 + hh - pad.top / s, y1 = G.by1 - hh + pad.bottom / s;
      if (x0 > x1) { x0 = x1 = (x0 + x1) / 2; }
      if (y0 > y1) { y0 = y1 = (y0 + y1) / 2; }
      return { x0: x0, x1: x1, y0: y0, y1: y1, dimx: W / s, dimy: H / s };
    }
    function clampView(x, y, zz) {
      var b = bounds(zz);
      return { x: clamp(x, b.x0, b.x1), y: clamp(y, b.y0, b.y1) };
    }
    function rb(d, dim) { return (1 - 1 / (d * 0.55 / dim + 1)) * dim; }
    function rubber(x, y, zz) {
      var b = bounds(zz);
      var rx = x < b.x0 ? b.x0 - rb(b.x0 - x, b.dimx) : x > b.x1 ? b.x1 + rb(x - b.x1, b.dimx) : x;
      var ry = y < b.y0 ? b.y0 - rb(b.y0 - y, b.dimy) : y > b.y1 ? b.y1 + rb(y - b.y1, b.dimy) : y;
      return { x: rx, y: ry };
    }
    function outOfBounds() { var c = clampView(cx, cy, z); return Math.abs(c.x - cx) * S() > 0.5 || Math.abs(c.y - cy) * S() > 0.5; }
    function computeMinZoom() {
      var cw = Math.max(80, W - pad.left - pad.right), ch = Math.max(80, H - pad.top - pad.bottom);
      var fit = Math.min(cw / (G.bx1 - G.bx0), ch / (G.by1 - G.by0)) / TILE;
      minZ = Math.min(Math.log(fit) / Math.LN2 - (W < 700 ? 0.08 : 0.2), 16.5);
      maxZ = 17.9;
    }
    function toScreen(x, y) { var s = S(); return { x: (x - cx) * s + W / 2, y: (y - cy) * s + H / 2 }; }
    function toWorld(px, py) { var s = S(); return { x: cx + (px - W / 2) / s, y: cy + (py - H / 2) / s }; }

    /* ---- sizing */
    function resize() {
      var r = root.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(dprMax, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      computeMinZoom();
      if (!sized && W > 40 && H > 40) {
        // created while hidden: pick the default zoom now that the real size is known
        sized = true;
        if (opts.zoom == null) { z = W < 700 ? 15.0 : 15.5; initial.z = z; }
        var c1 = clampView(mx(initial.lng), my(initial.lat), clamp(z, minZ, maxZ)); cx = c1.x; cy = c1.y;
      }
      if (z !== undefined) {
        z = clamp(z, minZ, maxZ);
        var c = clampView(cx, cy, z); cx = c.x; cy = c.y;
      }
      clusterDirty = true;
      requestRender();
    }

    /* ---- init view */
    var c0 = opts.center || { lat: (D.bbox[1] + D.bbox[3]) / 2, lng: (D.bbox[0] + D.bbox[2]) / 2 };
    (function initView() {
      var r = container.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      computeMinZoom();
      z = clamp(opts.zoom != null ? opts.zoom : (W < 700 ? 15.0 : 15.5), minZ, maxZ);
      var c = clampView(mx(c0.lng), my(c0.lat), z); cx = c.x; cy = c.y;
      initial = { lat: c0.lat, lng: c0.lng, z: z };
      sized = W > 40 && H > 40;
    })();

    /* ---- render */
    function requestRender() { if (!raf && !destroyed) raf = requestAnimationFrame(frame); }

    function frame(t) {
      raf = 0;
      var active = false;
      var bx = cx, by = cy, bz = z;
      if (anim) { stepAnim(t); active = true; }
      if (inertia) { stepInertia(t); active = active || !!inertia || !!anim; }
      if (wheel) { stepWheel(t); active = true; }
      if (cx !== bx || cy !== by || z !== bz) moved = true;
      draw();
      updateDom();
      if (moved) {
        moved = false; wasMoving = true;
        if (opts.onMove) try { opts.onMove(getView()); } catch (e) { console.error(e); }
      }
      if (active || dragging) requestRender();
      else if (wasMoving && !pointers.size) {
        wasMoving = false;
        if (opts.onMoveEnd) try { opts.onMoveEnd(getView()); } catch (e) { console.error(e); }
        byUser = false;
      }
    }

    function draw() {
      var k = Math.pow(2, z - 16);
      var ucx = (cx - G.ox) * U, ucy = (cy - G.oy) * U;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, W, H);
      var a = dpr * k;
      ctx.setTransform(a, 0, 0, a, dpr * (W / 2 - ucx * k), dpr * (H / 2 - ucy * k));
      var px = 1 / k; // one screen pixel in path units
      var m = ppm(z);
      ctx.fillStyle = COLORS.land; ctx.fill(G.land);
      ctx.fillStyle = COLORS.block; ctx.fill(G.blocks, 'evenodd');
      ctx.fillStyle = COLORS.landuse; ctx.fill(G.landuse, 'evenodd');
      ctx.fillStyle = COLORS.rail; ctx.fill(G.rail, 'evenodd');
      if (z > 14.6) {
        ctx.strokeStyle = COLORS.track; ctx.lineWidth = Math.max(0.6, 1.4 * m) * px; ctx.stroke(G.tracks);
      }
      ctx.fillStyle = COLORS.cemetery; ctx.fill(G.cemetery, 'evenodd');
      ctx.fillStyle = COLORS.park; ctx.fill(G.green, 'evenodd');
      ctx.strokeStyle = COLORS.parkEdge; ctx.lineWidth = px; ctx.stroke(G.green);
      ctx.fillStyle = COLORS.promenade; ctx.fill(G.promenade);
      ctx.fillStyle = COLORS.plaza; ctx.fill(G.plazas, 'evenodd');
      ctx.strokeStyle = COLORS.plazaEdge; ctx.lineWidth = px; ctx.stroke(G.plazas);
      ctx.fillStyle = COLORS.water; ctx.fill(G.water, 'evenodd');
      ctx.strokeStyle = COLORS.waterEdge; ctx.lineWidth = 1.2 * px; ctx.stroke(G.water);

      var wMin = Math.max(z < 15 ? 0.8 : 1.1, G.widths.minor * m * (z < 16 ? 0.8 : 0.95));
      var wMid = Math.max(1.9, G.widths.mid * m);
      var wMaj = Math.max(3.6, G.widths.major * m);
      var cas = z < 16 ? 1.5 : 2;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (z >= 14.8) { ctx.strokeStyle = COLORS.caseMinor; ctx.lineWidth = (wMin + cas) * px; ctx.stroke(G.minor); }
      ctx.strokeStyle = COLORS.caseMid; ctx.lineWidth = (wMid + cas) * px; ctx.stroke(G.mid);
      ctx.strokeStyle = COLORS.caseMajor; ctx.lineWidth = (wMaj + cas + 0.5) * px; ctx.stroke(G.major);
      ctx.strokeStyle = COLORS.road;
      ctx.lineWidth = wMin * px; ctx.stroke(G.minor);
      ctx.lineWidth = wMid * px; ctx.stroke(G.mid);
      ctx.strokeStyle = COLORS.major;
      ctx.lineWidth = wMaj * px; ctx.stroke(G.major);
      if (z > 15.4) {
        ctx.setLineDash([3 * px, 2.5 * px]);
        ctx.strokeStyle = '#E0D9CD'; ctx.lineWidth = (Math.max(1.4, 4 * m) + 1.5) * px; ctx.stroke(G.foot);
        ctx.setLineDash([]);
        ctx.strokeStyle = COLORS.road; ctx.lineWidth = Math.max(1.4, 4 * m) * px; ctx.stroke(G.foot);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawLabels();
      drawFade();
    }

    var placed = [];
    function drawLabels() {
      placed.length = 0;
      var s = S();
      var list = G.labels;
      // priority order
      if (!G.sorted) { list.sort(function (a, b) { return LABEL_STYLE[a.k].pri - LABEL_STYLE[b.k].pri; }); G.sorted = true; }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      for (var i = 0; i < list.length; i++) {
        var L = list[i], st = LABEL_STYLE[L.k];
        if (!st || z < st.min || z > st.max) continue;
        var sx = (L.x - cx) * s + W / 2, sy = (L.y - cy) * s + H / 2;
        if (sx < -200 || sx > W + 200 || sy < -40 || sy > H + 40) continue;
        var alpha = 1;
        if (st.max < 99) alpha = clamp((st.max - z) / 0.5, 0, 1);
        if (z - st.min < 0.35) alpha = Math.min(alpha, clamp((z - st.min) / 0.35, 0, 1));
        if (alpha <= 0.02) continue;
        var font = st.font + ' ' + FONT_STACK;
        ctx.font = font;
        if ('letterSpacing' in ctx) ctx.letterSpacing = (st.spacing || 0) + 'px';
        var txt = st.upper ? L.t.toUpperCase() : L.t;
        if (L.font !== font) { L.w = ctx.measureText(txt).width; L.font = font; }
        var w = L.w + 8, h = 16;
        var ca = Math.abs(Math.cos(L.a)), sa = Math.abs(Math.sin(L.a));
        var bw = w * ca + h * sa, bh = w * sa + h * ca;
        var box = [sx - bw / 2, sy - bh / 2, sx + bw / 2, sy + bh / 2];
        var hit = false;
        for (var j = 0; j < placed.length; j++) {
          var q = placed[j];
          if (box[0] < q[2] && box[2] > q[0] && box[1] < q[3] && box[3] > q[1]) { hit = true; break; }
        }
        if (hit) continue;
        placed.push(box);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(sx, sy);
        if (L.a) ctx.rotate(L.a);
        ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = 3.2;
        ctx.strokeText(txt, 0, 0);
        ctx.fillStyle = st.color;
        ctx.fillText(txt, 0, 0);
        ctx.restore();
      }
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      drawStreetLabels(s);
    }
    function drawStreetLabels(s) {
      var hw = W / 2, hh = H / 2, last = {};
      for (var pri = 0; pri < 2; pri++) {
        var kind = pri === 0 ? 'major' : 'mid', st = LABEL_STYLE[kind];
        if (z < st.min) continue;
        var alpha = clamp((z - st.min) / 0.35, 0, 1);
        var font = st.font + ' ' + FONT_STACK;
        ctx.font = font;
        for (var i = 0; i < G.named.length; i++) {
          var N = G.named[i];
          if (N.k !== kind) continue;
          if (N.font !== font) { N.w = ctx.measureText(N.t).width; N.font = font; }
          var need = N.w + 24, spacing = Math.max(380, N.w * 3);
          var placedHere = last[N.t] || (last[N.t] = []);
          var acc = 0;
          for (var j = 0; j < N.pts.length - 1; j++) {
            var ax = (N.pts[j][0] - cx) * s + hw, ay = (N.pts[j][1] - cy) * s + hh;
            var bx = (N.pts[j + 1][0] - cx) * s + hw, by = (N.pts[j + 1][1] - cy) * s + hh;
            var len = Math.hypot(bx - ax, by - ay);
            if (len < need) continue;
            if (Math.max(ax, bx) < 0 || Math.min(ax, bx) > W || Math.max(ay, by) < 0 || Math.min(ay, by) > H) continue;
            // candidate positions along the segment, clipped to the viewport
            var nslots = Math.max(1, Math.floor(len / spacing));
            for (var q = 0; q < nslots; q++) {
              var f = (q + 0.5) / nslots;
              var sx = ax + (bx - ax) * f, sy = ay + (by - ay) * f;
              if (sx - N.w / 2 < 6 || sx + N.w / 2 > W - 6 || sy < 16 || sy > H - 16) continue;
              var tooClose = false;
              for (var r = 0; r < placedHere.length; r++) if (Math.hypot(placedHere[r][0] - sx, placedHere[r][1] - sy) < spacing * 0.8) { tooClose = true; break; }
              if (tooClose) continue;
              var ang = Math.atan2(by - ay, bx - ax);
              if (ang > Math.PI / 2) ang -= Math.PI; else if (ang < -Math.PI / 2) ang += Math.PI;
              var w = N.w + 8, h = 15;
              var ca = Math.abs(Math.cos(ang)), sa = Math.abs(Math.sin(ang));
              var bw = w * ca + h * sa, bh = w * sa + h * ca;
              var box = [sx - bw / 2, sy - bh / 2, sx + bw / 2, sy + bh / 2], hit = false;
              for (var u = 0; u < placed.length; u++) { var o = placed[u]; if (box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1]) { hit = true; break; } }
              if (hit) continue;
              placed.push(box); placedHere.push([sx, sy]);
              ctx.save();
              ctx.globalAlpha = alpha;
              ctx.translate(sx, sy); ctx.rotate(ang);
              ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 3.4;
              ctx.strokeText(N.t, 0, 0);
              ctx.fillStyle = st.color; ctx.fillText(N.t, 0, 0);
              ctx.restore();
            }
          }
        }
      }
    }
    var FONT_STACK = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    try {
      var fv = getComputedStyle(document.documentElement).getPropertyValue('--font-body').trim();
      if (fv) FONT_STACK = fv + ', system-ui, sans-serif';
    } catch (e) { }

    function drawFade() {
      var s = S();
      var x0 = (G.bx0 - cx) * s + W / 2, x1 = (G.bx1 - cx) * s + W / 2;
      var y0 = (G.by0 - cy) * s + H / 2, y1 = (G.by1 - cy) * s + H / 2;
      var f = clamp(260 * ppm(z), 36, 150);
      {
        var bg = COLORS.bg, tr = 'rgba(236,232,225,0)';
        // solid outside the faded band
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.rect(-10, -10, W + 20, H + 20);
        ctx.rect(x0 - f, y0 - f, (x1 - x0) + 2 * f, (y1 - y0) + 2 * f);
        ctx.fill('evenodd');
        var gr;
        gr = ctx.createLinearGradient(x0, 0, x0 - f, 0); gr.addColorStop(0, tr); gr.addColorStop(1, bg);
        ctx.fillStyle = gr; ctx.fillRect(x0 - f, y0 - f, f, (y1 - y0) + 2 * f);
        gr = ctx.createLinearGradient(x1, 0, x1 + f, 0); gr.addColorStop(0, tr); gr.addColorStop(1, bg);
        ctx.fillStyle = gr; ctx.fillRect(x1, y0 - f, f, (y1 - y0) + 2 * f);
        gr = ctx.createLinearGradient(0, y0, 0, y0 - f); gr.addColorStop(0, tr); gr.addColorStop(1, bg);
        ctx.fillStyle = gr; ctx.fillRect(x0 - f, y0 - f, (x1 - x0) + 2 * f, f);
        gr = ctx.createLinearGradient(0, y1, 0, y1 + f); gr.addColorStop(0, tr); gr.addColorStop(1, bg);
        ctx.fillStyle = gr; ctx.fillRect(x0 - f, y1, (x1 - x0) + 2 * f, f);
      }
    }

    /* ---- DOM overlay */
    function updateDom() {
      root.classList.toggle('z-hi', z >= 16.7);
      if (clusterDirty || Math.abs(z - lastClusterZ) > 0.04) computeClusters();
      var s = S(), hw = W / 2, hh = H / 2;
      for (var i = 0; i < pins.length; i++) {
        var p = pins[i];
        var x = (p.x - cx) * s + hw, y = (p.y - cy) * s + hh;
        p.sx = x; p.sy = y;
        if (x < -160 || x > W + 160 || y < -120 || y > H + 160) { if (!p.far) { p.pos.style.display = 'none'; p.far = true; } continue; }
        if (p.far) { p.pos.style.display = ''; p.far = false; }
        p.pos.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
        var zi = 100 + Math.round(y);
        if (p.v.flagship) zi += 2000;
        if (p.id === selected) zi += 5000;
        if (p.zi !== zi) { p.pos.style.zIndex = zi; p.zi = zi; }
      }
      for (var c = 0; c < clusters.length; c++) {
        var cl = clusters[c];
        if (!cl.on && cl.el.classList.contains('is-off') && cl.hiddenDone) continue;
        var X = (cl.x - cx) * s + hw, Y = (cl.y - cy) * s + hh;
        cl.el.style.transform = '';
        cl.el.style.left = X.toFixed(1) + 'px'; cl.el.style.top = Y.toFixed(1) + 'px';
        cl.el.style.zIndex = 1000 + Math.round(Y);
      }
      if (userEl && user) {
        var u = toScreen(user.x, user.y);
        userEl.style.transform = 'translate3d(' + u.x.toFixed(1) + 'px,' + u.y.toFixed(1) + 'px,0)';
      }
    }

    function isVisible(p) { return !visibleSet || visibleSet[p.id]; }
    function computeClusters() {
      lastClusterZ = z; clusterDirty = false;
      var s = S(), R = 46, lift = 18 / s;
      var cand = revealed ? pins.filter(function (p) { return isVisible(p) && p.id !== selected && !p.v.flagship; }) : [];
      // agglomerative: merge the closest pair of groups while closer than R (screen px, visual centers)
      var groups = cand.map(function (p) { return { x: p.x, y: p.y - lift, m: [p] }; });
      for (;;) {
        var bi = -1, bj = -1, bd = R;
        for (var i = 0; i < groups.length; i++) for (var j = i + 1; j < groups.length; j++) {
          var dx = (groups[i].x - groups[j].x) * s, dy = (groups[i].y - groups[j].y) * s * 1.15;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < bd) { bd = d; bi = i; bj = j; }
        }
        if (bi < 0) break;
        var A = groups[bi], B = groups[bj], n = A.m.length + B.m.length;
        A.x = (A.x * A.m.length + B.x * B.m.length) / n; A.y = (A.y * A.m.length + B.y * B.m.length) / n;
        A.m = A.m.concat(B.m); groups.splice(bj, 1);
      }
      // clustered state for each pin
      var inCluster = {};
      var used = 0;
      groups.forEach(function (g) {
        if (g.m.length < 2) return;
        var sx = 0, sy = 0; g.m.forEach(function (p) { sx += p.x; sy += p.y; inCluster[p.id] = true; });
        var cl = clusters[used] || (clusters[used] = clusterEl());
        used++;
        cl.members = g.m; cl.x = g.x; cl.y = g.y;
        cl.el.textContent = g.m.length;
        cl.el.setAttribute('aria-label', g.m.length + ' ' + STR[lang].cluster);
        if (!cl.on) { cl.on = true; cl.hiddenDone = false; cl.el.style.visibility = ''; cl.el.classList.remove('is-off'); }
      });
      for (var i = used; i < clusters.length; i++) {
        var c = clusters[i];
        if (c.on) {
          c.on = false; c.el.classList.add('is-off');
          (function (cc) { setTimeout(function () { if (!cc.on) { cc.hiddenDone = true; cc.el.style.visibility = 'hidden'; } }, 260); })(c);
        }
      }
      pins.forEach(function (p) { setPinState(p, isVisible(p), !!inCluster[p.id]); });
    }

    function setPinState(p, vis, clustered) {
      var off = !revealed || !vis || clustered;
      if (p.off === off) return;
      p.off = off;
      var b = p.btn;
      if (off) {
        b.classList.remove('is-drop', 'is-pop');
        b.classList.add('is-off');
        b.tabIndex = -1;
        clearTimeout(p.goneT);
        p.goneT = setTimeout(function () { if (p.off) b.classList.add('is-gone'); }, 240);
      } else {
        clearTimeout(p.goneT);
        b.classList.remove('is-gone', 'is-off', 'is-pre');
        b.tabIndex = 0;
        if (revealed && !p.dropping) { b.classList.remove('is-pop'); void b.offsetWidth; b.classList.add('is-pop'); }
      }
    }

    /* ---- animation primitives */
    function stopMotion() { anim = null; inertia = null; wheel = null; }
    function flyTo(tx, ty, tz, dur, user_) {
      tz = clamp(tz, minZ, maxZ);
      var c = clampView(tx, ty, tz); tx = c.x; ty = c.y;
      stopMotion();
      if (user_) byUser = true;
      if (reduce || dur === 0) { cx = tx; cy = ty; z = tz; moved = true; clusterDirty = true; requestRender(); return; }
      var s0 = S(), dist = Math.hypot(tx - cx, ty - cy) * s0;
      var bump = clamp(Math.log(Math.max(1, dist / Math.max(W, H))) / Math.LN2, 0, 1.6) * 0.8;
      if (dur == null) dur = clamp(380 + dist * 0.18 + Math.abs(tz - z) * 90, 420, 950);
      anim = { mode: 'fly', t0: now(), dur: dur, x0: cx, y0: cy, z0: z, x1: tx, y1: ty, z1: tz, bump: bump };
      requestRender();
    }
    function zoomAround(px, py, tz, dur, user_) {
      tz = clamp(tz, minZ, maxZ);
      stopMotion();
      if (user_) byUser = true;
      var w = toWorld(px, py);
      if (reduce || dur === 0) { setZoomAnchor(w, px, py, tz); var c = clampView(cx, cy, z); cx = c.x; cy = c.y; moved = true; requestRender(); return; }
      anim = { mode: 'anchor', t0: now(), dur: dur || 320, w: w, px: px, py: py, z0: z, z1: tz };
      requestRender();
    }
    function setZoomAnchor(w, px, py, zz) {
      z = zz; var s = S();
      cx = w.x - (px - W / 2) / s; cy = w.y - (py - H / 2) / s;
    }
    function springBack(dur) {
      var c = clampView(cx, cy, clamp(z, minZ, maxZ));
      var tz = clamp(z, minZ, maxZ);
      if (Math.abs(c.x - cx) * S() < 0.5 && Math.abs(c.y - cy) * S() < 0.5 && tz === z) return;
      anim = { mode: 'fly', t0: now(), dur: reduce ? 1 : (dur || 380), x0: cx, y0: cy, z0: z, x1: c.x, y1: c.y, z1: tz, bump: 0, ease: easeOut };
      requestRender();
    }
    function stepAnim(t) {
      var a = anim, u = clamp((now() - a.t0) / a.dur, 0, 1);
      var e = (a.ease || easeInOut)(u);
      if (a.mode === 'fly') {
        z = a.z0 + (a.z1 - a.z0) * e - a.bump * Math.sin(Math.PI * e);
        cx = a.x0 + (a.x1 - a.x0) * e; cy = a.y0 + (a.y1 - a.y0) * e;
      } else {
        var zz = a.z0 + (a.z1 - a.z0) * easeOut(u);
        setZoomAnchor(a.w, a.px, a.py, zz);
        if (u >= 1) { var c = clampView(cx, cy, z); if (Math.abs(c.x - cx) + Math.abs(c.y - cy) > 0) { anim = null; springBack(260); return; } }
        else { var r = rubber(cx, cy, z); cx = r.x; cy = r.y; }
      }
      if (u >= 1) { anim = null; clusterDirty = true; }
    }
    function stepInertia(t) {
      var I = inertia, tt = now(), dt = Math.min(40, tt - I.t); I.t = tt;
      I.rx += I.vx * dt; I.ry += I.vy * dt;
      var decay = Math.pow(0.9955, dt);
      I.vx *= decay; I.vy *= decay;
      var r = rubber(I.rx, I.ry, z);
      var out = r.x !== I.rx || r.y !== I.ry;
      if (out) { var dd = Math.pow(0.86, dt / 16); I.vx *= dd; I.vy *= dd; }
      cx = r.x; cy = r.y;
      var sp = Math.hypot(I.vx, I.vy) * S();
      if (sp < 0.02) { inertia = null; springBack(420); }
    }
    function stepWheel(t) {
      var Wh = wheel, tt = now(), dt = Math.min(40, tt - Wh.t); Wh.t = tt;
      var k = 1 - Math.exp(-dt / 70);
      var zz = z + (Wh.target - z) * k;
      if (Math.abs(Wh.target - zz) < 0.002) zz = Wh.target;
      setZoomAnchor(Wh.w, Wh.px, Wh.py, zz);
      var c = clampView(cx, cy, z); cx = c.x; cy = c.y;
      if (zz === Wh.target) { wheel = null; clusterDirty = true; }
    }

    /* ---- gestures */
    var pointers = new Map();
    var dragging = false, suppressClick = false, downInfo = null, pinch = null, samples = [];
    var lastTap = null;

    function localXY(e) { var r = root.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

    function onDown(e) {
      if (e.button !== undefined && e.button > 0 && e.pointerType === 'mouse') return;
      var p = localXY(e);
      pointers.set(e.pointerId, { x: p.x, y: p.y, sx: p.x, sy: p.y });
      stopMotion();
      suppressClick = false;
      if (pointers.size === 1) {
        downInfo = { x: p.x, y: p.y, t: now(), id: e.pointerId, target: e.target, rx: cx, ry: cy, moved: false, pt: e.pointerType };
        samples = [{ t: now(), x: p.x, y: p.y }];
      } else if (pointers.size === 2) {
        startPinch();
      }
    }
    function startPinch() {
      var a = Array.from(pointers.values());
      var mxp = (a[0].x + a[1].x) / 2, myp = (a[0].y + a[1].y) / 2;
      pinch = { d0: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1, z0: z, w: toWorld(mxp, myp) };
      dragging = true; suppressClick = true; byUser = true;
      root.classList.add('is-dragging');
      capture();
    }
    function capture() { pointers.forEach(function (v, id) { try { root.setPointerCapture(id); } catch (e) { } }); }
    function onMove(e) {
      var pt = pointers.get(e.pointerId);
      if (!pt) return;
      var p = localXY(e);
      pt.x = p.x; pt.y = p.y;
      if (pinch && pointers.size >= 2) {
        var a = Array.from(pointers.values());
        var mxp = (a[0].x + a[1].x) / 2, myp = (a[0].y + a[1].y) / 2;
        var d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1;
        var zr = pinch.z0 + Math.log(d / pinch.d0) / Math.LN2;
        var zd = zr > maxZ ? maxZ + (zr - maxZ) * 0.3 : zr < minZ ? minZ - (minZ - zr) * 0.3 : zr;
        setZoomAnchor(pinch.w, mxp, myp, zd);
        var r = rubber(cx, cy, z); cx = r.x; cy = r.y;
        moved = true; requestRender();
        return;
      }
      if (!downInfo || downInfo.id !== e.pointerId) return;
      var dx = p.x - downInfo.x, dy = p.y - downInfo.y;
      if (!dragging) {
        if (Math.hypot(dx, dy) < (downInfo.pt === 'mouse' ? 4 : 7)) return;
        dragging = true; suppressClick = true; byUser = true;
        root.classList.add('is-dragging');
        capture();
        downInfo.x = p.x; downInfo.y = p.y; dx = 0; dy = 0;
        downInfo.rx = cx; downInfo.ry = cy;
      }
      var s = S();
      var raw = { x: downInfo.rx - dx / s, y: downInfo.ry - dy / s };
      // keep the rubber band consistent: raw is measured from the gesture start
      var r2 = rubber(raw.x, raw.y, z);
      cx = r2.x; cy = r2.y;
      downInfo.rawx = raw.x; downInfo.rawy = raw.y;
      samples.push({ t: now(), x: p.x, y: p.y });
      if (samples.length > 8) samples.shift();
      moved = true; requestRender();
    }
    function onUp(e) {
      var had = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      try { root.releasePointerCapture(e.pointerId); } catch (er) { }
      if (pinch) {
        if (pointers.size < 2) {
          pinch = null;
          var tz = clamp(z, minZ, maxZ);
          if (pointers.size === 1) {
            // continue as a drag with the remaining finger
            var rest = Array.from(pointers.entries())[0];
            downInfo = { x: rest[1].x, y: rest[1].y, t: now(), id: rest[0], rx: cx, ry: cy, moved: true, pt: 'touch' };
            samples = [{ t: now(), x: rest[1].x, y: rest[1].y }];
          } else {
            endDrag();
          }
          if (tz !== z && had) { zoomAround(had.x, had.y, tz, 260); }
          else if (!pointers.size && outOfBounds()) springBack();
          clusterDirty = true;
        }
        return;
      }
      if (!downInfo || downInfo.id !== e.pointerId) return;
      if (dragging) {
        // inertia from recent samples
        var tt = now(), first = null;
        for (var i = samples.length - 1; i >= 0; i--) { if (tt - samples[i].t <= 90) first = samples[i]; }
        var last = samples[samples.length - 1];
        var s = S();
        if (first && last && last !== first && !reduce) {
          var dtv = Math.max(16, last.t - first.t);
          var vx = -(last.x - first.x) / dtv / s, vy = -(last.y - first.y) / dtv / s;
          var sp = Math.hypot(vx, vy) * s;
          if (sp > 0.12 && tt - last.t < 60) {
            var cap = 3.2 / s; var n = Math.hypot(vx, vy); if (n > cap) { vx *= cap / n; vy *= cap / n; }
            inertia = { t: now(), vx: vx, vy: vy, rx: downInfo.rawx != null ? downInfo.rawx : cx, ry: downInfo.rawy != null ? downInfo.rawy : cy };
          }
        }
        if (!inertia) springBack();
        endDrag();
        requestRender();
      } else {
        // a tap
        var p = localXY(e);
        var onPin = e.target && e.target.closest && e.target.closest('.bgfm-pin,.bgfm-cluster');
        if (!onPin) {
          var t = now();
          if (lastTap && t - lastTap.t < 320 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 30 && e.pointerType !== 'mouse') {
            lastTap = null;
            zoomAround(p.x, p.y, z + 1, 300, true);
          } else {
            lastTap = { t: t, x: p.x, y: p.y };
            if (opts.onMapClick) { try { opts.onMapClick(); } catch (er) { console.error(er); } }
          }
        }
        downInfo = null;
      }
    }
    function endDrag() {
      dragging = false; downInfo = null;
      root.classList.remove('is-dragging');
      setTimeout(function () { suppressClick = false; }, 0);
    }
    function onCancel(e) { pointers.delete(e.pointerId); if (!pointers.size) { pinch = null; endDrag(); springBack(); } }
    function onWheel(e) {
      e.preventDefault();
      var p = localXY(e);
      var dy = e.deltaY * (e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? 400 : 1);
      var k = e.ctrlKey ? 0.011 : 0.0042;
      var base = wheel ? wheel.target : z;
      var target = clamp(base - dy * k, minZ, maxZ);
      anim = null; inertia = null;
      byUser = true;
      if (reduce) { setZoomAnchor(toWorld(p.x, p.y), p.x, p.y, target); var c = clampView(cx, cy, z); cx = c.x; cy = c.y; moved = true; clusterDirty = true; requestRender(); return; }
      wheel = { target: target, w: toWorld(p.x, p.y), px: p.x, py: p.y, t: now() };
      requestRender();
    }
    function onDbl(e) {
      e.preventDefault();
      if (e.target.closest && e.target.closest('.bgfm-pin,.bgfm-cluster')) return;
      var p = localXY(e);
      zoomAround(p.x, p.y, z + (e.shiftKey ? -1 : 1), 300, true);
    }
    function onKey(e) {
      if (e.target !== root) return;
      var step = 90, s = S(), handled = true;
      switch (e.key) {
        case 'ArrowLeft': flyTo(cx - step / s, cy, z, 220, true); break;
        case 'ArrowRight': flyTo(cx + step / s, cy, z, 220, true); break;
        case 'ArrowUp': flyTo(cx, cy - step / s, z, 220, true); break;
        case 'ArrowDown': flyTo(cx, cy + step / s, z, 220, true); break;
        case '+': case '=': api.zoomIn(); break;
        case '-': case '_': api.zoomOut(); break;
        default: handled = false;
      }
      if (handled) e.preventDefault();
    }
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onCancel);
    root.addEventListener('wheel', onWheel, { passive: false });
    root.addEventListener('dblclick', onDbl);
    root.addEventListener('keydown', onKey);
    root.addEventListener('click', function (e) { if (suppressClick) { e.stopPropagation(); e.preventDefault(); } }, true);
    root.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    root.addEventListener('scroll', function () { if (root.scrollTop || root.scrollLeft) { root.scrollTop = 0; root.scrollLeft = 0; } });
    root.addEventListener('focusin', function (e) {
      if (root.scrollTop || root.scrollLeft) { root.scrollTop = 0; root.scrollLeft = 0; }
      var b = e.target.closest && e.target.closest('.bgfm-pin');
      if (!b || dragging) return;
      var p = byId[b.getAttribute('data-id')];
      if (!p) return;
      var sc = toScreen(p.x, p.y), m = 40;
      if (sc.x < pad.left + m || sc.x > W - pad.right - m || sc.y < pad.top + m + 30 || sc.y > H - pad.bottom - m) {
        var off = padOffset(z); flyTo(p.x - off.x, p.y - off.y, z, 360);
      }
    });
    var ro = window.ResizeObserver ? new ResizeObserver(function () { resize(); }) : null;
    if (ro) ro.observe(root); else window.addEventListener('resize', resize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { G.labels.forEach(function (l) { l.font = ''; }); G.named.forEach(function (l) { l.font = ''; }); requestRender(); });

    /* ---- selection & public API */
    function selectInternal(id, o, fromUser) {
      o = o || {};
      var prev = selected;
      selected = id && byId[id] ? id : null;
      if (prev && byId[prev]) { byId[prev].btn.classList.remove('is-sel'); byId[prev].btn.removeAttribute('aria-current'); }
      if (selected) {
        var p = byId[selected];
        p.btn.classList.add('is-sel'); p.btn.setAttribute('aria-current', 'true');
        if (o.pan !== false) {
          var tz = Math.max(z, o.zoom || 15.6);
          if (o.zoom) tz = o.zoom;
          var off = padOffset(tz);
          flyTo(p.x - off.x, p.y - off.y, tz, undefined, fromUser);
        }
      }
      clusterDirty = true;
      requestRender();
      if (fromUser && selected && opts.onSelect) { try { opts.onSelect(selected); } catch (e) { console.error(e); } }
    }

    function fitIds(ids, fromUser, extra) {
      var list = (ids || []).map(function (id) { return byId[id]; }).filter(Boolean);
      if (!list.length) return;
      (extra || []).forEach(function (q) { if (q && isFinite(q.lat) && isFinite(q.lng)) list.push({ x: mx(q.lng), y: my(q.lat) }); });
      var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      list.forEach(function (p) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
      var cw = Math.max(80, W - pad.left - pad.right - 96), ch = Math.max(80, H - pad.top - pad.bottom - 110);
      var tz;
      if (list.length === 1 || (x1 - x0 < 1e-9 && y1 - y0 < 1e-9)) tz = Math.max(z, 16.2);
      else tz = Math.log(Math.min(cw / Math.max(1e-9, x1 - x0), ch / Math.max(1e-9, y1 - y0)) / TILE) / Math.LN2;
      tz = clamp(tz, minZ, 17.4);
      var off = padOffset(tz);
      // pins extend upward: shift the box center a little up
      var lift = 18 / S(tz);
      flyTo((x0 + x1) / 2 - off.x, (y0 + y1) / 2 - off.y - lift, tz, undefined, fromUser);
    }

    function getView() {
      var off = padOffset(z);
      return { center: { lat: ilat(cy + off.y), lng: ilng(cx + off.x) }, zoom: z, byUser: byUser };
    }

    var revealTimers = [];
    var api = {
      select: function (id, o) { selectInternal(id, o || { pan: true }, false); },
      setVisible: function (ids) {
        if (ids == null) visibleSet = null;
        else { visibleSet = {}; ids.forEach(function (id) { visibleSet[id] = true; }); }
        clusterDirty = true; requestRender();
      },
      setPadding: function (p) {
        p = p || {};
        pad = { top: +p.top || 0, bottom: +p.bottom || 0, left: +p.left || 0, right: +p.right || 0 };
        computeMinZoom();
        if (z < minZ) z = minZ;
        if (!dragging && !anim) springBack(300);
        clusterDirty = true; requestRender();
      },
      setUser: function (pos) {
        if (!pos) { user = null; if (userEl) { userEl.remove(); userEl = null; } return; }
        user = { lat: pos.lat, lng: pos.lng, x: mx(pos.lng), y: my(pos.lat) };
        if (!userEl) {
          userEl = document.createElement('div');
          userEl.className = 'bgfm-user';
          userEl.setAttribute('role', 'img');
          userEl.innerHTML = '<b></b><em></em><i></i>';
          userEl.style.zIndex = 50;
          layer.insertBefore(userEl, layer.firstChild);
        }
        userEl.setAttribute('aria-label', STR[lang].you);
        requestRender();
      },
      reveal: function () {
        revealTimers.forEach(clearTimeout); revealTimers = [];
        revealed = true;
        pins.forEach(function (p) { p.dropping = true; });
        computeClusters();
        var order = pins.filter(function (p) { return !p.off; });
        var s = S();
        order.forEach(function (p) { p.dist = Math.hypot((p.x - cx) * s, (p.y - cy) * s); });
        order.sort(function (a, b) { return a.dist - b.dist; });
        // those not shown (clustered/filtered) simply lose their pre state
        pins.forEach(function (p) { if (p.off) { p.btn.classList.remove('is-pre'); p.dropping = false; } });
        var nOn = 0;
        clusters.forEach(function (cl) {
          if (!cl.on) return;
          cl.el.classList.add('is-off');
          revealTimers.push(setTimeout(function () { if (cl.on) cl.el.classList.remove('is-off'); }, reduce ? 0 : 160 + (order.length + nOn++) * 55));
        });
        order.forEach(function (p, i) {
          p.btn.classList.add('is-pre');
          p.dropping = true;
          var tm = setTimeout(function () {
            p.btn.classList.remove('is-pre', 'is-off', 'is-gone', 'is-pop');
            if (!reduce) p.btn.classList.add('is-drop');
            setTimeout(function () { p.dropping = false; p.btn.classList.remove('is-drop'); }, 700);
          }, reduce ? 0 : 120 + i * 55);
          revealTimers.push(tm);
        });
        requestRender();
      },
      fitTo: function (ids, o) { fitIds(ids, false, o && o.include); },
      zoomIn: function () { var off = padOffset(z); var c = toScreen(cx + off.x, cy + off.y); zoomAround(c.x, c.y, Math.round(z * 2) / 2 + 1, 300); },
      zoomOut: function () { var off = padOffset(z); var c = toScreen(cx + off.x, cy + off.y); zoomAround(c.x, c.y, Math.round(z * 2) / 2 - 1, 300); },
      recenter: function () {
        if (user) { var tz = Math.max(z, 15.4), off = padOffset(tz); flyTo(user.x - off.x, user.y - off.y, tz); }
        else { var off2 = padOffset(initial.z); flyTo(mx(initial.lng) - off2.x, my(initial.lat) - off2.y, initial.z); }
      },
      setLang: function (l) { lang = l === 'en' ? 'en' : 'fr'; root.setAttribute('aria-label', STR[lang].map); ariaPins(); if (userEl) userEl.setAttribute('aria-label', STR[lang].you); clusterDirty = true; requestRender(); },
      getView: getView,
      getSelected: function () { return selected; },
      resize: resize,
      destroy: function () {
        destroyed = true;
        if (raf) cancelAnimationFrame(raf);
        revealTimers.forEach(clearTimeout);
        if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
        root.remove();
      }
    };

    resize();
    if (revealed) pins.forEach(function (p) { p.off = true; });
    clusterDirty = true;
    requestRender();
    return api;
  }

  window.BGFMap = { create: create, version: '1.0.0' };
})();
