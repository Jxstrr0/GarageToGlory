# v1.1 "Seats" integration report (2026-10-03, branch `v1.1-seats`)

Lead integrator pass: lanes C (render) and A (content) merged on top of D + B + the lead work (51 seat picker, pw_seats).
Contract `plan/plan_contract_1.1.md` §5 Lead, cross-lane hand-overs, §6 checklist items 1-9.

## 1. Merges
| step | commit | result |
|---|---|---|
| merge `origin/wip-v11-c` (52064b2) | 57880fe | no conflicts (dist auto-merged, then rebuilt): 4,398,647 B; node SUITE ALL PASS (29 files) |
| merge `origin/wip-v11-a` (a9ec142) | 8d4b9a0 | no conflicts (dist rebuilt): 4,537,545 B; node SUITE ALL PASS after the sim_legacy fix below |
| handovers | 2caa2e4 | see §2 |
| phoneqa v1.1 sweep | 99167a5 | see §3 |
| seat_scan ALL CAPS LEFT phrases | 7aaec78 | strict seat leak scan green |
| save.test v1.1 round trip | c25e816 | gearLook + arc flags + seat gear survive code + slot |
| string-seat shop buttons 48 px | 46a90a5 | phoneqa green; dist 4,537,988 B |
| status.md, balance file, report | 43f55d6, 4e5c1ad, d8cc463 (+ report commits) | — |

## 2. Hand-overs applied (lead / unowned files)
- **A0** `tests/sim_legacy.test.js`: the bass seat now expects `endings.player.bass[tier]` (its own card, different from the
  drums one); "no v1.0 content uses seatRole" became "on the drum seat no swapped-drummer variant fires" (A's epilogue
  variants use `when.seatRole`).
- **A1** `C.ACH_KINDS` already had seatCareer / soloTooLong / allSeats (lead step 1): the four seat achievements are in
  `content.achievements` (content_seats checks it).
