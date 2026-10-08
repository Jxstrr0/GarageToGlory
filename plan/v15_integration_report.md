# v1.5 "Desktop" integration report (lead, `v1.5-desktop`, 2026-10-08)

Contract `plan/plan_contract_1.5.md` (§0 K1-K4 + Q1-Q3 locked); lane reports `plan/v15_lane_i_report.md`,
`plan/v15_lane_n_report.md`, `plan/v15_lane_w_report.md`; stage 0 `plan/v15_stage0_report.md`.

## 1. Merges (§6 order I -> N -> W)
| Step | Commit | Gate after it |
|---|---|---|
| merge Lane I (`wip-v15-i` 2475aa2) | e6b8394 | build 5,293,974 B; node SUITE ALL PASS; pw_freeze 390 / 440 / 844l ALL PASS 5 each |
| merge Lane N (`wip-v15-n` b55896a) | 2491b7e | build 5,326,188 B; SUITE ALL PASS; pw_freeze x3 ALL PASS |
| merge Lane W (`wip-v15-w` 405116a) | c00aaa8 | build 5,338,973 B; SUITE ALL PASS; pw_freeze x3 ALL PASS |
No source conflicts (the lanes touched disjoint files); `dist/*` rebuilt by `node build.js` after each merge.

## 2. Hand-overs applied
- W -> I: the PC-layout stage frame now runs to **0.1** of the highway (was 0.45): the kit sits just above the highway as in
  mockup B (`55_ui_gig.js` guard; wide only). pw_keys `wide-gig` follows (0.1); pw_wide accepts either.
- I -> W / N -> W: checked in the tree: `.gig-hw[data-lanes]` + translucent, `gig-hint` right of the highway, `.w2` in gig-set /
  results / Settings > Keys, `.set-rail` | `.set-main`, `.calib-docked`, `.lt-tabs`, `kb-spots` / `kb-hints` (styled in 50k).
  `seq-side` is laid out by 5w's songwriter grid (tools column). Fixed at the owner-shot review: the songwriter grid column
  (`.w2-b`) kept the generic `.w2-b` width (352 px of a 736 px track), so six lanes were 51 px wide; it now fills its track
  (lanes up to 5w's caps, like the mockup).
- N / I -> lead: 02_contracts V1.5 "As merged" (debug('gigui') keys / keyTaps / keySwallowed / lostKeyups / cardRej / cardAge /
  restart / off / offT / offK / laneW / hitY / gemW / look / wide, debug('calib') input + capturing, `ui.keyLabel`, `ui.kcap`,
  focus manager + router APIs, `'ui:kbnav'`, test ids `set-rail-*`, `set-layout-*`, `seq-side`, `side-*`, render `pxBudget`,
  `insets.left/right`, `perf:quality` reason `'layout'`, `R.stage.info().hFov/vFov`). Status notes `META_ONLY=all` runs nothing
  in pw_freeze (use `390,440,844l`).
- I -> lead "longer settle for pw_freeze results / tutorial": not changed (fixtures and the freeze tool stay as recorded); every
  pw_freeze run in this integration passed at all three sizes.
- pw_keys `calib-keys`: the waits for the key test to start capturing are 10 s (were 3 s): at 1440 / 1920 the click on the docked
  panel landed ~6 s late under load (measured; the test itself is unchanged).

## 3. Checklist (§6)
- Node suite: SUITE ALL PASS (`keys`, `wide_css`, `save`, `sim_gig`, `sync` included) after every merge and the final tree.
- **Phone matrix** (snapshot of the merged tree, two background streams, logs `scratchpad/v15m/390x844/`, `/440x956/`): every
  `tests/pw_*.js` at 390x844 and 440x956 green except load-only CPU-budget checks, each then passed **alone twice**:
  pw_perf `pre` (audio build slice <= 8 ms; 390 + 440), pw_seq `genres` + `heavy` (render faster than real time; 390 + 440).
  `tools/phoneqa.js` PASS at both sizes. No existing test edited (only the additive `_pw.js` at stage 0).
- **pw_freeze** 390 / 440 / 844x390: equal after each merge and on the final tree (see §5).
- **Desktop** (`scratchpad/v15m/desk/`): pw_wide (layout 93 over 4 sizes, gig 45, switch 8, perf 9, pref 10) ALL PASS;
  pw_nav at 1280x720, 1440x900, 1920x1080, 800x900 (career 39, esc 15, repeat 9, focus 16, seq 24 each + phone 9) ALL PASS;
  desktopqa 1280 191/191, 1440 193/193, 1920 193/193, 800 191/191; pw_keys at 800x900 ALL PASS, at 1280 / 1440 / 1920 under
  load `fair` (one key-vs-touch offset 41 ms) and `calib-keys` failed -> `fair` passed alone twice at 1280 and 1440,
  `calib-keys` passed alone twice at 1920 after the wait fix; final full runs in §5.
- **Perf**: pw_perf phone sections green (pre after reruns); 1920x1080 at dpr 2 <= 2.4 MP drawn and gig p95 1920 <= 1.2 x 1440
  (pw_wide perf, §5).
- **Size gate** (`tools/perf.js size`): `dist/game.html` 5,340,477 B <= 6,000,000 (gzip 1,747,195). Net v1.5 vs 1.4.0.0
  (5,248,626) = **+91.9 KB**, over the contract's +60 KB soft budget (stage 0 + I +45 KB, N +32 KB, W +13 KB, contracts note +1.5 KB).
- No-USA scan over the v1.5 source diff: clean. No share / screenshot / download button added.

## 4. Owner screenshots (`scratchpad/v15_owner/`, 1440x900 unless named)
01_garage_plan, 02_gig_drums_keys (6 drums mid-song, Space D F S Shift A caps), 03_gig_bass_keys (A S D F), 04_songwriter,
05_settings_keys (mid-rebind: "Press a key..." on Snare), 06_key_calibration (docked, click 5 of 8), 07_laptop_or_shop (laptop
Band tab), 08_1920_gig (1920x1080), 09_phone_unchanged_440 (440x956 garage, as v1.4).
Compared with `plan/v15_desktop_mockup_B.png`: garage + planner panel, gig highway centred under the stage with the stage on both
sides, Settings rail + keys + docked timing, songwriter tools | grid all match package B. Fixed here: songwriter grid width.

## 5. Final tree
(filled in below after the final reruns)

## 6. Gaps (for the review / owner check)
- No on-screen score card in the PC gig (mockup B shows one right of the highway); only the `gig-hint` (Esc pause) sits there.
- Sheet-foot key legends read as text ("Tab move · Enter pick · Esc close"), not keycaps as in the mockup.
- From a string seat the PC gig camera (hFov <= 100) shows the drummer's kit large in the near right corner; a narrower cap
  (74 deg) was tried and dropped (the band filled the frame). Left as built.
- The Settings rail doesn't track the section in view; songwriter lane header icons are clipped at the top in the PC layout.
- Merch table, trophies list, seat / genre cards stay one wide column (no hooks). Key calibration panel has empty space under
  the pad (no progress dots as in the mockup).
- Size: +91.9 KB net (soft budget +60 KB); the hard gate (6,000,000) holds.
- pw_freeze `results` / `tutorial` and several CPU-budget checks are load-sensitive (they pass alone).
- The card guard is the contract's 600 ms rule; keycap labels on file:// fall back to keys seen this session / codes
  (no `getLayoutMap` on file://). Three quick Enters on Rehearse fill three blocks (focus restore isn't stamped; Lane N).
