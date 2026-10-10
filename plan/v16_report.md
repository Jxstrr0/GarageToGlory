# v1.6.0.0 "Showtime" — build report (branch `v1.6-showtime`, 2026-10-10)

Owner: "Can we add some animation or something to the not highway and notes themselves?" Popup answers (status.md
Addendum 9, LOCKED): juicier hits, living notes, moving highway, combo fire, on phone + PC with a "Less motion" switch.

## 1. What changed
- `src/55f_ui_gigfx.js` (new, `GG.gigfx`): the highway's animation layer. Pure parts (tiers 10 / 25 / 50, the level rule,
  the beat pulse, the miss flicker vs soft tint) are node-tested. Runtime: a fixed 96-particle pool (typed arrays, round
  robin, <= 300 ms each, one fillStyle per colour group), sprites on small offscreen canvases built at layout and cached by
  key (gem glow per lane colour + gem size, Perfect flash + beam per lane, flame per tier, a 48x96 texture tile), gradients +
  the pattern made once per layout. shadowBlur is used only while a glow sprite is built.
- `src/55_ui_gig.js`: draw() calls the layer at its layers, all under the gems (glows in their own pass before any gem); note
  y = yOf(t) as before, the hit line stays at hitY; gems pulse in size around their centre. 'gig:judge' -> FX.judge;
  layout() -> FX.setup(G.geo). fxCheck every 500 ms + each count-in picks the level. debug('gigui') + pop, fx.
- Effects (full level):
  1. Juicier hits: Good / fill 6 sparks + a shockwave ellipse; Perfect 10 sparks (lane colour + white), a bigger flash, a
     lane beam and a white ring; a miss splits the dead gem in two grey halves (lane-coloured rims) at the hit line that tilt,
     sink and fade, grey shards fall, and the hit line flickers red (45 ms on / dim, 320 ms).
  2. Living notes: a soft halo under every gem pulsing on the chart's beat ((1 - phase)^4 of t / spb), a glint sliding across
     each gem, gems swell <= 6 % / 10 % around their centre on the beat; hold tails shimmer (faster while held).
  3. Moving highway: a faint dash + grit texture scrolling at the notes' own speed (pattern fill, translated), lane edges and
     beat lines brighten on the beat and as a line crosses the hit line, the strip glows brighter as the combo grows.
  4. Combo fire: x10 amber, x25 orange, x50 white-hot zone tint + lane flames licking up from the zone's top edge (icons,
     names and keycaps stay clear); x50 adds the star shine (cyan sweep up the highway every two beats, cyan rails, hit line
     and counter); the counter pops on each new tier. Cosmetic only.
