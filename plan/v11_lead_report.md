# v1.1 lead integration report (2026-10-03, branch `v1.1-seats`)

Lanes D (audio) and B (sims + gameplay UI) were already merged (a3aeea7). Lanes C (render) and A (content) were still
running in their own worktrees, so none of their files were touched (40-46, 2b, 5j, 5l and their tests; `src/content/*`,
`tests/content*`, `tests/sim_bands.test.js`, `tests/seat_scan.js`).

## What changed

### 1. Lead-file handovers from D and B
- `src/02_contracts.js`: `C.GATE_KEYS += 'seat', 'swapped'` (the fold; `C.SEAT_GATE_KEYS` stays as that subset, so content
  tests that concat it still pass). `C.ACH_KINDS += 'seatCareer', 'soloTooLong', 'allSeats'` (so `GG.achieve.KINDS`
  includes them; sim_achieve's "KINDS = C.ACH_KINDS" check holds). A new "As merged (v1.1 lanes D + B)" block records the
  real APIs: D's voices / handles / release / seatPreview / stopPreview / play + timeline extras / renderOffline seat
  options / genres progNames + hooks; B's chart keys, SONG_RESULT keys, session API, live config keys, songs.part.*,
  career.stageRole / ARCS / arcOf, drama.slotOf, shop seat functions; the 51 seat screen.
- `plan/status.md` APIs: a "v1.1 as merged" bullet with the same list, and the pw matrix now names `tests/pw_seat_audio.js`
  (voices | mute | preview | noodle) and `tests/pw_seats.js`.
- B's other lead hand-overs, also done: 52 SPOTS by seat (the 2D fallback garage's `kit` spot reads "🎸 Your rig" on a
  string seat; `ui.spotOf`), 50 `ui.presentLines` drops lines gated off the seat (`career.speakerOk(state, who, line)`; an
  answer takes its question with it), 5h settings (Auto-kick hidden on string seats; lefty / sync / practice labels by
  seat; the drum seat reads exactly as before).

