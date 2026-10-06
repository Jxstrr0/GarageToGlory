# v1.4 money: critic report (read-only review of money_map.md, probe_baseline.md, proposal.md)

Nothing in `/home/user/GarageToGlory` was edited. Experiments ran in scratch worktrees (`scratchpad/crit_base`, `crit_A`,
`crit_B9` = B as measured, `crit_B` = B with D x1.0, `crit_C`, `crit_Bp`; options applied with the proposal's own
`v14/opt/apply_opt.js`). Scripts and raw output: `scratchpad/v14/crit/` (`human.js` persona driver, `hsum.js`,
`h/*.json`, `y6/*.json`, `htable.md` = the full persona table, `tests_Bp.txt`).

## 0. Verdict

- **The proposal's numbers are real.** Every number I re-ran matched (section 1). Option B is safe for years 3+ and
  fixes the squeeze **for the bots**.
- **The bots are not the owner.** The avg bot earns its year-1 cash from Hustle (about 11 blocks, $790, as much as all
  of its year-1 gig pay) and buys gear late (it keeps a $900 cushion). "Always broke, can't afford gear/rent" fits
  a gig-first player: little Hustle, buys gear as soon as the fund allows, takes the $60/wk jam room when the Monday
  card offers it. For that player **no option fixes year 1**, and **B fixes bass much more than drums** (section 2),
  which is the opposite of Addendum 7's "fix drums first".
- **Grade pay doesn't address "gig pay feels off".** Early grades are mostly B/C, so the S/A bonus rarely fires
  (human-drummer proxy 0-1% A/S in year 1, bass about 15% A). At equal accuracy drums grade lower than bass, so the
  bonus pays drums less (the proposal's own table: $358 vs $394). It also switches off at signing, a pay cliff.
- **What closes most of the gap for a gig-first player without making hustlers rich:** the early-only levers pushed a
  bit harder, plus less Hustle cash before signing ("gigs up, side jobs down"). Measured as **B+**: section 2 and the
  popup.

## 1. Spot-checks (re-run with the proposal's driver and seeds; Hail Damage, 40 seeds)

| check | proposal | re-run |
|---|---|---|
| base drums avg: Y1 loan / broke wks / fund Y1 / fund Y3 | 25% / 1.4 / $410 / $2,160 | 25% / 1.4 / $410 / $2,160 |
| B (D x0.9) drums avg: Y1 loan / broke / Y1 fund | 5% / 0.8 / $608 | 5% / 0.8 / $608 (`drive.js`, upper-middle median $633) |
| B h12 (drums, one grade lower): Y1 loan / broke / Y1 fund / Y3 fund | 5% / 0.9 / $552 / $1,606 | 5% / 0.9 / $552 / $1,636 |
| B bass avg: Y1 loan / broke / funds Y1-Y3 | 3% / 0.8 / 684 / 1,258 / 2,761 | 3% / 0.8 / 684 / 1,258 / 2,761 |
| base years 4-6 (drums avg, good; bass avg, good) | 3190/5290/4188; 5146/4520/8233; 3686/4173/4649; 5430/4941/6067 | identical |
| `optB.diff` vs `apply_opt.js` output | | same edits (the diff spells out the neutral x1 entries) |
| test failures B (proposal section 7) | sim_gig fingerprint, sim_world gas + flat range | confirmed from `opt/tests_B.txt` |
| full node suite on B+ (code + content, without the Hustle trim) | | the same 3 failures as B, seat leak scan passes (`crit/tests_Bp.txt`); the Hustle trim adds `sim_career.test.js:264` (by reading the test) |

## 2. Do the numbers show the squeeze the owner feels?

The bots don't feel it much: 1.4-2.6 broke weeks of 24 in year 1, lowest fund about $80. The owner says "always
broke". Persona probe (`crit/human.js`, the avg bot with one habit changed; drums at -12 performance = the proposal's
h12 "one grade behind" human drummer; bass at 0):

- **P0** = the avg bot (it Hustles).
- **P5 gig-first** = never Hustles; other choices are the bot's.
- **P3** = P5 + buys the next lane/pedal item when fund - price >= $100.
- **P1** = P3 + moves into the jam room ($60/wk) once it opens with a $250 fund (only the landlord evicts).
- **P2** = Hustles like the bot + eager gear + jam room.
- **P4** = jam room only.

Year 1: parents' loan (% of careers) / weeks under $100 (of 24). Last column: band fund at the end of year 3 (median).

