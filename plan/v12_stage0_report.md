# v1.2 "Soundcheck": stage 0 report (lead, 2026-10-03, branch `v1.2-soundcheck`)

Contract `plan/plan_contract_1.2.md` §3 items 1–9, done in order: hashes, 1.1 numbers and 1.1 clips first (commits `6fd3557`,
`72081d7`, `b8292b8`, all before any `src/` edit), then VERSION, contracts, settings, stubs, F16 record, tests (`8109ced` on).

## 1. Re-audited §2 table (summary)
- 1.1.0.0 vs the draft table: everything matched except `metalNote` (1136 → 1137).
- The stage-0 edits shift `30_audio.js` by +5 lines from `A.isClassic` (179) and by +6 from the `_buildVox` hook (538) onward;
  55 / 20 / 23 are unchanged. §2 now lists the stage-0 lines, plus rows for the auto / double tap call sites in 55
  (`autoNotes` 501, auto-hat 530, `autoKicks` 534, `doubleKicks` 547), `AMP` / `powerWave` / `acousticWave`, every Lane V
  table, the Classic switch, the stubs (`30:3322`), the contracts block (`02:434`) and the new tools.

## 2. Classic hashes (`tests/fixtures/audio_v11_hashes.json`, 232 cases)
- Cases (`tools/_audio_lab.js` `hashCases()`): 4 genres × the signature song over the whole arrangement (full mix / drums only /
  band only (band + vocals)); 4 genres × 6 tap lanes × 4 kit tiers as live taps (`renderOffline({ lane, quality })`, the kit
  chain + room) and as pre-rendered hits (`prerenderHit`, what `PRE` plays); per genre a 2-bar chorus at tier 0 + arena and
  at tier 3 + dry, your seat notes (pluck ×2, strum, a held lead + release), one sung hit, sustained gtr / bass probes and
  the van radio chain. (The contract asked for 4 × 3 songs + 6 × 4 taps; the rest is cheap extra coverage of paths the lanes
  touch.)
- Hash = SHA-1 of the rendered AudioBuffer's Float32 samples as raw little-endian bytes, channel 0 then 1 (pre: mono),
  44.1 kHz, rendered on a fresh title screen (no career: kit tier 2, default mixer).
- **Determinism, found and fixed:** 1.1 audio never calls `Math.random` (noise + impulses come from a seeded LCG,
  arrangements from `GG.RNG`); the lab still seeds `Math.random` before the game loads (guard only). But renders were NOT
  bit-identical: a second render of the same spec differed in the last bits (|diff| ≤ 4e-6, up to 90 % of samples) on
  most cases. Isolated with bare graphs: every single node (oscillator, WaveShaper 4×, compressor, biquad, panner,
  convolver) and every 2-input sum is exact run to run; 3+ connections into one node input differ — Chromium sums them in
  hash-set (pointer address) order. Fix, lab only (`SUM_ORDER` in `tools/_audio_lab.js`, installed by `addInitScript`
  before the game script; OfflineAudioContext nodes only; game code untouched): each fan-in (node input or AudioParam)
  becomes a binary tree of unity-gain adders (≤ 2 inputs each) built in connection order like a binary counter. Unity
  gain is exact and up/down-mixing commutes with the sum, so the result is a valid 1.1 render with one fixed summing order.
- **Proof:** `--write` rendered all 232 cases three times (A1, A2 in one browser; B in a fresh browser): 232/232
  identical, no NaN (Chromium 141.0.7390.37). Cost: the adder trees make song renders ~1.7× slower; a verify pass is
  ~4–6 min depending on machine load (songs dominate: ~320 s of the ~350 s under load).
- Verify: `node build.js && node tools/audio_hashes.js` (ONLY=tap,pre,metal… narrows it) or
  `META_ONLY=hash timeout 500 node tests/pw_seq.js` (HASH_ONLY= narrows it). Both switch `GG.audio.classic(true)` on first.

## 3. 1.1 numbers (`plan/v12_audio_numbers.txt` section "1.1", `tools/audio_numbers.js`)
- Same song cases (signature songs, whole arrangement, tier 2), F13 bands (0–150, 150–500, 500–1.5k, 1.5–4k, 4k+ Hz) in dB
  (pw_seq `__bands` method with the F13 edges), RMS / peak dBFS, width (side / mid). Full mixes:
  metal RMS −16.8 / peak −4.7 / width 0.111; punk −18.3 / −4.6 / 0.157; rock −16.2 / −4.7 / 0.474; country −19.3 / −4.9 / 0.022.
  Mean over the 4 full mixes: RMS −17.65 dBFS, 4k+ −29.25 dB, peak −4.72 dBFS, width 0.191. F13 targets for 1.2: mean RMS
  within 1 dB, 4k+ not up > 3 dB, peaks under the ceiling. 1.2 numbers: `node tools/audio_numbers.js --section 1.2`.

