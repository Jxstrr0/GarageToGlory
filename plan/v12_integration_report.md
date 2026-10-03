# v1.2 "Soundcheck": integration report (lead, 2026-10-03, branch `v1.2-soundcheck`)

Contract `plan/plan_contract_1.2.md` §5 Lead + §6; handoff F13 / F17. Stage 0: `plan/v12_stage0_report.md`. Lane reports:
`plan/v12_lane_f_report.md`, `plan/v12_lane_i_report.md`, `plan/v12_lane_v_report.md`. An earlier integrator merged the lanes,
wired the hand-overs and added the F17 credits before a container restart (16:43 UTC); this pass resumed from `2b2a542`.

## 1. Merges (contract §6 order F -> I -> V)
| step | commit | conflicts / notes |
|---|---|---|
| merge `wip-v12-f` (1fe1f5a) | `3fd4a20` | clean |
| merge `wip-v12-i` (50780ad) | `dbb22c1` | `src/30_audio.js` `A.hit`: kept Lane I's velocity body with Lane F's `(lane, when, o)` signature; `tests/pw_gig.js` header + runner (feel + kit both kept); dist rebuilt |
| merge `wip-v12-v` (96dedcd) | `d9e8b75` | `tests/pw_seq.js` header + runner only (kit, real, vox kept); dist rebuilt |
| hand-overs + F17 credits | `2b2a542` | below |
| F13 numbers (this pass) | `c39dada` | section "1.2" + "1.1 vs 1.2"; `audio_numbers.js` label fix + `--diff` |
| tools (this pass) | `f14139e` | `perf.js gig KITQ=`, `audio_clips.js --metal-kit` |
| status (this pass) | `be03b71` | Version, What's in v1.2, APIs, Addendum 4 |
| F13 re-balance (this pass) | `0909c6c` | metal + punk KS bass excitation (pw_seq heavy; §4) |

Node suite after every merge: SUITE ALL PASS. Classic hash on the final tree: §3.

## 2. Hand-overs (all checked in code)
- `schedule()` -> `drumHit(r, port, ev.lane, t, ev.gap * spb, ev.v, undefined, ev.vel)` (30:2929): song drum events take the
  velocity recipes, round robins, PRE2 and the sampled kit. renderOffline does the same (30:4456).
- `A.hit`: Lane I's velocity branch (velBuf / vslot / velPlay / KITUSE / PRE.hits) with Lane F's `o.vel` signature.
- `player()` -> `r.voxTempo(spb)` at song start (else a dotted 8th on `r.voxDelay`); `r.carve` built by Lane I, dipped by
  Lane V's `voxCarve`; the plate = `GG.dsp.impulse2('plate', sr, 1201)` (cached per rate).
- `A.warm(pattern, bandOpts)` in 55 `warmSong()` right after the chart is built (nextSong / restartSong; Classic: skipped).
- `debug('audio')` += `feel: A.feelStats()`, `vox: A.voxStats()` (plus Lane I's `realism, pre, ks, kit` and stage 0's `classic`).
- `02_contracts.js` V1.2 SOUNDCHECK "As merged" block (F, I, V, kits); status.md APIs.
- F17: title screen second small line with every `GG.content.kits` credit (`[data-testid=title-kit-credit]`, 51), README
  "Credits", sim_kit checks README + the title line, pw_flow `flow` checks the line is visible. `git ls-files '*.wav'` empty,
  nothing under `local/` tracked, the standing "replace the kit (or get TMKD's written permission) before any monetization"
  rule stays in status.md Addendum 4.

## 3. Checklist §6 item 4 + the matrix
MATRIX_PLACEHOLDER

## 4. Numbers (F13 tuning by numbers; `plan/v12_audio_numbers.txt`)
Section "1.2" = the merged build as the game plays it (feel on, null state t 0.5; signature songs, whole arrangement, kit tier 2
= the reference outside a career). Full mixes:

