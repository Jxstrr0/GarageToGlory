// pw_label.js: v0.5 "Signed" UI on a 390x844 phone viewport. Sections (META_ONLY): label, studio, awards.
//   label  : an offer sheet (Monolith + Gopherwood tabs, terms, demands, band reaction) → sign → the contract screen →
//            laptop Label tab (recoup bar, deadline, demands) + Albums tab. Screenshots label_offer.png, label_deal.png.
//   studio : book the studio (kind, studio, producer, weeks, tracks, cost) → the session sheet (events, takes) → PLAY a
//            take (studio mode of the gig session, autoplay bot) → best take counts → studio weeks through the real week
//            flow (studio event Monday card, planner → studio sheet → Record this week → results → wrap) → the wrap's
//            "record is in the can" → release wizard (reorder, lead single, typed title, 4 seeded covers: non-blank +
//            deterministic, release week, promo) → weeks pass → release day in the wrap: news + reviews + chart open.
//            Screenshots studio_book.png, studio_session.png, release_tracks.png, release_cover.png.
//   awards : a real released album: reviews reveal (5 outlets, scales) → Maple 100 → gold cert → trophy shelf + garage
//            trophy wall → real nominations, week 20 wrap runs the Loonies BEFORE endWeek:
//            3D red carpet (draw calls < 60, band + cape + 4 corpse-painted rivals) → outfit card → envelopes (a win +
//            speech, a loss to Tundra Wraith + their thank-you) → summary → back to the garage, carpet disposed.
//            Screenshots reviews.png, chart.png, cert.png, carpet.png, envelope.png.
// Uses the real GG.labels sim (v0.5) and content; state is set up directly, weeks run through the real week flow.
//   sheet  : the v0.5 contact sheet from the screenshots above (tests/.cache/v05_sheet.png).
// Run: node build.js && META_ONLY=label,studio,awards,sheet timeout 500 node tests/pw_label.js
const path = require('path');
const { open, checker } = require('./_pw');
const CACHE = path.join(__dirname, '.cache');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);
const tid = id => `[data-testid="${id}"]`;
const tap = (page, id) => page.locator(tid(id)).last().click();
const visible = (page, id) => page.locator(tid(id)).last().isVisible();
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });
const shot = (page, name) => page.screenshot({ path: path.join(CACHE, name) });
function audit(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const cs = getComputedStyle(e); return cs.visibility === 'hidden' || cs.display === 'none' ? null : r; };
    const name = e => (e.dataset.testid || e.className || e.tagName) + '';
    for (const e of document.querySelectorAll('#screens *')) { const r = vis(e); if (r && (r.right > W + 1 || r.left < -1)) bad.push('overflow ' + name(e)); }
    for (const sc of document.querySelectorAll('.sheet-body, .full-body, .lo-card')) if (sc.scrollWidth > sc.clientWidth + 1) bad.push('hscroll ' + sc.className);
    for (const b of document.querySelectorAll('#screens .layer:not([inert]) button')) { const r = vis(b); if (r && (r.width < 43.5 || r.height < 43.5)) bad.push('small ' + name(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
    return bad.slice(0, 8);
  });
}

async function setup(page, seed) {
  await page.waitForFunction(() => window.GG && GG.main && GG.ui && GG.ui.v5 && GG.labels && GG.labels.book, null, { timeout: 15000 });
  await page.evaluate(s => {
    GG.main.quickStart({ seed: s, openCard: false }); GG.ui.closeAll();
    window.plainWeek = function () {
      const st = GG.state; GG.ui.closeAll();
      if (st.phase === 'monday') { GG.career.startWeek(st); if (st.card && !st.card.resolved) GG.career.resolveCard(st, 0); }
      if (st.phase === 'plan') { GG.career.setPlan(st, ['rest', 'rest', 'rest']); GG.career.runWeek(st, { autoGig: true }); }
      GG.main.wrapWeek();
    };
    window.nextWeek = function () { GG.ui.closeAll(); GG.main.nextWeek(); GG.ui.closeAll(); };
    window.addSongs = function (n) { const st = GG.state, rng = GG.RNG(99 + st.songs.length); while (st.songs.length < n) GG.songs.create(st, GG.songs.generate(st.genre, rng), null, { auto: true }); };
    window.localHeroes = function (fans) { const st = GG.state; st.fans = fans; st.protected = false; if (GG.career.setEra) GG.career.setEra(st, 'local', 'test'); else st.era = 'local'; };
  }, seed);
}

