// pw_fans.js: Bandbook + fans (v0.6.1, FANS agent; Addendum 1 C5) on a 390x844 phone (+ a 440x956 pass).
// Sections (META_ONLY=bandbook|fanclub, comma-separated; default both). Each must finish inside `timeout 500`.
//   bandbook : quickStart → plan Promote + Rehearse + Rest in the planner → the week's results mention the Bandbook post →
//              Dale from Warman in the house-party result → laptop → Bandbook tab (seven laptop tabs wrap into two rows,
//              every tab a thumb target) → the feed: posts with 2–4 comments + the rival on every post; a good viral and a
//              cringe post (badges) → screenshot tests/.cache/bandbook.png → Fans tab: type bars, Dale met, Wendell locked,
//              the Japanese president teased for v0.7, fan mail + gifts → the garage shows the macaroni Kenji, the gift pile
//              and the letters (3D) → a queued scandal comes up as next Monday's card (Marcel's turf) → haters up. No console errors.
//   fanclub  : Patreeon tab locked in the garage era → Signed era: open it from the app → members, happiness, three tiers
//              (Drumstick / Snare / Full Kit) → Post an exclusive (happier, once a week) → screenshot tests/.cache/fanclub.png
//              → a month-end payout posts to the group chat → the Patreeon Monday card opens a club on a fresh career →
//              440x956 layout. No console errors.
// Run: node build.js && META_ONLY=bandbook timeout 500 node tests/pw_fans.js
const path = require('path');
const { open, checker } = require('./_pw');
const CACHE = path.join(__dirname, '.cache');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);

const tid = id => `[data-testid="${id}"]`;
const tap = (page, id) => page.locator(tid(id)).last().click();
const screen = page => page.evaluate(() => GG.debug('ui').screen);
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });
const count = (page, sel) => page.locator(sel).count();

function audit(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const cs = getComputedStyle(e); return cs.visibility === 'hidden' || cs.display === 'none' ? null : r; };
    const name = e => (e.dataset.testid || e.className || e.tagName) + '';
    for (const e of document.querySelectorAll('#screens *')) { const r = vis(e); if (r && (r.right > W + 1 || r.left < -1)) bad.push('overflow ' + name(e)); }
    for (const sc of document.querySelectorAll('.full-body, .sheet-body')) if (sc.scrollWidth > sc.clientWidth + 1) bad.push('hscroll ' + sc.className);
    if (document.documentElement.scrollWidth > W + 1) bad.push('page hscroll');
    for (const b of document.querySelectorAll('#screens button')) { const r = vis(b); if (r && (r.width < 43.5 || r.height < 43.5)) bad.push('small ' + name(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
    return bad.slice(0, 8);
  });
}
async function toPlan(page) {
  await page.waitForFunction(() => GG.state && (GG.state.phase === 'plan' || GG.debug('ui').screen === 'card'), null, { timeout: 10000 });
  if (await screen(page) === 'card') { await tap(page, 'choice-0'); await tap(page, 'btn-card-ok'); }
  await page.waitForFunction(() => GG.state.phase === 'plan' && GG.debug('ui').stack.length === 0, null, { timeout: 10000 });
}
async function toResults(page) {
  await page.waitForFunction(() => ['results', 'wrap'].includes(GG.debug('ui').screen) || GG.state.phase === 'gig', null, { timeout: 15000 });
  if (await page.evaluate(() => GG.state.phase === 'gig')) {
    await page.evaluate(() => { GG.ui.closeAll(); GG.career.finishGig(GG.state, null); GG.main.sync(); GG.ui.show('results', { result: GG.state.lastWeek }); });
  }
}
async function wrapUp(page) {
  if (await screen(page) === 'results') {
    if (await page.locator(tid('btn-results-skip')).isVisible()) await tap(page, 'btn-results-skip');
    await tap(page, 'btn-results-ok');
  }
  await waitScreen(page, 'wrap');
}
async function openBandbook(page, sub) {
  await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('laptop', { tab: 'chat' }); });
  await waitScreen(page, 'laptop');
  await tap(page, 'laptop-tab-bandbook');
  await page.waitForSelector(tid('bandbook-panel'));
  if (sub) { await tap(page, 'bb-tab-' + sub); await page.waitForTimeout(80); }
}

