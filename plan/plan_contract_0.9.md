# v0.9 "Genres": plan contract (planner draft, reviewed by the lead; owner answers in §0)

Repo: `/home/user/GarageToGlory`, branch `v0.9-genres`. VERSION is already `0.9.0.0`. All paths below are repo-relative.

Sources: `plan/status.md` ("v0.9 Genres — owner decisions", "Addendum 1 — decisions/pending"), `plan/handoff.md` A3, B4 v0.9 and Part C, and four read-only audits (sims, content, ui, render_audio). Line numbers come from those audits and were spot-checked.

---

## 0. Owner answers (popups 2026-09-30 — all LOCKED; every lane builds to these)

- **Q1 Gravel Kings' home turf = (a)** a new **Alberta** ring open from day one for Gravel Kings only: Edmonton + St. Albert,
  Sherwood Park, Leduc, Red Deer, Calgary, Lethbridge. For Gravel Kings, Saskatchewan and the rest of the West open at Local
  Heroes; for the other three bands, Alberta opens at Local like the West.
- **Q2 Storylines = (a)**: Frost Heave "Rox for City Council" (campaign → debate → election night); Gravel Kings "The Riff"
  (cease-and-desist over Lenny's riff → court date → his first truly original riff); Ramblers "Travis Lee's First Truck" (the
  condo kid buys a 1987 clunker, Earl teaches him stick, the truck drags them into the truck-ad war with Buckle & Boot).
- **Q3 World payoff = (a)** one per band, each a tour package + a 3-card chain, counting toward the Global Gong like the
  Moose Opera: Frost Heave's squat anthem goes big in Berlin (Wackelstein Open Air); Gravel Kings headline Mudstonbury's main
  stage; the Ramblers take the Australian country-festival circuit.
- **Q4 Rival size = (a) fair fight**: all three new rivals run an underdog curve (~40–400 fans) so showdowns stay winnable;
  fame is flavour (Chartbusters' separate "legacy" number, Mall Rats' TV buzz, Buckle & Boot's sponsor money); their
  scene-filler rows are skipped in their own band's career.
- **Q5 = (a)** each band its own home superfan in Dale's slot (Regina laundromat regular, Edmonton mall-walker, Swift Current
  coffee-row farmer). **Q6 = (a)** every band its own misprint (FROST HEAVY, GRAVY KINGS, THE GRID ROAD RUMBLERS).
  **Q7 = (a)** rented rooms keep their geometry but get localised names + blurbs per home city. **Q8 = (a)** cross-band
  cameos (the other playable bands + Tundra Wraith on the Scene leaderboard, jam-room stickers, 1–2 cameo cards).

### Defaults taken without a popup (listed in the popup text so the owner can object)
- The title screen stays Hail Damage's hailstorm garage (the game's cover).
- The "Garage" era keeps its name for every band.
- Country solos go to Earl (twang lead). Clementine's fiddle takes the fills and outro breaks. This matches `gig.roles`.
- Punk solos are Benny's two-chord "solo" break.
- Buckle & Boot play with an unnamed hired drummer ("the session guy"), with the truck mascot on stage. This keeps the drummer render path.
- Chartbusters' current drummer is "Steve #5".
- The player's mom and dad stay the player's parents in every city.
- Other bands' week-one teaching is one forced week-1 card plus the in-character toast. The full tutorial is v1.0.

---

## 1. Completeness critic: what the four audits missed

Checked against B4 v0.9, Part C (C1/C3/C6/C7), the owner decisions and the v0.8.1 gaps.

