# v1.3 "Songwriter": plan contract (written 2026-10-03 against `main` 1.2.0.0 = `0a2c3b8`)

Repo: `/home/user/GarageToGlory`, branch `v1.3-songwriter` (= `main` 1.2.0.0 + this contract + stage 0); `NN:line` = `src/NN_*.js`
on `0a2c3b8`. Sources: status.md Addendum 5 (S1–S7), the look `plan/v13_songwriter_mockup.html?opt=A` + `_A.png`, five code maps
(ui, model, audio, gig, content; spot-checked). Read only your lane's section plus §0, §2 and §4 (token rules, status.md).

**Process rule (owner, every lane and the lead):** never `pkill`/`killall` Chromium, `headless_shell` or `node` by name; track the
PIDs you launch, kill only those, close every browser in a `finally {}`. Chromium: `/opt/pw-browsers` (never `playwright install`).
WIP to `wip-v13-<lane>` before any long wait; runs over 10 minutes go through `run_in_background` into a file.
**Owner rules:** no USA content anywhere; no share/screenshot button, ever; questions to the owner are popups with 2–4 options,
recommended first; no model identifiers in code, comments, docs or reports.
**Compatibility law (every lane, every line):** a song/pattern WITHOUT the v1.3 fields sanitizes, rates, charts, renders audio and
saves exactly as 1.2. Every v1.3 branch is gated on its own field being present (and non-neutral); absent → the 1.2 code runs
verbatim and no new key appears on any object (pattern, part, event, timeline, chart). Proof: §3 fixtures, STAGE0, Classic 232/232.

---

## 0. Owner answers (LOCKED, do not re-pitch; status.md Addendum 5, popups 2026-10-03)
| # | Question | Answer (locked) |
|---|---|---|
| S1 | Roadmap | **v1.3 Songwriter** right after v1.2; Tuning (D5) becomes **v1.4**. |
| S2 | Guitar painting | **More note rows** (rhythm: Chug, Open, Root, 5th, Oct, Scratch; bass + lead get a wider range) and **pick each bar's chord** (4 bar chord chips, build your own progression). Not chosen: hold-length drag, per-note techniques. |
| S3 | Sliders, for drums and every instrument | **Energy** (sparse/easy ↔ busy/show-off), **Mood** (bright major ↔ dark minor; key + scale), **Feel** (straight ↔ swing/shuffle), **Fills & surprises** (none ↔ lots), plus **Tempo**. |
| S4 | Builder | **"Quick song, then tweak"**: one screen, pick a recipe (per genre, e.g. Neck-snapper, Doom crawl, Stadium anthem, "Surprise me"; pedal recipes locked without a double kick), move the sliders, hear it, done; any section can be fine-tuned by hand after. |
| S5 | Ratings | **Rate by the notes only**; a slider-built song can reach top ratings. |
| S6 | UI | **One flow** (no separate Guided / Advanced modes; tips inline). Meters = **one slim strip** of 3 mini bars under the header (+/- flash on change). Coach = **one-line bubble** with the bandmate's avatar, tap for the full tip. "Let the band jam one", the metronome and the tools go in the header's ⋯ menu. |
| S7 | Look | **Option A "Clean sheet"** (`?opt=A`, `_A.png`; the owner first tapped B, then: "Sorry, A was my answer"). Flat and quiet; underline section tabs (Verse / Chorus / Bridge / Song); recipe cards in 2 columns; horizontal sliders with end labels + a value label; "Your part \| Drums" toggle with "Chords: <progression> ▾" beside it; 4 chord chips (BAR n + chord name; home chord outlined green) above the grid; the grid fills the screen (no scroll at 440x956); footer ▶ Loop / ▶ Song / Save ✓ (Quick song: ▶ Play / Tweak ✎ / Save ✓). Same navy background as the rest of the game. |
| Q1–Q3 | §8 | Asked at stage 0 in ONE popup; the answers are recorded here before the lanes fork. §4 marks the branches. |

### Defaults (taken without a popup; they stand unless the owner objects — list them in the merge summary)
- D1 Chords live on the PATTERN (`p.chords`): every seat hears them; drum-seat recipes carry Mood chords with no part (create
  deletes drum-seat parts, 21:820); Energy edits never re-pick them (1.2 picks by a hash of kick+snare, 30:2430).
