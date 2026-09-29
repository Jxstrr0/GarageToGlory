# v0.1.0 "Garage" batch contract

Source of truth for shapes: `src/02_contracts.js` (state, content schemas, events, commands). This doc adds
file ownership, the v0.1 specifics each piece must provide, and the isolation rule.

**Done when (whole batch):** a full year can be played on a phone (390×844), saved, reloaded, with no console
errors, and `node tools/balance.js` runs a bot year.

## Isolation rule (every agent)
1. `cp -r /home/user/GarageToGlory <your scratch dir>/<agent>` and work ONLY in that copy.
2. Build and test there (`node build.js`, `node tests/run.js`, Playwright via `tests/_pw.js`).
3. When done, copy back ONLY the files you own (below) into `/home/user/GarageToGlory/`. Never touch other files
   in the main repo, never run git commands in the main repo, never publish, never push.
4. Need a contract change (new constant, event, state field)? Don't edit `01_ns.js`/`02_contracts.js`.
   Define it locally in your module and list it under "contract additions" in your final report; the lead folds it in.
5. Final report (short): APIs as built, tests + results (paste the ALL PASS lines), what the lead must wire,
   contract additions, known gaps.

## Lead-owned (do not edit)
`build.js`, `VERSION`, `src/01_ns.js`, `src/02_contracts.js`, `tests/_load.js`, `tests/_t.js`, `tests/_pw.js`,
`tests/run.js`, `plan/*`, `README.md`.

Helpers you can use: `GG.on/emit/once`, `GG.RNG(seed)`, `GG.rngFor(state)` (RNG stored in `state.rng`),
`GG.hashSeed(str)`, `GG.util.{clamp,clone,fmtMoney,signed,fmtNum}`, `GG.registerDebug(name, fn)`, `GG.debug()`.
Node tests: `const GG = require('./_load')({ localStorage: require('./_load').fakeStorage() })` loads
01/02/content/1x/2x modules in a fresh vm context; `const { test, ok, eq, done } = require('./_t')`.
Every module is an IIFE `(function (GG) { ... })(window.GG);` and must not touch the DOM unless it is 3x/4x/5x/6x.

---

## Agent SIM: save + career + songs + gig
Owns: `src/10_save.js`, `src/20_sim_career.js`, `src/21_sim_songs.js`, `src/22_sim_gig.js`,
`src/content/activities.js`, `src/content/economy.js`, `src/content/venues.js`,
`tests/sim_career.test.js`, `tests/save.test.js`, `tests/sim_gig.test.js`, `tools/balance.js`.

### Career (20_sim_career.js): everything in the COMMANDS block of 02_contracts.js for `GG.career`, plus:
- `newCareer` builds members from `GG.content.bands[bandId].members` (fallback: 4 generic members if content missing),
  starter songs from `band.starterSongs`, `state.player` from args (`look`/`kitColor` from `GG.content.presets`
  by `presetId`, fallback defaults). **Week one is pre-booked:** `state.gig = GG.gig.makeGig(state, 'buddys_house_party', 'forced')`.
  `seed` defaults to a hash of the player name + band if absent (never Math.random inside the sim; the UI passes a seed).
