// pw_fx.js (v1.6 "Showtime", status.md Addendum 9): the gig highway's animation (src/55f_ui_gigfx.js + the hooks in 55_ui_gig)
// played by the live bot (GG.ui.gigLiveBot: real time, count-in + band + frames + fx; its taps and the session's ticks on a
// fixed 50 ms song-time grid). Sections (META_ONLY=<a,b>; default all), each inside `timeout 500`, at PW_VIEW=390x844 /
// 440x956 / 1440x900 (a width >= 1000 opens a desktop context: the PC layout's highway):
//   fx    : forced full: the particle pool is used on hits (spawned >= 6 per hit, live / peak <= the 96 cap), gem glows +
//           glints drawn, the texture scrolls, the miss line flickers (not soft) and misses crack; no sprite rebuilt while
//           playing; no console errors.
//   tiers : a clean run to x55: every frame's tier = 0 / 1 / 2 / 3 at combo < 10 / >= 10 / >= 25 / >= 50 (all three
//           reached), the combo colour follows the tier, flames from x10 (none below), the star shine only at x50+.
//   calm  : Settings "Less motion" (set-lessMotion, next to Reduced flashing): on -> stored, the gig is calm ('pref'): no
//           particles, flames, texture, glows, glints, shimmer or shine while hits land; the combo colour + tiers stay; a
//           reload keeps it On; off -> stored false. Graphics Low -> calm ('low'); 'auto' + slow frames fed to the governor
//           -> calm ('gov', latched for the song); High -> full.
//   os    : a context with prefers-reduced-motion: reduce (Playwright reducedMotion): Less motion defaults On (nothing
//           stored), the gig is calm; the player turns it Off -> stored false, a reload keeps it Off.
//   flash : Reduced flashing (fx forced full): the miss line is a soft tint (every frame's missA <= 0.32, soft), the pure
//           missAlpha never comes back up; sparks still fly.
//   same  : the judgement + timing proof: one seeded live-bot gig (3 songs, 8 s live each, then botPlay finishes the song)
//           with fx full, fx calm and the Less motion setting: every 'gig:judge' (lane, judgement, combo, crowd), every song
//           result and the gig's grade + score are identical; the highway geometry (hitY, laneW, look, gem size) too.
//   perf  : the highway's own draw time (debug('gigfx').drawMs) over a dense song, full vs calm: full p95 <= 4 ms (6 ms on
//           a desktop), full p50 <= calm p50 + 1.5 ms; the pool never grows, no sprite rebuilt.
// Run: node build.js && META_ONLY=fx timeout 500 node tests/pw_fx.js   (PW_VIEW=440x956 / 1440x900 for the other sizes)
const { open, checker, VIEW } = require('./_pw');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);
const tid = id => `[data-testid="${id}"]`;
const DESK = VIEW.width >= 1000;
const TAG = VIEW.width + 'x' + VIEW.height;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function boot(o) {
  const r = await open(Object.assign({ desktop: DESK }, o || {}));
  await r.page.waitForSelector(tid('btn-new'), { timeout: 30000 });
  return r;
}
// A drum career with `n` dense 6-lane songs (8th hats, kick + snare, crash / toms accents) and a booked gig; the live bot plays.
async function gig(page, o) {
  o = o || {};
  await page.evaluate(o => {
    const E = '................';
    GG.ui.closeAll();
    GG.prefs.set(Object.assign({ gigDifficulty: 'hard', calibSeen: true, noFail: true, autoKick: false, lefty: false, graphics: 'high' }, o.prefs || {}));
    GG.main.quickStart({ seed: o.seed || 1616, bandId: 'hail_damage', seat: 'drums', openCard: false });
    const s = GG.state; GG.ui.closeAll(); s.card = null; s.phase = 'plan'; s.liveGig = null; GG.ui.gigAutoplay = false;
    s.gear = Object.assign({}, s.gear, { lanes: 6 });
    const bars = o.bars || ['x...x.....x.x...', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x...............', '..............x.', '......x.......x.'];
    const arr = ['verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus'];
    s.songs = ['Lawn Fire', 'Hedge Fund', 'Sprinkler'].slice(0, o.n || 1).map(t => GG.songs.create(s, { bpm: o.bpm || 150, lanes: 6, arrangement: arr,
      sections: { verse: bars, chorus: bars, bridge: bars.map(() => E) } }, t, { quality: 60, polish: 60 }));
    GG.main.sync();
    GG.gigfx.force = o.force === undefined ? 'full' : o.force;
    GG.ui.gigLiveBot = Object.assign({ accuracy: 0.9, jitterMs: 40 }, o.bot || {});
    s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); window.__done = null;
    GG.ui.playGig(s.gig, r => { window.__done = r || true; });
  }, o);
  await page.waitForFunction(() => GG.debug('ui').screen === 'gig-set', null, { timeout: 15000 });
  await record(page);
  await page.evaluate(() => document.querySelector('[data-testid="btn-gig-start"]').click());
  await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 20000 });
}
// records what the fx layer did each frame (wrapping GG.gigfx: 55 looks its methods up at call time)
async function record(page) {
  await page.evaluate(() => {
    const F = GG.gigfx;
    if (window.__fx) { const R = window.__fx; R.frames = []; R.mids = []; R.glow = R.glint = R.shimmer = 0; return; }
    const R = window.__fx = { frames: [], mids: [], glow: 0, glint: 0, shimmer: 0 };
    const wrap = (k, after) => { const f0 = F[k]; F[k] = function () { const r = f0.apply(this, arguments); after(arguments); return r; }; };
    wrap('frame', a => { const S = F.state; R.frames.push([a[3], S.tier, S.level, F.comboColor()]); if (R.frames.length > 5000) R.frames.shift(); });
    wrap('mid', () => { const S = F.state; R.mids.push([S.level, S.flames, S.texture, S.shine, S.missA, S.soft, S.tier]); if (R.mids.length > 5000) R.mids.shift(); });
    wrap('glow', () => { R.glow++; }); wrap('glint', () => { R.glint++; }); wrap('shimmer', () => { R.shimmer++; });
  });
}
const fx = page => page.evaluate(() => { const R = window.__fx; return { d: GG.debug('gigfx'), g: GG.debug('gigui'), frames: R.frames, mids: R.mids, glow: R.glow, glint: R.glint, shimmer: R.shimmer }; });
const tierRule = c => c >= 50 ? 3 : c >= 25 ? 2 : c >= 10 ? 1 : 0;

