// pw_ending.js (v1.0 "Glory", Lane E; plan_contract_1.0 §4.4 / §5 E): the end sequence on a phone viewport (390x844, or
// PW_VIEW=440x956). Sections META_ONLY=ten|bonus|fixture|preview (default all); each inside `timeout 500`.
//   ten     : quickStart, GG.legacy.noBonus, bot to week 239, play the last week (wrap → "The end →") → every card renders in
//             order (Legacy count-up, tier, specials, epilogues, the Sad Dome line, the summary), the seven parts sum to the
//             score, the member epilogues = the final lineup + originals who left + defectors (the player's card counted
//             separately), no share/screenshot/download text, buttons >= 48 px, no horizontal overflow, Back to title works,
//             and a reload + load shows the same ending with one Hall of Fame entry.
//   bonus   : a good-bot career with bonus years to week 311, the last week played → years 12/13 on the cards, maxWeeks 288/312,
//             the Sad Dome in the last year.
//   fixture : the v0.9 ended save (tests/fixtures/v09_ended) in a slot → the boot's slot scan records it once → loading it
//             shows the ending → still one Hall of Fame entry.
//   preview : a live career (week 30) → show('end') = a read-only preview: the preview tag, nothing written (no state.legacy,
//             no Hall of Fame entry, the save untouched).
// Screenshots tests/.cache/v10_end_<step>[_440].png. Run: node build.js && META_ONLY=ten timeout 500 node tests/pw_ending.js
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const { open, checker, shotName } = require('./_pw');
const CACHE = path.join(__dirname, '.cache');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);
const tid = id => `[data-testid="${id}"]`;
const tap = (page, id) => page.locator(tid(id)).last().click();
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });
const shot = async (page, name) => { await page.waitForTimeout(300); await page.screenshot({ path: path.join(CACHE, shotName('v10_end_' + name + '.png')) }); };
const fixture = name => zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', name + '.json.gz'))).toString('utf8');