- `startWeek`: idempotent (if an unresolved card exists, return it). Card draw order:
  1. a card whose `forceWeek === state.totalWeek` and not yet seen;
  2. due chain cards (`state.chains[c].step === card.step && due <= totalWeek`, gate passes), weighted;
  3. quiet week with `economy.quietWeekChance` (never in week 1–2);
  4. eligible normal cards (gate passes; `once` cards not seen; `cooldown` respected; chain cards only if they are
     `step: 1` and that chain hasn't started), weighted by `weight` (default 1).
  Also: from `economy.offerMinFans` fans, a chance of a gig offer (`state.offer`) if no gig is booked.
- Effects applier: implements every `EFFECT_KEYS` entry. `mood`/`skill` maps accept member ids and `'all'`.
  Clamp to `RANGES`. `flags` value `false` deletes the flag. `chain` sets `state.chains[c] = { step, due: totalWeek + (delay||1) }`
  (`step: 'end'` ends it). `book` makes a GIG (source 'card') if no gig booked. `chat` pushes a message.
  `roll`: chance = `roll.chance + (state[roll.stat] - 50) * (roll.statScale || 0)` clamped 0.05–0.95; choice-level
  effects always apply, then `success` or `fail`. Return `deltas` (what actually changed) and `success` (true/false/null).
- `effectSummary(effects)`: short human string for choice hints, e.g. `−$120 · Buzz ↑ · Marcel ↑↑ · Chemistry ↓`
  (money exact; other stats as arrows, ↑↑ for big moves). Member names from band content.
- Activities (content/activities.js numbers; flavour lines from `GG.content.lines.activity[id]` with fallbacks):
  Rehearse (member skill + chemistry + drumSkill + polishes up to 3 songs, some burnout),
  Write (adds a placeholder song via `GG.songs.writePlaceholder`: French title from `GG.content.songTitles[genre]`,
  quality from skills + rng; some burnout), Promote (costs a little, buzz up), Book (v0.1 placeholder: if no gig is booked
  this weekend, book a tier-1 venue you qualify for; else small buzz bump), Hustle (cash; burnout; Marcel grumbles),
  Rest (burnout down, moods up). Two of the same activity in a week have diminishing returns.
- After the blocks, if a gig is booked it auto-resolves (`GG.gig.autoResolve`) and `state.gig` clears.
- `endWeek`: weekly upkeep (`economy.weeklyUpkeep`), buzz decay, burnout effects on mood, mood drift toward a
  baseline from burnout/success, chat messages (members post 0–2 lines from `GG.content.lines.chat[id][moodBucket]`),
  history point, milestones (first gig, first song, 50/100/250/500/1000 fans, first $1,000; `wrap.milestones: [text]`),
  **parents' loan** if fund < 0 (top up to a small cushion, `debtToParents += loan`, `stats.parentsLoans++`,
  `flags.parentsLoan = true`, a guilt line from `GG.content.lines.guilt`), year rollover every 24 weeks
  (`wrap.yearEnd`, `yearSummary`), career end at `maxWeeks` (phase 'ended', `state.ended = true`).
  Garage era: `era` stays 'garage' and `protected` stays true all of v0.1 (quits arrive in v0.4).
  Sets phase 'monday' with `card = null` (UI calls startWeek for the new week, after autosave).
- `moodLabel`: ≥70 happy, ≥45 ok, ≥25 grumpy, else sulking.
- Bots: `botPlan(state, 'avg'|'good')`, `botChoice(state, card, 'avg'|'good')` use `GG.rngFor(state)` or pure logic.
- Emit the events in 02_contracts.js at the documented points. `GG.registerDebug('career', ...)` returns a compact
  summary of `GG.state` if set (totalWeek, phase, fund, fans, buzz, chemistry, burnout, members moods).

### Economy target ("scrappy, but not too brutal", owner decision)
Start: fund ≈ $300, fans ≈ 12 (your mom counts), buzz ≈ 5, chemistry ≈ 50, burnout ≈ 10, drumSkill ≈ 10.
`tools/balance.js` over 5 seeds × 1 year (and a 10-year run) prints per year: fund min/end, fans end, buzz avg,
parents' loans, quits (always 0 in v0.1), songs, gigs, avg mood. Targets for year 1:
- avg bot: 0–2 parents' loans, fund mostly $50–$600, fans end 150–400, burnout not pinned at 100.
- good bot: 0 parents' loans, fans end 350–800.
- 10-year run: no NaN/Infinity, no stat outside RANGES, fans stay sane (< 100k with garage-only content).