| persona | seat | base | A | B | **B+** | C | Y3 fund base / B / B+ / C |
|---|---|---|---|---|---|---|---|
| P0 bot (hustles) | drums (h12) | 48% / 3.1 | - | 5% / 0.9 | 3% / 0.8 | 0% / 0.0 | 1061 / 1523 / 1129 / 2626 |
| P0 bot (hustles) | drums | 25% / 1.4 | 20% / 1.8 | 5% / 0.8 | 0% / 0.5 | 0% / 0.1 | 2160 / 2881 / 2512 / 2935 |
| P0 bot (hustles) | bass | 30% / 1.9 | 28% / 1.0 | 3% / 0.8 | 0% / 0.5 | 0% / 0.1 | 1858 / 2761 / 3112 / 3014 |
| **P5 gig-first** | **drums (h12)** | **98% / 11.8** | - | **83% / 7.4** | **53% / 4.5** | 33% / 3.5 | 603 / 513 / 672 / 1425 |
| **P5 gig-first** | **bass** | **95% / 9.0** | - | **40% / 5.2** | **40% / 3.5** | 25% / 1.6 | 913 / 1445 / 1964 / 2427 |
| P3 gig-first + eager gear | drums (h12) | 100% / 11.9 | - | 100% / 10.9 | - | 98% / 10.0 | 418 / 624 / - / 1179 |
| P3 gig-first + eager gear | bass | 95% / 9.8 | - | 95% / 8.7 | - | 85% / 7.8 | 717 / 1602 / - / 2489 |
| P1 + jam room | drums (h12) | 100% / 11.9 | 100% / 12.8 | 100% / 10.9 | 90% / 9.8 | 98% / 10.0 | 206 / 303 / 336 / 444 |
| P1 + jam room | bass | 95% / 9.7 | 100% / 11.1 | 95% / 8.9 | 88% / 8.0 | 88% / 8.0 | 535 / 885 / 569 / 832 |
| P2 hustles + gear + jam | drums (h12) | 57% / 4.1 | 38% / 4.3 | 30% / 3.2 | - | 15% / 3.2 | 594 / 589 / - / 886 |
| P2 hustles + gear + jam | bass | 48% / 3.0 | 45% / 4.0 | 8% / 3.1 | - | 13% / 2.5 | 1061 / 1644 / - / 1416 |
| P4 jam room only | drums (h12) | 48% / 3.1 | - | 3% / 0.9 | - | 0% / 0.0 | 633 / 708 / - / 875 |

(B here = the recommended D x1.0. "-" = not run. B+ is defined in section 5. Full table with Y2/Y3 loans, gear weeks,
evictions and grades: `crit/htable.md`.)

What this shows:

1. **The missing Hustle is what decides year 1**, not the seat. Base: a gig-first player borrows in 95-98% of careers
   and spends 9-12 of 24 weeks under $100. That matches "always broke". Hustle is about $73 a block against $0-23 net
   per year-1 gig, and the bots lean on it. The proposal never measures a low-Hustle player (the money map's no-hustle
   probe, 69% loans, was not re-run on the options).
2. **B helps bass a lot more than drums for that player:** bass 95% -> 40% (9.0 -> 5.2 weeks), drummer 98% -> 83%
   (11.8 -> 7.4). The drummer is a grade behind: smaller crowds, fewer paid rooms, fewer fans. Flat early money can't
   close that. B+ gets the drummer to 53% / 4.5 weeks. Only C does better (33%), and C leaves hustlers never broke.
3. **A start-fund raise is spent on day one.** With $400 (A, B) a player who buys gear eagerly takes the $250-300
   pedal in week 1 (P3 first gear: base week 40, A/B/C week 1). The cushion never forms. A even made P1 worse than
   base (4.0 vs 3.5 loans a year). Cheaper gear helps the shop feel; it does not cure "broke".
4. **Rent:** a Monday card ("A Room of Your Own", `cards.js:1865`) offers the jam room at $60/wk, and staying home
   costs Marcel mood. A gig-first player who takes it stays broke into year 3 in every option (P1 Y3 loans 63-90%,
   about 2 evictions per career). Bots seldom rent (5-15%). No option touches rent. A hustling player can carry it
   (P4: B 3%).
5. **Gear:** the bot's "affordable" week (fund >= rig + $100) is not "can buy and stay afloat". Eager buyers in base
   get a first item at week 38-40 (drums h12) and 30-33 (bass): "can't afford gear" is real for year 1.

## 3. Bass AND drums per option

- **Bots (equal accuracy):** every option except A fixes both seats (B 5% / 3%). That is the proposal's claim, and it
  holds.
