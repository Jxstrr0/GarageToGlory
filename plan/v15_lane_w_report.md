# v1.5 Lane W (WIDE) report — branch `wip-v15-w` (2026-10-07)
Edited: `src/5w_ui_wide.js` (new), `src/40_render_core.js`, `src/42_render_stage.js`, `src/60_main.js`, `tests/pw_wide.js` (new),
`tools/desktopqa.js` (new), this report, dist (rebuilt). Nothing else. Package B "Centred wide column" (§4.6, owner Q3).
## APIs as built
- **5w** one `<style id="gg-wide-css">` (`var CSS` = string literals; every selector `html.gg-wide` / `html.gg-desk`, lint green),
  moved to the end of `<head>` after boot. `debug('wide') = { wide, desk, css, last }`. gg-desk: thin themed scrollbars, hover
  (buttons brighter, cells, tabs). gg-wide: HUD max 1120 centred + the calendar pill under it; dock centred, button 480; sheets =
  one bottom panel `min(100%, 1120px)` centred, no grip, sub-title inline, foot = key hints left + buttons right (max 420);
  `.w2` = two columns (`.w2-a` floated left 50%, `.w2-b` right; DOM order free), `.gb-list.w2` cards 2 across; planner 400 px left
  (booked + blocks) + activity cards 3 across; laptop `.lt-tabs` left rail (band cards 2 across); full screens a centred column
  `padding-inline: max(16px, (100% - 1120px) / 2)` (not gig / title / van / Loonies / rival set), foot buttons max 560; modal
  max 420; title column 520; creator looks 3 across; songwriter editor = header across, tools 360 left, grid right (max 120 px a
  lane), Loop / Song / Save under the grid, coach tip on two lines; Settings = `.set-rail` | `.set-main`, Keys chips | timing,
  `.calib-docked` = a 440 panel over the timing column; gig = highway `clamp(lanes×110, 46vw, lanes×140)` × `clamp(300, 48vh,
  540)` centred 16 px off the bottom, transparent box, the stage on both sides, header / crowd / cards max 720, `gig-hint` right of
  the highway; rival set + Loonies panels max 720; van cards a left column ≤ 440; world map fits the window; van side view 560.
- **40** `R.setViewInsets({ top, bottom, left, right })` (left / right default 0); `fitCamera` fits `W - left - right`, centred
  there; in the PC layout the landscape squeeze of the bottom inset is skipped (the room stays above the panel); pixel ratio =
  `min(prefs, dpr, GG.prefs.pxBudget(w, h, true))` only under gg-wide; `'ui:wide'` → resize + re-frame (+ `perf:quality`
  reason `layout` when the ratio moves). `debug('render').pxBudget` (null when not wide); `insets.left/right` only in the PC
  layout (the stage-0 phone fixtures record `{ top, bottom }`).
- **42** hFov ≤ 100° in the PC layout (tFull capped); `R.stage.info().hFov / vFov`. Phones frame as before.
- **60** `'ui:wide'` → `updateInsets()` re-measured (lastInsets reset).
## Tests (machine shared with lanes I / N: load 10-15)
RESULTS
## Hand-overs
- **I (55 `guard`)**: B's stage frame runs to 0.45 of the highway, so the drummer (and a string seat's player) sits behind the
  highway's translucent top; the mockup draws the kit just above it. Suggest `bottom: H - hw.top - 0.1 * hw.height` (or 0) in the
  PC layout; the stage still shows on both sides (full-window renderer). Shots: `v15_lane_w_shots/gig_frame_as_built_0.45.png` vs
  `gig_frame_alt_0.10.png`, `gig_bass5_frame_as_built.png`. pw_wide `gig` only asks "below the highway's top", so either passes.
- **I / N**: no DOM score card exists (B draws one right of the highway): only `gig-hint` is placed there. Settings' rail has no
  "current section" state; the mockup's keycap hint chips are N's text line (5w moves `kb-hints` left of the sheet buttons).
- **Lead (02 "as built")**: `debug('render').insets.left/right` only in the PC layout (the stage-0 fixtures pin `{ top, bottom }`),
  `debug('render').pxBudget`, `R.stage.info().hFov/vFov`, `debug('wide')`, `perf:quality` reason `'layout'`. `META_ONLY=all
  node tests/pw_freeze.js` runs nothing (no section is named `all`): run it without META_ONLY.
## Gaps
- Merch table, trophies list, seat / genre cards: one wide column (no `.w2` hooks); fine to read, not two columns.
- Region map labels scale with the SVG (big on 1920); the map is capped to the window height instead.
