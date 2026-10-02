// pw_settings.js: settings, calibration, career difficulty, assists, practice (v0.6.1, SETTINGS agent; Addendum 1 C4).
// Sections (META_ONLY=settings|calib|difficulty, comma-separated; default all). Each must finish inside `timeout 500`.
//   settings  : title ⚙ → settings screen (every section, 48px targets, no hscroll at 390 and 440) → bigger text / reduced
//               flashing / faster animations set <html> classes → graphics low = 1x pixels + a smaller crowd → mixer
//               sliders drive GG.audio.setVolume, metronome mirror → screenshot tests/.cache/settings.png → quickStart:
//               ☰ → Settings shows the locked career difficulty → setlist sheet: Expert + speaker/headphones quick switch +
//               assists line → a show with lefty + colourblind + Auto-kick: mirrored lanes (left column = last lane),
//               kicks play themselves → skip van scenes. No console errors.
//   calib     : first launch (?calib=1) opens the calibration over the title, skippable, never again after → Settings →
//               Calibrate: eight clicks tapped 60 ms late → ~60 ms; the light check tapped ~90 ms late → saved on the
//               headphones profile only → screenshot tests/.cache/calib.png → with Drum sync off (classic) a practice run
//               judges a tap 60 ms late as on time (offset applied within the v0.5.1 clock); with Drum sync on (v0.8.3)
//               the same tap is ~60 ms late; the Bluetooth hint (offset + latency >= 120 ms). No console errors.
//   difficulty: new career → creator shows Chill / Normal / Brutal (screenshot tests/.cache/difficulty.png) → Brutal locks
//               (state, start fund, survives a reload) → laptop → Practice a song at 50% (half tempo, nothing saved, no
//               crowd) → the kit's sketch pad links to practice. No console errors.
// Run: node build.js && META_ONLY=settings timeout 500 node tests/pw_settings.js
const path = require('path');
const { open, checker } = require('./_pw');
const CACHE = path.join(__dirname, '.cache');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);

const tid = id => `[data-testid="${id}"]`;
const tap = (page, id) => page.locator(tid(id)).last().click();
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });
const pf = page => page.evaluate(() => GG.prefs.get());
const dbg = (page, k) => page.evaluate(k => GG.debug(k), k);

function audit(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const cs = getComputedStyle(e); return cs.visibility === 'hidden' || cs.display === 'none' ? null : r; };
    const name = e => (e.dataset.testid || e.className || e.tagName) + '';
    for (const e of document.querySelectorAll('#screens *')) { const r = vis(e); if (r && (r.right > W + 1 || r.left < -1)) bad.push('overflow ' + name(e)); }
    for (const sc of document.querySelectorAll('.full-body, .sheet-body')) if (sc.scrollWidth > sc.clientWidth + 1) bad.push('hscroll ' + sc.className);
    if (document.documentElement.scrollWidth > W + 1) bad.push('page hscroll');
    for (const b of document.querySelectorAll('#screens button, #screens input[type=range]')) { const r = vis(b); if (r && (r.width < 43.5 || r.height < 43.5)) bad.push('small ' + name(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
    return bad.slice(0, 8);
  });
}
// Taps the highway column `col` (0 = leftmost on screen) once the heard song time reaches `at`.
function tapCol(page, col, at) {
  return page.evaluate(async ([col, at]) => {
    const c = document.querySelector('[data-testid="gig-highway"]'), r = c.getBoundingClientRect(), lanes = GG.debug('gigui').lanes;
    while (GG.debug('gigui').songT < at - 0.012) await new Promise(res => setTimeout(res, 4));
    while (GG.debug('gigui').songT < at) { /* spin */ }
    window.__inTap = true;   // hits made during this dispatch are the tap's own (two-thumb auto notes play from frames)
    c.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + (col + 0.5) * r.width / lanes, clientY: r.bottom - 36, pointerId: 9, pointerType: 'touch', bubbles: true, cancelable: true }));
    window.__inTap = false;
    return GG.debug('gigui').last;
  }, [col, at]);
}

