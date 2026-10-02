// pw_stage.js: the v0.3 gig stage + van scenes in real Chromium at phone portrait (390x844).
// Run: node build.js && timeout 500 node tests/pw_stage.js   (META_ONLY=stage | van | stage,van)
// Stage: builds with fixture data, frames advance, every C.VENUE_KINDS dresses, every crowd level and C.MOMENTS
// entry runs (API and bus), band actions, stick hits for every lane/judgement, draw calls < 80, resize, leak check
// garage -> stage -> van -> garage (GPU geometry count returns to baseline), no console errors.
// Van: every season day/night builds with the right weather, Kenji drives, progress/skyline, moose, talk,
// season from state.week, draw calls < 50. Screenshots: tests/.cache/stage.png (bottom third covered by a dark
// rectangle = the note highway) and tests/.cache/van.png.
// v1.1 "Seats" (Lane C): META_ONLY=seat (also in the default run): every band x string seat (12): the spot camera (low, behind
// your shoulder at your spot, facing the crowd), you with your instrument (the gear string, the logo sticker) on screen, the
// swapped drummer on the throne (info().drummer = GG.career.drummerId), a boom mic for Rox / Chase / Travis Lee (info().mics +
// boom) and nobody else, draw calls <= the Hail Damage drum stage x 1.15 (and the band's own), 'str' hits strum + slide the hand
// (API + the 'gig:judge' bus), 'gig:hold' ring, the drummer plays along ('audio:step' + their own clock), the lead seat's solo is
// yours, a drum fill by the swapped drummer, a rival set keeps the kit camera, and no per-frame allocation (sampled heap
// allocations per rendered frame on a seat stage <= the drum stage's, none in the seat code). Screenshot
// tests/.cache/stage_seat<TAG>.png (Hail Damage, bass, the highway third covered).
const path = require('path');
const { open, checker, shotName } = require('./_pw');

const ONLY = process.env.META_ONLY || 'stage,van,seat';
if (!/stage|van|seat/.test(ONLY)) { console.log('SKIP pw_stage (META_ONLY=' + ONLY + ')'); process.exit(0); }
const DO_STAGE = /stage/.test(ONLY), DO_VAN = /van/.test(ONLY), DO_SEAT = /seat/.test(ONLY);
const SHOT_STAGE = path.join(__dirname, '.cache', 'stage.png'), SHOT_VAN = path.join(__dirname, '.cache', 'van.png');

const dbg = page => page.evaluate(() => GG.debug('render'));
// The gig/van screens bring their own UI: hide the garage HUD + screens while capturing the scene.
const bareUi = (page, on) => page.evaluate(on => { ['hud', 'screens', 'toast'].forEach(id => { const e = document.getElementById(id); if (e) e.style.visibility = on ? 'hidden' : ''; }); }, on);
const mem = page => page.evaluate(() => { const i = GG.render.util.ctx().renderer.info; return { geos: i.memory.geometries, texs: i.memory.textures }; });
async function advance(page, n) {
  const f0 = (await dbg(page)).frames;
  await page.waitForFunction(x => GG.debug('render').frames >= x, f0 + (n || 3), { timeout: 30000 });
}

