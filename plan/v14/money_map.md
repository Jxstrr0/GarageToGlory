# v1.4 Tuning: MONEY MAP (read-only probe of `v1.4-tuning`, src = main 3a4fe9c; status through fdecb74)

Owner pain (Addendum 7): **too tight early** (years 1-2) and **gig pay feels off**. He plays bass + drums, and follow-up
2026-10-06: **"Drums felt worse tbh"** (explained in headline 8 and §7).
Nothing in `src/` was edited. The numbers come from the code (file:line) and from a scratch bot probe (§9) that
attributes every fund change to a flow: 4 bands x 4 seats x 6 seeds x {avg, good} bots x 6 years = 192 careers, plus
a "no-hustle player" probe (fixed plan rehearse / write / book, good bot otherwise, drums + bass, 48 careers x 3 years).

## 0. Headlines

1. **Gig pay never depends on how you play.** `flat` = a fixed guarantee; `door` = $/head x attendance, and attendance
   is rolled from fans + buzz *before the first note* (`22_sim_gig.js:638-641`, session `:660`, result `:1019`). An S
   and a D at the same show pay the same. Played, simulated (v1.3.1) and bot gigs all go through the same
   `payFor` (`22_sim_gig.js:121-123`) -> `applyResult` (`:168-190`) path, so "Simulate" pays exactly like a played gig.
   Only merch (x0.45 at D .. x1.3 at S), venue rep (+6% on *future* listings per rep step) and Battle-of-the-Bands
   prizes react to your playing.
2. **In year 1, gigs make about $0.** The avg bot plays 13 gigs: $889 gross, minus a 30% members' cut ($268) and gas
   ($588) = **$22 for the whole year (≈ $0 per gig)**. The good bot keeps $38 a gig. The money that keeps a year-1
   band afloat is **Hustle** (avg $839 a year), not gigs.
3. **A gig-focused player (no Hustle) needs the parents' loan in 69% of year-1 careers** (42% in year 2, 23% in year 3).
   The design target is "the parents' loan is rare with decent play". Bots that hustle: 28% (avg) / 8% (good) in year 1.
