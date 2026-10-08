# v1.5 Lane N (NAV) report — menus on the keyboard (contract §4.5, §5 Lane N; branch `wip-v15-n`)
Files: `50_ui_core` (focus manager), new `50k_ui_keys` (router, KEY_BACK, gg-kbnav, ring / kb-spots / kb-hints / Esc-cap CSS),
`51` (title default, coldopen default, intro/seat Esc, creator back fn, frameTitle on `ui:wide`), `52` (kb-spots, digits order,
results Skip -> OK focus, `.w2` planner / card / results / wrap), `53` (`.lt-tabs`, PC layout only), `54` (grid keys, dirty + back
fn, B tools column), `56` / `5k` (`.w2`), `5j` (look back fn); `tests/pw_nav.js`. Nothing else touched.
## APIs as built
- Router (50k): §4.5 order 0-7. Repeat guard: Enter/Space/Esc `ev.repeat` swallowed (not Space/Enter while typing); stale:
  Enter/Space keydown with `timeStamp < ui.focusAt + 200`; keyup whose keydown was on another element swallowed. Esc order:
  confirm No -> `def.back` -> KEY_BACK (before the sticky check, so calib / recap get theirs) -> STICKY list + `def.sticky` ->
  sheet/modal close -> a full screen's btn-back / btn-close -> garage ☰ -> title / end nothing. Arrows: rect-nearest in the top
  layer + `.tut-card` (range / select / `[data-keys=own]` keep theirs). Tab trap (nothing open: HUD -> dock -> kb-spots).
  Digits by `ev.code` (Digit/Numpad 1-8) -> `ui.walkToSpot(action)` (3D walk, else `'hotspot'`). `gg-kbnav` on real
  Tab/arrow/Enter/Esc/digit, off on pointerdown; event `'ui:kbnav' { on }`. `ui.setKbnav`, `ui.keyBack()`, `debug('keys')`
  `{ top, focus, opener, lastEsc, nav, kbnav, swallowed: { repeat, stale } }`.
- Focus (50, no-op without gg-kbnav): `def.back | focus | hints`; `ui.focusDefault(id?)`, `ui.defaultFocus(e)` (autofocus ->
  def.focus -> foot .btn.primary -> first button, ←/✕ last), `ui.focusEl(n, { nav, preventScroll })`, `ui.focusAt`, `ui.kbnav()`,
  `ui.isTyping(n)`, `ui.reachable(n)`, `ui.noFocus(id)` (gig / gig-results built in + `focus:false`), `ui.openerOf()`,
  `ui.syncHints()`, `ui.w2(node, nLeft)`. Danger confirm starts on No. A render restore onto the same testid is not stamped
  (deviation from "render restore stamps": three quick Enters on Rehearse must fill three blocks).
- 54: grid `role=grid`, `data-keys=own`, gridcells + aria-selected + roving tabindex (`D.kbFocus` = `D.view.focus`), only when
  `GG.input.showKeyUI()` (a plain phone keeps the 1.4 DOM); ←/→ lane, ↑/↓ step, Home/End, PgUp/PgDn ±4, Space/Enter via the tap
  path (`grid._toggle`: kick rule, partV2, preview). Dirty = an edit (`D.dirty`, set in `changed()` + title) AND pattern/title
  differ from the open snapshot; `ui.seqDirty()`, `debug('seq').dirty / kbFocus`. Creator / look: snapshots (`ui.creatorDirty()`,
  `ui.lookDirty()`). Ask = `ui.confirm({ text: 'Leave without saving?', yes: 'Leave', no: 'Keep editing', danger: true })`.
- B hooks (classes only, no phone CSS): `.w2` + `.w2-a` (left) / `.w2-b` (right) on the planner stack, Monday card body, results
  body (blocks / gig), wrap stack (moods, chat, year right), ☰ stack, shops' stack, board `.gb-list`; seq edit body `.w2` (grid
  `.seq-main.w2-b`, rest `.w2-a`), Quick `.quick-main.w2` (recipes a / sliders b); `.lt-tabs` (wide only, re-render on
  `ui:wide`). Wide-only `seq-side` (tools column: side-copy / -clear / -fill / -beat, side-feel-0|2|4, side-arr-*, side-tempo-*).
  kb-hints (testid `kb-hints`) in the top layer's foot only under `html.gg-wide.gg-keys`; seq hint "←→ drum · ↑↓ step · Space
  add/remove · Tab leave the grid · Esc close" (the contract's text swaps the axes; the mockup's order used).
## Tests (all on the final build)
- Node suite: SUITE ALL PASS (incl. keys 13, wide_css 4) on the final build.
- `tests/pw_nav.js` (all sections, one run): career 39, esc 15, repeat 9, focus 16, seq 24 at 1280x720 AND 800x900 (all pass);
  phone 9 at 390x844 and 9 at 844x390 (typing / keys on a phone context never flips gg-kbnav, nothing moves). 'room' not needed.
- Phone freeze `tests/pw_freeze.js` META_ONLY=390 / 440 / 844l: ALL PASS 5 each (equal to the stage-0 fixtures; none edited).
- Phone matrix 390x844: every existing pw section green. 440x956 (`PW_VIEW=440x956`): green; world van/calendar and gig/seat
  failed once under load and passed alone (twice); pw_seq seq 47 (+ seq-compat 17, quick 26), part 27, layout 81, genres 25,
  voices 8, kit 11, real 5, vox 17 all pass at 440 (final build).
- **Pre-existing, for the lead:** pw_shop 'space' at 440x956 fails ALSO on the stage-0 dist (`dc74dcb`), so not this lane;
  not chased.
## Hand-overs
- Lane I (55): define `gig` / `gig-results` with `focus: false` (50 already treats them so); set `GG.input.gigLive()` (the router
  only blocks Tab while live); stopPropagation on keys 55 handles on the pause card (Esc / Enter) so the router never sees them.
- Lane W (5w): lay out `.w2` / `.w2-a` / `.w2-b`, `.lt-tabs`, `.seq-side` + the seq columns, `.kb-spots` (first child of `.dock`),
  `.kb-hints` (end of the foot; the mockup has the seq one in the tools column). 50k only styles the ring, kb-spots, kb-hints, caps.
- Lead: 02_contracts V1.5 + the APIs above, event `'ui:kbnav'`, testids `seq-side`, `side-*`; status: `META_ONLY=all` runs
  nothing in pw_freeze (use `390,440,844l`).
## Gaps
- Size: 5,297,789 B (stage 0 5,265,575 B; +32.2 KB for 50k + hooks + pw-only nothing), gate 6.0 MB.
- pw_freeze is timing-sensitive under load (results reveal, gig_between song text, count-in numeral, wrap HUD ±1 px): with load
  15-20 on 4 cores it failed intermittently on screens this lane does not touch; every size passed alone twice at lower load.
