# Garage to Glory — Design Doc + Claude Code Build Handoff

A game by Prairie Blue Studio. Drop this file into the Claude Code session and say "read the handoff and start v0.1".
Written Monday, September 28, 2026. Two parts: Part A is the design (source of truth), Part B is the build handoff.

---

# PART A — DESIGN DOC

## A1. One-line pitch
You're the drummer who started the band. Steer it through a ten-year career — from your parents' garage in Saskatoon to arenas around the world, or to a breakup in a parking lot. Comedic, Spinal Tap energy. Real Canadian cities, parody names for everything else.

## A2. Locked foundations
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

## A3. The bands (you are the drummer in every one)

### Metal — Hail Damage (five-piece), starts in your parents' garage, Saskatoon
- **Marcel "Lord Abyssus" Fontaine, vocals** — Francophone insurance adjuster from Gravelbourg who screams every lyric in French. Nobody knows what the songs are about; when a fan translates them, they're all about his lawn. Quits to join a Quebec band; returns when nobody there finds him mysterious. Names every song in French ("Ma Pelouse, Mon Tombeau"). Wants: the spotlight and theatrics. Cape budget is a recurring issue.
- **Dana "Sweep" Okafor, lead guitar** — Practises ten hours a day, talks only in gear specs. Solos run longer than the songs. Quits when poached by prog bands; returns once she learns prog shows have no mosh pit. Wants: solos and new gear.
- **Jaxon "Rip" Kowalchuk, rhythm guitar** — 19-year-old prodigy who lives with his baba (she packs his tour lunches). Running gag: sneaks shred fills into simple parts. Quits whenever his baba says so; returns when she hears the band on the radio. Wants: freedom, and baba's approval.
- **Kenji Blackbird, bass** — Sunglasses indoors, never speaks on stage or off. Rumoured to be a legend under another name. Disappears without a word, reappears months later. Wants: nobody knows (that's the joke). Highest praise possible: a silent nod.
- **Rival: Tundra Wraith (Winnipeg)** — Corpse paint on stage; off stage they're all accountants and unbearably polite. Frontman calls you "buddy", sends a fruit basket when your van burns, wins every award you're up for. They kill you with kindness.

### Punk — Frost Heave (four-piece), starts in a laundromat basement
- **Rox Delorme, vocals/guitar** — Screams exclusively about city council. Banned from every Costco in the province.
- **Benny "Two Chords" Mahon, guitar** — Knows two chords, refuses to learn a third on principle.
- **Moth, bass** — Lives in the van full-time; you need permission to go in.
- **Rival: Mall Rats (Toronto)** — Manufactured punk band from a TV talent show, skateboard sponsor, stylist. They throw sponsor money at everything.

### Rock — Gravel Kings (four-piece), starts in an empty strip-mall unit
- **Chase Vanderhoek, vocals** — Believes it's still 1985. Leather pants at minus 40.
- **Lenny Szabo, guitar** — Every riff sounds a little too much like a famous one; the lawyers keep calling.
- **Tamara "T-Bone" Ruiz, bass** — The only functioning adult; a dental hygienist who flosses backstage.
- **Rival: Chartbusters (Vancouver)** — The stadium band every radio station plays and everyone claims to hate. They own the radio.

### Country — The Grid Road Ramblers (five-piece), starts in a Quonset on a farm
- **Travis Lee Beauchamp, vocals/acoustic** — Heartbreaking songs about trucks and farms; grew up in a Regina condo.
- **Earl Nakamura-Pike, lead guitar** — 70-year-old session legend who has played with everyone and tells you about it.
- **Clementine Beaudry, fiddle** — Classically trained violinist "slumming it", secretly loves every second.
- **Duke Harlan, bass** — Huge hat, modest bass skills. The hat is the character.
- **Rival: Buckle & Boot (Alberta)** — Bro-country duo sponsored by a truck brand; every song is about tailgates. They're in every truck commercial.

Member names and details are placeholders the owner may rename later. Rival band members are not designed yet (open decision).

## A4. The weekly loop (one turn = one week)
1. **Monday event card** — most Mondays, some quiet weeks. A short scene, 2–3 choices, **hints shown** for what each choice does. Outcomes move fund, fans, buzz, chemistry, member mood/skill. Types: band drama (signature cards per hand-made member), money, road, scene & rivals, fame, weird. **Storyline chains** play out over weeks (Marcel pitches the moose concept album → cape arrives → the album flops or goes platinum in Finland). Cards are gated by era, genre and region.
2. **Plan the week** — in the 3D garage, on the whiteboard. **Three action blocks** (two weeknights + the weekend). Activities: Rehearse (skill, chemistry ↑), Write (build a drum pattern → new song), Promote (buzz ↑), Book (gig board), Hustle (weddings, busking, bingo halls → cash), Rest (burnout ↓). Studio weeks and tour weeks replace blocks.
3. **Weekend gig** — if booked. Van scene → setlist → rhythm game → results.
4. **Week wrap** — fund, fans, buzz, chemistry, each member's mood/skill update. Unhappy members complain in the group chat before they quit (warning). Autosave.

**Stats:** band fund ($), fans (one global count, permanent), buzz (hype, decays), band chemistry, per-member skill and mood, your **drum skill** (widens the rhythm timing window as it levels), song catalog (songs go stale when overplayed; biggest hits become "classics" the crowd demands), van stats, rivalry heat.

## A5. Songwriting — the step sequencer
- Grid: **lanes run top-to-bottom** (same orientation as the gig note highway) × 16 steps per bar. Starts with **4 lanes**: kick, snare, hi-hat, cymbal.
- A song = **three sections** (verse, chorus, bridge/breakdown), each a one-bar pattern, arranged into a structure (e.g. intro–verse–chorus–verse–chorus–breakdown–chorus). Unlockable extra sections: **Outro** (early), **Solo** (later).
- Tempo slider with a genre range (country slow, punk fast, metal doom-to-blast).
- Tap Play to hear it: drums from your pattern, guitars/bass generated to match the genre. Marcel names songs in French.
- Rating: **Groove** (genre fit — metal wants double kick, punk wants fast snare, country wants the train beat), **Hook** (chorus contrasts with verse but is catchy/repeatable), **Difficulty** (more notes = flashier crowd bonus but harder live; band skill caps what they can pull off).
- Writing takes one block. New songs start rough and tighten with rehearsal.
- Band reactions on save: Dana complains there's no room for a solo, Jaxon sneaks in fills you didn't write, Kenji nods.
- **Gear unlocks expand the kit to a max of 6 lanes:** lane 5 = toms (fills), lane 6 = ride/china (accents). A **double kick pedal** doesn't add a lane; it lets the kick lane hit on every step. Six lanes is the two-thumb limit.

## A6. Gigs — the rhythm game
- **Before:** pick a setlist from the catalog. Setlist length grows with venue size (about 3 songs at a Legion hall → ~8 at an arena). Order matters a little: strong opener bonus, closing on your biggest hit bonus.
- **Screen (portrait):** top two-thirds is the 3D stage from behind your kit looking past the band at the crowd; bottom third is the note highway (4–6 lanes) with tap zones at the bottom. 48 px+ touch targets.
- **Charts are your songs:** exactly the patterns you wrote, section by section.
- **Judgement:** Perfect / Good / Miss, combos, a crowd meter that rises and falls with play. Drum skill stat widens the timing window.
- **Crowd reacts in 3D:** mosh pit on a streak, lighters on a big chorus, boos and flying drinks on a bad run.
- **Band effects:** Marcel's cape spin (crowd bonus on a streak), Dana's solo section (eases your lanes), Jaxon's sneaky fills (occasional surprise notes), unhappy members miss cues and drag the crowd meter.
- **Genre moments** at high crowd meter: wall of death (metal), circle pit (punk), lighters (rock), line dance (country).
- **Freestyle fills:** short windows where any taps score a show-off bonus.
- **No mid-gig chaos events** (no snapped sticks, power cuts, etc.).
- **Results:** grade, pay, fans, buzz, merch, venue reputation, a reaction from each bandmate. A gig runs 5–8 minutes. **Saves between songs.**
- **Sound:** everything generated with the Web Audio API — no audio files.

## A7. Gig board, venues, travel
- Open the board with a Book block; once you have fans, offers arrive on their own. Listing shows: venue, city, capacity, pay deal, fans needed, genre fit, distance (gas + van wear), and a "catch".
- **Pay deals (three):** flat guarantee, door split, "exposure" (free; Marcel always wants to say yes). No pay-to-play.
- **Venue tiers:** DIY (house parties, Legion halls, bingo halls, open mics) → bars & clubs (100–400) → theatres (500–2,000) → arenas & festivals.
- **Parody venues:** The Gopher Hole (Saskatoon), Pile o' Bones Tavern (Regina), Frostbite Lounge (Winnipeg), The Hoofprint (Toronto), Commandant Ballroom (Vancouver), the Sad Dome (Calgary).
- **Quirks:** every venue has one (sound guy who hates drummers, a ceiling so low Marcel's cape catches fire, chicken wire in front of the stage, a crowd that only wants covers).
- **Genre fit:** metal at a country bar is a comedy disaster — it pays, expect flying boots.
- **Venue reputation:** crush it → rebooked at better pay; bomb → banned, photo on the wall of banned bands.
- **Opening slots:** bad pay, steals fans from the headliner's crowd. Sometimes you open for your rival.
- **One gig per weekend.** A tour = back-to-back weekends; weekdays are driving.
- **Maps:** stylized regional maps with city pins (Canada; UK & Europe; Japan; Australia; Russia). Tap a pin to see its gigs.

## A8. The 3D garage (home base) and the van
- The garage is the main menu. **Tap the floor to walk there**, third-person low-poly. Hotspots: whiteboard (plan week), your drum kit (sequencer), corkboard of flyers (gig board), laptop (group chat, fund, socials, rival leaderboard), merch boxes (merch), trophy wall (awards, gold records, banned-venue photos), garage door (van / travel).
- Bandmates hang out and show mood through body language (Marcel poses in a mirror, Dana noodles, Jaxon eats baba's lunch, Kenji sits in the corner in sunglasses; unhappy = sulking on the couch with headphones).
- **Spaces by era:** parents' garage → rented jam room → pro rehearsal studio → arena backstage. Each band has its own starting space (garage / laundromat basement / strip-mall unit / Quonset). Buyable upgrades: couch, egg-crate foam, beer fridge, lights.
- **Van:** travel scene you watch (skip button): 3D view out the windshield, prairie rolling by, grain elevators, seasonal weather; road cards and band banter pop up. Stats: condition (breakdown risk), space (gear + merch capacity), comfort (burnout on long drives). Upgrade path: rusted minivan ("the Moose Hearse") → 15-passenger van + trailer → sprinter → tour bus; every vehicle gets a name. Overseas you fly and rent something local (tiny European van, band packed like sardines).

## A9. Members — moods, quitting, returning, recruits
- Each member has a mood shaped by money (pay-the-band setting), burnout, band success, and personal wants.
- Escalation: grumbling → passive-aggressive group-chat messages → an ultimatum card → quits.
- **Garage era is protected:** nobody quits and nothing breaks down until the first milestone.
- When someone quits: play with a hole (worse gigs), hire a fill-in (costs per gig), or recruit permanently.
- **Recruit generator:** post an ad (Kijiji + music-store corkboard) → **three candidate cards**: name/nickname (genre-flavoured pools), hometown (real, from wherever you are — a German guitarist on a Europe tour), skill 1–5 stars, one trait, one quirk, asking cut, and **chemistry with the current band shown on the card**. **Pay to re-post** for three new cards. Recruit quality scales with era.
  - Traits: Reliable, Road Warrior, Showboat, Studio Rat, Hype Machine, Fast Learner, Party Animal, Frugal, Local Legend.
  - Quirks: only plays barefoot (even in January); tours with a pet ferret; speaks only in hockey metaphors; brings a slow cooker to every gig; former Tundra Wraith roadie who won't say why he left; "basically played on" a famous album; won't drive after dark because of Sasquatch.
  - Recruits are lighter characters: a few quirk cards; if they quit, no storyline.
- **Returning:** each hand-made member's exit runs a storyline (Marcel's solo album, Dana's prog band, Jaxon grounded); a Monday card later offers them back, changed (skill boost or new quirk). You may keep a great recruit and turn the original down — **a turned-down original can join your rival**.
- **No firing.** You're the constant; worst case it's you and three strangers from Kijiji.

## A10. Career eras, labels, albums, reviews
- **Eras (milestone-based, not calendar):** Garage → Local heroes → Signed → World stage. Reaching the world stage fast earns **2–3 bonus years**.
- **Labels:** Gopherwood Records (indie: small advance, bigger cut, creative freedom), Monolith Records (major: huge advance, tiny cut, opinions — radio singles, image changes, "Marcel should sing in English"), DIY (no label, keep everything, you pay for recording/promo). No 360 deals. Advances are recoupable; deals set album counts and deadlines; miss them or flop and you're dropped.
- **Recording:** EP in Local heroes (4–5 songs), albums when signed/DIY (8–10). Studios: Mom's Basement (free, lo-fi, dryer running), Strip Mall Sound (cheap; engineer is the landlord), Grain Silo Studios (converted grain elevator, great natural reverb), Abbot Lane Studios (London, world era). **Producers are hireable characters** with styles (everything loud; cabin in the woods; quietly fixes Marcel's pitch). Sessions take 2–4 weeks of blocks with studio events. **Drum takes run off your drum skill, with the option to play them yourself** (best take counts). Tracklist order matters (opener, lead single, closer); pick a lead single. **Titles/covers from generated options, with the option to type your own title.** Pick a release week; promo blocks before launch.
- **Reviews:** Rolling Scone, Proclaim!, Pitchspork (one-decimal scores), Deci-Hell (metal zine), Tailgate Weekly (country). Judged on song quality, production, rehearsal, and whether you recycle drum patterns. Each review has a comedic pull quote.
- **Results:** first-week sales, Maple 100 chart position, streams trickling for months, fans, recoup progress, Loonie nominations, gold/platinum records on the wall.
- **Genre-region fit:** metal huge in Japan & Europe, strong in Russia; punk loves the UK, Australia solid; rock big in UK, Europe, Australia; country huge in Australia, decent in the UK, cult in Japan.

## A11. Rivals
- Your rival runs a parallel career (fans, albums, era) shown on a **visible scene leaderboard**.
- **Rivalry heat** climbs with every clash; higher heat = more showdowns and more buzz for both.
- Showdowns: **Battle of the Bands** (you **watch the rival play their set first**, then play yours; crowd decides; prize money, stolen fans), same-night gigs (crowd splits on buzz), stolen slots on the gig board, Loonie categories, poaching your unhappy members, festival clashes (outplay them from a lower slot).
- Beat them enough and they crack comedically (breakup, awkward rebrand, or they ask to open for you).
- **Final showdown** near the end of the career; the result feeds the ending (you headlined and they opened, or the reverse).

## A12. International touring
- A region unlocks at a fan threshold **or** an invite (festival slot / showcase), whichever comes first. Genre fit shifts the thresholds.
- **Preset tour packages with a few choices** per region (not free routing). Flights, rental van, hotels come out of the fund; on tour, weekday blocks shrink to rest / promote locally / hotel-room rehearsal. Homesickness and burnout build; members call home in the group chat.
- Parody festivals: Mudstonbury (UK), Wackelstein Open Air (Germany), Budokhan Hall (Tokyo), Big Day Inn (Australia), Siberian Frostfest (Russia, January).
- Region card flavour: UK (rain, pub gigs, promoter pays in drink tickets); Europe (tiny van, festival mud, Dana lost in gear shops); Japan (polite silent crowds until the song ends, fan gifts); Australia (vast drives, spider in the kick drum); Russia (festival at minus 40 the band is unimpressed by, bus breakdown in the taiga); France loves Marcel.
- "Big in one place": a song can blow up in a single region → storyline. Your rival may break a region first.
- One international award: the **Global Gong** (world stage only).

## A13. Money and merch
- **In:** gigs (three deals), merch, album sales and streams (real money after recoup), hustle blocks, label advances, prizes (BOTB, Loonies), licensing (your song in a truck commercial — Buckle & Boot are furious).
- **Out:** van (gas, repairs, upgrades), rent after the free garage, gear (incl. drum unlocks), studio time, merch stock (paid up front), promotion, fill-ins, touring (flights/hotels; or sleep in the van and burn out).
- **Pay the band** setting: members' cut vs fund, directly affects mood.
- **Merch:** pick item + price (no custom designs). Sales = crowd size × gig quality × merch appeal × price. Stock bought up front; van space limits hauling; unsold boxes pile up visibly in the garage. Unlocks: stickers/shirts → hoodies/toques → vinyl → silly limited editions (Marcel bobblehead). Genre flavour (unreadable-logo longsleeves, patches, tour shirts, trucker hats). A misprinted batch can become a collector's item.
- **Broke:** borrow from your parents, with guilt-trip cards ("Your mom asks if you've thought about night school").

## A14. Loonie Awards, endings, meta-progression
- **Loonies:** once a year at a set week. Categories: Breakthrough Group, Album of the Year (per genre), Single of the Year, Best Live Act, Fan Choice, Worst Van (joke award). 3D red-carpet scene → event card (Marcel's outfit) → envelopes → acceptance speech choice (thank your mom / thank the moose / take a shot at the rival). Lose to Tundra Wraith and they thank you personally. Rewards: money, fans, buzz, a loonie-shaped trophy.
- **Legacy score** at career end: fans, albums sold, awards, biggest venue headlined, regions broken, band unity, final-showdown result.
- **Ending tiers:** Arena Legends (Sad Dome, world tour, a statue in Saskatoon) → Canadian Institution (your one song at every hockey game forever) → Cult Heroes (small obsessive fanbase, reunion tours for life) → One-Album Wonders → Still in the Garage (your mom wants to park the car in there).
- **Special endings** stack on tiers: Big in Japan, Moose Opera (Marcel's concept album platinum in Finland), Band of Strangers (no originals left), The Original Five (never lost a member), Side Project (absorbed by your rival).
- **Epilogue cards** per member (Marcel opens a cape shop; Dana's solo finally ends; Jaxon's baba becomes your manager; Kenji is never heard from, but a new bass arrives every Christmas).
- **Meta:** cosmetics and unlocks carry into future careers; a Hall of Fame of past careers.

## A15. First week and tutorial
- Start: pick save slot → pick genre (intro card + peek at the starting space) → **detailed character creator** (face/hair/body, clothes & stage outfits, tattoos & piercings, your drum kit's look) → comedic cold open (Hail Damage: the night a hailstorm totalled your dad's truck you started a band and named it after the insurance claim).
- Week one teaches by playing, **taught by bandmates in character** (no neutral popups): Monday card (Marcel will only answer to "Lord Abyssus") → tap-walk the garage while a bandmate points out hotspots → Write block with a starter pattern → Rehearse block → first gig (buddy's house party, exposure deal, 1–2 songs, slow tempo, wide window, twelve people and a dog) → week wrap with each stat explained once.
- Weeks 2–4 introduce the gig board, money & merch, moods & group chat, first van ride.
- Tutorial skippable on later careers; a "?" button replays any lesson.

## A16. Open decisions (ask the owner with popups when you reach them)
- Rival band member names/personalities for all four rivals (only Tundra Wraith's frontman is sketched).
- Exact numbers: fan thresholds per era/region, prices, pay ranges, mood rates, staleness rate.
- The drum sound palette and the generated guitar/bass style per genre.
- City lists per regional map.
- Who drives the van (Kenji silently?), and the van names after the Moose Hearse.
- Character creator part lists.
- Playing the game on the owner's phone: GitHub Pages vs opening dist/game.html directly (see B6).

---

# PART B — CLAUDE CODE BUILD HANDOFF

## B1. Read this first
- Follow the **cheap-game-build** doctrine and the **Red Skies build format** exactly (single-file phone game built from small modules; see B3). The owner plays on a phone, portrait, has beginner+ coding knowledge, and wants **every question as a popup (AskUserQuestion)**, 2–4 options, recommended option first, related questions batched into one popup. Ask whenever something is unclear; never re-pitch a locked call from Part A.
- Start of every session: read `plan/status.md` first. Do not re-explore the codebase to rebuild context. After every build/push, update `plan/status.md` (version, what changed, new APIs, owner decisions, back-burner list).
- Token discipline: never read a whole large file — `grep -n` then read the line range. Edit with exact-string replacements. Don't re-read a file after editing. Filter noisy output (`| grep -E "FAIL|ALL PASS" | tail -5`).
- Verify with numbers, not pictures: node unit tests for sim/content/rating; Playwright checks split by env var so each fits a `timeout 500` run; a "no console errors" assertion in each check. Screenshots only for visual work, at 390×844, combined into one contact sheet.
- Subagents only for multi-feature batches (contract first, ≤4 agents, isolated copies, lead wires and publishes). Patches never use subagents.

## B2. Tech decisions
- **Output:** one self-contained HTML file per build (`dist/game.html`) plus an Artifact-host copy (`dist/game.artifact.html`) and a named copy `Garage to Glory - V<ver>.html`.
- **3D:** three.js, pinned version, loaded as a single `<script>` tag from cdnjs (the only external dependency). Low-poly, flat-shaded, few materials, instanced meshes for crowds, no per-frame allocations. Portrait camera framing everywhere. Tap-to-walk in rooms (raycast to floor, move along a straight line, hotspots are meshes with a `userData.action`).
- **Audio:** Web Audio API only. Synthesized drums (kick, snare, hi-hat, cymbal, toms, ride/china) and generated guitar/bass parts per genre from the drum pattern + tempo + a genre style table. No audio files. Rhythm-game note scheduling and hit judgement use `AudioContext.currentTime`, not `requestAnimationFrame` timestamps. Pause suspends the AudioContext; cap concurrent voices.
- **Saves:** `localStorage` in try/catch (autosave slot + 3 manual slots + Hall of Fame + meta unlocks), plus an export/import **save code** (compressed JSON as text) so the owner can back up from his phone. The game must render correctly when storage is empty.
- **Content as data:** bands, characters, venues, event cards, storylines, traits, quirks, name pools, reviews, endings, genre tables all live in `src/content/*.js` as plain objects so they can be edited without touching logic, and unit-tested (every card's choice effects reference real stat names, every venue has a tier, etc.).
- **Determinism:** one seeded RNG for the career (`seed` stored in the save) so bot tests and bug reports are reproducible.
- **No USA content** anywhere (cities, venues, cards, awards).

## B3. Repo layout (Red Skies format)
```
GarageToGlory/
  README.md
  VERSION                     # Major.Minor.Patch.Build, bump before every build
  build.js                    # ~20 lines: concatenates ORDER into dist/ and stamps VERSION into <title>, a global and the menu credit
  plan/
    status.md                 # version, decisions, APIs, back-burner list — the memory that survives sessions
    handoff.md                # this file
    plan_contract_<ver>.md    # only for subagent batches
  src/
    00_shell.html             # CSS + markup + <!-- SCRIPTS --> marker
    01_ns.js                  # window.GG namespace, event bus on/emit, seeded RNG, VERSION global
    02_contracts.js           # every event payload, state field and command — single source of truth
    10_save.js                # localStorage slots, autosave, save codes
    20_sim_career.js          # week loop, stats, eras, milestones, money, moods, quits/returns (no DOM)
    21_sim_songs.js           # sequencer model, rating, catalog, staleness
    22_sim_gig.js             # chart generation from songs, note timing model, judgement, crowd meter (no DOM, no audio)
    23_sim_rival.js           # rival career, heat, showdown resolution
    24_sim_labels.js          # labels, albums, reviews, charts, awards
    25_sim_tour.js            # regions, unlocks, tour packages
    30_audio.js               # synth drums, generated backing, scheduling
    40_render_*.js            # three.js: garage rooms, stage, van, red carpet, character creator
    50_ui_*.js                # DOM screens: whiteboard, cards, gig board/maps, sequencer, results, menus
    60_main.js                # boot, screen routing, tutorial
    content/*.js              # all game data (see B2)
  tests/
    *.test.js                 # node tests for every sim module and content validation
    pw_*.js                   # Playwright checks, sectioned by env var (e.g. META_ONLY=flow), SKIP_* flags
  tools/
    balance.js                # bot probe: a perfect-play / average-play bot over a few seeds prints fund, fans, era week, quits per year
  dist/                       # built files (committed so the owner can play from GitHub)
```
- One global namespace `window.GG` and an event bus (`GG.on`, `GG.emit`).
- Sims are fixed-step and never touch the DOM (the career sim is turn-based per week; the gig sim advances at 20 Hz in tests with fake input timestamps). Render, UI and audio only read sim state and listen to bus events.
- Every module exposes `debug()` getters so tests assert state instead of taking screenshots.
- Version stamps: `<title>` "Garage to Glory - V0.1.0.0", `GG.VERSION`, and the menu credit "a game by Prairie Blue Studio".

## B4. Version roadmap (build in this order; each version is playable on a phone before moving on)
Each version: bump VERSION, run the affected tests, build, commit, push, update `plan/status.md`, then one short plain-words summary to the owner (no step recap) and a popup for the next decision if one is due.

- **v0.1.0 "Garage"** — Shell, build.js, VERSION, status doc, contracts, save system (autosave + 3 slots + save code). Basic character creator (name + a few presets; full creator comes in v0.8). Hail Damage only. 3D garage with tap-to-walk and hotspots. Whiteboard weekly loop with three blocks, all six activities (Write and Book are placeholders that give a stat bump), stats, week wrap, 24-week year, era = Garage with protection on. A starter set of ~20 Monday cards with hints, plus one storyline chain. Placeholder auto-resolved weekend gig so money flows. **Done when:** a full year can be played on a phone, saved, reloaded, with no console errors, and `tools/balance.js` runs a bot year.
- **v0.2.0 "Sequencer"** — Step sequencer (4 lanes × 16 steps, top-to-bottom), three sections + arrangement, genre tempo ranges, Web Audio playback (drums + generated backing for metal), Groove/Hook/Difficulty rating, catalog, staleness/classics, band reactions, French song titles. **Done when:** a song written in the UI plays back and rates deterministically in node tests.
- **v0.3.0 "Stage"** — Rhythm gig on the 3D stage: charts built from songs, audio-clock scheduling, Perfect/Good/Miss, combos, crowd meter, crowd reactions, results screen, save between songs. Setlist picker. Gig board with the Canada map (Saskatchewan pins first), three pay deals, venue tiers 1–2 with quirks and reputation, genre fit. Van scene (skippable) with road cards. **Done when:** a real gig can be played end-to-end and a bot with fake input hits an expected grade in tests.
- **v0.4.0 "Drama"** — Member moods and wants, group chat escalation, ultimatum cards, quits and returns with storylines, fill-ins, recruit generator (three cards, chemistry shown, paid re-post), keep-recruit-vs-original with rival defection, pay-the-band setting, parents' loan with guilt cards, Garage-era protection ends at the first milestone.
- **v0.5.0 "Signed"** — Eras and milestones, Local heroes and Signed content, labels (Gopherwood / Monolith / DIY, recoupable advances, deadlines, drops), studios, producers, album recording flow (tracklist, single, titles/covers with custom title option, drum takes by skill or played), reviews with pull quotes, Maple 100, streams, gold/platinum, Loonie Awards ceremony (yearly, set week).
- **v0.6.0 "Rivals"** — Tundra Wraith career sim, leaderboard, heat, all showdown types, Battle of the Bands with the rival's set watched first, poaching, rival cracking, final showdown.
- **v0.7.0 "World"** — World stage era; regional maps (UK & Europe, Japan, Australia, Russia), unlock by threshold or invite, preset tour packages, flights/rentals, on-tour blocks, homesickness, region cards, parody festivals, genre-region fit, "big in one place" storyline, Global Gong.
- **v0.8.0 "Kit"** — Drum gear unlocks (lanes 5–6, double kick, Outro and Solo sections), drum skill stat, garage spaces per era + upgrades, van stats/upgrades/names, full merch (pick + price, stock, van space, unlocks, misprint event), full detailed character creator (face/hair/body, clothes & stage outfits, tattoos & piercings, kit look).
- **v0.9.0 "Genres"** — Frost Heave, Gravel Kings, The Grid Road Ramblers with their rivals and starting spaces; genre audio styles; genre moments; genre-flavoured recruit pools and merch; lineup sizes per genre.
- **v1.0.0 "Glory"** — Legacy score, ending tiers, special endings, epilogue cards, bonus years, Hall of Fame and meta unlocks, in-character tutorial for week one and weeks 2–4, "?" replay, skip on later careers, performance pass (instancing, LOD, voice cap), phone QA at 390×844.

## B5. Testing minimums
- `tests/content.test.js`: every card, venue, trait, quirk, review outlet and ending references valid stat names and gates; no duplicate ids; no US place names.
- `tests/sim_career.test.js`: a seeded 240-week bot career finishes without exceptions; protection holds through the Garage era; moods can't drop below zero; saves round-trip.
- `tests/sim_songs.test.js`: rating is deterministic; genre signatures score as designed.
- `tests/sim_gig.test.js`: a chart's note count equals the song's pattern; perfect-input bot scores 100%; timing window widens with drum skill.
- `tests/pw_flow.js` (META_ONLY=flow): boot → new career → week one → save → reload, no console errors.
- `tools/balance.js` before and after any balance change.

## B6. Getting it onto the owner's phone
The owner is phone-only. After the first push, ask with a popup whether to enable GitHub Pages (he flips the switch in repo settings on the web; you keep `dist/game.html` committed and add a root `index.html` that redirects to it) or to keep opening `dist/game.html` from the repo. Recommend GitHub Pages so every push gives him a playable URL.

## B7. Repo setup (do this in the first session, after v0.1 files exist)
```bash
git init
git add .
git commit -m "v0.1.0.0 Garage — shell, build, save system, weekly loop"
git remote add origin https://github.com/Jxstrr0/GarageToGlory.git
git branch -M main
git push -u origin main
```
If the push fails on authentication, stop and ask the owner with a popup how he wants to authenticate (GitHub CLI login vs a personal access token) — never guess credentials. After that, every version is: bump `VERSION` → build → tests → `git commit -m "vX.Y.Z.B <Name> — <one line>"` → `git push` → update `plan/status.md`.

## B8. First-session checklist
1. Create the layout in B3 with stubs, `build.js`, `VERSION` = `0.1.0.0`, `plan/status.md` (copy the locked table from A2 into it), and this file at `plan/handoff.md`.
2. Build v0.1 per B4. Ask popups only for genuinely open items (A16); everything else is locked.
3. Run tests, build, commit, push (B7).
4. Update `plan/status.md`, then give the owner a two-sentence summary and the GitHub Pages popup (B6).
