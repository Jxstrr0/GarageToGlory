// pw_garage.js: the 3D garage in real Chromium at phone portrait (390x844). Run: node tests/pw_garage.js
// Boots dist/game.html. If the UI provides GG.main.quickStart it lands through that; otherwise it drives
// GG.render directly (init + setScene('garage') + syncState(fixture)). Checks: canvas + frames, floor tap
// walks, every hotspot tap emits 'hotspot', bandmate taps emit 'member:tap', cape variants, sulking,
// kit colour, draw calls < 60, pause, resize/orientation, insets, offline fallback, no console errors.
// Saves one screenshot to tests/.cache/garage.png (cape = 'velvet').
const path = require('path');
const { open, checker } = require('./_pw');

if (process.env.META_ONLY && !/garage/.test(process.env.META_ONLY)) { console.log('SKIP pw_garage (META_ONLY=' + process.env.META_ONLY + ')'); process.exit(0); }

const HOTSPOTS = ['plan', 'kit', 'gigboard', 'laptop', 'merch', 'trophies', 'door'];
const SHOT = path.join(__dirname, '.cache', 'garage.png');

// A career state shaped like 02_contracts.js (what GG.career.newCareer would return in week 1).
function fixtureState() {
  const member = (id, name, nick, role, skill, mood) => ({ id, name, nick, role, skill, mood, status: 'active', original: true });
  return {
    v: 1, createdVersion: '0.1.0.0', slot: 'auto', seed: 12345, rng: 12345,
    bandId: 'hail_damage', genre: 'metal', region: 'canada', city: 'Saskatoon', space: 'parents_garage',
    player: { name: 'Sam', nick: 'Sticks', presetId: 'denim_tuxedo',
      look: { skin: '#f0c9a4', hair: '#6b4226', hairStyle: 'mullet', shirt: '#4a6fa5', pants: '#35507a', height: 1.0, build: 1.05, extras: [] },
      kitColor: '#2f6fd1' },
    totalWeek: 1, year: 1, week: 1, maxWeeks: 240, phase: 'monday', era: 'garage', protected: true,
    fund: 300, fans: 12, buzz: 5, chemistry: 50, burnout: 10, drumSkill: 10, debtToParents: 0,
    members: [
      member('marcel', 'Marcel Fontaine', 'Lord Abyssus', 'vocals', 48, 66),
      member('dana', 'Dana Okafor', 'Sweep', 'lead guitar', 58, 72),
      member('jaxon', 'Jaxon Kowalchuk', 'Rip', 'rhythm guitar', 44, 60),
      member('kenji', 'Kenji Blackbird', 'Kenji', 'bass', 52, 61)
    ],
    songs: [], card: null, plan: [null, null, null], gig: null, offer: null, lastGig: null, lastWeek: null, wrap: null,
    chains: {}, flags: {}, seenCards: {}, chat: [], history: [],
    stats: { gigs: 0, songsWritten: 0, hustles: 0, cards: 0, earned: 0, bestGrade: null, parentsLoans: 0 }, ended: false
  };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const dbg = page => page.evaluate(() => GG.debug('render'));

// Tap through the real input path; if some UI element covers the point, dispatch on the canvas instead.
async function tapAt(page, pt) {
  const onCanvas = await page.evaluate(p => { const el = document.elementFromPoint(p.x, p.y); return !!el && el.tagName === 'CANVAS'; }, pt);
  if (onCanvas) { await page.touchscreen.tap(pt.x, pt.y); return; }
  await page.evaluate(p => {
    const cv = document.querySelector('#scene canvas'), o = { bubbles: true, clientX: p.x, clientY: p.y, pointerId: 7, isPrimary: true, pointerType: 'touch' };
    cv.dispatchEvent(new PointerEvent('pointerdown', o)); cv.dispatchEvent(new PointerEvent('pointerup', o));
  }, pt);
}
async function waitEvent(page, t, v, ms) {
  try { await page.waitForFunction(a => (window.__ev || []).some(e => e.t === a.t && e.v === a.v), { t, v }, { timeout: ms || 9000, polling: 50 }); return true; }
  catch (e) { return false; }
}
// With the real UI, a hotspot opens a screen that may pause the render: close it again.
async function settle(page) {
  await page.evaluate(() => {
    for (let i = 0; i < 4; i++) { try { if (GG.ui && GG.ui.close) GG.ui.close(); } catch (e) {} }
    GG.render.setPaused(false);
  });
}
const inView = (p, w, h) => !!p && p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h;

(async () => {
  const c = checker('garage');
  const { page, errors, close } = await open();
  try {
    await page.waitForFunction(() => window.GG && GG.render && GG.render.init, null, { timeout: 15000 });
    const mode = await page.evaluate(fx => {
      const boot = document.getElementById('boot'); if (boot) boot.style.display = 'none';
      window.__ev = [];
      GG.on('hotspot', p => window.__ev.push({ t: 'hotspot', v: p && p.action }));
      GG.on('member:tap', p => window.__ev.push({ t: 'member', v: p && p.id }));
      if (GG.main && typeof GG.main.quickStart === 'function') {
        const st = GG.main.quickStart({ seed: 12345, slot: '1', openCard: false });
        window.__st = st || GG.state;
        if (!GG.render.available) GG.render.init(document.getElementById('scene'));
        GG.render.setScene('garage'); GG.render.syncState(window.__st);
        return 'quickStart';
      }
      window.__st = fx;
      const ok = GG.render.init(document.getElementById('scene'));
      GG.render.setScene('garage'); GG.render.syncState(fx);
      return ok ? 'direct' : 'init-failed';
    }, fixtureState());
    console.log('mode: ' + mode);
    if (mode === 'quickStart') await settle(page);
    c.ok(mode !== 'init-failed', 'GG.render.init returns true with three.js present');
    c.ok(await page.evaluate(() => !!document.querySelector('#scene canvas')), 'canvas present in #scene');
    c.ok(await page.evaluate(() => GG.render.init(document.getElementById('scene')) === true && document.querySelectorAll('#scene canvas').length === 1), 'init is idempotent (one canvas)');

    // Frames advance (after a warm-up: the first frames compile shaders, slow on software GL).
    await page.waitForFunction(() => GG.debug('render').frames >= 3, null, { timeout: 15000 }).catch(() => {});
    const f0 = (await dbg(page)).frames; await sleep(800); const d1 = await dbg(page);
    c.ok(d1.frames > f0, 'frames advance (' + f0 + ' -> ' + d1.frames + ')');
    c.ok(d1.scene === 'garage' && d1.available === true, 'scene is garage and available');
    c.ok(Array.isArray(d1.hotspots) && HOTSPOTS.every(a => d1.hotspots.includes(a)), 'debug lists all 7 hotspots');
    c.ok(d1.drawCalls > 0 && d1.drawCalls < 60, 'draw calls < 60 (' + d1.drawCalls + ', ' + d1.triangles + ' tris)');
    const mids = (await page.evaluate(() => (window.__st.members || []).map(m => m.id)));
    c.ok(d1.members.length === mids.length, 'one figure per active member (' + d1.members.map(m => m.id + ':' + m.pose).join(', ') + ')');

    // Every hotspot centre is on screen in portrait; the band between HUD and a bottom sheet holds them.
    const pos = await page.evaluate(a => a.map(x => GG.render.hotspotScreenPos(x)), HOTSPOTS);
    c.ok(pos.every(p => inView(p, 390, 844)), 'all hotspot centres on screen: ' + JSON.stringify(pos));
    c.ok(pos.every(p => p.y >= 56 && p.y <= 844 * 0.65), 'hotspots sit between the HUD bar and a bottom sheet');

    // Floor tap: the player walks toward the tapped point.
    // Pick a floor point that nothing stands in front of (pickAt reports what a tap would hit).
    const p0 = d1.player;
    const free = await page.evaluate(() => {
      const C = [[1.3, -0.5], [0.3, -0.2], [1.5, 0.9], [-0.3, 1.4], [1.0, -1.0]];
      for (const [x, z] of C) { const s = GG.render.worldToScreen(x, 0, z), h = s && GG.render.pickAt(s.x, s.y); if (h && h.type === 'floor') return { x, z, s }; }
      return null;
    });
    c.ok(!!free, 'found an unobstructed floor point via pickAt');
    const tgt = { x: free.x, z: free.z }, tp = free.s;
    await tapAt(page, tp);
    await sleep(350);
    const d2 = await dbg(page);
    const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    c.ok(d2.walking && d2.target && dist(d2.target, tgt) < 0.35, 'floor tap sets a walk target near the tap (' + JSON.stringify(d2.target) + ')');
    // Software GL can run at a few fps under load: poll (up to 4 s) instead of trusting one fixed sleep.
    let dw = d2;
    for (let i = 0; i < 20 && !(dist(dw.player, tgt) < dist(p0, tgt) - 0.1); i++) { await sleep(200); dw = await dbg(page); }
    c.ok(dist(dw.player, tgt) < dist(p0, tgt) - 0.1, 'player moves toward the target ' + JSON.stringify([p0, dw.player, tgt, dw.frames]));
    await page.waitForFunction(() => !GG.debug('render').walking, null, { timeout: 6000 }).catch(() => {});
    const d3 = await dbg(page);
    c.ok(!d3.walking && dist(d3.player, tgt) < 0.4, 'player arrives (' + JSON.stringify(d3.player) + ')');

    // Each hotspot: tap its screen position -> walk there -> 'hotspot' { action }.
    for (const a of HOTSPOTS) {
      await page.evaluate(() => { window.__ev.length = 0; });
      const p = await page.evaluate(x => GG.render.hotspotScreenPos(x), a);
      await tapAt(page, p);
      const got = await waitEvent(page, 'hotspot', a, 9000);
      const ev = await page.evaluate(() => window.__ev.slice());
      c.ok(got && ev.filter(e => e.t === 'hotspot').length === 1, 'tap ' + a + ' -> hotspot event ' + JSON.stringify(ev));
      if (mode === 'quickStart') await settle(page);
    }
    const dk = await dbg(page);
    c.ok(dk.player.pose !== 'walk', 'player standing/seated after the last hotspot (' + dk.player.pose + ')');
    c.ok(await page.evaluate(() => GG.render.goToHotspot('kit') === true && GG.render.goToHotspot('nope') === false), 'goToHotspot(action) returns true / false for unknown');
    await page.evaluate(() => { window.__ev.length = 0; });
    c.ok(await waitEvent(page, 'hotspot', 'kit', 9000), 'goToHotspot(kit) emits hotspot kit');
    if (mode === 'quickStart') await settle(page);
    await sleep(200);
    c.ok((await dbg(page)).player.pose === 'drum', 'player sits at the kit after reaching it');

    // Bandmates: tap -> 'member:tap' { id } (and they turn toward the player).
    for (const id of mids.slice(0, 4)) {
      await page.evaluate(() => { window.__ev.length = 0; });
      const p = await page.evaluate(x => GG.render.memberScreenPos(x), id);
      if (!p) { c.ok(false, 'memberScreenPos(' + id + ')'); continue; }
      await tapAt(page, p);
      c.ok(await waitEvent(page, 'member', id, 2000), 'tap ' + id + ' -> member:tap');
      if (mode === 'quickStart') await settle(page);
    }
    c.ok(await page.evaluate(() => GG.render.memberScreenPos('nobody') === null && GG.render.hotspotScreenPos('nope') === null), 'unknown ids -> null screen pos');

    // Cape variants from state.flags.cape; sulking; kit colour; idempotent sync.
    const capeOf = v => page.evaluate(v => { const s = window.__st; s.flags = s.flags || {}; if (v === null) delete s.flags.cape; else s.flags.cape = v; GG.render.syncState(s); return GG.debug('render').cape; }, v);
    c.ok(await capeOf('velvet') === 'velvet', 'flags.cape velvet shows a cape');
    c.ok(await capeOf('curtain') === 'curtain', 'flags.cape curtain');
    c.ok(await capeOf('charred') === 'charred', 'flags.cape charred');
    c.ok(await capeOf('fireproof') === 'fireproof', 'flags.cape fireproof');
    c.ok(await capeOf('none') === 'none' && await capeOf(null) === 'none', "flags.cape 'none'/absent -> no cape");
    const sulk = await page.evaluate(id => {
      const s = window.__st, m = s.members.find(x => x.id === id), old = m.mood;
      m.mood = 12; GG.render.syncState(s); const a = GG.debug('render').members.find(x => x.id === id).pose;
      m.mood = old; GG.render.syncState(s); const b = GG.debug('render').members.find(x => x.id === id).pose;
      return { a, b };
    }, mids[1] || mids[0]);
    c.ok(sulk.a === 'sulk' && sulk.b !== 'sulk', 'mood < 30 sulks on the couch, recovers after (' + JSON.stringify(sulk) + ')');
    const seasons = await page.evaluate(() => {
      const s = window.__st, w0 = s.week, out = {};
      for (const w of [1, 8, 13, 20, 24]) { s.week = w; GG.render.syncState(s); out[w] = GG.debug('render').season; }
      s.week = w0; GG.render.syncState(s); return out;
    });
    c.ok(seasons[1] === 'summer' && seasons[8] === 'fall' && seasons[13] === 'winter' && seasons[20] === 'spring' && seasons[24] === 'summer', 'yard follows the season of state.week ' + JSON.stringify(seasons));
    const kc = await page.evaluate(() => { const s = window.__st; s.player.kitColor = '#c0392b'; GG.render.syncState(s); GG.render.syncState(s); return GG.debug('render').kitColor; });
    c.ok(kc === '#c0392b', 'kit colour follows state.player.kitColor');
    const hidden = await page.evaluate(() => { const s = JSON.parse(JSON.stringify(window.__st)); s.members[0].status = 'quit'; GG.render.syncState(s); const n = GG.debug('render').members.length; GG.render.syncState(window.__st); return [n, GG.debug('render').members.length]; });
    c.ok(hidden[0] === mids.length - 1 && hidden[1] === mids.length, 'inactive members are not drawn (' + hidden + ')');

    // Pause stops the loop; resume restarts it.
    await page.evaluate(() => GG.render.setPaused(true));
    await sleep(100); const pa = (await dbg(page)).frames; await sleep(400); const pb = await dbg(page);
    c.ok(pb.frames === pa && pb.paused === true, 'setPaused(true) stops frames');
    await page.evaluate(() => GG.render.setPaused(false)); await sleep(400);
    c.ok((await dbg(page)).frames > pa, 'setPaused(false) resumes');

    // Orientation change: landscape keeps everything on screen, then back to portrait.
    await page.setViewportSize({ width: 844, height: 390 }); await sleep(500);
    const land = await page.evaluate(a => ({ d: GG.debug('render').viewport, p: a.map(x => GG.render.hotspotScreenPos(x)) }), HOTSPOTS);
    c.ok(land.d.w === 844 && land.d.h === 390 && land.p.every(p => inView(p, 844, 390)), 'landscape resize keeps hotspots on screen');
    await page.setViewportSize({ width: 390, height: 844 }); await sleep(500);
    const port = await page.evaluate(a => a.map(x => GG.render.hotspotScreenPos(x)), HOTSPOTS);
    c.ok(port.every(p => inView(p, 390, 844)), 'back to portrait');
    await page.evaluate(() => GG.render.setViewInsets({ bottom: 0 })); await sleep(700);
    const ins = await page.evaluate(a => a.map(x => GG.render.hotspotScreenPos(x)), HOTSPOTS);
    c.ok(ins.every(p => inView(p, 390, 844)), 'setViewInsets({bottom:0}) refits the room');
    await page.evaluate(() => GG.render.setViewInsets({ bottom: -1 })); await sleep(700);

    // Screenshot for the lead: velvet cape, player back near the middle, idle.
    await page.evaluate(() => { const s = window.__st; s.flags.cape = 'velvet'; s.player.kitColor = '#2f6fd1'; GG.render.syncState(s); });
    const home = await page.evaluate(() => {
      for (const [x, z] of [[0.35, 0.35], [0.5, 0.2], [0.2, 0.55], [0.7, 0.4]]) { const s = GG.render.worldToScreen(x, 0, z), h = s && GG.render.pickAt(s.x, s.y); if (h && h.type === 'floor') return s; }
      return GG.render.worldToScreen(0.35, 0, 0.35);
    });
    await tapAt(page, home);
    await page.waitForFunction(() => !GG.debug('render').walking, null, { timeout: 6000 }).catch(() => {});
    await sleep(1500);
    await page.screenshot({ path: SHOT });
    const df = await dbg(page);
    c.ok(df.cape === 'velvet' && df.drawCalls < 60, 'final frame: velvet cape, ' + df.drawCalls + ' draw calls');
    c.ok(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.slice(0, 5).join(' | ') : ''));
  } catch (e) {
    c.ok(false, 'exception: ' + (e && e.stack || e));
  }
  await close();

  // Offline: three.js fails to load -> init returns false, nothing throws, queries return null.
  try {
    const o = await open({ noGoto: true });
    await o.page.route('**/three.min.js', r => r.abort());
    await o.page.goto(o.url);
    await o.page.waitForFunction(() => window.GG && GG.render, null, { timeout: 15000 });
    const r = await o.page.evaluate(fx => {
      const ok = GG.render.init(document.getElementById('scene'));
      GG.render.setScene('garage'); GG.render.syncState(fx); GG.render.setPaused(true); GG.render.setPaused(false);
      return { ok, avail: GG.render.available, pos: GG.render.hotspotScreenPos('kit'), go: GG.render.goToHotspot('kit'), dbg: GG.debug('render') };
    }, fixtureState());
    c.ok(r.ok === false && r.avail === false && r.pos === null && r.go === false && r.dbg.available === false, 'offline: init false, API inert (' + JSON.stringify(r.dbg) + ')');
    const pageErrors = o.errors.filter(e => !/Failed to load resource/.test(e));
    c.ok(pageErrors.length === 0, 'offline: no page errors' + (pageErrors.length ? ': ' + pageErrors.join(' | ') : ''));
    await o.close();
  } catch (e) {
    c.ok(false, 'offline exception: ' + (e && e.stack || e));
  }
  c.done();
})();
