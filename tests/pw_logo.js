// pw_logo.js: the v0.8.1 band logo (Addendum 2 D2, LOGO) on a 390x844 phone viewport.
// Sections (META_ONLY=picker|reuse|meta, comma-separated; default all + the contact sheet). Each fits `timeout 500`.
//   meta:   (v1.0, Lane M) the first HD quickStart timed (report); unlocked meta palettes / emblems (owner Q5) offered with 🏆 in
//           every genre's picker, locked ones hidden, a pick sticks to the career, Rebrand lists them, rival logos never use
//           them. Screenshot logo_meta.png.
//   picker: new career → band intro → the logo picker ('logo': live preview, 15 emblems, 4 lettering styles, 10+ colour pairs;
//           layout audit) → three taps (moose, western slab, gold) → the creator (Back keeps the pick) → Start: the career has
//           it + this phone remembers it for metal (the next new career starts from it) → the laptop's Band tab: Rebrand
//           (refused while it's the same logo / the fund is short; then the fee + buzz, the garage banner + kick redraw).
//           Screenshots logo_picker.png, logo_pick.png, logo_rebrand.png, logo_laptop.png.
//   reuse:  every site the logo lands on: the kick drum (creator kit preview + the stage from the crowd), the merch table,
//           the van side (minivan + tour bus) and the 3D van's windshield, Bandbook, the garage banner, the Loonies broadcast card,
//           the Scene leaderboard (every band's logo), the BotB announcement (both logos) and the verdict. No share button.
//           Screenshots logo_kick.png, logo_stage.png, logo_merch.png, logo_van.png, logo_bus.png, logo_van3d.png,
//           logo_bandbook.png, logo_garage.png, logo_loonies.png, logo_scene.png, logo_botb.png, logo_verdict.png.
//   sheet:  tests/.cache/v081_logo_sheet.png: every emblem x style (+ each palette) and the screenshots above.
// Run: node build.js && META_ONLY=picker timeout 500 node tests/pw_logo.js
const path = require('path'), fs = require('fs');
const { open, checker } = require('./_pw');
const CACHE = path.join(__dirname, '.cache');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);
const VIEW = process.env.LOGO_VIEW || '';   // a scratch 440x956 copy sets this so the shots don't overwrite the 390 ones

const tid = id => `[data-testid="${id}"]`;
const tap = (page, id) => page.locator(tid(id)).last().click();
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });
const shot = (page, name) => page.screenshot({ path: path.join(CACHE, VIEW + name) });
const bareUi = (page, on) => page.evaluate(on => { ['hud', 'screens', 'toast'].forEach(id => { const e = document.getElementById(id); if (e) e.style.visibility = on ? 'hidden' : ''; }); }, on);
const dbg = page => page.evaluate(() => GG.debug('logo-ui'));

function audit(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const cs = getComputedStyle(e); return cs.visibility === 'hidden' || cs.display === 'none' ? null : r; };
    const name = e => (e.dataset && e.dataset.testid || (typeof e.className === 'string' && e.className) || e.tagName) + '';
    for (const e of document.querySelectorAll('#screens .layer:not([inert]) *')) { const r = vis(e); if (r && (r.right > W + 1 || r.left < -1)) bad.push('overflow ' + name(e)); }
    for (const sc of document.querySelectorAll('.sheet-body, .full-body')) if (sc.scrollWidth > sc.clientWidth + 1) bad.push('hscroll ' + sc.className);
    if (document.documentElement.scrollWidth > W + 1) bad.push('page hscroll');
    for (const b of document.querySelectorAll('#screens .layer:not([inert]) button')) { const r = vis(b); if (r && (r.width < 43.5 || r.height < 43.5)) bad.push('small ' + name(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
    return bad.slice(0, 8);
  });
}
// No share / screenshot / download button anywhere on screen (owner, Addendum 2).
const noShare = page => page.evaluate(() => !Array.from(document.querySelectorAll('#screens button, #screens a')).some(b => /share|screenshot|download|save image/i.test(b.textContent + ' ' + (b.getAttribute('aria-label') || ''))));
async function boot(page, seed, extra) {
  await page.waitForFunction(() => window.GG && GG.main && GG.ui && GG.ui.openLogo, null, { timeout: 20000 });
  await page.evaluate(([seed, extra]) => {
    GG.main.quickStart({ seed, openCard: false });
    GG.ui.closeAll();
    const s = GG.state; s.card = null; s.phase = 'plan';
    Object.assign(s, extra || {});
    if (s.era !== 'garage') { s.protected = false; if (!s.eraHistory.some(x => x.era === s.era)) s.eraHistory.push({ era: s.era, week: 1 }); }
    GG.main.sync();
  }, [seed, extra || null]);
}

