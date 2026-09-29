// 22_sim_gig.js: gigs. v0.1 is an auto-resolve placeholder: a performance score from the band's numbers
// becomes a grade, a crowd, pay and new fans. v0.3 swaps simulate() for the rhythm game and keeps applyResult().
// No DOM, no audio; randomness only from the rng passed in.
//   GIG        = { venueId, name, city, tier, kind, capacity, deal, pay, gas, quirk, source }
//   GIG_RESULT = { venueId, name, city, deal, crowd, capacity, score, grade, pay, gas, fans, buzz,
//                  songs:[titles], songIds, reactions:[{ who, text }], lines:[text], source, deltas }
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
    return null;
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
  function avgSkill(state) {
    var act = state.members.filter(function (m) { return m.status === 'active'; });
    return act.length ? act.reduce(function (t, m) { return t + m.skill; }, 0) / act.length : 0;
  }
  // Deterministic part of the score (0..100-ish) from the band, its best songs and the genre fit; simulate() adds noise.
  gig.performance = function (state, set, fit) {
    var g = G(), w = g.weights;
    var songAvg = set.length ? set.reduce(function (t, s) { return t + GG.songs.score(s); }, 0) / set.length : 0;
    var raw = g.base + avgSkill(state) * w.skill + state.drumSkill * w.drum + state.chemistry * w.chemistry
      + songAvg * w.songs - Math.max(0, state.burnout - g.burnoutFrom) * g.burnoutPenalty;
    return raw * (g.fitFloor + (1 - g.fitFloor) * fit);
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
      * Math.max(0, 1 - state.fans / cfg.localScene);
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
  gig.applyResult = function (state, r) {
    var cfg = G(), fx = { fund: r.pay - r.gas, fans: r.fans, buzz: r.buzz, chemistry: cfg.chemistry[r.grade],
      burnout: cfg.burnout, mood: { all: cfg.mood[r.grade] } };
    r.deltas = GG.career.applyEffects(state, fx, {});
    r.classics = GG.songs.played(state, r.songIds, r.grade).map(function (s) { return s.id; });   // plays, stale, classics
    state.stats.gigs++;
    state.stats.earned += r.pay;
    var best = state.stats.bestGrade;
    if (!best || C.GRADES.indexOf(r.grade) < C.GRADES.indexOf(best)) state.stats.bestGrade = r.grade;
    state.lastGig = r;
    state.gig = null;
    return r.deltas;
  };

  // v0.1: simulate + apply the booked gig. Returns the GIG_RESULT (null if nothing is booked).
  gig.autoResolve = function (state, rng) {
    if (!state.gig) return null;
    var r = gig.simulate(state, state.gig, rng);
    gig.applyResult(state, r);
    return r;
  };

  GG.registerDebug('gig', function () {
    var s = GG.state; if (!s) return { gig: null };
    var l = s.lastGig;
    return { booked: s.gig && s.gig.venueId, offer: s.offer && s.offer.venueId,
      last: l ? { venue: l.venueId, grade: l.grade, crowd: l.crowd, pay: l.pay, fans: l.fans } : null };
  });
})(window.GG);
