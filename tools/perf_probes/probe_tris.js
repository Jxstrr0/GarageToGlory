// probe_tris.js: triangle breakdown per visible mesh (instanced x count) for title, garage HD, festival stage, club stage, carpet, van.
const { open, frames } = require('./perf_lib');
const BRK = () => {
  const out = [], tot = { all: 0, skinned: 0, instanced: 0, static: 0, n: 0 };
  const vis = o => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  __perf.scene.traverse(o => {
    if (!o.isMesh || !vis(o)) return; const ms = [].concat(o.material); if (!ms.some(m => m.visible)) return;
    const g = o.geometry, base = (g.index ? g.index.count : g.attributes.position.count) / 3, k = o.isInstancedMesh ? o.count : 1, t = base * k;
    const kind = o.isSkinnedMesh ? 'skinned' : o.isInstancedMesh ? 'instanced' : 'static';
    tot.all += t; tot[kind] += t; tot.n++;
    out.push([Math.round(t), kind, Math.round(base), k, (o.name || (o.parent && o.parent.name) || '') + '', ms[0].type.replace('Mesh', '').replace('Material', ''), ms[0].transparent ? 'T' : '']);
  });
  out.sort((a, b) => b[0] - a[0]);
  return { tot, top: out.slice(0, 10) };
};
(async () => {
  const { page, close } = await open({});
  const show = async name => { await frames(page, 3); const r = await page.evaluate(`(${BRK})()`); console.log(name, JSON.stringify(r.tot)); r.top.forEach(x => console.log('   ', JSON.stringify(x))); };
  try {
    await page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
    await page.waitForFunction(() => GG.render.title.info().frame > 4, null, { timeout: 60000 });
    await show('title');
    await page.evaluate(() => { const st = GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, name: 'Sam', bandId: 'hail_damage' }); GG.ui.closeAll(); GG.render.setScene('garage'); GG.render.syncState(st); });
    await show('garage_hd');
    for (const vid of ['mudstonbury_fest', null]) {
      await page.evaluate(vid => { const s = GG.state; s.player.kit = Object.assign({}, s.player.kit || {}, { extras: ['pyro', 'fan', 'cowbell'] });
        const v = vid ? Object.assign({}, GG.gig.venue(vid)) : { kind: 'club', name: 'Test club', capacity: 400 };
        GG.render.setScene('stage'); GG.render.stage.setup({ venue: v, crowd: 5000, capacity: v.capacity, genre: s.genre, flags: { cape: 'velvet' }, player: s.player, members: s.members.map(m => ({ id: m.id, name: m.name, role: m.role, mood: m.mood, look: m.look })) }); }, vid);
      await show('stage_' + (vid || 'club'));
    }
    await page.evaluate(() => { const s = GG.state, rid = GG.content.bands[s.bandId].rival; GG.render.setScene('carpet'); GG.render.carpet.setup({ members: s.members, player: s.player, flags: s.flags, genre: s.genre, rival: { id: rid, name: GG.content.rivals[rid].name }, year: 6 }); });
    await show('carpet');
    await page.evaluate(() => { GG.render.setScene('van'); GG.render.van.setTrip({ from: GG.state.city, to: 'Moose Jaw', km: 180, season: 'fall' }); });
    await show('van');
  } finally { await close(); }
})();
