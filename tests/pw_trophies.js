// pw_trophies.js (v1.0 "Glory", Lane M): the laptop's Trophies tab and the achievement toasts, on a phone viewport
// (390x844 by default; PW_VIEW=440x956 for the owner's iPhone). Sections META_ONLY=tab|toast (default all); each fits
// `timeout 500`.
//   tab   : a Hail Damage career with seeded meta (an earned Frost Heave row from an older career, an earned general row) → the
//           laptop → the 10th tab "Trophies": the ten tabs wrap 5 + 5 (two rows, every tab >= 48 px), no horizontal scroll;
//           earned rows carry the band that earned them (data-band) and their date; this band's open rows show their blurb;
//           another band's unearned rows read "??? (a <band> thing)" with that band's data-band and never their text;
//           'ui:tab' fires; the garage Trophy shelf links here (trophies-all). Screenshot trophies_tab.png.
//   toast : a live gig: 'ach:earned' emitted during the song toasts nothing until the song is over; at the results screen
//           only the fresh ids toast (an id already earned in another career stays quiet); at most 3 toasts per flush with
//           "+n more". Screenshot trophies_toast.png.
// Every section: no console errors. Run: node build.js && META_ONLY=tab timeout 500 node tests/pw_trophies.js
const path = require('path');
const { open, checker, shotName } = require('./_pw');
const CACHE = path.join(__dirname, '.cache');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);
const tid = id => `[data-testid="${id}"]`;
const tap = (page, id) => page.locator(tid(id)).last().click();
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });

function audit(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const cs = getComputedStyle(e); return cs.visibility === 'hidden' || cs.display === 'none' ? null : r; };
    const name = e => (e.dataset && e.dataset.testid || e.className || e.tagName) + '';
    for (const e of document.querySelectorAll('#screens *')) { const r = vis(e); if (r && (r.right > W + 1 || r.left < -1)) bad.push('overflow ' + name(e) + ' ' + Math.round(r.left) + '..' + Math.round(r.right)); }
    for (const sc of document.querySelectorAll('.full-body, .sheet-body')) if (sc.scrollWidth > sc.clientWidth + 1) bad.push('hscroll ' + sc.className);
    for (const b of document.querySelectorAll('#screens button')) {
      const r = vis(b); if (!r || b.closest('[hidden]')) continue;
      const v10 = /^(laptop-tab-|trophies-all|trophy-)/.test(b.dataset.testid || '');
      if (r.width < (v10 ? 47.5 : 43.5) || r.height < (v10 ? 47.5 : 43.5)) bad.push('small ' + name(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
    if ([...document.querySelectorAll('#screens button')].some(b => /share|screenshot|download/i.test(b.textContent))) bad.push('a share/screenshot/download button');
    return bad.slice(0, 8);
  });
}
// Seeds this phone's meta (gg.v1.meta) before the game boots: two trophies from earlier careers.
const SEED = {
  v: 1, scanned: '1.0.0.0', careers: { started: 2, past4: 2, finished: 1, byBand: { frost_heave: 1 }, bySeat: { drums: 1 }, best: null },
  lessons: {}, ach: { read_the_minutes: { at: '2026-09-20', band: 'frost_heave', y: 6 }, sold_out: { at: '2026-09-21', band: 'frost_heave', y: 7 } },
  unlocks: { palettes: [], emblems: [], parts: [] }, seen: {}
};
async function boot(seed) {
  const o = await open({ noGoto: true });
  await o.context.addInitScript(m => { try { if (!localStorage.getItem('gg.v1.meta')) localStorage.setItem('gg.v1.meta', JSON.stringify(m)); } catch (e) { /* file:// storage */ } }, SEED);
  await o.page.goto(o.url);
  await o.page.waitForSelector(tid('btn-new'), { timeout: 20000 });
  await o.page.evaluate(seed => { GG.main.quickStart({ seed, openCard: false }); GG.ui.closeAll(); const s = GG.state; s.card = null; s.phase = 'plan'; GG.main.sync(); }, seed);
  return o;
}

