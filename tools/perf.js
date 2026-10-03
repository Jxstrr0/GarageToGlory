// tools/perf.js (v1.0 Lane P): the perf probes of tools/perf_probes/ ported into one runner that reads the repo's own
// dist/game.html + tests/.cache/three-0.149.0.min.js. Headless Chromium with SwiftShader (same flags as tests/_pw.js), an
// in-page probe installed before any page script (rAF wrapper: JS per frame; THREE.WebGLRenderer wrapper: render() time,
// the last scene; Web Audio: every created node, every source's [start, end] on the context clock; long tasks).
//   node tools/perf.js [all|scenes|governor|gig|tti|audio|stalls|size|report]   (default: all)
//   env: VIEW=390x844, DPR=1, THROTTLE (scenes/gig: one rate; all: 1 and 4), SAMPLE=4000 (ms per scene), SONG_S=40,
//        TRIALS=3 (tti), OUT=tests/.cache/perf_v10.txt
// Results: tests/.cache/perf/<what>.json; `all` and `report` write OUT: the v1.0 table against plan/perf_baseline_v10.txt
// (contract §4.9: hard gates = draw calls, triangles, audio nodes per hit / per second, the voice cap, governor mode/cap per
// scene; report-only = JS/frame, render() time, quickStart, first builds, heap, TTI).
// v1.1 "Seats" (Lane C): scenes also measures the string-seat club stage (bass, lead: the spot camera, you + your instrument,
// the swapped drummer) and a rhythm-seat garage (the drummer at the kit, your rig); the report adds a seats line: each <= the
// drum scene x 1.15 (contract §4.8). The size gate is 5,000,000 B (E14).
// Process rule: every browser this script opens is its own child and is closed in a finally {} (never pkill by name).
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const ROOT = path.join(__dirname, '..');
const THREE_FILE = path.join(ROOT, 'tests', '.cache', 'three-0.149.0.min.js');
const GAME = process.env.GAME ? path.resolve(process.env.GAME) : path.join(ROOT, 'dist', 'game.html');   // GAME=<other dist> (a before run)
const RTAG = process.env.RTAG || '';   // suffix for the result files (e.g. RTAG=_before)
const RES = path.join(ROOT, 'tests', '.cache', 'perf');
const OUT = process.env.OUT ? path.resolve(process.env.OUT) : path.join(ROOT, 'tests', '.cache', 'perf_v10.txt');
const VIEW = process.env.VIEW || '390x844';
const [VW, VH] = VIEW.split('x').map(Number);
const DPR = +(process.env.DPR || 1);
const BANDS = ['hail_damage', 'frost_heave', 'gravel_kings', 'grid_road_ramblers'];

/* ---- in-page probe (verbatim from tools/perf_probes/perf_lib.js, + renders per second) ---------------------------- */
const PROBE = () => {
  const P = window.__perf = { frames: [], renders: [], renderers: [], longs: [], scene: null, cam: null, t0: performance.now() };
  const raf0 = window.requestAnimationFrame.bind(window);
  let fTs = -1, fJs = 0;
  window.requestAnimationFrame = function (cb) {
    return raf0(function (ts) {
      if (ts !== fTs) { if (fTs >= 0) P.frames.push(fTs, fJs); fTs = ts; fJs = 0; }
      const t0 = performance.now();
      try { cb(ts); } finally { fJs += performance.now() - t0; }
    });
  };
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) P.longs.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  document.addEventListener('DOMContentLoaded', () => {
    const T = window.THREE; if (!T || !T.WebGLRenderer) return;
    const W0 = T.WebGLRenderer;
    const W = function (p) {
      const r = new W0(p); P.renderers.push(r);
      const rr = r.render;
      r.render = function (s, c) { const t0 = performance.now(); rr.call(r, s, c); P.renders.push(performance.now() - t0); P.scene = s; P.cam = c; };
      return r;
    };
    W.prototype = W0.prototype;
    try { T.WebGLRenderer = W; } catch (e) { P.wrapFail = String(e); }
  }, true);
  const A = P.audio = { created: {}, srcs: [] };
  const BAC = window.BaseAudioContext || window.AudioContext;
  if (BAC) {
    const proto = BAC.prototype;
    Object.getOwnPropertyNames(proto).filter(k => /^create/.test(k) && typeof proto[k] === 'function').forEach(k => {
      const f0 = proto[k];
      proto[k] = function () {
        const n = f0.apply(this, arguments);
        if (this instanceof (window.OfflineAudioContext || function () {})) return n;   // offline renders (tests) are not live nodes
        A.created[k] = (A.created[k] || 0) + 1;
        if (k === 'createBufferSource' || k === 'createOscillator' || k === 'createConstantSource') {
          const rec = { k: k[6], s: null, e: null, end: null, loop: false };
          const st = n.start, sp = n.stop, ctx = this;
          n.start = function (when, off, dur) {
            rec.s = Math.max(when || 0, ctx.currentTime);
            if (k === 'createBufferSource') { rec.loop = !!n.loop; if (!n.loop && n.buffer) rec.e = rec.s + (dur != null ? dur : n.buffer.duration - (off || 0)) / Math.max(0.01, n.playbackRate.value || 1); }
            A.srcs.push(rec);
            return st.apply(this, arguments);
          };
          n.stop = function (when) { const w = Math.max(when || 0, ctx.currentTime); rec.stop = w; return sp.apply(this, arguments); };
          n.addEventListener('ended', () => { rec.end = ctx.currentTime; });
        }
        return n;
      };
    });
  }
  P.mark = () => { P.frames.length = 0; P.renders.length = 0; P.mt = performance.now(); fTs = -1; };
  const pct = (a, p) => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y); return +b[Math.min(b.length - 1, Math.floor(p * b.length))].toFixed(2); };
  P.read = () => {
    const ts = [], js = [];
    for (let i = 0; i < P.frames.length; i += 2) { ts.push(P.frames[i]); js.push(P.frames[i + 1]); }
    const iv = []; for (let i = 1; i < ts.length; i++) iv.push(ts[i] - ts[i - 1]);
    const secs = (performance.now() - P.mt) / 1000;
    return { secs: +secs.toFixed(2), frames: ts.length, fps: +(ts.length / secs).toFixed(1), renderFps: +(P.renders.length / secs).toFixed(1),
      frame: { p50: pct(iv, 0.5), p95: pct(iv, 0.95), max: pct(iv, 1) }, js: { p50: pct(js, 0.5), p95: pct(js, 0.95), max: pct(js, 1) },
      render: { p50: pct(P.renders, 0.5), p95: pct(P.renders, 0.95), n: P.renders.length } };
  };
  P.audioPeak = (from, to) => {
    const ev = [];
    for (const r of A.srcs) {
      if (r.s == null) continue;
      let e = Infinity; if (r.stop != null) e = Math.min(e, r.stop); if (r.e != null) e = Math.min(e, r.e); if (r.end != null) e = Math.min(e, r.end);
      if (from != null && e < from) continue; if (to != null && r.s > to) continue;
      ev.push([r.s, 1, r.k], [e, -1, r.k]);
    }
    ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let cur = 0, peak = 0, at = 0; const byK = { B: 0, O: 0, C: 0 }, pk = {};
    for (const x of ev) { cur += x[1]; byK[x[2]] += x[1]; if (cur > peak) { peak = cur; at = x[0]; Object.assign(pk, byK); } }
    return { peak, at: +at.toFixed(2), byKind: pk, sources: A.srcs.length };
  };
  P.info = () => {
    const r = P.renderers[0]; if (!r) return null; const i = r.info;
    return { calls: i.render.calls, tris: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, programs: (i.programs || []).length,
      px: r.getPixelRatio(), size: (() => { const v = r.domElement; return v.width + 'x' + v.height; })(), renderers: P.renderers.length };
  };
  P.texList = () => {
    const s = P.scene; if (!s) return [];
    const out = []; const seen = new Set();
    s.traverse(o => { const m = o.material; [].concat(m || []).forEach(mm => { const t = mm && mm.map; if (t && t.image && !seen.has(t)) { seen.add(t); out.push(t.image.width + 'x' + t.image.height); } }); });
    return out;
  };
};

