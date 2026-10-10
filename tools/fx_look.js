// tools/fx_look.js (v1.6 "Showtime"): the owner's stills + clips of the animated gig highway, played by the live bot
// (GG.ui.gigLiveBot) with the fx pinned full (GG.gigfx.force). A still freezes the page's performance.now() a few ms into
// the moment it wants (a Good, a Perfect, a miss, x10 / x25 / x50, a hold), so the effect is caught mid-flight; the song
// carries on after each shot. Clips: Playwright recordVideo of a live-bot gig from the count-in to x50, then ffmpeg
// (H.264, yuv420p, faststart: plays on an iPhone). The 3D stage is held on its last frame while the highway plays (headless
// software GL draws it at ~5 fps; STAGE=1 keeps it running).
//   node build.js && OUT=<dir> timeout 600 node tools/fx_look.js [stills|clips|all]   (default all; sizes: 440x956 phone,
//   1440x900 PC; OUT default tests/.cache/fx_look). FFMPEG=/usr/local/bin/ffmpeg.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { open, ROOT } = require('../tests/_pw');
const OUT = process.env.OUT ? path.resolve(process.env.OUT) : path.join(ROOT, 'tests', '.cache', 'fx_look');
const FFMPEG = process.env.FFMPEG || '/usr/local/bin/ffmpeg';
const what = process.argv[2] || 'all';
const SIZES = [['phone', { width: 440, height: 956 }, false], ['pc', { width: 1440, height: 900 }, true]];
const sleep = ms => new Promise(r => setTimeout(r, ms));

