// probe_warm.js: (a) crowd buffers warm-up after the audio unlock (GG.debug('audio').crowd.ready / extras), (b) first career:
// quickStart vs the first garage scene build, at THROTTLE=1|4.
const { open, frames } = require('./perf_lib');
const T = +(process.env.THROTTLE || 1);
(async () => {
  const { page, close } = await open({ throttle: T });
  try {
    await page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
    await page.waitForFunction(() => GG.render.title.info().frame > 2, null, { timeout: 60000 });
    // unlock audio with a real tap on the title (like a player's first touch)
    await page.mouse.click(195, 400);
    const w = await page.evaluate(async () => {
      const t0 = performance.now(), r = { state0: GG.debug('audio').state };
      while (performance.now() - t0 < 60000) {
        const a = GG.debug('audio');
        if (r.ready == null && a.crowd && a.crowd.ready) r.ready = Math.round(performance.now() - t0);
        if (a.extras && a.extras.length) r.extras = a.extras.length;
        if (r.ready != null && r.extrasDone == null && a.extras && a.extras.length >= 5) { r.extrasDone = Math.round(performance.now() - t0); }
        if (r.ready != null && performance.now() - t0 > (r.ready + 15000)) break;
        await new Promise(res => setTimeout(res, 100));
      }
      r.final = GG.debug('audio').extras; r.state = GG.debug('audio').state; return r;
    });
    console.log('x' + T, 'crowd warm-up after unlock:', JSON.stringify(w));
    const b = await page.evaluate(() => {
      const t0 = performance.now(); const st = GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, name: 'Sam', bandId: 'hail_damage' });
      const t1 = performance.now(); GG.ui.closeAll(); GG.render.setScene('garage'); GG.render.syncState(st); const t2 = performance.now();
      return { quickStart: Math.round(t1 - t0), garageBuild: Math.round(t2 - t1) };
    });
    await frames(page, 1);
    console.log('x' + T, 'first career:', JSON.stringify(b));
  } finally { await close(); }
})();
