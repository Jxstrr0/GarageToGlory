# v1.3.1 "Simulate" integration report (lead, branch `v1.3.1-simulate`, 2026-10-04/05)

## 1. Merges + hand-overs
- `5a040fb` merge Lane G (`wip-v131-g` @ 73781e3: Simulate this gig) -> `a01dd59` merge Lane S (`wip-v131-s` @ 7824f2c: Gear
  shop label + sketch-pad shop button) -> `216ad65` dist rebuilt; node suite ALL PASS (incl. compat_v12, STAGE0, save, sim_gig);
  Classic `META_ONLY=hash` pw_seq 232/232.
- `d611141` hand-overs in `src/02_contracts.js` V1.3.1 block (comment only): gig.simReason / simShow, state.liveGig.sim, ui.gigSimMs,
  testids btn-gig-sim / gig-sim-no / gig-sim-why / gig-sim-progress / gig-simulated, debug('gigui').sim; Lane S labelBox, the
  green #57c77a px 22 "Gear shop" label, the 0.35 s wait for a hotspot tapped where you stand. `f1e8393` status; `b059906` +
  the next commit: this report (after a container restart at ~23:05 UTC cut the first matrix run).
- Files vs main `d085cc3`: src 00_shell, 02_contracts, 10_save, 22_sim_gig, 41_render_garage, 52_ui_week, 54_ui_sequencer,
  55_ui_gig; tests pw_bands_render, pw_garage, pw_gig, pw_seats, pw_seq, pw_shop, save, sim_gig (834+ / 35-).

## 2. Checklist (plan §3, release)
- Build: `node build.js` -> V1.3.1.0, 99 modules, **5,236,063 B** (gate <= 6,000,000: `tools/perf.js size` ok; gzip-9 1,714,566 B).
- Full Playwright matrix (every META_ONLY section of every `tests/pw_*.js`, 113 sections per size), two streams in parallel
  (390x844 + 440x956), logs in the lead scratchpad `v131m/logs/`:
  - 390x844: 109 / 113 PASS first time; 440x956: 110 / 113 PASS first time.
  - New v1.3.1 sections green at both: `pw_gig simulate` 18/18, `pw_garage shop` 101/101, `pw_shop button` 23/23,
    `pw_seats shop` 27/27, `pw_bands_render` (C.HOTSPOTS), `pw_seq` layout (sketch heads) 67 / 73, e2e + gig (Start the show) green.
  - First-run failures (timing / stalls under two parallel browsers; none in v1.3.1 code), each PASSED ALONE TWICE:
    390: `pw_seq heavy` (xRT 0.83 < 1), `pw_gig sync` (a 65 ms "good"), `pw_flow bands` (punk: btn-create click stalled),
    `pw_world van` (a road sheet over Skip the drive); 440: `pw_seq heavy` (xRT 0.79), `pw_gig sync`, `pw_seat_audio voices`
    ('now' 11.6 ms off once). Alone: 22/22, 14/14, 51/51, 13/13, 19/19 twice at their size.
- pw_perf (scenes, governor, ratio, stalls, audio, pre, quick), alone, one size at a time: 7/7 PASS at 390 and at 440.
- Node suite on HEAD: `node tests/run.js` SUITE ALL PASS (35 suites; compat_v12 10, save 22, sim_gig 36, sim_audio 44 incl.
  STAGE0 fingerprints). Classic `META_ONLY=hash` pw_seq 4/4 at both sizes (232/232, `216ad65`).
- `tools/phoneqa.js` at 390x844 and 440x956: ALL PASS (no horizontal scroll, no button under 44 px, gig setlist with the Simulate
  row: small [] / overflow []; sketch pad with the 🛒 Shop button: small []).

## 3. Owner check shots (440x956; scratch `v131_owner/`, not committed), looked at each
- 01_garage_drums: green "Gear shop" under "Drum kit", clear of the merch pile, all 8 labels readable.
- 02_garage_bass: "Gear shop" in the amp corner under "Your rig".
- 03_rig_shop_button: sketch pad (Quick song, bass) header: 🛒 SHOP 52x44 with the green ring between the title and ⋯.
- 04_gear_sheet: a real tap on the garage label -> walk -> Bass shop sheet (amp ladder, "Back to your rig").
- 05_gig_simulate_button: Legion Hall setlist: [Auto-pick] [⏩ Simulate this gig] + "Plays it at your recent level: ~83% hits"
  above Start the show.
