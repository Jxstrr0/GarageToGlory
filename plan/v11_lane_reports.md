# v1.1 lane reports (D, B finished 2026-10-02; merged at a3aeea7)

## Lane D (worktree-wf_867f4c13-592-1 @ e8fa7a8)

### summary
Lane D (audio) is finished. It sits on top of stage-0 commit 829b059 as three commits: 706bd2a, d2dc134, and the final e8fa7a8. It touches only the files Lane D owns: src/30_audio.js, src/content/genres.js, tests/sim_audio.test.js, and the new tests/pw_seat_audio.js. dist was rebuilt locally for the Playwright runs, then reset; it is not committed.

Drum seat is unchanged: before editing anything, I fingerprinted 1,212 drum-seat timelines on the stage-0 code (4 genres x 6 patterns x 4 tempos x 14 option sets, plus a live drum career's songs). sim_audio now checks that every one is still identical with no new options, with seat:'drums', with opts.mute, and with a part on the drum seat. The drum taps are unchanged too (pw_gig sync/sync2/double/bridge, pw_perf audio and pw_seq audio pass).

What was built in 30_audio.js:
- **Seat parts in the timeline (`opts.seat`).** Added only when a string seat is passed, and nothing else in the song changes. Rock rhythm gets its own gtr2 guitar: chord stabs and pushes in verses (muted 8ths at Drive tempo), open chords in the chorus, the riff in breaks, held chords under someone else's solo. The old whole-bar chorus ring is replaced by this part. Country lead gets an Earl-style lick in every bar plus chorus answers, and both seats get a held last note in the outro.
- **Your written part (`opts.part`).** Replaces the seat's own kinds section by section. A `prog` index makes the whole band follow your chords. The lead's own solo bars and the outro's final held bar stay as generated. Notes written from a part carry `part: true`; the bass/rhythm/lead row meanings follow the contract.
- **`opts.mute`.** `play()` skips the listed kinds but the event list stays the same, so charts and mutes agree. The handle reports `kinds`/`muted` counts.
- **Your instrument: `A.pluck/strum/lead(midi, when, o)`.** Plays through the band's own sound for that kind, booked exactly like `A.hit` (`when` under 1 s ahead, else now + 5 ms) as a tap the voice cap never drops. Each voice is monophonic. Options: `len, hold, kind, power, mute, strum, up, bend, trem, ring, repeats, seat`. `repeats` plays a run's notes on the grid under one handle.
- **`A.release(handle, when)`** gates a hold (at least 60 ms, a 20 ms fade). It returns true, false, or null.
- **`A.hitCancel()`** now also cuts your booked notes and frees them from the voice count.
- **`A.seatVoiceFor(kind)`** returns 'pluck', 'strum' or 'lead'.
- **Seat preview: `A.seatPreview(bandId, seat)`.** Plays about 3 s of the band's first starter song's chorus, the seat's parts +6 dB and the rest -6 dB. It runs quietly (never the current song), one at a time, and stops itself. A.play, A.stop, A.suspend or `A.stopPreview()` also end it. It returns null without Web Audio.
- **Smaller additions.**
  - `A.soloFor(genre, 'player')` returns your seat's solo voice.
  - On a string seat the garage noodle is you on your instrument (new styles walk, chug, power, lick).
  - The van radio plays your written part.
  - `A.hit` ignores unknown lanes.
  - `GG.debug('audio').seat` shows note counts, the song's mute state and the preview.

In genres.js each genre's backing gains `progNames` (plain-words names, one per progression) and `hooks` per section: 2–3 hooks each with a name, 5 scale degrees and a 5-row melody. No drum words.

Size: dist/game.html is 4,277,590 B, +30,506 B over stage 0's 4,247,084 (Lane D's target was +60 KB).

### tests
Node: `node tests/run.js` passes in full (29 files). sim_audio now has 32 tests (27 unchanged + 5 new), sync 8 (unchanged), sim_seats 8 (unchanged). The 5 new tests cover:
- the 1,212 stage-0 fingerprints, with no new options, with seat:'drums', with mute, and with a part on the drum seat;
- `opts.seat`: every seat kind is present in every genre, only seat kinds change, rock rhythm has at least one note per two beats in verses, country lead has a lick in every bar;
- `opts.part`: it replaces exactly the seat's kinds, the band follows a prog, the lead keeps its solo, hooks stay in key, junk input is handled;
- the progNames/hooks tables are well formed;
- voices without Web Audio, `seatVoiceFor`, `soloFor('player')`, and the noodle for every band × seat.

