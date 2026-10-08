// pw_keys.js (v1.5 "Desktop", Lane I; plan_contract_1.5 §5 Lane I, §4.3 / §4.4 / §4.7): gig keys, key calibration and
// Settings > Keys on a computer (desktop context: no touch, fine pointer + hover; 1280x720 unless PW_DESK=<w>x<h>).
// Sections (META_ONLY=keys|fair|stuck|space|esc|blur|rebind|calib-keys|phone|wide-gig; default all), each inside `timeout 500`:
//   keys       every default key per seat x 4 / 5 / 6 lanes hits its lane (owner Q1 / Q2); Space on a 4-string rig is
//              swallowed; J K L G H (v1.4 extras); a code-less 'd' = v1.4 (kick); Shift held + D = snare; a string hold on
//              keys + its keyup lifts it (Shift held on the 5th of 6); repeat ignored; Ctrl+D = no tap, prevented; legend +
//              keycaps.
//   fair       calibKb (keys audio 60 / visual 40) != calib (touch 0 / 0): Drum sync on -> a key song draws with the key
//              light check, a touch song with the touch one; off -> a key press 60 ms late judges like a touch on time
//              (same grade); chords: two keys = two lanes; the chart (auto notes) is the same for keys and touch.
//   stuck      hold A -> Esc -> release while paused -> resume -> A taps; A held across a song end -> A taps next song; two
//              non-repeat keydowns, no keyup -> two taps (a lost keyup); Shift down, A down, Shift up, A up code-less ->
//              nothing stuck; right-click on the stage -> no menu.
//   space      a mouse-focused btn-gig-pause + 40 Space presses: no pause (40 kicks); with gg-kbnav, Space mashed past the
//              song end never skips the between card or the results; a fresh Enter after 600 ms does.
//   esc        Esc pauses ("Esc to resume" on the card) -> Restart focused (arrows via the router, else focus()) -> Enter
//              -> the song restarts; Esc pauses, Esc resumes where it stopped.
//   blur       a window blur mid-song (keys) -> paused frozen (restart false), held strings released; resume -> songT
//              carries on from pauseT.
//   rebind     Settings > Keys: bind, swap, Tab / Enter / F5 refused (the chip keeps waiting), Esc cancels, reset, a reload
//              keeps it, the gig uses it (+ keycap); a rebind started with Enter shows no "Enter is for menus".
//   calib-keys both key steps write calibKb (touch calib untouched); a key held 1 s = one tap; light check only keeps the
//              touch audio (fallback).
//   phone      390x844 phone context: no Keys section, Layout row, calib input seg, gig-keys, gig-pause-keys, keycaps.
//   wide-gig   the PC layout's highway at 1280x720 / 1440x900 / 1920x1080, 4 and 6 lanes: data-lanes, laneW = width / lanes,
//              wide gems, note travel time == the phone's, the stage frame to 0.1 of the highway, B bounds (when 5w is in
//              the tree); a resize 1440 -> 800 while paused re-lays it out (laneW right after resume).
// Run: node build.js && META_ONLY=keys timeout 500 node tests/pw_keys.js
const { open, checker } = require('./_pw');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);
const DESK = (() => { const m = /^(\d+)x(\d+)$/.exec(String(process.env.PW_DESK || '')); return m ? { width: +m[1], height: +m[2] } : { width: 1280, height: 720 }; })();
const tid = id => `[data-testid="${id}"]`;
const dbg = (page, k) => page.evaluate(k => GG.debug(k), k);
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });
const E = '................';

async function boot(opts) {
  const o = await open(Object.assign({ desktop: true, viewport: DESK }, opts || {}));
  await o.page.waitForSelector(tid('btn-new'), { timeout: 30000 });
  return o;
}
// A career on `seat` (drums: a custom song per `bars`; strings: jammed songs), `lanes` on the rig, then the gig's setlist.
async function career(page, o) {
  await page.evaluate(o => {
    const E = '................';
    GG.ui.closeAll();
    GG.prefs.set(Object.assign({ gigDifficulty: 'hard', autoKick: false, lefty: false, noFail: true, drumSync: true }, o.prefs || {}));
    GG.main.quickStart({ seed: o.seed || 1515, bandId: o.band || 'hail_damage', seat: o.seat || 'drums', openCard: false });
    const s = GG.state; GG.ui.closeAll(); s.card = null; s.phase = 'plan'; s.liveGig = null; GG.ui.gigAutoplay = false;
    if ((o.seat || 'drums') === 'drums') {
      s.gear = Object.assign({}, s.gear, { lanes: o.lanes || 4 });
      const bars = o.bars || ['x.......x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', E, E, E].slice(0, o.lanes || 4);
      const arr = o.arr || ['verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus'];
      s.songs = (o.titles || ['Key Test']).map(t => GG.songs.create(s, { bpm: o.bpm || 90, lanes: o.lanes || 4, arrangement: arr,
        sections: { verse: bars, chorus: bars, bridge: bars.map(() => E) } }, t, { quality: 60, polish: 60 }));
    } else {
      s.gear = Object.assign({}, s.gear, { seatLanes: Object.assign({}, s.gear.seatLanes, { [o.seat]: o.lanes || 4 }) });
      for (let i = 0; i < 2; i++) GG.songs.jam(s, GG.RNG(70 + i));
      s.songs.forEach(x => { x.pattern.bpm = o.bpm || 90; });
    }
    GG.main.sync();
  }, o);
}
async function startGig(page, o) {
  o = o || {};
  await page.evaluate(o => {
    const s = GG.state; GG.ui.closeAll(); s.liveGig = null;
    s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); window.__done = null;
    GG.ui.playGig(s.gig, r => { window.__done = r || true; });
  }, o);
  await waitScreen(page, 'gig-set');
  if (o.pick) await page.evaluate(n => { const st = GG.ui.get('gig-set'); st && GG.state.songs; }, o.pick);
  await page.evaluate(() => document.querySelector('[data-testid="btn-gig-start"]').click());
  await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 12000 });
}
// a synthetic key event on the window (untrusted: exact timing; never waits for a keyup)
const keyEv = (page, type, code, key, extra) => page.evaluate(([type, code, key, extra]) => {
  const ev = new KeyboardEvent(type, Object.assign({ code, key, bubbles: true, cancelable: true }, extra || {}));
  window.dispatchEvent(ev); return ev.defaultPrevented;
}, [type, code, key, extra]);
// the next moment (t > songT + lead) whose notes are exactly these lanes
const nextAt = (page, lanes, lead) => page.waitForFunction(([want, lead]) => {
  const d = GG.debug('gigui'); if (d.mode !== 'play' || !d.soon) return null;
  for (const n of d.soon) {
    if (n.t < d.songT + lead || n.t > d.dur - 1.5) continue;
    const at = d.soon.filter(m => Math.abs(m.t - n.t) < 0.002).map(m => m.li).sort().join();
    if (at === want) return n;
  }
  return null;
}, [lanes.join(), lead || 0.6], { timeout: 10000 }).then(h => h.jsonValue());
// waits until songT >= at, then fires the key (synthetic) and/or a touch on lane `touch`; returns the judged results
const fireAt = (page, at, keys, touch) => page.evaluate(async ([at, keys, touch]) => {
  while (GG.debug('gigui').songT < at - 0.012) await new Promise(r => setTimeout(r, 4));
  while (GG.debug('gigui').songT < at) { /* spin */ }
  const out = [];
  for (const k of keys || []) { window.dispatchEvent(new KeyboardEvent('keydown', { code: k[0], key: k[1], bubbles: true, cancelable: true })); out.push(GG.debug('gigui').last); }
  if (touch != null) {
    const cv = document.querySelector('[data-testid="gig-highway"]'), r = cv.getBoundingClientRect(), lanes = GG.debug('gigui').lanes;
    cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + (touch + 0.5) * r.width / lanes, clientY: r.bottom - 36, pointerId: 31, pointerType: 'touch', isPrimary: false, bubbles: true, cancelable: true }));
    out.push(GG.debug('gigui').last);
  }
  return out;
}, [at, keys, touch]);
const keysOf = page => page.evaluate(() => { const d = GG.debug('gigui'); return { taps: d.keyTaps, sw: d.keySwallowed, lost: d.lostKeyups, last: d.keys.last, down: d.keys.down, held: d.keys.held, stats: d.stats }; });
// presses (trusted) and returns { lane, taps, swallowed } for that one press
async function pressLane(page, key) {
  const a = await keysOf(page);
  await page.keyboard.press(key);
  const b = await keysOf(page);
  return { lane: b.taps > a.taps ? b.last.lane : b.sw > a.sw ? -1 : null, taps: b.taps - a.taps, sw: b.sw - a.sw };
}
// Paused: the song is frozen (songT still after 400 ms, context suspended); `doResume` resumes; then (like pw_gig's v1.4
// check) the song carries on from the pause point: past it, never restarted, the game clock back on the band's.
async function frozenThenResumed(page, doResume) {
  const p1 = (await dbg(page, 'gigui')).songT;
  await page.waitForTimeout(400);
  const p2 = await page.evaluate(() => ({ t: GG.debug('gigui').songT, ctx: GG.audio.context().state, restart: GG.debug('gigui').restart }));
  await doResume();
  await page.waitForFunction(() => !GG.debug('gigui').paused && !GG.debug('gigui').waking, null, { timeout: 5000 });
  await page.waitForTimeout(300);
  const p3 = await page.evaluate(() => { const h = GG.audio.current(), cx = GG.audio.context(), d = GG.debug('gigui');
    return { t: d.songT, mode: d.mode, diff: h ? +((cx.currentTime - d.lat - h.start) - (d.songT - d.D)).toFixed(4) : null }; });
  return { ok: Math.abs(p2.t - p1) < 0.03 && p2.ctx === 'suspended' && p3.mode === 'play' && p3.t > p1 + 0.15 && p3.t < p1 + 6 && p3.diff != null && Math.abs(p3.diff) < 0.03,
    info: JSON.stringify({ pauseT: +p1.toFixed(3), frozen: +p2.t.toFixed(3), ctx: p2.ctx, after: +p3.t.toFixed(3), onBand: p3.diff }) };
}
async function cdpKey(cdp, type, code, key, vk, o) {
  await cdp.send('Input.dispatchKeyEvent', Object.assign({ type, code, key, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }, o || {}));
}

