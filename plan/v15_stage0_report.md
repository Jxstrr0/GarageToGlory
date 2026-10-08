# v1.5 "Desktop" stage 0 report (lead, 2026-10-07, branch `v1.5-desktop`)
Contract `plan/plan_contract_1.5.md` §3; owner Q1-Q3 answered (B picked). Commits: `8f61a44` freeze, `74212c9` audit + A deleted,
`c618d41` VERSION / 02 / 11, `caae134` 50b + `_pw`, then this report + status (the stage-0 head: see `git log`).
## Step 2 — phone freeze FIRST (committed `8f61a44` before any `src/` edit; `src/` = `421e496`)
- `tools/phone_freeze.js` walks **52 screens** at 390x844 and 440x956 (title, slots, genre, intro, seat, logo, creator, look,
  Monday card, garage, plan, ☰, confirm, laptop Band + Trophies, gear + merch shop, board, van-info, settings top / play / audio /
  look, calib, songwriter Quick + editor, Bigger text: settings / plan / editor / setlist, week results, wrap, setlist, count-in,
  play, pause card, between card, gig results, road (over the van drive), recap, ending first + final, HoF, 5-lane bass gig,
  world, tour region, package, homecoming, label offer, studio, rival set, tutorial card) + **3** at 844x390 (garage, gig, settings).
- Per screen: html classes, scroll size, focused testid, every rendered testid / layer / sheet / body / foot / HUD / dock /
  canvas / gig-* element and the wide-rule targets (rect 0.5 px + display, font, padding, grid columns, outline, shadow, opacity,
  visibility, transform, z-index, scroll); 3D insets; garage hotspots (1 px) + labelBox; gig lanes / highway / stage frame.
- Determinism: page Date pinned to 2026-10-07 (still ticks), `ui.rng` seeded (was clock-seeded: a song title wrapped), infinite
  animations held at 0, finite at their end; camera at rest (3 equal labelBox reads, re-read if it moved); a hotspot that a
  bandmate covers reads as its label ('L', a wildcard: labelBox still pins the camera). Equal on 2 runs after writing, each size.
- `tests/pw_freeze.js` (META_ONLY=390|440|844l; PW_VIEW picks its size): ~80 s / ~80 s / 11 s. Fixtures 117 KB / 117 KB / 6 KB.
- `tests/wide_css.test.js` (node suite): 5w selectors start `html.gg-wide|gg-desk`, 50k `html.gg-kbnav|gg-wide`, elsewhere the
  classes only as `html.<class>` leading a selector (full-line comments free). 5w / 50k must keep ALL CSS in one `var CSS = …;`
  of string literals (+ / array.join): the lint evaluates it. Checked with a bad and a good temp 5w (fail / pass).
## Steps 1, 3-7
- §2 re-audit: all refs hold except judge 22:815 (was 817), release 805 (801), drumSync default 11:44 (45), bridge 747 + 760-764,
  + weather infinite animations (00:246 / 1117 / 1124). Table fixed.
- VERSION 1.5.0.0; 02 V1.5 DESKTOP block (settings, prefs helpers, GG.input, events, testids, debug).
- 11: KEY_KINDS / KEY_DEFAULTS (Q1, Q2) / KEY_RESERVED + keyReserved / CLASSIC_KEYS / LAYOUTS, keyKind, keySlot, keysFor,
  keyLane, codeOf, bindKey, resetKeys, keyLabel, calibFor, layoutFor, pxBudget; normalize fills keymap / calibKb / layout
  (stored: changed kinds only); offsets(s, input) + visM; setCalib(.., 'keys'). DEFAULT_SETTINGS unchanged.
- 50b `GG.input` (§4.2) as specified + `ui.wide()`; listeners only; no CSS. `_pw.open({ desktop: true })`.
- `keys.test.js` 13 tests (every §3 step-7 item). **Re-pin (logged):** sim_gig's played fingerprint hashed `createdVersion`, so the
  VERSION bump moved it; now hashed without it (1.4 pins held on this code at 1.4.0.0; new pins hold at 1.4.0.0 and 1.5.0.0).
## Step 9 — verification (on the stage-0 tree)
- Node suite ALL PASS (incl. keys 13, wide_css 4). Build 5,265,575 B (+16.9 KB vs 1.4).
- `pw_freeze` ALL PASS at 390, 440, 844l. Also green: pw_gig `bridge` (code-less `d`), pw_shop `gear` (real g / h), pw_settings
  `settings` + `calib`.
- Desktop smoke: 1440x900 / 1280x720 / 1920x1080 `gg-desk gg-keys gg-wide`; 800x900 `gg-desk gg-keys`; layout pref + gigLive
  deferral + `ui:wide`; capture (fresh keydowns only, nothing leaks, keyups swallowed); learned labels. Phone 390x844 and 844x390:
  no class, mode `touch`, still none after "Tanner" + Enter in `creator-name` and a CDP 229 / Unidentified keydown.
## For the lanes
- `debug('gigui')` has no `laneW` / `hitY`: the freeze derives laneW from the highway canvas (Lane I may add them; not required).
- A lane that needs a fixture change asks the lead (reason logged in status.md); `PW_VIEW=<size> node tools/phone_freeze.js
  [--only=a,b]` prints the diff.
