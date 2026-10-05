# v1.3.1 "Simulate": plan (lead, 2026-10-04, against `main` 1.3.0.0 = `d085cc3`; branch `v1.3.1-simulate`)

## 0. Owner request + answers (LOCKED; status.md Addendum 6; do not re-pitch)
Request (2026-10-04, verbatim): "if i don't want to okay specific gig can we add a simulate option? also lets make the bass shop
button more obvious" (read: "if I don't want to play a specific gig ...").
- A1 Result = **"Your own average"**: based on how well the player actually played their recent gigs; falls back to the band's level
  when they haven't played many.
- A2 Which gigs = **"All but story shows"**: any regular gig can be simulated; rival showdowns (`C.SHOWDOWNS`), the festival and the
  finals must be played.
- A3 Rewards = **"Everything counts"**: a simulated gig applies exactly like a played one (pay, fans, buzz, awards / achievements
  through the normal result path).
- A4 Shop = **"Own garage label + rig button"**: a "Gear shop" floating label in the garage you can tap directly (every seat: drums =
  the kit shop, string seats = their instrument shop), plus a visible shop button on the rig / kit sketch-pad screen (not only in ⋯).
Defaults (lead, no popup; they stand unless the owner objects; list them in the merge summary):
- D1 Simulate lives on the setlist sheet ('gig-set', after the van: "Skip the drive" exists, road cards stay your choice).
- D2 Not on the career's first gig while the lessons run (`w1_gig` teaches Start and waits for the show to open).
- D3 "The festival" = the rival festival showdown and tour festival slots (`g.festival`); a weekend with any rival showdown pending
  is played (the same routing as `GG.main.playWeekend` -> `ui.playShowdown`).
- D4 No confirm: one tap simulates. D5 The bot plays at the difficulty on the sheet with your assists as set.
- D6 The label reads "Gear shop" on every seat and opens your seat's shop (`ui.openGear`: Drum shop / <Instrument> shop); a tap walks
  you there first, like every hotspot. D7 The header shop button is on the sketch pad only (kit / rig hotspot), not in a Write
  block or a catalog song; the ⋯ row `btn-kit-shop` stays. D8 No "simulate the rest" mid-show.

## 1. Design (verified against the code at `d085cc3`)
### 1.1 Simulate = the real show, played headlessly by a bot at your average
- Mechanism (proved in node at plan time: a 2-song set in 5-10 ms, `career.finishGig` -> phase 'wrap', stats.gigs +1, fans up):
  `S = GG.gig.session(state, g, setlist, { emit: false, difficulty, noFail, autoKick })` -> `GG.gig.botPlay(S, bot, rng)` (already
  DOM-free; continues a song in progress) -> `S.finish()` -> flag -> the UI's own apply (`defaultApply` = `career.finishGig` ->
  `settleGig`: world.shape, rival.shape, gig.applyResult, world.afterGig, labels, recap, legacy, achieve, 'gig:done'). Nothing new
  on the apply path, so "everything counts" holds by construction. The session still fires 'gig:song' per song (main autosaves
  between songs) exactly as `ui.gigAutoplay` does today.
- Sim API (22, pure / DOM-free, Lane G; contract text in `02_contracts.js` V1.3.1):
  - `gig.canSimulate(state, g?)`: `state.phase === 'gig'` && g is `state.gig` (venueId) && `!g.showdown` && `!g.festival` &&
    `!(GG.rival && GG.rival.pending(state))` && `!(state.tutorial && state.tutorial.on && !state.stats.gigs)`.
  - `gig.simBot(state, diff) -> { accuracy, jitterMs, from, n, acc, ps }`. **own**: `state.playLog` entries of this seat (the same
    difficulty when >= `C.SIM_MIN_PLAYED` of them, else any difficulty when >= 2): A = mean acc, P = mean ps; W = `gig.windows(state,
    diff)`; σ by bisection (5..150 ms) so erf(W.perfect/σ√2) / erf(W.good/σ√2) = P (P >= 0.995 -> 5 ms); accuracy = clamp(A /
    erf(W.good/σ√2), 0.05, 1); jitterMs = σ. **band** (fewer entries): k = clamp((drumSkill - 10) / 70, 0, 1), accuracy 0.75 + 0.18k,
    jitterMs 65 - 40k (between the tests' AVG bot 0.82/55 and balance's 0.93/25). Lane G may add a fixed correction (chords,
    holds, fill notes skew it: the plan-time probe at 0.85/50 gave 0.868); the gate is the test, not the formula.
  - `gig.simSong(S, bot)` plays the next song: `botPlay(S, { accuracy, jitterMs, one: true }, GG.RNG(GG.hashSeed([state.seed,
    live.started, g.venueId, 'sim', i].join('|'))))`; `gig.simFinish(S, bot)` = `S.finish()` + `r.simulated = true` + `r.sim = {
    from, n, acc: A }`. Same state + setlist -> the same GIG_RESULT in node and in the UI.
  - playLog: `gig.applyResult` appends `{ acc: r.accuracy, ps: perfect / (perfect + good) (1 if none), seat: career.seatOf(state),
    diff: r.difficulty, wk: state.totalWeek }` when `r.live && !r.simulated && r.songResults && r.songResults.length`, keeps the last
    `C.PLAY_LOG_MAX`. Lazy key (first played gig). Played results gain no field and score exactly as 1.3.0. Studio takes and
    practice never reach applyResult; a played rival showdown counts as played.
  - Resume: `state.liveGig.sim = bot` while a simulation runs, so a reload between songs finishes it as a simulation (playGig's
    resume branch sees `live.sim` and continues the chain; never logged).
