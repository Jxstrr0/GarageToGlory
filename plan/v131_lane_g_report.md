# v1.3.1 Lane G report: Simulate a regular gig (branch `wip-v131-g`)

## APIs as built (`src/22_sim_gig.js`, pure / DOM-free)
- `gig.simReason(state, g?)` -> `null | 'phase' | 'gig' | 'showdown' | 'festival' | 'rival' | 'lesson'`; `gig.canSimulate` = reason null.
  Story shows: `g.showdown` (botb / festival / final), tour `g.festival`, any `GG.rival.pending(state)` this week (= playWeekend's
  routing), the career's first gig while `state.tutorial.on` (D2).
- `gig.simBot(state, diff)` -> `{ accuracy, jitterMs, from: 'own'|'band', n, acc, ps }` (plan §1.1: same-difficulty entries first,
  σ by bisection on the Perfect share, capped so `acc` stays reachable; band: k = (drumSkill - 10) / 70, 0.75 + 0.18k, 65 - 40k ms).
- `gig.simSong(S, bot)`: marks `state.liveGig.sim`, starts the next song, fits the tap chance + draw to this song's chart
  (a chart guess, then <= 8 dry runs of the same song on a shallow scratch state, no events; stops within max(1 %, half a note)),
  then `botPlay(..., one: true)`. Seeds: `[seed, live.started, venueId, 'sim', i(, k)]`. `gig.simFinish(S, bot)` = `S.finish()` +
  `simulated: true, sim: { from, n, acc }`; `gig.simShow(S, bot)` = the rest + simFinish. botPlay untouched.
- `applyResult`: a PLAYED live result (`r.live && !r.simulated && !liveGig.sim && songResults`) appends `{ acc, ps, seat, diff, wk }`
  (rounded like `GG.save.playLog`), keeps the last `C.PLAY_LOG_MAX`; the key is created lazily. Played results gain no field.
- UI (`src/55_ui_gig.js`): sheet foot = [Auto-pick] [⏩ Simulate this gig] (`btn-gig-sim`, .btn.small, 44 px) + `gig-sim-why`
  ("Plays it at your recent level: ~80% hits" / "...the band's level..."), then the big "Start the show" (`btn-gig-start`, same
  handler). Not eligible: `gig-sim-no` ("Showdown night. This one you play." / "A festival slot..." / "Play your first one. The
  band insists."). Tap: closes the sheet, `simStep` per song every `ui.gigSimMs` (350 ms), card `gig-sim-progress` ("Simulating the
  show… song 2 of 4", last song's hits), crowd meter + stage follow, pause button hidden; then `finishShow` -> `simFinish` ->
  the normal apply + results with `gig-simulated` ("⏩ Simulated at your average (last 3 gigs, 80% hit)"). Reload: playGig's resume
  branch sees `live.sim` and finishes it simulated. Debug `gigui.sim = { on, from, n, accuracy, jitterMs, acc }`. No new CSS.
## Tests + results
- `tests/sim_gig.test.js` +6 (36 total ALL PASS): canSimulate per story kind / pending sameNight, stolenSlot, final / lesson /
  phase; simBot band vs own, other seat ignored, same-difficulty first, pure; match logs 0.6/0.8/0.95 x ps 0.5/0.8 at easy + hard,
  drums + bass, 2 bands: all within 0.05; determinism + reload between songs = uninterrupted; everything counts (finishGig state ==
  the same result played, minus the flags; 'gig:done' + achieve.gig ran; playLog untouched); playLog append / last 5 / auto-resolve
  not logged; **1.3.0 fingerprint**: played drums/bass x easy/hard results + states hash-equal to the 1.3.0 `22_sim_gig.js`.
- Probe (768 gigs: 4 seats x 4 difficulties x 3 A x 2 ps x 8 careers): worst |acc - A| 0.036 (Auto-kick 0.024); 5-65 ms/song in node.
- `pw_gig simulate` 18/18 at 390x844 + 440x956. Still green: node suite SUITE ALL PASS (compat_v12, save, build); pw_gig gig (390 +
  440), e2e, sync, bridge, seat, feel; pw_tutorial tut_w1 (4 bands); pw_rival scene/botb/final; Classic `META_ONLY=hash` pw_seq
  232/232. dist (local build, not committed) 5,231,223 B.

## Hand-overs
- Lead / 02_contracts: document `simReason`, `simShow`, `liveGig.sim` ({ accuracy, jitterMs, from, n, acc, ps } while a simulation
  runs; liveGig has no sanitizer, it round-trips), `ui.gigSimMs`, testids `btn-gig-sim`, `gig-sim-no`, `gig-sim-why`,
  `gig-sim-progress`, `gig-simulated`, debug `gigui.sim`.
- Owner shots: `tests/.cache/sim_{set,progress,results,showdown}{,_440}.png`. No CSS hand-over (inline flex column in the foot).

## Gaps
- Matched on hit share; the Perfect share reads a few points high for a late-but-steady player. No cancel once started (D4/D8).
