// pw_shop.js: the v0.8 "Kit" shop UI (SHOPUI, lane A stage 2) on a 390x844 phone viewport.
// Sections (META_ONLY=gear|merch|space|van|spaces|seat|sheet, comma-separated; default all + the contact sheet). Each fits `timeout 500`.
//   gear : the kit hotspot (sketch pad) → 🛒 Drum shop: kit tiers (the pro kit waits for Local Heroes, the why shows), toms →
//          lane 5, ride → lane 6 (needs the toms first), the pedal, the pawn-shop kit (GG.audio.kitQuality 1); each buy is
//          heard (GG.audio.hit on the new lane); the open grid grows to 6 lanes; Outro / Solo tabs ("+Solo" → Add → the
//          off-beat cells dim), arrangement presets keep the extras, the ⋯ tools take one out; v1.3: the kit opens Quick song
//          (no draft; Tweak for the grid, the shop in ⋯), a Write block's Quick song uses 6 lanes + Solo + Outro; a 6-lane gig: 6 highway lanes ≥ 60px each, keys G / H hit toms / ride. Screenshots
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
//          kept); the 3D van scene per tier (minivan / 15-passenger / sprinter / tour bus) with stickers, the lower third of
//          the cabin not one flat seat-back slab (tiers 0..2); a real trip rides in the band's tier. Screenshots shop_van.png,
//          shop_van3d_<0..3>.png.
//   spaces: (v0.8 polish) Hail Damage in each rehearsal space from the normal garage camera (a few upgrades, ~10 boxes of
//          merch): every tier's room signature differs (kind, wall, floor, background, light fixture; the garage alone keeps
//          the yard + garage-only meshes; rented rooms have decals + a corridor out front; studio/arena risers lift the kit),
//          the box pile is on screen and clear of every hotspot label; the minivan / 15-passenger / sprinter / bus cabins
//          (the lower third is not one flat slab); December in the jam room + backstage. Screenshots spaces_<0..3>.png,
//          spaces_van_<0..3>.png, spaces_dec_<1,3>.png, tiled into tests/.cache/v08_spaces_sheet.png.
//   sheet: tiles the screenshots into tests/.cache/v08_shop_sheet.png.
//   button: (v1.3.1, Lane S) the sketch pad's own shop button btn-seq-shop (green-ringed 🛒 SHOP in the header, >= 44 px,
//          aria-label "Drum shop" / "Bass shop") on Quick song and in the editor, drums + bass: it stops playback and opens
//          the gear sheet; Back returns to the songwriter on the same screen; a buy from it grows the open grid (4 -> 5
//          lanes); the head (✕ · title · shop · ⋯) fits with "Sketch pad · <seat>" whole, no horizontal scroll; the ⋯ row
//          btn-kit-shop stays; no header shop in a Write block or a catalog song. Screenshot shop_button<TAG>.png.
// Run: node build.js && META_ONLY=gear timeout 500 node tests/pw_shop.js
const path = require('path'), fs = require('fs');
const { open, checker, openTools } = require('./_pw');
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
// v0.8 polish: the share of the bottom third of a screenshot taken by its single most common colour (16 levels per channel),
// decoded in the page (no PIL). A flat seat-back slab filling the lower third scores high.
function flatShare(page, png) {
  return page.evaluate(async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
    const y0 = Math.floor(img.height * 2 / 3), d = g.getImageData(0, y0, img.width, img.height - y0).data, H = {};
    let n = 0; for (let i = 0; i < d.length; i += 4) { const k = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4); H[k] = (H[k] || 0) + 1; n++; }
    return Math.round(Math.max.apply(null, Object.values(H)) / n * 100);
  }, png.toString('base64'));
}
// The box pile's screen box (from debug space.pileBox) and every hotspot label's screen box (±48 x ±13 px round its centre).
function pileVsLabels(page) {
  return page.evaluate(() => {
    const d = GG.debug('render'), B = d.space.pileBox; if (!B) return null;
    const P = []; for (const x of [B[0], B[3]]) for (const y of [B[1], B[4]]) for (const z of [B[2], B[5]]) P.push(GG.render.worldToScreen(x, y, z));
    const bb = [Math.min(...P.map(p => p.x)), Math.min(...P.map(p => p.y)), Math.max(...P.map(p => p.x)), Math.max(...P.map(p => p.y))];
    const L = d.labelAt.map(l => { const p = GG.render.worldToScreen(l.x, l.y, l.z); return [l.action, p.x - 48, p.y - 13, p.x + 48, p.y + 13]; });
    const over = L.filter(l => Math.min(bb[2], l[3]) > Math.max(bb[0], l[1]) && Math.min(bb[3], l[4]) > Math.max(bb[1], l[2])).map(l => l[0]);
    return { bb, w: bb[2] - bb[0], h: bb[3] - bb[1], over, pile: d.space.pile, boxes: d.space.boxes, W: innerWidth, H: innerHeight };
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
    GG.ui.gigAutoplay = false;   // the collector moment only plays for a person
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
    // v1.3: no draft yet -> Quick song (D10); Tweak opens the grid; the shop lives in the ⋯ menu
    c.ok(await page.evaluate(() => GG.debug('seq').screen === 'quick'), 'the kit opens the sketch pad on Quick song (no draft yet)');
    await tap(page, 'btn-quick-tweak');
    await openTools(page);
    const s0 = await page.evaluate(() => ({ mode: GG.debug('seq').mode, lanes: document.querySelectorAll('.seq-grid .lh').length, shop: !!document.querySelector('[data-testid="btn-kit-shop"]') }));
    c.ok(s0.mode === 'sketch' && s0.lanes === 4 && s0.shop, 'Tweak: the sketch pad grid (4 lanes); ⋯ has a 🛒 Drum shop row ' + JSON.stringify(s0));
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
    await openTools(page); await tap(page, 'seq-remove-solo');
    c.ok(await page.evaluate(() => { const p = GG.ui.get('seq').data.pat; return !p.sections.solo && p.arrangement.indexOf('solo') < 0 && GG.debug('seq').tab === 'song'; }), 'the tools take the solo out again');
    await tap(page, 'btn-seq-close');
    // v1.3: a Write block's Quick song uses the whole kit: 6 lanes, a Solo and an Outro (withExtras); Epic keeps them
    await page.evaluate(() => { window.__composed = false; GG.state.draft = null; GG.ui.composeWeek(1, () => { window.__composed = true; }); });
    await waitScreen(page, 'seq');
    const qk = await page.evaluate(() => ({ dbg: GG.debug('seq'), p: GG.ui.get('seq').data.pat }));
    c.ok(qk.dbg.screen === 'quick' && qk.p.lanes === 6 && qk.p.sections.solo && qk.p.sections.outro && / outro$/.test(qk.p.arrangement.join(' ')), 'Quick song with the full kit: 6 lanes, a Solo + an Outro ' + qk.p.arrangement.join(' '));
    await tap(page, 'btn-quick-tweak');
    const tabs2 = await page.evaluate(() => [...document.querySelectorAll('.seq-tabs .tab')].map(t => t.textContent));
    c.ok(tabs2.join(',') === 'Verse,Chorus,Bridge,Solo,Outro,Song', 'Tweak: the Solo + Outro tabs are in: ' + tabs2.join(','));
    await tap(page, 'seq-tab-song'); await tap(page, 'seq-arr-epic');
    const ep = await page.evaluate(() => GG.ui.get('seq').data.pat.arrangement.join(' '));
    c.ok(/solo/.test(ep) && / outro$/.test(ep), 'the Epic order keeps them: ' + ep);
    await tap(page, 'btn-seq-save');
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
    const order = () => page.evaluate(() => [...document.querySelectorAll('.merch-item')].map(e => e.dataset.testid).join(','));
    const ord0 = await order();
    await tap(page, 'merch-toggle-longsleeve');
    const ordOn = await order();
    await tap(page, 'merch-toggle-longsleeve');
    c.ok(ordOn === ord0 && await order() === ord0, '"Put it out" on a card further down keeps the order (no jump under the finger)');
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
    // A double tap on "Buy 1" of an item that isn't on the table yet: one box, of that item (the list doesn't re-sort under
    // the finger, and a second tap within 400 ms is the same tap).
    const dt0 = await page.evaluate(() => ({ fund: GG.state.fund, stock: Object.assign({}, GG.state.merch.stock), on: GG.state.merch.table.includes('longsleeve'), cost: GG.shop.stockCost(GG.state, 'longsleeve', 1) }));
    const ord1 = await order();
    await page.locator(tid('merch-buy-longsleeve')).scrollIntoViewIfNeeded();
    const bb = await page.locator(tid('merch-buy-longsleeve')).boundingBox();
    await page.mouse.dblclick(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await page.waitForTimeout(150);
    const dt1 = await page.evaluate(() => ({ fund: GG.state.fund, stock: Object.assign({}, GG.state.merch.stock), on: GG.state.merch.table.includes('longsleeve'), perBox: GG.shop.merchDef('longsleeve').perBox }));
    const others = Object.keys(Object.assign({}, dt0.stock, dt1.stock)).filter(id => id !== 'longsleeve' && (dt0.stock[id] || 0) !== (dt1.stock[id] || 0));
    c.ok(!dt0.on && dt1.on && dt1.stock.longsleeve === (dt0.stock.longsleeve || 0) + dt1.perBox && dt1.fund === dt0.fund - dt0.cost && !others.length && await order() === ord1,
      'double tap on Buy 1: one box of longsleeves, nothing else bought, same card order ' + JSON.stringify({ spent: dt0.fund - dt1.fund, cost: dt0.cost, others }));
    await page.evaluate(([f]) => { const s = GG.state; s.fund = f; s.merch.stock.longsleeve = 0; GG.shop.toggleTable(s, 'longsleeve', false); GG.main.sync(); GG.ui.get('merch').rerender(); }, [dt0.fund]);   // back as it was
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
    const whyOp = await page.evaluate(() => { let e = document.querySelector('[data-testid="space-2"] .tiny.bad'), o = 1; for (; e; e = e.parentElement) { o *= +getComputedStyle(e).opacity; if (e.classList.contains('shop-row')) break; } return o; });   // the row and what's in it (not the sheet's fade-in)
    c.ok(whyOp === 1, 'a locked row keeps its why at full strength (opacity ' + whyOp + ')');
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
      c.ok(r.tier === t && r.garage === (t === 0) && r.upgrades.length === ALL_UPS[t].length && r.pile >= 5, 'tier ' + t + ' in 3D: ' + JSON.stringify(Object.assign({}, r, { obstacles: r.obstacles.length })));
      await page.waitForTimeout(900);
      await bareUi(page, true); await shot(page, 'shop_space_' + t + '.png'); await bareUi(page, false);
    }
    const dc = await page.evaluate(() => GG.debug('render').drawCalls);
    c.ok(dc > 0 && dc < 60, 'draw calls with the arena backstage + upgrades < 60 (' + dc + ')');
    // The hot-catering table blocks where it's drawn (1.0 along the wall x 0.5 deep): its ends and middle are not walkable.
    const cat = await page.evaluate(() => { const O = GG.debug('render').space.obstacles, inside = (x, z) => O.some(o => x > o[0] && x < o[2] && z > o[1] && z < o[3]); return [[2.1, -1.6], [2.1, -0.78], [1.9, -1.2]].map(p => inside(p[0], p[1])); });
    c.ok(cat.every(Boolean), 'the catering table\'s footprint matches the table (ends + middle blocked) ' + JSON.stringify(cat));
    // The backstage sign names the band that's loaded (a different band at the same tier redraws it).
    const sg = await page.evaluate(() => { const s = GG.state, b0 = s.bandId, a = GG.debug('render').space.signText; s.bandId = 'frost_heave'; GG.main.sync(); const b = GG.debug('render').space.signText; s.bandId = b0; GG.main.sync(); return { a, b, c: GG.debug('render').space.signText }; });
    c.ok(/HAIL DAMAGE/.test(sg.a) && /FROST HEAVE/.test(sg.b) && sg.c === sg.a, 'the BAND ROOM sign follows the band ' + JSON.stringify(sg));
    // With the curb couch (and > 16 boxes: the MERCH sign), the player stands clear of both at the laptop and the merch stack.
    await page.evaluate(() => { const s = GG.state; s.merch.stock = { shirt: 24 * 18, sticker: 200 * 2 }; GG.ui.closeAll(); GG.main.sync(); });
    for (const hs of ['laptop', 'merch']) {
      await page.evaluate(h => { GG.ui.closeAll(); GG.render.goToHotspot(h); }, hs);
      await page.waitForFunction(() => { const d = GG.debug('render'); return !d.walking; }, null, { timeout: 8000 });
      const cl = await page.evaluate(() => {
        const d = GG.debug('render'), p = d.player, O = d.space.obstacles, gap = o => Math.hypot(Math.max(o[0] - p.x, 0, p.x - o[2]), Math.max(o[1] - p.z, 0, p.z - o[3]));
        const S = d.space.pileSign, couch = O.find(o => Math.abs((o[0] + o[2]) / 2 + 0.55) < 0.01 && Math.abs((o[1] + o[3]) / 2 - 2.42) < 0.01), sign = S && O.find(o => o[0] === S[0] && o[1] === S[1] && o[2] === S[2] && o[3] === S[3]);
        return { p, couch: couch ? Math.round(gap(couch) * 100) / 100 : null, sign: !!sign, min: Math.round(Math.min.apply(null, O.map(gap)) * 100) / 100, pile: d.space.pile, boxes: d.space.boxes };
      });
      c.ok(cl.couch >= 0.3 && cl.min >= 0.15 && cl.sign && cl.boxes > 16, 'at the ' + hs + ' the player stands clear of the curb couch + the MERCH sign ' + JSON.stringify(cl));
    }
    await page.evaluate(() => GG.ui.closeAll());
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
    c.ok(/Rent-A-Riff/.test(await text(page, 'wrap-rent')), 'the eviction week\'s rent names the room they left: ' + await text(page, 'wrap-rent'));
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
    // The name on the door reads on every paint (≥ 4.5:1 against the body).
    const ink = await page.evaluate(() => {
      const lum = h => { const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
      return [0, 1, 2, 3].map(t => { const e = GG.ui.vanSide(GG.state, { tier: t }), a = lum(e.querySelector('[data-testid="van-side-name"]').getAttribute('fill')), b = lum(e.querySelector('path').getAttribute('fill')); return Math.round((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) * 10) / 10; });
    });
    c.ok(ink.every(r => r >= 4.5), 'the van name contrasts with its paint on every tier ' + ink.join(', '));
    // Many long venue names: labels fit their stickers, the overflow count gets its own slot (not on top of a sticker).
    const many = await page.evaluate(() => {
      const names = ['Martensville Skatepark', 'Battlefords Bingo Barn', 'Yellowhead Inn Lounge', 'Riverbend Centennial Auditorium', 'Legion Hall 63', 'Bingo Palace', 'Coffee Barn',
        'Warman Curling Lounge', 'Prince Albert Exhibition', 'Moose Jaw Tunnels', 'Swift Current Stockade', 'Yorkton Rec Centre', 'Regina Owl', 'Saskatoon Broadway'];
      const e = GG.ui.vanSide(GG.state, { tier: 0, stickers: names.map((n, i) => ({ venueId: 'v' + i, name: n, banned: i === 2 })) });
      e.style.cssText = 'position:fixed;left:0;top:0;width:360px'; document.body.appendChild(e);
      const st = [...e.querySelectorAll('[data-testid="van-sticker"]')].map(g => ({ r: g.querySelector('rect').getBoundingClientRect(), t: g.querySelector('text').getBoundingClientRect() }));
      const m = e.querySelector('[data-testid="van-sticker-more"]'), mr = m && m.getBoundingClientRect();
      const out = { n: st.length, more: m ? m.textContent : null, spill: st.filter(x => x.t.width > x.r.width + 0.5).length,
        onTop: mr ? st.filter(x => x.r.right > mr.left + 2 && x.r.left < mr.right - 2 && x.r.bottom > mr.top + 2 && x.r.top < mr.bottom - 2).length : -1 };
      e.remove(); return out;
    });
    c.ok(many.n === 9 && many.more === '+5 more' && many.spill === 0 && many.onTop === 0, '14 stickers on the minivan: 9 shown, "+5 more" in its own slot, labels fit ' + JSON.stringify(many));
    // A 28-letter van name with no spaces: the sheet title wraps, the ✕ stays on screen.
    await page.fill(tid('van-name-input'), 'Van_McVanface_the_Destroyer');
    await tap(page, 'van-rename');
    const ln = await page.evaluate(() => { const b = document.querySelector('.sheet.shop [data-testid="btn-close"]').getBoundingClientRect(); return { right: Math.round(b.right), W: document.documentElement.clientWidth, name: GG.state.van.name }; });
    c.ok(ln.name === 'Van_McVanface_the_Destroyer' && ln.right <= ln.W, 'a long van name keeps the close button on screen ' + JSON.stringify(ln));
    c.ok((await audit(page)).length === 0, 'long-name layout ' + (await audit(page)).join('; '));
    // Scrolled: the sticky tabs sit flush under the header (no strip of content above them).
    const stk = await page.evaluate(() => { const b = document.querySelector('.sheet.shop .sheet-body'); b.scrollTop = 260; const y = b.scrollTop, t = b.querySelector('.shop-tabs').getBoundingClientRect(), r = b.getBoundingClientRect(); b.scrollTop = 0; return { y, gap: Math.round((t.top - r.top) * 10) / 10 }; });
    c.ok(stk.y > 100 && Math.abs(stk.gap) <= 0.5, 'scrolled, the tab bar reaches the top of the sheet body ' + JSON.stringify(stk));
    await tap(page, 'door-tab-dealer');
    const d0 = await page.evaluate(() => ({ q: document.querySelector('[data-testid="van-quote-1"]').textContent, b1: !document.querySelector('[data-testid="van-buy-1"]').disabled, b2: document.querySelector('[data-testid="van-buy-2"]').disabled, sides: document.querySelectorAll('[data-testid="van-side"]').length }));
    c.ok(/trade-in/.test(d0.q) && d0.b1 && d0.b2 && d0.sides === 4, 'car lot: a quote with the trade-in; the 15-passenger now, the sprinter later ' + JSON.stringify(d0));
    const lot = await page.evaluate(() => ({ got: [...document.querySelectorAll('[data-testid="van-side-name"]')].map(t => t.textContent), want: GG.shop.vans(GG.state).map(v => v.current ? GG.state.van.name : v.name) }));
    c.ok(lot.got.join('|') === lot.want.join('|') && new Set(lot.got).size === 4, 'car lot: every vehicle wears its own name ' + lot.got.join(' | '));
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
      if (t < 3) {                                                                  // v0.8 polish: seat backs with detail, not one flat slab
        await bareUi(page, true); const flat = await flatShare(page, await page.screenshot()); await bareUi(page, false);
        c.ok(flat <= 30, '3D tier ' + t + ': the lower third is not one flat slab (top colour ' + flat + '% ≤ 30%), camera ' + JSON.stringify(info.cam));
      }
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

/* ---- spaces (v0.8 polish): every rehearsal space unmistakable from the garage camera; the van cabins ------------------ */
const SPACE_UPS = { 0: ['curb_couch', 'egg_foam', 'xmas_lights'], 1: ['beer_fridge', 'curb_couch', 'disco_ball'], 2: ['band_lounge', 'beer_fridge', 'espresso'], 3: ['curb_couch', 'hot_tub', 'star_door'] };
async function spaces() {
  const c = checker('spaces');
  const { page, errors, close } = await open();
  try {
    await boot(page, 1010, { fund: 5000, era: 'local', fans: 300 });
    const sig = [];
    for (const t of [0, 1, 2, 3]) {
      const r = await page.evaluate(([t, ups]) => {
        const s = GG.state; s.spaceTier = t; s.space = GG.shop.spaceDef(s, t).id; s.spaceUpgrades = ups; s.merch.stock = { shirt: 24 * 8, sticker: 200 * 2 }; GG.main.sync();
        const d = GG.debug('render'), sp = d.space; delete sp.obstacles; return sp;
      }, [t, SPACE_UPS[t]]);
      sig.push(r);
      c.ok(r.tier === t && r.garage === (t === 0) && r.yard === (t === 0) && (t ? r.decals >= 5 && r.hallProps >= 3 && r.sign : r.decals === 0) && r.riser > 0 === (t >= 2),
        'tier ' + t + ' is its own place: ' + JSON.stringify({ kind: r.kind, wall: r.wall, floor: r.floor, bg: r.bg, fixture: r.fixture, hall: r.hall, decals: r.decals, riser: r.riser, yard: r.yard }));
      await page.waitForTimeout(900);
      const pv = await pileVsLabels(page);
      c.ok(pv && pv.pile === pv.boxes && pv.boxes === 10 && pv.w >= 30 && pv.h >= 60 && pv.bb[0] >= 0 && pv.bb[2] <= pv.W && pv.bb[1] >= 0 && pv.bb[3] <= pv.H && !pv.over.length,
        'tier ' + t + ': all 10 boxes drawn, the pile on screen and under no label ' + JSON.stringify(pv));
      await bareUi(page, true); await shot(page, 'spaces_' + t + '.png'); await bareUi(page, false);
    }
    const uniq = k => new Set(sig.map(r => r[k])).size;
    c.ok(uniq('kind') === 4 && uniq('wall') === 4 && uniq('floor') === 4 && uniq('bg') === 4 && uniq('fixture') === 4 && uniq('hall') === 4, 'four different rooms (kind, wall, floor, background, fixture, outside) ' + sig.map(r => r.kind + ' ' + r.wall + '/' + r.floor).join(' | '));
    const kit = await page.evaluate(() => { const sc = GG.render.util.currentScene(); let y = null; sc.traverse(o => { if (o.isMesh && o.scale && Math.abs(o.scale.x - 1.15) < 1e-6 && o.position.x === -0.55) y = o.position.y; }); return y; });
    c.ok(kit === sig[3].riser && kit > 0, 'backstage: the kit stands on the deck (kit y ' + kit + ')');
    const dc = await page.evaluate(() => GG.debug('render').drawCalls);
    c.ok(dc > 0 && dc < 60, 'draw calls in a rented room < 60 (' + dc + ')');
    // Seasons in a rented room: no window snow backstage; December lights are the tier's own (a sad strand in the jam room).
    // (SPACES review: both December rooms are screenshotted for the sheet: spaces_dec_1.png, spaces_dec_3.png.)
    const w0 = await page.evaluate(() => [GG.state.week, GG.state.totalWeek]), dec = {};
    for (const t of [1, 3]) {
      dec[t] = await page.evaluate(([t, ups]) => { const s = GG.state; s.spaceTier = t; s.space = GG.shop.spaceDef(s, t).id; s.spaceUpgrades = ups; s.week = 12; s.totalWeek = 12; s.weather = GG.calendar.weatherAt(s); GG.main.sync(); return GG.debug('render').decor; }, [t, SPACE_UPS[t]]);
      await page.waitForTimeout(900);
      await bareUi(page, true); await shot(page, 'spaces_dec_' + t + '.png'); await bareUi(page, false);
    }
    await page.evaluate(w => { GG.state.week = w[0]; GG.state.totalWeek = w[1]; GG.main.sync(); }, w0);
    c.ok(dec[1].lights && dec[1].where === 'sad strand' && !dec[1].snow && dec[3].lights && !dec[3].snow && !dec[3].fan, 'December in a rented room: the jam room\'s sad strand, no window snow backstage ' + JSON.stringify(dec));
    // The cabins, as the trip shows them (default frame).
    for (const t of [0, 1, 2, 3]) {
      const info = await page.evaluate(t => {
        GG.render.setScene('van'); GG.render.van.setFrame({ top: 0, bottom: -1 });
        GG.render.van.setTrip({ from: 'Saskatoon', to: 'Regina', km: 240, season: 'summer', tier: t }); GG.render.van.setProgress(0.3); GG.render.setPaused(false);
        return GG.render.van.info();
      }, t);
      await page.waitForTimeout(900);
      await bareUi(page, true); const png = await page.screenshot(); if (SHOTS) fs.writeFileSync(path.join(CACHE, 'spaces_van_' + t + '.png'), png); await bareUi(page, false);
      const flat = await flatShare(page, png);
      c.ok(info.tier === t && (t === 3 || flat <= 32), 'cabin ' + info.vehicle + ': lower third top colour ' + flat + '%, camera ' + JSON.stringify(info.cam) + ' hfov ' + info.hfov);
    }
    await page.evaluate(() => GG.render.setScene('garage'));
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'spaces threw: ' + (e.stack || e)); }
  await close(); c.done();
  await tile('v08_spaces_sheet', [['spaces_0', 'Garage (tier 0): the parents\' garage'], ['spaces_1', 'Tier 1: Rent-A-Riff, Jam Space 7'], ['spaces_2', 'Tier 2: Prairie Dog Sound'], ['spaces_3', 'Tier 3: backstage, Potash Place'],
    ['spaces_dec_1', 'December (wk 12): the jam room'], ['spaces_van_0', 'Minivan'], ['spaces_van_1', '15-passenger + trailer'], ['spaces_van_2', 'Sprinter'], ['spaces_van_3', 'Tour bus'],
    ['spaces_dec_3', 'December (wk 12): backstage']], 5);
}

// A Playwright page of <img>s screenshotted into tests/.cache/<name>.png (no PIL).
async function tile(name, names, cols) {
  const have = names.filter(n => fs.existsSync(path.join(CACHE, n[0] + '.png')));
  if (have.length < names.length) console.log(name + ': missing ' + names.filter(n => !have.includes(n)).map(n => n[0]).join(','));
  if (!have.length) return;
  const { page, close } = await open({ noGoto: true });
  const rows = Math.ceil(have.length / cols);
  await page.setViewportSize({ width: cols * 400 + 10, height: rows * 880 + 10 });
  const html = '<body style="margin:0;background:#111;color:#eee;font:700 18px sans-serif;display:grid;grid-template-columns:repeat(' + cols + ',390px);gap:10px;padding:10px">' +
    have.map(n => '<div><div style="padding:4px 0">' + n[1] + '</div><img style="width:390px;height:844px;display:block;object-fit:cover" src="file://' + path.join(CACHE, n[0] + '.png') + '"></div>').join('') + '</body>';
  const f = path.join(CACHE, name + '.html'); fs.writeFileSync(f, html);
  await page.goto('file://' + f); await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(CACHE, name + '.png'), fullPage: true });
  console.log(name + ': tests/.cache/' + name + '.png (' + have.length + ' shots)');
  await close();
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
  if (want('spaces')) await spaces();
  if (want('seat')) await seatShop();
  if (want('button')) await shopButton();
  if (!ONLY.length || ONLY.includes('sheet')) await sheet();
})();