async function tab() {
  const c = checker('tab');
  const { page, errors, close } = await boot(4242);
  try {
    c.ok(await page.evaluate(() => GG.meta.enabled && GG.meta.has('read_the_minutes') && GG.state.bandId === 'hail_damage'), 'seeded meta loaded; a Hail Damage career');
    await page.evaluate(() => { window.__tabs = []; GG.on('ui:tab', p => window.__tabs.push(p.sheet + ':' + p.tab)); GG.ui.show('laptop', { tab: 'chat' }); });
    await waitScreen(page, 'laptop');
    await tap(page, 'laptop-tab-trophies');
    await page.waitForSelector(tid('laptop-trophies'));
    const L = await page.evaluate(() => {
      const tabs = [...document.querySelectorAll('[data-testid^="laptop-tab-"]')].map(b => { const r = b.getBoundingClientRect(); return { id: b.dataset.testid, top: Math.round(r.top), h: r.height, w: r.width }; });
      const rows = [...document.querySelectorAll('[data-testid^="trophy-row-"]')].map(r => ({ id: r.dataset.testid.slice(11), state: r.dataset.state, band: r.dataset.band, text: r.textContent }));
      return { tabs, rows, count: document.querySelector('[data-testid="trophies-count"]').textContent, evs: window.__tabs, sel: document.querySelector('[data-testid="laptop-tab-trophies"]').getAttribute('aria-selected') };
    });
    const tops = [...new Set(L.tabs.map(t => t.top))];
    c.ok(L.tabs.length === 10 && tops.length === 2 && L.tabs.slice(0, 5).every(t => t.top === L.tabs[0].top) && L.tabs.slice(5).every(t => t.top === L.tabs[5].top),
      'ten tabs wrap 5 + 5 ' + JSON.stringify(L.tabs.map(t => t.top)));
    c.ok(L.tabs.every(t => t.h >= 47.5 && t.w >= 47.5), 'every tab >= 48 px ' + JSON.stringify(L.tabs.map(t => Math.round(t.w) + 'x' + Math.round(t.h))));
    c.ok(L.sel === 'true' && L.evs.includes('laptop:trophies'), "the Trophies tab is selected and 'ui:tab' fired " + L.evs);
    const row = id => L.rows.find(r => r.id === id) || {};
    c.ok(row('read_the_minutes').state === 'earned' && row('read_the_minutes').band === 'frost_heave' && /Read the Minutes/.test(row('read_the_minutes').text) && /Frost Heave/.test(row('read_the_minutes').text) && /2026/.test(row('read_the_minutes').text),
      'an earned row from another career keeps its band + date ' + JSON.stringify(row('read_the_minutes')));
    c.ok(row('sold_out').state === 'earned' && row('sold_out').band === 'frost_heave', 'an earned general row carries the band that earned it');
    c.ok(row('ma_pelouse').state === 'open' && row('ma_pelouse').band === 'hail_damage' && /Marcel/.test(row('ma_pelouse').text), "this band's open rows show their blurb");
    const others = L.rows.filter(r => r.state === 'hidden');
    c.ok(others.length >= 5 && others.every(r => /^❔\?\?\?\s*\(a .+ thing\)$/.test(r.text) && r.band !== 'hail_damage'), "other bands' unearned rows read ??? " + JSON.stringify(others.slice(0, 3)));
    c.ok(row('sponsored_content').state === 'hidden' && row('sponsored_content').band === 'frost_heave' && !/Mall Rats/.test(row('sponsored_content').text), 'a Frost Heave row in a Hail Damage career is ??? (data-band frost_heave)');
    c.ok(!L.rows.some(r => r.state !== 'earned' && r.band !== 'hail_damage' && r.state !== 'hidden'), 'every open row is this band');
    c.ok(/^2\/\d+$/.test(L.count), 'count ' + L.count);
    const bad = await audit(page);
    c.ok(bad.length === 0, 'layout (no overflow, no hscroll, v1.0 controls >= 48 px) ' + bad.join('; '));
    await page.screenshot({ path: path.join(CACHE, shotName('trophies_tab.png')) });
    // The garage Trophy shelf links to the tab.
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('trophies'); });
    await waitScreen(page, 'trophies');
    const sz = await page.evaluate(() => { const r = document.querySelector('[data-testid="trophies-all"]').getBoundingClientRect(); return [r.width, r.height]; });
    c.ok(sz[0] >= 47.5 && sz[1] >= 47.5, 'trophies-all >= 48 px ' + sz);
    await tap(page, 'trophies-all');
    await waitScreen(page, 'laptop');
    c.ok(await page.locator(tid('laptop-trophies')).count() === 1, 'the Trophy shelf opens the laptop on Trophies');
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'tab threw: ' + (e.stack || e)); }
  await close();
  c.done();
}