### Venues (content/venues.js) must include these ids (cards reference them):
`buddys_house_party` (Buddy's House Party, Saskatoon, tier 1, capacity 15, exposure, quirk "Twelve people and a dog."),
`gopher_hole_openmic` (The Gopher Hole — Open Mic Night), `legion_63` (Legion Hall, Branch 63),
`bingo_palace` (Bingo Palace), `st_vlads_hall` (St. Vlad's Church Hall; card-only via `minFans: 99999`),
`warman_curling_lounge` (Warman Curling Rink Lounge, Warman), `martensville_skatepark` (all-ages, exposure),
`gopher_hole` (The Gopher Hole, tier 2 bar, capacity 150, door split, minFans ~150).
All Saskatchewan. Each has a funny one-line `quirk`. `genreFit` for all four genres.

### Save (10_save.js)
- Keys `gg.v1.slot.<auto|1|2|3>`, `gg.v1.settings`, reserved `gg.v1.hof`, `gg.v1.meta`.
- Record `{ savedAt, version, summary: { band, player, year, week, fans, fund }, state }`.
- Every storage access in try/catch; if storage is unavailable fall back to an in-memory map and set
  `GG.save.storageOk = false`. Game must work with empty storage.
- Save code: `toCode(state)` → `'GG1:' + <compressed base64url JSON> + <checksum>`; `fromCode` tolerates whitespace/line
  breaks from phone copy-paste, validates checksum and schema, runs `migrate`, throws `Error('That save code is damaged ...')`.
  Pure JS compression (LZ-style), no libraries, works in node for tests.
- `GG.save.settings()` / `saveSettings(obj)` for `{ muted }`.

### Gig (22_sim_gig.js) v0.1 placeholder
`makeGig`, `randomOffer` (tier-1/2 venues you qualify for by fans), `autoResolve`: score from avg member skill,
drumSkill, chemistry, best 3 songs' quality/polish, burnout, genre fit, rng → grade S/A/B/C/D, crowd, pay by deal
(exposure 0 / flat / door split × crowd), gas, fans, buzz, songs played (increments `song.plays`), a reaction per
member from `GG.content.lines.gigReactions[id][great|ok|bad]`.

### Songs (21_sim_songs.js) v0.1
`writePlaceholder(state, rng)`, `best(state, n)`, `polish(state, amount)`; songs carry `pattern: null` for v0.2.

### Tests
`tests/sim_career.test.js`: seeded 240-week bot career finishes without exceptions; same seed ⇒ identical end
state; protection holds through the garage era (no member leaves, `protected` true); moods/stats stay within
RANGES every week; fund never negative after endWeek; week/year counters roll correctly; forced week-1 card and gig;
chain step/due logic with fixture cards (don't depend on the content agent's cards; build fixtures in the test);
every effect key applies. `tests/save.test.js`: write/read/list/remove round-trip, storage throwing on read/write,
save code round-trip (incl. with inserted whitespace/newlines), damaged code throws, migrate is idempotent.
`tests/sim_gig.test.js`: autoResolve deterministic per seed, pay rules per deal, better band ⇒ better average score.

---

## Agent CONTENT: bands, cards, lines, presets, song titles
Owns: `src/content/bands.js`, `src/content/cards.js`, `src/content/lines.js`, `src/content/presets.js`,
`src/content/song_titles.js`, `src/content/npcs.js`, `tests/content.test.js`.
Schemas: CONTENT SCHEMAS block of 02_contracts.js. Tone: comedic, Spinal Tap energy, prairie-Canadian specifics,
real Canadian cities, parody names for everything else, **no USA content**. Phone-sized text: card `text` ≤ 280 chars,
choice `label` ≤ 38 chars, `outcome` ≤ 200 chars.

- `bands.js`: all four bands from handoff A3 with every member (id, name, nick, role, hometown, skill 30–60,
  mood 55–75, wants, bio, idle, look). Hail Damage is playable; Frost Heave, Gravel Kings and The Grid Road Ramblers
  have `locked: true, comingIn: 'v0.9'` (still give them full member data + blurbs). Hail Damage member ids:
  `marcel`, `dana`, `jaxon`, `kenji`. idle: marcel 'mirror', dana 'noodle', jaxon 'lunch', kenji 'corner'.
  Looks must make them readable as low-poly figures (Kenji: sunglasses; Marcel: long hair; Jaxon: young, cap maybe).
  `coldOpen`: 3–5 short panels (Hail Damage: the night a hailstorm totalled your dad's truck you started a band and named
  it after the insurance claim). `starterSongs`: 2 French-titled songs. `space: 'parents_garage'`, `spaceName`.
  `rivals`: Tundra Wraith (Winnipeg), Mall Rats (Toronto), Chartbusters (Vancouver), Buckle & Boot (Alberta). Rival
  member names are an OPEN owner decision: don't name rival members; say "Tundra Wraith's frontman".
- `cards.js`: ~20 Monday cards for Hail Damage's garage era (`gate: { era:['garage'], genre:['metal'] }` at least),
  spread over all six types, mixing signature cards for each member (Marcel theatrics & French lawn lyrics; Dana gear
  specs & endless solos; Jaxon's baba & sneaky shred fills; Kenji's silence, disappearing, the silent nod), money,
  road (no van yet: Dad's new truck), scene & rivals (Tundra Wraith are unbearably polite, "buddy", fruit baskets),
  fame (community radio, local paper; gate on fans), weird (moose, another hailstorm).
  Plus the forced week-one card `lord_abyssus` (`forceWeek: 1`: Marcel will only answer to "Lord Abyssus").
  Plus **The Cape Saga** (owner pick) chain `cape`, 5–7 cards over steps 1–4 with branches:
  1 Marcel wants a cape on the band fund (fund it ≈ −$120 / Mom's old curtains / no capes) →
  2 it arrives wrong-sized (wear it / Baba hems it / return it) or the curtain version →
  3 the cape-spin debut (a `roll` on chemistry: trademark move vs it catches fire) →
  4 finale branches (fans show up in capes / a cape funeral: fireproof replacement or wear the charred remains).
  The render shows Marcel's cape from `state.flags.cape` = `'velvet'|'curtain'|'charred'|'fireproof'` (absent/`'none'` = no cape),
  so the chain must set that flag. Use `flags`, `flagEquals`, `notFlags` gates for branches.
  Effects magnitudes (garage era): fund −250…+200 (most −20…−150), fans 0…+30, buzz ±2…12, chemistry ±2…8,
  mood ±3…15, skill +1…3, burnout ±3…15. Every choice has an `outcome`. Choices with a `roll` must have a `hint`
  that signals the gamble. Other hints optional (UI auto-generates from effects via `GG.career.effectSummary`).
  Cards may `book` these venue ids: `st_vlads_hall`, `bingo_palace`, `legion_63`, `warman_curling_lounge`.
  Cards may gate on `flags: ['parentsLoan']` (set by the sim after a parents' loan) for guilt cards.
- `lines.js`: `activity` (≥5 per activity, first-person-plural garage flavour, can use `{nick:marcel}` tokens),
  `chat` (per Hail Damage member × happy/ok/grumpy, ≥4 each; Kenji's are mostly "…" / "👍" / "(Kenji has left the chat)
  (Kenji has rejoined the chat)"), `gigReactions` (per member × great/ok/bad, ≥3 each), `tap` (≥5 per member,
  what they say when you tap them in the garage), `guilt` (≥6: "Your mom asks if you've thought about night school"),
  `yearEnd` (≥4), `quietWeek` (≥6 lines for weeks without a Monday card).
- `presets.js`: 6 looks for the player's drummer (id, name, blurb, look, kitColor), comedic names
  (e.g. "Denim Tuxedo", "Toque & Flannel").
- `song_titles.js`: `songTitles.metal`: ≥30 `{ fr, en }` French titles whose English is always about Marcel's lawn
  (e.g. "Ma Pelouse, Mon Tombeau" / "My Lawn, My Tomb"). Also short lists for punk/rock/country (English) for later.
- `npcs.js`: mom, dad, baba, the neighbour, the community radio DJ, Tundra Wraith's frontman (unnamed), etc.
- `tests/content.test.js`: validate against `GG.contracts` (no duplicate ids; every card type/gate key/effect key valid;
  mood/skill keys are real member ids or 'all'; flags/chain shapes; 2–3 choices; outcome present; roll shape;
  length limits; chain steps contiguous and each chain has a reachable end; `book` ids in the allowed list above;
  forced week-1 card exists; every Hail Damage member has lines in chat/gigReactions/tap; ≥30 metal titles;
  presets have valid LOOK; **no US place names or "USA/America/American" anywhere in any content string**).

---

## Agent RENDER: three.js garage
Owns: `src/40_render_core.js`, `src/41_render_garage.js`, `tests/pw_garage.js`.
- three.js 0.149.0 global `THREE` (may be missing offline: `init` returns false and nothing throws).
- `GG.render` API in 02_contracts.js COMMANDS. `init(container)` creates the renderer (pixel ratio ≤ 2, antialias off
  if dpr ≥ 2), resize handling, one rAF loop that is skipped while `setPaused(true)`, and **pointer input on the canvas:**
  a tap (small movement, short press) raycasts hotspots/members first, then the floor. Floor tap ⇒ the player walks there
  in a straight line (clamped to the room, simple obstacle-free). Hotspot tap ⇒ walk to its approach point, face it, then
  `GG.emit('hotspot', { action })`. Bandmate tap ⇒ `GG.emit('member:tap', { id })` (and they turn to face you).
  A small ground ring marks the walk target.
- Garage (portrait framing, whole room visible, camera gently follows the player): low-poly, flat-shaded, few
  materials, warm bulb light + cool night fill. Concrete floor with an oil stain, pegboard with tools, Dad's lawnmower,
  a beat-up couch, a mirror (Marcel poses), a cooler/table with the laptop, stacked amps, the player's drum kit
  (colour = `state.player.kitColor`), whiteboard, corkboard with flyers, merch boxes, a trophy shelf (empty-ish),
  the garage door. Hotspots (mesh `userData.action`): whiteboard 'plan', kit 'kit', corkboard 'gigboard',
  laptop 'laptop', merch boxes 'merch', trophy shelf 'trophies', garage door 'door'. Each hotspot gets a small floating
  label sprite (canvas texture made once) and a subtle idle pulse.
- Characters: blocky low-poly people built from LOOK (skin, hair/hairStyle, shirt, pants, height, build, extras).
  Member look = `member.look || GG.content.bands[state.bandId].members[i].look || default`. Idle animations by
  `idle`: marcel 'mirror' (poses at the mirror), dana 'noodle' (guitar, noodling), jaxon 'lunch' (eats from a lunch box),
  kenji 'corner' (sits in the corner, sunglasses). Mood < 30 ⇒ sulks on the couch with headphones.
  Marcel wears a cape when `state.flags.cape` is 'velvet' (deep purple), 'curtain' (floral/mustard), 'charred'
  (black, tattered), 'fireproof' (silver). Player figure from `state.player.look`.
- `syncState(state)` is cheap and idempotent (rebuild only what changed). No per-frame allocations in the loop;
  reuse vectors. Target < 60 draw calls.
- `GG.registerDebug('render', ...)`: `{ available, scene, paused, frames, drawCalls, triangles, player:{x,z},
  target, walking, hotspots:[actions], members:[{ id, pose }], cape }`.
  `hotspotScreenPos(action)` / `memberScreenPos(id)` return CSS-pixel centres for tests.
- `tests/pw_garage.js` (META_ONLY=garage): boot the built page; if `GG.main.quickStart` exists use it, else
  `GG.render.init(document.getElementById('scene'))` + `setScene('garage')` + `syncState(<fixture state>)`.
  Assert: canvas present, frames advance, tap floor ⇒ player position changes toward the target; tap each hotspot's
  screen position ⇒ 'hotspot' event with that action; tap a member ⇒ 'member:tap'; cape flag shows a cape;
  drawCalls < 60; no console errors. Take ONE 390×844 screenshot to `tests/.cache/garage.png` for the lead.

---

## Agent UI (stage 2, after SIM + CONTENT land): screens, HUD, audio, main
Owns: `src/00_shell.html` (only the CSS block after the "UI styles" comment and markup inside #app if needed),
`src/30_audio.js`, `src/50_ui_core.js`, `src/51_ui_menu.js`, `src/52_ui_week.js`, `src/53_ui_laptop.js`,
`src/60_main.js`, `tests/pw_flow.js`. Spec is in the stage-2 prompt.
