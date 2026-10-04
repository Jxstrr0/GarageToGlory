# v1.3 "Songwriter" Lane A report (AUDIO + GIG; branch `wip-v13-a`, from stage 0 `0d42d53`)
**Files:** `src/30_audio.js`, `src/31_audio_feel.js`, `src/22_sim_gig.js`, `src/55_ui_gig.js` (seatSound `dead` only); tests `sim_audio`,
`sim_feel`, `sim_gig`, `pw_gig` (new section `swing`), `pw_seat_audio` (new section `dead`); dist rebuilt. Nothing else touched.
**APIs as built** (each branch gated on its own field; absent / neutral = the 1.2 code verbatim, no new key anywhere):
- `A.timeline`: `p.chords[name]` replaces the prog after the part prog (chords > part prog > hash) on every seat incl. lead + drums;
  Q4: with chips a `break` bar's root is its chip (`METAL.brk` plays `o.root`, = the tonic in every 1.2 song); the outro ring keeps the
  tonic. `p.mood` non-native (`songs.moodOf`): `B = {...B, mode, scale}`, `key = {...key, mode, name, mood}`, `o.third = rung.third`
  (uniform, the `part.rowPitch` rule) read by `third(o, lit)` at the rock walk, country train walk (minor scale snap when third 3),
  country strums, fiddle chord tones, partBar strum, ring bar; `seatPlay` fallback strum takes `o.third`. `p.fillBars[name]`: bar 4's
  drums only (sec / hash / riff stay on the main bar). `p.swing > 0`: before the sort every non-step event on a swung position gets
  `g` (grid beat) + `beat = swingBeat`; `len` = warped end - warped start (also for whole-beat starts: legato into the swung note);
  gaps follow; result `swing`. `debug('audio')` += `swing`, `mood`; `seat.last.dead`.
- Part v2: `partOf` / `partSec` carry `v: 2` (n from `part.LAYOUT[2]`); `seatPart` -> `partBar2` (v1 `partBar` verbatim). Rhythm: Chug /
  Open = the v1 rule on `mask & 3`; Root / 5th / Oct = singles `{ power: false, single: true }` (metal/punk at the root, rock/country
  + 12; country picks one string, `strum: [0]`); Scratch alone = dead strum `{ mute, dead }` at the root, <= 1 step. Bass: lowest row
  via `rowPitch` (rows 1/3/5 = the v1 call); Low 5th = the bass root as it sounds - 5 (never folds, <= 5 under `bassFloor`). Lead:
  highest row, `rowPitch` degree in the mood scale, v1 bend rule. Gap voice of a single = `kind|midi` (chug + Root on one step keep length).
- KS: art `'dead'` (0.12 s, t60 0.06, mute) via `ksSpec(..., { dead })` / `ksSpecFor(ev.dead)`; a spec with no strings -> null; a
  one-string country pick = one buffer. `seatPlay` takes `o.dead` (Classic: the mute recipe); a `with` partner carries its own `dead`.
- 31: accent step from `e.g ?? e.beat`. 22: drum chart + extras `t = swingBeat(beat, swing) x spb`; extras skip a section with a
  fill; windows / sections / duration fixed; seatChart `where()` reads `e.g`; `dead` copied to notes / auto / `with`; a dead note never
  starts or joins a run; no chord on dead or one-string notes (`strum.length > 1`); Q1 = 1 (no lane change). 55: `o.dead`.
**Tests:** node suite ALL PASS (compat_v12 10/10, STAGE0). `sim_audio` 43 (+8): neutral fields == STAGE0 (1,212 fps) + per seat/part;
chords == `chordsOf` over corpus x 5 seats (1,660 timelines); chips on every seat; Q4; mood; swing; fills; `timeline(upgrade(pt)) ==
timeline(pt)` (996 corpus x seat + every index x 3 moods); v2 rows. `sim_feel` 12 (+1 swung accents). `sim_gig` 30 (+6): swung chart t ==
timeline time (4 genres x Feel 1-4 + extras), neutral charts == 1.2 (4 diffs, drums + 3 seats), fills x extras / free windows (chart ==
timeline with fills is gated on toNotes; passed on a trial merge with `wip-v13-s` 3e004ea), seat swing, Scratch/singles, perfect bot
100 % (4 genres x 4 seats x normal/expert). Playwright 390x844 + 440x956 ALL PASS: pw_gig swing 10, sync 14 (one 390 load flake on the
1.2 early-tap check, then green alone twice), feel 10, bridge 17, seat 33, chord 10; pw_seat_audio voices 19, mute 4, preview 9,
noodle 5, dead 10. Classic `META_ONLY=hash pw_seq` 232/232.
**Numbers:** dist 5,148,851 B (+6,684). Timeline median (rhythm seat + part, node) 0.9-1.13 ms -> 1.08-1.25 ms with every v1.3 field;
seat chart 1.38-1.70 -> 1.45-1.85 ms.
**Hand-overs.** (1) S `chordLabel`: the band plays the rung third on every chord (= `rowPitch`; native = 1.2, country strums major on
vi) but the label names triads by scale ('Em'); label with the rung third, or the lead accepts it (per-chord thirds = v1.4, changing
`rowPitch` + `o.third` together). (2) After merging S: `sim_gig` must not print "toNotes has no bar-4 fills yet"; `pw_gig swing` shows
`fillsIn: true`. (3) Lead, 02_contracts as built: event keys `g`, `dead`, `single` (`single` is new vs §4.5, v2 singles only), timeline
`swing`, `key.mood`, debug `swing` / `mood` / `seat.last.dead`, KS art `dead`. (4) U: nothing needed (`A.strum(m, w, { dead, third })`).
**Gaps / accepted:** swapped drummer on straight steps; Feel 4 at 220+ bpm squeezes 16th pairs; rivals / jams / bots never swing.
