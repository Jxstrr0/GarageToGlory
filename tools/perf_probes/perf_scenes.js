// perf_scenes.js: per-scene renderer.info + scene census + JS heap + frame times + first-build time.
// Run: THROTTLE=1|4 VIEW=390x844 SAMPLE=4000 node perf_scenes.js   -> results/scenes_t<T>_<VIEW>.json + a table
// Scenes: title (boot), garage x4 bands (tier 0), stage (festival full crowd + pyro, Sad Dome, Budokhan, club), carpet,
// van, map (gig board map tab over the garage: is the 3D still drawing?).
const fs = require('fs'), path = require('path');
const { open, heap, domNodes, frames, sample } = require('./perf_lib');
const T = +(process.env.THROTTLE || 1), VIEW = process.env.VIEW || '390x844', MS = +(process.env.SAMPLE || 4000);
const [VW, VH] = VIEW.split('x').map(Number);
const OUT = path.join(__dirname, 'results'); fs.mkdirSync(OUT, { recursive: true });
const BANDS = ['hail_damage', 'frost_heave', 'gravel_kings', 'grid_road_ramblers'];
const bareUi = (page, on) => page.evaluate(on => { ['hud', 'screens', 'toast'].forEach(id => { const e = document.getElementById(id); if (e) e.style.visibility = on ? 'hidden' : ''; }); }, on);

