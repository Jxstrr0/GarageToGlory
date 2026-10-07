# v1.4 "Tuning" integration report (verifier, branch `v1.4-tuning`, 2026-10-07)

Verify run 00:14-02:16 UTC (a container restart at ~00:12 cut the first verifier; nothing of that run was used).

**Verdict: green except one layout finding.** Node suite ALL PASS; Classic audio 232/232; compat_v12 + save green; size
5,244,808 B; phoneqa ALL PASS at both sizes; every Playwright section passes at 440x956 and every section but `pw_hof list`
passes at 390x844 (first-run failures were timing under two parallel browsers and passed alone twice, plus one test whose
expectation M1/M3 moved, fixed and logged). `pw_hof list` at 390 exposes a latent Hall of Fame overflow (finding 1, a source
fix for the lead). Owner shots 01-05 (+05b) taken at 440x956 and looked at: the money row, same grade/pay on drums and bass,
the $35 jam room, ride $200 / pedal $250 and an early-year fund all read right.

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
- Full Playwright matrix: every META_ONLY section of every `tests/pw_*.js` (118 per size, incl. the contact sheets and the
  opt-in `pw_bands_render seats`), two streams in parallel (390x844 + 440x956), 00:15-01:39 UTC, logs in the verifier scratch
  `v14m/logs/`. First run: **390: 108 PASS + 4 contact sheets OK** (creator / logo / shop / tour sheets have no checks: exit 0,
  sheet written) **+ 6 FAIL; 440: 112 PASS + 4 sheets OK + 2 FAIL.**
  v1.4 sections green first time at both sizes: `pw_gig gig` 33/33 (results money row), `pw_gig simulate` 21/21, `pw_shop space`
  22/22 ($35 + "$60/week once you sign"), `pw_shop spaces` 17/17, `pw_flow layout` 34/34, `pw_bands_render` 106/106 + seats 46/46.
  Reruns alone, twice each, nothing else running:
  - 390: `pw_seq audio` (first run: the van ambience wait timed out at 4 s) 42/42 twice; `pw_seq heavy` (xRT 0.84) 22/22 twice;
    `pw_seq genres` (punk xRT 0.99) 25/25 twice; `pw_gig e2e` (Skip the drive gone before the click) 15/15 twice: timing under
    two parallel browsers (the same kinds as the v1.3.1 run's first-run failures: render speed and van timing). `pw_recap bands`: fixed test, 15/15
    twice (section 4). `pw_hof list`: fails the same way twice (deterministic: finding 1).
  - 440: `pw_seq heavy` (xRT 0.84) 22/22 twice; `pw_recap bands`: fixed test, 15/15 twice.
  - The 4 contact sheets re-ran clean (exit 0) both times at both sizes.
- pw_perf (scenes, governor, ratio, stalls, audio, pre, quick), alone, one size at a time after the streams: **440: 7/7 PASS**;
  **390: 6/7 first time**, `pre` failed "no build slice over 8 ms" (punk 10.8 ms wall) with the load average still ~4 from
  the streams, then alone: fail once more (another budget: metal KS warm 338 ms CPU > 300), then **4 passes in a row**. No
  audio or render code changed in v1.4 (Classic hash 232/232), so this is the CPU-budget noise of the 4x-throttle trace.
- `tools/phoneqa.js` (insets, Bigger text, 44/48 px, no horizontal overflow, console errors): **ALL PASS 390x844** and
  **ALL PASS 440x956** (the same screen list as v1.3.1, every screen ok both with and without Bigger text).

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

## 4. Test moved by this verify (logged in its commit)
- `tests/pw_recap.js` `bands` (commit 1ea1959): with the v1.4 money (M1) and the $35 jam room (M3) the avg bot in the test
  career (quickStart seed 7171, Grid Road Ramblers, 24 bot weeks) now rents the jam room in week 19 (fund $1,018; 1.3.1 stayed
  in the Quonset all year). A rented room is posed on the garage footprint by design (`5l_ui_recap` photoKind), so "posed in
  its own quonset" compared 'garage' with 'quonset'. Before: expected = the band's home kind always (14/15 at 390 and 440).
  After: 'garage' when spaceTier > 0, else the home kind (15/15). No source change.

## 5. Findings (for the lead; not fixed here: source changes)
1. **MAJOR (layout, 390x844): Hall of Fame entry overflows when the biggest room has a long name.** `pw_hof list` fails at
   390x844 (deterministic; passes at 440): "entry layout overflow SPAN 95..393; hscroll sheet-body". The span is the "Biggest
   room" value "Lucky Buffalo Casino Showroom (950)" in `hof-stats` (`src/5q_ui_hof.js:120-124`), which `.line-list > div >
   span:last-child { white-space: nowrap }` (`src/00_shell.html:305`) keeps on one line, 3 px past a 390 screen, so the sheet
   scrolls sideways. Latent since v1.0 (CSS unchanged in v1.4); v1.4 money exposes it in the test: the seeded good-bot
   Hail Damage career (seed 777, 50 weeks, `pw_hof` seedMeta) now plays the Lucky Buffalo (cap 950; 1.3.1: The Broadway
   Bijou, 550). A real player whose best room is that casino sees it on a 390 phone too. Suggested fix: let that one value
   wrap (e.g. the stats row's value `white-space: normal; text-align: right; min-width: 0`), then re-run `pw_hof list` at both
   sizes; the test itself is right and should not move.
2. **Watch (balance, from `probe_after.md`, unchanged by this verify):** year 3 is richer for the bots (11 of 12 cells up,
   avg bass +39%); the 10-year `tools/balance.js` good bot shows Y4 +34% (it carries the Y3 savings; Y5-10 within noise);
   net into the fund per gig drops $47-58 at signing (the 1.3 15% management commission, no longer masked); a gig-first
   player who buys gear in week 1 and rents the jam room is still broke in year 3 (45-78% loans). Owner's playtest is the check.
3. **Minor, test fragility (not a bug):** two bot-driven pw tests depend on the bot's money path (pw_recap `bands`: fixed
   here; pw_hof seedMeta: finding 1). Any later money change can move them again; they now say why in their messages/comments.
4. **Cosmetic, pre-existing (not v1.4):** the laptop Money tab labels the start baseline "W0" (`20_sim_career.js:984` pushes
   a week-0 history point; `53_ui_laptop.js:82` prints it), visible in 05b.

## 6. Next
- Lead: fix finding 1 (or accept it), then owner check with the 440x956 shots (verifier scratch `v14_owner/`), review, PR.

## 7. Review fixes (fixer, 2026-10-07; commits 50194e3 2cc7b57 4fa4464 a383a53 c74fe1d b707cbf a1316ed + this one)

Review: 2 confirmed (major) + 6 minor (two are the same BotB line). All fixed or answered; plus integration finding 1 (the
Hall of Fame overflow), which the money fix pushed to 440 as well.

| finding | what was wrong | fix | test |
|---|---|---|---|
| **C1 (major)** early help on a fixed 24-week clock from Local Heroes | `career.earlyMoney` ignored signing: in half the gig-first drum careers (18 of 36) the 80% gas and the S/A bonus were gone before they signed; owner M1 says "80% until signed" | `earlyMoney = clamp((min(LH + 48, signed + 12) - week) / 12, 0, 1)`: full through the garage and Local Heroes eras, a 12-week fade after signing (the first 'signed' / 'world' eraHistory week, so a deal and a DIY album alike; else milestones.signed), a 48-week backstop for a band that never signs; at most 1/12 a week (no cliff). Content `economy.earlyTaper` 24 -> 12, new `earlyBackstop` 48 (content, not state; SAVE_SCHEMA 10; old saves read eraHistory / milestones) | `sim_money` "until signed, then no cliff" replaces "no pay cliff at signing" (before/after logged in 50194e3): deal + DIY walks over weeks 22-80, milestone and eraHistory fallbacks, the backstop, a late signing inside the backstop fade; gas + grade-pay tests read the new timing |
| **C2 (major)** the results money row did not add up | "Into the fund" (r.deltas.fund) also held the fill-in fee, management 15%, crew, tow and merch; none was next to it, the fill-in fee nowhere on screen | `ui.gigFundParts(r)` names every part beside the net, right under the grid ("Into the fund: +$412 · management 15% −$155 · crew −$150 · the band takes 30% ..."); any rest shows as "other", so Pay − cut − gas + parts = the net always; "$0" shows when the fund did not move | new `pw_gig money` (21 checks): a signed theatre, a Local Heroes fill-in night and a garage BotB win played through `GG.ui.playGig`: the sum = the shown net = r.deltas.fund, each part shows its own amount, the line is above the fold, layout clean |
| minor (x2) a BotB win claimed "a great show paid 25% more" | the bonus never scales a prize | the note needs `pay - prize > 0` (applyResult's base) | `pw_gig money` BotB case |
| minor: BotB gas cover depended on the venue's deal roll | the listing was decorated with the rolled deal before `deal = 'exposure'` | gas recomputed after the deal is set (no rng draw) | `sim_rival` BotB asserts the $40 cover |
| minor: "small rooms pay 60% more" ships as less | the tier step caps the boost (moving up never pays less) | accepted, no code (raising tierStep lifts tier-2 floors in every era, years 4-10). status.md and the owner check now state the measured averages: **+47% flat (28 rooms), +29% door (11 rooms; a $2-a-head room gets +0% at the top)** | node grid over every tier-1 range |
| minor: HUD fund chip clipped "$1,0…" at 390 | pre-existing ellipsis (fans "9,999" too) | full amount at 14 px, then 12 px, else compact ($12.3k / $2.5M, 11 px last); exact amount in the chip's title and its toast | `pw_flow layout`: 7 fund and 3 fans values never clip |
| minor: years 4-10 on one seed set | - | re-run on seeds 301-340 for all three trees (base, 1.4 pre-fix, fix) and pooled 80 seeds | below |
| integration finding 1: HOF "Biggest room" overflow | latent; the until-signed money moved pw_hof's seeded career to "Northern Gateway Performing Arts Barn", overflowing at 440 too (span 95..459) | the row's value wraps, right-aligned (`.hof-wrap`) | `pw_hof list` ALL PASS 20 at 390 and 440 (was 19/20 at both) |

**Money after the fixes** (`plan/v14/probe_after.md` §12; base 1.3.1 → 1.4 pre-fix → fix):
- Year 1 within noise of the pre-fix build: gig-first drums h12 **53% loans / 5.0 weeks < $100** (target ~53% / 4.5), bass
  **45% / 3.4** (~40% / 3.5), Hustle-heavy drums 3% / 0.5, bass 0% / 0.4.
- Years 2-3, the owner's seat: gig-first drums h12 Y2 loans 60% → **55%**, Y3 43% → **35%**, Y3 median fund $509 → $724; help
  left at the signing week: median 0.02 (18 / 36 at zero) → 0.92 (none at zero).
- Signing: gross pay per gig flat across it (+4% / -3%, z 0.5 / -0.5); no factor moves more than 0.017 (gas) / 0.021 (S pay)
  in a week. Net per gig still drops ~$43-52 at signing: the 15% management + crew, now named on the results screen.
- Years 4-10, 80 seeds, every seat x bot cell vs 1.3.1: fund -5% to +8%, late gig pay -3% to +6%, all |z| <= 1.6 (the avg
  drummer's late gig pay +13.5% on seeds 301-340 pre-fix was trajectory noise: +4.3%, z 1.3 pooled).
- **Watch (unchanged in kind):** year 3 richer than 1.3.1 for the bots (avg bass +54% z 3.1, avg lead +33% z 3.0 over 80
  seeds); vs the pre-fix build every bot cell is within |z| <= 1.5, the gig-first bass row +41% (z 1.9). Owner check: say it.

**Verification (after the fixes, dist 5,248,626 B, gate 6,000,000):**
- `node tests/run.js`: SUITE ALL PASS (incl. sim_money 8/8, sim_rival 17/17, compat_v12, save).
- Classic audio `META_ONLY=hash` pw_seq: **232/232 equal** at 390x844 and 440x956.
- Every pw section the fixes touch, alone, one browser at a time, at **390x844 and 440x956**: pw_gig gig 33, money 21,
  simulate 21, e2e 15; pw_flow layout 39, flow 17; pw_rival botb 16, scene 13, final 10; pw_recap bands 15; pw_hof list 20
  (after the wrap fix; 19/20 before it at both sizes); pw_shop space 22, spaces 17, gear 30; pw_seats gig 8; pw_trophies tab
  15, toast 7; pw_tutorial tut_w1 34; pw_bands bands (4 bands 57-58 each + flat 12); pw_drama 19; pw_ending ten 15; pw_tour
  tour 28: **all ALL PASS at both sizes**. One timing failure: pw_flow layout's first run right after a build timed out
  tapping btn-go (390); then 3 passes alone in a row.
- `tools/phoneqa.js`: ALL PASS 390x844 and 440x956 (HUD chip change).
- Owner shots re-taken at 440x956 (verifier scratch `v14_owner/`, same names) and looked at: 01/02 unchanged ($143 · −$43 ·
  −$5 → +$95; drums = bass), 03 the $35 card, 04 ride $200 / pedal $250, 05/05b fund $280 week 7 (HUD reads "$280"). New:
  **01b_results_signed_parts.png** (Broadway Bijou, signed: $1,031 − $309 − $5 − management 15% $155 − crew $150 = +$412)
  and **01c_results_fillin.png** (Legion, a fill-in: $163 − $49 − $5 − fill-in $40 = +$69).

**For the owner check:** gas 80% and the great-show bonus now last until you sign, then fade over 12 weeks; small rooms pay
about +47% (flat) / +29% (door), never more than the next tier; year 3 is richer than 1.3.1 (watch item).
