// pw_shop.js: the v0.8 "Kit" shop UI (SHOPUI, lane A stage 2) on a 390x844 phone viewport.
// Sections (META_ONLY=gear|merch|space|van|sheet, comma-separated; default all + the contact sheet). Each fits `timeout 500`.
//   gear : the kit hotspot (sketch pad) → 🛒 Drum shop: kit tiers (the pro kit waits for Local Heroes, the why shows), toms →
//          lane 5, ride → lane 6 (needs the toms first), the pedal, the pawn-shop kit (GG.audio.kitQuality 1); each buy is
//          heard (GG.audio.hit on the new lane); the open grid grows to 6 lanes; Outro / Solo tabs ("+Solo" → Add → the
//          off-beat cells dim), arrangement presets keep the extras, the tools take one out; the guided Write gets Solo +
//          Outro steps (8 steps); a 6-lane gig: 6 highway lanes ≥ 60px each, keys G / H hit toms / ride. Screenshots
//          shop_gear.png, shop_seq.png, shop_gig6.png.
//   merch: the merch hotspot → the merch table: toggles, the price stepper (clamped to the range), Buy N boxes (the first
//          shirt order comes back misprinted: the tease + the pending panel), the van haul / pile / estimate; the gig board's
//          merch estimate; an autoplay gig → results with the merch table; Monday's HALE DAMAGE card (box them) → the chip;
//          8 weeks + 300 fans later the wrap plays the collector's-item moment once; the box pile grows in the garage.
//          Screenshots shop_merch.png, shop_gigres.png, shop_collector.png, shop_pile.png.
//   space: the garage door → Space tab: a garage upgrade, move to the jam room (confirm), its upgrades (the disco ball
//          spins), the 3D room per tier 0..3 with upgrades + the box pile (render debug space), the wrap's rent line, the
//          laptop's rent, eviction after rent arrears (wrap-evicted). Screenshots shop_door_space.png, shop_space_<0..3>.png.
//   van  : the garage door → Van tab: the van-side view with venue stickers (a banned one crossed out), rename, a van
//          upgrade (+1 box), merch space in boxes; Car lot: quote + trade-in → buy the 15-passenger (the name, stickers
//          kept); the 3D van scene per tier (minivan / 15-passenger / sprinter / tour bus) with stickers; a real trip rides in
//          the band's tier. Screenshots shop_van.png, shop_van3d_<0..3>.png.
//   sheet: tiles the screenshots into tests/.cache/v08_shop_sheet.png.
// Run: node build.js && META_ONLY=gear timeout 500 node tests/pw_shop.js
const path = require('path'), fs = require('fs');
const { open, checker } = require('./_pw440_scratch');
const CACHE = path.join(__dirname, '.cache');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);
const SHOTS = !process.env.PW_NO_SHOTS;

const tid = id => `[data-testid="${id}"]`;
const tap = (page, id) => page.locator(tid(id)).last().click();
const count = (page, id) => page.locator(tid(id)).count();
const text = (page, id) => page.locator(tid(id)).last().textContent();
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });
const shot = (page, name, o) => SHOTS ? page.screenshot(Object.assign({ path: path.join(CACHE, name) }, o || {})) : null;
const bareUi = (page, on) => page.evaluate(on => { ['hud', 'screens', 'toast'].forEach(id => { const e = document.getElementById(id); if (e) e.style.visibility = on ? 'hidden' : ''; }); }, on);

function audit(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const cs = getComputedStyle(e); return cs.visibility === 'hidden' || cs.display === 'none' ? null : r; };
    const name = e => (e.dataset && e.dataset.testid || e.className && e.className.baseVal == null && e.className || e.tagName) + '';
    for (const e of document.querySelectorAll('#screens *')) { const r = vis(e); if (r && (r.right > W + 1 || r.left < -1)) bad.push('overflow ' + name(e) + ' ' + Math.round(r.left) + '..' + Math.round(r.right)); }
    for (const sc of document.querySelectorAll('.sheet-body, .full-body, .seq-main')) if (sc.scrollWidth > sc.clientWidth + 1) bad.push('hscroll ' + sc.className);
    for (const b of document.querySelectorAll('#screens button')) { const r = vis(b); if (r && !b.closest('[hidden]') && (r.width < 43.5 || r.height < 43.5)) bad.push('small ' + name(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
    return bad.slice(0, 8);
  });
}
async function boot(page, seed, extra) {
  await page.waitForSelector(tid('btn-new'), { timeout: 20000 });
  await page.evaluate(([seed, extra]) => {
    GG.main.quickStart({ seed, openCard: false });
    GG.ui.closeAll();
    const s = GG.state; s.card = null; s.phase = 'plan';
    Object.assign(s, extra || {});
    if (s.era !== 'garage') { s.protected = false; if (!s.eraHistory.some(x => x.era === s.era)) s.eraHistory.push({ era: 'local', week: 1 }); }
    window.__hits = []; const h0 = GG.audio.hit;
    GG.audio.hit = function (l) { window.__hits.push(l); return h0.apply(this, arguments); };
    GG.main.sync();
  }, [seed, extra || null]);
}
// Plays the current plan through to the wrap screen (the gig, if any, on autoplay).
async function toWrap(page) {
  await page.evaluate(() => {
    const s = GG.state; GG.ui.closeAll(); GG.ui.gigAutoplay = true;
    s.phase = 'plan'; s.card = s.card || null; s.gig = null; s.offer = null;
    GG.career.setPlan(s, ['rest', 'rest', 'rest']);
    GG.career.runWeek(s, { autoGig: true });
    GG.main.wrapWeek();
  });
  await waitScreen(page, 'wrap');
}