Playwright `tests/pw_seat_audio.js` passes at both 390x844 and 440x956 (no console errors asserted in every section):
- **voices (19):** every genre × voice starts within ±1 ms of the requested time, both booked ahead and "now". Holds are gated at the release; a release before 60 ms keeps 60 ms; taps ignore releases. The choke, a run with repeats, hitCancel, and the muted game all behave. A burst of 300 notes over a song peaked at 22 voices sounding at once (cap 32), none dropped. Offline, a released hold goes silent after its gate.
- **mute (4):** live, for every genre × seat, a muted kind is never scheduled. Offline, muting everything gives silence (no source started).
- **preview (9):** all 16 band × seat previews run 2.46–3 s with the right levels and the seat's parts audible. They stay quiet, run one at a time, stop themselves, and end on stopPreview or A.play. An unknown band returns null.
- **noodle (5).**

Regression at 390x844, all passing: pw_gig gig 32, sync2 11, double 17, bridge 17, e2e 15, touch 5, songend 5; pw_seq audio 42, voices 8, genres 25, heavy 22, seq 34, guided 23; pw_perf audio 7; pw_garage garage 48; pw_title scene 15.
pw_gig sync failed one check in the long sequential run: one tap was recorded at −94 ms, the same signature stage 0 already noted as a flake. Re-run alone after a rebuild it passed twice (14/14 each).

Regression at 440x956, all passing: pw_gig gig 32, sync 14, sync2 11, double 17, bridge 17; pw_seq audio 42; pw_perf audio 7; pw_garage garage 48.

### handovers
To Lane B (gig UI 55, songwriter 54, studio 59b, charts 22):
1. **Charts.** Build them from `GG.audio.timeline(pattern, { genre, songId: song.id, seat, part: pattern.part, drums: false, vocals: false })` filtered by `GG.audio.seatKinds(genre, seat)`. Notes written from a part carry `part: true`. Events in the outro's last bar have `ring: true` (that bar runs `tail` beats past the end). With a part, every bar except the lead's own solo bars and that last ring bar holds only your written notes.
2. **The band in the gig.** Play it with `GG.audio.play(song.pattern, { ...today's opts, drums: true, seat, part: song.pattern.part, mute: GG.audio.seatKinds(genre, seat) })`. With `drums: true` the swapped drummer is today's drum synth.
3. **Your taps.** On the playTap drum-sync path, use the same `syncSnap`/`syncWhen` and per-lane `G.lastBook` as drums, then call:
   `h = GG.audio[GG.audio.seatVoiceFor(note.kind)](note.midi, when, { len: note.len, hold: note.hold || note.run, kind: note.kind, power: note.power, mute: note.mute, strum: note.strum, up: note.up, bend: note.bend, trem: note.trem, repeats })`
   - For a run, pass `repeats` = the run's onsets minus `note.t`, in seconds; this needs the chart to keep those onsets. Repeats not yet played never sound after a release.
   - On `S.release`, call `GG.audio.release(h, ctxTimeOfRelease)`.
   - For a 2-lane chord, call `strum` once; a second call on the same snapped time is cut to 30 ms.
   - It returns null when muted or without audio. `stopAudio` already calls `hitCancel`, which now cuts your notes too.
4. **Auto notes** dropped by the two-thumb rule: play them through the same voice functions, booked at `G.zeroBand + n.t`.
5. **Songwriter (54) and studio (59b).** Pass `seat` and `part` to `GG.audio.play` so your part is heard unmuted. The UI labels come from `backing.progNames[section][i]` and `backing.hooks[section][i].name`. `songs.part.suggest` can start from `hook.rows`.
6. **sim_seats.test.js** expectations for `pluck/strum/lead/release` returning null without a context still hold, so nothing needs changing there.

To the lead:
7. **51 seat picker:** call `GG.audio.seatPreview(bandId, seat)` on card tap and `GG.audio.stopPreview()` when leaving the screen. A.play and A.stop also end a preview.
8. **02_contracts §4.9 / status.md APIs** to append:
   - `A.seatVoiceFor(kind)`
   - `A.pluck/strum/lead` handle `{ fn, kind, midi, t, end, len, hold, n, repeats, released, cut }` and the option `o.repeats`
   - `A.release` returning true / false / null
   - `A.seatPreview(bandId, seat, opts?)`: handle plus `{ bandId, seat, secs, stopAt }`
   - `A.stopPreview()`
   - `play()` handle gains `kinds` / `muted` / `mute` / `seat`
   - timeline result gains `seat` / `part`
   - `renderOffline` takes `{ seat, part, mute, seatNotes: [{ fn, midi, at, o, release }] }`
   - `debug('audio').seat`
   - genres `backing.progNames` / `hooks`
   - Note that `C.SEAT_KINDS` is unchanged.
