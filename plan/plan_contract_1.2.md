# v1.2 "Soundcheck": plan contract (written 2026-10-03 against `main` 1.1.0.0; finished at stage 0, 2026-10-03)

Repo: `/home/user/GarageToGlory`, branch `v1.2-soundcheck` (= `main` 1.1.0.0 + this patch + stage 0). All paths repo-relative.
Line numbers (§2) are the stage-0 tree's (re-audited 2026-10-03). Stage-0 report: `plan/v12_stage0_report.md`.

Sources: `plan/handoff.md` **Part F** (F1–F16; owner decisions N1–N5), `plan/status.md` (Version, Addendum 4 decisions +
pending, APIs), the 1.1 contract (format). Read only your lane's section plus §0, §2 and §4 (token rules, status.md).

**Process rule (owner, every lane and the lead):** never `pkill`/`killall` Chromium, `headless_shell` or `node` by name. Track the
PIDs you launch and kill only those; close every browser you open in a `finally {}`. Chromium lives in `/opt/pw-browsers` (never
`playwright install`). Commit WIP to `wip-v12-<lane>` before any long wait. Runs over 10 minutes go through `run_in_background`
and write to a file.

---

## 0. Owner answers (LOCKED, do not re-pitch)
| # | Question | Answer (locked) |
|---|---|---|
| N1 | Roadmap | **v1.2 Soundcheck** now; Tuning → **v1.3**. |
| N2 | Band feel | **Driven by member skill** (tightness `t` from skill) + a per-genre feel (F4). |
| N3 | Your tap accents | **Accuracy + beat position** (+ round robins) (F5). |
| N4 | Cheap gear | **Still sounds cheap**; upgrades raise the top end (`A.realism(tier)`, F11). |
| N5 | Real recordings | **Later** (not in 1.2; hooks only, F15). |
| F16.1 | Low mood makes the band sloppier | **Yes**: mood < 30 → that player's timing spread × 1.25 (`C.FEEL_MOOD = { below: 30, spread: 1.25 }`). |
| F16.2 | Studio takes + rivals tighter | **Yes, both**: studio takes (van radio, recorded songs) `t + 0.25` (`C.FEEL_STUDIO`), rivals `t + 0.15` (`C.FEEL_RIVAL`). |
| F16.3 | Band amps follow the kit tier | **Yes**: milk crate = 1×8 practice amp IR, pawn shop = 1×12, pro / arena = the genre cab (`C.BAND_AMP_BY_TIER = true`; `C.REALISM[tier].cab`). |
| F16.4 | Show "Classic sound" in Settings? | **No: hidden, debug-only** (`settings.audioClassic` + `GG.audio.classic(bool)`; no Settings UI, `5h_ui_settings` untouched). |

F16 answered by the owner in one popup on 2026-10-03 (all four as recommended); each answer sits behind one constant in
`src/02_contracts.js` (V1.2 SOUNDCHECK), so a later "no" is a one-line change.

### Defaults (taken without a popup; they stand unless the owner objects — list them in the merge summary)
- Classic switch hidden (`settings.audioClassic`, debug `A.classic`), default off.
- `VEL_REF = 0.85` = today's level; missing `vel` = the 1.1 code path, byte for byte.
- Gig clamps: band kick/snare ± 6 ms, other kinds ± 15 ms; outside gigs ± 25 ms; always ≤ 25 % of a 16th.
- F16 items were asked at stage 0 in ONE popup (mood slop, studio/rival tightness, band amps by tier, Classic visibility):
  answered 2026-10-03, all as recommended (rows F16.1–F16.4 above).

## 1. Scope
### 1.1 Must (handoff F3–F13)
- F4 band feel (timing AR(1) + velocity + accents + section dynamics), per player from `career.lineup`, per genre from content.
- F5 tap velocity (drum + string seats).
- F6 drums: new recipes, round robins, velocity layers, kit stereo; `PRE` serves taps AND the song's drum events.
- F7 Karplus-Strong strings (guitars, bass, chords, strums, leads) with the oscillator path as fallback; `A.warm`.
- F8 cab IR convolvers per genre (+ tier rigs), `backing.amp.ir` hook.
- F9 impulse v2 (+ `plate`), kick→bass duck, drum parallel crush, vocal carve for every genre.
- F10 vocals: glottal waves, 5 formants + ring + F1 tracking, pulsed breath, living pitch, shimmer, dynamics, doubles, gang of 3,
  the vocal chain with plate + tempo delay.
