# v0.2.0 "Sequencer" contract (single agent)

Shapes: `src/02_contracts.js` (PATTERN, SONG, C.LANES/STEPS/SECTIONS/BARS_PER_SECTION, new events + commands; SAVE_SCHEMA is
now 2 — two tests still expect 1 and must be updated alongside the v1→v2 migration). Status/APIs of v0.1: `plan/status.md`.
Design: handoff A5 (songwriting), A4 (Write block), A6 (charts are your songs — v0.3 will build gig charts from `toNotes`).

**Done when:** a song written in the UI plays back (synth drums + generated metal backing) and rates deterministically in
node tests; all v0.1 tests still pass; a v0.1 save loads (songs get patterns via migration).

## Owner decisions (locked)
- Drum palette: **punchy real-ish synth kit** (thumpy kick, cracky snare, crisp hats, splashy cymbal; reads as a real band on
  phone speakers).
- Metal backing: **tempo decides** — slow (< ~100 bpm) doom sludge, mid (~100–170) palm-muted chugs locked to the kick,
  fast (> ~170) tremolo-picked riffs; bass doubles the guitar an octave down.

## Pieces
1. **Model + rating (21_sim_songs.js, content/genres.js)** — pure, deterministic, no DOM, no audio.
   - `content/genres.js`: per genre `{ tempo: [min,max,default], signature, backing, reactions }`. Tempo ranges: country
     slow, punk fast, metal doom-to-blast (e.g. metal 60–240, punk 150–230, rock 90–160, country 70–130).
   - Groove = genre fit: metal wants dense kick (8ths without the pedal; 16ths/"double kick" when `gear.doubleKick`), a
     backbeat or blast snare, busy hats/cymbal; punk wants fast driving snare (and high bpm); rock wants a solid backbeat
     (kick 1/3, snare 2/4, steady 8th hats); country wants the train beat (snare 16ths with 2/4 accents, kick on 1/3).
     All four genres' signatures ship now (only metal is playable until v0.9) so tests can prove they score as designed.
   - Hook: the chorus contrasts with the verse (sweet spot of difference, identical = weak, unrelated noise = weak) and is
     catchy/repeatable (internal repetition, a cymbal accent on the downbeat).
   - Difficulty: notes per bar across the arrangement × tempo × syncopation. Band skill caps what they can pull off:
     `quality` (0–100, used by gigs) = f(groove, hook, difficulty vs the band's ability) — over-hard songs start rougher.
   - Without the double-kick pedal the kick lane can't hit two adjacent steps (`validate` + the UI enforce it).
   - `tips`: 1–2 plain hints ("Metal wants a busier kick", "Chorus is a copy of the verse").
   - New songs start rough (`polish` low) and tighten with Rehearse (v0.1 behaviour). **Staleness**: each gig play adds
     stale, weeks off decay it; stale songs score less at gigs. **Classics**: a song with enough great gigs (A/S) becomes
     a classic (the crowd will demand it in v0.3). `similarity(a,b)` for the v0.5 "recycled drum patterns" review check.
   - `generate(genre, rng, opts)` makes decent genre patterns (bots, "let the band jam one", migration of v0.1 songs,
     starter songs). `starter(genre)` = the fixed teaching pattern for the first Write.
   - Arrangement presets: Short (V C V C), Classic (V C V C B C), Epic (V V C V C B B C C). Each entry plays
     `BARS_PER_SECTION` bars, so a song lasts roughly 40–90 s — gig charts in v0.3 come from `toNotes`.
2. **Career integration (20_sim_career.js, 10_save.js)** — Write block consumes `state.pendingSongs.shift()` (composed in
   the UI) or, if none, auto-generates a jam (`auto: true`, bots use this path). Emits 'song:written' with band reactions:
   Dana complains when there's no room for a solo, Jaxon admits sneaking fills into simple parts, Kenji nods at a great
   one, Marcel names it in French (lines in content/lines.js `songReactions`). Gigs update stale/classic. `gear` defaults.
   Save migration v1→v2: songs without a pattern get `generate()`d from an RNG seeded by the song id (never the career
   RNG), then rated; `gear`, `pendingSongs`, `draft` defaults. Keep old `quality`/`polish` if present.
3. **Audio (30_audio.js)** — synth voices for all 6 lanes (toms/ride ready for v0.8), a look-ahead scheduler on
   `AudioContext.currentTime` (never rAF time), `GG.audio.play(pattern, opts)` → handle, emits 'audio:step' for the
   playhead (fire UI callbacks via short timeouts aligned to scheduled times), metal backing per the owner decision with
   a per-song chord progression derived from the song (verse/chorus/bridge differ). Voice cap (≤ 12 incl. backing),
   master compressor/limiter so nothing clips. Existing sfx keep working. Build the scheduler so v0.3's rhythm game can
   reuse it (song → timed events).
4. **UI (new 54_ui_sequencer.js, edits in 52_ui_week.js / 53_ui_laptop.js / 60_main.js / shell CSS)**
   - Full-screen sequencer: header (French title from `songTitles`, tap to reroll, or type your own), section tabs
     (Verse / Chorus / Bridge, "copy from…"), the grid (lane columns left→right with icons/colours that the v0.3 highway
     will reuse; 16 step rows top→bottom, beat labels, bar shading every 4 steps; tap to toggle, drag to paint; kick
     adjacency rule shown kindly), tempo slider within the genre range, arrangement preset chips, Play/Stop (section loop
     or whole song) with a moving playhead, live Groove / Hook / Difficulty meters + tips, Save.
     Touch targets: columns are wide; rows may be ~36–40 px tall (the grid can scroll inside the screen) — keep it
     comfortable at 390×844.
   - Flow: planner with Write block(s) → Go → the sequencer opens once per Write block ("Write block 1 of 2") before the
     week runs; "Let the band jam one" skips composing (auto song). First-ever Write opens with `starter(genre)` and a
     one-line in-character tip from a bandmate. Save → the song is queued in `pendingSongs` → the week runs → results show
     the new song + band reactions.
   - Kit hotspot → the sequencer in sketch mode on `state.draft` (can play and edit; "Use this in my next Write block").
   - Laptop Band tab: song catalog with Groove/Hook/Difficulty, stale/classic tags; tap a song → read-only sequencer with
     Play.
   - Stop playback when the sequencer closes, the app hides, or a gig/results screen opens.
5. **Tests**
   - `tests/sim_songs.test.js`: rating deterministic (same pattern ⇒ same numbers, across runs and in the browser);
     each genre's signature pattern scores Groove ≥ 80 in its own genre and clearly lower in the others; empty/random
     patterns score low; hook sweet spot (identical verse/chorus < contrasting < noise? — prove the curve); difficulty
     monotonic in notes and bpm; kick-adjacency rule; staleness/classic transitions; v1→v2 migration (a v0.1 save
     fixture loads, every song gets a valid pattern, deterministic); `toNotes` note count = hits × bars.
   - Update existing sim_career/save tests for schema 2; keep all other v0.1 tests green.
   - `tests/pw_seq.js` (META_ONLY=seq | audio): seq — quickStart → plan Write + 2 others → Go → sequencer → toggle cells →
     meters change → Play (audio 'running', playhead steps advance) → Stop → Save → week results show the song + reactions
     → laptop catalog lists it with its pattern; the in-page `GG.songs.rate` equals the node result for the same fixture.
     audio — OfflineAudioContext render of each lane voice and 2 bars of each backing style: non-silent, peak < 1.0, no NaN.
     Every section asserts no console errors. Run the v0.1 pw sections too (flow, year, code, layout, garage).
   - `tools/balance.js` before/after (bots now write via `generate`); keep year-1 targets from v0.1.
6. **Docs:** update `plan/status.md` "What's in", "APIs", back-burner (lead will polish); do not bump VERSION (lead did:
   0.2.0.0).