/* ---- keys ---------------------------------------------------------------------------------------------------------- */
async function keys() {
  const c = checker('keys');
  const { page, errors, close } = await boot();
  try {
    const mode = await dbg(page, 'input');
    c.ok(mode.desk === true && mode.mode === 'keys', 'a computer starts on keys ' + JSON.stringify(mode));
    // drums: 4 / 5 / 6 lanes (owner Q1 "strong fingers")
    const KIT = [['Space', 0], ['KeyD', 1], ['KeyF', 2], ['KeyS', 3], ['ShiftLeft', 4], ['KeyA', 5]];
    for (const lanes of [4, 5, 6]) {
      await career(page, { seat: 'drums', lanes, bars: ['x.......x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', E, '..x...........x.', '......x.......x.'].slice(0, lanes) });
      await startGig(page);
      if (lanes === 4) {
        const leg = await page.evaluate(() => null);
        const d = await dbg(page, 'gigui');
        c.ok(d.keys.caps === true && d.keys.input === 'keys' && JSON.stringify(d.keys.labels) === '["Space","D","F","S"]', 'drums 4: keycaps on the lanes ' + JSON.stringify(d.keys));
      }
      const got = [];
      for (const [k, lane] of KIT) { const r = await pressLane(page, k); got.push(k + '>' + r.lane); c.ok(lane < lanes ? r.lane === lane && r.taps === 1 : r.lane === -1 && r.sw === 1, `drums ${lanes}: ${k} -> ${lane < lanes ? 'lane ' + lane : 'swallowed'} (got ${r.lane})`); }
      // the v1.4 extras J K L G H (columns) while unbound; G / H only on 5 / 6 lanes
      for (const [k, col] of [['KeyJ', 2], ['KeyK', 3], ['KeyL', 3], ['KeyG', 4], ['KeyH', 5]]) {
        const r = await pressLane(page, k);
        c.ok(col < lanes ? r.lane === col : r.taps === 0 && r.sw === 0, `drums ${lanes}: ${k} (v1.4 extra) -> ${col < lanes ? 'column ' + col : 'nothing'} (got ${r.lane})`);
      }
      if (lanes === 4) {
        // a code-less 'd' (v1.4: pw_gig bridge) = column 0 = the kick
        const a = await keysOf(page); await keyEv(page, 'keydown', '', 'd'); const b = await keysOf(page);
        c.ok(b.taps === a.taps + 1 && b.last.lane === 0, "a code-less 'd' plays column 0 like v1.4 (" + (b.last && b.last.lane) + ')');
        // Shift held + D: still the snare (shiftKey never skips a tap)
        await page.keyboard.down('Shift'); const r = await pressLane(page, 'KeyD'); await page.keyboard.up('Shift');
        c.ok(r.lane === 1 && r.taps === 1, 'Shift held + D = the snare ' + JSON.stringify(r));
        // repeat: a second keydown of a held key (repeat: true) is ignored
        const a2 = await keysOf(page); await page.keyboard.down('KeyF'); await page.keyboard.down('KeyF'); await page.keyboard.up('KeyF'); const b2 = await keysOf(page);
        c.ok(b2.taps === a2.taps + 1 && !b2.down.length, 'a held key repeats nothing (1 tap) ' + (b2.taps - a2.taps));
        // Ctrl+D: no tap, the bookmark is prevented
        await page.evaluate(() => { window.__ctl = null; window.addEventListener('keydown', e => { if (e.ctrlKey && e.code === 'KeyD') window.__ctl = e.defaultPrevented; }, { once: false }); });
        const a3 = await keysOf(page); await page.keyboard.press('Control+KeyD'); const b3 = await keysOf(page);
        c.ok(b3.taps === a3.taps && await page.evaluate(() => window.__ctl === true), 'Ctrl+D: no tap, prevented ' + (b3.taps - a3.taps));
        // Space and Tab never act natively mid-song
        const sp = await keyEv(page, 'keydown', 'Space', ' '), tb = await keyEv(page, 'keydown', 'Tab', 'Tab');
        c.ok(sp && tb, 'Space and Tab are prevented mid-song ' + sp + ' ' + tb);
      }
      await page.evaluate(() => GG.ui.closeAll());
    }
    // the setlist legend (a computer): dots + caps + Change keys
    await career(page, { seat: 'drums', lanes: 4 });
    await page.evaluate(() => { const s = GG.state; s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); GG.ui.playGig(s.gig, () => {}); });
    await waitScreen(page, 'gig-set');
    const leg = await page.evaluate(() => { const e = document.querySelector('[data-testid="gig-keys"]'); return e ? { text: e.textContent, caps: e.querySelectorAll('.kcap').length, change: !!e.querySelector('[data-testid="gig-keys-change"]') } : null; });
    c.ok(leg && leg.caps === 5 && /Space/.test(leg.text) && /Kick/.test(leg.text) && leg.change, 'gig-keys legend on the setlist ' + JSON.stringify(leg));
    await page.locator(tid('gig-keys-change')).click();
    await waitScreen(page, 'settings');
    c.ok(await page.locator(tid('set-keys')).count() === 1, 'Change keys opens Settings > Keys');
    await page.evaluate(() => GG.ui.closeAll());
    // strings (owner Q2): A S D F (+ Space top on 5, Shift 5th + Space top on 6)
    const STR = { 4: [['KeyA', 0], ['KeyS', 1], ['KeyD', 2], ['KeyF', 3], ['ShiftLeft', -1], ['Space', -1]],
      5: [['KeyA', 0], ['KeyS', 1], ['KeyD', 2], ['KeyF', 3], ['ShiftLeft', -1], ['Space', 4]],
      6: [['KeyA', 0], ['KeyS', 1], ['KeyD', 2], ['KeyF', 3], ['ShiftLeft', 4], ['Space', 5]] };
    for (const [seat, lanes] of [['bass', 4], ['bass', 5], ['rhythm', 6]]) {
      await career(page, { seat, lanes });
      await startGig(page);
      const d = await dbg(page, 'gigui');
      c.ok(d.lanes === lanes && d.keys.kind === 'strings', `${seat} ${lanes}: string map (${d.lanes} lanes, ${d.keys.kind})`);
      for (const [k, lane] of STR[lanes]) {
        const r = await pressLane(page, k);
        c.ok(lane >= 0 ? r.lane === lane : r.lane === -1 && r.taps === 0, `${seat} ${lanes}: ${k} -> ${lane >= 0 ? 'lane ' + lane : 'swallowed'} (got ${r.lane})`);
      }
      if (lanes === 6) {
        // a hold on keys: the press holds the note, its keyup lifts it (Shift on the 5th string when there is one)
        const h = await page.waitForFunction(() => {
          const d = GG.debug('gigui'); if (d.mode !== 'play' || !d.soon) return null;
          const hs = d.soon.filter(n => n.hold && !n.run && !n.chord && n.len >= 0.4 && n.t > d.songT + 0.5 && n.t + n.len < d.dur - 1);
          return hs.find(n => n.li === 4) || hs[0] || null;
        }, null, { timeout: 20000 }).then(x => x.jsonValue()).catch(() => null);
        if (!h) c.ok(false, 'rhythm 6: no hold found in 20 s');
        else {
          const code = d.keys.map[h.li], key = code === 'ShiftLeft' ? 'Shift' : code === 'Space' ? ' ' : code.slice(3).toLowerCase();
          // press at the head, read it ~120 ms in, lift it at once (all in the page: a slow round trip under load could let the
          // hold ring out first)
          const hr = await page.evaluate(async ([h, code, key]) => {
            while (GG.debug('gigui').songT < h.t - 0.012) await new Promise(r => setTimeout(r, 4));
            while (GG.debug('gigui').songT < h.t) { /* spin */ }
            window.dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true }));
            const press = GG.debug('gigui').last;
            await new Promise(r => setTimeout(r, 120));
            const mid = GG.debug('gigui');
            window.dispatchEvent(new KeyboardEvent('keyup', { code, key, bubbles: true, cancelable: true }));
            const end = GG.debug('gigui');
            return { press: press && press.judgement, midT: +(mid.songT - h.t).toFixed(3), mid: { holding: mid.holding, held: mid.keys.held, relN: mid.relN }, end: { holding: end.holding, held: end.keys.held, relN: end.relN } };
          }, [h, code, key]);
          const ringing = hr.midT < h.len - 0.05;   // (a stalled page can still pass the hold's end: then nothing is left to lift)
          c.ok(hr.mid.holding.includes(h.li) && hr.mid.held.includes(code) || !ringing, `rhythm 6: ${code} holds lane ${h.li} ` + JSON.stringify(hr));
          c.ok(!hr.end.holding.includes(h.li) && !hr.end.held.length && (hr.end.relN > hr.mid.relN || !ringing), `rhythm 6: its keyup lifts it (voice released) ` + JSON.stringify(hr.end));
        }
        // Shift held (trusted): one press, held under its id until it comes up
        await page.keyboard.down('Shift');
        const sh = await keysOf(page);
        await page.keyboard.up('Shift');
        const su = await keysOf(page);
        c.ok(sh.down.includes('ShiftLeft') && !su.down.length && !su.held.length, 'rhythm 6: Shift down / up leaves nothing held ' + JSON.stringify({ down: sh.down, after: su.down, held: su.held }));
      }
      await page.evaluate(() => GG.ui.closeAll());
    }
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

