# v1.3 "Songwriter" integration report (lead, branch `v1.3-songwriter`, 2026-10-04)

Contract `plan/plan_contract_1.3.md` §5 hand-overs, §6 items 3-7. Lane reports: `plan/v13_lane_s_report.md`, `plan/v13_lane_a_report.md`,
`plan/v13_lane_u_report.md`; stage 0: `plan/v13_stage0_report.md`. Not done here (next steps): §6 item 8 (review, ≤ 3 lenses), item 9 (PR, publish).

## 1. Merges (§6 order S -> A -> U)
| step | commit | how | dist/game.html | checks |
|---|---|---|---|---|
| Lane S (`wip-v13-s` c683dac) | d2cfcfb | fast-forward + dist rebuilt | 5,186,786 B | node suite ALL PASS (35 files, 4 m 21 s) |
| Lane A (`wip-v13-a` ca14d8d) | e180f49 | `--no-ff`, no conflicts (dist rebuilt, not merged by hand) | 5,193,470 B | node suite ALL PASS; sim_gig no longer prints "toNotes has no bar-4 fills yet" (fills chart == timeline runs) |
| Lane U (`wip-v13-u` 6c8d4c7, built on S) | a8f5aa2 | `--no-ff`, no conflicts, dist rebuilt | 5,208,912 B | node suite ALL PASS; Classic `META_ONLY=hash pw_seq` **232/232** (218 s) |
| hand-overs | 5206b03 | lead | 5,212,976 B | node suite ALL PASS |
| owner-check fixes | 0f171c3 | lead | 5,213,916 B | node suite ALL PASS |
| clip tool / status / governor test | 0e860f4, 443bef8, e08f086 | lead | (no dist change) | governor 12/12 x 2 per size |

## 2. Hand-overs applied
- **S -> lead:** 02_contracts V1.3 "As merged" documents `part.suggest/full(.., v)`, compose-only part mods, `toNotes` `fill: true`, the
  fill weighting, recipe card fields (bpm on a 5, `lockLabel` = a pedal name, the `surprise` card), OPs `roll` / `swap` (+ op-id
  strings), mood ids (key on index / mode), every new content key (recipes / sliders / bars / ops / surprise / grooveFx / coach.quick
  + the bySeat priority). **Similarity callers now pass the career genre** (stage-0 note 5): 21 custom triggers, 24 tracklist /
  recycled / bot picks / bot tracklist, 27 lawsuit (`state.genre` / `s.genre`); only matters when a pattern has `p.chords`.
- **A -> lead:** (1) `chordLabel` now names the rung third the band strums on every bar (country native = major triads, as 1.2
  plays vi; a minor rung = minor on every bar); sim_songs test updated with the reason; per-chord thirds stay v1.4. (2) after S:
  sim_gig fills line gone, `pw_gig swing` 10/10 at both sizes. (3) 02_contracts: event keys `g`, `dead`, `single`, timeline `swing`,
  `key.mood`, `third(o, lit)`, KS art `dead`, `A.strum(.., { dead, third })`, `debug('audio')` + `swing, mood, seat.last.dead`, the 22 /
  31 / 55 rules. (4) U: nothing.
- **U -> lead:** 02_contracts: `ui.show('seq', { .., screen, editHint })`, `ui.seqGear(entry)`, `debug('seq').fill` (true while the
  grid edits the Bar 4 fill), 5h / 5p hooks, `tests/_pw.js openTools`; `11_settings.js:47` comment: `songwriterMode` ignored since 1.3
  (D18). `tests/sim_lessons.test.js` green unchanged (in the suite).
- **Lead fixes from the owner-check screenshots (0f171c3):** chord chips mixed sharps and flats (A♭5 C♯5 E♭5): `chordLabel` now
  spells one way per song (the tonic keeps its NOTE name; a natural tonic spells by its major key, the relative major on a minor
  rung: F B♭ E♭ A♭ D♭ flats, G D A E B sharps, C as NOTE); the shared confirm dialog stacks two long labels full width (Q3's
  "Keep my edits / Start over" wrapped to 2 lines each; also helps "Keep looking", "DIY forever"); the seq subtitle's letter-spacing
  drops to .03em under 420 px ("WRITE BLOCK 1 OF 1 · RHYTHM GUITAR" was cut at 390). Tests: sim_songs + 2 spelling checks.
