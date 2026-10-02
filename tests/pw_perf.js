// pw_perf.js (v1.0 Lane P, contract §4.9): the hard perf gates that a headless browser can measure, plus the governor, the
// adaptive pixel ratio, the first-visit stalls and the audio voice work. Sections (META_ONLY=<a,b>; default all), each
// inside `timeout 500`, at 390x844 and PW_VIEW=440x956:
//   scenes  : draw calls + triangles per scene against the gates (title <= 33 / 38k; every band's tier-0 garage < 60 calls
//             and <= Hail Damage's x 1.15; club and Sad Dome <= 38 / 28k; the festival <= 38 / 35k; Budokhan <= 30k; the van
//             <= 31 / 18k; the carpet <= 19 / 10.5k), the crowd LOD (40-60 full people, the rest one instance each).
//   governor: the mode and cap per scene: title / idle garage 30 fps, walking 60, a tall sheet after its glide 10, the live
//             gig 60, the setlist sheet over the stage 10, the rival's set 60, a van drive 60, the idle van 30; rendered
//             frames never outrun the cap; a preview call under a tall sheet still draws; setPaused(true) stops it all.
//   ratio   : a DPR-3 phone: 'auto' renders at 1.5x; R.nextRatio (pure); slow frames step 1.5 -> 1.25 after 2 s
//             ('perf:quality'); a step that comes due while a song is live waits for the song to end; fast frames for
//             4 s step back up; High = 2x, back to Auto.
//   stalls  : shader checks off for players (on under automation / ?debug=1); the tier-0 garage makes no decal atlas
//             (another band's tier-0 room and a rented tier make the 2048 x 1024 one; 'low' graphics 1024 x 512); the
//             crowd's audio starts building on the first garage entry, before any tap; static room meshes frozen.
//   audio   : the kit's tap hits pre-render after the unlock; a pre-rendered tap is one new node (two the first time a
//             lane needs a choke gain); its spectrum matches the live synthesis; hits book exactly when asked (+-1 ms);
//             a burst of taps over a song + a cheering crowd: the global cap holds (<= 32), no tap is ever dropped.
// Run: node build.js && META_ONLY=governor timeout 500 node tests/pw_perf.js
const { open, checker, VIEW } = require('./_pw');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);
const tid = id => `[data-testid="${id}"]`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const W = VIEW.width;

async function boot(page) {
  await page.waitForSelector(tid('btn-new'), { timeout: 30000 });
  await page.waitForFunction(() => GG.render.title && GG.render.title.info().frame > 2, null, { timeout: 30000 });
}
// n more rendered frames
async function frames(page, n) {
  const f0 = await page.evaluate(() => GG.debug('render').frames);
  await page.waitForFunction(x => GG.debug('render').frames >= x, f0 + (n || 2), { timeout: 30000 });
}
async function quick(page, band) {
  await page.evaluate(b => { GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, name: 'Sam', bandId: b || 'hail_damage' }); GG.ui.closeAll(); GG.render.setPaused(false); }, band);
  await frames(page, 2);
}
const bare = (page, on) => page.evaluate(on => { ['hud', 'screens', 'toast'].forEach(id => { const e = document.getElementById(id); if (e) e.style.visibility = on ? 'hidden' : ''; }); }, on);
async function stage(page, vid, extra) {
  await page.evaluate(([vid, extra]) => {
    const s = GG.state;
    s.player.kit = Object.assign({}, s.player.kit || {}, { extras: ['pyro', 'fan', 'cowbell'] });
    const v = vid ? Object.assign({}, GG.gig.venue(vid)) : { kind: 'club', name: 'Test club', capacity: 400 };
    GG.render.setScene('stage');
    GG.render.stage.setup(Object.assign({ venue: v, crowd: 5000, capacity: v.capacity, genre: s.genre, flags: { cape: 'velvet' }, player: s.player,
      members: s.members.map(m => ({ id: m.id, name: m.name, role: m.role, mood: m.mood, look: m.look })) }, extra || {}));
    GG.render.stage.setCrowdLevel(95);
  }, [vid, extra || null]);
  await frames(page, 3);
}
const info = page => page.evaluate(() => { const d = GG.debug('render'); return { calls: d.drawCalls, tris: d.triangles, scene: d.scene }; });
// the governor over a window: mode, cap, rendered frames per second
async function gov(page, ms) {
  const a = await page.evaluate(() => GG.debug('perf')); await sleep(ms || 1200); const b = await page.evaluate(() => GG.debug('perf'));
  const s = (ms || 1200) / 1000;
  const r = { mode: b.mode, cap: b.cap, fps: +((b.rendered - a.rendered) / s).toFixed(1), ticks: +((b.ticks - a.ticks) / s).toFixed(1), covered: b.covered, scene: await page.evaluate(() => GG.debug('render').scene) };
  console.log('INFO governor ' + JSON.stringify(r));
  return r;
}

