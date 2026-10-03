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


---

# PART C — ADDENDUM 1 (appended 2026-09-29, after v0.6.0 shipped)

Drop this into the Claude Code session and say "read addendum 1 and queue it behind the current work".
Written Tuesday, September 29, 2026. Everything here is a locked owner decision unless it's marked open.

**TIMING — READ FIRST:** Nothing in this addendum is to be started until the task currently in progress is finished, tested, built, committed and pushed. Do not interrupt, reshuffle or expand the version you are in the middle of. When that work is done, record these decisions, then pick them up in the next version (or next patch for items whose version already shipped). This addendum adds to the plan; it never replaces the plan's current task.

## C0. How to use this addendum
- **Order of operations:** (1) finish the in-progress task; (2) append this file to `plan/handoff.md` as **Part C**; (3) record every decision in `plan/status.md` (decisions list, plus an "Addendum 1 — pending" checklist); (4) work through the checklist in roadmap order from the next version onward. Read `plan/status.md` first as usual; don't re-explore the codebase.
- Each section says which roadmap version it belongs to (see handoff B4). If that version has **already shipped**, add the missing pieces in the next patch/minor release and tell the owner in the post-build summary. Don't rebuild shipped work from scratch.
- These settle four of the open decisions in handoff A16: city lists, the van driver and names, character creator part lists, and the drum sound palette. Still open: **rival band members** (all four rivals) and **exact balance numbers**. Ask with popups when you reach them.
- Same rules as before: cheap-game-build doctrine, Red Skies layout, questions as popups, content as data in `src/content/*.js`, no USA content.

---

## C1. The van: drivers, names, stickers (v0.3 drivers + scene; v0.8 names, rename, stickers, upgrades)

**Designated driver per band — the driver changes stats and road cards:**
| Band | Driver | Effect |
|---|---|---|
| Hail Damage | Kenji — silent, perfect record, never uses GPS, always exactly on time, nobody knows if he has a licence | Fewer breakdowns |
| Frost Heave | Moth — it's her apartment, nobody else may drive | Free maintenance, terrible comfort (her stuff everywhere) |
| Gravel Kings | T-Bone — the only adult; Chase begs to drive and blasts '80s cassettes | Safe but slow |
| The Grid Road Ramblers | Earl — 20 under the limit, stops at every historical marker | Slow, but road stories boost band chemistry |

- If the driver quits, **you** drive and the road-card pool changes (more wrong turns, gas-station arguments).
- Van scene seating: driver up front, you riding shotgun as founder, band in the back rows, gear and merch piled behind.

**Vehicle names (preset per band per tier; the player can rename any vehicle):**
| Tier | Hail Damage | Frost Heave | Gravel Kings | Grid Road Ramblers |
|---|---|---|---|---|
| Rusted minivan | The Moose Hearse | The Pothole | The Mullet Wagon | Grandpa's Suburban |
| 15-passenger + trailer | The Claim Adjuster | Squat Van | Night Rider | The Hay Wagon |
| Sprinter | Black Ice | The Eviction Notice | The Power Ballad | The Combine |
| Tour bus | Doom Coach | Frost Heave One | Thunderdome | The Prairie Palace |

- **Stickers:** every venue played adds a sticker to the van body (visual career scrapbook). Banned venues' stickers get crossed out.
- **Dashboard item per driver:** Kenji's single tiny cactus, Moth's laundry, Chase's cassette pile, Earl's 1987 road atlas.
- **Road events** (content pool): deer on the Yellowhead, whiteout on the Trans-Canada, the fight over shotgun, Marcel's cape shut in the sliding door.

## C2. Character creator (v0.1 basic presets; v0.8 full creator and unlocks)

- **Separate everyday and stage looks.** The stage look switches on automatically for gigs, the red carpet and stage scenes.
- **Unlocks:** basics at the start; pro gear and more items unlock as the career grows. At a new career, the player may choose to **carry unlocks over within the same genre** (toggle on the new-career screen). This works alongside the handoff's cross-career cosmetics carry-over.
- **Body:** build (slim, average, stocky, big); height slider; ~12 skin-tone swatches; age look (fresh-faced, lived-in, grizzled).
- **Face:** face shape, eyes (shape + colour), eyebrows, nose, mouth (a few options each); facial hair (clean, stubble, goatee, full beard, handlebar moustache, mutton chops, braided Viking beard); glasses (none, round, aviators, Kenji-style shades).
- **Hair:** buzz, mop, mullet, long metal hair, dreadlocks, braids, mohawk, liberty spikes, man bun, bald, curly, shaggy, slicked back, hat hair. Colours: naturals + bleach, green, pink, blue.
- **Everyday clothes:** tops (band tee, flannel, hoodie, parody hockey jersey, tank top, denim jacket); bottoms (jeans, cargo shorts, sweatpants, kilt); shoes (skate shoes, work boots, cowboy boots, Crocs); headwear (toque, trucker hat, cowboy hat, bandana, backwards cap).
- **Stage outfits:** leather vest, battle jacket with patches, shirtless, spandex, Canadian tuxedo (all denim), rhinestone suit, cape, studded wristbands, corpse paint.
- **Tattoos:** spots (full/half sleeves, neck, chest, knuckles, face teardrop); designs (skull, maple leaf, wheat sheaf, band logo, "MOM" heart, moose, flames, one misspelled word). **Knuckle tattoos: the player types their own four letters per hand** (filter to letters A–Z).
- **Piercings:** ear studs, hoops, gauges, nose ring, septum, eyebrow, lip.
- **Drum kit look:** shell finish (natural wood, black, sparkle, flames, camo); hardware (chrome, black); kick-drum head art (band logo, your face, a moose, custom text); throne (milk crate early → leather); stick colour; extras (cowbell, hair fan, **pyro** for arena shows, unlocked by era). **No gong** — remove it anywhere it appears.

## C3. Drum sounds and genre audio (v0.2 synth + backing; v0.3 gig audio, crowd, venues; v0.8 kit-quality upgrades)

**Kit synthesis (Web Audio, no files):**
- Kick: deep sine thump with a pitch drop plus a front click.
- Snare: noise crack over a tuned body.
- Hi-hat: short, bright, high-passed noise.
- Cymbal: long shimmering crash.
- Toms (lane 5): three pitched booms.
- Ride/china (lane 6): pinging bell (ride) or trashy crash (china).

**Genre kit tuning:** metal = tight clicky kick, high sharp snare (built for double-kick runs); punk = loose, trashy, bright; rock = big roomy kick/snare with lots of reverb; country = soft and dry, rim clicks for the train beat, optional brushed snare.

**Kit quality improves with gear:** the milk-crate-era kit sounds thin and cheap; pro gear sounds full and punchy (audible progression). Implement as a quality tier that changes synth parameters (body, sustain, saturation, reverb send).

**Generated band (new random key per song):**
- Metal: palm-muted guitars that **chug on every kick hit**, bass doubling the guitars, Dana's solos as fast arpeggios.
- Punk: fast downstroke power chords, root-note bass, gang shouts "HEY!" in choruses.
- Rock: riffs and open chords, bluesy lead, walking bass.
- Country: acoustic boom-chicka strum, fiddle melody, root-fifth bass, twangy guitar licks.
- Sections change density: sparse verses, full choruses, breakdowns strip back to the heavy parts.

**Vocals:** short synthesized vocal hits (growls, "HEY!", yeehaws, short sung phrases) that are **scheduled on the song's beat grid and fit the song**: shouts on chorus downbeats, growls where a breakdown drops, and anything pitched matched to the song's key. Never free-running or off-beat.

**Gig input:** the player's taps **trigger the drum sounds** — a missed note is silent. The backing band plays on regardless.

**Rooms and ambience:**
- Venue reverb by size: basements dry, Legion halls echo, arenas huge.
- Crowd bed that swells with the crowd meter; synthesized cheers and boos.
- Garage hum with Dana noodling faintly; road noise in the van.
- **Van radio:** once one of the player's songs charts (Maple 100), it plays on the van radio during drives.

**Mixer:** separate volume sliders for drums, band, crowd and SFX; metronome click toggle in the sequencer.

## C4. Settings, difficulty, calibration (v0.3 calibration + gig difficulty; v0.1/v1.0 career difficulty + settings screen)

**Audio calibration:**
- **Runs automatically on first launch**, and can be re-run anytime from Settings.
- Tap-along test: the player taps along to eight clicks; measure the average offset from `AudioContext.currentTime` and apply it to note judgement.
- Visual check: tap on a flashing light to align visuals with audio.
- **Two saved profiles: phone speaker and headphones**, with a quick switch (Bluetooth adds noticeable delay).

**Career difficulty:** Chill / Normal / Brutal, chosen on the new-career screen and **locked for that career**.
- Chill: more money, slower mood decay, softer rivals and labels.
- Normal: intended.
- Brutal: tight money, touchy bandmates, ruthless labels, a rival that doesn't miss.

**Gig difficulty (separate, changeable anytime):**
- Timing window: Easy / Normal / Hard / Expert, stacked with the drum skill stat.
- Note speed: highway scroll speed, set independently.