### 2. The three failing sim_seats checks (root causes; no test assertion was weakened)
- **Doom-tempo rhythm chart had no holds.** Once D's `opts.part` landed, your written part replaces the band's riff, and
  the suggested metal rhythm part (`songs.part` SUGGEST, 21) only chugged 8th notes, so a metal part never rang.
  Fix: metal rhythm verse = chugs locked to the kick + an open push on the and-of-3 that rings into the next bar; chorus =
  Jaxon's chorus ring (a stab on 1, chugs, the accent chord on 3 rings out the bar). Metal bass and lead verses ring on
  3 too (root + octave pickup; the hook's high note + pickup); before, their first hold came ~54 s into a song (bridge only).
- **frost_heave lead avg bot 89.8 vs drums 85.8.** Not just one seat: every string seat sat +1.0 to +4.1 above drums
  (country rhythm also +4.1, the test stopped at the first failure), growing with difficulty. With D's real parts the
  charts have far more holds, so B's flow/hold/ring crowd gains (tuned on stage-0 timelines) over-paid. Fix in 22:
  `FLOW` { easy 0.6, normal 0.4, hard 0.2, expert 0.05, lead 0.8 } (was 1.3/1/0.75/0.45), ringGain 0.1 (0.6), holdGain
  0.1 (0.35), `seatDensityClamp` [0.4, 4] (was 2.4, so per-second gains stay normalised for sparse parts). Now every
  band x seat is within 1.83 of drums on the test's seeds 1-3 (worst country rhythm +1.8) and within 1.42 on held-out
  seeds 4-6 / 7-9. `gig.FLOW` is exposed for tools. The drum seat is untouched (these keys are string-seat only).
- **Solo Too Long unreachable.** Measured on D's real lead charts, the solo's share of your notes is 0.33-0.38 in metal
  songs with a solo section (short/classic/epic), 0.28-0.31 in country, 0.13-0.21 in punk/rock, and at most 0.21 in a
  song without a solo; by time it never passes 0.22. B's default `min` 0.4 came from stage-0 charts. Fix in 2g: the
  default `min` is 0.3, which keeps B's intent (a song with a solo section gets there; a song without one never does).
  Nothing from Lane A's arc content is needed. **For Lane A:** the `solo_too_long` row in `zz_seats.js` uses the default (fine).
  Its blurb says "the solo is most of your part", which only holds if the player writes a sparse hook; either reword it
  to fit the default (e.g. "a song where the solo takes over") or set `test: { kind: 'soloTooLong', min: 0.5 }`. That
  makes it a write-a-tiny-hook challenge, which is reachable but rare.
- `node tests/sim_seats.test.js`: ALL PASS 17.

### 3. The 51 seat picker (screen `seat`)
- Flow: title → slot → genre → intro → **seat** → logo → creator → cold open (`btn-intro-next` now opens `seat`).
- Four cards `seat-drums|bass|rhythm|lead` (>= 96 px; CSS in the shell's `/* v1.1 SEATS { */` block): the seat name, who
  moves to the drums (`band.seatLines[seat]` when content has a plain string, else "Kenji moves to the drums." / "... and
  sings from the kit." / "You take the kit. Nobody moves."), and the stage spot (behind the kit on the riser / stage left /
  stage right / up front beside the singer). Tapping a card picks it and calls `GG.audio.seatPreview(bandId, seat)`.
  Leaving the screen (back, or `seat-next`) calls `GG.audio.stopPreview()`. Drums is preselected for each band, the pick
  survives back and forth within the same band, and the note "Your seat is yours for the whole career" is shown.
- `seat-next` ("I'm on bass →") emits `'seat:picked' { seat, swapped }`, then opens the logo; the creator passes
  `seat` to `GG.main.newCareer` and to `ui.openLook({ seat })` (for Lane C's "Your gear" tab).
- Copy fixes: 51:222 genre subtitle (no "you're always the drummer"), 51:250 "The band (plus you)", 51:336 the creator's
  heading and subtitle ("Who's on bass?"), the empty-name error and the Customize label by seat, and "You" as the
  fallback name in the slot list. Drum-seat copy elsewhere is unchanged.
- `?quick=1&seat=bass` still quick-starts a bass career (checked in pw_seats pick). 60 needed no change: `quickStart` and
  `newCareer` already pass `seat`.
- Size: `dist/game.html` 4,357,094 B (gate 5,000,000). That is +7,489 over the D+B merge (4,349,605) and +110,010 over
  stage 0 (4,247,084). gzip 1,281,523.

### 4. tests/pw_seats.js (new; every section asserts no console errors)
- `pick` 19: the real new-career flow on Frost Heave; four cards with names and stage spots, >= 48 px; Drums preselected;
  tapping a card plays the preview; back stops it and keeps the pick; `seat:picked { rhythm, rox }`; the creator asks
  "Who's on rhythm guitar?"; Rox drums and sings. A second career left on Drums keeps v1.0's gear object;
  `?quick=1&seat=bass` works.
- `write` 11: a country rhythm Write in the guided songwriter (Travis Lee on the kit, the 2-row grid, Play sends
  `{ seat, part }`, the song keeps the part you wrote and charts on `str` lanes).
- `gig` 8: a Gravel Kings rhythm gig through `playGig` (4 string lanes; Chase drums with your kinds muted; 3 live taps
  judged; autoplay to the results; the result carries the seat).
- `studio` 6: a Frost Heave lead take ("Guitar takes", a 🎸 take runs the lead chart).
- `shop` 7: Hail Damage rhythm, "Guitar shop": parody names at drum prices, no drum names, no gong; one buy grows your rig
  and the band's kit, and Jaxon posts about it.
- `garage` / `stage`: these print a SKIP line until Lane C merges. Garage needs `GG.render.seatGear` and the garage's
  `debug('render').seat`; stage needs `stage.info().view === 'spot'`. Once C is in, they check the swapped drummer,
  "Your rig" and the spot view.

### Existing tests changed (lead-owned or unowned)
- `pw_flow`, `pw_bands` (lead), and `pw_logo`, `pw_settings`, `pw_tutorial` (unowned → lead): one `seat-next` tap after
  `btn-intro-next`, because the contract's new-career order puts the seat picker there. `pw_flow` layout also audits and
  screenshots the seat screen.
- `pw_gig` seat (B's section): the early-lift "no miss on its lane" count now covers only the span while the note is
  held (0.25 s after the head to 0.12 s after its end). The old window counted neighbouring notes on the same lane: the
  note before the head (called a miss just after the press) and the next onset (a part rings into it). The assertion
  itself is unchanged. It passed 3/3 runs at 390 and 1/1 at 440.

## Tests run (all green)
- `node tests/run.js`: SUITE ALL PASS (29 files). `node tests/sim_seats.test.js` 17/17.
- 390x844: pw_flow (flow, flow:punk/rock/country, year, code, layout 34), pw_title (scene, flow, prefs), pw_gig sync 14,
  bridge 17, seat 33; pw_seat_audio (voices 19, mute 4, preview 9, noodle 5); pw_seats (pick, write, gig, studio, shop;
  garage and stage skip); pw_seq part 30; pw_shop seat 26; pw_logo (picker, reuse, meta); pw_settings difficulty;
  pw_tutorial tut_skip; pw_bands hail_damage 57.
- 440x956: pw_flow (all sections), pw_title (all), pw_gig sync / bridge / seat, pw_seat_audio (all), pw_seats (pick, write,
  gig, studio, shop). One timing failure: `flow:country` at 440 hit a 30 s click timeout while the node suite was loading
  the machine. It then passed alone twice.

## Left for the integrator
1. **Lane C's `tests/pw_creator.js` will break after the C merge**: lines 69 and 308 tap `btn-intro-next` and then
   `btn-logo-done`. Add `await tap(page, 'seat-next');` between them (the seat picker sits in the flow now). Any other C or
   A test that walks the new-career flow needs the same one tap.
2. After C merges: `META_ONLY=garage,stage node tests/pw_seats.js` at both sizes (they stop skipping), plus the full pw
   matrix. Confirm that the creator's `ui.openLook({ seat })` opens C's "Your gear" tab from the seat picked on 51.
3. After A merges: the seat cards show `bands.<id>.seatLines` (the fallback lines are used until then, so check the copy
   once). The Solo Too Long blurb or `min` needs settling (see §2).
4. Balance: `SEAT=all BAND=all node tools/balance.js 6 10` / `6 30` → `plan/balance_v11_seats.txt` should be re-run, since
   the crowd retune and the new metal parts change string-seat gig scores (the drum seat is unchanged). B's
   `tests/.cache/balance_v11_*` files were not in this checkout (B's worktree is gone), so nothing was copied to `plan/`.
5. D's two open choices still need a decision. First, on metal/punk/rock lead, your part replaces the shared `gtr` pair
   in the sections you write, so the rhythm guitars drop out there. Second, a part section with no hits is silence.
   Neither was changed here.
6. A full pw matrix at both sizes (every `META_ONLY` section of every `tests/pw_*.js`) and `tools/phoneqa.js` once C
   and A are in. This pass ran only the sections listed above.
