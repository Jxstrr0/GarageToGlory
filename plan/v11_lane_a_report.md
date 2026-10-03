# v1.1 "Seats": Lane A (content) report

Branch `wip-v11-a` (on top of `origin/v1.1-seats` with D+B merged in; see the last commit hash in the lead's prompt reply).
Only Lane A files were edited: `src/content/*` (never `genres.js`), `tests/content.test.js`, `tests/content_endings.test.js`,
`tests/sim_bands.test.js`, new `tests/content_seats.test.js`, new `tests/seat_scan.js` (a helper, not a `*.test.js`).
`dist/*` was rebuilt and committed once after the D+B merge (as the setup step asked); later builds were local only.

## Summary

- **A1 (paused run)**: `SEAT=bass|rhythm|lead|all` in `tests/sim_bands.test.js` runs every band on the string seats with a
  strict seat leak scan (`tests/seat_scan.js`: the audit regex of `tools/seat_audit.js`, minus the `[left]` phrases, minus the
  lines written for a string seat); the default run adds a quick one-year scan per band x string seat. `SEAT_DUMP=<file>`
  writes the worklist.
- **A2 audit**: every file of `plan/seat_audit.txt` decided (counts below). Fixes this run: the radio closet ({gear}), the
  hockey quirk (stick), Duke's harvest beat per seat, a barn cat renamed (Gordon matched Hail Damage's "Gord"), the owner's
  "falls off the drum riser" viral line kept (now "... finishes {yourPart} lying on the floor"), the first gig's lane step got
  a string-seat twin in `tutorial.js`. `[left]` phrases live in `tests/seat_scan.js` LEFT (road gear, a rival's drummer, the fan
  club's gift for the band's drummer, the Patreeon tier names, "The beat on track three" review, etc.).
