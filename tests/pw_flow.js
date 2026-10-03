// pw_flow.js: end-to-end UI flows on a 390x844 phone viewport, driven only through data-testid taps.
// Sections (META_ONLY=flow|bands|year|code|layout, comma-separated; default all). Each must finish inside `timeout 500`.
//   flow   : title → new career → week 1 → week 2 → manual save → reload → Continue lands on the same week
//   bands  : (v0.9) the same flow for punk, rock and country: their genre card → their band → week 2 → save → reload →
//            Continue lands on the same week of the same band (bandId, genre, city kept)
//   year   : quickStart, 24 weeks through the UI → year 2 week 1; reload → Continue → same state
//   code   : 2 weeks, back up a save code, restore it in a fresh browser (empty storage); damaged code shows an error
//   layout : every screen has no horizontal overflow and buttons ≥ 44x44; screenshots + one contact sheet
// v0.3: every page runs with GG.ui.gigAutoplay (a bot plays booked gigs instantly, the van drive is skipped); Book blocks
// open the gig board (these flows book the first listing they can).
// Run: node build.js && timeout 500 node tests/pw_flow.js
const fs = require('fs'), path = require('path');
const { open, checker } = require('./_pw');
const CACHE = path.join(__dirname, '.cache');
const VERSION = fs.readFileSync(path.join(__dirname, '..', 'VERSION'), 'utf8').trim();
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);

/* ---- helpers ---------------------------------------------------------------------------------------- */
// Opens the game with the gig autoplay hook set on every load (and reload).
async function openAuto() {
  const o = await open({ noGoto: true });
  await o.context.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { if (window.GG && GG.ui) GG.ui.gigAutoplay = true; }));
  await o.page.goto(o.url);
  return o;
}
const tid = id => `[data-testid="${id}"]`;
const tap = (page, id) => page.locator(tid(id)).last().click();
const visible = (page, id) => page.locator(tid(id)).last().isVisible();
const screen = page => page.evaluate(() => GG.debug('ui').screen);
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });
const snap = page => page.evaluate(() => GG.state && { totalWeek: GG.state.totalWeek, year: GG.state.year, week: GG.state.week,
  fund: GG.state.fund, fans: GG.state.fans, buzz: GG.state.buzz, phase: GG.state.phase, seed: GG.state.seed });
const same = (a, b) => !!a && !!b && a.totalWeek === b.totalWeek && a.fund === b.fund && a.fans === b.fans;
const PLANS = [['rehearse', 'write', 'promote'], ['hustle', 'book', 'rest'], ['rehearse', 'promote', 'hustle'],
  ['write', 'rehearse', 'rest'], ['book', 'hustle', 'rehearse'], ['promote', 'write', 'hustle']];