- 06_gig_simulated_result: "B Solid set." + "⏩ Simulated at your average (last 3 gigs, 83% hit)", pay / fans / buzz applied.
- 07_showdown_no_simulate: rival showdown setlist: no Simulate button, "Showdown night. This one you play."
- No layout problems found; no re-takes.

## 4. Gaps (from the lanes; for the review)
- G: the Perfect share of a steady-but-late player comes out a few points high (hit rate matches within ±0.05); a simulation
  cannot be cancelled once started (D4/D8); a short set can miss your average by up to half a note per song (whole gig ~2 pts).
- S: the label reads "Gear shop" on every seat (D6), no cart icon at px 22; draw calls +1 measured by hand (hail_damage garage
  43 -> 44 at 440), the tests check 8 labels and < 60 draw calls; every hotspot tapped where you already stand now opens 0.35 s
  later (the ghost-click fix; tutorial / perf / flow tests green).
- Lead: matrix sections pw_seq hash / seq / part / layout ran on this exact dist before the container restart (22:54-23:05 UTC)
  and were not run again; the rest ran after it.

## 5. Next
- Review (<= 3 lenses: compatibility, determinism, layout); owner check of the 7 shots; PR to `main`.

## 6. Review fixes (fixer, 2026-10-05, on `v1.3.1-simulate`; commits `8f4f05b`, `e1c5208`)
- CONFIRMED (major) simReason blocked a regular gig in any week with a rival `pending` entry: fixed in 22. Only an entry that
  rides on your gig blocks now: an unresolved `sameNight` (R.shape splits the crowd and the verdict shows) or the `final`
  (`kind` + `status !== 'done'`, the same test R.shape uses). A passed or offered BotB, an unbooked festival listing, a stolen
  slot (settled when it is scheduled) and a poach card leave the gig regular, so Simulate shows (owner A2). Story shows stay
  blocked by `g.showdown` / `g.festival`. 02_contracts text updated. Tests: sim_gig `canSimulate` now has sameNight/final =
  'rival', plus 8 non-blocking kind/status pairs = null (this replaces the stolenSlot = 'rival' case, which tested the wrong
  intent), and a new real-week flow per rival kind (startWeek, R.schedule, pass, book a listing, runWeek, simReason, simShow,
  finishGig: simulated, no showdown, no new state.showdowns). pw_gig simulate: same-night week = note, passed-BotB week = button.
- MINOR Simulate line (fixed): the setlist now says "Plays it at your recent level: ~83% hits (last 3 gigs). Pay, fans and buzz
  count as usual." / band level "..., until you've played 2 gigs yourself. ..." The progress card keeps the short form.
- MINOR sketch-pad name cut (fixed): `.seq-head.wrap-title` (sketch editor only, beside 🛒 Shop) lets the name use two lines at
  16 px (Bigger text 16.5 px) inside the 48 px head. Cut names out of the 190 in the title pools: 390 104 -> 5, Bigger text
  116 -> 7, 440 54 -> 0. The 5 still cut are 38-45 character names with a bracket, cut with an ellipsis on line 2. Quick song
  is unchanged. pw_seq layout: every 30-36 character name in the pools reads whole in the sketch editor for each seat, both
  sizes, with and without Bigger text.
- MINOR SHOP label (fixed): `html.gg-big .seq-shop .t` 10.5 px. btn-gig-auto is nowrap, so 'Auto-pick' no longer splits at
  its hyphen.
- Verify (dist 5,237,340 B): node build; `node tests/run.js` SUITE ALL PASS (sim_gig 37). At 390x844 and 440x956: pw_seq
  hash 232/232 (4/4), layout 75 / 81, seq + quick + seq-compat; pw_gig simulate 21/21, sync 14/14; pw_garage 223; pw_shop all
  7 sections. pw_rival 390 (scene, botb, final) pass. phoneqa ALL PASS at both sizes. All first runs, no reruns.
- Owner shots retaken at 440 (same names) and looked at: 03 unchanged (Quick song head), 05 shows the new line on two short
  lines above Start the show, 06 unchanged ("⏩ Simulated at your average (last 3 gigs, 83% hit)"), 07 "Showdown night. This
  one you play." with Auto-pick on one line. A scratch 390 editor shot shows a long name on two lines beside SHOP.
