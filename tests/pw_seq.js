// pw_seq.js: the v0.2 sequencer and the song audio on a 390x844 phone viewport.
// Sections (META_ONLY=seq|quick|part|layout|audio|heavy|genres|voices|hash|kit|real|vox, comma-separated; default all; seq also runs quick). Each must finish inside `timeout 500`.
//   real  : v1.2 Lane I (handoff F13 "no two hits the same"): 8 consecutive snares, 8 hats (one render each, equal vel, the
//           pro kit, punk's synth kit) and 8 metal palm-muted chugs (KS, 2 round robins) all differ pairwise (RMS diff > -40 dB);
//           the KS cache / PRE / realism debug fields exist; renders with vel stay finite and under the ceiling. ~1 min.
//   kit   : v1.2 Lane I (handoff F17.3): the TMKD "Vortex" sampled kit. Metal on tier 3 renders it (result.kitUsed), onsets <= 1 ms
//           (rendered + the live decode), 5 consecutive snares all differ, per-lane loudness within +-1 dB of the 1.1 pro-tier synth
//           (tools/kit_trim.js), Classic on: metal tier 1 + punk tier 3 hashes = the 1.1 fixture; Classic off: metal tier 1 and punk
//           tier 3 render bit-identical with and without the kit module (it never leaks into other tiers or genres). ~1 min.
//   vox   : v1.2 Lane V (handoff F10): the Soundcheck vocals (vel on vox events) vs the 1.1 path: numbers before / after
//           (vocals RMS, 2-4 kHz, width, voice / band), Classic on + vel = 1.1, no vel = 1.1, doubles / gangs live, plate, vel level.
//   hash  : v1.2 stage 0 (handoff F3.1): with GG.audio.classic(true), every case of tests/fixtures/audio_v11_hashes.json (4 genres x
//           full / drums / band songs, 4 genres x 6 tap lanes x 4 kit tiers live + pre-rendered, sections, seat notes, vocals,
//           probes, radio) renders bit-identical to 1.1.0.0 (tools/audio_hashes.js verify; deterministic summing: tools/_audio_lab.js).
//           HASH_ONLY=<key prefixes> narrows it (e.g. HASH_ONLY=tap,pre). ~4-5 min alone.
//   genres, voices: v0.9 (see the functions: genre amps, styles, solos, beds, crowd one-shots, in-career songs; singers).
//   seq   : v1.3 "Songwriter" (plan_contract_1.3 §4.7): quickStart → plan Write + 2 others → Go → Quick song (the signature recipe
//           composed with the D14 seed; the old songwriterMode pref ignored) → Tweak → the drum editor (first-Write grid tip; cells
//           ≥ 60x30, the whole grid fits) → ⋯ Clear / tap / drag / kick rule → meters + ± flash → ⋯ Copy → Loop + playhead → ⋯
//           metronome (settings.metronome, clicks while looping) → Song tab → Save (the saved pattern === sanitize(D.pat)) →
//           results → the laptop catalog opens it read-only (view pat === saved; ⋯ = metronome only) → the kit sketch pad opens
//           Quick song (no draft), a slider move is the draft, Use queues it → the next Write opens it in the editor; block 2 jams
//           via ⋯; in-page GG.songs.rate equals node; then seq-compat: each v12_<seat> career's draft and a queued song, opened
//           and saved untouched, are their 1.2 SAN fixture (D16). Screenshot tests/.cache/seq.png.
//   quick : (replaces guided) recipes (5 + Surprise, the pedal recipe locked: a toast), Surprise me twice (same slot) = the same
//           song, a card = its defaults, Energy recomposes + round trip, Feel / Tempo never rewrite notes, Mood moves the chords,
//           ▶ Play keeps looping through slider moves, Tweak → hand edit → ⋯ Back to Quick song → Q3 (Keep my edits / Start
//           over; Feel never asks), two Write blocks → two songs.
//   part  : bass / rhythm / lead: v2 rows (6 / 6 / 7), "Chords: <name> ▾" / "Hook: <name> ▾", 4 chips (home outlined), the picker
//           (p.chords + part.prog, the roots move), the chord sheet + "Back to <name>", the tweaks in ⋯, the playing chip, the
//           Drums layer, save, view read-only, an old v1 part (view only until the first edit; a pick writes part.prog only).
//   layout: every editor case + Quick song per seat (+ full gear: 6 lanes, 6 tabs) at PW_VIEW (440x956: no scroll anywhere),
//           buttons ≥ 44, no h-scroll, shots tagged by size; then notch insets (47/34 at 390, 59/34 at 440) + Bigger text: the
//           sliders reachable through quick-main, the foot above the home bar, the longest hook name + 6 tabs fit.
//           v1.3.1 (Lane S): the sketch pad's head (✕ · title · 🛒 SHOP · ⋯) fits per seat on Quick song + the editor, plain and
//           with Bigger text + insets: every button >= 44 inside the viewport, "Sketch pad · <seat>" whole (no ellipsis).
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
const { open, checker, shotName, openTools, VIEW } = require('./_pw');
const load = require('./_load');
const CACHE = path.join(__dirname, '.cache');
const ONLY = (process.env.META_ONLY || '').split(',').filter(Boolean);
const want = s => !ONLY.length || ONLY.includes(s);

const tid = id => `[data-testid="${id}"]`;
const tap = (page, id) => page.locator(tid(id)).last().click();
const screen = page => page.evaluate(() => GG.debug('ui').screen);
const waitScreen = (page, id, timeout) => page.waitForFunction(i => GG.debug('ui').screen === i, id, { timeout: timeout || 10000 });
const meters = page => page.evaluate(() => ['groove', 'hook', 'difficulty'].map(k => +document.querySelector('[data-testid="meter-' + k + '"]').dataset.value));
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

// ---- v1.3 "Songwriter" (plan_contract_1.3 §4.7, §5 Lane U): helpers shared by seq / quick / part / layout ----
const H16 = x => require('crypto').createHash('sha1').update(JSON.stringify(x === undefined ? null : x)).digest('hex').slice(0, 16);
const dbgSeq = page => page.evaluate(() => GG.debug('seq'));
const patJSON = page => page.evaluate(() => JSON.stringify(GG.ui.get('seq').data.pat));
// Moves a Quick song slider like a finger lets go of it (input, then change).
const slide = (page, id, v) => page.evaluate(a => { const r = document.querySelector('[data-testid="quick-' + a[0] + '"]'); r.value = a[1]; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); }, [id, v]);
async function bootPlan(page, opts, acts) {
  await page.waitForSelector(tid('btn-new'));
  await page.evaluate(o => GG.main.quickStart(o), opts);
  await page.waitForFunction(() => GG.state && (GG.state.phase === 'plan' || GG.debug('ui').screen === 'card'));
  if (await screen(page) === 'card') { await tap(page, 'choice-0'); await tap(page, 'btn-card-ok'); }
  await page.waitForFunction(() => GG.state.phase === 'plan' && GG.debug('ui').stack.length === 0);
  await tap(page, 'btn-primary'); await waitScreen(page, 'plan');
  for (const a of acts || ['write', 'rehearse', 'rest']) await tap(page, 'act-' + a);
  await tap(page, 'btn-go'); await waitScreen(page, 'seq');
}
// Straight into a Write block (a fresh career on `seat`, no planner): composeWeek(n).
async function writeBlock(page, opts, n) {
  await page.evaluate(a => {
    GG.ui.closeAll(); GG.main.quickStart(Object.assign({ openCard: false }, a[0])); GG.state.card = null; GG.state.phase = 'plan';
    GG.ui.closeAll(); GG.ui.composeWeek(a[1] || 1, function () { window.__weekDone = true; });
  }, [opts, n]);
  await page.waitForFunction(() => GG.debug('ui').screen === 'seq' && GG.debug('seq'));
}

