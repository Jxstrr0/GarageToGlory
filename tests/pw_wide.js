// pw_wide.js (v1.5 "Desktop", Lane W; plan_contract_1.5 §5 Lane W, §4.6 package B "Centred wide column"): the PC layout in
// desktop contexts (tests/_pw.js open({ desktop: true }): no touch, a fine pointer + hover) at 1280x720, 1440x900, 1920x1080
// (the PC layout) and 800x900 (a narrow window: the phone layout + the gg-desk niceties). PW_VIEW=<w>x<h> runs one size only.
// Sections (META_ONLY=layout|gig|switch|perf|pref, comma-separated; default all), each inside `timeout 500`:
//   layout  html classes (gg-desk, gg-keys, gg-wide only when wide), the 5w block last in <head>; no sideways overflow and
//           every control inside the window on the garage, planner, laptop, gear shop, Settings > Keys, the songwriter
//           editor, the setlist and the title; B's bounds: HUD max 1120 centred, the dock's button 480, the bottom panel
//           min(W, 1120) centred on the window's bottom edge, no grip; the planner's two columns (booked + blocks left of
//           three activity cards across); the garage hotspots on screen above the open planner, insets.bottom = the panel's
//           height (60's updateInsets), insets.left / right 0; the laptop's tab rail; Settings' rail + Keys chips | timing;
//           the songwriter's tools column left of the grid, the header across, Loop / Song / Save under the grid.
//           800x900: no gg-wide, the panel full width, insets without left / right, pxBudget null.
//   gig     4 and 6 drums: the highway centred, clamp(lanes x 110, 46vw, lanes x 140) x clamp(300, 48vh, 540), 16 px off the
//           bottom, the stage visible on both sides (the 3D canvas spans the window), the stage frame below the highway's
//           top, the stage's horizontal field of view <= 100 deg, the song header max 720 centred, "Esc pause" right of the
//           highway (when the merged tree has it).
//   switch  1440 -> 800 -> 1440 with the planner open: gg-wide off / on ('ui:wide'), insets.bottom re-measured each way
//           (= the panel's height), the camera re-fits (hotspots back above the panel); mid-song the switch waits for a
//           pause (gigLive), then lands.
//   perf    1920x1080 at dpr 2 on 'high': <= 2.4 MP drawn (garage + gig; debug('render').pxBudget), the gig frame p95 at
//           1920x1080 <= 1.2 x the 1440x900 p95 (+1 ms); a 1024x1366 desktop context (a tablet: the phone layout) keeps
//           ratio 2 on high (pxBudget null).
//   pref    Settings "Layout": Phone forces the phone layout at 1440x900, PC forces the PC layout at 1050x900 (auto: phone),
//           Auto goes back; set-layout-* buttons when the merged tree has them.
// Run: node build.js && META_ONLY=layout timeout 500 node tests/pw_wide.js
const { open, checker } = require('./_pw');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);
const VIEW = (() => { const m = /^(\d+)x(\d+)$/.exec(String(process.env.PW_VIEW || '')); return m ? { width: +m[1], height: +m[2] } : null; })();
const SIZES = VIEW ? [VIEW] : [{ width: 1280, height: 720 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 800, height: 900 }];
const tid = id => `[data-testid="${id}"]`;
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 15000 });
const tagOf = vp => vp.width + 'x' + vp.height;
const near = (a, b, d) => Math.abs(a - b) <= (d == null ? 1.5 : d);