async function settings() {
  const c = checker('settings');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('title-settings'));
    c.ok(await page.evaluate(() => GG.debug('ui').screen) === 'title', 'no calibration popup under automation');
    // v1.0 (§0 Q8, Lane P): a fresh profile is on 'auto' graphics (nothing stored), its button pressed and >= 48 px
    const g0 = await page.evaluate(() => ({ pf: GG.prefs.get().graphics, stored: (GG.save.getJSON ? GG.save.getJSON(GG.save.KEYS.settings) : JSON.parse(localStorage.getItem(GG.save.KEYS.settings) || 'null')) || {}, r: GG.render.prefs() }));
    c.ok(g0.pf === 'auto' && g0.stored.graphics === undefined && g0.r.quality === 'auto' && g0.r.crowdScale === 1 && g0.r.auto === true, 'fresh profile: graphics auto, not stored, full crowd ' + JSON.stringify([g0.pf, g0.stored.graphics, g0.r]));
    await tap(page, 'title-settings'); await waitScreen(page, 'settings');
    const gb = await page.evaluate(() => { const b = document.querySelector('[data-testid="set-gfx-auto"]'), r = b && b.getBoundingClientRect(); return b && { on: b.getAttribute('aria-pressed'), w: r.width, h: r.height, n: document.querySelectorAll('[data-testid^="set-gfx-"]').length }; });
    c.ok(gb && gb.on === 'true' && gb.w >= 48 && gb.h >= 48 && gb.n === 4, 'Auto | Low | Medium | High, Auto pressed, >= 48 px ' + JSON.stringify(gb));
    for (const id of ['set-career-diff', 'set-gigdiff-expert', 'set-speed-140', 'set-noFail', 'set-autoKick', 'set-lefty', 'set-drumSync', 'set-profile-headphones', 'set-calibrate',
      'set-gfx-low', 'set-colourblind', 'set-bigText', 'set-reducedFlash', 'set-cameraShake', 'set-skipVan', 'set-fastAnim', 'set-save-load', 'set-save-restore'])
      c.ok(await page.locator(tid(id)).count() === 1, 'has ' + id);
    c.ok(/new career/i.test(await page.locator(tid('set-career-diff')).innerText()), 'career difficulty explained on the title');
    c.ok(await page.locator(tid('set-mix-drums')).count() === 1 && await page.locator(tid('set-metronome')).count() === 1, 'mixer sliders + metronome mirror (lane A API)');
    await tap(page, 'set-brushes');
    c.ok(await page.evaluate(() => GG.save.settings().brushes === false && GG.audio.applySettings().brushes === false), 'brushes toggle reaches the audio prefs');
    c.ok(await page.evaluate(() => { const was = GG.audio.getVolume('crowd'); GG.prefs.set({ mix: Object.assign(GG.audio.volumes(), { crowd: 0.35 }) });
      const v = GG.audio.getVolume('crowd'); GG.audio.setVolume('crowd', was); return Math.abs(v - 0.35) < 1e-9; }), "GG.prefs.set({mix}) re-reads GG.audio (settings:changed)");
    await tap(page, 'set-brushes');
    let a = await audit(page); c.ok(!a.length, 'settings layout 390 ' + a.join(', '));
    await tap(page, 'set-bigText'); await tap(page, 'set-reducedFlash'); await tap(page, 'set-fastAnim');
    let d = await page.evaluate(() => GG.debug('settings'));
    c.ok(d.classes.big && d.classes.calm && d.classes.fast, 'html classes gg-big / gg-calm / gg-fast');
    c.ok(d.render && d.render.calm === true, 'render prefs see reduced flashing');
    c.ok(await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.small') || document.body).fontSize)) >= 15, 'bigger text is bigger');
    await tap(page, 'set-gfx-low');
    d = await page.evaluate(() => GG.debug('settings'));
    c.ok(d.render.quality === 'low' && d.render.pixelRatio === 1 && d.render.crowdScale < 1, 'graphics low: 1x pixels, smaller crowd');
    await tap(page, 'set-cameraShake');
    c.ok((await pf(page)).cameraShake === false && (await page.evaluate(() => GG.render.prefs().shake)) === false, 'camera shake off');
    await tap(page, 'set-colourblind');
    c.ok(await page.locator(tid('set-cb-preview')).isVisible(), 'colourblind preview');
    await tap(page, 'set-gigdiff-expert'); await tap(page, 'set-speed-140'); await tap(page, 'set-noFail'); await tap(page, 'set-autoKick'); await tap(page, 'set-lefty');
    let p = await pf(page);
    c.ok(p.gigDifficulty === 'expert' && p.noteSpeed === 1.4 && p.noFail && p.autoKick && p.lefty && p.colourblind, 'play settings saved ' + JSON.stringify([p.gigDifficulty, p.noteSpeed]));
    // v0.8.3 Drum sync: on by default, the toggle flips it
    const ds0 = p.drumSync, dsOn = await page.locator(tid('set-drumSync')).innerText();
    await tap(page, 'set-drumSync'); const ds1 = (await pf(page)).drumSync;
    await tap(page, 'set-drumSync'); const ds2 = (await pf(page)).drumSync;
    c.ok(ds0 === true && /on/i.test(dsOn) && ds1 === false && ds2 === true, 'Drum sync defaults on and toggles ' + JSON.stringify([ds0, dsOn, ds1, ds2]));
    await page.locator(tid('set-mix-crowd')).fill('40');
    c.ok(Math.abs(await page.evaluate(() => GG.audio.getVolume('crowd')) - 0.4) < 0.01, 'crowd slider sets the crowd bus');
    const m0 = await page.evaluate(() => GG.audio.metronome()); await tap(page, 'set-metronome');
    c.ok(await page.evaluate(() => GG.audio.metronome()) === !m0, 'metronome toggle mirrors GG.audio');
    a = await audit(page); c.ok(!a.length, 'settings layout with bigger text ' + a.join(', '));
    await page.evaluate(() => { document.querySelector('[data-screen="settings"] .full-body').scrollTop = 0; });
    await page.waitForTimeout(200); await page.screenshot({ path: path.join(CACHE, 'settings.png') });
    await page.setViewportSize({ width: 440, height: 956 }); await page.waitForTimeout(200);
    a = await audit(page); c.ok(!a.length, 'settings layout 440x956 ' + a.join(', '));
    await page.setViewportSize({ width: 390, height: 844 });
    await tap(page, 'set-bigText'); await tap(page, 'set-fastAnim');
    await tap(page, 'set-done');
    // In a career: ☰ → Settings, locked difficulty
    await page.evaluate(() => { GG.main.quickStart({ seed: 5, slot: '1', openCard: false }); GG.ui.closeAll(); GG.ui.show('menu'); });
    await tap(page, 'menu-settings'); await waitScreen(page, 'settings');
    c.ok(/Normal 🔒/.test(await page.locator(tid('set-career-diff')).innerText()), 'career difficulty shown locked (Normal)');
    c.ok(await page.locator(tid('set-practice')).count() === 1, 'practice from settings');
    await tap(page, 'set-done');
    // The setlist sheet
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.gigAutoplay = false; GG.ui.playGig(GG.state.gig, () => {}); });
    await waitScreen(page, 'gig-set');
    c.ok(await page.locator(tid('gig-diff-expert')).getAttribute('class').then(x => /primary/.test(x)), 'Expert on the setlist sheet');
    const al = await page.locator(tid('btn-gig-settings')).innerText();
    c.ok(/No-fail · Auto-kick/i.test(al), 'assists line on the setlist: ' + al);
    await tap(page, 'gig-profile-headphones');
    c.ok((await pf(page)).audioProfile === 'headphones' && /primary/.test(await page.locator(tid('gig-profile-headphones')).getAttribute('class')), 'profile quick switch on the setlist');
    await tap(page, 'gig-profile-speaker');
    a = await audit(page); c.ok(!a.length, 'setlist sheet layout ' + a.join(', '));
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 8000 });
    c.ok(await page.evaluate(() => GG.debug('gigui').diff) === 'expert', 'the show runs on Expert');
    await page.evaluate(() => { window.__lanes = []; window.__tapLanes = []; const h = GG.audio.hit; GG.audio.hit = function (l) { window.__lanes.push(l); if (window.__inTap) window.__tapLanes.push(l); return h.apply(this, arguments); }; });
    const lanes = await page.evaluate(() => GG.debug('gigui').lanes);
    await tapCol(page, 0, (await page.evaluate(() => GG.debug('gigui').songT)) + 0.05);
    const tapped = await page.evaluate(() => window.__tapLanes);
    c.ok(tapped[0] === GG_LANE(lanes - 1), 'lefty: the leftmost column is the ' + GG_LANE(lanes - 1) + ' lane (' + tapped[0] + ')');
    await page.waitForTimeout(2500);
    const st = await page.evaluate(() => GG.debug('gigui').stats);
    c.ok(await page.evaluate(() => window.__lanes.filter(l => l === 'kick').length) > 0 && st.good > 0, 'auto-kick plays the kicks ' + JSON.stringify(st));
    const px = await page.evaluate(() => { const cv = document.querySelector('[data-testid="gig-highway"]'), x = cv.getContext('2d'), h = cv.height;
      return Array.from(x.getImageData(Math.floor(cv.width / 8), h - 30, 1, 1).data).slice(0, 3); });
    c.ok(px.join() !== '0,0,0', 'highway drawn (' + px + ')');
    await page.evaluate(() => { GG.ui.closeAll(); });
    // Skip van scenes
    await page.evaluate(() => GG.prefs.set({ skipVan: true }));
    await page.evaluate(() => { const s = GG.state; window.__van = null; GG.ui.playVan(s.gig, t => { window.__van = t; }); });
    await page.waitForFunction(() => GG.debug('van') && GG.debug('van').skipped, null, { timeout: 5000 }).catch(() => {});
    c.ok(await page.evaluate(() => !!(GG.debug('van') && GG.debug('van').skipped)), 'skip van scenes skips the drive');
    // v1.0 (Lane P): a graphics option picked by hand is stored and survives a reload ('high' stays 'high', not 'auto')
    await page.evaluate(() => { GG.ui.closeAll(); GG.prefs.set({ graphics: 'high' }); });
    await page.reload(); await page.waitForSelector(tid('title-settings'));
    const gh = await page.evaluate(() => ({ pf: GG.prefs.get().graphics, r: GG.render.prefs(), px: GG.debug('perf').quality }));
    c.ok(gh.pf === 'high' && gh.r.quality === 'high' && gh.r.pixelRatio === 2 && !gh.r.auto && gh.px === 'high', 'a stored High stays High after a reload ' + JSON.stringify(gh));
    await page.evaluate(() => GG.prefs.set({ graphics: 'auto' }));
    c.ok((await pf(page)).graphics === 'auto' && await page.evaluate(() => GG.render.prefs().quality === 'auto'), 'back to Auto');
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3));
  } finally { await close(); c.done(); }
}
const LANES = ['kick', 'snare', 'hat', 'cymbal', 'toms', 'ride'];
function GG_LANE(i) { return LANES[i]; }

