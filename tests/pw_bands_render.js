// pw_bands_render.js (v0.9 "Genres", lane C): every band's render in real Chromium at phone portrait (390x844).
// Run: node build.js && META_ONLY=bands_render timeout 500 node tests/pw_bands_render.js
//   (META_ONLY=garage | stage | van | carpet | rival | recap narrows it; 'bands_render' or unset = all.)
// Per band (Hail Damage, Frost Heave, Gravel Kings, the Grid Road Ramblers):
//   garage: space.kind = C.SPACE_KINDS[band.space], the door label, all 7 hotspots on screen + labelled, members on distinct
//     spots holding their member.gear (no V on the fiddle or the acoustic), draw calls <= Hail Damage x 1.15, 4 seasons of
//     decor (the tier-0 rooms dress their exterior per season), the room's seat props are the band's;
//   stage: the lineup strings (travis:vocals:acoustic + a mic stand, clementine's fiddle, rox:vocals:guitar + a mic stand, a
//     symmetric 3-player layout), the §4.4 moments + signatures run;
//   van: the band's driver + dashboard item, Earl keeps his glasses (Kenji alone wears shades), the mirror matches the driver,
//     a talking driver animates (Kenji never talks), the tier-0 ornaments are the band's;
//   carpet: the rival's count from the cast, corpse paint only for Tundra Wraith (Buckle & Boot bring the truck mascot);
//   rival: a spectator stage per rival: the rival's logo on the banner, corpse paint only for Tundra Wraith, the Buckle & Boot
//     session drummer (never you on their throne), the Mall Rats' kickflip;
//   recap: the year-end photo in each band's room is not blank; GG.render.garage.photoRig(kind) per room.
// No console errors. Contact sheet: tests/.cache/v09_render_sheet.png (look at it).
// v1.1 "Seats" (Lane C): META_ONLY=seats (opt-in, not in the default run): every band x seat: the stage from your camera (the
//   highway third cut off), the riser seen from the front (the swapped drummer + the boom mic for the singing drummers), the
//   garage (the drummer at the kit, you at your rig); per tile the draw calls (stage <= the band's drum stage x 1.15, garage
//   <= the band's drum garage x 1.15). Contact sheet tests/.cache/v11_seat_sheet<TAG>.png (look at it).
// Until content lane A merges, the three new rivals have no cast: a small fixture cast is injected (only when missing).
const path = require('path'), fs = require('fs');
const { open, checker, shotName } = require('./_pw');

const ONLY = process.env.META_ONLY || 'bands_render';
const ALL = /bands_render/.test(ONLY);
const DO = k => ALL || new RegExp('\\b' + k + '\\b').test(ONLY);
const DO_SEATS = /\bseats\b/.test(ONLY);   // v1.1 (opt-in)
if (!['garage', 'stage', 'van', 'carpet', 'rival', 'recap'].some(DO) && !DO_SEATS) { console.log('SKIP pw_bands_render (META_ONLY=' + ONLY + ')'); process.exit(0); }
const SHEET = path.join(__dirname, '.cache', 'v09_render_sheet.png');
const BANDS = ['hail_damage', 'frost_heave', 'gravel_kings', 'grid_road_ramblers'];
const KIND = { hail_damage: 'garage', frost_heave: 'laundromat', gravel_kings: 'stripmall', grid_road_ramblers: 'quonset' };
const DRIVER = { hail_damage: ['kenji', 'cactus'], frost_heave: ['moth', 'laundry'], gravel_kings: ['tamara', 'cassettes'], grid_road_ramblers: ['earl', 'atlas'] };

const dbg = page => page.evaluate(() => GG.debug('render'));
const bareUi = (page, on) => page.evaluate(on => { ['hud', 'screens', 'toast'].forEach(id => { const e = document.getElementById(id); if (e) e.style.visibility = on ? 'hidden' : ''; }); }, on);
async function advance(page, n) {
  const f0 = (await dbg(page)).frames;
  await page.waitForFunction(x => GG.debug('render').frames >= x, f0 + (n || 3), { timeout: 30000 });
}
async function shot(page, clip) { await bareUi(page, true); const b = await page.screenshot(clip ? { clip } : {}); await bareUi(page, false); return b.toString('base64'); }