async function toast() {
  const c = checker('toast');
  const { page, errors, close } = await boot(5150);
  try {
    await page.evaluate(() => {
      const s = GG.state;
      for (let i = 0; i < 3; i++) GG.songs.jam(s, GG.RNG(40 + i));
      s.gig = GG.gig.makeGig(s, 'legion_63', 'book');
      window.__done = null; GG.ui.gigAutoplay = false;
      window.__toasts = []; const t0 = GG.ui.toast; GG.ui.toast = function (text, o) { window.__toasts.push({ text: String(text), who: o && o.who, at: GG.debug('gigui').mode || null }); return t0.apply(this, arguments); };
      GG.ui.playGig(s.gig, r => { window.__done = r; });
    });
    await waitScreen(page, 'gig-set');
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 10000 });
    await page.evaluate(() => GG.emit('ach:earned', { ids: ['the_wall', 'sold_out'] }));   // sold_out: already earned in another career
    await page.waitForTimeout(1500);
    const mid = await page.evaluate(() => ({ toasts: window.__toasts.filter(t => /Trophy/.test(t.who || '')), q: GG.debug('trophies'), meta: GG.meta.has('the_wall'), mode: GG.debug('gigui').mode }));
    c.ok(mid.mode === 'play' && mid.toasts.length === 0 && mid.q.queued === 1 && mid.q.blocked, 'during the song: no toast, one queued ' + JSON.stringify(mid));
    c.ok(mid.meta, 'the trophy is stored in meta right away (dated)');
    await page.evaluate(() => { GG.ui.gigAutoplay = true; });
    await waitScreen(page, 'gig-results', 20000);
    await page.waitForFunction(() => window.__toasts.some(t => /The Wall/.test(t.text)), null, { timeout: 5000 }).catch(() => {});
    const after = await page.evaluate(() => ({ toasts: window.__toasts.filter(t => /Trophy/.test(t.who || '')).map(t => t.text + ' @' + t.at), box: document.getElementById('toast').textContent }));
    c.ok(after.toasts.some(t => /The Wall/.test(t)) && !after.toasts.some(t => /Sold Out/.test(t)), 'after the song: only the fresh id toasts ' + JSON.stringify(after.toasts));
    c.ok(after.toasts.every(t => !/@play$/.test(t)), 'nothing toasted while a song was live');
    await page.screenshot({ path: path.join(CACHE, shotName('trophies_toast.png')) });
    await tap(page, 'btn-gig-done');
    await page.waitForFunction(() => window.__done !== null, null, { timeout: 5000 });
    // A burst outside a gig: at most 3 toasts, the third says +n more.
    const burst = await page.evaluate(() => {
      window.__toasts = [];
      GG.emit('ach:earned', { ids: ['frostbite', 'grey_mug', 'night_school', 'overtime', 'hat_trick'] });
      return window.__toasts.filter(t => /Trophy/.test(t.who || '')).map(t => t.text);
    });
    c.ok(burst.length === 3 && /\+2 more/.test(burst[2]), 'a burst: 3 toasts, "+2 more" ' + JSON.stringify(burst));
    const again = await page.evaluate(() => { window.__toasts = []; GG.emit('ach:earned', { ids: ['frostbite'] }); return window.__toasts.length; });
    c.ok(again === 0, 'an id earned before never toasts again');
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'toast threw: ' + (e.stack || e)); }
  await close();
  c.done();
}

(async () => {
  if (want('tab')) await tab();
  if (want('toast')) await toast();
})();
