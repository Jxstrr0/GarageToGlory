# v1.5 "Desktop": plan contract (written 2026-10-07 against `main` 1.4.0.0; branch `v1.5-desktop` @ `421e496`)

Repo: `/home/user/GarageToGlory`, branch `v1.5-desktop` (= `main` 1.4.0.0 + status Addendum 8 + this contract + stage 0);
`NN:line` = `src/NN_*.js` on `421e496`. Sources: status.md Addendum 8 (K1–K4 + K2 follow-up), four read-only code maps (gig input,
layout + render, menus, settings + save; spot-checked). Read only your lane's section plus §0, §2 and §4 (token rules, status.md).

**Process rule (owner):** never `pkill`/`killall` Chromium, `headless_shell` or `node` by name; track the PIDs you launch, kill
only those, close every browser in a `finally {}`. Chromium: `/opt/pw-browsers` (never `playwright install`). WIP to
`wip-v15-<lane>` before any long wait; runs over 10 minutes go through `run_in_background` into a file.
**Owner rules:** no USA content; no share/screenshot/download button, ever; owner questions are popups with 2–4 options,
recommended first; no model identifiers in code, comments, docs, reports or commits.
**Phone law (every lane, every line):** at 390x844 and 440x956 (phone contexts: `isMobile`, `hasTouch`, `(pointer: coarse)`) the
game is today's: same DOM geometry, classes and tests. Every desktop feature is gated on `html.gg-wide` (layout), `html.gg-desk`
(fine pointer + hover), `html.gg-keys` (input mode keys) or `html.gg-kbnav` (focus-ring mode); none is set in a phone context
before a key is pressed. Proof: §3 phone-freeze fixtures + every existing `tests/pw_*.js` + `tools/phoneqa.js` green **unchanged**.
**Save law:** old saves and settings blobs load; new settings default in `GG.prefs.normalize` only (never written until changed);
career state, save codes and HoF backups unchanged; SAVE_SCHEMA unchanged.

---

## 0. Owner answers (LOCKED, do not re-pitch; status.md Addendum 8, popups 2026-10-07)
| # | Question | Answer (locked) |
|---|---|---|
| — | Ask | Owner: *"Can we make an option to play on PC / Keyboard as well?"* |
| K1 | Scope | **Gigs + menus** on the keyboard: Enter/Space confirm, Esc back/close, arrows/Tab move focus. The mouse keeps working everywhere; touch on phones unchanged. |
| K2 | Gig keys | **Rebindable** (a Settings screen to set your own key per lane). Follow-up, verbatim: *"Rebindable keys but I like the idea of ASDF, Space, and maybe shift beinf default?"* → default set **A S D F + Space + Shift** (one hand on ASDF, thumb on Space, pinky on Shift). Exact lane order per seat: proposed in §4.4, confirmed by §8 Q1/Q2. Replaces the D F J K popup default. |
| K3 | Layout | **A wider PC layout** that uses the extra width (wider gig highway + stage view, menus side by side); **phones keep today's layout exactly**. |
| K4 | Fairness | **Same rules** for keys and touch (same timing windows and grades) + **a keyboard lag calibration step**. |
| — | Method | Plan + PC mockups first (owner picks), then build; phone layouts at 390x844 / 440x956 must not change. |

### Defaults (taken without a popup; they stand unless the owner objects — list them in the merge summary)
- D1 Keys are **physical** (`KeyboardEvent.code`: AZERTY/QWERTZ get their own home row; labels from `getLayoutMap()` where it
  exists, else the code). **Two maps:** the kit (by drum role) and one shared by bass / rhythm / lead (by
  pitch slot); a key keeps its drum / string when you buy lanes. **Lefty:** bound keys stay with their lane (keycaps show where).
- D2 **Old keys keep working** as hidden extras: J K L G H (v1.4 columns, lefty-mirrored as today) while unbound; events with no
  `code` use the v1.4 table verbatim (keeps `pw_gig.js:789-794` + `pw_shop.js:209-212` green unchanged). ShiftRight plays the
  ShiftLeft lane while unbound.
- D3 **Keyboard calibration is separate** (`calibKb` per speaker/headphones), used field by field once measured; until then keys
  use the touch values (= v1.4). The song's input at count-in picks it; first launch on a computer starts on the key test.
- D4 **Key taps feed the per-device dispatch estimate** (`syncDisp`) like touches (snappier drums on a PC; K is the band's audio
  lead, never a grade). Keys never bridge (55:763). `22_sim_gig.js` is not edited.
- D5 **Focus lost mid-song** (alt-tab, the Sticky Keys box): held notes released at once; auto-pause when played on keys.
- D6 **Esc:** pauses a song / resumes from the pause card; back/close in menus (§4.5); garage with nothing open → ☰ menu; title →
  nothing; sticky screens ignore it; a confirm answers No. Restart stays a button only.
- D7 **Enter with nothing focused** only focuses the main button; Space with nothing focused does nothing. Gig cards (between
  songs, results) take Enter/Space only from a fresh press 600 ms after they appear.
- D8 **Garage:** digits 1–8 walk to a spot like a tap (`w1_walk` still advances) + a spot strip (`kb-spots`) in the PC layout or
  after a menu key. Monday card: arrows + Enter (no digit picks). Songwriter grid: Space/Enter toggle the cell.