/* ---- fx ---------------------------------------------------------------------------------------------------------- */
async function secFx() {
  const c = checker('fx ' + TAG);
  const { page, errors, close } = await boot();
  try {
    await gig(page, { bot: { accuracy: 0.88, jitterMs: 45 } });
    await record(page);
    const d0 = await page.evaluate(() => GG.debug('gigfx'));
    await sleep(9000);
    const r = await fx(page);
    const d = r.d;
    console.log('INFO fx ' + JSON.stringify({ level: d.level, why: d.why, particles: d.particles, hits: d.hits - d0.hits, perfects: d.perfects - d0.perfects, misses: d.misses - d0.misses, glow: r.glow, glint: r.glint, frames: r.frames.length, drawMs: d.drawMs, builds: [d0.builds, d.builds] }));
    c.ok(d.level === 'full' && d.why === 'force', 'forced full ' + d.level + ' ' + d.why);
    const hits = d.hits - d0.hits, spawned = d.particles.spawned - d0.particles.spawned;
    c.ok(hits > 10 && spawned >= 6 * hits, 'the particle pool is used on hits: ' + spawned + ' sparks for ' + hits + ' hits');
    c.ok(d.particles.peak > 0 && d.particles.peak <= d.particles.cap && d.particles.cap === 96, 'pool peak ' + d.particles.peak + ' <= cap ' + d.particles.cap);
    c.ok(r.glow > 0 && r.glint > 0, 'gem glows + glints drawn ' + r.glow + ' / ' + r.glint);
    c.ok(r.mids.filter(m => m[2]).length >= r.mids.length * 0.9, 'the texture scrolls on full frames');
    const misses = d.misses - d0.misses, missF = r.mids.filter(m => m[4] > 0);
    c.ok(misses > 0 && missF.length > 0, 'misses (' + misses + ') light the hit line on ' + missF.length + ' frames');
    c.ok(missF.every(m => m[5] === false), 'the miss line flickers (not the soft tint) without reduced flashing');
    const flick = await page.evaluate(() => { const F = GG.gigfx, a = []; for (let ms = 0; ms < F.MISS_MS; ms += 5) a.push(F.missAlpha(ms, false)); return a.slice(1).filter((v, i) => v > a[i] + 1e-9).length; });
    c.ok(flick >= 2, 'the miss flicker goes dim and back up ' + flick + ' times');
    c.ok(d.builds === d0.builds && d.sprites > 0, 'no sprite rebuilt while playing (builds ' + d.builds + ', sprites ' + d.sprites + ')');
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'fx threw: ' + (e && e.stack || e)); }
  finally { await close(); }
  c.done();
}

