// 33_audio_voice.js (v1.2 "Soundcheck", Lane V; plan/plan_contract_1.2.md §4.4, handoff F10): GG.voice, pure vocal models:
// glottal waves (WAVES breathy / modal / belt), 5 formants + ring + F1 tracking, pitchCurve (scoop, bend, vibrato, jitter,
// wander), shimmer, the swell envelope, gang / double / chain / send tables, the singer's Soundcheck profile. The vocal chain
// itself is A._buildVox(r) in 30 (makeRig's hook; Classic on: not built). Tier-independent. No Web Audio in here: node tests
// (tests/sim_voice.test.js) load this file alone.
(function (GG) {
  'use strict';
  var V = GG.voice = GG.voice || {};

  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }
  function lcg(s) { return (s * 16807) % 2147483647; }
  function seedOf(x) { x = Math.abs(Math.round(x || 0)) % 2147483646; return x + 1; }
  function rng(seed) { var s = lcg(lcg(lcg(seedOf(seed)))); return function () { s = lcg(s); return s / 2147483647; }; }   // 0..1 (small seeds warmed up)

  // ---- Glottal source (F10): one Rosenberg pulse period, differentiated (lip radiation), as Fourier coefficients ----------
  // Open quotient oq = open phase / period (opening 2/3 of it, closing 1/3). A small oq closes the folds fast: a sharper
  // closing edge, more high harmonics (belt = brighter, pressed); a large oq is soft and breathy.
  V.WAVES = { breathy: 0.8, modal: 0.6, belt: 0.4 };
  V.HARMONICS = 48;
  var glottals = {};
  // -> { real, imag } Float32Array(harmonics + 1) (index 0 = DC = 0) for createPeriodicWave; peak harmonic magnitude 1.
  V.glottal = function (oq, harmonics) {
    oq = clamp(+oq || 0.6, 0.2, 0.95); harmonics = Math.max(1, Math.min(256, harmonics | 0 || V.HARMONICS));
    var key = oq.toFixed(3) + '|' + harmonics;
    if (glottals[key]) return glottals[key];
    var M = 4096, tp = oq * 2 / 3, tn = oq / 3, d = new Float64Array(M), i, k;
    for (i = 0; i < M; i++) {   // the derivative of the pulse, sampled analytically
      var u = (i + 0.5) / M;
      d[i] = u < tp ? 0.5 * Math.PI / tp * Math.sin(Math.PI * u / tp) : u < tp + tn ? -Math.PI / (2 * tn) * Math.sin(Math.PI * (u - tp) / (2 * tn)) : 0;
    }
    var re = new Float32Array(harmonics + 1), im = new Float32Array(harmonics + 1), peak = 0;
    for (k = 1; k <= harmonics; k++) {
      var a = 0, b = 0, w = 2 * Math.PI * k / M;
      for (i = 0; i < M; i++) { a += d[i] * Math.cos(w * (i + 0.5)); b += d[i] * Math.sin(w * (i + 0.5)); }
      re[k] = 2 * a / M; im[k] = 2 * b / M;
      peak = Math.max(peak, Math.sqrt(re[k] * re[k] + im[k] * im[k]));
    }
    for (k = 1; k <= harmonics; k++) { re[k] /= peak; im[k] /= peak; }
    return (glottals[key] = { real: re, imag: im, oq: oq });
  };
  // press 0..1 -> open quotient (breathy 0.8 .. belt 0.4), quantised to 0.05 so a context keeps at most 9 waves.
  V.oq = function (press) { return Math.round((0.8 - 0.4 * clamp(+press || 0, 0, 1)) * 20) / 20; };
  // A voc type's default press (punk yell + rock wail belt, country holler modal, ballads / whoa-ohs breathy); metal: belt.
  V.PRESS = { hey: 0.65, shout: 0.75, yeah: 0.55, yeehaw: 0.5, ooh: 0.15, yell: 0.9, wail: 0.85, holler: 0.5, whoa: 0.2 };
  V.press = function (voc, vp, metal) {
    if (vp && vp.press != null) return clamp(+vp.press, 0, 1);
    if (metal) return 1;
    return V.PRESS[voc] != null ? V.PRESS[voc] : 0.6;
  };
  // A harder hit presses harder (brighter), a soft one opens up: press + (vel - VEL_REF) x 0.8 (no vel: press as is).
  V.pressAt = function (press, vel) {
    if (vel == null) return press;
    return clamp(press + (+vel - ((GG.contracts && GG.contracts.VEL_REF) || 0.85)) * 0.8, 0, 1);
  };

  // ---- Formants (F10): five, Q from real bandwidths, ~6 dB down per formant; F1 follows a high f0 ----------------------
  // The 1.1 vowel targets (F1..F3), the same table as 30's VOWELS (that one stays the Classic path's).
  V.VOWELS = { a: [730, 1090, 2440], e: [530, 1840, 2480], i: [270, 2290, 3010], o: [570, 840, 2410], u: [300, 870, 2240],
    ae: [660, 1720, 2410], oe: [480, 1560, 2380], ue: [260, 1800, 2200] };
  V.BW = [80, 90, 120, 130, 140];      // Hz, F1..F5
  V.F45 = [3400, 4300];                // F4, F5 (Hz) x vp.formant
  V.STEP_DB = -5;                      // each formant ~6 dB under the one before (5: tuned by numbers, pw_seq vox)
  // F1' = 1.1 f0 when f0 > 0.9 F1 (a high note opens the jaw: the first formant rides over the pitch, never under it).
  V.track = function (F1, f0) { return f0 > 0.9 * F1 ? 1.1 * f0 : F1; };
  // vowel: a name (V.VOWELS) or [F1, F2, F3] (Hz, unscaled); vp.formant scales the vowel space (< 1 = a bigger throat);
  // f0 (optional): F1 tracking. -> [[f, q, gainDb] x 5]
  V.formants = function (vowel, vp, f0) {
    var F = typeof vowel === 'string' ? V.VOWELS[vowel] || V.VOWELS.a : vowel || V.VOWELS.a, s = (vp && vp.formant) || 1, out = [];
    var fs = [F[0] * s, F[1] * s, F[2] * s, V.F45[0] * s, V.F45[1] * s];
    if (f0) fs[0] = V.track(fs[0], f0);
    for (var k = 1; k < 5; k++) fs[k] = Math.max(fs[k], fs[k - 1] * 1.08);   // (a tracked F1 / a high F3 never crosses the next)
    for (k = 0; k < 5; k++) out.push([Math.round(fs[k] * 10) / 10, Math.round(fs[k] / V.BW[k] * 100) / 100, V.STEP_DB * k]);
    return out;
  };
  // The singer's ring (vp.ring dB): a 3 kHz peak for belters. -> [f, q, dB] | null
  V.RING = { f: 3000, q: 1.6 };
  V.ring = function (vp) { var db = vp && +vp.ring; return db > 0 ? [V.RING.f, V.RING.q, Math.min(12, db)] : null; };

  // ---- Pitch that lives (F10): 120 points/s ---------------------------------------------------------------------------
  // o: { scoop (semitones up into the note over 80 ms), bend (semitones over the note), vib: [rate Hz, depth] | null,
  //      jit (cycle jitter, fraction), wander (cents of slow 1/f drift, default 8), rateSpread (Hz, default 0.5: the
  //      note's rate within vib[0] +- it), seed }
  // Vibrato: onset 0.18 s (short notes) .. 0.3 s (long), rate drifting +-0.2 Hz, depth drifting +-20 %.
  V.RATE = 120;
  V.onset = function (dur) { return 0.18 + 0.12 * clamp((dur - 0.4) / 1.1, 0, 1); };
  V.pitchCurve = function (f, dur, o) {
    o = o || {};
    var n = Math.max(2, Math.ceil(dur * V.RATE)), a = new Float32Array(n), R = rng(o.seed), i;
    var vib = o.vib && o.vib[1] ? o.vib : null, spread = o.rateSpread != null ? o.rateSpread : 0.5;
    var rate0 = vib ? vib[0] + (R() - 0.5) * 2 * spread : 0, fd = 0.25 + 0.35 * R(), pd = R() * 6.283, fa = 0.3 + 0.4 * R(), pa = R() * 6.283;
    var on = V.onset(dur), ph = R() * 0.5, wander = o.wander != null ? o.wander : 8;
    // 1/f wander: four octaves of held random values (0.5, 1, 2, 4 Hz), each interpolated, equal weights (Voss-McCartney).
    var oct = [0.5, 1, 2, 4].map(function (hz) { var m = Math.ceil(dur * hz) + 2, v = new Float32Array(m); for (var j = 0; j < m; j++) v[j] = R() * 2 - 1; return { hz: hz, v: v }; });
    for (i = 0; i < n; i++) {
      var tt = i / V.RATE, u = i / (n - 1), semis = (o.scoop || 0) * Math.max(0, 1 - tt / 0.08) + (o.bend || 0) * u, cents = 0;
      for (var q = 0; q < 4; q++) { var x = tt * oct[q].hz, j0 = Math.floor(x), fr = x - j0, w = oct[q].v; cents += w[j0] + (w[j0 + 1] - w[j0]) * fr; }
      cents *= wander / 4;
      var m = 1;
      if (vib) {
        var rate = rate0 + 0.2 * Math.sin(6.283 * fd * tt + pd), depth = vib[1] * (1 + 0.2 * Math.sin(6.283 * fa * tt + pa));
        var w0 = Math.min(1, tt / on), ww = w0 * w0 * (3 - 2 * w0);
        m = 1 + depth * ww * Math.sin(6.283 * ph);
        ph += rate / V.RATE;
      }
      a[i] = f * Math.pow(2, (semis + cents / 100) / 12) * m * (1 + (o.jit || 0) * (R() * 2 - 1));
    }
    return a;
  };
  // Shimmer: a gentle random gain curve (depth 0.03..0.06 at 40..80 Hz), 480 points/s, mean ~1. -> Float32Array
  V.SHIMMER_RATE = 480;
  V.shimmer = function (dur, depth, seed) {
    depth = clamp(depth == null ? 0.04 : +depth, 0, 0.2);
    var n = Math.max(2, Math.ceil(dur * V.SHIMMER_RATE)), a = new Float32Array(n), R = rng(seed), from = 1, to = 1 + depth * (R() * 2 - 1), t0 = 0, len = 1 / (40 + 40 * R());
    for (var i = 0; i < n; i++) {
      var tt = i / V.SHIMMER_RATE;
      while (tt >= t0 + len) { t0 += len; from = to; to = 1 + depth * (R() * 2 - 1); len = 1 / (40 + 40 * R()); }
      var u = (tt - t0) / len; a[i] = from + (to - from) * u * u * (3 - 2 * u);
    }
    return a;
  };

  // ---- Dynamics (F10): the hit's level from its vel; held notes swell to +10 % by 60 % of their length, then settle -----
  V.HELD = 0.45;   // s: a hit at least this long is a held note
  // -> [[time (s, from the hit), value, 'set' | 'exp' | 'lin']] (an envelope for a GainNode's gain)
  V.envelope = function (peak, dur, attack) {
    attack = attack || 0.012;
    var end = Math.max(dur, attack + 0.03), rel = Math.min(0.05, end * 0.3), pts = [[0, 0.0001, 'set'], [attack, Math.max(0.0002, peak), 'exp']];
    if (end >= V.HELD) { pts.push([Math.max(attack + 0.01, end * 0.6), peak * 1.1, 'lin']); pts.push([Math.max(attack + 0.02, end - rel), peak * 0.82, 'lin']); }
    else pts.push([Math.max(attack + 0.005, end - rel), peak * 0.7, 'lin']);
    pts.push([end, 0.0001, 'exp']);
    return pts;
  };
  // velGain (contract §4.1; Lane F's one helper in 31 when it is there): min(1.333, (v / VEL_REF) ^ 1.5)
  V.velGain = function (v) {
    var A = GG.audio, C = GG.contracts || {};
    if (A && typeof A.velGain === 'function') return A.velGain(v);
    return Math.min(1.333, Math.pow(Math.max(0, +v || 0) / (C.VEL_REF || 0.85), 1.5));
  };

  // ---- Doubles, gangs, the chain, the sends (F10) ----------------------------------------------------------------------
  V.DOUBLE = { cents: 8, late: [0.018, 0.028], pan: 0.25, scale: 1.02 };
  // Gang of three (when there's room): [offset s, formant scale, pan]; voice 0 = the singer (centre), 1 = the octave under
  // (a bigger throat, left), 2 = a unison mate (right). Two voices (no room): the 1.1 gang (an octave down, same bank).
  V.GANG3 = [[0, 1, 0], [0.014, 0.92, -0.4], [0.027, 1.08, 0.4]];
  V.CHAIN = { hp: 100, comp: { threshold: -18, knee: 6, ratio: 4, attack: 0.005, release: 0.12 }, pres: [3200, 0.9, 3], air: [10000, 0.7, 2] };
  // Per genre: plate send, delay ({ beats } tempo-synced or { secs } fixed; mix = send level; feedback 0.25, LP 3.5 kHz in the
  // loop), air (false: no air shelf), trim (dB on a non-metal hit: the voice / band balance of 1.1, by numbers: pw_seq vox).
  V.SENDS = {
    metal: { plate: 0.18, delay: null, air: true, trim: 0 },
    punk: { plate: 0.08, delay: null, air: false, trim: 0 },
    rock: { plate: 0.2, delay: { beats: 0.75, mix: 0.15 }, air: true, trim: -2.5 },        // dotted 1/8: the '80s wail
    country: { plate: 0.12, delay: { secs: 0.11, mix: 0.2 }, air: true, trim: -4 }        // slapback, matches Earl's Tele
  };
  V.DELAY = { feedback: 0.25, lp: 3500, max: 1.5 };
  V.sends = function (genre) { return V.SENDS[genre] || V.SENDS.rock; };
  // The vocal delay's time for a genre at spb seconds per beat (null: no delay).
  V.delayTime = function (genre, spb) {
    var d = V.sends(genre).delay;
    if (!d) return null;
    return Math.min(V.DELAY.max, d.secs != null ? d.secs : d.beats * (spb > 0 ? spb : 0.5));
  };

  // ---- The singer's Soundcheck profile ----------------------------------------------------------------------------------
  // content voices.sound[<profile id>] (ids as A.voiceFor makes them: 'genre:<g>', a member id, 'rival:<id>') over
  // voices.sound['genre:<g>']: press 0..1, ring (dB), double (bool; default true for lead singers), breath (extra
  // aspiration). Kept apart from the 1.1 profiles so A.timeline (which carries the profile on every vocal event) never moves.
  V.profile = function (vp, genre) {
    var S = (GG.content && GG.content.voices && GG.content.voices.sound) || {}, id = vp && vp.id, out = { double: true };
    var g = genre || (id && /^genre:/.test(id) ? id.slice(6) : null);
    if (g && S['genre:' + g]) Object.assign(out, S['genre:' + g]);
    if (id && S[id] && id !== 'genre:' + g) Object.assign(out, S[id]);
    if (vp) ['press', 'ring', 'double'].forEach(function (k) { if (vp[k] != null) out[k] = vp[k]; });   // (a profile that carries them itself)
    return out;
  };
})(window.GG);
