# v0.6.0 "Rivals" contract (2 agents in sequence: RIVAL sim+content, then RIVALUI screens+render+integration)

Read `plan/status.md` first (what exists, APIs, owner decisions). Shapes: `src/02_contracts.js` (new: C.SHOWDOWNS,
C.CRACKS, state rival/showdowns/finalShowdown, RIVAL, SHOWDOWN). SAVE_SCHEMA is 6 (a v5→v6 migration is needed — one
node test fails until it lands). VERSION 0.6.0.0 is set. Design: handoff A11 (rivals), A3 (Tundra Wraith), A6 (gigs),
A9 (poaching), A14 (Loonies).

**Done when:** Tundra Wraith runs a parallel career you can see on a scene leaderboard; rivalry heat climbs with every
clash and drives more showdowns; every showdown type works on a phone (Battle of the Bands with the rival's set watched
first, same-night gigs splitting the crowd, stolen board slots, Loonie categories, poaching your unhappy members,
festival clashes where you outplay them from a lower slot); beating them enough makes them crack comedically; the
year-10 Sad Dome co-bill decides who headlines and who opens forever; bots handle all of it; every earlier test stays green.

## Owner decisions (locked)
- Tundra Wraith (Winnipeg): corpse paint on stage; off stage unbearably polite accountants. Frontman **Gord "Grimnir"
  Penner** — chartered accountant, minivan with a Winnipeg Jets bumper sticker, screams about eternal winter, brings a
  veggie tray to every show, calls you "buddy", sends fruit baskets, wins every award you're up for and thanks you
  personally. Plus **3 more polite accountants** (guitar, bass, drums) with their own gags and looks.
- Other rivals (Mall Rats, Chartbusters, Buckle & Boot) get members in v0.9 — don't design them now.
- **Final showdown = Sad Dome co-bill** (Calgary, year 10): a head-to-head set decides who headlines and who opens,
  forever; store the result for v1.0's endings.
- A turned-down original (v0.4 `rivalDefectors`) joins Tundra Wraith's lineup and shows up on their stage.

## Stage 1 — Agent RIVAL (sim + content)
Owns: `src/23_sim_rival.js` (rival career, heat, showdown scheduling/resolution, cracking, final showdown, leaderboard),
hooks in `src/20_sim_career.js`, `src/24_sim_labels.js` (replace `labels.rivalStrength` with the rival sim), 
`src/26_sim_world.js` (stolen slots, same-night gigs, festival listings), `src/27_sim_drama.js` (poaching an unhappy
member: stage ≥ 2 → a poach card), `src/22_sim_gig.js` (Battle of the Bands scoring: rival set score vs yours; crowd split),
the migration (chain onto `GG.save.migrate`), new `src/content/rivals.js` (Tundra Wraith members + looks with corpse
paint flag, news lines, BotB/poach/crack/final cards, scene filler bands for the leaderboard, festival venues), 
`src/content/bands.js` (only the tundra_wraith rival entry), `src/content/economy.js` (rival tunables),
`tools/balance.js`, `tests/sim_rival.test.js` (new) + fixes to existing tests if needed.
- Rival career: fans/buzz/era/albums on their own (deterministic per career seed, independent of your RNG draws),
  paced so they're slightly ahead early (they're more organized) and catchable; their albums hit the Maple 100 and
  compete at the Loonies.
- Heat 0..100: +on every clash (showdowns, same-night, stolen slot, Loonie category, poach attempt), slow decay; higher
  heat → more showdowns and more buzz for both.
- Showdowns and their gates/frequency (all in economy tunables): BotB (prize money, fans stolen from the loser; rival
  set score from their strength + rng; you play live), same-night gigs (crowd splits on buzz), stolen slots (a board
  listing gets taken; a news line), Loonie categories (rival nominee), poaching (a card offering your unhappy member a
  spot — keep them with a concession or they defect to the rival), festival clashes (a local festival listing where
  you're on a lower slot; outplay their score for a bonus).
- Cracking: after enough net wins (and heat), they crack: breakup, awkward rebrand (new name, same accountants), or ask
  to open for you. Heat and news change accordingly; the rival can still appear in a cracked form.
- Final showdown: year 10 (week ~20–22, before the career end), a Sad Dome co-bill head-to-head; `finalShowdown` stored.
- API `GG.rival.*` (list it in the module header): weekly(state, rng), leaderboard(state), heat, schedule/next showdown,
  showdown(state, kind) → setup data for the UI (their setlist + members + expected score), resolve(state, kind, yourScore)
  → SHOWDOWN, poach flows, crack, final, bots. Events: 'rival:news', 'heat:changed', 'showdown:scheduled',
  'showdown:done', 'rival:cracked', 'rival:poach', 'final:done'.
- Tests: deterministic rival career; heat math; each showdown type resolves; BotB prize/fans swing; same-night split;
  stolen slot; poach keep/defect; crack triggers; final showdown in year 10; migration v5→v6; defectors in lineup.
- Balance: `node tools/balance.js 10 20` before/after — a good bot usually beats them over a career, an avg bot roughly
  trades wins; showdowns ~3–6 per year at mid heat; no stat explosions; earlier targets hold.
- Finish with a report (< 40 lines): exact API, events, state fields, what the UI must wire, contract additions.

## Stage 2 — Agent RIVALUI (screens + render + integration)
Owns: new `src/59d_ui_rival.js` (Scene leaderboard + heat meter + rival news in a laptop tab via `53_ui_laptop.js`;
showdown announcement cards; BotB flow: watch the rival's set first — a spectator view of the stage with their lineup in
corpse paint and a ticking score, skippable — then your live set via the v0.3 gig flow, then the crowd verdict; same-night
split notice; stolen-slot badges on the board (`56_ui_board.js`); poach card flow; crack moments; the Sad Dome final),
`src/42_render_stage.js` (rival lineup support: members from `GG.rival` with corpse paint, a crowd-facing spectator
camera), hooks in `52_ui_week.js` / `60_main.js` / `55_ui_gig.js` as needed, shell CSS (a marked v0.6 block),
`tests/pw_rival.js` (new: META_ONLY=scene|botb|final), and updates to existing Playwright flows if the new events need
handling (autoplay flows must stay fast — skip spectator views when `GG.ui.gigAutoplay` is set).
- Run ALL suites (node; pw_flow flow/year/code/layout; pw_garage; pw_seq; pw_gig gig/e2e; pw_world; pw_stage; pw_drama;
  pw_label; pw_rival), make one 390×844 contact sheet `tests/.cache/v06_sheet.png` (scene tab, showdown card, rival set
  spectator view, your set, verdict, final), look once, fix, report (< 35 lines).
