# v0.3.0 "Stage" contract (3 agents + integration)

Read `plan/status.md` first (what exists, APIs, owner decisions). Shapes/events/commands: `src/02_contracts.js`
(new: PHASES 'gig', JUDGEMENTS, CROWD_LEVELS, MOMENTS, VENUE_KINDS, VAN, LIVE_GIG, SONG_RESULT, gig/crowd events,
`runWeek(state, { autoGig })`, `finishGig`). Design: handoff A6 (gigs), A7 (board, venues, travel), A8 (van).

**Done when:** a real gig can be played end-to-end on a phone (book → van → setlist → rhythm game on the 3D stage →
results → wrap) and a bot with fake input hits an expected grade in node tests. All v0.1/v0.2 tests stay green.

## Owner decisions (locked)
- Timing = **Forgiving**: wide early window (≈ Perfect ±60 ms / Good ±130 ms at drum skill 10), drum skill widens it.
- Map = **Saskatchewan core**: Saskatoon, Regina, Prince Albert, Moose Jaw, Swift Current, North Battleford, Yorkton,
  Warman/Martensville. Other provinces later.
- **Kenji drives the van, silently**, every trip, sunglasses on; nobody ever sees him get in or out.
- Garage-era protection: nothing breaks down (van condition drops but no breakdowns) until the first milestone.
- No mid-gig chaos events (no snapped sticks, power cuts). No pay-to-play. No USA content.

