// v1.2 "Soundcheck" Lane V (handoff F10, contract §4.4): GG.voice, the pure vocal models (33_audio_voice.js), no Web Audio.
// Glottal spectra (breathy / modal / belt), formants (5, Q from bandwidths, -6 dB steps, F1 tracking, ring), pitchCurve
// (scoop, bend, vibrato onset / rate / depth drift, 1/f wander, jitter; deterministic), shimmer, the swell envelope, sends,
// the singer's Soundcheck profile (content voices.sound), and 30 + 33 together: the timeline never moves.
const fs = require('fs'), path = require('path');
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');

const GG = load({ localStorage: load.fakeStorage() });
const src = f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
new Function('window', src('33_audio_voice.js'))({ GG: GG });
const V = GG.voice;
const mag = (w, k) => Math.hypot(w.real[k], w.imag[k]);
const energy = (w, a, b) => { let s = 0; for (let k = a; k <= b; k++) s += mag(w, k) ** 2; return s; };
const cents = (a, b) => 1200 * Math.log2(a / b);

test('glottal: 48 harmonics, normalised, DC 0; belt brighter than modal brighter than breathy', () => {
  eq(V.WAVES, { breathy: 0.8, modal: 0.6, belt: 0.4 });
  const W = {}; for (const k of Object.keys(V.WAVES)) W[k] = V.glottal(V.WAVES[k], 48);
  for (const [k, w] of Object.entries(W)) {
    ok(w.real.length === 49 && w.imag.length === 49 && w.real[0] === 0 && w.imag[0] === 0, k + ' shape');
    let peak = 0; for (let h = 1; h <= 48; h++) { ok(isFinite(w.real[h]) && isFinite(w.imag[h]), k + ' finite'); peak = Math.max(peak, mag(w, h)); }
    ok(Math.abs(peak - 1) < 1e-6, k + ' peak harmonic = 1');
  }
  const tilt = w => energy(w, 10, 48) / energy(w, 1, 3);
  ok(tilt(W.belt) > tilt(W.modal) * 1.3 && tilt(W.modal) > tilt(W.breathy) * 1.3, 'spectral tilt ' + ['belt', 'modal', 'breathy'].map(k => tilt(W[k]).toFixed(4)).join(' > '));
  ok(V.glottal(0.6, 48) === V.glottal(0.6, 48), 'cached');
  // the time-domain wave of the differentiated pulse: one sharp negative closing spike per period
  const w = W.belt, N = 512, x = new Float64Array(N);
  for (let i = 0; i < N; i++) for (let h = 1; h <= 48; h++) x[i] += w.real[h] * Math.cos(2 * Math.PI * h * i / N) + w.imag[h] * Math.sin(2 * Math.PI * h * i / N);
  const mn = Math.min(...x), mx = Math.max(...x);
  ok(-mn > mx * 1.5, 'closing spike dominates (min ' + mn.toFixed(2) + ', max ' + mx.toFixed(2) + ')');
});

test('press -> open quotient: quantised (<= 9 waves), voc type defaults, metal belts, a profile press wins', () => {
  eq([0, 0.5, 1].map(V.oq), [0.8, 0.6, 0.4]);
  ok(new Set(Array.from({ length: 101 }, (_, i) => V.oq(i / 100))).size <= 9, 'at most 9 waves');
  ok(V.press('yell', {}) > 0.8 && V.press('wail', {}) > 0.8, 'punk yell + rock wail belt');
  ok(Math.abs(V.press('holler', {}) - 0.5) < 0.11, 'country holler modal');
  ok(V.press('ooh', {}) < 0.3 && V.press('whoa', {}) < 0.3, 'whoa-ohs breathy');
  eq(V.press('scream', {}, true), 1, 'metal: the belt wave');
  eq(V.press('yell', { press: 0.2 }), 0.2, 'profile press');
});