- D2 Chips on all three string seats only (mockup 3: none on drums; hidden on the Drums layer); the lead's ▾ is "Hook: <name>".
- D3 Mood = the parallel key: same key note (`A.keyFor`, 30:2405), new mode/scale/thirds (E ↔ Em); native rung = 1.2. No key picker.
- D4 Ranges: rhythm 6 rows (S2 order), bass 6 (Low 5th, Root, 3rd, 5th, 7th, Oct), lead 7 (one scale step under the hook, the
  hook's 5 degrees, one over). Columns ≥ 47 px at 390 px (6 rows ≈ 53, 7 ≈ 47).
- D5 Scratch = a dead strum at the chord root: charted like a muted chug on the root's lane (same gem).
- D6 Feel = 8th-note shuffle up to a full triplet; 16ths ride inside their 8th; steps, bar lines and count-ins never move.
- D7 `break` bars (metal/punk/rock bridge bars 1–2) and the outro ring bar: chips locked on home. Solo/Outro tabs: no chips (1.2).
- D8 The 0.6.2 groove presets survive as ⋯ → "Beat for this section" (a sheet; pedal ones locked). No extra row on the grid.
- D9 Part grid rows min 26 px (was 30): no scroll at either size with 0 safe areas; a notched 390 phone may scroll a little.
- D10 Kit sketch pad: the editor when a draft exists, else Quick song. View mode: editor only, read-only, ⋯ = metronome only.
- D11 Metal recipes add double-kick variants (`dk`) once the pedal is owned, so they stay ≥ 80 groove under loDK (genres.js:38).
- D12 Rock stays inside 90–160 bpm (no forced ballad style); "Lighter-waver" at 100 plays as "Big open chords".
- D13 Band jams, bots, rivals, starters, career songs: 1.2 exactly (`generate`/`jamGear`/`jam` untouched, v1 parts, no v1.3 fields).
- D14 "Surprise me" = `songs.surprise(…, seed)` seeded by the song slot + tap count; it stores concrete values (never `state.rng`).
- D15 Feel and Tempo never rewrite notes. Energy, Fills, Mood or another recipe recompose (with hand edits: Q3).
- D16 Save writes v1.3 fields only when set: compose sets them; an old song/draft opened and saved untouched stays 1.2 JSON. A v1
  part renders through `part.view` (v2 layout) and becomes v2 on its first part edit (write/sketch); view mode never writes.
- D17 The bubble's name sits on the avatar; `seq-tip` text never starts with "Name:" (pw_tutorial w1_write). D18
  `settings.songwriterMode` stays in 11:47 (ignored; tests may still set it).

## 1. Scope
### 1.1 Must
- M1 Quick song screen (S4, S7): 5 recipes per genre + "Surprise me", 5 sliders, ▶ Play / Tweak ✎ / Save ✓. A fresh Write block
  opens it with the genre's signature recipe (Save works at once). Replaces the guided steps (54:523–713, deleted).
- M2 Pure seeded generator `songs.compose` (best of K by `rate`), recipe + slider content for 4 genres, seat-safe words.
- M3 Part v2 rows (D4) with sound (30), rating (21), charts (22); v1 parts upgrade with identical sound and ratings.
- M4 Per-bar chords (`p.chords`, 4 chips, a chord sheet, "Chords/Hook: <name> ▾"). M5 Mood, Feel (audio + gig in sync), Fills, Energy.
- M6 One-flow editor (S6, S7): header ✕ / title / ⋯, underline tabs, meter strip with ± flash, coach bubble, toggle + chips, full
  grid, foot; ⋯ menu (jam, metronome, shop, practice, copy/clear, part tweaks, remove extra, Beat, Quick song).
- M7 The compatibility law + stage-0 fixtures; tests and tutorial moved to the new screens; 390x844 + 440x956, no h-scroll.
### 1.2 Nice-to-have (never blocks the merge)
- Hear a chord on chip long-press. `A.warm` after compose (KS instead of the oscillator on the first preview). Per-recipe coach line.
### 1.3 Deferred
- Hold-length drag, per-note techniques (S2). Key picker. Recipes, swing, fills for jams / bots / rivals. Rock ballad (D12). v1.4.

## 2. Reuse map (`0a2c3b8`; stage 0 re-audits)
| thing | where | reuse how |
|---|---|---|
| pattern whitelist | `21:254 sanitize` (part at 277) | + cleaners after 277 for chords/fillBars/mood/swing/recipe, only when present |
| v1 part model | `21:417 PART_ROWS`, `419 part.ROWS`, `421 ROW_NAMES`, `422 key` | unchanged (sim_seats:237 pins them); + `LAYOUT/UP/rowsOf/rowNames` |
| suggestion | `21:461 SUGGEST`, `484 SOLO_HITS`, `493 suggest` | v2 suggestion = v1 rows mapped through `UP` |
| part cleaning | `21:508 cleanSection`, `521 part.sanitize`, `532 full`, `539 toggle`, `545 pick` | n from `LAYOUT[v]`; `v` written only when 2 |
| part mods | `21:551 MODS`, `556 modRows`, `582 modify` | v2 rules: `ring` → Open row, `call` → next pitched row, skip Scratch |
| part rating | `21:606 partFeat`, `624 PART_FULL`, `630 partGroove`, `644 rateWithPart`, `656–663` hook, `672 PART_WEIGHT` | v2 role map; chord-array hook rule |
| drum rating | `21:106 features`, `140 barGroove`, `160 hookOf`, `192 rate` | Q2=1: fill bar weighting; else untouched |
| generators | `21:293 generate`, `309 jamGear`, `383 patternFor`, `841 jam` | **untouched** (STAGE0 + balance pin the RNG draw order) |
| groove ops | `21:997–1053` presets / applyPreset / presetOf / modify / tempoLabel | compose building blocks (genre passed explicitly) |
| arrangement | `21:37 ARRANGEMENTS`, `369 withExtras` | compose step 3 |
| similarity | `21:388` | parts compared in `part.view`; chord arrays when either side has chords |
| chart grid | `21:676 toNotes` | stays straight (no swing); Q2=1 bar-4 fills |
| create | `21:812` (part 819–820) | unchanged: a matching part is kept, drum seat drops the part |
| key / chords | `30:2405 A.keyFor`, `30:2430 progression` | chip names; `songs.chordsOf` mirrors the hash pick |
| part audio | `30:2832 PART_ROWS`, `2833 partOf`, `2840 partSec`, `2852 partBar` | v1 verbatim; v2 → new `partBar2` |
| timeline | `30:2917 A.timeline` (prog 2936, drum loop 2940–2950, root 2953, sort 2970, gaps 2972–2982, out 2984) | gated chords / mood / fills / swing |
| hard thirds | `30:2709` rock walk, `2719` train walk, `2722/2867/2880` country strums, `3203` seatPlay strum | `o.third` (set only for a non-native mood) |
| KS / taps | `30:2167 ksSpecFor`, `2191 A.warm`, `3192 seatPlay` | `dead` articulation; 54 calls `A.warm` after compose |
| feel | `31:177` accent step from `beat*4` | use `e.g` (grid beat) when present |
| drum chart | `22:367–411 gig.chart` (t 384, extras 388–397) | `t = swingBeat(beat)*spb`; extras skip fill bars |
| seat chart | `22:446–583` (where 456, toAuto 460, contour 463–470, flags 500, with 503, chords 536–539) | `e.g`; copy `dead`; singles power:false |
| gig sound | `55:619 seatSound` | copy `dead` |
| seq UI keep | `54:31 ui.LANES` (shared with 55:119/897, 5h:133), `36–67` tabs/extras, `76–99` seat helpers, `130 buildPartGrid`, `166 partPicker`, `188 layerSwitch`, `209–238` meters, `240 changed`, `247 buildGrid`, `274 paintable`, `327–374 songPanel` (minus 352–354), `382–438` playback, `389 songSeed`, `441 head`, `453 save`, `564 coachFor`, `756 composeWeek`, `780 firstTip`, `793 openSketch`, `811 openSong` | as is or lightly edited |
| seq UI rewrite | `54:100 PART_COLORS` (5 → 7), `121 partPreview` (hard rows → `rowPitch`), `152 partCycle` (→ toggle row), `176 partMods` (→ ⋯), `319 playhead` (→ chip highlight), `466–509 build`, `523–713` guided (delete), `716–750 seq-tools` (→ ⋯ menu), `816 debug` | §4.7 |
| seq CSS | `00_shell.html:333–411`, `874–883` (bg override 334, grid rows 357, guide-* 380–411) | delete 334 + guide-* except the card styles; restyle |
| seq callers | `52:277`, `52:577`, `53:65`, `5k:107–112 refreshSeq`, `5p:35–39, 297`, `5h:340–348`, `11:47` | 5h hook → ⋯ modal; rest unchanged |
| content | `grooves.js:21–192`, `genres.js` backing (metal 77–131, punk 177–200, rock 258–280, country 336–358), `zz_seats.js:391–405, 440–522`, `tutorial.js:111–137` | new keys only (never edit backing values, signature, starter, parts, progressions, hooks, tempo) |
| pinned tests | `sim_audio:497–542` STAGE0, `:615` backing tables, `sim_seats:235–256`, `pw_seq:64–75` audit, `184–190` geometry, `276–292` save equality, `1030`, `content_tutorial:56–64`, `tools/audio_hashes.js`, `tools/perf.js:593` | stay green |

## 3. Stage 0 (lead, one commit on `v1.3-songwriter` before the lanes fork)
1. **Re-audit** the §2 lines on the tree; fix the table.
2. **Fixtures FIRST (before ANY `src/` edit):** `tools/make_fixtures_v12.js` (node, DOM-free via `tests/_load.js`) →
   `tests/fixtures/v12_songs.json`:
   - corpus per genre: signature (+ solo + outro), starter, `generate(RNG(101..103))`, `generate(RNG(7), full gear)`, 3 jammed
     careers per seat (`songs.jam`, v1 parts), part edge cases (every prog/hook index per section, empty rows, all-x rows, a
     4-row bass, prog 99), and every song in `tests/fixtures/save_v01.json` + the `v09_*/v10_*.json.gz` saves;
   - per entry: **SAN** H16 of `JSON(sanitize(p, gear, genre))` (4-lane no pedal + full gear), **RATE** the whole `rate()`
     object (tips included) + `partRating`, **NOTES** H16 `toNotes`, **CHART0** H16 `gig.chart` (4 difficulties × lanes {4, gear
     cap}, fixed extras rng) + `seatChart` per string seat, **PART0** H16 `A.timeline({ seat, part })` per seat at the song's bpm
     and 80/140/200, **SIM** H16 of the per-genre similarity matrix;
   - **SAVE0**: every fixture save loads through `10_save`; per song H16 of `JSON(pattern)` and the stored rating.
   - `tests/compat_v12.test.js` recomputes all of it == fixture (in the suite forever). STAGE0 (sim_audio:497) stays as is.
   - Classic: `META_ONLY=hash timeout 500 node tests/pw_seq.js` → 232/232 equal to `audio_v11_hashes.json`.
   - Optional: `tools/audio_hashes.js --classic-off --out tests/fixtures/audio_v12_off.json` (4 signatures, full mix): keep it
     only if 3 runs are byte-identical; else note it in the report.
3. **`VERSION` = `1.3.0.0`** (SAVE_SCHEMA stays 10).
4. **`src/02_contracts.js`**: V1.3 SONGWRITER block (§4 shapes as comments), `C.SWING = [0, 0.04, 0.083, 0.125, 0.1667]` (beats
   added to the off-8th; stop 4 = triplet), `C.SONG_SLIDERS` (§4.3 ids, names, end labels), `C.PART_V2 = { bass: 6, rhythm: 6,
   lead: 7 }`, `C.QUICK = { k: 8, debounceMs: 150, warmMs: 400 }`, `C.SEQ_PART_ROW_MIN = 26`.
5. **21 contract code** (gated; `compat_v12` green after it): the §4.1 sanitize cleaners; `part.LAYOUT/UP/rowsOf/rowNames/upgrade/
   view/rowPitch`; `songs.swingBeat`; `songs.chordsOf`; `songs.NOTE` + `chordLabel`; stubs with the final signatures: `compose`
   (signature + requested bpm + fields, no K), `recipes` (the signature as one recipe + surprise), `surprise`, `sliders`,
   `progName`, `moodOf` → null, `nativeMood` → 0. Lanes S/A/U build on these from minute one.
6. **One owner popup** with §8 Q1–Q3 → record in §0 and status Addendum 5.
7. **Tests:** `compat_v12`; `sim_songs` + "v1.3 fields survive sanitize only when present; absent → the 1.2 JSON; idempotent";
   full node suite; `pw_seq hash`. Report `plan/v13_stage0_report.md` (≤ 40 lines). Commit, push, fork the lanes.

## 4. Shared contract (every lane codes against this)
### 4.1 Data (all v1.3 keys optional, numbers are ints; sanitize writes each one only when present and valid, in this key order after
`part`: `chords, fillBars, mood, swing, recipe`; the loose path (genre null: timeline, chart, toNotes) keeps them too)
- `p.chords = { verse?|chorus?|bridge?: [s0, s1, s2, s3] }`, s = int 0..11 semitones above the tonic, one per bar (the unit of
  `backing.progressions`). Only for sections the pattern has; never solo/outro.
