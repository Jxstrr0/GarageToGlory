// 23_sim_rival.js: the rival (v0.6 "Rivals", RIVAL agent). Tundra Wraith (or any band's rival) runs a parallel career
// (fans, buzz, era, records on the Maple 100, Loonie cases) that is deterministic per career seed and never draws from the
// career RNG (every roll is seeded by career seed + tag + week). Rivalry heat (0..100) climbs with every clash, decays
// slowly, drives how often showdowns happen and feeds buzz to both bands. Showdowns: botb (a Monday gig offer; you watch
// their set, then play yours), sameNight (the crowd splits on buzz), stolenSlot (they take a board listing), loonies
// (co-nominees), poach (a Monday card for an unhappy member), festival (a board listing: they headline, you outplay them
// from a lower slot), final (year 10: the Sad Dome co-bill decides who headlines forever -> state.finalShowdown).
// Beat them enough and they crack (C.CRACKS): breakup, rebrand (new name, same accountants) or they ask to open for you.
// Pure sim: no DOM, no audio.
// API (GG.rival):
//   init(state) ; migrate(state) (v5 -> v6, wraps GG.save.migrate) ; get(state) -> RIVAL ; cfg() ; cast(state) ; cards()
//   name(state) ; skill(state) ; heat(state) ; addHeat(state, n, why) ; record(state) -> { you, them, net, played }
//   lineup(state) -> [{ id, name, fullName, nick, role, lane, look, corpsePaint, stageShirt, defector? }]
//   leaderboard(state, n?) -> [{ rank, id, name, city, fans, era, trend, you?, rival?, cracked? }]
//   weekly(state, rng, wrap)  (career.endWeek; wrap.rival = { news, heat, heatDelta, showdowns, cracked, final })
//   monday(state) -> PENDING|null  (career.startWeek, after the board refresh: schedules botb/sameNight/stolenSlot/festival/final)
//   schedule(state, kind, who?) -> PENDING (force one this week) ; next(state) -> { pending, chance, final: { week, inWeeks } }
//   pending(state) -> this week's PENDING|null ; forcedCard(state) -> { card, who }|null (drama.forcedCard: crack/final-eve/poach)
//   afterCard(state, card) (career.resolveCard) ; enter(state) / pass(state) (the BotB offer) ; botWeek(state, style)
//   showdown(state, kind?) -> SETUP for the UI ; setScore(state, kind) -> their set score (deterministic per week)
//   resolve(state, kind, yourScore, opts?) -> SHOWDOWN (idempotent per week + kind) ; shape(state, gig, result) (settleGig)
//   loonies(state, results) (labels.runLoonies) ; strength(state, category) (labels.rivalStrength) ; chartEntry(state, week)
//   crack(state, kind?) ; final(state) -> state.finalShowdown ; venue(id) (festival grounds + the Sad Dome)
//   PENDING = { kind, week, id, status: 'offered'|'entered'|'passed'|'listed'|'set'|'card'|'done'|'missed', venueId, venue,
//               city, prize?, listingId?, who?, name? }
//   SETUP   = { kind, week, title, text, icon, venue, prize, score (their set, final), expected, setlist: [{ title, score,
//               bpm, seconds }], rival: { id, name, city, heat, record, members }, stakes }
//   SHOWDOWN (contracts) + { id, name, rival, lines: [text], crowdLost?, bonusFans?, who? }
// v0.9 "Genres": cfg(state) merges economy.rival.byRival[rivalId] (owner Q4 fair fight: curve, buzz, eras, awards, chartBias,
//   legacy, actions, style, furyBrand) ; id(state) ; frontName(state) ({rivalFront}) ; frontId(state) ; frontSpeaker(state)
//   (who posts for them) ; defectorLook(state) (cast.defector.look) ; setActions(state, kind, n) -> [{ song, at, action, who }]
//   (C.RIVAL_ACTIONS: Mall Rats' kickflip, once per set; SETUP.actions; the UI emits gig:band) ; SETUP.rival + genre, style,
//   legacy. News / showdown texts / cards / songs / albums / label / rebrands come from rivalry.cast[rivalId] first (the flat
//   rivalry.* is the neutral {rival} fallback); card variants '<id>_<rivalId>' through career.variant; BPM from the rival's
//   genre (genres[g].tempo); scene rows with rivalId === your rival (or bandId === your band, Q8 cameos) are skipped.
// Events: 'rival:news' { text, week } ; 'heat:changed' { heat, delta, why } ; 'showdown:scheduled' { showdown: PENDING } ;
//   'showdown:done' { showdown } ; 'rival:cracked' { kind, name, formerName } ; 'rival:poach' { who, name } ; 'final:done' { final }
(function (GG) {
  var C = GG.contracts, U = GG.util;
  var R = GG.rival = GG.rival || {};
  var WPY = C.WEEKS_PER_YEAR;
  var GIG_KINDS = { botb: 1, festival: 1, final: 1 };

  var DEFAULTS = {
    fansCurve: [40, 450, 1700, 4300, 8200, 12500, 17000, 21500, 25500, 29000, 32000, 34500, 36500],
    pull: 0.18, momentumPer: 0.02, momentum: [0.7, 1.25],
    skill: { start: 50, cap: 87, tau: 66, rebrand: -4, breakup: -6, opener: -3 },
    buzz: { start: 15, perYear: 5, max: 60, heat: 0.2, drift: 0.25, win: 5, loss: -3 },
    form: { win: 1.5, loss: -1.5, decay: 0.9, max: 6 },
    eras: { local: 250, signed: 1100 },
    release: { week: 8, spread: 4, fromYear: 1, critic: 8, criticNoise: 6, units: 1.6, tail: 4.5, chartWeeks: 9, chartDrop: 7 },
    heat: { start: 12, decay: 0.025, decayMin: 0.4, buzzFrom: 25, buzz: 0.02,
            clash: { botb: 12, sameNight: 7, stolenSlot: 6, loonies: 4, poach: 10, festival: 8, final: 15 } },
    schedule: { firstWeek: 6, base: 0.1, perHeat: 0.0035, minGap: 3, crackFactor: { rebrand: 0.7, opener: 0.4, breakup: 0 } },
    kinds: {
      botb: { minFans: 30, weight: 3.5, cooldown: 8, eraWeight: { garage: 1.5, local: 1.2, signed: 0.6, world: 0.4 } },
      sameNight: { minFans: 120, weight: 3, cooldown: 6 },
      stolenSlot: { minFans: 60, weight: 1, cooldown: 8 },
      festival: { minFans: 150, weight: 6, cooldown: 10, weeks: [[1, 6], [22, 24]] },
      poach: { weight: 4, cooldown: 12, minStage: 2, chance: 0.5 }
    },
    noise: 8, kindBonus: { botb: 0, sameNight: 0, festival: 3, final: 5 },
    botb: { prize: { garage: 300, local: 600, signed: 1000, world: 2000 }, steal: 0.03, stealCap: { garage: 40, local: 150, signed: 600, world: 1200 },
            capacity: 250, buzz: 3 },
    sameNight: { split: 0.6, steal: 0.02 },
    festival: { fans: 0.06, buzz: 5, fansMin: 25 },
    stolenSlot: { defendRep: 3 },
    final: { year: 10, week: 21, winBuzz: 15, winFans: 0.02, loseBuzz: 5 },
    crack: { net: 7, minWins: 9, heat: 30, fromYear: 2 },
    awards: { bonus: 12, breakup: 0.75 },   // Loonie strength: award-show darlings (fruit baskets for every voter)
    opener: { chance: 0.2, crowd: [20, 80], fans: 0.3 },
    bot: { avgEnter: 0.75 }
  };
  var cfgSrc = null, cfgVal = null, cfgBy = {};
  function merge(base, o) {
    var out = {};
    for (var k in base) {
      var d = base[k], v = o ? o[k] : undefined;
      out[k] = v === undefined ? d : (d && typeof d === 'object' && !Array.isArray(d)) ? Object.assign({}, d, v) : v;
    }
    if (o) for (var x in o) if (!(x in base)) out[x] = o[x];   // v0.9 extras: chartBias, legacy, actions, ...
    return out;
  }
  // v0.9 (Q4 fair fight): cfg(state) = the defaults + economy.rival + economy.rival.byRival[<this career's rival>] (curve,
  // eras, buzz, awards, chartBias, legacy, actions ...). cfg() without a state = no per-rival layer.
  function cfg(state) {
    var o = GG.content.economy && GG.content.economy.rival;
    if (o !== cfgSrc || !cfgVal) { cfgSrc = o; cfgVal = merge(DEFAULTS, o); delete cfgVal.byRival; cfgBy = {}; }
    var rid = state ? rivalId(state) : null, by = rid && o && o.byRival && o.byRival[rid];
    if (!by) return cfgVal;
    return cfgBy[rid] || (cfgBy[rid] = merge(cfgVal, by));
  }
  R.cfg = cfg;

  /* ---- Content + helpers --------------------------------------------------------------------------------------- */
  function content() { return GG.content.rivalry || {}; }
  function rivalId(state) { var b = GG.career.band(state); return (state && state.rival && state.rival.id) || (b && b.rival) || 'tundra_wraith'; }
  R.id = rivalId;
  function baseDef(state) {
    var r = GG.content.rivals, id = rivalId(state);
    return (r && r[id]) || { id: id, name: 'The Other Band', city: 'Winnipeg', genre: state.genre || 'metal', blurb: '' };
  }
  R.cast = function (state) { var c = content().cast; return (c && c[rivalId(state)]) || null; };
  // Rival cards: rivalry.cards + every cast's own cards (v0.9 packs may keep a rival's variants in cast[rid].cards).
  R.cards = function () {
    var out = (content().cards || []).slice(), cast = content().cast || {};
    Object.keys(cast).forEach(function (rid) { if (Array.isArray(cast[rid] && cast[rid].cards)) out = out.concat(cast[rid].cards); });
    return out;
  };
  // v0.9: '<id>_<bandId>', '<id>_<rivalId>', then '<id>' (career.variant), for the rival's forced cards.
  function cardFor(state, id) {
    var c = GG.career.variant ? GG.career.variant(state, id) : null;
    return c || (GG.career.variant ? null : R.cards().filter(function (x) { return x.id === id; })[0] || null);
  }
  // v0.9: the frontman's short name ({rivalFront}): cast.frontman (a member id) -> that member's name, first word.
  R.frontName = function (state) {
    var c = R.cast(state);
    if (!c) return '';
    var f = typeof c.frontman === 'string' ? (c.members || []).filter(function (m) { return m.id === c.frontman; })[0] : null;
    f = f || (c.members || []).filter(function (m) { return /vocal/.test(m.role || ''); })[0];
    return f ? (f.short || String(f.name || '').split(' ')[0]) : '';
  };
  R.frontId = function (state) { var c = R.cast(state); return c && typeof c.frontman === 'string' ? c.frontman : null; };
  // v0.9: who posts for the rival in your group chat: their frontman npc (npcs[id].rival === rivalId, frontman: true; Tundra
  // Wraith: 'wraith_frontman'), else the cast's frontman id (ui.who resolves cast ids), else the DJ.
  var FRONT_NPC = { tundra_wraith: 'wraith_frontman' };
  R.frontSpeaker = function (state) {
    var rid = rivalId(state), N = GG.content.npcs || {}, id;
    if (FRONT_NPC[rid] && N[FRONT_NPC[rid]]) return FRONT_NPC[rid];
    for (id in N) if (N[id] && N[id].rival === rid && N[id].frontman) return id;
    return R.frontId(state) || 'dj';
  };
  R.venue = function (id) { return (content().venues || []).filter(function (v) { return v.id === id; })[0] || null; };
  function seeded(state, tag, w) { return GG.RNG(GG.hashSeed((state.seed >>> 0) + '|rival|' + tag + '|' + (w != null ? w : state.totalWeek))); }
  function rngRound(x, rng) { var f = Math.floor(x); return f + (rng.chance(x - f) ? 1 : 0); }
  function money(n) { return U.fmtMoney(n); }
  function bandName(state) { var b = GG.career.band(state); return (b && b.name) || 'The band'; }
  function first(name) { return String(name || '').split(' ')[0]; }
  function fill(state, text, vars) {
    var t = String(text || '').replace(/\{(\w+)\}/g, function (all, k) {
      if (vars && vars[k] != null) return String(vars[k]);
      if (k === 'rival') return R.name(state);
      return all;
    });
    return GG.career.fillText(state, t);
  }
  // v0.9: the cast's own lines (cast[rid].news[key]) win; the flat rivalry.news is the neutral {rival} fallback.
  var curState = null;
  function lines(key, state) {
    var c = R.cast(state || curState), cn = c && c.news && c.news[key];
    if (cn && cn.length) return cn;
    var n = content().news; return (n && n[key]) || [];
  }
  function pick(state, rng, pool, vars) { return pool && pool.length ? fill(state, rng.pick(pool), vars) : ''; }
  function curve(list, x) {
    if (x <= 0) return list[0];
    var i = Math.floor(x);
    if (i >= list.length - 1) return list[list.length - 1];
    var a = Math.max(1, list[i]), b = Math.max(1, list[i + 1]);
    return a * Math.pow(b / a, x - i);
  }
  function eraOf(state) { return state.era || 'garage'; }

  /* ---- The RIVAL object ----------------------------------------------------------------------------------------- */
  function copyLook(l) { return l ? U.clone(l) : null; }
  // v0.9: corpse paint only when the cast says so; a defector's makeover comes from cast.defector.look.
  var DEFECTOR_LOOK = { tundra_wraith: 'corpse', mall_rats: 'stylist', chartbusters: 'denim', buckle_and_boot: 'rhinestone' };
  function defectorLook(state) {
    var c = R.cast(state), d = c && c.defector;
    return (d && d.look) || DEFECTOR_LOOK[rivalId(state)] || 'stylist';
  }
  R.defectorLook = defectorLook;
  function castMembers(state) {
    var c = R.cast(state);
    return ((c && c.members) || []).map(function (m) {
      return { id: m.id, name: m.name, fullName: m.fullName || m.name, nick: m.nick || '', role: m.role, lane: m.lane || null,
        look: copyLook(m.look), corpsePaint: m.corpsePaint === true, stageShirt: m.stageShirt || '#101014' };
    });
  }
  R.create = function (state) {
    var d = baseDef(state), k = cfg(state);
    return { id: d.id, name: d.name, baseName: d.name, city: d.city, genre: d.genre, fans: k.fansCurve[0], buzz: k.buzz.start,
      legacy: k.legacy || 0,   // v0.9: fame as flavour (Chartbusters' 30 years of records; never enters a showdown)
      era: 'garage', heat: k.heat.start, wins: 0, losses: 0, form: 0, skill: k.skill.start, label: null,
      members: castMembers(state), albums: [], cracked: null, crackWeek: null, formerName: null, news: [],
      pending: null, cool: {}, last: 0, loonieWins: 0, breakthroughWon: false, past: [], w: 0, crackCard: null,
      milestone: 0, lead: null, heatWas: k.heat.start, finalNews: false, eveDealt: false };
  };
  var FIELD_DEFAULTS = { wins: 0, losses: 0, form: 0, loonieWins: 0, last: 0, w: 0, milestone: 0, legacy: 0 };   // v0.9: legacy (fame as flavour)
  R.get = function (state) {
    if (!state.rival || typeof state.rival !== 'object' || Array.isArray(state.rival)) R.migrate(state);
    return state.rival;
  };
  function get(state) { return R.get(state); }
  R.init = function (state) {
    state.rival = R.create(state);
    state.showdowns = [];
    state.finalShowdown = null;
    syncLineup(state);
    return state.rival;
  };
  R.name = function (state) { return state && state.rival && state.rival.name || baseDef(state || {}).name; };
  R.heat = function (state) { return get(state).heat; };
  R.record = function (state) {
    var rv = get(state);
    return { you: rv.losses, them: rv.wins, net: rv.losses - rv.wins, played: (state.showdowns || []).length };
  };
  R.addHeat = function (state, n, why) {
    var rv = get(state), b = rv.heat;
    rv.heat = U.clamp(Math.round((rv.heat + (n || 0)) * 10) / 10, 0, 100);
    var d = Math.round((rv.heat - b) * 10) / 10;
    if (d) GG.emit('heat:changed', { heat: rv.heat, delta: d, why: why || null });
    return rv.heat;
  };
  function skillAt(w, state) { var S = cfg(state).skill; return S.cap - (S.cap - S.start) * Math.exp(-Math.max(0, w) / S.tau); }
  R.skill = function (state) {
    var rv = get(state), S = cfg(state).skill;
    return Math.round(skillAt(state.totalWeek, state) + (rv.cracked ? S[rv.cracked] || 0 : 0) + (GG.difficulty ? GG.difficulty.add(state, 'rivalSkill') : 0));   // v0.6.1 C4
  };

  // Originals (and poached members) who joined the rival show up in their lineup, in corpse paint.
  function syncLineup(state) {
    var rv = state.rival;
    if (!rv) return;
    if (!Array.isArray(rv.members)) rv.members = castMembers(state);
    var band = GG.career.band(state);
    (state.rivalDefectors || []).forEach(function (id) {
      if (rv.members.some(function (x) { return x.id === id; })) return;
      var m = (state.members || []).filter(function (x) { return x.id === id; })[0];
      var src = band && band.members ? band.members.filter(function (x) { return x.id === id; })[0] : null;
      if (!m && !src) return;
      m = m || src;
      var dl = defectorLook(state), shirt = { corpse: '#101014', stylist: '#e0457b', denim: '#3d5a80', rhinestone: '#d9c38a' }[dl] || '#101014';
      rv.members.push({ id: id, name: m.name, fullName: (src && src.fullName) || m.name, nick: m.nick || '', role: m.role || '',
        lane: null, look: copyLook(m.look || (src && src.look)), corpsePaint: dl === 'corpse', stageShirt: shirt, defector: true, makeover: dl });
    });
  }
  R.lineup = function (state) { var rv = get(state); syncLineup(state); return rv.members.slice(); };

  /* ---- News ------------------------------------------------------------------------------------------------------ */
  function news(state, out, key, vars, rng, text) {
    var rv = get(state);
    var t = text || pick(state, rng || seeded(state, 'news|' + key), lines(key, state), vars);
    if (!t) return null;
    rv.news.push({ week: state.totalWeek, text: t, kind: key });
    if (rv.news.length > 20) rv.news.splice(0, rv.news.length - 20);
    if (out && out.news) out.news.push(t);
    GG.emit('rival:news', { text: t, week: state.totalWeek, kind: key });
    return t;
  }

  /* ---- Their career: fans, buzz, era, records ---------------------------------------------------------------------- */
  function grow(state, rv, rng, out, w, quiet) {
    var k = cfg(state), B = k.buzz, yr = Math.floor((w - 1) / WPY) + 1, wk = (w - 1) % WPY + 1;
    var mom = U.clamp(1 + k.momentumPer * (rv.wins - rv.losses), k.momentum[0], k.momentum[1]);
    if (rv.cracked === 'breakup') rv.fans = Math.max(0, Math.round(rv.fans * 0.995));
    else {
      var target = curve(k.fansCurve, w / WPY) * mom * (rv.cracked === 'opener' ? 0.85 : 1);
      rv.fans = Math.max(0, Math.round(rv.fans + (target - rv.fans) * k.pull + rng.range(-1, 1) * target * 0.004));
    }
    var bt = rv.cracked === 'breakup' ? 5 : Math.min(B.max, B.start + B.perYear * (w / WPY)) + rv.heat * B.heat;
    rv.buzz = U.clamp(Math.round(rv.buzz + (bt - rv.buzz) * B.drift), 0, 100);
    rv.form = Math.round(rv.form * k.form.decay * 100) / 100;
    rv.skill = Math.round(skillAt(w, state) + (rv.cracked ? k.skill[rv.cracked] || 0 : 0));
    if (rv.era === 'garage' && rv.fans >= k.eras.local) { rv.era = 'local'; if (!quiet) news(state, out, 'local', null, rng); }
    if (rv.era === 'local' && rv.fans >= k.eras.signed && !rv.cracked) {
      rv.era = 'signed'; rv.label = (R.cast(state) || {}).label || k.label || 'monolith';
      if (!quiet) news(state, out, 'signed', null, rng);
    }
    // one record a year, timed for the Loonie window (they are accountants: they know the eligibility dates)
    var Rl = k.release, relWeek = Rl.week + seeded(state, 'relweek|' + yr, 0).int(0, Rl.spread);
    if (yr >= Rl.fromYear && wk === relWeek && rv.cracked !== 'breakup' && !rv.albums.some(function (a) { return a.released === w; })) release(state, rv, w, out, quiet);
    // fan milestones (news only)
    var marks = [1000, 5000, 10000, 20000, 30000];
    while (rv.milestone < marks.length && rv.fans >= marks[rv.milestone]) {
      if (!quiet) news(state, out, 'fans', { fans: U.fmtNum(marks[rv.milestone]) }, rng);
      rv.milestone++;
    }
  }
  function release(state, rv, w, out, quiet) {
    var k = cfg(state), Rl = k.release, rng = seeded(state, 'album', w), c = R.cast(state) || {};
    var titles = (c.albums && c.albums.length ? c.albums : [{ title: rv.baseName + ' II', kind: 'album' }]).map(function (x) { return typeof x === 'string' ? { title: x, kind: 'album' } : x; });
    var t = titles[rv.albums.length % titles.length];
    var title = t.title + (rv.albums.length >= titles.length ? ' (Deluxe)' : '');
    var critic = U.clamp(Math.round(skillAt(w, state) + Rl.critic + rng.range(-Rl.criticNoise, Rl.criticNoise)), 30, 97);
    var units = Math.max(1, Math.round((rv.fans * 0.09 + rv.buzz * 6) * Rl.units * rng.range(0.9, 1.1)));
    var peak = GG.labels && GG.labels.chartPos ? GG.labels.chartPos(units * (k.chartBias || 1), rng) : null;   // v0.9: Chartbusters own the radio
    var a = { title: title, kind: t.kind || 'album', released: w, peak: peak, debut: peak, sales: Math.round(units * Rl.tail), critic: critic };
    rv.albums.push(a);
    if (!quiet) news(state, out, peak ? 'album' : 'albumNoChart', { album: title, pos: peak }, rng);
    return a;
  }
  // Their current record on the Maple 100 (a debut that drifts down), or null.
  R.chartEntry = function (state, week) {
    var rv = get(state), Rl = cfg(state).release;
    week = week || state.totalWeek;
    var a = rv.albums.filter(function (x) { return x.peak && x.released <= week && week - x.released < Rl.chartWeeks; }).slice(-1)[0];
    if (!a) return null;
    var age = week - a.released, pos = a.peak + age * Rl.chartDrop;
    if (pos > 100) return null;
    return { pos: pos, title: a.title, artist: R.name(state), weeks: age + 1, move: age ? -Rl.chartDrop : 'new', rival: true };
  };

  /* ---- Loonies ------------------------------------------------------------------------------------------------------ */
  // 0..99: their case in a Loonie category this year (replaces the v0.5 scripted curve).
  R.strength = function (state, cat) {
    var rv = get(state), L = (GG.content.economy && GG.content.economy.loonies) || {}, w = state.totalWeek;
    if (rv.genre && state.genre && rv.genre !== state.genre && cat === 'album') return 0;
    var rel = rv.albums.filter(function (a) { return a.released <= w && a.released > w - (L.window || 24); });
    var chart = function (a) { return a.peak ? (101 - a.peak) * 0.3 : 0; };
    var best = function (f) { return rel.reduce(function (m, a) { return Math.max(m, f(a)); }, 0); };
    var v = 0;
    switch (cat) {
      case 'breakthrough':
        var f0 = rv.albums[0];
        v = rv.breakthroughWon || !rel.length || !f0 || f0.released < w - (L.breakthroughWeeks || 48) ? 0
          : best(function (a) { return a.critic * 0.6 + chart(a); }) + Math.min(15, rv.fans / 400);
        break;
      case 'album': v = best(function (a) { return a.kind === 'album' ? a.critic * 0.7 + chart(a) : 0; }); break;
      case 'single': v = rel.length ? best(function (a) { return a.critic * 0.55 + chart(a) * 0.67; }) + rv.buzz * 0.1 : 0; break;
      case 'live': v = R.skill(state) * 0.85 + 12; break;
      case 'fan_choice': v = rv.fans < 200 ? 0 : 20 * Math.log10(rv.fans / 50) + rv.buzz * 0.4; break;
      default: return 0;   // worst_van: Gord's minivan has never had a scratch
    }
    var A = cfg(state).awards || {};
    if (v > 0) v += A.bonus || 0;
    if (rv.cracked === 'breakup') v *= A.breakup || 0.6;
    return U.clamp(Math.round(v), 0, 99);
  };
  // labels.runLoonies hook: rival wins count, and one 'loonies' showdown when they were up against you.
  R.loonies = function (state, results) {
    var rv = get(state), k = cfg(state);
    (results || []).forEach(function (r) { if (r.rivalWon) { rv.loonieWins++; if (r.category === 'breakthrough') rv.breakthroughWon = true; } });
    var shared = (results || []).filter(function (r) { return r.rivalIn; });
    if (!shared.length) return null;
    // you = categories where you placed above them; you win the clash if you beat them in at least one
    var you = shared.filter(function (r) { return r.won || (r.you != null && r.them != null && r.you > r.them); }).length;
    return R.resolve(state, 'loonies', you, { them: shared.length - you, won: you > 0,
      heat: k.heat.clash.loonies * shared.length, name: 'The Loonie Awards' });
  };

  /* ---- Scheduling (Monday) --------------------------------------------------------------------------------------- */
  R.pending = function (state) { var rv = get(state), p = rv.pending; return p && p.week === state.totalWeek ? p : null; };
  function crackFactor(rv) { return rv.cracked ? ((cfg().schedule.crackFactor || {})[rv.cracked] || 0) : 1; }
  function isFinalWeek(state) {
    var F = cfg(state).final;
    return state.year === F.year && state.week === F.week && !state.finalShowdown && state.maxWeeks >= state.totalWeek;
  }
  function inWeeks(ranges, wk) { return (ranges || []).some(function (r) { return wk >= r[0] && wk <= r[1]; }); }
  function schedulePending(state, p) {
    var rv = get(state);
    rv.pending = p;
    GG.emit('showdown:scheduled', { showdown: p });
    return p;
  }
  function botbVenue(state, rng) {
    var W = GG.world, maxTier = W ? W.maxTier(state) : 2, home = W ? W.home(state) : null;
    var list = (GG.content.venues || []).filter(function (v) {
      return v.minFans < 99999 && v.tier <= Math.min(2, maxTier) && v.capacity >= 60 && ['bar', 'club', 'legion', 'curling', 'skatepark', 'bingo'].indexOf(v.kind) >= 0
        && !(W && W.isBanned(state, v.id)) && (!W || W.km(home, v.city) <= 300) && (!W || !W.inReach || W.inReach(state, v));   // v0.9: venue.reach
    });
    return list.length ? rng.weighted(list, function (v) { return Math.sqrt(v.capacity) / (1 + (W ? W.km(home, v.city) : 0) / 150); }) : null;
  }
  var SCHEDULE = {
    botb: function (state, rv, rng, id) {
      if (state.gig || !GG.world) return null;
      var v = botbVenue(state, rng), k = cfg(state);
      if (!v) return null;
      var prize = k.botb.prize[eraOf(state)] || k.botb.prize.garage;
      var g = GG.world.makeListing(state, v, rng, { source: 'offer', id: id });
      var S = texts('botb', state);
      g.name = 'Battle of the Bands @ ' + v.name; g.deal = 'exposure'; g.pay = 0; g.minFans = 0; g.setSize = 3;
      g.capacity = Math.max(v.capacity, k.botb.capacity); g.opening = null;
      g.quirk = fill(state, S.text || '{rival} are in. Winner takes {prize}.', { venue: v.name, city: v.city, prize: money(prize) });
      g.catch = 'Winner takes ' + money(prize) + ' and some of the loser\'s fans.';
      g.showdown = { kind: 'botb', id: id }; g.prize = prize;
      state.offer = g;
      return { kind: 'botb', week: state.totalWeek, id: id, status: 'offered', venueId: v.id, venue: v.name, city: v.city, prize: prize };
    },
    sameNight: function (state, rv, rng, id) {
      var home = GG.world ? GG.world.home(state) : null;
      var list = (GG.content.venues || []).filter(function (v) { return v.minFans < 99999 && v.tier >= 2 && (!home || GG.world.cityId(v.city) === home); });
      if (!list.length) list = (GG.content.venues || []).filter(function (v) { return v.minFans < 99999 && v.tier >= 2; });
      var v = list.length ? rng.pick(list) : null;
      return { kind: 'sameNight', week: state.totalWeek, id: id, status: 'set', venueId: v ? v.id : null, venue: v ? v.name : 'a club downtown', city: v ? v.city : state.city };
    },
    stolenSlot: function (state, rv, rng, id) {
      if (!GG.world) return null;
      var list = (state.listings || []).filter(function (l) { return !l.showdown && !l.stolen && GG.world.canBook(state, l); });
      if (!list.length) return null;
      // they go for the best listing at a venue that doesn't love you yet; a venue that does (rep >= defendRep) turns them down
      var k = cfg(state), loved = function (l) { return GG.world.rep(state, l.venueId) >= k.stolenSlot.defendRep; };
      var open = list.filter(function (l) { return !loved(l); }), pool = open.length ? open : list;
      var best = pool[0], bv = -Infinity;
      pool.forEach(function (l) { var v = GG.world.value(state, l); if (v > bv) { bv = v; best = l; } });
      var defended = loved(best);
      best.stolen = { by: rv.name, defended: defended, id: id };
      var S = texts('stolenSlot', state);
      if (!defended) best.catch = fill(state, (S.lose && S.lose[0]) || '{rival} took this slot.', { venue: best.name });
      var p = schedulePending(state, { kind: 'stolenSlot', week: state.totalWeek, id: id, status: 'set', venueId: best.venueId, venue: best.name, city: best.city, listingId: best.id });
      R.resolve(state, 'stolenSlot', defended ? 1 : 0, { them: defended ? 0 : 1, won: defended, venueId: best.venueId, name: best.name });
      return p;
    },
    festival: function (state, rv, rng, id) {
      if (!GG.world) return null;
      var fests = (content().venues || []).filter(function (v) { return v.festival && GG.world.cityId(v.city); });
      if (!fests.length) return null;
      var good = fests.filter(function (v) { return !GG.gig || GG.gig.fit(v, state.genre) >= 0.7; });   // v0.9: the band's genre
      if (good.length) fests = good;
      var v = rng.pick(fests), g = GG.world.makeListing(state, v, rng, { source: 'book', id: 'L' + state.totalWeek + '-F' });
      g.minFans = 0; g.opening = null; g.showdown = { kind: 'festival', id: id }; g.headliner = rv.name; g.slot = v.slot || '2 p.m.';
      g.catch = fill(state, v.catch || '{rival} headline.', {});
      state.listings = [g].concat((state.listings || []).filter(function (l) { return l.id !== g.id; }));
      return { kind: 'festival', week: state.totalWeek, id: id, status: 'listed', venueId: v.id, venue: v.name, city: v.city, listingId: g.id };
    }
  };
  function finalGig(state) {
    var v = R.venue('sad_dome') || { id: 'sad_dome', name: 'The Sad Dome', city: 'Calgary', tier: 3, kind: 'club', capacity: 19000, pay: 2500, km: 620, setSize: 3 };
    var g = { id: 'FINAL', venueId: v.id, name: v.name + ': co-bill with ' + R.name(state), city: v.city, tier: v.tier, kind: v.kind,
      capacity: v.capacity, deal: 'flat', pay: v.pay || 0, gas: 0, quirk: v.quirk || '', source: 'final', catch: v.catch || '',
      minFans: 0, setSize: v.setSize || 3, opening: null, showdown: { kind: 'final', id: 'SD' + state.totalWeek + '-final' } };
    if (GG.world) GG.world.decorate(state, g);
    var km = v.km || 620, W = GG.world ? GG.world.cfg() : { gasPerKm: 0.25, gasMin: 5 };
    g.km = km; g.gas = Math.max(W.gasMin || 5, Math.round(km * 2 * (W.gasPerKm || 0.25)));
    return g;
  }
  // Monday (career.startWeek, after the board refresh). Idempotent per week. Returns this week's PENDING or null.
  R.monday = function (state) {
    var rv = get(state), k = cfg(state), w = state.totalWeek;
    syncLineup(state);
    var cur = R.pending(state);
    if (cur) return cur;
    if (rv.pending && rv.pending.week < w) rv.pending = null;
    if (rv.mondayW === w) return null;
    rv.mondayW = w;
    if (isFinalWeek(state)) {
      var g = finalGig(state);
      state.gig = g; state.offer = null;
      if (rv.cracked === 'breakup') news(state, null, 'reunion');
      return schedulePending(state, { kind: 'final', week: w, id: g.showdown.id, status: 'set', venueId: g.venueId, venue: 'The Sad Dome', city: g.city });
    }
    var S = k.schedule, rng = seeded(state, 'sched');
    if (w < S.firstWeek || w - rv.last < S.minGap) return null;
    if (!rng.chance((S.base + S.perHeat * rv.heat) * crackFactor(rv))) return null;
    var wk = state.week, opts = [];
    Object.keys(SCHEDULE).forEach(function (kind) {
      var K2 = k.kinds[kind] || {};
      if ((rv.cool[kind] || 0) > w || state.fans < (K2.minFans || 0)) return;
      if (K2.weeks && !inWeeks(K2.weeks, wk)) return;
      var wt = (K2.weight || 1) * (K2.eraWeight ? (K2.eraWeight[eraOf(state)] || 1) : 1);
      if (kind === 'botb' && state.gig) return;
      opts.push({ kind: kind, w: wt });
    });
    while (opts.length) {
      var o = rng.weighted(opts, function (x) { return x.w; });
      opts = opts.filter(function (x) { return x !== o; });
      var id = 'SD' + w + '-' + o.kind, p = SCHEDULE[o.kind](state, rv, rng, id);
      if (!p) continue;
      rv.cool[o.kind] = w + ((k.kinds[o.kind] || {}).cooldown || 6);
      rv.last = w;
      return p.status === 'done' ? p : schedulePending(state, p);
    }
    return null;
  };

  // Forces a showdown of `kind` this week (tests, debug, UI development), skipping the chance, gap and cooldowns.
  // poach: deals the poach card now for `who` (default: the unhappiest active member) when no Monday card is pending.
  R.schedule = function (state, kind, who) {
    var rv = get(state), w = state.totalWeek, p;
    if (kind === 'final') {
      var g = finalGig(state);
      state.gig = g; state.offer = null;
      return schedulePending(state, { kind: 'final', week: w, id: g.showdown.id, status: 'set', venueId: g.venueId, venue: 'The Sad Dome', city: g.city });
    }
    if (kind === 'poach') {
      var act = (state.members || []).filter(function (m) { return m.status === 'active'; }).sort(function (a, b) { return a.mood - b.mood; });
      var m = who ? act.filter(function (x) { return x.id === who; })[0] : act[0];
      if (!m || (state.card && !state.card.resolved)) return null;
      var pc = cardFor(state, 'rv_poach');   // v0.9: the band's / rival's variant (rv_poach_tundra_wraith, ...)
      state.card = { id: pc ? pc.id : 'rv_poach', resolved: false, who: m.id, whoName: first(m.name) };
      state.phase = 'monday';
      GG.emit('rival:poach', { who: m.id, name: first(m.name) });
      return schedulePending(state, { kind: 'poach', week: w, id: 'SD' + w + '-poach', status: 'card', who: m.id, name: first(m.name) });
    }
    if (!SCHEDULE[kind]) return null;
    p = SCHEDULE[kind](state, rv, seeded(state, 'force|' + kind), 'SD' + w + '-' + kind);
    if (!p) return null;
    rv.last = w;
    return p.status === 'done' ? p : schedulePending(state, p);
  };
  // What's coming: this week's showdown, this week's scheduling chance (from heat), the Sad Dome's week (totalWeek).
  R.next = function (state) {
    var rv = get(state), k = cfg(state), F = k.final, fw = (F.year - 1) * WPY + F.week;
    return { pending: R.pending(state), chance: Math.round((k.schedule.base + k.schedule.perHeat * rv.heat) * crackFactor(rv) * 1000) / 1000,
      final: state.finalShowdown ? null : { week: fw, inWeeks: fw - state.totalWeek, reachable: state.maxWeeks >= fw } };
  };

  // Monday cards (drama.forcedCard hook, after ultimatums and returns): the crack card, Sad Dome eve, a poach attempt.
  R.forcedCard = function (state) {
    var rv = get(state), k = cfg(state), w = state.totalWeek, c;
    if (rv.crackCard) { c = cardFor(state, rv.crackCard); rv.crackCard = null; if (c) return { card: c, who: null }; }
    if (isFinalWeek(state) && !rv.eveDealt && (c = cardFor(state, 'rv_final_eve'))) { rv.eveDealt = true; return { card: c, who: null }; }
    var P = k.kinds.poach, S = k.schedule;
    if (state.protected || rv.cracked === 'breakup' || w < S.firstWeek || w - rv.last < S.minGap || (rv.cool.poach || 0) > w) return null;
    if (R.pending(state) || !(c = cardFor(state, 'rv_poach'))) return null;
    var cands = (state.members || []).filter(function (m) { return m.status === 'active' && (m.stage || 0) >= (P.minStage || 2); });
    if (!cands.length) return null;
    var rng = seeded(state, 'poach');
    if (!rng.chance((P.chance || 0.5) * (0.5 + rv.heat / 100) * crackFactor(rv))) return null;
    var m = cands.slice().sort(function (a, b) { return a.mood - b.mood; })[0];
    rv.cool.poach = w + (P.cooldown || 12); rv.last = w;
    schedulePending(state, { kind: 'poach', week: w, id: 'SD' + w + '-poach', status: 'card', who: m.id, name: first(m.name) });
    GG.emit('rival:poach', { who: m.id, name: first(m.name) });
    return { card: c, who: m.id };
  };
  // career.resolveCard hook: a resolved poach card is a showdown (kept = won; they defected = lost).
  R.afterCard = function (state, card) {
    if (!card || !/^rv_poach(_|$)/.test(card.id)) return null;
    var p = R.pending(state), who = (state.card && state.card.who) || (p && p.who);
    var m = (state.members || []).filter(function (x) { return x.id === who; })[0];
    var gone = !!(m && m.status !== 'active');
    if (gone) { syncLineup(state); news(state, null, 'poached', { name: first(m.name) }); }
    return R.resolve(state, 'poach', gone ? 0 : 1, { them: gone ? 1 : 0, won: !gone, who: who, name: m ? first(m.name) : '' });
  };

  /* ---- The BotB offer ------------------------------------------------------------------------------------------------ */
  R.enter = function (state) {
    var p = R.pending(state);
    if (!p || p.kind !== 'botb' || !state.offer || !state.offer.showdown) return null;
    var g = GG.career.acceptOffer(state);
    if (g) p.status = 'entered';
    return g;
  };
  R.pass = function (state) {
    var p = R.pending(state);
    if (!p || p.kind !== 'botb' || p.status !== 'offered') return false;
    if (state.offer && state.offer.showdown) GG.career.declineOffer(state);
    p.status = 'passed';
    return true;
  };
  R.botWeek = function (state, style) {
    var p = R.pending(state);
    if (!p || p.kind !== 'botb' || p.status !== 'offered' || !state.offer || !state.offer.showdown) return;
    if (style === 'good' || seeded(state, 'bot').chance(cfg(state).bot.avgEnter)) R.enter(state); else R.pass(state);
  };

  /* ---- Showdowns ------------------------------------------------------------------------------------------------- */
  // Their set score for this week's showdown of `kind` (deterministic: career seed + week + kind).
  R.setScore = function (state, kind) {
    var rv = get(state), k = cfg(state), rng = seeded(state, 'set|' + kind);
    var low = k.noise * (GG.difficulty ? GG.difficulty.mul(state, 'rivalMiss') : 1);   // v0.6.1 C4: Brutal's rival rarely has an off night
    return U.clamp(Math.round(R.skill(state) + (k.kindBonus[kind] || 0) + rv.form + rng.range(-low, k.noise)), 15, 99);
  };
  // v0.9: cast[rid].showdowns[kind] wins, key by key, over the neutral rivalry.showdowns[kind].
  function texts(kind, state) {
    var flat = ((content().showdowns || {})[kind]) || {}, c = R.cast(state || curState), own = c && c.showdowns && c.showdowns[kind];
    return own ? Object.assign({}, flat, own) : flat;
  }
  // v0.9: the rival's BPM range from their genre (content/genres.js tempo [min, max, default]).
  function bpmRange(state) {
    var rv = get(state), G = GG.content.genres && GG.content.genres[rv.genre || state.genre], t = G && G.tempo;
    return t && t.length >= 2 ? [t[0], t[1]] : [150, 220];
  }
  // v0.9: once-per-set stage actions (C.RIVAL_ACTIONS; Mall Rats' sponsor-mandated kickflip): economy byRival.actions or
  // cast.actions -> [{ song, at (0..1 of the song), action, who }], deterministic per week.
  R.setActions = function (state, kind, n) {
    var k = cfg(state), c = R.cast(state) || {}, acts = (c.actions || k.actions || []).filter(function (a) { return !C.RIVAL_ACTIONS || C.RIVAL_ACTIONS.indexOf(a) >= 0; });
    if (!acts.length) return [];
    var rng = seeded(state, 'acts|' + (kind || 'set')), rv = get(state), who = (rv.members || []).filter(function (m) { return !m.defector && /vocal/.test(m.role || ''); })[0];
    return acts.map(function (a) { return { song: rng.int(0, Math.max(0, (n || 3) - 1)), at: Math.round(rng.range(0.35, 0.75) * 100) / 100, action: a, who: who ? who.id : null }; });
  };
  // Setup data for the UI: their lineup, setlist (per-song scores that average to their set score) and the stakes.
  R.showdown = function (state, kind) {
    var rv = get(state), k = cfg(state), p = R.pending(state);
    kind = kind || (p && p.kind) || 'botb';
    var score = R.setScore(state, kind), rng = seeded(state, 'setlist|' + kind), c = R.cast(state) || {};
    var n = kind === 'final' ? 4 : 3, titles = rng.shuffle((c.songs && c.songs.length ? c.songs : [rv.baseName + ' (Live)']).slice());
    var songs = [], sum = 0, bpm = bpmRange(state);
    for (var i = 0; i < n; i++) {
      var s = i < n - 1 ? U.clamp(Math.round(score + rng.range(-6, 6)), 5, 100) : U.clamp(score * n - sum, 5, 100);
      sum += s;
      var ti = titles[i % titles.length];
      songs.push({ title: typeof ti === 'string' ? ti : (ti && ti.title) || '', score: s, bpm: rng.int(bpm[0], bpm[1]), seconds: rng.int(150, 230) });
    }
    var T = texts(kind, state), prize = p && p.prize || (kind === 'botb' ? (k.botb.prize[eraOf(state)] || 0) : 0);
    var vars = { venue: p ? p.venue : '', city: p ? p.city : '', prize: money(prize), name: p && p.name || '' };
    return { kind: kind, week: state.totalWeek, title: T.title || kind, icon: T.icon || '', text: fill(state, T.text || '', vars),
      enter: T.enter || null, pass: T.pass || null, venue: p ? { id: p.venueId, name: p.venue, city: p.city } : null, prize: prize,
      score: score, expected: Math.round(R.skill(state) + (k.kindBonus[kind] || 0) + rv.form), setlist: songs,
      rival: { id: rv.id, name: rv.name, city: rv.city, genre: rv.genre, heat: rv.heat, record: R.record(state), members: R.lineup(state), cracked: rv.cracked,
        style: k.style || (c.style) || null, legacy: rv.legacy || 0 },
      actions: R.setActions(state, kind, n),   // v0.9: the kickflip (the UI emits gig:band { id, action } at that point)
      stakes: kind === 'final' ? 'Headline the Sad Dome, forever.' : kind === 'botb' ? money(prize) + ' and some of their fans'
        : kind === 'festival' ? 'Outplay the headliners from a lower slot' : '' };
  };
  function findShowdown(state, kind, w) {
    return (state.showdowns || []).filter(function (x) { return x.kind === kind && x.week === w; })[0] || null;
  }
  // Resolves this week's showdown of `kind` with your score (idempotent per week + kind). opts: { them, won, result
  // (a GIG_RESULT to fold the prize / fans / buzz / verdict line into), venueId, name, who, heat, crowdLost }.
  // Without opts.result the player's side (prize, fans, buzz) is applied to the state directly.
  R.resolve = function (state, kind, you, opts) {
    opts = opts || {};
    var rv = get(state), k = cfg(state), w = state.totalWeek, p = R.pending(state);
    var done = findShowdown(state, kind, w);
    if (done) return done;
    var them = opts.them != null ? opts.them : R.setScore(state, kind);
    you = Math.round(you || 0); them = Math.round(them);
    var won = opts.won != null ? !!opts.won : kind === 'final' ? you >= them : you > them;
    var sd = { week: w, kind: kind, venueId: opts.venueId || (p && p.kind === kind ? p.venueId : null) || null, won: won, you: you, them: them,
      prize: 0, fansSwing: 0, heatDelta: 0, id: (p && p.kind === kind && p.id) || 'SD' + w + '-' + kind,
      name: opts.name || (p && p.kind === kind ? p.venue : null) || null, rival: rv.name, lines: [] };
    if (opts.who) sd.who = opts.who;
    var fx = { fund: 0, fans: 0, buzz: 0 }, era = eraOf(state);
    if (kind === 'botb') {
      var prize = (p && p.prize) || k.botb.prize[era] || 0, cap = k.botb.stealCap[era] || 100;
      var steal = Math.max(1, Math.round(Math.min(cap, (won ? rv.fans : state.fans) * k.botb.steal)));
      if (won) { sd.prize = prize; sd.fansSwing = steal; fx.fund = prize; fx.fans = steal; fx.buzz = k.botb.buzz; rv.fans = Math.max(0, rv.fans - steal); }
      else { sd.fansSwing = -steal; fx.fans = -steal; rv.fans += steal; }
    } else if (kind === 'sameNight') {
      // the split already cost the loser the room; the winner also walks off with a few of the other band's fans
      var st = Math.max(0, Math.round(Math.min(100, (won ? rv.fans : state.fans) * k.sameNight.steal)));
      if (won) { sd.fansSwing = st; fx.fans = st; rv.fans = Math.max(0, rv.fans - st); } else rv.fans += st;
      if (opts.crowdLost != null) sd.crowdLost = opts.crowdLost;
    } else if (kind === 'festival' && won) {
      var crowd = opts.result && opts.result.crowd || 0, bonus = Math.max(k.festival.fansMin, Math.round(crowd * k.festival.fans));
      sd.fansSwing = bonus; sd.bonusFans = bonus; fx.fans = bonus; fx.buzz = k.festival.buzz;
    } else if (kind === 'final') {
      var F = k.final;
      if (won) { fx.buzz = F.winBuzz; fx.fans = Math.round(state.fans * F.winFans); sd.fansSwing = fx.fans; } else fx.buzz = F.loseBuzz;
      state.finalShowdown = { week: w, won: won, headliner: won ? 'you' : 'rival', score: you, rivalScore: them, rival: rv.name };
    }
    // heat, record, form, their buzz
    var hd = opts.heat != null ? opts.heat : (k.heat.clash[kind] || 5);
    var hb = rv.heat; R.addHeat(state, hd, kind); sd.heatDelta = Math.round((rv.heat - hb) * 10) / 10;
    if (won) { rv.losses++; rv.form = Math.max(-k.form.max, rv.form + k.form.loss); rv.buzz = U.clamp(rv.buzz + k.buzz.loss, 0, 100); }
    else { rv.wins++; rv.form = Math.min(k.form.max, rv.form + k.form.win); rv.buzz = U.clamp(rv.buzz + k.buzz.win, 0, 100); }
    // the verdict line
    var T = texts(kind, state), vars = { venue: sd.name || '', city: p ? p.city : '', prize: money(sd.prize || (p && p.prize) || 0), name: opts.name || (p && p.name) || '' };
    var line = pick(state, seeded(state, 'verdict|' + kind), won ? T.win : T.lose, vars);
    if (line) sd.lines.push(line);
    // the player's side
    if (opts.result) {
      var r = opts.result;
      r.pay = (r.pay || 0) + fx.fund; r.prize = fx.fund || 0; r.fans = (r.fans || 0) + fx.fans; r.buzz = (r.buzz || 0) + fx.buzz;
      r.lines = r.lines || []; if (line) r.lines.push(line);
      r.showdown = sd;
    } else if (fx.fund || fx.fans || fx.buzz) {
      sd.deltas = GG.career.applyEffects(state, { fund: fx.fund || null, fans: fx.fans || null, buzz: fx.buzz || null }, {});
    }
    if (p && p.kind === kind) p.status = 'done';
    (state.showdowns = state.showdowns || []).push(sd);
    if (state.showdowns.length > 80) state.showdowns.splice(0, state.showdowns.length - 80);
    if (kind !== 'loonies' && kind !== 'final') news(state, null, null, null, null, (won ? 'Showdown won: ' : 'Showdown lost: ') + (T.title || kind) + (sd.name ? ' (' + sd.name + ')' : '') + '.');
    GG.emit('showdown:done', { showdown: sd });
    if (kind === 'final') GG.emit('final:done', { final: state.finalShowdown });
    return sd;
  };
  R.final = function (state) { return state.finalShowdown || null; };

  // career.settleGig hook, after world.shape and before gig.applyResult: resolves a botb/festival/final gig with your score,
  // splits the crowd on a same-night, and brings the (cracked) rival's fans when they open for you. Once per result.
  R.shape = function (state, g, r) {
    if (!g || !r || r.rivalShaped) return r;
    r.rivalShaped = true;
    var rv = get(state), k = cfg(state), p = R.pending(state), kind = g.showdown && g.showdown.kind;
    if (kind && GIG_KINDS[kind]) {
      R.resolve(state, kind, r.score, { result: r, venueId: g.venueId, name: kind === 'final' ? 'The Sad Dome' : (R.venue(g.venueId) || g).name });
      return r;
    }
    if (p && p.kind === 'sameNight' && p.status !== 'done') {
      var yb = state.buzz || 0, share = (yb + 10) / (yb + rv.buzz + 20), mult = 1 - k.sameNight.split * (1 - share);
      var before = r.crowd || 0;
      r.crowd = Math.max(1, Math.round(before * mult));
      r.fans = Math.max(0, Math.round((r.fans || 0) * mult));
      if (g.deal === 'door' && GG.gig && GG.gig.payFor) r.pay = GG.gig.payFor(g, r.crowd);
      var you = Math.round(share * 100);
      R.resolve(state, 'sameNight', you, { them: 100 - you, won: you >= 50, result: r, crowdLost: before - r.crowd, venueId: p.venueId, name: p.venue });
      return r;
    }
    if (rv.cracked === 'opener' && (g.tier || 0) >= 2) {
      var rng = seeded(state, 'opener');
      if (rng.chance(k.opener.chance)) {
        var n = rng.int(k.opener.crowd[0], k.opener.crowd[1]), room = Math.max(0, (g.capacity || 0) - (r.crowd || 0)), add = Math.min(room, n);
        if (add > 0) {
          r.crowd += add; r.fans = (r.fans || 0) + Math.round(add * k.opener.fans);
          if (g.deal === 'door' && GG.gig && GG.gig.payFor) r.pay = GG.gig.payFor(g, r.crowd);
          (r.lines = r.lines || []).push(pick(state, rng, lines('opener', state), { n: add }));
          r.rivalOpened = add;
        }
      }
    }
    return r;
  };

  /* ---- Cracking ------------------------------------------------------------------------------------------------- */
  R.crack = function (state, kind, out) {
    var rv = get(state), w = state.totalWeek;
    if (rv.cracked) return null;
    var rng = seeded(state, 'crack');
    if (C.CRACKS.indexOf(kind) < 0) {
      var opts = [{ k: 'breakup', w: rv.heat >= 70 ? 3 : 1 }, { k: 'rebrand', w: 2 }, { k: 'opener', w: state.fans >= rv.fans * 1.5 ? 3 : 0.5 }];
      kind = rng.weighted(opts, function (x) { return x.w; }).k;
    }
    rv.cracked = kind; rv.crackWeek = w;
    if (kind === 'rebrand') {
      var rb = (R.cast(state) || {}).rebrands, names = rb && rb.length ? rb : [rv.name + ' LLP'];
      rv.formerName = rv.name; rv.name = rng.pick(names);
    }
    var to = { breakup: 10, rebrand: 35, opener: 15 }[kind];
    R.addHeat(state, to - rv.heat, 'crack');
    rv.crackCard = 'rv_crack_' + kind;   // v0.9: dealt through career.variant ('rv_crack_<kind>_<rivalId>' first)
    news(state, out, 'crack_' + kind, null, rng);
    GG.emit('rival:cracked', { kind: kind, name: rv.name, formerName: rv.formerName });
    return kind;
  };
  function maybeCrack(state, rv, out) {
    var K2 = cfg(state).crack;
    if (rv.cracked || state.year < K2.fromYear) return null;
    if (rv.losses - rv.wins < K2.net || rv.losses < K2.minWins || rv.heat < K2.heat) return null;
    return R.crack(state, null, out);
  }

  /* ---- The week wrap ---------------------------------------------------------------------------------------------- */
  // Closes this week's showdown if nobody played it (forfeits, missed festivals, quiet same-nights, the final's fallback).
  function closePending(state, rv, out) {
    var p = R.pending(state);
    if (!p || p.status === 'done' || p.status === 'missed') return;
    var rng = seeded(state, 'close');
    if (p.kind === 'final') {
      var g = finalGig(state), score = GG.gig && GG.gig.simulate ? GG.gig.simulate(state, g, rng).score : 50;
      R.resolve(state, 'final', score, { name: 'The Sad Dome' });
      return;
    }
    if (p.kind === 'botb') { news(state, out, 'forfeit', null, rng); rv.buzz = U.clamp(rv.buzz + 2, 0, 100); }
    else if (p.kind === 'festival') news(state, out, 'festivalMissed', { venue: p.venue }, rng);
    else if (p.kind === 'sameNight') news(state, out, 'sameNightQuiet', { venue: p.venue }, rng);
    p.status = 'missed';
  }
  // career.endWeek hook (after labels.weekly). Once per week.
  R.weekly = function (state, rng, wrap) {
    var rv = get(state), k = cfg(state), w = state.totalWeek, out = { news: [], heat: rv.heat, heatDelta: 0, showdowns: [], cracked: null, final: null };
    if (wrap) wrap.rival = out;
    if (rv.w === w) { out.heat = rv.heat; return out; }
    rv.w = w;
    var r = seeded(state, 'week');
    syncLineup(state);
    closePending(state, rv, out);
    grow(state, rv, r, out, w, false);
    // heat: slow decay; above buzzFrom it feeds buzz to both bands
    var H = k.heat;
    R.addHeat(state, -Math.min(rv.heat, Math.max(H.decayMin, rv.heat * H.decay)), 'decay');
    if (rv.heat > H.buzzFrom) {
      var hb = rngRound((rv.heat - H.buzzFrom) * H.buzz, r);
      if (hb > 0) { GG.career.applyEffects(state, { buzz: hb }, {}); out.heatBuzz = hb; }
    }
    // the fan race
    var lead = state.fans >= rv.fans ? 'you' : 'rival';
    if (rv.lead && lead !== rv.lead && Math.abs(state.fans - rv.fans) > 20) news(state, out, lead === 'you' ? 'youPassed' : 'theyPassed', null, r);
    rv.lead = lead;
    if (rv.heat >= 50 && rv.heatWas < 50) news(state, out, 'heatUp', null, r);
    else if (rv.heat < 20 && rv.heatWas >= 20 && !rv.cracked) news(state, out, 'heatDown', null, r);
    out.cracked = maybeCrack(state, rv, out);
    // year 10: the Sad Dome is announced
    var F = k.final;
    if (!rv.finalNews && state.year === F.year && state.maxWeeks >= (F.year - 1) * WPY + F.week) {
      rv.finalNews = true; news(state, out, 'finalSoon', { n: F.week }, r);
    }
    if (state.week === C.LOONIES_WEEK && state.loonies && state.loonies.year === state.year && !state.loonies.invited && rv.loonieWins > (rv.loonieSeen || 0)) {
      news(state, out, 'loonies', { n: rv.loonieWins - (rv.loonieSeen || 0) }, r);
    }
    rv.loonieSeen = rv.loonieWins;
    if (GG.tour && state.tour) GG.tour.rivalWeekly(state, function (text) { news(state, out, 'world', null, r, text); });   // v0.7: they break regions too
    if (!out.news.length && r.chance(0.12)) news(state, out, 'filler', null, r);
    out.showdowns = (state.showdowns || []).filter(function (x) { return x.week === w; });
    out.final = out.showdowns.some(function (x) { return x.kind === 'final'; }) ? state.finalShowdown : null;
    rv.past.push(rv.fans); if (rv.past.length > 5) rv.past.shift();
    out.heat = rv.heat; out.heatDelta = Math.round((rv.heat - rv.heatWas) * 10) / 10; rv.heatWas = rv.heat;
    return out;
  };

  /* ---- The scene leaderboard ------------------------------------------------------------------------------------ */
  function fillerFans(state, f, w) {
    var yrs = Math.max(0, w) / WPY, t = Math.min(1, yrs / Math.max(0.5, f.rise || 3)), s = t * t * (3 - 2 * t);
    var v = f.base + (f.peak - f.base) * s;
    if (yrs > f.rise) v *= 1 - (f.fade || 0) * Math.min(1, (yrs - f.rise) / Math.max(1, C.CAREER_YEARS - f.rise));
    var rng = GG.RNG(GG.hashSeed((state.seed >>> 0) + '|scene|' + f.id + '|' + w));
    return Math.max(0, Math.round(v * rng.range(0.97, 1.03)));
  }
  // Everyone in the scene by fans: you, your rival and the filler bands. n = top n (you and the rival always stay in).
  R.leaderboard = function (state, n) {
    var rv = get(state), w = state.totalWeek, h = state.history || [], ago = h.length > 4 ? h[h.length - 5].fans : (h[0] ? h[0].fans : state.fans);
    var rows = [{ id: 'you', name: bandName(state), city: state.city, fans: state.fans, era: state.era, trend: state.fans - ago, you: true },
      { id: rv.id, name: rv.name, city: rv.city, fans: rv.fans, era: rv.era, trend: rv.fans - (rv.past[0] != null ? rv.past[0] : rv.fans),
        rival: true, cracked: rv.cracked, heat: rv.heat, legacy: rv.legacy || 0 }];
    (content().scene || []).forEach(function (f) {
      // v0.9: skip a filler row that is your own rival (rivalId / its name) or your own band (a Q8 cameo row with bandId)
      if ((f.rivalId && f.rivalId === rv.id) || (f.bandId && f.bandId === state.bandId) || f.name === rv.baseName || f.name === rv.name) return;
      var now = fillerFans(state, f, w);
      var row = { id: f.id, name: f.name, city: f.city, genre: f.genre, fans: now, trend: now - fillerFans(state, f, w - 4) };
      if (f.bandId) row.bandId = f.bandId; if (f.rivalId) row.rivalId = f.rivalId;   // cameo rows (the UI draws their logos)
      rows.push(row);
    });
    rows.sort(function (a, b) { return b.fans - a.fans || (a.you ? -1 : 1); });
    rows.forEach(function (r, i) { r.rank = i + 1; });
    if (!n) return rows;
    return rows.filter(function (r, i) { return i < n || r.you || r.rival; });
  };

  /* ---- Saves: v5 -> v6 (idempotent). A missing rival is created and caught up to the current week, quietly. ---- */
  R.migrate = function (s) {
    if (!s || typeof s !== 'object') return s;
    if (!Array.isArray(s.showdowns)) s.showdowns = [];
    if (s.finalShowdown === undefined) s.finalShowdown = null;
    var rv = s.rival;
    if (!rv || typeof rv !== 'object' || Array.isArray(rv) || !isFinite(rv.fans)) {
      rv = s.rival = R.create(s);
      if (s.flags && (s.flags.wraithFeud || s.flags.rivalFeud)) rv.heat = rv.heatWas = Math.min(100, rv.heat + 15);   // v0.9: rivalFeud (any rival)
      var tw = isFinite(s.totalWeek) ? s.totalWeek : 1;
      for (var w = 1; w < tw; w++) grow(s, rv, seeded(s, 'week', w), null, w, true);
      rv.w = tw - 1; rv.past = [rv.fans];
    } else {
      var d = R.create(s);
      Object.keys(d).forEach(function (key) { if (rv[key] === undefined) rv[key] = d[key]; });
      Object.keys(FIELD_DEFAULTS).forEach(function (key) { if (!isFinite(rv[key])) rv[key] = FIELD_DEFAULTS[key]; });
      ['members', 'albums', 'news', 'past'].forEach(function (key) { if (!Array.isArray(rv[key])) rv[key] = key === 'members' ? castMembers(s) : []; });
      if (!rv.cool || typeof rv.cool !== 'object') rv.cool = {};
      if (!isFinite(rv.heat)) rv.heat = cfg(s).heat.start;
      if (rv.cracked && C.CRACKS.indexOf(rv.cracked) < 0) rv.cracked = null;
    }
    syncLineup(s);
    return s;
  };
  if (GG.save && GG.save.migrate && !GG.save.migrate.rival) {
    var prevMigrate = GG.save.migrate;
    GG.save.migrate = function (s) { return R.migrate(prevMigrate(s)); };
    GG.save.migrate.rival = true;
  }

  GG.registerDebug('rival', function () {
    var s = GG.state; if (!s || !s.rival) return { state: null };
    var rv = s.rival;
    return { name: rv.name, fans: rv.fans, buzz: rv.buzz, era: rv.era, heat: rv.heat, skill: rv.skill, record: R.record(s),
      cracked: rv.cracked, pending: R.pending(s), albums: rv.albums.length, members: rv.members.map(function (m) { return m.id; }),
      showdowns: (s.showdowns || []).length, final: s.finalShowdown };
  });
})(window.GG);
