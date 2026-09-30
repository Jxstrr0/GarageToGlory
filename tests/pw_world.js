// pw_world.js: the v0.3 gig board and the van trip on a 390x844 phone viewport (WORLD agent).
// Sections (META_ONLY=board|van|calendar|drivers, comma-separated; default all). Each must finish inside `timeout 500`.
//   board : quickStart → plan Book → Go opens the board in book mode (phase still plan) → listings + layout audit +
//           screenshot tests/.cache/board_list.png → Map tab: 15 Sask pins, tap Regina → its gigs + screenshot
//           board_map.png → Book it + confirm → the week runs with that gig → corkboard hotspot = view mode (no book
//           buttons, van + banned wall) → door hotspot = van sheet + repair → next week: ✕ goes back to the planner,
//           "No gig this week" runs the week without a gig. No console errors.
//   van   : playVan to Regina with a road card: progress advances, banter, the card pops mid-drive (road-choice →
//           OK), arrival → done(trip); skip with no card = done fast; skip with an unresolved card shows the card
//           first; 3D van scene used when STAGE's scene is registered (else the 2D windshield). No console errors.
//   calendar (v0.6.1): HUD month · season · weather strip (390 + 440 wide, no overflow) + week-chip toast; garage decor by
//           season (box fan in July, lights + window snow in December); board: calendar line, ring tabs (Sask 15 pins,
//           Alberta 7 + the West 5 locked + teased in the garage era, open for Local Heroes), holiday tag chips on NYE; van: weather +
//           driver in the header, Kenji + cactus + you riding shotgun in the 3D van, the weather on the windshield; Kenji
//           quits -> you drive (van sheet). Screenshots tests/.cache/hud_calendar.png, board_rings.png, van_driver.png.
//   drivers (v0.9): Moth / T-Bone / Earl drive their band's van with their own dashboard item; they quit -> you drive and the
//           item stays (see drivers() below).
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
    // v0.9: the south-west Saskatchewan rooms (Maple Creek, Gull Lake, Shaunavon) put 15 cities in the home ring; Q1a's
    // Alberta ring (7, Calgary included) sits between it and the West (5)
    c.ok(await count(page, 'board-map') === 1 && await page.locator('[data-testid^="pin-"]').count() === 15, 'map with 15 Sask pins (v0.9 ring)');
    c.ok(await count(page, 'ring-sask') === 1 && await count(page, 'ring-alberta') === 1 && await count(page, 'ring-west') === 1 && await count(page, 'ring-eastnorth') === 1, 'ring tabs');
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

