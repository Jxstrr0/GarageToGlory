# v1.4 "Tuning" integration report (verifier, branch `v1.4-tuning`, 2026-10-07)

DRAFT: the verify run is in progress (started 00:14 UTC after a container restart cut the first verifier at ~00:12; nothing of
that run was used). Sections fill in as the matrix streams finish.

## 1. What was verified
- Branch `v1.4-tuning` at 476ee4e (build + re-probe). Owner picks (status.md Addendum 7): M1 "Gigs pay, side jobs less" (the
  critic's B+), M2 "Fair grades", M3 jam room $35/wk until signed. Build detail: `plan/v14/build_report.md`; re-probe:
  `plan/v14/probe_after.md`.
- Source vs `main` (1.3.1.0): 22 files in `src/` + `tests/` (355+ / 50-); no new state key, SAVE_SCHEMA stays 10.

## 2. Checklist
- Build: `node build.js` -> V1.4.0.0, 99 modules, **5,244,808 B** (gate <= 6,000,000; `tools/perf.js size` ok; gzip-9
  1,717,889 B; v1.3.1 was 5,236,063 B). A rebuild at 476ee4e leaves `dist/` byte-identical (git clean).
- Node suite `node tests/run.js`: **SUITE ALL PASS** (36 files; incl. sim_money 8/8, sim_gig 37/37, sim_world 21/21,
  sim_shop 17/17, sim_career, sim_recap 6/6, sim_bands 17/17, **compat_v12 10/10** (songwriter law), **save 22/22** (old saves)).
- Classic audio: `META_ONLY=hash` pw_seq **232/232 equal** at 390x844 and at 440x956 (inside the matrix streams).
- Full Playwright matrix (390x844 + 440x956), pw_perf, phoneqa: running (00:56 UTC: 38 + 40 sections passed so far; the
  first-run failures so far are render-speed / van timing under two parallel browsers, to be rerun alone).

## 3. Owner check shots (440x956; verifier scratch `v14_owner/`, not committed; script `v14_owner/shots.js`), looked at each
- `01_results_band_cut.png`: Hail Damage on **bass**, the Legion (Saskatoon, tier 1, flat), a PLAYED live gig (the autoplay bot
  at 84% tap accuracy, 30 ms jitter, Normal; not Simulate). **A**, score 76, 85% hit; the money row reads **Pay $143 · Band's
  cut −$43 · Gas −$5**, then Crowd 22/60 · Fans +7 · Buzz +9 and "**Into the fund: +$95** · the band takes 30% of the pay · a
  great show paid 10% more". No horizontal scroll. (1.3.1 paid this room $80 with no cut shown.)
- `02_results_drums_same_grade.png`: the same gig, seed and accuracy on **drums**: 84.8% hit (bass 84.9%) -> **A, score 76,
  Pay $143, cut −$43, Gas −$5, +$95 into the fund**: same grade, same pay as bass (M2). The drum chart's songs show 2x the notes
  (306 vs 125 perfect in song 1) at the same %.
- `03_jam_room_card.png`: the Monday card "A Room of Your Own" (Mom, year 1 week 22, Local Heroes): "... a door that locks,
  **$35 a week until you sign (then $60)**"; choices "Move in ($35/week)" / hint "Rent $35/wk ($60 once signed) · rehearse
  better", "Stay home for now".
- `04_shop_drums.png`: the Drum shop (start fund $450, week 1), scrolled to the add-ons: Rack tom + floor tom $450 (unchanged),
  **China cymbal (Hail Damage's lane-6 "ride") $200** (was $350; locked: "Needs the rack tom + floor tom first"),
  **Double-kick pedal $250** (was $300; buyable).
- `05_week_money.png`: a gig-first drummer (the avg bot's choices, Hustle -> Rehearse, as `plan/v14/human.js` NOHUSTLE=1), the
  week-6 wrap after a booked gig (Moose Jaw Legion, B: pay $155, cut $47, gas $55): "This week +$30" (upkeep −$23 included).
  Fund by week $450 -> 428 -> 426 -> 234 -> 173 -> 250 -> 280, no parents' loan.
- `05b_laptop_money.png`: the laptop Money tab at the same point: fund $280, owed $0, loans 0, earned $405, 5 gigs, the
  7-week fund bars (W0 = the start baseline, as in 1.3.1).

## 4. Findings
Pending.
