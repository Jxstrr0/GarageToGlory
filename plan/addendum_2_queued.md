# Garage to Glory — Addendum 2 (Part D of the handoff)

Drop this into the Claude Code session and say "read addendum 2 and queue it behind the current work".
Written Tuesday, September 29, 2026. Locked owner decisions unless marked open.

**TIMING — READ FIRST:** Nothing here starts until the task currently in progress is finished, tested, built, committed and pushed. Do not interrupt, reshuffle or expand the version you are in the middle of. Then append this file to `plan/handoff.md` as **Part D**, record the decisions in `plan/status.md` (decisions list plus an "Addendum 2 — pending" checklist), and pick the items up in roadmap order from the next version onward. This addendum adds to the plan; it never replaces the plan's current task.

Same rules as always: cheap-game-build doctrine, Red Skies layout, questions as popups, content as data, no USA content. The owner explicitly does **not** want a share/screenshot button — don't add one.

---

## D0. Housekeeping first (do this the moment the current task is done, before anything else)
- **Fix the version lines at the top of `plan/status.md`.** The "Version" section still reads "Current: 0.6.0.0 … Next: 0.7.0 World" while v0.7.0.0 is merged to `main`. Make it: Current = the version actually on `main` (read `VERSION`), list 0.7.0 World under shipped, Next = 0.8.0 Kit. From now on, updating that Current/Next line is part of every merge — it's the first thing the next session reads.
- Add the "Addendum 2 — pending" checklist (D1–D5 below) right under the Addendum 1 one.

## D1. Licensing deals (v0.8 — economy side, with merch) — designed, was missing from the plan
Your songs get licensed for money once you're worth licensing.
- **When offers come:** from the Signed era on, or earlier if a song charts on the Maple 100 or goes viral on Bandbook. Rare — roughly 2–4 offers across a career, more with fame. They arrive as a Monday card and sit on the laptop until answered (a few weeks to decide).
- **Offer types (parody brands, genre-weighted):** a truck commercial (country and rock — **Buckle & Boot are furious** when it goes to the Grid Road Ramblers: a rival heat spike + a card); an energy drink (metal and punk); a hockey highlight package (any genre); a regional insurance ad (metal — Marcel's employer, he's mortified); a video game trailer (any). Each is a content entry: brand, blurb, fee range, genre fit, "sellout" weight.
- **The card:** three choices with hints — **Take it** (lump sum to the fund + buzz + streams for that song), **Decline** (small superfan loyalty bump), **Counter** (ask for more: better fee with some chance the offer is withdrawn). Counter odds improve with fans and a label's clout.
- **Effects of taking it:** money, buzz, streams; the song gets an "in a commercial" tag that bumps its staleness (crowds have heard it a thousand times); the sellout weight nudges haters up and can trigger a Bandbook scandal card ("Lord Abyssus sold the moose to an energy drink"); recoupable labels take their contract cut.
- **Content hooks:** `src/content/licensing.js`; a laptop "Offers" line; achievement "Sold Out" (D4).

## D2. Band logo (v0.8, alongside merch and kit head art) — never designed until now
Everything already references "your band logo"; this makes one.
- **When:** on the new-career flow right after the band's intro, before the character creator. Editable later from the laptop for a fee ("Rebrand", small; costs a little buzz).
- **The picker (three taps):** an **emblem** (skull, wheat sheaf, lightning bolt, moose, maple leaf, gopher, anvil, hailstone, grain elevator, cowboy hat, safety pin, flaming tire), a **lettering style** per genre (spiky unreadable metal, cut-out ransom punk, chrome '80s rock, western slab country — all four available to any genre, default = the band's), and a **colour pair** (a curated palette, ~10 pairs).
- **Rendering:** procedurally drawn to a canvas texture (band name in the lettering style over the emblem), cached and reused everywhere: the kick-drum head art option, merch, van stickers, the Bandbook avatar, the garage banner, the Loonies broadcast card, the Hall of Fame entry. No image files.
- **Storage:** three small ids in the career save (`logo: { emblem, style, palette }`); carry-over follows the cosmetics rule.
- **Recruits and the rival:** rival bands get their own fixed logos from content (same renderer) so the Scene leaderboard and BOTB screens show both.