/* ---- scenes ------------------------------------------------------------------------------------------------------- */
async function scenes() {
  const c = checker('scenes');
  const { page, errors, close } = await open();
  try {
    await boot(page);
    const t = await info(page);
    c.ok(t.scene === 'title' && t.calls <= 33 && t.tris <= 38000, 'title <= 33 calls / 38k tris ' + JSON.stringify(t));
    const g = {};
    for (const b of ['hail_damage', 'frost_heave', 'gravel_kings', 'grid_road_ramblers']) { await quick(page, b); g[b] = await info(page); }
    const hd = g.hail_damage.calls;
    for (const b of Object.keys(g)) c.ok(g[b].scene === 'garage' && g[b].calls < 60 && g[b].calls <= Math.floor(hd * 1.15), b + ' tier-0 garage < 60 calls and <= HD x 1.15 (' + hd + ') ' + JSON.stringify(g[b]));
    await bare(page, true);
    const gates = [['club', null, 38, 28000], ['sad_dome', 'sad_dome', 38, 28000], ['festival', 'mudstonbury_fest', 38, 35000], ['budokhan', 'budokhan', 99, 30000]];
    for (const [name, vid, calls, tris] of gates) {
      await stage(page, vid);
      const s = await info(page), si = await page.evaluate(() => GG.render.stage.info());
      c.ok(s.calls <= calls && s.tris <= tris, 'stage ' + name + ' <= ' + (calls < 99 ? calls + ' calls / ' : '') + tris + ' tris ' + JSON.stringify(s));
      c.ok(si.people === 150 && si.lod && si.lod.near >= 40 && si.lod.near <= 60 && si.lod.near + si.lod.far === si.people, name + ': a full crowd, 40-60 near, the rest LOD ' + JSON.stringify(si.lod));
    }
    // the rival's set from the riser: the crowd near the camera keeps the full rig
    await stage(page, null, { view: 'spectator', rival: true });
    const sp = await info(page), spi = await page.evaluate(() => GG.render.stage.info());
    c.ok(sp.calls <= 38 && sp.tris <= 28000 && spi.view === 'spectator', 'spectator view within the club gate ' + JSON.stringify(sp));
    // a small room is all near people (no LOD instance drawn)
    await stage(page, null, { crowd: 30, capacity: 40 });
    const sm = await page.evaluate(() => GG.render.stage.info());
    c.ok(sm.people === 30 && sm.lod.far === 0 && sm.lod.near === 30, 'a 30-person room: everyone full detail ' + JSON.stringify(sm.lod));
    await page.evaluate(() => { const s = GG.state, rid = GG.content.bands[s.bandId].rival; GG.render.setScene('carpet'); GG.render.carpet.setup({ members: s.members, player: s.player, flags: s.flags, genre: s.genre, rival: { id: rid, name: GG.content.rivals[rid].name }, year: 6 }); });
    await frames(page, 3);
    const cp = await info(page);
    c.ok(cp.calls <= 19 && cp.tris <= 10500, 'carpet unchanged (<= 19 / 10.5k) ' + JSON.stringify(cp));
    await page.evaluate(() => { GG.render.setScene('van'); GG.render.van.setTrip({ from: GG.state.city, to: 'Moose Jaw', km: 180, season: 'fall' }); });
    await frames(page, 3);
    const vn = await info(page);
    c.ok(vn.calls <= 31 && vn.tris <= 18000, 'van unchanged (<= 31 / 18k) ' + JSON.stringify(vn));
    await bare(page, false);
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'scenes threw: ' + (e.stack || e)); }
  finally { await close(); c.done(); }
}