| genre | RMS dBFS 1.1 -> 1.2 (diff) | 4k+ dB 1.1 -> 1.2 (diff) | peak dBFS 1.1 -> 1.2 | width 1.1 -> 1.2 |
|---|---|---|---|---|
| metal | -16.8 -> -15.9 (+0.9) | -29.5 -> -30.0 (-0.5) | -4.7 -> -4.7 | 0.111 -> 0.083 |
| punk | -18.3 -> -18.2 (+0.1) | -25.4 -> -27.4 (-2.0) | -4.6 -> -5.0 | 0.157 -> 0.206 |
| rock | -16.2 -> -16.0 (+0.2) | -27.8 -> -30.2 (-2.4) | -4.7 -> -4.9 | 0.474 -> 0.445 |
| country | -19.3 -> -19.1 (+0.2) | -34.3 -> -36.5 (-2.2) | -4.9 -> -5.1 | 0.022 -> 0.025 |
| mean | -17.65 -> -17.30 (+0.4) | -29.25 -> -31.02 | -4.72 -> -4.92 | 0.191 -> 0.190 |

F13 verdict (`node tools/audio_numbers.js --diff 1.1 1.2`): mean and per-genre RMS within +-1 dB, 4k+ down everywhere (cap +3),
peaks far under the ceiling (the master ceiling is linear below 0.8 = -1.9 dBFS): **ALL MET** on the first measurement
(`c39dada`: metal +0.8, punk +0.1, rock +0.2, country +0.2), so no wet level or bus trim was moved for F13 itself.

