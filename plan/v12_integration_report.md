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
- **Node suite** (`node tests/run.js`): SUITE ALL PASS on the resumed tree (`2b2a542`, 33 files) and again after the re-balance
  (`0909c6c`).
- **Classic hash** (`pw_seq hash`, Classic on, 232 cases vs `tests/fixtures/audio_v11_hashes.json`): **232/232 equal** at 390x844
  and 440x956 on the merged tree and again on the final build (299-327 s each, two browsers in parallel).
- **Size gate:** `stat -c %s dist/game.html` = **5,115,270 B** <= 6,000,000 (owner F17). F17: `git ls-files '*.wav'` empty, nothing
  under `local/` tracked, sim_kit attribution 5/5 (README + title line + LICENSE + the credit in the built game), pw_flow `flow`
  sees the title kit credit.
- **Owner rules** (scan of `git diff 369c9e1` over src / tools / tests / README): no USA place or brand, no share / screenshot /
  download control, no model identifiers.
- **Playwright** (runner: every `META_ONLY` section of every `tests/pw_*.js` at 390x844 with `timeout 500`; at 440x956 the §6
  item-4 files: pw_seq, pw_gig, pw_seat_audio, pw_perf, pw_flow `flow`; two streams in parallel, pw_perf alone; "-> rerun" =
  the same section re-run on the final build, alone where it was a timing failure):

| file | 390x844 | 440x956 |
|---|---|---|
| pw_bands | hail_damage 57, frost_heave 58, gravel_kings 58, grid_road_ramblers 58, flat 12 | (390 only) |
| pw_bands_render | bands_render 106 | (390 only) |
| pw_creator | creator 34, kit 8, stage 6, meta 12, gear 39 | (390 only) |
| pw_drama | drama 19 | (390 only) |
| pw_ending | ten 15, bonus 10, fixture 4, preview 5 | (390 only) |
| pw_fans | bandbook 19, fanclub 13 | (390 only) |
| pw_flow | flow 17, bands 51, year 5, code 7, layout 34 | flow 17 |
| pw_garage | garage 48, seat 73 | (390 only) |
| pw_gig | gig 32, sync 14, bridge 17, feel 10 -> rerun 10, e2e 15, touch 5, double 17, songend 5, sync2 11, seat 33, chord 10, kit 7 -> rerun 7 | gig 32, **sync 1/14 FAIL** -> rerun 14 -> rerun 14, bridge 17, feel 10, e2e 15, touch 5, double 17, songend 5, sync2 11, **seat 1/33 FAIL** -> rerun 33 -> rerun 33, chord 10, kit 7 |
| pw_hof | list 20, restore 10, empty 5 | (390 only) |
| pw_label | label 13, studio 30, awards 19, seat 6, sheet 1 | (390 only) |
| pw_logo | picker 23, reuse 14, meta 13 | (390 only) |
| pw_perf | scenes 18, governor 12, ratio 11, stalls 10, audio 7, pre 9 | scenes 18, governor 12, ratio 11, stalls 10, audio 7, pre 9 |
| pw_recap | offer 13, recap 19, bands 15, seat 10 | (390 only) |
| pw_rival | scene 13, botb 16, final 10 | (390 only) |
| pw_seat_audio | voices 19, mute 4, preview 9, noodle 5 | voices 19, mute 4, preview 9, noodle 5 |
| pw_seats | pick 25, write 11, gig 8, studio 6, shop 7, garage 11, stage 4 | (390 only) |
| pw_seq | hash 4 -> rerun 4, audio 42 -> rerun **1/39 FAIL** -> rerun 42 -> rerun 42, seq 57, **heavy 2/22 FAIL** -> rerun 22, genres 25 -> rerun 25, voices 8 -> rerun 8, part 30, kit 8 -> rerun 8, real 5 -> rerun 5, vox 17 -> rerun 17 | hash 4 -> rerun 4, audio 42 -> rerun 42, seq 57, **heavy 2/22 FAIL** -> rerun 22, genres 25 -> rerun **1/25 FAIL** -> rerun 25 -> rerun 25, voices 8 -> rerun 8, part 30, kit 8 -> rerun 8, real 5 -> rerun 5, vox 17 -> rerun 17 |
| pw_settings | settings 52, calib 18, difficulty 17 | (390 only) |
| pw_shop | gear 30, merch 24, space 21, van 23, spaces 17, seat 26 | (390 only) |
| pw_stage | stage 37, van 20, seat 125 | (390 only) |
| pw_title | scene 15, flow 10, prefs 7 | (390 only) |
| pw_tour | map 24, tour 28, gong 13, payoff 5 | (390 only) |
| pw_trophies | tab 15, toast 7 | (390 only) |
| pw_tutorial | tut_w1 128, tut_calib 6, tut_w24 14, tut_skip 11, tut_replay 20, tut_notch 24 | (390 only) |
| pw_world | board 14, van 13, calendar 21, drivers 22 | (390 only) |

  Failures and what they were:
  - `pw_seq heavy` 20/22 at both sizes on the merged build: (1) "heavier: energy below 150 Hz up" = a real regression (the KS
    metal bass), fixed in `0909c6c` (§4), 22/22 alone at both sizes after it; (2) "a full metal song renders faster than real
    time" xRT 0.79-0.83 with two browsers + other renders running; alone 2.40 (390) and 1.48 (440). Same check Lane V saw
    fail under load (the stage-0 build fails it the same way under load).
  - 440 `pw_gig sync` ("a tap is judged at the game time it was made", 8.3 ms) and `pw_gig seat` (a bass early lift): two
    streams in parallel; alone twice each: 14/14, 33/33. No assertion changed.
  - 390 `pw_seq audio` rerun (threw on a 4 s wait for the van ambience, 57_ui_van, under load; Lane I saw the same once): alone
    twice 42/42. 440 `pw_seq genres` rerun ("punk, rock + country render faster than real time", punk 0.94 under load): alone
    twice 25/25.
  - The 390 "rest" files (UI flows) ran on the build before `0909c6c` (it changes only two KS bass voices, used by band notes
    with a vel); every pw_seq audio section plus pw_gig feel / kit re-ran on the final build.