/* ---- gear -------------------------------------------------------------------------------------------------------- */
async function gear() {
  const c = checker('gear');
  const { page, errors, close } = await open();
  try {
    await boot(page, 808, { fund: 20000 });
    await page.evaluate(() => GG.emit('hotspot', { action: 'kit' }));
    await waitScreen(page, 'seq');
    const s0 = await page.evaluate(() => ({ mode: GG.debug('seq').mode, lanes: document.querySelectorAll('.seq-grid .lh').length, shop: !!document.querySelector('[data-testid="btn-kit-shop"]') }));
    c.ok(s0.mode === 'sketch' && s0.lanes === 4 && s0.shop, 'the kit opens the sketch pad (4 lanes) with a 🛒 Drum shop button ' + JSON.stringify(s0));
    await tap(page, 'btn-kit-shop'); await waitScreen(page, 'gear');
    const g0 = await page.evaluate(() => {
      const q = s => document.querySelector('[data-testid="' + s + '"]');
      return { tiers: document.querySelectorAll('[data-testid^="gear-kit-"]').length, now: q('gear-now').textContent,
        pro: q('gear-buy-kit-2') && q('gear-buy-kit-2').disabled, proWhy: q('gear-why-kit-2') && q('gear-why-kit-2').textContent,
        ride: q('gear-buy-ride').disabled, rideWhy: q('gear-why-ride') && q('gear-why-ride').textContent, toms: !q('gear-buy-toms').disabled,
        sections: !!q('gear-section-outro') && !!q('gear-section-solo'), gong: /gong/i.test(document.querySelector('.sheet.shop').textContent.replace(/The Global Gong|Global Gong/g, '')) };
    });
    c.ok(g0.tiers === 4 && /Milk Crate/.test(g0.now), 'drum shop: 4 kit tiers, the milk crate on the riser');
    c.ok(g0.pro && /one kit at a time|Local Heroes/i.test(g0.proWhy || ''), 'the pro kit is disabled with its why: ' + g0.proWhy);
    c.ok(g0.ride && /tom/i.test(g0.rideWhy || '') && g0.toms, 'the ride needs the toms first: ' + g0.rideWhy);
    c.ok(g0.sections, 'Outro / Solo rows');
    c.ok(!/\bgong\b/i.test(await page.evaluate(() => JSON.stringify(GG.shop.gearItems(GG.state)) + JSON.stringify(GG.shop.kitTiers(GG.state)))), 'no gong on the drum kit, ever');
    c.ok((await audit(page)).length === 0, 'drum shop layout ' + (await audit(page)).join('; '));
    const f0 = await page.evaluate(() => GG.state.fund);
    await tap(page, 'gear-buy-toms');
    await page.waitForFunction(() => window.__hits.includes('toms'), null, { timeout: 4000 }).catch(() => {});
    const t1 = await page.evaluate(() => ({ lanes: GG.state.gear.lanes, owned: GG.state.gear.owned.slice(), fund: GG.state.fund, hits: window.__hits.slice(), ride: !document.querySelector('[data-testid="gear-buy-ride"]').disabled }));
    c.ok(t1.lanes === 5 && t1.owned.includes('toms') && t1.fund === f0 - 450 && t1.ride, 'toms: lane 5, −$450, the ride opens up ' + JSON.stringify(t1));
    c.ok(t1.hits.includes('toms'), 'the new toms are heard (GG.audio.hit toms)');
    await page.evaluate(() => { GG.ui.clearToasts(); document.querySelector('.sheet.shop .sheet-body').scrollTop = 0; }); await page.waitForTimeout(400);
    await shot(page, 'shop_gear.png');
    await tap(page, 'gear-buy-ride');
    await page.waitForFunction(() => window.__hits.includes('ride'), null, { timeout: 4000 }).catch(() => {});
    await tap(page, 'gear-buy-pedal');
    await tap(page, 'gear-buy-kit-1');
    await page.waitForTimeout(1300);
    const t2 = await page.evaluate(() => ({ g: GG.state.gear, q: GG.audio.kitQuality ? GG.audio.kitQuality() : null, hits: window.__hits.slice(), kit: document.querySelector('[data-testid="gear-now"]').textContent }));
    c.ok(t2.g.lanes === 6 && t2.g.doubleKick && t2.g.quality === 1 && t2.q === 1, 'ride (lane 6), the pedal, the pawn-shop kit (audio quality 1) ' + JSON.stringify(t2.g));
    c.ok(t2.hits.includes('ride') && t2.hits.filter(h => h === 'kick').length >= 4 && /Pawn Shop/.test(t2.kit), 'ride / pedal / kit heard, the riser shows the pawn-shop kit');
    await tap(page, 'btn-gear-done'); await waitScreen(page, 'seq');
    const s1 = await page.evaluate(() => ({ lanes: document.querySelectorAll('.seq-grid .lh').length, toms: !!document.querySelector('[data-testid="cell-toms-0"]'), ride: !!document.querySelector('[data-testid="cell-ride-0"]') }));
    c.ok(s1.lanes === 6 && s1.toms && s1.ride, 'the sketch pad grew to 6 lanes ' + JSON.stringify(s1));
    await tap(page, 'cell-ride-4');
    c.ok(await page.evaluate(() => GG.state.draft && GG.state.draft.lanes === 6 && GG.state.draft.sections.verse[5][4] === 'x'), 'a ride hit lands in state.draft (lane 6)');
    // Outro + Solo tabs
    await page.evaluate(() => { GG.shop.unlockSection(GG.state, 'outro'); GG.shop.unlockSection(GG.state, 'solo'); GG.ui.get('seq').rerender(); });
    const tabs = await page.evaluate(() => [...document.querySelectorAll('.seq-tabs .tab')].map(t => t.textContent));
    c.ok(tabs.join(',') === 'Verse,Chorus,Bridge,+Solo,+Outro,Song', 'section tabs: ' + tabs.join(','));
    await tap(page, 'seq-tab-solo');
    c.ok(await count(page, 'seq-extra-solo') === 1, 'an unused Solo offers "Add"');
    await tap(page, 'seq-add-solo');
    const so = await page.evaluate(() => { const p = GG.ui.get('seq').data.pat; return { arr: p.arrangement.slice(), has: !!p.sections.solo, dim: document.querySelectorAll('.seq-grid.solo .cell.soff').length, grid: !!document.querySelector('[data-testid="seq-grid"]') }; });
    c.ok(so.has && so.grid && so.dim === 12 * 6, 'the Solo grid: off-beat cells dimmed (' + so.dim + ')');
    c.ok(so.arr.indexOf('solo') === so.arr.lastIndexOf('chorus') - 1, 'the solo sits before the last chorus: ' + so.arr.join(' '));
    await tap(page, 'seq-tab-outro'); await tap(page, 'seq-add-outro');
    await tap(page, 'seq-tab-song'); await tap(page, 'seq-arr-short');
    const ar = await page.evaluate(() => GG.ui.get('seq').data.pat.arrangement.join(' '));
    c.ok(ar === 'verse chorus verse solo chorus outro', 'Short keeps the solo + outro: ' + ar);
    c.ok(/Solo \d+/.test(await text(page, 'seq-sections')) && /Outro \d+/.test(await text(page, 'seq-sections')), 'groove by part lists Solo + Outro');
    await tap(page, 'seq-tab-solo');
    c.ok((await audit(page)).length === 0, 'sequencer with 6 tabs + 6 lanes fits ' + (await audit(page)).join('; '));
    const fit = await page.evaluate(() => { const g = document.querySelector('[data-testid="seq-grid"]'), cell = document.querySelector('[data-testid="cell-ride-0"]').getBoundingClientRect(); return { sw: g.scrollWidth, cw: g.clientWidth, w: Math.round(cell.width), h: Math.round(cell.height) }; });
    c.ok(fit.sw <= fit.cw + 1 && fit.w >= 40, '6-lane cells are thumb-sized ' + JSON.stringify(fit));
    await shot(page, 'shop_seq.png');
    await tap(page, 'btn-seq-tools'); await tap(page, 'seq-remove-solo');
    c.ok(await page.evaluate(() => { const p = GG.ui.get('seq').data.pat; return !p.sections.solo && p.arrangement.indexOf('solo') < 0 && GG.debug('seq').tab === 'song'; }), 'the tools take the solo out again');
    await tap(page, 'btn-seq-close');
    // the guided Write: Solo + Outro steps
    await page.evaluate(() => { window.__composed = false; GG.ui.composeWeek(1, () => { window.__composed = true; }); });
    await waitScreen(page, 'seq');
    c.ok(/Step 1 of 8/.test(await text(page, 'guide-step')), 'guided Write: 8 steps with Solo + Outro');
    for (let i = 0; i < 3; i++) await tap(page, 'btn-guide-next');
    c.ok(await count(page, 'guide-screen-solo') === 1, 'step 4 is the Solo');
    await tap(page, 'guide-extra-solo-yes');
    await tap(page, 'btn-guide-next');
    c.ok(await count(page, 'guide-screen-outro') === 1, 'step 5 is the Outro');
    await tap(page, 'guide-extra-outro-yes');
    await tap(page, 'btn-guide-next'); await tap(page, 'btn-guide-next');
    await tap(page, 'guide-order-epic');
    const ep = await page.evaluate(() => GG.ui.get('seq').data.pat.arrangement.join(' '));
    c.ok(/solo/.test(ep) && / outro$/.test(ep), 'the Epic order keeps them: ' + ep);
    await tap(page, 'btn-guide-next'); await tap(page, 'btn-guide-save');
    await page.waitForFunction(() => window.__composed === true, null, { timeout: 5000 });
    const ps = await page.evaluate(() => { const p = GG.state.pendingSongs[0]; return { solo: !!p.sections.solo, outro: !!p.sections.outro, lanes: p.lanes }; });
    c.ok(ps.solo && ps.outro && ps.lanes === 6, 'the saved song has 6 lanes, a solo and an outro ' + JSON.stringify(ps));
    // a 6-lane gig on a 390px phone
    await page.evaluate(() => {
      const s = GG.state; GG.ui.closeAll();
      s.songs.forEach(x => { x.pattern = GG.songs.sanitize(x.pattern, s.gear, s.genre); ['verse', 'chorus', 'bridge'].forEach(n => { const sec = x.pattern.sections[n]; sec[4] = '....x.......x...'; sec[5] = 'x...x...x...x...'; }); });
      s.gig = GG.gig.makeGig(s, 'legion_63', 'book');
      GG.ui.gigAutoplay = false; window.__done = null;
      GG.ui.playGig(s.gig, r => { window.__done = r; });
    });
    await waitScreen(page, 'gig-set');
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'count' || GG.debug('gigui').mode === 'play', null, { timeout: 6000 });
    await page.waitForTimeout(400);
    const hw = await page.evaluate(() => { const r = document.querySelector('[data-testid="gig-highway"]').getBoundingClientRect(); return { lanes: GG.debug('gigui').lanes, w: Math.round(r.width), lane: Math.round(r.width / GG.debug('gigui').lanes) }; });
    c.ok(hw.lanes === 6 && hw.lane >= 60, '6 highway lanes, ' + hw.lane + 'px each (tap targets) ' + JSON.stringify(hw));
    await page.evaluate(() => { window.__hits.length = 0; });
    await page.keyboard.press('g'); await page.keyboard.press('h');
    c.ok(await page.evaluate(() => window.__hits.includes('toms') && window.__hits.includes('ride')), 'keys G / H hit the toms and the ride');
    await page.waitForFunction(() => GG.debug('gigui').songT > 1.2, null, { timeout: 8000 }).catch(() => {});
    await shot(page, 'shop_gig6.png');
    await page.evaluate(() => { GG.ui.close('gig'); GG.ui.closeAll(); });
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'gear threw: ' + (e.stack || e)); }
  await close(); c.done();
}

