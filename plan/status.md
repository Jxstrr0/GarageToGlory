# Garage to Glory: status

Read this first every session. Don't re-explore the codebase to rebuild context.

## RESUME HERE (v1.1 "Seats" paused 2026-10-02 14:40 UTC, owner's stop time; delete this block when v1.1 merges)
- Branch `v1.1-seats` (pushed). Stage 0 = 829b059. Lanes **D audio** + **B sims/gameplay UI** are finished and merged (a3aeea7).
- Unfinished lanes, saved as WIP on origin (both on top of 829b059, not merged yet):
  - **C render** → `wip-v11-c` (58a29ee). C1–C5 done (instrument models, stage seat camera + swapped drummer, garage seat,
    creator Your gear tab, carpet/recap/van). C6 in progress: pw_stage/pw_garage/pw_creator/pw_recap seat sections and
    sim_creator gear look written; contact sheet + full regression not yet run.
  - **A content** → `wip-v11-a` (28607e2). A1 done (SEAT= strict leak scan). A2 seat audit pass part-way (tokenise/gate per
    file, `src/content/zz_seats.js` started). A3–A6 not started (bands seatLines/bySeat, role arcs + 12 finales + player
    epilogues, shop bySeat names/creator parts/coach lines/seat achievements, content_seats test + runs).
- Lead integration progress (2026-10-03, on `v1.1-seats`; lanes C/A still running in their worktrees):
  - [x] 1. Folds: `C.GATE_KEYS += seat, swapped`, `C.ACH_KINDS += seatCareer, soloTooLong, allSeats`; D/B APIs in 02 + below.
  - [x] 2. sim_seats ALL PASS 17: metal rhythm suggested part rings (holds at doom tempo); string crowd retuned (avg bot within
    ~1.8 of drums); soloTooLong default min 0.3.
  - [x] 3. 51 seat picker (intro → seat → logo → creator), seat copy, 52 'Your rig' spot, 5h labels, 50 presentLines gates.
  - [x] 4. tests/pw_seats.js: pick 19, write 11, gig 8 (also 440x956), studio 6, shop 7 green at 390; garage/stage skip until C.
  - [ ] 5. build + node + pw regression; plan/v11_lead_report.md.
- Resume steps:
  1. Resume workflow run `wf_867f4c13-592` (script `workflows/scripts/v11-seats-build-wf_867f4c13-592.js` in the session dir;
     if that session is gone, relaunch lanes C and A with the same contract sections). D and B results are cached.
     Add RESUME notes to the C and A prompts: start from `git fetch origin wip-v11-<c|a> && git reset --hard
     origin/wip-v11-<c|a>` (not 829b059), read the task list above, finish the remaining tasks only. Escape backticks.
  2. Integrator: merge C then A into `v1.1-seats` (D+B already in, a3aeea7), lead work (51 seat picker, pw_seats), fix the
     3 sim_seats failures, build (gate 5,000,000 B), node tests + pw matrix at 390x844 and 440x956.
  3. One review pass (≤ 3 lenses), verify blocker/major only, fix. PR `v1.1-seats` → main, merge, delete `wip-v11-*`.

## Version
- Current: **1.0.1.0** = 1.0 "Glory" + the v1.0.1 "Smart bridge" hotfix (one touch on a lane seam hits both lanes only
  when both have a note due; see the note below). 1.0 "Glory" = 0.9 "Genres" + endings (Legacy score, five tiers, eight
  specials, epilogues, bonus years, the end sequence), achievements + the laptop Trophies tab, the Hall of Fame (title button,
  entry sheet, backup code), meta unlocks (looks from finished careers), the guided tutorial (full week 1 + light weeks 2–4,
  "?" replays) and the perf pass (frame governor, graphics "Auto", the global voice cap). **Update Current/Next at every merge.**
- Shipped: 0.1 Garage · 0.2 Sequencer · 0.3 Stage · 0.4 Drama · 0.5 Signed (+ 0.5.1 gig-clock hotfix) · 0.6 Rivals
  (+ 0.6.1 Addendum 1 catch-up, 0.6.2 two thumbs + guided songwriter) · 0.7 World (+ 0.7.1 3D title, 0.7.2 Heavier:
  English titles, layered crowd, heavier metal, double kick) · 0.8 Kit (+ 0.8.1 licensing deals, band logo, year-end recap,
  0.8.3 drum sync) · 0.9 Genres · 1.0 Glory (+ 1.0.1 smart bridge).
- Next: **1.1 "Seats"** (handoff Part E: play bass / rhythm / lead; contract `plan/plan_contract_1.1.md`, finished at stage 0
  2026-10-02 on `v1.1-seats`, VERSION 1.1.0.0; size gate **5,000,000 B** per E14) → **1.2 "Tuning"** (D5).
- Repo: https://github.com/Jxstrr0/GarageToGlory (branch `main`; work lands through PRs that are merged and their branches deleted)
- Play: `dist/game.html` (standalone), `dist/game.artifact.html` (Artifact host copy), `dist/Garage to Glory - V<ver>.html`

## Token budget rules (owner 2026-10-02: "less token burn")
- **This file is the only must-read.** Keep it lean: history ("What's in v0.x", old hotfixes, Addendum 1/2 decisions + done
  checklists, v0.9 owner decisions) lives in `plan/status_archive.md`; read it only for a specific old detail (grep it).
- Never read `plan/handoff.md` whole: grep/read only the Part or section the task names (e.g. Part E for Seats).
- Contracts: read only your lane's section plus §0 and §4. Lane reports and audits go to files; prompts point at file paths,
  never paste them.
- Workflows: ≤ 4 build agents, one review pass with ≤ 3 lenses, verify only blocker/major findings (one vote), low effort for
  mechanical agents (fixtures, merges, reruns). Agents return short reports (≤ 40 lines).
- The lead compacts the conversation at each milestone (owner runs `/compact`), and keeps check-in prompts self-contained.

## v1.0 review fixes (2026-10-02, on `v1.0-glory`)
- Endings: Ramblers bonus cards no longer name Earl in text once he has left ({grumbler} tokens); `endings.bonus.byBand.*.chat`
  entries are `{ who, text }` (the original speaker); `GG.legacy.weekly` falls back to the generic '@front' line when that member is gone.
- Meta: `recordCareer` on an existing entry (same / lower score) merges the state's trophies into it (a v0.9 ended slot recorded
  by the slot scan gets its trophies when its ending plays).
- Save: a key whose last write missed (quota) reads this session's copy from memory until a write persists; packed slots
  cache the last `{ json, body }` so an autosave (auto + slot) compresses once (`save.packStats.compress`); the per-song
  autosave runs at the next idle moment (<= 1 s).
- Tutorial: the bubble keeps clear of --safe-top / --safe-bot with the HUD hidden (pw_tutorial `tut_notch`); w1_write step 2
  teaches the guided cards (points at btn-guide-play); {instrument} lines read right as "drums".
- Render: un-pausing (and a long rAF gap after an undrawn tick) resets the ratio band + cost window; the tick estimate is the
  10th percentile of the last 60 rAF intervals (`R.tickEstimate`, rises to 33 ms at 30 Hz rAF); `debug('perf').vsync`.

## v1.0.1 smart bridge (hotfix; owner popup 2026-10-02)
- 55_ui_gig onDown: a touch within 1/6 lane width of a lane boundary (the middle third of the gap between the two lane
  centres) hits BOTH lanes only when both have a note judge() would hit at the touch's time (`ses.due`); otherwise only the
  nearer lane (as before). Each lane is a normal tap (judged + its drum booked per lane, drum-sync model; the second tap skips
  the dispatch sample), so a bridge never adds a stray. Default on, no setting; lefty-aware (columns via col()), keys
  unchanged, 4–6 lanes, charts (two-thumb rule) unchanged. Debug `gigui.bridgeN`; session `stats().stray`.
