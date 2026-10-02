// perf_tti.js: cold-load timing of dist/game.html (scratch copy) in headless Chromium, TRIALS per CPU throttle rate.
// Run: TRIALS=3 RATES=1,4 VIEW=390x844 node perf_tti.js  -> results/tti_<VIEW>.json
// Per trial (fresh browser): DOMContentLoaded, GG booted, "New career" button in the DOM, first 3D title frame,
// TTI ~ first moment after both with a 1 s window free of long tasks (>50 ms), the long tasks, script/task time
// (CDP Performance metrics), heap at TTI, then the first tap latency ("New career" -> next screen).
const fs = require('fs'), path = require('path');
const { open, heap } = require('./perf_lib');
const TRIALS = +(process.env.TRIALS || 3), RATES = (process.env.RATES || '1,4').split(',').map(Number), VIEW = process.env.VIEW || '390x844';
const [VW, VH] = VIEW.split('x').map(Number);
const MARKS = () => {
  const M = window.__marks = {};
  const id = setInterval(() => {
    const now = performance.now();
    if (M.booted == null && window.GG && GG.main && GG.main.booted) M.booted = now;
    if (M.btn == null && document.querySelector('[data-testid="btn-new"]')) M.btn = now;
    try { if (M.frame1 == null && window.GG && GG.render && GG.render.title && GG.render.title.info().frame >= 1) M.frame1 = now; } catch (e) {}
    if (M.btn != null && M.frame1 != null && M.booted != null) clearInterval(id);
  }, 5);
};
const med = a => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };

(async () => {
  const out = { view: VIEW, trials: [] };
  for (const rate of RATES) {
    for (let k = 0; k < TRIALS; k++) {
      const { page, context, cdp, close } = await open({ w: VW, h: VH, throttle: rate, noGoto: true });
      try {
        await context.addInitScript(MARKS);
        await cdp.send('Performance.enable');
        const t0 = Date.now();
        await page.goto('file://' + path.join(__dirname, 'dist', 'game.html'));
        await page.waitForFunction(() => window.__marks && __marks.btn != null && __marks.frame1 != null, null, { timeout: 120000, polling: 50 });
        await page.waitForTimeout(rate > 1 ? 6000 : 3000);   // let long tasks after boot land
        const r = await page.evaluate(() => {
          const n = performance.getEntriesByType('navigation')[0], M = __marks, ready = Math.max(M.btn, M.frame1);
          const longs = __perf.longs.slice().sort((a, b) => a[0] - b[0]);
          let tti = ready;   // first quiet 1 s window after ready
          for (const [s, d] of longs) { if (s + d <= tti) continue; if (s - tti >= 1000) break; tti = s + d; }
          return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), booted: Math.round(M.booted), btn: Math.round(M.btn), frame1: Math.round(M.frame1),
            tti: Math.round(tti), longs: longs.map(x => [Math.round(x[0]), Math.round(x[1])]).slice(0, 12), longTotal: Math.round(longs.reduce((a, x) => a + x[1], 0)) };
        });
        const pm = await cdp.send('Performance.getMetrics'); const g = k => (pm.metrics.find(x => x.name === k) || {}).value;
        r.scriptS = +(g('ScriptDuration') || 0).toFixed(2); r.taskS = +(g('TaskDuration') || 0).toFixed(2); r.layoutS = +(g('LayoutDuration') || 0).toFixed(3);
        r.heap = (await heap(cdp)).usedMB;
        // First tap: New career -> the next screen (page clock)
        const s0 = await page.evaluate(() => GG.debug('ui').screen);
        const tap = await page.evaluate(async () => {
          const b = document.querySelector('[data-testid="btn-new"]'), s0 = GG.debug('ui').screen, t = performance.now();
          b.click();
          while (GG.debug('ui').screen === s0 && performance.now() - t < 20000) await new Promise(r => requestAnimationFrame(r));
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));   // painted
          return { ms: Math.round(performance.now() - t), to: GG.debug('ui').screen };
        });
        r.tap = tap; r.from = s0; r.rate = rate; r.wall = Date.now() - t0;
        out.trials.push(r);
        console.log('x' + rate, 'trial', k, JSON.stringify({ dcl: r.dcl, booted: r.booted, btn: r.btn, frame1: r.frame1, tti: r.tti, longTotal: r.longTotal, nLong: r.longs.length, scriptS: r.scriptS, heap: r.heap, tap: tap }));
      } catch (e) { console.log('FAIL', rate, k, e.message); }
      finally { await close(); }
    }
    const tr = out.trials.filter(t => t.rate === rate);
    if (tr.length) console.log('x' + rate, 'MEDIAN', JSON.stringify({ dcl: med(tr.map(t => t.dcl)), booted: med(tr.map(t => t.booted)), frame1: med(tr.map(t => t.frame1)), tti: med(tr.map(t => t.tti)), longTotal: med(tr.map(t => t.longTotal)), scriptS: med(tr.map(t => t.scriptS)), tap: med(tr.map(t => t.tap.ms)), heap: med(tr.map(t => t.heap)) }));
  }
  fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'results', 'tti_' + VIEW + '.json'), JSON.stringify(out, null, 1));
})();
