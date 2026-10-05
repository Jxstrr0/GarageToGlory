# v1.3.1 "Simulate" integration report (lead, branch `v1.3.1-simulate`, 2026-10-04/05)

## 1. Merges + hand-overs
- `5a040fb` merge Lane G (`wip-v131-g` @ 73781e3: Simulate this gig) -> `a01dd59` merge Lane S (`wip-v131-s` @ 7824f2c: Gear
  shop label + sketch-pad shop button) -> `216ad65` dist rebuilt; node suite ALL PASS (incl. compat_v12, STAGE0, save, sim_gig);
  Classic `META_ONLY=hash` pw_seq 232/232.
- `d611141` hand-overs in `src/02_contracts.js` V1.3.1 block (comment only): gig.simReason / simShow, state.liveGig.sim, ui.gigSimMs,
  testids btn-gig-sim / gig-sim-no / gig-sim-why / gig-sim-progress / gig-simulated, debug('gigui').sim; Lane S labelBox, the
  green #57c77a px 22 "Gear shop" label, the 0.35 s wait for a hotspot tapped where you stand. `f1e8393` status.
- Files vs main `d085cc3`: src 00_shell, 02_contracts, 10_save, 22_sim_gig, 41_render_garage, 52_ui_week, 54_ui_sequencer,
  55_ui_gig; tests pw_bands_render, pw_garage, pw_gig, pw_seats, pw_seq, pw_shop, save, sim_gig (834+ / 35-).

## 2. Checklist (plan §3, release)
- Build: `node build.js` -> V1.3.1.0, 99 modules, **5,236,063 B** (gate <= 6,000,000: `tools/perf.js size` ok; gzip-9 1,714,566 B).
- Full Playwright matrix (every META_ONLY section of every `tests/pw_*.js`, 113 sections per size), two streams in parallel
  (390x844 + 440x956), logs in the lead scratchpad `v131m/logs/`:
  - 390x844: 109 / 113 PASS first time; 440x956: 110 / 113 PASS first time.
  - New v1.3.1 sections green at both: `pw_gig simulate` 18/18, `pw_garage shop` 101/101, `pw_shop button` 23/23,
    `pw_seats shop` 27/27, `pw_bands_render` (C.HOTSPOTS), `pw_seq` layout (sketch heads) 67 / 73, e2e + gig (Start the show) green.
  - First-run failures, all timing under two parallel browsers, none in v1.3.1 code: reruns alone in progress.
- pw_perf (scenes, governor, ratio, stalls, audio, pre, quick), alone, one size at a time: in progress.
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
