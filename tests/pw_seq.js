// pw_seq.js: the v0.2 sequencer and the song audio on a 390x844 phone viewport.
// Sections (META_ONLY=seq|guided|audio|heavy, comma-separated; default all; seq also runs guided). Each must finish inside `timeout 500`.
//   seq   : quickStart → plan Write + 2 others → Go → sequencer (first Write: starter + tip) → tap / drag / kick rule →
//           meters change → Play (context running, playhead advances) → Stop → Save → results show the song + reactions
//           → laptop catalog lists it and opens its pattern read-only; kit sketch pad queues a song; in-page
//           GG.songs.rate equals the node result for the same fixtures; layout audit + screenshot tests/.cache/seq.png
//           + v0.6.1 metronome toggle (♩, settings.metronome, clicks while looping).
//           v0.6.2: the first Write opens the guided flow; "Advanced ⚙" jumps to the grid and the next Write remembers it.
//   guided: v0.6.2 step-by-step Write: verse preset (+ pedal presets locked) + "More metal" shows the meter change →
//           chorus (contrast hint, "Make it catchier") → Back keeps the verse → bridge → tempo slider + label → song order
//           → name (reroll, type your own) → Save → the song lands with exactly those parts; layout audit on every screen.
//   audio : OfflineAudioContext render of every lane voice and 2 bars of every backing style: non-silent, peak < 1.0,
//           no NaN; a fast song stays within the 12-voice cap. v0.6.1: every genre's kit (all lanes + country rim/brush)
//           and full band (verse/chorus/bridge) render clean with their own parts and vocal hits; vocal hits on whole
//           beats and in key; a key per song id; choruses fuller than verses; breakdowns stripped (growl on the drop);
//           metal chugs on every kick; venue rooms; crowd/garage/van/radio beds; the mixer API + metronome; live:
//           garage hum + noodling, van road noise + radio for a charted song, the gig's room + crowd reactions.
//   heavy : v0.7.2 (owner: "heavier" metal, a better crowd). Objective metrics from OfflineAudioContext renders, recorded
//           against the v0.7.1 numbers (measured on the v0.7.1 build with the same method): every genre's song peak < 1 and
//           RMS sane; metal band-only energy below 150 Hz and at 2-6 kHz up, mids kept, lower fundamentals (drop tuning), a
//           wider stereo image (double-tracked guitars), more harmonic content on one guitar note (THD), screams/growls
//           louder against the band (voice/accompaniment split by a polarity-inverted render); a full metal song renders
//           faster than real time; the crowd: babble/roar rise with the meter, hush in silent venues, cheers/boos/claps/
//           woos/whistles, song-end reactions scale with the score, nothing clips with the crowd on top of a song.
//           Writes tests/.cache/v072_<genre>.wav and v072_crowd.wav (not committed).
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