/* ---- seat (v1.1 "Seats", plan_contract_1.1 §4.6, owner E14b) ---------------------------------------------------------- */
// A string seat's shop: bass (Hail Damage) and lead (Ramblers) from the sketch pad's 🛒 "{Instrument} shop": the parody
// names per genre for the seat at exactly the drum prices and eras; the 5-string adds lane 5 to YOUR highway and the band's
// toms (the kit grows too), bass's ride slot is the fridge (a cab, no lane), the run gear sets your runs (+ the double
// kick); the lead's amp tier 2 shows the whammy; a buy plays your instrument (no drum hit); the swapped drummer's chat line;
// no gong; layout audit; no console errors. Screenshot shop_seat.png.
async function seatShop() {
  const c = checker('seat');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'), { timeout: 20000 });
    for (const [bandId, seatId] of [['hail_damage', 'bass'], ['grid_road_ramblers', 'lead']]) {
      await page.evaluate(([bandId, seatId]) => {
        GG.ui.closeAll();
        GG.main.quickStart({ seed: 909, bandId, seat: seatId, openCard: false });
        GG.ui.closeAll();
        const s = GG.state; s.card = null; s.phase = 'plan'; s.fund = 20000; s.era = 'local'; s.protected = false;
        if (!s.eraHistory.some(x => x.era === 'local')) s.eraHistory.push({ era: 'local', week: 1 });
        window.__hits = []; window.__voice = [];
        const A = GG.audio, h0 = A.hit;
        A.hit = function (l) { window.__hits.push(l); return h0.apply(this, arguments); };
        ['pluck', 'strum', 'lead'].forEach(k => { const f = A[k]; A[k] = function () { window.__voice.push(k); return f.apply(this, arguments); }; });
        GG.main.sync();
        GG.ui.openSketch();
      }, [bandId, seatId]);
      await waitScreen(page, 'seq');
      await openTools(page);   // v1.3: the shop row lives in the songwriter's ⋯ menu
      const shopBtn = await text(page, 'btn-kit-shop');
      c.ok(seatId === 'bass' ? /Bass shop/.test(shopBtn) : /Guitar shop/.test(shopBtn), seatId + ': the sketch pad opens your seat’s shop: ' + shopBtn);
      await tap(page, 'btn-kit-shop'); await waitScreen(page, 'gear');
      const g0 = await page.evaluate(() => {
        const q = s => document.querySelector('[data-testid="' + s + '"]');
        return { title: document.querySelector('.sheet.shop').textContent.slice(0, 80), now: q('gear-now').dataset, nowText: q('gear-now').textContent,
          items: GG.shop.gearItems(GG.state).map(x => ({ id: x.id, name: x.name, cost: x.cost, era: x.era, lane: x.lane, runs: x.runs, cab: x.cab })),
          kits: GG.shop.kitTiers(GG.state).map(x => ({ name: x.name, cost: x.cost, whammy: !!x.whammy })), drum: (() => { const st = JSON.parse(JSON.stringify(GG.state)); st.seat = 'drums';
            return { items: GG.shop.gearItems(st).map(x => ({ id: x.id, name: x.name, cost: x.cost, era: x.era })), kits: GG.shop.kitTiers(st).map(x => ({ name: x.name, cost: x.cost })) }; })(),
          text: document.querySelector('.sheet.shop').textContent };
      });
      c.ok(g0.now.seat === seatId && g0.now.lanes === '4' && g0.now.runs === '0' && /Your rig now/.test(g0.nowText), seatId + ': your rig now (4 lanes, no runs) ' + JSON.stringify(g0.now));
      c.ok(g0.items.every((x, i) => x.cost === g0.drum.items[i].cost && x.era === g0.drum.items[i].era && x.name !== g0.drum.items[i].name), seatId + ': the drum prices and eras, your own names ' + g0.items.map(x => x.name + ' $' + x.cost).join(' · '));
      c.ok(g0.kits.every((k, i) => k.cost === g0.drum.kits[i].cost && k.name !== g0.drum.kits[i].name), seatId + ': amp tiers at the kit prices ' + g0.kits.map(k => k.name).join(' · '));
      c.ok(!/\bgong\b/i.test(g0.text.replace(/Global Gong/g, '')) && !/\b(sticks|kit tier|toms|cymbal)\b/i.test(g0.items.map(x => x.name).join(' ')), seatId + ': no gong, no drum names');
      if (seatId === 'bass') {
        c.ok(g0.items.find(x => x.id === 'toms').lane === 5 && g0.items.find(x => x.id === 'ride').cab && !g0.items.find(x => x.id === 'ride').lane && g0.items.find(x => x.id === 'pedal').runs,
          'bass: lane 5, the fridge (a cab, no lane), fast fingers (runs) ' + JSON.stringify(g0.items));
        c.ok(/Low B of Doom|Five-String/.test(g0.items.find(x => x.id === 'toms').name), 'bass: a parody 5-string name ' + g0.items.find(x => x.id === 'toms').name);
      } else {
        c.ok(g0.items.find(x => x.id === 'ride').lane === 6 && g0.kits[2].whammy && !g0.kits[1].whammy, 'lead: lane 6 + the whammy with amp tier 2 ' + JSON.stringify(g0.kits));
      }
      c.ok((await audit(page)).length === 0, seatId + ': shop layout ' + (await audit(page)).join('; '));
      if (seatId === 'bass') { await page.waitForTimeout(450); await shot(page, 'shop_seat.png'); }
      const v0 = await page.evaluate(() => ({ voice: window.__voice.length, hits: window.__hits.length, chat: GG.state.chat.length }));
      await tap(page, 'gear-buy-toms');
      await page.waitForFunction(n => window.__voice.length > n, v0.voice, { timeout: 4000 }).catch(() => {});
      const b1 = await page.evaluate(() => ({ seatLanes: GG.career.seatLanes(GG.state), lanes: GG.state.gear.lanes, owned: GG.state.gear.owned.slice(), now: document.querySelector('[data-testid="gear-now"]').dataset,
        voice: window.__voice.length, hits: window.__hits.length, chat: GG.state.chat.slice(-1)[0], drummer: GG.career.drummerId(GG.state) }));
      c.ok(b1.seatLanes === 5 && b1.lanes === 5 && b1.owned.includes('toms') && b1.now.lanes === '5', seatId + ': lane 5 on your highway AND the band’s toms ' + JSON.stringify({ seat: b1.seatLanes, kit: b1.lanes }));
      c.ok(b1.voice > v0.voice && b1.hits === v0.hits, seatId + ': the buy plays your instrument, not a drum ' + JSON.stringify([v0, b1.voice, b1.hits]));
      c.ok(b1.chat && b1.chat.who === b1.drummer, seatId + ': the swapped drummer got the matching drum piece (chat) ' + JSON.stringify(b1.chat));
      await tap(page, 'gear-buy-ride');
      await tap(page, 'gear-buy-pedal');
      const b2 = await page.evaluate(() => ({ seatLanes: GG.career.seatLanes(GG.state), runs: GG.career.seatRuns(GG.state), lanes: GG.state.gear.lanes, dk: GG.state.gear.doubleKick, now: document.querySelector('[data-testid="gear-now"]').dataset }));
      c.ok(b2.seatLanes === (seatId === 'bass' ? 5 : 6) && b2.lanes === 6 && b2.runs && b2.dk && b2.now.runs === '1', seatId + ': ride/cab + run gear: your lanes ' + b2.seatLanes + ', kit 6 + double kick, runs on ' + JSON.stringify(b2));
      await tap(page, 'btn-gear-done');
      await page.waitForFunction(() => GG.debug('ui').screen === 'seq', null, { timeout: 10000 });
      if (await page.evaluate(() => GG.debug('seq').screen === 'quick')) await tap(page, 'btn-quick-tweak');   // v1.3: the sketch pad sat on Quick song
      const grid = await page.evaluate(() => ({ cols: document.querySelector('[data-testid="part-grid"]') ? document.querySelector('[data-testid="part-grid"]').dataset.lanes : null }));
      c.ok(grid.cols === (seatId === 'bass' ? '6' : '7'), seatId + ': back to your part’s grid (v1.3 rows) ' + JSON.stringify(grid));
    }
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'seat threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

/* ---- button (v1.3.1, Lane S): the sketch pad's header shop button ------------------------------------------------------ */
// The head's layout: every child inside the viewport, the caps line ("Sketch pad · Bass") whole, the shop button >= 44 px.
function headInfo(page) {
  return page.evaluate(() => {
    const h = [...document.querySelectorAll('.seq-head')].pop(); if (!h) return null;
    const r = e => e.getBoundingClientRect(), b = h.querySelector('[data-testid="btn-seq-shop"]'), cap = h.querySelector('.seq-title .caps');
    return { shop: b ? { w: r(b).width, h: r(b).height, aria: b.getAttribute('aria-label'), text: b.textContent, right: r(b).right, left: r(b).left } : null,
      order: [...h.children].map(k => k.dataset.testid || k.className), caps: cap ? cap.textContent : '', capsCut: cap ? cap.scrollWidth > cap.clientWidth + 1 : true,
      out: [...h.children].some(k => r(k).left < -1 || r(k).right > innerWidth + 1), hscroll: document.documentElement.scrollWidth > innerWidth + 1 };
  });
}
async function shopButton() {
  const c = checker('button');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'), { timeout: 20000 });
    for (const seat of ['drums', 'bass']) {
      const name = seat === 'drums' ? 'Drum shop' : 'Bass shop';
      await page.evaluate(seat => {
        GG.ui.closeAll();
        GG.main.quickStart({ seed: 808, bandId: 'hail_damage', seat, openCard: false });
        GG.ui.closeAll();
        const s = GG.state; s.card = null; s.phase = 'plan'; s.fund = 20000;
        GG.main.sync();
        GG.emit('hotspot', { action: 'kit' });
      }, seat);
      await waitScreen(page, 'seq');
      for (const scr of ['quick', 'edit']) {
        if (scr === 'edit') await tap(page, 'btn-quick-tweak');
        await page.waitForFunction(x => GG.debug('seq') && GG.debug('seq').screen === x, scr, { timeout: 5000 });
        const h = await headInfo(page);
        c.ok(h && h.shop && h.shop.w >= 44 && h.shop.h >= 44 && h.shop.aria === name && /shop/i.test(h.shop.text), seat + ' ' + scr + ': the header shop button (' + name + ') ' + JSON.stringify(h && h.shop));
        c.ok(h && h.order.join(',') === 'btn-seq-close,seq-title,btn-seq-shop,btn-seq-tools' && !h.out && !h.hscroll && !h.capsCut && /Sketch pad/.test(h.caps),
          seat + ' ' + scr + ': ✕ · title · shop · ⋯ fit, "' + (h && h.caps) + '" whole ' + JSON.stringify(h));
        if (scr === 'quick') {   // playback stops when the shop opens
          await tap(page, 'btn-guide-play');
          await page.waitForFunction(() => !!GG.debug('seq').playing, null, { timeout: 5000 }).catch(() => {});
        }
        const p0 = await page.evaluate(() => GG.debug('seq').playing);
        await tap(page, 'btn-seq-shop'); await waitScreen(page, 'gear');
        const g = await page.evaluate(() => ({ head: (document.querySelector('.sheet.shop .sheet-head') || {}).textContent || '', playing: GG.debug('seq') && GG.debug('seq').playing, stack: GG.debug('ui').stack }));
        c.ok(g.head.includes(name) && g.stack.join(',') === 'seq,gear' && !g.playing && (scr === 'edit' || p0), seat + ' ' + scr + ': tap -> the gear sheet over the songwriter, playback stopped ' + JSON.stringify([p0, g]));
        if (seat === 'drums' && scr === 'edit') {   // a buy from here grows the open grid
          const l0 = await page.evaluate(() => document.querySelectorAll('.seq-grid .lh').length);
          await tap(page, 'gear-buy-toms');
          await page.waitForFunction(() => GG.state.gear.lanes === 5, null, { timeout: 4000 }).catch(() => {});
          await tap(page, 'btn-gear-done'); await waitScreen(page, 'seq');
          const l1 = await page.evaluate(() => ({ lanes: document.querySelectorAll('.seq-grid .lh').length, screen: GG.debug('seq').screen }));
          c.ok(l0 === 4 && l1.lanes === 5 && l1.screen === 'edit', 'drums: the toms from the header shop grow the open grid ' + JSON.stringify([l0, l1]));
        } else {
          await tap(page, 'btn-gear-done'); await waitScreen(page, 'seq');
          c.ok(await page.evaluate(x => GG.debug('seq').screen === x, scr), seat + ' ' + scr + ': Back returns to the songwriter on the same screen');
        }
        if (seat === 'bass' && scr === 'quick') { await page.waitForTimeout(300); await shot(page, require('./_pw').shotName('shop_button.png')); }
      }
      await openTools(page);
      c.ok(await count(page, 'btn-kit-shop') === 1 && new RegExp(name).test(await text(page, 'btn-kit-shop')), seat + ': the ⋯ row btn-kit-shop stays (' + await text(page, 'btn-kit-shop') + ')');
      await tap(page, 'btn-seq-tools-cancel');
      c.ok((await audit(page)).length === 0, seat + ': songwriter layout ' + (await audit(page)).join('; '));
    }
    // Not in a Write block, not in a catalog song (D7).
    await page.evaluate(() => { GG.ui.closeAll(); GG.main.quickStart({ seed: 808, openCard: false }); GG.state.card = null; GG.state.phase = 'plan'; GG.ui.closeAll(); GG.ui.composeWeek(1, function () {}); });
    await page.waitForFunction(() => GG.debug('ui').screen === 'seq' && GG.debug('seq') && GG.debug('seq').mode === 'write', null, { timeout: 8000 });
    c.ok(await count(page, 'btn-seq-shop') === 0, 'a Write block has no header shop button');
    await page.evaluate(() => { GG.ui.closeAll(); const s = GG.state.songs[0]; if (s) GG.ui.openSong(s.id); });
    const view = await page.evaluate(() => ({ mode: GG.debug('seq') && GG.debug('seq').mode, n: document.querySelectorAll('[data-testid="btn-seq-shop"]').length }));
    c.ok(view.mode === 'view' && view.n === 0, 'a catalog song has no header shop button ' + JSON.stringify(view));
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'button threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}