// A fixture cast for a rival with none yet (the shapes of §4.1: members with looks, corpsePaint:false, frontman, carpet).
function fixtureCasts() {
  const L = (skin, hair, style, shirt, pants, extras, top) => ({ skin, hair, hairStyle: style, shirt, pants, height: 1.02, build: 1.0, extras: extras || [], top: top || 'tee' });
  return {
    mall_rats: { id: 'mall_rats', frontman: 'mr_blaze', carpet: { count: 4, wave: 'sponsor' }, defector: { look: 'stylist' },
      members: [{ id: 'mr_blaze', name: 'Blaze', role: 'vocals', look: L('#f0c9a4', '#39e05a', 'spiky', '#e8408a', '#6a8ab8'), corpsePaint: false, skate: true },
        { id: 'mr_bass', name: 'Tanner', role: 'bass', look: L('#e2b48c', '#1a1a1a', 'mohawk', '#1a1a1a', '#2a2a30', [], 'jacket'), corpsePaint: false },
        { id: 'mr_drums', name: 'Jace', role: 'drums', look: L('#c99a72', '#f2d24a', 'short', '#40c8e8', '#6a8ab8'), corpsePaint: false },
        { id: 'mr_siobhan', name: 'Siobhan', role: 'guitar', look: L('#f3d6be', '#b0452a', 'bun', '#f2efe6', '#1f1f28', ['glasses'], 'jacket'), corpsePaint: false }] },
    chartbusters: { id: 'chartbusters', frontman: 'cb_rex', carpet: { count: 4, wave: 'scarf' },
      members: [{ id: 'cb_rex', name: 'Rex', role: 'vocals', look: L('#ecc7a0', '#e8d8a0', 'long', '#d8d8e8', '#1a1a22', [], 'jacket'), corpsePaint: false, scarf: true },
        { id: 'cb_guitar', name: 'Dirk', role: 'guitar', look: L('#dcae86', '#3b2a1e', 'mullet', '#1a1a22', '#1a1a22', ['sunglasses'], 'jacket'), corpsePaint: false },
        { id: 'cb_bass', name: 'Mick', role: 'bass', look: L('#b98260', '#1c1412', 'short', '#8a2a2a', '#1a1a22'), corpsePaint: false },
        { id: 'cb_steve', name: 'Steve #5', role: 'drums', look: L('#f0cda8', '#7a5230', 'short', '#2a2a30', '#1a1a22'), corpsePaint: false }] },
    buckle_and_boot: { id: 'buckle_and_boot', frontman: 'bb_brayden', carpet: { count: 3, wave: 'tailgate' }, furyBrand: 'truck',
      members: [{ id: 'bb_brayden', name: 'Brayden', role: 'vocals', look: L('#ecc7a0', '#7a5230', 'short', '#4a6a9a', '#34507a', ['hat'], 'flannel'), corpsePaint: false },
        { id: 'bb_colt', name: 'Colt', role: 'guitar', look: L('#e0b08a', '#3a2416', 'cap', '#f2efe6', '#34507a'), corpsePaint: false },
        { id: 'bb_mascot', name: 'The Truck', role: 'mascot', look: L('#d8b08a', '#3a2416', 'short', '#b8262a', '#2a2a30'), corpsePaint: false }] }
  };
}

