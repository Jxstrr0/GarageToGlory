# Garage to Glory: status

Read this first every session. Don't re-explore the codebase to rebuild context.

## Version
- Current: **0.3.0.0 "Stage"** (merged to main 2026-09-29) · 0.2 "Sequencer", 0.1 "Garage" merged earlier
- Next: **0.4.0 "Drama"** (handoff B4)
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
- 2026-09-29 (for v0.3): **Kenji drives the van, silently** (every trip, sunglasses, nobody sees him get in or out);
  v0.3 map = **Saskatchewan core** (Saskatoon, Regina, Prince Albert, Moose Jaw, Swift Current, North Battleford,
  Yorkton, Warman/Martensville); rhythm timing = **Forgiving** (wide early window; drum skill widens it further).
- 2026-09-29: Owner turned on GitHub "Automatically delete head branches" (merged branches clean themselves up).
- 2026-09-29 (for v0.2): drum palette = **punchy real-ish synth kit**; metal backing = **tempo decides**
  (slow → doom sludge, mid → palm-muted chugs locked to the kick, fast → tremolo blast riffs; bass doubles guitar).

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

## APIs (full shapes in `src/02_contracts.js`)
- `GG.career`: contract commands + `choiceHint, rollChance, gatePasses, applyEffects, cardById, band, memberName,
  pickLine, contentLines, botWeek, botOffer`. startWeek/runWeek/endWeek are double-call safe.
- `GG.gig`: `makeGig, randomOffer, autoResolve` = `simulate(state, gig, rng)` (pure) + `applyResult(state, result)`
  → v0.3 replaces `simulate` with the rhythm game and keeps `applyResult`. Also `bookLocal, venue, fit, qualifying,
  performance, gradeFor, payFor`.
- `GG.songs` (v0.2): `rate(p, genre, gear) → {groove, hook, difficulty, notes, tips, sections}`, `verdict, validate,
  sanitize(p, gear, genre), generate(genre, rng, {gear, wild, arrangement}), starter, signature, patternFor(state, key),
  similarity, toNotes → [{beat, lane, section, entry, bar, step}], beats, seconds, create(state, p, title, opts), jam,
  addStarter, pickTitle, ability, byId, score, best, polish, played(state, ids, grade) → new classics, weekly,
  reactions, kickBlocked, setHit, isHit, blankSection, ARRANGEMENTS, ARRANGEMENT_IDS, arrangementId, genre(id)`.
  Tunables: `economy.songs`; genre data: `content/genres.js`; lines: `lines.songReactions`, `lines.writeTips`.
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
  `stop, isPlaying, current, hit(lane), timeline(p, opts) → {bpm, beats, style, events[{beat, kind, lane|midi, len, gap}]},
  styleFor(genre, bpm), renderOffline(spec) → Promise<{peak, rms, nan}>`. Events: 'audio:step' per 16th, 'audio:end'.
- `GG.ui` v0.2: `LANES` (lane name/icon/colour for the v0.3 highway), `composeWeek(n, done), openSketch, openSong(id)`;
  screens `seq` (full) and `seq-tools` (modal).
- Tests: `node tests/run.js` (content 21, save 7, sim_career 18, sim_gig 7, sim_songs 12) · `pw_flow.js`
  META_ONLY=flow|year|code|layout (flows jam their Write blocks) · `pw_garage.js` META_ONLY=garage (48) ·
  `pw_seq.js` META_ONLY=seq (29, screenshot `tests/.cache/seq.png`)|audio (16).


## Back-burner
- v0.3: later years pay far more than v0.2 (good bot year 2 ≈ $7k fund, 2,000 fans) because of 250–300-cap rooms —
  needs the era/economy pass in v0.5.
- v0.3: no latency-calibration setting for players yet; `A.hit` has no per-lane choke.
- v0.3: `protected` never turns off, so van breakdowns exist but never fire (first milestone arrives with v0.4/v0.5).
- v0.3: van space has no use yet (merch in v0.8). Gig banter lines live in 55_ui_gig.js, not content/lines.js.
- Restoring a save code keeps the code's slot; its next autosave overwrites that slot without asking.
- With the planner sheet open the room squeezes into a 150px band and hotspot labels overlap a little.
- `debtToParents` is never repaid (v0.4 parents' loan + guilt cards).
- Once-only garage cards run out after ~1.5 years; later garage years lean on repeatables (eras/content in v0.5+).
- Full-career save code ≈ 17.6k chars (could trim `history`).
- Flags `mooseMuse` and `babaMad` are set by cards but unused yet (hooks for the moose album chain / baba storyline).
- Week-one teaching is one in-character toast; the full guided tutorial is v1.0.
- Marcel's mirror has no reflection.
- v0.2: last week's plan stays on the whiteboard (v0.1 behaviour); Go with a kept Write opens the sequencer again.
- v0.2: the mix was tuned by numbers (peaks/rms), not by ear on a phone; backing for punk/rock/country is basic.
- v0.2: sketch-pad edits and queued sketches persist only at the next autosave (week wrap).
- v0.2: gear upgrades (double kick, toms, ride) exist in the model/audio but nothing sells them yet (v0.8).
