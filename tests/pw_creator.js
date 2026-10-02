// pw_creator.js: the v0.8 full character creator + kit look (lane CREATOR) on a 390x844 phone viewport.
// Sections (META_ONLY=creator|kit|stage|meta|gear, comma-separated; default all + the contact sheet). Each fits `timeout 500`.
//   meta:    (v1.0, Lane M) parts a finished career unlocked work in every genre with a 🏆 chip (punk + country new careers,
//            a running rock career); the career's own unlock list is unchanged. Screenshot creator_meta.png.
//   creator: new career with carried-over unlocks (carry-toggle) → "Customize" → the 'look' screen (live 3D preview, 7 tabs,
//            layout audit) → body / face / hair / clothes → Stage (leather vest, corpse paint; the cape is locked: toast) →
//            Ink (a forearm maple leaf, knuckles typed "lo7ve!" -> LOVE, "abcdef" -> ABCD -> HATE, the Hands view) → Kit
//            (wood, custom kick text, locked pyro) → Done → the custom card → Start → the career has it all.
//            Screenshots creator_body/face/stage/knuckles/kit.png.
//   kit:     a late career: kit looks in the garage and on stage (finish, black hardware, kick-head art, leather throne,
//            gold sticks, cowbell, hair fan); pyro only at arena shows (a bar: none; the Sad Dome: fires on moments); no
//            gong ever; ☰ → Look mid-career edits the career. Screenshots garage_kit.png, stage_pyro.png, stage_kick.png,
//            kit_wood/sparkle/camo.png (preview crops).
//   stage:   the stage look switches on by itself (the stage, spectator view, the red carpet) while the garage keeps the
//            everyday look; an old (v0.7) save migrates to stage look = everyday look and the v0.7 kit.
//            Screenshots stage_look.png, carpet_look.png.
//   gear:    (v1.1 "Seats", Lane C) a bass / rhythm / lead career: ☰ → Look has "Your gear" instead of Kit (the title asks
//            who's on bass / guitar); every body shape (3-4 per seat), every pickguard, a colour + the kit colour, the logo
//            sticker drive the preview's 'gear' mode; the controls are >= 48 px; Done saves player.gearLook and the garage
//            draws it; the new-career creator hands { gearLook } to onDone; a drum career keeps the Kit tab (no gear tab).
//            Screenshots creator_gear_bass/rhythm/lead.png.
//   sheet:   tiles the screenshots into tests/.cache/v08_creator_sheet.png.
// Run: node build.js && META_ONLY=creator timeout 500 node tests/pw_creator.js
const path = require('path'), fs = require('fs');
const { open, checker } = require('./_pw');
const CACHE = path.join(__dirname, '.cache');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);

const tid = id => `[data-testid="${id}"]`;
const tap = (page, id) => page.locator(tid(id)).last().click();
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });
const dbg = page => page.evaluate(() => GG.debug('creator-ui'));
const shot = (page, name) => page.screenshot({ path: path.join(CACHE, name) });
const toastText = page => page.evaluate(() => { const n = document.querySelector('[data-testid="lk-lock"]'); return n && n.classList.contains('on') ? n.textContent : ''; });   // the lock note over the preview

function audit(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const cs = getComputedStyle(e); return cs.visibility === 'hidden' || cs.display === 'none' ? null : r; };
    const name = e => (e.dataset.testid || e.className || e.tagName) + '';
    for (const e of document.querySelectorAll('#screens *')) { const r = vis(e); if (r && (r.right > W + 1 || r.left < -1)) bad.push('overflow ' + name(e)); }
    for (const sc of document.querySelectorAll('.sheet-body, .full-body, .lk-panel')) if (sc.scrollWidth > sc.clientWidth + 1) bad.push('hscroll ' + sc.className);
    for (const b of document.querySelectorAll('#screens button')) { const r = vis(b); if (r && (r.width < 43.5 || r.height < 43.5)) bad.push('small ' + name(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
    return bad.slice(0, 8);
  });
}
async function frames(page, n) {
  const f0 = await page.evaluate(() => GG.render.preview.info().frames);
  await page.waitForFunction(a => GG.render.preview.info().frames >= a, f0 + (n || 4), { timeout: 8000 });
}
// A career with everything unlocked (a World-era year-6 band with a Loonie and a platinum record).
async function lateCareer(page, seed) {
  await page.waitForFunction(() => window.GG && GG.main && GG.creator && GG.ui.openLook, null, { timeout: 15000 });
  await page.evaluate(seed => {
    GG.main.quickStart({ seed: seed || 808, openCard: false });
    GG.ui.closeAll();
    const s = GG.state;
    Object.assign(s, { era: 'world', protected: false, fans: 30000, fund: 50000 });
    s.milestones.firstGig = 2; s.milestones.firstSong = 2;
    s.trophies.push({ kind: 'platinum', title: 'Lawn of the Dead', year: 4 }, { kind: 'loonie', title: 'Live act', year: 5 });
    GG.creator.checkUnlocks(s);
    GG.main.sync();
  }, seed);
}