// v1.1: every band x seat: stage (your camera), the riser from the front, the garage. One sheet, three tiles per band x seat.
async function seatSheet(page, c, notes) {
  const SEATS = ['drums', 'bass', 'rhythm', 'lead'], VENUE = { venueId: 'gopher_hole', kind: 'bar', name: 'The Gopher Hole', capacity: 180 };
  const rows = [], base = {}, hide = on => bareUi(page, on);
  for (const b of BANDS) {
    const row = { stage: [], riser: [], garage: [] };
    for (const seat of SEATS) {
      const r = await page.evaluate(([b, seat, venue]) => {
        const st = GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, name: 'Sam', bandId: b, seat });
        if (GG.ui && GG.ui.closeAll) GG.ui.closeAll();
        st.player.gearLook = { shape: null, color: null, guard: 'white', sticker: 'logo' };
        GG.render.setPaused(false); GG.render.syncState(st); GG.render.setScene('stage');
        GG.render.stage.setup({ venue, crowd: 120, members: st.members, flags: st.flags, genre: st.genre, player: st.player, seat: st.seat });
        GG.render.stage.setCrowdLevel(72, true);
        return { drummer: GG.career.drummerId(st) || 'you' };
      }, [b, seat, VENUE]);
      await advance(page, 8);
      await page.evaluate(() => { for (let i = 0; i < 3; i++) GG.render.stage.hit('str' + (i + 1), 'perfect'); });
      await advance(page, 2);
      const si = await page.evaluate(() => ({ i: GG.render.stage.info(), calls: GG.debug('render').drawCalls }));
      if (seat === 'drums') base[b] = { stage: si.calls };
      c.ok(seat === 'drums' || si.calls <= base[b].stage * 1.15, b + ' ' + seat + ': stage ' + si.calls + ' calls <= drums ' + base[b].stage + ' x 1.15');
      await hide(true);
      row.stage.push({ label: b + ' · ' + seat + ' · ' + si.i.view + ' · ' + si.calls + ' calls', img: await shot(page, { x: 0, y: 0, width: 390, height: 563 }) });
      if (seat !== 'drums') {   // the riser from the front of the stage (a test camera; the spot camera faces the crowd)
        await page.evaluate(() => { const cam = GG.render.util.ctx().camera; cam.position.set(0.2, 0.5 + 2.6, -1.0); cam.lookAt(0, 0.5 + 0.85, 1.62); cam.updateMatrixWorld(); });
        await advance(page, 3);
        await page.evaluate(() => { const cam = GG.render.util.ctx().camera; cam.position.set(0.2, 0.5 + 2.6, -1.0); cam.lookAt(0, 0.5 + 0.85, 1.62); cam.updateMatrixWorld(); });
        await advance(page, 1);
        row.riser.push({ label: b + ' · ' + seat + ' · on the riser: ' + si.i.drummer + (si.i.boom ? ' + boom mic' : ''), img: await shot(page, { x: 0, y: 0, width: 390, height: 563 }) });
        c.ok(si.i.drummer === r.drummer && (si.i.boom === ['rox', 'chase', 'travis'].includes(r.drummer)), b + ' ' + seat + ': ' + r.drummer + ' on the riser' + (si.i.boom ? ' with a boom mic' : ''));
      }
      await hide(false);
      await page.evaluate(() => { GG.render.setScene('garage'); GG.render.syncState(GG.state); GG.render.goToHotspot('kit'); });
      await page.waitForFunction(() => { const d = GG.debug('render'); return d.scene === 'garage' && !d.walking && !d.pending; }, null, { timeout: 30000 }).catch(() => {});
      await page.evaluate(() => { if (GG.ui && GG.ui.closeAll) GG.ui.closeAll(); GG.render.setPaused(false); });
      await advance(page, 6);
      const gd = await dbg(page);
      if (seat === 'drums') base[b].garage = gd.drawCalls;
      c.ok(seat === 'drums' || gd.drawCalls <= base[b].garage * 1.15, b + ' ' + seat + ': garage ' + gd.drawCalls + ' calls <= drums ' + base[b].garage + ' x 1.15');
      await hide(true);
      row.garage.push({ label: b + ' · ' + seat + ' · garage · kit: ' + (gd.seat.drummer || 'you') + ' · ' + gd.drawCalls + ' calls', img: await shot(page, { x: 0, y: 140, width: 390, height: 330 }) });
      await hide(false);
    }
    rows.push(row);
  }
  const cell = t => '<div><div style="padding:2px 4px">' + t.label + '</div><img style="width:300px;display:block" src="data:image/png;base64,' + t.img + '"></div>';
  const html = '<html><body style="margin:0;background:#15151a;font:11px system-ui;color:#ddd"><div style="display:grid;grid-template-columns:repeat(4,300px);gap:6px;padding:6px">' +
    rows.map(r => r.stage.map(cell).join('') + '<div style="padding:8px;color:#999">the riser, from the front:</div>' + r.riser.map(cell).join('') + r.garage.map(cell).join('')).join('') + '</div></body></html>';
  const sp = await page.context().newPage();
  await sp.setViewportSize({ width: 4 * 306 + 12, height: 800 });
  await sp.setContent(html);
  await sp.waitForTimeout(400);
  const out = path.join(__dirname, '.cache', shotName('v11_seat_sheet.png'));
  await sp.screenshot({ path: out, fullPage: true });
  await sp.close();
  notes.push('seat sheet ' + out);
}