test('formants: 5 rows, Q = F / BW, -6 dB steps, F4/F5 x formant scale, F1 tracks a high f0, ordered', () => {
  const f = V.formants('a', { formant: 1 });
  eq(f.length, 5);
  eq(f.map(r => r[0]), [730, 1090, 2440, 3400, 4300]);
  eq(f.map(r => r[2]), [0, -6, -12, -18, -24]);
  f.forEach((r, k) => ok(Math.abs(r[1] - r[0] / V.BW[k]) < 0.01, 'Q ' + k));
  const s = V.formants('a', { formant: 1.1 });
  ok(Math.abs(s[3][0] - 3740) < 0.1 && Math.abs(s[4][0] - 4730) < 0.1, 'F4 / F5 scale');
  eq(V.formants([500, 1500, 2500], {})[1][0], 1500, 'an [F1, F2, F3] array');
  eq(V.track(300, 200), 300, 'low note: F1 stays'); ok(Math.abs(V.track(300, 400) - 440) < 1e-9, 'high note: F1 = 1.1 f0');
  eq(V.formants('i', {}, 440)[0][0], 484, "'ee' sung at A4: F1 rides over the pitch");
  for (const v of Object.keys(V.VOWELS)) for (const sc of [0.72, 1, 1.5]) for (const f0 of [80, 300, 700]) {
    const r = V.formants(v, { formant: sc }, f0);
    for (let k = 1; k < 5; k++) ok(r[k][0] > r[k - 1][0], v + ' ordered ' + sc + ' ' + f0);
  }
  eq(V.ring({ ring: 4 }), [3000, 1.6, 4]); eq(V.ring({}), null); eq(V.ring({ ring: 30 })[2], 12, 'capped');
});

test('pitchCurve: 120 pts/s, deterministic, scoop + bend, vibrato onset 0.18-0.3 s, rate + depth drift, wander <= 8 cents', () => {
  const o = { vib: [5.7, 0.02], seed: 42 }, a = V.pitchCurve(220, 1.5, o), b = V.pitchCurve(220, 1.5, o);
  eq(a.length, 180); eq(Array.from(a), Array.from(b), 'same seed, same curve');
  ok(Array.from(V.pitchCurve(220, 1.5, { vib: [5.7, 0.02], seed: 43 })).some((x, i) => x !== a[i]), 'another seed differs');
  // flat (no vib, no jitter): only the wander, inside +-8 cents, slow (no 120 Hz zipper)
  const w = V.pitchCurve(200, 2, { seed: 7 }); let mx = 0, step = 0;
  for (let i = 0; i < w.length; i++) { mx = Math.max(mx, Math.abs(cents(w[i], 200))); if (i) step = Math.max(step, Math.abs(cents(w[i], w[i - 1]))); }
  ok(mx <= 8.001 && mx > 1, 'wander within 8 cents and alive: ' + mx.toFixed(2));
  ok(step < 1, 'wander is slow (max ' + step.toFixed(3) + ' cents per 1/120 s)');
  eq(V.pitchCurve(200, 1, { seed: 7, wander: 0 })[50], 200, 'wander 0 = dead flat');
  // scoop up into the note, bend over it
  const sc = V.pitchCurve(200, 1, { scoop: -3, wander: 0, seed: 1 });
  ok(Math.abs(cents(sc[0], 200) + 300) < 0.5 && Math.abs(cents(sc[20], 200)) < 0.01, 'scoop -3 st over 80 ms');
  const bd = V.pitchCurve(200, 1, { bend: -2, wander: 0, seed: 1 });
  ok(Math.abs(cents(bd[bd.length - 1], 200) + 200) < 0.5, 'bend -2 st by the end');
  // vibrato: nothing before ~onset/3, full depth after the onset; onset by length
  eq([0.3, 0.4, 1.5, 3].map(d => +V.onset(d).toFixed(3)), [0.18, 0.18, 0.3, 0.3]);
  const vb = V.pitchCurve(200, 2, { vib: [5.7, 0.03], wander: 0, seed: 3 }), dev = (from, to) => { let m = 0; for (let i = Math.round(from * 120); i < Math.round(to * 120); i++) m = Math.max(m, Math.abs(vb[i] / 200 - 1)); return m; };
  ok(dev(0, 0.05) < 0.003, 'vibrato fades in (' + dev(0, 0.05).toFixed(4) + ')');
  ok(dev(0.5, 2) > 0.022 && dev(0.5, 2) < 0.037, 'full depth 0.03 +-20 % (' + dev(0.5, 2).toFixed(4) + ')');
  // rate: count upward zero crossings after the onset -> 5.2..6.2 Hz per note (vib[0] 5.7 +- 0.5, drift +-0.2)
  const rates = [];
  for (let s = 1; s <= 30; s++) {
    const c = V.pitchCurve(200, 3, { vib: [5.7, 0.03], wander: 0, seed: s }), x = [];
    for (let i = 61; i < c.length; i++) if (c[i - 1] < 200 && c[i] >= 200) x.push(i - 1 + (200 - c[i - 1]) / (c[i] - c[i - 1]));
    rates.push((x.length - 1) / ((x[x.length - 1] - x[0]) / 120));
  }
  ok(Math.min(...rates) > 4.9 && Math.max(...rates) < 6.5, 'per-note rates ' + Math.min(...rates).toFixed(2) + '..' + Math.max(...rates).toFixed(2));
  ok(new Set(rates.map(r => r.toFixed(1))).size >= 4, 'rates vary note to note');
  // jitter: cycle-to-cycle roughness
  const j = V.pitchCurve(200, 1, { jit: 0.02, wander: 0, seed: 9 });
  ok(Array.from(j).every(x => Math.abs(x / 200 - 1) <= 0.0201) && Array.from(j).some(x => Math.abs(x / 200 - 1) > 0.01), 'jitter within jit');
  ok(Array.from(V.pitchCurve(440, 0.01, {})).length === 2, 'a tiny note: 2 points');
});

