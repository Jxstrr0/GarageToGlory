# Garage to Glory

A comedic band-career game by **Longlight Interactive**. You're the drummer who started the band: steer it through a
ten-year career from your parents' garage in Saskatoon to arenas around the world (or a breakup in a parking lot).
Phone-first, portrait, low-poly 3D, rhythm-game gigs.

- Play: https://jxstrr0.github.io/GarageToGlory/ (GitHub Pages serves `main`), or open `dist/game.html` in a browser
  (one self-contained file; three.js 0.149.0 loads from cdnjs). Version: `VERSION` (currently 1.6.0.0).
- Build: `node build.js` (concatenates `src/` into `dist/`; `dist/` is committed).
- Test: `node tests/run.js` (all node tests) · Playwright: `META_ONLY=flow timeout 500 node tests/pw_flow.js`
  (one section of one `tests/pw_*.js`; `PW_VIEW=440x956` for the owner's phone size)
- Balance probe: `node tools/balance.js [years] [seeds]`
- For Claude Code sessions: `CLAUDE.md` (how to work here) · `DESIGN.md` (the game as built) ·
  `plan/status.md` (version history, decisions, open items) · `plan/handoff.md` (the original design doc and addenda)

## Credits
- Game, code, art and synthesized audio: Longlight Interactive.
- Drum samples: "Vortex" free pack by The Metal Kick Drum, recorded & processed by Rafa Prieto (© 2019)
  (metal kick, snare and toms at the pro and arena kit tiers). Free to share, credit required, not for sale: see
  `src/content/kit_tmkd_vortex.LICENSE.md`. Garage to Glory is free; before it is ever sold or monetized, this kit is
  replaced or The Metal Kick Drum's written permission is obtained.
- three.js (MIT) from cdnjs.