/* ---- creator ----------------------------------------------------------------------------------------------------- */
async function creator() {
  const c = checker('creator');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => { localStorage.removeItem('gg.v1.unlocks.punk'); localStorage.setItem('gg.v1.unlocks.metal', JSON.stringify({ ids: ['tatSpot.knuckles', 'outfit.leathervest', 'hairStyle.mohawk'] })); });
    await tap(page, 'btn-new'); await tap(page, 'slot-1'); await tap(page, 'genre-metal'); await tap(page, 'btn-intro-next'); await tap(page, 'btn-logo-done');   // v0.8.1: the logo picker
    await waitScreen(page, 'creator');
    const carry = await page.evaluate(() => { const b = document.querySelector('[data-testid="carry-toggle"]'); return { on: b.checked, dis: b.disabled, t: b.parentNode.textContent }; });
    c.ok(carry.on && !carry.dis && /3 unlocks from past metal careers/.test(carry.t), 'carry-over toggle offered + on: ' + JSON.stringify(carry));
    c.ok(await page.locator(tid('btn-customize')).isVisible() && !(await page.locator(tid('preset-custom')).count()), 'customize button, no custom card yet');
    await page.fill(tid('creator-name'), 'Tanner');
    await tap(page, 'btn-customize');
    await waitScreen(page, 'look');
    await frames(page, 4);
    let d = await dbg(page);
    c.ok(d.open && d.mode === 'new' && d.which === 'everyday' && d.tab === 'body' && d.preview.mounted && d.preview.frames > 3, 'the look screen + live preview ' + JSON.stringify(d.preview));
    c.ok(await page.locator('.lk-tab').count() === 7 && await page.locator(tid('lk-count')).isVisible(), '7 tabs + unlock count');
    let a = await audit(page); c.ok(!a.length, 'body tab layout ' + a.join(', '));
    // Body
    await tap(page, 'lk-opt-build-big');
    await page.evaluate(() => { const h = document.querySelector('[data-testid="lk-height"]'); h.value = '1.07'; h.dispatchEvent(new Event('input', { bubbles: true })); });
    await tap(page, 'lk-opt-age-grizzled'); await tap(page, 'lk-sw-skin-7');
    d = await dbg(page);
    c.ok(d.look.build === 1.2 && d.look.height === 1.07 && d.look.age === 'grizzled' && d.look.skin === '#8d5a3b' && d.stage.build === 1.2, 'body: big unit, 1.07, grizzled, skin; shared with the stage look');
    await frames(page, 3); await shot(page, 'creator_body.png');
    // Face
    await tap(page, 'lk-tab-face');
    c.ok((await dbg(page)).view === 'face', 'the Face tab zooms in');
    await tap(page, 'lk-opt-eyes-big'); await tap(page, 'lk-sw-eyeColor-2'); await tap(page, 'lk-opt-brows-angry'); await tap(page, 'lk-opt-nose-broken'); await tap(page, 'lk-opt-mouth-grin');
    await tap(page, 'lk-opt-facialHair-handlebar');
    c.ok(/🔒 Handlebar moustache: Reach 100 fans/.test(await toastText(page)), 'a locked part says what unlocks it: ' + await toastText(page));
    await tap(page, 'lk-opt-facialHair-goatee'); await tap(page, 'lk-opt-glasses-round');
    d = await dbg(page);
    c.ok(d.look.face.eyes === 'big' && d.look.face.eyeColor === '#3a78c8' && d.look.face.mouth === 'grin' && d.look.facialHair === 'goatee' && d.look.glasses === 'round', 'face parts ' + JSON.stringify(d.look.face));
    await frames(page, 3); await shot(page, 'creator_face.png');
    a = await audit(page); c.ok(!a.length, 'face tab layout ' + a.join(', '));
    // Hair
    await tap(page, 'lk-tab-hair');
    await tap(page, 'lk-opt-hairStyle-mohawk');
    await tap(page, 'lk-opt-hairColor-pink');
    c.ok(/Pink: Reach Local Heroes/.test(await toastText(page)), 'dyes are gated');
    await tap(page, 'lk-opt-hairColor-ginger');
    d = await dbg(page);
    c.ok(d.look.hairStyle === 'mohawk' && d.look.hair === '#c0622a' && d.stage.hairStyle === 'mohawk', 'the carried-over mohawk, ginger');
    // Clothes (everyday)
    await tap(page, 'lk-tab-clothes');
    await tap(page, 'lk-opt-top-tank'); await tap(page, 'lk-sw-shirt-4'); await tap(page, 'lk-opt-bottom-cargo'); await tap(page, 'lk-opt-shoes-crocs'); await tap(page, 'lk-opt-headwear-toque');
    d = await dbg(page);
    c.ok(d.look.top === 'tank' && d.look.shirt === '#b3262b' && d.look.bottom === 'cargo' && d.look.shoes === 'crocs' && d.look.headwear === 'toque' && d.stage.top !== 'tank', 'everyday clothes only on the everyday look');
    a = await audit(page); c.ok(!a.length, 'clothes tab layout ' + a.join(', '));
    // Stage
    await tap(page, 'lk-tab-stage');
    await tap(page, 'lk-opt-outfit-leathervest'); await tap(page, 'lk-opt-stageExtra-corpsepaint');
    await tap(page, 'lk-opt-stageExtra-cape');
    c.ok(/A cape of your own: Win a Loonie/.test(await toastText(page)), 'the cape waits for a Loonie');
    d = await dbg(page);
    c.ok(d.which === 'stage' && d.stage.outfit === 'leathervest' && d.stage.stageExtras.join() === 'corpsepaint' && !d.look.outfit, 'stage outfit on the stage look only ' + JSON.stringify([d.stage.outfit, d.stage.stageExtras]));
    await frames(page, 3); await shot(page, 'creator_stage.png');
    // Ink: a forearm maple leaf, knuckles (A–Z, four per hand)
    await tap(page, 'lk-tab-ink');
    await tap(page, 'lk-arm-L-half'); await page.locator('.lk-sec').filter({ hasText: 'Left arm' }).locator(tid('lk-opt-tatDesign-maple')).click();
    await tap(page, 'lk-arm-R-full');
    c.ok(/Full right sleeve: Reach 250 fans/.test(await toastText(page)), 'full sleeves are gated');
    await page.fill(tid('lk-knuckles-right'), 'lo7ve!');
    c.ok(await page.inputValue(tid('lk-knuckles-right')) === 'LOVE', 'typed "lo7ve!" -> LOVE');
    await page.fill(tid('lk-knuckles-left'), 'abcdef');
    c.ok(await page.inputValue(tid('lk-knuckles-left')) === 'ABCD', 'four letters max');
    await page.fill(tid('lk-knuckles-left'), 'hate');
    d = await dbg(page);
    c.ok(d.look.knuckles.right === 'LOVE' && d.look.knuckles.left === 'HATE' && d.stage.knuckles.left === 'HATE' && d.view === 'hands', 'knuckles on both looks, the Hands view');
    c.ok(d.look.tattoos.some(t => t.spot === 'halfL' && t.design === 'maple'), 'a maple leaf on the left forearm');
    await frames(page, 4);
    c.ok((await page.evaluate(() => GG.render.preview.info())).pose === 'fists', 'fists to the camera');
    await tap(page, 'lk-which-everyday'); await frames(page, 4);
    await shot(page, 'creator_knuckles.png');
    a = await audit(page); c.ok(!a.length, 'ink tab layout ' + a.join(', '));
    // Kit
    await tap(page, 'lk-tab-kit'); await frames(page, 4);
    c.ok(await page.evaluate(() => { const i = GG.render.preview.info(); return i.mode === 'kit' && i.kit && i.art; }), 'kit preview with the band logo on the kick');
    await tap(page, 'lk-opt-shell-wood'); await tap(page, 'lk-sw-kitColor-1'); await tap(page, 'lk-opt-head-text');
    await page.fill(tid('lk-headtext'), 'Moose Jaw <3'); await page.locator(tid('lk-headtext')).dispatchEvent('change');
    await tap(page, 'lk-opt-kitExtra-pyro');
    c.ok(/Pyro: Reach the World Stage/.test(await toastText(page)), 'pyro is an era unlock');
    await tap(page, 'lk-opt-sticks-black');
    d = await dbg(page);
    c.ok(d.kit.shell === 'wood' && d.kit.color === '#2f5aa8' && d.kit.head === 'text' && d.kit.headText === 'MOOSE JAW 3' && d.kit.sticks === '#1c1c20' && d.kit.throne === 'crate' && !d.kit.extras.length, 'kit look ' + JSON.stringify(d.kit));
    c.ok(!(await page.locator('[data-testid^="lk-opt-kitExtra-"]').allTextContents()).some(t => /gong/i.test(t)), 'no gong on the kit, ever');
    await frames(page, 4); await shot(page, 'creator_kit.png');
    a = await audit(page); c.ok(!a.length, 'kit tab layout ' + a.join(', '));
    // Done -> back to the creator (custom card) -> Start
    await tap(page, 'lk-done');
    await waitScreen(page, 'creator');
    c.ok(await page.locator(tid('preset-custom')).getAttribute('aria-pressed') === 'true' && await page.evaluate(() => !GG.render.preview.info().mounted), 'the custom card is picked, the preview is gone');
    await tap(page, 'btn-create'); await waitScreen(page, 'coldopen'); await tap(page, 'btn-coldopen-skip');
    await page.waitForFunction(() => GG.state && GG.state.phase, null, { timeout: 10000 });
    const pl = await page.evaluate(() => ({ p: GG.state.player, u: GG.state.unlocks.creator, v8: GG.creator.isV8(GG.state.player.look) }));
    c.ok(pl.v8 && pl.p.look.hairStyle === 'mohawk' && pl.p.look.top === 'tank' && pl.p.look.knuckles.right === 'LOVE' && pl.p.look.outfit === undefined, 'the everyday look made it');
    c.ok(pl.p.stageLook.outfit === 'leathervest' && pl.p.stageLook.stageExtras.join() === 'corpsepaint' && pl.p.stageLook.hairStyle === 'mohawk' && pl.p.stageLook.top !== 'tank', 'the stage look made it');
    c.ok(pl.p.kit.shell === 'wood' && pl.p.kit.headText === 'MOOSE JAW 3' && pl.p.kitColor === pl.p.kit.color && pl.u.includes('tatSpot.knuckles') && pl.u.includes('outfit.leathervest'), 'kit + carried unlocks');
    const g = await page.evaluate(() => GG.debug('render'));
    c.ok(g.scene === 'garage' && g.kitColor === pl.p.kit.color, 'the garage has your kit ' + g.kitColor);
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'creator threw: ' + (e.stack || e).toString().slice(0, 400)); }
  await close(); c.done();
}

