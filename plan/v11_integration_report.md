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

### Leak scans (§6.4)
- `LEAK_YEARS=13 node tests/sim_bands.test.js` (drums): ALL PASS 17.
- `SEAT=all LEAK_YEARS=10 node tests/sim_bands.test.js` (strict): first run FAILED 1/24: Hail Damage rhythm saw a shouting
  review (24 `caps: true`) quote the album "THRONE OF SOD II"; Lane A's LEFT phrase 'Throne of' is case-sensitive. Fix in
  `tests/seat_scan.js`: every LEFT phrase also matches in ALL CAPS (HARD phrases aimed at you still win: "YOUR STICKS" is a
  leak). Re-run: **ALL PASS 24**, zero seat leaks (4 bands x 3 string seats x 3 seeds x 10 years, avg + good bots).

### Balance, drum seat (§6.5)
- `NO_BONUS=1 BAND=all node tools/balance.js 10 30` equals `plan/balance_v10_nobonus.txt` (1.0.1.0) line for line
  (`grep -v '^done in'`); only the header's deck size changes (444 -> 534 cards: the 90 new cards are all seat-gated).

### Balance, string seats (§6.5) -> `plan/balance_v11_seats.txt`
`SEAT=all BAND=all node tools/balance.js 6 30` (1,933 s) and `6 10`. Year-3 values as a share of the same band's drum seat
(30 seeds; "ok" = within ±10 %):

| band | bot | bass fans / fund | rhythm fans / fund | lead fans / fund |
|---|---|---|---|---|
| Hail Damage | avg | 104 / 97 | **90** / 92 | 103 / 102 |
| Frost Heave | avg | **110** / 103 | 102 / 95 | **111** / **111** |
| Gravel Kings | avg | **111** / 94 | 100 / **86** | 106 / **88** |
| Grid Road Ramblers | avg | 107 / 98 | **111** / **135** | 109 / **116** |
| Hail Damage | good | 93 / 96 | 91 / 103 | 90 / **85** |
| Frost Heave | good | 101 / 102 | 102 / 99 | 101 / 101 |
| Gravel Kings | good | 98 / 98 | 92 / 92 | 94 / 103 |
| Grid Road Ramblers | good | 95 / **90** | 103 / 102 | 100 / 91 |

Means over the 12 band x seat cells: avg bot fans 105 %, fund 101 %; good bot fans 97 %, fund 97 %.
**Noise floor** (the drum seat against itself, `SEAT=drums SEED_OFFSET=500 ... 6 30` vs the default seeds): avg bot fans
85-101 %, fund 81-110 %; good bot fans 94-100 %, fund 93-104 %. Every per-cell miss above is inside that seed noise (B saw the
same: up to 19 % drum vs drum). World week: every string seat within 7 weeks of drums; reach differs by <= 17 points (a share
of 30 seeds; the good bot reaches 100 % everywhere).

**Live bots** (`LIVE BOTS`, 3 fresh careers per cell): perfect bot accuracy **1.000 on all 64 band x seat x difficulty cells**;
avg bot (0.9, 40 ms) within **-2.4 .. +1.8** points of the drum seat (gate 3). sim_seats ALL PASS 17.

### Size and render (§6.7)
- `dist/game.html` **4,537,936 B** (gate 5,000,000: ok, 462,064 B headroom); gzip-9 1,332,946 B (gzip -6 1,339,325 B).
  Delta vs stage 0 (4,247,084): **+290,852 B** (planned +660 KB). By lane: D +30,506 · B +72,015 · lead (51 picker) +7,489 ·
  C +41,553 · A +138,898 · integration +391.
- `node tools/perf.js scenes` + `report` (390x844, SwiftShader): every scene's draw calls / triangles within its gate. Seats line:
  `stage_club_seat_bass` 32 calls, `stage_club_seat_lead` 35 (gate: stage_club 36 x 1.15 = 41.4); `garage_seat_rhythm` 44
  (gate: garage_hail_damage 43 x 1.15 = 49.5). Voice cap holds: peak sources 25 (x1) / 23 (x4) <= 32, tap drops 0, audio
  nodes/s 57 / 56 <= 80.
