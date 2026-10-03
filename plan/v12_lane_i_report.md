# v1.2 "Soundcheck": Lane I (instruments) report

Branch `wip-v12-i` (from `v1.2-soundcheck` d6c09b2). Contract `plan/plan_contract_1.2.md` §5 Lane I; handoff F6, F7, F8, F9,
F11, F17. Owner 2026-10-03: "scrap the kit guard local kit. one build with the drum samples only" -> the TMKD "Vortex"
samples ship in the one build (no local-only kit, no guard); raw WAVs stay in git-ignored `local/` for size only.

## 1. APIs as built
- **Rule:** every new path needs a vel and Classic off (F3.7): `drumHit(.., vel)`, `A.hit(lane, when, { vel })`, `ev.vel` on
  band notes, `renderOffline({ vel })`. No vel = the 1.1 code path. Rig-level changes (cab IRs, impulse v2, crush, duck
  buses, stereo kit-chain input) apply whenever Classic is off. Classic on = 1.1 node for node (hashes below).
- `GG.dsp` (`src/32_audio_dsp.js`, pure): `pluck({ f, sr, dur, vel, pick, bright (0 darkest .. 1), t60, mute, exLp, seed,
  thump, click, norm })`, `chord({ fs, spread })`, `strum({ fs, gap, up })` (= the exact sum of their strings), `metal({ ratios,
  base, sr, dur, hp, bp, sweep, noise, seed, dec })` + `METAL_RATIOS`, `biquad(type, f, q, db, sr)` -> `{ process, reset, mag,
  b, a }`, `impulse2(cls, sr, seed)` -> `[L, R]` (`ROOMS2`: dry room hall theatre arena plate), `cabIR(name, sr)` ->
  Float32Array(1024) (`CABS`: metal punk rock country practice8 combo12), `irGain(ir, sr)`, `irFromB64(b64, sr)`.
- 30, drums (F6): `DRUMS2` (the 1.2 recipes by tier, unity level; vel shapes timbre), `LV2` (per-lane levels by numbers),
  `velGain` (uses `A.velGain` when Lane F defines it, else the §4.1 formula), `kitPan` (column x 0.5, toms sweep, lefty,
  `C.REALISM.width`), `vslot` (src -> low-pass lerp(0.55|0.45, 1, vel) x 16 kHz -> gain -> fixed pan -> port.drums),
  `velPlay` (per-hit drift: +-0.25 % rate, +-1 % level), `chokeEnv` (a choked buffer squeezes its decay like the 1.1
  envelope; kit samples just cut at the next hit). `PRE2` = the widened PRE: layers (`LAYER_VEL` 1/2/3) x round robins per
  `C.REALISM`, kick/snare/toms skipped when a sampled kit applies, 6 MB cap (the kit's decoded clips counted), built in two
  phases (one reference hit per lane first) on one OfflineAudioContext per phase across slices (wavetables warmed one type
  per slice, then hits while a slice is under 2 ms, MessageChannel yields), never mid-song. Serves taps AND song drum events.
- 30, F17: `A.sampleKit(genre, tier)` (null on Classic), `SK` decode after the unlock / kit change (one clip per slice, never
  mid-song, onset trim 1 ms before the first sample over 2 % of the peak, block copy), trims applied in the slot gain,
  round robins in order, `KITUSE`. renderOffline decodes its own 44.1 kHz copy first (`result.kitUsed`, `result.kitOnset`).
- 30, strings (F7): `KS` cache (`KS_VOICE` per genre/kind, 22.05 kHz distorted + bass, 32 kHz clean/acoustic/twang/lead,
  2 vel layers, chug round robins, LRU 8 MB), `ksSpec`, `ksSpecFor(genre, ev, vel, rr)`, `metalKS`, `ampKS`, `noteKS`
  (same envelopes + amp chains as the oscillators; bloom / bends / sag on playbackRate; loops past the buffer; +-3 cent
  per-note drift). `A.warm(pattern, opts)` -> Promise<{ n, ms }> (one string per slice; resolves when the queue drains;
  no live context -> resolves { n: 0 }). Live miss = oscillator + queued; offline miss = rendered on the spot.
- 30, amps (F8): `cabName` (`C.REALISM[tier].cab` when `C.BAND_AMP_BY_TIER`), `cabBuffer` (`backing.amp.ir` base64 PCM16
  overrides the genre cab), `cabConv`, `cabUpdate` (setKit swaps IRs on a tier change), `CAB_TRIM`. Metal, punk/rock and the
  country twang amp: shaper -> high-pass -> IR -> carve band -> level -> pan. **`r.carve`** = the presence peaking nodes of
  every built amp (`_base` 0 dB with the IR; Lane V dips them while a voice sings).
- 30, rooms + mix (F9): `impulse2(c, cls)` / `A.impulse2(c, cls)` (Lane V: the plate), `IMP2_TRIM`, `r.duck` ([bass path,
  metal sub + grind]: -2 dB in 5 ms on every vel kick, back with a 50 ms time constant), `r.crush` (busDrums -> -32 dB 8:1
  3/120 ms -> `C.REALISM.crush` -> glue). `A.realism(tier)` = the stage-0 function (reads `C.REALISM`).
- renderOffline: + `vel`, `hit` (first round robin), `feel` (false = none), `studio`, `gig`, `hits` + `gap` (probe repeats);
  songs take the feel plan (`A.feelFor(null, genre, { studio, rival })` + `A.feelPlan(tl, .., seed, { gig })`) when Lane F's
  module returns one; result + `kitUsed`, `kitOnset`. prerenderHit: + `vel`, `rr`. A silent keep-alive on the offline kit
  chain makes stereo renders bit-deterministic.
- debug('audio') += `realism`, `pre { key, ready, first, building, sets, rr, layers, bytes, ms, renders, hits, slice }`,
  `ks { n, bytes, hits, misses, queued, evicted, warms, warmMs, slice }`, `kit { id, ready, n, bytes, ms, err, onset, slice,
  used, last, credit }`.
- Tools: `tools/make_kit.py` (DIRECT map, trims/fades, -0.3 dBFS, MP3 112 kbps mono, base64, `--trim <json>`),
  `tools/kit_trim.js` (the per-lane trim vs the 1.1 pro synth; `--write`). Content: `src/content/kit_tmkd_vortex.js` (432,877 B).

## 2. Tests + results
(see section 4 for the run log)

## 3. Numbers
(filled below)

## 4. What the lead wires / hand-overs / gaps
(filled below)