- D9 **Layout:** Auto = PC layout on a computer (fine pointer + hover) at ≥ 1000x560 CSS px and width ≥ 1.2 × height; tablets and
  narrow windows keep the phone layout (800x900 already works). Settings "Layout: Auto / Phone / PC" forces either. Never mid-song.
  Keyboard settings, the Layout row and key legends show only on a computer, in the PC layout, or after a key press this session.
- D10 Windows Sticky Keys (5 Shift presses in a row): Shift only on rare lanes (§4.4) + a hint whenever a Shift is bound.
  Shift+Esc and Ctrl+W can't be blocked (reserved); Ctrl/Cmd+S/D/F/P are prevented during play.

## 1. Scope
### 1.1 Must
- M1 Gig keys (K2, K4): §4.3 for every seat and 4–6 lanes, defaults §4.4, holds, chords, Esc pause/resume, Space never clicks a
  button, blur/Cmd safety, highway keycaps, legends on the setlist + pause card. Every live song gets it via `ui.playGig` (gigs,
  studio 59b:511, practice 5h:314, rival 59d:513, week gig 60:180).
- M2 Rebinding (Settings → Keyboard: chips, swap on conflict, refuse reserved, reset) + keyboard calibration (`calibKb`).
- M3 Menus (K1): router (Esc / Tab / arrows / Enter / Space / digits), focus memory across re-renders, opener restore, Tab trap,
  ring only in keyboard mode, songwriter grid keys, typing guard, `kb-spots`.
- M4 PC layout (K3, §4.6): right panels beside a live garage, wide gig (§8 Q3), songwriter 2 columns, laptop tab rail, centred
  columns, title column; 3D left/right insets; pixel budget; hover + scrollbars.
- M5 Phone law proof (stage-0 freeze + full matrix + phoneqa at both sizes). M6 New tests: `keys.test.js`, `pw_keys.js`,
  `pw_nav.js`, `pw_wide.js` (1280x720 / 1440x900 / 1920x1080 / 800x900, desktop contexts), `tools/desktopqa.js`.
### 1.2 Nice-to-have (never blocks the merge)
- Settings in 2 columns (wrappers in 5h). Creator preview beside its controls. Van camera beside the road panel. Keycap flash.
### 1.3 Deferred
- Gamepad / MIDI. Per-seat or per-lane-count maps. Rebinding menu keys. Keyboard van drive. Tablet layout. The other §8 Q3 option.

## 2. Reuse map (`421e496`; re-audit at stage 0, fix this table)
| thing | where | reuse how |
|---|---|---|
| v1.4 key table | `55:60 KEYS {d0 f1 j2 k3 s0 l3 g4 h5}` (columns; `col()` 55:127) | verbatim → `P.CLASSIC_KEYS` (11): the D2 extras |
| gig listeners | `55:276-283 listen` (window keydown/keyup; document pointer capture), teardown 330-337 | keys → window capture phase; + window blur |
| key handlers | `55:769-776 onKey`, `689-695 onKeyUp`, `keyHeld[col]` 775/693 | rewritten on `P.keyLane` (§4.3); holds by code |
| timing / tap | `55:765-768 tapTime` (1000 ms stamp rule, `heardAt` 169); `777-792 tap(li, stamp, touch)`, dispatch sample 779 | classic offset by input; `'key'` samples (D4) |
| touch path | `55:740-758 onDown`, bridge 763-764, `onUp` 681-688 | **untouched** |
| drum sync | `55:358-403 beginCount` (K, drawOff 389-393), `playTap` 822-839, `playSeat` 846-867; `11:89-107` | as is |
| pause / end | `55:471 pause`, `491 resume`, 275 visibility, 1193-1203 buttons; end 726, `btn-gig-next` 1065, `btn-gig-done` 1169 | Esc; blur; 600 ms arm |
| setlist / highway | `55:1220-1284 gig-set` (prefs 1240-1248), `readPrefs` 315-320; `872-887 layout` (laneW = W/lanes), `893-919 buildBg` (cached), `221 guard` | `gig-keys`; keycaps in buildBg; wide hooks |
| judging | `22:817 judge`, `862 due`, `801 release`; windows 344-348; THUMBS 285-307 | **untouched** (K4) |
| lanes | `02:25 C.LANES`, `02:88 SEAT_MAX_LANES` (bass 5), `20:332-337`, `22:476 STR_LANES`, adjacent chords 22:582 | key slots (§4.4) |
| prefs / store | `11:33 prof`, `34-49 normalize`, `58 offsets`, `59-66 setCalib`; `10:17-19 DEFAULT_SETTINGS`, `10:141-152` (merge 147) | + keymap / calibKb / layout; DEFAULT_SETTINGS **unchanged** (save.test 78-84) |
| settings / calib | `5h:46-60` helpers, sections 79-148, tab scroll 150; calib 159-290 (`padTap` 224, pads 256/259, save 276-284, first launch 293-300) | `#set-keys`, Layout seg; calib input seg + capture |
| toolkit / stack | `50:57 ui.btn` (type=button: Space clicks on keyup); `frame` 74, `render` 94, `afterChange` 114 | focus memory, `def.back` |
| garage | `52:595 HOT`, `609 ui.hotspot`, fallback `hs-*` 628-670; `40:229 R.goToHotspot`; tutorial 5p:117/214 | `kb-spots` |
| typing / title | `51:535` textarea focus (+ creator-name, code-text, seq-title-input, van-name-input, lk-*); `51:100 frameTitle` | guard; `ui:wide` |
| songwriter grid | `54:310-343` (div.cell, pointer paint 343); child order 54:678/753 | role=grid, roving tabindex |
| render / stage | `40:50 pixelRatio`, `86 insets`, `222 setViewInsets`, governor 100-104/300-330, `462 fitCamera`; `42:1465-1475` | L/R insets, budget, hFov cap |
| insets / CSS | `60:38-50 updateInsets`; shell `00:89-124`; 12 injected blocks (52:98 … 5q:41) | wide branch; `html.gg-wide`, 5w last |
| tests | `_pw.js:32` (isMobile + hasTouch); `pw_gig.js:789-794`; `pw_shop.js:209-212`; `pw_settings.js:159-260`; `phoneqa.js` | additive `opts.desktop`; pins unchanged |

