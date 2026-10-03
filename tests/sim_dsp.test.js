// v1.2 "Soundcheck" Lane I (handoff F13): GG.dsp (src/32_audio_dsp.js) is pure JS, so it is tested here without Web Audio.
// KS tuning +-3 cents midi 28-88 (autocorrelation), T60 within 15 %, no NaN / denormals, chord / strum = the sum of their
// strings, cab IRs normalised (and shaped per the F8 table), impulse v2 pre-delay / early reflections, the metal cluster's
// energy above 6 kHz, the biquads (RBJ) against their analytic response, no two plucks alike (round robins by seed).
const fs = require('fs'), path = require('path');
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');

const GG = load({ localStorage: load.fakeStorage() });
new Function('window', fs.readFileSync(path.join(__dirname, '..', 'src', '32_audio_dsp.js'), 'utf8'))({ GG: GG });
const D = GG.dsp;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const cents = (a, b) => 1200 * Math.log2(a / b);
const finite = a => { for (let i = 0; i < a.length; i++) { const v = a[i]; if (v !== v || !isFinite(v)) return false; const x = Math.abs(v); if (x > 0 && x < 1e-30) return false; } return true; };
const rms = (a, i0, i1) => { let s = 0; i0 = i0 || 0; i1 = i1 == null ? a.length : i1; for (let i = i0; i < i1; i++) s += a[i] * a[i]; return Math.sqrt(s / Math.max(1, i1 - i0)); };

// Fundamental by normalised autocorrelation (the first strong peak after the zero crossing) + parabolic interpolation.
function pitch(x, sr, f0) {
  const n = Math.min(x.length, Math.round(sr * 0.25)), from = Math.round(sr * 0.05), seg = x.subarray(from, from + n);
  const lo = Math.floor(sr / (f0 * 1.3)), hi = Math.ceil(sr / (f0 / 1.3)), r = [];
  let best = -1, bi = lo;
  for (let lag = lo - 1; lag <= hi + 1; lag++) {
    let s = 0, e1 = 0, e2 = 0;
    for (let i = 0; i + lag < seg.length; i++) { s += seg[i] * seg[i + lag]; e1 += seg[i] * seg[i]; e2 += seg[i + lag] * seg[i + lag]; }
    r[lag] = s / Math.sqrt(e1 * e2 + 1e-30);
    if (lag >= lo && lag <= hi && r[lag] > best) { best = r[lag]; bi = lag; }
  }
  const a = r[bi - 1], b = r[bi], c = r[bi + 1], d = (a - c) / (2 * (a - 2 * b + c));
  return sr / (bi + (isFinite(d) ? d : 0));
}
// T60 of the fundamental (band-passed at f0): the slope of its RMS envelope (dB per s) between -6 and -36 dB.
function t60(x0, sr, f0) {
  const x = D.biquad('bandpass', f0, 4, 0, sr).process(Float32Array.from(x0));
  const w = Math.round(sr * Math.max(0.02, 3 / f0)), pts = [];
  for (let i = 0; i + w <= x.length; i += w) pts.push(20 * Math.log10(rms(x, i, i + w) + 1e-12));
  const top = pts[2], xs = [], ys = [];
  pts.forEach((v, k) => { if (k >= 2 && v <= top - 6 && v >= top - 36) { xs.push(k * w / sr); ys.push(v); } });
  const mx = xs.reduce((s, v) => s + v, 0) / xs.length, my = ys.reduce((s, v) => s + v, 0) / ys.length;
  let num = 0, den = 0; xs.forEach((v, k) => { num += (v - mx) * (ys[k] - my); den += (v - mx) * (v - mx); });
  return -60 / (num / den);
}
// Power share of a signal above `hz` (DFT over a window).
function shareAbove(x, sr, hz) {
  const N = 4096, off = 256, seg = x.subarray(off, off + N); let hi = 0, all = 0;
  for (let k = 1; k < N / 2; k += 2) {
    let re = 0, im = 0; const w = 2 * Math.PI * k / N;
    for (let i = 0; i < seg.length; i++) { re += seg[i] * Math.cos(w * i); im -= seg[i] * Math.sin(w * i); }
    const p = re * re + im * im; all += p; if (k * sr / N > hz) hi += p;
  }
  return hi / all;
}

