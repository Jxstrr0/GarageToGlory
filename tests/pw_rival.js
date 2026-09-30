// pw_rival.js: v0.6 "Rivals" UI on a 390x844 phone viewport. Sections META_ONLY=scene|botb|final (default all); each inside
// `timeout 500`. Screenshots tests/.cache/v06_<name>.png; the last section run tiles them into tests/.cache/v06_sheet.png.
//   scene : a bot career (2 years) → laptop Scene tab (rival card, record, heat, Sad Dome countdown, leaderboard with you and
//           the rival, news, lineup, records) → a stolen slot + a festival clash on the gig board (badges, "Taken" button)
//           → a same-night announcement (the split bar). Layout audits. No console errors.
//   botb  : a forced Battle of the Bands → the Monday announcement (Enter) → plan → results → van → the rival's set (3D stage
//           from the crowd, their lineup in corpse paint, ticking score on wall time (a 1 s frame counts in full), to the
//           end) → your set (score to beat) → results →
//           the crowd verdict → the wrap's rival panel. The showdown is stored and the fans/prize swing applied.
//   final : a full bot career to year 10 week 21 → Sad Dome eve card (rival strip) → the Sad Dome announcement → the van to
//           Calgary → their 4-song set (skipped) → your set (autoplay) → "You headline/open. Forever." → finalShowdown stored
//           → the end screen shows the Sad Dome result.
// Run: node build.js && META_ONLY=scene timeout 500 node tests/pw_rival.js
const fs = require('fs'), path = require('path');
const { open, checker } = require('./_pw');
const CACHE = path.join(__dirname, '.cache');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);

const tid = id => `[data-testid="${id}"]`;
const tap = (page, id) => page.locator(tid(id)).last().click();
const screen = page => page.evaluate(() => GG.debug('ui').screen);
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });
// Waits for the finite CSS animations (sheet slide-ups, fades) to finish first: swiftshader frames make them lag.
const shot = async (page, name) => {
  await page.waitForTimeout(250);
  await page.evaluate(() => Promise.race([new Promise(r => setTimeout(r, 2500)),
    Promise.all(document.getAnimations().filter(a => a.effect && a.effect.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => 0)))]));
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(CACHE, 'v06_' + name + '.png') });
};
function audit(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const cs = getComputedStyle(e); return cs.visibility === 'hidden' || cs.display === 'none' ? null : r; };
    const name = e => (e.dataset.testid || e.className || e.tagName) + '';
    for (const e of document.querySelectorAll('#screens .layer:not([inert]) *')) { const r = vis(e); if (r && (r.right > W + 1 || r.left < -1)) bad.push('overflow ' + name(e)); }
    for (const sc of document.querySelectorAll('.sheet-body, .full-body')) if (sc.scrollWidth > sc.clientWidth + 1) bad.push('hscroll ' + sc.className);
    for (const b of document.querySelectorAll('#screens .layer:not([inert]) button')) { const r = vis(b); if (r && (r.width < 43.5 || r.height < 43.5)) bad.push('small ' + name(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
    return bad.slice(0, 8);
  });
}
async function setup(page, seed, weeks, style) {
  await page.waitForFunction(() => window.GG && GG.main && GG.ui && GG.ui.scenePanel && GG.rival, null, { timeout: 15000 });
  await page.evaluate(([s, n, st]) => {
    GG.ui.showdownViews = true; GG.ui.gigAutoplay = false;
    GG.main.quickStart({ seed: s, openCard: false }); GG.ui.closeAll();
    const S = GG.state; S.card = null; S.phase = 'plan';
    GG.career.setPlan(S, ['rest', 'rest', 'rest']); GG.career.runWeek(S, { autoGig: true }); GG.career.endWeek(S);
    while (S.totalWeek < n && S.phase !== 'ended') GG.career.botWeek(S, st);
    GG.main.sync();
  }, [seed, weeks, style || 'avg']);
}
// The Monday card (if any) → the planner phase, through the UI.
async function toPlan(page) {
  await page.evaluate(() => { GG.ui.closeAll(); GG.main.route(); });
  await page.waitForFunction(() => GG.state.phase === 'plan' || GG.debug('ui').screen === 'card', null, { timeout: 8000 });
  if (await screen(page) === 'card') { await tap(page, 'choice-0'); await tap(page, 'btn-card-ok'); }
  await page.waitForFunction(() => GG.state.phase === 'plan', null, { timeout: 8000 });
}
// Plan three rest blocks → Go → results → Load the van → drive (skip) → returns once `until` is the top screen.
async function weekend(page, until) {
  await page.evaluate(() => GG.ui.closeAll());
  await tap(page, 'btn-primary'); await waitScreen(page, 'plan');
  for (let i = 2; i >= 0; i--) if (await page.locator(tid('plan-slot-' + i) + '.filled').count()) await tap(page, 'plan-slot-' + i);
  for (const a of ['rest', 'rest', 'rest']) await tap(page, 'act-' + a);
  await tap(page, 'btn-go');
  await waitScreen(page, 'results');
  if (await page.locator(tid('btn-results-skip')).last().isVisible()) await tap(page, 'btn-results-skip');
  await tap(page, 'btn-results-ok');
  // true once the click landed (slow frames can outlast the 2 s actionability wait: try again next pass).
  const quick = id => page.locator(tid(id)).last().click({ timeout: 2000 }).then(() => true, () => false);
  let skipped = false;
  for (let k = 0; k < 80 && await screen(page) !== until; k++) {
    const sc = await screen(page);
    if (sc === 'van' && !skipped) { await page.waitForTimeout(400); skipped = await quick('btn-van-skip'); }
    if (sc === 'road') { await quick('road-choice-0'); await quick('btn-road-ok'); }
    await page.waitForTimeout(200);
  }
  await waitScreen(page, until, 8000);
}

