// 11_settings.js (v0.6.1, SETTINGS agent; Addendum 1 C4): player preferences + career difficulty. No DOM, node-safe.
//   GG.prefs: get() -> normalized settings (defaults from GG.save, calib profiles filled in) ; set(obj) -> get() (emits
//     'settings:changed' { keys }) ; profile() ; setProfile('speaker'|'headphones') ; offsets(s?, input?) -> { audio, visual,
//     visM } seconds for the active profile ; setCalib(profile, { audio?, visual? } ms, input?) ; calibCompute(clicks[], taps[], opts)
//     -> { ok, offset (ms, tap minus click), n, spread } (pure) ; PROFILES ; GRAPHICS ; NOTE_SPEEDS ; CB_COLOURS.
//   Settings keys (GG.save.settings()): gigDifficulty, noteSpeed, noFail, autoKick, audioProfile, calib { speaker|headphones:
//     { audio, visual, at } }, calibSeen, lefty, colourblind, bigText, reducedFlash, cameraShake, graphics, skipVan,
//     fastAnim, songwriterMode ('guided'|'advanced', v0.6.2) (+ lane A's mix, metronome, brushes; muted),
//     drumSync (v0.8.3, default true), syncDisp (v0.8.3, ms 10..40: this device's touch dispatch p90, default 25),
//     audioClassic (v1.2, default false: the 1.1 sound; hidden, debug-only via GG.audio.classic(bool), owner F16.4).
//     calib profiles also keep vat (v0.8.3: when the light check last wrote `visual`; 0 = never measured).
//     v1.5 "Desktop" (plan_contract_1.5 §4.1; defaults here only, never written until changed): keymap { drums?, strings? }
//     (6 KeyboardEvent.codes per kind; only a changed kind is stored), calibKb { speaker, headphones } (prof() shape: the key
//     timing; at = key click test ran, vat = key light check ran), layout 'auto'|'phone'|'wide'.
//   v1.5 key + layout helpers (pure): KEY_KINDS ; KEY_DEFAULTS ; KEY_RESERVED + keyReserved(code) ; CLASSIC_KEYS ; LAYOUTS ;
//     keyKind(seat) ; keySlot(kind, lane, lanes) ; keysFor(s, kind, lanes) ; keyLane(s, kind, lanes, code, key) -> { lane } |
//     { col } | null ; codeOf(key) ; bindKey(s, kind, slot, code) -> { keymap, swapped, refused } ; resetKeys(s, kind) ;
//     keyLabel(code, layoutMap?, learned?) ; calibFor(s, input) -> { audio, visual, visM } ms ; offsets(s?, input?) and
//     setCalib(profile, o, input?) take 'touch' (default: v1.4 exactly, offsets + visM) or 'keys' ; layoutFor(w, h, desk, pref) ;
//     pxBudget(w, h, wide).
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
    var ck = s.calibKb && typeof s.calibKb === 'object' ? s.calibKb : {};   // v1.5: the key timing (same shape)
    s.calibKb = { speaker: prof(ck.speaker), headphones: prof(ck.headphones) };
    s.keymap = fullMap(s.keymap);                                          // v1.5: every kind filled (stored: changed kinds only)
    if (P.LAYOUTS.indexOf(s.layout) < 0) s.layout = 'auto';               // v1.5
    if (P.PROFILES.indexOf(s.audioProfile) < 0) s.audioProfile = 'speaker';
    if (P.GRAPHICS.indexOf(s.graphics) < 0) s.graphics = 'auto';   // v1.0: unknown -> the default (was 'high')
    s.noteSpeed = U.clamp(num(s.noteSpeed, 1), 0.5, 2);
    if (!C.GIG_DIFFICULTY || C.GIG_DIFFICULTY.indexOf(s.gigDifficulty) < 0) s.gigDifficulty = 'easy';
    ['noFail', 'autoKick', 'calibSeen', 'lefty', 'colourblind', 'bigText', 'reducedFlash', 'skipVan', 'fastAnim'].forEach(function (k) { s[k] = !!s[k]; });
    s.cameraShake = s.cameraShake !== false;
    s.drumSync = s.drumSync !== false;                                // v0.8.3: default on
    s.syncDisp = U.clamp(Math.round(num(s.syncDisp, 25)), 10, 40);   // v0.8.3: ms, this device's touch dispatch p90
    s.audioClassic = !!s.audioClassic;                                // v1.2: the Classic sound (hidden; GG.audio.classic)
    if (s.songwriterMode !== 'advanced') s.songwriterMode = 'guided';   // v0.6.2 Write flow mode; ignored since 1.3 (one flow, D18): kept so old saves / tests round-trip
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
  // v1.5: input 'keys' -> the key timing (calibFor); none / 'touch' -> v1.4's values (+ visM: the light check ran)
  P.offsets = function (s, input) { s = s ? P.normalize(s) : P.get(); var c = P.calibFor(s, input === 'keys' ? 'keys' : 'touch'); return { audio: c.audio / 1000, visual: c.visual / 1000, visM: c.visM }; };
  P.setCalib = function (profile, o, input) {
    var s = P.get(); if (P.PROFILES.indexOf(profile) < 0) profile = s.audioProfile;
    if (input === 'keys') {   // v1.5: the key calibration (calibKb): at only when the click test wrote audio, vat only with visual
      var k = s.calibKb[profile], when = o && o.at != null ? o.at : Date.now();
      if (o && o.audio != null) { k.audio = U.clamp(Math.round(o.audio), -MAX_OFF, MAX_OFF); k.at = when; }
      if (o && o.visual != null) { k.visual = U.clamp(Math.round(o.visual), -MAX_OFF, MAX_OFF); k.vat = when; }
      return P.set({ calibKb: s.calibKb, calibSeen: true }).calibKb[profile];
    }
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

  /* ---- v1.5 "Desktop": gig keys, key calibration, the PC layout (pure; plan_contract_1.5 §4.1, owner K2 / K4 / Q1 / Q2) ---- */
  // Keys are physical (KeyboardEvent.code). Two maps: the kit by drum role (C.LANES order) and one shared by bass / rhythm /
  // lead by pitch slot (low -> high; slot 4 = the 5th of 6, slot 5 = the top string). Settings keep only a changed kind.
  P.KEY_KINDS = ['drums', 'strings'];
  P.KEY_DEFAULTS = {   // owner Q1 "strong fingers" (Space kick, D snare, F hats, S crash, Shift toms, A ride); Q2 A S D F + thumb on top
    drums: ['Space', 'KeyD', 'KeyF', 'KeyS', 'ShiftLeft', 'KeyA'],
    strings: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'ShiftLeft', 'Space']
  };
  // Never bindable (menus, the system, keys that never come back up). 'X*' = every code starting with X; F1-F24 too.
  P.KEY_RESERVED = ['Escape', 'Tab', 'Enter', 'NumpadEnter', 'CapsLock', 'ContextMenu', 'Control*', 'Alt*', 'Meta*', 'OS*', 'F1-F24',
    'NumLock', 'ScrollLock', 'Pause', 'PrintScreen', 'Fn*', 'Unidentified', ''];
  P.CLASSIC_KEYS = { d: 0, f: 1, j: 2, k: 3, s: 0, l: 3, g: 4, h: 5 };   // the v1.4 table (55:60, columns): code-less events + J K L G H
  var EXTRAS = 'jklgh';
  P.LAYOUTS = ['auto', 'phone', 'wide'];
  var CODE_RE = /^[A-Za-z0-9]{2,24}$/;
  P.keyReserved = function (code) {
    if (typeof code !== 'string') return true;
    if (/^F([1-9]|1\d|2[0-4])$/.test(code)) return true;
    for (var i = 0; i < P.KEY_RESERVED.length; i++) {
      var r = P.KEY_RESERVED[i];
      if (r.charAt(r.length - 1) === '*' ? code.indexOf(r.slice(0, -1)) === 0 : r === code) return true;
    }
    return false;
  };
  function keyList(a, kind) {
    var d = P.KEY_DEFAULTS[kind];
    if (!Array.isArray(a) || a.length !== d.length) return d.slice();
    for (var i = 0; i < a.length; i++) if (typeof a[i] !== 'string' || !CODE_RE.test(a[i]) || P.keyReserved(a[i]) || a.indexOf(a[i]) !== i) return d.slice();
    return a.slice();
  }
  function fullMap(km) { km = km && typeof km === 'object' ? km : {}; return { drums: keyList(km.drums, 'drums'), strings: keyList(km.strings, 'strings') }; }
  function storedMap(full) {   // what settings keep: only a kind that differs from its default
    var out = {};
    P.KEY_KINDS.forEach(function (k) { if (full[k].join() !== P.KEY_DEFAULTS[k].join()) out[k] = full[k].slice(); });
    return out;
  }
  function mapOf(s) { return fullMap(s && s.keymap); }
  P.keyKind = function (seat) { return seat && seat !== 'drums' ? 'strings' : 'drums'; };
  // The map slot a lane plays: drums by role (= lane); strings by pitch, the top string of a 5- or 6-lane rig on slot 5.
  P.keySlot = function (kind, lane, lanes) { return kind === 'strings' && lanes >= 5 && lane === lanes - 1 ? 5 : lane; };
  P.keysFor = function (s, kind, lanes) {
    var m = mapOf(s)[kind === 'strings' ? 'strings' : 'drums'], out = [];
    for (var l = 0; l < lanes; l++) out.push(m[P.keySlot(kind, l, lanes)]);
    return out;
  };
  P.codeOf = function (key) {
    if (typeof key !== 'string') return null;
    if (/^[a-zA-Z]$/.test(key)) return 'Key' + key.toUpperCase();
    if (/^[0-9]$/.test(key)) return 'Digit' + key;
    if (key === ' ') return 'Space';
    if (key === 'Shift') return 'ShiftLeft';
    return null;
  };
  // -> { lane } (a lane on this rig; -1 = bound in this kind but off this rig: swallowed, no tap) | { col } (the v1.4 table:
  // a column, mirrored by 55's col() for lefty) | null (not a gig key). §4.3 "Resolve".
  P.keyLane = function (s, kind, lanes, code, key) {
    var m = mapOf(s)[kind === 'strings' ? 'strings' : 'drums'], k = typeof key === 'string' ? key.toLowerCase() : '';
    function bound(c) {
      var slot = m.indexOf(c);
      if (slot < 0 && c === 'ShiftRight' && m.indexOf('ShiftRight') < 0) slot = m.indexOf('ShiftLeft');
      if (slot < 0) return null;
      for (var l = 0; l < lanes; l++) if (P.keySlot(kind, l, lanes) === slot) return { lane: l };
      return { lane: -1 };
    }
    function col(c) { return c != null && c < lanes ? { col: c } : null; }
    if (!code) {
      if (Object.prototype.hasOwnProperty.call(P.CLASSIC_KEYS, k)) return col(P.CLASSIC_KEYS[k]);
      var c2 = P.codeOf(key);
      return c2 ? bound(c2) : null;
    }
    var b = bound(code);
    if (b) return b;
    if (k.length === 1 && EXTRAS.indexOf(k) >= 0) return col(P.CLASSIC_KEYS[k]);
    return null;
  };
  // -> { keymap (what to store: P.set({ keymap })), swapped: the other slot that took the old key | null, refused }
  P.bindKey = function (s, kind, slot, code) {
    var full = mapOf(s), res = { keymap: storedMap(full), swapped: null, refused: null };
    if (P.KEY_KINDS.indexOf(kind) < 0 || !(slot >= 0 && slot < 6 && slot % 1 === 0) || typeof code !== 'string') { res.refused = 'invalid'; return res; }
    if (P.keyReserved(code)) { res.refused = 'reserved'; return res; }
    if (!CODE_RE.test(code)) { res.refused = 'invalid'; return res; }
    var list = full[kind], other = list.indexOf(code);
    if (other === slot) return res;
    if (other >= 0) { list[other] = list[slot]; res.swapped = other; }
    list[slot] = code;
    res.keymap = storedMap(full);
    return res;
  };
  P.resetKeys = function (s, kind) { var full = mapOf(s); if (P.KEY_DEFAULTS[kind]) full[kind] = P.KEY_DEFAULTS[kind].slice(); return storedMap(full); };
  var CODE_LABEL = { Space: 'Space', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', IntlBackslash: '\\',
    Semicolon: ';', Quote: '\'', Comma: ',', Period: '.', Slash: '/', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Backspace: '⌫' };
  // A keycap's text: the layout map (navigator.keyboard.getLayoutMap(): a Map or a plain object) > what this session saw that
  // key print (GG.input learned) > the code itself (KeyA -> A, Digit1 -> 1, ShiftLeft -> Shift).
  P.keyLabel = function (code, layoutMap, learned) {
    var v = null;
    if (layoutMap) v = typeof layoutMap.get === 'function' ? layoutMap.get(code) : layoutMap[code];
    if ((typeof v !== 'string' || v.length !== 1) && learned) v = learned[code];
    if (typeof v === 'string' && v.length === 1) return v === ' ' ? 'Space' : v.toUpperCase();
    if (typeof code !== 'string' || !code) return '';
    var m = /^(?:Key|Digit)(.)$/.exec(code);
    if (m) return m[1];
    m = /^Numpad(\d)$/.exec(code);
    if (m) return 'Num ' + m[1];
    m = /^(Shift|Control|Alt|Meta)(Left|Right)$/.exec(code);
    if (m) return m[1] === 'Control' ? 'Ctrl' : m[1];
    return CODE_LABEL[code] || code;
  };
  // Timing per input (K4: same windows; each field from its own measured source). ms.
  P.calibFor = function (s, input) {
    s = s && s.calib && s.calibKb ? s : P.normalize(s || P.get());
    var c = s.calib[s.audioProfile], k = s.calibKb[s.audioProfile];
    if (input !== 'keys') return { audio: c.audio, visual: c.visual, visM: c.vat > 0 };
    var a = k.at > 0 ? k.audio : c.audio, vm = k.vat > 0;
    return { audio: a, visual: vm ? k.visual : c.visual, visM: vm ? true : c.vat > 0 };
  };
  P.layoutFor = function (w, h, desk, pref) {
    if (pref === 'phone') return false;
    var big = w >= 1000 && h >= 560;
    return pref === 'wide' ? big : big && !!desk && w >= 1.2 * h;
  };
  P.pxBudget = function (w, h, wide) { return wide ? Math.sqrt(2.4e6 / (w * h)) : Infinity; };

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
