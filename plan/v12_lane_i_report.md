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
  Float32Array(1024) (`CABS`: metal punk rock country practice8 combo12), `irGain(ir, sr)`, `irFromB64(b64, sr)`,
  `pluckJob(o)` -> `{ out, done, step(m) }` (the same pluck, resumable: <= m samples of work per step; `o.out` = a scratch
  array to render into; stepped = one call, sample for sample).
- 30, drums (F6): `DRUMS2` (the 1.2 recipes by tier, unity level; vel shapes timbre), `LV2` (per-lane levels by numbers),
  `velGain` (uses `A.velGain` when Lane F defines it, else the §4.1 formula), `kitPan` (column x 0.5, toms sweep, lefty,
  `C.REALISM.width`), `vslot` (src -> low-pass lerp(0.55|0.45, 1, vel) x 16 kHz -> gain -> fixed pan -> port.drums),
  `velPlay` (per-hit drift: +-0.25 % rate, +-1 % level), `chokeEnv` (a choked buffer squeezes its decay like the 1.1
  envelope; kit samples just cut at the next hit). `PRE2` = the widened PRE: layers (`LAYER_VEL` 1/2/3) x round robins per
  `C.REALISM`, kick/snare/toms skipped when a sampled kit applies, 6 MB cap (the kit's decoded clips counted), built in two
  phases (one reference hit per lane first) on one OfflineAudioContext per phase across slices (wavetables warmed one type
  per slice, then hits while a slice is under 1 ms, MessageChannel yields), never mid-song. Serves taps AND song drum events.
- 30, F17: `A.sampleKit(genre, tier)` (null on Classic), `SK` decode after the unlock / kit change (three slices per clip: bytes + decode /
  the peak / the onset + copy; never
  mid-song, onset trim 1 ms before the first sample over 2 % of the peak, block copy), trims applied in the slot gain,
  round robins in order, `KITUSE`. renderOffline decodes its own 44.1 kHz copy first (`result.kitUsed`, `result.kitOnset`).
- 30, strings (F7): `KS` cache (`KS_VOICE` per genre/kind, 22.05 kHz distorted + bass, 32 kHz clean/acoustic/twang/lead,
  2 vel layers, chug round robins, LRU 8 MB), `ksSpec`, `ksSpecFor(genre, ev, vel, rr)`, `metalKS`, `ampKS`, `noteKS`
  (same envelopes + amp chains as the oscillators; bloom / bends / sag on playbackRate; loops past the buffer; +-3 cent
  per-note drift). `A.warm(pattern, opts)` -> Promise<{ n, ms }> (1 ms slices of 512-sample pluckJob steps, two reused
  scratch arrays; resolves when the queue drains;
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
  `tools/kit_trim.js` (the per-lane trim vs the 1.1 pro synth; `--write`). Content: `src/content/kit_tmkd_vortex.js` (432,880 B;
  trims re-measured on the final rig: kick -4.67, snare -15.38, toms 4.37 / 6.87 / 4.33 dB).

## 2. Tests + results (final runs on this branch, 2026-10-03; machine shared with other agents, load 2-8)
- Node: `sim_dsp` 10/10 (KS tuning worst 0.58 cents over midi 28-88 at 22.05 / 32 kHz; T60 within 15 %; chord / strum = the
  sum of their strings; pluckJob stepped = one pluck, sample for sample; cab IRs; impulse v2 + plate; metal cluster > 6 kHz;
  RBJ biquads; irFromB64), `sim_kit` 5/5 (module shape 5 / 5 / 3x5, metal tiers 2-3, credit names The Metal Kick Drum and
  Rafa Prieto, LICENSE file, the credit inside the built dist/game.html, `git ls-files '*.wav'` empty), `sim_audio` 34/34
  (timeline fingerprints untouched). Full suite: SUITE_RESULT.
- `pw_seq` (390x844): `hash` 232/232 equal to the 1.1.0.0 fixture (run before every push), `kit` 8/8 (metal tier 3 plays the
  kit, decoded clips onset <= 1 ms, 5 consecutive snares differ, per-lane loudness within +-1 dB of the synth, metal tier 1 +
  punk tier 3 identical with and without the kit, Classic metal + punk taps = fixture), `audio` 42/42 (incl. "no two hits
  the same": 8 snares / hats / KS chugs pairwise > -40 dB), SEQ_REST.
- `pw_gig` `kit` GIG_RESULT (taps play samples, round robins in order, booked times unchanged, 0 tap drops).
- `pw_perf` `pre` 9/9 twice at 390x844 and twice at 440x956; `audio` 7/7 twice at 440x956 and once at 390x844.
- One `pw_seq audio` run failed on a 4 s van-ambience wait (57_ui_van, not audio code) at load 14; it passed alone.

## 3. Numbers
- Size: dist/game.html 5,072,056 B (gate 6,000,000); the kit module 432,880 B (323,625 B of MP3, 25 clips, 21.5 s).
- Kit trims (F17.1, `tools/kit_trim.js`: first-100 ms RMS at vel 0.85 vs the pro-tier synth through the same rig). The
  crush / cab / bus work after F17 had moved them (deltas kick 0.70, snare -1.45, toms -1.42 / 0.54 / 2.48 dB: pw_seq kit
  FAIL). Re-measured in 3 iterations (the parallel crush halves each step): trims kick -4.67, snare -15.38, toms 4.37 / 6.87
  / 4.33 dB -> deltas 0.06 / -0.04 / -0.22 / 0.05 / 0.44 dB. The MP3 payload is byte-identical (only the trim line moved).
- Levels (commits 5c94998 / a1869dc; 4-bar chorus, tier 2, 1.2 minus 1.1 classic): band RMS metal ~0.0, punk +0.1, rock
  -0.2, country -0.3 dB; 4k+ metal -10.7, punk -10.1, rock -7.0, country +2.7 dB (all under the +3 dB cap). Drums at vel
  0.85 within ~1 dB of 1.1 on most lanes / tiers (worst -1.9 dB). pw_seq heavy, vocals over the band: screams 3.7 dB and
  growls 4.45 dB (FAIL, needs >= 5) -> pass after CAB_TRIM.metal 0.66 + the crush make-up.
- Perf, 4x throttle. A slice = its main-thread CPU from a trace, less V8's own pauses (GC phases, interrupts): the throttle
  spins (calibrated: one loop 0.68 ms CPU at 1x, 2.83 ms at 4x), so this is the slice as a 4x-slower phone runs it, without
  the OS time given to other processes (a 3.1 ms-CPU slice measured 59 ms wall here). Max per window, 4 runs (390 x2, 440 x2):
  PRE sets metal|3 5.3-7.6 ms (build 331-484 ms; kit decode 281-453 ms), punk|3 5.0-5.4 (1,249-1,505 ms), country|2
  4.4-6.6 (734-850 ms), rock|0 3.4-4.8 (53-79 ms), metal|1 3.9-6.2 (253-351 ms); KS warm 3.1-7.6 ms, per song 63-278 ms
  wall (gate 1,200). Wall maxima logged next to them (up to 21 ms, all OS / GC). A slice's floor is one hit's graph
  build (~4-6 ms at 4x for the 6-oscillator metal cymbals).
  Before this session: KS warm slices 15.6-24.6 ms (a whole string per slice; then a closure loop that boxed a double per
  store = GC churn), per song 297-460 ms; kit decode slices 8.2-11.2 ms; the per-tap test ran on the wrong set (country).
  The pluck output is bit-identical to before (84 configs, stepped and whole).
- Caches: PRE metal|3 5.998 MB (with the kit's clips), punk|3 5.825, country|2 3.509, rock|0 0.924, metal|1 2.095 MB
  (gate 6 MB); KS after 4 songs 7.98 MB (LRU gate 8 MB).

## 4. What the lead wires / hand-overs / gaps
- **Wire (one line, Lane F's `schedule()`):** it still calls `drumHit(r, port, ev.lane, t, ev.gap * spb, ev.v)`; make it
  `drumHit(r, port, ev.lane, t, ev.gap * spb, ev.v, null, ev.vel)` so song drum events with a vel take the F6 / F17 path
  (velocity recipes, round robins, the sampled kit, PRE serving song events). Band notes read `ev.vel` inside playNote (KS +
  amps), so `player()` passing `ev.vel` is all they need.
- **Merge conflict to expect: `A.hit`.** The contract gives `A.hit` to Lane F (accept `o.vel`), but the velocity SOUND path
  lives in it too: `vel = o.vel` (Classic off) -> `velBuf` (the sampled kit, else the PRE2 set) -> `vslot` + `velPlay`,
  `KITUSE` / `KITLAST`, `PRE.hits`; no buffer -> the live `drumHit(.., vel)` at `velGain`. Keep this branch when merging.
- `A.warm(pattern, { genre, songId })` for Lane F's `startAudio` (resolves `{ n, ms }`; `{ n: 0 }` with no live context or
  on Classic). Lane V: `r.carve` and `A.impulse2(c, 'plate')` are in.
- After merge: re-run `tools/kit_trim.js` whenever the drum bus / crush / rooms change (pw_seq kit catches drift);
  `SPEC_EXTRA='{"vel":0.85}' node tools/audio_numbers.js --section "1.2"` for the F13 table.
- Hand-overs: only `A.hit` (above); nothing else outside the Lane I list.
- Gaps: F13 "ears" clips + the ship / tweak popup are the lead's; gig frame p95 vs 1.1.0.0 needs Lanes F + V merged (not
  measured here); if a phone needs more headroom, a pre-rendered `GG.dsp.metal` buffer would cut the cymbal's graph build
  (the floor of a PRE slice).
