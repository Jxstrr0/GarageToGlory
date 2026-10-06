# v1.4 Tuning: money proposal (3 options, re-measured)

Branch `v1.4-tuning` (fdecb74 = main 1.3.1.0 + status notes). Nothing in `/home/user/GarageToGlory` was edited or committed.
Each option was applied in its own scratch worktree (`scratchpad/v14-optA|B|C`, uncommitted, removed afterwards; the exact
diffs are kept in `scratchpad/v14/opt/optA.diff`, `optB.diff`, `optC.diff`) and re-probed with the baseline's driver
(`v14/bp/drive.js`, same seeds: seed x 7919, seeds 1-40, Hail Damage, Normal) plus the cross-band, Simulate and 10-year probes.
Every table cell reads **base / A / B / C**.

## 1. Recommendation (short)

**Option B ("Early gigs pay their way")**, with one tweak: grade pay D x1.0 instead of x0.9 (measured: same results, see §6).

- Year 1 stops being a coin flip: parents' loan in year 1 drops from 35% to 5% of avg-bot careers (weak 49% -> 5%,
  human-drummer proxy 48% -> 5%), broke weeks from 2.0 to 0.8. Q1 still loses money (-$109 avg): the band starts scrappy.
- Gig pay becomes the thing that pays: year-1 net per gig $3 -> $23 (a paid tier-1 gig nets $72, about one Hustle block),
  what gigs leave in the fund goes from 1% to 23% of year-1 money; a great early show pays up to 25% more than a so-so one.
- Years 4-10 are unchanged within seed noise (10-year probe: avg-bot fund at year 10 $8,934 -> $7,380, good $17,637 ->
  $19,293; World era week 147 / 100 both; money in per year at Y6 +3% avg, +1% good). Year 3 carries the early savings:
  avg-bot fund +$880 (+42%), money in +13%; broke weeks and loans at Y3 were already ~0 and stay there.
- A is too gentle (year-1 loans still 25% avg / 26% weak / 30% human-drummer proxy). C removes the squeeze altogether
  (year-1 loans 1%, broke weeks 0.1, weak-bot Y3 fund +115%): that is "comfortable", not "scrappy".

## 2. What the probes said, and two things learned while designing

- (From the map/baseline) Year-1 gigs net ~$0 (cut + gas eat the gross; 53-60% of year-1 gigs are unpaid exposure that
  still costs gas); Hustle beats gigs; pay ignores the performance; the members' 30% cut is invisible on the result screen.
- **A plain grade bonus would be a late-game raise, not an early one.** Grades inflate over a career: avg bot year 1 is
  0% S / 6% A / 47% B / 45% C, year 6 is 59% S / 38% A; good bot year 6 is 96% S. A pay curve S x1.2 / A x1.1 changes
  year-1 gig pay by +0.7% (avg) but year-6 gig pay by +16% (avg) and +20% (good). So every option gates grade pay to the
  **garage and local eras** (until you sign): the bonus lands when the money is tight and stops once a manager negotiates
  the deals. Ungated, a curve like B's would add about +8% to year-3 and +16-20% to year-6 gig pay.
- **Card-booked gigs** (`22_sim_gig.js:73` `makeGig`, fixed venue `pay`, median $120) are not scaled by the small-room
  multiplier in these runs; the build should apply it there too (1 line), which makes the measured numbers slightly
  conservative.

## 3. Drums vs bass ("Drums felt worse tbh")

- **No money rule reads the seat** (gear prices, pay, cut, gas, upkeep are identical; bots at equal accuracy show no gap).
- **The gap is the chart, through the grade.** Drum charts judge 1.8-2.0x the notes of bass on every difficulty (measured
  here, 4 seeds x 3 songs: Easy 2.93 vs 1.65 notes/s, Normal 5.67 vs 2.89, Hard 6.34 vs 2.94). Same hands -> lower hit
  share -> about one grade lower -> fewer fans -> smaller crowds and fewer paid rooms. The baseline proxy "avg bot one
  grade lower" (gig score -12, labelled **h12** below) borrows from the parents in 48% of year-1 careers vs 30% for the
  bass avg bot, and has 43% less fund at year 3.
- **Gear:** drums need 3 items for the full chart ($450 toms + $350 ride + $300 pedal = **$1,100**), bass 2 (**$750**: the
  $350 lane-6 "fridge" cab adds no lane on bass). Owner E14 locked one price list (the drum prices) for every seat, so the
  options cut the items drums need most and bass doesn't (lane 6, pedal) on the shared list.
- **What the options do for drums first:** the human-drummer proxy gains the most from the early money (its year-1 loans
  48% -> 30 / 5 / 0%, fund at year 1 $244 -> $278 / $552 / $699), and the full drum rig gets cheaper ($1,100 -> $1,000 /
  $900 / $800; bass $750 -> $750 / $700 / $600). The relative gap after year 1 remains (h12 vs bass avg at Y3: 57% /
  51% / 58% / 87%), because its cause is the chart.
- **Grade pay and drums:** at the same hit share bots grade a little lower on drums (85% hit, T2 room: drums 4A, bass
  1A 3S), so grade pay pays drums slightly less at equal accuracy (B, T2 door: drums $358 vs bass $394). That is why the
  recommendation sets D to x1.0 (no penalty below B; a low-grade drummer is never docked) and keeps the bonus modest.
- **Chart-side lever, not in these options:** thinning only the drum-only lanes (hat / cymbal / toms / ride gaps) on
  Easy/Normal moves drums just 2.93 -> 2.87 (Easy) and 5.67 -> 5.46 notes/s (Normal): the density is kick + snare, and the
  kick gap is shared with the string seats (`22_sim_gig.js:460-465` `strLaneGap` uses the kick's gap for every string
  lane). Bringing drums toward bass needs a small code split (drum-only kick/snare gaps on Easy/Normal; Hard/Expert stay
  "as written"). Suggested as a separate v1.4 item for an owner playtest; bots cannot measure it (they hit a share of
  notes, not a rate).

| who | loan Y1 | broke wks Y1 | fund Y1 | fund Y3 | net/gig Y1 | full rig cost | full rig affordable (median wk) |
|---|---|---|---|---|---|---|---|
| drums, avg bot | 25% / 20% / 5% / 0% | 1.4 / 1.8 / 0.8 / 0.1 | 410 / 592 / 608 / 660 | 2160 / 2473 / 2909 / 2935 | $6 / $12 / $22 / $36 | $1100 / $1000 / $900 / $800 | 40 / 36 / 36 / 22 |
| drums, avg bot one grade lower (human-drummer proxy) | 48% / 30% / 5% / 0% | 3.2 / 2.2 / 0.9 / 0.0 | 244 / 278 / 552 / 699 | 1061 / 1104 / 1606 / 2626 | -$9 / -$3 / $22 / $33 | $1100 / $1000 / $900 / $800 | 59 / 47 / 37 / 30 |
| bass, avg bot | 30% / 28% / 3% / 0% | 1.9 / 1.0 / 0.8 / 0.1 | 387 / 588 / 684 / 819 | 1858 / 2185 / 2761 / 3014 | $0 / $5 / $23 / $38 | $750 / $750 / $700 / $600 | 36 / 33 / 23 / 15 |
| drums, weak bot | 40% / 30% / 5% / 3% | 4.0 / 2.9 / 0.9 / 0.3 | 358 / 332 / 590 / 737 | 1067 / 1201 / 1930 / 2449 | -$14 / -$3 / $19 / $32 | $1100 / $1000 / $900 / $800 | 53 / 44 / 36 / 27 |
| bass, weak bot | 48% / 23% / 5% / 0% | 2.6 / 1.3 / 0.6 / 0.1 | 276 / 416 / 472 / 750 | 1386 / 1244 / 1883 / 2080 | -$11 / -$3 / $15 / $28 | $750 / $750 / $700 / $600 | 40 / 37 / 37 / 18 |
| drums, good bot | 3% / 8% / 3% / 0% | 0.4 / 0.4 / 0.1 / 0.0 | 677 / 878 / 945 / 1379 | 3466 / 3762 / 3940 / 4656 | $38 / $41 / $52 / $74 | $1100 / $1000 / $900 / $800 | 27 / 26 / 23 / 18 |
| bass, good bot | 18% / 3% / 0% / 0% | 0.8 / 0.4 / 0.1 / 0.0 | 723 / 1018 / 1000 / 1236 | 4102 / 4004 / 3968 / 4264 | $29 / $50 / $57 / $69 | $750 / $750 / $700 / $600 | 22 / 19 / 18 / 12 |