/* ---- merch ------------------------------------------------------------------------------------------------------- */
async function merch() {
  const c = checker('merch');
  const { page, errors, close } = await open();
  try {
    await boot(page, 909, { fund: 3000, totalWeek: 6, week: 6 });
    await page.evaluate(() => GG.emit('hotspot', { action: 'merch' }));
    await waitScreen(page, 'merch');
    const m0 = await page.evaluate(() => {
      const q = s => document.querySelector('[data-testid="' + s + '"]');
      return { haul: !!q('merch-haul'), pile: !!q('merch-pile'), est: !!q('merch-est'), last: !!q('merch-last'), shirt: !!q('merch-item-shirt'),
        longsleeve: !!q('merch-item-longsleeve'), hoodieLocked: q('merch-item-hoodie') && q('merch-item-hoodie').classList.contains('locked'), price: q('merch-price-shirt').dataset.value };
    });
    c.ok(m0.haul && m0.pile && m0.est && m0.last, 'merch table: van haul, pile, estimate, last gig');
    c.ok(m0.shirt && m0.longsleeve && m0.hoodieLocked && m0.price === '20', 'items: metal basics open, hoodies locked, shirts $20 ' + JSON.stringify(m0));
    await tap(page, 'merch-toggle-sticker');
    c.ok(await page.evaluate(() => GG.state.merch.table.includes('sticker')), 'toggle puts stickers on the table');
    await tap(page, 'merch-toggle-sticker');
    c.ok(await page.evaluate(() => !GG.state.merch.table.includes('sticker')), 'toggle takes them off');
    await tap(page, 'merch-toggle-sticker');
    await tap(page, 'merch-price-up-shirt');
    c.ok(await page.evaluate(() => GG.state.merch.price.shirt) === 22, 'price + ($2 steps)');
    for (let i = 0; i < 12 && await page.evaluate(() => !document.querySelector('[data-testid="merch-price-down-shirt"]').disabled); i++) await tap(page, 'merch-price-down-shirt');
    const pr = await page.evaluate(() => ({ p: GG.shop.priceOf(GG.state, 'shirt'), lo: GG.shop.priceRange(GG.state, 'shirt')[0], dis: document.querySelector('[data-testid="merch-price-down-shirt"]').disabled }));
    c.ok(pr.p === pr.lo && pr.dis, 'the price stops at the bottom of its range ' + JSON.stringify(pr));
    await page.evaluate(() => GG.shop.setPrice(GG.state, 'shirt', 20));
    await tap(page, 'merch-n-up-shirt');
    const f0 = await page.evaluate(() => GG.state.fund);
    await tap(page, 'merch-buy-shirt');
    const b1 = await page.evaluate(() => ({ fund: GG.state.fund, mp: GG.state.merch.misprint, stock: GG.state.merch.stock.shirt, tease: GG.debug('shopui').misprintTease, panel: document.querySelector('[data-testid="merch-misprint"]') && document.querySelector('[data-testid="merch-misprint"]').dataset.status }));
    c.ok(b1.fund === f0 - 384 && b1.mp && b1.mp.status === 'pending', 'Buy 2 boxes of shirts: −$384, the first order comes back misprinted ' + JSON.stringify(b1));
    c.ok(b1.tease === 1 && b1.panel === 'pending', 'the misprint is teased for Monday');
    await tap(page, 'merch-buy-sticker');
    const h = await page.evaluate(() => GG.shop.merchView(GG.state));
    const hauled = await page.evaluate(() => document.querySelector('[data-testid="merch-haul"]').textContent);
    c.ok(h.haul.space === 3 && h.haul.boxes === 1 && h.pile.boxes === 2 && /1 \/ 3/.test(hauled) && h.pile.items.some(x => x.misprint), 'the van hauls 1 of its 3 boxes (the shirts are all misprints), 2 boxes at home ' + JSON.stringify([h.haul, h.pile.boxes]));
    c.ok((await audit(page)).length === 0, 'merch layout ' + (await audit(page)).join('; '));
    await page.evaluate(() => { GG.ui.clearToasts(); document.querySelector('.sheet-body').scrollTop = 0; }); await page.waitForTimeout(400);
    await shot(page, 'shop_merch.png');
    await tap(page, 'btn-merch-done');
    // the gig board estimates the merch table
    await page.evaluate(() => GG.ui.openBoard({ mode: 'view' }));
    await waitScreen(page, 'board');
    c.ok(await count(page, 'board-merch') >= 1, 'gig board flyers show a merch estimate');
    await tap(page, 'btn-board-close');
    // a gig with the merch table (autoplay) → results
    await page.evaluate(() => { const s = GG.state; s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); GG.ui.gigAutoplay = true; window.__done = null; GG.ui.playGig(s.gig, r => { window.__done = r; }); });
    await waitScreen(page, 'gig-results', 20000);
    const gr = await page.evaluate(() => ({ el: !!document.querySelector('[data-testid="gig-merch"]'), txt: (document.querySelector('[data-testid="gig-merch"]') || {}).textContent || '', merch: GG.state.lastGig ? null : null, last: GG.state.merch.last }));
    c.ok(gr.el && /Merch table/.test(gr.txt) && gr.last && gr.last.boxes === 1, 'gig results show the merch table ' + gr.txt);
    c.ok(await page.evaluate(() => [...document.querySelectorAll('.full.gigres p')].every(p => !/^Merch table: /.test(p.textContent))), 'the merch line is folded into the panel (no duplicate)');
    await shot(page, 'shop_gigres.png');
    await tap(page, 'btn-gig-done');
    // Monday: HALE DAMAGE → box them
    await page.evaluate(() => { const s = GG.state; GG.ui.closeAll(); s.phase = 'monday'; s.card = null; s.totalWeek = 9; s.week = 9; s.gig = null; GG.main.beginWeek(); });
    await waitScreen(page, 'card');
    c.ok(/HALE DAMAGE/.test(await page.textContent('.card-title')), 'Monday: the misprint card');
    await tap(page, 'choice-0');
    c.ok(/Misprints: boxed/.test(await page.textContent('.sheet .chips')) && await page.evaluate(() => GG.state.merch.misprint.status === 'boxed'), 'boxed: the shop chip on the outcome');
    await tap(page, 'btn-card-ok');
    // 8 weeks + 300 fans later: the collector's item, once
    await page.evaluate(() => { const s = GG.state; s.merch.misprint.week = s.totalWeek - 9; s.fans = 420; });
    await toWrap(page);
    await waitScreen(page, 'shop-collector', 6000);
    const col = await page.evaluate(() => ({ price: document.querySelector('[data-testid="collector-price"]').textContent, mp: GG.state.merch.misprint.status, table: GG.state.merch.table.slice(), stock: GG.state.merch.stock.misprint, units: GG.state.merch.misprint.units }));
    c.ok(col.mp === 'collector' && col.price === '$60' && col.table[0] === 'misprint' && col.stock > 0 && col.stock === col.units, 'the collector moment: $60, the misprints lead the table ' + JSON.stringify(col));
    await page.waitForTimeout(2300);
    await shot(page, 'shop_collector.png');
    c.ok((await audit(page)).length === 0, 'collector layout ' + (await audit(page)).join('; '));
    await tap(page, 'btn-collector-ok');
    await waitScreen(page, 'wrap');
    c.ok(await count(page, 'wrap-collector') === 1, 'the wrap lists the collector\'s item');
    await page.evaluate(() => { GG.ui.close('wrap'); GG.ui.show('wrap', { wrap: GG.state.wrap }); });
    await page.waitForTimeout(700);
    c.ok(await page.evaluate(() => GG.debug('ui').screen === 'wrap' && GG.debug('shopui').collector === 1), 'the moment plays once');
    // the box pile grows in the garage
    await page.evaluate(() => { GG.ui.closeAll(); const s = GG.state; s.merch.stock.shirt = 24 * 6; s.merch.stock.sticker = 200 * 4; s.merch.stock.patch = 100 * 3; GG.main.sync(); });
    await page.waitForTimeout(600);
    const pl = await page.evaluate(() => ({ boxes: GG.shop.pile(GG.state).boxes, r: GG.debug('render').space }));
    c.ok(pl.r && pl.r.boxes === pl.boxes && pl.r.pile === Math.min(16, pl.boxes) && pl.boxes >= 13, 'the garage box pile: ' + pl.boxes + ' boxes, ' + (pl.r && pl.r.pile) + ' drawn');
    await page.evaluate(() => { GG.state.merch.stock.shirt = 24 * 3; GG.main.sync(); });
    await page.waitForTimeout(300);
    c.ok(await page.evaluate(() => GG.debug('render').space.pile === GG.shop.pile(GG.state).boxes), 'sold stock shrinks the pile');
    await page.evaluate(() => { const s = GG.state; s.merch.stock.shirt = 24 * 6; GG.main.sync(); });
    await page.waitForTimeout(800);
    await bareUi(page, true); await shot(page, 'shop_pile.png'); await bareUi(page, false);
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'merch threw: ' + (e.stack || e)); }
  await close(); c.done();
}

