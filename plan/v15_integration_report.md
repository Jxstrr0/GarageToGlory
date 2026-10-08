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

## 5. Final tree (after the hand-overs + fixes; logs `scratchpad/v15m/final/`)
- Node SUITE ALL PASS; build 5,340,477 B.
- pw_freeze 390 / 440 / 844l ALL PASS 5 each (phone layout equal to the 1.4.0.0 fixtures).
- pw_keys full at 1280x720, 1440x900, 1920x1080: all 10 sections ALL PASS at each size (keys 67, fair 17, stuck 9, space 9,
  esc 5, blur 6, rebind 22, calib-keys 9, phone 8, wide-gig 40).
- pw_wide perf alone x2: 2.40 MP drawn at 1440 + 1920 dpr 2; gig p95 1920 416.7 / 433.3 ms <= 1.2 x 1440 466.7 ms (headless
  software GL; one earlier run under load missed the ratio, as Lane W also saw).
- pw_perf at 1920x1080: quick 3, scenes 18, governor 12, ratio 11, stalls 10, audio 7, pre 9 ALL PASS.
- pw_seq genres + heavy alone x2 at 390 and 440 ALL PASS; pw_perf pre alone x2 at 390 and 440 ALL PASS; pw_keys fair alone
  x2 at 1280 and 1440 ALL PASS.

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

## 7. Review fixes (fixer, 2026-10-08; commits 533082a..HEAD on `v1.5-desktop`)
**CONFIRMED (major) - PC gig camera zoomed into the middle of the band window, the player's kit behind the highway: FIXED.**
42 `frame()` keeps the uncapped fov (`tU`) and `zk = tU / tFull`; when the PC-only hFov <= 100 cap zooms in (zk > 1) the
band's bottom edge is pinned to the frame bottom (`camOffY = H/2 - (top + bandH - zk*bandH/2)`) and the overflow is cropped at
the top behind the song header. Only inside the existing `GG.ui.wide()` gate (phones: zk = 1, framing unchanged; freeze equal).
Measured (drummer, 'kit' camera): head / torso / throne y vs highway top: 1280 298 / 346 / 407 vs 358; 1440 388 / 442 / 511 vs
452; 1920 454 / 525 / 618 vs 546 (was 356 / 410 / 465 at 1280). Bass seat ('spot' camera) 1440: head 298, torso 372 vs 452.
The throne / kick still sit at the band window's bottom edge (the 10 % guard band the uncapped framing also uses).
New: `stage.info().you2d` { head, torso, seat } (screen y, null for the spectator camera); pw_wide `gig` now runs 4 + 6 drums
and a 5-string bass and asserts head + torso above the highway at 1280 / 1440 / 1920 (the old code fails it at every size).

**MINORS**
| # | finding | outcome |
|---|---|---|
| 1 | tablet + trackpad gets the PC layout | fixed: Auto layout and the start mode 'keys' also need no `(any-pointer: coarse)` (50b `deskAuto`, live); gg-desk unchanged, so Settings > Layout can still pick PC |
| 2 | gig contextmenu block covered the whole show on phones | fixed: the root block only when the song is on keys or on a computer; touch phones keep 1.4 (only the canvas blocks it) |
| 3 | CSS lint misses unprefixed v1.5 classes in other files | fixed (pw route): pw_keys `phone` asserts no `.kcap .gig-keys .gig-pause-keys .gig-hint .set-keys-* .set-key-chip .kb-spots .kb-hints .calib-docked` in the phone DOM (garage, settings, setlist, pause) |
| 4 | arrows dead on the pause card with nothing focused | fixed: 50k `move()` falls back to the first control that way inside the screen's `def.keysIn()` card (55: pause card / between-songs card); pw_keys `esc` asserts ArrowDown reaches Resume / Restart |
| 5 | kb-hints 'Esc close' on sticky screens | fixed: `ui.escActs(e)` (50k, mirrors `back()` without acting); syncHints shows 'Tab move · Enter pick' where Esc does nothing |
| 6 | AZERTY labels wrong on the first legend / Keys view | fixed: the layout map lives in 50b (`GG.input.askLayoutMap / layoutMap`), asked at boot on a computer, re-asked on `layoutchange`; emits `input:layoutmap`, gig-set + Settings re-render on it |
| 7 | learned labels record shifted symbols | fixed: no learning from a Shift-held non-letter |
| 8 | L / R Shift both 'Shift' | fixed: `P.keySides(s, code)` + `P.keyLabel(.., sides)` -> 'L Shift' / 'R Shift' (Ctrl, Alt, Meta) only when both sides are bound; keys.test pins it |
| 9 | string legend vs Settings names / colours | fixed: legend names by map slot (Low 2nd 3rd 4th 5th Top, as Settings), Settings colours each string slot by the lane it plays on your rig (as the highway / legend) |
| 10 | garage copy says 'tap' to keyboard players | fixed: on a computer in keys mode the dock hint + week-1 toast say "Press 1–8 to walk to a spot, or Enter for the big button"; tutorial text gets 'click' on a computer (`ui.tapWords`, render-time) |
| 11 | 50b typing() treats sliders / checkboxes as text | fixed: 50b `typing` and 55 `typingIn` use ui.isTyping's rule |
| 12 | keycaps under the gems on the hit line | fixed: under G.caps the cap sits under the hit line (H-21), the lane name moves to the zone's top edge; touch drawing unchanged |
| 13 | 'Esc pause' card off the right edge after a mid-song shrink | fixed: hidden below 1000 px in the PC layout (fits at >= 1000 for 4-6 lanes) |
| 14 | 'Phone speaker' / 'tap' wording on desktop | fixed: 'Speaker' on a computer; setlist 'tap to add', title hint use `ui.tapWords` ('click'); phone strings byte-identical |
| 15 | 1280x720 planner room 210 px, labels overlap | partly: `@media (max-height: 800px)` tightens the sheet head + foot (panel 416 -> 378 px, room +38 px); labels no longer cover each other but Drum kit / Gear shop still touch. A label de-overlap pass is left for later |

**Verification (final tree):** node build 5,345,933 B (size gate <= 6,000,000; gzip 1,748,938), SUITE ALL PASS (keys 13).
pw_freeze 390 / 440 / 844l ALL PASS 5 each. Phone (390x844 + 440x956): pw_gig, pw_settings, pw_tutorial, pw_garage, pw_title,
pw_nav, pw_keys phone, phoneqa ALL PASS, except pw_gig `sync` at 440 under a parallel desktop run (one 10 ms-late snap) ->
passed alone twice. Desktop: pw_wide (all sections, 4 sizes), pw_nav (4 sizes), pw_keys at 1280x720 / 1440x900 / 1920x1080 /
800x900, desktopqa at the 4 sizes ALL PASS. Owner shots 01, 02, 03, 05, 08 re-taken (`scratchpad/v15_owner/`, same names):
the drummer's head and torso now above the highway at 1440 and 1920, keycaps readable under the hit line.