/* ---- scene ------------------------------------------------------------------------------------------------ */
async function scene() {
  const c = checker('scene');
  const { page, errors, close } = await open();
  try {
    await setup(page, 6060, 48, 'avg');
    await page.evaluate(() => { GG.ui.closeAll(); GG.emit('hotspot', { action: 'laptop' }); });
    await waitScreen(page, 'laptop');
    await tap(page, 'laptop-tab-scene');
    await page.waitForSelector(tid('scene-panel'));
    const v = await page.evaluate(() => {
      const q = id => document.querySelector('[data-testid="' + id + '"]'), R = GG.rival, st = GG.state;
      return { name: q('scene-rival').textContent, rec: q('scene-record').textContent, r: R.record(st), heat: q('scene-heat').textContent,
        next: q('scene-next').textContent, you: !!q('scene-row-you'), rival: !!q('scene-row-' + st.rival.id), rows: document.querySelectorAll('[data-testid^="scene-row-"]').length,
        news: q('scene-news').querySelectorAll('.rv-news-row').length, newsN: st.rival.news.length, lineup: q('scene-lineup').querySelectorAll('.rv-mem').length,
        albums: q('scene-albums').querySelectorAll('.rv-alb').length, albumsN: st.rival.albums.length, tabs: document.querySelectorAll('[data-testid^="laptop-tab-"]').length };
    });
    c.ok(/Tundra Wraith|Wraith/.test(v.name) && v.rec.includes(String(v.r.you)) && v.rec.includes(String(v.r.them)), 'rival card + head-to-head record: ' + v.rec);
    c.ok(/Rivalry heat/.test(v.heat) && /Sad Dome/.test(v.next) && /odds/.test(v.next), 'heat meter, Sad Dome countdown, showdown odds');
    c.ok(v.you && v.rival && v.rows >= 10, 'leaderboard: you, the rival and the scene (' + v.rows + ' rows)');
    c.ok(v.newsN > 0 && v.news === Math.min(8, v.newsN) && v.lineup >= 4 && v.albums === v.albumsN && v.albumsN >= 1, 'news ' + v.news + ', lineup ' + v.lineup + ', records ' + v.albums);
    c.ok(v.tabs === 8, 'eight laptop tabs (v0.6.1: + Bandbook, v0.7: + World)');
    const a1 = await audit(page); c.ok(!a1.length, 'scene tab layout: ' + a1.join(', '));
    await shot(page, 'scene');
    await page.evaluate(() => { const b = document.querySelector('[data-testid="scene-board"]'); b.scrollIntoView({ block: 'start' }); });
    await shot(page, 'scene_board');
    // the board: a stolen slot and a festival clash
    await page.evaluate(() => {
      GG.ui.closeAll(); const st = GG.state;
      if (st.phase !== 'plan') { GG.career.startWeek(st); if (st.card && !st.card.resolved) GG.career.resolveCard(st, 0); }
      st.fans = Math.max(st.fans, 400); st.gig = null; st.offer = null;
      (st.listings || []).forEach(l => { delete l.stolen; }); st.venueRep = {};
      GG.rival.schedule(st, 'festival'); GG.rival.schedule(st, 'stolenSlot'); GG.main.sync();
      GG.ui.openBoard({ mode: 'book' });
    });
    await waitScreen(page, 'board');
    const b = await page.evaluate(() => {
      const st = GG.state, sl = st.listings.filter(l => l.stolen)[0], fe = st.listings.filter(l => l.showdown && l.showdown.kind === 'festival')[0];
      const bk = sl && document.querySelector('[data-testid="book-' + sl.id + '"]');
      return { stolen: !!document.querySelector('[data-testid="board-stolen"]') || !!document.querySelector('[data-testid="board-defended"]'), defended: sl && sl.stolen.defended,
        fest: !!document.querySelector('[data-testid="board-festival"]'), btn: bk ? bk.textContent + '|' + bk.disabled : null, fe: !!fe,
        chip: sl ? [...document.querySelectorAll('[data-testid="board-listing"]')].filter(x => x.dataset.id === sl.id).map(x => x.textContent)[0] : '' };
    });
    c.ok(b.stolen && b.fest && b.fe, 'board badges: stolen slot + festival clash ' + JSON.stringify({ s: b.stolen, f: b.fest }));
    c.ok(b.defended || (/Taken by/.test(b.btn) && /true$/.test(b.btn) && /Taken ✗/.test(b.chip) && !/Needs \d+ fans ✓/.test(b.chip)), 'a stolen listing is unbookable and says so: ' + b.btn);
    const a2 = await audit(page); c.ok(!a2.length, 'board layout: ' + a2.join(', '));
    await page.evaluate(() => { const e = document.querySelector('[data-testid="board-festival"]'); if (e) e.scrollIntoView({ block: 'center' }); });
    await shot(page, 'board');
    // a same-night announcement with the split preview
    await page.evaluate(() => { GG.ui.closeAll(); const st = GG.state; st.rival.pending = null; GG.rival.schedule(st, 'sameNight'); GG.ui.announceShowdown(st, true); });
    await waitScreen(page, 'showdown');
    const sn = await page.evaluate(() => ({ t: document.querySelector('[data-testid="sd-card"]').textContent, bar: !!document.querySelector('.rv-split-bar .you') }));
    c.ok(/playing|same|split|crowd/i.test(sn.t) && sn.bar, 'same-night notice with the crowd split: ' + sn.t.slice(0, 60));
    const a3 = await audit(page); c.ok(!a3.length, 'same-night card layout: ' + a3.join(', '));
    await tap(page, 'btn-sd-ok');
    c.ok(!errors.length, 'no console errors: ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close(); c.done();
}

/* ---- botb ------------------------------------------------------------------------------------------------ */
async function botb() {
  const c = checker('botb');
  const { page, errors, close } = await open();
  try {
    await setup(page, 7171, 30, 'avg');
    await toPlan(page);
    await page.evaluate(() => {
      GG.ui.closeAll(); const st = GG.state; st.gig = null; st.offer = null; st.rival.pending = null; st.fans = Math.max(st.fans, 200);
      GG.rival.schedule(st, 'botb'); GG.main.sync(); GG.ui.rivalSongMs = 1500; GG.ui.announceShowdown(st, true);
    });
    await waitScreen(page, 'showdown');
    const card = await page.evaluate(() => ({ t: document.querySelector('[data-testid="sd-card"]').textContent, enter: !!document.querySelector('[data-testid="btn-sd-enter"]'), pass: !!document.querySelector('[data-testid="btn-sd-pass"]') }));
    c.ok(/Battle of the Bands/.test(card.t) && card.enter && card.pass, 'BotB announcement with Enter / Pass');
    const a1 = await audit(page); c.ok(!a1.length, 'announcement layout: ' + a1.join(', '));
    await shot(page, 'sd_card');
    await tap(page, 'btn-sd-enter');
    const entered = await page.evaluate(() => ({ gig: GG.state.gig && GG.state.gig.showdown && GG.state.gig.showdown.kind, p: GG.rival.pending(GG.state).status, fans: GG.state.fans, rv: GG.state.rival.fans, fund: GG.state.fund }));
    c.ok(entered.gig === 'botb' && entered.p === 'entered', 'entered: the BotB gig is booked ' + JSON.stringify(entered));
    await weekend(page, 'rival-set');
    await page.waitForFunction(() => { const e = document.querySelector('[data-testid="rs-score"]'); return e && +e.textContent > 0; }, null, { timeout: 8000 });
    const w = await page.evaluate(() => ({ info: GG.render.stage.info(), r: GG.debug('render'), ui: GG.debug('rivalui'), score: +document.querySelector('[data-testid="rs-score"]').textContent }));
    c.ok(w.r.scene === 'stage' && !w.r.paused && w.info.view === 'spectator' && w.info.rival, 'spectator view: the 3D stage from the crowd ' + JSON.stringify({ scene: w.r.scene, paused: w.r.paused, view: w.info.view }));
    c.ok(w.info.painted >= 4 && w.info.band.some(b => /^tw_gord/.test(b)) && !w.info.band.some(b => /^tw_lorne/.test(b)), 'their lineup in corpse paint (drummer on the throne): ' + w.info.band.join(','));
    c.ok(w.score > 0 && w.r.drawCalls < 90, 'ticking score ' + w.score + ', ' + w.r.drawCalls + ' draw calls');
    // A slow phone's long frame (a 1 s main-thread stall) counts in full: their set runs on wall time, not frames (a 0.1 s
    // cap per frame made the set 4-6x longer under load, and the btn-rs-go wait below timed out).
    const clk = await page.evaluate(async () => {
      const c0 = GG.debug('rivalui').clock, t0 = performance.now();
      while (performance.now() - t0 < 1000) { /* one long frame */ }
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const d = GG.debug('rivalui');
      return { adv: +(d.clock - c0).toFixed(2), ended: d.ended };
    });
    c.ok(clk.adv >= 0.95 || clk.ended, 'a 1 s frame advances their set by ~1 s (wall time): ' + JSON.stringify(clk));
    await page.waitForTimeout(700);
    const a2 = await audit(page); c.ok(!a2.length, 'spectator layout: ' + a2.join(', '));
    await shot(page, 'rival_set');
    await page.waitForSelector(tid('btn-rs-go'), { timeout: 12000 });
    const fin = await page.evaluate(() => ({ shown: +document.querySelector('[data-testid="rs-score"]').textContent, set: GG.rival.showdown(GG.state, 'botb').score }));
    c.ok(fin.shown === fin.set, 'their set plays out to the set score ' + JSON.stringify(fin));
    await tap(page, 'btn-rs-go');
    await waitScreen(page, 'gig-set');
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 8000 });
    await page.waitForTimeout(1500);
    const tg = await page.evaluate(() => ({ t: (document.querySelector('[data-testid="gig-target"]') || {}).textContent || '', info: GG.render.stage.info() }));
    c.ok(/Beat \d+/.test(tg.t) && tg.info.view === 'drummer' && !tg.info.rival, 'your set: back behind your kit, score to beat in the bar: ' + tg.t);
    await shot(page, 'your_set');
    await page.evaluate(() => { GG.ui.gigAutoplay = { accuracy: 0.97, jitterMs: 8 }; });
    await waitScreen(page, 'gig-results', 30000);
    await page.evaluate(() => { GG.ui.gigAutoplay = false; });
    await tap(page, 'btn-gig-done');
    await waitScreen(page, 'rival-verdict');
    const vd = await page.evaluate(() => ({ head: document.querySelector('[data-testid="rv-verdict-head"]').textContent, sd: GG.state.lastGig.showdown, n: GG.state.showdowns.filter(x => x.kind === 'botb' && x.week === GG.state.totalWeek).length }));
    c.ok(vd.sd && vd.sd.kind === 'botb' && vd.n === 1 && (vd.sd.won ? /win/i.test(vd.head) : /win/i.test(vd.head)), 'verdict screen: ' + vd.head + ' (' + (vd.sd && vd.sd.you) + ' vs ' + (vd.sd && vd.sd.them) + ')');
    c.ok(vd.sd.won ? vd.sd.prize > 0 && vd.sd.fansSwing > 0 : vd.sd.fansSwing < 0, 'prize / fan swing: ' + JSON.stringify({ prize: vd.sd.prize, fans: vd.sd.fansSwing }));
    const a3 = await audit(page); c.ok(!a3.length, 'verdict layout: ' + a3.join(', '));
    await shot(page, 'verdict');
    await tap(page, 'btn-verdict-done');
    await waitScreen(page, 'wrap');
    const wr = await page.evaluate(() => ({ panel: !!document.querySelector('[data-testid="wrap-rival"]'), w: GG.state.wrap && GG.state.wrap.rival && GG.state.wrap.rival.showdowns.length, scene: GG.debug('render').scene }));
    c.ok(wr.panel && wr.w === 1 && wr.scene === 'garage', 'wrap: the rival panel lists the showdown, back in the garage');
    c.ok(!errors.length, 'no console errors: ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close(); c.done();
}

/* ---- final ----------------------------------------------------------------------------------------------- */
async function final() {
  const c = checker('final');
  const { page, errors, close } = await open();
  try {
    await setup(page, 8282, 9 * 24 + 21, 'good');
    const pre = await page.evaluate(() => ({ tw: GG.state.totalWeek, phase: GG.state.phase, fin: GG.state.finalShowdown }));
    c.ok(pre.tw === 237 && pre.phase === 'monday' && !pre.fin, 'a bot career reaches year 10 week 21 ' + JSON.stringify(pre));
    await page.evaluate(() => { GG.ui.closeAll(); GG.main.route(); });
    await waitScreen(page, 'card');
    const eve = await page.evaluate(() => ({ id: GG.state.card && GG.state.card.id, strip: !!document.querySelector('[data-testid="card-rival"]'), who: document.querySelector('.card-head .who').textContent }));
    c.ok(eve.id === 'rv_final_eve' && eve.strip && /Gord/.test(eve.who), 'Sad Dome eve card, Gord speaking, rival strip ' + JSON.stringify(eve));
    await tap(page, 'choice-0'); await tap(page, 'btn-card-ok');
    await waitScreen(page, 'showdown');
    const an = await page.evaluate(() => document.querySelector('[data-testid="sd-card"]').textContent);
    c.ok(/Sad Dome/.test(an), 'the Sad Dome announcement');
    await tap(page, 'btn-sd-ok');
    await page.evaluate(() => { GG.ui.rivalSongMs = 900; });
    const vanSeen = page.waitForFunction(() => { const e = document.querySelector('[data-testid="van-route"]'); return e && e.textContent; }, null, { timeout: 20000 }).then(h => h.jsonValue()).catch(() => '');
    await weekend(page, 'rival-set');
    const route = await vanSeen;
    c.ok(/Calgary/.test(route) && /620/.test(route), 'the van goes to Calgary, 620 km: ' + route.slice(0, 70));
    await page.waitForFunction(() => { const e = document.querySelector('[data-testid="rs-score"]'); return e && +e.textContent > 0; }, null, { timeout: 8000 });
    const fs0 = await page.evaluate(() => ({ songs: document.querySelectorAll('[data-testid^="rs-song-"]').length, info: GG.render.stage.info() }));
    c.ok(fs0.songs === 4 && fs0.info.view === 'spectator', 'their Sad Dome set: 4 songs, from the crowd');
    await shot(page, 'final_set');
    await page.evaluate(() => { GG.ui.gigAutoplay = true; });
    await tap(page, 'btn-rs-skip');
    await waitScreen(page, 'gig-results', 30000);
    await tap(page, 'btn-gig-done');
    await waitScreen(page, 'rival-verdict');
    const f = await page.evaluate(() => ({ head: document.querySelector('[data-testid="rv-verdict-head"]').textContent, fin: GG.state.finalShowdown }));
    c.ok(f.fin && f.fin.week === 237 && f.fin.headliner === (f.fin.won ? 'you' : 'rival') && /Forever/.test(f.head), 'finalShowdown stored: ' + f.head + ' ' + JSON.stringify(f.fin));
    const a1 = await audit(page); c.ok(!a1.length, 'final verdict layout: ' + a1.join(', '));
    await shot(page, 'final');
    await tap(page, 'btn-verdict-done');
    await waitScreen(page, 'wrap');
    await page.evaluate(() => { GG.ui.gigAutoplay = true; GG.ui.showdownViews = false; const st = GG.state; GG.ui.closeAll(); while (st.phase !== 'ended') { if (st.phase === 'wrap') GG.career.endWeek(st); else GG.career.botWeek(st, 'good'); } GG.main.route(); });
    await waitScreen(page, 'end');
    const end = await page.evaluate(() => (document.querySelector('[data-testid="end-final"]') || {}).textContent || '');
    c.ok(/Sad Dome/.test(end) && /Forever/.test(end), 'end screen: ' + end.slice(0, 80));
    c.ok(!errors.length, 'no console errors: ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close(); c.done();
}

// Tiles the v0.6 screenshots into one 390x844 contact sheet (3 x 3 at 130 x 281).
async function sheet() {
  const names = ['scene', 'scene_board', 'board', 'sd_card', 'rival_set', 'your_set', 'verdict', 'final_set', 'final'];
  const have = names.filter(n => fs.existsSync(path.join(CACHE, 'v06_' + n + '.png')));
  if (have.length < names.length) return;
  const { page, close } = await open({ noGoto: true });
  try {
    await page.setContent('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(3,130px);grid-auto-rows:281px;gap:0">'
      + have.map(n => '<img style="width:130px;height:281px;display:block" src="data:image/png;base64,' + fs.readFileSync(path.join(CACHE, 'v06_' + n + '.png')).toString('base64') + '">').join('') + '</body></html>');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(CACHE, 'v06_sheet.png') });
  } finally { await close(); }
}

(async () => {
  if (want('scene')) await scene();
  if (want('botb')) await botb();
  if (want('final')) await final();
  await sheet();
})();