async function open(opts) {
  opts = opts || {};
  const browser = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info'] });
  try {
    const context = await browser.newContext({ viewport: { width: opts.w || VW, height: opts.h || VH }, deviceScaleFactor: opts.dpr || DPR, isMobile: true, hasTouch: true });
    await context.route('**/three.min.js', r => r.fulfill({ path: THREE_FILE, contentType: 'application/javascript' }));
    await context.addInitScript(PROBE);
    if (opts.init) await context.addInitScript(opts.init);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    if (opts.throttle && opts.throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: opts.throttle });
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + (e.stack || e.message)));
    const url = 'file://' + GAME + (opts.query || '');
    if (!opts.noGoto) await page.goto(url);
    return { browser, context, page, cdp, errors, url, close: () => browser.close() };
  } catch (e) { await browser.close(); throw e; }
}
async function heap(cdp) {
  await cdp.send('HeapProfiler.enable').catch(() => {});
  await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
  const h = await cdp.send('Runtime.getHeapUsage');
  return { usedMB: +(h.usedSize / 1048576).toFixed(1), totalMB: +(h.totalSize / 1048576).toFixed(1) };
}
// n more rendered frames of the 3D core (with the governor: rendered frames, not rAF ticks)
async function frames(page, n) {
  const d = await page.evaluate(() => GG.debug('render'));
  if (d.paused || d.scene === 'none') { await page.waitForTimeout(500); return false; }
  await page.waitForFunction(x => GG.debug('render').frames >= x, d.frames + (n || 3), { timeout: 60000 });
  return true;
}
async function sample(page, ms) {
  await page.evaluate(() => __perf.mark());
  await page.waitForTimeout(ms || 4000);
  return page.evaluate(() => __perf.read());
}
function save(name, obj) { fs.mkdirSync(RES, { recursive: true }); fs.writeFileSync(path.join(RES, name + RTAG + '.json'), JSON.stringify(obj, null, 1)); }
function load(name, tagged) { try { return JSON.parse(fs.readFileSync(path.join(RES, name + (tagged != null ? tagged : RTAG) + '.json'), 'utf8')); } catch (e) { return null; } }
const tag = (t, dpr) => 't' + t + '_' + VIEW + (dpr > 1 ? '_dpr' + dpr : '');

