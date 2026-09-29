# v0.5.0 "Signed" contract (3 agents: CAREER, CONTENT, UI — UI integrates in phase 2)

Read `plan/status.md` first (what exists, APIs, owner decisions, back-burner). Shapes: `src/02_contracts.js` (new:
C.LABELS, RELEASE_KINDS, OUTLETS, CERT, LOONIES_WEEK, LOONIE_CATEGORIES; state era/eraHistory/label/labelOffers/session/
albums/awards/trophies; OFFER, DEAL, SESSION, ALBUM, AWARD). SAVE_SCHEMA is 5 (a v4→v5 migration is needed — the
sim_drama migration test currently fails until it lands). Design: handoff A10 (eras, labels, albums, reviews), A13
(money), A14 (Loonies), A7 (theatre tier). VERSION 0.5.0.0 is set by the lead.

**Done when:** a career can climb Garage → Local Heroes → Signed on a phone: label interest arrives, you sign (or go
DIY), book a studio + producer, record an EP/album over studio weeks (drum takes by skill or played yourself), order the
tracklist, pick a lead single, title (generated or typed) and cover, pick a release week with promo, read comedic
reviews, watch it on the Maple 100, earn streams/royalties/recoup, get gold/platinum on the wall, and attend the yearly
Loonie Awards (3D red carpet → outfit card → envelopes → speech). Bots do it all in node; every earlier test stays green.

## Owner decisions (locked)
- Pace **Steady**: Local Heroes ≈ end of year 1 (250 fans — also where v0.4 protection ends), first label interest in
  year 2, signed by year 2–3 for decent play, World Stage reachable ≈ year 5–6 (the World era itself arrives in v0.7:
  define the threshold, gate it off).
- Labels: **Gopherwood Records** (indie: small advance, bigger cut, creative freedom), **Monolith Records** (major: huge
  advance, tiny cut, opinions — radio singles, image changes, "Marcel should sing in English"), **DIY** (no label, keep
  everything, you pay recording/promo). **No 360 deals.** Advances recoupable; deals set album counts and deadlines;
  miss them or flop and you're dropped.
- Studios: Mom's Basement (free, lo-fi, dryer running), Strip Mall Sound (cheap; the engineer is the landlord), Grain
  Silo Studios (converted grain elevator, great natural reverb), Abbot Lane Studios (London — World era, locked now).
  Producers are hireable characters with styles (everything loud; cabin in the woods; quietly fixes Marcel's pitch; +2–3
  more). Sessions take 2–4 weeks of blocks with studio events.
- Reviews: Rolling Scone, Proclaim!, Pitchspork (one-decimal scores), Deci-Hell (metal zine), Tailgate Weekly (country).
  Judged on song quality, production, rehearsal (polish) and **recycled drum patterns** (`GG.songs.similarity`). Each
  review has a comedic pull quote.
- Loonies once a year at week 20 (C.LOONIES_WEEK). Categories: Breakthrough Group, Album of the Year (per genre), Single
  of the Year, Best Live Act, Fan Choice, Worst Van (joke). Lose to Tundra Wraith and they thank you personally. Rewards:
  money, fans, buzz, a loonie-shaped trophy. (The full rival career sim is v0.6 — use a simple scripted Tundra Wraith
  strength curve for nominations now, behind a function v0.6 can replace.)
- Gold 40,000 / platinum 80,000 units (C.CERT). No USA content.

