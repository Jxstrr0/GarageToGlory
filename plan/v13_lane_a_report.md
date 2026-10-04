# v1.3 "Songwriter" Lane A report (AUDIO + GIG; branch `wip-v13-a`, from stage 0 `0d42d53`)
**Files:** `src/30_audio.js`, `src/31_audio_feel.js`, `src/22_sim_gig.js`, `src/55_ui_gig.js` (seatSound `dead` only); tests `sim_audio`,
`sim_feel`, `sim_gig`, `pw_gig` (new section `swing`), `pw_seat_audio` (new section `dead`). Nothing else touched.
**APIs as built (every branch gated on its own field; absent / neutral = the 1.2 code verbatim, no new key anywhere).**
- `A.timeline`: `p.chords[name]` replaces the section's prog after the part prog (chords > part prog > hash) for every seat, the lead
  and the drum seat too; Q4: with chips a `break` bar's root is its chip (`METAL.brk` now plays `o.root`, which is the tonic in every
  1.2 song); outro ring bar keeps the tonic. `p.mood` non-native (`songs.moodOf`): `B = {...B, mode, scale}`, `key = {...key, mode,
  name, mood}`, `o.third = rung.third` (uniform, the same rule as `part.rowPitch`); `third(o, 4)` at the rock walk, country train walk
  (snaps to the minor scale when the third is 3), country strums, fiddle chord tones, partBar country strum, ring bar, seatPlay
  fallback strum (`o.third`). `p.fillBars[name]`: the drums of bar 4 only (`o.sec`, the hash, the riff stay on the main bar).
  `p.swing > 0`: `swingEvents` before the sort: non-step events on a swung position get `g` (grid beat) + `beat = swingBeat`; `len`
  warps for every finite-length event (warped end - warped start, also for whole-beat starts: legato into a swung note); gaps follow;
  result `swing`. `debug('audio')` += `swing`, `mood` (last timeline); `seat.last.dead`.
- Part v2: `partOf` / `partSec` carry `v: 2` (n from `part.LAYOUT[2]`), `seatPart` -> `partBar2` (v1 `partBar` verbatim). Rhythm: Chug /
  Open = the v1 rule (`rhythmHit`, a copy) on `mask & 3`; Root / 5th / Oct = singles `{ power: false, single: true }` (base midi as the
  genre's rhythm voice: metal/punk root, rock/country root + 12; country picks one string `strum: [0]`); Scratch alone = dead strum
  `{ mute, dead }` at the root, len <= 1 step (country: strum [0, 7]). Bass: lowest set row via `rowPitch` (rows 1/3/5 = the v1
  `w.bass` call); Low 5th = the bass root as it sounds - 5 (never folds; at most 5 under `bassFloor`). Lead: highest set row,
  `rowPitch` degree in the mood scale, v1 bend rule. Gap voice key `kind|midi` for singles (a chug + a Root on one step keep their lengths).
- KS: `ksSpec(..., { dead })` -> art `'dead'` (0.12 s buffer, t60 0.06, mute); `ksSpecFor` passes `ev.dead`; a spec with no strings
  returns null; country acoustic KS plays a one-string pick as one buffer. `seatPlay` accepts `o.dead` (ev.mute + dead; Classic: the mute
  recipe); a `with` partner carries its own `dead`.
- 31: the accent step reads `e.g ?? e.beat` (FEEL_CLAMP untouched). 22: drum chart `t = swingBeat(beat, swing) x spb` (notes + extras);
  extras skip a section with a fill; free windows / sections / duration never move; seatChart `where()` reads `e.g`; `dead` copied to
  notes / auto / `with`; a dead note never starts or joins a run; no chord on a dead note or a one-string pick (`strum.length > 1`);
  Q1 = 1: no lane change. 55: `seatSound` passes `o.dead`.
**Tests (all green):** node suite ALL PASS incl. `compat_v12` 10/10 + STAGE0. `sim_audio` 43 (+8): neutral fields == STAGE0 (1,212 fps) and
per seat + part; chords == `chordsOf` over the corpus x 5 seats (1,660 timelines); chips move the root on every seat; Q4; mood (key note
kept, mode / name / vocal scale / country third / rock walk); swing (whole beats + steps fixed, `g` only on moved, len + gaps, 0 =
straight); fills; `timeline(upgrade(pt)) == timeline(pt)` (corpus x 3 seats = 996 + every index x 3 moods); v2 rows (singles, Scratch,
Low 5th under the floor in low metal keys, 3rd/7th from the rung, lead Low/High). `sim_feel` 12 (+1: swung accents = grid accents).
`sim_gig` 30 (+6): swung drum chart t == timeline time (4 genres x Feel 1-4, extras), neutral charts == 1.2 (4 diffs x drums + 3 seats),
fills x extras + free windows (+ chart == timeline with fills, gated on toNotes; passes on a trial merge with `wip-v13-s` 3e004ea),
seat-chart swing, Scratch / singles rules, perfect bot 100 % (4 genres x 4 seats x normal/expert, swung + fills + Scratch).
Playwright (390x844 + 440x956): see the matrix line below.
**Numbers:** dist 5,148,851 B (+6,684 vs stage 0). Classic `pw_seq hash`: see matrix.
**Hand-overs.** (1) S, `chordLabel`: the band plays the rung's third uniformly (= `rowPitch`, = 1.2 for the native rung, where country
strums major triads on every chord) while `chordLabel` names triads by the scale ('Em' on country vi). Request: label country (and any
non-power genre) with the rung third, or the lead accepts the mismatch; per-chord thirds would change `rowPitch` + `o.third` together
(v1.4). (2) S: `toNotes` bar-4 fills (in `wip-v13-s`): after the merge `sim_gig` must NOT print "toNotes has no bar-4 fills yet" and
`pw_gig swing` reports `fillsIn: true`. (3) Lead, 02_contracts "as built": event keys `g`, `dead`, `single` (`single` is new vs §4.5:
only on v2 Root/5th/Oct notes), timeline `swing`, `key.mood`, debug `swing` / `mood` / `seat.last.dead`, KS art `dead`. (4) U: none
needed; `A.strum(midi, when, { dead: true, third })` previews a Scratch / a minor-mood strum if wanted.
**Gaps / accepted:** swapped drummer animates on straight steps (§4.6); Feel 4 at 220+ bpm squeezes 16th pairs; rivals, jams, bots
never carry swing / fills (unchanged); the fill chart check is strict only after S's toNotes lands.