/* ---- scenes: renderer.info + JS/render per frame + first-build ms + the governor's mode/cap ------------------------ */
async function scenes(T, dpr) {
  T = T || +(process.env.THROTTLE || 1); dpr = dpr || DPR;
  const MS = +(process.env.SAMPLE || 4000);
  const res = { throttle: T, view: VIEW, dpr, scenes: {} };
  const { page, cdp, errors, close } = await open({ throttle: T, dpr });
  const bareUi = on => page.evaluate(on => { ['hud', 'screens', 'toast'].forEach(id => { const e = document.getElementById(id); if (e) e.style.visibility = on ? 'hidden' : ''; }); }, on);
  const grab = async (name, extra) => {
    const drawing = await frames(page, 4);
    const info = await page.evaluate(() => ({ info: __perf.info(), dbg: GG.debug('render'), perf: GG.debug('perf') || null, tex: __perf.texList() }));
    const h = await heap(cdp);
    const fr = await sample(page, MS);
    const r = Object.assign({ info: info.info, heap: h, frame: fr, scene: info.dbg.scene, paused: info.dbg.paused, drawing, perf: info.perf, tex: info.tex }, extra || {});
    res.scenes[name] = r;
    console.log([name.padEnd(24), 'calls', r.info.calls, 'tris', r.info.tris, 'geo', r.info.geometries, 'tex', r.info.textures, 'prog', r.info.programs,
      '| heap', h.usedMB + 'MB | raf', fr.fps, 'rendered/s', fr.renderFps, 'js', fr.js.p50 + '/' + fr.js.p95, 'render', fr.render.p50 + '/' + fr.render.p95,
      info.perf ? '| ' + info.perf.mode + ' cap ' + info.perf.cap + ' px ' + info.perf.pixelRatio : '', drawing ? '' : '| 3D PAUSED', r.build != null ? '| build ' + r.build + 'ms' : ''].join(' '));
    return r;
  };
  try {
    await page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
    await page.waitForFunction(() => GG.render.title.info().frame > 8, null, { timeout: 60000 });
    await grab('title');
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
    await page.evaluate(() => { const st = GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, name: 'Sam', bandId: 'hail_damage' }); GG.ui.closeAll(); GG.render.setScene('garage'); GG.render.syncState(st); });
    await frames(page, 3);
    await page.evaluate(() => GG.ui.show('laptop'));
    await page.waitForTimeout(900);   // the camera glide under the tall sheet
    await grab('laptop(over garage)');
    await page.evaluate(() => { GG.ui.closeAll(); });
    await bareUi(true);
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
      const si = await page.evaluate(() => { const i = GG.render.stage.info(); return { kind: i.kind, people: i.people, band: i.band.length, lod: i.lod || null }; });
      await grab(name, { build: Math.round(build), stage: si });
    }
    for (const seat of ['bass', 'lead']) {   // v1.1: the club stage from a string seat (same venue, crowd and kit as stage_club)
      const build = await page.evaluate(seat => {
        const t0 = performance.now(), st = GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, name: 'Sam', bandId: 'hail_damage', seat });
        if (GG.ui && GG.ui.closeAll) GG.ui.closeAll();
        st.player.kit = Object.assign({}, st.player.kit || {}, { extras: ['pyro', 'fan', 'cowbell'] });
        st.player.gearLook = { shape: null, color: null, guard: 'white', sticker: 'logo' };
        GG.render.syncState(st); GG.render.setScene('stage');
        GG.render.stage.setup({ venue: { kind: 'club', name: 'Test club', capacity: 400 }, crowd: 5000, capacity: 400, genre: st.genre, flags: { cape: 'velvet' }, player: st.player, seat,
          members: st.members.map(m => ({ id: m.id, name: m.name, role: m.role, seatRole: m.seatRole, mood: m.mood, look: m.look })) });
        GG.render.stage.setCrowdLevel(95);
        return performance.now() - t0;
      }, seat);
      const si = await page.evaluate(() => { const i = GG.render.stage.info(); return { kind: i.kind, people: i.people, band: i.band.length, view: i.view, drummer: i.drummer, seat: i.seat }; });
      await grab('stage_club_seat_' + seat, { build: Math.round(build), stage: si });
    }
    {   // v1.1: a rhythm-seat garage (Hail Damage: Jaxon at the kit, you at your rig)
      const build = await page.evaluate(() => {
        const t0 = performance.now(), st = GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, name: 'Sam', bandId: 'hail_damage', seat: 'rhythm' });
        if (GG.ui && GG.ui.closeAll) GG.ui.closeAll();
        st.player.gearLook = { shape: null, color: null, guard: 'white', sticker: 'logo' };
        GG.render.setScene('garage'); GG.render.syncState(st);
        return performance.now() - t0;
      });
      await bareUi(false);
      await grab('garage_seat_rhythm', { build: Math.round(build) });
      await bareUi(true);
      await page.evaluate(() => { const st = GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, name: 'Sam', bandId: 'hail_damage' }); GG.ui.closeAll(); st.player.kit = Object.assign({}, st.player.kit || {}, { extras: ['pyro', 'fan', 'cowbell'] }); GG.render.syncState(st); });
    }
    {
      const build = await page.evaluate(() => {
        const t0 = performance.now(), s = GG.state, rid = GG.content.bands[s.bandId].rival;
        GG.render.setScene('carpet'); GG.render.carpet.setup({ members: s.members, player: s.player, flags: s.flags, genre: s.genre, rival: { id: rid, name: GG.content.rivals[rid].name }, year: 6 });
        return performance.now() - t0;
      });
      await grab('carpet', { build: Math.round(build) });
    }
    {
      const build = await page.evaluate(() => { const t0 = performance.now(); GG.render.setScene('van'); GG.render.van.setTrip({ from: GG.state.city, to: 'Moose Jaw', km: 180, season: 'fall' }); return performance.now() - t0; });
      await grab('van', { build: Math.round(build) });
    }
    await bareUi(false);
    await page.evaluate(() => GG.render.setScene('garage'));
    await frames(page, 3);
    res.afterAll = { heap: await heap(cdp), info: await page.evaluate(() => __perf.info()) };
    res.errors = errors.slice(0, 10);
    if (errors.length) console.log('ERRORS', errors.slice(0, 5));
  } catch (e) { console.log('FAIL', e.stack || e); res.fail = String(e); }
  finally { save('scenes_' + tag(T, dpr), res); await close(); }
  return res;
}

