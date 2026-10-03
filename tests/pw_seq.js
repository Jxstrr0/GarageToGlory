// pw_seq.js: the v0.2 sequencer and the song audio on a 390x844 phone viewport.
// Sections (META_ONLY=seq|guided|audio|heavy|genres|voices|part|hash|kit, comma-separated; default all; seq also runs guided). Each must finish inside `timeout 500`.
//   real  : v1.2 Lane I (handoff F13 "no two hits the same"): 8 consecutive snares, 8 hats (one render each, equal vel, the
//           pro kit, punk's synth kit) and 8 metal palm-muted chugs (KS, 2 round robins) all differ pairwise (RMS diff > -40 dB);
//           the KS cache / PRE / realism debug fields exist; renders with vel stay finite and under the ceiling. ~1 min.
//   kit   : v1.2 Lane I (handoff F17.3): the TMKD "Vortex" sampled kit. Metal on tier 3 renders it (result.kitUsed), onsets <= 1 ms
//           (rendered + the live decode), 5 consecutive snares all differ, per-lane loudness within +-1 dB of the 1.1 pro-tier synth
//           (tools/kit_trim.js), Classic on: metal tier 1 + punk tier 3 hashes = the 1.1 fixture; Classic off: metal tier 1 and punk
//           tier 3 render bit-identical with and without the kit module (it never leaks into other tiers or genres). ~1 min.
//   hash  : v1.2 stage 0 (handoff F3.1): with GG.audio.classic(true), every case of tests/fixtures/audio_v11_hashes.json (4 genres x
//           full / drums / band songs, 4 genres x 6 tap lanes x 4 kit tiers live + pre-rendered, sections, seat notes, vocals,
//           probes, radio) renders bit-identical to 1.1.0.0 (tools/audio_hashes.js verify; deterministic summing: tools/_audio_lab.js).
//           HASH_ONLY=<key prefixes> narrows it (e.g. HASH_ONLY=tap,pre). ~4-5 min alone.
//   genres, voices: v0.9 (see the functions: genre amps, styles, solos, beds, crowd one-shots, in-career songs; singers).
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
//           v0.8: kit quality tiers 0..3 per lane (clean, never clipping, fuller + longer each tier) + an outro/solo song.
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
const { open, checker, shotName } = require('./_pw');
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
        if (solo.length && !solo.some(e => e.kind === 'lead' || e.kind === 'fiddle' || e.kind === 'twang')) out.soloOk = false;   // v0.9: Earl's Tele
        out.drops[g] = brk.filter(e => e.kind === 'vox').map(e => A.vocFamily(e.voc)).join();   // v0.9: growl, guttural, fry = the growl family
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
    // ---- v0.8 kit quality tiers (C3): audible (energy + sustain grow tier by tier), never clipping; outro/solo songs ----
    const tiers = await page.evaluate(async () => {
      const out = { lanes: {}, songs: {} }, e = r => r.rms * r.rms * r.seconds;
      for (const g of ['metal', 'rock', 'country']) for (const l of ['kick', 'snare', 'toms', 'cymbal']) {
        out.lanes[g + ' ' + l] = [];
        for (let q = 0; q < 4; q++) { const r = await GG.audio.renderOffline({ genre: g, lane: l, quality: q }); out.lanes[g + ' ' + l].push({ peak: r.peak, e: e(r), tail: r.tail, nan: r.nan }); }
      }
      const S = GG.songs, gear = { lanes: 6, doubleKick: true, sections: ['outro', 'solo'] };
      for (const q of [0, 3]) {
        const p = S.addSection(S.addSection(S.generate('metal', GG.RNG(4), { gear }), 'solo', gear), 'outro', gear);
        const r = await GG.audio.renderOffline({ genre: 'metal', pattern: p, full: true, bars: 40, songId: 's1', quality: q });
        out.songs['q' + q] = { peak: +r.peak.toFixed(3), rms: +r.rms.toFixed(4), nan: r.nan };
      }
      return out;
    });
    const tierBad = [], tierFlat = [];
    for (const [k, list] of Object.entries(tiers.lanes)) {
      if (list.some(r => r.nan || !(r.peak > 0.02 && r.peak < 1))) tierBad.push(k);
      if (!list.every((r, i) => !i || (r.e > list[i - 1].e && r.tail > list[i - 1].tail)) || !(list[3].e > list[0].e * 2)) tierFlat.push(k);
    }
    c.ok(tierBad.length === 0, 'kit tiers render clean, no clipping (' + Object.keys(tiers.lanes).length * 4 + ' renders) ' + tierBad.join());
    c.ok(tierFlat.length === 0, 'kit tiers audible: fuller + longer each tier, arena > 2x the milk crate ' + tierFlat.join());
    c.ok(Object.values(tiers.songs).every(r => !r.nan && r.peak < 1 && r.rms > 0.01) && tiers.songs.q3.rms > tiers.songs.q0.rms, 'a 6-lane outro/solo song renders clean on the milk crate and the arena kit ' + JSON.stringify(tiers.songs));

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
        out.vox[sec] = { hits: hits.map(e => e.voc).join(), fam: hits.map(e => A.vocFamily(e.voc)).join(), onGrid: hits.every(e => e.beat % 1 === 0), VA: +(10 * Math.log10(V / B)).toFixed(2) };
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
    c.ok(res.vox.chorus.fam.split(',').every(v => v === 'scream') && res.vox.bridge.fam.split(',').every(v => v === 'growl') && res.vox.chorus.onGrid && res.vox.bridge.onGrid, 'screams on the chorus, growls on the breakdown (v0.9: of several kinds), on the beat grid ' + JSON.stringify(res.vox));
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