## Isolation (all agents)
`cp -r /home/user/GarageToGlory <scratchpad>/<agent>`; work/test only there; copy back ONLY owned files. No git in the
main repo; never publish/push. Lead-owned: build.js, VERSION, 01_ns.js, 02_contracts.js, tests/_load.js, _t.js, _pw.js,
run.js, plan/*, README.md, index.html — list contract additions in your report. Token efficiency is an owner
preference: grep -n + line ranges (never read the big files whole), exact-string edits, no re-reading, filtered output.

---
## Agent CAREER (sim + economy)
Owns: `src/24_sim_labels.js` (labels, offers, deals, recoup, deadlines/drops, studios/producers math, sessions, reviews
scoring, Maple 100 chart sim, first-week sales, streams over months, certifications, Loonie nominations/results), eras +
milestones in `src/20_sim_career.js`, `src/26_sim_world.js` (era-gated listings; **tier 3 theatres 500–2,000** unlock in
Signed), `src/content/venues.js` (add ~6 theatres across the Sask core with parody names/quirks), `src/content/economy.js`,
`src/10_save.js` only if the migration chain needs it (follow the existing `GG.save.migrate` chaining pattern),
`tools/balance.js`, `tests/sim_labels.test.js` (new), `tests/sim_career.test.js`, `tests/sim_drama.test.js` (fix the
schema-5 expectation only).
- Eras: garage → local at 250 fans (reuse the v0.4 `localHeroes` milestone: now also sets `era = 'local'`, pushes
  eraHistory, emits 'era:changed'); local → signed on signing a deal **or** releasing a DIY album; signed → world
  threshold defined (≈ 25k fans + a charting album) but disabled until v0.7. Monday cards gated `era:['garage']` must
  keep flowing in later eras only if the CONTENT agent widens their gates — don't hack around it.
- Label interest: offers appear (Gopherwood first, Monolith later) from fans/buzz/EP reception; offers expire; bots decide.
- Recording: a session occupies the week's blocks (planner shows studio weeks); each week produces studio events (from
  content) and progress; drum takes = f(drum skill, rng) unless the UI supplies a played take score (best take counts);
  production = studio × producer × takes × polish; costs by studio/producer (label pays from the advance, DIY pays cash).
- Release: kind EP (4–5 songs) / album (8–10); tracklist order matters (opener, lead single, closer); release week ≥ 2
  weeks out; promo blocks before launch boost week-one sales. Reviews per outlet (genre-relevant outlets weigh more),
  first-week sales → Maple 100 debut/peak/weeks, streams trickle for months, royalties recoup the advance before paying
  the band, gold/platinum certs → trophies. Deals: albums owed + deadlines; missing or flopping → dropped (you go DIY).
- Economy pass (back-burner items): late-game funds are too high without drama (≈ $46k) and low with the members' cut
  (≈ $4.5k avg) — add era-appropriate money sinks/sources (studio, producers, promo, recoup, theatres) so year-10 funds
  land ≈ $5k–25k across bots, with no loans after year 1 for the avg bot.
- Bots: botSign, botRecord, botRelease (reasonable tracklists), bot takes at skill.
- Tests (sim_labels): era transitions at the right triggers; offers/expiry; deal recoup math; deadline miss → dropped;
  session progress + costs; reviews deterministic, recycled patterns lower scores; chart/sales/streams sane; cert
  thresholds; Loonies at week 20 with nominations; migration v4→v5; deterministic per seed.
- Balance (`node tools/balance.js 10 5` + `10 20`): Steady pace — avg bot Local Heroes by ~week 24–30 in most seeds,
  first offer in year 2, signed by year 3–4 (good bot by 2–3); no stat explosions; quits target from v0.4 unchanged.
- Report the exact APIs (GG.labels.*) + events ('era:changed', 'label:offer', 'label:signed', 'label:dropped',
  'session:week', 'album:released', 'album:reviews', 'chart:week', 'cert', 'loonies:nominations', 'loonies:result').

## Agent CONTENT (writing)
Owns: new `src/content/labels.js` (labels, studios, producers — with the numeric fields the CAREER agent's schema needs;
agree on field names by following the list below exactly), new `src/content/reviews.js`, new `src/content/awards.js`,
new `src/content/album_words.js`, `src/content/cards.js` (era gates + new cards), `src/content/lines.js` (append),
`tests/content.test.js`.
- labels.js: `labels: { gopherwood, monolith, diy }` each `{ id, name, blurb, advance:[min,max], royalty, albums,
  deadlineWeeks, demands:[{ kind, text }], offerMinFans, offerMinBuzz, dropOnFlop }`; `studios: [{ id, name, city, blurb,
  costPerWeek, quality 0..100, reverb, era, locked?, quirk }]`; `producers: [{ id, name, blurb, costPerWeek, style:
  'loud'|'cabin'|'pitch'|..., production +n, polish +n, hook +n, weird, era }]` (3 required styles + 2–3 more).
- reviews.js: per outlet `{ id, name, scale: 10|5|100, decimals, genres weight, voice }` and pull-quote templates by score
  band (awful/meh/good/great) with tokens {band} {album} {single} {nick:<id>}; outlet-specific voices (Pitchspork is
  insufferable, Deci-Hell is all-caps, Tailgate Weekly is confused by metal…).
- awards.js: Loonie categories (names, blurbs), the red-carpet outfit card(s) for Marcel (cape-aware), speech choices
  (thank your mom / thank the moose / take a shot at the rival) with effects, Tundra Wraith's personal thank-you lines,
  presenter banter.
- album_words.js: title generator pools (metal + others), cover motifs/palettes/fonts; studio event cards (≥ 10, the
  dryer, the landlord-engineer, grain-silo echoes, cabin bears…) in the Monday-card schema.
- cards.js: widen gates of evergreen garage cards to later eras where they still make sense; add ~25 Local Heroes + Signed
  Monday cards (label drama incl. Monolith's "Marcel should sing in English", radio singles, image change; local fame;
  DIY hustle; the moose concept album storyline can start here using the existing `mooseMuse` flag — its platinum-in-
  Finland payoff comes with World in v0.7).
- Content test: schema/field names above, gates valid for new eras, no USA, lengths, every outlet has quotes for every band.

## Agent UI (screens + render; phase 2 integrator)
Owns: new `src/59_ui_label.js` (offers, deal screen, recoup/deadline status, DIY option), new `src/59b_ui_studio.js`
(book studio + producer, session weeks view with studio events, drum takes: auto by skill or **play it yourself** via the
v0.3 gig session in a studio mode — no crowd, best take counts; tracklist ordering, lead single, title picker with 3
generated options + type your own, cover picker with procedural canvas covers, release week + promo), new
`src/59c_ui_awards.js` (reviews reveal, Maple 100 chart view, cert moments, Loonies ceremony flow), new
`src/44_render_carpet.js` (3D red carpet: step-and-repeat wall, flashes, the band in outfits via buildCharacter, rival in
corpse paint; a stage/podium for the envelope), trophy wall additions in `src/41_render_garage.js` (gold/platinum
records, loonie trophies, banned photos from `state.trophies`/`banned`), laptop tabs in `src/53_ui_laptop.js`
(Label/Albums), hooks in `src/52_ui_week.js` / `src/60_main.js` in PHASE 2 only, shell CSS, `tests/pw_label.js` (new).
- Phase 1: build screens and the carpet scene against this contract + 02_contracts shapes, with guards; don't touch 52/60.
- Phase 2 (lead messages you after CAREER + CONTENT land): wire everything into the week flow (studio weeks replace the
  planner; release/review/chart moments in the wrap; Loonies at week 20; offers as Monday-style cards or laptop
  notifications), run ALL suites (node; pw_flow flow/year/code/layout; pw_garage; pw_seq; pw_gig gig/e2e; pw_world;
  pw_stage; pw_drama; pw_label), one contact sheet (offer, deal, studio, tracklist/cover, reviews, chart, carpet,
  envelope/speech) → tests/.cache/v05_sheet.png, look once, fix, copy back, report.
