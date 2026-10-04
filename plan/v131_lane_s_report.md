# v1.3.1 Lane S report: Gear shop (branch `wip-v131-s`)

## Built (A4 + D6/D7; plan_1.3.1 §1.2)
- **41 garage**: 8th HOTSPOTS entry `shop` (appended; index 4 stays the kit), a green (`#57c77a`) "Gear shop" label, px 22.
  - Drums: under "Drum kit", nudged right (offset [0.61, -0.78, 0.23] m) to clear the merch box pile on the left edge.
  - String seats: `setRig(on)` moves the label and its box under "Your rig" (offset [0, -0.78, 0]).
  - Hit box = the label (0.95 x 0.42 x 0.3 m). Stand + face = the throne, or the rig on a string seat; you sit or noodle on
    arrival, as at the kit. The label never fades while you sit there.
  - Draw calls +1 (hail_damage garage 43 -> 44 at 440). `debug('render').hotspots` lists 8. New `debug('render').labelBox` =
    [{ action, x, y, w, h }]: each label's screen rect in CSS px, for overlap checks.
- **41 ghost-click fix (all hotspots)**: a hotspot tapped where you already stand fired on the next frame; the tap's own click
  then hit the new sheet's scrim and closed it (repro: tap Gear shop from the throne). That case now waits 0.35 s
  (`GHOST_S`); walks are unchanged. The pw_garage test fails with 0 and passes with 0.35.
- **52**: `HOT.shop -> ui.openGear()` (Drum shop / <Instrument> shop). The 2D fallback gains `hs-shop` "Gear shop" (8 spots = 2 rows).
- **54**: `btn-seq-shop` in `.seq-head` between the title and ⋯, sketch mode only (Quick song + editor), not in write / view.
  - A stacked 🛒 over "SHOP", 52x44 with a green ring. aria-label = the ⋯ row text (Drum / Bass / Guitar shop).
  - `openShop(D)` (stopPlay + ui.openGear) is shared with the ⋯ row `btn-kit-shop`, which stays.
- **00_shell**: `.seq-shop` CSS. At 390, "Sketch pad · Rhythm guitar" stays whole, also with Bigger text.
- Saves are untouched: nothing is stored. Gig play and sims are untouched.

## Tests (390x844; * = also 440x956)
- pw_garage `shop` (new, default run)*: 7 rooms x drums + a string seat. Checks:
  - 8 labels, the shop label on screen between HUD and sheet, overlapping no other label and clear of the 10-box pile.
  - It sits just under the kit / rig label, and pickAt picks it.
  - A real tap walks you there and opens the right shop (4 cases); a 2nd tap from the throne keeps it open.
  - The 2D fallback `hs-shop` works on drums + bass. The hotspot loop uses all 8; 4 floor-tap points added.
- pw_shop `button` (new)*: Quick + editor, drums + bass. Checks: >= 44 px, aria name, head fit, playback stops, gear opens
  over seq, Back returns, toms grow the grid 4 -> 5, the ⋯ row stays, no button in write / view.
- pw_seats `shop`: per seat, the label + hotspot open "<X> shop"; header aria = the ⋯ row text.
- pw_seq `layout`*: sketch heads (4 seats x Quick / editor, plain + Bigger text + insets): 67 / 73 ALL PASS.
- pw_bands_render `garage`*: 7 -> C.HOTSPOTS.length. Results: full pw_garage 223/223 at both sizes. Also ALL PASS: pw_tutorial*, pw_shop spaces / seat*, pw_seats shop*, and at 390
  pw_perf, pw_settings, pw_world, pw_flow, pw_seq seq + quick, pw_seats garage, pw_shop gear.
- Node suite ALL PASS; size 5,222,582 B. Owner shots (440x956): `<scratchpad>/v131_shots/lane_s_*` (garage drums / bass,
  the sketch pad editor drums / Quick bass, the shop opened from the header).

## Hand-overs (not my files)
- 02_contracts V1.3.1 (optional): note `labelBox`, the label's px 22 + green, and the 0.35 s "already there" delay.
- Lead: phoneqa + the full matrix after the merge (dist is not committed).
- Gap: label text is "Gear shop" on every seat (D6). There is no cart icon inside the canvas label: too small at 20 px.
