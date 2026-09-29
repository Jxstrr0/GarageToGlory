// pw_drama.js: v0.4 drama UI on a 390x844 phone viewport. Section META_ONLY=drama (the only one).
//   drama : quickStart → a bot week → laptop Band tab: pay-the-band slider (live preview, state.payCut), stage badges,
//           wants; screenshot tests/.cache/drama_band.png → a forced ultimatum Monday card (⚠ tag) → refuse → Marcel
//           quits → the Band tab shows the hole → Hire a fill-in → Post an ad → recruit screen with 3 candidate cards
//           (screenshot drama_recruit.png) → Re-post costs $20 and changes them → Hire → the hole is filled → a wrap
//           with the "Trouble in the band" warnings panel. Layout audits (no overflow, buttons ≥ 44px). No console errors.
// Run: node build.js && META_ONLY=drama timeout 500 node tests/pw_drama.js
const path = require('path');
const { open, checker } = require('./_pw');
const CACHE = path.join(__dirname, '.cache');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);

const tid = id => `[data-testid="${id}"]`;
const tap = (page, id) => page.locator(tid(id)).last().click();
const visible = (page, id) => page.locator(tid(id)).last().isVisible();
const screen = page => page.evaluate(() => GG.debug('ui').screen);
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });
const count = (page, id) => page.locator(tid(id)).count();
function audit(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const cs = getComputedStyle(e); return cs.visibility === 'hidden' || cs.display === 'none' ? null : r; };
    const name = e => (e.dataset.testid || e.className || e.tagName) + '';
    for (const e of document.querySelectorAll('#screens *')) { const r = vis(e); if (r && (r.right > W + 1 || r.left < -1)) bad.push('overflow ' + name(e)); }
    for (const sc of document.querySelectorAll('.sheet-body, .full-body')) if (sc.scrollWidth > sc.clientWidth + 1) bad.push('hscroll ' + sc.className);
    for (const b of document.querySelectorAll('#screens button, #screens input[type=range]')) { const r = vis(b); if (r && (r.width < 43.5 || r.height < 43.5)) bad.push('small ' + name(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
    return bad.slice(0, 8);
  });
}
async function openLaptopBand(page) {
  await page.evaluate(() => { GG.ui.closeAll(); GG.emit('hotspot', { action: 'laptop' }); });
  await waitScreen(page, 'laptop');
  await tap(page, 'laptop-tab-band');
  await page.waitForSelector(tid('pay-slider'));
}

