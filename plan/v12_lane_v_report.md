# v1.2 "Soundcheck" Lane V (vocals): report (2026-10-03, branch `wip-v12-v`)

Contract `plan/plan_contract_1.2.md` §4.4 + §5 Lane V; handoff F10 (+ F9 plate, vocal carve). Forked from `v1.2-soundcheck`
`d6c09b2` (stage 0 + F17 plan). The owner's 2026-10-03 kit note ("one build with the drum samples only") is Lane I / lead
scope; vocals stay fully synthesized (no samples).

## 1. Rule kept: every new path needs vel AND Classic off
- `voxSoundcheck(r, ev)` = `ev.vel != null && r.vx && !A.isClassic()`. Without vel (old callers, probes, Lane F not merged
  yet) or with Classic on, `voxHit` / `metalVox` play the 1.1 hit node for node (the 1.1 `r.vox` / `r.bvox` stay untouched).
- `buildVox(r)` runs from the stage-0 makeRig hook (never with Classic on) and only adds nodes off to the side: its input
  `r.vx.in` is fed only by Soundcheck hits through per-port inputs, its output joins `busBand` (silent until a vel hit).
- Classic toggled at runtime: on = the 1.1 path at once; off after a Classic-on unlock = the 1.1 path until the next rig.

## 2. APIs as built
- `GG.voice` (`src/33_audio_voice.js`, pure; node-tested alone):
  `glottal(oq, harmonics=48)` -> `{ real, imag, oq }` (Rosenberg pulse, differentiated, DFT; peak harmonic 1; cached),
  `WAVES { breathy .8, modal .6, belt .4 }`, `HARMONICS 48`, `oq(press)` (0.8 - 0.4 press, 0.05 steps, <= 9 waves),
  `PRESS` (voc type defaults), `press(voc, vp, metal)`, `pressAt(press, vel)` (+0.8 x (vel - VEL_REF): harder = brighter),
  `VOWELS` (copy of 30's), `BW [80,90,120,130,140]`, `F45 [3400,4300]`, `STEP_DB -5`, `track(F1, f0)`,
  `formants(vowel|[F1,F2,F3], vp, f0?)` -> `[[f, q, dB] x 5]` (Q = F / BW, F1 tracked, kept ordered), `RING`, `ring(vp)` ->
  `[3000, 1.6, dB] | null`, `RATE 120`, `onset(dur)` (0.18..0.3 s), `pitchCurve(f, dur, { scoop, bend, vib, jit, wander=8,
  rateSpread=0.5, seed })` (vibrato rate per note +- rateSpread, drifting +-0.2 Hz, depth +-20 %, smooth onset; 1/f
  wander 0.5..4 Hz octaves, <= 8 cents; jitter), `SHIMMER_RATE 480`, `shimmer(dur, depth, seed)` (40..80 Hz moves),
  `HELD 0.45`, `envelope(peak, dur, attack)` -> points (held: +10 % at 60 %, settle 0.82), `velGain(v)` (A.velGain when
  Lane F's exists, else the §4.1 formula), `DOUBLE`, `GANG3`, `CHAIN`, `SENDS[genre] { plate, delay, air, trim }`, `DELAY`,
  `sends(g)`, `delayTime(g, spb)`, `profile(vp, genre)` (content `voices.sound`).
- `30_audio.js` (Lane V functions only): `articulate(..., f0)` (F1 tracking; absent = 1.1); `voxHit` dispatch line;
  `metalVox` (guarded: +1 booked source for the extra voice, belt wave, swell envelope, `metalExtra` tail); new
  `VXL` trims, `voxSoundcheck`, `voxRoom`, `voxWave`, `rectCurve`, `voxEnv`, `voxBank`, `voxGlide`, `voxIn`, `voxSlow`,
  `voxSetup`, `voxCarve`, `voxSing`, `metalExtra`, `buildVox` (= `A._buildVox`), `A.voxStats()`, `debug('vox')`.
- Rig keys: `r.vx { in, out, air, comp, fx, roomSend, plateSend, plate, delay, delaySend, stats, ... }`, `r.voxDelay`
  (the DelayNode), `r.voxTempo(spb)` (sets the genre's delay time when it changes). Port keys `vxL`, `vxB`, `vxM`
  (closePort silences them).
- Content: `GG.content.voices.sound` (genres.js): `'genre:<g>'`, profile ids, `'rival:<id>'` -> `{ press, ring, double,
  breath }`. Kept OUT of the 1.1 profiles on purpose: vocal events carry the profile object, so adding keys to it would
  move all 1,212 timeline fingerprints (tested: events carry no press/ring/double).

## 3. What a Soundcheck hit does (F10)
- Non-metal (`voxSing`): glottal wave by press (+ vel), 5 formants (F1 tracks f0; F1..F3 glide along the word / vowel
  pair; F4/F5 fixed), singer's ring (3 kHz peak) + twang, shimmer, `pitchCurve` (yodel types keep the 1.1 flip), swell
  envelope at `V.peak x velGain(vel) x trim`, pulsed breath (2.5 kHz noise x half-wave rectified glottal osc, on the hit's
  one noise source), brighter s/z/f/v; chorus (role `full` or section `chorus`) lead hits get a double (+8 cents, 18-28 ms
  late, own 3-formant bank, pan +-0.25) when `voxRoom` (song + band caps, and live: the global cap without evicting);
  gang hits grow to 3 (octave left x0.92 at 14 ms, unison right x1.08 at 27 ms) when there's room; non-metal lead hits
  carve `r.carve` -3 dB (guarded).
- Metal (`metalVox` + `metalExtra`): belt wave for the buzz + its double, swell envelope with vel, held screams get the
  panned double, gangs a third voice (own shaper + bank), plate send from the metal channel (it keeps its own tone +
  the -6 dB carve).
- Chain (`buildVox`): in (x0.25) -> HP 100 -> compressor (-18 dB, knee 6, 4:1, 5 / 120 ms) -> presence +3 dB @ 3.2 k ->
  air +2 dB @ 10 k (0 for punk) -> out (x2.2) -> busBand; fx sends: plate (`GG.dsp.impulse2('plate', sr, 1201)`, IR cached
  per sample rate; wet x1.4 into glue), slow phone (live rig, `R.prefs().auto` and `perfState().autoRatio <= 1`) = room
  send instead, no impulse2 = no plate; delay (rock dotted 1/8 at 0.15, country 110 ms at 0.2; fb 0.25, LP 3.5 k). No
  room send on the rig (van radio) = no sends.

## 4. Tests + results
- Node: `tests/sim_voice.test.js` ALL PASS 10 (glottal tilt belt > modal > breathy + closing spike, press / oq / pressAt,
  formants (Q = F / BW, steps, F4/F5 scale, F1 tracking, ordering over 8 vowels x 3 scales x 3 pitches), pitchCurve
  (deterministic, wander <= 8 cents and slow, scoop / bend, onset, depth +-20 %, per-note rates 5.2-6.2 Hz, jitter),
  shimmer, envelope, velGain, sends / delay / gang / double / chain tables, `voices.sound` keys + ids, 30 + 31 + 32 + 33
  loaded together: `_buildVox` registered, vocal events carry the 1.1 profile only). `node tests/run.js`: SUITE ALL PASS
  (sim_audio 34: the 1,212 fingerprints unchanged).
- `META_ONLY=vox timeout 500 node tests/pw_seq.js` (new section, ~2 min): ALL PASS 15. `META_ONLY=hash`: 232/232 equal to
  1.1.0.0 (321 s alone, on the final tuned build).
- Regression (pw_seq, 390x844): `voices` ALL PASS 8; `heavy` 21/22 + 1 timing check ("a full metal song renders faster
  than real time", xRT 0.93) failing under load 10-12 on 4 cores from other agents; passed once at 1.5x; the stage-0 base
  build (`d6c09b2` dist) fails the same check in the same conditions (0.98x). Direct A/B in one page (metal chorus, 8 bars,
  arena, alternating): xRT Classic 2.57 / 2.52, chain idle (no vel) 2.55 / 2.92 / 2.78, Soundcheck vocals 2.66 / 2.86 /
  2.67: no measurable cost. Lead: re-run `heavy` alone once the lanes are idle.
- Numbers (signature song chorus, 4 bars, songId vx1, the genre's lead singer; vocals alone through the rig; before = 1.1
  path, after = Soundcheck at vel 0.85 without plate, plate = + plate; V/A = voice / band in the full mix by the voxInvert
  split; dB):

| genre | RMS before -> after (plate) | 2-4 kHz | 4 kHz+ | width before -> after (plate) | peak | V/A |
|---|---|---|---|---|---|---|
| metal (Marcel) | -22.8 -> -23.3 (-23.3) | -27.3 -> -26.0 | -35.8 -> -33.9 | 0.022 -> 0.025 (0.035) | -5.2 -> -5.0 | -6.3 -> -6.6 |
| punk (Rox) | -21.7 -> -22.2 (-22.2) | -39.4 -> -36.7 | -49.9 -> -44.4 | 0.047 -> 0.070 (0.074) | -5.5 -> -5.3 | -4.6 -> -3.9 |
| rock (Chase) | -21.5 -> -21.1 (-20.9) | -35.6 -> -34.1 | -48.1 -> -45.1 | 0.221 -> 0.194 (0.188) | -5.6 -> -5.7 | -7.6 -> -7.1 |
| country (Travis) | -21.9 -> -21.1 (-21.2) | -32.2 -> -34.4 | -51.1 -> -51.4 | 0.003 -> 0.010 (0.014) | -6.3 -> -5.7 | -2.8 -> -1.7 |

  Plate column measured with a stand-in impulse on this branch; with Lane I's real `impulse2('plate')` (their
  32_audio_dsp.js copied in for one run, not committed) the same section passes and the plate widths read 0.037 / 0.073 /
  0.207 / 0.017 at plate wet 3.2. Classic on + vel = the 1.1 render (max |diff| 6e-6, Chromium's last-bit summing), no
  vel = the 1.1 render (7e-6). Vel moves the voice against the band (rock V/A): 0.6 -9.5, 0.85 -7.0, 1.0 -6.0 dB. Metal
  set (Marcel, 24 bars) peak -5.0 dBFS, Gord full song -4.6, no NaN. Live (play(), 3.5 s choruses): rock hits 2, doubles 1,
  gang3 1, delay 0.375 s (dotted 1/8 at 120 bpm); punk hits 5, gang3 4, delay untouched. Headless Chromium at DPR 1: the
  governor steps the auto ratio to 1.0, so live vocals use the room send (the slow-phone fallback, working as designed).
- Tuning by numbers (all in one place, `VXL` in 30 + `GV.SENDS[g].trim` + `STEP_DB`): formant steps -5 dB (F10 says ~6; at
  -6 country lost 5 dB of 2-4 kHz), compressor input x0.25 (at x1 the chain + the master glue flattened vel to 0.3 dB),
  out x2.2, trims rock -2.5 / country -5.5 dB (voice / band back near 1.1), plate wet 3.2.

## 5. What the lead wires
- **Lane F (player):** nothing is required: `voxSetup` sets the delay at each vocal hit and re-syncs it on the first hit
  of every playback. Optional at song start: `if (r.voxTempo) r.voxTempo(spb);` (prefer this over writing
  `r.voxDelay.delayTime` directly: the time is per genre: rock dotted 1/8, country a fixed 110 ms slapback). Vel on vox /
  bvox events is all Lane V needs from F (`ev.vel` in the copied events). `GG.voice.velGain` uses `A.velGain` when 31
  defines it.
- **Lane I:** (1) `GG.dsp.impulse2('plate', sr, seed)` already matches (`buildVox` calls it with seed 1201, caches per
  sample rate). (2) `r.carve` is still missing on `wip-v12-i`: please expose the non-metal genre amps' presence filters as
  `r.carve` = an array of peaking BiquadFilterNodes (dB) for the current genre, or `{ <genre>: [...] }`, or a function
  `(genre) -> [...]`; GainNodes work too (then -3 dB = x0.708). `voxCarve` reads the resting gain once (`node._carve0`)
  and dips -3 dB for 80 % of the hit. Metal keeps its own -6 in `metalVox` (do not add metal's `pres` to it). (3) If
  renderOffline gets feel by default, the vocal path in tests follows it (no extra spec key needed).
- **Lead:** fold `vox: A.voxStats ? A.voxStats() : null` into `debug('audio')` (contract §4.6; Lane V registered
  `debug('vox')` meanwhile; keys `{ chain, plate: 'plate'|'room'|'none', delay, genre, hits, doubles, gang3, carve,
  sends }`). Merge: Lane V touched in 30 only `articulate`, `voxHit` (one dispatch line), `metalVox` (5 guarded lines) and a
  new block between `voxHit` and the Band-notes comment; in genres.js only the new `voices.sound` table (after `rivals`);
  pw_seq a new `vox` section + header line + runner line. `dist/` not committed.

## 6. Hand-overs
- Lane I -> Lane V: `r.carve` (above). Lane F: optional `r.voxTempo(spb)` line.
- Lead: `debug('audio').vox`; ear check of the clips (plate level, the double's width, belt brightness) with `audio_clips`
  once F gives vel (the numbers say level, presence and balance hold; taste is the owner's).

## 7. Gaps
- Contract wording "voices profiles gain press / ring / double": done as a parallel table (`voices.sound`), because the
  profile object rides on every vocal event and new keys would move the 1,212 timeline fingerprints.
- Voiced murmur before b / d / g (F10 "polish if time allows"): not done; s / z / f / v got the 5-8 kHz lift.
- The carve is untested end to end until Lane I exposes `r.carve` (guarded: absent = no carve; counter `carve` in stats).
- Metal gangs grow to 3 with the third voice on its own shaper + bank (panned 0.4); the 1.1 octave voice stays in the
  main bank (centre), so the metal gang is centre + right rather than left / centre / right.
- Width: rock vocals read slightly narrower than 1.1 (0.221 -> 0.194; cause not isolated: the dry voice is denser after
  the compressor against the same room send); the real plate brings it to ~0.21. Worth an ear check.
- Classic toggled off after a Classic-on unlock keeps the 1.1 vocals until the next rig (page reload); debug-only switch.
