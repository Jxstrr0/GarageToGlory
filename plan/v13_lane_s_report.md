# v1.3 "Songwriter" Lane S report (SIM + CONTENT, contract §5 Lane S, tasks S1-S4)

Branch `wip-v13-s` (from `v1.3-songwriter` stage 0 `0d42d53`). Files: `src/21_sim_songs.js`, `src/content/grooves.js`, `src/content/genres.js`
(mood `id` + `remap` only), `src/content/zz_seats.js`; tests `sim_songs`, `sim_seats`, `content`, `content_seats`. `dist/` NOT committed
(rebuild at the merge). `tools/seat_audit.js` unchanged (no new drum vocabulary needed).

## APIs as built (21; pure, DOM-free, never reads `GG.state`, genre always explicit)
- **S1 part v2.** `part.suggest(genre, seat, section, rng?, v?)` / `part.full(genre, seat, pattern, rng?, v?)`: `v === 2` -> the same notes
  through `UP`; without `v` the 1.2 output byte for byte (IN fixture). `part.modify` on a v2 part uses v2 rules: `lock` never picks Scratch as
  the busy row (empty part -> home row), `double` never doubles a Scratch-only onset, `ring` = downbeats + chug -> Open (rhythm) + no Scratch +
  home-row fallback, `call` answers one pitched row up (`CALL2` rhythm Chug->Open, Open/Root->5th, 5th->Oct, Oct stays, Scratch->Scratch;
  bass/lead r+1). Compose-only v2 ids (not in `part.MODS`): `sparse`, `eighths`, `busy`, `pickup`, `scratch`, `walk`, `octave`, `fifths`.
  v1 parts: the 1.2 `modRows` path verbatim. Scratch in `partFeat2`: an onset (hits / lock / steady8), never `odd`; Scratch-only bar x 0.6.
- **S3 fillBars (Q2 = 1).** `validate` (only when present): sections the pattern has, `lanes` x `[x.]{16}`, kick pairs need the pedal.
  `toNotes`: bar 4 of every entry plays the fill; those notes carry `fill: true` (the key exists only then). `rate`: 3/4 main + 1/4 fill
  (`FILL_W`) in groove (tips weighted alike) and difficulty (effort / odd); `notes` = 3 main bars + the fill; hook unchanged; absent -> the
  1.2 arithmetic in its own branch (no float drift; compat_v12 green).
- **S2 Quick song.** `recipes(genre, gear, seat)` -> 5 cards + `{ id: 'surprise', name: 'Surprise me', surprise: true }`; `locked = pedal &&
  !gear.doubleKick`; `lockLabel` = the seat's pedal name (shop gear `pedal`: drums 'Double-kick pedal', string seats `bySeat[seat].names[genre]`
  from zz_seats), null when no pedal; card `bpm` = the composed tempo on a 5 (Bleacher stomp 118 -> 120, Train song 112 -> 110, Porch swing
  88 -> 90; content keeps the contract numbers). `sliders(genre, seat)`: C.SONG_SLIDERS order, `grooves[g].sliders`, `.bySeat[seat]` wins
  (rock fills 4 'Drum solo, sorry' = drum seat only); tempo `{ min, max, step: 5, stops: null }`. `surprise(genre, gear, seat, seed)` ->
  `{ recipe (unlocked), energy 1..4, mood 0..4, swing, fills 0..4, bpm (recipe +-15 on a 5) }`, rng = `hashSeed('surprise|' + genre + '|' + seed)`.
  `compose(genre, o)` (§4.2 steps 1-7): K = `C.QUICK.k` plans drawn BEFORE any slider is read; per section a block (`drums[s]` or an
  `alt[s]`), two flavours (`grooveFx.flavors` = a time shape, `flavors2` = a kick / snare touch), a hat -> ride swap (4 lanes -> crash where
  `swap4` allows), the fill's alternate, the part mod alternates. Variants are rated **at the recipe's tempo** (Feel + Tempo never change the
  winner, D15); the rng picks one >= 80 / 65 (none: best groove + hook); then the slider tempo is set. Locked / unknown -> the first
  (signature) recipe, `p.recipe.id` = the one used. Output = `sanitize(p, gear, genre)` + `chords` (progChords of `parts.prog` at the mood,
  break bars home), `fillBars` (only when the Fills stop writes one), `mood`, `swing`, `recipe { id, seed, energy, fills }`, a v2 part on
  string seats (part.full(.., 2) + prog / hook + mods + partEnergy / partFills, onsets capped 12 / 14 / 12); drum seat: no part.
