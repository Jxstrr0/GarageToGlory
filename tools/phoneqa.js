// tools/phoneqa.js (v1.0 Lane Q; port of tools/perf_probes/perf_phoneqa.js onto tests/_pw.js): a phone-QA layout sweep with
// emulated notch / home-indicator insets (headless has no env(safe-area-*): --safe-top/--safe-bot are forced). PW_VIEW=390x844
// (iPhone 12-14: 47/34, the default) or 440x956 (iPhone 16 Pro Max: 59/34). Runs with ?tut=1 so the lesson bubbles show.
// Per screen, with and without Bigger text: controls under 44 px FAIL; v1.0 controls (btn-help, btn-hof, menu-hof,
// menu-lessons, tut-*, end-*, hof-*, lesson(s)-*, the Trophies tab, trophies-all) under 48 px FAIL; tappables inside the notch
// or home-indicator strip FAIL; horizontal overflow FAIL; the smallest visible text is reported. The HUD stat labels must
// grow with Bigger text. Console errors FAIL. Exit code 1 on any failure.
// Run: node build.js && timeout 500 node tools/phoneqa.js   (PW_VIEW=440x956 for the owner's phone)
const { open, VIEW } = require('../tests/_pw');
const INS = VIEW.width >= 430 ? { top: 59, bot: 34 } : { top: 47, bot: 34 };
const V10 = '^(btn-help|btn-hof|menu-hof|menu-lessons|tut-|end-|hof-|laptop-tab-trophies|lesson-|lessons-|trophies-all)';

