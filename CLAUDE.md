# Garage to Glory: instructions for Claude Code

Garage to Glory is a comedy band-career game by Longlight Interactive. You are the drummer who
started the band (or, since v1.1, its bassist or a guitarist). Steer it week by week through a
ten-year career, from a Saskatoon garage to arenas, and play every gig as a rhythm game.

Read this file first. `DESIGN.md` says what is built. `plan/status.md` holds the version history,
the owner's locked decisions and every open item. Current version: see `VERSION` (1.6.0.0 "Showtime").

## Stack

- One self-contained HTML file: `dist/game.html`. Plain JavaScript (ES5-style IIFEs on one global
  `window.GG`), CSS and HTML. No framework, no npm, no package.json, no bundler.
- The only external dependency is three.js **0.149.0**, loaded by one `<script>` tag from cdnjs
  (`src/00_shell.html`). Do not change the version without the owner.
- Audio is Web Audio only (synth drums, Karplus-Strong strings, synthesized vocals), plus one sampled
  drum kit shipped as base64 MP3 in `src/content/kit_tmkd_vortex.js` (see its LICENSE.md: free, credit
  required, replace it before the game is ever sold).
- Node 22 runs the build, the tests and the tools. Playwright is used from the machine's global
  install (`tests/_pw.js` falls back to `/opt/node22/lib/node_modules/playwright`).

## Commands that work

```
node build.js                      # src/ -> dist/game.html (+ game.artifact.html + "Garage to Glory - V<ver>.html")
NOSTRIP=1 node build.js            # keep full-line comments in dist (debugging)
node tests/run.js                  # every tests/*.test.js, each in its own process (~6.5 min, prints SUITE ALL PASS)
node tests/run.js sim_gig          # only the files whose name contains the filter
META_ONLY=flow timeout 500 node tests/pw_flow.js    # one Playwright section (headless Chromium, 390x844)
PW_VIEW=440x956 META_ONLY=gig node tests/pw_gig.js  # same at the owner's phone size
node tools/balance.js [years] [seeds]               # bot careers, one table per bot style
node tools/phoneqa.js              # phone layout sweep (tap targets, safe areas) at PW_VIEW
node tools/perf.js all             # frame, audio and size probes against dist/game.html
```

Every `tests/pw_*.js` is split into sections picked with `META_ONLY=a,b` (the list is in the file's
header comment). Each section must finish inside `timeout 500`. The Playwright helper caches
three.js in `tests/.cache/` (gitignored) and fails a check on any console error.

## Build, version and deploy

- `VERSION` holds `Major.Minor.Patch.Build` (for example `1.6.0.0`). `build.js` stamps it into the
  `<title>`, `GG.VERSION` and the boot screen, and names the versioned copy in `dist/`. Bump it
  before every build that ships.
- `build.js` concatenates `src/` in this order: `01_ns`, `02_contracts`, then `content/*.js`, then
  every other `src/*.js` by file name. It strips full-line `//` comments from the shipped JS
  (`tests/build.test.js` checks the stripper). The build is deterministic: running it on a clean tree
  changes nothing in `dist/`.
- `dist/` is committed. Deploy is GitHub Pages serving the `main` branch from the repo root
  (`.nojekyll`, root `index.html` redirects to `dist/game.html`). The **CI** workflow (`.github/workflows/ci.yml`) is the PR check:
  on every PR and push to `main` it runs `node build.js`, fails if the committed `dist/` differs
  from a fresh build, then runs `node tests/run.js`. It does not deploy.
  Live: https://jxstrr0.github.io/GarageToGlory/ (repo https://github.com/Jxstrr0/GarageToGlory).
  Merging into `main` is the deploy.

## Code conventions (as the code actually does it)

