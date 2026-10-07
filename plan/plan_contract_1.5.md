# v1.5 "Desktop": plan contract (written 2026-10-07 against `main` 1.4.0.0; branch `v1.5-desktop` @ `421e496`)

Repo: `/home/user/GarageToGlory`, branch `v1.5-desktop` (= `main` 1.4.0.0 + status Addendum 8 + this contract + stage 0);
`NN:line` = `src/NN_*.js` on `421e496`. Sources: status.md Addendum 8 (K1–K4 + K2 follow-up), four read-only code maps (gig input,
layout + render, menus, settings + save; spot-checked), critic pass 1 (2026-10-07: 1 blocker + 8 major + 7 minor, each checked
against the code and applied). Read only your lane's section plus §0, §2 and §4 (token rules, status.md).

**Process rule (owner):** never `pkill`/`killall` Chromium, `headless_shell` or `node` by name; track the PIDs you launch, kill
only those, close every browser in a `finally {}`. Chromium: `/opt/pw-browsers` (never `playwright install`). WIP to
`wip-v15-<lane>` before any long wait; runs over 10 minutes go through `run_in_background` into a file.
**Owner rules:** no USA content; no share/screenshot/download button, ever; owner questions are popups with 2–4 options,
recommended first; no model identifiers in code, comments, docs, reports or commits.
**Phone law (every lane, every line):** at 390x844 and 440x956 (phone contexts: `isMobile`, `hasTouch`, `(pointer: coarse)`) the
game is today's: same DOM geometry, classes and tests. Every desktop feature is gated on `html.gg-wide` (layout), `html.gg-desk`
(fine pointer + hover), `html.gg-keys` (input mode keys) or `html.gg-kbnav` (focus-ring mode); none is set in a phone context
before a **real** key press (§4.2 `real(ev)`: typing on a phone's on-screen keyboard never counts). Proof: §3 phone-freeze
fixtures + every existing `tests/pw_*.js` + `tools/phoneqa.js` green **unchanged**.
**Save law:** old saves and settings blobs load; new settings default in `GG.prefs.normalize` only (never written until changed);
career state, save codes and HoF backups unchanged; SAVE_SCHEMA unchanged.

---

## 0. Owner answers (LOCKED, do not re-pitch; status.md Addendum 8, popups 2026-10-07)
| # | Question | Answer (locked) |
|---|---|---|
| — | Ask | Owner: *"Can we make an option to play on PC / Keyboard as well?"* |
| K1 | Scope | **Gigs + menus** on the keyboard: Enter/Space confirm, Esc back/close, arrows/Tab move focus. The mouse keeps working everywhere; touch on phones unchanged. |
| K2 | Gig keys | **Rebindable** (a Settings screen to set your own key per lane). Follow-up, verbatim: *"Rebindable keys but I like the idea of ASDF, Space, and maybe shift beinf default?"* → default set **A S D F + Space + Shift** (one hand on ASDF, thumb on Space, pinky on Shift). Exact lane order per seat: proposed in §4.4, confirmed by §8 Q1/Q2. Replaces the D F J K popup default. |
| K3 | Layout | **A wider PC layout** that uses the extra width (wider gig highway + stage view, menus side by side); **phones keep today's layout exactly**. Which picture: §8 Q3 (A or B). |
| K4 | Fairness | **Same rules** for keys and touch (same timing windows and grades) + **a keyboard lag calibration step**. |
| — | Method | Plan + PC mockups first (owner picks), then build; phone layouts at 390x844 / 440x956 must not change. |

### Defaults (taken without a popup; they stand unless the owner objects — list them in the merge summary)
- D1 Keys are **physical** (`KeyboardEvent.code`: AZERTY/QWERTZ get their own home row). Labels: `getLayoutMap()` where it exists
  (Chromium, secure origin), else the key this session saw for that code (§4.2 `learned`), else the code; Settings → Keyboard says
  "Keys go by their position on the keyboard". **Two maps:** the kit (by drum role) and one shared by bass / rhythm / lead (by
  pitch slot); a key keeps its drum / string when you buy lanes. **Lefty:** bound keys stay with their lane (keycaps show where).
- D2 **Old keys keep working** as hidden extras: J K L G H (v1.4 columns, lefty-mirrored as today) while unbound; events with no
  `code` use the v1.4 table verbatim (keeps `pw_gig.js:789-794` + `pw_shop.js:209-212` green unchanged). ShiftRight plays the
  ShiftLeft lane while unbound.
- D3 **Keyboard calibration is separate** (`calibKb` per speaker/headphones) and runs **both steps with keys**: the click test
  (audio offset: Classic timing) and the light check (visual offset: what lines keys up with Drum sync, on by default, 11:45).
  Each field is used once measured (its own flag); until then keys use the touch values (= v1.4). The song's input at count-in
  picks it; first launch on a computer starts on the key test.
- D4 **Key taps feed the per-device dispatch estimate** (`syncDisp`) like touches (snappier drums on a PC; K is the band's audio
  lead, never a grade). Keys never bridge (55:763). `22_sim_gig.js` is not edited.
- D5 **Focus lost mid-song** (alt-tab, a click on another window, a notification, the Sticky Keys box): held notes released at
  once; when played on keys the song **pauses frozen mid-riff** (`pause(false)`, resumes where it stopped). Only a hidden page
  (minimised / tab switched) starts the song over, as v1.4.
- D6 **Esc:** pauses a song / resumes from the pause card; back/close in menus (§4.5); garage with nothing open → ☰ menu; title →
  nothing; sticky screens ignore it; a confirm answers No. Leaving the songwriter, band creator or look editor with changes asks
  first ("Leave without saving?", Esc = keep editing). Restart: the pause card's button (arrows/Tab to it + Enter).
- D7 **Enter with nothing focused** only focuses the main button; Space with nothing focused does nothing. A **held** Enter/Space/Esc
  never repeats a menu action, and a press that began before the screen changed never clicks the new screen. Gig cards (between
  songs, results) take Enter/Space only from a fresh press 600 ms after they appear.
- D8 **Garage:** number keys 1–8 (top row or numpad, by position, so AZERTY works) walk to a spot like a tap (`w1_walk` still
  advances) + a spot strip (`kb-spots`) in the PC layout or after a menu key. Monday card: arrows + Enter (no digit picks).
  Songwriter grid: Space/Enter toggle the cell.
- D9 **Layout:** Auto = PC layout on a computer (fine pointer + hover) at ≥ 1000x560 CSS px and width ≥ 1.2 × height; tablets and
  narrow windows keep the phone layout (800x900 already works). Settings "Layout: Auto / Phone / PC" forces either. Never
  mid-song (a paused song re-lays out its highway at once). Keyboard settings, the Layout row and key legends show only on a
  computer, in the PC layout, or after a real key press this session (D11).
- D10 Windows Sticky Keys (5 Shift presses in a row): Shift only on rare lanes (§4.4) + a hint whenever a Shift is bound.
  Shift+Esc and Ctrl+W can't be blocked (reserved); Ctrl/Cmd+S/D/F/P are prevented during play.
- D11 **Phones:** typing on the on-screen keyboard (band name, song title, codes) never counts as "playing on keys"; only a real
  key press outside a text field switches the game to keyboard mode (§4.2 `real(ev)`).

## 1. Scope
### 1.1 Must
- M1 Gig keys (K2, K4): §4.3 for every seat and 4–6 lanes, defaults §4.4, holds, chords, Esc pause/resume, Space never clicks a
  button, no stuck keys, blur/Cmd safety, highway keycaps, legends on the setlist + pause card. Every live song gets it via
  `ui.playGig` (gigs, studio 59b:511, practice 5h:314, rival 59d:513, week gig 60:180).
- M2 Rebinding (Settings → Keyboard: chips, swap on conflict, refuse reserved, reset) + keyboard calibration (`calibKb`, both steps).
- M3 Menus (K1): router (Esc / Tab / arrows / Enter / Space / digits), repeat + stale-press guard, focus memory across re-renders,
  opener restore, Tab trap, ring only in keyboard mode, unsaved-edit confirm, songwriter grid keys, typing guard, `kb-spots`,
  `kb-hints`.
- M4 PC layout (K3, §4.6): the package picked in §8 Q3 (B recommended / A), 3D insets, pixel budget (PC layout only), hover +
  scrollbars, every drawn extra of the picked mockup (§4.6 tables).
- M5 Phone law proof (stage-0 freeze + full matrix + phoneqa at both sizes + soft-keyboard checks). M6 New tests: `keys.test.js`,
  `wide_css.test.js`, `pw_keys.js`, `pw_nav.js`, `pw_wide.js` (1280x720 / 1440x900 / 1920x1080 / 800x900, desktop contexts),
  `tools/desktopqa.js`.
### 1.2 Nice-to-have (never blocks the merge)
- Settings in 2 columns on the other tabs. Creator preview beside its controls. Van camera beside the road panel. Keycap flash.
### 1.3 Deferred
- Gamepad / MIDI. Per-seat or per-lane-count maps. Rebinding menu keys. Keyboard van drive. Tablet layout. The package not
  picked in §8 Q3.

## 2. Reuse map (`421e496`; re-audit at stage 0, fix this table)
| thing | where | reuse how |
|---|---|---|
| v1.4 key table | `55:60 KEYS {d0 f1 j2 k3 s0 l3 g4 h5}` (columns; `col()` 55:127) | verbatim → `P.CLASSIC_KEYS` (11): the D2 extras |
| gig listeners | `55:276-283 listen` (window keydown/keyup; document pointer capture), teardown 330-337 | keys → window capture phase; + window blur |
| key handlers | `55:769-776 onKey`, `689-695 onKeyUp`, `keyHeld[col]` 775/693; reset only in beginCount 55:386 | rewritten on `P.keyLane` (§4.3); holds by id |
| timing / tap | `55:765-768 tapTime` (sync → no audio offset, 767; 1000 ms stamp rule, `heardAt` 169); `777-792 tap(li, stamp, touch)`, dispatch sample 779 | Classic offset by tap source; `'key'` samples (D4) |
| touch path | `55:740-758 onDown`, bridge 763-764, `onUp` 681-688 | **untouched** |
| drum sync | `55:358-403 beginCount` (K, drawOff 389-393 = `syncVisual(G.off, G.visM)`), `G.visM` 55:318 (from `pf.calib` vat), `playTap` 822-839, `playSeat` 846-867; `11:89-107` (`syncVisual` 107: VIS0 30 ms when unmeasured and 0); drumSync default on 11:45 | visual + visM from the song's input (§4.3) |
| pause / end | `55:471-485 pause` (`pause(true)` sets `G.restart` 474/481 → "The song starts over"), `491 resume`, 275 visibility, `endSong` 448, buttons 1193-1203 (`btn-gig-resume`, `btn-gig-restart`); `btn-gig-next` 1065, `btn-gig-done` 1169 | Esc; blur → `pause(false)`; 600 ms arm |
| setlist / highway | `55:1220-1284 gig-set` (prefs 1240-1248), `readPrefs` 315-320; `871 onResize` (layout() at once), `872-887 layout` (laneW = W/lanes), `893-919 buildBg` (cached), `221 guard` (setFrame 227); contextmenu blocked on the canvas only 1206 | `gig-keys`; keycaps in buildBg; wide hooks; whole-layer contextmenu |
| judging | `22:817 judge`, `862 due`, `801 release`; windows 344-348; THUMBS 285-307 | **untouched** (K4) |
| lanes | `02:25 C.LANES`, `02:87-88 C.SEATS / SEAT_MAX_LANES` (bass 5), `20:332-337 seatLanes`, `22:476 STR_LANES`, adjacent chords 22:582 | key slots (§4.4) |
| prefs / store | `11:33 prof`, `34-49 normalize`, `58 offsets`, `59-66 setCalib` (`c.at = o.at` on every save), `10:17-19 DEFAULT_SETTINGS`, `10:141-152` (merge 147) | + keymap / calibKb / layout; DEFAULT_SETTINGS **unchanged** (save.test 78-84) |
| settings / calib | `5h:46-60` helpers, sections 79-148, tab scroll 150; calib 159-290 (screen 231: `full`, sticky; `padTap` 224, pads 256/259, `calib-visual-only` 251, save 276-284 always passes `at: Date.now()`, first launch 293-300) | `#set-keys`, Layout seg; calib input seg + capture, both steps |
| toolkit / stack | `50:57 ui.btn` (type=button: Enter clicks on keydown + every repeat, Space on keyup); `frame` 74 (sheet/modal `.scrim` click closes the top layer, 81), `render` 94, `afterChange` 114 (lower layers `inert`), `show` 127, `close` 147, `confirm` 181 | focus memory, `def.back` / `def.focus`, focus-move stamp |
| garage | `52:595 HOT`, `609-611 ui.hotspot` + `618 member:tap` (both bail while any screen is open); fallback `hs-*` 628-670; `40:229 R.goToHotspot`, `40:234 R.hotspotScreenPos`; tutorial 5p:117/214 | `kb-spots`; package-A guard |
| editors | `54:698-699 btn-seq-close` (stopPlay + onCancel + close, no dirty check); creator `51:357`; look `5j:80 lk-cancel` | Esc back fn + confirm |
| typing / title | `51:535` textarea focus (+ creator-name 51:364, creator-nick 366, code-text 523, seq-title-input 54:497, van-name-input 57:390, lk-*); `51:100 frameTitle` | guard + `real(ev)`; `ui:wide` |
| songwriter grid | `54:310-343` (div.cell, pointer paint 343); child order 54:678/753 | role=grid, roving tabindex |
| render / stage | `40:39 QUALITY` (high px 2), `40:50 pixelRatio`, `86 insets`, `222 setViewInsets`, governor 100-104/300-330 (`readStack` covered 314-329), `462 fitCamera`; `42:209 setFrame({top,bottom})`; `42:1465-1475`; `debug('render').labelBox` (41:1031, merged by 40:2245) | L/R insets, budget (wide only), hFov cap; freeze probes |
| insets / CSS | `60:38-50 updateInsets` (bottom = top sheet height); shell `00:89-124`, scrim `00:94-96` (.28 sheets / .66 modals); 12 injected blocks (52:98 … 5q:41); infinite animations `00:158 gg-glow` (dock primary), `00:581-583 gg-bob`, `00:839 twPulse`, `5p:57 tutPulse` | wide branch; `html.gg-wide`, 5w last |
| mockups | `plan/v15_desktop_mockup.html?opt=A|B` (`&s=1..4` one 1440x900 screen), contact sheets `_A.png` / `_B.png` | §8 Q3 pictures |
| tests | `_pw.js:32` (isMobile + hasTouch); `pw_gig.js:789-794`; `pw_shop.js:209-212`; `pw_settings.js:159-260`; `phoneqa.js` | additive `opts.desktop`; pins unchanged |

## 3. Stage 0 (lead, one commit on `v1.5-desktop` before the lanes fork)
1. **Re-audit** the §2 lines; fix the table.
2. **Phone freeze FIRST (before ANY `src/` edit):** `tools/phone_freeze.js` (phone context, `PW_VIEW`) →
   `tests/fixtures/phone_freeze_390.json` + `_440.json` + `_844l.json`; `tests/pw_freeze.js` recomputes == fixture (in the pw
   matrix forever).
   - Career `GG.main.quickStart({ seed: 4242, slot: '1', bandId: 'hail_damage' })`, `calibSeen: true` (as phoneqa:77-79); a
     second career `quickStart({ …, seat: 'bass' })` with `gear.seatLanes.bass = 5` for a **5-lane bass** gig.
   - Screens (390 + 440): title; intro; seat; creator; look; garage idle; plan sheet; Monday card; week results; laptop (Band,
     Trophies); shop gear + merch; gig board; ☰ menu; confirm modal; tutorial card; settings (top, `#set-play`, `#set-audio`,
     `#set-look`); calib; songwriter Quick + editor; gig-set; count-in; pause card; between card; gig-results; 5-lane bass gig;
     van + road; tour map + package + homecoming; label; recap; ending; logo; rival; studio; HoF; world. Bigger text on:
     settings, gig-set, plan sheet, songwriter editor. **844x390** (landscape phone): garage, gig, settings.
   - Per screen once every **finite** animation is done (`getAnimations()` with `effect.getTiming().iterations !== Infinity`
     all finished; the dock glow, pulses and crowd bob loop forever): `html.className`, body scroll size, the `data-testid` of
     `document.activeElement`, and for every visible `[data-testid]`, `.layer`, `.sheet`, `.full-body`, `.full-foot`,
     `.hud-bar`, `.dock`, `canvas`: rect (0.5 px), `display`, `font-size`, `padding`, `grid-template-columns`, `outline-style`,
     `outline-width`, `box-shadow`, `opacity`, `visibility`, `transform`, `z-index` (no text: the version label changes);
     `debug('render').insets`. Garage screens: `R.hotspotScreenPos(a)` for every `C.HOTSPOTS` entry (1 px) +
     `debug('render').labelBox`. Gig screens: `debug('gigui') { lanes, laneW, hitY }` + the last `GG.render.stage.setFrame`
     args (wrapped in the page before the gig).
   - Optional: SHA-256 of `page.screenshot({ animations: 'disabled', caret: 'hide', mask: [canvas] })`, kept if 3 runs match.
   - `tests/wide_css.test.js` (node lint, in the node suite): every selector in 5w's injected CSS starts with `html.gg-wide` or
     `html.gg-desk`; every 50k rule starts with `html.gg-kbnav` or `html.gg-wide`; no other `src/` file's CSS names `gg-wide`,
     `gg-desk`, `gg-keys` or `gg-kbnav` except as that leading prefix (passes on stage 0; guards the lanes).
3. **`VERSION` = `1.5.0.0`**. 4. **`02_contracts.js`**: V1.5 DESKTOP block (§4 shapes, classes, events, testids, debug).
5. **`11_settings.js`** (pure): §4.1 fields + helpers. Migration = normalize only (absent/invalid → default; no blob rewritten);
   `offsets()` / `setCalib()` without `input` exactly as today (`sim_gig.test.js:476-480`). 6. **`src/50b_ui_input.js`** (new):
   `GG.input` §4.2 (`real(ev)`, `learned`, the `html.gg-wide` switch (**no wide styles yet**), the capture slot, the gig-live
   flag); `ui.wide`.
7. **`tests/_pw.js`**: additive `open({ desktop: true })` → `isMobile: false, hasTouch: false`. **`tests/keys.test.js`**: defaults; a
   v1.4 blob; invalid / duplicate / reserved lists fall back per kind; `keySlot`; `keyLane` (bound, extras, code-less = v1.4,
   ShiftRight, off-rig swallowed); `codeOf`; `bindKey` swap + refusal; `resetKeys`; `calibFor` (each field from its own measured
   source + `visM`; a light-check-only `calibKb` → `.audio` = touch `calib.audio`, `.visual` = `calibKb.visual`); `setCalib(..,
   'keys')` stamps `at` only with `audio`; `keyLabel` (layout map > `learned` {KeyA: 'q'} → 'Q' > code); `pxBudget` (≥ 2 at
   1024x1366 not wide; ≤ 2.4 MP when wide); `layoutFor` at 390x844, 844x390, 956x440, 800x900, 1280x720, 1440x900, 1920x1080,
   1080x1920 and forced phone / wide.
8. **Mockups + one owner popup** (§8 Q1–Q3): `plan/v15_desktop_mockup.html?opt=A|B` (`&s=1..4`) and the contact sheets
   `plan/v15_desktop_mockup_A.png` / `_B.png` at 1440x900 (garage + planner, gig play 6 drums with keycaps, songwriter,
   Settings → Keys) → record in §0 + status Addendum 8; **delete the unpicked package's table and tests** from §4.6 / §5.
9. Node suite; `pw_freeze` equal at all three sizes after steps 3–7; desktop smoke (1440x900: `gg-wide gg-desk gg-keys`; 800x900:
   `gg-desk gg-keys`; phone: none, `GG.input.mode === 'touch'`, still none after typing "Tanner" + Enter in `creator-name`).
   Report `plan/v15_stage0_report.md` (≤ 40 lines). Commit, push, fork.

## 4. Shared contract (every lane codes against this)
### 4.1 Settings (global `gg.v1.settings`; defaults in `P.normalize` only)
- `keymap = { drums: [6 codes by C.LANES], strings: [6 codes by slot] }`. Per kind: 6 distinct strings matching
  `/^[A-Za-z0-9]{2,24}$/`, none reserved, else that kind → its default. An unchanged kind is not stored; reset stores the map
  without that kind (shallow merge, 10:147). Not named `keys` (clashes with `settings:changed {keys}` and `save.KEYS`).
- `calibKb = { speaker: prof, headphones: prof }` (prof() shape `audio, visual, at, vat`; top level, since prof() strips extras).
  In `calibKb`, `at` means "audio measured" and `vat` "visual measured". `layout = 'auto' | 'phone' | 'wide'` (default auto).
- Helpers (11, pure): `P.KEY_KINDS`; `P.KEY_DEFAULTS` (§4.4); `P.KEY_RESERVED` (Escape Tab Enter NumpadEnter CapsLock ContextMenu
  Control* Alt* Meta* OS* F1–F24 NumLock ScrollLock Pause PrintScreen Fn* Unidentified ''); `P.CLASSIC_KEYS` (55:60 verbatim);
  `P.keyKind(seat)`; `P.keySlot(kind, lane, lanes)` (drums: lane; strings: top lane of a 5/6-lane rig → slot 5, else lane);
  `P.keysFor(s, kind, lanes)`; `P.keyLane(s, kind, lanes, code, key)` (§4.3); `P.codeOf(key)` (`'a'`/`'A'` → KeyA, `'1'` →
  Digit1, `' '` → Space, `'Shift'` → ShiftLeft, else null); `P.bindKey(s, kind, slot, code)` → `{ keymap, swapped: slot|null,
  refused: 'reserved'|'invalid'|null }` (a same-kind conflict swaps: no lane is ever unbound); `P.resetKeys(s, kind)`;
  `P.keyLabel(code, layoutMap?, learned?)` (layout map → learned → from the code: KeyA → A, Digit1 → 1, ShiftLeft → Shift);
  `P.calibFor(s, input)` → `{ audio, visual, visM }` ms (`'touch'`: `calib[profile]`, `visM = vat > 0`; `'keys'`: `audio` from
  `calibKb` if its `at > 0` else `calib`; `visual` + `visM` from `calibKb` if its `vat > 0` else from `calib`);
  `P.offsets(s, input?)` (seconds, + `visM`; no input = today's result + `visM`); `P.setCalib(profile, o, input?)` (`'keys'` →
  `calibKb`, `at` stamped only when `o.audio != null`, `vat` only when `o.visual != null`; no input = today exactly); `P.LAYOUTS`;
  `P.layoutFor(w, h, desk, pref)` (phone → false; wide → `w ≥ 1000 && h ≥ 560`; auto → that `&& desk && w ≥ 1.2 h`);
  `P.pxBudget(w, h, wide)` (`wide ? sqrt(2.4e6 / (w × h)) : Infinity`).
### 4.2 `GG.input` (50b, stage 0; DOM, never loaded by node)
- `real(ev)`: true only for `ev.isTrusted`, non-empty `ev.code`, not `isComposing`, `keyCode !== 229`, `key` not `Unidentified` /
  `Process` / `Dead`, and a target that is not input / textarea / select / contenteditable. Only a real non-modifier keydown
  counts toward `mode`, `kbSeen`, `learned` and the router's `gg-kbnav` (Gboard sends 229 / `Unidentified`; iOS and Playwright
  `pressSequentially` type into an input: none of them count).