// Layout audit of the open screen: horizontal overflow, buttons < 48 px (every v1.0 control), share/screenshot/download text.
function audit(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const cs = getComputedStyle(e); return cs.visibility === 'hidden' || cs.display === 'none' ? null : r; };
    const name = e => (e.dataset.testid || e.className || e.tagName) + '';
    for (const e of document.querySelectorAll('#screens .layer:not([inert]) *')) { const r = vis(e); if (r && (r.right > W + 1 || r.left < -1)) bad.push('overflow ' + name(e)); }
    for (const sc of document.querySelectorAll('.full-body')) if (sc.scrollWidth > sc.clientWidth + 1) bad.push('hscroll ' + sc.className);
    for (const b of document.querySelectorAll('#screens .layer:not([inert]) button')) { const r = vis(b); if (r && (r.width < 47.5 || r.height < 47.5)) bad.push('small ' + name(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
    const text = (document.querySelector('#screens') || document.body).innerText;
    if (/\b(share|screenshot|download)\b/i.test(text)) bad.push('share/screenshot/download text: ' + text.match(/\b(share|screenshot|download)\b/i)[0]);
    return bad.slice(0, 8);
  });
}
// Bot weeks in the page up to `until` (totalWeek), the career's own style; then the last week through the UI.
async function botTo(page, o) {
  await page.waitForFunction(() => window.GG && GG.main && GG.ui && GG.legacy && GG.ui.defined('end'), null, { timeout: 15000 });
  return page.evaluate(o => {
    if (o.noBonus) GG.legacy.noBonus = true;
    GG.ui.gigAutoplay = true; GG.ui.showdownViews = false;
    GG.main.quickStart({ seed: o.seed, slot: '1', bandId: o.band, openCard: false }); GG.ui.closeAll();
    const S = GG.state;
    let guard = 0;
    while (!S.ended && guard++ < 400 && !(S.totalWeek >= S.maxWeeks && S.phase === 'monday') && !(o.stop && S.totalWeek >= o.stop)) GG.career.botWeek(S, o.style || 'avg');
    GG.main.sync();
    return { tw: S.totalWeek, max: S.maxWeeks, phase: S.phase, bonus: S.bonusYears, ended: S.ended, final: S.finalShowdown };
  }, o);
}
// The career's last week: Monday card (bot choice), rest x3, the weekend (autoGig), then the wrap screen through the UI.
async function lastWeek(page, style) {
  await page.evaluate(style => {
    const S = GG.state, C = GG.career;
    const start = C.startWeek(S);
    if (start.card) C.resolveCard(S, C.botChoice(S, start.card, style));
    if (GG.rival) GG.rival.botWeek(S, style);
    if (S.offer) C.declineOffer(S);
    C.setPlan(S, ['rest', 'rest', 'rest']); C.runWeek(S, { autoGig: true, style: style });
    GG.ui.closeAll(); GG.main.wrapWeek();
  }, style || 'avg');
  await waitScreen(page, 'wrap', 15000);
  const wrapText = await page.evaluate(() => document.querySelector('#screens').innerText);
  // the year-24 wrap opens the year in review first; its last page hands over to GG.main.nextWeek (done here directly:
  // the recap is not under test)
  await tap(page, 'btn-next-week');
  await page.waitForFunction(() => ['recap', 'end'].includes(GG.debug('ui').screen), null, { timeout: 15000 });
  if (await page.evaluate(() => GG.debug('ui').screen) === 'recap') await page.evaluate(() => { GG.ui.closeAll(); GG.main.nextWeek(); });
  await waitScreen(page, 'end', 15000);
  return wrapText;
}
// Walks every card with Next, checking each step's testid; returns what it saw.
async function walk(page, c, tag) {
  const info = await page.evaluate(() => { GG.ui.endGo(0); return GG.debug('ending'); });
  const seen = [], bad = [];
  for (let i = 0; i < info.steps.length; i++) {
    const want = info.steps[i], [kind, id] = want.split(':');
    const testid = kind === 'legacy' ? 'end-legacy' : kind === 'tier' ? 'end-tier' : kind === 'special' ? 'end-special-' + id : kind === 'epilogue' ? 'end-epilogue-' + id : kind === 'final' ? 'end-final' : 'end-summary';
    await page.waitForSelector(tid(testid), { timeout: 5000 }).catch(() => bad.push('missing ' + testid));
    const a = await audit(page);
    if (a.length) bad.push(want + ': ' + a.join(', '));
    seen.push(want);
    if (tag != null && ['legacy', 'tier', 'final', 'summary'].includes(kind)) await shot(page, kind + tag);
    if (kind === 'epilogue' && tag != null && !seen.some(x => x.startsWith('epilogue') && x !== want)) await shot(page, 'epilogue' + tag);
    if (kind === 'special' && tag != null && !seen.some(x => x.startsWith('special') && x !== want)) await shot(page, 'special' + tag);
    if (i < info.steps.length - 1) await tap(page, 'end-next');
  }
  c.ok(!bad.length, 'every card renders, no overflow, buttons >= 48 px, no share/screenshot/download: ' + bad.slice(0, 4).join(' | '));
  return { info, seen };
}
async function checkEnding(page, c, label) {
  const v = await page.evaluate(() => {
    const S = GG.state, L = S.legacy, d = GG.debug('ending');
    const parts = [...document.querySelectorAll('[data-testid^="end-part-"]')].map(e => +e.dataset.points);
    const def = S.rivalDefectors || [];
    const expect = S.members.filter(m => m.status === 'active').length + S.members.filter(m => m.original && m.status !== 'active' && !def.includes(m.id)).length
      + S.members.filter(m => m.status !== 'active' && def.includes(m.id)).length;
    return { score: L && L.score, shown: +document.querySelector('[data-testid="end-score"]').dataset.score, parts, partsSum: parts.reduce((a, b) => a + b, 0),
      sum: L ? Object.values(L.parts).reduce((a, b) => a + b, 0) : null, epi: d.epilogues.filter(e => e.kind !== 'player').length, player: d.epilogues.filter(e => e.kind === 'player').length,
      expect, tier: L && L.tier, ended: S.ended, years: L && L.years, maxWeeks: S.maxWeeks, recorded: d.recorded, hof: GG.meta ? GG.meta.hof().length : -1,
      kenji: d.epilogues.filter(e => e.id === 'kenji').map(e => e.silent) };
  });
  c.ok(v.ended && v.score != null && v.shown === v.score && v.parts.length === 7 && v.partsSum === v.score && v.sum === v.score,
    label + ': the seven parts sum to the score (' + v.parts.join('+') + ' = ' + v.score + ', ' + v.tier + ')');
  c.ok(v.epi === v.expect && v.player === 1, label + ': member epilogues = lineup + departed originals + defectors (' + v.epi + ' / ' + v.expect + ') + one player card');
  c.ok(!v.kenji.length || v.kenji.every(Boolean), label + ': Kenji\'s card is narration only (silent)');
  return v;
}

