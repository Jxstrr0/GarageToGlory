# v0.8.0 "Kit" contract (3 agents: lane A = KITSIM then SHOPUI in the repo; lane B = CREATOR in its own worktree, parallel)

Read `plan/status.md` first (APIs, owner decisions incl. Addendum 1). Design: handoff **B4 v0.8**, A5/A6 (sequencer +
Outro/Solo), A9 (garage spaces, van), **A13 (money + merch)**, **Part C1** (vehicle names per band per tier, rename,
stickers), **C2** (full character creator, unlocks, carry-over), **C3** (kit quality tiers). Shapes: `src/02_contracts.js`
(v0.8 block: gear, spaceTier/spaceUpgrades, van tier/name/stickers/upgrades, merch, stageLook, KIT_LOOK, LOOK v0.8,
unlocks; C.EXTRA_SECTIONS, C.KIT_QUALITY, C.VAN_TIERS, C.SPACE_TIERS, C.MERCH_TIERS). VERSION 0.8.0.0 and SAVE_SCHEMA 9
are set by the lead. Earlier suites stay green. No USA content. **No gong on the drum kit, ever** (the Global Gong award
stays). Comedic, prairie-Canadian, parody names. Contracts: don't edit `02_contracts.js`; list any shape additions in your
report and the lead folds them in.

**Done when:** you can buy toms / ride / the double-kick pedal and a better kit (and hear it), write songs with Outro and
Solo, move to a bigger rehearsal space and buy upgrades, upgrade / rename the van and see venue stickers (banned ones
crossed out), run a merch table (pick items + prices, buy stock, van space limits hauling, unsold boxes pile up in the
garage, the misprint becomes a collector's item), and build a full everyday + stage look and kit look with career
unlocks and genre carry-over — all on a 390×844 and a 440×956 phone with no console errors.

## Lead defaults (not asked; flag if a popup is needed)
- Spaces: each era unlocks the next space tier; moving is **the player's choice** (an offer card + a button on the garage
  door screen), costs weekly rent (tier 0 free), and each space gives a small perk (jam room: rehearse; pro studio: write
  + record; arena backstage: rest). Upgrades (couch, egg-crate foam, beer fridge, lights, …) are bought once per space.
- Gear: toms (lane 5) and ride/china (lane 6) and the double-kick pedal are bought (fund); kit quality tiers 0..3 are
  bought in order and gated by era. Outro unlocks early (free, after a few songs written; Dana/Jaxon moment in chat),
  Solo later (Local Heroes; Dana insists). The two-thumb rule still holds on every difficulty with 5–6 lanes.
- Merch: pick item + price only (no custom designs). Sales = crowd × gig quality × merch appeal × price curve, per
  item; stock bought up front; van space caps what you haul to a gig; unsold stock stays home as visible boxes. Unlocks by
  C.MERCH_TIERS (stickers/shirts → hoodies/toques → vinyl → silly limited editions e.g. the Marcel bobblehead) + per-genre
  flavour for all four genres (metal: unreadable-logo longsleeves, patches; punk: patches, DIY tapes; rock: tour shirts;
  country: trucker hats). Reuse the existing `money_merch_misprint` card as the misprint event → a collector's item.