## D3. Year-end recap (v0.8 — small, and it feeds v1.0's Hall of Fame)
At the week-24 wrap of every year, before the next year starts:
- One screen, swipeable on a phone: **fund change** (in vs out), **fans gained**, **best gig / worst gig** (venue, grade, a one-line quote), **songs written and albums released**, **awards** (Loonies, Global Gong), **who quit / who came back**, **rival standing** (leaderboard delta), **regions unlocked**, and a **headline from Rolling Scone** generated from the year's biggest event ("Hail Damage Survive Second Year; Van Does Not").
- A **band photo**: the current lineup posed in the current space, rendered from the 3D scene (a still, not a share image).
- Each recap is stored in `history` (compact — do not bloat the save code; the back-burner notes it's already large) so the Hall of Fame (v1.0) can show a career as a strip of yearly recaps.
- Ties into the tutorial: the first year's recap is where the bandmates explain what "a good year" looks like.

## D4. Achievements (v1.0, with the Hall of Fame and meta unlocks)
Cross-career, stored in meta storage, shown on the laptop under "Trophies" and toasted on unlock. Comedic and cheap: ~30 entries as content (`src/content/achievements.js`), each with id, name, blurb, condition. Examples to seed:
- **Twelve People and a Dog** — play your first gig.
- **The Wall** — get banned from three venues in one year.
- **Ma Pelouse** — release a song whose title Marcel wrote.
- **The Original Five** — finish a career without losing a member.
- **Kijiji All-Stars** — finish a career with no original members.
- **Sold Out** — take a licensing deal (D1).
- **Worst Van** — win the Loonie for it.
- **Block Heater** — survive a winter without a breakdown.
- **Buddy** — lose to Tundra Wraith at the Loonies three years running.
- **Big in Japan** — earn the special ending.
- **Frostbite** — play Siberian Frostfest.
- **Chugging Along** — write a metal song with kick hits on more than half the steps.
- **Grey Mug** — play the halftime show.
- **Night School** — borrow from your parents three times in one career.
- **Sad Dome** — headline it.
Achievements never gate content; they're flavour and bragging.

## D5. v1.1 "Tuning" — a balance and playtest pass after v1.0 (new roadmap entry)
No new features. The point is to make years 3–10 feel like "scrappy, but not too brutal" with real hands on it.
- **Owner playtest loop:** the owner plays years 3–6 on his phone and reports in plain words. Turn each report into a numbered item in `plan/status.md`, fix in small patches (v1.1.x), and re-run `tools/balance.js` before and after every change so no fix silently breaks something else.
- **Bot probes to keep honest:** average-play fund by year (the back-burner notes the late-game plateau and the good bot never seeing drama — both are targets here), fans by year vs the Steady pace targets, quits per year (≈ one per 1–2 years with decent play), rival leaderboard gap by year, time-to-World-Stage (≈ year 5–6), bonus-year rate.
- **Back-burner sweep:** work through the status doc's back-burner list; fix what's cheap, and explicitly close (with a reason) what isn't worth it, so the list stops growing.
- **Phone QA at 390×844:** every screen in portrait, the two-thumb rule on Hard/Expert, calibration on a Bluetooth profile, save-code size, battery on a full gig.
- Ask the owner with a popup at the start of v1.1 which two things bother him most in play — start there.

---

## D6. Still open (ask with popups when you get there)
- Exact fee ranges and offer odds for licensing (D1) — propose numbers in the v0.8 contract and confirm with one popup.
- The final emblem and palette lists for the logo picker (D2) — the lists above are a starting set; add, don't shrink.
- Any achievements beyond the seed list (D4) — add freely if they're cheap and funny.
