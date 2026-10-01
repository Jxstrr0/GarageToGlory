# v1.0 "Glory": plan contract (planner draft, reviewed by the lead; owner answers in §0)

Repo: `/home/user/GarageToGlory`, branch `v1.0-glory` (= `main` 0.9.0.0). Stage 0 bumps VERSION to `1.0.0.0`. All paths are
repo-relative.

Sources: `plan/status.md` (Version, owner decisions, Addendum 1/2 checklists, "What's in v0.9" incl. the v1.0 forward-compat
note / contract gap #11, back-burner, APIs), `plan/handoff.md` (A2, A9–A15, B1–B5 with the B4 v1.0 line, C4, D2–D6), the
v0.9 contract (format), and three read-only audits: SPEC (86 requirement items), CODE (hook survey), PERF (measured baseline
in headless Chromium at 390×844 / 440×956, CDP CPU ×1/×4, scripts in the planner scratchpad `v10perf/`). Bot numbers below
come from `BAND=all node tools/balance.js 10 4` on this branch (planner scratch run; Lane E re-measures at 30 seeds).

---

## 0. Owner questions (OPEN, two popups of four; recommended option first; every lane builds to the answers)

Popup text should also list the "defaults taken without a popup" below, so the owner can object in the same reply.

### Popup A: endings

**Q1 Bonus years** (`bonus_rule`). How does a band earn the 2–3 bonus years (the career runs to year 12 or 13 instead of 10)?
- **(a) Early World stage (Recommended).** World stage by the end of year 5: +3 years; by the end of year 6: +2. Granted on
  the spot with a bandmate's message, so tours and albums can be planned past year 10. Bots: the good bot reaches World in
  weeks 96–107 (+3 every time); the average bot in weeks 149–167 (usually none).
- (b) Legacy at year 10. Decided at the year-10 wrap from the Legacy score. A surprise, but nothing can be planned past year 10.
- (c) Any World stage. Reaching World at any point earns +2. Most careers get them.
- Answer: ______

**Q2 Sad Dome** (`sad_dome`). In a career with bonus years, when is the Sad Dome co-bill (the final showdown)?
- **(a) In the last year (Recommended).** Week 21 of the career's final year, so the showdown stays the climax just before the
  ending (A11: "near the end of the career"). With no bonus years it is year 10 week 21, exactly as now.
- (b) Always year 10. As locked in v0.6; the bonus years are an encore after it and the headline/open result stands.
- Answer: ______

**Q3 Ending tiers** (`ending_tiers`). How harsh are the five tiers (Arena Legends → Canadian Institution → Cult Heroes →
One-Album Wonders → Still in the Garage)?
- **(a) Score only, fair middle (Recommended).** The Legacy score alone picks the tier. Tuned so a strong career lands Arena
  Legends, an average one Canadian Institution or Cult Heroes, and Still in the Garage only if you never really left it.
  Losing the Sad Dome changes the text, not the tier. Career difficulty shows as a badge, not a multiplier.
- (b) Strict. Arena Legends also needs headlining the Sad Dome and a broken region abroad; average careers mostly end as Cult
  Heroes or One-Album Wonders.
- (c) Difficulty counts. As (a), but Brutal adds 15 % to the score and Chill takes 15 % off.
- Answer: ______

**Q4 Other bands** (`band_twins`). Some endings and trophies are Hail Damage jokes (Moose Opera, Ma Pelouse, Buddy, "The
Original Five"). What do the other three bands get?
- **(a) Their own twins (Recommended).** Each band gets a special ending from its World payoff (Big in Berlin, Mudstonbury
  Legends, Outback Legends), a storyline trophy instead of Ma Pelouse, its own "lose to your rival at the Loonies three years
  running" trophy, and "The Original Four" for the four-piece bands.
- (b) Hail Damage only. Those stay Hail Damage-only; the other bands share the generic ones (Big in Japan, Band of Strangers,
  Side Project, The Original Four/Five).
- Answer: ______

### Popup B: meta, tutorial, phone

**Q5 Unlocks** (`meta_unlocks`). What carries over from one career to the next?
- **(a) Looks from finished careers (Recommended).** Each ending tier and special ending you reach unlocks new logo colours
  and emblems; creator items unlocked in any finished career work in every genre. Trophies stay bragging only. Nothing that
  changes gameplay.
- (b) Only the Hall of Fame. No new unlocks; keep today's per-genre carry-over toggle and add the Hall of Fame.
- (c) Trophies unlock looks too. As (a), plus each trophy unlocks a small cosmetic (a sticker or a palette).
- Answer: ______

**Q6 Hall of Fame** (`hall_of_fame`). What does a Hall of Fame entry show for each finished career?
- **(a) Logo, lineup, ending, years (Recommended).** Band logo, your name, the lineup as small avatars, the ending tier and
  special endings, the Legacy score, a difficulty badge, trophies earned, and a strip of yearly headlines (tap a year for its
  numbers). Opens from the title screen. The save code carries it too, so a phone backup keeps it.
- (b) Just a scoreboard. One line per career: band, ending, score, years. Smallest.
- (c) Add a band photo. As (a), plus one small band photo per career (more phone storage; not in the save code).
- Answer: ______

**Q7 Tutorial** (`tutorial`). How much teaching in a new career, and when can it be skipped?
- **(a) Full week 1, light weeks 2–4 (Recommended).** Bandmates walk you through week one (Monday card, walking the room,
  Write, Rehearse, the first gig, each stat once at the wrap), then one short lesson the first time you open the gig board,
  money/merch, the group chat and the van. Once any career has passed week 4, new careers offer "Skip the lessons" (on by
  default). A "?" button replays any lesson.
- (b) Week one only. The week-one walkthrough; weeks 2–4 keep today's toasts. "?" still replays.
- (c) Skippable from the start. As (a), but the skip switch is offered on the very first career too.
- Answer: ______

**Q8 Battery** (`perf_look`). The performance pass can make gigs smoother and save battery on your iPhone. How far by default?
- **(a) Auto sharpness (Recommended).** A new default "Auto" graphics setting: draws at 1.5× instead of 2× on your phone and
  steps down only when frames run slow; quiet rooms run at 30 fps; the 3D pauses behind tall menus. Slightly softer picture,
  much less heat. "High" stays one tap away in Settings.
- (b) Keep it sharp. Keep "High" (2×) as the default; only make the changes you can't see (30 fps rooms, pausing behind
  menus, a simpler distant crowd, cheaper drum sounds).
- Answer: ______

### Defaults taken without a popup (listed in the popup text so the owner can object)
- **Big in Japan** = Japan broken and (a song blew up in Japan, or Japan holds ≥ 20 % of all fans).
- **Side Project** = at least 2 of your originals play for the rival when the career ends (defected or poached).
- **The Original Five / Four** = no original bandmate ever quit (a quit-and-return counts as lost). **Band of Strangers** and
  the trophy **Kijiji All-Stars** share one condition: no originals in the final lineup. Texts read the lineup size ("you and
  three strangers from Kijiji" only when there are three).
- **Epilogues:** the shipped epilogue stays each original's default; the A14 lines become state-keyed variants (Marcel's cape
  shop if the Cape Saga ran, Dana's solo finally ends, Jaxon's baba becomes your manager, a new bass every Christmas from
  Kenji). Recruits get a generic pool by trait/quirk. Kenji's epilogue stays wordless (narration only, never a quote).
- **"Still in the Garage"** keeps its name for every band; its text names the band's own space (`{space}`). "A statue in
  Saskatoon" becomes "a statue in `{city}`".
- **Hall of Fame** keeps the last 40 careers (the top 10 by score are never dropped). No photos stored.
- **Laptop tab "Trophies"** = achievements across careers (10th tab, wraps 5 + 5). The garage keeps its "Trophy shelf" (this
  career's gold records, Loonies, banned wall).
- **~33 achievements:** the 15 seeds, 6 band twins (if Q4a), 12 cheap extras (the owner pre-approved "add freely"). Toasts
  wait until the song ends (never mid-song).
- **The tutorial** is off under automation (`navigator.webdriver`) unless `?tut=1`, like the first-launch calibration.
- **Old saves:** an ended career gets its Hall of Fame entry the first time it is opened; a save in the World era whose World
  week qualifies gets its bonus years at its next wrap.
- **Phone QA split:** v1.0 does automated QA of every screen at 390×844 and 440×956; the owner's hands-on checks (Bluetooth
  calibration, battery on a full gig, two thumbs by hand) stay in v1.1 (D5).
- **Size:** the build strips full-line code comments from `dist/` (−428 KB); v1.0's own additions are capped at +150 KB.

---

## 1. Scope

### 1.1 Must (v1.0.0 "Glory", handoff B4 + D4)
1. **Legacy score** at career end from fans, albums sold, awards, biggest venue headlined, regions broken, band unity and the
   final-showdown result (A14). Needs one new tracker: biggest venue *headlined* (§4.1).
2. **Ending tiers** (5) and **special endings** stacked on them (A14 list + band twins per Q4), as content.
3. **Epilogue cards** for every member in the final lineup, originals who left (and defectors), recruits; Kenji wordless.
4. **Bonus years** (Q1 rule), with nothing in the sim assuming 10 years (rival fade, Sad Dome per Q2, wrap text, deck,
   labels, tours, recaps keep working to week 312).
5. **End sequence** replacing the stub `end` screen: Legacy count-up → tier → specials → epilogues → Hall of Fame line.
6. **Hall of Fame** (Q6) in `gg.v1.hof`, opened from the title screen; written once per career, idempotent; carried by the save
   code (merged on restore).
7. **Meta storage** in `gg.v1.meta` (careers counters, lessons seen, achievements, cosmetic unlocks) with the in-memory fallback.
8. **Meta unlocks** per Q5 (cosmetic only; never gameplay; no gong anywhere on the kit or in emblems).
9. **Achievements (D4):** ~33 as content (`src/content/achievements.js`), per-career evaluation in a DOM-free sim, cross-career
   store in meta, laptop "Trophies" tab, toast on unlock (after the song).
10. **Tutorial** (A15) for all four bands, in character: week one, weeks 2–4 (per Q7), the year-1 "good year" recap kept, "?"
    replay of any lesson, skip on later careers.
11. **Performance pass:** instancing kept/extended, crowd LOD, voice cap (global), frame governor, adaptive pixel ratio (Q8),
    first-visit stalls removed. Targets in §4.9.
12. **Phone QA** (automated) at 390×844 and 440×956 for every screen, including all new ones.
13. **Housekeeping:** VERSION 1.0.0.0; tick D4 in Addendum 2; status Version/Current/Next; size ≤ 4,500,000 bytes on disk.

### 1.2 Nice-to-have (do if the lane has budget; never blocks the merge)
- Player and rival epilogue cards; storyline-result variants (council, riff, truck; `mooseMuse`, `babaMad`).
- A "bonus years" badge on the HUD year chip ("Y11 / 13").
- Sad Dome dressing (banner + the cheap LOD back rows give it a bigger crowd for free).
- The garage "Trophy shelf" sheet links to the laptop Trophies tab.
- Pre-compiling the next scene's shaders during dead time (van drive, setlist, Loonies intro).
- Slot records stored LZW-compressed when JSON > 100k chars (lead, 10_save; only if Q measures localStorage over 1.5M chars).
- Fold the runtime EFFECT_KEYS additions (`member`, `payCut`, `repay`) into 02_contracts.js (back-burner, lead).

### 1.3 Deferred to v1.1 "Tuning" (D5; v1.0 does not pull these in)
- Owner playtest loop, the back-burner sweep, money/fans retuning, the two-thumb same-half chord tweak (PERF: 47–73 % of
  chords on one half), rock's walking bass, band-voice onset compensation (stale v0.8.3 deferral), the planner-sheet room
  squeeze, voice tweaks, Bluetooth calibration and battery checks by hand.
- `GG.render.garage.peek` (genre-card 3D still) stays unbuilt (2D art works).

### 1.4 Contradictions found by the audits and how this contract resolves them
| # | Contradiction | Resolution |
|---|---|---|
| 1 | A11 "final showdown near the end" vs the locked "Sad Dome in year 10" once bonus years exist | Q2 (recommend the last year; identical for 10-year careers) |
| 2 | Shipped HD epilogues (`content/drama.js` L59/89/119/146) ≠ the A14 examples | default: shipped = fallback, A14 lines = state-keyed variants |
| 3 | "Phone QA at 390×844" in both B4 v1.0 and D5 v1.1 | default: automated QA in v1.0, hands-on in v1.1 |
| 4 | "Achievements never gate content" vs "meta unlocks" | Q5 (cosmetic only; trophies bragging unless Q5c) |
| 5 | Size: task says 4.3 MB, status 4.42 MB; `build.js` prints chars/1024 (4,305) while the file is 4,417,065 bytes | measure = bytes on disk (`stat`), budget 4,500,000 B; stage 0 strips comments; build prints bytes |
| 6 | "The Original Five" vs four-piece Frost Heave / Gravel Kings | name and text read the lineup size |
| 7 | Band of Strangers = Kijiji All-Stars condition | one shared condition (`originals.kept === 0`) |
| 8 | Chartbusters' `legacy` number vs the player's Legacy score | the player's score is `state.legacy.score`, UI label "Legacy"; rival fame keeps its label "Fame" in UI |
| 9 | Block Heater is free while protected (no breakdowns before 250 fans) | requires protection over and ≥ 3 gigs away from home that winter |
| 10 | Garage hotspot "Trophies" vs laptop "Trophies" | laptop tab = cross-career Trophies; the garage sheet's title stays "Trophy shelf" |

---

## 2. Already works: reuse, do not rebuild

- **Career end.** `career.endWeek` (`20_sim_career.js` L1224-1260) → `advance` (L1209-1219) ends at `state.maxWeeks` (per career;
  set at L797, defaulted in `10_save.js` L146) and emits `week:wrap`, `year:end`, `career:end {state}` (L1255-1257).
  `settleGig` (L1077-1088) is the per-gig hook point (the recap's `GG.recap.gig` precedent at L1084).
- **maxWeeks-aware already:** label release pickers (`24_sim_labels.js` L756, L763, L1458), tour booking guard
  (`25_sim_tour.js` L256), the rival's `next().final.reachable` (`23_sim_rival.js` L495). Raising `maxWeeks` extends them.
- **World era:** `24_sim_labels.js` L1117-1121 (`milestones.worldReady` + `career.setEra(state,'world')`); `state.eraHistory`
  `[{era, week}]` (`20_sim_career.js` L760-768) gives the World week.
- **Final showdown:** `23_sim_rival.js` `finalGig` L417-426, forced Monday L470-474, `isFinalWeek` L345-348, resolve L604-656
  (`state.finalShowdown = {week, won, headliner, score, rivalScore, rival}`; `final:done`), `R.final` L659, auto-resolve
  L726-733, `finalSoon` news L764-768; config `economy.rival.final {year:10, week:21}` (`content/economy.js` L268); the end
  line `ui.rivalEnd` (`59d_ui_rival.js` L580-586, testid `end-final`).
- **Recaps (D3):** `GG.recap` (`2d_sim_recap.js` API L1-17, build L84-127, `list/get` L128-129, `headline` L133-187, `goodYear`
  L225-240, migrate chain L237-243); RECAP shape `02_contracts.js` L142-144 (~650 chars/yr). UI `ui.openRecap(year, then)`
  and the `recap` screen read `GG.state` (`5l_ui_recap.js` L196-233), `ui.recapPanel` (laptop Years tab). The band photo
  (`ui.recapPhoto`, L72) is session-only.
- **Epilogues:** `content.drama.members[id].epilogue` for all 14 originals (`drama.js` L59/89/119/146; packs
  `zz_band_frost_heave.js` L1810/1839/1867, `zz_band_gravel_kings.js` L1675/1704/1733, `zz_band_grid_road_ramblers.js`
  L1937/1967/1997/2026). Nothing reads them yet. `members[]` carry `original`, `status`, `returns`, `exit`;
  `state.rivalDefectors` (L814).
- **Awards and trophies:** `L.runLoonies` (`24_sim_labels.js` L1280-1320; AWARD into `state.awards`, trophies L1310-1311,
  `stats.loonieWins`, `loonies:result` with `rivalWon`), worst_van branch L1300-1303; certs into trophies (L939); Global Gong
  `T.runGong` (`25_sim_tour.js` L798-823, `state.tour.gongs`); Grey Mug (`28_sim_calendar.js` L281-298).
- **Milestones / D4 hooks already written:** `checkMilestones` (`20_sim_career.js` L1164-1183: firstGig, firstSong, fans*,
  signed …); `milestones.soldOut` (`2c_sim_licensing.js` L13, L218); `stats.parentsLoans`; payoff flags
  (`25_sim_tour.js` L66 `payoffFlags`, `T.payoffDone` L328); `tour.regions[id] {broken, big, fans}` (L32).
- **Logo:** cached renderer; `GG.render.logo.forState`, `dataURL` (`46_render_logo.js` L458), `ui.logoImg(logo, name, size)`
  (`5m_ui_logo.js` L25-32) draws a logo with no state. Carry-over keys `gg.v1.unlocks.<genre>` and `.logo`
  (`2b_sim_creator.js` L370-388, `2e_sim_logo.js` L155-172; raw localStorage, no memory fallback).
- **Storage:** `GG.save.KEYS.hof` / `.meta` reserved (`10_save.js` L2, L11), `save.getJSON/setJSON` with memory fallback
  (L20-61), `save.migrate` (L135), `toCode/fromCode` (L301-317, `GG1:` + LZW + base64url).
- **Career difficulty:** `GG.difficulty` (`11_settings.js` L107-129), locked per career (`state.careerDifficulty`).
- **Teaching hooks:** `GG.main.afterCard` week-1 toast (`60_main.js` L190-200); forced week-1 card per band (`forceWeek:1`);
  `career.firstGigVenue` (L775-789); first-Write starter + tips (`54_ui_sequencer.js` L578-590); `ui.toast` / `ui.bubble`
  (`50_ui_core.js` L184, L201); `GG.render.goToHotspot`, `hotspotScreenPos`, `memberScreenPos`, `playerScreenPos`
  (`40_render_core.js` L171-185; "for tests, tutorial arrows and speech bubbles"); garage HOTSPOTS (`41_render_garage.js`
  L63-71); `screen:open {id}` for first-open triggers; speaker guard + role aliases (`career.speakerOk`, `roleOf`,
  `ui.presentLines`, `career.isSilent`); first-launch calibration skip under automation (`5h_ui_settings.js` L279-287).
- **Title / creator / laptop:** title kids (`51_ui_menu.js` L116-132), creator + create (L266-347, L309-320; seed =
  `hashSeed(name + Date.now())`), ☰ menu (L369), laptop TABS (`53_ui_laptop.js` L16; a 10th tab wraps 5 + 5 with no CSS
  change, `00_shell.html` L941 `:nth-child(9)` rule); the `creator:unlocked` toast precedent (`5j_ui_creator.js` L297-300).
- **Render perf already in place:** instanced stage crowd (`42_render_stage.js` MAX_CROWD L36, `instanced()` L1189-1194,
  crowd build L1113-1250), merged crowd sea (L571-590), instanced blob shadows / van / carpet / title hail, Builder merges
  (`40_render_core.js` L452-469); quality table `QUALITY` (L29: low 1×/40 %, med 1.5×/70 %, high 2×/100 %), `R.prefs()`;
  `R.setPaused` (L155) driven by `60_main.js` `covered()/updatePause()` (L25-31, full screens only).
- **Audio caps:** `30_audio.js` L64 (MAX_VOICES 8 sfx, SONG_VOICES 18 of which BAND_VOICES 8, CROWD_VOICES 12, AMB_VOICES 6),
  `book()/fits()` (L666-680), taps choked per lane (L1671-1691). Peak at the measured festival gig: 30 sources, 0 drops.
- **Conventions:** `tests/_load.js` SIM_SAFE `/^(0[12]_|1\d_|2[\da-z]_|content\/)/` — new sims named `2f_`/`2g_` and the meta
  module `12_` load in node tests and `tools/balance.js`; content loads alphabetically before `zz_band_*`; migrations chain onto
  `GG.save.migrate` with a `.<name>` flag (`2d` L237-243); `GG.registerDebug(name, fn)` (`01_ns.js` L80); `tests/run.js` picks
  up every `tests/*.test.js`.

---

## 3. Stage 0 (lead, one commit on `v1.0-glory` before the worktrees fork)

1. **Record the owner's answers** (§0) in `plan/status.md` under owner decisions; mark D4 "in progress".
2. **`VERSION` = `1.0.0.0`.**
3. **`build.js`:** strip full-line `//` comments from the JS modules (skip lines inside a template literal: track backtick
   parity per file; the planner's scan found 0 such lines and 427,982 bytes of comment lines). `NOSTRIP=1` keeps them. Print
   bytes on disk and KiB: `built V1.0.0.0: N modules, 3,989,xxx bytes (3,896.x KiB)`. The `/* file */` headers stay.
4. **`src/02_contracts.js`** (lead-only from here on):
   - `C.CAREER_YEARS = 10` stays; `C.BONUS = { maxYears: 3, rule: [{ byYear: 5, years: 3 }, { byYear: 6, years: 2 }] }` (per Q1;
     Q1b → `{ at: 'y10', minScore }`, Q1c → `[{ byYear: 99, years: 2 }]`).
   - `C.ENDING_TIERS = ['arena_legends','canadian_institution','cult_heroes','one_album_wonders','still_in_the_garage']`.
   - `C.SPECIAL_ENDINGS = ['big_in_japan','moose_opera','big_in_berlin','mudstonbury_legends','outback_legends',
     'band_of_strangers','original_lineup','side_project']` (Q4b drops the three twins).
   - `C.LEGACY_PARTS = ['fans','units','awards','venue','regions','unity','final']`.
   - `C.ACH_KINDS` (the condition vocabulary in §4.6) and `C.LESSONS` (the lesson ids in §4.7).
   - Shapes (comments): LEGACY, EPILOGUE, HOF_ENTRY, META, ACH, LESSON, STEP (§4), new state fields
     (`bonusYears`, `legacyTrack`, `legacy`, `ach`, `tutorial`) and the new events (§4.8).
   - `C.SAVE_SCHEMA` stays 10: every new field is fill-when-missing through the migrate chain (no shape change).
5. **`src/12_meta.js` (new; stage 0 writes the storage layer, Lane M owns it afterwards; the API below is frozen):**
   `GG.meta = { enabled, load(), get(), save(), careerId(state), noteWeek(state), lessonSeen(id), markLesson(id), award(state,
   ids), has(id), unlock(kind, ids), unlocked(kind), recordCareer(state), hof(), exportLite(), mergeLite(obj), debug }` over
   `GG.save.getJSON/setJSON(KEYS.meta | KEYS.hof)` (memory fallback when storage is blocked). `enabled` is false by default (node
   bots and tests never write meta unless a test turns it on). `recordCareer` calls `GG.legacy.hofEntry(state)` when present and
   is idempotent by `careerId`. Shapes in §4.4–4.5.
6. **`src/10_save.js`:** `toCode` embeds `_meta: GG.meta.exportLite()` (when `GG.meta` exists); `fromCode` strips `_meta` and
   calls `GG.meta.mergeLite`. Old codes (no `_meta`) restore unchanged. Tests in `tests/save.test.js`.
7. **`src/20_sim_career.js` hook lines only** (the files stay otherwise unowned):
   - `settleGig` after `GG.recap.gig`: `if (GG.legacy) GG.legacy.gig(state, r); if (GG.achieve) GG.achieve.gig(state, r);`
   - `endWeek` after `checkMilestones`: `if (GG.legacy) GG.legacy.weekly(state, wrap);` (bonus years land before `advance`)
     and after the year-end block: `if (GG.achieve) GG.achieve.weekly(state, wrap);`
   - in `advance` when the career ends: `if (GG.legacy) wrap.legacy = GG.legacy.finish(state); if (GG.achieve)
     GG.achieve.finish(state);` (before `career:end` is emitted).
8. **Sockets** (one-line entry points so no two lanes edit the same UI file; each calls a §4 API if it exists):
   - `51_ui_menu.js` title: a "Hall of Fame" button (testid `btn-hof`) when `ui.defined('hof') && GG.meta.hof().length`;
     ☰ menu rows `menu-lessons` (→ `GG.tutorial.openLessons()`) and `menu-hof`; creator row `tut-skip` (a toggle, shown when
     `GG.tutorial && GG.tutorial.offerSkip()`, default on) passing `skipLessons` to `GG.main.newCareer`.
   - `52_ui_week.js`: HUD "?" button (testid `btn-help`, ≥ 44 px, next to ☰) → `GG.tutorial.openLessons()`; wrap line L514 →
     `GG.legacy ? GG.legacy.yearsText(st) : 'Ten years.'`; **move** the `end` screen stub (L534-549) verbatim into a new
     `src/5n_ui_ending.js` (Lane E's file).
   - `53_ui_laptop.js`: TABS += `{ id: 'trophies', label: 'Trophies' }` → `ui.trophiesPanel(st)` (placeholder text if absent).
   - `60_main.js` boot: `if (GG.meta) { GG.meta.enabled = true; GG.meta.load(); }`.
   - `00_shell.html`: empty CSS anchor blocks `/* v1.0 ENDINGS { */ … /* } */`, `TROPHIES`, `HOF`, `TUTORIAL`, `PERF`, `QA`,
     each pair separated by an unchanged line; each lane edits only inside its block.
9. **`tests/_pw.js`:** `PW_VIEW=440x956` (default `390x844`) and `PW_TAG` for screenshot names, so the 440 runs need no
   scratch copy.
10. **Baselines:** `BAND=all node tools/balance.js 10 30` → `plan/balance_baseline_v10.txt` (the pre-v1.0 reference); copy the
    PERF audit's numbers (§4.9 "now" column) into `plan/perf_baseline_v10.txt`.
11. **Worktrees** from this commit; copy `tests/.cache/three*` into each.

---

## 4. Shared contract (every lane codes against this)

### 4.1 Legacy score (Lane E, `2f_sim_legacy.js`; pure, never draws from the career RNG)
Score 0–1000, the sum of seven parts. Tunables live in `content/endings.js` `legacy` (Lane E tunes them with bots).

| part | max | input (state at career end) | formula (proposal) |
|---|---|---|---|
| fans | 250 | `state.fans` | 250 × min(1, fans / 80,000)^0.6 |
| units | 200 | `stats.units` (albums sold) | 200 × min(1, units / 600,000)^0.5 |
| awards | 150 | `stats.loonieWins`, Gong wins (`tour.gongs[].won`), certs (gold/platinum trophies), Grey Mug | min(150, 8 × loonies + 20 × gongs + 4 × certs + 10 × greyMug) |
| venue | 100 | `legacyTrack.bigHead.cap` (biggest venue *headlined*) | 100 × clamp(ln(cap / 15) / ln(19,000 / 15)); 0 if none |
| regions | 100 | `tour.regions[id].broken` (abroad) | 25 per region broken |
| unity | 100 | `chemistry`; originals kept / originals at start | 100 × (0.5 × chem / 100 + 0.5 × kept / start) |
| final | 100 | `finalShowdown.headliner` | 'you' 100, 'rival' 40, none 0 |

- **Biggest venue headlined** (new tracker): `GG.legacy.gig(state, r)` keeps `state.legacyTrack.bigHead = { id, name, cap,
  week }` from GIG_RESULT (venueId, capacity) when the band headlined: not `r.opening`, not a festival non-headline slot; the
  Sad Dome final counts (cap 19,000) only when `headliner === 'you'`. Migration: estimate from `venueLast` venues (non-festival,
  max capacity) plus the Sad Dome if headlined.
- **Bot check (10 years × 4 seeds, planner run):** avg bot fans 43–55k, units 232–291k, Loonie wins ≈ 3–6, regions broken
  0.3–1.0, Sad Dome headlined 0–3 of 4 per band → ≈ 540–690 points. Good bot fans 63–77k, units 558–661k, all Sad Domes
  headlined → ≈ 900–950. A career stuck in the Garage era (≈ 1k fans, no album) ≈ 175; one album and ~10k fans ≈ 290.
- **Tier thresholds (proposal, Q3a):** Arena Legends ≥ 800, Canadian Institution ≥ 600, Cult Heroes ≥ 400, One-Album Wonders
  ≥ 200, Still in the Garage < 200. Q3b adds hard gates to Arena (Sad Dome headlined + ≥ 1 region broken), Q3c multiplies by
  `difficulty` (chill 0.85, brutal 1.15).
- **Difficulty** is stored on the entry (`difficulty`) and shown as a badge; it never changes the score unless Q3c.

### 4.2 Ending tiers and special endings (content `src/content/endings.js`; Lane E)
```
endings.tiers[]   = { id (C.ENDING_TIERS), name, min, line, lineLostFinal?, byBand?: { <bandId>: { line } } }
endings.specials[] = { id (C.SPECIAL_ENDINGS), name, band?: [bandId], test: { kind, … }, line, unlock?: { emblem|palette } }
```
| tier | min | line (tokens) |
|---|---|---|
| Arena Legends | 800 | The Sad Dome. A world tour. A statue in `{city}` (the pigeons have opinions). Variant when the rival headlined. |
| Canadian Institution | 600 | Your one song plays at every hockey game, forever. Between periods. Every period. |
| Cult Heroes | 400 | A small, terrifyingly loyal fanbase. Reunion tours for life. |
| One-Album Wonders | 200 | One album. People still ask about it at gas stations. (0 albums: a "Zero-Album Wonders" line.) |
| Still in the Garage | 0 | Your mom wants to park the car in `{space}` again. (per band via `{space}`) |

| special | band | test | |
|---|---|---|---|
| Big in Japan | any | `{kind:'bigIn', region:'japan', share:0.2}` | default above |
| Moose Opera | hail_damage | `{kind:'flag', flag:'mooseOpera', values:['platinum']}` | exists |
| Big in Berlin | frost_heave | `{kind:'flag', flag:'squatAnthemPayoff'}` | Q4a |
| Mudstonbury Legends | gravel_kings | `{kind:'flag', flag:'mudHeadlinePayoff'}` | Q4a |
| Outback Legends | grid_road_ramblers | `{kind:'flag', flag:'outbackPayoff'}` | Q4a |
| Band of Strangers | any | `{kind:'originals', kept:0}` | "you and `{n}` strangers from Kijiji" |
| The Original Five / Four | any | `{kind:'originals', neverQuit:true}` | name from lineup size |
| Side Project | any | `{kind:'rivalOriginals', min:2}` | "`{rival}` absorbed your band" |

All text tokenised (`{city} {space} {rival} {front} {n}`), no US places, parody names only, no gong (the Global Gong award may be
named). Specials stack; the end sequence shows each as its own card.

### 4.3 Epilogue cards (Lane E)
```
EPILOGUE = { kind: 'member'|'gone'|'defector'|'recruit'|'player'|'rival', id, name, text, silent?: true }
endings.epilogues[memberId] = [ { when: { flag?, values?, tier?, special?, status?, minYearsIn? }, text } ]   // first match wins
endings.recruits = { byTrait: { <traitId>: [text] }, byQuirk: { <quirkId>: [text] }, any: [text] }
endings.player = { <tierId>: text }; endings.rival = { you: text, rival: text, none: text, byRival?: { <rivalId>: {…} } }
```
- One card per member in the final lineup, then originals who left (`gone`) or joined the rival (`defector`, "now plays for
  `{rival}`"). Fallback: `drama.members[id].epilogue`. Variant picks are pure (hash of `careerId + memberId`), never the RNG.
- A14 variants for Hail Damage: Marcel cape shop (`flags.cape`), Dana "the solo finally ends", Jaxon "baba becomes your
  manager" (tier ≥ Canadian Institution), Kenji "a new bass arrives every Christmas" (tier ≥ Cult Heroes; else the shipped
  blank postcard). One state-keyed variant per other original (storyline flags: council, riff, truck).
- Kenji (`silent`): narration only, `silent: true`, never rendered as a quote; the speaker guard applies to every card.

### 4.4 Bonus years, the final year and the end sequence (Lane E)
- `GG.legacy.bonusFor(state)` → 0 | 2 | 3 from `eraHistory`'s World week and `C.BONUS` (Q1). `GG.legacy.weekly` grants it once
  (`state.bonusYears`, `state.maxWeeks = 240 + 24 × years`), adds a wrap milestone line and a group-chat line from `@front`
  (picked by hash of `careerId`, never the career RNG), and emits `legacy:bonus { years, maxWeeks }`. Under Q1b the grant
  happens at the year-10 wrap. `NO_BONUS=1` (balance/tests) disables the grant.
- `GG.legacy.finalYear(state)` → `Math.ceil(maxWeeks / 24)` (Q2a) or 10 (Q2b). `23_sim_rival.js` reads it in `isFinalWeek`,
  the `finalSoon` news and `final.reachable`; `fillerFans` fades over `maxWeeks / 24` instead of `C.CAREER_YEARS`.
- `GG.legacy.yearsText(state)` → "Ten years." / "Thirteen years." (the wrap line).
- `GG.legacy.finish(state)` → LEGACY (stored in `state.legacy`, idempotent), emits `legacy:done { legacy }` before `career:end`.
```
LEGACY = { v: 1, score, parts: { <C.LEGACY_PARTS>: points }, raw: { fans, units, loonies, gongs, certs, venue: {id,name,cap}|null,
           broken: [regionId], chem, originals: { start, kept, everQuit }, final: 'you'|'rival'|null },
           tier, specials: [id], epilogues: [EPILOGUE], years, bonusYears, difficulty, week }
```
- **End sequence** (`5n_ui_ending.js`, screen `end`, full): Legacy count-up with the seven parts (`end-legacy`) → tier card
  (`end-tier`) → one card per special (`end-special-<id>`) → epilogue cards (`end-epilogue-<id>`, swipe or Next) → the rival
  line (`end-final`, existing `ui.rivalEnd`) → summary with achievements earned this career, cosmetic unlocks and buttons
  "Hall of Fame" (`end-hof`) / "Back to title" (`btn-end-title`). It calls `GG.meta.recordCareer(state)` on build (idempotent;
  this is also how old ended saves get their entry). **No share, screenshot or download button.**

### 4.5 Meta storage and the Hall of Fame (stage 0 writes the store; Lane M owns it and the UI)
```
META (gg.v1.meta) = { v: 1,
  careers: { started, past4, finished, byBand: { <bandId>: n }, best: { score, careerId } | null },
  lessons: { <lessonId>: 1 },                         // seen at least once (the "?" list marks them)
  ach: { <achId>: { at: 'YYYY-MM-DD', band, y } },     // first time ever
  unlocks: { palettes: [id], emblems: [id], parts: [id] },
  seen: { <careerId>: 1 } }                            // recorded careers (idempotence), capped 200
HOF (gg.v1.hof) = { v: 1, entries: [ HOF_ENTRY ] }      // newest first, cap 40, the top 10 by score never dropped
HOF_ENTRY = { id: careerId, at: 'YYYY-MM-DD', ver, bandId, band, genre, city, player: { name, nick },
  logo: { emblem, style, palette }, difficulty, years, bonusYears, score, parts, tier, specials: [id],
  lineup: [ { id, name, original, status } ], rival: { id, name }, final: 'you'|'rival'|null,
  stats: { fans, units, loonies, gongs, certs, gigs, songs, albums, loans, venue: { name, cap } | null, broken },
  ach: [achId], strip: [ { y, h (headline), fans (gained), era, best (grade), aw (award count) } ] }   // ≈ 1.5–3 KB
```
- `careerId(state)` = `seed.toString(36) + '.' + bandId` (UI careers seed with `Date.now()`, so it is unique; no new field).
- `GG.legacy.hofEntry(state)` builds HOF_ENTRY from `state.legacy`, recaps (`strip`) and the logo; `recordCareer` stores it,
  bumps `careers`, derives cosmetic unlocks (§4.6) and emits `hof:added { entry }` and `meta:unlock { kind, ids, names }`.
- `exportLite()` = META + HOF entries without `strip` (≈ 0.6 KB each); `mergeLite` unions entries by id, `ach` by earliest date,
  unlocks by set, counters by max.
- **Hall of Fame UI** (`5q_ui_hof.js`): screen `hof` (full; title button `btn-hof`, ☰ `menu-hof`, end screen `end-hof`): one row
  per entry with `ui.logoImg`, band, player, tier chip, score, years, difficulty badge; tap → sheet `hof-entry` (parts,
  specials, lineup avatars, trophies, the year strip; tap a year → a small year card). Empty storage renders "No careers yet."
  Per Q6b only the row; Q6c adds a stored thumbnail (not in the code).

### 4.6 Meta unlocks and achievements (Lane M)
**Meta unlocks (Q5a; cosmetic, any genre, never gameplay):**
- First time a tier is reached → a logo palette (`content/logo.js` palettes with `meta: 'tier:<id>'`): Arena Gold, Hockey
  Night, Cult Velvet, One-Hit Teal, Garage Grey.
- First time a special is reached → an emblem (`46_render_logo.js` drawings, ≤ 1 KB each): `lantern` (Big in Japan),
  `price_tag` (Band of Strangers), `handshake` (Original Five/Four), `globe_record` (any World-payoff special), plus palette
  Rival Red (Side Project). Never a gong.
- Creator parts unlocked in any finished career join `meta.unlocks.parts` and are offered in every genre (the per-genre
  carry toggle keeps working). The creator and logo picker mark meta items with a 🏆 chip.
- Q5b: none of the above. Q5c: each achievement may also carry `unlock: { palette|emblem|part }`.

**Achievements content** (`src/content/achievements.js`):
```
ACH = { id, name, blurb, icon (emoji), band?: [bandId], when: 'gig'|'week'|'year'|'end'|'meta', test: { kind (C.ACH_KINDS), … },
        nameBySize?: { 4: '…', 5: '…' }, hidden?: false, unlock?: {…} (Q5c only) }
C.ACH_KINDS = ['milestone','stat','flag','trophy','award','rivalLoonieStreak','venuePlayed','bannedInYear','songKickShare',
  'releaseAfterFlag','releasedFr','winterNoBreakdown','originals','final','special','tier','bonus','licensedBrand','crack',
  'returned','studio','reviewBelow','km','gongWon','weatherGig','botbInYear','difficulty','careers','allBands']
```
Seeds (15): Twelve People and a Dog (`milestone firstGig`), The Wall (`bannedInYear ≥ 3`), Ma Pelouse (HD, `releasedFr`), The
Original Five/Four (`originals neverQuit`, end), Kijiji All-Stars (`originals kept 0`, end), Sold Out (`milestone soldOut`),
Worst Van (`award worst_van won`), Block Heater (`winterNoBreakdown`: protection over, ≥ 3 away gigs that winter, 0
breakdowns), Buddy (HD, `rivalLoonieStreak 3`), Big in Japan (`special big_in_japan`), Frostbite (`venuePlayed
siberian_frostfest`), Chugging Along (`songKickShare` metal > 0.5), Grey Mug (`flag greyMug`), Night School (`stat
parentsLoans ≥ 3`), Sad Dome (`final headliner you`).
Band twins (6, Q4a): storyline trophies instead of Ma Pelouse — Read the Minutes (FH, `releaseAfterFlag council won`), Legally
Distinct (GK, `releaseAfterFlag riff original`), Truck Song (GRR, `releaseAfterFlag truck`); rival streaks instead of Buddy —
Sponsored Content (FH, Mall Rats), Power Ballad Blues (GK, Chartbusters), Tailgated (GRR, Buckle & Boot).
Extras (12, owner pre-approved): Overtime (`bonus`), Statue Season (`tier arena_legends`), Mom Needs the Garage (`tier
still_in_the_garage`), Hat Trick (`botbInYear ≥ 3`), Between Periods (`licensedBrand` hockey package), Who's Opening Now
(`crack opener`), Prodigal Bandmate (`returned`), Pitchspork Proof (`reviewBelow pitchspork 3.0`), Mom's Basement Tapes
(`studio` release from Mom's Basement), Gas Station Sushi (`km ≥ 25,000`), Minus Forty and Fine (`weatherGig` ≤ −30 °C or a
blizzard), Prairie Grand Slam (`allBands`, meta: finished a career with all four bands). Reserve if a hook is missing: Brutal
Honesty (`difficulty brutal`, end), Lifer (`careers ≥ 3`, meta), Global Gonger (`gongWon`).

**Achievements sim** (`2g_sim_achieve.js`, DOM-free, never the career RNG): `GG.achieve = { ensure, migrate, gig(state, r),
weekly(state, wrap), finish(state), check(state, when) → [newIds], list(state), view(state, id), def(id), KINDS }`. Per-career
state `state.ach = { got: { <id>: totalWeek }, t: { counters } }` (counters: bans per year, BotB wins per year, km, winter
tracker, rival Loonie streak). Emits `ach:earned { ids }`. `'meta'` kinds are skipped in the sim; `GG.meta.recordCareer`
evaluates them.
**Meta + UI** (`12_meta.js` listener, browser only): `ach:earned` → `GG.meta.award(state, ids)` → `meta:ach { ids, fresh }`.
`5o_ui_trophies.js`: `ui.trophiesPanel(st)` (earned first with date and band; unearned greyed with their blurb), the toast
queue (`ui.achToast(ids)`: held while `gig`/`rival-set` is open or a song is live; flushed on the results screen or the next
`screen:close` of the gig; max 3 per flush, then "+n more").

### 4.7 Tutorial (Lane T; UI + content, no sim state beyond `state.tutorial`)
```
LESSON = { id (C.LESSONS), title, band?: [id], when: { maxWeek?, week?, screen?, first?: true }, steps: [STEP],
           byBand?: { <bandId>: { steps } } }
STEP = { who: '@front'|'@deadpan'|'@grumbler'|'@driver'|'@any'|memberId, text (tokens),
         point?: { hotspot: action } | { testid } | { member: alias } , advance: 'next' | { event, id? } | { hotspot } }
C.LESSONS = ['w1_card','w1_walk','w1_plan','w1_write','w1_rehearse','w1_gig','w1_wrap','w2_board','w2_money','w3_chat',
             'w4_van','y1_good_year']
```
- Week one (A15): `w1_card` (the forced Monday card), `w1_walk` (tap-walk; a bandmate points at Plan week, Drum kit, Gig
  board via `hotspotScreenPos`), `w1_plan` (Write Tue, Rehearse Thu, gig on the weekend), `w1_write` (the starter pattern),
  `w1_rehearse`, `w1_gig` (on the setlist sheet before the count-in; never during a song), `w1_wrap` (fund, fans, buzz,
  chemistry, burnout, moods: each explained once, one bubble per row).
- Weeks 2–4 (Q7a): `w2_board` (first `screen:open board`), `w2_money` (first Money tab / merch), `w3_chat` (first group chat /
  mood drop), `w4_van` (first van ride). Q7b keeps only week one. `y1_good_year` replays the shipped `recap.goodYear` lines.
- Voice: every line in character through role aliases + `byBand` texts (Hail Damage keeps "Lord Abyssus"); `speakerOk` and
  `ui.presentLines` drop bandmates not in the lineup; Kenji never speaks (`@deadpan` resolves to a nod/narration for him).
- `state.tutorial = { on, done: { <lessonId>: totalWeek } }`. Skip rule (Q7a): `GG.tutorial.offerSkip()` is true when
  `meta.careers.past4 > 0` (Q7c: always); the creator's `tut-skip` defaults on. `GG.meta.noteWeek(state)` bumps `past4` the
  first time a career reaches week 5.
- "?" (`btn-help`, ☰ `menu-lessons`): sheet `lessons` lists every lesson for this band, seen ones ticked; tapping replays it
  (closes sheets first if it points at the garage; text-only bubbles when its screen isn't open). Replays never change
  `state.tutorial.done`.
- Non-blocking: bubbles with Next and "Skip lessons"; taps on the game still work; automation off unless `?tut=1`.
- `GG.tutorial = { start(id), replay(id), offerSkip(), openLessons(), lessons(state), active(), debug }`; events
  `tut:step { id, step }`, `tut:done { id }`; debug `GG.debug('tutorial')` → `{ on, active, step, done }`.

### 4.8 New events (documented in `02_contracts.js` EVENTS)
`legacy:bonus { years, maxWeeks }` · `legacy:done { legacy }` · `ach:earned { ids }` · `meta:ach { ids, fresh }` ·
`meta:unlock { kind, ids, names }` · `hof:added { entry }` · `meta:changed { keys }` · `tut:step { id, step }` ·
`tut:done { id }` · `perf:quality { pixelRatio, reason }`.
Node bots emit the sim events too; only browser listeners write meta (`GG.meta.enabled`).

### 4.9 Performance targets (Lane P; measured with `tools/perf.js`, ported from the PERF audit's scratch probes)
| scene / metric | now (main 0.9.0.0) | v1.0 target |
|---|---|---|
| title | 33 calls / 37.3k tris | ≤ 33 / ≤ 38k; idle ≤ 30 fps |
| garage tier 0 (4 bands) | 39–43 / 9.0–14.6k | calls unchanged (< 60, ≤ HD × 1.15); idle ≤ 30 fps |
| stage club / Sad Dome | 35 / 46k | ≤ 38 calls / ≤ 28k tris |
| stage festival (Mudstonbury) | 35 / 65.7k | ≤ 38 / ≤ 35k |
| stage Budokhan | 33 / 54k | ≤ 30k |
| van / carpet | 28–31 / 16–18k; 15–19 / 10.5k | unchanged; idle ≤ 30 fps |
| tall sheet over the garage | 31 fps at 43 calls | ≤ 10 rendered fps (or paused) after the camera glide |
| gig peak, festival, Expert, 170+ BPM, CPU ×4 | JS/frame p50 8.3, p95 18.2, max 44 ms | p50 ≤ 6, p95 ≤ 14 ms |
| default pixel ratio on a DPR-3 phone | 2.0 ('high') | Q8a: 'auto' 1.5 → 1.25 → 1.0 on p95 > 20 ms for 2 s, back up at < 12 ms for 4 s |
| first Hail Damage quickStart (×1 headless) | 1.5–1.8 s (1.1 s logo readback) | ≤ 0.6 s |
| first stage / van build (×4) | 935 / 643 ms | −40 % (no shader error checks outside tests) |
| tier-0 space atlas | 2048×1024 built at tier 0 | built at tier ≥ 1 only (1024×512 on 'low') |
| audio at the gig peak | 30 sources, 0 drops, 150–170 nodes/s | global cap 32 (priority: taps > kick/snare > band > crowd > ambience > sfx), 0 tap drops, ≤ 80 nodes/s (pre-rendered drum hits) |
| first gig's crowd at ×4 | silent if it starts < 4 s after unlock | crowd warm-up starts on the first garage entry; one-shots in the first song |
| time to interactive | 0.57 s ×1 / 1.75 s ×4 | no regression |
- LOD = the crowd split by depth: front 40–60 people unchanged; back rows one merged 12–24-triangle instance (no arms or
  hair, matrices at 30 Hz or on beats); festival background one box per person, raised hands only in the nearest third.
- Drum timing is untouchable: `sync.test.js`, `pw_gig` sync/sync2/double stay green; pre-rendered hits must land on the same
  booked times (±1 ms).

### 4.10 Size budget
- Measure: bytes on disk of `dist/game.html`; hard cap 4,500,000 B. After stage 0's comment strip ≈ 3.99 MB.
- v1.0 additions (stripped): Lane E ≤ 45 KB, Lane M ≤ 50 KB, Lane T ≤ 40 KB, Lane P ≤ 12 KB, CSS ≤ 10 KB in total → ≤ 4.15 MB.
  Each lane reports `node build.js` bytes before and after.

---

## 5. Lanes

Four lanes run in parallel in separate worktrees with disjoint file ownership; Lane Q runs last on the integrated branch (the
lead or one agent). If the agent budget is tight, Lane M splits into M1 (achievements) and M2 (Hall of Fame + unlocks) or runs as
one agent. **Lead-only files:** `src/01_ns.js`, `src/02_contracts.js`, `src/10_save.js`, `src/20_sim_career.js` (hook lines are
stage 0), `build.js`, `VERSION`, `tests/_load.js`, `tests/run.js`, `tests/_t.js`, `tests/_pw.js`, `tests/save.test.js`, `plan/*`,
`dist/*`, `index.html`. **Shared by anchor:** `src/00_shell.html` (each lane only inside its own `/* v1.0 <LANE> */` block).
Every lane: content text tokenised, no US places, parody names only, no gong on the kit, no share/screenshot/download control;
new UI controls ≥ 48 px; a "no console errors" assertion in every pw section; every new pw section passes at 390×844 and at
`PW_VIEW=440x956`. A lane needing a new state field chains a filler onto `GG.save.migrate` in its own module.

### Lane E: ENDINGS (sim + content + end sequence)
**Owns:** new `src/2f_sim_legacy.js`, `src/content/endings.js`, `src/5n_ui_ending.js` (the moved `end` stub);
`src/23_sim_rival.js`, `src/content/economy.js`, `tools/balance.js`; tests `tests/sim_legacy.test.js`,
`tests/content_endings.test.js`, `tests/pw_ending.js` (+ fixtures `tests/fixtures/end_<band>.json`), `tests/sim_rival.test.js`,
`tests/sim_career.test.js`, `tests/pw_rival.js`.
**Tasks:**
1. `GG.legacy` per §4.1–4.4: `ensure, migrate, gig, weekly, bonusFor, finalYear, score, tier, specials, epilogues, finish,
   yearsText, hofEntry, text`, debug `legacy`. Biggest-headline tracker + its migration estimate.
2. Bonus years: the grant, the wrap milestone + `@front` chat line per band, `legacy:bonus`. Rival: `isFinalWeek`, `finalSoon`,
   `reachable` via `finalYear` (Q2); `fillerFans` fade over `maxWeeks`. Check every other 10-year assumption still holds to week
   312 (deck, labels, tours, recaps, Loonies, Gong, the rival's songs/albums) and fix inside owned files or report.
3. `content/endings.js`: tiers (×4 band texts where `{space}`/`{city}` isn't enough), specials (Q4), epilogue variants for all 14
   originals (≥ 1 each beyond the default), recruit pool (≥ 2 per trait, 1 per quirk, 4 generic), player per tier, rival lines,
   bonus-year lines per band, `legacy` tunables.
4. End sequence (§4.4) in `5n_ui_ending.js` + CSS in `/* v1.0 ENDINGS */`; old ended saves backfill via `recordCareer`.
5. `tools/balance.js`: per band and style, the World week, bonus-year rate (0/2/3), Legacy mean and range, tier mix, specials
   count; careers run to their own `maxWeeks` (pass `years = 13`); `NO_BONUS=1` for the no-regression run.
**Acceptance (E):**
- `sim_legacy`: each part on synthetic states; tier boundaries; every special true/false; epilogues for all 4 bands (lineup,
  quit, defector, recruit, Kenji `silent` and quote-free); bonus rule (World wk 110 → +3, maxWeeks 312; wk 130 → +2; wk 150 → 0;
  once only; migration); headline tracker (opening slot and festival non-headline excluded; Sad Dome only when headlined);
  `finish` idempotent; the career RNG state is unchanged by every `GG.legacy` call; per-band leak scan on ending/epilogue text.
- `sim_career`: a seeded 312-week bot career per band finishes with no exceptions and invariants hold; a 240-week draw per band
  never runs dry extended to 312 weeks.
- `sim_rival` / `pw_rival`: the Sad Dome in the final year (Q2a) and still year 10 week 21 with no bonus.
- `content_endings`: every tier/special/epilogue id valid, tokens valid, gates valid, no US places, no other band's names.
- **Balance** (`BAND=all node tools/balance.js 13 30`, saved to `plan/balance_v10_all.txt`): good bot ≥ 80 % Arena Legends and
  ≥ 80 % +3 bonus years; avg bot ≤ 20 % Arena, ≥ 60 % Canadian Institution or Cult Heroes, bonus years in 5–40 % of careers;
  each band's avg median tier within one tier of Hail Damage's; with `NO_BONUS=1`, `BAND=all node tools/balance.js 10 30` is
  byte-identical to `plan/balance_baseline_v10.txt` (the legacy and achievement hooks draw no RNG).
- `pw_ending` (fixture at week 239 per band → play the last week on autoplay): every step renders, testids present, the seven
  parts sum to the score, epilogue count = lineup + departed originals, no share/screenshot/download text, Back to title works,
  reload of the ended slot shows the same ending and does not duplicate the Hall of Fame entry; at 390×844 and 440×956.
**Risks (E):** bonus years exposing hidden 10-year assumptions; content leaks across bands; tier tuning noise at 30 seeds.

### Lane M: META (achievements + Hall of Fame + meta unlocks)
**Owns:** `src/12_meta.js` (after stage 0; frozen API), new `src/2g_sim_achieve.js`, `src/content/achievements.js`,
`src/5o_ui_trophies.js`, `src/5q_ui_hof.js`; `src/51_ui_menu.js`, `src/53_ui_laptop.js`, `src/59c_ui_awards.js`,
`src/5j_ui_creator.js`, `src/5m_ui_logo.js`, `src/5l_ui_recap.js`, `src/2b_sim_creator.js`, `src/2e_sim_logo.js`,
`src/46_render_logo.js`, `src/content/logo.js`, `src/content/creator.js`; tests `tests/sim_achieve.test.js`,
`tests/sim_meta.test.js`, `tests/pw_trophies.js`, `tests/pw_hof.js`, `tests/sim_creator.test.js`, `tests/sim_logo.test.js`,
`tests/pw_creator.js`, `tests/pw_logo.js`, `tests/pw_recap.js`, `tests/pw_title.js`.
**Tasks:**
1. Achievements: content (§4.6, ~33), the sim, the meta listener, `ui.trophiesPanel`, the toast queue, CSS in `/* v1.0 TROPHIES */`.
   Optional: the garage Trophy shelf links to the tab.
2. Hall of Fame: `recordCareer` (dedupe, cap 40 with the top 10 kept), `hof` + `hof-entry` screens, the year strip, CSS in
   `/* v1.0 HOF */`; title/☰/end entry points use the stage-0 sockets.
3. Meta unlocks (Q5): palettes + 4 emblems (no gong), cross-genre parts via meta (alongside `C.carry`), 🏆 chips in the creator
   and logo picker, `meta:unlock` toast on the end screen.
4. Perf hand-in (owned file): `46_render_logo.js` `spikes()` opens its mask canvas with `{ willReadFrequently: true }` (or
   derives the edges from `measureText`): the 1.1 s first-start stall (§4.9).
5. Meta-only achievements (`careers`, `allBands`) evaluated in `recordCareer`.
**Acceptance (M):**
- `sim_achieve`: every seed/twin/extra true and false on synthetic states; per-career dedupe across save/reload; each `test.kind`
  in `C.ACH_KINDS`; bots over 6 years per band earn a plausible set (≥ 5, never one gated to another band); the career RNG is
  untouched; content: ids unique, no US places, per-band text has no other band's names.
- `sim_meta`: empty and blocked storage work (memory fallback); `recordCareer` idempotent; cap/top-10 rule; `exportLite` →
  `toCode` → `fromCode` → `mergeLite` round trip (with `save.test.js` from stage 0); unlock derivation per tier/special.
- `pw_trophies`: the 10th tab wraps 5 + 5 with no horizontal scroll; an achievement earned during a live gig toasts only after
  the song; earned/unearned rendering; at 390×844 and 440×956.
- `pw_hof`: with seeded meta: title button, list, entry sheet, year strip, logo drawn, no share/screenshot/download text; with
  empty storage: no button, no errors; at both sizes.
- `pw_creator` / `pw_logo`: meta palettes/emblems/parts offered with the 🏆 chip in every genre; HD first quickStart ≤ 0.6 s
  headless (the logo stall).
**Risks (M):** localStorage headroom on the shared Pages origin; double-writes from the end screen and `career:end`; save-code size.

### Lane T: TUTORIAL (UI + content)
**Owns:** new `src/content/tutorial.js`, `src/5p_ui_tutorial.js`; `src/60_main.js`, `src/52_ui_week.js`, `src/50_ui_core.js`;
tests `tests/content_tutorial.test.js`, `tests/pw_tutorial.js`, `tests/pw_flow.js`.
**Tasks:**
1. Lessons per §4.7 for all four bands (neutral steps + `byBand` lines; Hail Damage keeps Lord Abyssus), triggers, pointer
   bubbles (`hotspotScreenPos`, testids), the `lessons` sheet, `offerSkip`, `state.tutorial` + its migration, `GG.meta.noteWeek`.
2. `60_main.js`: replace the week-1 toast with `w1_card`/`w1_walk` (keep the toast when the tutorial is off); `?tut=1`; pass
   `skipLessons` into `state.tutorial`.
3. `52_ui_week.js`: testids on wrap stat rows for `w1_wrap`; HUD help text "ten years to glory (more if you're quick)"; the "?"
   socket styling; the HUD stat labels (9 px) scale with Bigger text (`.hud .l`, PERF audit).
4. CSS in `/* v1.0 TUTORIAL */`. Bubbles never cover the highway and never appear during a song.
**Acceptance (T):**
- `content_tutorial`: every `C.LESSONS` id present; for each band, every step's `who` resolves through `speakerOk`/`roleOf` to a
  talker in that lineup; Kenji never speaks; tokens valid; no US places; no other band's names.
- `pw_tutorial` (`?tut=1`): `tut_w1` per band (bubbles in order through week one, each stat explained once at the wrap, taps
  still reach the game, nothing during the song); `tut_w24` (each weeks 2–4 trigger fires once); `tut_skip` (meta with
  `past4 = 1` → `tut-skip` default on → no lessons; "?" replays one); `tut_replay` (every lesson replays from the sheet without
  errors); at 390×844 and 440×956.
- `pw_flow` and every existing section unchanged under automation (tutorial off).
**Risks (T):** bubbles colliding with sheets at 390 px; lessons drifting from the real UI (point at testids, not pixels); the
planner-sheet room squeeze (back-burner) under arrows.

### Lane P: PERF (render + audio + graphics setting)
**Owns:** `src/40_render_core.js`, `41_render_garage.js`, `42_render_stage.js`, `43_render_van.js`, `44_render_carpet.js`,
`45_render_title.js`, `45_render_creator.js`, `src/30_audio.js`, `src/11_settings.js`, `src/5h_ui_settings.js`; new
`tools/perf.js`; tests `tests/pw_perf.js`, `tests/pw_garage.js`, `tests/pw_stage.js`, `tests/pw_bands_render.js`,
`tests/sim_audio.test.js`, `tests/pw_seq.js`, `tests/pw_settings.js`, `tests/pw_gig.js` (read-mostly: sync sections must not
change).
**Tasks:**
1. Frame governor in `40`: idle rooms ≤ 30 fps (60 while walking, a camera glide, the gig); tall sheets ≤ 10 fps or paused after
   the glide (render listens to `screen:open/close` and reads `GG.ui` sheet `tall` flags; no 60_main edit needed — if one is,
   hand it to T).
2. Adaptive pixel ratio: `graphics: 'auto'` (Q8a default; Q8b keeps 'high'), steps per §4.9, `perf:quality` event, the
   Settings option.
3. Crowd LOD + cheaper festival crowd (§4.9); optional Sad Dome dressing using the cheap back rows.
4. First-visit stalls: `renderer.debug.checkShaderErrors = false` unless `navigator.webdriver` or `?debug=1`; lazy space atlas;
   optional `renderer.compile` warm-ups.
5. Audio: global voice cap 32 with priorities; pre-rendered drum hits per lane/variant/kit tier (OfflineAudioContext); crowd
   warm-up on the first garage entry.
6. `static` props `matrixAutoUpdate = false` where safe. CSS (if any) in `/* v1.0 PERF */`.
7. `tools/perf.js` (scenes, gig, tti, audio) → `plan/perf_v10.txt` with the before/after table.
**Acceptance (P):** every §4.9 target met (or reported with the measured number and a reason); `pw_perf` sections `scenes`,
`gig`, `governor`, `stalls`, `audio` at both sizes; existing caps green (`pw_garage` < 60, `pw_stage` < 80, van < 50, carpet < 60,
rival spectator < 90, every band's garage ≤ HD × 1.15); `sync.test.js` and `pw_gig` sync/sync2/double green with drum hits on
the same booked times; `sim_audio`: global cap, priorities, pre-rendered hit = live hit spectrum within tolerance.
**Risks (P):** drum-sync regression (do not touch the booking path); softer image on 'auto'; headless frame rate is SwiftShader
(use JS/frame and render() time as the phone proxy).

### Lane Q: QA sweep (last, on the integrated branch)
**Owns:** `tests/sim_bands.test.js`, `tests/pw_bands.js`, new `tools/phoneqa.js` (port of the PERF audit's phone-QA probe),
the `/* v1.0 QA */` CSS block for small fixes.
**Tasks / acceptance:**
- Full Playwright matrix (every `META_ONLY` section of every `tests/pw_*.js`, new ones included) green at 390×844 and at
  `PW_VIEW=440x956`; contact sheets `tests/.cache/v10_sheet_390.png` and `_440.png` of the new screens (end steps, Hall of Fame,
  Trophies, lessons, a tutorial bubble per band); look at each once.
- `tools/phoneqa.js` on every screen incl. the new ones: no button < 44 px (new ones ≥ 48 px), no horizontal overflow, nothing
  fixed under the notch or home bar (forced insets), Bigger text works on the HUD.
- Leak sweep: `sim_bands` strict over endings, epilogues, lessons and achievement texts per band (`LEAK_YEARS=13`); `pw_bands`
  DOM scan on the end/Hall of Fame/Trophies/lessons screens; inverse check in a Hail Damage career.
- Owner rules sweep: grep `dist/game.html` strings for US places, `share`/`screenshot`/`download` controls, any gong outside the
  Global Gong award.
- Storage at 13 years: save-code length (target ≤ 140k chars incl. `_meta`), slot JSON, total localStorage for 4 slots + Hall of
  Fame + meta (report; the lead applies the slot-compression nice-to-have if > 1.5M chars).

### Cross-lane hand-over requests (files stay single-owner)
| from → to | request |
|---|---|
| E → M | `GG.legacy.hofEntry(state)` and `state.legacy` exactly as §4.4–4.5; M codes against a stub until E merges. |
| M → E | The end screen's summary calls `GG.achieve.list(state)` (earned this career) and listens to `meta:unlock` for the unlock line. |
| T → E/M | Lessons may point at `end`/`hof`/`trophies` testids only through `{ testid }` steps (no code in their files). |
| P → T | If the governor needs `60_main.js` (`covered()` with tall sheets), T applies the exact lines P supplies. |
| M (46) → P | The logo stall fix lands in M's lane (M owns `46_render_logo.js`); P measures it in `tools/perf.js`. |
| any → lead | New constants, events, state fields or EFFECT/GATE keys for `02_contracts.js`; anything in lead-only files. |

---

## 6. Merge order and release checklist

**Merge order** (each lane rebases on the integrated branch before it merges):
1. **P** (isolated render/audio/settings).
2. **E** (bonus years and the final year change the sim; balance re-run).
3. **M** (reads `GG.legacy`; achievements read `state.legacy` at the end).
4. **T** (lessons point at everything above).
5. **Q** sweep, then fixes inline by the lead.

**Checklist:**
1. After each merge: `node tests/run.js` (SUITE ALL PASS), fix conflicts in place (only lead-only files and the `00_shell.html`
   anchor blocks may overlap).
2. `02_contracts.js`: fold in reported constants/events/fields; the EFFECT_KEYS fold (nice).
3. `10_save.js`: confirm the migrate chain fills `bonusYears`, `legacyTrack`, `legacy`, `ach`, `tutorial` on a v0.9 save
   (`tests/fixtures/save_v01.json` + a fresh v0.9 fixture); `_meta` code round trip; old ended save → one Hall of Fame entry.
4. Balance: `BAND=all node tools/balance.js 13 30` → `plan/balance_v10_all.txt`; check Lane E's targets; `NO_BONUS=1` 10-year
   run byte-identical to the stage-0 baseline; tune `content/endings.js` thresholds inline if needed.
5. Perf: `node tools/perf.js` → `plan/perf_v10.txt`; check §4.9.
6. Playwright: the full matrix at 390×844 and 440×956 (Lane Q), contact sheets viewed once.
7. Budgets: `stat -c %s dist/game.html` ≤ 4,500,000 (expect ≈ 4.1 MB); gzip reported; garage draw calls ≤ HD × 1.15; the
   global voice cap holds.
8. Owner rules: no USA content, no gong on the kit, no share/screenshot button, parody names, prairie tone (Lane Q sweep).
9. `plan/status.md`: "What's in v1.0" (Legacy, tiers, specials, epilogues, bonus years, Hall of Fame, meta, achievements,
   tutorial, perf numbers); APIs (`GG.legacy`, `GG.achieve`, `GG.meta`, `GG.tutorial`, `perf:quality`, `PW_VIEW`, `NOSTRIP`);
   owner answers under decisions; tick **D4** in Addendum 2; back-burner: drop "full guided tutorial is v1.0", "epilogue lines
   are content-only hooks", the stale save-code size lines (now measured ≈ 100k chars at 10 years), add leftovers; Version
   Current = 1.0.0.0 "Glory", Next = 1.1 "Tuning" (D5, starts with the "two biggest annoyances" popup).
10. `node build.js`, commit, PR, merge into `main`, delete the lane branches and worktrees. One short plain-words summary to the
    owner (no step recap).