/* ---- kit --------------------------------------------------------------------------------------------------------- */
async function kit() {
  const c = checker('kit');
  const { page, errors, close } = await open({ query: '?quick=1&seed=808' });
  try {
    await lateCareer(page);
    c.ok(await page.evaluate(() => { const k = GG.state.player.kit; return k.throne === 'crate' && k.head === 'logo' && GG.debug('render').kitColor === k.color; }), 'a new career: milk crates, the logo on the kick');
    await page.evaluate(() => {
      GG.creator.apply(GG.state, { kit: { shell: 'flames', color: '#141418', hardware: 'black', head: 'logo', throne: 'leather', sticks: '#e0b640', extras: ['cowbell', 'fan', 'pyro', 'gong'] } });
      GG.main.sync();
    });
    const k = await page.evaluate(() => GG.state.player.kit);
    c.ok(k.extras.join() === 'cowbell,fan,pyro' && !JSON.stringify(k).includes('gong'), 'a gong never survives: ' + k.extras);
    await page.waitForTimeout(300);
    await page.evaluate(() => { ['hud', 'screens', 'toast'].forEach(id => { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; }); });
    await shot(page, 'garage_kit.png');
    await page.evaluate(() => { ['hud', 'screens', 'toast'].forEach(id => { const e = document.getElementById(id); if (e) e.style.visibility = ''; }); });
    // A bar: no pyro. The Sad Dome (19,000): pyro fires on moments.
    const bar = await page.evaluate(async () => {
      const st = GG.state; GG.render.setScene('stage'); GG.render.setPaused(false);
      GG.render.stage.setup({ venue: { venueId: 'gopher', kind: 'bar', name: 'The Gopher Hole', capacity: 150, tier: 1 }, crowd: 80, members: st.members, flags: st.flags, genre: 'metal', player: st.player, bpm: 150 });
      await new Promise(r => setTimeout(r, 400));
      return GG.render.stage.info();
    });
    c.ok(bar.kit && bar.kit.shell === 'flames' && bar.kit.throne === 'leather' && bar.kit.art && bar.kit.fan && !bar.kit.arena && !bar.kit.pyro, 'the kit on a bar stage, no pyro ' + JSON.stringify(bar.kit));
    c.ok(bar.drummerV8 === false || bar.drummerV8 === true, 'drummer built');
    const dome = await page.evaluate(async () => {
      const st = GG.state, v = GG.content.rivalry.venues.filter(x => x.id === 'sad_dome')[0];
      GG.render.stage.setup({ venue: v, crowd: 150, members: st.members, flags: st.flags, genre: 'metal', player: st.player, bpm: 150 });
      GG.render.stage.setCrowdLevel(95, true);
      await new Promise(r => setTimeout(r, 700));
      const before = GG.render.stage.info().kit.bursts;
      GG.render.stage.moment('mosh');
      await new Promise(r => setTimeout(r, 250));
      return { info: GG.render.stage.info(), before: before };
    });
    c.ok(dome.info.kit.arena && dome.info.kit.pyro && dome.info.kit.bursts > dome.before, 'the Sad Dome: pyro fires on a moment ' + JSON.stringify(dome.info.kit));
    await page.evaluate(async () => { ['hud', 'screens', 'toast'].forEach(id => { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; }); await new Promise(r => setTimeout(r, 700)); GG.render.stage.moment('lighters'); await new Promise(r => setTimeout(r, 90)); });
    await shot(page, 'stage_pyro.png');
    await page.evaluate(async () => {
      const st = GG.state, v = GG.content.rivalry.venues.filter(x => x.id === 'sad_dome')[0];
      GG.render.stage.setup({ venue: v, crowd: 150, members: st.members, flags: st.flags, genre: 'metal', player: st.player, bpm: 150, view: 'spectator' });
      await new Promise(r => setTimeout(r, 500));
    });
    await shot(page, 'stage_kick.png');
    await page.evaluate(() => { ['hud', 'screens', 'toast'].forEach(id => { const e = document.getElementById(id); if (e) e.style.visibility = ''; }); GG.render.setScene('garage'); GG.main.sync(); });
    // ☰ → Look mid-career: kit finishes in the preview, then a change that sticks.
    await page.evaluate(() => GG.ui.show('menu'));
    await tap(page, 'menu-look');
    await waitScreen(page, 'look');
    let d = await dbg(page);
    c.ok(d.mode === 'career' && d.kit.shell === 'flames' && d.look.hairStyle, 'the look screen opens on the career');
    await tap(page, 'lk-tab-kit');
    for (const f of ['wood', 'sparkle', 'camo']) {
      await tap(page, 'lk-opt-shell-' + f); await frames(page, 4);
      await page.locator('.lk-stagewrap').screenshot({ path: path.join(CACHE, 'kit_' + f + '.png') });
    }
    await tap(page, 'lk-opt-throne-stool'); await tap(page, 'lk-opt-head-moose');
    await tap(page, 'lk-tab-hair'); await tap(page, 'lk-opt-hairStyle-spikes');
    await tap(page, 'lk-done');
    await page.waitForFunction(() => !GG.ui.isOpen('look'));
    const after = await page.evaluate(() => ({ k: GG.state.player.kit, h: GG.state.player.look.hairStyle, sh: GG.state.player.stageLook.hairStyle, c: GG.debug('render').kitColor }));
    c.ok(after.k.shell === 'camo' && after.k.throne === 'stool' && after.k.head === 'moose' && after.h === 'spikes' && after.sh === 'spikes' && after.c === after.k.color, 'Done applies it to the career ' + JSON.stringify(after).slice(0, 160));
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'kit threw: ' + (e.stack || e).toString().slice(0, 400)); }
  await close(); c.done();
}