## 4. 1.1 clips (`tools/audio_clips.js`; scratch, not committed)
- `/tmp/claude-0/-home-user-GarageToGlory/ab4a625b-6080-5e92-a86d-0cde530c49e2/scratchpad/v12_clips/`: `v11_metal.wav` (Ma Pelouse,
  Mon Tombeau; marcel, C♯ phrygian), `v11_punk.wav` (Council Meeting (Adjourned Forever); rox), `v11_rock.wav` (Leather Pants
  at Forty Below; chase), `v11_country.wav` (My Truck's Got Feelings; travis), `v11_taps.wav` (8-hit Perfect vs Good demo),
  `v11_clips.json` (what was rendered + levels). 16-bit PCM, 22,050 Hz stereo, 15 s (taps 5.7 s); ffmpeg is not
  installed, so no .m4a. Each clip = the band's first starter song exactly as `A.seatPreview` builds it outside a career,
  chorus → verse (→ chorus → verse, cut at 15 s, 0.3 s fade), kit tier 2, the kit's room.
- Tap demo (1.1): every hit at the same level (kick −5.5, snare −5.16 dBFS peaks; no velocity in 1.1).
- 1.2: `node tools/audio_clips.js --tag v12 --out <dir>` renders the same songs, sections, length and tier.

## 5. Code at stage 0
- `VERSION` 1.2.0.0 (dist rebuilt: 4,566,666 B). `02_contracts` V1.2 SOUNDCHECK block: shapes (§4) + `C.VEL_REF 0.85`,
  `C.FEEL_CLAMP`, `C.REALISM` (F11 as data; extra keys `id`, `layerLanes` (tier 3: kick / snare / toms), `cymBloom`,
  `subKick` so nothing in F11 is lost), F16 constants `C.FEEL_MOOD { below: 30, spread: 1.25 }`, `C.FEEL_STUDIO 0.25`,
  `C.FEEL_RIVAL 0.15`, `C.BAND_AMP_BY_TIER true`.
- `11_settings`: `settings.audioClassic` normalised to a boolean (default false, no UI). `30_audio`: `A.classic(bool)` (persisted)
  / `A.isClassic()` (cached; `applySettings` re-reads), `debug('audio').classic`, the stubs, `GG.dsp = {}`, `GG.voice = {}`,
  and in `makeRig`: `if (A._buildVox && !A.isClassic()) A._buildVox(r);` (Classic guard added to the contract's line).
- 31 / 32 / 33: header comments only (they build to empty modules; node `_load` skips them; sim_audio loads them after 30).
- F16 popup answers (all recommended) recorded in contract §0 (rows F16.1–4) and status.md Addendum 4.

## 6. Tests
- Node `tests/run.js`: SUITE ALL PASS (sim_audio 34: + "v1.2 classic: stubs change nothing" — the 1,212 fingerprints equal
  stage 0 with Classic off, on, and with `gig / feel / studio` opts — + "v1.2 stage-0 contracts + stubs").
- `pw_seq` section `hash` on 1.2.0.0 with Classic on: 232/232 equal to the 1.1 fixture, ALL PASS 4, 335 s alone (inside
  `timeout 500`; under heavy load from other agents it can get close: narrow with HASH_ONLY or use the tool in the background).
- Playwright at 390×844, all green: pw_seq seq 34 + guided 23, audio 42, heavy 22, genres 25, voices 8, part 30; pw_gig sync 14,
  bridge 17; pw_seat_audio voices 19, mute 4, preview 9, noodle 5. No console errors.

## 7. What the lanes must know
1. **Classic means the 1.1 graph, node for node.** The hash is taken with summing in connection order, so with Classic on a
   lane must not create-and-connect any extra node into an existing bus (even at gain 0 or 1), nor reorder `connect` calls
   on the classic path: either changes the last bits and fails `hash`. Branch on `A.isClassic()` before building anything.
2. `renderOffline` and `prerenderHit` must take the 1.1 path when Classic is on (taps, PRE recipes, rooms, amps, vox).
   Lane I owns their new options; please accept `spec.vel` + `spec.hit` on `{ lane }` renders (the tap demo passes them when
   `A.tapVel` exists) and decide how 1.2 renders get feel by default (null state → t = 0.5), or document the spec keys so
   the integrator can pass them with `SPEC_EXTRA='{…}'` to `tools/audio_numbers.js` / `audio_clips.js`.
3. The stubs live at the end of `30_audio.js`; 31 / 32 / 33 load after 30 and replace them by assignment. The sim_audio test
   "stage-0 contracts + stubs" asserts the stub returns: the lane that fills a stub updates that assert.
4. Quick hash check while working: `ONLY=tap,pre node tools/audio_hashes.js` (~30 s) or `ONLY=metal` (~2 min); the whole
   fixture before handing back. Never re-write the fixture (`--write` refuses unless VERSION is 1.1.0.0).
5. Numbers / clips tools use Chromium's native summing (levels don't care about the last bit) and run in ~1–2 min.
6. Runs over 10 minutes go to a log in the background; never kill browsers by name.
