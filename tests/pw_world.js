// pw_world.js: the v0.3 gig board and the van trip on a 390x844 phone viewport (WORLD agent).
// Sections (META_ONLY=board|van, comma-separated; default both). Each must finish inside `timeout 500`.
//   board : quickStart → plan Book → Go opens the board in book mode (phase still plan) → listings + layout audit +
//           screenshot tests/.cache/board_list.png → Map tab: 9 pins, tap Regina → its gigs + screenshot
//           board_map.png → Book it + confirm → the week runs with that gig → corkboard hotspot = view mode (no book
//           buttons, van + banned wall) → door hotspot = van sheet + repair → next week: ✕ goes back to the planner,
//           "No gig this week" runs the week without a gig. No console errors.
//   van   : playVan to Regina with a road card: progress advances, banter, the card pops mid-drive (road-choice →
//           OK), arrival → done(trip); skip with no card = done fast; skip with an unresolved card shows the card
//           first; 3D van scene used when STAGE's scene is registered (else the 2D windshield). No console errors.
// Run: node build.js && META_ONLY=board timeout 500 node tests/pw_world.js
const path = require('path');
const { open, checker } = require('./_pw');
const CACHE = path.join(__dirname, '.cache');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);

const tid = id => `[data-testid="${id}"]`;
const tap = (page, id) => page.locator(tid(id)).last().click();
const screen = page => page.evaluate(() => GG.debug('ui').screen);
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });
const count = (page, id) => page.locator(tid(id)).count();

function audit(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const cs = getComputedStyle(e); return cs.visibility === 'hidden' || cs.display === 'none' ? null : r; };
    const name = e => (e.dataset.testid || e.className || e.tagName) + '';
    for (const e of document.querySelectorAll('#screens *')) { const r = vis(e); if (r && (r.right > W + 1 || r.left < -1) && !e.closest('.gb-map')) bad.push('overflow ' + name(e)); }
    for (const sc of document.querySelectorAll('.full-body')) if (sc.scrollWidth > sc.clientWidth + 1) bad.push('hscroll ' + sc.className);
    for (const b of document.querySelectorAll('#screens button')) { const r = vis(b); if (r && (r.width < 43.5 || r.height < 43.5)) bad.push('small ' + name(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
    return bad.slice(0, 8);
  });
}
async function toPlan(page) {
  await page.waitForFunction(() => GG.state && (GG.state.phase === 'plan' || GG.debug('ui').screen === 'card'), null, { timeout: 10000 });
  if (await screen(page) === 'card') { await tap(page, 'choice-0'); await tap(page, 'btn-card-ok'); }
  await page.waitForFunction(() => GG.state.phase === 'plan' && GG.debug('ui').stack.length === 0, null, { timeout: 10000 });
}
async function planBook(page) {
  await tap(page, 'btn-primary'); await waitScreen(page, 'plan');
  for (const a of ['book', 'rehearse', 'rest']) await tap(page, 'act-' + a);
  await tap(page, 'btn-go');
}
async function finishWeek(page) {
  await page.waitForFunction(() => ['results', 'wrap'].includes(GG.debug('ui').screen) || GG.state.phase === 'gig', null, { timeout: 15000 });
  if (await page.evaluate(() => GG.state.phase === 'gig')) {   // phase 2 (RHYTHM) may play gigs live: finish it
    await page.evaluate(() => { GG.ui.closeAll(); GG.career.finishGig(GG.state, null); GG.main.sync(); GG.ui.show('results', { result: GG.state.lastWeek }); });
  }
  if (await screen(page) === 'results') {
    if (await page.locator(tid('btn-results-skip')).isVisible()) await tap(page, 'btn-results-skip');
    await tap(page, 'btn-results-ok');
  }
  await waitScreen(page, 'wrap');
  await tap(page, 'btn-next-week');
}