(async () => {
  const res = { throttle: T, view: VIEW, scenes: {} };
  const DPR = +(process.env.DPR || 1);
  const { page, cdp, errors, close } = await open({ w: VW, h: VH, throttle: T, dpr: DPR });
  const grab = async (name, extra) => {
    const drawing = await frames(page, 4);
    const info = await page.evaluate(() => ({ info: __perf.info(), census: __perf.census(), dbg: GG.debug('render') }));
    const h = await heap(cdp), dom = await domNodes(cdp);
    const fr = await sample(page, MS);
    const r = Object.assign({ info: info.info, census: info.census, heap: h, dom: dom.nodes, frame: fr, scene: info.dbg.scene, paused: info.dbg.paused, drawing }, extra || {});
    res.scenes[name] = r;
    console.log([name.padEnd(22), 'calls', r.info.calls, 'tris', r.info.tris, 'geo', r.info.geometries, 'tex', r.info.textures, 'prog', r.info.programs,
      '| heap', h.usedMB + 'MB', 'dom', dom.nodes, '| fps', fr.fps, 'frame p50/p95', fr.frame.p50 + '/' + fr.frame.p95, 'js', fr.js.p50 + '/' + fr.js.p95,
      'render', fr.render.p50 + '/' + fr.render.p95, drawing ? '' : '| 3D PAUSED (' + info.dbg.scene + ')', r.build != null ? '| build ' + r.build + 'ms' : ''].join(' '));
    return r;
  };
  try {
    await page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
    await page.waitForFunction(() => GG.render.title.info().frame > 8, null, { timeout: 60000 });
    await grab('title', { title: await page.evaluate(() => { const t = GG.render.title.info(); return { hail: t.hail, people: t.people.length }; }) });

    for (const b of BANDS) {
      const build = await page.evaluate(b => {
        const t0 = performance.now();
        const st = GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, name: 'Sam', bandId: b });
        if (GG.ui && GG.ui.closeAll) GG.ui.closeAll();
        GG.render.setScene('garage'); GG.render.syncState(st);
        return performance.now() - t0;
      }, b);
      await grab('garage_' + b, { build: Math.round(build) });
    }
    // Map: the gig board's map tab over Hail Damage's garage (last band = Ramblers; restart HD first).
    await page.evaluate(() => { const st = GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, name: 'Sam', bandId: 'hail_damage' }); GG.ui.closeAll(); GG.render.setScene('garage'); GG.render.syncState(st); });
    await frames(page, 3);
    await page.evaluate(() => GG.ui.openBoard({ mode: 'view' }));
    await page.waitForSelector('[data-testid="board-tab-map"]', { timeout: 30000 });
    await page.locator('[data-testid="board-tab-map"]').last().click();
    await page.waitForSelector('[data-testid="board-map"]', { timeout: 30000 });
    const mapInfo = await page.evaluate(() => ({ pins: document.querySelectorAll('[data-testid^="pin-"]').length, svg: document.querySelectorAll('.gb-map svg *').length, ui: GG.debug('ui').screen }));
    await grab('map(board,over garage)', { map: mapInfo });
    // Laptop: a full-screen sheet over the garage (does the room keep drawing underneath?)
    await page.evaluate(() => { GG.ui.closeAll(); });
    const lap = await page.evaluate(() => { const s = GG.ui.show('laptop'); return { screen: GG.debug('ui').screen, ok: !!s }; }).catch(e => ({ err: String(e) }));
    await grab('laptop(over garage)', { laptop: lap });
    await page.evaluate(() => { GG.ui.closeAll(); });

    // Stage: festival (Mudstonbury) with a full crowd + pyro kit, then the Sad Dome, Budokhan, a club.
    await bareUi(page, true);
    const stages = [['stage_festival_full', 'mudstonbury_fest'], ['stage_sad_dome', 'sad_dome'], ['stage_budokhan', 'budokhan'], ['stage_club', null]];
    for (const [name, vid] of stages) {
      const build = await page.evaluate(vid => {
        const s = GG.state, t0 = performance.now();
        s.player.kit = Object.assign({}, s.player.kit || {}, { extras: ['pyro', 'fan', 'cowbell'] });
        const v = vid ? Object.assign({}, GG.gig.venue(vid)) : { kind: 'club', name: 'Test club', capacity: 400 };
        GG.render.setScene('stage');
        GG.render.stage.setup({ venue: v, crowd: 5000, capacity: v.capacity, genre: s.genre, flags: { cape: 'velvet' }, player: s.player,
          members: s.members.map(m => ({ id: m.id, name: m.name, role: m.role, mood: m.mood, look: m.look })) });
        GG.render.stage.setCrowdLevel(95);
        return performance.now() - t0;
      }, vid);
      const si = await page.evaluate(() => { const i = GG.render.stage.info(); return { kind: i.kind, people: i.people, band: i.band.length }; });
      await grab(name, { build: Math.round(build), stage: si });
    }
    // Carpet (Loonies red carpet with the rival cast)
    {
      const build = await page.evaluate(() => {
        const t0 = performance.now(), s = GG.state, rid = GG.content.bands[s.bandId].rival;
        GG.render.setScene('carpet'); GG.render.carpet.setup({ members: s.members, player: s.player, flags: s.flags, genre: s.genre, rival: { id: rid, name: GG.content.rivals[rid].name }, year: 6 });
        return performance.now() - t0;
      });
      await grab('carpet', { build: Math.round(build) });
    }
    // Van (tier 0, a fall drive)
    {
      const build = await page.evaluate(() => { const t0 = performance.now(); GG.render.setScene('van'); GG.render.van.setTrip({ from: GG.state.city, to: 'Moose Jaw', km: 180, season: 'fall' }); return performance.now() - t0; });
      await grab('van', { build: Math.round(build) });
    }
    await bareUi(page, false);
    // Memory after visiting every scene (built scenes are kept: R.setScene keeps built[name]).
    await page.evaluate(() => GG.render.setScene('garage'));
    await frames(page, 3);
    res.afterAll = { heap: await heap(cdp), info: await page.evaluate(() => __perf.info()) };
    console.log('after all scenes (back in garage): heap', res.afterAll.heap.usedMB + 'MB', 'geo', res.afterAll.info.geometries, 'tex', res.afterAll.info.textures, 'programs', res.afterAll.info.programs);
    res.errors = errors.slice(0, 10);
    if (errors.length) console.log('ERRORS', errors.slice(0, 5));
  } catch (e) { console.log('FAIL', e.stack || e); res.fail = String(e); }
  finally {
    fs.writeFileSync(path.join(OUT, 'scenes_t' + T + '_' + VIEW + (DPR > 1 ? '_dpr' + DPR : '') + '.json'), JSON.stringify(res, null, 1));
    await close();
  }
})();