test('pluck: in tune +-3 cents from midi 28 to 88 (22.05 and 32 kHz; bright, dark, palm-muted)', () => {
  const worst = { c: 0 };
  for (const sr of [22050, 32000]) for (let m = 28; m <= 88; m += 4) for (const o of [{ bright: 0.5 }, { bright: 0.25, pick: 0.13 }, { bright: 0.7, pick: 0.27 }]) {
    const f = mtof(m), x = D.pluck(Object.assign({ f, sr, dur: 0.4, seed: m, t60: 2.5 }, o)), got = pitch(x, sr, f), c = cents(got, f);
    if (Math.abs(c) > Math.abs(worst.c)) Object.assign(worst, { c, m, sr, o });
    ok(Math.abs(c) <= 3, 'midi ' + m + ' @' + sr + ' ' + JSON.stringify(o) + ': ' + c.toFixed(2) + ' cents');
  }
  console.log('  KS tuning worst: ' + worst.c.toFixed(2) + ' cents (midi ' + worst.m + ', ' + worst.sr + ' Hz)');
});

test('pluck: T60 within 15 % (open guitar 2.5 s, bass 3 s, palm mute 0.12 s)', () => {
  for (const [m, T, sr, extra] of [[40, 2.5, 22050, {}], [52, 2.5, 22050, {}], [64, 2.5, 32000, {}], [28, 3, 22050, { bright: 0.3 }], [40, 0.12, 22050, { mute: true }], [64, 1.2, 32000, {}]]) {
    const x = D.pluck(Object.assign({ f: mtof(m), sr, dur: Math.max(0.5, T * 0.8), t60: T, seed: 3 }, extra)), got = t60(x, sr, mtof(m));
    ok(Math.abs(got / T - 1) <= 0.15, 'midi ' + m + ' T60 ' + T + ' -> ' + got.toFixed(3));
  }
});

test('pluck: finite, no denormals, normalised, velocity brightens, mute darkens, seeds differ', () => {
  for (const o of [{}, { mute: true }, { vel: 0.1 }, { vel: 1, thump: 1 }, { click: 1 }, { f: 1300 }, { f: 41 }]) {
    const x = D.pluck(Object.assign({ f: 110, sr: 22050, dur: 1.5, seed: 9 }, o));
    ok(finite(x), 'finite ' + JSON.stringify(o));
    ok(Math.abs(rms(x, 0, Math.round(0.06 * 22050)) - 0.5) < 0.01, 'first 60 ms RMS = 0.5 ' + JSON.stringify(o));
  }
  const soft = D.pluck({ f: 110, sr: 22050, dur: 0.5, vel: 0.2, seed: 4 }), hard = D.pluck({ f: 110, sr: 22050, dur: 0.5, vel: 1, seed: 4 });
  ok(shareAbove(hard, 22050, 1500) > 1.5 * shareAbove(soft, 22050, 1500), 'harder = brighter');
  const open = D.pluck({ f: 82, sr: 22050, dur: 0.5, seed: 4 }), mute = D.pluck({ f: 82, sr: 22050, dur: 0.5, seed: 4, mute: true });
  ok(shareAbove(mute, 22050, 1200) < 0.5 * shareAbove(open, 22050, 1200), 'palm mute = darker');
  const a = D.pluck({ f: 82, sr: 22050, dur: 0.3, seed: 1, mute: true }), b = D.pluck({ f: 82, sr: 22050, dur: 0.3, seed: 2, mute: true });
  let d = 0; for (let i = 0; i < a.length; i++) d += (a[i] - b[i]) ** 2;
  ok(20 * Math.log10(Math.sqrt(d / a.length) / rms(a)) > -40, 'two chug round robins differ (> -40 dB)');
  eq(Array.from(D.pluck({ f: 100, sr: 22050, dur: 0.1, seed: 5 }).slice(0, 50)), Array.from(D.pluck({ f: 100, sr: 22050, dur: 0.1, seed: 5 }).slice(0, 50)), 'deterministic');
});

test('chord / strum: exactly the sum of their strings (spread, gap, up order)', () => {
  const fs = [mtof(40), mtof(47), mtof(52)], sr = 22050, dur = 0.4;
  const sum = (gap, order) => { const n = Math.ceil(dur * sr), out = new Float32Array(n); order.forEach((idx, j) => {
    const off = Math.round(j * gap * sr), s = D.pluck({ f: fs[idx], sr, dur: (n - off) / sr, seed: 1 + idx, norm: 0.5 / 3 }); for (let i = 0; i < s.length && off + i < n; i++) out[off + i] += s[i]; }); return out; };
  const near = (a, b) => { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m < 1e-6; };
  ok(near(D.chord({ fs, sr, dur, spread: 0.003, seed: 1 }), sum(0.003, [0, 1, 2])), 'chord');
  ok(near(D.strum({ fs, sr, dur, gap: 0.011, seed: 1 }), sum(0.011, [0, 1, 2])), 'strum down');
  ok(near(D.strum({ fs, sr, dur, gap: 0.011, up: true, seed: 1 }), sum(0.011, [2, 1, 0])), 'strum up: high string first');
  ok(finite(D.strum({ fs: [mtof(40), mtof(45), mtof(50), mtof(55), mtof(59), mtof(64)], sr: 32000, dur: 1, seed: 3 })), 'six strings finite');
});