/* ---- calendar (v0.6.1): HUD strip, garage seasons, rings, holiday tags, van driver + weather --------------------- */
async function calendar() {
  const c = checker('calendar');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => GG.main.quickStart({ seed: 4343 }));
    await toPlan(page);
    const hud = await page.evaluate(() => ({ t: document.querySelector('[data-testid="hud-cal"]').textContent, L: GG.calendar.label(GG.state) }));
    c.ok(/Jul/.test(hud.t) && /Summer/.test(hud.t) && hud.t.includes(hud.L.weatherLabel) && /°C/.test(hud.t) && /Canada Day/.test(hud.t), 'HUD: month · season · weather · holiday: ' + hud.t);
    const fits = async () => page.evaluate(() => { const e = document.querySelector('[data-testid="hud-cal"]'), r = e.getBoundingClientRect(), b = document.querySelector('.hud-bar').getBoundingClientRect();
      return { in: r.left >= 0 && r.right <= document.documentElement.clientWidth + 0.5, below: r.top >= b.top, h: Math.round(r.height), hs: document.documentElement.scrollWidth <= document.documentElement.clientWidth }; });
    const f1 = await fits(); c.ok(f1.in && f1.hs && f1.h <= 24, 'HUD strip fits at 390 ' + JSON.stringify(f1));
    await page.evaluate(() => { const s = GG.state; s.week = 12; s.totalWeek = 12; GG.calendar.monday(s); GG.main.sync(); GG.ui.refreshHud(); });
    await page.waitForTimeout(100);
    c.ok(/Dec/.test(await page.textContent(tid('hud-cal'))) && /New Year/.test(await page.textContent(tid('hud-cal'))), 'December + NYE on the HUD');
    await page.setViewportSize({ width: 440, height: 956 }); await page.waitForTimeout(150);
    const f2 = await fits(); c.ok(f2.in && f2.hs, 'HUD strip fits at 440x956 ' + JSON.stringify(f2));
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(150);
    await tap(page, 'hud-week');
    await page.waitForTimeout(450);
    c.ok(/December/.test(await page.evaluate(() => (document.querySelector('#toast') || document.body).textContent)), 'week chip toast explains the calendar');
    await page.screenshot({ path: path.join(CACHE, 'hud_calendar.png') });
    // garage decor by season (3D only)
    const decor = await page.evaluate(() => {
      if (!GG.main.renderOk) return null;
      const s = GG.state, out = {};
      for (const w of [1, 5, 12]) { s.week = w; s.totalWeek = w; s.weather = GG.calendar.weatherAt(s); GG.render.syncState(s); out[w] = GG.debug('render').decor; }
      return out;
    });
    if (decor) c.ok(decor[1].fan && !decor[1].lights && decor[12].lights && decor[12].snow && !decor[5].lights && !decor[5].fan, 'garage: fan in July, lights + window snow in December ' + JSON.stringify(decor));
    else c.ok(true, 'garage decor: no WebGL, skipped');
    // the board: calendar line, rings, NYE tags
    await page.evaluate(() => { const s = GG.state; s.week = 12; s.totalWeek = 12; s.fans = 300; s.gig = null; s.offer = null; GG.world.refresh(s, true); GG.main.sync(); GG.ui.openBoard({ mode: 'view' }); });
    await waitScreen(page, 'board');
    c.ok(/December/.test(await page.textContent(tid('board-cal'))), 'board: calendar line');
    const tags = await page.$$eval('[data-testid="board-tag"]', els => els.map(e => e.textContent));
    c.ok(tags.some(t => /New Year/.test(t)), 'NYE tag chips: ' + tags.slice(0, 3).join(' | '));
    await tap(page, 'board-tab-map');
    c.ok(await page.locator('[data-testid^="pin-"]').count() === 15, 'Saskatchewan: 15 pins');
    const ringOf = () => page.evaluate(() => ({ ring: GG.debug('board').ring, pins: document.querySelectorAll('[data-testid^="pin-"]').length, lock: !!document.querySelector('[data-testid="ring-locked"]') }));
    await tap(page, 'ring-west');
    const west = await ringOf();
    c.ok(west.ring === 'west' && west.pins === 5 && west.lock, 'the West: 5 pins, locked + teased in the garage era ' + JSON.stringify(west));
    await tap(page, 'ring-alberta');   // v0.9 (Q1a): Alberta opens at Local Heroes for every band but Gravel Kings
    const ab = await ringOf();
    c.ok(ab.ring === 'alberta' && ab.pins === 7 && ab.lock, 'Alberta: 7 pins, locked + teased in the garage era ' + JSON.stringify(ab));
    await page.screenshot({ path: path.join(CACHE, 'board_rings.png') });
    const badR = await audit(page); c.ok(badR.length === 0, 'rings layout: ' + badR.join(', '));
    await tap(page, 'pin-calgary');
    c.ok(/Calgary/.test(await page.textContent(tid('board-city'))) && /Not open to you yet/.test(await page.textContent(tid('board-city'))), 'Calgary: teased');
    await page.evaluate(() => { GG.state.era = 'local'; });
    await tap(page, 'ring-eastnorth'); await tap(page, 'ring-west');
    c.ok(await count(page, 'ring-locked') === 0, 'Local Heroes: the West opens');
    await tap(page, 'ring-alberta');
    c.ok(await count(page, 'ring-locked') === 0, 'Local Heroes: Alberta opens');
    await tap(page, 'ring-eastnorth');
    c.ok(await count(page, 'ring-locked') === 1 && await page.locator('[data-testid^="pin-"]').count() === 9, 'East & North: still locked until Signed');
    await tap(page, 'btn-board-close'); await page.waitForFunction(() => GG.debug('ui').stack.length === 0);
    await page.evaluate(() => { GG.state.era = 'garage'; });
    // the van: weather + driver in the header; Kenji up front with the cactus, you riding shotgun
    await page.evaluate(() => {
      const s = GG.state, W = GG.world; s.week = 13; s.totalWeek = 13; s.weather = GG.calendar.weatherAt(s);
      s.gig = W.makeListing(s, GG.gig.venue('craigs_basement'), GG.RNG(1), {}); s.trip = null;
      const t = W.startTrip(s); t.cardId = null; t.resolved = true; t.banter = [];
      window.__vanDone = null; GG.ui.playVan(s.gig, () => { window.__vanDone = 'yes'; });
    });
    await waitScreen(page, 'van');
    const vw = await page.evaluate(() => ({ head: document.querySelector('[data-testid="van-weather"]').textContent, t: GG.world.trip(GG.state), info: GG.render.van && GG.render.van.info ? GG.render.van.info() : null }));
    c.ok(/°C/.test(vw.head) && /Kenji drives/.test(vw.head) && vw.t.weather && vw.t.driver === 'kenji', 'van header: weather + driver: ' + vw.head);
    if (vw.info && vw.info.built) {
      c.ok(vw.info.driver === 'kenji' && vw.info.people[1] === 'player:shotgun' && vw.info.dashboard === 'cactus' && vw.info.weatherId === vw.t.weather,
        'Kenji drives, you ride shotgun, the tiny cactus, the weather on the windshield: ' + JSON.stringify([vw.info.people, vw.info.weatherId, vw.info.weather]));
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(CACHE, 'van_driver.png') });
    } else c.ok(true, '2D windshield (no 3D van)');
    await tap(page, 'btn-van-skip');
    await page.waitForFunction(() => window.__vanDone === 'yes', null, { timeout: 8000 });
    // Kenji quits: you drive (van sheet + the 3D seating)
    await page.evaluate(() => { GG.drama.applyMember(GG.state, { id: 'kenji', act: 'quit' }, {}); GG.main.sync(); GG.emit('hotspot', { action: 'door' }); });
    await waitScreen(page, 'van-info');
    c.ok(/Driver: You/.test(await page.textContent(tid('van-driver'))), 'van sheet: you drive now');
    await tap(page, 'btn-close'); await page.waitForFunction(() => GG.debug('ui').stack.length === 0);
    const youDrive = await page.evaluate(() => {
      if (!GG.render.van || !GG.render.sceneNames || !GG.render.sceneNames().includes('van')) return null;
      GG.render.setScene('van'); GG.render.van.setTrip({ from: 'Saskatoon', to: 'Regina', km: 240, weather: 'blizzard' });
      const i = GG.render.van.info(); GG.render.setScene('garage'); return i;
    });
    if (youDrive) c.ok(youDrive.driver === 'you' && youDrive.people[0] === 'player:driver' && youDrive.weatherId === 'blizzard', 'you drive: ' + youDrive.people.join(' '));
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'calendar threw: ' + (e.stack || e)); }
  await close();
  c.done();
}

