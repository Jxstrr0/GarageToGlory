// 32_audio_dsp.js (v1.2 "Soundcheck", Lane I; plan/plan_contract_1.2.md §4.3, handoff F6 - F9 / F11): GG.dsp, pure JS DSP
// into Float32Arrays (no Web Audio here; node-testable): pluck (Karplus-Strong), chord, strum, metal (the 6-square cluster),
// biquad (RBJ), impulse2 (dry room hall theatre arena plate), cabIR (genre | 'practice8' | 'combo12'). 30 wraps the arrays into
// AudioBuffers. Tiers read C.REALISM through A.realism(tier); C.BAND_AMP_BY_TIER (F16.3). Classic on: never used.
// Stage 0: header only (30 sets GG.dsp = {}).
