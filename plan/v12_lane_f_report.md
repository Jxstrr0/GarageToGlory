# v1.2 "Soundcheck": Lane F (feel) report (2026-10-03, branch `wip-v12-f`)

Contract `plan/plan_contract_1.2.md` §4.1 / §4.2 + §5 Lane F; handoff F3, F4, F5, F13; F16 answers (mood, studio, rival).
Resumed from the paused WIP (`6a939ed`: 31 module, player / genres edits), merged `v1.2-soundcheck` (`6cf8800`), then
finished 55, the tests and this report. Files touched: `src/31_audio_feel.js` (new module), `src/content/genres.js`
(`backing.feel` only), `src/30_audio.js` (owned functions only, below), `src/55_ui_gig.js`, `tests/sim_feel.test.js` (new),
`tests/sim_audio.test.js`, `tests/pw_gig.js`. `dist/` not committed.

## 1. APIs as built (`src/31_audio_feel.js`, pure, loads after 30 and replaces the stage-0 stubs)
- `A.velGain(v)` = `min(1.333, (v / C.VEL_REF) ^ 1.5)` (VEL_REF 0.85 = the 1.1 level, +2.5 dB cap; NaN -> 1). One helper for
  every lane (Lane I's `velGain` and Lane V's `GG.voice.velGain` already defer to it when it exists).
- `A.tightness(skill)` = `clamp((skill - 30) / 60, 0, 1)`.
- `A.feelFor(state|null, genre, { rival, studio, seat })` -> `{ genre, slop, studio, rival, seat, byKind }`, `byKind[<drum lane |
  bass gtr gtr2 clean lead twang fiddle vox bvox>] = { who, t, spread (s, 1 SD), push (s), velSd }`.
  - Career: `career.lineup(state)`; the kit = the member whose `seatRole` is `drums*` (your seat: `who 'player'`, t 1, no
    spread / push: your taps); the other seats by content role (bass; rhythm: rhythm / vocals-guitar / guitar / lead; lead:
    lead / guitar / rhythm; fiddle; vocals: any singer, even on the kit), `bvox` = the band's mean skill. Missing -> skill 50.
  - `null` state -> every player t 0.5 (who `~drums`, `~bass`, ...). Rivals (`opts.rival` = id | true): `GG.rival.lineup(state)`
    (members carry no skill -> 60) + `C.FEEL_RIVAL`; studio `+ C.FEEL_STUDIO`; mood < `C.FEEL_MOOD.below` -> spread x 1.25.
  - spread = `lerp(12, 2.5, t) ms x slop`, push = `backing.feel.push[part] x (1 - 0.5 t)` (ride/hat share `hat`, cymbal -> kick,
    toms -> snare, every guitar + fiddle -> `gtr`, vox / bvox -> `vox`), velSd = `lerp(0.10, 0.03, t)`.
- `A.feelPlan(tl, FEEL, seed, { gig })` -> `{ dt: Float32Array(n) s, vel: Float32Array(n), dgap: Float32Array(n) beats, stats:
  { n, maxAbsDt, meanVel, gig } }`; null without a timeline / FEEL. One AR(1) stream per player (seeded `seed | who`;
  `off = 0.7 off + N(0, spread x 0.71)`, one step per onset so a chord / kick + hat move together; starts stationary),
  + push; clamps `C.FEEL_CLAMP` (gig kick / snare 6 ms, other 15 ms, outside 25 ms, all <= 25 % of a 16th; float32-safe);
  a voice (drum lane / band kind) never changes its time order; `dgap` = how much the gap to the same voice's next event
  moved (player() applies it so chokes / note lengths follow). Velocity = `A.accent` x section dynamics x ramp (last bar
  before a different section: +0 -> +8 %) x ring 1.05 + `N(0, velSd)`, clamp 0.2..1. Steps: dt 0, vel 1.