// v0.9 extra helpers: f0 by autocorrelation (60..1000 Hz) and the spectral centroid of a window; slap = energy ratio.
function pageHelpers09() {
  const mono = b => { const n = b.length, m = new Float32Array(n); for (let ch = 0; ch < b.numberOfChannels; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) m[i] += d[i] / b.numberOfChannels; } return m; };
  window.__f0 = function (buf, from, to) {
    const sr = buf.sampleRate, m = mono(buf), a = Math.floor(from * sr), n = Math.floor(to * sr) - a;
    let best = 0, lagB = 0, e0 = 0; for (let i = 0; i < n; i++) e0 += m[a + i] * m[a + i];
    for (let lag = Math.floor(sr / 1000); lag <= Math.floor(sr / 60); lag++) { let s = 0; for (let i = 0; i < n - lag; i++) s += m[a + i] * m[a + i + lag]; s /= e0 || 1; if (s > best) { best = s; lagB = lag; } }
    return lagB ? +(sr / lagB).toFixed(1) : 0;
  };
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) {
      const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
      for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const p = i + k, q = p + len / 2, br = re[q] * cr - im[q] * ci, bi = re[q] * ci + im[q] * cr; re[q] = re[p] - br; im[q] = im[p] - bi; re[p] += br; im[p] += bi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
    }
  }
  window.__centroid = function (buf, from, to) {   // power-weighted mean frequency, 80 Hz .. 8 kHz
    const sr = buf.sampleRate, m = mono(buf), N = 4096; let num = 0, den = 0;
    for (let s = Math.floor(from * sr); s + N <= Math.floor(to * sr); s += N / 2) {
      const re = new Float64Array(N), im = new Float64Array(N);
      for (let i = 0; i < N; i++) re[i] = m[s + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
      fft(re, im);
      for (let k = 1; k < N / 2; k++) { const f = k * sr / N; if (f < 80 || f > 8000) continue; const p = re[k] * re[k] + im[k] * im[k]; num += p * f; den += p; }
    }
    return den ? Math.round(num / den) : 0;
  };
  window.__energy = function (buf, from, to) { const sr = buf.sampleRate, m = mono(buf); let e = 0; for (let i = Math.floor(from * sr); i < Math.floor(to * sr); i++) e += m[i] * m[i]; return e / Math.max(1, Math.floor(to * sr) - Math.floor(from * sr)); };
}