## Lane A, Stage 1 — Agent KITSIM (sim + content + kit audio), in the repo
Owns: new `src/2a_sim_shop.js` (`GG.shop.*`: gear catalogue/buy, kit quality, extra sections, spaces/move/rent/
upgrades, van tiers/buy/rename/stickers/upgrades, merch unlock/stock/price/sales/pile/misprint), new
`src/content/shop.js` (gear items, spaces per band tier 0 + shared tiers 1–3 with rents/perks, upgrades, vans per band
per tier with the Part C1 names + stats, van upgrades, merch items per genre with base cost/price/appeal/unlock tier),
hooks in `20_sim_career.js` (rent, perks, era → space offer), `21_sim_songs.js` (Outro/Solo in sanitize/validate/rate/
generate/arrangement; gated by `gear.sections`), `22_sim_gig.js` (merch sales in the result: `merch: { sold, earned }`;
stickers on play/ban; lanes 5–6 charts), `26_sim_world.js` (van space limits hauled stock), `29_sim_fans.js`
(superfans buy merch), `30_audio.js` (kit quality tiers per C3 + Outro/Solo in the generated band: outro rings out,
solo = Dana's lead over a stripped kit), `content/cards.js` (space offer, gear/merch/van cards incl. the misprint),
`content/economy.js`, `10_save.js` (v8→v9 migration; sets `state.v = 9`; fills lane-A fields only when missing),
bots (buy gear/van/merch sensibly), `tools/balance.js`, tests (new `tests/sim_shop.test.js`; content/others as needed).
- Balance (Steady): gear and merch pay back; the good bot owns 6 lanes + the pedal by ~year 3 and a sprinter by the
  world era; merch is a real but not dominant income; earlier balance targets hold.
- Report (< 45 lines): exact `GG.shop.*` API, events, state fields, and the UI flow SHOPUI must wire.

## Lane A, Stage 2 — Agent SHOPUI (screens + render for lane A), in the repo, after KITSIM
Owns: new `src/5k_ui_shop.js` (gear shop from the kit screen; merch table from the merch hotspot: items, prices, stock,
buy boxes, last gig's sales; spaces + upgrades + van upgrade/rename/sticker view from the garage door/van screen; the
misprint collector moment), `52_ui_week.js` (merch hotspot → merch screen, remove the "coming in v0.8" stub),
`54_ui_sequencer.js` (Outro/Solo tabs + guided steps when owned; lanes 5–6 on the grid), `55_ui_gig.js` (6 lanes fit a
phone; merch line in results), `56_ui_board.js`, `57_ui_van.js` + `43_render_van.js` (vehicle per tier: minivan,
15-passenger + trailer, sprinter, tour bus; stickers on the van body in a van-side view), `41_render_garage.js`
(the space per tier: parents' garage / rented jam room / pro studio / arena backstage; upgrades visible; the unsold merch
box pile grows; **do not touch the drum kit builder `buildKit`** — lane B owns it), `53_ui_laptop.js` / `60_main.js`
hooks, shell CSS (a marked `/* v0.8 SHOP */` block), tests (new `tests/pw_shop.js`: META_ONLY=gear|merch|space|van),
updates to existing flows if needed. Run ALL suites (node + every pw_* section at 390×844, flow/e2e/touch at 440×956),
one contact sheet `tests/.cache/v08_shop_sheet.png`, look once, fix, update `plan/status.md` (What's in v0.8 shop part,
APIs), report (< 35 lines).

## Lane B — Agent CREATOR (full character creator + kit look), in its own git worktree, parallel with lane A
Owns: new `src/content/creator.js` (Part C2 part lists: body/face/hair/everyday clothes/stage outfits/tattoos/
piercings/kit look, each with an unlock gate: start / era / fans / milestone / award), new `src/2b_sim_creator.js`
(`GG.creator.*`: parts(state), isUnlocked, grant/unlock checks on week end + events, sanitizeLook (knuckles A–Z, 4 per
hand), stageLookFor(member|player), carry-over read/write per genre in localStorage with try/catch), `40_render_core.js`
(`buildCharacter(look)` renders every new part — build/height/age, face parts, facial hair, glasses, all hair styles +
colours, tops/bottoms/shoes/headwear, stage outfits incl. cape/corpse paint/rhinestone suit/Canadian tuxedo, tattoos +
**knuckle letters** readable up close, piercings; old LOOKs render unchanged), stage-look switching in
`42_render_stage.js` + `44_render_carpet.js` (only look selection), the **kit look** in `41_render_garage.js` `buildKit`
only and `42_render_stage.js` kit builders (shell finish, hardware, kick-head art incl. custom text, throne crate →
leather, stick colour, cowbell / hair fan / pyro at arena shows; no gong), new `src/5j_ui_creator.js` (tabs Body / Face /
Hair / Clothes / Stage / Ink / Kit; live 3D preview; everyday ↔ stage toggle; locked parts show what unlocks them;
knuckle text input), `51_ui_menu.js` (new career → the creator; the carry-over toggle), an entry mid-career (☰ menu
"Look"), `10_save.js` (chain onto `GG.save.migrate` to fill ONLY lane-B fields when missing: stageLook, kit, unlocks; do
NOT set `state.v`), shell CSS (a marked `/* v0.8 CREATOR */` block placed right after the v0.7 block), tests (new
`tests/sim_creator.test.js`, new `tests/pw_creator.js`: META_ONLY=creator|kit|stage). Don't edit `content/cards.js`,
`20_sim_career.js` or any lane-A file (use bus events + the week-end hook in your own module).
- Setup: the worktree has no three.js cache — copy `/home/user/GarageToGlory/tests/.cache/three*.js` (and any cache
  files `tests/_pw.js` needs) into your worktree's `tests/.cache/` first. Build + test inside the worktree only.
- Run node + pw_creator + pw_flow flow + pw_garage + pw_stage + pw_label awards at 390×844 (flow at 440×956 too), a
  contact sheet `tests/.cache/v08_creator_sheet.png` (creator tabs, knuckle tattoos close-up, stage look on stage, the
  kit looks incl. pyro), look once, fix. **Commit on your worktree branch** (no push), report (< 35 lines) with the
  branch name, API and any shape additions.

## Lead (after both lanes)
Merge lane B's branch into `v0.8-kit`, resolve conflicts (10_save, 41, 42, shell CSS), fold shapes into contracts,
rebuild, run everything once, tick the v0.8 Addendum items, PR + merge.