// v0.2: Go opens the sequencer once per Write block; these flows let the band jam each one.
// v0.3: a Book block then opens the gig board: book the first listing we can (else "No gig").
async function jamWrites(page) {
  await page.waitForFunction(() => ['seq', 'board', 'results'].includes(GG.debug('ui').screen), null, { timeout: 10000 });
  while (await screen(page) === 'seq') {
    const i = await page.evaluate(() => GG.ui.get('seq').data.index);
    await tap(page, 'btn-seq-jam');
    await page.waitForFunction(i => GG.debug('ui').screen !== 'seq' || GG.ui.get('seq').data.index !== i, i, { timeout: 10000 });
  }
  if (await screen(page) === 'board') {
    const id = await page.evaluate(() => { const b = document.querySelector('[data-testid^="book-"]:not([disabled])'); return b ? b.dataset.testid : null; });
    if (id) { await tap(page, id); await waitScreen(page, 'confirm'); await tap(page, 'btn-confirm-yes'); }
    else await tap(page, 'board-skip');
  }
  await waitScreen(page, 'results');
}
// Results → (a booked gig: autoplayed live gig → its results) → wrap.
async function toWrap(page) {
  await tap(page, 'btn-results-ok');
  await page.waitForFunction(() => ['wrap', 'gig-results'].includes(GG.debug('ui').screen), null, { timeout: 15000 });
  if (await screen(page) === 'gig-results') { await tap(page, 'btn-gig-done'); await waitScreen(page, 'wrap'); }
}
// Plays one week through the UI: Monday card (choice 0) → planner → Go (→ jam any Write blocks) → results → wrap → Next week.
async function playWeek(page, acts, opts) {
  opts = opts || {};
  await page.waitForFunction(() => GG.state && (GG.state.phase === 'plan' || GG.debug('ui').screen === 'card'), null, { timeout: 10000 });
  if (await screen(page) === 'card') {
    await tap(page, 'choice-0');
    await tap(page, 'btn-card-ok');
  }
  await page.waitForFunction(() => GG.state.phase === 'plan' && GG.debug('ui').stack.length === 0, null, { timeout: 10000 });
  await tap(page, 'btn-primary');
  await waitScreen(page, 'plan');
  if (opts.accept && await page.locator(tid('offer-accept')).count()) await tap(page, 'offer-accept');
  // Last week's plan stays on the whiteboard: wipe it (right to left, so the next tap fills slot 0) so PLANS really apply.
  for (let i = 2; i >= 0; i--) if (await page.locator(tid('plan-slot-' + i) + '.filled').count()) await tap(page, 'plan-slot-' + i);
  for (const a of acts) await tap(page, 'act-' + a);
  if (opts.onPlan) await opts.onPlan();
  await tap(page, 'btn-go');
  await jamWrites(page);
  if (opts.onResults) await opts.onResults();
  if (await visible(page, 'btn-results-skip')) await tap(page, 'btn-results-skip');
  await toWrap(page);
  if (opts.onWrap) await opts.onWrap();
  await tap(page, 'btn-next-week');
}