async function guided() {
  const c = checker('guided');
  const { page, errors, close } = await open();
  const ev = (f, a) => page.evaluate(f, a);
  const secOf = name => page.evaluate(n => JSON.stringify(GG.ui.get('seq').data.pat.sections[n]), name);
  const presetBar = id => page.evaluate(i => JSON.stringify(GG.songs.presets(GG.state.genre, GG.state.gear).find(p => p.id === i).bar), id);
  const step = () => page.evaluate(() => GG.debug('seq').step);
  try {
    await page.waitForSelector(tid('btn-new'));
    await ev(() => GG.main.quickStart({ seed: 777 }));
    await page.waitForFunction(() => GG.state && (GG.state.phase === 'plan' || GG.debug('ui').screen === 'card'));
    if (await screen(page) === 'card') { await tap(page, 'choice-0'); await tap(page, 'btn-card-ok'); }
    await page.waitForFunction(() => GG.state.phase === 'plan' && GG.debug('ui').stack.length === 0);
    await tap(page, 'btn-primary'); await waitScreen(page, 'plan');
    for (const a of ['write', 'rehearse', 'rest']) await tap(page, 'act-' + a);
    await tap(page, 'btn-go'); await waitScreen(page, 'seq');
    const v0 = await ev(() => ({ dbg: GG.debug('seq'), n: document.querySelectorAll('[data-testid^="guide-preset-"]').length,
      locked: [...document.querySelectorAll('[data-testid^="guide-preset-"]:disabled')].map(b => b.dataset.testid),
      coach: document.querySelector('[data-testid="guide-coach"]').textContent, back: document.querySelector('[data-testid="btn-guide-back"]').disabled,
      step: document.querySelector('[data-testid="guide-step"]').textContent, catchy: !!document.querySelector('[data-testid="guide-mod-catchy"]') }));
    c.ok(v0.dbg.guided && v0.dbg.step === 'verse' && /Step 1 of 6/.test(v0.step), 'guided flow opens on the verse ' + v0.step);
    c.ok(v0.n >= 5 && v0.locked.join() === 'guide-preset-gallop,guide-preset-dkrun', 'metal presets; pedal beats locked without a double kick ' + v0.locked);
    c.ok(/^\S.*: \S/.test(v0.coach) && v0.back && !v0.catchy, 'a bandmate coach line; Back off on step 1; "catchier" is a chorus tweak: ' + v0.coach);
    c.ok((await audit(page)).length === 0, 'verse screen layout ' + (await audit(page)).join('; '));
    await tap(page, 'guide-preset-thrash');
    c.ok(await secOf('verse') === await presetBar('thrash') && await ev(() => !!document.querySelector('[data-testid="guide-preset-thrash"].on')), 'picking a preset sets the verse');
    const g1 = (await meters(page))[0];
    await tap(page, 'guide-mod-more');
    const ch = await ev(() => document.querySelector('[data-testid="guide-change"]').textContent);
    const g2 = (await meters(page))[0];
    c.ok(/More metal/.test(ch) && /Groove \d+ → \d+/.test(ch) && /Hook/.test(ch) && /Difficulty/.test(ch) && g2 > g1, '"More metal" shows the Groove/Hook/Difficulty change ' + g1 + '→' + g2 + ' ' + ch);
    const verse = await secOf('verse');
    c.ok(verse !== await presetBar('thrash'), 'the tweak changed the verse');
    await tap(page, 'btn-guide-play');
    await page.waitForFunction(() => GG.debug('seq').playing === 'loop' && GG.debug('audio').playing, null, { timeout: 5000 });
    await tap(page, 'btn-guide-play');
    c.ok(await ev(() => !GG.debug('seq').playing), 'Play previews the verse loop, tap again to stop');
    await tap(page, 'btn-guide-next');
    const cs = await ev(() => ({ hint: document.querySelector('[data-testid="guide-hint"]').textContent, catchy: !!document.querySelector('[data-testid="guide-mod-catchy"]') }));
    c.ok(await step() === 'chorus' && /different from the verse/.test(cs.hint) && cs.catchy, 'chorus: contrast hint + "Make it catchier" ' + cs.hint);
    await tap(page, 'guide-preset-headbanger');
    await tap(page, 'guide-mod-catchy');
    const chorus = await secOf('chorus');
    await tap(page, 'btn-guide-back');
    c.ok(await step() === 'verse' && await secOf('verse') === verse, 'Back returns to the verse, tweak kept');
    await tap(page, 'btn-guide-next'); await tap(page, 'btn-guide-next');
    c.ok(await step() === 'bridge' && await secOf('chorus') === chorus, 'Next, Next: bridge (chorus kept)');
    await tap(page, 'guide-preset-blast');
    await tap(page, 'btn-guide-next');
    c.ok(await step() === 'tempo', 'tempo screen');
    const setT = v => ev(v => { const r = document.querySelector('[data-testid="guide-tempo"]'); r.value = v; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change'));
      return { bpm: GG.ui.get('seq').data.pat.bpm, label: document.querySelector('[data-testid="guide-tempo-label"]').textContent, num: document.querySelector('[data-testid="guide-bpm"]').textContent }; }, v);
    const t1 = await setT(225), t2 = await setT(150);
    c.ok(t1.bpm === 225 && t1.label === 'Blast' && t2.bpm === 150 && t2.label === 'Mosh' && t2.num === '150', 'tempo slider + plain label ' + JSON.stringify([t1, t2]));
    c.ok((await audit(page)).length === 0, 'tempo screen layout ' + (await audit(page)).join('; '));
    await tap(page, 'btn-guide-next');
    await tap(page, 'guide-order-epic');
    c.ok(await step() === 'order' && await ev(() => GG.songs.arrangementId(GG.ui.get('seq').data.pat)) === 'epic', 'song order: Epic');
    c.ok((await audit(page)).length === 0, 'order screen layout ' + (await audit(page)).join('; '));
    await tap(page, 'btn-guide-next');
    const n0 = await ev(() => GG.debug('seq').title);
    await tap(page, 'btn-guide-reroll');
    const n1 = await ev(() => ({ t: GG.debug('seq').title, shown: document.querySelector('[data-testid="guide-title"]').textContent }));
    c.ok(await step() === 'name' && n0 && n1.t !== n0 && n1.shown === n1.t, 'name: Marcel rerolls the title ' + n0 + ' → ' + n1.t);
    await page.locator(tid('guide-title-input')).fill('Le Test Guidé');
    c.ok(await ev(() => GG.debug('seq').title) === 'Le Test Guidé', 'type your own title');
    c.ok((await audit(page)).length === 0, 'name screen layout ' + (await audit(page)).join('; '));
    await tap(page, 'btn-guide-save');
    await waitScreen(page, 'results');
    const last = await ev(() => GG.state.songs[GG.state.songs.length - 1]);
    c.ok(last.title === 'Le Test Guidé' && !last.auto && last.pattern.bpm === 150 && GG_arr(last) === 'epic', 'the song lands: title, tempo, order');
    c.ok(JSON.stringify(last.pattern.sections.verse) === verse && JSON.stringify(last.pattern.sections.chorus) === chorus
      && JSON.stringify(last.pattern.sections.bridge) === await presetBar('blast'), 'with exactly the picked + tweaked parts');
    c.ok(await ev(() => GG.prefs.get().songwriterMode) === 'guided', 'guided stays the preference');
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'guided threw: ' + (e.stack || e)); }
  await close();
  c.done();
}
function GG_arr(song) { return song.pattern.arrangement.join(',') === 'verse,verse,chorus,verse,chorus,bridge,bridge,chorus,chorus' ? 'epic' : song.pattern.arrangement.join(','); }

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
    const g0 = await page.evaluate(() => ({ dbg: GG.debug('seq'), mode: GG.prefs.get().songwriterMode }));
    c.ok(g0.dbg.guided && g0.dbg.step === 'verse' && g0.mode === 'guided', 'v0.6.2: a Write block opens the guided flow by default');
    await tap(page, 'btn-guide-advanced');
    c.ok(await page.evaluate(() => !GG.debug('seq').guided && GG.prefs.get().songwriterMode === 'advanced' && !!document.querySelector('[data-testid="cell-kick-0"]')),
      'Advanced jumps to the full grid and the choice is remembered');
    const d0 = await page.evaluate(() => ({ dbg: GG.debug('seq'), phase: GG.state.phase, starter: JSON.stringify(GG.songs.starter(GG.state.genre)),
      pat: JSON.stringify(GG.ui.get('seq').data.pat), sub: document.querySelector('[data-testid="seq-title"]').textContent,
      tip: document.querySelector('[data-testid="seq-tip"]').textContent, render: GG.debug('render') && GG.debug('render').paused }));
    c.ok(d0.dbg && d0.dbg.mode === 'write' && d0.phase === 'plan', 'Go opens the sequencer before the week runs');
    c.ok(d0.pat === d0.starter, 'first-ever Write opens with starter(genre)');
    c.ok(/Write block 1 of 1/i.test(d0.sub) && d0.dbg.title, 'header: block count + a title from Marcel: ' + d0.sub);
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
    // v0.6.1 metronome: off by default; ♩ turns it on (saved), the loop clicks quarter notes; ♩ again turns it off.
    const mtr = () => page.evaluate(() => { const b = document.querySelector('[data-testid="btn-seq-metro"]');
      return { on: GG.audio.metronome(), saved: GG.save.settings().metronome, btn: b && b.dataset.on, pressed: b && b.getAttribute('aria-pressed'), clicks: GG.debug('audio').counts.clicks }; });
    const k0 = await mtr();
    await tap(page, 'btn-seq-metro');
    await page.waitForTimeout(900);
    const k1 = await mtr();
    c.ok(!k0.on && k0.btn === '0' && k1.on && k1.saved === true && k1.btn === '1' && k1.pressed === 'true' && k1.clicks > k0.clicks,
      'metronome toggle clicks while looping ' + JSON.stringify([k0, k1]));
    await tap(page, 'btn-seq-metro');
    await page.waitForTimeout(300);
    const k2 = await mtr();
    await page.waitForTimeout(600);
    const k3 = await mtr();
    c.ok(!k2.on && k2.saved === false && k2.btn === '0' && k3.clicks === k2.clicks, 'metronome off: saved, silent ' + JSON.stringify([k2.clicks, k3.clicks]));
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
    c.ok(await page.evaluate(() => !GG.debug('seq').guided && !!document.querySelector('[data-testid="cell-kick-0"]')), 'the next Write remembers Advanced');
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
    c.ok(cap.max > 0 && cap.max <= 18 && cap.steps > 10 && cap.style === 'tremolo' && !cap.playing, 'live: ≤ 18 song voices ' + JSON.stringify(cap));
    // v0.7.2 fix: a perfectly played metal chorus on Hard (8th kick + 8th crash, snare on 2 and 4 @140) over the full band
    // never loses a tap to the voice cap (taps cut off the lane's last tap; the cap has room for the kit on top of the band).
    const taps = await page.evaluate(async () => {
      const p = JSON.parse(JSON.stringify(GG.songs.signature('metal'))); p.bpm = 140;
      const d0 = GG.debug('audio').counts.tapDrops, h = GG.audio.play(p, { genre: 'metal', section: 'chorus', loop: true, backing: true, drums: false });
      const ac = GG.audio.context(), e = 60 / 140 / 2, t0 = ac.currentTime + 0.3;
      let i = 0, n = 0, max = 0;
      while (i < 48) {   // 6 bars of 8ths, scheduled ahead on the audio clock like the gig's auto notes
        const now = ac.currentTime;
        for (; i < 48 && t0 + i * e < now + 0.25; i++) {
          const t = Math.max(t0 + i * e, now + 0.02);
          GG.audio.hit('kick', t); GG.audio.hit('cymbal', t); n += 2;
          if (i % 4 === 2) { GG.audio.hit('snare', t); n++; }
        }
        max = Math.max(max, GG.debug('audio').songVoices);
        await new Promise(r => setTimeout(r, 40));
      }
      await new Promise(r => setTimeout(r, 300));
      h.stop();
      return { taps: n, dropped: GG.debug('audio').counts.tapDrops - d0, max };
    });
    c.ok(taps.taps === 108 && taps.dropped === 0 && taps.max <= 18, 'live: every tap sounds over a full metal band ' + JSON.stringify(taps));
    const tl = await page.evaluate(() => {
      const s = GG.songs.signature('metal'), t = GG.audio.timeline(s, { genre: 'metal', backing: false });
      const drums = t.events.filter(e => e.kind === 'drum').length, notes = GG.songs.toNotes(s).length;
      return { drums, notes, beats: t.beats, want: GG.songs.beats(s) };
    });
    c.ok(tl.drums === tl.notes && tl.beats === tl.want, 'timeline drum events === toNotes ' + JSON.stringify(tl));

    // ---- v0.6.1 genre audio ----
    const kits = await page.evaluate(async () => {
      const out = {}, e = r => r.rms * r.rms * r.seconds;
      for (const g of GG.contracts.GENRES) for (const l of GG.contracts.LANES) { const r = await GG.audio.renderOffline({ genre: g, lane: l }); out[g + ' ' + l] = { peak: r.peak, rms: r.rms, nan: r.nan, e: e(r) }; }
      for (const v of ['rim', 'brush', 'ghost']) { const r = await GG.audio.renderOffline({ genre: 'country', lane: 'snare', variant: v }); out['country snare ' + v] = { peak: r.peak, rms: r.rms, nan: r.nan, e: e(r) }; }
      return out;
    });
    const badKit = Object.entries(kits).filter(([, r]) => r.nan || !(r.peak > 0.02 && r.peak < 1 && r.rms > 0.0005)).map(([k]) => k);
    c.ok(badKit.length === 0, 'genre kits: ' + Object.keys(kits).length + ' voices clean ' + badKit.join());
    c.ok(kits['rock kick'].e > kits['metal kick'].e * 1.3 && kits['country kick'].peak < kits['metal kick'].peak && kits['punk hat'].e > kits['metal hat'].e,
      'kits differ: rock kick big, country soft, punk hats trashy');
    const full = await page.evaluate(async () => {
      const out = {};
      for (const g of GG.contracts.GENRES) {
        const p = JSON.parse(JSON.stringify(GG.songs.signature(g))); p.arrangement = ['verse', 'chorus', 'bridge'];
        const v0 = GG.debug('audio').counts.vox;
        const r = await GG.audio.renderOffline({ genre: g, pattern: p, full: true, bars: 12, songId: 's3', room: g === 'rock' ? 'arena' : undefined });
        out[g] = { peak: +r.peak.toFixed(3), rms: +r.rms.toFixed(4), nan: r.nan, kinds: Object.keys(r.counts).sort().join(), vox: GG.debug('audio').counts.vox - v0, key: r.key.name };
      }
      return out;
    });
    const PARTS = { metal: ['gtr', 'gtr2', 'lead', 'bass', 'vox'], punk: ['gtr', 'bass', 'vox'], rock: ['gtr', 'lead', 'bass', 'vox'], country: ['clean', 'fiddle', 'twang', 'bass', 'vox'] };
    for (const [g, r] of Object.entries(full)) c.ok(!r.nan && r.peak > 0.05 && r.peak < 1 && r.rms > 0.01 && r.vox > 0 && PARTS[g].every(k => r.kinds.split(',').includes(k)), g + ' band renders clean ' + JSON.stringify(r));
    const shape = await page.evaluate(() => {
      const A = GG.audio, out = { offGrid: 0, offKey: 0, vox: 0, keys: {}, same: true, range: true, layers: {}, breakOk: true, soloOk: true, drops: {}, chugOk: false };
      for (const g of GG.contracts.GENRES) {
        const B = GG.content.genres[g].backing, p = JSON.parse(JSON.stringify(GG.songs.signature(g)));
        p.arrangement = ['verse', 'chorus', 'bridge']; if (g === 'metal') p.bpm = 140;
        const ks = new Set();
        for (let i = 1; i <= 8; i++) { const k = A.keyFor('s' + i, g); ks.add(k.tonic); if (A.keyFor('s' + i, g).tonic !== k.tonic) out.same = false; if (k.offset < B.keys[0] || k.offset > B.keys[1]) out.range = false; }
        out.keys[g] = ks.size;
        const t = A.timeline(p, { genre: g, songId: 's4' }), band = t.events.filter(e => e.kind !== 'step' && e.kind !== 'drum');
        for (const e of band.filter(e => e.kind === 'vox')) { out.vox++; if (e.beat % 1) out.offGrid++; if (!B.scale.includes(((e.midi - t.key.tonic) % 12 + 12) % 12)) out.offKey++; }
        const kinds = sec => new Set(band.filter(e => e.section === sec).map(e => e.kind)).size;
        out.layers[g] = [kinds('verse'), kinds('chorus')];
        const brk = band.filter(e => e.role === 'break'), solo = band.filter(e => e.role === 'solo');
        if (brk.some(e => !['gtr', 'bass', 'vox'].includes(e.kind))) out.breakOk = false;
        if (solo.length && !solo.some(e => e.kind === 'lead' || e.kind === 'fiddle')) out.soloOk = false;
        out.drops[g] = brk.filter(e => e.kind === 'vox').map(e => e.voc).join();
        if (g === 'metal') {
          const kicks = t.events.filter(e => e.kind === 'drum' && e.lane === 'kick' && e.section === 'verse');
          out.chugOk = t.style === 'chug' && kicks.length > 0 && kicks.every(k => band.some(e => e.kind === 'gtr' && e.beat === k.beat));
        }
      }
      return out;
    });
    c.ok(shape.vox > 8 && shape.offGrid === 0 && shape.offKey === 0, 'vocal hits: ' + shape.vox + ', all on whole beats and in key');
    c.ok(shape.same && shape.range && Object.values(shape.keys).every(n => n >= 3), 'a new key per song (seeded by id, in range) ' + JSON.stringify(shape.keys));
    c.ok(Object.values(shape.layers).every(([v, ch]) => ch > v), 'choruses fuller than verses ' + JSON.stringify(shape.layers));
    c.ok(shape.breakOk && shape.soloOk && /^growl(,growl)*$/.test(shape.drops.metal), 'breakdowns strip to the heavy parts (growls from the drop), solos lead ' + JSON.stringify(shape.drops));
    c.ok(shape.chugOk, 'metal: palm-muted chugs on every kick hit');
    const rooms = await page.evaluate(async () => {
      const f = GG.audio.roomFor, e = r => r.rms * r.rms * r.seconds;
      const map = [f({ kind: 'house', capacity: 30 }), f({ kind: 'legion', capacity: 120 }), f({ kind: 'club', capacity: 180 }), f({ kind: 'bar', capacity: 1200 }), f({ kind: 'club', capacity: 6000 }), f({ kind: 'church', capacity: 90 })].join();
      const dry = await GG.audio.renderOffline({ lane: 'snare', room: 'dry' }), arena = await GG.audio.renderOffline({ lane: 'snare', room: 'arena' });
      return { map, dry: e(dry), arena: e(arena), peak: arena.peak, nan: arena.nan || dry.nan };
    });
    c.ok(rooms.map === 'dry,hall,room,theatre,arena,hall' && rooms.arena > rooms.dry * 1.1 && rooms.peak < 1 && !rooms.nan, 'venue rooms by size ' + JSON.stringify(rooms));
    const beds = await page.evaluate(async () => {
      const out = {};
      for (const a of ['garage', 'van', 'crowd', 'radio']) { const r = await GG.audio.renderOffline({ ambience: a, bars: 4 }); out[a] = { peak: +r.peak.toFixed(3), rms: +r.rms.toFixed(4), nan: r.nan }; }
      const m = await GG.audio.renderOffline({ genre: 'metal', section: 'verse', bars: 1, drums: false, backing: false, metronome: true });
      out.metronome = { peak: +m.peak.toFixed(3), rms: +m.rms.toFixed(4), nan: m.nan };
      return out;
    });
    for (const [k, r] of Object.entries(beds)) c.ok(!r.nan && r.peak > 0.01 && r.peak < 1 && r.rms > 0.0005, 'bed ' + k + ' ' + JSON.stringify(r));
    const mix = await page.evaluate(async () => {
      const A = GG.audio, o = { buses: Object.keys(A.volumes()).join(), bad: A.setVolume('kazoo', 1) };
      o.full = (await A.renderOffline({ lane: 'kick' })).peak;
      A.setVolume('band', 0); o.saved = GG.save.settings().mix.band; o.get = A.getVolume('band');
      o.bandOff = (await A.renderOffline({ backing: 'chug', genre: 'metal', bpm: 140, bars: 1 })).peak;
      A.setVolume('band', 1); A.setVolume('drums', 0.5);
      o.half = (await A.renderOffline({ lane: 'kick' })).peak;
      A.setVolume('drums', 1.7);
      o.clamped = A.getVolume('drums');
      o.bandOn = (await A.renderOffline({ backing: 'chug', genre: 'metal', bpm: 140, bars: 1 })).peak;
      o.reload = A.applySettings().mix;
      return o;
    });
    c.ok(mix.buses === 'drums,band,crowd,sfx' && mix.bad === null && mix.saved === 0 && mix.get === 0 && mix.bandOff < 0.001 && mix.bandOn > 0.02 &&
      mix.half < mix.full * 0.7 && mix.clamped === 1 && mix.reload.band === 1 && mix.reload.drums === 1, 'mixer: setVolume/getVolume, saved in settings.mix ' + JSON.stringify(mix));

    // Live ambience (bus events + state): garage hum + noodling, van road + radio, the gig's room and crowd.
    await page.evaluate(() => { GG.main.quickStart({ seed: 5, openCard: false }); GG.ui.closeAll(); });
    await page.waitForFunction(() => GG.audio.refreshAmbience() === 'garage', null, { timeout: 6000 });
    await page.waitForFunction(() => GG.debug('audio').counts.noodles > 0, null, { timeout: 9000 });
    const gar = await page.evaluate(() => ({ amb: GG.debug('audio').ambience, noodles: GG.debug('audio').counts.noodles, v: GG.debug('audio').ambVoices }));
    c.ok(gar.amb === 'garage' && gar.noodles > 0 && gar.v <= 6, 'garage hum with the guitarist noodling ' + JSON.stringify(gar));
    const want = await page.evaluate(() => {
      const s = GG.state, song = s.songs[0];
      s.albums = (s.albums || []).concat([{ id: 'a_radio', kind: 'ep', title: 'Radio Test', tracks: [song.id], single: song.id, chart: { debut: 60, peak: 37, weeks: 3, pos: 50 } }]);
      GG.ui.playVan(s.gig, () => {});
      return song.id;
    });
    await page.waitForFunction(() => GG.debug('audio').ambience === 'van', null, { timeout: 4000 });
    await page.waitForFunction(() => GG.debug('audio').counts.thumps > 0, null, { timeout: 4000 }).catch(() => {});
    const van = await page.evaluate(() => ({ amb: GG.debug('audio').ambience, radio: GG.debug('audio').radio, thumps: GG.debug('audio').counts.thumps, song: GG.audio.isPlaying() }));
    c.ok(van.radio === want && van.thumps > 0 && !van.song, 'van: road noise + your charted song on the radio ' + JSON.stringify(van));
    await page.evaluate(() => { GG.ui.closeAll(); GG.ui.gigAutoplay = false; GG.ui.playGig(GG.state.gig, () => {}); });
    await waitScreen(page, 'gig-set');
    const radioOff = await page.evaluate(() => GG.debug('audio').radio);
    await tap(page, 'btn-gig-start');
    await page.waitForFunction(() => GG.debug('gigui').mode === 'play', null, { timeout: 8000 });
    await page.waitForFunction(() => GG.debug('audio').ambience === 'gig', null, { timeout: 4000 });
    const gg = await page.evaluate(async () => {
      const d0 = GG.debug('audio'), want = GG.audio.roomFor(GG.state.liveGig.gig);
      GG.emit('crowd:level', { level: GG.gig.levelOf(92), crowd: 92 });
      const level = GG.debug('audio').crowd.level;   // read before the next 'gig:judge' moves it again
      GG.emit('crowd:moment', { kind: 'mosh' });
      await new Promise(r => setTimeout(r, 350));
      GG.emit('crowd:moment', { kind: 'boo' });
      await new Promise(r => setTimeout(r, 100));
      const d = GG.debug('audio');
      return { room: d.room, want, level, crowd: d.crowd, cheers: d.counts.cheers - d0.counts.cheers, boos: d.counts.boos - d0.counts.boos, key: d.key, playing: d.playing, cv: d.crowdVoices };
    });
    c.ok(radioOff === null && gg.room === gg.want && gg.crowd.on && gg.crowd.ready && gg.level === 92 && gg.cheers === 1 && gg.boos === 1 && gg.playing && !!gg.key && gg.cv <= 12,
      'gig: venue room, the crowd (v0.7.2 layers built) follows the meter, cheers + boos, ≤ 12 crowd voices ' + JSON.stringify(gg));
    await page.evaluate(() => GG.ui.closeAll());
    await page.waitForFunction(() => GG.debug('audio').ambience !== 'gig', null, { timeout: 4000 });
    const after = await page.evaluate(() => ({ room: GG.debug('audio').room, crowd: GG.debug('audio').crowd.on }));
    c.ok(after.room === 'room' && !after.crowd, 'after the gig: the kit room again, crowd gone ' + JSON.stringify(after));
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'audio threw: ' + (e.stack || e)); }
  await close();
  c.done();
}

