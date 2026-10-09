# v1.5.1 "PC polish" report (`v1.5.1-polish`, 2026-10-09)

The six PC-only rough spots from the v1.5 review (`plan/v15_integration_report.md` §6 / §7 #15). All changes are gated on
the computer (`GG.input.desk()`) or the PC layout (`GG.ui.wide()`, `html.gg-wide`). Phones are unchanged: `pw_freeze`
equal at 390 / 440 / 844l, and phone strings are byte-identical. VERSION 1.5.1.0.

## What changed
| # | gap | fix |
|---|---|---|
| 1 | Drum kit / Gear shop labels touch at 1280x720 with the planner open | 41 `unclash(dt)`, computer only. Ten times a second it takes each label's resting screen rect (+4 %, or +12 % for the label the player is heading to; 6 px across, 4 px down) and runs up to 8 relaxation passes that push overlapping pairs apart vertically. The pixel offsets become a world-y offset (`h.oy`) that eases in, so taps (`anchor('label')`) and `labelBox` follow it. On a phone `oy` stays 0. |
| 2 | no PC gig score card | 55 `gigHint()` now builds `.gig-score` (testids gig-score / -n / -combo / -acc) right of the highway in the PC layout. It shows points (100 per perfect, 50 per good, summed over the gig), `×combo` (amber from 10), the song's hit share so far and a bar. It reads `ses.stats()` at most 10 times a second, and a song's points are banked at `endSong`. "Esc pause" (gig-hint) now sits inside the card. The card hides below 1000 px (the same rule as the hint) and is removed when the layout leaves PC. |
| 3 | footer key legends as plain text | 50 `syncHints` renders each `key action` part as `.kbh` with `.kcap` caps (arrow pairs give two caps). The source text is kept in `data-text`. CSS is in 50k, under `html.gg-wide`. |
| 4 | calibration: no dots, empty space under the pad | 5h adds `.calib-dots` (8; `.on` = the click has come, `.tap` = a tap or key was caught), PC layout only. They update from `count()`, `padTap` and the key test. The docked panel is now as tall as its content (`bottom: auto; max-height: 100%`). |
| 5 | Settings rail doesn't follow | 5h `follow(s)` (PC layout only) adds a scroll listener on the body (timer-throttled). The current section is the last one whose top has passed min(160 px, a third of the view); at the bottom of the scroll it is the last section. It sets `.on` and `aria-current` on that rail button. |
| 6 | songwriter lane icons clipped at the top | 5w: in the PC layout, `.seq-grid.wide` (5 / 6 lanes) keeps the icon and the name on one row. The phone's stacked pair overflowed the 22 px header row. |

Size: dist 5,345,933 -> 5,354,046 B (+8.1 KB; gate 6,000,000 holds).

## Tests
- New `pw_wide` section `polish` at 1280x720, 1440x900, 1920x1080 and 800x900 checks:
  - no label overlaps in the garage and with the planner open, for drums and bass, plus kit / Gear shop clear;
  - keycap legends;
  - the rail follows the scroll (Keys, Audio, Saves at the bottom, Play at the top, a rail click);
  - 6-lane icons at least 3 px clear of the header's edges;
  - the score card right of the highway, updating and matching the session, with "Esc pause" inside;
  - at 800x900 none of these pieces appear.
- `pw_keys` `calib-keys` checks:
  - dots follow clicks and taps (5 on, 4 caught after the held key);
  - all 8 are filled by the end;
  - the docked panel is fitted under the pad.
- `pw_keys` `wide-gig` checks that the score card holds the hint, and that a resize to 800 removes it.
- `pw_keys` `phone` checks that `.gig-score`, `.calib-dots`, `.kbh` and `.set-rail` never appear in the phone DOM, including during the calibration's tap test.
- Results:
  - `node tests/run.js`: SUITE ALL PASS.
  - `pw_freeze` 390 / 440 / 844l: ALL PASS 5 each.
  - Desktop, at each of the 4 sizes: pw_wide layout / gig / switch / pref / polish, pw_keys keys / fair / stuck / space / esc / blur / rebind / calib-keys, and desktopqa (191-193 checks) ALL PASS; pw_keys wide-gig 46 ALL PASS.
- Load-only failures, all passed when rerun alone:
  - polish 1440 "score card updates": the card redraws on the highway frame, so the test now waits for it;
  - polish 800x900 label overlap: the nudge eases in over frames, so the test now waits up to 5 s;
  - calib-keys 1920 click offset: load-sensitive timing, as in v1.5.
- Phone, at 390x844 and 440x956: pw_settings, pw_garage, pw_gig (all sections), pw_seq (each section on its own: the whole file runs past `timeout 500`) and pw_keys phone ALL PASS.

## Owner shots (`scratchpad/v151_owner/`)
01-05 at 1280x720, 06-10 at 1440x900: garage + planner, gig with the score card, Settings > Keys (the rail on Keys),
key calibration mid-test (dots), songwriter with 6 lanes. 11: phone 440x956 garage (as in v1.5).

## Left
- Size is still about +100 KB over v1.4 (soft budget +60 KB).
- The score card's points are a display tally (100 per perfect, 50 per good). The song grade and pay are unchanged.
- During the key test the docked calibration's footer legend still reads "Esc close", but Esc stops the test there. This was already the case in v1.5.
- Other gaps from v1.5 §6 are unchanged: the string-seat camera, the one-column merch / trophies lists, and the rapid Enter on Rehearse.
