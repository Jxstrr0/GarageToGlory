// pw_title.js: v0.7.1 3D title screen on a 390x844 phone viewport. Sections META_ONLY=scene|flow (default all).
//   scene : boot → the 'title' scene draws under a transparent title screen (not paused, frames advance, hail falling,
//           Hail Damage + you built, framed between the logo and the menu, draw calls sane); a real touch on the kit
//           passes through the title layer to the canvas (a fill); Marcel/truck/house taps; a lightning strike;
//           storm ambience after the audio unlock.
//   flow  : menu over the scene (slots sheet keeps it drawing, the genre screen pauses it, back resumes it); a career
//           takes over (garage scene, title disposed); quit to title rebuilds it; no WebGL → the flat title still works.
// Run: node build.js && timeout 300 node tests/pw_title.js
const { open, checker } = require('./_pw');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);
const tid = id => `[data-testid="${id}"]`;
const R = page => page.evaluate(() => ({ r: GG.debug('render'), t: GG.render.title.info() }));
// Wait until the title scene has drawn a couple more frames (headless software GL can run at a few fps under load).
const frames = async (page, n = 2) => { const f = await page.evaluate(() => GG.render.title.info().frame); await page.waitForFunction(([f, n]) => GG.render.title.info().frame >= f + n, [f, n], { timeout: 15000 }); };

async function scene() {
  const c = checker('scene');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.waitForFunction(() => GG.render.title.info().frame > 8, null, { timeout: 15000 });
    const a = await R(page);
    c.ok(a.r.scene === 'title' && !a.r.paused && a.r.available, 'title scene drawing at boot ' + JSON.stringify({ scene: a.r.scene, paused: a.r.paused }));
    c.ok(a.t.built && a.t.hail >= 200 && a.t.falling > 20, 'hail: ' + a.t.hail + ' stones, ' + a.t.falling + ' falling');
    c.ok(['marcel', 'dana', 'jaxon', 'kenji', 'player'].every(id => a.t.people.includes(id)), 'Hail Damage + you: ' + a.t.people.join(','));
    c.ok(a.r.drawCalls > 10 && a.r.drawCalls < 60, 'draw calls ' + a.r.drawCalls);
    c.ok(a.t.view.top > 120 && a.t.view.bottom > 150, 'framed between logo and menu ' + JSON.stringify(a.t.view));
    const cls = await page.evaluate(() => ({ full: document.querySelector('[data-screen="title"] .full').className, bg: getComputedStyle(document.querySelector('[data-screen="title"] .full')).backgroundImage }));
    c.ok(/title3d/.test(cls.full) && cls.bg === 'none', 'title screen is transparent over the scene');
    const f0 = a.t.frame;
    await page.waitForTimeout(600);
    c.ok((await R(page)).t.frame > f0, 'frames advance');
    // A real touch on the kit goes through the title layer to the canvas.
    const kp = await page.evaluate(() => GG.render.worldToScreen(0.45, 0.75, -3.9));
    c.ok(kp && kp.y > 200 && kp.y < 560, 'kit on screen at ' + JSON.stringify(kp));
    await page.touchscreen.tap(kp.x, kp.y);
    await page.waitForFunction(() => GG.render.title.info().taps.kit === 1, null, { timeout: 3000 }).catch(() => {});
    c.ok((await R(page)).t.taps.kit === 1, 'tapping the kit plays a fill (touch passes through the title)');
    const hint = await page.locator(tid('title-hint')).count();
    c.ok(hint === 1, 'tap hint shown');
    const s0 = (await R(page)).t.strikes;
    c.ok(await page.evaluate(() => GG.render.title.tap('marcel') && GG.render.title.tap('truck') && GG.render.title.tap('house')), 'Marcel / truck / house taps');
    await page.waitForTimeout(300);
    const b = await R(page);
    c.ok(b.t.strikes > s0 && b.t.taps.marcel === 1 && b.t.taps.truck === 1 && b.t.taps.house === 1, 'Marcel summons lightning ' + JSON.stringify(b.t.taps));
    // Audio: the tap unlocked it; the storm bed plays on the title.
    await page.waitForFunction(() => GG.audio.ambience && GG.audio.ambience() === 'storm', null, { timeout: 4000 }).catch(() => {});
    const amb = await page.evaluate(() => ({ mode: GG.audio.ambience(), ctx: GG.audio.context() && GG.audio.context().state }));
    c.ok(amb.mode === 'storm' || amb.ctx !== 'running', 'storm ambience on the title ' + JSON.stringify(amb));
    c.ok(await page.evaluate(() => GG.audio.sfx('thunder') !== undefined && GG.audio.sfx('honk') !== undefined), 'thunder + honk sfx exist');
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'scene threw: ' + (e.stack || e)); }
  await close();
  c.done();
}

