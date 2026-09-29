// pw_stage.js: the v0.3 gig stage + van scenes in real Chromium at phone portrait (390x844).
// Run: node build.js && timeout 500 node tests/pw_stage.js   (META_ONLY=stage | van | stage,van)
// Stage: builds with fixture data, frames advance, every C.VENUE_KINDS dresses, every crowd level and C.MOMENTS
// entry runs (API and bus), band actions, stick hits for every lane/judgement, draw calls < 80, resize, leak check
// garage -> stage -> van -> garage (GPU geometry count returns to baseline), no console errors.
// Van: every season day/night builds with the right weather, Kenji drives, progress/skyline, moose, talk,
// season from state.week, draw calls < 50. Screenshots: tests/.cache/stage.png (bottom third covered by a dark
// rectangle = the note highway) and tests/.cache/van.png.
const path = require('path');
const { open, checker } = require('./_pw');

const ONLY = process.env.META_ONLY || 'stage,van';
if (!/stage|van/.test(ONLY)) { console.log('SKIP pw_stage (META_ONLY=' + ONLY + ')'); process.exit(0); }
const DO_STAGE = /stage/.test(ONLY), DO_VAN = /van/.test(ONLY);
const SHOT_STAGE = path.join(__dirname, '.cache', 'stage.png'), SHOT_VAN = path.join(__dirname, '.cache', 'van.png');

const dbg = page => page.evaluate(() => GG.debug('render'));
// The gig/van screens bring their own UI: hide the garage HUD + screens while capturing the scene.
const bareUi = (page, on) => page.evaluate(on => { ['hud', 'screens', 'toast'].forEach(id => { const e = document.getElementById(id); if (e) e.style.visibility = on ? 'hidden' : ''; }); }, on);
const mem = page => page.evaluate(() => { const i = GG.render.util.ctx().renderer.info; return { geos: i.memory.geometries, texs: i.memory.textures }; });
async function advance(page, n) {
  const f0 = (await dbg(page)).frames;
  await page.waitForFunction(x => GG.debug('render').frames >= x, f0 + (n || 3), { timeout: 30000 });
}

