# Garage to Glory: status

Read this first every session. Don't re-explore the codebase to rebuild context.

## Version
- Current: **0.6.0.0 "Rivals"** (merged to main 2026-09-29) · 0.5 Signed, 0.4 Drama, 0.3 Stage, 0.2 Sequencer, 0.1 Garage merged earlier
- Hotfix: **0.5.1.0** (gig clock + taps + difficulty; merged to main 2026-09-29)
- Also shipped: **0.6.1.0** Addendum 1 catch-up (merged 2026-09-29)
- Also shipped: **0.6.2.0** two-thumb chords + guided songwriter (merged 2026-09-29)
- Next: **0.7.0 "World"**
- Repo: https://github.com/Jxstrr0/GarageToGlory (branch `main`; work lands through PRs that are merged and their branches deleted)
- Play: `dist/game.html` (standalone), `dist/game.artifact.html` (Artifact host copy), `dist/Garage to Glory - V<ver>.html`

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

## Owner feedback → v0.6.2 (2026-09-29)
- "It plays very well." The song creator is "a bit tough to use and wrap your head around"; "not possible to hit 3 or
  4 notes at once".
- **Two-thumb rule** (owner pick): on EVERY gig difficulty (Easy → Expert) charts never ask for more than 2 notes at
  once (priority kick > snare > cymbal > toms > ride > hat). The dropped hits still SOUND (auto-played in the drum audio,
  not judged, no miss). Hard/Expert get harder through density and speed, never 3-finger chords.
- **Songwriter** (owner picks): **groove presets** (start each section from a named beat per genre, then tweak; one-tap
  "More metal" / "Make it catchier"-style buttons) + a **step-by-step flow** (one thing per screen: Verse → Chorus →
  Bridge → Tempo → Song order → Name), with the full grid editor still available as "Advanced".

