# Garage to Glory: design as built

This describes the game as it exists in the code at version 1.6.0.0 "Showtime". The original design
document and its addenda are `plan/handoff.md` (Parts A to F). Where this file and the handoff
differ, this file describes what shipped; `plan/status.md` records why.

Counts below were read from the data files with `tests/_load.js`, not estimated.

## The pitch

You started the band. Steer it through a ten-year career, from a rehearsal space in Saskatchewan or
Alberta to arenas around the world, or to a breakup in a parking lot. Comedic, Spinal Tap energy. Real
Canadian cities, parody names for bands, venues, labels, festivals, magazines and awards. No USA content.

## Locked foundations

| Call | As built |
|---|---|
| You are | The founder. You never quit and cannot fire anyone. Since v1.1 you pick a seat: drums, bass, rhythm guitar or lead guitar; the member whose seat you take moves to the kit. The seat is fixed for the career. |
| Look | Low-poly 3D rooms and stages (three.js), phone-first, portrait. A PC layout and keyboard controls were added in v1.5; phones are unchanged. A 2D fallback garage exists for devices without WebGL. |
| Gigs | A rhythm game: a top-to-bottom note highway under the 3D stage, 4 to 6 lanes on drums, up to 5 on bass, 6 on guitar. |
| Genre | Picked at the start: Metal, Punk, Rock, Country. Each genre is one hand-made band with its own rival, start space and cards. |
| Time | Week-by-week turns, 24 weeks a year, 10 years (240 weeks). Reaching the World era early adds bonus years: by week 120 +3 years, by week 144 +2 (`C.BONUS`). |
| Tone | Comedic. Burning vans, a moose concept album, a cape. |
| Cast | Every band member and rival is hand-made (14 hand-made members across the four bands, plus you). Random recruits fill holes when someone quits. |
| World | Canada first (four map rings), then UK & Europe, Japan, Australia, Russia. |
| Saves | Autosave at every week wrap plus 3 manual slots, save between songs in a gig, copy-paste save codes. |
| Money | One shared band fund. "Pay the band" sets the members' cut (default 30%). Broke means borrowing from your parents, with guilt cards. |
| Run length | Always ends at the final year (10, 12 or 13). Never a game over. |
| Difficulty | Career difficulty Chill / Normal / Brutal, locked per career (`economy.difficulty`). Gig difficulty Easy / Normal / Hard / Expert, changeable in Settings, plus No fail and Auto-kick assists. |

## The bands

| Genre | Band | Home | Start space | Rival |
|---|---|---|---|---|
| Metal | Hail Damage | Saskatoon | Your parents' garage | Tundra Wraith |
| Punk | Frost Heave | Regina | The basement under the Suds-O-Rama | Mall Rats |
| Rock | Gravel Kings | Edmonton | Unit 4B, Westgate Plaza | Chartbusters |
| Country | The Grid Road Ramblers | Swift Current | Duke's uncle's Quonset | Buckle & Boot |

Hail Damage and the Ramblers have 4 hand-made members (a five-piece with you); Frost Heave and the
Gravel Kings have 3. Each band has a seat-swap table (`bands.<id>.seats`): who moves to the drums when
you take their instrument, and who sings from the kit.

## The weekly loop (one turn = one week)

1. **Monday card.** Most weeks a short scene with 2 or 3 choices and hints for what each does.
   534 Monday cards in `cards.js` (drama 144, money 116, scene 104, fame 87, weird 70, road 13) in 11
   storyline chains, plus 74 drama cards, 44 Bandbook cards, 45 world-era cards, 20 bonus-year cards,
   32 shop cards, 6 licensing cards and 53 studio events. Cards are gated by era, genre, region, seat,
   flags and year.
2. **Plan the week** on the whiteboard in the 3D garage: three blocks (Tue night, Thu night, Weekend).
   Activities: Rehearse, Write (opens the songwriter), Promote, Book (the gig board), Hustle, Rest.
   Studio weeks and tour weeks replace the blocks.
3. **Weekend gig** if booked: van scene (skippable) with road cards, setlist sheet, the rhythm game,
   results. Since v1.3.1 any regular gig can be simulated at your own recent average instead of played;
   story shows (rival showdowns, festivals, the final) must be played.
4. **Week wrap:** fund, fans, buzz, chemistry, moods, group chat, milestones. Autosave.