/* ---- flow ---------------------------------------------------------------------------------------------- */
async function flow(genre) {
  genre = genre || 'metal';
  const c = checker(genre === 'metal' ? 'flow' : 'flow:' + genre);
  const { page, errors, close } = await openAuto();
  try {
    await page.waitForSelector(tid('btn-new'));
    const credit = await page.textContent(tid('title-credit'));
    c.ok(credit.includes('Prairie Blue Studio') && credit.includes('V' + VERSION), 'title shows studio + version: ' + credit);
    const kitCredit = await page.locator(tid('title-kit-credit')).count() ? await page.textContent(tid('title-kit-credit')) : '';
    c.ok(/The Metal Kick Drum/.test(kitCredit) && /Rafa Prieto/.test(kitCredit) && await page.locator(tid('title-kit-credit')).isVisible(), 'title credits the sample kit (F17): ' + kitCredit);
    c.ok(await page.locator(tid('btn-continue')).count() === 0, 'no Continue on empty storage');
    await tap(page, 'btn-new');
    await tap(page, 'slot-1');
    await waitScreen(page, 'genre');
    c.ok(!(await page.locator(tid('genre-punk')).isDisabled()), 'punk is playable (v0.9)');
    await tap(page, 'genre-' + genre);
    await tap(page, 'btn-intro-next');
    await waitScreen(page, 'seat'); await tap(page, 'seat-next');   // v1.1: the seat picker (drums preselected)
    await waitScreen(page, 'logo'); await tap(page, 'btn-logo-done');   // v0.8.1: the logo picker (5m_ui_logo)
    await waitScreen(page, 'creator');
    c.ok(await page.locator(tid('btn-create')).isDisabled(), 'create disabled until a name is typed');
    await page.fill(tid('creator-name'), 'Tanner');
    await page.fill(tid('creator-nick'), 'Thunderwrist');
    const presets = await page.$$eval('[data-testid^="preset-"]', els => els.map(e => e.dataset.testid));
    c.ok(presets.length >= 2, 'presets shown: ' + presets.length);
    await tap(page, presets[presets.length - 1]);
    await tap(page, 'btn-create');
    await waitScreen(page, 'coldopen');
    await tap(page, 'btn-coldopen-next');
    await tap(page, 'btn-coldopen-skip');
    await page.waitForFunction(() => GG.state && (GG.debug('ui').screen === 'card' || GG.state.phase === 'plan'));
    const st1 = await page.evaluate(() => ({ name: GG.state.player.name, nick: GG.state.player.nick, slot: GG.state.slot, week: GG.state.totalWeek,
      card: GG.debug('ui').screen, phase: GG.state.phase, genre: GG.state.genre, hud: document.querySelector('[data-testid="hud-week"]').textContent }));
    c.ok(st1.name === 'Tanner' && st1.nick === 'Thunderwrist' && st1.slot === '1' && st1.week === 1 && st1.genre === genre, 'career created in slot 1, week 1 (' + st1.genre + ')');
    // v0.9: the other bands' forced week-1 cards come with their content packs; until then week 1 may start on the planner
    if (genre === 'metal') c.ok(st1.card === 'card', 'week-1 Monday card auto-opens');
    else c.ok(st1.card === 'card' || st1.phase === 'plan', 'week 1 starts on the Monday card or the planner: ' + st1.card + '/' + st1.phase);
    c.ok(/Y1/.test(st1.hud) && /W1\/24/.test(st1.hud), 'HUD shows Y1 · W1/24: ' + st1.hud);
    let sawGig = false, savedText = '';
    await playWeek(page, ['rehearse', 'write', 'rest'], {
      onResults: async () => { sawGig = await page.locator(tid('gig-pending')).count() > 0; },
      onWrap: async () => { sawGig = sawGig && await page.evaluate(() => !!(GG.state.lastGig && GG.state.lastGig.live && GG.state.stats.gigs === 1)); await page.waitForFunction(() => /Saved/.test(document.querySelector('[data-testid="saved-indicator"]').textContent), null, { timeout: 3000 }).catch(() => {});
        savedText = await page.textContent(tid('saved-indicator')); }
    });
    c.ok(sawGig, 'week 1: the pre-booked gig is played live (autoplay) after the results');
    c.ok(/Saved/.test(savedText), 'wrap shows the Saved indicator: ' + savedText);
    await page.waitForFunction(() => GG.state.totalWeek === 2);
    c.ok(true, 'reached week 2');
    // (let week 2's Monday settle first: a card opening under the menu mid-tap could swallow the save under load)
    await page.waitForFunction(() => GG.debug('ui').screen === 'card' || GG.state.phase === 'plan', null, { timeout: 10000 }).catch(() => {});
    // Manual save to slot 2 from the ☰ menu (HUD stays tappable over the Monday card sheet).
    await tap(page, 'btn-menu');
    await waitScreen(page, 'menu');
    await tap(page, 'menu-save-2');
    await page.waitForFunction(() => !!document.querySelector('[data-testid="btn-confirm-yes"]') || GG.save.list().some(r => r.slot === '2' && r.exists), null, { timeout: 5000 }).catch(() => {});
    if (await page.locator(tid('btn-confirm-yes')).count()) await tap(page, 'btn-confirm-yes');
    const slot2 = await page.evaluate(() => GG.save.list().filter(r => r.slot === '2')[0]);
    c.ok(slot2 && slot2.exists, 'slot 2 written');
    await tap(page, 'menu-resume');
    const before = await snap(page), band0 = await page.evaluate(() => ({ id: GG.state.bandId, city: GG.state.city }));
    await page.reload();
    await page.waitForSelector(tid('btn-continue'));
    await tap(page, 'btn-continue');
    await page.waitForFunction(() => !!GG.state);
    const after = await snap(page), band1 = await page.evaluate(() => ({ id: GG.state.bandId, city: GG.state.city, genre: GG.state.genre }));
    c.ok(same(before, after) && after.totalWeek === 2, 'Continue → same week/fund/fans: ' + JSON.stringify([before, after]));
    c.ok(band1.id === band0.id && band1.city === band0.city && band1.genre === genre, 'Continue → the same band: ' + JSON.stringify(band1));
    c.ok(await page.evaluate(() => GG.state.slot) === '2', 'career now lives in slot 2');
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'flow threw: ' + (e.stack || e)); }
  await close();
  c.done();
}