/* ---- stage ------------------------------------------------------------------------------------------------------- */
async function stage() {
  const c = checker('stage');
  const { page, errors, close } = await open({ query: '?quick=1&seed=909' });
  try {
    await lateCareer(page, 909);
    await page.evaluate(() => {
      const s = GG.state, C = GG.creator;
      const L = Object.assign(C.expand(s.player.look), { hairStyle: 'long', hair: '#15110f', top: 'flannel', shirt: '#b3262b', headwear: 'toque', facialHair: 'stubble',
        tattoos: [{ spot: 'sleeveL', design: 'skull' }, { spot: 'halfR', design: 'flames' }, { spot: 'chest', design: 'moose' }], knuckles: { left: 'HAIL', right: 'DMGE' }, piercings: ['hoops', 'eyebrow'] });
      const S = Object.assign(C.expand(L), { outfit: 'shirtless', stageExtras: ['corpsepaint', 'wristbands', 'cape'], headwear: 'none' });
      C.apply(s, { look: L, stageLook: S, kit: { shell: 'sparkle', color: '#6a2a8a', head: 'face', throne: 'leather', extras: ['fan'] } });
      GG.main.sync();
    });
    const pl = await page.evaluate(() => GG.state.player);
    c.ok(pl.look.top === 'flannel' && !pl.look.outfit && pl.stageLook.outfit === 'shirtless' && pl.stageLook.stageExtras.length === 3 && pl.stageLook.hairStyle === 'long', 'two looks, one person');
    const st = await page.evaluate(async () => {
      const s = GG.state; GG.render.setScene('stage'); GG.render.setPaused(false);
      GG.render.stage.setup({ venue: { venueId: 'club', kind: 'club', name: 'The Club', capacity: 450, tier: 2 }, crowd: 120, members: s.members, flags: s.flags, genre: 'metal', player: s.player, bpm: 150, view: 'spectator' });
      GG.render.stage.setCrowdLevel(80, true);
      await new Promise(r => setTimeout(r, 500));
      return GG.render.stage.info();
    });
    c.ok(st.built && st.drummerV8 && st.kit.head === 'face' && st.kit.art && !st.kit.pyro, 'on stage: the stage look + kit ' + JSON.stringify({ v8: st.drummerV8, kit: st.kit }));
    await page.evaluate(() => { ['hud', 'screens', 'toast'].forEach(id => { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; }); });
    await shot(page, 'stage_look.png');
    const cp = await page.evaluate(async () => {
      const s = GG.state; GG.render.setScene('carpet');
      GG.render.carpet.setup({ members: s.members, player: s.player, flags: s.flags, outfit: null, rival: { name: 'Tundra Wraith' }, genre: 'metal', year: 6 });
      for (let i = 0; i < 60 && GG.render.carpet.info().walking; i++) await new Promise(r => setTimeout(r, 150));
      return GG.render.carpet.info();
    });
    c.ok(cp.built && cp.band.includes('player') && cp.walking === 0, 'the red carpet: the band walked in, you in your stage look ' + JSON.stringify(cp).slice(0, 120));
    await shot(page, 'carpet_look.png');
    await page.evaluate(() => { ['hud', 'screens', 'toast'].forEach(id => { const e = document.getElementById(id); if (e) e.style.visibility = ''; }); GG.render.setScene('garage'); GG.main.sync(); });
    // An old (v0.7) save: no stage look, no kit look, no unlocks -> migrated, looks exactly like before.
    const old = await page.evaluate(() => {
      const s = JSON.parse(JSON.stringify(GG.state));
      s.v = 8; delete s.player.stageLook; delete s.player.kit; delete s.unlocks; s.player.kitColor = '#1f8a4c';
      s.player.look = { skin: '#f0c9a4', hair: '#6b4226', hairStyle: 'mullet', shirt: '#4a6fa5', pants: '#35507a', height: 1.0, build: 1.05, extras: ['moustache'] };
      const m = GG.main.loadState(JSON.parse(JSON.stringify(s)), { slot: '2' });
      GG.ui.closeAll();
      return { stage: m.player.stageLook, look: m.player.look, kit: m.player.kit, u: m.unlocks.creator.length, v8: GG.creator.isV8(m.player.stageLook), c: GG.debug('render').kitColor };
    });
    c.ok(JSON.stringify(old.stage) === JSON.stringify(old.look) && !old.v8 && old.kit.throne === 'stool' && old.kit.head === 'plain' && old.kit.shell === 'paint' && old.c === '#1f8a4c' && old.u > 20, 'an old save: stage look = everyday look, the v0.7 kit ' + JSON.stringify(old.kit));
    const st2 = await page.evaluate(async () => {
      const s = GG.state; GG.render.setScene('stage');
      GG.render.stage.setup({ venue: { venueId: 'club', kind: 'club', capacity: 450 }, crowd: 100, members: s.members, flags: s.flags, genre: 'metal', player: s.player, bpm: 150 });
      await new Promise(r => setTimeout(r, 300));
      const i = GG.render.stage.info(); GG.render.setScene('garage'); GG.main.sync(); return i;
    });
    c.ok(st2.drummerV8 === false && st2.kit.throne === 'stool' && !st2.kit.art, 'the old save plays in its old look');
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'stage threw: ' + (e.stack || e).toString().slice(0, 400)); }
  await close(); c.done();
}