/* ---- fair ---------------------------------------------------------------------------------------------------------- */
async function fair() {
  const c = checker('fair');
  const { page, errors, close } = await boot();
  const toTouch = () => page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true })));
  const toKeys = () => page.keyboard.press('KeyQ');
  try {
    for (const sync of [true, false]) {
      // kick alone on 1, kick + snare on 2, kick + hats + crash on 3, snare alone on 4, hats alone in between
      await career(page, { seat: 'drums', lanes: 4, prefs: { drumSync: sync, gigDifficulty: 'hard' }, bars: ['x...x...x.......', '....x.......x...', '..x...x.x.x...x.', '........x.......'] });   // + kick + hats + crash on 3: the two-thumb rule makes one an auto note
      await page.evaluate(() => {
        GG.save.saveSettings({ calib: { speaker: { audio: 0, visual: 0, at: 1, vat: 1 }, headphones: { audio: 0, visual: 0, at: 0, vat: 0 } },
          calibKb: { speaker: { audio: 60, visual: 40, at: 1, vat: 1 }, headphones: { audio: 0, visual: 0, at: 0, vat: 0 } }, audioProfile: 'speaker' });
      });
      // a song played on keys
      await toKeys(); await startGig(page);
      const k = await dbg(page, 'gigui');
      c.ok(k.keys.input === 'keys' && k.off.audio === 60 && k.off.visual === 40 && k.offT === 0 && k.offK === 60, `sync ${sync}: a key song takes the key timing ` + JSON.stringify({ input: k.keys.input, off: k.off, offT: k.offT, offK: k.offK }));
      const kVis = Math.round(k.vis * 1000);
      c.ok(sync ? (k.sync ? kVis === 40 : true) : kVis === -20, `sync ${sync}: key song highway offset ${kVis} ms (${sync ? 'the key light check 40' : 'visual - audio = -20'}; sync live ${k.sync})`);
      // keys and touches judged by their own source: a key 60 ms late (its click test) = a touch on time
      const res = [];
      for (let i = 0; i < 4; i++) {
        const n = await nextAt(page, [1], 0.5);
        const r = i % 2 ? await fireAt(page, n.t + (sync ? 0 : 0.06), [['KeyD', 'd']]) : await fireAt(page, n.t, null, 1);
        res.push({ src: i % 2 ? 'key' : 'touch', j: r[0] && r[0].judgement, off: r[0] && r[0].offset != null ? Math.round(r[0].offset * 1000) : null });
      }
      const ks = res.filter(r => r.src === 'key'), ts = res.filter(r => r.src === 'touch');
      c.ok(ks.every(r => r.j === "perfect" && Math.abs(r.off) <= 20) && ts.every(r => r.j === "perfect" && Math.abs(r.off) <= 20),
        `sync ${sync}: equal grades at equal perceived offsets (key ${sync ? '' : '+60 ms '}vs touch on time) ` + JSON.stringify(res));
      // chords: two keys at once = two lanes (kick + snare), like two thumbs
      const ch = await nextAt(page, [0, 1], 0.5).catch(() => null);
      if (ch) {
        const st0 = (await dbg(page, 'gigui')).stats;
        await fireAt(page, ch.t + (sync ? 0 : 0.06), [['Space', ' '], ['KeyD', 'd']]);
        const st1 = (await dbg(page, 'gigui')).stats;
        c.ok(st1.perfect + st1.good - st0.perfect - st0.good === 2 && st1.stray === st0.stray, `sync ${sync}: Space + D on a kick + snare chord = 2 hits`);
      }
      const autoK = k.auto;
      await page.evaluate(() => GG.ui.closeAll());
      // the same song on touch
      await toTouch();
      c.ok((await dbg(page, 'input')).mode === 'touch', `sync ${sync}: a touch switches the input to touch`);
      await startGig(page);
      const t = await dbg(page, 'gigui');
      const tVis = Math.round(t.vis * 1000);
      c.ok(t.keys.input === 'touch' && t.off.audio === 0 && !t.keys.caps, `sync ${sync}: a touch song takes the touch timing, no keycaps ` + JSON.stringify({ input: t.keys.input, off: t.off }));
      c.ok(tVis === 0, `sync ${sync}: touch song highway offset ${tVis} ms (the touch calibration 0)`);
      c.ok(t.auto === autoK && autoK > 0, `sync ${sync}: same chart for keys and touch: a 3-drum moment keeps one auto note (two-thumb cap 2) (${autoK} / ${t.auto})`);
      await page.evaluate(() => GG.ui.closeAll());
    }
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

/* ---- stuck --------------------------------------------------------------------------------------------------------- */
async function stuck() {
  const c = checker('stuck');
  const { page, errors, close } = await boot();
  try {
    const cdp = await page.context().newCDPSession(page);
    // a 4-string bass: A = the low string
    await career(page, { seat: 'bass', lanes: 4 });
    await startGig(page);
    await page.keyboard.down('KeyA');
    let k = await keysOf(page);
    c.ok(k.down.includes('KeyA') && k.held.includes('KeyA'), 'A held: down + held ' + JSON.stringify(k.down));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => GG.debug('gigui').paused);
    k = await keysOf(page);
    c.ok(!k.down.length && !k.held.length, 'Esc pauses and lets A go ' + JSON.stringify({ down: k.down, held: k.held }));
    await page.keyboard.up('KeyA');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !GG.debug('gigui').paused && GG.debug('gigui').mode === 'play', null, { timeout: 5000 });
    let r = await pressLane(page, 'KeyA');
    c.ok(r.lane === 0 && r.taps === 1, 'after resume A taps again ' + JSON.stringify(r));
    // two non-repeat keydowns, no keyup (a lost keyup) -> two taps
    const a = await keysOf(page);
    await cdpKey(cdp, 'keyDown', 'KeyS', 's', 83, { text: 's' });
    await cdpKey(cdp, 'keyDown', 'KeyS', 's', 83, { text: 's' });
    const b = await keysOf(page);
    c.ok(b.taps === a.taps + 2 && b.lost === a.lost + 1, 'two keydowns of S with no keyup = two taps (one lost keyup) ' + JSON.stringify({ taps: b.taps - a.taps, lost: b.lost - a.lost }));
    await cdpKey(cdp, 'keyUp', 'KeyS', 's', 83);
    // Shift down, A down, Shift up, A up with no code -> nothing stuck
    await cdpKey(cdp, 'rawKeyDown', 'ShiftLeft', 'Shift', 16, { modifiers: 8, location: 1 });
    await cdpKey(cdp, 'keyDown', 'KeyA', 'A', 65, { modifiers: 8, text: 'A' });
    await cdpKey(cdp, 'keyUp', 'ShiftLeft', 'Shift', 16, { location: 1 });
    await keyEv(page, 'keyup', '', 'a');
    k = await keysOf(page);
    c.ok(!k.down.length && !k.held.length, 'Shift / A / Shift up / code-less a up: nothing stuck ' + JSON.stringify({ down: k.down, held: k.held }));
    // right-click on the stage: no context menu
    await page.evaluate(() => { window.__cm = []; document.addEventListener('contextmenu', e => window.__cm.push(e.defaultPrevented)); });
    await page.mouse.click(DESK.width / 2, 120, { button: 'right' });
    const hw = await page.evaluate(() => { const r = document.querySelector('[data-testid="gig-highway"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 20 }; });
    await page.mouse.click(hw.x, hw.y, { button: 'right' });
    const cm = await page.evaluate(() => window.__cm);
    c.ok(cm.length === 2 && cm.every(Boolean), 'right-click on the stage and the highway: no menu ' + JSON.stringify(cm));
    await page.evaluate(() => GG.ui.closeAll());
    // A held across a song's end -> A taps in the next song (6-lane kit: A = the ride)
    await career(page, { seat: 'drums', lanes: 6, bpm: 160, arr: ['verse', 'chorus'], titles: ['Short One', 'Short Two'], bars: ['x.......x.......', '....x.......x...', E, E, E, 'x...x...x...x...'] });
    await startGig(page);
    const d0 = await dbg(page, 'gigui');
    await page.waitForFunction(dur => GG.debug('gigui').songT > dur - 1.2, d0.dur);
    await cdpKey(cdp, 'keyDown', 'KeyA', 'a', 65, { text: 'a' });
    await page.waitForFunction(() => GG.debug('gigui').mode === 'between', null, { timeout: 10000 });
    k = await keysOf(page);
    c.ok(!k.down.length, 'the song end lets every key go ' + JSON.stringify(k.down));
    await page.waitForTimeout(650);
    await page.evaluate(() => document.querySelector('[data-testid="btn-gig-next"]').click());
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 10000 });
    const a2 = await keysOf(page);
    await cdpKey(cdp, 'keyDown', 'KeyA', 'a', 65, { text: 'a' });
    const b2 = await keysOf(page);
    c.ok(b2.taps === a2.taps + 1 && b2.last.lane === 5 && b2.lost === a2.lost, 'A (held over the end) taps the ride in the next song ' + JSON.stringify({ taps: b2.taps - a2.taps, lane: b2.last.lane }));
    await cdpKey(cdp, 'keyUp', 'KeyA', 'a', 65);
    await page.evaluate(() => GG.ui.closeAll());
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

/* ---- space --------------------------------------------------------------------------------------------------------- */
async function space() {
  const c = checker('space');
  const { page, errors, close } = await boot();
  try {
    await career(page, { seat: 'drums', lanes: 4 });
    await startGig(page);
    // the pause button focused by the mouse (pressed, dragged off, let go: focus, no click)
    const pb = await page.evaluate(() => { const r = document.querySelector('[data-testid="btn-gig-pause"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.move(pb.x, pb.y); await page.mouse.down(); await page.mouse.move(pb.x - 200, pb.y + 200); await page.mouse.up();
    const foc = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-testid'));
    const a = await keysOf(page);
    for (let i = 0; i < 40; i++) await page.keyboard.press('Space');
    const b = await keysOf(page), d = await dbg(page, 'gigui');
    c.ok(!d.paused && b.taps === a.taps + 40, `40 Space with ${foc || 'nothing'} focused: no pause, 40 kicks (${b.taps - a.taps})`);
    await page.evaluate(() => GG.ui.closeAll());
    // gg-kbnav: Space mashed over the end never skips the between card or the results; a fresh Enter after 600 ms does
    await career(page, { seat: 'drums', lanes: 4, bpm: 160, arr: ['verse', 'chorus'], titles: ['Mash One', 'Mash Two'] });
    await page.evaluate(() => document.documentElement.classList.add('gg-kbnav'));
    await startGig(page);
    const mash = async (until) => {
      for (let i = 0; i < 120; i++) {
        await page.keyboard.press('Space');
        if (await page.evaluate(u => u(), until).catch(() => false)) break;
      }
    };
    for (let song = 0; song < 2; song++) {
      const d0 = await dbg(page, 'gigui');
      await page.waitForFunction(dur => GG.debug('gigui').songT > dur - 0.8, d0.dur, { timeout: 15000 });
      // mash over the end until the card is ~250 ms old (its own clock: debug cardAge), well inside the 600 ms arm
      let pressedOnCard = 0;
      for (let i = 0; i < 300; i++) {
        const st = await page.evaluate(() => { const d = GG.debug('gigui'); return { mode: d.mode, age: d.cardAge }; });
        if (st.mode === 'between' && st.age > 250) break;
        await page.keyboard.press('Space');
        if (st.mode === 'between') pressedOnCard++;
        await page.waitForTimeout(25);
      }
      await page.waitForFunction(() => GG.debug('gigui').cardAge > 700, null, { timeout: 5000 });
      const mid = await dbg(page, 'gigui');
      const focus = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-testid'));
      c.ok(mid.mode === 'between' && mid.index === song + 1 && (pressedOnCard > 0 || mid.cardRej > 0), `song ${song + 1}: Space mashed past the end kept the between card (${mid.mode}, ${pressedOnCard} presses on the card, ${mid.cardRej} swallowed)`);
      c.ok(focus === 'btn-gig-next', 'the card button takes focus after 600 ms on keys: ' + focus);
      await page.keyboard.press('Enter');
      if (song === 0) {
        await page.waitForFunction(() => /^(count|play|hold)$/.test(GG.debug('gigui').mode), null, { timeout: 5000 });
        c.ok(true, 'a fresh Enter after 600 ms starts the next song');
        await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 8000 });
      }
    }
    await waitScreen(page, 'gig-results', 10000);
    let onRes = 0;
    for (let i = 0; i < 100; i++) {
      const age = await page.evaluate(() => GG.debug('gigui').cardAge);
      if (age == null || age > 250) break;
      await page.keyboard.press('Space'); onRes++;
      await page.waitForTimeout(20);
    }
    await page.waitForFunction(() => GG.debug('gigui').cardAge > 700, null, { timeout: 5000 });
    c.ok(onRes > 0 && (await dbg(page, 'ui')).screen === 'gig-results' && !(await page.evaluate(() => window.__done)), `Space mashed on the results (${onRes} presses) never skips them`);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__done, null, { timeout: 5000 });
    c.ok(true, 'a fresh Enter after 600 ms wraps up (btn-gig-done)');
    await page.evaluate(() => { document.documentElement.classList.remove('gg-kbnav'); GG.ui.closeAll(); });
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

/* ---- esc ----------------------------------------------------------------------------------------------------------- */
async function esc() {
  const c = checker('esc');
  const { page, errors, close } = await boot();
  try {
    await career(page, { seat: 'drums', lanes: 4 });
    await startGig(page);
    await page.waitForFunction(() => GG.debug('gigui').songT > 2);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => GG.debug('gigui').paused);
    const p = await page.evaluate(() => { const e = document.querySelector('[data-testid="gig-pause-keys"]'); return { live: GG.debug('input').live, keys: e ? e.textContent : null, vis: !!(e && e.getClientRects().length) }; });
    c.ok(p.vis && /Esc/.test(p.keys) && p.live === false, 'Esc pauses; the card says "Esc to resume"; gigLive off ' + JSON.stringify(p));
    // to Restart: the menu router's arrows when it is in the tree, else focus() (Lane N owns the arrows)
    await page.keyboard.press('ArrowDown');
    let f = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-testid'));
    c.ok(f === 'btn-gig-resume' || f === 'btn-gig-restart', 'v1.5 review: ArrowDown with nothing focused on the pause card reaches its buttons (' + f + ')');
    if (f !== 'btn-gig-restart') { await page.keyboard.press('ArrowDown'); f = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-testid')); }
    const viaRouter = f === 'btn-gig-restart';
    if (!viaRouter) await page.evaluate(() => document.querySelector('[data-testid="btn-gig-restart"]').focus());
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !GG.debug('gigui').paused && GG.debug('gigui').songT < 0.5, null, { timeout: 5000 });
    const r = await dbg(page, 'gigui');
    c.ok(r.index === 0 && r.songT < 0.5 && GG_ok(r), 'Enter on Restart starts the song over (' + (viaRouter ? 'arrows' : 'focus()') + ', songT ' + r.songT.toFixed(2) + ')');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play' && GG.debug('gigui').songT > 1.5, null, { timeout: 8000 });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => GG.debug('gigui').paused);
    const fr = await frozenThenResumed(page, () => page.keyboard.press('Escape'));
    c.ok(fr.ok, 'Esc pauses frozen, Esc resumes where it stopped ' + fr.info);
    c.ok(await page.evaluate(() => GG.debug('input').live === true), 'gigLive back on after resume');
    await page.evaluate(() => GG.ui.closeAll());
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}
function GG_ok(r) { return r && r.mode !== 'between'; }

/* ---- blur ---------------------------------------------------------------------------------------------------------- */
async function blur() {
  const c = checker('blur');
  const { page, errors, close } = await boot();
  try {
    await career(page, { seat: 'bass', lanes: 4 });
    await startGig(page);
    await page.waitForFunction(() => GG.debug('gigui').songT > 2);
    await page.keyboard.down('KeyA');
    const k0 = await keysOf(page);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    const d = await dbg(page, 'gigui'), k1 = await keysOf(page);
    c.ok(k0.held.includes('KeyA') && d.paused && d.restart === false, 'a window blur mid-song pauses frozen (restart false) ' + JSON.stringify({ paused: d.paused, restart: d.restart, held0: k0.held }));
    c.ok(!k1.held.length && !k1.down.length && !d.holding.length, 'held strings let go on blur ' + JSON.stringify({ held: k1.held, down: k1.down, holding: d.holding }));
    const note = await page.evaluate(() => document.querySelector('[data-testid="gig-paused"] .small.dim').textContent);
    c.ok(/frozen/.test(note), 'the card says frozen mid-riff: ' + note);
    await page.keyboard.up('KeyA');
    const fr = await frozenThenResumed(page, () => page.keyboard.press('Escape'));
    c.ok(fr.ok, 'frozen on blur; resume carries on from pauseT ' + fr.info);
    // a touch song with no key tapped: a blur only lets go (v1.4: no pause)
    await page.evaluate(() => GG.ui.closeAll());
    await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true })));
    await startGig(page);
    await page.waitForFunction(() => GG.debug('gigui').songT > 1);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    c.ok(!(await dbg(page, 'gigui')).paused, 'a touch song with no key tapped keeps playing through a blur (as v1.4)');
    await page.evaluate(() => GG.ui.closeAll());
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

/* ---- rebind -------------------------------------------------------------------------------------------------------- */
async function rebind() {
  const c = checker('rebind');
  const { page, errors, close } = await boot();
  const msg = () => page.locator(tid('set-keys-msg')).textContent();
  const map = () => page.evaluate(() => GG.prefs.get().keymap);
  try {
    await career(page, { seat: 'drums', lanes: 4 });
    await page.evaluate(() => GG.ui.show('settings', { tab: 'keys' }));
    await page.waitForSelector(tid('set-keys'));
    const chips = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="set-key-drums-"]')].map(e => e.textContent));
    c.ok(chips.length === 6 && /Kick.*Space/.test(chips[0]) && /Ride.*A/.test(chips[5]), 'six drum chips with their keys ' + JSON.stringify(chips));
    c.ok(await page.locator(tid('set-keys-pos')).count() === 1 && await page.locator(tid('set-keys-sticky')).count() === 1, 'position note + Sticky Keys note (Shift is bound)');
    c.ok(await page.locator(tid('set-layout-auto')).count() === 1 && await page.locator(tid('set-calibrate-keys')).count() === 1, 'Layout row + Key timing');
    // bind: Hats -> K
    await page.locator(tid('set-key-drums-2')).click();
    await page.waitForFunction(() => GG.debug('input').captured);
    await page.keyboard.press('KeyK');
    await page.waitForFunction(() => GG.prefs.get().keymap.drums[2] === 'KeyK', null, { timeout: 3000 });
    c.ok(/Hats is now K/.test(await msg()), 'bind: ' + await msg());
    // swap: Crash (S) -> K: Hats takes S
    await page.locator(tid('set-key-drums-3')).click();
    await page.waitForFunction(() => GG.debug('input').captured);
    await page.keyboard.press('KeyK');
    await page.waitForFunction(() => GG.prefs.get().keymap.drums[3] === 'KeyK', null, { timeout: 3000 });
    let m = await map();
    c.ok(m.drums[2] === 'KeyS' && /Swapped: Hats is now S/.test(await msg()), 'swap on a conflict: ' + await msg() + ' ' + m.drums.join(' '));
    // refused: Tab / Enter / F5 (the chip keeps waiting), Esc cancels
    await page.locator(tid('set-key-drums-1')).click();
    await page.waitForFunction(() => GG.debug('input').captured);
    await page.keyboard.press('Tab');
    const t1 = await msg();
    await page.keyboard.press('Enter');
    const t2 = await msg();
    await page.keyboard.press('F5');
    const t3 = await msg();
    c.ok(/Tab is for menus/.test(t1) && /Enter is for menus/.test(t2) && /F5/.test(t3) && await page.evaluate(() => GG.debug('input').captured), 'Tab / Enter / F5 refused, still waiting: ' + [t1, t2, t3].join(' | '));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !GG.debug('input').captured);
    c.ok(/Cancelled/.test(await msg()) && (await map()).drums[1] === 'KeyD' && (await dbg(page, 'ui')).screen === 'settings', 'Esc cancels (Settings stays open): ' + await msg());
    // a rebind started with Enter: no "Enter is for menus"
    await page.locator(tid('set-key-drums-1')).focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => GG.debug('input').captured);
    await page.waitForTimeout(100);
    const t4 = await msg();
    c.ok(!/Enter is for menus/.test(t4) && /Press the new key/.test(t4), 'a rebind started with Enter waits quietly: ' + t4);
    await page.keyboard.press('KeyJ');
    await page.waitForFunction(() => GG.prefs.get().keymap.drums[1] === 'KeyJ', null, { timeout: 3000 });
    c.ok(true, 'then J binds the snare');
    // a click elsewhere cancels; 8 s timeout is not waited for here
    await page.locator(tid('set-key-drums-0')).click();
    await page.waitForFunction(() => GG.debug('input').captured);
    await page.mouse.click(5, 5);
    await page.waitForFunction(() => !GG.debug('input').captured);
    c.ok((await map()).drums[0] === 'Space', 'a click elsewhere cancels a rebind');
    await page.locator(tid('set-key-drums-0')).click();
    await page.waitForFunction(() => GG.debug('input').captured);
    await page.evaluate(() => GG.ui.close('settings'));
    c.ok(!(await page.evaluate(() => GG.debug('input').captured)), 'closing Settings mid-rebind gives the keys back');
    await page.evaluate(() => GG.ui.show('settings', { tab: 'keys' }));
    // reload keeps the map
    await page.reload(); await page.waitForSelector(tid('btn-new'), { timeout: 30000 });
    m = await map();
    c.ok(m.drums.join() === 'Space,KeyJ,KeyS,KeyK,ShiftLeft,KeyA', 'a reload keeps the map ' + m.drums.join(' '));
    // used in the gig: K plays the crash now (not column 3 by chance: J was column 2, now the snare), keycaps follow
    await career(page, { seat: 'drums', lanes: 4 });
    await startGig(page);
    const d = await dbg(page, 'gigui');
    c.ok(JSON.stringify(d.keys.labels) === '["Space","J","S","K"]', 'keycaps follow the map ' + JSON.stringify(d.keys.labels));
    let r = await pressLane(page, 'KeyJ');
    c.ok(r.lane === 1, 'J plays the snare (bound) ' + r.lane);
    r = await pressLane(page, 'KeyS');
    c.ok(r.lane === 2, 'S plays the hats ' + r.lane);
    r = await pressLane(page, 'KeyD');
    c.ok(r.taps === 0 && r.sw === 0, 'D (now unbound) is no gig key ' + JSON.stringify(r));
    await page.evaluate(() => GG.ui.closeAll());
    // reset
    await page.evaluate(() => GG.ui.show('settings', { tab: 'keys' }));
    await page.locator(tid('set-keys-reset')).click();
    m = await map();
    c.ok(m.drums.join() === 'Space,KeyD,KeyF,KeyS,ShiftLeft,KeyA' && !('drums' in (await page.evaluate(() => GG.save.settings().keymap || {}))), 'reset: the defaults, nothing stored for drums');
    // strings map is its own
    await page.locator(tid('set-keys-kind-strings')).click();
    const sc = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="set-key-strings-"]')].map(e => e.textContent));
    c.ok(sc.length === 6 && /Low.*A/.test(sc[0]) && /Top.*Space/.test(sc[5]) && /5th.*Shift/.test(sc[4]), 'the string chips ' + JSON.stringify(sc));
    // the PC layout (B): a tab rail, the key timing card in the right column, the key calibration docked over it
    await page.setViewportSize({ width: 1440, height: 900 });
    const wd = await page.waitForFunction(() => document.documentElement.classList.contains('gg-wide'), null, { timeout: 8000 }).then(() => null, () => page.evaluate(() => JSON.stringify(Object.assign({ cls: document.documentElement.className, w: innerWidth }, GG.debug('input')))));
    c.ok(!wd, 'the PC layout switches on at 1440x900 ' + (wd || ''));
    const w = await page.evaluate(() => ({ rail: !!document.querySelector('[data-testid="set-rail-keys"]'), main: !!document.querySelector('.set-wide > .set-main #set-keys'),
      col: !!document.querySelector('#set-keys .w2 > .w2-b [data-testid="set-keys-timing"]') }));
    c.ok(w.rail && w.main && w.col, 'PC layout: tab rail, sections column, timing card in the right column ' + JSON.stringify(w));
    await page.locator(tid('set-calibrate-keys')).click();
    await waitScreen(page, 'calib');
    const dk = await page.evaluate(() => ({ docked: document.querySelector('.layer[data-screen="calib"]').classList.contains('calib-docked'),
      setVisible: !document.querySelector('.layer[data-screen="settings"]').classList.contains('hidden'), inert: document.querySelector('.layer[data-screen="settings"]').hasAttribute('inert') }));
    c.ok(dk.docked && dk.setVisible && dk.inert, 'the key calibration docks over Settings (visible, inert) ' + JSON.stringify(dk));
    await page.setViewportSize(DESK);
    await page.evaluate(() => GG.ui.closeAll());
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