## 3. Stage 0 (lead, one commit on `v1.5-desktop` before the lanes fork)
1. **Re-audit** the §2 lines; fix the table.
2. **Phone freeze FIRST (before ANY `src/` edit):** `tools/phone_freeze.js` (phone context, `PW_VIEW`) →
   `tests/fixtures/phone_freeze_390.json` + `_440.json`; `tests/pw_freeze.js` recomputes == fixture (in the pw matrix forever).
   - Career `GG.main.quickStart({ seed: 4242, slot: '1', bandId: 'hail_damage' })`, `calibSeen: true` (as phoneqa:77-79).
   - Screens: title; garage idle; plan sheet; Monday card; week results; laptop (Band, Trophies); shop gear; ☰ menu; settings
     (top, `#set-play`, `#set-audio`, `#set-look`); calib; songwriter Quick + editor; gig-set; count-in; pause card; between
     card; gig-results; HoF; world. Bigger text on: settings, gig-set, plan sheet, songwriter editor.
   - Per screen once `document.getAnimations().length === 0`: `html.className`, body scroll size, and for every visible
     `[data-testid]`, `.layer`, `.sheet`, `.full-body`, `.full-foot`, `.hud-bar`, `.dock`, `canvas`: rect (0.5 px), `display`,
     `font-size`, `padding`, `grid-template-columns` (no text: the version label changes); `debug('render').insets`;
     `debug('gigui') { lanes, laneW, hitY }` on gig screens.
   - Optional: SHA-256 of `page.screenshot({ animations: 'disabled', caret: 'hide', mask: [canvas] })`, kept if 3 runs match.
3. **`VERSION` = `1.5.0.0`**. 4. **`02_contracts.js`**: V1.5 DESKTOP block (§4 shapes, classes, events, testids, debug).
5. **`11_settings.js`** (pure): §4.1 fields + helpers. Migration = normalize only (absent/invalid → default; no blob rewritten);
   `offsets()` / `setCalib()` without `input` exactly as today (`sim_gig.test.js:476-480`). 6. **`src/50b_ui_input.js`** (new):
   `GG.input` §4.2 with the `html.gg-wide` switch (**no wide styles yet**), the capture slot and the gig-live flag; `ui.wide`.
7. **`tests/_pw.js`**: additive `open({ desktop: true })` → `isMobile: false, hasTouch: false`. **`tests/keys.test.js`**: defaults; a
   v1.4 blob; invalid / duplicate / reserved lists fall back per kind; `keySlot`; `keyLane` (bound, extras, code-less = v1.4,
   ShiftRight, off-rig swallowed); `bindKey` swap + refusal; `resetKeys`; `calibFor`; `layoutFor` at 390x844, 844x390, 956x440,
   800x900, 1280x720, 1440x900, 1920x1080, 1080x1920 and forced phone / wide.
8. **Mockups + one owner popup** (§8): `plan/v15_desktop_mockup.html?gig=G1|G2&menu=P|C` + PNGs at 1440x900 (garage + planner,
   gig play with keycaps, Settings → Keyboard) → record in §0 + status Addendum 8.
9. Node suite; `pw_freeze` equal at both sizes after steps 3–7; desktop smoke (1440x900: `gg-wide gg-desk gg-keys`; 800x900:
   `gg-desk gg-keys`; phone: none, `GG.input.mode === 'touch'`). Report `plan/v15_stage0_report.md` (≤ 40 lines). Commit, push, fork.

## 4. Shared contract (every lane codes against this)
### 4.1 Settings (global `gg.v1.settings`; defaults in `P.normalize` only)
- `keymap = { drums: [6 codes by C.LANES], strings: [6 codes by slot] }`. Per kind: 6 distinct strings matching
  `/^[A-Za-z0-9]{2,24}$/`, none reserved, else that kind → its default. An unchanged kind is not stored; reset stores the map
  without that kind (shallow merge, 10:147). Not named `keys` (clashes with `settings:changed {keys}` and `save.KEYS`).
- `calibKb = { speaker: prof, headphones: prof }` (prof() shape `audio, visual, at, vat`; top level, since prof() strips extras).
  `layout = 'auto' | 'phone' | 'wide'` (default auto).
