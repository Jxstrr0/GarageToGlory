// probe_tex.js: which textures are big in the garage / title / carpet / stage (scratch probe)
const { open, frames } = require('./perf_lib');
(async () => {
  const { page, close } = await open({});
  try {
    await page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
    await page.waitForFunction(() => GG.render.title.info().frame > 4, null, { timeout: 60000 });
    console.log('title', JSON.stringify(await page.evaluate(() => __perf.census().texList)));
    await page.evaluate(() => { const st = GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, name: 'Sam', bandId: 'hail_damage' }); GG.ui.closeAll(); GG.render.setScene('garage'); GG.render.syncState(st); });
    await frames(page, 3);
    console.log('garage', JSON.stringify(await page.evaluate(() => __perf.census().texList)));
    // which objects carry the biggest maps (walk the scene)
    console.log(JSON.stringify(await page.evaluate(() => { const out = []; __perf.scene.traverse(o => { const m = o.material; if (m && m.map && m.map.image && m.map.image.width >= 512) out.push([o.type, o.name, m.map.image.width + 'x' + m.map.image.height, o.parent && o.parent.type, JSON.stringify(o.userData).slice(0, 80), o.visible]); }); return out; })));
  } finally { await close(); }
})();
