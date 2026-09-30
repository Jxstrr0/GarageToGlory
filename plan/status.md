# Garage to Glory: status

Read this first every session. Don't re-explore the codebase to rebuild context.

## Version
- Current (on `main`): **0.8.0.0 "Kit"** (merged 2026-09-30, PR #11). **Update Current/Next at every merge** (Addendum 2 D0).
- Shipped: 0.1 Garage · 0.2 Sequencer · 0.3 Stage · 0.4 Drama · 0.5 Signed (+ 0.5.1 gig-clock hotfix) · 0.6 Rivals
  (+ 0.6.1 Addendum 1 catch-up, 0.6.2 two thumbs + guided songwriter) · 0.7 World (+ 0.7.1 3D title, 0.7.2 Heavier:
  English titles, layered crowd, heavier metal, double kick) · 0.8 Kit.
- Next: **0.8.1 "Addendum 2 catch-up"** (D1 licensing, D2 band logo, D3 year-end recap) → 0.9 Genres → 1.0 Glory
  (+ D4 achievements) → 1.1 Tuning (D5).
- Repo: https://github.com/Jxstrr0/GarageToGlory (branch `main`; work lands through PRs that are merged and their branches deleted)
- Play: `dist/game.html` (standalone), `dist/game.artifact.html` (Artifact host copy), `dist/Garage to Glory - V<ver>.html`

## Locked foundations (from handoff A2)
| Call | Decision |
|---|---|
| You are | The drummer and founder. You never quit, you can't fire anyone. |
| Look | 3D rooms and stages (like Kick), low-poly, phone-first, portrait. |
| Gigs | A rhythm game on drum lanes (Guitar Hero style, top-to-bottom note highway). |
| Genre | Picked at the start of a career: Metal, Punk, Rock, Country. All four ship in v1. |
| Time | Week-by-week turns. 24 weeks per year. 10-year career (240 weeks) + 2–3 bonus years for early success. |
| Tone | Comedic. Burning vans, moose concept albums. |
| Cast | Every band member and every rival band is hand-made. Random recruits fill holes when someone quits. |
| Names | Real cities. Parody names for bands, venues, labels, festivals, magazines, awards. |
| World | Canada first, then UK & Europe, Japan, Australia, Russia. **No USA content.** |
| Saves | Autosave at the end of every week + 3 manual save slots. Gigs save between songs. |
| Money | One shared band fund. A "pay the band" setting decides members' cut vs the fund. Broke = borrow from your parents (guilt cards). |
| Run length | Always ends at year 10 (or 12–13 with bonus years). Never a game over. |

## Owner decisions
- 2026-09-30: **Double kick** (owner: "make 1 kick note hit as a double kick to create less compression on the note highway
  while still keeping the pace quick"): two fast kicks (≤ `gig.DOUBLE_GAP` 0.18 s apart) are ONE highway note; one tap plays
  both (the second on the audio clock at its time); every difficulty; one note for accuracy/combo. Shipped in v0.7.2.
- 2026-09-29: Money feel = **Scrappy, but not too brutal** (always a little short; hustle matters; parents' loan is rare with decent play).
- 2026-09-29: First storyline chain = **The Cape Saga** (Marcel's cape).
- 2026-09-29: Owner allows auto-merging PRs into `main`; delete merged branches afterwards.
- 2026-09-29: Play on phone via **GitHub Pages** (Settings → Pages → Deploy from branch `main`, `/ (root)`).
  Root `index.html` redirects to `dist/game.html`; `.nojekyll` present. URL: https://jxstrr0.github.io/GarageToGlory/
  Owner turned Pages on (2026-09-29).
- 2026-09-29: **Standing authorization from the owner:** keep running autonomously — build version after version
  (v0.1 → v1.0 per handoff B4) and merge each PR into `main` yourself, without waiting for approval. Process per
  version: branch `vX.Y-<name>` from `main` → build + tests → push → PR → merge into `main` → delete the branch →
  update this file → start the next version. Still ask popups only for genuinely open decisions (handoff A16).
  **`main` is the one build branch** (always the latest playable build; Pages serves it). After every merge, delete
  the merged branch and any other branches that are no longer needed, so `main` is the only long-lived branch.
- 2026-09-29: Owner: **prefer token efficiency** — few agents (only for multi-feature batches), no duplicate work,
  lean reviews (tests + one focused review pass), patches done inline by the lead.
- 2026-09-29 (for v0.6): Tundra Wraith frontman **Gord "Grimnir" Penner** (chartered accountant, minivan with a
  Winnipeg Jets bumper sticker, screams about eternal winter, brings a veggie tray to every show) + **3 more polite
  accountants** (full hand-made lineup). Other rivals' members are designed in **v0.9**. Final showdown = **Sad Dome
  co-bill** in Calgary in year 10: a head-to-head set decides who headlines and who opens, forever (feeds the ending).
- 2026-09-29 (for v0.5): career pace **Steady** — Local Heroes ≈ end of year 1 (250 fans), first label interest in
  year 2, signed by year 2–3, World Stage reachable ≈ year 5–6 (leaves room for bonus years).
- 2026-09-29 (for v0.4): Garage-era protection ends at **250 fans**; drama level **"now and then"** (≈ one quit every
  1–2 years with decent play, more if underpaid/overworked; always warned first); pay-the-band default **30%** of gig pay.
- 2026-09-29 (for v0.3): **Kenji drives the van, silently** (every trip, sunglasses, nobody sees him get in or out);
  v0.3 map = **Saskatchewan core** (Saskatoon, Regina, Prince Albert, Moose Jaw, Swift Current, North Battleford,
  Yorkton, Warman/Martensville); rhythm timing = **Forgiving** (wide early window; drum skill widens it further).
- 2026-09-29: Owner turned on GitHub "Automatically delete head branches" (merged branches clean themselves up).
- 2026-09-29 (for v0.2): drum palette = **punchy real-ish synth kit**; metal backing = **tempo decides**
  (slow → doom sludge, mid → palm-muted chugs locked to the kick, fast → tremolo blast riffs; bass doubles guitar).
- 2026-09-30 (for v0.7.2): song titles = **English, Marcel rarely French** (starter + new metal songs get English titles,
  still secretly about Marcel's lawn; now and then Marcel sneaks a French one in as a joke). He still SINGS in French.

## What's in v0.7.2 double kick (owner request 2026-09-30)
- `22_sim_gig` chart: after the two-thumb rule and BEFORE difficulty thinning, a kick ≤ `gig.DOUBLE_GAP` (0.18 s) after the
  previous kick merges into it: the earlier note gets `dbl: true, t2` and the later one leaves the highway. Runs pair in order
  (1+2, 3+4, …; an odd last one stays single); freestyle kicks never merge. `chart.doubles`; `chart(song, { doubles: false })`.
  0.18 (the lead asked ~0.16): with no pedal before v0.8 songs have no back-to-back 16th kicks, so 0.16 only reached 8th kicks
  ≥ 188 BPM; 0.18 = 8ths from ~167 BPM (Thrash/Blast tempos, the 170 BPM metal signature) and 16th pairs from 84 BPM.
  Session: judged on the first hit (one note for total/accuracy/combo; hit stamps `hitT`); an untapped double = one miss, the
  second hit is never judged; tapping the second kick as well is forgiven (`echo`, no stray). Two-thumb rule unchanged (a kick
  is never a thumb drop; the second kick keeps the kick's slot at t2, so a 3rd hit there stays auto).
- `55_ui_gig`: double = a stacked pill + a "×2" badge in the kick lane; once the first is hit (tap or Auto-kick) the second kick
  plays at max(t2, hit + 0.06 s) via `GG.audio.hit('kick', G.zero + t)` scheduled ahead on a healthy clock (frame-due otherwise,
  never two at once); a missed double plays nothing extra; the kick zone flashes again + a ring when it's heard, and
  `GG.render.stage.kick2()` kicks the drummer's left foot (`info().kick2s`). Debug gigui `doubles, doublesPlayed`, `soon/next.t2`.
- Numbers: metal signature (170 BPM, 8th kicks) Hard/Expert 432 → 340 notes (−21%, kick lane 184 → 92, 12.8 → 10.0 notes/s),
  Normal 322 → 230 (−29%), Easy 98 → 106 (thins by time; kicks 48 → 46); metal jams ≥ 175 BPM −23% on Hard; songs < 167 BPM
  unchanged. Live bots (20 bands × 3 songs, before → after): perfect 90 = 90, avg/sloppy within ~1 score point on every
  difficulty. `tools/balance.js 10 20` identical (careers auto-resolve with `gig.simulate`, which never builds charts).
- Tests: sim_gig 22 (+2: merge rules/pairs/runs 3-4-5/threshold/determinism/difficulties/invariant notes + doubles + auto =
  pattern hits; session tap/echo/miss/auto-kick) · pw_gig `double` (12; screenshot `tests/.cache/double.png`).
- Review fixes: the second kick is placed `max(t2 - hitT, 0.06)` after the tap's HEARD kick (tap stamps `note.k1` on the song
  clock = songTime + lat + 5 ms; Auto-kick: hitT + lat), so calibrated headphones (+200 ms) and output latency keep the
  pair's spacing (was: flam at ~+150 ms, silent at ≥ ~+240 ms). tap() judges first; an echo tap plays no sound (the
  scheduled kick is that hit) unless its second kick was dropped (`d2 = 2`). An echo tap that was also inside the next
  kick note's window credits that note (`cur.echoFor`) if it's never tapped (was: an early tap for the next note → miss).
  `GG.audio.hitCancel()` (scheduled hits use their own port) runs in stopAudio: no stray kick/auto note after a restart
  or a hidden app. Tests: sim_gig 23 (+1 early-tap credit, hard/normal) · pw_gig `double` 17 (+echo silent, +headphones
  +200 ms spacing, +hitCancel). Live bots: accuracy +0.0–1.0 pt (early taps no longer stolen); balance.js identical.

## What's in v0.7.1 "Title" (owner patch from a parallel session, integrated 2026-09-30)
- 3D title screen: `src/45_render_title.js` (GG.render scene 'title': night in Saskatoon, the garage in a hailstorm,
  Hail Damage inside, Dad's hail-dented truck, the bungalow, an arena with searchlights on the horizon; instanced hail,
  lightning + thunder; taps: kit = a real drum fill, Marcel = lightning, truck = horn + headlights, house = porch light).
  API `GG.render.title.{setFrame, strike, tap, info}`. 51_ui_menu: title is `live3d` + transparent (`.title3d`), flat
  title without WebGL; 60_main keeps drawing on the title with no career; 30_audio 'storm' ambience + thunder/honk sfx.
- Lead fixes after a 3-lens review: reduced flashing / camera shake / graphics quality now apply live on the title
  (read from the cached `R.prefs()` every frame; hail allocated at max, live count = quality); the title's framing is
  skipped while hidden and re-measured when a screen above it closes. pw_settings lefty check made race-free (two-thumb
  auto notes also call GG.audio.hit). Tests: `tests/pw_title.js` META_ONLY=scene|flow|prefs (15 + 10 + 7).

## v0.7.2 audio (hotfix; owner 2026-09-30: "make the crowd sound better", metal: "heavier guitars, growls and screams, darker riffs")
- Metal only (punk/rock/country untouched): two rhythm guitars (Jaxon L, Dana R: double-tracked, detuned, R 6-8 ms late)
  each through a high-gain amp (pre-EQ: 110 Hz high-pass + 900 Hz push → asymmetric soft/hard clipper, oversample 4x →
  cab: 78 Hz high-pass, 140 Hz shelf, 520 Hz scoop, 2.6 kHz presence, 5.4 + 6.8 kHz low-passes → pan); power chords as
  one PeriodicWave oscillator (root + fifth + octave), so the voice count stays as before; gated palm mutes through a
  480 Hz low-passed input; bass = one saw split into a clean sub + a driven grind (floor B0, `backing.bassFloor`).
  Drop tuning by tempo band: root C2, `backing.tune` doom −1 / chug 0 / tremolo +1 (`keyFor(seed, genre, bpm)`;
  no bpm = no shift). Riffs: phrygian; doom = ringing, drooping chords + b2/tritone answers + a chromatic step; chug =
  kick-locked chugs (pedal on the low string in verses, the chord in choruses, a b2/tritone stab every other bar);
  tremolo = each riff pitch picked twice (16ths), chromatic runs, power-chord blast riffs in choruses; breakdown = one
  open low-string drop with space, a muted pair, a b2 stab, then 3-3-2 half-time chugs. Dana's solos: dark arpeggios,
  quantized to the scale. Vocals: `scream` on chorus downbeats (+ a gang scream), `growl`s on the breakdown (the drop +
  bar 2), both on the beat grid and in key, on their own channel; the guitars' presence band dips −9 dB under them.
- Crowd (all genres): pre-rendered once per page in plain seeded JS (22.05 kHz stereo; babble of 14 formant voices,
  roar of 12 shouting voices, applause for big and small rooms, on-beat clap hits, 4 "woo/yeah/hey"s, 2 whistles, a
  boo), built after unlock in ~8 ms ticks of resumable steps (a voice renders 4096 samples a step, noise/gain loops
  16384, applause a clapper, clap-along 10 hands: < 1 ms warm, ~4-6 ms cold; output bit-identical to the one-pass build),
  paused during songs; the crowd fades in when ready, never stalls a gig.
  Live: babble louder between songs than during; roar follows 'crowd:level'; claps on the beat when hot (every beat,
  2 and 4 from 150 BPM, never in breakdowns); fans woo/whistle when hot; a grumble of boos when the meter is under 22;
  cheers/boos on 'crowd:moment'; a song-end reaction on 'gig:song' scaled by score; Japan's silent crowds hush during
  songs; ≤ 12 crowd one-shots; a 0.15 send into the venue reverb. SFX 'cheer'/'boo' (awards, studio) use the buffers.
- `renderOffline` is stereo now (+ `buffer`, `crowd` tally; specs `probe`, `crowd`, `voxInvert`, crowd `song/silent/
  small/moments/clapBpm`). Debug audio: `counts.claps/woos/whistles/applause/dropped`, `crowd.song/silent/clapping/ready`.
- Numbers (OfflineAudioContext, same method on the v0.7.1 build; metal signature, verse/chorus/bridge, song s3):
  - Metal band-only @140: energy < 150 Hz −27.4 → −21.1 dB (share 0.19 → 0.52); 150–500 Hz −22.7 → −24.3; 500 Hz–2 kHz
    −26.5 → −26.6; 2–6 kHz −36.0 → −29.4; stereo side/mid 0 → 0.15; RMS 0.099 → 0.131, peak 0.52 → 0.56 (limiter).
  - Lowest guitar 98 Hz (G2) → 65 / 69 / 73 Hz (doom/chug/tremolo); bass 49 → 33–37 Hz.
  - One guitar note through the amp: THD 0.37 → 0.63, harmonic energy (re fundamental) 0.13 → 0.39. Odd harmonics
    are *not* up relative to the fundamental (the asymmetric clipper and the tight pre-high-pass favour even ones).
  - Vocal/band inside the hit windows (polarity split): chorus shouts +1.0 dB → screams +4.6 dB; breakdown growls
    +7.4 dB over the (much heavier) breakdown (v0.7.1's lone growl was +10.4 over near-silent muted chugs).
  - Every genre's song peak < 0.61 (limiter), RMS 0.10–0.15; punk/rock/country identical except stereo reverb now counts.
  - Crowd: bed 0.027 / 0.031 / 0.043 RMS at meter 15/50/90 (0.014–0.043 during songs, 0.002 silent), events peak ≤ 0.72,
    metal + a roaring crowd peak 0.84. v0.7.1's murmur was ~ −36 dBFS: effectively inaudible under the band.
  - CPU: a full metal song (arena reverb + crowd) renders 2.1× real time headless (v0.7.1 metal ~6×, before the crowd).
- Live taps (fix, pre-existing since v0.6.1): `hit` cuts off the lane's previous tap (lanes monophonic, like the timeline;
  a gain per tap, its sources stopped) and SONG_VOICES = 18 = band 8 + the whole kit 10, so a metal chorus on Hard
  (8th kick + 8th crash, snare 2/4) no longer loses snares to the cap (was ~half on Hard). `counts.tapDrops` (debug).
- Tests: sim_audio 12 (new metal tuning/riffs/tremolo/solo/scream test; crowd build steps < 3 ms warm + slices = one pass);
  pw_seq audio 39 (growls from the drop, live crowd ready + ≤ 18 song voices, every tap sounds over a full metal band) +
  new `heavy` section (22: the numbers above as assertions against the v0.7.1 values).
  WAVs (not committed): `tests/.cache/audio_before_*.wav` (v0.7.1) and `audio_after_*.wav` / `v072_*.wav`.
- Gaps: nobody has listened on a phone yet (tuned by numbers). The pw_gig "setlist layout" hscroll was a real bug, not
  load: long English titles (41-char starter) overflowed `.set-song` on every run; fixed by `.set-song > .row { min-width: 0 }`.
- pw_gig `gig` flakes, root-caused with CDP CPU throttling ×6 (headless rAF gaps 250 ms–5 s while a 25 ms timer keeps
  pace; the main thread is mostly idle, frames wait on the GPU) — all real bugs a GPU-bound or slow phone would hit:
  (1) auto notes / second kicks were booked only in the frame loop, so a late frame booked them in the past (played up to
  110 ms late) or skipped them; now a 25 ms booking pump (`55_ui_gig` pump/book, like the band's setInterval scheduler)
  books them too, and the booking horizon reads the audio clock (`heardSong`) so a game clock still drifting after an
  audio hiccup can't book them ~0.7 s early (≥ 1 s = played at once). (2) "gig layout hscroll": the count-in numeral
  (`.gig-count`, full-width box, `scale(1.35)` keyframe) stuck 68 px past the edge during every count-in, and Chrome kept
  the 458 px scroll width into the song when frames were slow; the box is now 120 px, centred. (3) "song clock = AudioContext
  time" (−35..−83 ms under load): `startAudio` resynced with a `performance.now()` taken BEFORE `GG.audio.play()` (slow on
  a slow CPU), so the song clock ran ahead of the band by play()'s duration; it now resyncs with a fresh now.
  Tests: pw_gig gig 31 (+2: count-in never widens the screen; rAF slowed to 600 ms → auto notes still ahead, none skipped;
  debug gigui `autoSkipped`). Still frame-bound: Auto-kick's own kick (`ses.tick` in the frame) plays on the frame it's due.
  Residual only under extreme load (3 parallel ×6-throttled runs): "song clock started" (< 2 s) when a rAF gap is > 2 s.
- Gaps: nobody has listened on a phone yet (tuned by numbers); pw_gig `gig` "auto notes scheduled ahead" is flaky under
  machine load (headless rAF gaps of 100-600 ms with software WebGL; HEAD and the fix both fail it ~half the time at
  load avg 7-14; green when quiet). The pw_gig "setlist layout" hscroll was a real bug, not load: long English titles
  (41-char starter) overflowed `.set-song` on every run; fixed by `.set-song > .row { min-width: 0 }` (the title
  ellipsizes, chips stay on screen). "gig layout" (the play screen's full-body) still hscrolls now and then under load
  (1 in 13 runs; never reproduced with diagnostics; the play screen shows no song titles).
- pw_rival `botb` "btn-rs-go" 12 s timeout under load was a real bug, not load: the rival's set (59d `tick`) capped each
  frame at 0.1 s, so below 10 fps their set played in slow motion (a 4.5 s set took 18-27 s at 300-1000 ms frames; their
  drummer also drifted off the audio after any hitch). Their set now runs on wall time like the gig clock (v0.5.1); time
  with the app hidden doesn't count (visibilitychange re-bases). Debug `rivalui.clock`; pw_rival botb +1 check (a 1 s
  stall advances their set ~1 s; the old clock gave +0.2 s). Repro: CDP `Emulation.setCPUThrottlingRate` 6.
  Same cap in the van (57 `frame`), the other botb timeout under load (the weekend's 8 s wait): the skip click missed its
  2 s actionability wait, the helper never retried, and the drive crawled (39% after 26 s). The drive now runs on wall
  time too (a long frame still stops at the road card, 45%), and pw_rival `weekend()` retries the skip until it lands.
- Seen while reproducing (not fixed): with the song left to play to its end, the gig's `audio:end` handler compares the
  last frame's `G.t` with the chart and can read the natural end as "stopped under us" → pause(true) (the song restarts
  on resume). Headless audio runs ~0.5-1 s ahead of the gig clock by the end of an 18 s song, so it pauses every time
  there; on a phone it needs a > ~0.27 s frame at that moment (or ~0.3 s output latency). pw_rival botb only hits it when
  its screenshot outlasts song 1 (~18 s, 6x throttle + parallel runs).

## v0.7.2 titles (hotfix, TITLES agent)
- `content/song_titles.js` metal pool = `{ en, fr }` (46 entries; every v0.7.1 `fr` kept): `en` is the title (overtly metal,
  always about the lawn: "Reign of Sod", "Requiem for a Lawn Mowed Too Short"); Hail Damage starters = "My Lawn, My Tomb" +
  "Dandelions of the Apocalypse (On My Lawn)" (`titleEn: null`, `fr` = the old French title, which still seeds their patterns).
- `GG.songs.pickTitle` → `{ title, titleEn, fr? }`: English (titleEn = title) or, ~1 in 8 (`songs.FR_CHANCE`, override
  `economy.songs.frChance`), Marcel's French one (title = fr, titleEn = en, `fr: true`); only while Marcel is active; the
  roll is seeded by career seed + song slot + fr (never the career RNG: balance/bot careers replay identically, verified).
  An entry is used if its en OR fr is. `create` flags `song.fr` (a picked French title, or any title in `englishFor`).
  Reactions: `lines.songReactions.marcel.nameFr` (he insists) + one `<dana|jaxon|kenji>.frSigh` right after (own seed).
- Old saves: `GG.songs.migrateTitles` chained onto `GG.save.migrate` (no SAVE_SCHEMA bump): songs / pendingSongs whose title
  is an old French title (`englishFor`, sequels too) and not `fr: true` become English (title = titleEn = en); follows into
  liveGig song results, lastGig + lastWeek (setlist, songResults, new-song delta), wrap.tour.big, tour big/queue/ctx, the
  Loonies single nomination. Chat/news/reviews/result lines/posts are history (unchanged). Idempotent.
- API adds: `songs.englishFor(title)`, `isFrench(title)`, `frenchTitles()`, `migrateTitles(state)`, `FR_CHANCE`. Sequencer
  queues `entry.fr` for Marcel's French titles; reroll button "🎲 Another title from Marcel". Content rewording: coach name
  tips, Marcel's name lines, the Gord card ("translated the French lyrics of 'The Green Tomb'"), Monolith's English demand
  ("Love the English titles… Now Marcel should sing in English too."). Album titles keep one French pitch (labels, unchanged).
- Cards name songs by their English titles ('My Lawn, My Tomb', 'The Green Tomb (It Is the Lawn)'): 9 common cards fixed.
- Tests: content 49 (English pool + v0.7.1 fr coverage + no "titles are French" text + no pool/starter `fr` in cards/lines), sim_songs 15 (picks/rate/seed,
  reactions, old-save rename everywhere + idempotent + fr kept).

## Owner feedback → v0.6.2 (2026-09-29)
- "It plays very well." The song creator is "a bit tough to use and wrap your head around"; "not possible to hit 3 or
  4 notes at once".
- **Two-thumb rule** (owner pick): on EVERY gig difficulty (Easy → Expert) charts never ask for more than 2 notes at
  once (priority kick > snare > cymbal > toms > ride > hat). The dropped hits still SOUND (auto-played in the drum audio,
  not judged, no miss). Hard/Expert get harder through density and speed, never 3-finger chords.
- **Songwriter** (owner picks): **groove presets** (start each section from a named beat per genre, then tweak; one-tap
  "More metal" / "Make it catchier"-style buttons) + a **step-by-step flow** (one thing per screen: Verse → Chorus →
  Bridge → Tempo → Song order → Name), with the full grid editor still available as "Advanced".

## Addendum 1 (handoff Part C) — decisions (owner, 2026-09-29; locked unless marked open)
- C1 Van: designated driver per band changes stats + road cards — Hail Damage **Kenji** (silent, perfect record, never
  uses GPS, always exactly on time; fewer breakdowns), Frost Heave **Moth** (her apartment; free maintenance, terrible
  comfort), Gravel Kings **T-Bone** (safe but slow; Chase begs to drive, blasts '80s cassettes), Grid Road Ramblers **Earl**
  (20 under the limit, stops at every historical marker; slow, road stories boost chemistry). If the driver quits, **you**
  drive and the road-card pool changes (wrong turns, gas-station arguments). Seating: driver up front, you shotgun, band
  in the back rows, gear + merch piled behind. Dashboard item per driver (Kenji's tiny cactus, Moth's laundry, Chase's
  cassettes, Earl's 1987 road atlas). Road events: deer on the Yellowhead, whiteout on the Trans-Canada, the fight over
  shotgun, Marcel's cape shut in the sliding door. Vehicle names per band per tier (table in Part C1), renamable; venue
  stickers on the van body (banned venues crossed out) → v0.8.
- C2 Character creator (v0.8): separate everyday + stage looks (stage look auto for gigs/red carpet/stage scenes);
  unlocks grow with the career; optional carry-over of unlocks within the same genre at a new career; full part lists
  in Part C2 (knuckle tattoos: player types 4 letters per hand, A–Z). **No gong on the drum kit, ever** (the Global Gong
  award stays — owner clarification).
- C3 Audio: kit voices as specified; genre kit tuning (metal tight/clicky, punk loose/trashy, rock big/roomy, country
  soft/dry + rim clicks + optional brushes); kit quality tiers (v0.8); generated band per genre with a new random key per
  song and section density (sparse verses, full choruses, stripped breakdowns); synthesized vocal hits on the beat grid
  (shouts on chorus downbeats, growls on breakdowns, pitched to the key, never off-beat); taps trigger drums (done);
  venue reverb by size; crowd bed that swells with the meter + cheers/boos; garage hum with Dana noodling; van road
  noise; van radio plays your charted song; mixer (drums/band/crowd/SFX) + metronome toggle in the sequencer.
- C4 Settings: audio calibration runs on first launch (tap along to 8 clicks → offset; visual flash check; two profiles:
  phone speaker / headphones, quick switch); career difficulty Chill / Normal / Brutal chosen at new career and locked;
  gig difficulty Easy / Normal / Hard / Expert (stacked with drum skill) + independent note speed; assists: No-fail,
  Auto-kick, Practice mode (any catalog song, slow-down); lefty mode, graphics low/med/high, camera shake toggle,
  colourblind lane colours, bigger text, reduced flashing, skip van scenes / faster animations, save management.
- C5 Bandbook (one parody social app on the laptop): Promote posts automatically (content picked from band state);
  viral chance (good or cringe); generated comedic comments (Tundra Wraith leaves a supportive one on every post);
  scandals → choice cards (Marcel's lawn is artificial turf); fan types superfans / casuals / haters (fans stay one global
  count); recurring superfans (Dale from Warman, the jumper-cable trucker, the president of your Japanese fan club); fan
  mail + gifts in the garage (macaroni portrait of Kenji); paid fan club later in the career on **Patreeon** (owner pick:
  "support your favourite band's van repairs"; tiers Drumstick / Snare / Full Kit).
- C6 Maps in rings: Saskatchewan from day one (Saskatoon, Regina, Prince Albert, Moose Jaw, Swift Current, North
  Battleford, Yorkton, Humboldt, Gravelbourg, Estevan; Warman/Martensville stay as Saskatoon satellites since venues
  shipped there); **the West** in Local Heroes (Winnipeg, Brandon, Calgary, Edmonton, Red Deer, Lethbridge, Kelowna,
  Vancouver, Victoria); **the East and North** in Signed (Thunder Bay, Toronto, Ottawa, Montreal, Quebec City, Halifax,
  St. John's, Whitehorse, Yellowknife); world regions + city lists in Part C6 (v0.7; Helsinki hosts the Moose Opera
  ending). Starting cities: Hail Damage Saskatoon, Frost Heave Regina, Gravel Kings Edmonton, Ramblers a farm outside
  Swift Current (v0.9).
- C7 Calendar: two weeks per month, every week shows its month + season. Week 1–2 = July … 11–12 = Dec, 13–14 = Jan,
  15–16 = Feb, 17–18 = Mar, 19–20 = Apr (Loonies, week 20), 21–22 = May, 23–24 = Jun. Winter Dec–Feb (weeks 11–16),
  spring Mar–May (17–22), summer Jun–Aug (23–24, 1–4), fall Sep–Nov (5–10). Season effects + genre-season fit; weekly
  weather by season/region (never cancels a gig); garage changes with the season; overseas seasons (v0.7); holidays:
  NYE best-paying gig, St. Patrick's pub circuit, Canada Day free park shows, Halloween costume gigs, Thanksgiving dinner
  (guilt cards if you owe), Remembrance Day (no Legion gigs that week), Christmas party circuit + the label's terrible
  Christmas single, the Grey Mug halftime show (late-career moment).
- C8 still OPEN (popups when reached): other rivals' members (v0.9), exact balance numbers.

## Addendum 1 — pending
Already-shipped versions → **v0.6.1 catch-up**:
- [x] C1 van drivers (effects, you-drive pool, seating, dashboard items, new road events) — WORLD, v0.6.1
- [x] C3 genre kit tuning, per-genre generated band + random key + section density, vocal hits on the beat grid — AUDIO, v0.6.1
- [x] C3 venue reverb, crowd bed + cheers/boos, garage hum, van road noise, van radio, mixer, sequencer metronome — AUDIO, v0.6.1
- [x] C4 calibration (first launch + settings, 2 profiles), career difficulty (locked per career), gig difficulty
      Expert + note speed, assists (No-fail, Auto-kick, Practice), accessibility/graphics/skip settings, settings screen — SETTINGS, v0.6.1
- [x] C5 Bandbook, virality, comments, scandals, fan types, named superfans, fan mail + gifts, fan club (Signed era) — FANS, v0.6.1
- [x] C6 Sask ring additions, West ring (Local Heroes), East & North ring (Signed), Canada map in rings — WORLD, v0.6.1
- [x] C7 month/season calendar, weather, season effects + genre-season fit, garage seasons, Canadian holidays — WORLD, v0.6.1
Later versions:
- [x] v0.7: C6 world regions/cities, C7 overseas seasons + regional holidays, Japanese fan-club president, Global Gong — WORLDSIM + WORLDUI, v0.7.0
- [x] v0.8: C1 vehicle names/rename/stickers/upgrades, C2 full creator + unlocks + carry-over, C3 kit quality tiers — KITSIM + SHOPUI (C1, C3), CREATOR (C2), v0.8.0
- [ ] v0.9: C1 other bands' drivers in play, C6 starting cities, rivals' members (open)

## Addendum 2 (handoff Part D) — decisions (owner, 2026-09-29/30; locked unless marked open)
- Timing: queued behind v0.8 (done); never expands a version in progress. **No share/screenshot button, ever.**
- D1 Licensing deals (v0.8.1): offers from the Signed era, or earlier if a song charts on the Maple 100 or goes viral on
  Bandbook; rare (~2–4 per career, more with fame); a Monday card that sits on the laptop ("Offers") for a few weeks.
  Parody brands, genre-weighted: truck commercial (country/rock — Buckle & Boot furious when it goes to the Ramblers:
  rival heat + a card), energy drink (metal/punk), hockey highlight package (any), regional insurance ad (metal — Marcel's
  employer, mortified), video game trailer (any). Content `src/content/licensing.js` (brand, blurb, fee range, genre fit,
  sellout weight). Choices: Take it (lump sum + buzz + streams for that song) / Decline (small superfan loyalty bump) /
  Counter (better fee, chance the offer is withdrawn; odds improve with fans + label clout). Taking it: the song gets
  an "in a commercial" tag that bumps staleness; sellout weight nudges haters up and can trigger a Bandbook scandal card;
  recoupable labels take their cut. Achievement "Sold Out" (D4). **OPEN (D6): exact fee ranges + offer odds — propose
  numbers in the v0.8.1 contract and confirm with one popup.**
- D2 Band logo (v0.8.1): picked on the new-career flow after the band intro, before the creator; editable later on the
  laptop for a fee ("Rebrand": small cost + a little buzz). Three taps: emblem (skull, wheat sheaf, lightning bolt, moose,
  maple leaf, gopher, anvil, hailstone, grain elevator, cowboy hat, safety pin, flaming tire), lettering style (spiky
  unreadable metal, cut-out ransom punk, chrome '80s rock, western slab country — any genre may use any; default = the
  band's), colour pair (~10 curated). Drawn procedurally to a cached canvas texture, reused everywhere: kick-drum head
  art, merch, van stickers, Bandbook avatar, garage banner, Loonies broadcast card, Hall of Fame entry. No image files.
  Save: `logo: { emblem, style, palette }`; carry-over follows the cosmetics rule. Rival bands get fixed logos from content
  (same renderer) on the Scene leaderboard + BOTB screens. **OPEN (D6): final emblem + palette lists (add, don't shrink).**
- D3 Year-end recap (v0.8.1): at the week-24 wrap, before the next year: one swipeable screen — fund change (in vs out),
  fans gained, best/worst gig (venue, grade, one-line quote), songs written + albums released, awards (Loonies, Global
  Gong), who quit / came back, rival standing (leaderboard delta), regions unlocked, a Rolling Scone headline generated
  from the year's biggest event; a band photo (the current lineup posed in the current space, a 3D still — not a share
  image). Stored compactly in `history` (don't bloat the save code) so v1.0's Hall of Fame can show a career as a strip of
  yearly recaps. Year 1's recap is where the bandmates explain what "a good year" looks like (tutorial tie-in).
- D4 Achievements (v1.0, with Hall of Fame + meta unlocks): cross-career, meta storage, laptop "Trophies" + a toast on
  unlock; ~30 as content (`src/content/achievements.js`: id, name, blurb, condition); never gate content. Seed list in
  handoff Part D4 (Twelve People and a Dog, The Wall, Ma Pelouse, The Original Five, Kijiji All-Stars, Sold Out, Worst Van,
  Block Heater, Buddy, Big in Japan, Frostbite, Chugging Along, Grey Mug, Night School, Sad Dome). **OPEN: extras (cheap +
  funny, add freely).**
- D5 **v1.1 "Tuning"** (new roadmap entry after v1.0): no new features; owner playtests years 3–6 on his phone → numbered
  items in this file → small v1.1.x patches, `tools/balance.js` before/after each; bot probes (fund by year incl. the late
  plateau, fans vs Steady targets, quits ≈ 1 per 1–2 years, rival gap, World ≈ year 5–6, bonus-year rate); back-burner
  sweep (fix cheap, close the rest with a reason); phone QA at 390×844 (every screen, two-thumb on Hard/Expert, Bluetooth
  calibration, save-code size, battery on a full gig). Start v1.1 with a popup: the owner's two biggest annoyances.

## Addendum 2 — pending
- [x] D0 housekeeping: Version section fixed (and kept current at every merge), Part D appended to handoff.md, decisions
      + this checklist recorded, queued file retired — lead, 2026-09-30
- [ ] D1 licensing deals — v0.8.1 (popup: fee ranges + odds)
- [ ] D2 band logo (picker, renderer reused everywhere, rival logos, Rebrand) — v0.8.1
- [ ] D3 year-end recap (swipeable, band photo still, compact history) — v0.8.1
- [ ] D4 achievements (~30, cross-career, laptop Trophies) — v1.0
- [ ] D5 v1.1 Tuning (playtest loop, bot probes, back-burner sweep, phone QA) — after v1.0

## Tech
- three.js **0.149.0** from cdnjs (last UMD build without the r150 deprecation warning). Only external dependency.
- Build: `node build.js` → dist/. ORDER rule: 01_ns, 02_contracts, content/*.js, then other src/*.js by name.
- Tests: `node tests/run.js` (all node tests). Playwright: `timeout 500 node tests/pw_flow.js` with `META_ONLY=<section>`; helper `tests/_pw.js` routes three.js to `tests/.cache/` (gitignored) and runs at 390×844.
- Balance: `node tools/balance.js`.

## What's in v0.1.0 "Garage"
- Title → slot → genre (Metal playable; Punk/Rock/Country locked "v0.9") → band intro → basic creator (name, nickname,
  6 presets) → 5-panel cold open → the 3D garage (tap-to-walk, 7 labelled hotspots, bandmates with idles/moods,
  seasonal yard, Marcel's cape from `flags.cape`).
- Week loop: Monday card (50 cards incl. forced `lord_abyssus` + 6-card Cape Saga; 13 gambles) → whiteboard (3 blocks,
  6 activities; offers accept/decline) → results (block lines + auto-resolved gig) → wrap (deltas, milestones, moods,
  group chat, parents' loan + guilt) → autosave (auto + career slot). Year rollover at 24 weeks; career ends at 240.
- Laptop (chat / band / money), ☰ menu (save slots, save code backup/restore, sound, quit). Synth sfx.
- Balance (5 seeds, year 1): avg bot fund min $140 end $531, 253 fans, 0.2 loans; good bot 458 fans, 0 loans.

## What's in v0.2.0 "Sequencer"
- Songs are drum patterns (`PATTERN`: 3 one-bar sections × 4 lanes × 16 steps, arrangement preset Short/Classic/Epic,
  tempo in the genre range). `GG.songs.rate` → Groove (genre fit, rules in `content/genres.js`), Hook (chorus vs verse
  sweet spot + catchiness), Difficulty (notes × tempo × syncopation). Quality = band part + craft − over-hard penalty.
  All 4 genres' rules/signatures ship (signatures score 96–100 at home, ≤ 72 elsewhere); only metal is playable.
- Write block: the planner's Go opens the full-screen sequencer once per Write block (first-ever Write = starter pattern
  + a bandmate tip); Save queues into `state.pendingSongs`, "Let the band jam one" = `songs.jam` (bots always jam).
  Results show the song + reactions (Marcel names it in French, Dana/no solo room, Jaxon/fills, Kenji/nod).
- Sequencer: tap/drag painting, kick-adjacency rule (no double-kick pedal yet) shown kindly, Verse/Chorus/Bridge/Song
  tabs, copy/clear, tempo slider (+ backing style label), arrangement chips, live meters + tips + ability tick,
  Loop/Song playback with playhead. Kit hotspot = sketch pad on `state.draft` ("Use in next Write"). Laptop Band tab
  catalog shows ratings/tags; tap = read-only sequencer with Play.
- Audio: punchy synth kit (6 lanes), generated backing (metal: doom < 100 bpm, palm-muted chugs locked to the kick,
  tremolo > 170; bass doubles; chords per section from the kick/snare skeleton), look-ahead scheduler on
  `AudioContext.currentTime`, ≤ 12 song voices (per-lane choke + booking), glue comp + limiter (peaks ~0.6).
- Gigs: plays add stale (decays 4/week off), stale lowers setlist score; 4 A/S gigs make a classic (results line).
- Saves: schema 2. v1→v2 migration gives every song a pattern from an RNG seeded by career seed + song id (career RNG
  untouched), rates it, keeps old quality/polish; adds `gear`, `pendingSongs`, `draft`. Fixture `tests/fixtures/save_v01.json`.
- Balance (5 seeds, year 1): avg bot fund min $221 end $624, 288 fans, 0 loans; good bot 483 fans, 0 loans.
  Over 40 seeds v0.2 vs v0.1-equivalent knobs: avg fund end 593 vs 542, fans 260 vs 266; good fans 425 vs 448
  (staleness), both within seed noise of the v0.1 targets.

## What's in v0.3.0 "Stage"
- Weekend flow: planner (Book block → gig board) → runWeek → phase 'gig' → "Load the van" → van trip (3D windshield,
  Kenji drives silently, road card + banter, skippable) → setlist picker → live rhythm gig (3D stage top ⅔, 2D-canvas
  highway bottom ⅓, multitouch, taps play the drums, backing from the scheduler) → gig results → wrap.
  Autosave on 'gig:pending' and after every song ('gig:song'); reload mid-gig resumes at the next song.
- Gig sim (`22_sim_gig.js`): charts from `songs.toNotes`, Forgiving windows (0.060/0.130 s at drum skill 10, widening),
  combos, crowd meter + levels + moments, band effects (cape spin, Dana's solo, Jaxon's fills, sulking members), genre
  moments for all 4 genres, freestyle fill windows, setlist opener/closer bonuses, `botPlay` (perfect bot S, avg B).
- World (`26_sim_world.js`): weekly listings across the Saskatchewan core (map pins + road km), tier 1–2 venues with
  quirks/catches/kinds/set sizes, three deals, opening slots (rarely for Tundra Wraith), venue reputation + banned wall,
  the Moose Hearse (condition/space/comfort/wear; no breakdowns while protected), ~12 road cards.
- Scenes: `42_render_stage.js` (venue dressing per kind, instanced crowd ≤150 with all C.MOMENTS, band + your kit;
  ~34 draw calls worst case), `43_render_van.js` (seasons × day/night, moose, bandmates lean in to talk; ≤29 draws).
- Save schema 3 (v2→v3 migration in `GG.world.migrate`).
- Tests: node content 26, save 7, sim_career 22, sim_gig 14, sim_songs 12, sim_world 15 · pw_flow flow/year/code/layout
  · pw_garage · pw_seq seq/audio · pw_gig gig/e2e · pw_world board/van · pw_stage stage (incl. van).
  v0.4: content 31, sim_drama 14 (new) · `pw_drama.js` META_ONLY=drama (19; screenshots `drama_band.png`, `drama_recruit.png`).

## What's in v0.4.0 "Drama"
- Garage-era protection ends at **250 fans** (wrap milestone "Local heroes on the horizon", `protection:ended`, van
  breakdowns now fire). Era label stays 'garage' (v0.5).
- Drama sim (`27_sim_drama.js`): weekly mood pushes from money (pay cut vs expected 25% → +10% with fans; recruits
  expect their asking cut), overwork (burnout > 55), band success (4-week fans trend, gig grade) and wants (content;
  Kenji = random drift). Stages 0 fine → 1 grumbling (chat) → 2 passive-aggressive (`tone:'pa'` chat, wrap warnings)
  → 3 ultimatum (forced Monday card next week) → 4 quit; one step a week, back down as mood recovers; capped at 2 while
  protected (and for Reliable recruits). Ultimatum fixes cost money/pay/burnout; refusing quits.
- Quits: originals run an exit storyline (chat beats: Marcel in Rimouski, Dana in 13/8 prog, Jaxon grounded by Baba,
  Kenji vanishes 'away' and walks back in on his own), a return card months later (empty slot: welcome / conditions /
  not yet; filled slot: take them back or keep the recruit → original joins Tundra Wraith, `rivalDefectors` + rival
  blurb). Returners come back changed (+5 skill, `changed` text). Recruits who quit just leave.
- Holes: −14 gig score (−10 live crowd start) per open hole; fill-in = $40/gig, skill 38, −4 score, −1 chemistry/week.
  Recruit ad $30 → 3 candidates (genre name pools, Sask hometowns, 1–5★ scaling with era/fans, 9 traits with real
  effects, 12 quirks with quirk cards, asking cut, chemistry on the card); re-post $20. Generated LOOKs.
- Pay the band: `payCut` default 30% (0–60%, step 5) of gig pay to members (`r.cut`); upkeep lowered 30 → 22 + 0.012/fan
  to keep year 1. Parents' loan: 6 guilt cards with `repay` (never below the $100 cushion; paying off clears the flag).
- UI (`58_ui_band.js`): laptop Band tab = pay slider + live preview, member cards (mood, stage badge, want / trait,
  quirk, stars), holes (Post an ad / Hire a fill-in / Let go), departed storylines, rival watch; recruit sheet (3 cards,
  Hire / Re-post / Close); tone-marked chat; wrap panels (protection, "Trouble in the band", "Meanwhile…"); ultimatum
  card tag. Garage + stage show fill-ins. `.layer` now isolates stacking (sheets stack cleanly).
- Save schema 4 (`GG.drama.migrate` wraps `GG.save.migrate`). Bots: `drama.botWeek` (good bot pays 40% when someone is
  upset and fund > $600; both post ads and hire; good re-posts weak batches), avg refuses 45% of ultimatums.
- Balance (`node tools/balance.js 10 12`): avg quits/yr after protection 0.65 (ultimatums 1.09, returns 0.42), good 0;
  year 1 (30 seeds) avg fund min $100 end $383, 273 fans, 0.4 loans (v0.3-equivalent `NO_DRAMA=1`: 85/404/265/0.2);
  good year 1 fund end $887 (was $1,338: members' cut), fans 557.

## What's in v0.5.0 "Signed"
- Eras: garage → local (250 fans) → signed (a deal or a DIY album); world threshold defined but off until v0.7
  (`economy.eras.worldEnabled`). Balance (10y × 20): avg bot Local wk 23, first offer wk 47, signed wk 53, $9.7k at y10;
  good bot signed wk 30, $23.6k at y10.
- Labels (`24_sim_labels.js`, API in its header): Gopherwood / Monolith / DIY offers, recoupable advances (60% held as
  recording budget), demands (cards or a demand sheet), deadlines, drops, fulfilment; studios + producers; sessions
  replace the planner (studio event = Monday card); drum takes by skill or played (gig studio mode); release wizard
  (tracklist, lead single, generated/typed title, procedural cover, release week, promo); reviews (5 outlets, recycled
  patterns penalised), Maple 100, streams, royalties, gold/platinum trophies; Loonies at week 20 (3D red carpet
  `44_render_carpet.js`, outfit card, envelopes, speech). Theatres (tier 3). Signed-era commission + crew costs.
- UI: `59_ui_label.js`, `59b_ui_studio.js`, `59c_ui_awards.js`; laptop Label/Albums tabs; trophy wall + trophies sheet.
- Save schema 5. Tests: sim_labels 15, content 39; pw_label label/studio/awards/sheet
  (`META_ONLY=label,studio,awards,sheet`).

## v0.8 integration (lead, 2026-09-30)
- Merged: KITSIM (sim) + SHOPUI (screens/3D, review-fixed) + CREATOR (worktree) + SPACES polish (4 distinct rooms: parents'
  garage / Rent-A-Riff Jam Space 7 / Prairie Dog Sound / backstage at the Potash Place; van cabins with real seat backs;
  art-critic loop) + main (v0.7.1 3D title, v0.7.2 English titles / layered crowd / heavier metal / double kick).
- Timing root-causes (repro'd with CDP CPU throttling, fixed in the game, not the tests): gig auto notes + second kicks
  booked by a 25 ms timer (not only per frame) against the audio clock; count-in numeral box no longer widens the page;
  fresh timestamp at song start; rival BOTB set + van drive run on wall time (a slow phone played them in slow motion);
  the van clock starts on its first drawn frame; `audio:end` carries `natural` so a song that played out never pauses the
  gig (drift used to pause it at the very end and resume restarted the song) — pw_gig `songend`. Still open: Auto-kick
  plays its own kick on the frame it comes due (can be late on a slow phone).

## What's in v0.8 (sim) — KITSIM, lane A stage 1 (UI = stage 2, SHOPUI; creator = lane B)
- `GG.shop` (`src/2a_sim_shop.js`, API in its header; catalogue `content/shop.js`; numbers `economy.shop`; forced cards
  `GG.content.shopCards` at the bottom of `content/cards.js`). Save schema 9: `10_save` MIGRATIONS[8] + a chained
  `GG.shop.ensure` on every load (fills only missing lane-A fields; old gear.lanes/doubleKick -> gear.owned; the venues in
  `venueLast` become van stickers, banned ones crossed out).
- Gear: toms $450 (lane 5), ride/china $350 (lane 6, needs the toms), double-kick pedal $300; kit quality 0..3 (milk
  crate -> pawn shop $800 -> pro $2,800 Local Heroes -> arena $9,000 World). Gear shows on stage (performance +0..2 by
  tier, +0.25 per lane/pedal), live crowd start (+0..2), new songs (+0..1.5 quality) and studio production (+0..1/week).
- Songs (`21`): extra sections C.EXTRA_SECTIONS live in PATTERN.sections only when owned + used (sanitize/validate/rate/
  generate/toNotes; `sectionsOf, allSections, addSection, removeSection, withExtras, extraBar`). Outro unlocks free after
  3 songs written (Jaxon/Dana chat at the wrap); Solo via Dana's card in Local Heroes (4+ songs; refused -> again in 10
  weeks; auto after 16 weeks without her). rate(): outro/solo count half toward groove, hook +3..4 for a tom fill / ride
  chorus / ending on an outro / a solo after the first chorus (4-lane patterns rate exactly as before). With the pedal, kicks
  on the in-between 16ths are a run, not syncopation (the pedal no longer lowers metal groove). Jams use owned gear.
  Dana's reaction: a solo section makes her happy.
- Gig (`22`): merch sells in applyResult (`r.merch = { sold, earned, boxes, space, items: { id: { hauled, sold, price,
  earned } }, named }`, joins the gig's fund change), a sticker per venue (ban -> crossed out, in `26` afterGig); chart:
  a 'solo' section is Dana's (quarter notes only + the solo cue + crowd +3), an 'outro' ends on a fill window; the two-thumb
  rule holds with 6 lanes + the pedal on every difficulty (tested).
- Spaces: tier by era (jam room Local $60/wk rehearse +8%; pro studio Signed $150/wk + write +1, record +1; arena backstage
  World $300/wk + rest +20%, recover 1); offer card per new tier (`shop_space_1..3`) or `GG.shop.move` any time; rent is in
  `career.upkeep`; 2 wraps with < 2 weeks' rent -> evicted one tier down (`wrap.shop.evicted`). 16 upgrades (4 per tier;
  the curb couch + beer fridge move with you; chemistry/mood perks land every other week).
- Van: minivan -> 15-passenger + trailer $3,500 (Local) -> sprinter $6,500 (Signed) -> tour bus $30,000 (World), 30% trade-in
  x condition (min $150); Part C1 names per band per tier, `renameVan` (28 chars, no markup); space = merch boxes (3/6/9/14),
  comfort 2..5 (trip burnout), wear/breakdown factors (`world.travel`); 7 upgrades (roof rack, cushions, winter tires, block
  heater, tape deck +1 chemistry on long drives, bunks, merch pod).
- Merch: tiers basics (stickers, shirts + genre: metal patches/longsleeves, punk patches/DIY tapes, country trucker hats) ->
  warm in Local (hoodies, toques (winter x1.6), rock tour shirts) -> vinyl (Local + a record out) -> limited (Signed + 5k fans:
  the Lord Abyssus bobblehead, capes; per-band items). Pick the table + prices (0.5..3x suggested), buy boxes up front; the
  van hauls `van.space` boxes round-robin down the table (2 boxes abroad); sales = buyers (crowd^0.65 above 50 x 0.032 x grade
  x fit x superfans x variety) split by appeal x season x price curve e^(-1.6 (p/suggested - 1)); Dale/Wendell/the president
  buy one each (`GG.fans.merchMods`). Unsold stock = the garage box pile (`GG.shop.pile`). The first shirt order comes back
  misprinted (`money_merch_misprint`, moved out of the deck): box it (-> collector's item after 8 weeks + 300 fans: $60,
  appeal 2.5), reprint ($100) or wear them. Other shop cards: the merch table intro, the pawn-shop kit, Baba's church van.
- Audio (`30`): kit quality tiers per C3 (body, sustain, saturation, box/low/high cut, reverb send; peaks < 0.55, arena ~2-6x
  the energy of the milk crate), `kitFor(genre, tier)`, `kitQuality()`, `renderOffline({ quality, .. })` (+ `tail`); the
  outro's last chord rings 2.5 beats past the end (the song waits for it), a solo is the genre's lead over a stripped kit.
- Bots: gear/kit/van/space/upgrades/merch with cushions (big buys keep 8 weeks of bills, never mid-session), shop cards
  answered by value, downsizing when rent bites. Rival set strength cap 87 -> 90 (they buy gear too).
- Balance (10y x 20, before -> after): avg local/offer/signed/world wk 20/39/46/158 -> 22/43/47/155, y10 fans 42.9k -> 43.4k,
  fund $11.1k -> $8.5k, loans after y1 0.10 -> 0.10, quits/yr 0.63 -> 0.53, Sad Dome 8/20 -> 13/20, merch 44% of gig pay
  (net 26%), 6 lanes + pedal wk 67; good 15/27/28/103 -> 16/27/28/101, fans 63.7k -> 67.1k, fund $21.8k -> $19.5k, loans 0,
  Sad Dome 20/20, 6 lanes + pedal wk 34 (y2), sprinter wk 100 (the World era wk 101), merch 38% (net 23%); invariants OK.
- Tests: new `sim_shop.test.js` (16), sim_audio +2 (kit tiers, outro/solo), pw_seq audio +3 (tier renders clean + audible,
  a 6-lane outro/solo song); sim_career/sim_songs/sim_world expectations follow the new gear/van fields.

## What's in v0.8 (shop UI) — SHOPUI, lane A stage 2 (screens + render + integration for GG.shop)
- `src/5k_ui_shop.js` (GG.ui v0.8, API in its header; CSS block `/* v0.8 SHOP */` in 00_shell after the CREATOR block).
  Drum shop `gear` (tall sheet; the kit's sketch pad has "🛒 Drum shop"): kit tiers 0..3 in order, toms / ride / pedal, the
  Outro / Solo rows (how they unlock); every disabled button shows the sim's `why`; a buy plays `GG.audio.hit` on the new
  lane (a fill round the kit for a new kit, audio follows gear.quality) and an open sequencer grows its lanes.
- Merch table `merch` (the merch hotspot; the v0.7 "Coming in v0.8" stub is gone): van haul vs space in boxes, the box pile
  at home, the next gig's estimate, last gig's sales, the misprint status (pending → boxed with weeks/fans progress →
  collector); per item: on the table (toggleTable), a price stepper inside item.range ($1/$2/$5 steps + a price word),
  "Buy N boxes" (1..10, buyStock; the first shirt order comes back misprinted → Dana's tease for Monday). The gig board
  shows "👕 merch ~$X" per flyer and the van's tier / boxes / stickers.
- Garage door `van-info` (57) with tabs Van / Space / Car lot: an SVG van side per tier (rusted minivan, 15-passenger +
  trailer, sprinter, tour bus) with the name on it and a sticker per venue played (banned ones crossed out in red), rename
  (renameVan), driver, condition + Cousin Dale, merch space in boxes (was "space / 5"), van upgrades; Space: the room now
  (rent, perks), rooms around town (move with a confirm, move back), this room's upgrades; Car lot: vans with price −
  trade-in = net (buyVan, confirm).
- Monday cards: `deltas.shop` chips (50 deltaChips → `ui.shopChips`). Gig results (55) + week results (52) show `r.merch`
  in a panel (its "Merch table:" line folds in). The wrap: rent, Outro/Solo + merch unlocks, rent arrears, eviction, the
  collector's item; the collector moment `shop-collector` (full: the box opens, the HALE DAMAGE shirt rises, $60, RARE)
  plays once when the misprint turns (shop:misprint 'collector' / wrap.shop.misprint; "See it again" in the wrap).
- Sequencer (54): tabs from `songs.allSections(gear)` ("+Solo" / "+Outro" until added → addSection; ⋯ removes), off-beat
  cells dimmed in a Solo, arrangement cards keep the extras (withExtras), the Song tab adds/removes them and lists groove
  per part; the guided Write gets Solo / Outro steps when owned (8 steps). 5–6 lanes + 6 tabs fit 390px. Gig (55): 6 lanes
  = 65px each on a 390px phone, keys G / H = toms / ride. Laptop Money tab: merch sold / stock bought, rent.
- 3D: 41 draws the space by `spaceTier` (tiers 1–3 hide the garage-only meshes: drywall, sectional door, pegboard, hockey
  stick, mower, heater, moon shafts, window snow; draw their own walls, floor, door, props + a canvas sign; the banner moves
  beside the door; the door hotspot reads "Door"), all 16 upgrades visible (the disco ball spins, green room paints the
  walls), the unsold box pile (one box per box; the boxed misprint taped with a red X; since SPACES: back-left corner,
  up to 15 + a MERCH sign); debug('render').space. 41's dead v0.7 character code is deleted (R.charGeometry in 40 is the only builder). 43: the
  band's vehicle tier inside (15-passenger rows + hymnals, sprinter high roof + touchscreen, tour-bus lounge) + the newest
  12 stickers on the hood (bus: over the driver's doorway, on the lounge partition); info() tier / vehicle / stickers / banned.
- Review fixes (after SHOPUI): merch cards keep catalogue order (locked last; on the table = the amber .on style only) and a
  second "Buy" tap on the same card within 400 ms is ignored (a double tap bought twice / the wrong item); the catering
  table's walk footprint matches the table; the curb couch is a floral loveseat (0.8 m) and, while it's in the room, the
  laptop / merch stand points step aside (`space.stand(action)`); the MERCH overflow sign stands behind the box pile (tall,
  with a footprint); the backstage BAND ROOM sign follows the loaded band (debug space.signText, space.obstacles); the
  eviction week's wrap rent names the room they left; van side: the name ink suits the paint (light on the minivan / bus),
  7+ letter sticker labels squeeze to the sticker, "+N more" takes the last slot, the car lot paints each vehicle's own
  name (`vanSide(st, { name })`); a long van name wraps in the sheet title; locked shop rows dim all but the why / how;
  the garage-door tabs stick flush to the sheet top.
- Tests: new `tests/pw_shop.js` META_ONLY=gear (30) | merch (24) | space (21) | van (20) + contact sheet
  `tests/.cache/v08_shop_sheet.png`; pw_flow layout expects the merch table on the merch hotspot.
- v0.8 polish SPACES (lead's contact-sheet finding: every rented tier read as the same garage). 41: each tier is its own place
  from the fixed camera, hotspot layout + walk floor unchanged. The garage's signature bits (string lights, wooden top plates,
  baseboards, gravel edge, corner trim, the beat-up couch, the red rug) moved into the garage-only meshes; a rented room hides
  the yard (lawn, weather, lawn chair; the season is still tracked) and re-lights the scene (`MOODS`: hemisphere, key, fill,
  bulb colour + flicker, accent light, background, dust). Tier 1 Rent-A-Riff, Jam Space 7 (strip-mall rehearsal complex):
  painted cinder block (blue band, grey above), grey carpet tiles with stains, egg-crate foam patches (one orange), a buzzing
  wall-mounted fluorescent strip (its own flicker material), a red steel door with a stencilled 7 + wired-glass lite, NO DRUMS
  AFTER 11 PM across the top, other bands' stickers + marker graffiti, plastic chairs, an orange corduroy couch, the kit on a
  grubby mat with neon spike tape; out front the corridor (VCT tiles, bilingual WET FLOOR, the next band's gear, lost + found).
  Tier 2 Prairie Dog Sound: charcoal fabric panels, a wooden QRD diffuser, co-op timber beams (the name on the beam), warm
  planks, the control-room window with the desk / meters / Gwen glowing behind the glass, track lights washing the walls, a
  gear rack, the house gold record ('Curling Night in Canada', 1987), a chesterfield, the kit on a carpeted riser (people step
  up: `space.floorAt`); out front the lobby (the organ + Leslie, a fern, the logo rug). Tier 3 backstage at the Potash Place:
  navy painted block + gold stripe under bare concrete (form-tie holes), BAND ROOM — <band> stencilled, a cable tray, caged
  work lights, stencilled road cases, a monitor showing the empty arena, the bulb mirror, a sad catering table (celery, water)
  until hot catering is bought, a black leather couch, the kit on a black deck with hazard tape; out front the service
  corridor (yellow lines, LOADING DOCK →, NO SKATES, cable ramps, the forklift, the home team's laundry, a cone). The bedsheet
  banner hangs only at home and in the jam room. Every word/picture is one canvas atlas (2048 x 1024 since the review) (decals lit + glow, the corridor
  floor faded out at its edges); light pools are one additive mesh. Seasons: window snow only at home; December lights are
  the tier's own (the jam room's sad strand with dead bulbs, fairy lights on the control-room window, a strand round the road
  cases); the box fan only at home + in the jam room. The box pile moved to the back-left corner behind Marcel's mirror by
  Kenji's crate (three stacks, a staircase up to 15, a MERCH sign rising out of it past that) — clear of every label.
  debug().space adds kind, wall, floor, bg, fixture, hall, hallProps, decals, riser, yard, banner, pileBox, pileSign; debug().labelAt.
  43: the seat backs you stare at got detail (rolled top, bolsters, a ribbed velour insert, seams, a map pocket with a road
  map / ketchup chips, a hoodie slung over the minivan's driver seat, cup holders, the minivan bench's belts + a set list);
  the 15-passenger's church bench (headrest humps over the window seats, pleats, a grab rail, belts, sticks + a phone + a
  double-double on the ledge, a ribbed rubber floor mat), the sprinter's captain chairs (bolsters, quilted channels, a
  seatback pocket with a tablet, headrests on posts, armrests both sides, a cooler + gig bag in the aisle, a vinyl-plank
  floor); each own vehicle's camera sits a touch higher / zoomed in (minivan CAM_MINI, 15-passenger over the bench with row 2
  pulled into view, sprinter over the headrests); the tour bus is unchanged. info() adds cam, hfov. Content: the jam room is
  'Rent-A-Riff, Jam Space 7' (blurb + offer card: cinder block, egg-crate foam).
  Tests: pw_shop META_ONLY=spaces (17: four different room signatures, the kit on the deck, 10 boxes drawn on screen under no
  label on every tier, December in a rented room, draw calls < 60, every cabin's lower third not one flat colour) + sheet
  `tests/.cache/v08_spaces_sheet.png`; van +3 (tiers 0–2: the lower third's top colour ≤ 30%); space: the MERCH sign found
  via debug space.pileSign.
- SPACES review (visual critic on `v08_spaces_sheet.png`): every tier keeps the front-left corridor clear of the merch stack
  (the jam room's next-band gear sits mid-corridor by WET FLOOR, the studio's organ + Leslie stand right of the logo rug, the
  backstage cable ramps stop short and the laundry cart became the band's black drum case, white corners, HAIL DAMAGE / DRUMS);
  the box pile is a staircase along the open left edge growing toward the camera (4 cells + a second column at the front, ≤ 3
  high, white tape band on every box; the misprint's red X on the side we see), Marcel's mirror + his spot moved a step
  forward-right so nothing stands in front of it; near-black clothes in the garage scene lift to #33333d (o.lift) so figures
  with their backs to us keep their shape. Jam room: a wide two-tube fixture high in the middle of the back wall (cool bloom),
  NO DRUMS / AFTER 11 PM big + condensed (canvas-squeezed lettering, no fine print) under the smaller banner, chunky die-cut
  band stickers on the door and over the sign's corners, a GRAVEL KINGS spray tag right of the door; the corridor tiles 35%
  darker + drab, fading out sooner, ending at a low cut wall with the neighbours' steel doors 6 and 8 and a lit EXIT → SORTIE;
  the sad December strand droops over the sign. Studio: bevelled panels (charcoal / slate / burgundy, dark gaps; the right
  wall's run covers the band poster), a stepped skyline diffuser in pale wood under a track light, the gold record on walnut
  (#d4af37 disc, groove ring, label, brass plate), the control-room window a deep reveal (sill, lit jamb, mullion, a glare
  streak) onto a dim blue-grey room with the console's meters + fader caps glowing over the sill and Gwen's silhouette (the
  beam plaque is gone), pale oak planks with thin seams, key/fill/bulb ~30% less saturated, a cool control-room accent, the
  lobby on charcoal carpet. Backstage: BAND ROOM → stencilled between the labels, the band's name big on a placard on its door
  (the star moved up), the arena monitor bigger + brighter on an arm turned to the camera (seating rings, the lit stage, LIVE),
  the forklift's pallet up on its forks with a shrink-wrapped stack. The laptop desk is per tier (cooler / walnut side desk /
  stencilled flight case; the garage's cooler is garage-only) and without the curb loveseat the studio has a black office
  chair, backstage a director's chair. The decal atlas is 2048 x 1024 with a best-fit guillotine packer (the shelf packer ran
  out). Vans (43): every own cabin's headliner is broken up (overhead console + map lights, a CD wallet on the driver's visor,
  a set list in the other, headliner seams; the minivan's sagging bit held up with thumbtacks), front seats get headrests on
  posts + pocket elastic/stitching; minivan: buckets a touch inboard, a backpack slumped on the console, ketchup chips on the
  bench, the hoodie is gone (it read as the driver's torso); 15-passenger: the bench back is three piped cushions with gaps +
  two buckles, thin crossed tapered sticks on the ledge (only the bench's top lip in frame), grab handles; sprinter: a cab
  shelf over the windshield (toque, set lists, gaff tape, laminates), lighter stitched centre panels, cup holders on the
  armrests. Cameras tighter (hfov minivan 42 → 38, 15-passenger 43 → 37, sprinter 44 → 38 and 0.2 forward; look a touch
  higher); the tour bus unchanged. pw_shop spaces: the sheet adds December in the jam room and backstage (spaces_dec_1/3).
- Gaps (shop UI / spaces): the other bands' tier-0 starts (laundromat basement, strip-mall unit, Quonset) still draw the
  parents' garage; the corridor props out front are static (no passers-by, no hockey players); the control-room window is a
  painted picture (no parallax); sticker / graffiti text is only legible zoomed in (colour + shape read at phone size);
  the wall-mounted tube is the jam room's only fluorescent (no ceiling fixture: the camera looks down); the band banner is
  not shown in the studio (no bedsheets at Prairie Dog Sound) or backstage (the door placard names the band); the right wall is
  seen edge-on, so most signature pieces live on the back wall and the floor; the neighbours' doors 6 + 8 are drawn on the
  face of the corridor's cut wall we see (a diorama cheat); the curb loveseat (a bought upgrade that moves with the band)
  still sits by the laptop in the rented rooms; with the tighter minivan camera the buckets' outer halves are off-frame.

## What's in v0.8 (creator) — lane B, CREATOR (Addendum 1 C2; worktree branch, merged by the lead)
- Content `content/creator.js` (`GG.content.creator`): 157 parts in 26 categories (every Part C2 list + a few legacy
  looks kept drawable: short / top bun / gelled spikes, library specs, horseshoe 'stache, sweatband), each `{ id: '<cat>.<value>',
  cat, value, name, gate?, hint?, color? }`; gates `era | fans | milestone | award | gigs` (+ `genreStart`: metal starts with the
  battle jacket, corpse paint, the Viking beard; punk the mohawk, liberty spikes, green dye; rock the Canadian tuxedo, slicked
  back; country the cowboy hat + boots, rhinestone suit, cowbell). Pyro = World era, your own cape = a Loonie, gold sticks =
  a gold record, your face on the kick = platinum. Swatches: 12 skins, eyes, 18 clothes, 12 kit colours. No gong, ever.
- Sim `2b_sim_creator.js` (`GG.creator`, DOM-free, no RNG): unlocks are pure functions of state (week-end hook on
  'week:wrap' → one wrap milestone line "New look unlocked: … (☰ → Look)" + `wrap.creator`; events loonies:result / cert /
  tour:gong / gig:done unlock now → 'creator:unlocked' (UI toast) and the next wrap lists them). New careers: stage look =
  everyday look, `newKit` (milk crates, band logo on the kick); `prepare()` hands the creator's look/stage/kit + carry-over to
  the 'career:new' hook. Carry-over per genre in `gg.v1.unlocks.<genre>` (wrapped storage). Save: chained onto
  `GG.save.migrate` in this module (not 10_save): fills player.stageLook (= look), player.kit (`legacyKit`: the v0.7 kit),
  unlocks (earned quietly + the stool throne) only when missing; never touches `state.v`.
- Render: the character builder moved into `40_render_core.js` (`R.charGeometry`; 41 `makeCharacter` calls it). Legacy LOOKs
  take the verbatim v0.7 path: 1,220 member/rival/recruit/preset/combo geometries hash-identical to v0.7, and the garage +
  stage scenes are hash-identical for a v0.7 player. v0.8 LOOKs draw build/height/age, 4 face shapes, eyes (+ colour), brows,
  noses, mouths, 8 facial hair, 5 glasses, 17 hair styles (hat-aware), 8 tops / 4 bottoms / 5 shoes / 7 headwear, stage
  outfits + extras (cape, studded wristbands, corpse paint), pixel-art tattoos (forearms, sleeves, neck, chest, teardrop,
  REGERTS down the forearm) and knuckle letters (3x5 font, readable in the Hands view), piercings. `R.kit`: shell finishes
  (paint = v0.7, wood, black, sparkle, flames, camo), black hardware, thrones (crates, leather saddle), cowbell, hair fan
  (spins on stage), pyro (arena shows only: capacity ≥ 5,000 / tier 4 / dome / festival / hall; bursts on moments and every
  16 beats when hyped), kick-head art (CanvasTexture: band logo by genre, your face, a moose, custom text), stick colour.
  41 `buildKit` = `R.kit.garage`; 42 kit builders + stage-look selection (drummer + members via `GG.creator.stageLookFor`),
  `info().kit` / `drummerV8`; 44 the carpet uses stage looks (a band outfit card drops your stage outfit).
- Preview `45_render_creator.js` (`GG.render.preview`): its own small WebGLRenderer inside the creator (the main loop is
  paused / has no career there); views full (drag to turn) / face / hands (fists to the camera) / kit.
- UI `5j_ui_creator.js`: screen `look` (full): preview, Everyday ↔ Stage toggle, tabs Body / Face / Hair / Clothes / Stage /
  Ink / Kit, locked parts dashed with a one-line "what unlocks it" note over the preview, knuckle inputs (A–Z, 4 per hand),
  🎲 Surprise. 51: the creator has "✂ Customize" (+ a "Your custom look" card) and the carry-over toggle; ☰ menu → Look.
  CSS block `/* v0.8 CREATOR */` after the v0.7 block.
- Tests: `sim_creator.test.js` 13 (new); `pw_creator.js` META_ONLY=creator (34) | kit (8) | stage (6) + contact sheet
  `tests/.cache/v08_creator_sheet.png`. `_load.js` SIM_SAFE now takes `2\w_` (2a_sim_shop, 2b_sim_creator). Green:
  node suite, pw_flow flow/layout/code, pw_garage, pw_stage, pw_label awards, pw_settings difficulty, pw_rival botb,
  pw_tour gong, pw_gig gig, pw_world van at 390×844; pw_flow flow + pw_creator creator at 440×956 (preload override).
- Gaps: (41's old `characterGeometry`/`hairParts`/`extraParts`/`guitarParts`/`capeParts`/`CAPES` were deleted by SHOPUI.) Formerly dead code (kept to
  avoid touching 41 beyond buildKit; the lead can delete them after the merge). Members have no stage looks of their own
  yet (they fall back to their look). The hair fan doesn't blow your hair. Look changes persist at the next autosave.

## What's in v0.7 (sim) — WORLDSIM stage 1 (UI = stage 2, WORLDUI)
- World era ON (`economy.eras.worldEnabled`) at the Steady threshold (25k fans + a charting record; labels.weekly). Home
  scene stays 40k in World (Canada saturates); each region has its own scene (`world.scene` adds fans abroad).
  World-era home costs: eraUpkeep 50, commission 15%. Abbot Lane (London) opens in World (`labels.studios`).
- `GG.tour` (`25_sim_tour.js`, API in its header; content `content/world.js`; numbers `economy.tour`): 4 regions (C6 cities
  with x/y pins, region `pin` on the world map, `canadaPin`), 43 parody venues (Mudstonbury Jun, Wackelstein Open Air Aug,
  Summer Sonicboom Aug, Big Day Inn Jan, Siberian Frostfest Jan by Baikal, Budokhan Hall, the Finnish National Moose Opera),
  17 preset packages (per region: showcase once, 2 tours, 1–2 festival tours whose festival stops fix the departure week),
  8 rentals, 3 stays, 3 extras. Unlock at `threshold` = region.fans × (1.6 − genre fit) (×1.08 if the rival broke it first)
  OR an invite (festival slot/showcase: story card, half flights for 10 weeks) OR "big in one place" (a song blows up).
- Booking: flights (region $ × members + you + fill-ins) + rental + extra up front, hotels weekly; departs next Monday;
  never over the Loonies week, the Sad Dome, a studio session or the career end; `cancel` before departure.
- On tour (`away`): Monday = departure (jet lag) + this stop's show (open dates book from the regional board via the Book
  pick or auto best); region Monday cards (75%) or quiet, never the home deck; no home offers/showdowns; blocks map
  write→rehearse (hotel room, 70% gains), hustle→rest, book→promote (region fans); homesickness +15/wk (stay, low moods),
  −6 per rest, −12/wk at home; ≥45 mood drag, ≥70 forced first-block rest, ≥75 the homesick card (fly home early), ≥80
  burnout; members call home (chat tone 'home'). Gigs: crowd = walk-ins + region fans + buzz×fit (+ festival slice, hall),
  flat fee × payMult, new fans toward the region scene; rental travel (burnout by comfort, breakdowns), no Moose Hearse wear.
  Japan (not Osaka): silent crowd (meter frozen per song, reaction + 'applause' at the end, no boos/mosh). Region road cards.
- Calendar abroad: `seasonIn(region,w)` (Australia reversed), `seasonAt(state)`, regional climates/temps + city offsets,
  regional holidays replace Canada's (hanami, Golden Week, Bonfire Night, Novy God, white nights, Aussie Christmas…).
- Story: the Japanese fan-club president (Emiko Tanabe; first Japan week: card, gifts, Japan shows, comments), big in one
  place, the rival breaking regions (`state.tour.rival`), the Moose Opera (mooseAlbum ready/finland → Nordic Moose Run →
  Helsinki → `flags.mooseOpera = 'platinum'`, trophy `platinum_fi`, card `wt_moose`), the Global Gong (week 22, World era,
  nominated with a broken region or a festival; trophy `gong` + $5k), regional charts view. Save v7→v8 (`GG.tour.migrate`).
- Balance (10y×20, before → after): good world wk 103 (y5) → 103; avg 158 (y7) → 158; good y10 fans 48.7k → 63.7k (15.6k
  abroad, 5.2 tours, Gong 1.7 wins), fund $25.4k → $21.8k, Sad Dome 20/20 → 20/20, cracks 18 → 17; avg fans 39.5k → 42.9k,
  fund $11.7k → $11.1k, 2.1 tours, Sad Dome 13/20 → 8/20 (v0.6.1 had 9), quits/yr 0.64 → 0.63; invariants OK.
- Tests: `sim_tour.test.js` 17 (new); sim_calendar/sim_labels/sim_fans/content updated for World; pw_fans expects "Japan".

## What's in v0.7 (UI) — WORLDUI stage 2
- World map (`world`, full; laptop World tab + planner button "Plan a world tour 🌍"): a stylized world (Canada + the four
  regions, no USA), flight arcs, region pins with lock state (Open / Invite! / 🔒 fans needed / Soon), a card per region
  (genre fit, season, fans here vs breaks-at, threshold progress, broken / big / rival chips), status strip (none / booked
  + cancel / on tour + homesick). Region screen (`tour-region`): SVG regional map with city pins (festival grounds amber,
  the route dashed), tapped city's venues, season + holidays + flight cost chips, the packages. Package picker
  (`tour-pkg`): rental / stay / extra with prices, live GG.tour.quote (route, flights, rental, hotels, extra, upfront,
  estimates), Book (departs next Monday) or why not.
- On tour: departure Monday = the flight moment (plane arcs over the world map; jet lag, the rental waiting); region
  cards carry a region strip; the planner shows the stop + homesick bar and only rest / promote locally / hotel-room
  rehearsal (forced rest locks slot 1); an open date opens the regional board (region map, its clubs, the rental strip);
  the wrap shows hotels, homesickness, members calling home (chat tone `home`), unlocks, invites, broken regions, big in
  one place, the Gong, the homecoming (`tour-home` recap sheet: shows, best night, fans, fees vs costs, net).
- 3D: rentals + regional scenery in the van (UK & Europe hedgerows/castles/cottages/sheep, Japan neon streets/blossoms/
  vending machines, Australia red outback/roadhouses/termite mounds/kangaroos, Russia birch taiga/izbas/onion domes/a bear;
  the tiny European van packs the band three abreast with gear to the roof, its own camera; rail passes run on rails,
  faster). Festival stages (Mudstonbury/Wackelstein mud + tents + a flying welly, Big Day Inn sun, Summer Sonicboom
  beach, Siberian Frostfest snow + pines + frozen Baikal), Budokhan Hall (tiers, ring of lights), the Moose Opera's
  antler chandelier; a silent (Japanese) crowd stands still during songs, claps then bows on 'applause'.
- The Global Gong ceremony (week 22, nominated): the v0.5 red carpet reused in Amsterdam (marquee "The Global Gong"),
  envelope = GG.tour.runGong, winner, a speech (loonie-card), after-party; the Moose Opera moment after the wrap.
- Fixes: 42_render_stage `G/band/members/flags/player` were swallowed by a comment in the WIP (every stage build threw);
  a legacy v0.1 `kind: 'hall'` still maps to a Canadian kind (world stages come only from venue ids / flags).
  Driver lines in the flight/board/homecoming follow `GG.world.driver` (you drive if the driver quit).
- Existing flows: laptop now has 8 tabs (pw_fans bandbook, pw_rival scene updated).
- Tests: `pw_tour.js` META_ONLY=map (24) | tour (28) | gong (13), default also writes the contact sheet
  `tests/.cache/v07_sheet.png`.

## What's in v0.6.2 "Two thumbs" (owner feedback: chords + songwriter)
- **Two-thumb rule** (`22_sim_gig`): every difficulty caps a moment at 2 judged notes (kick > snare > cymbal > toms >
  ride > hat; `gig.THUMBS`, `gig.THUMB_PRIORITY`; all DIFFICULTIES `chord: 2`). Dropped hits go to `chart.auto`
  (not judged, never a miss, not in total/accuracy). The live gig plays them via `GG.audio.hit(lane, ctxTime)` scheduled
  `lat + 0.15 s` ahead at `G.zero + t` on a healthy audio clock (frame-due fallback when free-running) and draws them as
  dashed ghost gems + a small ring. Free-style windows untouched. Hard/Expert stay harder via density + speed.
- **Groove presets** (`content/grooves.js`): 5–6 named one-bar beats per genre with a one-line description (metal
  Headbanger*, Blast beat, Thrash skank, Half-time doom, Gallop + Double-kick run locked until the pedal; punk Punk skank*,
  D-beat, Four on the floor, Buzzsaw 8ths, Hardcore two-step; rock Rock backbeat*, Half-time, Shuffle, Four on the floor,
  Bleacher stomp; country Train beat*, Two-step, Waltz feel, Brush shuffle, Hoedown; * = signature, Groove ≥ 70) +
  4 one-tap mods per genre (More metal/punk/rock/twang, Make it catchier (chorus only), Simpler, Busier) as op lists,
  tempo labels (metal Doom crawl/Headbang/Mosh/Thrash/Blast …) and per-step coach lines (picked by member role).
- **Guided Write flow** (`54_ui_sequencer`, default; `settings.songwriterMode` 'guided'|'advanced'): Verse → Chorus
  (contrast hint) → Bridge (preset cards + tweak buttons showing Groove/Hook/Difficulty before → after) → Tempo (big
  BPM + label + slider) → Song order (Short/Classic/Epic cards) → Name (Marcel's reroll or type) → Save; Back / ▶ Play /
  Next on every screen, "Let the band jam one" still in the header. "Advanced ⚙" opens the grid (remembered); the grid's
  Song tab has "Guided steps" back. The kit sketch pad and catalog view always use the grid.
- Tests: sim_gig two-thumb test (20), content grooves test (47), pw_seq new `guided` section (23; seq 34 checks the
  Advanced switch + memory), pw_gig gig (29) checks auto notes play + are scheduled ahead. Sheet: `tests/.cache/v062_sheet.png`.

## What's in v0.6.1 (world) — Addendum 1 C1/C6/C7 (WORLD agent, lane B1)
- Calendar `src/28_sim_calendar.js` (`GG.calendar`): two weeks per month from July, C.SEASONS (winter 11–16, spring 17–22,
  summer 23–4, fall 5–10; world/garage/van seasons follow it), weekly weather per season + city climate (coast/north) from
  its own seeded RNG (`weatherAt` pure; `state.weather` cached Mondays; never cancels a gig), holidays (Canada Day 1,
  Thanksgiving 7, Halloween 8, Remembrance 9, Grey Mug 10, Christmas 11–12, NYE 12, St. Paddy's 18, Loonies 20).
  Effects: outdoor turnout by weather (`shape`), crowd/score/fans via `gigMods` (folded into `GG.drama.gigMods`), road
  risk/wear/burnout (`roadMods`: winter ice, spring potholes, blizzards, hail), genre-season fit (metal owns winter,
  country/punk the summer; doubled x1.5 at their rooms), venue availability (`venueOpen`: seasonal/holiday rooms, no
  skate parks in winter, no Legion on Remembrance Day), holiday pay/weights (NYE x2 floor, pub + party circuits), holiday
  Monday cards (`holidayCard`, priority order; guilt Thanksgiving if you owe, Halloween costumes -> flags.costume, the
  label's Christmas single, the Grey Mug halftime once in Signed with 20k fans -> next Monday +5% fans + trophy
  'greymug'), season news lines, season cards (cabin fever, frosh week, hail season, the festival lineups).
- Rings (`content/map.js` rings + city.ring): Sask (+ Humboldt, Gravelbourg, Estevan), the West (Local Heroes), East &
  North (Signed); `world.ring/ringOpen/cityOpen`; ≤1 far listing a week (`economy.world.farListings`); long hauls taper
  burnout (`burnoutTaper`, `burnoutMax` 30) and cap breakdown km (`breakdownKmCap` 400). 37 new rooms:
  parody venues per ring city (Frostbite Lounge, Commandant Ballroom, The Hoofprint, Messy Hall, …) + seasonal/holiday
  rooms (Canada Day bandshells, fair grandstand, stampede beer gardens, frosh bowl, harvest dance, potash Christmas
  party, the Bassborough NYE ballroom, Paddy O'Furniture's). Venue fields: outdoor, season, weeks, holiday.
- Drivers (`content.drivers`, `world.driver/driverMods/syncDriver/driverFor`): Kenji (breakdowns x0.5, cactus), Moth
  (free repairs, comfort −2, laundry), T-Bone (safe x0.6, slow, cassettes), Earl (slow, +2 chemistry on long drives,
  atlas), you (x1.15 breakdowns, +25% road cards). Driver quits/poached -> you drive (drama hook + chat), returns -> back.
  Road cards: Kenji-at-the-wheel cards gated `driver:['kenji']`; new gates driver/weather/holiday; 15 new cards (deer on
  the Yellowhead, the fight over shotgun, cape in the sliding door, whiteout on the Trans-Canada, hail, heat, frozen van,
  construction, mosquitoes, Christmas lights, long weekend; you-drive: wrong turn, gas-station argument, lead foot, music).
- UI: HUD calendar strip (`hud-cal`, month · season · weather °C · holiday; week-chip toast explains it); board calendar
  line (`board-cal`), ring tabs (`ring-<id>`), locked-ring teaser (`ring-locked`), tag chips (`board-tag`); van header
  weather + driver (`van-weather`), van sheet driver panel (`van-driver`), 2D windshield weather + cactus; 3D van: setTrip
  { weather, driver, dashboard } (blizzard whiteout, hail, heat haze), you ride shotgun / drive, band behind, gear + merch
  piled behind, dash item; garage decor (window snow in winter, Christmas lights in December, box fan in July / heat).
- Save: v6 -> v7 (`GG.calendar.migrate`: weather; van.driver via world.migrate); `state.v = 7`.
- Tests: node sim_calendar 15 (new), sim_world 19, content 42 · pw_world calendar (19; screenshots hud_calendar.png,
  board_rings.png, van_driver.png) + board 14 + van 13.
- Balance (10y x 20): avg local wk 21 / offer 38 / signed 42 / world-ready y7; good 15 / 26 / 27 / y5; Sad Dome avg
  9/20, good 18/20; quits 0.58/yr; loans after y1 avg 0.10, good 0.05 (before: 23/46/49/y7, 17/29/30/y5, 11/20, 20/20).

## What's in v0.6.1 (fans) — Addendum 1 C5 (FANS agent, lane B2)
- `GG.fans` (`29_sim_fans.js`, API in its header; content `content/bandbook.js`; numbers `economy.fans`). Own seeded RNG per
  roll (seed + week + salt + post counter), never the career RNG. Events `fans:post|viral|scandal|gift|club`.
- Bandbook: every Promote block posts automatically (kind from band state: gig announcement, song teaser, rehearsal clip,
  behind the scenes, meme) → buzz, fans (one global count) and streams of the newest release. Small viral chance
  (weirder kinds likelier): good, or the wrong kind (Marcel's "Abyssal Two-Step" dance tutorial: buzz up, his mood down,
  haters up). 2–4 sentiment comments per post + Tundra Wraith's supportive comment on every post; Dale/Wendell/haters comment.
- Fan types `state.fanTypes {super, casual, hater}` = shares of `state.fans`; drift weekly (superfans with chemistry and a
  happy club, haters with fame and scandals). Superfans follow on tour (`gigShape`: crowd/buzz only; merch is v0.8).
- Named superfans `state.superfans`: Dale from Warman (every show: crowd line + comments; his macaroni portrait of Kenji
  via a card), Big Wendell the jumper-cable trucker (met via a fan card after long hauls), Japanese fan-club president
  reserved for v0.7 (shown locked).
- Scandals → choice cards next Monday (`scandal_turf`: Marcel's lawn is artificial turf, and more); fan cards are forced by
  `GG.fans.forcedCard`, never drawn. Fan mail + gifts (`state.gifts`) weekly by chance; garage shows the portrait by the gig
  board, a gift pile (1/3/6 boxes) and a letter stack.
- Patreeon (`state.fanClub`, Signed era; tiers Drumstick $3 / Snare $8 / Full Kit $20): members from superfans × happiness;
  a weekly exclusive post (Bandbook app) keeps them happy; payout every second week (12% platform cut).
- UI: laptop tab "Bandbook" (7 tabs in two rows) → `GG.ui.bandbookPanel` (`5g_ui_bandbook.js`): Feed / Fans / Patreeon.
- Save: `GG.fans.migrate` chained onto `GG.save.migrate` fills missing fields idempotently.
- Tests: `sim_fans.test.js` 14, `content.test.js` 46, `pw_fans.js` bandbook 19 / fanclub 13; `pw_rival` scene now expects
  7 laptop tabs. Balance (10y×20): avg LH/offer/signed wk 20/39/46 (was 21/38/42), good 15/27/28 (15/26/27), world-ready
  y7/y5 unchanged, avg y10 fund 11.7k (8.9k; Patreeon), quits/yr 0.64 (0.58), Sad Dome 13/20 & 20/20 (9 & 18).

## What's in v0.6.1 (settings) — Addendum 1 C4 (SETTINGS agent, lane B3)
- `11_settings.js` (node-safe): `GG.prefs` (get/set → 'settings:changed', profile/setProfile, offsets, setCalib,
  calibCompute, CB_COLOURS) and `GG.difficulty` (of/mul/add/text; wraps `GG.save.migrate`: missing = 'normal').
  Settings defaults live in `GG.save.SETTINGS_DEFAULTS` (10_save; only changed keys are stored): gigDifficulty, noteSpeed,
  noFail, autoKick, audioProfile, calib {speaker|headphones: {audio, visual, at}} (ms), calibSeen, lefty, colourblind,
  bigText, reducedFlash, cameraShake, graphics (low|med|high, default high = the old look), skipVan, fastAnim.
- Career difficulty (`state.careerDifficulty`, picked on the creator screen, locked): multipliers `economy.difficulty`
  read only through `GG.difficulty` — start fund, gig pay (applyResult), hustle cash, upkeep, bandmates' mood losses
  (drama), rival skill + how badly their off nights go, label advances + goodwill losses. Chill: +20% pay, −15% bills,
  moods fall 35% slower, rival −5; Brutal: −15% pay, +20% bills, moods fall 40% faster, rival +4 and rarely off.
- Gig: `GG.gig.DIFFICULTIES.expert` (windows ×0.8, misses ×1.3, faster scroll); session opts `noFail` (crowd floor 20,
  no boos/drinks) and `autoKick` (kick notes play as Goods; kick taps ignored); results carry `difficulty` + `assists`.
  55: note speed scales the scroll; lefty mirrors drawing/touch/keys; colourblind lane colours; the active profile's
  audio offset is subtracted from taps and the highway draws (visual − audio) ahead (v0.5.1 clock untouched).
  Setlist sheet: Expert, speaker/headphones quick switch, assists line → Settings.
- `5h_ui_settings.js`: 'settings' (title ⚙ + ☰ menu), 'calib' (auto once on first launch, skippable; eight clicks on
  the AudioContext mapped to performance time once, then the flashing light; saved per profile), 'practice' (any song at
  50/75/100%, studio mode on a shadow state: nothing saved) from the laptop Band tab, Settings and the kit's sketch pad.
  `<html>` classes gg-big / gg-calm / gg-fast; 40 `R.prefs()` (pixel ratio 1/1.5/2, crowd 40/70/100%, calm, shake);
  42 calm = no strobing washes or hit flashes; 57 skipVan / fastAnim.
- Tests: sim_career +2, sim_gig +4, save (defaults), new `pw_settings.js` (settings 44, calib 14, difficulty 17).
- Gaps: no camera shake exists yet (the toggle is a hook for later scenes); the first-launch calibration is skipped under
  automation (navigator.webdriver) unless `?calib=1`; kit practice is a button injected under the sketch pad (54 is lane A's).

## What's in v0.6.1 (audio) — Addendum 1 C3 (AUDIO agent, lane A)
- `30_audio.js`: per-genre generated band (genre kit tuning in `content/genres.js`, metal doom/chug/tremolo kept), a
  random key per song (seeded by song id), section density (sparse verse, full chorus, stripped breakdown, solos),
  formant vocal hits on the beat grid; a convolver per room class picked by the venue; crowd bed following the meter +
  cheers/boos on 'crowd:moment'; garage hum, van road noise, van radio (your charting singles); 4-bus mixer
  (settings.mix) + sequencer metronome (♩ in the sequencer header, settings.metronome); settings.brushes (country).
- Settings screen: mixer sliders, metronome and brushes toggles drive GG.audio (VERIFY wired 'settings:changed').
- Tests: new `sim_audio.test.js` (10); `pw_seq.js` audio 38, seq 31. Nobody has listened to it yet (offline renders only).
- Gaps: kit quality tiers v0.8; v0.2 gear upgrades have sounds but no shop; garage hum waits on a 1 s scene poll.

## v0.6.1 verify (Stage C)
- All node + pw suites green at 390×844; flow/layout/gig e2e/touch also green at 440×956 (scratch viewport override).
- Integration fixes: 'settings:changed' (mix/metronome/brushes/muted) → `GG.audio.applySettings()`; Brushes toggle in
  Settings; toasts/sheets/scrim start below the new calendar strip; week chip `W12/24` no longer ellipsizes at 390;
  "🔊 Speaker" label fits; Kenji's dash cactus 1.7× so it reads. Contact sheet `tests/.cache/v061_sheet.png`.

## What's in v0.6.0 "Rivals" (stage 1 sim + content, stage 2 UI done)
- Rival sim (`23_sim_rival.js`, API in its header): Tundra Wraith run a parallel career (fans chase `economy.rival.fansCurve`
  × momentum from the head-to-head record; buzz; garage → local 250 → signed 1,100 with Monolith; one record a year timed
  before the Loonie nominations, charting on the Maple 100 and shown in `labels.chartView`). Every roll is seeded by career
  seed + tag + week: the career RNG is never touched. Set strength = 87 − 37·e^(−week/66) + form (± streaks) + crack penalty.
- Heat 0..100 (start 12): + per clash (`economy.rival.heat.clash`), −max(0.4, 2.5%)/week; above 25 it feeds buzz to both
  bands; the weekly showdown chance = 0.1 + 0.0035·heat (min gap 3 weeks, per-kind cooldowns, gates in `economy.rival.kinds`).
- Showdowns (`state.showdowns`, SHOWDOWN + id/name/rival/lines): **botb** = a Monday gig offer (`offer.showdown`, prize by
  era, winner steals 3% of the loser's fans; their set score deterministic per week), **sameNight** = your gig that weekend
  loses crowd by buzz share (door pay + fans follow), **stolenSlot** = the best board listing at a venue that doesn't love you
  is taken (`listing.stolen`, unbookable; rep 3 venues turn them down = a win), **festival** = a summer board listing
  (festival grounds in `content/rivals.js`, they headline; outplay them for bonus fans + buzz), **loonies** = co-nominations
  (won if you beat them in ≥ 1 shared category; rival Loonie strength = their records/skill/fans + an award-darling bonus),
  **poach** = a forced Monday card for an unhappy member (stage ≥ 2, not protected): a bonus / the spotlight keeps them,
  the gamble can lose them to the rival (member act `poach`, `stats.poached`), **final** = year 10 week 21, the Sad Dome
  (Calgary, 620 km) is booked on Monday (+ a "Sad Dome eve" card); your score vs theirs → `state.finalShowdown`
  `{ week, won, headliner: 'you'|'rival', score, rivalScore, rival }` (auto-resolved at the wrap if it wasn't played).
  Unplayed showdowns close at the wrap with news (forfeit, missed festival, quiet same-night).
- Cracking (net 7 wins, ≥ 9 wins, heat ≥ 30, from year 2): breakup / rebrand (new name, `{rival}` token follows) / opener
  (they open for you: extra crowd now and then); a crack card next Monday; heat resets. Defectors (v0.4 + poached) join
  their lineup in corpse paint (`rival.members[].defector`).
- Content `content/rivals.js` (`GG.content.rivalry`): Gord "Grimnir" Penner (vocals) + Sheila "Hexenfrost" Wiebe (guitar),
  Darryl "Vorthul" Klassen (bass), Lorne "Frostgrave" Dueck (drums): looks + `corpsePaint`, gags, 14 songs, 12 records, 5
  rebrands, news pools, showdown texts (UI cards + verdicts), 5 rival cards, 14 scene bands, 3 festivals + the Sad Dome.
- Hooks: career (newCareer init, startWeek → `rival.monday` after the board refresh, resolveCard → `afterCard`, settleGig →
  `rival.shape` before applyResult, endWeek → `rival.weekly` → `wrap.rival`, botWeek → `rival.botWeek`, cardById, `{rival}`),
  drama (forcedCard → `rival.forcedCard`, act `poach`), labels (rivalStrength, rivalName, runLoonies values + `rival.loonies`,
  chartView), world (canBook skips stolen listings, a cracked rival stops headlining), gig (`gig.venue` finds rivalry venues).
- Save schema 6 (`GG.rival.migrate` wraps `GG.save.migrate`: a missing rival is created and caught up quietly).
- Balance (`node tools/balance.js 10 20`, new columns sd/sdW/heat/rvF + a rival line): avg bot 3.3–4.7 showdowns/yr
  (y2+) at heat 20–69, wins 30–56%, never cracks them, headlines the Sad Dome 11/20; good bot 2.5–4.5/yr, wins 64–82%,
  cracks them 19/20 (y3–9), headlines 20/20. Loonie wins ≈ v0.5 (avg ≈ 3.5/career). y10 avg fans 36.1k→37.3k, fund
  $9.7k→$11.6k; good 43.9k→47.9k, $23.6k→$25.7k (prizes, the Sad Dome, heat buzz). Tests: sim_rival 15 (new).
- UI (`59d_ui_rival.js`, API in its header): laptop **Scene** tab (rival card + head-to-head, heat meter + showdown odds,
  Sad Dome countdown/result, top-10 scene leaderboard, news, recent showdowns, lineup with gags/defectors, their records);
  Monday **showdown sheet** after the card (BotB Enter/Pass, same-night split bar, stolen slot verdict, festival → board,
  Sad Dome); rival cards get a rival strip (poach: the member's mood) and `ui.who('wraith_frontman'|'tw_*')` = the cast;
  **showdown weekend** (`ui.playShowdown`, from `main.playWeekend`): BotB/festival/final show **their set first** (screen
  `rival-set`, live3d: `render.stage` spectator camera on a riser in the crowd, their lineup in corpse paint + black stage
  shirts, their drummer on the throne, a banner, ticking per-song scores, their drummer plays the pattern, skippable) →
  your live set (score to beat in the gig bar) → **verdict** (`rival-verdict`; also after a same-night split). Board
  badges (stolen/defended/festival; stolen = "Taken" and unbookable), wrap rival panel (+ crack panel), end-screen Sad Dome
  line, rival rows on the Maple 100. `GG.ui.showdownViews` (default: on unless `gigAutoplay`) keeps autoplay flows fast
  (toasts instead). The van to Calgary shows "Saskatoon → Calgary" (world.startTrip: off-map cities keep their name).
  Tests: `pw_rival.js` META_ONLY=scene|botb|final (+ contact sheet `tests/.cache/v06_sheet.png`).

## APIs (full shapes in `src/02_contracts.js`)
- `GG.shop` (v0.8, header of `2a_sim_shop.js`): `cfg, content, init, ensure, migrate`; gear `gearItems, gearDef, gearName,
  ownsGear, canBuyGear, buyGear, kitTiers, kitDef, canBuyKit, buyKit, ownsSection, unlockSection, gigBonus, writeBonus,
  crowdBonus`; spaces `spaces, spaceDef, availableTier, canMove, move, rent, perks, perkFactor, upgrades, upgradeDef,
  canBuyUpgrade, buyUpgrade`; van `vans, vanTierDef, vanName, vanQuote, canBuyVan, buyVan, renameVan, vanUpgrades,
  vanUpgradeDef, canBuyVanUpgrade, buyVanUpgrade, vanMods, stickers, sticker, banSticker`; merch `merchDef, merchItems,
  merchView, tierUnlocked, unlockMerch, setTable, toggleTable, setPrice, priceOf, priceRange, stockCost, canBuyStock,
  buyStock, pile, hauling, priceCurve, sales, demand, estimate, gigMerch, misprint`; week `forcedCard, afterCard, apply,
  weekly (wrap.shop), cards, card, effectText, botValue, botWeek`. Buys return `{ ok, cost, deltas }` or `{ ok: false, why }`.
  Events `shop:buy|unlock|move|rename|sticker|misprint|merch`. `GG.fans.merchMods(s, r)`; `GG.songs` extras above;
  `GG.audio.kitFor/kitQuality/qualityFor`. Debug `GG.debug('shop')`.
- `GG.ui` v0.8 shop (header of `5k_ui_shop.js`): `openGear(), openMerch(), showVan(tab 'van'|'space'|'dealer'), vanSide(st, { tier, stickers }),
  vanUpgradesPanel, spacePanel, dealerPanel, shopChips(deltas.shop), merchResult(r.merch), isMerchLine, shopWrap(w), shopWrapShown(w),
  playCollector(done)`. Screens `gear`, `merch` (tall sheets), `van-info` (tabs), `shop-collector` (full). Debug `shopui`.
  Render: `GG.render.van.setTrip({ tier, stickers })`, debug('render').space.
- `GG.creator` (v0.8, header of `2b_sim_creator.js`): `cats, part, partsIn, partFor, parts(state, cat?), isUnlocked, gateMet,
  gateText, draftState(genre, carry), grant, checkUnlocks, check(state, source), weekly(state, wrap), knuckles, headText, isV8,
  sanitizeLook, expand, syncPerson, stageOnly, lockLook, stageLookFor(who, contentMember?), legacyKit, newKit, sanitizeKit,
  lockKit, kitLook(player), isArena(venue|gig), prepare, pending, init, migrate, apply(state, { look, stageLook, kit })`,
  `carry.{key, read, write, count}`. Events 'creator:unlocked' { ids, names, source }, 'creator:changed' { state }.
  Render: `R.charGeometry(ctx, L, o, raw)`, `R.kit.{norm, hardware, sticks, has, shell, throne, cowbell, fan, fanBlades, flame,
  pyroBase, headArt, disposeArt, garage}`, `R.pixelFont`, `GG.render.preview.{mount, set, turn, unmount, info}`.
  UI: `GG.ui.openLook({ mode: 'new'|'career', look, stageLook, kit, genre, band, carry, onDone })`; debug 'creator', 'creator-ui'.
- `GG.tour` (v0.7, header of `25_sim_tour.js`): lookups `regions, region, cityDef, cities, venue, venues, vehicles, stays,
  extras, climate, fit, pkg, departWindow, legKm`; state `init, ensure, migrate, threshold, unlocked, unlock, invite`;
  views `map, regionView, status, summary, charts, gong, packages`; booking `quote, canBook, book, cancel`; the week `active,
  away, here, stop, regionOf, abroadFans, monday, forcedCard, afterCard, fillText, blockId, allowedBlocks, block, beforeGig,
  listings, makeGig, estimate, draw, silentCrowd, shape, afterGig, travel, startTrip, roadCardOk, weekly, rivalWeekly,
  runGong`; bots `botWeek = botTour, botPlan`. Events `tour:*` (see header). `GG.calendar` + `seasonIn, seasonAt`.
- `GG.ui` v0.7 (header of `5i_ui_tour.js`): `openWorld()`, `tourRegionMap(st, region, {sel, route, counts, onSel, testid})`,
  `worldPanel(st)` (laptop World tab), planner hooks `tourBlocks, tourAct, tourForced, tourPlanHead, tourOpenDate`,
  `tourCardNote(st, card)`, `tourBoard {on, title, map, strip}` (56 board), `tourWrap(w)` (52 wrap), moments
  `flightDue/playFlight(done)` (60 beginWeek), `gongDue/playGong(done)` (60 wrapWeek, before endWeek), `playMoose(done)`.
  Screens `world`, `tour-region` (full), `tour-pkg` (sheet), `tour-flight` (full), `tour-home` (sheet), `moose-opera`
  (full), `gong` (full, live3d). Debug `tourui` {gong, mooseDue, flown}. `GG.render.stage.info()` + `dress, silent,
  bowing`; `stage.moment('applause')`; `van.setTrip({ region, look })`, `van.info()` + `region, look`;
  `carpet.setup({ sign })` + `info().sign`.
- `GG.rival` (v0.6, header of `23_sim_rival.js`): `init, migrate, get, cfg, cast, cards, venue, name, skill, heat, addHeat,
  record, lineup, leaderboard, weekly, monday, pending, schedule, next, forcedCard, afterCard, enter, pass, botWeek,
  showdown (UI setup), setScore, resolve, shape, loonies, strength, chartEntry, crack, final`. Tunables `economy.rival`.
- `GG.career`: contract commands + `choiceHint, rollChance, gatePasses, applyEffects, cardById, band, memberName,
  pickLine, contentLines, botWeek, botOffer, postChat(state, who, text, d, tone)`. startWeek/runWeek/endWeek are
  double-call safe. v0.4: effect keys `member`, `payCut`, `repay` (runtime-added to EFFECT_KEYS), token `{recruit}`,
  `state.card.who/whoName` on forced drama cards, cardById also finds drama + quirk cards.
- `GG.drama` (v0.4): `weekly, forcedCard, afterCard, applyMember, roles, holder, holes, openHoles, lineup,
  fillInFigures, payCut, setPayCut, split, fillInCost, gigMods, want, gripeText, stageText, postAd, repost, cancelAd,
  hire, candidates, candidateScore, hireFillIn, dismissFillIn, quirk, traitDef, rivalBlurb, makeLook, botWeek,
  botCardChoice, botValue, migrate, cards, cfg`. Tunables `economy.drama`; content `drama.js`, `recruits.js`.
- `GG.gig` v0.6.2: `chart(song, {solo, extras, free, difficulty, thumbs:false = raw})` → `{notes, auto, total, ...}`;
  `THUMBS` (2), `THUMB_PRIORITY`. v0.7.2: `DOUBLE_GAP`, chart `doubles` + opt `doubles: false`, NOTE `dbl, t2, hitT`
  (CHART/NOTE shapes in 02_contracts); `GG.render.stage.kick2()`.
- `GG.gig`: `makeGig, randomOffer, autoResolve` = `simulate(state, gig, rng)` (pure) + `applyResult(state, result)`
  → v0.3 replaces `simulate` with the rhythm game and keeps `applyResult`. Also `bookLocal, venue, fit, qualifying,
  performance, gradeFor, payFor`.
- `GG.songs` (v0.2): `rate(p, genre, gear) → {groove, hook, difficulty, notes, tips, sections}`, `verdict, validate,
  sanitize(p, gear, genre), generate(genre, rng, {gear, wild, arrangement}), starter, signature, patternFor(state, key),
  similarity, toNotes → [{beat, lane, section, entry, bar, step}], beats, seconds, create(state, p, title, opts), jam,
  addStarter, pickTitle, ability, byId, score, best, polish, played(state, ids, grade) → new classics, weekly,
  reactions, kickBlocked, setHit, isHit, blankSection, ARRANGEMENTS, ARRANGEMENT_IDS, arrangementId, genre(id)`.
  Tunables: `economy.songs`; genre data: `content/genres.js`; lines: `lines.songReactions`, `lines.writeTips`.
  v0.6.2: `grooves(genre)` (content/grooves.js), `presets(genre, gear)` → `[{id, name, desc, signature, pedal, locked, bar}]`,
  `applyPreset(p, section, id, gear, genre)`, `presetOf(p, section, genre, gear)`, `modify(p, section, modId, gear, genre)`
  → `{pattern, before, after}` (pure), `tempoLabel(genre, bpm)`.
- `GG.save`: `write, read, readRecord, list, remove, autosave, toCode, fromCode, migrate, storageOk, settings,
  saveSettings, init, KEYS, compress/decompress`. Keys `gg.v1.slot.<auto|1|2|3>`, `gg.v1.settings`.
- `GG.render`: `init, available, setScene, syncState, setPaused, goToHotspot, hotspotScreenPos, memberScreenPos,
  setViewInsets({top,bottom}), pickAt, worldToScreen, playerScreenPos, isPaused, defineScene(name, factory),
  buildCharacter(look, opts)`. ~26 draw calls. Later scenes (stage, van, red carpet) register via `defineScene`.
- `GG.ui` (50_ui_core toolkit): `define, show, close, closeAll, replace, top, isOpen, hasFull, confirm (Promise), toast,
  bubble, tabs, bar, deltaChips, avatar, el, btn, pick, rng` + week helpers. Screens are full / sheet / modal layers.
- `GG.main`: `quickStart({seed,slot,name,openCard,bandId,presetId}), newCareer, load, loadState, enterGarage, route,
  beginWeek, afterCard, wrapWeek, nextWeek, saveTo, quitToTitle, sync`. URL `?quick=1&seed=N`.
- `GG.audio`: `unlock, sfx(name), setMuted, isMuted, toggleMuted, suspend (also stops a song), resume` + v0.2
  `play(pattern, {genre, section|null, loop, backing}) → handle {stop, update(p), beatAt(time), playing, start, bpm}`,
  `stop, isPlaying, current, hit(lane, when?) (v0.6.2: optional AudioContext time, < 1 s ahead), timeline(p, opts) → {bpm, beats, style, events[{beat, kind, lane|midi, len, gap}]},
  styleFor(genre, bpm), renderOffline(spec) → Promise<{peak, rms, nan}>`. Events: 'audio:step' per 16th, 'audio:end'.
  v0.5.1 `context()` (the gig clock). v0.6.1: `play` opts `vocals, songId (seeds the key), metronome` (handle `.key`,
  `.genre`); mixer `setVolume(bus,0..1)` (null for unknown bus; gain = v²) / `getVolume` / `volumes()` over C.MIX_BUSES;
  `metronome() / setMetronome / toggleMetronome`; `applySettings()` (re-reads mix/metronome/brushes/muted; also run on
  'settings:changed' for those keys); `keyFor(seed, genre) → {tonic, offset, mode, name}`; `roomFor(gig)` →
  dry|room|hall|theatre|arena, `room()`; `ambience()` → garage|van|gig|none, `refreshAmbience()`, `radioSong(state)`;
  `renderOffline` extras `{full, songId, vocals, metronome, room, variant}` / `{ambience}` → also `counts`, `key`.
- `GG.ui` v0.2: `LANES` (lane name/icon/colour for the v0.3 highway), `composeWeek(n, done), openSketch, openSong(id)`;
  screens `seq` (full) and `seq-tools` (modal). v0.6.2: `seq` write mode has `D.guided` / `D.step`
  (verse|chorus|bridge|tempo|order|name); debug `seq` adds `guided, step`; debug `gigui` adds `auto, autoPlayed`.
- Tests: `node tests/run.js` (content 21, save 7, sim_career 18, sim_gig 7, sim_songs 12) · `pw_flow.js`
  META_ONLY=flow|year|code|layout (flows jam their Write blocks) · `pw_garage.js` META_ONLY=garage (48) ·
  `pw_seq.js` META_ONLY=seq (34, screenshot `tests/.cache/seq.png`; also runs guided)|guided (23)|audio (38).


## v0.5.1 hotfix (owner phone report: "the playing mini game is broken, it's also quite difficult")
- Gig clock now free-runs on performance.now() and only drifts toward the audio clock while it's healthy (running, ~1x);
  a stalled/suspended/erratic AudioContext (iOS silent switch, screen recording, Control Centre, headless) no longer
  freezes, rewinds or fast-forwards the notes. Taps wake a suspended context; event timeStamps on another time base are
  ignored; taps are caught on the document (capture) inside the highway's rectangle so no stray layer can swallow them;
  any layer above the show is closed at "Start the show".
- Gig difficulty (owner decision: new players get **Easy**): `GG.gig.DIFFICULTIES` easy / normal / hard, chosen on the
  setlist sheet, saved in settings (`gigDifficulty`). Easy ≈ 3–4 notes/s (time-spaced lanes, ≤2-note chords, windows
  ×1.45, misses hurt the crowd ×0.55, slower scroll); Normal ≈ 6–8/s; Hard = as written (the sim's default for bots).
  Addendum C4 extends this (Expert, note speed, assists, settings screen) in v0.6.1.
- Tests: sim_gig difficulty test; pw_gig `touch` section (real touchscreen taps under a stray layer, stalled clock).

## Back-burner
- v0.6: the Sad Dome trip's `trip.to` is still the home city id (Calgary is off the Sask map; labels + km are right);
  `npcs.wraith_frontman` is still named "Tundra Wraith's frontman" in content (the UI shows Gord); heat decays emit
  'heat:changed' every week; the spectator view keeps crowd pits off (they'd run through the riser camera); rival banter
  lines live in 59d (UI flavour, like 55's); other bands' rivals have no cast until v0.9 (the Scene tab shows an empty lineup).
- v0.5: rival strength for Loonies is a scripted curve (`labels.rivalStrength`) — v0.6 replaces it with the rival sim.
- v0.5: DIY bands have no deal object (Label tab says "No label yet"); theatres use kind 'club' + `theatre:true` (club
  dressing); producer `weird` unused; full-career save code ≈ 65–70k chars (album reviews); balance 10×20 takes ~39 s.
- v0.4: late-game avg-bot fund plateaus ~$3.5k (was $11k) because of the members' cut; the good bot never sees drama
  (moods ~85). Both belong to the v0.5 era/economy pass. Pay-the-band money has no other use yet (members' savings).
- v0.4: fill-ins have generic garage idles/tap lines; the van scene doesn't carry fill-ins.
- v0.4: epilogue lines per original are content-only hooks for v1.0; `rivalDefectors` isn't used by a rival sim yet (v0.6).
- v0.4: EFFECT_KEYS additions (`member`, `payCut`, `repay`) are pushed at runtime by 20_sim_career until the lead
  folds them into 02_contracts.js.
- v0.3: later years pay far more than v0.2 (good bot year 2 ≈ $7k fund, 2,000 fans) because of 250–300-cap rooms —
  needs the era/economy pass in v0.5.
- v0.3: no latency-calibration setting for players yet; `A.hit` has no per-lane choke.
- v0.3: van space has no use yet (merch in v0.8). Gig banter lines live in 55_ui_gig.js, not content/lines.js.
- Restoring a save code keeps the code's slot; its next autosave overwrites that slot without asking.
- With the planner sheet open the room squeezes into a 150px band and hotspot labels overlap a little.
- Once-only garage cards run out after ~1.5 years; later garage years lean on repeatables (eras/content in v0.5+).
- Full-career save code ≈ 17.6k chars (could trim `history`).
- Flags `mooseMuse` and `babaMad` are set by cards but unused yet (hooks for the moose album chain / baba storyline).
- Week-one teaching is one in-character toast; the full guided tutorial is v1.0.
- Marcel's mirror has no reflection.
- v0.2: last week's plan stays on the whiteboard (v0.1 behaviour); Go with a kept Write opens the sequencer again.
- v0.2: the mix was tuned by numbers (peaks/rms), not by ear on a phone; backing for punk/rock/country is basic.
- v0.2: sketch-pad edits and queued sketches persist only at the next autosave (week wrap).
- v0.2: gear upgrades (double kick, toms, ride) exist in the model/audio but nothing sells them yet (v0.8).
