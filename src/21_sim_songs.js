// 21_sim_songs.js: the song catalog. A song is a drum PATTERN (three one-bar sections, an arrangement, a tempo)
// that the band builds guitars around. rate() scores a pattern: Groove (genre fit), Hook (chorus vs verse) and
// Difficulty. create() turns a pattern into a SONG whose quality also depends on the band; jam()/generate() let the
// band write one without you. Gigs age songs (stale) and great gigs make classics.
// Pure and deterministic: no DOM, no audio; randomness only from the rng passed in. Genre data: content/genres.js.
//   PATTERN = { bpm, lanes, sections: { verse|chorus|bridge: [laneStr x lanes] (+ v0.8 outro|solo when owned) }, arrangement: [section..] }
// v0.8 (KITSIM): extra sections C.EXTRA_SECTIONS (outro, solo) live in PATTERN.sections only when the gear owns them
// (gear.sections) and are used; sanitize/validate/rate/generate/toNotes/arrangement know them. Outro = a proper ending (hook
// bonus when the song ends on it; the gig gives its last bar as a big-finish fill, the audio lets the last chord ring);
// Solo = Dana's section (you lay back on a stripped kit: the gig chart keeps quarter notes only; hook bonus; Dana stops
// asking for a solo). Jams use owned gear: tom fills (lane 5), a ride chorus (lane 6), double-kick runs, an outro, a solo.
//   sectionsOf(p) -> [names present] ; allSections(gear) ; addSection(p, name, gear) ; removeSection(p, name) ;
//   withExtras(arrangement, gear, opts) ; extraBar(p, name) (the derived default bar)
//   SONG    = { id, title, titleEn, written, pattern, rating: { groove, hook, difficulty }, quality, polish,
//               plays, lastPlayed, stale, hits, classic, auto }
(function (GG) {
  var C = GG.contracts, U = GG.util;
  var songs = GG.songs = GG.songs || {};
  var STEPS = C.STEPS, SECTIONS = C.SECTIONS, BARS = C.BARS_PER_SECTION;
  var KICK = 0, SNARE = 1, HAT = 2, CYM = 3, TOMS = 4, RIDE = 5;
  var BLANK = new Array(STEPS + 1).join('.');
  // Difficulty weight of one hit per lane (kick/toms need feet or travel, hats are easy).
  var LANE_EFFORT = [1.2, 1, 0.6, 0.8, 1.2, 0.6];

  // Arrangement presets. Each entry plays its one-bar section BARS_PER_SECTION times.
  songs.ARRANGEMENTS = {
    short: ['verse', 'chorus', 'verse', 'chorus'],
    classic: ['verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus'],
    epic: ['verse', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'bridge', 'chorus', 'chorus']
  };
  songs.ARRANGEMENT_IDS = ['short', 'classic', 'epic'];
  songs.arrangementId = function (p) {
    var a = (p && p.arrangement || []).join(',');
    for (var id in songs.ARRANGEMENTS) if (songs.ARRANGEMENTS[id].join(',') === a) return id;
    return null;
  };
  songs.DEFAULT_GEAR = { lanes: 4, doubleKick: false };
  var EXTRAS = C.EXTRA_SECTIONS || ['outro', 'solo'];
  songs.EXTRA_SECTIONS = EXTRAS;

  function E() { return GG.content.economy.songs; }
  function SH() { var e = GG.content.economy.shop; return e || { songs: { fillHook: 3, rideHook: 2, outroHook: 4, soloHook: 3, soloWeight: 0.5, outroWeight: 0.5 }, jam: { outro: 0.6, solo: 0.5, tomFill: 0.6, ride: 0.5, pedalRun: 0.85 } }; }
  function gearOf(g) {
    var o = { lanes: g && g.lanes >= 1 ? Math.min(g.lanes, C.LANES.length) : 4, doubleKick: !!(g && g.doubleKick) };
    o.sections = g && Array.isArray(g.sections) ? EXTRAS.filter(function (x) { return g.sections.indexOf(x) >= 0; }) : [];
    return o;
  }
  // Every section name a pattern can use with this gear, in tab order: verse, chorus, bridge (+ solo, outro when owned).
  songs.allSections = function (gear) { var g = gearOf(gear); return SECTIONS.concat(['solo', 'outro'].filter(function (x) { return g.sections.indexOf(x) >= 0; })); };
  // The sections a pattern actually has (the three + any extra it carries), in tab order.
  songs.sectionsOf = function (p) {
    var sec = p && p.sections || {};
    return SECTIONS.concat(['solo', 'outro'].filter(function (x) { return Array.isArray(sec[x]) || (p && Array.isArray(p.arrangement) && p.arrangement.indexOf(x) >= 0); }));
  };
  songs.genre = function (genre) { var G = GG.content.genres || {}; return G[genre] || G.metal; };

  /* ---- Pattern helpers ------------------------------------------------------------------------------ */
  function lane(sec, i) { var s = sec && sec[i]; return typeof s === 'string' && s.length === STEPS ? s : BLANK; }
  function on(str, i) { return str.charCodeAt(i) === 120; }   // 'x'
  function count(str) { var n = 0; for (var i = 0; i < STEPS; i++) if (on(str, i)) n++; return n; }
  function set(str, i, v) { return str.slice(0, i) + (v ? 'x' : '.') + str.slice(i + 1); }
  function kickPairs(str) { var n = 0; for (var i = 1; i < STEPS; i++) if (on(str, i) && on(str, i - 1)) n++; return n; }
  // Without a double-kick pedal one foot can't hit two 16ths in a row: keeps the earlier hit of each pair.
  function oneFoot(str) { for (var i = 1; i < STEPS; i++) if (on(str, i) && on(str, i - 1)) str = set(str, i, false); return str; }
  songs.kickBlocked = function (kickStr, step, gear) {
    if (gearOf(gear).doubleKick) return false;
    return (step > 0 && on(kickStr, step - 1)) || (step < STEPS - 1 && on(kickStr, step + 1));
  };
  songs.setHit = set;
  songs.isHit = on;
  songs.blankSection = function (lanes) { var a = []; for (var i = 0; i < lanes; i++) a.push(BLANK); return a; };
  function hitsIn(sec, lanes) { var n = 0; for (var l = 0; l < lanes; l++) n += count(lane(sec, l)); return n; }
  // Jaccard similarity of two sets of hits (lists of lane strings); `skip` = lane index to ignore. Empty vs empty = 1.
  function jaccard(a, b, lanes, skip) {
    var inter = 0, union = 0;
    for (var l = 0; l < lanes; l++) {
      if (l === skip) continue;
      var x = lane(a, l), y = lane(b, l);
      for (var i = 0; i < STEPS; i++) { var p = on(x, i), q = on(y, i); if (p && q) inter++; if (p || q) union++; }
    }
    return union ? inter / union : 1;
  }
  // How much a bar repeats itself: first half vs second half, ignoring the crash lane. Empty = 0.
  function halves(sec, lanes) {
    var inter = 0, union = 0;
    for (var l = 0; l < lanes; l++) {
      if (l === CYM) continue;
      var s = lane(sec, l);
      for (var i = 0; i < STEPS / 2; i++) { var p = on(s, i), q = on(s, i + STEPS / 2); if (p && q) inter++; if (p || q) union++; }
    }
    return union ? inter / union : 0;
  }

  /* ---- Features of one bar (see the RULE doc in content/genres.js) ------------------------------------ */
  function features(sec, lanes, bpm, gear) {
    var k = lane(sec, KICK), s = lane(sec, SNARE), h = lane(sec, HAT), c = lane(sec, CYM);
    var t = lanes > TOMS ? lane(sec, TOMS) : BLANK, r = lanes > RIDE ? lane(sec, RIDE) : BLANK;
    var f = { bpm: bpm, kick: count(k), snare: count(s), cym: count(c), time: 0, hits: hitsIn(sec, lanes), effort: 0, odd: 0 };
    var s8 = 0, t8 = 0, t16 = 0, sOdd = 0, kOdd = 0;
    for (var i = 0; i < STEPS; i++) {
      var tm = on(h, i) || on(r, i) || on(c, i);
      if (on(h, i)) f.time++; if (on(r, i)) f.time++; if (on(c, i)) f.time++;
      if (i % 2 === 0) { if (tm) t8++; if (on(s, i)) s8++; }
      else { if (tm) t16++; if (on(s, i)) sOdd++; if (on(k, i)) kOdd++; }
    }
    for (var l = 0; l < lanes; l++) f.effort += count(lane(sec, l)) * LANE_EFFORT[l];
    if (!gearOf(gear).doubleKick) f.kick -= kickPairs(k);   // the band can only play one foot's worth
    f.kickDown = ((on(k, 0) ? 1 : 0) + (on(k, 8) ? 1 : 0)) / 2;
    f.backbeat = ((on(s, 4) ? 1 : 0) + (on(s, 12) ? 1 : 0)) / 2;
    f.hatBack = ((on(h, 4) ? 1 : 0) + (on(h, 12) ? 1 : 0)) / 2;
    f.snareOff = f.snare - f.backbeat * 2;
    f.snareOdd = sOdd;
    f.snare8 = s8 / 8; f.hat8 = t8 / 8; f.hat16 = t16 / 8;
    f.odd = kOdd + sOdd;
    // v0.8: with the double-kick pedal, kicks on the in-between 16ths are a run (both feet, locked), not syncopation.
    f.sync = (gearOf(gear).doubleKick ? sOdd : f.odd) / Math.max(1, count(k) + f.snare);
    f.steady = halves(sec, lanes);
    return f;
  }
  function ruleScore(rule, f, gear) {
    if (rule.any) return Math.max.apply(null, rule.any.map(function (r) { return ruleScore(r, f, gear); }));
    var v = f[rule.f], lo = gear.doubleKick && rule.loDK != null ? rule.loDK : rule.lo;
    if (v >= lo && v <= rule.hi) return 1;
    return Math.max(0, 1 - (v < lo ? lo - v : v - rule.hi) / (rule.soft || 1));
  }
  // Groove of one bar, 0..1: genre fit x tightness x fullness, plus tips for what cost the most.
  var TIGHT_TIPS = { sync: 'Too jumpy: lock the kick and snare to the beat.', steady: 'It wanders. Make the second half echo the first.',
    empty: 'Too empty. Fill in a beat first.' };
  function barGroove(G, f, gear, tips, weight) {
    var sum = 0, tot = 0;
    G.groove.forEach(function (r) {
      var sc = ruleScore(r, f, gear);
      sum += sc * r.w; tot += r.w;
      if (sc < 0.8) tip(tips, r.tip, (1 - sc) * r.w * weight);
    });
    var syncSc = f.sync <= G.sync ? 1 : Math.max(0, 1 - (f.sync - G.sync) / 0.3);
    var steadySc = U.clamp((f.steady - 0.2) / 0.5, 0, 1);
    var full = Math.min(1, f.hits / 8);
    if (syncSc < 0.8) tip(tips, TIGHT_TIPS.sync, (1 - syncSc) * 3 * weight);
    if (steadySc < 0.8) tip(tips, TIGHT_TIPS.steady, (1 - steadySc) * 3 * weight);
    if (full < 1) tip(tips, TIGHT_TIPS.empty, (1 - full) * 12 * weight);
    var tight = U.clamp(1 - 0.4 * (1 - syncSc) - 0.4 * (1 - steadySc), 0.2, 1);
    return (tot ? sum / tot : 0) * tight * full;
  }
  function tip(tips, text, cost) { if (text && cost > 0) tips[text] = (tips[text] || 0) + cost; }

  // Hook, 0..1: the chorus should contrast with the verse (sweet spot, not a copy, not unrelated noise) and be catchy
  // (repeats itself, crash on the downbeat, at least as big as the verse).
  function hookOf(p, lanes, tips) {
    var v = p.sections.verse, c = p.sections.chorus;
    var d = 1 - jaccard(v, c, lanes, -1), vh = hitsIn(v, lanes), ch = hitsIn(c, lanes);
    var contrast = d < 0.05 ? 0 : d < 0.25 ? (d - 0.05) / 0.2 : d <= 0.6 ? 1 : 1 - 0.8 * (d - 0.6) / 0.4;
    var rep = U.clamp((halves(c, lanes) - 0.2) / 0.6, 0, 1);
    var accent = on(lane(c, CYM), 0) || (lanes > RIDE && on(lane(c, RIDE), 0)) ? 1 : 0;
    var lift = vh ? Math.min(1, ch / vh) : ch ? 1 : 0;
    if (d < 0.1 && ch) tip(tips, 'Chorus is a copy of the verse. Change it up.', 5);
    if (d > 0.8 && ch && vh) tip(tips, 'Chorus sounds unrelated to the verse. Keep something in common.', 3);
    if (!accent && ch) tip(tips, 'Crash on the chorus downbeat: instant hook.', 1.6);
    if (rep < 0.6 && ch) tip(tips, 'Make the chorus repeat itself: same first and second half.', 2);
    if (!ch) tip(tips, 'The chorus is empty. Give it something to shout over.', 8);
    return (0.45 * contrast + 0.3 * rep + 0.15 * accent + 0.1 * lift) * Math.min(1, ch / 8);
  }

  // v0.8 hook extras (0..~0.16): a tom fill into the chorus (lane 5), a ride/china chorus over a hat verse (lane 6), a song
  // that ends on an outro, a solo after the first chorus. Patterns with 4 lanes and no extras score exactly as before.
  function extrasHook(p, lanes, X) {
    var h = 0, arr = p.arrangement, c = p.sections.chorus, v = p.sections.verse;
    if (lanes > TOMS) {
      var tomsFill = [p.sections.verse, p.sections.bridge].some(function (sec) { var t = lane(sec, TOMS); for (var i = 12; i < STEPS; i++) if (on(t, i)) return true; return false; });
      if (tomsFill) h += X.fillHook / 100;
    }
    if (lanes > RIDE && count(lane(c, RIDE)) >= 4 && count(lane(v, RIDE)) < count(lane(c, RIDE))) h += X.rideHook / 100;
    if (arr.length > 1 && arr[arr.length - 1] === 'outro' && arr.indexOf('outro') === arr.length - 1) h += X.outroHook / 100;
    var solo = arr.indexOf('solo');
    if (solo > 0 && arr.slice(0, solo).indexOf('chorus') >= 0) h += X.soloHook / 100;
    return h;
  }

  // Rates a pattern for a genre. Pure and deterministic (same pattern => same numbers, node or browser).
  // -> { groove, hook, difficulty (0..100 ints), notes (hits in the whole song), tips: [1-2 plain hints], sections }
  songs.rate = function (pattern, genre, gear) {
    var G = songs.genre(genre), g = gearOf(gear), p = songs.sanitize(pattern, g, null, true), lanes = p.lanes, X = SH().songs;
    var tips = {}, per = {}, feats = {}, names = songs.sectionsOf(p);
    names.forEach(function (name) { feats[name] = features(p.sections[name], lanes, p.bpm, g); });
    var sumG = 0, sumW = 0, effort = 0, odd = 0, notes = 0;
    p.arrangement.forEach(function (name) {   // bridges (breakdowns, solo spots), v0.8 outros and solos count half toward the groove
      var w = name === 'bridge' ? 0.5 : name === 'outro' ? X.outroWeight : name === 'solo' ? X.soloWeight : 1, f = feats[name];
      per[name] = barGroove(G, f, g, tips, w);
      sumG += per[name] * w; sumW += w;
      effort += name === 'solo' ? f.effort / 2 : f.effort; odd += f.odd; notes += f.hits * BARS;   // a solo: you lay back
    });
    var n = p.arrangement.length || 1;
    var raw = (effort / n + 0.6 * odd / n) * p.bpm / 120;
    var hook = Math.min(1, hookOf(p, lanes, tips) + extrasHook(p, lanes, X));
    var list = Object.keys(tips).sort(function (a, b) { return tips[b] - tips[a] || (a < b ? -1 : 1); });
    var sections = {};
    names.forEach(function (name) { sections[name] = Math.round(100 * (per[name] != null ? per[name] : barGroove(G, feats[name], g, {}, 0))); });
    return { groove: Math.round(100 * (sumW ? sumG / sumW : 0)), hook: Math.round(100 * hook),
      difficulty: Math.round(100 * (1 - Math.exp(-raw / 28))), notes: notes, tips: list.slice(0, 2), sections: sections };
  };
  // A one-word verdict for a groove score ("Neck-snapping.").
  songs.verdict = function (genre, groove) {
    var r = songs.genre(genre).reactions || {};
    return groove >= 85 ? r.great : groove >= 70 ? r.good : groove >= 45 ? r.meh : r.bad;
  };

  /* ---- Validation ------------------------------------------------------------------------------------ */
  // Problems with a pattern for this gear ([] = fine). The UI never lets these happen; the sim sanitizes.
  songs.validate = function (p, gear) {
    var g = gearOf(gear), errs = [];
    if (!p || typeof p !== 'object') return ['not a pattern'];
    if (!(p.bpm >= 30 && p.bpm <= 300)) errs.push('tempo out of range');
    if (!(p.lanes >= 1 && p.lanes <= g.lanes)) errs.push('the kit has ' + g.lanes + ' lanes');
    var allowed = songs.allSections(g);
    if (!Array.isArray(p.arrangement) || !p.arrangement.length || p.arrangement.some(function (s) { return allowed.indexOf(s) < 0; })) errs.push('bad arrangement');
    EXTRAS.forEach(function (name) {
      var used = (p.sections && p.sections[name] != null) || (Array.isArray(p.arrangement) && p.arrangement.indexOf(name) >= 0);
      if (used && g.sections.indexOf(name) < 0) errs.push(name + ': not unlocked yet');
    });
    SECTIONS.concat(EXTRAS.filter(function (x) { return g.sections.indexOf(x) >= 0 && ((p.sections && p.sections[x] != null) || (Array.isArray(p.arrangement) && p.arrangement.indexOf(x) >= 0)); })).forEach(function (name) {
      var sec = p.sections && p.sections[name];
      if (!Array.isArray(sec) || sec.length !== p.lanes || sec.some(function (s) { return !/^[x.]{16}$/.test(s); })) { errs.push(name + ': bad lanes'); return; }
      if (!g.doubleKick && kickPairs(sec[KICK])) errs.push(name + ': two kicks in a row need a double-kick pedal');
    });
    return errs;
  };
  // A clean copy that passes validate(): pads/truncates lanes, fixes the arrangement, clamps the tempo into the
  // genre range (genre null: 30..300) and drops back-to-back kicks without the pedal (loose: keep them, for rating).
  songs.sanitize = function (p, gear, genre, loose) {
    var g = gearOf(gear), src = p && typeof p === 'object' ? p : {};
    var range = genre ? songs.genre(genre).tempo : [30, 300];
    var bpm = Math.round(U.clamp(Number(src.bpm) || (genre ? range[2] : 120), range[0], range[1]));
    var lanes = loose ? Math.max(1, Math.min(C.LANES.length, src.lanes || g.lanes)) : g.lanes;
    var out = { bpm: bpm, lanes: lanes, sections: {}, arrangement: [] };
    var srcArr = Array.isArray(src.arrangement) ? src.arrangement : [];
    // v0.8: an extra section survives when it's used (in sections or the arrangement) and owned (loose: always).
    var extras = EXTRAS.filter(function (x) {
      return (loose || g.sections.indexOf(x) >= 0) && ((src.sections && Array.isArray(src.sections[x])) || srcArr.indexOf(x) >= 0);
    });
    SECTIONS.concat(extras).forEach(function (name) {
      var sec = src.sections && src.sections[name], clean = [];
      for (var l = 0; l < lanes; l++) {
        var s = sec && typeof sec[l] === 'string' ? sec[l].replace(/[^x]/g, '.').slice(0, STEPS) : '';
        s = (s + BLANK).slice(0, STEPS);
        clean.push(l === KICK && !g.doubleKick && !loose ? oneFoot(s) : s);
      }
      out.sections[name] = clean;
    });
    var ok = SECTIONS.concat(extras);
    var arr = srcArr.filter(function (s) { return ok.indexOf(s) >= 0; });
    out.arrangement = arr.length ? arr.slice(0, 16) : songs.ARRANGEMENTS.classic.slice();
    return out;
  };

  /* ---- Making patterns --------------------------------------------------------------------------------- */
  function padBar(bar, lanes) { var a = []; for (var l = 0; l < lanes; l++) a.push(bar[l] || BLANK); return a; }
  // Flips a hit or two on the kick/hat lanes so jams aren't copies of the library.
  function mutate(bar, rng, wild) {
    var n = rng.chance(wild) ? rng.int(1, 2) : 0;
    for (var i = 0; i < n; i++) {
      var l = rng.pick([KICK, KICK, HAT, CYM]), step = rng.int(0, STEPS - 1);
      bar[l] = set(bar[l], step, !on(bar[l], step));
    }
  }
  // A decent genre pattern: library bars (content/genres.js parts) with a little randomness.
  // opts: { gear, wild: 0..1 (chance each section gets a mutation, default 0.35), arrangement: id }
  songs.generate = function (genre, rng, opts) {
    opts = opts || {};
    var G = songs.genre(genre), g = gearOf(opts.gear), wild = opts.wild != null ? opts.wild : 0.35;
    var arrId = opts.arrangement || rng.weighted(songs.ARRANGEMENT_IDS, function (id) { return id === 'classic' ? 2 : 1; });
    var p = { bpm: 5 * Math.round(rng.int(G.jamTempo[0], G.jamTempo[1]) / 5), lanes: g.lanes, sections: {},
      arrangement: songs.ARRANGEMENTS[arrId].slice() };
    SECTIONS.forEach(function (name) {
      var bar = padBar(rng.pick(G.parts[name]), g.lanes);
      mutate(bar, rng, wild);
      p.sections[name] = bar;
    });
    if (g.lanes > TOMS || g.doubleKick || g.sections.length) jamGear(p, g, rng, genre);   // v0.8: only with new gear (old RNG draws unchanged)
    return songs.sanitize(p, g, genre);
  };
  // v0.8: a band jam uses the gear you bought: a tom fill into the chorus, the ride on the chorus, a double-kick run (for
  // genres whose groove asks for more kick with the pedal), an outro at the end, Dana's solo before the last chorus.
  function jamGear(p, g, rng, genre) {
    var J = SH().jam;
    if (g.lanes > TOMS && rng.chance(J.tomFill)) {
      var sec = rng.chance(0.5) ? 'verse' : 'bridge', t = p.sections[sec][TOMS];
      [12, 13, 14, 15].forEach(function (i) { if (i % 2 === 0 || rng.chance(0.5)) t = set(t, i, true); });
      p.sections[sec][TOMS] = t;
    }
    if (g.lanes > RIDE && rng.chance(J.ride)) {
      var c = p.sections.chorus, hat = c[HAT];
      c[RIDE] = count(hat) >= 4 ? hat : 'x.x.x.x.x.x.x.x.';
      c[HAT] = BLANK;
    }
    var rule = (songs.genre(genre).groove || []).filter(function (r) { return r.f === 'kick' && r.loDK != null; })[0];
    if (g.doubleKick && rule) SECTIONS.forEach(function (name) {   // the genre wants more kick once you own the pedal
      if (count(p.sections[name][KICK]) < rule.loDK && rng.chance(J.pedalRun)) p.sections[name][KICK] = rng.chance(0.5) ? 'xxxxxxxxxxxxxxxx' : 'x.xxx.xxx.xxx.xx';
    });
    var arr = p.arrangement;
    if (g.sections.indexOf('solo') >= 0 && rng.chance(J.solo)) {
      p.sections.solo = songs.extraBar(p, 'solo');
      var last = arr.lastIndexOf('chorus');
      if (last > 0) arr.splice(last, 0, 'solo'); else arr.push('solo');
    }
    if (g.sections.indexOf('outro') >= 0 && rng.chance(J.outro)) { p.sections.outro = songs.extraBar(p, 'outro'); arr.push('outro'); }
  }
  // The default bar for a new extra section, derived from the song: an outro = the chorus with hats on the beat and a crash
  // on the one (the last chord rings); a solo = a stripped kit under the lead (the verse's kick, snare 2 + 4, time on the
  // beat, a crash on the one). Live, the solo's chart keeps only quarter notes anyway (Dana has the spotlight).
  songs.extraBar = function (p, name) {
    var lanes = p.lanes || 4, src = name === 'outro' ? p.sections.chorus : p.sections.verse, bar = [];
    for (var l = 0; l < lanes; l++) {
      var s = lane(src, l);
      if (name === 'outro') {
        if (l === HAT || l === RIDE) { var th = ''; for (var i = 0; i < STEPS; i++) th += on(s, i) && i % 4 === 0 ? 'x' : '.'; s = th; }
        if (l === CYM) s = set(BLANK, 0, true);
      } else {
        s = l === KICK ? (count(s) ? s : 'x.......x.......') : l === SNARE ? '....x.......x...' : l === CYM ? set(BLANK, 0, true)
          : (l === HAT || l === RIDE) && count(s) ? 'x...x...x...x...' : BLANK;
      }
      bar.push(s);
    }
    return bar;
  };
  // Adds an owned extra section (its derived bar, unless the pattern has one) and places it in the song: a solo before the
  // last chorus, an outro at the end. Pure: returns a new sanitized PATTERN.
  songs.addSection = function (p, name, gear) {
    var g = gearOf(gear), out = songs.sanitize(U.clone(p), g);
    if (EXTRAS.indexOf(name) < 0 || g.sections.indexOf(name) < 0) return out;
    if (!out.sections[name]) out.sections[name] = songs.extraBar(out, name);
    if (out.arrangement.indexOf(name) < 0) out.arrangement = songs.withExtras(out.arrangement, g, name === 'solo' ? { solo: true } : { outro: true });
    return songs.sanitize(out, g);
  };
  songs.removeSection = function (p, name) {
    var out = U.clone(p);
    if (EXTRAS.indexOf(name) < 0) return out;
    if (out.sections) delete out.sections[name];
    out.arrangement = (out.arrangement || []).filter(function (x) { return x !== name; });
    if (!out.arrangement.length) out.arrangement = songs.ARRANGEMENTS.classic.slice();
    return out;
  };
  // An arrangement plus the owned extras: opts { solo: true, outro: true } (default: both when owned). Pure.
  songs.withExtras = function (arr, gear, opts) {
    var g = gearOf(gear), out = (arr || []).filter(function (x) { return SECTIONS.indexOf(x) >= 0 || g.sections.indexOf(x) >= 0; });
    opts = opts || { solo: true, outro: true };
    if (opts.solo && g.sections.indexOf('solo') >= 0 && out.indexOf('solo') < 0) {
      var last = out.lastIndexOf('chorus');
      if (last > 0) out.splice(last, 0, 'solo'); else out.push('solo');
    }
    if (opts.outro && g.sections.indexOf('outro') >= 0 && out.indexOf('outro') < 0) out.push('outro');
    return out.slice(0, 16);
  };
  // The fixed teaching pattern for the first Write (a plain beat the tips improve on).
  songs.starter = function (genre, gear) { return songs.sanitize(U.clone(songs.genre(genre).starter), gear, genre); };
  songs.signature = function (genre, gear) { return songs.sanitize(U.clone(songs.genre(genre).signature), gear, genre); };
  // Deterministic pattern for a song that never had one (v0.1 saves, starter songs): seeded by career + song id.
  songs.patternFor = function (state, key) {
    return songs.generate(state.genre || 'metal', GG.RNG(GG.hashSeed((state.seed || 1) + '|' + key)), { gear: state.gear });
  };

  // 0..1 how alike two patterns are, section by section (v0.5 reviews flag recycled drum patterns).
  songs.similarity = function (a, b) {
    var pa = songs.sanitize(a && a.pattern || a, null, null, true), pb = songs.sanitize(b && b.pattern || b, null, null, true);
    var lanes = Math.max(pa.lanes, pb.lanes), sum = 0;
    SECTIONS.forEach(function (name) { sum += jaccard(pa.sections[name], pb.sections[name], lanes, -1); });
    return Math.round(sum / SECTIONS.length * 1000) / 1000;
  };

  // Every hit of a song in order: [{ beat, lane, section, entry, bar, step }] (beat = quarter notes from the start).
  // v0.3 builds gig charts from this. Count = sum over arrangement entries of (hits in that section x BARS_PER_SECTION).
  songs.toNotes = function (x) {
    var p = songs.sanitize(x && x.pattern || x, null, null, true), out = [], beat = 0;
    p.arrangement.forEach(function (name, entry) {
      var sec = p.sections[name];
      for (var bar = 0; bar < BARS; bar++, beat += 4) {
        for (var step = 0; step < STEPS; step++) {
          for (var l = 0; l < p.lanes; l++) {
            if (on(sec[l], step)) out.push({ beat: beat + step / 4, lane: C.LANES[l], section: name, entry: entry, bar: bar, step: step });
          }
        }
      }
    });
    return out;
  };
  songs.beats = function (p) { return (p.arrangement || []).length * BARS * 4; };
  songs.seconds = function (p) { return songs.beats(p) * 60 / (p.bpm || 120); };

  /* ---- Titles ------------------------------------------------------------------------------------------ */
  // Used only when content/song_titles.js is missing.
  var FALLBACK_TITLES = {
    metal: [{ fr: 'Ma Pelouse, Mon Tombeau', en: 'My Lawn, My Tomb' }, { fr: 'Arrosage Interdit', en: 'Watering Ban' },
      { fr: 'Chiendent Sanglant', en: 'Bloody Crabgrass' }],
    punk: ['Council Meeting (Is a Lie)'], rock: ['Leather Pants at Minus Forty'], country: ['My Truck Is in the Condo Lot']
  };
  var ROMAN = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  // Content entries may be { fr, en }, { title, titleEn } or plain strings.
  function norm(t) {
    if (typeof t === 'string') return { title: t, titleEn: t };
    return { title: t.fr || t.title || '???', titleEn: t.en || t.titleEn || t.fr || t.title || '???' };
  }
  function titlePool(genre) {
    var st = GG.content.songTitles, list = st && st[genre] && st[genre].length ? st[genre] : FALLBACK_TITLES[genre];
    return (list || FALLBACK_TITLES.metal).map(norm);
  }
  // A fresh title from the genre pool; once every title is used, sequels: "Ma Pelouse, Mon Tombeau II".
  // `taken` (optional) = extra titles to avoid, e.g. songs queued in the UI.
  songs.pickTitle = function (state, rng, taken) {
    var used = {}, pool = titlePool(state.genre);
    state.songs.concat(state.pendingSongs || []).forEach(function (s) { if (s && s.title) used[s.title] = true; });
    (taken || []).forEach(function (t) { used[t] = true; });
    var fresh = pool.filter(function (t) { return !used[t.title]; });
    if (fresh.length) return rng.pick(fresh);
    var base = rng.pick(pool);
    for (var i = 0; i < ROMAN.length; i++) {
      if (!used[base.title + ' ' + ROMAN[i]]) return { title: base.title + ' ' + ROMAN[i], titleEn: base.titleEn + ' ' + ROMAN[i] };
    }
    return { title: base.title + ' ' + (state.songs.length + 1), titleEn: base.titleEn + ' ' + (state.songs.length + 1) };
  };

  /* ---- Songs in the career --------------------------------------------------------------------------- */
  function nextId(state) {
    var max = 0;
    state.songs.forEach(function (s) { var n = parseInt(String(s.id).slice(1), 10); if (n > max) max = n; });
    return 's' + (max + 1);
  }
  function avgSkill(state) {
    var act = state.members.filter(function (m) { return m.status === 'active'; });
    if (!act.length) return 0;
    return act.reduce(function (t, m) { return t + m.skill; }, 0) / act.length;
  }
  // The hardest song (difficulty 0..100) the band can play cleanly right now.
  songs.ability = function (state) {
    var e = E();
    return Math.round(e.abilityBase + avgSkill(state) * e.abilitySkill + state.drumSkill * e.abilityDrum);
  };
  // The band's share of a new song's quality (skill, your chops, chemistry), from the Write activity numbers.
  function bandPart(state) {
    var A = GG.content.activities.write;
    return A.qualityBase + avgSkill(state) * A.qualitySkill + state.drumSkill * A.qualityDrum + state.chemistry * A.qualityChem;
  }
  songs.byId = function (state, id) {
    for (var i = 0; i < state.songs.length; i++) if (state.songs[i].id === id) return state.songs[i];
    return null;
  };

  // Adds a song built from `pattern` to the catalog. quality = band part + craft (groove, hook, a little flash)
  // - a penalty when it's harder than the band can play (it also starts rougher) - the same-week repeat penalty.
  // opts: { rng, titleEn, auto, repeatFactor, noise, polish, quality (keep this quality), written }
  songs.create = function (state, pattern, title, opts) {
    opts = opts || {};
    var e = E(), A = GG.content.activities.write, gear = gearOf(state.gear);
    var rng = opts.rng || GG.RNG(GG.hashSeed((state.seed || 1) + '|song|' + state.songs.length));
    var p = songs.sanitize(pattern, gear, state.genre), r = songs.rate(p, state.genre, gear);
    var t = title ? { title: String(title).slice(0, 60), titleEn: String(opts.titleEn || title).slice(0, 80) } : songs.pickTitle(state, rng);
    var f = opts.repeatFactor != null ? opts.repeatFactor : 1;
    var over = Math.max(0, r.difficulty - songs.ability(state));
    var craft = 0.6 * r.groove + 0.3 * r.hook + 0.1 * r.difficulty;
    var q = opts.quality != null ? opts.quality
      : bandPart(state) + (craft - e.craftPivot) * e.craftWeight - over * e.overPenalty - (1 - f) * A.repeatPenalty + (opts.noise || 0)
        + (GG.shop ? GG.shop.writeBonus(state) : 0);   // v0.8: kit quality, the pro studio, the Christmas lights
    var polish = opts.polish != null ? opts.polish : rng.int(A.polish[0], A.polish[1]) - over * e.overPolish;
    var song = { id: nextId(state), title: t.title, titleEn: t.titleEn, written: opts.written != null ? opts.written : state.totalWeek,
      pattern: p, rating: { groove: r.groove, hook: r.hook, difficulty: r.difficulty },
      quality: U.clamp(Math.round(q), 1, 100), polish: U.clamp(Math.round(polish), 0, 100),
      plays: 0, lastPlayed: null, stale: 0, hits: 0, classic: false, auto: !!opts.auto };
    state.songs.push(song);
    return song;
  };
  // Write block with nothing composed: the band jams one out (bots always take this path).
  songs.jam = function (state, rng, opts) {
    opts = opts || {};
    var A = GG.content.activities.write, p = songs.generate(state.genre, rng, { gear: state.gear });
    var noise = rng.range(A.qualityNoise[0], A.qualityNoise[1]);
    var song = songs.create(state, p, null, { rng: rng, auto: true, noise: noise, repeatFactor: opts.repeatFactor });
    state.stats.songsWritten++;
    return song;
  };
  // Starter songs that come with the band (newCareer). t = { title, titleEn } (or { fr, en }). Their patterns are
  // seeded by the title so the career RNG sequence (and v0.1 balance) is unchanged.
  songs.addStarter = function (state, t, rng) {
    var Ec = GG.content.economy, n = norm(t);
    return songs.create(state, songs.patternFor(state, n.title), n.title, { titleEn: n.titleEn, auto: true, written: 0,
      quality: rng.int(Ec.starterSongQuality[0], Ec.starterSongQuality[1]), polish: Ec.starterSongPolish });
  };

  // Ranking used for setlists: quality matters most, polish shows on stage, stale songs bore the crowd.
  songs.score = function (song) {
    var w = GG.content.economy.gig.songScore, e = E();
    return song.quality * w.quality + song.polish * w.polish - (song.stale || 0) * e.staleWeight + (song.classic ? e.classicBonus : 0);
  };
  // The n best songs (stable: earlier songs win ties).
  songs.best = function (state, n) {
    var list = state.songs.map(function (s, i) { return { s: s, i: i, v: songs.score(s) }; });
    list.sort(function (a, b) { return b.v - a.v || a.i - b.i; });
    return list.slice(0, n == null ? list.length : n).map(function (o) { return o.s; });
  };
  // Rehearsal polish: adds `amount` to up to `count` (default 3) of the highest-quality songs not yet at 100.
  songs.polish = function (state, amount, count) {
    var todo = state.songs.filter(function (s) { return s.polish < 100; });
    todo.sort(function (a, b) { return b.quality - a.quality; });
    todo = todo.slice(0, count == null ? 3 : count);
    todo.forEach(function (s) { s.polish = U.clamp(s.polish + amount, 0, 100); });
    return todo;
  };
  // A gig played these songs: plays, stale, hits (A/S gigs) and classics. Returns the songs that just became classics.
  songs.played = function (state, ids, grade) {
    var e = E(), great = e.classicGrades.indexOf(grade) >= 0, fresh = [];
    (ids || []).forEach(function (id) {
      var s = songs.byId(state, id); if (!s) return;
      s.plays++; s.lastPlayed = state.totalWeek;
      s.stale = U.clamp((s.stale || 0) + (s.classic ? e.stalePerPlay / 2 : e.stalePerPlay), 0, 100);
      if (great) s.hits = (s.hits || 0) + 1;
      if (!s.classic && s.hits >= e.classicHits) { s.classic = true; fresh.push(s); }
    });
    return fresh;
  };
  // Week wrap: songs that weren't played this week freshen up.
  songs.weekly = function (state) {
    var e = E();
    state.songs.forEach(function (s) { if (s.stale > 0 && s.lastPlayed !== state.totalWeek) s.stale = Math.max(0, s.stale - e.staleDecay); });
  };

  // Band reactions to a new song (career RNG; lines in content/lines.js songReactions): Marcel names it in French,
  // Dana wants room for a solo, Jaxon sneaks fills into simple parts, Kenji nods at a great one.
  var FALLBACK_REACT = { name: ['I have named it:'], noSolo: ['Where does my solo go?'], fills: ['i added a fill. you will not notice'],
    great: ['(A nod.)'], solo: ['A solo section. In a song. You have made me very happy.', 'Eight bars. I will make them count. All of them. At once.'] };
  songs.reactions = function (state, song, rng) {
    var L = (GG.content.lines && GG.content.lines.songReactions) || {}, out = [];
    function active(id) { return state.members.some(function (m) { return m.id === id && m.status === 'active'; }); }
    function say(id, key) {
      if (!active(id)) return;
      var pool = L[id] && L[id][key];
      out.push({ who: id, text: GG.career.pickLine(state, rng, pool && pool.length ? pool : null, FALLBACK_REACT[key]) });
    }
    var p = song.pattern, r = song.rating;
    var bridge = p.arrangement.indexOf('bridge') >= 0 ? hitsIn(p.sections.bridge, p.lanes) : -1;
    if (active('marcel')) { say('marcel', 'name'); out[out.length - 1].text += ' “' + song.title + '”.'; }
    if (p.arrangement.indexOf('solo') >= 0) say('dana', 'solo');   // v0.8: a real solo section
    else if (bridge < 0 || bridge >= 22) say('dana', 'noSolo');
    if (r.difficulty < 40) say('jaxon', 'fills');
    if (song.quality >= 60 || (r.groove >= 85 && r.hook >= 70)) say('kenji', 'great');
    return out;
  };

  /* ---- v0.6.2 songwriter: groove presets + one-tap modifiers (content/grooves.js) --------------------------- */
  // grooves(genre) -> { presets, mods, tempo, coach } ; presets(genre, gear) -> [{ id, name, desc, signature, pedal,
  // locked (needs the pedal you don't own), bar (sanitized for the gear) }] ; applyPreset(p, section, id, gear, genre) -> new
  // PATTERN with that section set (genre default: the career's) ; modify(p, section, modId, gear, genre) -> { pattern, before, after } (ratings; pure,
  // deterministic) ; tempoLabel(genre, bpm) -> 'Headbang'.. ; presetOf(p, section, genre, gear) -> preset id | null.
  var LANE_IX = { kick: KICK, snare: SNARE, hat: HAT, cymbal: CYM, toms: TOMS, ride: RIDE };
  songs.grooves = function (genre) { var G = GG.content.grooves || {}; return G[genre] || G.metal || { presets: [], mods: [], tempo: [] }; };
  function presetBar(pr, g) {
    var bar = padBar(pr.bar, g.lanes);
    return songs.sanitize({ bpm: 120, lanes: g.lanes, sections: { verse: bar, chorus: bar, bridge: bar }, arrangement: ['verse'] }, g).sections.verse;
  }
  songs.presets = function (genre, gear) {
    var g = gearOf(gear);
    return songs.grooves(genre).presets.map(function (pr) {
      return { id: pr.id, name: pr.name, desc: pr.desc, signature: !!pr.signature, pedal: !!pr.pedal, locked: !!pr.pedal && !g.doubleKick, bar: presetBar(pr, g) };
    });
  };
  songs.applyPreset = function (p, section, id, gear, genre) {
    var g = gearOf(gear), out = songs.sanitize(U.clone(p), g), pr = null;
    songs.grooves(genre || (GG.state && GG.state.genre) || 'metal').presets.forEach(function (x) { if (x.id === id) pr = x; });
    if (pr && (SECTIONS.indexOf(section) >= 0 || out.sections[section])) out.sections[section] = padBar(presetBar(pr, g), out.lanes).slice(0, out.lanes);
    return out;
  };
  songs.presetOf = function (p, section, genre, gear) {
    var sec = p && p.sections && p.sections[section], hit = null;
    if (!sec) return null;
    songs.presets(genre, gear).forEach(function (pr) {
      if (!hit && pr.bar.every(function (str, l) { return lane(sec, l) === str; })) hit = pr.id;
    });
    return hit;
  };
  function applyOp(bar, op, g, out, genre) {
    var lanes = op.lane === 'all' ? bar.map(function (_, i) { return i; }) : [LANE_IX[op.lane]];
    lanes.forEach(function (l) {
      if (l == null || l >= bar.length) return;
      var s = bar[l], i;
      if (op.op === 'fill') { for (i = op.from || 0; i < STEPS; i += op.every) s = set(s, i, true); }
      else if (op.op === 'pedal') { for (i = 0; i < STEPS; i += g.doubleKick ? 1 : 2) s = set(s, i, true); }
      else if (op.op === 'hits') op.steps.forEach(function (i) { s = set(s, i, true); });
      else if (op.op === 'clear') { if (op.steps) op.steps.forEach(function (i) { s = set(s, i, false); }); else s = BLANK; }
      else if (op.op === 'thin') { for (i = 0; i < STEPS; i++) if (i % op.keep) s = set(s, i, false); }
      bar[l] = s;
    });
    if (op.op === 'mirror') for (var l = 0; l < bar.length; l++) bar[l] = bar[l].slice(0, 8) + bar[l].slice(0, 8);
    if (op.op === 'bpm') { var r = songs.genre(genre).tempo; out.bpm = U.clamp(5 * Math.round((out.bpm + op.by) / 5), r[0], r[1]); }
  }
  songs.modify = function (p, section, modId, gear, genre) {
    var g = gearOf(gear), out = songs.sanitize(U.clone(p), g), mod = null;
    songs.grooves(genre).mods.forEach(function (m) { if (m.id === modId) mod = m; });
    var before = songs.rate(out, genre, g);
    if (mod && (SECTIONS.indexOf(section) >= 0 || out.sections[section])) {
      var bar = out.sections[section].slice();
      mod.ops.forEach(function (op) { applyOp(bar, op, g, out, genre); });
      out.sections[section] = bar;
      out = songs.sanitize(out, g);
    }
    return { pattern: out, before: before, after: songs.rate(out, genre, g) };
  };
  songs.tempoLabel = function (genre, bpm) {
    var t = songs.grooves(genre).tempo || [], lab = '';
    t.forEach(function (x) { if (bpm >= x[0]) lab = x[1]; });
    return lab;
  };

  GG.registerDebug('songs', function () {
    var s = GG.state; if (!s) return { songs: 0 };
    var top = songs.best(s, 3);
    return { songs: s.songs.length, pending: (s.pendingSongs || []).length, draft: !!s.draft,
      best: top.map(function (x) { return x.title + ' q' + x.quality + ' p' + x.polish + ' s' + (x.stale || 0); }) };
  });
})(window.GG);