// In-page helpers for the v0.7.2 metrics: FFT band energies, harmonic amplitudes (Goertzel), stereo width, WAV bytes.
function pageHelpers() {
  const mono = b => { const n = b.length, m = new Float32Array(n); for (let ch = 0; ch < b.numberOfChannels; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) m[i] += d[i] / b.numberOfChannels; } return m; };
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) {
      const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
      for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const p = i + k, q = p + len / 2, br = re[q] * cr - im[q] * ci, bi = re[q] * ci + im[q] * cr; re[q] = re[p] - br; im[q] = im[p] - bi; re[p] += br; im[p] += bi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
    }
  }
  // Absolute band energies (dB re full scale) below 150 Hz, 150-500, 500-2k, 2-6k, above 6k; stereo side/mid energy.
  window.__bands = function (buf) {
    const sr = buf.sampleRate, N = 8192, m = mono(buf), E = [0, 0, 0, 0, 0], edges = [150, 500, 2000, 6000];
    let tot = 0, frames = 0; const w = new Float64Array(N); for (let i = 0; i < N; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
    for (let s = 0; s + N <= m.length; s += N / 2) {
      const re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < N; i++) re[i] = m[s + i] * w[i];
      fft(re, im); frames++;
      for (let k = 1; k < N / 2; k++) { const f = k * sr / N, p = re[k] * re[k] + im[k] * im[k]; let j = 0; while (j < 4 && f >= edges[j]) j++; E[j] += p; tot += p; }
    }
    let ms = 0; for (let i = 0; i < m.length; i++) ms += m[i] * m[i]; ms /= m.length;
    let side = 0, mid = 0; if (buf.numberOfChannels > 1) { const L = buf.getChannelData(0), R = buf.getChannelData(1); for (let i = 0; i < L.length; i++) { mid += (L[i] + R[i]) ** 2; side += (L[i] - R[i]) ** 2; } }
    return { dB: E.map(e => +(10 * Math.log10(ms * e / tot + 1e-12)).toFixed(1)), low150: +(E[0] / tot).toFixed(3), width: mid ? +(side / mid).toFixed(3) : 0 };
  };
  // THD and harmonic energy (re the fundamental, harmonics 2..16) of a steady tone; f0 refined within +-2 %.
  window.__harm = function (buf, f0, from, to) {
    const sr = buf.sampleRate, m = mono(buf), a = Math.floor(from * sr), n = Math.floor(to * sr) - a;
    const g = f => { let re = 0, im = 0; for (let i = 0; i < n; i++) { const x = m[a + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1))), ph = 2 * Math.PI * f * i / sr; re += x * Math.cos(ph); im -= x * Math.sin(ph); } return Math.sqrt(re * re + im * im); };
    let best = f0, bv = -1; for (let f = f0 * 0.98; f <= f0 * 1.02; f += f0 * 0.001) { const v = g(f) + g(2 * f) + g(3 * f); if (v > bv) { bv = v; best = f; } }
    const A = []; for (let h = 1; h <= 16; h++) A.push(g(best * h));
    const hs = A.slice(1).reduce((s, x) => s + x * x, 0) / (A[0] * A[0]);
    return { f0: +best.toFixed(1), thd: +Math.sqrt(hs).toFixed(3), harmonics: +hs.toFixed(3), strong: A.filter(x => x > A[0] * 0.1).length };
  };
  window.__wav = function (buf) {
    const ch = buf.numberOfChannels, n = buf.length, sr = buf.sampleRate, bytes = 44 + n * ch * 2, v = new DataView(new ArrayBuffer(bytes));
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, bytes - 8, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * ch * 2, true);
    const d = []; for (let c = 0; c < ch; c++) d.push(buf.getChannelData(c));
    let o = 44; for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, d[c][i])); v.setInt16(o, s < 0 ? s * 32768 : s * 32767, true); o += 2; }
    const u = new Uint8Array(v.buffer); let bin = ''; for (let i = 0; i < u.length; i += 32768) bin += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
    return btoa(bin);
  };
}