/* ---- space ------------------------------------------------------------------------------------------------------- */
const ALL_UPS = { 0: ['curb_couch', 'egg_foam', 'beer_fridge', 'xmas_lights'], 1: ['curb_couch', 'beer_fridge', 'leather_couch', 'acoustic_panels', 'real_pa', 'disco_ball'],
  2: ['curb_couch', 'beer_fridge', 'iso_booth', 'band_lounge', 'espresso', 'mood_leds'], 3: ['curb_couch', 'beer_fridge', 'catering', 'green_room', 'hot_tub', 'star_door'] };
async function space() {
  const c = checker('space');
  const { page, errors, close } = await open();
  try {
    await boot(page, 1010, { fund: 5000, era: 'local', fans: 300 });
    await page.evaluate(() => GG.emit('hotspot', { action: 'door' }));
    await waitScreen(page, 'van-info');
    await tap(page, 'door-tab-space');
    const s0 = await page.evaluate(() => { const q = s => document.querySelector('[data-testid="' + s + '"]'); return { now: q('space-now').textContent, m1: q('space-move-1') && !q('space-move-1').disabled, m2: q('space-move-2') && q('space-move-2').disabled, m2why: q('space-2').textContent }; });
    c.ok(/garage/i.test(s0.now) && s0.m1 && s0.m2 && /Signed/.test(s0.m2why), 'Space tab: the garage now, the jam room open, the pro studio waits for Signed ' + JSON.stringify(s0));
    await tap(page, 'space-up-egg_foam');
    c.ok(await page.evaluate(() => GG.state.spaceUpgrades.includes('egg_foam') && GG.debug('render').space.upgrades.includes('egg_foam')), 'egg-crate foam bought and on the wall (render)');
    await tap(page, 'space-up-beer_fridge');
    await tap(page, 'space-move-1'); await waitScreen(page, 'confirm'); await tap(page, 'btn-confirm-yes');
    await page.waitForFunction(() => GG.state.spaceTier === 1, null, { timeout: 4000 });
    await page.waitForTimeout(300);
    const m1 = await page.evaluate(() => ({ tier: GG.state.spaceTier, ups: GG.state.spaceUpgrades.slice(), r: GG.debug('render').space, now: document.querySelector('[data-testid="space-now"]').textContent }));
    c.ok(m1.tier === 1 && m1.r.tier === 1 && m1.r.door === 'Door' && !m1.r.garage && /Rent-A-Riff/.test(m1.now), 'moved into the jam room: the 3D room changes, the door hotspot is a door ' + JSON.stringify(m1.r));
    c.ok(m1.ups.join() === 'beer_fridge', 'the beer fridge came along, the foam stayed behind: ' + m1.ups.join());
    await tap(page, 'space-up-disco_ball');
    await page.waitForTimeout(200);
    c.ok(await page.evaluate(() => GG.debug('render').space.disco === true), 'the disco ball hangs (and spins)');
    c.ok((await audit(page)).length === 0, 'space tab layout ' + (await audit(page)).join('; '));
    await page.evaluate(() => { GG.ui.clearToasts(); document.querySelector('.sheet-body').scrollTop = 0; }); await page.waitForTimeout(400);
    await shot(page, 'shop_door_space.png');
    await tap(page, 'btn-close');
    // every tier in 3D with its upgrades and a box pile
    for (const t of [0, 1, 2, 3]) {
      const r = await page.evaluate(([t, ups]) => {
        const s = GG.state; s.spaceTier = t; s.space = GG.shop.spaceDef(s, t).id; s.spaceUpgrades = ups; s.merch.stock = { shirt: 24 * (3 + t * 2), sticker: 200 * 2 }; GG.main.sync();
        return GG.debug('render').space;
      }, [t, ALL_UPS[t]]);
      c.ok(r.tier === t && r.garage === (t === 0) && r.upgrades.length === ALL_UPS[t].length && r.pile >= 5, 'tier ' + t + ' in 3D: ' + JSON.stringify(r));
      await page.waitForTimeout(900);
      await bareUi(page, true); await shot(page, 'shop_space_' + t + '.png'); await bareUi(page, false);
    }
    const dc = await page.evaluate(() => GG.debug('render').drawCalls);
    c.ok(dc > 0 && dc < 60, 'draw calls with the arena backstage + upgrades < 60 (' + dc + ')');
    // rent in the wrap + the laptop
    await page.evaluate(() => { const s = GG.state; s.spaceTier = 1; s.space = 'jam_room'; s.spaceUpgrades = []; s.fund = 2000; s.rentLate = 0; GG.main.sync(); });
    await toWrap(page);
    c.ok(/Rent-A-Riff/.test(await text(page, 'wrap-rent')) && /\$60/.test(await text(page, 'wrap-rent')), 'the wrap shows the rent: ' + await text(page, 'wrap-rent'));
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('laptop', { tab: 'money' }); });
    c.ok(/\$60\/wk/.test(await text(page, 'laptop-rent')), 'the laptop Money tab shows the rent');
    // eviction
    await page.evaluate(() => { GG.ui.closeAll(); const s = GG.state; s.fund = 20; s.rentLate = 1; GG.main.sync(); });
    await toWrap(page);
    const ev = await page.evaluate(() => ({ tier: GG.state.spaceTier, ev: GG.state.wrap.shop && GG.state.wrap.shop.evicted, el: !!document.querySelector('[data-testid="wrap-evicted"]'), r: GG.debug('render').space.tier }));
    c.ok(ev.tier === 0 && ev.ev && ev.el && ev.r === 0, 'evicted: back to the garage, the wrap says so ' + JSON.stringify(ev));
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'space threw: ' + (e.stack || e)); }
  await close(); c.done();
}