/* ---- tiers ------------------------------------------------------------------------------------------------------- */
async function secTiers() {
  const c = checker('tiers ' + TAG);
  const { page, errors, close } = await boot();
  try {
    await gig(page, { bot: { accuracy: 1, jitterMs: 0 } });
    await page.waitForFunction(() => GG.debug('gigui').combo >= 55, null, { timeout: 40000, polling: 250 });
    await sleep(600);
    const r = await fx(page), T = await page.evaluate(() => GG.gigfx.TEXT);
    const bad = r.frames.filter(f => f[1] !== tierRule(f[0]));
    console.log('INFO tiers frames ' + r.frames.length + ' combos ' + r.frames[0][0] + '..' + r.frames[r.frames.length - 1][0] + ' bad ' + JSON.stringify(bad.slice(0, 4)));
    c.ok(!bad.length, 'every frame: tier 0 / 1 / 2 / 3 below x10 / from x10 / x25 / x50');
    const seen = [1, 2, 3].map(k => r.frames.some(f => f[1] === k));
    c.ok(seen.every(Boolean), 'tiers 1, 2 and 3 all reached ' + JSON.stringify(seen));
    const first = k => r.frames.find(f => f[1] === k);
    c.ok([1, 2, 3].every(k => first(k) && first(k)[0] >= [0, 10, 25, 50][k] && first(k)[0] < [0, 10, 25, 50][k] + 8), 'each tier switches on at its threshold ' + JSON.stringify([1, 2, 3].map(k => first(k) && first(k)[0])));
    c.ok(r.frames.every(f => f[3] === T[f[1]]), 'the combo colour follows the tier ' + JSON.stringify(T));
    const mids = r.mids.filter(m => m[0] === 'full');
    c.ok(mids.filter(m => m[6] === 0).every(m => m[1] === 0) && mids.filter(m => m[6] >= 1).every(m => m[1] > 0), 'lane flames from x10, none below');
    c.ok(mids.filter(m => m[6] === 3).every(m => m[3]) && mids.filter(m => m[6] < 3).every(m => !m[3]) && mids.some(m => m[3]), 'the star shine only at x50+');
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'tiers threw: ' + (e && e.stack || e)); }
  finally { await close(); }
  c.done();
}