- `p.mood` int 0..4 (Mood stop; absent or `== nativeMood(genre)` → the 1.2 sound). `p.swing` int 0..4 (Feel; absent/0 → straight).
- `p.fillBars = { <section>: [laneStr × lanes] }` (**Q2 = 1 only**): bar 4 of every entry of that section; cleaned like a section
  (kick rule unless loose); only for sections the pattern has.
- `p.recipe = { id: /^[a-z0-9-]{1,24}$/, seed: int ≥ 0, energy: 0..4, fills: 0..4 }`: provenance for Quick song (restores the
  sliders: energy/fills here, mood/swing/bpm on the pattern). Never rated, never played.
- **Part v2** `{ seat, v: 2, sections: { <name>: { prog|hook: int, rows: [16 chars × C.PART_V2[seat]] } } }`. `v` is written only
  when 2, so a v1 part's JSON is byte-identical to 1.2 (and a 4-row v1 bass still clips to 3, sim_seats:248).
  `part.LAYOUT[2] = { rhythm: [Chug, Open, Root, 5th, Oct, Scratch], bass: [Low 5th, Root, 3rd, 5th, 7th, Oct], lead: [Low, 1, 2,
  3, 4, 5, High] }`; `part.UP = { rhythm: [0, 1], bass: [1, 3, 5], lead: [1, 2, 3, 4, 5] }` (v1 row i → v2 row UP[i]).