- **A3 swapped drummers** (`src/content/zz_seats_drummers.js`, `bands.js`):
  - `bands.<id>.seatLines = { drums, bass, rhythm, lead }` (the seat picker's "who moves" line) for all four bands.
  - 12 first-week cards `sw_<member>_first_week` (forceWeek 2: week 1 keeps each band's own forced card; seat + swapped + band).
  - 48 Monday cards `sw_<member>_1..4` (4 per swapped member, eras garage -> world, weight 2), each with a chat line from them.
  - `lines.songReactions[<member>].kit` (3 each; Kenji's are stage directions) and `.bySeat[seat]` for the other bandmates.
  - `shop.byBand[<band>].lines.drummerGear` (one line per swapped member, gated `swapped: <id>`: exactly one posts on a buy).
  - Epilogue variants `endings.epilogues[<member>]` with `when: { seatRole: ['drums','drums/vocals'], inLineup: true }`,
    inserted after the story-flag entries (Kenji: "a new drum kit arrives every Christmas").
  - `recruits.drummers = { nicks: { <genre>: [..] } }`, `drama.fillIns.drums`.
- **A4 arcs** (`src/content/zz_seats.js`): Nobody Hears the Bass (`arc_bass`, flags.bassArc legend|secret|quiet), The Engine Room
  (`arc_rhythm`, rhythmArc credited|unsung|engine), Solo Too Long (`arc_lead`, leadArc guitarHero|bandFirst|soloAlbum): six steps
  each, a hint on every choice, a byBand chat line per band on every choice (gated `swapped: <that band's drummer>`, tokens only
  in the shared card text), the decision at step 5, `<arc>Done` at step 6; step 1 weight 12 (eras garage-signed), steps 2-3 any
  era, 4-6 local-world. 12 band finales `fin_<seat>_<band>` (once, band + seat + `<arc>Done`). Player epilogues
  `endings.player.bass|rhythm|lead` for all five tiers.
- **A5**: `shop.gear[i].bySeat[seat] = { names: { <genre> }, blurb }` (proposal names kept, except no "Nashville" (USA) and no
  "Kit" in a guitar item: Rodeo-Grade Strings, The Sweep Machine; every bass lane-5 name says Five-String / Low B of Doom for
  pw_shop) and `shop.kit[i].bySeat[seat]` (amp tiers; the lead's tier 2 mentions the whammy); `creator.gear = { shapes: { <seat>:
  { <id>: name } }, guards, stickers }` (Lane C's `GG.creator.gearNames` reads it); coach lines `grooves.coach.bySeat[seat][step]`
  + `grooves.coach[genre].bySeat[seat][step]` for steps drums/verse/chorus/bridge (role 'drummer' = whoever is on the kit; they
  name genres.js progNames/hooks: "the tritone drop", "the big dark lift", "three chords and a grudge", "the highway", "home on
  the grid road", "back and forth to town", "the big chorus lift"); the four seat achievements (Low End, The Engine Room, Solo
  Too Long, Musical Chairs; Lane B's kinds `seatCareer` / `soloTooLong` / `allSeats`, no drum words, no seat gate).
- **A6**: `tests/content_seats.test.js` (9 tests); `content.test` accepts `seat` / `swapped` (top level, gate, chat lines), lists of
  chat lines, world-era card gates, and the draw sim runs as the drummer; `content_endings.test` accepts the seat epilogues.

## A2: decisions per file (stage-0 `plan/seat_audit.txt`, 530 lines; by diffing each file against 829b059)

| file | lines | tokenised / rewritten | gated | left | v1.0 already |
|---|---|---|---|---|---|
| zz_band_grid_road_ramblers.js | 94 | 23 | 16 | 55 | 0 |
| zz_band_frost_heave.js | 58 | 17 | 4 | 37 | 0 |
| cards.js | 55 | 33 | 3 | 19 | 0 |
| zz_band_gravel_kings.js | 55 | 10 | 1 | 44 | 0 |
| grooves.js | 29 | 1 | 0 | 28 | 0 |
| lines.js | 24 | 7 | 0 | 17 | 0 |
| world.js | 23 | 0 | 3 | 20 | 0 |
| album_words.js | 22 | 6 | 0 | 16 | 0 |
| bandbook.js | 21 | 3 | 0 | 18 | 0 |
| road_cards.js | 18 | 4 | 0 | 14 | 0 |
| shop.js | 16 | 0 | 0 | 16 (string seats read bySeat) | 0 |
| tutorial.js | 16 | 0 | 0 | 0 | 16 |
| genres.js (Lane D) | 14 | 0 | 0 | 14 | 0 |
| reviews.js | 14 | 0 | 0 | 14 | 0 |
| rivals.js | 12 | 1 | 0 | 11 | 0 |
| venues.js | 11 | 3 | 0 | 8 | 0 |
| endings.js | 8 | 0 | 0 | 8 (keyed player.drums) | 0 |
| bands.js | 7 | 4 | 0 | 3 | 0 |
| recruits.js | 7 | 5 | 0 | 2 | 0 |
| drama.js | 5 | 2 | 0 | 3 | 0 |
| creator.js | 4 | 1 | 0 | 3 | 0 |
| calendar.js | 3 | 0 | 0 | 3 | 0 |
| labels.js | 3 | 1 | 0 | 2 | 0 |
| awards.js | 2 | 1 | 0 | 1 | 0 |
| map.js | 2 | 1 | 0 | 1 | 0 |
| npcs.js | 2 | 0 | 0 | 2 | 0 |
| recap.js | 2 | 1 | 0 | 1 | 0 |
| achievements.js | 1 | 0 | 0 | 1 (already seat: drums) | 0 |
| licensing.js | 1 | 1 | 0 | 0 | 0 |
| song_titles.js | 1 | 0 | 0 | 1 | 0 |
| **total** | **530** | **125** | **27** | **362** | **16** |

"left" = the line means the band's drums in general (the swapped drummer plays them on a string seat), a rival's or a venue's
drums, a drum-only screen, or a word that only looks like a drum word (first-aid kit, Frozen Throne, kicks in). Every "left"
line a string-seat career can see is either a `[left]` phrase in `tests/seat_scan.js` or never reaches a string seat; the strict
10-year scan below proves it. (The counts are a heuristic diff: a line whose card got a top-level `seat` gate counts as gated.)
Re-run: `node tools/seat_audit.js tests/.cache/seat_audit_now.txt` (530 -> 490 lines with drum words; 44 of them are the new
string-seat lines in zz_seats.js, all seat-aware).

## Tests

- `node tests/run.js`: every file passes except the known lead items: **sim_seats** 3 failures (doom-tempo rhythm holds/chords,
  frost_heave lead avg bot 89.8 vs 85.8, "Solo Too Long" reachability; not Lane A's) and **sim_legacy** 1 (handover 1 below:
  its v1.0 assertion expects the drums player card on the bass seat; the contract asks for `endings.player.bass`).
  content 53, content_bands 37, content_endings 14, content_seats 9 (new), content_tutorial 10, sim_achieve 12, sim_lessons 13,
  sim_audio 32, sim_bands 17 (+ the quick seat scan), all green.
- `SEAT=all LEAK_YEARS=10 node tests/sim_bands.test.js`: **ALL PASS 24**, strict, zero seat leaks for every band x seat
  (3 seeds x 10 years, avg + good bots).
- `LEAK_YEARS=13 node tests/sim_bands.test.js` (drums): **ALL PASS 17**.
- `META_ONLY=bands timeout 500 node tests/pw_bands.js`: 390x844 ALL PASS (57/58/58/57 + flat 12); `PW_VIEW=440x956` ALL PASS
  (58/58/57/58 + flat 12).
- Not run by Lane A: the seat-picker / string-seat Playwright pass (`pw_seats.js`, the lead's new file).

## Handovers (lead)

0. **`tests/sim_legacy.test.js:176`** (not Lane A's; the contract makes it change): `eq(b.epilogues.pop().text,
   a.epilogues.pop().text, 'no bass player card yet: the drums one')` now fails because `endings.player.bass` exists (contract
   §5 A2). Change it to expect the seat's own card, e.g. `eq(b.epilogues.pop().text, GG.career.fillText(bass,
   GG.content.endings.player.bass[b.tier]))` and `ok(... !== a's text)`.
1. **`C.ACH_KINDS += ['seatCareer', 'soloTooLong', 'allSeats']`** (Lane B asked too): the four seat achievements then join
   `content.achievements` automatically (`zz_seats.js` §7 checks the contract at load; until then they wait in
   `GG.content.seatAchievements`, so `sim_achieve` stays green). content_seats checks both states.
2. **51 seat picker** reads `GG.content.bands[<id>].seatLines[seat]` (drums: "nobody moves").
3. **02_contracts CONTENT SCHEMAS** (new content keys): `bands.seatLines`; cards' top-level `seat` / `swapped` (+ chat lines'
   `seat` / `swapped`); `shop.gear[i].bySeat` / `shop.kit[i].bySeat`; `shop.byBand[<band>].lines.drummerGear`; `creator.gear`;
   `grooves.coach.bySeat` / `coach[genre].bySeat`; `lines.songReactions[id].kit` / `.bySeat`; `recruits.drummers`;
   `drama.fillIns.drums`; `endings.player.bass|rhythm|lead`; `endings.epilogues[id]` `when.seatRole`; `content.seatAchievements`;
   flags `bassArcDone` / `rhythmArcDone` / `leadArcDone` (plus E7's arc flags); card id prefixes `arc_`, `fin_`, `sw_`.
4. **2a (Lane B's, now lead)**: the `SEAT_GEAR` fallback still has "Nashville Strings" (a USA place; content overrides it, but the
   string ships). Rename or drop it. The `DRUMMER_GEAR` fallback ("a drum piece") only fires for a band without content.
5. **Forced week 2**: the 12 first-week cards use `forceWeek: 2` (drawCard returns the first forced card in content order). A
   future week-2 forced card would collide on string seats.
6. **20 postWeeklyChat** (optional): weekly mood chat (`lines.chat[id]`) is not seat-aware, so a swapped member's ungated mood
   lines can still mention their old instrument (no drum words, so not a leak). The swapped drummers' chat comes through their
   Monday cards. A `lines.chat[id].kit` layer for the swapped member would need a reader in 20.
7. **pw_bands / pw_seats** (lead-only): pw_bands runs the drum seat; a string-seat pass belongs in the new `pw_seats.js`. The
   strict DOM scan there can reuse `tests/seat_scan.js` (`leak(text, seatAware(GG))`).
8. **sim_lessons** (not Lane A's): `A15_STRICT=1` fails on starter-song tempo (pre-existing HANDOVER line, not content).

## Gaps

- Tutorial: only the first gig's lane step has a string-seat twin. Walk/write twins would make `sim_lessons` "seat-gated steps
  drop for the bass seat >= 2" fail (an existing test); 54's own guide hints explain your part.
- Drummer recruits get nicks only (no drummer quirk cards); fill-ins share one pool across genres.
- Arc reachability in bot runs (avg bot, 10 years, before the step-1 weight went 6 -> 12): 34 of 36 band x seat x seed careers
  started and finished their arc; the finale followed in every finished one. The synthetic walk in content_seats is exhaustive.
- Size: `dist/game.html` 4,488,503 B stripped (v1.1-seats with D+B: 4,349,605 B; Lane A in total +138,898 B, budget +350 KB; gate 5,000,000 B). The committed dist is the post-merge build; rebuild at integration.
