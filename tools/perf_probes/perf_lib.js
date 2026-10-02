// perf_lib.js (v1.0 perf baseline, scratch only): opens dist/game.html (scratch copy) in headless Chromium with the same
// swiftshader flags as tests/_pw.js, plus in-page probes installed before any page script runs:
//   - rAF wrapper: per frame [ts, js ms] (sum of all rAF callback time in that frame)
//   - THREE.WebGLRenderer capture (on DOMContentLoaded, before GG boots): render() wall time per call, last scene/camera
//   - Web Audio: every created node counted; every scheduled source's [start, end] on the context clock (peak overlap)
//   - longtask observer
// open({ w, h, dpr, throttle, query }) -> { page, cdp, errors, close }
const path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const HERE = __dirname;
const THREE_FILE = path.join(HERE, 'tests', '.cache', 'three-0.149.0.min.js');
const GAME = path.join(HERE, 'dist', 'game.html');

const PROBE = () => {
  const P = window.__perf = { frames: [], renders: [], renderers: [], longs: [], scene: null, cam: null, t0: performance.now() };
  // ---- rAF ----
  const raf0 = window.requestAnimationFrame.bind(window);
  let fTs = -1, fJs = 0;
  window.requestAnimationFrame = function (cb) {
    return raf0(function (ts) {
      if (ts !== fTs) { if (fTs >= 0) P.frames.push(fTs, fJs); fTs = ts; fJs = 0; }
      const t0 = performance.now();
      try { cb(ts); } finally { fJs += performance.now() - t0; }
    });
  };
  // ---- long tasks ----
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) P.longs.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  // ---- three.js renderer capture ----
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
  // ---- Web Audio ----
  const A = P.audio = { created: {}, srcs: [] };
  const BAC = window.BaseAudioContext || window.AudioContext;
  if (BAC) {
    const proto = BAC.prototype;
    Object.getOwnPropertyNames(proto).filter(k => /^create/.test(k) && typeof proto[k] === 'function').forEach(k => {
      const f0 = proto[k];
      proto[k] = function () {
        const n = f0.apply(this, arguments);
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
  // ---- helpers called from the test ----
  P.mark = () => { P.frames.length = 0; P.renders.length = 0; P.mt = performance.now(); fTs = -1; };
  const pct = (a, p) => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y); return +b[Math.min(b.length - 1, Math.floor(p * b.length))].toFixed(2); };
  P.read = () => {
    const ts = [], js = [];
    for (let i = 0; i < P.frames.length; i += 2) { ts.push(P.frames[i]); js.push(P.frames[i + 1]); }
    const iv = []; for (let i = 1; i < ts.length; i++) iv.push(ts[i] - ts[i - 1]);
    const secs = (performance.now() - P.mt) / 1000;
    return { secs: +secs.toFixed(2), frames: ts.length, fps: +(ts.length / secs).toFixed(1),
      frame: { p50: pct(iv, 0.5), p95: pct(iv, 0.95), max: pct(iv, 1) }, js: { p50: pct(js, 0.5), p95: pct(js, 0.95), max: pct(js, 1) },
      render: { p50: pct(P.renders, 0.5), p95: pct(P.renders, 0.95), n: P.renders.length } };
  };
  // Peak overlap of scheduled sources on the audio clock (sweep line). end = min(stop, natural end, ended event).
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
  // Scene census: objects by type, draw-relevant meshes, materials, geometries (+ bytes), textures (+ bytes), labels.
  P.census = () => {
    const s = P.scene; if (!s) return null;
    const c = { objects: 0, meshes: 0, visibleMeshes: 0, skinned: 0, instanced: 0, instances: 0, sprites: 0, lines: 0, points: 0, autoMatrix: 0,
      mats: new Set(), geos: new Set(), texs: new Set(), verts: 0, geoBytes: 0, texBytes: 0, vcMeshes: 0 };
    const visibleChain = o => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
    s.traverse(o => {
      c.objects++; if (o.matrixAutoUpdate) c.autoMatrix++;
      if (o.isMesh || o.isSprite || o.isLine || o.isPoints) {
        const mats = [].concat(o.material || []); mats.forEach(m => { c.mats.add(m); for (const k of ['map', 'alphaMap', 'emissiveMap']) if (m[k]) { c.texs.add(m[k]); if (!m[k].__who) m[k].__who = (o.isSprite ? 'sprite:' : 'mesh:') + (o.name || (o.parent && o.parent.name) || '') + (o.userData && (o.userData.action || o.userData.label) ? '@' + (o.userData.action || o.userData.label) : ''); } });
        if (o.isSprite) c.sprites++; else if (o.isLine) c.lines++; else if (o.isPoints) c.points++; else c.meshes++;
        if (o.isSkinnedMesh) c.skinned++;
        if (o.isInstancedMesh) { c.instanced++; c.instances += o.count; }
        if (o.isMesh && visibleChain(o) && mats.some(m => m.visible)) { c.visibleMeshes++; if (mats.length === 1 && mats[0].vertexColors && !o.isSkinnedMesh && !o.isInstancedMesh) c.vcMeshes++; }
        if (o.geometry && !c.geos.has(o.geometry)) {
          c.geos.add(o.geometry);
          const g = o.geometry; if (g.attributes.position) c.verts += g.attributes.position.count;
          for (const k in g.attributes) c.geoBytes += g.attributes[k].array.byteLength; if (g.index) c.geoBytes += g.index.array.byteLength;
        }
      }
    });
    if (s.background && s.background.isTexture) c.texs.add(s.background);
    const tl = [];
    c.texs.forEach(t => { const im = t.image; if (im && im.width) { const b = im.width * im.height * 4 * (t.generateMipmaps !== false ? 1.33 : 1); c.texBytes += b; tl.push([Math.round(b / 1024), im.width + 'x' + im.height, t.__who || '?', (im.tagName || im.constructor.name)]); } });
    c.texList = tl.sort((a, b) => b[0] - a[0]).slice(0, 8);
    const out = Object.assign({}, c, { mats: c.mats.size, geos: c.geos.size, texs: c.texs.size, geoKB: Math.round(c.geoBytes / 1024), texKB: Math.round(c.texBytes / 1024) });
    delete out.geoBytes; delete out.texBytes; return out;
  };
  P.info = () => {
    const r = P.renderers[0]; if (!r) return null; const i = r.info;
    return { calls: i.render.calls, tris: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, programs: (i.programs || []).length,
      px: r.getPixelRatio(), size: (() => { const v = r.domElement; return v.width + 'x' + v.height; })(), renderers: P.renderers.length };
  };
};

async function open(opts) {
  opts = opts || {};
  const browser = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info'] });
  const context = await browser.newContext({ viewport: { width: opts.w || 390, height: opts.h || 844 }, deviceScaleFactor: opts.dpr || 1, isMobile: true, hasTouch: true });
  await context.route('**/three.min.js', r => r.fulfill({ path: THREE_FILE, contentType: 'application/javascript' }));
  await context.addInitScript(PROBE);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  if (opts.throttle && opts.throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: opts.throttle });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + (e.stack || e.message)));
  const url = 'file://' + GAME + (opts.query || '');
  if (!opts.noGoto) await page.goto(url);
  return { browser, context, page, cdp, errors, url, close: () => browser.close() };
}
async function heap(cdp) {
  await cdp.send('HeapProfiler.enable').catch(() => {});
  await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
  const h = await cdp.send('Runtime.getHeapUsage');
  return { usedMB: +(h.usedSize / 1048576).toFixed(1), totalMB: +(h.totalSize / 1048576).toFixed(1) };
}
async function domNodes(cdp) {
  const m = await cdp.send('Performance.enable').then(() => cdp.send('Performance.getMetrics')).catch(() => null);
  const g = k => m && (m.metrics.find(x => x.name === k) || {}).value;
  return { nodes: g('Nodes'), listeners: g('JSEventListeners'), layouts: g('LayoutCount'), styleRecalcs: g('RecalcStyleCount') };
}
// Waits for n more rendered frames of the 3D core (GG.debug('render').frames), with a long timeout (throttled swiftshader).
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
module.exports = { open, heap, domNodes, frames, sample, pw };