async function calib() {
  const c = checker('calib');
  const { page, errors, close, url } = await open({ query: '?calib=1' });
  try {
    await page.waitForFunction(() => GG.debug('ui').screen === 'calib', null, { timeout: 8000 });
    c.ok(await page.locator(tid('calib-skip')).isVisible() && await page.locator(tid('calib-start')).isVisible(), 'first launch opens the calibration (skippable)');
    let a = await audit(page); c.ok(!a.length, 'calib layout ' + a.join(', '));
    await tap(page, 'calib-skip'); await waitScreen(page, 'title');
    c.ok((await pf(page)).calibSeen === true, 'skip remembered');
    await page.goto(url); await page.waitForSelector(tid('title-settings')); await page.waitForTimeout(400);
    c.ok(await page.evaluate(() => GG.debug('ui').screen) === 'title', 'never again after the first launch');
    await tap(page, 'title-settings'); await tap(page, 'set-calibrate'); await waitScreen(page, 'calib');
    await tap(page, 'calib-profile-headphones');
    await tap(page, 'calib-start');
    const got = await page.evaluate(async () => {
      const clicks = GG.debug('calib').clicks, pad = document.querySelector('[data-testid="calib-pad"]');
      for (const t of clicks) {
        while (performance.now() < t + 60 - 6) await new Promise(r => setTimeout(r, 3));
        while (performance.now() < t + 60) { /* spin */ }
        pad.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' }));
      }
      return { n: clicks.length, clock: GG.debug('calib').clock };
    });
    c.ok(got.n === 8, 'eight clicks (' + got.clock + ' clock)');
    await page.waitForFunction(() => GG.debug('calib').step === 'audioDone', null, { timeout: 5000 });
    const ra = await page.evaluate(() => GG.debug('calib').audio);
    c.ok(ra.ok && Math.abs(ra.offset - 60) <= 15, 'tap test measures ~60 ms late: ' + JSON.stringify(ra));
    c.ok(/60|5\d|6\d|7\d/.test(await page.locator(tid('calib-result')).innerText()), 'result shown');
    c.ok(await page.locator(tid('calib-bt')).count() === 0 && ra.lat >= 0 && ra.offset + ra.lat < 120, 'no Bluetooth hint for a ~60 ms tap lag ' + JSON.stringify(ra));
    await tap(page, 'calib-visual-start');
    await page.evaluate(async () => {
      const light = document.querySelector('[data-testid="calib-light"]');
      for (let k = 0; k < 8; k++) {
        while (!(GG.debug('calib').clicks[k] > 0)) await new Promise(r => setTimeout(r, 3));
        const t = GG.debug('calib').clicks[k];
        while (performance.now() < t + 90) await new Promise(r => setTimeout(r, 3));
        light.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' }));
      }
    });
    await page.waitForFunction(() => GG.debug('calib').step === 'visualDone', null, { timeout: 5000 });
    const rv = await page.evaluate(() => GG.debug('calib').visual);
    c.ok(rv.ok && Math.abs(rv.offset - 92) <= 25, 'light check measures ~90 ms: ' + JSON.stringify(rv));
    await page.waitForTimeout(150); await page.screenshot({ path: path.join(CACHE, 'calib.png') });
    await tap(page, 'calib-save');
    let p = await pf(page);
    c.ok(p.calib.headphones.audio === ra.offset && p.calib.headphones.visual === rv.offset && p.calib.speaker.audio === 0, 'saved on headphones only');
    c.ok(p.audioProfile === 'speaker', 'calibrating a profile does not switch to it');
    await tap(page, 'set-profile-headphones');
    c.ok(/late/.test(await page.locator(tid('set-calibrate')).locator('xpath=..').innerText()), 'settings show the profile calibration');
    await tap(page, 'set-done');
    // Offset applied to judgement (classic timing, Drum sync off): exact 60 ms calibration, a practice run, a tap 60 ms after a note = on time
    await page.evaluate(() => { GG.prefs.setCalib('headphones', { audio: 60, visual: 60, at: 1 }); GG.prefs.set({ gigDifficulty: 'hard', autoKick: false, drumSync: false }); GG.main.quickStart({ seed: 5, slot: '1', openCard: false }); GG.ui.closeAll(); GG.ui.gigAutoplay = false;
      GG.ui.practice(GG.state.songs[0].id, 1); });
    await page.waitForSelector(tid('btn-gig-next')); await tap(page, 'btn-gig-next');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play' && GG.debug('gigui').next, null, { timeout: 8000 });
    const offs = [];
    for (let i = 0; i < 4; i++) {
      const n = await page.evaluate(() => GG.debug('gigui').next);
      if (!n) break;
      const col = n.li;   // not lefty here
      const last = await tapCol(page, col, n.t + 0.06);
      if (last && last.offset != null) offs.push(last.offset);
    }
    const mean = offs.reduce((t, x) => t + x, 0) / Math.max(1, offs.length);
    c.ok(offs.length >= 3 && Math.abs(mean) < 0.03, 'classic: taps 60 ms late judge as on time with the 60 ms profile: ' + offs.map(x => Math.round(x * 1000)).join(' '));
    // v0.8.3 Drum sync (default): the audio offset is not subtracted, the same taps are ~60 ms late
    await page.evaluate(() => { GG.ui.closeAll(); GG.prefs.set({ drumSync: true }); GG.ui.practice(GG.state.songs[0].id, 1); });
    await page.waitForSelector(tid('btn-gig-next')); await tap(page, 'btn-gig-next');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play' && GG.debug('gigui').next, null, { timeout: 8000 });
    const offs2 = [];
    for (let i = 0; i < 4; i++) {
      const n = await page.evaluate(() => GG.debug('gigui').next);
      if (!n) break;
      const last = await tapCol(page, n.li, n.t + 0.06);
      if (last && last.at != null) offs2.push(last.at - n.t);
    }
    const mean2 = offs2.reduce((t, x) => t + x, 0) / Math.max(1, offs2.length);
    c.ok(offs2.length >= 3 && Math.abs(mean2 - 0.06) < 0.02 && (await dbg(page, 'gigui')).sync === true, 'drum sync: the same taps are judged ~60 ms late (audio offset unused): ' + offs2.map(x => Math.round(x * 1000)).join(' '));
    await page.evaluate(() => GG.ui.closeAll());
    // the Bluetooth hint: a raw click lag (offset + output latency) of 120 ms or more
    const bt = await page.evaluate(() => [[130, 0], [60, 30], [90, 40]].map(([o, l]) => {
      GG.ui.closeAll(); GG.ui.show('calib', { step: 'audioDone', profile: 'speaker', audio: { ok: true, offset: o, n: 8, spread: 5, lat: l } });
      return !!document.querySelector('[data-testid="calib-bt"]'); }));
    await page.evaluate(() => GG.ui.closeAll());
    c.ok(bt.join() === 'true,false,true', 'Bluetooth hint when offset + latency >= 120 ms ' + bt.join());
    // v0.8.3: the light check (what Drum sync uses) is reachable without passing the click test
    const lc = await page.evaluate(() => {
      GG.ui.closeAll(); GG.ui.show('calib', { profile: 'speaker' });
      const only = !!document.querySelector('[data-testid="calib-visual-only"]');
      GG.ui.closeAll(); GG.ui.show('calib', { step: 'audioDone', profile: 'speaker', audio: { ok: false, n: 2 } });
      const after = !!document.querySelector('[data-testid="calib-visual-start"]');
      return { only, after };
    });
    await tap(page, 'calib-visual-start');
    const vs = await page.evaluate(() => GG.debug('calib').step);
    await tap(page, 'calib-skip');
    c.ok(lc.only && lc.after && vs === 'visual', 'light check only from the intro, and after a failed click test ' + JSON.stringify(Object.assign(lc, { step: vs })));
    c.ok(await page.evaluate(() => GG.state.stats.gigs === 0 && !GG.state.liveGig), 'practice saves nothing');
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3));
  } finally { await close(); c.done(); }
}