/* ---- governor ----------------------------------------------------------------------------------------------------- */
async function governor() {
  const c = checker('governor');
  const { page, errors, close } = await open();
  try {
    await boot(page);
    let g = await gov(page);
    c.ok(g.mode === 'idle' && g.cap === 30 && g.fps <= 33, 'title: idle, 30 fps ' + JSON.stringify(g));
    await quick(page);
    // the camera settles: since the logo readback fix (46, Lane M) quickStart no longer stalls ~3 s, so SwiftShader's
    // first-frame shader work now lands after it and the glide can take several seconds of 2-3 fps headless frames
    await page.waitForFunction(() => GG.debug('perf').mode !== 'glide', null, { timeout: 30000 }).catch(() => {});
    await sleep(900);
    g = await gov(page);
    c.ok(g.mode === 'idle' && g.cap === 30 && g.fps <= 33, 'garage idle: 30 fps ' + JSON.stringify(g));
    // walking to the kit: 60
    await page.evaluate(() => GG.render.goToHotspot('kit'));
    const walk = await page.evaluate(() => { const d = GG.debug('perf'); return { mode: d.mode, cap: d.cap, walking: GG.debug('render').walking }; });
    await page.waitForFunction(() => GG.debug('perf').mode === 'busy' || !GG.debug('render').walking, null, { timeout: 5000 });
    const w2 = await page.evaluate(() => ({ mode: GG.debug('perf').mode, cap: GG.debug('perf').cap, walking: GG.debug('render').walking }));
    c.ok((w2.mode === 'busy' && w2.cap === 60) || (!w2.walking && walk.walking), 'walking: 60 fps ' + JSON.stringify([walk, w2]));
    await page.waitForFunction(() => !GG.debug('render').walking && !GG.debug('render').pending, null, { timeout: 15000 }).catch(() => {});   // (arrived and the kit opened)
    await sleep(300);
    await page.evaluate(() => GG.ui.closeAll());
    // a tall sheet: the glide at 60, then 10 fps behind it
    await page.evaluate(() => GG.ui.show('laptop'));
    await page.waitForFunction(() => GG.debug('render').insets.bottom > 0 && GG.debug('perf').covered && GG.debug('perf').mode === 'covered', null, { timeout: 20000 });   // (the sheet's insets arrive a frame later: then the glide, then 10 fps)
    g = await gov(page, 2000);
    c.ok(g.mode === 'covered' && g.cap === 10 && g.fps <= 11, 'behind the laptop (tall sheet) after the glide: <= 10 fps ' + JSON.stringify(g));
    // a preview call under the sheet still draws (any change renders the next frame)
    // (the first tick after a change renders, cap or not: two rAFs after the call the game has ticked and drawn)
    const pv = await page.evaluate(async () => {
      const out = [];
      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 37));
        const a = GG.debug('perf'); GG.render.syncState(GG.state);
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const b = GG.debug('perf'); out.push([b.ticks - a.ticks, b.rendered - a.rendered]);
      }
      return out;
    });
    c.ok(pv.every(x => x[0] >= 1 && x[1] >= 1), 'a change under the sheet renders on the next tick ' + JSON.stringify(pv));
    // setPaused(true) wins
    const ps = await page.evaluate(async () => { GG.render.setPaused(true); const f0 = GG.debug('render').frames; GG.render.syncState(GG.state); await new Promise(r => setTimeout(r, 400)); const n = GG.debug('render').frames - f0; GG.render.setPaused(false); return n; });
    c.ok(ps === 0, 'setPaused(true) stops even change-driven frames (' + ps + ')');
    await page.evaluate(() => GG.ui.closeAll());
    // the gig: the setlist (tall) over the stage at 10, the live show at 60
    await page.evaluate(() => { const s = GG.state; s.card = null; s.phase = 'plan'; s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); GG.ui.gigAutoplay = false; GG.ui.playGig(s.gig, () => {}); });
    await page.waitForFunction(() => GG.debug('ui').screen === 'gig-set', null, { timeout: 15000 });
    await sleep(600);
    await page.waitForFunction(() => GG.debug('perf').mode === 'covered', null, { timeout: 20000 });
    g = await gov(page, 1500);
    c.ok(g.mode === 'covered' && g.cap === 10 && g.fps <= 11, 'the setlist sheet over the stage: 10 fps ' + JSON.stringify(g));
    await page.locator(tid('btn-gig-start')).last().click();
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 20000 });
    g = await gov(page, 1500);
    c.ok(g.mode === 'live' && g.cap === 60 && g.fps >= g.ticks * 0.9, 'the live gig: 60 fps, every tick rendered ' + JSON.stringify(g));
    await page.evaluate(() => GG.ui.closeAll());
    // the rival's set (a Battle of the Bands, from the crowd): 60
    await page.evaluate(() => {
      const st = GG.state;
      if (!st.rival && GG.rival && GG.rival.init) GG.rival.init(st);
      GG.ui.rivalSongMs = 4000;
      GG.ui.watchRival({ showdown: { kind: 'botb' }, venueId: 'legion_63', kind: 'legion', name: 'Legion Branch 63', capacity: 120 }, () => {});
    });
    const rv = await page.evaluate(() => GG.ui.isOpen('rival-set'));
    if (rv) {
      await frames(page, 2);
      g = await gov(page, 1200);
      c.ok(g.mode === 'live' && g.cap === 60, 'the rival\'s set: 60 fps ' + JSON.stringify(g));
    } else c.ok(!!(await page.evaluate(() => GG.state.rival)) === false, 'no rival yet in this career (rival set skipped)');
    await page.evaluate(() => GG.ui.closeAll());
    // the van: a drive at 60, an idle preview at 30
    await page.evaluate(() => { const s = GG.state; GG.prefs.set({ skipVan: false }); s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); GG.ui.playVan(s.gig, () => {}); });
    await page.waitForFunction(() => GG.debug('ui').screen === 'van', null, { timeout: 15000 });
    await frames(page, 2);
    g = await gov(page, 1200);
    const vs = await page.evaluate(() => GG.debug('render').scene);
    c.ok(vs !== 'van' || (g.mode === 'drive' && g.cap === 60), 'a van drive: 60 fps ' + JSON.stringify([vs, g]));
    await page.evaluate(() => { GG.ui.closeAll(); GG.render.setScene('van'); GG.render.van.setTrip({ from: 'Saskatoon', to: 'Regina', km: 240, season: 'summer', tier: 0 }); GG.render.setPaused(false); });
    await sleep(600);
    g = await gov(page, 1200);
    c.ok(g.mode === 'idle' && g.cap === 30 && g.fps <= 33, 'the van with no drive: 30 fps ' + JSON.stringify(g));
    await page.evaluate(() => GG.render.setScene('garage'));
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'governor threw: ' + (e.stack || e)); }
  finally { await close(); c.done(); }
}