/* ---- van --------------------------------------------------------------------------------------------------------- */
async function van() {
  const c = checker('van');
  const { page, errors, close } = await open();
  try {
    await boot(page, 1111, { fund: 8000, era: 'local', fans: 300 });
    await page.evaluate(() => {
      const s = GG.state;
      [['legion_63', 'Legion Hall 63'], ['bingo_palace', 'Bingo Palace'], ['st_vlads_hall', 'St. Vlad\'s Hall'], ['warman_curling_lounge', 'Curling Lounge'], ['broken_rudder', 'The Broken Rudder'], ['coffee_barn', 'Coffee Barn']]
        .forEach(v => GG.shop.sticker(s, { venueId: v[0], name: v[1] }));
      s.banned.push('bingo_palace'); GG.shop.banSticker(s, 'bingo_palace'); GG.main.sync();
      GG.emit('hotspot', { action: 'door' });
    });
    await waitScreen(page, 'van-info');
    const v0 = await page.evaluate(() => ({ side: !!document.querySelector('[data-testid="van-side"]'), n: document.querySelectorAll('[data-testid="van-sticker"]').length,
      banned: document.querySelectorAll('[data-testid="van-sticker"][data-banned="1"]').length, space: document.querySelector('[data-testid="van-space"]').textContent,
      stick: document.querySelector('[data-testid="van-stickers"]').textContent, tier: document.querySelector('[data-testid="van-side"]').dataset.tier, driver: !!document.querySelector('[data-testid="van-driver"]') }));
    c.ok(v0.side && v0.n === 6 && v0.banned === 1 && /1 crossed out/.test(v0.stick), 'the van side: 6 venue stickers, the banned one crossed out ' + JSON.stringify(v0));
    c.ok(/3 boxes/.test(v0.space) && !/\/ 5/.test(v0.space) && v0.tier === '0' && v0.driver, 'merch space in boxes (not "/ 5"), the minivan, the driver ' + v0.space);
    await page.fill(tid('van-name-input'), 'The Moose Hearse II');
    await tap(page, 'van-rename');
    c.ok(await page.evaluate(() => GG.state.van.name === 'The Moose Hearse II' && document.querySelector('[data-testid="van-side-name"]').textContent === 'The Moose Hearse II'), 'renamed (and painted on the door)');
    await tap(page, 'van-up-roof_rack');
    c.ok(await page.evaluate(() => GG.state.van.space === 4 && /4 boxes/.test(document.querySelector('[data-testid="van-space"]').textContent)), 'roof rack: 4 boxes');
    c.ok((await audit(page)).length === 0, 'van tab layout ' + (await audit(page)).join('; '));
    await page.evaluate(() => { GG.ui.clearToasts(); document.querySelector('.sheet-body').scrollTop = 0; }); await page.waitForTimeout(400);
    await shot(page, 'shop_van.png');
    await tap(page, 'door-tab-dealer');
    const d0 = await page.evaluate(() => ({ q: document.querySelector('[data-testid="van-quote-1"]').textContent, b1: !document.querySelector('[data-testid="van-buy-1"]').disabled, b2: document.querySelector('[data-testid="van-buy-2"]').disabled, sides: document.querySelectorAll('[data-testid="van-side"]').length }));
    c.ok(/trade-in/.test(d0.q) && d0.b1 && d0.b2 && d0.sides === 4, 'car lot: a quote with the trade-in; the 15-passenger now, the sprinter later ' + JSON.stringify(d0));
    c.ok((await audit(page)).length === 0, 'car lot layout ' + (await audit(page)).join('; '));
    const f0 = await page.evaluate(() => GG.state.fund), net = await page.evaluate(() => GG.shop.vanQuote(GG.state, 1).net);
    await tap(page, 'van-buy-1'); await waitScreen(page, 'confirm'); await tap(page, 'btn-confirm-yes');
    await page.waitForFunction(() => GG.state.van.tier === 1, null, { timeout: 4000 });
    const v1 = await page.evaluate(() => ({ name: GG.state.van.name, stickers: GG.state.van.stickers.length, fund: GG.state.fund, tier: document.querySelector('[data-testid="van-side"]').dataset.tier, tab: GG.ui.get('van-info').data.tab }));
    c.ok(v1.name === 'The Claim Adjuster' && v1.stickers === 6 && v1.fund === f0 - net && v1.tier === '1' && v1.tab === 'van', 'bought the 15-passenger + trailer: its Part C1 name, the stickers moved over ' + JSON.stringify(v1));
    await tap(page, 'btn-close');
    // the 3D van per tier
    for (const t of [0, 1, 2, 3]) {
      const info = await page.evaluate(t => {
        GG.render.setScene('van'); GG.render.van.setFrame({ top: 70, bottom: 240 });
        GG.render.van.setTrip({ from: 'Saskatoon', to: 'Regina', km: 240, season: 'summer', tier: t }); GG.render.van.setProgress(0.3); GG.render.setPaused(false);
        return GG.render.van.info();
      }, t);
      c.ok(info.tier === t && info.vehicle === ['minivan', 'fifteen', 'sprinter', 'bus'][t] && info.stickers === 6 && info.banned === 1, '3D tier ' + t + ': ' + info.vehicle + ', stickers ' + info.stickers + ' (banned ' + info.banned + ')');
      await page.waitForTimeout(900);
      await bareUi(page, true); await shot(page, 'shop_van3d_' + t + '.png'); await bareUi(page, false);
    }
    await page.evaluate(() => { GG.render.van.setFrame({ top: 0, bottom: -1 }); GG.render.setScene('garage'); });
    // a real trip rides in the band's own vehicle
    await page.evaluate(() => { const s = GG.state; s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); window.__vd = false; GG.ui.playVan(s.gig, () => { window.__vd = true; }); });
    await waitScreen(page, 'van');
    const trip = await page.evaluate(() => GG.render.van.info());
    c.ok(!trip.built || (trip.tier === 1 && trip.vehicle === 'fifteen'), 'the trip rides in the 15-passenger ' + trip.vehicle);
    await tap(page, 'btn-van-skip');
    await page.waitForFunction(() => window.__vd === true || GG.debug('ui').screen === 'road', null, { timeout: 10000 });
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'van threw: ' + (e.stack || e)); }
  await close(); c.done();
}

