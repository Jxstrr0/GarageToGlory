# v1.1 "Seats" integration report (2026-10-03, branch `v1.1-seats`)

Lead integrator pass: lanes C (render) and A (content) merged on top of D + B + the lead work (51 seat picker, pw_seats).
Contract `plan/plan_contract_1.1.md` §5 Lead, cross-lane hand-overs, §6 checklist items 1-9.

## 1. Merges
| step | commit | result |
|---|---|---|
| merge `origin/wip-v11-c` (52064b2) | 57880fe | no conflicts (dist auto-merged, then rebuilt): 4,398,647 B; node SUITE ALL PASS (29 files) |
| merge `origin/wip-v11-a` (a9ec142) | 8d4b9a0 | no conflicts (dist rebuilt): 4,537,545 B; node SUITE ALL PASS after the sim_legacy fix below |
| handovers | 2caa2e4 | see §2 |
| phoneqa v1.1 sweep | 99167a5 | see §3 |

## 2. Hand-overs applied (lead / unowned files)
- **A0** `tests/sim_legacy.test.js`: the bass seat now expects `endings.player.bass[tier]` (its own card, different from the
  drums one); "no v1.0 content uses seatRole" became "on the drum seat no swapped-drummer variant fires" (A's epilogue
  variants use `when.seatRole`).
- **A1** `C.ACH_KINDS` already had seatCareer / soloTooLong / allSeats (lead step 1): the four seat achievements are in
  `content.achievements` (content_seats checks it).
- **A2** the 51 seat cards read `bands.<id>.seatLines[seat]` (checked the copy for all four bands; pw_seats pick asserts the
  swapped member's name on every string card).
- **A3 / C** `src/02_contracts.js` "As merged (v1.1 lanes C render + A content)": R.seatGear / R.instrument, stage.setup
  `{ seat, lineup }`, stage.info() seat / view / camera / drummer / you / boom / mics / seatMode / autoHits, van.info().gigBag,
  carpet.info().you, GG.creator gear functions, 5j openLook seat + testids, every new content key (seatLines, top-level
  seat / swapped, arc_ / fin_ / sw_ cards, shop bySeat + drummerGear, creator.gear, coach bySeat, songReactions kit / bySeat,
  recruits.drummers, drama.fillIns.drums, endings.player per seat, epilogue when.seatRole, seatAchievements). The soloTooLong
  note now says default min 0.3.
- **A4** `src/2a_sim_shop.js` SEAT_GEAR fallback: "Nashville Strings" (a USA place) -> "Rodeo-Grade Strings" (A's content name).
- **Lead (Solo Too Long)** the blurb now reads "play a song where the solo takes over" (fits the 0.3 default; `min` unchanged).
- **C (creator wiring)** found and fixed: 51's Start button never passed the creator's `gearLook` to `GG.creator.prepare`, so a
  new career's "Your gear" pick was dropped. Now `prepare({ ..., gearLook })`; pw_seats pick checks `player.gearLook.shape`.
- **C (55, optional)** `stageData()` passes `seat: state.seat` and `lineup: GG.career.lineup(state)` (the contract's only entry
  point; identical to 42's fallback).
- **Lead (pw_creator)** `seat-next` tap after `btn-intro-next` at both new-career walks (lines 74, 313).
- **pw_seats** garage / stage no longer skip (a missing seat API now fails); pick adds "Customize opens Your gear for the
  picked seat" + the gear pick reaching the career; garage adds Lane A's strict seat leak scan (tests/seat_scan.js) over the
  week UI's visible text on three string seats; stage adds "you hold your instrument, spot camera".
- Not changed (documented as gaps): A5 forceWeek 2 collision, A6 weekly mood chat not seat-aware, D's two open choices.

## 3. Checklist §6
(filled in as the runs finish)

### 4. Leak scans
- `LEAK_YEARS=13 node tests/sim_bands.test.js` (drums): ALL PASS 17.
