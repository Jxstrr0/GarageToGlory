// 21_sim_songs.js: the song catalog. A song is a drum PATTERN (three one-bar sections, an arrangement, a tempo)
// that the band builds guitars around. rate() scores a pattern: Groove (genre fit), Hook (chorus vs verse) and
// Difficulty. create() turns a pattern into a SONG whose quality also depends on the band; jam()/generate() let the
// band write one without you. Gigs age songs (stale) and great gigs make classics.
// Pure and deterministic: no DOM, no audio; randomness only from the rng passed in. Genre data: content/genres.js.
//   PATTERN = { bpm, lanes, sections: { verse|chorus|bridge: [laneStr x lanes] }, arrangement: [section..] }
//   SONG    = { id, title, titleEn, written, pattern, rating: { groove, hook, difficulty }, quality, polish,
//               plays, lastPlayed, stale, hits, classic, auto, fr? (true = Marcel snuck in a French title; v0.7.2) }
// v0.7.2 titles: English by default; pickTitle lets Marcel sneak in the French original ~1 in 8 (FR_CHANCE, seeded per
// career + song slot, never drawing from the career RNG). englishFor/isFrench/frenchTitles; migrateTitles (chained onto
// GG.save.migrate, no schema bump) renames old saves' French titles to English everywhere a song title is stored.
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

  function E() { return GG.content.economy.songs; }
  function gearOf(g) { return { lanes: g && g.lanes >= 1 ? Math.min(g.lanes, C.LANES.length) : 4, doubleKick: !!(g && g.doubleKick) }; }
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
    f.sync = f.odd / Math.max(1, count(k) + f.snare);
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

  // Rates a pattern for a genre. Pure and deterministic (same pattern => same numbers, node or browser).
  // -> { groove, hook, difficulty (0..100 ints), notes (hits in the whole song), tips: [1-2 plain hints], sections }
  songs.rate = function (pattern, genre, gear) {
    var G = songs.genre(genre), g = gearOf(gear), p = songs.sanitize(pattern, g, null, true), lanes = p.lanes;
    var tips = {}, per = {}, feats = {};
    SECTIONS.forEach(function (name) { feats[name] = features(p.sections[name], lanes, p.bpm, g); });
    var sumG = 0, sumW = 0, effort = 0, odd = 0, notes = 0;
    p.arrangement.forEach(function (name) {   // bridges (breakdowns, solo spots) count half toward the groove
      var w = name === 'bridge' ? 0.5 : 1, f = feats[name];
      per[name] = barGroove(G, f, g, tips, w);
      sumG += per[name] * w; sumW += w;
      effort += f.effort; odd += f.odd; notes += f.hits * BARS;
    });
    var n = p.arrangement.length || 1;
    var raw = (effort / n + 0.6 * odd / n) * p.bpm / 120;
    var hook = hookOf(p, lanes, tips);
    var list = Object.keys(tips).sort(function (a, b) { return tips[b] - tips[a] || (a < b ? -1 : 1); });
    var sections = {};
    SECTIONS.forEach(function (name) { sections[name] = Math.round(100 * (per[name] != null ? per[name] : barGroove(G, feats[name], g, {}, 0))); });
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
    if (!Array.isArray(p.arrangement) || !p.arrangement.length || p.arrangement.some(function (s) { return SECTIONS.indexOf(s) < 0; })) errs.push('bad arrangement');
    SECTIONS.forEach(function (name) {
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
    SECTIONS.forEach(function (name) {
      var sec = src.sections && src.sections[name], clean = [];
      for (var l = 0; l < lanes; l++) {
        var s = sec && typeof sec[l] === 'string' ? sec[l].replace(/[^x]/g, '.').slice(0, STEPS) : '';
        s = (s + BLANK).slice(0, STEPS);
        clean.push(l === KICK && !g.doubleKick && !loose ? oneFoot(s) : s);
      }
      out.sections[name] = clean;
    });
    var arr = Array.isArray(src.arrangement) ? src.arrangement.filter(function (s) { return SECTIONS.indexOf(s) >= 0; }) : [];
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
    return songs.sanitize(p, g, genre);
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
  function marcelIn(state) { return (state.members || []).some(function (m) { return m.id === 'marcel' && m.status === 'active'; }); }
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
    var p = songs.sanitize(pattern, gear, state.genre), r = songs.rate(p, state.genre, gear);
    var t = title ? { title: String(title).slice(0, 60), titleEn: String(opts.titleEn || title).slice(0, 80) } : songs.pickTitle(state, rng);
    var fr = opts.fr != null ? !!opts.fr : !!(t.fr || songs.isFrench(t.title));
    if (fr && t.titleEn === t.title) t.titleEn = String(songs.englishFor(t.title) || t.title).slice(0, 80);
    var f = opts.repeatFactor != null ? opts.repeatFactor : 1;
    var over = Math.max(0, r.difficulty - songs.ability(state));
    var craft = 0.6 * r.groove + 0.3 * r.hook + 0.1 * r.difficulty;
    var q = opts.quality != null ? opts.quality
      : bandPart(state) + (craft - e.craftPivot) * e.craftWeight - over * e.overPenalty - (1 - f) * A.repeatPenalty + (opts.noise || 0);
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

  // Band reactions to a new song (career RNG; lines in content/lines.js songReactions): Marcel names it, Dana wants
  // room for a solo, Jaxon sneaks fills into simple parts, Kenji nods at a great one. v0.7.2: when Marcel snuck in a
  // French title (song.fr) he insists on it (marcel.nameFr) and a bandmate sighs right after (<id>.frSigh; preferring
  // one who has nothing else to say). The sigh rolls on its own seed (career seed + song id), not the career RNG.
  var FALLBACK_REACT = { name: ['I have named it:'], nameFr: ['Non. This one is French:'], noSolo: ['Where does my solo go?'],
    fills: ['i added a fill. you will not notice'], great: ['(A nod.)'], frSigh: ['(A long sigh.)'] };
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
    var noSolo = bridge < 0 || bridge >= 22, fills = r.difficulty < 40, great = song.quality >= 60 || (r.groove >= 85 && r.hook >= 70);
    if (active('marcel')) {
      say('marcel', song.fr ? 'nameFr' : 'name'); out[out.length - 1].text += ' “' + song.title + '”.';
      if (song.fr) {
        var others = ['dana', 'jaxon', 'kenji'].filter(active), busy = { dana: noSolo, jaxon: fills, kenji: great };
        var quiet = others.filter(function (id) { return !busy[id]; });
        if (others.length) {
          var sr = GG.RNG(GG.hashSeed((state.seed || 1) + '|frsigh|' + song.id)), who = sr.pick(quiet.length ? quiet : others);
          var pool = L[who] && L[who].frSigh;
          out.push({ who: who, text: GG.career.pickLine(state, sr, pool && pool.length ? pool : null, FALLBACK_REACT.frSigh) });
        }
      }
    }
    if (noSolo) say('dana', 'noSolo');
    if (fills) say('jaxon', 'fills');
    if (great) say('kenji', 'great');
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
    if (pr && SECTIONS.indexOf(section) >= 0) out.sections[section] = padBar(presetBar(pr, g), out.lanes).slice(0, out.lanes);
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
    if (mod && SECTIONS.indexOf(section) >= 0) {
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
