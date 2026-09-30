// pw_recap.js (v0.8.1 LICRECAP): licensing offers (D1) and the year-end recap (D3) on a 390x844 phone viewport.
// Sections (META_ONLY=offer|recap, comma-separated; default both). Each fits `timeout 500`.
//   offer : a Signed band gets an offer → the Monday card (brand, song, fee, 4 choices with hints) → Take it: the fee (minus
//           the label's cut) lands in the fund, the song is "in a commercial" (SONG.ad, stale), buzz up; a second offer →
//           "Sleep on it" → it waits on the laptop's Offers line → the offer sheet → Counter (walks or lands at +40%) →
//           the outcome; a third one expires at the wrap (wrap news). No share / screenshot buttons anywhere.
//           Screenshots recap_offer_card.png, recap_offer_outcome.png, recap_offer_laptop.png, recap_offer_sheet.png.
//   recap : 23 bot weeks + week 24 through the UI → the wrap's "Year in review" → the swipeable recap (cover with the
//           Rolling Scone headline + a real 3D band photo, money, gigs, studio, the band + the scene, year one's "what a
//           good year looks like") → Start year 2 → week 25; the laptop's Years tab re-opens it. Layout audit on every
//           page. Screenshots recap_p<0..5>.png, recap_years.png.
// Run: node build.js && META_ONLY=recap timeout 500 node tests/pw_recap.js
const path = require('path'), fs = require('fs');
const { open, checker } = require('./_pw');
const CACHE = path.join(__dirname, '.cache');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);
const TAG = process.env.PW_TAG || '';

const tid = id => `[data-testid="${id}"]`;
const tap = (page, id) => page.locator(tid(id)).last().click();
const count = (page, id) => page.locator(tid(id)).count();
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });
const shot = (page, name) => page.screenshot({ path: path.join(CACHE, name.replace(/\.png$/, TAG + '.png')) });