/* ---- ratio -------------------------------------------------------------------------------------------------------- */
async function ratio() {
  const c = checker('ratio');
  const { page, errors, close } = await open({ dpr: 3 });
  try {
    await boot(page);
    // the pure step function
    const nr = await page.evaluate(() => { const f = GG.render.nextRatio; return [f(1.5, 25, 2000), f(1.25, 25, 2000), f(1, 25, 9000), f(1.5, 25, 1999), f(1, 10, 4000), f(1.25, 10, 3999), f(1.5, 10, 9000), f(1.25, 15, 9999), f(1.25, 20, 5000), f(1.25, 12, 5000), f(1.4, 30, 3000)]; });
    c.ok(JSON.stringify(nr) === JSON.stringify([1.25, 1, 1, 1.5, 1.25, 1.25, 1.5, 1.25, 1.25, 1.25, 1.25]), 'R.nextRatio: down after 2 s over 20 ms, up after 4 s under 12 ms, else hold ' + JSON.stringify(nr));
    await quick(page);
    const p0 = await page.evaluate(() => ({ perf: GG.debug('perf'), dpr: devicePixelRatio, canvas: document.querySelector('#scene canvas').width, css: document.querySelector('#scene canvas').clientWidth }));
    c.ok(p0.dpr === 3 && p0.perf.quality === 'auto' && p0.perf.pixelRatio === 1.5 && Math.abs(p0.canvas - p0.css * 1.5) <= 1, "auto on a DPR-3 phone: 1.5x, not 2x " + JSON.stringify({ px: p0.perf.pixelRatio, canvas: p0.canvas, css: p0.css }));
    await page.evaluate(() => { window.__q = []; GG.on('perf:quality', p => window.__q.push(p)); });
    const feed = (ms, secs, stop) => page.evaluate(async ([ms, secs, stop]) => {
      const t0 = performance.now();
      while (performance.now() - t0 < secs * 1000) {
        GG.render.feedFrames([ms, ms, ms, ms, ms, ms]);
        await new Promise(r => setTimeout(r, 120));
        if (stop && window.__q.length >= stop) break;
      }
      return { q: window.__q.slice(), perf: GG.debug('perf') };
    }, [ms, secs, stop]);
    // slow frames for 2+ s: one step down
    let r = await feed(30, 6, 1);
    c.ok(r.q.length === 1 && r.q[0].pixelRatio === 1.25 && r.q[0].reason === 'slow' && r.perf.pixelRatio === 1.25, 'slow frames (p95 30 ms) for 2 s: 1.5 -> 1.25 ' + JSON.stringify(r.q));
    // a song is live: the next step waits for it to end
    const live = await page.evaluate(() => { GG.audio.unlock(); const sg = GG.songs.signature('metal'); window.__h = GG.audio.play(sg, { genre: 'metal', section: 'verse', loop: true }); return GG.audio.isPlaying(); });
    r = await feed(30, 3.2);
    c.ok(live && r.q.length === 1 && r.perf.pixelRatio === 1.25 && r.perf.want === 1, 'while a song is live the 1.0 step waits ' + JSON.stringify({ live, q: r.q.length, px: r.perf.pixelRatio, want: r.perf.want }));
    await page.evaluate(() => GG.audio.stop());
    await page.waitForFunction(() => window.__q.length >= 2, null, { timeout: 5000 }).catch(() => {});
    r = await page.evaluate(() => ({ q: window.__q.slice(), perf: GG.debug('perf') }));
    c.ok(r.q.length === 2 && r.q[1].pixelRatio === 1 && r.perf.pixelRatio === 1, 'the song ends: the step lands (1.0) ' + JSON.stringify(r.q));
    // fast frames for 4+ s: back up a step
    r = await feed(8, 7, 3);
    c.ok(r.q.length === 3 && r.q[2].pixelRatio === 1.25 && r.q[2].reason === 'fast', 'fast frames (8 ms) for 4 s: 1.0 -> 1.25 ' + JSON.stringify(r.q.slice(2)));
    // in-between frames hold
    r = await feed(16, 2.5);
    c.ok(r.q.length === 3 && r.perf.pixelRatio === 1.25, '16 ms frames hold the ratio');
    // High = 2x (one tap away), Auto again
    const hi = await page.evaluate(() => { GG.prefs.set({ graphics: 'high' }); const a = GG.debug('perf'); GG.prefs.set({ graphics: 'auto' }); const b = GG.debug('perf'); return { hi: a.pixelRatio, hq: a.quality, auto: b.pixelRatio, aq: b.quality, q: window.__q.slice(3) }; });
    c.ok(hi.hi === 2 && hi.hq === 'high' && hi.aq === 'auto' && hi.auto === 1.25 && hi.q.some(x => x.reason === 'settings'), 'High = 2x, back to Auto at its ratio ' + JSON.stringify(hi));
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'ratio threw: ' + (e.stack || e)); }
  finally { await close(); c.done(); }
}