- Helpers (11, pure): `P.KEY_KINDS`; `P.KEY_DEFAULTS` (§4.4); `P.KEY_RESERVED` (Escape Tab Enter NumpadEnter CapsLock ContextMenu
  Control* Alt* Meta* OS* F1–F24 NumLock ScrollLock Pause PrintScreen Fn* Unidentified ''); `P.CLASSIC_KEYS` (55:60 verbatim);
  `P.keyKind(seat)`; `P.keySlot(kind, lane, lanes)` (drums: lane; strings: top lane of a 5/6-lane rig → slot 5, else lane);
  `P.keysFor(s, kind, lanes)`; `P.keyLane(s, kind, lanes, code, key)` (§4.3); `P.bindKey(s, kind, slot, code)` → `{ keymap,
  swapped: slot|null, refused: 'reserved'|'invalid'|null }` (a same-kind conflict swaps: no lane is ever unbound);
  `P.resetKeys(s, kind)`; `P.keyLabel(code, layoutMap?)`; `P.calibFor(s, input)` (`'keys'`: audio from calibKb if `at > 0`,
  visual if `vat > 0`, else calib); `P.offsets(s, input?)`; `P.setCalib(profile, o, input?)` (`'keys'` → calibKb); `P.LAYOUTS`;
  `P.layoutFor(w, h, desk, pref)` (phone → false; wide → `w ≥ 1000 && h ≥ 560`; auto → that `&& desk && w ≥ 1.2 h`).
### 4.2 `GG.input` (50b, stage 0; DOM, never loaded by node)
- `mode` `'keys'|'touch'`: a trusted non-modifier keydown → keys; pointerdown with `pointerType` touch|pen → touch; the mouse never
  changes it (`locator.click()` sends `'mouse'` in phone contexts too). Start: `desk ? 'keys' : 'touch'`.
- `desk` = `matchMedia('(hover: hover) and (pointer: fine)')` (+ change); `kbSeen` (session); `wide()`; `showKeyUI()` = `desk ||
  kbSeen || wide()`; `layoutPref()`. Classes `gg-desk`, `gg-keys`, `gg-wide` (`P.layoutFor(innerWidth, innerHeight, desk, layout)`,
  re-evaluated on resize (debounced 200 ms), media change, `settings:changed {layout}`). Events `'input:mode'`, `'ui:wide'`.
- `capture(fn)` → `release()`: one exclusive slot; a window capture-phase keydown/keyup listener (registered first) hands every key
  to `fn(ev)` and stops it (`preventDefault` + `stopImmediatePropagation`). Used by rebinding and key calibration.
- `gigLive(on?)`: 55 sets true at count-in / resume, false at pause, song end, teardown. While live the menu router only blocks
  Tab and the wide switch waits for `gigLive(false)`. `debug('input') = { mode, desk, wide, layout, kbSeen, kbnav, live, captured }`.
### 4.3 Gig keys (55; Lane I)
- Frozen at count-in (like drawOff): `G.kind`, `G.keymap = P.keysFor(..)`, `G.input = GG.input.mode`, `G.offKey = P.offsets(s,
  'keys')`, drawOff from `P.calibFor(s, G.input)`, `G.caps = G.input === 'keys'`.
- **Resolve** `P.keyLane`: (1) `code` bound to a lane on this rig → `{ lane }` (ShiftRight → the ShiftLeft lane while unbound);
  (2) bound in this kind but off this rig (Space on a 4-lane rig) → `{ lane: -1 }` (swallowed, no tap); (3) `code === ''` →
  `CLASSIC_KEYS[key.toLowerCase()]` → `{ col }`, else derive a code from `key` (`'a'` → KeyA, `' '` → Space, `'Shift'` →
  ShiftLeft) → (1); (4) `code` unbound and `key` ∈ j k l g h → `{ col }`; (5) `null`. `{ col }` ≥ lanes → null; 55 maps it
  through `col()` (lefty, as v1.4).
- **keydown** (window, capture): only with G in count|play|hold, not paused (pause card: Esc/Enter → `resume(false)`); skip
  `isComposing`/229 and input/textarea/contenteditable targets; Esc → `pause(false)`; Tab → preventDefault; Ctrl/Meta/Alt → no
  tap (preventDefault Ctrl/Cmd+S/D/F/P), Meta → `releaseAll()`; resolve; `null` → native; else **preventDefault**; id = `code ||
  key`: `ev.repeat` or already down → stop; add to the down-set (trusted events only: synthetic ones never wait for a keyup);
  `wake()`; `r = tap(lane, ev.timeStamp, 'key')`; strings: `G.keyDown[id] = { lane, hold: press(lane, r) }`. Never skip `shiftKey`.
- **keyup:** resolvable → preventDefault (Space never reaches a button); leave the down-set; string seats lift that id's lane with
  `tapTime(stamp, 'key')` unless another down id holds it; drums: no-op.
- **Safety:** blur `document.activeElement` at count-in and resume. `releaseAll()` (lift key-held lanes now, clear the down-set) on
  window blur (+ `pause(true)` if `G.input === 'keys'` or a key tapped this song), visibility hidden (already pauses) and Meta.
- **Timing (K4):** `tapTime(stamp, kind)` as today except classic mode subtracts `G.offKey.audio` for keys; 1000 ms stamp rule
  kept; `tap()` samples dispatch for `true` and `'key'`. Same windows, chord rule, two-thumb charts, drum-sync booking.