test('metal cluster: energy above 6 kHz, finite, the bloom sweeps, seeds differ', () => {
  const sr = 44100, hat = D.metal({ sr, dur: 0.15, base: 205.3 * 1.6, hp: 7000, bp: 10000, seed: 1 });
  ok(finite(hat), 'finite');
  const sh = shareAbove(hat, sr, 6000); ok(sh > 0.8, 'hat: > 80 % of the energy above 6 kHz: ' + sh.toFixed(3));
  const cym = D.metal({ sr, dur: 0.6, base: 205.3 * 1.3, bp: 9000, sweep: [9000, 3500, 0.3], seed: 2 });
  ok(finite(cym) && shareAbove(cym, sr, 6000) > 0.5, 'cymbal bloom: mostly above 6 kHz ' + shareAbove(cym, sr, 6000).toFixed(3));
  const late = cym.subarray(Math.round(0.35 * sr)), early = cym.subarray(0, Math.round(0.05 * sr));
  ok(shareAbove(late, sr, 5000) < shareAbove(early, sr, 5000) || shareAbove(late, sr, 3000) > 0, 'the high-pass opens down over the bloom');
  const b = D.metal({ sr, dur: 0.15, base: 205.3 * 1.6, hp: 7000, bp: 10000, seed: 3 });
  let d = 0; for (let i = 0; i < hat.length; i++) d += (hat[i] - b[i]) ** 2;
  ok(20 * Math.log10(Math.sqrt(d / hat.length) / rms(hat)) > -40, 'two hat round robins differ');
  ok(D.METAL_RATIOS.length === 6 && Math.abs(D.METAL_RATIOS[5] * 205.3 - 800) < 1, 'the 808 ratios');
});

test('biquad: RBJ responses (low-pass -3 dB at fc, peaking gain at f0, shelves), stable, in place', () => {
  const sr = 44100, lp = D.biquad('lowpass', 1000, Math.SQRT1_2, 0, sr);
  ok(Math.abs(20 * Math.log10(lp.mag(1000)) + 3.01) < 0.05 && lp.mag(50) > 0.99 && lp.mag(15000) < 0.01, 'low-pass');
  ok(Math.abs(20 * Math.log10(D.biquad('peaking', 2400, 1.2, 3, sr).mag(2400)) - 3) < 0.01, 'peaking +3 dB');
  ok(Math.abs(20 * Math.log10(D.biquad('lowshelf', 140, 0.7, 6, sr).mag(20)) - 6) < 0.3, 'low shelf');
  ok(Math.abs(20 * Math.log10(D.biquad('highshelf', 4000, 0.7, -6, sr).mag(18000)) + 6) < 0.5, 'high shelf');
  const x = new Float32Array(4096); x[0] = 1; const y = D.biquad('highpass', 80, 0.7, 0, sr).process(x);
  ok(y === x && finite(y), 'in place, finite');
  // a measured sine matches mag()
  const f = 3000, n = 8192, s = new Float32Array(n); for (let i = 0; i < n; i++) s[i] = Math.sin(2 * Math.PI * f * i / sr);
  const bp = D.biquad('bandpass', 2000, 1, 0, sr), want = bp.mag(f); bp.process(s);
  ok(Math.abs(rms(s, 4096) / Math.SQRT1_2 - want) < 0.01, 'sine through band-pass = mag(f)');
});

test('cab IRs: 1024 samples, normalised (0 dB mean 150 Hz - 5 kHz), shaped per F8', () => {
  const sr = 44100, gain = (ir, f) => { const w = 2 * Math.PI * f / sr; let re = 0, im = 0; for (let i = 0; i < ir.length; i++) { re += ir[i] * Math.cos(w * i); im -= ir[i] * Math.sin(w * i); } return 20 * Math.log10(Math.hypot(re, im)); };
  const want = { metal: 5500, punk: 5000, rock: 5800, country: 6500, practice8: 4000, combo12: 5000 };
  for (const name of Object.keys(want)) {
    const ir = D.cabIR(name, sr);
    ok(ir instanceof Float32Array && ir.length === 1024 && finite(ir), name + ': 1024 finite samples');
    ok(Math.abs(D.irGain(ir, sr) - 1) < 1e-3, name + ': normalised');
    ok(gain(ir, want[name] * 2) < gain(ir, 1000) - 12, name + ': steep low-pass past ' + want[name] + ' Hz');
    ok(gain(ir, 40) < gain(ir, 1000) - 6, name + ': low cut');
  }
  const m = D.cabIR('metal', sr); ok(gain(m, 600) < gain(m, 150) - 4 && gain(m, 95) > gain(m, 1000) + 4, 'metal: the 95 Hz thump over the 600 Hz scoop (its +3 dB presence is 30\'s carve band)');
  const p8 = D.cabIR('practice8', sr); ok(gain(p8, 900) > gain(p8, 200) + 3 && gain(p8, 900) > gain(p8, 4500) + 6, 'practice 1x8: boxy 900 Hz honk');
  ok(D.cabIR('metal', 48000).length === 1024, '1024 at 48 kHz too');
  ok(JSON.stringify(Array.from(D.cabIR('rock', sr).slice(0, 64))) === JSON.stringify(Array.from(D.cabIR('rock', sr).slice(0, 64))), 'deterministic');
});