- **No two hits the same** (pw_seq `real`, final build, both sizes 5/5): 8 consecutive hits at equal vel, every pair's
  difference vs the first hit: snare min +1.7 dB, hat min +1.7 dB, metal KS chug min -25.1 dB (gate > -40 dB).

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
- Clip RMS 1.1 -> 1.2 (final build, after `0909c6c`; re-rendered + re-encoded): metal 0.1487 -> 0.1599 (+0.6 dB), punk 0.1238
  -> 0.1274 (+0.3), rock 0.1629 -> 0.1620 (-0.05), country 0.1052 -> 0.1077 (+0.2); metal kit (tier 3) 0.1631; peaks 0.55-0.58.
- Tap demo (metal, tier 2 = the sampled kit; first 100 ms per hit, RMS / peak dBFS, mono): 1.1 every kick -16.5 / -5.9, every
  snare -26.5 / -8.8 (identical hits). 1.2 vel (A.tapVel) Perfect bar 1.0 / 0.977 / 0.983 / 1.0, Good bar 0.875 / 0.88 /
  0.808 / 0.844; kicks Perfect -17.3, -17.1 vs Good -18.4, -18.9 dB RMS; snares Perfect -25.0, -24.6 vs Good -25.7, -26.2 dB
  RMS: the Perfect bar lands 1.1-1.6 dB harder and no two hits are the same. The sampled snare's peak is ~4.5 dB under the
  1.1 synth snare at the same RMS (a real snare's lower crest factor; `v12_clips.json` lists peaks, so read RMS there).
- "No two hits the same" (pw_seq `real`, 8 consecutive hits at equal vel, every pair's RMS difference > -40 dB): pass at both sizes (snare min +1.7 dB, hat +1.7 dB, metal KS chug -25.1 dB; §3). The
  tap demo above also shows every hit differs.

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
  met. **KS warm <= 300 ms (F13):** 7 of 8 songs in the first pass; metal at 390x844 took 366 ms there. Re-measured alone on the
  final build: metal 223 and 291 ms (punk 66-78, rock 146-173, country 150-171; slices <= 6.9 ms work): met, with little
  margin on metal (pw_perf gates warm at 1.2 s wall; the warm runs during the count-in and a miss plays the 1.1 oscillator).
- pw_perf sections at both sizes (390x844, 440x956): scenes 18, governor 12, ratio 11, stalls 10, audio 7, pre 9: all pass
  (the §3 table).

## 7. Gaps and notes for the review
Lead (this pass):
- **KS warm near 300 ms on metal** (366 ms once at 390x844 in the first pass; 223 / 291 ms alone on the final build; 243 ms
  at 440x956). The pw_perf gate is 1.2 s wall; perf lens: decide whether to gate at the F13 300 ms.
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

## 8. Review fixes (fixer, 2026-10-03; commits `f6187c7`..HEAD on `v1.2-soundcheck`)
The review pass (3 lenses: clock, perf, regression) confirmed 5 major findings and listed 12 unverified minors. All 5 majors
are fixed. Of the 12 minors, 3 duplicate majors 3 and 5, 7 are fixed, 1 is partly fixed (first-use DSP: the amp and the
plate, not the glottal waves) and 1 is documented (the Classic runtime switch).

**Confirmed (major)**
1. **Tap chokes on the velocity path** (`30 A.hit`). A velocity hit longer than the tap cap (crash 0.9 s, ride / kick / toms on
   the upper tiers) queues a decay ramp (`chokeEnv`). The next tap's `setTargetAtTime(0)` could not override it, so the old
   hit rang on (the slot gain even jumped up) and was then cut hard at +50 ms, which clicks. Fix: `chokeSlot` cancels first
   (`cancelAndHoldAtTime`; where that is missing, `cancelScheduledValues` + the level computed from the slot's envelope
   `sl.env`), then fades in 6 ms. Only velocity taps take it (`taps[lane].vel`); the 1.1 tap choke is unchanged. New check in
   pw_gig `kit`: two arena crash taps 0.25 s apart, the first slot reads 1.30 just before the choke and < 5 % of that at
   +20 ms (before the fix: 1.12 at +20 ms, the check FAILS).
2. **The van radio took the offline paths** (`ksGet`, `drumVel`, `preVel`, `skBuf`). "Offline" is now `r.ctx !== ctx` (a rig on
   its own OfflineAudioContext), so `radioRig` is a live rig. A KS miss queues (the oscillator plays), there are no synchronous
   plucks, and drums use the shared PRE2 set / sampled kit when the radio's genre | tier is the set's key. Otherwise they use
   the 1.1 recipe at velGain, booked `D.n`. Probe (metal tier 3, 6 s of radio): 0 synchronous plucks (was 17-20), 19.8
   sources/s against Classic's 21.5 (F3.4 holds), with the kit used for kick 19 / snare 9 and PRE2 for the rest.
   renderOffline is unchanged (21 non-Classic renders hash-identical to `cc69f7a`).
3. **A.warm warmed only KS layer 1.** It now builds pass 0's feel plan, the same pure plan `player()` makes from these opts
   (`feelOf` + `feelPlanFor`, same seed), and queues every band event at its planned vel, in song order. Your part's kinds
   (`opts.mute`) get both layers, after the band. A live miss during a gig song (`h.gig`) is held until the song ends (F3.5),
   with warm jobs going first; elsewhere (songwriter loops, radio) misses still render in the 1 ms slices. Gig-opts play after
   the warm, 15 s: misses metal 0 (was 5), punk 0 (was 12); keys warmed metal 44 (33), punk 25 (16).
4. **AudioBufferSourceNode.detune on old WebKit** (`ksSrc`). `ksOK(ctx)` tests `createBufferSource().detune` once. Without it,
   `ksGet` returns null and `A.warm` is a no-op, so every string stays the 1.1 oscillator (F3.6) instead of throwing after
   `book()` (silent guitars and bass on iOS < 14.5).
5. **The TMKD kit decoded on the title screen and was never released** (F17.2). `skWant` only decodes the kit of a loaded
   career (`skFor`: `GG.state` + `A.sampleKit(rig.genre, rig.tier)`). A kit without samples releases the decoded clips
   (`skRelease`). `skBuild` / `next()` stop when the career's kit changed mid-decode. A career loaded after the unlock wants
   its kit at once (`career:new` / `career:loaded` -> `setKit`, not mid-song, not mid-preview, not Classic), and `setKit` on
   an unchanged kit still asks. Follow-up: the PRE2 key carries `|kit` when the samples apply, so the title's set renders
   kick / snare / toms itself and a career's set is rebuilt without them (no PRE2 + kit double count over the 6 MB cap).
   pw_seq `kit` now checks: the title unlock decodes nothing; a metal career on the pro kit decodes 25 clips (3.79 MB); a punk
   career loaded after it releases them (n 0, 0 B). Trade-off (accepted): the new-career seat preview on the title (no career,
   REF tier 2) plays the synth kit, not the samples.

**Minors**
- Fixed: a string seat's run notes reuse the head tap's vo (55 `seatBook`, `G.runs[].vo`). Practice is no studio take
  (`!G.opts.practice`). `ksPut` counts a key once and the pump skips keys already put. pw_perf gates the KS warm on F7's CPU
  budget: the traced CPU of the warm's slices summed, <= 300 ms on the 4x throttle, plus wall <= 1.2 s (was wall 1.2 s
  only). The shop demo (`hits`, `seatHear`), songwriter pads, the part grid and the title fill pass `{ vel: TAP_AUTO.other }`;
  the shop waits (<= 1.5 s) on `A.kitReady()`, so a new kit tier is heard as itself. First-use DSP: `A.warm` builds the
  genre's amp (cab IR + convolvers) before the song (`warmRig`) instead of on its first band note in the pump. The live plate
  impulse comes ~1.2 s after the unlock (never mid-song) instead of inside the touch; offline renders are unchanged. Not
  done: pre-making the glottal waves. All 9 open quotients cost ~180 ms of CPU and a ~24 ms slice on the 4x throttle (pw_perf
  `pre` failed with them), for the 1-3 waves a song uses, so they stay lazy (0.6-5.5 ms each in the pump). The pw_seq kit
  onset is now an absolute check: sampled kick / snare land within 1 ms of the DRUMS2 synth through the same chain (15.08 /
  14.88 vs 15.47 / 15.44 ms); the relative checks are relabelled. Report §6 de-duplicated (the pw_perf line restored).
- Documented, not rebuilt: `GG.audio.classic(bool)` at runtime applies at once to renderOffline and to every new note's
  path, but the live rig keeps its graph (crush, duck, stereo kit chain, built amps, room IR) until a reload. For a by-ear
  A/B: flip it and reload (comment at `A.classic`).
- Duplicates: the two "A.warm only layer 1" minors (= major 3) and the title-decode minor (= major 5).

**Sound:** renderOffline 1.2 output is unchanged by every fix (21 non-Classic renders, 4 genres x song / feel / 3 lanes + radio,
hash-identical to `cc69f7a`), so the clips and `plan/v12_audio_numbers.txt` stand as they are (not re-rendered). The changes
are live-only: chokes, radio, warm coverage, practice feel, the 1.2 kit in the shop / songwriter / title.

**Verification** (390x844 and PW_VIEW=440x956; timing failures re-run alone)
- `node build.js`: 5,120,731 B (gate 6,000,000). `node tests/run.js`: SUITE ALL PASS.
- Matrix on `3cd4b7a`, two browsers in parallel (one per size):
  - pw_seq: hash 4 (Classic 232/232 equal), audio 42, kit 11, real 5, seq 34 + guided 23, part 30, vox 17, voices 8, genres
    25, heavy 22.
  - pw_gig: sync 14, bridge 17, feel 10, kit 8, seat 33, chord 10, gig 32, double 17.
  - pw_seat_audio: voices 19, mute 4, preview 9, noodle 5.
  - Other files: pw_shop gear 30 / seat 26, pw_title scene 15 / flow 10, pw_settings settings 52, pw_flow flow 17.
  - Timing-only failures under that parallel load, each passed when re-run alone:
    - pw_seq `heavy` "renders faster than real time" (xRT 0.80 / 0.76): 22/22 alone twice at each size.
    - 390 pw_seq `genres` (same render-speed check): 25/25 alone twice.
    - 440 pw_seat_audio `voices` ("'now' = ctx + 5 ms", one read 2.9 ms off): 19/19 alone twice.
- Final tree (`A.warm` without the waves), both sizes: pw_gig sync 14 / feel 10 / kit 8, pw_seq kit 11 / vox 17, pw_seat_audio
  voices 19: all pass.
- pw_perf alone, both sizes: scenes 18, governor 12, ratio 11, stalls 10, audio 7.
- pw_perf `pre` 9, final tree: 390 passed 3 of 4 runs, 440 passed 2 of 5. The failures are 4x-throttle slice maxima:
  - one 45 ms KS-warm slice;
  - PRE2 build slices metal|1 10.8, country|2 8.2 and rock|0 13.4 ms work. These fixes add nothing to those slices beyond the
    key compare in `stale()`.
  - The pre-review tree (`cc69f7a`, same test file) flakes the same way: 2 of 3 at 440, one 30 ms metal warm slice.
- KS warm per song on the final tree (traced CPU, 4x): metal 217-266 ms with 48 keys (was 36), punk 64-81, rock 135-143,
  country 127-163. Wall: metal 311-412 ms.
- Next for whoever owns perf: the warm's slice maxima (a single `pluckJob` create / step is up to 4-5 ms at 4x, on the base
  too) and the PRE2 build-slice outliers.
