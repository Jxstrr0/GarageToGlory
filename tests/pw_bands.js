// pw_bands.js (v0.9 "Genres", lane B-UI): every playable band through the UI on a 390x844 phone viewport (PW_W / PW_H
// override it, e.g. 440x956). Sections (META_ONLY, comma-separated): bands (all four) | hail_damage | frost_heave |
// gravel_kings | grid_road_ramblers | flat (the no-WebGL 2D fallbacks). Each band runs in its own browser; 'bands' (all four +
// flat) fits `timeout 500`.
//   per band: title → New career → slot → the genre screen (all four cards playable, each with a peek at its space) → the
//     band intro (its members, its home base) → the logo picker → the creator → the cold open (the band's coldOpenFx
//     class; the last button walks "Into <its space> →") → week 1 through the UI: the Monday card, the planner, results
//     (the pending gig names this band's driver) → the van (header "<driver> drives"; the 3D trip or the 2D windshield gets
//     the band's driver + dashboard item) → the first gig (the band's firstGig venue; one 2D silhouette per bandmate) →
//     the wrap → all nine laptop tabs (Scene: the band's own rival, its lineup) → a Battle of the Bands spectator set (the
//     rival's lineup; their set plays the rival's genre on the audio) → the verdict → the Loonies red carpet (this band's
//     people on the carpet, the outfit beat only when the band has an outfit card) → the year-end recap (the band photo,
//     the pages). Every screen: a layout audit (no overflow, 44 px buttons) and a DOM text leak scan.
//   the door (fixer): the van-info sheet (the repair: Cousin Dale only for Hail Damage, Moth does Frost Heave's for free) and
//     its car lot, and a gig result whose merch names the band's home superfan (the 'dale' slot).
//   Leak scan: another playable band's people or Hail Damage's world (Marcel, Kenji, Baba, the Moose Hearse, Tundra Wraith,
//     Gord, HALE DAMAGE, Cousin Dale, Dale from Warman, Hwy 11...) in this career; other bands' superfans, tier-0 vans,
//     spaces, rivals and rival casts count too. Strict (LEAK_STRICT=0 turns it back to warn-only while debugging content); the
//     inverse (another band's people in a Hail Damage career) is always strict. Q8 cameos are allow-listed (the Scene
//     leaderboard, award nominee chips, the Maple 100). No console errors (strict).
// Run: node build.js && META_ONLY=bands timeout 500 node tests/pw_bands.js
const fs = require('fs'), path = require('path');
const { open, checker } = require('./_pw');
const CACHE = path.join(__dirname, '.cache');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const BANDS = ['hail_damage', 'frost_heave', 'gravel_kings', 'grid_road_ramblers'];
const want = b => !ONLY.length || ONLY.includes('bands') || ONLY.includes(b);
const STRICT = process.env.LEAK_STRICT !== '0';   // v0.9 integration: strict by default now the content lanes have landed
const TAG = process.env.PW_TAG || '';

const tid = id => `[data-testid="${id}"]`;
const tap = (page, id) => page.locator(tid(id)).last().click();
const quick = (page, id) => page.locator(tid(id)).last().click({ timeout: 2000 }).then(() => true, () => false);
const screen = page => page.evaluate(() => GG.debug('ui').screen);
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });
// (after the layer's fade-in, so the screenshot shows the screen and not the title scene behind it)
const shot = (page, name) => page.waitForTimeout(800).then(() => page.screenshot({ path: path.join(CACHE, 'v09_bands_' + name + TAG + '.png') })).catch(() => {});

