// pw_seq.js: the v0.2 sequencer and the song audio on a 390x844 phone viewport.
// Sections (META_ONLY=seq|audio, comma-separated; default both). Each must finish inside `timeout 500`.
//   seq   : quickStart → plan Write + 2 others → Go → sequencer (first Write: starter + tip) → tap / drag / kick rule →
//           meters change → Play (context running, playhead advances) → Stop → Save → results show the song + reactions
//           → laptop catalog lists it and opens its pattern read-only; kit sketch pad queues a song; in-page
//           GG.songs.rate equals the node result for the same fixtures; layout audit + screenshot tests/.cache/seq.png
//   audio : OfflineAudioContext render of every lane voice and 2 bars of every backing style: non-silent, peak < 1.0,
//           no NaN; a fast song stays within the 12-voice cap.
// Run: node build.js && timeout 500 node tests/pw_seq.js
const fs = require('fs'), path = require('path');
const { open, checker } = require('./_pw');
const load = require('./_load');
const CACHE = path.join(__dirname, '.cache');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);

const tid = id => `[data-testid="${id}"]`;
const tap = (page, id) => page.locator(tid(id)).last().click();
const screen = page => page.evaluate(() => GG.debug('ui').screen);
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });
const meters = page => page.evaluate(() => ['groove', 'hook', 'diff'].map(k => +document.querySelector('[data-testid="meter-' + k + '"]').dataset.value));
const lane = (page, sec, l) => page.evaluate(a => GG.ui.get('seq').data.pat.sections[a[0]][a[1]], [sec, l]);
// Fixtures for the node/browser parity check.
const FIXTURES = [
  { bpm: 155, lanes: 4, arrangement: ['verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus'], sections: {
    verse: ['x.x.x.x.x..x.x.x', '....x.......x..x', 'x.x.xxx.x.x.x.x.', '..........x.....'],
    chorus: ['x...x.x.x...x.x.', '..x...x...x...x.', '................', 'x.x.x.x.x.x.x.x.'],
    bridge: ['x..x..x...x..x..', '........x.......', 'x...x...x...x...', 'x.......x.......'] } }
];

// Same audit as pw_flow's layout section: no horizontal overflow, every visible button at least 44x44.
function audit(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const cs = getComputedStyle(e); return cs.visibility === 'hidden' || cs.display === 'none' ? null : r; };
    const name = e => (e.dataset.testid || e.className || e.tagName) + '';
    for (const e of document.querySelectorAll('#screens *')) { const r = vis(e); if (r && (r.right > W + 1 || r.left < -1)) bad.push('overflow ' + name(e)); }
    for (const sc of document.querySelectorAll('.full-body, .seq-main')) if (sc.scrollWidth > sc.clientWidth + 1) bad.push('hscroll ' + sc.className);
    for (const b of document.querySelectorAll('#screens button')) { const r = vis(b); if (r && (r.width < 43.5 || r.height < 43.5)) bad.push('small ' + name(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
    return bad.slice(0, 8);
  });
}