async function boot(vp, opts) {
  const o = await open(Object.assign({ desktop: true, viewport: vp }, opts || {}));
  await o.page.waitForSelector(tid('btn-new'), { timeout: 60000 });
  await o.page.evaluate(() => { GG.prefs.set({ calibSeen: true, bigText: false, layout: 'auto' }); });
  return o;
}
// a fresh career in the garage (plan phase, nothing open)
async function garage(page, o) {
  await page.evaluate(o => {
    GG.ui.closeAll();
    GG.main.quickStart({ seed: o.seed || 4242, slot: '1', bandId: 'hail_damage', openCard: false });
    const s = GG.state; GG.ui.closeAll(); s.card = null; s.phase = 'plan'; s.liveGig = null; GG.ui.gigAutoplay = false;
    if (o.lanes) { s.gear = Object.assign({}, s.gear, { lanes: o.lanes }); s.songs.length = 0; }
    s.fund = Math.max(s.fund, 2000);
    while (s.songs.length < 3) GG.songs.jam(s, GG.RNG(40 + s.songs.length));
    GG.main.sync();
  }, o || {});
  await page.waitForTimeout(400);
}
async function startGig(page) {
  await page.evaluate(() => { const s = GG.state; GG.ui.closeAll(); s.gig = GG.gig.makeGig(s, GG.content.venues[0].id, 'book'); GG.ui.gigAutoplay = false; GG.ui.playGig(s.gig, () => {}); });
  await waitScreen(page, 'gig-set', 30000);
  await page.evaluate(() => [...document.querySelectorAll('[data-testid="btn-gig-start"]')].pop().click());
  await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 30000 });
}
// every finite animation done (a sheet's slide-in, a screen's fade); infinite ones never count
const settle = page => page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || !isFinite(a.effect.getTiming().iterations)), null, { timeout: 5000 }).catch(() => {});
// the camera at rest (labelBox read equal three times)
async function settle3d(page) {
  await settle(page);
  let last = null, same = 0;
  await page.waitForTimeout(500);
  for (let k = 0; k < 30 && same < 2; k++) {
    const cur = await page.evaluate(() => JSON.stringify((GG.debug('render').labelBox || []).map(x => [x.x, x.y])));
    same = cur === last ? same + 1 : 0; last = cur; await page.waitForTimeout(250);
  }
}
// no sideways scroll; every visible control of the top layer (+ HUD) inside the window
const OVERFLOW = () => {
  const W = innerWidth, bad = [];
  if (document.documentElement.scrollWidth > W + 1) bad.push('page ' + document.documentElement.scrollWidth);
  const ls = [...document.querySelectorAll('#screens > .layer')].filter(l => !l.classList.contains('hidden') && !l.inert);
  const roots = [ls[ls.length - 1], document.getElementById('hud')].filter(Boolean);
  for (const root of roots) for (const e of root.querySelectorAll('button, input, select, textarea, [role="gridcell"]')) {
    if (!e.getClientRects().length || e.closest('[hidden], .hidden')) continue;
    const r = e.getBoundingClientRect(); if (r.width < 1) continue;
    if (r.left < -1 || r.right > W + 1) bad.push((e.getAttribute('data-testid') || e.className) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
  }
  return bad;
};
const rect = (page, sel) => page.evaluate(s => { const e = [...document.querySelectorAll(s)].filter(x => x.getClientRects().length).pop(); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, sel);

/* ---- layout ---------------------------------------------------------------------------------------------------------- */
async function layout() {
  const c = checker('layout');
  for (const vp of SIZES) {
    const tag = tagOf(vp), wideWant = vp.width >= 1000 && vp.height >= 560 && vp.width >= 1.2 * vp.height;
    const { page, errors, close } = await boot(vp);
    try {
      const cls = await page.evaluate(() => ({ html: document.documentElement.className, w: GG.debug('wide') || {}, input: GG.debug('input') }));
      c.ok(/gg-desk/.test(cls.html) && /gg-keys/.test(cls.html) && /gg-wide/.test(cls.html) === wideWant, `${tag}: html "${cls.html}" (gg-wide ${wideWant})`);
      c.ok(cls.w.css && cls.w.last, `${tag}: the 5w block is in <head>, last`);
      const ov = async name => { const b = await page.evaluate(OVERFLOW); c.ok(!b.length, `${tag} ${name}: no sideways overflow ` + b.slice(0, 3).join(' | ')); };
      await ov('title');
      if (wideWant) { const tw = await rect(page, '.title-wrap'); c.ok(tw && tw.w <= 521 && near(tw.l + tw.w / 2, vp.width / 2, 2), `${tag} title: its column max 520 centred ` + JSON.stringify(tw)); }

      await garage(page);
      await settle3d(page);
      await ov('garage');
      const hud = await rect(page, '#hud .hud-bar'), dockBtn = await rect(page, '.dock > .btn');
      if (wideWant) {
        c.ok(hud && hud.w <= 1121 && near(hud.l + hud.w / 2, vp.width / 2, 2), `${tag} garage: HUD max 1120 centred ` + JSON.stringify(hud));
        c.ok(dockBtn && near(dockBtn.w, Math.min(480, vp.width - 32), 2) && near(dockBtn.l + dockBtn.w / 2, vp.width / 2, 2), `${tag} garage: dock button 480 centred ` + JSON.stringify(dockBtn));
      } else c.ok(hud && near(hud.w, vp.width, 1), `${tag} garage: phone HUD full width (${hud && hud.w})`);

      // the planner: B's bottom panel, two columns, the room above it
      await page.evaluate(() => GG.ui.openPlanner()); await waitScreen(page, 'plan'); await page.waitForTimeout(500); await settle3d(page);
      await ov('plan');
      const p = await page.evaluate(() => {
        const sh = document.querySelector('.sheet-layer:not(.hidden) .sheet'), r = sh.getBoundingClientRect(), d = GG.debug('render'), H = innerHeight;
        const top = Math.round(document.querySelector('#hud .hud-bar').getBoundingClientRect().bottom);
        const grip = document.querySelector('.sheet-layer:not(.hidden) .sheet-grip'), acts = document.querySelector('.sheet-layer:not(.hidden) .acts'), gb = document.querySelector('.sheet-layer:not(.hidden) .w2 > .w2-a');
        const hot = GG.contracts.HOTSPOTS.map(a => [a, GG.render.hotspotScreenPos(a)]);
        return { l: r.left, w: r.width, b: r.bottom, h: sh.offsetHeight, top, H, insets: d.insets, pxBudget: d.pxBudget, grip: grip ? getComputedStyle(grip).display : null,
          acts: acts ? { l: acts.getBoundingClientRect().left, cols: getComputedStyle(acts).gridTemplateColumns.split(' ').length } : null, gb: gb ? gb.getBoundingClientRect().right : null,
          hot: hot.map(([a, q]) => q ? [a, Math.round(q.x), Math.round(q.y)] : [a, null, null]), avail: GG.render.available };
      });
      c.ok(p.insets && p.insets.bottom === Math.min(p.h, p.H - p.top - 150), `${tag} plan: insets.bottom ${p.insets && p.insets.bottom} = the panel's height ${p.h}`);
      if (wideWant) {
        c.ok(near(p.w, Math.min(vp.width, 1120)) && near(p.l + p.w / 2, vp.width / 2) && near(p.b, vp.height), `${tag} plan: one bottom panel min(W, 1120) centred ` + JSON.stringify({ l: p.l, w: p.w, b: p.b }));
        c.ok(p.grip === 'none', `${tag} plan: no grip`);
        c.ok(p.insets.left === 0 && p.insets.right === 0, `${tag} plan: insets.left / right 0 (` + JSON.stringify(p.insets) + ')');
        c.ok(p.pxBudget > 0 && Math.abs(p.pxBudget - Math.sqrt(2.4e6 / (vp.width * vp.height))) < 0.002, `${tag}: pxBudget ${p.pxBudget}`);
        if (p.gb != null) c.ok(p.acts && p.gb < p.acts.l && p.acts.cols === 3, `${tag} plan: booked + blocks left (${Math.round(p.gb)}) of three activity cards across (${p.acts && Math.round(p.acts.l)}, ${p.acts && p.acts.cols} cols)`);
        else console.log(`note ${tag}: no .w2 planner hook (Lane N not in this tree): columns not checked`);
        if (p.avail) {
          const off = p.hot.filter(([, x, y]) => x == null || x < 0 || x > vp.width || y < p.top || y > p.H - p.h);
          c.ok(!off.length, `${tag} plan: every garage hotspot on screen above the panel ` + JSON.stringify(off));
        }
      } else {
        c.ok(near(p.l, 0) && near(p.w, vp.width), `${tag} plan: the phone's full-width sheet (${p.l}, ${p.w})`);
        c.ok(p.insets && !('left' in p.insets) && !('right' in p.insets) && p.pxBudget == null, `${tag}: phone insets ${JSON.stringify(p.insets)}, pxBudget ${p.pxBudget}`);
      }

      // the laptop (tab rail), the gear shop, Settings > Keys, the songwriter editor, the setlist
      await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('laptop', { tab: 'band' }); }); await waitScreen(page, 'laptop'); await page.waitForTimeout(300);
      await ov('laptop');
      if (wideWant) {
        const lt = await page.evaluate(() => { const t = document.querySelector('.lt-tabs'), b = t && t.nextElementSibling; return t ? { r: t.getBoundingClientRect().right, h: t.getBoundingClientRect().height, l2: b ? b.getBoundingClientRect().left : null } : null; });
        if (lt) c.ok(lt.l2 != null && lt.r <= lt.l2 && lt.h > 200, `${tag} laptop: tabs a left rail ` + JSON.stringify(lt));
        else console.log(`note ${tag}: no .lt-tabs (Lane N not in this tree)`);
      }
      await page.evaluate(() => { GG.ui.closeAll(); GG.ui.openGear(); }); await waitScreen(page, 'gear'); await page.waitForTimeout(300);
      await ov('gear shop');
      await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('settings', { tab: 'keys' }); }); await waitScreen(page, 'settings'); await page.waitForTimeout(400);
      await ov('settings');
      if (wideWant) {
        const st = await page.evaluate(() => { const rail = document.querySelector('.set-rail'), main = document.querySelector('.set-main'), a = document.querySelector('.set-keys .w2 > .w2-a'), b = document.querySelector('.set-keys .w2 > .w2-b');
          return rail ? { rail: rail.getBoundingClientRect().right, main: main.getBoundingClientRect().left, a: a ? a.getBoundingClientRect().right : null, b: b ? b.getBoundingClientRect().left : null } : null; });
        if (st) c.ok(st.rail <= st.main && (st.a == null || st.a < st.b), `${tag} settings: tab rail | sections; Keys chips | timing ` + JSON.stringify(st));
        else console.log(`note ${tag}: no .set-rail (Lane I not in this tree)`);
        const body = await rect(page, '.layer[data-screen="settings"] .full-body');
        const pad = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.layer[data-screen="settings"] .full-body')).paddingLeft));
        c.ok(near(pad, Math.max(16, (body.w - 1120) / 2), 1), `${tag} settings: a centred column (padding ${pad})`);
      }
      await page.evaluate(() => { GG.ui.closeAll(); GG.ui.openSketch(); }); await waitScreen(page, 'seq');
      await page.evaluate(() => { const b = document.querySelector('[data-testid="btn-quick-tweak"]'); if (b) b.click(); });
      await page.waitForFunction(() => !!document.querySelector('.seq-main'), null, { timeout: 10000 }); await page.waitForTimeout(300);
      await ov('songwriter');
      if (wideWant) {
        const sq = await page.evaluate(() => { const m = document.querySelector('.seq-main'), side = document.querySelector('.full.seq .full-body > .seq-tabs'), head = document.querySelector('.seq-head'), foot = document.querySelector('.full.seq .full-foot .btn');
          return { w2: m.classList.contains('w2-b'), main: m.getBoundingClientRect().left, side: side.getBoundingClientRect().right, headW: head.getBoundingClientRect().width, foot: foot.getBoundingClientRect().left, mainB: m.getBoundingClientRect().bottom, footT: foot.getBoundingClientRect().top }; });
        if (sq.w2) c.ok(sq.side < sq.main && sq.headW > sq.main - sq.side + 300 && sq.foot >= sq.main - 2 && sq.footT >= sq.mainB - 2, `${tag} songwriter: tools left of the grid, header across, Loop / Song / Save under the grid ` + JSON.stringify(sq));
        else console.log(`note ${tag}: no .w2 songwriter hook (Lane N not in this tree)`);
      }
      await page.evaluate(() => GG.ui.closeAll());
      await page.evaluate(() => { const s = GG.state; s.gig = GG.gig.makeGig(s, GG.content.venues[0].id, 'book'); GG.ui.gigAutoplay = false; GG.ui.playGig(s.gig, () => {}); });
      await waitScreen(page, 'gig-set', 30000); await page.waitForTimeout(400); await settle(page);
      await ov('setlist');
      if (wideWant) { const gs = await rect(page, '.sheet-layer:not(.hidden) .sheet'); c.ok(gs && near(gs.w, Math.min(vp.width, 1120)) && near(gs.l + gs.w / 2, vp.width / 2), `${tag} setlist: the bottom panel ` + JSON.stringify(gs)); }
      await page.evaluate(() => GG.ui.closeAll());
      c.ok(!errors.length, `${tag}: no console errors ` + errors.slice(0, 3).join(' | '));
    } catch (e) { c.ok(false, tag + ' threw: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
    finally { await close(); }
  }
  c.done();
}