/* ---- picker ------------------------------------------------------------------------------------------------------ */
async function picker() {
  const c = checker('picker');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => { localStorage.removeItem('gg.v1.unlocks.metal.logo'); });
    await tap(page, 'btn-new'); await tap(page, 'slot-1'); await tap(page, 'genre-metal'); await tap(page, 'btn-intro-next');
    await waitScreen(page, 'logo');
    let d = await dbg(page);
    c.ok(d.open && d.mode === 'new' && d.logo.emblem === 'hailstone' && d.logo.style === 'metal' && d.logo.palette === 'frost' && !d.carried, 'the picker opens after the band intro on the band default ' + JSON.stringify(d.logo));
    const n = await page.evaluate(() => ({ em: document.querySelectorAll('[data-testid^="logo-emblem-"]').length, st: document.querySelectorAll('[data-testid^="logo-style-"]').length,
      pal: document.querySelectorAll('[data-testid^="logo-pal-"]').length, prev: !!document.querySelector('[data-testid="logo-preview"] img.logo-img'),
      minis: ['kick', 'shirt', 'avatar'].every(k => document.querySelector('[data-testid="logo-prev-' + k + '"] img')),
      loaded: Array.from(document.querySelectorAll('[data-testid="logo-screen"] img')).every(i => i.complete && i.naturalWidth > 0) }));
    c.ok(n.em >= 15 && n.st === 4 && n.pal >= 10 && n.prev && n.minis, 'three rows + a live preview (big + kick / shirt / Bandbook) ' + JSON.stringify(n));
    await page.waitForTimeout(300);
    let bad = await audit(page); c.ok(!bad.length, 'picker layout: no overflow, buttons >= 44px ' + bad.join(', '));
    c.ok(await noShare(page), 'no share button');
    await shot(page, 'logo_picker.png');
    // Three taps
    const key0 = await page.getAttribute(tid('logo-preview'), 'data-key');
    await tap(page, 'logo-emblem-moose'); await tap(page, 'logo-style-country'); await tap(page, 'logo-pal-gold');
    const key1 = await page.getAttribute(tid('logo-preview'), 'data-key');
    c.ok(key0 === 'hailstone.metal.frost' && key1 === 'moose.country.gold', 'three taps change the live preview: ' + key0 + ' -> ' + key1);
    c.ok(await page.evaluate(() => document.querySelector('[data-testid="logo-emblem-moose"]').getAttribute('aria-pressed') === 'true'
      && document.querySelector('[data-testid="logo-style-country"]').classList.contains('on') && document.querySelector('[data-testid="logo-pal-gold"]').classList.contains('on')), 'the picks show as selected');
    c.ok(await page.locator(tid('logo-default')).isEnabled(), 'Band default is offered once it differs');
    await page.evaluate(() => document.querySelector('.full-body').scrollTo(0, 400)); await page.waitForTimeout(200);
    const sticky = await page.evaluate(() => { const r = document.querySelector('[data-testid="logo-preview"]').getBoundingClientRect(); return r.top >= -2 && r.bottom > 100; });
    c.ok(sticky, 'the preview stays in view while you scroll the options');
    await shot(page, 'logo_pick.png');
    await tap(page, 'logo-surprise');
    const sur = (await dbg(page)).logo;
    await tap(page, 'logo-emblem-moose'); await tap(page, 'logo-style-country'); await tap(page, 'logo-pal-gold');
    c.ok(sur && sur.emblem && sur.palette, 'Surprise me picks something');
    await tap(page, 'btn-logo-done');
    await waitScreen(page, 'creator');
    c.ok(await page.evaluate(() => GG.debug('logo').pending === 'moose.country.gold'), 'handed to GG.logo.prepare');
    await tap(page, 'btn-back');
    await waitScreen(page, 'logo');
    c.ok((await dbg(page)).logo.emblem === 'moose', 'Back from the creator keeps the pick');
    await tap(page, 'btn-logo-done'); await waitScreen(page, 'creator');
    await page.fill(tid('creator-name'), 'Tanner');
    await tap(page, 'btn-create');
    await waitScreen(page, 'coldopen');
    const st = await page.evaluate(() => ({ logo: GG.state.logo, carry: JSON.parse(localStorage.getItem('gg.v1.unlocks.metal.logo') || 'null'), chat: GG.state.chat.some(m => /logo/i.test(m.text)),
      banner: GG.debug('render').banner }));
    c.ok(st.logo && st.logo.emblem === 'moose' && st.logo.style === 'country' && st.logo.palette === 'gold' && st.chat, 'the career has the logo (+ a chat line) ' + JSON.stringify(st.logo));
    c.ok(st.carry && st.carry.emblem === 'moose', 'this phone remembers the metal logo');
    // A second new career in metal starts from the remembered one
    await page.evaluate(() => { GG.main.quitToTitle ? GG.main.quitToTitle() : null; });
    await page.waitForSelector(tid('btn-new'));
    await tap(page, 'btn-new'); await tap(page, 'slot-2'); await tap(page, 'genre-metal'); await tap(page, 'btn-intro-next');
    await waitScreen(page, 'logo');
    d = await dbg(page);
    c.ok(d.carried && d.logo.emblem === 'moose' && /last metal logo/.test(await page.textContent(tid('logo-screen'))), 'carried over: the next metal career starts from it');
    await tap(page, 'logo-default');
    c.ok((await dbg(page)).logo.emblem === 'hailstone', 'Band default resets');
    await page.evaluate(() => GG.ui.closeAll());

    // Rebrand from the laptop
    await boot(page, 4242, { fund: 100 });
    await page.evaluate(() => GG.ui.show('laptop', { tab: 'band' }));
    await page.waitForSelector(tid('laptop-logo'));
    await page.evaluate(() => { const e = document.querySelector('[data-testid="laptop-logo"]'); e.scrollIntoView(); });
    await page.waitForTimeout(250);
    c.ok(await page.evaluate(() => /Rebrand · \$150/.test(document.querySelector('[data-testid="laptop-rebrand"]').textContent)), 'laptop Band tab: the logo + Rebrand ($150 in the garage era)');
    await shot(page, 'logo_laptop.png');
    await tap(page, 'laptop-rebrand');
    await waitScreen(page, 'logo');
    d = await dbg(page);
    c.ok(d.mode === 'rebrand' && await page.locator(tid('btn-logo-rebrand')).isDisabled() && /already/.test(await page.textContent(tid('logo-why'))), 'same logo: Rebrand is disabled with a why');
    await tap(page, 'logo-emblem-anvil'); await tap(page, 'logo-pal-blood');
    c.ok(await page.locator(tid('btn-logo-rebrand')).isDisabled() && /fund/i.test(await page.textContent(tid('logo-why'))), 'fund short: disabled with a why');
    await page.evaluate(() => { GG.state.fund = 2000; GG.state.buzz = 30; GG.ui.get('logo').rerender(); });
    c.ok(await page.locator(tid('btn-logo-rebrand')).isEnabled() && /\$150/.test(await page.textContent(tid('logo-cost'))), 'enough money: enabled, the cost shown');
    bad = await audit(page); c.ok(!bad.length, 'rebrand layout ' + bad.join(', '));
    await shot(page, 'logo_rebrand.png');
    const d0 = await page.evaluate(() => GG.debug('render-logo').draws);
    await tap(page, 'btn-logo-rebrand');
    await page.waitForFunction(() => !GG.ui.isOpen('logo'));
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => ({ logo: GG.state.logo, fund: GG.state.fund, buzz: GG.state.buzz, draws: GG.debug('render-logo').draws, laptop: GG.ui.isOpen('laptop'),
      alt: document.querySelector('[data-testid="laptop-logo"] img').src.length }));
    c.ok(r.logo.emblem === 'anvil' && r.logo.palette === 'blood' && r.fund === 1850 && r.buzz === 27, 'rebranded: $150 + 3 buzz ' + JSON.stringify(r));
    c.ok(r.draws > d0 && r.laptop, 'the garage (banner + kick) and the laptop redraw with the new logo');
    if (errors.length) console.log(errors.join('\n').slice(0, 1500));
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'picker threw: ' + (e.stack || e).toString().slice(0, 500)); }
  await close(); c.done();
}