## 4. The options

Shared mechanism (needed by B and C, used lightly by A; neutral at the defaults, so it changes nothing by itself):

| # | file:line (base) | change |
|---|---|---|
| M1 | `src/26_sim_world.js:43` | DEFAULTS gain `gasEra: { garage: 1, local: 1, signed: 1, world: 1 }, tierPay: { 1: 1, 2: 1, 3: 1 }, exposureGas: 0` |
| M2 | `src/26_sim_world.js:135` | `gasFor`: `x ((K.gasEra || {})[state.era] || 1)` |
| M3 | `src/26_sim_world.js:232` | `decorate`: after `g.gas = world.gasFor(...)`, exposure deals get `g.gas = max(0, g.gas - exposureGas)` ("the host chips in for gas") |
| M4 | `src/26_sim_world.js:256` | `makeListing` pay mult `x ((K.tierPay || {})[v.tier] || 1)` (board, offers, rival listings; opening slots keep $20-45). Build: same factor in `22_sim_gig.js:73` `makeGig` (card bookings) |
| M5 | `src/22_sim_gig.js:170` | `applyResult`, before the difficulty multiplier: if `gradePay` and `state.era` in `gradePayEras`: `r.pay = round((r.pay - prize) x gradePay[grade]) + prize` (BotB prize unscaled; one guard flag). Same path for played, simulated and bot gigs (Simulate = played pay held in every option, 20/20 per cell) |
| U1 | `src/55_ui_gig.js:1114-1115` | Result screen (text only, all options): add a "Band's cut -$X" cell (`r.cut`) between Pay and Gas so Pay - cut - gas = what lands in the fund; in B/C a "great show +$Y" note when grade pay applied. Not measurable by bots |

### Option A: gentle

"You start with $100 more, small rooms pay about 25% more, open mics chip in for gas, and a great early show earns a small bonus."

| file:line | old -> new |
|---|---|
| `src/content/economy.js:7` | `startFund: 300` -> `400` |
| `src/content/economy.js:135` (economy.world) | add `tierPay: {1: 1.25}`, `exposureGas: 15` |
| `src/content/economy.js:66` (economy.gig) | add `gradePay: {S: 1.15, A: 1.05, B: 1, C: 1, D: 0.95}, gradePayEras: ['garage', 'local']` |
| `src/content/shop.js:33` | ride / lane-6 item `cost: 350` -> `250` (drum rig $1,100 -> $1,000; bass unchanged $750) |

### Option B: medium (recommended)

"Early gigs pay their way: small rooms pay about 40% more, gas is cheaper until you sign (and open mics cover theirs), you
start with $100 more, and a great show pays up to 25% more than a so-so one."

| file:line | old -> new |
|---|---|
| `src/content/economy.js:7` | `startFund: 300` -> `400` |
| `src/content/economy.js:135` (economy.world) | add `tierPay: {1: 1.4}`, `gasEra: {garage: 0.6, local: 0.8}`, `exposureGas: 25` |
| `src/content/economy.js:66` (economy.gig) | add `gradePay: {S: 1.25, A: 1.1, B: 1, C: 1, D: 0.9}` (recommend D `1.0`), `gradePayEras: ['garage', 'local']` |
| `src/content/shop.js:33` | ride / lane-6 `350` -> `200` |
| `src/content/shop.js:34` | pedal / runs item `300` -> `250` (drum rig $900, bass $700) |

### Option C: strong

"Early money is comfortable: $500 to start, small rooms pay about 60% more and mid rooms 10% more, gas is half price in the
garage, starter gear is cheaper, a great show pays up to 35% more, and being signed costs $10 a week less."

| file:line | old -> new |
|---|---|
| `src/content/economy.js:7` | `startFund: 300` -> `500` |
| `src/content/economy.js:39` | `parentsCushion: 100` -> `150` |
| `src/content/economy.js:123` | `eraUpkeep.signed: 40` -> `30` |
| `src/content/economy.js:135` (economy.world) | add `tierPay: {1: 1.6, 2: 1.1}`, `gasEra: {garage: 0.5, local: 0.7}`, `exposureGas: 40` |
| `src/content/economy.js:66` (economy.gig) | add `gradePay: {S: 1.35, A: 1.15, B: 1, C: 1, D: 0.85}, gradePayEras: ['garage', 'local']` |
| `src/content/shop.js:30, 33, 34, 40` | toms `450` -> `350`, ride `350` -> `200`, pedal `300` -> `250`, Pawn Shop kit `800` -> `650` (drum rig $800, bass $600) |

## 5. Before / after (Hail Damage, 40 seeds per seat x bot; "all" = the four seats pooled, 160 careers; h12 = drums avg bot one grade lower)