- **Test fix (e08f086, reason logged in the file):** `pw_perf governor` failed 3/3 at 390x844 (1.2.0.0 passes 2/2 on the same
  machine): the probe showed 1.2 and v1.3 send the same insets (`top 0` under the full-screen songwriter, then `83/-1`, then the
  laptop's `83/611`), but the insets rAF can run after the render tick of the same frame, so the test's "mode === covered" read
  that tick's stale mode and the glide began on the next tick (1.5 s of 60 fps counted as "behind the sheet"). The test now waits
  two frames and for `covered` again; 12/12 twice at each size. No game code changed for it.
- Fixtures: none touched (compat_v12 green at every step).

## 3. Checklist §6 items 4-6
- **Node suite** (`node tests/run.js`): SUITE ALL PASS after every merge and on the final tree (compat_v12 10/10, STAGE0, sim_songs 32,
  sim_audio 43, sim_gig 30, sim_feel 12, content 54, content_seats 12, sim_seats 21, sim_lessons).
- **Classic hash** (`META_ONLY=hash pw_seq`, Classic on, 232 cases): 232/232 on a8f5aa2+ (218 s) and again in the final matrix at
  390x844 (307 s) and 440x956 (340 s).
- **Playwright matrix** (every META_ONLY section of every `tests/pw_*.js`; `timeout 500`; the two sizes as two parallel streams
  on 0f171c3/0e860f4 (same dist), pw_perf alone afterwards; "-> n + n alone" = the failing section re-run alone twice):

| file | 390x844 | 440x956 |
|---|---|---|
| pw_seq | seq 45 + seq-compat 17 + quick 26, part 27, layout 47, hash 4, audio 42, heavy **1/22 FAIL** (render speed under load) -> 22 + 22 alone, genres 25, voices 8, kit 11, real 5, vox 17 | seq 45 + seq-compat 17 + quick 26, part 27, layout 53, hash 4, audio **1/39 FAIL** (timeout under load) -> 42 + 42 alone, heavy **1/22 FAIL** (render speed under load) -> 22 + 22 alone, genres 25, voices 8, kit 11, real 5, vox 17 |
| pw_gig | swing 10, sync 14, feel 10, bridge 17, seat 33, chord 10, gig 32, e2e **1/6 FAIL** (btn-van-skip timeout under load) -> 15 + 15 alone, touch 5, double 17, songend 5, sync2 11, kit 8 | swing 10, sync **1/14 FAIL** (16 ms tap snap under load) -> 14 + 14 alone, feel 10, bridge 17, seat 33, chord 10, gig 32, e2e 15, touch 5, double 17, songend 5, sync2 11, kit 8 |
| pw_seat_audio | voices 19, mute 4, preview 9, noodle 5, dead 10 | voices 19, mute 4, preview 9, noodle 5, dead 10 |
| pw_seats | pick 25, write 10, gig 8, studio 6, shop 7, garage 11, stage 4 | pick 25, write 10, gig 8, studio 6, shop 7, garage 11, stage 4 |
| pw_shop | gear 30, merch 24, space 21, van 23, spaces 17, seat 26, sheet (contact sheet) | gear 30, merch 24, space **1/15 FAIL** (8 s wait under load) -> 21 + 21 alone, van 23, spaces 17, seat 26, sheet (contact sheet) |
| pw_flow | flow 17, bands 17 x 3, year 5, code 7, layout 34 | flow 17, bands 17 x 3, year 5, code 7, layout 34 |
| pw_tutorial | tut_w1 33 x 4, tut_calib 6, tut_w24 14, tut_skip 11, tut_replay 20, tut_notch 6 x 4 | tut_w1 33 x 4, tut_calib 6, tut_w24 14, tut_skip 11, tut_replay 20, tut_notch 6 x 4 |
| pw_settings | settings 52, calib 18, difficulty 17 | settings 52, calib 18, difficulty 17 |
| pw_title | scene 15, flow 10, prefs 7 | scene 15, flow 10, prefs 7 |
| pw_bands | hail_damage 58, frost_heave 58, gravel_kings 57, grid_road_ramblers 57, flat 12 | hail_damage 58, frost_heave 57, gravel_kings 57, grid_road_ramblers 58, flat 12 |
| pw_bands_render | bands_render 106 | bands_render 106 |
| pw_creator | creator 34, kit 8, stage 6, meta 12, gear 39, sheet (contact sheet) | creator 34, kit 8, stage 6, meta 12, gear 39, sheet (contact sheet) |
| pw_drama | drama 19 | drama 19 |
| pw_ending | ten 15, bonus 10, fixture 4, preview 5 | ten 15, bonus 10, fixture 4, preview 5 |
| pw_fans | bandbook 19, fanclub 13 | bandbook 19, fanclub 13 |
| pw_garage | garage 48, seat 73 | garage 48, seat 73 |
| pw_hof | list 20, restore 10, empty 5 | list 20, restore 10, empty 5 |
| pw_label | label 13, studio 30, awards 19, seat 6, sheet 1 | label 13, studio 30, awards 19, seat 6, sheet 1 |
| pw_logo | picker 23, reuse 14, meta 13, sheet (contact sheet) | picker 23, reuse 14, meta 13, sheet (contact sheet) |
| pw_recap | offer 13, recap 19, bands 15, seat 10 | offer 13, recap 19, bands 15, seat 10 |
| pw_rival | scene 13, botb 16, final 10 | scene 13, botb 16, final 10 |
| pw_stage | stage 37, van 20, seat 125 | stage 37, van 20, seat 125 |
| pw_tour | map 24, tour 27, gong 13, payoff 5, sheet (contact sheet) | map 24, tour 28, gong 13, payoff 5, sheet (contact sheet) |
| pw_trophies | tab 15, toast 7 | tab 15, toast 7 |
| pw_world | board 14, van 13, calendar 21, drivers 22 | board 14, van 13, calendar 21, drivers 22 |
| pw_perf (alone) | quick 3, scenes 18, governor **1/12 FAIL x 3** -> test race fixed (e08f086) -> 12 + 12, ratio 11, stalls 10, audio 7, pre 9 | quick 3, scenes 18, governor 12 (+ 12 + 12 after the fix), ratio 11, stalls 10, audio 7, pre 9 |

  Every first-run failure but governor was a load timing failure (3 browsers ran at once: the two streams + clip rendering or
  phoneqa) and passed alone twice. "sheet" sections only build contact sheets (no checks).
- **phoneqa** (`tools/phoneqa.js`, insets 47/34 and 59/34, Bigger text on and off, Quick song + part editor + ⋯ menu audited):
  ALL PASS 390x844, ALL PASS 440x956. No horizontal scroll anywhere (phoneqa overflow + pw_seq layout + pw_flow layout); the button
  audit (≥ 44 px, v1.1 controls ≥ 48) holds.
- **Size gate:** `node tools/perf.js size`: **5,213,916 B** (gzip-9 1,707,046) ≤ 6,000,000. vs 1.2.0.0 (5,120,731): +93.2 KB, of
  which 8.8 KB is the V1.3 contract comment block (the build keeps `/* */` blocks); code + content +84.4 KB, a little over the §4.9
  soft budget (+80 KB). Per lane: stage 0 +21.4 KB, S +44.6, A +6.7, U +15.4, lead +5.0 (docs 4.1 + fixes 0.9).
- **Perf:** `pw_perf quick` (4x throttle, playing): slider release -> new loop audible 159-176 ms (gate 300), compose in page 2.5-9.5
  ms; node compose median 3.1 ms (Lane S, gate 20). Gig frame (`tools/perf.js gig`, THROTTLE=4, SONG_S=30, metal festival, two runs
  each): 1.2.0.0 frame p95 583 / 600 ms, js p95 12.0 / 15.4 ms; v1.3 600 / 600 ms, js p95 13.4 / 10.4 ms (ratio ≤ 1.03, gate 1.1;
  SwiftShader at 4x is GPU-bound at ~3 fps, so the js numbers are the useful ones). Timeline + seat chart costs: Lane A report.
- **Seat audit** (`tools/seat_audit.js`) vs 1.2.0.0: +4 lines, all safe: 3 tutorial w1_write lines (`seat: D`, drum seat only) and
  grooves rock `sliders.bySeat.drums.fills` ("Drum solo, sorry", drum seat only). No drum words on string seats (content_seats).
- **Owner rules** (scan of `git diff 0a2c3b8` over src / tools / tests): no USA place or brand (content.test no-USA scan also covers
  coach.quick + bySeat), no share / screenshot / download control (only test screenshots), no model identifiers.

## 4. Owner check material (§6 item 7; scratch, not committed)
Folder `/tmp/claude-0/-home-user-GarageToGlory/ab4a625b-6080-5e92-a86d-0cde530c49e2/scratchpad/v13_owner/` (made by
`tests/.cache/owner_shots_v13.js`, gitignored; every shot looked at, layout fixes above re-shot):
- 440x956: `01_quick_drums.png` (Hail Damage, Neck-snapper, Gallop locked "Double-kick pedal"), `02_quick_rhythm.png` (Gravel
  Kings, Arena anthem), `03_editor_rhythm.png` (6 rows + 4 chips A♭5 A♭5 D♭5 E♭5, "Chords: the highway ▾"), `04_editor_lead.png`
  (7 rows, "Hook: the strut ▾"), `05_editor_drums.png` (drum seat, no chips), `06_menu.png` (⋯ "More": jam, metronome, Back to
  Quick song, part tweaks, copy, clear), `07_chord_sheet.png` (Bar 2 chord: A♭5 home, B5, D♭5, D5, E♭5, G♭5, "Back to the
  highway"), `08_q3_ask.png` (Start over from this recipe? Keep my edits / Start over, stacked); 390x844: `09_editor_rhythm_390.png`.
- Clips (`node tools/audio_clips.js --v13`, wav in `tests/.cache/v13_clips/`, then `ffmpeg -c:a aac -b:a 160k` into the folder
  above; rhythm seat with its composed part, 4 lanes, no pedal, one key per genre, 8-10 s): `v13_<metal|punk|rock|country>_default.m4a`;
  metal + rock `v13_<genre>_<energy|mood|feel|fills><0|4>.m4a` (16). `v13_clips.json` = settings, key, rms / peak, ratings, event
  counts (e.g. metal Energy 0 / 2 / 4 = 152 / 228 / 276 drum events, 24 / 44 / 88 guitar; Mood 0 = E♭ major, 4 = E♭ locrian; Fills 0
  has no fill bar). Note: `feel0` = the default (every default recipe is straight).

## 5. Numbers
- Ratings / ceiling / variety: Lane S report table (every genre x seat x gear: ≥ 3 recipes reach top; weakest defaults listed in §8).
- Slider clips' ratings (rhythm seat, 4 lanes): metal Neck-snapper 97/89 at defaults, Energy 4 92/66, Fills 4 94/87; rock Arena
  anthem 98/92, Energy 4 92/82, Fills 4 90/91; punk default 100/87; country default 98/99.

## 6. Commits (this integration)
d2cfcfb, e180f49, a8f5aa2 (merges), 5206b03 (hand-overs), 0f171c3 (owner-check fixes), 0e860f4 (clip tool), 443bef8 (status),
e08f086 (governor test), + this report.

## 7. §0 defaults to list in the merge summary
D1-D18 stand as written in the contract §0 (no owner objection yet). Plus two lead calls at the merge: chip names follow the rung
third (Lane A hand-over 1) and one spelling per song (both label-only; the sound is unchanged).

## 8. Gaps / leftovers (for the review and v1.4 Tuning)
- Weakest defaults (Lane S): country Sad waltz / Legion two-step groove 80-88; punk Three-chord sprint hook 68-78 (top only via
  the sliders). Strict variety rule fails for 0-4 % of random careers (the fixed test career passes). partFills only uses `pickup`;
  flavours can replace a recipe's own hat / snare shape.
- Per-chord thirds (a iii / vi chord strums the rung third today; the chips now say so): v1.4 changes `rowPitch` + `o.third` together.
- Lane A accepted: the swapped drummer animates on straight steps; Feel 4 at 220+ bpm squeezes 16th pairs to ~42 ms; rivals / jams /
  bots never swing or fill (D13).
- Lane U: chip long-press preview not built (nice-to-have); a notched 390 phone scrolls the part grid a little (D9); Bigger text
  grows text, not grid rows; Q3 uses the shared confirm dialog (now stacked for long labels).
- Size: +84 KB code + content vs the +80 KB soft budget (gate fine); the build could strip the `/* */` blocks of 02_contracts (52.5 KB in dist) later.
- Not run here: §6 item 8 review pass and item 9 PR / publish; the owner popup (ship / tweak) with the shots + clips above.
