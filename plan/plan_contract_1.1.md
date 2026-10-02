# v1.1 "Seats": plan contract (DRAFT from the design session, 2026-10-01; the lead verifies it at stage 0)

Repo: `GarageToGlory`, branch `v1.1-seats` from `main` **after v1.0 Glory is merged**. Source of truth for the design:
`plan/handoff.md` Part E (owner answers S1–S7 locked). This draft was written against `main` 0.9.0.0; v1.0 will move line
numbers, so the lead runs fresh read-only audits (sims, content, ui, render_audio) before forking lanes and corrects §1/§3.

---

## 0. Owner answers (popups 2026-10-01 — LOCKED)
S1 seat swap · S2 taps + holds, bass ≤ 5 lanes, guitar ≤ 6 · S3 your part + auto drums · S4 v1.1 Seats, Tuning → v1.2 ·
S5 Gravel Kings rhythm: Chase drums + sings · S6 Rox/Travis sing from the kit · S7 3 role arcs + 12 band finales.
E14 open items, answered by owner popup 2026-10-02 (all recommended, LOCKED): **size budget 5.0 MB** (dist on disk, stripped);
**gear = parody names per genre, priced like the matching drum upgrades** (every seat costs the same); **3–4 body shapes per
string seat** in the creator (add, don't shrink); **seat picker: tap a seat card to hear a ~3 s preview** of that seat's part
from a starter song over the band (reuses the song player).

### Defaults taken without a popup (list them in the stage-0 popup so the owner can object)
- The seat is fixed for the whole career; old saves are drummers.
- Keep the save field `drumSkill` as the chops stat for every seat (UI already says "Your chops").
- The swapped drummer keeps driving if they're the driver (Kenji, Moth, T-Bone, Earl).
- Metal lead = Dana's R-channel guitar + solos; metal rhythm = Jaxon's L-channel guitar.
- The title screen stays Hail Damage's hailstorm garage with the drummer at the kit.

## 1. Already works: do not rebuild
- `GG.audio.timeline(pattern, opts)` is pure and already emits `bass/gtr/gtr2/clean/lead/twang/fiddle` events with `midi`,
  `len`, `gap` (30_audio ~L1515). Seat charts filter it; don't write a second note generator.
- The gig session (judgement, combo, crowd, two-thumb rule, difficulty thinning, double-kick merge, drum-sync model, studio
  mode, saves between songs) — extend with `len/hold/chord/run`, don't fork it.
- `gig.roles(state)` (22 ~L332), `career.fillText` tokens (20 ~L411), `career.cardOk/speakerOk/variant` (v0.9 §4.2/4.3),
  `byBand` layers, `content/grooves.js` presets + mods, shop gear lanes (2a ~L111/170), studio takes (59b ~L502).

## 2. Stage 0 (lead, one commit on `v1.1-seats` before lanes fork)
1. `VERSION` 1.1.0.0. `02_contracts.js`: `C.SEATS`, `C.SEAT_MAX_LANES = { drums: 6, bass: 5, rhythm: 6, lead: 6 }`,
   `C.SEAT_KINDS` (§3.3), state fields (§3.1), events (§3.5), token list (§3.4), PART shape (§3.2).
2. `10_save.js` migration: `seat` missing → `'drums'`; `members[].seatRole` = `role`; `gear.seatLanes` defaults.
3. `tools/seat_audit.js` → `plan/seat_audit.txt` (every content line with drum vocabulary, file:line, current text).
   Lane A works from this list.
4. Stubs so lanes can test in isolation: `career.seatSwap`, `career.lineup`, `gig.chart(..., { seat })` returning the drum
   chart, `GG.audio.pluck/strum/lead` no-ops, `GG.render.stage.setup({ seat })` ignoring seat.
5. Popup for the open items in §0.

## 3. Shared contract
### 3.1 State
```
state.seat: 'drums'|'bass'|'rhythm'|'lead'          (fixed at newCareer; args.seat)
state.members[i].seatRole: string                   ('drums' | 'drums/vocals' for the swapped member; else role)
state.gear.seatLanes: { bass: 4..5, rhythm: 4..6, lead: 4..6 }   state.gear.runs: { bass, rhythm, lead }: bool
state.flags.bassArc | rhythmArc | leadArc           (E7 outcomes)
state.player.gearLook: { shape, color, guard, sticker } (string seats; drums keep player.kit)
song.pattern.part?: PART                             (string seats only)
```
### 3.2 PART
`{ seat, sections: { <name>: { prog?: int, hook?: int, rows: [16-char 'x'/'.' x 3 (bass) | 2 (rhythm) | 5 (lead)] } } }`.
`GG.songs.sanitize` keeps it (rows clipped/padded, indexes clamped to the genre lists); missing sections → generated.

### 3.3 Seat kinds (timeline → chart)
| genre | bass | rhythm | lead |
|---|---|---|---|
| metal | bass | gtr (L, Jaxon) | gtr (R, Dana) + lead (solos) |
| punk | bass | gtr (Rox) | gtr (Benny) + the two-chord break |
| rock | bass | gtr2 / clean | gtr + lead |
| country | bass | acoustic strum | twang (Earl) |
Lane D confirms the actual event tags (L/R side, acoustic kind) and exports `A.seatKinds(genre, seat)`.

### 3.4 Tokens + gates (Lane B implements; Lane A writes against them)
`{instrument}` drums/bass/guitar · `{gear}` kit/bass rig/rig · `{sticks}` sticks/picks · `{drummer}` "you" or the swapped
member's name · `{yourPart}` the beat/the bass line/the riff/the lead · `{seat}` drums/bass/rhythm guitar/lead guitar.
Card/line gates: `seat: [seats]`, `swapped: memberId | true`. `career.cardOk` + `speakerOk` honour both.

### 3.5 APIs + events
```
GG.career.seatSwap(bandId, seat) -> memberId|null      GG.career.lineup(state) -> [{ id, seatRole }]
GG.career.newCareer({ ..., seat })                      GG.gig.roles(state) -> { front, solo ('player' ok), fill, drummer }
GG.gig.chart(song, { seat, lanes, runs, difficulty, doubles }) -> notes + { len, hold, chord, run, midi }
GG.gig.RUN_GAP (s)   GG.songs.part.suggest(genre, seat, section) -> PART section   GG.songs.rate(song) reads part
GG.audio.timeline(pattern, { ..., part, mute: [kinds] })  GG.audio.seatKinds(genre, seat)
GG.audio.pluck|strum|lead(midi, when, opts{ len, hold }) -> handle ; GG.audio.release(handle, when)
GG.render.stage.setup({ ..., seat, lineup })  ; stage.info().seat/view
GG.render.garage: swapped drummer at the kit hotspot; hotspot 'kit' label = "your rig" for string seats
events: 'gig:hold' { lane, held (0..1), ring:bool }   'seat:picked' { seat, swapped }
```

## 4. Lanes (≤ 4 agents, medium effort, isolated copies, copy back only owned files, never publish)
### Lane A — Content (owns `src/content/*`, except `genres.js` backing tables → Lane D)
- `bands.js` `seats` table (E3) + per-member `bySeat` drum idles/garage lines; recruit drummer flavour.
- Three role arcs (E7) as chains with hints + `byBand` lines; 12 finale cards; flags; week-one swapped-drummer cards (12);
  4–6 `swapped` Monday cards per swappable member; player epilogue per seat + swapped-drummer epilogue variants.
- Work through `plan/seat_audit.txt`: tokenise / gate / leave (record the decision count per file in the report).
- Shop content: bass + guitar gear lines (lanes, run gear, amp tiers) per genre names (popup answer).
- Coach lines per seat in `grooves.js`; `backing.hooks` stays with Lane D.
### Lane B — Sims + gameplay UI (owns 20, 21, 22, 2a, 24, `tools/balance.js`, 54, 55, 59b, 5k, tests sim_*)
- Seat state, swap, lineup, tokens, gates, quits/returns into the drum seat, arc flags plumbing.
- PART model, sanitize, rating seat signatures, recycled-part check, `part.suggest`.
- Seat charts: lane contour mapping, holds, 2-lane chords (Hard+), runs, thinning, studio mode; `gig.simulate` unchanged
  weights (chops = drumSkill).
- UI: songwriter "Your part" page + "Tell {drummer} what to play"; highway holds/chords/runs drawing + lane colours per
  seat; studio "{instrument} takes"; shop seat tab.
- Balance: `SEAT=` env in balance.js; report per band × seat at 10 and 30 seeds.
### Lane C — Render (owns 40–46 render files)
- Stage: seat camera per spot, player with instrument (shape/colour), swapped drummer on the riser, boom mic for singing
  drummers; spectator/BotB unchanged. Garage: swapped drummer at the kit, player rig corner. Creator: "your gear" tab models.
  Carpet + recap photo with instruments. Budgets: draw calls ≤ HD × 1.15; no per-frame allocations.
### Lane D — Audio (owns 30_audio.js, `content/genres.js` backing/voice tables)
- `seatKinds`, timeline `part` + `mute`, `backing.hooks` per genre, playable seat voices with hold gating, booked via the
  drum-sync model (syncSnap), swapped-drummer playback = today's drum synth, noodle per seat. Voice caps hold.

### Lead
- 51 seat picker screen (+ creator tab wiring), 50/60 routing, shell CSS, contracts, save, build, `pw_seats.js`,
  integration, size check, status.md.

## 5. Tests (each lane runs only its own; the lead runs the full set at integration)
- node: `sim_seats.test.js`, `content_seats.test.js`, seat leak scan in `sim_bands` (`SEAT=all`, `LEAK_YEARS=10`),
  `sim_audio` seat checks, every existing suite unchanged and green.
- Playwright `pw_seats.js` META_ONLY = pick | write | gig | studio | shop | garage | stage (390×844; `gig` also 440×956),
  no console errors; existing `pw_*` sections stay green (drum seat = regression baseline).
- Balance: every seat within ±10 % of drums on fans@y3 / fund@y3 / World reach per band; live gig bots perfect = 100 %.

## 6. Merge order
Stage 0 → lanes A–D in parallel (B's real APIs appended here if they differ from §3) → lead wires 51 + routing → full tests
→ balance → build → PR `v1.1-seats` → merge → delete branch → status.md (Current = 1.1.0.0, Next = 1.2 Tuning).
