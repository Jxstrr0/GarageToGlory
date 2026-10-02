# v1.0 "Glory": plan contract (revised after two critiques; owner answers in §0 LOCKED; seat-aware per handoff E12)

Repo: `/home/user/GarageToGlory`, branch `v1.0-glory` (= `main` 0.9.0.0 + plan commits). Stage 0 bumps VERSION to `1.0.0.0`.
All paths are repo-relative.

Sources: `plan/status.md` (Version, owner decisions, Addendum 1/2/3 checklists, "What's in v0.9" incl. the v1.0 forward-compat
note / contract gap #11, back-burner, APIs), `plan/handoff.md` (A2, A9–A15, B1–B5 with the B4 v1.0 line, C4, D2–D6, **E12**),
the v0.9 contract (format), the v1.1 draft (`plan/plan_contract_1.1.md`, for seat tokens and gates), three read-only audits
(SPEC, CODE, PERF; PERF probes in this session's scratchpad `v10perf/`, copied into the repo at stage 0), the 30-seed v0.9
balance (`plan/balance_v09_all_30seeds.txt`) and two critiques (completeness, feasibility; see §7 Critique log).

**Process rule (owner, every lane and the lead):** never `pkill`/`killall` Chromium, `headless_shell` or `node` by name. Track
the PIDs you launch and kill only those; close every browser you open in a `finally {}`. Commit WIP to `wip-v10-<lane>` before
any long wait. Balance runs over 10 minutes go through `run_in_background` and write to a file.

---

## 0. Owner answers (popup 2026-10-01: the recommended option on all eight; LOCKED, do not re-pitch)

| # | key | Answer (locked) |
|---|---|---|
| Q1 | `bonus_rule` | **Early World stage.** World era reached by the end of year 5 (totalWeek ≤ 120) → +3 years; by the end of year 6 (≤ 144) → +2. Granted on the spot with a bandmate's message, so tours and albums can be planned past year 10. |
| Q2 | `sad_dome` | **In the last year.** Week 21 of the career's final year. No bonus years → year 10 week 21, exactly as now. This **replaces** the 2026-09-29 "Sad Dome co-bill in year 10" decision for careers with bonus years (record it in status). |
| Q3 | `ending_tiers` | **Score only, fair middle.** The Legacy score alone picks the tier; a strong career lands Arena Legends, an average one Canadian Institution or Cult Heroes; losing the Sad Dome changes the text, not the tier; difficulty is a badge, never a multiplier. |
| Q4 | `band_twins` | **Their own twins.** Each band gets a special ending from its World payoff and its own storyline trophy and rival-streak trophy. |
| Q5 | `meta_unlocks` | **Looks from finished careers.** Ending tiers and specials unlock logo palettes and emblems; creator parts unlocked in any finished career work in every genre. Trophies stay bragging only. Nothing changes gameplay. |
| Q6 | `hall_of_fame` | **Logo, lineup, ending, years.** Logo, your name, lineup avatars, tier + specials, Legacy score, difficulty badge, trophies, a strip of yearly headlines (tap a year for numbers). Opens from the title. The save code carries it, so a phone backup keeps it. |
| Q7 | `tutorial` | **Full week 1, light weeks 2–4.** Week-one walkthrough by bandmates; one short lesson on first open of the gig board, money/merch, the group chat, the van. Once any career has passed week 4, new careers offer "Skip the lessons" (on by default). "?" replays any lesson. |
| Q8 | `perf_look` | **Auto sharpness.** New default graphics "Auto": 1.5× instead of 2× on a DPR-3 phone, steps down only when frames run slow; quiet rooms 30 fps; 3D pauses behind tall menus. "High" stays one tap away. |

**Correction to the Q1 popup's bot line (the answer stands):** the popup quoted a 4-seed run. The committed 30-seed v0.9 data
(6 years) gives World by the end of year 6 for the **average bot** in Hail Damage 10/30 (wk 115–143), Frost Heave 5/30,
Gravel Kings 18/30 (wk 109–144), Ramblers 6/30, almost all after week 120 (so +2, rarely +3); the **good bot** reaches World at
wk 83–130 (HD), 91–120 (FH), 83–106 (GK), 87–116 (GRR), so +3 nearly always (some HD careers +2). Gravel Kings' higher
average rate is accepted as is (economy retuning is v1.2 Tuning). Lane E re-measures and reports per band (§5 E).

### Defaults (taken without a popup; they stand unless the owner objects)
- **Big in Japan** = Japan broken and (a song blew up there, or Japan holds ≥ 20 % of all fans) — formula in §4.2.
- **Side Project** = at least 2 originals play for the rival at the end (defected or poached).
- **The Original Five / Four** (name and text read the lineup size; contract gap #11) = no original ever quit (a quit-and-
  return counts as lost). **Band of Strangers** and the trophy **Kijiji All-Stars** share one condition: no originals in the
  final lineup; the text reads the count ("you and three strangers from Kijiji" only when there are three).
- **Epilogues:** the shipped epilogue stays each original's default; the A14 lines are state-keyed variants with explicit
  `when` (§4.3). Recruits get a generic pool by trait/quirk. Kenji's epilogue is narration only. The player's own epilogue
  card is keyed by seat (drums only in v1.0; E12).
- **"Still in the Garage"** keeps its name for every band; text names the band's own space (`{space}`); the Arena Legends
  statue stands in `{city}`.
- **Hall of Fame** keeps the last 40 careers (the top 10 by score never dropped); a replayed ending of the same career keeps
  the higher score. No photos.
- **Backup:** career save codes carry the Hall of Fame lite (top 10 ∪ newest 10, no year strips); the Hall of Fame screen has
  its own "Backup code" (full entries with strips + trophies + unlocks), restorable from the title's "Load a code". It is a
  copy-a-code panel like today's ☰ export, not a share/screenshot/download control.
- **Laptop tab "Trophies"** = achievements across careers (10th tab, wraps 5 + 5). The garage keeps its "Trophy shelf".
- **~33 achievements:** 15 seeds, 6 band twins, 12 cheap extras ("add freely"). Toasts only for a first-ever unlock, and only
  after the song ends.
- **New looks (closes D6, add-don't-shrink):** palettes Arena Gold, Hockey Night, Cult Velvet, One-Hit Teal, Garage Grey,
  Rival Red; emblems `lantern`, `price_tag`, `handshake`, `globe_record`. No gong.
- **Tutorial** is off under automation (`navigator.webdriver`) unless `?tut=1`, and starts only after the first-launch
  calibration closes.
- **Existing players:** the first v1.0 boot scans the save slots once: any slot past week 4 counts as "passed week 4" (so the
  owner is offered "Skip the lessons"), and every ended slot enters the Hall of Fame. Old in-progress careers never start the
  lessons. A save that already reached the World era early gets its bonus years at its next wrap only if the Sad Dome has not
  been announced yet (before year 10).
- **Graphics:** the new default is "Auto". Only settings the player changed are stored, so the owner's phone switches to Auto
  unless he picked a graphics option by hand. Sharpness never changes while a song is playing.
- **Phone QA split:** v1.0 automates QA of every screen at 390×844 and 440×956; the owner's hands-on checks (Bluetooth
  calibration, battery on a full gig, two thumbs by hand) stay in v1.2 Tuning (D5).
- **Size:** the build strips full-line code comments from `dist/` (−428 KB); v1.0's own additions target +150 KB (hard gate
  in §4.10).

---

## 1. Scope

### 1.1 Must (v1.0.0 "Glory", handoff B4 + D4 + E12)
1. **Legacy score** (seat-neutral) at career end from fans, albums sold, awards, biggest venue headlined, regions broken,
   band unity and the final-showdown result (A14). One new tracker: biggest venue *headlined* (§4.1).
2. **Ending tiers** (5) and **special endings** stacked on them (A14 list + band twins), as content.
3. **Epilogue cards** for every member in the final lineup, originals who left, defectors, recruits, and the **player card
   keyed by seat**; Kenji narration-only; `seatRole` hook for v1.1's swapped-drummer variants.
4. **Bonus years** (Q1), nothing in the sim assuming 10 years (rival fade, the Sad Dome per Q2 incl. the tour guard and bot
   home weeks, wrap text, deck, labels, tours, recaps to week 312).
5. **End sequence** replacing the stub `end` screen: Legacy count-up → tier → specials → epilogues → rival line → summary.
6. **Hall of Fame** (Q6) in `gg.v1.hof`, opened from the title; written once per career (idempotent, also on `career:end`);
   carried by save codes (lite) and its own backup code (full); entries store `seat`.
7. **Meta storage** `gg.v1.meta` (career counters incl. per band and per seat, lessons seen, achievements, cosmetic unlocks),
   memory fallback, a one-time scan of existing slots, quota handling.
8. **Meta unlocks** per Q5 (cosmetic only; no gong anywhere on the kit or in emblems).
9. **Achievements (D4):** ~33 as content (`src/content/achievements.js`), DOM-free per-career evaluation, cross-career store,
   laptop "Trophies" tab, toast on a first-ever unlock after the song; drum-specific ones gated `seat: ['drums']`.
10. **Tutorial** (A15) for all four bands, in character, week one + weeks 2–4, "?" replay, skip on later careers; text through
    `{instrument}` / `{drummer}` tokens, drum-mechanics steps gated `seat: ['drums']`.
11. **Performance pass:** crowd LOD, global voice cap, frame governor, adaptive pixel ratio ("Auto"), first-visit stalls
    removed. Targets in §4.9.
12. **Phone QA** (automated) at 390×844 and 440×956 for every screen, including all new ones.
13. **Housekeeping:** VERSION 1.0.0.0; tick D4 (Addendum 2) and the v1.0 item of Addendum 3; close D6; status Version/Current/
    Next (Next = 1.1 "Seats"); dist ≤ the §4.10 gate.

### 1.2 Nice-to-have (never blocks the merge)
- Rival epilogue card; storyline-result variants beyond one per original (council, riff, truck; `mooseMuse`, `babaMad`).
- A "bonus years" badge on the HUD year chip ("Y11 / 13").
- Sad Dome dressing (banner + the cheap LOD back rows give it a bigger crowd for free).
- The garage "Trophy shelf" sheet links to the laptop Trophies tab.
- Pre-compiling the next scene's shaders during dead time (van drive, setlist, Loonies intro).
- Slot records LZW-compressed when JSON > 100k chars (lead, `10_save`; trigger: Lane Q measures total localStorage > 1.2M chars).
- Fold the runtime EFFECT_KEYS additions (`member`, `payCut`, `repay`) into `02_contracts.js` (back-burner, lead).

### 1.3 Deferred
- **v1.1 "Seats"** (handoff Part E, draft `plan/plan_contract_1.1.md`): seat picker, string highway, seat achievements (Low
  End, The Engine Room, Solo Too Long, Musical Chairs), the other seat tokens (`{gear} {sticks} {yourPart} {seat}`), swapped-
  drummer epilogue content, seat lessons.
- **v1.2 "Tuning"** (D5, moved by the owner 2026-10-01): owner playtest loop, back-burner sweep, money/fans retuning (incl.
  Gravel Kings' early World rate), the two-thumb same-half chord tweak, rock's walking bass, band-voice onset compensation,
  the planner-sheet room squeeze, voice tweaks, Bluetooth calibration and battery checks by hand.
- `GG.render.garage.peek` stays unbuilt. The title scene stays Hail Damage's hailstorm garage (gap #11 note; v1.1 default too).

### 1.4 Seats forward-compat (handoff E12; no `state.seat` field in v1.0 — code reads `state.seat || 'drums'`)
| E12 item | v1.0 deliverable | lane |
|---|---|---|
| Hall of Fame stores `seat` | `HOF_ENTRY.seat` (default `'drums'`); `META.careers.bySeat`; the HoF row shows a seat chip only when ≠ drums | E (`hofEntry`), M (store/UI) |
| Legacy score seat-neutral | no Legacy part reads the seat; `sim_legacy` asserts the same score with `seat: 'bass'` | E |
| Drum achievements gated | `ACH.seat?: [seat]`; Chugging Along (kick share) and any text with drum words gated `['drums']`; seat ones are v1.1 | M |
| Player epilogue per seat; swapped-drummer variants | `endings.player = { drums: {…} }` (falls back to drums); epilogue `when.seatRole` matcher (never true in v1.0, proven by a synthetic test) | E |
| Tutorial reads `{instrument}` / `{drummer}` | stage 0 adds both tokens (drums values: `drums`, `you`); lessons use them; drum-mechanics steps carry `seat: ['drums']` | lead (stage 0), T |

### 1.5 Contradictions found by the audits and how this contract resolves them
| # | Contradiction | Resolution |
|---|---|---|
| 1 | A11 "final showdown near the end" vs "Sad Dome in year 10" once bonus years exist | Q2 (last year; identical for 10-year careers) |
| 2 | Shipped HD epilogues (`content/drama.js` L59/89/119/146) ≠ the A14 examples | shipped = fallback, A14 lines = variants with explicit `when` |
| 3 | "Phone QA at 390×844" in both B4 v1.0 and D5 | automated QA in v1.0, hands-on in v1.2 |
| 4 | "Achievements never gate content" vs "meta unlocks" | Q5: unlocks come from tiers/specials only; trophies are bragging |
| 5 | Size: task says 4.3 MB, status 4.42 MB; `build.js` prints chars/1024 while the file is 4,417,065 bytes | measure = bytes on disk; stage 0 strips comments; build prints bytes |
| 6 | "The Original Five" vs four-piece bands | name and text read the lineup size |
| 7 | Band of Strangers = Kijiji All-Stars condition | one shared condition (`originals.kept === 0`) |
| 8 | Chartbusters' `legacy` number vs the player's Legacy score | player = `state.legacy.score`, label "Legacy"; rival fame keeps "Fame" in UI |
| 9 | Block Heater is free while protected (no breakdowns before 250 fans) | requires protection over and ≥ 3 away gigs that winter |
| 10 | Garage hotspot "Trophies" vs laptop "Trophies" | laptop tab = cross-career Trophies; garage sheet stays "Trophy shelf" |
| 11 | handoff "Tuning = v1.1" (D5) vs Addendum 3 | Tuning is v1.2; v1.1 is Seats |

---

## 2. Already works: reuse, do not rebuild

- **Career end.** `career.endWeek` (`20_sim_career.js` L1224-1260) → `advance` (L1209-1219) ends at `state.maxWeeks` (set
  L797, defaulted `10_save.js` L146) and emits `week:wrap`, `year:end`, `career:end {state}` (L1255-1257). `settleGig`
  (L1077-1088) is the per-gig hook point (`GG.recap.gig` precedent L1084). `career:new` (L835), `career:loaded`
  (`60_main.js` L135).
- **maxWeeks-aware already:** label release pickers (`24_sim_labels.js` L756, L763, L1458), the tour's career-end guard
  (`25_sim_tour.js` L256), `next().final.reachable` (`23_sim_rival.js` L495). **Not** maxWeeks-aware (read
  `GG.rival.cfg().final.year` directly): the tour's Sad Dome guard `25_sim_tour.js` L260-261, the bots' stay-home window L901-
  902, the `finalSoon` news L766, and `59d_ui_rival.js` L156 ("Year 10: …"). Stage 0 / Lane E fix these (§3, §5 E).
- **World era:** `24_sim_labels.js` L1117-1121 (`milestones.worldReady` + `setEra('world')`); `state.eraHistory` `[{era,
  week}]` (`20_sim_career.js` L760-768).
- **Final showdown:** `23_sim_rival.js` `finalGig` L417-426, forced Monday L470-474, `isFinalWeek` L345-348, resolve L604-656
  (`state.finalShowdown = {week, won, headliner, score, rivalScore, rival}`), auto-resolve in `closePending` L726-733 (never
  reaches `settleGig`), `finalSoon` L764-768 (`rv.finalNews`); config `economy.rival.final {year:10, week:21}`; `ui.rivalEnd`
  (`59d_ui_rival.js` L580-586, testid `end-final`).
- **GIG_RESULT fields used here:** `r.opening` (`26_sim_world.js` L399), `r.km` (L398), `r.banned`, `r.weather` / `r.temp`
  (`28_sim_calendar.js` L222). Gig fields: domestic festival slot `g.headliner` / `g.slot` / `g.showdown.kind 'festival'`
  (`23_sim_rival.js` L411); tour stop `g.festival` (`25_sim_tour.js` L392); `g.source`.
- **Region data:** `tour.regions[id] = { broken, big: null|{songId,…}, fans }` (`25_sim_tour.js` L32, `big` set L714).
- **Storyline flags:** `flags.cape` (`C.CAPE_VALUES` velvet/curtain/charred/fireproof/none), `mooseOpera`, `council`
  (won/lost/tie/withdrew/never), `riff` (settled/scrapped/original), `truckStory` (never/mine/ad/famous), `greyMug`, payoffs
  `squatAnthemPayoff`, `mudHeadlinePayoff`, `outbackPayoff`, `mudstonbury` ('headlined').
- **Recaps (D3):** `GG.recap` (`2d_sim_recap.js`; migrate chain L237-243); RECAP ~650 chars/yr; `ui.openRecap`, `recap` screen,
  `ui.recapPanel`. Band photo session-only.
- **Epilogues:** `content.drama.members[id].epilogue` for all 14 originals (HD `drama.js`; packs FH L1810/1839/1867, GK
  L1675/1704/1733, GRR L1937/1967/1997/2026). `members[]` carry `original`, `status`, `returns`, `exit`; `state.rivalDefectors`.
- **Awards and trophies:** `L.runLoonies` (`24_sim_labels.js` L1280-1320, `loonies:result {rivalWon}`), worst_van L1300-1303,
  certs (L939); Global Gong `T.runGong` (`25_sim_tour.js` L798-823); Grey Mug (`28_sim_calendar.js` L281-298).
- **Milestones / D4 hooks:** `checkMilestones` (`20_sim_career.js` L1164-1183); `milestones.soldOut` (`2c_sim_licensing.js`
  L218); `stats.parentsLoans`; payoff flags.
- **Logo:** `GG.render.logo.forState`, `dataURL` (`46_render_logo.js` L458), `ui.logoImg(logo, name, size)` (`5m_ui_logo.js`
  L25-32). Carry-over keys `gg.v1.unlocks.<genre>` / `.logo` (`2b_sim_creator.js` L370-388, `2e_sim_logo.js` L155-172).
- **Storage:** `GG.save.KEYS.hof` / `.meta` reserved; `getJSON/setJSON` with memory fallback (`setJSON` returns false on a
  failed real write, L46-50, L61); `save.list()` (L92); `save.migrate` (L135; `seed` defaults to 1 at L167); `toCode/fromCode`
  (L301-317); the import handler (`51_ui_menu.js` L436-447) runs `fromCode` (and so `migrate`) before the user confirms.
- **Settings:** `DEFAULT_SETTINGS` (`10_save.js` L15-17); only keys the player changed are stored (`saveSettings` L109-113);
  `P.normalize` (`11_settings.js` L38) maps unknown graphics to 'high'.
- **Tokens:** `career.fillText` TOKEN_RE (`20_sim_career.js` L416) + `career.tokenValue`; `C.TOKENS` (`02_contracts.js` L72);
  `ui.fill` (`50_ui_core.js` L447).
- **Career difficulty:** `GG.difficulty` (`11_settings.js` L107-129), `state.careerDifficulty` locked per career.
- **Teaching hooks:** week-1 toast (`60_main.js` L190-200); forced week-1 card per band; `career.firstGigVenue` (L775-789);
  first-Write tips (`54_ui_sequencer.js` L578-590); `ui.toast` / `ui.bubble` (`50_ui_core.js` L184, L201); `GG.render.
  goToHotspot`, `hotspotScreenPos`, `memberScreenPos`, `playerScreenPos` (`40_render_core.js` L171-185); `screen:open {id}`;
  speaker guard + role aliases; calibration skip under automation unless `?calib=1` (`5h_ui_settings.js` L7, L279-287).
- **Title / creator / laptop:** title kids (`51_ui_menu.js` L116-132), creator (L266-347; seed `hashSeed(name + Date.now())`),
  ☰ menu (L369), export (L414); laptop TABS (`53_ui_laptop.js` L16; tab switches rerender without `screen:open`, L95-104; a
  10th tab wraps 5 + 5, `00_shell.html` L941).
- **Render perf in place:** instanced stage crowd (`42_render_stage.js`), merged crowd sea, instanced shadows/van/carpet/title
  hail, Builder merges; `QUALITY` (`40_render_core.js` L29), `R.setPaused` (L155) via `60_main.js` `covered()/updatePause()`.
- **Audio caps:** `30_audio.js` L64, `book()/fits()` (L666-680), taps choked per lane. Peak at the festival gig: 30 sources.
- **Conventions:** `tests/_load.js` SIM_SAFE `/^(0[12]_|1\d_|2[\da-z]_|content\/)/` — `12_meta`, `2f_`, `2g_`, `2h_` load in node
  and `tools/balance.js`; content loads alphabetically before `zz_band_*`; migrations chain onto `GG.save.migrate`;
  `GG.registerDebug(name, fn)`; sim purity tests reject `Math.random` / `\bDate\b` (`sim_drama.test.js` L276-287).

---

## 3. Stage 0 (lead, one commit on `v1.0-glory` before the worktrees fork)

1. **status.md:** record §0 (incl. Q2 replacing the year-10 decision for bonus careers); D4 and Addendum 3's v1.0 item "in
   progress".
2. **`VERSION` = `1.0.0.0`.**
3. **`build.js`:** strip full-line `//` comments from JS modules, skipping lines inside a template literal (backtick parity per
   file; the planner's scan found 0 such lines, 427,982 bytes of comments). `NOSTRIP=1` keeps them. Print bytes on disk and
   KiB. New **`tests/build.test.js`** (lead): backtick-parity guard per module, zero stripped lines inside template literals,
   and strip-equivalence (every stripped module parses; node `GG.content` and a 2-year seeded bot state are identical with and
   without comments). The full pw matrix runs on the stripped `dist/` anyway.
4. **`src/02_contracts.js`** (lead-only from here on):
   - `C.CAREER_YEARS = 10` stays; `C.BONUS = { maxYears: 3, rule: [{ maxWeek: 120, years: 3 }, { maxWeek: 144, years: 2 }] }`
     (inclusive totalWeek bounds of the World week).
   - `C.ENDING_TIERS`, `C.SPECIAL_ENDINGS` (8 ids, §4.2), `C.LEGACY_PARTS` (7).
   - `C.ACH_KINDS` and `C.LESSONS` **advisory** (lane tests validate against `GG.achieve.KINDS` / `GG.lessons.LESSONS`; the
     lead folds the final lists in at merge).
   - `C.TOKENS` += `'instrument', 'drummer'`. Shapes (comments): LEGACY, EPILOGUE, HOF_ENTRY, META, ACH, LESSON, STEP; new state
     fields; new events (§4.8).
   - `C.SAVE_SCHEMA` stays 10 (fill-when-missing only).
5. **`src/20_sim_career.js`** (hook and token lines only):
   - `settleGig` after `GG.recap.gig`: `if (GG.legacy) GG.legacy.gig(state, r, g); if (GG.achieve) GG.achieve.gig(state, r, g);`
   - `endWeek` after `checkMilestones`: `if (GG.legacy) GG.legacy.weekly(state, wrap);` (bonus years land before `advance`);
     after the year-end block: `if (GG.achieve) GG.achieve.weekly(state, wrap);`
   - `advance` when the career ends, before `career:end`: `if (GG.legacy) wrap.legacy = GG.legacy.finish(state); if
     (GG.achieve) GG.achieve.finish(state);`
   - `fillText`: tokens `{instrument}` → `'drums'`, `{drummer}` → `'you'` (v1.1 replaces the values per seat).
6. **`src/10_save.js`:**
   - `DEFAULT_SETTINGS.graphics = 'auto'` (normalizes to 'high' until Lane P adds 'auto' to `P.GRAPHICS`; harmless).
   - `migrate` fills when missing: `bonusYears: 0`, `legacyTrack: { bigHead: null }`, `legacy: null`, `ach: { got: {}, t: {} }`,
     `tutorial: { on: false, done: {}, past4: totalWeek >= 4 }` (old saves never start lessons). No events from migrate.
   - `toCode(state)`: `compress(JSON.stringify(GG.meta && GG.meta.enabled ? Object.assign({}, state, { _meta:
     GG.meta.exportLite() }) : state))` (never mutates the state; node codes unchanged).
   - `readCode(text)` → `{ state | null, meta | null }`: parses, takes `_meta` off **before** `migrate`, a `{ metaOnly: true }`
     body returns `state: null`. `fromCode(text)` = `readCode(text).state` (throws DAMAGED when null). `metaCode()` → a `GG1:`
     code of `{ v: 1, metaOnly: true, _meta: GG.meta.exportFull() }`. Merging is the caller's job (§4.5).
   - Tests in `tests/save.test.js`: old codes restore unchanged; `_meta` round trip; the state object is not mutated; meta-only
     code; v0.9 fixtures fill all five fields.
7. **`src/12_meta.js` (new; frozen API; Lane M owns it after stage 0).** Stage 0 writes, working: `enabled` (false by default),
   `load()`, `get()`, `save()`, `careerId(state)`, `lessonSeen(id)`, `markLesson(id)`, `exportLite()`, `exportFull()`,
   `mergeLite(obj)`, a minimal `recordCareer(state, opts)` (dedupe by id keeping the higher score, unshift, `finished++`,
   `byBand`/`bySeat`, stamps `at` + `ver`; returns `{ entry, fresh, unlocks: [], ach: [] }`; emits `hof:added`), the
   listeners `career:new` (bump `started`), `week:wrap` (past week 4: set `state.tutorial.past4 = true` once and bump
   `careers.past4`), `career:end` (`recordCareer` when `GG.state === state`) — every listener no-ops unless `enabled` — and the **one-time slot scan** in
   `load()` (`meta.scanned = VERSION`; for each `save.list()` slot: migrate a copy; `past4 += 1` if `totalWeek >= 4`; ended
   slots → `recordCareer(copy, { silent: true })` when `GG.legacy` exists, else retried on a later boot). Stubs: `award`,
   `has`, `unlock`, `unlocked` (Lane M fills them).
8. **`src/23_sim_rival.js` + `src/25_sim_tour.js`:** add `R.finalAt(state)` → `{ year, week }` (year = `GG.legacy &&
   GG.legacy.finalYear ? GG.legacy.finalYear(state) : cfg().final.year`); replace the direct reads at `25_sim_tour.js` L260-261
   and L901-902 with it (25 stays unowned after this).
9. **Sockets** (one-line entry points; each calls a §4 API if it exists):
   - `51_ui_menu.js`: title button "Hall of Fame" (`btn-hof`) when `ui.defined('hof') && GG.meta.hof().length`; ☰ rows
     `menu-lessons` (→ `GG.tutorial.openLessons()`) and `menu-hof`; creator toggle `tut-skip` (shown when `GG.tutorial &&
     GG.tutorial.offerSkip()`, default on) passing `skipLessons` to `GG.main.newCareer`.
   - `52_ui_week.js`: HUD "?" (`btn-help`, ≥ 48 px, next to ☰) → `GG.tutorial.openLessons()`; wrap line L514 →
     `GG.legacy ? GG.legacy.yearsText(st) : 'Ten years.'`; **move** the `end` screen (L532-550) into new `src/5n_ui_ending.js`
     with a header redeclaring `var ui = GG.ui, el = ui.el, btn = ui.btn, U = GG.util; function S() { return GG.state; }`.
   - `53_ui_laptop.js`: TABS += `{ id: 'trophies', label: 'Trophies' }` → `ui.trophiesPanel(st)` (placeholder if absent); the tab
     dispatcher emits `ui:tab { sheet: 'laptop', tab }`.
   - `60_main.js` boot: `if (GG.meta) { GG.meta.enabled = true; GG.meta.load(); }`.
   - `00_shell.html`: anchor blocks `/* v1.0 TUTORIAL { */ … /* } */` and `/* v1.0 QA */` only (edits to existing shell rules,
     e.g. `.hud .l`). New modules inject their own `<style>` from JS (precedent `52_ui_week.js` L76).
10. **`tests/_pw.js`:** `PW_VIEW=440x956` (default `390x844`) and `PW_TAG` for screenshot names.
11. **Fixtures** generated from the current code before any other edit (`tests/fixtures/*.json.gz`, ≈ 40 KB each): `v09_world_y9`
    (World era at wk ≤ 120, year 9), `v09_y10w14` (`rv.finalNews` set), `v09_ended` (ended at wk 240, no `legacy`).
12. **Baselines** (`run_in_background`, to files): `BAND=all node tools/balance.js 10 30` → `plan/balance_baseline_v10.txt`
    (≈ 11 min); copy `v10perf/*.js` → `tools/perf_probes/` (not shipped) and its results → `plan/perf_baseline_v10.txt`.
13. **Worktrees** from this commit; copy `tests/.cache/three*` into each.

---

## 4. Shared contract (every lane codes against this)

### 4.1 Legacy score (Lane E, `2f_sim_legacy.js`; pure, no RNG, no `Date`, seat-neutral)
Score 0–1000, the sum of seven parts. Tunables in `content/endings.js` `legacy`.

| part | max | input (state at career end) | formula (proposal) |
|---|---|---|---|
| fans | 250 | `state.fans` | 250 × min(1, fans / 80,000)^0.6 |
| units | 200 | `stats.units` | 200 × min(1, units / 600,000)^0.5 |
| awards | 150 | `stats.loonieWins`, Gong wins (`tour.gongs[].won`), certs (gold/platinum trophies), Grey Mug (`flags.greyMug` played/done) | min(150, 8 × loonies + 20 × gongs + 4 × certs + 10 × greyMug) |
| venue | 100 | max(`legacyTrack.bigHead.cap`, 19,000 if `finalShowdown.headliner === 'you'`) | 100 × clamp(ln(cap / 15) / ln(19,000 / 15)); 0 if none |
| regions | 100 | `tour.regions[id].broken` (abroad) | 25 per region broken |
| unity | 100 | `chemistry`; originals kept / at start | 100 × (0.5 × chem / 100 + 0.5 × kept / start) |
| final | 100 | `finalShowdown.headliner` | 'you' 100, 'rival' 40, none 0 |

- **Biggest venue headlined:** `GG.legacy.gig(state, r, g)` keeps `legacyTrack.bigHead = { id, name, cap, week }` when
  `!r.opening && !g.headliner && !g.festival && g.source !== 'final'`; Mudstonbury counts only when `flags.mudstonbury ===
  'headlined'`. Sad Dome credit comes only from `finalShowdown` in `compute()` (a missed final never reaches `gig()`).
  Migration estimate: max capacity over `venueLast` excluding `sad_dome` and every festival venue (`est: true`).
- **Bot check (4 seeds, planner run; Lane E re-measures at 30):** avg ≈ 540–690 points, good ≈ 900–950; a Garage-era career
  ≈ 175; one album + ~10k fans ≈ 290.
- **Tier thresholds (Q3):** Arena Legends ≥ 800, Canadian Institution ≥ 600, Cult Heroes ≥ 400, One-Album Wonders ≥ 200,
  Still in the Garage < 200. Difficulty is stored on the entry as a badge only.

### 4.2 Ending tiers and special endings (`src/content/endings.js`; Lane E)
```
endings.tiers[]    = { id (C.ENDING_TIERS), name, min, line, lineLostFinal?, byBand?: { <bandId>: { line } } }
endings.specials[] = { id (C.SPECIAL_ENDINGS), name, band?: [bandId], test: { kind, … }, line, unlock?: { emblem|palette } }
```
| tier | min | line (tokens) |
|---|---|---|
| Arena Legends | 800 | The Sad Dome. A world tour. A statue in `{city}` (the pigeons have opinions). Variant when the rival headlined. |
| Canadian Institution | 600 | Your one song plays at every hockey game, forever. Between periods. Every period. |
| Cult Heroes | 400 | A small, terrifyingly loyal fanbase. Reunion tours for life. |
| One-Album Wonders | 200 | One album. People still ask about it at gas stations. (0 albums: a "Zero-Album Wonders" line.) |
| Still in the Garage | 0 | Your mom wants to park the car in `{space}` again. |

| special | band | test (exact) |
|---|---|---|
| Big in Japan | any | `{ kind: 'bigIn', region: 'japan', share: 0.2 }` = `R.broken && (R.big != null \|\| R.fans >= 0.2 × state.fans)`, `R = tour.regions.japan` |
| Moose Opera | hail_damage | `{ kind: 'flag', flag: 'mooseOpera', values: ['platinum'] }` |
| Big in Berlin | frost_heave | `{ kind: 'flag', flag: 'squatAnthemPayoff' }` (truthy) |
| Mudstonbury Legends | gravel_kings | `{ kind: 'flag', flag: 'mudHeadlinePayoff' }` |
| Outback Legends | grid_road_ramblers | `{ kind: 'flag', flag: 'outbackPayoff' }` |
| Band of Strangers | any | `{ kind: 'originals', kept: 0 }` — text "you and `{n}` strangers from Kijiji" |
| The Original Five / Four | any | `{ kind: 'originals', neverQuit: true }` — name from lineup size |
| Side Project | any | `{ kind: 'rivalOriginals', min: 2 }` — "`{rival}` absorbed your band" |

All text tokenised (`{city} {space} {rival} {rivalFront} {front} {n}`), no US places, parody names only, no gong (the Global Gong
award may be named). Specials stack; each is its own card. `sim_legacy` has one true and one false synthetic state per test.

### 4.3 Epilogue cards (Lane E)
```
EPILOGUE = { kind: 'member'|'gone'|'defector'|'recruit'|'player'|'rival', id, name, text, silent?: true }
endings.epilogues[memberId] = [ { when: WHEN, text } ]      // first match wins; fallback drama.members[id].epilogue
WHEN = { flag?, values?, notValues?, minTier?, special?, status?, inLineup?, minYearsIn?, seatRole? }   // all given must hold
endings.recruits = { byTrait: { <traitId>: [text] }, byQuirk: { <quirkId>: [text] }, any: [text] }
endings.player   = { drums: { <tierId>: text } }            // keyed by seat (E12); v1.1 adds bass/rhythm/lead; missing → drums
endings.rival    = { you: text, rival: text, none: text }   // nice-to-have card
```
- One card per member in the final lineup, then originals who left (`gone`), then defectors ("now plays for `{rival}`"), then
  the player card. Variant picks are pure (hash of `careerId + memberId`). Rival text uses cast tokens (`{rivalFront}`), never
  an npc display name.
- **A14 variants (Hail Damage), explicit:** Marcel cape shop `{ flag: 'cape', notValues: ['none'] }` (and set); Dana "the solo
  finally ends" `{ inLineup: true, minTier: 'cult_heroes' }`; Jaxon "baba becomes your manager" `{ minTier:
  'canadian_institution' }`; Kenji "a new bass arrives every Christmas" `{ minTier: 'cult_heroes' }`, else the shipped blank
  postcard. One state-keyed variant per other original from its storyline flag (council, riff, truckStory).
- `seatRole` matches `member.seatRole || member.role`; v1.0 content has no `seatRole` variants (v1.1 adds e.g. Kenji "a new
  drum kit arrives every Christmas"); `sim_legacy` proves the matcher with a synthetic member.
- Kenji (`silent`): narration only, never rendered as a quote; the speaker guard applies to every card.

### 4.4 Bonus years, the final year and the end sequence (Lane E)
- `GG.legacy.worldWeek(state)` = the `eraHistory` 'world' entry, else `milestones.worldReady`, else null.
- `GG.legacy.bonusFor(state)` → 0 | 2 | 3 from `worldWeek` and `C.BONUS` (inclusive). Returns 0 when `GG.legacy.noBonus`
  (a plain flag: the vm context has no `process`; `tools/balance.js` sets it when `NO_BONUS=1`; tests that assert a 10-year
  shape set it right after load).
- `GG.legacy.weekly` grants once when `bonusYears === 0 && bonusFor > 0 && !state.finalShowdown && !(state.rival &&
  state.rival.finalNews) && state.year < 10`: `state.bonusYears`, `state.maxWeeks = 240 + 24 × years`, a wrap milestone line,
  an `@front` chat line (hash of `careerId`), `legacy:bonus { years, maxWeeks }`. The same rule covers old saves.
- `GG.legacy.finalYear(state)` = `Math.ceil(state.maxWeeks / 24)`. It cannot change once `finalNews` is set (the grant is
  refused then). `R.finalAt` feeds `isFinalWeek`, `finalSoon`, `reachable`, the tour guard and the bots' home weeks;
  `fillerFans` fades over `maxWeeks / 24`.
- **Bonus-year content:** 4–6 cards per band (encore, farewell tour, reunion rumours) in `content/endings.js` `bonusCards`,
  gated `minYear: 11` + `band`, appended to `GG.content.cards` at load. No existing pool changes order or weights in years
  1–10 (so the `NO_BONUS` run stays identical).
- `GG.legacy.yearsText(state)` → "Ten years." / "Thirteen years.".
- `GG.legacy.compute(state)` → LEGACY, pure (no events, no writes). `finish(state)` = compute + store in `state.legacy`
  (idempotent) + `legacy:done { legacy }` before `career:end`. `hofEntry(state)` uses `state.legacy || compute(state)` and
  returns the entry **without** `at`/`ver` (12_meta stamps them).
```
LEGACY = { v: 1, score, parts: { <C.LEGACY_PARTS>: points }, raw: { fans, units, loonies, gongs, certs, venue: {id,name,cap,est?}|null,
           broken: [regionId], chem, originals: { start, kept, everQuit }, final: 'you'|'rival'|null },
           tier, specials: [id], epilogues: [EPILOGUE], years, bonusYears, difficulty, seat, week }
```
- **End sequence** (`5n_ui_ending.js`, screen `end`, full): Legacy count-up (`end-legacy`) → tier (`end-tier`) → specials
  (`end-special-<id>`) → epilogues (`end-epilogue-<id>`, swipe or Next) → rival line (`end-final`) → summary (achievements
  this career, unlocks from `recordCareer`'s return, buttons `end-hof` / `btn-end-title`). On build: if the state is
  **ended**: `state.legacy || GG.legacy.finish(st)`, then `GG.achieve && GG.achieve.finish(st)`, then
  `GG.meta.recordCareer(st)` (idempotent). If **not ended** (e.g. `pw_flow` L344): a read-only preview from
  `GG.legacy.compute(st)`, nothing written. **No share, screenshot or download button.**

### 4.5 Meta storage, the Hall of Fame and backups (stage 0 writes the core; Lane M owns it and the UI)
```
META (gg.v1.meta) = { v: 1, scanned: '<VERSION>'|null,
  careers: { started, past4, finished, byBand: { <bandId>: n }, bySeat: { drums: n }, best: { score, careerId } | null },
  lessons: { <lessonId>: 1 }, ach: { <achId>: { at: 'YYYY-MM-DD', band, y } },
  unlocks: { palettes: [id], emblems: [id], parts: [id] }, seen: { <careerId>: 1 } }   // seen capped 200
HOF (gg.v1.hof) = { v: 1, entries: [ HOF_ENTRY ] }   // newest first; cap 40, the top 10 by score never dropped
HOF_ENTRY = { id: careerId, at, ver, bandId, band, genre, city, seat: 'drums', player: { name, nick },
  logo: { emblem, style, palette }, difficulty, years, bonusYears, score, parts, tier, specials: [id],
  lineup: [ { id, name, original, status } ], rival: { id, name }, final: 'you'|'rival'|null,
  stats: { fans, units, loonies, gongs, certs, gigs, songs, albums, loans, venue: { name, cap } | null, broken },
  ach: [achId], strip: [ { y, h, fans, era, best, aw } ] }      // ≈ 1.5–3 KB
```
- `careerId(state)` = `seed.toString(36) + '.' + bandId`; when `seed === 1` (seed-less old save) append
  `'.' + GG.hashSeed(player.name + createdVersion + JSON.stringify(history[0])).toString(36)`.
- `recordCareer(state, opts)` → `{ entry, fresh, unlocks: [{ kind, ids, names }], ach: [ids] }`; same id again keeps the higher
  score and never double-counts. Emits `hof:added` and (unless `opts.silent`) `meta:unlock`. **Quota:** when
  `setJSON(KEYS.hof)` returns false, drop `strip` from entries outside the top 10 and retry once; still false → keep in memory
  and emit `meta:quota` once (UI toast "Hall of Fame saved for this session only").
- `exportLite()` = META without `seen`/`lessons` + (top 10 by score ∪ newest 10) entries without `strip`, `ach`, `parts`
  (≈ 0.4 KB each). `exportFull()` = META + every entry. `mergeLite(obj)`: entries by id (higher score), `ach` by earliest date,
  unlocks by set, counters by max.
- **Import** (Lane M, `51_ui_menu.js`): `readCode`; meta-only → confirm "Restore Hall of Fame and trophies?" → `mergeLite`;
  career → after the user confirms (or no career open) `loadState`, then `mergeLite`. Never merge on a failed import.
- **Hall of Fame UI** (`5q_ui_hof.js`): screen `hof` (full; `btn-hof`, `menu-hof`, `end-hof`): one row per entry (`data-band`)
  with `ui.logoImg`, band, player, tier chip, score, years, difficulty badge (seat chip only when ≠ drums); tap → sheet
  `hof-entry` (parts, specials, lineup avatars, trophies, the year strip; tap a year → a small year card); "Backup code"
  (`hof-code`) shows `GG.save.metaCode()` in the existing code panel. Empty storage: "No careers yet."

### 4.6 Meta unlocks and achievements (Lane M)
**Meta unlocks (Q5):** first time a tier is reached → a palette (`content/logo.js`, `meta: 'tier:<id>'`): Arena Gold, Hockey
Night, Cult Velvet, One-Hit Teal, Garage Grey. First time a special → an emblem (`46_render_logo.js`, ≤ 1 KB each):
`lantern` (Big in Japan), `price_tag` (Band of Strangers), `handshake` (Original Five/Four), `globe_record` (any World-payoff
special); palette Rival Red (Side Project). Creator parts unlocked in a finished career join `meta.unlocks.parts` and are
offered in every genre (the per-genre carry toggle keeps working). Creator and logo picker mark meta items with a 🏆 chip.

**Achievements content** (`src/content/achievements.js`):
```
ACH = { id, name, blurb, icon (emoji), band?: [bandId], seat?: [seat], when: 'gig'|'week'|'year'|'end'|'meta'|'load',
        test: { kind, … }, nameBySize?: { 4: '…', 5: '…' }, hidden?: false }
```
Counters live in `state.ach.t` and count from the v1.0 migration (old saves start at 0). State-derived kinds are re-checked on
`career:loaded` (retroactive for in-progress careers); counter kinds are not. Any ACH text with drum vocabulary carries
`seat: ['drums']` (E8 rule). Each kind gets one true and one false synthetic case in `sim_achieve`.

| id (name) | when | test (exact) |
|---|---|---|
| twelve_people (Twelve People and a Dog) | gig | `{ kind: 'milestone', id: 'firstGig' }` |
| the_wall (The Wall) | gig | `{ kind: 'bannedInYear', min: 3 }` — `t.bans[year] += 1` when `r.banned` |
| ma_pelouse (Ma Pelouse) HD | week | `{ kind: 'releasedFr' }` — a released song whose title Marcel wrote (song has `fr`, or named by the namer `marcel`) (D4) |
| original_lineup (The Original Five/Four) | end | `{ kind: 'originals', neverQuit: true }`, `nameBySize` |
| kijiji_all_stars (Kijiji All-Stars) | end | `{ kind: 'originals', kept: 0 }` |
| sold_out (Sold Out) | week | `{ kind: 'milestone', id: 'soldOut' }` |
| worst_van (Worst Van) | year | `{ kind: 'award', id: 'worst_van', won: true }` |
| block_heater (Block Heater) | week | `{ kind: 'winterNoBreakdown', away: 3 }` — protection over; that winter ≥ 3 gigs with `r.km > 0` away from home, 0 breakdowns |
| buddy (Buddy) HD | year | `{ kind: 'rivalLoonieStreak', n: 3 }` — `loonies:result.rivalWon` three years running |
| big_in_japan (Big in Japan) | end | `{ kind: 'special', id: 'big_in_japan' }` |
| frostbite (Frostbite) | gig | `{ kind: 'venuePlayed', id: 'siberian_frostfest' }` |
| chugging_along (Chugging Along) seat drums | week | `{ kind: 'songKickShare', genre: 'metal', min: 0.5 }` |
| grey_mug (Grey Mug) | week | `{ kind: 'flag', flag: 'greyMug', values: ['played', 'done'] }` |
| night_school (Night School) | week | `{ kind: 'stat', stat: 'parentsLoans', min: 3 }` |
| sad_dome (Sad Dome) | end | `{ kind: 'final', headliner: 'you' }` |
| read_the_minutes (Read the Minutes) FH | week | `{ kind: 'flag', flag: 'council', values: ['won'] }` |
| legally_distinct (Legally Distinct) GK | week | `{ kind: 'flag', flag: 'riff', values: ['original'] }` |
| truck_song (Truck Song) GRR | week | `{ kind: 'flag', flag: 'truckStory', values: ['famous'] }` |
| sponsored_content FH / power_ballad_blues GK / tailgated GRR | year | `{ kind: 'rivalLoonieStreak', n: 3 }` (band-gated twins of Buddy) |
| overtime (Overtime) | week | `{ kind: 'bonus', min: 2 }` |
| statue_season / mom_needs_the_garage | end | `{ kind: 'tier', id: 'arena_legends' }` / `{ kind: 'tier', id: 'still_in_the_garage' }` |
| hat_trick (Hat Trick) | gig | `{ kind: 'botbInYear', min: 3 }` — `t.botb[year]` from BotB wins |
| between_periods (Between Periods) | week | `{ kind: 'licensedBrand', id: 'hockey' }` |
| whos_opening_now (Who's Opening Now) | week | `{ kind: 'crack', id: 'opener' }` |
| prodigal_bandmate (Prodigal Bandmate) | week | `{ kind: 'returned' }` — any original with `returns > 0` back in the lineup |
| pitchspork_proof (Pitchspork Proof) | week | `{ kind: 'reviewBelow', outlet: 'pitchspork', max: 3.0 }` and the album still certified |
| moms_basement_tapes (Mom's Basement Tapes) | week | `{ kind: 'studio', id: 'moms_basement' }` — a release recorded there |
| gas_station_sushi (Gas Station Sushi) | gig | `{ kind: 'km', min: 25000 }` — `t.km += r.km` per settled gig; Lane M tunes the threshold so 20–60 % of avg-bot 10-year careers reach it |
| minus_forty (Minus Forty and Fine) | gig | `{ kind: 'weatherGig', maxTemp: -30, or: ['blizzard'] }` — from `r.temp` / `r.weather` in `gig()` |
| prairie_grand_slam (Prairie Grand Slam) | meta | `{ kind: 'allBands' }` — `careers.byBand` has all four |
| reserve: brutal_honesty / lifer / global_gonger | end / meta / year | `{ kind: 'difficulty', id: 'brutal' }` / `{ kind: 'careers', min: 3 }` / `{ kind: 'gongWon' }` |

**Achievements sim** (`2g_sim_achieve.js`, DOM-free, never the career RNG, no `Date`): `GG.achieve = { ensure, migrate, gig(state,
r, g), weekly(state, wrap), finish(state), check(state, when) → [newIds], list(state), view(state, id), def(id), KINDS, debug }`
(`GG.debug('achieve')` → `{ got, counters }`). `state.ach = { got: { <id>: totalWeek }, t: { bans, botb, km, winter, streak } }`.
Emits `ach:earned { ids }`. Band and seat gates honoured (`state.seat || 'drums'`). `'meta'` kinds are evaluated in
`recordCareer`. Listens to `career:loaded` → `check(state, 'load')`.
**Meta + UI** (browser only): `ach:earned` → `GG.meta.award(state, ids)` (dates) → `meta:ach { ids, fresh }`.
`5o_ui_trophies.js`: `ui.trophiesPanel(st)`: earned rows (date, band chip, `data-band`); unearned rows of the current band with
their blurb; another band's unearned rows as "??? (a `{band}` thing)". Toast queue `ui.achToast(fresh)`: only fresh ids, held
while `gig`/`rival-set` is open or a song is live, flushed on the results screen or the gig's `screen:close`; max 3 per flush,
then "+n more".

### 4.7 Tutorial (Lane T; sim `2h_sim_lessons.js` + UI `5p_ui_tutorial.js` + content)
```
LESSON = { id, title, band?: [id], seat?: [seat], when: { maxWeek?, week?, screen?, tab?, first?: true }, steps: [STEP],
           byBand?: { <bandId>: { steps } } }
STEP = { who: '@front'|'@deadpan'|'@grumbler'|'@driver'|'@any'|memberId, text (tokens incl. {instrument} {drummer}),
         seat?: [seat], point?: { hotspot } | { testid } | { member: alias }, advance: 'next' | { event, id? } | { hotspot } }
lesson ids: w1_card w1_walk w1_plan w1_write w1_rehearse w1_gig w1_wrap w2_board w2_money w3_chat w4_van y1_good_year
```
- **Sim** `GG.lessons` (DOM-free, node-tested): `ensure(state)`, `on(state)`, `done(state, id)`, `mark(state, id)`,
  `stop(state)`, `steps(state, id)` (band layer + seat gates + `fillText` + `speakerOk`), `due(state, ctx)` → lesson id or
  null, `LESSONS`. `state.tutorial = { on, done: { <id>: totalWeek }, past4 }`; `60_main.newCareer` sets `on` (false when
  `skipLessons`).
- Week one (A15): `w1_card`, `w1_walk` (bandmate points at Plan week, "your `{instrument}`", Gig board via
  `hotspotScreenPos`), `w1_plan`, `w1_write` (drum grid steps `seat: ['drums']`), `w1_rehearse`, `w1_gig` (setlist sheet before
  the count-in; never during a song), `w1_wrap` (each stat row once). Weeks 2–4: `w2_board` (first `screen:open board`),
  `w2_money` / `w3_chat` (first `ui:tab` money / chat, or first mood drop), `w4_van` (first van ride). `y1_good_year` replays
  the shipped `recap.goodYear`.
- Voice: role aliases + `byBand` (Hail Damage keeps "Lord Abyssus"); bandmates not in the lineup dropped; Kenji never speaks.
- Skip (Q7): `GG.tutorial.offerSkip()` = `meta.careers.past4 > 0`; `tut-skip` defaults on.
- "?" (`btn-help`, `menu-lessons`): sheet `lessons` (seen ones ticked); tapping replays (closes sheets if it points at the
  garage; text-only bubbles when its screen isn't open). Replays never change `state.tutorial.done`.
- Non-blocking bubbles with Next and "Skip lessons"; taps reach the game; starts only after `calib` closes; automation off
  unless `?tut=1`; the sequencer's first-Write tips are suppressed while `w1_write` runs.
- `GG.tutorial = { start(id), replay(id), offerSkip(), openLessons(), active(), debug }`; events `tut:step { id, step }`,
  `tut:done { id }`; `GG.debug('tutorial')` → `{ on, active, step, done }`.

### 4.8 New events (documented in `02_contracts.js` EVENTS)
`legacy:bonus { years, maxWeeks }` · `legacy:done { legacy }` · `ach:earned { ids }` · `meta:ach { ids, fresh }` ·
`meta:unlock { kind, ids, names }` · `meta:quota {}` · `hof:added { entry }` · `meta:changed { keys }` · `ui:tab { sheet, tab }` ·
`tut:step { id, step }` · `tut:done { id }` · `perf:quality { pixelRatio, reason }`.
Node bots emit the sim events; only browser listeners write meta (`GG.meta.enabled`).

### 4.9 Performance (Lane P; `tools/perf.js` ported from `tools/perf_probes/`)
**Hard gates** (headless-measurable): draw calls, triangles, audio nodes per drum hit, governor mode/cap per scene, the
pure pixel-ratio step function. **Report-only** (machine noise): JS/frame, render() time, quickStart, first-build times, heap
growth over a festival gig (B2 "no per-frame allocations").

| scene / metric | now (0.9.0.0) | v1.0 target |
|---|---|---|
| title | 33 calls / 37.3k tris | ≤ 33 / ≤ 38k (gate) |
| garage tier 0 (4 bands) | 39–43 / 9.0–14.6k | < 60, ≤ HD × 1.15 (gate) |
| stage club / Sad Dome | 35 / 46k | ≤ 38 calls / ≤ 28k tris (gate) |
| stage festival (Mudstonbury) | 35 / 65.7k | ≤ 38 / ≤ 35k (gate) |
| stage Budokhan | 33 / 54k | ≤ 30k (gate) |
| van / carpet | 28–31 / 16–18k; 15–19 / 10.5k | unchanged (gate) |
| gig peak, festival, Expert, 170+ BPM, CPU ×4 | JS/frame p50 8.3, p95 18.2 ms | p50 ≤ 6, p95 ≤ 14 (report) |
| first HD quickStart (×1) | 1.5–1.8 s (1.1 s logo readback) | ≤ 0.6 s (report; logo fix is Lane M) |
| first stage / van build (×4) | 935 / 643 ms | −40 % (report) |
| tier-0 space atlas | 2048×1024 at tier 0 | built at tier ≥ 1 only (1024×512 on 'low') (gate) |
| audio at the gig peak | 30 sources, 150–170 nodes/s | global cap 32 (taps > kick/snare > band > crowd > ambience > sfx), 0 tap drops, ≤ 80 nodes/s (gate) |
| first gig's crowd at ×4 | silent if < 4 s after unlock | warm-up on the first garage entry |
| time to interactive | 0.57 s ×1 / 1.75 s ×4 | no regression (report) |

- **Frame governor** (`40_render_core.js`), per scene: **60 fps** = live gig, `rival-set` (spectator / BotB, audio-synced), walking
  or a camera glide, van while driving, carpet walk; **30 fps** = idle garage, idle title, idle van/carpet; **≤ 10 fps or
  paused** = behind a tall sheet after the glide. Any change renders the next frame regardless (syncState, setScene,
  setViewInsets, preview calls, a glide). An explicit `setPaused(false)` is honoured (`pw_shop` van previews); `60_main`'s
  `setPaused(true)` always wins. The sequencer is a full screen (3D already paused).
- **Adaptive pixel ratio** ('auto'): pure `R.nextRatio(cur, p95, heldMs)` → 1.5 → 1.25 → 1.0 when p95 > 20 ms for 2 s, back
  up at < 12 ms for 4 s; **applied only between songs or scenes, never while a song is live**. 'auto' gets crowdScale 1.0.
- `GG.debug('perf')` → `{ mode, cap, ticks, rendered, pixelRatio, quality, voices, drops }`.
- LOD: front 40–60 people unchanged; back rows one merged 12–24-triangle instance (matrices at 30 Hz or on beats); festival
  background one box per person, raised hands only in the nearest third.
- Audio: a pure voice allocator `A.voicePlan(active, req)` (node-tested); pre-rendered drum hits per lane/variant/kit tier
  built lazily after the audio unlock (live synthesis until ready), checked in Chromium (`pw_perf audio`: spectrum within
  tolerance, booked times ±1 ms). Drum timing is untouchable: `sync.test.js`, `pw_gig` sync/sync2/double stay green.

### 4.10 Size budget
- Measure: bytes on disk of `dist/game.html`. After stage 0's comment strip ≈ 3.99 MB.
- **Hard gate:** `dist/game.html` ≤ 4,250,000 B (leaves v1.1 Seats room under the 4.5 MB ceiling).
- **Target:** v1.0 additions ≤ +150 KB stripped. Soft lane targets (report before/after bytes): E 45, M 50, T 35, P 10,
  CSS 10 KB. An overrun under the hard gate is reported in the merge summary, not a blocker.

---

## 5. Lanes (4 agents max: E, M, T, P; Lane Q is the lead)

Four lanes run in parallel in separate worktrees with disjoint ownership. If the agent budget is tight, **merge** lanes (the
lead does P inline after the others, or T + M become one agent); never split. **Lead-only files:** `src/01_ns.js`,
`src/02_contracts.js`, `src/10_save.js`, `src/20_sim_career.js`, `src/25_sim_tour.js` (after stage 0), `build.js`, `VERSION`,
`tests/_load.js`, `tests/run.js`, `tests/_t.js`, `tests/_pw.js`, `tests/save.test.js`, `tests/build.test.js`, `plan/*`, `dist/*`,
`index.html`. Lanes write reports (balance, perf) to `tests/.cache/` and attach them; the lead copies them into `plan/`.
**Every lane:** the process rule (top); content tokenised, no US places, parody names only, no gong on the kit, no share/
screenshot/download control; **every new v1.0 control ≥ 48 px**; a "no console errors" assertion in every pw section; every new
pw section passes at 390×844 and `PW_VIEW=440x956`; new modules inject their own CSS; new state fields come from stage 0's
migrate defaults (lanes chain only logic backfills onto `GG.save.migrate`); a test that asserts a 10-year shape sets
`GG.legacy.noBonus = true` after load.

### Lane E: ENDINGS (sim + content + end sequence)
**Owns:** new `src/2f_sim_legacy.js`, `src/content/endings.js`, `src/5n_ui_ending.js` (moved `end`); `src/23_sim_rival.js`,
`src/59d_ui_rival.js`, `src/content/economy.js`, `tools/balance.js`; tests `tests/sim_legacy.test.js`,
`tests/content_endings.test.js`, `tests/pw_ending.js`, `tests/sim_rival.test.js`, `tests/sim_career.test.js`,
`tests/sim_recap.test.js`, `tests/sim_licensing.test.js`, `tests/pw_rival.js`; adds one test to `tests/sim_tour.test.js`.
**Tasks:**
1. `GG.legacy` per §4.1–4.4: `ensure, migrate (bigHead estimate), gig, weekly, worldWeek, bonusFor, finalYear, compute, score,
   tier, specials, epilogues, finish, yearsText, hofEntry (with seat), text, noBonus`, debug `legacy`.
2. Bonus years + `R.finalAt` inside 23 (`isFinalWeek`, `finalSoon`, `reachable`); `fillerFans` over `maxWeeks`; `59d` L156 year
   from `Math.ceil(fin.week / 24)`; check every other 10-year assumption to week 312 (deck, labels, tours, recaps, Loonies, Gong,
   rival songs/albums), fix in owned files or report.
3. `content/endings.js`: tiers (band texts where tokens aren't enough), specials, epilogue variants for all 14 originals (≥ 1
   beyond the default; A14 `when`s per §4.3), recruit pool (≥ 2 per trait, 1 per quirk, 4 generic), `player.drums` per tier,
   bonus-year chat/milestone lines and `bonusCards` per band, `legacy` tunables.
4. End sequence (§4.4) in `5n_ui_ending.js`.
5. `tools/balance.js`: per band and style, World week, bonus rate (0/2/3), Legacy mean/range, tier mix, specials; careers run
   to their own `maxWeeks` (`years = 13`); with `NO_BONUS=1` it prints exactly the v0.9 format (new columns only without it);
   the fans sanity cap 100k → 250k (L83, L310 text).
6. Existing 10-year tests set `noBonus` (sim_career L341, sim_rival L344, sim_recap L102-104, sim_licensing L201-210,
   pw_rival L50/L260-275); add one 312-week bonus run per band in `sim_legacy`.
**Acceptance (E):**
- `sim_legacy`: each part on synthetic states; tier boundaries; every special true and false; epilogues for all 4 bands
  (lineup, quit, defector, recruit, Kenji silent, player card, `seatRole` hook); same score with `seat: 'bass'`; bonus rule
  (World wk 120 → +3 / 312; 121 and 144 → +2; 145 → 0; once only; refused with `finalNews` or `finalShowdown` or year ≥ 10;
  v0.9 fixtures: `v09_world_y9` → granted, `v09_y10w14` → none); headline tracker exclusions (opening, domestic festival slot,
  tour festival, final; Mudstonbury only when headlined; Sad Dome via `finalShowdown`); `finish` idempotent; `hofEntry` has
  `seat: 'drums'`, no `at`, `difficulty === state.careerDifficulty`; `careerDifficulty` unchanged over a career; the career RNG
  unchanged by every `GG.legacy` call; purity regex on 2f; per-band leak scan on ending text.
- `sim_tour` / `sim_rival`: with +3, a tour over y13 w21 is refused and y10 w21 is free; bots stay home before y13 w21; the Sad
  Dome in year 13 (and year 10 with `noBonus`).
- `sim_career`: a seeded 312-week bot career per band finishes with no exceptions and invariants hold.
- `content_endings`: ids/tokens/gates valid, no US places, no other band's names; a 312-week draw per band never runs dry
  (`drawProblems` metric copied from `content_bands.test.js`).
- **Balance** (background, `BAND=all node tools/balance.js 13 30`): per band: good bot ≥ 80 % Arena Legends, +3 ≥ 80 %, +2 or
  more 100 %; avg bot ≤ 20 % Arena, ≥ 60 % Canadian Institution or Cult Heroes, +3 ≤ 10 %; avg bonus rate reported per band,
  all bands combined 10–50 % (Gravel Kings' higher rate accepted); each band's avg median tier within one tier of HD's.
  `NO_BONUS=1 BAND=all node tools/balance.js 10 30` equals `plan/balance_baseline_v10.txt` after `grep -v '^done in'`.
- `pw_ending` (in-page: quickStart, `noBonus`, `botWeek` to wk 239, play the last week; plus one good-bot career to wk 311 with
  bonus): every step renders, the seven parts sum to the score, member epilogues = lineup + departed originals + defectors
  (player card counted separately), no share/screenshot/download text, Back to title works, reload shows the same ending with
  one Hall of Fame entry; `v09_ended` fixture → one entry; a live (not ended) career shows the preview and writes nothing.
**Risks (E):** hidden 10-year assumptions; content leaks across bands; tier tuning noise at 30 seeds.

### Lane M: META (achievements + Hall of Fame + meta unlocks)
**Owns:** `src/12_meta.js` (after stage 0), new `src/2g_sim_achieve.js`, `src/content/achievements.js`, `src/5o_ui_trophies.js`,
`src/5q_ui_hof.js`; `src/51_ui_menu.js`, `src/53_ui_laptop.js`, `src/59c_ui_awards.js`, `src/5j_ui_creator.js`,
`src/5m_ui_logo.js`, `src/5l_ui_recap.js`, `src/2b_sim_creator.js`, `src/2e_sim_logo.js`, `src/46_render_logo.js`,
`src/content/logo.js`, `src/content/creator.js`; tests `tests/sim_achieve.test.js`, `tests/sim_meta.test.js`, `tests/pw_trophies.js`,
`tests/pw_hof.js`, `tests/sim_creator.test.js`, `tests/sim_logo.test.js`, `tests/pw_creator.js`, `tests/pw_logo.js`,
`tests/pw_recap.js`, `tests/pw_title.js`.
**Tasks:**
1. Achievements: content (§4.6 table), the sim, `award`/`has`, the meta listener, `ui.trophiesPanel`, the toast queue.
2. Hall of Fame: cap 40 / top 10, quota path, `hof` + `hof-entry` screens, the year strip, the backup code, the import flow
   (§4.5).
3. Meta unlocks (Q5): unlock derivation in `recordCareer`, palettes + 4 emblems, cross-genre parts, 🏆 chips, `meta:unlock`
   line on the end screen.
4. Perf hand-in: `46_render_logo.js` `spikes()` mask canvas `{ willReadFrequently: true }` (or edges from `measureText`).
5. Meta-only achievements (`careers`, `allBands`) in `recordCareer`.
**Acceptance (M):**
- `sim_achieve`: every row of the §4.6 table true and false on synthetic states; per-career dedupe across save/reload;
  retroactive state kinds on `career:loaded` with a v0.9 fixture, counters from 0; seat gate (a synthetic `seat: 'bass'` state
  never earns Chugging Along); bots over 6 years per band earn ≥ 5, never one gated to another band; the career RNG untouched;
  purity regex on 2g; content ids unique, no US places, per-band text has no other band's names.
- `sim_meta`: empty and blocked storage (memory fallback); quota path (strips dropped, retry, `meta:quota`); `recordCareer`
  idempotent and keeps the higher score; cap/top-10; careerId for seed 1; `exportLite` → `toCode` → `readCode` → `mergeLite`
  round trip; `metaCode` round trip with strips; the slot scan on a v0.9 fixture set (past4, ended slot recorded once);
  `bySeat.drums` counted; unlock derivation per tier/special.
- `pw_trophies`: the 10th tab wraps 5 + 5 with no horizontal scroll; `page.evaluate(() => GG.emit('ach:earned', …))` during a
  live song toasts only after it; only fresh ids toast; other bands' rows read "???"; at both sizes.
- `pw_hof`: seeded meta: title button, list, entry sheet, year strip, logo drawn, backup code shown, no share/screenshot/
  download text; meta-only code restores from the title; empty storage: no button, no errors; at both sizes.
- `pw_creator` / `pw_logo`: meta palettes/emblems/parts offered with 🏆 in every genre; HD first quickStart time reported.
**Risks (M):** localStorage headroom on the shared Pages origin; double writes from the end screen and `career:end`
(idempotent by id); save-code size.

### Lane T: TUTORIAL (sim + UI + content)
**Owns:** new `src/2h_sim_lessons.js`, `src/content/tutorial.js`, `src/5p_ui_tutorial.js`; `src/60_main.js`, `src/52_ui_week.js`,
`src/50_ui_core.js`, `src/54_ui_sequencer.js`; tests `tests/content_tutorial.test.js`, `tests/sim_lessons.test.js`,
`tests/pw_tutorial.js`, `tests/pw_flow.js`, `tests/pw_seq.js`.
**Tasks:**
1. `GG.lessons` (sim) and `GG.tutorial` (UI) per §4.7 for all four bands; triggers (`screen:open`, `ui:tab`, events), pointer
   bubbles, the `lessons` sheet, `offerSkip`.
2. `60_main.js`: replace the week-1 toast with `w1_card`/`w1_walk` (toast stays when lessons are off); `?tut=1`; `skipLessons`
   → `state.tutorial.on`; start after `calib` closes.
3. `52_ui_week.js`: testids on wrap stat rows; HUD help text "ten years to glory (more if you're quick)"; the "?" styling; HUD
   stat labels scale with Bigger text (`.hud .l`, in `/* v1.0 TUTORIAL */`).
4. `54_ui_sequencer.js`: suppress the first-Write tips while `w1_write` runs.
5. Bubbles never cover the highway and never appear during a song.
**Acceptance (T):**
- `content_tutorial` / `sim_lessons`: every lesson id present; per band every step's `who` resolves to a talker in that lineup;
  Kenji never speaks; tokens valid incl. `{instrument}` / `{drummer}`; drum words (kit, drum, sticks, snare, kick, cymbal,
  hi-hat) appear only in steps gated `seat: ['drums']`; no US places; no other band's names; a v0.9 fixture migrates to
  `tutorial.on === false`; `mark`/`done` round trip through save; per band the first gig (`career.firstGigVenue`) has setSize
  ≤ 2 and an exposure/house deal and the starter song's tempo ≤ the genre's slowest preset (a failure is a hand-over to the
  lead: venues/bands content is unowned).
- `pw_tutorial` (`?tut=1`): `tut_w1` per band (bubbles in order, each stat once at the wrap, taps reach the game, nothing during
  the song); `tut_calib` (`?calib=1&tut=1`: the first bubble appears only after calibration closes); `tut_w24` (each trigger
  once); `tut_skip` (meta `past4 = 1` → `tut-skip` on → no lessons; "?" replays one); `tut_replay` (every lesson replays); at
  both sizes.
- `pw_flow`, `pw_seq` and every existing section unchanged under automation (lessons off).
**Risks (T):** bubbles vs sheets at 390 px; lessons drifting from the UI (point at testids); the planner-sheet squeeze.

### Lane P: PERF (render + audio + graphics setting)
**Owns:** `src/40_render_core.js`, `41_render_garage.js`, `42_render_stage.js`, `43_render_van.js`, `44_render_carpet.js`,
`45_render_title.js`, `45_render_creator.js`, `src/30_audio.js`, `src/11_settings.js`, `src/5h_ui_settings.js`; `tools/perf.js`,
`tools/perf_probes/`; tests `tests/pw_perf.js`, `tests/pw_garage.js`, `tests/pw_stage.js`, `tests/pw_bands_render.js`,
`tests/sim_audio.test.js`, `tests/pw_settings.js`, `tests/pw_gig.js` (sync sections must not change).
**Tasks:**
1. Frame governor (§4.9 scene table); render listens to `screen:open/close` and sheet `tall` flags (a needed `60_main` line is a
   hand-over to T).
2. 'auto' in `P.GRAPHICS` + the Settings option, `R.nextRatio`, between-songs application, `perf:quality`.
3. Crowd LOD + cheaper festival crowd; optional Sad Dome dressing.
4. First-visit stalls: `checkShaderErrors = false` unless `navigator.webdriver` or `?debug=1`; lazy space atlas; optional warm-ups.
5. Audio: `A.voicePlan`, global cap 32, lazy pre-rendered hits, crowd warm-up on the first garage entry.
6. `matrixAutoUpdate = false` on static props where safe; `GG.debug('perf')`.
7. `tools/perf.js` (scenes, gig, tti, audio) → `tests/.cache/perf_v10.txt` with the before/after table. **Process rule** applies
   to every probe browser (own PIDs only, `finally { browser.close() }`).
**Acceptance (P):** every §4.9 gate met, report-only rows reported; `pw_perf` sections `scenes`, `governor` (mode/cap per scene
incl. the 60-fps ones, rendered/ticks ratio, previews under a tall sheet still render), `ratio` (dpr:3 context, injected frame
times, no step while a song is live), `stalls`, `audio` (spectrum + ±1 ms) at both sizes; existing caps green (`pw_garage` <
60, `pw_stage` < 80, van < 50, carpet < 60, rival spectator < 90, every band's garage ≤ HD × 1.15); `pw_shop` and `pw_stage`
green; `sync.test.js` and `pw_gig` sync/sync2/double green; `sim_audio`: `voicePlan` cap and priorities; `pw_settings`: a
fresh profile defaults to 'auto', a stored 'high' stays 'high'.
**Risks (P):** drum-sync regression (do not touch the booking path); softer image on 'auto'; SwiftShader frame rates.

### Lane Q: QA sweep (the lead, last, on the integrated branch)
**Owns:** `tests/sim_bands.test.js`, `tests/pw_bands.js`, new `tools/phoneqa.js` (port of the PERF phone-QA probe), the
`/* v1.0 QA */` CSS block.
- Full Playwright matrix (every `META_ONLY` section, new ones included) at 390×844 and `PW_VIEW=440x956`; contact sheets
  `tests/.cache/v10_sheet_390.png` / `_440.png` of the new screens; look at each once.
- `tools/phoneqa.js` on every screen: no control < 44 px, **v1.0 testids < 48 px fail** (`btn-help`, `btn-hof`, `menu-hof`,
  `menu-lessons`, `tut-skip`, `end-*`, `hof-*`, the Trophies tab, lesson bubble buttons); no horizontal overflow; nothing fixed
  under the notch or home bar; Bigger text works on the HUD.
- Leak sweep: `sim_bands` strict over endings, epilogues, lessons and achievement texts per band (`LEAK_YEARS=13`); `pw_bands`
  DOM scan of end/lessons screens; Hall of Fame and Trophies rows checked against their own `data-band`; inverse check in a HD
  career.
- Owner rules sweep: `dist/game.html` strings for US places, share/screenshot/download controls, any gong outside the Global
  Gong award.
- Storage at 13 years: save code ≤ 135k chars incl. `_meta`; slot JSON; total localStorage for 4 slots + HoF + meta (apply the
  slot-compression nice-to-have if > 1.2M chars).

### Cross-lane hand-over requests (files stay single-owner)
| from → to | request |
|---|---|
| E → M | `GG.legacy.hofEntry(state)` / `state.legacy` exactly as §4.4–4.5; M codes against a stub until E merges. |
| M → E | The end summary uses `recordCareer`'s return (`unlocks`, `ach`) and `GG.achieve.list(state)`. |
| M → T | `53_ui_laptop.js` keeps emitting `ui:tab` (stage 0 line). |
| T → E/M | Lessons point at `end`/`hof`/`trophies` testids only through `{ testid }` steps. |
| P → T | If the governor needs `60_main.js` (`covered()` with tall sheets), T applies the exact lines P supplies. |
| M (46) → P | The logo stall fix lands in M's lane; P measures it. |
| T → lead | A band whose first gig breaks A15 (venues/bands content). |
| any → lead | Constants, events, state fields, EFFECT/GATE keys for `02_contracts.js`; anything in lead-only files. |

---

## 6. Merge order and release checklist

**Merge order** (each lane rebases on the integrated branch first): 1. **P** · 2. **E** · 3. **M** · 4. **T** · 5. **Q** sweep
(lead) · 6. **one focused review pass** on the integrated branch (correctness of the bonus/final-year rule, meta idempotence,
save-code merge, governor) → fixes inline.

**Checklist:**
1. After each merge: `node tests/run.js` (SUITE ALL PASS); only lead-only files and the two shell anchors may conflict.
2. `02_contracts.js`: fold in the final ACH kinds, lesson ids, constants, events, fields; the EFFECT_KEYS fold (nice).
3. `10_save.js`: the migrate chain fills the five fields on the v0.9 fixtures and `save_v01.json`; `_meta` round trip; the
   meta-only code; an old ended save → one Hall of Fame entry.
4. Balance (background): `BAND=all node tools/balance.js 13 30` → `plan/balance_v10_all.txt`; Lane E's targets; the `NO_BONUS`
   10-year run equals the baseline (`grep -v '^done in'`); tune `content/endings.js` thresholds inline if needed.
5. Perf: `node tools/perf.js` → `plan/perf_v10.txt`; gates checked.
6. Playwright: the full matrix at both sizes (Lane Q), contact sheets viewed once.
7. Budgets: `stat -c %s dist/game.html` ≤ 4,250,000 (expect ≈ 4.1–4.15 MB); additions vs the +150 KB target reported;
   gzip reported; garage draw calls ≤ HD × 1.15; the global voice cap holds.
8. Owner rules: no USA content, no gong on the kit, no share/screenshot button, parody names, prairie tone.
9. `plan/status.md`: "What's in v1.0" (Legacy, tiers, specials, epilogues, bonus years, Hall of Fame, meta, achievements,
   tutorial, perf numbers, seat-aware hooks); APIs (`GG.legacy`, `GG.achieve`, `GG.meta`, `GG.lessons`, `GG.tutorial`,
   `R.finalAt`, `save.readCode/metaCode`, `perf:quality`, `PW_VIEW`, `NOSTRIP`); tick **D4**; close **D6** (lists in §0);
   tick Addendum 3's v1.0 item; back-burner: drop "full guided tutorial is v1.0", "epilogue lines are content-only hooks", the
   stale save-code size lines, add leftovers (HD-only title scene); Version Current = 1.0.0.0 "Glory", **Next = 1.1 "Seats"**
   (handoff Part E; re-audit `plan/plan_contract_1.1.md` at its stage 0), then 1.2 "Tuning".
10. `node build.js`, commit, PR, merge into `main`, delete lane branches and worktrees (own PIDs only). One short plain-words
    summary to the owner.

---

## 7. Critique log (two critiques: completeness, feasibility)

**Accepted** (fixed in the sections named): process rule (top, §5 P/Q); 4-agent cap, merge-not-split, Q = lead, review pass
(§5, §6); 30-seed bot numbers and per-band balance acceptance (§0, §5 E); `R.finalAt` for the tour guard, bot home weeks and
59d (§3.8, §5 E) and the no-move-after-`finalNews` rule (§4.4); `NO_BONUS` as `GG.legacy.noBonus`, `done in` excluded, v0.9
print format, fans cap 250k (§4.4, §5 E); unowned 10-year tests given to E with `noBonus` (§5 E); the 312-week draw in
`content_endings`; bonus-year content gated `minYear: 11` (§4.4); tutorial state in a DOM-free sim `2h_sim_lessons.js` and
migrate defaults at stage 0 (§3.6, §4.7); slot scan + `past4` + old ended careers + `career:end` recording (§3.7); retroactive
state achievements on `career:loaded`, counters from migration (§4.6); `pw_flow` `show('end')` preview and the old-ended path
(§4.4); stage-0 `12_meta` core with `recordCareer`'s return value (§3.7); tracker built from `g` and the Sad Dome from
`finalShowdown` (§4.1); save code with `_meta` not mutating state, `readCode`, merge after confirm, lite = top 10 ∪ newest 10,
target ≤ 135k chars (§3.6, §4.5, §5 Q); full backup via a Hall of Fame "Backup code" so Q6's "a phone backup keeps it" holds
(§4.5); quota handling (§4.5); toast only fresh (§4.6); higher score per careerId; seed-1 careerId (§4.5); exact achievement
tests incl. Big in Japan formula, km and weather counters, festival detection; `releaseAfterFlag` dropped for flag outcomes
(§4.2, §4.6); epilogue `when`s and rival tokens; pw_ending counts player card separately (§4.3, §5 E); frame-governor scene
table, render-on-change, `setPaused(false)` honoured, ratio only between songs, `R.nextRatio` pure, hard vs report-only perf
metrics, `GG.debug('perf')` (§4.9); audio spectrum check moved to pw, `voicePlan` in node (§4.9); `GG.achieve.debug`; Trophies
"???" rows and `data-band` leak scan (§4.6, §5 Q); `ui:tab` from 53, 54 to Lane T (§3.9, §5 T); `at`/`ver` stamped in 12_meta
(§4.4–4.5); in-page late-career states and v0.9 fixtures (§3.11, §5 E); balance runs in background (§3.12, §6); perf probes into
`tools/perf_probes/` (§3.12); lane outputs to `tests/.cache/` (§5); ACH kinds / lessons advisory (§3.4); CSS injected per module,
two shell anchors (§3.9); end stub moved with its helper header (§3.9); 48 px for every new control (§3.9, §5 Q); A15 first
gig + calibration order (§5 T); D6 lists in §0 and closed at merge; Q2 marked as replacing the year-10 decision; C4 difficulty
check (§5 E); heap growth report-only (§4.9); the HD-only title scene to the back-burner; size gate (§4.10).

**Rejected or changed:**
- *Re-word the popup options that sat outside locked calls (Q1b/c, Q5c, Q6b, Q7b/c):* moot. The owner picked the recommended
  option on all eight, each inside the locked space; the unchosen options are removed from this contract, not re-asked.
- *Make the slot-scan/`graphicsChosen` prefs migration for 'auto':* not needed. Settings store only keys the player changed
  (`10_save.js` L109-113), so moving `DEFAULT_SETTINGS.graphics` to 'auto' reaches the owner unless he picked a graphics option
  by hand, in which case his pick is respected.
- *Lane caps must sum to the cap (critique 1) vs caps soft with a 250 KB hard cap (critique 2):* merged: soft lane targets that
  sum to the +150 KB target the owner saw, plus a hard gate of 4,250,000 B on disk (≈ +260 KB) so a content overrun is reported
  rather than blocking, and v1.1 Seats keeps headroom under 4.5 MB.
- *Assign `25_sim_tour.js` to Lane E:* changed to stage-0 lines calling `R.finalAt` (two reads), so a large unowned sim does not
  move into a lane for two lines; 59d does move to E (its rival panel is part of the end sequence).
- *Keep the year strip in `exportLite` (≈ 1–2 KB per entry):* rejected for career codes (13-year codes already reach 113–123k
  chars); the strips travel in the separate meta backup code instead.
- *Q4 "The Original Four" bundled in the question:* already a default; no change needed now that Q4 is answered.
