// 31_audio_feel.js (v1.2 "Soundcheck", Lane F; plan/plan_contract_1.2.md §4.2, handoff F4 / F5): the band's feel and your
// tap accents. Pure and deterministic (no Web Audio here): A.feelFor(state|null, genre, { rival, studio, seat }) -> FEEL,
// A.feelPlan(tl, FEEL, seed, { gig }) -> { dt, vel, dgap, stats } (steps never move; clamps C.FEEL_CLAMP), A.accent(...),
// A.tapVel(...), A.velGain(v) (C.VEL_REF). Loads after 30_audio.js (build ORDER by name) and replaces 30's stage-0 stubs by
// assignment. F16: C.FEEL_MOOD (mood < 30: spread x 1.25), C.FEEL_STUDIO (t + 0.25), C.FEEL_RIVAL (t + 0.15). Classic on: 30
// never asks (player() / 55 skip every call), so the 1.1 path is untouched.
//
// Who plays what (F4): each event kind belongs to one player this career. drum lanes -> the kit (you on the drum seat: no
// timing feel, accents only; the swapped drummer on a string seat), bass -> bass, gtr / gtr2 / clean -> rhythm guitar, lead /
// twang -> lead guitar, fiddle -> the fiddler, vox -> the singer, bvox -> the band's mean. Your seat's kinds -> you (outside
// gigs: the songwriter's playback of your part keeps its time; in gigs they are muted and your taps play them). A member is
// matched by content role (the band's seat table only decides who moves to the kit); missing -> skill 50; rivals: their
// lineup's skill, missing -> 60; no state -> every player t = 0.5.
// Tightness t = clamp((skill - 30) / 60, 0, 1) (+ C.FEEL_STUDIO for studio takes, + C.FEEL_RIVAL for rivals). Timing spread
// (1 SD) = lerp(12, 2.5, t) ms x genre slop (x C.FEEL_MOOD.spread below C.FEEL_MOOD.below mood); an AR(1) wander per player
// (off = 0.7 off + N(0, spread x 0.71), one step per onset: everything a player hits at once moves together) + the genre push
// per part (backing.feel.push, ms, x (1 - 0.5 t)). Velocity = the accent map x section dynamics + N(0, lerp(0.10, 0.03, t)).
(function (GG) {
  var A = GG.audio, C = GG.contracts;
  if (!A || !C) return;

  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function num(x, d) { x = +x; return isFinite(x) ? x : d; }

  // ---- velocity -> gain (contract §4.1): one helper for every lane; VEL_REF plays at the 1.1 level, +2.5 dB cap ----------
  var VEL_CAP = 1.333;
  A.velGain = function (v) {
    v = +v;
    if (!isFinite(v)) return 1;
    return Math.min(VEL_CAP, Math.pow(Math.max(0, v) / (C.VEL_REF || 0.85), 1.5));
  };

  // ---- F4 numbers ------------------------------------------------------------------------------------------------------
  var SPREAD_MS = [12, 2.5], VEL_SD = [0.10, 0.03], AR = 0.7, AR_SD = 0.71;
  var MISSING = 50, RIVAL_MISSING = 60, NULL_T = 0.5;
  var DYN = { sparse: 0.86, full: 1, 'break': 1.04, solo: 0.9 }, RAMP = 0.08, RING = 1.05, SOFT = 0.45, CHUG = 0.85, VEL_FLOOR = 0.2;
  var SOFT_V = { ghost: 1, brush: 1, rim: 1 };
  var BAND_KINDS = ['bass', 'gtr', 'gtr2', 'clean', 'lead', 'twang', 'fiddle', 'vox', 'bvox'];
  var KIND_SEAT = { bass: 'bass', gtr: 'rhythm', gtr2: 'rhythm', clean: 'rhythm', lead: 'lead', twang: 'lead', fiddle: 'fiddle', vox: 'vocals', bvox: 'band' };
  var PUSH_OF = { kick: 'kick', snare: 'snare', hat: 'hat', ride: 'hat', cymbal: 'kick', toms: 'snare', bass: 'bass', gtr: 'gtr', gtr2: 'gtr',
    clean: 'gtr', lead: 'gtr', twang: 'gtr', fiddle: 'gtr', vox: 'vox', bvox: 'vox' };
  var CHUG_KINDS = { gtr: 1, gtr2: 1, clean: 1 };
  // the soloist's kinds per tl.solo (they keep full level in a solo bar; the backing drops to DYN.solo)
  var SOLO_KINDS = { lead: { lead: 1 }, twang: { twang: 1 }, twochord: { gtr: 1 }, fiddle: { fiddle: 1 } };
  // who fills a seat, by content role, in order of preference (a band without that player: the next pattern)
  var SEAT_PATS = {
    bass: [/bass/],
    rhythm: [/rhythm/, /vocals\/(guitar|acoustic)/, /^guitar$/, /lead/],
    lead: [/lead/, /^guitar$/, /rhythm/, /vocals\/(guitar|acoustic)/],
    fiddle: [/fiddle/],
    vocals: [/^vocals/, /vocals/]
  };
  A.tightness = function (skill) { return clamp((num(skill, MISSING) - 30) / 60, 0, 1); };

  function feelData(genre) {
    var G = GG.songs && GG.songs.genre ? GG.songs.genre(genre) : (GG.content.genres || {})[genre];
    var F = G && G.backing && G.backing.feel;
    return { slop: F && isFinite(F.slop) ? +F.slop : 1, push: F && F.push ? F.push : {} };
  }
  // seat -> { id, skill, mood } | 'player' for a career; members matched by role (the kit by seatRole), see the header
  function careerPlayers(state, seat) {
    var P = {}, K = GG.career, line = K && K.lineup ? K.lineup(state) : [], byId = {}, list = [];
    (state.members || []).forEach(function (m) { if (m && m.id != null) byId[m.id] = m; });
    line.forEach(function (x) { if (x.id !== 'player' && byId[x.id]) list.push({ m: byId[x.id], seatRole: String(x.seatRole || '') }); });
    if (seat) P[seat] = 'player';
    if (!P.drums) for (var i = 0; i < list.length; i++) if (/^drums/.test(list[i].seatRole)) { P.drums = list[i].m; break; }
    var off = list.filter(function (x) { return !/^drums/.test(x.seatRole); }).map(function (x) { return x.m; });
    fill(P, off, ['bass', 'rhythm', 'lead', 'fiddle']);
    fill(P, list.map(function (x) { return x.m; }), ['vocals']);   // (a singer on the kit still sings)
    P.band = list.map(function (x) { return x.m; });
    return P;
  }
  function rivalPlayers(state, rival) {
    var R = GG.rival, rv = state && state.rival, list = [];
    if (R && R.lineup && rv && (rival === true || rival == null || rv.id === rival)) { try { list = R.lineup(state) || []; } catch (e) { list = []; } }
    var P = {};
    for (var i = 0; i < list.length; i++) if (/drum/.test(String(list[i].role || ''))) { P.drums = list[i]; break; }
    fill(P, list.filter(function (m) { return !/drum/.test(String(m.role || '')); }), ['bass', 'rhythm', 'lead', 'fiddle']);
    fill(P, list, ['vocals']);
    P.band = list;
    return P;
  }
  function fill(P, members, seats) {
    seats.forEach(function (s) {
      if (P[s]) return;
      var pats = SEAT_PATS[s];
      for (var p = 0; p < pats.length && !P[s]; p++) for (var i = 0; i < members.length; i++) if (pats[p].test(String(members[i].role || '').toLowerCase())) { P[s] = members[i]; break; }
    });
  }
  // One player's numbers. m: a member | 'player' | null (missing); base: the skill when missing; slot: the seat (a missing
  // player's own random stream).
  function playerFeel(m, key, F, add, base, nullT, slot) {
    if (m === 'player') return { who: 'player', t: 1, spread: 0, push: 0, velSd: 0 };
    var skill = m && isFinite(m.skill) ? +m.skill : base, t = clamp((nullT != null ? nullT : A.tightness(skill)) + add, 0, 1);
    var M = C.FEEL_MOOD || { below: 30, spread: 1.25 }, sloppy = !!m && isFinite(m.mood) && +m.mood < M.below;
    return { who: m && m.id != null ? String(m.id) : '~' + slot, t: t, spread: lerp(SPREAD_MS[0], SPREAD_MS[1], t) * F.slop * (sloppy ? M.spread : 1) / 1000,
      push: num(F.push[PUSH_OF[key]], 0) * (1 - 0.5 * t) / 1000, velSd: lerp(VEL_SD[0], VEL_SD[1], t) };
  }
  // The band's mean (backing vocals): mean skill, the mood rule if most of them are low.
  function meanOf(list) {
    if (!list || !list.length) return null;
    var s = 0, low = 0, n = 0;
    list.forEach(function (m) { s += isFinite(m.skill) ? +m.skill : MISSING; n++; if (isFinite(m.mood) && +m.mood < (C.FEEL_MOOD || {}).below) low++; });
    return { id: 'band', skill: s / n, mood: low * 2 > n ? 0 : 100 };
  }
  var LAST = { feel: null, plan: null };
  // A.feelFor(state|null, genre, { rival, studio, seat }) -> FEEL { genre, slop, studio, rival, seat, byKind: { <drum lane | band
  // kind>: { who, t, spread (s), push (s), velSd } } }. opts.seat overrides the career's seat (who 'player').
  A.feelFor = function (state, genre, opts) {
    opts = opts || {};
    genre = genre || (state && state.genre) || 'metal';
    var F = feelData(genre), rival = opts.rival || null, add = (opts.studio ? num(C.FEEL_STUDIO, 0.25) : 0) + (rival ? num(C.FEEL_RIVAL, 0.15) : 0);
    var P = null, base = rival ? RIVAL_MISSING : MISSING, nullT = null, seat = null;
    if (!state) nullT = NULL_T;
    else if (rival) P = rivalPlayers(state, rival);
    else P = careerPlayers(state, seat = opts.seat || (GG.career && GG.career.seatOf ? GG.career.seatOf(state) : null));
    if (P && rival && !(P.band && P.band.length)) nullT = NULL_T;   // (no lineup to read: the null-state band)
    var by = {}, band = P ? meanOf(P.band) : null;
    C.LANES.forEach(function (l) { by[l] = playerFeel(P ? P.drums || null : null, l, F, add, base, nullT, 'drums'); });
    BAND_KINDS.forEach(function (k) {
      var s = KIND_SEAT[k], m = !P ? null : s === 'band' ? band : P[s] || null;
      by[k] = playerFeel(m, k, F, add, base, nullT, s);
    });
    var out = { genre: genre, slop: F.slop, studio: !!opts.studio, rival: rival, seat: seat, byKind: by };
    LAST.feel = out;
    return out;
  };

  // ---- accents (F4 map) ------------------------------------------------------------------------------------------------
  // step: the 16th within the bar (0..15; < 0 or off the grid = a 16th). Drums: the map (the snare's backbeat 1.0), ghost /
  // brush / rim x 0.45. Band kinds (bass, guitars, vocals, fiddle): the map flattened halfway; variant 'mute' (palm-muted
  // chugs) = an even 0.85. role: the bar's role -> section dynamics (sparse 0.86, full 1, break 1.04, solo backing 0.9).
  A.accent = function (step, kind, lane, variant, role) {
    var s = step == null || !isFinite(step) || step < 0 ? -1 : ((step | 0) % 16 + 16) % 16, m;
    if (s === 0) m = 1;
    else if (s === 8) m = 0.94;
    else if (s === 4 || s === 12) m = kind === 'drum' && lane === 'snare' ? 1 : 0.9;
    else if (s >= 0 && s % 2 === 0) m = 0.8;
    else m = 0.66;
    if (kind === 'drum') { if (SOFT_V[variant]) m *= SOFT; }
    else if (variant === 'mute') m = CHUG;
    else m = 0.5 + 0.5 * m;
    return m * (DYN[role] || 1);
  };

  // ---- the plan --------------------------------------------------------------------------------------------------------
  function gauss(rng) {
    var u = Math.max(1e-12, rng.next()), v = rng.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  // A.feelPlan(tl, FEEL, seed, { gig }) -> { dt: Float32Array(n) (s), vel: Float32Array(n), dgap: Float32Array(n) (beats: how
  // much the gap to the same voice's next event moved; schedule time = beat x spb + dt), stats: { n, maxAbsDt, meanVel, gig } }
  // n = tl.events.length; 'step' events: dt 0, vel 1. Clamps (F3.3, C.FEEL_CLAMP): gig kick / snare +-6 ms, other kinds
  // +-15 ms, outside gigs +-25 ms, always <= 25 % of a 16th; a voice (drum lane / band kind) never changes its time order.
  // seed: e.g. GG.hashSeed(songId + '|' + pass); each player draws from its own stream (seed | player), so the plan of an
  // event depends on songId | pass | index | player only. Pure (a debug copy of the last stats is kept).
  A.feelPlan = function (tl, FEEL, seed, opts) {
    if (!tl || !Array.isArray(tl.events) || !FEEL || !FEEL.byKind) return null;
    var E = tl.events, n = E.length, dt = new Float32Array(n), vel = new Float32Array(n), dgap = new Float32Array(n);
    var spb = 60 / (tl.bpm > 0 ? tl.bpm : 120), s16 = spb / 4, CL = C.FEEL_CLAMP || { gigDrum: 0.006, gig: 0.015, free: 0.025, sixteenth: 0.25 };
    var gig = !!(opts && opts.gig), cap16 = CL.sixteenth * s16;
    var limDrum = Math.min(gig ? CL.gigDrum : CL.free, cap16), limOther = Math.min(gig ? CL.gig : CL.free, cap16);
    var sd = String((seed >>> 0) || 1), solo = SOLO_KINDS[tl.solo] || {}, by = FEEL.byKind;
    var lastBar = {}, name = {}, maxEntry = -1, i, e;
    for (i = 0; i < n; i++) {
      e = E[i];
      if (e.kind !== 'step') continue;
      if (lastBar[e.entry] == null || e.bar > lastBar[e.entry]) lastBar[e.entry] = e.bar;
      name[e.entry] = e.section; if (e.entry > maxEntry) maxEntry = e.entry;
    }
    var who = {}, prev = {}, cx = null, maxAbs = 0, sumV = 0, nV = 0;
    for (i = 0; i < n; i++) {
      e = E[i];
      if (e.kind === 'step') { cx = e; vel[i] = 1; continue; }
      var key = e.kind === 'drum' ? e.lane : e.kind, F = by[key];
      var pos = e.beat * 4, st = Math.round(pos), step = Math.abs(pos - st) < 1e-6 ? ((st % 16) + 16) % 16 : -1;
      var role = cx ? cx.role : 'full';
      if (role === 'ring' || (role === 'solo' && solo[key])) role = 'full';
      var variant = e.kind === 'drum' ? e.v : e.mute && CHUG_KINDS[key] ? 'mute' : null;
      var v = A.accent(step, e.kind, e.lane, variant, role);
      if (e.ring) v *= RING;
      if (cx && cx.entry < maxEntry && cx.bar === lastBar[cx.entry] && name[cx.entry + 1] !== cx.section) {   // the band leans into the change
        v *= 1 + RAMP * clamp((e.beat - (cx.beat - cx.step / 4)) / 4, 0, 1);
      }
      var d = 0;
      if (F && F.who !== 'player') {
        var P = who[F.who] || (who[F.who] = { rng: GG.RNG(GG.hashSeed(sd + '|' + F.who)), off: 0, beat: null });
        if (P.beat !== e.beat) {   // a new onset of this player: the wander moves on (AR(1); the first one starts stationary)
          var g = gauss(P.rng);
          P.off = P.beat == null ? g * F.spread : AR * P.off + g * F.spread * AR_SD;
          P.beat = e.beat;
        }
        var lim = key === 'kick' || key === 'snare' ? limDrum : limOther;
        d = Math.fround(clamp(P.off + F.push, -lim, lim));
        if (Math.abs(d) > lim) d = d > 0 ? Math.fround(lim * (1 - 1e-6)) : -Math.fround(lim * (1 - 1e-6));   // (float32 rounding)
        v += gauss(P.rng) * F.velSd;
      }
      var pv = prev[key];
      if (pv != null) {   // a voice keeps its time order (monophonic lanes: the chokes stay right)
        if (e.beat * spb + d < E[pv].beat * spb + dt[pv]) d = dt[pv];
        dgap[pv] = (d - dt[pv]) / spb;
      }
      prev[key] = i;
      dt[i] = d; vel[i] = clamp(v, VEL_FLOOR, 1);
      if (Math.abs(d) > maxAbs) maxAbs = Math.abs(d);
      sumV += vel[i]; nV++;
    }
    var stats = { n: n, maxAbsDt: maxAbs, meanVel: nV ? sumV / nV : 0, gig: gig };
    LAST.plan = stats;
    return { dt: dt, vel: vel, dgap: dgap, stats: stats };
  };

  // ---- your taps (F5) --------------------------------------------------------------------------------------------------
  // A.tapVel({ judgement: 'perfect'|'good'|'fill'|'count' (count-in noodling)|null (stray), step (the judged note's 16th;
  // strays: the last note's), lane, prevHatT, t (song seconds), run? (the hat run's index: alternates the hands), rnd? (0..1;
  // default a hash of t + lane) }) -> vel 0.45..1 = judgement x beat position x hand +- 0.03.
  var JUDGE = { perfect: 1, good: 0.86, fill: 0.76, count: 0.7 }, STRAY = 0.62, HAT_RUN = 0.15, OFF_HAND = 0.84, TAP_RND = 0.03;
  function posVel(step, lane) {
    if (step == null || !isFinite(step)) return 1;
    var s = ((step | 0) % 16 + 16) % 16;
    if (s === 0) return 1;
    if (s % 4 === 0) return lane === 'snare' && (s === 4 || s === 12) ? 1 : 0.96;
    return s % 2 === 0 ? 0.9 : 0.82;
  }
  function hash01(t, lane) { return (GG.hashSeed(Math.round(num(t, 0) * 1000) + '|' + (lane || '')) % 10007) / 10006; }
  A.tapVel = function (o) {
    o = o || {};
    var j = JUDGE[o.judgement] != null ? JUDGE[o.judgement] : STRAY, p = posVel(o.step, o.lane), hand = 1;
    if (o.lane === 'hat' && o.prevHatT != null && o.t != null && o.t - o.prevHatT >= 0 && o.t - o.prevHatT < HAT_RUN) {
      var k = o.run != null && isFinite(o.run) ? o.run | 0 : (o.step | 0);
      hand = k % 2 ? OFF_HAND : 1;
    }
    var r = o.rnd != null && isFinite(o.rnd) ? clamp(+o.rnd, 0, 1) : hash01(o.t, o.lane);
    return clamp(j * p * hand + (r * 2 - 1) * TAP_RND, 0.45, 1);
  };
  // F5: the game's own strokes (auto notes, Auto-kick, a double's 2nd kick: a real double is a softer second stroke)
  A.TAP_AUTO = { hat: 0.88, kick: 0.9, double: 0.82, other: 0.88 };

  // debug('feel') (the lead folds it into debug('audio').feel): the last FEEL's players and the last plan's stats
  A.feelStats = function () {
    var f = LAST.feel, by = null;
    if (f) { by = {}; Object.keys(f.byKind).forEach(function (k) { var x = f.byKind[k]; by[k] = { who: x.who, t: Math.round(x.t * 1000) / 1000, spreadMs: Math.round(x.spread * 1e4) / 10, pushMs: Math.round(x.push * 1e4) / 10 }; }); }
    return { genre: f ? f.genre : null, studio: f ? f.studio : null, rival: f ? f.rival : null, byKind: by, lastPlan: LAST.plan ? Object.assign({}, LAST.plan) : null };
  };
  if (GG.registerDebug) GG.registerDebug('feel', function () { return A.feelStats(); });
})(window.GG);