/* ---- gig: a real festival gig, Expert, 6 lanes + pedal, a tapping bot on the heard clock ------------------------- */
async function gig(T) {
  T = T || +(process.env.THROTTLE || 1);
  const SONG_S = +(process.env.SONG_S || 40), BAND = process.env.BAND || 'hail_damage', VENUE = process.env.VENUE || 'mudstonbury_fest', DIFF = process.env.DIFF || 'expert';
  const res = { throttle: T, band: BAND, venue: VENUE, diff: DIFF, view: VIEW };
  const { page, cdp, errors, close } = await open({ throttle: T });
  try {
    await page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
    await page.mouse.click(VW / 2, VH / 2);   // a real first touch: the audio unlock (the crowd warms up from here)
    res.setup = await page.evaluate(([band, venue, diff]) => {
      GG.prefs.set({ gigDifficulty: diff, calibSeen: true });
      GG.main.quickStart({ seed: 5150, openCard: false, bandId: band });
      const s = GG.state; s.card = null; s.phase = 'plan'; s.fund = 99999; s.fans = 60000; s.buzz = 90;
      ['toms', 'ride', 'pedal'].forEach(id => { try { GG.shop.buyGear(s, id); } catch (e) {} });
      s.player.kit = Object.assign({}, s.player.kit || {}, { extras: ['pyro', 'fan', 'cowbell'] });
      for (let i = 0; i < 3; i++) GG.songs.jam(s, GG.RNG(40 + i));
      s.songs.forEach(x => { x.pattern.bpm = Math.max(x.pattern.bpm || 0, 170); });
      s.gig = GG.gig.makeGig(s, venue, 'book');
      window.__done = null; GG.ui.gigAutoplay = false;
      GG.ui.playGig(s.gig, r => { window.__done = r; });
      return { lanes: s.gear.lanes, dk: s.gear.doubleKick, gig: s.gig && s.gig.name, cap: s.gig && s.gig.capacity, members: s.members.length };
    }, [BAND, VENUE, DIFF]);
    await page.waitForFunction(() => GG.debug('ui').screen === 'gig-set', null, { timeout: 60000 });
    await page.waitForFunction(() => GG.debug('audio').crowd.ready, null, { timeout: 60000 }).catch(() => {});
    await page.locator('[data-testid="btn-gig-start"]').last().click();
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 60000 });
    await page.evaluate(() => {
      const c = document.querySelector('[data-testid="gig-highway"]'), seen = new Set(), B = window.__bot = { taps: 0, judged: {}, max: {}, voices: 0 };
      B.ctx0 = GG.audio.context().currentTime; B.created0 = JSON.parse(JSON.stringify(__perf.audio.created)); B.t0 = performance.now();
      B.drops0 = GG.debug('audio').counts;
      const CR = __perf.audio.created, sum = () => Object.values(CR).reduce((a, b) => a + b, 0);
      B.hitNodes = 0; B.hits = 0;
      const h0 = GG.audio.hit; GG.audio.hit = function () { const n0 = sum(); try { return h0.apply(this, arguments); } finally { B.hitNodes += sum() - n0; B.hits++; } };
      const tapLane = li => { const r = c.getBoundingClientRect(), lanes = GG.debug('gigui').lanes, x = r.left + (li + 0.5) * r.width / lanes, y = r.bottom - 36;
        c.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 7 + li, pointerType: 'touch', isPrimary: false, bubbles: true, cancelable: true }));
        setTimeout(() => c.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, pointerId: 7 + li, pointerType: 'touch', isPrimary: false, bubbles: true, cancelable: true })), 40);
        B.taps++; const l = GG.debug('gigui').last; if (l) B.judged[l.judgement] = (B.judged[l.judgement] || 0) + 1; };
      B.iv = setInterval(() => {
        const d = GG.debug('gigui'); if (d.mode !== 'play' || !d.soon) return;
        for (const n of d.soon) { const k = n.li + ':' + n.t.toFixed(3); if (seen.has(k)) continue; seen.add(k);
          const wait = (n.t - d.songT) * 1000 - 3; if (wait < 400) setTimeout(() => tapLane(n.li), Math.max(0, wait)); else seen.delete(k); }
      }, 60);
      B.au = setInterval(() => {
        const a = GG.debug('audio'), g = { song: a.songVoices, band: a.bandVoices, crowd: a.crowdVoices, amb: a.ambVoices, sfx: a.voices, global: a.global ? a.global.active : null };
        for (const k in g) B.max[k] = Math.max(B.max[k] || 0, g[k] || 0);
      }, 200);
      __perf.mark();
    });
    const t0 = Date.now();
    let mid = null, forced = false, between = 0;
    while (Date.now() - t0 < SONG_S * 1000) {
      await page.waitForTimeout(1000);
      const m = await page.evaluate(() => GG.debug('gigui').mode);
      if (!forced && Date.now() - t0 > SONG_S * 400) { forced = true; await page.evaluate(() => { ['wallOfDeath', 'gangShout', 'headbang'].forEach((k, i) => setTimeout(() => GG.emit('crowd:moment', { kind: k }), i * 700)); }); }
      if (m === 'between' && ++between >= 6) { res.endedAt = 'between+6s'; break; }
      if (!mid && Date.now() - t0 > SONG_S * 500) mid = await page.evaluate(() => ({ info: __perf.info(), perf: GG.debug('perf') || null, stage: (() => { const i = GG.render.stage.info(); return { kind: i.kind, people: i.people, lod: i.lod || null }; })() }));
      if (m !== 'play' && m !== 'between') { res.endedEarly = m; break; }
    }
    res.frame = await page.evaluate(() => __perf.read());
    res.mid = mid;
    res.heap = await heap(cdp);
    res.audio = await page.evaluate(() => {
      const B = window.__bot, now = GG.audio.context().currentTime, cr = __perf.audio.created, d = {}, secs = (performance.now() - B.t0) / 1000;
      for (const k in cr) d[k] = cr[k] - (B.created0[k] || 0);
      const tot = Object.values(d).reduce((a, b) => a + b, 0);
      clearInterval(B.iv); clearInterval(B.au);
      const dbg = GG.debug('audio');
      return { peak: __perf.audioPeak(B.ctx0, now), caps: B.max, counts: dbg.counts, drops0: B.drops0, global: dbg.global || null,
        nodesPerSec: Math.round(tot / secs), hitNodesPerSec: Math.round(B.hitNodes / secs), hitsPerSec: +(B.hits / secs).toFixed(1),
        created: d, taps: B.taps, judged: B.judged, secs: +secs.toFixed(1), prerender: dbg.prerender || null };
    });
    res.errors = errors.slice(0, 8);
    const f = res.frame, a = res.audio;
    console.log('gig x' + T, BAND, VENUE, DIFF, JSON.stringify(res.setup));
    console.log('  raf fps', f.fps, 'rendered/s', f.renderFps, 'frame p50/p95', f.frame.p50 + '/' + f.frame.p95, 'js p50/p95/max', f.js.p50 + '/' + f.js.p95 + '/' + f.js.max, 'render p50/p95', f.render.p50 + '/' + f.render.p95);
    console.log('  mid', JSON.stringify(mid && { calls: mid.info.calls, tris: mid.info.tris, perf: mid.perf, stage: mid.stage }), 'heap', JSON.stringify(res.heap));
    console.log('  audio peak', JSON.stringify(a.peak), 'caps', JSON.stringify(a.caps), 'nodes/s', a.nodesPerSec, '(drum hits ' + a.hitNodesPerSec + ' from ' + a.hitsPerSec + ' hits/s)', 'taps', a.taps, JSON.stringify(a.judged));
    console.log('  created', JSON.stringify(a.created), 'drops', a.counts.dropped - (a.drops0.dropped || 0), 'tapDrops', a.counts.tapDrops - (a.drops0.tapDrops || 0), 'global', JSON.stringify(a.global));
    if (errors.length) console.log('  ERRORS', errors.slice(0, 4));
  } catch (e) { console.log('FAIL', e.stack || e); res.fail = String(e); }
  finally { save('gig_' + tag(T, 1), res); await close(); }
  return res;
}

