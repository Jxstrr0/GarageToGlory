// pw_tutorial.js (v1.0 Lane T; plan_contract_1.0 §5 Lane T acceptance): the in-character lessons in a real browser (?tut=1).
// Sections (META_ONLY=tut_w1|tut_calib|tut_w24|tut_skip|tut_replay, comma-separated; default all). Each fits `timeout 500`.
//   tut_w1     : week one for each band (BANDS=hail_damage,... to narrow): the bubbles come in order (card → walk → plan →
//                write → results → setlist → wrap), taps reach the game while a bubble is up, the first-Write tip stays quiet,
//                nothing shows during the song, the wrap explains each stat once; all seven week-one lessons end up done
//   tut_calib  : ?calib=1&tut=1: a lesson that comes due while the calibration is open waits; the first bubble comes after it closes
//   tut_w24    : weeks 2–4: the gig board, the laptop (chat, money), the merch table, the van, a mood drop: each lesson once
//   tut_skip   : a profile that passed week 4 (meta past4 = 1): the creator offers "Skip the lessons" (on, 48 px) → no lessons;
//                "?" still replays one (Close, done unchanged)
//   tut_replay : every lesson replays from the "?" sheet (ticks for seen ones), never touching state.tutorial.done
// SHOTS=1 saves tests/.cache/tut_<label>.png at every bubble check.
// Every section: no console errors, every bubble button >= 48 px, the bubble stays on screen. PW_VIEW=440x956 for the owner's phone.
// Run: node build.js && timeout 500 node tests/pw_tutorial.js
const { open, checker, VIEW, shotName } = require('./_pw');
const SHOTS = process.env.SHOTS ? require('path').join(__dirname, '.cache') : null;   // SHOTS=1: a screenshot per bubble checked
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);
const BANDS = (process.env.BANDS || 'hail_damage,frost_heave,gravel_kings,grid_road_ramblers').split(',');
const tid = id => `[data-testid="${id}"]`;
let AT = '';
const tap = (page, id) => { AT = id; return page.locator(tid(id)).last().click({ timeout: 10000 }); };
const screen = page => page.evaluate(() => GG.debug('ui').screen);
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });
const bubbleOf = (page, lesson, timeout) => page.waitForSelector(`#tut:not(.off) ${tid('tut-bubble')}[data-lesson="${lesson}"]`, { timeout: timeout || 8000 });
const tut = page => page.evaluate(() => GG.debug('tutorial'));

// Records tut:step / tut:done and what the layer looked like whenever a song was live.
async function openTut(query, opts) {
  opts = opts || {};
  const o = await open({ noGoto: true });
  await o.context.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
    const L = window.__tut = { steps: [], done: [], live: [], calibClosed: 0 };
    if (!window.GG || !GG.on) return;
    const shown = () => { const t = document.getElementById('tut'); return !!(t && !t.classList.contains('off') && t.querySelector('[data-testid="tut-bubble"]')); };
    GG.on('tut:step', p => L.steps.push({ id: p.id, step: p.step, replay: !!p.replay, t: performance.now(), screen: GG.ui.top(), calib: GG.ui.isOpen('calib'), gig: GG.ui.top() === 'gig' }));
    GG.on('tut:done', p => L.done.push(p.id));
    GG.on('gig:song', () => L.live.push(shown()));
    GG.on('gig:judge', () => L.live.push(shown()));
    GG.on('screen:open', p => { if (p.id === 'gig') setTimeout(() => L.live.push(shown()), 0); });
    GG.on('screen:close', p => { if (p.id === 'calib') L.calibClosed = performance.now(); });
  }));
  if (opts.init) await o.context.addInitScript(opts.init);
  await o.page.goto(o.url + query);
  return o;
}
// The bubble's buttons are >= 48 px and the card sits inside the viewport.
async function cardChecks(page, c, label) {
  const r = await page.evaluate(() => {
    const card = document.querySelector('#tut [data-testid="tut-bubble"]'); if (!card) return null;
    const b = card.getBoundingClientRect(), btns = Array.from(card.querySelectorAll('button')).map(x => { const q = x.getBoundingClientRect(); return [x.dataset.testid, Math.round(q.width), Math.round(q.height)]; });
    return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, btns, W: innerWidth, H: innerHeight, sw: document.documentElement.scrollWidth };
  });
  if (!r) { c.ok(false, label + ': bubble present'); return; }
  if (SHOTS) await page.waitForTimeout(450);
  if (SHOTS) await page.screenshot({ path: require('path').join(SHOTS, shotName('tut_' + label.replace(/\W+/g, '_') + '.png')) });
  c.ok(r.btns.length >= 2 && r.btns.every(b => b[1] >= 48 && b[2] >= 48), label + ': bubble buttons >= 48 px ' + JSON.stringify(r.btns));
  c.ok(r.top >= 0 && r.bottom <= r.H && r.left >= 0 && r.right <= r.W && r.sw <= r.W, label + ': bubble on screen, no horizontal scroll');
}
// A tap at the centre of a game control lands on it (the bubble layer lets taps through).
async function reaches(page, id) {
  return page.evaluate(id => {
    const els = Array.from(document.querySelectorAll('[data-testid="' + id + '"]')); const n = els[els.length - 1]; if (!n) return false;
    const r = n.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && (hit === n || n.contains(hit));
  }, id);
}
async function nextUntilLast(page, lesson) {
  for (let k = 0; k < 12; k++) {
    const d = await tut(page);
    if (d.active !== lesson || d.step >= d.steps - 1) return d;
    await tap(page, 'tut-next');
    await page.waitForFunction(([l, s]) => { const x = GG.debug('tutorial'); return x.active !== l || x.step > s; }, [lesson, d.step]);
  }
  return tut(page);
}