async function seq() {
  const c = checker('seq');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => GG.main.quickStart({ seed: 4242 }));
    await page.waitForFunction(() => GG.state && (GG.state.phase === 'plan' || GG.debug('ui').screen === 'card'));
    if (await screen(page) === 'card') { await tap(page, 'choice-0'); await tap(page, 'btn-card-ok'); }
    await page.waitForFunction(() => GG.state.phase === 'plan' && GG.debug('ui').stack.length === 0);
    await tap(page, 'btn-primary'); await waitScreen(page, 'plan');
    for (const a of ['write', 'rehearse', 'rest']) await tap(page, 'act-' + a);
    await tap(page, 'btn-go');
    await waitScreen(page, 'seq');
    const d0 = await page.evaluate(() => ({ dbg: GG.debug('seq'), phase: GG.state.phase, starter: JSON.stringify(GG.songs.starter(GG.state.genre)),
      pat: JSON.stringify(GG.ui.get('seq').data.pat), sub: document.querySelector('[data-testid="seq-title"]').textContent,
      tip: document.querySelector('[data-testid="seq-tip"]').textContent, render: GG.debug('render') && GG.debug('render').paused }));
    c.ok(d0.dbg && d0.dbg.mode === 'write' && d0.phase === 'plan', 'Go opens the sequencer before the week runs');
    c.ok(d0.pat === d0.starter, 'first-ever Write opens with starter(genre)');
    c.ok(/Write block 1 of 1/i.test(d0.sub) && d0.dbg.title, 'header: block count + a French title: ' + d0.sub);
    c.ok(/(Dana|Marcel|Jaxon):/.test(d0.tip), 'a bandmate tip on the first Write: ' + d0.tip);
    await page.waitForTimeout(250);
    const bad = await audit(page);
    c.ok(bad.length === 0, 'sequencer layout: no overflow, buttons ≥ 44px ' + bad.join(' ; '));
    const geo = await page.evaluate(() => {
      const r = s => document.querySelector(s).getBoundingClientRect();
      const cell = r('[data-testid="cell-kick-0"]'), last = r('[data-testid="cell-cymbal-15"]'), foot = r('[data-testid="btn-seq-save"]');
      return { w: cell.width, h: cell.height, lastBottom: last.bottom, footTop: foot.top, scroll: document.querySelector('.seq-main').scrollHeight - document.querySelector('.seq-main').clientHeight };
    });
    c.ok(geo.w >= 60 && geo.h >= 30 && geo.lastBottom <= geo.footTop && geo.scroll <= 1, 'whole grid fits, cells ' + Math.round(geo.w) + 'x' + Math.round(geo.h) + ' (scroll ' + geo.scroll + ')');
    fs.mkdirSync(CACHE, { recursive: true });
    await page.waitForTimeout(700);   // let the fade-in finish (swiftshader is slow)
    await page.screenshot({ path: path.join(CACHE, 'seq.png') });

    // Tap, drag-paint, the kick rule, meters.
    const m0 = await meters(page);
    await tap(page, 'cell-kick-2');
    c.ok((await lane(page, 'verse', 0))[2] === 'x', 'tap toggles a cell on');
    await tap(page, 'cell-kick-6'); await tap(page, 'cell-kick-10'); await tap(page, 'cell-kick-14');
    const m1 = await meters(page);
    c.ok(m1[0] > m0[0], 'busier kick raises Groove instantly ' + m0 + ' -> ' + m1);
    await tap(page, 'cell-kick-1');
    const tip = await page.textContent(tid('seq-tip'));
    c.ok((await lane(page, 'verse', 0))[1] === '.' && /double kick/i.test(tip), 'kick adjacency is refused kindly: ' + tip);
    const a = await page.locator(tid('cell-cymbal-4')).boundingBox(), b = await page.locator(tid('cell-cymbal-7')).boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 }); await page.mouse.up();
    c.ok((await lane(page, 'verse', 3)).slice(4, 8) === 'xxxx', 'drag paints a run of cells: ' + await lane(page, 'verse', 3));
    await tap(page, 'seq-tab-chorus');
    const beforeCopy = await lane(page, 'chorus', 3);
    await tap(page, 'btn-seq-tools'); await tap(page, 'seq-copy-verse');
    c.ok(await lane(page, 'chorus', 3) === await lane(page, 'verse', 3) && beforeCopy !== await lane(page, 'chorus', 3), 'copy from verse');
    const hookCopy = (await meters(page))[1];
    await tap(page, 'cell-cymbal-0'); await tap(page, 'cell-cymbal-8'); await tap(page, 'cell-hat-2'); await tap(page, 'cell-hat-10');
    await tap(page, 'cell-kick-12');
    c.ok((await meters(page))[1] > hookCopy, 'a contrasting chorus raises Hook ' + hookCopy + ' -> ' + (await meters(page))[1]);

    // Play / stop with a moving playhead.
    await tap(page, 'btn-seq-loop');
    await page.waitForFunction(() => GG.debug('audio').state === 'running' && GG.debug('audio').playing, null, { timeout: 5000 });
    await page.waitForFunction(() => GG.debug('audio').steps > 4, null, { timeout: 5000 });
    const s1 = await page.evaluate(() => GG.debug('audio').steps);
    await page.waitForTimeout(600);
    const s2 = await page.evaluate(() => ({ n: GG.debug('audio').steps, ph: GG.debug('seq').playhead, sec: GG.debug('audio').lastStep.section }));
    c.ok(s2.n > s1 && s2.ph != null && s2.sec === 'chorus', 'playhead advances on the looped section ' + s1 + ' -> ' + JSON.stringify(s2));
    await tap(page, 'seq-tab-song');
    await page.fill(tid('seq-title-input'), 'Mon Gazon Test');
    await page.locator(tid('seq-tempo')).fill('170');
    await tap(page, 'seq-arr-short');
    const songTab = await page.evaluate(() => ({ p: GG.ui.get('seq').data.pat, t: GG.debug('seq').title }));
    c.ok(songTab.p.bpm === 170 && songTab.p.arrangement.join() === 'verse,chorus,verse,chorus' && songTab.t === 'Mon Gazon Test', 'song tab: title, tempo, arrangement');
    await tap(page, 'btn-seq-loop');
    await page.waitForFunction(() => !GG.debug('audio').playing, null, { timeout: 3000 });
    c.ok(true, 'stop');
    const saved = await page.evaluate(() => JSON.stringify(GG.songs.sanitize(GG.ui.get('seq').data.pat, GG.state.gear, GG.state.genre)));
    await tap(page, 'btn-seq-save');
    await waitScreen(page, 'results');
    await tap(page, 'btn-results-skip');
    const res = await page.evaluate(() => ({ song: !!document.querySelector('[data-testid="result-song"]'), text: document.querySelector('[data-testid="result-song"]').textContent,
      reacts: document.querySelectorAll('[data-testid^="song-react-"]').length, last: GG.state.songs[GG.state.songs.length - 1], pending: GG.state.pendingSongs.length }));
    c.ok(res.song && /Mon Gazon Test/.test(res.text) && res.reacts >= 1, 'results show the new song + ' + res.reacts + ' reactions');
    c.ok(res.last.title === 'Mon Gazon Test' && !res.last.auto && JSON.stringify(res.last.pattern) === saved && res.pending === 0, 'the saved pattern became the song');
    c.ok(/Marcel|Abyssus/.test(res.text) && /Mon Gazon Test/.test(res.text), 'Marcel names it');
    await page.evaluate(() => { GG.ui.gigAutoplay = true; });   // v0.3: week 1's gig is played live; the bot plays it
    await tap(page, 'btn-results-ok');
    await page.waitForFunction(() => ['wrap', 'gig-results'].includes(GG.debug('ui').screen), null, { timeout: 15000 });
    if (await screen(page) === 'gig-results') await tap(page, 'btn-gig-done');
    await waitScreen(page, 'wrap'); await tap(page, 'btn-next-week');
    await page.waitForFunction(() => GG.state.totalWeek === 2);
    if (await screen(page) === 'card') { await tap(page, 'choice-0'); await tap(page, 'btn-card-ok'); }
    await page.waitForFunction(() => GG.debug('ui').stack.length === 0);

    // Laptop catalog -> read-only sequencer.
    await page.evaluate(() => GG.emit('hotspot', { action: 'laptop' }));
    await waitScreen(page, 'laptop'); await tap(page, 'laptop-tab-band');
    const id = res.last.id;
    c.ok(await page.locator(tid('song-' + id)).count() === 1, 'catalog lists the new song');
    await tap(page, 'song-' + id);
    await waitScreen(page, 'seq');
    const view = await page.evaluate(() => ({ mode: GG.debug('seq').mode, pat: JSON.stringify(GG.ui.get('seq').data.pat), save: !!document.querySelector('[data-testid="btn-seq-save"]') }));
    c.ok(view.mode === 'view' && view.pat === saved && !view.save, 'catalog opens the song read-only with its pattern');
    await tap(page, 'cell-snare-0');
    c.ok((await lane(page, 'verse', 1))[0] === JSON.parse(saved).sections.verse[1][0], 'read-only grid ignores taps');
    await tap(page, 'btn-seq-close'); await waitScreen(page, 'laptop'); await tap(page, 'btn-close');

    // Kit hotspot: sketch pad -> queued for the next Write block.
    await page.evaluate(() => GG.emit('hotspot', { action: 'kit' }));
    await waitScreen(page, 'seq');
    c.ok((await page.evaluate(() => GG.debug('seq').mode)) === 'sketch', 'kit opens the sketch pad');
    await tap(page, 'cell-snare-2');
    c.ok(await page.evaluate(() => GG.state.draft && GG.state.draft.sections.verse[1][2] === 'x'), 'sketch edits live in state.draft');
    await tap(page, 'btn-seq-use');
    await page.waitForFunction(() => GG.debug('ui').stack.length === 0);
    const q = await page.evaluate(() => ({ n: GG.state.pendingSongs.length, draft: GG.state.draft, title: GG.state.pendingSongs[0] && GG.state.pendingSongs[0].title }));
    c.ok(q.n === 1 && q.draft === null && q.title, 'sketch queued for the next Write block');
    await tap(page, 'btn-primary'); await waitScreen(page, 'plan');
    for (const i of [0, 1, 2]) await tap(page, 'plan-slot-' + i);   // last week's plan is kept: clear it
    for (const x of ['write', 'hustle', 'write']) await tap(page, 'act-' + x);
    await tap(page, 'btn-go'); await waitScreen(page, 'seq');
    const w1 = await page.evaluate(() => ({ sub: document.querySelector('[data-testid="seq-title"]').textContent, title: GG.debug('seq').title }));
    c.ok(/1 of 2/.test(w1.sub) && /sketch/i.test(w1.sub) && w1.title === q.title, 'Write block 1 of 2 opens the queued sketch');
    await tap(page, 'btn-seq-save');
    await page.waitForFunction(() => /2 of 2/.test(document.querySelector('[data-testid="seq-title"]').textContent));
    await tap(page, 'btn-seq-jam');
    await waitScreen(page, 'results');
    const two = await page.evaluate(() => GG.state.songs.slice(-2).map(s => ({ t: s.title, auto: s.auto })));
    c.ok(two[0].t === q.title && !two[0].auto && two[1].auto, 'block 1 = your sketch, block 2 = band jam: ' + JSON.stringify(two));
    c.ok(await page.evaluate(() => !GG.debug('audio').playing), 'no song playing on the results screen');

    // Rating parity: the browser rates exactly like node.
    const GGn = load({ localStorage: load.fakeStorage() });
    const fx = FIXTURES.concat(['metal', 'punk', 'rock', 'country'].map(g => GGn.songs.signature(g)));
    const node = fx.map(p => ['metal', 'punk', 'rock', 'country'].map(g => GGn.songs.rate(p, g)));
    const web = await page.evaluate(fx => fx.map(p => ['metal', 'punk', 'rock', 'country'].map(g => GG.songs.rate(p, g))), fx);
    c.ok(JSON.stringify(node) === JSON.stringify(web), 'GG.songs.rate: browser === node for ' + fx.length + ' fixtures x 4 genres');
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'seq threw: ' + (e.stack || e)); }
  await close();
  c.done();
}