/* ---- meta (v1.0, Lane M: owner Q5 looks from finished careers) ------------------------------------------------------ */
// The first HD quickStart on a fresh page is timed (report only; the logo readback fix: willReadFrequently on the metal mask).
// Meta palettes / emblems this phone unlocked (GG.meta 'palettes' / 'emblems') are offered with a 🏆 chip in every genre's
// picker (new career and Rebrand); locked ones stay hidden; a picked one sticks to the career. Screenshot logo_meta.png.
async function meta() {
  const c = checker('meta');
  const { page, errors, close } = await open();
  try {
    await page.waitForFunction(() => window.GG && GG.main && GG.ui && GG.ui.openLogo && GG.meta && GG.meta.enabled, null, { timeout: 20000 });
    const qs = await page.evaluate(() => { const t0 = performance.now(); GG.main.quickStart({ seed: 7, openCard: false }); const t1 = performance.now();
      return { ms: Math.round(t1 - t0), draws: GG.debug('render-logo').draws }; });
    console.log('meta: first Hail Damage quickStart ' + qs.ms + ' ms (' + qs.draws + ' logo draws; report only, PERF baseline 1.5-1.8 s)');
    c.ok(qs.ms > 0, 'first HD quickStart timed: ' + qs.ms + ' ms');
    await page.evaluate(() => { GG.main.quitToTitle(); GG.meta.unlock('palettes', ['arena_gold', 'rival_red']); GG.meta.unlock('emblems', ['lantern']); });
    const want = ['logo-pal-arena_gold', 'logo-pal-rival_red', 'logo-emblem-lantern'], hidden = ['logo-pal-hockey_night', 'logo-pal-garage_grey', 'logo-emblem-price_tag', 'logo-emblem-globe_record'];
    for (const b of ['hail_damage', 'frost_heave', 'gravel_kings', 'grid_road_ramblers']) {
      await page.evaluate(b => { GG.ui.closeAll(); GG.ui.openLogo({ mode: 'new', bandId: b, onDone: () => {} }); }, b);
      await waitScreen(page, 'logo');
      const r = await page.evaluate(([w, h]) => ({ on: w.map(id => { const e = document.querySelector('[data-testid="' + id + '"]'); return !!e && e.dataset.meta === '1' && /🏆/.test(e.textContent); }),
        off: h.filter(id => document.querySelector('[data-testid="' + id + '"]')), plain: document.querySelector('[data-testid="logo-pal-frost"]').dataset.meta || null }), [want, hidden]);
      c.ok(r.on.every(Boolean) && !r.off.length && !r.plain, b + ': unlocked meta looks offered with 🏆, locked ones hidden ' + JSON.stringify(r));
    }
    await page.evaluate(() => GG.main.quitToTitle());
    await page.waitForSelector(tid('btn-new'));
    // Pick them in a new metal career; the career keeps them.
    await tap(page, 'btn-new'); await tap(page, 'slot-3'); await tap(page, 'genre-metal'); await tap(page, 'btn-intro-next');
    await waitScreen(page, 'logo');
    await tap(page, 'logo-emblem-lantern'); await tap(page, 'logo-pal-arena_gold');
    await page.waitForTimeout(300);
    const key = await page.getAttribute(tid('logo-preview'), 'data-key');
    c.ok(key === 'lantern.metal.arena_gold', 'picked: ' + key);
    const imgs = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="logo-screen"] img')).every(i => i.complete && i.naturalWidth > 0));
    c.ok(imgs, 'the new emblem draws');
    const bad = await audit(page); c.ok(!bad.length, 'picker layout with meta looks ' + bad.join(', '));
    c.ok(await noShare(page), 'no share button');
    await shot(page, 'logo_meta.png');
    await tap(page, 'btn-logo-done'); await waitScreen(page, 'creator');
    await page.fill(tid('creator-name'), 'Gold');
    await tap(page, 'btn-create');
    await waitScreen(page, 'coldopen');
    c.ok(await page.evaluate(() => GG.logo.key(GG.state.logo)) === 'lantern.metal.arena_gold', 'the career has the meta look');
    // Rebrand lists them too, in a punk career
    await boot(page, 77, { fund: 5000 });
    await page.evaluate(() => { GG.ui.openLogo({ mode: 'rebrand' }); });
    await waitScreen(page, 'logo');
    c.ok(await page.evaluate(() => GG.state.bandId) && await page.locator(tid('logo-pal-rival_red')).count() === 1, 'Rebrand offers them too');
    // Rival logos never use a meta look
    c.ok(await page.evaluate(() => { const ids = Object.keys(GG.content.logo.rivals).concat(['some_scene_band', 'another_one', 'x1', 'x2', 'x3']);
      return ids.every(id => { const l = GG.logo.rival(id); return !GG.logo.isMeta(l.emblem) && !GG.logo.isMeta(l.palette); }); }), 'rival logos never use meta looks');
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'meta threw: ' + (e.stack || e).toString().slice(0, 500)); }
  await close(); c.done();
}