(async () => {
  const c = checker('stage'), notes = [];
  const { page, errors, close } = await open();
  try {
    await page.waitForFunction(() => window.GG && GG.render && GG.render.init && GG.main && GG.contracts, null, { timeout: 15000 });
    const boot = await page.evaluate(() => {
      const st = GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, name: 'Sam' });
      if (!GG.render.available) GG.render.init(document.getElementById('scene'));
      GG.render.setScene('garage'); GG.render.syncState(st);
      return { available: GG.render.available, scenes: GG.render.sceneNames(), stageApi: !!GG.render.stage, vanApi: !!GG.render.van };
    });
    c.ok(boot.available, 'render available');
    c.ok(boot.scenes.includes('stage') && boot.scenes.includes('van'), 'stage + van scenes registered');
    c.ok(boot.stageApi && boot.vanApi, 'GG.render.stage / GG.render.van APIs exist');
    await advance(page, 4);
    const base = await mem(page);
    const C = await page.evaluate(() => ({ kinds: GG.contracts.VENUE_KINDS, moments: GG.contracts.MOMENTS, levels: GG.contracts.CROWD_LEVELS, lanes: GG.contracts.LANES, judgements: GG.contracts.JUDGEMENTS }));

    if (DO_STAGE) {
      // Calls before the scene exists are safe (and setup is remembered).
      const early = await page.evaluate(() => {
        const r = [GG.render.stage.moment('mosh'), GG.render.stage.bandAction(null, 'solo')];
        GG.render.stage.hit('snare', 'perfect'); GG.render.stage.setCrowdLevel(55);
        GG.render.stage.setup({ venue: { venueId: 'legion_63', name: 'Legion Branch 63', city: 'Saskatoon', tier: 1, kind: 'legion', capacity: 120 },
          crowd: 64, members: GG.state.members, flags: { cape: 'velvet' }, genre: 'metal' });
        return r;
      });
      c.ok(early[0] === false && early[1] === false, 'moment/bandAction before the scene exists return false');
      await page.evaluate(() => GG.render.setScene('stage'));
      await advance(page, 4);
      let info = await page.evaluate(() => GG.render.stage.info());
      c.ok(info.built && info.kind === 'legion', 'setup before setScene is applied on enter (legion)');
      c.ok(info.people === 64, 'crowd count from setup (64): ' + info.people);
      c.ok(info.band.length === 4 && info.band.includes('marcel:vocals:mic') && info.band.includes('kenji:bass:bass'), 'band on stage by role: ' + info.band.join(' '));
      c.ok(info.cape === true, "Marcel's cape shows when flags.cape = 'velvet'");
      const f0 = (await dbg(page)).frames; await advance(page, 5);
      c.ok((await dbg(page)).frames > f0, 'frames advance on the stage');
      c.ok((await dbg(page)).scene === 'stage', 'debug reports scene stage');

      // Every venue kind (plus v0.1 kinds that predate C.VENUE_KINDS).
      const kindRes = [];
      for (const k of C.kinds.concat(['hall', 'outdoor', 'lounge'])) {
        await page.evaluate(k => GG.render.stage.setup({ venue: { kind: k, name: 'Test ' + k }, crowd: 150, genre: 'metal', flags: { cape: 'curtain' } }), k);
        await advance(page, 2);
        const r = await page.evaluate(() => ({ info: GG.render.stage.info(), draw: GG.debug('render').drawCalls }));
        kindRes.push([k, r.info.kind, r.draw, r.info.people]);
      }
      c.ok(kindRes.every(r => C.kinds.includes(r[1])), 'every venue kind dresses (old kinds map to valid ones): ' + kindRes.map(r => r[0] + '>' + r[1]).join(' '));
      c.ok(C.kinds.every((k, i) => kindRes[i][1] === k), 'each C.VENUE_KINDS entry builds as itself');
      const maxDraw = Math.max.apply(null, kindRes.map(r => r[2]));
      notes.push('stage draw max ' + maxDraw);
      c.ok(maxDraw > 10 && maxDraw < 80, 'stage draw calls < 80 across venues (max ' + maxDraw + ')');
      c.ok(kindRes.every(r => r[3] > 0 && r[3] <= 150), 'crowd capped at 150');

      // House party: twelve people and a dog.
      await page.evaluate(() => GG.render.stage.setup({ venue: { venueId: 'buddys_house_party', kind: 'house', name: "Buddy's House Party" }, crowd: 12, genre: 'metal' }));
      await advance(page, 2);
      info = await page.evaluate(() => GG.render.stage.info());
      c.ok(info.dog === true && info.people === 12, 'house party: 12 people and a dog');
      await page.evaluate(() => GG.render.stage.moment('mosh'));
      await advance(page, 3);

      // Worst case for the budget: club, 150 people, lighters + cups + boos + a formation + hits.
      await page.evaluate(() => {
        GG.render.stage.setup({ venue: { kind: 'club', name: 'The Big Club' }, crowd: 150, genre: 'metal', flags: { cape: 'charred' } });
        GG.render.stage.setCrowdLevel(95, true);
        ['wallOfDeath', 'lighters', 'drinks'].forEach(k => GG.render.stage.moment(k));
        GG.render.stage.bandAction(null, 'solo');
        ['kick', 'snare', 'hat', 'cymbal', 'toms', 'ride'].forEach(l => GG.render.stage.hit(l, 'perfect'));
      });
      await advance(page, 3);
      let d = await dbg(page);
      notes.push('stage worst ' + d.drawCalls + ' calls/' + d.triangles + ' tris');
      c.ok(d.drawCalls > 10 && d.drawCalls < 80, 'worst-case stage draw calls < 80 (' + d.drawCalls + ', ' + d.triangles + ' tris)');

      // Crowd levels (API with snap, and the bus).
      const lv = [];
      for (const v of [5, 30, 50, 70, 95]) {
        await page.evaluate(v => GG.render.stage.setCrowdLevel(v, true), v);
        await advance(page, 2);
        lv.push((await page.evaluate(() => GG.render.stage.info())).level);
      }
      c.ok(lv.join() === C.levels.join(), 'every crowd level runs: ' + lv.join(' '));
      await page.evaluate(() => GG.emit('crowd:level', { level: 'hostile', crowd: 8 }));
      await page.waitForFunction(() => GG.render.stage.info().crowd < 40, null, { timeout: 30000 });
      c.ok(true, "'crowd:level' on the bus moves the crowd meter");
      await page.evaluate(() => GG.render.stage.setCrowdLevel(60, true));

      // Every moment (API), with the expected reaction.
      const mres = [];
      for (const k of C.moments) {
        const r = await page.evaluate(k => ({ ok: GG.render.stage.moment(k), info: GG.render.stage.info() }), k);
        mres.push([k, r.ok, r.info]);
        await advance(page, 2);
      }
      c.ok(mres.every(m => m[1] === true), 'every C.MOMENTS entry is accepted: ' + mres.filter(m => !m[1]).map(m => m[0]).join(',') );
      const byK = {}; mres.forEach(m => { byK[m[0]] = m[2]; });
      c.ok(byK.mosh.formation === 'mosh' && byK.circlePit.formation === 'circlePit' && byK.wallOfDeath.formation === 'wallOfDeath' && byK.lineDance.formation === 'lineDance', 'formations start (mosh, circle pit, wall of death, line dance)');
      c.ok(byK.lighters.arms === 'lighters' && byK.boo.arms === 'boo' && byK.boo.boos > 0, 'lighters and boos (with BOO! bubbles)');
      c.ok(byK.drinks.cupsFlying > 0, 'drinks fly');
      c.ok(byK.capeSpin.acting.some(a => /capeSpin/.test(a)) && byK.solo.acting.some(a => /:solo/.test(a)), 'cape spin and solo hand off to band actions');
      c.ok((await page.evaluate(() => GG.render.stage.moment('notAThing'))) === false, 'unknown moment returns false');
      // The bus
      await page.evaluate(() => GG.emit('crowd:moment', { kind: 'circlePit' }));
      c.ok((await page.evaluate(() => GG.render.stage.info().formation)) === 'circlePit', "'crowd:moment' on the bus triggers the moment");

      // Band actions.
      const acts = await page.evaluate(() => {
        const s = GG.render.stage, r = [];
        ['capeSpin', 'solo', 'fill', 'miss'].forEach(a => { r.push(s.bandAction(null, a)); });
        r.push(s.bandAction('jaxon', 'fill'), s.bandAction('kenji', 'miss'), s.bandAction('marcel', 'capeSpin'), s.bandAction('dana', 'bogus'));
        return { r, acting: s.info().acting };
      });
      c.ok(acts.r.slice(0, 7).every(Boolean) && acts.r[7] === false, 'band actions capeSpin/solo/fill/miss (default + by id); unknown returns false');
      c.ok(acts.acting.includes('jaxon:fill') && acts.acting.includes('kenji:miss'), 'actions land on the right member: ' + acts.acting.join(' '));

      // Hits: every lane x judgement (API) + the bus (index lanes too).
      const hits = await page.evaluate(({ lanes, js }) => {
        const s = GG.render.stage, h0 = s.info().hits;
        lanes.forEach(l => js.forEach(j => s.hit(l, j)));
        const h1 = s.info().hits;
        GG.emit('gig:judge', { lane: 'hat', judgement: 'perfect', combo: 12, crowd: 88 });
        GG.emit('gig:judge', { lane: 1, judgement: 'good', combo: 13, crowd: 88 });
        return { api: h1 - h0, bus: s.info().hits - h1 };
      }, { lanes: C.lanes, js: C.judgements });
      c.ok(hits.api === C.lanes.length * C.judgements.length, 'hit() for every lane x judgement (' + hits.api + ')');
      c.ok(hits.bus === 2, "'gig:judge' on the bus hits the kit (lane name or index)");
      await page.waitForFunction(() => GG.render.stage.info().crowd > 70, null, { timeout: 30000 });
      c.ok(true, "'gig:judge' crowd value drives the meter");
      await page.evaluate(() => { for (let i = 0; i < 6; i++) GG.emit('audio:step', { section: 'verse', entry: 0, bar: 0, step: i * 4, time: 0 }); });
      const bl = (await page.evaluate(() => GG.render.stage.info())).beatLen;
      c.ok(bl > 0.2 && bl < 1.3, "'audio:step' beats keep a sane beat length (" + bl + ')');

      // Frame / resize.
      await page.evaluate(() => GG.render.stage.setFrame({ top: 60, bottom: 280 }));
      await page.setViewportSize({ width: 844, height: 390 }); await advance(page, 3);
      await page.setViewportSize({ width: 390, height: 844 }); await advance(page, 3);
      await page.evaluate(() => GG.render.stage.setFrame({ top: 0, bottom: -1 }));
      c.ok((await dbg(page)).scene === 'stage', 'survives setFrame + landscape/portrait resize');

      // Screenshot: The Gopher Hole, hyped metal crowd, bottom third covered like the note highway.
      await page.evaluate(() => {
        GG.render.stage.setup({ venue: { venueId: 'gopher_hole', kind: 'bar', name: 'The Gopher Hole', capacity: 180 }, crowd: 110, members: GG.state.members, flags: { cape: 'velvet' }, genre: 'metal' });
        GG.render.stage.setCrowdLevel(78, true);
        let i = 0; window.__hits = setInterval(() => GG.render.stage.hit(['snare', 'hat', 'kick', 'hat', 'cymbal', 'hat'][i++ % 6], i % 4 ? 'perfect' : 'good'), 110);
      });
      await advance(page, 8);
      await page.evaluate(() => {
        const d = document.createElement('div'); d.id = '__hw';
        d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:33.34%;background:rgba(9,9,16,0.94);z-index:2147483647;border-top:2px solid #3a3a55';
        document.body.appendChild(d);
      });
      await bareUi(page, true); await page.screenshot({ path: SHOT_STAGE }); await bareUi(page, false);
      await page.evaluate(() => { clearInterval(window.__hits); const d = document.getElementById('__hw'); if (d) d.remove(); });
    }

    if (DO_VAN) {
      await page.evaluate(() => GG.render.setScene('van'));
      const trip = await page.evaluate(() => {
        const ok = GG.render.van.setTrip({ from: 'Saskatoon', to: 'Regina', km: 240, season: 'winter', night: true });
        return { ok, info: GG.render.van.info() };
      });
      c.ok(trip.ok && trip.info.built, 'van builds with setTrip');
      c.ok(trip.info.season === 'winter' && trip.info.night === true && trip.info.weather === 'snow', 'winter night: snow');
      c.ok(trip.info.driver === 'kenji' && trip.info.people[0] === 'kenji:driver', 'Kenji drives: ' + trip.info.people.join(' '));
      const t0 = trip.info.traveled; await advance(page, 5);
      c.ok((await page.evaluate(() => GG.render.van.info().traveled)) > t0, 'the prairie scrolls (distance traveled grows)');
      const vres = [];
      for (const season of ['summer', 'fall', 'winter', 'spring']) for (const night of [false, true]) {
        await page.evaluate(o => GG.render.van.setTrip({ from: 'Moose Jaw', to: 'Swift Current', km: 175, season: o.season, night: o.night }), { season, night });
        await advance(page, 2);
        const r = await page.evaluate(() => ({ info: GG.render.van.info(), draw: GG.debug('render').drawCalls }));
        vres.push([season, night, r.info.weather, r.draw]);
      }
      const W = { summer: 'bugs', fall: 'leaves', winter: 'snow', spring: 'rain' };
      c.ok(vres.every(v => v[2] === W[v[0]]), 'weather per season: ' + vres.map(v => v[0] + (v[1] ? '/night' : '') + '=' + v[2]).join(' '));
      const vmax = Math.max.apply(null, vres.map(v => v[3]));
      notes.push('van draw max ' + vmax);
      c.ok(vmax > 10 && vmax < 50, 'van draw calls < 50 (max ' + vmax + ')');
      // Season from state.week; Kenji drives whatever the member order.
      const auto = await page.evaluate(() => {
        GG.state.week = 12; GG.render.syncState(GG.state);
        GG.render.van.setTrip({ to: 'Yorkton', km: 330, members: GG.state.members.slice().reverse() });
        return GG.render.van.info();
      });
      c.ok(auto.season === 'winter' && auto.to === 'Yorkton', 'season from state.week (12 -> winter)');
      c.ok(auto.driver === 'kenji', 'Kenji drives even when listed last');
      await page.evaluate(() => GG.render.van.setProgress(0.2)); await advance(page, 2);
      const skyA = await page.evaluate(() => GG.render.van.info().skyline);
      await page.evaluate(() => GG.render.van.setProgress(0.95));
      await page.waitForFunction(() => GG.render.van.info().skyline === true, null, { timeout: 30000 }).catch(() => {});
      const prog = await page.evaluate(a => {
        const v = GG.render.van;
        return { a, b: v.info().skyline, moose: v.moose(), moose2: v.moose(), crossing: v.info().crossing, talkM: v.talk('marcel', 2), talkK: v.talk('kenji', 2), talkD: v.talk('dana', 1) };
      }, skyA);
      c.ok(prog.a === false && prog.b === true, 'the skyline rises near the end of the trip');
      c.ok(prog.moose === true && prog.moose2 === false && prog.crossing, 'moose() sends one moose across the road');
      c.ok(prog.talkM && prog.talkD && prog.talkK === false, 'talk() animates bandmates; Kenji never talks');
      await advance(page, 4);
      await page.setViewportSize({ width: 844, height: 390 }); await advance(page, 2);
      await page.setViewportSize({ width: 390, height: 844 }); await advance(page, 2);
      c.ok((await dbg(page)).scene === 'van', 'van survives resize');
      // Screenshot: summer afternoon out of Saskatoon.
      await page.evaluate(() => { GG.render.van.setTrip({ from: 'Saskatoon', to: 'Regina', km: 240, season: 'summer', night: false }); GG.render.van.setProgress(0.35); });
      await advance(page, 8);
      await bareUi(page, true); await page.screenshot({ path: SHOT_VAN }); await bareUi(page, false);
    }

    // Leak check: garage -> stage -> van -> garage, three times; GPU geometry count returns to the baseline.
    const cyc = [];
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => { GG.render.setScene('stage'); GG.render.stage.setup({ venue: 'bar', crowd: 90 }); });
      await advance(page, 2);
      const inStage = await mem(page);
      await page.evaluate(() => { GG.render.setScene('van'); GG.render.van.setTrip({ season: 'fall' }); });
      await advance(page, 2);
      const inVan = await mem(page);
      await page.evaluate(() => GG.render.setScene('garage'));
      await advance(page, 3);
      cyc.push({ inStage, inVan, back: await mem(page) });
    }
    const last = cyc[cyc.length - 1].back;
    notes.push('geos garage ' + base.geos + ' stage ' + cyc[0].inStage.geos + ' van ' + cyc[0].inVan.geos + ' back ' + cyc.map(x => x.back.geos).join('/') + '; texs ' + base.texs + ' back ' + cyc.map(x => x.back.texs).join('/'));
    c.ok(cyc[0].inStage.geos > base.geos && cyc[0].inVan.geos > base.geos, 'stage/van upload their own geometry (' + base.geos + ' -> ' + cyc[0].inStage.geos + ' / ' + cyc[0].inVan.geos + ')');
    c.ok(last.geos <= base.geos + 2, 'geometry count returns to the garage baseline (' + base.geos + ' -> ' + cyc.map(x => x.back.geos).join(',') + ')');
    c.ok(last.texs <= base.texs + 4 && cyc[2].back.texs === cyc[0].back.texs, 'textures back near baseline, no growth (' + base.texs + ' -> ' + cyc.map(x => x.back.texs).join(',') + ')');
    const g = await page.evaluate(() => ({ scene: GG.debug('render').scene, stage: GG.render.stage.info().built, van: GG.render.van.info().built, cam: GG.render.util.ctx().camera.far }));
    c.ok(g.scene === 'garage' && !g.stage && !g.van && g.cam === 120, 'back in the garage: stage/van torn down, camera restored');

    c.ok(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } catch (e) {
    c.ok(false, 'exception: ' + (e && e.stack || e));
  }
  await close();
  if (notes.length) console.log('INFO ' + notes.join(' | '));
  c.done();
})();