Stats: fund, fans (one permanent count, split into super / casual / hater shares), buzz (decays),
chemistry, burnout, per-member skill and mood, your drum skill (widens the timing window on every
seat), the song catalog (stale when overplayed, classics after 4 great gigs), van condition and space,
rivalry heat.

## Screens

Title (3D garage in a hailstorm, Hall of Fame, Restore code, Settings) > slots > genre > intro > seat >
logo > character creator > cold open. In play: the garage hub with hotspots (whiteboard, kit or rig,
gig board, laptop, merch, trophies, door, Gear shop label) and a HUD; the card sheet; the planner;
the songwriter (Quick song and the editor); the gig board with the Canada map; the van and road
cards; the setlist sheet; the live gig and its results; the week wrap; the laptop with ten tabs (Chat,
Bandbook, Band, Money, Label, Albums, Scene, World, Years, Trophies); label offers, deals and demands;
studio booking, sessions and releases; album, chart, certification and review sheets; the Loonie
Awards red carpet; rival showdowns and verdicts; the world map, regions, flights, tour packages and
payoffs; the Global Gong; the gear and merch shops; the year recap; the ending sequence; the Hall of
Fame; the tutorial lessons; Settings (play, audio, look and feel, keys, calibration, practice).

## Songwriting

- A step sequencer: lanes top-to-bottom like the highway, 16 steps per bar, 4 bars per section.
  Kit lanes kick, snare, hat, cymbal, plus toms and ride once bought. A double kick pedal lets the
  kick hit every step; two fast kicks become one highway note.
- Sections verse, chorus and bridge, plus Outro and Solo when bought. Tempo slider within the genre's
  range. Genre grooves and 6 presets seed a pattern.
- v1.3 "Songwriter": Quick song first (5 recipes per genre, 20 in all, plus Surprise me), then tweak
  with sliders: Energy, Mood (5 rungs), Feel (straight to shuffle), Fills & surprises, Tempo. Per-bar
  chord chips on string seats, a chord sheet, and rows for your own part (bass, rhythm or lead).
- Ratings: Groove (genre fit), Hook (chorus against verse) and Difficulty. Song quality combines the
  band's part with craft minus any difficulty the band cannot play cleanly (`economy.songs`).
- 190 song titles across the four genres. Hail Damage's songs get English titles, still secretly about
  Marcel's lawn; now and then Marcel sneaks in a French one (owner decision 2026-09-30).

## Gigs: the rhythm game

- Charts are your songs, section by section, thinned by gig difficulty; the two-thumb rule caps every
  moment at two judged notes. String seats get taps, holds, 2-lane chords and runs by pitch contour.
- Judgement Perfect / Good / Miss. Windows at drum skill 10: Perfect 60 ms, Good 130 ms, each widening
  a little per skill point (clamped 50 to 100 ms and 115 to 190 ms) and scaled by the gig difficulty.
  A note counts as a miss 80 ms after its Good window closes (`LIVE` in `22_sim_gig.js`).
- Note score is 100 x quality^1.5, a Good worth 0.65 of a Perfect. The crowd meter starts from the
  venue, fit and buzz; Perfect +1.2, Good +0.5, Miss -2.4, stray tap -0.35, scaled by note density and
  cooling 3% a second. A running combo warms the room on every seat (v1.4). Combos every 25 add a
  bonus; opener and closer bonuses; a classic earns a cheer.