- `mode` `'keys'|'touch'`: a real non-modifier keydown → keys; pointerdown with `pointerType` touch|pen → touch; the mouse never
  changes it (`locator.click()` sends `'mouse'` in phone contexts too). Start: `desk ? 'keys' : 'touch'`.
- `desk` = `matchMedia('(hover: hover) and (pointer: fine)')` (+ change); `kbSeen` (session); `learned` (session map code → printed
  key from real keydowns with no Ctrl/Alt/Meta); `wide()`; `showKeyUI()` = `desk || kbSeen || wide()`; `layoutPref()`. Classes
  `gg-desk`, `gg-keys`, `gg-wide` (`P.layoutFor(innerWidth, innerHeight, desk, layout)`, re-evaluated on resize (debounced 200 ms),
  media change, `settings:changed {layout}`). Events `'input:mode'`, `'ui:wide'`.
- `capture(fn)` → `release()`: one exclusive slot; a window capture-phase keydown/keyup listener (registered first) stops every key
  (`preventDefault` + `stopImmediatePropagation`) and hands `fn` only trusted, non-repeat, non-IME (`isComposing`/229) keydowns of
  a key that went down **after** capture started (50b keeps a session down-set; a key already down is ignored until released).
  Keyups, repeats and IME events are swallowed, never passed. Used by rebinding and key calibration.