/* ---- year ------------------------------------------------------------------------------------------------- */
async function year() {
  const c = checker('year');
  const { page, errors, close } = await openAuto();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => GG.main.quickStart({ seed: 424242, slot: '1', name: 'Yearling' }));
    for (let w = 0; w < 24; w++) {
      await playWeek(page, PLANS[w % PLANS.length], { accept: w % 2 === 0 });
      await page.waitForFunction(n => GG.state.totalWeek === n || GG.state.phase === 'ended', w + 2, { timeout: 10000 });
    }
    const s = await snap(page);
    c.ok(s.year === 2 && s.week === 1 && s.totalWeek === 25, 'reached year 2 week 1: ' + JSON.stringify(s));
    const gigs = await page.evaluate(() => ({ n: GG.state.stats.gigs, live: !!(GG.state.lastGig && GG.state.lastGig.live) }));
    c.ok(gigs.n >= 4 && gigs.live, 'booked gigs were played live by the autoplay bot: ' + JSON.stringify(gigs));
    const hud = await page.textContent(tid('hud-week'));
    c.ok(/Y2/.test(hud) && /W1\/24/.test(hud), 'HUD rolled to Y2 W1: ' + hud);
    await page.waitForTimeout(200);
    await page.reload();
    await page.waitForSelector(tid('btn-continue'));
    await tap(page, 'btn-continue');
    await page.waitForFunction(() => !!GG.state);
    const r = await snap(page);
    c.ok(same(s, r) && r.year === 2, 'Continue restores the same state: ' + JSON.stringify(r));
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'year threw: ' + (e.stack || e)); }
  await close();
  c.done();
}

/* ---- code ---------------------------------------------------------------------------------------------------- */
async function code() {
  const c = checker('code');
  let saveCode = '', before = null;
  {
    const { page, errors, close } = await openAuto();
    try {
      await page.waitForSelector(tid('btn-new'));
      await page.evaluate(() => GG.main.quickStart({ seed: 99, slot: '3', name: 'Coder' }));
      await playWeek(page, PLANS[0]);
      await playWeek(page, PLANS[1], { accept: true });
      await page.waitForFunction(() => GG.state.totalWeek === 3);
      before = await snap(page);
      await tap(page, 'btn-menu');
      await tap(page, 'menu-code');
      await waitScreen(page, 'code');
      saveCode = await page.inputValue(tid('code-text'));
      c.ok(/^GG1:/.test(saveCode) && saveCode.length > 40, 'backup shows a GG1: code (' + saveCode.length + ' chars)');
      await tap(page, 'btn-code-copy');
      await page.waitForTimeout(300);
      c.ok(errors.length === 0, 'no console errors (backup) ' + errors.join(' | '));
    } catch (e) { c.ok(false, 'code/backup threw: ' + (e.stack || e)); }
    await close();
  }
  {
    const { page, errors, close } = await openAuto();
    try {
      await page.waitForSelector(tid('btn-new'));
      c.ok(await page.locator(tid('btn-continue')).count() === 0, 'fresh context has empty storage');
      // Damaged code first: an error message, no exception, no career.
      await tap(page, 'btn-code-restore');
      await waitScreen(page, 'code');
      const i = Math.floor(saveCode.length / 2);
      const damaged = saveCode.slice(0, i) + (saveCode[i] === 'A' ? 'B' : 'A') + saveCode.slice(i + 1);
      await page.fill(tid('code-text'), damaged);
      await tap(page, 'btn-code-load');
      const err = await page.textContent(tid('code-error'));
      c.ok(err.length > 5 && await page.evaluate(() => !GG.state), 'damaged code → error message: ' + err);
      await page.fill(tid('code-text'), saveCode.slice(0, 30));
      await tap(page, 'btn-code-load');
      c.ok((await page.textContent(tid('code-error'))).length > 5, 'truncated code → error message');
      // Real code, with phone copy-paste whitespace.
      await page.fill(tid('code-text'), '  ' + saveCode.replace(/(.{60})/g, '$1\n') + '\n ');
      await tap(page, 'btn-code-load');
      await page.waitForFunction(() => !!GG.state);
      const after = await snap(page);
      c.ok(same(before, after), 'restored state matches: ' + JSON.stringify([before, after]));
      c.ok(errors.length === 0, 'no console errors (restore) ' + errors.join(' | '));
    } catch (e) { c.ok(false, 'code/restore threw: ' + (e.stack || e)); }
    await close();
  }
  c.done();
}