/* ---- board ---------------------------------------------------------------------------------------------- */
async function board() {
  const c = checker('board');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => GG.main.quickStart({ seed: 4242 }));
    await toPlan(page);
    // a band with some fans and nothing booked yet, so the board has a real choice
    await page.evaluate(() => { const s = GG.state; s.gig = null; s.fans = 180; s.buzz = 20; GG.world.refresh(s, true); GG.main.sync(); });
    await planBook(page);
    await waitScreen(page, 'board');
    const d0 = await page.evaluate(() => ({ dbg: GG.debug('board'), phase: GG.state.phase, n: GG.state.listings.length }));
    c.ok(d0.dbg.mode === 'book' && d0.phase === 'plan', 'Go opens the board in book mode before the week runs');
    const cards = await count(page, 'board-listing');
    c.ok(cards === d0.n && cards >= 3 && cards <= 6, 'every listing on the board: ' + cards);
    const txt = await page.textContent('.full.board');
    c.ok(/The catch:/.test(txt) && /km|across town/.test(txt) && /Needs \d+ fans/.test(txt) && /Tier [12]/.test(txt), 'listing shows catch, distance, fans needed, tier');
    const bad = await audit(page); c.ok(bad.length === 0, 'board layout: ' + bad.join(', '));
    await page.waitForTimeout(400);   // let the screen fade in
    await page.screenshot({ path: path.join(CACHE, 'board_list.png') });
    await tap(page, 'board-tab-map');
    c.ok(await count(page, 'board-map') === 1 && await page.locator('[data-testid^="pin-"]').count() === 9, 'map with 9 Sask pins');
    await tap(page, 'pin-regina');
    const city = await page.textContent(tid('board-city'));
    const regina = await page.evaluate(() => GG.state.listings.filter(l => l.city === 'Regina').length);
    c.ok(/Regina/.test(city) && await page.locator(tid('board-city') + ' ' + tid('board-listing')).count() === regina, 'tap a pin → its gigs (' + regina + ')');
    const bad2 = await audit(page); c.ok(bad2.length === 0, 'map layout: ' + bad2.join(', '));
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(CACHE, 'board_map.png') });
    await tap(page, 'board-tab-list');
    const pick = await page.evaluate(() => GG.state.listings.find(l => GG.world.canBook(GG.state, l)));
    await tap(page, 'book-' + pick.id);
    await waitScreen(page, 'confirm'); await tap(page, 'btn-confirm-yes');
    await page.waitForFunction(() => GG.state.phase !== 'plan', null, { timeout: 10000 });
    const wk = await page.evaluate(() => ({ book: GG.state.lastWeek.blocks[0].deltas.book, gig: (GG.state.gig || GG.state.lastGig || {}).venueId }));
    c.ok(wk.book === pick.venueId && wk.gig === pick.venueId, 'the picked listing is booked and played: ' + JSON.stringify(wk));
    await finishWeek(page);
    // corkboard = view mode
    await toPlan(page);
    await page.evaluate(() => GG.emit('hotspot', { action: 'gigboard' }));
    await waitScreen(page, 'board');
    const v = await page.evaluate(() => ({ mode: GG.debug('board').mode, book: document.querySelectorAll('[data-testid^="book-"]').length, txt: document.querySelector('.full.board').textContent }));
    c.ok(v.mode === 'view' && v.book === 0 && /Moose Hearse/.test(v.txt) && /banned wall/i.test(v.txt), 'corkboard: view mode, van + banned wall, no booking');
    await tap(page, 'btn-board-close'); await page.waitForFunction(() => GG.debug('ui').stack.length === 0);
    await page.evaluate(() => { GG.state.fund = 500; GG.state.van.condition = 40; GG.emit('hotspot', { action: 'door' }); });
    await waitScreen(page, 'van-info');
    await tap(page, 'van-repair');
    const van = await page.evaluate(() => ({ c: GG.state.van.condition, f: GG.state.fund }));
    c.ok(van.c === 60 && van.f === 440, 'door: Cousin Dale repairs the van ' + JSON.stringify(van));
    await tap(page, 'btn-close'); await page.waitForFunction(() => GG.debug('ui').stack.length === 0);
    // ✕ = back to the planner; "No gig this week" = the week runs without a gig
    await page.evaluate(() => { GG.state.gig = null; GG.state.offer = null; });
    await planBook(page); await waitScreen(page, 'board');
    await tap(page, 'btn-board-close');
    await waitScreen(page, 'plan');
    c.ok(await page.evaluate(() => GG.state.phase === 'plan'), '✕ goes back to the planner');
    await tap(page, 'btn-go'); await waitScreen(page, 'board');
    await tap(page, 'board-skip');
    await page.waitForFunction(() => GG.state.phase !== 'plan', null, { timeout: 10000 });
    const sk = await page.evaluate(() => ({ gig: GG.state.gig, last: GG.state.lastWeek.gig, lines: GG.state.lastWeek.blocks[0].lines.join(' ') }));
    c.ok(!sk.gig && !sk.last && /No gig/.test(sk.lines), 'skip: no gig this weekend');
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'board threw: ' + (e.stack || e)); }
  await close();
  c.done();
}