- New OPs: `{ op: 'roll', from, to?, every? }` (toms if the kit has them, else snare; time-keeping stops under it), `{ op: 'swap', from, to,
  alt? }`. OP lists may name op ids (strings): resolved in `grooves[g].mods`, `grooves[g].ops`, `grooveFx.byGenre[g].ops`, `grooveFx.ops`.

## Content as built
- `grooves[g].recipes` x 5 (contract names + tempos; first = signature; metal Gallop `pedal`): `drums` / `alt` / `dk` (metal: 16th kicks with
  the pedal, D11) / `sliders` / `parts { prog, hook, mods, alt }` (a mod may be `{ <seat>: id }`). New keys: `grooves[g].bars`, `grooves[g].ops`,
  `grooves.surprise { name, desc }`. `grooves[g].sliders` in prairie words (metal Lumbering..Unholy / Heroic..Abyss, punk Lazy Sunday..Fastest
  / Sunny..Gloomy, rock Slow burn..Showboat / Sunny..Dark, country Porch..Barn burner / Sweet..Heartbreak).
- `GG.content.grooveFx = { energy[5], partEnergy[5], fills[5] { sections, ops, alt?, partSections? }, partFills[5], swap4, swap6, flavors,
  ops (time shapes t-h8 / t-c8 / t-h16 / t-hq / t-off / t-h8c4), byGenre { <g>: { energy, fills, swap4, flavors, flavors2, ops } } }`.
  Extensions beyond §4.3 (new keys only): flavors, flavors2, swap4, swap6, ops, byGenre, fills[i].alt / partSections.
- Moods: metal heroic {1:5,3:4,6:7,8:9} / grim {1:3,6:7} / midnight* / sinister / abyss {7:6}; punk sunny {3:2} / cheery* / gritty {7:10} /
  bitter {5:3,7:10} / gloomy {5:8,7:10}; rock sunny {3:4,10:7} / bright {10:9} / bluesy* / moody {9:8} / dark {5:1,9:8}; country sweet
  {7:2,9:5} (rung 0 = native scale, differs by remap) / sunny* / dusty {7:10} / lonesome {2:3,9:8} / heartbreak {5:8,9:8} (* native).
  Every recipe x mood keeps verse != chorus chords (hook gate; tested).
- Coach: `coach.quick` (neutral), `coach[genre].quick`, zz_seats `coach.bySeat[seat].quick` + `coach[genre].bySeat[seat].quick`: colon-free,
  <= 120 chars, no drum words on string seats, neutral lines name nobody / never lawn|French|neck; each band has a speaker who is not the
  member the seat moves.

## Tests and results
- `sim_songs` 32 (22 stage-0 + 10 Lane S): the 708-entry 1.2 corpus (SAN idempotent on 3 paths, no v1.3 key, rate(upgrade) == rate, no
  `fill` key); v2 suggest / full / mods + Scratch; fillBars; recipes + sliders; compose pure (a `GG.state` trap
  that throws on any read) / deterministic (fresh load) / sanitized / valid / fields / drum seat no part / locked + unknown fall back / tempo
  clamps; slider round trip, Feel + Tempo never rewrite notes, Energy recomposes, chords from the recipe; surprise; Q4 break-bar chips; the
  S5 ceiling (a)-(c) per genre x seat x gear; energy 0 >= 8 hits/bar; compose median <= 20 ms; variety. `content` 54 (+1), `content_seats`
  12 (+1), `sim_seats` 21 (+1: v2 parts through toggle / pick / modify / notes / rate / create). `compat_v12` 10/10; `node tests/run.js` SUITE ALL PASS
  (35 files, after `node build.js`). Classic: `META_ONLY=hash pw_seq` 232/232 equal (317 s).