function audit(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const cs = getComputedStyle(e); return cs.visibility === 'hidden' || cs.display === 'none' ? null : r; };
    const name = e => (e.dataset && e.dataset.testid || e.className && e.className.baseVal == null && e.className || e.tagName) + '';
    const track = document.querySelector('.rc-track');
    for (const e of document.querySelectorAll('#screens *')) {
      if (track && track.contains(e) && e !== track) continue;   // recap pages sit side by side inside the swipe strip
      const r = vis(e); if (r && (r.right > W + 1 || r.left < -1)) bad.push('overflow ' + name(e) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
    }
    for (const sc of document.querySelectorAll('.sheet-body, .full-body, .rc-page')) if (sc.scrollWidth > sc.clientWidth + 1) bad.push('hscroll ' + sc.className);
    for (const b of document.querySelectorAll('#screens button')) {
      const r = vis(b); if (!r || b.closest('[hidden]')) continue;
      if (r.right < 0 || r.left > W) continue;   // off-screen recap pages
      if (r.width < 43.5 || r.height < 43.5) bad.push('small ' + name(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
    if ([...document.querySelectorAll('#screens button')].some(b => /share|screenshot|download/i.test(b.textContent))) bad.push('a share/screenshot/download button');
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
    GG.main.sync();
  }, [seed, extra || null]);
}

/* ---- offer ---------------------------------------------------------------------------------------------------- */
async function offer() {
  const c = checker('offer');
  const { page, errors, close } = await open();
  try {
    await boot(page, 8181, { fans: 9000, fund: 2000, buzz: 40, era: 'signed', protected: false, totalWeek: 60, year: 3, week: 12 });
    // an offer for the truck commercial's cousin: pick the energy drink so the fee is mid-range; land it as Monday's card
    const o1 = await page.evaluate(() => {
      const s = GG.state, L = GG.licensing;
      const o = L.makeOffer(s, GG.RNG(5));
      o.brandId = 'energy'; o.fee = 3600;
      s.phase = 'monday'; s.card = null; s.weekStart = null; s.totalWeek = 61; s.week = 13;
      GG.main.beginWeek();
      return { id: o.id, songId: o.songId, fund: s.fund, buzz: s.buzz, card: s.card && s.card.id, who: s.card && s.card.who };
    });
    await waitScreen(page, 'card');
    c.ok(o1.card === 'lic_energy' && o1.who, 'the offer arrives as the Monday card (with a speaker): ' + JSON.stringify(o1));
    const cardTxt = await page.locator('.layer').last().textContent();
    c.ok(/Riot Juice/.test(cardTxt) && /\$3,600/.test(cardTxt) && /Take it/.test(cardTxt) && /Counter: ask \$5,000/.test(cardTxt) && /Decline/.test(cardTxt) && /Sleep on it/.test(cardTxt),
      'card shows the brand, the fee, the counter ask (+40%) and four choices');
    c.ok((await count(page, 'choice-3')) === 1, 'four choices');
    let bad = await audit(page); c.ok(!bad.length, 'offer card layout: ' + bad.join(' | '));
    await shot(page, 'recap_offer_card.png');
    await tap(page, 'choice-0');
    const took = await page.evaluate(id => {
      const s = GG.state, o = GG.licensing.offer(s, id), song = GG.songs.byId(s, o.songId);
      return { status: o.status, fund: s.fund, buzz: s.buzz, ad: song.ad, stale: song.stale, deals: s.licensing.deals.length, sold: s.milestones.soldOut };
    }, o1.id);
    c.ok(took.status === 'taken' && took.fund >= o1.fund + 3600 * 0.6 && took.buzz > o1.buzz && took.ad && took.ad.brandId === 'energy' && took.stale >= 20 && took.deals === 1 && took.sold,
      'Take it: fee in the fund, buzz up, the song is in a commercial: ' + JSON.stringify(took));
    await shot(page, 'recap_offer_outcome.png');
    await tap(page, 'btn-card-ok');
    // a second offer: sleep on it → it waits on the laptop
    const o2 = await page.evaluate(() => {
      const s = GG.state, L = GG.licensing;
      s.licensing.lastOfferWeek = 0;
      const o = L.makeOffer(s, GG.RNG(9)); o.brandId = 'hockey'; o.fee = 1900;
      GG.ui.closeAll(); s.phase = 'monday'; s.card = null; s.weekStart = null; s.totalWeek = 62; s.week = 14;
      GG.main.beginWeek();
      return { id: o.id, card: s.card && s.card.id };
    });
    await waitScreen(page, 'card');
    await tap(page, 'choice-3');
    const later = await page.evaluate(id => GG.licensing.offer(GG.state, id).status, o2.id);
    c.ok(o2.card === 'lic_hockey' && later === 'open', 'Sleep on it leaves the offer open: ' + later);
    await tap(page, 'btn-card-ok');
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('laptop', { tab: 'chat' }); });
    await waitScreen(page, 'laptop');
    c.ok((await count(page, 'laptop-offer-' + o2.id)) === 1, 'the laptop lists the open offer');
    bad = await audit(page); c.ok(!bad.length, 'laptop layout: ' + bad.join(' | '));
    await shot(page, 'recap_offer_laptop.png');
    await tap(page, 'laptop-offer-' + o2.id);
    await waitScreen(page, 'offer');
    await page.waitForTimeout(400);
    bad = await audit(page); c.ok(!bad.length, 'offer sheet layout: ' + bad.join(' | '));
    await shot(page, 'recap_offer_sheet.png');
    await tap(page, 'lic-counter');
    await page.waitForSelector(tid('lic-outcome'));
    const ctr = await page.evaluate(id => { const o = GG.licensing.offer(GG.state, id); return { status: o.status, fee: o.fee, countered: o.countered }; }, o2.id);
    c.ok((ctr.status === 'taken' && ctr.fee === 2700 && ctr.countered) || ctr.status === 'withdrawn', 'Counter: +40% or they walk: ' + JSON.stringify(ctr));
    await tap(page, 'lic-ok');
    await waitScreen(page, 'laptop');
    c.ok((await count(page, 'laptop-offer-' + o2.id)) === 0, 'an answered offer leaves the laptop');
    // a third one expires at the wrap
    const exp = await page.evaluate(() => {
      const s = GG.state, L = GG.licensing;
      GG.ui.closeAll(); s.licensing.lastOfferWeek = 0;
      GG.songs.jam(s, GG.RNG(11)); GG.songs.jam(s, GG.RNG(12));
      const o = L.makeOffer(s, GG.RNG(3)); o.shown = true;
      s.totalWeek = o.expires; s.week = 16; s.phase = 'plan'; s.card = null; s.gig = null; s.offer = null;
      GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s, { autoGig: true });
      GG.main.wrapWeek();
      return { status: o.status, wrap: s.wrap && s.wrap.licensing && s.wrap.licensing.expired.length };
    });
    await waitScreen(page, 'wrap');
    c.ok(exp.status === 'expired' && exp.wrap === 1, 'an unanswered offer expires at the wrap: ' + JSON.stringify(exp));
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'offer threw: ' + (e.stack || e)); }
  await close();
  c.done();
}

