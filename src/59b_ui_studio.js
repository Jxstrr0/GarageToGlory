// 59b_ui_studio.js: v0.5 "Signed" — the studio. Book a studio + producer + weeks + tracks, the session view (tape
// progress, studio events, drum takes by skill or PLAY IT YOURSELF through the gig session's studio mode: best take
// counts), and the release wizard (tracklist order + lead single, title from 3 generated options or typed, procedural
// canvas cover, release week + promo). Covers are seeded (palette, motif, font), so the same cover always redraws the same.
//   GG.ui.openStudioBooking() ; GG.ui.openStudio() ; GG.ui.playTake(songId, done(score)) ; GG.ui.openRelease(done?)
//   GG.ui.v5.drawCover(canvas, cover, { title, band }) ; coverOptions(state, n, roll) ; titleOptions(state, n, roll)
//   Screens: 'studio-book' (sheet, tall), 'studio' (sheet, tall), 'release' (full, 4 steps).
//   testids: kind-ep|album, studio-<id>, producer-<id>|producer-none, weeks-<n>, track-<songId>, book-cost, btn-book,
//   session-progress, session-events, take-<songId>, btn-play-take-<songId>, btn-mix, rel-tab-<step>, rel-row-<i>,
//   btn-up-<i>, btn-down-<i>, btn-single-<i>, title-opt-<i>, title-input, btn-more-titles, cover-<i>, btn-more-covers,
//   rel-week-<n>, promo-<n>, btn-rel-next, btn-release, rel-summary.
// Sim calls (guarded): labels.canRecord, studios, producers, sessionQuote, startSession, recordTake, titleOptions,
//   coverOptions, releaseWeeks, promoOptions, release.
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, U = GG.util, C = GG.contracts, V = ui.v5;
  function S() { return GG.state; }
  var KIND = { ep: { name: 'EP', range: [4, 5], blurb: '4–5 songs. A calling card. Cheap to press.' }, album: { name: 'Album', range: [8, 10], blurb: '8–10 songs. A statement. {front} wants a gatefold.' } };
  // v0.9: the title ideas' reactions come from the lineup (the silent one gives a thumbs-up).
  var TITLE_REACT = ['{n} likes it', '{n} would like to discuss', '{n} approves', '{n} is already making the shirt'];
  function titleReact(t) {
    var st = S(), act = st ? ui.active(st) : [], h = GG.hashSeed(t) >>> 0, m = act.length ? act[h % act.length] : null;
    if (!m) return 'The band approves';
    var n = ui.who(m.id).short;
    return ui.isSilent(m.id, st) ? n + ': 👍' : TITLE_REACT[(h >>> 3) % TITLE_REACT.length].replace('{n}', n);
  }

  /* ======================================================================================================
     Procedural covers
     ====================================================================================================== */
  var PALETTES = {
    frostbite: ['#0b1622', '#3d6e9e', '#e8f1f8', '#9fc3e0'], prairie: ['#f2c65b', '#b8601a', '#3b2412', '#fff4d0'],
    blood: ['#120404', '#8c0f14', '#e8dccb', '#ff3b2f'], aurora: ['#07131c', '#2ee6a6', '#e8fff7', '#8f5bff'],
    xerox: ['#efece3', '#151515', '#151515', '#d23c3c'], rust: ['#2a1a12', '#b4532a', '#f0d9b5', '#6b7f5a'],
    neon: ['#10061c', '#ff2e97', '#fff6d8', '#29e3ff'], denim: ['#1d2b44', '#6f8fbf', '#f3e9d2', '#c23b3b'],
    canola: ['#244a8a', '#f5d20f', '#fffbe6', '#2f8a3a'], bruise: ['#1a1026', '#6b3fa0', '#e9ddff', '#c7ff5e']
  };
  var MOTIFS = ['hail', 'moose', 'lawn', 'skull', 'elevator', 'cape', 'van', 'loon'];
  var FONTS = ['metal', 'gothic', 'block', 'stencil', 'script', 'typewriter'];
  var GENRE_FONT = { metal: ['metal', 'metal', 'gothic', 'metal', 'block'], punk: ['stencil', 'block', 'typewriter'], rock: ['block', 'gothic', 'stencil'], country: ['script', 'typewriter', 'block'] };
  function idOf(x) { return x && typeof x === 'object' ? x.id : x; }
  function four(c) { return c.length >= 4 ? c : [c[0], c[2], c[1], shadeHex(c[2], 1.35)]; }   // content: [bg, fg, accent]
  var FONT_MAP = { olde: 'metal', poster: 'block', gatefold: 'gothic', zine: 'stencil', coffeerow: 'script', highway: 'block' };
  function fontOf(f, genre) { if (FONTS.indexOf(f) >= 0) return f; var m = FONT_MAP[f]; return m === 'metal' && genre && genre !== 'metal' ? 'gothic' : m || 'block'; }
  function paletteOf(p, seed) {
    if (Array.isArray(p) && p.length >= 3) return four(p);
    var w = V.words(), src = w.palettes, hit = null;
    if (p && src) hit = Array.isArray(src) ? (src.filter(function (x) { return x && x.id === p; })[0] || null) : src[p];
    if (hit) { var cols = Array.isArray(hit) ? hit : hit.colors; if (cols && cols.length >= 3) return four(cols); }
    if (p && PALETTES[p]) return PALETTES[p];
    var keys = Object.keys(PALETTES); return PALETTES[keys[(seed >>> 0) % keys.length]];
  }
  function pools(genre) {
    var w = V.words();
    function ids(x, fb) { var l = V.pool(x).map(idOf).filter(Boolean); return l.length ? l : fb; }
    var pal = w.palettes ? (Array.isArray(w.palettes) ? w.palettes.map(idOf) : Object.keys(w.palettes)) : Object.keys(PALETTES);
    var mot = ids(w.motifs, MOTIFS), fonts = ids(w.fonts, FONTS);
    return { palettes: pal.length ? pal : Object.keys(PALETTES), motifs: mot, fonts: fonts, pref: (GENRE_FONT[genre] || []).filter(function (f) { return fonts.indexOf(f) >= 0; }) };
  }
  V.coverOptions = function (st, n, roll) {
    st = st || S(); n = n || 4; roll = roll || 0;
    var sim = V.call('coverOptions', st, n, roll);
    if (Array.isArray(sim) && sim.length) return sim;
    var P = pools(st.genre), out = [], used = {};
    var rng = GG.RNG(GG.hashSeed([st.seed, 'cover', (st.albums || []).length, roll].join('|')));
    for (var i = 0; i < n; i++) {
      var motif = P.motifs[rng.int(0, P.motifs.length - 1)], tries = 0;
      while (used[motif] && tries++ < 6) motif = P.motifs[rng.int(0, P.motifs.length - 1)];
      used[motif] = 1;
      var font = P.pref.length && rng.next() < 0.6 ? rng.pick(P.pref) : rng.pick(P.fonts);
      out.push({ seed: (rng.next() * 4294967296) >>> 0, palette: rng.pick(P.palettes), motif: motif, font: font });
    }
    return out;
  };
  var TITLE_FALLBACK = {
    metal: { a: ['Hail', 'Frost', 'Wheat', 'Moose', 'Blizzard', 'Gravel', 'Prairie', 'Tundra', 'Canola', 'Pothole', 'Slush', 'Grain'],
      b: ['Apocalypse', 'Dominion', 'Reckoning', 'Requiem', 'Eternal Winter', 'Abyss', 'Throne', 'Warlord', 'Oblivion', 'Crusade'],
      forms: ['{a} {b}', 'The {b} of {a}', '{b} Over {city}', 'Ride the {a}', '{a} of the {b}', 'Songs for a {a} {b}'] },
    punk: { a: ['Parking', 'Laundromat', 'Slush', 'Bus Pass', 'Transit', 'Landlord', 'Pothole', 'Minimum'], b: ['Riot', 'Tickets', 'Wage', 'Problems', 'Nation', 'Blues', 'Attack'],
      forms: ['{a} {b}', 'No More {a}', '{a} {b} (Live in a Basement)', 'Everything Is {a}'] },
    rock: { a: ['Highway', 'Gravel', 'Neon', 'Northern', 'Midnight', 'Prairie', 'Truck Stop'], b: ['Kings', 'Nights', 'Lights', 'Hearts', 'Radio', 'Thunder', 'Horizon'],
      forms: ['{a} {b}', 'Back to the {a}', '{b} of the {a}', 'Louder Than {a}'] },
    country: { a: ['Grid Road', 'Quonset', 'Canola', 'Tailgate', 'Barn Dance', 'Harvest', 'Coffee Row'], b: ['Blues', 'Heartache', 'Sunrise', 'Waltz', 'Prayer', 'Summer', 'Goodbye'],
      forms: ['{a} {b}', '{b} on the {a}', 'Long Way to {a}', 'Songs from the {a}'] }
  };
  V.titleOptions = function (st, n, roll) {
    st = st || S(); n = n || 3; roll = roll || 0;
    var sim = V.call('titleOptions', st, n, roll);
    if (Array.isArray(sim) && sim.length) return sim.map(function (t) { return typeof t === 'string' ? t : t.title || t.en || String(t); });
    var w = V.words(), g = st.genre || 'metal', src = w.titles && (w.titles[g] || w.titles.any), rng = GG.RNG(GG.hashSeed([st.seed, 'title', (st.albums || []).length, roll].join('|')));
    var out = [], guard = 0;
    while (out.length < n && guard++ < 40) {
      var t;
      if (Array.isArray(src) && src.length) { var x = rng.pick(src); t = typeof x === 'string' ? x : x.title || x.en || x.fr; }
      else {
        var P = (src && src.forms ? src : TITLE_FALLBACK[g] || TITLE_FALLBACK.metal);
        t = rng.pick(P.forms).replace('{a}', rng.pick(P.a)).replace('{b}', rng.pick(P.b));
      }
      t = V.fill(t);
      if (t && out.indexOf(t) < 0) out.push(t);
    }
    return out;
  };

  // ---- Drawing --------------------------------------------------------------------------------------------------
  function shadeHex(hex, f) {
    var n = parseInt(String(hex).replace('#', ''), 16); if (isNaN(n)) return hex;
    var r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    function c(v) { v = f >= 1 ? v + (255 - v) * (f - 1) : v * f; return Math.max(0, Math.min(255, Math.round(v))); }
    return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')';
  }
  var FONT_CSS = {
    metal: function (px) { return 'italic 900 ' + px + 'px "Times New Roman", Georgia, serif'; },
    gothic: function (px) { return '900 ' + px + 'px "Old English Text MT", "UnifrakturMaguntia", "Times New Roman", serif'; },
    block: function (px) { return '900 ' + px + 'px Impact, "Arial Black", "Helvetica Neue", sans-serif'; },
    stencil: function (px) { return '900 ' + px + 'px "Stencil", "Arial Black", "Courier New", monospace'; },
    script: function (px) { return 'italic 700 ' + px + 'px "Brush Script MT", "Segoe Script", "Snell Roundhand", cursive'; },
    typewriter: function (px) { return '700 ' + px + 'px "Courier New", Courier, monospace'; }
  };
  function fitFont(g, text, font, px, maxW) {
    var f = FONT_CSS[font] || FONT_CSS.block;
    do { g.font = f(px); px -= 2; } while (g.measureText(text).width > maxW && px > 10);
    return px + 2;
  }
  // The band logo. Metal: gloriously unreadable (stretched, mirrored spikes, drips). Others: honest type.
  function drawLogo(g, rng, text, font, x, y, maxW, px, col, edge) {
    text = String(text || '');
    if (font === 'metal') {
      var t = text.toUpperCase().replace(/\s+/g, ' ');
      px = fitFont(g, t, 'metal', px, maxW * 0.95);
      var w = g.measureText(t).width * 0.86, h = px * 0.78, cxs = [], lx = x - w / 2, i;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'miter';
      for (i = 0; i < t.length; i++) {           // letter by letter: squeezed together, each its own height and lean
        var cw = g.measureText(t[i]).width * 0.86, cx = lx + cw / 2; lx += cw;
        if (t[i] === ' ') continue;
        cxs.push(cx);
        var sy = 1.5 + rng.range(-0.25, 0.55), rot = rng.range(-0.12, 0.12);
        g.save(); g.translate(cx, y + rng.range(-3, 3)); g.rotate(rot); g.scale(0.92, sy);
        g.lineWidth = Math.max(2, px * 0.14); g.strokeStyle = edge; g.strokeText(t[i], 0, 0);
        g.fillStyle = col; g.fillText(t[i], 0, 0);
        g.restore();
      }
      g.fillStyle = col; g.strokeStyle = col;
      function spike(bx, by, tx, ty, bw) { g.beginPath(); g.moveTo(bx - bw, by); g.lineTo(bx + bw, by); g.lineTo(tx, ty); g.closePath(); g.fill(); }
      for (i = 0; i < cxs.length; i++) {         // every stem becomes a thorn, up and/or down, sometimes forked
        var c0 = cxs[i], up = h * rng.range(0.8, 2.0), dn = h * rng.range(0.5, 1.5), lean = rng.range(-0.35, 0.35), bw = rng.range(1.6, 3.4);
        if (rng.next() < 0.8) spike(c0 + rng.range(-3, 3), y - h * 0.3, c0 + lean * up, y - h * 0.5 - up, bw);
        if (rng.next() < 0.6) spike(c0 + rng.range(-3, 3), y + h * 0.3, c0 - lean * dn, y + h * 0.5 + dn, bw);
        if (rng.next() < 0.3) spike(c0, y - h * 0.9, c0 + (lean > 0 ? 1 : -1) * up * 0.5, y - h * 0.8 - up * 0.6, bw * 0.6);
      }
      var half = w / 2, n = 6 + rng.int(0, 4);
      for (i = 0; i < n; i++) {                  // mirrored flourishes (black-metal logos are symmetric, allegedly)
        var sx = rng.range(0.1, 1.05) * half, upw = rng.next() < 0.55, len = rng.range(0.6, 1.6) * h, b2 = rng.range(1.5, 3.5);
        for (var side = -1; side <= 1; side += 2) {
          var bx = x + side * sx, by = y + (upw ? -h * 0.6 : h * 0.6), tipX = bx + side * rng.range(0, 0.7) * len * 0.5;
          spike(bx, by, tipX, by + (upw ? -len : len), b2);
        }
      }
      g.lineWidth = 1.6;
      for (i = 0; i < 5; i++) {                  // horizontal thorns off both ends
        var ly = y + rng.range(-h * 0.6, h * 0.6), ll = rng.range(0.12, 0.35) * half;
        g.beginPath(); g.moveTo(x - half, ly); g.lineTo(x - half - ll, ly + rng.range(-10, 10)); g.moveTo(x + half, ly); g.lineTo(x + half + ll, ly + rng.range(-10, 10)); g.stroke();
      }
      g.beginPath(); g.moveTo(x - half * 1.05, y + h * 0.95); g.quadraticCurveTo(x, y + h * 1.35, x + half * 1.05, y + h * 0.95); g.stroke();   // the underline swoosh
      for (i = 0; i < 6; i++) {                  // drips
        var dx = x + rng.range(-half, half), dl = rng.range(6, 24);
        spike(dx, y + h * 0.7, dx, y + h * 0.7 + dl, 1.6);
        g.beginPath(); g.arc(dx, y + h * 0.7 + dl, 2, 0, Math.PI * 2); g.fill();
      }
      return;
    }
    var tt = font === 'script' ? text : text.toUpperCase();
    px = fitFont(g, tt, font, px, maxW);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.save(); g.translate(x, y); if (font === 'gothic') g.scale(1, 1.25);
    g.lineWidth = Math.max(2, px * 0.1); g.strokeStyle = edge; g.strokeText(tt, 0, 0);
    g.fillStyle = col; g.fillText(tt, 0, 0);
    g.restore();
    if (font === 'stencil') { g.fillStyle = edge; g.fillRect(x - maxW / 2, y - 1, maxW, 2.5); }
  }
  function star(g, x, y, r) { g.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
  var MOTIF = {
    hail: function (g, r, W, P) {
      g.strokeStyle = P[2]; g.globalAlpha = 0.35; g.lineWidth = 1.5;
      for (var i = 0; i < 26; i++) { var x = r.range(0, W), y = r.range(W * 0.25, W); g.beginPath(); g.moveTo(x, y); g.lineTo(x - 18, y - 46); g.stroke(); }
      g.globalAlpha = 1;
      for (i = 0; i < 16; i++) {
        var hx = r.range(W * 0.08, W * 0.92), hy = r.range(W * 0.35, W * 0.92), hr = r.range(W * 0.02, W * 0.075);
        g.fillStyle = P[2]; g.beginPath(); g.arc(hx, hy, hr, 0, Math.PI * 2); g.fill();
        g.fillStyle = P[3]; g.beginPath(); g.arc(hx - hr * 0.3, hy - hr * 0.3, hr * 0.35, 0, Math.PI * 2); g.fill();
      }
      g.strokeStyle = P[2]; g.lineWidth = 2;            // a cracked windshield
      var cx = W * 0.5, cy = W * 0.68;
      for (i = 0; i < 9; i++) { var a = r.range(0, Math.PI * 2), l = r.range(W * 0.12, W * 0.3); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * l * 0.5 + r.range(-6, 6), cy + Math.sin(a) * l * 0.5); g.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); g.stroke(); }
    },
    moose: function (g, r, W, P) {
      var cx = W * 0.5, cy = W * 0.62, s = W / 320;
      g.fillStyle = P[1];
      g.beginPath(); g.arc(cx, W * 0.5, W * 0.34, 0, Math.PI * 2); g.fill();      // a big moon behind him
      g.fillStyle = P[0];
      g.beginPath();                                                                  // head + snout
      g.moveTo(cx - 34 * s, cy - 30 * s); g.quadraticCurveTo(cx, cy - 52 * s, cx + 34 * s, cy - 30 * s);
      g.lineTo(cx + 26 * s, cy + 40 * s); g.quadraticCurveTo(cx + 30 * s, cy + 92 * s, cx, cy + 96 * s); g.quadraticCurveTo(cx - 30 * s, cy + 92 * s, cx - 26 * s, cy + 40 * s); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(cx - 10 * s, cy + 90 * s); g.quadraticCurveTo(cx, cy + 130 * s, cx + 10 * s, cy + 90 * s); g.fill();   // the bell
      for (var side = -1; side <= 1; side += 2) {                                    // palmate antlers
        g.beginPath(); g.moveTo(cx + side * 28 * s, cy - 30 * s);
        g.quadraticCurveTo(cx + side * 70 * s, cy - 20 * s, cx + side * 118 * s, cy - 58 * s);
        for (var k = 0; k < 5; k++) { var tx = cx + side * (118 - k * 14) * s, ty = cy - (58 + 26 + r.range(0, 14)) * s + k * 3 * s; g.lineTo(tx, ty); g.lineTo(cx + side * (111 - k * 14) * s, cy - (70 - k * 3) * s); }
        g.quadraticCurveTo(cx + side * 60 * s, cy - 80 * s, cx + side * 30 * s, cy - 42 * s); g.closePath(); g.fill();
        g.beginPath(); g.ellipse(cx + side * 44 * s, cy - 22 * s, 16 * s, 7 * s, side * 0.5, 0, Math.PI * 2); g.fill();   // ears
      }
      g.fillStyle = P[3]; g.beginPath(); g.arc(cx - 14 * s, cy, 4.5 * s, 0, Math.PI * 2); g.arc(cx + 14 * s, cy, 4.5 * s, 0, Math.PI * 2); g.fill();   // glowing eyes
    },
    lawn: function (g, r, W, P) {
      var hz = W * 0.55;
      for (var i = 0; i < 9; i++) {                                                   // perfect mower stripes, in perspective
        g.fillStyle = i % 2 ? '#3f7a2e' : '#5c9a3e';                                  // lawns are green. Even on album covers.
        var x0 = (i / 9) * W, x1 = ((i + 1) / 9) * W;
        g.beginPath(); g.moveTo(W / 2 + (x0 - W / 2) * 0.25, hz); g.lineTo(W / 2 + (x1 - W / 2) * 0.25, hz); g.lineTo(W / 2 + (x1 - W / 2) * 2.2, W); g.lineTo(W / 2 + (x0 - W / 2) * 2.2, W); g.closePath(); g.fill();
      }
      g.fillStyle = P[0];                                                            // a riding mower, and a gnome watching
      var mx = W * 0.62, my = W * 0.8;
      g.fillRect(mx - 34, my - 20, 68, 22); g.fillRect(mx - 8, my - 44, 10, 26); g.fillRect(mx - 22, my - 48, 30, 6);
      g.beginPath(); g.arc(mx - 22, my + 4, 12, 0, Math.PI * 2); g.arc(mx + 26, my + 6, 9, 0, Math.PI * 2); g.fill();
      var gx = W * 0.26, gy = W * 0.84;
      g.fillStyle = P[1]; g.beginPath(); g.moveTo(gx - 10, gy - 20); g.lineTo(gx, gy - 48); g.lineTo(gx + 10, gy - 20); g.fill();
      g.fillStyle = P[2]; g.fillRect(gx - 9, gy - 20, 18, 22); g.beginPath(); g.arc(gx, gy - 14, 7, 0, Math.PI * 2); g.fill();
    },
    skull: function (g, r, W, P) {
      var cx = W * 0.5, cy = W * 0.6, s = W / 320;
      g.fillStyle = P[2];
      g.beginPath(); g.arc(cx, cy - 10 * s, 70 * s, Math.PI * 0.88, Math.PI * 2.12); g.lineTo(cx + 46 * s, cy + 58 * s); g.lineTo(cx - 46 * s, cy + 58 * s); g.closePath(); g.fill();
      g.fillRect(cx - 40 * s, cy + 50 * s, 80 * s, 26 * s);
      g.fillStyle = P[0];
      g.beginPath(); g.ellipse(cx - 27 * s, cy + 2 * s, 18 * s, 22 * s, 0.2, 0, Math.PI * 2); g.ellipse(cx + 27 * s, cy + 2 * s, 18 * s, 22 * s, -0.2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(cx, cy + 26 * s); g.lineTo(cx - 9 * s, cy + 44 * s); g.lineTo(cx + 9 * s, cy + 44 * s); g.closePath(); g.fill();
      for (var i = -3; i <= 3; i++) g.fillRect(cx + i * 11 * s - 1, cy + 54 * s, 2.5 * s, 22 * s);
      g.fillStyle = P[3]; g.beginPath(); g.arc(cx - 27 * s, cy + 4 * s, 5 * s, 0, Math.PI * 2); g.arc(cx + 27 * s, cy + 4 * s, 5 * s, 0, Math.PI * 2); g.fill();
      g.strokeStyle = P[2]; g.lineWidth = 7 * s; g.lineCap = 'round';             // crossed drumsticks
      g.beginPath(); g.moveTo(cx - 110 * s, cy + 110 * s); g.lineTo(cx + 110 * s, cy - 40 * s); g.moveTo(cx + 110 * s, cy + 110 * s); g.lineTo(cx - 110 * s, cy - 40 * s); g.stroke();
      g.lineCap = 'butt';
    },
    elevator: function (g, r, W, P) {
      var hz = W * 0.8;
      g.fillStyle = P[3]; g.beginPath(); g.arc(W * 0.5, hz, W * 0.36, Math.PI, 0); g.fill();   // setting sun
      g.fillStyle = shadeHex(P[1], 0.7); g.fillRect(0, hz, W, W - hz);
      g.fillStyle = P[0];
      var ex = W * 0.52, ew = W * 0.2, eh = W * 0.46;
      g.fillRect(ex - ew / 2, hz - eh, ew, eh);
      g.beginPath(); g.moveTo(ex - ew / 2 - 4, hz - eh); g.lineTo(ex, hz - eh - ew * 0.5); g.lineTo(ex + ew / 2 + 4, hz - eh); g.fill();
      g.fillRect(ex - ew * 0.2, hz - eh - ew * 0.9, ew * 0.4, ew * 0.5);
      g.beginPath(); g.moveTo(ex - ew * 0.26, hz - eh - ew * 0.9); g.lineTo(ex, hz - eh - ew * 1.15); g.lineTo(ex + ew * 0.26, hz - eh - ew * 0.9); g.fill();
      g.fillRect(ex + ew / 2, hz - eh * 0.45, ew * 0.7, eh * 0.45);           // the annex
      g.fillRect(ex - ew * 1.8, hz - 8, ew * 1.1, 8);                          // a rail car
      g.fillStyle = P[2]; g.font = '900 ' + Math.round(ew * 0.22) + 'px Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('POOL', ex, hz - eh * 0.72);
      g.strokeStyle = P[0]; g.lineWidth = 1.5;                                 // power line
      g.beginPath(); g.moveTo(0, hz - W * 0.18); g.quadraticCurveTo(W * 0.3, hz - W * 0.12, W * 0.62, hz - W * 0.2); g.quadraticCurveTo(W * 0.82, hz - W * 0.14, W, hz - W * 0.22); g.stroke();
    },
    cape: function (g, r, W, P) {
      var cx = W * 0.5, top = W * 0.36, s = W / 320;
      g.fillStyle = P[1];
      g.beginPath(); g.moveTo(cx - 40 * s, top);
      g.bezierCurveTo(cx - 120 * s, top + 80 * s, cx - 150 * s, top + 170 * s, cx - 128 * s, W * 0.98);
      for (var i = 0; i < 6; i++) g.quadraticCurveTo(cx - 128 * s + (i + 0.5) * 43 * s, W * 0.93 + (i % 2 ? 10 : -10) * s, cx - 128 * s + (i + 1) * 43 * s, W * 0.98);
      g.bezierCurveTo(cx + 150 * s, top + 170 * s, cx + 120 * s, top + 80 * s, cx + 40 * s, top); g.closePath(); g.fill();
      g.fillStyle = shadeHex(P[1], 0.6);
      g.beginPath(); g.moveTo(cx - 40 * s, top); g.lineTo(cx - 70 * s, top - 50 * s); g.lineTo(cx, top + 10 * s); g.lineTo(cx + 70 * s, top - 50 * s); g.lineTo(cx + 40 * s, top); g.closePath(); g.fill();
      g.fillStyle = P[3]; g.beginPath(); g.arc(cx, top + 6 * s, 9 * s, 0, Math.PI * 2); g.fill();
      g.strokeStyle = shadeHex(P[1], 0.7); g.lineWidth = 2;
      for (i = 0; i < 5; i++) { var fx = cx - 60 * s + i * 30 * s; g.beginPath(); g.moveTo(fx, top + 40 * s); g.quadraticCurveTo(fx + r.range(-20, 20), top + 120 * s, fx + r.range(-30, 30) * s, W * 0.94); g.stroke(); }
      g.fillStyle = P[2]; for (i = 0; i < 9; i++) star(g, r.range(W * 0.08, W * 0.92), r.range(W * 0.3, W * 0.5), r.range(2, 5));
    },
    van: function (g, r, W, P) {
      var y = W * 0.8, x = W * 0.5, s = W / 320;
      g.fillStyle = P[3];                                                      // flames (it's the Moose Hearse, and it's fine)
      for (var i = 0; i < 9; i++) { var fx = x - 90 * s + i * 22 * s, fh = r.range(60, 130) * s; g.beginPath(); g.moveTo(fx - 16 * s, y - 50 * s); g.quadraticCurveTo(fx - 4 * s, y - 50 * s - fh * 0.6, fx + r.range(-8, 8) * s, y - 50 * s - fh); g.quadraticCurveTo(fx + 10 * s, y - 50 * s - fh * 0.5, fx + 16 * s, y - 50 * s); g.fill(); }
      g.fillStyle = P[0];
      g.fillRect(x - 110 * s, y - 60 * s, 200 * s, 48 * s); g.fillRect(x + 60 * s, y - 40 * s, 50 * s, 28 * s);
      g.beginPath(); g.moveTo(x - 110 * s, y - 60 * s); g.lineTo(x - 104 * s, y - 88 * s); g.lineTo(x + 60 * s, y - 88 * s); g.lineTo(x + 86 * s, y - 60 * s); g.fill();
      g.fillStyle = P[2]; g.fillRect(x + 40 * s, y - 82 * s, 36 * s, 20 * s);
      g.fillStyle = P[0]; g.beginPath(); g.arc(x - 70 * s, y - 10 * s, 18 * s, 0, Math.PI * 2); g.arc(x + 70 * s, y - 10 * s, 18 * s, 0, Math.PI * 2); g.fill();
      g.fillStyle = P[1]; g.fillRect(0, y + 6 * s, W, W - y);
    },
    loon: function (g, r, W, P) {
      var hz = W * 0.72;
      g.fillStyle = P[2]; g.beginPath(); g.arc(W * 0.72, W * 0.42, W * 0.12, 0, Math.PI * 2); g.fill();
      g.fillStyle = shadeHex(P[1], 0.7); g.fillRect(0, hz, W, W - hz);
      g.strokeStyle = P[2]; g.globalAlpha = 0.4; g.lineWidth = 2;
      for (var i = 0; i < 8; i++) { var y = hz + 10 + i * 10; g.beginPath(); g.moveTo(W * 0.72 - 40 + r.range(-10, 10), y); g.lineTo(W * 0.72 + 40 + r.range(-10, 10), y); g.stroke(); }
      g.globalAlpha = 1; g.fillStyle = P[0];
      var bx = W * 0.4, by = hz;
      g.beginPath(); g.ellipse(bx, by - 6, 58, 18, 0, Math.PI, 0); g.fill();
      g.beginPath(); g.moveTo(bx + 34, by - 14); g.quadraticCurveTo(bx + 46, by - 58, bx + 60, by - 56); g.lineTo(bx + 90, by - 50); g.lineTo(bx + 60, by - 46); g.quadraticCurveTo(bx + 52, by - 30, bx + 50, by - 14); g.fill();
      g.fillStyle = P[2]; for (i = 0; i < 12; i++) g.fillRect(bx - 40 + i * 6, by - 16 + (i % 2) * 4, 3, 3);
      g.fillStyle = P[3]; g.beginPath(); g.arc(bx + 62, by - 52, 2.5, 0, Math.PI * 2); g.fill();
    }
  };
  MOTIF.mower = function (g, r, W, P) {
    MOTIF.lawn(g, r, W, P);
    g.fillStyle = P[3]; var mx = W * 0.62, my = W * 0.8;
    for (var i = 0; i < 7; i++) { var fx = mx - 36 + i * 12, fh = r.range(30, 70); g.beginPath(); g.moveTo(fx - 8, my - 18); g.quadraticCurveTo(fx, my - 18 - fh * 0.7, fx + r.range(-5, 5), my - 18 - fh); g.quadraticCurveTo(fx + 6, my - 18 - fh * 0.4, fx + 8, my - 18); g.fill(); }
  };
  MOTIF.aurora = function (g, r, W, P) {
    for (var b = 0; b < 4; b++) {
      g.globalAlpha = 0.35; g.strokeStyle = b % 2 ? P[1] : P[3]; g.lineWidth = 22 - b * 3;
      g.beginPath(); for (var x = 0; x <= W; x += 16) { var y = W * (0.3 + b * 0.07) + Math.sin(x / 40 + b + r.range(0, 0.4)) * 22; if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
    }
    g.globalAlpha = 1; g.fillStyle = P[0]; g.fillRect(0, W * 0.78, W, W * 0.22);
    g.fillStyle = P[2]; for (var i = 0; i < 30; i++) g.fillRect(r.range(0, W), r.range(0, W * 0.6), 1.5, 1.5);
  };
  MOTIF.lightning = function (g, r, W, P) {
    g.fillStyle = shadeHex(P[1], 0.5); g.fillRect(0, W * 0.8, W, W * 0.2);
    g.strokeStyle = P[2]; g.lineWidth = 6; g.lineJoin = 'miter'; g.shadowColor = P[3]; g.shadowBlur = 18;
    var x = W * 0.45, y = W * 0.18; g.beginPath(); g.moveTo(x, y);
    while (y < W * 0.8) { x += r.range(-34, 34); y += r.range(24, 46); g.lineTo(x, Math.min(y, W * 0.8)); }
    g.stroke(); g.shadowBlur = 0;
  };
  MOTIF.crown = function (g, r, W, P) {
    var cx = W / 2, cy = W * 0.62;
    g.fillStyle = shadeHex(P[0], 0.6); g.beginPath(); g.ellipse(cx, cy + 58, 110, 26, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = P[1]; g.beginPath(); g.moveTo(cx - 90, cy + 40);
    for (var i = 0; i <= 6; i++) { g.lineTo(cx - 90 + i * 30, i % 2 ? cy - 20 : cy - 70); }
    g.lineTo(cx + 90, cy + 40); g.closePath(); g.fill();
    g.strokeStyle = shadeHex(P[1], 0.6); g.lineWidth = 2;
    for (i = 0; i < 14; i++) { var sx = cx - 84 + i * 12; g.beginPath(); g.moveTo(sx, cy + 36); g.lineTo(sx + 4, cy - 10); g.stroke(); }
    g.fillStyle = P[3]; for (i = 0; i < 4; i++) { g.beginPath(); g.arc(cx - 60 + i * 40, cy - 72 + (i % 2) * 50, 7, 0, Math.PI * 2); g.fill(); }
  };
  MOTIF.highway = function (g, r, W, P) {
    var hz = W * 0.5;
    g.fillStyle = shadeHex(P[1], 0.6); g.fillRect(0, hz, W, W - hz);
    g.fillStyle = P[0]; g.beginPath(); g.moveTo(W / 2 - 4, hz); g.lineTo(W / 2 + 4, hz); g.lineTo(W * 0.85, W); g.lineTo(W * 0.15, W); g.closePath(); g.fill();
    g.fillStyle = P[3]; for (var i = 0; i < 7; i++) { var t = i / 7, y0 = hz + (W - hz) * t * t, h = 4 + 26 * t * t; g.fillRect(W / 2 - 1 - 4 * t, y0, 2 + 8 * t, h); }
    g.fillStyle = P[2]; g.beginPath(); g.arc(W / 2, hz - 30, 26, Math.PI, 0); g.fill();
  };
  V.MOTIFS = MOTIFS; V.FONTS = FONTS; V.PALETTES = PALETTES;
  // Draws a cover (square) into canvas. cover = { seed, palette, motif, font }; o = { title, band, size }.
  V.drawCover = function (cv, cover, o) {
    o = o || {}; cover = cover || {};
    var size = o.size || cv.width || 320, seed = (cover.seed >>> 0) || 1;
    if (cv.width !== size) { cv.width = size; cv.height = size; }
    var g = cv.getContext && cv.getContext('2d'); if (!g) return false;
    var W = size, P = paletteOf(cover.palette, seed), rng = GG.RNG(seed), font = fontOf(cover.font, GG.state && GG.state.genre);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, W);
    var gr = g.createLinearGradient(0, 0, 0, W); gr.addColorStop(0, shadeHex(P[0], 1.15)); gr.addColorStop(1, shadeHex(P[0], 0.7));
    g.fillStyle = gr; g.fillRect(0, 0, W, W);
    g.save(); g.scale(W / 320, W / 320);
    var mot = MOTIF[cover.motif] || MOTIF[MOTIFS[seed % MOTIFS.length]];
    try { mot(g, rng, 320, P); } catch (e) { /* a broken motif never breaks the screen */ }
    g.restore();
    for (var i = 0; i < 140; i++) { g.fillStyle = rng.next() < 0.5 ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.08)'; g.fillRect(rng.next() * W, rng.next() * W, 1 + rng.next() * 1.5, 1 + rng.next() * 1.5); }   // grain
    var k = W / 320;
    drawLogo(g, rng, o.band || V.bandName(), font, W / 2, W * 0.14, W * 0.88, Math.round(44 * k), P[2], P[0]);
    if (o.title) {
      var tf = font === 'metal' ? 'gothic' : font, ty = W * 0.93;
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, ty - 16 * k, W, 32 * k);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      fitFont(g, font === 'script' ? o.title : String(o.title).toUpperCase(), tf, Math.round(20 * k), W * 0.9);
      g.fillStyle = '#f6f1e4'; g.fillText(font === 'script' ? o.title : String(o.title).toUpperCase(), W / 2, ty);
    }
    if (o.sticker) {                                                       // "PARENTAL ADVISORY: MOOSE CONTENT"-style sticker
      g.fillStyle = '#111'; g.fillRect(W * 0.66, W * 0.76, W * 0.3, W * 0.1); g.fillStyle = '#fff'; g.font = '900 ' + Math.round(8 * k) + 'px Arial, sans-serif';
      g.fillText(o.sticker, W * 0.81, W * 0.81);
    }
    g.restore();
    return true;
  };
  V.coverCanvas = function (cover, o, cls, attrs) {
    var cv = el('canvas.cover' + (cls ? '.' + cls : ''), attrs || {});
    cv.width = cv.height = (o && o.size) || 320;
    V.drawCover(cv, cover, o);
    return cv;
  };

  /* ======================================================================================================
     Booking
     ====================================================================================================== */
  V.canRecord = function (st) {
    var x = V.call('canRecord', st);
    if (x && typeof x === 'object') return x;
    var era = st.era || 'garage', n = (st.songs || []).length, signed = !!(st.label && !st.label.dropped);
    return { ep: era !== 'garage' && n >= 4, album: (era === 'signed' || signed) && n >= 8, busy: !!st.session,
      why: st.session ? 'You are already in the studio.' : era === 'garage' ? 'Nobody records a garage band. Yet. Hit Local Heroes first.' : n < 4 ? 'You need at least 4 songs. Write more.' : '' };
  };
  function studioList(st) {
    var l = V.call('studios', st);
    if (!Array.isArray(l)) l = V.studios().map(function (s) { return Object.assign({}, s, { locked: s.locked || s.era === 'world' }); });
    return l;
  }
  function producerList(st) {
    var l = V.call('producers', st);
    if (!Array.isArray(l)) l = V.producers().map(function (p) { return Object.assign({}, p, { locked: p.locked || p.era === 'world' }); });
    return l;
  }
  function quote(st, o) {
    var q = V.call('sessionQuote', st, o);
    if (q && typeof q === 'object') return q;
    var sd = V.studioDef(o.studioId), pd = o.producerId ? V.producerDef(o.producerId) : null;
    var cost = ((sd.costPerWeek || 0) + (pd ? pd.costPerWeek || 0 : 0)) * o.weeks;
    var label = st.label && !st.label.dropped && st.label.labelId !== 'diy';
    return { cost: cost, paidBy: label ? 'label' : 'band', note: label ? 'The label pays, out of your advance (recoupable).' : 'You pay, from the band fund.' };
  }
  function meter(label, v, color) { return el('div.kv', [el('span', label), ui.bar(v, 100, { color: color }), el('b', String(Math.round(v || 0)))]); }
  ui.openStudioBooking = function () {
    var st = S(); if (!st) return null;
    if (st.session) return ui.openStudio();
    return ui.show('studio-book', {});
  };
  ui.define('studio-book', {
    kind: 'sheet', tall: true, title: 'Book the studio',
    build: function (s, d) {
      var st = S(); if (!st) return;
      var can = V.canRecord(st);
      s.setTitle('Book the studio', V.eraName(st.era).toUpperCase() + ' · FUND ' + U.fmtMoney(st.fund));
      if (!can.ep && !can.album) {
        ui.append(s.body, [el('div.panel', { testid: 'studio-locked' }, [el('b', 'Not yet.'), el('p.small.dim', { style: 'margin-top:4px' }, V.fill(can.why || 'Nobody is booking you studio time yet.'))])]);
        s.foot.appendChild(btn('.btn.block', { onclick: function () { ui.close(s.id); } }, 'OK'));
        return;
      }
      var studios = studioList(st), producers = producerList(st);
      var kind = d.kind && can[d.kind] ? d.kind : can.album ? 'album' : 'ep';
      var sid = d.studioId || ((studios.filter(function (x) { return !x.locked; })[0] || {}).id);
      var pid = d.producerId !== undefined ? d.producerId : null, weeks = d.weeks || 3;
      var range = KIND[kind].range, songs = (st.songs || []).slice();
      var best = GG.songs && GG.songs.best ? GG.songs.best(st, range[1]).map(function (x) { return x.id; }) : songs.slice(0, range[1]).map(function (x) { return x.id; });
      var tracks = d.tracks || best.slice(0, Math.min(range[1], best.length));
      function set(p) { s.rerender(Object.assign({}, d, { kind: kind, studioId: sid, producerId: pid, weeks: weeks, tracks: tracks }, p)); }
      // 1 kind
      s.body.appendChild(el('div.caps.step-h', '1 · What are we making?'));
      s.body.appendChild(el('div.kind-row', ['ep', 'album'].map(function (k) {
        return btn('.pick-card' + (k === kind ? '.on' : ''), { testid: 'kind-' + k, disabled: !can[k], onclick: function () {
          if (k === kind) return; var r = KIND[k].range; set({ kind: k, tracks: best.slice(0, Math.min(r[1], best.length)) });
        } }, [el('b', KIND[k].name), el('span.tiny', can[k] ? V.fill(KIND[k].blurb) : k === 'album' ? 'Needs a label deal (or DIY) and 8 songs.' : V.fill(KIND[k].blurb))]);
      })));
      // 2 studio
      s.body.appendChild(el('div.caps.step-h', '2 · Where?'));
      s.body.appendChild(el('div.stack.tight', studios.length ? studios.map(function (x) {
        return btn('.pick-card.wide' + (x.id === sid ? '.on' : '') + (x.locked ? '.locked' : ''), { testid: 'studio-' + x.id, disabled: !!x.locked, onclick: function () { if (!x.locked) set({ studioId: x.id }); } }, [
          el('div.row', [el('b.grow', x.name), el('span.tag' + (x.costPerWeek ? '' : '.amber'), x.locked ? '🔒 ' + (x.lockedWhy || 'World era') : x.costPerWeek ? U.fmtMoney(x.costPerWeek) + '/wk' : 'free')]),
          el('span.tiny.dim', [x.city ? x.city + ' · ' : '', V.fill(x.blurb || '')]),
          x.quirk ? el('span.tiny.amber', '“' + V.fill(x.quirk) + '”') : null,
          el('div.mini-meters', [meter('Sound', x.quality || 0, 'var(--blue)'), meter('Reverb', x.reverb != null ? (x.reverb <= 1 ? x.reverb * 100 : x.reverb) : 0, 'var(--purple)')])
        ]);
      }) : el('p.dim.small', 'No studios in the phone book. (Content missing.)')));
      // 3 producer
      s.body.appendChild(el('div.caps.step-h', '3 · Who is producing?'));
      var plist = [{ id: null, name: 'Nobody (you produce it)', blurb: 'Free. {front} will ask for more reverb every four minutes.', costPerWeek: 0 }].concat(producers);
      s.body.appendChild(el('div.stack.tight', plist.map(function (x) {
        var bon = [x.production ? 'Production +' + x.production : null, x.polish ? 'Polish +' + x.polish : null, x.hook ? 'Hook +' + x.hook : null].filter(Boolean);
        return btn('.pick-card.wide' + (x.id === pid ? '.on' : '') + (x.locked ? '.locked' : ''), { testid: 'producer-' + (x.id || 'none'), disabled: !!x.locked, onclick: function () { if (!x.locked) set({ producerId: x.id }); } }, [
          el('div.row', [el('b.grow', x.name), x.style ? el('span.tag', x.style) : null, el('span.tag' + (x.costPerWeek ? '' : '.amber'), x.locked ? '🔒' : x.costPerWeek ? U.fmtMoney(x.costPerWeek) + '/wk' : 'free')]),
          el('span.tiny.dim', V.fill(x.blurb || '')), bon.length ? el('span.tiny.good', bon.join(' · ')) : null
        ]);
      })));
      // 4 weeks
      s.body.appendChild(el('div.caps.step-h', '4 · How long?'));
      s.body.appendChild(el('div.chip-row', [2, 3, 4].map(function (n) {
        return btn('.btn.small' + (n === weeks ? '.primary' : ''), { testid: 'weeks-' + n, onclick: function () { set({ weeks: n }); } }, n + ' weeks');
      })));
      s.body.appendChild(el('p.tiny.dim', 'Studio weeks replace your week plan: no gigs, no rehearsals, just takes and arguments about the snare sound.'));
      // 5 tracks
      s.body.appendChild(el('div.caps.step-h', '5 · Which songs? (' + tracks.length + ' of ' + range[0] + '–' + range[1] + ')'));
      s.body.appendChild(el('div.panel.track-pick', songs.map(function (x) {
        var on = tracks.indexOf(x.id) >= 0, sc = GG.songs && GG.songs.score ? Math.round(GG.songs.score(x)) : Math.round(x.quality || 0);
        return btn('.track-opt' + (on ? '.on' : ''), { testid: 'track-' + x.id, onclick: function () {
          var t = tracks.slice(), i = t.indexOf(x.id);
          if (i >= 0) t.splice(i, 1); else if (t.length < range[1]) t.push(x.id); else { ui.toast('That is all the vinyl can hold.'); return; }
          set({ tracks: t });
        } }, [el('span.ck', on ? '✓' : ''), el('span.grow', [el('b', x.title), x.stale >= 50 ? el('span.tag', { style: 'margin-left:6px' }, 'stale') : null]), el('span.tiny.dim', 'Q ' + sc)]);
      })));
      var ok = tracks.length >= range[0] && tracks.length <= range[1] && !!sid;
      var q = quote(st, { kind: kind, studioId: sid, producerId: pid, weeks: weeks, tracks: tracks });
      var broke = q.paidBy !== 'label' && q.cost > st.fund;
      s.body.appendChild(el('div.panel.warm', { testid: 'book-cost', style: 'margin-top:12px' }, [
        el('div.row', [el('span.grow', 'Session cost'), el('b.big-num', { style: 'font-size:22px' }, U.fmtMoney(q.cost || 0))]),
        el('p.tiny.dim', V.fill(q.note || '')), broke ? el('p.small.bad', 'The fund cannot cover it. Pick a cheaper studio, or ask Mom (don’t).') : null
      ]));
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-book', disabled: !ok || broke, onclick: function () {
        if (!V.need('startSession')) return;
        var ses = V.call('startSession', S(), { kind: kind, studioId: sid, producerId: pid, weeks: weeks, tracks: tracks });
        if (!ses || ses.error) { ui.toast(ses && ses.error ? V.fill(ses.error) : 'The studio double-booked you with a polka band.', { kind: 'bad' }); return; }
        V.sfx('cash'); V.sync();
        ui.close(s.id);
        ui.toast('Booked! ' + weeks + ' studio weeks at ' + V.studioDef(sid).name + '.', { kind: 'good' });
        ui.openStudio();
      } }, ok ? 'Book it · ' + U.fmtMoney(q.cost || 0) : 'Pick ' + range[0] + '–' + range[1] + ' songs'));
    }
  });

  /* ======================================================================================================
     The session
     ====================================================================================================== */
  ui.openStudio = function (data) {
    var st = S(); if (!st || !st.session) { ui.toast('No session booked.'); return null; }
    return ui.show('studio', data || {});
  };
  function takeScore(r) {
    if (!r) return 0;
    var n = r.notes || (r.perfect + r.good + r.miss) || 1;
    return Math.round(U.clamp(100 * ((r.perfect || 0) + 0.6 * (r.good || 0)) / n, 0, 100));
  }
  V.takeScore = takeScore;
  // Play a take yourself: the gig session in studio mode (no crowd), one song (v1.1: your seat's chart; the shadow state keeps
  // the seat). done(score 0..100 | null).
  ui.playTake = function (songId, done) {
    var st = S(), song = V.song(songId);
    if (!st || !song || !ui.playGig || !GG.gig || !GG.gig.session) { if (done) done(null); return false; }
    var ses = st.session || {}, sd = V.studioDef(ses.studioId);
    var shadow = Object.assign({}, st, { liveGig: null });
    var gig = { venueId: 'studio:' + (sd.id || 'x'), name: sd.name || 'The studio', city: V.fill(sd.city || st.city || 'town'), tier: 1, kind: 'studio',
      capacity: 1, deal: 'flat', pay: 0, gas: 0, quirk: '', source: 'studio', setSize: 1 };
    return ui.playGig(gig, function (r) {
      var score = r ? takeScore(r) : null;
      if (score != null) V.call('recordTake', S(), songId, score);
      V.sync();
      if (done) done(score, r);
    }, { studio: { state: shadow, songId: songId, label: '“' + song.title + '”' }, apply: function () {} });
  };
  ui.define('studio', {
    kind: 'sheet', tall: true, title: 'In the studio',
    build: function (s, d) {
      var st = S(); if (!st) return;
      var ses = st.session;
      if (!ses) { s.body.appendChild(el('p.dim', { style: 'padding:20px 0' }, 'The session is over. The engineer has already changed the Wi-Fi password.')); return; }
      var sd = V.studioDef(ses.studioId), pd = ses.producerId ? V.producerDef(ses.producerId) : null;
      s.setTitle(sd.name, (KIND[ses.kind] || KIND.ep).name.toUpperCase() + ' SESSION · ' + (pd ? pd.name.toUpperCase() : 'SELF-PRODUCED'));
      var done = (ses.weeksDone || 0) >= (ses.weeksTotal || 1);
      s.body.appendChild(el('div.panel.reels', { testid: 'session-progress' }, [
        el('div.row', [el('span.reel' + (done ? '' : '.spin'), '◎'), el('div.grow', [el('b', done ? 'Tracking done. Time to mix.' : 'Week ' + Math.min((ses.weeksDone || 0) + 1, ses.weeksTotal) + ' of ' + ses.weeksTotal),
          ui.bar(ses.weeksDone || 0, ses.weeksTotal || 1, { color: 'var(--red)' })]), el('span.reel' + (done ? '' : '.spin'), '◎')]),
        meter('Production', ses.production || 0, 'var(--amber)'),
        el('p.tiny.dim', [ses.cost ? 'Session cost ' + U.fmtMoney(ses.cost) + '. ' : '', sd.quirk ? '“' + V.fill(sd.quirk) + '”' : ''])
      ]));
      var ev = (ses.events || []).slice(-4).reverse();
      s.body.appendChild(el('div.caps.step-h', 'Studio log'));
      s.body.appendChild(el('div.panel.studio-log', { testid: 'session-events' }, ev.length ? ev.map(function (t, i) {
        return el('div.log-line' + (i === 0 ? '.new' : ''), [el('span.ic', '▸'), el('span', V.fill(typeof t === 'string' ? t : t.text || ''))]);
      }) : el('p.small.dim', 'Nothing yet. The engineer is eating a sandwich over the console.')));
      var strSeat = GG.career.seatOf && GG.career.seatOf(st) !== 'drums';   // v1.1: "{instrument} takes" (your seat's chart when you play one)
      s.body.appendChild(el('div.caps.step-h', { testid: 'takes-head' }, (strSeat ? ui.cap(V.fill('{instrument}')) : 'Drum') + ' takes · your chops ' + Math.round(st.drumSkill || 0)));
      s.body.appendChild(el('p.tiny.dim', { style: 'margin-bottom:6px' }, 'Takes run off your chops. Or play one yourself: the best take counts.'));
      s.body.appendChild(el('div.panel', (ses.tracks || []).map(function (id) {
        var t = ses.takes && ses.takes[id], song = V.song(id);
        return el('div.take-row', { testid: 'take-' + id }, [
          el('div.grow', [el('b', song ? song.title : '?'), el('div.row', { style: 'gap:6px' }, [ui.bar(t || 0, 100, { color: t >= 80 ? 'var(--good)' : t >= 55 ? 'var(--amber)' : 'var(--bad)' }),
            el('span.tiny' + (t == null ? '.dim' : ''), t == null ? 'not tracked' : String(Math.round(t)))])]),
          btn('.btn.small', { testid: 'btn-play-take-' + id, onclick: function () {
            ui.playTake(id, function (score) {
              if (score == null) return;
              var best = (S().session && S().session.takes || {})[id];
              ui.show('studio', {});
              ui.toast(score >= (best || 0) && score > (t || 0) ? 'Take ' + score + '. That is the one. (Producer nods.)' : 'Take ' + score + '. Keeping the better one (' + Math.round(best || t || 0) + ').', { kind: score >= 70 ? 'good' : '' });
            });
          } }, strSeat ? '🎸 Play' : '🥁 Play')
        ]);
      })));
      var rec = V.call('pending', st), weekGo = st.phase === 'plan' && V.call('inSession', st);
      if (weekGo && ui.runStudioWeek) ui.append(s.foot, [btn('.btn.ghost', { testid: 'btn-studio-close', onclick: function () { ui.close(s.id); } }, 'Later'),
        btn('.btn.primary.big.grow', { testid: 'btn-studio-go', onclick: function () { ui.runStudioWeek(); } }, 'Record this week 🎙')]);
      else if (done && (!rec || rec.status === 'recorded')) s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-mix', onclick: function () { ui.close(s.id); ui.openRelease(); } }, 'Mix it & plan the release'));
      else s.foot.appendChild(btn('.btn.block', { testid: 'btn-studio-close', onclick: function () { ui.close(s.id); } }, 'Back to ' + ui.space(st)));
    }
  });

  /* ======================================================================================================
     Release wizard: tracklist → title → cover → release week
     ====================================================================================================== */
  var STEPS = [{ id: 'tracks', label: 'Tracks' }, { id: 'title', label: 'Title' }, { id: 'cover', label: 'Cover' }, { id: 'week', label: 'Release' }];
  function promoOptions(st) {
    var x = V.call('promoOptions', st);
    if (Array.isArray(x) && x.length) return x;
    return [{ id: 0, name: 'Word of mouth', cost: 0, blurb: '{filler} tells some cousins.' }, { id: 1, name: 'Posters on every pole', cost: 60, blurb: 'Staples: 4,000. Poles: 3.' },
      { id: 2, name: 'Campus radio push', cost: 180, blurb: 'The DJ pronounces the band name wrong on air. Twice.' }, { id: 3, name: 'A billboard in {city}', cost: 450, blurb: 'Visible from the Tim Norton’s drive-thru.' }];
  }
  function releaseWeeks(st) {
    var x = V.call('releaseWeeks', st);
    if (Array.isArray(x) && x.length) return x;
    return [2, 3, 4, 5, 6].map(function (n) { return st.totalWeek + n; });
  }
  function score(song) { return song ? (GG.songs && GG.songs.score ? GG.songs.score(song) : song.quality || 0) : 0; }
  function tips(ids) {
    var songs = ids.map(function (id) { return V.song(id); }), sc = songs.map(score), max = Math.max.apply(null, sc.concat([0]));
    var sorted = sc.slice().sort(function (a, b) { return b - a; }), top2 = sorted[1] != null ? sorted[1] : sorted[0];
    return [
      { ok: sc[0] >= top2 - 0.01, text: sc[0] >= top2 - 0.01 ? 'Strong opener.' : 'Open with one of your two strongest songs.' },
      { ok: sc[sc.length - 1] >= top2 - 0.01 || (songs[songs.length - 1] || {}).classic, text: sc[sc.length - 1] >= top2 - 0.01 ? 'Big closer.' : 'Close on a big one (your best or a classic).' },
      { ok: true, text: 'Best song: “' + (songs[sc.indexOf(max)] || {}).title + '”.' }
    ];
  }
  ui.openRelease = function (done) {
    var st = S(); if (!st) return null;
    var ses = st.session, ids = V.call('defaultTracklist', st);
    if (!Array.isArray(ids) || !ids.length) ids = ses && ses.tracks ? ses.tracks.slice() : (GG.songs && GG.songs.best ? GG.songs.best(st, 5).map(function (x) { return x.id; }) : []);
    var draft = { step: 'tracks', tracks: ids, single: null, titles: null, titleIdx: 0, custom: '', covers: null, coverIdx: 0, roll: 0, croll: 0, week: null, promo: [] };
    var best = ids.reduce(function (a, id) { return score(V.song(id)) > score(V.song(a)) ? id : a; }, ids[0]);
    draft.single = best || null;
    return ui.show('release', { draft: draft, done: done });
  };
  function titleOf(D) { return (D.custom && D.custom.trim()) || (D.titles && D.titles[D.titleIdx]) || 'Untitled'; }
  ui.define('release', {
    kind: 'full', cls: 'release',
    build: function (s, d) {
      var st = S(), D = d.draft; if (!st || !D) return;
      if (!D.titles) D.titles = V.titleOptions(st, 3, D.roll);
      if (!D.covers) D.covers = V.coverOptions(st, 4, D.croll);
      var weeks = releaseWeeks(st).slice(0, 6); if (D.week == null) D.week = weeks[0];
      var band = V.bandName(st), si = STEPS.map(function (x) { return x.id; }).indexOf(D.step);
      function go(step) { D.step = step; s.rerender(d); s.body.scrollTop = 0; }
      ui.append(s.body, [
        el('div.rel-head', [el('div.caps', 'The release'), el('h2.display', { style: 'font-size:24px' }, titleOf(D))]),
        el('div', { style: 'margin:10px 0 12px' }, ui.tabs(STEPS, D.step, go, 'rel-tab-'))
      ]);
      if (D.step === 'tracks') {
        s.body.appendChild(el('p.small.dim', { style: 'margin-bottom:8px' }, 'Order matters: the opener hooks them, the closer sends them home. Star the lead single.'));
        s.body.appendChild(el('div.panel.rel-list', D.tracks.map(function (id, i) {
          var song = V.song(id), n = D.tracks.length;
          function mv(k) { var t = D.tracks.slice(), j = i + k; if (j < 0 || j >= n) return; t[i] = t[j]; t[j] = id; D.tracks = t; s.rerender(d); }
          return el('div.rel-row' + (D.single === id ? '.single' : ''), { testid: 'rel-row-' + i }, [
            el('span.rel-n', String(i + 1)),
            el('div.grow', [el('b', song ? song.title : '?'), el('div.tiny.dim', [i === 0 ? el('span.tag.amber', 'opener') : null, i === n - 1 ? el('span.tag.amber', 'closer') : null, D.single === id ? el('span.tag.gold', '★ single') : null, ' Q ' + Math.round(score(song))])]),
            btn('.icon-btn', { testid: 'btn-single-' + i, 'aria-label': 'Lead single', onclick: function () { D.single = id; s.rerender(d); } }, D.single === id ? '★' : '☆'),
            btn('.icon-btn', { testid: 'btn-up-' + i, 'aria-label': 'Move up', disabled: i === 0, onclick: function () { mv(-1); } }, '▲'),
            btn('.icon-btn', { testid: 'btn-down-' + i, 'aria-label': 'Move down', disabled: i === n - 1, onclick: function () { mv(1); } }, '▼')
          ]);
        })));
        s.body.appendChild(el('div.stack.tight', { style: 'margin-top:10px' }, tips(D.tracks).map(function (t) { return el('div.warn-row', [el('span.ic', t.ok ? '✓' : '•'), el('span.small' + (t.ok ? '.good' : ''), t.text)]); })));
      } else if (D.step === 'title') {
        s.body.appendChild(el('p.small.dim', { style: 'margin-bottom:8px' }, 'Three ideas from the band chat. Or type your own.'));
        D.titles.forEach(function (t, i) {
          s.body.appendChild(btn('.choice' + (!D.custom && D.titleIdx === i ? '.on' : ''), { testid: 'title-opt-' + i, onclick: function () { D.titleIdx = i; D.custom = ''; s.rerender(d); } },
            [el('span.cl', t), el('span.ch', titleReact(t))]));
        });
        var inp = el('input.text-in', { testid: 'title-input', type: 'text', maxLength: 40, placeholder: 'Type your own title…', value: D.custom || '' });
        inp.addEventListener('input', function () { D.custom = inp.value; var h = s.body.querySelector('.rel-head h2'); if (h) h.textContent = titleOf(D); });
        inp.addEventListener('change', function () { D.custom = inp.value; });
        s.body.appendChild(el('label.caps', { style: 'display:block;margin:12px 0 6px' }, 'Your own'));
        s.body.appendChild(inp);
        s.body.appendChild(btn('.btn.ghost.block', { testid: 'btn-more-titles', style: 'margin-top:12px', onclick: function () { D.roll++; D.titles = V.titleOptions(st, 3, D.roll); D.titleIdx = 0; D.custom = ''; s.rerender(d); } }, 'More ideas ↻'));
      } else if (D.step === 'cover') {
        var t = titleOf(D);
        s.body.appendChild(el('div.cover-big', V.coverCanvas(D.covers[D.coverIdx], { title: t, band: band, size: 320 }, 'big', { testid: 'cover-preview' })));
        s.body.appendChild(el('div.cover-grid', D.covers.map(function (c, i) {
          return btn('.cover-opt' + (i === D.coverIdx ? '.on' : ''), { testid: 'cover-' + i, 'aria-label': 'Cover ' + (i + 1) + ': ' + c.motif, onclick: function () { D.coverIdx = i; s.rerender(d); } },
            [V.coverCanvas(c, { title: t, band: band, size: 160 }), el('span.tiny', String(c.motif || '').replace(/_/g, ' '))]);
        })));
        s.body.appendChild(btn('.btn.ghost.block', { testid: 'btn-more-covers', style: 'margin-top:10px', onclick: function () { D.croll++; D.covers = V.coverOptions(st, 4, D.croll); D.coverIdx = 0; s.rerender(d); } }, 'Different covers ↻'));
      } else {
        s.body.appendChild(el('div.caps.step-h', 'Release week (at least 2 weeks out)'));
        s.body.appendChild(el('div.chip-row', weeks.map(function (w) {
          return btn('.btn.small' + (w === D.week ? '.primary' : ''), { testid: 'rel-week-' + (w - st.totalWeek), onclick: function () { D.week = w; s.rerender(d); } }, 'In ' + (w - st.totalWeek) + ' wks');
        })));
        s.body.appendChild(el('p.tiny.dim', V.weekLabel(D.week) + (D.week % C.WEEKS_PER_YEAR === C.LOONIES_WEEK % C.WEEKS_PER_YEAR ? ' · Loonies week!' : '') + '. Plan Promote blocks before launch to juice week-one sales.'));
        s.body.appendChild(el('div.caps.step-h', 'Promo'));
        var popts = promoOptions(st), label = st.label && !st.label.dropped && st.label.labelId !== 'diy';
        s.body.appendChild(el('div.stack.tight', popts.map(function (p) {
          var id = p.id != null ? p.id : p.level, on = D.promo.indexOf(id) >= 0, pays = p.labelPays != null ? p.labelPays : label;
          return btn('.pick-card.wide' + (on ? '.on' : ''), { testid: 'promo-' + id, disabled: p.bought || (p.affordable === false && !on), onclick: function () {
            var i = D.promo.indexOf(id); if (i >= 0) D.promo.splice(i, 1); else D.promo.push(id); s.rerender(d);
          } }, [el('div.row', [el('span.ck', on || p.bought ? '✓' : ''), el('b.grow', V.fill(p.name)), el('span.tag' + (p.cost ? '' : '.amber'), p.bought ? 'bought' : p.cost ? (pays ? 'label pays' : U.fmtMoney(p.cost)) : 'free')]),
            el('span.tiny.dim', V.fill(p.blurb || (p.promo ? 'Hype +' + p.promo : '')))]);
        })));
        var cov = D.covers[D.coverIdx];
        s.body.appendChild(el('div.panel.warm.rel-sum', { testid: 'rel-summary', style: 'margin-top:12px' }, [
          el('div.row', [V.coverCanvas(cov, { title: titleOf(D), band: band, size: 160 }, 'thumb'), el('div.grow', [
            el('b', titleOf(D)), el('div.tiny.dim', (D.tracks.length >= 8 ? 'Album' : 'EP') + ' · ' + D.tracks.length + ' songs'),
            el('div.tiny', '★ ' + V.songTitle(D.single)), el('div.tiny.dim', 'Out ' + V.weekLabel(D.week))])])
        ]));
      }
      if (si < STEPS.length - 1) s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-rel-next', onclick: function () { go(STEPS[si + 1].id); } }, 'Next: ' + STEPS[si + 1].label + ' ▸'));
      else s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-release', onclick: function () {
        if (!V.need('release')) return;
        var cov = D.covers[D.coverIdx], title = titleOf(D).slice(0, 40);
        var album = V.call('release', S(), { title: title, cover: cov, tracks: D.tracks.slice(), single: D.single, week: D.week, promo: D.promo });
        if (!album || album.error) { ui.toast(album && album.error ? V.fill(album.error) : 'The pressing plant lost the masters. Try again.', { kind: 'bad' }); return; }
        V.sfx('cheer'); V.sync();
        ui.close(s.id);
        ui.toast('“' + title + '” comes out ' + V.weekLabel(D.week) + '. ' + V.fill('{front} has already ordered an outfit to match the cover.'), { kind: 'good' });
        if (d.done) setTimeout(function () { d.done(album); }, 0);
      } }, 'Release it! 💿'));
    }
  });

  GG.registerDebug('uiStudio', function () {
    var st = S(), ses = st && st.session;
    return { session: ses ? { kind: ses.kind, studio: ses.studioId, weeks: (ses.weeksDone || 0) + '/' + ses.weeksTotal, tracks: (ses.tracks || []).length } : null,
      missing: ['canRecord', 'studios', 'producers', 'sessionQuote', 'startSession', 'recordTake', 'titleOptions', 'coverOptions', 'releaseWeeks', 'promoOptions', 'release'].filter(function (n) { return !V.api(n); }) };
  });
})(window.GG);