- **Cards:** between / results with `G.input === 'keys'`: focus `btn-gig-next` / `btn-gig-done` 600 ms after the card shows; a
  Space/Enter keydown or keyup whose press began earlier is preventDefault-ed.
- **Keycaps:** buildBg draws each lane's `P.keyLabel` in its hit zone when `G.caps` (cached; built at count-in). Legends `gig-keys`
  on gig-set (dots + caps + `gig-keys-change` → `ui.show('settings', { tab: 'keys' })`) and `gig-pause-keys` ("Esc to resume") on
  the pause card, only when `GG.input.showKeyUI()`. Header lines 55:4/21/27/30 updated.
### 4.4 Default keys (proposed; §8 Q1/Q2 confirm)
| Kit (drums), by role | kick | snare | hats | crash | toms (lane 5) | ride (lane 6) |
|---|---|---|---|---|---|---|
| key | **Space** | **D** | **F** | **S** | **Shift** | **A** |
- 4-lane kit = Space D F S (thumb, middle, index, ring). Snare (38–43 % of notes) on the middle finger, hats (16–21 %) on the
  index; every top chord pair (kick+snare, snare+hats, kick+crash, snare+ride, kick+hats, kick+ride) on two fingers; toms + ride
  never chord (A and Shift share the pinky safely); toms < 1 %, runs ≤ 3 → Shift never trips Sticky Keys.

| Strings (bass / rhythm / lead), low → high | 4 lanes | 5 lanes (bass max) | 6 lanes |
|---|---|---|---|
| keys | A S D F | A S D F + **Space** (top) | A S D F + **Shift** (5th) + **Space** (top) |
- Stored `[KeyA, KeyS, KeyD, KeyF, ShiftLeft, Space]` (slot 4 = 5th of 6, slot 5 = top). The top string carries ~20 % with runs of
  5+ (rhythm, 6 lanes, Hard: 60 runs, longest 8) → thumb, never Shift; the 5th of 6 is 0.5–7 %, runs ≤ 3. Chords are adjacent
  lanes; no hold overlaps another note (0 of 6,878) → 2-key rollover is enough.
- `P.KEY_DEFAULTS = { drums: ['Space','KeyD','KeyF','KeyS','ShiftLeft','KeyA'], strings: ['KeyA','KeyS','KeyD','KeyF','ShiftLeft',
  'Space'] }`. An option-2 answer changes only this constant + keys.test.
### 4.5 Menus on the keyboard (Lane N: `50_ui_core` + new `src/50k_ui_keys.js`)
- **Router** (one document capture keydown + one pointerdown; no rAF, no MutationObserver). Order: (0) `GG.input` capture never
  reaches it; (1) `gigLive()` → only block Tab; (2) typing focused → Esc blurs, other keys native (A S D F Space type); (3) Esc →
  back; (4) arrows → nearest visible enabled control that way (rects) in the top layer + `.tut-card` (not inside `[data-keys=own]`,
  range, select), `scrollIntoView({ block: 'nearest' })`; (5) Tab / Shift+Tab cycle the top layer + `.tut-card`; nothing open →
  HUD → dock → `kb-spots`; (6) focus on body / hidden / inert: Enter focuses the default (no click), Space swallowed; (7) garage,
  nothing open: digits 1–8 → `R.goToHotspot(SPOTS[i])` (no 3D → emit `'hotspot'`). Ctrl/Meta/Alt and `isComposing` ignored.
- **Esc → back:** `def.back` (testid | fn) or `KEY_BACK` (genre/settings `btn-back`, seq `btn-seq-close`, board `btn-board-close`,
  world `btn-world-close`, tour-region `btn-region-back`, look `lk-cancel`, logo `btn-logo-back`, hof `hof-back`, calib `btn-back`,
  recap `recap-close`; intro/seat/creator → `ui.close`) clicked if present, enabled, visible → confirm: `btn-confirm-no` →
  non-sticky sheet/modal: `ui.close(top)` → sticky (results, wrap, gig, gig-set, gig-results, road, label-demand, cert, loonies,
  loonie-card, rival-set, rival-verdict, tour-flight, moose-opera, tour-payoff, gong): nothing → empty stack in the garage: ☰ →
  title: nothing. `end-back` stays "previous card"; the tutorial card never closes.
- **`html.gg-kbnav`:** on with Tab, arrows, Enter, Esc, digits; off on any pointerdown. Ring (50k CSS): `html.gg-kbnav
  :focus-visible:not(input):not(textarea) { outline: 3px solid var(--amber); outline-offset: 2px }` (grid cells −2px).
- **Focus manager (50_ui_core; no-op unless `gg-kbnav`):** `ui.define(id, { …, back, focus })`; `ui.focusDefault(id?)`:
  `[data-autofocus]` → `def.focus` → foot's enabled `.btn.primary` → first enabled button → `btn-close` (danger confirm → No);
  `show()` remembers the opener + focuses the default; `render()` restores the focused `data-testid` (+ index) with
  `preventScroll`; `close()` → opener if connected and not inert, else the new top's default, else the dock's primary. Text inputs
  are never auto-focused.