/* ---- meta (v1.0, Lane M: owner Q5) -------------------------------------------------------------------------------- */
// Creator parts some finished career unlocked (GG.meta 'parts') work in every genre: the new-career creator notes them
// (meta-parts), the look screen shows them open with a 🏆 chip in punk and country, and a running rock career lets you
// wear them (GG.creator.parts(state) flags them meta). The career's own unlock list never changes because of them.
async function meta() {
  const c = checker('meta');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.waitForFunction(() => GG.meta && GG.meta.enabled);
    await page.evaluate(() => { ['punk', 'country', 'rock', 'metal'].forEach(g => localStorage.removeItem('gg.v1.unlocks.' + g)); GG.meta.unlock('parts', ['hairStyle.dreads', 'outfit.leathervest']); });
    for (const [genre, slot] of [['punk', 'slot-1'], ['country', 'slot-2']]) {
      await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('title'); });
      await tap(page, 'btn-new'); await tap(page, slot); await tap(page, 'genre-' + genre); await tap(page, 'btn-intro-next'); await tap(page, 'btn-logo-done');
      await waitScreen(page, 'creator');
      const note = await page.evaluate(() => (document.querySelector('[data-testid="meta-parts"]') || {}).textContent || '');
      c.ok(/2 looks from finished careers/.test(note), genre + ': the creator notes the looks from finished careers ' + note);
      await tap(page, 'btn-customize');
      await waitScreen(page, 'look');
      await tap(page, 'lk-tab-hair');
      const opt = await page.evaluate(() => { const b = document.querySelector('[data-testid="lk-opt-hairStyle-dreads"]'); return b ? { meta: b.dataset.meta, locked: b.classList.contains('locked'), t: b.textContent } : null; });
      c.ok(opt && opt.meta === '1' && !opt.locked && /🏆/.test(opt.t), genre + ': dreads open with a 🏆 chip ' + JSON.stringify(opt));
      const other = await page.evaluate(() => { const b = document.querySelector('[data-testid="lk-opt-hairStyle-braids"]'); return b ? { locked: b.classList.contains('locked'), meta: b.dataset.meta || null } : null; });
      c.ok(other && other.locked && !other.meta, genre + ': a part nobody unlocked stays locked ' + JSON.stringify(other));
      await tap(page, 'lk-opt-hairStyle-dreads');
      const bad = await audit(page); c.ok(!bad.length, genre + ': look screen layout ' + bad.join(', '));
      if (genre === 'punk') await shot(page, (process.env.PW_TAG ? 'creator_meta' + process.env.PW_TAG : 'creator_meta') + '.png');
      await tap(page, 'lk-done');
      await waitScreen(page, 'creator');
      await page.fill(tid('creator-name'), 'Meta');
      await tap(page, 'btn-create');
      await waitScreen(page, 'coldopen');
      const st = await page.evaluate(() => ({ hair: GG.state.player.look.hairStyle, own: GG.state.unlocks.creator.includes('hairStyle.dreads') }));
      c.ok(st.hair === 'dreads' && !st.own, genre + ': the career wears it (its own unlock list unchanged) ' + JSON.stringify(st));
    }
    const rock = await page.evaluate(() => { GG.main.quickStart({ seed: 3, bandId: 'gravel_kings', openCard: false }); const p = GG.creator.parts(GG.state, 'outfit').find(x => x.id === 'outfit.leathervest');
      const L = GG.creator.lockLook(GG.state, Object.assign({}, GG.state.player.stageLook, { outfit: 'leathervest' })); return { meta: p.meta, locked: p.locked, kept: L.outfit }; });
    c.ok(rock.meta && !rock.locked && rock.kept === 'leathervest', 'a running rock career can wear it (lockLook keeps it) ' + JSON.stringify(rock));
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'meta threw: ' + (e.stack || e).toString().slice(0, 500)); }
  await close(); c.done();
}