(async () => {
  const c = checker('bands_render'), notes = [], tiles = [];
  const { page, errors, close } = await open();
  try {
    await page.waitForFunction(() => window.GG && GG.render && GG.render.init && GG.main && GG.contracts, null, { timeout: 15000 });
    const injected = await page.evaluate(fx => {
      const RV = GG.content.rivalry, out = [];
      RV.cast = RV.cast || {};
      Object.keys(fx).forEach(id => { if (!RV.cast[id] || !(RV.cast[id].members || []).length) { RV.cast[id] = fx[id]; out.push(id); } });
      return out;
    }, fixtureCasts());
    if (injected.length) notes.push('fixture casts: ' + injected.join(','));
    const start = (b, extra) => page.evaluate(({ b, extra }) => {
      const st = GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, name: 'Sam', bandId: b });
      if (extra) Object.assign(st, extra);
      if (GG.ui && GG.ui.closeAll) GG.ui.closeAll();
      if (!GG.render.available) GG.render.init(document.getElementById('scene'));
      GG.render.setScene('garage'); GG.render.syncState(st);
      return { bandId: st.bandId, space: GG.content.bands[st.bandId].space, week: st.week };
    }, { b, extra: extra || null });
    const C = await page.evaluate(() => ({ kinds: GG.contracts.SPACE_KINDS, hotspots: GG.contracts.HOTSPOTS }));
    c.ok(C.kinds && C.kinds.laundromat_basement === 'laundromat', 'C.SPACE_KINDS is in the contracts');

    // ---------------------------------------------------------------------------------------------------------- garage
    const draws = {};
    if (DO('garage')) {
      for (const b of BANDS) {
        const s0 = await start(b, { week: 1 });
        await advance(page, 4);
        const d = await dbg(page);
        c.ok(d.space && d.space.kind === KIND[b] && d.space.spaceKind === C.kinds[s0.space], b + ': space.kind ' + (d.space && d.space.kind) + ' = C.SPACE_KINDS[' + s0.space + ']');
        const door = await page.evaluate(b => { const x = GG.content.bands[b].door.replace(/^the\s+/i, ''); return x.charAt(0).toUpperCase() + x.slice(1); }, b);
        c.ok(d.space.door === door, b + ': the door hotspot is labelled "' + d.space.door + '"');
        const hs = await page.evaluate(() => GG.contracts.HOTSPOTS.map(a => ({ a, p: GG.render.hotspotScreenPos(a) })));
        const vis = hs.filter(h => h.p && h.p.x > 0 && h.p.x < 390 && h.p.y > 0 && h.p.y < 844);
        c.ok(vis.length === 7 && d.hotspots.length === 7 && (d.labelAt || []).length === 7, b + ': all 7 hotspots on screen + labelled (' + vis.map(h => h.a).join(',') + ')');
        const spots = d.members.map(m => m.x + ',' + m.z);
        c.ok(new Set(spots).size === spots.length, b + ': members on distinct spots ' + d.members.map(m => m.id + '@' + m.pose).join(' '));
        const gear = await page.evaluate(() => { const o = {}; GG.state.members.forEach(m => { const cm = (GG.content.bands[GG.state.bandId].members || []).filter(x => x.id === m.id)[0]; o[m.id] = cm && cm.gear || null; }); return o; });
        const holding = d.members.filter(m => m.gear);
        c.ok(holding.every(m => !gear[m.id] || m.gear === gear[m.id]), b + ': instruments are member.gear ' + holding.map(m => m.id + ':' + m.gear).join(' '));
        c.ok(!d.members.some(m => (gear[m.id] === 'fiddle' || gear[m.id] === 'acoustic') && m.gear === 'v'), b + ': no V on a fiddle or acoustic player');
        if (b === 'grid_road_ramblers') c.ok(d.members.some(m => m.id === 'clementine' && m.pose === 'fiddle' && m.gear === 'fiddle') && d.members.some(m => m.id === 'travis' && m.gear === 'acoustic'), 'Clementine bows her fiddle, Travis holds his acoustic');
        c.ok(d.bandProps && d.bandProps.band === b, b + ': the seat props are the band\'s own ' + JSON.stringify(d.bandProps));
        c.ok(d.cape === 'none' || b === 'hail_damage', b + ': no cape without member.cape');
        draws[b] = d.drawCalls;
        // Four seasons.
        const seasons = [];
        for (const w of [1, 7, 13, 19]) {
          await page.evaluate(w => { GG.state.week = w; GG.render.syncState(GG.state); }, w);
          await advance(page, 2);
          const e = await dbg(page);
          seasons.push({ s: e.decor.season, where: e.decor.where, ext: e.space.exterior, snow: e.decor.snow, draw: e.drawCalls });
        }
        c.ok(seasons.map(x => x.s).join() === 'summer,fall,winter,spring', b + ': 4 seasons ' + seasons.map(x => x.s).join(','));
        if (b !== 'hail_damage') c.ok(new Set(seasons.map(x => x.ext)).size === 4 && seasons[2].snow, b + ': the exterior dresses for each season: ' + seasons.map(x => x.ext).join(' | '));
        draws[b] = Math.max(draws[b], ...seasons.map(x => x.draw));
        await page.evaluate(() => { GG.state.week = 13; GG.render.syncState(GG.state); });
        await advance(page, 6);
        tiles.push({ label: b + ' — garage (' + KIND[b] + ', winter)', img: await shot(page, { x: 0, y: 150, width: 390, height: 380 }) });
      }
      const hd = draws.hail_damage;
      notes.push('garage draw calls ' + BANDS.map(b => b + ' ' + draws[b]).join(', '));
      c.ok(BANDS.every(b => draws[b] <= Math.floor(hd * 1.15)), 'garage draw calls <= Hail Damage x 1.15 (' + hd + ' -> ' + Math.floor(hd * 1.15) + ')');
      // The jam room's neighbour stickers are the other bands (Hail Damage included for the others).
      await start('frost_heave', { spaceTier: 1 }); await advance(page, 2);
      const nb = (await dbg(page)).space.neighbours || [];
      c.ok(nb.includes('HAIL DAMAGE') && !nb.includes('FROST HEAVE'), 'jam-room neighbours exclude your band, include Hail Damage: ' + nb.join(', '));
    }

    // ----------------------------------------------------------------------------------------------------------- stage
    if (DO('stage')) {
      const st = {};
      for (const b of BANDS) {
        await start(b);
        await page.evaluate(() => { GG.render.setScene('stage'); GG.render.stage.setup({ venue: { kind: 'bar', name: 'The Gopher Hole', capacity: 150 }, crowd: 110, members: GG.state.members, genre: GG.state.genre, flags: {} }); GG.render.stage.setCrowdLevel(80, true); });
        await advance(page, 4);
        st[b] = await page.evaluate(() => GG.render.stage.info());
      }
      c.ok(st.hail_damage.band.join() === 'marcel:vocals:mic,dana:lead:guitar,jaxon:rhythm:guitar,kenji:bass:bass', 'Hail Damage lineup unchanged: ' + st.hail_damage.band.join(' '));
      c.ok(st.grid_road_ramblers.band.includes('travis:vocals:acoustic') && st.grid_road_ramblers.mics.includes('travis'), 'travis:vocals:acoustic with a mic stand');
      c.ok(st.grid_road_ramblers.band.some(x => /^clementine:\w+:fiddle$/.test(x)), 'Clementine plays the fiddle: ' + st.grid_road_ramblers.band.join(' '));
      c.ok(st.frost_heave.band.includes('rox:vocals:guitar') && st.frost_heave.mics.includes('rox'), 'rox:vocals:guitar with a mic stand');
      const sym = s => s.layout === 3 && Math.abs(s.xs[0]) < 0.01 && Math.abs(s.xs[1] + s.xs[2]) < 0.01;
      c.ok(sym(st.frost_heave) && sym(st.gravel_kings), 'three-player layouts are symmetric (' + st.frost_heave.xs.join(',') + ' / ' + st.gravel_kings.xs.join(',') + ')');
      c.ok(st.gravel_kings.gear.includes('lenny:strat') && st.frost_heave.gear.includes('benny:sg') && st.grid_road_ramblers.gear.includes('earl:tele'), 'guitars by member.gear (strat, sg, tele)');
      // Moments + signatures (§4.4).
      const mom = await page.evaluate(() => {
        const s = GG.render.stage, r = {};
        ['pogo', 'fistPump', 'clapAlong', 'headbang', 'gangShout', 'singAlong', 'yeehaw'].forEach(k => { r[k] = s.moment(k) && s.info().arms === k; });
        return r;
      });
      c.ok(Object.values(mom).every(Boolean), 'every §4.4 crowd moment runs: ' + JSON.stringify(mom));
      const sigs = {};
      for (const [b, act, who] of [['frost_heave', 'stageDive', 'rox'], ['gravel_kings', 'kneeSlide', 'chase'], ['grid_road_ramblers', 'hatTip', 'duke']]) {
        await start(b);
        await page.evaluate(() => { GG.render.setScene('stage'); GG.render.stage.setup({ venue: { kind: 'bar', name: 'The Gopher Hole' }, crowd: 110, members: GG.state.members, genre: GG.state.genre }); });
        await advance(page, 2);
        const r = await page.evaluate(act => ({ ok: GG.render.stage.moment(act), acting: GG.render.stage.info().acting }), act);
        let far = 0;
        for (let i = 0; i < 8; i++) { await advance(page, 2); const at = (await page.evaluate(() => GG.render.stage.info().at)).filter(a => a.id === who)[0]; if (at) far = Math.max(far, Math.abs(at.tilt), at.y); }
        sigs[act] = r.ok && r.acting.includes(who + ':' + act);
        if (act === 'stageDive') c.ok(far > 0.3, 'the stage dive leaves the stage (tilt/lift ' + far + ')');
        if (act === 'stageDive') tiles.push({ label: 'frost_heave — stage dive', img: await shot(page, { x: 0, y: 40, width: 390, height: 380 }) });
      }
      c.ok(Object.values(sigs).every(Boolean), 'signatures land on their member: ' + JSON.stringify(sigs));
      for (const b of ['gravel_kings', 'grid_road_ramblers']) {
        await start(b);
        await page.evaluate(() => { GG.render.setScene('stage'); GG.render.stage.setup({ venue: { kind: 'bar', name: 'The Gopher Hole' }, crowd: 110, members: GG.state.members, genre: GG.state.genre }); GG.render.stage.setCrowdLevel(85, true); GG.render.stage.moment(GG.state.genre === 'country' ? 'clapAlong' : 'fistPump'); });
        await advance(page, 8);
        tiles.push({ label: b + ' — stage (' + (b === 'gravel_kings' ? 'fistPump' : 'clapAlong') + ')', img: await shot(page, { x: 0, y: 40, width: 390, height: 380 }) });
      }
    }

    // ------------------------------------------------------------------------------------------------------------- van
    if (DO('van')) {
      for (const b of BANDS) {
        await start(b);
        const v = await page.evaluate(() => { GG.render.setScene('van'); GG.render.van.setTrip({ from: GG.state.city, to: 'Moose Jaw', km: 180, season: 'fall' }); return GG.render.van.info(); });
        await advance(page, 3);
        c.ok(v.driver === DRIVER[b][0] && v.dashboard === DRIVER[b][1], b + ': ' + v.driver + ' drives, dashboard ' + v.dashboard);
        const shades = b === 'hail_damage';
        c.ok(shades ? v.driverExtras.includes('sunglasses') && v.mirror === 'sunglasses' : !v.driverExtras.includes('sunglasses') && v.mirror !== 'sunglasses', b + ': shades only on Kenji; the mirror shows ' + v.mirror);
        if (b === 'grid_road_ramblers') c.ok(v.driverExtras.includes('glasses') && v.mirror === 'glasses', 'Earl keeps his glasses (in the mirror too)');
        const talk = await page.evaluate(id => ({ ok: GG.render.van.talk(id, 2), talking: GG.render.van.info().talking }), DRIVER[b][0]);
        c.ok(shades ? talk.ok === false : talk.ok && talk.talking.includes(DRIVER[b][0]), b + ': ' + (shades ? 'Kenji never talks' : 'the driver talks (' + talk.talking.join(',') + ')'));
        c.ok(Array.isArray(v.ornaments) && v.ornaments.length >= 3 && (b !== 'hail_damage' ? !v.ornaments.includes('moose bobblehead') : v.ornaments.includes('moose bobblehead')), b + ': tier-0 ornaments ' + (v.ornaments || []).join(', '));
        // You drive: the absent driver's item stays.
        const you = await page.evaluate(() => { GG.render.van.setTrip({ to: 'Regina', km: 90, season: 'summer', driver: 'you', dashboard: 'cactus' }); return GG.render.van.info(); });
        c.ok(you.driver === 'you' && you.dashboard === DRIVER[b][1], b + ': you drive, the dash keeps ' + you.dashboard);
        await page.evaluate(() => GG.render.van.setTrip({ from: GG.state.city, to: 'Moose Jaw', km: 180, season: 'fall' }));
        await advance(page, 6);
        if (b !== 'hail_damage') tiles.push({ label: b + ' — van (tier 0)', img: await shot(page, { x: 0, y: 40, width: 390, height: 460 }) });
      }
    }

    // ---------------------------------------------------------------------------------------------------------- carpet
    if (DO('carpet')) {
      for (const b of BANDS) {
        await start(b);
        const r = await page.evaluate(() => {
          const rid = GG.content.bands[GG.state.bandId].rival, cast = GG.content.rivalry.cast[rid];
          GG.render.setScene('carpet'); GG.render.carpet.setup({ members: GG.state.members, player: GG.state.player, flags: {}, genre: GG.state.genre, rival: { id: rid, name: GG.content.rivals[rid].name } });
          const i = GG.render.carpet.info();
          return { i, want: Math.min(6, (cast.carpet && cast.carpet.count) || cast.members.length), paintWant: cast.members.filter(m => m.corpsePaint === true).length, rid };
        });
        await advance(page, 3);
        c.ok(r.i.rival === r.want, b + ': the ' + r.rid + ' carpet count comes from the cast (' + r.i.rival + ' of ' + r.want + ')');
        c.ok(r.rid === 'tundra_wraith' ? r.i.painted === r.i.rival && r.i.painted >= 4 : r.i.painted === 0, b + ': corpse paint only for Tundra Wraith (' + r.i.painted + ' painted)');
        if (r.rid === 'buckle_and_boot') c.ok(r.i.mascot && r.i.wave === 'tailgate', 'Buckle & Boot walk the carpet with the truck mascot (tailgate wave)');
        if (b === 'grid_road_ramblers' || b === 'frost_heave') { await advance(page, 12); tiles.push({ label: b + ' — carpet vs ' + r.rid, img: await shot(page, { x: 0, y: 40, width: 390, height: 460 }) }); }
      }
    }

    // ----------------------------------------------------------------------------------------------------------- rival
    if (DO('rival')) {
      for (const b of BANDS) {
        await start(b);
        const r = await page.evaluate(() => {
          const rid = GG.content.bands[GG.state.bandId].rival, cast = GG.content.rivalry.cast[rid], def = GG.content.rivals[rid];
          const line = cast.members, drum = line.filter(m => /drum/i.test(m.role || ''))[0];
          GG.render.setScene('stage');
          GG.render.stage.setup({ venue: { kind: 'club', name: 'Showdown' }, crowd: 120, genre: def.genre, rival: true, view: 'spectator', banner: def.name, sub: def.city, flags: {}, player: GG.state.player,
            members: line.filter(m => m !== drum).map(m => ({ id: m.id, name: m.name, role: m.role, mood: 85, look: m.look, corpsePaint: m.corpsePaint !== false, stageShirt: m.stageShirt })),   // (the old 59d shape, paint unless false: the render must still refuse paint the cast doesn't ask for)
            drummer: drum ? { id: drum.id, look: drum.look, corpsePaint: drum.corpsePaint !== false, stageShirt: drum.stageShirt } : null });
          GG.render.stage.setCrowdLevel(75, true);
          const cd = cast.drummer && typeof cast.drummer === 'object' ? cast.drummer.id : cast.drummer || null;
          return { rid, cd, info: GG.render.stage.info(), kick: rid === 'mall_rats' ? GG.render.stage.bandAction(null, 'kickflip') : null };
        });
        await advance(page, 4);
        const i = r.info;
        c.ok(i.rival && i.rivalId === r.rid && i.bannerLogo, b + ': ' + r.rid + ' on stage under its own logo');
        c.ok(r.rid === 'tundra_wraith' ? i.painted >= 4 : i.painted === 0, b + ': ' + r.rid + ' corpse paint ' + i.painted);
        c.ok(i.drummer !== 'player', b + ': their drummer is theirs (' + i.drummer + (i.session ? ', the session guy' : '') + ')');
        // (the real cast lists its session guy in members as the drummer (cast.drummer 'bb_session'); a cast without one gets the
        // stage's own session seat)
        if (r.rid === 'buckle_and_boot') c.ok((i.session || (r.cd && i.drummer === r.cd)) && i.props.some(p => /truck/.test(p)), 'Buckle & Boot: the session drummer (' + i.drummer + (i.session ? ', seated by the stage' : '') + ') + the truck mascot ' + i.props.join(','));
        if (r.rid === 'mall_rats') c.ok(r.kick === true && i.props.some(p => /skateboard/.test(p)), 'Mall Rats: the sponsor-mandated kickflip (with a skateboard)');
        if (r.rid === 'chartbusters') c.ok(i.props.some(p => /scarf/.test(p)), 'Chartbusters: Rex wears the scarf');
        if (b !== 'hail_damage') { await advance(page, 6); tiles.push({ label: r.rid + ' — rival set', img: await shot(page, { x: 0, y: 40, width: 390, height: 380 }) }); }
      }
    }

    // ----------------------------------------------------------------------------------------------------------- recap
    if (DO('recap')) {
      for (const b of BANDS) {
        await start(b, { seed: 9000 + BANDS.indexOf(b) });   // (the photo is cached per seed + year)
        const r = await page.evaluate(() => {
          const rig = GG.render.garage && GG.render.garage.photoRig ? GG.render.garage.photoRig(GG.render.garage.spaceKind(GG.state)) : null;
          const url = GG.ui.recapPhoto ? GG.ui.recapPhoto(GG.state, 1) : null;
          return { rig, url };
        });
        c.ok(r.rig && r.rig.kind === KIND[b] && r.rig.pos.length === 3 && r.rig.near > 0, b + ': photoRig(' + KIND[b] + ') ' + (r.rig && r.rig.backdrop));
        const stat = r.url ? await page.evaluate(url => new Promise(res => { const im = new Image(); im.onload = () => { const cv = document.createElement('canvas'); cv.width = 60; cv.height = 38; const g = cv.getContext('2d'); g.drawImage(im, 0, 0, 60, 38); const d = g.getImageData(0, 0, 60, 38).data; let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; s += v; s2 += v * v; n++; } const m = s / n; res({ mean: Math.round(m), sd: Math.round(Math.sqrt(s2 / n - m * m)) }); }; im.onerror = () => res(null); im.src = url; }), r.url) : null;
        c.ok(stat && stat.mean > 12 && stat.sd > 10, b + ': the recap photo is not blank ' + JSON.stringify(stat));
        if (r.url && b !== 'hail_damage') tiles.push({ label: b + ' — recap photo', img: r.url.replace(/^data:image\/\w+;base64,/, ''), jpeg: true });
      }
    }

    // ---------------------------------------------------------------------------------------------- v1.1 seats sheet
    if (DO_SEATS) await seatSheet(page, c, notes);

    // ---------------------------------------------------------------------------------------------------- the sheet
    if (tiles.length) {
      const html = '<html><body style="margin:0;background:#15151a;font:12px system-ui;color:#ddd"><div style="display:grid;grid-template-columns:repeat(4,390px);gap:6px;padding:6px">' +
        tiles.map(t => '<div><div style="padding:2px 4px">' + t.label + '</div><img style="width:390px;display:block" src="data:image/' + (t.jpeg ? 'jpeg' : 'png') + ';base64,' + t.img + '"></div>').join('') + '</div></body></html>';
      const sp = await page.context().newPage();
      await sp.setViewportSize({ width: 4 * 396 + 12, height: 800 });
      await sp.setContent(html);
      await sp.waitForTimeout(300);
      await sp.screenshot({ path: SHEET, fullPage: true });
      await sp.close();
      notes.push('sheet ' + SHEET + ' (' + tiles.length + ' tiles)');
    }
    c.ok(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } catch (e) {
    c.ok(false, 'exception: ' + (e && e.stack || e));
  }
  await close();
  if (notes.length) console.log('INFO ' + notes.join(' | '));
  c.done();
})();
