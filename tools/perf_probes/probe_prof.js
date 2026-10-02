// probe_prof.js: CPU profile of the first career start (quickStart -> garage build -> first frames) and of a festival stage
// first build; prints self time by function (top 18) and by source module (/* NN_file.js */ script tags => script index).
const { open, frames } = require('./perf_lib');
const T = +(process.env.THROTTLE || 1), WHAT = process.env.WHAT || 'career';
(async () => {
  const { page, cdp, close } = await open({ throttle: T });
  try {
    await page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
    await page.waitForFunction(() => GG.render.title.info().frame > 2, null, { timeout: 60000 });
    if (WHAT === 'stage') { await page.evaluate(() => { const st = GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, bandId: 'hail_damage' }); GG.ui.closeAll(); }); await frames(page, 3); }
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
    const ms = await page.evaluate(w => { const t0 = performance.now();
      if (w === 'career') { GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, name: 'Sam', bandId: 'hail_damage' }); }
      else { const s = GG.state, v = Object.assign({}, GG.gig.venue('mudstonbury_fest')); GG.render.setScene('stage'); GG.render.stage.setup({ venue: v, crowd: 5000, capacity: v.capacity, genre: s.genre, flags: {}, player: s.player, members: s.members.map(m => ({ id: m.id, name: m.name, role: m.role, look: m.look })) }); }
      return performance.now() - t0; }, WHAT);
    await frames(page, 2);
    const { profile } = await cdp.send('Profiler.stop');
    const self = new Map(), byUrl = new Map(); let total = 0;
    const dt = profile.timeDeltas, idx = new Map(profile.nodes.map(n => [n.id, n]));
    const cnt = new Map(); profile.samples.forEach((id, i) => cnt.set(id, (cnt.get(id) || 0) + (dt[i] || 0)));
    for (const [id, us] of cnt) { const n = idx.get(id), f = n.callFrame, k = (f.functionName || '(anon)') + ' ' + (f.url ? f.url.split('/').pop() : '') + ':' + f.lineNumber; self.set(k, (self.get(k) || 0) + us); total += us;
      const u = f.url ? (/three/.test(f.url) ? 'three.min.js' : 'game.html') : f.functionName || '(native)'; byUrl.set(u, (byUrl.get(u) || 0) + us); }
    console.log(WHAT, 'x' + T, 'wall', Math.round(ms), 'ms; profile total', Math.round(total / 1000), 'ms');
    console.log(' by source:', [...byUrl].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => k + ' ' + Math.round(v / 1000)).join(' | '));
    [...self].sort((a, b) => b[1] - a[1]).slice(0, 18).forEach(([k, v]) => console.log('  ', String(Math.round(v / 1000)).padStart(5), 'ms', k));
  } finally { await close(); }
})();
