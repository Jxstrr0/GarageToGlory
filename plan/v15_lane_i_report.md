# v1.5 Lane I (INPUT) report — branch `wip-v15-i` (2026-10-07)
Edited: `src/55_ui_gig.js`, `src/5h_ui_settings.js`, `tests/pw_keys.js` (new), this report, dist (rebuilt). Nothing else.
## APIs as built
- 55 §4.3: window capture keydown/keyup + window blur while a show exists. Frozen at count-in (`freezeKeys`): `G.kind`,
  `G.keymap`, `G.input` (GG.input.mode()), `G.off` = `G.offK|G.offT` (readPrefs keeps both), `G.visM = G.off.visM`, `G.caps`.
  `tapTime(stamp, src)`: Classic subtracts offK.audio for `'key'`, offT.audio else; sync nothing; key taps feed `G.disp` (D4).
  Resolve `P.keyLane`; ids `code || codeOf(key)`; repeat ignored; a down id pressed again = lost keyup (lifted first); synthetic
  events never enter the down-set; a string hold lasts until that id's keyup (another down id on the lane takes it over).
  Esc pauses; pause card Esc / Enter (nothing or Resume focused) resume, the rest native. Tab + Ctrl/Cmd S D F P prevented;
  `releaseAll()` on Meta, blur, every pause, count-in, song end, teardown; blur on keys (or a key tapped) -> `pause(false)`;
  contextmenu blocked on the gig layer. `armCard`: 600 ms, Enter/Space down+up before it and repeats swallowed, then
  btn-gig-next / btn-gig-done focused on keys or gg-kbnav. gigLive true at count-in / un-pause, false at pause / end / teardown;
  activeElement blurred at count-in + resume; `'gig'`, `'gig-results'` have `focus: false`. `ui.keyLabel(code)`, `ui.kcap(t)`.
- Keycaps in the zones (buildBg) when `G.caps`; legends `gig-keys` (+ `gig-keys-change` -> settings tab keys), `gig-pause-keys`,
  `gig-hint` (PC layout + caps); CSS `#gg-gigkeys-css` (`.kcap`, `.gig-keys`, `.gig-hint`).
- B hooks: `.gig-hw[data-lanes]` + `--lanes`, gems `min(laneW-20,100)`, translucent highway, stage frame bottom at 0.45 of the
  highway, `'ui:wide'` -> layout/guard/hint/redraw in every mode, `.w2 > .w2-a|.w2-b` in gig-set + gig-results (wide only).
- debug('gigui') += `keys {kind,map,input,caps,labels,down,held,last}`, keyTaps, keySwallowed, lostKeyups, cardRej, cardAge,
  restart, off/offT/offK (ms), visM, laneW, hitY, hwW, hwH, gemW, look, wide. debug('calib') += input, capturing.
- 5h §4.7 (showKeyUI only): `#set-keys` (Play | Keys | Audio): kind seg, 6 chips (past-gear dimmed), rebind via capture next
  tick (Esc / click elsewhere / 8 s / closing Settings cancel; refused keys keep waiting: "Tab is for menus — pick another key"),
  swap message, pos + Sticky Keys notes, reset, timing card + `set-calibrate-keys`; Layout seg (`set-layout-*`, row `set-layout`).
  Calibration `calib-input-touch|keys` (starts on mode()); key steps via capture (fresh keydowns, ev.timeStamp, Esc stops),
  saved with `P.setCalib(p, o, 'keys')`. B: `nav.set-rail` (`set-rail-<sec>`) + `.set-main` in `.set-wide`, timing card in
  `#set-keys .w2 > .w2-b`, key calib from it gets `.calib-docked` and Settings stays visible (inert) under it.
## Tests (machine shared with other lanes: load 6-22)
- Node suite SUITE ALL PASS. Build 5,293,974 B (+28.4 KB). pw_keys 1280x720 all 10 sections ALL PASS: keys 67, fair 17 (Drum
  sync on/off), stuck 9, space 9, esc 5, blur 6, rebind 22, calib-keys 9, phone 8 (390 phone ctx), wide-gig 34 (1280/1440/1920,
  4+6 lanes). keys/space/esc/rebind also PASS at 1440x900, 1920x1080, 800x900 (first space/esc/rebind fails were test timing
  under load 17-22, fixed in the test, then 2 passes).
- pw_freeze 390 / 440 / 844l EQUAL (no META_ONLY: `META_ONLY=all` runs nothing). Under load `results` + `tutorial` differ at
  random: same diffs on the untouched stage-0 build (2 of 3 runs at 440), so not this lane.
- Phone matrix (all sections of pw_gig, shop, settings, seats, rival, label, tutorial, flow, title + phoneqa): 390x844 54/54 +
  phoneqa PASS (pw_shop space timed out once at load 17, then 2 passes alone). 440x956: RESULT440
## Hand-overs
- W: size `html.gg-wide .gig-hw[data-lanes]` per B, `.gig-hw` background transparent, place `.gig-hint`, style `.w2`, `.set-wide`
  (rail | main), `.calib-docked`; pw_keys wide-gig checks B bounds once 5w is in the tree.
- N: `.kcap` can be the shared keycap; pause-card arrows are the router's (pw_keys esc falls back to focus()); 55 stops Esc /
  Enter on the pause card before the router. Lead: 02 "as built" (debug fields, ui.keyLabel/kcap, set-rail-*, set-layout).
## Gaps
- B bounds unverified until 5w. Card arm is D7 exactly (a Space 600 ms after a card is fresh: it clicks). No getLayoutMap on file://.