/* ---- v1.1 gear ---------------------------------------------------------------------------------------------------- */
async function gear() {
  const c = checker('gear');
  const { page, errors, close } = await open();
  const SEATS = { bass: ['hail_damage', 'Who’s on bass?'], rhythm: ['grid_road_ramblers', 'Who’s on guitar?'], lead: ['frost_heave', 'Who’s on guitar?'] };
  try {
    await page.waitForFunction(() => window.GG && GG.main && GG.creator && GG.ui.openLook, null, { timeout: 15000 });
    for (const seat of Object.keys(SEATS)) {
      const [band, title] = SEATS[seat];
      await page.evaluate(([band, seat]) => { GG.main.quickStart({ seed: 909, openCard: false, bandId: band, seat }); GG.ui.closeAll(); GG.main.sync(); }, [band, seat]);
      await page.evaluate(() => GG.ui.show('menu'));
      await tap(page, 'menu-look');
      await waitScreen(page, 'look');
      let d = await dbg(page);
      const tabs = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid^="lk-tab-"]')).map(e => e.dataset.testid));
      const ttl = await page.evaluate(() => (document.querySelector('.lk-title') || {}).textContent);
      c.ok(d.mode === 'career' && d.seat === seat && tabs.includes('lk-tab-gear') && !tabs.includes('lk-tab-kit') && tabs.length === 7, seat + ': Your gear replaces Kit ' + tabs.join(','));
      c.ok(ttl === title, seat + ': the title asks ' + ttl);
      await tap(page, 'lk-tab-gear');
      await frames(page, 3);
      d = await dbg(page);
      const shapes = await page.evaluate(seat => GG.contracts.GEAR_SHAPES[seat], seat);
      c.ok(d.tab === 'gear' && d.preview.mode === 'gear' && /^seat\|/.test(d.preview.gear || ''), seat + ': the preview plays your instrument ' + d.preview.gear);
      const seen = [];
      for (const sh of shapes) {
        await tap(page, 'lk-gear-shape-' + sh); await frames(page, 2);
        d = await dbg(page); seen.push(d.gearLook.shape + '>' + (d.preview.gear || '').split('|')[2]);
      }
      c.ok(shapes.length >= 3 && shapes.length <= 4 && seen.every((x, i) => x === shapes[i] + '>' + shapes[i]), seat + ': every body shape (' + shapes.length + ') reaches the preview ' + seen.join(' '));
      const guards = await page.evaluate(() => GG.contracts.GEAR_GUARDS), gseen = [];
      for (const g of guards) { await tap(page, 'lk-gear-guard-' + g); await frames(page, 2); d = await dbg(page); gseen.push((d.preview.gear || '').split('|')[4]); }
      c.ok(gseen.join() === guards.join(), seat + ': every pickguard ' + gseen.join(','));
      await tap(page, 'lk-gear-sw-3'); await frames(page, 2);
      d = await dbg(page);
      const sw3 = await page.evaluate(() => GG.content.creator.swatches.kit[3].toLowerCase());
      c.ok(d.gearLook.color === sw3 && (d.preview.gear || '').split('|')[3] === sw3, seat + ': a colour swatch ' + d.gearLook.color);
      await tap(page, 'lk-gear-color-kit'); await frames(page, 2);
      d = await dbg(page);
      c.ok(d.gearLook.color === null, seat + ': back to the kit colour (null)');
      await tap(page, 'lk-gear-sw-1');
      await tap(page, 'lk-gear-guard-tortoise');
      await tap(page, 'lk-gear-sticker-logo'); await frames(page, 4);
      d = await dbg(page);
      c.ok(d.gearLook.sticker === 'logo' && d.preview.sticker === true, seat + ': the logo sticker on the headstock');
      const small = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid^="lk-gear-"]')).map(e => { const r = e.getBoundingClientRect(); return [e.dataset.testid, Math.round(r.width), Math.round(r.height)]; }).filter(x => x[1] && (x[1] < 48 || x[2] < 48)));
      c.ok(!small.length, seat + ': every gear control >= 48 px ' + JSON.stringify(small.slice(0, 4)));
      const bad = await audit(page);
      c.ok(!bad.length, seat + ': layout audit ' + bad.join(' | '));
      await tap(page, 'lk-gear-shape-' + shapes[shapes.length - 1]); await frames(page, 6);
      await page.locator('.lk-stagewrap').screenshot({ path: path.join(CACHE, 'creator_gear_' + seat + '.png') });
      await tap(page, 'lk-done');
      await page.waitForFunction(() => !GG.ui.isOpen('look'));
      const after = await page.evaluate(() => ({ g: GG.state.player.gearLook, r: GG.debug('render').seat }));
      c.ok(after.g.shape === shapes[shapes.length - 1] && after.g.guard === 'tortoise' && after.g.sticker === 'logo' && /^#/.test(after.g.color), seat + ': Done saves gearLook ' + JSON.stringify(after.g));
      c.ok(after.r && after.r.gear && after.r.gear.split('|')[2] === after.g.shape && after.r.sticker, seat + ': the garage draws it ' + JSON.stringify(after.r));
    }
    // The new-career creator (51 opens it with { seat }): onDone gets the gear look.
    const out = await page.evaluate(() => new Promise(res => {
      GG.ui.closeAll();
      GG.ui.openLook({ mode: 'new', seat: 'lead', genre: 'metal', bandId: 'hail_damage', band: 'Hail Damage', onDone: o => res(o) });
      setTimeout(() => {
        document.querySelector('[data-testid="lk-tab-gear"]').click();
        setTimeout(() => { document.querySelector('[data-testid="lk-gear-shape-pointy"]').click(); setTimeout(() => document.querySelector('[data-testid="lk-done"]').click(), 120); }, 120);
      }, 200);
    }));
    c.ok(out && out.gearLook && out.gearLook.shape === 'pointy' && out.look && out.kit, 'new career: onDone carries { gearLook } ' + JSON.stringify(out && out.gearLook));
    // A drum career: the Kit tab, no gear tab (v1.0).
    await page.evaluate(() => { GG.main.quickStart({ seed: 910, openCard: false }); GG.ui.closeAll(); GG.ui.show('menu'); });
    await tap(page, 'menu-look'); await waitScreen(page, 'look');
    const dt = await page.evaluate(() => ({ t: Array.from(document.querySelectorAll('[data-testid^="lk-tab-"]')).map(e => e.dataset.testid), title: (document.querySelector('.lk-title') || {}).textContent, d: GG.debug('creator-ui') }));
    c.ok(dt.t.includes('lk-tab-kit') && !dt.t.includes('lk-tab-gear') && dt.title === 'Who’s on drums?' && dt.d.seat === 'drums', 'drums: the Kit tab and the v1.0 title ' + dt.t.join(','));
    await tap(page, 'lk-cancel');
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'gear threw: ' + (e.stack || e).toString().slice(0, 400)); }
  await close(); c.done();
}