- F11 tier table. F3 classic switch + hashes. F13 verification.
### 1.2 Nice-to-have (never blocks the merge)
- Band open-hat on the "and" of 4 (tier ≥ 2). Consonant polish (voiced murmur, s/z energy). Bass inharmonicity (dispersion
  all-pass) at tier 3.
### 1.3 Deferred
- Everything in F15 (real recordings, worklets, tempo drift, lyrics).

## 2. Reuse map (re-audited on the stage-0 tree, commit `8109ced`; lanes fork from here)
Stage 0 shifted `30_audio.js` by +5 lines from `A.isClassic` (179) on and +6 from the `_buildVox` hook (538) on; 55 / 20 / 23
are unchanged. In 1.1.0.0 only `metalNote` was off by one in the draft (1136 → 1137).
| thing | where | reuse how |
|---|---|---|
| look-ahead scheduler | `30:1841 player()`, `30:1853 pump()` | apply `dt` / `vel` per event index here |
| event → sound | `30:1831 schedule()` | pass `ev.vel` (copied event) |
| drum recipes | `30:862 DRUMS`, `30:906 drumHit`, `30:915 snareVariant` | add `vel`, RR params; recipes become the PRE renderers |
| tap pre-renders | `30:2189 PRE`, `preKey` 2190, `preHit` 2191, `preList` 2196, `preWant` 2201, `preBuild` 2208, `laneSlot` 2176 | widen to RR × layers, serve song events |
| kit tiers | `30:474 QUALITY`, `30:541 setKit` | `A.realism(tier)` reads `rig.tier` |
| rig + buses | `30:502 makeRig` (the `_buildVox` hook at 538) | kit panners, `crush`, `duck`, `buildVox(r)` hook |
| rooms | `30:447 ROOMS`, `30:454 impulse`, `30:555 setRoom` | impulse v2 + `plate` |
| metal amp | `30:576 AMP`, `30:577 metalRig`, `30:598 metalPort`, `30:609 powerWave`, `30:1143 metalNote` | IR cab; KS buffers into the same envelopes |
| genre amps | `30:623 ampRig`, `30:663 ampPort`, `30:672 acousticWave`, `30:679 ampNote` | same |
| other notes | `30:1184 playNote` | KS bass / lead / strum / gtr; vox untouched here |
| envelopes | `decay` 802, `sharedEnv` 814, `held` 821, `gate` 1174 | unchanged; buffers feed them |
| vocals | `VOWELS` 922, `GLIDES` 924, `NOISY` 927, `PLOSIVE` 929, `VOX` 932, `FAMILY` 953, `MVOX` 964, `wordPlan` 977, `articulate` 1002, `voxCurve` 1010, `rattle` 1020, `contour` 1029, `addVib` 1040, `metalVox` 1045, `voxPitch` 1082, `voxHit` 1087 | Lane V |
| your taps | `30:2135 A.hit`, `30:2035 seatVoice` / `30:1991 seatPlay` | `o.vel` |
| gig taps | `55:750 tap()`, `55:769 playTap`, `55:792 playSeat`, `55:395 startAudio` (`A.play` at 407); auto / double calls `55:501 autoNotes` (hit 510, auto-hat 530), `55:534 autoKicks` (543), `55:547 doubleKicks` (565) | `A.tapVel`, `po.gig`, `A.warm` |
| member skill | `20_sim_career.js` members `{ skill, mood }`, `career.lineup(state)` (`20:311`) | `A.feelFor` |
| rival members | `23_sim_rival.js:245 R.lineup` | rival feel |
| offline render | `30:3200 A.renderOffline`, `30:3310 A.prerenderHit` | tests + hashes |
| Classic switch | `30:179 A.isClassic` / `A.classic`, `11:46 settings.audioClassic`, `debug('audio').classic` | every Soundcheck path checks it |
| stage-0 stubs | `30:3322` (`feelFor`, `feelPlan`, `tapVel`, `warm`, `realism`, `GG.dsp`, `GG.voice`) | replaced by assignment in 31 / 32 / 33 (they load after 30) |
| contracts | `02:434` V1.2 SOUNDCHECK (`C.VEL_REF` 461 … `C.REALISM` 472) | read-only for lanes |
| band-energy helper | `tests/pw_seq.js` `__bands`; F13 edges in `tools/_audio_lab.js` `bands()` | the F13 tables (`tools/audio_numbers.js`) |
| classic hashes / clips | `tools/audio_hashes.js` (+ `pw_seq` `hash`), `tools/audio_clips.js`, `tools/_audio_lab.js` | see `plan/v12_stage0_report.md` |