/* ---- calib-keys ---------------------------------------------------------------------------------------------------- */
async function calibKeys() {
  const c = checker('calib-keys');
  const { page, errors, close } = await boot();
  const pressOn = async (t, late) => { await page.evaluate(t => new Promise(r => { const f = () => performance.now() >= t ? r() : setTimeout(f, 1); f(); }), t + late); await page.keyboard.press('Space'); };
  try {
    await page.evaluate(() => GG.save.saveSettings({ calib: { speaker: { audio: 25, visual: 10, at: 1, vat: 1 }, headphones: { audio: 0, visual: 0, at: 0, vat: 0 } }, audioProfile: 'speaker' }));
    await page.evaluate(() => GG.ui.show('settings', { tab: 'keys' }));
    await page.locator(tid('set-calibrate-keys')).click();
    await waitScreen(page, 'calib');
    c.ok(await page.evaluate(() => GG.debug('calib').input === 'keys' && !!document.querySelector('[data-testid="calib-input-keys"].primary')), 'Key timing opens the calibration on keys');
    await page.locator(tid('calib-start')).click();
    await page.waitForFunction(() => GG.debug('calib').step === 'audio' && GG.debug('calib').capturing, null, { timeout: 10000 });
    const clicks = (await dbg(page, 'calib')).clicks;
    for (let i = 0; i < clicks.length; i++) {
      if (i === 2) {   // a key held ~1 s with OS repeats = one tap
        const cdp = await page.context().newCDPSession(page);
        await page.evaluate(t => new Promise(r => { const f = () => performance.now() >= t ? r() : setTimeout(f, 1); f(); }), clicks[i] + 30);
        await page.keyboard.down('KeyJ');
        for (let k = 0; k < 8; k++) { await page.waitForTimeout(60); await cdpKey(cdp, 'keyDown', 'KeyJ', 'j', 74, { autoRepeat: true, text: 'j' }); }
        await page.keyboard.up('KeyJ');
        i++;   // the held key covered click 3 too
        continue;
      }
      await pressOn(clicks[i], 30);
    }
    await page.waitForFunction(() => GG.debug('calib').step === 'audioDone', null, { timeout: 5000 });
    const au = await dbg(page, 'calib');
    c.ok(au.audio && au.audio.ok && au.taps.length === clicks.length - 1, `click test on keys: ${au.audio && au.audio.offset} ms, ${au.taps.length} taps for ${clicks.length} clicks (the held key = 1)`);
    await page.locator(tid('calib-visual-start')).click();
    await page.waitForFunction(() => GG.debug('calib').step === 'visual' && GG.debug('calib').capturing, null, { timeout: 10000 });
    for (let i = 0; i < 8; i++) {
      await page.waitForFunction(n => GG.debug('calib').clicks.filter(x => x != null).length > n, i, { timeout: 3000 });
      await page.waitForTimeout(20);
      await page.keyboard.press('Space');
    }
    await page.waitForFunction(() => GG.debug('calib').step === 'visualDone', null, { timeout: 5000 });
    await page.locator(tid('calib-save')).click();
    const s = await page.evaluate(() => { const p = GG.prefs.get(); return { kb: p.calibKb.speaker, touch: p.calib.speaker, keys: GG.prefs.calibFor(p, 'keys'), t: GG.prefs.calibFor(p, 'touch') }; });
    c.ok(s.kb.at > 0 && s.kb.vat > 0 && Math.abs(s.kb.audio - au.audio.offset) <= 1 && s.kb.audio > 0, 'both key steps write calibKb ' + JSON.stringify(s.kb));
    c.ok(s.touch.audio === 25 && s.touch.visual === 10 && s.touch.at === 1, 'the touch calibration is untouched ' + JSON.stringify(s.touch));
    c.ok(s.keys.audio === s.kb.audio && s.t.audio === 25, 'keys use calibKb, touch keeps calib ' + JSON.stringify({ keys: s.keys, touch: s.t }));
    // the Settings card shows it
    const card = await page.evaluate(() => GG.ui.show('settings', { tab: 'keys' }) && document.querySelector('[data-testid="set-keys-timing"]').textContent);
    c.ok(/✓/.test(card) && !/Speaker: click test not tested/.test(card), 'the timing card shows the result: ' + card.slice(0, 120));
    // light check only on the headphones profile: keeps the touch audio (fallback)
    await page.evaluate(() => { GG.save.saveSettings({ calib: Object.assign({}, GG.prefs.get().calib, { headphones: { audio: 70, visual: 5, at: 1, vat: 1 } }) }); GG.ui.show('calib', { profile: 'headphones', input: 'keys' }); });
    await page.locator(tid('calib-visual-only')).click();
    await page.waitForFunction(() => GG.debug('calib').step === 'visual' && GG.debug('calib').capturing, null, { timeout: 10000 });
    for (let i = 0; i < 8; i++) {
      await page.waitForFunction(n => GG.debug('calib').clicks.filter(x => x != null).length > n, i, { timeout: 3000 });
      await page.waitForTimeout(25);
      await page.keyboard.press('KeyF');
    }
    await page.waitForFunction(() => GG.debug('calib').step === 'visualDone', null, { timeout: 5000 });
    await page.locator(tid('calib-save')).click();
    const h = await page.evaluate(() => { const p = Object.assign(GG.prefs.get(), { audioProfile: 'headphones' }); return { kb: p.calibKb.headphones, keys: GG.prefs.calibFor(p, 'keys') }; });
    c.ok(h.kb.at === 0 && h.kb.vat > 0 && h.keys.audio === 70 && h.keys.visM === true, 'light check only: vat only; keys fall back to the touch audio ' + JSON.stringify(h));
    // Esc stops a key test (and never closes the screen)
    await page.evaluate(() => GG.ui.show('calib', { input: 'keys' }));
    await page.locator(tid('calib-start')).click();
    await page.waitForFunction(() => GG.debug('calib').capturing, null, { timeout: 3000 });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => GG.debug('calib').step === 'intro' && !GG.debug('calib').capturing, null, { timeout: 3000 });
    c.ok((await dbg(page, 'ui')).screen === 'calib', 'Esc stops the key test (back to the start, still open)');
    await page.evaluate(() => GG.ui.closeAll());
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

/* ---- phone --------------------------------------------------------------------------------------------------------- */
async function phone() {
  const c = checker('phone');
  const { page, errors, close } = await open();   // the phone context (390x844 unless PW_VIEW)
  const none = ids => page.evaluate(ids => ids.filter(i => document.querySelector('[data-testid="' + i + '"]')), ids);
  try {
    await page.waitForSelector(tid('btn-new'), { timeout: 30000 });
    c.ok(await page.evaluate(() => !/gg-/.test(document.documentElement.className) && GG.debug('input').mode === 'touch' && !GG.input.showKeyUI()), 'phone: no desktop class, touch, no key UI');
    await career(page, { seat: 'drums', lanes: 4 });
    await page.evaluate(() => GG.ui.show('settings', { tab: 'play' }));
    await page.waitForSelector(tid('set-done'));
    let left = await none(['set-keys', 'set-layout-auto', 'set-layout-phone', 'set-layout-wide', 'set-calibrate-keys', 'set-keys-timing']);
    c.ok(!left.length, 'phone settings: no Keys section, no Layout row ' + left.join(' '));
    await page.evaluate(() => GG.ui.show('calib', {}));
    await page.waitForSelector(tid('calib-start'));
    left = await none(['calib-input-touch', 'calib-input-keys']);
    c.ok(!left.length, 'phone calibration: no input seg ' + left.join(' '));
    await page.evaluate(() => GG.ui.closeAll());
    await page.evaluate(() => { const s = GG.state; s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); GG.ui.playGig(s.gig, () => {}); });
    await waitScreen(page, 'gig-set');
    left = await none(['gig-keys', 'gig-keys-change']);
    c.ok(!left.length, 'phone setlist: no key legend ' + left.join(' '));
    await page.locator(tid('btn-gig-start')).click();
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 12000 });
    const d = await dbg(page, 'gigui');
    c.ok(d.keys.input === 'touch' && !d.keys.caps && !d.keys.labels && !d.wide, 'phone gig: touch, no keycaps ' + JSON.stringify(d.keys));
    await page.locator(tid('btn-gig-pause')).click();
    await page.waitForFunction(() => GG.debug('gigui').paused);
    left = await none(['gig-pause-keys', 'gig-hint']);
    c.ok(!left.length, 'phone pause card: no "Esc to resume" ' + left.join(' '));
    c.ok(await page.evaluate(() => !/gg-/.test(document.documentElement.className)), 'phone: still no desktop class ' + await page.evaluate(() => document.documentElement.className));
    await page.evaluate(() => GG.ui.closeAll());
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