/* ---- bandbook ------------------------------------------------------------------------------------------------ */
async function bandbook() {
  const c = checker('bandbook');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => GG.main.quickStart({ seed: 6161 }));
    await toPlan(page);
    await tap(page, 'btn-primary'); await waitScreen(page, 'plan');
    for (const a of ['promote', 'rehearse', 'rest']) await tap(page, 'act-' + a);
    await tap(page, 'btn-go');
    await toResults(page);
    const res = await page.evaluate(() => ({ lines: [].concat(...GG.state.lastWeek.blocks.map(b => b.lines)), posts: GG.state.bandbook.posts.length,
      text: (document.querySelector('#screens') || document.body).textContent, gig: GG.state.lastGig && GG.state.lastGig.lines, dale: GG.state.superfans.dale.seen }));
    c.ok(res.posts === 1 && res.lines.some(l => /Posted to Bandbook/.test(l)), 'the Promote block posted automatically: ' + res.lines.find(l => /Bandbook/.test(l)));
    c.ok(/Bandbook/.test(res.text), 'the week results show the post');
    c.ok(res.dale === 1 && (res.gig || []).some(l => /Dale from Warman/.test(l)), 'Dale from Warman at the house party');
    await wrapUp(page);
    await tap(page, 'btn-next-week');
    await toPlan(page);
    // the laptop: seven tabs in two rows, each a full thumb target
    await openBandbook(page);
    const tabs = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="laptop-tab-"]')].map(e => { const r = e.getBoundingClientRect(); return { h: r.height, w: r.width, top: Math.round(r.top), right: r.right, vw: document.documentElement.clientWidth }; }));
    c.ok(tabs.length === 9 && tabs.every(t => t.h >= 44 && t.w >= 60 && t.right <= t.vw + 0.5) && new Set(tabs.map(t => t.top)).size === 2, 'laptop: 9 tabs (v0.7: + World, v0.8.1: + Years), 2 rows, ≥44px ' + JSON.stringify(tabs.map(t => [Math.round(t.w), t.h])));
    // a good viral + a cringe post (the dice loaded through the economy tunables)
    await page.evaluate(() => {
      const E = GG.content.economy, keep = E.fans, s = GG.state;
      E.fans = JSON.parse(JSON.stringify(keep)); E.fans.viral.base = 1; E.fans.viral.max = 1; E.fans.viral.cringe = 0; GG.fans.post(s, {});
      E.fans = JSON.parse(JSON.stringify(keep)); E.fans.viral.base = 1; E.fans.viral.max = 1; E.fans.viral.cringe = 1; GG.fans.post(s, {});
      E.fans = keep; s.gig = GG.gig.makeGig(s, 'legion_63', 'card'); GG.fans.post(s, { kind: 'gig' }); s.gig = null;
      GG.main.sync();
    });
    await openBandbook(page, 'feed');
    const feed = await page.evaluate(() => [...document.querySelectorAll('[data-testid="bb-post"]')].map(p => ({ kind: p.dataset.kind, viral: p.dataset.viral,
      fans: p.querySelectorAll('[data-testid="bb-comment"]:not([data-who="rival"])').length, rival: p.querySelectorAll('[data-testid="bb-comment"][data-who="rival"]').length,
      rivalName: (p.querySelector('[data-who="rival"] b') || {}).textContent })));
    c.ok(feed.length === 4, 'four posts in the feed: ' + feed.map(p => p.kind).join(','));
    c.ok(feed.every(p => p.rival === 1 && p.fans >= 2 && p.fans <= 4), 'every post: 2–4 comments + one from the rival ' + JSON.stringify(feed.map(p => [p.fans, p.rival])));
    c.ok(feed[0].kind === 'gig' && /Tundra Wraith/.test(feed[0].rivalName || ''), 'newest first; the rival signs as ' + feed[0].rivalName);
    c.ok(feed.some(p => p.viral === 'good') && feed.some(p => p.viral === 'cringe') && await count(page, tid('bb-viral')) === 2, 'viral + wrong-kind-of-viral badges');
    const cr = await page.evaluate(() => GG.state.bandbook.posts.find(p => p.viral === 'cringe'));
    c.ok(cr && /Wrong kind of viral/.test(cr.text) && cr.who !== 'kenji', 'cringe: ' + (cr && cr.text));
    await page.screenshot({ path: path.join(CACHE, 'bandbook.png') });
    const bad1 = await audit(page); c.ok(bad1.length === 0, 'feed layout: ' + bad1.join(', '));
    // Fans tab: types, superfans, mail + gifts
    await page.evaluate(() => { const s = GG.state; GG.fans.addGift(s, 'toque'); GG.fans.addGift(s, 'jam'); GG.fans.addGift(s, 'mail_yorkton_kid'); GG.fans.apply(s, { gift: 'macaroni_kenji' }); GG.main.sync(); });
    await openBandbook(page, 'fans');
    const fans = await page.evaluate(() => ({ types: document.querySelectorAll('[data-testid^="bb-type-"]').length, dale: document.querySelector('[data-testid="bb-superfan-dale"]').textContent,
      trk: document.querySelector('[data-testid="bb-superfan-trucker"]').className, jp: document.querySelector('[data-testid="bb-superfan-japan"]').textContent,
      gifts: document.querySelectorAll('[data-testid="bb-gift"]').length, mac: !!document.querySelector('[data-testid="bb-gift"][data-id="macaroni_kenji"]') }));
    c.ok(fans.types === 3, 'superfans / casuals / haters bars');
    c.ok(/Dale from Warman/.test(fans.dale) && /Shows: 1/.test(fans.dale), 'Dale: met, 1 show');
    c.ok(/locked/.test(fans.trk) && /Japan/.test(fans.jp), 'Wendell not met yet; the Japanese president waits for Japan (v0.7)');
    c.ok(fans.gifts === 4 && fans.mac, 'fan mail + gifts, incl. the macaroni Kenji');
    const bad2 = await audit(page); c.ok(bad2.length === 0, 'fans layout: ' + bad2.join(', '));
    const fm = await page.evaluate(() => { if (!GG.main.renderOk) return null; GG.render.syncState(GG.state); return GG.debug('render').fanMail; });
    if (fm) c.ok(fm.portrait && fm.gifts === 1 && fm.mail, 'garage: macaroni Kenji on the wall, a gift pile, the letters ' + JSON.stringify(fm));
    else c.ok(true, 'garage fan mail: no WebGL, skipped');
    if (fm) {
      await page.evaluate(() => { GG.ui.closeAll(); GG.render.goToHotspot && GG.render.goToHotspot('gigboard'); });
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(CACHE, 'garage_fanmail.png') });
    }
    // a queued scandal comes up as next Monday's card
    // (the walk to the gig board opens the board and hides the dock until it lands: let it settle, then close)
    await page.waitForTimeout(fm ? 1500 : 0);
    await page.evaluate(() => { GG.ui.closeAll(); });
    await page.locator(tid('btn-primary')).last().waitFor({ state: 'visible', timeout: 10000 });
    await tap(page, 'btn-primary'); await waitScreen(page, 'plan');
    for (const a of ['rest', 'rest', 'rest']) await tap(page, 'act-' + a);
    await tap(page, 'btn-go');
    await toResults(page); await wrapUp(page);
    const h0 = await page.evaluate(() => { const s = GG.state; s.week = 14; s.totalWeek = 14; s.bandbook.lastCard = null; s.bandbook.pending = { card: 'scandal_turf', who: 'marcel', week: 13 }; return s.fanTypes.hater; });
    await tap(page, 'btn-next-week');
    await waitScreen(page, 'card');
    const card = await page.evaluate(() => ({ id: GG.state.card && GG.state.card.id, title: document.querySelector('.card-title').textContent, text: document.querySelector('.card-text').textContent }));
    c.ok(card.id === 'scandal_turf' && /Lawn Is Turf/.test(card.title) && /artificial turf/.test(card.text), 'scandal card: ' + card.title);
    await tap(page, 'choice-1'); await tap(page, 'btn-card-ok');
    const h1 = await page.evaluate(() => ({ h: GG.state.fanTypes.hater, n: GG.state.bandbook.scandals }));
    c.ok(h1.h > h0 && h1.n === 1, 'double down: haters up, scandal counted');
    c.ok(errors.length === 0, 'no console errors: ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'bandbook crashed: ' + (e.stack || e).toString().slice(0, 400)); }
  finally { await close(); }
  c.done();
}