- **Row meaning (v2, per 16th step):** rhythm `mask & 3` → the v1 rule verbatim (1 chug, 2 open, 3 accent); Root/5th/Oct →
  single notes (`power: false`), added to a chug/open on the same step; Scratch alone → a dead strum at the root (`mute`,
  `dead: true`, ≤ 1 step), ignored when any other row is set. Bass: the lowest set row → root + [−5, 0, third, 7, seventh, 12].
  Lead: the highest set row → scale degree [deg0 − 1, deg0..deg4, deg4 + 1] of the mood's scale (v1 bend rule). third/seventh
  come from `moodOf(genre, mood)` or the native rung (= what 1.2 plays: metal 3, punk/rock/country 4; seventh 10).

### 4.2 Sim API (21; pure, DOM-free, no `GG.state`, genre always explicit)
- `songs.swingBeat(beat, s)` → identity when `!s` or the beat is whole; per beat piecewise linear 0→0, ½→½ + C.SWING[s], 1→1.
- `songs.chordsOf(p, name, genre, { part, seat }?)` → [4]: `p.chords[name]` > the part's prog (when the part applies to that seat
  and seat ≠ lead, as 30:2936; a raw part is read defensively like 30:2833–2849) > the 1.2 hash pick (= 30:2430). Never writes.
