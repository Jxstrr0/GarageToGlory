# v1.3 "Songwriter" stage 0 report (lead, branch `v1.3-songwriter`)
**Re-audit (§2).** Every reuse-map ref holds on `a608fe5` except: 22 `with` 503 -> **506**, chords 536–539 -> **536–540** (runs
compare 519), §4.6 22:538 -> **540**, 55 flags 623 -> **624**, §7 bassFloor 30:2569 -> **2564**. Fixed in the contract (§2 heading notes it).
**Fixtures FIRST** (`a608fe5`, committed before any src edit). `tools/make_fixtures_v12.js` (loader = tests/_load.js + 30 + 31 as
sim_audio/sim_feel do) writes `tests/fixtures/v12_songs.json` (568 KB) + `v12_<drums|bass|rhythm|lead>.json.gz`:
- corpus 708 entries: per genre signature, sig + solo/outro, starter, generate RNG 101..103, full-gear jam, 3 jammed careers per
  seat (songs.jam, v1 parts; the third with all gear), part edge cases per seat (every index, idx-mixed, same rows, empty, all-x,
  p99, junk rows / -3 / 1.7 / '2', verse-only, wrong key, 4-row bass, seat 'drums', junk sections); all 313 songs of save_v01 +
  v09_* + v10_*; the v12 careers' songs, drafts and pendingSongs. The 332 generated entries are stored raw (`corpus`).
- per entry (23–25 H16s, `keys` order): SAN (loose / 4 lanes / full gear), NOTES, IN (the seeded part.full variants per string seat),
  RATE (whole rate() incl. tips, both gears) + PR, as is and per string seat; CHART (4 difficulties + 4-lane / full-gear SAN, fixed
  extras rng); SEAT (seatChart x 4 difficulties @ 4 lanes + hard/expert @ 6); PART0 (timeline none / per seat with its part /
  seat drums + own part / own part) at bpm + 80/140/200 (old-save songs: a lighter set). SIM per genre x {as is, 3 seats}; SAVE0 per
  save (pattern + stored rating per song; draft / pendingSongs as loaded and as 1.2 stores them opened + saved untouched).
- v12 careers: newCareer({ seat }) + 14 avg bot weeks, outro + solo owned, 3 written songs on non-default indexes (one with solo +
  outro rows), bass: raw 4-row rows in a catalog song + pendingSongs[1]; draft with a part; GG.save.write, savedAt fixed.
- **Determinism:** generated twice in parallel: all 5 files byte-identical (v12_songs.json sha1 7dd26fed5a299f64); mutation probes
  (PART_WEIGHT, a timeline key, a part key) each tripped their fingerprint; compat_v12 ALL PASS 9 on untouched 1.2.0.0.
**Landed for real** (`src/21`, `content/genres.js`, `02`): sanitize cleaners (chords / fillBars / mood / swing / recipe, only when
present + valid, after part, loose too); part v2 (`LAYOUT`, `UP`, `ROLE`, `SCRATCH`, `rowsOf` = row count, `rowNames`, `upgrade`,
`view`, `rowPitch`; part.sanitize keeps v2 rows + `v: 2`, missing v2 sections = the v1 suggestion through UP); `partFeat2` (roles via
ROLE); the hook chord gate (bass/rhythm arrays only with p.chords verse|chorus) and the same gate in `similarity` (parts compared in
`part.view`); `swingBeat`, `chordsOf` (mirrors 30:2430 + 2936 exactly, sim_songs proves it), `NOTE`, `chordLabel`, `progChords`
(remap + break bars home), `progName`, `moodOf` (a copy) / `nativeMood`; `backing.moods` x 5 + `moodNative` (metal major / minor /
phrygian* / phrygian dominant / locrian; punk lydian / major* / mixolydian / dorian / minor; rock major hex / major blues / blues* /
minor hex / phrygian hex; country major pent s11 / major pent* / dominant pent / minor pent / aeolian pent); VERSION 1.3.0.0; V1.3
block + `C.SWING`, `C.SONG_SLIDERS`, `C.PART_V2`, `C.QUICK`, `C.SEQ_PART_ROW_MIN`.
**Stubs (final signatures, Lane S fills):** `recipes` ([signature, surprise:true]), `sliders` (generic stops unless grooves[g].sliders),
`surprise` (seeded), `compose` (signature @ bpm, chords = hash-pick index via progChords, v2 part = upgrade(part.full), no K).
**Tests:** compat_v12 10/10 (+ upgrade gate: rate + partRating + similarity, 708 x 3 seats); sim_songs 22 (+7 v1.3); node suite ALL
PASS; `META_ONLY=hash pw_seq` 232/232; pw_seq seq 34 + guided 23 + part 30 green; dist rebuilt (5,142,167 B).
**Lanes must know.** (1) compat_v12 takes ~45 s; its code is `tools/make_fixtures_v12.js` (lead-owned; never edit a fixture or the
tool to pass). (2) `part.full` / `part.suggest` v1 output is pinned by IN (D13). (3) S: Scratch rules (onset never odd, Scratch-only bar
x 0.6) are NOT in partFeat2 yet; v2 suggest / modRows are yours; moods: change `id` + `remap` only (country rung 0 = native scale,
make it differ by remap). (4) A: 30/31/22 untouched; a v2 part plays only its first v1-count rows until partBar2; `songs.chordsOf`
is ready for 30 to call. chordLabel gives country minors ('Em' on vi) while 1.2 strums major triads: decide in partBar2/o.third.
(5) `similarity(a, b, genre?)`: callers 21:979, 24:653/673/677/1375/1391, 27:211 pass no genre (fallback picks use metal tables
when one song has p.chords): lead wires `state.genre` at the merge. (6) Optional `audio_v12_off` not made (audio_hashes.js has no
--classic-off; 30/31 untouched, STAGE0 + PART0 + Classic cover it).