/* ---- calm -------------------------------------------------------------------------------------------------------- */
async function settingsToggle(page) {
  await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('settings'); });
  await page.waitForFunction(() => GG.debug('ui').screen === 'settings', null, { timeout: 8000 });
  return page.evaluate(() => { const b = document.querySelector('[data-testid="set-lessMotion"]'); if (!b) return null;
    const row = b.closest('.set-row'), prev = row && row.previousElementSibling && row.previousElementSibling.querySelector('[data-testid]');
    return { pressed: b.getAttribute('aria-pressed'), text: b.textContent, sub: row ? row.textContent : '', prev: prev ? prev.dataset.testid : null }; });
}
async function calmPlay(page, c, why, label) {
  await record(page);
  const d0 = await page.evaluate(() => GG.debug('gigfx'));
  await sleep(5000);
  const r = await fx(page), d = r.d, hits = d.hits - d0.hits;
  c.ok(d.level === 'calm' && d.why === why, label + ': calm (' + d.level + ', ' + d.why + ')');
  c.ok(hits > 5 && d.particles.spawned === d0.particles.spawned, label + ': no particles for ' + hits + ' hits');
  c.ok(r.mids.length > 3 && r.mids.every(m => m[1] === 0 && !m[2] && !m[3]), label + ': no flames, texture or star shine');
  c.ok(r.glow === 0 && r.glint === 0 && r.shimmer === 0, label + ': no glows, glints or shimmer');
  c.ok(r.frames.every(f => f[1] === tierRule(f[0])) && r.frames.some(f => f[1] >= 1), label + ': the combo colour + tiers stay');
}
async function secCalm() {
  const c = checker('calm ' + TAG);
  let { page, errors, close } = await boot();
  try {
    c.ok(await page.evaluate(() => GG.prefs.get().lessMotion === false && GG.save.settings().lessMotion === null), 'default off (no OS preference), nothing stored');
    let t = await settingsToggle(page);
    c.ok(t && t.pressed === 'false' && t.prev === 'set-reducedFlash' && /Less motion/.test(t.sub) && /older phones/.test(t.sub), 'Settings row "Less motion" next to Reduced flashing, Off ' + JSON.stringify(t));
    await page.locator(tid('set-lessMotion')).click();
    t = await settingsToggle(page);
    c.ok(t.pressed === 'true' && await page.evaluate(() => JSON.parse(localStorage.getItem('gg.v1.settings')).lessMotion === true), 'On: stored true');
    await page.reload(); await page.waitForSelector(tid('btn-new'), { timeout: 30000 });
    t = await settingsToggle(page);
    c.ok(t.pressed === 'true' && await page.evaluate(() => GG.prefs.get().lessMotion === true), 'a reload keeps it On');
    await gig(page, { force: null, bot: { accuracy: 0.95, jitterMs: 30 }, prefs: {} });
    await calmPlay(page, c, 'pref', 'Less motion');
    await page.evaluate(() => GG.ui.closeAll());
    t = await settingsToggle(page);
    await page.locator(tid('set-lessMotion')).click();
    t = await settingsToggle(page);
    c.ok(t.pressed === 'false' && await page.evaluate(() => JSON.parse(localStorage.getItem('gg.v1.settings')).lessMotion === false && GG.prefs.get().lessMotion === false), 'Off again: stored false');
    await gig(page, { force: null, bot: { accuracy: 0.95, jitterMs: 30 }, prefs: { graphics: 'low' } });
    await calmPlay(page, c, 'low', 'graphics Low');
    await gig(page, { force: null, bot: { accuracy: 0.95, jitterMs: 30 }, prefs: { graphics: 'high' } });
    await sleep(1500);
    let d = await page.evaluate(() => GG.debug('gigfx'));
    c.ok(d.level === 'full' && d.why === null, 'graphics High, nothing asked: full (' + d.level + ', ' + d.why + ')');
    await gig(page, { force: null, bot: { accuracy: 0.95, jitterMs: 30 }, prefs: { graphics: 'auto' } });
    for (let i = 0; i < 6; i++) { await page.evaluate(() => GG.render.feedFrames(new Array(90).fill(45))); await sleep(800); }
    d = await page.evaluate(() => ({ fx: GG.debug('gigfx'), perf: GG.debug('perf') }));
    console.log('INFO gov ' + JSON.stringify({ level: d.fx.level, why: d.fx.why, autoRatio: d.perf.autoRatio, want: d.perf.want }));
    c.ok(d.fx.level === 'calm' && d.fx.why === 'gov', 'auto graphics + slow frames: the governor steps down -> calm (gov)');
    await calmPlay(page, c, 'gov', 'governor');
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'calm threw: ' + (e && e.stack || e)); }
  finally { await close(); }
  c.done();
}

