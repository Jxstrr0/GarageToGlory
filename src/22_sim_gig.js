// 22_sim_gig.js: gigs. simulate()/autoResolve() are the v0.1 auto-resolve (bots, balance, runWeek autoGig): a
// performance score from the band's numbers becomes a grade, a crowd, pay and new fans. v0.3 adds the live gig:
// charts from your songs, a pure session (judgement windows, combos, crowd meter, moments, band effects, setlist
// bonuses) that finish()es into the same GIG_RESULT, and botPlay() (tests + autoplay). applyResult() serves both.
// No DOM, no audio; randomness only from the rng passed in (the live session seeds its own from the career seed).
//   GIG        = { venueId, name, city, tier, kind, capacity, deal, pay, gas, quirk, source }
//   GIG_RESULT = { venueId, name, city, deal, crowd, capacity, score, grade, pay, gas, fans, buzz,
//                  songs:[titles], songIds, reactions:[{ who, text }], lines:[text], source, deltas }
//   live extras: { live: true, tier, kind, accuracy, perfect, good, miss, maxCombo, songResults:[SONG_RESULT],
//                  moments:[kind], setBonus: { opener, closer } }
//   gig.windows(state) -> { perfect, good } s ; chart(song, { solo, extras: rng, free, difficulty, thumbs }) -> {notes, auto (v0.6.2 two-thumb drops), total..} ; setSize ; defaultSetlist ;
//   setlistBonuses ; levelOf(crowd) ; session(state, gig, setlist, opts) ; botPlay(session, { accuracy, jitterMs, one }, rng)
(function (GG) {
  var C = GG.contracts, U = GG.util;
  var gig = GG.gig = GG.gig || {};
  function G() { return GG.content.economy.gig; }

  var FALLBACK_REACTIONS = {
    great: ['That was it. That was the one.', 'Did you SEE that?', 'I could do that every night.'],
    ok: ['Not bad. Not great. Not bad.', 'We got through it.', 'The mix was weird.'],
    bad: ['Let us never speak of this.', 'I blame the monitors.', 'Who picked this venue?']
  };
  var GRADE_LINES = {
    S: ['People are going to lie about being at this one.'],
    A: ['A proper show. Somebody asked for a setlist.'],
    B: ['Solid. A few heads nodding, one of them on purpose.'],
    C: ['You finished every song. Technically.'],
    D: ['A disaster, but a memorable one.']
  };
  var REACTION_TIER = { S: 'great', A: 'great', B: 'ok', C: 'ok', D: 'bad' };

  function venues() { return GG.content.venues || []; }
  gig.venue = function (id) {
    var list = venues();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return GG.rival && GG.rival.venue ? GG.rival.venue(id) : null;   // v0.6: festival grounds + the Sad Dome
  };
  gig.fit = function (venue, genre) {
    var f = venue && venue.genreFit && venue.genreFit[genre];
    return f != null ? U.clamp(f, 0, 1) : 0.7;
  };

  // A GIG for a venue id (null if the venue doesn't exist). source: 'forced'|'book'|'offer'|'card'.
  gig.makeGig = function (state, venueId, source) {
    var v = gig.venue(venueId);
    if (!v) return null;
    return { venueId: v.id, name: v.name, city: v.city, tier: v.tier, kind: v.kind, capacity: v.capacity,
      deal: v.deal, pay: v.deal === 'exposure' ? 0 : (v.pay || 0), gas: v.gas || 0, quirk: v.quirk || '',
      source: source || 'book' };
  };
  // Venues you can be booked into: tier <= maxTier and enough fans (card-only venues use minFans 99999).
  gig.qualifying = function (state, maxTier) {
    return venues().filter(function (v) { return v.tier <= maxTier && (v.minFans || 0) <= state.fans; });
  };
  // An unsolicited offer (tier 1-2), skewed toward better venues and better genre fit. null if nothing fits.
  gig.randomOffer = function (state, rng) {
    var list = gig.qualifying(state, GG.content.economy.offerMaxTier);
    var v = list.length ? rng.weighted(list, function (x) { return gig.fit(x, state.genre) * x.tier; }) : null;
    return v ? gig.makeGig(state, v.id, 'offer') : null;
  };
  // Book block (v0.1 placeholder for the gig board): a local venue you qualify for, weighted by genre fit.
  gig.bookLocal = function (state, rng, maxTier) {
    var list = gig.qualifying(state, maxTier || 1);
    var v = list.length ? rng.weighted(list, function (x) { return 0.2 + gig.fit(x, state.genre); }) : null;
    return v ? gig.makeGig(state, v.id, 'book') : null;
  };

  /* ---- Scoring ------------------------------------------------------------ */
  // v0.4: fill-ins play at the fill-in skill; holes, fill-ins and recruit traits shift the score (GG.drama.gigMods).
  function mods(state) { return GG.drama ? GG.drama.gigMods(state) : { score: 0, crowd: 0, fansMult: 1, fills: 0, fillSkill: 0 }; }
  function avgSkill(state) {
    var act = state.members.filter(function (m) { return m.status === 'active'; }), md = mods(state);
    var n = act.length + md.fills, t = act.reduce(function (a, m) { return a + m.skill; }, 0) + md.fills * md.fillSkill;
    return n ? t / n : 0;
  }
  // Deterministic part of the score (0..100-ish) from the band, its best songs and the genre fit; simulate() adds noise.
  gig.performance = function (state, set, fit) {
    var g = G(), w = g.weights;
    var songAvg = set.length ? set.reduce(function (t, s) { return t + GG.songs.score(s); }, 0) / set.length : 0;
    var raw = g.base + avgSkill(state) * w.skill + state.drumSkill * w.drum + state.chemistry * w.chemistry
      + songAvg * w.songs - Math.max(0, state.burnout - g.burnoutFrom) * g.burnoutPenalty;
    return raw * (g.fitFloor + (1 - g.fitFloor) * fit) + mods(state).score;
  };
  gig.gradeFor = function (score) {
    var gr = G().grades;
    for (var i = 0; i < gr.length; i++) if (score >= gr[i][1]) return gr[i][0];
    return 'D';
  };
  function crowdFor(state, g, v, rng) {
    var cfg = G();
    var draw = (v.walkIns || 0) + state.fans * cfg.fanDraw + state.buzz * cfg.buzzDraw;
    return U.clamp(Math.round(draw * rng.range(cfg.crowdNoise[0], cfg.crowdNoise[1])), 1, g.capacity);
  }
  // Pay rules: exposure 0; flat = the guarantee; door = $ per head x crowd.
  gig.payFor = function (g, crowd) {
    return g.deal === 'flat' ? g.pay : g.deal === 'door' ? Math.round(g.pay * crowd) : 0;
  };
  function newFans(state, g, crowd, grade, fit, rng) {
    var cfg = G();
    var x = crowd * cfg.conversion[grade] * (0.5 + 0.5 * fit) * (g.deal === 'exposure' ? cfg.exposureFanBonus : 1)
      * Math.max(0, 1 - state.fans / cfg.localScene) * mods(state).fansMult;
    var f = Math.floor(x);
    return f + (rng.chance(x - f) ? 1 : 0);
  }
  function reactions(state, grade, rng) {
    var tier = REACTION_TIER[grade];
    return state.members.filter(function (m) { return m.status === 'active'; }).map(function (m) {
      var pool = GG.career.contentLines('gigReactions', m.id, tier);
      return { who: m.id, text: GG.career.pickLine(state, rng, pool, FALLBACK_REACTIONS[tier]) };
    });
  }

  // Computes a GIG_RESULT for gig g without changing state (only the rng advances).
  gig.simulate = function (state, g, rng) {
    var cfg = G(), v = gig.venue(g.venueId) || { capacity: g.capacity };
    var fit = gig.fit(v, state.genre);
    var setSize = v.setSize || cfg.setSize, top = GG.songs.best(state, Math.max(setSize, cfg.scoreSongs));
    var set = top.slice(0, setSize);   // what gets played (and counted in song.plays)
    var perf = gig.performance(state, top.slice(0, cfg.scoreSongs), fit);   // scored on your best songs
    var score = U.clamp(Math.round(perf + rng.range(-cfg.noise, cfg.noise)), 0, 100);
    var grade = gig.gradeFor(score), crowd = crowdFor(state, g, v, rng);
    var gradeLines = (GG.career.contentLines('gigGrade', grade)) || GRADE_LINES[grade];
    return {
      venueId: g.venueId, name: g.name, city: g.city, deal: g.deal, source: g.source,
      crowd: crowd, capacity: g.capacity, score: score, grade: grade,
      pay: gig.payFor(g, crowd), gas: g.gas || 0, fans: newFans(state, g, crowd, grade, fit, rng), buzz: cfg.buzz[grade],
      songs: set.map(function (s) { return s.title; }), songIds: set.map(function (s) { return s.id; }),
      reactions: reactions(state, grade, rng),
      lines: [GG.career.fillText(state, g.quirk), GG.career.pickLine(state, rng, gradeLines, GRADE_LINES[grade])]
        .filter(Boolean),
      deltas: null
    };
  };

  // Applies a GIG_RESULT to the career: money, fans, buzz, moods, song plays, stats. Clears state.gig.
  // v0.4: members take their cut of the pay (state.payCut, GG.drama.split) and fill-ins get paid per gig.
  gig.applyResult = function (state, r) {
    if (GG.fans) GG.fans.gigShape(state, state.gig, r);   // v0.6.1: superfans follow on tour, Dale at every show (crowd/buzz; own RNG)
    if (r.pay > 0 && GG.difficulty && !r.diffPay) { r.pay = Math.round(r.pay * GG.difficulty.mul(state, 'money')); r.diffPay = true; }   // v0.6.1 C4
    r.cut = GG.drama ? GG.drama.split(state, r.pay).cut : 0;
    r.fillInCost = GG.drama ? GG.drama.fillInCost(state) : 0;
    var cfg = G(), fx = { fund: r.pay - r.cut - r.fillInCost - r.gas, fans: r.fans, buzz: r.buzz, chemistry: cfg.chemistry[r.grade],
      burnout: cfg.burnout, mood: { all: cfg.mood[r.grade] } };
    r.deltas = GG.career.applyEffects(state, fx, {});
    r.classics = GG.songs.played(state, r.songIds, r.grade).map(function (s) { return s.id; });   // plays, stale, classics
    state.stats.gigs++;
    state.stats.earned += r.pay;
    var best = state.stats.bestGrade;
    if (!best || C.GRADES.indexOf(r.grade) < C.GRADES.indexOf(best)) state.stats.bestGrade = r.grade;
    state.lastGig = r;
    state.gig = null;
    if (state.liveGig) state.liveGig = null;   // a live gig is over once its result lands
    return r.deltas;
  };

  // v0.1: simulate + apply the booked gig. Returns the GIG_RESULT (null if nothing is booked).
  gig.autoResolve = function (state, rng) {
    if (!state.gig) return null;
    var r = gig.simulate(state, state.gig, rng);
    gig.applyResult(state, r);
    return r;
  };

  /* ==== v0.3: the live gig ============================================================================== */
  // Tunables (economy.gig.live overrides any of them). Times in seconds.
  var LIVE = {
    perfect: [0.060, 0.0004, 0.050, 0.100],   // window at drum skill 10, + per skill point, min, max (owner: Forgiving)
    good: [0.130, 0.0006, 0.115, 0.190],
    grace: 0.08,              // a note is only called a miss this long after its Good window closes (late events)
    goodValue: 0.65,          // a Good is worth this much of a Perfect in the note score...
    noteCurve: 1.5,           // ...and the note score is 100 x hit-quality^noteCurve (sloppy play costs more)
    crowdStart: 36, crowdFit: 18, crowdBuzz: 0.15, crowdRange: [15, 62],
    gain: { perfect: 1.2, good: 0.5, miss: -2.4, stray: -0.35, fill: 0.9 },
    densityRef: 4.5, densityClamp: [0.4, 1.6],   // per-note crowd deltas scale with 4.5 / notes-per-second
    decay: 0.03,              // the crowd cools this fraction per second
    comboStep: 25, comboBonus: 2.5,
    staleGain: 250,           // crowd gains x (1 - stale / staleGain)
    settle: [0.75, 45],       // between songs the crowd drifts a quarter of the way to 45
    opener: 7, closer: 8, classicCheer: 10,
    fillCap: 8,               // scored fill taps per freestyle window
    moshCombo: 30, moshCrowd: 60, capeCombo: 40, capeCrowd: 8, genreCrowd: 85,
    booStreak: 5, booCrowd: 35, drinksCrowd: 15, momentGap: 6, lightersRate: 0.85, lightersCrowd: 55,
    unhappy: 30, flub: 6,     // members below this mood miss cues; each flub drags the crowd
    soloStep: 4, fillsMaxDifficulty: 45, fillsChance: 0.5,
    songNotes: 0.7, songCrowd: 0.3, stalePenalty: 0.15, classicScore: 3, fillScore: 3, genreScore: 2,
    liveWeight: 0.72, setOpener: 2, setCloser: 3   // gig score = live x w + v0.1 band performance x (1 - w) + set bonuses
  };
  var GENRE_MOMENT = { metal: 'wallOfDeath', punk: 'circlePit', rock: 'lighters', country: 'lineDance' };
  var LI = {}; C.LANES.forEach(function (l, i) { LI[l] = i; });
  function LC() { var o = G().live; return o ? Object.assign({}, LIVE, o) : LIVE; }
  function capeOn(state) { var c = state.flags && state.flags.cape; return !!c && c !== 'none' && C.CAPE_VALUES.indexOf(c) >= 0; }
  function active(state) { return state.members.filter(function (m) { return m.status === 'active'; }); }

  // Timing windows from drum skill (seconds, +/- around each note).
  // v0.6.2 two-thumb rule (owner): on EVERY difficulty a moment asks for at most 2 notes; kick > snare > cymbal > toms >
  // ride > hat win. The dropped hits become chart.auto notes: never judged, never a miss, not in total/accuracy, but the
  // live gig still plays them (GG.audio.hit at their time) so the groove sounds whole. Hard/Expert = density + speed.
  gig.THUMBS = 2;
  gig.THUMB_PRIORITY = ['kick', 'snare', 'cymbal', 'toms', 'ride', 'hat'];
  function twoThumbs(notes) {
    var keep = [], auto = [], i = 0, pr = {};
    gig.THUMB_PRIORITY.forEach(function (l, k) { pr[l] = k; });
    while (i < notes.length) {
      var j = i; while (j < notes.length && Math.abs(notes[j].t - notes[i].t) < 0.001) j++;
      var m = notes.slice(i, j), judged = m.filter(function (n) { return !n.free; }), kept = 0;
      judged.sort(function (a, b) { return (pr[a.lane] - pr[b.lane]) || (a.extra ? -1 : 0); });
      judged.forEach(function (n) { if (kept < gig.THUMBS) { kept++; n.keep = 1; } });
      m.forEach(function (n) {
        if (n.free || n.keep) { delete n.keep; keep.push(n); }
        else auto.push({ t: n.t, lane: n.lane, li: n.li, section: n.section, entry: n.entry, bar: n.bar, step: n.step, auto: true });
      });
      i = j;
    }
    return { notes: keep, auto: auto };
  }
  // Gig difficulty (v0.5.1 hotfix; Addendum C4 adds Expert + a settings screen). Charts are thinned by time, not by beat:
  // each lane keeps a hit only if it's at least laneGap seconds after that lane's last kept hit, any two kept moments are
  // at least anyGap apart, and a chord keeps at most `chord` notes (kick, then snare, win). Hard = the song exactly as
  // written. window scales the timing windows; miss scales how much a miss hurts the crowd; look = seconds of highway.
  gig.DIFFICULTIES = {
    easy: { window: 1.45, miss: 0.55, look: 1.6, chord: 2, anyGap: 0.24,
      laneGap: { kick: 0.42, snare: 0.42, hat: 0.62, cymbal: 1.6, toms: 0.5, ride: 0.62 } },
    normal: { window: 1.15, miss: 0.8, look: 1.3, chord: 2, anyGap: 0.08,
      laneGap: { kick: 0.16, snare: 0.16, hat: 0.22, cymbal: 0.5, toms: 0.18, ride: 0.22 } },
    hard: { window: 1, miss: 1, look: 1.15, chord: 2, anyGap: 0, laneGap: null },
    // v0.6.1 (Addendum C4): every hit as written, windows a fifth tighter, misses sting more, a faster highway.
    expert: { window: 0.8, miss: 1.3, look: 1, chord: 2, anyGap: 0, laneGap: null }
  };
  // v0.6.1 assists (session opts): noFail = the crowd never sinks below `noFailFloor` (never hostile, no boos, no
  // flying drinks); autoKick = kick notes play themselves as Goods when they reach the line (kick taps are ignored).
  gig.ASSISTS = ['noFail', 'autoKick'];
  gig.noFailFloor = 20;
  gig.DEFAULT_DIFFICULTY = 'easy';   // what a new player gets; the sim itself defaults to 'hard' (the chart as written)
  function diffOf(d) { return gig.DIFFICULTIES[d] || gig.DIFFICULTIES.hard; }
  gig.windows = function (state, difficulty) {
    var c = LC(), d = (state && state.drumSkill || 10) - 10, k = diffOf(difficulty).window;
    function w(x) { return Math.round(U.clamp(x[0] + d * x[1], x[2], x[3]) * k * 10000) / 10000; }
    return { perfect: w(c.perfect), good: w(c.good) };
  };
  function thin(notes, r) {
    var out = [], lastLane = {}, lastAt = -1e9, i = 0;
    while (i < notes.length) {
      var j = i; while (j < notes.length && Math.abs(notes[j].t - notes[i].t) < 0.001) j++;
      var t = notes[i].t, chord = notes.slice(i, j).sort(function (a, b) { return a.li - b.li; }), kept = 0;
      if (chord.some(function (n) { return n.free; })) { out.push.apply(out, chord); i = j; continue; }   // fill windows stay free-form
      if (t - lastAt >= r.anyGap - 1e-6) {
        chord.forEach(function (n) {
          if (kept >= r.chord) return;
          var g = r.laneGap[n.lane] || 0.2;
          if (lastLane[n.lane] != null && t - lastLane[n.lane] < g - 1e-6) return;
          out.push(n); lastLane[n.lane] = t; kept++;
        });
        if (kept) lastAt = t;
      }
      i = j;
    }
    return out;
  }
  gig.levelOf = function (crowd) { return C.CROWD_LEVELS[U.clamp(Math.floor(crowd / 20), 0, C.CROWD_LEVELS.length - 1)]; };
  // Who does what on stage: the frontman spins the cape, the soloist takes the bridge, the filler sneaks in fills.
  gig.roles = function (state) {
    var act = active(state);
    function byRole(list, skip) {
      for (var r = 0; r < list.length; r++) for (var i = 0; i < act.length; i++) if (act[i].role === list[r] && act[i].id !== skip) return act[i].id;
      return null;
    }
    var front = null;
    for (var i = 0; i < act.length && !front; i++) if (/vocals/.test(act[i].role || '')) front = act[i].id;
    var solo = byRole(['lead guitar', 'guitar', 'fiddle']);
    return { front: front, solo: solo, fill: byRole(['rhythm guitar', 'fiddle', 'guitar', 'bass'], solo) };
  };

  // A song's chart: every hit of the pattern as a timed note { t, lane, li, section, entry, bar, step, j (0 = open) }.
  // Freestyle windows (the last bar of each bridge entry; the last bar of the song if there's no bridge) mark their notes
  // `free` (any taps there score a show-off bonus). o.solo eases bridge bars to quarter notes; o.extras (an rng) lets the
  // filler sneak 2-3 snare notes (`extra`) into the last bar of some verses/choruses.
  gig.chart = function (song, o) {
    o = o || {};
    var p = GG.songs.sanitize(song && song.pattern || song, null, null, true), spb = 60 / p.bpm, barLen = 4 * spb;
    var entryLen = C.BARS_PER_SECTION * barLen, last = C.BARS_PER_SECTION - 1, arr = p.arrangement;
    var sections = [], fills = [], solos = [], hasBridge = arr.indexOf('bridge') >= 0, free = o.free !== false;
    arr.forEach(function (name, e) {
      var t0 = e * entryLen;
      sections.push({ name: name, entry: e, t0: t0, t1: t0 + entryLen });
      if (free && (name === 'bridge' || (!hasBridge && e === arr.length - 1))) fills.push({ entry: e, t0: t0 + last * barLen, t1: t0 + entryLen });
      if (o.solo && name === 'bridge') solos.push({ entry: e, t0: t0, t1: t0 + (free ? last : C.BARS_PER_SECTION) * barLen });
    });
    function isFree(n) { return free && (n.section === 'bridge' || (!hasBridge && n.entry === arr.length - 1)) && n.bar === last; }
    var notes = [], extras = 0;
    GG.songs.toNotes(p).forEach(function (n) {
      var f = isFree(n);
      if (o.solo && n.section === 'bridge' && !f && n.step % LIVE.soloStep !== 0) return;
      var x = { t: n.beat * spb, lane: n.lane, li: LI[n.lane], section: n.section, entry: n.entry, bar: n.bar, step: n.step, j: 0 };
      if (f) x.free = true;
      notes.push(x);
    });
    if (o.extras && p.lanes >= 2) {
      arr.forEach(function (name, e) {
        if (name === 'bridge' || isFree({ section: name, entry: e, bar: last }) || !o.extras.chance(LC().fillsChance)) return;
        var snare = p.sections[name][1], open = [];
        for (var s = 10; s < C.STEPS; s++) if (!GG.songs.isHit(snare, s)) open.push(s);
        o.extras.shuffle(open).slice(0, o.extras.int(2, 3)).forEach(function (s) {
          extras++;
          notes.push({ t: (e * C.BARS_PER_SECTION * 4 + last * 4 + s / 4) * spb, lane: 'snare', li: 1, section: name, entry: e, bar: last, step: s, j: 0, extra: true });
        });
      });
    }
    notes.sort(function (a, b) { return a.t - b.t || a.li - b.li; });
    var tt = o.thumbs === false ? { notes: notes, auto: [] } : twoThumbs(notes);   // v0.6.2 two-thumb rule
    notes = tt.notes;
    if (o.difficulty && diffOf(o.difficulty).laneGap) notes = thin(notes, diffOf(o.difficulty));
    var total = 0; notes.forEach(function (n) { if (!n.free) total++; });
    return { songId: song && song.id || null, title: song && song.title || '', bpm: p.bpm, spb: spb, lanes: p.lanes,
      duration: GG.songs.seconds(p), notes: notes, auto: tt.auto, total: total, extras: extras, fills: fills, solos: solos, sections: sections };
  };

  /* ---- Setlists ------------------------------------------------------------------------------------------ */
  // Songs per set: the venue's setSize (about 3 at tier 1, 4-5 at tier 2), never more than the catalog.
  gig.setSize = function (state, g) {
    var v = gig.venue(g && g.venueId) || {}, n = g && g.setSize || v.setSize;
    if (!n) { var tier = g && g.tier || v.tier || 1; n = tier <= 1 ? 3 : (g && g.capacity || v.capacity || 0) >= 250 ? 5 : 4; }
    return Math.max(1, Math.min(n, state.songs.length));
  };
  function strength(s) { return GG.songs.score(s) + (s.classic ? 15 : 0) + Math.min(s.hits || 0, 6) * 2; }
  // Best songs, strongest first, the biggest hit (classic, most great gigs) closing.
  gig.defaultSetlist = function (state, g) {
    var set = GG.songs.best(state, gig.setSize(state, g));
    if (set.length > 2) {
      var hit = set.slice(1).reduce(function (a, b) { return strength(b) > strength(a) ? b : a; });
      set.splice(set.indexOf(hit), 1); set.push(hit);
    }
    return set.map(function (s) { return s.id; });
  };
  // Opener bonus: the set starts with one of its two strongest songs, not a stale one. Closer bonus: it ends on its
  // biggest hit (a classic, the most great-gig hits, or one of its two strongest while nothing is a hit yet).
  gig.setlistBonuses = function (state, list) {
    var set = (list || []).map(function (x) { return typeof x === 'string' ? GG.songs.byId(state, x) : x; }).filter(Boolean);
    if (!set.length) return { opener: false, closer: false, best: null };
    function rank(s) { var v = strength(s); return set.filter(function (o) { return strength(o) > v + 0.01; }).length; }
    var first = set[0], lastS = set[set.length - 1], maxHits = Math.max.apply(null, set.map(function (s) { return s.hits || 0; }));
    var hit = lastS.classic || (maxHits > 0 ? (lastS.hits || 0) >= maxHits : rank(lastS) <= 1);
    return { opener: rank(first) <= 1 && (first.stale || 0) < 50, closer: set.length > 1 && hit,
      best: set.reduce(function (a, b) { return strength(b) > strength(a) ? b : a; }).id };
  };

  // How many people show up (deterministic per career seed, week and venue, so the stage can be set before the setlist).
  gig.expectCrowd = function (state, g, week) {
    var v = gig.venue(g.venueId) || { capacity: g.capacity, walkIns: 0 };
    return crowdFor(state, g, v, GG.RNG(GG.hashSeed([state.seed, week || state.totalWeek, g.venueId, 'crowd'].join('|'))));
  };

  /* ---- The session --------------------------------------------------------------------------------------- */
  // GG.gig.session(state, gig, setlist:[songId|SONG], opts) resumes state.liveGig when it is this gig (setlist ignored).
  // startSong(i?) -> chart ; judge(lane, t) -> { judgement: 'perfect'|'good'|'fill'|null (stray), note, combo, crowd } ;
  // tick(t) -> { misses, crowd, level } (misses + crowd decay + cues; no allocation) ; endSong() -> SONG_RESULT (saved in
  // state.liveGig, 'gig:song') ; finish() -> GIG_RESULT. t = seconds from the song's first beat.
  // Emits (when s.emit): 'gig:judge', 'crowd:level', 'crowd:moment' { kind }, 'gig:band' { who, action }; 'gig:song' always
  // (it's the between-songs save point).
  gig.session = function (state, g, setlist, opts) {
    opts = opts || {};
    var cfg = LC(), live = state.liveGig;
    if (!live || !live.gig || live.gig.venueId !== g.venueId) {
      var ids = (setlist && setlist.length ? setlist : gig.defaultSetlist(state, g)).map(function (x) { return typeof x === 'string' ? x : x.id; });
      live = state.liveGig = { gig: g, setlist: ids, index: 0, songs: [], crowd: null, started: state.totalWeek, attendance: null };
    }
    var v = gig.venue(g.venueId) || { capacity: g.capacity, walkIns: 0 }, fit = gig.fit(v, state.genre);
    var seed = GG.hashSeed([state.seed, live.started, g.venueId, live.setlist.join(',')].join('|'));
    if (live.attendance == null) live.attendance = gig.expectCrowd(state, g, live.started);
    if (live.crowd == null) live.crowd = Math.round(U.clamp(cfg.crowdStart + (fit - 0.5) * cfg.crowdFit + state.buzz * cfg.crowdBuzz + mods(state).crowd, cfg.crowdRange[0], cfg.crowdRange[1]));
    var set = live.setlist.map(function (id) { return GG.songs.byId(state, id); }).filter(Boolean);
    if (opts.difficulty && live.difficulty == null) live.difficulty = opts.difficulty;
    var diff = live.difficulty || opts.difficulty || 'hard', dcfg = diffOf(diff), thinned = !!dcfg.laneGap;
    var W = gig.windows(state, diff), roles = gig.roles(state), cape = capeOn(state) && roles.front, genre = state.genre;
    var bonus = gig.setlistBonuses(state, set), unhappy = active(state).filter(function (m) { return m.mood < cfg.unhappy; });
    var assists = { noFail: !!opts.noFail, autoKick: !!opts.autoKick }, floor = assists.noFail ? gig.noFailFloor : 0;   // v0.6.1 C4
    var S = { state: state, gig: g, live: live, setlist: set, windows: W, roles: roles, fit: fit, bonus: bonus, difficulty: diff, assists: assists,
      attendance: live.attendance, crowd: live.crowd, level: gig.levelOf(live.crowd), combo: 0, index: live.index,
      done: live.index >= set.length, chart: null, t: 0, emit: opts.emit !== false, playing: false };
    var cur = null, tickOut = { misses: 0, crowd: 0, level: '', autoHits: 0 };
    function emit(ev, p) { if (S.emit) GG.emit(ev, p); }
    function crowdAdd(d) {
      S.crowd = U.clamp(S.crowd + d, floor, 100);
      var lv = gig.levelOf(S.crowd);
      if (lv !== S.level) { S.level = lv; emit('crowd:level', { level: lv, crowd: S.crowd }); }
    }
    function moment(kind, t) {
      if (cur.moments.indexOf(kind) < 0) cur.moments.push(kind);
      cur.lastMoment[kind] = t;
      emit('crowd:moment', { kind: kind });
    }
    function ready(kind, t) { var l = cur.lastMoment[kind]; return l == null || t - l >= cfg.momentGap; }
    function band(who, action) { if (who) emit('gig:band', { who: who, action: action }); }

    S.startSong = function (i) {
      i = i == null ? live.index : i;
      var song = set[i]; if (!song) return null;
      var rng = GG.RNG((seed + (i + 1) * 7919) >>> 0), sdiff = song.rating && song.rating.difficulty || 50;
      var chart = gig.chart(song, { solo: !!roles.solo, difficulty: thinned ? diff : null,
        extras: diff !== 'easy' && roles.fill && sdiff < cfg.fillsMaxDifficulty ? rng : null });
      var n = chart.notes, byLane = [], entryTotal = [], cues = [];
      for (var l = 0; l < C.LANES.length; l++) byLane.push([]);
      chart.sections.forEach(function () { entryTotal.push(0); });
      n.forEach(function (x, k) { byLane[x.li].push(k); if (!x.free) entryTotal[x.entry]++; });
      chart.solos.forEach(function (s) { cues.push({ t: s.t0, kind: 'solo' }); });
      var seen = {};
      n.forEach(function (x) { if (x.extra && !seen[x.entry]) { seen[x.entry] = 1; cues.push({ t: Math.max(0, x.t - 0.8), kind: 'fill' }); } });
      chart.sections.forEach(function (s) { if (s.name === 'chorus') cues.push({ t: s.t1, kind: 'chorus', entry: s.entry }); });
      unhappy.forEach(function (m) {
        var k = m.mood < cfg.unhappy / 2 ? 2 : 1;
        rng.shuffle(chart.sections).slice(0, k).forEach(function (s) { cues.push({ t: s.t0 + 4 * chart.spb, kind: 'flub', who: m.id }); });
      });
      cues.sort(function (a, b) { return a.t - b.t; });
      var nps = chart.total / Math.max(1, chart.duration);
      cur = { i: i, song: song, chart: chart, notes: n, byLane: byLane, lp: [0, 0, 0, 0, 0, 0], mp: 0, cues: cues, ci: 0,
        perfect: 0, good: 0, stray: 0, fills: 0, fillsIn: {}, maxCombo: 0, missStreak: 0, flubs: 0, extrasHit: 0,
        entryTotal: entryTotal, entryHits: entryTotal.map(function () { return 0; }), crowdSum: 0, crowdT: 0, lastT: 0,
        moments: [], lastMoment: {}, genreDone: false, capeDone: false, cheer: !!song.classic,
        dens: U.clamp(cfg.densityRef / Math.max(0.5, nps), cfg.densityClamp[0], cfg.densityClamp[1]),
        staleMul: Math.max(0.2, 1 - (song.stale || 0) / cfg.staleGain) };
      S.chart = chart; S.index = i; S.combo = 0; S.t = 0; S.playing = true; S.crowd = live.crowd;
      S.level = gig.levelOf(S.crowd);
      if (i === 0 && bonus.opener) crowdAdd(cfg.opener);
      if (i === set.length - 1 && bonus.closer && set.length > 1) crowdAdd(cfg.closer);
      if (song.classic) crowdAdd(cfg.classicCheer);
      emit('crowd:level', { level: S.level, crowd: S.crowd });
      return chart;
    };
    function fillAt(t) {
      var f = cur.chart.fills;
      for (var k = 0; k < f.length; k++) if (t >= f[k].t0 - 0.05 && t <= f[k].t1 + 0.1) return f[k];
      return null;
    }
    function hit(k, kind, t) {
      var x = cur.notes[k], c = cfg.gain[kind] * cur.dens * cur.staleMul;
      x.j = kind === 'perfect' ? 1 : 2;
      if (kind === 'perfect') cur.perfect++; else cur.good++;
      if (x.extra) cur.extrasHit++;
      cur.entryHits[x.entry]++;
      S.combo++; cur.missStreak = 0;
      if (S.combo > cur.maxCombo) cur.maxCombo = S.combo;
      crowdAdd(c * (1.15 - S.crowd / 200));
      if (S.combo % cfg.comboStep === 0) crowdAdd(cfg.comboBonus);
      if (S.combo % cfg.moshCombo === 0 && S.crowd >= cfg.moshCrowd && ready('mosh', t)) moment('mosh', t);
      if (cape && !cur.capeDone && S.combo >= cfg.capeCombo) {
        cur.capeDone = true; crowdAdd(cfg.capeCrowd); moment('capeSpin', t); band(cape, 'capeSpin');
      }
    }
    function miss(x, t) {
      x.j = 3; S.combo = 0; cur.missStreak++;
      crowdAdd(cfg.gain.miss * cur.dens * dcfg.miss);
      emit('gig:judge', { lane: x.lane, judgement: 'miss', combo: 0, crowd: S.crowd });
      if (!assists.noFail && cur.missStreak >= cfg.booStreak && S.crowd < cfg.booCrowd && ready('boo', t)) {
        moment('boo', t);
        if (S.crowd < cfg.drinksCrowd && ready('drinks', t)) moment('drinks', t);
      }
    }
    S.judge = function (lane, t) {
      if (!cur) return null;
      var li = typeof lane === 'number' ? lane : LI[lane];
      if (!(li >= 0 && li < cur.byLane.length)) return null;
      if (assists.autoKick && li === LI.kick) return { judgement: null, note: null, combo: S.combo, crowd: S.crowd, auto: true };   // the kick plays itself
      var list = cur.byLane[li], k = cur.lp[li], best = -1, bestD = 1e9, n = cur.notes;
      while (k < list.length && n[list[k]].j !== 0) k++;
      cur.lp[li] = k;
      for (; k < list.length; k++) {
        var x = n[list[k]];
        if (x.t > t + W.good) break;
        if (x.j !== 0 || x.free) continue;
        var d = Math.abs(t - x.t);
        if (d <= W.good && d < bestD) { best = list[k]; bestD = d; }
      }
      var f = fillAt(t), out;
      if (best >= 0 && (bestD <= W.perfect || !f || n[best].t < f.t0 || n[best].t >= f.t1 - 1e-6)) {   // a note outside the window wins
        var kind = bestD <= W.perfect ? 'perfect' : 'good';
        hit(best, kind, t);
        out = { judgement: kind, note: n[best], combo: S.combo, crowd: S.crowd, offset: t - n[best].t };
      } else if (f) {
        var key = f.entry, got = cur.fillsIn[key] || 0;
        if (got < cfg.fillCap) { cur.fillsIn[key] = got + 1; cur.fills++; crowdAdd(cfg.gain.fill); }
        out = { judgement: 'fill', note: null, combo: S.combo, crowd: S.crowd };
      } else {
        cur.stray++; crowdAdd(cfg.gain.stray * dcfg.miss);
        out = { judgement: null, note: null, combo: S.combo, crowd: S.crowd, stray: true };
      }
      emit('gig:judge', { lane: C.LANES[li], judgement: out.judgement, combo: S.combo, crowd: S.crowd });
      return out;
    };
    function cue(c, t) {
      if (c.kind === 'solo') { moment('solo', t); band(roles.solo, 'solo'); }
      else if (c.kind === 'fill') band(roles.fill, 'fill');
      else if (c.kind === 'flub') { cur.flubs++; crowdAdd(-cfg.flub); band(c.who, 'miss'); }
      else if (c.kind === 'chorus') {
        var tot = cur.entryTotal[c.entry];
        if (tot && cur.entryHits[c.entry] / tot >= cfg.lightersRate && S.crowd >= cfg.lightersCrowd && ready('lighters', t)) moment('lighters', t);
      }
    }
    S.tick = function (t) {
      if (!cur) return tickOut;
      var dt = t - cur.lastT, n = cur.notes, misses = 0;
      if (dt < 0) dt = 0; else if (dt > 0.25) dt = 0.25;
      if (t > cur.lastT) cur.lastT = t;
      S.t = cur.lastT;
      while (cur.ci < cur.cues.length && cur.cues[cur.ci].t <= t) cue(cur.cues[cur.ci++], t);
      var autoHits = 0;
      if (assists.autoKick) {   // v0.6.1: Auto-kick hits each kick note as it reaches the line
        var kl = cur.byLane[LI.kick] || [];
        while ((cur.ak || 0) < kl.length && n[kl[cur.ak || 0]].t <= t) {
          var ki = kl[cur.ak || 0]; cur.ak = (cur.ak || 0) + 1;
          if (n[ki].j === 0 && !n[ki].free) { hit(ki, 'good', t); autoHits++; emit('gig:judge', { lane: 'kick', judgement: 'good', combo: S.combo, crowd: S.crowd, auto: true }); }
        }
      }
      tickOut.autoHits = autoHits;
      var lim = t - W.good - cfg.grace;
      while (cur.mp < n.length && n[cur.mp].t < lim) {
        var x = n[cur.mp++];
        if (x.j === 0) { if (x.free) x.j = 4; else { miss(x, t); misses++; } }
      }
      if (dt > 0) { crowdAdd(-S.crowd * cfg.decay * dt); cur.crowdSum += S.crowd * dt; cur.crowdT += dt; }
      if (!cur.genreDone && S.crowd >= cfg.genreCrowd && GENRE_MOMENT[genre]) { cur.genreDone = true; moment(GENRE_MOMENT[genre], t); }
      tickOut.misses = misses; tickOut.crowd = S.crowd; tickOut.level = S.level;
      return tickOut;
    };
    S.endSong = function () {
      if (!cur) return null;
      var n = cur.notes, ch = cur.chart, song = cur.song;
      for (var k = 0; k < n.length; k++) if (n[k].j === 0) n[k].j = n[k].free ? 4 : 3;
      var total = ch.total, miss = total - cur.perfect - cur.good;
      var noteScore = total ? 100 * Math.pow((cur.perfect + cur.good * cfg.goodValue) / total, cfg.noteCurve) : 100;
      var avg = cur.crowdT > 0 ? cur.crowdSum / cur.crowdT : S.crowd, nFill = ch.fills.length * cfg.fillCap;
      var score = noteScore * cfg.songNotes + avg * cfg.songCrowd + (nFill ? cfg.fillScore * cur.fills / nFill : 0)
        + (song.classic ? cfg.classicScore : 0) + (cur.genreDone ? cfg.genreScore : 0) - (song.stale || 0) * cfg.stalePenalty;
      var r = { songId: song.id, title: song.title, score: Math.round(U.clamp(score, 0, 100)),
        accuracy: total ? Math.round((cur.perfect + cur.good) / total * 1000) / 1000 : 1,
        perfect: cur.perfect, good: cur.good, miss: miss, maxCombo: cur.maxCombo, crowdEnd: Math.round(S.crowd),
        crowdAvg: Math.round(avg), fills: cur.fills, moments: cur.moments.slice(), notes: total, flubs: cur.flubs,
        extras: ch.extras, extrasHit: cur.extrasHit, stray: cur.stray, cheer: cur.cheer, stale: song.stale || 0 };
      var i = cur.i;
      live.songs[i] = r; live.songs.length = i + 1;
      live.index = i + 1;
      live.crowd = Math.round(S.crowd * cfg.settle[0] + cfg.settle[1] * (1 - cfg.settle[0]));
      S.index = live.index; S.done = live.index >= set.length; S.playing = false;
      cur = null;
      GG.emit('gig:song', { index: i, result: r });
      return r;
    };
    S.song = function () { return cur ? cur.song : set[live.index] || null; };
    S.stats = function () {
      return cur ? { perfect: cur.perfect, good: cur.good, miss: cur.notes.filter(function (x) { return x.j === 3; }).length,
        fills: cur.fills, combo: S.combo, maxCombo: cur.maxCombo, crowd: S.crowd, flubs: cur.flubs } : null;
    };
    S.finish = function () { return finishLive(S, seed); };
    return S;
  };

  // Reaction lines for what happened on stage (content lines win when a later version adds them).
  var LIVE_LINES = {
    capeSpin: ['Did everyone see the cape? Everyone saw the cape.', 'The cape and I were one tonight.'],
    solo: ['That solo? Mine. You are welcome.', 'I closed my eyes during the solo and saw Norway.'],
    fill: ['i did a fill. you kept up. respect', 'did you notice the fill. be honest'],
    flub: ['I missed a cue. The monitor looked at me funny.', 'That wrong note was a choice. A bad one.'],
    genre: { metal: "A wall of death broke out in {city}. Somebody's mom was in it.", punk: 'The circle pit took out the merch table. Worth it.',
      rock: 'Lighters. Actual lighters. Someone used a phone and got booed.', country: 'They line danced. Somebody brought a lasso.' }
  };
  function finishLive(S, seed) {
    var state = S.state, g = S.gig, live = S.live, cfg = LC(), cg = G(), res = live.songs.filter(Boolean);
    var played = res.map(function (r) { return GG.songs.byId(state, r.songId); }).filter(Boolean);
    var avg = res.length ? res.reduce(function (t, r) { return t + r.score; }, 0) / res.length : 0;
    var b = gig.setlistBonuses(state, played), rng = GG.RNG((seed ^ 0x51ed27) >>> 0);
    var opener = !!(b.opener && res.length), closer = !!(b.closer && res.length === S.setlist.length && res.length > 1);
    var perf = gig.performance(state, played, S.fit);
    var score = U.clamp(Math.round(avg * cfg.liveWeight + perf * (1 - cfg.liveWeight) + (opener ? cfg.setOpener : 0) + (closer ? cfg.setCloser : 0)), 0, 100);
    var grade = gig.gradeFor(score), crowd = live.attendance, moments = [];
    res.forEach(function (r) { r.moments.forEach(function (m) { if (moments.indexOf(m) < 0) moments.push(m); }); });
    var sum = function (k) { return res.reduce(function (t, r) { return t + (r[k] || 0); }, 0); };
    var perfect = sum('perfect'), good = sum('good'), miss = sum('miss'), notes = sum('notes');
    var genreHit = moments.indexOf(GENRE_MOMENT[state.genre]) >= 0 && score >= 50;
    var gradeLines = (GG.career.contentLines('gigGrade', grade)) || GRADE_LINES[grade];
    var lines = [GG.career.fillText(state, g.quirk), GG.career.pickLine(state, rng, gradeLines, GRADE_LINES[grade])];
    if (opener) lines.push('Opening with “' + played[0].title + '” grabbed them by the collar.');
    if (closer) lines.push('Closing on “' + played[played.length - 1].title + '” brought the house down.');
    if (genreHit) lines.push(GG.career.fillText(state, LIVE_LINES.genre[state.genre] || ''));
    var roles = S.roles, special = {};
    if (moments.indexOf('capeSpin') >= 0 && roles.front) special[roles.front] = LIVE_LINES.capeSpin;
    if (moments.indexOf('solo') >= 0 && roles.solo && score >= 50) special[roles.solo] = LIVE_LINES.solo;
    if (sum('extrasHit') > 0 && roles.fill) special[roles.fill] = LIVE_LINES.fill;
    var reacts = reactions(state, grade, rng);
    if (sum('flubs') > 0) active(state).forEach(function (m) { if (m.mood < cfg.unhappy) special[m.id] = LIVE_LINES.flub; });
    reacts.forEach(function (r) { if (special[r.who]) r.text = GG.career.pickLine(state, rng, special[r.who]); });
    return {
      venueId: g.venueId, name: g.name, city: g.city, deal: g.deal, source: g.source, tier: g.tier, kind: g.kind,
      crowd: crowd, capacity: g.capacity, score: score, grade: grade,
      pay: gig.payFor(g, crowd), gas: g.gas || 0, fans: newFans(state, g, crowd, grade, S.fit, rng),
      buzz: cg.buzz[grade] + (genreHit ? 1 : 0),
      songs: played.map(function (s) { return s.title; }), songIds: played.map(function (s) { return s.id; }),
      reactions: reacts, lines: lines.filter(Boolean), deltas: null,
      live: true, accuracy: notes ? Math.round((perfect + good) / notes * 1000) / 1000 : 1, perfect: perfect, good: good, miss: miss,
      maxCombo: Math.max.apply(null, [0].concat(res.map(function (r) { return r.maxCombo; }))),
      songResults: res.slice(), moments: moments, setBonus: { opener: opener, closer: closer },
      difficulty: S.difficulty, assists: gig.ASSISTS.filter(function (k) { return S.assists && S.assists[k]; })   // v0.6.1 C4
    };
  }

  // Bot input: taps every open note with probability `accuracy`, off by N(0, jitterMs), delivered at 20 Hz frames
  // with exact timestamps (like pointer events), ticking the session each frame. one: true plays only the current/next
  // song (-> SONG_RESULT); otherwise the rest of the set (-> GIG_RESULT). Continues a song already in progress.
  gig.botPlay = function (S, o, rng) {
    o = o || {}; rng = rng || GG.RNG(1);
    var acc = o.accuracy != null ? o.accuracy : 1, jit = (o.jitterMs || 0) / 1000, out = null;
    function gauss() { var u = Math.max(1e-9, rng.next()), v = rng.next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    while (!S.done || S.playing) {
      if (!S.playing) S.startSong();
      var ch = S.chart, from = S.t, taps = [];
      ch.notes.forEach(function (n) {
        if (n.j !== 0 || n.t < from - 0.001 || !rng.chance(acc)) return;
        var off = jit ? U.clamp(gauss(), -3, 3) * jit : 0;
        taps.push({ t: Math.max(from, n.t + off), li: n.li });
      });
      taps.sort(function (a, b) { return a.t - b.t; });
      var end = ch.duration + 0.4, k = 0;
      for (var T = from + 0.05; ; T += 0.05) {
        var now = Math.min(T, end);
        while (k < taps.length && taps[k].t <= now) { S.judge(taps[k].li, taps[k].t); k++; }
        S.tick(now);
        if (now >= end) break;
      }
      out = S.endSong();
      if (o.one) return out;
    }
    return S.finish();
  };

  GG.registerDebug('gig', function () {
    var s = GG.state; if (!s) return { gig: null };
    var l = s.lastGig;
    var lg = s.liveGig;
    return { booked: s.gig && s.gig.venueId, offer: s.offer && s.offer.venueId,
      live: lg ? { venue: lg.gig && lg.gig.venueId, index: lg.index, songs: lg.setlist.length, crowd: lg.crowd, attendance: lg.attendance } : null,
      last: l ? { venue: l.venueId, grade: l.grade, crowd: l.crowd, pay: l.pay, fans: l.fans } : null };
  });
})(window.GG);
