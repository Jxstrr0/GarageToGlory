# v1.1 "Seats": plan contract (stage 0 done 2026-10-02 on `v1.1-seats`; owner answers in §0 LOCKED)

Repo: `/home/user/GarageToGlory`, branch `v1.1-seats` (= `main` 1.0.1.0 + the E14 answers + stage 0). Stage 0 bumped VERSION
to `1.1.0.0`. All paths are repo-relative; every `file:line` below is the CURRENT tree after the stage-0 commit.

Sources: `plan/handoff.md` Part E (E1–E14; owner decisions S1–S7), `plan/status.md` (Version, Addendum 3 decisions + pending,
APIs incl. v1.0 / v1.0.1), the 1.0 contract (format), the draft of this file (written against 0.9.0.0, now replaced), and the
stage-0 read-only audit of the 1.0.1.0 code (sims, audio, UI, render; findings in §1.4, reuse map in §2).

**Process rule (owner, every lane and the lead):** never `pkill`/`killall` Chromium, `headless_shell` or `node` by name. Track
the PIDs you launch and kill only those; close every browser you open in a `finally {}`. Chromium lives in `/opt/pw-browsers`
(never `playwright install`). Commit WIP to `wip-v11-<lane>` before any long wait. Runs over 10 minutes (balance, the full pw
matrix) go through `run_in_background` and write to a file.

---

## 0. Owner answers (LOCKED, do not re-pitch)

