// probe_hitnodes.js: Web Audio nodes created per drum hit (GG.audio.hit) per lane and kit tier, outside a song.
const { open } = require('./perf_lib');
(async () => {
  const { page, close } = await open({});
  try {
    await page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
    await page.mouse.click(195, 400);
    await page.evaluate(() => { GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, bandId: 'hail_damage' }); GG.ui.closeAll(); });
    const r = await page.evaluate(async () => {
      const out = {}, C = __perf.audio.created, sum = () => Object.values(C).reduce((a, b) => a + b, 0), src = () => (C.createBufferSource || 0) + (C.createOscillator || 0);
      for (const lane of GG.contracts.LANES) {
        const n0 = sum(), s0 = src(); for (let i = 0; i < 10; i++) { GG.audio.hit(lane); await new Promise(r => setTimeout(r, 120)); }
        out[lane] = { nodes: (sum() - n0) / 10, sources: (src() - s0) / 10 };
      }
      return out;
    });
    console.log('per hit (nodes / sources):', Object.entries(r).map(([k, v]) => k + ' ' + v.nodes + '/' + v.sources).join(' | '));
  } finally { await close(); }
})();
