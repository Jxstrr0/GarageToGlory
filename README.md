# Garage to Glory

A comedic band-career game by **Prairie Blue Studio**. You're the drummer who started the band: steer it through a
ten-year career from your parents' garage in Saskatoon to arenas around the world (or a breakup in a parking lot).
Phone-first, portrait, low-poly 3D, rhythm-game gigs.

- Play: open `dist/game.html` in a browser (one self-contained file; three.js loads from cdnjs).
- Build: `node build.js` (concatenates `src/` into `dist/`).
- Test: `node tests/run.js` · Playwright: `META_ONLY=flow timeout 500 node tests/pw_flow.js`
- Balance probe: `node tools/balance.js`
- Design + roadmap: `plan/handoff.md` · Current status: `plan/status.md`

## Credits
- Game, code, art and synthesized audio: Prairie Blue Studio.
- Drum samples: "Vortex" free pack by The Metal Kick Drum, recorded & processed by Rafa Prieto (© 2019)
  (metal kick, snare and toms at the pro and arena kit tiers). Free to share, credit required, not for sale: see
  `src/content/kit_tmkd_vortex.LICENSE.md`. Garage to Glory is free; before it is ever sold or monetized, this kit is
  replaced or The Metal Kick Drum's written permission is obtained.
- three.js (MIT) from cdnjs.