/* ---- tti: cold loads, fresh browser per trial --------------------------------------------------------------------- */
async function tti(rates) {
  rates = rates || (process.env.RATES || '1,4').split(',').map(Number);
  const TRIALS = +(process.env.TRIALS || 3);
  const MARKS = () => {
    const M = window.__marks = {};
    const id = setInterval(() => {
      const now = performance.now();
      if (M.booted == null && window.GG && GG.main && GG.main.booted) M.booted = now;
      if (M.btn == null && document.querySelector('[data-testid="btn-new"]')) M.btn = now;
      try { if (M.frame1 == null && window.GG && GG.render && GG.render.title && GG.render.title.info().frame >= 1) M.frame1 = now; } catch (e) {}
      if (M.btn != null && M.frame1 != null && M.booted != null) clearInterval(id);
    }, 5);
  };
  const out = { view: VIEW, trials: [], median: {} };
  const med = a => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
  for (const rate of rates) {
    for (let k = 0; k < TRIALS; k++) {
      const { page, cdp, close } = await open({ throttle: rate, noGoto: true, init: MARKS });
      try {
        await cdp.send('Performance.enable');
        await page.goto('file://' + GAME);
        await page.waitForFunction(() => window.__marks && __marks.btn != null && __marks.frame1 != null, null, { timeout: 120000, polling: 50 });
        await page.waitForTimeout(rate > 1 ? 6000 : 3000);
        const r = await page.evaluate(() => {
          const M = __marks, ready = Math.max(M.btn, M.frame1);
          const longs = __perf.longs.slice().sort((a, b) => a[0] - b[0]);
          let t = ready;
          for (const [s, d] of longs) { if (s + d <= t) continue; if (s - t >= 1000) break; t = s + d; }
          return { booted: Math.round(M.booted), btn: Math.round(M.btn), frame1: Math.round(M.frame1), tti: Math.round(t), longTotal: Math.round(longs.reduce((a, x) => a + x[1], 0)) };
        });
        r.heap = (await heap(cdp)).usedMB; r.rate = rate;
        out.trials.push(r);
        console.log('tti x' + rate, 'trial', k, JSON.stringify(r));
      } catch (e) { console.log('FAIL tti', rate, k, e.message); }
      finally { await close(); }
    }
    const tr = out.trials.filter(t => t.rate === rate);
    if (tr.length) out.median['x' + rate] = { tti: med(tr.map(t => t.tti)), longTotal: med(tr.map(t => t.longTotal)), heap: med(tr.map(t => t.heap)) };
    console.log('tti x' + rate, 'MEDIAN', JSON.stringify(out.median['x' + rate]));
  }
  save('tti_' + VIEW, out);
  return out;
}

/* ---- audio: Web Audio nodes per drum hit (live, per lane), before and after the pre-rendered hits are ready -------- */
async function audio() {
  const res = { view: VIEW };
  const { page, errors, close } = await open({});
  try {
    await page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
    await page.mouse.click(VW / 2, VH / 2);
    await page.evaluate(() => { GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, bandId: 'hail_damage' }); GG.ui.closeAll(); });
    const perLane = () => page.evaluate(async () => {   // nodes created inside each GG.audio.hit call (the room's ambience excluded)
      const out = {}, C = __perf.audio.created, sum = () => Object.values(C).reduce((a, b) => a + b, 0), src = () => (C.createBufferSource || 0) + (C.createOscillator || 0);
      for (const lane of GG.contracts.LANES) {
        let n = 0, sN = 0;
        for (let i = 0; i < 10; i++) { const n0 = sum(), s0 = src(); GG.audio.hit(lane); n += sum() - n0; sN += src() - s0; await new Promise(r => setTimeout(r, 120)); }
        out[lane] = { nodes: n / 10, sources: sN / 10 };
      }
      return out;
    });
    res.live = await perLane();
    await page.waitForFunction(() => { const p = GG.debug('audio').prerender; return p && p.ready; }, null, { timeout: 30000 }).catch(() => {});
    res.prerender = await page.evaluate(() => GG.debug('audio').prerender || null);
    res.ready = await perLane();
    res.errors = errors.slice(0, 5);
    const fmt = o => Object.entries(o).map(([k, v]) => k + ' ' + v.nodes + '/' + v.sources).join(' | ');
    console.log('per hit before warm-up (nodes/sources):', fmt(res.live));
    console.log('per hit pre-rendered   (nodes/sources):', fmt(res.ready), JSON.stringify(res.prerender));
  } catch (e) { console.log('FAIL', e.stack || e); res.fail = String(e); }
  finally { save('audio', res); await close(); }
  return res;
}