- **`kb-spots`** (52): `kb-hs-<action>` buttons with digits, SPOTS order + `spotOf()` labels; shown only with (`gg-kbnav` or
  `gg-wide`) in the garage with nothing open, else `display: none`; `hs-*` never reused. **Seq grid** (54): `role=grid`, cells
  `role=gridcell` (never button: phoneqa), `aria-selected`, roving tabindex from `D.view.focus { l, s }`; ←/→ lane, ↑/↓ step,
  Home/End, PgUp/PgDn ±4; Space/Enter toggle via the tap path (`paint = { value }` refactor keeps the kick rule, partV2 upgrade,
  preview). `debug('keys') = { top, focus, opener, lastEsc, nav }`.
### 4.6 PC layout (Lane W: new `src/5w_ui_wide.js` CSS block (injected last) + 40/42/60; DOM hooks by each file's owner)
- Every rule prefixed `html.gg-wide` (or `html.gg-desk` for hover + thin themed scrollbars), checked against per-screen rules up
  to (0,3,0) (`.full.seq .full-body`, `.full.van .full-body`). 1280x720, 1440x900, 1920x1080 are wide; 800x900 = phone layout +
  `gg-desk` niceties.
- **Generic:** `.full-body`/`.full-foot` centred column `padding-inline: max(16px, (100% − 1120px) / 2)` (not gig, title, van,
  world); **sheets = right panel** (top = HUD bottom, bottom 0, right 0, width `clamp(440px, 36vw, 600px)`, `.tall` too, grip
  hidden, slides from the right); modal max 420; dock centred 480; HUD max 1200 centred.

| screen | PC rule | hook (owner) |
|---|---|---|
| garage + panels (plan, Monday card, week results, wrap, ☰, shop) | live room on the left; `setViewInsets({ right })` | 60 (W) |
| laptop (53, Band 58, Trophies 5o) | panel `clamp(640px, 52vw, 900px)`; tabs = left rail; cards + trophy rows 2 across | `.lt-tabs` at 53:116 (N) |
| songwriter (54) | grid: 360 px left (header, tabs, meters, coach, toggle, chips) + main; `.seq-grid` max lanes × 120; Quick: recipes left, sliders right | classes if needed (N) |
| gig play **G1** (rec.) | highway centred, width `clamp(lanes×110px, 46vw, lanes×140px)`, height `clamp(300px, 48vh, 540px)`, translucent bg, gem `min(laneW − 20, 100)`; stage frame bottom = 0.45 × highway; bar / crowd / cards max 720 | `data-lanes`, gem, bg alpha, guard() (I) |
| gig play G2 (alt.) | stage left, full-height highway right (same LOOK); `setFrame { left, right }` + X offset | 42 (W), guard() (I) |
| gig-set / gig-results | right panel / 2 columns (grid by class; `display: contents` wrappers only if unavoidable) | classes (I) |
| title (51) | `.title-wrap` max 520 centred; `frameTitle` on `ui:wide` | listener (N) |
| van 57 / tour 5i | van overlays left column ≤ 440, road = panel; `.tw-map` width `min(100%, (100vh − 170px) × 100/72)`, package / homecoming = panel | — |
| settings, HoF, board, label, recap, ending, creator | centred column (settings 860); `hof-entry` = panel | — |
- **3D:** one full-window renderer. `R.setViewInsets` + `debug('render').insets` gain `left/right` (default 0; additive: pw_garage
  reads `bottom === -1`, pw_perf/perf.js `bottom > 0`); `fitCamera` fits `W − left − right` with a centred X view offset. Wide:
  60 sends `right = panel width, bottom = −1`; a docked tall sheet is not `covered` (idle 30; phones keep 10); 42 hFov ≤ 100°;
  pixel budget `ratio = min(ratio, sqrt(2.4e6 / (W × H)))` (`debug('render').pxBudget`). Crossing the threshold re-runs
  `updateInsets` (W), `frameTitle` (N), the gig's `layout()` + `guard()` (I, between songs).
### 4.7 Key UI: binding + calibration (5h; Lane I)
- **`#set-keys`** (tab `keys`, between Play and Audio; `showKeyUI()` only): seg `set-keys-kind-drums|strings` (starts on the seat's
  kind); 6 chips `set-key-<kind>-<slot>` (lane colour + name + keycap; lanes past the gear dimmed but bindable; string slots Low,
  2, 3, 4, 5th (6-lane), Top); `set-keys-msg` (aria-live); `set-keys-reset`; `set-calibrate-keys` ("Key timing"); `set-keys-sticky`.