function audit(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const cs = getComputedStyle(e); return cs.visibility === 'hidden' || cs.display === 'none' ? null : r; };
    const name = e => (e.dataset && e.dataset.testid || (typeof e.className === 'string' && e.className) || e.tagName) + '';
    const track = document.querySelector('.rc-track');
    for (const e of document.querySelectorAll('#screens .layer:not([inert]) *')) {
      if (track && track.contains(e) && e !== track) continue;   // recap pages sit side by side in the swipe strip
      const r = vis(e); if (r && (r.right > W + 1 || r.left < -1)) bad.push('overflow ' + name(e));
    }
    for (const sc of document.querySelectorAll('.sheet-body, .full-body')) if (sc.scrollWidth > sc.clientWidth + 1) bad.push('hscroll ' + sc.className);
    for (const b of document.querySelectorAll('#screens .layer:not([inert]) button')) {
      const r = vis(b); if (!r || b.closest('[hidden]') || r.right < 0 || r.left > W) continue;
      if (r.width < 43.5 || r.height < 43.5) bad.push('small ' + name(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
    return bad.slice(0, 6);
  });
}
// The visible text of the app (screens, HUD, toasts, bubbles), minus the Q8 cameo places: the Scene leaderboard, award
// nominee chips, the Maple 100 and the Loonies broadcast card may name any band.
function appText(page) {
  return page.evaluate(() => {
    const app = document.getElementById('app').cloneNode(true);
    // (+ layers hidden under a full screen, and the title's hint: the title is Hail Damage's cover in every career)
    // (+ the genre screen's band cards: picking a band shows every band, its space and city, by design)
    app.querySelectorAll('.layer.hidden, [data-testid="title-hint"], [data-testid^="scene-row-"], .lo-noms, [data-testid^="chart-row"], [data-testid="logo-cast"], [data-testid^="genre-"], script, style').forEach(e => e.remove());
    return app.textContent || '';
  });
}

