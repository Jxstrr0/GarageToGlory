// 5w_ui_wide.js (v1.5 "Desktop", Lane W; plan_contract_1.5 §4.6, package B "Centred wide column", owner Q3 2026-10-07):
// the PC layout. One injected style block (moved to the end of <head> once the game has booted, so it is the last word on
// a tie) and nothing else: every rule starts with html.gg-wide (the PC layout: GG.input / GG.prefs.layoutFor) or
// html.gg-desk (a computer: fine pointer + hover; also an 800x900 window that keeps the phone layout). A phone sets neither
// class (tests/wide_css.test.js lints this file; tests/pw_freeze.js proves the phone layout unchanged).
//   gg-desk: thin themed scrollbars; hover on every button (brighter), grid cells and tabs.
//   gg-wide (B): the HUD centred (max 1120, the calendar pill under it) and the dock centred (button 480); sheets are one
//     bottom panel min(100%, 1120px) wide, centred, no grip, the sub-title inline, the foot's key hints left + the buttons
//     right (max 420); .w2 two columns inside (.w2-a left, floated; .w2-b right), .gb-list.w2 cards 2 across, the planner
//     400 px left (booked + blocks) + the activity cards 3 across, the laptop's tabs a left rail (.lt-tabs); full screens are
//     a centred column (padding-inline max(16px, (100% - 1120px) / 2); not the gig, title, van, Loonies, rival set), their
//     foot buttons max 560; modals max 420; the title's column max 520; the songwriter editor = the header across, tools
//     column 360 left, the grid right (max 120 px a lane) with Loop / Song / Save under it; Settings = a tab rail left +
//     the sections (Keys: chips | the timing card), the key calibration docked over the timing column (.calib-docked); the
//     gig = the highway centred under the stage (clamp(lanes x 110px, 46vw, lanes x 140px) x clamp(300px, 48vh, 540px),
//     the stage showing on both sides; 55 frames the stage down to 0.45 of it), the song header / crowd / cards max 720,
//     "Esc pause" right of the highway; van overlays a left column (max 440); the world map fits the window's height.
// The 3D side of the PC layout (insets, the pixel budget, the stage's field of view) is 40 / 42 / 60's.
(function (GG) {
  if (typeof document === 'undefined') return;
  // (string literals only: tests/wide_css.test.js evaluates this expression. The centred column's sides are
  // max(16px, calc((100% - 1120px) / 2)); the sheet panel's max(0px, ...); the highway clamp(lanes x 110px, 46vw, lanes x 140px))
  var CSS = [
    // ---- a computer (also outside the PC layout) ----
    'html.gg-desk * { scrollbar-width: thin; scrollbar-color: #34426a transparent; }',
    'html.gg-desk ::-webkit-scrollbar { width: 10px; height: 10px; }',
    'html.gg-desk ::-webkit-scrollbar-track { background: transparent; }',
    'html.gg-desk ::-webkit-scrollbar-thumb { background: #34426a; border-radius: 99px; border: 2px solid transparent; background-clip: padding-box; }',
    'html.gg-desk button:not(:disabled):hover { filter: brightness(1.14); }',
    'html.gg-desk button:not(:disabled):active { filter: brightness(.92); }',
    'html.gg-desk .seq-grid .cell:hover { filter: brightness(1.35); }',
    'html.gg-desk .tab:not(.on):hover { color: var(--text); }',

    // ---- the PC layout: HUD + dock ----
    'html.gg-wide .hud-bar { max-width: 1120px; margin: 0 auto; }',
    'html.gg-wide .hud-bar::after { content: ""; order: 8; flex: 0 0 100%; height: 0; margin-top: -4px; }',
    'html.gg-wide .hud-cal { flex: 0 1 auto; margin: 0 auto; max-width: 100%; padding: 3px 14px; }',
    'html.gg-wide .dock { left: max(16px, calc((100% - 1120px) / 2)); right: max(16px, calc((100% - 1120px) / 2)); align-items: center; }',
    'html.gg-wide .dock > .btn { width: 480px; max-width: 100%; }',

    // ---- sheets: one bottom panel, 1120 wide, centred ----
    'html.gg-wide .sheet { left: max(0px, calc((100% - 1120px) / 2)); right: max(0px, calc((100% - 1120px) / 2)); }',
    'html.gg-wide .sheet-grip { display: none; }',
    'html.gg-wide .sheet-head { padding: 14px 16px 8px 24px; min-height: 64px; }',
    'html.gg-wide .sheet-head .sub { display: inline-block; margin: 0 12px 0 0; vertical-align: 3px; }',
    'html.gg-wide .sheet-body { padding: 4px 24px 16px; }',
    'html.gg-wide .sheet-foot { padding: 12px 24px 16px; justify-content: flex-end; }',
    'html.gg-wide .sheet-foot > .btn.block, html.gg-wide .sheet-foot > .btn.primary { width: auto; flex: 0 1 420px; }',
    'html.gg-wide .sheet-foot > .kb-hints { order: -1; flex: 0 1 auto; width: auto; margin-right: auto; text-align: left; }',
    // (the setlist's foot is one column of its own: Auto-pick / Simulate over Start the show)
    'html.gg-wide .gigset .sheet-foot > div:has(> [data-testid="btn-gig-start"]) { flex: 0 1 520px !important; }',
    'html.gg-wide .modal { max-width: 420px; }',

    // ---- two columns (.w2: the screens' hooks; .w2-a left, .w2-b right; either may come first in the DOM) ----
    'html.gg-wide .w2 { display: flow-root; --w2a: calc(50% - 12px); }',
    'html.gg-wide .w2 > .w2-a { float: left; clear: left; width: var(--w2a); margin-top: 0; margin-bottom: 12px; }',
    'html.gg-wide .w2 > .w2-b { width: calc(100% - var(--w2a) - 24px); margin-left: calc(var(--w2a) + 24px); margin-top: 0; margin-bottom: 12px; }',
    'html.gg-wide .w2 > .w2-b.btn:not(.block) { display: flex; }',
    'html.gg-wide .w2 > span.w2-b { display: flex; width: fit-content; }',
    'html.gg-wide .gb-list.w2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-items: start; }',
    'html.gg-wide .gb-list.w2 > * { margin: 0; }',
    // the planner: booked + the three blocks left (400), the activity cards right, three across
    'html.gg-wide .sheet-body > .stack.w2:has(> .acts) { --w2a: 400px; }',
    'html.gg-wide .w2 > .acts { grid-template-columns: repeat(3, minmax(0, 1fr)); }',
    // the laptop: its tabs a left rail, the tab beside it
    'html.gg-wide .sheet-body:has(> .lt-tabs) { display: grid; grid-template-columns: 172px minmax(0, 1fr); grid-template-rows: auto auto minmax(0, 1fr); column-gap: 20px; align-content: start; }',
    'html.gg-wide .sheet-body > .lt-tabs { grid-column: 1; grid-row: 1 / -1; align-self: start; position: sticky !important; top: 0 !important; padding: 0 !important; background: none !important; }',
    'html.gg-wide .sheet-body:has(> .lt-tabs) > :not(.lt-tabs) { grid-column: 2; min-width: 0; }',
    'html.gg-wide .lt-tabs .tabs { flex-direction: column; gap: 2px; }',
    'html.gg-wide .lt-tabs .tab { flex: 0 0 auto; min-height: 40px; padding: 0 14px; text-align: left; }',
    // ... and the band's cards two across (the pay panel and the rest across both)
    'html.gg-wide .sheet-body:has(> .lt-tabs) .stack.tight:has(> .mem-card) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 10px; align-items: start; }',
    'html.gg-wide .sheet-body:has(> .lt-tabs) .stack.tight:has(> .mem-card) > :not(.mem-card) { grid-column: 1 / -1; }',
    'html.gg-wide .sheet-body:has(> .lt-tabs) .stack.tight:has(> .mem-card) > .mem-card { margin-bottom: 0; }',

    // ---- full screens: a centred column ----
    // (:where keeps this at (0,2,1): above the screens' own .full.x .full-body paddings, below the per-screen rules here)
    'html.gg-wide .full:where(:not(.gig, .title3d, .van, .loonies, .rvset)) > .full-body,'
      + ' html.gg-wide .full:where(:not(.gig, .title3d, .van, .loonies, .rvset)) > .full-foot { padding-left: max(16px, calc((100% - 1120px) / 2)); padding-right: max(16px, calc((100% - 1120px) / 2)); }',
    'html.gg-wide .full:not(.seq) > .full-foot { align-items: center; }',
    'html.gg-wide .full:not(.seq) > .full-foot > .btn.block { width: min(100%, 560px); }',
    'html.gg-wide .full:not(.seq) > .full-foot > .kb-hints { width: 100%; }',
    // the title: its column (N re-frames the 3D garage on ui:wide)
    'html.gg-wide .title-wrap { max-width: 520px; margin-left: auto; margin-right: auto; }',
    // the band creator's looks three across
    'html.gg-wide .presets { grid-template-columns: repeat(3, minmax(0, 1fr)); }',

    // ---- the songwriter: header across, the tools column (360) left, the grid right, Loop / Song / Save under the grid ----
    'html.gg-wide .full.seq .full-body.w2 { display: grid; grid-template-columns: 360px minmax(0, 1fr); grid-template-rows: auto repeat(8, auto) minmax(0, 1fr);'
      + ' column-gap: 24px; row-gap: 0; align-content: stretch; overflow-y: auto; }',
    'html.gg-wide .full.seq .full-body.w2 > .w2-a { float: none; clear: none; width: auto; grid-column: 1; margin: 0 0 8px; min-width: 0; }',
    'html.gg-wide .full.seq .full-body.w2 > .seq-head { grid-column: 1 / -1; grid-row: 1; margin: 0 -6px 4px; }',
    'html.gg-wide .full.seq .full-body.w2 > .w2-b { grid-column: 2; grid-row: 2 / -1; width: auto; margin: 0; min-height: 0; }',
    'html.gg-wide .full.seq .full-body.w2 > .seq-tabs { margin: 0; padding: 0; }',
    'html.gg-wide .seq-grid[data-lanes="4"] { width: 100%; max-width: 516px; margin: 0 auto; }',
    'html.gg-wide .seq-grid[data-lanes="5"] { width: 100%; max-width: 639px; margin: 0 auto; }',
    'html.gg-wide .seq-grid[data-lanes="6"] { width: 100%; max-width: 762px; margin: 0 auto; }',
    'html.gg-wide .full.seq:has(.seq-main) > .full-foot { padding-left: calc(max(16px, calc((100% - 1120px) / 2)) + 384px); }',
    'html.gg-wide .quick-main.w2 > .qs-title { margin-bottom: 8px; }',
    // the coach's tip reads in full (two lines) in the tools column
    'html.gg-wide .full.seq .full-body.w2 > .seq-coach { flex: 0 0 auto; height: auto; min-height: 44px; padding: 8px 12px 8px 7px; border-radius: 16px; }',
    'html.gg-wide .full.seq .full-body.w2 > .seq-coach .sc-line { display: block; white-space: normal; line-height: 1.35; }',
    'html.gg-wide .full.seq .full-body.w2 > .seq-coach .seq-tip { overflow: visible; }',

    // ---- Settings: the tab rail left, the sections beside it; the key calibration docked over the timing column ----
    'html.gg-wide .set-wide { display: grid; grid-template-columns: 196px minmax(0, 1fr); column-gap: 28px; align-items: start; }',
    'html.gg-wide .set-rail { position: sticky; top: 0; display: flex; flex-direction: column; gap: 6px; padding-top: 76px; }',
    'html.gg-wide .set-rail > .btn { justify-content: flex-start; width: 100%; padding: 0 14px; border-color: transparent; text-transform: none; letter-spacing: .01em; font-size: 15px; }',
    'html.gg-wide .set-main { min-width: 0; }',
    'html.gg-wide .set-main [id^="set-"] { scroll-margin-top: 20px; }',
    'html.gg-wide .set-keys > .w2 > .w2-b > .set-keys-timing { margin-top: 0; }',
    'html.gg-wide .layer.calib-docked { left: auto; right: max(16px, calc((100% - 1120px) / 2)); top: 16px; bottom: 16px; width: min(440px, calc(100% - 32px)); }',
    'html.gg-wide .layer.calib-docked > .full { border-radius: 18px; border: 1px solid var(--line); box-shadow: 0 20px 60px rgba(0, 0, 0, .6); overflow: hidden; }',
    'html.gg-wide.gg-keys .back-row > [data-testid="btn-back"] { margin-right: 34px; }',

    // ---- the gig: the highway centred under the stage, the stage on both sides ----
    'html.gg-wide .full.gig .full-body { align-items: center; }',
    'html.gg-wide .full.gig .gig-top { align-self: stretch; }',
    'html.gg-wide .full.gig .gig-hw { flex: 0 0 auto; width: clamp(calc(var(--lanes, 4) * 110px), 46vw, calc(var(--lanes, 4) * 140px)); max-width: calc(100% - 32px); height: clamp(300px, 48vh, 540px); min-height: 0; max-height: none;'
      + ' margin: 0 0 16px; padding-bottom: 0; background: transparent; border: 0; border-radius: 16px; overflow: hidden; }',
    'html.gg-wide .full.gig .gig-hw canvas { height: 100%; }',
    'html.gg-wide .full.gig .gig-bar, html.gg-wide .full.gig .gig-crowd { left: max(12px, calc((100% - 720px) / 2)); right: max(12px, calc((100% - 720px) / 2)); }',
    'html.gg-wide .full.gig .gig-mid { left: max(16px, calc((100% - 720px) / 2)); right: max(16px, calc((100% - 720px) / 2)); }',
    'html.gg-wide .full.gig .gig-hint { right: auto; bottom: calc(16px + clamp(300px, 48vh, 540px) * .42); padding: 10px 14px; border-radius: 12px; border: 1px solid var(--line); }',
    // the "Esc pause" card right of the highway (half its width per lane count + 20 px)
    'html.gg-wide .full.gig .full-body:has(> .gig-hw[data-lanes="4"]) > .gig-hint { left: calc(50% + min(calc((100% - 32px) / 2), clamp(220px, 23vw, 280px)) + 20px); }',
    'html.gg-wide .full.gig .full-body:has(> .gig-hw[data-lanes="5"]) > .gig-hint { left: calc(50% + min(calc((100% - 32px) / 2), clamp(275px, 23vw, 350px)) + 20px); }',
    'html.gg-wide .full.gig .full-body:has(> .gig-hw[data-lanes="6"]) > .gig-hint { left: calc(50% + min(calc((100% - 32px) / 2), clamp(330px, 23vw, 420px)) + 20px); }',

    // ---- the rival's set and the award nights (stage scenes like the gig): their panels centred, max 720 ----
    'html.gg-wide .full.rvset .rs-bar, html.gg-wide .full.rvset .rs-banner { left: max(12px, calc((100% - 720px) / 2)); right: max(12px, calc((100% - 720px) / 2)); }',
    'html.gg-wide .full.rvset .rs-panel { left: max(0px, calc((100% - 720px) / 2)); right: max(0px, calc((100% - 720px) / 2)); bottom: 16px; padding-bottom: 14px; border: 1px solid rgba(255, 255, 255, .12); border-radius: 16px; }',
    'html.gg-wide .full.loonies .lo-top { align-self: center; width: min(100%, 720px); }',
    'html.gg-wide .full.loonies .lo-card { align-self: center; width: min(calc(100% - 32px), 720px); border-radius: 18px 18px 0 0; }',

    // ---- the van: its cards in a left column; the world map fits the window ----
    'html.gg-wide .full.van .full-body > .van-top, html.gg-wide .full.van .full-body > .van-says, html.gg-wide .full.van .full-body > .van-arrive { width: 100%; max-width: 440px; }',
    'html.gg-wide .full.van > .full-foot { max-width: 472px; }',
    'html.gg-wide .tw-map { width: min(100%, calc((100vh - 170px) * 100 / 72)); margin-left: auto; margin-right: auto; flex: 0 0 auto; }',
    'html.gg-wide .layer[data-screen="tour-region"] .tw-map { width: min(100%, calc((100vh - 290px) * 100 / 72)); }',
    // the van's side view (the door, the car lot) at a readable size
    'html.gg-wide .van-side { max-width: 560px; margin-left: auto; margin-right: auto; }'
  ].join('\n');

  var tag = document.getElementById('gg-wide-css');
  if (!tag) {
    tag = document.createElement('style'); tag.id = 'gg-wide-css'; tag.textContent = CSS;
    (document.head || document.documentElement).appendChild(tag);
  }
  // last in <head> once the game has booted (screens inject their own blocks at boot): a tie goes to the PC layout
  function last() { var h = document.head; if (h && tag.parentNode === h && h.lastElementChild !== tag) h.appendChild(tag); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(last, 0); });
  else setTimeout(last, 0);
  GG.registerDebug('wide', function () {
    var c = document.documentElement.classList;
    return { wide: c.contains('gg-wide'), desk: c.contains('gg-desk'), css: !!document.getElementById('gg-wide-css'), last: !!(document.head && document.head.lastElementChild === tag) };
  });
})(window.GG);