Weak = avg bot that picks the best option 20% of the time and takes 50% of offers (the baseline's proxy). Year 4-6 rows
come from 6-year runs of the avg and good bots (years 1-3 of those runs are byte-identical to the baseline driver's).

### 5.1 Year 1 by quarter

**F1. Year 1 by quarter: median fund at the quarter end ($)** (cells: base / A / B / C)

| seat | bot | wk 6 | wk 12 | wk 18 | wk 24 |
|---|---|---|---|---|---|
| all | weak | 158 / 247 / 276 / 396 | 243 / 316 / 381 / 572 | 226 / 324 / 429 / 661 | 288 / 363 / 515 / 710 |
| all | avg | 182 / 255 / 278 / 403 | 302 / 351 / 438 / 554 | 310 / 432 / 534 / 702 | 396 / 568 / 628 / 765 |
| all | good | 218 / 233 / 246 / 325 | 382 / 493 / 550 / 668 | 562 / 664 / 674 / 886 | 723 / 907 / 953 / 1352 |
| drums | weak | 159 / 176 / 242 / 377 | 211 / 257 / 345 / 466 | 255 / 327 / 389 / 603 | 358 / 332 / 590 / 737 |
| drums | avg | 177 / 258 / 257 / 372 | 339 / 389 / 467 / 618 | 375 / 428 / 527 / 699 | 410 / 592 / 608 / 660 |
| drums | good | 223 / 237 / 251 / 332 | 414 / 496 / 628 / 660 | 642 / 578 / 660 / 857 | 677 / 878 / 945 / 1379 |
| drums | h12 | 188 / 217 / 241 / 362 | 216 / 301 / 412 / 515 | 221 / 261 / 455 / 652 | 244 / 278 / 552 / 699 |
| bass | weak | 174 / 265 / 332 / 449 | 291 / 338 / 427 / 599 | 264 / 438 / 507 / 721 | 276 / 416 / 472 / 750 |
| bass | avg | 206 / 301 / 318 / 430 | 289 / 398 / 482 / 567 | 294 / 523 / 631 / 765 | 387 / 588 / 684 / 819 |
| bass | good | 220 / 232 / 243 / 330 | 370 / 528 / 560 / 747 | 450 / 741 / 675 / 829 | 723 / 1018 / 1000 / 1236 |
| rhythm | weak | 154 / 274 / 320 / 437 | 224 / 296 / 381 / 584 | 204 / 274 / 400 / 616 | 285 / 352 / 493 / 707 |
| rhythm | avg | 201 / 267 / 288 / 433 | 271 / 379 / 442 / 609 | 276 / 383 / 545 / 725 | 345 / 421 / 610 / 804 |
| rhythm | good | 217 / 228 / 227 / 329 | 365 / 520 / 526 / 594 | 541 / 644 / 673 / 869 | 687 / 945 / 903 / 1322 |
| lead | weak | 137 / 242 / 248 / 383 | 223 / 351 / 377 / 573 | 219 / 298 / 431 / 646 | 281 / 383 / 489 / 673 |
| lead | avg | 154 / 223 / 270 / 402 | 255 / 301 / 364 / 482 | 332 / 384 / 407 / 531 | 457 / 588 / 515 / 745 |
| lead | good | 215 / 243 / 268 / 300 | 385 / 462 / 539 / 673 | 561 / 654 / 676 / 929 | 887 / 859 / 981 / 1452 |

**F2. Year 1 by quarter: mean net fund change per quarter ($)** (cells: base / A / B / C)

| seat | bot | Q1 | Q2 | Q3 | Q4 |
|---|---|---|---|---|---|
| all | weak | -142 / -158 / -116 / -96 | 50 / 81 / 119 / 153 | -37 / 12 / 43 / 74 | 40 / 21 / 67 / 90 |
| all | avg | -121 / -131 / -109 / -94 | 97 / 86 / 146 / 171 | 20 / 61 / 100 / 115 | 88 / 84 / 76 / 81 |
| all | good | -81 / -163 / -144 / -181 | 217 / 319 / 353 / 374 | 117 / 114 / 102 / 215 | 240 / 268 / 296 / 410 |
| drums | weak | -154 / -199 / -151 / -133 | 69 / 86 / 147 / 155 | -11 / 39 / 35 / 91 | 64 / -6 / 115 / 104 |
| drums | avg | -109 / -131 / -115 / -111 | 150 / 103 / 176 / 218 | 29 / 47 / 64 / 127 | 50 / 119 / 51 / -19 |
| drums | good | -57 / -164 / -136 / -183 | 231 / 311 / 378 / 375 | 165 / 67 / 72 / 226 | 202 / 307 / 281 / 426 |
| drums | h12 | -131 / -164 / -145 / -141 | 24 / 63 / 184 / 196 | -44 / -44 / 16 / 76 | 39 / 30 / 95 / 41 |
| bass | weak | -116 / -138 / -93 / -81 | 60 / 83 / 109 / 149 | -47 / 30 / 81 / 123 | -10 / 17 / 2 / 40 |
| bass | avg | -111 / -116 / -99 / -83 | 75 / 101 / 178 / 186 | 15 / 74 / 115 / 124 | 67 / 48 / 75 / 122 |
| bass | good | -89 / -163 / -155 / -179 | 162 / 329 / 393 / 397 | 80 / 173 / 85 / 187 | 258 / 282 / 319 / 360 |

### 5.2 Years 1-3: fund, broke weeks, parents' loans (all four seats)

**F3. Fund medians, years 1-3 ($)** (cells: base / A / B / C)

| seat | bot | Y1 end | Y2 end | Y3 end |
|---|---|---|---|---|
| all | weak | 288 / 363 / 515 / 710 | 779 / 802 / 940 / 1103 | 1116 / 1278 / 1870 / 2396 |
| all | avg | 396 / 568 / 628 / 765 | 1049 / 1089 / 1266 / 1593 | 2077 / 2383 / 2958 / 3045 |
| all | good | 723 / 907 / 953 / 1352 | 2281 / 2459 / 2665 / 2696 | 3850 / 3928 / 3798 / 4522 |
| drums | weak | 358 / 332 / 590 / 737 | 764 / 807 / 976 / 1200 | 1067 / 1201 / 1930 / 2449 |
| drums | avg | 410 / 592 / 608 / 660 | 1031 / 1023 / 929 / 1434 | 2160 / 2473 / 2909 / 2935 |
| drums | good | 677 / 878 / 945 / 1379 | 2166 / 2689 / 2280 / 2682 | 3466 / 3762 / 3940 / 4656 |
| drums | h12 | 244 / 278 / 552 / 699 | 632 / 756 / 1083 / 1048 | 1061 / 1104 / 1606 / 2626 |
| bass | weak | 276 / 416 / 472 / 750 | 867 / 814 / 1005 / 1028 | 1386 / 1244 / 1883 / 2080 |
| bass | avg | 387 / 588 / 684 / 819 | 886 / 1357 / 1258 / 1592 | 1858 / 2185 / 2761 / 3014 |
| bass | good | 723 / 1018 / 1000 / 1236 | 2326 / 2364 / 2985 / 2670 | 4102 / 4004 / 3968 / 4264 |
| rhythm | weak | 285 / 352 / 493 / 707 | 624 / 719 / 774 / 1110 | 938 / 1111 / 1701 / 2432 |
| rhythm | avg | 345 / 421 / 610 / 804 | 976 / 980 / 1538 / 1681 | 2064 / 2092 / 3005 / 3178 |
| rhythm | good | 687 / 945 / 903 / 1322 | 2500 / 2440 / 2632 / 2765 | 4125 / 4017 / 3560 / 4369 |
| lead | weak | 281 / 383 / 489 / 673 | 733 / 904 / 963 / 1160 | 979 / 1646 / 2129 / 2743 |
| lead | avg | 457 / 588 / 515 / 745 | 1212 / 1297 / 1294 / 1619 | 2346 / 2815 / 3247 / 3210 |
| lead | good | 887 / 859 / 981 / 1452 | 2206 / 2834 / 2829 / 2677 | 3704 / 3818 / 3658 / 4943 |

**F4. Broke weeks (fund < $100 at the wrap; mean per career)** (cells: base / A / B / C)

| seat | bot | Y1 (of 24) | Y2 | Y3 |
|---|---|---|---|---|
| all | weak | 3.5 / 2.0 / 0.7 / 0.1 | 0.7 / 0.5 / 0.3 / 0.1 | 0.1 / 0.1 / 0.0 / 0.0 |
| all | avg | 2.0 / 1.3 / 0.8 / 0.1 | 0.5 / 0.2 / 0.2 / 0.0 | 0.1 / 0.0 / 0.0 / 0.0 |
| all | good | 0.6 / 0.4 / 0.1 / 0.0 | 0.0 / 0.0 / 0.0 / 0.0 | 0.0 / 0.0 / 0.0 / 0.0 |
| drums | weak | 4.0 / 2.9 / 0.9 / 0.3 | 0.6 / 0.5 / 0.2 / 0.2 | 0.2 / 0.2 / 0.1 / 0.0 |
| drums | avg | 1.4 / 1.8 / 0.8 / 0.1 | 0.4 / 0.2 / 0.2 / 0.0 | 0.0 / 0.1 / 0.0 / 0.0 |
| drums | good | 0.4 / 0.4 / 0.1 / 0.0 | 0.0 / 0.1 / 0.0 / 0.0 | 0.0 / 0.0 / 0.0 / 0.0 |
| drums | h12 | 3.2 / 2.2 / 0.9 / 0.0 | 1.2 / 0.8 / 0.1 / 0.1 | 0.3 / 0.2 / 0.1 / 0.0 |
| bass | weak | 2.6 / 1.3 / 0.6 / 0.1 | 0.8 / 0.6 / 0.3 / 0.2 | 0.1 / 0.1 / 0.0 / 0.0 |
| bass | avg | 1.9 / 1.0 / 0.8 / 0.1 | 0.5 / 0.3 / 0.2 / 0.0 | 0.1 / 0.0 / 0.0 / 0.0 |
| bass | good | 0.8 / 0.4 / 0.1 / 0.0 | 0.0 / 0.0 / 0.0 / 0.0 | 0.0 / 0.0 / 0.0 / 0.0 |
| rhythm | weak | 3.7 / 2.1 / 0.6 / 0.0 | 0.8 / 0.5 / 0.4 / 0.0 | 0.1 / 0.2 / 0.0 / 0.1 |
| rhythm | avg | 2.2 / 1.1 / 0.6 / 0.1 | 0.7 / 0.3 / 0.2 / 0.1 | 0.3 / 0.1 / 0.0 / 0.1 |
| rhythm | good | 0.7 / 0.5 / 0.1 / 0.0 | 0.1 / 0.0 / 0.0 / 0.0 | 0.0 / 0.0 / 0.0 / 0.0 |
| lead | weak | 3.6 / 1.6 / 0.8 / 0.1 | 0.8 / 0.5 / 0.3 / 0.1 | 0.1 / 0.1 / 0.0 / 0.0 |
| lead | avg | 2.6 / 1.3 / 0.9 / 0.2 | 0.4 / 0.1 / 0.1 / 0.1 | 0.0 / 0.0 / 0.0 / 0.0 |
| lead | good | 0.6 / 0.3 / 0.1 / 0.0 | 0.0 / 0.0 / 0.0 / 0.0 | 0.0 / 0.1 / 0.0 / 0.0 |

**F5. Careers with a parents' loan in the year (%)** (cells: base / A / B / C)

| seat | bot | Y1 | Y2 | Y3 |
|---|---|---|---|---|
| all | weak | 49% / 26% / 5% / 1% | 16% / 21% / 9% / 2% | 4% / 8% / 4% / 1% |
| all | avg | 35% / 25% / 5% / 1% | 12% / 11% / 3% / 1% | 3% / 3% / 4% / 1% |
| all | good | 8% / 4% / 1% / 0% | 2% / 2% / 2% / 2% | 2% / 1% / 1% / 1% |
| drums | weak | 40% / 30% / 5% / 3% | 15% / 13% / 8% / 0% | 8% / 10% / 5% / 0% |
| drums | avg | 25% / 20% / 5% / 0% | 5% / 10% / 3% / 0% | 0% / 5% / 5% / 0% |
| drums | good | 3% / 8% / 3% / 0% | 3% / 0% / 3% / 3% | 0% / 0% / 0% / 3% |
| drums | h12 | 48% / 30% / 5% / 0% | 28% / 20% / 3% / 0% | 18% / 13% / 5% / 0% |
| bass | weak | 48% / 23% / 5% / 0% | 10% / 23% / 8% / 5% | 3% / 5% / 0% / 0% |
| bass | avg | 30% / 28% / 3% / 0% | 18% / 10% / 8% / 0% | 5% / 5% / 3% / 3% |
| bass | good | 18% / 3% / 0% / 0% | 3% / 5% / 0% / 3% | 3% / 3% / 5% / 3% |
| rhythm | weak | 45% / 18% / 3% / 0% | 20% / 33% / 18% / 0% | 5% / 15% / 8% / 5% |
| rhythm | avg | 38% / 28% / 0% / 0% | 18% / 20% / 0% / 0% | 5% / 3% / 3% / 3% |
| rhythm | good | 5% / 5% / 0% / 0% | 3% / 3% / 5% / 3% | 5% / 3% / 0% / 0% |
| lead | weak | 65% / 33% / 8% / 3% | 20% / 15% / 3% / 3% | 3% / 3% / 3% / 0% |
| lead | avg | 48% / 25% / 13% / 3% | 8% / 5% / 0% / 3% | 3% / 0% / 5% / 0% |
| lead | good | 8% / 0% / 0% / 0% | 0% / 0% / 0% / 0% | 0% / 0% / 0% / 0% |

### 5.3 Gig pay

**P1. Median gross pay per PAID gig by venue tier, year 1 / year 2 / year 3 ($)** (cells: base / A / B / C)

| seat | bot | T1 Y1 | T1 Y2 | T2 Y2 | T2 Y3 | T3 Y3 |
|---|---|---|---|---|---|---|
| all | weak | $100 / $120 / $130 / $150 | $115 / $120 / $125 / $145 | $236 / $242 / $240 / $265 | $280 / $270 / $270 / $312 | $785 / $770 / $785 / $774 |
| all | avg | $105 / $120 / $130 / $140 | $110 / $120 / $125 / $140 | $260 / $263 / $275 / $313 | $300 / $294 / $300 / $320 | $810 / $803 / $825 / $810 |
| all | good | $108 / $120 / $125 / $145 | $120 / $120 / $120 / $130 | $340 / $350 / $340 / $375 | $348 / $350 / $340 / $383 | $1,100 / $1,100 / $1,100 / $1,100 |
| drums | weak | $100 / $120 / $132 / $150 | $110 / $120 / $125 / $150 | $223 / $240 / $233 / $260 | $300 / $275 / $260 / $320 | $786 / $775 / $760 / $773 |
| drums | avg | $110 / $120 / $130 / $145 | $110 / $120 / $120 / $138 | $255 / $250 / $281 / $300 | $300 / $285 / $310 / $335 | $800 / $780 / $825 / $780 |
| drums | good | $110 / $120 / $120 / $140 | $120 / $120 / $120 / $125 | $325 / $340 / $315 / $385 | $340 / $345 / $326 / $375 | $1,100 / $1,100 / $1,100 / $1,100 |
| drums | h12 | $105 / $114 / $120 / $123 | $110 / $125 / $120 / $149 | $238 / $240 / $240 / $265 | $296 / $280 / $290 / $305 | $770 / $750 / $786 / $798 |
| bass | weak | $102 / $120 / $125 / $140 | $115 / $126 / $128 / $140 | $248 / $250 / $255 / $265 | $278 / $270 / $270 / $348 | $825 / $765 / $785 / $750 |
| bass | avg | $105 / $120 / $125 / $140 | $115 / $120 / $125 / $138 | $272 / $275 / $267 / $310 | $310 / $280 / $300 / $310 | $815 / $825 / $825 / $800 |
| bass | good | $110 / $120 / $130 / $145 | $120 / $120 / $120 / $130 | $345 / $348 / $345 / $371 | $340 / $340 / $365 / $425 | $1,103 / $1,123 / $1,100 / $1,100 |

**P2. Net per gig to the fund (mean; pay - cut - gas - fill-ins - commission - crew - tow; merch not incl.) ($)** (cells: base / A / B / C)

| seat | bot | Y1 | Y2 | Y3 |
|---|---|---|---|---|
| all | weak | -$13 / -$0 / $17 / $30 | $30 / $26 / $37 / $53 | $22 / $22 / $39 / $38 |
| all | avg | $3 / $9 / $23 / $35 | $42 / $41 / $50 / $68 | $43 / $46 / $54 / $57 |
| all | good | $32 / $44 / $53 / $74 | $83 / $97 / $86 / $106 | $174 / $192 / $181 / $195 |
| drums | weak | -$14 / -$3 / $19 / $32 | $36 / $30 / $28 / $48 | $40 / $24 / $38 / $41 |
| drums | avg | $6 / $12 / $22 / $36 | $52 / $39 / $48 / $64 | $48 / $41 / $53 / $52 |
| drums | good | $38 / $41 / $52 / $74 | $83 / $92 / $86 / $115 | $181 / $182 / $183 / $198 |
| drums | h12 | -$9 / -$3 / $22 / $33 | $35 / $40 / $58 / $67 | $22 / $28 / $37 / $52 |
| bass | weak | -$11 / -$3 / $15 / $28 | $38 / $25 / $47 / $46 | $20 / $24 / $41 / $30 |
| bass | avg | $0 / $5 / $23 / $38 | $33 / $58 / $51 / $74 | $31 / $43 / $55 / $35 |
| bass | good | $29 / $50 / $57 / $69 | $82 / $102 / $93 / $107 | $187 / $200 / $187 / $188 |

**P3. Year 1: net per PAID tier-1 gig (median) vs one Hustle block (mean $/block)** (cells: base / A / B / C)

| seat | bot | paid T1 net | hustle/block | unpaid share |
|---|---|---|---|---|
| all | weak | $51 / $65 / $71 / $78 | $71 / $72 / $72 / $73 | 60% / 60% / 58% / 59% |
| all | avg | $58 / $65 / $72 / $78 | $73 / $73 / $74 / $74 | 54% / 55% / 55% / 55% |
| all | good | $61 / $72 / $77 / $79 | $77 / $79 / $78 / $80 | 45% / 41% / 41% / 40% |
| drums | weak | $50 / $60 / $65 / $78 | $69 / $71 / $72 / $73 | 60% / 61% / 57% / 56% |
| drums | avg | $58 / $65 / $72 / $78 | $73 / $73 / $74 / $74 | 53% / 53% / 55% / 55% |
| drums | good | $65 / $72 / $77 / $78 | $78 / $77 / $79 / $81 | 44% / 42% / 41% / 40% |
| drums | h12 | $46 / $56 / $65 / $66 | $70 / $69 / $72 / $72 | 57% / 57% / 55% / 54% |
| bass | weak | $51 / $65 / $77 / $79 | $71 / $73 / $73 / $72 | 58% / 59% / 58% / 59% |
| bass | avg | $51 / $65 / $70 / $78 | $72 / $73 / $73 / $73 | 55% / 58% / 54% / 53% |
| bass | good | $61 / $72 / $77 / $78 | $76 / $80 / $76 / $79 | 45% / 40% / 39% / 40% |

The same gig played at three accuracies (mid-year-1 band, 140 fans, tier-1 room; year-2 band, 700 fans, tier-2 room;
4 seeds; Normal). Pay (net to the fund after cut, gas, rep, tows):

| seat | room | deal | 55% hit (C): pay (net) | 85% hit (A or S): pay (net) | 100% hit (S): pay (net) | Simulate = played pay |
|---|---|---|---|---|---|---|
| drums | T1 (140 fans) | flat | $118 ($46) / $148 ($67) / $164 ($92) / $188 ($112) | $118 ($46) / $155 ($72) / $181 ($104) / $215 ($132) | $118 ($46) / $170 ($83) / $205 ($121) / $253 ($158) | 20/20 / 20/20 / 20/20 / 20/20 |
| drums | T1 (140 fans) | door | $104 (-$32) / $137 (-$9) / $162 ($50) / $187 ($78) | $104 (-$32) / $144 (-$5) / $179 ($61) / $215 ($98) | $104 (-$32) / $157 ($5) / $203 ($79) / $253 ($124) | 20/20 / 20/20 / 20/20 / 20/20 |
| drums | T2 (700 fans) | flat | $189 ($43) / $189 ($43) / $189 ($60) / $206 ($81) | $189 ($43) / $198 ($49) / $208 ($74) / $237 ($103) | $189 ($43) / $217 ($63) / $236 ($93) / $279 ($132) | 20/20 / 20/20 / 20/20 / 20/20 |
| drums | T2 (700 fans) | door | $326 ($138) / $326 ($138) / $326 ($156) / $381 ($203) | $326 ($138) / $342 ($150) / $358 ($179) / $438 ($244) | $326 ($138) / $374 ($173) / $407 ($213) / $514 ($297) | 20/20 / 20/20 / 20/20 / 20/20 |
| bass | T1 (140 fans) | flat | $118 ($46) / $148 ($67) / $164 ($92) / $188 ($112) | $118 ($46) / $155 ($72) / $181 ($104) / $215 ($132) | $118 ($46) / $170 ($83) / $205 ($121) / $253 ($158) | 20/20 / 20/20 / 20/20 / 20/20 |
| bass | T1 (140 fans) | door | $104 (-$32) / $137 (-$9) / $162 ($50) / $187 ($78) | $104 (-$32) / $144 (-$5) / $179 ($61) / $215 ($98) | $104 (-$32) / $157 ($5) / $203 ($79) / $253 ($124) | 20/20 / 20/20 / 20/20 / 20/20 |
| bass | T2 (700 fans) | flat | $189 ($43) / $189 ($43) / $189 ($60) / $206 ($81) | $189 ($43) / $212 ($59) / $228 ($88) / $267 ($124) | $189 ($43) / $217 ($63) / $236 ($93) / $279 ($132) | 20/20 / 20/20 / 20/20 / 20/20 |
| bass | T2 (700 fans) | door | $326 ($138) / $326 ($138) / $326 ($156) / $381 ($203) | $326 ($138) / $366 ($167) / $394 ($204) / $496 ($284) | $326 ($138) / $374 ($173) / $407 ($213) / $514 ($297) | 20/20 / 20/20 / 20/20 / 20/20 |

### 5.4 Gig share of income

**S1. Gig share of income: gross gig pay / all money in (%), and what gigs leave in the fund / all money left after cut, gas, road (%)** (cells: base / A / B / C)

| seat | bot | gross Y1 | gross Y2 | gross Y3 | net Y1 | net Y2 |
|---|---|---|---|---|---|---|
| all | weak | 37% / 43% / 47% / 50% | 48% / 46% / 44% / 43% | 42% / 40% / 39% / 39% | -23% / -4% / 17% / 28% | 18% / 16% / 19% / 21% |
| all | avg | 45% / 48% / 50% / 51% | 47% / 45% / 44% / 45% | 42% / 40% / 40% / 40% | 1% / 8% / 23% / 30% | 21% / 20% / 21% / 25% |
| all | good | 60% / 61% / 62% / 63% | 47% / 48% / 46% / 48% | 46% / 47% / 46% / 47% | 31% / 37% / 41% / 45% | 28% / 30% / 28% / 31% |
| drums | weak | 34% / 43% / 48% / 52% | 49% / 47% / 42% / 40% | 43% / 40% / 39% / 38% | -25% / -8% / 17% / 30% | 21% / 18% / 16% / 19% |
| drums | avg | 46% / 50% / 51% / 52% | 49% / 47% / 47% / 45% | 40% / 41% / 40% / 40% | 5% / 11% / 23% / 31% | 24% / 20% / 22% / 25% |
| drums | good | 60% / 61% / 62% / 64% | 47% / 47% / 45% / 49% | 46% / 47% / 46% / 47% | 34% / 35% / 40% / 46% | 28% / 29% / 28% / 32% |
| drums | h12 | 41% / 46% / 50% / 54% | 54% / 55% / 54% / 52% | 48% / 46% / 47% / 44% | -22% / -12% / 23% / 34% | 24% / 26% / 30% / 30% |
| bass | weak | 38% / 40% / 46% / 48% | 50% / 49% / 48% / 43% | 42% / 40% / 39% / 41% | -19% / -7% / 15% / 27% | 21% / 17% / 22% / 21% |
| bass | avg | 45% / 42% / 48% / 51% | 47% / 46% / 45% / 45% | 44% / 40% / 41% / 40% | -2% / 4% / 22% / 31% | 20% / 23% / 22% / 26% |
| bass | good | 62% / 63% / 64% / 62% | 47% / 48% / 48% / 49% | 47% / 47% / 46% / 48% | 31% / 39% / 43% / 42% | 28% / 31% / 30% / 31% |

**S2. Gig pay, Hustle and gear spending per year (mean $)** (cells: base / A / B / C)

| seat | bot | gig gross Y1 | hustle Y1 | gas Y1 | gear+kit Y1-2 |
|---|---|---|---|---|---|
| all | weak | $632 / $766 / $833 / $942 | $845 / $766 / $709 / $677 | $577 / $504 / $327 / $226 | $228 / $281 / $350 / $528 |
| all | avg | $872 / $951 / $983 / $1,086 | $792 / $765 / $742 / $711 | $525 / $500 / $327 / $239 | $409 / $503 / $548 / $646 |
| all | good | $2,407 / $2,856 / $2,949 / $3,602 | $437 / $273 / $227 / $98 | $826 / $835 / $695 / $647 | $2,199 / $2,296 / $2,283 / $2,675 |
| drums | weak | $548 / $741 / $894 / $1,004 | $859 / $774 / $699 / $671 | $532 / $525 / $340 / $241 | $215 / $216 / $391 / $609 |
| drums | avg | $863 / $1,017 / $973 / $1,066 | $789 / $775 / $683 / $661 | $474 / $502 / $322 / $226 | $360 / $529 / $460 / $555 |
| drums | good | $2,526 / $2,764 / $2,863 / $3,656 | $371 / $288 / $241 / $104 | $755 / $846 / $678 / $665 | $2,131 / $2,210 / $2,548 / $2,710 |
| drums | h12 | $655 / $757 / $863 / $974 | $771 / $744 / $720 / $689 | $573 / $555 / $294 / $201 | $201 / $258 / $319 / $415 |
| bass | weak | $611 / $689 / $792 / $850 | $820 / $779 / $720 / $692 | $536 / $477 / $327 / $200 | $224 / $270 / $305 / $446 |
| bass | avg | $827 / $812 / $947 / $1,138 | $771 / $813 / $791 / $745 | $537 / $462 / $313 / $232 | $378 / $590 / $566 / $711 |
| bass | good | $2,403 / $3,004 / $3,130 / $3,557 | $457 / $249 / $208 / $95 | $886 / $814 / $720 / $706 | $2,081 / $2,350 / $2,290 / $2,710 |

### 5.5 Late game: years 3-6 (avg + good bots, all four seats)

**L1. Late game: median fund at the year end ($)** (cells: base / A / B / C)

| seat | bot | Y3 | Y4 | Y5 | Y6 |
|---|---|---|---|---|---|
| all | weak | 1116 / 1278 / 1870 / 2396 | - / - / - / - | - / - / - / - | - / - / - / - |
| all | avg | 2077 / 2383 / 2958 / 3045 | 3682 / 3621 / 4013 / 4235 | 4396 / 4826 / 4566 / 5081 | 4679 / 4572 / 5188 / 5488 |
| all | good | 3850 / 3928 / 3798 / 4522 | 5489 / 5681 / 5766 / 6132 | 5304 / 5161 / 5110 / 5203 | 6509 / 7209 / 6970 / 6538 |
| drums | weak | 1067 / 1201 / 1930 / 2449 | - / - / - / - | - / - / - / - | - / - / - / - |
| drums | avg | 2160 / 2473 / 2909 / 2935 | 3190 / 3429 / 4199 / 3984 | 5290 / 5245 / 4704 / 5357 | 4188 / 4519 / 4804 / 5964 |
| drums | good | 3466 / 3762 / 3940 / 4656 | 5146 / 5807 / 5554 / 5657 | 4520 / 5644 / 4849 / 5067 | 8233 / 8244 / 6643 / 7187 |
| drums | h12 | 1061 / 1104 / 1606 / 2626 | - / - / - / - | - / - / - / - | - / - / - / - |
| bass | weak | 1386 / 1244 / 1883 / 2080 | - / - / - / - | - / - / - / - | - / - / - / - |
| bass | avg | 1858 / 2185 / 2761 / 3014 | 3686 / 4251 / 3843 / 4871 | 4173 / 4736 / 4689 / 5591 | 4649 / 4984 / 5024 / 5252 |
| bass | good | 4102 / 4004 / 3968 / 4264 | 5430 / 5944 / 5069 / 6451 | 4941 / 4734 / 5663 / 5203 | 6067 / 7438 / 6716 / 6495 |
| rhythm | weak | 938 / 1111 / 1701 / 2432 | - / - / - / - | - / - / - / - | - / - / - / - |
| rhythm | avg | 2064 / 2092 / 3005 / 3178 | 3674 / 3113 / 3638 / 4847 | 3783 / 4436 / 4229 / 4611 | 4576 / 4295 / 5280 / 5974 |
| rhythm | good | 4125 / 4017 / 3560 / 4369 | 5232 / 5556 / 5516 / 6127 | 5540 / 5736 / 5141 / 5132 | 6430 / 6463 / 7347 / 6450 |
| lead | weak | 979 / 1646 / 2129 / 2743 | - / - / - / - | - / - / - / - | - / - / - / - |
| lead | avg | 2346 / 2815 / 3247 / 3210 | 3901 / 3867 / 4603 / 4059 | 4553 / 4579 / 4707 / 4909 | 5606 / 5189 / 5405 / 4189 |
| lead | good | 3704 / 3818 / 3658 / 4943 | 5874 / 5292 / 6506 / 6579 | 5698 / 4595 / 5073 / 5479 | 5944 / 7139 / 7029 / 6286 |

**L2. Late game: money in per year (mean $) and broke weeks Y4-6** (cells: base / A / B / C)

| seat | bot | in Y3 | in Y6 | broke Y4-6 |
|---|---|---|---|---|
| all | weak | $7,394 / $7,593 / $8,000 / $8,374 | - / - / - / - | - / - / - / - |
| all | avg | $9,195 / $9,532 / $10,418 / $10,129 | $19,249 / $18,832 / $19,833 / $20,105 | 0.0 / 0.0 / 0.0 / 0.0 |
| all | good | $28,097 / $29,416 / $28,447 / $29,769 | $51,964 / $52,099 / $52,486 / $52,223 | 0.0 / 0.0 / 0.0 / 0.0 |
| drums | weak | $7,533 / $7,349 / $8,030 / $8,458 | - / - / - / - | - / - / - / - |
| drums | avg | $8,952 / $9,496 / $10,351 / $9,836 | $18,817 / $18,248 / $18,342 / $19,693 | 0.0 / 0.0 / 0.1 / 0.0 |
| drums | good | $28,642 / $28,683 / $28,351 / $30,350 | $54,775 / $55,311 / $53,535 / $55,057 | 0.0 / 0.0 / 0.0 / 0.0 |
| drums | h12 | $7,224 / $7,029 / $7,269 / $8,523 | - / - / - / - | - / - / - / - |
| bass | weak | $8,173 / $7,706 / $8,036 / $8,462 | - / - / - / - | - / - / - / - |
| bass | avg | $9,338 / $9,532 / $9,949 / $10,987 | $19,101 / $19,665 / $19,906 / $20,113 | 0.0 / 0.0 / 0.0 / 0.0 |
| bass | good | $28,748 / $30,856 / $28,446 / $29,003 | $50,089 / $52,508 / $52,383 / $49,617 | 0.0 / 0.0 / 0.0 / 0.1 |
| rhythm | weak | $6,743 / $6,963 / $7,921 / $8,070 | - / - / - / - | - / - / - / - |
| rhythm | avg | $8,600 / $9,192 / $10,047 / $9,785 | $17,929 / $19,531 / $20,551 / $20,919 | 0.0 / 0.0 / 0.0 / 0.0 |
| rhythm | good | $27,194 / $29,071 / $28,415 / $29,136 | $52,001 / $48,851 / $52,083 / $52,173 | 0.0 / 0.0 / 0.0 / 0.0 |
| lead | weak | $7,127 / $8,353 / $8,012 / $8,506 | - / - / - / - | - / - / - / - |
| lead | avg | $9,890 / $9,907 / $11,325 / $9,908 | $21,149 / $17,882 / $20,532 / $19,695 | 0.0 / 0.0 / 0.0 / 0.0 |
| lead | good | $27,803 / $29,054 / $28,577 / $30,588 | $50,993 / $51,728 / $51,942 / $52,045 | 0.0 / 0.0 / 0.0 / 0.0 |

10 years (`tools/balance.js 10 20` in each worktree: Hail Damage drums, 20 seeds, **means**; the D5 probe):

| bot | metric | base | A | B | C |
|---|---|---|---|---|---|
| avg | fund end Y1 / Y2 / Y3 | 458 / 1,274 / 2,232 | 589 / 1,051 / 2,561 | 580 / 1,126 / 2,889 | 669 / 1,648 / 2,522 |
| avg | fund end Y4 / Y6 / Y8 / Y10 | 3,648 / 4,590 / 6,701 / 8,934 | 3,519 / 5,587 / 5,957 / 9,028 | 3,965 / 4,620 / 8,306 / 7,380 | 3,922 / 5,686 / 8,155 / 9,142 |
| avg | lowest fund Y1 / Y2 | 124 / 302 | 158 / 330 | 191 / 372 | 312 / 504 |
| avg | Local Heroes / signed / World era (wk) | 22 / 45 / 147 | 20 / 42 / 154 | 20 / 41 / 147 | 21 / 44 / 149 |
| avg | quits per year after protection | 0.64 | 0.65 | 0.50 | 0.51 |
| avg | fans Y10 | 46,105 | 43,264 | 45,172 | 45,537 |
| avg | legacy tiers | CI 20 / CH 75 / OA 5% | CI 10 / CH 90% | CI 20 / CH 75 / OA 5% | CI 10 / CH 90% |
| good | fund end Y1 / Y2 / Y3 | 816 / 2,083 / 3,596 | 978 / 2,741 / 4,043 | 1,001 / 2,206 / 3,879 | 1,362 / 2,642 / 4,235 |
| good | fund end Y4 / Y6 / Y8 / Y10 | 5,004 / 8,552 / 12,285 / 17,637 | 6,584 / 8,925 / 13,802 / 16,213 | 5,787 / 7,092 / 12,429 / 19,293 | 5,876 / 7,921 / 14,375 / 18,125 |
| good | Local Heroes / signed / World era (wk) | 16 / 27 / 100 | 15 / 27 / 99 | 14 / 28 / 100 | 13 / 25 / 98 |
| good | legacy tiers / bonus +3 | AL 15 / CI 85%, 95% | AL 15 / CI 85%, 100% | AL 25 / CI 75%, 95% | AL 15 / CI 85%, 100% |

All four keep the balance invariants (finite, in RANGES, fund >= 0 after every wrap). Years 4-10 move within seed noise
in every option (the per-year medians in L1 swing +-15-20% between seeds and options alike).

### 5.6 Pace (Steady pace targets: Local Heroes about week 24, first label interest in year 2, signed by years 2-3)

**M1. Pace: median week of 250 fans (Local Heroes) / first label offer / signed** (cells: base / A / B / C)

| seat | bot | 250 fans | first offer | signed |
|---|---|---|---|---|
| all | weak | 23 / 22 / 22 / 22 | 44 / 41 / 40 / 38 | 47 / 46 / 43 / 44 |
| all | avg | 21 / 21 / 20 / 20 | 39 / 38 / 37 / 37 | 43 / 42 / 41 / 41 |
| all | good | 16 / 15 / 14 / 14 | 26 / 26 / 26 / 24 | 27 / 27 / 27 / 25 |
| drums | weak | 25 / 23 / 23 / 22 | 45 / 44 / 41 / 39 | 51 / 48 / 45 / 44 |
| drums | avg | 21 / 21 / 20 / 20 | 41 / 39 / 37 / 38 | 48 / 42 / 42 / 41 |
| drums | good | 16 / 15 / 14 / 14 | 26 / 26 / 27 / 25 | 27 / 27 / 28 / 26 |
| drums | h12 | 27 / 27 / 24 / 25 | 47 / 52 / 48 / 44 | 54 / 54 / 52 / 48 |
| bass | weak | 22 / 22 / 22 / 22 | 41 / 39 / 41 / 39 | 46 / 45 / 43 / 43 |
| bass | avg | 21 / 21 / 21 / 20 | 37 / 36 / 38 / 38 | 39 / 40 / 41 / 41 |
| bass | good | 16 / 15 / 14 / 14 | 27 / 26 / 26 / 23 | 28 / 27 / 27 / 24 |
| rhythm | weak | 23 / 23 / 22 / 22 | 45 / 45 / 41 / 38 | 51 / 51 / 45 / 45 |
| rhythm | avg | 21 / 22 / 20 / 21 | 41 / 41 / 38 / 37 | 47 / 45 / 41 / 40 |
| rhythm | good | 16 / 15 / 15 / 14 | 28 / 26 / 27 / 25 | 29 / 27 / 28 / 26 |
| lead | weak | 24 / 22 / 22 / 21 | 43 / 39 / 39 / 37 | 46 / 42 / 42 / 42 |
| lead | avg | 20 / 20 / 20 / 19 | 37 / 39 / 36 / 38 | 42 / 42 / 39 / 43 |
| lead | good | 16 / 15 / 14 / 14 | 25 / 25 / 26 / 23 | 26 / 26 / 27 / 24 |

### 5.7 The full rig (lanes + pedal or runs) per seat

**G1. Full rig affordable (fund >= rig + $100 at a wrap): median week; share of careers by week 72** (cells: base / A / B / C)

| seat | bot | rig cost | median week | by wk 72 |
|---|---|---|---|---|
| drums | weak | $1100 / $1000 / $900 / $800 | 53 / 44 / 36 / 27 | 85% / 90% / 98% / 100% |
| drums | avg | $1100 / $1000 / $900 / $800 | 40 / 36 / 36 / 22 | 98% / 95% / 98% / 100% |
| drums | good | $1100 / $1000 / $900 / $800 | 27 / 26 / 23 / 18 | 100% / 100% / 100% / 100% |
| drums | h12 | $1100 / $1000 / $900 / $800 | 59 / 47 / 37 / 30 | 75% / 68% / 90% / 100% |
| bass | weak | $750 / $750 / $700 / $600 | 40 / 37 / 37 / 18 | 93% / 98% / 100% / 100% |
| bass | avg | $750 / $750 / $700 / $600 | 36 / 33 / 23 / 15 | 98% / 100% / 100% / 100% |
| bass | good | $750 / $750 / $700 / $600 | 22 / 19 / 18 / 12 | 100% / 100% / 100% / 100% |
| rhythm | weak | $1100 / $1000 / $900 / $800 | 55 / 52 / 37 / 29 | 80% / 85% / 98% / 100% |
| rhythm | avg | $1100 / $1000 / $900 / $800 | 39 / 42 / 31 / 21 | 90% / 95% / 100% / 100% |
| rhythm | good | $1100 / $1000 / $900 / $800 | 30 / 24 / 22 / 18 | 100% / 100% / 100% / 100% |
| lead | weak | $1100 / $1000 / $900 / $800 | 45 / 38 / 40 / 28 | 93% / 88% / 95% / 98% |
| lead | avg | $1100 / $1000 / $900 / $800 | 40 / 38 / 34 / 28 | 98% / 100% / 100% / 100% |
| lead | good | $1100 / $1000 / $900 / $800 | 26 / 24 / 22 / 18 | 100% / 100% / 100% / 100% |

### 5.8 Every band (drums + bass, weak + avg; Hail Damage 40 seeds, the others 30)

| band | seat | bot | loan Y1 | broke wks Y1 | fund Y1 (median) | fund Y3 (median) |
|---|---|---|---|---|---|---|
| hail damage | drums | weak | 40% / 30% / 5% / 3% | 4.0 / 2.9 / 0.9 / 0.3 | 358 / 332 / 590 / 737 | 1067 / 1201 / 1930 / 2449 |
| hail damage | drums | avg | 25% / 20% / 5% / 0% | 1.4 / 1.8 / 0.8 / 0.1 | 410 / 592 / 608 / 660 | 2160 / 2473 / 2909 / 2935 |
| hail damage | bass | weak | 48% / 23% / 5% / 0% | 2.6 / 1.3 / 0.6 / 0.1 | 276 / 416 / 472 / 750 | 1386 / 1244 / 1883 / 2080 |
| hail damage | bass | avg | 30% / 28% / 3% / 0% | 1.9 / 1.0 / 0.8 / 0.1 | 387 / 588 / 684 / 819 | 1858 / 2185 / 2761 / 3014 |
| frost heave | drums | weak | 67% / 50% / 20% / 0% | 4.8 / 3.1 / 1.7 / 0.2 | 236 / 246 / 449 / 519 | 1127 / 1370 / 1430 / 2643 |
| frost heave | drums | avg | 47% / 33% / 13% / 0% | 3.2 / 2.1 / 1.0 / 0.1 | 424 / 394 / 650 / 777 | 2132 / 2729 / 2847 / 2711 |
| frost heave | bass | weak | 63% / 40% / 13% / 0% | 4.5 / 2.4 / 1.3 / 0.1 | 214 / 286 / 475 / 631 | 1403 / 1303 / 1995 / 2394 |
| frost heave | bass | avg | 53% / 13% / 3% / 0% | 2.7 / 1.3 / 0.3 / 0.1 | 279 / 465 / 657 / 750 | 1800 / 2578 / 2731 / 3436 |
| gravel kings | drums | weak | 17% / 0% / 0% / 0% | 0.8 / 0.4 / 0.1 / 0.0 | 536 / 658 / 725 / 712 | 2063 / 2371 / 2558 / 2540 |
| gravel kings | drums | avg | 0% / 7% / 0% / 0% | 0.9 / 0.2 / 0.0 / 0.0 | 704 / 696 / 825 / 821 | 3227 / 3272 / 3200 / 3170 |
| gravel kings | bass | weak | 13% / 3% / 3% / 3% | 0.9 / 0.3 / 0.1 / 0.0 | 520 / 630 / 705 / 824 | 1840 / 1781 / 2225 / 2328 |
| gravel kings | bass | avg | 10% / 3% / 3% / 0% | 0.8 / 0.2 / 0.1 / 0.0 | 593 / 662 / 728 / 836 | 1957 / 3353 / 3271 / 3122 |
| grid road ramblers | drums | weak | 63% / 30% / 7% / 3% | 3.9 / 2.4 / 1.0 / 0.1 | 237 / 358 / 505 / 784 | 810 / 965 / 1172 / 2337 |
| grid road ramblers | drums | avg | 40% / 20% / 3% / 0% | 3.0 / 0.7 / 0.3 / 0.0 | 421 / 515 / 677 / 883 | 1179 / 1856 / 2296 / 3104 |
| grid road ramblers | bass | weak | 60% / 37% / 3% / 0% | 2.1 / 1.9 / 0.6 / 0.0 | 322 / 329 / 535 / 779 | 843 / 1142 / 1407 / 2793 |
| grid road ramblers | bass | avg | 47% / 23% / 0% / 0% | 2.6 / 1.7 / 0.2 / 0.0 | 320 / 476 / 725 / 837 | 1086 / 1673 / 1840 / 2464 |

Frost Heave and Grid Road Ramblers (the gas-heavy home boards) were the worst in the baseline (40-67% year-1 loans); B
brings them to 0-20%.

## 6. Which lever does what (B with one lever put back to base; drums + bass, 40 seeds, 3 years)

| run | drums+bass weak: loan Y1 / broke Y1 / fund Y3 | drums+bass avg: loan Y1 / broke Y1 / fund Y3 | drums h12: loan Y1 / broke Y1 / fund Y3 | net/gig Y1 (drums+bass avg) |
|---|---|---|---|---|
| base | 44% / 3.3 / $1255 | 28% / 1.7 / $2043 | 48% / 3.2 / $1061 | $3 |
| B (all levers) | 5% / 0.8 / $1930 | 4% / 0.8 / $2860 | 5% / 0.9 / $1606 | $23 |
| B - start fund | 9% / 1.9 / $1790 | 5% / 1.2 / $2894 | 10% / 1.4 / $1525 | $25 |
| B - small-room pay | 6% / 0.9 / $1706 | 9% / 1.0 / $2477 | 8% / 1.0 / $1069 | $17 |
| B - era gas | 21% / 1.8 / $1385 | 15% / 1.2 / $2581 | 15% / 1.7 / $1160 | $13 |
| B - exposure gas | 14% / 1.2 / $1687 | 6% / 0.9 / $2470 | 13% / 1.7 / $1188 | $19 |
| B - grade pay | 5% / 0.8 / $1726 | 4% / 0.8 / $2829 | 5% / 0.9 / $1479 | $22 |
| B - gear prices | 5% / 0.8 / $1708 | 4% / 0.8 / $2281 | 5% / 0.9 / $1312 | $23 |
| B with D x1.0 | 5% / 0.8 / $1894 | 4% / 0.8 / $2810 | 5% / 0.9 / $1523 | $23 |

- The gas levers (era gas, then exposure gas) carry most of the year-1 effect; start fund and small-room pay next.
- Grade pay and the gear prices barely move the bot money (bots rarely get S/A or D early and buy gear late): they are
  the "feels fair" and "drums first" levers for a human, and are cheap. Year-3 fund cells swing +-15-20% between these
  runs (seed noise; e.g. "B - gear prices" $2,281 vs B $2,860 for the same early money).
- D x1.0 instead of x0.9 changes nothing measurable for the bots (2% of avg-bot year-1 gigs are D) but stops docking the
  human drummer (the h12 proxy has 39% D grades in year 1).

## 7. Tests that would move (full node suite run in each worktree: `node tests/run.js`)

| test | A | B | C | why / what to do in the build |
|---|---|---|---|---|
| `tests/sim_gig.test.js:742` "1.3.0 fingerprint" (played gigs byte-identical to 1.3.0) | FAIL | FAIL | FAIL | start fund + grade pay change the hashed state; re-pin the fingerprint (and avoid a new result field: reuse one guard flag) |
| `tests/sim_world.test.js:26` "gas from road km" (`max(5, km x 2 x 0.25)`) | FAIL | FAIL | FAIL | exposure gas (all) and era gas (B, C); assert against `world.gasFor` + the exposure rule |
| `tests/sim_world.test.js:54` "flat in range" (Legion $80-120) | pass in this run (the x1.25 range $100-150 still overlaps $80-120) | FAIL ($125) | FAIL ($145) | scale the expected range by `tierPay[1]` |
| `tests/sim_shop.test.js:89` "toms: lane 5 ... fund === 4550" | pass | pass | FAIL | pins the $450 toms price; use the content price |
| `tests/sim_drama.test.js:252` "keeps the cushion [150,100,50]" | pass | pass | FAIL | pins `parentsCushion` 100 |
| `tests/sim_bands.test.js:432` seat leak scan (quick) | FAIL | pass | pass | not a money pin: A's different career path surfaced a latent lead-seat leak, `grid_road_ramblers@lead wrap.warnings.text [old earl: solos]` ("Earl is getting passive-aggressive ... about solos"). A real content leak to fix regardless |

Everything else passed in all three (incl. `content_seats.test.js:214` "the drum prices", which reads the content
prices, and the calendar's NYE x2). Also to regenerate in the build: `plan/balance_*.txt` baselines (tools/balance.js), and
the `tests/sim_seats` live-bot parity is untouched (no chart change).

## 8. Risks

- **Year 3 carries the early money.** B: avg-bot Y3 fund +42% ($2,077 -> $2,958), weak +68%, money in at Y3 +13% (the
  bots hustle less and play/promote more once they aren't broke, so they sign ~2 weeks sooner). Y3 broke weeks and loans
  were already ~0 in the baseline, and Y4-10 are back within noise. If the owner finds year 3 too cushy, the cheapest trims
  are `gasEra.local 0.8 -> 1` and `startFund 400 -> 350` (each one costs some year-1/2 relief; see §6).
- **Bots are not the owner.** The avg bot books by fans and drives far (gas-heavy), so gas levers look strong for bots;
  a player who books nearby paid rooms gains more from small-room pay and grade pay than the tables show. The owner
  playtest (D5 loop) is the real check.
- **Human drummers stay about a grade behind** until the drum chart is looked at (§3). The options fix the money squeeze
  for that player (h12 year-1 loans 48% -> 5% in B), not the cause.
- **Grade pay touches every gig path** (played, Simulate, bots): Simulate stays equal to played (checked: 20/20 rows per
  cell in every option). The result screen must show the bonus and the cut (U1) or "pay feels off" stays.
- **Seat leak scan** can flag latent content leaks whenever careers take a different path (A found one); budget a content
  fix.
- C's `eraUpkeep.signed 30` and `tierPay 2: 1.1` are permanent (not early-only); they are why C's year-3 good-bot fund
  rises +17%.

## 9. Method / reproduce (scratch only)

- Options: `node v14/opt/apply_opt.js <scratch worktree> '<json>'` (exact-string edits; refuses the main repo). Params used:
  A `{"startFund":400,"tierPay":{"1":1.25},"exposureGas":15,"gradePay":{"S":1.15,"A":1.05,"B":1,"C":1,"D":0.95},"gradePayEras":["garage","local"],"gear":{"ride":250}}`;
  B `{"startFund":400,"tierPay":{"1":1.4},"gasEra":{"garage":0.6,"local":0.8},"exposureGas":25,"gradePay":{"S":1.25,"A":1.1,"B":1,"C":1,"D":0.9},"gradePayEras":["garage","local"],"gear":{"ride":200,"pedal":250}}`;
  C `{"startFund":500,"parentsCushion":150,"eraUpkeepSigned":30,"tierPay":{"1":1.6,"2":1.1},"gasEra":{"garage":0.5,"local":0.7},"exposureGas":40,"gradePay":{"S":1.35,"A":1.15,"B":1,"C":1,"D":0.85},"gradePayEras":["garage","local"],"gear":{"toms":350,"ride":200,"pedal":250,"kit1":650}}`
  (multipliers not listed are 1).
- Probes: `v14/opt/fullrun.sh <worktree> <out>` = 4 seats x {weak 3 years; avg + good 6 years} x 40 seeds, drums avg with
  `PERF_DELTA=-12` (h12), drums + bass weak + avg x 30 seeds x 3 other bands; `v14/bp/simprobe.js` (Simulate vs played);
  `tools/balance.js 10 20`; `node tests/run.js`. Ablations: `v14/opt/drive2.js` (drive.js + `OVR_FILE` in-process content
  overrides) on the B worktree.
- Tables: `node v14/opt/cmp.js base=<dir> A=<dir> ...` (env `POOL`, `SEATS`, `STYLES`, `BAND`, `ONLY`, `RIG`); full output
  for all four seats: `v14/opt/tables_all.md`; raw JSONL: `v14/opt/{base,A,B,C}/{hd,xb}/`, `v14/opt/abl/`; 10-year:
  `v14/opt/bal10_*.txt`; suites: `v14/opt/tests_{A,B,C}.txt`.
- Determinism check: the baseline's year 1-3 weeks re-ran byte-identical (2,880/2,880 drum avg weeks).
