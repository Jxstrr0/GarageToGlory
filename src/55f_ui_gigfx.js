// 55f_ui_gigfx.js (v1.6 "Showtime", status.md Addendum 9): the gig highway's animation layer. Visuals only: it reads the
// song time, the chart's beat (spb), the session's combo and the 'gig:judge' events 55_ui_gig hands it; it never touches
// timing, judgement, scoring, the chart, audio or input. A note's y stays yOf(t): pulses change brightness / size around a
// gem's centre only. Every effect is drawn UNDER the gems (the gems, the judgement pop and the combo text stay on top).
//   GG.gigfx (FX):
//     pure (node-safe): TIERS [10, 25, 50] ; tierOf(combo) -> 0..3 ; HEAT / TEXT (the tier colours) ; STAR ; POOL (96
//       particles) ; LIFE (300 ms, the longest particle) ; MISS_MS ; levelFor({ force, lessMotion, quality, gov }) ->
//       { level: 'full'|'calm', why: 'force'|'pref'|'low'|'gov'|null } ; pulse(t, spb) -> 0..1 (1 on the beat, gone by the
//       next one) ; missAlpha(ms, soft) -> the hit line's red (flicker; soft = a fading tint that never comes back up).
//     runtime (55 calls it): setup(geo) (sprites per lane colour + gem size, the texture pattern, the gradients; cached by
//       key) ; reset() (a new song: no particles, no flashes) ; judge(li, kind, p) ('perfect' | 'good' | 'miss' | 'fill') ;
//       frame(level, t, p, combo, spb, soft) ; back(x) (texture, strip glow, star sweep, lane edges) ; zone(x) (the heat
//       tint + the hit line colour; calm too) ; beat(y) -> extra beat-line alpha ; mid(x) (flames, Perfect flashes,
//       shockwaves, sparks, the miss line) ; glow(x, li, gx, y, gw, gh, a) ; glint(x, k, gx, y, gw, gh, gr, a) ;
//       shimmer(x, tx, w, yTop, yBot, held) ; comboColor() ; comboScale(p) ; cost(ms) (the highway's draw time).
//     force: null | 'full' | 'calm' (tests, owner shots). Level: calm when Settings "Less motion" is on (default: the OS's
//       prefers-reduced-motion), the graphics tier is Low, or the frame governor has stepped down ('auto' below its top
//       pixel ratio, or wanting to; latched for the rest of the song by 55). Calm keeps the simple hit pop (55's ring), the
//       combo colour (text, zone tint, hit line) and a soft miss tint; it drops the texture, beat pulses, particles,
//       flames, glows, glints, shimmer and the star shine. reducedFlash (full level): no Perfect beam, a small Perfect
//       flash, no tier-up ring, the miss flicker becomes a soft tint, no pulse in the strip glow.
//     debug('gigfx') { level, why, force, lessMotion, reducedFlash, tier, combo, pulse, particles: { cap, live, spawned,
//       peak }, perfects, hits, misses, missA, missSoft, flames, texture, shine, sprites, builds, drawMs: { n, p50, p95,
//       max }, frames }.
// No allocation per frame: a fixed particle pool (typed arrays, round robin), sprites on small offscreen canvases built at
// layout, gradients / pattern made once per layout; shadowBlur only while a glow sprite is built.
(function (GG) {
  var FX = GG.gigfx = GG.gigfx || {};
  var TIERS = FX.TIERS = [10, 25, 50];
  // the hit zone heats up: amber, orange, white-hot
  FX.HEAT = [null, '#ffc53d', '#ff8a2a', '#ffe9b0'];
  // the combo counter (x50: the star colour, never the miss red)
  FX.TEXT = ['#ffffff', '#ffc53d', '#ff8a2a', '#9ff3ff'];
  FX.STAR = '#8fe9ff';
  FX.POOL = 96; FX.LIFE = 300; FX.MISS_MS = 320;
  if (FX.force === undefined) FX.force = null;

  FX.tierOf = function (combo) { combo = +combo || 0; return combo >= TIERS[2] ? 3 : combo >= TIERS[1] ? 2 : combo >= TIERS[0] ? 1 : 0; };
  FX.levelFor = function (o) {
    o = o || {};
    if (o.force === 'full' || o.force === 'calm') return { level: o.force, why: 'force' };
    if (o.lessMotion) return { level: 'calm', why: 'pref' };
    if (o.quality === 'low') return { level: 'calm', why: 'low' };
    if (o.gov) return { level: 'calm', why: 'gov' };
    return { level: 'full', why: null };
  };
  FX.pulse = function (t, spb) {
    if (!(spb > 0) || !isFinite(t)) return 0;
    var f = t / spb; f -= Math.floor(f);
    var q = 1 - f; return q * q * q * q;
  };
  FX.missAlpha = function (ms, soft) {
    if (!(ms >= 0) || ms >= FX.MISS_MS) return 0;
    var e = 1 - ms / FX.MISS_MS;
    if (soft) return 0.32 * e;
    return e * (((ms / 45) | 0) % 2 ? 0.2 : 1);
  };

  /* ---- State (one gig at a time) ------------------------------------------------------------------------------- */
  var N = FX.POOL;
  var P = { x: new Float32Array(N), y: new Float32Array(N), vx: new Float32Array(N), vy: new Float32Array(N), t0: new Float64Array(N),
    life: new Float32Array(N), size: new Float32Array(N), col: new Int8Array(N), next: 0, spawned: 0, peak: 0 };
  var S = { level: 'calm', why: null, soft: false, t: 0, p: 0, combo: 0, tier: 0, pulse: 0, spb: 0.5, tierAt: -1e9, lastTier: 0,
    flash: new Float64Array(6), ring: new Float64Array(6), pring: new Float64Array(6), crack: new Float64Array(6), missAt: -1e9, missA: 0, flames: 0, texture: false, shine: false,
    perfects: 0, hits: 0, misses: 0, frames: 0, seed: 1 };
  var geo = null, spr = { glow: [], flash: [], beam: [], flame: [null, null, null, null], tile: null, key: '' }, builds = 0, nSprites = 0;
  var grad = { strip: [null, null, null, null], star: null, miss: null, pat: null, ctx: null };
  var COST = new Float32Array(240), nCost = 0, iCost = 0, costSort = new Float32Array(240);

  function rnd() { S.seed = (S.seed * 1664525 + 1013904223) >>> 0; return S.seed / 4294967296; }
  function hexA(hex, a) {
    var h = String(hex || '#ffffff').replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var v = parseInt(h, 16); if (!isFinite(v)) v = 0xffffff;
    return 'rgba(' + ((v >> 16) & 255) + ',' + ((v >> 8) & 255) + ',' + (v & 255) + ',' + a + ')';
  }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function rrPath(x, px, py, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
  }

  /* ---- Sprites (built at layout, cached by key) ---------------------------------------------------------------- */
  var GPAD = 9;
  // a soft halo the size of a gem + GPAD a side (shadowBlur only here, once)
  function glowSprite(color, w, h, r, d) {
    var c = canvas((w + 2 * GPAD) * d, (h + 2 * GPAD) * d), x = c.getContext('2d'), off = 4000;
    x.setTransform(d, 0, 0, d, 0, 0);
    x.shadowColor = color; x.shadowBlur = 7 * d; x.shadowOffsetX = off * d;
    rrPath(x, GPAD - off, GPAD, w, h, r); x.fillStyle = '#000'; x.fill();
    return c;
  }
  // a round burst: white core, lane colour, gone at the rim
  function flashSprite(color, d) {
    var s = 64 * d, c = canvas(s, s), x = c.getContext('2d'), g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.22, hexA(color, 0.8)); g.addColorStop(0.6, hexA(color, 0.22)); g.addColorStop(1, hexA(color, 0));
    x.fillStyle = g; x.fillRect(0, 0, s, s); return c;
  }
  // the Perfect beam: a column of lane light up from the hit line
  function beamSprite(color, d) {
    var c = canvas(24 * d, 128 * d), x = c.getContext('2d'), g = x.createLinearGradient(0, 128 * d, 0, 0), h = x.createLinearGradient(0, 0, 24 * d, 0);
    g.addColorStop(0, hexA(color, 0.9)); g.addColorStop(0.35, hexA(color, 0.35)); g.addColorStop(1, hexA(color, 0));
    x.fillStyle = g; x.fillRect(0, 0, 24 * d, 128 * d);
    h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = h; x.fillRect(0, 0, 24 * d, 128 * d);
    return c;
  }
  var FLAME = [null, ['#fff4b0', '#ffc53d', '#ff8a2a'], ['#fff0a0', '#ff9d2a', '#ff4a1c'], ['#ffffff', '#ffd27a', '#ff5a1c']];
  // a flame tongue, base at the bottom: core -> tier colour -> transparent tip
  function flameSprite(tier, d) {
    var w = 32 * d, h = 64 * d, c = canvas(w, h), x = c.getContext('2d'), f = FLAME[tier], g = x.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, hexA(f[0], 0.95)); g.addColorStop(0.3, hexA(f[1], 0.85)); g.addColorStop(0.7, hexA(f[2], 0.4)); g.addColorStop(1, hexA(f[2], 0));
    x.fillStyle = g; x.beginPath(); x.moveTo(0.5 * w, 0);
    x.bezierCurveTo(0.62 * w, 0.3 * h, 1.0 * w, 0.55 * h, 0.9 * w, 0.82 * h); x.bezierCurveTo(0.84 * w, 1.0 * h, 0.16 * w, 1.0 * h, 0.1 * w, 0.82 * h);
    x.bezierCurveTo(0.0 * w, 0.55 * h, 0.4 * w, 0.32 * h, 0.5 * w, 0); x.closePath(); x.fill();
    return c;
  }
  // the highway's faint scrolling texture: speed streaks + grit (seeded: the same tile every time)
  function tileSprite(d) {
    var w = 48, h = 96, c = canvas(w * d, h * d), x = c.getContext('2d'), s = 7;
    function r() { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }
    x.setTransform(d, 0, 0, d, 0, 0);
    x.fillStyle = '#ffffff';
    for (var i = 0; i < 16; i++) { x.globalAlpha = 0.3 + 0.5 * r(); x.fillRect(Math.floor(r() * w), Math.floor(r() * h), 3 + Math.floor(r() * 9), 1); }
    for (i = 0; i < 30; i++) { x.globalAlpha = 0.25 + 0.5 * r(); x.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1.5, 1.5); }
    return c;
  }
  FX.setup = function (g) {
    geo = g; if (!g || typeof document === 'undefined') return;
    var d = g.DPR, key = [d, g.gw, g.gh, g.colors.join(',')].join('|');
    if (spr.key !== key) {
      spr.key = key; builds++;
      var gr = g.gh / 2 - 1;
      for (var l = 0; l < g.colors.length; l++) {
        spr.glow[l] = glowSprite(g.colors[l], g.gw, g.gh, gr, d);
        spr.flash[l] = flashSprite(g.colors[l], d);
        spr.beam[l] = beamSprite(g.colors[l], d);
      }
      spr.glow.length = spr.flash.length = spr.beam.length = g.colors.length;
      if (!spr.flame[1] || spr.d !== d) { for (var t = 1; t <= 3; t++) spr.flame[t] = flameSprite(t, d); spr.tile = tileSprite(d); spr.d = d; }
      nSprites = g.colors.length * 3 + 4;
    }
    // gradients + the pattern belong to this layout's geometry (hitY, W)
    var x = g.ctx;
    for (var k = 1; k <= 3; k++) {
      var sg = x.createLinearGradient(0, g.hitY, 0, 0), c = k === 3 ? FX.STAR : FX.HEAT[k];
      sg.addColorStop(0, hexA(c, 0.9)); sg.addColorStop(0.45, hexA(c, 0.22)); sg.addColorStop(1, hexA(c, 0));
      grad.strip[k] = sg;
    }
    var st = x.createLinearGradient(0, -20, 0, 20);
    st.addColorStop(0, hexA(FX.STAR, 0)); st.addColorStop(0.5, hexA(FX.STAR, 0.9)); st.addColorStop(1, hexA(FX.STAR, 0));
    grad.star = st;
    var mg = x.createLinearGradient(0, g.hitY - 16, 0, g.hitY + 16);
    mg.addColorStop(0, 'rgba(255,70,60,0)'); mg.addColorStop(0.5, 'rgba(255,70,60,0.85)'); mg.addColorStop(1, 'rgba(255,70,60,0)');
    grad.miss = mg;
    grad.pat = spr.tile ? x.createPattern(spr.tile, 'repeat') : null;
  };
  FX.reset = function () {
    P.next = 0; for (var i = 0; i < N; i++) P.life[i] = 0;
    for (var l = 0; l < 6; l++) { S.flash[l] = -1e9; S.ring[l] = -1e9; S.pring[l] = -1e9; S.crack[l] = -1e9; }
    S.missAt = -1e9; S.tierAt = -1e9; S.lastTier = 0; S.seed = 1;
  };
  FX.reset();

  /* ---- Events ------------------------------------------------------------------------------------------------- */
  function spawn(li, cx, cy, n, sp0, sp1, up, life0, life1, size, col) {
    for (var k = 0; k < n; k++) {
      var i = P.next; P.next = (P.next + 1) % N;
      var a = up ? -Math.PI / 2 + (rnd() - 0.5) * 2.4 : Math.PI / 2 + (rnd() - 0.5) * 1.6, v = sp0 + (sp1 - sp0) * rnd();
      P.x[i] = cx + (rnd() - 0.5) * 10; P.y[i] = cy; P.vx[i] = Math.cos(a) * v; P.vy[i] = Math.sin(a) * v;
      P.t0[i] = S.p0; P.life[i] = Math.min(FX.LIFE, life0 + (life1 - life0) * rnd()); P.size[i] = size * (0.7 + 0.6 * rnd());
      P.col[i] = col === -1 ? (k % 3 === 0 ? -1 : li) : col;
      P.spawned++;
    }
  }
  S.p0 = 0;
  FX.judge = function (li, kind, p) {
    if (!(li >= 0 && li < 6)) return;
    S.p0 = p;
    if (kind === 'perfect' || kind === 'good' || kind === 'fill') S.hits++;
    if (kind === 'perfect') S.perfects++;
    if (kind === 'miss') { S.misses++; S.missAt = p; }
    // calm: no particles (55 keeps its simple ring)
    if (S.level !== 'full' || !geo) return;
    var cx = (geo.cols[li] + 0.5) * geo.laneW, cy = geo.hitY;
    if (kind === 'perfect') { S.flash[li] = p; S.pring[li] = p; S.ring[li] = p; spawn(li, cx, cy, 10, 130, 280, true, 200, 300, 3, -1); }
    else if (kind === 'good' || kind === 'fill') { S.ring[li] = p; spawn(li, cx, cy, 6, 90, 190, true, 160, 240, 2.5, li); }
    else if (kind === 'miss') { S.crack[li] = p; spawn(li, cx, cy + 4, 5, 40, 110, false, 220, 290, 3, -2); }
  };

  /* ---- Per frame ---------------------------------------------------------------------------------------------- */
  FX.frame = function (level, t, p, combo, spb, soft) {
    S.level = level; S.t = t; S.p = p; S.combo = combo; S.spb = spb; S.soft = !!soft; S.frames++;
    var tier = FX.tierOf(combo);
    if (tier > S.lastTier) { S.tierAt = p; if (level === 'full' && !soft && geo) for (var l = 0; l < geo.lanes && l < 6; l++) S.ring[l] = p; }
    S.lastTier = tier; S.tier = tier;
    S.pulse = level === 'full' ? FX.pulse(t, spb) : 0;
    S.flames = 0; S.texture = false; S.shine = false;
  };
  // full only: under everything that moves
  FX.back = function (x) {
    var g = geo; if (!g || S.level !== 'full') return;
    var W = g.W, hy = g.hitY, pu = S.pulse;
    // the texture scrolls with the notes (the highway's own speed), locked to song time
    if (grad.pat && spr.tile) {
      var th = spr.tile.height / g.DPR, off = (S.t * g.speed) % th; if (off < 0) off += th;
      x.globalAlpha = 0.07; x.fillStyle = grad.pat;
      x.setTransform(1, 0, 0, 1, 0, off * g.DPR); x.fillRect(0, -off * g.DPR, W * g.DPR, hy * g.DPR);
      x.setTransform(g.DPR, 0, 0, g.DPR, 0, 0); S.texture = true;
    }
    // the whole strip lights up as the combo grows (x50 in the star colour)
    if (S.combo >= 5) {
      var k = S.tier || 1, lv = Math.min(1, S.combo / TIERS[2]);
      x.globalAlpha = 0.05 + 0.17 * lv + (S.soft ? 0 : 0.05 * pu * lv); x.fillStyle = grad.strip[k]; x.fillRect(0, 0, W, hy);
    }
    // star shine: a band of light sweeps up the highway every two beats + glowing rails
    if (S.tier === 3 && grad.star) {
      var f = S.t / (2 * S.spb); f -= Math.floor(f);
      var yb = hy - f * (hy + 40);
      x.globalAlpha = S.soft ? 0.1 : 0.2; x.fillStyle = grad.star; x.translate(0, yb); x.fillRect(0, -20, W, 40); x.translate(0, -yb);
      x.globalAlpha = 0.45 + 0.35 * pu; x.fillStyle = FX.STAR; x.fillRect(0, 0, 3, hy); x.fillRect(W - 3, 0, 3, hy);
      S.shine = true;
    }
    // lane edges pulse on the beat
    x.fillStyle = S.tier === 3 ? FX.STAR : '#ffffff';
    x.globalAlpha = 0.04 + 0.2 * pu;
    for (var l = 1; l < g.lanes; l++) x.fillRect(l * g.laneW - 0.75, 0, 1.5, hy);
    x.globalAlpha = 1;
  };
  // the combo colour on the hit zone + the hit line (calm too: still, no flicker)
  FX.zone = function (x) {
    var g = geo; if (!g || !S.tier) return;
    var c = FX.HEAT[S.tier], top = g.H - g.ZONE - 4;
    x.globalAlpha = 0.06 + 0.04 * S.tier + 0.08 * S.pulse; x.fillStyle = c; x.fillRect(0, top, g.W, g.ZONE - 2);
    x.globalAlpha = 1;
  };
  // extra beat-line alpha: brighter on the beat and as it crosses the hit line
  FX.beat = function (y) {
    if (S.level !== 'full' || !geo) return 0;
    var near = 1 - Math.abs(geo.hitY - y) / 48;
    return (near > 0 ? 0.32 * near : 0) + 0.06 * S.pulse;
  };
  // under the gems: flames, Perfect flashes, shockwaves, sparks, the miss line
  FX.mid = function (x) {
    var g = geo; if (!g) return;
    var p = S.p, hy = g.hitY, lw = g.laneW, l, a, age;
    if (S.level === 'full') {
      x.globalCompositeOperation = 'lighter';
      // lane flames lick up from the zone's top edge (x10 / x25 / x50: taller, hotter); the zone (icons, names, keycaps) stays clear
      if (S.tier && spr.flame[S.tier]) {
        var fs = spr.flame[S.tier], fh0 = [0, 22, 31, 40][S.tier], fw = Math.min(lw * 0.36, 28), fb = g.H - g.ZONE - 3;
        x.globalAlpha = [0, 0.5, 0.6, 0.7][S.tier];
        for (l = 0; l < g.lanes; l++) {
          var cx = (l + 0.5) * lw, ph = p * 0.011 + l * 1.7;
          var h1 = fh0 * (0.78 + 0.16 * Math.sin(ph) + 0.08 * Math.sin(ph * 2.3) + 0.12 * S.pulse);
          var h2 = fh0 * (0.6 + 0.14 * Math.sin(ph * 1.4 + 2) + 0.1 * S.pulse);
          x.drawImage(fs, cx - fw / 2 + 2 * Math.sin(ph * 1.3), fb - h1, fw, h1);
          x.drawImage(fs, cx - fw * 0.75 + 5 * Math.sin(ph * 0.7), fb - h2, fw * 0.6, h2);
          x.drawImage(fs, cx + fw * 0.15 - 5 * Math.sin(ph * 0.9), fb - h2 * 0.8, fw * 0.55, h2 * 0.8);
          S.flames += 3;
        }
      }
      // Perfect: a bigger flash (+ a beam up the lane unless reduced flashing)
      for (l = 0; l < g.lanes && l < 6; l++) {
        age = p - S.flash[l];
        if (age >= 0 && age < 200 && spr.flash[l]) {
          var c0 = (g.cols[l] + 0.5) * lw, e = 1 - age / 200, sz = Math.min(lw * (S.soft ? 1 : 1.6), 140) * (0.75 + 0.4 * (1 - e));
          x.globalAlpha = (S.soft ? 0.4 : 0.9) * e; x.drawImage(spr.flash[l], c0 - sz / 2, hy - sz / 2, sz, sz);
          if (!S.soft && spr.beam[l]) { x.globalAlpha = 0.7 * e; x.drawImage(spr.beam[l], c0 - lw * 0.45, hy - 150, lw * 0.9, 150); }
        }
      }
      // sparks (lane colour + white), miss shards (grey); <= 300 ms each; one fillStyle per colour group
      var nl = 0;
      for (var gi = -2; gi < g.lanes; gi++) {
        var any = false;
        for (var i = 0; i < N; i++) {
          var lf = P.life[i]; if (!lf || P.col[i] !== gi) continue;
          age = p - P.t0[i];
          if (age >= lf || age < 0) { if (age >= lf) P.life[i] = 0; continue; }
          if (!any) { any = true; x.fillStyle = gi === -1 ? '#ffffff' : gi === -2 ? '#8a90a3' : g.colors[gi] || '#ffffff'; }
          var s = age / 1000, k = 1 - age / lf, sz2 = P.size[i] * (0.4 + 0.6 * k); nl++;
          x.globalAlpha = k;
          x.fillRect(P.x[i] + P.vx[i] * s - sz2 / 2, P.y[i] + P.vy[i] * s + 450 * s * s - sz2 / 2, sz2, sz2);
        }
      }
      if (nl > P.peak) P.peak = nl;
      x.globalCompositeOperation = 'source-over';
      x.lineWidth = 2;
      // shockwave rings: a flat ellipse on the lane floor (white for a Perfect)
      for (l = 0; l < g.lanes && l < 6; l++) {
        age = p - S.ring[l];
        if (age >= 0 && age < 260) {
          a = age / 260; x.globalAlpha = 0.55 * (1 - a); x.strokeStyle = g.colors[l];
          x.beginPath(); x.ellipse((g.cols[l] + 0.5) * lw, hy, 16 + 40 * a, 6 + 13 * a, 0, 0, 6.2832); x.stroke();
        }
        age = p - S.pring[l];
        if (age >= 0 && age < 220) {
          a = age / 220; x.globalAlpha = 0.7 * (1 - a); x.strokeStyle = '#ffffff';
          x.beginPath(); x.ellipse((g.cols[l] + 0.5) * lw, hy, 22 + 52 * a, 8 + 16 * a, 0, 0, 6.2832); x.stroke();
        }
      }
    }
    // a miss cracks: the dead gem's two grey halves (lane-coloured rims) split at the hit line, tilt, sink a little and fade
    if (S.level === 'full') {
      var hw = g.gw / 2 - 2, gh2 = g.gh, rr2 = Math.max(1, gh2 / 2 - 1);
      x.lineWidth = 1.5;
      for (l = 0; l < g.lanes && l < 6; l++) {
        age = p - S.crack[l];
        if (!(age >= 0 && age < 300)) continue;
        a = age / 300; var cx3 = (g.cols[l] + 0.5) * lw, dx = 2 + 14 * a, dy2 = 8 * a * a, rot = 0.4 * a, d = g.DPR;
        x.globalAlpha = 0.9 * (1 - a); x.strokeStyle = g.colors[l]; x.fillStyle = '#59607a';
        for (var sd = -1; sd <= 1; sd += 2) {
          var co = Math.cos(rot * sd), si = Math.sin(rot * sd);
          x.setTransform(d * co, d * si, -d * si, d * co, d * (cx3 + sd * (dx + hw / 2)), d * (hy + dy2));
          rrPath(x, -hw / 2, -gh2 / 2, hw, gh2, rr2); x.fill(); x.stroke();
        }
        x.setTransform(d, 0, 0, d, 0, 0);
      }
    }
    // the hit line on top of it all, in the combo colour from x10 (calm too)
    if (S.tier || S.level === 'full') { x.globalAlpha = S.tier ? 0.9 : 0.55; x.fillStyle = S.tier === 3 ? FX.STAR : S.tier ? FX.HEAT[S.tier] : '#ffffff'; x.fillRect(0, hy - 1.5, g.W, S.tier ? 3 : 2); }
    // the hit line flickers red (a soft tint when calm / reduced)
    var ma = FX.missAlpha(p - S.missAt, S.soft || S.level !== 'full');
    S.missA = ma;
    if (ma > 0) {
      x.globalAlpha = ma * 0.55; x.fillStyle = grad.miss || '#ff4a3c'; x.fillRect(0, hy - 16, g.W, 32);
      x.globalAlpha = ma; x.fillStyle = '#ff4a3c'; x.fillRect(0, hy - 1.5, g.W, 3);
    }
    x.globalAlpha = 1;
  };
  // a gem's halo (pulses on the beat), drawn before every gem
  FX.glow = function (x, li, gx, y, gw, gh, a) {
    var s = spr.glow[li]; if (!s || S.level !== 'full') return;
    var k = 1 + 0.12 * S.pulse;
    x.globalAlpha = a * (0.45 + 0.45 * S.pulse);
    var w = (gw + 2 * GPAD) * k, h = (gh + 2 * GPAD) * k;
    x.drawImage(s, gx + gw / 2 - w / 2, y - h / 2, w, h);
  };
  // a shine slides across the gem (always on, cyan, at x50)
  FX.glint = function (x, k, gx, y, gw, gh, gr, a) {
    if (S.level !== 'full') return;
    var f = S.t * 0.9 + k * 0.137; f -= Math.floor(f);
    var star = S.tier === 3, span = star ? 1 : 0.45;
    if (f >= span) return;
    var g0 = gx + gr, g1 = gx + gw - gr - 5; if (g1 <= g0) return;
    x.globalAlpha = a * (star ? 0.55 : 0.42); x.fillStyle = star ? '#e8fdff' : '#ffffff';
    x.fillRect(g0 + (g1 - g0) * (f / span), y - gh / 2 + 2, 5, Math.max(2, gh - 4));
  };
  // light runs down a hold's tail (faster while held)
  FX.shimmer = function (x, tx, w, yTop, yBot, held) {
    if (S.level !== 'full' || yBot - yTop < 24) return;
    var sp = held ? 1.8 : 0.9, ga = x.globalAlpha;
    x.fillStyle = '#ffffff';
    for (var i = 0; i < 3; i++) {
      var f = S.t * sp - i / 3; f -= Math.floor(f);
      var yy = yTop + (yBot - yTop) * f;
      x.globalAlpha = (held ? 0.7 : 0.45) * (0.4 + 0.6 * Math.sin(f * Math.PI));
      x.fillRect(tx - w / 2, yy - 7, w, 14);
    }
    x.globalAlpha = ga;
  };
  FX.comboColor = function () { return FX.TEXT[S.tier] || '#ffffff'; };
  // the counter pops when it reaches a new tier (full level, not reduced flashing)
  FX.comboScale = function (p) {
    if (S.level !== 'full') return 1;
    var age = p - S.tierAt; return age >= 0 && age < 260 ? 1 + 0.35 * (1 - age / 260) : 1;
  };
  FX.cost = function (ms) { COST[iCost] = ms; iCost = (iCost + 1) % COST.length; if (nCost < COST.length) nCost++; };
  FX.costReset = function () { nCost = 0; iCost = 0; };
  function pct(q) {
    if (!nCost) return null;
    for (var i = 0; i < nCost; i++) costSort[i] = COST[i];
    var a = costSort.subarray(0, nCost); a.sort();
    return Math.round(a[Math.min(nCost - 1, Math.floor(q * nCost))] * 100) / 100;
  }
  FX.state = S;

  if (GG.registerDebug) GG.registerDebug('gigfx', function () {
    var live = 0; for (var i = 0; i < N; i++) if (P.life[i] && S.p - P.t0[i] < P.life[i]) live++;
    if (live > P.peak) P.peak = live;
    return { level: S.level, why: S.why || null, force: FX.force, lessMotion: !!S.lessMotion, reducedFlash: S.soft, tier: S.tier, combo: S.combo,
      pulse: Math.round(S.pulse * 1000) / 1000, particles: { cap: N, live: live, spawned: P.spawned, peak: P.peak }, perfects: S.perfects, hits: S.hits,
      misses: S.misses, missA: Math.round(S.missA * 1000) / 1000, missSoft: !!(S.soft || S.level !== 'full'), flames: S.flames, texture: S.texture,
      shine: S.shine, sprites: nSprites, builds: builds, drawMs: { n: nCost, p50: pct(0.5), p95: pct(0.95), max: pct(1) }, frames: S.frames };
  });
})(window.GG);