/* ---- layout ---------------------------------------------------------------------------------------------------- */
// Checks the current screen: nothing sticks out horizontally, every visible button is at least 44x44.
async function audit(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const cs = getComputedStyle(e); return cs.visibility === 'hidden' || cs.display === 'none' ? null : r; };
    const name = e => (e.dataset.testid || e.className || e.tagName) + '';
    for (const e of document.querySelectorAll('#hud *, #screens *, #toast *')) {
      const r = vis(e); if (!r) continue;
      if (r.right > W + 1 || r.left < -1) bad.push('overflow ' + name(e) + ' [' + Math.round(r.left) + ',' + Math.round(r.right) + ']');
    }
    for (const sc of document.querySelectorAll('.sheet-body, .full-body, .modal-body')) if (sc.scrollWidth > sc.clientWidth + 1) bad.push('hscroll ' + sc.className);
    if (document.documentElement.scrollWidth > W + 1) bad.push('page hscroll');
    for (const b of document.querySelectorAll('button')) {
      const r = vis(b); if (!r) continue;
      if (r.width < 44 - 0.5 || r.height < 44 - 0.5) bad.push('small ' + name(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
    return bad.slice(0, 8);
  });
}
async function contactSheet(ctx, names) {
  const page = await ctx.newPage();
  const cells = names.map(n => {
    const b64 = fs.readFileSync(path.join(CACHE, 'ui_' + n + '.png')).toString('base64');
    return `<figure><img src="data:image/png;base64,${b64}"><figcaption>${n}</figcaption></figure>`;
  }).join('');
  await page.setViewportSize({ width: 4 * 200 + 10, height: 2 * 452 + 10 });
  await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;padding:5px;background:#05070c;display:grid;grid-template-columns:repeat(4,200px);gap:0;font:12px system-ui;color:#aaa}
    figure{margin:0 0 0 0;padding:4px 5px;width:190px}img{width:190px;height:411px;display:block;border-radius:6px}figcaption{text-align:center;padding:3px}</style>${cells}`);
  await page.screenshot({ path: path.join(CACHE, 'ui_sheet.png'), fullPage: true });
  await page.close();
}
async function layout() {
  const c = checker('layout');
  const { page, context, errors, close } = await openAuto();
  const shots = [];
  async function check(name, shot) {
    await page.waitForTimeout(320);   // let sheet/fade animations settle
    const bad = await audit(page);
    c.ok(bad.length === 0, name + ': no overflow, buttons ≥ 44px ' + bad.join(' ; '));
    if (shot) { await page.screenshot({ path: path.join(CACHE, 'ui_' + name + '.png') }); shots.push(name); }
  }
  try {
    fs.mkdirSync(CACHE, { recursive: true });
    await page.waitForSelector(tid('btn-new'));
    await check('title', true);
    await tap(page, 'btn-load'); await waitScreen(page, 'load'); await check('load');
    await tap(page, 'btn-close');
    await tap(page, 'btn-code-restore'); await waitScreen(page, 'code'); await check('code-restore');
    await tap(page, 'btn-close');
    await tap(page, 'btn-new'); await waitScreen(page, 'slots'); await check('slots');
    await tap(page, 'slot-1'); await waitScreen(page, 'genre'); await check('genre');
    await tap(page, 'genre-metal'); await waitScreen(page, 'intro'); await check('intro');
    await tap(page, 'btn-intro-next'); await waitScreen(page, 'seat'); await check('seat', true);   // v1.1 the seat picker
    await tap(page, 'seat-next'); await waitScreen(page, 'logo'); await check('logo', true);   // v0.8.1
    await tap(page, 'btn-logo-done'); await waitScreen(page, 'creator');
    await page.fill(tid('creator-name'), 'Layla');
    await check('creator', true);
    await tap(page, 'btn-create'); await waitScreen(page, 'coldopen'); await check('coldopen');
    await tap(page, 'btn-coldopen-skip');
    await waitScreen(page, 'card');
    await check('card', true);
    await tap(page, 'choice-0'); await check('card-outcome');
    await tap(page, 'btn-card-ok');
    await page.waitForFunction(() => GG.debug('ui').stack.length === 0);
    await check('garage');
    await tap(page, 'hud-fund'); await check('stat-toast');
    await tap(page, 'btn-primary'); await waitScreen(page, 'plan');
    await tap(page, 'act-rehearse'); await tap(page, 'act-write');
    await check('plan', true);
    await tap(page, 'act-promote');
    await tap(page, 'btn-go'); await waitScreen(page, 'seq');
    await check('seq', true);
    await tap(page, 'btn-seq-jam'); await waitScreen(page, 'results');
    await tap(page, 'btn-results-skip');
    await check('results', true);
    await toWrap(page);
    await check('wrap', true);
    await tap(page, 'btn-next-week');
    await page.waitForFunction(() => GG.state.totalWeek === 2);
    if (await screen(page) === 'card') { await tap(page, 'choice-0'); await tap(page, 'btn-card-ok'); }
    await page.waitForFunction(() => GG.debug('ui').stack.length === 0);
    for (const tab of ['band', 'money', 'label', 'albums', 'chat']) {   // v0.5: + Label, Albums
      await page.evaluate(() => GG.emit('hotspot', { action: 'laptop' }));
      await waitScreen(page, 'laptop');
      await tap(page, 'laptop-tab-' + tab);
      await check('laptop-' + tab, tab === 'band');
      await tap(page, 'btn-close');
    }
    fs.renameSync(path.join(CACHE, 'ui_laptop-band.png'), path.join(CACHE, 'ui_laptop.png'));
    shots[shots.indexOf('laptop-band')] = 'laptop';
    const SPOT = { kit: ['seq', 'btn-seq-close'], gigboard: ['board', 'btn-board-close'], door: ['van-info', 'btn-close'], trophies: ['trophies', 'btn-close'], merch: ['merch', 'btn-close'] };   // v0.5: the real trophy shelf; v0.8: the merch table
    for (const spot of ['kit', 'gigboard', 'merch', 'trophies', 'door']) {
      const [scr, close] = SPOT[spot] || ['soon', 'btn-close'];
      await page.evaluate(a => GG.emit('hotspot', { action: a }), spot);
      await waitScreen(page, scr); await check('hotspot-' + spot);
      await tap(page, close);
    }
    await tap(page, 'btn-menu'); await waitScreen(page, 'menu');
    await check('menu', true);
    await tap(page, 'menu-code'); await waitScreen(page, 'code'); await check('code-backup');
    await tap(page, 'btn-close');
    await tap(page, 'menu-quit'); await waitScreen(page, 'confirm'); await check('confirm');
    await tap(page, 'btn-confirm-no');
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('end'); });
    await check('end');
    await contactSheet(context, shots);
    c.ok(fs.existsSync(path.join(CACHE, 'ui_sheet.png')), 'contact sheet written: ' + shots.join(', '));
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'layout threw: ' + (e.stack || e)); }
  await close();
  c.done();
}

(async () => {
  if (want('flow')) await flow();
  if (want('bands')) for (const g of ['punk', 'rock', 'country']) await flow(g);   // v0.9: every band's new career
  if (want('year')) await year();
  if (want('code')) await code();
  if (want('layout')) await layout();
})();
