# v0.8.1 "Addendum 2 catch-up" contract (2 agents in parallel: LICRECAP in the repo, LOGO in its own worktree)

Read `plan/status.md` first ("Addendum 2 — decisions" + checklist; APIs). Full owner text: `plan/handoff.md` **Part D**
(D1–D3). Shapes: `src/02_contracts.js` (v0.8.1 block: logo, licensing, SONG.ad, recaps, LICENSE_OFFER, RECAP;
C.LOGO_EMBLEMS, C.LOGO_STYLES, C.LICENSE_CHOICES). VERSION 0.8.1.0 and SAVE_SCHEMA 10 are set by the lead; each agent
fills ONLY its own new fields when missing by chaining onto `GG.save.migrate` inside its own module (the 21/23/25/26
pattern) — never set `state.v`, never edit `10_save.js`. Earlier suites stay green. No USA content, no gong on the kit,
**no share/screenshot button**. Comedic prairie-Canadian parody tone. Don't edit `02_contracts.js`: list shape additions
in your report.

## Owner decisions (locked)
- **D1 money = "Nice bonus"** (owner popup 2026-09-30): fees **$1,500–$6,000** per offer (hockey highlight package at the
  low end, truck commercial at the top; each brand its own range), **2–4 offers per career** (more with fame), a
  **Counter** asks **+40%** with a **~30%** chance the brand walks, down to **~15%** with lots of fans or a label behind
  you. Everything else per status "Addendum 2 — decisions" D1.
- D2 and D3 exactly as in status "Addendum 2 — decisions".

## Agent LICRECAP (D1 licensing + D3 year-end recap), in the repo
Owns: new `src/2c_sim_licensing.js` (`GG.licensing.*`: offer rolls from the Signed era, or earlier when a song charted
on the Maple 100 or went viral on Bandbook; genre-weighted brands; offers expire after a few weeks; take / decline /
counter with seeded rolls; take = fee to the fund (recoupable labels take their contract cut via the existing label API),
buzz + streams for that song, SONG.ad staleness bump, sellout weight nudges haters + may queue a Bandbook scandal card;
decline = small superfan loyalty bump; Buckle & Boot fury when a truck ad goes to the Ramblers (rival heat + card) —
content ready for v0.9), new `src/content/licensing.js` (brands with blurb, fee range, genre fit, sellout weight,
comedic lines; the insurance ad is Marcel's employer), new `src/2d_sim_recap.js` (`GG.recap.*`: build a RECAP at the
week-24 wrap from the year's data — fund in/out, fans, best/worst gig with a one-line quote, songs, albums, awards incl.
Loonies/Global Gong, quits/returns, rival standing delta, regions unlocked, a Rolling Scone headline generated from the
year's biggest event; store compactly in `state.recaps`; year 1 carries the bandmates' "what a good year looks like"
lines), hooks in `20_sim_career.js` (weekly roll + year end), `content/cards.js` (offer / fury / scandal cards),
`29_sim_fans.js` (hater nudge, loyalty bump), new `src/5l_ui_recap.js` (the swipeable recap screen at the year-end wrap,
before the next year starts; the **band photo** = a still of the current lineup posed in the current space rendered from
the garage scene via a small render hook — display only, no share/download), `52_ui_week.js` + `53_ui_laptop.js` hooks
(offer card flow; an "Offers" line on the laptop that lists open offers until answered; a way to re-open past recaps),
bots (take/decline sensibly), `tools/balance.js` (licensing income by year), tests (new `tests/sim_licensing.test.js`,
`tests/sim_recap.test.js`, new `tests/pw_recap.js` META_ONLY=offer|recap), shell CSS in a marked `/* v0.8.1 RECAP */`
block. Must not edit LOGO's files (below).
- Balance: licensing is a treat, not an economy — median career total roughly $5k–15k; earlier targets hold.

## Agent LOGO (D2 band logo), in its own git worktree
Owns: new `src/content/logo.js` (emblem art params per C.LOGO_EMBLEMS, the 4 lettering styles, ~10+ curated colour pairs,
per-band default logos for all four bands, fixed logos for every rival band), new `src/2e_sim_logo.js` (`GG.logo.*`:
sanitize, default for band, rebrand cost + buzz, carry-over per the cosmetics rule via the creator's carry helpers),
new `src/46_render_logo.js` (`GG.render.logo.canvas(logo, bandName, size)` → a cached canvas (band name in the lettering
style over the emblem; procedural, no image files) + `texture(...)` for three.js), new `src/5m_ui_logo.js` (the three-tap
picker with live preview; on the new-career flow after the band intro, before the creator — `51_ui_menu.js`; a
"Rebrand" entry on the laptop for a fee), and the logo reused everywhere: kick-drum head art 'logo' option
(`R.kit.headArt` in 40_render_core / the creator's kit code), merch (5k_ui_shop item art), van stickers + van side view
(43_render_van / 5k), the Bandbook avatar (5g_ui_bandbook), the garage banner (41_render_garage banner only), the Loonies
broadcast card (59c_ui_awards / 44_render_carpet), rival logos on the Scene leaderboard + BOTB screens (59d_ui_rival).
Tests: new `tests/sim_logo.test.js`, new `tests/pw_logo.js` META_ONLY=picker|reuse, a contact sheet
`tests/.cache/v081_logo_sheet.png` (every emblem × style, the picker, and each reuse site), shell CSS in a marked
`/* v0.8.1 LOGO */` block. Must not edit LICRECAP's files (2c, 2d, 5l, content/licensing.js, 20_sim_career, cards).
- Setup: copy `/home/user/GarageToGlory/tests/.cache/three*` into the worktree's `tests/.cache/` first; commit on the
  worktree branch at the end (no push).

## Both
Run node + your new pw sections + pw_flow flow/layout + pw_garage + pw_shop (merch, van) + pw_creator kit + pw_label
awards + pw_rival scene at 390×844 and your pw sections at 440×956 (scratch viewport copy; delete it). Look at your
screenshots once and fix. Update `plan/status.md` ("What's in v0.8.1 (…)" + API entry; tick your Addendum 2 items).
Report (< 35 lines): API, events, shape additions, tests, gaps.

## Lead
Merge LOGO's branch, resolve (status.md, shell CSS, 53_ui_laptop, 52_ui_week), rebuild, run everything, PR + merge.