/* ---- ten: a 10-year career (noBonus), the last week played through the UI ------------------------------------------ */
async function ten() {
  const c = checker('ten');
  const { page, errors, close } = await open();
  try {
    const pre = await botTo(page, { seed: 4242, style: 'avg', noBonus: true });
    c.ok(pre.tw === 240 && pre.max === 240 && pre.phase === 'monday' && !pre.ended, 'a 10-year bot career at its last Monday ' + JSON.stringify(pre));
    const wrapText = await lastWeek(page);
    c.ok(/Ten years\./.test(wrapText), 'the wrap says "Ten years."');
    const first = await page.evaluate(() => ({ step: GG.debug('ending').step, legacy: !!document.querySelector('[data-testid="end-legacy"]') }));
    c.ok(first.step === 0 && first.legacy, 'the sequence opens on the Legacy count-up');
    await page.waitForFunction(() => { const e = document.querySelector('[data-testid="end-score"]'); return e && e.textContent === e.dataset.score; }, null, { timeout: 5000 });
    const v = await checkEnding(page, c, 'ten');
    c.ok(v.years === 10 && v.maxWeeks === 240, 'ten years');
    const w = await walk(page, c, '');
    c.ok(w.seen[0] === 'legacy' && w.seen[1] === 'tier' && w.seen[w.seen.length - 2] === 'final' && w.seen[w.seen.length - 1] === 'summary'
      && w.seen.filter(x => x.startsWith('epilogue:')).pop() === 'epilogue:player', 'order: legacy → tier → specials → epilogues (player last) → final → summary: ' + w.seen.join(' '));
    const sum = await page.evaluate(() => ({ t: document.querySelector('[data-testid="end-summary"]').innerText, hofBtn: !!document.querySelector('[data-testid="end-hof"]'), hofDef: GG.ui.defined('hof') }));
    c.ok(/Trophies this career/i.test(sum.t) && sum.hofBtn === sum.hofDef, 'summary: trophies, Hall of Fame button only when the screen exists');
    // the end-skip / end-back controls and a swipe on a fresh open
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('end'); });
    await tap(page, 'end-skip');
    const sk = await page.evaluate(() => GG.debug('ending'));
    c.ok(sk.step === sk.steps.length - 1, 'Skip all jumps to the summary');
    await page.evaluate(() => GG.ui.endGo(1));
    await tap(page, 'end-back');
    c.ok((await page.evaluate(() => GG.debug('ending').step)) === 0, 'Back returns a card');
    // Back to title, then reload + load the slot: the same ending, one Hall of Fame entry
    const before = await page.evaluate(() => ({ score: GG.state.legacy.score, tier: GG.state.legacy.tier, hof: GG.meta.hof().length, id: GG.meta.careerId(GG.state) }));
    await tap(page, 'btn-end-title');
    await waitScreen(page, 'title');
    c.ok(before.hof === 1, 'one Hall of Fame entry after the ending (' + before.hof + ')');
    await page.reload();
    await page.waitForFunction(() => window.GG && GG.main && GG.main.booted && GG.legacy, null, { timeout: 15000 });
    const after = await page.evaluate(() => { GG.main.load('1'); return { scr: GG.debug('ui').screen, score: GG.state && GG.state.legacy && GG.state.legacy.score, tier: GG.state && GG.state.legacy && GG.state.legacy.tier, hof: GG.meta.hof().length, e: GG.meta.hof()[0] }; });
    await waitScreen(page, 'end');
    const again = await page.evaluate(() => ({ d: GG.debug('ending'), hof: GG.meta.hof().length }));
    c.ok(after.score === before.score && after.tier === before.tier && again.d.score === before.score && again.hof === 1 && after.e && after.e.id === before.id && after.e.seat === 'drums',
      'reload: the same ending (' + after.score + ', ' + after.tier + '), still one Hall of Fame entry (' + again.hof + ')');
    c.ok(!errors.length, 'no console errors: ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close(); c.done();
}