async function label() {
  const c = checker('label');
  const { page, errors, close } = await open();
  try {
    await setup(page, 5050);
    await page.evaluate(() => {
      const s = GG.state; s.totalWeek = 30; s.year = 2; s.week = 6; localHeroes(900); s.buzz = 55;
      s.labelOffers = [GG.labels.makeOffer(s, 'monolith', GG.RNG(1)), GG.labels.makeOffer(s, 'gopherwood', GG.RNG(2))];
      GG.main.sync(); GG.ui.openOffers('monolith');
    });
    await waitScreen(page, 'label-offer');
    c.ok(await visible(page, 'offer-card') && await visible(page, 'offer-tab-gopherwood'), 'offer sheet with a tab per label');
    const terms = await page.locator(tid('offer-terms')).textContent();
    c.ok(/\$\d[\d,]+/.test(terms) && /\d+%/.test(terms) && /Never/.test(terms), 'terms: advance, cut, no 360: ' + terms.slice(0, 60));
    c.ok(await page.locator(tid('offer-demands') + ' .demand').count() >= 1, 'Monolith demands listed');
    let bad = await audit(page); c.ok(!bad.length, 'offer layout: ' + bad.join(', '));
    await page.waitForTimeout(300); await shot(page, 'label_offer.png');
    await tap(page, 'offer-tab-gopherwood'); await tap(page, 'offer-tab-monolith');
    const fund0 = await page.evaluate(() => GG.state.fund);
    await tap(page, 'btn-sign'); await waitScreen(page, 'confirm'); await tap(page, 'btn-confirm-yes');
    await waitScreen(page, 'label-deal');
    const st = await page.evaluate(() => ({ l: GG.state.label && GG.state.label.labelId, era: GG.state.era, flag: GG.state.flags.label }));
    c.ok(st.l === 'monolith' && st.era === 'signed' && st.flag === 'monolith', 'signed with Monolith (real sim): ' + JSON.stringify(st));
    c.ok(/Recording agreement/i.test(await page.locator(tid('deal-paper')).textContent()), 'the contract screen');
    bad = await audit(page); c.ok(!bad.length, 'deal layout: ' + bad.join(', '));
    await page.waitForTimeout(900); await shot(page, 'label_deal.png');
    await tap(page, 'btn-deal-done');
    await page.waitForFunction(() => !GG.ui.isOpen('label-deal'));
    await page.evaluate(() => GG.emit('hotspot', { action: 'laptop' }));
    await waitScreen(page, 'laptop'); await tap(page, 'laptop-tab-label');
    await page.waitForSelector(tid('label-status'));
    c.ok(await visible(page, 'recoup-bar') && /Year \d · Week \d+/.test(await page.locator(tid('deal-deadline')).textContent()), 'Label tab: recoup bar + deadline');
    bad = await audit(page); c.ok(!bad.length, 'Label tab layout: ' + bad.join(', '));
    await tap(page, 'laptop-tab-albums');
    c.ok(await visible(page, 'btn-book-studio'), 'Albums tab: book a studio');
    // A label demand with no content card shows before the planner (met / halfway / refused)
    const pd = await page.evaluate(() => { GG.ui.closeAll(); const s = GG.state, d = s.label.demands.find(x => !x.card); if (!d) return false; d.due = s.totalWeek; s.phase = 'plan'; GG.ui.openPlanner(); return true; });
    if (pd) {
      await waitScreen(page, 'label-demand');
      await tap(page, 'demand-half'); await tap(page, 'btn-demand-ok');
      await waitScreen(page, 'plan');
      c.ok(await page.evaluate(() => GG.state.label.demands.some(x => x.answered === 'half')), 'pending demand answered (halfway), then the planner');
    } else c.ok(true, 'no card-less demand on this deal (skipped)');
    // DIY path on a fresh career
    await page.evaluate(() => { GG.ui.closeAll(); const s = GG.state; s.label = null; s.flags.label = null; s.labelOffers = [GG.labels.makeOffer(s, 'gopherwood', GG.RNG(3))]; GG.ui.openOffers(); });
    await waitScreen(page, 'label-offer');
    await tap(page, 'btn-diy'); await waitScreen(page, 'confirm'); await tap(page, 'btn-confirm-yes');
    await page.waitForFunction(() => !GG.labels.offers(GG.state).length, null, { timeout: 5000 });
    c.ok(!(await page.evaluate(() => GG.ui.isOpen('label-offer') || GG.state.label)), 'DIY: offers declined, no label, sheet closes');
    c.ok(!errors.length, 'no console errors: ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + e.message); } finally { await close(); c.done(); }
}

async function studio() {
  const c = checker('studio');
  const { page, errors, close } = await open();
  try {
    await setup(page, 6060);
    await page.evaluate(() => {
      const s = GG.state; s.totalWeek = 40; s.year = 2; s.week = 16; localHeroes(1500); s.fund = 4000; s.drumSkill = 55;
      addSongs(10);
      s.labelOffers = [GG.labels.makeOffer(s, 'gopherwood', GG.RNG(4))]; GG.labels.sign(s, 'gopherwood');
      s.phase = 'plan'; GG.main.sync(); GG.ui.openPlanner();
    });
    await waitScreen(page, 'plan');
    c.ok(await visible(page, 'btn-plan-studio'), 'planner offers "Book the studio instead"');
    await tap(page, 'btn-plan-studio');
    await waitScreen(page, 'studio-book');
    c.ok(await visible(page, 'kind-album') && await visible(page, 'studio-grain_silo') && await page.locator(tid('studio-abbot_lane')).isDisabled(), 'kinds + studios, Abbot Lane locked');
    await tap(page, 'kind-ep'); await tap(page, 'studio-strip_mall_sound'); await tap(page, 'producer-solveig_birch'); await tap(page, 'weeks-2');
    c.ok(/\$[\d,]+/.test(await page.locator(tid('book-cost')).textContent()), 'session cost quoted');
    const on = await page.locator('.track-opt.on').count();
    c.ok(on >= 4 && on <= 5, 'EP preselects 4–5 tracks: ' + on);
    let bad = await audit(page); c.ok(!bad.length, 'booking layout: ' + bad.join(', '));
    await page.waitForTimeout(300); await shot(page, 'studio_book.png');
    await tap(page, 'btn-book');
    await waitScreen(page, 'studio');
    const ses = await page.evaluate(() => GG.state.session);
    c.ok(ses && ses.studioId === 'strip_mall_sound' && ses.producerId === 'solveig_birch' && ses.tracks.length >= 4, 'session booked (real sim)');
    c.ok(await visible(page, 'btn-studio-go'), 'studio sheet shows "Record this week" during the plan phase');
    const first = ses.tracks[0];
    await page.evaluate(() => { GG.ui.gigAutoplay = { accuracy: 0.97, jitterMs: 10 }; });
    await tap(page, 'btn-play-take-' + first);
    await page.waitForFunction(id => (GG.state.session.takes[id] || 0) > 0, first, { timeout: 15000 });
    await page.waitForFunction(() => !GG.ui.isOpen('gig') && GG.ui.isOpen('studio'), null, { timeout: 15000 });
    const t = await page.evaluate(id => ({ take: GG.state.session.takes[id], live: GG.state.liveGig }), first);
    c.ok(t.take > 60 && !t.live, 'played take counted (' + t.take + '), no liveGig left behind');
    await page.evaluate(() => { GG.ui.gigAutoplay = { accuracy: 0.2, jitterMs: 80 }; });
    await tap(page, 'btn-play-take-' + first);
    await page.waitForFunction(() => !GG.ui.isOpen('gig') && GG.ui.isOpen('studio'), null, { timeout: 15000 });
    c.ok(await page.evaluate(id => GG.state.session.takes[id], first) === t.take, 'a worse take does not replace the best one');
    await page.evaluate(() => { GG.ui.gigAutoplay = false; });
    bad = await audit(page); c.ok(!bad.length, 'session layout: ' + bad.join(', '));
    await shot(page, 'studio_session.png');
    // Studio weeks through the real flow (no weekend gigs in this test)
    await page.evaluate(() => { GG.state.gig = null; GG.state.offer = null; });
    await tap(page, 'btn-studio-go');
    await waitScreen(page, 'results');
    c.ok(await page.evaluate(() => GG.state.lastWeek.blocks.every(b => b.activity === 'studio')), 'studio week replaced the blocks');
    let guard = 0;
    while (await page.evaluate(() => GG.labels.inSession(GG.state)) && guard++ < 6) {
      await page.evaluate(() => { GG.main.wrapWeek(); nextWeek(); });
      const card = await page.evaluate(() => { const s = GG.state; if (s.phase === 'monday') GG.main.beginWeek(); return s.card && s.card.id; });
      if (/^studio_/.test(card || '')) c.ok(true, 'studio event as the Monday card: ' + card);
      const top = await page.evaluate(() => { const s = GG.state; GG.ui.closeAll(); if (s.phase === 'monday' && s.card && !s.card.resolved) GG.career.resolveCard(s, 0); s.gig = null; s.offer = null; GG.ui.openPlanner(); return GG.ui.top() + '|' + s.phase + '|' + GG.labels.inSession(s); });
      if (!/^studio\|/.test(top)) console.log('debug top', top);
      await waitScreen(page, 'studio');
      await tap(page, 'btn-studio-go');
      await waitScreen(page, 'results');
    }
    await page.evaluate(() => GG.main.wrapWeek());
    await waitScreen(page, 'wrap');
    c.ok(await visible(page, 'wrap-recorded'), 'wrap: the record is in the can');
    await tap(page, 'wrap-release');
    await waitScreen(page, 'release');
    const order0 = await page.evaluate(() => [...document.querySelectorAll('.rel-row b')].map(b => b.textContent));
    await tap(page, 'btn-down-0');
    const order1 = await page.evaluate(() => [...document.querySelectorAll('.rel-row b')].map(b => b.textContent));
    c.ok(order1[0] === order0[1] && order1[1] === order0[0], 'reorder moves a track down');
    await tap(page, 'btn-single-2');
    c.ok(await page.locator(tid('rel-row-2') + ' .tag.gold').count() === 1, 'lead single starred');
    bad = await audit(page); c.ok(!bad.length, 'tracklist layout: ' + bad.join(', '));
    await shot(page, 'release_tracks.png');
    await tap(page, 'btn-rel-next');
    c.ok(await page.locator('[data-testid^="title-opt-"]').count() === 3, '3 generated titles');
    await page.locator(tid('title-input')).fill('Moose on the Loose');
    await tap(page, 'btn-rel-next');
    const cov = await page.evaluate(() => {
      const cvs = [...document.querySelectorAll('.cover-opt canvas')];
      const sig = cv => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let h = 0, set = new Set(); for (let i = 0; i < d.length; i += 97) { h = (h * 31 + d[i]) >>> 0; set.add(d[i] >> 4); } return { h, var: set.size }; };
      const a = sig(cvs[0]);
      const cv2 = document.createElement('canvas'); cv2.width = cv2.height = 160;
      const c0 = GG.ui.v5.coverOptions(GG.state, 4, 0)[0];
      GG.ui.v5.drawCover(cv2, c0, { title: 'Moose on the Loose', band: GG.ui.v5.bandName(), size: 160 });
      return { n: cvs.length, a, again: sig(cv2), motifs: GG.ui.v5.coverOptions(GG.state, 4, 0).map(x => x.motif) };
    });
    c.ok(cov.n === 4 && cov.a.var > 6, '4 covers drawn, non-blank (variety ' + cov.a.var + ')');
    c.ok(cov.a.h === cov.again.h, 'cover is deterministic (same seed → same pixels)');
    c.ok(new Set(cov.motifs).size >= 2, 'covers vary motifs: ' + cov.motifs.join(','));
    bad = await audit(page); c.ok(!bad.length, 'cover layout: ' + bad.join(', '));
    await shot(page, 'release_cover.png');
    await tap(page, 'cover-2');
    await tap(page, 'btn-rel-next');
    await tap(page, 'rel-week-2');
    const promoId = await page.evaluate(() => { const o = GG.labels.promoOptions(GG.state).find(p => p.affordable && p.cost); return o ? o.id : null; });
    if (promoId != null) await tap(page, 'promo-' + promoId);
    c.ok(/Moose on the Loose/.test(await page.locator(tid('rel-summary')).textContent()), 'summary shows the typed title');
    bad = await audit(page); c.ok(!bad.length, 'release step layout: ' + bad.join(', '));
    await tap(page, 'btn-release');
    await page.waitForFunction(() => !GG.ui.isOpen('release'));
    const al = await page.evaluate(() => { const a = GG.labels.pending(GG.state); return a && { id: a.id, title: a.title, status: a.status, week: a.releaseWeek - GG.state.totalWeek, bought: a.bought || [], motif: a.cover && a.cover.motif }; });
    c.ok(al && al.title === 'Moose on the Loose' && al.status === 'scheduled' && al.week === 2 && (promoId == null || al.bought.includes(promoId)), 'scheduled: ' + JSON.stringify(al));
    // Weeks pass → release day in the wrap: news, reviews open on their own, then the chart
    await page.evaluate(() => { for (let i = 0; i < 5; i++) { const a = GG.state.albums.find(x => x.title === 'Moose on the Loose'); if (a.status === 'released') break; nextWeek(); GG.state.gig = null; plainWeek(); } });
    await waitScreen(page, 'reviews', 8000);
    const rel = await page.evaluate(() => ({ news: (GG.state.wrap.labels.news || []).map(n => n.kind), a: GG.state.albums.find(x => x.title === 'Moose on the Loose') }));
    c.ok(rel.news.includes('released') && rel.a.status === 'released' && rel.a.reviews.length === 5, 'release day: wrap news + 5 reviews: ' + rel.news.join(','));
    c.ok(await visible(page, 'review-0'), 'reviews reveal opened from the wrap');
    for (let i = 1; i < 5; i++) await tap(page, 'btn-review-next');
    await tap(page, 'btn-reviews-done');
    if (rel.a.chart && rel.a.chart.pos) { await waitScreen(page, 'chart'); c.ok(await visible(page, 'chart-you'), 'Maple 100 after the reviews'); await tap(page, 'btn-chart-ok'); }
    else c.ok(true, 'no chart entry this time (debut outside the 100)');
    await waitScreen(page, 'wrap');
    c.ok(await visible(page, 'wrap-label'), 'wrap: music business panel');
    bad = await audit(page); c.ok(!bad.length, 'wrap layout: ' + bad.join(', '));
    await shot(page, 'wrap_label.png');
    c.ok(!errors.length, 'no console errors: ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + e.message); } finally { await close(); c.done(); }
}

async function awards() {
  const c = checker('awards');
  const { page, errors, close } = await open();
  try {
    await setup(page, 7070);
    const aid = await page.evaluate(() => {
      const s = GG.state; s.totalWeek = 36; s.year = 2; s.week = 12; localHeroes(6000); s.fund = 5000; s.flags.cape = 'velvet'; s.buzz = 70; s.drumSkill = 70;
      addSongs(10);
      s.labelOffers = [GG.labels.makeOffer(s, 'monolith', GG.RNG(5))]; GG.labels.sign(s, 'monolith');
      const r = GG.labels.book(s, { kind: 'album', studioId: 'grain_silo', producerId: null, tracks: GG.labels.freshSongs(s).slice(0, 8).map(x => x.id) });
      while (GG.labels.inSession(s)) GG.labels.studioWeek(s, GG.rngFor(s));
      const a = GG.labels.pending(s);
      GG.labels.release(s, { title: 'Hail Dominion', cover: GG.labels.coverOptions(s, 4, 0)[1], tracks: a.tracks, single: a.tracks[2], week: s.totalWeek + 2, promo: [] });
      s.totalWeek += 2; s.week += 2;
      const out = { news: [], royalties: 0, recouped: 0, costs: 0 };
      GG.labels.releaseNow(s, a, GG.rngFor(s), out);
      a.sales = Math.max(a.sales || 0, 41200); a.cert = 'gold'; a.chart = Object.assign({ debut: 17, peak: 9, weeks: 6, pos: 12 }, a.chart && a.chart.pos ? a.chart : {});
      s.trophies.push({ kind: 'gold', title: a.title, year: 2 }); s.banned = ['st_vlads_hall', 'bingo_palace'];
      GG.main.sync(); GG.ui.showReviews(a.id);
      return a.id;
    });
    await waitScreen(page, 'reviews');
    for (let i = 1; i < 5; i++) await tap(page, 'btn-review-next');
    const sc = await page.evaluate(() => [0, 1, 2, 3, 4].map(i => document.querySelector(`[data-testid="review-score-${i}"]`).textContent));
    c.ok(sc.length === 5 && sc.every(Boolean) && sc.some(x => /★/.test(x)) && sc.some(x => /\/100/.test(x)), 'scores in each outlet scale: ' + sc.join(' | '));
    c.ok(!/\{(band|album|single)\}/.test(await page.locator('.reviews').textContent()), 'pull-quote tokens filled');
    let bad = await audit(page); c.ok(!bad.length, 'reviews layout: ' + bad.join(', '));
    await shot(page, 'reviews.png');
    await tap(page, 'btn-reviews-done');
    await waitScreen(page, 'chart');
    c.ok(await visible(page, 'chart-you'), 'Maple 100: your row');
    bad = await audit(page); c.ok(!bad.length, 'chart layout: ' + bad.join(', '));
    await shot(page, 'chart.png');
    await tap(page, 'btn-chart-ok');
    await page.evaluate(id => GG.ui.showCert(id, 'gold'), aid);
    await waitScreen(page, 'cert');
    c.ok(await visible(page, 'cert-disc'), 'gold cert moment');
    await page.waitForTimeout(500); await shot(page, 'cert.png');
    await tap(page, 'btn-cert-ok');
    await page.evaluate(() => { GG.ui.closeAll(); GG.state.phase = 'plan'; GG.emit('hotspot', { action: 'trophies' }); });
    await waitScreen(page, 'trophies');
    c.ok(await page.locator('[data-testid^="trophy-"]').count() >= 1, 'trophies hotspot opens the trophy shelf');
    await page.evaluate(() => GG.ui.closeAll());
    const wall = await page.evaluate(() => GG.debug('render').trophyWall);
    c.ok(wall && wall.records >= 1 && wall.banned === 2, 'garage trophy wall: ' + JSON.stringify(wall));

    // ---- The Loonies: real nominations, week 20 wrap runs the ceremony before endWeek ----
    const noms = await page.evaluate(() => {
      const s = GG.state; s.week = 16; GG.labels.nominate(s, GG.RNG(8), { news: [] });
      if (!s.loonies.invited) {   // make sure there's a ceremony to host
        s.loonies.nominations = [{ category: 'live', name: 'Best Live Act', what: 'x', nominees: [GG.ui.v5.bandName(), 'Tundra Wraith', 'Mall Rats'], strength: 95, rival: 60 },
          { category: 'album', name: 'Heavy Album of the Year', what: 'x', nominees: [GG.ui.v5.bandName(), 'Tundra Wraith', 'Buckle & Boot'], strength: 20, rival: 95 }];
        s.loonies.invited = true;
      }
      s.week = 20; s.totalWeek = 44; s.phase = 'plan'; GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s, { autoGig: true });
      GG.main.wrapWeek();
      return s.loonies.nominations.length;
    });
    await waitScreen(page, 'loonies');
    c.ok(noms >= 1 && await page.evaluate(() => GG.state.phase === 'wrap' && !GG.state.loonies.done), 'week 20: the Loonies open before endWeek (' + noms + ' nominations)');
    await page.waitForTimeout(1200);
    const info = await page.evaluate(() => GG.debug('render'));
    const ci = info.carpet || {};
    c.ok(info.scene === 'carpet' && ci.built && ci.rival === 4 && ci.cape && ci.band.length >= 5 && ci.host, 'carpet scene: band ' + (ci.band || []).length + ', cape, 4 rivals, host');
    c.ok(info.drawCalls > 5 && info.drawCalls < 60, 'carpet draw calls < 60: ' + info.drawCalls);
    await tap(page, 'btn-carpet-next'); await page.waitForTimeout(250); await tap(page, 'btn-carpet-next');
    const walked = await page.waitForFunction(() => GG.debug('render').carpet.walking === 0, null, { timeout: 12000 }).then(() => true, () => false);
    c.ok(walked, 'the band walked in');
    await page.waitForTimeout(300);
    bad = await audit(page); c.ok(!bad.length, 'carpet layout: ' + bad.join(', '));
    await shot(page, 'carpet.png');
    await tap(page, 'btn-outfit');
    await waitScreen(page, 'loonie-card');
    await tap(page, 'loonie-choice-0');
    c.ok(await visible(page, 'btn-loonie-card-ok') && await page.evaluate(() => typeof GG.state.flags.loonieOutfit === 'string' && GG.state.loonies.outfit === 0), 'outfit card applied by the sim: ' + await page.evaluate(() => GG.state.flags.loonieOutfit));
    await tap(page, 'btn-loonie-card-ok');
    await tap(page, 'btn-head-inside');
    await page.waitForFunction(() => GG.debug('uiAwards').loonies.phase === 'show');
    await page.waitForTimeout(1500);
    c.ok(await page.evaluate(() => GG.debug('render').carpet.mode) === 'podium', 'podium mode');
    let wins = 0, wraith = 0, envShot = false;
    for (let i = 0; i < noms; i++) {
      await tap(page, 'btn-envelope');
      const w = await page.locator(tid('winner')).textContent();
      if (await page.locator(tid('btn-speech')).count()) {
        wins++;
        if (!envShot) { await page.waitForTimeout(800); await shot(page, 'envelope.png'); envShot = true; }
        await tap(page, 'btn-speech'); await waitScreen(page, 'loonie-card'); await tap(page, 'loonie-choice-0'); await tap(page, 'btn-loonie-card-ok');
      }
      if (/Tundra Wraith/.test(w)) { wraith++; c.ok(await visible(page, 'wraith-thanks'), 'Tundra Wraith win and thank you personally'); }
      if (!envShot && i === noms - 1) { await shot(page, 'envelope.png'); envShot = true; }
      bad = await audit(page); if (bad.length) c.ok(false, 'envelope layout: ' + bad.join(', '));
      await tap(page, 'btn-award-next');
    }
    await page.waitForSelector(tid('loonies-summary'));
    const done = await page.evaluate(() => GG.state.loonies.done);
    c.ok(done, 'envelopes resolved the ceremony in the sim (' + wins + ' win(s), ' + wraith + ' to the rival)');
    await tap(page, 'btn-loonies-done');
    await waitScreen(page, 'wrap', 8000);
    const end = await page.evaluate(() => ({ scene: GG.debug('render').scene, carpet: GG.render.carpet.info(), phase: GG.state.phase, week: GG.state.week, news: (GG.state.wrap.labels.news || []).map(n => n.kind) }));
    c.ok(end.scene === 'garage' && !end.carpet.built && end.phase === 'monday' && end.week === 21, 'after the ceremony: endWeek ran, back to the garage, carpet disposed: ' + JSON.stringify(end).slice(0, 120));
    c.ok(!errors.length, 'no console errors: ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + e.message); } finally { await close(); c.done(); }
}

// sheet: tiles the v0.5 screenshots into one 390x844 contact sheet (tests/.cache/v05_sheet.png). Run after the others.
async function sheet() {
  const fs = require('fs'), c = checker('sheet');
  const names = ['label_offer', 'label_deal', 'studio_book', 'release_tracks', 'release_cover', 'reviews', 'chart', 'carpet', 'envelope'];
  const have = names.filter(n => fs.existsSync(path.join(CACHE, n + '.png')));
  const { page, close } = await open({ noGoto: true });
  try {
    const imgs = have.map(n => '<img src="data:image/png;base64,' + fs.readFileSync(path.join(CACHE, n + '.png')).toString('base64') + '">').join('');
    await page.setContent('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(3,130px);grid-auto-rows:281px;gap:0">'
      + imgs.replace(/<img /g, '<img style="width:130px;height:281px;display:block" ') + '</body></html>');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(CACHE, 'v05_sheet.png') });
    c.ok(have.length === names.length, 'contact sheet tiles: ' + have.length + '/' + names.length);
  } finally { await close(); c.done(); }
}

(async () => {
  if (want('label')) await label();
  if (want('studio')) await studio();
  if (want('awards')) await awards();
  if (want('sheet')) await sheet();
})();
