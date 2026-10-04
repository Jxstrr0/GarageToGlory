# v1.3 "Songwriter" Lane U report (UI, contract §5 Lane U, tasks U1-U6)

Branch `wip-v13-u` (from `v1.3-songwriter` stage 0 + `wip-v13-s` merged, fast-forward). Files: `src/54_ui_sequencer.js` (rewritten),
`src/00_shell.html` (seq CSS only), `src/5h_ui_settings.js` (practice hook), `src/5k_ui_shop.js` (refreshSeq), `src/5p_ui_tutorial.js`
(ctx + comment), `src/content/tutorial.js` (w1_write); tests `pw_seq`, `pw_seats`, `pw_shop`, `pw_flow`, `pw_tutorial`, `pw_settings`,
`pw_perf` (+ `quick`), `content_tutorial.test`, `tests/_pw.js` (`openTools`), `tools/phoneqa.js`. `dist/` NOT committed (rebuild at the merge).
Look: `plan/v13_songwriter_mockup.html?opt=A` matched (shots below); same navy (`.full` default background, the 0.x seq override is gone).

## APIs as built (54)
- `ui.show('seq', { mode, screen, pat, title, titleEn, song, index, total, fromSketch, editHint, onSave, onJam, onCancel })`. `D.screen =
  'quick' | 'edit'`; `D.mode` unchanged (write / sketch / view). write: a fresh block -> `screen: 'quick'`, `pat: null` (build composes the
  genre's first = signature recipe at its default sliders with the D14 seed `GG.hashSeed(state.seed + '|' + songSeed(D))`); a queued sketch
  -> `screen: 'edit'`. sketch (D10): a draft -> edit, else quick. view: edit only, read-only, ⋯ = metronome only. Listeners stay on the
  screen entry; `e.rerender()` keeps screen / tab / layer. `settings.songwriterMode` is never read (D18).
- Quick: cards `quick-recipe-<id>` (aria-pressed, data-locked; a locked tap = toast "🔒 Needs the <lockLabel>."), Surprise = `songs.surprise(..,
  hashSeed(seed + '|surprise|' + taps))` (taps per open block, so the same slot rolls the same songs), sliders `quick-energy|mood|feel|fills|tempo`
  (+ `-val`; stop labels from `songs.sliders`, tempo "N bpm · <tempoLabel>"; input = label, `change` or 150 ms idle = commit). Energy / Mood /
  Fills / a card / Surprise recompose (`songs.compose`, then `changed(D)`: rerate + `handle.update` + the sketch draft); Feel / Tempo set
  `p.swing` / `p.bpm` only (never ask, never rewrite notes). Q3: `D.edited` (a hand-edit flag; at quick entry with no flag: no `p.recipe` or
  `compose(settings) != sanitize(pat)`) -> `ui.confirm` "Start over from this recipe? Your hand edits go." (Start over / Keep my edits:
  the slider snaps back). `A.warm(pat, opts)` 400 ms (`C.QUICK.warmMs`) after the last compose. Foot `btn-guide-play` (loops the song),
  `btn-quick-tweak`, `btn-seq-save` | `btn-seq-use`. Cards + sliders scroll in `quick-main` (bottom pad 16).
- Editor: header ✕ / `seq-title` (sub "Write block n of m · <seat>" | "· from your sketch pad" | "Sketch pad · <seat>"; the English title
  moved to the title attribute + the Song tab) / ⋯ `btn-seq-tools`; underline tabs `seq-tab-*` (a section with `p.fillBars` wears a dot);
  strip `meter-groove|hook|difficulty` (`data-value`, `data-delta` ± for 1.2 s); bubble `seq-coach` (avatar `ui.avatar(who,'sm')`, the name
  outside `seq-tip`, D17; priority D.hint > rating tips > coachFor; tap -> modal `seq-tip-full`); string seats: `seq-layers`
  (`seq-layer-part|drums`, 48 px) + `seq-chords` ("Chords: <progName> ▾" / "Hook: <name> ▾" -> sheet `seq-pick` with `part-pick-<i>`) and,
  on verse / chorus / bridge of the part layer, chips `chord-chip-0..3` (`data-semi|home|locked`; name = `songs.chordLabel(genre, p.mood,
  A.keyFor(songSeed).tonic, semi)`; chords = `songs.chordsOf(pat, tab, genre, { seat })`) -> sheet `seq-chord` (`chord-opt-<semi>` = the rung's
  scale roots + the bar's chord; `chord-reset` "Back to <name>"); grid `seq-grid` (drum seat rows ≥ 30) / `part-grid` (`part.view`: 6 / 6 / 7
  columns, `data-v` = the stored version, rows ≥ 26); foot `btn-seq-loop` / `btn-seq-song` / save | use. Playhead = grid row + the bar's chip.
  Write rules exactly §4.7 (pick with chords present: `p.chords[tab] = progChords(i)` + `part.prog = i`; old song: `part.pick` only; lead:
  hook only; chip seeds `p.chords[tab]` from `chordsOf`; reset per p.recipe / p.mood). D16: `partV2(D)` on the first grid / tweak / copy /
  clear edit; view never writes.
- ⋯ modal `seq-tools` (title "More"): `btn-seq-jam` (write), `btn-seq-metro` (dataset.on + aria-pressed, stays open), `btn-seq-quick`, `btn-kit-shop`
  (sketch) + 5h's `kit-practice`; drum layer: `btn-seq-beat` (sheet `seq-beat` with `seq-beat-<id>`, pedal ones disabled), `btn-seq-fill` (Q2:
  starts `p.fillBars[tab]` as a copy of the bar, the grid then edits it; "Back to the main bar"), `seq-fill-remove`, `seq-copy-<from>`,
  `seq-clear`; part layer: `part-mod-<id>`, `part-copy-<from>`, `part-clear`; `seq-remove-<extra>`; `btn-seq-tools-cancel`.