/* ---- bonus: a good-bot career with bonus years, to its own last week ---------------------------------------------- */
async function bonus() {
  const c = checker('bonus');
  const { page, errors, close } = await open();
  try {
    let pre = null;
    for (const seed of [7919 * 3, 7919 * 5, 7919 * 7]) {   // the good bot nearly always earns +3 (a seed that does)
      pre = await botTo(page, { seed: seed, style: 'good', band: 'frost_heave' });
      if (pre.bonus === 3) break;
    }
    c.ok(pre.bonus === 3 && pre.max === 312 && pre.tw === 312 && pre.phase === 'monday', 'a bonus career (+3) at its last Monday, week 312 ' + JSON.stringify({ tw: pre.tw, max: pre.max, bonus: pre.bonus }));
    c.ok(pre.final && pre.final.week === 12 * 24 + 21, 'the Sad Dome in the last year (year 13 week 21): ' + JSON.stringify(pre.final));
    const wrapText = await lastWeek(page, 'good');
    c.ok(/Thirteen years\./.test(wrapText), 'the wrap says "Thirteen years."');
    const v = await checkEnding(page, c, 'bonus');
    c.ok(v.years === 13 && v.maxWeeks === 312, 'thirteen years on the ending');
    const t = await page.evaluate(() => { GG.ui.endGo('tier'); return document.querySelector('[data-testid="end-tier"]').innerText; });
    c.ok(/Thirteen years/i.test(t) && /\+3 bonus years/i.test(t), 'the tier card shows the years and the bonus badge');
    await walk(page, c, '_bonus');
    c.ok(!errors.length, 'no console errors: ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close(); c.done();
}

/* ---- fixture: the v0.9 ended save → one Hall of Fame entry ---------------------------------------------------------- */
async function fix() {
  const c = checker('fixture');
  const { page, errors, close } = await open();
  try {
    await page.waitForFunction(() => window.GG && GG.main && GG.main.booted, null, { timeout: 15000 });
    await page.evaluate(rec => { localStorage.clear(); localStorage.setItem('gg.v1.slot.2', rec); }, fixture('v09_ended'));
    await page.reload();
    await page.waitForFunction(() => window.GG && GG.main && GG.main.booted && GG.legacy, null, { timeout: 15000 });
    const boot = await page.evaluate(() => ({ hof: GG.meta.hof().length, scanned: GG.meta.get().scanned, e: GG.meta.hof()[0] }));
    c.ok(boot.hof === 1 && boot.scanned && boot.e && boot.e.bandId === 'gravel_kings' && boot.e.seat === 'drums' && boot.e.score > 0, 'the slot scan records the ended v0.9 career once: ' + JSON.stringify({ hof: boot.hof, score: boot.e && boot.e.score, tier: boot.e && boot.e.tier }));
    await page.evaluate(() => GG.main.load('2'));
    await waitScreen(page, 'end');
    const v = await page.evaluate(() => ({ d: GG.debug('ending'), hof: GG.meta.hof().length, score: GG.state.legacy && GG.state.legacy.score }));
    c.ok(v.hof === 1 && v.score === boot.e.score && v.d.score === boot.e.score, 'loading it shows the same ending, still one entry (' + v.hof + ', ' + v.score + ')');
    await shot(page, 'fixture');
    const a = await audit(page); c.ok(!a.length, 'layout: ' + a.join(', '));
    c.ok(!errors.length, 'no console errors: ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close(); c.done();
}

/* ---- preview: a live career shows a read-only preview ---------------------------------------------------------------- */
async function preview() {
  const c = checker('preview');
  const { page, errors, close } = await open();
  try {
    await botTo(page, { seed: 99, style: 'avg', stop: 30, noBonus: true });
    const before = await page.evaluate(() => ({ save: localStorage.getItem('gg.v1.slot.1'), hof: GG.meta.hof().length, legacy: GG.state.legacy }));
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.show('end'); });
    await waitScreen(page, 'end');
    const v = await page.evaluate(() => ({ tag: !!document.querySelector('[data-testid="end-preview"]'), d: GG.debug('ending'), legacy: GG.state.legacy, hof: GG.meta.hof().length,
      save: localStorage.getItem('gg.v1.slot.1') }));
    c.ok(v.tag && v.d.ended === false && !v.d.recorded && v.legacy === null && v.hof === before.hof && v.save === before.save, 'a preview: tagged, nothing written (legacy null, no Hall of Fame entry, the save untouched)');
    await shot(page, 'preview');
    const w = await walk(page, c, null);
    c.ok(w.seen.length >= 5, 'every preview card renders (' + w.seen.length + ')');
    const after = await page.evaluate(() => ({ legacy: GG.state.legacy, hof: GG.meta.hof().length }));
    c.ok(after.legacy === null && after.hof === before.hof, 'still nothing written after walking it');
    c.ok(!errors.length, 'no console errors: ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close(); c.done();
}

(async () => {
  fs.mkdirSync(CACHE, { recursive: true });
  if (want('ten')) await ten();
  if (want('bonus')) await bonus();
  if (want('fixture')) await fix();
  if (want('preview')) await preview();
})();