| # | Gap | Where | Lane |
|---|---|---|---|
| 1 | Review outlets only have `byBand.hail_damage` (5 outlets). The sim already merges `byBand[bandId]`, so other bands get generic quotes only. | `content/reviews.js` L53/107/149/191/233; `24_sim_labels.js` L813 | A1 |
| 2 | The rival fan curve contradicts the scene-filler numbers (Q4). The rival sim uses one `economy.rival.fansCurve`. | `rivals.js` L226-228; `23_sim_rival.js` cfg/create L124-130 | B + A |
| 3 | C7 genre-season fit has no rooms near the new homes. Regina has no all-ages skate park (the only nearby one is the Swift Current skate bowl, L85, where country fits 0.4). SW Saskatchewan has no fair or rodeo grounds, and the only harvest-dance hall is in Humboldt (L306), so "harvest dances boost the Ramblers" can't reach them. Edmonton has no tier-1 rock room. | `content/venues.js` | A2 |
| 4 | A15 week-one tap-walk: the 7 `C.HOTSPOTS` need positions, labels and walk targets in each new tier-0 room. | `41_render_garage.js` L409-418 | C |
| 5 | A15 "peek at the starting space" on the genre card: today the card is text only. | `51_ui_menu.js` L186-208 | C hook + B (optional) |
| 6 | No generic speaker guard. `drawCard` (`20_sim_career.js` L372-386) and `postChat` (L183-191) never check that a speaker belongs to the band. One guard closes most leak vectors at once, including cards, calendar news, studio events and world cards. | `20_sim_career.js` | B |
| 7 | Role-aliased speakers and effects (`@front`, `@soloist`, …) are needed so shared cards (guilt, holidays, road, generic) are written once rather than four times. | `20_sim_career.js` APPLY / card draw | B + A |
| 8 | Rival casts carry a `label`. A rival-only label (Mall Rats' network label, the Chartbusters' own conglomerate) must never be offered to the player. | `content/labels.js`, `24_sim_labels.js` offers | A2 + B |
| 9 | `tests/content.test.js` whitelists speakers against `HD_IDS` at L180, 258, 624, 682, 714, 772, 798 and 1048, so every new member's card fails. | tests | A |
| 10 | Chartbusters "bought the radio conglomerate": a per-rival Maple 100 / radio bias. Mall Rats "throw sponsor money at you, too": a sponsor-offer card set, not only a poach variant. | `economy.js`, `23_sim_rival.js`, rival cast cards | B + A |
| 11 | Forward compatibility with v1.0: epilogues for the 10 new members (A14), "The Original Five" (sizes vary), "a statue in Saskatoon" (use `{city}`), and HD-flavoured achievement seeds (Ma Pelouse, Buddy). Write the epilogues now; flag the rest for the v1.0 contract. | `content/drama.js` | A1 (v1.0 note) |
| 12 | C1 van tiers 1-3 look identical for every band. Only tier 0 was audited. Optional per-band livery or paint for tiers 1-3 (Squat Van, Night Rider, The Hay Wagon, Frost Heave One, …). | `43_render_van.js` | C (optional) |
| 13 | RNG stream shift: new filters and draws change Hail Damage's seeded outcomes. Tests pinned to exact seeded lines or values may break, and balance comparisons must be statistical. | all sims/tests | B |
| 14 | Bundle size: `dist/game.html` is 2.88 MB and content is 667 KB. Three bands of content adds roughly 0.5 MB. Budget ≤ 3.8 MB. | build | lead |
| 15 | `C.CARD_BOOKABLE` (`02_contracts.js` L62) lists only Saskatoon venues, so band cards can't `book` home venues. | contracts | lead (stage 0 + integration) |
| 16 | `status.md` "Addendum 1 — pending" v0.9 line (C1 drivers in play, C6 starting cities, rivals' members) needs ticking. | status | lead |

Everything else in B4, Part C, the owner decisions and the v0.8.1 gaps (licensing/recap text, tier-0 rooms, Buckle & Boot fury) is already covered by audit findings and appears in the lane task lists.

---

## 2. Already works: do not rebuild

- **Band data and careers.** `career.band()`/`newCareer` build members, genre, region, city and tier-0 space from `bands.js`. The genre, intro, cold-open and logo screens are data-driven. Creator carry-over is per genre. `GG.main.newCareer`/`quickStart` accept `bandId`.
- **Gates.** `gatePasses` supports `band` and `genre` everywhere: Monday deck, holiday, tour, fan, shop, licensing, studio and road cards. `forceWeek` cards pick the first card whose gate passes, so a per-band week-1 card needs content only.
- **Songs, grooves, genres.** All 4 genres covered: rate, generate, starter, signature, presets and mods, tempo labels, album words and cover motifs by genre. Kit tuning (C3) is done.
- **Gig.** Charts, the two-thumb rule, doubles, pay and fans are genre-agnostic. `gig.roles()` finds front/solo/fill for every lineup. Lineup sizes of 3 and 4 work in gig, drama, van seating and carpet.
- **Drivers and vans.** `content.drivers` has all four drivers with mods and dashboard items. `world.driver`/`driverMods`/`syncDriver` and the "you drive" fallback work. `vanNames` per band per tier (the C1 table) and `shop.init` renaming work. `buildDash` draws cactus, laundry, cassettes and the atlas.
- **World, calendar, tour.** Regina, Edmonton and Swift Current resolve as home. Weather comes from city climate. `genreSeason`/`genreKinds`, the genre-region fit table and tour packages work.
- **Rivals, labels, fans, creator, logo, recap, licensing.** The machinery is generic. Logos exist for all 4 bands and all 4 rivals. `rivalLines` already reads `rivalThanks[rivalId]`. The awards `nominees[genre]` shape is supported. `outfitCards` takes the first card whose gate passes. The Buckle & Boot fury hook and the `lic_fury` card are wired.
- **Render.** The per-genre stage crowd (the `GENRE` table in `42` L76-90), all 4 genre peak moments, role-slotted band placement, genre kick-head art, all 4 logo lettering styles, and the garage's band-independent systems (tiers 1-3, upgrades, box pile, seasons, trophies, fill-ins, sulk, taps) all work.
- **Audio.** There is a generated band for every genre (`30_audio.js` BANDS L964-1012), plus vocal hits (hey, shout, yeehaw, ooh, yeah), per-genre keys, venue rooms, the van radio and live taps. All metal-only v0.7.2 code is gated.
- **UI.** `ui.who` resolves any band's members. Wrap, planner, laptop, drama UI, board listings, the van-info sheet, the studio cover drawer, the rival panels' structure and 60_main routing are generic. The `55` BANTER pool already has lines for 9 of the 10 new members (Travis is missing).

---

## 3. Stage 0 (lead, one commit on `v0.9-genres` before the worktrees fork)

1. **Record the owner's answers** in `plan/status.md`.

2. **`src/02_contracts.js`** (lead-only from here on):
   - `C.IDLES` += `'fiddle'`.
   - `C.LOOK_EXTRAS` += `'toque'`, `'bighat'`.
   - `C.GEAR = ['v','bass','sg','strat','tele','acoustic','fiddle']`.
   - `C.MOMENTS` += `'pogo','fistPump','clapAlong','headbang','gangShout','singAlong','yeehaw','stageDive','kneeSlide','hatTip'`.
   - `C.RIVAL_ACTIONS = ['kickflip']`.
   - `C.ROLE_ALIASES = ['@front','@soloist','@filler','@bassist','@namer','@grumbler','@deadpan','@driver','@any']`.
   - `C.SPACE_KINDS = { parents_garage:'garage', laundromat_basement:'laundromat', strip_mall_unit:'stripmall', quonset:'quonset' }`.
   - `C.TOKENS`: document the token list from §4.2.
   - `C.CARD_BOOKABLE` += `'craigs_basement','mill_woods_basement_party','quonset_yard_party'`.
   - CONTENT SCHEMAS: add the new band and member fields below, plus the pool, variant and cast shapes from §4.

3. **`src/content/bands.js`**: add the fields below, then hand the file to Lane A.
   - Set `locked:false` and `comingIn:null` on `frost_heave` (L78), `gravel_kings` (L118) and `grid_road_ramblers` (L157).
   - Fix the header comment at L14.

   | band | roles `{namer, grumbler, deadpan}` | firstGig | homeRing | spaceShort | door | province | coldOpenFx | throne |
   |---|---|---|---|---|---|---|---|---|
   | hail_damage | marcel, marcel, kenji | buddys_house_party | sask | the garage | the garage door | SK | hail | crate |
   | frost_heave | rox, benny, moth | craigs_basement | sask | the basement | the basement stairs | SK | snow | bucket |
   | gravel_kings | chase, chase, tamara | mill_woods_basement_party (new, A2) | alberta (Q1a; code falls back to the home city's ring) | Unit 4B | the shop door | AB | neon | crate |
   | grid_road_ramblers | travis, earl, clementine | quonset_yard_party (new, A2) | sask | the Quonset | the Quonset door | SK | dust | haybale |

   Member fields:
   - `silent:true`: kenji only.
   - `cape:true`: marcel only.
   - `gear`: dana v, jaxon v, kenji bass, rox sg, benny sg, moth bass, lenny strat, tamara bass, travis acoustic, earl tele, clementine fiddle, duke bass. Marcel and Chase have none (mic only).
   - `look.top`: rox jacket, benny tee, moth hoodie, chase jacket, lenny tee, tamara tee, travis flannel, earl flannel, clementine jacket, duke flannel.
   - Idle: clementine `'fiddle'`.
   - Extras: moth `'hat'`→`'toque'`, duke `'hat'`→`'bighat'`.
   - `signature` (`{action, combo:40, crowd:8, flag?}`): marcel `capeSpin` (flag `cape`), rox `stageDive`, chase `kneeSlide`, duke `hatTip`.

4. **Tests.** In `tests/content.test.js` L124-125, all four bands are playable, and Hail Damage's space is `parents_garage`. In `tests/pw_flow.js` L95, the punk card is now playable.

5. **Baseline.** Run `node tools/balance.js 6 10` before any lane starts and save the output to `tests/.cache/balance_v081_hd.txt`. This is the Hail Damage no-regression reference.

6. **Worktrees.** Create them from this commit and copy `tests/.cache/three*` into each.

---

## 4. Shared contract (every lane codes against this)

### 4.1 Content keying (Lane A writes it, Lane B reads it)

- **Flat pools are neutral; band extras are added on top.**
  - `pool(state, obj, key)` returns `obj[key]` concatenated with `obj.byBand?.[bandId]?.[key]`. This is the same rule `reviews.js` already uses.
  - Lane A moves every Hail Damage-voiced line out of a flat pool into `byBand.hail_damage` in the same file, and rewrites the flat pool neutral and tokenised. Hail Damage keeps every line.
  - Pools covered: `lines.{activity[*], quietWeek, yearEnd, milestones, genreClash, venueUp, venueBanned, vanTired, breakdown, vanArrive, sameCrowd, openingSlot, guilt}`, `calendar.news` (keyed by week, so byBand news replaces the flat entry for that week), `calendar` holiday gig lines, `bandbook.{posts, viral}`, `world.lines.{depart, home, gong}`, `shop.lines`, `recap.{goodYear, headlines}`, `awards.{win, lose}`.
  - `lines.byBand[bandId]` adds: `countIn`, `empty {chat, catalog}`, `noSolo` (the sequencer gag), `exposure`.
- **Member-keyed pools** (ids are unique across bands, so these just need entries):
  - `lines.{chat, gigReactions, tap, writeTips, vanBanter, banter, live, labelReact, reviewReact}`
  - `lines.songReactions[memberId]`, with keys by role: `name`/`nameFr` (namer), `noSolo` (soloist), `fills` (filler), `great` (deadpan nod), plus `custom[] {when:'difficultyHigh'|'similarityHigh'|'any', text}`
  - `world.callHome[memberId]`, `logo.lines.{picked, rebrand}[memberId]`, `drama.members[memberId]`, `drivers[memberId]` (exists)
- **Per band, non-pool:**
  - `awards.{speech, speechWorstVan, carpet}[bandId]`
  - `world.gongCarpet[bandId]`
  - `bandbook.homeSuperfan[bandId] = {name, from, blurb, gigLines[], comments[], gift}` (fallback: `superfans.dale`)
  - `shop.merch.misprint.byBand[bandId] = {typo, find, replace, stash}`
  - `shop.spaces[tier].byCity[city] = {name, blurb}` (Q7)
  - `shop.upgrades[id].bySpace[spaceId] = {name, blurb}`
  - `labels[labelId].demandsByBand[bandId] = [demand]`
  - `licensing.brands[].band = [bandId]` (optional filter)
  - `recruits.hometownsByCity[city]`
  - `recruits.{traits, quirks}[].genres = [genre]`
  - `grooves.coach[genre][step]` (Lane D)
- **Card variants.** `career.variant(state, baseId)` tries `baseId + '_' + bandId`, then `baseId + '_' + rivalId` (for `rv_*`), then `baseId`, keeping the first whose gate passes and whose speaker is valid, else null. This applies to: `shop_space_1..3`, `shop_solo`, `shop_merch_start`, `shop_pawn_kit`, `shop_van_deal`, `money_merch_misprint`, `fans_dale_hello`, `fans_macaroni`, `fans_patreeon`, `fans_hater_page`, `fans_club_grumble`, `wt_homesick`, `rv_poach`, `rv_crack_<kind>`, `rv_opener`, `rv_final_eve`, `ult_recruit`. The base Hail Damage cards keep their `g()` gate, so a missing variant fails closed.
- **Rival cast extension.** `rivalry.cast[rid]` adds:
  - `news{key:[text]}`, `showdowns{kind:{…}}`, `banter{open, mid, final}`
  - `ui{heatLabels[], vehicleLine, emptyNews, pass, finalWin, finalLose, crack{breakup, rebrand, opener}}`
  - `carpet{intro, wave:'polite'|'sponsor'|'scarf'|'tailgate', count}`, `defector{line, look:'corpse'|'stylist'|'rhinestone'|'denim'}`
  - `comments[]`, `songs[]`, `albums[]`, `rebrands[]`, `label`, `vehicle`, `drummer?`, `furyBrand?` (Buckle & Boot: `'truck'`)
  - members with `corpsePaint:false` and a `stageShirt`
  - The flat `rivalry.news`/`showdowns` become the neutral `{rival}` fallback, and Tundra Wraith's lines move into `cast.tundra_wraith`.
  - `rivalry.scene[].rivalId` lets the sim skip a filler row that duplicates the current rival.
- **Per-band pack files.** New files `src/content/zz_band_frost_heave.js`, `zz_band_gravel_kings.js` and `zz_band_grid_road_ramblers.js`. The `zz_` prefix makes them load after every base file, so they may push into base arrays and objects (`K.cards.push`, `Object.assign(K.lines.chat, …)`, `K.lines.byBand[B] = …`). Each pack holds the band's voice and its rival's cast. Places (venues, map, npcs) stay in the base files.

### 4.2 `fillText` tokens (Lane B implements, everyone writes against them)

Existing tokens: `{player} {band} {city} {rival} {recruit} {name:id} {nick:id}`. `{rival}` now falls back to "the other band" and `{city}` to `state.city` (no more "Saskatoon").

| token | resolves to (fallback) |
|---|---|
| `{front}` | `gig.roles.front` name (the singer) |
| `{soloist}` | `roles.solo` (the guitarist) |
| `{filler}` | `roles.fill` |
| `{bassist}` | first active bass (the bassist) |
| `{namer}` | `band.roles.namer` if active, else `{front}` |
| `{grumbler}` | `band.roles.grumbler` if active, else `{front}` |
| `{deadpan}` | `band.roles.deadpan` if active, else a talker |
| `{driver}` | `world.driver` name, else "you" |
| `{van}` | `state.van.name` |
| `{space}` | `band.spaceShort` |
| `{spaceName}` | `band.spaceName` |
| `{door}` | `band.door` |
| `{province}` | `band.province` |
| `{homeVenue}` | most-played home-city venue, else the firstGig venue |
| `{superfan}` | home superfan name |
| `{rivalFront}` | rival frontman short name |

Role aliases (`C.ROLE_ALIASES`) are valid as `card.speaker`, `chat.who`, and as keys in `mood`/`skill`/`member` effects. They resolve at draw time into `state.card.who`/`state.card.roles`; `@any` means a random talker.

### 4.3 Guards and helpers (Lane B, in `20_sim_career.js`)

- `career.speakerOk(state, who)`: true for a member of this band, an npc, `'recruit'`, a role alias, or a cast id of the current rival. It is applied to Monday, forced, chain, studio, tour, fan, shop and calendar draws, and to `postChat`.
- `career.talkers(state)`: active members without `silent`. It replaces every hard-coded `'kenji'`.
- `career.pool`, `career.variant`, `career.roleOf(state, role)`.

### 4.4 Genre moments and band actions (B emits, C renders, D sounds, A writes lines)

| genre | combo moment (combo 30, crowd ≥ 60; replaces 'mosh') | chorus moment (1st chorus downbeat, crowd ≥ 70, once per song) | peak moment (crowd ≥ 85, exists) |
|---|---|---|---|
| metal | mosh | headbang | wallOfDeath |
| punk | pogo | gangShout | circlePit |
| rock | fistPump | singAlong | lighters |
| country | clapAlong | yeehaw | lineDance |

- Band signature: `member.signature` fires once per gig at combo ≥ 40 (and when its flag is set, if it has one). The sim does `crowd +8`, `moment(action)` and `band(memberId, action)`. *(Fixer, 2026-10-01: `perSong: true` makes it once per song instead; Marcel's cape spin has it, so Hail Damage keeps v0.8.3's spin in every song that reaches combo 40.)*
- Rival set: Mall Rats do a `kickflip` once per set.
- Events are unchanged: `crowd:moment {kind, t}` and `gig:band {id, action}`.
- Text lives in content: `lines.live[memberId].signature` for band actions, `lines.moments[kind]` for crowd moments.

---

## 5. Lanes

Four lanes run in parallel in separate worktrees with disjoint file ownership. If the agent budget allows, two lanes can split further: A becomes A1/A2 and B becomes B1/B2 (partitions below). **Lead-only files:** `src/02_contracts.js`, `src/10_save.js`, `src/01_ns.js`, `build.js`, `VERSION`, `tests/_load.js`, `tests/run.js`, `tests/_t.js`, `tests/_pw.js`, `plan/*`, `dist/*`, `index.html`.

A lane that needs a new state field chains a filler onto `GG.save.migrate` inside its own module (the v0.8.1 pattern), never sets `state.v`, and lists the field in its report.

### Lane A: Content

**Owns:**
- Existing content files: `src/content/{album_words, awards, bandbook, bands (after stage 0), calendar, cards, creator, drama, labels, licensing, lines, logo, map, npcs, recap, recruits, reviews, rivals, road_cards, shop, song_titles, venues, world}.js`
- New content files: `src/content/zz_band_{frost_heave, gravel_kings, grid_road_ramblers}.js`
- Tests: `tests/content.test.js` and a new `tests/content_bands.test.js`

**Does not own** `economy.js` or `activities.js` (Lane B), or `genres.js` and `grooves.js` (Lane D).

**Optional split:**
- A1 writes the three pack files (one sub-agent per band is possible).
- A2 owns every base file listed above plus both tests.

**A1, per pack** (minimum counts). The voice follows A3, the owner decisions and Q2-Q8.

1. **Monday deck, at least 70 cards**, gated `{band:[id], genre:[g]}` through the pack's own `g()`:
   - at least 8 early garage cards, 25 GLS evergreen, 12 L/LS, 12 S, and 12 repeatables (`once:false` plus a cooldown)
   - 1 `forceWeek:1` intro card: Rox and the council; Chase and "it's 1985"; Travis Lee and the truck he doesn't own
   - the Q2 storyline chain (5-8 steps with branches; flags feed signature/outfit/World)
   - label-flag cards for gopherwood, monolith and diy
   - at least 2 flavour guilt/repay cards
   - holiday variants for each `holiday_*` id, appended to `calendar.holidays[*].cards`
   - `signed_*` demand cards matching `labels[*].demandsByBand[id]`
   - shop variants (`shop_space_1..3_<id>`, `shop_solo_<id>`, `shop_merch_start_<id>`, `shop_pawn_kit_<id>`, `shop_van_deal_<id>`, `money_merch_misprint_<id>`)
   - fan variants (`fans_dale_hello_<id>`, `fans_macaroni_<id>`, `fans_patreeon_<id>`, `fans_hater_page_<id>`, `fans_club_grumble_<id>`)
   - at least 4 scandal cards (who = the new members)
   - 1 licensing sellout scandal and 1 "employer" brand gated to the band: Tamara's dental clinic, a Regina city-hall PSA, a seed or implement dealer
   - Magnitudes follow `MAG_BY_ERA`.
2. **Drama.** For every member, `drama.members[id]`: wants (rule ids from B3 below), grumble, passive, exit `{id, returnAfter, status, quitLine, beats, changed, backLine, away?, needBuzz?}` and an epilogue. Plus `ult_`/`ret_`/`ret_<id>_filled` cards; rival outcomes use `{rival}`.
3. **Lines per member:**
   - chat: 4 moods × 4
   - gigReactions: great/ok/bad × 3
   - tap: 6
   - songReactions by role, with at least 2 `custom` entries (for example Benny refusing a third chord on high difficulty, Lenny's "sounds like a famous riff" on high similarity, Earl "played on the original")
   - writeTips: 2 each, genre-correct (punk fast snare above 170 BPM, rock backbeat, country train beat)
   - vanBanter: 6
   - callHome: 3
   - live `{solo, fill, signature}`: 3 each
   - banter: 3, including Travis
   - labelReact and reviewReact: same keys as `59` REACT and `59c` BAND_REACT
   - logo picked and rebrand: 2 each
4. **Band-level lines** in `lines.byBand[id]`: activity (6 activities × 6), quietWeek (10), yearEnd (6), milestones, genreClash (4), countIn, empty states, exposure, noSolo. Also 8 `calendar` news weeks in `byBand`, `shop.lines` for the band, `recap.goodYear[id]`, `world.gongCarpet[id]`, `awards.speech`/`speechWorstVan`/`carpet[id]` (Worst Van is accepted by the band's driver), at least 2 outfitCards (flag-gated), awards win/lose, and `awards.nominees[genre]` with 8 parody names.
5. **Tour and world.** 1 region card per world region, the Q3 payoff (package `needs:{flag}` plus a 3-card chain), and `wt_homesick_<id>`.
6. **Road.** Per-driver pools of at least 8 cards (Moth: her apartment, her laundry, free fixes; T-Bone: safe and slow, Chase begging to drive, cassettes; Earl: 20 under the limit, historical markers, road stories), at least 4 you-drive cards, at least 6 band road cards (including the shotgun fight with Chase), and `drivers.you.takeOver` per band.
7. **Studio.** At least 6 band-gated studio events: Rox won't do take two, the engineer flags Lenny's riff, Earl's 1979 story, Duke's hat on the mic.
8. **Bandbook.** `homeSuperfan[id]` (Q5), 12 posts, viral good and cringe per member (2 each), 4 mail/gift items plus 1 scripted gift.
9. **Songs and reviews.** At least 40 song titles in the genre pool (fix the `Snow Route Parking Ban` duplicate at L60), at least 20 album words per slot, and `reviews.byBand[id]` with at least 2 per grade per outlet (gap #1).
10. **Rival cast** (§4.1), following the owner decisions:
    - Mall Rats: Blaze (Kevin from Oakville), the never-plugged-in bassist, the jawline drummer, Siobhan the real leader; sponsor-speak.
    - Chartbusters: Rex Glamour with the July scarf, Steve #5 and the others; PR copy; the same power ballad every single.
    - Buckle & Boot: Brayden and Colt (ex-junior hockey), the pickup-costume mascot, the session drummer; truck talk; `furyBrand:'truck'`.
    - Each cast needs: at least 12 songs, 10 albums, 4 rebrands, a label (rival-only label ids from A2), a vehicle, news for every key, showdowns for every `C.SHOWDOWNS` kind, cards (poach with sponsor cash / "a new Steve" / a truck deal, 3 crack kinds, opener, final_eve), banter, ui text, carpet, defector, and comments.
    - Frontman npcs go into `npcs`.
    - Rewrite `lic_fury` (cards L1730) with the cast names and the mascot.

**A2, base files:**
- **`lines.js`:**
  - Neutralise and tokenise activity (L20), guilt (L285, drop the cold-open truck), quietWeek (L375), yearEnd (L296), genreClash, venueUp, venueBanned, vanTired, breakdown, vanArrive (L419-456); move Hail Damage lines into `byBand.hail_damage`.
  - Mark `eraLocal`…`loonies` (L468) as Hail Damage-only (`byBand`) or neutralise them.
  - Port the UI-embedded Hail Damage pools into content: `55` BANTER (Hail Damage entries), `22` LIVE_LINES (L626), `59` REACT, `59c` BAND_REACT, and `5i` GONG_CARPET into `world.gongCarpet.hail_damage`.
  - Add `lines.moments[kind]` for all §4.4 kinds.
- **`cards.js`:** make guilt cards band-agnostic with tokens and role aliases (L783, at least 5 with repay). Keep the Hail Damage `g()` cards as they are. Handle holiday lists and the `lic_fury` rewrite.
- **`road_cards.js`:** band-gate the ungated Hail Damage-voiced cards (`road_cape_door`, `road_babas_lunch`, `road_mosquitoes`, `road_lead_foot`, `road_gas_argument`, `road_fowl_supper`, `road_banjo_hitchhiker`, `road_wrong_turn`; L12), rewrite the neutral ones with tokens, tokenise the abroad cards (L435), and take the cactus out of `drivers.you.takeOver` (L536).
- **`world.js`:** gate or rewrite `wt_uk_rain`, `wt_au_spider`, `wt_ru_minus40`, `wt_ru_banya`, `wt_invite` and `wt_homesick` (L331). Neutralise city, rental and package blurbs (L62). Make the generic callHome line neutral (L282). Move depart/home/rival/gong lines to neutral plus byBand.
- **`calendar.js`:** move news (L96) to byBand; tokenise holiday lines (L66: "six Marcels", French song, Jaxon); costumes use `{rival}`.
- **`bandbook.js`:**
  - posts and viral (L28) become neutral plus byBand; comments and handles per genre (L85; drop "306" for Edmonton)
  - the rival comment pool moves into `cast.tundra_wraith.comments`
  - mail and gifts get band gates (L192); the Full Kit perk becomes neutral (L216)
  - neutral superfan gigLines (L136)
  - the `homeSuperfan` structure; Dale becomes the Hail Damage home superfan
- **`awards.js`:** add a `carpet` key (the `59c` FB.carpet port), neutral fallbacks with `{rival}`, a `nominees` structure (the metal entry holds the current FALLBACK_OTHERS), a neutral presenter blurb (L26), and speech/outfit keyed per band (the Hail Damage ones stay gated).
- **`labels.js`:**
  - add the `demandsByBand` structure, with Hail Damage's english/radio/image demands moved into it
  - neutral perks
  - rename rep Brayden (L31), who clashes with Buckle & Boot's Brayden
  - neutral or tokenised studios and producers (L60: Pierre, Chad; Strip Mall Sound clashes with Unit 4B)
  - rival-only labels `{rivalOnly:true}` (gap #8)
- **`album_words.js`:** band-gate the 19 studio events that have Hail Damage speakers (L97).
- **`shop.js`:**
  - tier-0 upgrades `bySpace` for each start space (L45: beer fridge, curb couch, lights, PA, iso booth, "blue for Kenji")
  - `spaces.byCity` (Q7)
  - misprint `byBand` (Q6)
  - 1-2 more genre merch items per genre (L128)
  - neutral flavour text (L31, L43 solo blurb)
  - move `lines` to byBand (L162)
- **`licensing.js`:** band-gate the insurance brand (L69) and neutralise the brand texts (L36).
- **`recap.js`:** goodYear per band (L43; the Hail Damage set moves) and neutral headlines with `{space}` (L14).
- **`creator.js`:** neutral names and hints (L27, L41, L68, L87); add `'haybale'` and `'bucket'` to the throne list.
- **`drama.js`:** fill-ins for fiddle and acoustic plus role normalisation hints (L161); `{rival}` in the dramaCards rival outcomes (L247, L265, L283, L291); `{space}` in recruit text.
- **`recruits.js`:** `hometownsByCity` for Regina, Edmonton and Swift Current (L42); genre quirks (4 each for punk, rock, country) with a `genres` field; gate the Hail Damage-voiced quirk cards (L64); de-duplicate names (Colt, Tamara, Travis; L161); `{space}` in chat text.
- **`npcs.js`:** neutral mom and dad blurbs (L5); local casts of at least 5 each (Regina: the Suds-O-Rama owner, a councillor, the paper, a campus DJ; Edmonton: the Westgate landlord, nail-salon and vacuum-repair neighbours, the lawyers, local media; Swift Current: Duke's uncle, coffee row, the auction mart, local radio); rival npcs if not in the packs.
- **`rivals.js`:**
  - move Tundra Wraith's news, showdowns and cards text into the cast; neutral `{rival}` fallbacks (L73, L116, L151)
  - scene: `rivalId` on the three rival fillers, add `tundra_wraith_scene`, and Alberta and SW Saskatchewan fillers (L216)
  - festivals: per-genre fit, Sad Dome fit 1, `{rival}` catch text, plus an Edmonton rock fest, an all-ages punk fest and a rodeo or fair (L21)
  - with Q8a, add the other playable bands as filler rows flagged `bandId`
- **`venues.js`:**
  - Edmonton tier-1 and tier-2 venues (6-8, including St. Albert, Sherwood Park and Leduc) and `mill_woods_basement_party`
  - SW Saskatchewan (5 or more: halls, a rink, a rodeo or fair, a harvest-dance hall; Maple Creek, Gull Lake, Shaunavon) and `quonset_yard_party`
  - a Regina all-ages skate park (gap #3)
  - tokenise quirks and catches (L75: craigs_basement, rum_runners_tunnel, broadway_bijou, riverbend_auditorium, petit_salon_fransaskois, emptress_tea_room, club_poutine_sonore, screech_in_room, sourtoe_saloon, frostbite_lounge)
  - list any other bookable ids in the report
- **`map.js`:** the `alberta` ring (Q1a) and move its cities out of `west`; the new satellite cities plus roads; per-ring `home` labels keyed by home ring; lock texts without Kenji (L17); neutral city blurbs ("Home. Eight bridges, one garage.", "Marcel says bonjour").
- **`bands.js`:** rewrite the three rival blurbs (L198) to match the owner decisions.
- **`content.test.js`:** replace `HD_IDS` with "members of the gated band, or npc, recruit, role alias, or current rival cast id" (gap #9). New checks: pack pools, `demandsByBand` card ids exist, firstGig venues exist, `homeRing` exists.

**Acceptance (A):**
- `content.test.js` and the new `content_bands.test.js` pass. The completeness matrix asserts every minimum count above for all three bands, and all three rival casts are complete.
- Every card's gate passes `GATE_KEYS`. There are no duplicate ids and no US place names.
- A 240-week draw per band never runs dry (`content.test.js` L2).
- The Hail Damage line count per pool is unchanged or higher.
- Report: bookable ids for `C.CARD_BOOKABLE`, and new effect or gate keys if any.

**Risks (A):**
- Sheer volume (about 3 × 150 cards and lines).
- Speaker and gate mistakes cause leaks; B's speaker guard is the net.
- `MAG_BY_ERA` magnitude rules.
- Tone drift; the A3 bios are the source.
- Content size (about +0.5 MB).

### Lane B: Sims + UI + balance

**Owns:**
- Sims: `src/11_settings.js` and `src/20` through `2e_sim_*.js`
- Content owned by the sim: `src/content/economy.js`, `src/content/activities.js`
- UI: `src/50` through `5m_ui_*.js`, `src/60_main.js`, `src/00_shell.html`
- `tools/balance.js`
- Node tests: `tests/sim_{career, drama, rival, labels, tour, world, fans, shop, calendar, songs, gig, creator, logo, licensing, recap}.test.js`, `tests/save.test.js`
- Playwright tests: `tests/pw_{flow, world, gig, drama, fans, tour, rival, label, shop, recap, creator, logo, settings, title}.js`
- New tests: `tests/sim_bands.test.js`, `tests/pw_bands.js`

**Optional split:**
- B1 takes the sims, economy, activities, balance and sim tests. Its helpers commit (§4.2/4.3) lands first.
- B2 takes the UI, the shell and the pw tests, rebased on B1's helpers.

**B1: helpers** (`20_sim_career.js`)
- New tokens (L121-133); `pool`, `variant`, `speakerOk`, `talkers`, `roleOf`; role aliases in draw, `postChat` and APPLY.
- `newCareer` reads `band.firstGig`, falling back to the lowest-tier venue in the home city (L496). Defaults come from the band (L454-460).
- `activityLine` via `pool` (L91-102, L607-610). quietWeek (L538) and yearEnd (L811, L853) via `pool`. MILESTONES become `lines.milestones` (L64).
- The hustle grumbler comes from `band.roles.grumbler` (L668; `activities.js` L41, plus a neutral write blurb).

**B2: sims**
- **`21_sim_songs.js`:** `reactions` by role and the `songReactions[memberId]` shape, including `custom` triggers (L583-615). The Marcel-only French title quirk (L443-446) runs only when the namer has `fr` titles.
- **`22_sim_gig.js`:**
  - the §4.4 moment table (replaces `GENRE_MOMENT` L203 and mosh L492)
  - signature actions from `member.signature` (L196, L206, L493, L653)
  - LIVE_LINES come from `lines.live`/`lines.moments` (L626)
  - the "the Legion" fallback text
- **`23_sim_rival.js`:**
  - `corpsePaint` defaults to false and the defector look comes from the cast (L118-122, L178)
  - news (L105) and showdown texts (L493) from the cast, with fallback
  - card variants (L444, L631, `rv_final_eve`)
  - setlist, album and label from the cast; BPM from `genres[rival.genre].tempo` (L210, L225, L499-504)
  - skip scene rows with `rivalId` equal to the current rival (L715)
  - festival `{rival}` text and genre fit (L336)
  - per-rival overrides from `economy.rival.byRival[rid]` (curve, eras, buzz, award, `chartBias`, loonies bias; Q4)
  - Mall Rats' `kickflip` in the set
  - `wraithFeud` becomes `rivalFeud` (L733)
- **`24_sim_labels.js`:**
  - `speechCard`/`speechWorstVan`/`outfitCard` respect the gate and read per band; null-safe (L1263, L1281)
  - rivalThanks and nominee fallbacks with `{rival}` (L148-150, L1164-1169, L1238)
  - demands: `demandsByBand`; a carded demand whose card can never pass is settled `'half'` (L264, L283, L354-360, L1047-1055)
  - `studioEvent` uses `speakerOk`; studio city is `{city}` (L89-91, L553-575)
  - neutral fallbacks (L78-149)
  - filter rival-only labels out of offers
- **`25_sim_tour.js`:**
  - callHome excludes `silent` (L601-602)
  - lines via `pool` and tokens (L405, L467, L597, L681, L696, L737)
  - `wt_homesick` via `variant`, falling back to a talker plus the recruit speaker (L668)
  - generic payoff `package.needs:{flag}` plus the Gong payoff bonus for any band's payoff flag (L293, L303, L640-647, L710)
  - no `'kenji'` fallbacks (L428, L451)
- **`26_sim_world.js`:**
  - `homeRing` always open; ring order from home; "far" is relative to home (L122, L133-141, L248-252)
  - `world.scene` works with a non-Saskatchewan home
  - `syncDriver` posts as the returning driver (L501)
  - `defaultVan` uses `shop.vanName(bandId, 0)` and a neutral id (L453, L478)
  - banter uses `silent` and per-driver pools (L549-560)
  - highway per home (L577)
  - afterGig lines via `pool` and tokens (L336+)
  - the rival opening line moves to the cast (L363)
- **`27_sim_drama.js`:**
  - new RULES: council (Rox: promote blocks and city gigs), twoChords (Benny: song difficulty), van (Moth: van condition, no rentals, nobody else drives), eighties (Chase: rock rooms and buzz), lawsuit (Lenny: `songs.similarity` ≥ 0.8), adulting (Tamara: burnout, drive length, fund), truck (Travis: truck ad and rural rooms), stories (Earl: long drives), secretJoy (Clementine: crowd ≥ 80), hat (Duke: merch and buzz)
  - spotlight reads `signature`
  - `kenjiDrift` becomes `mysteryDrift` (L22, L131-158)
  - stagePool (L181)
  - an original with no exit still gets a generic return (L311)
  - fill-in role normalisation (L464)
  - candidates filtered by genre and hometown by city (L397-409)
- **`28_sim_calendar.js`:** news via byBand plus `speakerOk` (L263-268); weather affinity from `band.weather` (optional; L200, L219); holiday lines via `pool`.
- **`29_sim_fans.js`:**
  - rival comments from the cast (L94, L193)
  - `silent`/`talkers` (L116, L260-268, L297, L395)
  - home superfan resolution with the `'dale'` state slot kept (L136-178, L467-497, L534-547)
  - fill fallbacks (L99-104)
- **`2a_sim_shop.js`:**
  - `chat()` via band lines, skipping when the speaker is missing (L86-92)
  - forced cards via `variant` (L500-501, L675-694)
  - solo gate uses `roles.solo` (L688, L803)
  - `vanName` fallback (L319-322)
  - misprint by band (L497-515, L826-834)
  - the Dale line uses the superfan (L642)
- **`2b_sim_creator.js`:** `newKit` throne from `band.throne`.
- **`2c_sim_licensing.js`:** `talkers` (L59); brand band filter (L129-130); fury brand from `cast.furyBrand` (L200-204); text speakers (L310-314).
- **`2d_sim_recap.js`:** goodYear per band (L190-203); gig quote speaker (L63); headline tokens.
- **`economy.js`:** per-rival overrides; tunables for the moment table; neutral text (posters promo L192, soloCrowd, misprint note, `kenjiDrift`).

**B3: UI** (tokens and content reads; the Hail Damage strings live in content after A merges)
- **`51_ui_menu.js`:**
  - remove the "Coming in" branch and the metal default (L184-193)
  - fill in or drop GENRES (L16-21)
  - `coldOpenFx` class instead of `.hail` (L339)
  - "Into {space} →" (L343)
  - generic fallbacks (L189, L205-206, L229, L270, L297, L323-328)
  - optional peek still (gap #5)
- **`52_ui_week.js`:** driver-aware dock and results lines (L100, L388); neutral fund help and ACT_FALLBACK (L19, L37); `{space}` copy (L98, L490, L521, L620); per-space 2D fallback backdrop; delete dead fallbacks (L563, L568, L572); tap and yearEnd via content and pool (L435, L592).
- **`53_ui_laptop.js`:** empty states from `byBand.empty` (L22, L65).
- **`54_ui_sequencer.js`:**
  - soloist resolver copy (L53, L55, L94, L372-378)
  - namer copy and a per-genre placeholder (L206, L208, L461, L463)
  - count-in from content and a neutral no-audio toast (L255, L267)
  - `coachFor` reads `grooves.coach[genre]` (L386)
  - writeTips for every member (L547)
- **`55_ui_gig.js`:** BANTER from content (L49); text for new moments and actions, no raw ids (L47); N silhouettes (L712); neutral Expert blurb (L762).
- **`56_ui_board.js`:** exposure lines via `{front}` (L109, L287); driverLine from the driver def (L208); genre polaroid icon (L214); `{space}` (L265); ring tabs from the home ring and per-band home labels (L248).
- **`57_ui_van.js`:**
  - 2D windshield per driver: silhouettes plus laundry, cassettes and atlas (L104-110)
  - when you drive, keep the band's driver item (L244-251)
  - door name, vanName placeholder and driver copy (L311-330)
- **`58_ui_band.js`:** defector line from the cast (L119); hire toast and ad copy per band and space (L155, L167).
- **`59_ui_label.js`:** REACT from content, speakers by role (L101, L148, L221); tokens (L171-299); province from `band.province` (L213, L35).
- **`59b_ui_studio.js`:** title hints from the lineup (L620); tokens for `{front}`, `{city}` and `{space}` (L17, L438, L500, L550, L561-562, L666).
- **`59c_ui_awards.js`:**
  - carpet from `awards.carpet[bandId]` (L317)
  - outfit button from the card speaker, null-safe (L234-241, L329, L345)
  - speech per band (L242-246, L421)
  - rival by name and id instead of `/tundra wraith/` (L257, L322, L327, L402-414, L433)
  - review reactions from content and tokens (L46, L77, L154-186, L408-436)
- **`59d_ui_rival.js`:**
  - `ui.who` resolves any cast id and a `rival_frontman` alias (L61)
  - set audio and generation use `rv.genre`, plus `style:'ballad'` for Chartbusters (L238, L283)
  - face style per rival and N silhouettes (L54, L230, L353)
  - banter and soloist from the cast (L218, L306, L338)
  - the ui block from the cast (L45, L100-188, L422, L431)
  - Sad Dome km via `W().km(home,'calgary')` (L178-188)
- **`5g`:** genre icon (L69), `{space}` (L118), `{deadpan}` (L164), superfan (L138).
- **`5h`:** neutral calibration and practice text (L261, L289, L302).
- **`5i`:** gongCarpet from content (L474-557); lineup count (L379); `{van}`, `{space}`, `{front}` (L151, L285, L395-405); the Moose Opera line per Q3 (L410-422).
- **`5j`:** kick-head placeholder is the band city (L280); fallbacks (L40, L70).
- **`5k`:**
  - misprint moment from `shop.merch.misprint.byBand` (L134-182, L435, L463-465)
  - soloist speaker (L64, L92)
  - shop street, `{driver}`, tier-0 benefactor and `{space}` (L74, L313, L321, L371, L430)
- **`5l`:** POSE_OF for the 10 new members and cape owner from `member.cape` (L38, L71); photo camera from C's hook (L60, L84-85); `{space}` (L141).
- **`5m`:** `{driver}`, `{door}`, generic fallback (L52, L73-74, L134).
- **`60_main.js`:** quietWeek via `pool` (L182); `?quick=1&band=` passthrough (L102, L114, L261).
- **`00_shell.html`:** cold-open fx CSS (snow, neon, dust), 2D fallback backdrops per space kind, gig-back silhouettes for N members, and rival face styles, in a marked `/* v0.9 GENRES */` block.

**B4: balance**
- **`tools/balance.js`** (L34-50, L83): `BAND=<id>|all`, per-band tables plus a cross-band comparison: fans, fund, loans, quits, returns, cards drawn, weeks with no card, board size, average km, genre-moment rate, rival lineup, payoff flag. Take the Hail Damage ids out of the synthetic deck.

**Acceptance (B):**
- Existing node and pw suites stay green.
- **`tests/sim_bands.test.js`**, for each band, 3 seeds × 3 years, good and avg bots:
  - no exceptions; invariants hold
  - driver, van name, space, city and firstGig are correct; week-1 km ≤ 60
  - the forced week-1 card is band-gated
  - `rival.members` is non-empty after A merges
  - loans can be repaid; an original can return
  - a save round-trips
  - **leak scan** over every piece of player-visible text the sims produce (chat, card title/text/outcome, wrap, news, comments, recap, reviews, awards lines, licensing): `/Marcel|Dana|Jaxon|Kenji|Baba|Lord Abyssus|Moose Hearse|Tundra Wraith|Gord|Grimnir|HALE DAMAGE/`. Warn only (strict after A merges, flag `LEAK_STRICT`); Q8 cameo sources are allow-listed. The inverse check (other bands' names in a Hail Damage career) is strict immediately.
- **`tests/pw_bands.js`** (`META_ONLY=bands`), per band at 390×844:
  - genre card through intro, logo, creator, cold open (fx class), garage, week 1, first gig, van header and dashboard, wrap
  - laptop tabs, Scene tab lineup, BOTB spectator (lineup plus genre audio), awards carpet, recap
  - a DOM text leak scan on every screen
  - no console errors
- **Balance targets** (`BAND=all node tools/balance.js 6 10`, avg bot, measured against the stage-0 Hail Damage baseline):
  - Local Heroes by week 24 ± 4
  - first label offer in year 2; share signed by the end of year 3 at least HD − 15 points
  - World era within ±1 year of Hail Damage (about year 5-6)
  - fans at year 3 within ±20% of Hail Damage; fund by year within ±25%
  - loans in years 1-3 at most HD + 1
  - quits about 1 per 1-2 years, with at least 40% returning
  - cards drawn at least 85% of Hail Damage; no-card weeks at most HD + 10 points
  - garage-era board: at least 3 listings a week at an average of 300 km or less; average km per gig at most 1.25 × Hail Damage
  - Hail Damage itself within noise of the baseline (±5% fans, same era weeks)
  - The good bot stays Hail Damage-like.
  - Knobs: `economy.js`. Member skill and mood numbers in `bands.js` (Frost Heave averages 41.7 against 51.5) are proposed in the report, and the lead applies them.

**Risks (B):**
- Hail Damage regressions and seeded-test churn from RNG shifts (gap #13).
- UI code lands before the content, so between the B and A merges Hail Damage flavour falls back to neutral text on the branch.
- B is the widest lane; the B1/B2 split is the escape hatch.

### Lane C: Render

**Owns:**
- `src/40_render_core.js`, `41_render_garage.js`, `42_render_stage.js`, `43_render_van.js`, `44_render_carpet.js`, `45_render_creator.js`, `46_render_logo.js`
- `45_render_title.js` (untouched unless Q-default changes)
- Tests: `tests/pw_garage.js`, `tests/pw_stage.js`, new `tests/pw_bands_render.js`

**Tasks:**
- **`41_render_garage.js`**, three tier-0 rooms keyed on `C.SPACE_KINDS[band.space]`, built like jamRoom/studioRoom (L1384-1401, L2154, L2354-2389; L64). Each room needs a MOODS entry, a door label, the banner, an exterior (yard only for the garage and the Quonset), 7 hotspot positions (gap #4), `debug space.kind`, and the same ROOM footprint so the spots, box pile, trophies and upgrades still fit.
  - Laundromat basement: pipes, block walls, window well, stairs, dryer vents, coin-op signs, detergent, laundry cart.
  - Strip-mall unit 4B: drop ceiling with a fluorescent tube, the till counter where the kit sits, a shop window onto the lot, 1985 posters.
  - Quonset: corrugated arch, hay bales, farm tools, a tractor tire, a sliding door, farmyard, grid road, canola or snow by season.
- **Other garage work:**
  - Seasonal decor keyed on room kind, not `tier === 0` (L1105, L1217).
  - Seat props and spots per room (L73-81, L966, L1048, L1084).
  - Instrument from `member.gear`; new `'fiddle'` bowing idle; unique idles; per-member held props (L490-500).
  - Default idle by role for recruits and fill-ins; `top` from content (L86-98).
  - Mirror poses per genre, with an '80s rock set for Chase (L190).
  - Cape owner from `member.cape` in the garage, stage, van and carpet (L481; `42` L859-861; `43` L907; `44` L266-268).
  - Jam-room neighbour stickers exclude your own band and include Hail Damage (L1804, L1814, L1850).
  - Tier 2-3 painted names from `shop.spaces.byCity` (Q7; L1896-2143).
  - Fan-mail portrait keyed on the gift id and the member's look (L1297).
  - Optional LED palette per genre (L2264).
  - Expose `GG.render.garage.photoRig(spaceKind)` for `5l`, plus an optional still for the genre peek (gap #5).
- **`40_render_core.js`:**
  - gear variants: acoustic, fiddle plus bow, 4-string bass, plus optional sg/strat/tele (L799)
  - `toque`/`bighat` extras (L788)
  - `bandInitials`/`drawHead` take the band name and city from options (L938, L1668)
  - thrones `'haybale'` and `'bucket'` (L1561)
- **`42_render_stage.js`:**
  - instruments per member; a mic stand for every vocalist, including singing guitarists; fiddle and acoustic poses in `updateBand` (L847-896, L1336-1349)
  - 3- and 4-player layouts (L837)
  - actions `stageDive`, `kneeSlide`, `hatTip` and the rival `kickflip` with a skateboard prop; frontman gestures per genre (L1214)
  - crowd animations for pogo, fistPump, clapAlong, headbang, gangShout, singAlong and yeehaw
  - rival banner via `logo.forRival` (L947)
  - rival styling from the cast; corpse paint only when the cast sets it; the no-drummer path never seats the player (L924-966)
- **`43_render_van.js`:**
  - resolve the driver and dashboard from `GG.world.driver` (L119-127)
  - shades only when the driver def says so (L901)
  - mirror face matches the driver (L650)
  - talking-driver pose, so only Kenji is silent (L1109-1140)
  - tier-0 ornaments and paint per band (L585-673: The Pothole's curtains and laundry line, The Mullet Wagon's tape deck and fuzzy dice, Grandpa's Suburban's bench seat, CB radio and dash hat)
  - held props from content (L906)
  - optional liveries for tiers 1-3 (gap #12)
- **`44_render_carpet.js`:** rival cast from content with its count and wave style, including the Buckle & Boot mascot costume (L206-378).
- **`46_render_logo.js`:** misprint typo from `shop.merch.misprint.byBand` (L493).

**Acceptance (C):**
- `pw_garage.js` and `pw_stage.js` stay green for Hail Damage.
- **`tests/pw_bands_render.js`**, per band:
  - `space.kind`, door label, and all 7 hotspots visible and labelled
  - members on distinct spots with the right `gear`; no V on a fiddle or acoustic player
  - draw calls at most HD × 1.15
  - 4 seasons of decor
  - stage lineup strings (`travis:vocals:acoustic` with a mic stand, clementine fiddle, rox guitar with a mic stand, a symmetric 3-player layout)
  - van: driver id and dashboard item; Earl keeps his glasses; the mirror matches; a talking driver animates
  - carpet count comes from the cast, with corpse paint only for Tundra Wraith
  - rival stage for each rival (logo banner, the Buckle & Boot drummer path)
  - recap photo is not blank
- Contact sheet at `tests/.cache/v09_render_sheet.png`.

**Risks (C):** phone draw-call and battery cost of three new rooms; hotspot and upgrade placement in the new geometry; seasonal decor anchors.

### Lane D: Audio

**Owns:** `src/30_audio.js`, `src/content/genres.js`, `src/content/grooves.js`, `tests/sim_audio.test.js`, `tests/pw_seq.js`.

**Tasks:**
- **Genre amp voicing and stereo double-tracking** (B4 "genre audio styles"; status says punk, rock and country have been identical except for reverb since v0.7.2; `30_audio.js` L409-417, L786-805):
  - punk: crunchy L/R downstrokes, mid-forward
  - rock: crunch with ringing open chords
  - country: clean Tele twang with slapback, a bowed fiddle with body formants and bow noise, a fuller acoustic strum
  - amp presets go in `genres.js` backing; metal stays untouched
- **Tempo styles per genre** (L823): punk skate or hardcore at high BPM; rock power ballad under about 90 BPM (also the Chartbusters rival `style:'ballad'`); country two-step vs train beat.
- **Solos:**
  - punk: Benny's two-chord break when `roles.solo` exists (L974, L1044)
  - country: Earl's twang solo; the fiddle takes fills and the outro (L1008)
  - this matches `gig.roles` and the stage
- **Crowd one-shots per §4.4 kind** (L1331, L1754): gang HEY/OI, a clap-along on 2 and 4 plus yeehaws, the "whoa-oh" sing-along, the metal roar.
- **Garage beds per tier-0 space** (L1232): laundromat dryers thumping in 4/4 plus the end-of-cycle buzzer; strip-mall fluorescent buzz plus the vacuum repair next door; Quonset wind on steel plus crickets or a meadowlark by season.
- **Noodler per band** (L1570, L1646-1649): chosen by `member.gear` (Benny's two chords, Lenny's "legally distinct" riff, Earl's twang, Clementine's Bach scales, Travis's strum) and matching whoever the garage shows noodling.
- **`grooves.js`:** `coach[genre][step]` (L116; metal keeps the current lines) and any groove presets.

**Acceptance (D):**
- `sim_audio.test.js`: metal depth tests unchanged; per-genre amp numbers (stereo width, slapback present for country); no metal rig nodes in a non-metal career; a punk solo exists when `roles.solo` is benny; the country solo instrument is twang; the bed node set per space kind; one one-shot per new kind.
- `pw_seq.js`: each genre rendered offline with rms and peak in range, no clipping, render time within budget; one in-career song per genre.

**Risks (D):** phone CPU (voice cap); metal regression; ear-tuned by numbers only (back-burner note).

### Cross-lane hand-over requests (files stay single-owner)

| from → to | request |
|---|---|
| C → B | `5l_ui_recap.js` calls `GG.render.garage.photoRig(kind)` if present (C exposes it). `57_ui_van.js` handles the 2D windshield per driver. `55`/`59d` silhouettes and CSS live in `00_shell.html`. |
| B → C | New moment kinds and actions exactly as in §4.4; `gig:band`/`crowd:moment` payloads are unchanged. |
| B → lead | Member skill and mood rebalance numbers for `bands.js`, plus any new state fields for `10_save.js`. |
| A → lead | Extra `C.CARD_BOOKABLE` ids and any new gate or effect keys. |
| A ↔ B | The key shapes in §4.1 are fixed; any change goes through the lead. Lane B ports no content, and Lane A edits no code. |
| D → B | `59d` passes `{genre: rv.genre, style}` to `GG.audio.play` (B implements). |

---

## 6. Merge order and lead integration checklist

**Merge order** (each lane rebases on the integrated branch before it merges):
1. **D** (isolated).
2. **B** (helpers and resolvers that read old and new content shapes).
3. **A** (fills the shapes, and Hail Damage flavour returns via `byBand`).
4. **C** (reads the casts and fields from A and the actions from B).

**Checklist:**
1. After each merge, run the full node suite and fix conflicts in place. The only expected overlaps are in lead-only files.
2. `02_contracts.js`: fold in the reported constants, `CARD_BOOKABLE` ids and gate/effect keys.
3. `10_save.js`: `migrate` derives genre, city and space from `career.band(s.bandId)` (L141). Add `tests/save.test.js` coverage per band (B's test file; the lead adds it if B hasn't). No `SAVE_SCHEMA` bump unless a lane reported a field.
4. Apply B's `bands.js` number requests. Set `LEAK_STRICT` on in `sim_bands.test.js`.
5. `BAND=all node tools/balance.js 6 10`: check every §5 B target. Tune `economy.js` inline (small patches) until they hold. Confirm Hail Damage matches the baseline.
6. Playwright at 390×844:
   - `pw_flow` (all 4 bands), `pw_bands`, `pw_bands_render`, `pw_garage`, `pw_stage`, `pw_gig`, `pw_rival` (all 4 rivals)
   - `pw_label` (awards), `pw_tour`, `pw_shop`, `pw_recap`, `pw_world`, `pw_drama`, `pw_fans`, `pw_seq`
   - `pw_logo`, `pw_creator`, `pw_settings`, `pw_title`
   - the pw_bands sections again at 440×956
   Look at every screenshot once.
7. Leak sweep. Grep `dist/game.html` output strings and run a 240-week bot career per band with the leak scan strict; also the inverse check in a Hail Damage career. The only allowed exceptions are Q8 cameos.
8. Budgets: dist at most 3.8 MB; garage draw calls per room at most HD × 1.15; the gig audio voice cap holds.
9. `plan/status.md`:
   - "What's in v0.9"
   - API entries: pool, variant, speakerOk, talkers, roleOf, tokens, moments, casts, homeRing, photoRig, audio styles
   - owner answers under decisions
   - tick the Addendum 1 v0.9 line
   - back-burner: remove "other rivals have no cast"; add anything left over
   - Version, Current and Next
10. `node build.js`, then commit, PR, merge into `main`, and delete the lane branches and worktrees. Point `v1.0` at the forward-compat notes (gap #11).