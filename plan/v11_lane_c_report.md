# v1.1 "Seats" — Lane C (render) report

Branch `wip-v11-c`: the paused run's C1–C5 work, with `origin/v1.1-seats` (D + B) merged in at 704b83e (no conflicts; dist rebuilt), then C6.
Files touched are Lane C's only: 40–46, 2b, 5j, 5l, tools/perf.js, and the C tests. dist/ is rebuilt and committed on this branch.

## Summary
- **C1 instruments:** `R.seatGear` / `R.instrument` add 3–4 body shapes per string seat, guards, a headstock sticker (the logo canvas), and
  the colour from `gearLook`, with the kit colour as fallback. `GG.creator.sanitizeGearLook` is in 2b.
- **C2 stage:** on a string seat, `stage.setup({ seat, lineup })` uses a low over-the-shoulder spot camera (bass stage-left, rhythm stage-right,
  lead front-left beside the singer). You stand with your instrument. The swapped drummer sits on the riser (`creator.stageLookFor`), with a
  boom mic for Rox, Chase and Travis. `stage.hit('str'+li)` strums, `gig:hold` rings, and a miss flinches. The drummer keeps time on the
  band grid. Your solo comes from `gig:band { who: 'player', action: 'solo' }`. `info()` adds `seat`, `view`, `drummer`, `you`, `boom`,
  `seatMode`. Rival and spectator views and the drum seat are unchanged.
- **C3 garage:** the swapped drummer sits at the kit, the kit hotspot reads "Your rig" (it still opens the songwriter), and you noodle in the
  amp corner. **C6 fix:** if the swapped drummer quits, the drama fill-in drummer (`fill_drums`) takes the kit. The stage already handled this.
- **C4 creator:** a "Your gear" tab on string seats (shape, colour, guard, sticker) and the preview's 'gear' mode. Drums keep KIT_LOOK.
- **C5:** on the carpet you hold your instrument (the axe pose; `info().you`). The recap photo shows your instrument. In the van, your gig bag
  rides between the front seats (`info().gigBag`, +1 draw call).
- **C6:**
  - pw_stage seat now covers:
    - the gig screen's own setup (55 `stageData` sends no `seat` key, so the seat is read from the state)
    - the fill-in drummer on the riser
    - the van gig bag
    - `bandAction('player', 'solo')`
  - pw_garage seat now checks the fill-in at the kit.
  - The pw_bands_render seats sheet writes every tile to `CONTACT_DIR`.

## Counts
- **Draw calls, stage** (pw_stage seat, both sizes): string seats use 29–32 calls against the HD drum stage's 34 (gate 39).
  In `tools/perf.js` scenes: club bass 32 and lead 35 against `stage_club` 36 (gate 41).
- **Draw calls, garage:** string seats are ×1.02–1.03 of their band's drum garage. The perf `garage_seat_rhythm` is 44 against 43 (gate 49).
- **Allocations:** the seat code (youPose, autoDrum, stepTick, strumHit, kitHit, camView) allocates about 390–410 B per frame, which is
  boxed doubles only (gate 640 B). Whole-frame allocation on a seat stage is 43.8 KB (bass) and 35.7 KB (rhythm), against 75.5 KB on the drum stage.
- **Size:** `dist/game.html` is 4,391,158 B, which is **+41,553 B** over `v1.1-seats` (D + B: 4,349,605). The lane target was +90 KB; the gate is 5,000,000 (ok).
- **Contact sheet:** `tests/.cache/v11_seat_sheet.png` and `v11_seat_sheet_440.png`, plus 44 tiles per size in the session scratchpad
  `v11_contact/`. I looked at both sheets:
  - Every band × seat shows the right instrument (the GRR rhythm is the acoustic), the right drummer on the riser, and the boom mic only for
    Rox, Chase and Travis.
  - The garages show the drummer at the kit and the "Your rig" label.
  - Nothing clips through anything.

## Tests (390x844 and PW_VIEW=440x956)
- **pw_stage** default (stage + van + seat): 165/165 at both sizes. The seat section with the van check: 125/125 at both sizes.
- **pw_garage** default: 109/109 at 390. At 440 the run under load failed 3 garage taps (laptop, merch, trophies). The garage section run
  alone passed 48/48 twice, and the seat section passed 61/61.
- **pw_creator:** creator 34, kit 8, meta 12 and gear 39 pass at both sizes. The stage section failed 5/6 under load (2 fps: the carpet walk
  needs more than 9 s) and passed 6/6 alone twice at each size.
- **pw_recap:** offer 13, recap 19, recap:bands 15 and recap:seat 10 at both sizes.
- **pw_bands_render:** 106/106 at both sizes; the opt-in seats section 46/46 at both sizes.
- **pw_perf:** scenes 18, governor 12, ratio 11, stalls 10 and audio 7 at both sizes. `tools/perf.js scenes` + `report` gives the seats line
  ok and the size line ok.
- **node tests/run.js:** 28 files all pass. sim_seats is 14/17; the 3 failures are the known lead items (doom-tempo holds and chords,
  frost_heave lead avg bot, Solo Too Long).

## Handovers
- **Lead (02 / §4.9):** add `stage.info()` keys `seat`, `view`, `camera`, `drummer`, `you`, `boom`, `mics`, `seatMode`, `autoHits`;
  `van.info().gigBag`; `carpet.info().you`; `R.seatGear` / `R.instrument`; `GG.creator.sanitizeGearLook`.
- **Lead / B (55, optional):** `stageData()` could pass `seat: state.seat` and `lineup: GG.career.lineup(state)`. It works without them,
  because 42 falls back to the state and to `career.lineup`, and the fill-ins come from `drama.lineup` members.
- **Lead:** `pw_bands_render META_ONLY=seats` is opt-in (about 3 min). Add it to the release matrix once per size.

## Gaps (cosmetic, not blocking)
- **Hail Damage bass and lead camera:** the edge of the kit's crash cymbal shows in the bottom-right corner, just above the highway.
- **Grid Road Ramblers rhythm:** Clementine's spot (RC) is just ahead of you, so she fills part of the left of your camera view.
- **440 seat sheet:** the tiles are cropped to 390 px wide, so the right edge of the 440 frame is missing from the sheet.
- **Load timing:** under heavy machine load (two browsers plus other agents, about 2 fps), pw_creator `stage` (the carpet walk wait) and the
  pw_garage `garage` taps at 440 can time out. Both pass alone.