## 3. Stage 0 (lead, one commit on `v1.2-soundcheck` before the lanes fork)
1. **Re-audit** the §2 lines; fix this table.
2. **Hashes FIRST:** `tools/audio_hashes.js` renders 4 genres × (full, drums only, band only) + 6 tap lanes × 4 tiers with
   `renderOffline` in headless Chromium → `tests/fixtures/audio_v11_hashes.json`. Before ANY audio edit.
3. **Numbers FIRST:** the 1.1 band-energy tables + RMS/peak/width per genre → `plan/v12_audio_numbers.txt` (section "1.1").
   Also the 1.1 `.m4a` clips (F13 Ears) → `tests/.cache/v11_clips/`.
4. **`VERSION` = `1.2.0.0`.**
5. **`src/02_contracts.js`:** V1.2 SOUNDCHECK block (§4 shapes), `C.VEL_REF = 0.85`, `C.FEEL_CLAMP = { gigDrum: 0.006, gig: 0.015,
   free: 0.025, sixteenth: 0.25 }`, `C.REALISM` (the F11 table as data).
6. **Settings:** `settings.audioClassic` (default false) in `11_settings.js` + `A.classic(bool)` / `A.isClassic()` in 30.
7. **Stubs** (all return the 1.1 behaviour): `A.feelFor` → null, `A.feelPlan` → null, `A.tapVel` → undefined, `A.warm` → resolved
   Promise, `A.realism(tier)` → `C.REALISM[tier]`, `GG.dsp = {}`, `GG.voice = {}`; empty `src/31_audio_feel.js`,
   `src/32_audio_dsp.js`, `src/33_audio_voice.js` (header comments only); in `makeRig` one line `if (A._buildVox) A._buildVox(r);`.
8. **F16 popup** (one popup, 4 questions, recommended first) → record in §0 and status.
9. **Tests:** `tests/sim_audio.test.js` + "classic: stubs change nothing" (timeline fingerprints identical); `tests/pw_seq.js`
   section `hash` (classic on → hashes equal the fixture). Every existing test green.

## 4. Shared contract (every lane codes against this)
### 4.1 Events and options
- Scheduled events may carry `ev.vel ∈ [0, 1]` (a copy made in `player()`; `tl.events` is never mutated). Absent → 1.1 path.
- `A.hit(lane, when, o)`, `A.pluck / A.strum / A.lead(midi, when, o)`: `o.vel` (absent → 1.1 path).
- `A.play(pattern, opts)`: + `opts.gig` (true = gig clamps), `opts.feel` (false = no feel, e.g. the metronome-only practice),
  `opts.studio` (true = the radio / recorded songs: `t + 0.25`). Classic on → all ignored.
- Gain from vel: `velGain(v) = min(1.333, (v / C.VEL_REF) ^ 1.5)` (+2.5 dB cap). One helper in 31, used by all lanes.

### 4.2 Feel (Lane F) — `src/31_audio_feel.js`
- `A.feelFor(state|null, genre, { rival, studio, seat })` → `FEEL = { genre, byKind: { <kind|drum lane>: { who, t, spread (s),
  push (s), velSd } }, slop }`. null state → every player t = 0.5 (songwriter outside a career, tests).
- `A.feelPlan(tl, FEEL, seed, { gig })` → `{ dt: Float32Array(n), vel: Float32Array(n), stats: { maxAbsDt, meanVel } }`, n =
  `tl.events.length`; step events 0 / 1. Pure, deterministic, clamps per §0 defaults.
- `A.accent(step, kind, lane, variant, role)` → base vel (F4 map). `A.tapVel({ judgement, step, lane, prevHatT, t })` → vel (F5).
- Content: `genres.js` `backing.feel { slop, push: { kick, snare, hat, bass, gtr, vox } }` in ms (the F4 table).