// v0.9 "Genres" (plan_contract_0.9 §5 D): genre amps (stereo width, country slapback), tempo styles, solos by the soloist,
// no metal rig in a non-metal render, a tier-0 bed + noodle per band (offline and live, in-career), crowd one-shots per
// moment kind (+ the crowd answering the band's gang shouts), one in-career song per genre. Writes tests/.cache/v09_*.wav.
async function genres() {
  const c = checker('genres');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(pageHelpers); await page.evaluate(pageHelpers09);
    const res = await page.evaluate(async () => {
      const A = GG.audio, out = { songs: {}, band: {}, styles: {}, solos: {}, beds: {}, crowd: {}, wav: {} };
      const sig = g => { const p = JSON.parse(JSON.stringify(GG.songs.signature(g))); p.arrangement = ['verse', 'chorus', 'bridge', 'chorus']; return p; };
      for (const g of GG.contracts.GENRES) {
        const t0 = performance.now(), r = await A.renderOffline({ genre: g, pattern: sig(g), full: true, bars: 16, songId: 'g9' }), wall = (performance.now() - t0) / 1000;
        out.songs[g] = { peak: +r.peak.toFixed(3), rms: +r.rms.toFixed(4), nan: r.nan, xRT: +(r.seconds / wall).toFixed(2), rigs: r.rigs, kinds: Object.keys(r.counts).sort().join(), solo: r.solo, width: __bands(r.buffer).width };
        out.wav[g] = __wav(r.buffer);
        const b = await A.renderOffline({ genre: g, pattern: sig(g), section: 'chorus', bars: 2, songId: 'g9', drums: false, vocals: false });
        out.band[g] = { width: __bands(b.buffer).width, peak: +b.peak.toFixed(3) };
      }
      for (const [g, st] of [['punk', 'skate'], ['punk', 'hardcore'], ['rock', 'ballad'], ['rock', 'drive'], ['country', 'twostep'], ['country', 'train']]) {
        const r = await A.renderOffline({ genre: g, backing: st, section: 'chorus', bars: 2, songId: 'st' });
        out.styles[g + ' ' + st] = { peak: +r.peak.toFixed(3), rms: +r.rms.toFixed(4), nan: r.nan, kinds: Object.keys(r.counts).sort().join() };
        if (st === 'ballad' || st === 'train') out.wav['style_' + st] = __wav(r.buffer);
      }
      const gear = { lanes: 4, sections: ['solo'] };
      for (const g of ['punk', 'rock', 'country']) {
        const p = GG.songs.addSection(GG.songs.signature(g, gear), 'solo', gear), r = await A.renderOffline({ genre: g, pattern: p, section: 'solo', bars: 2, songId: 'so' });
        out.solos[g] = { solo: r.solo, kinds: Object.keys(r.counts).sort().join(), peak: +r.peak.toFixed(3), nan: r.nan };
      }
      // Country slapback: a muted Tele pluck, then its echo ~110 ms later (vs the gap just before it).
      const tw = await A.renderOffline({ probe: 'twang', genre: 'country', midi: 67, mute: true, seconds: 0.9 }), sl = GG.content.genres.country.backing.amp.slap;
      out.slap = { gap: __energy(tw.buffer, 0.05 + sl - 0.012, 0.05 + sl - 0.002), echo: __energy(tw.buffer, 0.05 + sl + 0.004, 0.05 + sl + 0.05), peak: tw.peak };
      for (const [kind, season] of [['garage'], ['laundromat'], ['stripmall'], ['quonset', 'summer'], ['quonset', 'spring']]) {
        const r = await A.renderOffline({ ambience: 'garage', space: kind, season, noodle: { garage: 'pluck', laundromat: 'twochord', stripmall: 'riff', quonset: season === 'spring' ? 'bach' : 'strum' }[kind], seconds: 3 });
        out.beds[kind + (season ? ' ' + season : '')] = { peak: +r.peak.toFixed(3), rms: +r.rms.toFixed(4), nan: r.nan, bed: r.bed };
        out.wav['bed_' + kind + (season ? '_' + season : '')] = __wav(r.buffer);
      }
      for (const kind of ['headbang', 'wallOfDeath', 'pogo', 'gangShout', 'circlePit', 'fistPump', 'singAlong', 'lighters', 'clapAlong', 'lineDance', 'yeehaw']) {
        const r = await A.renderOffline({ ambience: 'crowd', level: 90, song: true, seconds: 3.2, bpm: 120, tonic: 45, moments: [[0.2, kind]] });
        out.crowd[kind] = Object.assign({ peak: +r.peak.toFixed(3), nan: r.nan }, r.crowd);
        if (['gangShout', 'singAlong', 'lineDance', 'wallOfDeath'].includes(kind)) out.wav['crowd_' + kind] = __wav(r.buffer);
      }
      const ans = async lv => (await A.renderOffline({ genre: 'punk', pattern: sig('punk'), section: 'chorus', bars: 4, songId: 'g9', crowd: { level: lv } })).crowd.chants;
      out.chants = { hot: await ans(90), cold: await ans(40) };
      return out;
    });
    fs.mkdirSync(CACHE, { recursive: true });
    for (const [k, b64] of Object.entries(res.wav)) fs.writeFileSync(path.join(CACHE, 'v09_' + k + '.wav'), Buffer.from(b64, 'base64'));
    delete res.wav;
    console.log('v0.9 genre metrics ' + JSON.stringify(res));
    const S = res.songs;
    for (const [g, r] of Object.entries(S)) c.ok(!r.nan && r.peak < 1 && r.rms > 0.05 && r.rms < 0.25, g + ' song: peak < 1, RMS sane ' + JSON.stringify(r));
    c.ok(Object.entries(S).every(([g, r]) => g === 'metal' ? r.rigs.metal && !r.rigs.amps.length : !r.rigs.metal && r.rigs.amps.join() === g), 'each genre builds its own amp only (no metal rig outside metal) ' + JSON.stringify(Object.values(S).map(r => r.rigs)));
    c.ok(['punk', 'rock', 'country'].every(g => S[g].xRT > 1), 'punk, rock + country (the new amps) render faster than real time (metal: the heavy section) ' + Object.entries(S).map(([g, r]) => g + ' ' + r.xRT).join(', '));
    c.ok(res.band.punk.width > 0.05 && res.band.rock.width > 0.05 && res.band.punk.width > res.band.country.width, 'punk + rock guitars double-tracked L/R (band-only width) ' + JSON.stringify(res.band));
    c.ok(S.country.width < S.metal.width, 'country stays narrower than metal ' + S.country.width + ' < ' + S.metal.width);
    c.ok(res.slap.echo > res.slap.gap * 3 && res.slap.peak < 1, 'country: slapback ~' + GG_ms(res) + ' after the pluck ' + JSON.stringify(res.slap));
    c.ok(Object.values(res.styles).every(r => !r.nan && r.peak < 1 && r.rms > 0.005), 'tempo styles render clean ' + JSON.stringify(res.styles));
    c.ok(res.solos.punk.solo === 'twochord' && /lead/.test(res.solos.punk.kinds) && res.solos.rock.solo === 'lead' && res.solos.country.solo === 'twang' && /twang/.test(res.solos.country.kinds) &&
      Object.values(res.solos).every(r => !r.nan && r.peak < 1), 'solos: Benny\'s two chords, a rock lead, Earl\'s Tele ' + JSON.stringify(res.solos));
    const B = res.beds;
    c.ok(Object.values(B).every(r => !r.nan && r.peak < 1 && r.peak > 0.005 && r.bed.noodles > 0), 'every tier-0 bed + its noodle renders clean ' + JSON.stringify(B));
    c.ok(B.laundromat.bed.events.dryer >= 3 && B.laundromat.bed.events.buzzer >= 1 && B.stripmall.bed.events.vacuum >= 1 && B['quonset summer'].bed.events.crickets >= 1 &&
      B['quonset spring'].bed.events.meadowlark >= 1 && B['quonset spring'].bed.layers.join() === 'wind,steel', 'dryers + buzzer, the vacuum next door, wind on steel + crickets / a meadowlark');
    const CR = res.crowd, has = (k, f) => CR[k][f] > 0;
    c.ok(Object.values(CR).every(r => !r.nan && r.peak < 1 && r.cheers >= 1), 'every genre moment cheers, never clips ' + Object.entries(CR).map(([k, r]) => k + ' ' + r.peak).join(', '));
    c.ok(has('headbang', 'roars') && has('wallOfDeath', 'roars') && has('pogo', 'chants') && has('gangShout', 'chants') && CR.gangShout.chants >= 3 && has('fistPump', 'chants') &&
      has('singAlong', 'whoas') && has('lighters', 'whoas') && has('clapAlong', 'clapAlongs') && CR.lineDance.claps >= 6 && has('lineDance', 'yeehaws') && has('yeehaw', 'yeehaws'),
      'one-shots per kind: metal roar, gang HEY/OI, whoa-oh, clap-along on 2 and 4 + yee-haws ' + JSON.stringify(CR));
    c.ok(res.chants.hot >= 2 && res.chants.cold === 0, 'a hot crowd answers the band\'s gang shouts, a cold one does not ' + JSON.stringify(res.chants));
    // In-career: each band's room + noodle live, and one song through the live rig (no metal amp in a non-metal career).
    const KIND = { frost_heave: 'laundromat', gravel_kings: 'stripmall', grid_road_ramblers: 'quonset', hail_damage: 'garage' };   // (metal last: rigs persist per page)
    await page.mouse.click(200, 400);   // a user gesture unlocks the AudioContext
    await page.waitForFunction(() => GG.audio.context() && GG.audio.context().state === 'running', null, { timeout: 8000 });
    for (const bandId of Object.keys(KIND)) {
      await page.evaluate(b => { GG.audio.stop(); GG.main.quickStart({ seed: 21, bandId: b, openCard: false }); GG.ui.closeAll(); }, bandId);
      await page.waitForFunction(() => GG.audio.refreshAmbience() === 'garage', null, { timeout: 8000 });
      await page.waitForFunction(() => GG.debug('audio').counts.noodles > 0, null, { timeout: 12000 }).catch(() => {});
      const n0 = await page.evaluate(() => ({ n: GG.debug('audio').counts.noodles, b: GG.debug('audio').counts.bed || 0 }));
      await page.waitForFunction(o => GG.debug('audio').counts.noodles > o.n && (GG.debug('audio').bed.events.length === 0 || (GG.debug('audio').counts.bed || 0) > o.b), n0, { timeout: 12000 }).catch(() => {});
      const live = await page.evaluate(async () => {
        const d0 = GG.debug('audio'), st = GG.state, song = st.songs[0] || { id: 'x', pattern: GG.songs.signature(st.genre) };
        const h = GG.audio.play(song.pattern, { genre: st.genre, songId: song.id });
        await new Promise(r => setTimeout(r, 1800));
        const d = GG.debug('audio'); GG.audio.stop();
        return { genre: st.genre, bed: d0.bed, noodle: d0.noodle, noodles: d0.counts.noodles, bedShots: d0.counts.bed || 0, amb: d0.ambVoices, playing: !!h, steps: d.steps - d0.steps,
          rigs: d.rigs, voice: d.voice, solo: d.solo, vox: d.counts.vox - d0.counts.vox, band: d.bandVoices };
      });
      const want = KIND[bandId];
      c.ok(live.bed && live.bed.kind === want && live.noodles > 0 && (live.bed.events.length === 0 || live.bedShots > 0) && live.amb <= 6, bandId + ': the ' + want + ' bed + ' + (live.noodle && live.noodle.who) + '\'s ' + (live.noodle && live.noodle.style) + ' ' + JSON.stringify(live));
      c.ok(live.playing && live.steps > 10 && live.rigs && (live.genre === 'metal' || !live.rigs.metal && live.rigs.amps.includes(live.genre)) && live.band <= 8,
        bandId + ': an in-career song through its own amp, under the voice cap ' + JSON.stringify({ rigs: live.rigs, voice: live.voice, solo: live.solo, band: live.band }));
    }
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'genres threw: ' + (e.stack || e)); }
  await close();
  c.done();
}
function GG_ms(res) { return Math.round(1000 * 0.11) + ' ms'; }