- `gigLive(on?)`: 55 sets true at count-in / resume, false at pause, song end, teardown. While live the menu router only blocks
  Tab and the wide switch waits for `gigLive(false)` (a paused song may switch: 55 re-lays out on `'ui:wide'`, §4.3).
  `debug('input') = { mode, desk, wide, layout, kbSeen, kbnav, live, captured, learned: n, lastReal }`.
### 4.3 Gig keys (55; Lane I)
- Frozen at count-in (like drawOff): `G.kind`, `G.keymap = P.keysFor(..)`, `G.input = GG.input.mode`, `G.offT = P.offsets(s,
  'touch')`, `G.offK = P.offsets(s, 'keys')`, `G.off = G.input === 'keys' ? G.offK : G.offT`, **`G.visM = G.off.visM`** (replaces
  55:318), drawOff from `G.off` (sync: `syncVisual(G.off, G.visM)`), `G.caps = G.input === 'keys'`.
- **Resolve** `P.keyLane`: (1) `code` bound to a lane on this rig → `{ lane }` (ShiftRight → the ShiftLeft lane while unbound);
  (2) bound in this kind but off this rig (Space on a 4-lane rig) → `{ lane: -1 }` (swallowed, no tap); (3) `code === ''` →
  `CLASSIC_KEYS[key.toLowerCase()]` → `{ col }`, else `P.codeOf(key)` → (1); (4) `code` unbound and `key` ∈ j k l g h →
  `{ col }`; (5) `null`. `{ col }` ≥ lanes → null; 55 maps it through `col()` (lefty, as v1.4).