/* ---- tut_w1 ------------------------------------------------------------------------------------------------- */
async function weekOne(band) {
  const c = checker('tut_w1:' + band);
  const { page, errors, close } = await openTut('?quick=1&seed=5&tut=1&band=' + band);
  try {
    await waitScreen(page, 'card', 15000);
    const d0 = await tut(page);
    c.ok(d0.enabled && d0.on, 'lessons on with ?tut=1 under automation');
    await bubbleOf(page, 'w1_card');
    await cardChecks(page, c, 'w1_card');
    c.ok(await page.evaluate(() => GG.state.bandId) === band, 'band ' + band);
    const whoOk = await page.evaluate(() => { const w = document.querySelector('[data-testid="tut-bubble"]').dataset.who; return !!w && GG.ui.talkers().some(m => m.id === w); });
    c.ok(whoOk, 'w1_card voiced by a talker of this band');
    c.ok(await reaches(page, 'choice-0'), 'a tap on the card\'s answer reaches the game');
    await tap(page, 'choice-0');
    await tap(page, 'btn-card-ok');
    // w1_walk (the garage): Next through it; the last step points at the big button
    await bubbleOf(page, 'w1_walk');
    await cardChecks(page, c, 'w1_walk');
    const ringed = [];
    for (let k = 0; k < 10; k++) {
      const d = await tut(page);
      if (d.active !== 'w1_walk' || d.step >= d.steps - 1) break;
      await page.waitForTimeout(150);
      ringed.push(await page.evaluate(() => { const r = document.querySelector('[data-testid="tut-ring"]'); return !!r && r.style.display !== 'none'; }));
      await tap(page, 'tut-next');
      await page.waitForFunction(s => GG.debug('tutorial').step > s || GG.debug('tutorial').active !== 'w1_walk', d.step);
    }
    c.ok(ringed.filter(Boolean).length >= 2, 'the walk points at hotspots (ring shown on ' + ringed.filter(Boolean).length + ' steps)');
    c.ok(await reaches(page, 'btn-primary'), 'the big button is tappable under the walk bubble');
    await tap(page, 'btn-primary');
    await waitScreen(page, 'plan');
    await bubbleOf(page, 'w1_plan');
    await cardChecks(page, c, 'w1_plan');
    for (let i = 2; i >= 0; i--) if (await page.locator(tid('plan-slot-' + i) + '.filled').count()) await tap(page, 'plan-slot-' + i);
    for (const a of ['rehearse', 'write', 'rest']) await tap(page, 'act-' + a);
    c.ok(await page.evaluate(() => GG.state.plan.filter(Boolean).length === 3), 'the plan filled with the bubble up (taps reach the game)');
    await tap(page, 'btn-go');
    await waitScreen(page, 'seq');
    await bubbleOf(page, 'w1_write');
    await cardChecks(page, c, 'w1_write');
    const tip = await page.evaluate(() => { const t = document.querySelector('[data-testid="seq-tip"]'); return t ? t.textContent.trim() : ''; });
    c.ok(!/:/.test(tip), 'the first-Write tip stays quiet while w1_write runs: "' + tip + '"');
    await tap(page, 'btn-seq-jam');
    await waitScreen(page, 'results');
    await bubbleOf(page, 'w1_rehearse');
    if (await page.locator(tid('btn-results-skip')).isVisible()) await tap(page, 'btn-results-skip');
    await tap(page, 'btn-results-ok');
    // the van to the first gig (no van lesson in week one), then the setlist sheet
    for (let k = 0; k < 40 && await screen(page) !== 'gig-set'; k++) {
      const s = await screen(page);
      if (s === 'road') { await tap(page, 'road-choice-0'); await tap(page, 'btn-road-ok'); }
      else if (s === 'van') await page.evaluate(() => { const b = document.querySelector('[data-testid="btn-van-skip"]'); if (b && !b.disabled && b.offsetParent) b.click(); });
      await page.waitForTimeout(300);
    }
    await waitScreen(page, 'gig-set', 15000);
    c.ok(!(await page.evaluate(() => window.__tut.steps.some(s => s.id === 'w4_van'))), 'no van lesson in week one');
    await bubbleOf(page, 'w1_gig');
    await cardChecks(page, c, 'w1_gig');
    const g = await nextUntilLast(page, 'w1_gig');
    c.ok(g.active === 'w1_gig', 'w1_gig waits on its last step (Start)');
    await page.evaluate(() => { GG.ui.gigAutoplay = true; });
    await tap(page, 'btn-gig-start');
    await waitScreen(page, 'gig-results', 20000);
    const live = await page.evaluate(() => window.__tut);
    c.ok(live.live.length > 0 && live.live.every(x => x === false), 'no bubble while the song is live (' + live.live.length + ' checks)');
    c.ok(!live.steps.some(s => s.gig), 'no lesson step while the gig screen is open');
    c.ok(live.done.includes('w1_gig'), 'w1_gig done when the show starts');
    await tap(page, 'btn-gig-done');
    await waitScreen(page, 'wrap', 15000);
    await bubbleOf(page, 'w1_wrap');
    await cardChecks(page, c, 'w1_wrap');
    const nWrap = (await tut(page)).steps;
    for (let k = 0; k < 10; k++) {
      const d = await tut(page); if (d.active !== 'w1_wrap') break;
      await tap(page, 'tut-next');
      await page.waitForFunction(([a, s]) => { const x = GG.debug('tutorial'); return x.active !== a || x.step > s; }, [d.active, d.step]);
    }
    const ws = (await page.evaluate(() => window.__tut.steps)).filter(s => s.id === 'w1_wrap').map(s => s.step);
    c.ok(ws.length === nWrap && new Set(ws).size === ws.length && ws.length >= 4, 'each wrap stat explained once: ' + ws.join(','));
    const fin = await page.evaluate(() => ({ done: Object.keys(GG.state.tutorial.done), order: window.__tut.steps.map(s => s.id).filter((x, i, a) => a.indexOf(x) === i), meta: Object.keys(GG.meta.get().lessons) }));
    const W1 = ['w1_card', 'w1_walk', 'w1_plan', 'w1_write', 'w1_rehearse', 'w1_gig', 'w1_wrap'];
    c.ok(W1.every(id => fin.done.includes(id)), 'all seven week-one lessons done: ' + fin.done.join(','));
    c.ok(JSON.stringify(fin.order) === JSON.stringify(W1), 'bubbles came in order: ' + fin.order.join(' → '));
    c.ok(W1.every(id => fin.meta.includes(id)), 'seen lessons recorded in GG.meta');
    const saved = await page.evaluate(() => { const r = GG.save.read('auto'); return r && r.tutorial && Object.keys(r.tutorial.done).length; });
    c.ok(saved >= 7, 'the done lessons are in the autosave: ' + saved);
    await tap(page, 'btn-next-week');
    await page.waitForFunction(() => GG.state.totalWeek === 2);
    c.ok(true, 'week 2 reached');
    c.ok(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } catch (e) { c.ok(false, 'threw at ' + AT + ': ' + e.message.split('\n')[0]); await page.screenshot({ path: require('path').join(__dirname, '.cache', 'tut_fail_' + band + '.png') }).catch(() => {}); }
  finally { await close(); }
  c.done();
}

/* ---- tut_calib ----------------------------------------------------------------------------------------------- */
async function calib() {
  const c = checker('tut_calib');
  const { page, errors, close } = await openTut('?calib=1&tut=1');
  try {
    await waitScreen(page, 'calib', 15000);
    // a career starts underneath the open calibration; its first lesson comes due now
    const q = await page.evaluate(() => {
      GG.main.newCareer({ bandId: 'frost_heave', slot: '1', seed: 9, player: { name: 'Calib' } });
      GG.career.startWeek(GG.state);
      const started = GG.tutorial.check({ event: 'afterCard' });
      return { started, d: GG.debug('tutorial'), calib: GG.ui.isOpen('calib') };
    });
    c.ok(q.calib && q.d.queued === 'w1_walk' && q.d.active === null, 'the lesson waits while the calibration is open: ' + JSON.stringify(q.d));
    await page.waitForTimeout(500);
    c.ok(await page.evaluate(() => window.__tut.steps.length === 0 && !document.querySelector('#tut:not(.off) [data-testid="tut-bubble"]')), 'no bubble over the calibration');
    await tap(page, 'calib-skip');
    await page.waitForFunction(() => !GG.ui.isOpen('calib'));
    await page.waitForFunction(() => GG.debug('tutorial').active === 'w1_walk', null, { timeout: 5000 });
    const L = await page.evaluate(() => window.__tut);
    c.ok(L.steps.length && L.calibClosed && L.steps[0].t >= L.calibClosed && !L.steps.some(s => s.calib), 'the first bubble comes after the calibration closes');
    await page.evaluate(() => GG.ui.closeAll());
    await bubbleOf(page, 'w1_walk');
    await cardChecks(page, c, 'w1_walk after calib');
    c.ok(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } catch (e) { c.ok(false, 'threw at ' + AT + ': ' + e.message.split('\n')[0]); }
  finally { await close(); }
  c.done();
}

/* ---- tut_w24 ------------------------------------------------------------------------------------------------- */
async function weeks24() {
  const c = checker('tut_w24');
  const { page, errors, close } = await openTut('?quick=1&seed=11&tut=1&band=gravel_kings');
  try {
    await waitScreen(page, 'card', 15000);
    await page.evaluate(() => {   // week one behind us (lessons done), now in week 3 with the garage clear
      GG.ui.closeAll();
      ['w1_card', 'w1_walk', 'w1_plan', 'w1_write', 'w1_rehearse', 'w1_gig', 'w1_wrap'].forEach(id => GG.lessons.mark(GG.state, id));
      GG.state.totalWeek = 3; GG.state.week = 3; GG.state.phase = 'plan'; GG.state.card = null; GG.main.sync();
    });
    const count = id => page.evaluate(i => window.__tut.steps.filter(s => s.id === i && s.step === 0).length, id);
    // the gig board (hotspot)
    await page.evaluate(() => GG.ui.hotspot('gigboard'));
    await waitScreen(page, 'board');
    await bubbleOf(page, 'w2_board');
    await cardChecks(page, c, 'w2_board');
    await page.evaluate(() => GG.ui.closeAll());
    await page.evaluate(() => GG.ui.hotspot('gigboard'));
    await waitScreen(page, 'board'); await page.waitForTimeout(400);
    c.ok(await count('w2_board') === 1, 'w2_board once');
    await page.evaluate(() => GG.ui.closeAll());
    // the laptop opens on the chat → w3_chat; the Money tab → w2_money
    await page.evaluate(() => GG.ui.show('laptop', { tab: 'chat' }));
    await bubbleOf(page, 'w3_chat');
    await cardChecks(page, c, 'w3_chat');
    await tap(page, 'laptop-tab-money');
    await bubbleOf(page, 'w2_money');
    c.ok((await page.evaluate(() => window.__tut.done)).includes('w3_chat'), 'w3_chat done when the next lesson takes over');
    await page.evaluate(() => GG.ui.closeAll());
    await page.evaluate(() => GG.ui.show('laptop', { tab: 'chat' }));
    await tap(page, 'laptop-tab-money');
    await page.waitForTimeout(400);
    c.ok(await count('w2_money') === 1 && await count('w3_chat') === 1, 'money and chat once each');
    await page.evaluate(() => GG.ui.closeAll());
    if (await page.evaluate(() => !!GG.ui.openMerch)) {
      await page.evaluate(() => GG.ui.openMerch());
      await page.waitForTimeout(400);
      c.ok(await count('w2_money') === 1, 'the merch table does not repeat the money lesson');
      await page.evaluate(() => GG.ui.closeAll());
    }
    // the van (a drive to a gig in town)
    await page.evaluate(() => {
      const st = GG.state, id = GG.career.firstGigVenue(st), v = GG.gig.venue(id);
      GG.ui.playVan(Object.assign({ venueId: id, name: v.name, city: v.city, tier: v.tier, kind: v.kind, capacity: v.capacity, deal: 'exposure', pay: 0, gas: 5, quirk: '', source: 'test', km: 0 }), function () {});
    });
    await waitScreen(page, 'van');
    await bubbleOf(page, 'w4_van');
    await cardChecks(page, c, 'w4_van');
    const vanWho = await page.evaluate(() => document.querySelector('[data-testid="tut-bubble"]').dataset.who);
    c.ok(vanWho === 'tamara', 'Gravel Kings\' van lesson: Tamara drives: ' + vanWho);
    await page.evaluate(() => GG.ui.closeAll());
    // a mood drop at a wrap (fresh career: the chat lesson not seen yet)
    await page.evaluate(() => { GG.state.tutorial.done = { w1_card: 1, w1_walk: 1, w1_plan: 1, w1_write: 1, w1_rehearse: 1, w1_gig: 1, w1_wrap: 1 }; });
    await page.evaluate(() => {
      const w = { week: 3, year: 1, deltas: {}, members: [{ id: 'lenny', mood: 40, moodDelta: -6 }, { id: 'chase', mood: 70, moodDelta: 1 }] };
      GG.emit('week:wrap', { wrap: w });
      GG.ui.show('wrap', { wrap: w });
    });
    await bubbleOf(page, 'w3_chat');
    c.ok(await page.evaluate(() => { const r = document.querySelector('[data-testid="tut-ring"]'); return !!r && r.style.display !== 'none'; }), 'the mood-drop lesson points at the moods');
    const once = await page.evaluate(() => { const s = window.__tut.steps; return ['w2_board', 'w2_money', 'w4_van'].map(id => s.filter(x => x.id === id && x.step === 0).length); });
    c.ok(once.every(n => n === 1), 'board/money/van lessons ran once each: ' + once.join(','));
    c.ok(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } catch (e) { c.ok(false, 'threw at ' + AT + ': ' + e.message.split('\n')[0]); }
  finally { await close(); }
  c.done();
}

/* ---- tut_skip ------------------------------------------------------------------------------------------------ */
async function skip() {
  const c = checker('tut_skip');
  const { page, errors, close } = await openTut('?tut=1');
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => { GG.meta.get().careers.past4 = 1; GG.meta.save(); });
    c.ok(await page.evaluate(() => GG.tutorial.offerSkip()), 'offerSkip() with past4 = 1');
    await tap(page, 'btn-new');
    await tap(page, 'slot-1');
    await waitScreen(page, 'genre');
    await tap(page, 'genre-rock');
    await tap(page, 'btn-intro-next');
    await waitScreen(page, 'logo'); await tap(page, 'btn-logo-done');
    await waitScreen(page, 'creator');
    await page.fill(tid('creator-name'), 'Skipper');
    const t = await page.evaluate(() => { const b = document.querySelector('[data-testid="tut-skip"]'); if (!b) return null; const r = b.getBoundingClientRect(); return { on: b.getAttribute('aria-pressed'), w: r.width, h: r.height }; });
    c.ok(t && t.on === 'true', '"Skip the lessons" offered and on by default: ' + JSON.stringify(t));
    c.ok(t && t.h >= 48 && t.w >= 48, 'tut-skip >= 48 px');
    await tap(page, 'btn-create');
    await waitScreen(page, 'coldopen');
    await tap(page, 'btn-coldopen-next');
    await tap(page, 'btn-coldopen-skip');
    await page.waitForFunction(() => GG.state && (GG.debug('ui').screen === 'card' || GG.state.phase === 'plan'));
    await page.waitForTimeout(800);
    const d = await tut(page);
    c.ok(!d.on && !d.active && (await page.evaluate(() => window.__tut.steps.length)) === 0, 'no lessons in a skipped career');
    // "?" still replays a lesson
    if (await screen(page) === 'card') { await tap(page, 'choice-0'); await tap(page, 'btn-card-ok'); }
    await page.waitForFunction(() => GG.debug('ui').stack.length === 0, null, { timeout: 8000 });
    const hb = await page.evaluate(() => { const r = document.querySelector('[data-testid="btn-help"]').getBoundingClientRect(); return [r.width, r.height]; });
    c.ok(hb[0] >= 48 && hb[1] >= 48, 'HUD "?" >= 48 px: ' + hb.join('x'));
    await tap(page, 'btn-help');
    await waitScreen(page, 'lessons');
    await tap(page, 'lesson-w1_plan');
    await bubbleOf(page, 'w1_plan');
    await cardChecks(page, c, 'replay w1_plan');
    c.ok(await page.locator(tid('tut-close')).count() === 1 && await page.locator(tid('tut-skip-lessons')).count() === 0, 'a replay closes with "Close"');
    const who = await page.evaluate(() => document.querySelector('[data-testid="tut-bubble"]').dataset.who);
    c.ok(['chase', 'lenny', 'tamara'].includes(who), 'Gravel Kings voices: ' + who);
    await tap(page, 'tut-close');
    c.ok(await page.evaluate(() => Object.keys(GG.state.tutorial.done).length === 0 && !GG.state.tutorial.on), 'replays never change state.tutorial');
    c.ok(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } catch (e) { c.ok(false, 'threw at ' + AT + ': ' + e.message.split('\n')[0]); }
  finally { await close(); }
  c.done();
}

/* ---- tut_replay ---------------------------------------------------------------------------------------------- */
async function replay() {
  const c = checker('tut_replay');
  const { page, errors, close } = await openTut('?quick=1&seed=21&tut=1&band=grid_road_ramblers');
  try {
    await waitScreen(page, 'card', 15000);
    await page.evaluate(() => { GG.ui.closeAll(); GG.lessons.mark(GG.state, 'w1_card'); GG.lessons.stop(GG.state); GG.state.phase = 'plan'; GG.state.card = null; GG.main.sync(); });
    const before = await page.evaluate(() => JSON.stringify(GG.state.tutorial));
    const ids = await page.evaluate(() => GG.lessons.LESSONS.slice());
    await tap(page, 'btn-help');
    await waitScreen(page, 'lessons');
    const rows = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid^="lesson-"]')).map(b => { const r = b.getBoundingClientRect(); return { id: b.dataset.testid, seen: b.dataset.seen, h: r.height }; }));
    c.ok(rows.length === ids.length, 'the "?" sheet lists every lesson: ' + rows.length);
    c.ok(rows.every(r => r.h >= 48), 'lesson rows >= 48 px');
    c.ok((rows.find(r => r.id === 'lesson-w1_card') || {}).seen === '1' && (rows.find(r => r.id === 'lesson-w2_board') || {}).seen === '0', 'seen lessons ticked');
    await page.evaluate(() => GG.ui.closeAll());
    const got = [];
    for (const id of ids) {
      await page.waitForFunction(() => GG.debug('ui').stack.length === 0 || GG.ui.top() === null);
      await tap(page, 'btn-help');
      await waitScreen(page, 'lessons');
      await tap(page, 'lesson-' + id);
      try {
        await bubbleOf(page, id, 5000);
        const d = await tut(page);
        const n = await page.evaluate(i => GG.lessons.steps(GG.state, i).length, id);
        got.push(id);
        c.ok(d.replay && d.steps === n && n >= 2, id + ' replays (' + n + ' steps)');
        if (id === 'w1_walk') await cardChecks(page, c, 'replay ' + id);
        // run it to the end: Next on every step
        for (let k = 0; k < 10; k++) {
          const x = await tut(page); if (x.active !== id) break;
          await tap(page, 'tut-next');
          await page.waitForFunction(([a, s]) => { const y = GG.debug('tutorial'); return y.active !== a || y.step > s; }, [id, x.step]);
        }
      } catch (e) { c.ok(false, id + ' replay bubble: ' + e.message.split('\n')[0]); }
      await page.evaluate(() => GG.ui.closeAll());
    }
    c.ok(got.length === ids.length, 'every lesson replayed: ' + got.length + '/' + ids.length);
    c.ok(await page.evaluate(() => JSON.stringify(GG.state.tutorial)) === before, 'state.tutorial unchanged by replays');
    c.ok(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } catch (e) { c.ok(false, 'threw at ' + AT + ': ' + e.message.split('\n')[0]); }
  finally { await close(); }
  c.done();
}

(async () => {
  console.log('viewport ' + VIEW.width + 'x' + VIEW.height);
  if (want('tut_w1')) for (const b of BANDS) await weekOne(b);
  if (want('tut_calib')) await calib();
  if (want('tut_w24')) await weeks24();
  if (want('tut_skip')) await skip();
  if (want('tut_replay')) await replay();
})();