- Crowd moments per genre at high crowd (metal mosh / headbang / wall of death, punk pogo / gang shout /
  circle pit, rock fist pump / sing-along / lighters, country clap-along / yeehaw / line dance). Band
  signature moves (Marcel's cape spin) and solo and fill windows.
- Grades S 80, A 65, B 50, C 35, D below. New fans = crowd x conversion by grade x genre fit x
  exposure bonus x local-scene headroom. Pay x1.25 on an S and x1.1 on an A until the band signs.
- Results show pay, the band's cut, gas and what else went into the fund; merch sells after the show.
- v1.6 "Showtime": an animation layer on the highway (sparks, shockwaves, cracked misses, pulsing gems,
  scrolling texture, combo fire at x10 / x25 / x50). Visual only. Settings "Less motion" turns it down;
  Low graphics or a slow frame rate falls back to calm automatically.
- Keyboard play (v1.5): rebindable keys, defaults Space kick / D snare / F hats / S crash / Shift toms /
  A ride on drums and A S D F (+ Space, Shift) on strings, same windows as touch, with its own
  calibration.

## Venues, travel and the world

- 106 Canadian venues with a quirk each, in 36 cities on four map rings (Saskatchewan, Alberta, West,
  East and North). Tiers 1 (43 venues: houses, open mics, skate parks, Legions, bingo and curling
  halls, churches), 2 (48: bars and clubs), 3 (15: theatres). Three pay deals: exposure, flat, door.
  Venue reputation rises and falls; bomb badly and you are banned.
- Van: condition, space and comfort; tiers minivan, 15-passenger, sprinter, bus; van names per band, 7
  upgrades, stickers from every venue played. Each band has its own driver (Kenji drives Hail Damage's
  van, silently, every trip).
- World (v0.7): four regions (UK & Europe, Japan, Australia, Russia) with 44 venues, 21 preset tour
  packages, flights and rentals, homesickness, 14 regional holidays, invites, "big in one place"
  storylines and the Global Gong award.

## Members, drama and recruits

- Moods move with pay, burnout, band success and personal wants. Escalation: grumbling, group chat,
  ultimatum card, quit. The garage era is protected until 250 fans.
- A quit leaves a hole, a paid fill-in or a recruit: three candidate cards with chemistry shown, from
  genre-flavoured name pools, 9 traits and 24 quirks. A turned-down original can join your rival.
- Three seat storyline arcs (Nobody Hears the Bass, The Engine Room, Solo Too Long) plus 12 band
  finales for the swapped drummers.

## Labels, albums, reviews, awards

- Labels: Gopherwood Records (indie), Monolith Records (major), Do It Yourself; three more rival-only
  labels in `labels.js`. Recoupable advances, album counts, deadlines, drops. 4 studios, 6 producers,
  EPs then albums, drum takes by skill or played yourself, tracklist, lead single, generated or typed
  titles. 5 review outlets (Rolling Scone, Proclaim!, Pitchspork, Deci-Hell, Tailgate Weekly) with pull
  quotes. Maple 100 chart, streams, gold (40,000) and platinum (80,000).
- Loonie Awards once a year (week 20): Breakthrough, Album, Single, Best Live Act, Fan Choice, Worst Van.
  Red carpet scene, outfit cards, speech choices, the rival's thank-you when they beat you.
- Rivals (v0.6): a parallel career on the scene leaderboard, heat, seven showdown kinds (Battle of the
  Bands with their set watched first, same night, stolen slot, festival, Loonies, poaching, the final).
  A beaten rival cracks (breakup, rebrand, or they open for you). The Sad Dome showdown sits in week 21
  of the career's last year.

## Money, shop, merch, licensing, logo

- Start fund $450 (`economy.startFund`); upkeep, gas, rent after the garage ($35 a week, $60 once
  signed), gear, studio time, stock, fill-ins, flights. Early help: cheaper gas until signed, fading
  over 12 weeks after (v1.4).
- Shop: 4 kit quality tiers (milk crate, pawn shop, pro, arena), 3 gear items (lanes, pedal) renamed
  per seat, 2 extra sections, 4 spaces with 16 upgrades, van tiers and upgrades, 23 merch items in 4
  tiers. Unsold boxes pile up in the garage; a misprint can become a collector's item.
- Licensing offers from 8 parody brands: take, decline or counter, with scandals.
- Band logo: 19 emblems, 4 styles, 20 palettes; shown on merch, in the Hall of Fame and as a
  sticker option on your gear.
- Year recap at week 24 (a Rolling Scone front page), feeding the Hall of Fame's year strip.

## Endings, Legacy, meta

- Legacy score 0 to 1000 from seven parts: fans (max 250), album units (200), awards (150), biggest
  venue headlined (100), regions broken (25 each, 100), band unity (100), the final showdown (you 100,
  the rival 40). Tiers by score only: Arena Legends 800, Canadian Institution 600, Cult Heroes 400,
  One-Album Wonders 200, Still in the Garage.
- 8 special endings stack on the tier: Big in Japan, Moose Opera, Big in Berlin, Mudstonbury Legends,
  Outback Legends, Band of Strangers, The Original Lineup, Side Project. Epilogue cards per member and
  for you by seat; a rival line; a summary of unlocks and trophies.
- 40 achievements plus 4 seat achievements, per career and across careers (laptop Trophies tab).
- Hall of Fame: logo, lineup, ending, years, score, difficulty badge, seat, trophies, yearly headlines;
  cap 40 entries, the top 10 never dropped. Meta unlocks are looks only (palettes, emblems, creator
  parts).
- Tutorial: 12 lessons taught in character (full week 1, light weeks 2 to 4, "a good year"); skippable
  once any career passed week 4; "?" replays a lesson.

## Audio

Everything is synthesized in Web Audio (drums by velocity with round robins, Karplus-Strong guitars and
bass through cab impulse responses by kit tier, rooms, synthesized vocals with formants and gangs),
except the TMKD "Vortex" sampled metal kit at the pro and arena tiers. The band's timing and accents
follow member skill and a feel per genre (v1.2). Your taps get velocity from judgement and beat
position. Nothing moves the gig clock: step events never shift.

## Save system

- `localStorage` keys `gg.v1.slot.auto`, `gg.v1.slot.1..3`, `gg.v1.settings`, `gg.v1.hof`, `gg.v1.meta`.
  Every access is wrapped; without storage the game runs from memory and warns.
- A slot record is `{ savedAt, version, summary, state }`. Past 150,000 characters it is stored as
  `LZ1:<header length>:<header JSON><LZW body>` so the slot list never decompresses a whole career.
- Save codes: `GG1:` + base64url(LZW(UTF-8 JSON)) + a 6-character checksum. Menu > Back up / Restore;
  the title screen has Restore code; the Hall of Fame has its own backup code. A career code carries a
  lite Hall of Fame (`_meta`) and stays under 135,000 characters by carrying fewer entries when needed.
  Readers tolerate spaces, line breaks and text around the code.
- `C.SAVE_SCHEMA` is 10. Migrations in `10_save.js` fill missing fields; every version since 1.0 added
  optional keys only, so saves from 0.9 onward load (fixtures in `tests/fixtures/`).
- Settings store only keys the player changed; defaults live in `10_save.js` `DEFAULT_SETTINGS`.

## Content scale (from the data)

4 bands, 14 hand-made members, 4 rivals with 7 showdown kinds; 534 Monday cards in 11 chains, 74
drama, 102 road, 53 studio, 45 world, 44 Bandbook, 32 shop, 20 bonus-year and 6 licensing cards; 106
Canadian venues in 36 cities, 44 overseas venues, 21 tour packages; 6 labels (3 playable), 4 studios,
6 producers, 5 outlets, 6 Loonie categories; 190 song titles, 6 presets, 20 recipes; 159 creator
parts; 23 merch items, 16 space upgrades; 19 emblems, 20 palettes; 40 + 4 achievements, 12 lessons,
5 ending tiers, 8 specials; 103 source modules build a 5,378,879-byte `dist/game.html`.

## Not built yet, or still open

Only things a plan document promises and the code does not have, or that the plan lists as open.

- **Per-chord thirds and slider-song career balance** (`plan/v13_integration_report.md` section 8,
  carried in `plan/status.md` "Version"): still open.
- **v1.4 owner playtest patches** (`plan/handoff.md` D5, `plan/status.md` Addendum 7 "Next"): Kelbo
  plays years 1 to 3 on drums, then 3 to 6, and reports; each report becomes a numbered v1.4.x item.
  No reports yet.
- **Real recordings** (`plan/handoff.md` F15): phone-recorded shouts, a fully sampled kit, DI guitar
  notes. Deferred by the owner (N5); the hooks exist, only the TMKD metal kit shipped.
- **Size budget** (`plan/status.md` "Version"): `dist/game.html` is about 92 KB over the v1.5 soft
  budget; the plan's hard ceiling is 6.0 MB.
- **Back-burner polish** (`plan/status_archive.md` "Back-burner"): the title scene is Hail Damage's
  garage for every band; Marcel's mirror has no reflection; restoring a save code keeps the code's
  slot and the next autosave overwrites it without asking; several render and audio notes from v0.9.
- **Owner housekeeping** (`plan/status.md` leftovers): old `wip-*` branches on GitHub were to be
  deleted by the owner. Unverified from this clone.
- **Not doing** (locked, `plan/handoff.md` E13, A6): no seat switching mid-career, no vocals or
  keyboard seat, no firing, no mid-gig chaos events, no share button, no USA content.