- Tests: sim_gig `due`; pw_gig `bridge` (chord seam = both, one lane due = one + no stray, centre = one, lefty mirrored,
  6 lanes, keys = one).

## Locked foundations (from handoff A2)
| Call | Decision |
|---|---|
| You are | The drummer and founder. You never quit, you can't fire anyone. |
| Look | 3D rooms and stages (like Kick), low-poly, phone-first, portrait. |
| Gigs | A rhythm game on drum lanes (Guitar Hero style, top-to-bottom note highway). |
| Genre | Picked at the start of a career: Metal, Punk, Rock, Country. All four ship in v1. |
| Time | Week-by-week turns. 24 weeks per year. 10-year career (240 weeks) + 2–3 bonus years for early success. |
| Tone | Comedic. Burning vans, moose concept albums. |
| Cast | Every band member and every rival band is hand-made. Random recruits fill holes when someone quits. |
| Names | Real cities. Parody names for bands, venues, labels, festivals, magazines, awards. |
| World | Canada first, then UK & Europe, Japan, Australia, Russia. **No USA content.** |
| Saves | Autosave at the end of every week + 3 manual save slots. Gigs save between songs. |
| Money | One shared band fund. A "pay the band" setting decides members' cut vs the fund. Broke = borrow from your parents (guilt cards). |
| Run length | Always ends at year 10 (or 12–13 with bonus years). Never a game over. |

