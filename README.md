# Garage to Glory

A comedic band-career game by **Prairie Blue Studio**. You're the drummer who started the band: steer it through a
ten-year career from your parents' garage in Saskatoon to arenas around the world (or a breakup in a parking lot).
Phone-first, portrait, low-poly 3D, rhythm-game gigs.

- Play: open `dist/game.html` in a browser (one self-contained file; three.js loads from cdnjs).
- Build: `node build.js` (concatenates `src/` into `dist/`).
- Test: `node tests/run.js` · Playwright: `META_ONLY=flow timeout 500 node tests/pw_flow.js`
- Balance probe: `node tools/balance.js`
- Design + roadmap: `plan/handoff.md` · Current status: `plan/status.md`