- Less motion: `lessMotion` (10_save default null = follow the OS; 11 normalize -> matchMedia('(prefers-reduced-motion:
  reduce)') until the player picks; the pick is stored and wins both ways). Settings > Look + feel row right after Reduced
  flashing: "A calm gig highway: no sparks, flames or scrolling. Good for older phones." Calm = the 1.5 highway + the combo
  colour (counter, zone tint, hit line) + the simple hit ring + a soft miss tint. Graphics Low -> calm; the frame governor
  stepping down ('auto' below its top ratio or wanting to) -> calm, latched until the next count-in.
- Reduced flashing (full level): no Perfect beam, a smaller flash, no tier-up rings or counter pop, the soft miss tint, no beat
  pulse in the strip glow.
- Test hooks: `GG.ui.gigLiveBot { accuracy, jitterMs, until }` (a seeded bot plays in real time; its taps and the session's
  ticks run on a fixed 50 ms song-time grid, so judgements and scores never depend on frames), `GG.gigfx.force`.
- Tools/tests: `tests/fx.test.js`, `tests/pw_fx.js`, `tools/fx_look.js` (owner stills + clips), `tools/perf.js gig FX=`,
  `tests/_pw.js open({ reducedMotion, video })`, `tests/_load.js opts.globals`. 02 V1.6 SHOWTIME block (line comments).
- VERSION 1.6.0.0 (dist `Garage to Glory - V1.6.0.0.html`). Phone freeze fixtures: only the Settings screens (settings,
  settings_play / _audio / _look, big_settings at 390 / 440; settings at 844l) moved, by the new row; re-recorded, nothing
  else in the diff.

## 2. Perf (headless SwiftShader, Hail Damage festival gig, Expert, 6 lanes, `tools/perf.js gig`, 390x844)
| run | JS/frame p50 / p95 ms x1 | x4 | highway draw p50 / p95 ms x1 | x4 |
|---|---|---|---|---|
| before (1.5.1.0) | 1.8 / 5.2 | 9.2 / 18.5 | - | - |
| after, fx forced full | 2.0 / 5.7 | 9.9 / 20.7 | 0.5 / 1.1 | 2.1 / 6.1 |
| after, auto (governor -> calm here) | 1.9 / 6.6 | - | 0.4 / 1.7 | - |
Hard gates unchanged (draw calls 37, tris 32k, audio peak 25 <= 32, tap drops 0, nodes/s 59). JS/frame is report-only and
noisy here; the x4 budget (p50 <= 6, p95 <= 14) was already over before 1.6. On a slow phone the governor steps down and
the highway goes calm (1.5 cost). pw_fx perf (highway draw, full vs calm): 390 p50 0.4 / p95 2.7 vs 0.3 / 0.5; 440 0.4 / 1.5
vs 0.3 / 0.5; 1440 0.5 / 1.2 vs 0.3 / 0.7 (gates: p95 <= 4 ms phone / 6 ms PC, p50 <= calm + 1.5 ms). Pool peak <= 75 of 96.

## 3. Tests
- `node tests/run.js`: SUITE ALL PASS (+ new fx.test 8: setting default / OS / pick / junk, tiers, level, pulse, miss flicker vs
  soft tint, pool).
- `pw_fx` at 390x844, 440x956, 1440x900 (desktop context): fx 10, tiers 7, calm 23, os 7, flash 6, same 7, perf 6 = ALL PASS x3.
  `same`: three seeded live-bot gigs (fx full / fx calm / the Less motion setting), 215 judgements (140 perfect, 36 good,
  35 miss), 3 song results and the gig grade + score (A, 65) identical; the highway geometry identical.
- `pw_gig` all 15 sections ALL PASS (swing failed once under the matrix load: one perfect tap 68 ms off its snap; rerun
  alone ALL PASS 10). `pw_settings` settings 52 / calib 18 / difficulty 17; `pw_keys` all 10 sections incl. wide-gig 46;
  `pw_wide` gig 75 / polish 65; `pw_perf` scenes, governor, ratio, stalls, audio, pre, quick ALL PASS.
- `pw_freeze` 390 / 440 / 844l ALL PASS (after the logged Settings-row fixture update); `tools/phoneqa.js` 390 + 440 ALL PASS.

## 4. Size
dist/game.html 5,354,046 -> 5,378,875 B (+24,829 B; gate 6,000,000; aim < +25 KB).

## 5. Owner look (`scratchpad/v16_owner/`)
Stills at 440x956 (phone) and 1440x900 (PC): 01_hit_good, 02_hit_perfect, 03_miss, 04_combo_x10, 05_combo_x25, 06_combo_x50,
07_hold_shimmer (bass), 08_less_motion_x25 (`_phone.png` / `_pc.png`). Clips: 09_clip_to_x50_phone.mp4 (7.7 s),
09_clip_to_x50_pc.mp4 (8.1 s), H.264 yuv420p faststart, 30 fps. Capture notes: headless software GL draws ~5 fps and
recordVideo dropped time (its clip ran ~1.35x fast), so the clips are rendered frame by frame on a virtual clock
(performance.now + rAF stepped 1/30 s; the game clock free-runs on it, the 3D stage animates) = the song's real speed.
Stills hold the 3D stage on its last frame and freeze the clock a few ms into the moment.

## 6. Left / notes
- The live-bot / still / clip hooks are test-only; nothing in a normal game reads them.
- A missed note is already below the canvas when the session calls the miss (good window + grace), so the "crack" is drawn
  as the gem's halves at the hit line in its lane.
- Owner check (ship / tweak) -> review -> PR; the lead flips Current to 1.6.0.0 on merge.
