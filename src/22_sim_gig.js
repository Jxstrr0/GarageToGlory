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
//   gig.windows(state) -> { perfect, good } s ; chart(song, { solo, extras: rng, free, difficulty, thumbs, doubles }) -> {notes, auto (v0.6.2 two-thumb drops), total..} ; setSize ; defaultSetlist ;
//   setlistBonuses ; levelOf(crowd) ; session(state, gig, setlist, opts) ; botPlay(session, { accuracy, jitterMs, one }, rng)
// v0.8 (KITSIM): gear on stage (GG.shop.gigBonus in performance, crowdBonus at the live start); the merch table sells in
// applyResult (GIG_RESULT.merch = { sold, earned, boxes, space, items, named }; the earnings join the fund change) and every
// venue played puts a sticker on the van; charts: a 'solo' section is Dana's (quarter notes only, the solo cue + a crowd
// lift, the bridge is then a normal bridge) and an 'outro' ends on a big-finish fill window (its last bar). 5–6 lanes chart
// like the rest: the two-thumb rule still caps every moment at 2 judged notes on every difficulty.
// v0.7.2 double kicks (owner): two kick hits in quick succession (gap <= gig.DOUBLE_GAP) are ONE highway note
//   { dbl: true, t2 } judged on the first hit; the second kick plays itself at t2 (the live gig schedules it on the audio
//   clock) only when the first was hit (hitT = when). A tap near t2 is an 'echo' (no stray); if it was also inside the next
//   kick note's window and that note is never tapped, the note is credited with it instead of missed. Runs of 3+ fast
//   kicks pair up (1+2, 3+4, ...; an odd last one stays single). One note for accuracy / combo / total; chart.doubles =
//   double notes on the chart. Order: two-thumb rule -> doubles -> difficulty thinning (Easy/Normal thin a double like any
//   kick note). chart(song, { doubles: false }) = no merge.
// v0.9: moments(genre) -> { combo, chorus, peak } (§4.4; economy.gig.moments overrides) ; signatures(state) -> [{ id, action,
//   combo, crowd, flag, perSong }] (bands.js member.signature, once per gig, perSong once per song: crowd +8, crowd:moment + gig:band) ; LIVE_LINES (neutral
//   fallback; content lines.live[memberId].{solo, fill, signature, flub} and lines.moments[kind] win).
// v1.1 "Seats" (plan_contract_1.1 §4.2 / §4.5): roles(state) by stage role (career.stageRole; the drum seat = v1.0; the lead
//   seat's solo = 'player'; roles.drummer, not enumerable) ; chart(song, { seat, genre, lanes, runs, soloist, difficulty }) on a
//   string seat = seatChart (lanes 'str0'..'str5', NOTE + kind, midi, len (s), hold, chord: [li, li2], run + t2 + seq) +
//   chart.holds / chords / runs / kinds / genre / tail, fills[].cap (+ shred) ; RUN_GAP, HOLD_BEATS, STR_LANES ; the
//   session on a string seat: S.release(lane, t) -> { lane, held, ring } ('gig:hold'), S.holding(lane) -> NOTE|null, S.seat,
//   2-lane chords (one note, both lanes in the window; one lane = a Good), a flow crowd (economy.gig.live flowGain,
//   holdGain, ringGain, ringAt, seatDensityClamp), no Auto-kick; SONG_RESULT + seat, holds, rings, held (+ lead: solo, dur,
//   soloNotes, allNotes) ; botPlay holds every hold to its end and taps both lanes of a chord.
// v1.3.1 "Simulate" (plan_1.3.1 §1.1): canSimulate / simReason / simBot / simSong / simFinish / simShow (see the block at the
//   end): a regular gig played headlessly at your own recent average; applyResult logs PLAYED live gigs in state.playLog.
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
    return (GG.rival && GG.rival.venue ? GG.rival.venue(id) : null) || (GG.tour && GG.tour.venue ? GG.tour.venue(id) : null);   // v0.6 rivalry venues, v0.7 world venues
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
    return venues().filter(function (v) { return v.tier <= maxTier && (v.minFans || 0) <= state.fans && (!GG.world || !GG.world.inReach || GG.world.inReach(state, v)); });   // v0.9: venue.reach
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
      + songAvg * w.songs - Math.max(0, state.burnout - g.burnoutFrom) * g.burnoutPenalty
      + (GG.shop && state.gear ? GG.shop.gigBonus(state) : 0);   // v0.8: a better kit, toms, ride, the pedal
    return raw * (g.fitFloor + (1 - g.fitFloor) * fit) + mods(state).score;
  };
  gig.gradeFor = function (score) {
    var gr = G().grades;
    for (var i = 0; i < gr.length; i++) if (score >= gr[i][1]) return gr[i][0];
    return 'D';
  };
  function crowdFor(state, g, v, rng) {
    var cfg = G();
    var draw = g.tour && GG.tour ? GG.tour.draw(state, g) : (v.walkIns || 0) + state.fans * cfg.fanDraw + state.buzz * cfg.buzzDraw;   // v0.7: abroad
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
  // v0.9: a silent member (bands.js silent) without their own stage directions says nothing.
  function reactions(state, grade, rng) {
    var tier = REACTION_TIER[grade], K = GG.career;
    return state.members.filter(function (m) { return m.status === 'active'; }).map(function (m) {
      var pool = K.contentLines('gigReactions', m.id, tier);
      if (!pool && K.isSilent && K.isSilent(state, m.id)) return null;
      return { who: m.id, text: K.pickLine(state, rng, pool, FALLBACK_REACTIONS[tier]) };
    }).filter(Boolean);
  }
  function gradeLines(state, grade) {   // v0.9: lines.gigGrade[grade] + lines.byBand[bandId].gigGrade[grade]
    return (GG.career.linePool ? GG.career.linePool(state, ['gigGrade', grade]) : GG.career.contentLines('gigGrade', grade)) || GRADE_LINES[grade];
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
    var gLines = gradeLines(state, grade);
    return {
      venueId: g.venueId, name: g.name, city: g.city, deal: g.deal, source: g.source,
      crowd: crowd, capacity: g.capacity, score: score, grade: grade,
      pay: gig.payFor(g, crowd), gas: g.gas || 0, fans: newFans(state, g, crowd, grade, fit, rng), buzz: cfg.buzz[grade],
      songs: set.map(function (s) { return s.title; }), songIds: set.map(function (s) { return s.id; }),
      reactions: reactions(state, grade, rng),
      lines: [GG.career.fillText(state, g.quirk), GG.career.pickLine(state, rng, gLines, GRADE_LINES[grade])]
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
    if (GG.shop && state.merch && !r.merch) GG.shop.gigMerch(state, state.gig, r);   // v0.8: the merch table (r.merch; own seeded RNG)
    var cfg = G(), fx = { fund: r.pay - r.cut - r.fillInCost - r.gas + (r.merch ? r.merch.earned : 0), fans: r.fans, buzz: r.buzz, chemistry: cfg.chemistry[r.grade],
      burnout: cfg.burnout, mood: { all: cfg.mood[r.grade] } };
    r.deltas = GG.career.applyEffects(state, fx, {});
    r.classics = GG.songs.played(state, r.songIds, r.grade).map(function (s) { return s.id; });   // plays, stale, classics
    state.stats.gigs++;
    state.stats.earned += r.pay;
    if (r.live && !r.simulated && !(state.liveGig && state.liveGig.sim) && r.songResults && r.songResults.length) logPlay(state, r);   // v1.3.1
    if (GG.shop && state.van) GG.shop.sticker(state, state.gig || r);   // v0.8: a sticker on the van for every venue played
    var best = state.stats.bestGrade;
    if (!best || C.GRADES.indexOf(r.grade) < C.GRADES.indexOf(best)) state.stats.bestGrade = r.grade;
    state.lastGig = r;
    state.gig = null;
    if (state.liveGig) state.liveGig = null;   // a live gig is over once its result lands
    return r.deltas;
  };

  // v1.3.1: a PLAYED live gig joins state.playLog ("your own average" for a simulated one; the last C.PLAY_LOG_MAX, lazy key).
  // Rounded like GG.save.playLog, so a reload simulates the same gig.
  function logPlay(state, r) {
    var hit = (r.perfect || 0) + (r.good || 0), log = Array.isArray(state.playLog) ? state.playLog : (state.playLog = []);
    log.push({ acc: Math.round(U.clamp(r.accuracy || 0, 0, 1) * 1000) / 1000, ps: hit ? Math.round(r.perfect / hit * 1000) / 1000 : 1,
      seat: GG.career.seatOf(state), diff: gig.DIFFICULTIES[r.difficulty] ? r.difficulty : 'hard', wk: state.totalWeek || 0 });
    if (log.length > (C.PLAY_LOG_MAX || 5)) log.splice(0, log.length - (C.PLAY_LOG_MAX || 5));
  }

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
    moshCombo: 30, moshCrowd: 60, capeCombo: 40, capeCrowd: 8, genreCrowd: 85, chorusCrowd: 70,
    booStreak: 5, booCrowd: 35, drinksCrowd: 15, momentGap: 6, lightersRate: 0.85, lightersCrowd: 55,
    unhappy: 30, flub: 6,     // members below this mood miss cues; each flub drags the crowd
    soloStep: 4, fillsMaxDifficulty: 45, fillsChance: 0.5,
    songNotes: 0.7, songCrowd: 0.3, stalePenalty: 0.15, classicScore: 3, fillScore: 3, genreScore: 2,
    liveWeight: 0.72, setOpener: 2, setCloser: 3   // gig score = live x w + v0.1 band performance x (1 - w) + set bonuses
  };
  // v0.9 (plan_contract_0.9 §4.4): per-genre crowd moments. combo = at every moshCombo-th hit in a row with the crowd at
  // moshCrowd+ (replaces the old metal-for-everyone 'mosh'); chorus = the first chorus downbeat of a song with the crowd at
  // chorusCrowd+ (once per song, cosmetic); peak = the crowd reaches genreCrowd (once per song; scores genreScore).
  // economy.gig.moments[genre] may override any row.
  var MOMENTS = {
    metal: { combo: 'mosh', chorus: 'headbang', peak: 'wallOfDeath' },
    punk: { combo: 'pogo', chorus: 'gangShout', peak: 'circlePit' },
    rock: { combo: 'fistPump', chorus: 'singAlong', peak: 'lighters' },
    country: { combo: 'clapAlong', chorus: 'yeehaw', peak: 'lineDance' }
  };
  gig.moments = function (genre) {
    var o = (GG.content.economy && GG.content.economy.gig && GG.content.economy.gig.moments) || {};
    return Object.assign({}, MOMENTS[genre] || MOMENTS.metal, o[genre] || {});
  };
  var GENRE_MOMENT = { metal: 'wallOfDeath', punk: 'circlePit', rock: 'lighters', country: 'lineDance' };
  function peakMoment(genre) { return gig.moments(genre).peak || GENRE_MOMENT[genre]; }
  // v0.9: band signature actions (bands.js member.signature { action, combo, crowd, flag?, perSong? }): once per gig at combo >=
  // combo (perSong: once per song, Marcel's cape spin as in v0.8.3; and only while its flag is set: Marcel's cape).
  // -> [{ id, action, combo, crowd, flag, perSong }]
  function flagOn(state, f) { var v = state.flags && state.flags[f]; return !!v && v !== 'none'; }
  gig.signatures = function (state) {
    var out = [];
    active(state).forEach(function (m) {
      var d = GG.career.memberDef ? GG.career.memberDef(state, m.id) : null, sg = (d && m.original !== false && d.signature) || m.signature;
      if (!sg || !sg.action) return;
      if (sg.flag === 'cape' ? !capeOn(state) : sg.flag && !flagOn(state, sg.flag)) return;
      out.push({ id: m.id, action: sg.action, combo: sg.combo || 40, crowd: sg.crowd != null ? sg.crowd : 8, flag: sg.flag || null, perSong: !!sg.perSong });
    });
    return out;
  };
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
  // v0.7.2 double kicks (owner, 2026-09-30: "make 1 kick note hit as a double kick to create less compression on the note
  // highway while still keeping the pace quick"). A kick that comes <= DOUBLE_GAP s after the previous kick merges into it:
  // the earlier note becomes { dbl: true, t2 } and the later one leaves the highway (played, never judged, never a miss).
  // Pairs are taken in order along a run of fast kicks (1+2, 3+4, ...): an odd last kick stays a plain note. Freestyle
  // kicks never merge (and break a run). 0.18 s = every 16th pair from 84 BPM and 8th-note kicks from ~167 BPM (the
  // Thrash / Blast tempos); without the pedal (v0.8) songs have no back-to-back 16th kicks, so 8ths are what fast metal has.
  gig.DOUBLE_GAP = 0.18;
  function doubles(notes, gap) {
    var out = [], open = null, n = 0;
    for (var i = 0; i < notes.length; i++) {
      var x = notes[i];
      if (x.lane !== 'kick') { out.push(x); continue; }
      if (x.free) { open = null; out.push(x); continue; }
      var d = open ? x.t - open.t : 1e9;
      if (d > 1e-6 && d <= gap + 1e-6) { open.dbl = true; open.t2 = x.t; open = null; n++; continue; }   // the partner: plays at t2
      open = x; out.push(x);
    }
    return { notes: out, doubles: n };
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
  // v1.1 (plan_contract_1.1 §4.2): by stage role (career.stageRole: the drum seat = the content role, exactly v1.0). On the
  // lead seat the solo is yours ('player'); fill never names the drummer or the player. roles.drummer (not enumerable, so
  // a drum career's roles read exactly as v1.0) = whoever is on the kit (career.drummerId) or 'player' (the drum seat).
  gig.roles = function (state) {
    var act = active(state), K = GG.career, seat = K.seatOf ? K.seatOf(state) : 'drums';
    function role(m) { return K.stageRole ? K.stageRole(state, m) : m.role || ''; }
    function byRole(list, skip) {
      for (var r = 0; r < list.length; r++) for (var i = 0; i < act.length; i++) if (role(act[i]) === list[r] && act[i].id !== skip) return act[i].id;
      return null;
    }
    var front = null;
    for (var i = 0; i < act.length && !front; i++) if (/vocals/.test(role(act[i]))) front = act[i].id;
    var solo = seat === 'lead' ? 'player' : byRole(['lead guitar', 'guitar', 'fiddle']);
    var out = { front: front, solo: solo, fill: byRole(seat === 'drums' ? ['rhythm guitar', 'fiddle', 'guitar', 'bass'] : ['rhythm guitar', 'fiddle', 'guitar', 'bass', 'vocals/guitar', 'vocals/acoustic', 'vocals'], solo) };   // v1.1: a singing guitarist (else the singer) fills when the filler moved to the kit
    Object.defineProperty(out, 'drummer', { value: seat === 'drums' ? 'player' : (K.drummerId ? K.drummerId(state) : null), enumerable: false });
    return out;
  };

  // A song's chart: every hit of the pattern as a timed note { t, lane, li, section, entry, bar, step, j (0 = open) }
  // (+ v0.7.2 dbl, t2 on a double kick; the session adds hitT, the song time it was hit, to a hit double).
  // Freestyle windows (the last bar of each bridge entry; the last bar of the song if there's no bridge) mark their notes
  // `free` (any taps there score a show-off bonus). o.solo eases bridge bars to quarter notes; o.extras (an rng) lets the
  // filler sneak 2-3 snare notes (`extra`) into the last bar of some verses/choruses.
  // v1.3 (plan_contract_1.3 §4.6, Lane A): p.swing > 0 swings the notes (t = songs.swingBeat(beat, swing) x spb: the same
  // warp as the band's timeline, so every swung note sounds where the band plays it; step / bar / windows never move); a
  // section with a bar-4 fill (p.fillBars, Q2: toNotes brings its notes in) takes no extras. Without both: 1.2 exactly.
  gig.chart = function (song, o) {
    o = o || {};
    var p = GG.songs.sanitize(song && song.pattern || song, null, null, true), spb = 60 / p.bpm, barLen = 4 * spb;
    var entryLen = C.BARS_PER_SECTION * barLen, last = C.BARS_PER_SECTION - 1, arr = p.arrangement;
    var sections = [], fills = [], solos = [], hasBridge = arr.indexOf('bridge') >= 0, free = o.free !== false;
    // v0.8: a real 'solo' section is Dana's (always eased: you lay back); without one the soloist takes the bridge (v0.3).
    // An 'outro' ends on a fill window (the big finish). Free-bar rule: bridges, outros, else the song's last bar.
    var soloSec = arr.indexOf('solo') >= 0 ? 'solo' : 'bridge', hasOutro = arr.indexOf('outro') >= 0;
    function freeEntry(name, e) { return name === 'bridge' || name === 'outro' || (!hasBridge && !hasOutro && e === arr.length - 1); }
    function eased(name) { return name === 'solo' || (o.solo && name === soloSec); }
    arr.forEach(function (name, e) {
      var t0 = e * entryLen, fr = free && freeEntry(name, e) && name !== 'solo';
      sections.push({ name: name, entry: e, t0: t0, t1: t0 + entryLen });
      if (fr) fills.push({ entry: e, t0: t0 + last * barLen, t1: t0 + entryLen });
      if (o.solo && name === soloSec) solos.push({ entry: e, t0: t0, t1: t0 + (fr ? last : C.BARS_PER_SECTION) * barLen });
    });
    function isFree(n) { return free && n.section !== 'solo' && freeEntry(n.section, n.entry) && n.bar === last; }
    var notes = [], extras = 0, sw = p.swing > 0 ? p.swing : 0, swing = GG.songs.swingBeat;
    GG.songs.toNotes(p).forEach(function (n) {
      var f = isFree(n);
      if (eased(n.section) && !f && n.step % LIVE.soloStep !== 0) return;
      var x = { t: (sw ? swing(n.beat, sw) : n.beat) * spb, lane: n.lane, li: LI[n.lane], section: n.section, entry: n.entry, bar: n.bar, step: n.step, j: 0 };
      if (f) x.free = true;
      notes.push(x);
    });
    if (o.extras && p.lanes >= 2) {
      arr.forEach(function (name, e) {
        if (name === 'bridge' || name === 'solo' || name === 'outro' || isFree({ section: name, entry: e, bar: last }) || !o.extras.chance(LC().fillsChance)) return;
        if (p.fillBars && p.fillBars[name]) return;   // (v1.3: the drummer's own fill has that bar; the rng draw above stays)
        var snare = p.sections[name][1], open = [];
        for (var s = 10; s < C.STEPS; s++) if (!GG.songs.isHit(snare, s)) open.push(s);
        o.extras.shuffle(open).slice(0, o.extras.int(2, 3)).forEach(function (s) {
          extras++;
          var b = e * C.BARS_PER_SECTION * 4 + last * 4 + s / 4;
          notes.push({ t: (sw ? swing(b, sw) : b) * spb, lane: 'snare', li: 1, section: name, entry: e, bar: last, step: s, j: 0, extra: true });
        });
      });
    }
    notes.sort(function (a, b) { return a.t - b.t || a.li - b.li; });
    var tt = o.thumbs === false ? { notes: notes, auto: [] } : twoThumbs(notes);   // v0.6.2 two-thumb rule
    notes = tt.notes;
    if (o.doubles !== false) notes = doubles(notes, gig.DOUBLE_GAP).notes;   // v0.7.2 double kicks
    if (o.difficulty && diffOf(o.difficulty).laneGap) notes = thin(notes, diffOf(o.difficulty));
    var total = 0, dbl = 0; notes.forEach(function (n) { if (!n.free) total++; if (n.dbl) dbl++; });
    var out = { songId: song && song.id || null, title: song && song.title || '', bpm: p.bpm, spb: spb, lanes: p.lanes,
      duration: GG.songs.seconds(p), notes: notes, auto: tt.auto, total: total, doubles: dbl, extras: extras, fills: fills, solos: solos, sections: sections };
    // v1.1: a string seat charts its own part (seatChart below); the drum seat (or no seat) is exactly the chart above.
    // Without GG.audio.timeline (a node sim without 30_audio) a string seat gets the drum chart with stub: true.
    if (o.seat != null && o.seat !== 'drums' && C.SEATS.indexOf(o.seat) > 0 && GG.audio && GG.audio.timeline) return seatChart(song, o, p, out);
    if (o.seat != null) { out.seat = o.seat; out.stub = o.seat !== 'drums'; }
    return out;
  };

  /* ---- v1.1 "Seats": the string highway (plan_contract_1.1 §4.5; handoff E5) -------------------------------------- */
  // gig.chart(song, { seat: 'bass'|'rhythm'|'lead', lanes, runs, difficulty, genre, soloist, free, thumbs }): your seat's
  // part from the song's timeline (GG.audio.timeline with { seat, part, drums: false, vocals: false }: the events of
  // GG.audio.seatKinds(genre, seat), timed by beat like drum notes). Without GG.audio.timeline (a node sim without 30) the
  // chart is the drum chart with stub: true. Rules, in order:
  //   onsets: events at the same time merge into one note (the seat's first kind, then the lowest pitch; the rest play as
  //     auto notes) ; contour lanes per arrangement entry (distinct pitches low -> high over `lanes`: n <= L -> round(i (L-1)
  //     / (n-1)), one pitch -> the middle lane, n > L -> floor(i L / n); same pitch = same lane in the entry) ;
  //   spotlight: lead seat in solo-role bars charts only the solo kind (the rest auto), the last bar of the run is a free
  //     shred window; bass / rhythm in someone else's solo bars keep one note per beat; free windows as the drums (the
  //     bridge's last bar, the outro's; their notes play themselves) ;
  //   runs: same-pitch repeats <= RUN_GAP apart merge into one hold { run: true, t2, seq } with the run gear, else thin to
  //     their on-beat onsets (the rest auto) ; holds: sounding min(len, gap) >= 1 beat (Easy 2) -> hold, len (s) ;
  //   chords (Hard/Expert, rhythm): an open power chord / strum on a downbeat -> chord: [li, li2] (the fifth a lane up) ;
  //   thinning: DIFFICULTIES by lane index (laneGap = the kick's for every lane) ; two thumbs: never more than 2 heads at a
  //     moment counting held notes (a chord under a hold plays one lane, a third thumb goes auto).
  // Dropped notes go to chart.auto (your voice plays them, never judged): the song always sounds whole.
  // v1.3 (Q1 = 1, pitch shape): part v2's new rows are just pitches on the same contour lanes (no row -> lane map); a swung
  // event is placed by its grid beat (e.g) and timed by its swung beat; Scratch (dead: true, midi = the root) charts on the
  // root's lane, copies dead to its note / auto / with partner, never joins or starts a run and never chords; singles
  // (power: false, one-string picks) never chord on Hard+.
  gig.RUN_GAP = 0.18;
  // The string seats' flow by difficulty (parity with the kit; the lead seat has its shred windows). Retuned at integration
  // with lane D's real parts + seat layers (denser charts, many more holds): flow, hold and ring gains came down and the
  // seat density clamp opened to 4, so the avg bot sits within ~1.5 of the drum seat per band x seat (sim_seats, 9 seeds).
  var FLOW = gig.FLOW = { easy: 0.6, normal: 0.4, hard: 0.2, expert: 0.05, lead: 0.8 };
  gig.HOLD_BEATS = { easy: 2, normal: 1, hard: 1, expert: 1 };
  var STR_LANES = ['str0', 'str1', 'str2', 'str3', 'str4', 'str5'];
  STR_LANES.forEach(function (l, i) { LI[l] = i; });
  gig.STR_LANES = STR_LANES;
  function strLaneGap(r) {
    if (!r.laneGap) return null;
    var g = {}, v = r.laneGap.kick || 0.2;
    STR_LANES.forEach(function (l) { g[l] = v; });
    return { window: r.window, miss: r.miss, chord: 2, anyGap: r.anyGap, laneGap: g };
  }
  function seatChart(song, o, p, base) {
    var A = GG.audio, seat = o.seat, genre = o.genre || 'metal', spb = base.spb, L = U.clamp(o.lanes || 4, 1, STR_LANES.length);
    var kinds = A.seatKinds ? A.seatKinds(genre, seat) : (C.SEAT_KINDS[genre] || C.SEAT_KINDS.metal)[seat];
    var soloist = o.soloist !== undefined ? o.soloist : seat === 'lead' ? 'player' : undefined;
    var tl = A.timeline(p, { genre: genre, songId: song && song.id != null ? song.id : undefined, seat: seat, part: p.part, drums: false, vocals: false, soloist: soloist });
    var diff = o.difficulty && gig.DIFFICULTIES[o.difficulty] ? o.difficulty : 'hard', holdMin = gig.HOLD_BEATS[diff] || 1;
    var entryBeats = C.BARS_PER_SECTION * 4, last = C.BARS_PER_SECTION - 1, free = o.free !== false, arr = p.arrangement;
    var soloKind = tl.solo && kinds.indexOf(tl.solo) >= 0 ? tl.solo : kinds.length > 1 ? kinds[kinds.length - 1] : null;
    var ev = tl.events.filter(function (e) { return kinds.indexOf(e.kind) >= 0 && e.midi != null; });
    var auto = [], fills = base.fills.slice(), solos = [];
    function where(e) {   // (v1.3: a swung event's grid beat, e.g)
      var b = e.g != null ? e.g : e.beat, entry = Math.min(arr.length - 1, Math.floor(b / entryBeats + 1e-9)), inE = b - entry * entryBeats;
      return { entry: entry, bar: Math.floor(inE / 4 + 1e-9), step: Math.round((inE % 4) * 4) % C.STEPS };
    }
    function toAuto(n) { var a = { t: n.t, lane: n.lane, li: n.li, section: n.section, entry: n.entry, bar: n.bar, step: n.step, auto: true, kind: n.kind, midi: n.midi, len: n.len, power: n.power, mute: n.mute, strum: n.strum, up: n.up, trem: n.trem, bend: n.bend }; if (n.dead) a.dead = true; if (n.with) a.with = n.with; auto.push(a); }
    // v1.1 review: your voices (as 55 plays them); a same-voice partner at the head's instant layers on the head (n.with)
    function voiceOf(k) { return k === 'bass' ? 'pluck' : k === 'lead' || k === 'twang' ? 'lead' : 'strum'; }
    // contour lanes per entry (every seat event of the entry, so lanes never depend on the difficulty)
    var pitches = {};
    ev.forEach(function (e) { var w = where(e); (pitches[w.entry] = pitches[w.entry] || {})[e.midi] = 1; });
    var laneOf = {};
    Object.keys(pitches).forEach(function (en) {
      var list = Object.keys(pitches[en]).map(Number).sort(function (a, b) { return a - b; }), n = list.length, m = {};
      list.forEach(function (midi, i) { m[midi] = n === 1 ? Math.floor((L - 1) / 2 + 0.5) : n <= L ? Math.round(i * (L - 1) / (n - 1)) : Math.floor(i * L / n); });
      laneOf[en] = m;
    });
    // solo-role bars: the lead seat's spotlight (only the solo kind; the run's last bar is a shred window)
    var soloBars = {};
    ev.forEach(function (e) { if (e.role === 'solo') { var w = where(e); soloBars[w.entry * C.BARS_PER_SECTION + w.bar] = 1; } });
    if (seat === 'lead') {
      Object.keys(soloBars).map(Number).sort(function (a, b) { return a - b; }).forEach(function (b, i, all) {
        var e = Math.floor(b / C.BARS_PER_SECTION), bt0 = b * 4 * spb;
        var startRun = i === 0 || all[i - 1] !== b - 1, endRun = i === all.length - 1 || all[i + 1] !== b + 1;
        if (startRun) solos.push({ entry: e, t0: bt0, t1: bt0 });
        solos[solos.length - 1].t1 = bt0 + 4 * spb;
        if (endRun && free && !fills.some(function (f) { return Math.abs(f.t0 - bt0) < 1e-6; })) fills.push({ entry: e, t0: bt0, t1: bt0 + 4 * spb, shred: true });
      });
      fills.sort(function (a, b) { return a.t0 - b.t0; });
    }
    function inFill(t) { for (var k = 0; k < fills.length; k++) if (t >= fills[k].t0 - 1e-6 && t < fills[k].t1 - 1e-6) return true; return false; }
    // onsets: one note per moment
    var notes = [], i = 0;
    while (i < ev.length) {
      var j = i; while (j < ev.length && Math.abs(ev[j].beat - ev[i].beat) < 1e-6) j++;
      var grp = ev.slice(i, j).sort(function (a, b) { return kinds.indexOf(a.kind) - kinds.indexOf(b.kind) || a.midi - b.midi; });
      var e0 = grp[0], w = where(e0), bar = w.entry * C.BARS_PER_SECTION + w.bar, inSolo = !!soloBars[bar];
      if (seat === 'lead' && inSolo && soloKind) {   // the spotlight: the solo kind leads, the rest plays itself
        var sk = grp.filter(function (x) { return x.kind === soloKind; });
        if (sk.length) { grp = sk.concat(grp.filter(function (x) { return x.kind !== soloKind; })); e0 = grp[0]; }
      }
      var head = null;
      grp.forEach(function (x, gi) {
        var sound = Math.min(x.len, x.gap), n = { t: x.beat * spb, lane: '', li: 0, section: x.section, entry: w.entry, bar: w.bar, step: w.step, j: 0,
          kind: x.kind, midi: x.midi, len: Math.max(0.05, sound * spb), beats: sound };
        ['power', 'mute', 'strum', 'up', 'trem', 'bend', 'ring', 'dead'].forEach(function (k) { if (x[k] != null && x[k] !== false) n[k] = x[k]; });   // (v1.3: + dead, Scratch)
        n.li = (laneOf[w.entry] || {})[x.midi] || 0; n.lane = STR_LANES[n.li];
        var off = gi > 0 || (seat === 'lead' && inSolo && soloKind && x.kind !== soloKind)
          || (seat !== 'lead' && inSolo && w.step % 4 !== 0);   // someone else's solo: you lay back (one note per beat)
        if (!off && free && inFill(n.t)) n.free = true;       // a free window (as the drums): any tap there shows off
        if (gi > 0 && head && voiceOf(x.kind) === voiceOf(head.kind)) {   // (same pool: as an auto note it cut your tap to 30 ms)
          var wv = { kind: x.kind, midi: x.midi, len: n.len, power: !!n.power, mute: !!n.mute, ring: !!n.ring };
          if (n.dead) wv.dead = true;
          (head.with || (head.with = [])).push(wv);
          return;
        }
        if (off) toAuto(n); else notes.push(n);
        if (gi === 0 && !off && !n.free) head = n;
      });
      i = j;
    }
    // runs: same-pitch repeats <= RUN_GAP apart (per lane, no other note in between)
    var out = [], runs = 0, k = 0;
    while (k < notes.length) {
      var h = notes[k], m = k + 1;
      if (h.free || h.dead) { out.push(h); k++; continue; }   // (v1.3: a dead strum never starts a run)
      while (m < notes.length && !notes[m].free && notes[m].midi === h.midi && notes[m].kind === h.kind && notes[m].entry === h.entry
        && !!notes[m].dead === !!h.dead && notes[m].t - notes[m - 1].t <= gig.RUN_GAP + 1e-6) m++;
      if (m - k >= 2) {
        if (o.runs) {
          var lastN = notes[m - 1];
          h.run = true; h.t2 = lastN.t + lastN.len; h.len = h.t2 - h.t; h.hold = true; h.runN = m - k;
          h.seq = notes.slice(k + 1, m).map(function (x) { return [Math.round((x.t - h.t) * 10000) / 10000, x.midi, Math.round(x.len * 10000) / 10000]; });
          out.push(h); runs++;
        } else {
          for (var q = k; q < m; q++) { if (q === k || notes[q].step % 4 === 0) out.push(notes[q]); else toAuto(notes[q]); }
        }
        k = m; continue;
      }
      out.push(h); k++;
    }
    notes = out;
    // holds + chords
    var chordsOk = seat === 'rhythm' && (diff === 'hard' || diff === 'expert');
    notes.forEach(function (n) {
      if (n.free) { delete n.beats; return; }
      if (!n.run) { if (n.beats >= holdMin) n.hold = true; }
      // (v1.3: a dead strum and a one-string pick (part v2 singles) never chord; singles have no power either)
      if (chordsOk && !n.run && !n.dead && n.li + 1 < L && n.step % 8 === 0 && ((n.power && !n.mute) || (Array.isArray(n.strum) && n.strum.length > 1))) n.chord = [n.li, n.li + 1];
      delete n.beats;
    });
    // difficulty thinning (by lane index) ; a hold / run / chord counts at its head
    var tr = strLaneGap(gig.DIFFICULTIES[diff]);
    if (tr) {
      var kept = thin(notes, tr), keep = new Set(kept);
      notes.forEach(function (n) { if (!keep.has(n)) toAuto(n); });
      notes = kept;
    }
    // two thumbs, counting held notes; a new head in a hold's lane ends that hold
    if (o.thumbs !== false) {
      var open = [], fin = [];
      notes.forEach(function (n) {
        if (n.free) { fin.push(n); return; }
        open = open.filter(function (x) { return x.t + x.len > n.t + 1e-6; });
        open.forEach(function (x) { if (x.li === n.li || (n.chord && n.chord[1] === x.li)) { x.len = Math.max(0.05, n.t - x.t); if (x.run) x.t2 = n.t; } });
        open = open.filter(function (x) { return x.t + x.len > n.t + 1e-6; });
        var busy = open.length;
        if (n.chord && busy + 2 > gig.THUMBS) delete n.chord;
        if (busy + 1 > gig.THUMBS) { toAuto(n); return; }
        fin.push(n);
        if (n.hold) open.push(n);
      });
      notes = fin;
    }
    notes.forEach(function (n) {
      if (n.hold && n.len < (holdMin * spb) - 1e-6 && !n.run) delete n.hold;
      if (n.run && n.len < 0.1) { delete n.run; delete n.t2; delete n.seq; delete n.runN; if (n.len < holdMin * spb - 1e-6) delete n.hold; }
    });
    var total = 0, holds = 0, chords = 0, rn = 0;
    notes.forEach(function (n) { if (!n.free) total++; if (n.hold) holds++; if (n.chord) chords++; if (n.run) rn++; });
    // a free window scores up to as many show-off taps as your part has notes there (2..LIVE.fillCap): parity with the kit
    fills = fills.map(function (f) {
      var c = notes.filter(function (n) { return n.free && n.t >= f.t0 - 1e-6 && n.t < f.t1 - 1e-6; }).length;
      return Object.assign({}, f, { cap: U.clamp(c, 2, LC().fillCap) });
    });
    auto.sort(function (a, b) { return a.t - b.t; });
    return { songId: base.songId, title: base.title, bpm: base.bpm, spb: spb, lanes: L, duration: base.duration, notes: notes, auto: auto,
      total: total, doubles: 0, extras: 0, fills: fills, solos: seat === 'lead' ? solos : base.solos, sections: base.sections, seat: seat, genre: genre,
      holds: holds, chords: chords, runs: rn, kinds: kinds.slice(), tail: tl.tail || 0 };
  }


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
  // due(lane, t) -> bool (v1.0.1: judge(lane, t) would hit a note; pure) ;
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
    if (live.crowd == null) live.crowd = Math.round(U.clamp(cfg.crowdStart + (fit - 0.5) * cfg.crowdFit + state.buzz * cfg.crowdBuzz + mods(state).crowd
      + (GG.shop && state.gear ? GG.shop.crowdBonus(state) : 0), cfg.crowdRange[0], cfg.crowdRange[1]));   // v0.8: the kit sounds big
    var set = live.setlist.map(function (id) { return GG.songs.byId(state, id); }).filter(Boolean);
    if (opts.difficulty && live.difficulty == null) live.difficulty = opts.difficulty;
    var diff = live.difficulty || opts.difficulty || 'hard', dcfg = diffOf(diff), thinned = !!dcfg.laneGap;
    var W = gig.windows(state, diff), roles = gig.roles(state), genre = state.genre, MT = gig.moments(genre);
    var sigs = gig.signatures(state);   // v0.9: once per gig (live.sigDone survives a save between songs; perSong: cur.sigDone)
    var bonus = gig.setlistBonuses(state, set), unhappy = active(state).filter(function (m) { return m.mood < cfg.unhappy; });
    // v1.1: a string seat plays its own chart (seatChart: holds, chords, runs; S.release ends a hold). Auto-kick is a drum
    // assist (a string seat has no kick lane).
    var seat = GG.career.seatOf ? GG.career.seatOf(state) : 'drums', strings = seat !== 'drums', whammy = seat === 'lead' && !!(GG.shop && GG.shop.whammy && GG.shop.whammy(state));
    function LN(li) { return strings ? STR_LANES[li] : C.LANES[li]; }
    var assists = { noFail: !!opts.noFail, autoKick: !!opts.autoKick && !strings }, floor = assists.noFail ? gig.noFailFloor : 0;   // v0.6.1 C4
    var soloLift = (GG.content.economy.shop && GG.content.economy.shop.soloCrowd) || 3;
    var S = { state: state, gig: g, live: live, setlist: set, windows: W, roles: roles, fit: fit, bonus: bonus, difficulty: diff, assists: assists, seat: seat,
      attendance: live.attendance, crowd: live.crowd, level: gig.levelOf(live.crowd), combo: 0, index: live.index,
      done: live.index >= set.length, chart: null, t: 0, emit: opts.emit !== false, playing: false };
    var cur = null, tickOut = { misses: 0, crowd: 0, level: '', autoHits: 0 };
    // v0.7: a silent crowd (Japan): the meter holds still while a song plays (S.crowd frozen; the real crowd moves in
    // S.hidden), then the whole song's reaction lands at once when it ends, plus polite applause ('crowd:moment' applause).
    var silent = S.silent = !!(GG.tour && GG.tour.silentCrowd && GG.tour.silentCrowd(g));
    function real() { return silent && cur ? S.hidden : S.crowd; }
    function emit(ev, p) { if (S.emit) GG.emit(ev, p); }
    function crowdAdd(d) {
      if (silent && cur) { S.hidden = U.clamp(S.hidden + d, floor, 100); return; }
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
      var chart = strings ? gig.chart(song, { solo: !!roles.solo, difficulty: diff, seat: seat, genre: genre, soloist: roles.solo,
        lanes: GG.career.seatLanes(state), runs: GG.career.seatRuns(state) })
        : gig.chart(song, { solo: !!roles.solo, difficulty: thinned ? diff : null,
          extras: diff !== 'easy' && roles.fill && sdiff < cfg.fillsMaxDifficulty ? rng : null });
      var n = chart.notes, byLane = [], entryTotal = [], cues = [];
      for (var l = 0; l < C.LANES.length; l++) byLane.push([]);
      chart.sections.forEach(function () { entryTotal.push(0); });
      n.forEach(function (x, k) { byLane[x.li].push(k); if (x.chord) byLane[x.chord[1]].push(k); if (!x.free) entryTotal[x.entry]++; });
      chart.solos.forEach(function (s) { cues.push({ t: s.t0, kind: 'solo', section: chart.sections[s.entry] ? chart.sections[s.entry].name : null }); });
      var seen = {};
      n.forEach(function (x) { if (x.extra && !seen[x.entry]) { seen[x.entry] = 1; cues.push({ t: Math.max(0, x.t - 0.8), kind: 'fill' }); } });
      chart.sections.forEach(function (s) { if (s.name === 'chorus') cues.push({ t: s.t1, kind: 'chorus', entry: s.entry }); });
      var ch1 = chart.sections.filter(function (s) { return s.name === 'chorus'; })[0];
      if (ch1 && MT.chorus) cues.push({ t: ch1.t0, kind: 'chorusIn' });   // v0.9: the genre's chorus moment on the first chorus downbeat
      unhappy.forEach(function (m) {
        var k = m.mood < cfg.unhappy / 2 ? 2 : 1;
        rng.shuffle(chart.sections).slice(0, k).forEach(function (s) { cues.push({ t: s.t0 + 4 * chart.spb, kind: 'flub', who: m.id }); });
      });
      cues.sort(function (a, b) { return a.t - b.t; });
      var nps = chart.total / Math.max(1, chart.duration), dc = strings ? (cfg.seatDensityClamp || [0.4, 4]) : cfg.densityClamp;   // strings: per-second gains stay normalized down to ~1.1 notes/s
      cur = { i: i, song: song, chart: chart, notes: n, byLane: byLane, lp: [0, 0, 0, 0, 0, 0], mp: 0, cues: cues, ci: 0, dblHit: -1, echoFor: null,
        perfect: 0, good: 0, stray: 0, fills: 0, fillsIn: {}, maxCombo: 0, missStreak: 0, flubs: 0, extrasHit: 0,
        entryTotal: entryTotal, entryHits: entryTotal.map(function () { return 0; }), crowdSum: 0, crowdT: 0, lastT: 0,
        moments: [], lastMoment: {}, genreDone: false, capeDone: false, cheer: !!song.classic,
        dens: U.clamp(cfg.densityRef / Math.max(0.5, nps), dc[0], dc[1]),
        staleMul: Math.max(0.2, 1 - (song.stale || 0) / cfg.staleGain) };
      if (strings) { cur.hold = [-1, -1, -1, -1, -1, -1]; cur.holds = 0; cur.rings = 0; cur.heldSum = 0; cur.bends = 0; }
      S.chart = chart; S.index = i; S.combo = 0; S.t = 0; S.playing = true; S.crowd = live.crowd; S.hidden = live.crowd;
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
      if (x.dbl) { x.hitT = t; cur.dblHit = k; }   // v0.7.2: the second kick plays at max(t2, just after this)
      if (x.hold && cur.hold && !x.half) { if (cur.hold[x.li] >= 0) endHold(x.li, t); cur.hold[x.li] = k; x.hitT = t; }   // v1.1: held from here
      if (x.bend && whammy) { cur.bends++; crowdAdd((cfg.bendGain != null ? cfg.bendGain : 0.6) * cur.staleMul); }   // v1.1: the lead's whammy (amp tier 2): bends score
      if (kind === 'perfect') cur.perfect++; else cur.good++;
      if (x.extra) cur.extrasHit++;
      cur.entryHits[x.entry]++;
      S.combo++; cur.missStreak = 0;
      if (S.combo > cur.maxCombo) cur.maxCombo = S.combo;
      crowdAdd(c * (1.15 - real() / 200));
      if (S.combo % cfg.comboStep === 0) crowdAdd(cfg.comboBonus);
      var cm = MT.combo || 'mosh';   // v0.9: the genre's combo moment (metal: mosh)
      if (!silent && S.combo % cfg.moshCombo === 0 && S.crowd >= cfg.moshCrowd && ready(cm, t)) moment(cm, t);
      for (var si = 0; si < sigs.length; si++) {   // v0.9: band signatures (Rox's stage dive, ...), once per gig; perSong (Marcel's cape) once per song
        var sg = sigs[si], done = live.sigDone || (live.sigDone = {}), sd = cur.sigDone || (cur.sigDone = {});
        if ((sg.perSong ? sd[sg.id] : done[sg.id]) || S.combo < (sg.action === 'capeSpin' ? cfg.capeCombo : sg.combo)) continue;
        done[sg.id] = true; sd[sg.id] = true; if (sg.action === 'capeSpin') cur.capeDone = true;
        crowdAdd(sg.action === 'capeSpin' ? cfg.capeCrowd : sg.crowd); moment(sg.action, t); band(sg.id, sg.action);
      }
    }
    function miss(x, t) {
      x.j = 3; S.combo = 0; cur.missStreak++;
      crowdAdd(cfg.gain.miss * cur.dens * dcfg.miss);
      emit('gig:judge', { lane: x.lane, judgement: 'miss', combo: 0, crowd: S.crowd });
      if (!silent && !assists.noFail && cur.missStreak >= cfg.booStreak && S.crowd < cfg.booCrowd && ready('boo', t)) {   // v0.7: polite crowds never boo
        moment('boo', t);
        if (S.crowd < cfg.drinksCrowd && ready('drinks', t)) moment('drinks', t);
      }
    }
    // v1.1 holds (string seats): the head is judged like a tap; while held, sustain points (a small crowd lift per second);
    // releasing early only gates the sound (no miss, no combo break); held >= 90 % = the ring bonus. A new head in the same
    // lane ends the hold. Emits 'gig:hold' { lane, held (0..1), ring }.
    function endHold(li, t) {
      var k = cur.hold ? cur.hold[li] : -1;
      if (k == null || k < 0) return null;
      var x = cur.notes[k], held = U.clamp((t - x.t) / Math.max(0.001, x.len), 0, 1), ring = held >= (cfg.ringAt || 0.9);
      cur.hold[li] = -1; cur.holds++; cur.heldSum += held;
      x.held = Math.round(held * 1000) / 1000;
      if (ring) { cur.rings++; crowdAdd((cfg.ringGain != null ? cfg.ringGain : 0.1) * cur.staleMul); }
      var out = { lane: LN(li), held: x.held, ring: ring };
      emit('gig:hold', out);
      return out;
    }
    S.release = function (lane, t) {
      if (!cur || !cur.hold) return null;
      var li = typeof lane === 'number' ? lane : LI[lane];
      return li >= 0 && li < cur.hold.length ? endHold(li, t) : null;
    };
    S.holding = function (lane) {
      if (!cur || !cur.hold) return null;
      var li = typeof lane === 'number' ? lane : LI[lane], k = li >= 0 ? cur.hold[li] : -1;
      return k >= 0 ? cur.notes[k] : null;
    };
    S.judge = function (lane, t) {
      if (!cur) return null;
      var li = typeof lane === 'number' ? lane : LI[lane];
      if (!(li >= 0 && li < cur.byLane.length)) return null;
      if (cur.hold && cur.hold[li] >= 0) endHold(li, t);   // v1.1: a new tap in a held lane ends that hold
      if (assists.autoKick && li === LI.kick) return { judgement: null, note: null, combo: S.combo, crowd: S.crowd, auto: true };   // the kick plays itself
      var list = cur.byLane[li], k = cur.lp[li], best = -1, bestD = 1e9, n = cur.notes;
      while (k < list.length && n[list[k]].j !== 0) k++;
      cur.lp[li] = k;
      for (; k < list.length; k++) {
        var x = n[list[k]];
        if (x.t > t + W.good) break;
        if (x.j !== 0 || x.free || (x.cl && x.cl.indexOf(li) >= 0)) continue;
        var d = Math.abs(t - x.t);
        if (d <= W.good && d < bestD) { best = list[k]; bestD = d; }
      }
      if (best >= 0 && n[best].chord) {   // v1.1 a 2-lane chord: one note, both lanes within the window (the worse tap counts)
        var cx = n[best];
        if (!cx.cl) { cx.cl = [li]; cx.cd = bestD; cx.ct = t; return { judgement: null, note: cx, combo: S.combo, crowd: S.crowd, partial: true }; }
        cx.cl.push(li); bestD = Math.max(bestD, cx.cd);
      }
      var f = fillAt(t), out, dh = li === LI.kick && cur.dblHit >= 0 ? n[cur.dblHit] : null;
      if (dh && Math.abs(t - dh.t2) <= W.good && (best < 0 || Math.abs(t - dh.t2) < bestD)) {   // v0.7.2: tapping the double's
        // second kick too: no stray. A note this tap also reached keeps it: never tapped later, it's a hit, not a miss
        if (best >= 0) cur.echoFor = { k: best, kind: bestD <= W.perfect ? 'perfect' : 'good', t: t };   // (an early tap for it)
        out = { judgement: null, note: null, combo: S.combo, crowd: S.crowd, echo: true, dbl: dh };
        emit('gig:judge', { lane: 'kick', judgement: null, combo: S.combo, crowd: S.crowd });
        return out;
      }
      if (best >= 0 && (bestD <= W.perfect || !f || n[best].t < f.t0 || n[best].t >= f.t1 - 1e-6)) {   // a note outside the window wins
        var kind = bestD <= W.perfect ? 'perfect' : 'good';
        hit(best, kind, t);
        out = { judgement: kind, note: n[best], combo: S.combo, crowd: S.crowd, offset: t - n[best].t };
      } else if (f) {
        var key = f.entry, got = cur.fillsIn[key] || 0;
        if (got < (f.cap || cfg.fillCap)) { cur.fillsIn[key] = got + 1; cur.fills++; crowdAdd(cfg.gain.fill); }
        out = { judgement: 'fill', note: null, combo: S.combo, crowd: S.crowd };
      } else {
        cur.stray++; crowdAdd(cfg.gain.stray * dcfg.miss);
        out = { judgement: null, note: null, combo: S.combo, crowd: S.crowd, stray: true };
      }
      emit('gig:judge', { lane: LN(li), judgement: out.judgement, combo: S.combo, crowd: S.crowd });
      if (out.note && out.note.chord) emit('gig:judge', { lane: LN(out.note.chord[0] === li ? out.note.chord[1] : out.note.chord[0]), judgement: out.judgement, combo: S.combo, crowd: S.crowd, chord: true });
      return out;
    };
    // v1.0.1 smart bridge: would judge(lane, t) hit a note? Pure (no state change, no emit): a judgeable unhit note in the
    // lane within W.good of t that judge() would take (not a double's echo, not a fill-window tap, not an Auto-kick lane).
    S.due = function (lane, t) {
      if (!cur) return false;
      var li = typeof lane === 'number' ? lane : LI[lane];
      if (!(li >= 0 && li < cur.byLane.length)) return false;
      if (assists.autoKick && li === LI.kick) return false;
      var list = cur.byLane[li], n = cur.notes, best = -1, bestD = 1e9;
      for (var k = cur.lp[li]; k < list.length; k++) {
        var x = n[list[k]];
        if (x.t > t + W.good) break;
        if (x.j !== 0 || x.free || (x.cl && x.cl.indexOf(li) >= 0)) continue;
        var d = Math.abs(t - x.t);
        if (d <= W.good && d < bestD) { best = list[k]; bestD = d; }
      }
      if (best < 0) return false;
      var dh = li === LI.kick && cur.dblHit >= 0 ? n[cur.dblHit] : null;
      if (dh && Math.abs(t - dh.t2) <= W.good && Math.abs(t - dh.t2) < bestD) return false;
      var f = fillAt(t);
      return bestD <= W.perfect || !f || n[best].t < f.t0 || n[best].t >= f.t1 - 1e-6;
    };
    function cue(c, t) {
      if (c.kind === 'solo') { moment('solo', t); band(roles.solo, 'solo'); if (c.section === 'solo') crowdAdd(soloLift); }   // v0.8: Dana's own section
      else if (c.kind === 'fill') band(roles.fill, 'fill');
      else if (c.kind === 'flub') { cur.flubs++; crowdAdd(-cfg.flub); band(c.who, 'miss'); }
      else if (c.kind === 'chorus') {
        var tot = cur.entryTotal[c.entry];
        if (MT.peak !== 'lighters' && tot && cur.entryHits[c.entry] / tot >= cfg.lightersRate && S.crowd >= cfg.lightersCrowd && ready('lighters', t)) moment('lighters', t);
      } else if (c.kind === 'chorusIn') {
        if (!silent && !cur.chorusDone && S.crowd >= cfg.chorusCrowd) { cur.chorusDone = true; moment(MT.chorus, t); }
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
      if (cur.hold) for (var hl = 0; hl < cur.hold.length; hl++) {   // v1.1: holds ring out at their end; sustain while held
        var hk = cur.hold[hl]; if (hk < 0) continue;
        var hx = n[hk], hend = hx.t + hx.len;
        if (t >= hend) endHold(hl, hend);
        else if (dt > 0) crowdAdd((cfg.holdGain != null ? cfg.holdGain : 0.1) * dt * cur.staleMul);
      }
      // v1.1 flow (string seats): while you are in it (a combo going), the crowd warms at a steady rate, so a sparse part
      // (country boom-chick, ringing chords) moves a room like a busy one; a miss stops the flow until your next hit.
      if (cur.hold && dt > 0 && S.combo > 0) crowdAdd((cfg.flowGain != null ? cfg.flowGain : 2) * (FLOW[diff] || 1) * (seat === 'lead' ? FLOW.lead : 1) * dt * cur.staleMul * (1.15 - real() / 200));
      var lim = t - W.good - cfg.grace;
      while (cur.mp < n.length && n[cur.mp].t < lim) {
        var x = n[cur.mp++];
        if (x.j === 0) {
          var ef = cur.echoFor;
          if (x.free) x.j = 4;
          else if (x.cl) {   // v1.1: one lane of a chord = a Good (review: never a hold; a held half chord counts as held 0)
            x.half = true; hit(cur.mp - 1, 'good', x.ct); emit('gig:judge', { lane: x.lane, judgement: 'good', combo: S.combo, crowd: S.crowd });
            if (x.hold && cur.hold) { cur.holds++; x.held = 0; emit('gig:hold', { lane: x.lane, held: 0, ring: false }); }
          }
          else if (ef && ef.k === cur.mp - 1) {   // v0.7.2: an early tap read as a double's echo was this note's: credit it
            cur.echoFor = null; hit(ef.k, ef.kind, ef.t);
            emit('gig:judge', { lane: x.lane, judgement: ef.kind, combo: S.combo, crowd: S.crowd });
          } else { miss(x, t); misses++; }
        }
      }
      if (dt > 0) { var rc = real(); crowdAdd(-rc * cfg.decay * dt); cur.crowdSum += real() * dt; cur.crowdT += dt; }
      if (!silent && !cur.genreDone && S.crowd >= cfg.genreCrowd && MT.peak) { cur.genreDone = true; moment(MT.peak, t); }
      tickOut.misses = misses; tickOut.crowd = S.crowd; tickOut.level = S.level;
      return tickOut;
    };
    S.endSong = function () {
      if (!cur) return null;
      if (cur.hold) for (var eh = 0; eh < cur.hold.length; eh++) if (cur.hold[eh] >= 0) endHold(eh, cur.lastT);
      var n = cur.notes, ch = cur.chart, song = cur.song;
      for (var k = 0; k < n.length; k++) if (n[k].j === 0) n[k].j = n[k].free ? 4 : 3;
      if (silent) {   // v0.7: the song ends, the silence breaks: the whole reaction at once + polite applause if it went well
        var acc0 = ch.total ? (cur.perfect + cur.good) / ch.total : 1, roar = acc0 >= 0.7 ? 6 : acc0 >= 0.5 ? 2 : 0;
        S.crowd = U.clamp(S.hidden + roar, floor, 100);
        var lv0 = gig.levelOf(S.crowd);
        if (lv0 !== S.level) { S.level = lv0; emit('crowd:level', { level: lv0, crowd: S.crowd }); }
        if (roar) { if (cur.moments.indexOf('applause') < 0) cur.moments.push('applause'); emit('crowd:moment', { kind: 'applause' }); }
      }
      var total = ch.total, miss = total - cur.perfect - cur.good;
      var noteScore = total ? 100 * Math.pow((cur.perfect + cur.good * cfg.goodValue) / total, cfg.noteCurve) : 100;
      var avg = cur.crowdT > 0 ? cur.crowdSum / cur.crowdT : S.crowd, nFill = ch.fills.length * cfg.fillCap;
      if (strings) nFill = ch.fills.reduce(function (a, f) { return a + (f.cap || cfg.fillCap); }, 0);   // v1.1: a string window's cap = its notes
      var score = noteScore * cfg.songNotes + avg * cfg.songCrowd + (nFill ? cfg.fillScore * cur.fills / nFill : 0)
        + (song.classic ? cfg.classicScore : 0) + (cur.genreDone ? cfg.genreScore : 0) - (song.stale || 0) * cfg.stalePenalty;
      var r = { songId: song.id, title: song.title, score: Math.round(U.clamp(score, 0, 100)),
        accuracy: total ? Math.round((cur.perfect + cur.good) / total * 1000) / 1000 : 1,
        perfect: cur.perfect, good: cur.good, miss: miss, maxCombo: cur.maxCombo, crowdEnd: Math.round(S.crowd),
        crowdAvg: Math.round(avg), fills: cur.fills, moments: cur.moments.slice(), notes: total, flubs: cur.flubs,
        extras: ch.extras, extrasHit: cur.extrasHit, stray: cur.stray, cheer: cur.cheer, stale: song.stale || 0 };
      if (cur.hold) {   // v1.1 string seats: holds, rings, how much you held; the lead seat's spotlight time (Solo Too Long)
        r.seat = seat; r.holds = cur.holds; r.rings = cur.rings; r.held = cur.holds ? Math.round(cur.heldSum / cur.holds * 1000) / 1000 : 1;
        if (whammy) r.bends = cur.bends;
        if (seat === 'lead') {   // your spotlight: seconds of solo bars, and how many of your notes were in them
          r.dur = Math.round(ch.duration * 10) / 10; r.solo = Math.round(ch.solos.reduce(function (a, x) { return a + x.t1 - x.t0; }, 0) * 10) / 10;
          r.soloNotes = n.filter(function (x) { return ch.solos.some(function (q) { return x.t >= q.t0 - 1e-6 && x.t < q.t1 - 1e-6; }); }).length;   // (+ the shred bar)
          r.allNotes = n.length;
        }
      }
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
        fills: cur.fills, combo: S.combo, maxCombo: cur.maxCombo, crowd: S.crowd, flubs: cur.flubs, stray: cur.stray } : null;
    };
    S.finish = function () { return finishLive(S, seed); };
    return S;
  };

  // Reaction lines for what happened on stage. v0.9: content first: lines.live[memberId].{solo, fill, signature, flub}
  // (member-keyed) and lines.moments[kind] (crowd moments; + byBand); these neutral lines are the fallback.
  var LIVE_LINES = {
    signature: { capeSpin: ['Did everyone see the cape? Everyone saw the cape.', 'The cape and I were one tonight.'],
      any: ['Did everyone see that? Everyone saw that.', 'I am going to be feeling that tomorrow. Worth it.'] },
    solo: ['That solo? Mine. You are welcome.', 'Nobody breathe. I think I just peaked.'],
    fill: ['Did you catch that fill? Be honest.', 'Snuck a fill in. You kept up. Respect.'],
    flub: ['I missed a cue. The monitor looked at me funny.', 'That wrong note was a choice. A bad one.'],
    genre: { metal: "A wall of death broke out in {city}. Somebody's mom was in it.", punk: 'The circle pit took out the merch table. Worth it.',
      rock: 'Lighters. Actual lighters. Someone used a phone and got booed.', country: 'They line danced. Somebody brought a lasso.' }
  };
  gig.LIVE_LINES = LIVE_LINES;
  function liveLines(state, id, key, fallback) {
    var L = GG.content.lines && GG.content.lines.live, own = L && L[id] && L[id][key];
    return own && own.length ? own : fallback;
  }
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
    var peak = peakMoment(state.genre), genreHit = moments.indexOf(peak) >= 0 && score >= 50;
    var lines = [GG.career.fillText(state, g.quirk), GG.career.pickLine(state, rng, gradeLines(state, grade), GRADE_LINES[grade])];
    if (opener) lines.push('Opening with “' + played[0].title + '” grabbed them by the collar.');
    if (closer) lines.push('Closing on “' + played[played.length - 1].title + '” brought the house down.');
    if (genreHit) {
      var mp = GG.career.linePool ? GG.career.linePool(state, ['moments', peak]) : null;
      lines.push(mp ? GG.career.pickLine(state, rng, mp) : GG.career.fillText(state, LIVE_LINES.genre[state.genre] || ''));
    }
    var roles = S.roles, special = {}, sigAll = gig.signatures(state);
    Object.keys(live.sigDone || {}).forEach(function (id) {   // v0.9: whoever pulled their signature move
      var sg = sigAll.filter(function (x) { return x.id === id; })[0] || {};
      special[id] = liveLines(state, id, 'signature', LIVE_LINES.signature[sg.action] || LIVE_LINES.signature.any);
    });
    if (moments.indexOf('solo') >= 0 && roles.solo && score >= 50) special[roles.solo] = liveLines(state, roles.solo, 'solo', LIVE_LINES.solo);
    if (sum('extrasHit') > 0 && roles.fill) special[roles.fill] = liveLines(state, roles.fill, 'fill', LIVE_LINES.fill);
    var reacts = reactions(state, grade, rng);
    if (sum('flubs') > 0) active(state).forEach(function (m) { if (m.mood < cfg.unhappy) special[m.id] = liveLines(state, m.id, 'flub', LIVE_LINES.flub); });
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
        var off = jit ? U.clamp(gauss(), -3, 3) * jit : 0, at = Math.max(from, n.t + off);
        taps.push({ t: at, li: n.li });
        if (n.chord) taps.push({ t: at, li: n.chord[1] });   // v1.1: both lanes of a chord
        if (n.hold) taps.push({ t: Math.max(at, n.t + n.len), li: n.li, up: true });   // v1.1: held to its end (runs too)
      });
      taps.sort(function (a, b) { return a.t - b.t; });
      var end = ch.duration + 0.4, k = 0;
      for (var T = from + 0.05; ; T += 0.05) {
        var now = Math.min(T, end);
        while (k < taps.length && taps[k].t <= now) { if (taps[k].up) S.release(taps[k].li, taps[k].t); else S.judge(taps[k].li, taps[k].t); k++; }
        S.tick(now);
        if (now >= end) break;
      }
      out = S.endSong();
      if (o.one) return out;
    }
    return S.finish();
  };

  /* ==== v1.3.1 Simulate (plan_1.3.1 §1.1; 02_contracts V1.3.1) ============================================== */
  // A simulated gig is the REAL live session played headlessly by botPlay at "your own average" (the last played gigs of
  // this seat in state.playLog), finished into the normal GIG_RESULT (+ simulated, sim) and applied through the normal
  // path by the caller (career.finishGig -> settleGig): everything counts. Played gigs are untouched: they only append
  // to state.playLog in applyResult (the result itself gains no field).
  //   simReason(state, g?) -> null | 'phase' | 'gig' | 'showdown' | 'festival' | 'rival' | 'lesson'  (canSimulate = null)
  //   simBot(state, difficulty) -> { accuracy, jitterMs, from: 'own'|'band', n, acc, ps }   pure
  //   simSong(S, bot) -> SONG_RESULT (the next song; seeded per career / gig / song; marks state.liveGig.sim = bot)
  //   simFinish(S, bot) -> GIG_RESULT + simulated: true, sim: { from, n, acc }   ;   simShow(S, bot) = the rest + simFinish
  // bot.acc is the hit share aimed at; each song's tap chance + draw are fitted to its own chart (simTap), so the gig
  // lands within a point or two of it on every seat, difficulty and assist (tests/sim_gig 'simulate: your average').
  function erf(x) {   // Abramowitz & Stegun 7.1.26 (|error| < 1.5e-7)
    var s = x < 0 ? -1 : 1; x = Math.abs(x);
    var t = 1 / (1 + 0.3275911 * x);
    return s * (1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x));
  }
  function inWin(ms, w) { return erf(w / (Math.max(0.5, ms) / 1000 * Math.SQRT2)); }   // P(|N(0, ms)| <= w s)
  function r4(x) { return Math.round(x * 10000) / 10000; }
  gig.simReason = function (state, g) {
    if (!state || state.phase !== 'gig' || !state.gig) return 'phase';
    g = g || state.gig;
    if (g !== state.gig && g.venueId !== state.gig.venueId) return 'gig';
    if (g.showdown || state.gig.showdown) return 'showdown';   // botb / festival / final: story shows are played
    if (g.festival || state.gig.festival) return 'festival';   // a tour festival slot
    if (GG.rival && GG.rival.pending && GG.rival.pending(state)) return 'rival';   // the same routing as GG.main.playWeekend
    if (state.tutorial && state.tutorial.on && !(state.stats && state.stats.gigs)) return 'lesson';   // w1_gig teaches Start
    return null;
  };
  gig.canSimulate = function (state, g) { return gig.simReason(state, g) === null; };
  gig.simBot = function (state, difficulty) {
    var diff = gig.DIFFICULTIES[difficulty] ? difficulty : 'hard', seat = GG.career.seatOf(state), min = C.SIM_MIN_PLAYED || 2;
    var log = (Array.isArray(state.playLog) ? state.playLog : []).filter(function (e) { return e && e.seat === seat && isFinite(e.acc) && isFinite(e.ps); });
    var same = log.filter(function (e) { return e.diff === diff; }), use = same.length >= min ? same : log.length >= min ? log : null;
    var W = gig.windows(state, diff);
    if (!use) {   // the band's level: your skill stat (between the tests' average bot 0.82 / 55 ms and balance's 0.93 / 25 ms)
      var k = U.clamp(((state.drumSkill || 10) - 10) / 70, 0, 1), a = r4(0.75 + 0.18 * k), j = Math.round((65 - 40 * k) * 10) / 10;
      var qg = inWin(j, W.good);
      return { accuracy: a, jitterMs: j, from: 'band', n: log.length, acc: Math.round(a * qg * 1000) / 1000, ps: Math.round(inWin(j, W.perfect) / qg * 1000) / 1000 };
    }
    var A = use.reduce(function (t, e) { return t + e.acc; }, 0) / use.length, P = use.reduce(function (t, e) { return t + e.ps; }, 0) / use.length;
    A = Math.round(U.clamp(A, 0, 1) * 1000) / 1000; P = Math.round(U.clamp(P, 0, 1) * 1000) / 1000;
    function ratio(ms) { return inWin(ms, W.perfect) / inWin(ms, W.good); }   // Perfects among hits at this spread (falls as ms grows)
    function solve(f, v) {   // f falls as ms grows: the ms in 5..150 where f(ms) = v
      var lo = 5, hi = 150;
      if (v >= f(lo)) return lo;
      if (v <= f(hi)) return hi;
      for (var it = 0; it < 40; it++) { var mid = (lo + hi) / 2; if (f(mid) > v) lo = mid; else hi = mid; }
      return (lo + hi) / 2;
    }
    var sig = P >= 0.995 ? 5 : solve(ratio, P);
    // Your hits come first: a spread so wide that A can't be reached (a late-but-steady player: few Perfects, few misses)
    // narrows until A is reachable with a little headroom (the Perfect share then reads a bit above yours).
    var cap = solve(function (ms) { return inWin(ms, W.good); }, Math.min(0.999, A / 0.97));
    sig = Math.round(Math.min(sig, cap) * 10) / 10;
    return { accuracy: r4(U.clamp(A / inWin(sig, W.good), 0.05, 1)), jitterMs: sig, from: 'own', n: use.length, acc: A, ps: P };
  };
  // The tap chance that lands bot.acc of this song's judged notes. A first guess from the chart (Auto-kick notes play
  // themselves; a non-Perfect tap inside a fill window is a fill tap, not a hit), then dry runs of this very song on a
  // scratch session (same chart and rng as the real run, no events, state untouched) home in on it (simTap): in a dense
  // lane a tap often catches its neighbour, so the guess alone runs a few points hot on drums; a short song is lumpy.
  var SIM_PROBES = 8, SIM_TOL = 0.01;   // dry runs per song at most; close enough (or half a note on a short song)
  function simGuess(S, bot) {
    var ch = S.chart, W = S.windows, qg = inWin(bot.jitterMs, W.good), qp = inWin(bot.jitterMs, W.perfect);
    var n = 0, auto = 0, q = 0, kick = LI.kick, fills = ch.fills || [];
    for (var i = 0; i < ch.notes.length; i++) {
      var x = ch.notes[i]; if (x.free) continue;
      n++;
      if (S.assists.autoKick && x.li === kick && S.seat === 'drums') { auto++; continue; }
      var inFill = false;
      for (var f = 0; f < fills.length; f++) if (x.t >= fills[f].t0 && x.t < fills[f].t1 - 1e-6) { inFill = true; break; }
      q += inFill ? qp : qg;
    }
    if (!n || q <= 0) return { p: bot.accuracy, base: 0 };
    var m = Math.max(1, n - auto), want = U.clamp((bot.acc * n - auto) / m, 0, 1);
    return { p: r4(U.clamp(want / (q / m), 0.05, 1)), base: auto / n };
  }
  // botPlay's song loop (same taps, same rng use) on a scratch session T: the share of T's judged notes hit. No endSong.
  function dryRun(T, p, jit, rng) {
    function gauss() { var u = Math.max(1e-9, rng.next()), v = rng.next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    var ch = T.startSong(), taps = [];
    ch.notes.forEach(function (n) {
      if (n.j !== 0 || n.t < -0.001 || !rng.chance(p)) return;
      var off = jit ? U.clamp(gauss(), -3, 3) * jit : 0, at = Math.max(0, n.t + off);
      taps.push({ t: at, li: n.li });
      if (n.chord) taps.push({ t: at, li: n.chord[1] });
      if (n.hold) taps.push({ t: Math.max(at, n.t + n.len), li: n.li, up: true });
    });
    taps.sort(function (a, b) { return a.t - b.t; });
    var end = ch.duration + 0.4, k = 0;
    for (var t = 0.05; ; t += 0.05) {
      var now = Math.min(t, end);
      while (k < taps.length && taps[k].t <= now) { if (taps[k].up) T.release(taps[k].li, taps[k].t); else T.judge(taps[k].li, taps[k].t); k++; }
      T.tick(now);
      if (now >= end) break;
    }
    var st = T.stats();
    return ch.total ? (st.perfect + st.good) / ch.total : 1;
  }
  // -> { p, seed }: the tap chance and the draw whose dry run of this song lands nearest bot.acc. Each probe takes the next
  // seed of `key` (career seed | gig start | venue | song) at the chance the last probe asks for (scaled by want / got,
  // past Auto-kick's share), so the probes both correct the guess and sample the luck.
  function simTap(S, bot, key) {
    var live = S.live, i = S.index, want = bot.acc, g = simGuess(S, bot), p = g.p;
    if (want == null) return { p: p, seed: GG.hashSeed(key) };
    function probe(x, sd) {
      var sh = Object.assign({}, S.state);   // a shallow scratch copy: the session writes only sh.liveGig
      sh.liveGig = { gig: live.gig, setlist: live.setlist, index: i, songs: [], crowd: live.crowd, started: live.started,
        attendance: live.attendance, difficulty: live.difficulty };
      var T = gig.session(sh, S.gig, null, { emit: false, difficulty: S.difficulty, noFail: S.assists.noFail, autoKick: S.assists.autoKick });
      return dryRun(T, x, bot.jitterMs / 1000, GG.RNG(sd));
    }
    var best = null, tol = Math.max(SIM_TOL, 0.5 / Math.max(1, S.chart.total));
    for (var k = 0; k < SIM_PROBES; k++) {
      var sd = GG.hashSeed(k ? key + '|' + k : key), a = probe(p, sd), e = Math.abs(a - want);
      if (!best || e < best.err) best = { p: p, seed: sd, err: e };
      if (best.err <= tol) break;
      p = r4(U.clamp(p * (want - g.base) / Math.max(0.01, a - g.base), 0.05, 1));
    }
    return best;
  }
  gig.simSong = function (S, bot) {
    if (S.done && !S.playing) return null;
    var live = S.live, i = S.playing ? S.index : live.index;
    if (!live.sim) live.sim = { accuracy: bot.accuracy, jitterMs: bot.jitterMs, from: bot.from, n: bot.n, acc: bot.acc, ps: bot.ps };   // a reload finishes it simulated
    var fresh = !S.playing;
    if (fresh) S.startSong();
    var key = [S.state.seed, live.started, S.gig.venueId, 'sim', i].join('|');
    var t = fresh ? simTap(S, bot, key) : { p: simGuess(S, bot).p, seed: GG.hashSeed(key) };
    return gig.botPlay(S, { accuracy: t.p, jitterMs: bot.jitterMs, one: true }, GG.RNG(t.seed));
  };
  gig.simFinish = function (S, bot) {
    bot = bot || S.live.sim || {};
    var r = S.finish();
    r.simulated = true; r.sim = { from: bot.from || 'band', n: bot.n || 0, acc: bot.acc != null ? bot.acc : null };
    return r;
  };
  gig.simShow = function (S, bot) {
    while (!S.done || S.playing) gig.simSong(S, bot);
    return gig.simFinish(S, bot);
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