test('shimmer: 480 pts/s, mean ~1, within depth, 40-80 Hz moves, deterministic', () => {
  const s = V.shimmer(2, 0.05, 11);
  eq(s.length, 960); eq(Array.from(s), Array.from(V.shimmer(2, 0.05, 11)));
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  ok(Math.abs(mean - 1) < 0.01, 'mean ' + mean.toFixed(4));
  ok(Array.from(s).every(x => x >= 0.95 - 1e-6 && x <= 1.05 + 1e-6), 'within +-5 %');
  let turns = 0; for (let i = 2; i < s.length; i++) if ((s[i] - s[i - 1]) * (s[i - 1] - s[i - 2]) < 0) turns++;
  ok(turns / 2 > 35 && turns / 2 < 85, 'about 40-80 moves per second (' + turns / 2 + ')');
});

test('envelope: attack to peak, held notes swell +10 % at 60 %, settle, end silent; short hits sag as in 1.1', () => {
  const e = V.envelope(1, 1.2, 0.012);
  eq(e[0], [0, 0.0001, 'set']); eq(e[1], [0.012, 1, 'exp']);
  ok(e[2][2] === 'lin' && Math.abs(e[2][0] - 0.72) < 1e-9 && Math.abs(e[2][1] - 1.1) < 1e-9, 'swell +10 % by 60 %');
  ok(e[3][1] < 1 && e[3][0] < 1.2, 'settles');
  eq(e[e.length - 1], [1.2, 0.0001, 'exp']);
  const s = V.envelope(0.8, 0.3);
  eq(s.length, 4); ok(Math.abs(s[2][1] - 0.56) < 1e-9, 'short: sag to 0.7 x peak (the 1.1 held())');
  for (const d of [0.05, 0.2, 0.45, 2]) { const p = V.envelope(1, d); for (let i = 1; i < p.length; i++) ok(p[i][0] > p[i - 1][0], 'times rise ' + d); }
});

test('velGain (contract §4.1): VEL_REF plays at the 1.1 level, +2.5 dB cap, 0 silent', () => {
  ok(Math.abs(V.velGain(0.85) - 1) < 1e-12, 'vel 0.85 = 1'); eq(V.velGain(0), 0); eq(V.velGain(1.5), 1.333);
  ok(V.velGain(0.6) < V.velGain(0.7) && V.velGain(0.7) < V.velGain(0.85), 'monotonic');
});