async function seq() {
  const c = checker('seq');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(() => GG.prefs.set({ songwriterMode: 'advanced' }));   // D18: the 0.6.2 preference is ignored now
    await bootPlan(page, { seed: 4242 });
    // A fresh Write block opens Quick song with the genre's signature recipe, composed with the D14 seed (Save works at once).
    const q0 = await page.evaluate(() => {
      const D = GG.ui.get('seq').data, r = GG.songs.recipes(GG.state.genre, GG.state.gear, 'drums')[0], dbg = GG.debug('seq');
      const want = GG.songs.compose(GG.state.genre, { recipe: r.id, energy: r.sliders.energy, mood: r.sliders.mood, swing: r.sliders.swing, fills: r.sliders.fills, bpm: r.bpm,
        seed: GG.hashSeed(String(GG.state.seed) + '|' + D.seed), gear: GG.state.gear, seat: 'drums' });
      const q = s => document.querySelector(s);
      return { dbg, phase: GG.state.phase, same: JSON.stringify(want) === JSON.stringify(D.pat), r: { id: r.id, s: r.sliders, bpm: r.bpm },
        title: q('[data-testid="seq-title"]').textContent, cards: [...document.querySelectorAll('[data-testid^="quick-recipe-"]')].map(b => b.dataset.testid),
        sliders: ['energy', 'mood', 'feel', 'fills', 'tempo'].map(k => !!q('[data-testid="quick-' + k + '"]') && !!q('[data-testid="quick-' + k + '-val"]')),
        tip: q('[data-testid="seq-tip"]').textContent, who: q('.seq-coach .sc-who').textContent, play: !!q('[data-testid="btn-guide-play"]'), tweak: !!q('[data-testid="btn-quick-tweak"]'),
        save: !!q('[data-testid="btn-seq-save"]'), guide: [...document.querySelectorAll('[data-testid^="guide-"], [data-testid^="btn-guide-"]')].map(b => b.dataset.testid) };
    });
    c.ok(q0.dbg.mode === 'write' && q0.dbg.screen === 'quick' && q0.phase === 'plan', 'Go opens Quick song before the week runs (the old songwriterMode pref is ignored)');
    c.ok(q0.same && q0.dbg.recipe.id === q0.r.id && q0.dbg.sliders.energy === q0.r.s.energy && q0.dbg.sliders.bpm === q0.r.bpm, 'the signature recipe at its default sliders, composed with the D14 seed ' + JSON.stringify(q0.dbg.recipe));
    c.ok(q0.cards.length === 6 && q0.cards[5] === 'quick-recipe-surprise' && q0.sliders.every(Boolean), '5 recipe cards + Surprise me, 5 sliders with value labels ' + q0.cards.join());
    c.ok(/Write block 1 of 1/.test(q0.title) && /Quick song/.test(q0.title), 'header: block count + "Quick song": ' + q0.title);
    c.ok(q0.who && q0.tip && !/:/.test(q0.tip), 'the bubble: a bandmate + the Quick line (colon-free, D17): ' + q0.who + ' / ' + q0.tip);
    c.ok(q0.play && q0.tweak && q0.save && q0.guide.join() === 'btn-guide-play', 'foot: Play / Tweak / Save; no guided steps left ' + q0.guide.join());
    c.ok((await audit(page)).length === 0, 'Quick song layout ' + (await audit(page)).join(' ; '));
    // Tweak ✎ -> the editor (the drum seat): the first Write's grid tip shows now.
    await tap(page, 'btn-quick-tweak');
    const d0 = await page.evaluate(() => ({ dbg: GG.debug('seq'), tip: document.querySelector('[data-testid="seq-tip"]').textContent, who: document.querySelector('.seq-coach .sc-who').textContent,
      sub: document.querySelector('[data-testid="seq-title"]').textContent, chips: !!document.querySelector('[data-testid="seq-chips"]'), layers: !!document.querySelector('[data-testid="seq-layers"]') }));
    c.ok(d0.dbg.screen === 'edit' && d0.dbg.tab === 'verse' && !d0.chips && !d0.layers, 'Tweak opens the editor on the verse (drum seat: no chips, no layer toggle)');
    c.ok(/(Dana|Marcel|Jaxon)/.test(d0.who) && d0.tip.length > 10 && !/^(Dana|Marcel|Jaxon):/.test(d0.tip), 'the first-Write grid tip, the name on the avatar (D17): ' + d0.who + ' / ' + d0.tip);
    // the one-line bubble opens the full tip
    await tap(page, 'seq-coach'); await waitScreen(page, 'seq-tip-full');
    const full = await page.evaluate(() => document.querySelector('[data-testid="seq-tip-full"]').textContent);
    c.ok(full.indexOf(d0.tip.replace(/…$/, '').slice(0, 20)) >= 0, 'tap the bubble: the full tip ' + full.slice(0, 80));
    await tap(page, 'btn-seq-tip-ok'); await waitScreen(page, 'seq');
    await page.waitForTimeout(250);
    const bad = await audit(page);
    c.ok(bad.length === 0, 'editor layout: no overflow, buttons ≥ 44px ' + bad.join(' ; '));
    const geo = await page.evaluate(() => {
      const r = s => document.querySelector(s).getBoundingClientRect();
      const cell = r('[data-testid="cell-kick-0"]'), last = r('[data-testid="cell-cymbal-15"]'), foot = r('[data-testid="btn-seq-save"]');
      return { w: cell.width, h: cell.height, lastBottom: last.bottom, footTop: foot.top, scroll: document.querySelector('.seq-main').scrollHeight - document.querySelector('.seq-main').clientHeight };
    });
    c.ok(geo.w >= 60 && geo.h >= 30 && geo.lastBottom <= geo.footTop && geo.scroll <= 1, 'whole grid fits, cells ' + Math.round(geo.w) + 'x' + Math.round(geo.h) + ' (scroll ' + geo.scroll + ')');
    fs.mkdirSync(CACHE, { recursive: true });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(CACHE, shotName('seq.png')) });

    // ⋯ -> Clear, then tap, drag-paint, the kick rule, meters (+ the ± flash).
    await openTools(page); await tap(page, 'seq-clear');
    c.ok(await page.evaluate(() => GG.debug('ui').screen === 'seq' && GG.ui.get('seq').data.pat.sections.verse.every(l => l === '................')), '⋯ → Clear the verse');
    const m0 = await meters(page);
    for (const s of [0, 2, 4, 6, 8, 10, 12, 14]) await tap(page, 'cell-kick-' + s);
    await tap(page, 'cell-snare-4'); await tap(page, 'cell-snare-12');
    const m1 = await meters(page), fl = await page.evaluate(() => document.querySelector('[data-testid="meter-groove"]').dataset.delta);
    c.ok((await lane(page, 'verse', 0)) === 'x.x.x.x.x.x.x.x.' && m1[0] > m0[0], 'taps toggle cells; a busier kick raises Groove instantly ' + m0 + ' -> ' + m1);
    c.ok(/^[+-]\d+$/.test(fl || ''), 'the meter strip flashes the change: ' + fl);
    await tap(page, 'cell-kick-1');
    const tip = await page.textContent(tid('seq-tip'));
    c.ok((await lane(page, 'verse', 0))[1] === '.' && /double kick/i.test(tip), 'kick adjacency is refused kindly: ' + tip);
    const a = await page.locator(tid('cell-cymbal-4')).boundingBox(), b = await page.locator(tid('cell-cymbal-7')).boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 }); await page.mouse.up();
    c.ok((await lane(page, 'verse', 3)).slice(4, 8) === 'xxxx', 'drag paints a run of cells: ' + await lane(page, 'verse', 3));
    await tap(page, 'seq-tab-chorus');
    const beforeCopy = await lane(page, 'chorus', 3);
    await openTools(page); await tap(page, 'seq-copy-verse');
    c.ok(await lane(page, 'chorus', 3) === await lane(page, 'verse', 3) && beforeCopy !== await lane(page, 'chorus', 3), '⋯ → Copy Verse');
    const hookCopy = (await meters(page))[1];
    await tap(page, 'cell-cymbal-0'); await tap(page, 'cell-cymbal-8'); await tap(page, 'cell-hat-2'); await tap(page, 'cell-hat-10'); await tap(page, 'cell-snare-14');
    c.ok((await meters(page))[1] > hookCopy, 'a contrasting chorus raises Hook ' + hookCopy + ' -> ' + (await meters(page))[1]);
    // ⋯ → Bar 4 fill (Q2): the grid edits p.fillBars.chorus (starting from the main bar), the tab wears a badge; back to the main bar.
    const hadFill = await page.evaluate(() => !!(GG.ui.get('seq').data.pat.fillBars && GG.ui.get('seq').data.pat.fillBars.chorus));
    await openTools(page); await tap(page, 'btn-seq-fill');
    const f0 = await page.evaluate(() => { const p = GG.ui.get('seq').data.pat; return { fill: document.querySelector('[data-testid="seq-grid"]').dataset.fill, fb: JSON.stringify(p.fillBars.chorus), main: JSON.stringify(p.sections.chorus), badge: !!document.querySelector('[data-testid="seq-tab-chorus"] .seq-fb') }; });
    const sn15 = await page.evaluate(() => GG.ui.get('seq').data.pat.fillBars.chorus[1][15]);
    await tap(page, 'cell-snare-15');
    const f1 = await page.evaluate(() => { const p = GG.ui.get('seq').data.pat; return { fb: p.fillBars.chorus[1][15], main: JSON.stringify(p.sections.chorus) }; });
    c.ok(f0.fill === '1' && f0.badge && (hadFill || f0.fb === f0.main) && f1.fb !== sn15 && f1.main === f0.main, '⋯ → Bar 4 fill: the grid edits the fill bar only, the tab wears a badge ' + JSON.stringify({ fill: f0.fill, badge: f0.badge, hadFill }));
    c.ok(/Bar 4 fill/.test(await page.evaluate(() => document.querySelector('[data-testid="seq-coach"]').textContent)), 'the bubble says the grid is on the bar 4 fill');
    await openTools(page); await tap(page, 'btn-seq-fill');
    c.ok(await page.evaluate(() => document.querySelector('[data-testid="seq-grid"]').dataset.fill === '0' && !GG.debug('seq').fill), '⋯ → Back to the main bar');
    // v1.3 review (D16): a peek (Bar 4 fill, then back, nothing painted) leaves no fillBars entry behind and no badge
    await page.evaluate(() => { const D = GG.ui.get('seq').data; if (D.pat.fillBars) { delete D.pat.fillBars.verse; if (!Object.keys(D.pat.fillBars).length) delete D.pat.fillBars; } });
    await tap(page, 'seq-tab-verse');
    await openTools(page); await tap(page, 'btn-seq-fill');
    const pk0 = await page.evaluate(() => !!(GG.ui.get('seq').data.pat.fillBars && GG.ui.get('seq').data.pat.fillBars.verse) && GG.debug('seq').fill);
    await openTools(page); await tap(page, 'btn-seq-fill');
    const pk1 = await page.evaluate(() => ({ fb: !!(GG.ui.get('seq').data.pat.fillBars && GG.ui.get('seq').data.pat.fillBars.verse), badge: !!document.querySelector('[data-testid="seq-tab-verse"] .seq-fb'), chorus: !!GG.ui.get('seq').data.pat.fillBars.chorus }));
    c.ok(pk0 && !pk1.fb && !pk1.badge && pk1.chorus, 'a fill peek leaves nothing behind (the painted chorus fill stays) ' + JSON.stringify({ pk0, pk1 }));
    await tap(page, 'seq-tab-chorus');
    // ⋯ → Beat for this section (D8): the 0.6.2 grooves as a sheet, pedal ones locked.
    await openTools(page); await tap(page, 'btn-seq-beat'); await waitScreen(page, 'seq-beat');
    const bt = await page.evaluate(() => ({ all: [...document.querySelectorAll('[data-testid^="seq-beat-"]')].map(b => ({ id: b.dataset.testid.replace('seq-beat-', ''), dis: b.disabled })),
      want: GG.songs.presets(GG.state.genre, GG.state.gear).map(p => ({ id: p.id, locked: !!p.locked })) }));
    c.ok(bt.all.length === bt.want.length && bt.all.every((x, i) => x.id === bt.want[i].id && x.dis === bt.want[i].locked) && bt.all.some(x => x.dis), 'the Beat sheet lists the grooves, pedal ones locked ' + bt.all.map(x => x.id + (x.dis ? '🔒' : '')).join(' '));
    const pick = bt.all.find(x => !x.dis && x.id !== 'headbanger') || bt.all.find(x => !x.dis);
    await tap(page, 'seq-beat-' + pick.id); await waitScreen(page, 'seq');
    c.ok(await page.evaluate(id => JSON.stringify(GG.ui.get('seq').data.pat.sections.chorus) === JSON.stringify(GG.songs.applyPreset(GG.ui.get('seq').data.pat, 'chorus', id, GG.state.gear, GG.state.genre).sections.chorus), pick.id), 'a Beat card sets the chorus (' + pick.id + ')');
    await tap(page, 'cell-cymbal-0'); await tap(page, 'cell-cymbal-8');

    // Play / stop with a moving playhead.
    await tap(page, 'btn-seq-loop');
    await page.waitForFunction(() => GG.debug('audio').state === 'running' && GG.debug('audio').playing, null, { timeout: 5000 });
    await page.waitForFunction(() => GG.debug('audio').steps > 4, null, { timeout: 5000 });
    const s1 = await page.evaluate(() => GG.debug('audio').steps);
    await page.waitForTimeout(600);
    const s2 = await page.evaluate(() => ({ n: GG.debug('audio').steps, ph: GG.debug('seq').playhead, sec: GG.debug('audio').lastStep.section }));
    c.ok(s2.n > s1 && s2.ph != null && s2.sec === 'chorus', 'playhead advances on the looped section ' + s1 + ' -> ' + JSON.stringify(s2));
    // v0.6.1 metronome, v1.3 in the ⋯ menu: off by default; on (saved), the loop clicks quarter notes; off again.
    const mtr = () => page.evaluate(() => { const b = document.querySelector('[data-testid="btn-seq-metro"]');
      return { on: GG.audio.metronome(), saved: GG.save.settings().metronome, btn: b && b.dataset.on, pressed: b && b.getAttribute('aria-pressed'), clicks: GG.debug('audio').counts.clicks }; });
    await openTools(page);
    const k0 = await mtr();
    await tap(page, 'btn-seq-metro');
    const k1a = await mtr();
    await tap(page, 'btn-seq-tools-cancel');
    await page.waitForTimeout(900);
    const k1 = await mtr();
    c.ok(!k0.on && k0.btn === '0' && k1a.on && k1a.saved === true && k1a.btn === '1' && k1a.pressed === 'true' && k1.clicks > k0.clicks,
      '⋯ → metronome toggle clicks while looping ' + JSON.stringify([k0, k1a, k1.clicks]));
    await openTools(page); await tap(page, 'btn-seq-metro');
    const k2 = await mtr();
    await tap(page, 'btn-seq-tools-cancel');
    await page.waitForTimeout(300);
    const k2b = await mtr();
    await page.waitForTimeout(600);
    const k3 = await mtr();
    c.ok(!k2.on && k2.saved === false && k2.btn === '0' && k3.clicks === k2b.clicks, 'metronome off: saved, silent ' + JSON.stringify([k2b.clicks, k3.clicks]));
    await tap(page, 'seq-tab-song');
    await page.fill(tid('seq-title-input'), 'Mon Gazon Test');
    await page.locator(tid('seq-tempo')).fill('170');
    await tap(page, 'seq-arr-short');
    const songTab = await page.evaluate(() => ({ p: GG.ui.get('seq').data.pat, t: GG.debug('seq').title }));
    c.ok(songTab.p.bpm === 170 && songTab.p.arrangement.join() === 'verse,chorus,verse,chorus' && songTab.t === 'Mon Gazon Test', 'song tab: title, tempo, arrangement');
    await tap(page, 'btn-seq-loop');
    await page.waitForFunction(() => !GG.debug('audio').playing, null, { timeout: 3000 });
    c.ok(true, 'stop');
    // Save: the saved pattern is sanitize(D.pat), byte for byte.
    const saved = await page.evaluate(() => JSON.stringify(GG.songs.sanitize(GG.ui.get('seq').data.pat, GG.state.gear, GG.state.genre)));
    await page.evaluate(() => { const e = GG.ui.get('seq'), f = e.data.onSave; e.data.onSave = x => { window.__saved = JSON.stringify(x); f(x); }; });
    await tap(page, 'btn-seq-save');
    await waitScreen(page, 'results');
    await tap(page, 'btn-results-skip');
    const res = await page.evaluate(() => ({ song: !!document.querySelector('[data-testid="result-song"]'), text: document.querySelector('[data-testid="result-song"]').textContent,
      reacts: document.querySelectorAll('[data-testid^="song-react-"]').length, last: GG.state.songs[GG.state.songs.length - 1], pending: GG.state.pendingSongs.length, entry: window.__saved }));
    const ent = JSON.parse(res.entry); delete ent.title; delete ent.titleEn; delete ent.fr;
    c.ok(JSON.stringify(ent) === saved, 'Save hands over sanitize(D.pat), byte for byte');
    c.ok(res.song && /Mon Gazon Test/.test(res.text) && res.reacts >= 1, 'results show the new song + ' + res.reacts + ' reactions');
    c.ok(res.last.title === 'Mon Gazon Test' && !res.last.auto && JSON.stringify(res.last.pattern) === saved && res.pending === 0 && res.last.pattern.recipe, 'the saved pattern became the song (with its Quick-song recipe)');
    await page.evaluate(() => { GG.ui.gigAutoplay = true; });   // v0.3: week 1's gig is played live; the bot plays it
    await tap(page, 'btn-results-ok');
    await page.waitForFunction(() => ['wrap', 'gig-results'].includes(GG.debug('ui').screen), null, { timeout: 15000 });
    if (await screen(page) === 'gig-results') await tap(page, 'btn-gig-done');
    await waitScreen(page, 'wrap'); await tap(page, 'btn-next-week');
    await page.waitForFunction(() => GG.state.totalWeek === 2);
    if (await screen(page) === 'card') { await tap(page, 'choice-0'); await tap(page, 'btn-card-ok'); }
    await page.waitForFunction(() => GG.debug('ui').stack.length === 0);

    // Laptop catalog -> the editor, read-only (⋯ = the metronome only).
    await page.evaluate(() => GG.emit('hotspot', { action: 'laptop' }));
    await waitScreen(page, 'laptop'); await tap(page, 'laptop-tab-band');
    const id = res.last.id;
    c.ok(await page.locator(tid('song-' + id)).count() === 1, 'catalog lists the new song');
    await tap(page, 'song-' + id);
    await waitScreen(page, 'seq');
    const view = await page.evaluate(() => ({ dbg: GG.debug('seq'), pat: JSON.stringify(GG.ui.get('seq').data.pat), save: !!document.querySelector('[data-testid="btn-seq-save"]') }));
    c.ok(view.dbg.mode === 'view' && view.dbg.screen === 'edit' && view.pat === saved && !view.save, 'catalog opens the song read-only in the editor with its pattern');
    await tap(page, 'cell-snare-0');
    c.ok((await lane(page, 'verse', 1))[0] === JSON.parse(saved).sections.verse[1][0], 'read-only grid ignores taps');
    await openTools(page);
    const vm = await page.evaluate(() => [...document.querySelectorAll('[data-screen="seq-tools"] button[data-testid]')].map(b => b.dataset.testid).filter(t => t !== 'btn-seq-tools-cancel'));
    c.ok(vm.join() === 'btn-seq-metro', 'view mode: ⋯ holds the metronome only ' + vm.join());
    await tap(page, 'btn-seq-tools-cancel');
    c.ok(await page.evaluate(() => JSON.stringify(GG.ui.get('seq').data.pat)) === saved, 'view never writes');
    await tap(page, 'btn-seq-close'); await waitScreen(page, 'laptop'); await tap(page, 'btn-close');

    // Kit hotspot: no draft -> Quick song (D10); a slider move is the draft; Use -> queued for the next Write block.
    await page.evaluate(() => GG.emit('hotspot', { action: 'kit' }));
    await waitScreen(page, 'seq');
    const sk = await page.evaluate(() => ({ dbg: GG.debug('seq'), use: !!document.querySelector('[data-testid="btn-seq-use"]'), draft: GG.state.draft }));
    c.ok(sk.dbg.mode === 'sketch' && sk.dbg.screen === 'quick' && sk.use && !sk.draft, 'kit opens the sketch pad on Quick song (no draft yet)');
    await slide(page, 'energy', 4);
    c.ok(await page.evaluate(() => GG.state.draft && GG.state.draft.recipe && GG.state.draft.recipe.energy === 4), 'a slider move is the sketch (state.draft)');
    await tap(page, 'btn-seq-use');
    await page.waitForFunction(() => GG.debug('ui').stack.length === 0);
    const q = await page.evaluate(() => ({ n: GG.state.pendingSongs.length, draft: GG.state.draft, title: GG.state.pendingSongs[0] && GG.state.pendingSongs[0].title }));
    c.ok(q.n === 1 && q.draft === null && q.title, 'sketch queued for the next Write block');
    await tap(page, 'btn-primary'); await waitScreen(page, 'plan');
    for (const i of [0, 1, 2]) await tap(page, 'plan-slot-' + i);   // last week's plan is kept: clear it
    for (const x of ['write', 'hustle', 'write']) await tap(page, 'act-' + x);
    await tap(page, 'btn-go'); await waitScreen(page, 'seq');
    const w1 = await page.evaluate(() => ({ sub: document.querySelector('[data-testid="seq-title"]').textContent, dbg: GG.debug('seq') }));
    c.ok(/1 of 2/.test(w1.sub) && /sketch/i.test(w1.sub) && w1.dbg.title === q.title && w1.dbg.screen === 'edit', 'Write block 1 of 2 opens the queued sketch in the editor');
    await tap(page, 'btn-seq-save');
    await page.waitForFunction(() => /2 of 2/.test(document.querySelector('[data-testid="seq-title"]').textContent));
    c.ok(await page.evaluate(() => GG.debug('seq').screen) === 'quick', 'block 2 is a fresh block: Quick song');
    await openTools(page); await tap(page, 'btn-seq-jam');
    await waitScreen(page, 'results');
    const two = await page.evaluate(() => GG.state.songs.slice(-2).map(s => ({ t: s.title, auto: s.auto })));
    c.ok(two[0].t === q.title && !two[0].auto && two[1].auto, 'block 1 = your sketch, block 2 = band jam (⋯ → Let the band jam one): ' + JSON.stringify(two));
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
  // D16: the 1.2 fixture careers' draft and a queued song, opened and saved untouched, are their SAN fixture (1.2 JSON).
  const c2 = checker('seq-compat');
  const o2 = await open();
  try {
    const FX = require('../tools/make_fixtures_v12'), fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'v12_songs.json'), 'utf8')), careers = FX.careerStrings();
    await o2.page.waitForSelector(tid('btn-new'));
    for (const seat of FX.SEATS) {
      const want = fixture.save['v12_' + seat];
      const got = await o2.page.evaluate(async raw => {
        GG.ui.closeAll();
        localStorage.setItem(GG.save.KEYS.slot('3'), raw); GG.main.load('3'); GG.ui.closeAll();
        const s = GG.state, draft = JSON.parse(JSON.stringify(s.draft)), p0 = JSON.parse(JSON.stringify(s.pendingSongs[0]));
        GG.ui.openSketch();
        const sk = GG.debug('seq'), chips = document.querySelectorAll('[data-testid^="chord-chip-"]').length, grid = document.querySelector('[data-testid="part-grid"]');
        document.querySelector('[data-testid="btn-seq-use"]').click();
        const used = s.pendingSongs[s.pendingSongs.length - 1];
        GG.ui.composeWeek(1, () => {});
        const D = GG.ui.get('seq').data, w = { screen: D.screen, fromSketch: D.fromSketch }; let saved = null; const f = D.onSave; D.onSave = x => { saved = JSON.parse(JSON.stringify(x)); f(x); };
        document.querySelector('[data-testid="btn-seq-save"]').click();
        GG.ui.closeAll();
        return { sk: { mode: sk.mode, screen: sk.screen, chips, gridV: grid ? grid.dataset.v : null }, used, draft, w, saved, p0 };
      }, careers[seat]);
      const entry = Object.assign({}, got.used); delete entry.title; delete entry.titleEn; delete entry.fr;
      if (got.draft && got.draft.title != null) { entry.title = got.draft.title; entry.titleEn = got.draft.titleEn || got.draft.title; if (got.used.fr && got.draft.title === got.used.title) entry.fr = true; }
      c2.ok(got.sk.mode === 'sketch' && got.sk.screen === 'edit', seat + ': a draft opens the sketch pad in the editor (D10) ' + JSON.stringify(got.sk));
      c2.ok(H16(entry) === want.draftSan, seat + ': the draft opened + used untouched = its 1.2 open-and-save SAN ' + H16(entry) + ' / ' + want.draftSan);
      c2.ok(got.w.screen === 'edit' && got.w.fromSketch && H16(got.saved) === want.pendingSan[0], seat + ': a queued 1.2 song opened + saved untouched = its SAN ' + H16(got.saved) + ' / ' + want.pendingSan[0]);
      c2.ok(!['chords', 'mood', 'swing', 'recipe', 'fillBars'].some(k => k in got.saved) && !(got.saved.part && got.saved.part.v), seat + ': no v1.3 key appears (' + Object.keys(got.saved).join(',') + ')');
    }
    c2.ok(o2.errors.length === 0, 'no console errors ' + o2.errors.slice(0, 3).join(' | '));
  } catch (e) { c2.ok(false, 'seq-compat threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await o2.close();
  c2.done();
  c.done();
}

// Quick song (U1; replaces the 0.6.2 guided section): recipes, the lock, sliders, Surprise twice = same, Play, Tweak, Save, the Q3
// ask-first flow, two song slots -> two songs.
async function quick() {
  const c = checker('quick');
  const { page, errors, close } = await open();
  const ev = (f, a) => page.evaluate(f, a);
  try {
    await bootPlan(page, { seed: 777 }, ['write', 'write', 'rest']);
    const R = await ev(() => GG.songs.recipes(GG.state.genre, GG.state.gear, 'drums'));
    const SL = await ev(() => GG.songs.sliders(GG.state.genre, 'drums'));
    const cards = await ev(() => [...document.querySelectorAll('[data-testid^="quick-recipe-"]')].map(b => ({ id: b.dataset.testid, pressed: b.getAttribute('aria-pressed'), locked: b.dataset.locked })));
    c.ok(cards.length === 6 && cards.map(x => x.id.replace('quick-recipe-', '')).join() === R.map(r => r.id).join(), 'the cards are songs.recipes (5 + Surprise) ' + cards.map(x => x.id).join());
    c.ok(cards[0].pressed === 'true' && cards.filter(x => x.pressed === 'true').length === 1, 'the signature recipe is picked');
    const gal = cards.find(x => x.id === 'quick-recipe-gallop');
    c.ok(gal && gal.locked === '1' && R.find(r => r.id === 'gallop').locked, 'the pedal recipe is locked without a double kick');
    const p0 = await patJSON(page);
    await tap(page, 'quick-recipe-gallop');
    const toast = await ev(() => [...document.querySelectorAll('#toast .toast')].map(t => t.textContent).join(' | '));
    c.ok(await patJSON(page) === p0 && toast.indexOf(R.find(r => r.id === 'gallop').lockLabel) >= 0, 'a locked tap is a toast with the pedal name: ' + toast);
    // Surprise me twice = the same song (same slot, same taps): tap, ✕ back to the planner, Go again, tap.
    await tap(page, 'quick-recipe-surprise');
    const sA = await ev(() => ({ p: JSON.stringify(GG.ui.get('seq').data.pat), dbg: GG.debug('seq'), seed: GG.ui.get('seq').data.qs.seed }));
    const sWant = await ev(seed => { const z = GG.songs.surprise(GG.state.genre, GG.state.gear, 'drums', GG.hashSeed(seed + '|surprise|1'));
      return Object.assign({ p: JSON.stringify(GG.songs.compose(GG.state.genre, Object.assign({}, z, { seed: seed, gear: GG.state.gear, seat: 'drums' }))) }, z); }, sA.seed);
    c.ok(sA.p === sWant.p && sA.dbg.recipe.id === sWant.recipe && sA.dbg.sliders.energy === sWant.energy && sA.dbg.sliders.bpm === sWant.bpm, 'Surprise me = songs.surprise(seed|surprise|1) composed ' + JSON.stringify(sA.dbg.sliders));
    await tap(page, 'btn-seq-close');
    await page.waitForFunction(() => GG.debug('ui').screen !== 'seq');
    if (await screen(page) !== 'plan') { await tap(page, 'btn-primary'); await waitScreen(page, 'plan'); }
    await tap(page, 'btn-go'); await waitScreen(page, 'seq');
    c.ok(await patJSON(page) === p0, 'a reopened block starts from the same signature song');
    await tap(page, 'quick-recipe-surprise');
    c.ok(await patJSON(page) === sA.p, 'Surprise me twice (same slot) = the same song');
    await tap(page, 'quick-recipe-surprise');
    c.ok(await patJSON(page) !== sA.p, 'a second roll is another song');
    // A card -> that recipe's default sliders.
    await tap(page, 'quick-recipe-doom-crawl');
    const dc = await ev(() => ({ dbg: GG.debug('seq'), pressed: document.querySelector('[data-testid="quick-recipe-doom-crawl"]').getAttribute('aria-pressed') }));
    const dR = R.find(r => r.id === 'doom-crawl');
    c.ok(dc.dbg.recipe.id === 'doom-crawl' && dc.pressed === 'true' && dc.dbg.sliders.bpm === dR.bpm && dc.dbg.sliders.mood === dR.sliders.mood && dc.dbg.sliders.energy === dR.sliders.energy, 'a card picks the recipe at its defaults ' + JSON.stringify(dc.dbg.sliders));
    const base = await patJSON(page), secs = JSON.stringify(JSON.parse(base).sections);
    // Energy: recomposes; the label is the genre's stop; back = the same song (round trip).
    await slide(page, 'energy', 4);
    const e4 = await ev(() => ({ dbg: GG.debug('seq'), val: document.querySelector('[data-testid="quick-energy-val"]').textContent, p: JSON.stringify(GG.ui.get('seq').data.pat) }));
    c.ok(e4.dbg.recipe.energy === 4 && e4.val === SL[0].stops[4] && e4.p !== base, 'Energy recomposes, its label reads "' + e4.val + '"');
    await slide(page, 'energy', dR.sliders.energy);
    c.ok(await patJSON(page) === base, 'Energy moved and moved back = the same song');
    // Feel + Tempo never rewrite the notes.
    await slide(page, 'feel', 3);
    const f3 = await ev(() => ({ p: GG.ui.get('seq').data.pat, val: document.querySelector('[data-testid="quick-feel-val"]').textContent }));
    c.ok(f3.p.swing === 3 && JSON.stringify(f3.p.sections) === secs && f3.val === SL[2].stops[3], 'Feel sets the swing, never the notes: ' + f3.val);
    await slide(page, 'tempo', 90);
    const t1 = await ev(() => ({ p: GG.ui.get('seq').data.pat, val: document.querySelector('[data-testid="quick-tempo-val"]').textContent, lab: GG.songs.tempoLabel(GG.state.genre, 90) }));
    c.ok(t1.p.bpm === 90 && JSON.stringify(t1.p.sections) === secs && t1.val === '90 bpm · ' + t1.lab, 'Tempo sets the bpm, never the notes: ' + t1.val);
    await slide(page, 'feel', dR.sliders.swing); await slide(page, 'tempo', dR.bpm);
    c.ok(await patJSON(page) === base, 'Feel + Tempo back = the same song');
    await slide(page, 'mood', 0);
    const md = await ev(() => GG.ui.get('seq').data.pat);
    c.ok(md.mood === 0 && JSON.stringify(md.chords) !== JSON.stringify(JSON.parse(base).chords), 'Mood recomposes the chords (mood ' + md.mood + ')');
    // Play, then a slider while it plays: the loop keeps going with the new song.
    await tap(page, 'btn-guide-play');
    await page.waitForFunction(() => GG.debug('seq').playing === 'quick' && GG.debug('audio').playing, null, { timeout: 5000 });
    await slide(page, 'energy', 3);
    await page.waitForTimeout(300);
    c.ok(await ev(() => GG.debug('audio').playing && GG.debug('seq').playing === 'quick'), '▶ Play loops the song; a slider move keeps it playing');
    await tap(page, 'btn-guide-play');
    c.ok(await ev(() => !GG.debug('seq').playing), 'tap again to stop');
    // Q3: after a hand edit a recipe / Energy / Mood / Fills change asks first; Feel + Tempo never ask.
    await tap(page, 'btn-quick-tweak');
    await tap(page, 'cell-snare-2');
    const edited = await patJSON(page);
    await openTools(page); await tap(page, 'btn-seq-quick');
    c.ok(await ev(() => GG.debug('seq').screen === 'quick' && GG.debug('seq').edited), '⋯ → Back to Quick song, edited');
    await slide(page, 'energy', 1);
    await page.waitForFunction(() => GG.debug('ui').screen === 'confirm', null, { timeout: 3000 });
    const ask = await ev(() => document.querySelector('[data-screen="confirm"]').textContent);
    c.ok(/Start over/.test(ask) && /Keep my edits/.test(ask) && /hand edits/.test(ask), 'Energy after a hand edit asks: ' + ask.replace(/\s+/g, ' '));
    await tap(page, 'btn-confirm-no');
    const kept = await ev(() => ({ p: JSON.stringify(GG.ui.get('seq').data.pat), v: +document.querySelector('[data-testid="quick-energy"]').value, e: GG.debug('seq').sliders.energy }));
    c.ok(kept.p === edited && kept.v === kept.e && kept.v !== 1, 'Keep my edits: the song and the slider stay ' + kept.v);
    await slide(page, 'feel', 2);
    c.ok(await screen(page) === 'seq' && await ev(() => GG.ui.get('seq').data.pat.swing === 2 && GG.ui.get('seq').data.pat.sections.verse[1][2] === 'x'), 'Feel never asks and keeps the edit');
    await slide(page, 'energy', 1);
    await page.waitForFunction(() => GG.debug('ui').screen === 'confirm', null, { timeout: 3000 });
    await tap(page, 'btn-confirm-yes');
    const so = await ev(() => { const D = GG.ui.get('seq').data, q = D.qs;
      return { dbg: GG.debug('seq'), same: JSON.stringify(D.pat) === JSON.stringify(GG.songs.compose(GG.state.genre, { recipe: q.recipe, energy: q.energy, mood: q.mood, swing: q.swing, fills: q.fills, bpm: q.bpm, seed: q.seed, gear: GG.state.gear, seat: 'drums' })) }; });
    c.ok(so.same && !so.dbg.edited && so.dbg.sliders.energy === 1, 'Start over: the recipe at the new sliders, no longer edited');
    c.ok((await audit(page)).length === 0, 'Quick song layout ' + (await audit(page)).join(' ; '));
    // Save -> block 2: another song slot, another song (D14), Save again.
    const s1 = await ev(() => JSON.stringify(GG.songs.sanitize(GG.ui.get('seq').data.pat, GG.state.gear, GG.state.genre)));
    await tap(page, 'btn-seq-save');
    await page.waitForFunction(() => /2 of 2/.test(document.querySelector('[data-testid="seq-title"]').textContent));
    const b2 = await ev(() => ({ dbg: GG.debug('seq'), p: GG.ui.get('seq').data.pat }));
    c.ok(b2.dbg.screen === 'quick' && b2.dbg.recipe.id === R[0].id && b2.dbg.recipe.seed !== JSON.parse(s1).recipe.seed, 'block 2: Quick song again, a new seed ' + b2.dbg.recipe.seed);
    await tap(page, 'btn-seq-save');
    await waitScreen(page, 'results');
    const two = await ev(() => GG.state.songs.slice(-2).map(s => s.pattern));
    c.ok(JSON.stringify(two[0]) === s1 && two[1].recipe && JSON.stringify(two[0].sections) !== JSON.stringify(two[1].sections), 'two Write blocks, two different songs');
    c.ok(errors.length === 0, 'no console errors ' + errors.join(' | '));
  } catch (e) { c.ok(false, 'quick threw: ' + (e.stack || e)); }
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

// v1.2 "Soundcheck" Lane V (handoff F10, contract §5 Lane V): the human vocals. Until Lane F's player() hands out vel, the
// section adds vel 0.85 (= the 1.1 level) to every vox / bvox event by wrapping GG.audio.timeline in the page (renderOffline
// and play() both read it), so the Soundcheck path sings; without vel (or with Classic on) the 1.1 hit plays. Logs the
// before / after numbers per genre (vocals alone: RMS, 2-4 kHz band, width, peak; full chorus: voice / band ratio by the
// voxInvert split), checks: clean renders, Classic on + vel = the 1.1 render, no vel = the 1.1 render, doubles and gangs
// sound (debug('vox') on a live song), the plate (a stub GG.dsp.impulse2 until Lane I's lands) and the no-plate fallback,
// vel changes the level, no console errors.
async function vox() {
  const c = checker('vox');
  const { page, errors, close } = await open();
  try {
    await page.waitForSelector(tid('btn-new'));
    await page.evaluate(pageHelpers);
    const res = await page.evaluate(async () => {
      const A = GG.audio, T0 = A.timeline, out = { genres: {}, metal: {}, checks: {} };
      const velOn = v => { A.timeline = function (p, o) { const t = T0.call(A, p, o); return Object.assign({}, t, { events: t.events.map(e => (e.kind === 'vox' || e.kind === 'bvox') ? Object.assign({}, e, { vel: v }) : e) }); }; };
      const velOff = () => { A.timeline = T0; };
      const m = (b) => {   // RMS / peak dBFS, the 2-4 kHz band (dB, the __bands method), width (side / mid)
        const sr = b.sampleRate, N = 8192, n = b.length, L = b.getChannelData(0), R = b.getChannelData(1), mono = new Float32Array(n);
        let ms = 0, pk = 0, side = 0, mid = 0;
        for (let i = 0; i < n; i++) { mono[i] = (L[i] + R[i]) / 2; ms += mono[i] * mono[i]; pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); side += (L[i] - R[i]) ** 2; mid += (L[i] + R[i]) ** 2; }
        ms /= n;
        const w = new Float64Array(N); for (let i = 0; i < N; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
        let tot = 0, b24 = 0, hi = 0;
        for (let s = 0; s + N <= n; s += N / 2) {
          const re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < N; i++) re[i] = mono[s + i] * w[i];
          // (radix-2 FFT, as pageHelpers)
          for (let i = 1, j = 0; i < N; i++) { let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
          for (let len = 2; len <= N; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < N; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const p = i + k, q = p + len / 2, br = re[q] * cr - im[q] * ci, bi = re[q] * ci + im[q] * cr; re[q] = re[p] - br; im[q] = im[p] - bi; re[p] += br; im[p] += bi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
          for (let k = 1; k < N / 2; k++) { const f = k * sr / N, p = re[k] * re[k] + im[k] * im[k]; tot += p; if (f >= 2000 && f < 4000) b24 += p; if (f >= 4000) hi += p; }
        }
        const db = x => +(10 * Math.log10(x + 1e-12)).toFixed(1);
        return { rms: db(ms), peak: db(pk * pk), b24: db(ms * b24 / tot), hi: db(ms * hi / tot), width: mid ? +(side / mid).toFixed(3) : 0, nan: Number.isNaN(ms) };
      };
      const split = async spec => {   // voice / band (dB) by the polarity-inverted render
        const a = (await A.renderOffline(spec)).buffer, b = (await A.renderOffline(Object.assign({ voxInvert: true }, spec))).buffer;
        let v = 0, bd = 0; for (let ch = 0; ch < 2; ch++) { const x = a.getChannelData(ch), y = b.getChannelData(ch); for (let i = 0; i < x.length; i++) { v += ((x[i] - y[i]) / 2) ** 2; bd += ((x[i] + y[i]) / 2) ** 2; } }
        return +(10 * Math.log10(v / bd)).toFixed(1);
      };
      const maxDiff = (a, b) => { let d = 0; for (let ch = 0; ch < 2; ch++) { const x = a.getChannelData(ch), y = b.getChannelData(ch); for (let i = 0; i < x.length; i++) d = Math.max(d, Math.abs(x[i] - y[i])); } return d; };
      const SING = { metal: 'marcel', punk: 'rox', rock: 'chase', country: 'travis' };
      // (feel: false: Lane F's offline feel plan would replace the vel set here; no effect before Lane F lands)
      const spec = (g, o) => Object.assign({ genre: g, pattern: GG.songs.signature(g), section: 'chorus', bars: 4, songId: 'vx1', singer: SING[g], feel: false }, o);
      // 1) before (1.1 path) / after (Soundcheck, vel 0.85), no plate (impulse2('plate') answers null: buildVox skips the plate)
      const realImp = GG.dsp.impulse2, bufs = {};
      // pass 1 without a plate (Lane I's impulse2 or not; its rooms keep theirs), pass 2 with it (or a stand-in)
      if (realImp) GG.dsp.impulse2 = function (cls) { return cls === 'plate' ? null : realImp.apply(this, arguments); }; else delete GG.dsp.impulse2;
      out.plateSrc = realImp ? 'GG.dsp.impulse2' : 'stand-in';
      for (const g of GG.contracts.GENRES) {
        velOff();
        const b0 = await A.renderOffline(spec(g, { vocalsOnly: true })), va0 = await split(spec(g, {}));
        velOn(0.85);
        const b1 = await A.renderOffline(spec(g, { vocalsOnly: true })), va1 = await split(spec(g, {}));
        velOff();
        out.genres[g] = { before: Object.assign(m(b0.buffer), { va: va0 }), after: Object.assign(m(b1.buffer), { va: va1 }) }; bufs[g] = b1.buffer;
      }
      // 2) the plate: a stand-in impulse2 (decaying stereo noise, 1.2 s) exercises the plate path until Lane I's impulse2 lands
      GG.dsp.impulse2 = realImp || ((cls, sr, seed) => { const n = Math.floor(1.2 * sr), L = new Float32Array(n), R = new Float32Array(n); let s = seed || 1; for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; L[i] = (s / 1073741823.5 - 1) * Math.exp(-5 * i / n); s = (s * 16807) % 2147483647; R[i] = (s / 1073741823.5 - 1) * Math.exp(-5 * i / n); } return [L, R]; });
      for (const g of GG.contracts.GENRES) {
        velOn(0.85);
        const b2 = await A.renderOffline(spec(g, { vocalsOnly: true }));
        velOff();
        out.genres[g].plate = Object.assign(m(b2.buffer), { diff: +maxDiff(b2.buffer, bufs[g]).toFixed(4) });
      }
      // 3) Classic on: vel is ignored (= Classic on without vel, the 1.1 render the hash fixture pins); Classic off without vel:
      //    Lane V adds nothing (the chain idle on the bus = a rig built without it); without Lane I's rooms that is the 1.1 render
      const ref = (await A.renderOffline(spec('rock', { vocalsOnly: true }))).buffer, BV = A._buildVox;
      A._buildVox = null;
      const noChain = (await A.renderOffline(spec('rock', { vocalsOnly: true }))).buffer;
      A._buildVox = BV; A.classic(true);
      const cl11 = (await A.renderOffline(spec('rock', { vocalsOnly: true }))).buffer;
      velOn(0.85);
      const cl = (await A.renderOffline(spec('rock', { vocalsOnly: true }))).buffer;
      velOff(); A.classic(false);
      out.checks.classicVel = maxDiff(cl11, cl); out.checks.noVel = maxDiff(ref, noChain); out.checks.noVel11 = maxDiff(ref, cl11);
      // 4) vel moves the level: 0.6 vs 0.85 vs 1.0 (vocals alone, punk)
      const lv = {};
      for (const v of [0.6, 0.85, 1]) { velOn(v); lv[v] = await split(spec('rock', {})); velOff(); }
      out.checks.vel = lv;
      // 5) metal: a whole song (held screams double, gangs grow to 3) + Gord's growls
      velOn(0.85);
      const ms = await A.renderOffline({ genre: 'metal', pattern: GG.songs.signature('metal'), full: true, bars: 24, songId: 'set1', singer: 'marcel', vocalsOnly: true });
      const mg = await A.renderOffline({ genre: 'metal', pattern: GG.songs.signature('metal'), full: true, bars: 24, songId: 'set1', singer: 'tw_gord' });
      velOff();
      out.metal = { set: m(ms.buffer), gord: m(mg.buffer) };
      // 6) live: a rock chorus + a punk song through play(): the chain on the live rig (made at unlock, with the plate impulse
      //    of pass 2), doubles / gangs / plate counted
      A.unlock(); await new Promise(r => setTimeout(r, 200));
      velOn(0.85);
      const live = {};
      for (const g of ['rock', 'punk']) {
        const h = A.play(GG.songs.signature(g), { genre: g, section: 'chorus', loop: true, songId: 'vx2' });
        await new Promise(r => setTimeout(r, 3500));
        live[g] = Object.assign({ playing: !!(h && h.playing) }, GG.debug('vox'));
        A.stop();
      }
      velOff();
      out.live = live;
      if (realImp) GG.dsp.impulse2 = realImp; else delete GG.dsp.impulse2;
      return out;
    });
    console.log('v1.2 vox numbers (before = 1.1 path, after = Soundcheck vel 0.85, no plate; plate = with ' + res.plateSrc + ') ' + JSON.stringify(res));
    const G = Object.entries(res.genres);
    for (const [g, x] of G) console.log('vox ' + g.padEnd(8) + ' rms ' + x.before.rms + ' -> ' + x.after.rms + ' (plate ' + x.plate.rms + ') | 2-4k ' + x.before.b24 + ' -> ' + x.after.b24 + ' | 4k+ ' + x.before.hi + ' -> ' + x.after.hi +
      ' | width ' + x.before.width + ' -> ' + x.after.width + ' (plate ' + x.plate.width + ') | peak ' + x.before.peak + ' -> ' + x.after.peak + ' | V/A ' + x.before.va + ' -> ' + x.after.va + ' dB');
    c.ok(G.every(([, x]) => ['before', 'after', 'plate'].every(k => !x[k].nan && x[k].peak < 0 && x[k].rms > -60)), 'every vocal render clean, never clipping ' + G.map(([g, x]) => g + ' ' + x.after.peak + '/' + x.plate.peak).join(', '));
    c.ok(G.every(([, x]) => Math.abs(x.after.rms - x.before.rms) <= 2), 'vocal level within 2 dB of 1.1 at vel 0.85 ' + G.map(([g, x]) => g + ' ' + (x.after.rms - x.before.rms).toFixed(1)).join(', '));
    c.ok(G.every(([, x]) => Math.abs(x.after.va - x.before.va) <= 2.5), 'voice / band ratio within 2.5 dB of 1.1 ' + G.map(([g, x]) => g + ' ' + x.before.va + '->' + x.after.va).join(', '));
    c.ok(G.every(([, x]) => x.after.b24 - x.after.rms >= x.before.b24 - x.before.rms - 3), 'the 2-4 kHz presence holds (share within 3 dB or up) ' + G.map(([g, x]) => g + ' ' + (x.before.b24 - x.before.rms).toFixed(1) + '->' + (x.after.b24 - x.after.rms).toFixed(1)).join(', '));
    c.ok(G.every(([, x]) => x.plate.diff > 0.003 && Math.abs(x.plate.rms - x.after.rms) < 1.5), 'the plate sings (renders differ, level kept) ' + G.map(([g, x]) => g + ' ' + x.plate.diff + ' / ' + (x.plate.rms - x.after.rms).toFixed(1) + ' dB').join(', '));
    c.ok(res.checks.classicVel < 1e-4, 'Classic on: vel is ignored, the 1.1 render (max diff ' + res.checks.classicVel + ')');
    c.ok(res.checks.noVel < 1e-4, 'no vel: the vocal chain adds nothing (= a rig without it, max diff ' + res.checks.noVel + ')');
    c.ok(res.plateSrc !== 'stand-in' || res.checks.noVel11 < 1e-4, 'no vel, no Lane I rooms: the 1.1 render (max diff ' + res.checks.noVel11 + (res.plateSrc !== 'stand-in' ? ', Lane I rooms in: logged only' : '') + ')');
    c.ok(res.checks.vel[0.6] < res.checks.vel[0.85] - 1.5 && res.checks.vel[1] > res.checks.vel[0.85], 'vel sets the voice against the band (rock chorus, V/A dB by vel) ' + JSON.stringify(res.checks.vel));
    c.ok(!res.metal.set.nan && res.metal.set.peak < 0 && !res.metal.gord.nan && res.metal.gord.peak < 0, 'a metal set (Marcel) + a full song (Gord) clean ' + JSON.stringify(res.metal));
    const L = res.live;
    c.ok(L.rock.playing && L.rock.chain && L.rock.hits > 0 && L.rock.doubles > 0 && L.rock.genre === 'rock', 'live rock chorus: the chain sings, chorus doubles ' + JSON.stringify(L.rock));
    c.ok(L.punk.gang3 > 0, 'live punk chorus: gang hits grow to 3 voices ' + L.punk.gang3);
    c.ok(!L.rock.carveNodes || L.rock.carve > 0, 'live rock: lead hits carve the amps\' presence when Lane I\'s r.carve is there (nodes ' + (L.rock.carveNodes || 0) + ', carves ' + L.rock.carve + ')');
    c.ok(L.rock.delay > 0.2 && L.rock.delay < 1.5, 'rock: the tempo delay is set (dotted 1/8) ' + L.rock.delay);
    c.ok(L.rock.plate === 'plate' || L.rock.plate === 'room', 'live: the plate is built (room = the slow-phone fallback) ' + L.rock.plate);
    c.ok(L.punk.playing && L.punk.hits > L.rock.hits && L.punk.delay === L.rock.delay, 'live punk: sings, no delay change (punk has none) ' + JSON.stringify(L.punk));
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'vox threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  finally { await close(); }
  c.done();
}

(async () => {
  if (want('genres')) await genres();
  if (want('voices')) await voices();
  if (want('seq')) await seq();
  if (want('seq') || want('quick') || want('guided')) await quick();
  if (want('audio')) await audio();
  if (want('heavy')) await heavy();
  if (want('part')) await part();
  if (want('layout')) await layout();
  if (want('hash')) await hash();
  if (want('kit')) await kit();
  if (want('real')) await real();
  if (want('vox')) await vox();
})();

// v1.1 "Seats" (plan_contract_1.1 §4.4): the string-seat songwriter. A bass Write (Hail Damage): guided step 1 = Kenji's
// suggested groove (the signature, per section) + "Tell Kenji what to play" (today's drum grid, unchanged) -> "Your part"
// per section: a progression card, the 3-row grid (root / fifth / octave), one-tap tweaks with their meter change, Play
// plays your part (GG.audio.play { seat, part }) -> tempo -> order -> name -> Save: the song lands with exactly that part.
// Advanced: the "Your part | Drums" switch. A lead sketch pad: the 5-row hook grid + "Guitar shop". Layout audit on every
// screen; no console errors.
// Your part (string seats, U2 + U4): 6 / 6 / 7 rows, the chips, the chord sheet, the picker, the tweaks in ⋯, upgrade on first
// edit only, view read-only; a pick on a composed song moves the roots and names the picked progression; on an old song it
// writes part.prog only.
async function part() {
  const c = checker('part');
  const { page, errors, close } = await open();
  const ev = (f, a) => page.evaluate(f, a);
  const partOf = () => ev(() => GG.ui.get('seq').data.pat.part);
  const roots = () => ev(() => { const D = GG.ui.get('seq').data, tl = GG.audio.timeline(D.pat, { genre: GG.state.genre, seat: D.pat.part.seat, part: D.pat.part });
    return JSON.stringify(tl.events.filter(e => e.section === 'verse' && /bass/.test(e.kind || '')).slice(0, 24).map(e => e.midi)); });
  try {
    await page.waitForSelector(tid('btn-new'));
    await ev(() => {
      GG.main.quickStart({ seed: 4242, bandId: 'hail_damage', seat: 'bass' });
      const A = GG.audio, p0 = A.play; window.__play = [];
      A.play = function (pat, o) { window.__play.push({ seat: o && o.seat, part: !!(o && o.part) }); return p0.apply(this, arguments); };
    });
    await page.waitForFunction(() => GG.state && (GG.state.phase === 'plan' || GG.debug('ui').screen === 'card'));
    if (await screen(page) === 'card') { await tap(page, 'choice-0'); await tap(page, 'btn-card-ok'); }
    await page.waitForFunction(() => GG.state.phase === 'plan' && GG.debug('ui').stack.length === 0);
    await tap(page, 'btn-primary'); await waitScreen(page, 'plan');
    for (const a of ['write', 'rehearse', 'rest']) await tap(page, 'act-' + a);
    await tap(page, 'btn-go'); await waitScreen(page, 'seq');
    const q0 = await dbgSeq(page);
    c.ok(q0.seat === 'bass' && q0.screen === 'quick' && q0.part && q0.part.v === 2 && Object.keys(q0.part.sections).every(n => q0.part.sections[n].rows.length === 6), 'a bass Write: Quick song with a v2 bass part (6 rows)');
    await tap(page, 'btn-quick-tweak');
    const e0 = await ev(() => { const q = s => document.querySelector(s), g = q('[data-testid="part-grid"]');
      return { dbg: GG.debug('seq'), lanes: g.dataset.lanes, v: g.dataset.v, cells: document.querySelectorAll('[data-testid^="part-cell-"]').length,
        names: [...g.querySelectorAll('.lh')].map(x => x.textContent), label: q('[data-testid="seq-chords"]').textContent,
        name: GG.songs.progName(GG.state.genre, 'bass', 'verse', GG.ui.get('seq').data.pat),
        chips: [...document.querySelectorAll('[data-testid^="chord-chip-"]')].map(b => ({ semi: +b.dataset.semi, home: b.dataset.home, cls: b.className, text: b.textContent })) }; });
    c.ok(e0.dbg.screen === 'edit' && e0.dbg.layer === 'part' && e0.lanes === '6' && e0.v === '2' && e0.cells === 96, 'Tweak: your part, 6 rows x 16 steps');
    c.ok(e0.names.join() === 'Low 5th,Root,3rd,5th,7th,Oct', 'bass rows: ' + e0.names.join());
    c.ok(e0.label === 'Chords: ' + e0.name + '▾' || e0.label.replace(/\s/g, '') === ('Chords:' + e0.name + '▾').replace(/\s/g, ''), 'the picker reads "Chords: <progName> ▾": ' + e0.label);
    c.ok(e0.chips.length === 4 && e0.chips.map(x => x.semi).join() === e0.dbg.chords.verse.join() && e0.chips.every(x => (x.semi === 0) === (x.home === '1' && /home/.test(x.cls))), 'four chips = the verse chords, home outlined ' + JSON.stringify(e0.chips.map(x => x.text)));
    c.ok((await audit(page)).length === 0, 'part editor layout ' + (await audit(page)).join('; '));
    // The picker on a composed song: p.chords[verse] = progChords(i), part.prog = i, the label = the picked name, the roots move.
    const r0 = await roots(), cur = (await partOf()).sections.verse.prog;
    await tap(page, 'seq-chords'); await waitScreen(page, 'seq-pick');
    const picks = await ev(() => document.querySelectorAll('[data-testid^="part-pick-"]').length);
    const pi = (cur + 1) % picks;
    await tap(page, 'part-pick-' + pi); await waitScreen(page, 'seq');
    const pk = await ev(i => { const D = GG.ui.get('seq').data, ch = GG.songs.part.choices(GG.state.genre, 'bass', 'verse');
      return { chords: D.pat.chords.verse, want: GG.songs.progChords(GG.state.genre, 'verse', i, D.pat.mood), prog: D.pat.part.sections.verse.prog, label: document.querySelector('[data-testid="seq-chords"]').textContent, name: ch[i].name }; }, pi);
    c.ok(picks >= 3 && pk.prog === pi && JSON.stringify(pk.chords) === JSON.stringify(pk.want) && pk.label.indexOf(pk.name) >= 0, 'a pick writes p.chords + part.prog; the label = "' + pk.name + '"');
    c.ok(await roots() !== r0, 'the pick moves the timeline roots');
    // A chip: the chord sheet writes one bar; Back to <progression> resets it.
    await tap(page, 'chord-chip-2'); await waitScreen(page, 'seq-chord');
    const opts = await ev(() => [...document.querySelectorAll('[data-testid^="chord-opt-"]')].map(b => +b.dataset.testid.replace('chord-opt-', '')));
    const was = pk.chords[2], to = opts.find(x => x !== was && x !== 0);
    await tap(page, 'chord-opt-' + to); await waitScreen(page, 'seq');
    const ch1 = await ev(() => ({ c: GG.ui.get('seq').data.pat.chords.verse, chip: document.querySelector('[data-testid="chord-chip-2"]').dataset.semi, label: document.querySelector('[data-testid="seq-chords"]').textContent }));
    c.ok(opts.length >= 5 && ch1.c[2] === to && +ch1.chip === to && ch1.c[0] === pk.chords[0], 'a chip writes its bar (' + was + ' -> ' + to + '), the others stay; label ' + ch1.label);
    await tap(page, 'chord-chip-2'); await waitScreen(page, 'seq-chord');
    const rs = await ev(() => document.querySelector('[data-testid="chord-reset"]').textContent);
    await tap(page, 'chord-reset'); await waitScreen(page, 'seq');
    c.ok(JSON.stringify(await ev(() => GG.ui.get('seq').data.pat.chords.verse)) === JSON.stringify(pk.want) && rs.indexOf(pk.name) >= 0, '"' + rs + '" resets the bar');
    // The grid + the tweaks in ⋯.
    const m0 = await meters(page);
    await page.locator(tid('part-cell-5-15')).click();
    c.ok((await partOf()).sections.verse.rows[5][15] === 'x', 'a tap on the grid adds an octave note');
    await openTools(page);
    const mods = await ev(() => [...document.querySelectorAll('[data-testid^="part-mod-"]')].map(b => b.dataset.testid));
    c.ok(mods.join() === 'part-mod-lock,part-mod-double,part-mod-ring,part-mod-call' && await ev(() => !!document.querySelector('[data-testid="part-clear"]')), '⋯ holds your part\'s tweaks + clear ' + mods);
    const before = JSON.stringify((await partOf()).sections.verse);
    await tap(page, 'part-mod-double');
    await waitScreen(page, 'seq');
    const m1 = await meters(page);
    c.ok(JSON.stringify((await partOf()).sections.verse) !== before && m1.join() !== m0.join(), 'Double time changes your part; the meters follow ' + m0 + ' / ' + m1);
    await tap(page, 'btn-seq-loop');
    await page.waitForFunction(() => GG.debug('seq').playing === 'loop', null, { timeout: 5000 });
    const pl = await ev(() => window.__play[window.__play.length - 1]);
    c.ok(pl && pl.seat === 'bass' && pl.part, 'Loop plays your part (seat + part) ' + JSON.stringify(pl));
    await page.waitForTimeout(700);
    c.ok(await ev(() => document.querySelectorAll('.seq-chip.ph').length === 1), 'the playing bar\'s chip lights up');
    await tap(page, 'btn-seq-loop');
    // The Drums layer: the drum grid, no chips.
    await tap(page, 'seq-layer-drums');
    c.ok(await ev(() => GG.debug('seq').layer === 'drums' && !!document.querySelector('[data-testid="cell-kick-0"]') && !document.querySelector('[data-testid="seq-chips"]') && !document.querySelector('[data-testid="seq-chords"]')), 'Drums layer: the drum grid, chips hidden');
    c.ok((await audit(page)).length === 0, 'drums layer layout ' + (await audit(page)).join('; '));
    await tap(page, 'seq-layer-part');
    const verse = JSON.stringify((await partOf()).sections.verse);
    await tap(page, 'btn-seq-save');
    await waitScreen(page, 'results');
    const last = await ev(() => GG.state.songs[GG.state.songs.length - 1]);
    c.ok(last.pattern.part && last.pattern.part.seat === 'bass' && last.pattern.part.v === 2 && JSON.stringify(last.pattern.part.sections.verse) === verse && last.pattern.chords, 'the song lands with your v2 part and its chords');
    // View: read-only (part grid, chips, ⋯ = metronome).
    await ev(id => { GG.ui.closeAll(); GG.ui.openSong(id); }, last.id);
    await waitScreen(page, 'seq');
    const vw = await ev(() => ({ dbg: GG.debug('seq'), ro: !!document.querySelector('.seq-grid.part.ro'), chips: [...document.querySelectorAll('[data-testid^="chord-chip-"]')].every(b => b.disabled), p: JSON.stringify(GG.ui.get('seq').data.pat) }));
    await page.locator(tid('part-cell-0-1')).click();
    c.ok(vw.dbg.mode === 'view' && vw.ro && vw.chips && await patJSON(page) === vw.p, 'view: your part read-only (grid ignores taps, chips disabled)');
    // An old song (a v1 part, no chords): the grid shows its v2 view, nothing written; a pick writes part.prog only; the first
    // grid edit upgrades it.
    await ev(() => { GG.ui.closeAll(); const p = GG.songs.sanitize(GG.songs.starter(GG.state.genre, GG.state.gear), GG.state.gear, GG.state.genre); p.part = GG.songs.part.full(GG.state.genre, 'bass', p); GG.state.draft = p; GG.ui.openSketch(); });
    await waitScreen(page, 'seq');
    const o0 = await ev(() => ({ dbg: GG.debug('seq'), v: document.querySelector('[data-testid="part-grid"]').dataset.v, lanes: document.querySelector('[data-testid="part-grid"]').dataset.lanes, p: GG.ui.get('seq').data.pat }));
    c.ok(o0.dbg.screen === 'edit' && o0.v === '1' && o0.lanes === '6' && !o0.p.part.v && !o0.p.chords && o0.dbg.chips.length === 4, 'an old v1 part shows through part.view (6 rows), nothing written; chips derived');
    await tap(page, 'seq-chords'); await waitScreen(page, 'seq-pick');
    await tap(page, 'part-pick-2'); await waitScreen(page, 'seq');
    const o1 = await ev(() => GG.ui.get('seq').data.pat);
    c.ok(o1.part.sections.verse.prog === 2 && !o1.chords && !o1.part.v, 'an old song: a pick writes part.prog only (no chords, still v1)');
    await page.locator(tid('part-cell-1-3')).click();
    const o2 = await ev(() => GG.ui.get('seq').data.pat.part);
    c.ok(o2.v === 2 && o2.sections.verse.rows.length === 6 && o2.sections.verse.rows[1][3] === 'x', 'the first grid edit upgrades the part to v2 (D16)');
    // Rhythm: 6 rows; lead: 7 rows + "Hook: <name> ▾".
    for (const [seat, rows, names, key] of [['rhythm', '6', 'Chug,Open,Root,5th,Oct,Scratch', 'Chords:'], ['lead', '7', 'Low,1,2,3,4,5,High', 'Hook:']]) {
      await writeBlock(page, { seed: 4343, bandId: 'grid_road_ramblers', seat });
      await tap(page, 'btn-quick-tweak');
      const x = await ev(() => { const g = document.querySelector('[data-testid="part-grid"]'); return { lanes: g.dataset.lanes, names: [...g.querySelectorAll('.lh')].map(e => e.textContent).join(), label: document.querySelector('[data-testid="seq-chords"]').textContent, chips: document.querySelectorAll('[data-testid^="chord-chip-"]').length }; });
      c.ok(x.lanes === rows && x.names === names && x.label.indexOf(key) === 0 && x.chips === 4, seat + ': ' + rows + ' rows (' + x.names + '), ' + x.label);
      c.ok((await audit(page)).length === 0, seat + ' editor layout ' + (await audit(page)).join('; '));
    }
    await page.screenshot({ path: path.join(CACHE, shotName('seq_part.png')) });
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'part threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

// Layout (§4.7 sizes): Quick song + every editor case per seat at this viewport (PW_VIEW=440x956: no scroll anywhere; 390x844:
// .seq-main scroll <= 1), buttons >= 44, no h-scroll, shots tagged by size; then the notch insets (47/34 at 390, 59/34 at 440)
// with Bigger text: every Quick slider + foot button reachable through quick-main, nothing clipped, the longest progName and 6
// tabs fit.
async function layout() {
  const c = checker('layout');
  const { page, errors, close } = await open();
  const ev = (f, a) => page.evaluate(f, a);
  const W = VIEW.width, BIG = W >= 430;
  const scrollOf = sel => ev(s => { const m = document.querySelector(s); return m ? m.scrollHeight - m.clientHeight : -1; }, sel);
  const shot = async n => { await page.waitForTimeout(450); await page.screenshot({ path: path.join(CACHE, shotName(n + '.png')) }); };
  try {
    await page.waitForSelector(tid('btn-new'));
    const FULL = { lanes: 6, doubleKick: true, sections: ['solo', 'outro'] };
    for (const [seat, full] of [['drums', false], ['bass', false], ['rhythm', false], ['lead', false], ['drums', true], ['rhythm', true]]) {
      const tag = seat + (full ? '_full' : '');
      await writeBlock(page, { seed: 515, bandId: seat === 'drums' ? 'hail_damage' : 'gravel_kings', seat });
      if (full) { await ev(g => { Object.assign(GG.state.gear, g); GG.ui.seqGear(GG.ui.get('seq')); }, FULL); await page.waitForTimeout(150); }
      c.ok((await audit(page)).length === 0, tag + ' Quick song: no overflow, buttons ≥ 44 ' + (await audit(page)).join('; '));
      if (BIG) c.ok(await scrollOf('.quick-main') <= 1, tag + ' Quick song fits at ' + W + ' (scroll ' + await scrollOf('.quick-main') + ')');
      await shot('seq_quick_' + tag);
      await tap(page, 'btn-quick-tweak');
      const layers = seat === 'drums' ? ['drums'] : ['part', 'drums'];
      for (const L of layers) {
        if (seat !== 'drums') await tap(page, 'seq-layer-' + L);
        for (const tab of full ? ['verse', 'solo', 'outro'] : ['verse', 'chorus']) {
          await tap(page, 'seq-tab-' + tab);
          if (await page.locator(tid('seq-add-' + tab)).count()) await tap(page, 'seq-add-' + tab);
          const sc = await scrollOf('.seq-main'), bad = await audit(page);
          c.ok(sc <= 1 && bad.length === 0, tag + ' ' + L + ' layer, ' + tab + ': no scroll (' + sc + '), buttons ≥ 44 ' + bad.join('; '));
          if (tab === 'verse' || tab === 'solo') await shot('seq_edit_' + tag + '_' + L + '_' + tab);
        }
        if (full) {
          const t6 = await ev(() => [...document.querySelectorAll('.seq-tabs .tab')].map(t => ({ w: t.getBoundingClientRect().width, o: t.scrollWidth > t.clientWidth + 1, t: t.textContent })));
          c.ok(t6.length === 6 && t6.every(t => t.w >= 43.5 && !t.o), tag + ': 6 tabs fit ' + t6.map(t => t.t + ' ' + Math.round(t.w)).join(', '));
        }
      }
      if (!full && (seat === 'rhythm' || seat === 'drums')) {   // the ⋯ menu on the verse (your part's tools / the drum tools)
        await tap(page, 'seq-tab-verse'); if (seat !== 'drums') await tap(page, 'seq-layer-part');
        await openTools(page);
        c.ok((await audit(page)).length === 0, tag + ' ⋯ menu layout ' + (await audit(page)).join('; '));
        await shot('seq_menu_' + tag); await tap(page, 'btn-seq-tools-cancel');
      }
      await tap(page, 'seq-tab-song');
      c.ok((await audit(page)).length === 0, tag + ' Song tab ' + (await audit(page)).join('; '));
      if (!full && seat === 'rhythm') await shot('seq_song_' + tag);
    }
    // v1.3.1: the sketch pad's head with the shop button, every seat, Quick song + the editor.
    await sketchHeads(page, c, W, '');
    // The chord sheet + the picker (shots for the owner check).
    await writeBlock(page, { seed: 515, bandId: 'gravel_kings', seat: 'rhythm' });
    await tap(page, 'btn-quick-tweak');
    await tap(page, 'chord-chip-1'); await waitScreen(page, 'seq-chord');
    c.ok((await audit(page)).length === 0, 'chord sheet layout ' + (await audit(page)).join('; '));
    await shot('seq_chord_sheet');
    await page.evaluate(() => GG.ui.close('seq-chord'));
    await tap(page, 'seq-chords'); await waitScreen(page, 'seq-pick');
    c.ok((await audit(page)).length === 0, 'picker layout ' + (await audit(page)).join('; '));
    await shot('seq_picker');
    await page.evaluate(() => GG.ui.close('seq-pick'));
    // v1.3 review: every progression / hook name the game can show (4 genres x 3 sections x bass / rhythm / lead) reads in full in
    // the real "Chords: <name> ▾" / "Hook: <name> ▾" button (two lines at most inside the 48 px row, no ellipsis); segments >= 44 px.
    const FIT = () => {
      const ch = document.querySelector('[data-testid="seq-chords"]'), b = ch.querySelector('b'), k = ch.querySelector('.sc-k'), keep = [k.textContent, b.textContent], cut = [];
      let n = 0;
      [['Chords:', 'rhythm'], ['Chords:', 'bass'], ['Hook:', 'lead']].forEach(([pre, seat]) => {
        k.textContent = pre;
        GG.contracts.GENRES.forEach(g => ['verse', 'chorus', 'bridge'].forEach(sec => GG.songs.part.choices(g, seat, sec).forEach(c => {
          b.textContent = c.name; n++;
          if (b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1) cut.push(pre + ' ' + c.name);
        })));
      });
      k.textContent = keep[0]; b.textContent = keep[1];
      const tg = document.querySelector('.seq-toggle');
      return { n, cut: [...new Set(cut)], btn: Math.round(ch.getBoundingClientRect().height), row: Math.round(tg.getBoundingClientRect().height), fits: tg.scrollWidth <= tg.clientWidth + 1,
        segs: [...document.querySelectorAll('.seq-layers .seg')].map(x => Math.round(Math.min(x.getBoundingClientRect().width, x.getBoundingClientRect().height))) };
    };
    const fit0 = await ev(FIT);
    c.ok(fit0.n >= 60 && fit0.cut.length === 0 && fit0.btn >= 44 && fit0.row === 48 && fit0.fits && fit0.segs.every(x => x >= 44),
      W + ' every chords / hook name reads in full (' + fit0.n + ' names, cut: ' + fit0.cut.slice(0, 4).join(' | ') + ') ' + JSON.stringify(Object.assign({}, fit0, { cut: fit0.cut.length })));

    // Notch + home bar insets, Bigger text on.
    const INS = BIG ? { top: 59, bot: 34 } : { top: 47, bot: 34 };
    await page.addStyleTag({ content: `:root{--safe-top:${INS.top}px !important;--safe-bot:${INS.bot}px !important}` });
    await ev(() => GG.prefs.set({ bigText: true }));
    await page.waitForFunction(() => document.documentElement.classList.contains('gg-big'));
    for (const seat of ['drums', 'rhythm', 'lead']) {   // (v1.3 review: + rhythm, the 6-row grid's header labels)
      await writeBlock(page, { seed: 616, bandId: 'hail_damage', seat });
      await page.waitForTimeout(250);
      const r = await ev(ins => {
        const H = document.documentElement.clientHeight, qm = document.querySelector('.quick-main'), rect = e => e.getBoundingClientRect();
        qm.scrollTop = qm.scrollHeight;
        const qr = rect(qm), out = { sliders: [], foot: [], head: [], pad: parseFloat(getComputedStyle(qm).paddingBottom) };
        ['energy', 'mood', 'feel', 'fills', 'tempo'].forEach(k => { const s = rect(document.querySelector('[data-testid="quick-' + k + '"]')); out.sliders.push(k + ':' + (s.height > 0 && s.top >= qr.top - 1 && s.bottom <= qr.bottom + 1 ? 'ok' : Math.round(s.top) + '-' + Math.round(s.bottom) + ' vs ' + Math.round(qr.top) + '-' + Math.round(qr.bottom))); });
        document.querySelectorAll('.full.seq .full-foot .btn').forEach(b => { const x = rect(b); out.foot.push(x.bottom <= H - ins.bot + 1 && x.top >= qr.bottom - 1 ? 'ok' : b.dataset.testid + '@' + Math.round(x.bottom)); });
        document.querySelectorAll('.seq-head button').forEach(b => { const x = rect(b); out.head.push(x.top >= ins.top - 1 ? 'ok' : b.dataset.testid + '@' + Math.round(x.top)); });
        out.scrolls = qm.scrollHeight > qm.clientHeight + 1;
        return out;
      }, INS);
      // every slider reachable: scrolled to the end, the last one sits inside quick-main (they scroll, never clip)
      c.ok(r.sliders.slice(-1)[0] === 'tempo:ok' && r.foot.every(x => x === 'ok') && r.head.every(x => x === 'ok') && r.pad >= 16,
        seat + ' Quick song with insets + Bigger text: sliders reachable through quick-main (' + r.sliders.join(' ') + '), foot ' + r.foot.join() + ', header ' + r.head.join() + ', pad ' + r.pad);
      await ev(() => { document.querySelector('.quick-main').scrollTop = 0; });
      await shot('seq_quick_insets_big_' + seat);
      await tap(page, 'btn-quick-tweak');
      if (seat === 'lead') {
        // the longest hook name of the genre on the verse (the real label), then every chords / hook name in the button (Bigger text)
        await ev(() => { const D = GG.ui.get('seq').data, B = GG.songs.genre(GG.state.genre).backing; let best = 0, n = 0;
          (B.hooks.verse || []).forEach((h, i) => { const l = String(h.name || '').length; if (l > n) { n = l; best = i; } }); D.pat.part.sections.verse.hook = best; GG.ui.get('seq').rerender(); });
        const fb = await ev(FIT);
        c.ok(fb.n >= 60 && fb.cut.length === 0 && fb.btn >= 44 && fb.row === 48 && fb.fits && fb.segs.every(x => x >= 44),
          W + ' Bigger text + insets: every chords / hook name reads in full (cut: ' + fb.cut.slice(0, 4).join(' | ') + ') ' + JSON.stringify(Object.assign({}, fb, { cut: fb.cut.length })));
      }
      const e = await ev(ins => {
        const W2 = document.documentElement.clientWidth, H = document.documentElement.clientHeight, q = s => document.querySelector(s), rect = el => el.getBoundingClientRect();
        const ch = q('[data-testid="seq-chords"]'), tg = q('.seq-toggle'), tabs = [...document.querySelectorAll('.seq-tabs .tab')];
        return { chords: ch ? rect(ch).right <= W2 + 1 && tg.scrollWidth <= tg.clientWidth + 1 : true, label: ch ? ch.textContent : '', tabs: tabs.every(t => t.scrollWidth <= t.clientWidth + 1),
          head: rect(q('[data-testid="btn-seq-close"]')).top >= ins.top - 1, foot: [...document.querySelectorAll('.full.seq .full-foot .btn')].every(b => rect(b).bottom <= H - ins.bot + 1),
          over: [...document.querySelectorAll('#screens *')].filter(x => { const r = rect(x); return r.width && (r.right > W2 + 1 || r.left < -1); }).length,
          lh: [...document.querySelectorAll('.seq-grid .lh')].filter(x => x.scrollWidth > x.clientWidth + 1).map(x => x.textContent) };
      }, INS);
      c.ok(e.chords && e.tabs && e.head && e.foot && !e.over && !e.lh.length, seat + ' editor with insets + Bigger text: header clear of the notch, foot above the home bar, tabs + "' + e.label + '" + grid column names fit, no overflow ' + JSON.stringify(e));
      await shot('seq_edit_insets_big_' + seat);
    }
    await sketchHeads(page, c, W, ' (Bigger text + insets)');
    c.ok(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  } catch (e) { c.ok(false, 'layout threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  await close();
  c.done();
}

// v1.3.1 (Lane S): the sketch pad (the kit / rig hotspot) per seat: ✕ · title · shop · ⋯ in the viewport, each >= 44, the caps whole.
async function sketchHeads(page, c, W, note) {
  for (const seat of ['drums', 'bass', 'rhythm', 'lead']) {
    await page.evaluate(seat => {
      GG.ui.closeAll(); GG.main.quickStart({ seed: 717, bandId: 'hail_damage', seat, openCard: false });
      GG.state.card = null; GG.state.phase = 'plan'; GG.ui.closeAll(); GG.ui.openSketch();
    }, seat);
    await page.waitForFunction(() => GG.debug('ui').screen === 'seq' && GG.debug('seq') && GG.debug('seq').mode === 'sketch');
    for (const scr of ['quick', 'edit']) {
      if (scr === 'edit') { await tap(page, 'btn-quick-tweak'); await page.waitForFunction(() => GG.debug('seq').screen === 'edit'); }
      const h = await page.evaluate(() => {
        const hd = [...document.querySelectorAll('.seq-head')].pop(), r = e => e.getBoundingClientRect(), cap = hd.querySelector('.seq-title .caps');
        return { ids: [...hd.children].map(k => k.dataset.testid || ''), caps: cap.textContent, cut: cap.scrollWidth > cap.clientWidth + 1,
          small: [...hd.querySelectorAll('button')].filter(b => r(b).width < 43.5 || r(b).height < 43.5).map(b => b.dataset.testid),
          out: [...hd.children].filter(k => r(k).left < -1 || r(k).right > innerWidth + 1).map(k => k.dataset.testid), hscroll: document.documentElement.scrollWidth > innerWidth + 1 };
      });
      c.ok(h.ids.join() === 'btn-seq-close,seq-title,btn-seq-shop,btn-seq-tools' && !h.cut && !h.small.length && !h.out.length && !h.hscroll,
        W + ' ' + seat + ' sketch pad ' + scr + note + ': ✕ · title · shop · ⋯ fit, "' + h.caps + '" whole ' + JSON.stringify(h));
      // v1.3.1 review fix: beside the shop button the editor's song name wraps to two lines: every 30-36 character name in
      // the title pools reads whole (none cut), the title stays inside the 48 px head; the SHOP label grows with Bigger text
      if (scr === 'edit') {
        const t = await page.evaluate(() => {
          const all = new Set(), base = GG.state;
          for (const g of GG.contracts.GENRES) { const x = JSON.parse(JSON.stringify(base)); x.genre = g; x.songs = []; x.pendingSongs = []; for (let i = 0; i < 300; i++) all.add(GG.songs.pickTitle(x, GG.RNG(i), []).title); }
          const hd = [...document.querySelectorAll('.seq-head')].pop(), fr = hd.querySelector('.seq-title .fr'), tb = hd.querySelector('.seq-title'), keep = fr.textContent, hr = hd.getBoundingClientRect();
          const names = [...all].filter(n => n.length >= 30 && n.length <= 36), cut = [], out = [];
          for (const n of names) { fr.textContent = n; const b = tb.getBoundingClientRect();
            if (fr.scrollHeight > fr.clientHeight + 1 || fr.scrollWidth > fr.clientWidth + 1) cut.push(n); if (b.top < hr.top - 1 || b.bottom > hr.bottom + 1) out.push(n); }
          fr.textContent = keep;
          return { n: names.length, cut, out, wrap: hd.classList.contains('wrap-title'), shopT: parseFloat(getComputedStyle(hd.querySelector('.seq-shop .t')).fontSize), big: document.documentElement.classList.contains('gg-big') };
        });
        c.ok(t.wrap && t.n >= 10 && !t.cut.length && !t.out.length && t.shopT >= (t.big ? 10.5 : 9.5),
          W + ' ' + seat + ' sketch editor' + note + ': ' + t.n + ' song names of 30-36 characters read whole on two lines, SHOP ' + t.shopT + ' px ' + JSON.stringify({ cut: t.cut.slice(0, 3), out: t.out.slice(0, 3) }));
      }
    }
  }
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
        // (v1.2 review) the absolute onset: kick + snare through the same chain with the kit and with the DRUMS2 synth (no kit
        // module): a skipped MP3 trim would land the samples ~25 ms late
        const abs = async () => { const o = []; for (const lane of ['kick', 'snare']) o.push(onset((await A.renderOffline({ genre: 'metal', lane, quality: 3, vel: 0.85, room: 'dry' })).buffer, 0.05)); return o; };
        const absKit = await abs();
        const withKit = await hashAll(), K = GG.content.kits; GG.content.kits = {};
        const absSynth = await abs();
        const without = await hashAll(); GG.content.kits = K;
        out.abs = { kit: absKit.map(x => +x.toFixed(3)), synth: absSynth.map(x => +x.toFixed(3)) };
        out.leak = { n: specs.length, same: withKit.filter((h, i) => h === without[i]).length, diff: specs.filter((s, i) => withKit[i] !== without[i]).map(s => s.genre + '/' + (s.lane || 'song') + '/q' + s.quality) };
        // the live decode (v1.2 review, F17.2): the title screen's unlock (no career) decodes nothing; a metal career on the pro
        // kit decodes it; a punk career loaded after it releases it
        const wait = ms => new Promise(res => setTimeout(res, ms)), kd = () => GG.debug('audio').kit;
        document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); A.unlock();
        await wait(1500);
        out.title = { n: kd().n, bytes: kd().bytes, id: kd().id, state: !!GG.state };
        GG.main.quickStart({ seed: 5, bandId: 'hail_damage', openCard: false }); GG.state.gear.quality = 2;
        for (let i = 0; i < 200 && !kd().ready; i++) await wait(100);
        const k = kd(); out.live = { ready: k.ready, n: k.n, onset: k.onset, bytes: k.bytes, ms: k.ms, err: k.err, genre: GG.state.genre };
        GG.main.quickStart({ seed: 5, bandId: 'frost_heave', openCard: false });
        for (let i = 0; i < 50 && kd().n; i++) await wait(100);
        out.punk = { genre: GG.state.genre, n: kd().n, bytes: kd().bytes, ready: kd().ready, pre: GG.debug('audio').pre.key };
        return out;
      });
      c.ok(r.used.one === 1 && r.used.song > 0 && r.used.song <= r.used.drums && !r.used.nan && r.used.peak < 1, 'metal tier 3 renders the sampled kit ' + JSON.stringify(r.used));
      // (a render's onset includes the kit chain's fixed latency, ~15 ms of compressor look-ahead + oversampling: the clips must
      // all land within 1 ms of each other, and each decoded clip starts at most 1 ms before its first sample over 2 % of its peak)
      const o0 = Math.min(...r.onsets), o1 = Math.max(...r.onsets);
      c.ok(r.used.clipOnset != null && r.used.clipOnset <= 1 && o1 - o0 <= 1, 'decoded clips start <= 1 ms before their onset (' + r.used.clipOnset + ' ms), 25 rendered clips within ' + (o1 - o0).toFixed(3) + ' ms of each other');
      c.ok(r.abs.kit.every((x, i) => x != null && r.abs.synth[i] != null && Math.abs(x - r.abs.synth[i]) <= 1), 'onset <= 1 ms absolute: sampled kick / snare land within 1 ms of the synth\'s through the same chain ' + JSON.stringify(r.abs));
      c.ok(!r.title.state && r.title.n === 0 && r.title.bytes === 0, 'the title screen unlock (no career) decodes nothing ' + JSON.stringify(r.title));
      c.ok(r.live.genre === 'metal' && r.live.ready && r.live.n === 25 && !r.live.err && r.live.onset <= 1, 'the live decode (a metal career on the pro kit): 25 clips, onset <= 1 ms ' + JSON.stringify(r.live));
      c.ok(r.punk.genre === 'punk' && r.punk.n === 0 && r.punk.bytes === 0 && !r.punk.ready, 'a punk career loaded after it releases the decoded kit ' + JSON.stringify(r.punk));
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