## Addendum 1 (handoff Part C) — decisions (owner, 2026-09-29; locked unless marked open)
- C1 Van: designated driver per band changes stats + road cards — Hail Damage **Kenji** (silent, perfect record, never
  uses GPS, always exactly on time; fewer breakdowns), Frost Heave **Moth** (her apartment; free maintenance, terrible
  comfort), Gravel Kings **T-Bone** (safe but slow; Chase begs to drive, blasts '80s cassettes), Grid Road Ramblers **Earl**
  (20 under the limit, stops at every historical marker; slow, road stories boost chemistry). If the driver quits, **you**
  drive and the road-card pool changes (wrong turns, gas-station arguments). Seating: driver up front, you shotgun, band
  in the back rows, gear + merch piled behind. Dashboard item per driver (Kenji's tiny cactus, Moth's laundry, Chase's
  cassettes, Earl's 1987 road atlas). Road events: deer on the Yellowhead, whiteout on the Trans-Canada, the fight over
  shotgun, Marcel's cape shut in the sliding door. Vehicle names per band per tier (table in Part C1), renamable; venue
  stickers on the van body (banned venues crossed out) → v0.8.
- C2 Character creator (v0.8): separate everyday + stage looks (stage look auto for gigs/red carpet/stage scenes);
  unlocks grow with the career; optional carry-over of unlocks within the same genre at a new career; full part lists
  in Part C2 (knuckle tattoos: player types 4 letters per hand, A–Z). **No gong on the drum kit, ever** (the Global Gong
  award stays — owner clarification).
- C3 Audio: kit voices as specified; genre kit tuning (metal tight/clicky, punk loose/trashy, rock big/roomy, country
  soft/dry + rim clicks + optional brushes); kit quality tiers (v0.8); generated band per genre with a new random key per
  song and section density (sparse verses, full choruses, stripped breakdowns); synthesized vocal hits on the beat grid
  (shouts on chorus downbeats, growls on breakdowns, pitched to the key, never off-beat); taps trigger drums (done);
  venue reverb by size; crowd bed that swells with the meter + cheers/boos; garage hum with Dana noodling; van road
  noise; van radio plays your charted song; mixer (drums/band/crowd/SFX) + metronome toggle in the sequencer.
- C4 Settings: audio calibration runs on first launch (tap along to 8 clicks → offset; visual flash check; two profiles:
  phone speaker / headphones, quick switch); career difficulty Chill / Normal / Brutal chosen at new career and locked;
  gig difficulty Easy / Normal / Hard / Expert (stacked with drum skill) + independent note speed; assists: No-fail,
  Auto-kick, Practice mode (any catalog song, slow-down); lefty mode, graphics low/med/high, camera shake toggle,
  colourblind lane colours, bigger text, reduced flashing, skip van scenes / faster animations, save management.
- C5 Bandbook (one parody social app on the laptop): Promote posts automatically (content picked from band state);
  viral chance (good or cringe); generated comedic comments (Tundra Wraith leaves a supportive one on every post);
  scandals → choice cards (Marcel's lawn is artificial turf); fan types superfans / casuals / haters (fans stay one global
  count); recurring superfans (Dale from Warman, the jumper-cable trucker, the president of your Japanese fan club); fan
  mail + gifts in the garage (macaroni portrait of Kenji); paid fan club later in the career on **Patreeon** (owner pick:
  "support your favourite band's van repairs"; tiers Drumstick / Snare / Full Kit).
- C6 Maps in rings: Saskatchewan from day one (Saskatoon, Regina, Prince Albert, Moose Jaw, Swift Current, North
  Battleford, Yorkton, Humboldt, Gravelbourg, Estevan; Warman/Martensville stay as Saskatoon satellites since venues
  shipped there); **the West** in Local Heroes (Winnipeg, Brandon, Calgary, Edmonton, Red Deer, Lethbridge, Kelowna,
  Vancouver, Victoria); **the East and North** in Signed (Thunder Bay, Toronto, Ottawa, Montreal, Quebec City, Halifax,
  St. John's, Whitehorse, Yellowknife); world regions + city lists in Part C6 (v0.7; Helsinki hosts the Moose Opera
  ending). Starting cities: Hail Damage Saskatoon, Frost Heave Regina, Gravel Kings Edmonton, Ramblers a farm outside
  Swift Current (v0.9).
- C7 Calendar: two weeks per month, every week shows its month + season. Week 1–2 = July … 11–12 = Dec, 13–14 = Jan,
  15–16 = Feb, 17–18 = Mar, 19–20 = Apr (Loonies, week 20), 21–22 = May, 23–24 = Jun. Winter Dec–Feb (weeks 11–16),
  spring Mar–May (17–22), summer Jun–Aug (23–24, 1–4), fall Sep–Nov (5–10). Season effects + genre-season fit; weekly
  weather by season/region (never cancels a gig); garage changes with the season; overseas seasons (v0.7); holidays:
  NYE best-paying gig, St. Patrick's pub circuit, Canada Day free park shows, Halloween costume gigs, Thanksgiving dinner
  (guilt cards if you owe), Remembrance Day (no Legion gigs that week), Christmas party circuit + the label's terrible
  Christmas single, the Grey Mug halftime show (late-career moment).
- C8 still OPEN (popups when reached): other rivals' members (v0.9), exact balance numbers.

## Addendum 1 — pending
Already-shipped versions → **v0.6.1 catch-up**:
- [x] C1 van drivers (effects, you-drive pool, seating, dashboard items, new road events) — WORLD, v0.6.1
- [x] C3 genre kit tuning, per-genre generated band + random key + section density, vocal hits on the beat grid — AUDIO, v0.6.1
- [x] C3 venue reverb, crowd bed + cheers/boos, garage hum, van road noise, van radio, mixer, sequencer metronome — AUDIO, v0.6.1
- [x] C4 calibration (first launch + settings, 2 profiles), career difficulty (locked per career), gig difficulty
      Expert + note speed, assists (No-fail, Auto-kick, Practice), accessibility/graphics/skip settings, settings screen — SETTINGS, v0.6.1
- [x] C5 Bandbook, virality, comments, scandals, fan types, named superfans, fan mail + gifts, fan club (Signed era) — FANS, v0.6.1
- [x] C6 Sask ring additions, West ring (Local Heroes), East & North ring (Signed), Canada map in rings — WORLD, v0.6.1
- [x] C7 month/season calendar, weather, season effects + genre-season fit, garage seasons, Canadian holidays — WORLD, v0.6.1
Later versions:
- [x] v0.7: C6 world regions/cities, C7 overseas seasons + regional holidays, Japanese fan-club president, Global Gong — WORLDSIM + WORLDUI, v0.7.0
- [ ] v0.8: C1 vehicle names/rename/stickers/upgrades, C2 full creator + unlocks + carry-over, C3 kit quality tiers
- [ ] v0.9: C1 other bands' drivers in play, C6 starting cities, rivals' members (open)

## Tech
- three.js **0.149.0** from cdnjs (last UMD build without the r150 deprecation warning). Only external dependency.
- Build: `node build.js` → dist/. ORDER rule: 01_ns, 02_contracts, content/*.js, then other src/*.js by name.
- Tests: `node tests/run.js` (all node tests). Playwright: `timeout 500 node tests/pw_flow.js` with `META_ONLY=<section>`; helper `tests/_pw.js` routes three.js to `tests/.cache/` (gitignored) and runs at 390×844.
- Balance: `node tools/balance.js`.

## What's in v0.1.0 "Garage"
- Title → slot → genre (Metal playable; Punk/Rock/Country locked "v0.9") → band intro → basic creator (name, nickname,
  6 presets) → 5-panel cold open → the 3D garage (tap-to-walk, 7 labelled hotspots, bandmates with idles/moods,
  seasonal yard, Marcel's cape from `flags.cape`).
- Week loop: Monday card (50 cards incl. forced `lord_abyssus` + 6-card Cape Saga; 13 gambles) → whiteboard (3 blocks,
  6 activities; offers accept/decline) → results (block lines + auto-resolved gig) → wrap (deltas, milestones, moods,
  group chat, parents' loan + guilt) → autosave (auto + career slot). Year rollover at 24 weeks; career ends at 240.
- Laptop (chat / band / money), ☰ menu (save slots, save code backup/restore, sound, quit). Synth sfx.
- Balance (5 seeds, year 1): avg bot fund min $140 end $531, 253 fans, 0.2 loans; good bot 458 fans, 0 loans.

## What's in v0.2.0 "Sequencer"
- Songs are drum patterns (`PATTERN`: 3 one-bar sections × 4 lanes × 16 steps, arrangement preset Short/Classic/Epic,
  tempo in the genre range). `GG.songs.rate` → Groove (genre fit, rules in `content/genres.js`), Hook (chorus vs verse
  sweet spot + catchiness), Difficulty (notes × tempo × syncopation). Quality = band part + craft − over-hard penalty.
  All 4 genres' rules/signatures ship (signatures score 96–100 at home, ≤ 72 elsewhere); only metal is playable.
- Write block: the planner's Go opens the full-screen sequencer once per Write block (first-ever Write = starter pattern
  + a bandmate tip); Save queues into `state.pendingSongs`, "Let the band jam one" = `songs.jam` (bots always jam).
  Results show the song + reactions (Marcel names it in French, Dana/no solo room, Jaxon/fills, Kenji/nod).
- Sequencer: tap/drag painting, kick-adjacency rule (no double-kick pedal yet) shown kindly, Verse/Chorus/Bridge/Song
  tabs, copy/clear, tempo slider (+ backing style label), arrangement chips, live meters + tips + ability tick,
  Loop/Song playback with playhead. Kit hotspot = sketch pad on `state.draft` ("Use in next Write"). Laptop Band tab
  catalog shows ratings/tags; tap = read-only sequencer with Play.
- Audio: punchy synth kit (6 lanes), generated backing (metal: doom < 100 bpm, palm-muted chugs locked to the kick,
  tremolo > 170; bass doubles; chords per section from the kick/snare skeleton), look-ahead scheduler on
  `AudioContext.currentTime`, ≤ 12 song voices (per-lane choke + booking), glue comp + limiter (peaks ~0.6).
- Gigs: plays add stale (decays 4/week off), stale lowers setlist score; 4 A/S gigs make a classic (results line).
- Saves: schema 2. v1→v2 migration gives every song a pattern from an RNG seeded by career seed + song id (career RNG
  untouched), rates it, keeps old quality/polish; adds `gear`, `pendingSongs`, `draft`. Fixture `tests/fixtures/save_v01.json`.
- Balance (5 seeds, year 1): avg bot fund min $221 end $624, 288 fans, 0 loans; good bot 483 fans, 0 loans.
  Over 40 seeds v0.2 vs v0.1-equivalent knobs: avg fund end 593 vs 542, fans 260 vs 266; good fans 425 vs 448
  (staleness), both within seed noise of the v0.1 targets.

## What's in v0.3.0 "Stage"
- Weekend flow: planner (Book block → gig board) → runWeek → phase 'gig' → "Load the van" → van trip (3D windshield,
  Kenji drives silently, road card + banter, skippable) → setlist picker → live rhythm gig (3D stage top ⅔, 2D-canvas
  highway bottom ⅓, multitouch, taps play the drums, backing from the scheduler) → gig results → wrap.
  Autosave on 'gig:pending' and after every song ('gig:song'); reload mid-gig resumes at the next song.
- Gig sim (`22_sim_gig.js`): charts from `songs.toNotes`, Forgiving windows (0.060/0.130 s at drum skill 10, widening),
  combos, crowd meter + levels + moments, band effects (cape spin, Dana's solo, Jaxon's fills, sulking members), genre
  moments for all 4 genres, freestyle fill windows, setlist opener/closer bonuses, `botPlay` (perfect bot S, avg B).
- World (`26_sim_world.js`): weekly listings across the Saskatchewan core (map pins + road km), tier 1–2 venues with
  quirks/catches/kinds/set sizes, three deals, opening slots (rarely for Tundra Wraith), venue reputation + banned wall,
  the Moose Hearse (condition/space/comfort/wear; no breakdowns while protected), ~12 road cards.
- Scenes: `42_render_stage.js` (venue dressing per kind, instanced crowd ≤150 with all C.MOMENTS, band + your kit;
  ~34 draw calls worst case), `43_render_van.js` (seasons × day/night, moose, bandmates lean in to talk; ≤29 draws).
- Save schema 3 (v2→v3 migration in `GG.world.migrate`).
- Tests: node content 26, save 7, sim_career 22, sim_gig 14, sim_songs 12, sim_world 15 · pw_flow flow/year/code/layout
  · pw_garage · pw_seq seq/audio · pw_gig gig/e2e · pw_world board/van · pw_stage stage (incl. van).
  v0.4: content 31, sim_drama 14 (new) · `pw_drama.js` META_ONLY=drama (19; screenshots `drama_band.png`, `drama_recruit.png`).

## What's in v0.4.0 "Drama"
- Garage-era protection ends at **250 fans** (wrap milestone "Local heroes on the horizon", `protection:ended`, van
  breakdowns now fire). Era label stays 'garage' (v0.5).
- Drama sim (`27_sim_drama.js`): weekly mood pushes from money (pay cut vs expected 25% → +10% with fans; recruits
  expect their asking cut), overwork (burnout > 55), band success (4-week fans trend, gig grade) and wants (content;
  Kenji = random drift). Stages 0 fine → 1 grumbling (chat) → 2 passive-aggressive (`tone:'pa'` chat, wrap warnings)
  → 3 ultimatum (forced Monday card next week) → 4 quit; one step a week, back down as mood recovers; capped at 2 while
  protected (and for Reliable recruits). Ultimatum fixes cost money/pay/burnout; refusing quits.
- Quits: originals run an exit storyline (chat beats: Marcel in Rimouski, Dana in 13/8 prog, Jaxon grounded by Baba,
  Kenji vanishes 'away' and walks back in on his own), a return card months later (empty slot: welcome / conditions /
  not yet; filled slot: take them back or keep the recruit → original joins Tundra Wraith, `rivalDefectors` + rival
  blurb). Returners come back changed (+5 skill, `changed` text). Recruits who quit just leave.
- Holes: −14 gig score (−10 live crowd start) per open hole; fill-in = $40/gig, skill 38, −4 score, −1 chemistry/week.
  Recruit ad $30 → 3 candidates (genre name pools, Sask hometowns, 1–5★ scaling with era/fans, 9 traits with real
  effects, 12 quirks with quirk cards, asking cut, chemistry on the card); re-post $20. Generated LOOKs.
- Pay the band: `payCut` default 30% (0–60%, step 5) of gig pay to members (`r.cut`); upkeep lowered 30 → 22 + 0.012/fan
  to keep year 1. Parents' loan: 6 guilt cards with `repay` (never below the $100 cushion; paying off clears the flag).
- UI (`58_ui_band.js`): laptop Band tab = pay slider + live preview, member cards (mood, stage badge, want / trait,
  quirk, stars), holes (Post an ad / Hire a fill-in / Let go), departed storylines, rival watch; recruit sheet (3 cards,
  Hire / Re-post / Close); tone-marked chat; wrap panels (protection, "Trouble in the band", "Meanwhile…"); ultimatum
  card tag. Garage + stage show fill-ins. `.layer` now isolates stacking (sheets stack cleanly).
- Save schema 4 (`GG.drama.migrate` wraps `GG.save.migrate`). Bots: `drama.botWeek` (good bot pays 40% when someone is
  upset and fund > $600; both post ads and hire; good re-posts weak batches), avg refuses 45% of ultimatums.
- Balance (`node tools/balance.js 10 12`): avg quits/yr after protection 0.65 (ultimatums 1.09, returns 0.42), good 0;
  year 1 (30 seeds) avg fund min $100 end $383, 273 fans, 0.4 loans (v0.3-equivalent `NO_DRAMA=1`: 85/404/265/0.2);
  good year 1 fund end $887 (was $1,338: members' cut), fans 557.

## What's in v0.5.0 "Signed"
- Eras: garage → local (250 fans) → signed (a deal or a DIY album); world threshold defined but off until v0.7
  (`economy.eras.worldEnabled`). Balance (10y × 20): avg bot Local wk 23, first offer wk 47, signed wk 53, $9.7k at y10;
  good bot signed wk 30, $23.6k at y10.
- Labels (`24_sim_labels.js`, API in its header): Gopherwood / Monolith / DIY offers, recoupable advances (60% held as
  recording budget), demands (cards or a demand sheet), deadlines, drops, fulfilment; studios + producers; sessions
  replace the planner (studio event = Monday card); drum takes by skill or played (gig studio mode); release wizard
  (tracklist, lead single, generated/typed title, procedural cover, release week, promo); reviews (5 outlets, recycled
  patterns penalised), Maple 100, streams, royalties, gold/platinum trophies; Loonies at week 20 (3D red carpet
  `44_render_carpet.js`, outfit card, envelopes, speech). Theatres (tier 3). Signed-era commission + crew costs.
- UI: `59_ui_label.js`, `59b_ui_studio.js`, `59c_ui_awards.js`; laptop Label/Albums tabs; trophy wall + trophies sheet.
- Save schema 5. Tests: sim_labels 15, content 39; pw_label label/studio/awards/sheet
  (`META_ONLY=label,studio,awards,sheet`).

## What's in v0.8 (creator) — lane B, CREATOR (Addendum 1 C2; worktree branch, merged by the lead)
- Content `content/creator.js` (`GG.content.creator`): 157 parts in 26 categories (every Part C2 list + a few legacy
  looks kept drawable: short / top bun / gelled spikes, library specs, horseshoe 'stache, sweatband), each `{ id: '<cat>.<value>',
  cat, value, name, gate?, hint?, color? }`; gates `era | fans | milestone | award | gigs` (+ `genreStart`: metal starts with the
  battle jacket, corpse paint, the Viking beard; punk the mohawk, liberty spikes, green dye; rock the Canadian tuxedo, slicked
  back; country the cowboy hat + boots, rhinestone suit, cowbell). Pyro = World era, your own cape = a Loonie, gold sticks =
  a gold record, your face on the kick = platinum. Swatches: 12 skins, eyes, 18 clothes, 12 kit colours. No gong, ever.
- Sim `2b_sim_creator.js` (`GG.creator`, DOM-free, no RNG): unlocks are pure functions of state (week-end hook on
  'week:wrap' → one wrap milestone line "New look unlocked: … (☰ → Look)" + `wrap.creator`; events loonies:result / cert /
  tour:gong / gig:done unlock now → 'creator:unlocked' (UI toast) and the next wrap lists them). New careers: stage look =
  everyday look, `newKit` (milk crates, band logo on the kick); `prepare()` hands the creator's look/stage/kit + carry-over to
  the 'career:new' hook. Carry-over per genre in `gg.v1.unlocks.<genre>` (wrapped storage). Save: chained onto
  `GG.save.migrate` in this module (not 10_save): fills player.stageLook (= look), player.kit (`legacyKit`: the v0.7 kit),
  unlocks (earned quietly + the stool throne) only when missing; never touches `state.v`.
- Render: the character builder moved into `40_render_core.js` (`R.charGeometry`; 41 `makeCharacter` calls it). Legacy LOOKs
  take the verbatim v0.7 path: 1,220 member/rival/recruit/preset/combo geometries hash-identical to v0.7, and the garage +
  stage scenes are hash-identical for a v0.7 player. v0.8 LOOKs draw build/height/age, 4 face shapes, eyes (+ colour), brows,
  noses, mouths, 8 facial hair, 5 glasses, 17 hair styles (hat-aware), 8 tops / 4 bottoms / 5 shoes / 7 headwear, stage
  outfits + extras (cape, studded wristbands, corpse paint), pixel-art tattoos (forearms, sleeves, neck, chest, teardrop,
  REGERTS down the forearm) and knuckle letters (3x5 font, readable in the Hands view), piercings. `R.kit`: shell finishes
  (paint = v0.7, wood, black, sparkle, flames, camo), black hardware, thrones (crates, leather saddle), cowbell, hair fan
  (spins on stage), pyro (arena shows only: capacity ≥ 5,000 / tier 4 / dome / festival / hall; bursts on moments and every
  16 beats when hyped), kick-head art (CanvasTexture: band logo by genre, your face, a moose, custom text), stick colour.
  41 `buildKit` = `R.kit.garage`; 42 kit builders + stage-look selection (drummer + members via `GG.creator.stageLookFor`),
  `info().kit` / `drummerV8`; 44 the carpet uses stage looks (a band outfit card drops your stage outfit).
- Preview `45_render_creator.js` (`GG.render.preview`): its own small WebGLRenderer inside the creator (the main loop is
  paused / has no career there); views full (drag to turn) / face / hands (fists to the camera) / kit.
- UI `5j_ui_creator.js`: screen `look` (full): preview, Everyday ↔ Stage toggle, tabs Body / Face / Hair / Clothes / Stage /
  Ink / Kit, locked parts dashed with a one-line "what unlocks it" note over the preview, knuckle inputs (A–Z, 4 per hand),
  🎲 Surprise. 51: the creator has "✂ Customize" (+ a "Your custom look" card) and the carry-over toggle; ☰ menu → Look.
  CSS block `/* v0.8 CREATOR */` after the v0.7 block.
- Tests: `sim_creator.test.js` 13 (new); `pw_creator.js` META_ONLY=creator (34) | kit (8) | stage (6) + contact sheet
  `tests/.cache/v08_creator_sheet.png`. `_load.js` SIM_SAFE now takes `2\w_` (2a_sim_shop, 2b_sim_creator). Green:
  node suite, pw_flow flow/layout/code, pw_garage, pw_stage, pw_label awards, pw_settings difficulty, pw_rival botb,
  pw_tour gong, pw_gig gig, pw_world van at 390×844; pw_flow flow + pw_creator creator at 440×956 (preload override).
- Gaps: 41's old `characterGeometry`/`hairParts`/`extraParts`/`guitarParts`/`capeParts`/`CAPES` are now dead code (kept to
  avoid touching 41 beyond buildKit; the lead can delete them after the merge). Members have no stage looks of their own
  yet (they fall back to their look). The hair fan doesn't blow your hair. Look changes persist at the next autosave.

## What's in v0.7 (sim) — WORLDSIM stage 1 (UI = stage 2, WORLDUI)
- World era ON (`economy.eras.worldEnabled`) at the Steady threshold (25k fans + a charting record; labels.weekly). Home
  scene stays 40k in World (Canada saturates); each region has its own scene (`world.scene` adds fans abroad).
  World-era home costs: eraUpkeep 50, commission 15%. Abbot Lane (London) opens in World (`labels.studios`).
- `GG.tour` (`25_sim_tour.js`, API in its header; content `content/world.js`; numbers `economy.tour`): 4 regions (C6 cities
  with x/y pins, region `pin` on the world map, `canadaPin`), 43 parody venues (Mudstonbury Jun, Wackelstein Open Air Aug,
  Summer Sonicboom Aug, Big Day Inn Jan, Siberian Frostfest Jan by Baikal, Budokhan Hall, the Finnish National Moose Opera),
  17 preset packages (per region: showcase once, 2 tours, 1–2 festival tours whose festival stops fix the departure week),
  8 rentals, 3 stays, 3 extras. Unlock at `threshold` = region.fans × (1.6 − genre fit) (×1.08 if the rival broke it first)
  OR an invite (festival slot/showcase: story card, half flights for 10 weeks) OR "big in one place" (a song blows up).
- Booking: flights (region $ × members + you + fill-ins) + rental + extra up front, hotels weekly; departs next Monday;
  never over the Loonies week, the Sad Dome, a studio session or the career end; `cancel` before departure.
- On tour (`away`): Monday = departure (jet lag) + this stop's show (open dates book from the regional board via the Book
  pick or auto best); region Monday cards (75%) or quiet, never the home deck; no home offers/showdowns; blocks map
  write→rehearse (hotel room, 70% gains), hustle→rest, book→promote (region fans); homesickness +15/wk (stay, low moods),
  −6 per rest, −12/wk at home; ≥45 mood drag, ≥70 forced first-block rest, ≥75 the homesick card (fly home early), ≥80
  burnout; members call home (chat tone 'home'). Gigs: crowd = walk-ins + region fans + buzz×fit (+ festival slice, hall),
  flat fee × payMult, new fans toward the region scene; rental travel (burnout by comfort, breakdowns), no Moose Hearse wear.
  Japan (not Osaka): silent crowd (meter frozen per song, reaction + 'applause' at the end, no boos/mosh). Region road cards.
- Calendar abroad: `seasonIn(region,w)` (Australia reversed), `seasonAt(state)`, regional climates/temps + city offsets,
  regional holidays replace Canada's (hanami, Golden Week, Bonfire Night, Novy God, white nights, Aussie Christmas…).
- Story: the Japanese fan-club president (Emiko Tanabe; first Japan week: card, gifts, Japan shows, comments), big in one
  place, the rival breaking regions (`state.tour.rival`), the Moose Opera (mooseAlbum ready/finland → Nordic Moose Run →
  Helsinki → `flags.mooseOpera = 'platinum'`, trophy `platinum_fi`, card `wt_moose`), the Global Gong (week 22, World era,
  nominated with a broken region or a festival; trophy `gong` + $5k), regional charts view. Save v7→v8 (`GG.tour.migrate`).
- Balance (10y×20, before → after): good world wk 103 (y5) → 103; avg 158 (y7) → 158; good y10 fans 48.7k → 63.7k (15.6k
  abroad, 5.2 tours, Gong 1.7 wins), fund $25.4k → $21.8k, Sad Dome 20/20 → 20/20, cracks 18 → 17; avg fans 39.5k → 42.9k,
  fund $11.7k → $11.1k, 2.1 tours, Sad Dome 13/20 → 8/20 (v0.6.1 had 9), quits/yr 0.64 → 0.63; invariants OK.
- Tests: `sim_tour.test.js` 17 (new); sim_calendar/sim_labels/sim_fans/content updated for World; pw_fans expects "Japan".

## What's in v0.7 (UI) — WORLDUI stage 2
- World map (`world`, full; laptop World tab + planner button "Plan a world tour 🌍"): a stylized world (Canada + the four
  regions, no USA), flight arcs, region pins with lock state (Open / Invite! / 🔒 fans needed / Soon), a card per region
  (genre fit, season, fans here vs breaks-at, threshold progress, broken / big / rival chips), status strip (none / booked
  + cancel / on tour + homesick). Region screen (`tour-region`): SVG regional map with city pins (festival grounds amber,
  the route dashed), tapped city's venues, season + holidays + flight cost chips, the packages. Package picker
  (`tour-pkg`): rental / stay / extra with prices, live GG.tour.quote (route, flights, rental, hotels, extra, upfront,
  estimates), Book (departs next Monday) or why not.
- On tour: departure Monday = the flight moment (plane arcs over the world map; jet lag, the rental waiting); region
  cards carry a region strip; the planner shows the stop + homesick bar and only rest / promote locally / hotel-room
  rehearsal (forced rest locks slot 1); an open date opens the regional board (region map, its clubs, the rental strip);
  the wrap shows hotels, homesickness, members calling home (chat tone `home`), unlocks, invites, broken regions, big in
  one place, the Gong, the homecoming (`tour-home` recap sheet: shows, best night, fans, fees vs costs, net).
- 3D: rentals + regional scenery in the van (UK & Europe hedgerows/castles/cottages/sheep, Japan neon streets/blossoms/
  vending machines, Australia red outback/roadhouses/termite mounds/kangaroos, Russia birch taiga/izbas/onion domes/a bear;
  the tiny European van packs the band three abreast with gear to the roof, its own camera; rail passes run on rails,
  faster). Festival stages (Mudstonbury/Wackelstein mud + tents + a flying welly, Big Day Inn sun, Summer Sonicboom
  beach, Siberian Frostfest snow + pines + frozen Baikal), Budokhan Hall (tiers, ring of lights), the Moose Opera's
  antler chandelier; a silent (Japanese) crowd stands still during songs, claps then bows on 'applause'.
- The Global Gong ceremony (week 22, nominated): the v0.5 red carpet reused in Amsterdam (marquee "The Global Gong"),
  envelope = GG.tour.runGong, winner, a speech (loonie-card), after-party; the Moose Opera moment after the wrap.
- Fixes: 42_render_stage `G/band/members/flags/player` were swallowed by a comment in the WIP (every stage build threw);
  a legacy v0.1 `kind: 'hall'` still maps to a Canadian kind (world stages come only from venue ids / flags).
  Driver lines in the flight/board/homecoming follow `GG.world.driver` (you drive if the driver quit).
- Existing flows: laptop now has 8 tabs (pw_fans bandbook, pw_rival scene updated).
- Tests: `pw_tour.js` META_ONLY=map (24) | tour (28) | gong (13), default also writes the contact sheet
  `tests/.cache/v07_sheet.png`.

## What's in v0.6.2 "Two thumbs" (owner feedback: chords + songwriter)
- **Two-thumb rule** (`22_sim_gig`): every difficulty caps a moment at 2 judged notes (kick > snare > cymbal > toms >
  ride > hat; `gig.THUMBS`, `gig.THUMB_PRIORITY`; all DIFFICULTIES `chord: 2`). Dropped hits go to `chart.auto`
  (not judged, never a miss, not in total/accuracy). The live gig plays them via `GG.audio.hit(lane, ctxTime)` scheduled
  `lat + 0.15 s` ahead at `G.zero + t` on a healthy audio clock (frame-due fallback when free-running) and draws them as
  dashed ghost gems + a small ring. Free-style windows untouched. Hard/Expert stay harder via density + speed.
- **Groove presets** (`content/grooves.js`): 5–6 named one-bar beats per genre with a one-line description (metal
  Headbanger*, Blast beat, Thrash skank, Half-time doom, Gallop + Double-kick run locked until the pedal; punk Punk skank*,
  D-beat, Four on the floor, Buzzsaw 8ths, Hardcore two-step; rock Rock backbeat*, Half-time, Shuffle, Four on the floor,
  Bleacher stomp; country Train beat*, Two-step, Waltz feel, Brush shuffle, Hoedown; * = signature, Groove ≥ 70) +
  4 one-tap mods per genre (More metal/punk/rock/twang, Make it catchier (chorus only), Simpler, Busier) as op lists,
  tempo labels (metal Doom crawl/Headbang/Mosh/Thrash/Blast …) and per-step coach lines (picked by member role).
- **Guided Write flow** (`54_ui_sequencer`, default; `settings.songwriterMode` 'guided'|'advanced'): Verse → Chorus
  (contrast hint) → Bridge (preset cards + tweak buttons showing Groove/Hook/Difficulty before → after) → Tempo (big
  BPM + label + slider) → Song order (Short/Classic/Epic cards) → Name (Marcel's reroll or type) → Save; Back / ▶ Play /
  Next on every screen, "Let the band jam one" still in the header. "Advanced ⚙" opens the grid (remembered); the grid's
  Song tab has "Guided steps" back. The kit sketch pad and catalog view always use the grid.
- Tests: sim_gig two-thumb test (20), content grooves test (47), pw_seq new `guided` section (23; seq 34 checks the
  Advanced switch + memory), pw_gig gig (29) checks auto notes play + are scheduled ahead. Sheet: `tests/.cache/v062_sheet.png`.

## What's in v0.6.1 (world) — Addendum 1 C1/C6/C7 (WORLD agent, lane B1)
- Calendar `src/28_sim_calendar.js` (`GG.calendar`): two weeks per month from July, C.SEASONS (winter 11–16, spring 17–22,
  summer 23–4, fall 5–10; world/garage/van seasons follow it), weekly weather per season + city climate (coast/north) from
  its own seeded RNG (`weatherAt` pure; `state.weather` cached Mondays; never cancels a gig), holidays (Canada Day 1,
  Thanksgiving 7, Halloween 8, Remembrance 9, Grey Mug 10, Christmas 11–12, NYE 12, St. Paddy's 18, Loonies 20).
  Effects: outdoor turnout by weather (`shape`), crowd/score/fans via `gigMods` (folded into `GG.drama.gigMods`), road
  risk/wear/burnout (`roadMods`: winter ice, spring potholes, blizzards, hail), genre-season fit (metal owns winter,
  country/punk the summer; doubled x1.5 at their rooms), venue availability (`venueOpen`: seasonal/holiday rooms, no
  skate parks in winter, no Legion on Remembrance Day), holiday pay/weights (NYE x2 floor, pub + party circuits), holiday
  Monday cards (`holidayCard`, priority order; guilt Thanksgiving if you owe, Halloween costumes -> flags.costume, the
  label's Christmas single, the Grey Mug halftime once in Signed with 20k fans -> next Monday +5% fans + trophy
  'greymug'), season news lines, season cards (cabin fever, frosh week, hail season, the festival lineups).
- Rings (`content/map.js` rings + city.ring): Sask (+ Humboldt, Gravelbourg, Estevan), the West (Local Heroes), East &
  North (Signed); `world.ring/ringOpen/cityOpen`; ≤1 far listing a week (`economy.world.farListings`); long hauls taper
  burnout (`burnoutTaper`, `burnoutMax` 30) and cap breakdown km (`breakdownKmCap` 400). 37 new rooms:
  parody venues per ring city (Frostbite Lounge, Commandant Ballroom, The Hoofprint, Messy Hall, …) + seasonal/holiday
  rooms (Canada Day bandshells, fair grandstand, stampede beer gardens, frosh bowl, harvest dance, potash Christmas
  party, the Bassborough NYE ballroom, Paddy O'Furniture's). Venue fields: outdoor, season, weeks, holiday.
- Drivers (`content.drivers`, `world.driver/driverMods/syncDriver/driverFor`): Kenji (breakdowns x0.5, cactus), Moth
  (free repairs, comfort −2, laundry), T-Bone (safe x0.6, slow, cassettes), Earl (slow, +2 chemistry on long drives,
  atlas), you (x1.15 breakdowns, +25% road cards). Driver quits/poached -> you drive (drama hook + chat), returns -> back.
  Road cards: Kenji-at-the-wheel cards gated `driver:['kenji']`; new gates driver/weather/holiday; 15 new cards (deer on
  the Yellowhead, the fight over shotgun, cape in the sliding door, whiteout on the Trans-Canada, hail, heat, frozen van,
  construction, mosquitoes, Christmas lights, long weekend; you-drive: wrong turn, gas-station argument, lead foot, music).
- UI: HUD calendar strip (`hud-cal`, month · season · weather °C · holiday; week-chip toast explains it); board calendar
  line (`board-cal`), ring tabs (`ring-<id>`), locked-ring teaser (`ring-locked`), tag chips (`board-tag`); van header
  weather + driver (`van-weather`), van sheet driver panel (`van-driver`), 2D windshield weather + cactus; 3D van: setTrip
  { weather, driver, dashboard } (blizzard whiteout, hail, heat haze), you ride shotgun / drive, band behind, gear + merch
  piled behind, dash item; garage decor (window snow in winter, Christmas lights in December, box fan in July / heat).
- Save: v6 -> v7 (`GG.calendar.migrate`: weather; van.driver via world.migrate); `state.v = 7`.
- Tests: node sim_calendar 15 (new), sim_world 19, content 42 · pw_world calendar (19; screenshots hud_calendar.png,
  board_rings.png, van_driver.png) + board 14 + van 13.
- Balance (10y x 20): avg local wk 21 / offer 38 / signed 42 / world-ready y7; good 15 / 26 / 27 / y5; Sad Dome avg
  9/20, good 18/20; quits 0.58/yr; loans after y1 avg 0.10, good 0.05 (before: 23/46/49/y7, 17/29/30/y5, 11/20, 20/20).

## What's in v0.6.1 (fans) — Addendum 1 C5 (FANS agent, lane B2)
- `GG.fans` (`29_sim_fans.js`, API in its header; content `content/bandbook.js`; numbers `economy.fans`). Own seeded RNG per
  roll (seed + week + salt + post counter), never the career RNG. Events `fans:post|viral|scandal|gift|club`.
- Bandbook: every Promote block posts automatically (kind from band state: gig announcement, song teaser, rehearsal clip,
  behind the scenes, meme) → buzz, fans (one global count) and streams of the newest release. Small viral chance
  (weirder kinds likelier): good, or the wrong kind (Marcel's "Abyssal Two-Step" dance tutorial: buzz up, his mood down,
  haters up). 2–4 sentiment comments per post + Tundra Wraith's supportive comment on every post; Dale/Wendell/haters comment.
- Fan types `state.fanTypes {super, casual, hater}` = shares of `state.fans`; drift weekly (superfans with chemistry and a
  happy club, haters with fame and scandals). Superfans follow on tour (`gigShape`: crowd/buzz only; merch is v0.8).
- Named superfans `state.superfans`: Dale from Warman (every show: crowd line + comments; his macaroni portrait of Kenji
  via a card), Big Wendell the jumper-cable trucker (met via a fan card after long hauls), Japanese fan-club president
  reserved for v0.7 (shown locked).
- Scandals → choice cards next Monday (`scandal_turf`: Marcel's lawn is artificial turf, and more); fan cards are forced by
  `GG.fans.forcedCard`, never drawn. Fan mail + gifts (`state.gifts`) weekly by chance; garage shows the portrait by the gig
  board, a gift pile (1/3/6 boxes) and a letter stack.
- Patreeon (`state.fanClub`, Signed era; tiers Drumstick $3 / Snare $8 / Full Kit $20): members from superfans × happiness;
  a weekly exclusive post (Bandbook app) keeps them happy; payout every second week (12% platform cut).
- UI: laptop tab "Bandbook" (7 tabs in two rows) → `GG.ui.bandbookPanel` (`5g_ui_bandbook.js`): Feed / Fans / Patreeon.
- Save: `GG.fans.migrate` chained onto `GG.save.migrate` fills missing fields idempotently.
- Tests: `sim_fans.test.js` 14, `content.test.js` 46, `pw_fans.js` bandbook 19 / fanclub 13; `pw_rival` scene now expects
  7 laptop tabs. Balance (10y×20): avg LH/offer/signed wk 20/39/46 (was 21/38/42), good 15/27/28 (15/26/27), world-ready
  y7/y5 unchanged, avg y10 fund 11.7k (8.9k; Patreeon), quits/yr 0.64 (0.58), Sad Dome 13/20 & 20/20 (9 & 18).

## What's in v0.6.1 (settings) — Addendum 1 C4 (SETTINGS agent, lane B3)
- `11_settings.js` (node-safe): `GG.prefs` (get/set → 'settings:changed', profile/setProfile, offsets, setCalib,
  calibCompute, CB_COLOURS) and `GG.difficulty` (of/mul/add/text; wraps `GG.save.migrate`: missing = 'normal').
  Settings defaults live in `GG.save.SETTINGS_DEFAULTS` (10_save; only changed keys are stored): gigDifficulty, noteSpeed,
  noFail, autoKick, audioProfile, calib {speaker|headphones: {audio, visual, at}} (ms), calibSeen, lefty, colourblind,
  bigText, reducedFlash, cameraShake, graphics (low|med|high, default high = the old look), skipVan, fastAnim.
- Career difficulty (`state.careerDifficulty`, picked on the creator screen, locked): multipliers `economy.difficulty`
  read only through `GG.difficulty` — start fund, gig pay (applyResult), hustle cash, upkeep, bandmates' mood losses
  (drama), rival skill + how badly their off nights go, label advances + goodwill losses. Chill: +20% pay, −15% bills,
  moods fall 35% slower, rival −5; Brutal: −15% pay, +20% bills, moods fall 40% faster, rival +4 and rarely off.
- Gig: `GG.gig.DIFFICULTIES.expert` (windows ×0.8, misses ×1.3, faster scroll); session opts `noFail` (crowd floor 20,
  no boos/drinks) and `autoKick` (kick notes play as Goods; kick taps ignored); results carry `difficulty` + `assists`.
  55: note speed scales the scroll; lefty mirrors drawing/touch/keys; colourblind lane colours; the active profile's
  audio offset is subtracted from taps and the highway draws (visual − audio) ahead (v0.5.1 clock untouched).
  Setlist sheet: Expert, speaker/headphones quick switch, assists line → Settings.
- `5h_ui_settings.js`: 'settings' (title ⚙ + ☰ menu), 'calib' (auto once on first launch, skippable; eight clicks on
  the AudioContext mapped to performance time once, then the flashing light; saved per profile), 'practice' (any song at
  50/75/100%, studio mode on a shadow state: nothing saved) from the laptop Band tab, Settings and the kit's sketch pad.
  `<html>` classes gg-big / gg-calm / gg-fast; 40 `R.prefs()` (pixel ratio 1/1.5/2, crowd 40/70/100%, calm, shake);
  42 calm = no strobing washes or hit flashes; 57 skipVan / fastAnim.
- Tests: sim_career +2, sim_gig +4, save (defaults), new `pw_settings.js` (settings 44, calib 14, difficulty 17).
- Gaps: no camera shake exists yet (the toggle is a hook for later scenes); the first-launch calibration is skipped under
  automation (navigator.webdriver) unless `?calib=1`; kit practice is a button injected under the sketch pad (54 is lane A's).

## What's in v0.6.1 (audio) — Addendum 1 C3 (AUDIO agent, lane A)
- `30_audio.js`: per-genre generated band (genre kit tuning in `content/genres.js`, metal doom/chug/tremolo kept), a
  random key per song (seeded by song id), section density (sparse verse, full chorus, stripped breakdown, solos),
  formant vocal hits on the beat grid; a convolver per room class picked by the venue; crowd bed following the meter +
  cheers/boos on 'crowd:moment'; garage hum, van road noise, van radio (your charting singles); 4-bus mixer
  (settings.mix) + sequencer metronome (♩ in the sequencer header, settings.metronome); settings.brushes (country).
- Settings screen: mixer sliders, metronome and brushes toggles drive GG.audio (VERIFY wired 'settings:changed').
- Tests: new `sim_audio.test.js` (10); `pw_seq.js` audio 38, seq 31. Nobody has listened to it yet (offline renders only).
- Gaps: kit quality tiers v0.8; v0.2 gear upgrades have sounds but no shop; garage hum waits on a 1 s scene poll.

## v0.6.1 verify (Stage C)
- All node + pw suites green at 390×844; flow/layout/gig e2e/touch also green at 440×956 (scratch viewport override).
- Integration fixes: 'settings:changed' (mix/metronome/brushes/muted) → `GG.audio.applySettings()`; Brushes toggle in
  Settings; toasts/sheets/scrim start below the new calendar strip; week chip `W12/24` no longer ellipsizes at 390;
  "🔊 Speaker" label fits; Kenji's dash cactus 1.7× so it reads. Contact sheet `tests/.cache/v061_sheet.png`.

## What's in v0.6.0 "Rivals" (stage 1 sim + content, stage 2 UI done)
- Rival sim (`23_sim_rival.js`, API in its header): Tundra Wraith run a parallel career (fans chase `economy.rival.fansCurve`
  × momentum from the head-to-head record; buzz; garage → local 250 → signed 1,100 with Monolith; one record a year timed
  before the Loonie nominations, charting on the Maple 100 and shown in `labels.chartView`). Every roll is seeded by career
  seed + tag + week: the career RNG is never touched. Set strength = 87 − 37·e^(−week/66) + form (± streaks) + crack penalty.
- Heat 0..100 (start 12): + per clash (`economy.rival.heat.clash`), −max(0.4, 2.5%)/week; above 25 it feeds buzz to both
  bands; the weekly showdown chance = 0.1 + 0.0035·heat (min gap 3 weeks, per-kind cooldowns, gates in `economy.rival.kinds`).
- Showdowns (`state.showdowns`, SHOWDOWN + id/name/rival/lines): **botb** = a Monday gig offer (`offer.showdown`, prize by
  era, winner steals 3% of the loser's fans; their set score deterministic per week), **sameNight** = your gig that weekend
  loses crowd by buzz share (door pay + fans follow), **stolenSlot** = the best board listing at a venue that doesn't love you
  is taken (`listing.stolen`, unbookable; rep 3 venues turn them down = a win), **festival** = a summer board listing
  (festival grounds in `content/rivals.js`, they headline; outplay them for bonus fans + buzz), **loonies** = co-nominations
  (won if you beat them in ≥ 1 shared category; rival Loonie strength = their records/skill/fans + an award-darling bonus),
  **poach** = a forced Monday card for an unhappy member (stage ≥ 2, not protected): a bonus / the spotlight keeps them,
  the gamble can lose them to the rival (member act `poach`, `stats.poached`), **final** = year 10 week 21, the Sad Dome
  (Calgary, 620 km) is booked on Monday (+ a "Sad Dome eve" card); your score vs theirs → `state.finalShowdown`
  `{ week, won, headliner: 'you'|'rival', score, rivalScore, rival }` (auto-resolved at the wrap if it wasn't played).
  Unplayed showdowns close at the wrap with news (forfeit, missed festival, quiet same-night).
- Cracking (net 7 wins, ≥ 9 wins, heat ≥ 30, from year 2): breakup / rebrand (new name, `{rival}` token follows) / opener
  (they open for you: extra crowd now and then); a crack card next Monday; heat resets. Defectors (v0.4 + poached) join
  their lineup in corpse paint (`rival.members[].defector`).
- Content `content/rivals.js` (`GG.content.rivalry`): Gord "Grimnir" Penner (vocals) + Sheila "Hexenfrost" Wiebe (guitar),
  Darryl "Vorthul" Klassen (bass), Lorne "Frostgrave" Dueck (drums): looks + `corpsePaint`, gags, 14 songs, 12 records, 5
  rebrands, news pools, showdown texts (UI cards + verdicts), 5 rival cards, 14 scene bands, 3 festivals + the Sad Dome.
- Hooks: career (newCareer init, startWeek → `rival.monday` after the board refresh, resolveCard → `afterCard`, settleGig →
  `rival.shape` before applyResult, endWeek → `rival.weekly` → `wrap.rival`, botWeek → `rival.botWeek`, cardById, `{rival}`),
  drama (forcedCard → `rival.forcedCard`, act `poach`), labels (rivalStrength, rivalName, runLoonies values + `rival.loonies`,
  chartView), world (canBook skips stolen listings, a cracked rival stops headlining), gig (`gig.venue` finds rivalry venues).
- Save schema 6 (`GG.rival.migrate` wraps `GG.save.migrate`: a missing rival is created and caught up quietly).
- Balance (`node tools/balance.js 10 20`, new columns sd/sdW/heat/rvF + a rival line): avg bot 3.3–4.7 showdowns/yr
  (y2+) at heat 20–69, wins 30–56%, never cracks them, headlines the Sad Dome 11/20; good bot 2.5–4.5/yr, wins 64–82%,
  cracks them 19/20 (y3–9), headlines 20/20. Loonie wins ≈ v0.5 (avg ≈ 3.5/career). y10 avg fans 36.1k→37.3k, fund
  $9.7k→$11.6k; good 43.9k→47.9k, $23.6k→$25.7k (prizes, the Sad Dome, heat buzz). Tests: sim_rival 15 (new).
- UI (`59d_ui_rival.js`, API in its header): laptop **Scene** tab (rival card + head-to-head, heat meter + showdown odds,
  Sad Dome countdown/result, top-10 scene leaderboard, news, recent showdowns, lineup with gags/defectors, their records);
  Monday **showdown sheet** after the card (BotB Enter/Pass, same-night split bar, stolen slot verdict, festival → board,
  Sad Dome); rival cards get a rival strip (poach: the member's mood) and `ui.who('wraith_frontman'|'tw_*')` = the cast;
  **showdown weekend** (`ui.playShowdown`, from `main.playWeekend`): BotB/festival/final show **their set first** (screen
  `rival-set`, live3d: `render.stage` spectator camera on a riser in the crowd, their lineup in corpse paint + black stage
  shirts, their drummer on the throne, a banner, ticking per-song scores, their drummer plays the pattern, skippable) →
  your live set (score to beat in the gig bar) → **verdict** (`rival-verdict`; also after a same-night split). Board
  badges (stolen/defended/festival; stolen = "Taken" and unbookable), wrap rival panel (+ crack panel), end-screen Sad Dome
  line, rival rows on the Maple 100. `GG.ui.showdownViews` (default: on unless `gigAutoplay`) keeps autoplay flows fast
  (toasts instead). The van to Calgary shows "Saskatoon → Calgary" (world.startTrip: off-map cities keep their name).
  Tests: `pw_rival.js` META_ONLY=scene|botb|final (+ contact sheet `tests/.cache/v06_sheet.png`).

## APIs (full shapes in `src/02_contracts.js`)
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
  `THUMBS` (2), `THUMB_PRIORITY`.
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


## v0.5.1 hotfix (owner phone report: "the playing mini game is broken, it's also quite difficult")
- Gig clock now free-runs on performance.now() and only drifts toward the audio clock while it's healthy (running, ~1x);
  a stalled/suspended/erratic AudioContext (iOS silent switch, screen recording, Control Centre, headless) no longer
  freezes, rewinds or fast-forwards the notes. Taps wake a suspended context; event timeStamps on another time base are
  ignored; taps are caught on the document (capture) inside the highway's rectangle so no stray layer can swallow them;
  any layer above the show is closed at "Start the show".
- Gig difficulty (owner decision: new players get **Easy**): `GG.gig.DIFFICULTIES` easy / normal / hard, chosen on the
  setlist sheet, saved in settings (`gigDifficulty`). Easy ≈ 3–4 notes/s (time-spaced lanes, ≤2-note chords, windows
  ×1.45, misses hurt the crowd ×0.55, slower scroll); Normal ≈ 6–8/s; Hard = as written (the sim's default for bots).
  Addendum C4 extends this (Expert, note speed, assists, settings screen) in v0.6.1.
- Tests: sim_gig difficulty test; pw_gig `touch` section (real touchscreen taps under a stray layer, stalled clock).

## Back-burner
- v0.6: the Sad Dome trip's `trip.to` is still the home city id (Calgary is off the Sask map; labels + km are right);
  `npcs.wraith_frontman` is still named "Tundra Wraith's frontman" in content (the UI shows Gord); heat decays emit
  'heat:changed' every week; the spectator view keeps crowd pits off (they'd run through the riser camera); rival banter
  lines live in 59d (UI flavour, like 55's); other bands' rivals have no cast until v0.9 (the Scene tab shows an empty lineup).
- v0.5: rival strength for Loonies is a scripted curve (`labels.rivalStrength`) — v0.6 replaces it with the rival sim.
- v0.5: DIY bands have no deal object (Label tab says "No label yet"); theatres use kind 'club' + `theatre:true` (club
  dressing); producer `weird` unused; full-career save code ≈ 65–70k chars (album reviews); balance 10×20 takes ~39 s.
- v0.4: late-game avg-bot fund plateaus ~$3.5k (was $11k) because of the members' cut; the good bot never sees drama
  (moods ~85). Both belong to the v0.5 era/economy pass. Pay-the-band money has no other use yet (members' savings).
- v0.4: fill-ins have generic garage idles/tap lines; the van scene doesn't carry fill-ins.
- v0.4: epilogue lines per original are content-only hooks for v1.0; `rivalDefectors` isn't used by a rival sim yet (v0.6).
- v0.4: EFFECT_KEYS additions (`member`, `payCut`, `repay`) are pushed at runtime by 20_sim_career until the lead
  folds them into 02_contracts.js.
- v0.3: later years pay far more than v0.2 (good bot year 2 ≈ $7k fund, 2,000 fans) because of 250–300-cap rooms —
  needs the era/economy pass in v0.5.
- v0.3: no latency-calibration setting for players yet; `A.hit` has no per-lane choke.
- v0.3: van space has no use yet (merch in v0.8). Gig banter lines live in 55_ui_gig.js, not content/lines.js.
- Restoring a save code keeps the code's slot; its next autosave overwrites that slot without asking.
- With the planner sheet open the room squeezes into a 150px band and hotspot labels overlap a little.
- Once-only garage cards run out after ~1.5 years; later garage years lean on repeatables (eras/content in v0.5+).
- Full-career save code ≈ 17.6k chars (could trim `history`).
- Flags `mooseMuse` and `babaMad` are set by cards but unused yet (hooks for the moose album chain / baba storyline).
- Week-one teaching is one in-character toast; the full guided tutorial is v1.0.
- Marcel's mirror has no reflection.
- v0.2: last week's plan stays on the whiteboard (v0.1 behaviour); Go with a kept Write opens the sequencer again.
- v0.2: the mix was tuned by numbers (peaks/rms), not by ear on a phone; backing for punk/rock/country is basic.
- v0.2: sketch-pad edits and queued sketches persist only at the next autosave (week wrap).
- v0.2: gear upgrades (double kick, toms, ride) exist in the model/audio but nothing sells them yet (v0.8).