### 4.3 DSP (Lane I) — `src/32_audio_dsp.js` (pure, node-testable; no Web Audio inside)
- `GG.dsp.pluck({ f, sr, dur, vel, pick, bright, t60, mute, seed })` → Float32Array.
- `GG.dsp.chord({ fs: [hz], spread, .. })`, `GG.dsp.strum({ fs, gap, up, .. })` → Float32Array (summed strings).
- `GG.dsp.metal({ ratios, base, sr, dur, hp, bp, sweep, seed })` → Float32Array (the 6-square cluster, filtered).
- `GG.dsp.biquad(type, f, q, db, sr)` → `{ process(Float32Array) }` (RBJ cookbook).
- `GG.dsp.impulse2(cls, sr, seed)` → `[Float32Array L, R]`; classes `dry room hall theatre arena plate`.
- `GG.dsp.cabIR(genre|'practice8'|'combo12', sr)` → Float32Array(1024), normalised.
- 30 wraps them into AudioBuffers (`toBuffer(ctx, arr, sr)`).

### 4.4 Voice (Lane V) — `src/33_audio_voice.js` (pure)
- `GG.voice.glottal(oq, harmonics)` → `{ real, imag }` (for `createPeriodicWave`); `GG.voice.WAVES = { breathy: 0.8, modal: 0.6,
  belt: 0.4 }`.
- `GG.voice.formants(vowel, vp)` → `[[f, q, gainDb] × 5]`; `GG.voice.track(F1, f0)` → F1'.
- `GG.voice.pitchCurve(f, dur, { scoop, bend, vib, jit, wander, seed })` → Float32Array (120 pts/s; supersedes `voxCurve` for
  non-metal hits); `GG.voice.shimmer(dur, depth, seed)` → Float32Array (gain curve).
- Content `voices` profiles gain optional `press` (0..1), `ring` (dB), `double` (bool, default true for lead singers).

### 4.5 Realism (stage 0 data; Lanes I + V read it)
`C.REALISM[tier] = { rr, layers, metal: 0|3|6, snareModes: 1|2, wires, rim, crush, width, cab: 'practice8'|'combo12'|'genre',
cymBloom }` — values exactly F11.

### 4.6 Debug
`debug('audio')` += `feel { byKind, lastPlan }` (F), `realism`, `pre { sets, rr, layers, bytes, ms }`, `ks { n, bytes, misses,
warmMs }` (I), `vox { doubles, gang3, chain, plate }` (V), `classic`.

### 4.7 Size + perf budgets
`dist/game.html` ≤ 5,000,000 B. PRE ≤ 6 MB per kit set, build ≤ 2.5 s (4× throttle), slices ≤ 8 ms; KS cache ≤ 8 MB, warm ≤ 300 ms
per song; gig frame p95 ≤ 1.1 × 1.1.0.0; voices ≤ 32, tap drops 0.

## 5. Lanes (3 agents, medium effort; isolated copies; never publish)
Isolation: `cp -r repo /work/<lane>`, branch `v12-<lane>` from the stage-0 commit, work + test there. `30_audio.js` is shared:
**each lane edits ONLY the functions/tables listed for it**; anything else is a hand-over request (bottom of this section).
Return: the branch (pushed as `wip-v12-<lane>`) + a ≤ 40-line report (APIs as built, tests + results, numbers, what the lead wires).

### Lane F — FEEL (smallest; low-medium effort)
- Owns: `src/31_audio_feel.js`; `content/genres.js` `backing.feel` keys only; in 30: `player()` / `pump()` (apply the plan),
  `schedule()` (pass `vel`), `A.hit` + `seatVoice` / `seatPlay` (accept `o.vel`, pass it to the sound), `velGain` usage at those
  call sites; in 55: `playTap`, `playSeat`, the auto-hat / auto-kick / double calls (vel), `startAudio` (`po.gig`, `A.warm` call).
- Tests: new `tests/sim_feel.test.js`; `sim_audio` + "feelPlan never moves steps / keeps lane order at 60–260 bpm"; `pw_gig`
  section `feel` (taps carry vel; Perfect downbeat > Good offbeat in rendered level; no console errors).