// v0.9 vocal diversity (owner popup 2026-09-30): every singer measurably different (f0 + spectral centroid of the same
// shout), >= 4 vocal types rendered across a metal set, words vary per genre, nothing clips. Writes tests/.cache/
// v09_voice_<singer>.wav (their chorus, vocals only) and v09_voice_<singer>_hey.wav (the probe).
async function voices() {
  const c = checker('voices');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(pageHelpers); await page.evaluate(pageHelpers09);
    const res = await page.evaluate(async () => {
      const A = GG.audio, out = { singers: {}, wav: {}, set: {}, words: {} };
      const SING = [['marcel', 'metal'], ['rox', 'punk'], ['chase', 'rock'], ['travis', 'country'], ['tw_gord', 'metal'], ['blaze', 'punk', 'mall_rats'], ['rex', 'rock', 'chartbusters'], ['brayden', 'country', 'buckle_and_boot']];
      for (const [id, g, rival] of SING) {
        const who = rival ? { rival } : { singer: id };
        const p = await A.renderOffline(Object.assign({ probe: 'vox', voc: 'shout', word: 'YEAH', genre: g, midi: 60, seconds: 1 }, who));
        const song = await A.renderOffline(Object.assign({ genre: g, pattern: GG.songs.signature(g), section: 'chorus', bars: 4, songId: 'v' + id, vocalsOnly: true }, who));
        out.singers[id] = { voice: p.voice, midi: p.midi, f0: __f0(p.buffer, 0.2, 0.5), centroid: __centroid(p.buffer, 0.1, 0.55), peak: +p.peak.toFixed(3), nan: p.nan,
          songPeak: +song.peak.toFixed(3), songRms: +song.rms.toFixed(4), songNan: song.nan };
        out.wav[id + '_hey'] = __wav(p.buffer); out.wav[id] = __wav(song.buffer);
      }
      // A metal set, vocals only: the types that actually rendered.
      const v0 = Object.assign({}, GG.debug('audio').vocTypes), peaks = [];
      for (let i = 1; i <= 6; i++) { const r = await A.renderOffline({ genre: 'metal', pattern: GG.songs.signature('metal'), full: true, bars: 24, songId: 'set' + i, singer: 'marcel', vocalsOnly: true, bpm: [90, 140, 190][i % 3] }); peaks.push(+r.peak.toFixed(3)); }
      const v1 = GG.debug('audio').vocTypes;
      out.set = { types: Object.keys(v1).filter(k => (v1[k] || 0) > (v0[k] || 0)), peaks };
      for (const g of GG.contracts.GENRES) {
        const w = new Set(); for (let i = 1; i <= 6; i++) A.timeline(GG.songs.signature(g), { genre: g, songId: 'w' + i }).events.forEach(e => { if (e.word) w.add(e.word); });
        out.words[g] = w.size;
      }
      const full = await A.renderOffline({ genre: 'metal', pattern: GG.songs.signature('metal'), full: true, bars: 24, songId: 'set1', singer: 'tw_gord' });
      out.gordSong = { peak: +full.peak.toFixed(3), nan: full.nan };
      return out;
    });
    fs.mkdirSync(CACHE, { recursive: true });
    for (const [k, b64] of Object.entries(res.wav)) fs.writeFileSync(path.join(CACHE, 'v09_voice_' + k + '.wav'), Buffer.from(b64, 'base64'));
    delete res.wav;
    console.log('v0.9 voice metrics ' + JSON.stringify(res));
    const S = Object.entries(res.singers), bad = [];
    c.ok(S.every(([, s]) => !s.nan && !s.songNan && s.peak < 1 && s.songPeak < 1 && s.peak > 0.02 && s.songRms > 0.002), 'every singer renders clean, never clips ' + S.map(([k, s]) => k + ' ' + s.peak + '/' + s.songPeak).join(', '));
    c.ok(S.every(([, s]) => s.f0 > 60 && s.centroid > 300), 'pitch + formants measurable ' + S.map(([k, s]) => k + ' ' + s.f0 + ' Hz, ' + s.centroid + ' Hz').join('; '));
    for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
      const a = S[i][1], b = S[j][1], semis = Math.abs(12 * Math.log2(a.f0 / b.f0)), cen = Math.abs(a.centroid / b.centroid - 1);
      if (semis < 0.8 && cen < 0.08) bad.push(S[i][0] + '~' + S[j][0] + ' (' + semis.toFixed(2) + ' st, ' + (cen * 100).toFixed(1) + '%)');
    }
    c.ok(bad.length === 0, 'every pair of singers differs (>= 0.8 semitone or >= 8% in formant centroid) ' + bad.join(', '));
    c.ok(res.singers.tw_gord.f0 < res.singers.marcel.f0 && res.singers.rex.f0 > res.singers.brayden.f0, 'Gord under Marcel; Rex Glamour over Brayden');
    c.ok(res.set.types.length >= 4 && res.set.peaks.every(p => p < 1), 'a metal set sings >= 4 vocal types, never clipping: ' + res.set.types.join(',') + ' ' + res.set.peaks);
    c.ok(Object.values(res.words).every(n => n >= 8), 'word variety per genre ' + JSON.stringify(res.words));
    c.ok(!res.gordSong.nan && res.gordSong.peak < 1, 'a full metal song sung by Gord: no clipping ' + JSON.stringify(res.gordSong));
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'voices threw: ' + (e.stack || e)); }
  await close();
  c.done();
}