9. Add `tests/pw_seat_audio.js` (voices, mute, preview, noodle) to the checklist's pw matrix.

To Lane A: coach lines in grooves.js can name the hooks and progression names now in genres.js. The 14 genres.js lines in plan/seat_audit.txt are songwriter groove tips and verdicts about the drum pattern, so I left them as they are. None of the new names use drum words.

### gaps
- **Two choices I made where the contract was open; the lead may want to confirm them:**
  - With a lead part on metal, punk or rock, the double-tracked `gtr` pair is one of the lead's own kinds, so it is replaced by your hook in the sections you write. Those sections lose the rhythm guitars, which the "mute whole kinds" rule (§0) implies.
  - A part section with no hits makes your seat silent in that section.
- **Voice-cap bookkeeping.** The voice ledger counts a note from the moment it is booked, so in the burst test its own peak/"over" counters read high (36 / 2), while what actually sounded at once peaked at 22. pw_seat_audio therefore checks the measured peak. I left the ledger as it is because changing it would also change the drum path.
- **Rock ballad lead verses are empty** (as in today's band). Ballads only happen under 90 BPM, which the rock tempo slider can't reach, so in practice it's the rival's songs. Country lead stays sparse at about 3 notes per bar as specified.
- No sound-design pass on a real phone; levels were checked offline only (peaks 0.30–0.48, no clipping or NaN).

## Lane B (worktree-wf_867f4c13-592-2 @ fabe056)

### summary
Lane B (sims + gameplay UI) is done on top of stage 0 (829b059). I only edited files Lane B owns. dist/ was rebuilt for testing but left out of the commits, then restored. Built size is 4,319,099 B, which is +72,015 B against stage 0 (lane budget +120 KB); gzip 1,271,596 B.

The drum seat is unchanged: `NO_BONUS=1 BAND=all node tools/balance.js 3 3` and the default Hail Damage run give output byte-identical to the stage-0 tree. Every existing test passes without edits, except one addition the contract asks for (noted in Tests).

- **Roles and drama** (20, 22, 27):
  - New `career.stageRole(state, m)`: the drum seat returns the content role, string seats return seatRole.
  - `gig.roles`: on the lead seat `solo = 'player'`. `fill` is never the drummer or the player; on string seats it can fall back to a singing guitarist or the singer. `roles.drummer` is non-enumerable so the drum seat's roles object still matches v1.0 exactly.
  - On your own seat, `@bassist` / `@soloist` resolve to `'player'` and `{bassist}` / `{soloist}` read "you". Such an alias never speaks, posts chat or moves a mood.
  - New `career.ARCS` / `arcOf()` for the arc flags.
  - Drama on a string seat: the swapped member's spot is `'drums'` (`drama.slotOf`). Their quit leaves a drum hole with drummer fill-ins and recruits (role and seatRole `'drums'`). Their return puts them back on the kit and the recruit steps aside. Your own seat is never a hole.
  - Line pickers in my sims (card chat effects, shop chat, drama exit beats and quit/back lines, studio cards, song custom reactions) now respect a line's `seat` / `swapped` gates.
- **Songs (21):**
  - New `songs.part.*`: ROWS, key, choices (plain words; `backing.progNames` / `hooks` are used if present), suggest, sanitize, full, toggle, pick, and the four modifiers lock / double / ring / call.
  - `sanitize` keeps the part. `rate` blends it in by `PART_WEIGHT` with seat signatures per genre; `rate().part` adds `{ groove, hook, tips }`.
  - `similarity` scales the drum similarity by how alike the parts are, so a part can never make a song read more recycled than its drums.
  - `create` gives every string-seat song a part, seeded per song id (never the career RNG).
  - `reactions` adds a line from the swapped drummer and a by-seat line from a bandmate, on their own seed.
- **Charts and session (22):**
  - `chart(song, { seat, genre, lanes, runs, soloist, difficulty })` builds a string chart from `GG.audio.timeline`, following §4.5: contour lanes `str0..5`, holds, 2-lane chords on Hard/Expert for rhythm, runs that need the run gear, thinning by lane index, two thumbs counting held notes, the lead spotlight and shred bar, and free windows. Dropped notes go to `chart.auto`. Without 30_audio the drum chart is returned with `stub: true`.
  - Session: `S.release` / `S.holding` and the `gig:hold` event; chords need both lanes, and one lane alone counts as a Good; holds sustain and ring; a "flow" crowd model by difficulty; whammy bends on the lead seat at amp tier 2; Auto-kick is off on string seats.
  - SONG_RESULT gains `seat`, `holds`, `rings`, `held`, plus `solo`, `dur`, `soloNotes`, `allNotes` on the lead seat. `botPlay` holds every hold to its end and taps both lanes of a chord.
- **Shop (2a):** the same three items at the same prices and eras, with parody fallback names per seat and genre. One purchase grows both your rig (`seatLanes` / `runs`) and the band's kit; bass's lane-6 item is the fridge cab with no lane. The swapped drummer posts a chat line. Also new: `seatGearEffect`, `seatGearSync`, `kitName`, `whammy`.
- **Achievements (2g):** three new kinds, `seatCareer`, `soloTooLong` (default min 0.4, counted by spotlight notes) and `allSeats`. They are listed in `GG.achieve.SEAT_KINDS` and only join `KINDS` once `C.ACH_KINDS` lists them, so sim_achieve stays green.
- **UI:**
  - 55 (gig): string lanes with seat colours (colourblind and lefty-aware); taps play `GG.audio.pluck` / `strum` / `lead` on the drum-sync booking path; lifting a finger or key releases holds; runs are booked on the band grid while held; holds, runs and chords are drawn; the band plays the drums with your kinds muted; results show the holds line; new debug fields.
  - 54 (songwriter): guided flow goes Drums ({drummer}'s suggested signature grooves, plus "Tell {drummer} what to play" into the unchanged drum grid), then Your part per section (choices, 2–5 row grid, tweaks), then tempo, order, name. Advanced mode has a "Your part | Drums" switch, a ‹ › progression cycler and a part tools modal. Coach lines per seat, the seat's shop button, playback with `{ seat, part }`.
  - 5k: the "{Instrument} shop" sheet.
  - 59b: "{Instrument} takes" with a 🎸 Play button.
- **tools/balance.js:** `SEAT=`, which loads 30_audio and adds a SEATS VS DRUMS table and a LIVE BOTS table, plus `SEED_OFFSET`. With neither set, the output is exactly v1.0's.

### tests
**Node:** `node tests/run.js` gives SUITE ALL PASS (29 files).
- `sim_seats` now has 17 tests: contracts, swap table, newCareer, lineup, tokens, gates, roles per band × seat, quits/returns into the drum seat, PART, charts per band × string seat × difficulty × lanes × runs, session holds/chords/release, perfect bot 100% plus avg-bot parity, 3-year bot careers per band × seat (deterministic), seat shop, seat achievements, seat reactions.
- `sim_career`: the existing "every gate key evaluates" test gained the `seat` / `swapped` cases, an assertion that every `SEAT_GATE_KEYS` key is covered, and a bass-seat block. The contract mandates this; it is the only change to an existing test.

**Playwright, new sections, all green at 390×844 and PW_VIEW=440x956:**
- `pw_gig seat` 33/33 (a bass and a lead gig: holds drawn, the head judged, ringing out, an early lift gates the voice with no miss, voices not drums, the band plays the drums with your kinds muted, results)
- `pw_seq part` 30/30
- `pw_shop seat` 26/26
- `pw_label seat` 6/6

**Playwright, existing sections at 390:** pw_gig gig 32, touch 5, double 17, songend 5, bridge 17, e2e 15, sync 14, sync2 11; pw_seq seq 34, guided 23, genres 25, voices 8; pw_shop gear 30, merch 24; pw_label label 13, studio 30, awards 19; pw_flow flow 16. All pass. `sync` failed one Auto-kick booking check (8 of 9 kicks booked ahead) while two balance runs were loading the machine, then passed 14/14 run alone.

**Live bots** (node, 30 loaded): the perfect bot scores accuracy 1.000 on every band × seat × difficulty. The average bot is within 3 points of the drum seat, averaged over the four difficulties, for every seat except rock rhythm and country lead (too sparse until Lane D's layers). The test skips those two automatically until the timeline has the layer.

**Balance output** (gitignored, in `tests/.cache/`): `balance_v11_seats_3x30.txt`, `balance_v11_seats_6x10.txt`, and `balance_v11_drums_seedoffset500_3x30.txt` (a noise check: the drum seat alone with a second seed set).

### handovers
**Lead** (02_contracts and lead-only files):
- Fold `C.SEAT_GATE_KEYS` into `C.GATE_KEYS`; sim_career now covers both keys.
- Add `C.ACH_KINDS += ['seatCareer','soloTooLong','allSeats']`; until then they live in `GG.achieve.SEAT_KINDS`.
- Record the new APIs in §4.9 / 02:
  - `gig.STR_LANES`, `HOLD_BEATS`, `RUN_GAP` (0.18); chart opts `genre` / `soloist`; chart keys `holds`, `chords`, `runs`, `kinds`, `genre`, `tail`, `fills[].cap` / `shred`.
  - SONG_RESULT keys `seat`, `holds`, `rings`, `held`, `bends`, `solo`, `dur`, `soloNotes`, `allNotes`.
  - `S.release` / `S.holding` / `S.seat`; `roles.drummer` is non-enumerable.
  - New economy.gig.live keys: `flowGain`, `holdGain`, `ringGain`, `ringAt`, `seatDensityClamp`, `bendGain`.
  - `songs.part.*`, `partRating`, `PART_WEIGHT`, `rate().part`.
  - `career.stageRole`, `ARCS`, `arcOf`; `drama.slotOf`; `shop.seatGearEffect`, `seatGearSync`, `kitName`, `whammy`.
- 50 `ui.presentLines` should call `speakerOk(state, who, line)`.
- 5h settings: the "🥁 Practice a song instead" button, and the Auto-kick assist, should be hidden or relabelled on string seats.
- 52 SPOTS 'Drum kit'.
- Copy the `tests/.cache/balance_v11_*` files into plan/.
- The drama fill-in figure on a string seat has role 'drums' (id `fill_drums`) — Lane C, below, places it.

**Lane A** (content):
- `recruits.drummers = { nicks: [..] | { <genre>: [..] }, quirks?: [ids] }`.
- `drama.fillIns.drums`.
- `lines.songReactions[id].kit` (the swapped drummer) and `.bySeat[seat]`.
- `shop.gear[i].bySeat[seat] = { name, names: { <genre> }, blurb }` and `kit[i].bySeat`. Parody fallbacks are in 2a.
- `shop.lines.drummerGear = [{ who: '@drummer', text }]`.
- `grooves.coach[genre].bySeat[seat][step]` and `coach.bySeat[seat][step]` (role `'drummer'` = whoever is on the kit). Neutral fallbacks are in 54.
- Achievements: `seatCareer { seat }`, `soloTooLong { min?, by? }`, `allSeats` — and content.test must accept `GG.achieve.SEAT_KINDS`.
- Cards voiced by `@soloist` on the lead seat, or `@bassist` on the bass seat, will not draw.

**Lane D** (audio):
- 55 calls `GG.audio.pluck` / `strum` / `lead(midi, when, o)` with `o = { len, hold, kind, power, mute, strum, up, bend, chord }`, then `GG.audio.release(handle, when)`.
- The gig plays the song with `GG.audio.play(pattern, { drums: true, seat, part, mute: seatKinds, soloist })`; the songwriter plays with `{ seat, part }`.
- The chart reads `timeline(p, { genre, songId, seat, part, drums: false, vocals: false, soloist })` plus `tl.solo` and `tl.tail`, and calls `A.soloFor(genre, 'player')`.
- Bend events (`ev.bend`) are what the lead's whammy scores.

**Lane C** (render):
- `gig:judge` lanes are `'str'+li`; `gig:hold` carries `{ lane, held, ring }`; `gig:band { who: 'player', action: 'solo' }` on the lead seat.
- The count-in noodle calls `stage.hit('str'+li)`.
- `gig.roles(state).drummer` is available.
- On string seats a drama fill-in figure can have role 'drums' (id `fill_drums`) and needs a stage spot.

### gaps
1. **±10% balance:** fans@y3 is within ±10% for most band × seat × bot rows at 30 seeds, but fund@y3 is not. The drum seat run with a second seed set already differs from itself by up to 19% (avg bot), so the 30-seed gate is mostly measuring noise; a reliable ±10% check needs more seeds or a different measure. The good bot is mostly within ±10% (GK lead 89% fans / 82% fund). World week (6×10, good bot, 100% reach) is within 6 weeks of drums for every band.
2. **Rock rhythm and country lead charts are too sparse** on today's timeline (14 and about 30 notes per song). They need Lane D's `opts.seat` layers; the density and avg-bot parity tests switch on for them automatically once a layer exists. After D merges, re-run `sim_seats` and `SEAT=all` balance.
3. **Untested against Lane D's real code:** `opts.part` / `opts.mute`, real voice handles and `release`. 55 handles null handles (the stage-0 stubs).
4. **Solo Too Long** counts your solo notes, shred bar included, against all your notes (default min 0.4) and is reachable with a short metal song plus a solo section. Lane A can set `min` or `by: 'time'`.
5. **Minor:** chords appear only on rhythm, Hard/Expert, on downbeats of open power chords or strums. A chord tapped on one lane counts as a Good, never a miss.
