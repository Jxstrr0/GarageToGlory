// perf_phoneqa.js: a phone-QA layout probe with emulated notch / home-indicator insets (headless has no env(safe-area-*):
// the --safe-top/--safe-bot vars are forced). VIEW=390x844 (iPhone 12-14: 47/34) or 440x956 (iPhone 16 Pro Max: 59/34).
// Per screen: buttons under 44 px, tappables inside the notch / home-indicator strips, horizontal overflow, the smallest
// visible text (px) and how many text elements are under 12 px / 11 px (the 6 smallest named), with and without bigText.
// Run: VIEW=440x956 node perf_phoneqa.js
const { open } = require('./perf_lib');
const VIEW = process.env.VIEW || '390x844', [VW, VH] = VIEW.split('x').map(Number);
const INS = VW >= 430 ? { top: 59, bot: 34 } : { top: 47, bot: 34 };
const AUDIT = ins => {
  const W = document.documentElement.clientWidth, H = document.documentElement.clientHeight, out = { small: [], notch: [], home: [], over: [], fonts: [] };
  const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > H) return null; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return null; for (let x = e; x; x = x.parentElement) { if (x.hidden) return null; const c = getComputedStyle(x); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return null; } return r; };
  const nm = e => (e.dataset.testid || (typeof e.className === 'string' ? e.className.split(' ')[0] : '') || e.tagName).slice(0, 28);
  for (const b of document.querySelectorAll('#app button, #app [role="button"], #app input, #app select, #app a[href]')) {
    const r = vis(b); if (!r) continue;
    if (r.width < 43.5 || r.height < 43.5) out.small.push(nm(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    if (r.top < ins.top - 1) out.notch.push(nm(b) + '@' + Math.round(r.top));
    if (r.bottom > H - ins.bot + 1) out.home.push(nm(b) + '@' + Math.round(H - r.bottom));
  }
  for (const e of document.querySelectorAll('#app *')) { const r = vis(e); if (r && (r.right > W + 1 || r.left < -1) && !e.closest('.gb-map, canvas')) out.over.push(nm(e)); }
  const seen = new Set();
  for (const e of document.querySelectorAll('#app *')) {
    if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = vis(e); if (!r) continue; const fs = parseFloat(getComputedStyle(e).fontSize); out.fonts.push([fs, nm(e), e.textContent.trim().slice(0, 18)]);
  }
  out.fonts.sort((a, b) => a[0] - b[0]);
  const f = out.fonts; const res = { screen: GG.debug('ui').screen, buttonsSmall: out.small.length, small: out.small.slice(0, 5), notch: out.notch.slice(0, 5), home: out.home.slice(0, 5),
    overflow: out.over.length, minFont: f.length ? f[0][0] : null, under12: f.filter(x => x[0] < 12).length, under11: f.filter(x => x[0] < 11).length, texts: f.length,
    smallest: f.slice(0, 4).map(x => x[0] + 'px ' + x[1] + ' "' + x[2] + '"') };
  return res;
};

(async () => {
  const { page, errors, close } = await open({ w: VW, h: VH });
  const audit = async (label) => { await page.waitForTimeout(1000); const r = await page.evaluate(`(${AUDIT})(${JSON.stringify(INS)})`); console.log(label.padEnd(14), JSON.stringify(r)); return r; };
  try {
    await page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
    await page.addStyleTag({ content: `:root { --safe-top: ${INS.top}px !important; --safe-bot: ${INS.bot}px !important; }` });
    for (const big of [false, true]) {
      console.log('--- ' + VIEW + ' insets ' + INS.top + '/' + INS.bot + (big ? ' + bigText' : ''));
      await page.evaluate(b => GG.prefs.set({ bigText: b, calibSeen: true }), big);
      if (!big) await audit('title');
      await page.evaluate(() => { GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, bandId: 'hail_damage' }); GG.ui.closeAll(); GG.main.sync && GG.main.sync(); });
      await audit('garage/plan');
      await page.evaluate(() => GG.ui.show('laptop')); await audit('laptop');
      await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('settings'); }); await audit('settings');
      await page.evaluate(() => { GG.ui.closeAll(); GG.ui.openBoard({ mode: 'view' }); }); await audit('board');
      await page.locator('[data-testid="board-tab-map"]').last().click().catch(() => {}); await audit('board map');
      await page.evaluate(() => { GG.ui.closeAll(); const s = GG.state; s.card = null; s.phase = 'plan'; s.fund = 9999;
        ['toms', 'ride', 'pedal'].forEach(id => { try { GG.shop.buyGear(s, id); } catch (e) {} });
        for (let i = 0; i < 3; i++) GG.songs.jam(s, GG.RNG(40 + i)); s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); GG.ui.gigAutoplay = false; GG.ui.playGig(s.gig, () => {}); });
      await page.waitForFunction(() => GG.debug('ui').screen === 'gig-set', null, { timeout: 30000 });
      await audit('gig setlist');
      await page.locator('[data-testid="btn-gig-start"]').last().click();
      await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 30000 });
      const hw = await page.evaluate(() => { const c = document.querySelector('[data-testid="gig-highway"]'), r = c.getBoundingClientRect(), g = GG.debug('gigui'); return { lanes: g.lanes, laneW: Math.round(r.width / g.lanes), hwTop: Math.round(r.top), hwH: Math.round(r.height), hitFromBottom: 36 }; });
      console.log('gig highway   ', JSON.stringify(hw));
      await audit('gig play');
      await page.evaluate(() => { GG.ui.closeAll(); });
    }
    if (errors.length) console.log('ERRORS', errors.slice(0, 4));
  } catch (e) { console.log('FAIL', e.stack || e); }
  finally { await close(); }
})();