### Lane I — INSTRUMENTS (largest)
- Owns: `src/32_audio_dsp.js`; in 30: `DRUMS`, `drumHit`, `snareVariant`, `PRE` + `preKey/preHit/preList/preWant/preBuild`,
  `laneSlot`, `QUALITY` reads, `makeRig` (except the `_buildVox` line), `setKit`, `ROOMS`, `impulse`, `setRoom`, `AMP`,
  `metalRig`, `metalPort`, `powerWave`, `ampRig`, `ampPort`, `acousticWave`, `ampNote`, `metalNote`, `playNote` (non-vox
  branches), new `A.warm` + the KS cache, `A.realism`, `renderOffline` / `prerenderHit` options; `genres.js` `backing.amp.ir` key.
- Reads `ev.vel` / `o.vel` (absent → 1.1). Vel and RR land in the drum recipes and the KS excitation.
- Tests: new `tests/sim_dsp.test.js`; `pw_seq` `audio` retuned with logged numbers; `pw_perf` budgets; "no two hits the same".

### Lane V — VOCALS
- Owns: `src/33_audio_voice.js`; in 30: `VOWELS`, `GLIDES`, `NOISY`, `PLOSIVE`, `VOX`, `FAMILY`, `MVOX`, `wordPlan`,
  `articulate`, `voxCurve`, `rattle`, `contour`, `addVib`, `voxPitch`, `metalVox`, `voxHit`, new `buildVox(r)` (registered as
  `A._buildVox`: the vocal chain, the `plate` convolver via `GG.dsp.impulse2('plate')` — call it, don't edit 32 — and the
  tempo delay, whose time `player()` sets through `r.voxDelay` (Lane F adds that one line; listed in hand-overs)); the carve
  for non-metal genres (a gain on the amp presence bands Lane I exposes as `r.carve` — hand-over); content `voices` profile keys.
- Tests: new `tests/sim_voice.test.js`; `pw_seq` vocal numbers (vox RMS, 2–4 kHz band, width) logged before/after.

### Lead — stage 0, wiring, tuning, review
- Owns: `02_contracts`, `11_settings`, `5h_ui_settings` (only if F16 says "show Classic"), `build.js`, `60_main.js`, `tools/`,
  `tests/fixtures`, `plan/`, the merge of the three branches (disjoint functions → `git merge`), the tuning pass by numbers
  (F13), the clips, the owner popup, VERSION, status.

### Cross-lane hand-over requests (files stay single-owner)
- Lane V → Lane I: `r.carve` (array of presence-band gains on every genre amp, like metal's `r.metal.pres`); `plate` impulse
  class in `impulse2`.
- Lane V → Lane F: in `player()`, set `r.voxDelay.delayTime` from the song's bpm when the song starts (one line).
- Lane I → Lane F: `schedule()` passes `ev` unchanged except `vel` (already the contract).

## 6. Merge order and release checklist
1. Stage 0 commit (hashes + numbers first). 2. Lanes F, I, V in parallel (one message). 3. Merge F, then I, then V.
4. Full node suite; `pw_seq` (`hash`, `audio`), `pw_gig` (`gig`, `sync`, `bridge`, `feel`), `pw_seat_audio`, `pw_perf`, `pw_flow
   flow` at 390×844 and 440×956; classic hashes equal. 5. Numbers → `plan/v12_audio_numbers.txt` (1.1 vs 1.2).
6. Clips (4 genres + the tap demo) → owner; popup ship / tweak. 7. Review pass (≤ 3 lenses: clock safety, perf, regression).
8. PR to `main`; status: Version, What's in v1.2, APIs, Addendum 4 pending ticked; publish to the same artifact URL.

## 7. Risks
- **Clock drift into judging** → F3.3 clamps, steps never move, `pw_gig sync` must stay green.
- **Phone CPU** (convolvers + more buffers) → budgets in §4.7, perf governor fallback for the plate, build slices.
- **Memory on old iPhones** → 6 MB PRE + 8 MB KS caps, 22.05 kHz buffers, LRU.
- **Harshness on phone speakers** (metal cymbals, presence boosts) → the 4k+ band limit in F13.
- **Regression hidden by "it sounds different"** → the classic hashes; any non-classic number change is logged with a reason.