- **Human drummer vs bassist (gig-first):** A no; B fixes bass only (40% vs 83%); B+ closes most of it (53% vs 40%);
  C fixes both, but hustlers never go broke. The **year-3 gap stays in every option** (h12 bot Y3 = 36-87% of bass),
  because its cause is the chart (1.96x the notes; at equal hit share drums also grade lower: fixed hands 1S 5A vs
  bass 4S 2A, D1). **"Fix drums first" needs the drum-chart / drum-grade item.** The proposal parks it as a separate
  item. It should be in v1.4, and the popup should say drums will still trail until then.
- **Grade pay is anti-drum** (drums grade lower at the same accuracy). Keeping D x1.0 avoids docking the drummer, but
  the S/A bonus still goes mostly to bass. Either key the bonus to something density-neutral (the crowd meter is
  already normalised by notes/s, `22_sim_gig.js` `densityRef`) or fix the drum grade bias first.

## 4. Years 3+ (fund runaway?) and pinned tests/targets

- **No runaway in A or B.** B: Y3 +33-49% (avg bot), then Y4-10 within seed noise (10-year means even lower at Y10).
  B+ 6-year check (`crit/y6/`, 40 seeds), base -> B+:
  - drums avg Y4-6: 3190/5290/4188 -> 3753/4822/4392
  - drums good Y4-6: 5146/4520/8233 -> 6173/4707/6940
  - bass avg Y4-6: 3686/4173/4649 -> 4049/4603/5113
  - bass good Y4-6: 5430/4941/6067 -> 5906/6139/7105 (+17%, the edge of noise)
  - 0 broke weeks Y4-6 in both
- **C is the one that drifts:** signed upkeep -$10 and tier-2 x1.1 are permanent. Weak-bot Y3 is +115%, and hustling
  bots never go broke in year 1 (0.1 weeks). That is "comfortable", as the proposal says.
- **The baseline is already easy from year 3** (0 broke weeks, 0-5% loans, funds $4-8k by year 6). D5's goal is
  "years 3-10 scrappy". Every option adds to year 3. Worth saying so to the owner; it is not caused by this change.
- **Pinned tests:**
  - All options:
    - `sim_gig.test.js:742` 1.3.0 fingerprint. It pins "played gigs byte-identical to 1.3.0", a v1.3.1 guarantee.
      Re-pin it deliberately, and fold `gradePaid` into an existing flag so "a played result gains no field" stays
      true.
    - `sim_world.test.js:26` gas.
  - B/C/B+: `sim_world.test.js:54` (flat range).
  - C only: `sim_shop.test.js:89` (toms $450) and `sim_drama.test.js:252` (cushion 100).
  - The Hustle swap in B+ also breaks `sim_career.test.js:264` (garage hustle $50-100).
  - A found a latent lead-seat content leak; fix it either way.
  - Pace targets hold in every option (Local Heroes wk 20-22, signed 41-44).
  - `balance.js` 10-year legacy line: the good bot's Arena Legends share is 15-25% in base and in every option. That
    target misses in the drums-only 10-year run before any change, so it is not a regression.
- The build should apply `tierPay` in `makeGig` (card bookings) as the proposal says. That moves numbers slightly and
  may touch more `sim_gig` pins that use fixed card pay.

## 5. Is "gig pay feels off" addressed?

Partly. What helps:
- the band's cut shown on the result screen (U1; today "Pay" is gross, `55_ui_gig.js:1114`)
- gas relief on exposure gigs
- small rooms paying more: a paid tier-1 gig nets about one Hustle block in B

What does not:
1. **Grade pay is mostly invisible** (B and C grades get x1.0; early play is mostly B/C) and it **stops at signing**.
   The player learns "a great show pays more", then it silently stops.
2. **Gig vs other income is still lopsided:** year-1 gig net per gig is B $20-48 vs Hustle $73/block. The owner asked
   for gig pay "fair for the work vs other income". The proposal only adds to gigs; it never trims the side job.
3. **Tier 1 x1.4-1.6 overlaps tier 2** (tier-1 flat up to $210-240 and door $1.4-3.2/head vs Prairie tier-2 flat
   $100-300 and door $1.5-3). The first tier-2 rooms can pay less than the best tier-1 rooms: a new "moving up pays
   less" spot.

**B+** = B (D x1.0) with the early levers pushed and Hustle trimmed before signing:
- start $450
- tier-1 pay x1.6
- gas x0.5 in the garage era, x0.8 at Local Heroes
- exposure gigs cover $40 of gas
- grade pay S 1.25 / A 1.1 / B, C, D 1.0 (garage + Local Heroes)
- ride $200, pedal $250
- **Hustle era multiplier garage 0.7 (was 1), local 1.0 (was 1.3)**; signed and world unchanged