/* ---- reuse ------------------------------------------------------------------------------------------------------- */
async function reuse() {
  const c = checker('reuse');
  const { page, errors, close } = await open();
  try {
    await boot(page, 5151, { fund: 8000, fans: 900, era: 'local' });
    await page.evaluate(() => { const s = GG.state; s.logo = { emblem: 'hailstone', style: 'metal', palette: 'frost' }; s.player.kit = Object.assign({}, s.player.kit, { head: 'logo' }); GG.main.sync(); });
    // The garage: banner + kick
    await page.waitForTimeout(700);
    await bareUi(page, true); await shot(page, 'logo_garage.png'); await bareUi(page, false);
    const g = await page.evaluate(() => ({ banner: GG.debug('render').banner, head: GG.state.player.kit.head, cached: GG.render.logo.info().cached }));
    c.ok(g.banner === 'Hail Damage' && g.head === 'logo' && g.cached >= 2, 'garage banner + kick head use the logo ' + JSON.stringify(g));
    // The kick drum up close (the creator's kit preview) + from the crowd (stage spectator view)
    await page.evaluate(() => GG.ui.show('menu'));
    await tap(page, 'menu-look'); await waitScreen(page, 'look'); await tap(page, 'lk-tab-kit');
    await page.waitForTimeout(900);
    await page.locator('.lk-stagewrap').screenshot({ path: path.join(CACHE, VIEW + 'logo_kick.png') });
    await page.evaluate(() => GG.ui.closeAll());
    const stg = await page.evaluate(async () => {
      const st = GG.state; GG.render.setScene('stage'); GG.render.setPaused(false);
      GG.render.stage.setup({ venue: { venueId: 'gopher', kind: 'bar', name: 'The Gopher Hole', capacity: 150, tier: 1 }, crowd: 80, members: st.members, flags: st.flags, genre: 'metal', player: st.player, bpm: 150, view: 'spectator' });
      await new Promise(r => setTimeout(r, 700));
      return GG.render.stage.info().kit;
    });
    c.ok(stg && stg.art, 'the stage kit shows the kick art ' + JSON.stringify(stg));
    await bareUi(page, true); await shot(page, 'logo_stage.png'); await bareUi(page, false);
    await page.evaluate(() => { GG.render.setScene('garage'); GG.main.sync(); });
    // Merch
    await page.evaluate(() => { GG.shop.unlockMerch && GG.state.merch.unlocked.push('hoodie', 'toque'); GG.ui.openMerch(); });
    await waitScreen(page, 'merch');
    const m = await page.evaluate(() => Array.from(document.querySelectorAll('img.merch-art')).map(i => i.dataset.testid));
    c.ok(m.includes('merch-art-shirt') && m.includes('merch-art-sticker'), 'merch items carry the logo ' + m.join(','));
    let bad = await audit(page); c.ok(!bad.length, 'merch layout ' + bad.join(', '));
    await shot(page, 'logo_merch.png');
    await page.evaluate(() => GG.ui.closeAll());
    // Van side (minivan, tour bus) + the 3D van
    await page.evaluate(() => GG.ui.showVan ? GG.ui.showVan('van') : GG.emit('hotspot', { action: 'door' }));
    await waitScreen(page, 'van-info');
    c.ok(await page.locator(tid('van-logo')).count() >= 1, 'the van side has the logo decal');
    await shot(page, 'logo_van.png');
    await page.evaluate(() => { GG.ui.closeAll(); GG.state.van.tier = 3; GG.ui.showVan ? GG.ui.showVan('van') : GG.emit('hotspot', { action: 'door' }); });
    await waitScreen(page, 'van-info'); await page.waitForTimeout(700);
    await page.locator(tid('van-side')).first().screenshot({ path: path.join(CACHE, VIEW + 'logo_bus.png') });
    await page.evaluate(() => { GG.ui.closeAll(); GG.state.van.tier = 0; GG.main.sync(); });
    const v3 = await page.evaluate(async () => {
      GG.render.setScene('van'); GG.render.van.setFrame({ top: 0, bottom: -1 });
      GG.render.van.setTrip({ from: 'Saskatoon', to: 'Regina', km: 240, season: 'summer', tier: 0 }); GG.render.van.setProgress(0.3); GG.render.setPaused(false);
      await new Promise(r => setTimeout(r, 900));
      return GG.render.van.info();
    });
    c.ok(v3.logo === true, 'the 3D van has the logo sticker on the windshield');
    await bareUi(page, true); await shot(page, 'logo_van3d.png'); await bareUi(page, false);
    await page.evaluate(() => { GG.render.setScene('garage'); GG.main.sync(); });
    // Bandbook
    await page.evaluate(() => GG.ui.show('laptop', { tab: 'bandbook' }));
    await page.waitForSelector(tid('bb-logo'));
    await shot(page, 'logo_bandbook.png');
    // The Scene leaderboard: every band's logo
    await page.evaluate(() => GG.ui.show('laptop', { tab: 'scene' }));
    await page.waitForSelector(tid('scene-board'));
    const sc = await page.evaluate(() => { const rows = document.querySelectorAll('[data-testid^="scene-row-"]'); return { rows: rows.length, logos: document.querySelectorAll('[data-testid^="scene-logo-"]').length, you: !!document.querySelector('[data-testid="scene-logo-you"]'), them: !!document.querySelector('[data-testid="scene-logo-tundra_wraith"]') }; });
    c.ok(sc.rows >= 3 && sc.logos === sc.rows && sc.you && sc.them, 'Scene leaderboard: a logo on every row ' + JSON.stringify(sc));
    await page.evaluate(() => document.querySelector('[data-testid="scene-board"]').scrollIntoView()); await page.waitForTimeout(200);
    bad = await audit(page); c.ok(!bad.length, 'scene layout ' + bad.join(', '));
    await shot(page, 'logo_scene.png');
    await page.evaluate(() => GG.ui.closeAll());
    // BotB: the announcement (both logos) and the verdict
    await page.evaluate(() => { const st = GG.state; st.gig = null; st.offer = null; st.rival.pending = null; GG.ui.showdownViews = true; GG.rival.schedule(st, 'botb'); GG.main.sync(); GG.ui.announceShowdown(st, true); });
    await waitScreen(page, 'showdown');
    c.ok(await page.locator(tid('sd-logo-them')).count() === 1 && await page.locator(tid('sd-logo-you')).count() === 1, 'BotB announcement: both logos');
    bad = await audit(page); c.ok(!bad.length, 'showdown layout ' + bad.join(', '));
    await shot(page, 'logo_botb.png');
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.showVerdict({ kind: 'botb', won: true, you: 88, them: 71, rival: GG.state.rival.name, prize: 500, lines: ['Gord shakes your hand. Firmly. Accountant-firm.'] }, () => {}); });
    await waitScreen(page, 'rival-verdict'); await page.waitForTimeout(800);
    c.ok(await page.locator(tid('rv-logo-you')).count() === 1 && await page.locator(tid('rv-logo-them')).count() === 1, 'BotB verdict: both logos');
    await shot(page, 'logo_verdict.png');
    await page.evaluate(() => GG.ui.closeAll());
    // The Loonies broadcast card (a real ceremony at the week-20 wrap)
    await page.evaluate(() => {
      const s = GG.state; s.week = 16; GG.labels.nominate(s, GG.RNG(8), { news: [] });
      s.loonies.nominations = [{ category: 'live', name: 'Best Live Act', what: 'x', nominees: [GG.ui.v5.bandName(), 'Tundra Wraith', 'Mall Rats'], strength: 99, rival: 5 }];
      s.loonies.invited = true;
      s.week = 20; s.totalWeek = 44; s.phase = 'plan'; GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s, { autoGig: true });
      GG.main.wrapWeek();
    });
    await waitScreen(page, 'loonies');
    await page.waitForTimeout(500);
    for (let i = 0; i < 6 && await page.locator(tid('btn-carpet-next')).count(); i++) { await tap(page, 'btn-carpet-next'); await page.waitForTimeout(250); }
    await page.waitForFunction(() => GG.debug('render').carpet && GG.debug('render').carpet.walking === 0, null, { timeout: 12000 }).catch(() => {});
    await tap(page, 'btn-outfit'); await waitScreen(page, 'loonie-card'); await tap(page, 'loonie-choice-0'); await tap(page, 'btn-loonie-card-ok');
    await tap(page, 'btn-head-inside');
    await page.waitForSelector(tid('btn-envelope'));
    await tap(page, 'btn-envelope');
    await page.waitForSelector(tid('logo-cast'));
    const cast = await page.evaluate(() => { const e = document.querySelector('[data-testid="logo-cast"]'); return { who: e.dataset.who, img: !!e.querySelector('img.logo-img'), text: e.textContent }; });
    c.ok(cast.img && (cast.who === 'you' || cast.who === 'tundra_wraith' || cast.who === 'mall_rats'), 'Loonies broadcast card with the winner\'s logo ' + JSON.stringify(cast));
    await page.waitForTimeout(600);
    c.ok(await noShare(page), 'no share button on the Loonies');
    await shot(page, 'logo_loonies.png');
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'reuse threw: ' + (e.stack || e).toString().slice(0, 500)); }
  await close(); c.done();
}

