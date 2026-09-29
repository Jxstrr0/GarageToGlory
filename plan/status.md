# Garage to Glory: status

Read this first every session. Don't re-explore the codebase to rebuild context.

## Version
- Current: **0.1.0.0 "Garage"** (in progress)
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
- 2026-09-29: Owner: **prefer token efficiency** — few agents (only for multi-feature batches), no duplicate work,
  lean reviews (tests + one focused review pass), patches done inline by the lead.
- 2026-09-29 (for v0.2): drum palette = **punchy real-ish synth kit**; metal backing = **tempo decides**
  (slow → doom sludge, mid → palm-muted chugs locked to the kick, fast → tremolo blast riffs; bass doubles guitar).

## Tech
- three.js **0.149.0** from cdnjs (last UMD build without the r150 deprecation warning). Only external dependency.
- Build: `node build.js` → dist/. ORDER rule: 01_ns, 02_contracts, content/*.js, then other src/*.js by name.
- Tests: `node tests/run.js` (all node tests). Playwright: `timeout 500 node tests/pw_flow.js` with `META_ONLY=<section>`; helper `tests/_pw.js` routes three.js to `tests/.cache/` (gitignored) and runs at 390×844.
- Balance: `node tools/balance.js`.

## APIs
See `src/02_contracts.js` (state, content schemas, events, commands). Filled in as modules land.

## Back-burner
- (empty)
