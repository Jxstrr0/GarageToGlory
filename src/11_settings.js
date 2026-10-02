// 11_settings.js (v0.6.1, SETTINGS agent; Addendum 1 C4): player preferences + career difficulty. No DOM, node-safe.
//   GG.prefs: get() -> normalized settings (defaults from GG.save, calib profiles filled in) ; set(obj) -> get() (emits
//     'settings:changed' { keys }) ; profile() ; setProfile('speaker'|'headphones') ; offsets(s?) -> { audio, visual }
//     seconds for the active profile ; setCalib(profile, { audio?, visual? } ms) ; calibCompute(clicks[], taps[], opts)
//     -> { ok, offset (ms, tap minus click), n, spread } (pure) ; PROFILES ; GRAPHICS ; NOTE_SPEEDS ; CB_COLOURS.
//   Settings keys (GG.save.settings()): gigDifficulty, noteSpeed, noFail, autoKick, audioProfile, calib { speaker|headphones:
//     { audio, visual, at } }, calibSeen, lefty, colourblind, bigText, reducedFlash, cameraShake, graphics, skipVan,
//     fastAnim, songwriterMode ('guided'|'advanced', v0.6.2) (+ lane A's mix, metronome, brushes; muted),
//     drumSync (v0.8.3, default true), syncDisp (v0.8.3, ms 10..40: this device's touch dispatch p90, default 25).
//     calib profiles also keep vat (v0.8.3: when the light check last wrote `visual`; 0 = never measured).
//   v0.8.3 drum sync helpers (pure, seconds; 55_ui_gig): SYNC { M, LEAD, DISP0, DISP_MIN, DISP_MAX, SNAP_EARLY, VIS0, MIN_N } ;
//     syncLead(disp) -> K = clamp(disp) + LEAD + M (the game clock runs D = latency + K ahead of the band) ;
//     syncSnap(J, noteT, hit) -> the band time a tap's sound aims at (the note when a hit lands in [-SNAP_EARLY, +M]) ;
//     syncWhen(J', zeroBand, ctxNow) -> ctx time to book it (never before now + LEAD) ; syncP90(samples) -> p90 or null
//     (< MIN_N) ; syncBlend(prev, songP90) ; syncVisual(off, measured) -> the highway's visual offset (VIS0 if never measured).
//   GG.difficulty: LEVELS ; of(state) -> 'chill'|'normal'|'brutal' (missing = normal) ; mul(state, key) (default 1) ;
//     add(state, key) (default 0) ; text(id) -> { name, blurb } ; migrate(state). Tunables economy.difficulty[level]:
//     startFund, money (gig pay), hustle, upkeep, moodLoss, rivalSkill (+points), rivalMiss (their low-roll range),
//     advance, labelHarsh (goodwill losses). The one helper every sim reads career difficulty through.
(function (GG) {
  var C = GG.contracts, U = GG.util;

  /* ---- Preferences ------------------------------------------------------------------------------------------ */
  var P = GG.prefs = GG.prefs || {};
  P.PROFILES = ['speaker', 'headphones'];
  P.GRAPHICS = ['auto', 'low', 'med', 'high'];   // v1.0 (§0 Q8): 'auto' = the default (adaptive pixel ratio, 40_render_core)
  P.NOTE_SPEEDS = [0.7, 0.85, 1, 1.2, 1.4];
  // Okabe–Ito: tells kick / snare / hats / cymbal / toms / ride apart with any colour vision.
  P.CB_COLOURS = { kick: '#E69F00', snare: '#56B4E9', hat: '#F0E442', cymbal: '#CC79A7', toms: '#009E73', ride: '#D55E00' };
  var MAX_OFF = 250;   // ms: anything past this is a broken headset, not a latency
  function num(v, d) { v = +v; return isFinite(v) ? v : d; }
  function prof(c) { c = c && typeof c === 'object' ? c : {}; return { audio: U.clamp(Math.round(num(c.audio, 0)), -MAX_OFF, MAX_OFF), visual: U.clamp(Math.round(num(c.visual, 0)), -MAX_OFF, MAX_OFF), at: num(c.at, 0), vat: num(c.vat, 0) }; }
  P.normalize = function (s) {
    s = s && typeof s === 'object' ? s : {};
    var c = s.calib && typeof s.calib === 'object' ? s.calib : {};
    s.calib = { speaker: prof(c.speaker), headphones: prof(c.headphones) };
    if (P.PROFILES.indexOf(s.audioProfile) < 0) s.audioProfile = 'speaker';
    if (P.GRAPHICS.indexOf(s.graphics) < 0) s.graphics = 'auto';   // v1.0: unknown -> the default (was 'high')
    s.noteSpeed = U.clamp(num(s.noteSpeed, 1), 0.5, 2);
    if (!C.GIG_DIFFICULTY || C.GIG_DIFFICULTY.indexOf(s.gigDifficulty) < 0) s.gigDifficulty = 'easy';
    ['noFail', 'autoKick', 'calibSeen', 'lefty', 'colourblind', 'bigText', 'reducedFlash', 'skipVan', 'fastAnim'].forEach(function (k) { s[k] = !!s[k]; });
    s.cameraShake = s.cameraShake !== false;
    s.drumSync = s.drumSync !== false;                                // v0.8.3: default on
    s.syncDisp = U.clamp(Math.round(num(s.syncDisp, 25)), 10, 40);   // v0.8.3: ms, this device's touch dispatch p90
    if (s.songwriterMode !== 'advanced') s.songwriterMode = 'guided';   // v0.6.2: the Write flow's step-by-step screens (default)
    return s;
  };
  P.get = function () { return P.normalize(GG.save && GG.save.settings ? GG.save.settings() : {}); };
  P.set = function (o) {
    if (GG.save && GG.save.saveSettings) GG.save.saveSettings(o || {});
    GG.emit('settings:changed', { keys: Object.keys(o || {}) });
    return P.get();
  };
  P.profile = function () { return P.get().audioProfile; };
  P.setProfile = function (p) { if (P.PROFILES.indexOf(p) >= 0) P.set({ audioProfile: p }); return P.profile(); };
  P.offsets = function (s) { s = s ? P.normalize(s) : P.get(); var c = s.calib[s.audioProfile]; return { audio: c.audio / 1000, visual: c.visual / 1000 }; };
  P.setCalib = function (profile, o) {
    var s = P.get(); if (P.PROFILES.indexOf(profile) < 0) profile = s.audioProfile;
    var c = s.calib[profile];
    if (o && o.audio != null) c.audio = U.clamp(Math.round(o.audio), -MAX_OFF, MAX_OFF);
    if (o && o.visual != null) { c.visual = U.clamp(Math.round(o.visual), -MAX_OFF, MAX_OFF); c.vat = o.at != null ? o.at : Date.now(); }
    c.at = o && o.at != null ? o.at : c.at;
    return P.set({ calib: s.calib, calibSeen: true }).calib[profile];
  };
  // Each tap is matched to the nearest click inside half a beat; the average of what's left after dropping the two
  // wildest taps is the offset (positive = you hear it / tap late). Needs 4+ taps that landed near a click.
  P.calibCompute = function (clicks, taps, opts) {
    opts = opts || {};
    var gap = opts.interval || (clicks.length > 1 ? (clicks[clicks.length - 1] - clicks[0]) / (clicks.length - 1) : 600), win = Math.min(gap * 0.5, 350);
    var offs = [];
    (taps || []).forEach(function (t) {
      var best = null;
      clicks.forEach(function (c) { var d = t - c; if (Math.abs(d) <= win && (best === null || Math.abs(d) < Math.abs(best))) best = d; });
      if (best !== null) offs.push(best);
    });
    if (offs.length < (opts.min || 4)) return { ok: false, offset: 0, n: offs.length, spread: 0 };
    offs.sort(function (a, b) { return a - b; });
    var use = offs.length >= 6 ? offs.slice(1, -1) : offs;
    var mean = use.reduce(function (a, b) { return a + b; }, 0) / use.length;
    return { ok: true, offset: U.clamp(Math.round(mean), -MAX_OFF, MAX_OFF), n: offs.length, spread: Math.round(use[use.length - 1] - use[0]) };
  };

  /* ---- v0.8.3 drum sync (pure helpers; the model is in 55_ui_gig's "drum sync" block) -------------------------- */
  // The band plays on its own grid (zeroBand); the game clock (highway + judgement) runs D = latency + K earlier, so a tap
  // judged on a note can still be booked ON the band's grid: a tap x late with dispatch d fits iff K >= d + LEAD + x.
  var EPS = 1e-9;
  P.SYNC = { M: 0.015, LEAD: 0.005, DISP0: 0.025, DISP_MIN: 0.010, DISP_MAX: 0.040, SNAP_EARLY: 0.015, VIS0: 0.030, MIN_N: 8 };
  P.syncLead = function (disp) {
    var d = isFinite(+disp) && disp > 0 ? +disp : P.SYNC.DISP0;
    return U.clamp(d, P.SYNC.DISP_MIN, P.SYNC.DISP_MAX) + P.SYNC.LEAD + P.SYNC.M;
  };
  P.syncSnap = function (J, noteT, hit) {
    if (!hit || noteT == null) return J;
    var e = J - noteT;
    return e >= -P.SYNC.SNAP_EARLY - EPS && e <= P.SYNC.M + EPS ? noteT : J;
  };
  P.syncWhen = function (Jp, zeroBand, ctxNow) { return Math.max(ctxNow + P.SYNC.LEAD, zeroBand + Jp); };
  P.syncP90 = function (a) {
    if (!a || a.length < P.SYNC.MIN_N) return null;
    var b = a.slice().sort(function (x, y) { return x - y; });
    return U.clamp(b[Math.min(b.length - 1, Math.floor(0.9 * b.length))], P.SYNC.DISP_MIN, P.SYNC.DISP_MAX);
  };
  P.syncBlend = function (prev, songP90) { return songP90 == null ? prev : U.clamp(0.5 * prev + 0.5 * songP90, P.SYNC.DISP_MIN, P.SYNC.DISP_MAX); };
  // measured: the profile's light check ran (vat); without the flag (saves before 0.8.3) a nonzero visual counts as measured.
  P.syncVisual = function (off, measured) { var v = off && off.visual ? off.visual : 0; return measured || v ? v : P.SYNC.VIS0; };

  /* ---- Career difficulty ------------------------------------------------------------------------------------- */
  var D = GG.difficulty = GG.difficulty || {};
  D.LEVELS = (C && C.CAREER_DIFFICULTY) || ['chill', 'normal', 'brutal'];
  var FALLBACK = {
    chill: { startFund: 1.6, money: 1.2, hustle: 1.2, upkeep: 0.85, moodLoss: 0.65, rivalSkill: -5, rivalMiss: 1.4, advance: 1.15, labelHarsh: 0.6 },
    normal: {},
    brutal: { startFund: 0.6, money: 0.85, hustle: 0.85, upkeep: 1.2, moodLoss: 1.4, rivalSkill: 4, rivalMiss: 0.3, advance: 0.8, labelHarsh: 1.6 }
  };
  var TEXT = {
    chill: { name: 'Chill', blurb: 'More money, bandmates who let things slide, a rival who has off nights and labels with a heart.' },
    normal: { name: 'Normal', blurb: 'Scrappy, but not too brutal. The way the prairie intended.' },
    brutal: { name: 'Brutal', blurb: 'Tight money, touchy bandmates, ruthless labels and a rival who does not miss.' }
  };
  D.of = function (state) { var d = state && state.careerDifficulty; return D.LEVELS.indexOf(d) >= 0 ? d : 'normal'; };
  function row(state) {
    var t = (GG.content && GG.content.economy && GG.content.economy.difficulty) || FALLBACK;
    return t[D.of(state)] || {};
  }
  D.mul = function (state, key) { var v = row(state)[key]; return typeof v === 'number' && isFinite(v) ? v : 1; };
  D.add = function (state, key) { var v = row(state)[key]; return typeof v === 'number' && isFinite(v) ? v : 0; };
  D.text = function (id) { return TEXT[id] || TEXT.normal; };
  D.migrate = function (s) { if (s && typeof s === 'object' && D.LEVELS.indexOf(s.careerDifficulty) < 0) s.careerDifficulty = 'normal'; return s; };
  if (GG.save && GG.save.migrate && !GG.save.migrate.difficulty) {
    var prev = GG.save.migrate;
    GG.save.migrate = function (s) { return D.migrate(prev(s)); };
    GG.save.migrate.difficulty = true;
  }
})(window.GG);