| # | Question | Answer (locked) |
|---|---|---|
| S1 | Who drums when you don't? | **Seat swap.** The member whose seat you take moves to the kit (E3 table, `bands.js` `seats`). Every hand-made character stays. |
| S2 | Guitar / bass on the highway | **Taps + holds**, lanes by pitch contour, long notes are holds. **Bass max 5 lanes, guitar max 6.** |
| S3 | The songwriter | **Your part + auto drums**: pick a progression (bass, rhythm) or hook (lead) per section, tap your rhythm on a 2–5 row grid; the swapped drummer suggests a groove you can tweak. |
| S4 | Roadmap | **v1.1 Seats**; Tuning moves to **v1.2**. |
| S5 | Gravel Kings rhythm | **Chase drums + sings.** Your rhythm seat is new; the band stays four. |
| S6 | Rox / Travis Lee | **They sing from the kit** (voice profiles unchanged, a mic on the riser). |
| S7 | Storylines | **3 role arcs** (Nobody Hears the Bass · The Engine Room · Solo Too Long) **+ 12 band finales**. |
| E14a | Size budget | **5.0 MB**: `dist/game.html` ≤ 5,000,000 B on disk (stripped). |
| E14b | Seat gear names / prices | **Parody names per genre, priced like the matching drum upgrades** (every seat costs the same). |
| E14c | Creator body shapes | **3–4 body shapes per string seat** (add, don't shrink). |
| E14d | Seat preview | **Tap a seat card to hear a ~3 s preview** of that seat's part from a starter song over the band (reuses the song player). |

### Defaults (taken without a popup; they stand unless the owner objects — list them in the merge summary)
- The seat is fixed for the whole career (no switching, E13). Old saves load as drummers (`seat: 'drums'`).
- `drumSkill` stays the chops stat for every seat (UI already says "Your chops"); it widens the timing window as today.
- The swapped drummer keeps driving when they are the driver (Kenji, Moth, T-Bone, Earl).
- Metal rhythm = Jaxon (the left of the double-tracked pair + the chorus ring `gtr2`); metal lead = Dana (the right + the solos).
- The title stays Hail Damage's hailstorm garage with the drummer at the kit.
- **Seat gear = the drum gear economy, renamed per seat** (§4.6): the same three item ids, prices, eras, `gigBonus`, bots and
  balance; one purchase grows your rig AND the band's kit (the swapped drummer gets the matching drum piece). Bass has no lane 6:
  its 350 item is "the fridge" (a cab, no lane). The lead's whammy comes with amp tier 2 (no extra cost). Every seat costs the same.
- **`gear.seatLanes` / `gear.runs` exist on string-seat careers only** (a drum career's `gear` stays v1.0's exact object: the
  regression baseline; §1.4 #4). Readers use `GG.career.seatLanes(state)` / `seatRuns(state)`.
- **The backing mutes whole kinds** (`'gtr'` = both double-tracked sides): your taps play your whole part, so a miss is silence (E5).
  The L/R side is only a pan hint for your voice.
- **New-career order:** title → slot → genre → intro (band card) → **seat** → logo → creator → cold open. Drums preselected.
- `{sticks}` reads "picks" on every string seat (bass too). `{instrument}` "guitar" for rhythm and lead.
- New alias `'@drummer'` = the swapped drummer (null on the drum seat, so a `'@drummer'` card never draws in a drum career).
- Seat gate keys live in `C.SEAT_GATE_KEYS` until Lane B's gate test covers them; the lead folds them into `C.GATE_KEYS` at merge.

---

## 1. Scope

### 1.1 Must (v1.1.0 "Seats", handoff E1–E12)
1. **Seat picker** (E9) between the band card and the logo: four cards (Drums / Bass / Rhythm / Lead) naming who moves to the
   kit, the stage spot, tap = select + a ~3 s preview (E14d); `seat:picked`; `GG.main.newCareer({ seat })`.
2. **Seat swap** (E3): `seatRole` per member, lineup, roles (`gig.roles` by `seatRole`: `solo` may be `'player'`, `fill` skips the
   drummer), quits/returns into the drum seat (recruit drummers from the recruit generator with a drummer flavour), the swapped
   drummer keeps id/name/wants/mood/skill/epilogue/driving.
3. **The string highway** (E5, §4.5): charts from the song's timeline, contour lanes (bass ≤ 5, guitar ≤ 6), holds, 2-lane chords
   on Hard/Expert (rhythm), runs (with run gear), difficulty thinning, two-thumb rule, the seat's spotlight, studio mode.
4. **Your sound** (E5, E9): playable voices `pluck / strum / lead` booked on the band clock with the drum-sync model (`syncSnap`);
   holds gate the note on release; the backing mutes your seat's kinds; the band's drums play from the song's drum pattern.
5. **The songwriter for string seats** (E6): "Your part" pages (progression / hook + the 2–5 row grid + one-tap modifiers), "Tell
   {drummer} what to play" (today's drum grid unchanged), the swapped drummer's suggested groove, seat signatures in `rate`, the
   recycled-part check, band reactions per seat.
6. **Storylines** (E7): three role arcs (6–8 cards each, era-gated, hints, `byBand` lines, a flag each) + 12 band finales; per
   swapped member a `bySeat` layer (4–6 Monday cards + chat lines), a week-one card each (12) and a drum-seat epilogue variant;
   the player's epilogue per seat (`endings.player.bass|rhythm|lead`).
7. **Content audit** (E8): every line of `plan/seat_audit.txt` (530 lines) tokenised, gated or left; the strict seat leak scan
   (`SEAT=all`) clean.
8. **Shop** (E4, E14b): the gear tab shows your seat's line (§4.6) with parody names per genre at drum prices.
9. **Studio** (E4): "{instrument} takes" (play one yourself on your seat's chart; the swapped drummer's takes run off chops as today).
10. **Render** (E9): string-seat stage camera from your spot, you with your instrument, the swapped drummer on the riser (boom mic
    when they sing), garage (drummer at the kit hotspot, "your rig" corner), creator "your gear" models, carpet + recap photo
    with your instrument.
11. **Creator "your gear"** (E9, E14c): body shape (3–4 per seat), colour, pickguard, headstock sticker (logo option); drums = KIT_LOOK.
12. **Seat achievements** (E12): Low End (finish a career on bass), The Engine Room (rhythm), Solo Too Long (a lead solo longer
    than the rest of the song), Musical Chairs (careers finished in all four seats; meta). v1.0's drum ones stay drum-gated.
13. **Balance** (E10): every seat within ±10 % of the drum seat on fans@y3, fund@y3 and World reach per band; live gig bots per
    seat × difficulty: perfect = 100 %, avg within 3 points of drums.
14. **Phone QA** of every new screen at 390×844 and 440×956; every existing test green unchanged (drums = regression baseline).
15. **Housekeeping:** VERSION 1.1.0.0; status.md (Version, What's in v1.1, APIs, Addendum 3 ticks); `dist/game.html` ≤ 5,000,000 B.

### 1.2 Nice-to-have (never blocks the merge)
- Seat-specific tutorial steps (string-seat variants of the drum-gated lesson steps; content only, `seat: [..]`).
- A seat chip on the HUD year chip; the Hall of Fame seat chip already exists (v1.0).
- Swapped-drummer garage idles beyond the kit hotspot (Dana's wind machine, Duke's hat vs the crash).
- The seat preview in the creator's "your gear" tab.
- Fold `C.SEAT_GATE_KEYS` into `C.GATE_KEYS` (lead, after Lane B's gate test covers them).

### 1.3 Deferred
- **v1.2 "Tuning"** (D5): the owner plays one year in each seat; money/fans retuning; the back-burner sweep; A15 first-gig tempo.
- Switching seats mid-career, a vocals / keys / fiddle seat, firing, mid-gig chaos events, a share button (E13: never).
- Extracting `GG.audio.timeline` into a sim module (back-burner; 22 reads it lazily).
- A per-band title scene (the title stays Hail Damage's).

### 1.4 What the stage-0 audit found (and how this contract resolves it)
| # | Finding (1.0.1.0 code) | Resolution |
|---|---|---|
| 1 | Rock's `gtr2` rings only in `full` (chorus) bars, one per bar; `clean` only in the ballad style (`30_audio.js:1467` BANDS.rock, `:1571` BALLAD). A rhythm chart from them is empty in verses and bridges. | Lane D writes a **rock rhythm layer** (`gtr2`: chord stabs / 8ths in verses, open chords in choruses, the riff in breaks) only when `opts.seat === 'rhythm'`. |
| 2 | There is no L/R tag: ONE `gtr` event plays both double-tracked guitars (metal `metalNote` sides 0/1 `:1115`; punk/rock `ampNote` sides 0/1 `:665`). | Metal/punk rhythm and lead both chart `gtr`; the mute is the whole kind; side = your voice's pan only (§0). |
| 3 | Country lead = `twang`: 3 notes per verse entry (licks at phrase ends), 6 per chorus, 18 in the solo; too sparse for a lead seat. | Lane D adds lead-seat licks (every bar's phrase end + chorus answers) only when `opts.seat === 'lead'`. Country rhythm = `clean` with `ev.strum` (the acoustic, `:665` country branch) is dense enough. |
| 4 | `state.gear` is deep-compared by four v1.0 tests (`sim_career.test.js:73`, `sim_shop.test.js:76`, `:341`, `sim_songs.test.js:204`). | `gear.seatLanes` / `gear.runs` on string seats only; `career.seatLanes/seatRuns` readers. |
| 5 | `sim_career.test.js:174` asserts every `C.GATE_KEYS` key has a case. | `C.SEAT_GATE_KEYS = ['seat', 'swapped']` (evaluated by `gatePasses` today); Lane B adds the cases, the lead folds the list. |
| 6 | E4 lead "+ a whammy" vs E14b "every seat costs the same"; E4 bass has two items vs the drums' three. | Whammy with amp tier 2; bass's third item = the fridge (cab, no lane). |
| 7 | E9 "after the genre card, before the logo", but the flow is genre → intro → logo (`51_ui_menu.js:203/227/253`). | Seat after the intro, before the logo. |
| 8 | Handoff E10 still says the budget is open; status says "~270 KB under 4.5 MB". | E14a locks 5,000,000 B; `tools/perf.js:555` gate updated at stage 0. |
| 9 | Role aliases + tokens resolve by content `role` (`roleOf` `20_sim_career.js:203`, `'bassist'` `:213` = `/bass/.test(m.role)`; `gig.roles` `22_sim_gig.js:332`): on the bass seat `{bassist}` would name Kenji on the drums; Dana would still "solo" from the kit. | Lane B: `roleOf` / `gig.roles` / `songs.reactions` by `seatRole`; your own role resolves to the player (`{bassist}` → "you" on the bass seat; `solo: 'player'` on lead; `fill` never the drummer). |
| 10 | `songs.sanitize` (`21_sim_songs.js:235`) builds a fresh object: a `part` would be dropped on every migrate / rate / chart. | Lane B keeps `part` through sanitize. |
| 11 | The gig UI sizes lanes by `gear.lanes` (`55_ui_gig.js:99` `lanesOf`) and colours/icons by `C.LANES` names (`:100`); the session's `byLane` / `lp` are sized by `C.LANES.length` = 6 (`22_sim_gig.js:485`). | Charts set `chart.lanes` = `seatLanes`; string notes use `lane: 'str' + li`; 55 colours per seat; 6 slots suffice. |
| 12 | Hard-coded drum words in lead/UI files: "You're the drummer. You're always the drummer." (`51_ui_menu.js:222`), "(plus you, on drums)" (`:250`), "Who's on drums?" (`:336`), SPOTS 'Drum kit' (`52_ui_week.js:610`), the garage hotspot label 'Drum kit' (`41_render_garage.js:68`), 'Drum shop' (`5k_ui_shop.js:111`), 'Drum takes' + '🥁 Play' (`59b_ui_studio.js:537/551`), the recap photo pose 'sticks' (`5l_ui_recap.js:39/68`). | Each owner swaps them by seat (tokens or `GG.career.seatOf`). |
| 13 | A recruit hired by `drama.hire` had no `seatRole`, so a save read back differently (sim_bands "read back identical"). | Stage 0: `27_sim_drama.js:556` sets it (`seatRoleFor`); Lane B makes the drum-seat hole hire a drummer. |
| 14 | The timeline already carries everything a chart needs: `midi`, `len` (beats), `gap`, `power`, `mute`, `trem`, `ring`, `strum`, `up`, `section`, `role` (`30_audio.js:1625`). | Charts filter it; no second note generator. |

---

## 2. Already works: reuse, do not rebuild (current file:line)

- **Seats (stage 0):** `GG.career.seatOf / seatSwap / swapped / seatRoleFor / lineup / drummerId / seatLanes / seatRuns / seatOk`
  (`src/20_sim_career.js:265-312`), gates `seat` / `swapped` in `GATE` (`:705`) + `cardOk` (`:380`) + `speakerOk(state, who, line)`
  (`:337`), the `'@drummer'` alias (`roleOf :203`, `ALIAS_RE`), tokens (`tokenValue :458`, `TOKEN_RE :496`, `fillText :497`),
  `newCareer({ seat })` (`:869`), `bands.js:266` `V11_SEATS`, save migrate (`src/10_save.js` v1.1 block + `seatGear`, `gearLook`).
- **Charts + session (22):** `gig.chart` `src/22_sim_gig.js:349` (stage-0 `seat` stub `:395`), `twoThumbs :252`, `doubles :275`
  (`DOUBLE_GAP` — the model for `RUN_GAP`), `DIFFICULTIES :291`, `windows :306` (chops = `drumSkill`), `thin :311`, `roles :332`,
  `session :442` (`startSong :485`, `judge :555`, `due :595` v1.0.1 smart bridge, `tick :625`, `endSong :658`), `finishLive :713`,
  `botPlay :760`, `simulate :135` (bots + balance; unchanged weights). Extend with `len/hold/chord/run`; never fork the session.
- **Songs (21):** `rate :187`, `validate :215`, `sanitize :235`, `generate :273`, `similarity :368` (reviews' recycled check),
  `toNotes :377`, `create :513`, `jam :537`, `reactions :602` (by role), `presets :675` (`content/grooves.js`), `modify`, `tempoLabel`.
- **Audio (30):** `A.timeline :1625` (pure; kinds `drum gtr gtr2 bass lead fiddle clean twang vox bvox`; `writer :1357`, `BANDS :1467`,
  `SOLOS :1543`, `BALLAD :1571`, `KIND_RANK :1585`, `ringBar :1589`), `player :1693` / `A.play :1762` (opts `at`, `section`, `bars`,
  `loop`, `songId`, `soloist`, `singer`), `A.hit :1785` (booked taps, choke per lane), `A.hitCancel :1885`, `metalNote :1115`,
  `ampNote :665`, `playNote :1156`, `book :757` + the voice cap (`A.voicePlan :94`), `A.soloFor :1277`, `A.voiceFor :1294`,
  `rolesOf :1272` (reads `gig.roles`), `A.noodleFor :2593`, stage-0 `A.seatKinds :1773` + voice stubs. Drum sync:
  `GG.prefs.syncSnap / syncWhen` (`src/11_settings.js`), the booking path `55_ui_gig.js:640` `playTap`, the pump `:548`.
- **Gig UI (55):** `ui.playGig :259` (studio mode `opts.studio`), `KEYS :49`, `lanesOf :99`, `laneColor :100` (+ colourblind),
  lefty `col()`, `pump :548` (auto notes + second kicks on the band grid), `onDown :592` (v1.0.1 bridge via `ses.due`), `tap :622`,
  `playTap :640`, `G.lanes :667`, `draw :704`.
- **Songwriter (54):** `ui.define('seq') :322`, `save :311`, guided flow `buildGuided :499` (preset cards from `songs.presets`),
  sketch mode = the kit hotspot (`D.mode 'sketch'`).
- **Shop:** `GG.shop.ensure :113`, `gearName :172` (`names[genre]`), `canBuyGear :174`, `buyGear :183`, `gearItems :194`,
  `kitTiers :220`, `gigBonus :239`, `botWeek :940` (`src/2a_sim_shop.js`); content `src/content/shop.js` `gear` (toms 450 lane 5,
  ride 350 lane 6 needs toms, pedal 300) + `kit` (0 / 800 / 2,800 / 9,000); UI `ui.define('gear')` `src/5k_ui_shop.js:107`.
- **Studio:** `L.takeScore` `src/24_sim_labels.js:485` (chops), `L.recordTake :493`; `ui.playTake` `src/59b_ui_studio.js:503`.
- **Drama:** `drama.roles :92`, `holder`, `holes :100`, `lineup`, `hire :546` (stage-0 `seatRole :556`) in `src/27_sim_drama.js`.
- **v1.0 seat hooks (E12, unchanged):** epilogue `when.seatRole` `src/2f_sim_legacy.js:277`, player epilogue by seat `:315`, HoF
  `seat` `:367` / `src/12_meta.js:122`, `META.careers.bySeat` `:150`, achievement seat gate `src/2g_sim_achieve.js:27-31`, lesson
  and step seat gates `src/2h_sim_lessons.js:22/92`, `{instrument}` / `{drummer}` in `src/content/tutorial.js` (16 audit lines,
  11 already `[gated]`).
- **New-career flow (51):** `genre :203` → `intro :227` (`btn-intro-next :253` opens `ui.openLogo`) → `creator :274` →
  `GG.main.newCareer :329` → `coldopen`. `GG.main.newCareer` / `quickStart` (`src/60_main.js:111/121`) pass `seat`; `?quick=1&seat=`.
- **Render:** stage `A.setup :191`, `resolve :246` (stage-0 `seat :264`), spots by role `:862`, `CAM :1328`, the drummer look
  `:1098`, the kit look `:344`, `info :1962` (`src/42_render_stage.js`); garage hotspots `src/41_render_garage.js:68` ('kit') and the
  player's drum pose `:721/:828`; `R.gearOf` `src/40_render_core.js:1129` + `guitarParts :1040`; carpet roster
  `src/44_render_carpet.js:305`; creator preview modes `src/45_render_creator.js:6/21`; recap photo `src/5l_ui_recap.js:39/68`.
- **Tokens in the UI:** `ui.tokens` / `ui.fill` `src/50_ui_core.js:431-460` (stage 0 added the drum-seat fallbacks).
- **Conventions:** `tests/_load.js` SIM_SAFE (30_audio is NOT loaded in node: tests evaluate it with `new Function` like
  `sim_audio.test.js` / `sim_seats.test.js`); content loads alphabetically before `zz_band_*`; migrations chain onto
  `GG.save.migrate`; `GG.registerDebug`; sim purity (no `Math.random`, no `Date`); CSS injected per module.

---

## 3. Stage 0 (lead, one commit on `v1.1-seats` before the lanes fork) — DONE

1. **Audit** (read-only, 1.0.1.0): sims 20/21/22/2a/24/27/59b/2f/2g/2h/12, audio 30 (event kinds per genre measured with the real
   timeline at three tempos per genre + solo/outro sections), UI 51/54/55/5k/5j/5p/52/50/60, render 40–46 + 5l. Findings: §1.4.
2. **`VERSION` = `1.1.0.0`.**
3. **`src/02_contracts.js`:** `C.SEATS`, `C.SEAT_MAX_LANES { drums: 6, bass: 5, rhythm: 6, lead: 6 }`, `C.SEAT_KINDS` (confirmed,
   §4.7), `C.SEAT_TOKENS`, `C.TOKENS += gear sticks yourPart seat`, `C.ROLE_ALIASES += '@drummer'`, `C.SEAT_GATE_KEYS`,
   `C.GEAR_SHAPES`, `C.GEAR_GUARDS`, `C.GEAR_LOOK`; the V1.1 SEATS block (state, PART, NOTE additions, APIs, stubs); events
   `gig:hold`, `seat:picked`. `C.SAVE_SCHEMA` stays 10.
4. **`src/10_save.js` migrate** (fill when missing, never overwrite, no events): `seat` → 'drums' (unknown → 'drums');
   `members[].seatRole` = `GG.career.seatRoleFor` (= role on drums); string seats: `gear.seatLanes { bass, rhythm, lead }` (4, clamped
   4..max) + `gear.runs` (false); `player.gearLook` keys from `C.GEAR_LOOK`. `save.seatGear`, `save.gearLook` exported.
5. **`src/20_sim_career.js`:** `newCareer({ seat })` (same defaults as migrate), the seat helpers (§2), the six tokens (drums:
   `drums / you / kit / sticks / the beat / drums`, exactly v1.0), gates `seat` / `swapped` (drum seat: `swapped` true / an id never
   matches; `swapped: false` = nobody), `cardOk` (top level or gate, cameo cards too) and `speakerOk(state, who, line)`, `'@drummer'`.
6. **`src/27_sim_drama.js:556`:** a hired recruit gets `seatRole` (one line; Lane B owns 27 from here).
7. **`src/content/bands.js:266`:** the E3 table `seats` per band (Lane A owns the file from here).
8. **Stubs:** `gig.chart(song, { seat })` = the drum chart + `chart.seat`, `chart.stub` (`22:395`); `GG.audio.seatKinds`,
   `pluck / strum / lead / release` → null (`30:1773`); `GG.render.stage.setup({ seat })` stored, `info().seat` (`42:264`);
   `GG.main.newCareer / quickStart({ seat })`, `?quick=1&seat=bass` (60); `ui.tokens` drum fallbacks (50).
9. **Tools:** `tools/seat_audit.js` → `plan/seat_audit.txt` (530 lines, counts below); `tools/make_fixtures_v10.js` →
   `tests/fixtures/v10_recruit.json.gz` (a genuine 1.0.1.0 Ramblers save, y4 w7, Travis quit, a recruit on vocals/acoustic; made
   BEFORE any v1.1 edit); `tools/perf.js` size gate 5,000,000.
10. **Tests:** new `tests/sim_seats.test.js` (8: contracts, the 4 × 4 swap table, newCareer per band × seat, lineup, tokens, gates,
    the chart stub, seat kinds vs the real timeline); `tests/save.test.js` +2 (v0.9 ×3 + v1.0 + v0.1 fixtures migrate as drummers,
    idempotent, rng untouched, no events; string-seat fill, never overwrite, clamp; seat through code + slot). Every existing test
    unchanged and green.
11. **Results:** `node build.js` → 4,247,084 B on disk; `node tests/run.js` SUITE ALL PASS (29 files); drum regression: 8 seeded
    3-year bot careers (4 bands × avg/good) byte-identical to 1.0.1.0 apart from the new seat fields; Playwright at 390×844:
    `pw_flow flow` 16/16, `pw_gig gig` 32/32 + `sync` 14/14 + `bridge` 17/17, `pw_bands hail_damage` 58/58; `PW_VIEW=440x956
    pw_flow flow` 16/16. (`sync`'s "early taps" check failed once inside the 3-section run — one hit record read −94 ms instead of
    −45 ms — and passed twice alone; stage 0 does not touch the booking path. Same class as v1.0's noted load flakes.)

**`plan/seat_audit.txt` — lines per file (Lane A reports its decision counts against these):**
zz_band_grid_road_ramblers 94 · zz_band_frost_heave 58 · cards 55 · zz_band_gravel_kings 55 · grooves 29 · lines 24 · world 23 ·
album_words 22 · bandbook 21 · road_cards 18 · shop 16 · tutorial 16 (11 already gated) · genres 14 · reviews 14 · rivals 12 ·
venues 11 · endings 8 · bands 7 · recruits 7 · drama 5 · creator 4 · calendar 3 · labels 3 · awards 2 · map 2 · npcs 2 · recap 2 ·
achievements 1 · licensing 1 · song_titles 1 — **TOTAL 530**.

---

## 4. Shared contract (every lane codes against this)

### 4.1 State (02_contracts V1.1 SEATS; migrate defaults at stage 0; `newCareer` starts with the same values)
```
state.seat: 'drums'|'bass'|'rhythm'|'lead'            fixed at newCareer (args.seat); old saves 'drums'
state.members[i].seatRole: string                     'drums' | 'drums/vocals' (the swapped member; a singer keeps singing)
                                                      | role. Content `role` stays the source of truth for wants, quits, recruits.
state.gear.seatLanes: { bass 4..5, rhythm 4..6, lead 4..6 }   state.gear.runs: { bass, rhythm, lead }: bool
                                                      STRING SEATS ONLY (drum gear = v1.0's object); read via career.seatLanes /
                                                      seatRuns (drums: gear.lanes / gear.doubleKick)
state.player.gearLook: { shape, color, guard, sticker } (C.GEAR_LOOK; null shape = the seat's first shape, country rhythm
                                                      'acoustic'; null colour = the kit colour). Drums keep player.kit.
state.flags.bassArc 'legend'|'secret'|'quiet' · rhythmArc 'credited'|'unsung'|'engine' · leadArc 'guitarHero'|'bandFirst'|'soloAlbum'
song.pattern.part?: PART                              string seats only; drum-seat songs never carry one
```

### 4.2 Seats, the swap, the lineup, roles
- `bands.<id>.seats` (E3): HD bass kenji · rhythm jaxon · lead dana; FH moth · rox · benny; GK tamara · **chase** · lenny; GRR duke ·
  travis · earl. Drums → nobody. Clementine and Marcel never move.
- `career.seatRoleFor(state, m)`: the swapped member → `'drums/vocals'` when their role sings (Rox, Chase, Travis), else `'drums'`;
  everyone else → `role`. `career.lineup(state)` → `[{ id: 'player', seatRole: seat }, …active members]` (band size never changes).
- **Lane B:** `gig.roles(state)` reads `seatRole`: `front` = the singer (a singing drummer can still front: Rox, Chase, Travis),
  `solo` = the lead-guitar `seatRole` member or **`'player'`** on the lead seat (fiddle after it as today), `fill` = the rhythm /
  fiddle / bass `seatRole` member, never the drummer, `'player'` never; `drummer` = `career.drummerId(state)` or `'player'`.
  `roleOf('@bassist' | '@soloist' | '@filler')` by `seatRole`; the player's own seat resolves to the player (the token reads
  "you"). `songs.reactions` by `seatRole`. `A.soloFor(genre, 'player')` → the seat's own solo kind (Lane D).
- **Quits / returns (Lane B, 27):** the swapped drummer quitting leaves the hole `'drums'`: fill-ins and recruits for that hole are
  drummers (`recruits.js` drummer flavour pool, Lane A); hired → `seatRole 'drums'`, content role 'drums'. A returning swapped
  member goes back to the drums (`seatRole` kept). The player's seat never becomes a hole.

### 4.3 Tokens, gates, aliases (stage 0 implements; Lane A writes against them)
| token | drums (= v1.0) | bass | rhythm | lead |
|---|---|---|---|---|
| `{instrument}` | drums | bass | guitar | guitar |
| `{gear}` | kit | bass rig | rig | rig |
| `{sticks}` | sticks | picks | picks | picks |
| `{yourPart}` | the beat | the bass line | the riff | the lead |
| `{seat}` | drums | bass | rhythm guitar | lead guitar |
| `{drummer}` | you | Kenji · Moth · Tamara ("T-Bone") · Duke | Jaxon · Rox · Chase · Travis Lee | Dana · Benny · Lenny · Earl |
`{drummer}` on a string seat = whoever is on the kit now (`career.drummerId`: a returning member or a drummer recruit too); nobody
on the kit → "the drummer".
- Gates (card `gate`, card top level, a line `{ who, text, seat?, swapped? }`): `seat: [seats]`; `swapped: memberId | [ids] | true |
  false`. `career.gatePasses` evaluates both; `career.cardOk` checks the card's top level AND its gate (cameo cards too);
  `career.speakerOk(state, who, line)` checks the line. Lane A: content.test accepts `C.GATE_KEYS.concat(C.SEAT_GATE_KEYS)` and the
  top-level `seat` / `swapped` card keys; lines that list speakers go through `speakerOk(state, who, line)` (Lane B wires every
  line picker that reads `who`: `postChat`, `ui.presentLines`, `songs.reactions`, `drama` lines).
- `'@drummer'` (speaker, chat `who`, mood/skill keys) = the swapped drummer; null on drums → such a card never draws there.
- The rule for content (E8): a line aimed at the player that uses drum words → tokenise or `seat: ['drums']`; a line about the band's
  drums in general → leave; a line about the swapped drummer → `swapped: true` / `'@drummer'` / `{drummer}`.

### 4.4 PART and the songwriter (Lane B; data shapes for A and D)
- `PART = { seat, sections: { <name>: { prog?: int, hook?: int, rows: [16-char 'x'/'.'] } } }`: rows = bass 3 (root, fifth,
  octave), rhythm 2 (chug = palm-muted, open = ringing; both = an accent chord), lead 5 (the hook's scale degrees low → high).
  `prog` indexes `backing.progressions[section]` (bass, rhythm); `hook` indexes `backing.hooks[section]` (lead; Lane D adds
  `hooks` to `content/genres.js` with plain-words names, e.g. "dark and slow", "the big chorus lift"). Extra sections (outro,
  solo) follow `gear.sections` like drum sections.
- `songs.sanitize` keeps `part` (rows clipped/padded to 16 and to the seat's row count, indexes clamped); `songs.part.suggest(genre,
  seat, section, rng?)` → a section (deterministic without rng); missing sections are suggested; `songs.rate` reads `part` (seat
  signatures per genre: metal rhythm chugs locked to the kick, punk rhythm steady 8ths, rock lead a hook repeated in the chorus,
  country bass root–fifth on 1 and 3; hook contrast and difficulty count your part); `songs.similarity` compares parts too.
- UI (54): for a string seat, write mode = drums first (the swapped drummer's suggested groove = a genre signature preset; "Tell
  {drummer} what to play" opens today's grid unchanged) → "Your part" per section (prog/hook cards + the grid + one-tap modifiers:
  lock to the kick, double time, let it ring, call and answer) → tempo → order → name → save. Coach lines per seat from
  `content/grooves.js` (Lane A). The drum seat's songwriter is unchanged (pw_seq green as is).
- Bots and jams write a part via `songs.part.suggest` (deterministic per song id; never the career RNG).

### 4.5 Charts: the string highway (Lane B; 22 + 55)
`gig.chart(song, { seat, lanes, runs, difficulty, doubles, solo, extras, free, thumbs })`; `seat` missing or 'drums' → exactly
today's chart (no new keys). For a string seat:
1. **Source:** `GG.audio.timeline(pattern, { genre, songId: song.id, seat, part: pattern.part, drums: false, vocals: false })`
   events whose kind is in `GG.audio.seatKinds(genre, seat)`; times `t = beat × spb` like drum notes. 22 reads `GG.audio` lazily;
   without `GG.audio.timeline` (a node sim without 30) the chart is the drum chart with `stub: true` (tests load 30 like
   `sim_seats.test.js`).
2. **Contour lanes:** per arrangement entry, the distinct pitches the seat plays (a chord's root `midi`) sorted low → high, spread
   over `L = lanes || career.seatLanes(state)` lanes (`n ≤ L`: lane = round(i × (L − 1) / max(1, n − 1)), one pitch → the middle
   lane; `n > L`: lane = floor(i × L / n)). Same pitch = same lane within the entry; deterministic, no rng. Lanes run low → high,
   left → right (lefty mirrors). Bass's 5th lane adds range at the bottom, guitar's 5th/6th at the top. NOTE `lane: 'str' + li`.
3. **Holds:** sounding length `min(len, gap)` ≥ 1 beat (Easy ≥ 2 beats) → `hold: true`, `len` in seconds. The head is judged like a
   tap. While held: sustain points tick and the note sounds; an early release only gates the sound (no miss, no combo break);
   held ≥ 90 % = the ring bonus; a new head in the same lane ends the hold. Session API: `S.release(lane, t)` (pure judgement; emits
   `'gig:hold' { lane, held, ring }`); `S.due` unchanged for heads.
4. **Chords (rhythm):** Hard/Expert: a power chord whose root and fifth land on different lanes may be a 2-lane chord
   (`chord: [li, li2]`, one note for accuracy, both lanes tapped within the window). Easy/Normal: single lane.
5. **Runs:** repeats of the same pitch with onsets ≤ `gig.RUN_GAP` (0.18 s, same idea as `DOUBLE_GAP`) merge into one hold note
   `{ run: true, t2 }` when `runs` (the seat's run gear) is true: hold it and the run plays on the band grid; release stops it.
   Without the gear the run is thinned to its on-beat onsets. One note for accuracy/combo.
6. **Thinning:** the `DIFFICULTIES` table applies by lane index (Easy laneGap 0.42 s every lane, anyGap 0.24; Normal 0.16 / 0.08;
   Hard / Expert as written); a hold or run counts at its head.
7. **Two thumbs:** never more than 2 judged heads at a moment, and a held note occupies a thumb (no 2-lane chord starts under a hold).
   Dropped notes → `chart.auto` (played by the live gig through your voice, never judged).
8. **Spotlight / laying back:** lead seat: in `solo`-role bars only the solo kind is charted (dense), the last bar is a free shred
   window (taps score like drum fills); other kinds there → auto. Bass/rhythm: someone else's solo bars keep one note per beat
   (roots / sustained chords), like the drums' `soloStep`. Free windows otherwise mirror the drums' (bridge's last bar, the outro).
9. **Perfect bot = 100 %:** `gig.botPlay` presses heads and holds them to the end (runs too) at accuracy 1 → accuracy 1.0, no stray,
   on every seat × difficulty × band; avg bot (0.9, 40 ms) within 3 points of the drum seat's average song score.
10. **Studio mode** works unchanged (`ui.playTake` on your chart; "{instrument} takes").

### 4.6 Shop: the seat gear line (Lane B sims/UI, Lane A names; E14b)
| economy id (unchanged) | price / era | drums | bass | rhythm | lead |
|---|---|---|---|---|---|
| `toms` | 450 garage | lane 5 (toms) | lane 5 (5-string) | lane 5 (neck) | lane 5 (jumbo frets) |
| `ride` (needs `toms`) | 350 garage | lane 6 (ride/china) | the fridge (8×10 cab, no lane) | lane 6 (7th string / 12-string) | lane 6 (24 frets) |
| `pedal` | 300 garage | double kick | fast fingers (runs) | fast picking (runs) | shred picks (runs) |
| kit tiers 0–3 | 0 / 800 / 2,800 / 9,000 | kit | amp tier | amp tier | amp tier (tier 2 adds the whammy: bends score a bonus) |
- One purchase sets both: `gear.owned` / `gear.lanes` / `gear.doubleKick` exactly as today (the band's kit grows; the swapped drummer
  gets the matching drum piece: a chat line) AND `gear.seatLanes[seat]` (5 / 6, capped by `C.SEAT_MAX_LANES`) / `gear.runs[seat]`.
  `gigBonus`, `botWeek`, merch, balance unchanged. `gearItems` / `kitTiers` names come from content
  `shop.gear[i].bySeat[seat] = { name, names: { <genre>: name }, blurb }` and `shop.kit[i].bySeat[seat]`.
- **Name proposals** (Lane A may replace them with equally parody names; no real brands): bass — Low B of Doom (metal), Five-String
  (Duct-Taped) (punk), The Thunder-Plank V (rock), The Five-String Boomer (country); fridge — The Cryo-Fridge 8×10 / A Church-Basement
  Fridge Cab / The Walk-In Freezer / The Grain-Bin Cab; fast fingers — Gallop Finger Tape / Downstroke Wrist Brace / Slap-Happy Tape /
  Walking-Boots Finger Picks. Rhythm — The Drop-Tune Neck / Fresh Strings, All Six / The Big Chord Neck / The Capo of Destiny; lane 6 —
  Seven-String of the Abyss / A Second Pickup (Unwired) / The Twelve-String Shimmer / Nashville Strings; runs — The Chug Glove / The
  8th-Note Wristband / Turbo Shark-Fin Picks / Boom-Chick Thumb Pick. Lead — Jumbo Frets of Woe / Frets Filed Flat / The Fret Job
  Supreme / Earl-Approved Frets; lane 6 — Twenty-Four Frets of Fury / The Extra Fret Nobody Uses / Dive-Bomb Neck / The Pedal-Steel
  Wannabe; runs — Shred Picks / Fast Picks (Stolen) / The Sweep Kit / Chicken-Pickin' Picks. Amp tiers per seat: Practice Amp With
  the Hum → Pawn Shop Combo → The Maple Leaf Stack → The Arena Rig.

### 4.7 Audio (Lane D; 30 + `content/genres.js` backing tables)
**Confirmed kinds (`C.SEAT_KINDS`, measured on the real timeline):**
| genre | drums | bass | rhythm | lead |
|---|---|---|---|---|
| metal | drum | bass (doubles every guitar hit) | gtr + gtr2 (Jaxon: the double-tracked pair + the chorus ring) | gtr + lead (Dana: the pair + the solo arps) |
| punk | drum | bass | gtr (Rox) | gtr + lead (Benny: the pair + the two-chord break, `lead` with `power`) |
| rock | drum | bass | gtr2 + clean (**new seat**: Lane D's rhythm layer under `opts.seat`; today gtr2 = chorus ring, clean = ballad) | gtr + lead (Lenny) |
| country | drum | bass (boom-chick / train walk) | clean (Travis: the acoustic strum, `ev.strum` [0,4,7]/[0,7], `ev.up`) | twang (Earl; + lead-seat licks under `opts.seat`) |
`fiddle` stays Clementine's (never a seat); `vox`/`bvox` stay the singer's.
- `A.timeline(pattern, opts)` adds `opts.seat` (seat layers: rock rhythm, country lead; **never** without it), `opts.part` (your
  written part replaces the generated events of your kinds), `opts.mute: [kinds]` (playback skips them; the timeline still lists
  them, so charts and mutes agree). Without these opts the timeline is byte-for-byte today's (sim_audio + sync green unchanged).
- `A.pluck(midi, when, o) / A.strum(midi, when, o) / A.lead(midi, when, o)` → handle (bass / chord + strum / lead voice; `o = { len,
  hold, kind, power, mute, strum, up, bend, chord }`), `A.release(handle, when)` gates a hold; booked on the band clock exactly like
  `A.hit` (the 55 drum-sync path, `syncSnap` ±15 ms, never before the lane's last booking); taps never dropped by the voice cap
  (class 'tap'); the swapped drummer = the timeline's drum events through today's synth; `A.hitCancel` also cancels booked seat notes.
- `A.seatPreview(bandId, seat)` (E14d) → handle: ~3 s (2 bars) of the band's first starter song's chorus with the seat's kinds
  +6 dB and the rest −6 dB (drums: the drum kinds), stops itself; one at a time; null without Web Audio.
- `A.soloFor(genre, 'player')` → the seat's solo voice; garage noodle by seat (`A.noodleFor` plays your instrument when the player
  is a string seat).
- Voice caps hold (`A.VOICES` cap 32; a held note is one voice).

### 4.8 Render (Lane C; 40–46 + the creator vertical + the recap photo)
- **Stage:** `stage.setup({ ..., seat, lineup })`; drums = today's behind-the-kit camera (unchanged pixels and budgets). String
  seats: a low over-the-shoulder camera from your spot facing the crowd (bass stage-left, rhythm stage-right, lead front-left beside
  the singer), you with your instrument (`player.gearLook`), the swapped drummer on the riser (`GG.creator.stageLookFor`), a boom mic
  when their `seatRole` is `'drums/vocals'`; `stage.hit('str' + li)` strums your instrument; spectator/BotB views unchanged.
  `info()` adds `seat`, `view` ('kit' | 'spot'), `drummer` (id). Draw calls ≤ HD drum stage × 1.15; no per-frame allocations.
- **Garage:** the swapped drummer idles at the kit hotspot; the 'kit' hotspot label = "Your rig" on string seats (opens the
  songwriter as today); your character noodles your instrument in the amp corner. ≤ HD × 1.15 draw calls.
- **Creator:** "Your gear" tab for string seats (body shape `C.GEAR_SHAPES[seat]`, colour from the kit swatches, `C.GEAR_GUARDS`,
  sticker none | logo); drums = KIT_LOOK as today; the preview's 'gear' mode; `GG.creator.sanitizeGearLook`.
- **Carpet + recap photo + van:** your instrument in hand (the v0.9 sticks pose only for drums); the title scene unchanged.

### 4.9 APIs and events (as stage 0 ships them; lanes append their real ones here at merge)
```
GG.career.seatOf(state) · seatSwap(bandId, seat) -> memberId|null · swapped(state) · seatRoleFor(state, m) · lineup(state)
  -> [{ id, seatRole }] · drummerId(state) · seatLanes(state) · seatRuns(state) · seatOk(state, x) · speakerOk(state, who, line)
GG.career.newCareer({ ..., seat }) · GG.main.newCareer / quickStart({ ..., seat }) · ?quick=1&seat=bass
GG.gig.chart(song, { seat, lanes, runs, difficulty, doubles }) -> notes + { lane: 'str'+li, len, hold, chord, run, t2, midi, kind }
GG.gig.RUN_GAP · S.release(lane, t) · GG.gig.roles(state) -> { front, solo ('player' ok), fill, drummer }
GG.songs.part.suggest(genre, seat, section, rng?) · songs.rate / sanitize / similarity read part
GG.audio.timeline(pattern, { ..., seat, part, mute }) · seatKinds(genre, seat) · pluck|strum|lead(midi, when, o) -> handle
  · release(handle, when) · seatPreview(bandId, seat) -> handle
GG.render.stage.setup({ ..., seat, lineup }) ; stage.info().seat / view / drummer
GG.ui.openLook({ ..., seat }) (5j "Your gear") ; ui screen 'seat' (51)
events: 'gig:hold' { lane, held (0..1), ring }   'seat:picked' { seat, swapped }
```

### 4.10 Balance (Lane B; `tools/balance.js`)
`SEAT=drums|bass|rhythm|lead|all BAND=all node tools/balance.js 6 10` (and 30 seeds, background): per band × seat fans@y3,
fund@y3, World week; **every seat within ±10 % of the drum seat** of the same band (a seat is flavour, not a difficulty). With
`SEAT` unset (= drums) the output equals `plan/balance_baseline_v10.txt`-style runs of 1.0.1.0 (`NO_BONUS=1 BAND=all node
tools/balance.js 10 30`, `grep -v '^done in'`). Live gig bots (node, 30 loaded): perfect = 100 % on every band × seat ×
difficulty; avg within 3 points of drums.

### 4.11 Size budget
- Measure `stat -c %s dist/game.html` (bytes on disk, stripped). Stage 0: **4,247,084 B**. **Hard gate 5,000,000 B** (E14a;
  `tools/perf.js` checks it). Soft lane targets (report before/after stripped bytes): A +350 KB, B +120 KB, C +90 KB, D +60 KB,
  lead +40 KB (= +660 KB, ≈ 4.91 MB). An overrun under the gate is reported, not a blocker.

---

## 5. Lanes (4 agents max; isolated copies; each copies back only its own files; never publish)

**Lead-only files:** `src/00_shell.html`, `src/01_ns.js`, `src/02_contracts.js`, `src/10_save.js`, `src/11_settings.js`,
`src/12_meta.js`, `src/50_ui_core.js`, `src/51_ui_menu.js`, `src/52_ui_week.js`, `src/53_ui_laptop.js`, `src/60_main.js`, `build.js`,
`VERSION`, `index.html`, `dist/*`, `plan/*`, `tools/seat_audit.js`, `tools/make_fixtures_v10.js`, `tests/_load.js`, `tests/run.js`,
`tests/_t.js`, `tests/_pw.js`, `tests/save.test.js`, `tests/build.test.js`, `tests/sim_meta.test.js`, `tests/pw_flow.js`,
`tests/pw_bands.js`, `tests/pw_title.js`, new `tests/pw_seats.js`. Unowned files (23, 25, 26, 28, 29, 2c, 2d, 2e, 2f, 2h,
56–59, 59c, 59d, 5g, 5h, 5i, 5m–5q, …) are hand-overs to the lead. Lanes write reports to `tests/.cache/`; the lead copies them
into `plan/`.
**Every lane:** the process rule; content tokenised, no USA content, parody names only, no gong on the drum kit, no share/
screenshot/download control; every new control ≥ 48 px; a "no console errors" assertion in every pw section; every new pw section
green at 390×844 and `PW_VIEW=440x956`; new modules inject their own CSS; new state fields come from stage 0's migrate (lanes chain
only logic backfills onto `GG.save.migrate`); **the drum seat is the regression baseline: every existing test stays green unchanged
(a lane that must change an existing test asks the lead first).**

### Lane A — CONTENT
**Owns:** `src/content/*` except `genres.js` (D); tests `tests/content.test.js`, `tests/content_bands.test.js`,
`tests/content_endings.test.js`, `tests/content_tutorial.test.js`, `tests/sim_bands.test.js` (the `SEAT=` leak scan), new
`tests/content_seats.test.js`.
**Tasks:**
1. `bands.js`: per band `seatLines = { drums, bass, rhythm, lead }` (the picker card's "who moves" line: "Kenji takes the drum throne.
   He did not say yes. He did not say no."); per swapped member `bySeat` idles/garage lines; `recruits.js` a drummer flavour pool.
2. The three arcs (E7) as chains (6–8 cards, era gates, hints, `byBand` lines in every card, `seat: [..]` gates, flags `bassArc` /
   `rhythmArc` / `leadArc`) + 12 band finales; 12 week-one swapped-drummer cards ("{drummer} has never played drums. They have a
   week."); 4–6 `swapped` Monday cards per swappable member (12 members) + chat lines; `endings.player.bass|rhythm|lead` per tier;
   swapped-drummer epilogue variants (`when.seatRole: 'drums'`, e.g. Kenji: "a new drum kit arrives every Christmas").
3. Work through `plan/seat_audit.txt`: tokenise / gate / leave each line; report the decision counts per file (vs §3's counts).
4. Shop names (§4.6, `bySeat`), creator part names for `C.GEAR_SHAPES` / `C.GEAR_GUARDS` (`creator.js`), coach lines per seat in
   `grooves.js`, the seat achievements (Low End, The Engine Room, Solo Too Long, Musical Chairs; kinds from Lane B).
**Acceptance (A):** `content_seats`: 3 arcs walk to an end flag in a synthetic run per band, 12 finales (one per band × string seat),
every swapped member has a `bySeat` layer + week-one card + epilogue variant, tokens/gates valid, no USA, no other band's names;
`content.test` accepts the seat gates; `SEAT=all LEAK_YEARS=10 node tests/sim_bands.test.js` strict and clean (no drum vocabulary
aimed at a non-drum player: the audit regex of `tools/seat_audit.js` on the resolved text of every card/line a bass/rhythm/lead
career sees, minus `[left]` lines Lane A lists); `node tools/seat_audit.js` re-run and the per-file decisions reported; every
existing content test green.

### Lane B — SIMS + GAMEPLAY UI
**Owns:** `src/20_sim_career.js` (after stage 0), `src/21_sim_songs.js`, `src/22_sim_gig.js`, `src/24_sim_labels.js`,
`src/27_sim_drama.js`, `src/2a_sim_shop.js`, `src/2g_sim_achieve.js`, `src/54_ui_sequencer.js`, `src/55_ui_gig.js`,
`src/59b_ui_studio.js`, `src/5k_ui_shop.js`, `tools/balance.js`; tests `tests/sim_seats.test.js`, `tests/sim_career.test.js`,
`tests/sim_gig.test.js`, `tests/sim_songs.test.js`, `tests/sim_shop.test.js`, `tests/sim_labels.test.js`, `tests/sim_drama.test.js`,
`tests/sim_achieve.test.js`, `tests/pw_gig.js`, `tests/pw_seq.js`, `tests/pw_shop.js`, `tests/pw_label.js`.
**Tasks:** §4.2 roles/aliases/tokens by `seatRole` + quits/returns into the drum seat; §4.4 PART + sanitize + rate + similarity +
`part.suggest` + the "Your part" songwriter; §4.5 charts + the session (holds, chords, runs, `S.release`, `'gig:hold'`) + botPlay;
55: holds/chords/runs drawing, lane colours per seat, `lanesOf` → `career.seatLanes`, your taps → `GG.audio.pluck/strum/lead` on the
drum-sync path, the band's drums from the timeline; §4.6 shop (sims + the seat tab, "Drum shop" → "{instrument} shop"); studio
"{instrument} takes"; seat achievement kinds (2g); arc flags plumbing; `tools/balance.js` `SEAT=`; fold-ready gate cases in
`sim_career` "every gate key evaluates" (`seat`, `swapped`).
**Acceptance (B):** `sim_seats` grows to: roles per band × seat; quits/returns (the drum-seat hole, a drummer recruit, the return);
PART sanitize/rate/similarity/suggest determinism; charts per band × string seat × difficulty: only seat kinds, lane ≤ cap, same
pitch = same lane per entry, holds/chords (Hard+ only)/runs (gear only), two-thumb rule incl. holds, thinning, spotlight; the perfect
bot 100 % on every band × seat × difficulty, avg within 3 points of drums; a 3-year bot career per band × seat with no exceptions;
determinism. Every existing sim test unchanged. `pw_gig` new sections `seat` (a bass and a lead gig at 390 + 440: holds drawn,
release gates, no console errors) + every existing section green (sync, sync2, double, bridge unchanged); `pw_seq` `part`; `pw_shop`
`seat`; balance per §4.10 (`plan/balance_v11_seats.txt` via the lead).

### Lane C — RENDER (+ the creator vertical, the recap photo)
**Owns:** `src/40_render_core.js`, `src/41_render_garage.js`, `src/42_render_stage.js`, `src/43_render_van.js`,
`src/44_render_carpet.js`, `src/45_render_creator.js`, `src/45_render_title.js` (unchanged), `src/46_render_logo.js` (the headstock
sticker reads the logo canvas), `src/2b_sim_creator.js`, `src/5j_ui_creator.js`,
`src/5l_ui_recap.js`, `tools/perf.js`; tests `tests/pw_stage.js`, `tests/pw_garage.js`, `tests/pw_bands_render.js`,
`tests/pw_creator.js`, `tests/sim_creator.test.js`, `tests/pw_recap.js`, `tests/pw_perf.js`.
**Tasks:** §4.8 (stage camera per spot, your instrument by `gearLook`, the swapped drummer on the riser + boom mic, `str*` hits;
garage drummer + "Your rig" + amp corner; creator "Your gear" + `sanitizeGearLook` + the preview 'gear' mode; carpet/recap/van with
your instrument); `GG.debug('render')` seat fields.
**Acceptance (C):** `pw_stage` `seat` (each string seat × 4 bands: camera from the spot, the drummer on the riser, a mic for Rox /
Chase / Travis, draw calls ≤ HD drum stage × 1.15, no per-frame allocation growth); `pw_garage` `seat` (the drummer at the kit, the
"Your rig" label, ≤ HD × 1.15); `pw_creator` `gear` (3–4 shapes per seat, every guard, the sticker, saved into `gearLook`);
`pw_recap` / carpet with an instrument; every existing render/perf section unchanged and green; `tools/perf.js` size line ≤ 5,000,000.

### Lane D — AUDIO
**Owns:** `src/30_audio.js`, `src/content/genres.js` (backing tables + `backing.hooks`); tests `tests/sim_audio.test.js`,
`tests/sync.test.js`, new `tests/pw_seat_audio.js`.
**Tasks:** §4.7: `opts.seat` layers (rock rhythm, country lead), `opts.part`, `opts.mute`, `backing.hooks` per genre, the three
playable voices + `release` (hold gating) on the band clock, `hitCancel` for seat notes, `seatPreview`, `soloFor(.., 'player')`,
the noodle by seat, voice caps.
**Acceptance (D):** `sim_audio` + `sync` unchanged and green; new node checks: every seat kind present per genre with `opts.seat`
(rock rhythm ≥ 1 event per beat-pair in verses, country lead ≥ 1 lick per bar), `opts.part` replaces exactly the seat's kinds,
`opts.mute` leaves the event list identical, no `opts` = byte-identical timeline (JSON) to stage 0; `pw_seat_audio` (Chromium):
`voices` (pluck/strum/lead booked within ±1 ms of the requested time, holds released on `release`), `mute` (no source started for a
muted kind), `preview` (≈ 3 s, stops itself, one at a time), no console errors, 390 + 440.

### Lead — integration
- Before the lanes merge: nothing. After: 51 seat picker screen (`seat`, testids `seat-drums|bass|rhythm|lead`, `seat-next`; the
  `seatLines`, the preview, `seat:picked`, draft → `newCareer({ seat })`; the copy fixes at `51:222/250/336`), the creator wiring
  (`ui.openLook({ seat })`), 52 SPOTS by seat, 60 routing, `C.SEAT_GATE_KEYS` fold, `pw_seats.js` (META_ONLY = pick | write | gig |
  studio | shop | garage | stage at 390×844; `gig` also 440×956; no console errors), size check, status.md.

### Cross-lane hand-over requests (files stay single-owner)
| from → to | request |
|---|---|
| B → D | `timeline(.., { seat, part, mute })` + `seatKinds` exactly as §4.7 (B codes against today's timeline: metal/punk tests until D merges). |
| D → B | 55 calls `pluck/strum/lead/release` on the `playTap` drum-sync path; B adds no audio code. |
| B → C | `'gig:judge'` lane `'str' + li`, `'gig:hold'`, `gig.roles` with `drummer`; C reads `career.lineup` / `seatRole`. |
| C → B / lead | `ui.openLook({ seat })` and `stage.setup({ seat, lineup })` are the only entry points. |
| A → B | Arc flags, `seatLines`, shop `bySeat`, coach lines, seat achievements (ids); B needs ACH kinds for Solo Too Long / Musical Chairs. |
| B → A | Every line picker honours `speakerOk(state, who, line)`; `{bassist}` etc. by `seatRole`. |
| D → A | `backing.hooks` names (plain words) live in genres.js (D); coach lines that name them live in grooves.js (A). |
| any → lead | Constants, events, state fields, gate keys for `02_contracts.js`; anything in lead-only or unowned files. |

---

## 6. Merge order and release checklist

**Merge order** (each lane rebases on the integrated branch first): 1. **D** (audio opts + voices) · 2. **B** (sims, charts, gig/
songwriter/studio/shop UI; re-run its seat charts with D's layers) · 3. **C** (render) · 4. **A** (content last: the strict leak
scan needs B's roles/tokens) · 5. lead: 51 picker + routing + `pw_seats` · 6. **one focused review pass** on the integrated branch
(drum-seat regression, chart rules, booking, migration) → fixes inline.

**Checklist:**
1. After each merge: `node build.js && node tests/run.js` (SUITE ALL PASS); only lead-only files may conflict.
2. `02_contracts.js`: lanes' real APIs (§4.9), the `SEAT_GATE_KEYS` fold (with B's gate cases), new ACH kinds, events.
3. `10_save.js`: the v0.9 / v1.0 fixtures migrate as drummers (save.test), a string-seat save round-trips (slot + code).
4. Tests: `SEAT=all LEAK_YEARS=10 node tests/sim_bands.test.js` strict + clean; `LEAK_YEARS=13 node tests/sim_bands.test.js` (drums)
   clean; `node tests/sim_seats.test.js`.
5. Balance (background): `SEAT=all BAND=all node tools/balance.js 6 10` and `… 6 30` → `plan/balance_v11_seats.txt`; every seat
   ±10 % of drums; the drum-only run equal to 1.0.1.0's (`grep -v '^done in'`).
6. Playwright: every `META_ONLY` section of every `tests/pw_*.js` at 390×844 and `PW_VIEW=440x956` (incl. `pw_seats`, `pw_seat_audio`);
   `tools/phoneqa.js` both sizes; contact sheets of the new screens viewed once.
7. **Size:** `stat -c %s dist/game.html` ≤ **5,000,000** (report the lane deltas vs 4,247,084 and gzip); draw calls ≤ HD × 1.15; the
   voice cap holds.
8. Owner rules: no USA content, no gong on the drum kit, no share/screenshot button, parody names, prairie tone; no model identifiers
   in commits or code.
9. `plan/status.md`: Version (Current 1.1.0.0 "Seats", Next 1.2 "Tuning"), "What's in v1.1", APIs (§4.9 as merged), tick Addendum 3's
   v1.1 items, record the §0 defaults; back-burner leftovers.
10. `node build.js`, commit, PR `v1.1-seats` → merge into `main` → delete the branch and lane branches (own PIDs only). One short
    plain-words summary to the owner (with the §0 defaults so he can object).

---

## 7. Risks
- **Drum-seat regression** (the baseline): any shared path (chart, session, timeline, booking, gear, tokens) that changes for drums.
  Mitigation: every new behaviour keys off a string seat / `opts.seat`; existing tests unchanged; `sync` + `pw_gig` sync/sync2/
  double/bridge must not move; the drum timeline is byte-identical without the new opts.
- **Sparse or empty charts** (rock rhythm, country lead; §1.4 #1/#3): Lane D's seat layers; Lane B's tests assert density per band ×
  seat (a first gig winnable on Easy by a new player).
- **Holds + two thumbs + the smart bridge** interplay on a phone; the release gating vs the voice cap. Mitigation: `S.release` pure,
  node-tested; `pw_gig seat` with real touch at both sizes.
- **Leaks** (530 audit lines + new arcs; `{bassist}`-style tokens naming the swapped drummer). Mitigation: the strict `SEAT=all` leak
  scan, `speakerOk(line)` everywhere, `'@drummer'` for swapped-drummer cards.
- **Balance drift** from part-based ratings and roles. Mitigation: the shop reuses the drum economy 1:1; ±10 % gate at 30 seeds.
- **Size** (+660 KB planned, 753 KB of headroom). Mitigation: soft lane targets, content written lean, the hard gate.
- **Render cost** of a second camera + instruments: draw-call gate ≤ HD × 1.15, no per-frame allocations.
- **Old saves:** migrate fills drummers only; v0.9 + v1.0 fixtures in save.test (incl. a recruit and a quit original).
- **Node vs browser timeline:** 22 reads `GG.audio` lazily; node sims without 30 keep the drum chart (`stub: true`), so balance and
  bots never depend on 30.