## Numbers
- compose (node): median 3.1 ms, p95 ~10 ms (200 calls, full gear, all seats). dist/game.html 5,186,786 B (stage 0 5,142,167: +44.6 KB,
  all Lane S code + content; gate 6,000,000).
- Variety (default recipe, 5 consecutive slots, 4 lanes): the test career (12345) passes all 16 genre x seat. Over 100 careers: pairs >= 0.8
  0.4-3.6 % (1.2 jams 7-12 %), median 0.47-0.63; careers that would fail the strict rule 0-4 / 100 (metal drums 4, rock bass 4).
- S5 ceiling, seed hashSeed('7|s3') (as the test; seeds '1|s1', '99|s7', '4242|s12' also pass every check). Columns: (a) min groove / min
  hook over the recipes at defaults; (b) recipes reaching top (>= 90 / >= 85) over energy x fills + mood 0 / 4; best point; (c) lowest groove
  at a single-slider extreme (energy / mood / feel / fills 0 + 4, tempo min + max).

| genre | seat | gear | (a) defaults | (b) top | best | (c) lowest |
|---|---|---|---|---|---|---|
| metal | drums | 4 lanes | 100 (neck) / 97 (doom) | 4/4 | 100/100 | 91 (neck fills 4) |
| metal | drums | full | 97 (thrash) / 100 (neck) | 5/5 | 99/100 | 91 (doom energy 0) |
| metal | bass | 4 lanes | 98 (neck) / 93 (thrash) | 4/4 | 99/97 | 92 (neck energy 0) |
| metal | bass | full | 94 (doom) / 97 (gallop) | 5/5 | 97/100 | 89 (doom energy 0) |
| metal | rhythm | 4 lanes | 92 (thrash) / 89 (doom) | 4/4 | 94/94 | 88 (thrash energy 4) |
| metal | rhythm | full | 95 (doom) / 94 (gallop) | 5/5 | 98/100 | 91 (doom energy 0) |
| metal | lead | 4 lanes | 97 (thrash) / 91 (thrash) | 4/4 | 98/96 | 90 (doom energy 0) |
| metal | lead | full | 95 (thrash) / 95 (gallop) | 5/5 | 97/100 | 89 (doom energy 0) |
| punk | drums | 4 lanes | 95 (skate) / 68 (three) | 5/5 | 100/100 | 82 (skate bpm min) |
| punk | drums | full | 93 (skate) / 75 (three) | 5/5 | 97/100 | 80 (skate bpm min) |
| punk | bass | 4 lanes | 94 (skate) / 69 (three) | 5/5 | 99/93 | 86 (skate bpm min) |
| punk | bass | full | 92 (skate) / 76 (three) | 5/5 | 97/100 | 84 (skate bpm min) |
| punk | rhythm | 4 lanes | 80 (skate) / 71 (three) | 3/5 | 100/96 | 72 (skate bpm min) |
| punk | rhythm | full | 81 (skate) / 78 (three) | 4/5 | 97/100 | 72 (skate bpm min) |
| punk | lead | 4 lanes | 94 (pogo) / 71 (three) | 5/5 | 100/97 | 85 (pogo bpm min) |
| punk | lead | full | 92 (skate) / 78 (three) | 4/5 | 97/100 | 83 (skate bpm min) |
| rock | drums | 4 lanes | 94 (arena) / 66 (bar) | 5/5 | 100/100 | 84 (lighter fills 4) |
| rock | drums | full | 92 (arena) / 65 (highway) | 5/5 | 98/100 | 80 (arena energy 4) |
| rock | bass | 4 lanes | 95 (arena) / 70 (bar) | 5/5 | 100/100 | 88 (arena fills 4) |
| rock | bass | full | 94 (arena) / 69 (highway) | 4/5 | 96/99 | 81 (lighter energy 4) |
| rock | rhythm | 4 lanes | 94 (arena) / 67 (bar) | 5/5 | 100/96 | 86 (arena fills 4) |
| rock | rhythm | full | 93 (arena) / 69 (highway) | 5/5 | 98/94 | 81 (lighter energy 4) |
| rock | lead | 4 lanes | 94 (arena) / 70 (bar) | 5/5 | 97/97 | 88 (arena fills 4) |
| rock | lead | full | 92 (arena) / 65 (highway) | 4/5 | 93/96 | 81 (bleacher energy 4) |
| country | drums | 4 lanes | 82 (sad) / 77 (sad) | 5/5 | 100/100 | 78 (sad bpm min) |
| country | drums | full | 80 (sad) / 84 (sad) | 5/5 | 97/100 | 76 (sad bpm min) |
| country | bass | 4 lanes | 83 (sad) / 74 (sad) | 5/5 | 98/92 | 81 (sad bpm min) |
| country | bass | full | 81 (sad) / 81 (sad) | 5/5 | 93/100 | 79 (sad bpm min) |
| country | rhythm | 4 lanes | 84 (sad) / 84 (sad) | 5/5 | 100/99 | 81 (sad bpm min) |
| country | rhythm | full | 80 (sad) / 98 (sad) | 5/5 | 97/100 | 77 (sad bpm min) |
| country | lead | 4 lanes | 84 (sad) / 76 (sad) | 5/5 | 97/94 | 80 (train energy 0) |
| country | lead | full | 82 (sad) / 83 (sad) | 5/5 | 95/98 | 79 (sad bpm min) |