- **keydown** (window, capture): (a) **paused** (pause card): Esc → `resume(false)`; Enter → `resume(false)` only when focus is on
  body or `btn-gig-resume` (a key 55 handles stops there; the router never sees it); every other key is native, router included
  (arrows/Tab reach `btn-gig-restart`, Enter/Space press the focused button);
  (b) G not in count|play|hold → native (cards: below); (c) skip `isComposing`/229 and input/textarea/contenteditable targets;
  Esc → `pause(false)`; Tab → preventDefault; Ctrl/Meta/Alt → no tap (preventDefault Ctrl/Cmd+S/D/F/P), Meta → `releaseAll()`;
  (d) resolve; `null` → native; else **preventDefault**; `id = ev.code || P.codeOf(ev.key)` (never the raw key: `'A'` down /
  `'a'` up is one id); `ev.repeat` → stop; id already in the down-set = **a lost keyup**: lift that id's hold at this stamp, then
  go on; add to the down-set (trusted events only: synthetic ones never wait for a keyup); `wake()`; `r = tap(lane,
  ev.timeStamp, 'key')`; strings: `G.keyDown[id] = { lane, hold: press(lane, r) }`. Never skip `shiftKey`.
- **keyup** (window, capture; **never gated** on mode or pause): while G exists, always leave the down-set; string seats in play
  lift that id's lane with `tapTime(stamp, 'key')` unless another down id holds it; drums: no-op. preventDefault a resolvable
  keyup only when not paused (Space never reaches a button mid-song; on the pause card it presses the focused button).
- **Safety:** blur `document.activeElement` at count-in and resume. `releaseAll()` (lift key-held lanes now, clear the down-set and
  `G.keyDown`) in `pause()` (every cause), `beginCount`, `endSong`, `teardown`, window blur and Meta. **Window blur** while
  count|play|hold: `releaseAll()` + `pause(false)` if `G.input === 'keys'` or a key tapped this song (suspends the context; the
  song resumes mid-riff; the existing fallback to restart applies if suspend fails). **visibilitychange hidden**: `pause(true)` as
  today (the only restart). `contextmenu` is prevented on the whole gig layer (`.layer[data-screen=gig]`) while G exists (today
  only the canvas, 55:1206).
- **Timing (K4):** `tapTime(stamp, src)` as today, except Classic subtracts `G.offK.audio` for `'key'` taps and `G.offT.audio` for
  touches (Drum sync subtracts nothing, as 55:767: keys line up through drawOff, i.e. the key light check); 1000 ms stamp rule
  kept; `tap()` samples dispatch for `true` and `'key'`. Same windows, chord rule, two-thumb charts, drum-sync booking.