/* ---- stalls ------------------------------------------------------------------------------------------------------- */
async function stalls() {
  const c = checker('stalls');
  // a player's browser (no webdriver flag): no shader error checks
  let o = await open({ noGoto: true });
  try {
    await o.context.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false, configurable: true }); });
    await o.page.goto(o.url);
    await o.page.waitForFunction(() => window.GG && GG.main && GG.main.booted && GG.render.available, null, { timeout: 30000 });   // (the first-launch calibration may sit over the title)
    const sc = await o.page.evaluate(() => ({ wd: navigator.webdriver, checks: GG.debug('perf').shaderChecks }));
    c.ok(sc.wd === false && sc.checks === false, 'a player\'s phone: shader error checks off ' + JSON.stringify(sc));
    c.ok(o.errors.length === 0, 'no console errors (player) ' + o.errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'stalls (player) threw: ' + (e.stack || e)); }
  finally { await o.close(); }
  o = await open();
  const { page, errors } = o;
  try {
    await boot(page);
    c.ok(await page.evaluate(() => GG.debug('perf').shaderChecks) === true, 'under automation: shader checks on');
    // the crowd's audio starts building on the first garage entry, before any tap (no AudioContext yet)
    const a0 = await page.evaluate(() => ({ state: GG.debug('audio').state, raw: GG.debug('audio').crowdRaw }));
    await quick(page);
    await page.waitForFunction(() => GG.debug('audio').crowdRaw >= 7, null, { timeout: 60000 }).catch(() => {});
    const a1 = await page.evaluate(() => ({ state: GG.debug('audio').state, raw: GG.debug('audio').crowdRaw }));
    c.ok(a0.state === 'none' && a0.raw === 0 && a1.state === 'none' && a1.raw >= 7, 'crowd audio built on the first garage entry, no unlock needed ' + JSON.stringify([a0, a1]));
    // the parents' garage (tier 0): no decal atlas; static room meshes frozen
    const g0 = await page.evaluate(() => { const sp = GG.debug('render').space, s = GG.render.util.currentScene(); let frozen = 0; s.children.forEach(o => { if (o.isMesh && !o.matrixAutoUpdate) frozen++; }); return { atlas: sp.atlas, room: sp.room, frozen }; });
    c.ok(g0.room === 0 && g0.atlas === null && g0.frozen >= 4, 'the parents\' garage: no atlas, static meshes frozen ' + JSON.stringify(g0));
    // another band's tier-0 room paints decals: the full atlas; a rented tier too
    await quick(page, 'frost_heave');
    const g1 = await page.evaluate(() => GG.debug('render').space);
    c.ok(g1.room === 4 && g1.atlas === '2048x1024' && g1.decals > 0, 'the laundromat basement (tier 0, decals): 2048x1024 ' + JSON.stringify({ room: g1.room, atlas: g1.atlas, decals: g1.decals }));
    await quick(page);
    await page.evaluate(() => { const s = GG.state; s.spaceTier = 1; s.space = GG.shop.spaceDef(s, 1).id; GG.main.sync(); });
    await frames(page, 2);
    const g2 = await page.evaluate(() => GG.debug('render').space);
    c.ok(g2.tier === 1 && g2.atlas === '2048x1024' && g2.decals > 0, 'a rented jam room: 2048x1024 ' + JSON.stringify({ tier: g2.tier, atlas: g2.atlas }));
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'stalls threw: ' + (e.stack || e)); }
  finally { await o.close(); }
  // 'low' graphics: the half-size atlas (a fresh page: the atlas is made once per page)
  o = await open({ noGoto: true });
  try {
    await o.context.addInitScript(() => { try { localStorage.setItem('gg.v1.settings', JSON.stringify({ graphics: 'low' })); } catch (e) {} });
    await o.page.goto(o.url);
    await boot(o.page);
    await quick(o.page, 'frost_heave');
    const lo = await o.page.evaluate(() => ({ q: GG.render.prefs().quality, atlas: GG.debug('render').space.atlas, decals: GG.debug('render').space.decals }));
    c.ok(lo.q === 'low' && lo.atlas === '1024x512' && lo.decals > 0, "'low' graphics: a 1024x512 atlas " + JSON.stringify(lo));
    c.ok(o.errors.length === 0, 'no console errors (low) ' + o.errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'stalls (low) threw: ' + (e.stack || e)); }
  finally { await o.close(); c.done(); }
}