- `ui.seqGear(entry)` (5k refreshSeq): sanitize with the new gear, re-compose an untouched Quick song, rerender. 5h: `kit-practice` joins the
  ⋯ modal on its `ui:layout` (sketch + songs). 5p: `ctx.seqScreen`. `debug('seq')` = §4.8 + `fill`.

## Tests + results (node build.js; `node tests/run.js` SUITE ALL PASS incl. compat_v12 10/10 + STAGE0)
- `pw_seq` seq 45 (incl. ⋯ Clear / Copy / Bar 4 fill / Beat sheet / metronome, the full-tip modal, save byte-equality, view read-only) +
  seq-compat 17 (each v12_<seat> draft opened + used untouched and a queued 1.2 song opened + saved untouched = its SAN fixture, no v1.3
  key), quick 26, part 27, layout 45 (390x844) / 53 (440x956: no scroll in any editor case, Quick fits; insets 47/34 and 59/34 + Bigger
  text: every slider reachable in quick-main, foot above the home bar, header clear of the notch, 6 tabs + the longest hook fit). Both sizes.
- Classic `META_ONLY=hash pw_seq` 232/232 equal (204 s). phoneqa ALL PASS at 390x844 and 440x956 (Quick song, part editor, ⋯ menu audited).
- Migrations green: `pw_seats` write 10 / gig 8 / shop 7; `pw_shop` gear 30 / seat 26; `pw_flow` flow 17 / layout 34; `pw_tutorial` tut_w1 33 x 4;
  `pw_settings` difficulty 17; `content_tutorial` 10; `pw_perf quick` 3.

## Numbers
- Slider release -> new loop audible (4x CPU throttle, playing): task 16-31 ms, + look-ahead 120 + tick 25 = 161-176 ms (gate 300). Compose
  in page 1.5-9.7 ms (k = 8). dist/game.html 5,202,228 B (Lane S 5,186,786: +15 KB net with the guided flow gone; gate 6,000,000).
- Layout, 0 insets (`.seq-main` scroll 0 everywhere): 390x844 drum seat cells 84 x 32.7, string part rows 26.2 (47-55 wide), Drums layer
  29.3; Quick `quick-main` 648 / 642 (scrolls 6 px). 440x956: drum 97 x 39.7, part rows 33.2, Drums layer 36.3; Quick 754 / 754 (fits).
- Shots (440x956, 30): `seq_quick_<seat>`, `seq_edit_<seat>_<layer>_<tab>`, `seq_menu_rhythm|drums`, `seq_chord_sheet`, `seq_picker`, `seq_song_rhythm`,
  full gear (6 lanes, 6 tabs), insets + Bigger text; in `tests/.cache/*_440.png` (pw_seq layout writes them).

## Hand-overs
- Lead: document in 02_contracts (V1.3 UI) `ui.seqGear`, the `seq` data keys `screen` / `editHint`, `debug('seq').fill`, `_pw.openTools`; 11:47
  comment: songwriterMode ignored since 1.3 (D18). `tests/sim_lessons` (unowned) stays green: w1_write's intro is drum-gated and string seats get
  an intro + Play twin, so seat-gated steps still drop for bass.
- Lane S: none required; compose timing in the browser above (debug `compose.ms`). Lane A: none (54 calls `A.warm` after compose).

## Gaps
- Chip long-press preview (nice-to-have) not built. A notched 390 phone scrolls the part grid a little (D9, accepted); Bigger text grows the
  editor's text, not its row heights. The Q3 dialog is the shared `confirm` modal (`btn-confirm-yes|no`).