- **A2** the 51 seat cards read `bands.<id>.seatLines[seat]` (checked the copy for all four bands; pw_seats pick asserts the
  swapped member's name on every string card).
- **A3 / C** `src/02_contracts.js` "As merged (v1.1 lanes C render + A content)": R.seatGear / R.instrument, stage.setup
  `{ seat, lineup }`, stage.info() seat / view / camera / drummer / you / boom / mics / seatMode / autoHits, van.info().gigBag,
  carpet.info().you, GG.creator gear functions, 5j openLook seat + testids, every new content key (seatLines, top-level
  seat / swapped, arc_ / fin_ / sw_ cards, shop bySeat + drummerGear, creator.gear, coach bySeat, songReactions kit / bySeat,
  recruits.drummers, drama.fillIns.drums, endings.player per seat, epilogue when.seatRole, seatAchievements). The soloTooLong
  note now says default min 0.3.
- **A4** `src/2a_sim_shop.js` SEAT_GEAR fallback: "Nashville Strings" (a USA place) -> "Rodeo-Grade Strings" (A's content name).
- **Lead (Solo Too Long)** the blurb now reads "play a song where the solo takes over" (fits the 0.3 default; `min` unchanged).
- **C (creator wiring)** found and fixed: 51's Start button never passed the creator's `gearLook` to `GG.creator.prepare`, so a
  new career's "Your gear" pick was dropped. Now `prepare({ ..., gearLook })`; pw_seats pick checks `player.gearLook.shape`.
- **C (55, optional)** `stageData()` passes `seat: state.seat` and `lineup: GG.career.lineup(state)` (the contract's only entry
  point; identical to 42's fallback).
- **Lead (pw_creator)** `seat-next` tap after `btn-intro-next` at both new-career walks (lines 74, 313).
- **pw_seats** garage / stage no longer skip (a missing seat API now fails); pick adds "Customize opens Your gear for the
  picked seat" + the gear pick reaching the career; garage adds Lane A's strict seat leak scan (tests/seat_scan.js) over the
  week UI's visible text on three string seats; stage adds "you hold your instrument, spot camera".
- Not changed (documented as gaps): A5 forceWeek 2 collision, A6 weekly mood chat not seat-aware, D's two open choices.

## 3. Checklist §6

### Node (§6.1, §6.3)
- After each merge and at the end: `node tests/run.js` **SUITE ALL PASS** (30 files; final run on 46a90a5). sim_seats 17,
  content_seats 9, sim_legacy 13, save 21 (now also: a string seat's gearLook, arc flags and seat gear survive a code and a slot).
- v0.9 / v1.0 fixtures migrate as drummers; a string-seat save round-trips (slot + code): save.test.

### Playwright matrix (§6.6): every section of every `tests/pw_*.js`, 390x844 and `PW_VIEW=440x956`
Both sizes ran as one sequential stream each, in parallel with each other and with the balance runs (heavy load).
| file | 390x844 | 440x956 |
|---|---|---|
| pw_bands | bands:hail_damage 59, bands:frost_heave 57, bands:gravel_kings 58, bands:grid_road_ramblers 58, bands:flat 12 | bands:hail_damage 58, bands:frost_heave 58, bands:gravel_kings 57, bands:grid_road_ramblers 58, bands:flat 12 |
| pw_bands_render | bands_render 106 | bands_render 106 |
| pw_creator | creator 34, kit 8, stage 6, meta 12, gear 39 | creator 34, kit 8, **stage 1/6 FAIL***, meta 12, gear 39 |
| pw_drama | drama 19 | drama 19 |
| pw_ending | ten 15, bonus 10, fixture 4, preview 5 | ten 15, bonus 10, fixture 4, preview 5 |
| pw_fans | bandbook 19, fanclub 13 | bandbook 19, fanclub 13 |
| pw_flow | flow 16, flow:punk 16, flow:rock 16, flow:country 16, year 5, code 7, layout 34 | flow 16, flow:punk 16, flow:rock 16, flow:country 16, year 5, code 7, layout 34 |
| pw_garage | garage 109 | garage 109 |
| pw_gig | gig 32, e2e 15, touch 5, double 17, songend 5, sync 14, sync2 11, bridge 17, seat 33 | gig 32, **e2e 1/6 FAIL***, touch 5, double 17, songend 5, sync 14, sync2 11, bridge 17, seat 33 |
| pw_hof | list 20, restore 10, empty 5 | list 20, restore 10, empty 5 |
| pw_label | label 13, studio 30, awards 19, seat 6, sheet 1 | label 13, studio 30, awards 19, seat 6, sheet 1 |
| pw_logo | picker 23, reuse 14, meta 13 | picker 23, reuse 14, meta 13 |
| pw_perf | scenes 18, governor 12, **ratio 1/11 FAIL***, stalls 10, audio 7 | scenes 18, governor 12, ratio 11, stalls 10, audio 7 |
| pw_recap | offer 13, recap 19, recap:bands 15, recap:seat 10 | offer 13, recap 19, recap:bands 15, recap:seat 10 |
| pw_rival | scene 13, botb 16, final 10 | scene 13, botb 16, final 10 |
| pw_seat_audio | voices 19, mute 4, preview 9, noodle 5 | **voices 1/19 FAIL***, mute 4, preview 9, noodle 5 |
| pw_seats | pick 21, write 11, gig 8, studio 6, shop 7, garage 11, stage 4 | pick 21, write 11, gig 8, studio 6, shop 7, garage 11, stage 4 |
| pw_seq | genres 25, voices 8, seq 34, guided 23, audio 42, heavy 22, part 30 | genres 25, voices 8, seq 34, guided 23, audio 42, heavy 22, part 30 |
| pw_settings | settings 52, calib 18, difficulty 17 | settings 52, calib 18, difficulty 17 |
| pw_shop | gear 30, merch 24, space 21, van 23, spaces 17, seat 26 | gear 30, merch 24, space 21, van 23, spaces 17, seat 26 |
| pw_stage | stage 166 | stage 166 |
| pw_title | scene 15, flow 10, prefs 7 | scene 15, flow 10, prefs 7 |
| pw_tour | map 24, tour 27, gong 13, payoff 5 | map 24, tour 28, gong 13, payoff 5 |
| pw_trophies | tab 15, toast 7 | tab 15, toast 7 |
| pw_tutorial | tut_notch hail_damage 6, tut_notch frost_heave 6, tut_notch gravel_kings 6, tut_notch grid_road_ramblers 6, tut_w1:hail_damage 32, tut_w1:frost_heave 32, tut_w1:gravel_kings 32, tut_w1:grid_road_ramblers 32, tut_calib 6, tut_w24 14, tut_skip 11, tut_replay 20 | tut_notch hail_damage 6, tut_notch frost_heave 6, tut_notch gravel_kings 6, tut_notch grid_road_ramblers 6, tut_w1:hail_damage 32, tut_w1:frost_heave 32, tut_w1:gravel_kings 32, tut_w1:grid_road_ramblers 32, tut_calib 6, tut_w24 14, tut_skip 11, tut_replay 20 |
| pw_world | board 14, **van 1/10 FAIL***, **calendar 1/19 FAIL***, drivers 22 | board 14, van 13, calendar 21, drivers 22 |

\* Timing failures under load, each re-run **alone twice and green** (`tests/.cache/reruns.txt`): 390 pw_perf `ratio`
(11, 11), pw_world `van` + `calendar` (13 + 21, twice); 440 pw_creator `stage` (the carpet walk, 6, 6), pw_gig `e2e` (a
van-skip click, 15, 15), pw_seat_audio `voices` (one booking 2.9 ms late, 19, 19). No assertion was changed.
- Opt-in: `META_ONLY=seats node tests/pw_bands_render.js` ALL PASS 46 at 390 and at 440 (contact sheet
  `tests/.cache/v11_seat_sheet*.png`). Viewed once: the seat picker, a rhythm-seat garage, the lead-seat setlist.
- `tools/phoneqa.js` (now also: seat picker, Your gear, lead-seat garage, songwriter part, guitar shop, lead-seat gig; the v1.1
  controls held to 48 px): first 390 run FAILED on the guitar shop's buy buttons (44 px, the v0.8 `.btn.small`); fixed for the
  string-seat shop (48 px; the drum shop unchanged); then **ALL PASS 390x844 and 440x956** (59 audits each).

### Owner rules (§6.8)
- Scanned the whole v1.1 diff (`git diff 829b059 -- src`): no USA place or brand (the one USA name, "Nashville Strings" in the
  2a fallback, is gone), no real gear brands, no gong on the kit (only the rule comments), no share / screenshot / download
  control (one chat line jokes "screenshot or it didnt happen"), no model identifiers in commits or code. New controls >= 48 px
  (pw_seats + phoneqa).

### Leak scans (§6.4)
- `LEAK_YEARS=13 node tests/sim_bands.test.js` (drums): ALL PASS 17.
- `SEAT=all LEAK_YEARS=10 node tests/sim_bands.test.js` (strict): first run FAILED 1/24: Hail Damage rhythm saw a shouting
  review (24 `caps: true`) quote the album "THRONE OF SOD II"; Lane A's LEFT phrase 'Throne of' is case-sensitive. Fix in
  `tests/seat_scan.js`: every LEFT phrase also matches in ALL CAPS (HARD phrases aimed at you still win: "YOUR STICKS" is a
  leak). Re-run: **ALL PASS 24**, zero seat leaks (4 bands x 3 string seats x 3 seeds x 10 years, avg + good bots).

### Balance, drum seat (§6.5)
- `NO_BONUS=1 BAND=all node tools/balance.js 10 30` equals `plan/balance_v10_nobonus.txt` (1.0.1.0) line for line
  (`grep -v '^done in'`); only the header's deck size changes (444 -> 534 cards: the 90 new cards are all seat-gated).

### Balance, string seats (§6.5) -> `plan/balance_v11_seats.txt`
`SEAT=all BAND=all node tools/balance.js 6 30` (1,933 s) and `6 10`. Year-3 values as a share of the same band's drum seat
(30 seeds; "ok" = within ±10 %):

| band | bot | bass fans / fund | rhythm fans / fund | lead fans / fund |
|---|---|---|---|---|
| Hail Damage | avg | 104 / 97 | **90** / 92 | 103 / 102 |
| Frost Heave | avg | **110** / 103 | 102 / 95 | **111** / **111** |
| Gravel Kings | avg | **111** / 94 | 100 / **86** | 106 / **88** |
| Grid Road Ramblers | avg | 107 / 98 | **111** / **135** | 109 / **116** |
| Hail Damage | good | 93 / 96 | 91 / 103 | 90 / **85** |
| Frost Heave | good | 101 / 102 | 102 / 99 | 101 / 101 |
| Gravel Kings | good | 98 / 98 | 92 / 92 | 94 / 103 |
| Grid Road Ramblers | good | 95 / **90** | 103 / 102 | 100 / 91 |

Means over the 12 band x seat cells: avg bot fans 105 %, fund 101 %; good bot fans 97 %, fund 97 %.
**Noise floor** (the drum seat against itself, `SEAT=drums SEED_OFFSET=500 ... 6 30` vs the default seeds): avg bot fans
85-101 %, fund 81-110 %; good bot fans 94-100 %, fund 93-104 %. Every per-cell miss above is inside that seed noise (B saw the
same: up to 19 % drum vs drum). World week: every string seat within 7 weeks of drums; reach differs by <= 17 points (a share
of 30 seeds; the good bot reaches 100 % everywhere).

**Pooled 60 seeds** (default + `SEED_OFFSET=500`, both for drums and for `SEAT=bass,rhythm,lead`; fans / fund % of drums):

| band | bot | bass | rhythm | lead |
|---|---|---|---|---|
| Hail Damage | avg | 109 / 107 | 105 / **112** | **116** / **119** |
| Frost Heave | avg | 109 / 105 | 102 / 94 | 106 / 107 |
| Gravel Kings | avg | 109 / 104 | 99 / 102 | 108 / 104 |
| Grid Road Ramblers | avg | 100 / 109 | 110 / **123** | 110 / **115** |
| Hail Damage | good | 94 / 98 | 93 / 99 | 96 / 95 |
| Frost Heave | good | 96 / 100 | 97 / 102 | 99 / 103 |
| Gravel Kings | good | 98 / 100 | 91 / 91 | 95 / 102 |
| Grid Road Ramblers | good | 95 / 92 | 105 / 102 | 100 / 91 |

- **Good bot: every cell within ±10 %** (91-105 %).
- **Avg bot: a mild upward tilt on string seats** (mean +7 % fans, +8 % fund; 5 cells above +10 %). Not tuned, because no
  seat-specific cause was found and the per-cell values are seed noise-dominated: the same cell swings by 20-30 points
  between the two seed sets (Hail Damage lead: 103 / 102 on the default seeds, 131 / 138 on offset 500, against a drum set
  that itself dropped to 85 %). Ruled out: song quality (200 jams per band x seat: string-seat quality equal or 0.5-4 points
  lower), the 90 new seat cards (smaller deltas than the v1.0 deck: +7 vs +15 fans, -8 vs +9 fund per choice; removing them
  moves Hail Damage lead 3x30 from 103 / 102 to 107 / 99), drama (ultimatums/quits are not lower on string seats), and
  `gig.performance` / `shop.gigBonus` (seat-neutral formulas). **Open item for the review pass / v1.2 Tuning:** a 100+ seed
  run per cell (or a paired-seed comparison) to separate a real avg-bot tilt from noise.

**Live bots** (`LIVE BOTS`, 3 fresh careers per cell): perfect bot accuracy **1.000 on all 64 band x seat x difficulty cells**;
avg bot (0.9, 40 ms) within **-2.4 .. +1.8** points of the drum seat (gate 3). sim_seats ALL PASS 17.

### Size and render (§6.7)
- `dist/game.html` **4,537,936 B** at the perf run, **4,537,988 B** final after the shop fix (gate 5,000,000: ok, ~462 KB headroom); gzip-9 1,332,946 B (gzip -6 1,339,325 B).
  Delta vs stage 0 (4,247,084): **+290,852 B** (planned +660 KB). By lane: D +30,506 · B +72,015 · lead (51 picker) +7,489 ·
  C +41,553 · A +138,898 · integration +443 (final, after the shop fix: +290,904 B in all).
- `node tools/perf.js scenes` + `report` (390x844, SwiftShader): every scene's draw calls / triangles within its gate. Seats line:
  `stage_club_seat_bass` 32 calls, `stage_club_seat_lead` 35 (gate: stage_club 36 x 1.15 = 41.4); `garage_seat_rhythm` 44
  (gate: garage_hail_damage 43 x 1.15 = 49.5). Voice cap holds: peak sources 25 (x1) / 23 (x4) <= 32, tap drops 0, audio
  nodes/s 57 / 56 <= 80.

## 4. Gaps (none blocks the review pass)
1. **Avg-bot balance tilt** on string seats (+7 % fans / +8 % fund on average, 60 seeds; good bot within ±10 % everywhere).
   Analysed above; left for the review pass / v1.2 Tuning (needs a 100+ seed or paired-seed run to separate it from noise).
2. **Owner choices still open (Lane D):** on metal/punk/rock lead your written part replaces the shared rhythm-guitar pair in
   the sections you write; an empty part section is silent. Listed in status.md "What's in v1.1" for the owner summary.
3. **Content (Lane A):** the 12 first-week cards use `forceWeek: 2`, so a future week-2 forced card would collide on string
   seats; the weekly mood chat (20 `postWeeklyChat`) has no swapped-drummer layer; the tutorial's walk / write steps have no
   string-seat twins (sim_lessons' "drum-only steps drop by >= 2" check); drummer recruits get nicknames only.
4. **Cosmetic (Lane C):** Hail Damage bass / lead camera shows the crash cymbal's edge bottom-right; Ramblers rhythm: Clementine
   fills part of the left of the view; the 440 contact-sheet tiles are cropped to 390 px; **new:** in a string-seat garage the
   "Trophies" chip overlaps the "Your rig" chip (top-left, `tests/.cache/seats_garage_rhythm.png`).
5. **Load timing:** the five sections in the matrix footnote can time out when two browsers and a balance run share the
   machine; all green alone twice.
6. Not done here (contract §6 items 6 "review" and 10): the one review pass, the PR `v1.1-seats` -> main, deleting the
   `wip-v11-*` branches, and the owner summary.

## 5. Review fixes (2026-10-03, fixer, on `v1.1-seats`)
Eight confirmed findings fixed, then the 12 minor (unverified) findings checked: all 12 were real; 11 fixed, 1 left by design
(below). Commits `7528d45` .. (this section's commit); each group committed and pushed as it landed.

### Confirmed (8)
1. **2-lane chords went silent / played the fifth's chord** (55 `playSeat`). A chord is ONE sound now: the first lane's tap plays
   the root with its power voicing (no `+7`), the handle is stashed on the note (`n.sh`), the completing tap plays nothing new
   and the hold is kept under the session's hold lane `n.li` (either tap order). Verified with the reviewer's probe (GK rhythm
   Hard, chord [2,3] and [0,1]: one call, the root, no release before the lift) and the new `pw_gig META_ONLY=chord`.
2. **Swapped gate ignored quits** (20 `swappedGate`): `swapped: <id> | [ids]` also needs that member on the kit now
   (`career.drummerId`); `swapped: true` keeps meaning "a string seat" (no content uses it; contract §4.3). `fin()` finales carry
   `swapped: <that band's swapped member>`. sim_seats: quit + recruit per band x string seat -> no `sw_` / `fin_` card, no arc
   line in the departed member's voice.
3. **Quit / return cards were drum-seat only**: `content/zz_seats_drama.js` clones the 12 swapped members' forced ultimatum /
   return / returnFilled cards into kit variants (33 cards: same choices and effects; stick bag, throne, "That's my kit", the
   drum solo, the groove from 1979), `drama.members[id].kit[kind]`; 27 `cardFor` picks them while that member is the swapped
   drummer on a string seat. content_seats forces all three per member and scans for old-instrument words. Wants / grumbles
   stay the content role's (contract §1.1 / §4.1, by design).
4. **UI role labels** (50 `ui.who`): the player's role is the seat ("Bass (you)"; drums unchanged), members show
   `career.stageRole` (the swapped member: "drums"); 58 memberCard, 53 laptop row ("Bass · founder · unfireable"), the practice
   icon, the brochures "on your amp", 59 deal signature "(bass, founder)". New `ui.SEAT_NAME / seatName / seatIcon / seatOf`.
   pw_seats `pick` checks the laptop Band tab on a Hail Damage bass career.
5. **Singing drummer's recruit didn't sing** (spec gap in §4.2): `career.seatRoleFor` gives a drummer recruit hired for a
   singing swapped member's hole (Rox, Chase, Travis Lee on rhythm) `'drums/vocals'`, so `gig.roles().front` is the recruit
   (02_contracts note). content_seats asserts it for FH / GK / GRR rhythm and that a bass-seat recruit just drums.
6. **Old band content showed the swapped member on their old instrument**: a second scan pass (`tests/seat_scan.js` `oldLeak` /
   `swappedNames`: the swapped member's name next to their old instrument's words in one sentence; `OLD_LEFT` / `OLD_SKIP` for
   songwriting words: Benny's two chords, Lenny's riffs) runs in every string-seat career of sim_bands; `tools/seat_audit.js`
   pass 2 (static) is appended to `plan/seat_audit.txt`. Fixes: 34 cards whose premise is the old instrument never draw on that
   member's swap seat (`content/zz_seats_gates.js`: Dana's solo takes / signature guitar, Benny's guitar / third chord / Tokyo
   two-string, Lenny playing riffs on guitar / his signature guitar, Earl's solo, Travis Lee's acoustic, Kenji's bass take,
   Moth's bass booth); ~40 passing mentions reworded seat-neutral in their own files (Kenji packs up, his gear case, the
   heaviest case, Dana does her part / plays in mittens, the court hears both riffs from the band, Jaxon the music teacher, ...).
   The GK riff lawsuit chain stays on the lead seat (reworded), so the "Legally Distinct" trophy stays reachable.
7. **Wrong instrument on the laptop Band tab / card heads**: same fix as 4 (who.role feeds the card heads, van, awards).
8. **Solo / Outro blurbs were drum-seat only**: `shop.sections.*.bySeat` (bass / rhythm / lead), `GG.shop.sectionDef(state, id)`
   used by 5k gear rows + the week-wrap unlock and 54 extraPanel / the guided extra step (tokens filled); "a big finish to
   finish" is now "{drummer} gets a big fill to finish".

### Minor (12 checked)
- Fixed: same-lane hold killed by the other thumb (55: a tap only lets the OLD voice go; a lift ends only the hold its own
  press started, pointers and keys remember their note; held / runs / pointers reset at every count-in); Hail Damage rhythm's
  gtr2 partner cut your tap to 30 ms (22 + 30: a same-voice partner at the head's instant layers on the head's handle,
  `n.with`, so it sounds only on a hit and stops on the lift); a half-tapped held chord rang out (22: a Good, no hold,
  held 0); shop chat posting an alias as you (2a); "you is" grammar (20 `fillText`: a role token that resolves to you takes
  second-person grammar: You buy / you are / your; string seats only, the drum seat reads as v1.0); UI drum words (5h
  difficulty "your chops", calibration "Band sync" / "your notes", 53 / 59 above, shop section blurbs, the spare cymbal is a
  spare pedal, 54 first write tip on a string seat is the drummer's groove); "Needs the the" (2a: string-seat names keep their
  capitals and their own "The"); a silent drummer speaking in the amp toast (5k); the garage "Your rig" chip under "Trophies"
  (41: the label moved right, `R.labelScreenPos`, pw_garage checks the gap on all 12 combos); the cymbal edge on the spot
  camera (42: the kit's crash / ride / hi-hat top hide in the spot view; a near plane could not clip them without clipping
  you); the carpet instrument off frame (44: with an instrument you walk second).
- Left by design: the mixer's "Drums: your taps + the kit" bus label (the bus does carry your taps and the kit on every seat).

### Verification
- `node build.js`: **4,561,121 B** (gate 5,000,000; +23,133 B vs the integration build's 4,537,988).
- `node tests/run.js`: SUITE ALL PASS (sim_seats 20, content_seats 11, sim_gig 24, sim_bands 17, ...).
- `SEAT=all LEAK_YEARS=10 node tests/sim_bands.test.js` (strict, with the new old-instrument pass): **ALL PASS 24**, zero seat
  leaks. `LEAK_YEARS=13 node tests/sim_bands.test.js` (drums): **ALL PASS 17**.
- Playwright, each at 390x844 and `PW_VIEW=440x956`, all green on the first run: pw_gig `seat` 33, `chord` 10 (new), `sync` 14,
  `bridge` 17; pw_seats `pick` 25, `write` 11, `gig` 8, `studio` 6, `shop` 7, `garage` 11, `stage` 4; pw_garage `seat` 73;
  pw_recap `seat` 10; pw_settings `settings` 52, `calib` 18, `difficulty` 17; pw_shop `gear` 30, `seat` 26; pw_seq `seq` 34,
  `guided` 23, `part` 30; pw_drama 19; pw_label `label` 13, `seat` 6; pw_stage 37; pw_flow `flow` 16, `layout` 34;
  `LEAK_STRICT=1` pw_bands `bands`: Hail Damage 58 / 57, Frost Heave 58, Gravel Kings 57, Ramblers 58 / 59, flat 12.
- Probes: the reviewer's rv_chord / rv_ring / rv_legato (Playwright) and rv_halfchord (node) all read fixed (one root voice in
  both orders, no early release; the chorus hold plays 1.143 s; the legato hold rings; a half chord holds 0).
- Screens looked at: the string-seat garage (labels apart), the bass spot camera at a house party (HD, GK: no cymbal edge),
  the carpet (you second, instrument in frame).