/* ---- audio -------------------------------------------------------------------------------------------------------- */
const COUNT = () => {   // every node created on a live (not offline) context, every buffer source's start, every source's span
  const N = window.__nodes = { n: 0, starts: [], spans: [] };
  const BAC = window.BaseAudioContext || window.AudioContext, proto = BAC.prototype;
  Object.getOwnPropertyNames(proto).filter(k => /^create/.test(k) && typeof proto[k] === 'function').forEach(k => {
    const f0 = proto[k];
    proto[k] = function () {
      const n = f0.apply(this, arguments);
      if (window.OfflineAudioContext && this instanceof OfflineAudioContext) return n;
      N.n++;
      if (k === 'createBufferSource' || k === 'createOscillator') {   // [start, end] on the context clock (end: stop, natural end, ended)
        const ctx = this, rec = { s: null, e: Infinity }, st = n.start, sp = n.stop;
        n.start = function (w, off, dur) {
          rec.s = Math.max(w || 0, ctx.currentTime); N.spans.push(rec);
          if (k === 'createBufferSource') { if (!n.loop && n.buffer) rec.e = rec.s + (dur != null ? dur : n.buffer.duration - (off || 0)) / Math.max(0.01, n.playbackRate.value || 1); N.starts.push(w); }
          return st.apply(this, arguments);
        };
        n.stop = function (w) { rec.e = Math.min(rec.e, Math.max(w || 0, ctx.currentTime)); return sp.apply(this, arguments); };
        n.addEventListener('ended', () => { rec.e = Math.min(rec.e, ctx.currentTime); });
      }
      return n;
    };
  });
};
async function audio() {
  const c = checker('audio');
  const o = await open({ noGoto: true });
  const { page, errors } = o;
  try {
    await o.context.addInitScript(COUNT);
    await page.goto(o.url);
    await boot(page);
    await quick(page);
    await page.mouse.click(Math.round(W / 2), 120);   // a first touch: the audio unlock
    await page.evaluate(() => GG.audio.unlock());
    await page.waitForFunction(() => { const p = GG.debug('audio').prerender; return p && p.ready; }, null, { timeout: 30000 });
    const pr = await page.evaluate(() => Object.assign({ want: 'metal|' + GG.audio.kitQuality() }, GG.debug('audio').prerender));
    c.ok(pr.ready && pr.key === pr.want && pr.renders >= 8, 'the kit\'s tap hits pre-rendered after the unlock ' + JSON.stringify(pr));
    // nodes per tap: one buffer source (+ the lane's choke gain the first time)
    const per = await page.evaluate(async () => {
      const out = {};
      GG.audio.hit('hat'); await new Promise(res => setTimeout(res, 200));   // (the first tap of a session makes the tap port: 8 gains, once)
      for (const lane of GG.contracts.LANES) {
        const r = [];
        for (let i = 0; i < 6; i++) { const n0 = window.__nodes.n; GG.audio.hit(lane); r.push(window.__nodes.n - n0); await new Promise(res => setTimeout(res, 90)); }
        out[lane] = r;
      }
      return { out, hits: GG.debug('audio').prerender.hits };
    });
    const lanes = Object.values(per.out);
    c.ok(lanes.every(r => r.every(n => n >= 1 && n <= 2) && r.reduce((a, b) => a + b, 0) <= r.length + 2), 'a pre-rendered tap = 1 new node (2 while a lane builds its choke gains, at most twice per lane here) ' + JSON.stringify(per.out));
    c.ok(per.hits >= 37, 'every tap used a pre-rendered hit (' + per.hits + ')');
    // the spectrum of a pre-rendered hit matches the live synthesis (same kit chain, offline)
    const sp = await page.evaluate(async () => {
      const A = GG.audio, res = {};
      const spec = (buf) => {   // magnitudes of a 1024-point DFT of the first 2048 samples (Hann), in 32 bands
        const d = buf.getChannelData(0), N = 2048, off = Math.floor(0.05 * buf.sampleRate), bands = new Float64Array(32);
        for (let k = 1; k < 1024; k += 2) {
          let re = 0, im = 0;
          for (let n = 0; n < N; n += 2) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * n / N), x = (d[off + n] || 0) * w, a = 2 * Math.PI * k * n / N; re += x * Math.cos(a); im -= x * Math.sin(a); }
          bands[Math.min(31, Math.floor(Math.log2(k) * 3.2))] += Math.sqrt(re * re + im * im);
        }
        return Array.from(bands);
      };
      const corr = (a, b) => { const ma = a.reduce((x, y) => x + y) / a.length, mb = b.reduce((x, y) => x + y) / b.length; let s = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { s += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return s / Math.sqrt(sa * sb || 1); };
      for (const [lane, v] of [['kick'], ['snare'], ['hat'], ['cymbal'], ['toms', 1], ['ride']]) {
        const cap = lane === 'cymbal' ? 0.9 : 0.5, q = 1;
        const live = await A.renderOffline({ lane, variant: v, quality: q, cap });
        const pre = await A.renderOffline({ lane, variant: v, quality: q, pre: await A.prerenderHit({ lane, variant: v, quality: q, cap, sr: 44100 }) });
        const db = (a, b) => 20 * Math.log10((a || 1e-9) / (b || 1e-9));
        res[lane] = { corr: +corr(spec(live.buffer), spec(pre.buffer)).toFixed(4), peakDb: +db(pre.peak, live.peak).toFixed(2), rmsDb: +db(pre.rms, live.rms).toFixed(2) };
      }
      return res;
    });
    console.log('INFO audio spectrum ' + JSON.stringify(sp));
    c.ok(Object.values(sp).every(x => x.corr >= 0.98 && Math.abs(x.peakDb) <= 1 && Math.abs(x.rmsDb) <= 1), 'pre-rendered hits: spectrum, peak and level within tolerance of the live synthesis ' + JSON.stringify(sp));
    // hits book exactly when asked: now (+5 ms) and ahead on the audio clock
    const bk = await page.evaluate(async () => {
      const ctx = GG.audio.context(), out = [];
      for (const lane of ['kick', 'snare', 'hat']) {
        const s0 = window.__nodes.starts.length, when = ctx.currentTime + 0.3;
        GG.audio.hit(lane, when);
        const st = window.__nodes.starts.slice(s0);
        out.push(st.length === 1 ? Math.round((st[0] - when) * 1e5) / 100 : 'n' + st.length);
        await new Promise(r => setTimeout(r, 120));
        const s1 = window.__nodes.starts.length, now = ctx.currentTime;
        GG.audio.hit(lane);
        const st2 = window.__nodes.starts.slice(s1);
        out.push(st2.length === 1 ? Math.round((st2[0] - (now + 0.005)) * 1e5) / 100 : 'n' + st2.length);
        await new Promise(r => setTimeout(r, 120));
      }
      return out;
    });
    c.ok(bk.every(x => typeof x === 'number' && Math.abs(x) <= 1), 'pre-rendered hits start when booked (+-1 ms) ' + JSON.stringify(bk));
    // a burst: a song + a hot crowd + taps on every lane every 25 ms + cheers: the cap holds, no tap dropped
    await page.evaluate(() => { const s = GG.state; s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); GG.ui.gigAutoplay = false; GG.ui.playGig(s.gig, () => {}); });
    await page.waitForFunction(() => GG.debug('ui').screen === 'gig-set', null, { timeout: 15000 });
    await page.locator(tid('btn-gig-start')).last().click();
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 20000 });
    const burst = await page.evaluate(async () => {
      const d0 = GG.debug('audio').counts.tapDrops, lanes = GG.contracts.LANES, t0 = performance.now(), c0 = GG.audio.context().currentTime; let n = 0;
      ['wallOfDeath', 'mosh', 'headbang'].forEach((k, i) => setTimeout(() => GG.emit('crowd:moment', { kind: k }), i * 400));
      while (performance.now() - t0 < 2500) {
        for (const l of lanes) { GG.audio.hit(l); n++; }
        GG.audio.sfx('cheer'); GG.audio.sfx('cash');
        await new Promise(r => setTimeout(r, 80));   // all six lanes every 80 ms: 75 taps/s (an Expert metal gig peaks near 20)
      }
      await new Promise(r => setTimeout(r, 1500));   // everything booked has played out
      const v = GG.audio.voiceStats(), c1 = GG.audio.context().currentTime;
      // the true peak: sources sounding at once on the audio clock over the burst (a sweep over every [start, end])
      const ev = [];
      for (const r of window.__nodes.spans) { if (r.s == null || r.e < c0 || r.s > c1) continue; ev.push([r.s, 1], [Math.min(r.e, c1 + 5), -1]); }
      ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      let cur = 0, peak = 0; for (const x of ev) { cur += x[1]; if (cur > peak) peak = cur; }
      return { taps: n, tapDrops: GG.debug('audio').counts.tapDrops - d0, peak, ledgerPeak: v.peak, over: v.over, drops: v.dropsBy, evicted: v.evicted };
    });
    console.log('INFO audio burst ' + JSON.stringify(burst) + ' booked ' + JSON.stringify(bk));
    c.ok(burst.taps > 150 && burst.tapDrops === 0 && burst.peak <= 32 && burst.over === 0, 'a burst of ' + burst.taps + ' taps over a song + a cheering crowd: <= 32 voices, no tap dropped ' + JSON.stringify(burst));
    await page.evaluate(() => GG.ui.closeAll());
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'audio threw: ' + (e.stack || e)); }
  finally { await o.close(); c.done(); }
}

(async () => {
  if (want('scenes')) await scenes();
  if (want('governor')) await governor();
  if (want('ratio')) await ratio();
  if (want('stalls')) await stalls();
  if (want('audio')) await audio();
})();