// v0.7.1 reference numbers (same renders + metrics on the v0.7.1 build, 2026-09-30): metal band-only at 140 BPM, song s3.
const V071 = { lowDb: -27.4, midDb: -22.7, grindDb: -36.0, low150: 0.186, gtrHz: 98, thd: 0.367, harmonics: 0.134, voxChorusVA: 1.05, voxBridgeVA: 10.42 };

async function heavy() {
  const c = checker('heavy');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(pageHelpers);
    const res = await page.evaluate(async () => {
      const A = GG.audio, out = { genres: {}, wav: {} };
      const sig = (g, bpm) => { const p = JSON.parse(JSON.stringify(GG.songs.signature(g))); p.arrangement = ['verse', 'chorus', 'bridge']; if (bpm) p.bpm = bpm; return p; };
      for (const g of GG.contracts.GENRES) {
        const r = await A.renderOffline({ genre: g, pattern: sig(g), full: true, bars: 12, songId: 's3' });
        const b = __bands(r.buffer);
        out.genres[g] = { peak: +r.peak.toFixed(3), rms: +r.rms.toFixed(4), nan: r.nan, width: b.width, low150: b.low150 };
        out.wav[g] = __wav(r.buffer);
      }
      const band = {};
      for (const bpm of [80, 140, 200]) {
        const p = sig('metal', bpm), r = await A.renderOffline({ genre: 'metal', pattern: p, full: true, bars: 12, songId: 's3', drums: false }), b = __bands(r.buffer);
        const tl = A.timeline(p, { genre: 'metal', songId: 's3' }), low = k => Math.min(...tl.events.filter(e => e.kind === k).map(e => e.midi));
        const hz = m => +(440 * Math.pow(2, (m - 69) / 12)).toFixed(1);
        band[bpm] = { style: tl.style, key: tl.key.name, peak: +r.peak.toFixed(3), rms: +r.rms.toFixed(4), dB: b.dB, low150: b.low150, width: b.width, gtrHz: hz(low('gtr')), bassHz: hz(low('bass')) };
      }
      out.band = band;
      const key = A.keyFor('s3', 'metal', 140), pr = await A.renderOffline({ probe: 'gtr', genre: 'metal', midi: key.tonic, seconds: 1.6 });
      out.probe = __harm(pr.buffer, 440 * Math.pow(2, (key.tonic - 69) / 12), 0.4, 1.4);
      // Voice vs band inside the vocal-hit windows: (normal -/+ polarity-inverted vocals) / 2.
      out.vox = {};
      for (const sec of ['chorus', 'bridge']) {
        const q = sig('metal', 140), o = { genre: 'metal', pattern: q, section: sec, bars: 4, songId: 's3', drums: false };
        const n1 = (await A.renderOffline(o)).buffer.getChannelData(0), n2 = (await A.renderOffline(Object.assign({ voxInvert: true }, o))).buffer.getChannelData(0);
        const tl = A.timeline(q, o), spb = 60 / tl.bpm, hits = tl.events.filter(e => e.kind === 'vox');
        let V = 0, B = 0;
        for (const e of hits) for (let i = Math.floor((0.05 + e.beat * spb) * 44100), z = i + Math.floor(0.45 * 44100); i < z; i++) { V += ((n1[i] - n2[i]) / 2) ** 2; B += ((n1[i] + n2[i]) / 2) ** 2; }
        out.vox[sec] = { hits: hits.map(e => e.voc).join(), onGrid: hits.every(e => e.beat % 1 === 0), VA: +(10 * Math.log10(V / B)).toFixed(2) };
      }
      // CPU: a whole metal song (full arrangement, arena reverb, the crowd on top) renders faster than real time.
      const t0 = performance.now(), full = await A.renderOffline({ genre: 'metal', pattern: GG.songs.signature('metal'), full: true, bars: 99, songId: 's7', room: 'arena', crowd: { level: 95, moments: [[4, 'mosh'], [20, 'end', 0.9]], clapBpm: 170 } });
      const wall = (performance.now() - t0) / 1000;
      out.cpu = { seconds: +full.seconds.toFixed(1), wall: +wall.toFixed(2), xRT: +(full.seconds / wall).toFixed(2), peak: +full.peak.toFixed(3), nan: full.nan };
      // The crowd.
      const crowd = {}, cr = async o => { const r = await A.renderOffline(Object.assign({ ambience: 'crowd', seconds: 4, moments: [] }, o)); return { rms: +r.rms.toFixed(4), peak: +r.peak.toFixed(3), nan: r.nan, width: __bands(r.buffer).width, n: r.crowd, buf: r.buffer }; };
      for (const lv of [15, 50, 90]) { crowd['talk' + lv] = await cr({ level: lv }); crowd['song' + lv] = await cr({ level: lv, song: true }); }
      crowd.silent = await cr({ level: 90, song: true, silent: true });
      crowd.events = await cr({ level: 100, seconds: 5, moments: [[0.2, 'end', 1], [0.5, 'boo'], [0.8, 'wallOfDeath'], [1.2, 'solo'], [1.6, 'applause'], [2, 'grumble']], clapBpm: 120 });
      for (const [k, a] of [['end100', 1], ['end60', 0.6], ['end45', 0.45]]) crowd[k] = await cr({ level: 50, moments: [[0.1, 'end', a]] });
      out.wav.crowd = __wav(crowd.events.buf);
      Object.values(crowd).forEach(x => delete x.buf);
      out.crowd = crowd;
      const mix = await A.renderOffline({ genre: 'metal', pattern: sig('metal', 140), full: true, bars: 12, songId: 's3', crowd: { level: 100, moments: [[1, 'mosh'], [3, 'end', 1], [5, 'boo']], clapBpm: 140 } });
      out.mix = { peak: +mix.peak.toFixed(3), rms: +mix.rms.toFixed(4), nan: mix.nan };
      return out;
    });
    fs.mkdirSync(CACHE, { recursive: true });
    for (const [k, b64] of Object.entries(res.wav)) fs.writeFileSync(path.join(CACHE, 'v072_' + k + '.wav'), Buffer.from(b64, 'base64'));
    delete res.wav;
    console.log('v0.7.2 metrics ' + JSON.stringify(res));
    const G = res.genres, B = res.band, b140 = B[140];
    for (const [g, r] of Object.entries(G)) c.ok(!r.nan && r.peak < 1 && r.rms > 0.05 && r.rms < 0.25, g + ' song: peak < 1, RMS sane ' + JSON.stringify(r));
    c.ok(G.metal.width > 0.03 && G.country.width < G.metal.width, 'metal is wide (double-tracked guitars L/R) ' + G.metal.width);
    c.ok(Object.values(B).every(b => b.peak < 1), 'metal band renders under the limiter');
    c.ok(b140.dB[0] >= V071.lowDb + 5 && b140.low150 > V071.low150 * 2, 'heavier: energy below 150 Hz up ' + b140.dB[0] + ' dB vs ' + V071.lowDb + ' (share ' + b140.low150 + ' vs ' + V071.low150 + ')');
    c.ok(b140.dB[3] >= V071.grindDb + 2 && b140.dB[1] >= V071.midDb - 2, 'grind (2-6 kHz) up, mids kept ' + b140.dB.join(' / '));
    c.ok(Object.values(B).every(b => b.gtrHz < 80 && b.bassHz < 42) && b140.gtrHz < V071.gtrHz * 0.8, 'drop tuning: lowest guitar ' + Object.values(B).map(b => b.style + ' ' + b.gtrHz + ' Hz').join(', ') + ' (v0.7.1 ' + V071.gtrHz + ' Hz)');
    c.ok(B[80].gtrHz < B[140].gtrHz && B[140].gtrHz < B[200].gtrHz, 'tuning by tempo band: doom lowest, tremolo highest');
    c.ok(res.probe.thd > V071.thd * 1.3 && res.probe.harmonics > V071.harmonics * 2, 'more harmonics on one guitar note: THD ' + res.probe.thd + ' vs ' + V071.thd + ', energy ' + res.probe.harmonics + ' vs ' + V071.harmonics);
    c.ok(res.vox.chorus.hits.split(',').every(v => v === 'scream') && res.vox.bridge.hits.split(',').every(v => v === 'growl') && res.vox.chorus.onGrid && res.vox.bridge.onGrid, 'screams on the chorus, growls on the breakdown, on the beat grid ' + JSON.stringify(res.vox));
    c.ok(res.vox.chorus.VA >= V071.voxChorusVA + 2.5 && res.vox.bridge.VA >= 5, 'vocals louder against the band: screams ' + res.vox.chorus.VA + ' dB (v0.7.1 shouts ' + V071.voxChorusVA + '), growls ' + res.vox.bridge.VA + ' dB over the heavier breakdown');
    c.ok(res.cpu.xRT > 1 && res.cpu.peak < 1 && !res.cpu.nan, 'a full metal song (arena + crowd) renders faster than real time ' + JSON.stringify(res.cpu));
    const C = res.crowd;
    c.ok(Object.values(C).every(x => !x.nan && x.peak < 1), 'crowd renders never clip ' + Object.entries(C).map(([k, x]) => k + ' ' + x.peak).join(', '));
    c.ok(C.talk15.rms < C.talk50.rms && C.talk50.rms < C.talk90.rms && C.song15.rms < C.song90.rms && C.talk15.rms > 0.01, 'babble + roar rise with the meter ' + [C.talk15.rms, C.talk50.rms, C.talk90.rms, C.song90.rms].join(' / '));
    c.ok(C.song15.rms < C.talk15.rms && C.silent.rms < C.song90.rms * 0.3, 'people listen during songs; silent crowds hush ' + C.song15.rms + ' ' + C.silent.rms);
    c.ok(C.talk50.width > 0.05, 'the crowd is spread in stereo ' + C.talk50.width);
    const n = C.events.n;
    c.ok(n.cheers >= 2 && n.boos >= 2 && n.claps >= 6 && n.woos >= 3 && n.whistles >= 2 && n.applause >= 1, 'cheers, boos, claps, woos, whistles, applause ' + JSON.stringify(n));
    c.ok(C.end100.rms > C.end60.rms && C.end60.rms > C.end45.rms, 'song-end reactions scale with the score ' + [C.end100.rms, C.end60.rms, C.end45.rms].join(' > '));
    c.ok(!res.mix.nan && res.mix.peak < 1, 'metal + a roaring crowd on top: no clipping ' + JSON.stringify(res.mix));
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'heavy threw: ' + (e.stack || e)); }
  await close();
  c.done();
}

(async () => {
  if (want('seq')) await seq();
  if (want('seq') || want('guided')) await guided();
  if (want('audio')) await audio();
  if (want('heavy')) await heavy();
})();