- **Bind:** click / Enter / Space on a chip → "Press a key…" → next tick `GG.input.capture` → `P.bindKey` → saved + message
  ("Swapped: Hats is now S", "Tab is for menus — pick another key"); Esc, a click elsewhere or 8 s cancel (the capture swallows
  the chip's own Space keyup). **Layout** seg `set-layout-auto|phone|wide` in Look + feel (same visibility).
- **Calibration:** `calib-input-touch|keys` (`showKeyUI()` only; starts on `GG.input.mode`); keys: blur, then `GG.input.capture`
  for the test (any non-reserved key, `ev.timeStamp`, same `calibCompute`; Esc stops) → `P.setCalib(profile, o, 'keys')`.
### 4.8 Test ids (new; every existing id kept; never `hs-*`)
`set-keys`, `set-keys-kind-drums|strings`, `set-key-<drums|strings>-<0..5>`, `set-keys-msg`, `set-keys-reset`, `set-calibrate-keys`,
`set-keys-sticky`, `set-layout-auto|phone|wide`, `calib-input-touch|keys`, `gig-keys`, `gig-keys-change`, `gig-pause-keys`,
`kb-spots`, `kb-hs-<action>`.
### 4.9 Debug, size + perf budgets
`debug('input')` §4.2; `debug('keys')` §4.5; `debug('gigui')` += `keys: { kind, map, input, caps, down, held, last: { code, key,
lane, col, at } }, keyTaps, keySwallowed`; `debug('render')` += `insets.left/right`, `pxBudget`; `debug('calib')` += `input`.
`dist/game.html` ≤ 6,000,000 B (today 5,248,626; v1.5 net ≤ +60 KB). Router + input: listeners only; keycaps: cached canvas.
Phone `pw_perf` unchanged; 1920x1080 at dpr 2 ≤ 2.4 MP drawn, gig frame p95 ≤ 1.2 × the 1440x900 p95; docked panel ≤ 30 fps idle.

## 5. Lanes (3 agents, medium effort; isolated copies; never publish)
Isolation: `cp -r repo /work/<lane>`, branch `v15-<lane>` from stage 0. **Single file ownership**; anything else is a hand-over
request. Before reporting, each lane runs the full existing pw matrix + `pw_freeze` + phoneqa at 390x844 and 440x956. Return
`wip-v15-<lane>` + a ≤ 40-line `plan/v15_lane_<i|n|w>_report.md` (APIs as built, tests, numbers, hand-overs).

### Lane I — INPUT (gig keys, calibration, settings)
- Owns: `src/55_ui_gig.js` (§4.3 + its §4.6 hooks: `data-lanes`, gem width, bg alpha, guard() wide frame, results classes,
  `ui:wide` → layout()/guard() between songs), `src/5h_ui_settings.js` (§4.7); `tests/pw_keys.js` (new).
- `pw_keys` (desktop 1280x720 unless noted): `keys` (each default key per seat × 4/5/6 lanes hits its lane; Space on a 4-lane string
  rig swallowed; J K L G H; code-less `d` = v1.4; Shift held + D; string holds, Shift-held keyup releases; repeat; Ctrl+D);
  `fair` (key and touch taps at equal offsets → equal grades; chord cap 2); `space` (mouse-focused `btn-gig-pause` + 40 Space: no
  pause; mashing past the song end never skips the between card; a fresh Enter after 600 ms does); `esc`; `blur` (released +
  paused); `rebind` (bind, swap, Tab/Escape/Enter/F5 refused, reset, reload, used in the gig, keycap); `calib-keys` (calibKb
  written, touch untouched, fallback); `phone` (390 phone context: no Keyboard section, Layout row, calib seg, `gig-keys`,
  keycaps); `wide-gig` (highway bounds, 4 and 6 lanes, 3 sizes; note travel time == phone).

### Lane N — NAV (menus: focus, Esc, Tab, arrows, garage, songwriter grid)
- Owns: `src/50_ui_core.js`, `src/50k_ui_keys.js` (new: router, `KEY_BACK`, `gg-kbnav`, ring + `kb-spots` CSS), `51_ui_menu`
  (title default, intro/seat/creator, `frameTitle` on `ui:wide`), `52_ui_week` (`kb-spots`, planner, Monday card, results Skip →
  OK), `53_ui_laptop` (`.lt-tabs`), `54_ui_sequencer` (grid), small `def.back`/autofocus hooks in 56, 58, 59*, 5g, 5i–5q
  (`.tut-card` joins the Tab cycle); `tests/pw_nav.js` (new).
- `pw_nav` (desktop 1280x720 + 800x900; one 390 phone pass, no keys): `career` (creator name typing "asdf " only types → seat →
  digit 1 opens the planner via `'hotspot'`, tutorial advances → arrows + Enter → Esc → a gig started with Enter); `esc` (each
  sticky screen ignores it; confirm → No; sheets close; full screens use their back; garage → ☰; title nothing; tutorial stays);
  `focus` (kept after a planner re-render; opener restored; Tab trap; ring after keys only, gone after a click; inputs never
  auto-focused); `seq` (arrows, Space via apply, kick rule, Esc); `phone` (`kb-spots` hidden, no `gg-kbnav`).

### Lane W — WIDE (CSS, layout, 3D framing)
- Owns: `src/5w_ui_wide.js` (new CSS block + small layout JS), `src/40_render_core.js`, `src/42_render_stage.js`, `src/60_main.js`
  (updateInsets, `ui:wide`), `00_shell.html` CSS only if a shell rule can't be beaten; `tests/pw_wide.js`, `tools/desktopqa.js` (new).
- `pw_wide` (desktop 1280x720, 1440x900, 1920x1080, 800x900): `layout` (classes; no horizontal overflow on every §4.6 screen;
  panel / column bounds; garage hotspots on screen beside an open planner; `insets.right` = panel width; not covered); `gig`
  (highway bounds, stage both sides, hFov ≤ 100°); `switch` (1440 → 800 → 1440 re-runs insets; mid-song resize deferred); `perf`
  (≤ 2.4 MP at 1920x1080 dpr 2; p95 budget); `pref` (Layout Phone / PC). `desktopqa`: overflow, clipped or < 32 px controls, hover.

### Lead — stage 0, mockups, merge, review
- Owns `VERSION`, `02_contracts`, `11_settings`, `50b_ui_input.js`, `tests/_pw.js`, `keys.test.js`, `pw_freeze.js`,
  `tools/phone_freeze.js`, `tests/fixtures/phone_freeze_*`, `plan/`, mockups, owner popups, status, the merge.
- **Hand-overs:** I and N build on stage 0's `capture` / `gigLive` (the router never acts while either is on); W needs the (I)/(N)
  hooks of §4.6, added by their owners. Anything else goes in the report's "Hand-overs" (function, behaviour, test); lead applies.

## 6. Merge order and release checklist
1. Stage 0 (freeze fixtures FIRST; popup answered). 2. Lanes I, N, W in parallel (one message). 3. Merge I, then N, then W;
   hand-overs. 4. Node suite ALL PASS (`keys`, `save`, `sim_gig`, `sync`). 5. **Phone matrix unchanged:** `pw_freeze` equal +
   every `tests/pw_*.js` section + `tools/phoneqa.js` at 390x844 and 440x956 (`PW_VIEW=440x956`); no existing test edited (only
   the additive `_pw.js`); no horizontal scroll; button audit. 6. **Desktop:** `pw_keys`, `pw_nav`, `pw_wide`, `desktopqa` at
   1280x720, 1440x900, 1920x1080 (+ 800x900). 7. Size gate (`tools/perf.js`) ≤ 6,000,000; `pw_perf`; no-USA scan.
8. Owner check (one popup: ship / tweak): 1440x900 shots (garage + planner panel, laptop Band, songwriter editor, gig-set legend,
   gig play 4 and 6 lanes with keycaps, pause card, results, Settings → Keyboard mid-rebind, key calibration), 1920x1080 gig,
   1280x720 garage, 800x900 garage, and 440x956 proof shots (garage, gig, settings) identical to v1.4.
9. Review (≤ 3 lenses: phone-unchanged, input timing/fairness, keyboard UX); verify only blocker/major findings.
10. PR to `main`; status: Version, What's in v1.5, APIs, Addendum 8 ticked.

## 7. Risks
- **Phone drift** (an unprefixed rule, a wrapper breaking `:first-child`, a ring on inputs in pw shots) → phone law, `pw_freeze`,
  phoneqa, `display: none` (never off-screen), no programmatic focus outside `gg-kbnav`. A real key press inside a phone test
  (`pw_shop:211`) sets `kbSeen`, so later screens there may show legends: allowed (keycaps freeze per song; I runs pw_shop + pw_gig).
- **Space clicks buttons** (type=button clicks on keyup; Firefox even after a prevented keydown) → blur at count-in/resume,
  preventDefault keydown + keyup, swallowed Space with no focus, the 600 ms card arm.
- **Stuck notes** (alt-tab, macOS Cmd eats keyups, Sticky Keys box) → releaseAll on blur / hidden / Meta; auto-pause on keys.
- **Legacy key tests** (`pw_gig:793` code-less `d`; `pw_shop:211` real `g`/`h`) → the D2 classic layer, pinned in keys.test.
- **Unfair timing** → judge untouched, same stamp-based tapTime (never frame time), classic offset per input, the `fair` test.
- **3D beside a panel / very wide stage** → L/R insets, hFov cap, hotspot check. **1920 at dpr 2** → pixel budget. **Specificity**
  (12 injected blocks) → 5w injected last + the (0,1,1) prefix. **Focus lost on re-render** → testid + index restore.
- **Mid-song resize** → `gigLive` defers. **AZERTY / IME** → codes + `getLayoutMap`, `isComposing`. **Size** → +60 KB of ~750 KB.

## 8. Owner questions (one popup at stage 0 step 8; record answers in §0)
**Q1. Drum keys (A S D F + Space + Shift): which drum on which key?**
1. *(recommended)* "Strong fingers": Space kick, D snare, F hats, S crash, Shift toms, A ride (4-drum kit = Space D F S). Why: the
   busiest drums on the strongest fingers, every common two-drum hit on two fingers, Shift only on the rarely-hit toms.
2. "Left to right": Space kick, S snare, D hats, F crash, A toms, Shift ride. Reads like the screen on the 4-drum kit, but the
   snare (40 % of notes) sits on the ring finger and a ride on Shift can pop up Windows' Sticky Keys box.
**Q2. Bass, rhythm and lead keys (low string on the left):**
1. *(recommended)* A S D F; 5 lanes: Space is the top string; 6 lanes: Shift is the 5th, Space the top. Why: the top string is busy
   (about 1 note in 5), so it goes on the thumb; Shift only gets the quiet 5th string.
2. Always A S D F Space Shift in that order (simpler to remember; on 6 lanes the busy top string lands on Shift).
**Q3. Gigs on a PC screen (mockup):** 1. *(recommended)* G1: a wider, taller highway centred under the stage, stage visible on
both sides (closest to the phone game, big lanes, cheapest). 2. G2: the stage on the left, a full-height highway on the right.
**Q4. Menus on a PC screen (mockup):** 1. *(recommended)* A panel on the right with the live garage still visible on the left (the
planner next to the room). 2. Centred cards over a dimmed garage.