- `songs.chordLabel(genre, mood, tonic, semi)` → `'E5' | 'Em' | 'E'` (power-chord genres '5'; else the triad in the rung's scale).
  `songs.progName(genre, seat, name, p, opts)` → the progNames/hook name whose array equals `chordsOf`, else 'Custom'.
- `songs.moodOf(genre, mood)` → rung | null (null = absent/native). `songs.nativeMood(genre)` → int.
- `part.rowsOf(pt)`, `part.rowNames(pt)`, `part.upgrade(pt)` → v2 copy (same sound, same ratings), `part.view(pt)` (v2 as is, else
  upgrade), `part.rowPitch(genre, seat, row, { mood, deg })` → semitones over the bar root (bass/rhythm), scale degree (lead), or
  `'dead'`. 30 (partBar2) and 54 (partPreview) both use it: one source of truth.
- `songs.recipes(genre, gear, seat)` → `[{ id, name, desc, locked, lockLabel, bpm, sliders: { energy, mood, swing, fills } }]`,
  "Surprise me" last; `locked = pedal && !gear.doubleKick`; `lockLabel` = the pedal's name for the seat (zz_seats:391–405).
- `songs.sliders(genre, seat)` → `[{ id, name, lo, hi, stops: [5 labels] }]` (+ tempo `{ min, max, step: 5 }`).
- `songs.surprise(genre, gear, seat, seed)` → `{ recipe, energy, mood, swing, fills, bpm }` (unlocked recipes only).
- `songs.compose(genre, { recipe, energy, mood, swing, fills, bpm, seed, gear, seat })` → sanitized PATTERN with `chords, mood,
  swing, recipe` (+ `fillBars` if Q2 = 1, + a v2 part on string seats). Steps: (1) recipe (locked/unknown → the signature recipe);
  `rng = GG.RNG(GG.hashSeed('compose|' + genre + '|' + id + '|' + seed))`; (2) bpm rounded to 5, clamped to the genre tempo;
  (3) arrangement `ARRANGEMENTS[arr]` + `withExtras(gear)`; (4) drums: preset bar + recipe mods (+ `dk` when the pedal is owned),
  `grooveFx.energy[energy]`, fills per Q2; (5) chords = `progressions[sec][parts.prog[sec]]` remapped by the rung → `p.chords`;
  (6) string seat: v2 part = SUGGEST through `UP` + recipe part mods + `grooveFx.partEnergy[energy]`, onset caps 12/14/12
  (bass/rhythm/lead; PART_FULL stays); (7) K = `C.QUICK.k` variants (0 = no nudge, i > 0 = one seeded hit/row nudge) → keep the
  best groove + hook by `rate` (ties → lowest i). Same args → same JSON; a slider moved and moved back → the same song.

### 4.3 Content (new keys only)
- `grooves[g].recipes = [{ id, name, desc (≤ 28 chars, seat-safe), pedal?, bpm, arr: 'short'|'classic'|'epic', drums: {
  verse|chorus|bridge: [presetId, ...modIds] }, dk?: { <section>: [modIds] }, sliders: { energy, mood, swing, fills }, parts: {
  prog: { verse, chorus, bridge }, hook: { verse, chorus, bridge }, mods?: { <section>: partModId } } }]`, ≥ 5 per genre:
  metal Neck-snapper 180, Doom crawl 75, Thrash attack 200, Stadium anthem 140, Gallop 165 (pedal); punk Three-chord sprint 190,
  Laundromat D-beat 185, Pogo party 175, Circle pit 220, Skate rat 205; rock Arena anthem 125, Lighter-waver 100, Bar boogie 115,
  Bleacher stomp 118, Highway driver 145; country Train song 112, Legion two-step 95, Sad waltz 85, Barn burner 120, Porch swing 88.
- `grooves[g].sliders = { energy|mood|swing|fills: [5 stop labels] }` (+ `bySeat` where a label has drum words, e.g. rock fills 4
  "Drum solo, sorry" is drum-seat only). End labels in `C.SONG_SLIDERS`: Energy "Sparse · easy" / "Busy · show-off"; Mood "Bright"
  / "Dark"; Feel "Straight" / "Swing"; Fills & surprises "None" / "Lots"; Tempo "Slow" / "Fast" (value "N bpm · " + tempoLabel).
- `GG.content.grooveFx = { energy: [OPs × 5], partEnergy: [partModId|null × 5], fills: [{ sections, ops } × 5], partFills: [× 5] }`
  (Energy 0 keeps ≥ 8 drum hits per bar and a chorus ≥ 8: rating floors 21:149, 21:172).
- `backing.moods = [5 × { id, mode, scale (length == backing.scale: metal 7, punk 7, rock 6, country 5), third, seventh, remap?:
  { <semi>: semi } }]`, `backing.moodNative` = the rung equal to today's `mode/scale` (metal 2, punk 1, rock 2, country 1).
- Coach: `grooves.coach.quick` (neutral; never /lawn|French|neck/) + `grooves[g].coach.quick` + `zz_seats` `coach.bySeat.quick`.

### 4.4 Rating rules (S5)
- `rate()` reads notes only: sections, arrangement, bpm, lanes, part rows, chords (only via the part hook's contrast rule), fillBars
  (Q2 = 1: a section counts ¾ main bar + ¼ fill bar in groove/difficulty features; hook unchanged). Never recipe/mood/swing.
- v1 path verbatim (RATE fixture). v2 `partFeat` reads roles through `part.ROLE[seat]` = sets of v2 rows (the UP image of the v1
  row + new ones: rhythm root += Root, fifth += 5th, chug += Root/5th/Oct; bass fifth += Low 5th). Gate: `rate(upgrade) == rate`
  over the whole corpus.
- Scratch is an onset (fit/busy), never `odd`; a bar of only Scratch × 0.6 (no pitch). Hook contrast with v2 or chords: compare
  `chordsOf(verse)` vs `chordsOf(chorus)` arrays (1.2 compares indexes, 21:662). Similarity: chord arrays when either side has them.
- Ceiling (content.test): every recipe at its default sliders groove ≥ 80 and hook ≥ 65 on 4 lanes without pedal AND full gear;
  per genre ≥ 2 recipes reach groove ≥ 90 + hook ≥ 85 at some setting; no single-slider extreme drops groove below 55.

### 4.5 Audio rules (30, 31)
- Chords: after 30:2936 `if (CH && CH[name]) prog = CH[name]` for every seat incl. lead and drums (precedence chords > part prog >
  hash); `break` and ring bars keep the tonic (D7). 30 calls `songs.chordsOf` so 54's chips never disagree.
- Mood (non-native only): `B = Object.assign({}, B, rung overrides)`, `key = Object.assign({}, key, { mode, name })`, `o.third`
  set; the hard-coded thirds read `o.third` with the old literal as fallback. Native/absent: `B`, `key`, `o` untouched.
- Swing (`p.swing > 0` only): after the events are built and before the sort (30:2970), every non-`step` event with a moved
  `swingBeat` gets `e.g = old beat`, `e.beat = warped`, `len` = warped end − warped start; `step` events never move; gaps follow.
  `player() at()` and `renderOffline` stay as they are. 31:177 uses `e.g ?? e.beat`. FEEL_CLAMP untouched (swing is not feel).
- Fills (Q2 = 1): the drum loop reads `p.fillBars[name]` on bar 4 only; `o.sec`, the progression hash and the riff stay on the main bar.
- Part v2: `partSec` takes n from `part.LAYOUT`; `partBar2` (new) for v2 with `rowPitch`; Low 5th may sit up to 7 semitones under
  `bassFloor` (v2 only); `partBar` (v1) verbatim. `dead` → `ksSpecFor` art `'dead'` (short t60), seatPlay accepts it; Classic on →
  the mute recipe. New keys (`g`, `dead`, `key.mood`) exist only when their field caused them.

### 4.6 Gig rules (22, 55)
- **Q1 = 1 (contour):** lanes stay the pitch contour (22:463–470) on the rig's 4–6 lanes (= gear, never rows); new rows are just
  pitches; Scratch has `midi` = root (+ `mute`, `dead`), so it charts on the root's lane; singles are `power: false`, so Hard+
  never turns them into 2-lane chords (22:538). Copy `dead` at 22:460, 22:500, 22:503 and 55:623. **Q1 = 2/3:** v2 part events
  carry `row`; `seatChart` maps row → lane (2: `floor(row·L/rows)`; 3: L = rows) for v2 only; "same pitch = same lane" gated to v1.
- Swing: drum chart `t = swingBeat(n.beat, p.swing) * spb` (22:384, extras 22:395); `where()` uses `e.g ?? e.beat`. Windows follow
  `note.t`; doubles/thin/two-thumbs see the real gaps; beat lines, count-ins, sections, fill windows never move.
- Fills (Q2 = 1): toNotes brings them into the drum chart; extras skip a bar with a fill; free windows (last bar of bridge/outro)
  stay free. Rivals (59d:327, 407–411) never carry swing or fills: unchanged.

### 4.7 UI contract (54, 00_shell CSS)
- `D.screen = 'quick' | 'edit'`. write: fresh block → quick (signature recipe composed, first-Write tip in the bubble), a queued
  sketch (`fromSketch`) → edit. sketch: D10. view: edit only. `D.mode` values stay (5p:297, tutorial.js:111); listeners stay on the
  screen entry (54:510–516); `e.rerender()` keeps `screen/layer/tab` (5k refreshSeq).
- **Header 48 px:** ✕ `btn-seq-close`, title `seq-title` + subtitle ("Write block n of m · <part>"), ⋯ `btn-seq-tools`.
- **Quick:** meter strip, coach bubble, "Start from a recipe", 2-column cards `quick-recipe-<id>` (aria-pressed, data-locked; a
  locked tap = toast with `lockLabel`), sliders `<input type=range>` `quick-energy|mood|feel|fills|tempo` (value label
  `quick-<id>-val`, end labels, per-slider accent), foot ▶ Play `btn-guide-play` (kept for the tutorial), Tweak ✎ `btn-quick-tweak`,
  Save ✓ `btn-seq-save` (sketch: `btn-seq-use`). Slider `input` updates the label; `change` (or `C.QUICK.debounceMs` idle) →
  compose → `changed(D)` → playing ? `handle.update` (same bpm + beats) : restart. Card tap → that recipe's default sliders.
  Surprise → `songs.surprise`.
  `D.edited` = no `p.recipe`, or `JSON(compose(p's settings)) !== JSON(sanitize(D.pat))` at quick entry; Q3 decides the rest.
- **Edit:** underline tabs `seq-tab-<name>` (+Solo/+Outro `seq-add-*`, Song tab = songPanel minus 352–354), meter strip
  `meter-groove|hook|difficulty` (`data-value`, `data-delta` flash ± for 1.2 s), coach bubble `seq-coach` (avatar
  `ui.avatar(who,'sm')`, text `seq-tip`; priority D.hint > rating tips > coachFor; tap → full tip modal `seq-tip-full`), toggle row
  `seq-layers` / `seq-layer-part` / `seq-layer-drums` + `seq-chords` ("Chords: <name> ▾" / "Hook: <name> ▾" → sheet with
  `part-pick-<i>`), chips `chord-chip-<0..3>` (`data-semi`, `data-home`, `data-locked`; tap → sheet `chord-opt-<semi>` with the
  rung's chord roots + `chord-reset` "Back to <name>"), grid `seq-grid` / `part-grid` (`cell-<lane>-<step>`, `part-cell-<row>-<step>`,
  `data-lanes`), foot ▶ Loop `btn-seq-loop`, ▶ Song `btn-seq-song`, Save ✓ `btn-seq-save` | Use in next Write `btn-seq-use`.
  Playhead = the grid row + the current bar's chip. Old part, no chords → chips derived, nothing written until a chip/picker edit.
- **⋯ menu** (modal id `seq-tools`, opener `btn-seq-tools`): `btn-seq-jam` (write), `btn-seq-metro` (all modes; `dataset.on` +
  `aria-pressed` kept), `btn-kit-shop` + `kit-practice` (sketch; 5h listens on this modal's `ui:layout`), `btn-seq-quick`,
  `btn-seq-beat` → sheet `seq-beat-<presetId>`, `seq-copy-<from>`, `seq-clear`, `part-mod-<id>`, `part-clear`, `seq-remove-<extra>`,
  Q2 = 1: `btn-seq-fill` ("Bar 4 fill": the grid edits `p.fillBars[tab]`, the tab reads "Chorus · fill").
- Gone: guided steps, `btn-guide-*` except Play, `guide-*` testids, `btn-tell-drummer`, `btn-seq-guided`, prefMode/GSTEPS/
  GNAMES/ORDER_BLURB, the `.full.seq` background (00_shell:334), guide-* CSS except the card styles (reused by recipe + Beat cards).
- Sizes (0 safe areas): every `#screens` button ≥ 44 × 44 (pw audit 43.5); header 48, tabs 45, meters 18, coach 44, toggle 44,
  chips 44; part grid rows `minmax(26px, 1fr)`; drum seat cells ≥ 60 × 30 at 390 (~33.6 px rows); no scroll in any editor case at
  440x956; `.seq-main` scroll ≤ 1 at 390x844 (drum seat, string part layer ~27 px rows, Drums layer ~30 px); Quick ≈ 752 / 780 px at
  390 (3 card rows × 58, 5 sliders × 72): > 6 cards scroll. PART_COLORS ≥ 7.
- Tutorial: `tutorial.js` w1_write points at `btn-guide-play` (every layer) and at `btn-seq-tools` for the jam ("Stuck? Tap ⋯ and
  let the band jam one"); never at `seq-grid` or a button inside the closed menu. `T.suppressWriteTip` still gates `firstTip`.

### 4.8 Debug
`debug('seq')` = `{ mode, screen, tab, layer, seat, playing, title, rating, playhead, part, recipe, sliders: { energy, mood, feel,
fills, bpm }, chords: { <section>: [4] } (effective), chips: [names], edited, compose: { ms, k } }` (`guided`/`step` removed).
`debug('audio')` += `swing`, `mood` of the last timeline.

### 4.9 Size + perf budgets
`dist/game.html` ≤ 6,000,000 B (today 5,120,731; v1.3 net ≤ +80 KB after the guided flow goes). `compose` ≤ 20 ms (node, median
of 50); slider release → new loop audible ≤ 300 ms at 4× CPU throttle (pw_perf probe `quick`); gig frame p95 ≤ 1.1 × 1.2.0.0;
KS cache cap unchanged; no new console errors.

## 5. Lanes (3 agents, medium effort; isolated copies; never publish)
Isolation: `cp -r repo /work/<lane>`, branch `v13-<lane>` from the stage-0 commit, work + test there. **Single file ownership**;
anything outside your files is a hand-over request. Return: the branch (pushed as `wip-v13-<lane>`) + a ≤ 40-line report
`plan/v13_lane_<s|a|u>_report.md` (APIs as built, tests + results, numbers, hand-overs).

### Lane S — SIM + CONTENT
- Owns: `src/21_sim_songs.js` (after stage 0), `content/grooves.js` (recipes, sliders, grooveFx, coach.quick), `content/genres.js`
  (`moods`, `moodNative` keys only), `content/zz_seats.js` (coach.bySeat.quick, lock labels); tests `sim_songs`, `sim_seats`,
  `content.test`, `content_seats.test`; `tools/seat_audit.js` word lists.
- Tasks: S1 v2 suggest / modRows / partFeat roles / hook + similarity chord rules; S2 compose / recipes / surprise / sliders /
  chordLabel / progName / moodOf for real; S3 Q2 fillBars in sanitize / validate / toNotes / rate; S4 the 20 recipes, 4 × 5 rungs,
  slider labels, coach lines (no USA, no drum words on string seats, neutral lines never /lawn|French|neck/).
- Tests: `compat_v12` green; `rate(upgrade(pt)) == rate(pt)` and SAN idempotent over the corpus; compose pure / deterministic /
  slider round trip / no `GG.state` read (state null) / drum seat has no part / locked recipe falls back; Surprise determinism;
  swingBeat (integers fixed, monotonic, s = 0 identity); §4.4 ceiling numbers per recipe (log them in the report).

### Lane A — AUDIO + GIG
- Owns: `src/30_audio.js` (timeline, partSec / partBar2, `o.third` sites, ksSpecFor / seatPlay `dead`), `src/31_audio_feel.js`
  (grid beat), `src/22_sim_gig.js` (swing, `where()`, `dead`, fills × extras / free windows, Q1 branch), `src/55_ui_gig.js`
  (seatSound `dead` only); tests `sim_audio`, `sim_feel`, `sim_gig`, `pw_gig` (new section `swing`), `pw_seat_audio`.
- Tests: STAGE0 + PART0 + CHART0 equal; neutral fields (mood native, swing 0, chords == the auto progression, no fillBars) ==
  STAGE0; chords move the root for every seat incl. lead; mood changes mode/scale/thirds, not the key note; swing: integer beats
  fixed, steps unmoved, `g` only on moved events, gaps in swung beats; every swung drum-chart `t` == its timeline time;
  `timeline(upgrade(pt))` == `timeline(pt)` per seat × genre; Scratch carries `dead` + midi; singles never chords on Hard+;
  `pw_gig swing` (bot perfect = 1, sync green) + `sync`, `feel`, `bridge`, `seat`, `chord` green.

### Lane U — UI
- Owns: `src/54_ui_sequencer.js`, `src/00_shell.html` (seq CSS only), `src/5h_ui_settings.js` (practice hook), `src/5k_ui_shop.js`
  (refreshSeq), `src/5p_ui_tutorial.js`, `content/tutorial.js`; tests `pw_seq`, `pw_seats`, `pw_shop`, `pw_flow`, `pw_tutorial`,
  `pw_settings`, `content_tutorial.test`, `tests/_pw.js` (helper `openTools(page)`), `tools/phoneqa.js`.
- Tasks: U1 Quick screen; U2 edit layout + bubble + strip + chips + chord sheet + picker; U3 ⋯ menu (ids above, 5h hook); U4
  partPreview via `rowPitch`, PART_COLORS 7, `part.view` + upgrade on first edit; U5 CSS (Clean sheet, navy, 26 px rows); U6
  tutorial content + tests.
- Tests: `pw_seq` sections `seq` (open ⋯ for metro / jam; drum geometry; save byte-equality: saved pattern ===
  `sanitize(D.pat)`, view pat === saved), `quick` (replaces `guided`: recipes, lock, sliders, Surprise twice = same, Play, Tweak,
  Save, Q3 flow), `part` (6/6/7 rows, chips, chord sheet, picker, mods in ⋯, upgrade on first edit only, view read-only), new
  `layout` (both sizes: every editor case and Quick, no scroll at 440x956, ≥ 44 buttons, no h-scroll, shots tagged `_440`);
  `pw_seats write`, `pw_shop gear` (quick instead of guided steps), `pw_flow` jam via ⋯, `pw_tutorial` w1_write, `pw_settings`
  kit-practice via ⋯, `content_tutorial` (btn-guide-play in every layer, no seq-grid point), `phoneqa` (⋯ before btn-kit-shop).

### Lead — stage 0, wiring, review
- Owns: `02_contracts`, `11_settings`, `build.js`, `VERSION`, `tests/fixtures`, `tests/compat_v12.test.js`, `tools/` (except
  `seat_audit.js`, `phoneqa.js`), `plan/`, the merge, the clips, the owner popups, status.

### Cross-lane hand-overs (files stay single-owner)
- A → S: `part.rowPitch` / `moodOf` semantics are the stage-0 contract (a change is a request, never an edit in 21). U → S: compose
  timing (§4.9) + the debug `compose` numbers. U → A: none expected (U calls `A.warm` after compose).
- Requests go in the report's "Hand-overs" with the function, the behaviour and a test; the lead applies them at the merge.

## 6. Merge order and release checklist
1. Stage 0 (fixtures FIRST, popup answered). 2. Lanes S, A, U in parallel (one message). 3. Merge S, then A, then U; hand-overs.
4. Node suite ALL PASS incl. `compat_v12` + STAGE0; Classic 232/232 (`pw_seq hash`); optional `audio_v12_off` equal.
5. Full Playwright matrix at 390x844 and 440x956 (`PW_VIEW=440x956`): every `tests/pw_*.js` section; `tools/phoneqa.js` at both
   sizes; no horizontal scroll; the button audit. 6. Size gate (`tools/perf.js`) ≤ 6,000,000; `pw_perf` incl. `quick`;
   `tools/seat_audit.js` (no drum words on string seats); content.test no-USA scan.
7. Owner check (one popup: ship / tweak): screenshots at 440x956 (Quick song on the drum seat and on rhythm; editor rhythm part
   with chips; lead; drum seat; ⋯ menu; chord sheet) + the rhythm editor at 390x844; clips `tools/audio_clips.js --v13` (~8 s
   `.m4a` per genre: default recipe; metal + rock: Energy 0/4, Mood 0/4, Feel 0/4, Fills 0/4) → `tests/.cache/v13_clips/`.
8. Review pass (≤ 3 lenses: compatibility, layout/UX, determinism); verify only blocker/major findings.
9. PR to `main`; status: Version, What's in v1.3, APIs, Addendum 5 ticked; publish to the same artifact URL.

## 7. Risks
- **Old songs drift** (a cleaner writes a default, an event gains a key) → the compatibility law, `compat_v12`, STAGE0, Classic
  hashes, neutral-field tests; reviewers diff JSON, not ears.
- **Taps and band drift apart under swing** → one pure warp in 21 used by the timeline and the chart; the per-note equality test.
- **Rating inflation** (slider songs too easy to top) → difficulty stays honest (same features); ratings logged per recipe; the
  career impact goes to v1.4 Tuning (player songs only; bots unchanged by D13).
- **Phone height** (notch ≈ 81 px at 390) → 26 px rows, a small scroll there is accepted (D9). **Test + tutorial churn** → ids
  kept, `openTools` helper, U owns every affected test.
- **Chip names move with tempo** (metal tuning per band, genres.js:82) → chips always read `keyFor(seed, genre, bpm)`. **New
  pitches play the oscillator first** (only the gig warms KS) → `A.warm` after compose. **Low 5th folds** (bassFloor, 30:2569) →
  the v2-only allowance (§4.5) + a test in low metal keys. **Size** → content ≈ 15 KB, the guided flow goes, gate at every merge.

## 8. Owner questions (stage 0, ONE popup, recommended first)
**Q1. Your new guitar rows in a gig: which highway lane does a note land on?**
1. *(recommended)* Keep the pitch shape: low notes left, high notes right, folded onto the lanes your rig has (4–6). The gig code
   needs no change; new rows just add pitches. Why: zero risk to the 1.2 charts, playable at 390 px, the 4-lane start still works.
2. One fixed lane per row, folded when the rig has fewer lanes (Chug always far left). Predictable, but the melody shape is lost;
   ~50 lines + a version gate in the chart.
3. One lane per row: 6 lanes from day one, whatever your gear. Changes the shop's lane upgrades and the 4-lane start.

**Q2. Fills & surprises: where do the drum fills go?**
1. *(recommended)* A real fill on bar 4 of each section (a new optional fill bar: the slider writes it, ⋯ → "Bar 4 fill" lets you
   paint it). Sounds like a drummer; old songs unchanged; ~150 more lines across sims, audio and gig. Why: the slider exists to
   make songs sound different, and a fill repeated on all 4 bars sounds like a busy beat, not a fill.
2. Inside today's one-bar loop (cheapest, no new data): "Lots" means the fill plays on every bar of the section.

**Q3. You hand-edited a section, then move Energy, Fills or Mood, or pick another recipe. What happens?**
1. *(recommended)* Ask first: "Start over from this recipe? Your hand edits go." (Start over / Keep my edits). Why: one rule,
   nothing is lost by surprise, and the generator stays simple (Feel and Tempo never ask: they don't touch notes).
2. Rebuild only the sections you have not touched (keeps edits silently; harder to explain, more state to track).
3. The sliders lock after a hand edit until you tap "Start over".