async function runBand(bandId) {
  const c = checker('bands:' + bandId);
  const W = +process.env.PW_W || 0, H = +process.env.PW_H || 0;
  const o = await open({ noGoto: true });
  const { page, errors, close } = o;
  if (W && H) await page.setViewportSize({ width: W, height: H });
  const leaks = [];
  let band = null, foreignRe = null, hdRe = null;
  async function scan(where) {
    const t = await appText(page);
    const f = t.match(foreignRe) || [], h = hdRe ? t.match(hdRe) || [] : [];
    // (a word inside the name of someone in this career's lineup is theirs: e.g. a recruit called Tamara)
    const mine = await page.evaluate(() => GG.state ? GG.state.members.map(m => [m.name, m.nick, m.fullName].filter(Boolean).join(' ')).join(' | ') : '');
    const words = Array.from(new Set(f.concat(h))).filter(w => !new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(mine));
    if (!words.length) return;
    leaks.push(where + ': ' + words.join(', '));
    // (context: ~50 chars around each word, so the source line can be found; LEAK_CTX=0 hides it)
    const ctx = process.env.LEAK_CTX === '0' ? '' : ' [' + words.map(w => { const i = t.indexOf(w); return '…' + t.slice(Math.max(0, i - 50), i + w.length + 30).replace(/\s+/g, ' ') + '…'; }).join(' | ') + ']';
    if (bandId === 'hail_damage' || STRICT) c.ok(false, 'leak on ' + where + ': ' + words.join(', ') + ctx);
    else console.log('WARN leak ' + bandId + ' @ ' + where + ': ' + words.join(', ') + ctx);
  }
  async function check(where) { await scan(where); const a = await audit(page); c.ok(!a.length, where + ' layout: ' + a.join('; ')); }
  try {
    await page.goto(o.url);
    await page.waitForSelector(tid('btn-new'), { timeout: 20000 });
    band = await page.evaluate(b => {
      const B = GG.content.bands, me = B[b], words = [];
      // v0.9 (fixer): other bands' people AND world: members, home superfan, tier-0 van, space, rival + its cast (cast
      // nicknames that are plain words are left out: Dusty, Colt, Boot, The Jaw ...)
      const PLAIN = ['Dusty', 'Colt', 'Boot', 'Buckle', 'Unplugged', 'The Solo', 'The Board', 'The Jaw', 'Steve', 'Dex', 'Rex', 'Lorne'];
      Object.keys(B).forEach(k => {
        if (k === b) return;
        B[k].members.forEach(m => [m.name, m.nick].forEach(w => { if (w && w.length > 2) words.push(w); }));
        const hs = GG.fans.homeSuperfan({ bandId: k }); if (hs && k !== 'hail_damage') words.push(hs.short || hs.name);
        if (GG.shop && GG.shop.vanName) words.push(GG.shop.vanName(k, 0));
        if (k !== 'hail_damage') words.push(B[k].spaceName);
        const rv = GG.content.rivals[B[k].rival], cast = ((GG.content.rivalry || {}).cast || {})[B[k].rival] || {};
        if (rv) words.push(rv.name);
        (cast.members || []).forEach(m => [m.name, m.fullName, m.nick].forEach(w => { if (w && w.length > 2 && PLAIN.indexOf(w) < 0) words.push(w); }));
      });
      ['Suds-O-Rama', 'Westgate Plaza'].forEach(w => { if (!me.spaceName.includes(w)) words.push(w); });
      return { id: b, name: me.name, genre: me.genre, city: me.city, members: me.members.map(m => ({ id: m.id, name: m.name, silent: !!m.silent })), space: me.space,
        spaceShort: me.spaceShort, spaceName: me.spaceName, fx: me.coldOpenFx, rival: me.rival, rivalGenre: (GG.content.rivals[me.rival] || {}).genre, firstGig: me.firstGig,
        driver: GG.world.driverFor(b), words: Array.from(new Set(words)) };
    }, bandId);
    foreignRe = new RegExp('\\b(' + band.words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'g');
    hdRe = bandId === 'hail_damage' ? null : /Marcel|Dana|Jaxon|Kenji|Baba|Lord Abyssus|Moose Hearse|Tundra Wraith|Gord|Grimnir|HALE DAMAGE|Cousin Dale|Dale from Warman|Hwy 11/g;

    /* ---- new career: genre card → intro → logo → creator → cold open ---- */
    await tap(page, 'btn-new'); await tap(page, 'slot-1');
    await waitScreen(page, 'genre');
    const cards = await page.evaluate(() => ['metal', 'punk', 'rock', 'country'].map(g => {
      const b = document.querySelector('[data-testid="genre-' + g + '"]');
      return { g, ok: !!b && !b.disabled && /Playable/.test(b.textContent), peek: !!(b && b.querySelector('.peek.spx')) };
    }));
    c.ok(cards.every(x => x.ok && x.peek), 'the genre screen: all four bands playable, each with a peek at its space ' + JSON.stringify(cards));
    await check('genre');
    if (bandId === 'hail_damage') await shot(page, 'genre');
    await tap(page, 'genre-' + band.genre);
    await waitScreen(page, 'intro');
    const intro = await page.evaluate(() => document.querySelector('#screens').textContent);
    c.ok(band.members.every(m => intro.includes(m.name)) && intro.includes(band.spaceName) && intro.includes(band.name), 'intro: ' + band.name + ', its members and home base');
    await check('intro');
    await tap(page, 'btn-intro-next');
    await waitScreen(page, 'seat'); await tap(page, 'seat-next');   // v1.1: the seat picker (drums preselected)
    await waitScreen(page, 'logo');
    await check('logo');
    await tap(page, 'btn-logo-done');
    await waitScreen(page, 'creator');
    await page.fill(tid('creator-name'), 'Tester');
    await tap(page, 'btn-create');
    await waitScreen(page, 'coldopen');
    const co = await page.evaluate(() => ({ fx: document.querySelector('[data-testid="coldopen"]').dataset.fx, layer: !!document.querySelector('[data-testid="coldopen-fx"]'),
      band: GG.state.bandId, city: GG.state.city, n: (GG.content.bands[GG.state.bandId].coldOpen || []).length }));
    c.ok(co.band === bandId && co.fx === band.fx && co.layer, 'cold open: ' + bandId + ' with its ' + band.fx + ' fx');
    await check('coldopen');
    await shot(page, bandId + '_coldopen');
    for (let i = 1; i < co.n; i++) await tap(page, 'btn-coldopen-next');
    const last = await page.textContent(tid('btn-coldopen-next'));
    c.ok(last.includes('Into ' + band.spaceShort), 'the last cold-open button walks into ' + band.spaceShort + ': ' + last);
    await tap(page, 'btn-coldopen-next');
    await page.waitForFunction(() => GG.state && (GG.debug('ui').screen === 'card' || (GG.state.phase === 'plan' && !GG.debug('ui').stack.length)), null, { timeout: 10000 });
    const g1 = await page.evaluate(fg => { const v = GG.state.gig && GG.gig.venue(GG.state.gig.venueId); return { venue: GG.state.gig && GG.state.gig.venueId, vcity: v && v.city, city: GG.state.city,
      fgExists: !!(fg && GG.gig.venue(fg)), space: GG.state.space, van: GG.state.van && GG.state.van.name, fallback: !!document.querySelector('[data-testid="fallback-garage"]') }; }, band.firstGig);
    // (the sim lane's newCareer reads band.firstGig; until its helpers land here this is a warning, not a failure)
    const simV09 = await page.evaluate(() => !!(GG.career.speakerOk && GG.career.pool));
    // (a firstGig venue the content lane hasn't added yet: the sim falls back to a venue in the home city)
    const fg = !band.firstGig || !g1.venue || (g1.fgExists ? g1.venue === band.firstGig : String(g1.vcity || '').toLowerCase() === String(g1.city || '').toLowerCase());
    if (simV09) c.ok(fg, 'week 1 comes booked at the band\'s first gig (' + g1.venue + (g1.fgExists ? '' : ', ' + band.firstGig + ' not in content yet: a ' + g1.city + ' venue') + ')');
    else if (!fg) console.log('WARN ' + bandId + ': week 1 is booked at ' + g1.venue + ', not ' + band.firstGig + ' (sim helpers not merged yet)');
    await check('garage');

    /* ---- week 1: Monday → plan → results → the van → the first gig → the wrap ---- */
    if (await screen(page) === 'card') { await check('monday'); await tap(page, 'choice-0'); await tap(page, 'btn-card-ok'); }
    await page.waitForFunction(() => GG.state.phase === 'plan' && GG.debug('ui').stack.length === 0, null, { timeout: 10000 });
    await tap(page, 'btn-primary');
    await waitScreen(page, 'plan');
    for (let i = 2; i >= 0; i--) if (await page.locator(tid('plan-slot-' + i) + '.filled').count()) await tap(page, 'plan-slot-' + i);
    for (const a of ['rehearse', 'promote', 'rest']) await tap(page, 'act-' + a);
    await check('plan');
    await tap(page, 'btn-go');
    await waitScreen(page, 'results');
    if (await page.locator(tid('btn-results-skip')).last().isVisible()) await tap(page, 'btn-results-skip');
    const pend = await page.evaluate(() => { const e = document.querySelector('[data-testid="gig-pending-driver"]'); return e ? e.textContent : ''; });
    const drv = await page.evaluate(() => GG.world.driver(GG.state));
    c.ok(!pend || pend.includes(drv.you ? 'You' : drv.name), 'the pending gig names this band\'s driver: ' + pend);
    await check('results');
    // spy on the van scene: the band's driver + dashboard item go to the 3D trip (or the 2D windshield draws them)
    await page.evaluate(() => { const V = GG.render && GG.render.van; if (V && V.setTrip && !V.__spy) { const f = V.setTrip; V.setTrip = function (a) { window.__trip = a; return f.apply(this, arguments); }; V.__spy = 1; } });
    await tap(page, 'btn-results-ok');
    let sawVan = false;
    for (let k = 0; k < 60; k++) {
      const sc = await screen(page);
      if (sc === 'van' && !sawVan) {
        sawVan = true;
        // autoplay goes on as soon as the van is on screen (before it, the weekend would skip the drive): a short drive can
        // reach the gig while the van check + screenshot run, and the show then starts on the bot instead of the set sheet
        await page.evaluate(() => { GG.ui.gigAutoplay = { accuracy: 0.92, jitterMs: 20 }; });
        const vh = await page.evaluate(() => ({ w: (document.querySelector('[data-testid="van-weather"]') || {}).textContent || '', dbg: GG.debug('van'), trip: window.__trip || null }));
        const who = drv.you ? 'You drive' : drv.name + ' drives';
        c.ok(vh.w.includes(who), 'van header: ' + vh.w);
        c.ok(vh.dbg.mode === '2d' || (vh.trip && vh.trip.driver === drv.id && (drv.you ? !!vh.trip.dashboard : (vh.trip.dashboard || null) === (drv.dashboard && drv.dashboard !== 'none' ? drv.dashboard : null))),
          'the van scene gets the band\'s driver + dashboard: ' + JSON.stringify(vh.trip && { d: vh.trip.driver, dash: vh.trip.dashboard }));
        await check('van');
        await shot(page, bandId + '_van');
        await quick(page, 'btn-van-skip');
      }
      if (sc === 'road') { await check('road'); await quick(page, 'road-choice-0'); await quick(page, 'btn-road-ok'); }
      if (sc === 'gig-set') await quick(page, 'btn-gig-start');   // (the van beat the autoplay switch: start the set by hand)
      if (sc === 'gig-results' || sc === 'wrap') break;
      await page.waitForTimeout(250);
    }
    c.ok(sawVan, 'the van drove to the first gig');
    await page.waitForFunction(() => ['gig-results', 'wrap'].includes(GG.debug('ui').screen), null, { timeout: 30000 });
    const sil = await page.evaluate(() => ({ n: document.querySelectorAll('[data-testid="gig-back-band"] i').length, line: (GG.drama ? GG.drama.lineup(GG.state) : GG.state.members).length }));
    c.ok(sil.n === 0 || sil.n === Math.min(6, sil.line), 'the 2D gig backdrop: one silhouette per bandmate (' + sil.n + ' for ' + sil.line + ')');
    if (await screen(page) === 'gig-results') { await check('gig-results'); await tap(page, 'btn-gig-done'); }
    await waitScreen(page, 'wrap', 15000);
    await check('wrap');
    await page.evaluate(() => { GG.ui.gigAutoplay = false; });


    /* ---- the laptop: all tabs; Scene = this band's rival ---- */
    await tap(page, 'btn-next-week');
    await page.waitForFunction(() => GG.state.totalWeek === 2, null, { timeout: 10000 });

    /* ---- the door (van-info): the repair and the car lot are this band's; a merch result names its home superfan ---- */
    await page.evaluate(() => { GG.ui.closeAll(); GG.state.van.condition = Math.min(GG.state.van.condition, 50); GG.ui.showVan('van'); });
    await waitScreen(page, 'van-info');
    const vr = await page.evaluate(() => ({ rep: (document.querySelector('[data-testid="van-repair"]') || {}).textContent || '', free: GG.world.driverMods(GG.state).repair === 0, drv: GG.world.driver(GG.state).name }));
    c.ok(bandId === 'hail_damage' ? /Cousin Dale/.test(vr.rep) : !/Dale/.test(vr.rep) && (!vr.free || (vr.rep.includes(vr.drv) && /free/.test(vr.rep))),
      'the van repair is this band\'s (' + (vr.free ? vr.drv + ' does it, free' : 'a garage in ' + band.city) + '): ' + vr.rep);
    await check('van-info');
    await shot(page, bandId + '_door_van');
    await tap(page, 'door-tab-dealer');
    await page.waitForTimeout(80);
    const dl = await page.evaluate(() => (document.querySelector('[data-testid="dealer-intro"]') || {}).textContent || '');
    c.ok(bandId === 'hail_damage' ? /Cousin Dale/.test(dl) : !!dl && !/Dale|Hwy 11/.test(dl), 'the car lot is this band\'s: ' + dl);
    await check('van-info-dealer');
    await page.evaluate(() => {
      GG.ui.closeAll();
      GG.ui.show('gig-results', { result: { grade: 'B', name: 'The Merch Test', city: GG.state.city, score: 70, accuracy: 0.8, maxCombo: 30, crowd: 40, capacity: 60,
        pay: 100, gas: 10, fans: 5, buzz: 1, moments: [], songResults: [], lines: ['Merch table: 3 sold, $45.'],
        merch: { sold: 3, earned: 45, boxes: 1, space: 2, items: {}, named: ['dale'] } } });
    });
    await waitScreen(page, 'gig-results');
    const mr = await page.evaluate(() => { const h = GG.fans.homeSuperfan(GG.state); return { t: (document.querySelector('[data-testid="gig-merch"]') || {}).textContent || '', sf: h.short || h.name }; });
    c.ok(mr.t.includes(mr.sf + ' bought one') && (bandId === 'hail_damage' || !/\bDale\b/.test(mr.t)), 'the merch result names this band\'s superfan (' + mr.sf + '): ' + mr.t);
    await check('merch-result');
    await page.evaluate(() => GG.ui.closeAll());
    await page.evaluate(() => { GG.ui.closeAll(); const S = GG.state; for (let i = 0; i < 26; i++) GG.career.botWeek(S, 'avg'); S.card = null; S.phase = 'plan'; GG.main.sync(); GG.ui.show('laptop', { tab: 'chat' }); });
    let scene = null;
    for (const t of ['chat', 'bandbook', 'band', 'money', 'label', 'albums', 'scene', 'world', 'years']) {
      await tap(page, 'laptop-tab-' + t);
      await page.waitForTimeout(80);
      await check('laptop-' + t);
      if (t !== 'scene') continue;
      scene = await page.evaluate(() => ({ rival: GG.state.rival && GG.state.rival.id, name: (document.querySelector('[data-testid="scene-rival"]') || {}).textContent || '',
        lineup: document.querySelectorAll('[data-testid="scene-lineup"] .rv-mem').length, cast: GG.rival.lineup(GG.state).length,
        face: (document.querySelector('[data-testid="scene-rival"] .rv-face') || {}).className || '' }));
      await shot(page, bandId + '_scene');
    }
    c.ok(scene && scene.rival === band.rival && scene.lineup === scene.cast && /rv-face/.test(scene.face), 'Scene tab: ' + band.rival + ', lineup ' + (scene && scene.lineup) + '/' + (scene && scene.cast) + ', face ' + (scene && scene.face));
    c.ok(scene && (band.rival === 'tundra_wraith' ? /corpse/.test(scene.face) : !/corpse/.test(scene.face)), 'rival face style: corpse paint only for Tundra Wraith (' + (scene && scene.face) + ')');

    /* ---- a Battle of the Bands: the rival's set from the crowd, in their genre ---- */
    await page.evaluate(() => {
      GG.ui.closeAll(); const st = GG.state; st.gig = null; st.offer = null; st.rival.pending = null; st.fans = Math.max(st.fans, 200);
      GG.rival.schedule(st, 'botb'); GG.rival.enter(st);
      GG.career.setPlan(st, ['rest', 'rest', 'rest']); GG.career.runWeek(st); GG.main.sync();   // phase 'gig': the BotB is this weekend
      GG.ui.showdownViews = true; GG.ui.gigAutoplay = { accuracy: 0.9, jitterMs: 20 }; GG.ui.rivalSongMs = 700;
      const A = GG.audio; if (A && !A.__spy) { const f = A.play; A.play = function (p, o) { (window.__plays = window.__plays || []).push(o ? { genre: o.genre, style: o.style || null, rival: o.rival || null } : {}); return f.apply(this, arguments); }; A.__spy = 1; }
      window.__plays = [];
      window.__sd = null; GG.ui.playShowdown(st.gig, r => { window.__sd = r || true; });
    });
    await waitScreen(page, 'rival-set', 10000);
    await page.waitForTimeout(600);
    const rs = await page.evaluate(() => ({ plays: window.__plays.slice(), sil: document.querySelectorAll('[data-testid="rs-sil"] i').length, names: (document.querySelector('.rs-names') || {}).textContent || '',
      n: GG.rival.lineup(GG.state).length }));
    const p0 = rs.plays[0] || null;   // v0.9 (audio handover): their genre, their singer (rival id), Chartbusters' power ballad
    c.ok(!p0 || (p0.genre === band.rivalGenre && p0.rival === band.rival && (band.rival === 'chartbusters' ? p0.style === 'ballad' : true)),
      'their set plays the rival\'s genre (' + band.rivalGenre + ') as the rival: ' + JSON.stringify(p0));
    c.ok(rs.sil === Math.max(1, Math.min(6, rs.n)), 'spectator backdrop: one silhouette per rival member (' + rs.sil + '/' + rs.n + ')');
    await check('rival-set');
    await shot(page, bandId + '_rival_set');
    for (let k = 0; k < 80 && await screen(page) !== 'rival-verdict'; k++) {
      const sc = await screen(page);
      if (sc === 'rival-set') { if (await page.locator(tid('btn-rs-go')).count()) await quick(page, 'btn-rs-go'); else await quick(page, 'btn-rs-skip'); }
      if (sc === 'gig-results') await quick(page, 'btn-gig-done');
      await page.waitForTimeout(250);
    }
    await waitScreen(page, 'rival-verdict', 10000);
    await check('rival-verdict');
    await tap(page, 'btn-verdict-done');
    await page.waitForFunction(() => !!window.__sd, null, { timeout: 10000 });

    /* ---- the Loonies red carpet ---- */
    await page.evaluate(() => {
      GG.ui.closeAll(); GG.ui.gigAutoplay = false; GG.ui.showdownViews = null;
      const s = GG.state; s.gig = null; s.offer = null; s.year = 2; s.week = 16; GG.labels.nominate(s, GG.RNG(8), { news: [] });
      if (!s.loonies.invited) {
        s.loonies.nominations = [{ category: 'live', name: 'Best Live Act', what: 'x', nominees: [GG.ui.v5.bandName(), GG.rival.name(s), 'Hosers Anonymous'], strength: 95, rival: 60 }];
        s.loonies.invited = true; s.loonies.year = 2;
      }
      s.week = 20; s.totalWeek = 44; s.phase = 'plan'; GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s, { autoGig: true });
      GG.main.wrapWeek();
    });
    await waitScreen(page, 'loonies', 10000);
    await tap(page, 'btn-carpet-next'); await page.waitForTimeout(200);
    await check('carpet');
    const cp = await page.evaluate(() => ({ said: [...document.querySelectorAll('.lo-card .react b')].map(b => b.textContent.replace(/:\s*$/, '')),
      mine: GG.state.members.filter(m => m.status === 'active').map(m => GG.ui.who(m.id).short) }));   // (recruits count: they're in the band now)
    c.ok(cp.said.length > 0 && cp.said.every(n => cp.mine.includes(n)), 'carpet: this band\'s people talk to the reporter: ' + cp.said.join(', ') + ' (of ' + cp.mine.join(', ') + ')');
    await shot(page, bandId + '_carpet');
    for (let k = 0; k < 4 && await page.locator(tid('btn-carpet-next')).count(); k++) { await tap(page, 'btn-carpet-next'); await page.waitForTimeout(150); }
    if (await page.locator(tid('btn-outfit')).count()) {
      const oc = await page.evaluate(() => { const c = GG.labels.outfitCard(GG.state); return { btn: document.querySelector('[data-testid="btn-outfit"]').textContent, who: c && c.speaker ? GG.ui.who(c.speaker).short : null }; });
      c.ok(!oc.who || oc.btn.startsWith(oc.who + ' '), 'the outfit beat is asked by the card\'s speaker: ' + oc.btn);
      c.ok(!/Marcel/.test(oc.btn) || bandId === 'hail_damage', 'no stranger called Marcel: ' + oc.btn);
      await tap(page, 'btn-outfit'); await waitScreen(page, 'loonie-card'); await check('outfit');
      await tap(page, 'loonie-choice-0'); await tap(page, 'btn-loonie-card-ok');
    }
    await tap(page, 'btn-head-inside');
    for (let k = 0; k < 40 && !(await page.locator(tid('loonies-summary')).count()); k++) {
      if (await page.locator(tid('btn-envelope')).count()) {
        await tap(page, 'btn-envelope'); await page.waitForTimeout(150); await scan('envelope');
        // (fixer) the card scrolls; the broadcast chip under the envelope is never squeezed (390x844 crushed it to 16 px)
        const lc = await page.evaluate(() => { const e = document.querySelector('[data-testid="logo-cast"]'); return e ? { h: e.clientHeight, sh: e.scrollHeight } : null; });
        if (lc) c.ok(lc.h >= lc.sh - 1, 'the envelope\'s broadcast chip is not crushed: ' + JSON.stringify(lc));
      }
      if (await page.locator(tid('btn-speech')).count()) { await tap(page, 'btn-speech'); await waitScreen(page, 'loonie-card'); await check('speech'); await tap(page, 'loonie-choice-0'); await tap(page, 'btn-loonie-card-ok'); }
      if (await page.locator(tid('btn-award-next')).count()) await tap(page, 'btn-award-next');
      await page.waitForTimeout(150);
    }
    await check('loonies-summary');
    await tap(page, 'btn-loonies-done');
    await waitScreen(page, 'wrap', 10000);

    /* ---- the year-end recap ---- */
    await page.evaluate(() => {
      GG.ui.closeAll(); const s = GG.state;
      while (s.week !== 24 && s.phase !== 'ended') GG.career.botWeek(s, 'avg');
      if (s.phase !== 'ended') { s.card = null; s.phase = 'plan'; GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s, { autoGig: true }); GG.career.endWeek(s); }
      GG.main.sync();
      const y = (GG.recap.list(s).slice(-1)[0] || {}).y;
      window.__recapY = y;
      if (y) GG.ui.openRecap(y);
    });
    const ry = await page.evaluate(() => window.__recapY);
    c.ok(!!ry, 'a year-end recap exists (year ' + ry + ')');
    if (ry) {
      await waitScreen(page, 'recap', 10000);
      await page.waitForTimeout(400);
      const pages = await page.evaluate(() => document.querySelectorAll('[data-testid^="recap-page-"]').length);
      for (let i = 0; i < pages; i++) {
        await check('recap-' + i);
        if (i === 0) { await page.waitForTimeout(300); await shot(page, bandId + '_recap'); }
        if (i < pages - 1) { await tap(page, 'recap-next'); await page.waitForTimeout(450); }
      }
      c.ok(pages >= 5 && await page.evaluate(() => !!document.querySelector('[data-testid="recap-photo"]')), 'recap: ' + pages + ' pages with the band photo');
      await tap(page, 'recap-done');
    }
    c.ok(!errors.length, 'no console errors: ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  if (leaks.length) console.log('leak summary ' + bandId + ' (' + leaks.length + ' screens' + (bandId === 'hail_damage' || STRICT ? ', strict' : ', warn') + '): ' + leaks.slice(0, 12).join(' || '));
  await close(); c.done();
}