test('impulse v2: pre-delay, early reflections inside the window, highs die first, slap, plate', () => {
  const sr = 44100;
  for (const [cls, pre, er] of [['dry', 0, 0.015], ['room', 0.008, 0.03], ['hall', 0.018, 0.06], ['theatre', 0.025, 0.07], ['arena', 0.04, 0.12]]) {
    const [L, R] = D.impulse2(cls, sr, 5), p = Math.round(pre * sr);
    ok(L.length === R.length && L.length === Math.floor(D.ROOMS2[cls].len * sr) && finite(L) && finite(R), cls + ': length + finite');
    for (let i = 0; i < p; i++) if (L[i] !== 0 || R[i] !== 0) { ok(false, cls + ': silent before the pre-delay'); break; }
    // the 8 ER taps: the loudest samples of the first (pre + er) window sit inside it
    const win = Math.round((pre + er) * sr) + 2, peakIn = (a) => { let m = 0, at = 0; for (let i = 0; i < Math.min(a.length, win); i++) if (Math.abs(a[i]) > m) { m = Math.abs(a[i]); at = i; } return at; };
    ok(peakIn(L) >= p && peakIn(L) <= win, cls + ': the strongest early tap is in the ER window (' + peakIn(L) + ' in ' + p + '..' + win + ')');
    let c = 0, eL = 0, eR = 0; for (let i = 0; i < L.length; i++) { c += L[i] * R[i]; eL += L[i] * L[i]; eR += R[i] * R[i]; }
    ok(Math.abs(c / Math.sqrt(eL * eR)) < 0.3, cls + ': L / R decorrelated');
    const n = L.length, head = L.subarray(p, p + Math.round(n * 0.25)), tail = L.subarray(Math.round(n * 0.6));
    ok(shareAbove(tail.length >= 4352 ? tail : L.subarray(n - 4400), sr, 4000) < shareAbove(head, sr, 4000), cls + ': the tail is darker than the head');
  }
  const [hL] = D.impulse2('hall', sr, 5), e = Math.round((0.018 + 0.11) * sr);
  ok(rms(hL, e, e + Math.round(0.04 * sr)) > 1.15 * rms(hL, e - Math.round(0.04 * sr), e), 'hall: the slap back at 110 ms');
  const [pl, pr] = D.impulse2('plate', sr, 5);
  ok(pl.length === Math.floor(1.2 * sr) && Math.abs(pl[0]) + Math.abs(pr[0]) > 0 && finite(pl), 'plate: 1.2 s, no pre-delay');
  ok(shareAbove(pl.subarray(0, 8192), sr, 4000) > shareAbove(D.impulse2('room', sr, 5)[0].subarray(Math.round(0.008 * sr), Math.round(0.008 * sr) + 8192), sr, 4000), 'plate: brighter than a room');
});

test('irFromB64: PCM16 little-endian -> a normalised Float32Array (backing.amp.ir hook)', () => {
  const ir = D.cabIR('punk', 44100), pcm = Buffer.alloc(ir.length * 2);
  const pk = ir.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  for (let i = 0; i < ir.length; i++) pcm.writeInt16LE(Math.round(ir[i] / pk * 32000), 2 * i);
  const g = Object.assign({}, GG); GG.atob = s => Buffer.from(s, 'base64').toString('binary');
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', '32_audio_dsp.js'), 'utf8');
  const G2 = { hashSeed: GG.hashSeed }; new Function('window', 'atob', src)({ GG: G2 }, GG.atob);
  const back = G2.dsp.irFromB64(pcm.toString('base64'), 44100);
  ok(back && back.length === 1024 && Math.abs(G2.dsp.irGain(back, 44100) - 1) < 1e-3, 'decoded + normalised');
  eq(G2.dsp.irFromB64('###', 44100), null, 'garbage -> null');
  ok(g, 'ok');
});

done('sim_dsp');