/* ---- the contact sheet ------------------------------------------------------------------------------------------- */
async function sheet() {
  const names = [['shop_gear', 'Drum shop'], ['shop_seq', 'Sequencer: 6 lanes, Solo + Outro'], ['shop_merch', 'Merch table'], ['shop_pile', 'Garage box pile'],
    ['shop_gigres', 'Gig result + merch'], ['shop_space_0', 'Space 0: parents\' garage'], ['shop_space_1', 'Space 1: jam room'], ['shop_space_2', 'Space 2: pro studio'],
    ['shop_space_3', 'Space 3: arena backstage'], ['shop_collector', 'Misprint: collector\'s item'], ['shop_van', 'Van + stickers'], ['shop_van3d_0', 'Minivan'],
    ['shop_van3d_1', '15-passenger + trailer'], ['shop_van3d_2', 'Sprinter'], ['shop_van3d_3', 'Tour bus']];
  const have = names.filter(n => fs.existsSync(path.join(CACHE, n[0] + '.png')));
  if (have.length < names.length) console.log('sheet: missing ' + names.filter(n => !have.includes(n)).map(n => n[0]).join(','));
  if (!have.length) return;
  const { page, close } = await open({ noGoto: true });
  const cols = 5, rows = Math.ceil(have.length / cols);
  await page.setViewportSize({ width: cols * 400 + 10, height: rows * 880 + 10 });
  const html = '<body style="margin:0;background:#111;color:#eee;font:700 18px sans-serif;display:grid;grid-template-columns:repeat(' + cols + ',390px);gap:10px;padding:10px">' +
    have.map(n => '<div><div style="padding:4px 0">' + n[1] + '</div><img style="width:390px;height:844px;display:block;object-fit:cover" src="file://' + path.join(CACHE, n[0] + '.png') + '"></div>').join('') + '</body>';
  const f = path.join(CACHE, 'v08_shop_sheet.html'); fs.writeFileSync(f, html);
  await page.goto('file://' + f); await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(CACHE, 'v08_shop_sheet.png'), fullPage: true });
  console.log('sheet: tests/.cache/v08_shop_sheet.png (' + have.length + ' shots)');
  await close();
}

(async () => {
  fs.mkdirSync(CACHE, { recursive: true });
  if (want('gear')) await gear();
  if (want('merch')) await merch();
  if (want('space')) await space();
  if (want('van')) await van();
  if (!ONLY.length || ONLY.includes('sheet')) await sheet();
})();
