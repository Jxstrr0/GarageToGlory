# Garage to Glory: status

Read this first every session. Don't re-explore the codebase to rebuild context.

## v1.1 owner answers (2026-10-03, LOCKED)
- String-seat average-bot balance (~+7–8% over drums, inside seed noise): **leave it**; re-check with paired seeds in 1.2 Tuning.
- A lead part you write replaces the shared rhythm-guitar pair in those sections; an empty part section is silent: **keep**.
- Leftovers for later: wip-v11-a / wip-v11-c / wip-v11-fix branches on origin (the session proxy can't delete branches; the
  owner can delete them on GitHub), cosmetic + content gaps in `plan/v11_integration_report.md`.

## v1.2 owner answer (2026-10-03, LOCKED)
- Listened to the 1.1 vs 1.2 clips (4 genres, taps, sampled-kit metal): **ship** as built. Tonal changes stand (metal drums
  ~+2 dB from the sampled kit, punk mids fuller, rock 4k+ lower, rock/country bass ~-2 dB below 150 Hz).
- Leftovers: owner deletes `wip-v12-f`, `wip-v12-i`, `wip-v12-v`, `wip-v12-lead` (and any `wip-v11-*` still there) on
  GitHub (the session proxy can't). Open gaps: `plan/v12_integration_report.md` §8 (strings warm only in gigs, rival
  players share one tightness, gang vocals centre + right, Classic-off keeps 1.1 vocals until reload).

## v1.3 owner answer (2026-10-04, LOCKED)
- Saw the 440x956 screenshots (Quick song, editor rhythm/lead/drums, ⋯ menu, chord sheet, start-over ask, 390 editor) and
  heard the slider-extreme clips: **ship** as built.
- Leftovers: owner deletes `wip-v13-s`, `wip-v13-a`, `wip-v13-u`, `wip-v13-lead` (+ any `wip-v12-*` / `wip-v11-*` left) on
  GitHub. Open gaps: `plan/v13_integration_report.md` §8/§9 (per-chord thirds, slider-song career balance, swapped drummer
  animates straight, Feel 4 at 220+ bpm squeezes 16ths, chip long-press preview, Energy monotonicity minor M7).

## Version
- Current: **1.6.0.0** "Showtime" (shipped 2026-10-10, owner check: ship; Addendum 9, `plan/v16_report.md`) = 1.5.1.0 "PC
  polish" + the animated gig highway (juicier hits, living notes, moving highway, combo fire) + Settings "Less motion".
  See "What's in v1.6" / "What's in v1.5.1" / "What's in v1.5". **Update Current/Next at every merge.**
- Next: the owner playtest per D5 (years 1-3 on drums, then 3-6) -> small patches. v1.5 PC polish list (report section 7
  gaps), all done in v1.5.1 (in review): [x] Drum kit / Gear shop labels touch at 1280x720 with the planner open; [x] PC gig
  score card; [x] keycap legends in panel footers; [x] calibration progress dots; [x] Settings rail follow; [x] songwriter
  lane icons clipped. Still open: size +92 KB over the +60 KB soft budget (v1.5.1 adds ~8 KB).