async function flow() {
  const c = checker('flow');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.click(tid('btn-new'));
    await page.waitForFunction(() => GG.debug('ui').screen === 'slots');
    await page.waitForTimeout(250);
    let a = await R(page);
    c.ok(a.r.scene === 'title' && !a.r.paused, 'slots sheet over the live scene');
    await page.click(tid('slot-1'));
    await page.waitForFunction(() => GG.debug('ui').screen === 'genre');
    a = await R(page);
    c.ok(a.r.paused, 'genre screen covers it: paused');
    await page.click(tid('btn-back'));
    await page.waitForFunction(() => GG.debug('ui').screen === 'title');
    await page.waitForTimeout(250);
    a = await R(page);
    c.ok(a.r.scene === 'title' && !a.r.paused, 'back on the title: drawing again');
    await page.evaluate(() => GG.main.quickStart({ seed: 7, name: 'Tess', openCard: false }));
    await page.waitForTimeout(300);
    a = await R(page);
    c.ok(a.r.scene === 'garage' && !a.t.built, 'career: garage scene, title disposed ' + a.r.scene);
    const amb = await page.evaluate(() => GG.audio.ambience());
    c.ok(amb !== 'storm', 'no storm in the garage: ' + amb);
    await page.evaluate(() => GG.main.quitToTitle());
    await page.waitForFunction(() => GG.render.title.info().frame > 3, null, { timeout: 10000 });
    a = await R(page);
    c.ok(a.r.scene === 'title' && a.t.built && !a.r.paused, 'quit to title: rebuilt and drawing');
    await page.click(tid('btn-continue'));
    await page.waitForFunction(() => GG.state && GG.debug('render').scene === 'garage', null, { timeout: 10000 });
    c.ok(!(await R(page)).t.built, 'continue: back to the garage, title disposed');
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'flow threw: ' + (e.stack || e)); }
  await close();
  // Without three.js the flat title still works.
  const o = await open({ noGoto: true });
  try {
    await o.context.unroute('**/three.min.js');
    await o.context.route('**/three.min.js', r => r.abort());
    await o.page.goto(o.url);
    await o.page.waitForSelector(tid('btn-new'));
    const flat = await o.page.evaluate(() => ({ avail: GG.render.available, cls: document.querySelector('[data-screen="title"] .full').className }));
    c.ok(!flat.avail && !/title3d/.test(flat.cls), 'no WebGL: flat title ' + JSON.stringify(flat));
    await o.page.click(tid('btn-new'));
    await o.page.waitForFunction(() => GG.debug('ui').screen === 'slots');
    c.ok(true, 'menu works without 3D');
  } catch (e) { c.ok(false, 'no-3D threw: ' + (e.stack || e)); }
  await o.close();
  c.done();
}

//   prefs : Settings opened over the live title — reduced flashing, camera shake and graphics quality apply to the scene
//           at once (no rebuild), and a resize while the title is covered doesn't break its framing.
async function prefs() {
  const c = checker('prefs');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.waitForFunction(() => GG.render.title.info().frame > 8, null, { timeout: 15000 });
    const a = (await R(page)).t;
    c.ok(a.calm === false && a.shake === true && a.hail === 720, 'defaults: full storm ' + JSON.stringify([a.calm, a.shake, a.hail]));
    await page.click(tid('title-settings'));
    await page.waitForFunction(() => GG.debug('ui').screen === 'settings');
    for (const id of ['set-reducedFlash', 'set-cameraShake', 'set-gfx-low']) { await page.click(tid(id)); await page.waitForTimeout(80); }
    await page.setViewportSize({ width: 400, height: 860 });   // a resize while the title is hidden under Settings
    await page.waitForTimeout(200);
    await page.click(tid('set-done'));
    await page.waitForFunction(() => GG.debug('ui').screen === 'title');
    await frames(page);
    const b = (await R(page)).t;
    c.ok(b.built && b.frame > a.frame, 'same scene, still drawing (no rebuild needed)');
    c.ok(b.calm === true && b.shake === false, 'reduced flashing + no camera shake apply live ' + JSON.stringify([b.calm, b.shake]));
    c.ok(b.hail >= 60 && b.hail < a.hail, 'graphics Low trims the hail live: ' + a.hail + ' → ' + b.hail);
    c.ok(b.view.top > 120 && b.view.bottom > 150 && b.view.top < 860 * 0.45, 'framing re-measured after Settings closes ' + JSON.stringify(b.view));
    await page.click(tid('title-settings'));
    await page.waitForFunction(() => GG.debug('ui').screen === 'settings');
    await page.click(tid('set-gfx-high')); await page.click(tid('set-reducedFlash'));
    await page.click(tid('set-done'));
    await page.waitForFunction(() => GG.debug('ui').screen === 'title');
    await frames(page);
    const d = (await R(page)).t;
    c.ok(d.hail === 720 && d.calm === false, 'back to High: the full storm returns ' + JSON.stringify([d.hail, d.calm]));
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'prefs threw: ' + (e.stack || e)); }
  await close();
  c.done();
}

(async () => {
  if (want('scene')) await scene();
  if (want('flow')) await flow();
  if (want('prefs')) await prefs();
})();