## Isolation (all agents)
`cp -r /home/user/GarageToGlory <scratchpad>/<agent>`; work and test only there; at the end copy back ONLY owned files.
No git in the main repo, never publish/push. Lead-owned: build.js, VERSION, 01_ns.js, 02_contracts.js (ask for changes in
your report), tests/_load.js, _t.js, _pw.js, run.js, plan/*, README.md, index.html. Token efficiency is an owner
preference: grep -n + line ranges, exact-string edits, no re-reading, filtered test output.

---
## Agent RHYTHM — the live gig (sim + screen), and the phase-2 integrator
Owns: `src/22_sim_gig.js`, new `src/55_ui_gig.js`, `tests/sim_gig.test.js`, new `tests/pw_gig.js`; phase 2 also
`src/52_ui_week.js`, `src/60_main.js`, shell CSS for its screens.
- **Chart:** from `GG.songs.toNotes(song)` + bpm → notes `{ t (s), lane, section, entry, bar, step }`; freestyle-fill
  windows (A6: short windows where any taps score a show-off bonus — e.g. the last bar of each bridge entry).
  Chart note count == song pattern hits × bars (test).
- **Session (pure, no DOM/audio):** `GG.gig.session(state, gig, setlist, opts)` → `{ startSong(i) → chart, judge(lane, t)
  → { judgement, note, combo, crowd }, tick(t) (misses + meter decay), endSong() → SONG_RESULT, finish() → GIG_RESULT }`.
  Windows from drum skill (owner: Forgiving). Perfect/Good/Miss, combos, crowd meter 0..100 with CROWD_LEVELS; moments:
  mosh on a streak, lighters on a big chorus, boo + drinks on a bad run, **genre moment** at high crowd (metal: wall of
  death; punk circle pit, rock lighters, country line dance — ship all four). **Band effects:** Marcel's cape spin
  (crowd bonus on a streak if `flags.cape` is a cape), Dana's solo section (bridge entries: your lanes ease, fewer
  notes), Jaxon's sneaky fills (occasional surprise extra notes in simple songs), unhappy members (mood < 30) miss cues
  and drag the meter. **Setlist:** size from venue (`setSize`; ~3 at tier 1, 4–5 at tier 2), opener bonus (strong first
  song), closer bonus (biggest hit/classic last), stale songs score less, classics get a cheer.
  `finish()` → GIG_RESULT (grade S–D, pay per deal, gas, fans, buzz, reactions per member, `songs`, `classics`, per-song
  results) computed from the performance + the v0.1 factors (band skill, chemistry, genre fit…).
  Keep `simulate/autoResolve` for bots and `runWeek(state, { autoGig: true })`.
- **Bot:** `GG.gig.botPlay(session, { accuracy, jitterMs }, rng)` drives fake input timestamps at 20 Hz; a perfect bot
  scores 100% accuracy and grade S on a decent song; an average bot lands B–C; window widens with drum skill (tests).
- **Screen (55_ui_gig.js):** `GG.ui.playGig(gig, done)` = setlist picker (sheet: song cards with ratings, stale/classic
  tags, tap to add/reorder, set size, opener/closer hints) → the gig: top ⅔ the 3D stage (`GG.render.setScene('stage')`),
  bottom ⅓ a 2D-canvas note highway (lanes = sequencer colours, notes fall top→bottom to tap zones at the bottom, ≥ 48 px
  zones, multitouch via pointer events, judgement pop, combo, crowd meter, song progress, pause = suspend AudioContext).
  Audio: backing from the scheduler (`GG.audio.timeline` / play with backing); **your taps play the drum sounds**
  (missed notes = silence). Judge against `AudioContext.currentTime` (map pointer `timeStamp` to audio time; apply
  output latency). Between songs: "Song 2 of 3 — saved" + a banter line; the session is stored in `state.liveGig` and
  'gig:song' fires (main autosaves). Results: big grade, pay, fans, buzz, venue rep change, each bandmate's reaction,
  "Wrap up the week". A reload mid-gig resumes at the next song.
- **Phase 2 (after WORLD + STAGE land, lead messages you):** wire the weekend into `52_ui_week.js`: Go → Write
  sequencer(s) → Book board (WORLD's hook) → `runWeek` → block results → if phase 'gig': `GG.ui.playVan(gig)` (WORLD) →
  `GG.ui.playGig(gig)` → `GG.career.finishGig` → wrap. Loading in phase 'gig' resumes. Update pw_flow/year/code to play
  gigs via a bot hook (e.g. `GG.ui.gigAutoplay = true` → botPlay) so they stay fast. Run everything.

## Agent WORLD — gig board, map, venues, van trips, road cards, career flow
Owns: `src/20_sim_career.js`, new `src/26_sim_world.js`, `src/content/venues.js`, new `src/content/map.js`, new
`src/content/road_cards.js`, `src/content/lines.js` (append road banter), new `src/56_ui_board.js`, new
`src/57_ui_van.js`, `tests/sim_career.test.js`, new `tests/sim_world.test.js`, `tests/content.test.js` (extend for
venues/map/road cards), `tools/balance.js`. May edit `src/52_ui_week.js` ONLY to hook the Book block (the RHYTHM agent
wires the rest in phase 2 — keep your 52 edit small and self-contained).
- **Venues:** tier 1 (DIY: house parties, Legion halls, bingo halls, open mics, church/curling halls, skatepark) and
  tier 2 (bars & clubs 100–400) across the Sask-core cities, incl. the parody venues from A7 (The Gopher Hole,
  Saskatoon; Pile o' Bones Tavern, Regina). Each: quirk (funny, one line), capacity, deal options, pay ranges,
  minFans, genreFit for all four genres, `kind` (C.VENUE_KINDS), `setSize`, `walkIns`, the "catch" line. Keep every
  v0.1 venue id (cards book them).
- **Map (content/map.js):** stylized Saskatchewan pins (x/y in a 0..1 box), real-ish road km between cities.
- **World sim (26_sim_world.js):** weekly `listings(state, rng)` (3–6 gigs within reach: fans needed, reputation,
  genre fit, distance → gas + van wear, a "catch"; some are **opening slots** — bad pay, a slice of the headliner's
  crowd; rarely you open for Tundra Wraith), offers arriving on their own once you have fans (v0.1 behaviour kept),
  **three pay deals** (flat guarantee, door split, exposure — Marcel always wants to say yes to exposure), **venue
  reputation** (crush it → rebooked at better pay; bomb → banned, photo on the banned wall; `state.venueRep`, `banned`),
  genre-fit comedy (metal at a country bar pays, expect flying boots), one gig per weekend. Van: `state.van`
  (The Moose Hearse; condition/space/comfort; wear per km; comfort → burnout on long drives; no breakdowns while
  `protected`). Save migration v2→v3 if you add state fields (defaults for old saves) — tell the lead to bump
  SAVE_SCHEMA to 3.
- **Career (20_sim_career.js):** Book block = the board (UI picks a listing; bots pick via `botBook`), `runWeek(state,
  { autoGig })` (phase 'gig' + 'gig:pending' when a gig must be played live; bots/tests pass autoGig), `finishGig(state,
  result)` (applies the live result via `GG.gig.applyResult`, rep, van wear; phase 'wrap'; 'gig:done'). Keep bots and
  balance working (they use autoGig).
- **Road cards (content/road_cards.js):** ~12 cards in the Monday-card schema (2–3 choices with hints/outcomes, gated
  by distance/season/era), plus van banter lines; Kenji never speaks. The prairie, grain elevators, a moose on the
  highway, a flat on the Yellowhead, Tim-Hortons-style parody stops (parody names), Baba's packed lunch, etc.
- **Screens:** `GG.ui.openBoard({ mode: 'book'|'view', onBook(gig), onSkip })` — list + map tabs (tap a pin → its
  gigs), each listing shows venue, city, capacity, deal, fans needed, genre fit, distance/gas, the catch, rep badge;
  booking confirms. Corkboard hotspot → board in view mode. `GG.ui.playVan(gig, done)` — the trip (skippable): uses
  `GG.render.setScene('van')` + `GG.render.van.setTrip/setProgress` (STAGE agent) with a 2D fallback; a road card
  pops mid-drive (resolve like a Monday card), 1–2 banter lines, arrival → done().
- Balance: re-run `node tools/balance.js 1 5` before/after; keep v0.1 year-1 targets.

## Agent STAGE — 3D stage + van scenes (render only)
Owns: new `src/42_render_stage.js`, new `src/43_render_van.js`, new `tests/pw_stage.js`. (`40_render_core.js` /
`41_render_garage.js` only for a minimal hook if unavoidable — list it.) Use `GG.render.defineScene` and
`GG.render.buildCharacter` from v0.1.
- **Stage** (`setScene('stage')`): portrait, the view from behind your kit looking past the band at the crowd; the scene
  must read well in the top ⅔ of the screen (the highway covers the bottom ⅓ — call `setViewInsets` or frame for it).
  Venue dressing by `kind` (house party living room, Legion hall flags + wood panelling, bingo hall number board,
  bar neon, church hall, curling lounge, skatepark ramps, club). Band on stage from their looks with playing anims
  (Marcel's cape when `flags.cape`), your kit in the foreground with stick hits on `hit(lane)`. **Crowd:** instanced
  low-poly people (count from crowd size, cap ~150), sway → jump when hyped, mosh pit circle, lighters, boos with
  flying drinks, wall of death (split and charge), circle pit, line dance, a dog at the house party.
  API: `GG.render.stage.setup({ venue, crowd, members, flags, genre })`, `setCrowdLevel(0..100)`, `moment(kind)`,
  `hit(lane, judgement)`, `bandAction(memberId, action)` ('capeSpin', 'solo', 'fill', 'miss'). No per-frame allocs,
  < 80 draw calls.
- **Van** (`setScene('van')`): from inside the Moose Hearse looking out the windshield, Kenji at the wheel (sunglasses),
  bandmates' silhouettes, dashboard (a bobblehead), the prairie scrolling by: fields, grain elevators, power poles,
  the odd moose; seasonal weather from `state.week` (summer sun, fall leaves, winter snow + ground drift, spring rain)
  and time of day. API: `GG.render.van.setTrip({ from, to, km, season, night })`, `setProgress(0..1)`.
- `tests/pw_stage.js` (META_ONLY=stage|van): scenes build with fixture data, frames advance, every moment/crowd level
  runs without errors, draw calls in budget, no console errors; one 390×844 screenshot each to tests/.cache/.

---
## Integration order
1. RHYTHM, WORLD, STAGE run in parallel (phase 1). RHYTHM must not edit 52_ui_week.js in phase 1.
2. When all three land, the lead messages RHYTHM for phase 2 (wiring + full test run).
3. Lead: contract fold-in, status doc, build, PR, merge.
