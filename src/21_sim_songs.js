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
//               plays, lastPlayed, stale, hits, classic, auto, fr? (true = Marcel snuck in a French title; v0.7.2) }
// v0.7.2 titles: English by default; pickTitle lets Marcel sneak in the French original ~1 in 8 (FR_CHANCE, seeded per
// career + song slot, never drawing from the career RNG). englishFor/isFrench/frenchTitles; migrateTitles (chained onto
// GG.save.migrate, no schema bump) renames old saves' French titles to English everywhere a song title is stored.
// v0.9: reactions(state, song, rng) by role (band.roles.namer names it, gig.roles solo/fill, band.roles.deadpan nods) +
//   lines.songReactions[id].custom [{ when: 'difficultyHigh'|'similarityHigh'|'any', text }] ; namerFr(state) (the French
//   title gag only when the namer has French titles).
// v1.1 "Seats" (plan_contract_1.1 §4.4): PATTERN.part (string seats; songs.part.*: ROWS, key, choices, suggest, sanitize,
//   full, toggle, pick, MODS, modify, notes) ; sanitize keeps a part ; rate blends your part in (PART_WEIGHT; rate().part =
//   { groove, hook, tips }) ; partRating ; similarity scales by how alike the parts are ; create gives a string seat's song
//   its part (a seeded suggestion per song id when none was written) ; reactions add the swapped drummer's kit line and a
//   bandmate's bySeat line (own seed).
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
    var hookD = hookOf(p, lanes, tips), groove = sumW ? sumG / sumW : 0;
    // v1.1: a string seat's song also rates your part (seat signatures per genre): groove, hook contrast and difficulty
    // blend in by PART_WEIGHT; notes = your part's notes. A drum pattern (no part) rates exactly as before.
    var ptips = {}, pr = p.part ? rateWithPart(p, genre, ptips, X) : null, PW = songs.PART_WEIGHT;
    Object.keys(ptips).forEach(function (k) { tips[k] = (tips[k] || 0) + ptips[k]; });
    if (pr) {
      groove = groove * (1 - PW.groove) + pr.groove * PW.groove;
      hookD = hookD * (1 - PW.hook) + pr.hook * PW.hook;
      raw = raw * (1 - PW.difficulty) + pr.raw * PW.difficulty;
      notes = pr.notes;
    }
    var hook = Math.min(1, hookD + extrasHook(p, lanes, X));
    var list = Object.keys(tips).sort(function (a, b) { return tips[b] - tips[a] || (a < b ? -1 : 1); });
    var sections = {};
    names.forEach(function (name) { sections[name] = Math.round(100 * (per[name] != null ? per[name] : barGroove(G, feats[name], g, {}, 0))); });
    var out = { groove: Math.round(100 * groove), hook: Math.round(100 * hook),
      difficulty: Math.round(100 * (1 - Math.exp(-raw / 28))), notes: notes, tips: list.slice(0, 2), sections: sections };
    if (pr) out.part = { groove: Math.round(100 * pr.groove), hook: Math.round(100 * pr.hook),
      tips: Object.keys(ptips).sort(function (a, b) { return ptips[b] - ptips[a] || (a < b ? -1 : 1); }).slice(0, 2) };   // your part's own tips (the part grid shows these)
    return out;
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
    if (src.part != null) { var pt = songs.part.sanitize(src.part, ok, genre); if (pt) out.part = pt; }   // v1.1: your part (string seats)
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
    var d = sum / SECTIONS.length;
    // v1.1: two parts for the same seat compare too (rows per section + the same progression / hook): a song is as recycled
    // as its drums only when your part is recycled too (a fresh part over an old beat reads 60 % as recycled).
    if (pa.part && pb.part && pa.part.seat === pb.part.seat) {
      var ps = 0, k = songs.part.key(pa.part.seat);
      SECTIONS.forEach(function (name) {
        var x = pa.part.sections[name], y = pb.part.sections[name];
        ps += 0.8 * jaccard(x.rows, y.rows, x.rows.length, -1) + (x[k] === y[k] ? 0.2 : 0);
      });
      d = d * (0.6 + 0.4 * ps / SECTIONS.length);
    }
    return Math.round(d * 1000) / 1000;
  };

  /* ---- v1.1 "Seats": your part (plan_contract_1.1 §4.4; handoff E6) ------------------------------------------------ */
  // PART = { seat: 'bass'|'rhythm'|'lead', sections: { <name>: { prog?|hook?: int, rows: [16-char 'x'/'.' rows] } } }:
  // bass 3 rows (root, fifth, octave), rhythm 2 (chug = palm-muted, open = ringing; both = an accent chord), lead 5 (the
  // hook's scale degrees low -> high). prog indexes backing.progressions[section] (bass, rhythm); hook indexes
  // backing.hooks[section] (lead; until genres.js has hooks, the progressions list stands in). Drum-seat songs never carry
  // a part, so every drum-seat number (sanitize, rate, similarity) is exactly v1.0's.
  //   part.ROWS ; part.key(seat) -> 'prog'|'hook' ; part.choices(genre, seat, section) -> [{ i, name }] (plain words) ;
  //   part.suggest(genre, seat, section, rng?) -> a section (deterministic without rng) ; part.sanitize(part, sections, genre) ;
  //   part.full(genre, seat, pattern, rng?) -> a PART for every section of the pattern ; part.toggle / pick (the grid) ;
  //   part.modify(pattern, section, modId, gear, genre) -> { pattern, before, after } (MODS: lock, double, ring, call) ;
  //   part.notes(part, section) -> [{ step, rows }] ; songs.partRating(pattern, genre) -> { groove, hook, notes } | null
  var PART_ROWS = { bass: 3, rhythm: 2, lead: 5 };
  var part = songs.part = {};
  part.ROWS = PART_ROWS;
  part.SEATS = ['bass', 'rhythm', 'lead'];
  part.ROW_NAMES = { bass: ['Root', 'Fifth', 'Octave'], rhythm: ['Chug', 'Open'], lead: ['Low', '2', '3', '4', 'High'] };
  part.key = function (seat) { return seat === 'lead' ? 'hook' : 'prog'; };
  function partList(genre, seat, section) {
    var B = songs.genre(genre || 'metal').backing || {}, P = B.progressions || {};
    var list = seat === 'lead' && B.hooks ? B.hooks[section] : P[section];
    if (!Array.isArray(list) || !list.length) list = seat === 'lead' && B.hooks ? B.hooks.verse : null;
    if (!Array.isArray(list) || !list.length) list = P[section === 'solo' ? 'bridge' : section === 'outro' ? 'chorus' : section] || P.verse;
    return Array.isArray(list) && list.length ? list : [[0, 0, 0, 0]];
  }
  // A progression in plain words (genres.js backing.progNames[section][i] when it has them, else its shape over the four
  // bars), or a hook's own name (backing.hooks entries may be { name } objects or plain arrays).
  function progWords(x, i, names) {
    if (x && typeof x === 'object' && !Array.isArray(x)) return String(x.name || 'Hook ' + (i + 1));
    if (names && typeof names[i] === 'string' && names[i]) return names[i];
    var a = Array.isArray(x) ? x : [0], d = [], k;
    for (k = 0; k < a.length; k++) if (d.indexOf(a[k]) < 0) d.push(a[k]);
    if (d.length <= 1) return 'One chord, all the way';
    if (a.indexOf(1) >= 0 || a.indexOf(6) >= 0) return a.indexOf(1) >= 0 ? 'The creepy half-step' : 'The devil’s interval';
    if (a[a.length - 1] > a[0] && a[a.length - 1] >= 7) return 'Climbs to the big one';
    if (a[0] > 0) return 'Starts away from home';
    if (d.length === 2) return 'Two chords, back and forth';
    return a[a.length - 1] === 0 ? 'Round and back home' : 'Three chords and a road trip';
  }
  part.choices = function (genre, seat, section) {
    var seen = {}, B = songs.genre(genre || 'metal').backing || {}, PN = seat !== 'lead' && B.progNames ? B.progNames[section] : null;
    return partList(genre, seat, section).map(function (x, i) {
      var n = progWords(x, i, PN);
      if (seen[n]) n += ' ' + ['II', 'III', 'IV', 'V', 'VI'][Math.min(4, seen[n]++ - 1)]; else seen[n] = 1;
      return { i: i, name: n };
    });
  };
  function rowsFrom(hits, n) {
    var rows = [];
    for (var r = 0; r < n; r++) rows.push(BLANK);
    hits.forEach(function (h) { if (h[1] >= 0 && h[1] < n) rows[h[1]] = set(rows[h[1]], h[0], true); });
    return rows;
  }
  function stepsOf(str, row) { var o = []; for (var i = 0; i < STEPS; i++) if (on(str, i)) o.push([i, row]); return o; }
  // The seat signatures (one bar per section kind): [step, row] hits. v verse, c chorus, b bridge (solo / outro derive).
  var E8 = 'x.x.x.x.x.x.x.x.', Q4 = 'x...x...x...x...';
  var SUGGEST = {
    bass: {
      metal: { v: stepsOf(E8, 0), c: stepsOf('x.x.x.x.x.x.x...', 0).concat([[14, 2]]), b: stepsOf('x..x..x.x.......', 0).concat([[12, 1]]) },
      punk: { v: stepsOf(E8, 0), c: stepsOf('x.x.x.x.x.x.....', 0).concat([[12, 1], [14, 1]]), b: stepsOf(Q4, 0).concat([[2, 1], [10, 1]]) },
      rock: { v: stepsOf('x..x..x.x..x..x.', 0), c: stepsOf('x.x.x...x.x.x...', 0).concat([[6, 2], [14, 1]]), b: [[0, 0], [8, 1], [12, 2]] },
      country: { v: [[0, 0], [8, 1]], c: [[0, 0], [4, 0], [8, 1], [12, 2]], b: [[0, 0], [6, 1], [8, 1], [14, 2]] }
    },
    rhythm: {
      // metal: verse chugs locked to the kick with an open push on 4 that rings into the next bar; chorus = Jaxon's chorus
      // ring (§0): a stab on 1, chugs, then the accent chord on 3 rings out the bar (open = ringing; before, a written metal
      // part never rang, so a doom-tempo song had no holds)
      metal: { v: stepsOf('x.x.x.x.x.x.....', 0).concat([[12, 1]]), c: [[0, 1], [2, 0], [4, 0], [6, 0], [8, 0], [8, 1]], b: stepsOf('x..x..x.x..x..x.', 0) },
      punk: { v: stepsOf(E8, 1), c: stepsOf(E8, 1), b: stepsOf('x.x.x.x.........', 1).concat(stepsOf('........x.x.x.x.', 0)) },
      rock: { v: stepsOf(E8, 0), c: [[0, 1], [6, 1], [8, 1], [14, 1]], b: [[0, 1], [8, 1]] },
      country: { v: [[0, 1], [4, 0], [8, 1], [12, 0]], c: stepsOf(Q4, 1).concat([[2, 0], [10, 0]]), b: [[0, 1], [6, 1], [8, 1], [12, 0]] }
    },
    lead: {
      metal: { v: [[0, 0], [2, 1], [4, 2], [6, 1], [8, 0], [10, 1], [12, 3], [14, 2]], c: [[0, 2], [2, 3], [4, 4], [6, 3], [8, 2], [10, 3], [12, 4], [14, 3]], b: [[0, 1], [4, 2], [8, 3], [12, 4]] },
      punk: { v: [[0, 0], [4, 1], [8, 0], [12, 2]], c: [[0, 2], [2, 3], [4, 2], [8, 2], [10, 3], [12, 2]], b: [[0, 1], [4, 2], [8, 1], [12, 3]] },
      rock: { v: [[0, 1], [3, 2], [6, 3], [8, 2], [12, 1]], c: [[0, 2], [2, 3], [4, 4], [6, 2], [8, 2], [10, 3], [12, 4], [14, 2]], b: [[0, 3], [4, 4], [8, 3], [12, 1]] },
      country: { v: [[0, 0], [8, 1], [12, 2], [13, 3], [14, 4]], c: [[0, 2], [4, 3], [8, 2], [12, 3], [13, 4], [14, 2]], b: [[0, 1], [6, 2], [8, 3], [12, 4], [14, 2]] }
    }
  };
  var SOLO_HITS = [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [6, 3], [8, 2], [9, 3], [10, 4], [12, 3], [14, 1], [15, 0]];
  function sigFor(seat, genre, section) {
    var S0 = SUGGEST[seat] || SUGGEST.bass, t = S0[genre] || S0.metal;
    if (section === 'solo') return seat === 'lead' ? SOLO_HITS : t.v.filter(function (h) { return h[0] % 4 === 0; });
    if (section === 'outro') return t.c.filter(function (h) { return h[0] < 8; }).concat([[8, seat === 'rhythm' ? 1 : 0]]);
    return section === 'chorus' ? t.c : section === 'bridge' ? t.b : t.v;
  }
  // A section of your part: the seat's genre signature (deterministic); with an rng, any progression/hook and a nudge
  // (bots and jams: seeded per song id, never the career RNG).
  part.suggest = function (genre, seat, section, rng) {
    seat = PART_ROWS[seat] ? seat : 'bass';
    var n = PART_ROWS[seat], list = partList(genre, seat, section), rows = rowsFrom(sigFor(seat, genre, section), n), out = {};
    out[part.key(seat)] = rng ? rng.int(0, list.length - 1) : GG.hashSeed((genre || 'metal') + '|' + seat + '|' + section) % list.length;
    if (rng && rng.chance(0.5) && n > 1) {   // a nudge: one hit moves to a neighbouring row (never a new onset)
      var hits = [];
      rows.forEach(function (r, ri) { for (var i = 0; i < STEPS; i++) if (on(r, i) && i % 8) hits.push([i, ri]); });   // the downbeats stay
      if (hits.length) {
        var h = rng.pick(hits), to = h[1] + (h[1] === 0 ? 1 : h[1] === n - 1 ? -1 : rng.chance(0.5) ? 1 : -1);
        if (!on(rows[to], h[0])) { rows[h[1]] = set(rows[h[1]], h[0], false); rows[to] = set(rows[to], h[0], true); }
      }
    }
    out.rows = rows;
    return out;
  };
  function cleanSection(x, seat, list) {
    var n = PART_ROWS[seat], k = part.key(seat), rows = [], src = x && Array.isArray(x.rows) ? x.rows : [];
    for (var r = 0; r < n; r++) {
      var s = typeof src[r] === 'string' ? src[r].replace(/[^x]/g, '.').slice(0, STEPS) : '';
      rows.push((s + BLANK).slice(0, STEPS));
    }
    var v = Math.floor(Number(x && x[k])), o = {};
    o[k] = isFinite(v) && v >= 0 ? (list ? Math.min(v, list.length - 1) : v) : 0;
    o.rows = rows;
    return o;
  }
  // A clean PART for these sections (missing ones = the seat's suggestion), or null (not a part / not a string seat).
  // genre null (the loose rating path): indexes only floor at 0 (stored songs were cleaned with their genre).
  part.sanitize = function (pt, names, genre) {
    if (!pt || typeof pt !== 'object' || !PART_ROWS[pt.seat]) return null;
    var seat = pt.seat, src = pt.sections && typeof pt.sections === 'object' ? pt.sections : {}, out = { seat: seat, sections: {} };
    (names || SECTIONS).forEach(function (name) {
      var x = src[name];
      out.sections[name] = x && typeof x === 'object' && Array.isArray(x.rows)
        ? cleanSection(x, seat, genre ? partList(genre, seat, name) : null) : part.suggest(genre, seat, name);
    });
    return out;
  };
  // Your part for a whole pattern: the seat's suggestion per section (rng: a seeded variation per song).
  part.full = function (genre, seat, pattern, rng) {
    if (!PART_ROWS[seat]) return null;
    var out = { seat: seat, sections: {} };
    songs.sectionsOf(pattern || {}).forEach(function (name) { out.sections[name] = part.suggest(genre, seat, name, rng); });
    return out;
  };
  // The grid: one cell on/off ; pick a progression / hook. Pure: a new sanitized PATTERN.
  part.toggle = function (p, section, row, step, gear, genre) {
    var out = songs.sanitize(U.clone(p), gear, genre), sec = out.part && out.part.sections[section];
    if (!sec || !sec.rows[row] || step < 0 || step >= STEPS) return out;
    sec.rows[row] = set(sec.rows[row], step, !on(sec.rows[row], step));
    return out;
  };
  part.pick = function (p, section, idx, gear, genre) {
    var out = songs.sanitize(U.clone(p), gear, genre), sec = out.part && out.part.sections[section];
    if (sec) { sec[part.key(out.part.seat)] = Math.max(0, Math.floor(idx) || 0); out = songs.sanitize(out, gear, genre); }
    return out;
  };
  // One-tap modifiers (handoff E6: "lock to the kick", "double time", "let it ring", "call and answer").
  part.MODS = [
    { id: 'lock', name: 'Lock to the kick', desc: 'Your notes land where the kick drum does. Tight as a frozen lug nut.' },
    { id: 'double', name: 'Double time', desc: 'Twice the notes, same tempo. Your wrist files a complaint.' },
    { id: 'ring', name: 'Let it ring', desc: 'Fewer, longer notes. Big open chords and room to breathe.' },
    { id: 'call', name: 'Call and answer', desc: 'The first half asks, the second half answers a step higher.' }];
  function modRows(rows, id, kick, n) {
    var out = rows.slice(), i, r;
    function at(st) { for (var q = 0; q < n; q++) if (on(out[q], st)) return q; return -1; }
    if (id === 'lock') {
      var counts = rows.map(count), busy = counts.indexOf(Math.max.apply(null, counts));
      for (i = 0; i < STEPS; i++) {
        var row = at(i);
        if (on(kick, i) && row < 0) out[busy] = set(out[busy], i, true);
        else if (!on(kick, i) && row >= 0) for (r = 0; r < n; r++) out[r] = set(out[r], i, false);
      }
    } else if (id === 'double') {   // a new note halfway to the next one (same row): twice the notes
      var ons = [];
      for (i = 0; i < STEPS; i++) if (at(i) >= 0) ons.push([i, at(i)]);
      ons.forEach(function (o, k) {
        var nx = k + 1 < ons.length ? ons[k + 1][0] : STEPS, mid = o[0] + Math.floor((nx - o[0]) / 2);
        if (nx - o[0] >= 2) out[o[1]] = set(out[o[1]], mid, true);
      });
    } else if (id === 'ring') {
      for (i = 0; i < STEPS; i++) if (i % 8) for (r = 0; r < n; r++) out[r] = set(out[r], i, false);
      if (!out.some(function (x) { return count(x); })) out[0] = 'x.......x.......';
    } else if (id === 'call') {
      for (r = 0; r < n; r++) out[r] = rows[r].slice(0, 8) + BLANK.slice(8);
      for (r = 0; r < n; r++) for (i = 0; i < 8; i++) if (on(rows[r], i)) { var to = Math.min(n - 1, r + 1); out[to] = set(out[to], i + 8, true); }
    }
    return out;
  }
  part.modify = function (p, section, modId, gear, genre) {
    var out = songs.sanitize(U.clone(p), gear, genre), sec = out.part && out.part.sections[section];
    var before = songs.rate(out, genre, gear);
    if (sec && part.MODS.some(function (m) { return m.id === modId; })) {
      sec.rows = modRows(sec.rows, modId, lane(out.sections[section], KICK), PART_ROWS[out.part.seat]);
      out = songs.sanitize(out, gear, genre);
    }
    return { pattern: out, before: before, after: songs.rate(out, genre, gear) };
  };
  // The onsets of one section: [{ step, rows: [row..] }] (the UI and the rating read it).
  part.notes = function (pt, section) {
    var sec = pt && pt.sections && pt.sections[section], out = [];
    if (!sec) return out;
    for (var i = 0; i < STEPS; i++) {
      var rs = [];
      sec.rows.forEach(function (r, ri) { if (on(r, i)) rs.push(ri); });
      if (rs.length) out.push({ step: i, rows: rs });
    }
    return out;
  };

  /* ---- Rating your part: seat signatures per genre (handoff E6.4) ---------------------------------------------- */
  // Per bar: hits (onsets), lock (share of onsets on a kick), cover (share of kicks you play along with), steady8 (8th steps
  // played / 8), odd (onsets on 16th off-beats), rep (first half vs second half), rows used, root1 / fifth3 (country bass).
  function partFeat(sec, kick, seat) {
    var rows = sec.rows, n = rows.length, hits = 0, lock = 0, kicks = count(kick), s8 = 0, odd = 0, used = 0;
    var inter = 0, union = 0, i, r;
    for (r = 0; r < n; r++) if (count(rows[r])) used++;
    for (i = 0; i < STEPS; i++) {
      var any = false;
      for (r = 0; r < n; r++) if (on(rows[r], i)) any = true;
      if (!any) continue;
      hits++;
      if (on(kick, i)) lock++;
      if (i % 2 === 0) s8++; else odd++;
    }
    for (r = 0; r < n; r++) for (i = 0; i < STEPS / 2; i++) { var a = on(rows[r], i), b = on(rows[r], i + STEPS / 2); if (a && b) inter++; if (a || b) union++; }
    return { hits: hits, lock: hits ? lock / hits : 0, cover: kicks ? lock / kicks : 0, steady8: s8 / 8, odd: odd, rows: used,
      rep: union ? inter / union : 0, root1: on(rows[0], 0) ? 1 : 0, fifth3: seat === 'bass' && on(rows[1], 8) ? 1 : 0,
      chug: seat === 'rhythm' ? count(rows[0]) : 0 };
  }
  function band01(v, lo, hi, soft) { return v >= lo && v <= hi ? 1 : Math.max(0, 1 - (v < lo ? lo - v : v - hi) / soft); }
  var PART_FULL = { bass: [2, 12], rhythm: [2, 14], lead: [3, 12] };
  var PART_TIPS = { empty: 'Your part is nearly empty. Give the band something to lean on.', busy: 'Your part is too busy. Leave some air.',
    lock: 'Lock your chugs to the kick drum: that is the metal.', eighths: 'Steady 8ths. Punk rhythm never stops to think.',
    hook: 'Repeat the hook in the chorus. People remember what they hear twice.', boom: 'Root on 1, fifth on 3: the boom-chick.',
    melody: 'Use more than one row: a hook needs somewhere to go.', kick: 'Play along with the kick now and then.' };
  // Groove of one bar of your part, 0..1 (+ tips).
  function partGroove(seat, genre, name, f, tips, weight) {
    var full = PART_FULL[seat], fit = band01(f.hits, full[0], full[1], 4), sig;
    if (f.hits < full[0]) tip(tips, PART_TIPS.empty, (1 - fit) * 8 * weight);
    else if (fit < 0.8) tip(tips, PART_TIPS.busy, (1 - fit) * 4 * weight);
    if (seat === 'rhythm' && genre === 'metal') { sig = U.clamp((f.lock - 0.3) / 0.45, 0, 1) * (f.chug ? 1 : 0.6); if (sig < 0.8) tip(tips, PART_TIPS.lock, (1 - sig) * 4 * weight); }
    else if (seat === 'rhythm' && genre === 'punk') { sig = Math.min(1, f.steady8 / 0.75) * (1 - Math.min(1, f.odd / 4)); if (sig < 0.8) tip(tips, PART_TIPS.eighths, (1 - sig) * 4 * weight); }
    else if (seat === 'lead' && genre === 'rock' && name === 'chorus') { sig = U.clamp(f.rep / 0.7, 0, 1) * (f.rows >= 2 ? 1 : 0.5); if (sig < 0.8) tip(tips, PART_TIPS.hook, (1 - sig) * 4 * weight); }
    else if (seat === 'bass' && genre === 'country') { sig = (f.root1 + f.fifth3) / 2; if (sig < 0.8) tip(tips, PART_TIPS.boom, (1 - sig) * 4 * weight); }
    else if (seat === 'lead') { sig = f.rows >= 3 ? 1 : f.rows === 2 ? 0.75 : 0.4; if (sig < 0.8) tip(tips, PART_TIPS.melody, (1 - sig) * 3 * weight); }
    else { sig = U.clamp(0.55 + f.cover * 0.6, 0, 1); if (sig < 0.8) tip(tips, PART_TIPS.kick, (1 - sig) * 2 * weight); }
    var steady = 0.85 + 0.15 * U.clamp(f.rep / 0.5, 0, 1);
    return fit * (0.55 + 0.45 * sig) * steady;
  }
  // -> { groove 0..1, hook 0..1, raw (difficulty before the curve), notes } of a pattern's part, or null without one.
  function rateWithPart(p, genre, tips, X) {
    var pt = p.part;
    if (!pt) return null;
    var seat = pt.seat, sumG = 0, sumW = 0, raw = 0, notes = 0, feats = {};
    songs.sectionsOf(p).forEach(function (name) { if (pt.sections[name]) feats[name] = partFeat(pt.sections[name], lane(p.sections[name], KICK), seat); });
    p.arrangement.forEach(function (name) {
      var f = feats[name]; if (!f) return;
      var w = name === 'bridge' ? 0.5 : name === 'outro' ? X.outroWeight : name === 'solo' ? (seat === 'lead' ? 1 : X.soloWeight) : 1;
      sumG += partGroove(seat, genre, name, f, tips, w) * w; sumW += w;
      raw += (f.hits * 1.7 + f.odd * 0.6) * (name === 'solo' && seat !== 'lead' ? 0.5 : 1);
      notes += f.hits * BARS;
    });
    var v = pt.sections.verse, c = pt.sections.chorus, k = part.key(seat), hook = 0;
    if (v && c) {
      var inter = 0, union = 0;
      for (var r = 0; r < v.rows.length; r++) for (var i = 0; i < STEPS; i++) { var a = on(v.rows[r], i), b = on(c.rows[r], i); if (a && b) inter++; if (a || b) union++; }
      var d = union ? 1 - inter / union : 0, contrast = d < 0.05 ? 0 : d < 0.25 ? (d - 0.05) / 0.2 : d <= 0.7 ? 1 : 1 - 0.6 * (d - 0.7) / 0.3;
      var fc = feats.chorus || { rep: 0, hits: 0 }, fv = feats.verse || { hits: 0 };
      hook = 0.45 * Math.max(contrast, v[k] !== c[k] ? 0.6 : 0) + 0.35 * U.clamp((fc.rep - 0.2) / 0.6, 0, 1) + 0.2 * (fv.hits ? Math.min(1, fc.hits / fv.hits) : fc.hits ? 1 : 0);
    }
    var n = p.arrangement.length || 1;
    return { groove: sumW ? sumG / sumW : 0, hook: hook, raw: raw / n * p.bpm / 120, notes: notes };
  }
  songs.partRating = function (pattern, genre) {
    var p = songs.sanitize(pattern, null, null, true), r = rateWithPart(p, genre, {}, SH().songs);
    return r ? { groove: Math.round(100 * r.groove), hook: Math.round(100 * r.hook), notes: r.notes } : null;
  };
  // How much your part counts in a string-seat song's rating (the band's drums are the rest).
  songs.PART_WEIGHT = { groove: 0.35, hook: 0.25, difficulty: 0.5 };

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
    metal: [{ en: 'Watering Ban (My Lawn Is Thirsty)', fr: 'Arrosage Interdit' }, { en: 'Bloody Crabgrass', fr: 'Chiendent Sanglant' },
      { en: 'The Lawnmower of Darkness', fr: 'La Tondeuse des Ténèbres' }],
    punk: ['Council Meeting (Is a Lie)'], rock: ['Leather Pants at Minus Forty'], country: ['My Truck Is in the Condo Lot']
  };
  // Starter songs that once shipped with French titles (content/bands.js + the 20_sim_career fallback band).
  var LEGACY_STARTERS = [{ title: 'My Lawn, My Tomb', fr: 'Ma Pelouse, Mon Tombeau' },
    { title: 'Dandelions of the Apocalypse (On My Lawn)', fr: "Les Pissenlits de l'Apocalypse" },
    { title: 'The Eternal Dandelions', fr: 'Les Pissenlits Éternels' }];
  var ROMAN = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  var SEQUEL = /^(.+) (II|III|IV|V|VI|VII|VIII|IX|X|\d+)$/;
  // How often Marcel sneaks the French original in instead of the English title (owner: "Marcel rarely French").
  songs.FR_CHANCE = 1 / 8;
  // Content entries may be { en, fr } (the pool: English title + Marcel's French original), { title, titleEn, fr? }
  // (starter songs) or plain strings. -> { title, titleEn, fr: French original | null }.
  function norm(t) {
    if (typeof t === 'string') return { title: t, titleEn: t, fr: null };
    var title = t.title || t.en || t.fr || '???';
    return { title: title, titleEn: t.titleEn || title, fr: t.fr && t.fr !== title ? t.fr : null };
  }
  function titlePool(genre) {
    var st = GG.content.songTitles, list = st && st[genre] && st[genre].length ? st[genre] : FALLBACK_TITLES[genre];
    return (list || FALLBACK_TITLES.metal).map(norm);
  }
  // { <French title>: <English title> } for every French title the game has ever handed out (the pools and the
  // starter songs, content + fallbacks). Built once per content object.
  var frCache = null, frKey = [];
  songs.frenchTitles = function () {
    var K = GG.content || {};
    if (frCache && frKey[0] === K.songTitles && frKey[1] === K.bands) return frCache;
    var map = {};
    function add(t) { var n = t && typeof t === 'object' ? norm(t) : null; if (n && n.fr && !map[n.fr]) map[n.fr] = n.title; }
    var st = K.songTitles || {}, B = K.bands || {};
    Object.keys(st).forEach(function (g) { if (Array.isArray(st[g])) st[g].forEach(add); });
    Object.keys(B).forEach(function (id) { (B[id].starterSongs || []).forEach(add); });
    Object.keys(FALLBACK_TITLES).forEach(function (g) { FALLBACK_TITLES[g].forEach(add); });
    LEGACY_STARTERS.forEach(add);
    frCache = map; frKey = [K.songTitles, K.bands];
    return map;
  };
  // The English title for one of Marcel's French titles (sequels too: "Le Tombeau Vert II" -> "The Green Tomb ... II"),
  // or null when `title` isn't one of them (English, or typed by the player).
  songs.englishFor = function (title) {
    if (typeof title !== 'string' || !title) return null;
    var map = songs.frenchTitles();
    if (Object.prototype.hasOwnProperty.call(map, title)) return map[title];
    var m = SEQUEL.exec(title);
    return m && Object.prototype.hasOwnProperty.call(map, m[1]) ? map[m[1]] + ' ' + m[2] : null;
  };
  songs.isFrench = function (title) { return songs.englishFor(title) != null; };
  // v0.9: the French-title gag runs only when the band's namer (band.roles.namer, active) has French titles: nameFr lines in
  // lines.songReactions, or `frTitles: true` on the content member (Marcel).
  function namerFr(state) {
    var id = GG.career && GG.career.roleOf ? GG.career.roleOf(state, '@namer') : null;
    if (!id) return false;
    var L = (GG.content.lines && GG.content.lines.songReactions) || {}, d = GG.career.memberDef ? GG.career.memberDef(state, id) : null;
    return !!((L[id] && L[id].nameFr && L[id].nameFr.length) || (d && d.frTitles));
  }
  songs.namerFr = namerFr;
  function marcelIn(state) { return namerFr(state); }
  // English by default; now and then Marcel insists on the French original (title = fr, titleEn = en, fr: true).
  // The roll is seeded by career seed + song slot + title, so it never moves the career RNG (balance replays the same).
  function withSuffix(state, t, sfx, slot) {
    var out = { title: t.title + sfx, titleEn: t.titleEn + sfx };
    var E0 = GG.content.economy && GG.content.economy.songs, p = E0 && E0.frChance != null ? E0.frChance : songs.FR_CHANCE;
    if (t.fr && marcelIn(state) && GG.RNG(GG.hashSeed((state.seed || 1) + '|fr|' + slot + '|' + t.fr)).chance(p)) {
      out.title = t.fr + sfx; out.fr = true;
    }
    return out;
  }
  // A fresh title from the genre pool (an entry counts as used if either its English or its French title is taken);
  // once every title is used, sequels: "My Lawn, My Queen II". `taken` (optional) = extra titles to avoid, e.g. songs
  // queued in the UI. -> { title, titleEn, fr? }
  songs.pickTitle = function (state, rng, taken) {
    var used = {}, pool = titlePool(state.genre);
    state.songs.concat(state.pendingSongs || []).forEach(function (s) { if (s && s.title) used[s.title] = true; });
    (taken || []).forEach(function (t) { used[t] = true; });
    function free(t, sfx) { return !used[t.title + sfx] && !(t.fr && used[t.fr + sfx]); }
    var slot = state.songs.length + (state.pendingSongs || []).length + (taken || []).length;
    var fresh = pool.filter(function (t) { return free(t, ''); });
    if (fresh.length) return withSuffix(state, rng.pick(fresh), '', slot);
    var base = rng.pick(pool);
    for (var i = 0; i < ROMAN.length; i++) if (free(base, ' ' + ROMAN[i])) return withSuffix(state, base, ' ' + ROMAN[i], slot);
    return withSuffix(state, base, ' ' + (state.songs.length + 1), slot);
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
  // opts: { rng, titleEn, fr, auto, repeatFactor, noise, polish, quality (keep this quality), written }
  // fr (v0.7.2): true = one of Marcel's French titles on purpose (kept French on load). Default: a picked title's own
  // flag, or any title that is one of Marcel's French titles (a queued/typed one; its English then shows as titleEn).
  songs.create = function (state, pattern, title, opts) {
    opts = opts || {};
    var e = E(), A = GG.content.activities.write, gear = gearOf(state.gear);
    var rng = opts.rng || GG.RNG(GG.hashSeed((state.seed || 1) + '|song|' + state.songs.length));
    var p = songs.sanitize(pattern, gear, state.genre), seat = GG.career && GG.career.seatOf ? GG.career.seatOf(state) : 'drums';
    // v1.1: a string seat's song carries your part (a written one is kept; jams, starters and bots get the seat's
    // suggestion, varied per song id on its own seed: never the career RNG). A drum-seat song never has one.
    if (seat !== 'drums' && (!p.part || p.part.seat !== seat)) p.part = songs.part.full(state.genre, seat, p, GG.RNG(GG.hashSeed((state.seed || 1) + '|part|' + nextId(state))));
    else if (seat === 'drums' && p.part) delete p.part;
    var r = songs.rate(p, state.genre, gear);
    var t = title ? { title: String(title).slice(0, 60), titleEn: String(opts.titleEn || title).slice(0, 80) } : songs.pickTitle(state, rng);
    var fr = opts.fr != null ? !!opts.fr : !!(t.fr || songs.isFrench(t.title));
    if (fr && t.titleEn === t.title) t.titleEn = String(songs.englishFor(t.title) || t.title).slice(0, 80);
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
    if (fr) song.fr = true;
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
  // Starter songs that come with the band (newCareer). t = { title, titleEn, fr? } (or { en, fr }). Their patterns are
  // seeded by the original title (Marcel's French one when there is one, as before v0.7.2) so the career RNG sequence
  // and the starter patterns (and v0.1 balance) are unchanged.
  songs.addStarter = function (state, t, rng) {
    var Ec = GG.content.economy, n = norm(t);
    return songs.create(state, songs.patternFor(state, n.fr || n.title), n.title, { titleEn: n.titleEn, fr: false, auto: true, written: 0,
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

  // Band reactions to a new song (career RNG; lines in content/lines.js songReactions). v0.9 by role: the namer
  // (band.roles.namer) names it, the soloist (gig.roles.solo) wants room for a solo (v0.8: or thanks you for a real one),
  // the filler sneaks fills into simple parts, the deadpan (band.roles.deadpan) nods at a great one. Only originals (and
  // members with their own lines) react; recruits stay quiet. v0.7.2: when the namer snuck in a French title (song.fr) he
  // insists on it (<namer>.nameFr) and a bandmate sighs right after (<id>.frSigh; preferring one who has nothing else to say;
  // its own seed: career seed + song id). v0.9 custom lines: songReactions[id].custom = [{ when: 'difficultyHigh' |
  // 'similarityHigh' | 'any', text }] (at most one per song, rolled on its own seed so the career RNG never moves for it).
  var FALLBACK_REACT = { name: ['I have named it:'], nameFr: ['Non. This one is French:'], noSolo: ['Where does my solo go?'],
    fills: ['i added a fill. you will not notice'], great: ['(A nod.)'], frSigh: ['(A long sigh.)'],
    solo: ['A solo section. In a song. You have made me very happy.', 'Eight bars. I will make them count. All of them. At once.'] };
  var CUSTOM = { difficultyHigh: 60, similarityHigh: 0.8, anyChance: 0.3 };
  // v1.1 seat reactions (handoff E6.5), string seats only, on their own seed (career seed + song id: the career RNG never
  // moves for them): the swapped drummer reacts from the kit (songReactions[id].kit, e.g. Dana wants a drum solo) and one
  // bandmate reacts to your part (songReactions[id].bySeat[seat], e.g. Benny and your third chord). Silent members and
  // members without lines say nothing (the drummer falls back to a neutral line).
  var SEAT_REACT = { kit: ['(Counts the song in from behind the kit. Nobody asked. It works.)', 'I will play it. I will play it loud.'] };
  function seatReactions(state, song, out, L, voiced) {
    var K = GG.career, seat = K && K.seatOf ? K.seatOf(state) : 'drums';
    if (seat === 'drums') return;
    var r = GG.RNG(GG.hashSeed((state.seed || 1) + '|seatreact|' + song.id)), dr = K.drummerId ? K.drummerId(state) : null;
    if (dr && voiced(dr) && r.chance(0.6)) {
      var kp = L[dr] && L[dr].kit;
      if ((kp && kp.length) || !(K.isSilent && K.isSilent(state, dr))) out.push({ who: dr, text: K.pickLine(state, r, kp && kp.length ? kp : null, SEAT_REACT.kit), seat: 'kit' });
    }
    var cands = state.members.filter(function (m) {
      var bs = m.status === 'active' && m.id !== dr && L[m.id] && L[m.id].bySeat && L[m.id].bySeat[seat];
      return Array.isArray(bs) && bs.length;
    });
    if (cands.length && r.chance(0.5)) {
      var who = r.pick(cands).id;
      out.push({ who: who, text: K.pickLine(state, r, L[who].bySeat[seat]), seat: seat });
    }
  }
  songs.reactions = function (state, song, rng) {
    var L = (GG.content.lines && GG.content.lines.songReactions) || {}, out = [], K = GG.career;
    function mem(id) { return id ? state.members.filter(function (m) { return m.id === id && m.status === 'active'; })[0] || null : null; }
    function voiced(id) { var m = mem(id); return !!m && (!!L[id] || !!(K.memberDef && m.original !== false && K.memberDef(state, id))); }
    function say(id, key) {
      if (!voiced(id)) return false;
      var pool = L[id] && L[id][key];
      if (!(pool && pool.length) && K.isSilent && K.isSilent(state, id)) return false;   // a silent member only has their own stage directions
      out.push({ who: id, text: K.pickLine(state, rng, pool && pool.length ? pool : null, FALLBACK_REACT[key]) });
      return true;
    }
    var p = song.pattern, r = song.rating;
    var bridge = p.arrangement.indexOf('bridge') >= 0 ? hitsIn(p.sections.bridge, p.lanes) : -1;
    var hasSolo = p.arrangement.indexOf('solo') >= 0, noSolo = !hasSolo && (bridge < 0 || bridge >= 22), fills = r.difficulty < 40, great = song.quality >= 60 || (r.groove >= 85 && r.hook >= 70);
    var g = GG.gig && GG.gig.roles ? GG.gig.roles(state) : {};
    var BR = ((K.band && K.band(state)) || {}).roles || {};
    var namer = mem(BR.namer) ? BR.namer : g.front || null, soloist = g.solo || null, filler = g.fill || null;
    var deadpan = mem(BR.deadpan) ? BR.deadpan : BR.deadpan ? null : K.roleOf ? K.roleOf(state, '@deadpan') : null;
    if (namer && say(namer, song.fr ? 'nameFr' : 'name')) {
      out[out.length - 1].text += ' “' + song.title + '”.';
      if (song.fr) {
        var busy = {};
        if (soloist) busy[soloist] = hasSolo || noSolo;
        if (filler) busy[filler] = busy[filler] || fills;
        if (deadpan) busy[deadpan] = busy[deadpan] || great;
        var others = state.members.filter(function (m) { return m.status === 'active' && m.id !== namer && voiced(m.id); }).map(function (m) { return m.id; });
        var quiet = others.filter(function (id) { return !busy[id]; });
        if (others.length) {
          var sr = GG.RNG(GG.hashSeed((state.seed || 1) + '|frsigh|' + song.id)), who = sr.pick(quiet.length ? quiet : others);
          var pool = L[who] && L[who].frSigh;
          out.push({ who: who, text: K.pickLine(state, sr, pool && pool.length ? pool : null, FALLBACK_REACT.frSigh) });
        }
      }
    }
    if (hasSolo) say(soloist, 'solo');   // v0.8: a real solo section
    else if (noSolo) say(soloist, 'noSolo');
    if (fills) say(filler, 'fills');
    if (great) say(deadpan, 'great');
    seatReactions(state, song, out, L, voiced);
    // v0.9 custom triggers (Benny and the third chord, Lenny's famous riff, Earl's original)
    var cands = [];
    state.members.forEach(function (m) {
      if (m.status !== 'active' || !L[m.id] || !Array.isArray(L[m.id].custom)) return;
      L[m.id].custom.forEach(function (c) { if (c && c.text && (!K.seatOk || K.seatOk(state, c))) cands.push({ who: m.id, when: c.when || 'any', text: c.text }); });   // v1.1: seat gates
    });
    if (cands.length) {
      var cr = GG.RNG(GG.hashSeed((state.seed || 1) + '|custom|' + song.id)), sim = null;
      var hit = cands.filter(function (c) {
        if (c.when === 'difficultyHigh') return r.difficulty >= CUSTOM.difficultyHigh;
        if (c.when === 'similarityHigh') {
          if (sim == null) sim = state.songs.filter(function (x) { return x && x.id !== song.id; })
            .reduce(function (mx, x) { return Math.max(mx, songs.similarity(song, x)); }, 0);
          return sim >= CUSTOM.similarityHigh;
        }
        return c.when === 'any';
      });
      var strong = hit.filter(function (c) { return c.when !== 'any'; });
      var pickFrom = strong.length ? strong : hit.length && cr.chance(CUSTOM.anyChance) ? hit : [];
      if (pickFrom.length) { var c0 = cr.pick(pickFrom); out.push({ who: c0.who, text: K.fillText(state, c0.text), custom: c0.when }); }
    }
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

  /* ---- v0.7.2: old saves' French titles become English on load (idempotent; SAVE_SCHEMA unchanged) ----------------- */
  // Renames every SONG and queued entry (pendingSongs, draft) whose title is one of Marcel's French titles (englishFor,
  // sequels too) unless it is flagged fr: true (snuck in on purpose since v0.7.2), then follows each renamed title
  // wherever a song title is stored as data: the live gig's song results, lastGig / lastWeek (setlist, song results,
  // the new-song delta), the wrap's big-in-one-place song, the tour's big song + its queued/current card, and this
  // year's Loonie nomination for the single. Text already written (chat, news, reviews, result lines, Bandbook posts)
  // is history and keeps the title it had at the time. A second pass finds nothing to rename.
  songs.migrateTitles = function (s) {
    if (!s || typeof s !== 'object' || !Array.isArray(s.songs)) return s;
    var map = {}, n = 0, has = Object.prototype.hasOwnProperty;
    function fix(x) {
      if (!x || typeof x !== 'object' || x.fr || typeof x.title !== 'string') return;
      var en = songs.englishFor(x.title);
      if (en == null) return;
      map[x.title] = en; x.title = en; x.titleEn = en; n++;
    }
    s.songs.forEach(fix);
    if (Array.isArray(s.pendingSongs)) s.pendingSongs.forEach(fix);
    fix(s.draft);
    if (!n) return s;
    function swap(o, k) { if (o && typeof o === 'object' && typeof o[k] === 'string' && has.call(map, o[k])) o[k] = map[o[k]]; }
    function each(list, k) { if (Array.isArray(list)) list.forEach(function (o) { swap(o, k); }); }
    function gigRes(g) {
      if (!g || typeof g !== 'object') return;
      if (Array.isArray(g.songs)) g.songs = g.songs.map(function (t) { return typeof t === 'string' && has.call(map, t) ? map[t] : t; });
      each(g.songResults, 'title');
    }
    if (s.liveGig && typeof s.liveGig === 'object') each(s.liveGig.songs, 'title');
    gigRes(s.lastGig);
    if (s.lastWeek && typeof s.lastWeek === 'object') {
      (s.lastWeek.blocks || []).forEach(function (b) {
        var d = b && b.deltas && b.deltas.song;
        if (d && typeof d === 'object' && has.call(map, d.title)) { d.titleEn = map[d.title]; d.title = map[d.title]; }
      });
      gigRes(s.lastWeek.gig);
    }
    if (s.wrap && s.wrap.tour) swap(s.wrap.tour.big, 'song');
    var t = s.tour;
    if (t && typeof t === 'object') {
      Object.keys(t.regions || {}).forEach(function (id) { swap(t.regions[id] && t.regions[id].big, 'title'); });
      each(t.queue, 'song'); swap(t.ctx, 'song');
    }
    if (s.loonies && Array.isArray(s.loonies.nominations)) s.loonies.nominations.forEach(function (x) {
      var m = x && x.category === 'single' && typeof x.what === 'string' && /^"(.*)"$/.exec(x.what);   // albums have their own titles
      if (m && has.call(map, m[1])) x.what = '"' + map[m[1]] + '"';
    });
    return s;
  };
  if (GG.save && GG.save.migrate && !GG.save.migrate.titles) {
    var prevMigrate = GG.save.migrate;
    GG.save.migrate = function (s) { return songs.migrateTitles(prevMigrate(s)); };
    GG.save.migrate.titles = true;
  }

  GG.registerDebug('songs', function () {
    var s = GG.state; if (!s) return { songs: 0 };
    var top = songs.best(s, 3);
    return { songs: s.songs.length, pending: (s.pendingSongs || []).length, draft: !!s.draft,
      best: top.map(function (x) { return x.title + ' q' + x.quality + ' p' + x.polish + ' s' + (x.stale || 0); }) };
  });
})(window.GG);