**Assists (in):** No-fail (can't be booed off), Auto-kick (the kick lane plays itself), Practice mode for any catalog song with slow-down.

**Other settings:** lefty mode (mirror lanes); graphics quality low/medium/high (battery); camera shake toggle; colourblind-friendly lane colours; bigger text; reduced flashing (pyro, stage lights); skip van scenes / faster animations; save management (slots, export/import save code).

## C5. Bandbook and fans (v0.4 Bandbook + superfans; v0.5 fan club)

- **One parody social app: Bandbook** (all-in-one), on the garage laptop.
- **Promote blocks post automatically** — no post-type choice. The game picks fitting content (rehearsal clip, gig announcement, song teaser, meme, behind-the-scenes) from the band's current state; posts drive buzz, streams and new fans. **Fans remain one global count.**
- **Viral:** each post has a small chance to blow up, higher for weirder moments. Good viral (you falling off the riser) or the wrong kind (Marcel's cringe dance tutorial: buzz up, his mood down).
- **Comments:** each post shows a few generated comedic comments reflecting fan sentiment ("saw them at a Legion hall, 12 people and a dog, I was the dog"). Tundra Wraith leaves a supportive comment on every post.
- **Scandals:** bandmates post dumb things → a choice card (e.g. it comes out Marcel's beloved lawn is artificial turf).
- **Fan types:** superfans (buy merch, follow on tour), casuals (show up with buzz), haters (grow with fame, get their own comments).
- **Recurring named superfans** across the career (crowd, comments, event cards): Dale from Warman (at every show), the trucker from the jumper-cable story, and the president of your Japanese fan club.
- **Fan mail and gifts** appear in the garage (a macaroni portrait of Kenji; Japanese fan gifts).
- **Paid fan club** unlocks later in the career: monthly income from superfans that depends on keeping them happy with exclusive posts. Name it with a parody subscription-site name.

## C6. Cities and maps (v0.3 Saskatchewan ring; v0.5 West and East/North rings; v0.7 world maps)

**Canada opens in rings:**
- Saskatchewan (from day one): Saskatoon, Regina, Prince Albert, Moose Jaw, Swift Current, North Battleford, Yorkton, Humboldt, Gravelbourg, Estevan.
- The West (Local heroes era): Winnipeg, Brandon, Calgary, Edmonton, Red Deer, Lethbridge, Kelowna, Vancouver, Victoria.
- The East and North (Signed era): Thunder Bay, Toronto, Ottawa, Montreal, Quebec City, Halifax, St. John's, Whitehorse, Yellowknife.

**World regions:**
- UK & Europe: London, Manchester, Glasgow, Dublin, Paris, Amsterdam, Berlin, Prague, Madrid, Oslo, Stockholm, Helsinki. Mudstonbury sits in the English countryside; Wackelstein Open Air in northern Germany. Helsinki is where the Moose Opera ending lands.
- Japan: Tokyo (Budokhan Hall), Osaka, Nagoya, Kyoto, Sendai, Sapporo, Fukuoka, Hiroshima.
- Australia: Sydney (Big Day Inn), Melbourne, Brisbane, Adelaide, Perth, Hobart, Darwin, Alice Springs.
- Russia: Moscow, St. Petersburg, Kazan, Yekaterinburg, Novosibirsk, Irkutsk (Siberian Frostfest, by Lake Baikal), Vladivostok.

**Starting cities:** Hail Damage — Saskatoon (parents' garage); Frost Heave — Regina (laundromat basement); Gravel Kings — Edmonton (strip-mall unit); The Grid Road Ramblers — a farm outside Swift Current (Quonset).

## C7. Seasons, weather, holidays (v0.1 calendar; v0.3 weather; v0.5–v0.7 holiday and regional content)

**Calendar:** the 24-week year runs **two weeks per month**; every week has a month and a season, shown in the UI.

**Seasons:**
- Winter (Dec–Feb): whiteouts, icy roads, the forgotten block heater, fewer outdoor gigs, cabin-fever moods.
- Spring (Mar–May): pothole season (extra van wear), mud, festival lineups announced.
- Summer (Jun–Aug): festival season, outdoor shows, fairs, mosquitoes, road construction, hailstorms (Hail Damage takes them personally).
- Fall (Sep–Nov): frosh-week campus shows, harvest dances (a boost for the Grid Road Ramblers), Halloween.
- **Genre-season fit:** country thrives at summer fairs and rodeos, punk at summer skate parks and all-ages shows, metal owns the dark winter months.

**Weather:** rolled weekly by season and region (clear, rain, snow, blizzard, heat wave, hail). Affects outdoor-gig turnout, van travel risk, crowd energy, and the van-windshield visuals. **Weather never cancels a gig.** The garage changes with the season (snow at the window, Christmas lights in December, a box fan in July).

**Overseas seasons:** Australia's seasons are reversed — a Canadian winter is Aussie summer festival season, a deliberate touring strategy. Japan: cherry blossom season and summer festivals. Russia: brutal winters, bright summer nights in St. Petersburg.

**Holidays and yearly events (all kept):**
- New Year's Eve: the best-paying gig of the year.
- St. Patrick's Day: pub gig circuit.
- Loonie Awards: every spring (this is the "set week" from handoff A14).
- Canada Day: free outdoor park shows with huge buzz.
- Halloween: costume gigs where the band dresses as another band.
- Thanksgiving: dinner at your parents' place, with guilt cards if you owe them money.
- Remembrance Day: Legion halls are closed that night (no Legion gigs that week).
- Christmas: holiday party circuit; your label pushes a terrible Christmas single.
- **The Grey Mug:** parody of Canada's big football final; its **halftime show is a massive late-career moment**.

---

## C8. Still open (ask with popups when you get there)
- Rival band members for Tundra Wraith, Mall Rats, Chartbusters and Buckle & Boot.
- Exact balance numbers (fan thresholds per era/ring/region, prices, pay, mood rates, staleness, viral odds, fan-club income).
- Parody name for the fan-club subscription site.


## Owner clarification (2026-09-29)
- KEEP the Global Gong award (v0.7). "No gong" only means: never add a gong to the drum kit.

---

# Part D — Addendum 2 (owner, written 2026-09-29; received 2026-09-30)

Written Tuesday, September 29, 2026. Locked owner decisions unless marked open.

**TIMING — READ FIRST:** Nothing here starts until the task currently in progress is finished, tested, built, committed and pushed. Do not interrupt, reshuffle or expand the version you are in the middle of. Then append this file to `plan/handoff.md` as **Part D**, record the decisions in `plan/status.md` (decisions list plus an "Addendum 2 — pending" checklist), and pick the items up in roadmap order from the next version onward. This addendum adds to the plan; it never replaces the plan's current task.

Same rules as always: cheap-game-build doctrine, Red Skies layout, questions as popups, content as data, no USA content. The owner explicitly does **not** want a share/screenshot button — don't add one.

---

## D0. Housekeeping first (do this the moment the current task is done, before anything else)
- **Fix the version lines at the top of `plan/status.md`.** The "Version" section still reads "Current: 0.6.0.0 … Next: 0.7.0 World" while v0.7.0.0 is merged to `main`. Make it: Current = the version actually on `main` (read `VERSION`), list 0.7.0 World under shipped, Next = 0.8.0 Kit. From now on, updating that Current/Next line is part of every merge — it's the first thing the next session reads.
- Add the "Addendum 2 — pending" checklist (D1–D5 below) right under the Addendum 1 one.

## D1. Licensing deals (v0.8 — economy side, with merch) — designed, was missing from the plan
Your songs get licensed for money once you're worth licensing.
- **When offers come:** from the Signed era on, or earlier if a song charts on the Maple 100 or goes viral on Bandbook. Rare — roughly 2–4 offers across a career, more with fame. They arrive as a Monday card and sit on the laptop until answered (a few weeks to decide).
- **Offer types (parody brands, genre-weighted):** a truck commercial (country and rock — **Buckle & Boot are furious** when it goes to the Grid Road Ramblers: a rival heat spike + a card); an energy drink (metal and punk); a hockey highlight package (any genre); a regional insurance ad (metal — Marcel's employer, he's mortified); a video game trailer (any). Each is a content entry: brand, blurb, fee range, genre fit, "sellout" weight.
- **The card:** three choices with hints — **Take it** (lump sum to the fund + buzz + streams for that song), **Decline** (small superfan loyalty bump), **Counter** (ask for more: better fee with some chance the offer is withdrawn). Counter odds improve with fans and a label's clout.
- **Effects of taking it:** money, buzz, streams; the song gets an "in a commercial" tag that bumps its staleness (crowds have heard it a thousand times); the sellout weight nudges haters up and can trigger a Bandbook scandal card ("Lord Abyssus sold the moose to an energy drink"); recoupable labels take their contract cut.
- **Content hooks:** `src/content/licensing.js`; a laptop "Offers" line; achievement "Sold Out" (D4).

## D2. Band logo (v0.8, alongside merch and kit head art) — never designed until now
Everything already references "your band logo"; this makes one.
- **When:** on the new-career flow right after the band's intro, before the character creator. Editable later from the laptop for a fee ("Rebrand", small; costs a little buzz).
- **The picker (three taps):** an **emblem** (skull, wheat sheaf, lightning bolt, moose, maple leaf, gopher, anvil, hailstone, grain elevator, cowboy hat, safety pin, flaming tire), a **lettering style** per genre (spiky unreadable metal, cut-out ransom punk, chrome '80s rock, western slab country — all four available to any genre, default = the band's), and a **colour pair** (a curated palette, ~10 pairs).
- **Rendering:** procedurally drawn to a canvas texture (band name in the lettering style over the emblem), cached and reused everywhere: the kick-drum head art option, merch, van stickers, the Bandbook avatar, the garage banner, the Loonies broadcast card, the Hall of Fame entry. No image files.
- **Storage:** three small ids in the career save (`logo: { emblem, style, palette }`); carry-over follows the cosmetics rule.
- **Recruits and the rival:** rival bands get their own fixed logos from content (same renderer) so the Scene leaderboard and BOTB screens show both.

## D3. Year-end recap (v0.8 — small, and it feeds v1.0's Hall of Fame)
At the week-24 wrap of every year, before the next year starts:
- One screen, swipeable on a phone: **fund change** (in vs out), **fans gained**, **best gig / worst gig** (venue, grade, a one-line quote), **songs written and albums released**, **awards** (Loonies, Global Gong), **who quit / who came back**, **rival standing** (leaderboard delta), **regions unlocked**, and a **headline from Rolling Scone** generated from the year's biggest event ("Hail Damage Survive Second Year; Van Does Not").
- A **band photo**: the current lineup posed in the current space, rendered from the 3D scene (a still, not a share image).
- Each recap is stored in `history` (compact — do not bloat the save code; the back-burner notes it's already large) so the Hall of Fame (v1.0) can show a career as a strip of yearly recaps.
- Ties into the tutorial: the first year's recap is where the bandmates explain what "a good year" looks like.

## D4. Achievements (v1.0, with the Hall of Fame and meta unlocks)
Cross-career, stored in meta storage, shown on the laptop under "Trophies" and toasted on unlock. Comedic and cheap: ~30 entries as content (`src/content/achievements.js`), each with id, name, blurb, condition. Examples to seed:
- **Twelve People and a Dog** — play your first gig.
- **The Wall** — get banned from three venues in one year.
- **Ma Pelouse** — release a song whose title Marcel wrote.
- **The Original Five** — finish a career without losing a member.
- **Kijiji All-Stars** — finish a career with no original members.
- **Sold Out** — take a licensing deal (D1).
- **Worst Van** — win the Loonie for it.
- **Block Heater** — survive a winter without a breakdown.
- **Buddy** — lose to Tundra Wraith at the Loonies three years running.
- **Big in Japan** — earn the special ending.
- **Frostbite** — play Siberian Frostfest.
- **Chugging Along** — write a metal song with kick hits on more than half the steps.
- **Grey Mug** — play the halftime show.
- **Night School** — borrow from your parents three times in one career.
- **Sad Dome** — headline it.
Achievements never gate content; they're flavour and bragging.

## D5. v1.1 "Tuning" — a balance and playtest pass after v1.0 (new roadmap entry)
No new features. The point is to make years 3–10 feel like "scrappy, but not too brutal" with real hands on it.
- **Owner playtest loop:** the owner plays years 3–6 on his phone and reports in plain words. Turn each report into a numbered item in `plan/status.md`, fix in small patches (v1.1.x), and re-run `tools/balance.js` before and after every change so no fix silently breaks something else.
- **Bot probes to keep honest:** average-play fund by year (the back-burner notes the late-game plateau and the good bot never seeing drama — both are targets here), fans by year vs the Steady pace targets, quits per year (≈ one per 1–2 years with decent play), rival leaderboard gap by year, time-to-World-Stage (≈ year 5–6), bonus-year rate.
- **Back-burner sweep:** work through the status doc's back-burner list; fix what's cheap, and explicitly close (with a reason) what isn't worth it, so the list stops growing.
- **Phone QA at 390×844:** every screen in portrait, the two-thumb rule on Hard/Expert, calibration on a Bluetooth profile, save-code size, battery on a full gig.
- Ask the owner with a popup at the start of v1.1 which two things bother him most in play — start there.

---

## D6. Still open (ask with popups when you get there)
- Exact fee ranges and offer odds for licensing (D1) — propose numbers in the v0.8 contract and confirm with one popup.
- The final emblem and palette lists for the logo picker (D2) — the lists above are a starting set; add, don't shrink.
- Any achievements beyond the seed list (D4) — add freely if they're cheap and funny.

---

# Part E — Addendum 3: "Seats" (owner, 2026-10-01)

Written Thursday, October 1, 2026, from a design session that read the repo at `main` 0.9.0.0 (merge of PR #18). Locked
owner decisions unless marked open (E14). Same rules as always: cheap-game-build doctrine, Red Skies layout, questions as
popups, content as data, no USA content, no share button.

**TIMING — READ FIRST:** this is roadmap entry **v1.1.0 "Seats"**. It does not start until **v1.0 "Glory"** is merged.
Tuning (Part D5) moves from v1.1 to **v1.2 "Tuning"** so the playtest pass covers all four seats. When you receive this
file: append it to `plan/handoff.md` as Part E (the patch already does), record the decisions in `plan/status.md` (the patch
already adds "Addendum 3 — decisions" and an "Addendum 3 — pending" checklist), and keep building v1.0 untouched.
v1.0 work that would be thrown away by Seats (see E12 "v1.0 forward-compat") should be written seat-aware from the start.

## E1. Pitch
You're still the founder, but now you pick **your seat**: drums (as before), **bass**, **rhythm guitar** or **lead guitar**.
Each seat changes how gigs play, what you write in the songwriter, which gear you buy, how the stage looks from your spot,
and which storyline you live through. The band stays the hand-made band you know: whoever's seat you take slides over to
the drum kit ("seat swap"), keeps their whole personality, and the jokes follow them to the drum throne.

## E2. Locked owner decisions (popups 2026-10-01)
| # | Question | Answer |
|---|---|---|
| S1 | Who drums when you don't? | **Seat swap.** The member whose seat you take moves to the kit. Every hand-made character stays. |
| S2 | How do guitar/bass play on the highway? | **Taps + holds.** Same highway engine as drums, lanes by pitch; long notes are holds (ringing chords, bends, held lead notes). **Bass: max 5 lanes. Guitar: max 6 lanes.** |
| S3 | What do you write in the songwriter? | **Your part + auto drums.** You pick chords/riffs per section from the genre's riff book and tap your rhythm on a grid; the band's (swapped) drummer suggests a beat you can tweak. |
| S4 | Roadmap | **v1.1 "Seats"** after v1.0 Glory; Tuning moves to **v1.2**. |
| S5 | Gravel Kings has no rhythm guitarist | **Chase drums + sings.** Picking rhythm in Gravel Kings adds your rhythm seat; Chase moves behind the kit and sings from there ("in 1985 drummers sang"). |
| S6 | Rox / Travis Lee sing and play rhythm | **They sing from the kit.** Pure seat swap; they keep every vocal (voice profiles unchanged), a mic stand on the riser. |
| S7 | Storyline size | **3 role arcs + band twists.** One multi-week chain per seat (bass, rhythm, lead), shared by all bands with `byBand` flavour lines, plus one band-specific finale card per band × seat (**12 finales**). |

## E3. The seat-swap table (content, `bands.js` → `seats`)
| band | you on bass | you on rhythm | you on lead |
|---|---|---|---|
| Hail Damage | Kenji → drums (silent drummer; still drives the Moose Hearse) | Jaxon → drums (sneaky fills become real drum fills) | Dana → drums (her drum solos run longer than the songs) |
| Frost Heave | Moth → drums (lives in the van, now with a kit in it) | Rox → drums + vocals (screams about city council from the riser) | Benny → drums ("two beats, on principle") |
| Gravel Kings | T-Bone → drums (flosses between songs, perfect time) | **new rhythm seat**; Chase → drums + vocals (leather pants on a throne) | Lenny → drums (every beat sounds like a famous one) |
| The Grid Road Ramblers | Duke → drums (the hat stays on; modest drum skills) | Travis Lee → drums + vocals | Earl → drums (has drummed with everyone too) |
- **Drums** = exactly today's game (no swap). Old saves load as `seat: 'drums'`.
- Clementine always stays on fiddle. Marcel always just sings.
- The swapped member keeps id, name, wants, mood, skill, quits/returns, epilogue and driver duties. Only their **stage role**
  changes for this career (`member.seatRole`, see E10). Their content `role` stays the source of truth for everything else.
- Band size never changes (Gravel Kings on rhythm: you + Chase on drums/vocals + Lenny + T-Bone = still four).
- If the swapped drummer **quits**, the hole is the drum seat: fill-in/recruit drummers come from the recruit generator
  (needs a drummer name/quirk flavour, E9). If they **return**, they go back to the drums.

## E4. Seat basics (what changes per seat)
| | Drums | Bass | Rhythm | Lead |
|---|---|---|---|---|
| Highway lanes (start → max) | 4 → 6 | 4 → **5** | 4 → **6** | 4 → **6** |
| Lane meaning | kit pieces | strings, low → high | chord-root contour, low → high | melody contour, low → high |
| Holds | none | ringing roots (≥ 1 beat) | ringing chords, the outro chord | held notes, bends, the last note of a solo |
| Your spotlight | freestyle fills | "the groove" bars (break bars lock to the kick) | chug runs + the riff intro | the solo section (densest, freestyle shred bar) |
| When someone else solos | you lay back (stripped kit) | you lay back (roots only) | you lay back (sustained chords) | — (it's you) |
| Chops stat | `drumSkill` | same field | same field | same field |
| Gear line in the shop | kit lanes, pedal, kit quality | 5-string (lane 5), "fast fingers" runs, amp tier | lane 5 + lane 6 neck/string upgrades, "fast picking" runs, amp tier | same as rhythm, + a whammy (bends score bonus) |
| Studio | drum takes | bass takes | rhythm takes | lead takes + solo takes |

- **Chops:** keep the save field `drumSkill` (effects, cards, balance and saves all use it); the UI already labels it "Your
  chops". It widens the timing window exactly like today for every seat.
- **Genre moments** (wall of death, circle pit, lighters, line dance) and member signatures (cape spin, stage dive, knee
  slide, hat tip) are unchanged. New player signatures by seat: **bass** "the lean-back" (low-end rumble shot), **rhythm**
  "the windmill", **lead** "the knee slide"… unless Chase is on the kit, then the knee slide is yours by inheritance.

## E5. Gigs: the string highway
Same `22_sim_gig` session, judgement, crowd meter, combos, two-thumb rule, difficulty thinning, drum-sync clock model
(v0.8.3) and saves-between-songs. What's new:
- **Charts come from the song's timeline** (`GG.audio.timeline` is pure; it already writes `bass`, `gtr`, `gtr2`, `clean`,
  `lead`, `twang`, `fiddle` events with `midi` + `len`). A seat chart = the timeline events of that seat's kinds (E10
  `SEAT_KINDS`), timed by beat exactly like drum notes. When the song has a written part (E6), those events come from it.
- **Lane mapping (contour, Guitar-Hero style):** per section entry, collect the distinct pitches the seat plays, sort low →
  high, spread them over the lanes you own (same pitch = same lane every time in that section; a chord change moves lanes).
  Bass lane 5 (5-string) = the lowest notes; guitar lanes 5–6 = the highest. Deterministic (no rng).
- **Holds:** a note with `len ≥ 1 beat` (Easy: ≥ 2 beats) is a hold. The head is judged like a tap (Perfect/Good/Miss).
  While held: sustain points tick and the note keeps sounding; releasing early just gates the sound (no miss, no combo
  break); held to the end = a small "ring" bonus. A hold never blocks its lane's next note (a new head in that lane ends it).
- **Chords (rhythm):** on Hard/Expert a power chord can be a 2-lane chord (two-thumb rule: never more than 2 at once).
  Easy/Normal: single lane.
- **Runs (the double-kick idea for strings):** fast repeats of the same pitch (metal chugs, punk 8th downstrokes, tremolo
  picking, ≤ `gig.RUN_GAP` apart) merge into **one hold note** ("run"): hold it and the run plays on the band's grid; release
  and it stops. Needs the seat's "fast fingers/picking" gear, like the double kick needs the pedal; without it the run is
  thinned to quarter notes. One note for accuracy/combo.
- **Your sound:** your taps play your instrument (pluck / strum / lead voice) booked on the band clock with the same
  `syncSnap` rule as drum hits; the backing **mutes your seat's part**, so a missed note is silence (the classic feel).
  The drums are played by the band (from the song's drum pattern).
- **Band effects by seat:** the soloist's solo eases you (bass/rhythm); when you are lead the solo section is yours (dense,
  freestyle shred bar, crowd bonus); Jaxon/Dana/Lenny on drums keep their "sneaky fill" flavour as audible drum fills (no
  extra notes for you). Unhappy members still miss cues. **No mid-gig chaos** (locked A6) still holds.

## E6. Songwriting: "Your part + auto drums"
The songwriter keeps its three sections + arrangement, tempo slider, Play, rating and naming. For a non-drum seat:
1. **Drums first, automatically:** the swapped drummer suggests a groove from the genre's preset library
   (`content/grooves.js` presets; a signature groove by default). A "Tell {drummer} what to play" button opens today's drum
   grid unchanged, so drum writing is never lost. Members' coach lines react ("Kenji nods at the kick pattern").
2. **Your part, per section:** pick a **progression** (rhythm, bass) from the genre's `backing.progressions[section]` list
   or a **hook** (lead) from a new `backing.hooks` list, shown as plain words ("dark and slow", "the big chorus lift").
3. **Tap your rhythm on a grid** (16 steps, top-to-bottom like everything else):
   - Bass: 3 rows = root / fifth / octave.
   - Rhythm: 2 rows = chug (palm mute) / open (ring); a hit on both = an accent chord.
   - Lead: 5 rows = scale degrees of the hook (low → high); the hook's notes play on your hits.
   - One-tap modifiers like the drum mods ("lock to the kick", "double time", "let it ring", "call and answer").
4. **Rating:** Groove gets a seat signature per genre (metal rhythm: chugs locked to the kick; punk rhythm: steady 8ths;
   rock lead: a hook that repeats in the chorus; country bass: root–fifth on 1 and 3, the boom-chick). Hook contrast reads
   your part too. Difficulty counts your part's notes. Reviews' "recycled patterns" check also compares parts.
5. Band reactions on save, per seat (Dana on drums wants a drum solo; Benny objects to your third chord).

Data: `pattern.part = { seat, sections: { <name>: { prog | hook: index, rows: [rowStr x 2..5] } } }` (16-char rows, `'x'`/`'.'`
like drum rows). `pattern.sections` (drums) stays as is. Drummer-seat songs have no `part`.

## E7. Storylines: three role arcs + band twists (Monday cards, chains, flags)
Each arc is a chain like the Cape Saga: ~6–8 cards over 2–4 years, gated by era, with hints, `byBand` lines in every card and
one band-specific finale (12 total). Each arc ends in a flag that feeds the v1.0 ending/epilogue. Writers: tone is the same
comedic Spinal Tap energy; no USA content.

**Bass — "Nobody Hears the Bass"** (flag `bassArc`: 'legend' | 'secret' | 'quiet')
1. Garage: the sound guy at your first real gig forgets to mic you; nobody notices, including the band.
2. Local: a Bandbook poll — 0 % of fans can name the bassist (one says "the tall one?").
3. Local: you start a secret Thursday funk night at a Legion hall under a fake name; it draws more people than your band.
4. Signed: the label photographer crops you out of the album cover. Choice: fight it / embrace the mystery / start wearing
   something unforgettable.
5. Signed: Rolling Scone wants an "unsung heroes of the low end" feature — if you go, the secret funk night is outed.
6. World: a foreign crowd chants the bass line back at you (the "big in one place" engine, bass flavour).
7. **Finale per band:** Hail Damage — Kenji, from behind the kit, says his first word of the career to you: "Nice." /
   Frost Heave — Moth grants you permanent permission to enter the van. / Gravel Kings — T-Bone schedules your first dental
   cleaning "as a thank-you" and calls you the band's second functioning adult. / Ramblers — Duke takes off the hat and puts
   it on you (the hat is the character; now you are).

**Rhythm — "The Engine Room"** (flag `rhythmArc`: 'credited' | 'unsung' | 'engine')
1. Garage: you write the riff; the lead/singer gets the compliment at the house party.
2. Local: a gear-shop clerk calls rhythm guitar "the part anyone can play"; a strum-off at the music store.
3. Local: the click track wars — a producer wants you on a metronome; the band wants you to *be* the metronome.
4. Signed: the label suggests replacing your album parts with a session player ("the Click"). Choice: play it yourself in
   the studio (a rhythm take), let it happen, or play it better on the demo and dare them.
5. Signed: royalty split meeting — who wrote the riff of your biggest song? (`{player}` credit tag on that song.)
6. World: a power trio night — the lead is stuck at a border crossing *before* the gig; you carry the set (a pre-gig card
   that changes the setlist bonus, not a mid-gig event).
7. **Finale per band:** Hail Damage — Jaxon's baba starts packing *you* a tour lunch too (the highest honour). / Frost Heave —
   Rox's council campaign jingle is your riff, and it wins (or loses) the ward. / Gravel Kings — Chase admits your rhythm
   part is "very 1985" (his highest praise). / Ramblers — Travis Lee says you strum "like a truck idling", and means it kindly.

**Lead — "Solo Too Long"** (flag `leadArc`: 'guitarHero' | 'bandFirst' | 'soloAlbum')
1. Garage: your first solo runs longer than the song; the crowd of twelve and a dog leaves for snacks.
2. Local: the gear spiral — a pedal you can't afford (a fund-vs-chops choice; the parents' loan can show up).
3. Local: a magazine ("Shred Quarterly") wants your rig rundown; you talk only in gear specs for a week.
4. Signed: the rival tries to poach you for their next record (uses the existing rival-poach machinery, aimed at the player
   as flavour only — you never quit, so it is a heat/buzz/money choice).
5. Signed: the label wants a solo-free radio edit of the single.
6. World: a festival guitar clinic; you can teach (fans, buzz) or shred (chops).
7. **Finale per band:** Hail Damage — Dana, from the drums, finally says one sentence that isn't a gear spec. / Frost Heave —
   Benny lets you play a third chord, once, in a closet. / Gravel Kings — Lenny's lawyers call *you* (your solo sounds like a
   famous one); settle it in style. / Ramblers — Earl hands you his Tele: "I played it with everyone. Now you."

**Seat flavour beyond the arcs:** each swapped drummer gets a small `bySeat` layer — 4–6 Monday cards and chat lines about
being on drums (Kenji drums in sunglasses; Dana demands a drum riser with a wind machine; Rox's council speeches from the
kit; Duke's hat vs the crash cymbal), a week-one card ("{drummer} has never played drums. They have a week."), and their
drum-seat epilogue variant. Recruits: a drummer flavour pool (names stay genre-flavoured; quirks already fit).

## E8. Content audit (drum words)
~400 drum references live in content (`cards.js`, the three `zz_band_*` packs, `genres.js`, `bandbook.js`, `world.js`,
`road_cards.js`, `reviews.js`, `creator.js`, …). A non-drum seat must never read "your kit", "your sticks", "drum skill" as
if they were theirs. Stage 0 adds `tools/seat_audit.js` (lists every line with drum vocabulary) and each line is either:
- **tokenised** with the new seat tokens (E10): `{instrument}` drums / bass / guitar, `{gear}` kit / bass rig / rig,
  `{sticks}` sticks / picks, `{drummer}` (you, or the swapped member's name), `{yourPart}` the beat / the bass line /
  the riff / the lead;
- **gated** with `seat: ['drums']` (keeps drum-only jokes for drummer careers); or
- **left** when it means the band's drums generally.
A strict leak scan (like `sim_bands`) runs full careers for every band × seat and fails on drum vocabulary aimed at a
non-drum player.

## E9. New-career flow, render, audio, UI
- **Pick your seat:** new screen after the genre card and before the logo: four seat cards (Drums / Bass / Rhythm / Lead),
  each saying who moves to the drums ("Kenji takes the drum throne. He did not say yes. He did not say no.") and showing the
  stage spot. Default = Drums. The seat is fixed for the career (no switching).
- **Character creator:** the "kit look" tab becomes "your gear": drums = KIT_LOOK as today; bass/guitar = body shape
  (per seat 3–4 shapes), colour (same palette), pickguard, headstock sticker (the band logo option). The swapped drummer
  plays a default kit in the band's colours.
- **Stage camera:** drums keeps the behind-the-kit camera. Strings: a low over-the-shoulder camera from your stage spot
  (bass stage-left, rhythm stage-right, lead front-left beside the singer) facing the crowd, the swapped drummer on the riser
  behind (the singing drummers get a boom mic). Same draw-call budget (≤ HD × 1.15).
- **Garage:** the swapped drummer idles at the kit hotspot; the kit hotspot becomes "your rig" (your amp corner) and opens
  the songwriter. Your character noodles on your instrument (the existing noodle audio by seat).
- **Red carpet, recap photo, title:** your instrument in hand in photos (the v0.9 sticks occlusion fix only applies to
  drums); the title stays Hail Damage's hailstorm garage.
- **Audio:** new playable voices for taps (`GG.audio.pluck/strum/lead` booked on the band clock like `GG.audio.hit`),
  holds gate the note on release, the timeline accepts `opts.mute` (your seat's kinds) and `opts.part` (your written part),
  voice caps respected. Metal's lead seat is Dana's R-channel guitar + the solos; rock's rhythm seat is the `gtr2`/`clean`
  layer; country's rhythm seat is Travis's acoustic strum; punk rhythm is Rox's guitar, punk lead is Benny's guitar + the
  two-chord break.
- **Shop:** the gear tab shows your seat's line (E4). Kit quality tiers map to amp/rig tiers; prices reuse the drum ones.
- **Studio:** "Drum takes" becomes "{instrument} takes"; the swapped drummer's drum takes run off their member skill.

## E10. Build handoff (tech notes for the lead and lanes)
- **State:** `state.seat` ∈ `C.SEATS = ['drums','bass','rhythm','lead']` (save migration: missing → 'drums'); each member
  gets `seatRole` (their stage role this career; equals `role` unless swapped). `GG.career.seatSwap(bandId, seat)` → member
  id or null (Gravel Kings rhythm → 'chase'); `GG.career.lineup(state)` → `[{ id: 'player'|memberId, seatRole }]`.
- **Gig roles:** `gig.roles(state)` reads `seatRole`; `solo` can be `'player'` (lead seat); `fill` skips the drummer.
- **Charts:** `gig.chart(song, { seat, lanes, run, difficulty })` → drum seat unchanged; string seats build from
  `GG.audio.timeline(pattern, { genre, part })` filtered by `SEAT_KINDS[genre][seat]`. Notes add `len`, `hold`, `chord`
  (2-lane), `run`. 22 reads the timeline lazily (it is pure; 30 loads after 2x in build order but is defined before any
  chart is built); extracting it into a sim module is back-burner.
- **Lane counts:** `gear.seatLanes = { bass: 4..5, rhythm: 4..6, lead: 4..6 }`; `C.SEAT_MAX_LANES = { drums: 6, bass: 5,
  rhythm: 6, lead: 6 }` (owner S2).
- **Tokens:** `{instrument} {gear} {sticks} {drummer} {yourPart} {seat}` in `career.fillText`; card gates `seat: [..]` and
  `swapped: '<memberId>'|true` (only when that member is the swapped drummer). `career.cardOk` checks both.
- **Balance:** `SEAT=bass|rhythm|lead|all BAND=all node tools/balance.js 6 10` (and 30 seeds). Target: every seat within
  ±10 % of the drum seat on fans@y3, fund@y3 and World reach for the same band (a seat is flavour, not a difficulty
  choice). Live gig bots per seat × difficulty: perfect = 100 %, avg within 3 points of drums.
- **Tests:** `tests/sim_seats.test.js` (swap table for 4 bands × 4 seats, migration, lineup, roles, chart = seat events after
  runs/thinning, lane ≤ max, holds/chords/runs judged, perfect bot 100 % on every seat × difficulty, determinism),
  `content_seats` (3 arcs + 12 finales valid, every swapped member has a bySeat layer + week-one card + epilogue variant),
  the strict seat leak scan (E8), `sim_audio` (seat voices on the grid, muted seat, holds gate), `pw_seats.js` sections
  `pick | write | gig | studio | shop | garage | stage` at 390×844 + `gig` at 440×956, no console errors. Every existing
  drum-seat test must stay green unchanged (drums is the regression baseline).
- **Size:** `dist/game.html` was 4.42 MB at v0.9; budget for Seats is an open popup (E14).

## E11. Roadmap change
- v1.0 "Glory" unchanged (build it first).
- **v1.1.0 "Seats"** = this addendum, one feature batch (contract `plan/plan_contract_1.1.md`, draft included; lanes A
  content, B sims + gig/songwriter/studio/shop UI, C render, D audio; lead owns the seat picker, shell, main, build).
  **Done when:** a full year can be played on a phone in every band × seat, every seat's first gig is winnable on Easy by a
  new player, the seat leak scan is clean, balance targets hold, and all existing tests stay green.
- **v1.2 "Tuning"** = Part D5 unchanged, now covering all four seats (the owner plays one year in each seat).

## E12. v1.0 forward-compat (so Glory isn't redone)
- Hall of Fame entries store `seat`; legacy score is seat-neutral.
- Achievements: add seat ones later in v1.1 (Low End: finish a career on bass; The Engine Room: on rhythm; Solo Too Long:
  a lead solo longer than the rest of the song; Musical Chairs: finish careers in all four seats). v1.0 seeds that say
  "drum" stay drum-gated.
- Epilogues: the player's epilogue line is per seat; swapped members need a drum-seat variant (Kenji: "a new drum kit
  arrives every Christmas").
- The v1.0 in-character tutorial must read `{instrument}` / `{drummer}` tokens instead of hard-coding the kit.

## E13. Not doing
- No switching seats mid-career. No vocals seat. No keyboard/fiddle seat (Clementine stays). No firing (locked).
- No mid-gig chaos events (locked A6). No share button (Part D).

## E14. Still open (ask with popups when you get there)
- Size budget for v1.1 (recommend 5.0 MB; the arcs + bySeat layers ≈ +0.3–0.4 MB).
- Exact gear names/prices per genre for lanes 5–6 and the run gear (propose in the contract; one popup).
- Body-shape lists for the guitar/bass creator (start with 3–4 per seat; add, don't shrink).
- Whether the seat picker shows a 3-second audio preview of each seat's part (cheap if the timeline is reused; ask).

# Part F — Addendum 4: "Soundcheck" (owner, 2026-10-03)

Written Saturday, October 3, 2026, from a design session that read the repo at `main` 1.1.0.0 (merge of PR #22). Locked
owner decisions unless marked open (F16). Same rules as always: cheap-game-build doctrine, Red Skies layout, questions as
popups, content as data, no USA content, no share button.

**TIMING — READ FIRST:** this is roadmap entry **v1.2.0 "Soundcheck"**. It starts now (1.1 is merged). **Tuning (Part D5)
moves from v1.2 to v1.3** so the playtest pass hears the final sound. When you receive this file: append it to
`plan/handoff.md` as Part F (the patch already does), record the decisions in `plan/status.md` (the patch already adds
"Addendum 4 — decisions" and an "Addendum 4 — pending" checklist), then finish the draft contract
`plan/plan_contract_1.2.md` at stage 0 (re-audit: line numbers here are from 1.1.0.0).

**Scope:** the owner's items 1–3 from the 2026-10-03 sound review: (1) the band plays like people (timing feel + velocity +
round robins), (2) instruments (drums, strings, amps, rooms, mix), (3) vocals. Item 4 (real recordings: phone-recorded
shouts, a sampled kit, DI guitar notes, a real cab IR) is **parked for later** (F15). Everything stays synthesized: Web
Audio nodes + plain seeded JS DSP rendered into AudioBuffers, exactly as the crowd and the v1.0 tap pre-renders already are.

## F1. Pitch
Today every hit is the same hit and every note lands dead on the grid, so even good synthesis reads as "a machine".
Soundcheck makes the band sound like four people in a room: a garage band that drags and rushes and hits unevenly, tightening
up as their skill grows into an arena band; drums with real accents, ghost notes and metallic cymbals; guitars and bass that
pluck and decay like strings through a real-sounding speaker; rooms with depth; and singers with breath, wobble and a proper
vocal chain. Your own taps get accents too: nail a Perfect on the downbeat and it lands hardest.

## F2. Locked owner decisions (popups 2026-10-03)
| # | Question | Answer |
|---|---|---|
| N1 | Roadmap slot | **v1.2 "Soundcheck"** now; **Tuning moves to v1.3** (the playtest hears the final sound). |
| N2 | How loose is the band? | **Driven by member skill.** An early garage band is sloppy and drags; by the arena years they're tight. Each genre has its own feel on top (punk rushes, rock lays back, metal locks in). |
| N3 | Your taps have no strength on a phone. Accents? | **Accuracy + beat position.** A Perfect on a downbeat lands hardest; an off-beat Good is softer; every hit also varies a little (round robins). |
| N4 | Should cheap gear still sound cheap? | **Yes: the upgrades raise the top end.** The milk crate kit stays thin and boxy; better tiers unlock the new realism; the arena kit sounds best. |
| N5 | Real recordings (sound review item 4) | **Later.** Not in 1.2; the code keeps hooks so they drop in (F15). |

## F3. Ground rules (every lane)
1. **Classic switch = the regression baseline.** `settings.audioClassic` (hidden; debug `GG.audio.classic(bool)`) bypasses
   every Soundcheck path. With it on, `renderOffline` output for the four genres must be bit-identical to 1.1.0.0 (hash the
   Float32 buffers). Like the drum seat in 1.1, this is how we prove nothing else moved.
2. **`A.timeline()` stays pure and unchanged.** The 1,212 `sim_audio` fingerprints must not move. Feel (timing + velocity)
   is applied in `player()` at schedule time, from a pure plan (`A.feelPlan`), never baked into the events.
3. **The gig clock is sacred.** `'step'` events (`audio:step`, the highway, stage visuals) are never shifted. No tempo drift
   anywhere. In a gig, the band's kick + snare move at most ±6 ms (the swapped drummer is the clock you play to), every other
   kind at most ±15 ms. Outside gigs (songwriter, radio, rival, seat preview) the clamp is ±25 ms. Any offset is also
   clamped to ≤ 25 % of a 16th at the song's tempo, so monophonic lanes keep their time order (chokes stay correct).
4. **Voice cap unchanged** (32, priority tap > drum > band > crowd > amb > sfx). New timbres must cost the same or fewer
   sources: rich sounds (metal cymbals, chords, strums) are pre-rendered into ONE buffer source each.
5. **No AudioWorklet.** Blob-module loading inside the Artifact host and old iOS is not worth the risk. Use native nodes +
   JS DSP into AudioBuffers, built off the main path in small slices (≤ 8 ms each), never mid-song (as `PRE` does today).
6. **Fallback is always the 1.1 sound.** If a buffer isn't ready, play the existing live recipe for that note/hit.
7. **Velocity reference.** `vel` is 0..1; `VEL_REF = 0.85` plays at today's level: gain × `(vel / 0.85) ^ 1.5`, capped at
   +2.5 dB. Missing `vel` (classic, old callers) = today's exact code path.
8. **Tier gating (N4):** every Soundcheck upgrade reads the kit tier `rig.tier` (`state.gear.quality`, 0 milk crate → 3
   arena) through one table, `A.realism(tier)` (F11). Tier 0 keeps today's recipes, apart from feel + velocity.

## F4. The band's feel (N2): timing + velocity, per player
**Who plays what.** Each event kind belongs to one band member this career (`career.lineup(state)` → `seatRole`):
`drum` → the drummer (you on the drum seat: your taps, no feel; the swapped drummer on a string seat), `bass` → bass,
`gtr` left / `gtr2` / `clean` → rhythm guitar, `gtr` right / `lead` / `twang` → lead guitar, `vox` → the singer, `bvox` →
the band's mean, `fiddle` → Clementine. Your seat's kinds are muted in gigs (your taps play them, F5). Missing member → skill 50.

**Tightness** `t = clamp((skill − 30) / 60, 0, 1)` per player (starters at 42–56 skill sit at t ≈ 0.2–0.45: audibly loose).
- **Timing spread** (ms, one standard deviation) = `lerp(12, 2.5, t) × genre.slop`.
- **Timing is correlated, not white noise.** Each player drifts: `off[n] = 0.7 × off[n−1] + N(0, spread × 0.71)` (an AR(1)
  wander). Real players lean ahead or behind for a few beats; per-note noise sounds like a broken clock.
- **Genre push** (mean offset in ms, scaled by `(1 − 0.5t)` so pros still have the genre's feel but less of it):

| genre | slop | drum kick | drum snare | hat/ride | bass | guitars | vox |
|---|---|---|---|---|---|---|---|
| metal | 0.6 | 0 | 0 | 0 | 0 | 0 | +4 |
| punk | 1.1 | −3 | −5 | −4 | −3 | −4 | −2 |
| rock | 1.0 | 0 | +7 (laid back) | +2 | +4 | +2 | +6 |
| country | 0.9 | 0 | +4 | +2 | +2 | +3 | +5 |

  Content data: `genres.js` → `backing.feel = { slop, push: { kick, snare, hat, bass, gtr, vox } }` (Lane F owns the key).
- **Velocity spread** (one SD) = `lerp(0.10, 0.03, t)` per hit.
- **Accent map** (16th step within the bar → base vel): step 0 → 1.0; 8 → 0.94; 4 / 12 → 0.9 (the snare's backbeat → 1.0);
  other 8ths → 0.8; 16ths → 0.66. Ghost / brush / rim variants: × 0.45. Bass + guitars follow the same map, flattened
  halfway (`0.5 + 0.5 × map`); palm-muted chugs flatten to 0.85 ± spread (metal chugs are even on purpose).
- **Section dynamics:** sparse × 0.86, full × 1.0, break × 1.04, solo backing × 0.9; the last bar before a section change
  ramps +0 → +8 % (the band leans into the change); the outro's ringing chord × 1.05.
- **Studio vs live:** the van radio and recorded songs use `t + 0.25` (studio takes are tighter); rivals use their own members'
  skill (`GG.rival.lineup(state)`, missing → 60) + 0.15 (they're seasoned) — F16 asks the owner to confirm both.
- **Determinism:** seeded by `songId | pass | event index | player` so `renderOffline` renders are reproducible.

API (pure, node-tested): `A.feelFor(state|null, genre, opts)` → `{ byKind: { kind: { t, spread, push, velSd } } }`;
`A.feelPlan(timeline, feel, seed, { gig })` → `{ dt: Float32Array, vel: Float32Array }` (one entry per timeline event;
`dt` in seconds, already clamped per F3.3; step events always 0). `player()` adds `dt[i]` to the scheduled time and passes
`vel[i]` to `schedule()` as `ev.vel` (a copied event; the timeline is never mutated).

## F5. Your hits (N3)
Every tap gets a `vel` from how well and where you hit:
- **Judgement:** perfect 1.0 · good 0.86 · fill 0.76 · stray (null) 0.62 · count-in noodling 0.7.
- **Beat position** (the judged note's 16th step): downbeat 1.0 · quarter 0.96 · snare backbeat 1.0 · 8th 0.9 · 16th 0.82.
- **Fast hat runs** (hat notes < 150 ms apart): alternate 1.0 / 0.84 (two hands).
- Random ± 0.03, then clamp 0.45..1. Strays use the last note's step.
- Drum seat: `GG.audio.hit(lane, when, { vel })`; string seats: `A.pluck / A.strum / A.lead(midi, when, { vel, .. })`.
  Auto-hat / auto-kick / the scheduled double's 2nd kick: 0.88 / 0.9 / 0.82 (a real double is a softer second stroke).
- The judgement already exists before the sound is booked (`55_ui_gig.js` `tap()` judges, then `playTap` / `playSeat`), so
  this costs nothing in latency.
- Round robins (F6) make two Perfects in a row still sound different.

## F6. Drums
Every lane gets a velocity-aware recipe and **round-robin variants**. Pre-rendered sets (the v1.0 `PRE` machinery, widened)
now serve **both your taps and the song's drum events** (the swapped drummer, songwriter playback, radio), one buffer source
per hit; the live recipe is the fallback. Velocity between layers: nearest layer + gain + a per-slot low-pass (pooled with
the lane's choke gain: brighter when harder, cutoff `lerp(0.55, 1, vel) × 16 kHz`).

| lane | 1.1 recipe | Soundcheck recipe (tiers per F11) |
|---|---|---|
| kick | 1 sine glide + noise click | sine body with pitch drop + a 2nd body mode (×1.52, −10 dB, half decay) + beater click (band-passed noise 2.5–5 kHz, level ∝ vel²) + arena sub tail (40–55 Hz, +3 dB). Pitch × `(1 + 0.03 (vel − 0.85))`. |
| snare | 1 triangle + high-passed noise | two head modes (≈ 185 and 330 Hz × snarePitch, the 2nd −6 dB) + **wires**: noise band-passed 1.8–7 kHz whose decay outlasts the head by 40 %, wire level follows head energy; vel > 0.92 on tier ≥ 2 adds a **rim shot** (a 900 Hz ring + more crack). Ghost / brush / rim keep their variants on the soft layer. |
| hat | high-passed noise | **metal cluster**: 6 square oscillators at the 808 ratios (≈ 205.3, 304.4, 369.6, 522.7, 540, 800 Hz × kit factor) summed → band-pass 10 kHz → high-pass 7 kHz, plus a little noise; closed decay as today. Band (not your taps) may open the hat on the "and" of 4 in `full` bars at tier ≥ 2 (choked by the next hat). |
| cymbal (crash) | high-passed noise + 5.2 kHz shimmer | metal cluster (6 squares, ratios jittered per round robin) through a high-pass whose cutoff sweeps down over 300 ms (the bloom) + a noise wash; longer decay on arena. |
| ride / china | noise ping + 1.18 kHz triangle | ride: 3 inharmonic bell partials (1, 2.32, 3.61 × f) + stick ping + soft wash; china: the cluster at lower ratios, mid-heavy, trashy. |
| toms | 1 sine glide | two modes (1 and 1.6 ×, the 2nd −9 dB, fast) + stick attack (short noise) + a slower pitch drop; floor tom longer. |

**Round robins:** each variant re-renders with pitch × (1 ± 0.012), decay × (1 ± 0.07), filter × (1 ± 0.04) and a different
noise start offset (a new segment of the shared noise buffer, so the hiss differs). Played in order with no repeats.

**Kit stereo:** kick + snare centre (± 0.05); hat, cymbal, toms and ride sit on the side of their highway column, × 0.5
(lefty mirrors), toms sweep across their three variants (high → floor). Tier 0 collapses widths × 0.3 (one cheap mic).

**Memory + time budget:** velocity layers only for kick, snare and toms; hat, cymbal and ride use 1 layer + gain + filter.
Pro: 4 RR × 2 layers ≈ 20 s of mono audio ≈ 3.8 MB; arena (3 layers) ≈ 5.1 MB. Hard cap **6 MB** per kit set. Build order:
one variant of every lane first (taps switch over as soon as that's done), then the rest. Build ≤ 2.5 s wall on a 4× CPU
throttle, slices ≤ 8 ms, never mid-song.

## F7. Strings: guitars and bass (Karplus-Strong)
Replace the oscillator notes (`metalNote`, `ampNote`, `playNote`'s bass / gtr / lead / twang / strum paths) with
**pre-rendered plucked-string buffers** played through the SAME envelopes (`gate` / `held` / `decay` / `sharedEnv`) and the
SAME amp chains. The envelopes keep the palm-mute gating and chokes; the buffer brings the pluck.

- **Algorithm** (pure JS, `src/32_audio_dsp.js`, `GG.dsp.pluck(o)` → Float32Array): extended Karplus-Strong. A noise burst
  excitation, low-passed by velocity (harder = brighter) and combed by **pick position** (`x[n] − x[n − βN]`, β 0.13 near the
  bridge for metal/punk, 0.2 rock, 0.27 neck for clean/country); a delay loop with a one-zero loop filter (brightness S) and
  decay stretch ρ set from the target T60; a **first-order all-pass for fractional delay so it's in tune** (plain KS is
  flat at high pitch; test ±3 cents from midi 28 to 88).
- **Articulations:** open (guitar T60 ≈ 2.5 s, bass 3 s), palm mute (excitation low-passed ~1.2 kHz, T60 0.12 s, 2 round
  robins: chugs are the most repeated notes), tremolo (short bright), ring/sag (the existing pitch sag via `playbackRate`).
- **Power chords = one buffer:** root + fifth + octave strings summed with 2–4 ms spread. The double-tracked L/R pair plays
  the same buffer at ± 5 cents (`playbackRate`) with the existing lag, so a power chord still costs one source per side.
- **Strums = one buffer:** country acoustic + rock `clean`: all strings mixed with 9–13 ms spacing, down or up order baked
  in, keyed by (shape, direction, vel layer). This *saves* sources (today: one oscillator per string).
- **Bass:** KS with a darker loop filter + a finger thump (low-passed noise, 6 ms) for rock/country, a pick click for
  punk/metal; the metal sub + grind split stays.
- **Lead + twang:** KS attack, then for holds longer than the buffer, loop whole periods of the tail (`loopStart/loopEnd`
  at an integer number of periods) so a held lead sustains under the amp's compression. Bends, slides and vibrato ride on
  `playbackRate`. The fiddle stays bowed (oscillator), with its existing vibrato and bow noise.
- **Cache:** sample rate 22,050 Hz for distorted guitars and bass (the cabs low-pass by 5–6.5 kHz anyway), 32,000 Hz for
  clean/acoustic/twang; LRU cap 8 MB per rig. `A.warm(pattern, opts)` → Promise renders the song's unique (kind, midi,
  articulation, layer) set from its timeline (pure) in slices; the gig calls it when the chart is built (before the
  count-in), the songwriter when a song opens, `play()` calls it without waiting. Typical song: 15–40 buffers, ≤ 300 ms
  total CPU spread over slices.

## F8. Amps and cabinets
- **Cab IR convolver** replaces the cab biquads in `metalRig` and `ampRig` (keep each pre-EQ and clipper; the clipper is the
  amp, the IR is the speaker + mic). One 1,024-sample (~21 ms) mono IR per genre, synthesized once (pure JS): low resonance
  peak, low-mid scoop, presence hump, 3–5 seeded narrow cone-breakup notches between 3 and 7 kHz, two steep low-passes, and a
  mic comb (the same impulse again 0.25–0.45 ms later at −8 dB: off-axis + back wall). Normalised; `normalize = false`.

| genre | cab | res. peak | presence | low-pass |
|---|---|---|---|---|
| metal | closed 4×12, tight | 95 Hz +4 dB | 2.4 kHz +3 dB, 600 Hz −4 dB scoop | 5.5 kHz |
| punk | 2×12, mid-forward | 110 Hz +2 dB | 1.6 kHz +4 dB | 5.0 kHz |
| rock | 4×12 "greenback" | 100 Hz +3 dB | 2.0 kHz +4 dB | 5.8 kHz |
| country | open-back 1×12 | 120 Hz +1 dB | 3.2 kHz +3 dB (the Tele sparkle) | 6.5 kHz |

- **Tier 0 band rigs (default, F16 confirms):** milk-crate careers play through a **1×8 practice amp IR** (boxy, honky
  900 Hz bump, low-pass 4 kHz); pawn shop a 1×12; pro + arena the genre cab above. The band's sound levels up with the gear.
- **Hook for item 4:** `backing.amp.ir` (base64 PCM16) overrides the synthesized IR when present (a real IR later, no code).
- Cost: two short convolvers per genre rig (L + R), built on first use like the amps today. Check `pw_perf`.

## F9. Rooms and the mix
- **Impulse v2** (`impulse(c, cls)` rewritten, still pure seeded JS): per-room **pre-delay** (dry 0, room 8, hall 18, theatre
  25, arena 40 ms), **early reflections** (8 taps inside the room's ER window: dry 15, room 30, hall 60, theatre 70, arena
  120 ms; falling gains, alternating channels, slightly different L/R times), then the late tail with **frequency-dependent
  decay** (the one-pole tone darkens over the tail: `tone × (1 − 0.6u)`, so highs die first), L/R decorrelated as now. Keep
  the hall/arena slap echo. Add a `plate` class (1.2 s, bright, dense, no ER) for vocals (F10).
- **Kick ducks the bass:** the scheduler knows every kick time, so the bass path gets a scheduled dip (−2 dB in 5 ms, back
  with a 50 ms time constant) on each kick: punch without a sidechain node. One `r.duck` gain on each bass path.
- **Drum parallel compression:** `busDrums` → a hard compressor (−32 dB, 8:1, 3 ms / 120 ms) → back into `glue` at
  0.15 / 0.25 / 0.35 by tier 1 / 2 / 3 (tier 0: none).
- **Vocal carve for every genre:** the guitars' presence band dips −3 dB while a vocal sings (metal keeps its −6).
- Re-balance wet levels and bus trims **by numbers** (F13): mean RMS per genre within ± 1 dB of 1.1, peaks under the ceiling.

## F10. Vocals
The shouts stay short hits on the beat grid (that doesn't change); they become far more human. Pure helpers live in
`src/33_audio_voice.js` (`GG.voice`), the wiring in `voxHit` / `metalVox`.
- **Glottal source** instead of a raw sawtooth: three PeriodicWaves per context (breathy, modal, belt) from the DFT of one
  Rosenberg pulse period, differentiated for lip radiation (48 harmonics). Open quotient: breathy 0.8, modal 0.6, belt 0.4
  (belt = brighter, pressed). Voice profile `vp.press` 0..1 picks / blends (punk yell + rock wail belt, country holler modal,
  ballads breathy). Metal keeps its driven buzz but starts from the belt wave.
- **Five formants** (F1–F5) instead of three, Q from real bandwidths (≈ 80, 90, 120, 130, 140 Hz → Q = F / BW), levels
  falling ~6 dB per formant; F4 ≈ 3,400, F5 ≈ 4,300 Hz × `vp.formant`. **Singer's ring** (`vp.ring`, dB): a 3 kHz peak for
  belters (rock wail, country holler). **F1 tracks pitch:** when f0 > 0.9 × F1, F1 rises to 1.1 × f0 (high notes don't thin out).
- **Breath that pulses:** aspiration noise (band-pass 2.5 kHz) through a gain whose AudioParam is driven by the glottal
  oscillator through a half-wave rectifier (noise bursts once per vocal-fold cycle, as in a real throat). Level from
  `vp.breath`. Reuses the hit's existing noise source (no extra source when consonants already need one).
- **Pitch that lives:** vibrato with onset 0.18–0.3 s (by note length), rate 5.2–6.2 Hz per note drifting ± 0.2 Hz, depth
  drifting ± 20 %; a slow 1/f wander of ± 8 cents under everything; cycle jitter stays (`jit`). **Shimmer:** a gentle
  random gain curve (3–6 % at 40–80 Hz) per hit.
- **Dynamics:** each hit takes its `vel` (F4, the singer's tightness) and held notes swell to + 10 % by 60 % of their length,
  then settle.
- **Doubles and gangs:** chorus lead vocals (non-metal) get a double when there's room (`fits(r, t, 1)`): + 8 cents, 18–28 ms
  late, its own 3-formant bank, panned ± 0.25. Metal held screams get the same double. Gang hits grow from 2 to 3 voices
  when there's room: offsets 0 / 14 / 27 ms, formant scales 0.92 / 1 / 1.08, pans −0.4 / 0 / 0.4.
- **Vocal chain** (built by `buildVox(r)`, called from `makeRig`): high-pass 100 Hz → compressor (−18 dB, 4:1, 5 / 120 ms) →
  presence + 3 dB at 3.2 kHz → air shelf + 2 dB at 10 kHz (not punk) → the band bus; sends: the `plate` (F9) and a
  **tempo-synced delay** (set per song from its bpm; feedback 0.25, low-passed 3.5 kHz in the loop).

| genre | plate send | delay | note |
|---|---|---|---|
| metal | 0.18 | — | double on held screams |
| punk | 0.08 | — | dry and in your face, no air shelf |
| rock | 0.20 | dotted 1/8, 0.15 | the '80s wail |
| country | 0.12 | 110 ms slapback, 0.2 | matches Earl's Tele |

- **Consonants (polish if time allows):** a short voiced murmur before b/d/g; more 5–8 kHz energy on s/z.
- **Expectation, said plainly:** this makes a convincing *synthesized* singer and much better shouts; real words that read as
  a person still need recordings (item 4).
- Perf: the plate is a second convolver per rig. If the frame governor has stepped the pixel ratio down to 1.0 (a slow phone), vocals use the room send instead.

## F11. Tier table: `A.realism(tier)` (N4)
| tier | drums | strings | rooms + mix |
|---|---|---|---|
| 0 milk crate | today's recipes + vel + 2 RR; noise cymbals (trashy) | KS on; 1×8 practice amp IR | impulse v2; no drum crush; kit width × 0.3 |
| 1 pawn shop | 2 vel layers, 3 RR; 3-partial metal hats/cymbals; 2 snare modes | 1×12 IR | crush 0.15; width × 0.6 |
| 2 pro | 2 layers, 4 RR; 6-partial metal; wires; rim shots | the genre cab | crush 0.25; full width |
| 3 arena | 3 layers (kick, snare, toms), 4 RR; longer cymbal bloom; sub kick | the genre cab | crush 0.35; full width |
Feel (F4), your tap accents (F5) and the vocals (F10) are tier-independent: the band and the singer aren't gear.

## F12. Build handoff (tech notes for the lead and lanes)
- **New modules** (build ORDER is by name, so they load after `30_audio.js`; 30 only touches them inside functions):
  `src/31_audio_feel.js` (`A.feelFor`, `A.feelPlan`, `A.tapVel`, the accent map — pure), `src/32_audio_dsp.js`
  (`GG.dsp`: `pluck`, `chord`, `strum`, `metal` cluster, JS biquad, `impulse2`, `cabIR` — pure), `src/33_audio_voice.js`
  (`GG.voice`: `glottalWaves(sr)` spectra, `vibCurve`, `wander`, `shimmer`, formant tables — pure).
- **`30_audio.js` regions by owner** (contract §2 lists functions): feel wiring in `player()` / `schedule()` / `A.hit` /
  `seatVoice` / `seatPlay`; instruments in `DRUMS` / `drumHit` / `PRE*` / `makeRig` / `setKit` / `ROOMS` / `impulse` /
  `setRoom` / `metalRig` / `ampRig` / `metalNote` / `ampNote` / `playNote` (non-vox); vocals in `VOWELS` .. `MVOX` /
  `voxCurve` / `addVib` / `metalVox` / `voxHit` + a new `buildVox(r)`. Stage 0 puts a one-line `buildVox` hook in `makeRig`.
- **Event contract:** every scheduled event may carry `ev.vel` (absent = 1.1 behaviour); `A.hit(lane, when, o)` and the seat
  voices accept `o.vel`. Timing offsets are applied by `player()` before `schedule()` (consumers never see `dt`).
- **Gig:** `55_ui_gig.js` `playTap` / `playSeat` compute `A.tapVel({ judgement, step, lane, prevHatT })`; `startAudio` passes
  `po.gig = true` (the tighter clamps) and calls `A.warm` when the chart is built.
- **Settings:** `settings.audioClassic` (hidden, default false) + `A.classic(bool)`; save migration none needed (missing =
  false). Debug `debug('audio')` += `feel` (per-kind t / spread / push, last plan stats), `realism` (tier row), `ks`
  (cache n / bytes / misses), `pre` (sets, RR, layers, bytes), `vox` (doubles, gang3, chain on).
- **Size:** + ~70–90 KB source; budget stays **5.0 MB** (1.1.0.0 is 4.56 MB).

## F13. Verification (numbers first, then ears)
- **Node:** `sim_feel.test.js` (determinism, clamps per F3.3 at 60–260 bpm, step events never move, AR(1) spread matches
  `t`, accent map, `tapVel` table), `sim_dsp.test.js` (KS tuning ± 3 cents midi 28–88 by autocorrelation, T60 within 15 %,
  no NaN/denormals, chord/strum buffers = sum of their strings, IR normalised, impulse v2 pre-delay/ER positions, metal
  cluster spectrum > 6 kHz), `sim_voice.test.js` (glottal spectra tilt per OQ, F1 tracking, vibrato onset). `sim_audio`
  fingerprints untouched.
- **Classic hash:** with `audioClassic` on, `renderOffline` of 4 genres × (full song, drums only, band only) hashes equal to
  1.1.0.0's (stored in `tests/fixtures/audio_v11_hashes.json`, written at stage 0 BEFORE any audio change).
- **Band-energy tables** (`pw_seq` `audio`): print the 5-band table (0–150, 150–500, 500–1.5k, 1.5–4k, 4k+ Hz) per genre,
  1.1 vs 1.2, into `plan/v12_audio_numbers.txt`. Targets: mean RMS ± 1 dB of 1.1; 4k+ band not up by more than 3 dB (no
  harshness on phone speakers); peaks ≤ the ceiling; stereo width per genre logged. Retune pw_seq thresholds only with
  the before/after numbers in the commit message.
- **"No two hits the same":** render 8 consecutive snare hits at equal vel: every pair differs (sample RMS diff > −40 dB).
  Same for chugs and the hat.
- **Perf** (`pw_perf`, 390×844 and 440×956, 4× CPU throttle): gig frame p95 ≤ 1.1 × 1.1.0.0; voice peak ≤ 32, tap drops 0;
  `PRE` build ≤ 2.5 s, KS warm ≤ 300 ms per song, no slice > 8 ms; scheduler pump p95 ≤ 2 ms.
- **Ears:** render four 15 s clips (one per genre, the band's first starter song, chorus → verse) as 1.1 and 1.2, encode
  `.m4a`, send to the owner, then a popup: ship / tweak (which genre). Plus one 8-hit "Perfect vs Good" tap demo.

## F14. Roadmap change
- **v1.2.0 "Soundcheck"** = this addendum, one feature batch (contract `plan/plan_contract_1.2.md`, draft included; lanes F
  feel, I instruments, V vocals; the lead owns stage 0, settings, the gig wiring merge, build, tuning by numbers, the review).
  **Done when:** every F13 check passes, classic hashes match 1.1, all existing tests are green (audio-number tests retuned
  with logged numbers), and the owner OKs the clips.
- **v1.3 "Tuning"** = Part D5 unchanged (all four seats), now played with the final sound.
- **Later (unscheduled): "Real recordings"** = sound review item 4 (F15).

## F15. Not doing (in 1.2)
- **Real recordings** (owner N5, later): phone-recorded shouts (3–4 takes per word, pitch-shifted ≤ ± 3 semitones), a
  sampled kit (3 velocity layers, AAC/m4a), DI guitar notes through the existing amps, a real cab IR. The hooks are ready:
  `backing.amp.ir`, the `PRE` set format (a lane's buffers can come from files), the KS cache key (a note's buffer can come
  from a sample).
- No AudioWorklet, no tempo drift, no new player-facing settings (Classic is hidden), no lyrics (vocals stay shouted hits).
- No change to charts, judging windows, the gig clock or `A.timeline()`.

## F16. Still open (ask with popups when you get there)
- Low mood makes the band sloppier (mood < 30 → spread × 1.25, a fight you can hear)? Recommend **yes** (it's funny).
- Studio takes (radio, recorded songs) tighter than live (`t + 0.25`), and rivals tighter than you (+ 0.15)? Recommend **yes**.
- Band amps follow the kit tier (milk crate = a 1×8 practice amp)? Recommend **yes** (F8 default).
- Show "Classic sound" in Settings for players, or keep it debug-only? Recommend **debug-only**.
