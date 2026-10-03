// 32_audio_dsp.js (v1.2 "Soundcheck", Lane I; plan/plan_contract_1.2.md §4.3, handoff F6 - F9 / F11): GG.dsp, pure JS DSP
// into Float32Arrays (no Web Audio here; node-testable): pluck (Karplus-Strong), chord, strum, metal (the 6-square cluster),
// biquad (RBJ), impulse2 (dry room hall theatre arena plate), cabIR (genre | 'practice8' | 'combo12'). 30 wraps the arrays into
// AudioBuffers. Tiers read C.REALISM through A.realism(tier); C.BAND_AMP_BY_TIER (F16.3). Classic on: never used.
//   pluck({ f, sr, dur, vel, pick, bright (0 darkest loop .. 1), t60, mute, exLp, seed, thump, click, norm }) -> Float32Array: extended Karplus-Strong. A
//     one-period noise burst (seeded), low-passed by velocity (harder = brighter) and combed by the pick position (x[n] -
//     x[n - beta N]); a delay loop with a one-zero loop filter (brightness S) and a loss rho from the target T60; a first-order
//     all-pass whose coefficient is solved for the exact phase delay at f, so the loop is in tune (+-3 cents, midi 28-88).
//     mute: the palm mute (excitation low-passed ~1.2 kHz, T60 0.12 s); exLp (Hz): a darker excitation (a bass finger: the
//     fundamental leads, as on a real bass). thump (bass fingers: 6 ms of low-passed noise), click
//     (a pick click). A DC blocker; norm (default 0.5): RMS of the first 60 ms.
//   chord({ fs: [hz], spread (s between strings, default 0.003), ...pluck }) / strum({ fs, gap (default 0.011), up, ...pluck })
//     -> Float32Array: the strings summed (string i starts i x spread / gap later; up = high string first), each string a
//     pluck with seed + i and norm / fs.length. Exactly the sum of its strings (sim_dsp).
//   metal({ ratios, base, sr, dur, hp, bp, sweep: [hzFrom, hzTo, secs], noise, seed, dec }) -> Float32Array: 6 band-limited
//     squares (polyBLEP) at base x ratios (seeded phases) -> band-pass bp -> high-pass hp (swept from sweep[0] to sweep[1]
//     over sweep[2] s: the cymbal bloom) + a little noise; dec (s) bakes an exponential decay in (else flat).
//   biquad(type, f, q, db, sr) -> { process(Float32Array) -> the same array, filtered in place; reset(); b, a } (RBJ:
//     lowpass highpass bandpass notch allpass peaking lowshelf highshelf).
//   impulse2(cls, sr, seed) -> [Float32Array L, R]: pre-delay, 8 early reflections inside the room's window (alternating
//     channels, L/R times apart), the late tail with frequency-dependent decay (the one-pole tone closes over the tail: highs
//     die first), the hall / theatre / arena slap; 'plate' = 1.2 s, bright, dense, no ER. Classes = 30's ROOMS (+ plate).
//   cabIR(name, sr) -> Float32Array(1024): a synthesized speaker + mic (F8 table): low cut, the cab's resonance, the scoop /
//     presence, 3-5 seeded cone-breakup notches between 3 and 7 kHz, two steep low-passes and the mic comb (the impulse again
//     0.25-0.45 ms later at -8 dB); normalised to a 0 dB mean power gain over 150 Hz - 5 kHz. Names: metal punk rock country
//     (the genre cabs), practice8 (1x8: boxy, 900 Hz honk, 4 kHz low-pass), combo12 (1x12). irFromB64(b64) -> Float32Array
//     (PCM16 little-endian; genres.js backing.amp.ir, F8 item-4 hook).
(function (GG) {
  var D = GG.dsp = GG.dsp || {};
  var TAU = 2 * Math.PI;
  function lcg(s) { return (s * 16807) % 2147483647; }
  function seeder(seed) { var s = ((seed >>> 0) % 2147483646) + 1; return function () { s = lcg(s); return s / 1073741823.5 - 1; }; }
  function clampN(x, a, b) { return x < a ? a : x > b ? b : x; }

  // ---- RBJ biquads -------------------------------------------------------------------------------------------------
  D.biquad = function (type, f, q, db, sr) {
    sr = sr || 44100; q = q || 0.7071; db = db || 0;
    var w = TAU * clampN(f, 1, sr * 0.499) / sr, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * q), A = Math.pow(10, db / 40);
    var b0, b1, b2, a0, a1, a2, sq;
    switch (type) {
      case 'lowpass': b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; break;
      case 'highpass': b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; break;
      case 'bandpass': b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; break;
      case 'notch': b0 = 1; b1 = -2 * cw; b2 = 1; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; break;
      case 'allpass': b0 = 1 - al; b1 = -2 * cw; b2 = 1 + al; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; break;
      case 'peaking': b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A; break;
      case 'lowshelf': sq = 2 * Math.sqrt(A) * al;
        b0 = A * ((A + 1) - (A - 1) * cw + sq); b1 = 2 * A * ((A - 1) - (A + 1) * cw); b2 = A * ((A + 1) - (A - 1) * cw - sq);
        a0 = (A + 1) + (A - 1) * cw + sq; a1 = -2 * ((A - 1) + (A + 1) * cw); a2 = (A + 1) + (A - 1) * cw - sq; break;
      case 'highshelf': sq = 2 * Math.sqrt(A) * al;
        b0 = A * ((A + 1) + (A - 1) * cw + sq); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - sq);
        a0 = (A + 1) - (A - 1) * cw + sq; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - sq; break;
      default: b0 = 1; b1 = 0; b2 = 0; a0 = 1; a1 = 0; a2 = 0;
    }
    var B = [b0 / a0, b1 / a0, b2 / a0], Aa = [1, a1 / a0, a2 / a0], x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    return {
      b: B, a: Aa,
      process: function (arr) {
        for (var i = 0; i < arr.length; i++) {
          var x = arr[i], y = B[0] * x + B[1] * x1 + B[2] * x2 - Aa[1] * y1 - Aa[2] * y2;
          x2 = x1; x1 = x; y2 = y1; y1 = y < 1e-25 && y > -1e-25 ? 0 : y; arr[i] = y1;   // (no denormals)
        }
        return arr;
      },
      reset: function () { x1 = x2 = y1 = y2 = 0; },
      // |H(f)| (for tests and normalising)
      mag: function (hz) {
        var ww = TAU * hz / sr, c1 = Math.cos(ww), s1 = Math.sin(ww), c2 = Math.cos(2 * ww), s2 = Math.sin(2 * ww);
        var nr = B[0] + B[1] * c1 + B[2] * c2, ni = -(B[1] * s1 + B[2] * s2), dr = 1 + Aa[1] * c1 + Aa[2] * c2, di = -(Aa[1] * s1 + Aa[2] * s2);
        return Math.sqrt((nr * nr + ni * ni) / (dr * dr + di * di));
      }
    };
  };

  // ---- Karplus-Strong ----------------------------------------------------------------------------------------------
  // Phase delay (samples) of the one-zero loop filter (1 - S) + S z^-1 at w, and of the all-pass (C + z^-1) / (1 + C z^-1).
  function lpDelay(S, w) { return Math.atan2(S * Math.sin(w), (1 - S) + S * Math.cos(w)) / w; }
  function apDelay(C, w) {
    var ph = Math.atan2(-Math.sin(w), C + Math.cos(w)) - Math.atan2(-C * Math.sin(w), 1 + C * Math.cos(w));
    return -ph / w;
  }
  function apCoef(d, w) {   // the all-pass coefficient whose phase delay at w is d (0 < d < ~2): bisection
    var lo = -0.999, hi = 0.999;
    for (var k = 0; k < 60; k++) { var m = (lo + hi) / 2; if (apDelay(m, w) > d) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  D.pluck = function (o) {
    o = o || {};
    var sr = o.sr || 22050, f = clampN(o.f || 110, 20, sr * 0.3), dur = o.dur || 1, n = Math.max(1, Math.ceil(dur * sr));
    var vel = o.vel == null ? 0.85 : clampN(o.vel, 0, 1), mute = !!o.mute, t60 = mute ? (o.t60 || 0.12) : (o.t60 || 2.5);
    var S = 0.5 - 0.45 * clampN(o.bright || 0, 0, 1), beta = clampN(o.pick == null ? 0.18 : o.pick, 0.02, 0.5);   // (bright 0 = the darkest loop)
    var out = new Float32Array(n), N = sr / f, w = TAU * f / sr, rnd = seeder(o.seed == null ? 1 : o.seed);
    var tl = lpDelay(S, w), L = Math.floor(N - tl - 0.15), d = N - tl - L;
    if (L < 2) { L = 2; d = Math.max(0.05, N - tl - L); }
    var C = apCoef(d, w);
    // loss per trip: |H_lp(w)| x rho = g^N (g: the per-sample decay for -60 dB at t60)
    var hm = Math.sqrt((1 - S) * (1 - S) + S * S + 2 * S * (1 - S) * Math.cos(w)), gN = Math.pow(10, -3 * N / (t60 * sr));
    var rho = Math.min(0.99995, gN / hm);
    // excitation: one period of noise, low-passed by velocity (one pole) and the palm, combed by the pick position
    var exf = mute ? 1200 : o.exLp ? o.exLp * (0.5 + 0.5 * vel) : 700 + 9000 * vel * vel;   // the excitation's low-pass (Hz): velocity / the palm / a bass finger
    var P = Math.max(2, Math.round(N)), ex = new Float32Array(P), a = 1 - Math.exp(-TAU * exf / sr);
    var lp = 0, i, pass, np = mute || o.exLp ? 2 : 1;
    for (i = 0; i < P; i++) ex[i] = rnd();
    for (pass = 0; pass < np; pass++) { lp = 0; for (i = 0; i < 2 * P; i++) { lp += (ex[i % P] - lp) * a; if (i >= P) ex[i - P] = lp; } }   // (circular: the burst is one period)
    var bN = Math.max(1, Math.round(beta * P)), comb = new Float32Array(P), mean = 0;
    for (i = 0; i < P; i++) { comb[i] = ex[i] - (i >= bN ? ex[i - bN] : 0); mean += comb[i]; }
    mean /= P; for (i = 0; i < P; i++) comb[i] -= mean;
    // the loop: y[n] = x[n] + rho * AP(LP(y[n - L]))
    var buf = new Float32Array(L), bi = 0, lpPrev = 0, apX = 0, apY = 0, dcX = 0, dcY = 0, dcR = 1 - TAU * 20 / sr;
    for (i = 0; i < n; i++) {
      var del = buf[bi];
      var l1 = (1 - S) * del + S * lpPrev; lpPrev = del;
      var ap = C * l1 + apX - C * apY; apX = l1; apY = ap;
      var y = (i < P ? comb[i] : 0) + rho * ap;
      if (y < 1e-20 && y > -1e-20) y = 0;
      buf[bi] = y; bi = bi + 1 === L ? 0 : bi + 1;
      var dc = y - dcX + dcR * dcY; dcX = y; dcY = dc < 1e-20 && dc > -1e-20 ? 0 : dc;   // DC blocker
      out[i] = dcY;
    }
    // finger thump (bass: rock / country) or pick click (punk / metal): a few ms of filtered noise on top
    if (o.thump || o.click) {
      var tn = Math.min(n, Math.round((o.thump ? 0.006 : 0.003) * sr)), ta = o.thump ? 1 - Math.exp(-TAU * 400 / sr) : 1 - Math.exp(-TAU * 5000 / sr);
      var lvl = (o.thump || o.click) * (0.4 + 0.6 * vel), tlp = 0, prev = 0;
      for (i = 0; i < tn; i++) {
        var nz = rnd(); tlp += (nz - tlp) * ta;
        var v = o.thump ? tlp * 3 : tlp - prev; prev = tlp;
        out[i] += lvl * v * (1 - i / tn);
      }
    }
    var norm = o.norm == null ? 0.5 : o.norm;
    if (norm > 0) {
      var m = Math.min(n, Math.round(0.06 * sr)), e = 0;
      for (i = 0; i < m; i++) e += out[i] * out[i];
      var rms = Math.sqrt(e / Math.max(1, m)), g = rms > 1e-9 ? norm / rms : 0;
      for (i = 0; i < n; i++) { var z = out[i] * g; out[i] = z < 1e-20 && z > -1e-20 ? 0 : z; }
    }
    return out;
  };
  function strings(o, gap, order) {
    var fs = o.fs || [], sr = o.sr || 22050, dur = o.dur || 1, n = Math.ceil(dur * sr), out = new Float32Array(n), k = fs.length;
    for (var j = 0; j < k; j++) {
      var idx = order ? order[j] : j, off = Math.round(j * gap * sr);
      if (off >= n) break;
      var s = D.pluck(Object.assign({}, o, { f: fs[idx], dur: (n - off) / sr, seed: (o.seed || 1) + idx, norm: (o.norm == null ? 0.5 : o.norm) / Math.max(1, k) }));
      for (var i = 0; i < s.length && off + i < n; i++) out[off + i] += s[i];
    }
    return out;
  }
  D.chord = function (o) { o = o || {}; return strings(o, o.spread == null ? 0.003 : o.spread, null); };
  D.strum = function (o) {
    o = o || {};
    var k = (o.fs || []).length, order = [];
    for (var j = 0; j < k; j++) order.push(o.up ? k - 1 - j : j);   // fs low -> high; an upstroke hits the high string first
    return strings(o, o.gap == null ? 0.011 : o.gap, order);
  };

  // ---- the metal cluster (hats, cymbals, china) ----------------------------------------------------------------------
  D.METAL_RATIOS = [1, 1.4826, 1.8002, 2.5459, 2.6301, 3.8964];   // the 808 squares (205.3, 304.4, 369.6, 522.7, 540, 800 Hz)
  function blep(t, dt) {
    if (t < dt) { t /= dt; return t + t - t * t - 1; }
    if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
    return 0;
  }
  D.metal = function (o) {
    o = o || {};
    var sr = o.sr || 44100, n = Math.max(1, Math.ceil((o.dur || 0.3) * sr)), out = new Float32Array(n), rnd = seeder(o.seed == null ? 7 : o.seed);
    var ratios = o.ratios || D.METAL_RATIOS, base = o.base || 205.3, k = ratios.length, ph = [], dts = [], i, j;
    for (j = 0; j < k; j++) { ph.push((rnd() + 1) / 2); dts.push(Math.min(0.45, base * ratios[j] / sr)); }
    for (i = 0; i < n; i++) {
      var s = 0;
      for (j = 0; j < k; j++) {
        var p = ph[j], dt = dts[j];
        var sq = (p < 0.5 ? 1 : -1) + blep(p, dt) - blep((p + 0.5) % 1, dt);
        s += sq; p += dt; ph[j] = p >= 1 ? p - 1 : p;
      }
      out[i] = s / k;
    }
    D.biquad('bandpass', o.bp || 10000, 0.8, 0, sr).process(out);
    if (o.sweep) {   // the bloom: the high-pass opens up from sweep[0] down to sweep[1] over sweep[2] s (block-wise coefficients)
      var B = 256, f0 = o.sweep[0], f1 = o.sweep[1], T = o.sweep[2] || 0.3, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (var b0 = 0; b0 < n; b0 += B) {
        var u = Math.min(1, b0 / sr / T), fc = f0 * Math.pow(f1 / f0, u), F = D.biquad('highpass', fc, 0.7, 0, sr), bb = F.b, aa = F.a;
        for (i = b0; i < Math.min(n, b0 + B); i++) {
          var x = out[i], y = bb[0] * x + bb[1] * x1 + bb[2] * x2 - aa[1] * y1 - aa[2] * y2;
          x2 = x1; x1 = x; y2 = y1; y1 = y; out[i] = y;
        }
      }
    } else D.biquad('highpass', o.hp || 7000, 0.7, 0, sr).process(out);
    var nz = o.noise == null ? 0.15 : o.noise;
    if (nz > 0) {
      var hp = D.biquad('highpass', o.hp || 7000, 0.7, 0, sr), tmp = new Float32Array(n);
      for (i = 0; i < n; i++) tmp[i] = rnd() * nz;
      hp.process(tmp);
      for (i = 0; i < n; i++) out[i] += tmp[i];
    }
    if (o.dec) { var r = Math.exp(-6.9 / (o.dec * sr)), e = 1; for (i = 0; i < n; i++) { out[i] *= e; e *= r; } }
    var pk = 0; for (i = 0; i < n; i++) { var aa2 = out[i] < 0 ? -out[i] : out[i]; if (aa2 > pk) pk = aa2; }
    if (pk > 0) for (i = 0; i < n; i++) out[i] *= 0.9 / pk;
    return out;
  };

  // ---- rooms v2 ----------------------------------------------------------------------------------------------------
  // len (s), tone (one-pole tail brightness, as 30's ROOMS), pre (pre-delay s), er (early-reflection window s), echo (slap s).
  D.ROOMS2 = {
    dry: { len: 0.45, tone: 0.5, pre: 0, er: 0.015 },
    room: { len: 0.9, tone: 0.45, pre: 0.008, er: 0.03 },
    hall: { len: 1.9, tone: 0.4, pre: 0.018, er: 0.06, echo: 0.11 },
    theatre: { len: 2.6, tone: 0.38, pre: 0.025, er: 0.07, echo: 0.07 },
    arena: { len: 3.6, tone: 0.34, pre: 0.04, er: 0.12, echo: 0.19 },
    plate: { len: 1.2, tone: 0.8, pre: 0, er: 0, dense: true }
  };
  D.impulse2 = function (cls, sr, seed) {
    var R = D.ROOMS2[cls] || D.ROOMS2.room, n = Math.max(64, Math.floor(R.len * sr)), pre = Math.round(R.pre * sr), out = [];
    var base = seed == null ? (GG.hashSeed ? GG.hashSeed('room2|' + cls) : 4321) : seed;
    for (var ch = 0; ch < 2; ch++) {
      var d = new Float32Array(n), rnd = seeder(base + 7919 * ch), lp = 0, i, m = n - pre, sl = Math.floor(0.04 * sr), raw = new Float32Array(sl);
      // late tail: noise through a one-pole whose tone closes as the tail goes (highs die first), exponential decay
      for (i = 0; i < m; i++) {
        var u = i / m, tone = R.tone * (1 - 0.6 * u), x = rnd();
        if (R.dense) x = x * 0.7 + rnd() * 0.3;
        lp += (x - lp) * tone;
        var onset = R.er ? Math.min(1, i / Math.max(1, R.er * sr)) : 1, v = lp * Math.exp(-6.9 * u);   // the tail builds up through the ER window
        if (i < sl) raw[i] = v;
        d[pre + i] = v * (0.25 + 0.75 * onset);
      }
      if (R.er) {   // 8 early reflections, falling gains, alternating channels, L / R times a little apart
        var er = R.er * sr;
        for (var k = 0; k < 8; k++) {
          if ((k & 1) !== ch && k > 0) continue;
          var at = pre + Math.round(er * (0.08 + 0.92 * (k + 0.5 * (rnd() + 1) * 0.6) / 8) * (ch ? 1.07 : 1));
          if (at < n) d[at] += (k & 2 ? -1 : 1) * 0.9 * Math.pow(0.78, k);
        }
      }
      if (R.echo) {   // the far wall slaps back
        var e = pre + Math.floor(R.echo * (ch ? 1.08 : 1) * sr), mm = Math.min(n - e, sl);   // (the early sound at full level, as 1.1)
        for (i = 0; i < mm; i++) d[e + i] += raw[i] * 0.6;
      }
      out.push(d);
    }
    return out;
  };

  // ---- cab IRs -----------------------------------------------------------------------------------------------------
  // [low cut, [res Hz, Q, dB], [scoop Hz, Q, dB] | null, [presence Hz, Q, dB], low-pass Hz, notches, comb delay ms]
  D.CABS = {
    metal: { hp: 88, res: [95, 1.4, 4], scoop: [600, 0.9, -4], pres: [2400, 1.2, 0], lp: 5500, notches: 4, comb: 0.3 },   // (the +3 dB presence: 30's carve band)
    punk: { hp: 85, res: [110, 1.2, 2], scoop: null, pres: [1600, 1, 4], lp: 5000, notches: 3, comb: 0.35 },
    rock: { hp: 80, res: [100, 1.3, 3], scoop: [700, 0.8, -1.5], pres: [2000, 1, 4], lp: 5800, notches: 4, comb: 0.32 },
    country: { hp: 90, res: [120, 1, 1], scoop: null, pres: [3200, 1, 3], lp: 6500, notches: 3, comb: 0.42 },
    practice8: { hp: 200, res: [220, 1.6, 2], scoop: null, pres: [900, 1.1, 7], lp: 4000, notches: 5, comb: 0.25 },
    combo12: { hp: 100, res: [115, 1.2, 2], scoop: [550, 0.9, -1], pres: [1800, 1, 3], lp: 5000, notches: 4, comb: 0.38 }
  };
  D.cabIR = function (name, sr) {
    sr = sr || 44100;
    var K = D.CABS[name] || D.CABS.combo12, n = 1024, x = new Float32Array(n), i;
    x[0] = 1;
    var chain = [D.biquad('highpass', K.hp, 0.8, 0, sr), D.biquad('peaking', K.res[0], K.res[1], K.res[2], sr)];
    if (K.scoop) chain.push(D.biquad('peaking', K.scoop[0], K.scoop[1], K.scoop[2], sr));
    chain.push(D.biquad('peaking', K.pres[0], K.pres[1], K.pres[2], sr));
    var rnd = seeder(GG.hashSeed ? GG.hashSeed('cab|' + name) : 99);
    for (i = 0; i < K.notches; i++) chain.push(D.biquad('peaking', 3000 + 4000 * (rnd() + 1) / 2, 6 + 4 * (rnd() + 1) / 2, -6 - 4 * (rnd() + 1) / 2, sr));
    chain.push(D.biquad('lowpass', K.lp, 0.9, 0, sr), D.biquad('lowpass', K.lp * 1.25, 0.6, 0, sr));
    chain.forEach(function (F) { F.process(x); });
    // the mic comb: the impulse again 0.25-0.45 ms later at -8 dB (off axis + the back wall)
    var cd = Math.round(K.comb / 1000 * sr), cg = Math.pow(10, -8 / 20), y = new Float32Array(n);
    for (i = 0; i < n; i++) y[i] = x[i] + (i >= cd ? cg * x[i - cd] : 0);
    var fade = Math.floor(n * 0.15), sum = 0, wsum = 0;
    for (i = 0; i < fade; i++) y[n - 1 - i] *= i / fade;   // a short fade-out: the truncated tail never clicks
    // no DC: the truncated high-pass tail would leave some (the cab's low cut must hold below its resonance)
    for (i = 0; i < n; i++) { sum += y[i]; wsum += 0.5 - 0.5 * Math.cos(TAU * i / (n - 1)); }
    for (i = 0; i < n; i++) y[i] -= sum / wsum * (0.5 - 0.5 * Math.cos(TAU * i / (n - 1)));
    return normIR(y, sr);
  };
  // Mean power gain over 150 Hz - 5 kHz (log-spaced probes, by DFT) -> 1.
  D.irGain = function (ir, sr) {
    var tot = 0, k = 24;
    for (var j = 0; j < k; j++) {
      var f = 150 * Math.pow(5000 / 150, j / (k - 1)), w = TAU * f / sr, re = 0, im = 0;
      for (var i = 0; i < ir.length; i++) { re += ir[i] * Math.cos(w * i); im -= ir[i] * Math.sin(w * i); }
      tot += re * re + im * im;
    }
    return Math.sqrt(tot / k);
  };
  function normIR(ir, sr) { var g = D.irGain(ir, sr); if (g > 0) for (var i = 0; i < ir.length; i++) ir[i] /= g; return ir; }
  // genres.js backing.amp.ir: base64 of PCM16 little-endian (a real IR later, no code change); null when not decodable.
  D.irFromB64 = function (b64, sr) {
    try {
      var bin = typeof atob === 'function' ? atob(b64) : null; if (!bin) return null;
      var n = bin.length >> 1, ir = new Float32Array(n);
      for (var i = 0; i < n; i++) { var v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); ir[i] = (v >= 32768 ? v - 65536 : v) / 32768; }
      return n ? normIR(ir, sr || 44100) : null;
    } catch (e) { return null; }
  };
})(window.GG);