// in the page, before any script: a freezable performance.now()
const FREEZE = () => {
  const real = performance.now.bind(performance); let at = null;
  performance.now = () => at != null ? at : real();
  window.__thawAt = -1e9;
  window.__freeze = ms => { at = real() + (ms || 0); }; window.__thaw = () => { at = null; window.__thawAt = real(); };
  window.__real = real;
};
async function gig(page, o, before) {
  await page.evaluate(o => {
    const E = '................';
    GG.ui.closeAll();
    GG.prefs.set(Object.assign({ gigDifficulty: 'hard', calibSeen: true, noFail: true, autoKick: false, graphics: 'high', lessMotion: false }, o.prefs || {}));
    GG.main.quickStart({ seed: o.seed || 1616, bandId: 'hail_damage', seat: o.seat || 'drums', openCard: false });
    const s = GG.state; GG.ui.closeAll(); s.card = null; s.phase = 'plan'; s.liveGig = null; GG.ui.gigAutoplay = false;
    if ((o.seat || 'drums') === 'drums') {
      s.gear = Object.assign({}, s.gear, { lanes: 6 });
      const bars = ['x...x.....x.x...', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x...............', '..............x.', '......x.......x.'];
      const arr = ['verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus'];
      s.songs = ['Lawn Fire', 'Hedge Fund'].map(t => GG.songs.create(s, { bpm: o.bpm || 160, lanes: 6, arrangement: arr, sections: { verse: bars, chorus: bars, bridge: bars.map(() => E) } }, t, { quality: 60, polish: 60 }));
    } else {
      for (let i = 0; i < 2; i++) GG.songs.jam(s, GG.RNG(70 + i));
      s.songs.forEach(x => { x.pattern.bpm = 90; });
    }
    GG.main.sync();
    GG.gigfx.force = o.force === undefined ? 'full' : o.force;
    GG.ui.gigLiveBot = Object.assign({ accuracy: 0.97, jitterMs: 35 }, o.bot || {});
    s.gig = GG.gig.makeGig(s, 'legion_63', 'book');
    GG.ui.playGig(s.gig, () => {});
  }, o);
  await page.waitForFunction(() => GG.debug('ui').screen === 'gig-set', null, { timeout: 20000 });
  // headless Chromium draws the 3D stage in software (~5 fps): hold the stage on its last frame so the highway runs at
  // its own rate (a phone's GPU does both)
  if (!process.env.STAGE) await page.evaluate(() => GG.render.setPaused(true));
  if (before) await before();
  await page.evaluate(() => document.querySelector('[data-testid="btn-gig-start"]').click());
  await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 20000 });
}
// wait for a moment (an in-page predicate armed on 'gig:judge'), freeze `ms` into it; when the frame drawn at the frozen
// moment passes `verify` (the pop shows that judgement, no stray miss line...) shoot, else thaw and try the next one
async function moment(page, file, arm, ms, verify) {
  for (let tries = 0; tries < 12; tries++) {
    await arm1(page, arm, ms);
    await sleep(450);
    const ok = !verify || await page.evaluate(v => new Function('return (' + v + ')')(), verify);
    if (ok) break;
    await page.evaluate(() => window.__thaw());
  }
  await page.screenshot({ path: file });
  await page.evaluate(() => window.__thaw());
  console.log('still ' + path.basename(file));
}
async function arm1(page, arm, ms) {
  await page.evaluate(([arm, ms]) => {
    window.__hit = false;
    const test = new Function('p', 'd', 'return (' + arm + ')');
    // (a moment counts from 600 ms after the last shot: the song catches up on the clock it lost while frozen)
    const on = p => { if (!window.__hit && window.__real() - window.__thawAt > 600 && test(p, GG.debug('gigui'))) { window.__hit = true; window.__freeze(ms); GG.off('gig:judge', on); } };
    GG.on('gig:judge', on);
  }, [arm, ms]);
  await page.waitForFunction(() => window.__hit, null, { timeout: 60000, polling: 50 });
}
const CLEAN = "GG.gigfx.state.p - GG.gigfx.state.missAt > 400";
async function stills(tag, view, desk) {
  const { page, close } = await open({ desktop: desk, viewport: view, noGoto: true });
  try {
    await page.addInitScript(FREEZE);
    await page.goto('file://' + path.join(ROOT, 'dist', 'game.html'));
    await page.waitForSelector('[data-testid="btn-new"]', { timeout: 30000 });
    const f = n => path.join(OUT, n + '_' + tag + '.png');
    await gig(page, { bot: { accuracy: 0.9, jitterMs: 70 } });
    await moment(page, f('01_hit_good'), "p.judgement === 'good'", 70, "GG.debug('gigui').pop === 'good' && " + CLEAN);
    await moment(page, f('02_hit_perfect'), "p.judgement === 'perfect'", 60, "GG.debug('gigui').pop === 'perfect' && " + CLEAN);
    await moment(page, f('03_miss'), "p.judgement === 'miss'", 95, "GG.debug('gigui').pop === 'miss'");
    // one fresh gig per tier (a shot's catch-up would skip a tier)
    await gig(page, { bot: { accuracy: 1, jitterMs: 25 } });
    await moment(page, f('04_combo_x10'), "p.combo >= 11 && p.judgement === 'perfect'", 80, "GG.debug('gigui').combo < 25");
    await gig(page, { bot: { accuracy: 1, jitterMs: 25 } });
    await moment(page, f('05_combo_x25'), "p.combo >= 27 && p.judgement === 'perfect'", 80, "GG.debug('gigui').combo < 50");
    await gig(page, { bot: { accuracy: 1, jitterMs: 25 } });
    await moment(page, f('06_combo_x50'), "p.combo >= 54 && p.judgement === 'perfect'", 80);
    await gig(page, { seat: 'bass', bot: { accuracy: 1, jitterMs: 20 } });
    await moment(page, f('07_hold_shimmer'), "(() => { const g = GG.debug('gigui'); return g.holding && g.holding.length > 0; })()", 60);
    await gig(page, { force: null, prefs: { lessMotion: true }, bot: { accuracy: 1, jitterMs: 25 } });
    await moment(page, f('08_less_motion_x25'), "p.combo >= 27 && p.judgement === 'perfect'", 60);
  } finally { await close(); }
}
// Clips: rendered frame by frame on a virtual clock (performance.now() and the rAF timestamp step 1/30 s per frame from the
// downbeat; the game clock free-runs on it, as it does whenever the audio clock is not trusted), one screenshot per step,
// so the clip plays at the song's real speed with the 3D stage animating (live capture in headless software GL ran at
// 3-6 fps and recordVideo dropped time). H.264 yuv420p faststart for an iPhone.
const VCLOCK = () => {
  const real = performance.now.bind(performance), raf0 = window.requestAnimationFrame.bind(window); let v = null;
  performance.now = () => v != null ? v : real();
  window.requestAnimationFrame = cb => raf0(ts => cb(v != null ? v : ts));
  window.__vstart = () => { v = real(); }; window.__vstep = ms => { v += ms; };
  window.__ticks = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : raf0(f)); raf0(f); });
};
async function clip(tag, view, desk) {
  const dir = path.join(OUT, 'raw_' + tag);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const { page, close } = await open({ desktop: desk, viewport: view, noGoto: true });
  let n = 0;
  try {
    await page.addInitScript(VCLOCK);
    await page.goto('file://' + path.join(ROOT, 'dist', 'game.html'));
    await page.waitForSelector('[data-testid="btn-new"]', { timeout: 30000 });
    process.env.STAGE = '1';
    await gig(page, { bot: { accuracy: 1, jitterMs: 25 }, bpm: 170 });
    delete process.env.STAGE;
    await page.evaluate(() => { window.__vstart(); return window.__ticks(3); });
    let after = -1;
    while (n < 300) {
      await page.evaluate(() => { window.__vstep(1000 / 30); return window.__ticks(2); });
      await page.screenshot({ path: path.join(dir, 'f' + String(n).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 92 });
      n++;
      const c = await page.evaluate(() => GG.debug('gigui').combo);
      if (after < 0 && c >= 55) after = n;
      if (after >= 0 && n - after >= 70) break;
    }
  } finally { await close(); }
  const out = path.join(OUT, '09_clip_to_x50_' + tag + '.mp4');
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(dir, 'f%04d.jpg'), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-crf', '21', out]);
  console.log('clip ' + path.basename(out) + ' (' + (n / 30).toFixed(1) + ' s, ' + n + ' frames)');
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [tag, view, desk] of SIZES) {
    if (what === 'all' || what === 'stills') await stills(tag, view, desk);
    if (what === 'all' || what === 'clips') await clip(tag, view, desk);
  }
})().catch(e => { console.log('FAIL', e.stack || e); process.exitCode = 1; });