- UI (55, Lane G): 'gig-set' foot = row [Auto-pick (`btn-gig-auto`, unchanged)] [Simulate ⏩ (`btn-gig-sim`)], then the primary big
  block "Start the show" (`btn-gig-start`, same id + handler; the w1 lesson points at it). Not eligible: the Simulate slot becomes a
  tiny dim note (`gig-sim-no`): "Showdown night. This one you play." / "Play your first one. The band insists." Tap Simulate: close
  the sheet (+ anything over 'gig'), `startSession(G.pick)`, `G.sim = simBot(...)`, `live.sim`, then `simSong` per song on a
  `setTimeout(0)` chain with the between card reading "Simulating the show… song 2 of 4" (`gig-sim-progress`) and the stage crowd
  following (`stageCall('setCrowdLevel')`), then `finishShow()` takes `simFinish` -> 'gig-results' + one line under the head
  (`gig-simulated`): "⏩ Simulated at your average (last N gigs, 86% hit)" / "⏩ Simulated at the band's level (play a couple to set
  your own)". The rest of the results screen as played. Debug: `GG.debug('gigui').sim = { on, from, n, accuracy, jitterMs }`.
  No new CSS (existing `.btn`, `.tag`, `.small.dim`); a CSS need is a hand-over to Lane S.

### 1.2 Gear shop label + rig button (Lane S)
- 41: an 8th HOTSPOTS entry appended (index 4 stays the kit): `{ action: 'shop', label: 'Gear shop', box: a thumb-sized box at the
  label (>= 0.8 x 0.4 m, nothing behind it is another hotspot), at: beside / under the kit's label, stand + face = the kit's (the
  throne) }`, drawn with `ctx.makeLabel(text, { px: 20, stroke, dot })` in its own colour (e.g. green `#57c77a`) so it reads as
  new. `setRig(on)` moves the shop box + label with the kit hotspot to the amp corner (a RIG-relative offset) and back. Every room
  (tiers 0-3 + the other bands' rooms 4-6) shares the ROOM footprint, so one offset works; check all 7 rooms on drums + a string
  seat. Draw calls +1 (header comment: labels 8). `debug().hotspots` lists 8.
- 52: `HOT.shop = function () { ui.openGear(); }`; the 2D fallback SPOTS gains `['shop', '🛒', 'Gear shop']` (`hs-shop`), 8 buttons
  fit at 390 with no horizontal scroll.
- 54: sketch mode only, both Quick song and the editor: a visible shop button in `.seq-head` between the title and ⋯
  (`btn-seq-shop`, aria-label = the ⋯ row's text "Drum shop" / "<Instrument> shop"), same handler as `btn-kit-shop` (stopPlay +
  `ui.openGear`; the open sequencer grows its lanes as today). Labelled "🛒 Shop" when the head keeps "Sketch pad · <seat>"
  readable at 390, else a 44 px 🛒 with an accent ring. `btn-kit-shop` in ⋯ stays (tests + tutorial reference it).
- 00_shell CSS: the header button (+ the fallback grid if needed). Old saves: nothing is stored (hotspots are not saved).

## 2. Lanes (2 agents, medium effort; single file ownership; anything else is a hand-over in the report)
Isolation: a git worktree per lane, branch `wip-v131-<g|s>` from the plan commit; commit + push at least every ~20 min and after
every task; report `plan/v131_lane_<g|s>_report.md` (<= 40 lines: APIs as built, tests + results, numbers, hand-overs). Lanes do
not commit `dist/` (build locally for Playwright; the lead rebuilds after each merge). No USA content, no share / screenshot /
download button, no model identifiers in commits, code or files. Never pkill browsers / node by name; close browsers in finally {}.
- **Lane G — GIG SIMULATE**: owns `src/22_sim_gig.js`, `src/55_ui_gig.js`, `tests/sim_gig.test.js`, `tests/pw_gig.js` (new section
  `simulate`; header list updated). Tasks: G1 canSimulate + simBot + simSong/simFinish + playLog in applyResult; G2 55 sheet /
  progress / results / resume / debug; G3 tests (§3) at 390 + 440.
- **Lane S — GEAR SHOP**: owns `src/41_render_garage.js`, `src/52_ui_week.js`, `src/54_ui_sequencer.js`, `src/00_shell.html`,
  `tests/pw_garage.js` (new section `shop`, in the default run), `tests/pw_bands_render.js` (7 -> `C.HOTSPOTS.length`),
  `tests/pw_shop.js` (new section `button`), `tests/pw_seats.js` (section `shop`: label + header button per seat),
  `tests/pw_seq.js` (layout: the head fits at 390 + 440). Tasks: S1 the 41 label + rig follow; S2 52 action + fallback; S3 54 header
  button + CSS; S4 tests.
- **Lead** (done at plan time, this commit): VERSION 1.3.1.0; `02_contracts` (`C.HOTSPOTS` + 'shop' appended, `C.PLAY_LOG_MAX` 5,
  `C.SIM_MIN_PLAYED` 2, the V1.3.1 block); `10_save` (`state.playLog` sanitized when present, never added; `GG.save.playLog`);
  `tests/save.test.js` (+1 test); dist rebuilt (5,219,188 B). Later: merge G then S, hand-overs, matrix, owner shots, review, PR.

## 3. Tests + release checklist
- G node (`sim_gig`): canSimulate true on a booked regular gig; false on `g.showdown` botb / festival / final, `g.festival`, a
  pending sameNight, phase != 'gig', the first lesson gig. simBot: 'band' with 0-1 entries of this seat, 'own' with >= 2; another
  seat's entries ignored; same-difficulty preference; pure (state JSON unchanged). Match: logs of acc 0.6 / 0.8 / 0.95 (ps 0.5 /
  0.8) -> the simulated `r.accuracy` within ±0.05 of A at easy + hard, drums + bass. Determinism: same save + setlist -> identical
  GIG_RESULT JSON twice. Everything counts: a simulated weekend through `career.finishGig` equals the same `r` applied by hand
  (fund, fans, buzz, stats.gigs, lastGig, 'gig:done', the achieve hook ran); playLog unchanged by it; a played gig appends 1 entry,
  the 6th drops the oldest; a played GIG_RESULT has no new field (existing played-gig tests untouched and green).