/* ---- os ---------------------------------------------------------------------------------------------------------- */
async function secOs() {
  const c = checker('os ' + TAG);
  const { page, errors, close } = await boot({ reducedMotion: 'reduce' });
  try {
    c.ok(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), 'the context asks for reduced motion');
    c.ok(await page.evaluate(() => GG.prefs.get().lessMotion === true && GG.save.settings().lessMotion === null && !('lessMotion' in JSON.parse(localStorage.getItem('gg.v1.settings') || '{}'))), 'Less motion defaults On, nothing stored');
    let t = await settingsToggle(page);
    c.ok(t && t.pressed === 'true', 'the Settings toggle shows On');
    await gig(page, { force: null, bot: { accuracy: 0.95, jitterMs: 30 } });
    await sleep(1200);
    const d = await page.evaluate(() => GG.debug('gigfx'));
    c.ok(d.level === 'calm' && d.why === 'pref' && d.lessMotion, 'the gig is calm (' + d.level + ', ' + d.why + ')');
    await page.evaluate(() => GG.ui.closeAll());
    await settingsToggle(page);
    await page.locator(tid('set-lessMotion')).click();
    t = await settingsToggle(page);
    c.ok(t.pressed === 'false' && await page.evaluate(() => JSON.parse(localStorage.getItem('gg.v1.settings')).lessMotion === false), 'the player turns it Off: stored false');
    await page.reload(); await page.waitForSelector(tid('btn-new'), { timeout: 30000 });
    t = await settingsToggle(page);
    c.ok(t.pressed === 'false' && await page.evaluate(() => GG.prefs.get().lessMotion === false), 'a reload keeps it Off (the pick beats the OS)');
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'os threw: ' + (e && e.stack || e)); }
  finally { await close(); }
  c.done();
}

/* ---- flash ------------------------------------------------------------------------------------------------------- */
async function secFlash() {
  const c = checker('flash ' + TAG);
  const { page, errors, close } = await boot();
  try {
    await gig(page, { bot: { accuracy: 0.75, jitterMs: 50 }, prefs: { reducedFlash: true } });
    await record(page);
    const d0 = await page.evaluate(() => GG.debug('gigfx'));
    await sleep(8000);
    const r = await fx(page), d = r.d, missF = r.mids.filter(m => m[4] > 0);
    c.ok(d.level === 'full' && d.reducedFlash === true, 'fx full with reduced flashing');
    c.ok(d.misses - d0.misses > 0 && missF.length > 0, 'misses light the hit line on ' + missF.length + ' frames');
    c.ok(missF.every(m => m[5] === true && m[4] <= 0.32 + 1e-6), 'a soft tint, never the flicker (max ' + Math.max(0, ...missF.map(m => m[4])).toFixed(3) + ')');
    const up = await page.evaluate(() => { const F = GG.gigfx, a = []; for (let ms = 0; ms < F.MISS_MS; ms += 5) a.push(F.missAlpha(ms, true)); return a.slice(1).filter((v, i) => v > a[i] + 1e-9).length; });
    c.ok(up === 0, 'the soft tint only fades');
    c.ok(d.particles.spawned > d0.particles.spawned, 'sparks still fly (only the flashes calm down)');
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'flash threw: ' + (e && e.stack || e)); }
  finally { await close(); }
  c.done();
}