async function drama() {
  const c = checker('drama');
  const { page, errors, close } = await open();
  try {
    await page.waitForFunction(() => window.GG && GG.main && GG.drama && GG.content.dramaCards, null, { timeout: 15000 });
    await page.evaluate(() => {
      GG.main.quickStart({ seed: 4040, openCard: false });
      GG.ui.closeAll();
      const s = GG.state;
      GG.career.botWeek(s, 'avg');                         // week 1 done → week 2 Monday
      s.fans = 420; s.fund = 400; s.protected = false; s.milestones.localHeroes = 1;
      s.members.find(m => m.id === 'dana').stage = 1; s.members.find(m => m.id === 'dana').gripe = 'money';
      s.members.find(m => m.id === 'jaxon').stage = 2;
      GG.main.sync();
    });

    // ---- Laptop Band tab: pay slider, badges, wants ----
    await openLaptopBand(page);
    c.ok(await visible(page, 'pay-slider') && await visible(page, 'pay-preview'), 'pay slider + preview on the Band tab');
    const pv0 = await page.locator(tid('pay-preview')).textContent();
    await page.locator(tid('pay-slider')).evaluate(e => { e.value = '45'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    const pv1 = await page.locator(tid('pay-preview')).textContent();
    c.ok(await page.evaluate(() => GG.state.payCut) === 0.45 && pv1 !== pv0 && /Members get \$\d+ of a \$\d+ gig/.test(pv1), 'slider sets payCut 45% with a live preview: ' + pv1.slice(0, 60));
    await page.locator(tid('pay-slider')).evaluate(e => { e.value = '30'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    c.ok((await page.locator(tid('stage-dana')).textContent()).includes('grumbling') && (await page.locator(tid('stage-jaxon')).textContent()).includes('passive-aggressive'), 'stage badges');
    c.ok(await count(page, 'stage-marcel') === 0 && /Wants:/.test(await page.locator(tid('want-marcel')).textContent()), 'no badge when fine; current want shown');
    let bad = await audit(page); c.ok(!bad.length, 'Band tab layout: ' + bad.join(', '));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(CACHE, 'drama_band.png') });

    // ---- A forced ultimatum card → refuse → Marcel quits ----
    await page.evaluate(() => {
      GG.ui.closeAll();
      const m = GG.state.members.find(x => x.id === 'marcel'); m.stage = 3; m.ultimatum = GG.state.totalWeek; m.mood = 20;
      GG.main.beginWeek();
    });
    await waitScreen(page, 'card');
    c.ok(await page.evaluate(() => GG.state.card.id) === 'ult_marcel' && await visible(page, 'card-ultimatum'), 'forced ultimatum card with the ⚠ tag');
    await tap(page, 'choice-2');
    await page.waitForSelector(tid('btn-card-ok'));
    c.ok(await page.evaluate(() => GG.state.members.find(x => x.id === 'marcel').status) === 'quit', 'refusing: Marcel quits');
    c.ok(/quits/.test(await page.locator('.sheet .chips').last().textContent()), 'outcome chips say he quit');
    await tap(page, 'btn-card-ok');

    // ---- The hole: fill-in, post an ad, recruit screen, re-post, hire ----
    await openLaptopBand(page);
    c.ok(await visible(page, 'hole-vocals') && await visible(page, 'gone-marcel'), 'Band tab shows the hole and where Marcel went');
    await tap(page, 'btn-fillin-vocals');
    await page.waitForFunction(() => GG.state.fillIns && GG.state.fillIns.vocals, null, { timeout: 5000 });
    c.ok(await visible(page, 'btn-dismiss-vocals'), 'fill-in hired (can be let go)');
    const fund0 = await page.evaluate(() => GG.state.fund);
    await tap(page, 'btn-post-ad-vocals');
    await waitScreen(page, 'recruit');
    c.ok(await count(page, 'recruit-card-0') + await count(page, 'recruit-card-1') + await count(page, 'recruit-card-2') === 3, 'three candidate cards');
    c.ok(await page.evaluate(() => GG.state.fund) === fund0 - 30, 'the ad costs $30');
    const txt = await page.locator(tid('recruit-card-0')).textContent();
    c.ok(/Trait/.test(txt) && /Quirk/.test(txt) && /Chemistry/.test(txt) && /From /.test(txt) && /of gig pay/.test(txt), 'card: trait, quirk, chemistry, hometown, asking cut');
    bad = await audit(page); c.ok(!bad.length, 'recruit screen layout: ' + bad.join(', '));
    await page.waitForTimeout(600);   // let the sheet finish sliding in
    await page.screenshot({ path: path.join(CACHE, 'drama_recruit.png') });
    const names0 = await page.evaluate(() => GG.state.recruitAd.candidates.map(x => x.name).join());
    await tap(page, 'btn-repost');
    await page.waitForFunction(() => GG.state.recruitAd.posts === 2, null, { timeout: 5000 });
    c.ok(await page.evaluate(() => GG.state.fund) === fund0 - 50 && await page.evaluate(() => GG.state.recruitAd.candidates.map(x => x.name).join()) !== names0, 're-post: $20, three new cards');
    const pick = await page.evaluate(() => GG.state.recruitAd.candidates[0].name);
    await tap(page, 'btn-hire-0');
    await waitScreen(page, 'laptop');
    const after = await page.evaluate(() => ({ holes: GG.drama.holes(GG.state), rec: GG.state.members.filter(m => !m.original).map(m => m.name), fill: GG.state.fillIns }));
    c.ok(!after.holes.length && after.rec[0] === pick && !after.fill.vocals, 'hired: hole filled, fill-in dismissed (' + pick + ')');
    c.ok(await visible(page, 'member-rec1'), 'the recruit is on the Band tab');

    // ---- A wrap with warnings ----
    await page.evaluate(() => {
      GG.ui.closeAll();
      const s = GG.state;
      GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s, { autoGig: true });
      s.members.find(m => m.id === 'dana').mood = 10;
      GG.main.wrapWeek();
    });
    await waitScreen(page, 'wrap');
    c.ok(await visible(page, 'wrap-warnings') && /Dana is/.test(await page.locator(tid('wrap-warnings')).textContent()), 'wrap lists the warnings');
    c.ok(!errors.length, 'no console errors: ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'drama threw: ' + (e.stack || e).toString().slice(0, 400)); }
  finally { await close(); }
  c.done();
}

(async () => { if (want('drama')) await drama(); })();
