// probe_qa2.js: follow-ups for perf_phoneqa: rendered size of the board map's SVG labels, the settings list scrolled to the
// bottom (does the last control clear the home indicator?), and the gig setlist foot (whose padding holds the Start button).
const { open } = require('./perf_lib');
const VIEW = process.env.VIEW || '440x956', [VW, VH] = VIEW.split('x').map(Number), INS = VW >= 430 ? { top: 59, bot: 34 } : { top: 47, bot: 34 };
(async () => {
  const { page, close } = await open({ w: VW, h: VH });
  try {
    await page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
    await page.addStyleTag({ content: `:root { --safe-top: ${INS.top}px !important; --safe-bot: ${INS.bot}px !important; }` });
    await page.evaluate(() => { GG.prefs.set({ calibSeen: true }); GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, bandId: 'hail_damage' }); GG.ui.closeAll(); GG.ui.openBoard({ mode: 'view' }); });
    await page.locator('[data-testid="board-tab-map"]').last().click(); await page.waitForTimeout(400);
    console.log(VIEW, 'map labels (rendered px):', JSON.stringify(await page.evaluate(() => { const hs = [...document.querySelectorAll('.gb-map svg text')].map(t => t.getBoundingClientRect().height).filter(h => h > 0).sort((a, b) => a - b);
      const pins = [...document.querySelectorAll('[data-testid^="pin-"]')].map(p => { const r = p.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); }).sort((a, b) => a - b);
      return { n: hs.length, min: +hs[0].toFixed(1), p50: +hs[hs.length >> 1].toFixed(1), max: +hs[hs.length - 1].toFixed(1), pinMin: pins[0], pinMax: pins[pins.length - 1] }; })));
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('settings'); }); await page.waitForTimeout(400);
    console.log(VIEW, 'settings scrolled to bottom:', JSON.stringify(await page.evaluate(ins => { const b = [...document.querySelectorAll('.full-body')].filter(x => x.offsetParent).pop(); b.scrollTop = 1e6;
      const H = document.documentElement.clientHeight, btns = [...b.querySelectorAll('button')].filter(x => x.offsetParent), last = btns[btns.length - 1], r = last.getBoundingClientRect();
      return { last: last.dataset.testid || last.textContent.slice(0, 20), gapToEdge: Math.round(H - r.bottom), homeStrip: ins.bot, padBottom: getComputedStyle(b).paddingBottom, foot: !!b.parentElement.querySelector('.full-foot') }; }, INS)));
    await page.evaluate(() => { GG.ui.closeAll(); const s = GG.state; s.card = null; s.phase = 'plan'; for (let i = 0; i < 3; i++) GG.songs.jam(s, GG.RNG(40 + i)); s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); GG.ui.gigAutoplay = false; GG.ui.playGig(s.gig, () => {}); });
    await page.waitForFunction(() => GG.debug('ui').screen === 'gig-set', null, { timeout: 30000 }); await page.waitForTimeout(500);
    console.log(VIEW, 'gig setlist Start:', JSON.stringify(await page.evaluate(() => { const b = document.querySelector('[data-testid="btn-gig-start"]'), H = document.documentElement.clientHeight, r = b.getBoundingClientRect();
      const chain = []; for (let x = b.parentElement; x && chain.length < 4; x = x.parentElement) { const cs = getComputedStyle(x); chain.push((typeof x.className === 'string' ? x.className : x.tagName).slice(0, 30) + ' pb=' + cs.paddingBottom + ' pos=' + cs.position + ' bottom=' + cs.bottom); }
      return { gapToEdge: Math.round(H - r.bottom), h: Math.round(r.height), chain }; })));
  } finally { await close(); }
})();
