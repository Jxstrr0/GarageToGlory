# v1.5 Lane W (WIDE) report — branch `wip-v15-w` (2026-10-08)
Edited only: `src/5w_ui_wide.js` (new), `src/40_render_core.js`, `src/42_render_stage.js`, `src/60_main.js`, `tests/pw_wide.js` (new),
`tools/desktopqa.js` (new), this report, dist. Package B "Centred wide column" (§4.6, owner Q3), on the I / N hooks.
## APIs as built
- **5w**: one `<style id="gg-wide-css">` (`var CSS` = literals; lint green), moved last in `<head>` after boot; `debug('wide')`.
  gg-desk: thin scrollbars, hover. gg-wide: HUD max 1120 + calendar pill; dock button 480; sheets = one bottom panel
  `min(100%,1120px)` centred, no grip, sub inline, foot = key hints left + buttons right (max 420); `.w2` columns (`.w2-a` float
  left, `.w2-b` right, DOM order free), `.gb-list.w2` 2 across, planner 400 | acts 3 across, laptop `.lt-tabs` rail (+ band cards 2
  across); full screens = centred column `max(16px,(100%-1120px)/2)` (not gig / title / van / Loonies / rival set), foot max 560;
  modal 420; title 520; songwriter = header across, tools 360 | grid (≤120 px a lane), Loop/Song/Save under it; Settings
  `.set-rail` | `.set-main`, Keys chips | timing, `.calib-docked` 440 panel over the timing column; gig = highway
  `clamp(lanes×110,46vw,lanes×140)`×`clamp(300,48vh,540)` centred 16 px off the bottom, stage both sides, header/crowd/cards
  max 720, `gig-hint` right of it; rival set + Loonies panels 720; van cards ≤440 left; world map fits the height.
- **40**: `setViewInsets({ left, right })` (default 0), `fitCamera` fits `W-left-right`; PC layout: no landscape squeeze (room
  above the panel), ratio `min(prefs, dpr, pxBudget(w,h,true))`; `'ui:wide'` → resize + re-frame (`perf:quality` reason
  `layout`); `debug('render').pxBudget` (null off-wide), `insets.left/right` only when wide (stage-0 fixtures pin `{top,bottom}`).
- **42**: hFov ≤ 100° when wide; `R.stage.info().hFov/vFov`. **60**: `'ui:wide'` → `updateInsets()` re-measured.
## Tests (machine shared with I / N, load 13-16)
- Node SUITE ALL PASS (wide_css 4). Build 5,278,360 B (+12.8 KB; merged I+N+W 5,338,973 B).
- **Phone**: `pw_freeze` 390/440/844l EQUAL (quiet run). Under load `results`/`gig_between`/`tutorial` drift on reveal/lesson
  timing; the untouched stage-0 tree drifts on the same screens in the same run, and they pass alone. Matrix 390: garage 223,
  stage 166, settings, title, phoneqa, gig, seats, tour, shop, flow, tutorial, rival, label PASS. 440: garage, stage, settings,
  title, phoneqa, gig, seats, tour PASS. Load-only fails, each also failing on stage-0 or passing alone twice: gig sync/sync2,
  perf `pre` (audio build budget) and `ratio` (governor timing at 440), world calendar/van (click timeouts). Not covered (load):
  pw_seq hit its 1500 s timeout (hash/kit/real/vox passed); creator, logo, recap, ending, hof, trophies, fans, drama,
  seat_audio, bands(_render) not run (no Lane W code path on a phone: CSS is gg-gated, 40/42/60 no-ops off gg-wide).
- **Desktop** (merged I+N+W): `pw_wide` layout 93 (4 sizes), gig 45, switch 8, perf 9 (2.40 MP at 1440 + 1920 dpr 2, p95
  1920 = 1.17×1440, 1024x1366 keeps ratio 2), pref 10. `desktopqa` 1440 193/193, 1280 191, 800 191, 1920 189/190 (goto timeout:
  raised). `pw_keys wide-gig` 40/40 (B bounds), `pw_nav` 12/12 sections.
- Shots: `scratchpad/v15_lane_w_shots/` (52 screens at 1440x900 + 3 frame shots); `scratchpad/w15/shots_<size>/` for the rest.
## Hand-overs
- **I (55 guard)**: the stage frame runs to 0.45 of the highway, so the drummer / string player sit behind its translucent top;
  the mockup has the kit just above it. Suggest `bottom: H - hw.top - 0.1*hw.height` (or 0) when wide (shots
  `gig_frame_as_built_0.45.png` vs `gig_frame_alt_0.10.png`, `gig_bass5_frame_as_built.png`); pw_wide accepts both.
- **I / N**: no DOM score card exists (only `gig-hint` sits right of the highway); the Settings rail has no current-section
  state; 5w moves `kb-hints` left of the sheet buttons and gives `btn-back` room for N's Esc cap.
- **Lead**: 02 "as built" for the debug fields above + `perf:quality` reason `'layout'`. `META_ONLY=all node tests/pw_freeze.js`
  runs nothing: run it without META_ONLY.
## Gaps
- Merch table, trophies list, seat / genre cards stay one wide column (no hooks). Region-map labels scale with the SVG.
## Re-verify (resumed run, 2026-10-08)
- Branch tree alone: build 5,278,360 B, node SUITE ALL PASS, `pw_freeze` (no META_ONLY) 390/440/844l ALL PASS 5 each.
- `pw_wide` on the W tree alone fails only where I / N hooks are missing (layout 1/81: 1280 garage hotspots; gig 7/39: 55
  stage-frame guard + 6-lane width) -> integrate W after I + N. On a temp I+N+W merge (5,338,973 B): layout 93, gig 45,
  switch 8, pref 10 ALL PASS; perf 9 passed alone 3 of 4 runs, the last two in a row (load ~8; one run's p95 ratio missed).
