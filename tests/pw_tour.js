// pw_tour.js: the v0.7 "World" UI (5i_ui_tour) on a 390x844 phone viewport (WORLDUI agent).
// Sections (META_ONLY=map|tour|gong|payoff, comma-separated; default all four + the contact sheet). Each fits `timeout 500`.
//   map  : a World-era career (UK & Europe open) → the world map (4 region pins + cards, lock state, status strip) →
//          UK & Europe region screen (regional map, city pins, tap Helsinki → its venues) → a package → the picker
//          (rental / stay / extra, live quote) → Book (fund − upfront, booked) → planner shows the booked tour →
//          laptop World tab → cancel (refund) → a locked region's picker can't book. Layout audits. Screenshots
//          world_map.png, region_map.png, tour_pkg.png.
//   tour : a booked continental tour departs: the flight moment (plane across the world map) → a region card with the
//          region strip → the planner shrinks to rest / promote locally / hotel-room rehearsal, a forced rest locks slot 1
//          → Go → the van abroad (the tiny European van, packed like sardines; UK & Europe scenery) → the gig → the wrap
//          (on tour, homesick, calling home) → a bot week → the open date: Go opens the regional board (region map) →
//          book → the last stop → the homecoming sheet + wrap-home. Then the festival stage (Mudstonbury mud) and the
//          polite Japanese crowd (Budokhan: still while the song plays, claps then bows on 'applause'). Screenshots
//          van_abroad.png, wrap_tour.png, stage_festival.png, stage_japan.png.
//   gong : week 22 of a World-era year, nominated (a broken region): the wrap opens the Global Gong ceremony (the v0.5
//          red carpet, sign "The Global Gong") → envelope → win → speech → after-party → the wrap shows the Gong; the
//          Moose Opera (tour:moose) plays after the wrap opens. Screenshots gong.png, moose.png.
//   payoff: (v0.9) Frost Heave's World payoff screen after the wrap (tour:payoff; see payoff() below).
//   sheet: (default run or META_ONLY=sheet) tiles the 8 v0.7 screenshots into tests/.cache/v07_sheet.png.
// Run: node build.js && META_ONLY=map timeout 500 node tests/pw_tour.js
const path = require('path'), fs = require('fs');
const { open, checker } = require('./_pw');
const CACHE = path.join(__dirname, '.cache');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);

const tid = id => `[data-testid="${id}"]`;
const tap = (page, id) => page.locator(tid(id)).last().click();
const screen = page => page.evaluate(() => GG.debug('ui').screen);
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });
const count = (page, id) => page.locator(tid(id)).count();
const text = (page, id) => page.locator(tid(id)).last().textContent();
const bareUi = (page, on) => page.evaluate(on => { ['hud', 'screens', 'toast'].forEach(id => { const e = document.getElementById(id); if (e) e.style.visibility = on ? 'hidden' : ''; }); }, on);
const shot = (page, name) => page.screenshot({ path: path.join(CACHE, name) });