/* ---- gig ------------------------------------------------------------------------------------------------------------- */
async function gig() {
  const c = checker('gig');
  for (const vp of SIZES.filter(v => v.width >= 1000)) {
    const tag = tagOf(vp);
    const { page, errors, close } = await boot(vp);
    try {
      for (const lanes of [4, 6]) {
        await garage(page, { lanes, seed: 5150 + lanes });
        await page.evaluate(() => { const st = GG.render && GG.render.stage; window.__frames = []; if (st && st.setFrame && !st.__spyW) { const f = st.setFrame; st.setFrame = function (o) { window.__frames.push(o); return f.apply(this, arguments); }; st.__spyW = 1; } });
        await startGig(page);
        await page.waitForTimeout(700);
        const g = await page.evaluate(() => {
          const hw = document.querySelector('.gig-hw').getBoundingClientRect(), cv = document.querySelector('#scene canvas'), bar = document.querySelector('.gig-bar').getBoundingClientRect(), hint = document.querySelector('[data-testid="gig-hint"]');
          const st = GG.render.stage && GG.render.stage.info ? GG.render.stage.info() : {};
          return { lanes: GG.debug('gigui').lanes, hw: { l: hw.left, t: hw.top, w: hw.width, h: hw.height, b: hw.bottom }, cv: cv ? { w: cv.getBoundingClientRect().width, h: cv.getBoundingClientRect().height } : null,
            bar: { l: bar.left, w: bar.width }, hint: hint ? hint.getBoundingClientRect() : null, frame: (window.__frames || []).slice(-1)[0] || null, hFov: st.hFov, built: st.built, W: innerWidth, H: innerHeight };
        });
        const n = g.lanes, expW = Math.min(Math.max(n * 110, Math.min(0.46 * g.W, n * 140)), g.W - 32), expH = Math.max(300, Math.min(0.48 * g.H, 540));
        c.ok(n === lanes, `${tag}: ${n} lanes`);
        c.ok(near(g.hw.w, expW, 2) && near(g.hw.h, expH, 2) && near(g.hw.l + g.hw.w / 2, g.W / 2, 2) && near(g.hw.b, g.H - 16, 2), `${tag} ${n} lanes: the highway centred ${Math.round(g.hw.w)}x${Math.round(g.hw.h)} (want ${Math.round(expW)}x${Math.round(expH)}), bottom ${Math.round(g.hw.b)}`);
        c.ok(g.cv && near(g.cv.w, g.W, 1) && near(g.cv.h, g.H, 1) && g.hw.l > 100 && g.W - (g.hw.l + g.hw.w) > 100, `${tag} ${n} lanes: the stage on both sides (${Math.round(g.hw.l)} px each side, 3D ${g.cv && g.cv.w}x${g.cv && g.cv.h})`);
        if (g.built) {
          c.ok(g.hFov > 30 && g.hFov <= 100.05, `${tag} ${n} lanes: the stage's horizontal field of view ${g.hFov} deg <= 100`);
          c.ok(g.frame && g.H - g.frame.bottom > g.hw.t, `${tag} ${n} lanes: the stage frame runs below the highway's top ` + JSON.stringify(g.frame));
        }
        c.ok(g.bar.w <= 721 && near(g.bar.l + g.bar.w / 2, g.W / 2, 2), `${tag}: the song header max 720 centred (${Math.round(g.bar.w)})`);
        if (g.hint) c.ok(g.hint.left >= g.hw.l + g.hw.w + 10 && g.hint.right <= g.W, `${tag} ${n} lanes: "Esc pause" right of the highway (${Math.round(g.hint.left)})`);
        else console.log(`note ${tag}: no gig-hint (Lane I not in this tree)`);
        await page.evaluate(() => GG.ui.closeAll());
      }
      c.ok(!errors.length, `${tag}: no console errors ` + errors.slice(0, 3).join(' | '));
    } catch (e) { c.ok(false, tag + ' threw: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
    finally { await close(); }
  }
  c.done();
}

/* ---- switch ---------------------------------------------------------------------------------------------------------- */
async function switchSection() {
  const c = checker('switch');
  const { page, errors, close } = await boot({ width: 1440, height: 900 });
  try {
    const state = () => page.evaluate(() => { const sh = document.querySelector('.sheet-layer:not(.hidden) .sheet'), top = Math.round(document.querySelector('#hud .hud-bar').getBoundingClientRect().bottom);
      return { wide: document.documentElement.classList.contains('gg-wide'), bottom: GG.debug('render').insets.bottom, h: sh ? sh.offsetHeight : null, top, H: innerHeight, w: sh ? sh.getBoundingClientRect().width : null }; });
    await page.evaluate(() => { window.__wide = []; GG.on('ui:wide', p => window.__wide.push(p.wide)); });
    await garage(page);
    await page.evaluate(() => GG.ui.openPlanner()); await waitScreen(page, 'plan'); await page.waitForTimeout(600); await settle(page);
    const a = await state();
    c.ok(a.wide && a.bottom === Math.min(a.h, a.H - a.top - 150), '1440: PC layout, insets.bottom = the panel ' + JSON.stringify(a));
    await page.setViewportSize({ width: 800, height: 900 });
    await page.waitForFunction(() => !document.documentElement.classList.contains('gg-wide'), null, { timeout: 4000 });
    await page.waitForTimeout(500);
    const b = await state();
    c.ok(!b.wide && near(b.w, 800) && b.bottom === Math.min(b.h, b.H - b.top - 150) && b.h !== a.h, '800: phone layout, insets re-measured ' + JSON.stringify(b));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => document.documentElement.classList.contains('gg-wide'), null, { timeout: 4000 });
    await page.waitForTimeout(600);
    const d = await state();
    const hot = await page.evaluate(() => GG.render.available ? GG.contracts.HOTSPOTS.map(x => GG.render.hotspotScreenPos(x)).filter(Boolean).map(q => Math.round(q.y)) : []);
    c.ok(d.wide && d.bottom === Math.min(d.h, d.H - d.top - 150) && d.bottom === a.bottom, '1440 again: PC layout, insets as before ' + JSON.stringify(d));
    c.ok(hot.every(y => y < d.H - d.h), 'the room re-framed above the panel (hotspot y ' + Math.max.apply(null, hot.concat([0])) + ' < ' + (d.H - d.h) + ')');
    c.ok(JSON.stringify(await page.evaluate(() => window.__wide)) === '[false,true]', "'ui:wide' false then true " + JSON.stringify(await page.evaluate(() => window.__wide)));
    // mid-song: the switch waits for a pause
    await page.evaluate(() => GG.ui.closeAll());
    await startGig(page);
    await page.setViewportSize({ width: 800, height: 900 });
    await page.waitForTimeout(800);
    const live = await page.evaluate(() => ({ wide: document.documentElement.classList.contains('gg-wide'), live: GG.input && GG.input.gigLive ? GG.input.gigLive() : null }));
    if (live.live === true) {
      c.ok(live.wide, 'mid-song resize to 800: the PC layout stays while the song is live');
      await page.evaluate(() => document.querySelector('[data-testid="btn-gig-pause"]').click());
      await page.waitForFunction(() => GG.debug('gigui').paused, null, { timeout: 5000 });
      await page.waitForFunction(() => !document.documentElement.classList.contains('gg-wide'), null, { timeout: 4000 }).catch(() => {});
      c.ok(!(await page.evaluate(() => document.documentElement.classList.contains('gg-wide'))), 'paused: the switch lands (phone layout)');
    } else console.log('note: GG.input.gigLive not set by this tree (Lane I): mid-song deferral not checked');
    await page.evaluate(() => GG.ui.closeAll());
    c.ok(!errors.length, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'switch threw: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
  finally { await close(); }
  c.done();
}

/* ---- perf ------------------------------------------------------------------------------------------------------------ */
async function perf() {
  const c = checker('perf');
  const p95 = {};
  for (const vp of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    const tag = tagOf(vp);
    const { page, errors, close } = await boot(vp, { dpr: 2 });
    try {
      await page.evaluate(() => GG.prefs.set({ graphics: 'high' }));
      await garage(page); await settle3d(page);
      const gr = await page.evaluate(() => { const cv = document.querySelector('#scene canvas'); return { px: cv.width * cv.height, ratio: GG.debug('perf').pixelRatio, budget: GG.debug('render').pxBudget }; });
      c.ok(gr.px <= 2.4e6 * 1.01 && Math.abs(gr.budget - Math.sqrt(2.4e6 / (vp.width * vp.height))) < 0.002 && gr.ratio <= 2, `${tag} dpr 2 garage: ${(gr.px / 1e6).toFixed(2)} MP drawn <= 2.4 (ratio ${gr.ratio}, budget ${gr.budget})`);
      await startGig(page);
      await page.waitForTimeout(1200);
      // the governor's frame-cost p95 (ms, the last 90 rendered frames) once 60 more frames have drawn
      const r0 = await page.evaluate(() => GG.debug('perf').rendered);
      await page.waitForFunction(n => GG.debug('perf').rendered >= n + 60 || GG.debug('gigui').mode !== 'play', r0, { timeout: 120000 });
      const g = await page.evaluate(() => { const cv = document.querySelector('#scene canvas'), d = GG.debug('perf'); return { px: cv.width * cv.height, p95: d.p95, n: d.rendered }; });
      p95[vp.width] = g.p95;
      c.ok(g.px <= 2.4e6 * 1.01, `${tag} dpr 2 gig: ${(g.px / 1e6).toFixed(2)} MP drawn <= 2.4 (frame-cost p95 ${g.p95} ms over ${g.n - r0} frames)`);
      await page.evaluate(() => GG.ui.closeAll());
      c.ok(!errors.length, `${tag}: no console errors ` + errors.slice(0, 3).join(' | '));
    } catch (e) { c.ok(false, tag + ' threw: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
    finally { await close(); }
  }
  if (p95[1440] && p95[1920]) c.ok(p95[1920] <= 1.2 * p95[1440] + 1, `gig frame p95 1920x1080 ${p95[1920].toFixed(1)} ms <= 1.2 x 1440x900 ${p95[1440].toFixed(1)} ms (+1)`);
  // a tablet-sized desktop context keeps the phone layout and today's ratio
  {
    const { page, errors, close } = await boot({ width: 1024, height: 1366 }, { dpr: 2 });
    try {
      await page.evaluate(() => GG.prefs.set({ graphics: 'high' }));
      await garage(page); await page.waitForTimeout(400);
      const t = await page.evaluate(() => ({ wide: document.documentElement.classList.contains('gg-wide'), ratio: GG.debug('perf').pixelRatio, budget: GG.debug('render').pxBudget }));
      c.ok(!t.wide && t.ratio === 2 && t.budget == null, '1024x1366 desktop (phone layout): ratio 2 on high, no budget ' + JSON.stringify(t));
      c.ok(!errors.length, '1024x1366: no console errors ' + errors.slice(0, 3).join(' | '));
    } catch (e) { c.ok(false, '1024x1366 threw: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
    finally { await close(); }
  }
  c.done();
}

/* ---- pref ------------------------------------------------------------------------------------------------------------ */
async function pref() {
  const c = checker('pref');
  const wideNow = page => page.evaluate(() => document.documentElement.classList.contains('gg-wide'));
  {
    const { page, errors, close } = await boot({ width: 1440, height: 900 });
    try {
      await garage(page);
      c.ok(await wideNow(page), '1440x900 auto: PC layout');
      await page.evaluate(() => GG.prefs.set({ layout: 'phone' }));
      await page.waitForFunction(() => !document.documentElement.classList.contains('gg-wide'), null, { timeout: 3000 }).catch(() => {});
      const ph = await page.evaluate(() => ({ wide: document.documentElement.classList.contains('gg-wide'), hud: document.querySelector('#hud .hud-bar').getBoundingClientRect().width, insets: GG.debug('render').insets }));
      c.ok(!ph.wide && near(ph.hud, 1440, 1) && !('left' in ph.insets), '1440x900 Layout: Phone -> the phone layout ' + JSON.stringify(ph));
      await page.evaluate(() => GG.prefs.set({ layout: 'auto' }));
      await page.waitForFunction(() => document.documentElement.classList.contains('gg-wide'), null, { timeout: 3000 }).catch(() => {});
      c.ok(await wideNow(page), '1440x900 Layout: Auto -> PC layout again');
      // the Settings buttons (Lane I) when this tree has them
      await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('settings', { tab: 'look' }); }); await waitScreen(page, 'settings'); await page.waitForTimeout(300);
      if (await page.$(tid('set-layout-phone'))) {
        await page.evaluate(() => document.querySelector('[data-testid="set-layout-phone"]').click());
        await page.waitForFunction(() => !document.documentElement.classList.contains('gg-wide'), null, { timeout: 3000 }).catch(() => {});
        c.ok(!(await wideNow(page)) && (await page.evaluate(() => GG.prefs.get().layout)) === 'phone', 'set-layout-phone: phone layout, saved');
        await page.evaluate(() => document.querySelector('[data-testid="set-layout-auto"]').click());
        await page.waitForFunction(() => document.documentElement.classList.contains('gg-wide'), null, { timeout: 3000 }).catch(() => {});
        c.ok(await wideNow(page), 'set-layout-auto: PC layout');
      } else console.log('note: no set-layout-* (Lane I not in this tree)');
      await page.evaluate(() => GG.ui.closeAll());
      c.ok(!errors.length, '1440x900: no console errors ' + errors.slice(0, 3).join(' | '));
    } catch (e) { c.ok(false, '1440 threw: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
    finally { await close(); }
  }
  {
    const { page, errors, close } = await boot({ width: 1050, height: 900 });
    try {
      await garage(page);
      c.ok(!(await wideNow(page)), '1050x900 auto (narrower than 1.2 x its height): phone layout');
      await page.evaluate(() => GG.prefs.set({ layout: 'wide' }));
      await page.waitForFunction(() => document.documentElement.classList.contains('gg-wide'), null, { timeout: 3000 }).catch(() => {});
      const w = await page.evaluate(() => ({ wide: document.documentElement.classList.contains('gg-wide'), hud: document.querySelector('#hud .hud-bar').getBoundingClientRect().width, budget: GG.debug('render').pxBudget }));
      c.ok(w.wide && w.hud <= 1050 && w.budget > 0, '1050x900 Layout: PC -> the PC layout ' + JSON.stringify(w));
      await page.evaluate(() => GG.ui.openPlanner()); await waitScreen(page, 'plan'); await page.waitForTimeout(400);
      c.ok(!(await page.evaluate(OVERFLOW)).length, '1050x900 PC layout: the planner fits');
      await page.evaluate(() => { GG.ui.closeAll(); GG.prefs.set({ layout: 'auto' }); });
      c.ok(!errors.length, '1050x900: no console errors ' + errors.slice(0, 3).join(' | '));
    } catch (e) { c.ok(false, '1050 threw: ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); }
    finally { await close(); }
  }
  c.done();
}

(async () => {
  if (want('layout')) await layout();
  if (want('gig')) await gig();
  if (want('switch')) await switchSection();
  if (want('perf')) await perf();
  if (want('pref')) await pref();
})();
