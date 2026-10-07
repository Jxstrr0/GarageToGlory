# v1.5 Lane I (INPUT) report — branch `wip-v15-i` (2026-10-07)
Files: `src/55_ui_gig.js`, `src/5h_ui_settings.js`, `tests/pw_keys.js` (new). Nothing else edited (dist rebuilt).
## APIs as built
- 55 (§4.3): window capture `keydown`/`keyup` + window `blur` while a show exists (after GG.input's capture slot). Frozen at
  count-in (`freezeKeys`): `G.kind`, `G.kmS`/`G.keymap` (`P.keysFor`), `G.input` (`GG.input.mode()`), `G.off` = `G.offK|offT`,
  `G.visM = G.off.visM`, `G.caps`, `G.capL` (labels). `readPrefs` keeps both timings (`P.offsets(pf,'touch'|'keys')`).
  `tapTime(stamp, src)`: Classic subtracts `offK.audio` for `'key'`, `offT.audio` otherwise; sync subtracts nothing; key taps
  feed `G.disp` (D4). Resolve = `P.keyLane` (lane / -1 swallowed / v1.4 col via `col()` / native). Ids = `code || codeOf(key)`;
  repeat ignored; a down id pressed again = lost keyup (lifted first); synthetic events never enter the down-set.
  Esc pause / pause-card Esc+Enter resume (stopPropagation); Tab + Ctrl/Cmd S D F P prevented; Meta / blur / pause (every cause)
  / count-in / song end / teardown -> `releaseAll()`; blur on keys (or a key tapped) -> `pause(false)`; `contextmenu` blocked on
  the whole gig layer. Cards: `armCard(testid)` (600 ms; Enter/Space down+up swallowed before it, repeats always; focus
  `btn-gig-next`/`btn-gig-done` on keys or `gg-kbnav`). `GG.input.gigLive(true)` at count-in / un-pause, false at pause, song
  end, teardown; `'gig'` + `'gig-results'` defined `focus: false`; activeElement blurred at count-in and resume.
- Keycaps in the zones (cached in buildBg) when `G.caps`; legends `gig-keys` (+ `gig-keys-change` -> settings tab keys),
  `gig-pause-keys`, `gig-hint` (PC layout + caps). `ui.keyLabel(code)` (getLayoutMap > learned > code), `ui.kcap(text)`.
- B hooks: `.gig-hw[data-lanes]` + `--lanes`, wide gems `min(laneW-20,100)`, translucent highway (+ destination-out top fade),
  `setFrame.bottom = H - hw.top - 0.45 hw.h` when wide, `ui:wide` -> layout()+guard()+hint+redraw in every mode, `.w2 > .w2-a|.w2-b`
  in gig-set / gig-results (PC layout only; the phone DOM is unchanged), CSS `#gg-gigkeys-css` (`.kcap`, `.gig-keys`, `.gig-hint`).
- debug('gigui') += `keys { kind, map, input, caps, labels, down, held, last }`, `keyTaps`, `keySwallowed`, `lostKeyups`,
  `cardRej`, `restart`, `off`, `visM`, `offT`, `offK` (ms), `laneW`, `hitY`, `hwW`, `hwH`, `gemW`, `look`, `wide`.
- 5h (§4.7): `#set-keys` between Play and Audio (showKeyUI only): kind seg, 6 chips (lane colour, name, keycap; past-gear
  dimmed), `GG.input.capture` rebind next tick (Esc / click elsewhere / 8 s / closing Settings cancel; refused keys keep it
  waiting: "Tab is for menus — pick another key"), swap message, pos note, Sticky Keys note, reset, timing card +
  `set-calibrate-keys`; Layout seg (`set-layout-*`, + row testid `set-layout`). Calibration `calib-input-touch|keys`; key steps
  via capture (fresh keydowns, `ev.timeStamp`, Esc stops), save `P.setCalib(p, o, 'keys')`; debug('calib') += `input`,
  `capturing`. B: `nav.set-rail` (`set-rail-<sec>`) + `.set-main` in `.set-wide`, timing card in `#set-keys .w2 > .w2-b`,
  `.calib-docked` on the calib layer + Settings kept un-hidden under it; CSS `#gg-set-keys-css`.
## Tests (results: see the bottom section)
## Hand-overs
## Gaps
