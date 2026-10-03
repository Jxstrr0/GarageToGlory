// 31_audio_feel.js (v1.2 "Soundcheck", Lane F; plan/plan_contract_1.2.md §4.2, handoff F4 / F5): the band's feel and your
// tap accents. Pure and deterministic (no Web Audio here): A.feelFor(state|null, genre, { rival, studio, seat }) -> FEEL,
// A.feelPlan(tl, FEEL, seed, { gig }) -> { dt, vel, stats } (steps never move; clamps C.FEEL_CLAMP), A.accent(...), A.tapVel(...),
// velGain(v) (C.VEL_REF). Loads after 30_audio.js (build ORDER by name) and replaces 30's stage-0 stubs by assignment.
// F16: C.FEEL_MOOD (mood < 30: spread x 1.25), C.FEEL_STUDIO (t + 0.25), C.FEEL_RIVAL (t + 0.15). Classic on: never used.
// Stage 0: header only.