/* ---- drivers (v0.9): every band's designated driver in the van, and the fallback to you when they quit ----------------
   Frost Heave (Moth + her laundry), Gravel Kings (T-Bone + Chase's cassettes), the Ramblers (Earl + the 1987 atlas): the van
   header, the trip's driver, the 3D van's driver + dashboard item (or the 2D windshield); the driver quits → the van sheet
   says you drive (the mirrors are still set for them), the header says "You drive", and their dashboard item stays on the
   dash (never Kenji's cactus). Screenshots tests/.cache/van_driver_<band>.png. */
async function drivers() {
  const c = checker('drivers');
  for (const bandId of ['frost_heave', 'gravel_kings', 'grid_road_ramblers']) {
    const { page, errors, close } = await open();
    try {
      await page.waitForSelector(tid('btn-new'), { timeout: 20000 });
      const d = await page.evaluate(b => {
        GG.main.quickStart({ seed: 5151, bandId: b, openCard: false }); GG.ui.closeAll();
        const s = GG.state; s.card = null; s.phase = 'plan'; GG.main.sync();
        const drv = GG.world.driver(s), def = GG.content.drivers[drv.designated] || {};
        return { band: s.bandId, id: drv.id, name: drv.name, you: drv.you, designated: drv.designated, dash: def.dashboard, cactus: drv.dashboard === 'cactus' };
      }, bandId);
      c.ok(d.band === bandId && !d.you && d.id === d.designated && d.dash && d.dash !== 'cactus', bandId + ': ' + d.name + ' drives, dashboard ' + d.dash);
      const trip = async (label) => {
        await page.evaluate(() => {
          // (a venue out of town: a long enough drive that the van hasn't arrived by the time the test looks)
          const s = GG.state, W = GG.world, v = GG.content.venues.filter(x => x.city !== s.city && x.region === 'canada' && x.tier <= 2)[0] || GG.content.venues[0];
          s.gig = W.makeListing(s, v, GG.RNG(3), {}); s.trip = null;
          const t = W.startTrip(s); t.cardId = null; t.resolved = true; t.banter = [];
          window.__vanDone = null; GG.ui.playVan(s.gig, () => { window.__vanDone = 'yes'; });
        });
        await waitScreen(page, 'van');
        await page.waitForTimeout(500);
        const r = await page.evaluate(() => ({ head: document.querySelector('[data-testid="van-weather"]').textContent, t: GG.world.trip(GG.state), mode: GG.debug('van').mode,
          info: GG.render.van && GG.render.van.info ? GG.render.van.info() : null }));
        await page.screenshot({ path: path.join(CACHE, 'van_driver_' + bandId + label + '.png') });
        // skip (or "Load in" if the van already arrived; the button re-renders on arrival, so retry briefly)
        for (let k = 0; k < 24 && !(await page.evaluate(() => window.__vanDone === 'yes')); k++) {
          await page.locator(tid('btn-van-skip')).last().click({ timeout: 1500 }).catch(() => {});
          await page.waitForTimeout(250);
        }
        await page.waitForFunction(() => window.__vanDone === 'yes', null, { timeout: 8000 });
        return r;
      };
      const a = await trip('');
      c.ok(a.head.includes(d.name + ' drives') && a.t.driver === d.id, bandId + ': van header + trip: ' + a.head);
      if (a.info && a.info.built) c.ok(a.info.driver === d.id && a.info.dashboard === d.dash, bandId + ': the 3D van: ' + a.info.driver + ' + ' + a.info.dashboard);
      else c.ok(a.mode === '2d', bandId + ': the 2D windshield (no 3D van)');
      // the driver quits: you drive, their dashboard item stays
      await page.evaluate(id => { GG.drama.applyMember(GG.state, { id, act: 'quit' }, {}); GG.main.sync(); GG.emit('hotspot', { action: 'door' }); }, d.id);
      await waitScreen(page, 'van-info');
      const sheet = await page.evaluate(() => ({ drv: document.querySelector('[data-testid="van-driver"]').textContent, all: document.querySelector('#screens').textContent }));
      c.ok(/Driver: You/.test(sheet.drv) && sheet.all.includes('mirrors are still set for ' + d.name) && !/Kenji|cactus/i.test(sheet.all), bandId + ': the van sheet: you drive now, the mirrors are set for ' + d.name);
      await tap(page, 'btn-close'); await page.waitForFunction(() => GG.debug('ui').stack.length === 0);
      const b = await trip('_you');
      c.ok(b.head.includes('You drive') && b.t.driver === 'you', bandId + ': after the quit: ' + b.head);
      if (b.info && b.info.built) c.ok(b.info.driver === 'you' && b.info.people[0] === 'player:driver' && b.info.dashboard === d.dash, bandId + ': you drive, ' + d.name + '\'s ' + d.dash + ' stays on the dash: ' + b.info.dashboard);
      c.ok(errors.length === 0, bandId + ': no console errors ' + errors.join(' | '));
    } catch (e) { c.ok(false, bandId + ' threw: ' + (e.stack || e)); }
    await close();
  }
  c.done();
}

(async () => {
  if (want('board')) await board();
  if (want('van')) await van();
  if (want('calendar')) await calendar();
  if (want('drivers')) await drivers();   // v0.9
})();