/* ---- stalls: the first career (quickStart), the first stage / van builds, shader checks, the space atlas ----------- */
async function stalls(T) {
  T = T || +(process.env.THROTTLE || 4);
  const res = { throttle: T };
  const { page, errors, close } = await open({ throttle: T });
  try {
    await page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
    await page.waitForFunction(() => GG.render.title.info().frame > 2, null, { timeout: 60000 });
    res.quickStart = await page.evaluate(() => {
      const t0 = performance.now(); const st = GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, name: 'Sam', bandId: 'hail_damage' });
      const t1 = performance.now(); GG.ui.closeAll(); GG.render.setScene('garage'); GG.render.syncState(st);
      return { quickStart: Math.round(t1 - t0), garage: Math.round(performance.now() - t1) };
    });
    await frames(page, 2);
    // the crowd's audio starts building on the first garage entry (before any tap): how long until the core parts are ready
    res.crowdWarm = await page.evaluate(async () => { const t0 = performance.now(); while (performance.now() - t0 < 60000 && GG.debug('audio').crowdRaw < 7) await new Promise(r => setTimeout(r, 100)); return { core: GG.debug('audio').crowdRaw >= 7, ms: Math.round(performance.now() - t0), parts: GG.debug('audio').crowdRaw, unlocked: GG.debug('audio').state }; });
    res.atlas = await page.evaluate(() => { const d = GG.debug('render'); return { atlas: d.space ? d.space.atlas : null, tex: __perf.texList(), shaderChecks: GG.debug('perf') ? GG.debug('perf').shaderChecks : null, crowdRaw: GG.debug('audio').crowdRaw }; });
    res.stage = await page.evaluate(() => {
      const s = GG.state, v = Object.assign({}, GG.gig.venue('mudstonbury_fest')), t0 = performance.now();
      GG.render.setScene('stage'); GG.render.stage.setup({ venue: v, crowd: 5000, capacity: v.capacity, genre: s.genre, flags: {}, player: s.player, members: s.members.map(m => ({ id: m.id, name: m.name, role: m.role, look: m.look })) });
      return Math.round(performance.now() - t0);
    });
    await frames(page, 2);
    res.van = await page.evaluate(() => { const t0 = performance.now(); GG.render.setScene('van'); GG.render.van.setTrip({ from: GG.state.city, to: 'Moose Jaw', km: 180, season: 'fall' }); return Math.round(performance.now() - t0); });
    await frames(page, 2);
    res.crowd = await page.evaluate(() => GG.debug('audio').crowd);
    res.errors = errors.slice(0, 5);
    console.log('stalls x' + T, JSON.stringify(res));
  } catch (e) { console.log('FAIL', e.stack || e); res.fail = String(e); }
  finally { save('stalls_t' + T, res); await close(); }
  return res;
}

/* ---- governor: mode / cap / rendered frames per second per scene state (x1) ------------------------------------------ */
async function governor() {
  const res = { view: VIEW, rows: [] };
  const { page, errors, close } = await open({});
  const row = async (name, ms) => {
    const a = await page.evaluate(() => GG.debug('perf')); await page.waitForTimeout(ms || 2000); const b = await page.evaluate(() => GG.debug('perf'));
    const s = (ms || 2000) / 1000, r = { name, mode: b.mode, cap: b.cap, rendered: +((b.rendered - a.rendered) / s).toFixed(1), ticks: +((b.ticks - a.ticks) / s).toFixed(1), scene: await page.evaluate(() => GG.debug('render').scene) };
    res.rows.push(r); console.log([name.padEnd(30), r.scene.padEnd(7), r.mode.padEnd(8), 'cap', String(r.cap).padStart(2), '| rendered/s', r.rendered, 'ticks/s', r.ticks].join(' '));
  };
  try {
    await page.waitForSelector('[data-testid="btn-new"]', { timeout: 60000 });
    await page.waitForTimeout(1500);
    await row('title (idle)');
    await page.evaluate(() => { GG.main.quickStart({ seed: 4242, slot: '1', openCard: false, bandId: 'hail_damage' }); GG.ui.closeAll(); });
    // (the first garage glide runs at 2-3 headless fps while SwiftShader compiles; wait for it, then sample)
    await page.waitForFunction(() => GG.debug('perf').mode !== 'glide', null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await row('garage (idle)');
    await page.evaluate(() => GG.render.goToHotspot('kit'));
    await row('garage (walking to the kit)', 800);
    await page.waitForFunction(() => !GG.debug('render').walking && !GG.debug('render').pending, null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('laptop'); });
    await page.waitForFunction(() => GG.debug('render').insets.bottom > 0 && GG.debug('perf').mode === 'covered', null, { timeout: 20000 }).catch(() => {});
    await row('laptop over the garage (tall)');
    await page.evaluate(() => { GG.ui.closeAll(); const s = GG.state; s.card = null; s.phase = 'plan'; s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); GG.ui.gigAutoplay = false; GG.ui.playGig(s.gig, () => {}); });
    await page.waitForFunction(() => GG.debug('ui').screen === 'gig-set', null, { timeout: 15000 });
    await page.waitForTimeout(800);
    await page.waitForFunction(() => GG.debug('perf').mode === 'covered', null, { timeout: 20000 }).catch(() => {});
    await row('setlist sheet over the stage');
    await page.locator('[data-testid="btn-gig-start"]').last().click();
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 20000 });
    await row('live gig');
    await page.evaluate(() => { GG.ui.closeAll(); const s = GG.state; s.gig = GG.gig.makeGig(s, 'legion_63', 'book'); GG.prefs.set({ skipVan: false }); GG.ui.playVan(s.gig, () => {}); });
    await page.waitForFunction(() => GG.debug('ui').screen === 'van', null, { timeout: 15000 }).catch(() => {});
    await row('van drive');
    await page.evaluate(() => { GG.ui.closeAll(); GG.render.setScene('van'); GG.render.van.setTrip({ from: 'Saskatoon', to: 'Regina', km: 240, season: 'summer', tier: 0 }); GG.render.setPaused(false); });
    await page.waitForTimeout(800);
    await row('van (no drive, a preview)');
    res.errors = errors.slice(0, 5);
  } catch (e) { console.log('FAIL', e.stack || e); res.fail = String(e); }
  finally { save('governor_' + VIEW, res); await close(); }
  return res;
}

/* ---- size --------------------------------------------------------------------------------------------------------- */
function size() {
  const html = fs.readFileSync(GAME), gz = zlib.gzipSync(html, { level: 9 }).length;
  const s = html.toString('utf8'), re = /<script>\/\* ([^*]+) \*\/\n([\s\S]*?)\n<\/script>/g, mods = {}; let m;
  while ((m = re.exec(s))) mods[m[1]] = Buffer.byteLength(m[2]);
  const res = { bytes: html.length, gzip: gz, mods };
  console.log('dist/game.html', html.length, 'B, gzip-9', gz, 'B');
  save('size', res);
  return res;
}

