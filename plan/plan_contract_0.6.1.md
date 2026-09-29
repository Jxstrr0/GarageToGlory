# v0.6.1 "Addendum 1 catch-up" contract

Read `plan/status.md` first (APIs, owner decisions — especially the **Addendum 1 decisions** and **Addendum 1 — pending**
checklist). The owner's full text is `plan/handoff.md` **Part C** (C1–C7). Shapes: `src/02_contracts.js` (new: C.MONTHS,
C.SEASONS, C.WEATHER, C.CAREER_DIFFICULTY, C.GIG_DIFFICULTY, C.FAN_TYPES, C.MIX_BUSES; state careerDifficulty, weather,
fanTypes, bandbook, superfans, fanClub, gifts, van.driver). SAVE_SCHEMA is 7; VERSION 0.6.1.0 (lead-set).

Scope = every Addendum 1 item that belongs to an **already-shipped** version (v0.1–v0.6). Not in scope: v0.7 world maps
and overseas seasons, v0.8 van names/stickers/upgrades, full character creator, kit quality tiers, v0.9 other bands.
Don't rebuild shipped work from scratch — extend it. No USA content. Comedic, prairie-Canadian, parody names.

**Done when:** every "v0.6.1 catch-up" box in the status checklist is built, tested and ticked; all earlier suites stay
green; the game is playable end-to-end on a 390×844 phone and on 440×956 (the owner's iPhone) with no console errors.

## Save migration (all agents)
Each agent fills defaults for ITS new fields idempotently (only when the field is missing) by chaining onto
`GG.save.migrate` (the existing pattern); the WORLD agent also sets `state.v = 7`. Old saves must load.

## Lane A — Agent AUDIO (isolated copy, parallel with lane B)
Owns ONLY: `src/30_audio.js`, `src/content/genres.js`, `src/54_ui_sequencer.js` (metronome toggle), `tests/pw_seq.js`
(audio sections), new `tests/sim_audio.test.js` if useful. Must not edit anything else (lane B edits the rest concurrently).
- C3 genre kit tuning for all four genres (metal tight/clicky kick + high sharp snare for double-kick runs; punk loose,
  trashy, bright; rock big roomy kick/snare, lots of reverb; country soft and dry, rim clicks for the train beat, optional
  brushed snare). Voices per spec (kick sine thump + pitch drop + click; snare noise crack over tuned body; hat short
  bright high-passed noise; cymbal long shimmer; toms 3 pitched booms; ride bell / china trashy).
- Generated band per genre with a **new random key per song** (seeded by song id): metal palm-muted guitars chugging on
  every kick hit, bass doubling, Dana's solos as fast arpeggios (bridge); punk fast downstroke power chords, root-note
  bass, gang "HEY!" shouts in choruses; rock riffs + open chords, bluesy lead, walking bass; country acoustic
  boom-chicka strum, fiddle melody, root-fifth bass, twangy licks. Sections change density (sparse verses, full
  choruses, breakdowns strip back to the heavy parts). Keep the owner's v0.2 metal "tempo decides" styles.
- **Vocal hits** synthesized and scheduled on the song's beat grid, fitting the song: shouts on chorus downbeats, growls
  where a breakdown drops, yeehaws for country, pitched ones matched to the song's key. Never free-running or off-beat.
- Rooms & ambience driven only by bus events/state (no edits to other files): venue reverb by size during gigs (read
  `GG.state.liveGig.gig` capacity/kind: basements dry, Legion halls echo, theatres/arenas huge); a crowd bed that swells
  with the crowd meter ('crowd:level', 'gig:judge') plus synthesized cheers/boos ('crowd:moment'); garage hum with Dana
  noodling faintly while the garage scene is showing and no full screen is open ('screen:open'/'screen:close',
  `GG.render.util.currentScene()`); road noise while the 'van' screen is open; **van radio**: once one of your songs has
  charted on the Maple 100 (`state.albums[].chart.peak`), play it quietly on the van radio during drives.
- **Mixer**: `GG.audio.setVolume(bus, 0..1)`, `getVolume(bus)` for C.MIX_BUSES (drums = your taps + kit voices; band =
  backing + vocals; crowd = crowd bed/cheers/boos; sfx = UI sounds + ambience), persisted in `GG.save.settings().mix`.
  **Metronome** toggle in the sequencer (persisted `settings.metronome`). The SETTINGS agent builds the mixer sliders
  against this API.
- Keep ≤ 12 voices for music, the limiter, `AudioContext.currentTime` scheduling, and the v0.5.1 gig clock contract
  (`GG.audio.context()`); nothing may clip (OfflineAudioContext checks per genre in pw_seq audio).

## Lane B — sequential agents working directly in the repo (never touch lane A's files)

### B1 Agent WORLD (calendar, weather, holidays, maps in rings, van drivers)
Owns (in B1's turn): new `src/28_sim_calendar.js` (monthOf/seasonOf/holidayOf/weather roll + effects), hooks in
`20_sim_career.js`, `26_sim_world.js`, `27_sim_drama.js` (driver quits → you drive), `content/map.js` (Canada in rings:
Sask ring additions incl. Humboldt, Gravelbourg, Estevan; West ring unlocked in Local Heroes; East & North ring in
Signed — with parody venues across rings, e.g. Pile o' Bones Tavern Regina, Frostbite Lounge Winnipeg, Commandant
Ballroom Vancouver, The Hoofprint Toronto, the Sad Dome Calgary), `content/venues.js`, `content/road_cards.js` (C1 road
events + "you drive" pool + weather/holiday road cards), new `content/calendar.js` (holidays, season flavour, weather
lines), `content/cards.js` (holiday Monday cards: Thanksgiving guilt dinner if you owe money, the label's terrible
Christmas single, Halloween costume gig, Canada Day, the Grey Mug halftime show as a late-career moment), `56_ui_board.js`
(the Canada map in rings, locked rings teased), `57_ui_van.js` + `43_render_van.js` (driver per band up front, you
riding shotgun, band in back rows, gear + merch piled behind, driver's dashboard item — Kenji's tiny cactus; weather on the
windshield), `41_render_garage.js` (garage by season: snow at the window, Christmas lights in December, a box fan in
July), `52_ui_week.js` (HUD shows month + season + weather), tests (`sim_world`, new `sim_calendar.test.js`,
`content.test.js`, `pw_world.js`), `tools/balance.js`.
- Calendar per status C7 (C.MONTHS/C.SEASONS); fix the v0.3 season mapping to match (winter = weeks 11–16). Loonies stay
  at week 20 (April). Holidays: NYE (week 12) best-paying gig of the year; St. Patrick's pub circuit (week 18); Canada Day
  (week 1) free outdoor park shows with huge buzz; Halloween (week 8) costume gigs where the band dresses as another band;
  Thanksgiving (week 7) dinner at your parents' (guilt cards if you owe them); Remembrance Day (week 9) — no Legion gigs
  that week; Christmas (weeks 11–12) holiday party circuit + the label pushes a terrible Christmas single; the Grey Mug
  (week 10) halftime show — a massive late-career moment gated to Signed/big fans.
- Weather rolled weekly by season and region (clear/rain/snow/blizzard/heat/hail); affects outdoor-gig turnout, van
  travel risk, crowd energy, windshield visuals; **never cancels a gig**. Season effects: winter whiteouts, icy roads,
  forgotten block heater, fewer outdoor gigs, cabin-fever moods; spring potholes (extra van wear), mud, festival lineups
  announced; summer festivals, fairs, mosquitoes, road construction, hailstorms (Hail Damage takes them personally); fall
  frosh-week campus shows, harvest dances, Halloween. **Genre-season fit**: country thrives at summer fairs/rodeos, punk at
  summer skate parks/all-ages, metal owns the dark winter months.
- Van drivers (C1): per band (all four defined; only Hail Damage plays now): Kenji fewer breakdowns; Moth free
  maintenance + terrible comfort; T-Bone safe but slow; Earl slow but road stories boost chemistry. If the driver quits,
  you drive and the road-card pool changes (more wrong turns, gas-station arguments).

### B2 Agent FANS (Bandbook, fans, fan club)
Owns (in B2's turn): new `src/29_sim_fans.js`, new `src/content/bandbook.js`, new `src/5g_ui_bandbook.js` (a Bandbook
tab/app on the laptop via `53_ui_laptop.js`), hooks in `20_sim_career.js` (Promote block posts automatically), `22_sim_gig.js`
(superfans follow on tour / buy merch hooks — merch itself is v0.8, so keep it to crowd/buzz effects), `27_sim_drama.js`
(scandal cards), `41_render_garage.js` (fan mail + gifts in the garage: a macaroni portrait of Kenji on the wall, a gift
pile), `content/cards.js` (scandals, superfan cards), tests (new `sim_fans.test.js`, `content.test.js`, new `pw_fans.js`).
- Bandbook per status C5: Promote posts automatically (content picked from band state: rehearsal clip, gig announcement,
  song teaser, meme, behind-the-scenes); posts drive buzz, streams and new fans; fans stay ONE global count; each post a
  small viral chance (higher for weirder moments), good viral or the wrong kind (Marcel's cringe dance tutorial: buzz up,
  his mood down); 2–4 generated comedic comments per post reflecting sentiment ("saw them at a Legion hall, 12 people and a
  dog, I was the dog"); **Tundra Wraith leaves a supportive comment on every post**; scandals → choice cards (Marcel's
  beloved lawn is artificial turf); fan types super/casual/hater as shares (haters grow with fame and get their own
  comments; superfans follow on tour); recurring named superfans: **Dale from Warman** (at every show — in the crowd
  and comments), the trucker from the jumper-cable story, and the president of your Japanese fan club (reserve for v0.7);
  fan mail + gifts in the garage; paid fan club on **Patreeon** (owner pick; "support your favourite band's van repairs";
  tiers Drumstick / Snare / Full Kit) unlocking in the Signed era: monthly income from superfans that depends on keeping
  them happy with exclusive posts.

### B3 Agent SETTINGS (settings screen, calibration, difficulty, assists, accessibility)
Owns (in B3's turn): new `src/5h_ui_settings.js` (settings screen reachable from the title and the ☰ menu), `51_ui_menu.js`
(career difficulty on the new-career screen; menu entry), `10_save.js` (settings defaults), `22_sim_gig.js` + `55_ui_gig.js`
(gig difficulty **Expert**; independent note speed; assists No-fail, Auto-kick, Practice mode for any catalog song with
slow-down; lefty mirror lanes; colourblind lane colours; calibration offset applied to judgement), `40_render_core.js`
(graphics quality low/med/high; camera shake toggle hook), `00_shell.html` (bigger-text + reduced-flashing CSS),
difficulty multipliers wherever the sims read tunables (economy/drama/rival/labels via one helper), tests (new
`pw_settings.js`, `sim_career`/`sim_gig` additions).
- Calibration per status C4: runs automatically on first launch (skippable), re-runnable from Settings: tap along to
  eight clicks → average offset vs `AudioContext.currentTime` (robust to the v0.5.1 clock rules) applied to note
  judgement; a visual check (tap on a flashing light) for visual offset; **two saved profiles, phone speaker and
  headphones**, with a quick switch (also on the setlist sheet).
- Career difficulty Chill / Normal / Brutal on the new-career screen, **locked for that career** (Chill: more money,
  slower mood decay, softer rivals and labels; Brutal: tight money, touchy bandmates, ruthless labels, a rival that
  doesn't miss). Old saves = normal.
- Settings screen: gig difficulty + note speed + assists, audio profile + calibration, mixer sliders (lane A's
  `GG.audio.setVolume/getVolume`, guarded), metronome toggle mirror, lefty, graphics quality, camera shake, colourblind
  lanes, bigger text, reduced flashing (pyro/stage lights/camera flashes), skip van scenes, faster animations, save
  management (link to the existing slots/save-code screens).

## Stage C — Agent VERIFY (after both lanes)
Pulls lane A's files in, runs ALL suites (node + every pw_* section, at 390×844 and a 440×956 pass of flow/gig/touch),
fixes integration issues (e.g. mixer sliders ↔ audio API), makes one contact sheet `tests/.cache/v061_sheet.png`
(HUD with month/weather, Canada map rings, van with driver + cactus, Bandbook, fan club, settings, calibration, career
difficulty picker), ticks the status checklist, reports.