/* ---- wide-gig ------------------------------------------------------------------------------------------------------ */
async function wideGig() {
  const c = checker('wide-gig');
  const sizes = [{ width: 1280, height: 720 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }];
  for (const vp of sizes) {
    const { page, errors, close } = await boot({ viewport: vp });
    const tag = vp.width + 'x' + vp.height;
    try {
      for (const lanes of [4, 6]) {
        await career(page, { seat: 'drums', lanes, bars: ['x.......x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', E, '..x...........x.', '......x.......x.'].slice(0, lanes) });
        await page.evaluate(() => { const st = GG.render && GG.render.stage; window.__frames = []; if (st && st.setFrame && !st.__spy) { const f = st.setFrame; st.setFrame = function (o) { window.__frames.push(o); return f.apply(this, arguments); }; st.__spy = 1; } });
        await startGig(page);
        await page.waitForTimeout(300);
        const g = await page.evaluate(() => {
          const d = GG.debug('gigui'), hw = document.querySelector('.gig-hw'), cv = document.querySelector('[data-testid="gig-highway"]'), r = hw.getBoundingClientRect(), cr = cv.getBoundingClientRect();
          return { wide: document.documentElement.classList.contains('gg-wide'), dWide: d.wide, lanes: d.lanes, dataLanes: hw.dataset.lanes, laneW: d.laneW, gemW: d.gemW, look: d.look,
            expLook: GG.gig.DIFFICULTIES[d.diff].look / (GG.prefs.get().noteSpeed || 1), hw: { l: r.left, t: r.top, w: r.width, h: r.height }, cw: cr.width,
            frame: window.__frames.slice(-1)[0] || null, H: innerHeight, W: innerWidth, hint: !!document.querySelector('[data-testid="gig-hint"]') };
        });
        c.ok(g.wide && g.dWide && g.dataLanes === String(lanes), `${tag} ${lanes} lanes: PC layout, data-lanes ${g.dataLanes}`);
        c.ok(Math.abs(g.laneW - g.cw / lanes) < 0.6 && g.gemW === Math.min(g.laneW - 20, 100), `${tag} ${lanes}: laneW ${g.laneW.toFixed(1)} = width / lanes, gem ${g.gemW.toFixed(1)}`);
        c.ok(Math.abs(g.look - g.expLook) < 1e-9, `${tag} ${lanes}: note travel time ${g.look.toFixed(3)} s == the phone's`);
        c.ok(g.hint, `${tag} ${lanes}: "Esc pause" hint (gig-hint) in the PC layout`);
        if (g.frame) c.ok(Math.abs(g.frame.bottom - Math.round(g.H - g.hw.t - 0.1 * g.hw.h)) <= 1, `${tag} ${lanes}: stage frame to 0.1 of the highway (kit just above it) (${g.frame.bottom})`);
        if (g.hw.w < g.W * 0.9) {   // 5w (Lane W) sizes the highway: B bounds
          const lo = Math.max(lanes * 110, Math.min(0.46 * g.W, lanes * 140)) - 2, hi = Math.min(lanes * 140, Math.max(0.46 * g.W, lanes * 110)) + 2;
          c.ok(g.hw.w >= lo && g.hw.w <= hi && g.hw.h >= 298 && g.hw.h <= 542 && Math.abs(g.hw.l + g.hw.w / 2 - g.W / 2) < 3, `${tag} ${lanes}: B highway bounds ` + JSON.stringify(g.hw));
        } else console.log(`note ${tag} ${lanes}: the highway is full width (5w not in this tree): B bounds not checked`);
        await page.evaluate(() => GG.ui.closeAll());
      }
      if (vp.width === 1440) {   // resize 1440 -> 800 while paused -> resume
        await career(page, { seat: 'drums', lanes: 4 });
        await startGig(page);
        await page.waitForFunction(() => GG.debug('gigui').songT > 1);
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => GG.debug('gigui').paused);
        await page.setViewportSize({ width: 800, height: 900 });
        await page.waitForFunction(() => !document.documentElement.classList.contains('gg-wide'), null, { timeout: 3000 });
        await page.waitForTimeout(100);
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !GG.debug('gigui').paused && !GG.debug('gigui').waking, null, { timeout: 5000 });
        const r = await page.evaluate(() => { const d = GG.debug('gigui'), cv = document.querySelector('[data-testid="gig-highway"]'); return { laneW: d.laneW, cw: cv.getBoundingClientRect().width, wide: d.wide, hint: !!document.querySelector('[data-testid="gig-hint"]') }; });
        c.ok(!r.wide && !r.hint && Math.abs(r.laneW - r.cw / 4) < 0.6 && r.cw <= 800, `resize 1440 -> 800 while paused: phone highway, laneW ${r.laneW.toFixed(1)} of ${r.cw}`);
        await page.evaluate(() => GG.ui.closeAll());
      }
      c.ok(errors.length === 0, tag + ': no console errors ' + errors.slice(0, 3).join(' | '));
    } catch (e) { c.ok(false, tag + ' threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
    await close();
  }
  c.done();
}

(async () => {
  if (want('keys')) await keys();
  if (want('fair')) await fair();
  if (want('stuck')) await stuck();
  if (want('space')) await space();
  if (want('esc')) await esc();
  if (want('blur')) await blur();
  if (want('rebind')) await rebind();
  if (want('calib-keys')) await calibKeys();
  if (want('phone')) await phone();
  if (want('wide-gig')) await wideGig();
})();