test('sends, delay, gang, double, chain (F10 table)', () => {
  eq(['metal', 'punk', 'rock', 'country'].map(g => V.sends(g).plate), [0.18, 0.08, 0.2, 0.12], 'plate sends');
  eq(V.sends('punk').air, false, 'punk: no air shelf'); ok(V.sends('rock').air && V.sends('metal').air && V.sends('country').air);
  eq(V.delayTime('metal', 0.5), null); eq(V.delayTime('punk', 0.5), null);
  ok(Math.abs(V.delayTime('rock', 0.5) - 0.375) < 1e-9, 'rock: dotted 1/8 at 120 bpm');
  eq(V.delayTime('country', 0.4), 0.11, 'country: 110 ms slapback'); eq(V.delayTime('rock', 3), 1.5, 'capped at the delay line');
  eq([V.sends('rock').delay.mix, V.sends('country').delay.mix, V.DELAY.feedback, V.DELAY.lp], [0.15, 0.2, 0.25, 3500]);
  eq(V.GANG3, [[0, 1, 0], [0.014, 0.92, -0.4], [0.027, 1.08, 0.4]]);
  eq([V.DOUBLE.cents, V.DOUBLE.late, V.DOUBLE.pan], [8, [0.018, 0.028], 0.25]);
  eq([V.CHAIN.hp, V.CHAIN.comp.threshold, V.CHAIN.comp.ratio, V.CHAIN.comp.attack, V.CHAIN.comp.release, V.CHAIN.pres[0], V.CHAIN.pres[2], V.CHAIN.air[0], V.CHAIN.air[2]],
    [100, -18, 4, 0.005, 0.12, 3200, 3, 10000, 2]);
});

test('Soundcheck profiles (content voices.sound): genre defaults under the singer; ids as A.voiceFor makes them; doubles default on', () => {
  const S = GG.content.voices.sound;
  ok(S && typeof S === 'object', 'voices.sound exists');
  for (const k of Object.keys(S)) {
    const p = S[k]; ok(/^(genre:(metal|punk|rock|country)|rival:[a-z_]+|[a-z_]+)$/.test(k), 'id ' + k);
    for (const x of Object.keys(p)) ok(['press', 'ring', 'double', 'breath'].includes(x), k + ': known key ' + x);
    if (p.press != null) ok(p.press >= 0 && p.press <= 1, k + ' press 0..1');
    if (p.ring != null) ok(p.ring >= 0 && p.ring <= 12, k + ' ring dB');
    if (p.double != null) ok(typeof p.double === 'boolean', k + ' double bool');
    if (!/^genre:|^rival:/.test(k)) ok(GG.content.voices.profiles[k], k + ' is a 1.1 profile id');
    if (/^rival:/.test(k)) ok(GG.content.voices.rivals[k.slice(6)], k + ' is a rival');
  }
  eq(V.profile({ id: 'genre:rock' }, 'rock').double, true, 'lead singers double by default');
  ok(V.profile({ id: 'chase' }, 'rock').ring > 0, 'Chase rings (the rock wail belter)');
  ok(V.profile({ id: 'travis' }, 'country').ring > 0, 'Travis rings (the country holler)');
  ok(V.profile({ id: 'rox' }, 'punk').press > 0.8, 'Rox belts');
  eq(V.profile({ id: 'x', press: 0.3, ring: 2, double: false }, 'punk').press, 0.3, 'a profile carrying the keys wins');
  eq(V.profile(null, null), { double: true });
});

test('30 + 33 together: GG.voice survives the stage-0 GG.voice = {} line; the timeline is untouched by the voices table', () => {
  const G2 = load({ localStorage: load.fakeStorage() });
  new Function('window', src('30_audio.js'))({ GG: G2 });
  for (const f of ['31_audio_feel.js', '32_audio_dsp.js', '33_audio_voice.js']) new Function('window', src(f))({ GG: G2 });
  ok(typeof G2.voice.glottal === 'function' && typeof G2.voice.pitchCurve === 'function', 'GG.voice filled');
  ok(typeof G2.audio._buildVox === 'function', 'A._buildVox registered');
  const p = JSON.parse(JSON.stringify(G2.songs.signature('rock')));
  const tl = G2.audio.timeline(p, { genre: 'rock', songId: 's1', singer: 'chase' }), vx = tl.events.filter(e => e.kind === 'vox');
  ok(vx.length > 0 && vx.every(e => !('press' in e.vp) && !('ring' in e.vp) && !('double' in e.vp)), 'vocal events carry the 1.1 profile only');
});

done('sim_voice');