/* ---- the contact sheet ------------------------------------------------------------------------------------------- */
async function sheet() {
  const names = [['creator_body', 'Creator: body'], ['creator_face', 'Creator: face'], ['creator_stage', 'Creator: stage look'], ['creator_knuckles', 'Knuckle tattoos'],
    ['creator_kit', 'Creator: kit'], ['garage_kit', 'Garage: kit look'], ['stage_pyro', 'Sad Dome: pyro'], ['stage_kick', 'Kick-head art (crowd view)'],
    ['stage_look', 'Stage look on stage'], ['carpet_look', 'Stage look: red carpet'], ['kit_wood', 'Kit: wood'], ['kit_sparkle', 'Kit: sparkle'], ['kit_camo', 'Kit: camo'],
    ['creator_gear_bass', 'v1.1 Your gear: bass'], ['creator_gear_rhythm', 'v1.1 Your gear: rhythm'], ['creator_gear_lead', 'v1.1 Your gear: lead']];
  const have = names.filter(n => fs.existsSync(path.join(CACHE, n[0] + '.png')));
  if (have.length < names.length) console.log('sheet: missing ' + names.filter(n => !have.includes(n)).map(n => n[0]).join(','));
  if (!have.length) return;
  const { page, close } = await open({ noGoto: true });
  await page.setViewportSize({ width: 2020, height: 1000 });
  const html = '<body style="margin:0;background:#111;color:#eee;font:700 18px sans-serif;display:grid;grid-template-columns:repeat(5,390px);gap:10px;padding:10px;align-items:start">' +
    have.map(n => '<div><div style="padding:4px 0">' + n[1] + '</div><img style="width:390px;display:block" src="file://' + path.join(CACHE, n[0] + '.png') + '"></div>').join('') + '</body>';
  const f = path.join(CACHE, 'v08_creator_sheet.html'); fs.writeFileSync(f, html);
  await page.goto('file://' + f); await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(CACHE, 'v08_creator_sheet.png'), fullPage: true });
  console.log('sheet: tests/.cache/v08_creator_sheet.png');
  await close();
}

(async () => {
  fs.mkdirSync(CACHE, { recursive: true });
  if (want('creator')) await creator();
  if (want('kit')) await kit();
  if (want('stage')) await stage();
  if (want('meta')) await meta();
  if (want('gear')) await gear();
  if (!ONLY.length || ONLY.includes('sheet')) await sheet();
})();
