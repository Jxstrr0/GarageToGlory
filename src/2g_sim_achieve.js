// 2g_sim_achieve.js (v1.0 "Glory", Addendum 2 D4; plan_contract_1.0 §4.6): per-career achievements. DOM-free, never the
// career RNG, no wall clock. Content: GG.content.achievements (content/achievements.js).
// State (02_contracts V1.0 GLORY; stage 0's migrate / newCareer give { got: {}, t: {} }; the counters fill in lazily here):
//   state.ach = { got: { <achId>: totalWeek }, t: { bans: { <year>: n }, botb: { <year>: n }, botbLast, km, winter: { y, away,
//                 bd } | null, streak: { y, n } | null } }
//   Counters count from the v1.0 migration (old saves start at 0). State-derived kinds are re-checked on 'career:loaded'
//   (retroactive for in-progress careers); counter and gig-moment kinds are not.
// API (GG.achieve):
//   ensure(state) ; migrate(state) (= ensure; never chained onto GG.save.migrate: stage 0 owns the defaults) ;
//   gig(state, r, g) (career.settleGig: counters, then the 'gig' rows with the result) ; weekly(state, wrap) (career.endWeek
//   after the year-end block: winter / Loonies streak, then 'week' rows and on a year end the 'year' rows) ; finish(state)
//   (career's last wrap, after GG.legacy.finish: every non-meta row) ; check(state, when, ctx?) -> [newIds] ;
//   list(state) -> [VIEW] (every row, gates applied: { id, name, blurb, icon, when, band, seat, got, open }) ; view(state|bandId,
//   id) -> VIEW ; def(id) ; defs() ; name(def, bandId) (nameBySize by the band's size) ; gated(def, state) ; earned(state) ->
//   [ids] ; metaIds(careers) -> the 'meta' rows a META.careers block meets (12_meta awards them in recordCareer) ; KINDS ;
//   debug ('achieve' -> { got, counters }).
// Events: 'ach:earned' { ids } (first time this career). 12_meta turns it into meta:ach (dates, the toast) in the browser.
// Gates: band (state.bandId) and seat (state.seat || 'drums'); a row of another band or seat never evaluates.
(function (GG) {
  var CT = GG.contracts;
  var A = GG.achieve = GG.achieve || {};

  function obj(o) { return o && typeof o === 'object' && !Array.isArray(o) ? o : null; }
  function num(v) { return isFinite(v) ? +v : 0; }
  A.defs = function () { var c = GG.content.achievements; return Array.isArray(c) ? c : []; };
  A.def = function (id) { var d = A.defs(); for (var i = 0; i < d.length; i++) if (d[i].id === id) return d[i]; return null; };
  function seatOf(state) { return (state && state.seat) || 'drums'; }
  A.gated = function (a, state) {
    if (!a || !state) return false;
    if (a.band && a.band.indexOf(state.bandId) < 0) return false;
    if (a.seat && a.seat.indexOf(seatOf(state)) < 0) return false;
    return true;
  };
  function bandSize(bandId) { var b = (GG.content.bands || {})[bandId]; return b ? b.size || ((b.members || []).length + 1) : 0; }
  A.name = function (a, bandId) { if (!a) return ''; var n = a.nameBySize && a.nameBySize[bandSize(bandId)]; return n || a.name; };

  A.ensure = function (state) {
    if (!obj(state)) return null;
    var h = obj(state.ach) || (state.ach = { got: {}, t: {} });
    if (!obj(h.got)) h.got = {};
    var t = obj(h.t) || (h.t = {});
    if (!obj(t.bans)) t.bans = {};
    if (!obj(t.botb)) t.botb = {};
    t.km = num(t.km);
    if (t.winter !== null && !obj(t.winter)) t.winter = null;
    if (t.streak !== null && !obj(t.streak)) t.streak = null;
    return h;
  };
  A.migrate = function (state) { A.ensure(state); return state; };

  /* ---- Test kinds ------------------------------------------------------------------------------------------------------- */
  // Each kind: fn(state, test, ctx) -> bool. info: s = state-derived (re-checked on load), c = a counter, x = needs the gig ctx.
  function songsOn(state, ids) { var m = {}; (state.songs || []).forEach(function (s) { m[s.id] = s; }); return (ids || []).map(function (id) { return m[id]; }).filter(Boolean); }
  function released(state) { return (state.albums || []).filter(function (a) { return a && (a.status === 'released' || (a.status == null && a.released != null && a.released <= state.totalWeek)); }); }
  function french(song) { return !!(song && (song.fr || (GG.songs && GG.songs.isFrench && GG.songs.isFrench(song.title)))); }
  // { start, kept, everQuit } over the originals: Lane E's state.legacy.raw.originals when the career has been finished, else
  // the same rule here (a quit-and-return counts as lost: status away/quit now, or returns > 0).
  A.originals = function (state) {
    var L = obj(state.legacy), raw = L && obj(L.raw), o = raw && obj(raw.originals);
    if (o && isFinite(o.start)) return { start: num(o.start), kept: num(o.kept), everQuit: num(o.everQuit) };
    var orig = (state.members || []).filter(function (m) { return m && m.original; });
    return { start: orig.length, kept: orig.filter(function (m) { return m.status === 'active'; }).length,
      everQuit: orig.filter(function (m) { return m.status !== 'active' || num(m.returns) > 0; }).length };
  };
  function kickShare(song) {
    var p = song && song.pattern, kick = 0, all = 0;
    if (!p || !p.sections || !Array.isArray(p.arrangement)) return 0;
    p.arrangement.forEach(function (name) {
      var sec = p.sections[name];
      if (!Array.isArray(sec)) return;
      sec.forEach(function (lane, l) { var n = (String(lane).match(/x/g) || []).length; all += n; if (l === 0) kick += n; });
    });
    return all ? kick / all : 0;
  }
  A.kickShare = kickShare;
  function reviewScore(r) {   // on the outlet's own scale (the UI's rule: a 0..100 score on a small scale is converted)
    var sc = num(r.scale) || 10, v = r.score != null ? num(r.score) : num(r.score100) / 100 * sc;
    return sc < 100 && v > sc ? v / 100 * sc : v;
  }
  var KIND = {
    milestone: { s: 1, fn: function (s, t) { return !!(s.milestones && s.milestones[t.id]) || (t.id === 'firstGig' && num(s.stats && s.stats.gigs) >= 1); } },
    bannedInYear: { c: 1, fn: function (s, t) { return num(s.ach.t.bans[s.year]) >= (t.min || 1); } },
    releasedFr: { s: 1, fn: function (s) { return released(s).some(function (a) { return songsOn(s, a.tracks).some(french); }); } },
    originals: { s: 1, fn: function (s, t) {
      var o = A.originals(s);
      if (!o.start) return false;
      if (t.neverQuit) return o.everQuit === 0 && o.kept === o.start;
      return t.kept != null ? o.kept === t.kept : false;
    } },
    award: { s: 1, fn: function (s, t) { return (s.awards || []).some(function (a) { return a && a.category === t.id && (t.won === false ? !a.won : !!a.won); }); } },
    winterNoBreakdown: { c: 1, fn: function (s, t) { var w = s.ach.t.winter; return !!(w && w.closed && w.away >= (t.away || 3) && !w.bd); } },
    rivalLoonieStreak: { c: 1, fn: function (s, t) { var k = s.ach.t.streak; return !!(k && k.n >= (t.n || 3)); } },
    special: { s: 1, fn: function (s, t) { var L = obj(s.legacy); return !!(L && Array.isArray(L.specials) && L.specials.indexOf(t.id) >= 0); } },
    venuePlayed: { s: 1, fn: function (s, t, x) {
      return !!((x.r && x.r.venueId === t.id) || (s.venuePlays && num(s.venuePlays[t.id]) > 0) || (s.venueLast && s.venueLast[t.id] != null));
    } },
    songKickShare: { s: 1, fn: function (s, t) {
      if (t.genre && s.genre !== t.genre) return false;
      return (s.songs || []).some(function (x) { return x && !x.auto && kickShare(x) >= (t.min || 0.5); });
    } },
    flag: { s: 1, fn: function (s, t) { var v = s.flags && s.flags[t.flag]; return t.values ? t.values.indexOf(v) >= 0 : !!v; } },
    stat: { s: 1, fn: function (s, t) { return num(s.stats && s.stats[t.stat]) >= num(t.min); } },
    final: { s: 1, fn: function (s, t) { return !!(s.finalShowdown && s.finalShowdown.headliner === (t.headliner || 'you')); } },
    bonus: { s: 1, fn: function (s, t) { return num(s.bonusYears) >= (t.min || 1); } },
    tier: { s: 1, fn: function (s, t) { var L = obj(s.legacy); return !!(L && L.tier === t.id); } },
    botbInYear: { c: 1, fn: function (s, t) { return num(s.ach.t.botb[s.year]) >= (t.min || 3); } },
    licensedBrand: { s: 1, fn: function (s, t) { return !!(s.licensing && (s.licensing.deals || []).some(function (d) { return d && d.brandId === t.id; })); } },
    crack: { s: 1, fn: function (s, t) { return !!(s.rival && s.rival.cracked === t.id); } },
    returned: { s: 1, fn: function (s) { return (s.members || []).some(function (m) { return m && m.original && m.status === 'active' && num(m.returns) > 0; }); } },
    reviewBelow: { s: 1, fn: function (s, t) {
      return released(s).some(function (a) {
        return !!a.cert && (a.reviews || []).some(function (r) { return r && r.outlet === t.outlet && reviewScore(r) <= num(t.max); });
      });
    } },
    studio: { s: 1, fn: function (s, t) { return released(s).some(function (a) { return a.studioId === t.id; }); } },
    km: { c: 1, fn: function (s, t) { return num(s.ach.t.km) >= num(t.min); } },
    weatherGig: { x: 1, fn: function (s, t, x) {
      var r = x.r; if (!r) return false;
      return (r.temp != null && isFinite(r.temp) && r.temp <= num(t.maxTemp)) || ((t.or || []).indexOf(r.weather) >= 0);
    } },
    difficulty: { s: 1, fn: function (s, t) { return (s.careerDifficulty || 'normal') === t.id; } },
    gongWon: { s: 1, fn: function (s) { return !!(s.tour && (s.tour.gongs || []).some(function (g) { return g && g.won; })); } },
    // 'meta' kinds read META.careers (x.careers), evaluated by 12_meta's recordCareer
    allBands: { m: 1, fn: function (s, t, x) {
      var by = (x.careers && x.careers.byBand) || {}, B = GG.content.bands || {};
      var ids = Object.keys(B).filter(function (id) { return B[id] && !B[id].locked; });
      return ids.length > 0 && ids.every(function (id) { return num(by[id]) > 0; });
    } },
    careers: { m: 1, fn: function (s, t, x) { return num(x.careers && x.careers.finished) >= (t.min || 3); } },
    // v1.1 "Seats" (handoff E12; plan_contract_1.1 §1.1 #12): Low End / The Engine Room = { kind: 'seatCareer', seat } (a
    // finished career on that seat; when 'end'); Solo Too Long = { kind: 'soloTooLong', min?: 0.5 } (a live song on the lead
    // seat whose spotlight ran longer than the rest of it: SONG_RESULT.solo / .dur; when 'gig'); Musical Chairs = { kind:
    // 'allSeats' } (META.careers.bySeat has every C.SEATS seat; when 'meta').
    seatCareer: { s: 1, fn: function (s, t) { return seatOf(s) === (t.seat || seatOf(s)) && !!(s.ended || obj(s.legacy)); } },
    soloTooLong: { x: 1, fn: function (s, t, x) {
      var res = (x.r && x.r.songResults) || [];
      return seatOf(s) === 'lead' && res.some(function (r) { return r && num(r.dur) > 0 && num(r.solo) / num(r.dur) > (t.min != null ? num(t.min) : 0.5); });
    } },
    allSeats: { m: 1, fn: function (s, t, x) {
      var by = (x.careers && x.careers.bySeat) || {};
      return (CT.SEATS || ['drums', 'bass', 'rhythm', 'lead']).every(function (k) { return num(by[k]) > 0; });
    } }
  };
  // v1.1: the seat kinds join KINDS once the contracts list them (the lead folds them into C.ACH_KINDS at integration, like
  // C.SEAT_GATE_KEYS); they evaluate either way (A.test). SEAT_KINDS lists them for content tests until then.
  A.SEAT_KINDS = ['seatCareer', 'soloTooLong', 'allSeats'];
  A.KINDS = Object.keys(KIND).filter(function (k) { return A.SEAT_KINDS.indexOf(k) < 0 || !CT.ACH_KINDS || CT.ACH_KINDS.indexOf(k) >= 0; });
  A.kindInfo = function (k) { var i = KIND[k]; return i ? { state: !!i.s, counter: !!i.c, ctx: !!i.x, meta: !!i.m } : null; };
  A.test = function (state, test, ctx) {
    var k = test && KIND[test.kind];
    if (!k) return false;
    try { return !!k.fn(state, test, ctx || {}); } catch (e) { return false; }
  };

  // Which rows a check time looks at.
  function looks(a, when, state) {
    var k = KIND[a.test && a.test.kind];
    if (!k || a.when === 'meta' || k.m) return false;
    if (when === 'end') return true;
    if (when === 'load') return !!k.s && (a.when !== 'end' || !!state.ended);
    return a.when === when;
  }
  A.check = function (state, when, ctx) {
    if (!obj(state) || !state.bandId) return [];
    A.ensure(state);
    var got = state.ach.got, out = [];
    A.defs().forEach(function (a) {
      if (!a || !a.id || got[a.id] != null || !A.gated(a, state) || !looks(a, when, state)) return;
      if (A.test(state, a.test, ctx)) { got[a.id] = num(state.totalWeek); out.push(a.id); }
    });
    if (out.length) GG.emit('ach:earned', { ids: out });
    return out;
  };

  /* ---- Hooks (career) ------------------------------------------------------------------------------------------------- */
  function winterNow(state) {
    if (GG.calendar && GG.calendar.season) return GG.calendar.season(state.week) === 'winter';
    var W = (CT.SEASONS || {}).winter || [11, 16];
    return state.week >= W[0] && state.week <= W[1];
  }
  A.gig = function (state, r, g) {
    if (!obj(state) || !obj(r)) return [];
    var h = A.ensure(state), t = h.t, y = state.year;
    if (r.banned) t.bans[y] = num(t.bans[y]) + 1;
    t.km = num(t.km) + Math.max(0, num(r.km));
    var sd = r.showdown || null;
    if (!sd) (state.showdowns || []).forEach(function (x) { if (x && x.kind === 'botb' && x.week === state.totalWeek) sd = x; });
    if (sd && sd.kind === 'botb' && sd.won && t.botbLast !== sd.week) { t.botb[y] = num(t.botb[y]) + 1; t.botbLast = sd.week; }
    if (!state.protected && winterNow(state)) {
      if (!t.winter || t.winter.y !== y) t.winter = { y: y, away: 0, bd: 0, closed: false };
      if (num(r.km) > 0) t.winter.away++;
      if (r.travel && r.travel.breakdown) t.winter.bd++;
    }
    return A.check(state, 'gig', { r: r, g: g || null });
  };
  A.weekly = function (state, wrap) {
    if (!obj(state)) return [];
    var h = A.ensure(state), t = h.t, wk = wrap && wrap.week != null ? wrap.week : state.week, y = wrap && wrap.year != null ? wrap.year : state.year;
    var W = (CT.SEASONS || {}).winter || [11, 16];
    if (t.winter && t.winter.y === y && !t.winter.closed && wk >= W[1]) t.winter.closed = true;   // the winter is over: judge it
    var lo = state.loonies;
    if (lo && lo.done && lo.year === y && (!t.streak || t.streak.y !== y)) {   // once per year, after the envelopes
      var won = (lo.results || []).some(function (x) { return x && x.rivalWon; });
      var prev = t.streak && t.streak.y === y - 1 ? t.streak.n : 0;
      t.streak = { y: y, n: won ? prev + 1 : 0, best: Math.max(t.streak ? num(t.streak.best) : 0, won ? prev + 1 : 0) };
    }
    var out = A.check(state, 'week');
    if (wrap && wrap.yearEnd) out = out.concat(A.check(state, 'year'));
    return out;
  };
  A.finish = function (state) { return A.check(state, 'end'); };

  // The 'meta' rows a META.careers block meets (12_meta's recordCareer awards them; band / seat gates from the state).
  A.metaIds = function (careers, state) {
    return A.defs().filter(function (a) {
      var k = a && KIND[a.test && a.test.kind];
      return k && k.m && a.when === 'meta' && (!state || A.gated(a, state)) && A.test(state || {}, a.test, { careers: careers });
    }).map(function (a) { return a.id; });
  };

  /* ---- Views ------------------------------------------------------------------------------------------------------------ */
  function viewOf(a, state, bandId) {
    var got = state && state.ach && state.ach.got ? state.ach.got[a.id] : null;
    return { id: a.id, name: A.name(a, bandId), blurb: a.blurb || '', icon: a.icon || '🏆', when: a.when, band: a.band ? a.band.slice() : null,
      seat: a.seat ? a.seat.slice() : null, got: got != null ? got : null, open: state ? A.gated(a, state) : !a.band };
  }
  A.view = function (x, id) {
    var a = A.def(id); if (!a) return null;
    var state = obj(x), bandId = state ? state.bandId : x;
    return viewOf(a, state, bandId);
  };
  A.list = function (state) { return A.defs().map(function (a) { return viewOf(a, state, state && state.bandId); }); };
  A.earned = function (state) { return Object.keys((state && state.ach && state.ach.got) || {}); };

  GG.on('career:loaded', function (p) { if (p && obj(p.state)) A.check(p.state, 'load'); });

  GG.registerDebug('achieve', function () {
    var st = GG.state, h = st && st.ach;
    return { got: h && h.got ? Object.assign({}, h.got) : {}, counters: h && h.t ? JSON.parse(JSON.stringify(h.t)) : {}, defs: A.defs().length, kinds: A.KINDS.length };
  });
})(window.GG);