/* ---- same -------------------------------------------------------------------------------------------------------- */
async function oneRun(page, o) {
  await page.evaluate(() => {
    const L = window.__log = { judge: [], songs: [] };
    if (!window.__logOn) { window.__logOn = true;
      GG.on('gig:judge', p => window.__log.judge.push([p.lane, p.judgement, p.combo, Math.round(p.crowd * 1000) / 1000, !!p.auto, !!p.chord]));
      GG.on('gig:song', p => { const r = p.result; window.__log.songs.push(r ? [p.index, r.score, r.perfect, r.good, r.miss, r.maxCombo, r.crowdEnd, r.crowdAvg, r.accuracy] : null); }); }
    return L;
  });
  await gig(page, Object.assign({ n: 3, bot: { accuracy: 0.85, jitterMs: 55, until: 8 } }, o));
  const geo = await page.evaluate(() => { const g = GG.debug('gigui'); return [g.hitY, g.laneW, g.look, g.gemW, g.hwW, g.hwH]; });
  await page.waitForFunction(() => GG.debug('gigui').result, null, { timeout: 120000, polling: 500 });
  return page.evaluate(geo => { const g = GG.debug('gigui'), d = GG.debug('gigfx'); return { judge: window.__log.judge, songs: window.__log.songs, result: g.result, geo, level: d.level, why: d.why }; }, geo);
}
async function secSame() {
  const c = checker('same ' + TAG);
  const { page, errors, close } = await boot();
  try {
    const full = await oneRun(page, { force: 'full' });
    const calm = await oneRun(page, { force: 'calm' });
    const pref = await oneRun(page, { force: null, prefs: { lessMotion: true } });
    const k = full.judge.reduce((a, j) => (a[j[1]] = (a[j[1]] || 0) + 1, a), {});
    console.log('INFO same ' + JSON.stringify({ levels: [full.level, calm.level, pref.level + '/' + pref.why], judged: full.judge.length, kinds: k, songs: full.songs, result: full.result, geo: full.geo }));
    c.ok(full.level === 'full' && calm.level === 'calm' && pref.level === 'calm' && pref.why === 'pref', 'three runs: full, calm, Less motion');
    c.ok(full.judge.length > 60 && k.perfect > 0 && k.good > 0 && k.miss > 0, 'a mixed live part: ' + JSON.stringify(k));
    const J = x => JSON.stringify(x);
    c.ok(J(full.judge) === J(calm.judge) && J(full.judge) === J(pref.judge), 'every judgement identical (lane, judgement, combo, crowd) x ' + full.judge.length);
    c.ok(full.songs.length === 3 && J(full.songs) === J(calm.songs) && J(full.songs) === J(pref.songs), 'every song result identical ' + J(full.songs.map(s => s && s[1])));
    c.ok(full.result && J(full.result) === J(calm.result) && J(full.result) === J(pref.result), 'the gig grade + score identical ' + J(full.result));
    c.ok(J(full.geo) === J(calm.geo) && J(full.geo) === J(pref.geo), 'the highway geometry identical ' + J(full.geo));
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'same threw: ' + (e && e.stack || e)); }
  finally { await close(); }
  c.done();
}

/* ---- perf -------------------------------------------------------------------------------------------------------- */
async function secPerf() {
  const c = checker('perf ' + TAG);
  const { page, errors, close } = await boot();
  try {
    await gig(page, { bot: { accuracy: 0.95, jitterMs: 30 }, bpm: 170 });
    const m = async force => {
      await page.evaluate(f => { GG.gigfx.force = f; GG.gigfx.costReset(); }, force);
      await sleep(7000);
      return page.evaluate(() => GG.debug('gigfx'));
    };
    const b0 = await page.evaluate(() => GG.debug('gigfx').builds);
    const full = await m('full'), calm = await m('calm');
    const cap = DESK ? 6 : 4;
    console.log('INFO perf ' + TAG + ' highway draw ms full ' + JSON.stringify(full.drawMs) + ' calm ' + JSON.stringify(calm.drawMs) + ' particles ' + JSON.stringify(full.particles));
    c.ok(full.drawMs.n > 10 && calm.drawMs.n > 10, 'frames measured ' + full.drawMs.n + ' / ' + calm.drawMs.n);
    c.ok(full.drawMs.p95 <= cap, 'full p95 ' + full.drawMs.p95 + ' ms <= ' + cap);
    c.ok(full.drawMs.p50 <= calm.drawMs.p50 + 1.5, 'full p50 ' + full.drawMs.p50 + ' <= calm p50 ' + calm.drawMs.p50 + ' + 1.5 ms');
    c.ok(full.particles.cap === 96 && full.particles.peak <= 96, 'the pool never grows (peak ' + full.particles.peak + ')');
    c.ok(calm.builds === b0, 'no sprite rebuilt (' + b0 + ' -> ' + calm.builds + ')');
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'perf threw: ' + (e && e.stack || e)); }
  finally { await close(); }
  c.done();
}

(async () => {
  if (want('fx')) await secFx();
  if (want('tiers')) await secTiers();
  if (want('calm')) await secCalm();
  if (want('os')) await secOs();
  if (want('flash')) await secFlash();
  if (want('same')) await secSame();
  if (want('perf')) await secPerf();
})();