/* ---- van ------------------------------------------------------------------------------------------------ */
async function van() {
  const c = checker('van');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => GG.main.quickStart({ seed: 77, openCard: false }));
    // a gig in Regina with a road card
    await page.evaluate(() => {
      const s = GG.state, W = GG.world;
      s.gig = W.makeListing(s, GG.gig.venue('craigs_basement'), GG.RNG(1), {}); s.trip = null;
      const t = W.startTrip(s); t.cardId = 'road_van_noise'; t.resolved = false;
      window.__vanDone = null; GG.ui.playVan(s.gig, trip => { window.__vanDone = trip ? trip.toName : 'none'; });
    });
    await waitScreen(page, 'van');
    const m = await page.evaluate(() => ({ mode: GG.debug('van').mode, has3d: !!(GG.render.sceneNames && GG.render.sceneNames().includes('van') && GG.render.van) }));
    c.ok(m.mode === (m.has3d ? '3d' : '2d'), 'van scene: ' + m.mode + (m.has3d ? ' (STAGE scene found)' : ' (2D windshield fallback)'));
    c.ok(/Saskatoon → Regina/.test(await page.textContent(tid('van-route'))), 'route header');
    await page.waitForFunction(() => GG.debug('van').p > 0.15, null, { timeout: 8000 });
    c.ok(true, 'progress advances');
    await waitScreen(page, 'road', 12000);
    const p = await page.evaluate(() => GG.debug('van').p);
    c.ok(p >= 0.44 && p < 0.7, 'road card mid-drive at ' + p.toFixed(2));
    const f0 = await page.evaluate(() => GG.state.fund);
    await tap(page, 'road-choice-1');
    c.ok(await page.evaluate(() => GG.world.trip(GG.state).resolved) && await page.evaluate(f => GG.state.fund === f - 50, f0), 'road card resolved like a Monday card (−$50, van ↑)');
    await tap(page, 'btn-road-ok');
    await page.waitForFunction(() => window.__vanDone, null, { timeout: 15000 });
    c.ok(await page.evaluate(() => window.__vanDone === 'Regina' && !GG.ui.isOpen('van')), 'arrival → done(trip)');
    c.ok(await page.evaluate(() => GG.debug('van').arrived), 'arrival line shown');
    // banter shows up (the drive after the card)
    await page.evaluate(() => { const s = GG.state; s.trip = null; const t = GG.world.startTrip(s); t.cardId = null; t.resolved = true;
      t.banter = [{ who: 'marcel', text: 'Test banter.' }, { who: 'kenji', text: '(Kenji nods.)' }];
      window.__vanDone = null; GG.ui.playVan(s.gig, () => { window.__vanDone = 'yes'; }); });
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="van-say"]').length >= 1, null, { timeout: 8000 });
    c.ok(true, 'banter bubble');
    const t0 = Date.now(); await tap(page, 'btn-van-skip');
    await page.waitForFunction(() => window.__vanDone === 'yes', null, { timeout: 5000 });
    c.ok(Date.now() - t0 < 2500, 'skip without a card arrives fast (' + (Date.now() - t0) + ' ms)');
    // skip with an unresolved card: the card first, then arrival
    await page.evaluate(() => { const s = GG.state; s.trip = null; const t = GG.world.startTrip(s); t.cardId = 'road_double_double'; t.resolved = false;
      window.__vanDone = null; GG.ui.playVan(s.gig, () => { window.__vanDone = 'skipped'; }); });
    await waitScreen(page, 'van'); await tap(page, 'btn-van-skip');
    await waitScreen(page, 'road');
    await tap(page, 'road-choice-0'); await tap(page, 'btn-road-ok');
    await page.waitForFunction(() => window.__vanDone === 'skipped', null, { timeout: 5000 });
    c.ok(true, 'skip with a card: card, then arrival');
    const bad = await audit(page); c.ok(bad.length === 0, 'layout: ' + bad.join(', '));
    c.ok(await page.evaluate(() => !GG.ui.isOpen('van') && !GG.ui.isOpen('road')), 'screens closed');
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'van threw: ' + (e.stack || e)); }
  await close();
  c.done();
}

(async () => {
  if (want('board')) await board();
  if (want('van')) await van();
})();