Measured:
- Year 1 (gig-first): drums h12 53% / 4.5 weeks, bass 40% / 3.5.
- Year 1 (hustlers): 0-3% / 0.5-0.8 weeks (scrappy, not flush).
- Year 3: like B.
- Years 4-6: within noise.

It is still all early-only and content-plus-mechanism. It makes a gig worth about one to one-and-a-half Hustle blocks
early, instead of a fraction of one.

## 6. Issues (most important first)

1. The proposal's headline (year-1 loans 35% -> 5%) is a bot result. For a gig-first player B leaves year 1 broke
   (drummer 83% loans, 7.4/24 weeks under $100). The owner's "always broke" matches that player, not the bot.
2. "Fix drums first" (Addendum 7) is not met by any option. B widens the drums-vs-bass gap for the gig-first player
   (83% vs 40%). The drum chart / drum-grade bias is the cause and is left out of every option.
3. Grade pay is anti-drum (drums grade lower at equal accuracy), nearly invisible early, and cut off at signing.
   It does not make pay feel tied to the show.
4. Gig pay vs Hustle is not rebalanced. The owner's "fair vs other income" needs Hustle trimmed early as well as gigs
   raised. B+ does that.
5. The start-fund raise gets spent on gear in week 1 by an eager buyer, so the cushion never forms.
6. The jam room ($60/wk, pushed by a Monday card) keeps a gig-first player broke into year 3 in every option. It is
   not measured or tuned. Bots seldom rent.
7. Tier-1 x1.4-1.6 overlaps tier-2 pay (a new "moving up pays less").
8. The pinned test list is right. Add `sim_career.test.js:264` if Hustle is trimmed. The 1.3.0 fingerprint re-pin
   changes a v1.3.1 guarantee and should be called out.
9. The baseline years 3+ are already easy (D5 wants them scrappy). Every option adds to year 3. Not a regression,
   but tell the owner.
10. Proxies: the drummer proxy = -12 performance (one grade), the bass proxy = 0. Real hands may differ. The owner's
    playtest is the real check.

## 7. Method

- `crit/human.js <worktree> <seat> <seeds> <years>`, with these env switches:
  - `NOHUSTLE`, `EAGER` (`KEEP` = $100 kept), `JAM` (`JAMAT` = $250)
  - `PERF`
  - `TIPS` (tip-jar what-if: S60/A45/B30/C20/D10 on exposure gigs. It added only $10-15 net per gig and did not
    change the gig-first year 1.)
  - `OVR` (in-process content overrides, used for the Hustle multipliers)
  - `STYLE`
- `crit/hsum.js h` builds the table.
- Seeds: seed x 7919 for seeds 1-40 (the same as `bp/drive.js`). The P0 rows reproduce `drive.js` exactly.

## 8. Owner popup (proposed)

**How should early money work? (Years 1-2 only.)**

How the numbers are measured:
- They are for year 1, for a player who mostly gigs and seldom takes side jobs (Hustle).
- Each pair is: how often you end up borrowing from your parents, then weeks under $100 out of 24.
- "Drums" assumes you play the kit about one grade below bass.
- Today: drums 98% / 12 weeks, bass 95% / 9 weeks.
- In every option drums still trail bass a little until we ease the drum chart. That is a separate fix.

1. **Gigs pay, side jobs pay less (recommended).**
   - What changes:
     - Start with $450.
     - Small rooms pay 60% more.
     - Gas is half price until Local Heroes and 20% off until you sign.
     - Open mics cover your gas.
     - A great show pays up to 25% more, and nobody is docked.
     - Ride $200, pedal $250.
     - Hustle pays 30% less until Local Heroes and gets no raise there.
     - The results screen shows the band's cut.
   - Drums 53% / 4.5 weeks; bass 40% / 3.5.
   - If you Hustle a lot: about 0% / 0.5 weeks.
   - Year 3 is a bit richer; years 4-6 are unchanged.
2. **Early gigs pay their way (the first draft).**
   - Same idea, but smaller: $400 start, small rooms pay 40% more, gas 40% off until Local Heroes.
   - Hustle is unchanged.
   - Drums 83% / 7.4 weeks; bass 40% / 5.2. Fixes bass much more than drums.
   - If you Hustle a lot: 5% / 0.8 weeks.
3. **Comfortable start.**
   - What changes:
     - Start with $500.
     - Small rooms pay 60% more and mid rooms 10% more, for good.
     - Gas is half price.
     - Toms, ride, pedal and kit are cheaper.
     - Being signed costs $10 a week less, for good.
   - Drums 33% / 3.5 weeks; bass 25% / 1.6.
   - If you Hustle, you are almost never broke (0.1 weeks). Later years are slightly richer for good.
