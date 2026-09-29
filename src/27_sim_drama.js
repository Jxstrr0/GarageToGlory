// 27_sim_drama.js: band drama (v0.4). Moods get pushed each week by money (pay the band vs what they expect),
// overwork (burnout), band success (fans trend, gig grades) and personal wants (content/drama.js); recruits add traits.
// Grievance stages: 0 fine → 1 grumbling → 2 passive-aggressive → 3 ultimatum (a forced Monday card) → 4 quit.
// A stage moves at most one step per week (the ultimatum card decides 3 → 2 or 4) and ultimatums/quits only happen once
// the garage-era protection is off (250 fans). Quits leave a hole: play with it (score/crowd penalty), hire a fill-in
// (cost per gig, lower chemistry, no drama) or post an ad (three generated candidates) and hire one. Originals run an
// exit storyline (chat beats) and come back months later via a return card; turned down, they defect to your rival.
// Pure sim: no DOM; randomness only from GG.rngFor(state) (cosmetic fill-in looks use a seeded RNG). Hooks:
// career.newCareer (init), startWeek (forcedCard), resolveCard (afterCard + the 'member'/'payCut'/'repay' effects),
// endWeek (weekly), botWeek (botWeek, botCardChoice, botValue); gig.performance/newFans/applyResult (gigMods, split).
//   member (v0.4): stage 0..4, stageWeek, ultimatum (week the card is due), gripe, want, exit, changed, returns,
//                  recruit: { trait, quirk, hometown, askingCut, stars, chemistry }, look
//   RECRUIT (candidate) = { name, nick, hometown, stars 1..5, skill, trait, quirk, askingCut, chemistry 0..100, look }
(function (GG) {
  var C = GG.contracts, U = GG.util;
  var drama = GG.drama = GG.drama || {};

  var DEFAULTS = {
    protectFans: 250, payCut: 0.3, payCutMax: 0.6, expectCut: 0.25, expectCutPerFan: 0.00002, expectCutMax: 0.1,
    moneyUp: 16, moneyUpMax: 3, moneyDown: 30, paidBonus: 0.5, burnoutFrom: 55, burnoutScale: 0.12,
    trendWeeks: 4, trendGrow: 0.03, stall: 1, growBonus: 0.5, gradeMood: { S: 1, A: 0.5, B: 0, C: -1, D: -2 },
    wantMet: 2, wantUnmet: 1.5, wantWeeks: 8, kenjiDrift: 2.5, stageAt: [44, 34, 26], recover: 6, grumbleChat: 0.7,
    returnAfter: [16, 30], laterWeeks: 8, returnMood: 72, returnSkill: 5, quirkChance: 0.1, quirkCooldown: 12,
    adCost: 30, repostCost: 20, fillInCost: 40, fillInSkill: 38, fillInChem: 1, holePenalty: 14, fillInPenalty: 4, holeCrowd: 10,
    recruitStars: [30, 35, 22, 10, 3], hireChemPull: 0.25,
    traits: { showboatScore: 4, studioRatQuality: 5, hypeBuzz: 2, fastLearner: 2, fastLearnerCap: 75, roadWarriorBurnout: 3,
      partyFans: 1.15, partyBurnout: 2, frugalRefund: 5, legendFans: 20, legendGigFans: 1.1 },
    bot: { avgRefuse: 0.35, keep: 40, goodPayUp: 0.4, goodPayFund: 600, repostBelow: 55 }
  };
  var cfgSrc = null, cfgVal = null;
  function cfg() {
    var e = GG.content.economy && GG.content.economy.drama;
    if (e !== cfgSrc || !cfgVal) { cfgSrc = e; cfgVal = Object.assign({}, DEFAULTS, e || {}); }
    return cfgVal;
  }
  drama.cfg = cfg;
  var FALLBACK = {
    stageText: { 1: '{who} is grumbling about {gripe}.', 2: '{who} is getting passive-aggressive in the group chat about {gripe}.',
      3: '{who} has an ultimatum for you. Monday.' },
    gripes: { money: 'money', burnout: 'being overworked', losing: 'the band going nowhere', want: 'something', mystery: 'nobody knows what' },
    grumble: ['Just saying. Some of us have rent.'], passive: ['No, it’s fine. Everything is fine. 🙂'],
    names: { first: ['Dale', 'Shawna', 'Kyle', 'Brenda', 'Travis', 'Crystal'], last: ['Friesen', 'Tkachuk', 'Olson', 'Lavoie'], nicks: ['Moose', 'Gravel', 'Tank'] },
    traits: [{ id: 'reliable', name: 'Reliable', effect: 'Shows up. Never gets past passive-aggressive.' }],
    fillIns: ['Dwayne from the music store']
  };
  function D() { return GG.content.drama || {}; }
  function R() { return GG.content.recruits || {}; }
  function mdef(id) { var m = D().members; return m && m[id] || null; }
  function exitDef(m) { var d = m && m.original ? mdef(m.id) : null; return d && d.exit || null; }
  function list(state) { return state.members || []; }
  function active(state) { return list(state).filter(function (m) { return m.status === 'active'; }); }
  function find(state, id) {
    if (id === 'recruit') id = state.card && state.card.who;
    var l = list(state);
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  }
  function first(m) { return String(m.name || m.id).split(' ')[0]; }
  function trait(m) { return m && m.recruit ? m.recruit.trait : null; }
  function stats(state) { state.stats = state.stats || {}; return state.stats; }
  function bump(state, k) { var s = stats(state); s[k] = (s[k] || 0) + 1; }
  function clampStat(state, k, v) { var r = C.RANGES[k]; state[k] = r ? U.clamp(Math.round(v), r[0], r[1]) : Math.round(v); }
  function changed(state) { GG.emit('stats:changed', { state: state }); }
  function chat(state, who, text, tone) { return GG.career.postChat ? GG.career.postChat(state, who, text, null, tone) : null; }
  drama.active = active;
  drama.find = find;

  /* ---- Roster: roles, holes, fill-ins, the lineup that plays ------------------------------------------ */
  // The band's roles (content order); a hole is a role nobody active plays.
  drama.roles = function (state) {
    var band = GG.career.band(state), src = band && band.members && band.members.length ? band.members
      : list(state).filter(function (m) { return m.original; });
    var out = [];
    src.forEach(function (m) { if (m.role && out.indexOf(m.role) < 0) out.push(m.role); });
    return out;
  };
  drama.holder = function (state, role) { return active(state).filter(function (m) { return m.role === role; })[0] || null; };
  drama.holes = function (state) { return drama.roles(state).filter(function (r) { return !drama.holder(state, r); }); };
  drama.openHoles = function (state) { var f = state.fillIns || {}; return drama.holes(state).filter(function (r) { return !f[r]; }); };
  function slug(role) { return String(role).toLowerCase().replace(/[^a-z0-9]+/g, '_'); }
  // Fill-ins as stage/garage figures ({ id: 'fill_<role>', fillIn: true, ... }); only for roles that are still holes.
  drama.fillInFigures = function (state) {
    var f = state.fillIns || {}, E = cfg();
    return drama.holes(state).filter(function (r) { return f[r]; }).map(function (r) {
      return { id: 'fill_' + slug(r), name: f[r].name, nick: '', role: r, skill: E.fillInSkill, mood: 60, status: 'active', fillIn: true, look: f[r].look || null };
    });
  };
  drama.lineup = function (state) { return active(state).concat(drama.fillInFigures(state)); };

  /* ---- Pay the band ------------------------------------------------------------------------------------ */
  drama.payCut = function (state) { var v = state.payCut; return isFinite(v) ? U.clamp(v, 0, cfg().payCutMax) : cfg().payCut; };
  drama.setPayCut = function (state, v) {
    state.payCut = Math.round(U.clamp(+v || 0, 0, cfg().payCutMax) * 20) / 20;   // steps of 5%
    changed(state);
    return state.payCut;
  };
  // Gig pay split: members get pay x payCut (nobody active, nobody paid), the fund keeps the rest.
  drama.split = function (state, pay) {
    var cut = active(state).length ? Math.round(Math.max(0, pay || 0) * drama.payCut(state)) : 0;
    return { cut: cut, band: (pay || 0) - cut };
  };
  drama.fillInCost = function (state) {
    var f = state.fillIns || {}, t = 0;
    drama.holes(state).forEach(function (r) { if (f[r]) t += f[r].costPerGig || 0; });
    return t;
  };
  // What holes, fill-ins and traits do to a gig: score delta, crowd delta (live start), new-fan multiplier.
  drama.gigMods = function (state) {
    var E = cfg(), T = E.traits, f = state.fillIns || {}, open = 0, fills = 0, score = 0, fans = 1;
    drama.holes(state).forEach(function (r) { if (f[r]) fills++; else open++; });
    active(state).forEach(function (m) {
      var t = trait(m);
      if (t === 'showboat') score += T.showboatScore;
      if (t === 'party_animal') fans *= T.partyFans;
      if (t === 'local_legend') fans *= T.legendGigFans;
    });
    var cal = GG.calendar ? GG.calendar.gigMods(state) : { score: 0, crowd: 0, fansMult: 1 };   // v0.6.1: weather, season fit, holidays
    return { open: open, fills: fills, score: score - open * E.holePenalty - fills * E.fillInPenalty + cal.score,
      crowd: -open * E.holeCrowd + cal.crowd, fansMult: fans * cal.fansMult, fillSkill: E.fillInSkill };
  };

  /* ---- Wants ------------------------------------------------------------------------------------------- */
  drama.want = function (state, m) {
    var d = m && m.original ? mdef(m.id) : null, w = d && d.wants;
    if (!w || !w.length) return null;
    return w[(Math.floor((state.totalWeek - 1) / cfg().wantWeeks) + GG.hashSeed(m.id) % w.length) % w.length];
  };
  function count(a, id) { return a.filter(function (x) { return x === id; }).length; }
  function moment(g, k) { return !!(g && g.moments && g.moments.indexOf(k) >= 0); }
  // Each rule: +1 met, 0 neutral, -1 unmet, from this week's blocks (a) and gig result (g).
  var RULES = {
    spotlight: function (s, a, g) { return moment(g, 'capeSpin') || a.indexOf('promote') >= 0 || (g && /[SA]/.test(g.grade)) ? 1 : g ? 0 : -1; },
    cape: function (s) { var c = s.flags && s.flags.cape; return c && c !== 'none' ? (c === 'charred' ? 0 : 1) : -1; },
    solos: function (s, a, g) { return !g ? 0 : moment(g, 'solo') || (!g.live && /[SA]/.test(g.grade)) ? 1 : /[CD]/.test(g.grade) ? -1 : 0; },
    practice: function (s, a) { return a.indexOf('rehearse') >= 0 ? 1 : -1; },
    freedom: function (s, a) { return s.burnout >= 60 || count(a, 'rehearse') + count(a, 'hustle') >= 2 ? -1 : a.indexOf('rest') >= 0 || s.burnout < 35 ? 1 : 0; },
    baba: function (s, a, g) { return s.flags && s.flags.babaMad ? -1 : a.indexOf('rest') >= 0 || (g && /legion|church|bingo/.test(g.kind || '')) ? 1 : 0; },
    mystery: function (s, a, g, rng) { return rng.range(-1, 1); }
  };

  /* ---- The week (endWeek) ------------------------------------------------------------------------------ */
  function moodWeek(state, m, acts, gig, rng) {
    var E = cfg(), parts = {}, t = trait(m);
    function add(k, v) { if (v) parts[k] = (parts[k] || 0) + v; }
    var expect = m.recruit ? m.recruit.askingCut : E.expectCut + Math.min(E.expectCutMax, state.fans * E.expectCutPerFan);
    var diff = drama.payCut(state) - expect;
    var money = diff >= 0 ? Math.min(E.moneyUpMax, diff * E.moneyUp) : diff * E.moneyDown;
    if (gig && gig.cut > 0) money += E.paidBonus;
    add('money', t === 'frugal' ? money * 0.5 : money);
    if (state.burnout > E.burnoutFrom) add('burnout', -(state.burnout - E.burnoutFrom) * E.burnoutScale);
    var h = state.history || [], back = h.length >= E.trendWeeks ? h[h.length - E.trendWeeks] : null;
    if (back) { if (state.fans <= back.fans) add('losing', -E.stall); else if (state.fans >= back.fans * (1 + E.trendGrow)) add('success', E.growBonus); }
    if (gig && E.gradeMood[gig.grade]) add(E.gradeMood[gig.grade] < 0 ? 'losing' : 'success', E.gradeMood[gig.grade]);
    var w = drama.want(state, m);
    m.want = w ? w.id : null;
    if (w && RULES[w.rule]) {
      var sc = RULES[w.rule](state, acts, gig, rng);
      add(w.rule === 'mystery' ? 'mystery' : 'want', w.rule === 'mystery' ? sc * E.kenjiDrift : sc > 0 ? sc * E.wantMet : sc * E.wantUnmet);
    }
    var total = 0, worst = null, wv = -0.5, touchy = GG.difficulty ? GG.difficulty.mul(state, 'moodLoss') : 1;   // v0.6.1 C4
    for (var k in parts) {
      var v = parts[k];
      if (v < 0 && t === 'reliable') v *= 0.5;
      if (v < 0) v *= touchy;
      total += v;
      if (v < wv) { wv = v; worst = k; }
    }
    m.gripe = worst;
    var dm = Math.round(total);
    if (dm) m.mood = U.clamp(m.mood + dm, C.RANGES.mood[0], C.RANGES.mood[1]);
  }
  drama.gripeText = function (state, m) {
    var g = D().gripes || FALLBACK.gripes, w = drama.want(state, m);
    if (m.gripe === 'want' && w && w.gripe) return w.gripe;
    return g[m.gripe] || (m.gripe === 'mystery' || (w && w.rule === 'mystery') ? g.mystery : g.money) || FALLBACK.gripes.money;
  };
  drama.stageText = function (state, m, stage) {
    var t = (D().stageText || FALLBACK.stageText)[stage] || FALLBACK.stageText[stage] || '';
    return GG.career.fillText(state, String(t).replace(/\{who\}/g, first(m)).replace(/\{gripe\}/g, drama.gripeText(state, m)));
  };
  function stagePool(m, key) {
    var d = m.original ? mdef(m.id) : null;
    return (d && d[key]) || (D().recruit && D().recruit[key]) || FALLBACK[key];
  }
  function stepStage(state, m, rng, wrap) {
    var E = cfg(), T = E.stageAt, s = m.stage || 0, old = s;
    if (s < 3 && m.stageWeek !== state.totalWeek) {   // one step a week: a Monday settle counts as this week's step
      var target = m.mood < T[2] ? 3 : m.mood < T[1] ? 2 : m.mood < T[0] ? 1 : 0;
      var cap = state.protected || trait(m) === 'reliable' ? 2 : 3;
      if (target > s && s < cap) s++;
      else if (target < s && m.mood >= T[s - 1] + E.recover) s--;
    }
    if (s !== old) {
      m.stage = s; m.stageWeek = state.totalWeek;
      if (s === 3) { m.ultimatum = state.totalWeek + 1; bump(state, 'ultimatums'); }
      GG.emit('member:stage', { id: m.id, stage: s });
    }
    var msg = null;
    if (s === 1 && s !== old || s === 1 && rng.chance(E.grumbleChat)) msg = chat(state, m.id, GG.career.pickLine(state, rng, stagePool(m, 'grumble')), 'grumble');
    else if (s === 2) msg = chat(state, m.id, GG.career.pickLine(state, rng, stagePool(m, 'passive')), 'pa');
    if (msg) wrap.chat.push(msg);
    if (s >= 1) wrap.warnings.push({ id: m.id, stage: s, text: drama.stageText(state, m, s) });
  }
  function traitsWeek(state, gig) {
    var T = cfg().traits;
    active(state).forEach(function (m) {
      var t = trait(m);
      if (t === 'hype_machine') clampStat(state, 'buzz', state.buzz + T.hypeBuzz);
      else if (t === 'fast_learner' && m.skill < T.fastLearnerCap) m.skill = Math.min(T.fastLearnerCap, m.skill + T.fastLearner);
      else if (t === 'road_warrior' && gig) clampStat(state, 'burnout', state.burnout - T.roadWarriorBurnout);
      else if (t === 'party_animal' && gig) clampStat(state, 'burnout', state.burnout + T.partyBurnout);
      else if (t === 'showboat') clampStat(state, 'chemistry', state.chemistry - 1);
      else if (t === 'frugal') state.fund += T.frugalRefund;
    });
    var n = drama.holes(state).filter(function (r) { return (state.fillIns || {})[r]; }).length;
    if (n) clampStat(state, 'chemistry', state.chemistry - n * cfg().fillInChem);
  }
  function exitsWeek(state, rng, wrap) {
    list(state).slice().forEach(function (m) {
      var x = m.exit;
      if (!x || m.status === 'active' || x.storyline === 'rival') return;
      var ex = exitDef(m), beats = ex && ex.beats || [], weeks = state.totalWeek - x.since;
      while ((x.beat || 0) < beats.length && beats[x.beat || 0].at <= weeks) {
        var b = beats[x.beat || 0], msg = chat(state, b.who || m.id, b.text, 'news');
        x.beat = (x.beat || 0) + 1;
        if (msg) { wrap.chat.push(msg); wrap.drama.push(msg.text); }
      }
      // An 'away' member (Kenji) comes back on his own when his spot is still empty.
      if (m.status === 'away' && x.returnDue != null && state.totalWeek >= x.returnDue && !drama.holder(state, m.role)) {
        returnMember(state, m);
        wrap.drama.push(GG.career.fillText(state, ex && ex.backLine ? ex.backLine.text : first(m) + ' is back.'));
      }
    });
  }
  // Called by career.endWeek after the mood drift. Fills wrap.chat (stage messages, exit news), wrap.warnings, wrap.drama.
  drama.weekly = function (state, rng, wrap) {
    var E = cfg(), wk = state.lastWeek || {}, acts = (wk.blocks || []).map(function (b) { return b.activity; }), gig = wk.gig || null;
    wrap.chat = wrap.chat || []; wrap.warnings = []; wrap.drama = [];
    active(state).forEach(function (m) { moodWeek(state, m, acts, gig, rng); });
    active(state).forEach(function (m) { stepStage(state, m, rng, wrap); });
    traitsWeek(state, gig);
    exitsWeek(state, rng, wrap);
    if (state.protected && state.fans >= E.protectFans) {   // after the stages: the first ultimatum is a week away at least
      state.protected = false;
      wrap.protectionEnded = true;
      GG.emit('protection:ended', {});
    }
  };

  /* ---- Monday: forced drama cards ------------------------------------------------------------------------ */
  function card(id) { return id ? GG.career.cardById(id) : null; }
  function cardFor(m, kind) {
    var d = m.original ? mdef(m.id) : null;
    if (d && d[kind]) return card(d[kind]);
    return kind === 'ultimatum' ? card(D().recruit && D().recruit.ultimatum) : null;
  }
  drama.quirk = function (id) { return (R().quirks || []).filter(function (q) { return q.id === id; })[0] || null; };
  drama.traitDef = function (id) { return (R().traits || FALLBACK.traits).filter(function (t) { return t.id === id; })[0] || null; };
  // The drama card this Monday, before the normal draw: an ultimatum due > an original's return > a recruit quirk card.
  // Returns { card, who } (who = the member the card is about; {recruit} in its text) or null.
  drama.forcedCard = function (state, rng) {
    if (state.totalWeek <= 1) return null;
    var E = cfg(), act = active(state), i, m, c;
    for (i = 0; i < act.length; i++) {
      m = act[i];
      if (m.stage >= 3 && (m.ultimatum || 0) <= state.totalWeek && (c = cardFor(m, 'ultimatum'))) return { card: c, who: m.id };
    }
    var gone = list(state).filter(function (x) {
      return x.status !== 'active' && x.exit && x.exit.storyline !== 'rival' && x.exit.returnDue != null && state.totalWeek >= x.exit.returnDue;
    });
    for (i = 0; i < gone.length; i++) {
      m = gone[i];
      var ex = exitDef(m), holder = drama.holder(state, m.role);
      if (ex && ex.needBuzz && state.buzz < ex.needBuzz) continue;
      if (m.status === 'away' && !holder) continue;                     // walks back in on his own at the wrap
      if ((c = cardFor(m, holder ? 'returnFilled' : 'return'))) return { card: c, who: holder ? holder.id : m.id };
    }
    var rv = GG.rival && GG.rival.forcedCard ? GG.rival.forcedCard(state) : null;   // v0.6: crack / Sad Dome eve / poach cards
    if (rv) return rv;
    var recs = act.filter(function (x) { return x.recruit && x.recruit.quirk; });
    if (!recs.length || !rng.chance(E.quirkChance)) return null;
    var pool = [];
    recs.forEach(function (x) {
      var q = drama.quirk(x.recruit.quirk);
      ((q && q.cards) || []).forEach(function (qc) {
        var w = state.seenCards[qc.id];
        if (w == null || state.totalWeek - w > E.quirkCooldown) pool.push({ card: qc, who: x.id });
      });
    });
    return pool.length ? rng.pick(pool) : null;
  };
  // Every drama card (for career.cardById): ultimatums, returns, recruit quirk cards.
  drama.cards = function () {
    var out = (GG.content.dramaCards || []).slice();
    (R().quirks || []).forEach(function (q) { (q.cards || []).forEach(function (c) { out.push(c); }); });
    return out;
  };
  // Safety net after a card resolves: an ultimatum card that didn't settle or quit its member settles it.
  drama.afterCard = function (state, c) {
    var m = state.card && state.card.who ? find(state, state.card.who) : null;
    if (m && m.status === 'active' && m.stage >= 3 && c && cardFor(m, 'ultimatum') === c) { m.stage = 2; m.ultimatum = null; m.stageWeek = state.totalWeek; }
  };

  /* ---- Quit, return, defect (the 'member' effect) --------------------------------------------------------- */
  function quit(state, m, rng) {
    var E = cfg(), ex = exitDef(m);
    bump(state, 'quits');
    m.stage = 4; m.ultimatum = null; m.stageWeek = state.totalWeek;
    GG.emit('member:stage', { id: m.id, stage: 4 });
    if (!m.original) state.members.splice(state.members.indexOf(m), 1);     // recruits just leave: no storyline
    else if (!ex) { m.status = 'quit'; m.exit = { storyline: 'gone', since: state.totalWeek, returnDue: null, beat: 0 }; }
    else {
      var ra = ex.returnAfter || E.returnAfter;
      m.status = ex.away ? 'away' : 'quit';
      m.exit = { storyline: ex.id, since: state.totalWeek, returnDue: state.totalWeek + rng.int(ra[0], ra[1]), beat: 0 };
      if (ex.quitLine) chat(state, ex.quitLine.who || m.id, ex.quitLine.text, 'news');
    }
    if (GG.world && GG.world.syncDriver) GG.world.syncDriver(state);   // v0.6.1: the driver quit -> you drive
    GG.emit('member:quit', { id: m.id });
  }
  function returnMember(state, m) {
    var E = cfg(), ex = exitDef(m), holder = drama.holder(state, m.role);
    if (holder && !holder.original) state.members.splice(state.members.indexOf(holder), 1);   // the recruit steps aside
    if (state.fillIns) delete state.fillIns[m.role];
    if (state.recruitAd && state.recruitAd.role === m.role) state.recruitAd = null;
    m.status = 'active'; m.stage = 0; m.ultimatum = null; m.stageWeek = state.totalWeek; m.gripe = null;
    m.mood = Math.max(m.mood, E.returnMood);
    m.skill = Math.min(C.RANGES.skill[1], m.skill + E.returnSkill);
    m.changed = ex && ex.changed || null;
    m.returns = (m.returns || 0) + 1;
    m.exit = null;
    bump(state, 'returns');
    if (ex && ex.backLine) chat(state, ex.backLine.who || m.id, ex.backLine.text, 'news');
    if (GG.world && GG.world.syncDriver) GG.world.syncDriver(state);   // v0.6.1: the driver is back behind the wheel
    GG.emit('member:return', { id: m.id });
  }
  function defect(state, m) {
    state.rivalDefectors = state.rivalDefectors || [];
    if (state.rivalDefectors.indexOf(m.id) < 0) state.rivalDefectors.push(m.id);
    m.status = 'quit';
    m.exit = Object.assign({}, m.exit || {}, { storyline: 'rival', returnDue: null });
  }
  // v0.6: the rival poaches an active member: they leave now (a hole) and join the rival's lineup. Recruits stay listed as gone.
  function poach(state, m) {
    bump(state, 'poached');   // not a quit: no ultimatum, the rival made them an offer
    m.stage = 4; m.ultimatum = null; m.stageWeek = state.totalWeek;
    m.exit = { storyline: 'rival', since: state.totalWeek, returnDue: null, beat: 0 };
    defect(state, m);
    if (GG.world && GG.world.syncDriver) GG.world.syncDriver(state);
    GG.emit('member:stage', { id: m.id, stage: 4 });
    GG.emit('member:quit', { id: m.id });
  }
  // Effect key 'member': { id: memberId|'recruit', act: 'settle'|'quit'|'return'|'later'|'rival'|'poach' } (or a list).
  drama.applyMember = function (state, spec, d) {
    (Array.isArray(spec) ? spec : [spec]).forEach(function (x) {
      var m = x && find(state, x.id), done = null;
      if (!m) return;
      var nm = first(m);
      if (x.act === 'settle' && m.status === 'active' && m.stage >= 3) {
        m.stage = 2; m.ultimatum = null; m.stageWeek = state.totalWeek; done = 'settle';
        GG.emit('member:stage', { id: m.id, stage: 2 });
      } else if (x.act === 'quit' && m.status === 'active') { quit(state, m, GG.rngFor(state)); done = 'quit'; }
      else if (x.act === 'return' && m.status !== 'active') { returnMember(state, m); done = 'return'; }
      else if (x.act === 'later' && m.exit && m.status !== 'active') { m.exit.returnDue = state.totalWeek + cfg().laterWeeks; done = 'later'; }
      else if (x.act === 'rival' && m.status !== 'active') { defect(state, m); done = 'rival'; }
      else if (x.act === 'poach' && m.status === 'active') { poach(state, m); done = 'rival'; }
      if (done && d) (d.member = d.member || []).push({ id: m.id, act: done, name: nm });
    });
  };
  var ACT_LABEL = { settle: 'stays', quit: 'quits!', 'return': 'is back', later: 'waits', rival: '→ your rival', poach: '→ your rival' };
  drama.memberSummary = function (state, spec) {
    return (Array.isArray(spec) ? spec : [spec]).map(function (x) {
      var m = x && find(state, x.id);
      return (m ? first(m) : x.id === 'recruit' ? 'The new one' : String(x.id)) + ' ' + (ACT_LABEL[x.act] || x.act);
    }).join(' · ');
  };

  /* ---- Recruits: post an ad, three candidates, hire -------------------------------------------------------- */
  var SKINS = ['#f1d0aa', '#e6c19c', '#d8b28a', '#c68e62', '#a8704a', '#8d5a3b', '#6b4429', '#4a2f1e'];
  var HAIRS = ['#15110f', '#3b2a1e', '#6d4a2a', '#a86e3a', '#d9b36c', '#8a8a8a', '#b0361f', '#e8e0d0'];
  var PANTS = ['#26252e', '#2b3346', '#3d5a80', '#141418', '#4a3b2a', '#3a3a3a'];
  function r2(x) { return Math.round(x * 100) / 100; }
  function makeLook(rng, genre) {
    var L = R().looks || {}, shirts = (L.shirts && (L.shirts[genre] || L.shirts.metal)) || ['#1b1a22', '#2b2b2b', '#5a1a1a', '#20304a'];
    var extras = [];
    rng.shuffle(C.LOOK_EXTRAS).slice(0, rng.int(0, 2)).forEach(function (x) { extras.push(x); });
    return { skin: rng.pick(SKINS), hair: rng.pick(HAIRS), hairStyle: rng.pick(C.HAIR_STYLES), shirt: rng.pick(shirts), pants: rng.pick(PANTS),
      height: r2(0.92 + rng.next() * 0.16), build: r2(0.92 + rng.next() * 0.26), extras: extras };
  }
  drama.makeLook = makeLook;
  function fresh(rng, pool, used, key) {
    var ok = (pool || []).filter(function (x) { var k = key + (x && x.id || x); return !used[k]; });
    var x = rng.pick(ok.length ? ok : pool);
    if (x != null) used[key + (x && x.id || x)] = true;
    return x;
  }
  function candidate(state, role, rng, used) {
    var E = cfg(), Rc = R(), names = (Rc.names && (Rc.names[state.genre] || Rc.names.metal)) || FALLBACK.names;
    var fn = fresh(rng, names.first, used, 'f'), ln = rng.pick(names.last), nick = fresh(rng, names.nicks, used, 'n');
    var towns = (Rc.hometowns && (Rc.hometowns[state.region] || Rc.hometowns.canada)) || [state.city || 'Saskatoon'];
    var hometown = rng.pick(towns), boost = Math.max(0, C.ERAS.indexOf(state.era)) + Math.min(2, (state.fans || 0) / 1500);
    var stars = 1 + rng.weighted([0, 1, 2, 3, 4], function (i) { return E.recruitStars[i] * (1 + boost * i * 0.35); });
    var tr = fresh(rng, Rc.traits || FALLBACK.traits, used, 't') || FALLBACK.traits[0];
    var q = fresh(rng, (Rc.quirks || []).filter(function (x) { return !active(state).some(function (m) { return m.recruit && m.recruit.quirk === x.id; }); }), used, 'q');
    var ask = tr.id === 'frugal' ? 0.1 : U.clamp(Math.round((0.12 + stars * 0.035 + rng.range(-0.04, 0.04)) * 20) / 20, 0.1, 0.45);
    var chem = U.clamp(Math.round(50 + (tr.chem || 0) + (q && q.chem || 0) + (hometown === state.city ? 8 : 0)
      + (state.chemistry - 50) * 0.3 + rng.int(-20, 20)), 5, 95);
    return { name: fn + ' ' + ln, nick: nick || '', hometown: hometown, stars: stars, skill: U.clamp(14 + stars * 11 + rng.int(-4, 4), 5, 90),
      trait: tr.id, quirk: q ? q.id : null, askingCut: r2(ask), chemistry: chem, role: role, look: makeLook(rng, state.genre) };
  }
  drama.candidates = function (state, role, rng) {
    var used = {}, out = [];
    for (var i = 0; i < 3; i++) out.push(candidate(state, role, rng, used));
    return out;
  };
  // Posts an ad for a hole (default: the first open one): costs adCost, gives three candidates. null if not possible.
  drama.postAd = function (state, role) {
    var E = cfg(), holes = drama.holes(state);
    role = role || drama.openHoles(state)[0] || holes[0];
    if (!role || holes.indexOf(role) < 0) return null;
    if (state.recruitAd && state.recruitAd.role === role) return state.recruitAd;
    if (state.fund < E.adCost) return null;
    state.fund -= E.adCost;
    state.recruitAd = { role: role, candidates: drama.candidates(state, role, GG.rngFor(state)), posts: 1, week: state.totalWeek };
    changed(state);
    return state.recruitAd;
  };
  drama.repost = function (state) {
    var E = cfg(), ad = state.recruitAd;
    if (!ad || state.fund < E.repostCost) return null;
    state.fund -= E.repostCost;
    ad.posts++; ad.week = state.totalWeek;
    ad.candidates = drama.candidates(state, ad.role, GG.rngFor(state));
    changed(state);
    return ad;
  };
  drama.cancelAd = function (state) { state.recruitAd = null; changed(state); };
  drama.hire = function (state, i) {
    var E = cfg(), ad = state.recruitAd, c = ad && ad.candidates && ad.candidates[i];
    if (!c || drama.holder(state, ad.role)) return null;
    var n = (stats(state).recruits || 0) + 1;
    stats(state).recruits = n;
    var m = { id: 'rec' + n, name: c.name, nick: c.nick, role: ad.role, skill: c.skill,
      mood: U.clamp(Math.round(58 + (c.chemistry - 50) * 0.3), 30, 85), status: 'active', original: false,
      stage: 0, want: null, exit: null, gripe: null,
      recruit: { trait: c.trait, quirk: c.quirk, hometown: c.hometown, askingCut: c.askingCut, stars: c.stars, chemistry: c.chemistry },
      look: c.look };
    state.members.push(m);
    clampStat(state, 'chemistry', state.chemistry + (c.chemistry - state.chemistry) * E.hireChemPull);
    if (state.fillIns) delete state.fillIns[ad.role];
    state.recruitAd = null;
    if (c.trait === 'local_legend') state.fans += E.traits.legendFans;
    GG.emit('recruit:hired', { member: m });
    changed(state);
    return m;
  };
  // Candidate value for bots (and the card's sort hint): skill weighted by chemistry.
  drama.candidateScore = function (c) { return c ? c.skill * (0.5 + c.chemistry / 100) : 0; };

  /* ---- Fill-ins -------------------------------------------------------------------------------------------- */
  drama.hireFillIn = function (state, role) {
    if (drama.holes(state).indexOf(role) < 0) return null;
    var rng = GG.RNG(GG.hashSeed(state.seed + '|fill|' + role + '|' + state.totalWeek));   // cosmetic: not the career RNG
    var F = D().fillIns || {}, pool = F[role] || F.any || FALLBACK.fillIns;
    state.fillIns = state.fillIns || {};
    state.fillIns[role] = { name: rng.pick(pool), costPerGig: cfg().fillInCost, look: makeLook(rng, state.genre) };
    changed(state);
    return state.fillIns[role];
  };
  drama.dismissFillIn = function (state, role) { if (state.fillIns) delete state.fillIns[role]; changed(state); };

  /* ---- Rival ----------------------------------------------------------------------------------------------- */
  drama.rivalBlurb = function (state) {
    var band = GG.career.band(state), rv = band && GG.content.rivals && GG.content.rivals[band.rival];
    var names = (state.rivalDefectors || []).map(function (id) { var m = find(state, id); return m ? m.name : id; });
    if (!rv) return null;
    return rv.blurb + (names.length ? ' Now featuring ' + names.join(' and ') + ', formerly of ' + (band.name || 'your band') + '.' : '');
  };

  /* ---- Bots -------------------------------------------------------------------------------------------------- */
  // Pay the band, fill holes (post an ad and hire the best chemistry x skill; the good bot re-posts a weak batch).
  drama.botWeek = function (state, style) {
    var E = cfg(), B = E.bot;
    if (style === 'good') {
      var upset = active(state).some(function (m) { return (m.stage || 0) >= 1; });
      var want = upset && state.fund > B.goodPayFund ? B.goodPayUp : E.payCut;
      if (drama.payCut(state) !== want) state.payCut = want;
    }
    drama.holes(state).forEach(function (role) {
      if (drama.holder(state, role)) return;
      var ad = state.recruitAd;
      if (!ad || ad.role !== role) {
        if (state.fund < E.adCost + 60) {
          if (style === 'good' && !(state.fillIns || {})[role] && state.fund > E.fillInCost * 2) drama.hireFillIn(state, role);
          return;
        }
        ad = drama.postAd(state, role);
        if (!ad) return;
      }
      var best = 0;
      ad.candidates.forEach(function (c, i) { if (drama.candidateScore(c) > drama.candidateScore(ad.candidates[best])) best = i; });
      if (style === 'good' && drama.candidateScore(ad.candidates[best]) < B.repostBelow && ad.posts < 3 && state.fund > E.repostCost + 150) {
        drama.repost(state);
        best = 0;
        ad.candidates.forEach(function (c, i) { if (drama.candidateScore(c) > drama.candidateScore(ad.candidates[best])) best = i; });
      }
      drama.hire(state, style === 'good' ? best : GG.rngFor(state).int(0, ad.candidates.length - 1));
    });
  };
  function quitIndex(c) {
    for (var i = 0; c && c.choices && i < c.choices.length; i++) {
      var fx = c.choices[i].effects, mm = fx && fx.member;
      if ((Array.isArray(mm) ? mm : mm ? [mm] : []).some(function (x) { return x.act === 'quit'; })) return i;
    }
    return -1;
  }
  // The avg bot refuses an ultimatum now and then (the good bot values its choices normally). null = no opinion.
  drama.botCardChoice = function (state, c, style) {
    if (style === 'good') return null;
    var q = quitIndex(c);
    if (q < 0) return null;
    return GG.rngFor(state).chance(cfg().bot.avgRefuse) ? q : null;
  };
  drama.botValue = function (state, spec) {
    var B = cfg().bot, v = 0;
    (Array.isArray(spec) ? spec : [spec]).forEach(function (x) {
      var m = x && find(state, x.id), h = m ? drama.holder(state, m.role) : null;
      if (x.act === 'settle') v += B.keep;
      else if (x.act === 'quit') v -= B.keep;
      else if (x.act === 'return' && m) v += h && h !== m ? (m.skill - h.skill) * 0.8 + 3 : B.keep;
      else if (x.act === 'rival' && m) v += h ? (h.skill - m.skill) * 0.8 : -B.keep;
      else if (x.act === 'later') v -= 5;
      else if (x.act === 'poach' && m && m.status === 'active') v -= B.keep;
    });
    return v;
  };

  /* ---- Save: v3 -> v4 defaults ------------------------------------------------------------------------------- */
  drama.init = function (s) { return drama.migrate(s); };
  drama.migrate = function (s) {
    if (!s || typeof s !== 'object') return s;
    var E = cfg();
    s.payCut = isFinite(s.payCut) ? U.clamp(s.payCut, 0, E.payCutMax) : E.payCut;
    if (!s.fillIns || typeof s.fillIns !== 'object' || Array.isArray(s.fillIns)) s.fillIns = {};
    if (s.recruitAd === undefined || (s.recruitAd && (typeof s.recruitAd !== 'object' || !Array.isArray(s.recruitAd.candidates)))) s.recruitAd = null;
    if (!Array.isArray(s.rivalDefectors)) s.rivalDefectors = [];
    (Array.isArray(s.members) ? s.members : []).forEach(function (m) {
      if (!m || typeof m !== 'object') return;
      if (!isFinite(m.stage)) m.stage = m.status && m.status !== 'active' ? 4 : 0;
      if (m.want === undefined) m.want = null;
      if (m.exit === undefined) m.exit = null;
    });
    if (s.stats && typeof s.stats === 'object') ['quits', 'returns', 'recruits', 'ultimatums'].forEach(function (k) { if (!isFinite(s.stats[k])) s.stats[k] = 0; });
    return s;
  };
  if (GG.save && GG.save.migrate && !GG.save.migrate.drama) {
    var prevMigrate = GG.save.migrate;
    GG.save.migrate = function (s) { return drama.migrate(prevMigrate(s)); };
    GG.save.migrate.drama = true;
    GG.save.migrate.world = true;
  }

  GG.registerDebug('drama', function () {
    var s = GG.state; if (!s) return { state: null };
    return { protected: s.protected, payCut: s.payCut, holes: drama.holes(s), fillIns: Object.keys(s.fillIns || {}),
      ad: s.recruitAd ? { role: s.recruitAd.role, posts: s.recruitAd.posts, n: s.recruitAd.candidates.length } : null,
      rivalDefectors: s.rivalDefectors,
      members: (s.members || []).map(function (m) { return { id: m.id, status: m.status, stage: m.stage || 0, mood: m.mood, gripe: m.gripe || null }; }) };
  });
})(window.GG);