function audit(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const cs = getComputedStyle(e); return cs.visibility === 'hidden' || cs.display === 'none' ? null : r; };
    const name = e => (e.dataset.testid || e.className || e.tagName) + '';
    for (const e of document.querySelectorAll('#screens *')) { const r = vis(e); if (r && (r.right > W + 1 || r.left < -1) && !e.closest('.gb-map')) bad.push('overflow ' + name(e)); }
    for (const sc of document.querySelectorAll('.sheet-body, .full-body')) if (sc.scrollWidth > sc.clientWidth + 1) bad.push('hscroll ' + sc.className);
    for (const b of document.querySelectorAll('#screens button')) { const r = vis(b); if (r && (r.width < 43.5 || r.height < 43.5)) bad.push('small ' + name(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
    return bad.slice(0, 8);
  });
}
// A World-era career at totalWeek tw (Monday), rich enough to tour; UK & Europe open.
async function worldCareer(page, o) {
  await page.waitForFunction(() => window.GG && GG.main && GG.tour && GG.ui.openWorld, null, { timeout: 15000 });
  await page.evaluate(o => {
    GG.main.quickStart({ seed: o.seed || 707, openCard: false, bandId: o.bandId });   // v0.9: any band (default Hail Damage)
    GG.ui.closeAll();
    const s = GG.state, tw = o.tw || 125;
    s.totalWeek = tw; s.year = Math.floor((tw - 1) / 24) + 1; s.week = (tw - 1) % 24 + 1;
    Object.assign(s, { era: 'world', protected: false, fans: 24000, fund: 60000, buzz: 60, phase: 'monday', gig: null, weekStart: null, card: null, offer: null });
    s.eraHistory.push({ era: 'local', week: 20 }, { era: 'signed', week: 40 }, { era: 'world', week: tw - 25 });
    s.milestones.worldReady = tw - 25;
    GG.tour.ensure(s); GG.tour.unlock(s, 'uk_europe', 'fans');
    GG.main.sync();
  }, o || {});
}
async function toPlan(page) {
  await page.waitForFunction(() => GG.state && (GG.state.phase === 'plan' || GG.debug('ui').screen === 'card'), null, { timeout: 10000 });
  if (await screen(page) === 'card') { await tap(page, 'choice-0'); await tap(page, 'btn-card-ok'); }
  await page.waitForFunction(() => GG.state.phase === 'plan' && GG.debug('ui').stack.length === 0, null, { timeout: 10000 });
}
async function gigToWrap(page) {
  await page.waitForFunction(() => ['results', 'wrap', 'van', 'gig'].includes(GG.debug('ui').screen) || GG.state.phase === 'gig', null, { timeout: 15000 });
  if (await screen(page) === 'results') {
    if (await page.locator(tid('btn-results-skip')).isVisible()) await tap(page, 'btn-results-skip');
    if (await page.evaluate(() => GG.state.phase !== 'gig')) await tap(page, 'btn-results-ok');
  }
  if (await page.evaluate(() => GG.state.phase === 'gig')) {
    await page.evaluate(() => { GG.ui.closeAll(); GG.career.finishGig(GG.state, null); GG.main.sync(); GG.main.wrapWeek(); });
  }
  await waitScreen(page, 'wrap');
}

