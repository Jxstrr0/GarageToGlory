// 2f_sim_legacy.js (v1.0 "Glory", Lane E; plan/plan_contract_1.0.md §4.1–4.4): the Legacy score, the ending tier, special
// endings, epilogue cards, bonus years and the career's final year. Pure sim: no DOM, no audio, no random rolls, no clock;
// never draws from the career RNG (variant picks hash careerId + member id). Content: GG.content.endings (content/endings.js).
// Seat-neutral: no Legacy part reads the seat (state.seat || 'drums' is only stored, and keys the player's epilogue card).
// API (GG.legacy):
//   noBonus (plain flag: bonus years off; tools/balance.js NO_BONUS=1, 10-year tests) · ensure(state) · migrate(state)
//   gig(state, r, g)       career.settleGig: legacyTrack.bigHead = the biggest venue HEADLINED { id, name, cap, week } (not an
//                          opening slot, a domestic festival slot under a headliner, a tour festival stop or the Sad Dome;
//                          Mudstonbury counts once flags.mudstonbury === 'headlined')
//   weekly(state, wrap)    career.endWeek (before advance): the one-time bonus-year grant -> { years, maxWeeks } | null
//   worldWeek(state) · bonusFor(state) -> 0|2|3 · finalYear(state) = ceil(maxWeeks / 24) · yearsText(state) 'Ten years.'
//   parts(state) -> { parts, raw } · score(state) · tier(score|state) · specials(state, raw?) · epilogues(state, tier, specials)
//   compute(state) -> LEGACY (pure: no writes, no events) · finish(state) -> LEGACY (stored once in state.legacy; emits
//   'legacy:done' { legacy } the first time) · hofEntry(state) -> HOF_ENTRY without at/ver (12_meta stamps them)
//   text(state, legacy?) -> { tier: { id, name, line, unlock }, specials: [{ id, name, line, unlock }], rival: line,
//   years, bonusYears } (display text, tokens filled) · careerId(state) · whenOk(state, member, when, ctx) (epilogue matcher)
// Events: 'legacy:bonus' { years, maxWeeks } (the grant) · 'legacy:done' { legacy } (finish, before 'career:end').
// Old saves: a career created before 1.0 has no headline tracker for its early years, so compute() also estimates the
//   biggest venue from venueLast (largest room played, Sad Dome and festival grounds excluded) and marks it est: true. The
//   estimate is never written into the save by migrate (the v1.0 migrate defaults stay exactly as stage 0 fills them).
(function (GG) {
  var C = GG.contracts, U = GG.util, WPY = C.WEEKS_PER_YEAR;
  var L = GG.legacy = GG.legacy || {};
  L.noBonus = false;

  var TUNE = {
    fans: { max: 250, full: 100000, pow: 0.6 },
    units: { max: 200, full: 800000, pow: 0.5 },
    awards: { max: 150, loonie: 8, gong: 20, cert: 4, greyMug: 10 },
    venue: { max: 100, floor: 15, full: 19000 },
    regions: { per: 25, max: 100 },
    unity: { max: 100, chem: 0.5, kept: 0.5 },
    final: { you: 100, rival: 40, none: 0 }
  };
  var TIER_MIN = { arena_legends: 800, canadian_institution: 600, cult_heroes: 400, one_album_wonders: 200, still_in_the_garage: 0 };
  var NUM = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen',
    'Fourteen', 'Fifteen'];
  var SAD_DOME_CAP = 19000;

  function K() { return GG.content.endings || {}; }
  function tune(k) { var t = K().legacy || {}; return Object.assign({}, TUNE[k], t[k] || {}); }
  function obj(o) { return o && typeof o === 'object' && !Array.isArray(o) ? o : null; }
  function num(v) { return isFinite(v) ? +v : 0; }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function fill(state, text) { return GG.career && GG.career.fillText ? GG.career.fillText(state, text) : String(text || ''); }
  function hashPick(state, tag, list) {
    if (!list || !list.length) return null;
    return list[GG.hashSeed(L.careerId(state) + '|' + tag) % list.length];
  }
  function bandOf(state) { return GG.career && GG.career.band ? GG.career.band(state) : null; }
  function venueDef(id) { return GG.gig && GG.gig.venue ? GG.gig.venue(id) : null; }

  L.careerId = function (state) {
    if (GG.meta && GG.meta.careerId) return GG.meta.careerId(state);
    var s = state || {}, seed = (s.seed >>> 0) || 1;
    return seed.toString(36) + '.' + (s.bandId || 'band');
  };

  // Fill-when-missing (the stage-0 migrate defaults; also the API's migrate: nothing chained onto GG.save.migrate).
  L.ensure = function (state) {
    if (!obj(state)) return state;
    if (!isFinite(state.bonusYears)) state.bonusYears = 0;
    if (!obj(state.legacyTrack)) state.legacyTrack = { bigHead: null };
    if (state.legacyTrack.bigHead === undefined) state.legacyTrack.bigHead = null;
    if (state.legacy === undefined) state.legacy = null;
    return state;
  };
  L.migrate = function (state) { return L.ensure(state); };

  /* ---- The biggest venue headlined -------------------------------------------------------------------------------- */
  function isMud(id) { return id === 'mudstonbury_fest'; }
  function mudHeadlined(state) { return !!(state.flags && state.flags.mudstonbury === 'headlined'); }
  L.gig = function (state, r, g) {
    if (!obj(state) || !r || !g) return null;
    L.ensure(state);
    if (r.opening || g.opening || g.headliner || g.source === 'final' || g.venueId === 'sad_dome' || (g.showdown && g.showdown.kind === 'final')) return null;
    if (g.festival && !(isMud(g.venueId) && mudHeadlined(state))) return null;
    var v = venueDef(g.venueId), cap = num(g.capacity || (v && v.capacity));
    if (!(cap > 0)) return null;
    var cur = state.legacyTrack.bigHead;
    if (cur && num(cur.cap) >= cap) return cur;
    state.legacyTrack.bigHead = { id: g.venueId || null, name: (v && v.name) || g.name || 'a venue', cap: cap, week: state.totalWeek };
    return state.legacyTrack.bigHead;
  };
  function verBefore1(v) { var m = /^(\d+)\./.exec(String(v || '')); return !!m && +m[1] < 1; }
  // Old saves (created before 1.0): the largest room in venueLast, minus the Sad Dome and festival grounds (a guess: est).
  function estimate(state) {
    if (!verBefore1(state.createdVersion)) return null;
    var best = null;
    Object.keys(state.venueLast || {}).forEach(function (id) {
      var v = venueDef(id);
      if (!v || id === 'sad_dome' || v.festival || !(num(v.capacity) > 0)) return;
      if (!best || v.capacity > best.cap) best = { id: id, name: v.name, cap: v.capacity, est: true };
    });
    return best;
  }
  function bestVenue(state) {
    var c = [], bh = state.legacyTrack && state.legacyTrack.bigHead;
    if (obj(bh) && num(bh.cap) > 0) c.push({ id: bh.id || null, name: bh.name || 'a venue', cap: num(bh.cap) });
    var est = estimate(state); if (est) c.push(est);
    if (mudHeadlined(state)) { var mv = venueDef('mudstonbury_fest'); c.push({ id: 'mudstonbury_fest', name: (mv && mv.name) || 'Mudstonbury', cap: num(mv && mv.capacity) || 60000 }); }
    if (state.finalShowdown && state.finalShowdown.headliner === 'you') { var sd = venueDef('sad_dome'); c.push({ id: 'sad_dome', name: (sd && sd.name) || 'The Sad Dome', cap: num(sd && sd.capacity) || SAD_DOME_CAP }); }
    return c.reduce(function (b, x) { return !b || x.cap > b.cap ? x : b; }, null);
  }

  /* ---- Bonus years and the final year ---------------------------------------------------------------------------- */
  L.worldWeek = function (state) {
    if (!obj(state)) return null;
    var h = (state.eraHistory || []).filter(function (x) { return x && x.era === 'world'; })[0];
    if (h && isFinite(h.week)) return h.week;
    var m = state.milestones && state.milestones.worldReady;
    return isFinite(m) && m ? m : null;
  };
  L.bonusFor = function (state) {
    if (L.noBonus) return 0;
    var ww = L.worldWeek(state);
    if (ww == null) return 0;
    var rule = (C.BONUS && C.BONUS.rule) || [];
    for (var i = 0; i < rule.length; i++) if (ww <= rule[i].maxWeek) return rule[i].years;
    return 0;
  };
  L.finalYear = function (state) { return Math.ceil(num(state && state.maxWeeks || WPY * C.CAREER_YEARS) / WPY); };
  L.yearsText = function (state) { var y = L.finalYear(state); return (NUM[y] || String(y)) + ' years.'; };
  // The bonus-year Monday cards (content endings.bonusCards: World era, year 11 on) join GG.content.cards once a career has
  // bonus years (the grant, every later wrap, a loaded bonus save). They can never be drawn in years 1–10, so no existing pool
  // changes order or weight and a NO_BONUS career replays exactly. (A load-time append would put World-era cards in the
  // Monday deck that tests/content.test.js still pins to garage/local/signed: lead hand-over.)
  var deckRef = null;
  L.deck = function () {
    var cards = GG.content.cards, extra = K().bonusCards;
    if (!Array.isArray(cards) || !Array.isArray(extra) || !extra.length || deckRef === cards) return false;
    var have = {};
    cards.forEach(function (c) { if (c && c.id) have[c.id] = 1; });
    extra.forEach(function (c) { if (c && c.id && !have[c.id]) cards.push(c); });
    deckRef = cards;
    return true;
  };
  function canGrant(state) {
    return !L.noBonus && !state.ended && !num(state.bonusYears) && !state.finalShowdown && !(state.rival && state.rival.finalNews)
      && state.year < C.CAREER_YEARS;
  }
  // career.endWeek, after the milestones and before advance(): grants the bonus years once, on the spot.
  L.weekly = function (state, wrap) {
    if (!obj(state)) return null;
    L.ensure(state);
    if (num(state.bonusYears) > 0) L.deck();
    if (!canGrant(state)) return null;
    var years = L.bonusFor(state);
    if (!years) return null;
    state.bonusYears = years;
    state.maxWeeks = WPY * (C.CAREER_YEARS + years);
    L.deck();
    var B = K().bonus || {}, by = (B.byBand && B.byBand[state.bandId]) || {};
    var ms = hashPick(state, 'bonus|ms', (by.milestone && by.milestone[years]) || (B.milestone && B.milestone[years]));
    var ch = hashPick(state, 'bonus|chat', (by.chat && by.chat[years]) || (B.chat && B.chat[years]));
    // A band's own line is written in one original member's voice: if that member is gone, use the generic '@front' line.
    if (ch && typeof ch === 'object' && ch.who && !(state.members || []).some(function (m) { return m && m.id === ch.who && m.status === 'active'; }))
      ch = hashPick(state, 'bonus|chat', B.chat && B.chat[years]);
    var line = ms ? fill(state, ms) : (NUM[years] || years) + ' bonus years: the career now runs ' + (NUM[C.CAREER_YEARS + years] || '') + ' years.';
    if (wrap) { (wrap.milestones = wrap.milestones || []).push(line); wrap.bonus = { years: years, maxWeeks: state.maxWeeks, line: line }; }
    if (ch && GG.career && GG.career.postChat) {
      var msg = GG.career.postChat(state, (ch && ch.who) || '@front', ch.text || ch, null, 'news');
      if (msg && wrap) (wrap.chat = wrap.chat || []).push(msg);
    }
    GG.emit('legacy:bonus', { years: years, maxWeeks: state.maxWeeks });
    return { years: years, maxWeeks: state.maxWeeks };
  };

  /* ---- The seven parts ---------------------------------------------------------------------------------------- */
  function originals(state) {
    var o = (state.members || []).filter(function (m) { return m && m.original; });
    return { start: o.length,
      kept: o.filter(function (m) { return m.status === 'active'; }).length,
      everQuit: o.filter(function (m) { return m.status !== 'active' || num(m.returns) > 0; }).length };
  }
  function rivalOriginals(state) {
    var ids = state.rivalDefectors || [];
    return (state.members || []).filter(function (m) { return m && m.original && m.status !== 'active' && ids.indexOf(m.id) >= 0; }).length;
  }
  function brokenRegions(state) {
    var R = (state.tour && state.tour.regions) || {}, home = state.region || 'canada';
    return C.REGIONS.filter(function (id) { return id !== home && R[id] && R[id].broken; });
  }
  L.raw = function (state) {
    var st = state.stats || {}, f = state.flags || {}, tour = state.tour || {};
    var certs = isFinite(st.certs) ? +st.certs : (state.trophies || []).filter(function (t) { return t && (t.kind === 'gold' || t.kind === 'platinum'); }).length;
    return { fans: num(state.fans), units: num(st.units), loonies: num(st.loonieWins),
      gongs: (tour.gongs || []).filter(function (g) { return g && g.won; }).length, certs: certs,
      greyMug: f.greyMug === 'played' || f.greyMug === 'done' ? 1 : 0, venue: bestVenue(state), broken: brokenRegions(state),
      chem: num(state.chemistry), originals: originals(state), rivalOriginals: rivalOriginals(state),
      final: state.finalShowdown ? (state.finalShowdown.headliner === 'you' ? 'you' : 'rival') : null };
  };
  L.parts = function (state) {
    var raw = L.raw(state), p = {};
    var F = tune('fans'); p.fans = Math.round(F.max * Math.pow(clamp01(raw.fans / F.full), F.pow));
    var N = tune('units'); p.units = Math.round(N.max * Math.pow(clamp01(raw.units / N.full), N.pow));
    var A = tune('awards'); p.awards = Math.round(Math.min(A.max, A.loonie * raw.loonies + A.gong * raw.gongs + A.cert * raw.certs + A.greyMug * raw.greyMug));
    var V = tune('venue'), cap = raw.venue ? raw.venue.cap : 0;
    p.venue = cap > 0 ? Math.round(V.max * clamp01(Math.log(cap / V.floor) / Math.log(V.full / V.floor))) : 0;
    var G = tune('regions'); p.regions = Math.min(G.max, G.per * raw.broken.length);
    var Y = tune('unity'), o = raw.originals;
    p.unity = Math.round(Y.max * (Y.chem * clamp01(raw.chem / 100) + Y.kept * (o.start ? o.kept / o.start : 0)));
    var Fi = tune('final'); p.final = raw.final === 'you' ? Fi.you : raw.final === 'rival' ? Fi.rival : Fi.none;
    var out = {};
    C.LEGACY_PARTS.forEach(function (k) { out[k] = Math.max(0, p[k] || 0); });
    return { parts: out, raw: raw };
  };
  function sum(parts) { return C.LEGACY_PARTS.reduce(function (t, k) { return t + (parts[k] || 0); }, 0); }
  L.score = function (state) { return sum(L.parts(state).parts); };

  /* ---- Tier and specials ---------------------------------------------------------------------------------------- */
  function tiers() {
    var list = K().tiers;
    if (Array.isArray(list) && list.length) return list.slice().sort(function (a, b) { return b.min - a.min; });
    return C.ENDING_TIERS.map(function (id) { return { id: id, name: id, min: TIER_MIN[id] }; });
  }
  L.tierDef = function (id) { return tiers().filter(function (t) { return t.id === id; })[0] || null; };
  L.tier = function (x) {
    var sc = typeof x === 'number' ? x : L.score(x), list = tiers();
    for (var i = 0; i < list.length; i++) if (sc >= list[i].min) return list[i].id;
    return list[list.length - 1].id;
  };
  function tierRank(id) { var i = C.ENDING_TIERS.indexOf(id); return i < 0 ? C.ENDING_TIERS.length : i; }   // 0 = best
  L.tierRank = tierRank;
  var TESTS = {
    bigIn: function (state, t) {
      var R = state.tour && state.tour.regions && state.tour.regions[t.region];
      return !!(R && R.broken && (R.big != null || num(R.fans) >= (t.share || 0.2) * num(state.fans)));
    },
    flag: function (state, t) {
      var v = state.flags && state.flags[t.flag];
      return t.values ? t.values.indexOf(v) >= 0 : !!v;
    },
    originals: function (state, t, raw) {
      var o = raw.originals;
      if (!o.start) return false;
      if (t.neverQuit) return o.everQuit === 0;
      return t.kept != null ? o.kept === t.kept : false;
    },
    rivalOriginals: function (state, t, raw) { return raw.rivalOriginals >= (t.min || 2); }
  };
  L.TESTS = TESTS;
  L.specialOk = function (state, sp, raw) {
    if (!sp || !sp.test || !TESTS[sp.test.kind]) return false;
    if (sp.band && sp.band.indexOf(state.bandId) < 0) return false;
    return !!TESTS[sp.test.kind](state, sp.test, raw || L.raw(state));
  };
  L.specials = function (state, raw) {
    raw = raw || L.raw(state);
    return (K().specials || []).filter(function (sp) { return C.SPECIAL_ENDINGS.indexOf(sp.id) >= 0 && L.specialOk(state, sp, raw); })
      .map(function (sp) { return sp.id; });
  };

  /* ---- Epilogues -------------------------------------------------------------------------------------------------- */
  function yearsIn(state, m) {
    if (!m.original) return 0;
    var end = m.status === 'active' ? state.totalWeek : (m.exit && isFinite(m.exit.since) ? m.exit.since : state.totalWeek);
    return Math.max(0, end - 1) / WPY;
  }
  // WHEN = { flag?, values?, notValues?, minTier?, special?, status?, inLineup?, minYearsIn?, seatRole? }: all given must hold.
  // notValues needs the flag set. seatRole matches member.seatRole || member.role (no v1.0 content uses it; v1.1 Seats).
  L.whenOk = function (state, m, w, ctx) {
    if (!w) return true;
    ctx = ctx || {};
    var f = state.flags || {};
    if (w.flag != null) {
      var v = f[w.flag];
      if (w.values && w.values.indexOf(v) < 0) return false;
      if (w.notValues && (!v || w.notValues.indexOf(v) >= 0)) return false;
      if (!w.values && !w.notValues && !v) return false;
    }
    if (w.minTier && tierRank(ctx.tier) > tierRank(w.minTier)) return false;
    if (w.special && (ctx.specials || []).indexOf(w.special) < 0) return false;
    if (w.status && [].concat(w.status).indexOf(m.status) < 0) return false;
    if (w.inLineup != null && (m.status === 'active') !== !!w.inLineup) return false;
    if (w.minYearsIn && yearsIn(state, m) < w.minYearsIn) return false;
    if (w.seatRole && [].concat(w.seatRole).indexOf(m.seatRole || m.role) < 0) return false;
    return true;
  };
  function shortName(m) { return String((m && m.name) || '').split(' ')[0] || 'Someone'; }
  function silentOf(state, m) { return !!(m.silent || (GG.career && GG.career.isSilent && GG.career.isSilent(state, m.id))); }
  function dramaEpilogue(id) { var d = GG.content.drama && GG.content.drama.members && GG.content.drama.members[id]; return d && d.epilogue || null; }
  function memberText(state, m, ctx) {
    var list = (K().epilogues || {})[m.id] || [];
    for (var i = 0; i < list.length; i++) if (list[i] && L.whenOk(state, m, list[i].when, ctx)) return list[i].text;
    return dramaEpilogue(m.id) || hashPick(state, 'ep|' + m.id, (K().recruits || {}).any) || '';
  }
  function recruitText(state, m) {
    var R = K().recruits || {}, rc = m.recruit || {};
    var pool = [].concat((R.byQuirk || {})[rc.quirk] || [], (R.byTrait || {})[rc.trait] || []);
    return hashPick(state, 'ep|' + m.id, pool.length ? pool : R.any) || '';
  }
  function defectorText(state, m) {
    var D = K().defectors || {}, rid = state.rival && state.rival.id;
    var pool = (D.byRival && D.byRival[rid]) || D.any;
    return hashPick(state, 'ep|' + m.id, pool) || 'Now plays for {rival}.';
  }
  function card(state, kind, m, text, name) {
    var e = { kind: kind, id: m ? m.id : 'player', name: name || (m ? m.name : 'You'), text: fill(state, text) };
    if (m && silentOf(state, m)) e.silent = true;
    return e;
  }
  L.epilogues = function (state, tier, specials) {
    var ctx = { tier: tier, specials: specials || [] }, out = [], members = state.members || [], def = state.rivalDefectors || [];
    members.forEach(function (m) {
      if (!m || m.status !== 'active') return;
      out.push(m.original ? card(state, 'member', m, memberText(state, m, ctx)) : card(state, 'recruit', m, recruitText(state, m)));
    });
    members.forEach(function (m) {
      if (m && m.original && m.status !== 'active' && def.indexOf(m.id) < 0) out.push(card(state, 'gone', m, memberText(state, m, ctx)));
    });
    members.forEach(function (m) {
      if (m && m.status !== 'active' && def.indexOf(m.id) >= 0) out.push(card(state, 'defector', m, defectorText(state, m)));
    });
    var P = K().player || {}, seat = state.seat || 'drums', byTier = P[seat] || P.drums || {};
    var pt = byTier[tier] || byTier.still_in_the_garage || '';
    var p = state.player || {};
    out.push(card(state, 'player', null, pt, p.nick || p.name || 'You'));
    return out;
  };

  /* ---- The whole thing ---------------------------------------------------------------------------------------- */
  L.compute = function (state) {
    if (!obj(state)) return null;
    var pr = L.parts(state), score = sum(pr.parts), tier = L.tier(score), specials = L.specials(state, pr.raw);
    var raw = pr.raw, rawOut = { fans: raw.fans, units: raw.units, loonies: raw.loonies, gongs: raw.gongs, certs: raw.certs, greyMug: raw.greyMug,
      venue: raw.venue, broken: raw.broken, chem: raw.chem, originals: raw.originals, rivalOriginals: raw.rivalOriginals, final: raw.final };
    return { v: 1, score: score, parts: pr.parts, raw: rawOut, tier: tier, specials: specials,
      epilogues: L.epilogues(state, tier, specials), years: L.finalYear(state), bonusYears: num(state.bonusYears),
      difficulty: state.careerDifficulty || 'normal', seat: state.seat || 'drums', week: num(state.totalWeek) };
  };
  L.finish = function (state) {
    if (!obj(state)) return null;
    L.ensure(state);
    if (obj(state.legacy) && isFinite(state.legacy.score)) return state.legacy;
    state.legacy = L.compute(state);
    GG.emit('legacy:done', { legacy: state.legacy });
    return state.legacy;
  };

  // Display text (tokens filled): the tier line (band layer, the lost-final variant, the zero-album variant), specials.
  L.text = function (state, lg) {
    lg = lg || (obj(state.legacy) && state.legacy.tier ? state.legacy : L.compute(state));
    var t = L.tierDef(lg.tier) || { id: lg.tier, name: lg.tier, line: '' }, band = (t.byBand && t.byBand[state.bandId]) || {};
    var lost = lg.raw ? lg.raw.final === 'rival' : !!(state.finalShowdown && state.finalShowdown.headliner === 'rival');
    var zero = !(state.albums || []).some(function (a) { return a && a.status === 'released'; });
    var line = (lost && (band.lineLostFinal || t.lineLostFinal)) || (zero && (band.lineZero || t.lineZero)) || band.line || t.line || '';
    var name = (zero && t.nameZero) || t.name;
    var specs = (lg.specials || []).map(function (id) {
      var sp = (K().specials || []).filter(function (x) { return x.id === id; })[0] || { id: id, name: id, line: '' };
      var size = (lg.raw && lg.raw.originals ? lg.raw.originals.start : 0) + 1;
      var strangers = (state.members || []).filter(function (m) { return m && m.status === 'active' && !m.original; }).length;
      var ln = sp.lineByCount ? (sp.lineByCount[Math.min(strangers, 4)] || sp.line) : sp.line;
      return { id: id, name: (sp.nameBySize && sp.nameBySize[size]) || sp.name, line: fill(state, ln || ''), unlock: sp.unlock || null };
    });
    var RV = K().rival || {}, rb = (RV.byRival && state.rival && RV.byRival[state.rival.id]) || {}, key = lg.raw && lg.raw.final ? lg.raw.final : 'none';
    var rl = hashPick(state, 'rival|' + key, rb[key] || RV[key]);
    return { tier: { id: t.id, name: name, line: fill(state, line), unlock: t.unlock || null }, specials: specs, rival: rl ? fill(state, rl) : '',
      years: lg.years || L.finalYear(state), bonusYears: num(lg.bonusYears) };
  };

  // HOF_ENTRY without at/ver (12_meta stamps them). Score / tier / specials come from state.legacy when it exists.
  L.hofEntry = function (state) {
    var s = state || {}, lg = obj(s.legacy) && isFinite(s.legacy.score) ? s.legacy : L.compute(s), st = s.stats || {};
    var band = bandOf(s), raw = lg.raw || L.raw(s), p = s.player || {};
    return { id: L.careerId(s), bandId: s.bandId, band: band ? band.name : (s.bandId || 'The band'), genre: s.genre, city: s.city,
      seat: s.seat || 'drums', player: { name: p.name || '', nick: p.nick || '' },
      logo: obj(s.logo) ? { emblem: s.logo.emblem, style: s.logo.style, palette: s.logo.palette } : null,
      difficulty: s.careerDifficulty || 'normal', years: L.finalYear(s), bonusYears: num(s.bonusYears),
      score: num(lg.score), parts: lg.parts || {}, tier: lg.tier || L.tier(num(lg.score)), specials: (lg.specials || []).slice(),
      lineup: (s.members || []).map(function (m) { return { id: m.id, name: m.name, original: !!m.original, status: m.status }; }),
      rival: { id: (s.rival && s.rival.id) || null, name: GG.rival && GG.rival.name && s.bandId ? GG.rival.name(s) : ((s.rival && s.rival.name) || null) },
      final: s.finalShowdown ? (s.finalShowdown.headliner === 'you' ? 'you' : 'rival') : null,
      stats: { fans: num(s.fans), units: num(st.units), loonies: num(st.loonieWins), gongs: num(raw.gongs), certs: num(raw.certs),
        gigs: num(st.gigs), songs: num(st.songsWritten), albums: (s.albums || []).filter(function (a) { return a && a.status === 'released'; }).length,
        loans: num(st.parentsLoans), venue: raw.venue ? { name: raw.venue.name, cap: raw.venue.cap } : null, broken: (raw.broken || []).length },
      ach: Object.keys((s.ach && s.ach.got) || {}),
      strip: (s.recaps || []).map(function (r) {
        return { y: r.y, h: r.headline || '', fans: num(r.fans), era: r.era || null, best: r.best ? r.best.name || null : null, aw: (r.awards || []).length };
      }) };
  };

  GG.on('career:loaded', function (p) { if (p && obj(p.state) && num(p.state.bonusYears) > 0) L.deck(); });

  GG.registerDebug('legacy', function () {
    var s = GG.state;
    if (!obj(s)) return { state: null, noBonus: L.noBonus };
    var pr = L.parts(s), sc = sum(pr.parts);
    return { noBonus: L.noBonus, bonusYears: s.bonusYears, maxWeeks: s.maxWeeks, finalYear: L.finalYear(s), worldWeek: L.worldWeek(s),
      bonusFor: L.bonusFor(s), score: sc, parts: pr.parts, tier: L.tier(sc), specials: L.specials(s, pr.raw),
      bigHead: s.legacyTrack ? s.legacyTrack.bigHead : null, stored: !!(s.legacy && isFinite(s.legacy.score)) };
  });
})(window.GG);