const AUDIT = (ins, v10src) => {
  const V10 = new RegExp(v10src);
  const W = document.documentElement.clientWidth, H = document.documentElement.clientHeight;
  const out = { small: [], small48: [], notch: [], home: [], over: [], fonts: [], v10seen: [] };
  const vis = e => {
    const r = e.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > H) return null;
    for (let x = e; x; x = x.parentElement) { if (x.hidden) return null; const c = getComputedStyle(x); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return null; }
    return r;
  };
  const nm = e => ((e.dataset && e.dataset.testid) || (typeof e.className === 'string' ? e.className.split(' ')[0] : '') || e.tagName).slice(0, 32);
  for (const b of document.querySelectorAll('button, [role="button"], input, select, a[href]')) {
    const r = vis(b); if (!r) continue;
    // a control under another layer cannot be tapped: skip it (the top layer is what the player touches)
    const hit = document.elementFromPoint(Math.min(W - 1, Math.max(0, r.left + r.width / 2)), Math.min(H - 1, Math.max(0, r.top + r.height / 2)));
    if (hit && hit !== b && !b.contains(hit) && !hit.contains(b) && getComputedStyle(hit).pointerEvents !== 'none') continue;
    const id = (b.dataset && b.dataset.testid) || '';
    if (V10.test(id)) { out.v10seen.push(id); if (r.width < 47.5 || r.height < 47.5) out.small48.push(nm(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
    else if (r.width < 43.5 || r.height < 43.5) out.small.push(nm(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    if (r.top < ins.top - 1) out.notch.push(nm(b) + '@' + Math.round(r.top));
    // inside a scroller the player scrolls it up: only the scroller's own end has to clear the home strip (its bottom padding)
    let sc = b.parentElement; while (sc && !(/(auto|scroll)/.test(getComputedStyle(sc).overflowY) && sc.scrollHeight > sc.clientHeight + 1)) sc = sc.parentElement;
    if (sc) { const cr = sc.getBoundingClientRect(), over = cr.bottom - (H - ins.bot), pad = parseFloat(getComputedStyle(sc).paddingBottom) || 0;
      const tag = 'scroller ' + nm(sc) + ' end ' + Math.round(over - pad) + 'px under the home strip';
      if (over > pad + 1 && !out.home.includes(tag)) out.home.push(tag); }
    else if (r.bottom > H - ins.bot + 1) out.home.push(nm(b) + '@' + Math.round(H - r.bottom));
  }
  for (const e of document.querySelectorAll('#app *, #tut *')) { const r = vis(e); if (r && (r.right > W + 1 || r.left < -1) && !e.closest('.gb-map, canvas')) out.over.push(nm(e)); }
  if (document.documentElement.scrollWidth > W + 1) out.over.push('document scrollWidth ' + document.documentElement.scrollWidth);
  for (const e of document.querySelectorAll('#app *, #tut *')) {
    if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = vis(e); if (!r) continue; out.fonts.push([parseFloat(getComputedStyle(e).fontSize), nm(e), e.textContent.trim().slice(0, 18)]);
  }
  out.fonts.sort((a, b) => a[0] - b[0]);
  const f = out.fonts;
  return { screen: GG.debug('ui').screen, small: out.small.slice(0, 6), small48: out.small48.slice(0, 6), notch: out.notch.slice(0, 6),
    home: out.home.slice(0, 6), overflow: out.over.slice(0, 6), v10: [...new Set(out.v10seen)].length,
    minFont: f.length ? f[0][0] : null, under11: f.filter(x => x[0] < 11).length, smallest: f.slice(0, 3).map(x => x[0] + 'px ' + x[1] + ' "' + x[2] + '"') };
};

(async () => {
  const { page, errors, close, url } = await open({ noGoto: true });
  const fails = [];
  const audit = async (label, wait) => {
    await page.waitForTimeout(wait == null ? 700 : wait);
    // sheets slide in with a CSS animation that headless SwiftShader can start late under load: wait for the finite ones
    await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || !isFinite(a.effect.getTiming().iterations)), null, { timeout: 10000 }).catch(() => {});
    const r = await page.evaluate(`(${AUDIT})(${JSON.stringify(INS)}, ${JSON.stringify(V10)})`);
    const bad = ['small', 'small48', 'notch', 'home', 'overflow'].filter(k => r[k].length);
    console.log((bad.length ? 'FAIL ' : 'ok   ') + label.padEnd(22), JSON.stringify(r));
    if (bad.length) fails.push(label + ': ' + bad.map(k => k + ' ' + r[k].join(', ')).join(' | '));
    return r;
  };
  const tapId = async id => { await page.waitForTimeout(400); const ok = await page.evaluate(id => { const n = [...document.querySelectorAll('[data-testid="' + id + '"]')].pop(); if (n) n.click(); return !!n; }, id); if (!ok) fails.push(id + ' missing'); };
  const style = () => page.addStyleTag({ content: `:root { --safe-top: ${INS.top}px !important; --safe-bot: ${INS.bot}px !important; }` });
  try {
    await page.goto(url + '?tut=1');
    await page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
    await style();
    const hud = [];
    for (const big of [false, true]) {
      console.log('--- ' + VIEW.width + 'x' + VIEW.height + ' insets ' + INS.top + '/' + INS.bot + (big ? ' + Bigger text' : ''));
      await page.evaluate(b => GG.prefs.set({ bigText: b, calibSeen: true }), big);
      if (!big) await audit('title (empty)');
      await page.evaluate(() => { GG.main.quickStart({ seed: 4242 + (GG.prefs.get().bigText ? 1 : 0), slot: '1', bandId: 'hail_damage' }); });
      await page.waitForSelector('#tut [data-testid="tut-bubble"]', { timeout: 15000 }).catch(() => {});
      await audit('week 1 + lesson', 900);
      await page.evaluate(() => { GG.tutorial.skip && GG.tutorial.skip(); GG.ui.closeAll(); GG.main.sync && GG.main.sync(); });
      await audit('garage/HUD');
      hud.push(await page.evaluate(() => { const l = document.querySelector('.hud-chip .l'); return l ? parseFloat(getComputedStyle(l).fontSize) : null; }));
      await page.evaluate(() => GG.ui.show('laptop'));
      await tapId('laptop-tab-trophies');
      await audit('laptop Trophies');
      await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('settings'); }); await audit('settings');
      await page.evaluate(() => { GG.ui.closeAll(); GG.tutorial.openLessons(); }); await audit('lessons sheet');
      await page.evaluate(() => { GG.ui.closeAll(); GG.ui.openBoard({ mode: 'view' }); }); await audit('board');
      const steps = await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('end'); const d = GG.debug('ending') || {}; return d.of || (d.steps && d.steps.length) || 5; });
      for (let i = 0; i < steps; i++) { await page.evaluate(i => GG.ui.endGo(i), i); await audit('end step ' + i, 500); }
      await page.evaluate(() => { GG.ui.closeAll(); GG.meta.enabled = true; GG.meta.recordCareer(GG.state); GG.ui.show('hof'); });
      await audit('hall of fame');
      await tapId('hof-row-0');
      await audit('hof entry');
      await page.evaluate(() => { GG.ui.closeAll(); GG.main.quitToTitle(); });
      await audit('title (with HoF)');
      await page.evaluate(() => { GG.main.quickStart({ seed: 77, slot: '2', bandId: 'grid_road_ramblers' }); GG.tutorial.skip && GG.tutorial.skip(); GG.ui.closeAll();
        const s = GG.state; s.card = null; s.phase = 'plan'; s.fund = 9999;
        for (let i = 0; i < 3; i++) GG.songs.jam(s, GG.RNG(40 + i)); s.gig = GG.gig.makeGig(s, s.gig ? s.gig.venueId : GG.content.venues[0].id, 'book'); GG.ui.gigAutoplay = false; GG.ui.playGig(s.gig, () => {}); });
      await page.waitForFunction(() => GG.debug('ui').screen === 'gig-set', null, { timeout: 30000 });
      await audit('gig setlist');
      await page.locator('[data-testid="btn-gig-start"]').last().click();
      await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 30000 });
      await audit('gig play');
      await page.evaluate(() => { GG.ui.closeAll(); GG.main.quitToTitle(); });
    }
    console.log('HUD label px (normal, Bigger text):', JSON.stringify(hud));
    if (!(hud[0] && hud[1] && hud[1] > hud[0])) fails.push('Bigger text does not grow the HUD labels ' + JSON.stringify(hud));
    const errs = errors.filter(e => !/AudioContext|autoplay/i.test(e));
    if (errs.length) fails.push('console errors: ' + errs.slice(0, 4).join(' / '));
  } catch (e) { fails.push('crash: ' + (e.stack || e)); }
  finally { await close(); }
  console.log(fails.length ? 'FAILED ' + fails.length + '\n  ' + fails.join('\n  ') : 'ALL PASS phoneqa ' + VIEW.width + 'x' + VIEW.height);
  process.exit(fails.length ? 1 : 0);
})();