- IGNORE: the owner's 2026-10-08 "engine market / buyers" message was sent to the wrong chat. It is not this game; never build it.
- Shipped: 0.1 Garage · 0.2 Sequencer · 0.3 Stage · 0.4 Drama · 0.5 Signed (+ 0.5.1 gig-clock hotfix) · 0.6 Rivals
  (+ 0.6.1 Addendum 1 catch-up, 0.6.2 two thumbs + guided songwriter) · 0.7 World (+ 0.7.1 3D title, 0.7.2 Heavier:
  English titles, layered crowd, heavier metal, double kick) · 0.8 Kit (+ 0.8.1 licensing deals, band logo, year-end recap,
  0.8.3 drum sync) · 0.9 Genres · 1.0 Glory (+ 1.0.1 smart bridge) · 1.1 Seats · 1.2 Soundcheck (PR #23) · 1.3 Songwriter (PR #24, + 1.3.1 Simulate + Gear shop, PR #25) · 1.4 Tuning (PR #26) · 1.5 Desktop (+ 1.5.1 PC polish) · 1.6 Showtime.
- Next: owner check of 1.5 (one popup: ship / tweak; shots `scratchpad/v15_owner/`), review (3 lenses), PR to `main`. Still
  open from v1.3 (`plan/v13_integration_report.md` §8): per-chord thirds, slider-song career balance.
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

## What's in v1.6 "Showtime" (Addendum 9; `v1.6-showtime` 2026-10-09, in review; report `plan/v16_report.md`)
- **Highway fx** (`src/55f_ui_gigfx.js` = `GG.gigfx`, hooks in 55's draw; visuals only, every effect under the gems): hits pop
  with sparks + a shockwave ring, Perfect a bigger flash + a lane beam; a miss cracks the gem in two at the hit line and the
  hit line flickers red; gems glow, shine and pulse on the chart's beat (size / brightness around the centre, y untouched);
  hold tails shimmer; the lanes scroll a faint texture at the notes' speed, lane edges + beat lines pulse, the strip lights up
  as the combo grows; x10 / x25 / x50 heat the zone (amber, orange, white-hot) with lane flames on its top edge; x50 adds a
  star shine (cyan sweep, rails, hit line, counter). Fixed 96-particle pool (<= 300 ms), sprites built at layout.
- **Less motion** (Settings > Look + feel, after Reduced flashing; key `lessMotion`, default = the OS prefers-reduced-motion
  until the player picks): calm = the 1.5 highway + the combo colour + a simple hit pop + a soft miss tint. Graphics Low and
  the frame governor stepping down fall back to calm (latched per song). Reduced flashing: no beam / tier pop, soft miss tint.
- Test hooks: `GG.ui.gigLiveBot` (real-time seeded bot on a 50 ms song-time grid), `GG.gigfx.force`, debug('gigfx');
  tests `fx.test.js`, `pw_fx.js`; `tools/fx_look.js` (owner stills + clips), `tools/perf.js gig FX=full|calm`.

## What's in v1.5.1 "PC polish" (`v1.5.1-polish`, 2026-10-09, in review; report `plan/v151_report.md`)
- PC only (gg-desk / gg-wide; phones unchanged, pw_freeze equal): garage labels never overlap on a computer (41 `unclash`:
  vertical nudge, eased; labelBox includes it); the PC gig score card right of the highway (points 100 a perfect / 50 a
  good, combo, hit share + bar, "Esc pause" inside; hidden below 1000 px); footer key legends as keycaps (kb-hints, text in
  data-text); key calibration progress dots + the docked panel fitted to its content; Settings rail follows the scroll
  (.on + aria-current); songwriter 5 / 6-lane headers on one line in the PC layout (icons no longer clipped). VERSION 1.5.1.0.

## What's in v1.5 "Desktop" (Addendum 8; contract `plan/plan_contract_1.5.md`; lanes I, N, W + lead on `v1.5-desktop` 2026-10-08)
- **Gig keys** (55, Lane I): physical keys (`KeyboardEvent.code`), default drums Space kick / D snare / F hats / S crash /
  Shift toms / A ride, strings A S D F (+ Space top on 5, Shift 5th + Space top on 6); rebindable in Settings > Keys (two maps:
  kit + strings); keycaps on the lanes; same judge + windows as touch; key calibration (`calibKb`, click test + light check);
  Esc pause, focus lost = frozen pause on keys; 600 ms card arm; v1.4 J K L G H keys kept as hidden extras.
- **Menus on the keyboard** (50k router + 50 focus manager, Lane N): Enter/Space confirm, Esc back/close, arrows/Tab move
  (focus ring only in `gg-kbnav`), digits 1-8 walk the garage (kb-spots), songwriter grid keys, "Leave without saving?" asks.
- **PC layout B "Centred wide column"** (5w CSS + 40/42/60, Lane W): Auto on a computer >= 1000x560 and wider than 1.2 x
  tall (Settings Layout: Auto / Phone / PC); wide bottom panels with two columns, centred full screens, songwriter tools | grid,
  Settings rail, docked key calibration, a wider highway under the stage, 2.4 MP pixel budget at 1920 dpr 2.
- **Phones unchanged**: everything gated on `html.gg-wide / gg-desk / gg-keys / gg-kbnav`; `pw_freeze` equal at 390 / 440 /
  844x390. Note: `META_ONLY=all` runs nothing in `pw_freeze`; use `META_ONLY=390,440,844l` (or none).

## What's in v1.4 "Tuning" (Addendum 7; build `plan/v14/build_report.md`; on `v1.4-tuning` 2026-10-06/07)
- **M1 "Gigs pay, side jobs less"** (content numbers): start fund $450 (was $300); tier-1 rooms pay x1.6 but never more than
  tier 2 (`GG.world.tierPay` + tierStep: on average **+47% flat, +29% door**, not the popup's flat +60%); gas half price in the
  garage era, **80% until signed**, then fading to full over 12 weeks (`GG.career.earlyMoney`; no cliff at signing; a band that
  never signs loses it 48 weeks after Local Heroes); open mics (and BotB) cover $40 of gas; a great show pays more (S +25%,
  A +10%, same fade; nobody docked; never on a BotB prize); ride $200 (was $350), pedal $250 (was $300); Hustle x0.7 in the
  garage, x1 at Local Heroes (was 1 / 1.3). The gig results show **Pay / Band's cut / Gas** and "Into the fund" naming every
  other part of it (fill-in, management 15%, crew, tow, merch) so the row adds up (testids gig-pay, gig-cut, gig-net,
  gig-net-part). The HUD fund chip never clips ($1,018 in full, $12.3k compact; exact amount in its toast).
- **M2 "Fair grades"**: the crowd's flow (a running combo warms the room) runs on every seat (was string seats only): the same
  hit share earns the same score, grade and pay on the kit as on bass. Charts unchanged.
- **M3**: the jam room costs $35/wk until you sign, then $60 (card `shop_space_1` + band variants and the shop say both).
- Seat line: the swapped member on a string seat no longer wants "solos". No new state key (SAVE_SCHEMA 10), old saves load;
  the played-gig fingerprint was re-pinned on purpose (logged). dist 5,244,808 B.
- Measured (`plan/v14/probe_after.md`, §12 after the review fixes): gig-first year-1 parents' loans drums 98% -> 53%, bass
  95% -> 45%; Hustle-heavy bots ~0%; gig-first drums Y3 loans 60% -> 35%; drums-minus-bass score at equal accuracy -1.22 ->
  +0.36; years 4-10 within seed noise over 80 seeds (|z| <= 1.6); year 3 richer for bots (watch: avg bass +54%, z 3.1).

## What's in v1.3.1 "Simulate" (plan `plan/plan_1.3.1.md`; lanes G, S + lead merged on `v1.3.1-simulate` 2026-10-04)
- **Simulate this gig (G):** the setlist sheet's foot has [Auto-pick] [⏩ Simulate this gig] above the big "Start the show". One tap
  plays the REAL show headlessly (`GG.gig.botPlay`, a song every 350 ms, "Simulating the show… song 2 of 4") at your own average
  (`state.playLog`: the last 5 PLAYED gigs on this seat, same difficulty first; < 2 -> the band's level), then the normal results
  (+ "⏩ Simulated at your average (last 3 gigs, 83% hit)") and the normal apply (pay, fans, buzz, rep, trophies: everything counts).
  Story shows are played: rival showdowns, the festival (botb / tour slot), the final, a pending rival night, the first lesson gig
  (a dim note instead). Simulated gigs never enter the average; a reload mid-simulation finishes it simulated. Played gigs score as 1.3.0.
- **Gear shop (S):** a green "Gear shop" label in the garage (under Drum kit / Your rig; tap = walk there + your seat's shop; 2D
  fallback `hs-shop`) and a "🛒 Shop" button in the sketch pad header (Quick song + editor; the ⋯ row stays). A hotspot tapped where
  you already stand opens 0.35 s later (the tap's own click no longer closes the new sheet).
- Saves: `state.playLog` optional (SAVE_SCHEMA 10); old saves load unchanged. dist 5,236,063 B.

## What's in v1.3 "Songwriter" (contract `plan/plan_contract_1.3.md`; lanes S, A, U + lead merged on `v1.3-songwriter` 2026-10-04)
- **Quick song, then tweak (U + S, S4):** a fresh Write block opens Quick song: 5 recipes per genre + "Surprise me" in 2 columns
  (metal Neck-snapper, Doom crawl, Thrash attack, Stadium anthem, Gallop (pedal); punk Three-chord sprint, Laundromat D-beat,
  Pogo party, Circle pit, Skate rat; rock Arena anthem, Lighter-waver, Bar boogie, Bleacher stomp, Highway driver; country Train
  song, Legion two-step, Sad waltz, Barn burner, Porch swing), pedal recipes locked (toast names the pedal) until the double kick
  is owned; ▶ Play loops it, Tweak ✎ opens the editor, Save ✓ is one tap. A queued sketch opens the editor; the sketch pad = the
  editor when a draft exists, else Quick song (D10).
- **Sliders for every seat (S + A, S3):** Energy (sparse ↔ busy: drum ops + part mods), Mood (5 rungs, the parallel key: same key
  note, new mode / scale / thirds; native rung = 1.2), Feel (straight ↔ full triplet shuffle; steps, bar lines and count-ins never
  move; the chart warps with the band), Fills & surprises (none ↔ a real fill on bar 4 of each section, Q2), Tempo (on a 5).
  Energy / Mood / Fills / a recipe recompose (seeded, D14: two song slots give two songs); after hand edits they ask first (Q3:
  "Start over from this recipe? Your hand edits go." Keep my edits / Start over); Feel + Tempo never rewrite notes.
- **More rows + per-bar chords (S + A + U, S2):** rhythm Chug / Open / Root / 5th / Oct / Scratch (a dead strum), bass Low 5th /
  Root / 3rd / 5th / 7th / Oct, lead Low / 1-5 / High (part v2; a v1 part plays and rates as 1.2 until its first edit); 4 chord
  chips per section (BAR n + the chord, home outlined green) with a chord sheet (the mood's roots + "Back to <progression>");
  "Chords: <progression> ▾" / "Hook: <name> ▾" picker; chips name what the band strums (rung third on every bar) and spell one
  way per song (flats in flat keys). Gig lanes keep the pitch shape (Q1); Scratch charts on the root's lane; break bars take a
  chord too (Q4; new songs still start them on home).
- **One flow, Clean sheet (U, S6 / S7):** header ✕ / title + "Write block n of m · <seat>" / ⋯; underline tabs (Verse / Chorus /
  Bridge / Song, a dot on a tab with a fill bar); one slim meter strip (Groove / Hook / Diff, ± flash); a one-line coach bubble with
  the bandmate's avatar (tap for the full tip); "Your part | Drums" toggle; the grid fills the screen (no scroll at 440x956, part
  rows ≥ 26 px); foot ▶ Loop / ▶ Song / Save ✓. ⋯ holds the band jam, the metronome, Back to Quick song, the shop + practice
  (sketch), Beat for this section (the 0.6.2 grooves, D8), Bar 4 fill, copy / clear, part tweaks, remove Solo / Outro. Guided /
  Advanced modes are gone (`settings.songwriterMode` ignored, D18). Same navy as the rest of the game.
- **Ratings (S5):** notes only (a section with a fill counts 3/4 main + 1/4 fill); a slider-built song can reach the top (every
  genre x seat x gear: ≥ 2 recipes reach groove ≥ 90 + hook ≥ 85; table in `plan/v13_lane_s_report.md`).
- **Compatibility law:** a song / pattern / part / save without the v1.3 fields sanitizes, rates, charts, renders and saves as 1.2
  (`tests/compat_v12.test.js` over 708 corpus entries x seats; STAGE0 1,212 timeline fingerprints; Classic 232/232).
- **§0 defaults (no popup; the owner may object):** D1-D18 in the contract §0 (chords on the pattern, chips on string seats only,
  Mood = parallel key, Feel = 8th shuffle, Solo / Outro no chips, Beat sheet in ⋯, rows ≥ 26 px, seeded compose, view read-only).
- **Leftovers:** `plan/v13_integration_report.md` §8 (weakest defaults: country Sad waltz / Legion two-step groove 80-88, punk
  Three-chord sprint hook 68-78; strict variety 0-4 % of careers; per-chord thirds; swapped drummer on straight steps).

## What's in v1.2 "Soundcheck" (contract `plan/plan_contract_1.2.md`; lanes F, I, V + lead merged on `v1.2-soundcheck` 2026-10-03; shipped PR #23)
- **The band plays like people (F, `31_audio_feel.js`):** every player's timing + velocity from their skill (`A.tightness`: sloppy
  garage band -> tight arena band; AR(1) drift per player, seeded, re-planned per loop pass) + a per-genre push (punk rushes,
  rock lays back, metal locks in: `genres.js backing.feel`); accents by beat position and section (F4 map + ramps into a new
  section); F16: mood < 30 -> spread x 1.25, studio takes (van radio, recorded songs) t + 0.25, rivals t + 0.15. The gig clock
  is untouched: step events never move; band kick/snare +-6 ms, other kinds +-15 ms in gigs, +-25 ms outside, <= 25 % of a 16th.
- **Your taps (F):** `A.tapVel` = judgement (Perfect 1 .. stray 0.62) x beat position (downbeat hardest) x alternating hands on
  fast hats; auto strokes at `A.TAP_AUTO`. One gain law everywhere: `A.velGain(v) = min(1.333, (v / 0.85)^1.5)`.
- **Real-feeling instruments (I, `32_audio_dsp.js` + 30):** drums by velocity (DRUMS2 recipes, round robins + velocity layers per
  `C.REALISM[tier]`, kit stereo, the widened PRE serves taps AND song drum events, built in slices); Karplus-Strong guitars and
  bass (KS cache, `A.warm` during the count-in, LRU 8 MB; a miss plays the 1.1 oscillator); cab IRs by kit tier (F16.3: milk
  crate 1x8, pawn 1x12, pro/arena the genre cab); rooms v2 (pre-delay, early reflections, darker tails, a vocal plate); kick
  ducks the bass; drum parallel crush by tier. Cheap gear still sounds cheap (N4).
- **The TMKD "Vortex" sampled kit (I, F17):** metal at pro + arena tiers (kick, snare, 3 toms; DIRECT mics; MP3 in
  `src/content/kit_tmkd_vortex.js`, 433 KB), credit line on the title screen + README Credits + `kit_tmkd_vortex.LICENSE.md`.
- **Human vocals (V, `33_audio_voice.js` + 30):** glottal waves by press, 5 formants with F1 tracking, singer's ring, shimmer,
  natural pitch curves (scoop, vibrato onset, 1/f wander), doubles on choruses, 3-voice gangs, a vocal chain (HP, comp, presence,
  air), plate + tempo delay sends, the guitars' presence dips -3 dB under a lead vocal (`r.carve`).
- **Safety:** `GG.audio.classic(true)` (hidden, debug-only; `settings.audioClassic`) = the 1.1 sound node for node (232-case hash
  fixture equal); no `vel` = the 1.1 code path; `A.timeline()` unchanged (1,212 fingerprints); voice cap 32; no AudioWorklet.
- **Numbers (F13, `plan/v12_audio_numbers.txt` "1.1 vs 1.2"):** full-mix RMS within +-1 dB of 1.1 per genre (metal +0.9, punk
  +0.1, rock +0.2, country +0.2), 4k+ down 0.5-2.4 dB, peaks <= -4.7 dBFS; one re-balance (metal + punk KS bass excitation,
  for pw_seq `heavy`'s "heavier" low end). Size 5.12 MB (gate 6.0 MB).
- **§0 defaults (no popup; the owner may object):** Classic hidden, default off; VEL_REF 0.85 = the 1.1 level; the gig clamps above.
- **Leftovers:** see `plan/v12_integration_report.md` §7 (rival members have no skill -> t 0.65; metal gang centre + right;
  voiced murmur before b/d/g; Classic off after on keeps the 1.1 vocals until reload; `opts.feel === false` unused).

## What's in v1.1 "Seats" (contract `plan/plan_contract_1.1.md`; lanes D, B, C, A + lead merged on `v1.1-seats` 2026-10-03)
- **Pick a seat (lead, 51):** title → slot → genre → intro → **seat** → logo → creator → cold open. Four cards (drums preselected),
  each says who moves to the drums (`bands.<id>.seatLines`) and your stage spot; a tap plays a ~3 s preview of that seat's
  part (`GG.audio.seatPreview`); "Your seat is yours for the whole career". Swap table (E3): Hail Damage bass Kenji / rhythm
  Jaxon / lead Dana; Frost Heave Moth / Rox / Benny; Gravel Kings Tamara / Chase / Lenny; Ramblers Duke / Travis Lee / Earl.
  Rox, Chase and Travis Lee sing from the kit.
- **Play it (B + D):** string lanes on the same highway (bass ≤ 5, guitar ≤ 6) by pitch contour; taps + holds (rings), 2-lane
  chords on Hard/Expert rhythm, runs; your instrument plays through the band's sound (`pluck / strum / lead`, release gates a
  hold); the backing mutes your kinds, so a miss is silence; the lead gets the solos (whammy bends with amp tier 2).
- **Write it (B + D):** "Your part" in the songwriter: a progression (bass, rhythm) or hook (lead) per section + a 2–5 row grid;
  the swapped drummer suggests the groove (drum layer you can tweak); the whole band follows your chords.
- **See it (C):** the stage's over-the-shoulder spot camera (bass stage-left, rhythm stage-right, lead front-left), you with your
  instrument (3–4 body shapes per seat, colour, guard, headstock logo sticker: the creator's "Your gear" tab), the swapped
  drummer on the riser (boom mic when they sing; the fill-in drummer if they quit), "Your rig" in the garage, the carpet pose,
  the recap photo and the van gig bag.
- **Live it (A + B):** ~150 audit lines tokenised or gated (strict 10-year seat leak scan clean), 12 first-week + 48 Monday
  cards for the swapped drummers, three role arcs (Nobody Hears the Bass · The Engine Room · Solo Too Long) + 12 band finales,
  player epilogues per seat, swapped-drummer epilogue variants, the shop's parody gear names per seat at drum prices (one buy
  grows your rig and the band's kit), coach lines per seat, four seat achievements (Low End, The Engine Room, Solo Too Long,
  Musical Chairs).
- **The drum seat is unchanged:** drum timelines byte-identical (1,212 fingerprints), drum-only balance identical to 1.0.1.0's,
  every existing test green.
- **§0 defaults (taken without a popup; the owner may object):** the seat is fixed for the career (old saves load as drummers);
  `drumSkill` stays the chops stat for every seat; the swapped drummer keeps driving when they are the driver; metal rhythm =
  Jaxon, metal lead = Dana; the title stays Hail Damage's garage with the drummer at the kit; seat gear = the drum gear economy
  renamed per seat (bass's 350 item is "the fridge" cab, the lead's whammy comes with amp tier 2); `gear.seatLanes / runs` only
  on string-seat careers; the backing mutes whole kinds; `{sticks}` reads "picks" on string seats, `{instrument}` "guitar" for
  rhythm and lead; `'@drummer'` = the swapped drummer.
- **Leftovers (back burner):** avg-bot balance tilt on string seats (+7 % fans, inside seed noise; good bot within ±10 %);
  A's forceWeek-2 first-week cards, weekly mood chat not seat-aware, no string-seat tutorial walk/write twins; C's cosmetic
  camera note (Ramblers rhythm: Clementine fills part of the view) (details: `plan/v11_integration_report.md` §4; the chip
  overlap, the spot camera's cymbal and the review findings are fixed: §5).
- **Open owner choices (D):** on metal/punk/rock lead your written part replaces the shared rhythm-guitar pair in the sections you
  write; a part section with no hits is silent.

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
- [x] v1.1 lanes A–D + lead integration (E3–E10), `pw_seats.js`, seat leak scan, balance per seat — integrated 2026-10-03 on
      `v1.1-seats` (`plan/v11_integration_report.md`); review + PR to main pending
- [ ] Tuning (D5) covers all four seats — moved to **v1.3** (Addendum 4, N1)

## Addendum 4 (handoff Part F "Soundcheck") — decisions (owner popups, 2026-10-03; locked)
- N1 Roadmap: **v1.2 Soundcheck** now; Tuning → **v1.3**.
- N2 Band feel: **driven by member skill** (sloppy garage band → tight arena band) + a feel per genre (punk rushes, rock lays
  back, metal locks in).
- N3 Your taps: **accents from accuracy + beat position** (a Perfect downbeat lands hardest) + round robins.
- N4 Cheap gear **still sounds cheap**: the upgrades raise the top end (`A.realism(tier)`).
- N5 Real recordings (sound review item 4): **later**; 1.2 keeps the hooks (Part F15).
- F16 (one popup, 2026-10-03, all as recommended): (1) low mood makes the band sloppier: mood < 30 → timing spread × 1.25
  (`C.FEEL_MOOD`); (2) studio takes (van radio, recorded songs) `t + 0.25` (`C.FEEL_STUDIO`) and rivals `t + 0.15`
  (`C.FEEL_RIVAL`); (3) band amps follow the kit tier: milk crate = 1×8 practice amp IR, pawn shop = 1×12, pro / arena = the
  genre cab (`C.BAND_AMP_BY_TIER`, `C.REALISM[tier].cab`); (4) "Classic sound" stays hidden, debug-only (`settings.audioClassic`,
  `GG.audio.classic(bool)`; no Settings UI).
- N6–N9 Sampled kit (Part F17): the owner's free TMKD "Vortex" pack; its terms allow sharing with **credit to The Metal Kick
  Drum / Rafa Prieto** and forbid selling, so it ships in the repo and every build with a credit line on the title screen.
  Part of Soundcheck (Lane I); **metal at pro + arena tiers**, kick/snare/3 toms; **DIRECT** mics. The owner attaches
  `Drums.zip` at stage 0 (raw WAVs stay in git-ignored `local/`). Size budget → **6.0 MB**.
- **Standing rule:** Garage to Glory is free. Before it is ever sold or monetized (price, ads, in-app purchases), replace the
  TMKD kit or get TMKD's written permission.

## Addendum 4 — pending
- [x] v1.2 stage 0: re-audit, classic hashes + 1.1 numbers/clips FIRST, contracts/settings/stubs, F16 popup (contract §3) —
      2026-10-03 (`plan/v12_stage0_report.md`; 232-case fixture `tests/fixtures/audio_v11_hashes.json`, numbers
      `plan/v12_audio_numbers.txt` "1.1")
- [x] F17 kit source: `local/` git-ignored (raw WAVs, size), `tools/check_kit_zip.py` passed on the owner's Drums.zip (62 entries, 60 wav ok, 0 problems; the re-sent zip is byte-identical), unzipped to `local/kits/tmkd_vortex/src/` (2026-10-03). Owner 2026-10-03: "scrap the kit guard local kit. one build with the drum samples only".
- [x] v1.2 lanes F (feel), I (instruments), V (vocals) + lead merge (F -> I -> V), hand-overs, F17 credit line (title +
      README Credits), tuning by numbers (F13 met), matrix + perf + size + clips — 2026-10-03 (`plan/v12_integration_report.md`)
- [x] v1.2 review pass (3 lenses) + fixes (5 majors, 12 minors), owner clip popup: ship, PR #23 to main — 2026-10-03
- [ ] v1.4 Tuning (D5) covers all four seats (was 1.3; moved for the v1.3 Songwriter, owner 2026-10-03)

## Addendum 5 (v1.3 "Songwriter") — decisions (owner popups, 2026-10-03; locked)
Owner words: "we need a bit more song building variation when painting guitar too. if i don't want to actually pick all
the notes i should have some presets with sliders and more accessible options to build different sounding songs both when
I am drums and other instruments" and "touch up and modify the UI in the song builder a bit. Make it more clear and feel
like less 'layer stacked on top of each other'. Just make it a more seamless process that's easier to read overall".
- S1 Roadmap: **v1.3 Songwriter** right after v1.2; Tuning (D5) becomes **v1.4**.
- S2 Guitar painting: **more note rows** (rhythm: Chug, Open, Root, 5th, Oct, Scratch; bass + lead get a wider range) and
  **pick each bar's chord** (4 bar chord chips, build your own progression). Not chosen: hold-length drag, per-note techniques.
- S3 Sliders, for drums and every instrument: **Energy** (sparse/easy <-> busy/show-off), **Mood** (bright major <-> dark
  minor; key + scale), **Feel** (straight <-> swing/shuffle), **Fills & surprises** (none <-> lots), plus **Tempo**.
- S4 Builder: **"Quick song, then tweak"**: one screen, pick a recipe (per genre, e.g. Neck-snapper, Doom crawl, Stadium
  anthem, "Surprise me"; pedal recipes locked without a double kick), move the sliders, hear it, done; any section can be
  fine-tuned by hand after.
- S5 Ratings: **rate by the notes only**; a slider-built song can reach top ratings.
- S6 UI: **one flow** (no separate Guided / Advanced modes; tips inline). Meters = **one slim strip** of 3 mini bars under
  the header (+/- flash on change). Coach = **one-line bubble** with the bandmate's avatar, tap for the full tip. "Let the
  band jam one", the metronome and the tools go in the header's ⋯ menu.
- S7 Look: **Option A "Clean sheet"** (`plan/v13_songwriter_mockup.html` `?opt=A`, `plan/v13_songwriter_mockup_A.png`;
  the owner first tapped B, then corrected: "Sorry, A was my answer"). Flat and quiet; underline section tabs (Verse /
  Chorus / Bridge / Song); recipe cards in 2 columns; horizontal sliders with end labels + a value label; "Your part | Drums"
  toggle with "Chords: <progression> ▾" beside it; 4 chord chips (BAR n + chord name; home chord outlined green) above the
  grid; the grid fills the screen (no scroll at 440x956); footer ▶ Loop / ▶ Song / Save ✓ (Quick song: ▶ Play / Tweak ✎ /
  Save ✓). Same navy background as the rest of the game.

- S8 (contract §8 popup, 2026-10-03; all recommended): Q1 gig lanes keep the **pitch shape** (low left, high right, folded onto
  the rig's 4-6 lanes); Q2 Fills = **a real fill on bar 4** of each section; Q3 a slider/recipe change after hand edits **asks
  first** (Start over / Keep my edits; Feel + Tempo never ask); Q4 breakdown bars **take a chord too** (new songs still start on home).

## Addendum 5 — pending
- [x] v1.3 contract `plan/plan_contract_1.3.md` (5 readers, writer, critic: 1 blocker + 6 majors applied) — 2026-10-03
- [x] v1.3 stage 0 (1.2 compat fixtures FIRST: `tools/make_fixtures_v12.js`, `tests/compat_v12.test.js`; VERSION 1.3.0.0; 21 contract
  code + moods; report `plan/v13_stage0_report.md`) — 2026-10-04
- [x] lanes S / A / U (`plan/v13_lane_<s|a|u>_report.md`) — 2026-10-04
- [x] integrate on `v1.3-songwriter` (merges S -> A -> U, hand-overs, matrix 390 + 440, phoneqa, size, owner shots + clips;
  `plan/v13_integration_report.md`) — 2026-10-04
- [x] review pass (3 lenses; 3 majors + 7 minors fixed), owner check: ship, PR #24 to `main` — 2026-10-04

## Addendum 6 (v1.3.1) — decisions (owner popup, 2026-10-04; locked)
Owner words: "if i don't want to okay specific gig can we add a simulate option? also lets make the bass shop button more obvious"
(read: "if I don't want to play a specific gig"). Plan: `plan/plan_1.3.1.md` (§0 has the lead's defaults D1-D8).
- G1 Simulated result: **"Your own average"**: how well you actually played your recent gigs (`state.playLog`, the last 5 PLAYED
  gigs, seat-aware; simulated gigs never count); falls back to the band's level when you haven't played many (< 2 on this seat).
- G2 Which gigs: **all but story shows**: any regular gig can be simulated; rival showdowns (`C.SHOWDOWNS`), the festival and the
  final must be played.
- G3 Rewards: **"Everything counts"**: a simulated gig applies exactly like a played one (pay, fans, buzz, awards / achievements
  through the normal result path: the real live session played by `GG.gig.botPlay`, then `career.finishGig`).
- G4 Shop: **own garage label + rig button**: a "Gear shop" floating label in the garage you tap directly (drums = the kit shop,
  string seats = their instrument shop) + a visible shop button on the rig / kit sketch-pad screen (the ⋯ entry stays).

## Addendum 6 — pending
- [x] plan `plan/plan_1.3.1.md` + lead edits (VERSION 1.3.1.0, `02_contracts` V1.3.1, `10_save` playLog, save test) — 2026-10-04
- [x] lanes G (gig simulate) + S (gear shop) -> `plan/v131_lane_<g|s>_report.md` — 2026-10-04
- [x] merge G -> S on `v1.3.1-simulate`, hand-overs, matrix 390 + 440, phoneqa, size, owner shots (`plan/v131_integration_report.md`) — 2026-10-04
- [x] review (2 lenses: 1 major + 3 minors fixed); owner check: ship (7 screenshots); PR #25 to `main` — 2026-10-05
- Leftovers: owner deletes `wip-v131-g`, `wip-v131-s` (+ `wip-v13-*`, `wip-v12-*`, `wip-v11-*` if still there) on GitHub.

## Addendum 7 (v1.4 "Tuning") — decisions (owner popups, 2026-10-06; locked)
- Next = **v1.4 Tuning** (handoff D5: balance + playtest pass, no new features). Pain point #1: **money**: **too tight early**
  (years 1-2) and **gig pay feels off**. Plays mostly bass + drums ("A/B"); tuning still covers all four seats.
- Owner follow-up (2026-10-06, verbatim): **"Drums felt worse tbh"**: the early money squeeze is worse on the DRUM seat than on
  bass. Proposals must explain the drums-vs-bass gap (e.g. drum gear/kit prices, lanes/pedal costs, drum-seat pay or costs)
  and fix drums first; every option's tables show drums and bass side by side.
- Method: measure first (money map + bot probes per seat, years 1-3; scratch `v14/` reports), then 3 options (gentle /
  medium / strong) re-measured, owner picks in a popup, then build. Must not make years 3+ too easy.

- Study (2026-10-06, `plan/v14/`: money_map, probe_baseline, proposal, critic + `human.js` gig-first persona): bots dodge the
  squeeze by Hustling (~11 blocks/yr); a gig-first player is broke (year-1 parents' loan: drums 98%, bass 95%). No money rule
  differs by seat: drums trail because the drum chart has ~2x the notes, so the same accuracy earns a lower grade + less pay.
- Owner popup (2026-10-06, all recommended): **M1 = "Gigs pay, side jobs less"** (the critic's B+): start $450; small rooms
  pay +60%; gas half price until Local Heroes and 80% until signed; open mics cover $40 of gas; a great show pays up to +25%,
  nobody docked; ride $200, pedal $250; Hustle pays 30% less until Local Heroes (no raise there); the results screen shows the
  band's cut. Target (gig-first, year 1): drums ~53% loans / 4.5 weeks < $100, bass ~40% / 3.5; Hustle-heavy ~0% / 0.5;
  years 4-6 unchanged. **M2 = "Fair grades"**: the gig grade compares you to what's possible on YOUR instrument, so the same
  accuracy earns the same grade and pay on any seat; charts unchanged. **M3 = jam room cheaper until signed** (~$35/wk, then
  the normal $60).
- Also from the critic (no popup needed, fix in the build): moving up a venue tier must never pay less (tier-1 x1.6 overlaps
  tier-2); no visible pay drop at signing (taper the early boosts across Local Heroes -> signed); re-pinning the played-gig
  fingerprint is now intended (supersedes v1.3.1's "played gigs match 1.3.0") and must be logged.

## Addendum 7 — pending
- [x] money map + bot probes + 3 options + critic (`plan/v14/`) -> owner popup M1-M3 (2026-10-06)
- [x] build M1-M3 + critic fixes, re-probe (`plan/v14/build_report.md`, `probe_after.md`) — 2026-10-06/07
- [x] full verify at 390 + 440 (`plan/v14/integration_report.md`): node suite, Classic hash 232/232, compat + save, matrix
  (118 sections per size), pw_perf, phoneqa, size 5,244,808 B; owner shots 01-05 at 440x956 — 2026-10-07
- [x] review (2 confirmed + 6 minor) fixed on `v1.4-tuning` (`plan/v14/integration_report.md` "Review fixes"): early help
  until signed (was a 24-week clock from Local Heroes), the results money row adds up, BotB gas cover, HUD chips, no bonus
  line on a prize — 2026-10-07
- [x] Hall of Fame "Biggest room" overflowed at 390 when the name is long (`pw_hof list`; report finding 1): the value wraps
  (`.hof-wrap`); fixed with the review fixes because the until-signed money moved the seeded career to a longer room name that
  overflowed at 440 too — 2026-10-07
- [x] owner check (440x956 shots + year-1 numbers): **ship**; PR #26 to `main` — 2026-10-07
- Next (handoff D5): the owner playtests years 1-3 on drums (then 3-6) and reports in plain words; each report becomes a
  numbered item here and a small v1.4.x patch. Watch: year 3 a bit richer for bots; gear-in-week-1 + jam-room player still
  tight in year 3. Owner deletes the `wip-*` leftovers (incl. `wip-v14-lead`) on GitHub.

## Addendum 8 (v1.5 "Desktop") — decisions (owner popups, 2026-10-07; locked)
- Owner: "Can we make an option to play on PC / Keyboard as well?"
- K1 Scope: **gigs + menus** on the keyboard (Enter/Space confirm, Esc back/close, arrows/Tab move focus); the mouse keeps
  working everywhere; touch on phones unchanged.
- K2 Gig keys: **rebindable** (a Settings screen to set your own key per lane). Owner follow-up (verbatim): "Rebindable keys
  but I like the idea of ASDF, Space, and maybe shift being default?" -> default set **A S D F + Space + Shift** (one hand on
  ASDF, thumb on Space, pinky on Shift); the plan proposes the exact lane order per seat (e.g. drums: Space = kick) for the
  owner to confirm. Replaces the D F J K popup default.
- K3 Layout: **a wider PC layout** that uses the extra width (wider gig highway + stage view, menus side by side); phones
  keep today's layout exactly.
- K4 Fairness: **same rules** for keys and touch (same timing windows and grades) + a keyboard lag calibration step.
- Method: plan + PC mockups first (owner picks), then build; phone layouts at 390x844 / 440x956 must not change.

- Plan popup (2026-10-07, all recommended): **Q1 drum keys "strong fingers"** (Space kick, D snare, F hats, S crash, Shift toms,
  A ride); **Q2 string keys** A S D F for strings 1-4, 5 strings: Space = top, 6 strings: Shift = 5th + Space = top; **Q3 PC
  look B "Centred wide column"** (`plan/v15_desktop_mockup.html?opt=B`, `_B.png`): menus in 2-3 columns, wider highway under
  the stage; phones unchanged.

## Addendum 8 — pending
- [x] plan `plan/plan_contract_1.5.md` (4 readers, writer, mockups, critic: 1 blocker + 8 majors applied) -> owner popup (2026-10-07)
- [x] stage 0 (2026-10-07, `plan/v15_stage0_report.md`): phone freeze FIRST on the untouched 1.4.0.0 tree (`tools/phone_freeze.js`
  -> `tests/fixtures/phone_freeze_390 / _440 / _844l.json`, `tests/pw_freeze.js`; a fixture change needs the lead + a reason logged
  here), §2 re-audit, VERSION 1.5.0.0, 02 V1.5 block, 11 keys / calibKb / layout, `GG.input` (50b), `_pw` desktop, `keys.test`,
  `wide_css.test`; package A deleted from the contract (B is the build)
- [x] lanes I, N, W (2026-10-08, reports `plan/v15_lane_<i|n|w>_report.md`) -> merged I -> N -> W on `v1.5-desktop`, hand-overs
  applied (02 "As merged", stage frame 0.1, songwriter grid column), phone matrix + desktop sizes verified, owner shots
  (`plan/v15_integration_report.md`)
- [x] review (3 lenses) -> owner check: ship -> PR #29 to `main` (2026-10-08); 1.5.1 PC polish PR #30 (2026-10-09)

## Addendum 9 (v1.6 "Showtime") — decisions (owner popup, 2026-10-09; LOCKED)
- Owner: "Can we add some animation or something to the not highway and notes themselves?"
- S1 **Juicier hits**: hits pop with a spark and a shockwave ring, Perfect gets a bigger flash; misses crack and fade away,
  and the hit line flickers red.
- S2 **Living notes**: notes have a soft glow and shine and pulse on the beat; long (hold) notes shimmer along their tail.
- S3 **Moving highway**: lane edges and beat lines pulse with the music, the lanes scroll with a faint texture, and the whole
  strip lights up as your combo grows.
- S4 **Combo fire**: at x10, x25 and x50 the hit zone heats up through warmer colours and lane flames; a star-power-style shine
  at the top streak (cosmetic, no score bonus).
- S5 **Where**: phone and PC, with a Settings switch "Less motion" that turns it down (older phones, calm players).
- Rules: visuals only (timing, judgement, scoring, chart, audio, input untouched; note y unchanged); readability first
  (colourblind + lefty work, reducedFlash respected); calm on Low graphics / governor step-down; phone DOM unchanged except
  the new Settings row.

## Addendum 9 — pending
- [x] build (2026-10-09, `v1.6-showtime`): 55f fx layer + 55 hooks, Less motion (10 / 11 / 5h), live bot, tests, perf, owner
  stills + clips (`scratchpad/v16_owner/`), VERSION 1.6.0.0, 02 V1.6 block, `plan/v16_report.md`
- [x] freeze fixtures: only the Settings screens moved (the new row); re-recorded with `tools/phone_freeze.js` (reason: the
  owner's S5 "Less motion" row in Look + feel)
- [x] lead review (timing-safety + phone-perf) -> owner check: ship (clips + stills) -> PR to `main`, Current 1.6.0.0 (2026-10-10)

## Tech
- three.js **0.149.0** from cdnjs (last UMD build without the r150 deprecation warning). Only external dependency.
- Build: `node build.js` → dist/. ORDER rule: 01_ns, 02_contracts, content/*.js, then other src/*.js by name.
- Tests: `node tests/run.js` (all node tests). Playwright: `timeout 500 node tests/pw_flow.js` with `META_ONLY=<section>`; helper `tests/_pw.js` routes three.js to `tests/.cache/` (gitignored) and runs at 390×844.
- Balance: `node tools/balance.js`.

## APIs (full shapes in `src/02_contracts.js`)
- **v1.5 as merged** (lanes I -> N -> W + lead, 2026-10-08; full list in `02_contracts.js` V1.5 DESKTOP + "As merged"):
  `GG.input` (real, mode, desk, kbSeen, learned, wide, showKeyUI, layoutPref, capture, gigLive; events 'input:mode', 'ui:wide');
  settings keymap / calibKb / layout (`P.keyLane`, `P.setCalib(.., 'keys')`, `layoutFor`, `pxBudget`); 55 `ui.keyLabel`,
  `ui.kcap`; 50/50k `ui.setKbnav`, `keyBack`, `focusDefault`, `focusEl`, `noFocus`, `w2`, `walkToSpot`, screen defs
  `{ back, focus, hints }`, event 'ui:kbnav'; 54/51/5j `seqDirty / creatorDirty / lookDirty`; 40 `setViewInsets({ left, right })`;
  debug input / keys / gigui keys / render pxBudget + insets / calib input / wide.
- **v1.3 as merged** (lanes S -> A -> U + lead, 2026-10-04; full list in `02_contracts.js` V1.3 SONGWRITER "As merged"; lane
  reports `plan/v13_lane_<s|a|u>_report.md`). Rule: every v1.3 branch is gated on its own field; absent = the 1.2 code, no new key.
  - Data (all optional, sanitize writes them only when valid, after `part`): `p.chords { verse|chorus|bridge: [4 semis] }`,
    `p.fillBars { <section>: [lanes] }` (bar 4), `p.mood` 0..4, `p.swing` 0..4, `p.recipe { id, seed, energy, fills }`; part v2
    `{ seat, v: 2, sections }` (`C.PART_V2` rows; v written only when 2).
  - Sim (21): `songs.swingBeat, chordsOf, chordLabel (rung third, one spelling per song), progChords, progName, moodOf, nativeMood,
    NOTE, recipes(genre, gear, seat), sliders(genre, seat), surprise(genre, gear, seat, seed), compose(genre, { recipe, energy,
    mood, swing, fills, bpm, seed, gear, seat })`; `part.LAYOUT / UP / ROLE / rowsOf / rowNames / upgrade / view / rowPitch`;
    `part.suggest / full(.., v)`; toNotes `fill: true`; OPs `roll`, `swap`; `similarity(a, b, genre)` (callers pass the genre).
  - Audio / gig (30 / 31 / 22 / 55): events `g` (grid beat), `dead`, `single`; timeline `swing`, `key.mood`; `third(o, lit)`; KS art
    `dead`; `A.strum(m, w, { dead, third })`; drum chart `t = swingBeat(beat) * spb`; `debug('audio') + swing, mood, seat.last.dead`.
  - UI (54): `ui.show('seq', { mode, screen: 'quick'|'edit', .., editHint })`, `ui.seqGear(entry)`; testids in contract §4.7
    (`quick-recipe-<id>`, `quick-<slider>`, `btn-quick-tweak`, `chord-chip-<n>`, `chord-opt-<semi>`, `seq-chords`, `part-pick-<i>`,
    `btn-seq-tools` -> `seq-tools`, `btn-seq-fill`, `btn-seq-beat`); `debug('seq')` (§4.8 + `fill`); `tests/_pw.js openTools(page)`.
  - Constants: `C.SWING`, `C.SONG_SLIDERS`, `C.PART_V2`, `C.QUICK { k 8, debounceMs 150, warmMs 400 }`, `C.SEQ_PART_ROW_MIN` 26.
  - Content: `grooves[g].recipes / sliders / bars / ops`, `grooves.surprise`, `grooveFx`, `coach.quick` (+ per genre, + bySeat),
    `genres backing.moods` x 5 + `moodNative`. Lead tools: `tools/make_fixtures_v12.js`, `tools/audio_clips.js --v13`.
- **v1.2 as merged** (lanes F -> I -> V + lead, 2026-10-03; full list in `02_contracts.js` V1.2 SOUNDCHECK "As merged"; lane
  reports `plan/v12_lane_<f|i|v>_report.md`). Rule: every new path needs a `vel` AND Classic off; no vel = the 1.1 path.
  - F (31): `A.velGain(v)`, `A.tightness(skill)`, `A.feelFor(state|null, genre, { rival, studio, seat })`, `A.feelPlan(tl, FEEL, seed,
    { gig })` -> `{ dt, vel, dgap, stats }`, `A.accent`, `A.tapVel`, `A.TAP_AUTO`, `A.feelStats()`; `A.play` opts `gig / feel / studio`;
    player() plays copies (`+ vel`, `t + dt`, `gap + dgap`), steps never move; 55 `bandOpts`, `warmSong` (A.warm), `tapVel` before
    every tap sound; `debug('gigui').feel`. Content `genres.js backing.feel { slop, push }`.
  - I (32 + 30): `GG.dsp.{ pluck, chord, strum, metal, biquad, impulse2, cabIR, irGain, irFromB64, pluckJob }`; `drumHit(.., cls, vel)`;
    PRE2 (layers x round robins, 6 MB, serves song events), KS cache + `A.warm(pattern, { genre, songId })`, cab IRs by tier,
    `A.impulse2`, `r.carve`, `r.duck`, `r.crush`, `A.sampleKit(genre, tier)`; renderOffline + `vel, hit, feel, studio, gig, hits,
    gap` (-> `kitUsed, kitOnset`), prerenderHit + `vel, rr`. Kits: `GG.content.kits.<id>` `{ id, name, credit, terms, genres,
    tiers, codec, sr, lanes, trim }` (`src/content/kit_tmkd_vortex.js` + `.LICENSE.md`).
  - V (33 + 30): `GG.voice.{ glottal, WAVES, formants, track, pitchCurve, shimmer, press, pressAt, ring, envelope, sends, delayTime,
    profile, .. }`; `A._buildVox(r)` -> `r.vx`, `r.voxDelay`, `r.voxTempo(spb)`; content `voices.sound` (a parallel table:
    vocal events keep the 1.1 profile); `A.voxStats()`.
  - Debug: `debug('audio')` + `classic, feel, vox, realism, pre, ks, kit`; `debug('feel')`, `debug('vox')`.
  - Lead: `tools/audio_numbers.js --diff <a> <b>` (the F13 verdict), `tools/audio_clips.js --metal-kit`, `tools/perf.js gig KITQ=`;
    title `[data-testid=title-kit-credit]` (every kit's credit).
- **v1.2 stage 0** (2026-10-03, `v1.2-soundcheck`; shapes in `02_contracts.js` V1.2 SOUNDCHECK, contract §4):
  - Contracts: `C.VEL_REF` 0.85, `C.FEEL_CLAMP { gigDrum, gig, free, sixteenth }`, `C.REALISM[tier]` (F11 + `id, layerLanes, cymBloom,
    subKick`), F16 `C.FEEL_MOOD { below 30, spread 1.25 }`, `C.FEEL_STUDIO` 0.25, `C.FEEL_RIVAL` 0.15, `C.BAND_AMP_BY_TIER` true.
  - `settings.audioClassic` (hidden, default false); `GG.audio.classic(bool)` / `isClassic()`, `debug('audio').classic`; stubs
    `feelFor / feelPlan` → null, `tapVel` → undefined, `warm` → Promise, `realism(tier)` → `C.REALISM` row; `GG.dsp = {}`,
    `GG.voice = {}`; makeRig `if (A._buildVox && !A.isClassic()) A._buildVox(r)`. `src/31|32|33_audio_*.js` headers only.
  - Tools: `tools/_audio_lab.js` (cases, page helpers, deterministic summing for hashes), `tools/audio_hashes.js` (verify /
    `--write`), `tools/audio_numbers.js --section <v>`, `tools/audio_clips.js --tag <v> --out <dir>`; `pw_seq` section `hash`.
- **v1.1 review fixes** (report §5): `GG.shop.sectionDef(state, id)` (seat text of Solo / Outro), `ui.SEAT_NAME / seatName /
  seatIcon / seatOf`, `R.labelScreenPos(action)`, seat chart notes may carry `with` (a same-voice partner; `o.with` on
  pluck/strum/lead), `drama.members[id].kit[kind]` (kit variants, content/zz_seats_drama.js), content/zz_seats_gates.js (cards
  off a member's swap seat), swapped gate id = that member on the kit now, `tests/seat_scan.js` `oldLeak` / `swappedNames`.
- **v1.1 as merged, lanes C + A** (full list in `02_contracts.js` V1.1 SEATS "As merged (v1.1 lanes C render + A content)"):
  - Render: `R.seatGear(seat, gearLook, kitColor, genre)` / `R.instrument`; `stage.setup({ ..., seat, lineup })` (55 passes both);
    `stage.info()` + `seat, view ('drummer'|'spot'|'spectator'), camera, drummer, you, boom, mics, seatMode, autoHits`;
    `van.info().gigBag`; `carpet.info().you`; garage `debug('render').seat` { seat, rig, drummer, gear, label, sticker }.
  - `GG.creator`: `sanitizeGearLook(gl, seat?)`, `gearShapes`, `gearDefault`, `gearNames`, `stageLookFor`; `prepare/init/apply` take
    `gearLook`. `ui.openLook({ ..., seat, gearLook, logo })` → "Your gear" tab on string seats (testids `lk-tab-gear`,
    `lk-gear-shape-<id>`, `lk-gear-sw-<i>`, `lk-gear-color-kit`, `lk-gear-guard-<id>`, `lk-gear-sticker-none|logo`).
  - Content keys: `bands.seatLines`, card/chat top-level `seat` / `swapped`, card prefixes `arc_` / `fin_` / `sw_`, flags
    `bassArc|rhythmArc|leadArc` + `*ArcDone`, `shop.gear[i].bySeat` / `shop.kit[i].bySeat` / `shop.byBand[b].lines.drummerGear`,
    `creator.gear`, `grooves.coach(.genre).bySeat`, `lines.songReactions[id].kit|bySeat`, `recruits.drummers`, `drama.fillIns.drums`,
    `endings.player.<seat>`, epilogue `when.seatRole`, `content.seatAchievements`.
  - Tests/tools: `tests/seat_scan.js` (strict leak scan; LEFT phrases also match in ALL CAPS), `SEAT=all LEAK_YEARS=10 node
    tests/sim_bands.test.js`, `tests/content_seats.test.js`, `META_ONLY=seats node tests/pw_bands_render.js` (opt-in contact
    sheet, ~3 min), `tools/phoneqa.js` sweeps the v1.1 screens, `tools/perf.js scenes` seats line.
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