## Hand-overs
- **Lane A:** `toNotes` fill notes carry `fill: true` (drum chart "extras skip a bar with a fill" can key on it); rung `remap`s now exist,
  but `p.chords` is already remapped (never remap again in the timeline); mood ids renamed (metal grim / midnight, punk cheery, country sunny:
  key on index / mode, not id). Compose parts use every v2 row (Scratch, Low 5th, 3rd, 7th, Oct, lead Low / High via scratch / walk /
  octave / fifths / pickup): partBar2 + charts must play / chart them (test: compose any genre x seat at energy 4 + fills 3).
- **Lane U:** card `bpm` is on a 5; toast text from `lockLabel` (a name, not a sentence); the 6th card is `id: 'surprise'` (call
  `songs.surprise(.., hashSeed(seed + '|surprise|' + taps))`, then compose with its values); compose depends on gear + seat (D.edited after a
  gear buy reads "edited": rebuild the check with the song's own gear); coach priority coach[g].bySeat[seat].quick > coach.bySeat[seat].quick >
  coach[g].quick > coach.quick; fill bars: edit `p.fillBars[tab]` (start from a copy of the main bar) and sanitize.
- **Lead:** document the new content keys + `part.suggest/full` `v`, `toNotes` `fill`, OPs roll / swap in 02_contracts (V1.3 block);
  similarity callers still pass no genre (stage-0 note 5); rebuild dist.

## Gaps
- The strict variety rule fails for 0-4 % of random careers (the fixed test career passes); 1.2 jams would fail far more often.
- Weakest defaults: country Sad waltz / Legion two-step (groove 80-88), punk Three-chord sprint hook 68-78 at defaults (top only via sliders).
- One final suite run flagged `sim_audio` "crowd pre-render ... slowest 3.05 ms" under machine load (other browsers running); it passed
  alone twice (30_audio is untouched by this lane).
- `partFills` only uses `pickup`; flavours can override a recipe's own hats / snare shape (variety over identity, D14 + §4.2 step 7).
