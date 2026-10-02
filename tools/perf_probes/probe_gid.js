// probe_gid.js: counts getImageData calls (size, ms, caller) during the first career start, per band; and logo renders.
const { open, frames } = require('./perf_lib');
const T = +(process.env.THROTTLE || 1);
(async () => {
  const { page, context, close } = await open({ throttle: T, noGoto: true });
  await context.addInitScript(() => {
    const L = window.__gid = []; const f0 = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function (x, y, w, h) { const t = performance.now(); const r = f0.apply(this, arguments);
      L.push([w + 'x' + h, +(performance.now() - t).toFixed(1), (new Error().stack.split('\n')[2] || '').trim().slice(0, 60), this.canvas.width + 'x' + this.canvas.height, this.getContextAttributes ? !!this.getContextAttributes().willReadFrequently : null]); return r; };
  });
  await page.goto('file://' + __dirname + '/dist/game.html');
  try {
    await page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
    await page.waitForFunction(() => GG.render.title.info().frame > 2, null, { timeout: 60000 });
    console.log('title:', JSON.stringify(await page.evaluate(() => window.__gid.splice(0))));
    for (const b of ['hail_damage', 'frost_heave', 'gravel_kings', 'grid_road_ramblers', 'hail_damage']) {
      const ms = await page.evaluate(b => { const t0 = performance.now(); GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, bandId: b }); GG.ui.closeAll(); return Math.round(performance.now() - t0); }, b);
      await frames(page, 2);
      const g = await page.evaluate(() => window.__gid.splice(0));
      console.log(b, 'quickStart', ms, 'ms; getImageData', g.length, 'calls', Math.round(g.reduce((a, x) => a + x[1], 0)), 'ms', JSON.stringify(g.slice(0, 3)));
    }
  } finally { await close(); }
})();