// flat: no WebGL (three.js blocked) → every band's 2D fallback: its own tier-0 room art (sp-<kind>), its bandmates as
// buttons, the 2D windshield with its driver + dashboard item. Screenshots v09_bands_flat_<band>_garage|van.png.
async function flat() {
  const c = checker('bands:flat');
  for (const b of BANDS) {
    const o = await open({ noGoto: true });
    const { page, errors, close } = o;
    try {
      await page.route('**/three.min.js', r => r.abort());
      await page.goto(o.url + '?quick=1&seed=9&band=' + b);
      await page.waitForFunction(() => window.GG && GG.state && GG.main.booted, null, { timeout: 20000 });
      const r = await page.evaluate(() => {
        GG.ui.closeAll(); GG.main.sync();
        const f = document.querySelector('[data-testid="fallback-garage"]');
        return { ok: GG.main.renderOk, cls: f ? f.className : '', kind: GG.ui.spaceKind(GG.state), note: f ? f.querySelector('.note').textContent : '',
          mates: f ? f.querySelectorAll('.mates button').length : 0, n: GG.state.members.length, space: GG.ui.space(GG.state) };
      });
      c.ok(!r.ok && r.cls.includes('sp-' + r.kind) && r.mates === r.n && r.note.includes(r.space.replace(/^the /i, '')), b + ': the 2D ' + r.kind + ' (' + r.cls + '), ' + r.mates + ' bandmates, "' + r.note + '"');
      await shot(page, 'flat_' + b + '_garage');
      await page.evaluate(() => {
        const s = GG.state; s.trip = null; const t = GG.world.startTrip(s, s.gig); t.cardId = null; t.resolved = true;
        window.__vd = null; GG.ui.playVan(s.gig, () => { window.__vd = 1; });
      });
      await waitScreen(page, 'van');
      await page.waitForTimeout(900);
      const v = await page.evaluate(() => ({ mode: GG.debug('van').mode, head: (document.querySelector('[data-testid="van-weather"]') || {}).textContent || '', d: GG.world.driver(GG.state) }));
      c.ok(v.mode === '2d' && v.head.includes(v.d.you ? 'You drive' : v.d.name + ' drives'), b + ': the 2D windshield, ' + v.head);
      await shot(page, 'flat_' + b + '_van');
      await quick(page, 'btn-van-skip');
      await page.waitForFunction(() => window.__vd === 1, null, { timeout: 8000 });
      const pageErrors = errors.filter(e => /^pageerror/.test(e));
      c.ok(!pageErrors.length, b + ': no page errors without WebGL ' + pageErrors.slice(0, 2).join(' | '));
    } catch (e) { c.ok(false, b + ' flat threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
    await close();
  }
  c.done();
}

(async () => {
  fs.mkdirSync(CACHE, { recursive: true });
  for (const b of BANDS) if (want(b)) await runBand(b);
  if (!ONLY.length || ONLY.includes('bands') || ONLY.includes('flat')) await flat();
})();