4. **The fund keeps a small share of the gross.** The result screen shows "Pay" (gross) and "Gas" but not the 30% cut
   (`55_ui_gig.js:1113-1116`; the board's estimate is gross too, `56_ui_board.js:121`). Avg bot, year 3: $327 a gig
   gross, **$46 a gig kept** (cut 31%, gas 31%, commission + crew 19%, tow 5%). That is less than one $165 Hustle block
   in the Signed era.
5. **Gas is the biggest year-1 cost after upkeep.** At $0.25/km for the round trip (`26_sim_world.js:43,133-136`), any
   tier-1 room more than about 150 km away loses money. Exposure gigs pay $0 and still cost gas. Avg bot, year 1: 83 km a
   gig, $588 of gas against $621 of pay kept after the cut.
6. **The bills step up just as the band starts to earn.** Local Heroes adds $6 a week plus the $60 jam room. Signed
   (usually year 2) adds $40 a week, a 15% commission and $150 crew at theatres. Avg-bot upkeep goes from $592 (year 1)
   to $1,230 (year 2) to $2,352 (year 3). A typical Gopherwood advance puts only about $400-1,000 cash in the fund (28%
   of the advance after the budget hold and the cut).
7. **Gig pay levels off.** Crowds are capped by capacity, the top home room nets about $835 from about 8k fans on, and
   tier-3 door pay per head (0.7-1.8) is lower than tier 2 (1.5-3). Late-game money comes from merch, tours,
   royalties and licensing. Good bot, year 6: fund $7.3k after spending about $11k a year in the shop. **Years 3-6 are
   not tight**, so any fix should be aimed at years 1-2.
8. **Drums vs bass (owner: "Drums felt worse tbh").** No money *rule* reads the seat: gear prices, pay, cut, gas and
   upkeep are the same (owner E14b, `2a_sim_shop.js:174-180`). The gap comes through **playing**. The drum seat's live
   charts carry **2-4x the judged notes per second of bass** on the same songs (Hard: Hail Damage 6.0 vs 3.1, Frost
   Heave 11.4 vs 3.6, Gravel Kings 6.1 vs 3.2, Grid Road Ramblers 7.4 vs 1.3). A human plays drums at a lower grade, and
   the grade drives new fans (conversion S 0.55 / A 0.40 / B 0.28 / C 0.15 / D 0.05), merch and rep, so later crowds
   and rooms are smaller. Probe: **one grade step lower (−10 gig score) costs the good bot ~39% of its year-1 fans,
   $620 of gig money, $520 of merch and $420 of year-end fund** (§7). Drums also need 3 items to fill the highway
   ($450 + $350 + $300 = $1,100); bass needs 2 ($750), because its $350 "fridge" cab adds no lane
   (`C.SEAT_MAX_LANES` bass 5, `02_contracts.js:88`). Bots at equal accuracy show no seat gap (seed noise, §7).

## 1. How money moves in one week (one shared band fund, unclamped: `20_sim_career.js:603-611`)

| Step | What touches the fund | Where |
|---|---|---|
| Monday | card choice (±$), forced shop/drama cards, offers | `20_sim_career.js:1004,1051` |
| Any time | shop: gear, kit/amp, van, upgrades, space move, merch stock (all paid up front, blocked if fund < price) | `2a_sim_shop.js` |
| 3 blocks | Hustle +$, Promote −$25, studio weeks −$ (DIY/overrun) | `20_sim_career.js:1142-1173`, `24_sim_labels.js:510-515` |
| Weekend gig | `world.shape` (opening slot crowd, BotB prize into `r.pay`) → `gig.applyResult`: **fund += pay − cut − fill-ins − gas + merch** → `world.afterGig`: − commission − crew − tow | `22_sim_gig.js:168-190`, `26_sim_world.js:392-470`, `23_sim_rival.js:653` |
| Wrap | − upkeep (base + per fan + era + rent) → royalties/Loonies → Patreeon (every 2nd week) → tour hotels → eviction check → **parents' loan if fund < 0** → licensing | `20_sim_career.js:1381-1424` |

## 2. Income

Measured columns are mean $ per career-year, **avg bot / good bot** (192 careers; §7). Y1 / Y3 / Y6 = career year.

| Flow | Where | Formula / numbers | Y1 | Y3 | Y6 |
|---|---|---|---|---|---|
| Gig pay, **flat** | `22_sim_gig.js:121-123`; listing `26_sim_world.js:246-262`; `venues.js` payRange | guarantee = int(payRange.flat) × max(0.5, 1+0.06×rep) × 1.25 if genre fit < 0.45 × holiday mult (NYE ×2, Xmas parties ×1.15-1.25, St Paddy's bars ×1.3; `28_sim_calendar.js:179`, `calendar.js:93-100`), rounded to $5. Tier 1: $45-150. Tier 2: $100-300 (Prairies), up to $450-1,000 (far east/north). Tier 3: $550-1,900 (Prairies), up to $3,000-4,200 (Toronto/Montréal) | 4.5 gigs @ $109 / 8.7 @ $129 | 5.3 @ $290 / 9.1 @ $712 | 5.6 @ $907 / 11.4 @ $1,817 |
| Gig pay, **door** | same | $/head × crowd. Crowd = (walkIns + 0.3×fans + 0.4×buzz) × U(0.8, 1.15), capped at capacity (`22_sim_gig.js:115-119`), fixed before the set. $/head: t1 1-2, t2 1.5-3 (far 2.5-4.5), **t3 0.7-1.8** | 1.8 @ $188 / 5.0 @ $275 | 4.1 @ $505 / 8.2 @ $999 | 4.3 @ $970 / 8.7 @ $1,312 |
| Exposure | `economy.js:66` | $0, ×1.3 new fans. **The only rooms on the week-1 board** (first paid room needs 25-40 fans) | 7.0 gigs / 9.2 gigs | 2.8 / 3.7 | 2.6 / 1.6 |
| Opening slot | `26_sim_world.js:50,402-409` | flat $20-45 (35% exposure) + 45% of the headliner's draw added to the crowd | (in flat) | | |
| BotB prize | `economy.js:263`; added to `r.pay` at `23_sim_rival.js:653` | win: $300 garage / $600 local / $1,000 signed / $2,000 world. The **only performance-linked pay**, and the 30% cut and commission apply to it | small | small | small |
| Tour gigs abroad | `25_sim_tour.js:387-388` | int(venue pay) × holiday × **1.3**, rounded to $50 (e.g. Camden $700-1,100, Shinjuku $1,200-1,800) | — | — | good: part of the $1,524/gig |
| **Gig pay, total gross** | | | **$889 (13.2 gigs) / $2,694 (22.9)** | $3,998 (12.2) / $15,646 (20.9) | $9,565 (12.5) / $32,865 (21.6) |
| Merch sales | `2a_sim_shop.js:692-702,737`; `economy.js:329-342`; `shop.js:201-246` | buyers = effCrowd × 0.032 × grade (S1.3 A1.15 B1 C0.75 D0.45) × (0.6+0.4·fit) × superfans × variety; effCrowd = crowd ≤ 50, else 50·(crowd/50)^0.65; split by appeal × exp(−1.6(price/suggested−1)). Shirt costs $8, sells for $20, $192 a box; the van hauls 3 boxes. At a 64-crowd year-1 gig that is ≈ 1.7 buyers ≈ $35 | $21 / $664 | $2,222 / $8,784 | $3,956 / $9,765 |
| **Hustle** | `20_sim_career.js:1165-1173`; `activities.js:37-42`; `economy.js:124` | $50-100 per block × repeat [1, 0.6, 0.35] × era (garage ×1, local ×1.3, signed ×2.2, world ×3) × difficulty; +7 burnout, grumbler −3 mood. 3 blocks/week: $146 garage → $439 world | **$839** / $452 | $1,130 / $144 | $1,295 / $293 |
| Monday cards (net) | `cards.js` (scan: 534 cards) | garage era: 151/318 cards have a $ choice, all optional; gains ≤ +$200 (wedding social +150, Xmas parties +150), costs ≤ −$250; later eras ±$1,500 | +$144 / +$136 | +$232 / +$905 | +$2,174 / +$1,551 |
| Label advance (cash part) | `labels.js:24,45`; `24_sim_labels.js:322-325`; `economy.js:167-168` | Gopherwood $1.5-4k, Monolith $8-16k (×0.85-1.15, + fans). 60% is held as the recording budget; the band gets 40% minus the 30% cut = **28% in cash**. Recoupable | 0 / $166 | $992 / $3,332 | $1,275 / $1,396 |
| Royalties | `24_sim_labels.js:917-935`; `economy.js:219-223` | units × $0.25 (EP) / $0.40 (album) × royalty (Gopherwood 0.5, Monolith 0.16, DIY 1) + streams × $0.0004 × royalty; recoup first, then the 30% cut | $2 / $8 | $39 / $390 | $242 / $5,091 |
| Licensing | `licensing.js:18-35`; `2c_sim_licensing.js` | $1.5-6k per offer, 2-4 per career from 400 fans; label cut 15-40% | 0 | 0 | ~$100-200 (avg years 4-6) |
| Patreeon | `29_sim_fans.js:427-440`; `bandbook.js:269-271`; `economy.js:306` | ≤ 60 members × $3 / $8 / $20 a month, −12%, paid every 2nd week | 0 / $5 | $184 / $255 | $499 / $901 |
| Loonies / Gong | `economy.js:238` (fundScale 0.15), `awards.js:38-49`; `economy.js:155` | Loonie win = reward × 0.15 → **$150-750**; Global Gong $5,000 | rare | rare | rare |
| Frugal recruit refund | `economy.js:117`; `27_sim_drama.js:322` | +$5/week | ~$10 | ~$10 | ~$12 |

## 3. Costs

| Flow | Where | Formula / numbers | Y1 | Y3 | Y6 |
|---|---|---|---|---|---|
| **Members' cut ("pay the band")** | `27_sim_drama.js:134-137`; `economy.js:99-101` | default **30% of gross gig pay** (also of BotB prizes, advance cash, royalties); 0-60% in 5% steps. Members expect 25% + 0.002%/fan (up to +10% by 5k fans); each point below costs 0.30 mood, so the default reads as underpay from about 2,500 fans (`27_sim_drama.js:252-256`). **Not shown on the gig result screen** | $268 / $811 | $1,236 / $4,737 | $3,073 / $9,862 |
| **Gas** | `26_sim_world.js:43,133-136` | max($5, km one-way × 2 × $0.25). From Saskatoon: Regina/Swift Current $120-123, Edmonton $264. Tier-1 net (mid flat − 30% − gas) turns negative past about 120-150 km (table in §5) | **$588 / $937** | $1,227 / $2,116 | $1,263 / $2,135 |
| **Upkeep** | `20_sim_career.js:1265-1268`; `economy.js:12-15,123` | ($22 + $0.012/fan [above 8k fans ×0.2] + era: garage 0, local 6, **signed 40**, world 50 + rent) × difficulty | $592 / $684 | $2,352 / $5,014 | $6,544 / $11,399 |
| ↳ split (avg bot) | | base / per-fan / era / rent | 528 / 39 / 22 / 0 | 528 / 771 / 887 / 139 | 528 / 2,960 / 995 / 2,004 |
| Rent (spaces) | `shop.js:59-98`; `2a_sim_shop.js:357-376,965-975` | tier 0 free; jam room $60/wk (Local Heroes); pro studio $150 (Signed); arena backstage $300 (World). First week's rent needed to move; **evicted one tier down after 2 wraps with fund < 2× rent** | 0 | in upkeep | in upkeep |
| Commission | `economy.js:131` (overrides the world default 0.2) ; `26_sim_world.js:454-459` | **15% of gross** in the Signed and World eras | 0 | $770 (incl. crew) / $3,611 | $2,110 / $6,760 |
| Crew | `economy.js:132`; `26_sim_world.js:460-464` | $150 per tier-3 show | 0 | (in above) | (in above) |
| Van: repair | `26_sim_world.js:63,526-530` | $3/condition point, +20 a visit ($60); wear 0.008/km driven + 0.3/trip | ~0 / $27 | $52 / $64 | $34 / $68 |
| Van: breakdown tow | `26_sim_world.js:481-489,503-505` | P = (1−cond/100)² × (0.2 + min(km,400)/300) × 0.5 × road × driver × vehicle; tow $60-140 (+3 burnout); never while garage-protected (< 250 fans) | $11 / $53 | $188 / $100 | $153 / $126 |
| Van: buy / upgrade | `shop.js:163-194`; `2a_sim_shop.js:459-484` | 15-pass $3,500 (local), Sprinter $6,500 (signed), bus $30,000 (world); trade-in 30% × condition (≥ $150); upgrades $80-2,000; card deal $3,000 at ≥ $4k fund | 0 | — / $3,437 | $803 / $733 |
| **Gear (same price every seat)** | `shop.js:30-46`; seat names `zz_seats.js:384-428` | lane 5 (toms / 5-string / drop-tune neck / jumbo frets) **$450**; lane 6 (ride / bass fridge cab = no lane / 7-string / 24 frets) **$350**; runs (double pedal / finger tape / chug glove / shred picks) **$300**; kit/amp tiers **$800** (garage) / $2,800 (local) / $9,000 (world); pawn-kit card $650 (needs a $1,100 fund). Score effect: +0 / 0.5 / 1 / 2 by tier, +0.25 per lane, +0.25 pedal (`economy.js:320`, `2a_sim_shop.js:327`) = **at most +2.75 on a 0-100 score; no direct $ return** | $8 / $80 | $711 / $2,130 | $562 / $1,529 |
| Space upgrades | `shop.js:100-162` | $30-4,000 | 0 / $1 | $46 / $2,173 | $1,197 / $5,352 |
| **Merch stock** | `2a_sim_shop.js:605-648`; `shop.js:201-246` | paid up front per box: stickers $80 (200), **shirts $192 (24)**, patches $200, hoodies $264, vinyl $300; first-merch card at week 4 (`cards.js:1799+`: shirts −$192 / stickers −$80) | $41 / $761 | $1,017 / $3,633 | $1,610 / $3,539 |
| Promote block | `activities.js:28` | −$25 per block | $167 / $74 | $194 / $109 | $198 / $197 |
| Fill-ins / ads | `economy.js:111-112`; `27_sim_drama.js:546-561` | fill-in $40 per gig per hole; Kijiji ad $30; repost $20 | ~0 | ~$35 | ~$18 |
| Studio | `labels.js:96-137`; `24_sim_labels.js:510-515` | studio $0 / $150 / $600 / $3,000 a week + producer $150-1,200 a week; the label budget pays first, DIY pays from the fund | 0 / $27 | $138 / $410 | $349 / $2,441 |
| Release promo | `economy.js:205-210` | posters $150, radio $900, TV $3,000 | in labels | | |
| Tours abroad | `world.js:33-45,167-192`; `25_sim_tour.js:278-287,361,745` | flights $550-1,150 per person + rental $300-1,200/wk + stay $0/350/1,000/wk + extra $900-1,200 | 0 | 0 | $514 / $3,205 upfront |
| Cards that cost | scan of `cards.js`, `road_cards.js`, `drama.js` | garage Monday choices up to −$250; road −$15 to −$200; ultimatums −$150/−180; licence scandal −$250; shop cards (pawn kit $650, van $3,000) | in net cards | | |

## 4. Start, broke, debt

- **Starting fund $300** (`economy.js:7`, `20_sim_career.js:947`) × difficulty (chill ×1.6 = $480, brutal ×0.6 = $180;
  `economy.js:353-357`). With $22 a week of upkeep that is about 13 weeks of runway with no income, and the week-1 board
  is exposure-only.
- **Broke = the parents' loan, never game over.** At each wrap, if fund < 0, the parents top it up to **$100**
  (`parentsCushion`, `economy.js:39`) and debt grows by the same amount (`20_sim_career.js:1309-1318`). There is **no
  interest and no due date**. While you owe, guilt cards appear with optional "repay $25-150" choices that never take the
  fund below $100 (`20_sim_career.js:692-699`, `cards.js:793-919`). The fund can go negative mid-week (cards, tows); shop
  buys are refused below their price. Rented spaces evict one tier down after 2 short wraps.
- "One bad week sinks you" therefore means: year-1 funds sit around $100-400 (avg-bot yearly minimum $119), so one
  −$120 card, a $60-140 tow (after 250 fans) or a far gig's gas tips the fund below zero, and a loan plus guilt cards
  follow.
- Difficulty also scales gig pay (`money`: chill ×1.2, brutal ×0.85; `22_sim_gig.js:170`), hustle and upkeep.

## 5. Gig pay, piece by piece

**Per gig, measured** (avg bot / good bot, mean per gig):

| | Y1 | Y3 | Y6 |
|---|---|---|---|
| gross | $66 / $118 | $327 / $748 | $754 / $1,524 |
| − members' cut 30% | −$20 / −$35 | −$101 / −$227 | −$246 / −$457 |
| − gas | −$45 / −$41 | −$101 / −$101 | −$101 / −$99 |
| − commission + crew | 0 / −$1 | −$63 / −$173 | −$169 / −$313 |
| = **kept** (also minus tows) | **$0 / $38** | **$46 / $243** | **$231 / $648** |
| one Hustle block, same era | $75 | $165 (signed) | $165-225 |

**Expected home-area pay by fan level** (mid of pay range, best rooms ≤ 150 km, Hail Damage/Saskatoon; scratch `paytable.js`):

| fans / era | best rooms (gross → net after 30% cut, commission, crew, gas) |
|---|---|
| 60 / garage | Legion 63 flat $80 → $51; most other listed rooms are exposure (median listing nets −$5) |
| 150 / garage | Potash Xmas party $290 → $198 (holiday); Gopher Hole door $178 → $119 |
| 300 / local | Gopher Hole door $295 → $202; Bassborough $296 → $202 |
| 1,000 / local | Bassborough door 360 × $2 = $720 → $499; Club Permafrost (full, 300) $600 → $415 |
| 3,000 / signed | Bassborough (full) $800 → **$435 (less than at 1,000 fans: commission)**; Northern Gateway (t3) $1,000 → $329 |
| 8,000+ / signed-world | Riverbend (t3, full 2,000) door $1,800 → **$835 (the home ceiling)** |

Grid Road Ramblers (Swift Current) has more paid starter rooms (net $37-58 at 60 fans) but the same ceiling shape
($505 at 8k+).

**Tier-1 rooms vs distance** (scratch `gas.js`; net = mid flat × 0.7 − gas): Saskatoon home rooms +$51..65, Humboldt
(113 km) +$24 / −$6, Prince Albert (141 km) −$15, Moose Jaw (220 km) −$47, Regina (239 km) −$43..−$120 (exposure),
Edmonton (528 km) −$194..−$264. The board lists at most 1 far-ring gig a week (`26_sim_world.js:53,305`); bots
still average 83 km a gig in year 1 because the board's value weighs fans heavily.

**Why it feels off (ranked):**
1. **Not tied to play.** Pay and attendance are fixed before the set. A better grade only buys indirect money: merch
   (×0.45 at D to ×1.3 at S) and venue rep (S +2, A +1, D −2), which raises *later* listings at that room by 6% per
   level (up to +18%; `26_sim_world.js:44-46,255`). Probe: year-1 pay by grade was B $65, C $45, D $24 per gig, which tracks
   room size, not your score. In the no-hustle probe a D paid $114 and a B $100.
2. **The 30% cut is invisible.** You see "Pay $100", the fund rises about $65, then gas comes off. Only the band
   screen shows the split (`58_ui_band.js:74`).
3. **Flat fees don't scale.** A $80-120 bingo hall pays the same with 25 or 80 people; tier-1 door is $1-2 a head on
   60-130 capacity.
4. **Gas eats small rooms**, and exposure gigs cost gas for $0.
5. **Hustle beats gigs early.** One Hustle block (a third of a week, no travel) ≈ one whole tier-1 gig net. The Hustle
   multiplier rises to ×3 by the World era while gig pay is capped by capacity.
6. **Moving up can pay less.** Tier-3 door per head is below tier 2; signing adds 15% commission and $150 crew; the
   same full ballroom nets $499 before signing and $435 after.
7. **The ceiling.** Fans beyond capacity add $0 in pay; the home ceiling is about $835 a gig (the late-game plateau
   from the back-burner list).

## 6. What makes years 1-2 tight (ranked by $ impact in the probes)

| # | Squeeze | Size (year 1, avg / good bot unless noted) |
|---|---|---|
| 1 | Gigs net about $0 (cut + gas ≈ gross) | gig net $22 / $867 a year; no-hustle player $590 against $614 upkeep + $337 shop |
| 2 | Gas | $588 / $937 (larger than the cut) |
| 3 | Fixed upkeep on a tiny income | $592 / $684 (y1) → $1,230 / $2,217 (y2: Signed +$40/wk, per-fan, rent) |
| 4 | Prices vs earnings | toms $450 ≈ 10+ kept gigs; kit $800; first shirt box $192 at week 4 (fund ≈ $300); good bot y1 spent $761 on stock for $664 back |
| 5 | Exposure-only start | week-1 board = open mic / house party / basement ($0); paid rooms need 25-90 fans; avg bot plays 7 exposure gigs in y1 |
| 6 | Shocks on a thin cushion | card costs ≤ −$250, road −$15…−$120, tows $60-140 (after 250 fans), ultimatums −$150/−180; fund minimum ≈ $110-120 |
| 7 | Signing in year 2 adds bills before income | +$40/wk, 15% commission; cash advance ≈ $416 avg y2; avg y2 commission + crew $168 |
| Result | parents' loan in year 1 / 2 / 3 | avg 28% / 13% / 4%; good 8% / 4% / 0%; **no-hustle player 69% / 42% / 23%**; weeks under $100: avg 2.0, no-hustle 3.6 |

**Mid/late game is not tight** (do not add money there): avg-bot fund at year end $404 → $1,263 → $2,345 → $3,788 →
$4,070 → $4,578 (years 1-6); good bot $793 → $7,274 while spending $9-11k a year in the shop from year 3. From year 4
on, loans are ≤ 1% of career-years.

## 7. Seats: drums vs bass (owner follow-up 2026-10-06: "Drums felt worse tbh")

**Rules: identical.** No money rule reads the seat (grep of 20/22/24-29/2a/2c). Gear prices and eras are the same on
every seat (owner E14b). The swapped drummer is an ordinary member, so the 30% cut is the same. Gig score feeds
grade → fans / merch / rep / BotB, never the fee.

**Where the drum gap comes from (the playing):**

| | drums | bass | rhythm | lead | source |
|---|---|---|---|---|---|
| judged notes/s, starter set, Hard: Hail Damage | **5.97** | 3.13 | 2.50 | 3.34 | scratch `density.js` (real `gig.session` charts, seed 11) |
| Frost Heave | **11.35** | 3.63 | 3.27 | 4.13 | |
| Gravel Kings | **6.10** | 3.17 | 2.59 | 3.05 | |
| Grid Road Ramblers | **7.40** | 1.28 | 2.04 | 2.30 | |
| items to fill the highway | toms $450 + ride $350 + pedal $300 = **$1,100** (6 lanes + doubles) | 5-string $450 + finger tape $300 = **$750** (the $350 fridge cab adds no lane; max 5 lanes) | $1,100 | $1,100 | `shop.js:30-35`, `02_contracts.js:88` |

The gig score is 72% live (note score = 100 × hit-quality^1.5, plus crowd) + 28% band numbers (`22_sim_gig.js:229,993`).
Twice the notes at the same reflexes means a lower hit quality, a lower grade and fewer fans. Fans set crowd, door pay,
which rooms list you and merch. The fee itself never shows the gap, so it reads as "money is worse on drums".

**What one grade step is worth** (scratch probe: gig score −10 / base / +10 on drums + bass, 4 bands × 6 seeds, years 1-3):

| | grades (S A B C D %) | fans y1 (med) | gig gross y1 | gig net y1 | merch y1 | fund end y1 (med) | y1 loan |
|---|---|---|---|---|---|---|---|
| avg bot −10 | 0 1 18 57 24 | 225 | $636 | −$115 | $7 | $277 | 38% |
| avg bot base | 0 11 52 36 1 | 343 | $859 | $12 | $12 | $404 | 29% |
| avg bot +10 | 6 40 49 5 0 | 446 | $1,306 | $287 | $70 | $643 | 21% |
| good bot −10 | 0 3 34 52 11 | 446 | $1,641 | $264 | $168 | $410 | 10% |
| good bot base | 1 28 50 20 0 | 729 | $2,732 | $882 | $689 | $829 | 10% |
| good bot +10 | 20 50 28 1 0 | 1,222 | $3,736 | $1,456 | $1,483 | $1,246 | 2% |

Year 3, good bot: −10 → fund $3,140 / base $3,542 / +10 $4,777. The grade effect keeps compounding through fans.

**Bots at equal accuracy (no human factor): no seat gap.** The per-seat spread below is seed noise (24 careers per cell;
v1.1 LIVE BOTS also had song scores within ±2.4 points per seat, `plan/balance_v11_seats.txt:1546+`):

| seat (avg bot) | y1 fund end (median) | y1 loan years | y1 gig net | y3 fund end | y6 fund end |
|---|---|---|---|---|---|
| drums | $451 | 25% | $44 | $3,044 | $3,713 |
| bass | $375 | 33% | −$19 | $2,139 | $5,259 |
| rhythm | $386 | 29% | −$31 | $2,565 | $5,034 |
| lead | $653 | 25% | $95 | $2,345 | $5,026 |

Good bot, y1 loan years: drums 8%, bass 13%, rhythm 4%, lead 8%. No-hustle player, y1: drums 63%, bass 75%. For
equal play the early squeeze is the same on both seats (gas + cut + no Hustle). For a human, drums sit about one grade
lower, which costs about $400 of year-1 fund plus slower fan growth.
Implication for fixes: money that ignores the grade (start fund, gas, cut, Hustle) helps both seats equally and leaves
the gap. Only something on the drum side closes it: a drum-chart difficulty or window review, a grade-linked pay term,
or drum gear priced to its extra lane.

By band (avg bot, y1 loan years): Frost Heave 50%, Grid Road Ramblers 46%, Hail Damage 13%, Gravel Kings 4%. Regina
and Swift Current boards pull more far gigs (gas $730-756 against Edmonton's $356).

## 8. Knobs a fix could use (for the options step; nothing decided here)

Early-only levers keep years 3+ unchanged: `startFund` (`economy.js:7`); `gasPerKm` / `gasMin` (`26_sim_world.js:43`,
overridable from `economy.world`); the garage/local Hustle multiplier (`economy.js:124`); tier-1/2 `payRange`
(`venues.js`); exposure rooms on the first boards; `parentsCushion` (`economy.js:39`); the first-merch card price;
`eraUpkeep.signed` / `commission.signed` (`economy.js:123,131`).
Drum-gap levers: drum-seat note density / timing windows (`22_sim_gig.js:209-229` LIVE, difficulty thinning),
fan conversion by grade (`economy.js:65`), drum gear prices (`shop.js:30-35`; bass pays $750 for a full rig, drums $1,100).
"Feels fair" levers: a grade term in `gig.payFor` (`22_sim_gig.js:121`; touches played, simulated and bot gigs alike);
the cut taken off the net instead of the gross; showing the cut on the result screen (`55_ui_gig.js:1113`; a text
change, not a feature); tier-3 door $/head.
Watch: `tools/balance.js` targets (Local Heroes ≈ end of year 1, signed by year 2-3, World ≈ year 5-6). Hustle
multipliers feed the late game (×3 in the World era).

## 9. Method / reproduce (scratch only; repo untouched)

- `scratchpad/drv/moneyprobe.js <years> <seeds> <bands|all> <seats> <styles> [out.json]` wraps the sim entry points
  (resolveCard, *.botWeek, *.weekly, studioWeek, autoTrip, shape, applyResult, afterGig, runWeek, endWeek, repairVan)
  with exclusive fund-delta accounting. Residual is 0 for every career-year (every dollar is attributed). `PLAN=a,b,c`
  fixes the weekly plan (the no-hustle player); `OVR='{"content.economy.startFund":450}'` overrides numbers in-process.
- `scratchpad/drv/agg.js *.json` prints the tables used here (raw output: `scratchpad/drv/agg_main.txt`).
- `paytable.js`, `gas.js`, `cards.js`, `shopcards.js`, `density.js` give the static tables; `PERF=±10` (gig score shift)
  + `cmp.js` give the grade-sensitivity table. Runtime: about 4 minutes for 192 six-year
  careers on 4 cores.
- Caveat: bots are not the owner. The avg bot hustles about 11 blocks a year in year 1 and books gigs by fan value, so
  it drives far. The no-hustle probe is closer to a player who mostly rehearses, writes and gigs.