- G Playwright `pw_gig simulate` (390 + 440): booked regular gig -> setlist: `btn-gig-sim` >= 44 px, no horizontal scroll -> results
  with `gig-simulated` -> Wrap up -> phase 'wrap', stats.gigs +1; a botb setlist shows `gig-sim-no` and no `btn-gig-sim`; the
  existing `e2e` / `gig` sections (Start the show) green; reload mid-simulation finishes simulated.
- S Playwright: `pw_garage shop` (390 + 440): the label on screen between HUD and sheet, `hotspotScreenPos('shop')` picks 'shop', no
  label rect overlaps another (`labelScreenPos`), tap -> walk -> 'gear' (Drum shop); bass / rhythm / lead: the label in the amp
  corner -> "<Instrument> shop"; draw calls +1 only. `pw_bands_render`: all `C.HOTSPOTS.length` on screen + labelled in every
  band room. 2D fallback `hs-shop`. `pw_shop button`: `btn-seq-shop` on sketch Quick + editor (drums + bass) opens 'gear', closing
  returns to the seq, a buy grows the lanes; absent in write / view; `btn-kit-shop` still in ⋯.
- Release (lead): merge G -> S; node suite ALL PASS incl. `compat_v12`, STAGE0, save; Classic 232/232 (`META_ONLY=hash` pw_seq); the
  full Playwright matrix at 390x844 + 440x956 and `tools/phoneqa.js` at both (no horizontal scroll, buttons >= 44 px); size <= 6,000,000
  B; owner shots at 440x956 (setlist with Simulate, simulated results, garage label on drums + bass, sketch-pad header); review
  (<= 3 lenses: compatibility, determinism, layout); PR to `main`; status Version / What's in / Addendum 6 ticked.

## 4. Risks
- R1 Bot vs player mapping (chords, holds, fill notes, Auto-kick goods) drifts from your real average -> the ±0.05 gate per seat +
  difficulty; calibrate inside simBot, never in botPlay (played gigs and tests use botPlay).
- R2 A story show slipping through -> the predicate mirrors playWeekend's routing; one test per showdown kind + tour festival slot.
- R3 The w1 lesson stalls if the first gig is simulated -> D2.
- R4 Label overlap / off-screen in some room, seat or size -> the overlap check per room at both sizes; offset from the kit label.
- R5 `.seq-head` crowding at 390 -> the 44 px icon fallback. R6 Autosave mid-simulation -> the `live.sim` resume path (tested).
- R7 Phone time: 5 songs ~25 ms in node; the chain keeps the UI live. R8 Tests assuming 7 hotspots -> read `C.HOTSPOTS.length`.
