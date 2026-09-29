# v0.4.0 "Drama" contract (single agent)

Read `plan/status.md` first (what exists, APIs, owner decisions). Shapes/events/commands: `src/02_contracts.js`.
Design: handoff A9 (members: moods, quitting, returning, recruits), A13 (pay the band, parents' loan), A3 (each
original's quit/return storyline), A4 (group chat warning before a quit).

**Done when:** once the band passes 250 fans, members' moods can escalate (grumbling → passive-aggressive group chat →
an ultimatum card → quits), a quit leaves a hole you can play with, cover with a fill-in, or fill from the recruit
generator; originals come back later via a Monday card; all of it is deterministic in node tests, the bots keep the
balance targets, and every earlier test stays green.

## Owner decisions (locked)
- Garage-era protection (nobody quits, nothing breaks down) ends at **250 fans**. Era label stays 'garage' until v0.5
  turns milestones into eras; set `protected = false` and fire a "Local heroes on the horizon" milestone.
- Drama level **"now and then"**: ≈ one quit every 1–2 years with decent play; more when underpaid, overworked
  (burnout), ignored (wants unmet) or losing. **Always warned first** — never skip a stage.
- Pay the band default **30%** of gig pay to members (the rest to the fund); changeable anytime on the laptop.
- You never quit and can't fire anyone. Worst case: you and three strangers from Kijiji.

## Pieces
1. **Drama sim (new `src/27_sim_drama.js`, hooks in `20_sim_career.js`)**
   - Per-member mood drivers each week: money (pay cut vs expectations), burnout, band success (fans/buzz trend, gig
     grades), personal **wants** from content (Marcel: spotlight/theatrics; Dana: solos + new gear; Jaxon: freedom +
     baba's approval; Kenji: unknowable — random drift), card effects. Moods stay 0..100.
   - Escalation stage per member: 0 fine → 1 grumbling (chat lines) → 2 passive-aggressive (pointed group-chat
     messages, flagged in the wrap) → 3 ultimatum (a forced Monday card next week with 2–3 choices that fix the
     grievance at a cost, or refuse) → 4 quits. Stages step at most one per week and fall back as mood recovers.
     Ultimatum/quit only when `!state.protected`.
   - Quit: member `status: 'quit'` (originals start their **exit storyline** from content: Marcel joins a Quebec band;
     Dana's poached by a prog band; Jaxon's baba says so; Kenji vanishes without a word — Kenji's may be an 'away'
     disappearance that returns on its own). A **return card** fires months later (content-driven, changed: skill boost
     or a new quirk). If the slot was filled by a recruit, you choose: keep the recruit or take the original back — a
     turned-down original may **join your rival** (`state.rivalDefectors`, shown in the rival's blurb; v0.6 uses it).
   - Holes: playing with a hole → worse gigs (gig sim reads active members; a missing role costs crowd/score) unless a
     **fill-in** is hired for that role (cost per gig, lower chemistry, no drama). Stage/garage show only active members
     + fill-ins.
   - **Recruit generator:** post an ad (Kijiji + music-store corkboard; costs a little) → **three candidate cards**:
     name/nickname (genre-flavoured pools), hometown (a real city from the current region), skill 1–5 stars, one
     **trait** (Reliable, Road Warrior, Showboat, Studio Rat, Hype Machine, Fast Learner, Party Animal, Frugal, Local
     Legend — each with a real mechanical effect), one **quirk** (barefoot even in January; tours with a pet ferret;
     speaks only in hockey metaphors; slow cooker at every gig; ex-Tundra Wraith roadie who won't say why; "basically
     played on" a famous album; won't drive after dark because of Sasquatch; add a few more), **asking cut**, and
     **chemistry with the current band shown on the card**. Pay to re-post for three new cards. Quality scales with era.
     Hired recruits get a generated LOOK, lighter drama (a few quirk cards; if they quit, no storyline).
   - **Pay the band:** `state.payCut` 0..0.6; gig pay × payCut goes to members (mood), the rest to the fund.
   - **Parents' loan:** keep the v0.1 top-up; add guilt Monday cards gated on `flags.parentsLoan` (night school, your
     mom's friend's son who's an accountant…) with **repay** choices that reduce `debtToParents`.
   - Van breakdowns now possible once `protected` is false (WORLD's code already supports it — just make sure it fires).
   - Events: 'member:stage' { id, stage }, 'member:quit' { id }, 'member:return' { id }, 'recruit:hired' { member },
     'protection:ended' {}. Bots: `botPay`, ultimatum `botChoice` handling, `botHire` (bots post an ad and hire the best
     chemistry×skill candidate, or accept returns). Save schema 4 + v3→v4 migration (defaults).
2. **Content (new `src/content/drama.js`, `src/content/recruits.js`; append to `lines.js`/`cards.js`)**
   - Per original: wants, 2–3 grumble + passive-aggressive chat lines per stage, an ultimatum card, the exit storyline
     (1–3 cards/beats while they're gone, e.g. Marcel's solo album flops in Rimouski), a return card, epilogue hooks
     left for v1.0. Kenji never speaks words (his "ultimatum" is a silent act — e.g. his bass case by the door).
   - Recruit name pools per genre (metal first; punk/rock/country ready for v0.9), hometowns from the map, traits with
     effects, quirks with 1–2 quirk cards each. Guilt cards (≥ 5) with repay choices. Comedic, prairie-Canadian, no USA.
3. **UI (`53_ui_laptop.js`, `52_ui_week.js`, new `58_ui_band.js` if cleaner, shell CSS)**
   - Laptop → Band tab: **pay-the-band slider** (0–60%, step 5, live "members get $X of a $Y gig" preview), each member's
     mood + stage badge (😐 grumbling / 😒 passive-aggressive / ⚠ ultimatum) and their current want; holes show
     "Empty: <role>" with **Post an ad** / **Hire a fill-in**; away/quit members show their storyline status.
   - **Recruit screen:** three swipe-free candidate cards (stars, trait, quirk, hometown, asking cut, chemistry meter),
     Hire / Re-post ($) / Close. Keep-vs-original choice card when an original returns into a filled slot.
   - Group chat: passive-aggressive messages visually marked; the wrap lists warnings ("Dana is grumbling about solos").
   - Ultimatum cards use the Monday card screen (forced). Protection-ended moment gets a toast/card.
4. **Tests**
   - `tests/sim_drama.test.js`: protection holds below 250 fans (no ultimatum, no quit, no breakdown) and ends at 250;
     escalation never skips a stage and recovers; pay cut moves moods both ways; ultimatum choices resolve; quit → hole
     penalty at gigs → fill-in cost → recruit ad gives 3 candidates with chemistry, re-post costs money and changes them,
     hire works; original return card later; keep-recruit sends the original to `rivalDefectors`; guilt cards repay
     debt; deterministic per seed; v3→v4 migration.
   - Content test additions (drama/recruits/cards schema, no USA). Keep all node + Playwright suites green; add a
     `tests/pw_drama.js` (META_ONLY=drama): laptop pay slider, forced ultimatum card, a quit → post an ad → hire, no
     console errors.
   - `tools/balance.js` over 10 years: quits per year after protection ≈ 0.5–1 for the avg bot, ≤ 0.5 for the good bot;
     year-1 targets unchanged (protection covers most of year 1).
5. **Docs:** update `plan/status.md` (What's in v0.4, APIs, Back-burner). The lead already set VERSION 0.4.0.0, SAVE_SCHEMA 4 and the
   v0.4 state fields/events in 02_contracts.js — list any further contract additions for the lead.