- **Cards + focus:** 55 alone owns focus on gig screens (`'gig'` incl. the between card and `'gig-results'` are defined with
  `focus: false`, so Lane N's `show()` never focuses there). With `G.input === 'keys'` or `gg-kbnav`: focus `btn-gig-next` /
  `btn-gig-done` 600 ms after the card shows; until then, and for any press whose keydown came before card + 600 ms, Enter/Space
  keydowns (repeats too) and keyups are preventDefault-ed.
- **`'ui:wide'`:** 55 listens in every mode and runs `layout()` + `guard()` (cheap: buildBg is cached), so a song paused across a
  resize resumes on the right highway; the switch itself never happens while `gigLive()`.
- **Keycaps:** buildBg draws each lane's `P.keyLabel` in its hit zone when `G.caps` (cached; built at count-in). Legends `gig-keys`
  on gig-set (dots + caps + `gig-keys-change` → `ui.show('settings', { tab: 'keys' })`) and `gig-pause-keys` ("Esc to resume") on
  the pause card, only when `GG.input.showKeyUI()`; `gig-hint` ("Esc pause", placed per §4.6) only in the PC layout with
  `G.caps`. Header lines 55:4/21/27/30 updated.
### 4.4 Default keys (proposed; §8 Q1/Q2 confirm)
| Kit (drums), by role | kick | snare | hats | crash | toms (lane 5) | ride (lane 6) |
|---|---|---|---|---|---|---|
| key | **Space** | **D** | **F** | **S** | **Shift** | **A** |
- 4-lane kit = Space D F S (thumb, middle, index, ring). Snare (38–43 % of notes) on the middle finger, hats (16–21 %) on the
  index; every top chord pair (kick+snare, snare+hats, kick+crash, snare+ride, kick+hats, kick+ride) on two fingers; toms + ride
  never chord (A and Shift share the pinky safely); toms < 1 %, runs ≤ 3 → Shift never trips Sticky Keys.

| Strings (bass / rhythm / lead), low → high | 4 lanes | 5 lanes (bass max) | 6 lanes (rhythm, lead) |
|---|---|---|---|
| keys | A S D F | A S D F + **Space** (top) | A S D F + **Shift** (5th) + **Space** (top) |
- Stored `[KeyA, KeyS, KeyD, KeyF, ShiftLeft, Space]` (slot 4 = 5th of 6, slot 5 = top). The top string carries ~20 % with runs of
  5+ (rhythm, 6 lanes, Hard: 60 runs, longest 8) → thumb, never Shift; the 5th of 6 is 0.5–7 %, runs ≤ 3. Chords are adjacent
  lanes; no hold overlaps another note (0 of 6,878) → 2-key rollover is enough.
- `P.KEY_DEFAULTS = { drums: ['Space','KeyD','KeyF','KeyS','ShiftLeft','KeyA'], strings: ['KeyA','KeyS','KeyD','KeyF','ShiftLeft',
  'Space'] }`. An option-2 answer changes only this constant, keys.test and the mockup footer line.
### 4.5 Menus on the keyboard (Lane N: `50_ui_core` + new `src/50k_ui_keys.js`)
- **Router** (one document capture keydown + keyup + one pointerdown; no rAF, no MutationObserver). Order: (0) `GG.input` capture
  never reaches it; (0b) **repeat / stale guard:** Enter/Space/Esc with `ev.repeat` → preventDefault + stop (arrows may repeat);
  an Enter/Space keydown within 200 ms after a programmatic focus move (`show` / `close` / `focusDefault` / render restore), and a
  keyup whose keydown the router did not see on the same element → preventDefault + stop; (1) `gigLive()` → only block Tab;
  (2) typing focused → Esc blurs, other keys native (A S D F Space type); (3) Esc → back; (4) arrows → nearest visible enabled
  control that way (rects) in the top layer + `.tut-card` (not inside `[data-keys=own]`, range, select),
  `scrollIntoView({ block: 'nearest' })`; (5) Tab / Shift+Tab cycle the top layer + `.tut-card`; nothing open → HUD → dock →
  `kb-spots`; (6) focus on body / hidden / inert: Enter focuses the default (no click), Space swallowed; (7) garage: digits by
  **`ev.code` Digit1–8 / Numpad1–8** (never `ev.key`; Shift/AltGr ignored) → `R.goToHotspot(SPOTS[i])` (no 3D → emit
  `'hotspot'`) with nothing open (package A: also beside non-sticky docked panels, §4.6). Ctrl/Meta/Alt and `isComposing` ignored.
- **Esc → back:** `def.back` (testid | fn) or `KEY_BACK` (genre/settings `btn-back`, board `btn-board-close`, world
  `btn-world-close`, tour-region `btn-region-back`, logo `btn-logo-back`, hof `hof-back`, calib `btn-back`, recap `recap-close`;
  intro/seat → `ui.close`) clicked if present, enabled, visible → confirm: `btn-confirm-no` → non-sticky sheet/modal:
  `ui.close(top)` → sticky (results, wrap, gig, gig-set, gig-results, road, label-demand, cert, loonies, loonie-card, rival-set,
  rival-verdict, tour-flight, moose-opera, tour-payoff, gong): nothing → empty stack in the garage: ☰ → title: nothing.
  `end-back` stays "previous card"; the tutorial card never closes.
- **Editors (seq 54, creator 51, look 5j) use a back fn:** (1) close an open popover / the `seq-tools` sheet; (2) if changed since
  open (`D.dirty`, set in the paint / apply / recipe / slider / chord / title paths; creator and look: any pick) →
  `ui.confirm({ text: 'Leave without saving?', yes: 'Leave', no: 'Keep editing', danger: true })` (Esc = No: the edit is kept);
  (3) else click `btn-seq-close` / `ui.close` / `lk-cancel`. The on-screen ✕ / ← buttons stay as today (phones unchanged).
- **`html.gg-kbnav`:** on with real Tab, arrows, Enter, Esc, digits; off on any pointerdown. Ring (50k CSS): `html.gg-kbnav
  :focus-visible:not(input):not(textarea) { outline: 3px solid var(--amber); outline-offset: 2px }` (grid cells −2px).
- **Focus manager (50_ui_core; no-op unless `gg-kbnav`):** `ui.define(id, { …, back, focus, hints })`; `focus: false` never
  focuses (gig screens: 55 owns them); `ui.focusDefault(id?)`: `[data-autofocus]` → `def.focus` → foot's enabled `.btn.primary`
  → first enabled button → `btn-close` (danger confirm → No); `show()` remembers the opener + focuses the default; `render()`
  restores the focused `data-testid` (+ index) with `preventScroll`; `close()` → opener if connected and not inert, else the new
  top's default, else the dock's primary. Every programmatic focus stamps the focus-move time for (0b). Text inputs are never
  auto-focused.
- **`kb-spots`** (52): `kb-hs-<action>` buttons with digits, SPOTS order + `spotOf()` labels; shown only with (`gg-kbnav` or
  `gg-wide`) in the garage with nothing open (package A: also beside non-sticky docked panels), else `display: none`; `hs-*`
  never reused. **`kb-hints`** (50k): one line of key hints ("Tab move · Enter pick · Esc close", or `def.hints`; garage panels
  in A add "1–8 walk"; songwriter "←→ step · ↑↓ drum · Space add/remove · Tab leave the grid" (axes per package)) at the end of
  the top layer's foot, **inserted only while `html.gg-wide.gg-keys`** (render() re-runs on `'ui:wide'` / `'input:mode'`; never
  in the phone DOM), plus an "Esc" cap after `btn-close` / `btn-back` (CSS `::after` under the same classes).