async function difficulty() {
  const c = checker('difficulty');
  const { page, errors, close, url } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await tap(page, 'btn-new'); await tap(page, 'slot-1'); await tap(page, 'genre-metal'); await tap(page, 'btn-intro-next'); await tap(page, 'btn-logo-done');   // v0.8.1: the logo picker
    await waitScreen(page, 'creator');
    for (const d of ['chill', 'normal', 'brutal']) c.ok(await page.locator(tid('diff-' + d)).isVisible(), d + ' offered');
    c.ok(/primary/.test(await page.locator(tid('diff-normal')).getAttribute('class')), 'Normal by default');
    await tap(page, 'diff-brutal');
    c.ok(/does not miss/.test(await page.locator(tid('diff-blurb')).innerText()), 'Brutal blurb');
    await page.fill(tid('creator-name'), 'Tanner');
    let a = await audit(page); c.ok(!a.length, 'creator layout ' + a.join(', '));
    await page.locator(tid('diff-pick')).scrollIntoViewIfNeeded(); await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(CACHE, 'difficulty.png') });
    await tap(page, 'btn-create'); await tap(page, 'btn-coldopen-skip');
    await page.waitForFunction(() => GG.state && GG.state.phase, null, { timeout: 8000 });
    const s = await page.evaluate(() => ({ d: GG.state.careerDifficulty, fund: GG.state.fund, base: GG.content.economy.startFund }));
    c.ok(s.d === 'brutal' && s.fund < s.base, 'Brutal locked into the career, tighter start fund ' + JSON.stringify(s));
    await page.goto(url); await page.waitForSelector(tid('btn-continue')); await tap(page, 'btn-continue');
    await page.waitForFunction(() => GG.state && GG.state.careerDifficulty, null, { timeout: 8000 });
    c.ok(await page.evaluate(() => GG.state.careerDifficulty) === 'brutal', 'survives a reload');
    // Old saves load as Normal
    c.ok(await page.evaluate(() => { const o = JSON.parse(JSON.stringify(GG.state)); delete o.careerDifficulty; return GG.save.migrate(o).careerDifficulty; }) === 'normal', 'old saves = normal');
    // Practice from the laptop
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('laptop', { tab: 'band' }); });
    await waitScreen(page, 'laptop');
    await page.locator(tid('laptop-practice')).scrollIntoViewIfNeeded(); await tap(page, 'laptop-practice');
    await waitScreen(page, 'practice');
    await tap(page, 'practice-speed-50');
    a = await audit(page); c.ok(!a.length, 'practice sheet layout ' + a.join(', '));
    const sid = await page.evaluate(() => GG.songs.best(GG.state)[0].id);
    const before = await page.evaluate(() => JSON.stringify({ f: GG.state.fund, g: GG.state.stats.gigs, s: GG.state.songs.map(x => [x.plays, x.stale, x.pattern.bpm]) }));
    await tap(page, 'practice-song-' + sid);
    await waitScreen(page, 'gig');
    c.ok(/practice/i.test(await page.locator(tid('gig-between')).innerText()) && /count me in/i.test(await page.locator(tid('btn-gig-next')).innerText()), 'practice run labelled');
    await page.evaluate(() => { GG.ui.gigAutoplay = { accuracy: 0.8, jitterMs: 20 }; });
    await tap(page, 'btn-gig-next');   // the autoplay bot plays it; a studio-mode run closes itself and toasts the result
    await page.waitForFunction(() => !GG.debug('gigui').open, null, { timeout: 15000 });
    const bpm = await page.evaluate(sid => ({ songBpm: GG.songs.byId(GG.state, sid).pattern.bpm }), sid);
    c.ok(/Practice at 50%/.test(await page.evaluate(() => document.body.innerText)), 'practice result toast');
    const after = await page.evaluate(() => JSON.stringify({ f: GG.state.fund, g: GG.state.stats.gigs, s: GG.state.songs.map(x => [x.plays, x.stale, x.pattern.bpm]) }));
    c.ok(before === after, 'practice changes nothing in the career (tempo ' + bpm.songBpm + ' untouched)');
    const half = await page.evaluate(sid => { const s = GG.songs.byId(GG.state, sid); let seen = null; const orig = GG.gig.chart;
      GG.gig.chart = function (song, o) { seen = song.pattern.bpm; return orig.apply(this, arguments); };
      GG.ui.gigAutoplay = true; GG.ui.practice(sid, 0.5); GG.gig.chart = orig; return { seen: seen, full: s.pattern.bpm }; }, sid);
    await page.waitForTimeout(300);
    await page.evaluate(() => GG.ui.closeAll());
    c.ok(half.seen === null || Math.abs(half.seen - Math.round(half.full * 0.5)) <= 1, 'practice at 50% plays at half tempo ' + JSON.stringify(half));
    const cc = await page.evaluate(() => { let bpm = null; const orig = GG.gig.session; GG.gig.session = function (st, g, ids, o) { const S = orig.apply(this, arguments); const s0 = GG.songs.byId(st, ids[0]); bpm = s0.pattern.bpm; return S; };
      GG.ui.gigAutoplay = false; GG.ui.practice(GG.songs.best(GG.state)[0].id, 0.5); GG.gig.session = orig; return { bpm, full: GG.songs.best(GG.state)[0].pattern.bpm }; });
    c.ok(cc.bpm === Math.max(30, Math.round(cc.full * 0.5)), 'the practice session gets the slowed song ' + JSON.stringify(cc));
    await page.evaluate(() => GG.ui.closeAll());
    // The kit (sketch pad) links to practice
    await page.evaluate(() => GG.emit('hotspot', { action: 'kit' }));
    await waitScreen(page, 'seq');
    c.ok(await page.locator(tid('kit-practice')).count() === 1, 'the drum kit offers practice');
    await tap(page, 'kit-practice'); await waitScreen(page, 'practice');
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3));
  } finally { await close(); c.done(); }
}

(async () => {
  if (want('settings')) await settings();
  if (want('calib')) await calib();
  if (want('difficulty')) await difficulty();
})().catch(e => { console.error(e); process.exitCode = 1; });