/* ---- map --------------------------------------------------------------------------------------------------------- */
async function map() {
  const c = checker('map');
  const { page, errors, close } = await open();
  try {
    await worldCareer(page, { seed: 707 });
    await page.evaluate(() => GG.ui.openWorld());
    await waitScreen(page, 'world');
    c.ok(await count(page, 'world-map') === 1, 'the world map');
    const pins = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="world-pin-"]')].map(e => e.dataset.testid.slice(10) + ':' + e.className));
    c.ok(pins.length === 4 && ['uk_europe', 'japan', 'australia', 'russia'].every(r => pins.some(p => p.startsWith(r + ':'))), 'four region pins: ' + pins.map(p => p.split(':')[0]).join(','));
    c.ok(/open/.test(pins.find(p => p.startsWith('uk_europe'))) && /locked/.test(pins.find(p => p.startsWith('russia'))), 'lock state on the pins');
    c.ok(await page.locator(tid('world-region-uk_europe')).getAttribute('data-unlocked') === '1' && await page.locator(tid('world-region-russia')).getAttribute('data-unlocked') === '0', 'region cards: open / locked');
    c.ok(/Unlocks at [\d.,]+k? fans/.test(await text(page, 'world-region-japan')), 'a locked region shows its threshold');
    c.ok(await page.locator(tid('world-status')).getAttribute('data-state') === 'none', 'status strip: no tour booked');
    c.ok(!/USA|America/.test(await page.locator('#screens').textContent()), 'no USA on the map');
    let bad = await audit(page); c.ok(!bad.length, 'world map layout: ' + bad.join(', '));
    await page.waitForTimeout(300); await shot(page, 'world_map.png');

    // Region screen: the regional map, city pins, a city's venues, the packages.
    await tap(page, 'region-open-uk_europe'); await waitScreen(page, 'tour-region');
    const cities = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="city-pin-"]')].map(e => e.dataset.testid.slice(9)));
    c.ok(await count(page, 'region-map') === 1 && cities.length >= 12 && cities.includes('helsinki') && cities.includes('london'), 'regional map with ' + cities.length + ' city pins');
    await tap(page, 'city-pin-helsinki');
    await page.waitForFunction(() => /Helsinki/.test((document.querySelector('[data-testid="region-city"]') || {}).textContent || ''), null, { timeout: 5000 });
    c.ok(/Moose Opera/.test(await text(page, 'region-city')), 'Helsinki: the Finnish National Moose Opera');
    c.ok(await count(page, 'pkg-uk_pub_crawl') === 1 && await count(page, 'pkg-eu_continental') === 1, 'packages listed');
    bad = await audit(page); c.ok(!bad.length, 'region screen layout: ' + bad.join(', '));
    await page.evaluate(() => { const b = document.querySelector('.full.tworld .full-body'); if (b) b.scrollTop = 0; });
    await page.waitForTimeout(250); await shot(page, 'region_map.png');

    // The package picker: choices change the live quote; book.
    await tap(page, 'pkg-open-uk_pub_crawl'); await waitScreen(page, 'tour-pkg');
    const q0 = await text(page, 'quote-total');
    await tap(page, 'pick-extra-publicist');
    await page.waitForFunction(q => document.querySelector('[data-testid="quote-total"]').textContent !== q, q0, { timeout: 5000 });
    await tap(page, 'pick-vehicle-sardine_van'); await tap(page, 'pick-stay-hostel');
    c.ok(await page.evaluate(() => ['pick-vehicle-sardine_van', 'pick-stay-hostel', 'pick-extra-publicist'].every(x => document.querySelector('[data-testid="' + x + '"]').getAttribute('aria-pressed') === 'true')), 'choices picked');
    const quote = await page.evaluate(() => GG.tour.quote(GG.state, 'uk_pub_crawl', GG.ui.get('tour-pkg').data.choices));
    c.ok(quote.extra === 1200 && quote.choices.vehicle === 'sardine_van', 'the picker holds the choices');
    const up = await text(page, 'quote-upfront');
    c.ok(up.replace(/[^\d]/g, '') === String(quote.upfront), 'live quote upfront ' + up + ' = ' + quote.upfront);
    bad = await audit(page); c.ok(!bad.length, 'package picker layout: ' + bad.join(', '));
    await page.waitForTimeout(250); await shot(page, 'tour_pkg.png');
    const f0 = await page.evaluate(() => GG.state.fund);
    await tap(page, 'btn-book-tour');
    await page.waitForFunction(() => !GG.ui.isOpen('tour-pkg') && !GG.ui.isOpen('world'), null, { timeout: 5000 });
    const bk = await page.evaluate(() => ({ st: GG.state.tour.active && GG.state.tour.active.status, veh: GG.state.tour.active && GG.state.tour.active.choices.vehicle, fund: GG.state.fund }));
    c.ok(bk.st === 'booked' && bk.veh === 'sardine_van' && bk.fund === f0 - quote.upfront, 'booked: fund −' + quote.upfront + ', the tiny van');

    // The planner shows the booked tour; the laptop World tab can cancel it.
    await page.evaluate(() => GG.state.phase = 'plan');
    await tap(page, 'btn-primary'); await waitScreen(page, 'plan');
    c.ok(/departs next Monday/.test(await text(page, 'plan-tour')), 'planner: booked, departs next Monday');
    await page.evaluate(() => { GG.ui.closeAll(); GG.emit('hotspot', { action: 'laptop' }); });
    await waitScreen(page, 'laptop');
    await tap(page, 'laptop-tab-world');
    await page.waitForSelector(tid('world-panel'));
    c.ok(await page.locator(tid('world-status')).last().getAttribute('data-state') === 'booked' && await count(page, 'world-mini') === 1, 'laptop World tab: status + mini map');
    bad = await audit(page); c.ok(!bad.length, 'laptop World tab layout: ' + bad.join(', '));
    const f1 = await page.evaluate(() => GG.state.fund);
    await tap(page, 'tour-cancel'); await waitScreen(page, 'confirm'); await tap(page, 'btn-confirm-yes');
    await page.waitForFunction(() => !GG.state.tour.active, null, { timeout: 5000 });
    c.ok(await page.evaluate(f => GG.state.fund > f, f1), 'cancel refunds the rental + extra');
    await page.waitForFunction(() => (document.querySelector('[data-testid="world-status"]') || {}).dataset?.state === 'none', null, { timeout: 5000 }).catch(() => {});
    c.ok(await page.locator(tid('world-status')).last().getAttribute('data-state') === 'none', 'the tab re-renders: no tour booked');

    // A locked region: look, but no booking.
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.openWorld(); });
    await waitScreen(page, 'world');
    await tap(page, 'region-open-russia'); await waitScreen(page, 'tour-region');
    const ru = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="pkg-open-"]')].map(e => e.dataset.testid.slice(9)));
    await tap(page, 'pkg-open-' + ru[0]); await waitScreen(page, 'tour-pkg');
    c.ok(await page.locator(tid('btn-book-tour')).isDisabled() && /locked|fans|invite/i.test(await text(page, 'quote-why')), 'a locked region cannot be booked: ' + (await text(page, 'quote-why')).slice(0, 60));
    c.ok(!errors.length, 'no console errors: ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'map threw: ' + e.message); console.log(errors.slice(0, 5).join('\n')); }
  await close(); c.done();
}

