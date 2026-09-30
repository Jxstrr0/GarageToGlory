// 46_render_logo.js (v0.8.1, Addendum 2 D2, LOGO): draws a band logo procedurally onto a canvas (no image files): the band's
// name in one of four lettering styles over an emblem, in a curated colour pair (content/logo.js). Every canvas is cached
// (small LRU by logo + name + size + options), so the kick drum, the merch table, the van, Bandbook, the garage banner, the
// Loonies and the Scene leaderboard all reuse the same pixels.
// API (GG.render.logo):
//   canvas(logo, bandName, size, opts?) -> HTMLCanvasElement (cached; never draw on it)
//     opts: { shape: 'square' (default) | 'wide' (2:1, or aspect: n), badge: false | 'circle' | 'round' (a ground-coloured backing),
//             mini: auto (size < 72: the emblem + initials; the name can't be read that small anyway),
//             plain: the emblem alone, textOnly: the lettering alone (the picker's buttons) }
//   texture(logo, bandName, size, opts?) -> THREE.CanvasTexture (a new texture over the cached canvas; the caller disposes it)
//   dataURL(logo, bandName, size, opts?) -> 'data:image/png…' (cached; for <img> and SVG <image>)
//   forState(state, size, opts?) / nameOf(state) ; forRival(id, name, size, opts?) (GG.logo.rival's fixed logo)
//   head(g, o) -> true (the kick-drum head 'logo' art on R.kit.headArt's 256px canvas: o = { band, genre, logo? })
//   merch(logo, bandName, itemId, size) -> canvas (the item with the logo printed on it: shirt, hoodie, sticker, patch, tape,
//     trucker, toque, vinyl, bobblehead, cape, pins, keychain, hat, the misprint (printed crooked))
//   palette(logo) -> { fg, em, ground, hi, lo } ; info() -> { cached, draws, hits, urls }
// Lettering: metal = a serif name grown symmetric spikes and roots (unreadable, as tradition demands); punk = ransom-note
// letters on torn paper patches (seeded by the name); rock = italic chrome with a block extrude and a sparkle; country = slab
// letters on an arch with a hard drop shadow and stars. No gong anywhere, ever.
(function (GG) {
  var R = GG.render = GG.render || {};
  var LG = R.logo = {};
  var cache = [], urls = {}, MAX = 72, stat = { draws: 0, hits: 0, urls: 0 };

  /* ---- Colours ------------------------------------------------------------------------------------------------------ */
  function rgb(h) { h = String(h || '#000').replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; var n = parseInt(h, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function hex(c) { return '#' + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function mix(a, b, t) { var A = rgb(a), B = rgb(b); return hex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]); }
  function shade(a, f) { var A = rgb(a); return hex([A[0] * f, A[1] * f, A[2] * f]); }
  function lum(a) { var A = rgb(a); return (0.299 * A[0] + 0.587 * A[1] + 0.114 * A[2]) / 255; }
  function rgba(a, al) { var A = rgb(a); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + al + ')'; }
  function sane(lg) { return GG.logo ? GG.logo.sanitize(lg) : (lg || { emblem: 'skull', style: 'metal', palette: 'frost' }); }
  LG.palette = function (lg) {
    lg = sane(lg);
    var p = (GG.logo && GG.logo.palette(lg.palette)) || { fg: '#f2efe6', em: '#b3141c', ground: '#121216' };
    return { fg: p.fg, em: p.em, ground: p.ground, hi: mix(p.em, '#ffffff', 0.42), lo: shade(p.em, 0.58), light: lum(p.ground) > 0.5 };
  };

  /* ---- Canvas plumbing ---------------------------------------------------------------------------------------------- */
  function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function tint(M, fill) {
    var C = mk(M.width, M.height), g = C.getContext('2d');
    g.drawImage(M, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = fill; g.fillRect(0, 0, C.width, C.height);
    return C;
  }
  function ring(M, color, r) {   // M grown by r px in one colour (an outline when the fill goes on top)
    var C = mk(M.width, M.height), g = C.getContext('2d'), T = tint(M, color), n = r > 6 ? 20 : 14;
    for (var k = 0; k < n; k++) { var a = k / n * Math.PI * 2; g.drawImage(T, Math.cos(a) * r, Math.sin(a) * r); }
    g.drawImage(T, 0, 0);
    return C;
  }
  function union(M, dx, dy, steps) { var C = mk(M.width, M.height), g = C.getContext('2d'); for (var k = 0; k <= steps; k++) g.drawImage(M, dx * k / steps, dy * k / steps); return C; }

  /* ---- Emblems (drawn in a ±50 box; outline = ground, body = em, details in hi / lo / ground) -------------------------- */
  var OUT = 3.4;
  function ell(g, x, y, rx, ry, rot) { g.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); }
  function poly(g, pts) { g.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
  function rrect(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function circ(g, x, y, r) { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); }
  // parts: [[traceFn(g), fill]] -> one outline around the union, then the fills in order
  function blob(g, P, parts) {
    g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = P.ground; g.lineWidth = OUT * 2;
    parts.forEach(function (p) { g.beginPath(); p[0](g); g.stroke(); });
    parts.forEach(function (p) { g.beginPath(); p[0](g); g.fillStyle = p[1]; g.fill(); });
  }
  function lines(g, color, w, segs, outline) {   // polylines; outline: ground first
    g.lineJoin = 'round'; g.lineCap = 'round';
    if (outline) { g.strokeStyle = outline; g.lineWidth = w + OUT * 2; segs.forEach(function (s) { g.beginPath(); g.moveTo(s[0][0], s[0][1]); for (var i = 1; i < s.length; i++) g.lineTo(s[i][0], s[i][1]); g.stroke(); }); }
    g.strokeStyle = color; g.lineWidth = w;
    segs.forEach(function (s) { g.beginPath(); g.moveTo(s[0][0], s[0][1]); for (var i = 1; i < s.length; i++) g.lineTo(s[i][0], s[i][1]); g.stroke(); });
  }
  function dot(g, color, x, y, rx, ry, rot) { g.beginPath(); ell(g, x, y, rx, ry || rx, rot); g.fillStyle = color; g.fill(); }
  var EMB = {
    skull: function (g, P) {
      blob(g, P, [[function (g) { ell(g, 0, -8, 35, 33); }, P.em], [function (g) { rrect(g, -21, 6, 42, 32, 9); }, P.em]]);
      g.beginPath(); g.arc(-2, -10, 26, Math.PI * 1.08, Math.PI * 1.42); g.strokeStyle = P.hi; g.lineWidth = 4; g.stroke();
      dot(g, P.ground, -13, -3, 10, 11); dot(g, P.ground, 13, -3, 10, 11);
      g.beginPath(); poly(g, [[0, 6], [-5.5, 16], [5.5, 16]]); g.fillStyle = P.ground; g.fill();
      lines(g, P.ground, 2.6, [[[-19, 29], [19, 29]], [[-12, 22], [-12, 37]], [[-5, 22], [-5, 37]], [[2, 22], [2, 37]], [[9, 22], [9, 37]], [[15, 23], [15, 36]]]);
      lines(g, P.ground, 2, [[[9, -40], [4, -32], [10, -26], [6, -19]]]);
    },
    wheat: function (g, P) {
      var parts = [], A = [-0.42, 0, 0.42];
      [-18, -9, 0, 9, 18].forEach(function (x) { parts.push([function (g) { poly(g, [[-1.8, 14], [1.8, 14], [x + 1.8, 46], [x - 1.8, 46]]); }, P.lo]); });
      A.forEach(function (a) {
        var tx = Math.sin(a) * 50, ty = 14 - Math.cos(a) * 50, nx = Math.cos(a), ny = Math.sin(a);
        parts.push([function (g) { poly(g, [[-1.8 * nx, 14 - 1.8 * ny], [1.8 * nx, 14 + 1.8 * ny], [tx + 1.8 * nx, ty + 1.8 * ny], [tx - 1.8 * nx, ty - 1.8 * ny]]); }, P.lo]);
        for (var k = 0; k < 5; k++) {
          var t = 0.5 + k * 0.1, cx = tx * t, cy = 14 + (ty - 14) * t;
          [-1, 1].forEach(function (sd) { var ex = cx + sd * 4.2 * nx, ey = cy + sd * 4.2 * ny; parts.push([function (g) { ell(g, ex, ey, 3.8, 7, a + sd * 0.45); }, P.em]); });
        }
        parts.push([function (g) { ell(g, tx, ty, 3.6, 7, a); }, P.em]);
      });
      parts.push([function (g) { rrect(g, -12, 9, 24, 9, 3); }, P.hi]);
      blob(g, P, parts);
      lines(g, P.lo, 1.6, [[[-11, 13.5], [11, 13.5]]]);
    },
    bolt: function (g, P) {
      blob(g, P, [[function (g) { poly(g, [[14, -50], [-26, 6], [-3, 6], [-16, 50], [28, -10], [5, -10], [20, -50]]); }, P.em]]);
      lines(g, P.hi, 3, [[[12, -44], [-18, 2]], [[-6, 12], [-11, 36]]]);
    },
    moose: function (g, P) {
      var parts = [];
      [-1, 1].forEach(function (s) {
        parts.push([function (g) { poly(g, [[s * 10, -8], [s * 18, -27], [s * 22, -18], [s * 27, -38], [s * 31, -22], [s * 38, -40], [s * 41, -23], [s * 49, -31], [s * 48, -12], [s * 36, -5], [s * 16, -2]]); }, P.hi]);
        parts.push([function (g) { ell(g, s * 21, -3, 9, 4.5, s * 0.45); }, P.em]);
      });
      parts.push([function (g) { ell(g, 0, 8, 18, 27); }, P.em], [function (g) { ell(g, 0, 33, 15, 12); }, P.lo], [function (g) { ell(g, 0, 47, 4, 6); }, P.lo]);
      blob(g, P, parts);
      dot(g, P.ground, -8, 4, 3.2); dot(g, P.ground, 8, 4, 3.2); dot(g, P.ground, -5, 36, 2.6, 3.2); dot(g, P.ground, 5, 36, 2.6, 3.2);
    },
    maple: function (g, P) {
      blob(g, P, [[function (g) {
        poly(g, [[0, -50], [9, -33], [18, -38], [14, -15], [30, -28], [35, -19], [47, -24], [41, -6], [49, -1], [26, 14], [30, 25], [4, 20], [4, 45], [-4, 45], [-4, 20],
          [-30, 25], [-26, 14], [-49, -1], [-41, -6], [-47, -24], [-35, -19], [-30, -28], [-14, -15], [-18, -38], [-9, -33]]);
      }, P.em]]);
      lines(g, P.lo, 1.8, [[[0, 22], [0, -36]], [[0, 8], [28, -16]], [[0, 8], [-28, -16]], [[0, 16], [22, 12]], [[0, 16], [-22, 12]]]);
    },
    gopher: function (g, P) {
      blob(g, P, [[function (g) { ell(g, 21, 34, 6.5, 13, 0.6); }, P.lo], [function (g) { ell(g, 0, 14, 19, 27); }, P.em], [function (g) { ell(g, 0, -22, 15, 13); }, P.em],
        [function (g) { circ(g, -9, -32, 4.5); circ(g, 9, -32, 4.5); }, P.em], [function (g) { ell(g, -10, 41, 9, 4.5); ell(g, 10, 41, 9, 4.5); }, P.lo]]);
      dot(g, P.hi, 0, 18, 11, 19); dot(g, P.lo, -7, -3, 5, 4); dot(g, P.lo, 7, -3, 5, 4);
      dot(g, P.ground, -6, -24, 2.6); dot(g, P.ground, 6, -24, 2.6); dot(g, P.ground, 0, -17, 3, 2.2);
      g.fillStyle = '#f6f2e8'; g.fillRect(-2.6, -14.5, 5.2, 4.5);
    },
    anvil: function (g, P) {
      lines(g, P.hi, 3, [[[-6, -30], [-14, -44]], [[4, -31], [6, -48]], [[14, -30], [25, -43]]], P.ground);
      blob(g, P, [[function (g) {
        poly(g, [[-49, -16], [-20, -24], [40, -24], [40, -8], [22, -8], [13, 7], [13, 18], [30, 30], [30, 41], [-30, 41], [-30, 30], [-13, 18], [-13, 7], [-20, -6], [-30, -9]]);
      }, P.em]]);
      lines(g, P.hi, 3, [[[-18, -20], [37, -20]]]);
      lines(g, P.lo, 2.4, [[[-26, 35], [26, 35]]]);
    },
    hailstone: function (g, P) {
      lines(g, P.hi, 2.4, [[[22, -18], [32, -34]], [[30, -8], [42, -24]], [[-40, -40], [-34, -48]], [[40, 22], [44, 16]]], P.ground);
      function lump(k) { return function (g) { var pts = []; for (var i = 0; i < 28; i++) { var a = i / 28 * Math.PI * 2, r = (31 + 2.6 * Math.sin(5 * a) + 1.8 * Math.sin(9 * a + 1)) * k; pts.push([2 + r * Math.cos(a), 6 + r * Math.sin(a)]); } poly(g, pts); }; }
      blob(g, P, [[lump(1), P.em], [function (g) { circ(g, -35, -30, 7); }, P.em], [function (g) { circ(g, 36, 30, 5.5); }, P.em], [function (g) { circ(g, -38, 34, 5); }, P.em]]);
      g.lineWidth = 2.2; g.strokeStyle = P.lo;
      g.beginPath(); lump(0.66)(g); g.stroke(); g.beginPath(); lump(0.34)(g); g.stroke();
      g.beginPath(); g.arc(-4, 0, 21, Math.PI * 1.05, Math.PI * 1.45); g.strokeStyle = P.hi; g.lineWidth = 4.5; g.stroke();
    },
    elevator: function (g, P) {
      blob(g, P, [[function (g) { poly(g, [[18, 8], [43, 17], [43, 46], [18, 46]]); }, shade(P.em, 0.8)], [function (g) { poly(g, [[-18, -30], [18, -30], [18, 46], [-18, 46]]); }, P.em],
        [function (g) { poly(g, [[-22, -28], [0, -44], [22, -28]]); }, P.lo], [function (g) { rrect(g, -6, -53, 12, 12, 1); }, P.em], [function (g) { poly(g, [[-9, -52], [0, -60], [9, -52]]); }, P.lo]]);
      g.fillStyle = P.ground; g.fillRect(-18, -22, 36, 6); g.fillRect(-6, 30, 12, 16);
      lines(g, P.lo, 1.5, [[[-9, -12], [-9, 44]], [[0, -12], [0, 28]], [[9, -12], [9, 44]], [[26, 22], [26, 44]], [[34, 25], [34, 44]]]);
      g.fillStyle = P.hi; [-12, -3, 6].forEach(function (x) { g.fillRect(x, -21, 5, 4); });
    },
    cowboy_hat: function (g, P) {
      blob(g, P, [[function (g) { g.moveTo(-25, 18); g.bezierCurveTo(-28, -4, -26, -31, -12, -31); g.quadraticCurveTo(0, -22, 12, -31); g.bezierCurveTo(26, -31, 28, -4, 25, 18); g.closePath(); }, P.em],
        [function (g) { rrect(g, -25.5, 5, 51, 10, 2); }, P.lo],
        [function (g) { g.moveTo(-50, -1); g.quadraticCurveTo(-34, 30, 0, 30); g.quadraticCurveTo(34, 30, 50, -1); g.quadraticCurveTo(36, 17, 0, 17); g.quadraticCurveTo(-36, 17, -50, -1); g.closePath(); }, P.em]]);
      lines(g, P.lo, 2.4, [[[0, -22], [0, 0]]]);
      g.fillStyle = P.hi; g.fillRect(-4, 6.5, 8, 7);
      lines(g, P.hi, 2.2, [[[-38, 8], [-14, 21]], [[-17, -20], [-19, 0]]]);
    },
    safety_pin: function (g, P) {
      var segs = [[[-32, -8], [36, -8]], [[-40, 8], [36, 8]]];
      lines(g, P.em, 7, segs, P.ground);
      g.beginPath(); g.arc(38, 0, 8, 0, Math.PI * 2); g.strokeStyle = P.ground; g.lineWidth = 7 + OUT * 2; g.stroke(); g.strokeStyle = P.em; g.lineWidth = 7; g.stroke();
      blob(g, P, [[function (g) { rrect(g, -50, -14, 22, 24, 6); }, P.lo]]);
      lines(g, P.hi, 2, [[[-22, -9.5], [30, -9.5]], [[-22, 6.5], [30, 6.5]]]);
      g.fillStyle = P.hi; g.fillRect(-46, -10, 4, 16);
    },
    flaming_tire: function (g, P) {
      var outer = [], inner = [], hot = mix(P.em, '#ffe36a', 0.6);
      for (var k = 0; k < 7; k++) {
        (function (k) {
          var x = -30 + k * 10, h = 34 + ((k * 37) % 17), lean = k % 2 ? 5 : -5;
          outer.push([function (g) { g.moveTo(x - 10, 12); g.quadraticCurveTo(x - 11, 12 - h * 0.5, x + lean, 12 - h); g.quadraticCurveTo(x + 7, 12 - h * 0.45, x + 10, 12); g.closePath(); }, P.em]);
          inner.push([function (g) { g.moveTo(x - 5, 12); g.quadraticCurveTo(x - 5, 12 - h * 0.35, x + lean * 0.6, 12 - h * 0.68); g.quadraticCurveTo(x + 4, 12 - h * 0.3, x + 5, 12); g.closePath(); }, hot]);
        })(k);
      }
      blob(g, P, outer);
      inner.forEach(function (p) { g.beginPath(); p[0](g); g.fillStyle = p[1]; g.fill(); });
      var rub = mix(shade(P.em, 0.3), '#26262a', 0.55);
      blob(g, P, [[function (g) { circ(g, 0, 18, 30); }, rub]]);
      g.fillStyle = P.hi;
      for (var t = 0; t < 14; t++) { g.save(); g.translate(0, 18); g.rotate(t / 14 * Math.PI * 2); g.fillRect(-2.2, -30, 4.4, 5); g.restore(); }
      g.beginPath(); circ(g, 0, 18, 14); g.fillStyle = P.hi; g.fill();
      g.beginPath(); circ(g, 0, 18, 5); g.fillStyle = P.lo; g.fill();
      for (t = 0; t < 5; t++) { var a = t / 5 * Math.PI * 2; dot(g, P.ground, Math.cos(a) * 9, 18 + Math.sin(a) * 9, 1.8); }
    },
    curling_stone: function (g, P) {
      blob(g, P, [[function (g) { rrect(g, -41, 4, 82, 34, 15); }, shade(P.em, 0.72)], [function (g) { ell(g, 0, 8, 39, 12); }, P.em],
        [function (g) { rrect(g, -9, -22, 11, 30, 4); }, P.hi], [function (g) { rrect(g, -9, -30, 46, 11, 5.5); }, P.hi]]);
      g.fillStyle = P.ground; g.fillRect(-40, 20, 80, 4.5);
      var h = 7; g.fillStyle = P.hi;
      for (var k = 0; k < 16; k++) { h = (h * 31 + 11) % 97; g.fillRect(-34 + (h % 68), 26 + (k % 3) * 3.4, 1.8, 1.8); }
    },
    mosquito: function (g, P) {
      g.beginPath(); ell(g, -18, -18, 20, 8, -0.55); ell(g, 18, -18, 20, 8, 0.55);
      g.fillStyle = rgba(P.hi, 0.55); g.strokeStyle = P.ground; g.lineWidth = 2.2; g.fill(); g.stroke();
      var legs = [[[-4, -2], [-24, 6], [-34, 30]], [[-4, 2], [-18, 18], [-24, 46]], [[-3, -6], [-26, -6], [-44, 6]]];
      legs = legs.concat(legs.map(function (l) { return l.map(function (p) { return [-p[0], p[1]]; }); }));
      lines(g, P.em, 2.4, legs, P.ground);
      lines(g, P.lo, 2.6, [[[-2, -25], [-14, -50]]], P.ground);
      blob(g, P, [[function (g) { ell(g, 0, 20, 7.5, 23); }, P.em], [function (g) { ell(g, 0, -5, 10, 8); }, P.em], [function (g) { circ(g, 0, -19, 6.5); }, P.em]]);
      lines(g, P.ground, 2, [[[-6.5, 8], [6.5, 8]], [[-7, 16], [7, 16]], [[-7, 24], [7, 24]], [[-6, 32], [6, 32]]]);
      dot(g, P.hi, -3.4, -20, 2.4, 2.8); dot(g, P.hi, 3.4, -20, 2.4, 2.8);
    },
    toque: function (g, P) {
      var parts = [[function (g) { circ(g, 0, -34, 12); for (var k = 0; k < 9; k++) { var a = k / 9 * Math.PI * 2; circ(g, Math.cos(a) * 11, -34 + Math.sin(a) * 11, 5); } }, P.hi],
        [function (g) { g.moveTo(-33, 14); g.bezierCurveTo(-33, -32, 33, -32, 33, 14); g.closePath(); }, P.em], [function (g) { rrect(g, -37, 9, 74, 24, 6); }, P.lo]];
      blob(g, P, parts);
      g.save(); g.beginPath(); parts[1][0](g); g.clip(); g.fillStyle = P.hi; g.fillRect(-40, -8, 80, 7); g.fillStyle = P.ground; g.fillRect(-40, 1, 80, 2); g.restore();
      var r = []; for (var x = -30; x <= 30; x += 6) r.push([[x, 12], [x, 30]]);
      lines(g, shade(P.lo, 0.7), 1.8, r);
    }
  };
  LG.emblemIds = function () { return Object.keys(EMB); };
  function drawEmblem(g, id, cx, cy, box, P) {
    var def = (GG.logo && GG.logo.emblem(id)) || {}, art = def.art || {}, fn = EMB[id] || EMB.skull, k = box / 100 * (art.scale || 1);
    g.save(); g.translate(cx, cy + (art.dy || 0) * box); g.scale(k, k); if (art.spin) g.rotate(art.spin);
    fn(g, P);
    g.restore();
  }

  /* ---- Lettering --------------------------------------------------------------------------------------------------- */
  var FONTS = {
    metal: 'bold #px "UnifrakturMaguntia", "Old English Text MT", Georgia, "DejaVu Serif", "Times New Roman", serif',
    rock: 'italic 900 #px "Arial Black", Impact, "Helvetica Neue", "Liberation Sans", "DejaVu Sans", sans-serif',
    country: 'bold #px Rockwell, "Rockwell Extra Bold", "Roboto Slab", "American Typewriter", "DejaVu Serif", Georgia, serif',
    prefix: '800 #px "Helvetica Neue", "Liberation Sans", "DejaVu Sans", Arial, sans-serif'
  };
  var RANSOM = ['900 #px "Arial Black", "Liberation Sans", "DejaVu Sans", sans-serif', 'bold #px Georgia, "DejaVu Serif", "Liberation Serif", serif',
    'bold #px "Courier New", "Liberation Mono", "DejaVu Sans Mono", monospace', 'italic bold #px "Times New Roman", "Liberation Serif", serif',
    '900 #px Impact, "Liberation Sans Narrow", "DejaVu Sans Condensed", sans-serif'];
  function font(f, s) { return f.replace('#', Math.max(4, Math.round(s))); }
  // 'The Grid Road Ramblers' -> { prefix: 'THE', lines: ['GRID ROAD', 'RAMBLERS'] } (two lines when a long name has spaces)
  function split(name, wide) {
    var txt = String(name == null ? '' : name).replace(/\s+/g, ' ').trim() || 'The Band', prefix = null;
    var m = /^the\s+(.+)$/i.exec(txt);
    if (m && m[1].length >= 4) { prefix = 'THE'; txt = m[1]; }
    var words = txt.split(' '), limit = wide ? 18 : 10;
    if (txt.length <= limit || words.length < 2) return { prefix: prefix, lines: [txt] };
    var best = null;
    for (var i = 1; i < words.length; i++) {
      var a = words.slice(0, i).join(' '), b = words.slice(i).join(' '), sc = Math.max(a.length, b.length);
      if (!best || sc < best.sc) best = { sc: sc, lines: [a, b] };
    }
    return { prefix: prefix, lines: best.lines };
  }
  LG.split = split;
  var LINE = 0.92, PRE = 0.44;
  function measure(g, f, s, text, track) {
    g.font = font(f, s);
    if (!track) return g.measureText(text).width;
    var w = 0; for (var i = 0; i < text.length; i++) w += g.measureText(text[i]).width;
    return w + track * s * (text.length - 1);
  }
  // The biggest size where every line fits bw x bh.
  function fit(g, f, sp, bw, bh, track, extraW) {
    var n = sp.lines.length, s = bh / (n * LINE + (sp.prefix ? PRE : 0)), w100 = 0;
    sp.lines.forEach(function (ln) { w100 = Math.max(w100, measure(g, f, 100, ln, track)); });
    return Math.max(6, Math.min(s, bw / ((w100 / 100) + (extraW || 0))));
  }
  // White text on a transparent mask: { M, boxes: [{ x0, x1, yc }], s, preY }. opts: { track, arc (line 0), skew, fatten }
  function mask(W, H, sp, f, s, o) {
    var M = mk(W, H), g = M.getContext('2d'), n = sp.lines.length, preH = sp.prefix ? PRE * s : 0, y0 = (H - (n * LINE * s + preH)) / 2, boxes = [];
    g.fillStyle = g.strokeStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.lineJoin = 'miter';
    sp.lines.forEach(function (ln, i) {
      var yc = y0 + preH + (i + 0.5) * LINE * s, lw = measure(g, f, s, ln, o.track), x = (W - lw) / 2;
      g.font = font(f, s);
      if (o.skew) g.setTransform(1, 0, o.skew, 1, -o.skew * yc, 0);
      if (o.fatten) g.lineWidth = o.fatten * s;
      var arc = o.arc && i === 0 && ln.length > 2 ? Math.max(lw * 1.25, s * 3) : 0;
      if (!o.track && !arc) { g.fillText(ln, x, yc); if (o.fatten) g.strokeText(ln, x, yc); }
      else {
        var cx = W / 2;
        for (var k = 0; k < ln.length; k++) {
          var cw = g.measureText(ln[k]).width, mid = x + cw / 2;
          if (arc) {
            var a = (mid - cx) / arc, py = yc + arc * (1 - Math.cos(a)) - s * 0.06;
            g.save(); g.translate(cx + arc * Math.sin(a), py); g.rotate(a); g.fillText(ln[k], -cw / 2, 0); if (o.fatten) g.strokeText(ln[k], -cw / 2, 0); g.restore();
          } else { g.fillText(ln[k], x, yc); if (o.fatten) g.strokeText(ln[k], x, yc); }
          x += cw + (o.track || 0) * s;
        }
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      boxes.push({ x0: (W - lw) / 2, x1: (W + lw) / 2, yc: yc, arc: arc });
    });
    if (sp.prefix) {
      g.font = font(o.preFont || FONTS.prefix, s * 0.34); g.textAlign = 'center';
      if (o.skew) g.setTransform(1, 0, o.skew, 1, -o.skew * (y0 + preH / 2), 0);
      if (o.track) { var t = sp.prefix.split('').join(String.fromCharCode(8202)); g.fillText(t, W / 2, y0 + preH / 2); } else g.fillText(sp.prefix, W / 2, y0 + preH / 2);
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
    return { M: M, boxes: boxes, s: s };
  }
  function tri(g, x, y, w, len, lean, dir) { g.beginPath(); g.moveTo(x - w / 2, y + dir * w * 0.7); g.lineTo(x + w / 2, y + dir * w * 0.7); g.lineTo(x + lean, y - dir * len); g.closePath(); g.fill(); }
  // Metal: symmetric spikes up, roots down, barbs out the sides (seeded by the name).
  function spikes(K, rng) {
    var M = K.M, W = M.width, H = M.height, g = M.getContext('2d'), s = K.s, d = g.getImageData(0, 0, W, H).data;
    function edge(x, yc, dir) {
      x = Math.round(x); if (x < 0 || x >= W) return null;
      var y = Math.round(yc - dir * 0.62 * s), end = Math.round(yc + dir * 0.62 * s);
      for (; dir > 0 ? y <= end : y >= end; y += dir) { if (y >= 0 && y < H && d[(y * W + x) * 4 + 3] > 140) return y; }
      return null;
    }
    g.fillStyle = '#fff';
    K.boxes.forEach(function (b) {
      var mid = (b.x0 + b.x1) / 2, step = Math.max(2, s * 0.1), w = Math.max(1.5, s * 0.1);
      for (var x = b.x0 + step * 0.5; x < mid - step * 0.3; x += step) {
        var up = rng.chance(0.68), dn = rng.chance(0.5), lu = s * rng.range(0.25, 0.95), ld = s * rng.range(0.18, 0.7), le = rng.range(-0.25, 0.25);
        [x, 2 * mid - x].forEach(function (xx, m) {
          var lean = m ? -le : le, yt = edge(xx, b.yc, 1), yb = edge(xx, b.yc, -1);
          if (up && yt != null) tri(g, xx, yt + 1, w, lu, lean * lu, 1);
          if (dn && yb != null) tri(g, xx, yb - 1, w, ld, lean * ld, -1);
        });
      }
      var yt0 = edge(mid, b.yc, 1);
      if (yt0 != null) tri(g, mid, yt0 + 1, w * 1.4, s * 0.85, 0, 1);
      [[b.x0 + s * 0.04, -1], [b.x1 - s * 0.04, 1]].forEach(function (e) {   // barbs off the first and last letters
        g.beginPath(); g.moveTo(e[0], b.yc - s * 0.05); g.lineTo(e[0] + e[1] * s * 0.5, b.yc + s * 0.02); g.lineTo(e[0], b.yc + s * 0.07); g.closePath(); g.fill();
      });
    });
  }
  function star(g, x, y, r, spikes4) {
    g.beginPath();
    var n = spikes4 ? 8 : 10;
    for (var i = 0; i < n; i++) { var a = -Math.PI / 2 + i * Math.PI * 2 / n, rr = i % 2 ? r * (spikes4 ? 0.22 : 0.45) : r; g.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); }
    g.closePath(); g.fill();
  }
  // Draws the name into a bw x bh canvas in the style; returns it.
  function lettering(style, name, bw, bh, P, wide) {
    var T = mk(bw, bh), g = T.getContext('2d'), sp = split(name, wide), rng = GG.RNG(GG.hashSeed(style + '|' + name));
    if (style === 'punk') { ransom(T, sp, P, rng); return T; }
    if (style === 'metal') {
      sp.lines = sp.lines.map(function (l) { return l.toUpperCase(); });
      var s = fit(g, FONTS.metal, sp, bw * 0.84, bh * (sp.lines.length > 1 ? 0.5 : 0.4), 0), K = mask(bw, bh, sp, FONTS.metal, s, { fatten: 0.035 });
      spikes(K, rng);
      g.drawImage(ring(K.M, P.ground, Math.max(1.5, s * 0.075)), 0, 0); g.drawImage(tint(K.M, P.fg), 0, 0);
      return T;
    }
    if (style === 'rock') {
      sp.lines = sp.lines.map(function (l) { return l.toUpperCase(); });
      var s2 = fit(g, FONTS.rock, sp, bw * 0.9, bh * 0.86, 0, 0.12), K2 = mask(bw, bh, sp, FONTS.rock, s2, { skew: -0.2, fatten: 0.015 });
      var dx = s2 * 0.06, dy = s2 * 0.1, E = union(K2.M, dx, dy, Math.max(2, Math.round(s2 * 0.1)));
      g.drawImage(ring(E, P.ground, Math.max(1.5, s2 * 0.06)), 0, 0);
      g.drawImage(tint(E, shade(P.em, 0.5)), 0, 0);
      g.drawImage(ring(K2.M, shade(P.em, 0.3), Math.max(1, s2 * 0.018)), 0, 0);
      var C = mk(bw, bh), c = C.getContext('2d');
      K2.boxes.forEach(function (b) {
        var gr = c.createLinearGradient(0, b.yc - s2 * 0.42, 0, b.yc + s2 * 0.42);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.38, mix(P.fg, '#ffffff', 0.25)); gr.addColorStop(0.5, shade(P.em, 0.42));
        gr.addColorStop(0.56, P.em); gr.addColorStop(0.82, mix(P.fg, P.em, 0.25)); gr.addColorStop(1, '#ffffff');
        c.fillStyle = gr; c.fillRect(0, b.yc - s2 * 0.62, bw, s2 * 1.24);
      });
      c.fillStyle = P.fg; if (sp.prefix) c.fillRect(0, 0, bw, K2.boxes[0].yc - s2 * 0.6);
      c.globalCompositeOperation = 'destination-in'; c.drawImage(K2.M, 0, 0);
      g.drawImage(C, 0, 0);
      var b0 = K2.boxes[0];
      g.save(); g.fillStyle = '#ffffff'; g.shadowColor = rgba(P.fg, 0.9); g.shadowBlur = s2 * 0.2;
      star(g, Math.min(bw - s2 * 0.2, b0.x1 - s2 * 0.12), b0.yc - s2 * 0.34, s2 * 0.26, true); g.restore();
      return T;
    }
    // country: slab letters on an arch, a hard drop shadow in the emblem colour, stars at the ends
    sp.lines = sp.lines.map(function (l) { return l.toUpperCase(); });
    var s3 = fit(g, FONTS.country, sp, bw * 0.82, bh * 0.8, 0.07), K3 = mask(bw, bh, sp, FONTS.country, s3, { track: 0.07, arc: true, fatten: 0.07, preFont: FONTS.country });
    var ox = s3 * 0.075, oy = s3 * 0.075, S = mk(bw, bh); S.getContext('2d').drawImage(K3.M, ox, oy);
    var U2 = mk(bw, bh), u = U2.getContext('2d'); u.drawImage(K3.M, 0, 0); u.drawImage(S, 0, 0);
    g.drawImage(ring(U2, P.ground, Math.max(1.5, s3 * 0.06)), 0, 0);
    g.drawImage(tint(S, P.em), 0, 0); g.drawImage(tint(K3.M, P.fg), 0, 0);
    var b = K3.boxes[0], sy = b.yc + (b.arc ? b.arc * (1 - Math.cos((b.x1 - b.x0) / 2 / b.arc)) : 0);
    [[b.x0 - s3 * 0.36, 1], [b.x1 + s3 * 0.36, 1]].forEach(function (p) {
      if (p[0] < s3 * 0.2 || p[0] > bw - s3 * 0.2) return;
      g.fillStyle = P.ground; star(g, p[0], sy, s3 * 0.26); g.fillStyle = P.em; star(g, p[0], sy, s3 * 0.19);
    });
    return T;
  }
  // Punk: every letter cut from something else and glued on a paper patch (seeded, so a band's ransom note never changes).
  function ransom(T, sp, P, rng) {
    var s = 100, gap = s * 0.05, space = s * 0.34, rowsH = [], rows = [];
    var tmp = mk(4, 4).getContext('2d');
    var papers = [P.fg, P.em, '#f4efe2', '#161616', '#f2d15b', P.fg, '#f4efe2'];
    function row(text, k) {
      var items = [], w = 0;
      for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        if (ch === ' ') { w += space; items.push(null); continue; }
        var f = rng.pick(RANSOM), sz = s * k * rng.range(0.8, 1.08), c = rng.chance(0.3) ? ch.toLowerCase() : ch.toUpperCase();
        tmp.font = font(f, sz);
        var cw = tmp.measureText(c).width, pw = cw + s * 0.2 * k, ph = sz * 0.98 + s * 0.12 * k, paper = rng.pick(papers);
        items.push({ ch: c, f: f, sz: sz, pw: pw, ph: ph, paper: paper, ink: lum(paper) > 0.5 ? '#141414' : '#f7f3ea',
          rot: rng.range(-0.15, 0.15), dy: rng.range(-0.07, 0.07) * s * k, j: [rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1)] });
        w += pw + gap;
      }
      return { items: items, w: w, h: s * k * 1.22 };
    }
    if (sp.prefix) rows.push(row(sp.prefix, 0.5));
    sp.lines.forEach(function (l) { rows.push(row(l, 1)); });
    var maxW = 0, totH = 0; rows.forEach(function (r) { maxW = Math.max(maxW, r.w); totH += r.h; rowsH.push(r.h); });
    var pad = s * 0.2, Pc = mk(maxW + pad * 2, totH + pad * 2), g = Pc.getContext('2d'), y = pad;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    rows.forEach(function (r) {
      var x = pad + (maxW - r.w) / 2, yc = y + r.h / 2;
      r.items.forEach(function (it) {
        if (!it) { x += space; return; }
        var cx = x + it.pw / 2, j = it.j, hw = it.pw / 2, hh = it.ph / 2, e = s * 0.045;
        g.save(); g.translate(cx, yc + it.dy); g.rotate(it.rot);
        g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowOffsetX = s * 0.03; g.shadowOffsetY = s * 0.045;
        g.beginPath(); poly(g, [[-hw + j[0] * e, -hh + j[1] * e], [hw + j[2] * e, -hh - j[0] * e], [hw - j[3] * e, hh + j[2] * e], [-hw - j[1] * e, hh - j[3] * e]]);
        g.fillStyle = it.paper; g.fill();
        g.shadowColor = 'transparent'; g.font = font(it.f, it.sz); g.fillStyle = it.ink; g.fillText(it.ch, 0, s * 0.03);
        g.restore();
        x += it.pw + gap;
      });
      y += r.h;
    });
    var k = Math.min(T.width / Pc.width, T.height / Pc.height), dw = Pc.width * k, dh = Pc.height * k;
    T.getContext('2d').drawImage(Pc, (T.width - dw) / 2, (T.height - dh) / 2, dw, dh);
  }

  /* ---- The logo ---------------------------------------------------------------------------------------------------------- */
  function initials(name) {
    var w = String(name || '').replace(/^the\s+/i, '').replace(/[^A-Za-z0-9À-ÿ ]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (!w.length) return '?';
    return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase();
  }
  function draw(lg, name, size, o) {
    stat.draws++;
    var wide = o.shape === 'wide', H = Math.max(16, Math.round(size)), W = wide ? Math.round(H * (o.aspect || 2)) : H, P = LG.palette(lg);
    var C = mk(W, H), g = C.getContext('2d'), mini = o.mini != null ? !!o.mini : H < 72, badge = o.badge;
    if (badge) {
      g.fillStyle = P.ground; g.beginPath();
      if (badge === 'circle' && !wide) g.arc(W / 2, H / 2, H / 2, 0, Math.PI * 2); else rrect(g, 0, 0, W, H, H * 0.18);
      g.fill();
      g.strokeStyle = mix(P.ground, P.em, 0.45); g.lineWidth = Math.max(1, H * 0.035); g.beginPath();
      if (badge === 'circle' && !wide) g.arc(W / 2, H / 2, H / 2 - g.lineWidth / 2, 0, Math.PI * 2); else rrect(g, g.lineWidth / 2, g.lineWidth / 2, W - g.lineWidth, H - g.lineWidth, H * 0.16);
      g.stroke();
    }
    var eb = H * (badge ? 0.78 : 0.94) * (mini || o.plain ? 1 : (wide ? 0.96 : 0.92));
    if (!o.textOnly) drawEmblem(g, lg.emblem, W / 2, H / 2, eb, P);
    if (o.plain) return C;   // the emblem alone (the picker's emblem buttons)
    if (mini && !o.textOnly) {
      var ini = initials(name), fs = H * (ini.length > 1 ? 0.34 : 0.42);
      g.font = '900 ' + Math.round(fs) + 'px "Arial Black", "Liberation Sans", "DejaVu Sans", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineJoin = 'round'; g.lineWidth = Math.max(2, fs * 0.28); g.strokeStyle = P.ground; g.strokeText(ini, W / 2, H * 0.7); g.fillStyle = P.fg; g.fillText(ini, W / 2, H * 0.7);
      return C;
    }
    var metal = lg.style === 'metal', bw = Math.round(W * (badge ? 0.88 : 0.96)), bh = Math.round(H * (metal ? (wide ? 0.98 : 0.84) : wide ? 0.66 : 0.54));
    if (o.textOnly) bh = Math.round(H * (metal ? 1.3 : 0.94));   // the name alone (the picker's lettering buttons)
    var T = lettering(lg.style, name, bw, bh, P, wide);
    g.drawImage(T, (W - bw) / 2, H * (o.textOnly ? 0.5 : wide || metal ? 0.52 : 0.53) - bh / 2);
    return C;
  }
  function keyOf(lg, name, size, o) { return [lg.emblem, lg.style, lg.palette, name, Math.round(size), o.shape || 'square', o.badge || '', o.mini == null ? '' : o.mini ? 1 : 0, o.plain ? 'p' : '', o.textOnly ? 't' : '', o.aspect || ''].join('|'); }
  LG.canvas = function (lg, name, size, o) {
    o = o || {}; lg = sane(lg); name = name == null ? 'The Band' : String(name);
    var key = keyOf(lg, name, size || 256, o);
    for (var i = 0; i < cache.length; i++) if (cache[i].k === key) { stat.hits++; var hit = cache.splice(i, 1)[0]; cache.push(hit); return hit.c; }
    var c = draw(lg, name, size || 256, o);
    cache.push({ k: key, c: c });
    if (cache.length > MAX) { var old = cache.shift(); delete urls[old.k]; }
    return c;
  };
  LG.dataURL = function (lg, name, size, o) {
    o = o || {};
    var c = LG.canvas(lg, name, size, o), key = keyOf(sane(lg), name == null ? 'The Band' : String(name), size || 256, o);
    if (!urls[key]) { urls[key] = c.toDataURL('image/png'); stat.urls++; }
    return urls[key];
  };
  LG.texture = function (lg, name, size, o) {
    if (typeof THREE === 'undefined') return null;
    var t = new THREE.CanvasTexture(LG.canvas(lg, name, size, o));
    t.anisotropy = 4;
    return t;
  };
  LG.nameOf = function (st) { var b = st && GG.career && GG.career.band ? GG.career.band(st) : null; return (b && b.name) || 'The Band'; };
  LG.forState = function (st, size, o) { return LG.canvas(GG.logo ? GG.logo.get(st) : null, LG.nameOf(st), size, o); };
  LG.forRival = function (id, name, size, o) { return LG.canvas(GG.logo ? GG.logo.rival(id) : null, name, size, o); };

  // The kick-drum head (R.kit.headArt 'logo', 256px canvas): the logo on a head the colour of the palette's ground.
  LG.head = function (g, o) {
    o = o || {};
    var st = GG.state, genre = o.genre || (st && st.genre) || 'metal';
    var lg = o.logo || (!st && GG.logo && GG.logo.pending()) || (st && st.logo) || (GG.logo ? GG.logo.defaultFor(genre) : null);
    var name = o.band || (st ? LG.nameOf(st) : 'Hail Damage'), P = LG.palette(lg);
    g.save();
    g.fillStyle = P.ground; g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.fill();
    g.strokeStyle = mix(P.ground, P.em, 0.35); g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 122, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(128, 128, 117, 0, Math.PI * 2); g.clip();
    g.drawImage(LG.canvas(lg, name, 232), 12, 12);
    g.restore();
    return true;
  };

  /* ---- Merch: the logo printed on the thing -------------------------------------------------------------------------------- */
  var CLOTH = { shirt: 1, longsleeve: 1, tourshirt: 1, hoodie: 1, misprint: 1 };
  LG.merch = function (lg, name, id, size) {
    lg = sane(lg); size = Math.round(size || 96);
    if (id === 'misprint') name = String(name || '').replace(/hail/i, 'Hale');   // the famous typo
    var key = 'merch|' + keyOf(lg, name, size, {}) + '|' + id;
    for (var i = 0; i < cache.length; i++) if (cache[i].k === key) { stat.hits++; return cache[i].c; }
    stat.draws++;
    var C = mk(size, size), g = C.getContext('2d'), P = LG.palette(lg), u = size / 100, logo = LG.canvas(lg, name, Math.max(72, size));
    g.save(); g.scale(u, u); g.lineJoin = 'round';
    var cloth = P.light ? '#f2efe6' : '#18181c', edge = P.light ? '#b9b2a2' : '#3a3a44';
    function put(x, y, w, rot) { g.save(); g.translate(x, y); if (rot) g.rotate(rot); g.drawImage(logo, -w / 2, -w / 2, w, w); g.restore(); }
    function fillStroke(fill, stroke) { g.fillStyle = fill; g.fill(); g.strokeStyle = stroke; g.lineWidth = 2.5; g.stroke(); }
    if (CLOTH[id]) {
      var sleeve = id === 'longsleeve' ? 44 : id === 'hoodie' ? 40 : 18;
      g.beginPath(); g.moveTo(34, 12); g.quadraticCurveTo(50, 20, 66, 12); g.lineTo(88, 22 + (sleeve > 20 ? 0 : 0)); g.lineTo(sleeve > 20 ? 96 : 92, 22 + sleeve);
      g.lineTo(sleeve > 20 ? 84 : 80, 26 + sleeve); g.lineTo(76, 36); g.lineTo(76, 92); g.lineTo(24, 92); g.lineTo(24, 36); g.lineTo(sleeve > 20 ? 16 : 20, 26 + sleeve);
      g.lineTo(sleeve > 20 ? 4 : 8, 22 + sleeve); g.lineTo(12, 22); g.closePath();
      fillStroke(id === 'tourshirt' ? '#26324a' : cloth, edge);
      if (id === 'hoodie') { g.beginPath(); g.moveTo(36, 12); g.quadraticCurveTo(50, 36, 64, 12); g.fillStyle = shade(cloth === '#18181c' ? '#2a2a30' : cloth, 0.9); g.fill(); g.strokeStyle = edge; g.stroke(); g.fillStyle = edge; g.fillRect(44, 32, 2, 10); g.fillRect(54, 32, 2, 10); }
      else { g.beginPath(); g.moveTo(38, 13); g.quadraticCurveTo(50, 24, 62, 13); g.strokeStyle = edge; g.stroke(); }
      if (id === 'misprint') put(47, 56, 40, -0.35); else put(50, id === 'hoodie' ? 60 : 55, id === 'hoodie' ? 38 : 44);
    } else if (id === 'sticker' || id === 'council_pins') {
      g.beginPath(); circ(g, 50, 50, 42); fillStroke('#f7f3ea', '#b9b2a2');
      g.beginPath(); circ(g, 50, 50, 36); g.fillStyle = P.ground; g.fill(); put(50, 50, 66);
      if (id === 'council_pins') { g.fillStyle = '#d4af37'; g.beginPath(); circ(g, 50, 50, 44); g.lineWidth = 4; g.strokeStyle = '#d4af37'; g.stroke(); }
    } else if (id === 'patch') {
      g.beginPath(); rrect(g, 10, 22, 80, 56, 8); fillStroke(P.ground, mix(P.ground, P.em, 0.5));
      g.setLineDash([3, 3]); g.beginPath(); rrect(g, 15, 27, 70, 46, 6); g.strokeStyle = P.em; g.lineWidth = 1.5; g.stroke(); g.setLineDash([]);
      put(50, 50, 52);
    } else if (id === 'tape') {
      g.beginPath(); rrect(g, 8, 22, 84, 56, 5); fillStroke('#2a2a30', '#111');
      g.beginPath(); rrect(g, 14, 26, 72, 32, 3); g.fillStyle = '#f4efe2'; g.fill();
      g.fillStyle = '#111'; g.beginPath(); circ(g, 34, 66, 6); circ(g, 66, 66, 6); g.fill();
      g.save(); g.beginPath(); rrect(g, 14, 26, 72, 32, 3); g.clip(); put(50, 42, 38); g.restore();
    } else if (id === 'trucker' || id === 'duke_hat') {
      g.beginPath(); g.moveTo(14, 66); g.bezierCurveTo(12, 20, 88, 20, 86, 66); g.closePath(); fillStroke(id === 'duke_hat' ? '#6a4424' : '#f2efe6', '#8a8272');
      g.beginPath(); g.moveTo(50, 66); g.lineTo(96, 66); g.quadraticCurveTo(98, 78, 70, 76); g.lineTo(50, 72); g.closePath(); fillStroke(P.em, shade(P.em, 0.5));
      put(46, 48, 40);
    } else if (id === 'toque') {
      g.beginPath(); circ(g, 50, 16, 10); fillStroke(P.hi, edge);
      g.beginPath(); g.moveTo(16, 62); g.bezierCurveTo(16, 8, 84, 8, 84, 62); g.closePath(); fillStroke(P.em, shade(P.em, 0.5));
      g.beginPath(); rrect(g, 12, 58, 76, 26, 6); fillStroke(P.lo, shade(P.em, 0.4)); put(50, 70, 30);
    } else if (id === 'vinyl') {
      g.beginPath(); rrect(g, 8, 8, 84, 84, 3); fillStroke(P.ground, '#555');
      g.beginPath(); circ(g, 70, 50, 34); g.fillStyle = '#111'; g.fill(); put(38, 50, 58);
    } else {   // bobblehead, capes, keychains, anything new: the logo on a little swing tag
      g.beginPath(); rrect(g, 14, 14, 72, 72, 10); fillStroke(P.ground, mix(P.ground, P.em, 0.5)); put(50, 50, 62);
    }
    g.restore();
    cache.push({ k: key, c: C }); if (cache.length > MAX) cache.shift();
    return C;
  };
  LG.info = function () { return { cached: cache.length, draws: stat.draws, hits: stat.hits, urls: stat.urls, emblems: Object.keys(EMB).length }; };
  GG.registerDebug('render-logo', LG.info);
})(window.GG);