/* ---- fanclub ------------------------------------------------------------------------------------------------- */
async function fanclub() {
  const c = checker('fanclub');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => GG.main.quickStart({ seed: 7272 }));
    await toPlan(page);
    await openBandbook(page, 'club');
    c.ok(await count(page, tid('bb-club-locked')) === 1 && /Signed era/.test(await page.textContent(tid('bb-club-locked'))), 'Patreeon: locked in the garage era');
    c.ok(/van repairs/.test(await page.textContent(tid('bandbook-panel'))), 'the pitch: van repairs');
    await page.evaluate(() => { const s = GG.state; s.era = 'signed'; s.fans = 20000; for (let i = 0; i < 20; i++) GG.fans.weekly(s); s.week = 13; s.totalWeek = 13; GG.main.sync(); });
    await openBandbook(page, 'club');
    await tap(page, 'bb-club-open');
    await page.waitForSelector(tid('bb-club-stats'));
    const v = await page.evaluate(() => ({ club: GG.state.fanClub, tiers: [...document.querySelectorAll('[data-testid^="bb-tier-"]')].map(e => e.textContent), stats: document.querySelector('[data-testid="bb-club-stats"]').textContent }));
    c.ok(v.club && v.club.members >= 2 && v.club.happiness === 70, 'the club is open ' + JSON.stringify(v.club));
    c.ok(v.tiers.length === 3 && /Drumstick/.test(v.tiers[0]) && /Snare/.test(v.tiers[1]) && /Full Kit/.test(v.tiers[2]) && /Dale/.test(v.tiers[2]), 'tiers Drumstick / Snare / Full Kit (Dale on Full Kit)');
    c.ok(/members/.test(v.stats) && /next payout/.test(v.stats), 'members + next payout');
    const h0 = v.club.happiness;
    await tap(page, 'bb-exclusive');
    await page.waitForTimeout(100);
    const ex = await page.evaluate(() => ({ h: GG.state.fanClub.happiness, dis: document.querySelector('[data-testid="bb-exclusive"]').disabled, label: document.querySelector('[data-testid="bb-exclusive"]').textContent,
      posts: document.querySelectorAll('[data-testid="bb-club-posts"] [data-testid="bb-post"]').length, excl: GG.state.bandbook.posts.filter(p => p.exclusive).length }));
    c.ok(ex.h > h0 && ex.dis && /posted this week/.test(ex.label) && ex.posts === 1 && ex.excl === 1, 'exclusive: happier, once a week ' + JSON.stringify(ex));
    await page.screenshot({ path: path.join(CACHE, 'fanclub.png') });
    const bad = await audit(page); c.ok(bad.length === 0, 'club layout: ' + bad.join(', '));
    await page.setViewportSize({ width: 440, height: 956 }); await page.waitForTimeout(150);
    const bad440 = await audit(page); c.ok(bad440.length === 0, 'club layout 440x956: ' + bad440.join(', '));
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(150);
    // month end: the payout lands in the fund and the group chat
    const pay = await page.evaluate(() => { const s = GG.state; s.week = 14; s.totalWeek = 14; const f0 = s.fund; const r = GG.fans.weekly(s); GG.main.sync(); return { paid: r.club && r.club.paid, df: s.fund - f0 }; });
    c.ok(pay.paid > 0 && pay.df === pay.paid, 'monthly payout ' + JSON.stringify(pay));
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('laptop', { tab: 'chat' }); });
    await waitScreen(page, 'laptop');
    c.ok(/Patreeon/.test(await page.textContent('#screens')), 'the payout is in the group chat');
    // a fresh Signed career gets the Patreeon card on a Monday
    await page.evaluate(() => { GG.ui.closeAll(); const s = GG.state; s.fanClub = null; s.bandbook.lastCard = null; s.bandbook.clubDeclined = null; });
    await tap(page, 'btn-primary'); await waitScreen(page, 'plan');
    for (const a of ['rest', 'rest', 'rest']) await tap(page, 'act-' + a);
    await tap(page, 'btn-go');
    await toResults(page); await wrapUp(page);
    await page.evaluate(() => { const s = GG.state; s.week = 14; s.totalWeek = 14; s.fanClub = null; s.bandbook.lastCard = null; s.bandbook.pending = null; });
    await tap(page, 'btn-next-week');
    await waitScreen(page, 'card');
    c.ok(await page.evaluate(() => GG.state.card.id) === 'fans_patreeon' && /Patreeon/.test(await page.textContent('.card-title')), 'the Patreeon Monday card');
    await tap(page, 'choice-0'); await tap(page, 'btn-card-ok');
    c.ok(await page.evaluate(() => !!GG.state.fanClub), 'opened from the card');
    c.ok(errors.length === 0, 'no console errors: ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'fanclub crashed: ' + (e.stack || e).toString().slice(0, 400)); }
  finally { await close(); }
  c.done();
}

(async () => {
  if (want('bandbook')) await bandbook();
  if (want('fanclub')) await fanclub();
})();
