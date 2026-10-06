# v1.4 "Tuning": build report (M1 + M2 + M3 + critic fixes)

Branch `v1.4-tuning` (from d9411a3), VERSION **1.4.0.0**. Owner picks (status.md Addendum 7, locked): **M1** "Gigs pay, side
jobs less" (the critic's B+), **M2** "Fair grades", **M3** jam room cheaper until signed. Commits: 3381c98 (M1 + M3),
c828a3e (M2 + tests/sim_money), 1e1f3de (seat-language fix), 9f22e81 (contracts + pw), bee4cf7 (sim_recap re-pin), and the
commit that adds this report.

## 1. Every lever (file:line old -> new; old lines are d9411a3)

| # | lever | file:line (old -> new) | old -> new |
|---|---|---|---|
| M1.1 | start fund | `src/content/economy.js:7` | `startFund: 300` -> `450` |
| M1.2 | ride (lane 6; the string seats' lane-6 item on the shared price list) | `src/content/shop.js:33` | `cost: 350` -> `200` |
| M1.3 | pedal (double kick; the string seats' runs item) | `src/content/shop.js:34` | `cost: 300` -> `250` (every seat's full rig: drums / rhythm / lead $1,100 -> $900, bass $750 -> $700) |
| M1.4 | Hustle era factor | `src/content/economy.js:124 -> 130` | `hustleEra { garage 1, local 1.3, signed 2.2, world 3 }` -> `{ garage 0.7, local 1, signed 2.2, world 3 }` (Hustle $50-100 -> $35-70 in the garage, $65-130 -> $50-100 at Local Heroes) |
| M1.5 | the early-help taper (new) | `src/content/economy.js:133` `earlyTaper: 24`; `src/20_sim_career.js:1266` `career.earlyMoney(state)` | 1 in the garage era, then `1 - (totalWeek - milestones.localHeroes) / 24`, clamped 0..1, in any era (no cliff at signing) |
| M1.6 | gas by era | `src/26_sim_world.js:135 -> 139-148` `world.gasMult` + `gasFor`; content `economy.js:150` `gasEra { garage 0.5, local 0.8 }` | `max(5, round(km x 2 x 0.25))` -> `x 0.5` in the garage era; from Local Heroes `x (1 - 0.2 x earlyMoney)` (0.8 fading to 1 over 24 weeks) |
| M1.7 | open mics / exposure gigs cover gas | `src/26_sim_world.js:232 -> 254` (decorate); content `exposureGas: 40` | exposure deals: `gas - $40`, never below $0 |
| M1.8 | small rooms pay more + the tier step (new) | `src/26_sim_world.js:152` `world.tierPay`; used at `:256 -> 280-281` (makeListing) and `src/22_sim_gig.js:73 -> 71-80` (makeGig, card bookings); content `economy.js:149` `tierPay { 1: 1.6 }, tierStep { flat: 150, door: 2 }` | tier-1 pay x1.6, stopped at max(own pay, step); tier-2 pay starts at the step. Tier-1 average over the content ranges: flat x1.47, door x1.29 |
| M1.9 | grade pay (nobody docked) | `src/22_sim_gig.js:170 -> 176-189` `gig.gradePayMult` + applyResult; content `economy.js:70` `gradePay { S 1.25, A 1.1 }` | pay x1 for every grade -> S x(1 + 0.25 x earlyMoney), A x(1 + 0.1 x earlyMoney), B/C/D x1; the BotB prize unscaled; folded into the existing `r.diffPay` guard (no `gradePaid` field) |
| M1.10 | the band's cut on the results screen | `src/55_ui_gig.js:1106-1122 -> 1104-1129` | grid Crowd/Pay/Gas/Fans/Buzz/Moments -> **Pay / Band's cut / Gas** + Crowd / Fans / Buzz, an **"Into the fund: +$X"** line (r.deltas.fund; "the band takes 30% of the pay", "a great show paid 25% more"); Moments count moves to the score line; testids `gig-pay`, `gig-cut`, `gig-net` |
| M2 | fair grades: the crowd's flow on every seat | `src/22_sim_gig.js:898 -> 918` | `if (cur.hold && dt > 0 && S.combo > 0)` -> `if (dt > 0 && S.combo > 0)` (the drums too); charts, windows, per-note gains unchanged |
| M3 | jam room $35/wk until signed | `src/content/shop.js:62` `rentEarly: 35`; `src/2a_sim_shop.js:342 -> 344-356` (rentNow, spaceDef rent / rentLater), `:358 -> 368` (canMove reads this week's rent), `:382 -> 393` (spaces rows + rentLater) | rent $60 -> $35 in the garage / Local Heroes eras, $60 from signing (eviction, bills, bots all read it) |
| M3 text | the card and the shop say both prices | `src/content/cards.js:1865-1869`, band variants `zz_band_frost_heave.js:1748-1751`, `zz_band_gravel_kings.js:1416-1419`, `zz_band_grid_road_ramblers.js:1875-1878`; `src/5k_ui_shop.js:436-447` | "$60 a week" -> "$35 a week until you sign (then $60)"; "Move in ($35/week)", hint "Rent $35/wk ($60 once signed) · rehearse better"; shop chips "$60/week once you sign" / "$60/wk once signed"; the move confirm says it too |
| seat | the Ramblers lead-seat slip | `src/27_sim_drama.js:159 -> 159-169` (drama.want); `zz_band_grid_road_ramblers.js:503` | the swapped member on a string seat no longer wants rule 'solos' (no "Earl is getting passive-aggressive ... about solos"); Colt: "Can Earl show me a G chord?" -> "Can one of you show me a G chord?" (a second latent lead-seat line the new path surfaced) |
| docs | contracts | `src/02_contracts.js` new block "V1.4 TUNING" (after V1.3.1) + the V1.3.1 "played gigs score exactly as 1.3.0" line notes the intended re-pin; `src/22_sim_gig.js` header (flow on every seat) | formulas above |

## 2. Critic fixes

- **Moving up a tier never pays less**: `world.tierPay` with `tierStep { flat 150, door 2 }`. Tier-1 boosted pay never passes
  max(its own pay, step); tier-2 pay never falls below the step. Proven on the content ranges (every tier-1 ceiling <= every
  tier-2 floor, per deal) and on 60 weeks of real boards (rep 0, no clash/holiday) in `tests/sim_money`. Cost: the boost is
  trimmed at the top of the tier-1 range (flat x1.47, door x1.29 on average instead of x1.6); the tier-2 floor raises only low
  Prairie tier-2 rolls (ablation: years 4-6 fund and gig pay with vs without the step within +-3%, z <= 0.7).
- **No visible pay drop at signing**: grade pay and gas fade by the week after Local Heroes (earlyMoney), never by the era.
  Test: weeks 22-60, the same career in 'local' vs 'signed' gives identical earlyMoney, S/A pay factors, gas factor and gas $;
  the fade is <= 1/24 a week. Hustle never pays less in a later era. (The jam room's $35 -> $60 at signing is the owner's M3
  pick; the 15% management commission at signing is 1.3 behaviour.)
- **gradePaid folded** into `r.diffPay` (test: an S result and a B result have the same keys).
- **Seat-language slip** (sim_bands:432): fixed (section 1, "seat"); sim_bands 17/17 incl. the quick seat scan.

## 3. M2 "Fair grades": what it does and the proof

Cause (measured, `scratchpad/v14b/seatprobe.js`): at the same hit share the score's note part is the same on every seat
(already a ratio); the gap was the crowd part. Per-note crowd gains were already per second (`densityRef`), but the v1.1
"flow" (the crowd warms while a combo runs) was string seats only: drums drew 7-12 less crowd at 70-85%. With flow off, all
four seats match (drums 54.7 / bass 55.3 crowd at 70% Easy); so flow now runs on every seat.

Paired-seed probe (`fairprobe.js`: 12 seeds x Easy/Normal/Hard x 60/72/84/94% tap chance, 40 ms jitter, the Legion):

| | 1.3.1 | 1.4 |
|---|---|---|
| mean drums - bass gig score | -1.22 | +0.38 |
| mean abs(drums - bass) | 1.38 | 0.52 |
| worst cell | Easy 72%: -3.2 | Hard 94%: +1.3 |
| same grade (paired) | 85% | 89% (rest = noise near a grade line) |
| played fingerprint, drums/hard (acc 0.833) vs bass/hard (0.830) | 64 **B** $130 vs 65 A $143 | 65 **A** $143 vs 65 A $143 |

`tests/sim_money` "M2 fair grades" (drums vs bass, 8 paired seeds x 72/84% x 3 difficulties): per cell |gap| <= 2, mean <= 1,
same grade -> same pay, pay by grade identical on all four seats; it **fails on 1.3.1** (Easy 72%: -2.63). "M2 Simulate":
drum and bass logs at 80-82% simulate to the same score (+-2). Bots (autoResolve) have no seat in the score: unchanged.
Not addressed (charts unchanged, by the pick): the same *hands* still hit a smaller share of the 2x denser drum chart.

## 4. Tests moved (before -> after), all logged in the commit messages

| test | before | after |
|---|---|---|
| `tests/sim_gig.test.js` played-gig fingerprint (intended re-pin; supersedes v1.3.1 "played gigs match 1.3.0") | drums/easy 1042753566, drums/hard 74364012, bass/easy 1477014130, bass/hard 222861556 | M1: 2392819971 / 369121013 / 398286011 / 2109029357 (pay 80 -> 143/130/143/143, fund 351 -> 545/536); M2: drums rows 1973364824 / 1896319776 (72 -> 75, 64 B -> 65 A), bass rows unchanged |
| `tests/sim_gig.test.js` makeGig / pay rules | Legion card pay $80 | $130 (x1.6 = $128 -> $5) |
| `tests/sim_world.test.js:26` gas from road km | max(5, km x 2 x 0.25) (seed 11: open mic $5, Moose Jaw $110, Regina $120) | garage x0.5, exposure -$40 ($0 / $55 / $60) |
| `tests/sim_world.test.js:54` flat in range | Bingo Palace $80-120 (seed 99: $90) | $125-150 ($145) |
| `tests/sim_career.test.js:264` garage hustle | $50-100 (passed by luck at x0.7) | $35-70 |
| `tests/sim_shop.test.js:181` jam room rent in the bills | 60 + 6 | 35 + 6 |
| `tests/sim_recap.test.js:88` year-one good year | seed 12 (full band) | seed 13: with v1.4 money seed 12 reaches Local Heroes at wk 19 and Marcel + Dana quit wk 22-24 (25 of seeds 1-30 keep all five lines) |
| `tests/pw_shop.js` space: wrap rent + laptop rent | $60 | $35 (a Local Heroes career) |

New: `tests/sim_money.test.js` (8 tests: M1 levers on all four seats + Hustle in both eras, gas, the tier rule, grade pay, no
cliff at signing, M3, M2 fair grades, M2 Simulate); pw_gig `gig` checks the results money row; pw_shop `space` checks
"Rent $35/week" + "$60/week once you sign".

## 5. Re-probe (plan/v14/human.js, Hail Damage, 40 seeds; base = d9411a3)

Year 1 / 2 / 3: parents' loan % / weeks under $100 (of 24) / median fund. h12 = drums one grade lower (PERF -12).

| persona | base | v1.4 | owner target (Y1) |
|---|---|---|---|
| P5 gig-first, drums h12 | 98% / 11.8 / $100 · 80% / 5.9 · 60% / 3.0 | **55% / 4.7** / $196 · 60% / 3.5 · 43% / 1.7 | ~53% / 4.5 |
| P5 gig-first, bass | 95% / 9.0 / $161 · 70% / 3.0 · 20% / 0.4 | **45% / 3.3** / $312 · 40% / 1.7 · 20% / 0.6 | ~40% / 3.5 |
| P5 gig-first, drums (h0) / rhythm / lead | 100% / 10.2 · 93% / 9.3 · 98% / 8.4 | 30% / 3.3 · 40% / 3.8 · 53% / 3.7 | |
| P0 avg bot (Hustles), drums h12 | 48% / 3.1 | 3% / 0.8 | |
| P0 avg bot, drums / bass | 25% / 1.4 · 30% / 1.9 | **3% / 0.5 · 0% / 0.4** | ~0% / 0.5 |
| P0 avg bot, rhythm / lead | 38% / 2.1 · 48% / 2.6 | 0% / 0.1 · 10% / 0.5 | |
| P1 gig-first + eager gear + jam room, drums h12 | 100% / 11.9 · 95% · 90% / 5.4 | 90% / 9.8 · 88% · 78% / 3.4 | |
| P1 same, bass | 95% / 9.7 · 95% · 75% / 3.0 | 88% / 7.4 · 70% · 45% / 1.5 | |

Years 4-6 (avg + good bots, 40 seeds, mean fund pooled over Y4-6, base -> v1.4): avg drums 4425 -> 4632 (+5%, z 0.6), bass
4403 -> 4396 (0%), rhythm 4130 -> 4710 (+14%, z 2.2; a second seed set 41-80: +3%, z 0.5), lead 4926 -> 4794 (-3%); good drums
6282 -> 6343 (+1%), good bass 6183 -> 6271 (+1%). Gig pay per year Y4-6 within +-3% everywhere.
10-year `tools/balance.js 10 20` (drums, Hail Damage): avg fund Y4-10 +2 / -0 / +18 / -12 / +13 / -3 / +8% (gig pay per year
Y4-10 -17% to +13%, mostly lower); good Y4-10 +34 / +12 / -17 / +9 / -3 / -13 / +9% (Y4 carries the Y3 savings, gig pay
Y5-10 within noise); Local Heroes wk 22 -> 20 (avg), 16 -> 14 (good); signed wk 45 -> 42 / 27 -> 26; World era wk 147 -> 152 /
100 -> 98; legacy tiers unchanged (avg AL 0% CI 20%, good AL 15% CI 85%); quits/year after protection 0.64 -> 0.67.
Raw: `scratchpad/v14b/` (out_base, out_new, y6_*, bal10_*.txt, fair_final.txt).

## 6. Verification

- `node build.js`: V1.4.0.0, `dist/game.html` 5,244,808 B (gate 6,000,000).
- `node tests/run.js`: SUITE ALL PASS (see section 8 for the final run line).
- `META_ONLY=hash timeout 500 node tests/pw_seq.js`: 232/232 equal (Classic audio). `tests/compat_v12` 10/10 (songwriter law).
- Playwright at 390x844 and 440x956: pw_gig `gig` 33/33 + `simulate` 21/21; pw_shop `space` 22/22, `spaces` 17/17, `seat` 26/26;
  pw_flow `layout` 34/34 (no horizontal scroll, buttons >= 44 px); 390 only: pw_world 70/70, pw_flow flow/year/code all pass.
  pw_flow `bands`: one flow:country "locator.click timeout" in the full-file run, then passed alone 4 times (2 in a row twice):
  the known v1.3.1 timing flake (v131 report: "pw_flow bands ... btn-create click stalled").

## 7. Gaps / for the owner check

- The gig-first player who also rents the jam room stays tight in years 2-3 (P1 drums h12 Y3 78% loans, bass 45%); M3 saves
  $25/wk but does not change that. Bots seldom rent.
- Drums still trail bass for the same *hands* (the drum chart has ~2x the notes, charts unchanged by M2): h12 Y3 fund $530 vs
  bass $1,504 for the gig-first player. M2 removes the extra grade penalty at equal accuracy only.
- The tier step trims the small-room boost at the top of the range (the Legion's best $100 roll pays $150, not $160; doors stop
  at $2 a head): "small rooms pay up to 60% more, never more than the next tier".
- Year 3 is richer for the bots (avg-bot median Y3 fund +4% drums, +29-46% on the string seats; good bot +36% in balance.js),
  carried from the early savings; years 4-10 within seed noise (section 5).
- Bots cannot measure M2 (they don't play live gigs); the owner's playtest on drums and bass is the real check.
- Not done here (lead's call): status.md Version / Addendum 7 checkbox, PR, owner screenshots.

## 8. Final suite run

`node build.js && node tests/run.js` at bee4cf7 (all source changes in): **SUITE ALL PASS** (36 files, incl. sim_money 8/8,
sim_gig 37/37, sim_world 21/21, sim_shop 17/17, sim_career 25/25, sim_recap 6/6, sim_bands 17/17, compat_v12 10/10, save 22/22).
Results screen screenshot check (Legion, S grade): 390x844 and 440x956, no horizontal scroll, "Into the fund: +$109 · the
band takes 30% of the pay · a great show paid 25% more".