(async () => {
  if (want('genres')) await genres();
  if (want('voices')) await voices();
  if (want('seq')) await seq();
  if (want('seq') || want('guided')) await guided();
  if (want('audio')) await audio();
  if (want('heavy')) await heavy();
  if (want('part')) await part();
  if (want('hash')) await hash();
  if (want('kit')) await kit();
  if (want('real')) await real();
})();

// v1.1 "Seats" (plan_contract_1.1 §4.4): the string-seat songwriter. A bass Write (Hail Damage): guided step 1 = Kenji's
// suggested groove (the signature, per section) + "Tell Kenji what to play" (today's drum grid, unchanged) -> "Your part"
// per section: a progression card, the 3-row grid (root / fifth / octave), one-tap tweaks with their meter change, Play
// plays your part (GG.audio.play { seat, part }) -> tempo -> order -> name -> Save: the song lands with exactly that part.
// Advanced: the "Your part | Drums" switch. A lead sketch pad: the 5-row hook grid + "Guitar shop". Layout audit on every
// screen; no console errors.
async function part() {
  const c = checker('part');
  const { page, errors, close } = await open();
  const ev = (f, a) => page.evaluate(f, a);
  const step = () => page.evaluate(() => GG.debug('seq').step);
  const partOf = () => page.evaluate(() => GG.ui.get('seq').data.pat.part);
  try {
    await page.waitForSelector(tid('btn-new'));
    await ev(() => {
      GG.prefs.set({ songwriterMode: 'guided' });
      GG.main.quickStart({ seed: 4242, bandId: 'hail_damage', seat: 'bass' });
      const A = GG.audio, p0 = A.play; window.__play = [];
      A.play = function (pat, o) { window.__play.push({ seat: o && o.seat, part: !!(o && o.part), drums: o && o.drums }); return p0.apply(this, arguments); };
    });
    await page.waitForFunction(() => GG.state && (GG.state.phase === 'plan' || GG.debug('ui').screen === 'card'));
    if (await screen(page) === 'card') { await tap(page, 'choice-0'); await tap(page, 'btn-card-ok'); }
    await page.waitForFunction(() => GG.state.phase === 'plan' && GG.debug('ui').stack.length === 0);
    await tap(page, 'btn-primary'); await waitScreen(page, 'plan');
    for (const a of ['write', 'rehearse', 'rest']) await tap(page, 'act-' + a);
    await tap(page, 'btn-go'); await waitScreen(page, 'seq');
    const d0 = await ev(() => ({ dbg: GG.debug('seq'), step: document.querySelector('[data-testid="guide-step"]').textContent,
      drums: document.querySelector('[data-testid="part-drums"]').textContent, tell: document.querySelector('[data-testid="btn-tell-drummer"]').textContent }));
    c.ok(d0.dbg.seat === 'bass' && d0.dbg.step === 'drums' && /Step 1 of 7 · Drums/.test(d0.step), 'a bass Write opens on the drums step ' + d0.step);
    c.ok(/Verse/.test(d0.drums) && /Chorus/.test(d0.drums) && /Bridge/.test(d0.drums) && /Headbanger/.test(d0.drums), 'Kenji suggests the signature groove per section ' + d0.drums);
    c.ok(d0.tell === 'Tell Kenji what to play', 'Tell {drummer} what to play: ' + d0.tell);
    c.ok(d0.dbg.part && d0.dbg.part.seat === 'bass' && Object.keys(d0.dbg.part.sections).join() === 'verse,chorus,bridge', 'the song carries a bass part for every section');
    c.ok((await audit(page)).length === 0, 'drums step layout ' + (await audit(page)).join('; '));
    // Tell Kenji: today's drum grid, then back to the guided steps from the Song tab
    await tap(page, 'btn-tell-drummer');
    const g0 = await ev(() => ({ dbg: GG.debug('seq'), kick: !!document.querySelector('[data-testid="cell-kick-0"]'), sw: !!document.querySelector('[data-testid="seq-layers"]'),
      label: document.querySelector('[data-testid="seq-layer-drums"]').textContent }));
    c.ok(!g0.dbg.guided && g0.dbg.layer === 'drums' && g0.kick && g0.sw && /Kenji/.test(g0.label), 'the drum grid (unchanged) under a Your part | Drums switch ' + g0.label);
    const k0 = await ev(() => GG.ui.get('seq').data.pat.sections.verse[1]);
    await page.locator(tid('cell-snare-2')).click();
    c.ok(await ev(() => GG.ui.get('seq').data.pat.sections.verse[1]) !== k0, 'a drum cell still toggles');
    await tap(page, 'seq-layer-part');
    c.ok(await ev(() => GG.debug('seq').layer === 'part' && !!document.querySelector('[data-testid="part-grid"]') && document.querySelectorAll('[data-testid^="part-cell-"]').length === 48), 'Your part: 3 rows x 16 steps');
    c.ok((await audit(page)).length === 0, 'advanced part layout ' + (await audit(page)).join('; '));
    await tap(page, 'seq-tab-song'); await tap(page, 'btn-seq-guided');
    c.ok(await step() === 'drums', 'Guided steps returns to the drums step');
    await tap(page, 'btn-guide-next');
    const v0 = await ev(() => ({ step: GG.debug('seq').step, picks: document.querySelectorAll('[data-testid^="part-pick-"]').length, mods: [...document.querySelectorAll('[data-testid^="part-mod-"]')].map(b => b.dataset.testid),
      cols: document.querySelector('[data-testid="part-grid"]').dataset.lanes, hint: document.querySelector('[data-testid="guide-hint"]').textContent }));
    c.ok(v0.step === 'verse' && v0.picks >= 3 && v0.cols === '3' && /root, fifth or octave/.test(v0.hint), 'your verse: progressions + the root/fifth/octave grid ' + JSON.stringify(v0));
    c.ok(v0.mods.join() === 'part-mod-lock,part-mod-double,part-mod-ring,part-mod-call', 'the four one-tap tweaks ' + v0.mods);
    c.ok((await audit(page)).length === 0, 'part step layout ' + (await audit(page)).join('; '));
    await tap(page, 'part-pick-1');
    c.ok((await partOf()).sections.verse.prog === 1 && await ev(() => !!document.querySelector('[data-testid="part-pick-1"].on')), 'picking a progression sets the verse');
    const m0 = await meters(page);
    await page.locator(tid('part-cell-2-15')).click();
    const pv = await partOf();
    c.ok(pv.sections.verse.rows[2][15] === 'x', 'a tap on the grid adds an octave note ' + pv.sections.verse.rows[2]);
    await tap(page, 'part-mod-lock');
    const ch = await ev(() => document.querySelector('[data-testid="guide-change"]').textContent);
    c.ok(/Lock to the kick/.test(ch) && /Groove \d+ → \d+/.test(ch), '"Lock to the kick" shows the meter change ' + ch);
    const m1 = await meters(page);
    c.ok(m0.join() !== m1.join() || /→/.test(ch), 'the meters follow your part ' + m0 + ' / ' + m1);
    const verse = JSON.stringify((await partOf()).sections.verse);
    await tap(page, 'btn-guide-play');
    await page.waitForFunction(() => GG.debug('seq').playing === 'loop', null, { timeout: 5000 });
    const pl = await ev(() => window.__play[window.__play.length - 1]);
    c.ok(pl && pl.seat === 'bass' && pl.part, 'Play plays your part (seat + part) ' + JSON.stringify(pl));
    await tap(page, 'btn-guide-play');
    await tap(page, 'btn-guide-next');
    c.ok(await step() === 'chorus', 'chorus');
    await tap(page, 'part-mod-double');
    const chorus = JSON.stringify((await partOf()).sections.chorus);
    await tap(page, 'btn-guide-next');
    c.ok(await step() === 'bridge', 'bridge');
    await tap(page, 'part-mod-ring');
    const bridge = JSON.stringify((await partOf()).sections.bridge);
    for (let k = 0; k < 3; k++) await tap(page, 'btn-guide-next');
    c.ok(await step() === 'name', 'tempo -> order -> name');
    await page.locator(tid('guide-title-input')).fill('Low End Theory of Doom');
    await tap(page, 'btn-guide-save');
    await waitScreen(page, 'results');
    const last = await ev(() => GG.state.songs[GG.state.songs.length - 1]);
    c.ok(last.title === 'Low End Theory of Doom' && last.pattern.part && last.pattern.part.seat === 'bass', 'the song lands with your bass part');
    c.ok(JSON.stringify(last.pattern.part.sections.verse) === verse && JSON.stringify(last.pattern.part.sections.chorus) === chorus && JSON.stringify(last.pattern.part.sections.bridge) === bridge,
      'with exactly the part you wrote');
    c.ok(last.rating && last.rating.groove > 0 && await ev(() => !!GG.songs.partRating(GG.state.songs[GG.state.songs.length - 1].pattern, 'metal')), 'rated with your part');
    // the lead seat's sketch pad: 5 hook rows, the guitar shop
    await ev(() => { GG.ui.closeAll(); GG.main.quickStart({ seed: 4343, bandId: 'grid_road_ramblers', seat: 'lead', openCard: false }); GG.state.card = null; GG.state.phase = 'plan'; GG.ui.openSketch(); });
    await waitScreen(page, 'seq');
    const sk = await ev(() => ({ dbg: GG.debug('seq'), cols: document.querySelector('[data-testid="part-grid"]').dataset.lanes, shop: document.querySelector('[data-testid="btn-kit-shop"]').textContent }));
    c.ok(sk.dbg.mode === 'sketch' && sk.dbg.layer === 'part' && sk.cols === '5' && sk.dbg.part.seat === 'lead', 'lead sketch pad: the 5-row hook grid ' + sk.cols);
    c.ok(/Guitar shop/.test(sk.shop), 'the sketch pad shop is your seat’s: ' + sk.shop);
    c.ok((await audit(page)).length === 0, 'lead sketch layout ' + (await audit(page)).join('; '));
    await tap(page, 'btn-seq-tools');
    c.ok(await ev(() => !!document.querySelector('[data-testid="part-mod-call"]') && !!document.querySelector('[data-testid="part-clear"]')), 'the ⋯ tools hold your part’s tweaks');
    await tap(page, 'part-mod-call');
    c.ok((await audit(page)).length === 0, 'after a tweak from the tools ' + (await audit(page)).join('; '));
    await page.screenshot({ path: path.join(CACHE, shotName('seq_part.png')) });
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'part threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

// v1.2 stage 0 (handoff F3.1 / F13): the Classic switch is the regression baseline. With it on, renderOffline / prerenderHit
// output must equal the 1.1.0.0 fixture bit for bit (SHA-1 of the Float32 samples; method + cases in tools/_audio_lab.js).
async function hash() {
  const c = checker('hash');
  try {
    const { verify } = require('../tools/audio_hashes');
    const r = await verify({ quiet: true, only: (process.env.HASH_ONLY || '').split(',').filter(Boolean) });
    console.log('hash: ' + (r.n - r.bad.length) + '/' + r.n + ' equal in ' + Math.round(r.ms / 1000) + ' s ' + JSON.stringify(r.info));
    c.ok(r.info.classicApi && r.info.classic === true, 'GG.audio.classic(true) switches the Classic sound on ' + JSON.stringify(r.info));
    c.ok(r.n >= 200 || (process.env.HASH_ONLY || '') !== '', 'the whole fixture was rendered (' + r.n + ' cases)');
    c.ok(r.bad.length === 0, 'classic on: every render equals 1.1.0.0 ' + (r.bad.length ? r.bad.length + ' differ: ' + r.bad.slice(0, 6).map(b => b.key + ' rms ' + b.want.rms + ' -> ' + b.got.rms).join(', ') : ''));
    c.ok(r.errors.length === 0, 'no console errors ' + r.errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'hash threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  c.done();
}

// v1.2 Lane I (handoff F17.3): the sampled kit. See the header (section kit).
async function kit() {
  const c = checker('kit');
  try {
    const lab = require('../tools/_audio_lab'), { verify } = require('../tools/audio_hashes'), { measure } = require('../tools/kit_trim');
    const L = await lab.openLab({ classic: false });
    try {
      const r = await L.page.evaluate(async () => {
        const A = GG.audio, W = window.__lab, out = {};
        const onset = (b, at) => { const d = b.getChannelData(0); let pk = 0; for (const v of d) pk = Math.max(pk, Math.abs(v)); for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > 0.02 * pk) return (i / b.sampleRate - at) * 1000; return null; };
        const one = await A.renderOffline({ genre: 'metal', lane: 'snare', quality: 3, vel: 0.85, room: 'dry' });
        const song = await A.renderOffline({ genre: 'metal', pattern: GG.songs.signature('metal'), section: 'chorus', bars: 2, quality: 3, vel: 0.85 });
        out.used = { one: one.kitUsed, song: song.kitUsed, drums: song.counts.drum, nan: one.nan || song.nan, peak: song.peak, clipOnset: one.kitOnset };
        out.onsets = [];
        for (const [lane, v] of [['kick'], ['snare'], ['toms', 0], ['toms', 1], ['toms', 2]]) for (let h = 0; h < 5; h++) {
          const x = await A.renderOffline({ genre: 'metal', lane, variant: v, quality: 3, vel: 0.85, hit: h, room: 'dry' }); out.onsets.push(onset(x.buffer, 0.05));
        }
        const sn = []; for (let h = 0; h < 5; h++) sn.push((await A.renderOffline({ genre: 'metal', lane: 'snare', quality: 3, vel: 0.85, hit: h, room: 'dry' })).buffer.getChannelData(0));
        out.pairs = [];
        for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) { let d = 0, e = 0; for (let k = 0; k < sn[i].length; k++) { d += (sn[i][k] - sn[j][k]) ** 2; e += sn[i][k] ** 2; } out.pairs.push(+(10 * Math.log10(d / e)).toFixed(1)); }
        // the kit never leaks: Classic off, metal tier 1 + punk tier 3 render the same with and without the kit module
        const specs = [];
        for (const l of GG.contracts.LANES) { specs.push({ genre: 'metal', lane: l, quality: 1, vel: 0.85 }); specs.push({ genre: 'punk', lane: l, quality: 3, vel: 0.85 }); }
        specs.push({ genre: 'metal', pattern: GG.songs.signature('metal'), section: 'verse', bars: 2, quality: 1, vel: 0.85 });
        specs.push({ genre: 'punk', pattern: GG.songs.signature('punk'), section: 'verse', bars: 2, quality: 3, vel: 0.85 });
        const hashAll = async () => { const h = []; for (const s of specs) h.push(await W.sha1((await A.renderOffline(s)).buffer)); return h; };
        const withKit = await hashAll(), K = GG.content.kits; GG.content.kits = {};
        const without = await hashAll(); GG.content.kits = K;
        out.leak = { n: specs.length, same: withKit.filter((h, i) => h === without[i]).length, diff: specs.filter((s, i) => withKit[i] !== without[i]).map(s => s.genre + '/' + (s.lane || 'song') + '/q' + s.quality) };
        // the live decode (title screen: the pro kit, metal)
        document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); A.unlock();
        for (let i = 0; i < 200 && !GG.debug('audio').kit.ready; i++) await new Promise(res => setTimeout(res, 100));
        const k = GG.debug('audio').kit; out.live = { ready: k.ready, n: k.n, onset: k.onset, bytes: k.bytes, ms: k.ms, err: k.err };
        return out;
      });
      c.ok(r.used.one === 1 && r.used.song > 0 && r.used.song <= r.used.drums && !r.used.nan && r.used.peak < 1, 'metal tier 3 renders the sampled kit ' + JSON.stringify(r.used));
      // (a render's onset includes the kit chain's fixed latency, ~15 ms of compressor look-ahead + oversampling: the clips must
      // all land within 1 ms of each other, and each decoded clip starts at most 1 ms before its first sample over 2 % of its peak)
      const o0 = Math.min(...r.onsets), o1 = Math.max(...r.onsets);
      c.ok(r.used.clipOnset != null && r.used.clipOnset <= 1 && o1 - o0 <= 1, 'onsets <= 1 ms: decoded clips ' + r.used.clipOnset + ' ms, 25 rendered clips within ' + (o1 - o0).toFixed(3) + ' ms of each other');
      c.ok(r.live.ready && r.live.n === 25 && !r.live.err && r.live.onset <= 1, 'the live decode: 25 clips, onset <= 1 ms ' + JSON.stringify(r.live));
      c.ok(r.pairs.every(d => d > -40), '5 consecutive snares all differ (pairwise diff > -40 dB) ' + JSON.stringify(r.pairs));
      c.ok(r.leak.same === r.leak.n, 'Classic off: metal tier 1 + punk tier 3 renders identical with and without the kit ' + JSON.stringify(r.leak));
      c.ok(L.errors.length === 0, 'no console errors ' + L.errors.slice(0, 3).join(' | '));
    } finally { await L.close(); }
    const m = await measure({ genre: 'metal' });
    const ds = Object.entries(m.lanes || {}).map(([k, v]) => k + ' ' + v.delta);
    c.ok(!m.error && Object.values(m.lanes).every(v => Math.abs(v.delta) <= 1 && v.used === 5), 'per-lane loudness within +-1 dB of the 1.1 pro-tier synth: ' + ds.join(', '));
    const h = await verify({ quiet: true, only: ['tap|metal', 'pre|metal', 'tap|punk', 'pre|punk'] });
    c.ok(h.n === 96 && h.bad.length === 0, 'Classic on: metal + punk taps (every tier) = the 1.1 fixture ' + (h.n - h.bad.length) + '/' + h.n + (h.bad.length ? ' ' + h.bad.slice(0, 3).map(b => b.key).join(', ') : ''));
  } catch (e) { c.ok(false, 'kit threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  c.done();
}

// v1.2 Lane I (handoff F13): no two hits the same. See the header (section real).
async function real() {
  const c = checker('real');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    const r = await page.evaluate(async () => {
      const A = GG.audio, E = '................', out = {};
      const pairs = (buf, at, win) => {   // RMS of the difference of every pair of hit windows, dB re the first window
        const d = buf.getChannelData(0), sr = buf.sampleRate, W = Math.round(win * sr), wins = at.map(t => d.subarray(Math.round(t * sr), Math.round(t * sr) + W));
        let e0 = 0; for (const v of wins[0]) e0 += v * v;
        const res = [];
        for (let i = 0; i < wins.length; i++) for (let j = i + 1; j < wins.length; j++) { let s = 0; for (let k = 0; k < W; k++) s += (wins[i][k] - wins[j][k]) ** 2; res.push(+(10 * Math.log10(s / e0 + 1e-12)).toFixed(1)); }
        return res;
      };
      const pat = (rows) => ({ bpm: 120, lanes: 4, arrangement: ['verse'], sections: { verse: rows, chorus: [E, E, E, E], bridge: [E, E, E, E] } });
      const sn = await A.renderOffline({ genre: 'punk', pattern: pat([E, 'x...x...x...x...', E, E]), section: 'verse', bars: 2, quality: 2, backing: false, vocals: false, vel: 0.85, room: 'dry' });
      out.snare = { pairs: pairs(sn.buffer, [0, 1, 2, 3, 4, 5, 6, 7].map(i => 0.05 + i * 0.5), 0.3), nan: sn.nan, peak: sn.peak };
      const ht = await A.renderOffline({ genre: 'punk', pattern: pat([E, E, 'x.x.x.x.........', E]), section: 'verse', bars: 2, quality: 2, backing: false, vocals: false, vel: 0.85, room: 'dry' });
      out.hat = { pairs: pairs(ht.buffer, [0, 1, 2, 3, 8, 9, 10, 11].map(i => 0.05 + i * 0.25), 0.04), nan: ht.nan, peak: ht.peak };
      const ch = await A.renderOffline({ probe: 'gtr', genre: 'metal', midi: 40, mute: true, power: true, hits: 8, gap: 0.25, vel: 0.85, seconds: 2.6, room: 'dry' });
      out.chug = { pairs: pairs(ch.buffer, [0, 1, 2, 3, 4, 5, 6, 7].map(i => 0.05 + i * 0.25), 0.15), nan: ch.nan, peak: ch.peak };
      const dbg = GG.debug('audio');
      out.dbg = { ks: !!dbg.ks && dbg.ks.n > 0, pre: !!dbg.pre, realism: dbg.realism && dbg.realism.id, kit: !!dbg.kit };
      return out;
    });
    for (const k of ['snare', 'hat', 'chug']) {
      const x = r[k];
      c.ok(x.pairs.length === 28 && x.pairs.every(v => v > -40) && !x.nan && x.peak < 1, k + ': 8 consecutive hits all differ (min ' + Math.min(...x.pairs) + ' dB) ' + JSON.stringify(x.pairs));
    }
    c.ok(r.dbg.ks && r.dbg.pre && r.dbg.realism === 'pro' && r.dbg.kit, 'debug(audio): ks, pre, realism, kit ' + JSON.stringify(r.dbg));
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'real threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}