/* ---- the contact sheet -------------------------------------------------------------------------------------------- */
async function sheet() {
  const names = [['logo_picker', 'Picker (new career)'], ['logo_pick', 'Three taps: moose · western slab · gold'], ['logo_rebrand', 'Rebrand (laptop)'], ['logo_laptop', 'Laptop: the logo + Rebrand'],
    ['logo_garage', 'Garage banner + kick'], ['logo_kick', 'Kick head (kit preview)'], ['logo_stage', 'Kick from the crowd'], ['logo_merch', 'Merch table'],
    ['logo_van', 'Van side (minivan)'], ['logo_bus', 'Van side (tour bus)'], ['logo_van3d', 'Van: windshield sticker'], ['logo_bandbook', 'Bandbook avatar'],
    ['logo_scene', 'Scene leaderboard'], ['logo_botb', 'BotB announcement'], ['logo_verdict', 'BotB verdict'], ['logo_loonies', 'Loonies broadcast card']];
  const have = names.filter(n => fs.existsSync(path.join(CACHE, n[0] + '.png')));
  if (have.length < names.length) console.log('sheet: missing ' + names.filter(n => !have.includes(n)).map(n => n[0]).join(','));
  const { page, errors, close } = await open();
  await page.waitForFunction(() => window.GG && GG.render && GG.render.logo && GG.logo);
  const grid = await page.evaluate(() => {
    const L = GG.logo, R = GG.render.logo, bands = GG.content.bands, out = { rows: [], pals: [], rivals: [] };
    const names = { metal: bands.hail_damage.name, punk: bands.frost_heave.name, rock: bands.gravel_kings.name, country: bands.grid_road_ramblers.name };
    const pals = L.palettes();
    L.emblems().forEach((e, i) => out.rows.push({ id: e.name, cells: L.styles().map((s, j) => R.dataURL({ emblem: e.id, style: s.id, palette: pals[(i + j) % pals.length].id }, names[s.id], 200)) }));
    pals.forEach((p, i) => out.pals.push({ id: p.name, src: R.dataURL({ emblem: L.emblems()[i % L.emblems().length].id, style: L.styles()[i % 4].id, palette: p.id }, 'Hail Damage', 200, { badge: 'round' }) }));
    Object.keys(GG.content.logo.rivals).filter(id => !GG.content.logo.rivals[id].same).forEach(id => {
      const nm = (GG.content.rivals[id] && GG.content.rivals[id].name) || (GG.content.rivalry.scene.filter(x => x.id === id)[0] || {}).name || id;
      out.rivals.push({ id: nm, src: R.dataURL(L.rival(id), nm, 160, { badge: 'round' }) });
    });
    return out;
  });
  await page.setViewportSize({ width: 2080, height: 1000 });
  const cell = (src, cap, w) => '<div style="width:' + w + 'px"><img style="width:' + w + 'px;display:block" src="' + src + '"><div style="padding:2px 0 6px;font-size:13px">' + cap + '</div></div>';
  const html = '<body style="margin:0;background:#20242e;color:#eee;font:700 15px sans-serif;padding:10px">' +
    '<div style="font-size:22px;margin:0 0 8px">v0.8.1 band logo: every emblem × lettering style (colour pairs rotate) · rivals · colour pairs · every reuse site</div>' +
    '<div style="display:flex;gap:16px;align-items:flex-start"><div style="display:grid;grid-template-columns:repeat(8,110px);gap:6px">' +
    grid.rows.map(r => r.cells.map((s, j) => cell(s, j ? '' : r.id, 110)).join('')).join('') + '</div>' +
    '<div><div style="display:grid;grid-template-columns:repeat(6,120px);gap:6px">' + grid.rivals.map(r => cell(r.src, r.id, 120)).join('') + '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(7,100px);gap:6px;margin-top:10px">' + grid.pals.map(p => cell(p.src, p.id, 100)).join('') + '</div></div></div>' +
    '<div style="display:grid;grid-template-columns:repeat(8,245px);gap:10px;margin-top:14px">' +
    have.map(n => '<div><div style="padding:4px 0">' + n[1] + '</div><img style="width:245px;display:block" src="data:image/png;base64,' + fs.readFileSync(path.join(CACHE, n[0] + '.png')).toString('base64') + '"></div>').join('') + '</div></body>';
  try {
    await page.setContent(html, { timeout: 90000 }); await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(CACHE, 'v081_logo_sheet.png'), fullPage: true, timeout: 90000 });
  } catch (e) { console.log('sheet failed: ' + String(e.message || e).slice(0, 200)); }
  console.log('sheet: tests/.cache/v081_logo_sheet.png' + (errors.length ? ' (errors: ' + errors.slice(0, 2).join(' | ') + ')' : ''));
  await close();
}

(async () => {
  fs.mkdirSync(CACHE, { recursive: true });
  if (want('picker')) await picker();
  if (want('reuse')) await reuse();
  if (want('meta')) await meta();
  if (!ONLY.length || ONLY.includes('sheet')) await sheet();
})();
