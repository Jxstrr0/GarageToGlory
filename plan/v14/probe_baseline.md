# v1.4 Tuning: bot probes, money baseline (years 1-3)

Branch `v1.4-tuning` (fdecb74 = main 1.3.1.0 + status notes), measured in a scratch worktree; nothing in `src/` or `content/` was edited.
Numbers, not opinions. Owner pain points: "too tight early" (years 1-2) and "gig pay feels off"; follow-up: "drums felt worse tbh".

## The 5 most telling numbers

1. **$3 vs $73.** Year 1, avg bot, drums: one gig leaves **$3** in the fund on average (gross $62, minus the 30% members' cut, gas and road cards), and one Hustle block brings in **$73**. Bass: **-$2 vs $72**. Gigs stay below a Hustle block for the avg bot in years 2-3 too ($25-56 per gig vs $99-146 per block; $39-154 with merch net). Year-1 hustle money ($789) is about the same as all year-1 gig pay ($863). (T10, T4)
2. **Gas = 55% of year-1 gig pay, and the top cost in 60-89% of loan weeks.** Drums avg: gas $474 of $863 gig pay (bass: $537 of $827, 65%). After the cut ($289) and road cards ($42), the year's 13.8 gigs leave about $40 in the fund. Gas is the biggest cost in 60-89% of the weeks that end in a parents' loan (weak + avg bots, drums avg 89%, bass avg 78%). A loan week starts from a median fund of about $112. One 220-363 km booking costs $110-182 in gas against $83-140 for a tier-1 room. 53-60% of year-1 gigs pay $0 (exposure deals) but still cost gas. In Frost Heave and Grid Road Ramblers, the weak bot's year-1 gas is higher than its gig pay. (T9, T5, T3, X1, T11)
3. **Playing well pays $0 more on the night.** Within one gig setup the pay is identical at 55% and 100% accuracy (64/64 setups). Simulate and Played give identical pay and identical net in 320/320 rows. Accuracy changes only the grade (C to S), new fans (x3.5) and venue rep (S gives +2 rep, at most +12-18% on that room's next listing). It still matters slowly: a -12 performance shift (about one grade lower, drums avg) moves year-1 broke weeks from 1.4 to 3.1, careers with a loan in year 1 from 25% to 48%, and the year-3 fund from $2,160 to $1,061. (T11, T12)
4. **25-48% of avg-bot careers borrow from the parents in year 1** (drums 25%, bass 30%, rhythm 38%, lead 48%; weak bot 40-65%). The design target is "rare with decent play". By year 3 it is 0-5%. In the first quarter the fund falls from the $300 start to a $177 median at week 6 (drums avg; Q1 net -$109). The base upkeep alone ($22/week) is $132 per quarter. (T2, T1, T6)
5. **The first gear is affordable from week 24-31 but not bought until week 42-45.** Affordable here means the avg-bot median week when a $450 lane item fits with $100 left; the avg bot's first actual gear buy (it keeps a $900 cushion) is week 42-45, at the end of year 2. The gear for the full drum chart costs **$1,100** vs **$750** for bass (bass tops out at 5 lanes), and the drum chart has **1.96x the notes** (5.65 vs 2.88 notes/s on Normal). (T7, D1)

**The mid game is not tight (keep it that way).** Year 3, avg bot: 0.0-0.3 broke weeks, 0-5% loans, median fund $1.9-2.3k (good bot $3.5-4.1k, 0 broke weeks). Good-bot year-3 net per gig is $146-183 (plus $370-432 with merch). The squeeze is a year-1 / early-year-2 problem made of gas on far or unpaid shows, a flat 30% cut on small pay, and pay that ignores performance.

## Targets (plan/status.md, balance notes)

| target | measured (Hail Damage, 40 seeds) | verdict |
|---|---|---|
| Steady pace: Local Heroes (250 fans) about the end of year 1 (wk 24) | avg wk 20-21, weak wk 22-25, good wk 16 | ok (good bot early) |
| Steady pace: first label interest in year 2 (wk 25-48) | avg wk 37-41, weak 41-45, good 25-28 | ok |
| Steady pace: signed by year 2-3 | avg wk 39-48, weak 46-50, good 26-29 | ok |
| Money feel "scrappy, but not too brutal": parents' loan rare with decent play | avg: 25-48% of careers in Y1, 5-18% Y2, 0-5% Y3 | MISS in year 1 |
| "always a little short" | avg broke weeks Y1 1.4-2.6 of 24, Y3 0.0-0.3 | early ok/tight, late not short |
| v1.1: every seat's fund@y3 within ±10% of drums | avg: bass 86%, rhythm 96%, lead 109%; good: 118/119/107%; weak 130/88/92% | mixed; v1.1 lane report measured ±19% seed noise at 30 seeds |
| balance.js cross-check (SEAT=all, 3 yrs x 20 seeds, means) | avg fundEnd Y1: drums 458, bass 386, rhythm 414, lead 499; loans in Y1 0.3 / 0.5 / 0.8 / 0.7 per career | consistent with this driver |

## Drums vs bass (owner follow-up "Drums felt worse")

D0. Hail Damage, paired seeds (40 per cell):

| Hail Damage | drums weak | bass weak | drums avg | bass avg | drums good | bass good |
|---|---|---|---|---|---|---|
| Fund wk 6 (median) | $159 | $174 | $177 | $206 | $223 | $220 |
| Fund end Y1 (median [p10-p90]) | $358 [$114-$624] | $276 [$99-$525] | $410 [$159-$956] | $387 [$162-$686] | $677 [$396-$1,496] | $723 [$340-$1,154] |
| Fund end Y2 (median) | $764 | $867 | $1,031 | $886 | $2,166 | $2,326 |
| Fund end Y3 (median) | $1,067 | $1,386 | $2,160 | $1,858 | $3,466 | $4,102 |
| Broke weeks Y1 (of 24) | 4.0 | 2.6 | 1.4 | 1.9 | 0.4 | 0.8 |
| Careers with a loan in Y1 | 40% | 48% | 25% | 30% | 3% | 18% |
| Careers with a loan in Y2 | 15% | 10% | 5% | 18% | 3% | 3% |
| Gigs Y1 | 12.1 | 12.5 | 13.8 | 13.4 | 23.1 | 23.3 |
| Gig pay Y1 (gross) | $548 | $611 | $863 | $827 | $2,526 | $2,403 |
| Members cut Y1 | $183 | $200 | $289 | $278 | $850 | $791 |
| Gas Y1 | $532 | $536 | $474 | $537 | $755 | $886 |
| Hustle Y1 | $859 | $820 | $789 | $771 | $371 | $457 |
| Unpaid (exposure) gigs Y1 | 60% | 58% | 53% | 55% | 44% | 45% |
| Net per gig Y1 (mean, before merch) | -$14 | -$11 | $6 | $0 | $38 | $29 |
| Gear+kit spent Y1-Y2 | $215 | $224 | $360 | $378 | $2,131 | $2,081 |

- **The bots show no structural drum penalty.** Avg bot: drums has fewer broke weeks in year 1 than bass (1.4 vs 1.9), fewer loans (25% vs 30%) and a higher year-3 fund ($2,160 vs $1,858). The weak bot has more year-1 broke weeks on drums (4.0 vs 2.6) but fewer loans (40% vs 48%). Across the 4 bands (X1) the weak bot's drums has more year-1 broke weeks in 3/4 bands (+0.3 to +1.8), avg is mixed (±0.5), and drums' year-3 fund is higher in 5/8 band x bot cells. That is noise-sized.
- **Bot careers can't see the chart.** They resolve gigs with `gig.simulate`, which uses stats only, so the drum-vs-bass gap the owner feels must come from things the bots don't model. Measured:
  - D1. Chart density: drums **376 notes/song, 5.65 notes/s** on Normal (414, 6.23 on Hard) vs bass **192, 2.88** (rhythm 143 / 2.38, lead 210 / 3.15). A bot with fixed hands (0.9 tap chance, 40 ms) scores the same on every seat, but a human hits fewer of twice as many notes. Fewer hits mean a lower grade, which means fewer fans and less rep, which slows crowd and door-pay growth (T12: one grade costs about +1.7 broke weeks and +23 points of loan share in year 1).
  - D2. Gear for the full chart: drums need toms $450 + ride $350 + pedal $300 = **$1,100**. Bass needs **$750**: `C.SEAT_MAX_LANES.bass = 5`, so the $350 lane-6 item only adds a cab for bass. On drums the lanes are the instrument, so the shop pressure is real while the fund sits around $200-400.
  - D3. Seat-only cards are a small factor. Money cards a drummer can draw: 12 (best-choice sum +$2,910, worst -$2,025) vs 21 for bass (+$3,340 / -$2,620). The garage-era pools are about equal (drums +$5,215 / -$5,430, bass +$5,495 / -$5,525).
  - D4. Pay doesn't reward the harder chart: same pay at any accuracy (T11).

## Setup

- Driver: `bp/drive.js` replays `GG.career.botWeek` exactly as `tools/balance.js` does (same seeds: seed x 7919, seeds 1-40; default band Hail Damage, Normal difficulty; 30_audio loaded for seat charts). Every fund change is booked to a category by wrapping the sim calls (cards, shop buys, runWeek blocks, gig apply / afterGig, endWeek upkeep parts, loans). Exclusive attribution, 0 unattributed dollars (residual categories stayed empty).
- Bot styles: **avg** and **good** are balance.js's own. **weak** is a proxy (balance.js has no weak bot): the avg bot that takes the best card or listing 20% of the time (avg: 50%) and accepts 50% of gig offers (avg: 70%).
- Definitions: broke week = fund < $100 at the week's end. Parents' loan (the debt floor) = the fund is below $0 at the wrap and gets topped up to $100. Quarter = 6 weeks. Fund figures are at the period's last wrap. "Mean" columns are means over careers; fund uses median [p10-p90].
- Simulate probe (`bp/simprobe.js`): for 4 seats x 4 seeds x {140 fans, tier-1 rooms; 700 fans (local era), tier-2 rooms} x {door, flat} x accuracies {0.55, 0.7, 0.85, 0.95, 1}, the same listing is played live by `botPlay`, simulated via `simBot` + `simShow` from a playLog at the played accuracy, and auto-resolved via `gig.simulate`. Each result is settled through `career.finishGig` on a copy, so the net includes the cut, gas, rep and tows.
- Performance-shift probe (T12): drums avg, 40 seeds, `GG.gig.performance` + / - 12 points in-process (about one grade). Pay rules untouched.
- Cross-band (X1): drums + bass, weak + avg, 30 seeds, Frost Heave / Gravel Kings / Grid Road Ramblers (+ Hail Damage at 40).
- Caveat: bots book by value (1 fan is worth about $20), so they take many exposure and far shows. A human who books only paid nearby rooms would see less gas. The per-gig numbers in T3 / T11 show both sides.
- Reproduce (from `scratchpad/v14/bp`): `node drive.js <worktree> <seat> weak,avg,good 40 3 [band] > x.jsonl`, `node agg.js summary.json x.jsonl...`, `node simprobe.js <worktree> 4 > sim.json && node simtab.js sim.json`, `PERF_DELTA=-12 node drive.js ...`, `node density.js <worktree> 6`, `./xband.sh`. Raw output: `bp/hd_*.jsonl`, `bp/xb_*.jsonl`, `bp/pd_*.jsonl`, `bp/sim.json`, `bp/balance_seat_all_3x20.txt`.

## Tables (Hail Damage, 40 seeds per seat x bot unless noted)

### T1. Band fund at the end of each period: median [p10 - p90] ($)
| seat | bot | Y1 Q1 (wk 6) | Y1 Q2 (wk 12) | Y1 Q3 (wk 18) | Y1 end | Y2 end | Y3 end |
|---|---|---|---|---|---|---|---|
| drums | weak | 159 [66 - 283] | 211 [80 - 488] | 255 [62 - 559] | 358 [114 - 624] | 764 [457 - 1598] | 1067 [570 - 3426] |
| drums | avg | 177 [99 - 390] | 339 [219 - 669] | 375 [199 - 750] | 410 [159 - 956] | 1031 [533 - 2206] | 2160 [962 - 4474] |
| drums | good | 223 [172 - 355] | 414 [243 - 839] | 642 [386 - 961] | 677 [396 - 1496] | 2166 [1490 - 3725] | 3466 [2138 - 6836] |
| bass | weak | 174 [91 - 300] | 291 [102 - 434] | 264 [72 - 456] | 276 [99 - 525] | 867 [460 - 1767] | 1386 [745 - 3250] |
| bass | avg | 206 [89 - 355] | 289 [139 - 565] | 294 [124 - 575] | 387 [162 - 686] | 886 [389 - 2159] | 1858 [557 - 3383] |
| bass | good | 220 [136 - 261] | 370 [211 - 780] | 450 [159 - 810] | 723 [340 - 1154] | 2326 [1636 - 3586] | 4102 [2382 - 7056] |
| rhythm | weak | 154 [69 - 329] | 224 [87 - 473] | 204 [75 - 609] | 285 [98 - 570] | 624 [265 - 1722] | 938 [446 - 2418] |
| rhythm | avg | 201 [77 - 373] | 271 [156 - 493] | 276 [128 - 604] | 345 [116 - 957] | 976 [544 - 2128] | 2064 [642 - 5060] |
| rhythm | good | 217 [179 - 259] | 365 [242 - 795] | 541 [319 - 767] | 687 [385 - 1128] | 2500 [1566 - 3921] | 4125 [2260 - 5783] |
| lead | weak | 137 [88 - 295] | 223 [78 - 405] | 219 [98 - 373] | 281 [114 - 625] | 733 [344 - 2030] | 979 [522 - 3016] |
| lead | avg | 154 [88 - 325] | 255 [109 - 549] | 332 [127 - 710] | 457 [182 - 796] | 1212 [570 - 2078] | 2346 [717 - 4372] |
| lead | good | 215 [99 - 270] | 385 [267 - 790] | 561 [232 - 885] | 887 [423 - 1518] | 2206 [1243 - 3932] | 3704 [2278 - 6723] |

### T2. Broke weeks (fund < $100 at the end of the week; mean per career) and parents' loans (% of careers with >= 1 loan in the period; mean loans)
| seat | bot | Q1 | Q2 | Q3 | Q4 | Y1 (of 24) | Y2 | Y3 | loan Y1 | loan Y2 | loan Y3 | loans/career Y1-3 | lowest fund Y1 (median) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| drums | weak | 1.0 | 1.4 | 0.8 | 0.8 | 4.0 | 0.6 | 0.2 | 40% | 15% | 8% | 0.9 | 28 |
| drums | avg | 0.6 | 0.6 | 0.1 | 0.1 | 1.4 | 0.4 | 0.0 | 25% | 5% | 0% | 0.5 | 83 |
| drums | good | 0.2 | 0.1 | 0.0 | 0.0 | 0.4 | 0.0 | 0.0 | 3% | 3% | 0% | 0.1 | 150 |
| bass | weak | 0.9 | 0.7 | 0.6 | 0.5 | 2.6 | 0.8 | 0.1 | 48% | 10% | 3% | 0.9 | 68 |
| bass | avg | 0.6 | 0.6 | 0.5 | 0.3 | 1.9 | 0.5 | 0.1 | 30% | 18% | 5% | 0.8 | 74 |
| bass | good | 0.3 | 0.3 | 0.2 | 0.0 | 0.8 | 0.0 | 0.0 | 18% | 3% | 3% | 0.3 | 114 |
| rhythm | weak | 0.8 | 1.2 | 0.9 | 0.9 | 3.7 | 0.8 | 0.1 | 45% | 20% | 5% | 1.1 | 42 |
| rhythm | avg | 0.5 | 0.7 | 0.5 | 0.5 | 2.2 | 0.7 | 0.3 | 38% | 18% | 5% | 0.8 | 74 |
| rhythm | good | 0.2 | 0.2 | 0.2 | 0.1 | 0.7 | 0.1 | 0.0 | 5% | 3% | 5% | 0.1 | 120 |
| lead | weak | 0.8 | 1.1 | 0.9 | 0.8 | 3.6 | 0.8 | 0.1 | 65% | 20% | 3% | 1.4 | 40 |
| lead | avg | 0.8 | 0.9 | 0.5 | 0.4 | 2.6 | 0.4 | 0.0 | 48% | 8% | 3% | 0.8 | 48 |
| lead | good | 0.4 | 0.2 | 0.1 | 0.0 | 0.6 | 0.0 | 0.0 | 8% | 0% | 0% | 0.1 | 124 |

### T3. Gigs: count per career, median gross pay per gig by venue tier (paid gigs only; n = gigs pooled over careers), exposure (unpaid) share, median net per gig to the fund
net per gig = pay - members' cut - gas - fill-ins - commission - crew - tow (merch not included).
| seat | bot | year | gigs/career | T1 pay (n) | T2 pay (n) | T3 pay (n) | unpaid share | net/gig (median) | net/gig (mean) | net per PAID T1 / T2 gig (median) | gas/gig (mean) | merch/gig (mean) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| drums | weak | Y1 | 12.1 | $100 (151) | $180 (42) | - | 60% | -$5 | -$14 | $50 / $83 | $44 | $0 |
| drums | weak | Y2 | 12.1 | $110 (85) | $223 (260) | - | 28% | $23 | $36 | $58 / $109 | $64 | $33 |
| drums | weak | Y3 | 11.7 | $108 (58) | $300 (276) | $786 (37) | 21% | $51 | $40 | $18 / $106 | $89 | $123 |
| drums | avg | Y1 | 13.8 | $110 (146) | $167 (113) | - | 53% | -$5 | $6 | $58 / $100 | $34 | $1 |
| drums | avg | Y2 | 12.5 | $110 (74) | $255 (312) | $785 (3) | 22% | $54 | $52 | $51 / $120 | $68 | $58 |
| drums | avg | Y3 | 12.0 | $120 (57) | $300 (262) | $800 (57) | 22% | $54 | $48 | $54 / $112 | $81 | $182 |
| drums | good | Y1 | 23.2 | $110 (189) | $200 (333) | - | 44% | -$5 | $38 | $65 / $118 | $33 | $35 |
| drums | good | Y2 | 20.3 | $120 (55) | $325 (491) | $825 (106) | 20% | $88 | $83 | $51 / $123 | $77 | $231 |
| drums | good | Y3 | 20.7 | $120 (58) | $340 (295) | $1,100 (341) | 16% | $176 | $181 | $54 / $157 | $89 | $437 |
| bass | weak | Y1 | 12.5 | $102 (145) | $150 (65) | - | 58% | -$5 | -$11 | $51 / $47 | $43 | $0 |
| bass | weak | Y2 | 12.6 | $115 (82) | $248 (298) | $25 (2) | 24% | $23 | $38 | $36 / $106 | $72 | $28 |
| bass | weak | Y3 | 11.9 | $115 (43) | $278 (259) | $825 (54) | 25% | $40 | $20 | $28 / $87 | $95 | $142 |
| bass | avg | Y1 | 13.4 | $105 (150) | $180 (93) | - | 55% | -$5 | $0 | $51 / $108 | $40 | $1 |
| bass | avg | Y2 | 13.2 | $115 (80) | $272 (305) | $668 (7) | 25% | $23 | $33 | $51 / $109 | $79 | $53 |
| bass | avg | Y3 | 12.2 | $120 (50) | $310 (267) | $815 (65) | 22% | $41 | $31 | -$5 / $94 | $110 | $160 |
| bass | good | Y1 | 23.3 | $110 (187) | $205 (323) | - | 45% | -$5 | $29 | $61 / $121 | $38 | $29 |
| bass | good | Y2 | 20.5 | $120 (56) | $345 (479) | $825 (125) | 20% | $97 | $82 | $47 / $129 | $80 | $240 |
| bass | good | Y3 | 20.7 | $120 (57) | $340 (300) | $1,103 (338) | 16% | $182 | $187 | $54 / $155 | $93 | $441 |
| rhythm | weak | Y1 | 12.9 | $100 (135) | $189 (75) | - | 59% | -$5 | -$13 | $54 / $96 | $49 | $1 |
| rhythm | weak | Y2 | 12.4 | $110 (86) | $240 (275) | - | 27% | $16 | $20 | $53 / $96 | $75 | $26 |
| rhythm | weak | Y3 | 11.3 | $115 (51) | $285 (262) | $750 (31) | 24% | $19 | $29 | $51 / $91 | $89 | $104 |
| rhythm | avg | Y1 | 13.7 | $105 (136) | $190 (101) | - | 57% | -$5 | $3 | $58 / $114 | $39 | $1 |
| rhythm | avg | Y2 | 14.0 | $105 (89) | $260 (324) | $390 (2) | 26% | $37 | $38 | $51 / $117 | $71 | $60 |
| rhythm | avg | Y3 | 12.0 | $115 (59) | $278 (250) | $820 (58) | 23% | $34 | $34 | $22 / $99 | $92 | $155 |
| rhythm | good | Y1 | 23.4 | $105 (186) | $200 (320) | - | 46% | -$5 | $28 | $58 / $117 | $36 | $25 |
| rhythm | good | Y2 | 20.2 | $120 (59) | $320 (487) | $825 (111) | 19% | $104 | $86 | $54 / $131 | $71 | $236 |
| rhythm | good | Y3 | 20.5 | $120 (61) | $360 (348) | $1,030 (281) | 16% | $154 | $150 | $54 / $149 | $99 | $404 |
| lead | weak | Y1 | 12.8 | $101 (126) | $190 (69) | - | 62% | -$5 | -$15 | $34 / $117 | $48 | $1 |
| lead | weak | Y2 | 11.9 | $110 (74) | $235 (277) | $40 (1) | 26% | $20 | $27 | $51 / $105 | $74 | $38 |
| lead | weak | Y3 | 11.1 | $105 (46) | $268 (230) | $745 (39) | 29% | -$5 | -$1 | $21 / $90 | $99 | $141 |
| lead | avg | Y1 | 14.0 | $110 (142) | $170 (124) | - | 53% | -$5 | $4 | $54 / $100 | $40 | $2 |
| lead | avg | Y2 | 13.0 | $110 (77) | $270 (319) | $735 (6) | 23% | $58 | $48 | $54 / $117 | $72 | $78 |
| lead | avg | Y3 | 12.5 | $115 (58) | $328 (246) | $825 (93) | 21% | $61 | $61 | $45 / $119 | $86 | $182 |
| lead | good | Y1 | 22.9 | $110 (181) | $205 (328) | - | 44% | -$5 | $32 | $61 / $119 | $35 | $32 |
| lead | good | Y2 | 20.9 | $115 (74) | $350 (475) | $825 (134) | 18% | $98 | $82 | $52 / $138 | $83 | $242 |
| lead | good | Y3 | 20.7 | $120 (66) | $350 (311) | $1,108 (316) | 16% | $168 | $178 | $54 / $132 | $90 | $428 |

### T4. Money in per year (mean $ per career; loans excluded) and gig pay as a share of all money in
| seat | bot | year | gig pay | merch sales | hustle | cards/laptop | licensing | label | fan club | prizes | other+ | total in | gig share | gig net share* | hustle $/block |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| drums | weak | Y1 | $548 | $3 | $859 | $163 | $0 | $0 | $0 | $60 | $0 | $1,633 | 34% | -25% | $69 |
| drums | weak | Y2 | $2,001 | $392 | $837 | $321 | $181 | $233 | $20 | $98 | $12 | $4,095 | 49% | 21% | $96 |
| drums | weak | Y3 | $3,262 | $1,439 | $1,052 | $600 | $366 | $568 | $137 | $90 | $20 | $7,533 | 43% | 21% | $138 |
| drums | avg | Y1 | $863 | $13 | $789 | $122 | $0 | $0 | $0 | $98 | $0 | $1,884 | 46% | 5% | $73 |
| drums | avg | Y2 | $2,600 | $724 | $1,016 | $334 | $214 | $300 | $44 | $115 | $7 | $5,354 | 49% | 24% | $112 |
| drums | avg | Y3 | $3,550 | $2,179 | $972 | $590 | $354 | $984 | $154 | $165 | $5 | $8,952 | 40% | 20% | $141 |
| drums | good | Y1 | $2,526 | $821 | $371 | $105 | $0 | $115 | $3 | $300 | $0 | $4,241 | 60% | 34% | $78 |
| drums | good | Y2 | $7,017 | $4,699 | $134 | $738 | $895 | $984 | $167 | $425 | $0 | $15,059 | 47% | 28% | $137 |
| drums | good | Y3 | $13,289 | $9,059 | $181 | $808 | $759 | $3,592 | $254 | $700 | $0 | $28,642 | 46% | 32% | $154 |
| bass | weak | Y1 | $611 | $2 | $820 | $129 | $0 | $0 | $0 | $53 | $1 | $1,616 | 38% | -19% | $71 |
| bass | weak | Y2 | $2,328 | $359 | $1,034 | $267 | $234 | $345 | $28 | $60 | $17 | $4,672 | 50% | 21% | $101 |
| bass | weak | Y3 | $3,408 | $1,687 | $1,159 | $381 | $359 | $779 | $159 | $225 | $17 | $8,173 | 42% | 18% | $145 |
| bass | avg | Y1 | $827 | $11 | $771 | $131 | $0 | $1 | $0 | $98 | $1 | $1,839 | 45% | -2% | $72 |
| bass | avg | Y2 | $2,687 | $700 | $1,003 | $233 | $438 | $443 | $62 | $85 | $10 | $5,660 | 47% | 20% | $110 |
| bass | avg | Y3 | $4,069 | $1,944 | $1,287 | $687 | $328 | $713 | $189 | $115 | $7 | $9,338 | 44% | 20% | $146 |
| bass | good | Y1 | $2,403 | $667 | $457 | $54 | $0 | $87 | $1 | $225 | $0 | $3,893 | 62% | 31% | $76 |
| bass | good | Y2 | $7,358 | $4,923 | $144 | $691 | $1,047 | $946 | $172 | $435 | $0 | $15,716 | 47% | 28% | $164 |
| bass | good | Y3 | $13,522 | $9,125 | $191 | $621 | $858 | $3,605 | $251 | $575 | $0 | $28,748 | 47% | 32% | $166 |
| rhythm | weak | Y1 | $718 | $14 | $815 | $129 | $0 | $0 | $0 | $113 | $1 | $1,789 | 40% | -24% | $72 |
| rhythm | weak | Y2 | $2,082 | $323 | $997 | $308 | $198 | $269 | $20 | $120 | $20 | $4,337 | 48% | 16% | $98 |
| rhythm | weak | Y3 | $2,929 | $1,167 | $1,149 | $389 | $219 | $557 | $139 | $170 | $24 | $6,743 | 43% | 19% | $136 |
| rhythm | avg | Y1 | $874 | $20 | $784 | $101 | $0 | $0 | $0 | $143 | $0 | $1,921 | 45% | 0% | $73 |
| rhythm | avg | Y2 | $2,623 | $844 | $908 | $473 | $224 | $334 | $34 | $45 | $17 | $5,503 | 48% | 21% | $99 |
| rhythm | avg | Y3 | $3,629 | $1,852 | $1,096 | $587 | $251 | $784 | $169 | $220 | $13 | $8,600 | 42% | 20% | $141 |
| rhythm | good | Y1 | $2,315 | $584 | $457 | $49 | $38 | $51 | $1 | $240 | $0 | $3,735 | 62% | 31% | $77 |
| rhythm | good | Y2 | $6,861 | $4,767 | $154 | $915 | $845 | $771 | $168 | $400 | $0 | $14,880 | 46% | 28% | $154 |
| rhythm | good | Y3 | $11,943 | $8,290 | $220 | $872 | $777 | $4,199 | $244 | $650 | $0 | $27,194 | 44% | 28% | $163 |
| lead | weak | Y1 | $650 | $12 | $885 | $156 | $0 | $0 | $0 | $90 | $1 | $1,795 | 36% | -25% | $71 |
| lead | weak | Y2 | $2,099 | $456 | $991 | $415 | $231 | $339 | $25 | $160 | $22 | $4,738 | 44% | 16% | $102 |
| lead | weak | Y3 | $2,735 | $1,570 | $1,141 | $516 | $234 | $652 | $147 | $105 | $27 | $7,127 | 38% | 13% | $149 |
| lead | avg | Y1 | $923 | $32 | $826 | $215 | $0 | $2 | $0 | $60 | $1 | $2,059 | 45% | 2% | $74 |
| lead | avg | Y2 | $2,742 | $1,015 | $870 | $414 | $379 | $480 | $55 | $135 | $19 | $6,107 | 45% | 21% | $111 |
| lead | avg | Y3 | $4,368 | $2,273 | $990 | $533 | $423 | $1,017 | $180 | $90 | $16 | $9,890 | 44% | 25% | $145 |
| lead | good | Y1 | $2,385 | $728 | $463 | $304 | $0 | $148 | $4 | $218 | $0 | $4,250 | 56% | 28% | $80 |
| lead | good | Y2 | $7,637 | $5,058 | $128 | $781 | $957 | $837 | $175 | $480 | $0 | $16,053 | 48% | 29% | $160 |
| lead | good | Y3 | $12,881 | $8,856 | $198 | $574 | $775 | $3,697 | $248 | $575 | $0 | $27,803 | 46% | 32% | $168 |
*gig net share = (gig pay - members' cut - gas - road cards) / (money in - cut - gas - road cards): what the gigs leave in the fund vs everything else.

### T5. Money out per year (mean $ per career, shown positive) - the biggest costs
| seat | bot | year | upkeep base | upkeep per fan | era upkeep | rent | members' cut | gas | road cards | van | gear+kit | upgrades | merch stock | promote | band admin | commission+crew | cards/laptop | label/studio | other- | total out |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| drums | weak | Y1 | $527 | $34 | $8 | $0 | $183 | $532 | $50 | $0 | $0 | $0 | $5 | $161 | $3 | $0 | $163 | $0 | $0 | $1,665 |
| drums | weak | Y2 | $528 | $165 | $246 | $0 | $638 | $776 | $45 | $125 | $215 | $0 | $369 | $171 | $32 | $47 | $176 | $46 | $0 | $3,578 |
| drums | weak | Y3 | $528 | $515 | $768 | $0 | $1,036 | $1,044 | $37 | $206 | $643 | $18 | $788 | $178 | $39 | $565 | $290 | $66 | $0 | $6,719 |
| drums | avg | Y1 | $527 | $39 | $18 | $0 | $289 | $474 | $42 | $11 | $8 | $0 | $26 | $169 | $8 | $0 | $145 | $8 | $0 | $1,764 |
| drums | avg | Y2 | $528 | $212 | $358 | $6 | $833 | $850 | $51 | $145 | $353 | $3 | $582 | $181 | $32 | $149 | $154 | $167 | $0 | $4,604 |
| drums | avg | Y3 | $528 | $671 | $851 | $62 | $1,155 | $967 | $54 | $196 | $909 | $35 | $1,130 | $205 | $17 | $715 | $249 | $113 | $0 | $7,856 |
| drums | good | Y1 | $527 | $69 | $72 | $0 | $850 | $755 | $50 | $57 | $114 | $5 | $942 | $93 | $0 | $20 | $105 | $41 | $0 | $3,700 |
| drums | good | Y2 | $528 | $648 | $830 | $64 | $2,236 | $1,568 | $60 | $589 | $2,018 | $470 | $2,197 | $163 | $0 | $1,409 | $82 | $661 | $0 | $13,523 |
| drums | good | Y3 | $528 | $1,972 | $960 | $1,525 | $4,199 | $1,848 | $89 | $3,084 | $1,869 | $2,591 | $3,893 | $126 | $0 | $3,412 | $59 | $716 | $0 | $26,870 |
| bass | weak | Y1 | $527 | $36 | $13 | $0 | $200 | $536 | $38 | $8 | $0 | $0 | $0 | $173 | $9 | $0 | $190 | $0 | $0 | $1,729 |
| bass | weak | Y2 | $528 | $182 | $322 | $0 | $739 | $905 | $65 | $138 | $224 | $0 | $361 | $163 | $44 | $86 | $166 | $23 | $0 | $3,945 |
| bass | weak | Y3 | $528 | $581 | $859 | $15 | $1,157 | $1,129 | $47 | $250 | $585 | $11 | $966 | $177 | $26 | $703 | $244 | $80 | $0 | $7,357 |
| bass | avg | Y1 | $527 | $39 | $19 | $0 | $278 | $537 | $32 | $9 | $0 | $0 | $28 | $166 | $6 | $0 | $150 | $0 | $0 | $1,792 |
| bass | avg | Y2 | $528 | $233 | $449 | $11 | $851 | $1,039 | $66 | $183 | $378 | $7 | $552 | $169 | $42 | $208 | $125 | $72 | $0 | $4,913 |
| bass | avg | Y3 | $528 | $746 | $890 | $189 | $1,329 | $1,340 | $63 | $249 | $708 | $32 | $953 | $173 | $38 | $843 | $331 | $91 | $0 | $8,502 |
| bass | good | Y1 | $527 | $65 | $61 | $0 | $791 | $886 | $69 | $74 | $34 | $2 | $778 | $75 | $0 | $14 | $93 | $13 | $0 | $3,482 |
| bass | good | Y2 | $528 | $642 | $849 | $107 | $2,345 | $1,637 | $62 | $745 | $2,048 | $446 | $2,370 | $166 | $0 | $1,571 | $70 | $440 | $0 | $14,025 |
| bass | good | Y3 | $528 | $1,978 | $960 | $1,359 | $4,240 | $1,930 | $83 | $2,680 | $2,129 | $2,278 | $3,972 | $103 | $0 | $3,410 | $38 | $1,128 | $0 | $26,815 |
| rhythm | weak | Y1 | $527 | $36 | $12 | $0 | $250 | $629 | $43 | $5 | $8 | $0 | $21 | $176 | $8 | $0 | $143 | $13 | $0 | $1,870 |
| rhythm | weak | Y2 | $528 | $170 | $249 | $0 | $669 | $926 | $57 | $213 | $174 | $0 | $294 | $147 | $54 | $53 | $255 | $58 | $0 | $3,845 |
| rhythm | weak | Y3 | $528 | $506 | $745 | $37 | $966 | $1,007 | $55 | $218 | $546 | $17 | $689 | $174 | $34 | $479 | $278 | $63 | $0 | $6,341 |
| rhythm | avg | Y1 | $527 | $39 | $19 | $0 | $306 | $527 | $42 | $5 | $8 | $0 | $22 | $183 | $4 | $0 | $147 | $0 | $0 | $1,827 |
| rhythm | avg | Y2 | $528 | $212 | $339 | $0 | $816 | $991 | $65 | $190 | $356 | $1 | $627 | $184 | $43 | $132 | $191 | $147 | $0 | $4,820 |
| rhythm | avg | Y3 | $528 | $663 | $828 | $7 | $1,216 | $1,102 | $48 | $241 | $580 | $37 | $885 | $183 | $26 | $733 | $282 | $134 | $0 | $7,492 |
| rhythm | good | Y1 | $527 | $62 | $50 | $0 | $769 | $850 | $67 | $72 | $28 | $1 | $719 | $71 | $0 | $3 | $82 | $15 | $0 | $3,314 |
| rhythm | good | Y2 | $528 | $600 | $815 | $67 | $2,185 | $1,429 | $86 | $281 | $2,175 | $449 | $2,237 | $170 | $0 | $1,421 | $11 | $571 | $0 | $13,023 |
| rhythm | good | Y3 | $528 | $1,882 | $960 | $1,221 | $3,782 | $2,020 | $70 | $3,387 | $2,148 | $1,984 | $3,701 | $118 | $0 | $2,967 | $63 | $887 | $0 | $25,718 |
| lead | weak | Y1 | $527 | $36 | $12 | $0 | $223 | $610 | $42 | $7 | $0 | $0 | $18 | $161 | $9 | $0 | $272 | $8 | $0 | $1,925 |
| lead | weak | Y2 | $528 | $177 | $284 | $0 | $691 | $880 | $37 | $172 | $294 | $0 | $464 | $174 | $61 | $63 | $173 | $59 | $0 | $4,057 |
| lead | weak | Y3 | $528 | $566 | $852 | $75 | $924 | $1,102 | $64 | $239 | $445 | $11 | $779 | $178 | $35 | $544 | $278 | $104 | $0 | $6,722 |
| lead | avg | Y1 | $527 | $44 | $26 | $0 | $296 | $561 | $42 | $10 | $0 | $0 | $32 | $186 | $10 | $0 | $242 | $8 | $0 | $1,983 |
| lead | avg | Y2 | $528 | $244 | $415 | $19 | $884 | $942 | $46 | $144 | $535 | $10 | $793 | $213 | $35 | $168 | $165 | $93 | $0 | $5,230 |
| lead | avg | Y3 | $528 | $753 | $855 | $187 | $1,380 | $1,074 | $61 | $243 | $1,023 | $128 | $1,050 | $190 | $27 | $969 | $243 | $177 | $0 | $8,889 |
| lead | good | Y1 | $528 | $67 | $73 | $0 | $783 | $812 | $67 | $68 | $91 | $2 | $945 | $81 | $0 | $12 | $87 | $42 | $0 | $3,656 |
| lead | good | Y2 | $528 | $662 | $856 | $124 | $2,443 | $1,728 | $78 | $595 | $2,290 | $502 | $2,235 | $153 | $0 | $1,635 | $39 | $654 | $0 | $14,522 |
| lead | good | Y3 | $528 | $1,947 | $960 | $1,445 | $4,046 | $1,857 | $75 | $2,835 | $2,109 | $2,394 | $3,851 | $118 | $0 | $3,228 | $68 | $738 | $0 | $26,199 |

### T6. Year 1 by quarter (mean $ per career): money in, money out, gig pay, hustle, members' cut, gigs
| seat | bot | quarter | in | out | net | gig pay | hustle | merch | cut | gigs | broke wks |
|---|---|---|---|---|---|---|---|---|---|---|---|
| drums | weak | Q1 | $270 | $424 | -$154 | $25 | $226 | $2 | $10 | 3.3 | 1.0 |
| drums | weak | Q2 | $472 | $403 | $69 | $171 | $206 | $1 | $54 | 3.4 | 1.4 |
| drums | weak | Q3 | $419 | $430 | -$11 | $160 | $213 | $0 | $53 | 3.0 | 0.8 |
| drums | weak | Q4 | $472 | $408 | $64 | $192 | $214 | $0 | $67 | 2.4 | 0.8 |
| drums | avg | Q1 | $274 | $382 | -$109 | $27 | $220 | $3 | $13 | 3.3 | 0.6 |
| drums | avg | Q2 | $529 | $379 | $150 | $212 | $221 | $1 | $71 | 3.7 | 0.6 |
| drums | avg | Q3 | $476 | $448 | $29 | $290 | $163 | $0 | $92 | 3.5 | 0.1 |
| drums | avg | Q4 | $606 | $556 | $50 | $334 | $184 | $9 | $114 | 3.3 | 0.1 |
| drums | good | Q1 | $304 | $360 | -$57 | $63 | $196 | $0 | $28 | 6.0 | 0.2 |
| drums | good | Q2 | $709 | $478 | $231 | $513 | $119 | $0 | $172 | 6.0 | 0.1 |
| drums | good | Q3 | $1,227 | $1,062 | $165 | $901 | $31 | $201 | $293 | 6.0 | 0.0 |
| drums | good | Q4 | $2,001 | $1,799 | $202 | $1,051 | $25 | $620 | $356 | 5.2 | 0.0 |
| bass | weak | Q1 | $275 | $391 | -$116 | $19 | $239 | $2 | $8 | 3.4 | 0.9 |
| bass | weak | Q2 | $432 | $372 | $60 | $147 | $195 | $0 | $51 | 3.0 | 0.7 |
| bass | weak | Q3 | $402 | $450 | -$47 | $208 | $161 | $0 | $67 | 3.2 | 0.6 |
| bass | weak | Q4 | $507 | $518 | -$10 | $238 | $225 | $0 | $74 | 2.9 | 0.5 |
| bass | avg | Q1 | $259 | $370 | -$111 | $10 | $207 | $3 | $10 | 3.5 | 0.6 |
| bass | avg | Q2 | $469 | $393 | $75 | $218 | $199 | $1 | $66 | 3.4 | 0.6 |
| bass | avg | Q3 | $485 | $470 | $15 | $282 | $159 | $1 | $87 | 3.5 | 0.5 |
| bass | avg | Q4 | $626 | $559 | $67 | $316 | $205 | $6 | $115 | 3.1 | 0.3 |
| bass | good | Q1 | $268 | $356 | -$89 | $45 | $212 | $0 | $16 | 6.0 | 0.3 |
| bass | good | Q2 | $654 | $493 | $162 | $432 | $155 | $0 | $141 | 6.0 | 0.3 |
| bass | good | Q3 | $1,051 | $971 | $80 | $763 | $64 | $138 | $252 | 6.0 | 0.2 |
| bass | good | Q4 | $1,920 | $1,662 | $258 | $1,163 | $27 | $529 | $381 | 5.4 | 0.0 |
| rhythm | weak | Q1 | $255 | $392 | -$137 | $16 | $211 | $3 | $12 | 3.2 | 0.8 |
| rhythm | weak | Q2 | $478 | $420 | $58 | $178 | $191 | $1 | $60 | 3.3 | 1.2 |
| rhythm | weak | Q3 | $424 | $463 | -$39 | $163 | $196 | $4 | $60 | 3.1 | 0.9 |
| rhythm | weak | Q4 | $632 | $595 | $37 | $361 | $216 | $7 | $118 | 3.4 | 0.9 |
| rhythm | avg | Q1 | $262 | $372 | -$110 | $23 | $205 | $4 | $14 | 3.3 | 0.5 |
| rhythm | avg | Q2 | $463 | $376 | $87 | $170 | $197 | $1 | $62 | 3.4 | 0.7 |
| rhythm | avg | Q3 | $494 | $498 | -$4 | $275 | $170 | $0 | $92 | 3.6 | 0.5 |
| rhythm | avg | Q4 | $702 | $581 | $120 | $407 | $212 | $15 | $138 | 3.5 | 0.5 |
| rhythm | good | Q1 | $266 | $350 | -$84 | $45 | $202 | $0 | $16 | 6.0 | 0.2 |
| rhythm | good | Q2 | $711 | $484 | $227 | $466 | $151 | $0 | $163 | 6.0 | 0.2 |
| rhythm | good | Q3 | $1,008 | $895 | $113 | $786 | $65 | $117 | $248 | 6.0 | 0.2 |
| rhythm | good | Q4 | $1,750 | $1,586 | $164 | $1,018 | $39 | $467 | $342 | 5.5 | 0.1 |
| lead | weak | Q1 | $263 | $425 | -$162 | $18 | $219 | $3 | $10 | 3.3 | 0.8 |
| lead | weak | Q2 | $484 | $469 | $15 | $144 | $226 | $1 | $52 | 3.4 | 1.1 |
| lead | weak | Q3 | $438 | $490 | -$52 | $195 | $190 | $6 | $63 | 3.2 | 0.9 |
| lead | weak | Q4 | $610 | $541 | $68 | $293 | $250 | $3 | $98 | 2.8 | 0.8 |
| lead | avg | Q1 | $268 | $421 | -$153 | $20 | $213 | $3 | $10 | 3.6 | 0.8 |
| lead | avg | Q2 | $551 | $474 | $77 | $232 | $201 | $2 | $79 | 3.8 | 0.9 |
| lead | avg | Q3 | $546 | $507 | $39 | $313 | $199 | $8 | $99 | 3.4 | 0.5 |
| lead | avg | Q4 | $694 | $581 | $113 | $357 | $213 | $20 | $108 | 3.2 | 0.4 |
| lead | good | Q1 | $282 | $379 | -$97 | $54 | $212 | $0 | $18 | 6.0 | 0.4 |
| lead | good | Q2 | $749 | $502 | $247 | $523 | $153 | $0 | $171 | 6.0 | 0.2 |
| lead | good | Q3 | $1,148 | $1,038 | $109 | $862 | $49 | $193 | $273 | 6.0 | 0.1 |
| lead | good | Q4 | $2,072 | $1,737 | $335 | $947 | $49 | $536 | $321 | 4.9 | 0.0 |

### T7. Pace and the first gear upgrade (median week; share of careers that got there within 3 years)
Gear prices (every seat): pedal-slot item $300, lane-5 item $450, lane-6 item $350 (needs lane 5), kit/rig tier 1 $800. Affordable = the fund at a week's end covers the price AND leaves the $100 broke line ($300 -> fund >= $400). The full drum chart (6 lanes + pedal) = $1,100; the full bass chart (5 lanes max + runs) = $750.
| seat | bot | 250 fans (Local Heroes) | first label offer | signed | $300 item affordable | $450 item affordable | $800 kit affordable | $1,100 (full drum gear) affordable | first gear/kit bought (what) | jam space rented |
|---|---|---|---|---|---|---|---|---|---|---|
| drums | weak | wk 25 (100%) | wk 45 (100%) | wk 50 (95%) | wk 21 (100%) | wk 30 (100%) | wk 40 (95%) | wk 47 (85%) | wk 49 (75%) gear:pedal | never |
| drums | avg | wk 21 (100%) | wk 41 (100%) | wk 48 (95%) | wk 14 (100%) | wk 24 (100%) | wk 35 (100%) | wk 39 (98%) | wk 45 (98%) gear:pedal | wk 56 (5%) |
| drums | good | wk 16 (100%) | wk 26 (100%) | wk 27 (100%) | wk 12 (100%) | wk 17 (100%) | wk 22 (100%) | wk 27 (100%) | wk 30 (100%) gear:pedal | wk 62 (98%) |
| bass | weak | wk 22 (100%) | wk 41 (100%) | wk 46 (100%) | wk 21 (100%) | wk 35 (100%) | wk 40 (93%) | wk 45 (88%) | wk 48 (83%) gear:pedal | wk 69 (3%) |
| bass | avg | wk 21 (100%) | wk 37 (100%) | wk 39 (98%) | wk 16 (100%) | wk 31 (100%) | wk 36 (98%) | wk 40 (90%) | wk 43 (90%) gear:pedal | wk 51 (8%) |
| bass | good | wk 16 (100%) | wk 27 (100%) | wk 28 (100%) | wk 15 (100%) | wk 18 (100%) | wk 26 (100%) | wk 29 (100%) | wk 31 (100%) gear:pedal | wk 63 (88%) |
| rhythm | weak | wk 23 (100%) | wk 44 (98%) | wk 50 (93%) | wk 21 (100%) | wk 30 (100%) | wk 42 (98%) | wk 46 (80%) | wk 54 (70%) gear:pedal | wk 63 (3%) |
| rhythm | avg | wk 21 (100%) | wk 41 (100%) | wk 47 (95%) | wk 16 (100%) | wk 24 (100%) | wk 36 (93%) | wk 39 (90%) | wk 42 (83%) gear:pedal | wk 71 (3%) |
| rhythm | good | wk 16 (100%) | wk 28 (100%) | wk 29 (100%) | wk 14 (100%) | wk 18 (100%) | wk 26 (100%) | wk 30 (100%) | wk 31 (100%) gear:pedal | wk 63 (83%) |
| lead | weak | wk 24 (100%) | wk 43 (98%) | wk 46 (95%) | wk 23 (100%) | wk 33 (100%) | wk 38 (100%) | wk 44 (93%) | wk 48 (80%) gear:pedal | wk 53 (3%) |
| lead | avg | wk 20 (100%) | wk 37 (100%) | wk 39 (93%) | wk 16 (100%) | wk 25 (100%) | wk 33 (100%) | wk 40 (98%) | wk 42 (98%) gear:pedal | wk 65 (15%) |
| lead | good | wk 16 (100%) | wk 25 (100%) | wk 26 (100%) | wk 13 (100%) | wk 17 (100%) | wk 22 (100%) | wk 26 (100%) | wk 29 (100%) gear:pedal | wk 62 (88%) |

### T8. Seats vs the drum seat (paired seeds): median fund and broke weeks as a share of drums'
| bot | seat | fund Y1 | fund Y2 | fund Y3 (target +/-10%) | broke wks Y1 | broke wks Y2 | gig pay Y1 | gigs Y1 | cards net Y1 |
|---|---|---|---|---|---|---|---|---|---|
| weak | bass | 276 (77%) | 867 (114%) | 1386 (130%) | 2.6 vs 4.0 | 0.8 vs 0.6 | $611 (112%) | 12.5 vs 12.1 | -$61 vs $0 |
| weak | rhythm | 285 (79%) | 624 (82%) | 938 (88%) | 3.7 vs 4.0 | 0.8 vs 0.6 | $718 (131%) | 12.9 vs 12.1 | -$14 vs $0 |
| weak | lead | 281 (78%) | 733 (96%) | 979 (92%) | 3.6 vs 4.0 | 0.8 vs 0.6 | $650 (119%) | 12.8 vs 12.1 | -$116 vs $0 |
| avg | bass | 387 (95%) | 886 (86%) | 1858 (86%) | 1.9 vs 1.4 | 0.5 vs 0.4 | $827 (96%) | 13.4 vs 13.8 | -$19 vs -$24 |
| avg | rhythm | 345 (84%) | 976 (95%) | 2064 (96%) | 2.2 vs 1.4 | 0.7 vs 0.4 | $874 (101%) | 13.7 vs 13.8 | -$46 vs -$24 |
| avg | lead | 457 (112%) | 1212 (118%) | 2346 (109%) | 2.6 vs 1.4 | 0.4 vs 0.4 | $923 (107%) | 14.0 vs 13.8 | -$27 vs -$24 |
| good | bass | 723 (107%) | 2326 (107%) | 4102 (118%) | 0.8 vs 0.4 | 0.0 vs 0.0 | $2,403 (95%) | 23.3 vs 23.2 | -$39 vs -$0 |
| good | rhythm | 687 (101%) | 2500 (115%) | 4125 (119%) | 0.7 vs 0.4 | 0.1 vs 0.0 | $2,315 (92%) | 23.4 vs 23.2 | -$32 vs -$0 |
| good | lead | 887 (131%) | 2206 (102%) | 3704 (107%) | 0.6 vs 0.4 | 0.0 vs 0.0 | $2,385 (94%) | 22.9 vs 23.2 | $218 vs -$0 |

### T9. Year 1: the worst single week (fund change) and what the weeks that ended in a parents' loan spent on
cause = the largest cost bucket of that week. Loan weeks pooled over careers (n).
| seat | bot | worst week Y1 (median) | worst week Y1 (p10) | worst-week top causes | loan weeks Y1-3 (n) | loan-week top causes | loan $ (mean) | fund before the loan week (median) |
|---|---|---|---|---|---|---|---|---|
| drums | weak | -$167 | -$223 | gas 73%, cards/laptop 25%, merch stock 3% | 37 | gas 81%, promote 8%, upkeep base 5% | $145 | $116 |
| drums | avg | -$170 | -$232 | gas 63%, cards/laptop 25%, merch stock 8% | 19 | gas 89%, cards/laptop 5%, upkeep base 5% | $147 | $112 |
| drums | good | -$297 | -$448 | merch stock 65%, gas 28%, gear+kit 5% | 2 | gas 100% | $196 | $250 |
| bass | weak | -$172 | -$247 | gas 65%, cards/laptop 25%, promote 5% | 35 | gas 69%, cards/laptop 14%, promote 9% | $145 | $104 |
| bass | avg | -$174 | -$274 | gas 80%, cards/laptop 10%, merch stock 5% | 32 | gas 78%, upkeep base 9%, promote 6% | $153 | $114 |
| bass | good | -$320 | -$484 | gas 48%, merch stock 45%, van 3% | 10 | gas 100% | $182 | $148 |
| rhythm | weak | -$174 | -$248 | gas 83%, cards/laptop 5%, band admin 3% | 43 | gas 88%, promote 7%, cards/laptop 5% | $150 | $124 |
| rhythm | avg | -$168 | -$253 | gas 73%, cards/laptop 15%, promote 5% | 33 | gas 76%, upkeep base 9%, van 6% | $155 | $116 |
| rhythm | good | -$243 | -$450 | merch stock 55%, gas 43%, cards/laptop 3% | 5 | gas 100% | $316 | $370 |
| lead | weak | -$181 | -$275 | gas 60%, cards/laptop 35%, merch stock 5% | 56 | gas 75%, cards/laptop 14%, van 5% | $155 | $116 |
| lead | avg | -$170 | -$230 | gas 70%, cards/laptop 25%, merch stock 3% | 30 | gas 60%, cards/laptop 27%, promote 7% | $182 | $123 |
| lead | good | -$252 | -$455 | merch stock 50%, gas 38%, gear+kit 10% | 3 | gas 100% | $136 | $212 |

### T10. What one block earns (mean per career-year): a Hustle block vs a gig (one Book block + the show)
gig net = gig pay - members' cut - gas - road cards - fill-ins - commission - crew - tows; + merch = adding merch sales minus stock bought.
| seat | bot | year | hustle blocks | $ per hustle block | gigs | gig gross $/gig | gig net $/gig | gig net + merch net $/gig | book blocks |
|---|---|---|---|---|---|---|---|---|---|
| drums | weak | Y1 | 12.4 | $69 | 12.1 | $45 | -$18 | -$18 | 8.8 |
| drums | weak | Y2 | 8.8 | $96 | 12.1 | $166 | $32 | $34 | 8.8 |
| drums | weak | Y3 | 7.6 | $138 | 11.7 | $279 | $37 | $93 | 9.1 |
| drums | avg | Y1 | 10.8 | $73 | 13.8 | $62 | $3 | $2 | 9.3 |
| drums | avg | Y2 | 9.1 | $112 | 12.5 | $209 | $48 | $59 | 7.5 |
| drums | avg | Y3 | 6.9 | $141 | 12.0 | $296 | $44 | $131 | 7.2 |
| drums | good | Y1 | 4.8 | $78 | 23.2 | $109 | $36 | $30 | 13.7 |
| drums | good | Y2 | 1.0 | $137 | 20.3 | $346 | $80 | $203 | 10.6 |
| drums | good | Y3 | 1.2 | $154 | 20.7 | $641 | $176 | $426 | 10.9 |
| bass | weak | Y1 | 11.5 | $71 | 12.5 | $49 | -$14 | -$13 | 9.4 |
| bass | weak | Y2 | 10.3 | $101 | 12.6 | $184 | $33 | $33 | 9.4 |
| bass | weak | Y3 | 8.0 | $145 | 11.9 | $286 | $16 | $77 | 8.3 |
| bass | avg | Y1 | 10.7 | $72 | 13.4 | $62 | -$2 | -$3 | 9.3 |
| bass | avg | Y2 | 9.2 | $110 | 13.2 | $204 | $28 | $39 | 8.9 |
| bass | avg | Y3 | 8.8 | $146 | 12.2 | $334 | $25 | $107 | 7.6 |
| bass | good | Y1 | 6.0 | $76 | 23.3 | $103 | $26 | $21 | 14.0 |
| bass | good | Y2 | 0.9 | $164 | 20.5 | $359 | $79 | $204 | 11.3 |
| bass | good | Y3 | 1.2 | $166 | 20.7 | $653 | $183 | $432 | 11.1 |
| rhythm | weak | Y1 | 11.4 | $72 | 12.9 | $56 | -$16 | -$17 | 9.4 |
| rhythm | weak | Y2 | 10.2 | $98 | 12.4 | $168 | $16 | $18 | 9.3 |
| rhythm | weak | Y3 | 8.4 | $136 | 11.3 | $260 | $24 | $66 | 8.4 |
| rhythm | avg | Y1 | 10.7 | $73 | 13.7 | $64 | -$0 | -$1 | 8.7 |
| rhythm | avg | Y2 | 9.2 | $99 | 14.0 | $187 | $33 | $48 | 8.6 |
| rhythm | avg | Y3 | 7.8 | $141 | 12.0 | $304 | $30 | $111 | 6.9 |
| rhythm | good | Y1 | 6.0 | $77 | 23.4 | $99 | $25 | $19 | 14.4 |
| rhythm | good | Y2 | 1.0 | $154 | 20.2 | $339 | $82 | $207 | 10.9 |
| rhythm | good | Y3 | 1.4 | $163 | 20.5 | $583 | $146 | $370 | 10.6 |
| lead | weak | Y1 | 12.5 | $71 | 12.8 | $51 | -$18 | -$19 | 8.9 |
| lead | weak | Y2 | 9.7 | $102 | 11.9 | $176 | $23 | $23 | 8.8 |
| lead | weak | Y3 | 7.7 | $149 | 11.1 | $246 | -$7 | $65 | 8.5 |
| lead | avg | Y1 | 11.2 | $74 | 14.0 | $66 | $1 | $1 | 9.7 |
| lead | avg | Y2 | 7.8 | $111 | 13.0 | $211 | $44 | $61 | 8.5 |
| lead | avg | Y3 | 6.8 | $145 | 12.5 | $349 | $56 | $154 | 7.1 |
| lead | good | Y1 | 5.8 | $80 | 22.9 | $104 | $29 | $20 | 13.5 |
| lead | good | Y2 | 0.8 | $160 | 20.9 | $366 | $78 | $213 | 11.6 |
| lead | good | Y3 | 1.2 | $168 | 20.7 | $622 | $174 | $416 | 10.8 |

### T11. Simulate this gig (v1.3.1) vs the same gig played, at the same accuracy (same career, week, venue, listing; 64 gig setups x 5 accuracies)
Played = the real live session tapped by a bot at that hit chance (30 ms spread, Normal); Simulate = GG.gig.simBot from a playLog of 3 gigs at the played accuracy, then simShow; auto = gig.simulate (what bot careers use). Mid-year-1 garage band (140 fans, T1 rooms) and a year-2 band (700 fans, T2 rooms). Pay and net are means over 4 seeds x the venues picked.
| seat | tier | deal | aimed acc | played acc | played grade | played pay | played net to fund | Simulate acc | Simulate grade | Simulate pay | Simulate net | new fans played / sim | auto-path pay / net |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| drums | T1 | door | 0.55 | 0.565 | 4C | $104 | -$32 | 0.567 | 4C | $104 | -$32 | 7.8 / 7.8 | $98 / -$37 |
| drums | T1 | door | 0.85 | 0.852 | 4A | $104 | -$32 | 0.852 | 4A | $104 | -$32 | 20.0 / 20.0 | $98 / -$37 |
| drums | T1 | door | 1 | 1.000 | 4S | $104 | -$32 | 1.000 | 4S | $104 | -$32 | 27.5 / 27.5 | $98 / -$37 |
| drums | T1 | flat | 0.55 | 0.563 | 4C | $118 | $46 | 0.565 | 4C | $118 | $46 | 7.8 / 7.8 | $118 / $46 |
| drums | T1 | flat | 0.85 | 0.850 | 4A | $118 | $46 | 0.851 | 4A | $118 | $46 | 20.3 / 20.0 | $118 / $46 |
| drums | T1 | flat | 1 | 1.000 | 4S | $118 | $46 | 1.000 | 4S | $118 | $46 | 27.8 / 27.8 | $118 / $46 |
| drums | T2 | door | 0.55 | 0.560 | 4C | $326 | $138 | 0.558 | 4C | $326 | $138 | 19.3 / 19.3 | $326 / $138 |
| drums | T2 | door | 0.85 | 0.851 | 4A | $326 | $138 | 0.852 | 4A | $326 | $138 | 51.5 / 51.5 | $326 / $138 |
| drums | T2 | door | 1 | 1.000 | 4S | $326 | $138 | 1.000 | 4S | $326 | $138 | 71.0 / 71.0 | $326 / $138 |
| drums | T2 | flat | 0.55 | 0.560 | 4C | $189 | $43 | 0.558 | 4C | $189 | $43 | 19.3 / 19.3 | $189 / $43 |
| drums | T2 | flat | 0.85 | 0.851 | 4A | $189 | $43 | 0.852 | 4A | $189 | $43 | 51.5 / 51.5 | $189 / $43 |
| drums | T2 | flat | 1 | 1.000 | 4S | $189 | $43 | 1.000 | 4S | $189 | $43 | 71.0 / 71.0 | $189 / $43 |
| bass | T1 | door | 0.55 | 0.552 | 4C | $104 | -$32 | 0.552 | 4C | $104 | -$32 | 7.8 / 7.8 | $98 / -$37 |
| bass | T1 | door | 0.85 | 0.858 | 4A | $104 | -$32 | 0.858 | 4A | $104 | -$32 | 19.8 / 19.8 | $98 / -$37 |
| bass | T1 | door | 1 | 1.000 | 4S | $104 | -$32 | 1.000 | 4S | $104 | -$32 | 27.3 / 27.3 | $98 / -$37 |
| bass | T1 | flat | 0.55 | 0.547 | 4C | $118 | $46 | 0.540 | 4C | $118 | $46 | 7.8 / 7.8 | $118 / $46 |
| bass | T1 | flat | 0.85 | 0.861 | 4A | $118 | $46 | 0.862 | 4A | $118 | $46 | 20.0 / 20.0 | $118 / $46 |
| bass | T1 | flat | 1 | 1.000 | 4S | $118 | $46 | 1.000 | 4S | $118 | $46 | 27.5 / 27.5 | $118 / $46 |
| bass | T2 | door | 0.55 | 0.565 | 4C | $326 | $138 | 0.567 | 4C | $326 | $138 | 19.8 / 19.8 | $326 / $138 |
| bass | T2 | door | 0.85 | 0.863 | 1A 3S | $326 | $138 | 0.867 | 1A 3S | $326 | $138 | 68.0 / 68.0 | $326 / $138 |
| bass | T2 | door | 1 | 1.000 | 4S | $326 | $138 | 1.000 | 4S | $326 | $138 | 71.5 / 71.5 | $326 / $138 |
| bass | T2 | flat | 0.55 | 0.565 | 4C | $189 | $43 | 0.567 | 4C | $189 | $43 | 19.8 / 19.8 | $189 / $43 |
| bass | T2 | flat | 0.85 | 0.863 | 1A 3S | $189 | $43 | 0.867 | 1A 3S | $189 | $43 | 68.0 / 68.0 | $189 / $43 |
| bass | T2 | flat | 1 | 1.000 | 4S | $189 | $43 | 1.000 | 4S | $189 | $43 | 71.5 / 71.5 | $189 / $43 |
| rhythm | T1 | door | 0.55 | 0.560 | 4C | $104 | -$32 | 0.560 | 4C | $104 | -$32 | 7.8 / 7.8 | $98 / -$37 |
| rhythm | T1 | door | 0.85 | 0.846 | 4A | $104 | -$32 | 0.844 | 4A | $104 | -$32 | 19.8 / 19.8 | $98 / -$37 |
| rhythm | T1 | door | 1 | 1.000 | 4S | $104 | -$32 | 1.000 | 4S | $104 | -$32 | 27.3 / 27.3 | $98 / -$37 |
| rhythm | T1 | flat | 0.55 | 0.552 | 4C | $118 | $46 | 0.551 | 4C | $118 | $46 | 8.0 / 8.0 | $118 / $46 |
| rhythm | T1 | flat | 0.85 | 0.849 | 4A | $118 | $46 | 0.848 | 4A | $118 | $46 | 20.0 / 20.0 | $118 / $46 |
| rhythm | T1 | flat | 1 | 1.000 | 4S | $118 | $46 | 1.000 | 4S | $118 | $46 | 27.5 / 27.5 | $118 / $46 |
| rhythm | T2 | door | 0.55 | 0.557 | 4C | $326 | $138 | 0.558 | 4C | $326 | $138 | 19.8 / 19.8 | $326 / $138 |
| rhythm | T2 | door | 0.85 | 0.857 | 2A 2S | $326 | $138 | 0.859 | 2A 2S | $326 | $138 | 63.8 / 63.8 | $326 / $138 |
| rhythm | T2 | door | 1 | 1.000 | 4S | $326 | $138 | 1.000 | 4S | $326 | $138 | 71.3 / 71.3 | $326 / $138 |
| rhythm | T2 | flat | 0.55 | 0.557 | 4C | $189 | $43 | 0.558 | 4C | $189 | $43 | 19.8 / 19.8 | $189 / $43 |
| rhythm | T2 | flat | 0.85 | 0.857 | 2A 2S | $189 | $43 | 0.859 | 2A 2S | $189 | $43 | 63.8 / 63.8 | $189 / $43 |
| rhythm | T2 | flat | 1 | 1.000 | 4S | $189 | $43 | 1.000 | 4S | $189 | $43 | 71.3 / 71.3 | $189 / $43 |
| lead | T1 | door | 0.55 | 0.564 | 4C | $104 | -$32 | 0.560 | 4C | $104 | -$32 | 7.8 / 7.8 | $98 / -$37 |
| lead | T1 | door | 0.85 | 0.858 | 4A | $104 | -$32 | 0.856 | 4A | $104 | -$32 | 20.0 / 20.0 | $98 / -$37 |
| lead | T1 | door | 1 | 1.000 | 4S | $104 | -$32 | 1.000 | 4S | $104 | -$32 | 27.5 / 27.5 | $98 / -$37 |
| lead | T1 | flat | 0.55 | 0.561 | 4C | $118 | $46 | 0.556 | 4C | $118 | $46 | 7.8 / 7.8 | $118 / $46 |
| lead | T1 | flat | 0.85 | 0.862 | 4A | $118 | $46 | 0.861 | 4A | $118 | $46 | 19.8 / 19.8 | $118 / $46 |
| lead | T1 | flat | 1 | 1.000 | 4S | $118 | $46 | 1.000 | 4S | $118 | $46 | 27.5 / 27.5 | $118 / $46 |
| lead | T2 | door | 0.55 | 0.561 | 4C | $326 | $138 | 0.560 | 4C | $326 | $138 | 19.8 / 19.8 | $326 / $138 |
| lead | T2 | door | 0.85 | 0.861 | 2A 2S | $326 | $138 | 0.863 | 1A 3S | $326 | $138 | 64.3 / 68.0 | $326 / $138 |
| lead | T2 | door | 1 | 1.000 | 4S | $326 | $138 | 1.000 | 4S | $326 | $138 | 71.5 / 71.5 | $326 / $138 |
| lead | T2 | flat | 0.55 | 0.561 | 4C | $189 | $43 | 0.560 | 4C | $189 | $43 | 19.8 / 19.8 | $189 / $43 |
| lead | T2 | flat | 0.85 | 0.861 | 2A 2S | $189 | $43 | 0.863 | 1A 3S | $189 | $43 | 64.3 / 68.0 | $189 / $43 |
| lead | T2 | flat | 1 | 1.000 | 4S | $189 | $43 | 1.000 | 4S | $189 | $43 | 71.5 / 71.5 | $189 / $43 |

- Played vs Simulate: identical pay AND identical net to the fund in 320/320 rows; same grade in 318/320; max accuracy gap 0.022.
- Pay vs accuracy: within one gig setup the pay is the same at 55% and at 100% hit in 64/64 setups (door crowd = gig.expectCrowd, seeded by career/week/venue; flat = the listing). Accuracy moves the grade C -> S, new fans (x3.5) and venue rep (+2 at S = +12% on that venue's next listing via repPay 0.06), never the night's pay.

### T12. What playing one grade worse / better is worth (drums, avg bot, 40 seeds; gig performance shifted in-process, pay rules untouched)
| performance | fund Y1 (median) | broke wks Y1 | loan Y1 | gig pay Y1 | merch Y1 | fund Y2 | loan Y2 | fund Y3 | loan Y3 |
|---|---|---|---|---|---|---|---|---|---|
| -12 (about one grade lower) | $244 | 3.1 | 48% | $655 | $4 | $632 | 28% | $1,061 | 18% |
| baseline | $410 | 1.4 | 25% | $863 | $13 | $1,031 | 5% | $2,160 | 0% |
| +12 (about one grade higher) | $553 | 1.9 | 25% | $1,193 | $62 | $1,668 | 3% | $3,568 | 3% |

### X1. Drums vs bass in every band (weak + avg bot; Hail Damage 40 seeds, the others 30 seeds; fund = median, money = mean per career)
| band | bot | seat | fund Y1 med | fund Y2 med | fund Y3 med | broke wks Y1 | loan Y1 | loan Y2 | gig pay Y1 | gas Y1 | hustle Y1 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| hail_damage | weak | drums | 358 | 764 | 1067 | 4.0 | 40% | 15% | $548 | $532 | $859 |
| hail_damage | weak | bass | 276 | 867 | 1386 | 2.6 | 48% | 10% | $611 | $536 | $820 |
| hail_damage | avg | drums | 410 | 1031 | 2160 | 1.4 | 25% | 5% | $863 | $474 | $789 |
| hail_damage | avg | bass | 387 | 886 | 1858 | 1.9 | 30% | 18% | $827 | $537 | $771 |
| frost_heave | weak | drums | 236 | 717 | 1127 | 4.8 | 67% | 23% | $707 | $734 | $821 |
| frost_heave | weak | bass | 214 | 752 | 1403 | 4.5 | 63% | 27% | $655 | $787 | $837 |
| frost_heave | avg | drums | 424 | 870 | 2132 | 3.2 | 47% | 17% | $911 | $737 | $835 |
| frost_heave | avg | bass | 279 | 1060 | 1800 | 2.7 | 53% | 13% | $809 | $728 | $838 |
| gravel_kings | weak | drums | 536 | 1007 | 2063 | 0.8 | 17% | 17% | $663 | $330 | $713 |
| gravel_kings | weak | bass | 520 | 848 | 1840 | 0.9 | 13% | 20% | $594 | $329 | $725 |
| gravel_kings | avg | drums | 704 | 1279 | 3227 | 0.9 | 0% | 13% | $938 | $374 | $730 |
| gravel_kings | avg | bass | 593 | 1169 | 1957 | 0.8 | 10% | 27% | $856 | $452 | $722 |
| grid_road_ramblers | weak | drums | 237 | 620 | 810 | 3.9 | 63% | 23% | $859 | $904 | $854 |
| grid_road_ramblers | weak | bass | 322 | 623 | 843 | 2.1 | 60% | 17% | $862 | $782 | $802 |
| grid_road_ramblers | avg | drums | 421 | 714 | 1179 | 3.0 | 40% | 20% | $981 | $785 | $837 |
| grid_road_ramblers | avg | bass | 320 | 863 | 1086 | 2.6 | 47% | 20% | $1,069 | $849 | $775 |

### D1. Chart density per seat (6 seeds x 3 jammed songs, Legion Hall; fixed hands = tap chance 0.9, 40 ms)
| seat | Normal notes/song | Normal notes/s | Hard notes/song | Hard notes/s | fixed-hands accuracy (Normal) | fixed-hands grades (Normal) |
|---|---|---|---|---|---|---|
| drums | 376 | 5.65 | 414 | 6.23 | 0.901 | 1S 5A |
| bass | 192 | 2.88 | 194 | 2.91 | 0.903 | 4S 2A |
| rhythm | 143 | 2.38 | 143 | 2.39 | 0.906 | 3S 3A |
| lead | 210 | 3.15 | 216 | 3.25 | 0.903 | 4S 2A |

Venue pay reference (content/venues.js, bookable rooms): tier 1: 38 rooms, 21 offer exposure, flat $45-140, door $1-2/head, cap 15-130; tier 2: 48 rooms, flat $100-1,000, door $1.5-4.5/head, cap 100-400, minFans 80-2,500; tier 3: 15 rooms, flat $550-4,200, door $0.7-2.3/head, cap 500-2,000. Gas = km x 2 x $0.25 (min $5). Hustle = $50-100 per block x repeat factor (1 / 0.6 / 0.35) x era (garage 1, local 1.3, signed 2.2). Upkeep = $22/week + $0.012/fan + era ($0 / $6 / $40 / $50) + rent.