- `src/01_ns.js` creates `GG`, the event bus (`GG.on`, `GG.emit`), the seeded RNG (mulberry32; the
  career's RNG state lives in `state.rng`, so a seed replays a career) and `GG.registerDebug`.
- `src/02_contracts.js` is the single source of truth for constants, state fields, event names and
  save schema (`C.SAVE_SCHEMA` is 10). Change it first, then the code. Each version adds a
  commented block there ("V1.6 SHOWTIME" and so on).
- Sims (`src/2*_sim_*.js`) take `state` as the first argument, never touch the DOM or audio, and roll
  randomness only through `GG.rngFor(state)`. Render (`4*`), audio (`3*`) and UI (`5*`) read state and
  listen to events. `60_main.js` is the glue: boot, routing, the week flow, autosave.
- Tuning numbers live in `src/content/economy.js` (plus `activities.js`); text and game data live in
  `src/content/*.js` as plain objects. No magic numbers in sims.
- Saves: `localStorage` keys `gg.v1.slot.<auto|1|2|3>`, `gg.v1.settings`, `gg.v1.hof`, `gg.v1.meta`,
  every access wrapped (memory fallback when storage is missing or full). Big slots are packed
  (`LZ1:` header + LZW). Save codes are `GG1:` + base64url(LZW(JSON)) + a 6-character checksum,
  made and read in `10_save.js`; the menu offers Back up / Restore, the title screen Restore code.
  A state shape change means a migration in `10_save.js` and a `SAVE_SCHEMA` bump; old saves must
  keep loading (`tests/save.test.js`, `tests/compat_v12.test.js` and the gzipped fixtures).
- Every module registers `GG.debug('<name>')` getters; tests assert state, not pixels. Phones must
  not change layout when PC features change (`tests/pw_freeze.js` fixtures).
- Content rules: real Canadian cities, parody names for everything else, no USA content anywhere
  (`C.REGIONS` and `tests/content.test.js` enforce it). Studio name: Longlight Interactive.

## Where things live

- `src/00_shell.html`: CSS, markup, the three.js tag, the `<!-- SCRIPTS -->` marker.
- `src/10_save.js` saves and codes; `11_settings.js` preferences, keys, calibration, career difficulty;
  `12_meta.js` Hall of Fame and cross-career unlocks.
- `src/20_sim_career.js` the week loop; `21` songs and the sequencer model; `22` gigs (charts,
  judging, crowd); `23` rivals; `24` labels, albums, reviews, Loonies; `25` tours; `26` world;
  `27` drama (moods, quits, recruits); `28` calendar; `29` fans and Bandbook; `2a` shop; `2b` character
  creator; `2c` licensing; `2d` year recap; `2e` logo; `2f` Legacy and endings; `2g` achievements;
  `2h` tutorial lessons.
- `src/30_audio.js` (+ `31` feel, `32` DSP, `33` voice), `src/4*_render_*.js` (three.js scenes),
  `src/5*_ui_*.js` (one screen family per file; `50_ui_core.js` owns `ui.define`), `src/60_main.js`.
- `src/content/*.js`: all data. `zz_*` files add the other bands, seats and their cards.
- `tests/`: `*.test.js` node tests (39 files), `pw_*.js` Playwright checks (31 files), `fixtures/`
  old saves and freeze snapshots, `_load.js` (node loader for the DOM-free modules), `_t.js`, `_pw.js`.
- `tools/`: `balance.js`, `perf.js` (+ `perf_probes/`), `phoneqa.js`, `desktopqa.js`, `phone_freeze.js`,
  `fx_look.js`, audio tools (`audio_*.js`, `_audio_lab.js`, `kit_trim.js`, `make_kit.py`,
  `check_kit_zip.py`), `seat_audit.js`, fixture makers.
- `plan/`: the living docs are `plan/status.md` (read first every session: version, decisions, open
  items) and `plan/handoff.md` (the original design doc and its addenda, Parts A to F; grep the part
  you need, never read it whole). Everything else in `plan/` is history: `status_archive.md`,
  `plan_contract_*.md`, lane and integration reports, balance and perf tables.

## How Kelbo works

- Kelbo is a beginner-plus coder who plays and reads mostly on his phone (iPhone, 440x956). Explain
  every change in plain language at the end of a task, with how to test it on the live site.
- Phone first, portrait. Everything must work with touch. Keyboard and the PC layout are extras.
- Work on a branch, open a pull request into `main`. Kelbo has given standing permission to merge
  once the **CI** check on the PR is green (build clean, `dist/` committed and current, node tests
  pass) and the Playwright sections the change touches pass locally (CI does not run Playwright).
  Delete the branch after merging.
- Ask with a short popup (2 to 4 options, recommended first) when a real design choice comes up.
  Record the answer in `plan/status.md`. Never re-pitch a locked decision.
- Keep pull requests small enough to review on a phone. Update `plan/status.md` ("Current" and
  "Next") at every merge, and `README.md` when commands or features change.
- Token discipline: grep then read a line range, never whole large files; filter test output.

## Current status (2026-10-24)

- Built and live: the whole roadmap from v0.1 to v1.6. Ten-year career with bonus years, four bands
  and genres, four seats, rhythm gigs with touch and keyboard, songwriter with Quick song and sliders,
  labels, albums, reviews, Loonies, rivals, world tours, shop, merch, licensing, logo, year recap,
  Legacy endings, Hall of Fame, achievements, tutorial, simulated gigs, PC layout, animated highway.
- Known gaps (from `plan/status.md` and the v1.3 integration report): per-chord thirds and slider-song
  career balance are still open; `dist/game.html` is about 5.4 MB, past the plan's soft size budget;
  the v1.4 owner playtest (years 1 to 3 on drums, then 3 to 6) has not been reported yet, so no
  v1.4.x balance patches exist. Real recorded instruments were deferred (handoff F15).
- Next: whatever Kelbo reports from play. The last merges were v1.6 (PR #31) and the studio rename
  to Longlight Interactive (PR #32).
