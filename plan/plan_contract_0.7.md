# v0.7.0 "World" contract (2 agents in sequence: WORLDSIM sim+content, then WORLDUI screens+render+integration)

Read `plan/status.md` first (APIs, owner decisions incl. Addendum 1 and v0.6.2). Design: handoff **A12** (international
touring), A10 (Abbot Lane Studios, genre-region fit), A14 (Global Gong), **Part C6** (world regions + cities), C7 (overseas
seasons), C5 (the Japanese fan-club president). VERSION 0.7.0.0 and SAVE_SCHEMA 8 are set by the lead (a v7→v8 migration
is needed). Earlier suites must stay green. No USA content, ever.

**Done when:** the World Stage era turns on at the Steady-pace threshold (v0.5 defined it; `economy.eras.worldEnabled`),
the four regions unlock by fan threshold OR an invite (festival slot / showcase), a preset tour package can be bought and
played end to end on a phone (flights → rental vehicle → back-to-back weekend gigs on regional maps → festival → home),
the Global Gong is awarded, "big in one place" and the Moose Opera payoff work, and bots can tour in node tests.

## Owner decisions (locked)
- Regions + cities (C6): **UK & Europe** — London, Manchester, Glasgow, Dublin, Paris, Amsterdam, Berlin, Prague, Madrid,
  Oslo, Stockholm, Helsinki (Mudstonbury in the English countryside; Wackelstein Open Air in northern Germany; Helsinki
  hosts the Moose Opera ending). **Japan** — Tokyo (Budokhan Hall), Osaka, Nagoya, Kyoto, Sendai, Sapporo, Fukuoka,
  Hiroshima. **Australia** — Sydney (Big Day Inn), Melbourne, Brisbane, Adelaide, Perth, Hobart, Darwin, Alice Springs.
  **Russia** — Moscow, St. Petersburg, Kazan, Yekaterinburg, Novosibirsk, Irkutsk (Siberian Frostfest by Lake Baikal, in
  January), Vladivostok.
- A12: a region unlocks at a fan threshold **or** an invite, whichever first; genre fit shifts thresholds (metal huge in
  Japan & Europe, strong in Russia; punk loves the UK, Australia solid; rock big in UK/Europe/Australia; country huge in
  Australia, decent in the UK, cult in Japan). **Preset tour packages with a few choices** per region (not free routing).
  Flights, rental vehicle, hotels come out of the fund; on tour, weekday blocks shrink to rest / promote locally /
  hotel-room rehearsal; homesickness and burnout build; members call home in the group chat. Overseas you fly and rent
  something local (tiny European van, band packed like sardines). Region card flavour: UK (rain, pub gigs, promoter pays
  in drink tickets); Europe (tiny van, festival mud, Dana lost in gear shops); Japan (polite silent crowds until the song
  ends, fan gifts); Australia (vast drives, spider in the kick drum); Russia (festival at minus 40 the band is unimpressed
  by, bus breakdown in the taiga); France loves Marcel. "Big in one place": a song can blow up in a single region →
  storyline. The rival may break a region first. One international award: the **Global Gong** (World stage only; keep the
  name — the owner only banned an actual gong on the drum kit).
- C7: overseas seasons — Australia reversed (a Canadian winter is Aussie summer festival season, a deliberate touring
  strategy); Japan cherry blossom season + summer festivals; Russia brutal winters, bright St. Petersburg summer nights.
- C5: the **president of your Japanese fan club** appears once Japan is reached (crowd, comments, gifts, cards).
- Moose Opera: if `flags.mooseAlbum` (v0.5 chain) is 'ready'/'finland', the moose concept album can go platinum in
  Finland → Helsinki payoff (feeds the v1.0 "Moose Opera" special ending). Abbot Lane Studios (London) unlocks in World.

## Stage 1 — Agent WORLDSIM (sim + content)
Owns: new `src/25_sim_tour.js` (currently a stub: regions, unlocks, invites, tour packages, on-tour week flow, costs,
homesickness, "big in one place", the rival breaking regions, Global Gong), hooks in `20_sim_career.js`, `24_sim_labels.js`
(world era on, Abbot Lane, regional chart/fans, the Global Gong at the Loonies week or its own week), `26_sim_world.js`
(regional listings on tour), `28_sim_calendar.js` (regional seasons/weather/holidays), `23_sim_rival.js` (rival tours),
`29_sim_fans.js` (the Japanese fan-club president, region fan shares), `22_sim_gig.js` (region crowd behaviour: Japan
silent until the song ends — a scoring/crowd-meter quirk), new `src/content/world.js` (regions, cities with x/y on
stylized regional maps, festivals, venues per city, tour packages with choices, region cards, rental vehicles, flights),
`content/cards.js` / `road_cards.js` (region cards), `content/economy.js`, the v7→v8 migration, bots (botTour),
`tools/balance.js`, tests (new `sim_tour.test.js`, plus content/others as needed).
- Balance (Steady): the good bot reaches World ≈ year 5, the avg bot ≈ year 6–7; tours cost real money but pay back
  with festival slots/merch-free fans; homesickness forces rests; earlier targets hold; no stat explosions.
- Report (< 45 lines): exact API (`GG.tour.*`), events, state fields, the step-by-step UI flow the next agent must wire.

## Stage 2 — Agent WORLDUI (screens + render + integration)
Owns: new `src/5i_ui_tour.js` (world map with the four regions + lock state/thresholds/invites; region maps with city
pins; tour package picker with its choices + costs; on-tour planner (shrunk blocks); flight/arrival moments; homesick
group-chat; region cards via the Monday-card screen; Global Gong ceremony reusing the v0.5 awards/red-carpet screens;
the Moose Opera moment), `56_ui_board.js` (on-tour board = the region's listings), `57_ui_van.js` + `43_render_van.js`
(rental vehicles: tiny European van packed like sardines, Australian road-train-sized distances, Russian bus; regional
scenery: hedgerows/castles, neon Tokyo streets, red outback, birch taiga + snow), `42_render_stage.js` (festival dressing:
mud + big stage for Mudstonbury/Wackelstein, Budokhan hall, Big Day Inn, Siberian Frostfest snow stage; polite Japanese
crowd that bows/claps between songs), `52_ui_week.js` / `60_main.js` / `53_ui_laptop.js` hooks, shell CSS (a marked v0.7
block), tests (new `pw_tour.js`: META_ONLY=map|tour|gong), updates to existing flows if needed.
- Run ALL suites (node + every pw_* section at 390×844, plus flow/e2e/touch at 440×956 via a scratch viewport override),
  one contact sheet `tests/.cache/v07_sheet.png` (world map, region map, tour package, on-tour van abroad, a festival
  stage, Japanese crowd, Global Gong, Moose Opera), look once, fix, update `plan/status.md` (What's in v0.7, APIs, tick
  the v0.7 Addendum items), report (< 35 lines).