**One re-balance, forced by a test (`0909c6c`):** pw_seq `heavy` failed at both sizes on the merged build: "heavier: energy
below 150 Hz up" (the owner's v0.7.2 "heavier metal": the metal band at 140 bpm, drums off, >= -22.4 dB below 150 Hz and a
share > 0.372) read -23.0 dB / 0.226 (1.1: -21.5 / 0.47). Cause: with Lane F's feel every band note carries a vel, so the KS
strings play (Lane I's branch passed because without feel its band took the 1.1 path); the metal KS bass alone read
-22.6 / -20.1 / -22.1 dB (0-150 / 150-500 / 500-1.5k) vs the 1.1 saw's -21.4 / -27.7 / -34.3: its bright excitation drove the
bass grind (HP 260 -> shaper) into the mids. Probed in a scratch copy (bass click 0, pick 0.5, guitar exLp / pick / level,
the metal cab trim: none moved the share enough; the guitars sit in a saturating amp and the glue evens levels), then:
`KS_VOICE['metal|bass']` exLp 450 -> 150, lvl 1.2 -> 1.4 (band 140: -20.4 / -21.1 / -24.2 dB, share 0.41) and, same cause,
`KS_VOICE['punk|bass']` exLp 450 -> 200 (punk band 0-150 Hz vs 1.1: -5.0 -> -2.9 dB). The threshold was NOT retuned.
Metal band vs 1.1 (0-150 / 150-500 / 500-1.5k): -2.4 / +2.4 / +4.2 -> +0.5 / +2.1 / +1.6 dB (back near the 1.1 balance);
metal full-mix RMS +0.8 -> +0.9 dB (inside +-1, the closest of the four: watch it in any later metal change).

Logged for the ears (stems, not tuned): metal drums +2.3 dB (the sampled kit's longer tails over a song; its first 100 ms per
hit matches the synth by `tools/kit_trim.js`), rock / country band 0-150 Hz -2.2 / -1.8 dB (KS bass), 500-1.5k up 4.4 dB on
the punk full mix (cab IRs), rock band 4k+ -6 dB. Clip levels: §5.

## 5. Clips (F13 "Ears"; scratchpad, not committed)
Folder `/tmp/claude-0/-home-user-GarageToGlory/ab4a625b-6080-5e92-a86d-0cde530c49e2/scratchpad/v12_clips/` (container-only; re-render with the commands below).
- `node tools/audio_clips.js --tag v12 --out <dir> --metal-kit` (feel on, kit tier 2, the kit's room; the same songs, sections,
  length and level path as the stage-0 1.1 set): `v12_metal.wav` (Ma Pelouse, Mon Tombeau; Marcel; tier 2 = the TMKD kit,
  152 kit hits), `v12_punk.wav` (Council Meeting (Adjourned Forever); Rox), `v12_rock.wav` (Leather Pants at Forty Below;
  Chase), `v12_country.wav` (My Truck's Got Feelings; Travis), `v12_metal_kit.wav` (F17: the metal clip on the arena kit,
  tier 3), `v12_taps.wav` (the 8-hit Perfect vs Good demo), `v12_clips.json`. Beside them the stage-0 1.1 set (`v11_*.wav`).
- Every clip also as `.m4a` (`ffmpeg -c:a aac -b:a 160k`; AAC LC 22,050 Hz stereo, 15.00 s; ~0.3 MB each): `v11_metal.m4a`,
  `v11_punk.m4a`, `v11_rock.m4a`, `v11_country.m4a`, `v11_taps.m4a`, `v12_metal.m4a`, `v12_punk.m4a`, `v12_rock.m4a`,
  `v12_country.m4a`, `v12_metal_kit.m4a`, `v12_taps.m4a`.
- Clip RMS 1.1 -> 1.2: metal 0.1487 -> 0.1583, punk 0.1238 -> 0.1273, rock 0.1629 -> 0.1620, country 0.1052 -> 0.1077 (metal
  kit 0.1612); peaks 0.55-0.58 both.
- Tap demo (metal, tier 2 = the sampled kit; first 100 ms per hit, RMS / peak dBFS, mono): 1.1 every kick -16.5 / -5.9, every
  snare -26.5 / -8.8 (identical hits). 1.2 vel (A.tapVel) Perfect bar 1.0 / 0.977 / 0.983 / 1.0, Good bar 0.875 / 0.88 /
  0.808 / 0.844; kicks Perfect -17.3, -17.1 vs Good -18.4, -18.9 dB RMS; snares Perfect -25.0, -24.6 vs Good -25.7, -26.2 dB
  RMS: the Perfect bar lands 1.1-1.6 dB harder and no two hits are the same. The sampled snare's peak is ~4.5 dB under the
  1.1 synth snare at the same RMS (a real snare's lower crest factor; `v12_clips.json` lists peaks, so read RMS there).
- "No two hits the same" (pw_seq `real`, 8 consecutive hits at equal vel, every pair's RMS difference > -40 dB): REAL_PLACEHOLDER

## 6. Perf (F13 budgets, 4x CPU throttle)
Gig frame vs 1.1.0.0 (`tools/perf.js gig`, THROTTLE=4, 390x844, Hail Damage (metal) at Mudstonbury, Expert, the bot tapping
every note, 40 s; `GAME=` the 1.1.0.0 dist from `369c9e1`; two trials each, alternating 1.2 / 1.1, quiet machine):

| build, kit tier | JS/frame p50 / p95 ms | rAF frame p95 ms | render() p95 | peak sources | drops / tap drops | taps |
|---|---|---|---|---|---|---|
| 1.1, tier 0 | 7.6 / 16.8 ; 7.1 / 17.7 | 599.9 ; 599.9 | 10.9 ; 11.2 | 23 ; 24 | 0 / 0 | 382 ; 382 |
| 1.2, tier 0 | 6.6 / 15.4 ; 6.8 / 17.0 | 600 ; 600 | 7.6 ; 9.0 | 24 ; 24 | 0 / 0 | 380 ; 380 |
| 1.1, tier 3 | 7.3 / 16.0 ; 7.7 / 15.9 | 616.7 ; 600 | 9.1 ; 8.8 | 25 ; 24 | 0 / 0 | 378 ; 379 |
| 1.2, tier 3 (sampled kit) | 7.8 / 17.2 ; 7.3 / 16.6 | 616.7 ; 633.3 | 10.2 ; 8.2 | 24 ; 24 | 0 / 0 | 375 ; 382 |

- Gig frame p95 <= 1.1 x 1.1.0.0: JS/frame p95 tier 0 16.2 vs 17.25 (x0.94), tier 3 16.9 vs 15.95 (x1.06); rAF frame p95
  (SwiftShader-bound, ~3.5 fps under the 4x throttle in this container) tier 0 x1.00, tier 3 x1.03 -> **met**. Peak
  overlapping sources 24-25 in both builds; the booked-voice counter (`global.active`, sampled every 200 ms) read 28-34 in
  both builds: taps are never dropped and may book over the cap (1.0 rule; pw_perf `audio` asserts the cap for the band).
  Tap drops 0, drops 0, no console errors. Nodes/s 58-59 (1.1: 55-56); the 1.2 creates ~1,740 buffer sources and ~55
  oscillators per 40 s vs 1.1's ~760 / ~1,030 (KS + PRE2 buffers replace oscillators).
- `pw_perf pre` (4x throttle; a slice = trace CPU minus V8 pauses, Lane I's method, kept: the wall maxima are logged next to it):

| set | 390x844 build ms / max slice (work) / MB | 440x956 build ms / max slice (work) / MB |
|---|---|---|
| metal tier 3 (+ kit decode) | 353 / 5.3 / 6.00 (kit 427 ms, slice 1.4) | 455 / 4.8 / 6.00 (kit 346 ms, slice 2.5) |
| punk tier 3 | 1,103 / 5.8 / 5.82 | 1,397 / 4.8 / 5.82 |
| country tier 2 | 735 / 5.8 / 3.51 | 689 / 5.4 / 3.51 |
| rock tier 0 | 78 / 3.2 / 0.92 | 68 / 4.2 / 0.92 |
| metal tier 1 | 363 / 6.0 (wall 10.5) / 2.10 | 298 / 3.7 / 2.10 |
| KS warm per song (metal, punk, rock, country) | 366, 109, 166, 155 ms; slices <= 7.3; 4.1-8.0 MB | 243, 142, 158, 197 ms; slices <= 5.1 |

  -> PRE build <= 2.5 s (max 1.4 s), slices <= 8 ms (max 6.0 work), PRE <= 6 MB, KS cache <= 8 MB (7.98 after 4 songs):
  met. **KS warm <= 300 ms (F13): 7 of 8 songs; metal at 390x844 took 366 ms** (pw_perf gates warm at 1.2 s wall; the warm
  runs during the count-in and a miss plays the 1.1 oscillator, so nothing is lost in a gig: a perf-lens item).
- pw_perf sections at both sizes: PERF_MATRIX_PLACEHOLDER

## 7. Gaps and notes for the review
Lead (this pass):
- **KS warm over 300 ms once** (metal at 390x844, 366 ms; 243 ms at 440x956; the other 6 songs 109-197 ms). The pw_perf gate
  is 1.2 s wall; the warm runs during the count-in and a miss plays the 1.1 oscillator. Perf lens: decide whether to tighten.
- **Only the gig warms songs.** `A.warm` is called from 55 (`warmSong`) only, as the contract asked; the songwriter, garage jam,
  van radio, a rival's set and the seat preview play their first pass with oscillators for any string note not yet cached
  (queued, KS from the next pass). Cheap fix if the ears mind: call `A.warm` before those `A.play` calls.
- **Tonal shifts inside the targets** (logged, not tuned; owner's ears): punk band 0-150 Hz -5 dB, metal drums stem +2.3 dB,
  mids 500-1.5k +3.5-4.5 dB on metal / punk, rock band 4k+ -6 dB. If the owner asks for "more bass" on punk: KS bass level /
  `LV2`, then re-run `tools/kit_trim.js` only if the drum bus moves.
- Tap demo peaks read low for the sampled snare (lower crest factor at the same RMS); judge Perfect vs Good by RMS.
- `tools/audio_numbers.js --section` used to match by prefix ("1.2" overwrote "1.2 Lane I"); fixed (exact label), Lane I's
  section restored from git.

From the lanes (still open; details in their reports):
- F: `opts.feel === false` unused (no metronome-only practice screen); rival members have no `skill` -> every rival player t
  0.65 (`rv.skill` unused); an echo tap standing in for a dropped double's second kick plays as a stray (0.62, not 0.82);
  renderOffline ignores `dgap` (test renders only).
- I: the floor of a PRE slice is one metal top-tier cymbal's graph build (~4-6 ms at 4x); a pre-rendered `GG.dsp.metal`
  buffer would lower it if a real phone needs headroom. Re-run `tools/kit_trim.js` after any drum bus / crush / room change.
- V: voiced murmur before b/d/g not done; the metal gang is centre + right (not L/C/R); rock vocals slightly narrower than 1.1
  (0.221 -> 0.194; ~0.21 with the plate); Classic switched off after it was on keeps the 1.1 vocals until the next page load;
  with Lane I's rooms v2 the vocals-only render differs from 1.1 by up to 0.65 (rooms, not vocals; logged only).
- Owner items: the clip popup (ship / tweak, which genre) and the ear check of plate level, double width, belt brightness.