async function audio() {
  const c = checker('audio');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    const lanes = await page.evaluate(async () => {
      const out = {};
      for (const l of GG.contracts.LANES) out[l] = await GG.audio.renderOffline({ lane: l });
      return out;
    });
    for (const [l, r] of Object.entries(lanes)) c.ok(!r.nan && r.peak > 0.02 && r.peak < 1 && r.rms > 0.0005, 'lane ' + l + ': peak ' + r.peak.toFixed(3) + ' rms ' + r.rms.toFixed(4));
    const styles = await page.evaluate(async () => {
      const list = [['doom', 'metal', 80], ['chug', 'metal', 140], ['tremolo', 'metal', 200], ['eighths', 'punk', 190], ['rock', 'rock', 120], ['boomchick', 'country', 100]];
      const out = {};
      for (const [s, g, bpm] of list) out[s] = await GG.audio.renderOffline({ backing: s, genre: g, bpm, bars: 2 });
      return out;
    });
    for (const [s, r] of Object.entries(styles)) c.ok(!r.nan && r.peak > 0.02 && r.peak < 1 && r.rms > 0.002, 'backing ' + s + ': peak ' + r.peak.toFixed(3) + ' rms ' + r.rms.toFixed(4));
    const styleFor = await page.evaluate(() => [80, 140, 200].map(b => GG.audio.styleFor('metal', b).id));
    c.ok(styleFor.join() === 'doom,chug,tremolo', 'metal backing: tempo decides ' + styleFor);
    // A dense song at a fast tempo stays under the voice cap (backing included).
    await page.mouse.click(200, 400);   // a user gesture unlocks the AudioContext
    const cap = await page.evaluate(async () => {
      const p = JSON.parse(JSON.stringify(GG.songs.signature('metal'))); p.bpm = 230;
      p.sections.verse = ['x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxxxxxx', 'x.x.x.x.x.x.x.x.'];
      const h = GG.audio.play(p, { genre: 'metal', section: 'verse' });
      let max = 0;
      for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 50)); max = Math.max(max, GG.debug('audio').songVoices); }
      const steps = GG.debug('audio').steps, style = GG.debug('audio').style;
      h.stop();
      return { max, steps, style, state: GG.debug('audio').state, playing: GG.audio.isPlaying() };
    });
    c.ok(cap.max > 0 && cap.max <= 12 && cap.steps > 10 && cap.style === 'tremolo' && !cap.playing, 'live: ≤ 12 song voices ' + JSON.stringify(cap));
    const tl = await page.evaluate(() => {
      const s = GG.songs.signature('metal'), t = GG.audio.timeline(s, { genre: 'metal', backing: false });
      const drums = t.events.filter(e => e.kind === 'drum').length, notes = GG.songs.toNotes(s).length;
      return { drums, notes, beats: t.beats, want: GG.songs.beats(s) };
    });
    c.ok(tl.drums === tl.notes && tl.beats === tl.want, 'timeline drum events === toNotes ' + JSON.stringify(tl));
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'audio threw: ' + (e.stack || e)); }
  await close();
  c.done();
}

(async () => {
  if (want('seq')) await seq();
  if (want('audio')) await audio();
})();