- `A.accent(step, kind, lane, variant, role)`: F4 map (0 -> 1, 8 -> 0.94, 4/12 -> 0.9, snare backbeat 1, 8ths 0.8, 16ths
  0.66; ghost/brush/rim x 0.45; band `0.5 + 0.5 map`; palm-muted gtr/gtr2/clean chugs 0.85) x DYN (sparse 0.86, break
  1.04, solo backing 0.9; the soloist's own kinds stay at full).
- `A.tapVel({ judgement, step, lane, prevHatT, t, run?, rnd? })`: F5 table (perfect 1, good 0.86, fill 0.76, stray 0.62,
  count 0.7) x position (downbeat 1, quarter 0.96, snare backbeat 1, 8th 0.9, 16th 0.82) x hands (hat < 150 ms apart:
  run parity 1 / 0.84) + (rnd x 2 - 1) x 0.03 (default rnd = hash of t + lane), clamp 0.45..1. `A.TAP_AUTO = { hat 0.88,
  kick 0.9, double 0.82, other 0.88 }`. `A.feelStats()` + `GG.debug('feel')` = `{ genre, studio, rival, byKind (ms), lastPlan }`.
- Content: `genres.js` `backing.feel { slop, push { kick, snare, hat, bass, gtr, vox } }` = the F4 table (ms).

## 2. Wiring (30 / 55)
- 30 `player()`: `feelOf(opts, genre, tl)` (Classic / `opts.feel === false` / no 31 -> null; the career when it plays this
  genre, else null-state; `opts.rival` -> `GG.state` + the rival's lineup) and `feelPlanFor` (seed `hashSeed(songId | pass)`,
  re-planned per loop pass and on `h.update`). In `pump()` a non-step event is scheduled at `t + dt[i]` as a COPY (`feelEv`:
  `+ vel`, `gap + dgap`); `tl.events` never change, steps never move. `h.feel` / `h.plan` on the handle. At song start
  `voxTempo(r, spb, now)`: `r.voxTempo(spb)` (Lane V) else `r.voxDelay.delayTime` = a dotted 8th (guarded; Classic: skipped).
- 30 `schedule()`: `drumHit(..., ev.v, undefined, ev.vel)` (Lane I's vel arg); `playNote` gets `ev.vel` on the copy.
- 30 `A.hit(lane, when, o)`: `o.vel` (Classic off) -> the PRE slot gain / the live hit's gain at `A.velGain(vel)`.
  `seatPlay`: `ev.vel = clamp01(o.vel)` (Classic off; partners / repeats copy it); `seatVoice`: `SEATS.last.vel`.
- 30 van radio: `studio: true`. 59d rivals already pass `rival: V.rid` (no change needed).
- 55: `bandOpts(song, at)` (+ `gig: true`, + `studio: true` on a studio take); `warmSong()` -> `A.warm(pattern, bandOpts)` right
  after `G.chart` is built (nextSong / restartSong; Classic / no warm -> nothing); `tapVel(li, J, r)` before every
  `playTap` / `playSeat` sound (count-in noodling 'count', partial chord = good, strays: the last note's step, hat runs
  counted per gig); `autoVel` on count-in hats, auto notes (drum + string seats), Auto-kick, a double's 2nd kick.
  `debug('gigui').feel = { velN, autoVelN, last, warm, gig, plan }`. Classic on: every call is the 1.1 call (no `o`).

## 3. Tests + results (this branch alone)
- `node tests/sim_feel.test.js`: ALL PASS 11 (velGain; feelFor null / career x 4 bands / rival / mood / studio / missing;
  determinism + purity; clamps at 60-260 bpm x 4 genres x gig/free; steps 0/1; lane order; AR(1) SD vs t; push sign;
  accent map + dynamics + ramp; tapVel table; debug).
- `node tests/sim_audio.test.js`: ALL PASS 35 (stub asserts -> Lane F's; new "feelPlan never moves steps / keeps lane
  order at 60-260 bpm" + the 1,212 fingerprints with 31 loaded and gig / feel / studio opts).
- Node suite `node tests/run.js`: SUITE ALL PASS (32 files).
- `pw_gig` at 390x844: feel 10, sync 14, bridge 17 ALL PASS; at `PW_VIEW=440x956`: feel 10, sync 14, bridge 17 ALL PASS.
- Classic hash: `ONLY=tap,pre tools/audio_hashes.js` 192/192 during work; full `META_ONLY=hash pw_seq`: 232/232 equal to the 1.1 fixture (230 s), ALL PASS 4.
- Regression (390x844): pw_gig double 17, seat 33, chord 10; pw_seat_audio voices 19, mute 4, preview 9, noodle 5;
  pw_seq seq 34, guided 23; pw_rival botb 16 (a rival set with the rival feel). No console errors anywhere.

## 4. Numbers
- AR(1) (metal, slop 0.6, 12 seeds): onset SD 7.06 ms at t 0 (target 7.2), 1.47 ms at t 1 (target 1.5); lag-1 corr 0.668
  (target 0.7). Push (t 0.5, one seed): rock snare +6.8 ms (laid back), punk snare -4.8 ms (rushing).
- Gig (quickStart seed 1212, 120 bpm): band max |dt| 14.6 ms (the 15 ms gig clamp holds; starters are loose); steps on
  the 16th grid (0 off of 12+). Taps: Perfect downbeat kick vel 1.0; Good offbeat hat (95 ms late) 0.76-0.80; same drum
  rendered (pre x velGain on this branch): +2.96 / +3.63 dB rms; vs the 1.1 level +2.12 / -0.84..-1.51 dB.

## 5. What the lead wires
- Merge order F -> I -> V. `A.hit` conflicts with Lane I (both edit it): keep Lane I's body (its velocity path + slot
  velGain supersede mine) with this lane's signature `(lane, when, o)`; `schedule()`'s `drumHit(..., undefined, ev.vel)`
  matches Lane I's `drumHit(r, p, lane, t, cap, v, cls, vel)`. sim_audio's stub test: keep Lane F's feel lines + Lane I's
  warm / realism lines.
- `debug('audio').feel = A.feelStats ? A.feelStats() : null` (§4.6).
- Lane I's `renderOffline` plan (feelFor(null, ..) + feelPlan) ignores `dgap`: fine for renders; optional `ev.gap += dgap`.
- After merge, rerun `pw_gig feel`: the level check switches itself to `renderOffline(spec.vel)` (Lane I's velocity hit).

## 6. Hand-overs / gaps
- `opts.feel === false` is supported but no caller needs it (there is no metronome-only practice screen today).
- Rival members have no `skill` in `state.rival.members`: every rival player sits at 60 (+ 0.15) -> t 0.65; `rv.skill`
  (band level) is not used (contract: "missing 60").
- An echo tap that stands in for a dropped double's 2nd kick plays as a stray (0.62), not `TAP_AUTO.double`.
- String-seat tap vel reaches the sound only through Lane I's KS notes (`playNote` with `ev.vel`); on this branch alone
  the seat note keeps the 1.1 level (no double velGain after the merge).