/* ---- tour -------------------------------------------------------------------------------------------------------- */
async function tour() {
  const c = checker('tour');
  const { page, errors, close } = await open();
  try {
    await worldCareer(page, { seed: 808 });
    await page.evaluate(() => {
      const s = GG.state;
      GG.tour.book(s, 'eu_continental', { vehicle: 'sardine_van', stay: 'hostel' });
      s.phase = 'wrap'; GG.career.endWeek(s);   // leaves next Monday
      GG.main.sync(); GG.main.beginWeek();
    });
    // The flight.
    await waitScreen(page, 'tour-flight');
    c.ok(await count(page, 'flight-map') === 1 && /UK & Europe|Europe/.test(await page.locator('.full.tworld').last().textContent()), 'departure day: the flight over the world map');
    await page.waitForSelector('.tw-plane.landed', { timeout: 8000 });
    c.ok(true, 'the plane lands');
    let bad = await audit(page); c.ok(!bad.length, 'flight layout: ' + bad.join(', '));
    await tap(page, 'btn-flight-go');
    await page.waitForFunction(() => !GG.ui.isOpen('tour-flight'), null, { timeout: 5000 });
    c.ok(await page.evaluate(() => GG.tour.away(GG.state) && GG.tour.here(GG.state) === 'amsterdam'), 'landed: on tour, Amsterdam');
    if (await screen(page) === 'card') {
      const id = await page.evaluate(() => GG.state.card.id);
      c.ok(!/^wt_/.test(id) || await count(page, 'card-region') === 1, 'region card ' + id + ' carries the region strip');
    }
    await toPlan(page);

    // The on-tour planner.
    await tap(page, 'btn-primary'); await waitScreen(page, 'plan');
    const acts = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="act-"]')].map(e => e.dataset.testid.slice(4)));
    const allowed = await page.evaluate(() => GG.tour.allowedBlocks(GG.state));
    c.ok(acts.length === allowed.length && allowed.every(a => acts.includes(a)) && !acts.includes('write') && !acts.includes('book'), 'shrunk blocks: ' + acts.join(','));
    c.ok(/Hotel-room rehearsal/.test(await page.locator('#screens').textContent()) && /Amsterdam/.test(await text(page, 'plan-tour')), 'tour names + the stop');
    bad = await audit(page); c.ok(!bad.length, 'tour planner layout: ' + bad.join(', '));
    await page.evaluate(() => { GG.ui.closeAll(); GG.state.tour.homesick = 72; GG.main.sync(); });
    await tap(page, 'btn-primary'); await waitScreen(page, 'plan');
    c.ok(await count(page, 'plan-forced') === 1 && /Rest/.test(await text(page, 'plan-slot-0')), 'too homesick: slot 1 is a locked rest');
    await tap(page, 'plan-slot-0');
    c.ok(/Rest/.test(await text(page, 'plan-slot-0')), 'the locked rest stays');
    await tap(page, 'act-promote'); await tap(page, 'act-rehearse');
    await page.evaluate(() => { GG.state.tour.homesick = 20; });
    await tap(page, 'btn-go');

    // The van abroad.
    await page.waitForFunction(() => ['results', 'van'].includes(GG.debug('ui').screen), null, { timeout: 15000 });
    if (await screen(page) === 'results') { if (await page.locator(tid('btn-results-skip')).isVisible()) await tap(page, 'btn-results-skip'); await tap(page, 'btn-results-ok'); }
    await waitScreen(page, 'van', 15000);
    c.ok(/tiny European van/.test(await text(page, 'van-rental')) && /sardines/.test(await text(page, 'van-rental')), 'van header: the rental, packed like sardines');
    const vi = await page.evaluate(() => GG.render.van && GG.render.van.info ? GG.render.van.info() : {});
    c.ok(vi.region === 'uk_europe' && vi.look === 'sardine', '3D van abroad: ' + vi.region + ' / ' + vi.look);
    await page.waitForTimeout(1500);
    if (await screen(page) === 'road') await page.waitForTimeout(10);
    await shot(page, 'van_abroad.png');
    await page.evaluate(() => { GG.ui.closeAll(); GG.career.finishGig(GG.state, null); GG.main.sync(); GG.main.wrapWeek(); });
    await waitScreen(page, 'wrap');
    c.ok(await count(page, 'wrap-tour') === 1 && await count(page, 'wrap-homesick') === 1, 'wrap: on tour + homesick bar');
    bad = await audit(page); c.ok(!bad.length, 'tour wrap layout: ' + bad.join(', '));
    await page.waitForTimeout(250); await shot(page, 'wrap_tour.png');

    // Berlin by bot, then Prague: an open date → the regional board.
    await page.evaluate(() => { GG.ui.closeAll(); GG.career.botWeek(GG.state, 'good'); GG.main.sync(); GG.main.beginWeek(); });
    await toPlan(page);
    c.ok(await page.evaluate(() => GG.tour.here(GG.state) === 'prague' && !GG.state.gig), 'Prague: an open date');
    await tap(page, 'btn-primary'); await waitScreen(page, 'plan');
    await tap(page, 'act-rest'); await tap(page, 'act-promote'); await tap(page, 'act-rehearse');
    await tap(page, 'btn-go');
    await waitScreen(page, 'board');
    c.ok(/board/i.test(await page.locator('.full h2, .sheet h2').last().textContent()) && await page.evaluate(() => GG.world.board(GG.state).every(l => l.tour)), 'Go opens the regional board');
    await tap(page, 'board-tab-map');
    await page.waitForSelector(tid('board-map'));
    c.ok(await count(page, 'city-pin-prague') === 1 && await count(page, 'city-pin-saskatoon') === 0, 'the board map is the region');
    bad = await audit(page); c.ok(!bad.length, 'tour board layout: ' + bad.join(', '));
    await tap(page, 'board-tab-list');
    const pick = await page.evaluate(() => GG.world.board(GG.state).find(l => GG.world.canBook(GG.state, l)));
    await tap(page, 'book-' + pick.id);
    await waitScreen(page, 'confirm'); await tap(page, 'btn-confirm-yes');
    await gigToWrap(page);
    c.ok(await page.evaluate(() => GG.state.lastGig && GG.state.lastGig.region === 'uk_europe'), 'the open date played a regional club');

    // Paris, the last stop → home.
    await tap(page, 'btn-next-week');
    await toPlan(page);
    await tap(page, 'btn-primary'); await waitScreen(page, 'plan');
    await tap(page, 'act-rest'); await tap(page, 'act-rest'); await tap(page, 'act-rest');
    await tap(page, 'btn-go');
    await gigToWrap(page);
    await waitScreen(page, 'tour-home', 10000);
    c.ok(/Home/.test(await page.locator('.sheet').last().textContent()) && await count(page, 'wrap-home') === 1, 'homecoming sheet + wrap-home');
    bad = await audit(page); c.ok(!bad.length, 'homecoming layout: ' + bad.join(', '));
    await tap(page, 'btn-home-ok');
    await waitScreen(page, 'wrap');
    c.ok(await page.evaluate(() => !GG.tour.active(GG.state) && GG.state.tour.history.length === 1), 'home, one tour in the history');

    // Festival stage + the polite Japanese crowd.
    await page.evaluate(() => { GG.ui.closeAll(); GG.render.setScene('stage'); });
    await page.evaluate(() => GG.render.stage.setup({ venue: { venueId: 'mudstonbury_fest', name: 'Mudstonbury', kind: 'club', capacity: 60000, festival: true }, crowd: 60000, capacity: 60000, genre: 'metal', members: GG.state.members, flags: { cape: 'velvet' } }));
    await page.waitForTimeout(400);
    let si = await page.evaluate(() => GG.render.stage.info());
    c.ok(si.kind === 'festival' && si.dress === 'mud', 'Mudstonbury: festival stage, mud');
    await page.evaluate(() => GG.render.stage.setCrowdLevel(85, true));
    await bareUi(page, true); await page.waitForTimeout(700); await shot(page, 'stage_festival.png'); await bareUi(page, false);
    await page.evaluate(() => GG.render.stage.setup({ venue: { venueId: 'budokhan', name: 'Budokhan Hall', kind: 'club', capacity: 14000, hall: true, silent: true }, crowd: 14000, capacity: 14000, genre: 'metal', members: GG.state.members }));
    await page.waitForTimeout(400);
    si = await page.evaluate(() => GG.render.stage.info());
    c.ok(si.kind === 'hall' && si.silent && !si.bowing, 'Budokhan: the hall, a silent crowd');
    c.ok(await page.evaluate(() => GG.render.stage.moment('applause')), 'the song ends: applause');
    await page.waitForFunction(() => GG.render.stage.info().bowing, null, { timeout: 3000 });
    await bareUi(page, true); await page.waitForTimeout(2300); await shot(page, 'stage_japan.png'); await bareUi(page, false);
    c.ok(await page.evaluate(() => GG.render.stage.info().bowing), 'they clap, then bow');
    await page.waitForFunction(() => !GG.render.stage.info().bowing, null, { timeout: 20000 });
    c.ok(true, 'and stand still again');
    await page.evaluate(() => GG.render.setScene('garage'));
    c.ok(!errors.length, 'no console errors: ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'tour threw: ' + e.message); console.log(errors.slice(0, 5).join('\n')); }
  await close(); c.done();
}

/* ---- gong -------------------------------------------------------------------------------------------------------- */
async function gong() {
  const c = checker('gong');
  const { page, errors, close } = await open();
  try {
    await worldCareer(page, { seed: 909, tw: 22 + 24 * 5 });
    // A seed that wins (the envelope is seeded), a broken region = nominated; the moose album went platinum this week.
    const seed = await page.evaluate(() => {
      const s = GG.state;
      Object.assign(s.tour.regions.japan, { unlocked: true, broken: s.totalWeek - 5, fans: 6000 });
      Object.assign(s.tour.regions.uk_europe, { broken: s.totalWeek - 9, fans: 9000 });
      for (let k = 1; k < 80; k++) { const x = JSON.parse(JSON.stringify(s)); x.seed = k; const r = GG.tour.runGong(x); if (r && r.won) { s.seed = k; return k; } }
      return null;
    });
    c.ok(seed, 'a winning seed: ' + seed);
    await page.evaluate(() => { const s = GG.state; s.phase = 'wrap'; s.flags.mooseAlbum = 'finland'; GG.main.sync(); GG.emit('tour:moose', {}); GG.main.wrapWeek(); });
    await waitScreen(page, 'gong');
    c.ok(await page.locator(tid('gong-phase')).getAttribute('data-phase') === 'carpet', 'the red carpet');
    const gi = await page.evaluate(() => ({ dbg: GG.debug('tourui').gong, sign: GG.render.carpet && GG.render.carpet.info ? GG.render.carpet.info().sign : null }));
    c.ok(!gi.dbg.threeD || gi.sign === 'The Global Gong', 'the marquee reads The Global Gong (3D: ' + gi.dbg.threeD + ')');
    let bad = await audit(page); c.ok(!bad.length, 'gong carpet layout: ' + bad.join(', '));
    for (let i = 0; i < 6 && await page.locator(tid('gong-phase')).getAttribute('data-phase') === 'carpet'; i++) await tap(page, 'btn-gong-next');
    c.ok(await page.locator(tid('gong-phase')).getAttribute('data-phase') === 'show', 'inside');
    await tap(page, 'btn-gong-envelope');
    await page.waitForSelector(tid('gong-winner'));
    c.ok(await page.locator(tid('gong-winner')).getAttribute('data-won') === '1', 'the Global Gong goes to the band');
    await page.waitForTimeout(900); await shot(page, 'gong.png');
    const f0 = await page.evaluate(() => GG.state.fans);
    await tap(page, 'btn-gong-speech'); await waitScreen(page, 'loonie-card');
    await tap(page, 'loonie-choice-0'); await tap(page, 'btn-loonie-card-ok');
    await waitScreen(page, 'gong');
    c.ok(await page.evaluate(f => GG.state.fans > f, f0), 'the speech lands');
    await tap(page, 'btn-gong-next');
    await page.waitForSelector(tid('gong-summary'));
    bad = await audit(page); c.ok(!bad.length, 'gong summary layout: ' + bad.join(', '));
    await tap(page, 'btn-gong-done');
    await waitScreen(page, 'moose-opera', 8000);
    c.ok(await page.evaluate(() => GG.state.trophies.some(t => t.kind === 'gong')), 'the Gong is on the trophy shelf');
    c.ok(/Platinum in Finland/.test(await page.locator('.full.tworld').last().textContent()), 'the Moose Opera moment after the wrap');
    bad = await audit(page); c.ok(!bad.length, 'moose layout: ' + bad.join(', '));
    await page.waitForTimeout(300); await shot(page, 'moose.png');
    await tap(page, 'btn-moose-ok');
    await waitScreen(page, 'wrap');
    c.ok(await page.locator(tid('wrap-gong')).count() === 1 && /won the Global Gong/.test(await text(page, 'wrap-gong')), 'the wrap shows the Gong');
    c.ok(!errors.length, 'no console errors: ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'gong threw: ' + e.message); console.log(errors.slice(0, 5).join('\n')); }
  await close(); c.done();
}

/* ---- payoff (v0.9, owner Q3): another band's World payoff (the sim's 'tour:payoff') plays after the wrap opens ---------
   Frost Heave in the World era: tour:payoff → the wrap → the payoff screen (their genre's stage, the package's name or the
   neutral line, nobody else's people) → back to the wrap. Screenshot payoff.png. */
async function payoff() {
  const c = checker('payoff');
  const { page, errors, close } = await open();
  try {
    await worldCareer(page, { bandId: 'frost_heave', tw: 129 });
    const pk = await page.evaluate(() => {
      const s = GG.state, p = (GG.tour.content().packages || []).filter(x => x.needs && x.needs !== 'moose')[0] || GG.tour.content().packages[0];
      s.phase = 'wrap'; GG.main.sync(); GG.emit('tour:payoff', { packageId: p.id, flag: 'testPayoff' }); GG.main.wrapWeek();
      return { id: p.id, name: p.name, band: s.bandId };
    });
    await waitScreen(page, 'tour-payoff', 8000);
    const r = await page.evaluate(() => ({ pkg: document.querySelector('[data-testid="tour-payoff"]').dataset.pkg, cls: document.querySelector('[data-testid="tour-payoff"]').className,
      txt: document.querySelector('.full.tworld').textContent }));
    c.ok(pk.band === 'frost_heave' && r.pkg === pk.id && /po-punk/.test(r.cls) && r.txt.includes('🧷'), 'the payoff screen: ' + pk.id + ', the punk stage ' + r.cls);
    c.ok(!/Marcel|Kenji|Dana|Jaxon|moose|Moose/.test(r.txt), 'nobody else\'s people or moose: ' + r.txt.slice(0, 160));
    const bad = await audit(page); c.ok(!bad.length, 'payoff layout: ' + bad.join(', '));
    await page.waitForTimeout(900); await shot(page, 'payoff.png');
    await tap(page, 'btn-payoff-ok');
    await waitScreen(page, 'wrap');
    c.ok(await page.evaluate(() => GG.debug('tourui').payoffDue === null), 'the payoff played once');
    c.ok(!errors.length, 'no console errors: ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'payoff threw: ' + e.message); console.log(errors.slice(0, 5).join('\n')); }
  await close(); c.done();
}

/* ---- the contact sheet ------------------------------------------------------------------------------------------- */
async function sheet() {
  const names = [['world_map', 'World map'], ['region_map', 'Region map'], ['tour_pkg', 'Tour package'], ['van_abroad', 'Van abroad'],
    ['stage_festival', 'Festival stage'], ['stage_japan', 'Japanese crowd'], ['gong', 'Global Gong'], ['moose', 'Moose Opera']];
  const have = names.filter(n => fs.existsSync(path.join(CACHE, n[0] + '.png')));
  if (have.length < names.length) { console.log('sheet: missing ' + names.filter(n => !have.includes(n)).map(n => n[0]).join(',')); return; }
  const { browser, page, close } = await open({ noGoto: true });
  void browser;
  await page.setViewportSize({ width: 1600, height: 1740 });
  const html = '<body style="margin:0;background:#111;color:#eee;font:700 18px sans-serif;display:grid;grid-template-columns:repeat(4,390px);gap:10px;padding:10px">' +
    have.map(n => '<div><div style="padding:4px 0">' + n[1] + '</div><img style="width:390px;height:844px;display:block" src="file://' + path.join(CACHE, n[0] + '.png') + '"></div>').join('') + '</body>';
  const f = path.join(CACHE, 'v07_sheet.html'); fs.writeFileSync(f, html);
  await page.goto('file://' + f); await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(CACHE, 'v07_sheet.png'), fullPage: true });
  console.log('sheet: tests/.cache/v07_sheet.png');
  await close();
}

(async () => {
  fs.mkdirSync(CACHE, { recursive: true });
  if (want('map')) await map();
  if (want('tour')) await tour();
  if (want('gong')) await gong();
  if (want('payoff')) await payoff();   // v0.9
  if (!ONLY.length || ONLY.includes('sheet')) await sheet();
})();