/* ---- report: the v1.0 table vs plan/perf_baseline_v10.txt --------------------------------------------------------- */
const BEFORE = {   // plan/perf_baseline_v10.txt (0.9.0.0, comments kept), DPR 1, 390x844
  title: [33, 37345], garage_hail_damage: [43, 10030], garage_frost_heave: [39, 10739], garage_gravel_kings: [39, 8950], garage_grid_road_ramblers: [41, 14613],
  'laptop(over garage)': [43, 10030], stage_festival_full: [35, 65680], stage_sad_dome: [35, 46126], stage_budokhan: [33, 53972], stage_club: [35, 46014], carpet: [19, 10496], van: [28, 15962],
  build4: { garage_hail_damage: 2288, stage_festival_full: 337, van: 643 }, js4: { title: '4.7/11.7', garage_hail_damage: '4.5/7.2', stage_festival_full: '5.2/12', stage_sad_dome: '6.6/15.1', stage_club: '6/8.9', van: '3.1/9.1', carpet: '2.2/5' },
  gig: { x1: { js: '1.7/3.5', render: '0.9/2.6', calls: 38, tris: 65764, peak: 30, nodes: 154, drops: 0 }, x4: { js: '8.3/18.2', render: '4.4/10.3', peak: 22, nodes: 147 } },
  tti: { x1: 573, x4: 1753 }, size: 4417065
};
const GATES = {   // contract §4.9: [calls max, tris max]
  title: [33, 38000], stage_sad_dome: [38, 28000], stage_club: [38, 28000], stage_festival_full: [38, 35000], stage_budokhan: [Infinity, 30000],
  van: [31, 18000], carpet: [19, 10500]
};
function b4s(x, k) { return x && x.scenes[k] && x.scenes[k].build != null ? x.scenes[k].build : '-'; }
function report() {
  const s1 = load('scenes_t1_' + VIEW), s4 = load('scenes_t4_' + VIEW), g1 = load('gig_t1_' + VIEW), g4 = load('gig_t4_' + VIEW),
    tt = load('tti_' + VIEW), au = load('audio'), st = load('stalls_t4'), sz = load('size'), gv = load('governor_' + VIEW);
  // a same-machine before run (GAME=<the 0.9 / stage-0 dist> RTAG=_before node tools/perf.js scenes|gig|tti): load noise aside
  const sb4 = load('scenes_t4_' + VIEW, '_before'), bg4 = load('gig_t4_' + VIEW, '_before'), btt = load('tti_' + VIEW, '_before');
  const L = [], ok = (c) => c ? 'ok' : 'FAIL';
  L.push('# v1.0 PERF (Lane P) vs plan/perf_baseline_v10.txt. Headless Chromium + SwiftShader, isMobile, DPR 1, ' + VIEW + '. node tools/perf.js all');
  L.push('# Hard gates (contract §4.9): draw calls, triangles, audio nodes, voice cap, tap drops, governor mode/cap, the atlas. Report-only: JS/frame, render(), builds, TTI, heap.');
  L.push('');
  L.push('## Scenes: calls / tris (x1) | JS/frame p50/p95 ms (x4) | governor (mode cap, rendered/s at x1) | first build ms (x4)');
  L.push('scene | before calls/tris | after calls/tris | gate | before js x4 | after js x4 | governor | build x4 before/after' + (sb4 ? ' | same-run before js x4 / build x4' : ''));
  const hd = s1 && s1.scenes.garage_hail_damage ? s1.scenes.garage_hail_damage.info.calls : 0;
  for (const k of Object.keys(BEFORE).filter(k => Array.isArray(BEFORE[k]))) {
    const a = s1 && s1.scenes[k], b4 = s4 && s4.scenes[k], g = GATES[k];
    let gate = '-';
    if (a && g) gate = ok(a.info.calls <= g[0] && a.info.tris <= g[1]) + ' (<= ' + (g[0] === Infinity ? '-' : g[0]) + ' / ' + g[1] + ')';
    if (a && /^garage_/.test(k)) gate = ok(a.info.calls < 60 && a.info.calls <= Math.floor(hd * 1.15)) + ' (< 60, <= HD x 1.15)';
    L.push([k, BEFORE[k].join('/'), a ? a.info.calls + '/' + a.info.tris : '-', gate, BEFORE.js4[k] || '-', b4 ? b4.frame.js.p50 + '/' + b4.frame.js.p95 : '-',
      a && a.perf ? a.perf.mode + ' ' + a.perf.cap + ' (' + a.frame.renderFps + '/s)' : '-', (BEFORE.build4[k] || '-') + '/' + (b4s(s4, k))].concat(sb4 ? [sb4.scenes[k] ? sb4.scenes[k].frame.js.p50 + '/' + sb4.scenes[k].frame.js.p95 + ' / ' + (sb4.scenes[k].build != null ? sb4.scenes[k].build : '-') : '-'] : []).join(' | '));
  }
  L.push('');
  if (gv && gv.rows) {
    const want = { 'title (idle)': ['idle', 30], 'garage (idle)': ['idle', 30], 'garage (walking to the kit)': ['busy', 60], 'laptop over the garage (tall)': ['covered', 10],
      'setlist sheet over the stage': ['covered', 10], 'live gig': ['live', 60], 'van drive': ['drive', 60], 'van (no drive, a preview)': ['idle', 30] };
    L.push('## Frame governor (gate: mode + cap per scene; rendered/s is SwiftShader-bound here, the cap is what a phone gets)');
    L.push('state | scene | mode | cap | rendered/s | rAF ticks/s | gate');
    for (const r of gv.rows) { const w = want[r.name]; L.push([r.name, r.scene, r.mode, r.cap, r.rendered, r.ticks, w ? ok(r.mode === w[0] && r.cap === w[1] && r.rendered <= r.cap + 1) + ' (' + w[0] + ' ' + w[1] + ')' : '-'].join(' | ')); }
    L.push('(also gated in tests/pw_perf.js governor: the rival\'s set = live 60; ratio: 1.5x on DPR 3, 1.5 -> 1.25 -> 1.0 on slow frames, never mid-song, back up on fast frames)');
    L.push('');
  }
  if (g1 || g4) {
    L.push('## Gig peak: Hail Damage, Mudstonbury main stage, Expert, 6 lanes + pedal, 170 BPM, forced crowd moments');
    if (bg4 && bg4.frame) L.push('same-run before (0.9 build, CPU x4): JS/frame p50/p95 ' + bg4.frame.js.p50 + '/' + bg4.frame.js.p95 + ' | render() ' + bg4.frame.render.p50 + '/' + bg4.frame.render.p95 + ' | peak sources ' + bg4.audio.peak.peak + ' | nodes/s ' + bg4.audio.nodesPerSec + ' (drum hits ' + bg4.audio.hitNodesPerSec + ')');
    for (const [k, g] of [['x1', g1], ['x4', g4]]) {
      if (!g || !g.frame) continue;
      const a = g.audio, drops = a.counts.dropped - (a.drops0.dropped || 0), tapDrops = a.counts.tapDrops - (a.drops0.tapDrops || 0);
      L.push('CPU ' + k + ': JS/frame p50/p95 ' + g.frame.js.p50 + '/' + g.frame.js.p95 + ' ms (before ' + BEFORE.gig[k].js + ') | render() p50/p95 ' + g.frame.render.p50 + '/' + g.frame.render.p95 +
        ' (before ' + BEFORE.gig[k].render + ') | calls/tris ' + (g.mid ? g.mid.info.calls + '/' + g.mid.info.tris : '-') + ' | heap ' + g.heap.usedMB + ' MB');
      L.push('   audio: peak sources ' + a.peak.peak + ' (before ' + BEFORE.gig[k].peak + '; gate <= 32 ' + ok(a.peak.peak <= 32) + ') | nodes/s ' + a.nodesPerSec + ' (before ' + BEFORE.gig[k].nodes + '; gate <= 80 ' + ok(a.nodesPerSec <= 80) + ')' +
        ' | tap drops ' + tapDrops + ' (gate 0 ' + ok(tapDrops === 0) + ') | song drops ' + drops + ' | taps ' + a.taps + ' ' + JSON.stringify(a.judged) + (a.global ? ' | global ' + JSON.stringify(a.global) : ''));
    }
    L.push('');
  }
  if (au) {
    const f = o => o ? Object.entries(o).map(([k, v]) => k + ' ' + v.nodes).join(', ') : '-';
    L.push('## Audio nodes per live drum hit (GG.audio.hit outside a song): live synthesis -> pre-rendered');
    L.push('first hits right after the unlock (the kit renders in ~' + (au.prerender ? au.prerender.ms : '?') + ' ms, so mostly pre-rendered already): ' + f(au.live) + ' | v0.9 live synthesis: ~5.7 nodes per hit (same-run gig: 105 nodes/s from 18.4 hits/s)');
    L.push('pre-rendered:   ' + f(au.ready) + ' ' + JSON.stringify(au.prerender));
    L.push('');
  }
  if (st) {
    L.push('## First-visit stalls (CPU x4): quickStart ' + st.quickStart.quickStart + ' ms (before 1.5-1.8 s at x1; logo readback = Lane M), first garage build ' + st.quickStart.garage +
      ' ms, first festival stage ' + st.stage + ' ms (before 935 ms incl. first-use shaders), first van ' + st.van + ' ms (before 643 ms)');
    L.push('   space atlas at tier 0: ' + JSON.stringify(st.atlas && st.atlas.atlas) + ' (before 2048x1024 allocated) | textures in the garage: ' + JSON.stringify(st.atlas && st.atlas.tex) + ' | shader checks: ' + (st.atlas && st.atlas.shaderChecks) + ' (automation; off for players)');
    L.push('   the crowd\'s audio after the first garage entry, no tap yet: ' + JSON.stringify(st.crowdWarm) + ' (before: built only after the first tap)');
    L.push('');
  }
  if (tt) L.push('## Time to interactive (median of ' + (tt.trials.length / Math.max(1, Object.keys(tt.median).length)) + '): x1 ' + (tt.median.x1 ? tt.median.x1.tti : '-') + ' ms (before ' + BEFORE.tti.x1 + ') | x4 ' + (tt.median.x4 ? tt.median.x4.tti : '-') + ' ms (before ' + BEFORE.tti.x4 + ')' +
    (btt && btt.median ? ' | same-run before: x1 ' + (btt.median.x1 ? btt.median.x1.tti : '-') + ' / x4 ' + (btt.median.x4 ? btt.median.x4.tti : '-') + ' ms' : ''));
  if (s1 && s1.scenes.stage_club) {   // v1.1 seats (Lane C): <= the drum scene x 1.15
    const sc = s1.scenes, seatLine = (k, base) => sc[k] ? k + ' ' + sc[k].info.calls + ' calls / ' + sc[k].info.tris + ' tris ' + ok(sc[k].info.calls <= Math.floor(sc[base].info.calls * 1.15)) + ' (<= ' + base + ' ' + sc[base].info.calls + ' x 1.15)' : k + ' -';
    L.push('## v1.1 seats: ' + [seatLine('stage_club_seat_bass', 'stage_club'), seatLine('stage_club_seat_lead', 'stage_club'), sc.garage_hail_damage ? seatLine('garage_seat_rhythm', 'garage_hail_damage') : ''].join(' | '));
    L.push('');
  }
  if (sz) L.push('## Size: dist/game.html ' + sz.bytes + ' B (gate <= 5,000,000 (v1.1, E14) ' + ok(sz.bytes <= 5000000) + '), gzip-9 ' + sz.gzip + ' B');
  const txt = L.join('\n') + '\n';
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, txt);
  console.log(txt);
  return txt;
}

module.exports = { open, frames, sample, heap, PROBE };

if (require.main === module) {
  const what = process.argv[2] || 'all';
  (async () => {
    if (what === 'scenes') await scenes();
    else if (what === 'gig') await gig();
    else if (what === 'tti') await tti();
    else if (what === 'audio') await audio();
    else if (what === 'stalls') await stalls();
    else if (what === 'governor') await governor();
    else if (what === 'size') size();
    else if (what === 'report') report();
    else if (what === 'all') {
      size(); await scenes(1); await scenes(4); await governor(); await gig(1); await gig(4); await audio(); await stalls(4); await tti([1, 4]); report();
    } else { console.log('usage: node tools/perf.js [all|scenes|governor|gig|tti|audio|stalls|size|report]'); process.exitCode = 2; }
  })().catch(e => { console.error(e); process.exitCode = 1; });
}
