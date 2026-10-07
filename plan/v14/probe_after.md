# v1.4 Tuning: re-probe after M1 + M2 + M3 (probe_after)

Branch `v1.4-tuning` at 84e42ed (VERSION 1.4.0.0; M1 "Gigs pay, side jobs less", M2 "Fair grades", M3 jam room $35/wk
until signed). Base = d9411a3 (1.3.1.0 money; no `src/` change since the baseline's fdecb74). Both trees were exported
read-only (`git archive`) to scratch; nothing in `src/` or `content/` was edited. Same drivers, seeds and bot styles as
`plan/v14/probe_baseline.md` (drive.js: seed x 7919, seeds 1-40, Hail Damage, Normal; weak = the avg bot with 20% smart picks
and 50% offer accepts) and the critic's persona driver `plan/v14/human.js`. The base tree reproduces the earlier runs (drive.js careers checked week
by week on sample seeds, the critic's persona files byte for byte), so every pair below is the same seed under the two rule sets. Cells read **base → after**.
Seed noise: a loan share over 40 careers has a standard error of about 8 points near 50%; fund means carry their own ± SE.

## Verdict

1. **Met, year-1 targets:** gig-first drums h12 **55% loans / 4.7 wks < $100** (target ~53% / 4.5: +2 pts, +0.2 wk), bass **45% / 3.3** (~40% / 3.5: loans +5 pts, inside ±8-pt seed noise), Hustle-heavy drums **3% / 0.5**, bass **0% / 0.4** (~0% / 0.5); base 98% / 11.8, 95% / 9.0, 25% / 1.4, 30% / 1.9.
2. **Met, "Drums felt worse":** at equal accuracy drums score +0.4 vs bass (was -1.2, worst cell -3.2 → +1.3), the same grade pays the same on every seat (0 of 397 pairs differ), and a gig-first drummer at bass's level of play borrows no more than bass in year 1 (30% vs 45%); same hands on the ~2x denser chart (h12) still trail (Y3 fund $509 vs $1,470).
3. **Met, gig pay:** a year-1 gig leaves $30-35 in the fund (base $0-6) vs $52 a Hustle block (base $73); year-1 gas -43% to -64%; tier 2 nets more than tier 1 per paid gig in 9 of 9 bot x year rows, but by only +$16 (weak) / +$30 (avg) in year 1.
4. **Met, one watch item, signing:** no pay cliff (gross per gig +1% / -6% across signing; after Local Heroes every early-money factor moves <= 0.011 a week), but net into the fund per gig drops $47-58 at signing (1.3.1: $18-26) as the 1.3 15% commission is no longer masked.
5. **Met (one borderline cell), years 4-10:** pooled Y4-6 fund within ±5% (|z| <= 0.6) in 7 of 8 seat x bot cells, avg rhythm +8% over 80 seeds (z 1.9); Y7-10 -7% to 0%; late gig pay per year -11% to +4%; late loans 0-3% of career-years.
6. **Missed / not targeted:** year 3 is richer for the bots (mean fund -7% to +39%, 11 of 12 cells up, avg bass +39% z 2.5), and the gig-first player who buys gear in week 1 and rents the jam room is still broke in year 3 (P1 45-78% loans; base 73-90%).

## 1. Targets (status.md Addendum 7)

| target (gig-first = P5, never Hustles; Y1 = year 1) | base (1.3.1) | after (1.4) | verdict |
|---|---|---|---|
| Gig-first drums (h12, one grade lower): ~53% loans / 4.5 weeks < $100 | 98% / 11.8 | **55% / 4.7** | met (+2 pts / +0.2 wk, inside seed noise) |
| Gig-first bass: ~40% / 3.5 | 95% / 9.0 | **45% / 3.3** | weeks met; loans +5 pts over (inside the ±8-pt seed noise) |
| Gig-first drums at the same play as bass (M2's promise) | 100% / 10.2 | **30% / 3.3** | drums no longer worse than bass at equal play |
| Hustle-heavy (P0 avg bot) drums / bass: ~0% / 0.5 | 25% / 1.4 · 30% / 1.9 | **3% / 0.5 · 0% / 0.4** | met |
| Same accuracy → same grade and pay on any seat (M2) | drums - bass -1.22 pts, worst -3.2 | **+0.36, worst +1.3; 0 / 397 same-grade pairs paid differently** | met |
| Tier 2 nets >= tier 1 per paid gig | yes (+$60 to +$130) | **yes in 9 / 9 rows (+$16 to +$128)** | met (thin in year 1) |
| No pay cliff at signing | gross +19-20% | **gross +1% / -6% (noise); factors move <= 0.011 a week** | met (net dips with the 1.3 commission, see 7) |
| Years 4-6 unchanged (within seed noise, not richer) | - | **7 / 8 cells within ±5% (|z| <= 0.6); avg rhythm +8% over 80 seeds (z 1.9); Y7-10 -7% to 0%** | met (one borderline cell, not richer in gig pay) |

## 2. Drums vs bass side by side (bot careers, Hail Damage, 40 paired seeds per cell)

| Hail Damage, base → after | drums weak | bass weak | drums avg | bass avg | drums good | bass good |
|---|---|---|---|---|---|---|
| Fund wk 6 (median) | $159 → $271 | $174 → $333 | $177 → $265 | $206 → $311 | $223 → $282 | $220 → $265 |
| Fund end Y1 (median) | $358 → $522 | $276 → $435 | $410 → $590 | $387 → $603 | $677 → $1,087 | $723 → $1,349 |
| Fund end Y1 p10 | $114 → $257 | $99 → $179 | $159 → $220 | $162 → $211 | $396 → $582 | $340 → $793 |
| Fund end Y2 (median) | $764 → $879 | $867 → $837 | $1,031 → $1,061 | $886 → $1,174 | $2,166 → $2,398 | $2,326 → $2,510 |
| Fund end Y3 (median) | $1,067 → $1,259 | $1,386 → $1,504 | $2,160 → $2,257 | $1,858 → $2,739 | $3,466 → $4,766 | $4,102 → $4,469 |
| Weeks < $100 Y1 (of 24) | 4.0 → 0.3 | 2.6 → 0.6 | 1.4 → 0.5 | 1.9 → 0.4 | 0.4 → 0.1 | 0.8 → 0.0 |
| Careers with a loan Y1 | 40% → 5% | 48% → 3% | 25% → 3% | 30% → 0% | 3% → 0% | 18% → 0% |
| Careers with a loan Y2 | 15% → 5% | 10% → 13% | 5% → 3% | 18% → 10% | 3% → 5% | 3% → 3% |
| Careers with a loan Y3 | 8% → 10% | 3% → 3% | 0% → 8% | 5% → 0% | 0% → 0% | 3% → 0% |
| Gigs Y1 | 12.1 → 13.9 | 12.5 → 13.0 | 13.8 → 13.8 | 13.4 → 13.6 | 23.2 → 23.1 | 23.3 → 22.9 |
| Gig pay Y1 (gross) | $548 → $997 | $611 → $833 | $863 → $1,047 | $827 → $1,045 | $2,526 → $3,138 | $2,403 → $3,288 |
| Members' cut Y1 | $183 → $322 | $200 → $278 | $289 → $348 | $278 → $346 | $850 → $1,017 | $791 → $1,066 |
| Gas Y1 | $532 → $270 | $536 → $237 | $474 → $268 | $537 → $255 | $755 → $725 | $886 → $647 |
| Hustle Y1 | $859 → $489 | $820 → $504 | $789 → $488 | $771 → $534 | $371 → $113 | $457 → $104 |
| Hustle blocks Y1 | 12.4 → 9.5 | 11.5 → 9.8 | 10.8 → 9.4 | 10.7 → 10.0 | 4.8 → 2.0 | 6.0 → 1.9 |
| Unpaid (exposure) gigs Y1 | 60% → 55% | 58% → 58% | 53% → 55% | 55% → 54% | 44% → 41% | 45% → 41% |
| Net per gig Y1 (mean, before merch) | -$14 → $29 | -$11 → $24 | $6 → $30 | $0 → $31 | $38 → $56 | $29 → $65 |
| Gear+kit spent Y1-Y2 | $215 → $300 | $224 → $225 | $360 → $420 | $378 → $568 | $2,131 → $2,245 | $2,081 → $2,380 |

- The early squeeze is gone for every bot on both seats: year-1 loans 25-48% → 0-10% (avg), 40-65% → 3-13% (weak); weeks under
  $100 in year 1 0.0-0.6; the median fund at week 6 is $256-333 (was $137-223). All four seats in C1/C2 (section 5).
- Gas carries most of it: year-1 gas -43% to -64% for the weak and avg bots on all four seats (half price in the garage era, open
  mics cover $40); gig pay +17% to +82%; Hustle pay -31% to -47% (weak/avg) and -70% to -77% (good: drums and bass good bots now
  Hustle 1.9-2.0 blocks a year, was 4.8-6.0). Seat detail in C3 (section 5).
- No seat penalty in the bots (they can't see the chart); section 4 checks the played gig.

## 3. The gig-first persona (human.js; Hail Damage, 40 seeds, 3 years)

P5 = the avg bot that never Hustles (rehearses instead); P0 = the avg bot (Hustles); P1 = P5 + buys the next lane/pedal item
when fund - price >= $100 + moves into the jam room with a $250 fund; P2 = P0 + eager gear + jam room; P4 = P0 + jam room only.
"one grade lower (PERF -12)" = the critic's h12 drummer (gig performance -12 points, about one grade: a human hitting fewer of
the ~2x denser drum notes); "same play as bass" = the drum seat with no shift (what M2 gives at equal accuracy).

### 3a. Year 1

| persona | seat | Y1 loan share (loans/career) | Y1 weeks < $100 (of 24) | owner target (Y1) | Y1 fund median | Y1 lowest fund median | Y1 gigs | Y1 net $/gig | Y1 grades S/A/B/C/D % |
|---|---|---|---|---|---|---|---|---|---|
| P5 gig-first (never Hustles) | drums, one grade lower (PERF -12) | 98% (3.5) → 55% (0.8) | 11.8 → 4.7 | ~53% / 4.5 | $100 → $195 | $6 → $31 | 11.8 → 13.2 | -$3 → $33 | 0/0/17/59/24 → 0/0/22/57/21 |
| P5 gig-first (never Hustles) | drums, same play as bass | 100% (2.6) → 30% (0.5) | 10.2 → 3.3 |  | $107 → $299 | $9 → $44 | 13.0 → 14.0 | $19 → $50 | 1/17/55/28/0 → 0/18/57/24/1 |
| P5 gig-first (never Hustles) | bass | 95% (2.5) → 45% (0.6) | 9.0 → 3.3 | ~40% / 3.5 | $153 → $295 | $7 → $44 | 12.5 → 13.7 | $20 → $51 | 0/13/55/31/1 → 0/16/54/29/0 |
| P5 gig-first (never Hustles) | rhythm | 93% (2.7) → 40% (0.6) | 9.3 → 3.8 |  | $117 → $325 | $9 → $48 | 12.3 → 13.4 | $15 → $49 | 0/14/54/32/0 → 0/17/57/25/0 |
| P5 gig-first (never Hustles) | lead | 98% (2.8) → 53% (0.9) | 8.4 → 3.7 |  | $187 → $255 | $9 → $40 | 13.1 → 13.9 | $20 → $46 | 1/16/54/28/1 → 0/16/56/27/1 |
| P0 avg bot (Hustles) | drums, one grade lower (PERF -12) | 48% (0.8) → 3% (0.0) | 3.2 → 0.8 |  | $244 → $494 | $46 → $187 | 13.4 → 14.4 | -$8 → $35 | 0/0/9/51/39 → 0/1/8/55/36 |
| P0 avg bot (Hustles) | drums, same play as bass | 25% (0.4) → 3% (0.0) | 1.4 → 0.5 | ~0% / 0.5 | $410 → $590 | $83 → $191 | 13.8 → 13.8 | $14 → $39 | 0/6/47/46/1 → 0/8/52/38/2 |
| P0 avg bot (Hustles) | bass | 30% (0.4) → 0% (0.0) | 1.9 → 0.4 | ~0% / 0.5 | $387 → $603 | $74 → $216 | 13.4 → 13.6 | $8 → $40 | 0/8/45/45/2 → 0/12/45/42/1 |
| P0 avg bot (Hustles) | rhythm | 38% (0.6) → 0% (0.0) | 2.2 → 0.1 |  | $345 → $584 | $74 → $223 | 13.7 → 14.0 | $13 → $39 | 0/6/49/44/1 → 0/7/50/41/2 |
| P0 avg bot (Hustles) | lead | 48% (0.7) → 10% (0.1) | 2.6 → 0.5 |  | $457 → $603 | $48 → $128 | 14.0 → 14.3 | $9 → $42 | 0/6/45/47/3 → 0/8/50/40/2 |
| P1 gig-first + eager gear + jam room | drums, one grade lower (PERF -12) | 100% (3.5) → 90% (2.2) | 11.9 → 9.8 |  | $98 → $116 | $6 → $8 | 11.8 → 12.6 | -$3 → $27 | 0/0/17/58/24 → 0/1/15/60/24 |
| P1 gig-first + eager gear + jam room | drums, same play as bass | 98% (2.7) → 88% (1.8) | 10.6 → 6.9 |  | $100 → $197 | $9 → $10 | 13.2 → 13.7 | $27 → $50 | 1/18/54/28/0 → 0/13/55/31/1 |
| P1 gig-first + eager gear + jam room | bass | 95% (2.7) → 88% (1.5) | 9.7 → 7.4 |  | $100 → $214 | $5 → $12 | 12.7 → 13.0 | $27 → $58 | 0/15/53/31/1 → 0/16/53/31/0 |
| P2 Hustles + eager gear + jam room | drums, one grade lower (PERF -12) | 57% (1.0) → 15% (0.2) | 4.1 → 3.6 |  | $197 → $243 | $32 → $59 | 13.7 → 13.2 | -$8 → $24 | 0/0/9/53/39 → 0/0/4/50/46 |
| P2 Hustles + eager gear + jam room | bass | 48% (0.7) → 10% (0.2) | 3.0 → 2.7 |  | $245 → $304 | $46 → $63 | 14.0 → 14.1 | $16 → $46 | 0/7/42/48/2 → 0/5/46/47/2 |
| P4 jam room only | drums, one grade lower (PERF -12) | 48% (0.8) → 3% (0.0) | 3.1 → 0.8 |  | $263 → $467 | $46 → $187 | 13.3 → 14.4 | -$8 → $35 | 0/0/9/51/39 → 0/1/8/55/36 |
| P4 jam room only | bass | 28% (0.4) → 0% (0.0) | 2.0 → 0.5 |  | $361 → $456 | $76 → $209 | 13.7 → 13.6 | $14 → $40 | 0/8/45/46/2 → 0/11/46/42/1 |

### 3b. Years 2-3 (jam room, gear, signing)

| persona | seat | Y2 loan share | Y2 weeks < $100 | Y3 loan share | Y3 weeks < $100 | Y2 fund median | Y3 fund median | jam-room weeks Y2 / Y3 | evictions Y1-3 | first gear (median wk) | signed (median wk, share) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P5 gig-first (never Hustles) | drums, one grade lower (PERF -12) | 80% → 60% | 5.9 → 3.5 | 60% → 43% | 3.0 → 1.7 | $207 → $441 | $603 → $509 | 0.0 / 0.0 → 0.2 / 0.6 | 0.00 → 0.00 | - → - | wk 55 (83%) → wk 49 (90%) |
| P5 gig-first (never Hustles) | drums, same play as bass | 40% → 33% | 3.3 → 1.4 | 30% → 33% | 1.0 → 0.8 | $610 → $707 | $949 → $1,605 | 0.0 / 0.0 → 0.5 / 1.2 | 0.00 → 0.00 | - → - | wk 45 (100%) → wk 41 (98%) |
| P5 gig-first (never Hustles) | bass | 70% → 40% | 3.0 → 1.7 | 20% → 20% | 0.4 → 0.6 | $665 → $854 | $913 → $1,470 | 0.0 / 0.0 → 1.1 / 1.9 | 0.00 → 0.00 | - → - | wk 41 (98%) → wk 38 (95%) |
| P5 gig-first (never Hustles) | rhythm | 65% → 20% | 2.5 → 0.9 | 20% → 8% | 0.4 → 0.3 | $644 → $914 | $937 → $2,214 | 0.0 / 0.0 → 0.4 / 1.4 | 0.00 → 0.00 | - → - | wk 46 (98%) → wk 39 (98%) |
| P5 gig-first (never Hustles) | lead | 45% → 23% | 2.2 → 1.2 | 25% → 18% | 0.5 → 0.4 | $539 → $1,085 | $1,287 → $1,846 | 0.0 / 0.0 → 0.6 / 1.4 | 0.00 → 0.00 | - → - | wk 42 (98%) → wk 40 (100%) |
| P0 avg bot (Hustles) | drums, one grade lower (PERF -12) | 28% → 5% | 1.2 → 0.3 | 18% → 10% | 0.3 → 0.3 | $632 → $944 | $1,061 → $1,903 | 0.0 / 0.3 → 2.5 / 2.5 | 0.00 → 0.00 | - → - | wk 49 (78%) → wk 52 (95%) |
| P0 avg bot (Hustles) | drums, same play as bass | 5% → 3% | 0.4 → 0.3 | 0% → 8% | 0.0 → 0.1 | $1,031 → $1,061 | $2,160 → $2,257 | 0.1 / 0.8 → 1.8 / 2.1 | 0.00 → 0.00 | - → - | wk 48 (95%) → wk 42 (95%) |
| P0 avg bot (Hustles) | bass | 18% → 10% | 0.5 → 0.3 | 5% → 0% | 0.1 → 0.1 | $886 → $1,174 | $1,858 → $2,739 | 0.1 / 1.4 → 1.2 / 1.4 | 0.00 → 0.00 | - → - | wk 39 (98%) → wk 39 (95%) |
| P0 avg bot (Hustles) | rhythm | 18% → 10% | 0.7 → 0.1 | 5% → 5% | 0.3 → 0.1 | $976 → $1,207 | $2,064 → $2,649 | 0.0 / 0.1 → 1.1 / 1.8 | 0.00 → 0.00 | - → - | wk 47 (95%) → wk 41 (100%) |
| P0 avg bot (Hustles) | lead | 8% → 5% | 0.4 → 0.1 | 3% → 0% | 0.0 → 0.0 | $1,212 → $1,506 | $2,346 → $2,967 | 0.1 / 1.5 → 0.8 / 1.3 | 0.00 → 0.00 | - → - | wk 39 (93%) → wk 39 (100%) |
| P1 gig-first + eager gear + jam room | drums, one grade lower (PERF -12) | 95% → 88% | 7.4 → 5.5 | 90% → 78% | 5.4 → 3.4 | $184 → $189 | $206 → $415 | 7.3 / 12.3 → 11.7 / 17.5 | 2.48 → 1.70 | wk 38 (98%) → wk 1 (100%) | wk 55 (57%) → wk 54 (55%) |
| P1 gig-first + eager gear + jam room | drums, same play as bass | 85% → 70% | 5.3 → 3.3 | 73% → 55% | 2.6 → 1.7 | $204 → $547 | $508 → $735 | 12.0 / 18.6 → 17.5 / 20.0 | 2.17 → 1.25 | wk 32 (100%) → wk 1 (100%) | wk 43 (93%) → wk 42 (98%) |
| P1 gig-first + eager gear + jam room | bass | 95% → 70% | 5.4 → 3.4 | 75% → 45% | 3.1 → 1.5 | $336 → $479 | $535 → $862 | 12.4 / 17.0 → 18.1 / 20.9 | 2.73 → 1.32 | wk 30 (100%) → wk 1 (100%) | wk 41 (98%) → wk 44 (95%) |
| P2 Hustles + eager gear + jam room | drums, one grade lower (PERF -12) | 50% → 18% | 2.0 → 1.6 | 57% → 40% | 2.2 → 1.5 | $251 → $328 | $594 → $559 | 15.5 / 19.0 → 17.2 / 21.8 | 1.30 → 0.40 | wk 25 (100%) → wk 1 (100%) | wk 62 (53%) → wk 60 (48%) |
| P2 Hustles + eager gear + jam room | bass | 35% → 13% | 1.2 → 0.6 | 15% → 8% | 0.4 → 0.1 | $561 → $767 | $1,061 → $1,175 | 20.7 / 23.3 → 22.7 / 24.0 | 0.60 → 0.13 | wk 16 (100%) → wk 1 (100%) | wk 50 (93%) → wk 48 (100%) |
| P4 jam room only | drums, one grade lower (PERF -12) | 33% → 3% | 1.1 → 0.4 | 28% → 10% | 0.9 → 0.6 | $453 → $625 | $633 → $867 | 18.4 / 22.0 → 21.0 / 23.5 | 0.70 → 0.15 | - → - | wk 55 (55%) → wk 50 (85%) |
| P4 jam room only | bass | 20% → 10% | 0.7 → 0.5 | 10% → 10% | 0.2 → 0.1 | $705 → $891 | $902 → $976 | 22.0 / 23.8 → 23.5 / 23.7 | 0.38 → 0.10 | - → - | wk 42 (93%) → wk 47 (98%) |

- Year 1, gig-first: drums h12 **55% / 4.7** (target ~53% / 4.5), bass **45% / 3.3** (target ~40% / 3.5); drums at the same play
  as bass **30% / 3.3** (base 100% / 10.2); rhythm 40% / 3.8, lead 53% / 3.7 (base 93-98% / 8.4-9.3).
- Hustle-heavy (P0): drums 3% / 0.5, bass 0% / 0.4 (target ~0% / 0.5); rhythm 0% / 0.1, lead 10% / 0.5.
- Year 3 stays tight for the h12 drummer who never Hustles: 43% loans (base 60%), median fund $509 (base $603).

## 4. M2 "Fair grades": the same accuracy gives the same grade and pay on every seat

Played gig (`gig.botPlay` at the Legion, fresh garage career), 12 paired seeds per cell, the same tap chance and 40 ms jitter
on all four seats, pay settled through `gig.applyResult` (the v1.4 grade pay included). `bin/fair2.js` + `bin/fsum.js`.

| difficulty | tap chance | hit share drums / bass | score drums / bass / rhythm / lead (base) | (after) | drums - bass base → after | same grade as bass: drums / rhythm / lead (base → after) | mean pay drums / bass (base → after) |
|---|---|---|---|---|---|---|---|
| easy | 0.6 | 0.616 / 0.612 | 50.2 / 52.1 / 51.9 / 53.0 | 52.7 / 52.1 / 51.9 / 53.0 | -1.9 → 0.6 | 75% → 67% / 92% → 92% / 67% → 67% | $80 / $80 → $130 / $131 |
| easy | 0.72 | 0.740 / 0.745 | 62.6 / 65.8 / 65.8 / 65.7 | 65.9 / 65.8 / 65.8 / 65.7 | -3.2 → 0.1 | 75% → 100% / 67% → 67% / 100% → 100% | $80 / $80 → $137 / $137 |
| easy | 0.84 | 0.844 / 0.850 | 74.1 / 76.3 / 75.9 / 76.5 | 76.6 / 76.3 / 75.9 / 76.5 | -2.3 → 0.3 | 92% → 92% / 100% → 100% / 100% → 100% | $80 / $80 → $143 / $145 |
| easy | 0.94 | 0.944 / 0.942 | 84.3 / 84.7 / 84.4 / 84.5 | 85.1 / 84.7 / 84.4 / 84.5 | -0.3 → 0.4 | 100% → 100% / 100% → 100% / 100% → 100% | $80 / $80 → $163 / $163 |
| normal | 0.6 | 0.612 / 0.608 | 45.1 / 46.4 / 46.5 / 46.8 | 46.9 / 46.4 / 46.5 / 46.8 | -1.3 → 0.5 | 83% → 83% / 92% → 92% / 100% → 100% | $80 / $80 → $130 / $130 |
| normal | 0.72 | 0.735 / 0.738 | 58.1 / 60.0 / 60.4 / 60.5 | 60.2 / 60.0 / 60.4 / 60.5 | -1.9 → 0.2 | 75% → 100% / 100% → 100% / 100% → 100% | $80 / $80 → $133 / $133 |
| normal | 0.84 | 0.845 / 0.846 | 70.8 / 72.4 / 72.3 / 72.1 | 73.1 / 72.4 / 72.3 / 72.1 | -1.7 → 0.7 | 100% → 100% / 100% → 100% / 100% → 100% | $80 / $80 → $143 / $143 |
| normal | 0.94 | 0.942 / 0.940 | 82.5 / 82.3 / 82.5 / 82.8 | 83.3 / 82.3 / 82.5 / 82.8 | 0.2 → 1.0 | 92% → 92% / 92% → 92% / 92% → 92% | $80 / $80 → $163 / $161 |
| hard | 0.6 | 0.610 / 0.608 | 42.6 / 43.3 / 43.5 / 43.8 | 42.9 / 43.3 / 43.5 / 43.8 | -0.7 → -0.3 | 92% → 92% / 100% → 100% / 100% → 100% | $80 / $80 → $130 / $130 |
| hard | 0.72 | 0.731 / 0.739 | 54.8 / 56.3 / 56.8 / 56.3 | 55.8 / 56.3 / 56.8 / 56.3 | -1.5 → -0.5 | 75% → 75% / 83% → 83% / 75% → 75% | $80 / $80 → $130 / $132 |
| hard | 0.84 | 0.843 / 0.845 | 67.8 / 68.6 / 68.7 / 68.7 | 68.8 / 68.6 / 68.7 / 68.7 | -0.8 → 0.3 | 92% → 100% / 100% → 100% / 100% → 100% | $80 / $80 → $143 / $143 |
| hard | 0.94 | 0.940 / 0.940 | 80.8 / 80.0 / 80.3 / 80.6 | 81.3 / 80.0 / 80.3 / 80.6 | 0.8 → 1.3 | 67% → 67% / 92% → 92% / 92% → 92% | $80 / $80 → $161 / $158 |
- base: mean (drums - bass) -1.22, mean |drums - bass| 1.39, worst -3.2, same grade as bass: drums 85% rhythm 93% lead 94%, mean pay drums - bass $0.0, same-grade pairs with different pay: 0 / 391
- after: mean (drums - bass) 0.36, mean |drums - bass| 0.50, worst 1.3, same grade as bass: drums 89% rhythm 93% lead 94%, mean pay drums - bass $0.0, same-grade pairs with different pay: 0 / 397

- Drums - bass gig score: mean -1.22 → +0.36, mean |gap| 1.39 → 0.50, worst cell -3.2 (Easy 72%) → +1.3 (Hard 94%). The hit
  share at one tap chance is the same on both seats (column 3), so this is equal accuracy.
- Same grade as bass (paired seed): drums 85% → 89%, rhythm 93%, lead 94% (unchanged; the misses sit on a grade line).
- Same grade → same pay on every seat: 0 of 397 same-grade pairs pay differently (base 0 of 391). 1.3.1 paid $80 at any grade;
  1.4 pays the Legion's $130 at B, $143 at A, $161-163 at S in the garage era.
- Bot careers can't show M2 (they resolve gigs with stats only). The drum chart is still ~2x denser (charts unchanged by the
  pick): the same hands still hit a smaller share on drums, which is what the h12 rows model.

## 5. Bot probes, all four seats (years 1-3, quarters of year 1)

### C1. Band fund at the end of each period, median $ (base → after)
| seat | bot | Y1 Q1 (wk 6) | Y1 Q2 (wk 12) | Y1 Q3 (wk 18) | Y1 end | Y2 end | Y3 end |
|---|---|---|---|---|---|---|---|
| drums | weak | 159 → 271 | 211 → 370 | 255 → 409 | 358 → 522 | 764 → 879 | 1067 → 1259 |
| bass | weak | 174 → 333 | 291 → 425 | 264 → 492 | 276 → 435 | 867 → 837 | 1386 → 1504 |
| rhythm | weak | 154 → 333 | 224 → 434 | 204 → 433 | 285 → 489 | 624 → 795 | 938 → 1079 |
| lead | weak | 137 → 292 | 223 → 419 | 219 → 404 | 281 → 445 | 733 → 859 | 979 → 1364 |
| drums | avg | 177 → 265 | 339 → 416 | 375 → 522 | 410 → 590 | 1031 → 1061 | 2160 → 2257 |
| bass | avg | 206 → 311 | 289 → 428 | 294 → 559 | 387 → 603 | 886 → 1174 | 1858 → 2739 |
| rhythm | avg | 201 → 328 | 271 → 444 | 276 → 517 | 345 → 584 | 976 → 1207 | 2064 → 2649 |
| lead | avg | 154 → 281 | 255 → 362 | 332 → 378 | 457 → 603 | 1212 → 1506 | 2346 → 2967 |
| drums | good | 223 → 282 | 414 → 652 | 642 → 778 | 677 → 1087 | 2166 → 2398 | 3466 → 4766 |
| bass | good | 220 → 265 | 370 → 725 | 450 → 834 | 723 → 1349 | 2326 → 2510 | 4102 → 4469 |
| rhythm | good | 217 → 261 | 365 → 605 | 541 → 786 | 687 → 1068 | 2500 → 2524 | 4125 → 4182 |
| lead | good | 215 → 256 | 385 → 704 | 561 → 884 | 887 → 1184 | 2206 → 2371 | 3704 → 4264 |

### C2. Weeks under $100 (mean per career) by quarter and year, and parents' loans (% of careers), base → after
| seat | bot | Q1 | Q2 | Q3 | Q4 | Y1 (of 24) | Y2 | Y3 | loan Y1 | loan Y2 | loan Y3 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| drums | weak | 1.0 → 0.1 | 1.4 → 0.1 | 0.8 → 0.1 | 0.8 → 0.0 | 4.0 → 0.3 | 0.6 → 0.2 | 0.2 → 0.2 | 40% → 5% | 15% → 5% | 8% → 10% |
| bass | weak | 0.9 → 0.1 | 0.7 → 0.2 | 0.6 → 0.1 | 0.5 → 0.2 | 2.6 → 0.6 | 0.8 → 0.5 | 0.1 → 0.1 | 48% → 3% | 10% → 13% | 3% → 3% |
| rhythm | weak | 0.8 → 0.0 | 1.2 → 0.0 | 0.9 → 0.2 | 0.9 → 0.1 | 3.7 → 0.3 | 0.8 → 0.3 | 0.1 → 0.1 | 45% → 3% | 20% → 5% | 5% → 10% |
| lead | weak | 0.8 → 0.0 | 1.1 → 0.2 | 0.9 → 0.4 | 0.8 → 0.1 | 3.6 → 0.6 | 0.8 → 0.3 | 0.1 → 0.0 | 65% → 13% | 20% → 5% | 3% → 0% |
| drums | avg | 0.6 → 0.1 | 0.6 → 0.3 | 0.1 → 0.1 | 0.1 → 0.1 | 1.4 → 0.5 | 0.4 → 0.3 | 0.0 → 0.1 | 25% → 3% | 5% → 3% | 0% → 8% |
| bass | avg | 0.6 → 0.1 | 0.6 → 0.2 | 0.5 → 0.1 | 0.3 → 0.1 | 1.9 → 0.4 | 0.5 → 0.3 | 0.1 → 0.1 | 30% → 0% | 18% → 10% | 5% → 0% |
| rhythm | avg | 0.5 → 0.0 | 0.7 → 0.1 | 0.5 → 0.0 | 0.5 → 0.0 | 2.2 → 0.1 | 0.7 → 0.1 | 0.3 → 0.1 | 38% → 0% | 18% → 10% | 5% → 5% |
| lead | avg | 0.8 → 0.1 | 0.9 → 0.1 | 0.5 → 0.2 | 0.4 → 0.1 | 2.6 → 0.5 | 0.4 → 0.1 | 0.0 → 0.0 | 48% → 10% | 8% → 5% | 3% → 0% |
| drums | good | 0.2 → 0.1 | 0.1 → 0.0 | 0.0 → 0.0 | 0.0 → 0.0 | 0.4 → 0.1 | 0.0 → 0.1 | 0.0 → 0.0 | 3% → 0% | 3% → 5% | 0% → 0% |
| bass | good | 0.3 → 0.0 | 0.3 → 0.0 | 0.2 → 0.0 | 0.0 → 0.0 | 0.8 → 0.0 | 0.0 → 0.0 | 0.0 → 0.0 | 18% → 0% | 3% → 3% | 3% → 0% |
| rhythm | good | 0.2 → 0.0 | 0.2 → 0.0 | 0.2 → 0.0 | 0.1 → 0.0 | 0.7 → 0.0 | 0.1 → 0.0 | 0.0 → 0.0 | 5% → 3% | 3% → 3% | 5% → 0% |
| lead | good | 0.4 → 0.0 | 0.2 → 0.0 | 0.1 → 0.0 | 0.0 → 0.0 | 0.6 → 0.0 | 0.0 → 0.0 | 0.0 → 0.0 | 8% → 3% | 0% → 3% | 0% → 3% |

### C3. Year 1 by quarter (mean $ per career, base → after): fund change (money in - out, loans excluded), gig pay, Hustle pay
| seat | bot | Q1 net | Q2 net | Q3 net | Q4 net | Q1 gig pay | Q1 hustle | Y1 gig pay | Y1 hustle | Y1 cut | Y1 gas |
|---|---|---|---|---|---|---|---|---|---|---|---|
| drums | weak | -$154 → -$177 | $69 → $134 | -$11 → $42 | $64 → $75 | $25 → $41 | $226 → $123 | $548 → $997 | $859 → $489 | $183 → $322 | $532 → $270 |
| bass | weak | -$116 → -$141 | $60 → $103 | -$47 → $68 | -$10 → $6 | $19 → $23 | $239 → $142 | $611 → $833 | $820 → $504 | $200 → $278 | $536 → $237 |
| rhythm | weak | -$137 → -$128 | $58 → $127 | -$39 → $11 | $37 → $18 | $16 → $25 | $211 → $136 | $718 → $843 | $815 → $492 | $250 → $276 | $629 → $227 |
| lead | weak | -$162 → -$151 | $15 → $100 | -$52 → $12 | $68 → $66 | $18 → $41 | $219 → $129 | $650 → $928 | $885 → $467 | $223 → $322 | $610 → $240 |
| drums | avg | -$109 → -$161 | $150 → $147 | $29 → $88 | $50 → $45 | $27 → $39 | $220 → $127 | $863 → $1,047 | $789 → $488 | $289 → $348 | $474 → $268 |
| bass | avg | -$111 → -$136 | $75 → $131 | $15 → $81 | $67 → $98 | $10 → $24 | $207 → $128 | $827 → $1,045 | $771 → $534 | $278 → $346 | $537 → $255 |
| rhythm | avg | -$110 → -$128 | $87 → $107 | -$4 → $112 | $120 → $49 | $23 → $32 | $205 → $136 | $874 → $1,030 | $784 → $527 | $306 → $337 | $527 → $242 |
| lead | avg | -$153 → -$161 | $77 → $89 | $39 → $42 | $113 → $123 | $20 → $40 | $213 → $125 | $923 → $1,138 | $826 → $480 | $296 → $371 | $561 → $261 |
| drums | good | -$57 → -$176 | $231 → $394 | $165 → $110 | $202 → $327 | $63 → $148 | $196 → $39 | $2,526 → $3,138 | $371 → $113 | $850 → $1,017 | $755 → $725 |
| bass | good | -$89 → -$168 | $162 → $429 | $80 → $142 | $258 → $387 | $45 → $136 | $212 → $46 | $2,403 → $3,288 | $457 → $104 | $791 → $1,066 | $886 → $647 |
| rhythm | good | -$84 → -$174 | $227 → $372 | $113 → $162 | $164 → $261 | $45 → $143 | $202 → $38 | $2,315 → $3,137 | $457 → $115 | $769 → $1,014 | $850 → $641 |
| lead | good | -$97 → -$177 | $247 → $428 | $109 → $168 | $335 → $304 | $54 → $134 | $212 → $34 | $2,385 → $3,324 | $463 → $108 | $783 → $1,068 | $812 → $651 |

- Q1 still loses money (-$128 to -$177 per career; the good bots spend on merch and gear sooner), but from the $450 start the
  week-6 fund is higher than base in every cell; Q2-Q4 are positive in every cell (smallest: bass weak Q4 +$6).

### C4. What one block earns (mean per career-year, base → after): a Hustle block vs one gig (net to the fund, merch excluded)
gig net = pay - members' cut - gas - fill-ins - commission - crew - tow.
| bot | year | drums: $/Hustle block | drums: net $/gig | drums: gigs | bass: $/Hustle block | bass: net $/gig | bass: gigs | rhythm net $/gig | lead net $/gig |
|---|---|---|---|---|---|---|---|---|---|
| weak | Y1 | $69 → $51 | -$14 → $29 | 12.1 → 13.9 | $71 → $51 | -$11 → $24 | 12.5 → 13.0 | -$13 → $25 | -$15 → $27 |
| weak | Y2 | $96 → $85 | $36 → $39 | 12.1 → 12.2 | $101 → $87 | $38 → $34 | 12.6 → 12.9 | $20 → $36 | $27 → $31 |
| weak | Y3 | $138 → $137 | $40 → $8 | 11.7 → 11.2 | $145 → $141 | $20 → $48 | 11.9 → 11.2 | $29 → $30 | -$1 → $52 |
| avg | Y1 | $73 → $52 | $6 → $30 | 13.8 → 13.8 | $72 → $53 | $0 → $31 | 13.4 → 13.6 | $3 → $32 | $4 → $35 |
| avg | Y2 | $112 → $98 | $52 → $45 | 12.5 → 12.9 | $110 → $95 | $33 → $62 | 13.2 → 12.6 | $38 → $57 | $48 → $47 |
| avg | Y3 | $141 → $146 | $48 → $59 | 12.0 → 13.0 | $146 → $147 | $31 → $67 | 12.2 → 12.7 | $34 → $49 | $61 → $78 |
| good | Y1 | $78 → $56 | $38 → $56 | 23.2 → 23.1 | $76 → $56 | $29 → $65 | 23.3 → 22.9 | $28 → $61 | $32 → $67 |
| good | Y2 | $137 → $130 | $83 → $93 | 20.3 → 20.6 | $164 → $157 | $82 → $101 | 20.5 → 20.4 | $86 → $107 | $82 → $102 |
| good | Y3 | $154 → $164 | $181 → $192 | 20.7 → 20.6 | $166 → $170 | $187 → $198 | 20.7 → 20.8 | $150 → $191 | $178 → $203 |

- Year 1, avg bot: a gig now leaves $30-35 in the fund (base $0-6), a Hustle block $52-53 (base $72-74): the gap per block closed
  from ~$70 to ~$20 (fans and rep come on top of the gig). Years 2-3 are within a few dollars of base.

## 6. Net per gig by venue tier (tier 2 >= tier 1)

### C5. Pay and net per gig by venue tier (all four seats pooled; paid gigs only = deal paid > $0; base → after)
net = pay - members' cut - gas - fill-ins - commission - crew - tow. "all" = every gig incl. exposure / unpaid.
| bot | year | T1 paid n | T1 pay mean | T1 net mean (median) | T2 paid n | T2 pay mean | T2 net mean (median) | T3 net mean (n) | T1 net, all gigs | T2 net, all gigs | T2 - T1 net (paid, mean) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| weak | Y1 | 557 → 586 | $105 → $155 | $21 ($51) → $77 ($86) | 251 → 311 | $169 → $172 | $81 ($100) → $92 ($107) | - → - | -$24 → $20 | $32 → $51 | $60 → $16 |
| weak | Y2 | 327 → 343 | $112 → $157 | $9 ($54) → $35 ($75) | 1110 → 1071 | $274 → $288 | $94 ($104) → $95 ($105) | -$171 (3) → -$91 (10) | -$38 → -$16 | $64 → $64 | $85 → $60 |
| weak | Y3 | 198 → 190 | $110 → $157 | -$20 ($36) → $2 ($60) | 1027 → 971 | $344 → $344 | $61 ($94) → $63 ($88) | $175 (161) → $203 (213) | -$51 → -$40 | $30 → $32 | $81 → $60 |
| avg | Y1 | 574 → 569 | $108 → $153 | $27 ($58) → $75 ($87) | 431 → 442 | $180 → $189 | $95 ($107) → $105 ($114) | - → - | -$16 → $19 | $56 → $66 | $68 → $30 |
| avg | Y2 | 320 → 325 | $111 → $152 | $2 ($52) → $37 ($79) | 1260 → 1187 | $301 → $313 | $105 ($114) → $110 ($107) | $116 (18) → $140 (27) | -$40 → -$8 | $75 → $78 | $103 → $73 |
| avg | Y3 | 224 → 194 | $111 → $156 | -$18 ($41) → $0 ($60) | 1025 → 1077 | $365 → $361 | $78 ($105) → $91 ($107) | $211 (273) → $224 (299) | -$54 → -$28 | $43 → $57 | $95 → $90 |
| good | Y1 | 743 → 755 | $110 → $155 | $36 ($61) → $80 ($99) | 1304 → 1448 | $232 → $275 | $118 ($117) → $142 ($128) | - → - | -$8 → $22 | $84 → $105 | $82 → $61 |
| good | Y2 | 244 → 236 | $113 → $156 | $1 ($53) → $13 ($71) | 1932 → 1824 | $379 → $412 | $127 ($129) → $141 ($146) | $238 (476) → $249 (573) | -$49 → -$30 | $83 → $93 | $126 → $128 |
| good | Y3 | 242 → 245 | $117 → $153 | $7 ($54) → $23 ($70) | 1254 → 1226 | $424 → $446 | $137 ($149) → $128 ($146) | $387 (1276) → $420 (1358) | -$57 → -$33 | $75 → $66 | $130 → $105 |

- Tier 2 nets more than tier 1 per paid gig in all 9 bot x year rows (after: +$16 to +$128), and on all gigs incl. exposure.
  The margin is thinner in year 1 (weak +$60 → +$16, avg +$68 → +$30) because small rooms pay ~x1.4 (T1 mean gross $105-117 →
  $152-157) and tier-2 rooms are farther away (gas). The listing-level rule (every tier-1 ceiling <= every tier-2 floor per
  deal) is pinned in tests/sim_money.

## 7. Pay across the signing week (no cliff)

Early-money factors in real bot careers (`bin/sigprobe.js`, 4 seats x 40 seeds; the week before vs the first week of the event):

| bot | event | careers | earlyMoney wk -1 → 0 (mean) | gas factor wk -1 → 0 | S pay factor wk -1 → 0 | A pay factor wk -1 → 0 | Hustle era factor wk -1 → 0 | jam-room price wk -1 → 0 | largest 1-week change in gas / S factor (any career) |
|---|---|---|---|---|---|---|---|---|---|
| good | Local Heroes (era garage → local) | 160 | 1.00 → 0.96 | 0.50 → 0.81 | 1.25 → 1.24 | 1.10 → 1.10 | 0.70 → 1.00 | $0 → $0 | 0.308 / 0.010 |
| good | signing (first week signed) | 160 | 0.46 → 0.42 | 0.91 → 0.92 | 1.11 → 1.10 | 1.05 → 1.04 | 1.00 → 2.20 | $6 → $11 | 0.008 / 0.011 |
| good | any week after Local Heroes | 160 | | max weekly change 0.0084 | max weekly change 0.0105 | | | | |
| avg | Local Heroes (era garage → local) | 160 | 1.00 → 0.96 | 0.50 → 0.81 | 1.25 → 1.24 | 1.10 → 1.10 | 0.70 → 1.00 | $0 → $0 | 0.308 / 0.010 |
| avg | signing (first week signed) | 156 | 0.22 → 0.19 | 0.96 → 0.96 | 1.05 → 1.05 | 1.02 → 1.02 | 1.00 → 2.20 | $2 → $4 | 0.008 / 0.011 |
| avg | any week after Local Heroes | 160 | | max weekly change 0.0084 | max weekly change 0.0105 | | | | |

### C9. Signing window, pooled: 4 weeks before signing vs the signing week + 3 after (all seats; mean per gig; base → after)
| bot | window | gigs (n) | gross pay | net to fund | change in gross at signing | change in net at signing |
|---|---|---|---|---|---|---|
| avg | weeks -4..-1 | 364 → 353 | $205 → $224 | $55 → $84 |  |  |
| avg | weeks 0..+3 | 312 → 313 | $244 → $227 | $28 → $37 | 19% → 1% (z 2.7 → 0.2) | -$26 → -$47 (z -1.9 → -3.8) |
| good | weeks -4..-1 | 594 → 601 | $209 → $263 | $69 → $107 |  |  |
| good | weeks 0..+3 | 526 → 511 | $250 → $246 | $51 → $49 | 20% → -6% (z 3.3 → -1.2) | -$18 → -$58 (z -1.7 → -5.7) |

Gross pay per gig in 2-week bins around signing (all seats pooled; bins -8/-7 · -6/-5 · -4/-3 · -2/-1 · **0/+1** · +2/+3 · +4/+5 · +6/+7):

| bot | base | after |
|---|---|---|
| avg | $161 · $201 · $200 · $209 · $235 · $254 · $235 · $249 | $208 · $205 · $236 · $212 · $228 · $226 · $235 · $256 |
| good | $190 · $204 · $217 · $201 · $233 · $268 · $281 · $306 | $216 · $230 · $270 · $257 · $252 · $240 · $316 · $317 |

- No cliff in pay: every early-money factor moves at most 0.011 in any week after Local Heroes (the 24-week taper), including the
  signing week; gross pay per gig is flat across signing (+1% avg, -6% good, both within noise) where 1.3.1 rose +19-20%.
- What does drop at signing is the net per gig into the fund (-$47 avg / -$58 good; base -$26 / -$18): the 15% management +
  booking commission ($36-40 a gig, a 1.3 rule, shown on the results screen) is no longer masked by a gross rise, because the
  pre-signing gigs already pay more. Owner check: "Into the fund" shrinks by about a third in the first signed weeks.
- Steps by design: at Local Heroes the gas factor goes 0.50 → 0.81 (garage half price ends) as Hustle goes 0.7 → 1.0; at signing
  the jam room goes $35 → $60 for renters (37 of 316 careers were renting that week; 2 of them moved up to the $150 space).

## 8. Jam-room renters, year-3 loans

Personas P1 / P2 / P4 (table 3b) and the bot careers that rented in year 3:

### C8. Bot careers that rented a jam room / rehearsal space in year 3 (any week): year-3 loans and weeks under $100
| bot | renters (base → after) | Y3 loan share | Y3 weeks < $100 | Y3 rent paid (mean $) | Y3 fund (median) |
|---|---|---|---|---|---|
| weak | 3 → 12 | 0% → 8% | 0.0 → 0.0 | $1,700 → $1,450 | 3367 → 1481 |
| avg | 12 → 14 | 0% → 0% | 0.0 → 0.0 | $1,488 → $1,304 | 3061 → 3325 |
| good | 141 → 156 | 0% → 1% | 0.0 → 0.0 | $1,574 → $1,872 | 4021 → 4414 |

- Year-3 loans: P1 (gig-first + eager gear + jam room) drums h12 90% → 78%, drums 73% → 55%, bass 75% → 45%; P2 (Hustles + gear +
  jam room) drums h12 57% → 40%, bass 15% → 8%; P4 (jam room only) drums h12 28% → 10%, bass 10% → 10%. Evictions per career
  (Y1-3) fall for every renter persona (P1 drums h12 2.48 → 1.70, bass 2.73 → 1.32).
- Bots that rent in year 3 (mostly the good bot) almost never borrow. The squeeze that is left is the gig-first player who buys
  gear in week 1 and rents early: M3 (-$25/wk) helps, it does not fix that persona.

## 9. Years 4-6 and 4-10 (the late game must not get richer)

human.js avg + good bots, 40 seeds, both trees: drums + bass 10 years, rhythm + lead 6 years.

Pooled (mean of the yearly year-end funds per career; z = difference / combined standard error, |z| < 2 = within seed noise):

| bot | seat | years | mean fund base → after (± SE) | change | z | gig pay per year | gigs per year | career-years with a loan |
|---|---|---|---|---|---|---|---|---|
| avg | drums | Y4-6 | $4,425 ± 279 → $4,632 ± 204 | 5% | 0.6 | $7,665 → $7,615 (-1%) | 12.1 → 12.1 | 0% → 3% |
| avg | drums | Y7-10 | $7,415 ± 313 → $7,449 ± 340 | 0% | 0.1 | $14,983 → $14,614 (-2%) | 13.1 → 12.9 | 0% → 0% |
| avg | drums | Y4-10 | $6,134 ± 222 → $6,242 ± 213 | 2% | 0.4 | $11,847 → $11,614 (-2%) | 12.7 → 12.6 | 0% → 1% |
| avg | bass | Y4-6 | $4,403 ± 249 → $4,396 ± 233 | -0% | -0.0 | $7,769 → $8,013 (3%) | 12.2 → 12.4 | 1% → 3% |
| avg | bass | Y7-10 | $6,980 ± 427 → $6,772 ± 378 | -3% | -0.4 | $15,696 → $14,002 (-11%) | 13.3 → 12.9 | 0% → 1% |
| avg | bass | Y4-10 | $5,876 ± 275 → $5,754 ± 246 | -2% | -0.3 | $12,299 → $11,435 (-7%) | 12.8 → 12.7 | 0% → 1% |
| avg | rhythm | Y4-6 | $4,130 ± 180 → $4,710 ± 193 | 14% | 2.2 | $6,947 → $7,059 (2%) | 12.3 → 12.3 | 1% → 2% |
| avg | lead | Y4-6 | $4,926 ± 231 → $4,794 ± 174 | -3% | -0.5 | $7,856 → $8,135 (4%) | 12.1 → 12.2 | 2% → 0% |
| good | drums | Y4-6 | $6,282 ± 286 → $6,343 ± 249 | 1% | 0.2 | $28,389 → $27,949 (-2%) | 21.4 → 21.4 | 3% → 0% |
| good | drums | Y7-10 | $15,142 ± 860 → $14,010 ± 791 | -7% | -1.0 | $35,752 → $36,519 (2%) | 21.2 → 21.4 | 1% → 0% |
| good | drums | Y4-10 | $11,345 ± 557 → $10,724 ± 487 | -5% | -0.8 | $32,596 → $32,846 (1%) | 21.3 → 21.4 | 2% → 0% |
| good | bass | Y4-6 | $6,183 ± 256 → $6,271 ± 261 | 1% | 0.2 | $27,395 → $27,887 (2%) | 21.1 → 21.2 | 0% → 0% |
| good | bass | Y7-10 | $15,012 ± 821 → $14,470 ± 796 | -4% | -0.5 | $35,860 → $36,011 (0%) | 21.3 → 21.3 | 0% → 1% |
| good | bass | Y4-10 | $11,228 ± 519 → $10,956 ± 502 | -2% | -0.4 | $32,232 → $32,529 (1%) | 21.2 → 21.2 | 0% → 1% |
| good | rhythm | Y4-6 | $6,033 ± 268 → $5,875 ± 260 | -3% | -0.4 | $27,509 → $27,295 (-1%) | 21.3 → 21.1 | 1% → 2% |
| good | lead | Y4-6 | $6,665 ± 377 → $6,838 ± 347 | 3% | 0.3 | $27,712 → $28,939 (4%) | 21.6 → 21.2 | 0% → 0% |

Per year:

| bot | seat | Y4 fund (mean) base → after (z) | Y5 fund (mean) base → after (z) | Y6 fund (mean) base → after (z) | Y7 fund (mean) base → after (z) | Y8 fund (mean) base → after (z) | Y9 fund (mean) base → after (z) | Y10 fund (mean) base → after (z) |
|---|---|---|---|---|---|---|---|---|
| avg | drums | $3,547 → $3,806 (0.6) | $5,120 → $4,859 (-0.6) | $4,609 → $5,230 (1.1) | $6,088 → $6,084 (-0.0) | $6,737 → $7,352 (0.8) | $7,677 → $7,751 (0.1) | $9,158 → $8,610 (-0.6) |
| avg | bass | $3,701 → $3,804 (0.3) | $4,849 → $4,444 (-0.8) | $4,659 → $4,941 (0.5) | $5,657 → $5,391 (-0.4) | $6,677 → $6,265 (-0.6) | $6,722 → $7,479 (0.8) | $8,863 → $7,952 (-0.9) |
| avg | rhythm | $3,653 → $3,968 (0.8) | $3,976 → $4,738 (2.0) | $4,762 → $5,425 (1.4) | - | - | - | - |
| avg | lead | $3,857 → $3,981 (0.3) | $5,011 → $5,272 (0.6) | $5,912 → $5,130 (-1.5) | - | - | - | - |
| good | drums | $5,259 → $6,434 (2.0) | $4,718 → $5,695 (2.1) | $8,870 → $6,902 (-2.4) | $9,920 → $9,349 (-0.4) | $13,827 → $11,620 (-1.3) | $18,443 → $16,939 (-0.8) | $18,378 → $18,132 (-0.1) |
| good | bass | $5,973 → $6,225 (0.4) | $5,329 → $5,776 (0.8) | $7,246 → $6,812 (-0.6) | $9,529 → $9,029 (-0.4) | $12,821 → $12,448 (-0.2) | $17,192 → $18,014 (0.5) | $20,505 → $18,389 (-1.2) |
| good | rhythm | $5,422 → $5,738 (0.5) | $5,639 → $5,012 (-1.4) | $7,037 → $6,875 (-0.2) | - | - | - | - |
| good | lead | $6,578 → $6,730 (0.2) | $5,889 → $5,912 (0.0) | $7,527 → $7,871 (0.3) | - | - | - | - |

- Years 4-6, pooled: 7 of 8 seat x bot cells are within ±5% of base with |z| <= 0.6 (avg drums +5%, bass -0%, lead -3%; good
  drums +1%, bass +1%, rhythm -3%, lead +3%). The one outlier is avg rhythm: +14% (z 2.2) on seeds 1-40; a second seed set
  (41-80, `human2.js SEEDOFF=40`) gives +3% (z 0.5); all 80 seeds +8% (z 1.9, paired z 2.0): borderline, carried from year 3
  (rhythm avg Y3 +28%), not from late gig pay (+2-3%).
- Years 7-10 (drums + bass): -7% to 0%, |z| <= 1.0; gig pay per year -11% to +2%. Late-game loans stay at 0-3% of career-years.
- Single years swing more (good drums Y4 +22% z 2.0, Y6 -22% z -2.4: the timing of big buys), the pooled spans do not.

## 10. Pace and seat parity (bots)

### C7. Pace (median week; base → after) and the seats vs drums (median fund at year 3 as a share of drums')
| seat | bot | Local Heroes (250 fans) | signed | first gear/kit bought | jam room rented (share) | Y3 fund vs drums |
|---|---|---|---|---|---|---|
| drums | weak | wk 25 → wk 22 | wk 50 → wk 45 | wk 49 → wk 45 | 0% → 8% | - |
| bass | weak | wk 22 → wk 23 | wk 46 → wk 44 | wk 48 → wk 48 | 3% → 8% | 130% → 119% |
| rhythm | weak | wk 23 → wk 22 | wk 50 → wk 45 | wk 54 → wk 46 | 3% → 5% | 88% → 86% |
| lead | weak | wk 24 → wk 22 | wk 46 → wk 44 | wk 48 → wk 44 | 3% → 13% | 92% → 108% |
| drums | avg | wk 21 → wk 20 | wk 48 → wk 42 | wk 45 → wk 43 | 5% → 13% | - |
| bass | avg | wk 21 → wk 20 | wk 39 → wk 39 | wk 43 → wk 38 | 8% → 8% | 86% → 121% |
| rhythm | avg | wk 21 → wk 21 | wk 47 → wk 41 | wk 42 → wk 39 | 3% → 8% | 96% → 117% |
| lead | avg | wk 20 → wk 20 | wk 39 → wk 39 | wk 42 → wk 38 | 15% → 10% | 109% → 131% |
| drums | good | wk 16 → wk 14 | wk 27 → wk 26 | wk 30 → wk 26 | 98% → 98% | - |
| bass | good | wk 16 → wk 14 | wk 28 → wk 26 | wk 31 → wk 25 | 88% → 100% | 118% → 94% |
| rhythm | good | wk 16 → wk 14 | wk 29 → wk 27 | wk 31 → wk 24 | 83% → 100% | 119% → 88% |
| lead | good | wk 16 → wk 14 | wk 26 → wk 26 | wk 29 → wk 23 | 88% → 95% | 107% → 89% |

### C10. Year-3 fund: mean ± standard error (40 paired seeds), base → after, and z = difference / combined SE (|z| < 2 = within seed noise)
| seat | bot | Y2 mean base → after (z) | Y3 mean base → after | change | z |
|---|---|---|---|---|---|
| drums | weak | $899 → $1,076 (1.3) | $1,732 ± 272 → $1,617 ± 205 | -7% | -0.3 |
| bass | weak | $1,037 → $996 (-0.3) | $1,856 ± 220 → $2,012 ± 243 | 8% | 0.5 |
| rhythm | weak | $863 → $928 (0.4) | $1,274 ± 140 → $1,500 ± 162 | 18% | 1.1 |
| lead | weak | $1,057 → $1,005 (-0.3) | $1,474 ± 171 → $1,809 ± 201 | 23% | 1.3 |
| drums | avg | $1,240 → $1,234 (-0.0) | $2,337 ± 224 → $2,674 ± 280 | 14% | 0.9 |
| bass | avg | $1,204 → $1,331 (0.7) | $2,053 ± 220 → $2,853 ± 232 | 39% | 2.5 |
| rhythm | avg | $1,194 → $1,312 (0.7) | $2,313 ± 278 → $2,968 ± 302 | 28% | 1.6 |
| lead | avg | $1,380 → $1,628 (1.4) | $2,391 ± 235 → $2,981 ± 250 | 25% | 1.7 |
| drums | good | $2,388 → $2,493 (0.5) | $4,159 ± 354 → $4,786 ± 292 | 15% | 1.4 |
| bass | good | $2,437 → $2,527 (0.5) | $4,382 ± 287 → $4,708 ± 256 | 7% | 0.8 |
| rhythm | good | $2,589 → $2,523 (-0.3) | $4,094 ± 248 → $4,532 ± 288 | 11% | 1.2 |
| lead | good | $2,434 → $2,482 (0.2) | $4,039 ± 288 → $4,426 ± 279 | 10% | 1.0 |

- Pace is a little faster: Local Heroes wk 20-25 → 20-23 (avg/weak), 16 → 14 (good); signed avg wk 39-48 → 39-42, good 26-29 →
  26-27. First gear is bought earlier or in the same week on every seat (cheaper ride and pedal).
- Year 3 is richer for the bots: mean fund -7% to +39% (11 of 12 cells up; one cell beyond noise: avg bass +39%, z 2.5); the good
  bots carry their year-1/2 savings. Year-3 loans stay rare (0-10%); the year-3 loans in both trees are weeks with one far booking
  ($865-$2,340 gas), the same pattern as base.

## 11. The other baseline probes

### T12. One grade worse / better (drums, avg bot, 40 seeds; human.js PERF -12 / 0 / +12 = the baseline T12 shift)

| performance (drums, avg bot) | fund Y1 (median) | weeks < $100 Y1 | loan Y1 | gig pay Y1 | fund Y2 | loan Y2 | fund Y3 | loan Y3 |
|---|---|---|---|---|---|---|---|---|
| -12 (about one grade lower) | $244 → $494 | 3.1 → 0.8 | 48% → 3% | $670 → $1,020 | $632 → $944 | 28% → 5% | $1,061 → $1,903 | 18% → 10% |
| no shift | $410 → $590 | 1.4 → 0.5 | 25% → 3% | $960 → $1,159 | $1,031 → $1,061 | 5% → 3% | $2,160 → $2,257 | 0% → 8% |
| +12 (about one grade higher) | $553 → $674 | 1.9 → 0.3 | 25% → 3% | $1,388 → $1,614 | $1,668 → $1,482 | 3% → 0% | $3,568 → $3,775 | 3% → 0% |

- A grade better still earns more (year-1 gig pay $1,614 vs $1,020 a grade worse; base $1,388 vs $670), and the grade-worse drummer
  who Hustles is no longer broke in year 1 (48% → 3% loans, 3.1 → 0.8 weeks under $100).

### T11. Simulate vs the same gig played (4 seeds x 4 seats; 140 fans / tier-1 rooms, garage era; 700 fans / tier-2 rooms, "local" era forced)

| seat | tier | deal | played pay at 55% / 85% / 100% hit (base) | (after) | played grades at 85% (base → after) | played net to fund at 85% (base → after) | Simulate pay = played pay (base → after) |
|---|---|---|---|---|---|---|---|
| drums | T1 | door | $104 / $104 / $104 | $130 / $143 / $162 | 4A → 4A | -$32 → $47 | 20/20 → 20/20 |
| drums | T1 | flat | $118 / $118 / $118 | $165 / $182 / $207 | 4A → 4A | $46 → $108 | 20/20 → 20/20 |
| drums | T2 | door | $326 / $326 / $326 | $326 / $326 / $326 | 4A → 4A | $138 → $138 | 20/20 → 20/20 |
| drums | T2 | flat | $189 / $189 / $189 | $189 / $189 / $189 | 4A → 4A | $43 → $43 | 20/20 → 20/20 |
| bass | T1 | door | $104 / $104 / $104 | $130 / $143 / $162 | 4A → 4A | -$32 → $47 | 20/20 → 20/20 |
| bass | T1 | flat | $118 / $118 / $118 | $165 / $182 / $207 | 4A → 4A | $46 → $108 | 20/20 → 20/20 |
| bass | T2 | door | $326 / $326 / $326 | $326 / $326 / $326 | 1A 3S → 1A 3S | $138 → $138 | 20/20 → 20/20 |
| bass | T2 | flat | $189 / $189 / $189 | $189 / $189 / $189 | 1A 3S → 1A 3S | $43 → $43 | 20/20 → 20/20 |
| rhythm | T1 | door | $104 / $104 / $104 | $130 / $143 / $162 | 4A → 4A | -$32 → $47 | 20/20 → 20/20 |
| rhythm | T1 | flat | $118 / $118 / $118 | $165 / $182 / $207 | 4A → 4A | $46 → $108 | 20/20 → 20/20 |
| rhythm | T2 | door | $326 / $326 / $326 | $326 / $326 / $326 | 2A 2S → 2A 2S | $138 → $138 | 20/20 → 20/20 |
| rhythm | T2 | flat | $189 / $189 / $189 | $189 / $189 / $189 | 2A 2S → 2A 2S | $43 → $43 | 20/20 → 20/20 |
| lead | T1 | door | $104 / $104 / $104 | $130 / $143 / $162 | 4A → 4A | -$32 → $47 | 20/20 → 20/20 |
| lead | T1 | flat | $118 / $118 / $118 | $165 / $182 / $207 | 4A → 4A | $46 → $108 | 20/20 → 20/20 |
| lead | T2 | door | $326 / $326 / $326 | $326 / $326 / $326 | 2A 2S → 2A 2S | $138 → $138 | 20/20 → 20/20 |
| lead | T2 | flat | $189 / $189 / $189 | $189 / $189 / $189 | 2A 2S → 2A 2S | $43 → $43 | 20/20 → 20/20 |

- Played vs Simulate, identical pay and net to the fund: 320/320 → 320/320 rows. Setups where the pay is the same at 55% and 100% hit: 64/64 → 32/64.
- Playing well now pays on the night: tier-1 rooms in the garage era pay $130 / $143 / $162 (door) and $165 / $182 / $207 (flat)
  at 55% / 85% / 100% hit (base: the same $104 / $118 at any accuracy). Simulate still pays exactly what the same accuracy pays
  when played (320 / 320 rows, pay and net).
- The tier-2 rows show no grade pay because this probe forces era 'local' on a fresh career with no Local Heroes week, so
  `career.earlyMoney` is 0 (a probe artifact; real careers carry the milestone, see section 7). Drum scores rose +1 to +2.6 at
  55-85% hit (M2) on both tiers; at the 85% aim bass still gets 3 S / 1 A at tier 2 because its realised hit share was higher
  (0.863 vs 0.851 drums), not because of the seat.

### X1. Drums vs bass in every band (weak + avg bot; Hail Damage 40 seeds, the other bands 30 seeds; fund = median, money = mean per career)

| band | bot | seat | fund Y1 med | fund Y2 med | fund Y3 med | weeks < $100 Y1 | loan Y1 | loan Y2 | gig pay Y1 | gas Y1 | Hustle Y1 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| hail_damage | weak | drums | 358 → 522 | 764 → 879 | 1067 → 1259 | 4.0 → 0.3 | 40% → 5% | 15% → 5% | $548 → $997 | $532 → $270 | $859 → $489 |
| hail_damage | weak | bass | 276 → 435 | 867 → 837 | 1386 → 1504 | 2.6 → 0.6 | 48% → 3% | 10% → 13% | $611 → $833 | $536 → $237 | $820 → $504 |
| hail_damage | avg | drums | 410 → 590 | 1031 → 1061 | 2160 → 2257 | 1.4 → 0.5 | 25% → 3% | 5% → 3% | $863 → $1,047 | $474 → $268 | $789 → $488 |
| hail_damage | avg | bass | 387 → 603 | 886 → 1174 | 1858 → 2739 | 1.9 → 0.4 | 30% → 0% | 18% → 10% | $827 → $1,045 | $537 → $255 | $771 → $534 |
| frost_heave | weak | drums | 236 → 453 | 717 → 871 | 1127 → 1346 | 4.8 → 1.0 | 67% → 7% | 23% → 13% | $707 → $944 | $734 → $340 | $821 → $489 |
| frost_heave | weak | bass | 214 → 441 | 752 → 876 | 1403 → 1675 | 4.5 → 1.0 | 63% → 7% | 27% → 13% | $655 → $862 | $787 → $351 | $837 → $523 |
| frost_heave | avg | drums | 424 → 510 | 870 → 851 | 2132 → 2537 | 3.2 → 0.8 | 47% → 7% | 17% → 0% | $911 → $1,029 | $737 → $392 | $835 → $488 |
| frost_heave | avg | bass | 279 → 633 | 1060 → 1040 | 1800 → 2492 | 2.7 → 0.1 | 53% → 0% | 13% → 3% | $809 → $1,196 | $728 → $360 | $838 → $520 |
| gravel_kings | weak | drums | 536 → 656 | 1007 → 827 | 2063 → 1796 | 0.8 → 0.2 | 17% → 0% | 17% → 10% | $663 → $836 | $330 → $143 | $713 → $456 |
| gravel_kings | weak | bass | 520 → 705 | 848 → 966 | 1840 → 2149 | 0.9 → 0.1 | 13% → 0% | 20% → 10% | $594 → $893 | $329 → $212 | $725 → $501 |
| gravel_kings | avg | drums | 704 → 765 | 1279 → 1284 | 3227 → 2789 | 0.9 → 0.1 | 0% → 0% | 13% → 7% | $938 → $1,066 | $374 → $228 | $730 → $466 |
| gravel_kings | avg | bass | 593 → 773 | 1169 → 1388 | 1957 → 2641 | 0.8 → 0.1 | 10% → 3% | 27% → 10% | $856 → $1,058 | $452 → $202 | $722 → $475 |
| grid_road_ramblers | weak | drums | 237 → 461 | 620 → 948 | 810 → 1441 | 3.9 → 0.8 | 63% → 3% | 23% → 3% | $859 → $1,033 | $904 → $392 | $854 → $462 |
| grid_road_ramblers | weak | bass | 322 → 524 | 623 → 772 | 843 → 898 | 2.1 → 0.3 | 60% → 0% | 17% → 13% | $862 → $1,069 | $782 → $353 | $802 → $490 |
| grid_road_ramblers | avg | drums | 421 → 698 | 714 → 1240 | 1179 → 1984 | 3.0 → 0.4 | 40% → 0% | 20% → 10% | $981 → $1,368 | $785 → $394 | $837 → $508 |
| grid_road_ramblers | avg | bass | 320 → 696 | 863 → 1000 | 1086 → 2605 | 2.6 → 0.1 | 47% → 0% | 20% → 10% | $1,069 → $1,297 | $849 → $371 | $775 → $502 |

- Every band: year-1 loans 0-67% → 0-7%, weeks under $100 in year 1 <= 1.0, year-1 gas roughly halved. Drums and bass move
  together in every band (no seat gap opens). Gravel Kings (the shortest drives, so the least gas to save) gains least: its drum
  medians end years 2-3 a little lower than base (weak Y2 $1,007 → $827; avg Y3 $3,227 → $2,789) while bass ends higher; the
  means are within noise (drums z -1.3 to -0.1, bass z -0.1 to +1.5).
- Chart density (baseline D1) is unchanged by design (M2 changes the crowd flow, not the charts).

## Setup and reproduce

- Scratch: `scratchpad/v14after/` (`base/`, `new/` = exported trees; `bin/` = scripts; `raw/` = outputs).
- Bot probes: `node bin/drive.js new <seat> weak,avg,good 40 3 > raw/hd_<seat>.jsonl` (the baseline's driver, unchanged); base =
  the baseline's `scratchpad/v14/bp/hd_*.jsonl` (re-run check: identical careers). Tables: `bin/agg.js` (baseline T1-T10 format,
  `raw/hd_tables_new.md`), `bin/cmp.js <baseDir> raw` (C1-C10), `bin/d0.js` (section 2).
- Personas: `bin/personas.sh` (human.js on both trees, 17 personas x 2), `bin/psum.js` + `bin/ptab.js`.
- M2: `bin/fair2.js <tree>` + `bin/fsum.js`. Signing: `bin/sigprobe.js new <style> 40` + `bin/sigsum.js`.
- Late game: `bin/late.sh` + `bin/late.js`. T11 / X1: `bin/extra.sh` (simprobe.js 4 seeds; drive.js weak + avg, 30 seeds, the
  other three bands) + `bin/simtab.js`, `bin/xb.js`.