## Owner decisions
- 2026-10-01 (for v1.0 "Glory", popup; the recommended option on all eight; **LOCKED**, full text in `plan/plan_contract_1.0.md`
  §0): **Q1 bonus years = early World stage** (World era by the end of year 5, totalWeek ≤ 120 → +3 years; by the end of year 6,
  ≤ 144 → +2; granted on the spot with a bandmate's message). **Q2 Sad Dome = week 21 of the career's final year** (no bonus
  years → year 10 week 21, exactly as before); this **replaces the 2026-09-29 "Sad Dome co-bill in year 10" decision** for careers
  with bonus years. **Q3 ending tiers by the Legacy score only** (fair middle: Arena Legends ≥ 800, Canadian Institution ≥ 600,
  Cult Heroes ≥ 400, One-Album Wonders ≥ 200, Still in the Garage; losing the Sad Dome changes the text, not the tier; difficulty
  is a badge). **Q4 each band gets its own twin endings/trophies** (World payoff special, storyline + rival-streak trophies).
  **Q5 meta unlocks = looks from finished careers** (tier/special palettes + emblems, creator parts cross-genre; trophies are
  bragging only; nothing changes gameplay). **Q6 Hall of Fame = logo, lineup, ending, years** (+ score, difficulty badge, trophies,
  yearly headline strip; opens from the title; the save code carries it). **Q7 tutorial = full week 1 + light weeks 2–4** ("Skip
  the lessons" offered once any career passed week 4, on by default; "?" replays). **Q8 graphics default "Auto"** (1.5× on a DPR-3
  phone, steps down on slow frames, 30 fps quiet rooms, 3D paused behind tall menus; "High" one tap away). Defaults taken without
  a popup (§0 Defaults): Big in Japan formula, Side Project, Original Five/Four by lineup size, Band of Strangers = Kijiji
  All-Stars, epilogue variants, "Still in the Garage" names `{space}`, HoF 40 kept (top 10 never dropped), backup code, laptop
  "Trophies" tab, ~33 achievements, new looks (closes D6: palettes Arena Gold, Hockey Night, Cult Velvet, One-Hit Teal, Garage
  Grey, Rival Red; emblems lantern, price_tag, handshake, globe_record; no gong), tutorial off under automation unless `?tut=1`,
  existing players' slot scan, phone QA split (hands-on checks stay in v1.2), dist comments stripped (size gate 4,250,000 B).
- 2026-09-30: **Double kick** (owner: "make 1 kick note hit as a double kick to create less compression on the note highway
  while still keeping the pace quick"): two fast kicks (≤ `gig.DOUBLE_GAP` 0.18 s apart) are ONE highway note; one tap plays
  both (the second on the audio clock at its time); every difficulty; one note for accuracy/combo. Shipped in v0.7.2.
- 2026-09-29: Money feel = **Scrappy, but not too brutal** (always a little short; hustle matters; parents' loan is rare with decent play).
- 2026-09-29: First storyline chain = **The Cape Saga** (Marcel's cape).
- 2026-09-29: Owner allows auto-merging PRs into `main`; delete merged branches afterwards.
- 2026-09-29: Play on phone via **GitHub Pages** (Settings → Pages → Deploy from branch `main`, `/ (root)`).
  Root `index.html` redirects to `dist/game.html`; `.nojekyll` present. URL: https://jxstrr0.github.io/GarageToGlory/
  Owner turned Pages on (2026-09-29).
- 2026-09-29: **Standing authorization from the owner:** keep running autonomously — build version after version
  (v0.1 → v1.0 per handoff B4) and merge each PR into `main` yourself, without waiting for approval. Process per
  version: branch `vX.Y-<name>` from `main` → build + tests → push → PR → merge into `main` → delete the branch →
  update this file → start the next version. Still ask popups only for genuinely open decisions (handoff A16).
  **`main` is the one build branch** (always the latest playable build; Pages serves it). After every merge, delete
  the merged branch and any other branches that are no longer needed, so `main` is the only long-lived branch.
- 2026-09-29: Owner: **prefer token efficiency** — few agents (only for multi-feature batches), no duplicate work,
  lean reviews (tests + one focused review pass), patches done inline by the lead.
- 2026-09-29 (for v0.6): Tundra Wraith frontman **Gord "Grimnir" Penner** (chartered accountant, minivan with a
  Winnipeg Jets bumper sticker, screams about eternal winter, brings a veggie tray to every show) + **3 more polite
  accountants** (full hand-made lineup). Other rivals' members are designed in **v0.9**. Final showdown = **Sad Dome
  co-bill** in Calgary in year 10: a head-to-head set decides who headlines and who opens, forever (feeds the ending).
  (v1.0 Q2, 2026-10-01: week 21 of the career's **last** year, so year 12 or 13 with bonus years; year 10 without.)
- 2026-09-29 (for v0.5): career pace **Steady** — Local Heroes ≈ end of year 1 (250 fans), first label interest in
  year 2, signed by year 2–3, World Stage reachable ≈ year 5–6 (leaves room for bonus years).
- 2026-09-29 (for v0.4): Garage-era protection ends at **250 fans**; drama level **"now and then"** (≈ one quit every
  1–2 years with decent play, more if underpaid/overworked; always warned first); pay-the-band default **30%** of gig pay.
- 2026-09-29 (for v0.3): **Kenji drives the van, silently** (every trip, sunglasses, nobody sees him get in or out);
  v0.3 map = **Saskatchewan core** (Saskatoon, Regina, Prince Albert, Moose Jaw, Swift Current, North Battleford,
  Yorkton, Warman/Martensville); rhythm timing = **Forgiving** (wide early window; drum skill widens it further).
- 2026-09-29: Owner turned on GitHub "Automatically delete head branches" (merged branches clean themselves up).
- 2026-09-29 (for v0.2): drum palette = **punchy real-ish synth kit**; metal backing = **tempo decides**
  (slow → doom sludge, mid → palm-muted chugs locked to the kick, fast → tremolo blast riffs; bass doubles guitar).
- 2026-09-30 (for v0.7.2): song titles = **English, Marcel rarely French** (starter + new metal songs get English titles,
  still secretly about Marcel's lawn; now and then Marcel sneaks a French one in as a joke). He still SINGS in French.

## What's in v1.0 "Glory" (contract `plan/plan_contract_1.0.md`; lanes P, E, M, T merged on `v1.0-glory` 2026-10-02)
- **Legacy + endings (Lane E, `2f_sim_legacy.js`, `content/endings.js`, `5n_ui_ending.js`):** a 0–1000 Legacy score from seven
  parts (fans, units, awards, biggest venue headlined, regions, band unity, the Sad Dome); five tiers by score only (Arena
  Legends ≥ 800, Canadian Institution ≥ 600, Cult Heroes ≥ 400, One-Album Wonders ≥ 200, Still in the Garage, which names
  `{space}`); eight specials stacked on the tier (Big in Japan, Moose Opera, Big in Berlin, Mudstonbury Legends, Outback
  Legends, Kijiji All-Stars / Band of Strangers, The Original Five/Four, Side Project); epilogue cards for every member (lineup,
  departed originals, defectors, recruits, the player; Kenji silent; `seatRole` hooks). Pure, no RNG, seat-neutral.
- **Bonus years:** World era by totalWeek ≤ 120 → +3 years, ≤ 144 → +2, granted once on the spot with a bandmate's line (never
  after the Sad Dome news / showdown or from year 10). The Sad Dome sits in week 21 of the career's last year (`R.finalAt`).
  Bonus-year Monday cards (`endings.bonusCards`, `minYear: 11`) join the deck at runtime via `GG.legacy.deck()` (content.test
  still forbids World-era gates in the load-time deck); a NO_BONUS run replays v0.9 exactly.
- **End sequence:** final → tier → special → epilogues → player → rival → summary (unlocks + this career's trophies) → Hall of
  Fame / Back to title; a live career shows a read-only preview; an ended career is recorded once (idempotent by careerId).
- **Achievements (Lane M, `2g_sim_achieve.js`, `content/achievements.js`, `5o_ui_trophies.js`):** 36 (per-band twins for
  storylines, rival streaks and World payoffs; drum words gated `seat: ['drums']`), per-career `state.ach` + cross-career meta;
  laptop "Trophies" tab (10 tabs wrap 5 + 5), "???" rows for other bands, a toast only for a fresh unlock and never mid-song.
  Avg bot earns 8.7–10 per 10-year career (`plan/ach_bots_avg10.txt`).
- **Hall of Fame (`12_meta.js`, `5q_ui_hof.js`):** title button + list (logo, tier chip, score, difficulty badge, seat chip), entry
  sheet (seven parts, lineup, trophies, yearly headline strip), cap 40 with the top 10 never dropped, quota path, backup code
  (meta-only, full strips) and the save code's `_meta` lite (merged after a confirm). Existing players' slots are scanned once.
- **Meta unlocks (Q5):** tier/special palettes (Arena Gold, Hockey Night, Cult Velvet, One-Hit Teal, Garage Grey, Rival Red) +
  emblems (lantern, price_tag, handshake, globe_record) + cross-genre creator parts, shown with 🏆; looks only.
- **Tutorial (Lane T, `2h_sim_lessons.js`, `content/tutorial.js`, `5p_ui_tutorial.js`):** 12 lessons (full week 1 + light weeks
  2–4 + "a good year"), every band in its own voice, bubbles point at testids and never cover the highway or show during a song;
  "Skip the lessons" offered once any career passed week 4; the HUD "?" replays any lesson; off under automation unless `?tut=1`.
- **Perf (Lane P):** frame governor (60 live/drive/walk/glide, 30 idle rooms, 10 behind a tall sheet), graphics "Auto" (the
  fresh-profile default: 1.5× on DPR 3, steps down on slow frames between songs), crowd LOD (festival 65.7k → 32.4k tris), global
  voice cap 32 with pre-rendered drum hits (nodes/s at the gig peak 154 → 57), lazy space atlas, shader checks only under
  automation, the logo readback fix (first HD quickStart ~3 s → ~0.2–0.45 s headless). `tools/perf.js` (all, scenes, governor,
  gig, tti, audio, stalls, size, report) → `plan/perf_v10.txt`: every hard gate ok.
- **Lane Q (lead):** `tools/phoneqa.js` (green at both sizes); footless sheets pad by `--safe-bot`; large slots stored packed
  (LZ1 header + LZW) and save codes kept ≤ 135k chars by trimming the Hall of Fame entries they carry; sim_bands leak scan
  over lessons, achievements and endings (`LEAK_YEARS=13` clean); owner-rules fixes (recruit "Brody" → "Brock", three real
  brands parodied, the farm-auction gong no longer joins the kit).
- **Numbers:** `dist/game.html` 4,229,802 B (gate 4,250,000 ok; +216 KB over stage 0's 4,013,378 vs the +150 KB target: E ≈ +76,
  M ≈ +56, T ≈ +56, P ≈ +26 KB stripped; gzip 1,239,348 B, +61 KB). Balance 13×30 (`plan/balance_v10_all.txt`): every Legacy
  target ok (good bot 100 % Arena Legends, +3 in 97–100 %; avg bot AL 3–17 %, CI+CH 83–94 %, +3 0–3 %, bonus rate HD 33 /
  FH 17 / GK 60 / GRR 20 %, all 33 %); `NO_BONUS=1 … 10 30` identical to `plan/balance_baseline_v10.txt`. Storage at 13 years
  (good bot, 312 weeks): save code 128–134k chars incl. `_meta` (HD carries 5 HoF entries, others 19), slot JSON 285–320k →
  packed ~130k, total localStorage for 4 slots + a 40-entry HoF + meta 0.64–0.69M chars (was 1.44M unpacked).
- **Tests at integration (2026-10-02):** `node tests/run.js` SUITE ALL PASS (28 files); `LEAK_YEARS=13 node tests/sim_bands.test.js`
  clean; Playwright: every META_ONLY section of every `tests/pw_*.js` (90 cells: bands ×4 + flat, bands_render ×6, creator ×4,
  drama, ending ×4, fans ×2, flow ×5, garage, gig ×7, hof ×3, label ×4, logo ×3, perf ×5, recap ×3, rival ×3, seq ×6,
  settings ×3, shop ×5, stage ×2, title ×3, tour ×4, trophies ×2, tutorial ×5, world ×4) at 390×844 and `PW_VIEW=440x956`:
  176/180 green in the full run; tutorial `tut_w1` (390 + 440) failed on a test race (the card sheet still sliding in when
  "a tap reaches the game" was probed; `reaches()` now waits for finite animations) and is green twice at both sizes after
  the fix; pw_gig `double` and pw_seq `audio` at 440 failed once under load and passed alone twice each (timing flakes).
  `tools/phoneqa.js` green at both sizes; contact sheets `tests/.cache/v10_sheet_390.png` / `_440.png` viewed.
  Integration fixes to tests: `save.test` (no-Legacy entries with `GG.legacy = null`, + quota / packed slot / code trim),
  `pw_perf` + `tools/perf.js` governor wait for the first garage glide (the logo fix moved a 3 s stall out of quickStart).
- **Seat-aware hooks (E12):** `HOF_ENTRY.seat`, `META.careers.bySeat`, `{instrument}` / `{drummer}`, `seat` gates on lessons and
  achievements, epilogue `seatRole`, code reads `state.seat || 'drums'` (no `state.seat` field until v1.1).

## Addendum 3 (handoff Part E "Seats") — decisions (owner popups, 2026-10-01; locked)
- S1 **Seat swap**: pick drums / bass / rhythm / lead; the member whose seat you take moves to the drum kit (E3 table).
- S2 **Taps + holds** on the same highway; lanes by pitch contour; **bass max 5 lanes, guitar max 6**.
- S3 **Your part + auto drums** in the songwriter (progression/hook pick + a 2–5 row rhythm grid; the drummer suggests a groove).
- S4 Roadmap: **v1.1 Seats** after v1.0 Glory; Tuning → **v1.2**.
- S5 Gravel Kings rhythm: **Chase drums + sings**. S6 Rox / Travis Lee **sing from the kit**.
- S7 Storylines: **3 role arcs** (Nobody Hears the Bass · The Engine Room · Solo Too Long) **+ 12 band finales**.

## Addendum 3 — pending
- [x] v1.0: seat-aware where E12 says (`HOF_ENTRY.seat`, `META.careers.bySeat`, `{instrument}` / `{drummer}` tokens, lessons
      and achievements gated `seat: ['drums']` for drum words, epilogue `seatRole` hooks, Legacy seat-neutral) — merged 2026-10-02
- [x] v1.1 stage 0: fresh audits, `plan/plan_contract_1.1.md` finished (E14 popup DONE 2026-10-02: 5.0 MB; parody gear names at drum prices; 3–4 body shapes per seat; tap-to-hear seat preview) — 2026-10-02 on `v1.1-seats` (contract §3)
- [ ] v1.1 lanes A–D + lead integration (E3–E10), `pw_seats.js`, seat leak scan, balance per seat
- [ ] v1.2 Tuning (D5) covers all four seats

## Tech
- three.js **0.149.0** from cdnjs (last UMD build without the r150 deprecation warning). Only external dependency.
- Build: `node build.js` → dist/. ORDER rule: 01_ns, 02_contracts, content/*.js, then other src/*.js by name.
- Tests: `node tests/run.js` (all node tests). Playwright: `timeout 500 node tests/pw_flow.js` with `META_ONLY=<section>`; helper `tests/_pw.js` routes three.js to `tests/.cache/` (gitignored) and runs at 390×844.
- Balance: `node tools/balance.js`.

## APIs (full shapes in `src/02_contracts.js`)
- **v1.1 as merged** (lanes D + B, lead folds; full list in `02_contracts.js` V1.1 SEATS "As merged"):
  - Folds: `C.GATE_KEYS += seat, swapped` (`C.SEAT_GATE_KEYS` stays as the subset); `C.ACH_KINDS += seatCareer, soloTooLong,
    allSeats` (= `GG.achieve.SEAT_KINDS`, now in `KINDS`). `C.SEAT_KINDS` unchanged.
  - `GG.audio`: `seatVoiceFor(kind)`, `pluck|strum|lead(midi, when, o)` → handle `{ fn, kind, midi, t, end, len, hold, n, repeats,
    released, cut }` (o adds `repeats`, `trem`, `ring`, `seat`), `release(h, when)` → true/false/null, `seatPreview(bandId, seat,
    opts?)` → handle + `{ bandId, seat, secs, stopAt }`, `stopPreview()`; `play()` handle + `kinds/muted/mute/seat`; timeline +
    `seat/part` (part notes `part: true`, last outro bar `ring: true`, `tl.tail`); `renderOffline({ seat, part, mute, seatNotes })`;
    `soloFor(genre, 'player')`; `debug('audio').seat`; genres `backing.progNames` / `backing.hooks`.
  - `GG.gig`: `STR_LANES`, `HOLD_BEATS`, `RUN_GAP` 0.18; chart opts `genre`, `soloist`; chart keys `holds, chords, runs, kinds,
    genre, tail, fills[].cap/shred`; `S.release(lane, t)`, `S.holding`, `S.seat`; SONG_RESULT `seat, holds, rings, held, bends,
    solo, dur, soloNotes, allNotes`; `roles().drummer` non-enumerable; `economy.gig.live` `flowGain, holdGain, ringGain, ringAt,
    seatDensityClamp, bendGain`.
  - `GG.songs.part.*` (ROWS, key, choices, suggest, sanitize, full, toggle, pick, MODS, modify, notes), `partRating`,
    `PART_WEIGHT`, `rate().part`; `GG.career.stageRole / ARCS / arcOf`; `GG.drama.slotOf`; `GG.shop.seatGearEffect /
    seatGearSync / kitName / whammy`.
  - UI: 51 screen `seat` (testids `seat-drums|bass|rhythm|lead`, `seat-next`), 55 string lanes, 54 "Your part", 5k / 59b by seat.
  - pw matrix adds `tests/pw_seat_audio.js` (voices | mute | preview | noodle) and `tests/pw_seats.js` (pick | write | gig |
    studio | shop | garage | stage), both at 390x844 and `PW_VIEW=440x956`.
- **v1.1 stage 0** (2026-10-02, `v1.1-seats`; shapes in `02_contracts.js` V1.1 SEATS, contract §3/§4):
  - Contracts: `C.SEATS`, `C.SEAT_MAX_LANES { drums 6, bass 5, rhythm 6, lead 6 }`, `C.SEAT_KINDS` (confirmed on the real timeline:
    metal rhythm gtr+gtr2 / lead gtr+lead; punk rhythm gtr / lead gtr+lead; rock rhythm gtr2+clean (Lane D adds a seat layer) /
    lead gtr+lead; country rhythm clean (the acoustic strum) / lead twang; bass = bass; drums = drum), `C.SEAT_TOKENS`, `C.TOKENS +=
    gear sticks yourPart seat`, `C.ROLE_ALIASES += '@drummer'`, `C.SEAT_GATE_KEYS ['seat', 'swapped']` (fold into GATE_KEYS once
    sim_career's gate test covers them), `C.GEAR_SHAPES / GEAR_GUARDS / GEAR_LOOK`; events `gig:hold`, `seat:picked`. SAVE_SCHEMA 10.
  - State (migrate fills, no events; newCareer the same): `seat` ('drums' for old saves), `members[].seatRole`, string seats only
    `gear.seatLanes { bass, rhythm, lead }` + `gear.runs` (a drum career's gear stays v1.0's object), `player.gearLook`.
  - `GG.career`: `seatOf, seatSwap(bandId, seat), swapped, seatRoleFor, lineup, drummerId, seatLanes, seatRuns, seatOk`,
    `speakerOk(state, who, line)`; gates `seat` / `swapped` (gatePasses, cardOk top level + gate, cameo too); tokens per seat
    (drums = v1.0: drums / you / kit / sticks / the beat / drums). `bands.<id>.seats` (E3). Recruits get `seatRole` at hire.
  - Stubs: `gig.chart(song, { seat })` = the drum chart + `seat`, `stub`; `GG.audio.seatKinds`, `pluck/strum/lead/release` → null;
    `GG.render.stage.setup({ seat })` stored (`info().seat`); `GG.main.newCareer/quickStart({ seat })`, `?quick=1&seat=bass`.
  - Tools/tests: `tools/seat_audit.js` → `plan/seat_audit.txt` (530 lines); `tools/make_fixtures_v10.js` →
    `tests/fixtures/v10_recruit.json.gz` (1.0.1.0 Ramblers, a recruit + a quit original); `tests/sim_seats.test.js`; save.test +2;
    `tools/perf.js` size gate 5,000,000. Drum regression: 8 seeded 3-year bot careers byte-identical to 1.0.1.0.
- **v1.0.1**: `GG.gig.session(...).due(lane, t)` -> bool: judge(lane, t) would hit a note (pure; the smart bridge asks it);
  `stats()` adds `stray`.
- **v1.0 "Glory" (merged 2026-10-02; the lane APIs are folded into `02_contracts.js` "As merged")**:
  - `GG.legacy` (2f): noBonus, careerId, ensure, migrate, gig, worldWeek, bonusFor, finalYear, yearsText, deck, weekly, raw, parts,
    score, tierDef, tier, tierRank, TESTS, specialOk, specials, whenOk, epilogues, compute, finish, text, hofEntry; debug `legacy`.
    WRAP.bonus; events `legacy:bonus`, `legacy:done`; UI `end:step`, `GG.ui.endGo(step)`, `ui.rivalEnd`.
  - `GG.achieve` (2g): defs, def, gated, name, ensure, migrate, originals, kickShare, KINDS, kindInfo, test, check, gig, weekly,
    finish, metaIds, view, list, earned; `state.ach.t` counters; events `ach:earned`, `meta:ach`. UI `ui.trophiesPanel`,
    `ui.achToast`; testids `laptop-tab-trophies`, `trophies-count`, `trophy-row-<id>` (data-band, data-state).
  - `GG.meta` (12): enabled, load, get, save, hof, careerId, lessonSeen, markLesson, recordCareer → { entry, fresh, unlocks, ach },
    exportLite, exportFull, mergeLite, award, has, unlock, unlocked, isUnlocked, unlocksFor, unlockNames; events `meta:unlock`,
    `meta:quota`, `hof:added`, `meta:changed`. Screens `hof` / `hof-entry`, code sheet mode `hof`; testids `btn-hof`, `menu-hof`,
    `hof-row-<i>`, `hof-entry`, `hof-year-<y>`, `hof-code`. `GG.logo.pickEmblems/pickPalettes/isMeta`, `GG.creator.metaPart`.
  - `GG.lessons` (2h): LESSONS, def, ensure, on, done, mark, stop, available, steps, matches, due(state, ctx); `GG.tutorial` (5p):
    enabled, running, active, start, replay, check, skip, offerSkip, openLessons, suppressWriteTip; events `tut:step`, `tut:done`;
    `?tut=1`; testids `tut-bubble`, `tut-next`, `tut-skip-lessons`, `tut-close`, `lesson-<id>`, `lessons-off/on/close`, `btn-help`.
  - Render/audio (Lane P): `GG.render.invalidate(n)`, `nextRatio(cur, p95, heldMs)`, `RATIO_STEPS`, `perfState()`, `feedFrames`
    (tests); `GG.debug('perf')`; `perf:quality` { pixelRatio, reason: slow | fast | settings }; `GG.audio.VOICES`, `voicePlan`,
    `voiceStats`, `prerender`, `prerenderHit`, `prewarm`, `renderOffline({ lane, pre, cap })`. Voice-cap priority: taps and band
    notes are never dropped; crowd one-shots go first. Settings `P.GRAPHICS = auto | low | med | high` (unknown → auto).
  - `GG.rival.finalAt(state)` → { year, week }. Save: `save.readCode(text)` → { state | null, meta | null }, `save.metaCode()`,
    `save.CODE_MAX` (135000: toCode trims the Hall of Fame entries it carries), `save.SLOT_PACK_AT` (150000: bigger slots stored
    `LZ1:<n>:<header>` + LZW), `save.lastError` ('quota' after a full store; storageOk stays true).
  - Tests/tools: `PW_VIEW=440x956` (owner's phone), `NOSTRIP=1 node build.js`, `tools/perf.js`, `tests/pw_perf.js` (scenes,
    governor, ratio, stalls, audio), `tools/phoneqa.js`, `tests/pw_tutorial.js` (`SHOTS=1`), `tests/pw_ending.js`,
    `tests/pw_hof.js`, `tests/pw_trophies.js`, `LEAK_YEARS=13 node tests/sim_bands.test.js`, `A15_STRICT=1` (sim_lessons).
- **v1.0 stage 0** (2026-10-02, `v1.0-glory`; shapes in `02_contracts.js` V1.0 GLORY, contract §3/§4):
  - Build: `node build.js` strips full-line `//` comments from every JS module in dist/ (never inside a template literal or a
    block comment; trailing comments stay) and prints bytes on disk + KiB: 4,013,378 B after stage 0 (was 4,417,065 B with
    comments). `NOSTRIP=1 node build.js` keeps them. `require('./build').strip(src)` → `{ code, lines, bytes, ticks, end }`;
    `tests/_load.js` `{ strip: true }` loads stripped modules; `tests/build.test.js` = parity guard, acorn comment check (when
    acorn is installed), parse check, strip-equivalence (GG.content + 2-year bots per band).
  - Contracts: `C.BONUS { maxYears: 3, rule: [{ maxWeek: 120, years: 3 }, { maxWeek: 144, years: 2 }] }`, `C.LEGACY_PARTS` (7),
    `C.ENDING_TIERS` (5, best first), `C.SPECIAL_ENDINGS` (8), advisory `C.ACH_KINDS` / `C.ACH_WHEN` / `C.LESSONS`, `C.TOKENS` +
    `instrument`, `drummer`; events `legacy:bonus legacy:done ach:earned meta:ach meta:unlock meta:quota hof:added meta:changed
    ui:tab tut:step tut:done perf:quality`. `C.SAVE_SCHEMA` stays 10.
  - State (migrate fills when missing, no events; `newCareer` starts with the same values): `bonusYears 0`, `legacyTrack
    { bigHead: null }`, `legacy null`, `ach { got: {}, t: {} }`, `tutorial { on: false, done: {}, past4: totalWeek >= 4 }`.
  - Career hooks (20): `settleGig` → `GG.legacy.gig(state, r, g)`, `GG.achieve.gig(state, r, g)`; `endWeek` → `GG.legacy.weekly`
    after `checkMilestones` (before `advance`), `GG.achieve.weekly` after the year-end block; the career's last wrap →
    `wrap.legacy = GG.legacy.finish(state)`, `GG.achieve.finish(state)` before `career:end`. Tokens `{instrument}` 'drums',
    `{drummer}` 'you'.
  - Save (10): `DEFAULT_SETTINGS.graphics = 'auto'` (normalized to 'high' until 'auto' joins `P.GRAPHICS`); `toCode(state)` adds
    `_meta: GG.meta.exportLite()` on a shallow copy when `GG.meta.enabled`; `readCode(text)` → `{ state | null, meta | null }`
    (`_meta` off before migrate; meta-only body → state null); `fromCode(text)` = `readCode(text).state` (throws DAMAGED on a
    meta-only code); `metaCode()` → `GG1:` code of `{ v: 1, metaOnly: true, _meta: GG.meta.exportFull() }`.
  - `GG.meta` (12_meta, frozen API, Lane M owns it now): `enabled` (60_main sets it at boot), `load()` (+ the one-time slot scan),
    `get()`, `save()`, `hof()`, `careerId(state)`, `lessonSeen/markLesson`, `exportLite/exportFull/mergeLite`,
    `recordCareer(state, opts)` → `{ entry, fresh, unlocks: [], ach: [] }` (dedupe by id keeping the higher score; cap 40 / top 10;
    `at` + `ver`; `hof:added`; quota path), listeners `career:new` / `week:wrap` (past4) / `career:end`; stubs `award`, `has`,
    `unlock`, `unlocked`, `today()`. Debug `GG.debug('meta')`.
  - `GG.rival.finalAt(state)` → `{ year, week }` (year = `GG.legacy.finalYear(state)` when 2f exists, else economy 10); the tour's
    Sad Dome guard and the bots' stay-home weeks (25) read it.
  - UI sockets: title `btn-hof` (when `ui.defined('hof')` and `GG.meta.hof().length`), ☰ `menu-lessons` (GG.tutorial) and
    `menu-hof` (`ui.defined('hof')`), creator `tut-skip` (toggle button, `aria-pressed`, shown when `GG.tutorial.offerSkip()`,
    default on → `GG.main.newCareer({ …, skipLessons })`), HUD `btn-help` "?" (when `GG.tutorial`), wrap line
    `GG.legacy.yearsText(st)`, laptop 10th tab `trophies` → `ui.trophiesPanel(st)` (placeholder `laptop-trophies-empty`) and
    `ui:tab { sheet: 'laptop', tab }`; the `end` screen moved to `5n_ui_ending.js` (stub unchanged); shell anchors
    `/* v1.0 TUTORIAL { */ … /* } */` and `/* v1.0 QA { */ … /* } */` (ten laptop tabs 48 px).
  - Tests: `tests/_pw.js` `PW_VIEW=<w>x<h>` (default 390x844), `PW_TAG` (defaults to `_<w>` off 390x844; `shotName()`), exports
    `VIEW`, `TAG`; fixtures `tests/fixtures/v09_world_y9|v09_y10w14|v09_ended.json.gz` (gzipped 0.9.0.0 slot records made by
    `tools/make_fixtures_v09.js` from the 0.9.0.0 tree: HD good bot World wk 103 saved y9 w12; Frost Heave good bot World wk 104
    saved y10 w14 with `rival.finalNews`; Gravel Kings avg bot ended wk 240, no `legacy`).
  - Baselines: `plan/balance_baseline_v10.txt` (`BAND=all node tools/balance.js 10 30` on 0.9.0.0; stage 0 reproduces it exactly
    apart from the `done in` line); `plan/perf_baseline_v10.txt` (the PERF audit's results; probes in `tools/perf_probes/`).
- **v0.9 "Genres"** (shapes + content keys in `02_contracts.js` CONTENT SCHEMAS; each sim file header has a v0.9 API note):
  - `GG.career` (20): `pool(state, obj, key|path)` (flat + `byBand[bandId]` at any level of the path + optional `byGenre`; the
    byBand/byGenre keys are stripped), `linePool`, `variant(state, baseId)` (`<id>_<bandId>`, `<id>_<rivalId>`, else the base;
    gate + speaker checked), `speakerOk(state, who)` (member of this band, npc in scope, 'recruit', role alias, current rival
    cast id), `cardOk(state, card)` (speaker guard + no effect aimed at another band's member; `cameo: true` passes),
    `talkers(state)` (active, not `silent`), `roleOf(state, role)` ('@front' … C.ROLE_ALIASES), `isAlias`, `resolveWho`,
    `cardRoles`, `memberDef`, `isSilent`, `homeVenue`, `tokenValue`, `firstGigVenue`, `rivalId`, `migrateBand`; tokens C.TOKENS.
  - `GG.fans.pool(s, path, fallback)` (bandbook pools + byBand, items filtered by `gate` / `band`), `homeSuperfan` (the 'dale'
    slot per band); Patreeon chat via `club.payoutChat` / `club.grumbleChat`.
  - `GG.rival` (23): `frontSpeaker(state)` (who posts for the rival: the npc with `frontman: true`), `frontName`, `frontId`,
    `defectorLook`, `setActions(state, kind, n)` → `[{ song, at, action, who }]` (Mall Rats' kickflip); showdown rivals carry
    `genre`, `style` ('ballad' for Chartbusters), `legacy`; fair-fight numbers in `economy.rival.byRival[rid]`.
  - `GG.shop.upgradeView(state, id)` (upgrades[id].bySpace names), `spaceDef` reads `spaces[tier].byCity`, `vanName(bandId, tier)`.
  - `GG.world` (26): `homeRing`, `homeRooms`, `nearRing`, `ringEra`, `inReach(state, venue)` (venue.reach), `takeOverLine(state)`.
  - `GG.tour` (25): `needsMet(s, pkg)`, `payoffDone(s)` (any band's payoff, `cfg().payoffFlags`); bus `tour:payoff
    { packageId, flag, venueId }`. `GG.labels.runLoonies` / `openEnvelope` results carry `bandLine`.
  - `GG.gig` (22): `moments(genre)` → `{ combo, chorus, peak }` (§4.4), `signatures(state)` (+ `perSong`: Marcel's cape spins
    every song), `roles(state)`.
  - `GG.tour.botWeek` books a met story payoff in its window (`economy.tour.bot.payoffCushion` 500, `payoffBurnout` 80);
    `GG.labels.chartView` filler titles come from `GG.content.albumWords.chartFiller` (neutral), never the rival.
  - `GG.audio` (30): `voiceFor(singerId)`, `vocFamily`, `soloFor(genre, soloist)`, `bedFor(spaceKind)`, `noodleFor(member)`,
    `momentShots(kind)`, `voxPitch(voc, profile)` → `{ yodel, vib }` (fixer: the profile's `yodel: false` / zero-depth `vib`
    win); `play`/`timeline` opts `style`, `singer`, `rival`, `soloist`; voice profiles in `GG.content.voices`.
  - `GG.render.garage.photoRig(spaceKind)` → `{ fov, near, far, pos, look, … }` (5l's band photo), `spaceKind(state)`; `peek(kind)`
    is optional and not implemented (the genre card shows the 2D room art). `GG.render.logo.misprint/misprintFor`;
    `R.gearOf(member, contentMember, genre)` (40); stage `info()` adds mics, layout, gear, props, session, drummer, bannerLogo.
  - `GG.ui` (50): `presentLines(list, st)` (a scripted `{ who, text }` exchange minus the lines of bandmates not in the lineup,
    with their set-up question; null when nobody is left to answer), `safeLine`, `ownLines`, `tokens`, `fill`, `pool`,
    `speaker`, `talkers`, `roleOf`, `band`, `space`, `spaceKind`, `driverOf`, `superfan`, `province`, `bandLines`;
    `mechanic(st)` (57: `{ who, shop, fixed, none, self? }`, who fixes the van). Debug `rivalui.snippet` → `{ first, sung,
    singer, voice }` (the current rival song's opening entry + sung hits inside a 5.2 s snippet).
  - Tools: `BAND=<id>|all`, `TUNE='member.skill=N'`, `FIT='venue.genre=x'`, `DECK=synthetic|none` for `tools/balance.js`;
    `LEAK_STRICT` (on by default; `=0` warns) and `LEAK_YEARS` for `tests/sim_bands.test.js`; pw_bands is strict too.
- v0.8.3 drum sync (`11_settings.js`): settings `drumSync` (default true), `syncDisp` (ms 10..40, default 25), calib profile
  `vat`; `GG.prefs.SYNC { M, LEAD, DISP0, DISP_MIN, DISP_MAX, SNAP_EARLY, VIS0, MIN_N }`, `syncLead(disp)`, `syncSnap(J, noteT,
  hit)`, `syncWhen(J', zeroBand, ctxNow)`, `syncP90(samples)`, `syncBlend(prev, p90)`, `syncVisual(off, measured)` (pure,
  seconds). `GG.audio.play(pattern, { at })` starts the song at that AudioContext time (60 ms..3 s ahead). testid `set-drumSync`.
- `GG.shop` (v0.8, header of `2a_sim_shop.js`): `cfg, content, init, ensure, migrate`; gear `gearItems, gearDef, gearName,
  ownsGear, canBuyGear, buyGear, kitTiers, kitDef, canBuyKit, buyKit, ownsSection, unlockSection, gigBonus, writeBonus,
  crowdBonus`; spaces `spaces, spaceDef, availableTier, canMove, move, rent, perks, perkFactor, upgrades, upgradeDef,
  canBuyUpgrade, buyUpgrade`; van `vans, vanTierDef, vanName, vanQuote, canBuyVan, buyVan, renameVan, vanUpgrades,
  vanUpgradeDef, canBuyVanUpgrade, buyVanUpgrade, vanMods, stickers, sticker, banSticker`; merch `merchDef, merchItems,
  merchView, tierUnlocked, unlockMerch, setTable, toggleTable, setPrice, priceOf, priceRange, stockCost, canBuyStock,
  buyStock, pile, hauling, priceCurve, sales, demand, estimate, gigMerch, misprint`; week `forcedCard, afterCard, apply,
  weekly (wrap.shop), cards, card, effectText, botValue, botWeek`. Buys return `{ ok, cost, deltas }` or `{ ok: false, why }`.
  Events `shop:buy|unlock|move|rename|sticker|misprint|merch`. `GG.fans.merchMods(s, r)`; `GG.songs` extras above;
  `GG.audio.kitFor/kitQuality/qualityFor`. Debug `GG.debug('shop')`.
- `GG.logo` (v0.8.1, header of `2e_sim_logo.js`): `content, emblems, styles, palettes, emblem, style, palette, key, same,
  defaultFor(bandId|genre), sanitize(logo, bandId?), get(state), ensure(state), rival(id, genre?), findRival(name), rebrandCost,
  canRebrand, rebrand(state, logo) -> { ok, cost, buzz, logo, deltas } | { ok: false, why }, prepare(logo, bandId), pending(bandId?),
  init, migrate, carry.{key, read, write}`. Event 'logo:changed'. Debug 'logo'. `GG.render.logo` (46): `canvas(logo, name, size,
  { shape, aspect, badge, mini, plain, textOnly }), texture, dataURL, forState, forRival, nameOf, head(g, o), merch(logo, name,
  itemId, size), palette, split, emblemIds, info` (debug 'render-logo'). `GG.ui` (5m): `openLogo({ mode: 'new'|'rebrand', bandId,
  genre, band, logo, onDone }), logoImg(logo, name, size, opts), bandLogo(st, size, opts), rivalLogo(id|'you', name, size, opts),
  logoPanel(st, rerender), logoMerch(st, itemId, size), logoBroadcast(st, { winner, won, category })`; screen 'logo'; debug 'logo-ui'.
- `GG.ui` v0.8 shop (header of `5k_ui_shop.js`): `openGear(), openMerch(), showVan(tab 'van'|'space'|'dealer'), vanSide(st, { tier, stickers }),
  vanUpgradesPanel, spacePanel, dealerPanel, shopChips(deltas.shop), merchResult(r.merch), isMerchLine, shopWrap(w), shopWrapShown(w),
  playCollector(done)`. Screens `gear`, `merch` (tall sheets), `van-info` (tabs), `shop-collector` (full). Debug `shopui`.
  Render: `GG.render.van.setTrip({ tier, stickers })`, debug('render').space.
- `GG.creator` (v0.8, header of `2b_sim_creator.js`): `cats, part, partsIn, partFor, parts(state, cat?), isUnlocked, gateMet,
  gateText, draftState(genre, carry), grant, checkUnlocks, check(state, source), weekly(state, wrap), knuckles, headText, isV8,
  sanitizeLook, expand, syncPerson, stageOnly, lockLook, stageLookFor(who, contentMember?), legacyKit, newKit, sanitizeKit,
  lockKit, kitLook(player), isArena(venue|gig), prepare, pending, init, migrate, apply(state, { look, stageLook, kit })`,
  `carry.{key, read, write, count}`. Events 'creator:unlocked' { ids, names, source }, 'creator:changed' { state }.
  Render: `R.charGeometry(ctx, L, o, raw)`, `R.kit.{norm, hardware, sticks, has, shell, throne, cowbell, fan, fanBlades, flame,
  pyroBase, headArt, disposeArt, garage}`, `R.pixelFont`, `GG.render.preview.{mount, set, turn, unmount, info}`.
  UI: `GG.ui.openLook({ mode: 'new'|'career', look, stageLook, kit, genre, band, carry, onDone })`; debug 'creator', 'creator-ui'.
- `GG.tour` (v0.7, header of `25_sim_tour.js`): lookups `regions, region, cityDef, cities, venue, venues, vehicles, stays,
  extras, climate, fit, pkg, departWindow, legKm`; state `init, ensure, migrate, threshold, unlocked, unlock, invite`;
  views `map, regionView, status, summary, charts, gong, packages`; booking `quote, canBook, book, cancel`; the week `active,
  away, here, stop, regionOf, abroadFans, monday, forcedCard, afterCard, fillText, blockId, allowedBlocks, block, beforeGig,
  listings, makeGig, estimate, draw, silentCrowd, shape, afterGig, travel, startTrip, roadCardOk, weekly, rivalWeekly,
  runGong`; bots `botWeek = botTour, botPlan`. Events `tour:*` (see header). `GG.calendar` + `seasonIn, seasonAt`.
- `GG.ui` v0.7 (header of `5i_ui_tour.js`): `openWorld()`, `tourRegionMap(st, region, {sel, route, counts, onSel, testid})`,
  `worldPanel(st)` (laptop World tab), planner hooks `tourBlocks, tourAct, tourForced, tourPlanHead, tourOpenDate`,
  `tourCardNote(st, card)`, `tourBoard {on, title, map, strip}` (56 board), `tourWrap(w)` (52 wrap), moments
  `flightDue/playFlight(done)` (60 beginWeek), `gongDue/playGong(done)` (60 wrapWeek, before endWeek), `playMoose(done)`.
  Screens `world`, `tour-region` (full), `tour-pkg` (sheet), `tour-flight` (full), `tour-home` (sheet), `moose-opera`
  (full), `gong` (full, live3d). Debug `tourui` {gong, mooseDue, flown}. `GG.render.stage.info()` + `dress, silent,
  bowing`; `stage.moment('applause')`; `van.setTrip({ region, look })`, `van.info()` + `region, look`;
  `carpet.setup({ sign })` + `info().sign`.
- `GG.rival` (v0.6, header of `23_sim_rival.js`): `init, migrate, get, cfg, cast, cards, venue, name, skill, heat, addHeat,
  record, lineup, leaderboard, weekly, monday, pending, schedule, next, forcedCard, afterCard, enter, pass, botWeek,
  showdown (UI setup), setScore, resolve, shape, loonies, strength, chartEntry, crack, final`. Tunables `economy.rival`.
- `GG.career`: contract commands + `choiceHint, rollChance, gatePasses, applyEffects, cardById, band, memberName,
  pickLine, contentLines, botWeek, botOffer, postChat(state, who, text, d, tone)`. startWeek/runWeek/endWeek are
  double-call safe. v0.4: effect keys `member`, `payCut`, `repay` (runtime-added to EFFECT_KEYS), token `{recruit}`,
  `state.card.who/whoName` on forced drama cards, cardById also finds drama + quirk cards.
- `GG.drama` (v0.4): `weekly, forcedCard, afterCard, applyMember, roles, holder, holes, openHoles, lineup,
  fillInFigures, payCut, setPayCut, split, fillInCost, gigMods, want, gripeText, stageText, postAd, repost, cancelAd,
  hire, candidates, candidateScore, hireFillIn, dismissFillIn, quirk, traitDef, rivalBlurb, makeLook, botWeek,
  botCardChoice, botValue, migrate, cards, cfg`. Tunables `economy.drama`; content `drama.js`, `recruits.js`.
- `GG.gig` v0.6.2: `chart(song, {solo, extras, free, difficulty, thumbs:false = raw})` → `{notes, auto, total, ...}`;
  `THUMBS` (2), `THUMB_PRIORITY`. v0.7.2: `DOUBLE_GAP`, chart `doubles` + opt `doubles: false`, NOTE `dbl, t2, hitT`
  (CHART/NOTE shapes in 02_contracts); `GG.render.stage.kick2()`.
- `GG.gig`: `makeGig, randomOffer, autoResolve` = `simulate(state, gig, rng)` (pure) + `applyResult(state, result)`
  → v0.3 replaces `simulate` with the rhythm game and keeps `applyResult`. Also `bookLocal, venue, fit, qualifying,
  performance, gradeFor, payFor`.
- `GG.songs` (v0.2): `rate(p, genre, gear) → {groove, hook, difficulty, notes, tips, sections}`, `verdict, validate,
  sanitize(p, gear, genre), generate(genre, rng, {gear, wild, arrangement}), starter, signature, patternFor(state, key),
  similarity, toNotes → [{beat, lane, section, entry, bar, step}], beats, seconds, create(state, p, title, opts), jam,
  addStarter, pickTitle, ability, byId, score, best, polish, played(state, ids, grade) → new classics, weekly,
  reactions, kickBlocked, setHit, isHit, blankSection, ARRANGEMENTS, ARRANGEMENT_IDS, arrangementId, genre(id)`.
  Tunables: `economy.songs`; genre data: `content/genres.js`; lines: `lines.songReactions`, `lines.writeTips`.
  v0.6.2: `grooves(genre)` (content/grooves.js), `presets(genre, gear)` → `[{id, name, desc, signature, pedal, locked, bar}]`,
  `applyPreset(p, section, id, gear, genre)`, `presetOf(p, section, genre, gear)`, `modify(p, section, modId, gear, genre)`
  → `{pattern, before, after}` (pure), `tempoLabel(genre, bpm)`.
- `GG.save`: `write, read, readRecord, list, remove, autosave, toCode, fromCode, migrate, storageOk, settings,
  saveSettings, init, KEYS, compress/decompress`. Keys `gg.v1.slot.<auto|1|2|3>`, `gg.v1.settings`.
- `GG.render`: `init, available, setScene, syncState, setPaused, goToHotspot, hotspotScreenPos, memberScreenPos,
  setViewInsets({top,bottom}), pickAt, worldToScreen, playerScreenPos, isPaused, defineScene(name, factory),
  buildCharacter(look, opts)`. ~26 draw calls. Later scenes (stage, van, red carpet) register via `defineScene`.
- `GG.ui` (50_ui_core toolkit): `define, show, close, closeAll, replace, top, isOpen, hasFull, confirm (Promise), toast,
  bubble, tabs, bar, deltaChips, avatar, el, btn, pick, rng` + week helpers. Screens are full / sheet / modal layers.
- `GG.main`: `quickStart({seed,slot,name,openCard,bandId,presetId}), newCareer, load, loadState, enterGarage, route,
  beginWeek, afterCard, wrapWeek, nextWeek, saveTo, quitToTitle, sync`. URL `?quick=1&seed=N`.
- `GG.audio`: `unlock, sfx(name), setMuted, isMuted, toggleMuted, suspend (also stops a song), resume` + v0.2
  `play(pattern, {genre, section|null, loop, backing}) → handle {stop, update(p), beatAt(time), playing, start, bpm}`,
  `stop, isPlaying, current, hit(lane, when?) (v0.6.2: optional AudioContext time, < 1 s ahead), timeline(p, opts) → {bpm, beats, style, events[{beat, kind, lane|midi, len, gap}]},
  styleFor(genre, bpm), renderOffline(spec) → Promise<{peak, rms, nan}>`. Events: 'audio:step' per 16th, 'audio:end'.
  v0.5.1 `context()` (the gig clock). v0.6.1: `play` opts `vocals, songId (seeds the key), metronome` (handle `.key`,
  `.genre`); mixer `setVolume(bus,0..1)` (null for unknown bus; gain = v²) / `getVolume` / `volumes()` over C.MIX_BUSES;
  `metronome() / setMetronome / toggleMetronome`; `applySettings()` (re-reads mix/metronome/brushes/muted; also run on
  'settings:changed' for those keys); `keyFor(seed, genre) → {tonic, offset, mode, name}`; `roomFor(gig)` →
  dry|room|hall|theatre|arena, `room()`; `ambience()` → garage|van|gig|none, `refreshAmbience()`, `radioSong(state)`;
  `renderOffline` extras `{full, songId, vocals, metronome, room, variant}` / `{ambience}` → also `counts`, `key`.
- `GG.ui` v0.2: `LANES` (lane name/icon/colour for the v0.3 highway), `composeWeek(n, done), openSketch, openSong(id)`;
  screens `seq` (full) and `seq-tools` (modal). v0.6.2: `seq` write mode has `D.guided` / `D.step`
  (verse|chorus|bridge|tempo|order|name); debug `seq` adds `guided, step`; debug `gigui` adds `auto, autoPlayed`.
- Tests: `node tests/run.js` (content 21, save 7, sim_career 18, sim_gig 7, sim_songs 12) · `pw_flow.js`
  META_ONLY=flow|year|code|layout (flows jam their Write blocks) · `pw_garage.js` META_ONLY=garage (48) ·
  `pw_seq.js` META_ONLY=seq (34, screenshot `tests/.cache/seq.png`; also runs guided)|guided (23)|audio (38).

- v0.8.1 `GG.licensing` (2c): `cfg, content, brands, brand(id), init/ensure/migrate, fame, eligible, chance, cap, open,
  offer(id), current, quote(s, o, counter?) → {fee, cut, net, label, share}, walkChance, makeOffer(s, rng),
  answer(s, id, take|decline|counter, d?) → {ok, why?, id, brandId, choice, status, fee, cut, net, countered, success,
  outcome, deltas}, weekly(s, rng, wrap) → wrap.licensing {offer, expired}, forcedCard → {card, who}, afterCard, cards,
  card, fanCards, isScandal, isOffer, effectText, fillText ({brand} {adwhat} {adsong} {adfee} {adcounter} {adtake} {adodds}
  {adleft}), income(s, from?, to?), botChoice, botWeek`. Events `license:offer {offer}`, `license:answer {offer, result}`,
  `license:expired {offer}`, `license:fury {brandId}`. `GG.recap` (2d): `init/ensure/migrate, startYear, gig(s, r),
  build(s) → RECAP, list, get(s, y), events(s, rec), headline, goodYear(s, rec) → [{who, text, good}], nth, awardName,
  regionName`; event `recap:built {recap}`. `GG.fans.queue(s, cardId, who, source)`. UI (5l): `GG.ui.openRecap(year,
  then?), recapPhoto(state, year) → dataURL|null, openOffer(id, after?), offersLine(st, rerender), recapPanel(st),
  licenseWrap(wrap)`; screens `recap` (full), `offer` (sheet).

