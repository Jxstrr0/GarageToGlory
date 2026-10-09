// v1.6 "Showtime" (status.md Addendum 9): the "Less motion" setting (GG.save default null = follow the OS, GG.prefs.normalize
// -> a boolean via matchMedia('(prefers-reduced-motion: reduce)'), the player's pick stored and winning) and the pure parts of
// the highway fx (src/55f_ui_gigfx.js: combo tiers 10 / 25 / 50, the level rule, the beat pulse, the miss flicker vs the soft
// tint, the particle pool's fixed size). The fx module is DOM-only at runtime, so it is loaded here in a bare vm.
const fs = require('fs'), path = require('path'), vm = require('vm');
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');

const media = reduce => ({ matchMedia: q => ({ matches: !!reduce && /prefers-reduced-motion:\s*reduce/.test(q), media: q }) });
const fresh = g => { const store = load.fakeStorage(); return { GG: load({ localStorage: store, globals: g }), store }; };

test('default: GG.save keeps null (follow the OS), normalize gives false without matchMedia; nothing written', () => {
  const { GG, store } = fresh();
  eq(GG.save.SETTINGS_DEFAULTS.lessMotion, null);
  eq(GG.save.settings().lessMotion, null);
  eq(GG.prefs.get().lessMotion, false);
  eq(GG.prefs.osLessMotion(), false);
  ok(!store._map.has('gg.v1.settings'), 'normalize never writes');
});

test('the OS asks for reduced motion: on by default; no preference: off', () => {
  eq(fresh(media(true)).GG.prefs.get().lessMotion, true);
  eq(fresh(media(true)).GG.prefs.osLessMotion(), true);
  eq(fresh(media(false)).GG.prefs.get().lessMotion, false);
  const thrower = { matchMedia: () => { throw new Error('no media'); } };
  eq(fresh(thrower).GG.prefs.get().lessMotion, false, 'a throwing matchMedia reads as no preference');
});

test('the player picks: stored true / false wins over the OS, both ways; junk falls back to the OS', () => {
  let { GG, store } = fresh(media(true));
  GG.prefs.set({ lessMotion: false });
  eq(GG.prefs.get().lessMotion, false, 'off stays off on a reduced-motion OS');
  eq(JSON.parse(store.getItem('gg.v1.settings')).lessMotion, false);
  ({ GG, store } = fresh(media(false)));
  GG.prefs.set({ lessMotion: true });
  eq(GG.prefs.get().lessMotion, true, 'on stays on without the OS asking');
  for (const junk of ['yes', 1, 0, {}, 'true']) {
    eq(GG.prefs.normalize({ lessMotion: junk }).lessMotion, false, 'junk ' + JSON.stringify(junk) + ' -> the OS (no preference)');
    eq(fresh(media(true)).GG.prefs.normalize({ lessMotion: junk }).lessMotion, true, 'junk ' + JSON.stringify(junk) + ' -> the OS (reduce)');
  }
  eq(GG.prefs.normalize({ lessMotion: null }).lessMotion, false);
  eq(GG.prefs.normalize({}).reducedFlash, false, 'reducedFlash unchanged');
});

// the fx module in a bare context (no document: the pure parts only)
function fx() {
  const ctx = { Math, Float32Array, Float64Array, Int8Array, isFinite, parseInt, String, Number };
  ctx.window = ctx; ctx.GG = { registerDebug: () => {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', '55f_ui_gigfx.js'), 'utf8'), ctx);
  return ctx.GG.gigfx;
}

test('combo tiers switch at x10, x25, x50 (the top streak from 50 up)', () => {
  const F = fx();
  eq(Array.from(F.TIERS), [10, 25, 50]);
  const at = [0, 5, 9, 10, 11, 24, 25, 26, 49, 50, 51, 400, -3, NaN, undefined].map(c => F.tierOf(c));
  eq(at, [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 0, 0, 0]);
  eq(F.TEXT.length, 4); ok(F.TEXT[3] !== '#ff6b5e' && F.TEXT[3] !== '#ff6b4a', 'the x50 colour is never the miss red');
});

test('level: force > Less motion > Low graphics > the governor; else full', () => {
  const F = fx();
  eq(F.levelFor({}), { level: 'full', why: null });
  eq(F.levelFor({ quality: 'auto' }), { level: 'full', why: null });
  eq(F.levelFor({ quality: 'high' }), { level: 'full', why: null });
  eq(F.levelFor({ lessMotion: true }), { level: 'calm', why: 'pref' });
  eq(F.levelFor({ quality: 'low' }), { level: 'calm', why: 'low' });
  eq(F.levelFor({ gov: true, quality: 'auto' }), { level: 'calm', why: 'gov' });
  eq(F.levelFor({ lessMotion: true, quality: 'low', gov: true }), { level: 'calm', why: 'pref' });
  eq(F.levelFor({ force: 'full', lessMotion: true, quality: 'low', gov: true }), { level: 'full', why: 'force' });
  eq(F.levelFor({ force: 'calm' }), { level: 'calm', why: 'force' });
  eq(F.levelFor({ force: 'bogus' }), { level: 'full', why: null });
  eq(F.force, null, 'nothing forced by default');
});

test('the beat pulse: 1 on every beat, decays inside it, locked to t / spb', () => {
  const F = fx(), spb = 0.4;
  for (let b = 0; b < 8; b++) ok(Math.abs(F.pulse(b * spb, spb) - 1) < 1e-9, 'beat ' + b);
  ok(F.pulse(0.1, spb) > F.pulse(0.2, spb) && F.pulse(0.2, spb) > F.pulse(0.39, spb), 'decays');
  ok(F.pulse(0.39, spb) < 0.01 && F.pulse(0.2, spb) < 0.1, 'gone by the next beat');
  eq([F.pulse(1, 0), F.pulse(NaN, 0.5), F.pulse(1, -1)], [0, 0, 0]);
  ok(Math.abs(F.pulse(-0.3, spb) - F.pulse(0.1, spb)) < 1e-9, 'the count-in (t < 0) pulses too');
});

test('the miss line: a flicker (down and back up) vs reducedFlash\'s soft tint (only fades), both gone by MISS_MS', () => {
  const F = fx(), hard = [], soft = [];
  for (let ms = 0; ms < F.MISS_MS; ms += 5) { hard.push(F.missAlpha(ms, false)); soft.push(F.missAlpha(ms, true)); }
  const ups = a => a.slice(1).filter((v, i) => v > a[i] + 1e-9).length;
  ok(ups(hard) >= 2, 'the flicker comes back up ' + ups(hard) + ' times');
  eq(ups(soft), 0, 'the soft tint never comes back up');
  ok(Math.max.apply(null, soft) <= 0.32 + 1e-9 && Math.max.apply(null, hard) > 0.9, 'soft stays faint, the flicker starts full');
  eq([F.missAlpha(F.MISS_MS, false), F.missAlpha(F.MISS_MS, true), F.missAlpha(-1, false), F.missAlpha(NaN, true)], [0, 0, 0, 0]);
});

test('particles: a fixed pool, nothing lives past 300 ms', () => {
  const F = fx();
  eq(F.POOL, 96); ok(F.LIFE <= 300, 'LIFE ' + F.LIFE);
  ok(F.MISS_MS <= 400, 'the miss line is short');
});

done('fx');