- **Seq grid** (54): `role=grid`, cells `role=gridcell` (never button: phoneqa), `aria-selected`, roving tabindex from
  `D.view.focus { l, s }`; ←/→ lane, ↑/↓ step (package A's sideways grid: ←/→ step, ↑/↓ lane), Home/End, PgUp/PgDn ±4;
  Space/Enter toggle via the tap path (`paint = { value }` refactor keeps the kick rule, partV2 upgrade, preview).
  `debug('keys') = { top, focus, opener, lastEsc, nav, swallowed: { repeat, stale } }`.
### 4.6 PC layout (Lane W: new `src/5w_ui_wide.js` CSS block (injected last) + 40/42/60; DOM hooks by each file's owner)
The package picked in §8 Q3 (pictures `plan/v15_desktop_mockup_B.png` / `_A.png`, 1440x900): **B recommended**, A alternative.
Stage 0 step 8 deletes the unpicked table. Each table row covers what its picture draws.
- **Common:** every rule prefixed `html.gg-wide` (or `html.gg-desk` for hover + thin themed scrollbars), checked against per-screen
  rules up to (0,3,0) (`.full.seq .full-body`, `.full.van .full-body`). 1280x720, 1440x900, 1920x1080 are wide; 800x900 = phone
  layout + `gg-desk` niceties. Centred column `padding-inline: max(16px, (100% − 1120px) / 2)` for full screens (not gig, title,
  van, world); modal max 420; title `.title-wrap` max 520 + `frameTitle` on `ui:wide` (N); HoF, board, label, recap, ending,
  creator, look, logo: centred column; van overlays left column ≤ 440, `.tw-map` width `min(100%, (100vh − 170px) × 100/72)`.
- **3D:** one full-window renderer. `R.setViewInsets` + `debug('render').insets` gain `left/right` (default 0; additive: pw_garage
  reads `bottom === -1`, pw_perf/perf.js `bottom > 0`); `fitCamera` fits `W − left − right` with a centred X view offset; 42 hFov
  ≤ 100°; pixel budget **only under `html.gg-wide`**: `ratio = min(ratio, P.pxBudget(W, H, true))` (`debug('render').pxBudget`,
  null when not wide; a tablet in the phone layout keeps today's ratio). Crossing the threshold re-runs `updateInsets` (W),
  `frameTitle` (N), 55's `layout()` + `guard()` (I, any mode).

**Package B "Centred wide column" (recommended):** like a bigger phone; same sheet behaviour as the phone (light scrim, a click
outside closes, `setViewInsets({ bottom })` keeps the room in view above the panel); 60's updateInsets unchanged.

| screen | B rule | hook (owner) |
|---|---|---|
| HUD + dock | HUD centred, max 1120; dock centred 480 | — |
| sheets (plan, Monday card, week results, wrap, ☰, shop, laptop, gig board) | bottom panel `min(100%, 1120px)` centred, grip hidden; inside two columns (`.w2` grid; plan: booked + blocks / activity cards; Esc cap by the ✕; `kb-hints` in the foot) | `.w2` + column classes in 52, 56, 5k (N); laptop tabs = left rail, cards 2 across (`.lt-tabs` 53:116, N) |
| songwriter (54) | centred 1120: tools column 360 left (header, tabs, meters, coach, section tools, feel, song order, tempo, `kb-hints`) + grid right (lanes across, time down, as the phone; `.seq-grid` max lanes × 120); Loop / Song / Save under the grid; Quick: recipes left, sliders right | classes (N) |
| settings (5h) | centred 1120: tab rail left (Play, Keys, Audio + timing, Look + feel, Saves), content middle; Keys tab: `set-keys-timing` as the right column; the key calib opened from it docks over that column (`.calib-docked`; settings stays visible, inert) | 5h (I) |
| gig play **G1** | highway centred, width `clamp(lanes×110px, 46vw, lanes×140px)`, height `clamp(300px, 48vh, 540px)`, translucent bg, gem `min(laneW − 20, 100)`; stage frame bottom = 0.45 × highway (stage on both sides); song header centred top (max 720); score card right of the highway with `gig-hint`; crowd / cards max 720 | `data-lanes`, gem, bg alpha, guard() (I) |
| gig-set / gig-results | bottom panel 1120 / 2 columns | classes (I) |

**Package A "Stage + sidebar" (alternative):** the 3D room / stage on the left, one column on the right.

| screen | A rule | hook (owner) |
|---|---|---|
| HUD | in the right column (top, panel width) | — |
| sheets (as B's list) | right panel (below the HUD, bottom 0, right 0, width `clamp(440px, 36vw, 600px)`, `.tall` too, grip hidden, slides from the right); a docked sheet's `.sheet-layer` + `.scrim` are transparent and `pointer-events: none` (the `.sheet` itself `auto`), so the room is undimmed and clickable; modals keep their scrim | 60 (W): `setViewInsets({ right: panel width, bottom: −1 })`; a docked tall sheet is not `covered` (idle 30; phones keep 10) (40, W) |
| room beside a panel | a hotspot click or digit with only non-sticky docked panels open → `ui.close(top)` then the hotspot (the panels swap); a sticky panel open → ignored; a floor click walks; member taps bubble; `kb-spots` stays visible | `ui.hotspot` + `member:tap` guards allow "only non-sticky docked panels open" (52, N) |
| laptop | panel `clamp(640px, 52vw, 900px)`; tabs = left rail; cards + trophy rows 2 across | `.lt-tabs` at 53:116 (N) |
| songwriter (54) | grid on the left, **sideways** (lanes = rows, time across: CSS `grid-auto-flow: column` on the same cell order); song order + coach under it; header, meters, tools, Loop / Song / Save in a right column 500 | arrow axes by package (N); CSS (W) |
| settings (5h) | right column 500 (tabs across, as the phone); Keys tab: left area `set-keys-map` (a drawn keyboard: bound keys in lane colours, Esc/Tab/Enter striped, the key being changed dashed; display only) + `set-keys-timing` card | 5h (I) |
| gig play **G2** | stage left: 42 `setFrame({ left: 0, right: column width })` + X view offset; full-height highway in a right column `clamp(lanes×80px, 38vw, lanes×100px)` with the song header (song, streak, score, pause) on top and keycaps + `gig-hint` ("Esc pause · Change keys in Settings › Keys") under it; note travel time = phone | 42 setFrame left/right (W); layout / guard() (I) |
| gig-set / gig-results | right panel / 2 columns | classes (I) |
### 4.7 Key UI: binding + calibration (5h; Lane I)
- **`#set-keys`** (tab `keys`, between Play and Audio; `showKeyUI()` only): seg `set-keys-kind-drums|strings` (starts on the seat's
  kind); 6 chips `set-key-<kind>-<slot>` (lane colour + name + keycap; lanes past the gear dimmed but bindable; string slots Low,
  2, 3, 4, 5th (6-lane), Top); `set-keys-msg` (aria-live); `set-keys-pos` ("Keys go by their position on the keyboard");
  `set-keys-reset`; `set-keys-sticky`; `set-keys-timing` card (per profile: click test and light check "18 ms late ✓" / "not
  tested yet" + `set-calibrate-keys` "Key timing"); package A only: `set-keys-map` (§4.6).
- **Bind:** click / Enter / Space on a chip → "Press a key…" → next tick `GG.input.capture` (only a fresh keydown binds: the chip's
  own Enter/Space keyup and repeats are swallowed, never bound or refused) → `P.bindKey` → saved + message ("Swapped: Hats is now
  S", "Tab is for menus — pick another key"); Esc, a click elsewhere or 8 s cancel. **Layout** seg `set-layout-auto|phone|wide`
  in Look + feel (same visibility).
- **Calibration:** `calib-input-touch|keys` (`showKeyUI()` only; starts on `GG.input.mode`). Keys run **both** steps like touch:
  the click test (→ `calibKb.audio` + `at`: Classic timing) and the light check (→ `calibKb.visual` + `vat`: what lines keys up
  in Drum sync), each through `GG.input.capture` (one tap per fresh keydown: a held key is one tap; Esc stops), `ev.timeStamp`,
  same `calibCompute`; "Light check only" writes only visual + `vat` → `P.setCalib(profile, o, 'keys')`. Copy: "With Drum sync
  on (the default), the light check is the one that lines up your keys."
### 4.8 Test ids (new; every existing id kept; never `hs-*`)
`set-keys`, `set-keys-kind-drums|strings`, `set-key-<drums|strings>-<0..5>`, `set-keys-msg`, `set-keys-pos`, `set-keys-reset`,
`set-keys-timing`, `set-calibrate-keys`, `set-keys-sticky`, `set-keys-map` (A), `set-layout-auto|phone|wide`,
`calib-input-touch|keys`, `gig-keys`, `gig-keys-change`, `gig-pause-keys`, `gig-hint`, `kb-spots`, `kb-hs-<action>`, `kb-hints`.
### 4.9 Debug, size + perf budgets
`debug('input')` §4.2; `debug('keys')` §4.5; `debug('gigui')` += `keys: { kind, map, input, caps, down: [ids], held, last: { code,
key, lane, col, at } }, keyTaps, keySwallowed, lostKeyups`; `debug('render')` += `insets.left/right`, `pxBudget`; `debug('calib')`
+= `input`. `dist/game.html` ≤ 6,000,000 B (today 5,248,626; v1.5 net ≤ +60 KB). Router + input: listeners only; keycaps: cached
canvas. Phone `pw_perf` unchanged; 1920x1080 at dpr 2 ≤ 2.4 MP drawn, gig frame p95 ≤ 1.2 × the 1440x900 p95; docked panel ≤ 30
fps idle (A).

## 5. Lanes (3 agents, medium effort; isolated copies; never publish)
Isolation: `cp -r repo /work/<lane>`, branch `v15-<lane>` from stage 0. **Single file ownership**; anything else is a hand-over
request. Before reporting, each lane runs the full existing pw matrix + `pw_freeze` + phoneqa at 390x844 and 440x956. Return
`wip-v15-<lane>` + a ≤ 40-line `plan/v15_lane_<i|n|w>_report.md` (APIs as built, tests, numbers, hand-overs).

### Lane I — INPUT (gig keys, calibration, settings)
- Owns: `src/55_ui_gig.js` (§4.3 + its §4.6 hooks: `data-lanes`, gem width, bg alpha, guard() wide frame, results classes,
  `ui:wide` → layout()/guard() in every mode, `gig-hint`), `src/5h_ui_settings.js` (§4.7, settings layout hooks + calib docking
  (B) or `set-keys-map` (A)); `tests/pw_keys.js` (new).
- `pw_keys` (desktop 1280x720 unless noted): `keys` (each default key per seat × 4/5/6 lanes hits its lane; Space on a 4-lane string
  rig swallowed; J K L G H; code-less `d` = v1.4; Shift held + D; string holds, Shift-held keyup releases; repeat; Ctrl+D);
  `fair` (`calibKb` ≠ `calib`, e.g. keys audio 60 / visual 40 vs touch 0 / 0: Drum sync on → a key song's drawOff uses the key
  visual, a touch song the touch one; sync off → judged time offset by `calibKb.audio` for keys, `calib.audio` for touches; equal
  grades at equal perceived offsets; chord cap 2); `stuck` (hold A → Esc → release → resume → A taps; hold A across the song end →
  A taps in the next song; two non-repeat keydowns, no keyup → two taps; Shift down, A down, Shift up, A up code-less → nothing
  stuck; right-click on the stage → no menu); `space` (mouse-focused `btn-gig-pause` + 40 Space: no pause; with `gg-kbnav` on,
  mashing Space past the song end never skips the between card or results; a fresh Enter after 600 ms does); `esc` (Esc pauses →
  arrow to Restart → Enter → the song restarts; Esc resumes); `blur` (window blur mid-song → `debug('gigui')` paused, restart
  false, held strings released; after resume songT continues from pauseT); `rebind` (bind, swap, Tab/Escape/Enter/F5 refused,
  reset, reload, used in the gig, keycap; a rebind started with Enter shows no "Enter is for menus"); `calib-keys` (both steps
  write `calibKb`, touch untouched, fallback; light-check-only keeps the touch audio; a key held 1 s = one tap); `phone` (390
  phone context: no Keyboard section, Layout row, calib seg, `gig-keys`, keycaps); `wide-gig` (highway bounds per package, 4 and
  6 lanes, 3 sizes; note travel time == phone; resize 1440 → 800 while paused → resume → highway bounds + `laneW` right).

### Lane N — NAV (menus: focus, Esc, Tab, arrows, garage, songwriter grid)
- Owns: `src/50_ui_core.js`, `src/50k_ui_keys.js` (new: router, `KEY_BACK`, `gg-kbnav`, ring + `kb-spots` + `kb-hints` CSS),
  `51_ui_menu` (title default, intro/seat, creator back fn, `frameTitle` on `ui:wide`), `52_ui_week` (`kb-spots`, planner, Monday
  card, results Skip → OK, `.w2` hooks (B) or the docked-panel hotspot guards (A)), `53_ui_laptop` (`.lt-tabs`),
  `54_ui_sequencer` (grid, `D.dirty`, back fn, arrow axes), small `def.back` / `focus` / `hints` / autofocus hooks in 56, 58, 59*,
  5g, 5i–5q (5j look back fn; `.tut-card` joins the Tab cycle); `tests/pw_nav.js` (new).
- `pw_nav` (desktop 1280x720 + 800x900; phone passes, no keys): `career` (creator name typing "asdf " only types → seat → digit 1
  opens the planner via `'hotspot'`, tutorial advances → arrows + Enter → Esc → a gig started with Enter; a keydown with key `&`
  and code Digit1 also opens the planner); `esc` (each sticky screen ignores it; confirm → No; sheets close; full screens use their
  back; garage → ☰; title nothing; tutorial stays); `repeat` (20 repeat Enter keydowns on week results → exactly one screen
  advances; the shop Buy fires once; a held Esc closes one layer); `focus` (kept after a planner re-render; opener restored; Tab
  trap; ring after keys only, gone after a click; inputs never auto-focused; gig screens never focused by `show()`); `seq`
  (arrows, Space via apply, kick rule; toggle a cell, Esc → confirm shown, Esc → still in the editor with the edit kept; creator +
  look the same); `phone` (390x844 and 844x390 phone contexts: `kb-spots` and `kb-hints` absent, no `gg-kbnav`;
  `pressSequentially('Tanner')` + `press('Enter')` in `creator-name` and `seq-title-input` → `html.className` unchanged,
  `debug('input').kbSeen === false`, mode `'touch'`, no `set-keys` / `gig-keys` / `calib-input-*` in the DOM; a CDP keydown with
  key `Unidentified`, keyCode 229, code `''` on body counts for nothing); package A only: `room` (planner open → digit 2 opens the
  laptop and the planner closes; a floor click walks; the room is not dimmed; Esc closes the panel).

### Lane W — WIDE (CSS, layout, 3D framing)
- Owns: `src/5w_ui_wide.js` (new CSS block + small layout JS), `src/40_render_core.js`, `src/42_render_stage.js`, `src/60_main.js`
  (updateInsets, `ui:wide`), `00_shell.html` CSS only if a shell rule can't be beaten; `tests/pw_wide.js`, `tools/desktopqa.js` (new).
- `pw_wide` (desktop 1280x720, 1440x900, 1920x1080, 800x900): `layout` (classes; no horizontal overflow on every §4.6 screen;
  panel / column bounds of the picked package; garage hotspots on screen beside or above an open planner; B: `insets.bottom` =
  panel height; A: `insets.right` = panel width, not covered, room undimmed); `gig` (highway bounds, stage visible (B both sides,
  A left), hFov ≤ 100°); `switch` (1440 → 800 → 1440 re-runs insets; mid-song resize deferred); `perf` (≤ 2.4 MP at 1920x1080
  dpr 2; p95 budget; 1024x1366 desktop context in the phone layout keeps ratio 2 on high); `pref` (Layout Phone / PC).
  `desktopqa`: overflow, clipped or < 32 px controls, hover.

### Lead — stage 0, mockups, merge, review
- Owns `VERSION`, `02_contracts`, `11_settings`, `50b_ui_input.js`, `tests/_pw.js`, `keys.test.js`, `wide_css.test.js`,
  `pw_freeze.js`, `tools/phone_freeze.js`, `tests/fixtures/phone_freeze_*`, `plan/`, mockups, owner popups, status, the merge.
- **Hand-overs:** I and N build on stage 0's `capture` / `gigLive` / `real` (the router never acts while capture or a live song is
  on); W needs the (I)/(N) hooks of §4.6, added by their owners. Anything else goes in the report's "Hand-overs" (function,
  behaviour, test); lead applies.

## 6. Merge order and release checklist
1. Stage 0 (freeze fixtures FIRST; popup Q1–Q3 answered; unpicked package deleted). 2. Lanes I, N, W in parallel (one message).
   3. Merge I, then N, then W; hand-overs. 4. Node suite ALL PASS (`keys`, `wide_css`, `save`, `sim_gig`, `sync`). 5. **Phone
   matrix unchanged:** `pw_freeze` equal (390, 440, 844 landscape) + every `tests/pw_*.js` section + `tools/phoneqa.js` at 390x844
   and 440x956 (`PW_VIEW=440x956`); no existing test edited (only the additive `_pw.js`); no horizontal scroll; button audit.
   6. **Desktop:** `pw_keys`, `pw_nav`, `pw_wide`, `desktopqa` at 1280x720, 1440x900, 1920x1080 (+ 800x900). 7. Size gate
   (`tools/perf.js`) ≤ 6,000,000; `pw_perf`; no-USA scan.
8. Owner check (one popup: ship / tweak): 1440x900 shots of the picked package (garage + planner panel, laptop Band, songwriter
   editor, gig-set legend, gig play 4 and 6 lanes with keycaps, pause card, results, Settings → Keyboard mid-rebind, key
   calibration), 1920x1080 gig, 1280x720 garage, 800x900 garage, and 440x956 proof shots (garage, gig, settings) identical to v1.4.
9. Review (≤ 3 lenses: phone-unchanged, input timing/fairness, keyboard UX); verify only blocker/major findings.
10. PR to `main`; status: Version, What's in v1.5, APIs, Addendum 8 ticked.

## 7. Risks
- **Phone drift** (an unprefixed rule, a wrapper breaking `:first-child`, a ring on inputs in pw shots, a phone's on-screen
  keyboard read as keys) → phone law, `real(ev)`, `pw_freeze` (activeElement, outline, box-shadow, 3D anchors, landscape),
  `wide_css.test`, phoneqa, `display: none` (never off-screen), `kb-hints` never in the phone DOM, no programmatic focus outside
  `gg-kbnav`. A real key press inside a phone test (`pw_shop:211`) sets `kbSeen`, so later screens there may show legends:
  allowed (keycaps freeze per song; I runs pw_shop + pw_gig).
- **Space / Enter click buttons** (type=button: Enter clicks on keydown and on every repeat, Space on keyup; Firefox even after a
  prevented keydown) → blur at count-in/resume, preventDefault keydown + keyup while playing, the router's repeat + stale guard,
  swallowed Space with no focus, the 600 ms card arm, `focus: false` on gig screens.
- **Stuck notes** (a lost keyup: released while paused, held across a song end, Windows' two-Shift quirk, a context menu, `A`/`a`
  case flips, macOS Cmd) → keyup never gated, `releaseAll` on pause / beginCount / endSong / teardown / blur / Meta, a repeat-less
  keydown on a down id counts as a lost keyup, ids from codes, whole-layer contextmenu block.
- **Lost progress** (alt-tab restarting a song; one Esc discarding a song edit) → blur = `pause(false)`; editors confirm.
- **Legacy key tests** (`pw_gig:793` code-less `d`; `pw_shop:211` real `g`/`h`) → the D2 classic layer, pinned in keys.test.
- **Unfair timing** → judge untouched, same stamp-based tapTime (never frame time), Classic offset per tap source, visual +
  `visM` per song input (Drum sync), the strengthened `fair` test.
- **3D beside a panel / very wide stage** → L/R insets, hFov cap, hotspot check. **1920 at dpr 2** → pixel budget (wide only).
  **Specificity** (12 injected blocks) → 5w injected last + the (0,1,1) prefix. **Focus lost on re-render** → testid + index restore.
- **Mid-song resize** → `gigLive` defers; paused resize re-lays out. **AZERTY / IME** → codes, digits by code, `getLayoutMap` +
  `learned` labels, `isComposing`. **Size** → +60 KB of ~750 KB.

## 8. Owner questions (one popup at stage 0 step 8; record answers in §0)
**Q1. Drum keys (you can change any key later in Settings): which drum on which key?**
1. *(recommended)* "Strong fingers": Space kick, D snare, F hats, S crash; a 5th drum (toms) on Shift; a 6th drum (ride) on A.
   Why: the busiest drums on the strongest fingers, every common two-drum hit on two fingers, Shift only on the rarely-hit toms.
2. "Left to right": Space kick, S snare, D hats, F crash; toms on A; ride on Shift. Reads like the screen on the 4-drum kit, but
   the snare (40 % of notes) sits on the ring finger and a ride on Shift can pop up Windows' Sticky Keys box.
**Q2. Bass, rhythm and lead keys (low string on the left; bass goes up to 5 strings, rhythm and lead up to 6):**
1. *(recommended)* A S D F for the first four; with 5 strings Space is the top string; with 6, Shift is the 5th and Space the top.
   Why: the top string is busy (about 1 note in 5), so it goes on the thumb; Shift only gets the quiet 5th string.
2. Always A S D F Space Shift in that order (simpler to remember; on 6 strings the busy top string lands on Shift).
**Q3. The PC look (pictures: `plan/v15_desktop_mockup_B.png` and `_A.png`):**
1. *(recommended)* B "Centred wide column": like a bigger phone, with menus in two or three columns and a wider highway centred
   under the stage at gigs; the safest and quickest to build.
2. A "Stage + sidebar": the room and the stage stay big on the left and every menu opens in a panel on the right (the room stays
   clickable), with a tall highway on the right at gigs; more work (the songwriter grid turns sideways).