// ---- v1.1 seat ----------------------------------------------------------------------------------------------------------
const SEAT_FNS = /^(update|updateBand|youPose|updateDrummer|handPose|autoDrum|stepTick|kitHit|strumHit|updateKit|updateLights|updateCrowd|updateProps|frame|camView|hit)$/;
// Sampled heap allocations (collected objects included) over n rendered frames: { perFrame, seatCode } bytes.
async function allocs(page, cdp, n) {
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.collectGarbage');
  await cdp.send('HeapProfiler.startSampling', { samplingInterval: 256, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
  const f0 = await page.evaluate(() => GG.debug('render').frames);
  await page.waitForFunction(x => GG.debug('render').frames >= x, f0 + n, { timeout: 60000 });
  const f1 = await page.evaluate(() => GG.debug('render').frames);
  const { profile } = await cdp.send('HeapProfiler.stopSampling');
  let total = 0, mine = 0;
  const walk = (node, inStage) => {
    const fn = node.callFrame.functionName || '', hit = inStage || (SEAT_FNS.test(fn) && /game\.html/.test(node.callFrame.url));
    total += node.selfSize; if (hit && /^(youPose|autoDrum|stepTick|strumHit|kitHit|camView)$/.test(fn)) mine += node.selfSize;
    (node.children || []).forEach(ch => walk(ch, hit));
  };
  walk(profile.head, false);
  return { perFrame: Math.round(total / Math.max(1, f1 - f0)), seatCode: mine, frames: f1 - f0 };
}
async function seatSection(page, c, notes) {
  const BANDS = ['hail_damage', 'frost_heave', 'gravel_kings', 'grid_road_ramblers'], SEATS = ['drums', 'bass', 'rhythm', 'lead'];
  const SINGS = { frost_heave: 'rox', gravel_kings: 'chase', grid_road_ramblers: 'travis' };   // the singing drummers (rhythm seat)
  const VENUE = { venueId: 'gopher_hole', kind: 'bar', name: 'The Gopher Hole', capacity: 180 };
  const base = {}, rows = [];
  const err0 = (await page.evaluate(() => 0));
  for (const band of BANDS) for (const seat of SEATS) {
    const r = await page.evaluate(([band, seat, venue]) => {
      const st = GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, name: 'Sam', bandId: band, seat });
      for (let i = 0; i < 4; i++) { try { GG.ui.close(); } catch (e) {} }
      st.player.gearLook = { shape: null, color: '#d9a520', guard: 'black', sticker: 'logo' };
      GG.render.setPaused(false); GG.render.syncState(st); GG.render.setScene('stage');
      GG.render.stage.setup({ venue, crowd: 120, members: st.members, flags: st.flags, genre: st.genre, player: st.player, seat: st.seat });
      GG.render.stage.setCrowdLevel(70, true);
      return { drummer: GG.career.drummerId(st), lineup: GG.career.lineup(st) };
    }, [band, seat, VENUE]);
    await advance(page, 4);
    const q = await page.evaluate(() => {
      const i = GG.render.stage.info(), d = GG.debug('render'), cam = GG.render.util.ctx().camera, f = { x: 0, y: 0, z: -1 };
      const e = cam.matrixWorld.elements, fw = { x: -e[8], y: -e[9], z: -e[10] };
      const head = i.you ? GG.render.worldToScreen(i.you.x, 1.5 + (i.you ? 0 : 0), i.you.z) : null;
      return { i, calls: d.drawCalls, cam: { x: cam.position.x, y: cam.position.y, z: cam.position.z, fw }, head, H: innerHeight, W: innerWidth };
    });
    const i = q.i, tag = band + ' ' + seat;
    if (seat === 'drums') {
      base[band] = q.calls;
      c.ok(i.view === 'drummer' && i.camera === 'kit' && i.drummer === 'player' && !i.you && !i.boom && i.seat === 'drums', tag + ': the v0.3 kit camera, you on the throne');
      continue;
    }
    const hd = base.hail_damage, ratio = q.calls / hd;
    rows.push(band + '/' + seat + ' ' + q.calls + ' (HD drums ' + hd + ', own ' + base[band] + ')');
    c.ok(i.seat === seat && i.view === 'spot' && i.camera === 'spot' && i.seatMode, tag + ': the spot camera ' + JSON.stringify({ view: i.view, camera: i.camera }));
    c.ok(i.drummer === r.drummer && !!r.drummer, tag + ': ' + r.drummer + ' on the throne (info ' + i.drummer + ')');
    const sings = SINGS[band] && seat === 'rhythm' ? SINGS[band] : null;
    c.ok(sings ? i.boom && i.mics.includes(sings) : !i.boom && !i.mics.includes(r.drummer), tag + ': ' + (sings ? 'a boom mic for ' + sings : 'no boom mic') + ' ' + JSON.stringify(i.mics));
    c.ok(i.you && i.you.gear.indexOf('seat|' + seat + '|') === 0 && /#d9a520\|black$/.test(i.you.gear) && i.you.sticker && i.band.some(b => b.indexOf('player:' + seat + ':') === 0), tag + ': you with your instrument + sticker ' + (i.you && i.you.gear));
    const side = { bass: -1, rhythm: 1, lead: -1 }[seat];
    c.ok(Math.sign(i.you.x) === side && Math.abs(q.cam.x - i.you.x) < 0.7 && q.cam.z > i.you.z + 1 && q.cam.y < 4.3 && q.cam.fw.z < -0.6, tag + ': camera behind your spot (' + (side < 0 ? 'stage-left' : 'stage-right') + '), facing the crowd ' + JSON.stringify({ you: [i.you.x, i.you.z], cam: q.cam }));
    c.ok(q.head && q.head.x > -40 && q.head.x < q.W + 40 && q.head.y > 0 && q.head.y < q.H * 0.72, tag + ': you are in frame above the highway ' + JSON.stringify(q.head));
    c.ok(ratio <= 1.15 && q.calls <= base[band] * 1.15, tag + ': draw calls ' + q.calls + ' <= HD drum stage ' + hd + ' x 1.15');
    if (band === 'hail_damage' || band === 'grid_road_ramblers') {
      const h = await page.evaluate(() => {
        const s = GG.render.stage, a = s.info();
        s.hit('str2', 'perfect'); s.hit('str2', 'good'); s.hit('str4', 'perfect');
        const b = s.info();
        GG.emit('gig:judge', { lane: 'str1', judgement: 'perfect', combo: 3, crowd: 80 });
        GG.emit('gig:hold', { lane: 'str1', held: 1, ring: true });
        const c2 = s.info();
        s.hit('str3', 'miss');
        return { a: a.you.strums, b: b.you.strums, fret: b.you.fret, c: c2.you.strums, ring: c2.you.ring, miss: s.info().you.act, hits: c2.hits - a.hits };
      });
      c.ok(h.b - h.a === 3 && h.c - h.b === 1 && h.hits === 4 && h.ring && h.miss === 'miss', tag + ": 'str' hits strum (API + 'gig:judge'), 'gig:hold' rings, a miss flinches " + JSON.stringify(h));
      await advance(page, 6);
      const fret = await page.evaluate(() => GG.render.stage.info().you.fret);
      c.ok(fret >= 1 && fret <= 2, tag + ': the fretting hand slides to the lane (' + fret + ')');
      const a0 = await page.evaluate(() => GG.render.stage.info().autoHits);
      await advance(page, 30);
      const a1 = await page.evaluate(() => { const x = GG.render.stage.info().autoHits; for (let k = 0; k < 16; k++) GG.emit('audio:step', { section: 'verse', entry: 0, bar: 0, step: k, time: 0 }); return { x, y: GG.render.stage.info().autoHits }; });
      c.ok(a1.x > a0 && a1.y - a1.x >= 10, tag + ': the drummer keeps time on their own clock (' + a0 + ' -> ' + a1.x + ') and plays the band grid (+' + (a1.y - a1.x) + ' on 16 steps)');
      const acts = await page.evaluate(([seat, dr]) => { const s = GG.render.stage; return { solo: s.bandAction(seat === 'lead' ? 'player' : null, 'solo'), fill: s.bandAction(dr, 'fill'), acting: s.info().acting }; }, [seat, r.drummer]);   // (55 sends gig:band { who: 'player', action: 'solo' } on the lead seat)
      c.ok(acts.solo && acts.fill && (seat === 'lead' ? acts.acting.includes('player:solo') : !acts.acting.includes('player:solo')), tag + ': the solo is ' + (seat === 'lead' ? 'yours' : 'the band\'s') + ', the drummer fills ' + acts.acting.join(','));
    }
    if (band === 'hail_damage' && seat === 'bass') {
      await page.evaluate(() => {
        const d = document.createElement('div'); d.id = '__hw';
        d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:33.34%;background:rgba(9,9,16,0.94);z-index:2147483647;border-top:2px solid #3a3a55';
        document.body.appendChild(d);
      });
      await advance(page, 4);
      await bareUi(page, true); await page.screenshot({ path: path.join(__dirname, '.cache', shotName('stage_seat.png')) }); await bareUi(page, false);
      await page.evaluate(() => { const d = document.getElementById('__hw'); if (d) d.remove(); });
    }
  }
  notes.push('seat stage calls: ' + rows.join(' | '));
  // A rival set (their lineup, their drummer) keeps the v0.3 camera on a string-seat career; spectator stays spectator.
  const rv = await page.evaluate(() => {
    const s = GG.render.stage;
    s.setup({ venue: { kind: 'club', name: 'Showdown' }, crowd: 90, genre: 'metal', rival: true, members: [{ id: 'tw1', role: 'vocals' }, { id: 'tw2', role: 'guitar' }], seat: 'bass' });
    const a = s.info();
    s.setup({ venue: { kind: 'club', name: 'Showdown' }, crowd: 90, genre: 'metal', members: GG.state.members, player: GG.state.player, seat: 'bass', view: 'spectator' });
    return { a, b: s.info() };
  });
  await advance(page, 2);
  c.ok(rv.a.view === 'drummer' && !rv.a.you && rv.a.drummer !== 'player' && rv.b.view === 'spectator' && rv.b.camera === 'spectator' && !!rv.b.you, 'a rival set keeps the kit camera; spectator view keeps its camera (your band still by seat) ' + JSON.stringify([rv.a.view, rv.a.drummer, rv.b.view]));
  // The gig screen's own setup (55 stageData: drama.lineup members, no seat / lineup keys): the seat comes from the state; the
  // swapped drummer quit and a drama fill-in ('fill_drums') covers the kit.
  const fi = await page.evaluate(venue => {
    const st = GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, name: 'Sam', bandId: 'frost_heave', seat: 'rhythm' });
    for (let i = 0; i < 4; i++) { try { GG.ui.close(); } catch (e) {} }
    const data = () => ({ venue, crowd: 120, capacity: 180, genre: st.genre, flags: st.flags, player: st.player,
      members: GG.drama.lineup(st).map(m => ({ id: m.id, name: m.name, role: m.role, mood: m.mood, look: m.look || null })) });
    GG.render.setPaused(false); GG.render.syncState(st); GG.render.setScene('stage');
    GG.render.stage.setup(data());
    const a = GG.render.stage.info(), sw = GG.career.drummerId(st);
    st.members.find(x => x.id === sw).status = 'quit';
    GG.drama.hireFillIn(st, 'drums');
    GG.render.syncState(st); GG.render.stage.setup(data());
    const b = GG.render.stage.info();
    return { sw, a: [a.seat, a.view, a.drummer, a.boom], b: [b.seat, b.view, b.drummer, b.boom], band: b.band };
  }, VENUE);
  await advance(page, 2);
  c.ok(fi.a.join() === 'rhythm,spot,' + fi.sw + ',true' && fi.b[0] === 'rhythm' && fi.b[2] === 'fill_drums' && !fi.b[3] && !fi.band.some(x => x.indexOf(fi.sw + ':') === 0),
    'the gig screen setup (no seat key) reads the seat from the state; ' + fi.sw + ' quit -> the fill-in drummer on the riser, no boom mic ' + JSON.stringify([fi.a, fi.b]));
  // Per-frame allocations: the drum stage vs a seat stage, same venue + crowd, no test calls inside the window.
  const cdp = await page.context().newCDPSession(page);
  const measure = async seat => {
    await page.evaluate(([seat, venue]) => {
      const st = GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, name: 'Sam', bandId: 'hail_damage', seat });
      for (let i = 0; i < 4; i++) { try { GG.ui.close(); } catch (e) {} }
      GG.render.setPaused(false); GG.render.syncState(st); GG.render.setScene('stage');
      GG.render.stage.setup({ venue, crowd: 120, members: st.members, flags: st.flags, genre: st.genre, player: st.player, seat: st.seat });
      GG.render.stage.setCrowdLevel(70, true);
    }, [seat, VENUE]);
    await advance(page, 10);
    return allocs(page, cdp, 90);
  };
  const ad = await measure('drums'), as = await measure('bass'), ar = await measure('rhythm');
  notes.push('allocs/frame drums ' + ad.perFrame + ' B, bass ' + as.perFrame + ' B (seat code ' + as.seatCode + ' B), rhythm ' + ar.perFrame + ' B (seat code ' + ar.seatCode + ' B)');
  // (V8 boxes double temporaries while a once-per-frame function is still interpreted: ~16 B each, never an object; the drum
  // code shows the same: handPose ~600 B per frame. An array, object or closure per frame in the seat code would blow this.)
  const pf = x => Math.round(x.seatCode / Math.max(1, x.frames));
  c.ok(pf(as) <= 640 && pf(ar) <= 640, 'no objects allocated per frame in the seat code (youPose, autoDrum, kitHit, strumHit, camView): ' + pf(as) + ' / ' + pf(ar) + ' B per frame (boxed doubles only)');
  c.ok(as.perFrame <= ad.perFrame * 1.25 + 512 && ar.perFrame <= ad.perFrame * 1.25 + 512, 'per-frame allocations on a seat stage stay at the drum stage\'s (' + ad.perFrame + ' B -> ' + as.perFrame + ' / ' + ar.perFrame + ' B)');
  await cdp.detach().catch(() => {});
  return err0;
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

    if (DO_SEAT) await seatSection(page, c, notes);

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