/* ---- recap ---------------------------------------------------------------------------------------------------- */
async function recap() {
  const c = checker('recap');
  const { page, errors, close } = await open();
  try {
    await boot(page, 424242);
    await page.evaluate(() => {
      const s = GG.state; s.phase = 'monday'; s.card = null; s.weekStart = null;
      for (let i = 0; i < 23; i++) GG.career.botWeek(s, 'avg');
      GG.ui.closeAll(); GG.main.sync();
    });
    await page.evaluate(() => {
      const s = GG.state, st = GG.career.startWeek(s);
      if (st.card) GG.career.resolveCard(s, 0);
      GG.career.setPlan(s, ['rehearse', 'promote', 'rest']);
      s.gig = null; s.offer = null;
      GG.career.runWeek(s, { autoGig: true });
      GG.main.wrapWeek();
    });
    await waitScreen(page, 'wrap');
    const btnTxt = await page.locator(tid('btn-next-week')).textContent();
    c.ok(/Year in review/.test(btnTxt), 'the week-24 wrap offers the year in review: ' + btnTxt);
    const rec = await page.evaluate(() => GG.state.recaps[0]);
    c.ok(rec && rec.y === 1 && rec.headline && rec.fundIn >= 0 && rec.fundOut >= 0 && Array.isArray(rec.awards) && rec.photo === null, 'RECAP stored compactly: ' + JSON.stringify(rec));
    c.ok(JSON.stringify(rec).length < 900, 'recap is small: ' + JSON.stringify(rec).length + ' chars');
    await tap(page, 'btn-next-week');
    await waitScreen(page, 'recap');
    await page.waitForTimeout(250);
    const photo = await page.evaluate(async () => {
      const img = document.querySelector('[data-testid="recap-photo"] img'); if (!img) return null;
      await img.decode();
      const cv = document.createElement('canvas'); cv.width = 60; cv.height = 38; const g = cv.getContext('2d'); g.drawImage(img, 0, 0, 60, 38);
      const d = g.getImageData(0, 0, 60, 38).data, lum = []; for (let i = 0; i < d.length; i += 4) lum.push(d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11);
      const m = lum.reduce((a, b) => a + b, 0) / lum.length, v = Math.sqrt(lum.reduce((a, b) => a + (b - m) * (b - m), 0) / lum.length);
      return { w: img.naturalWidth, h: img.naturalHeight, mean: Math.round(m), sd: Math.round(v), jpeg: /^data:image\/jpeg/.test(img.src) };
    });
    c.ok(photo && photo.jpeg && photo.w >= 500 && photo.mean > 20 && photo.sd > 12, 'the band photo is a real 3D still (not blank): ' + JSON.stringify(photo));
    const nPages = await page.locator('.rc-page').count();
    c.ok(nPages === 6, 'six pages in year one (incl. what a good year looks like): ' + nPages);
    c.ok((await page.locator('.rc-page .rc-say').count()) >= 3, 'year one: the bandmates explain a good year');
    for (let i = 0; i < nPages; i++) {
      const bad = await audit(page); c.ok(!bad.length, 'recap page ' + i + ' layout: ' + bad.join(' | '));
      await shot(page, 'recap_p' + i + '.png');
      if (i < nPages - 1) { await tap(page, 'recap-next'); await page.waitForTimeout(500); }
    }
    const lastLabel = await page.locator(tid('recap-done')).textContent();
    c.ok(/Start year 2/.test(lastLabel), 'last page: ' + lastLabel);
    // swiping works too: scroll the strip back to page 1 and the dots follow
    const dot = await page.evaluate(async () => { const t = document.querySelector('.rc-track'); t.scrollTo({ left: t.clientWidth, behavior: 'instant' }); await new Promise(r => setTimeout(r, 200)); return [...document.querySelectorAll('.rc-dots span')].findIndex(x => x.classList.contains('on')); });
    c.ok(dot === 1, 'a swipe moves the dots: ' + dot);
    await page.evaluate(() => GG.ui.get('recap').data._go(5));
    await page.waitForTimeout(400);
    await tap(page, 'recap-done');
    await page.waitForFunction(() => GG.state.totalWeek === 25 && !GG.ui.isOpen('recap') && !GG.ui.isOpen('wrap'), null, { timeout: 10000 });
    c.ok(true, 'Start year 2 continues to week 25');
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('laptop', { tab: 'years' }); });
    await waitScreen(page, 'laptop');
    c.ok((await count(page, 'recap-open-1')) === 1, 'the Years tab lists year one');
    const bad = await audit(page); c.ok(!bad.length, 'laptop Years layout: ' + bad.join(' | '));
    await shot(page, 'recap_years.png');
    await tap(page, 'recap-open-1');
    await waitScreen(page, 'recap');
    c.ok((await count(page, 'recap-close')) === 1, 're-opened from the laptop (with Close)');
    await tap(page, 'recap-close');
    await waitScreen(page, 'laptop');
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'recap threw: ' + (e.stack || e)); }
  await close();
  c.done();
}

(async () => {
  fs.mkdirSync(CACHE, { recursive: true });
  if (want('offer')) await offer();
  if (want('recap')) await recap();
})();
