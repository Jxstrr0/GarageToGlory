// 25_sim_tour.js: the World stage (v0.7 "World", WORLDSIM). Four regions abroad (content/world.js; no USA, ever) unlock
// in the World era at a genre-shifted fan threshold OR through an invite (a festival slot / a showcase), whichever comes
// first. Preset tour packages with a few choices (rental vehicle, where you sleep, one extra) are bought from the fund
// (flights + rental + extra up front, hotels weekly) and depart next Monday: one stop a week, a weekend show per stop
// (festival slots, halls, open dates booked from the regional board). On tour the planner shrinks to rest / promote
// locally / hotel-room rehearsal; homesickness builds (members call home in the group chat; it forces rests and can end a
// tour early), region Monday cards replace the home deck, road cards come from the region. Region fans are part of the
// ONE fan count (state.fans) and grow toward each region's own scene. "Big in one place" (a song blows up in one region,
// a storyline card), the rival breaking regions first, the Japanese fan-club president, the Moose Opera payoff (Helsinki,
// platinum in Finland -> flags.mooseOpera), the Global Gong (week 22, World era only). Pure sim: no DOM or audio; every
// roll is seeded (career seed + tag + week) so the career RNG never moves, except resolving cards/trips (career RNG, as usual).
// API (GG.tour):
//   content() · cfg() · regions() [def] · region(id) · cityDef(idOrName) · cities(region) · venue(id) · venues(region)
//   vehicles(region) · stays() · extras() · climate(region) · fit(genre, region) · pkg(id)
//   init(s) · ensure(s) · migrate(s) (v7 -> v8) · threshold(s, region) · unlocked(s, region) · unlock(s, region, via)
//   map(s) -> [REGION_VIEW] (world map) · regionView(s, region) -> { region, cities, packages, season, holiday, ... }
//   packages(s, region) -> [{ ...pkg, ok, why, quote }] · quote(s, pkgId, choices) -> QUOTE · canBook(s, pkgId, choices)
//   book(s, pkgId, choices) -> TOUR | { error } · cancel(s) (before departure; rental + extra refunded) · status(s)
//   active(s) · away(s) · here(s) -> cityId|null · stop(s) -> STOP|null · regionOf(s) ('canada' at home) · abroadFans(s)
//   monday(s) (career.startWeek, before the calendar) · forcedCard(s) (career.startWeek) · afterCard(s, card, i, success, d)
//   blockId(s, id, i) · allowedBlocks(s) · block(s, id, A, f, rng, d, lines, ACT) (career runActivity) · beforeGig(s) (runWeek)
//   listings(s, rng) (world.listings abroad) · makeGig(s, venueId, opts) · estimate(s, gigOrListing) · draw(s, g) (gig crowd)
//   silentCrowd(g) (Japan: the meter holds until the song ends) · shape(s, g, r, rng) (world.shape) · afterGig(s, g, r, rng, d)
//   (world.afterGig: region fans, travel, the moose) · travel(s, g, rng, d) · startTrip(s, gig) (world.startTrip abroad)
//   roadCardOk(s, card) · weekly(s, rng, wrap) (career.endWeek; wrap.tour) · rivalWeekly(s, news) (rival.weekly)
//   gong(s) view · runGong(s) (idempotent per year; auto at the wrap of GONG week) · charts(s) · summary(s) · fillText(s, t)
//   botWeek(s, style) = botTour · botPlan(s, style) · cards() · card(id)
// TOUR = { id, region, packageId, name, choices: { vehicle, stay, extra }, booked, start, stops: [STOP], cost: { flights,
//          rental, extra, hotels }, paid, invite, status: 'booked'|'on'|'done', index, endAfter, results: [{ week, city,
//          venueId, name, grade, fans, pay, festival }], fans, pay }
// STOP = { city, cityName, venue|null (open date), venueName, festival, hall, km (leg from the last stop), week (totalWeek) }
// state.tour = { regions: { <id>: { unlocked, via: 'fans'|'invite'|'big'|null, fans, gigs, tours, broken, big: null|{ songId,
//   title, week, choice }, rivalFirst, best } }, invites: [INVITE], active: TOUR|null, history: [SUMMARY], homesick 0..100,
//   gongs: [GONG], president: week|null, moose: null|{ week }, queue: [{ card, region, invite?, song? }], ctx, lastCard, rival: { <region>: week }, w }
// INVITE = { id, region, kind: 'festival'|'showcase', festival, week, expires, status: 'open'|'accepted'|'declined'|'used' }
// Events: 'tour:unlocked' { region, via } · 'tour:invite' { invite } · 'tour:booked' { tour } · 'tour:depart' { tour } ·
//   'tour:week' { tour, stop, index } · 'tour:home' { summary } · 'tour:broken' { region } · 'tour:big' { region, song } ·
//   'tour:rival' { region } · 'tour:president' {} · 'tour:moose' {} · 'tour:gong' { result } · 'tour:homesick' { value }
// v0.9: needsMet(s, pkg) (package.needs: 'moose' | flag | { flag, is?, band? }) ; payoffDone(s) ; package.payoff { city?, flag?,
//   value?, trophy?, line?, chat?, card?, fans?, buzz? } fires once at its gig (t.payoffs[pkgId]) and counts for the Gong like
//   the Moose Opera (owner Q3) ; pickText(s, rng, path, fallback) (world content pools + byBand) ; story cards through
//   '<id>_<bandId>' variants (wt_homesick: speaker 'recruit' = the grumpiest talker) ; callHome never uses a silent member.
(function (GG) {
  var C = GG.contracts, U = GG.util;
  var T = GG.tour = GG.tour || {};
  var WPY = C.WEEKS_PER_YEAR;
  var REGION_IDS = C.REGIONS.filter(function (r) { return r !== 'canada'; });
  var BLOCKS = ['rest', 'promote', 'rehearse'];
  var GRADE_ORDER = C.GRADES;

  var DEFAULTS = {
    thresholdFit: 1.6, rivalFirst: 1.08, party: 0,
    jetLag: { uk_europe: 3, japan: 5, australia: 6, russia: 4 },
    invite: { chance: 0.03, fromWeeks: 4, weeks: 10, flights: 0.5, fitMin: 0.6 },
    homesick: { perWeek: 15, lowMood: 2, rest: -6, home: -12, moodAt: 45, mood: -2, restAt: 70, cardAt: 75, burnoutAt: 80, burnout: 3, max: 100 },
    crowd: { fanDraw: 0.4, buzzDraw: 6, walkIns: { 2: 150, 3: 400, 4: 500 }, festivalSlot: 0.07, hallDraw: 0.3, publicist: 0.35 },
    fans: { mult: 1.2, festival: 0.6 }, payMult: 1.3, showcase: { flights: 0.5, regionFans: 300 },
    promote: { regionFans: [40, 110], buzz: 1 },
    rehearse: { skill: 0.5 },
    blocks: { write: 'rehearse', hustle: 'rest', book: 'promote' },
    travel: { burnoutPer100: 0.35, burnoutMax: 18, breakdownCost: [200, 600] },
    big: { chance: 0.025, minGigs: 1, minRegionFans: 800, unlockFans: 0.5 },
    rival: { fans: 15000, chance: 0.05, order: ['uk_europe', 'japan', 'russia', 'australia'] },
    gong: { base: 29, perBroken: 10, fansPer: 1000, fansMax: 24, perFestival: 6, perBig: 5, moose: 6, nominateBroken: 1, prize: 5000, fans: 0.03, fansMax: 3000, buzz: 12, noise: 8 },
    moose: { fans: 3000, buzz: 12 },
    payoffFlags: { mooseOpera: 'platinum', squatAnthemPayoff: true, mudstonbury: 'headlined', mudHeadlinePayoff: true, outbackPayoff: true },   // v0.9: Gong payoff
    cardGap: 3, cardChance: 0.75,
    bot: { goodCushion: 2500, avgCushion: 3500, gap: 10, avgChance: 0.35, restHomesick: 55 }
  };
  function cfg() {
    var o = GG.content.economy && GG.content.economy.tour, out = {};
    for (var k in DEFAULTS) {
      var d = DEFAULTS[k], v = o ? o[k] : undefined;
      out[k] = v === undefined ? d : (d && typeof d === 'object' && !Array.isArray(d)) ? Object.assign({}, d, v) : v;
    }
    return out;
  }
  T.cfg = cfg;
  var EMPTY = { regions: {}, fit: {}, cities: {}, venues: [], packages: [], vehicles: {}, stays: {}, extras: {}, climates: {}, holidays: [],
    invites: {}, callHome: {}, lines: {}, gong: { nominees: [], week: 22 }, cards: [] };
  function K() { return GG.content.world || EMPTY; }
  T.content = K;
  function econ() { return GG.content.economy || {}; }
  function seeded(s, tag, w) { return GG.RNG(GG.hashSeed((s.seed >>> 0) + '|tour|' + tag + '|' + (w != null ? w : s.totalWeek))); }
  function rngRound(x, rng) { var f = Math.floor(x); return f + (rng.chance(x - f) ? 1 : 0); }
  function money(n) { return U.fmtMoney(n); }
  function woy(w) { return ((w - 1) % WPY + WPY) % WPY + 1; }
  function bandName(s) { var b = GG.career && GG.career.band(s); return (b && b.name) || 'The band'; }
  function fx(s, e, d) { return GG.career.applyEffects(s, e, d || {}); }
  function chat(s, who, text, d, tone) { if (GG.career && GG.career.postChat && text) return GG.career.postChat(s, who, text, d, tone); return null; }
  function activeMembers(s) { return (s.members || []).filter(function (m) { return m.status === 'active'; }); }
  function fill(s, text, vars) {
    var out = String(text || '').replace(/\{(\w+)\}/g, function (all, k) { return vars && vars[k] != null ? vars[k] : all; });
    return GG.career ? GG.career.fillText(s, out) : out;
  }

  /* ---- Lookups ------------------------------------------------------------------------------------------------------ */
  T.regions = function () { return REGION_IDS.map(function (id) { return K().regions[id]; }).filter(Boolean); };
  T.region = function (id) { return K().regions[id] || null; };
  T.cityDef = function (x) {
    if (!x) return null;
    var cs = K().cities;
    if (cs[x]) return cs[x];
    for (var id in cs) if (cs[id].name === x) return cs[id];
    return null;
  };
  T.cities = function (region) { var cs = K().cities; return Object.keys(cs).map(function (k) { return cs[k]; }).filter(function (c) { return !region || c.region === region; }); };
  T.venue = function (id) { var l = K().venues; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; };
  T.venues = function (region) { return K().venues.filter(function (v) { return !region || v.region === region; }); };
  T.vehicles = function (region) { var V = K().vehicles; return Object.keys(V).map(function (k) { return V[k]; }).filter(function (v) { return !region || v.region === region; }); };
  T.stays = function () { var S = K().stays; return Object.keys(S).map(function (k) { return S[k]; }); };
  T.extras = function () { var S = K().extras; return Object.keys(S).map(function (k) { return S[k]; }); };
  T.climate = function (region) { return K().climates[region] || null; };
  T.pkg = function (id) { var l = K().packages; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; };
  T.fit = function (genre, region) { var f = (K().fit[genre] || {})[region]; return f != null ? f : 0.7; };
  T.cards = function () { return K().cards || []; };
  T.card = function (id) { return T.cards().filter(function (c) { return c.id === id; })[0] || null; };
  function fitLabel(f) { return f >= 0.95 ? 'Huge here' : f >= 0.85 ? 'Strong' : f >= 0.75 ? 'Solid' : f >= 0.65 ? 'Decent' : 'Cult following'; }
  function legKm(a, b) {
    var A = T.cityDef(a), B = T.cityDef(b);
    if (!A || !B) return 0;
    var R = T.region(A.region) || { kmScale: 30 }, dx = A.x - B.x, dy = A.y - B.y;
    return Math.round(Math.sqrt(dx * dx + dy * dy) * R.kmScale / 10) * 10;
  }
  T.legKm = legKm;

  /* ---- State --------------------------------------------------------------------------------------------------------- */
  T.ensure = function (s) {
    if (!s || typeof s !== 'object') return null;
    var t = s.tour;
    if (!t || typeof t !== 'object' || Array.isArray(t)) t = s.tour = {};
    if (!t.regions || typeof t.regions !== 'object' || Array.isArray(t.regions)) t.regions = {};
    REGION_IDS.forEach(function (id) {
      var r = t.regions[id];
      if (!r || typeof r !== 'object' || Array.isArray(r)) r = t.regions[id] = {};
      ['unlocked', 'via', 'broken', 'big', 'rivalFirst', 'best'].forEach(function (k) { if (r[k] === undefined) r[k] = null; });
      ['fans', 'gigs', 'tours'].forEach(function (k) { if (!isFinite(r[k]) || r[k] < 0) r[k] = 0; });
    });
    ['invites', 'history', 'gongs', 'queue'].forEach(function (k) { if (!Array.isArray(t[k])) t[k] = []; });
    if (t.active && (typeof t.active !== 'object' || !Array.isArray(t.active.stops) || !t.active.stops.length)) t.active = null;
    if (t.active === undefined) t.active = null;
    if (!isFinite(t.homesick)) t.homesick = 0;
    t.homesick = U.clamp(t.homesick, 0, 100);
    if (t.president === undefined) t.president = null;
    if (t.moose === undefined) t.moose = null;
    if (!t.payoffs || typeof t.payoffs !== 'object' || Array.isArray(t.payoffs)) t.payoffs = {};   // v0.9: { <packageId>: { week, flag } }
    if (t.lastCard === undefined) t.lastCard = null;
    if (!t.rival || typeof t.rival !== 'object' || Array.isArray(t.rival)) t.rival = {};
    if (t.ctx === undefined) t.ctx = null;
    return t;
  };
  T.init = function (s) { T.ensure(s); return s; };
  function rs(s, region) { return T.ensure(s).regions[region] || null; }
  T.abroadFans = function (s) {
    var t = s && s.tour; if (!t || !t.regions) return 0;
    return REGION_IDS.reduce(function (a, id) { return a + ((t.regions[id] && t.regions[id].fans) || 0); }, 0);
  };
  function addRegionFans(s, region, n, d) {
    var r = rs(s, region); if (!r || !n) return 0;
    var before = s.fans;
    fx(s, { fans: Math.round(n) }, d);
    var got = s.fans - before;
    r.fans = Math.max(0, r.fans + got);
    if (d) { d.regionFans = d.regionFans || {}; d.regionFans[region] = (d.regionFans[region] || 0) + got; }
    return got;
  }
  T.addRegionFans = addRegionFans;

  /* ---- Where are we? ---------------------------------------------------------------------------------------------- */
  T.active = function (s) { var t = s && s.tour; return t && t.active && t.active.status !== 'done' ? t.active : null; };
  function idxOf(s, a) { return a ? s.totalWeek - a.start : -1; }
  T.stop = function (s) {
    var a = T.active(s);
    if (!a || a.status !== 'on') return null;
    var i = idxOf(s, a);
    return i >= 0 && i < a.stops.length ? a.stops[i] : null;
  };
  T.here = function (s) { var st = T.stop(s); return st ? st.city : null; };
  T.away = function (s) { return !!T.stop(s); };
  T.regionOf = function (s) { var a = T.away(s) ? T.active(s) : null; return a ? a.region : (s && s.region) || 'canada'; };

  /* ---- Unlocks, thresholds, invites -------------------------------------------------------------------------------- */
  T.threshold = function (s, region) {
    var R = T.region(region); if (!R) return Infinity;
    var Q = cfg(), r = rs(s, region), x = R.fans * Math.max(0.3, Q.thresholdFit - T.fit(s.genre, region));
    if (r && r.rivalFirst) x *= Q.rivalFirst;
    return Math.round(x / 100) * 100;
  };
  T.unlocked = function (s, region) { var r = s && s.tour && s.tour.regions && s.tour.regions[region]; return !!(r && r.unlocked); };
  T.unlock = function (s, region, via, out) {
    var r = rs(s, region);
    if (!r || r.unlocked) return false;
    r.unlocked = s.totalWeek; r.via = via || 'fans';
    var R = T.region(region), text = R.name + ' is open: ' + (via === 'invite' ? 'an invite got you in.' : via === 'big' ? 'a song blew up there first.' : U.fmtNum(s.fans) + ' fans and counting. Tour packages are on the laptop.');
    chat(s, 'dj', text, null, 'news');
    if (out) out.unlocked.push(region);
    GG.emit('tour:unlocked', { region: region, via: r.via });
    return true;
  };
  function openInvite(s, region) {
    var t = T.ensure(s);
    return t.invites.filter(function (i) { return i.region === region && (i.status === 'open' || i.status === 'accepted') && i.expires >= s.totalWeek; })[0] || null;
  }
  T.invite = openInvite;
  function festivalName(region) {
    var f = K().venues.filter(function (v) { return v.region === region && v.festival; })[0];
    return f ? f.name : null;
  }
  function rollInvites(s, R, out) {
    var Q = cfg().invite, t = T.ensure(s), since = (s.eraHistory || []).filter(function (e) { return e.era === 'world'; })[0];
    if (!since || s.totalWeek - since.week < Q.fromWeeks) return;
    for (var i = 0; i < REGION_IDS.length; i++) {
      var id = REGION_IDS[i];
      if (T.unlocked(s, id) || T.fit(s.genre, id) < Q.fitMin) continue;
      if (!R.chance(Q.chance * T.fit(s.genre, id))) continue;
      var fest = festivalName(id), kind = fest && R.chance(0.5) ? 'festival' : 'showcase';
      var inv = { id: 'I' + s.totalWeek + '-' + id, region: id, kind: kind, festival: kind === 'festival' ? fest : T.region(id).name + ' showcase',
        week: s.totalWeek, expires: s.totalWeek + Q.weeks, status: 'open' };
      t.invites.push(inv);
      if (t.invites.length > 12) t.invites.splice(0, t.invites.length - 12);
      T.unlock(s, id, 'invite', out);
      t.queue.push({ card: 'wt_invite', region: id, invite: inv.id, festival: inv.festival });
      out.invite = inv;
      GG.emit('tour:invite', { invite: inv });
      return;   // one a week at most
    }
  }

  /* ---- Packages, quotes, booking ---------------------------------------------------------------------------------- */
  function people(s) { return activeMembers(s).length + 1 + Object.keys(s.fillIns || {}).length + (cfg().party || 0); }
  function choicesFor(pkg, choices) {
    choices = choices || {};
    var V = T.vehicles(pkg.region), S = K().stays, X = K().extras;
    var cheapest = V.slice().sort(function (a, b) { return a.perWeek - b.perWeek; })[0];
    return { vehicle: V.some(function (v) { return v.id === choices.vehicle; }) ? choices.vehicle : cheapest ? cheapest.id : null,
      stay: S[choices.stay] ? choices.stay : 'hostel', extra: X[choices.extra] ? choices.extra : 'none' };
  }
  function avgPay(v) { return v ? Math.round((v.pay[0] + v.pay[1]) / 2 * cfg().payMult) : 0; }
  function openVenue(region, city) {   // what an open date usually pays (a club in or near that city)
    var l = T.venues(region).filter(function (v) { return !v.festival && !v.hall && !v.moose; });
    return l.filter(function (v) { return v.city === city; })[0] || l[0] || null;
  }
  function stopsFor(pkg, start) {
    var prev = (T.region(pkg.region) || {}).home;
    return pkg.stops.map(function (st, i) {
      var c = T.cityDef(st.city), v = st.venue ? T.venue(st.venue) : null;
      var out = { city: st.city, cityName: c ? c.name : st.city, venue: st.venue || null, venueName: v ? v.name : 'Open date',
        festival: !!(v && v.festival), hall: !!(v && v.hall), km: i === 0 ? 0 : legKm(prev, st.city), week: start + i };
      prev = st.city;
      return out;
    });
  }
  // Why a package can't leave next week ('' = it can).
  function timing(s, pkg, start) {
    var n = pkg.stops.length, end = start + n - 1;
    if (end > s.maxWeeks) return 'The career ends before this tour would.';
    for (var i = 0; i < n; i++) {
      var w = woy(start + i), v = pkg.stops[i].venue ? T.venue(pkg.stops[i].venue) : null;
      if (w === C.LOONIES_WEEK) return 'You fly home for the Loonies (week ' + C.LOONIES_WEEK + ').';
      if (v && v.weeks && (w < v.weeks[0] || w > v.weeks[1])) { var win = T.departWindow(pkg) || []; return v.name + ' only runs in ' + (GG.calendar ? GG.calendar.monthName(v.weeks[0]) : 'its season') + (win.length ? ': this tour leaves in week ' + win.join(' or ') + ' (' + (GG.calendar ? GG.calendar.monthName(win[0]) : '') + ').' : '.'); }
      var fin = GG.rival && GG.rival.cfg ? GG.rival.cfg().final : null;
      if (fin && Math.floor((start + i - 1) / WPY) + 1 === fin.year && w === fin.week) return 'The Sad Dome is that week.';
    }
    return '';
  }
  T.departWindow = function (pkg) {   // week-of-year departures that line the festival stops up (null = any week)
    var out = [];
    for (var w = 1; w <= WPY; w++) {
      var ok = pkg.stops.every(function (st, i) { var v = st.venue ? T.venue(st.venue) : null, x = woy(w + i); return !(v && v.weeks) || (x >= v.weeks[0] && x <= v.weeks[1]); });
      if (ok) out.push(w);
    }
    return out.length === WPY ? null : out;
  };
  T.quote = function (s, pkgId, choices) {
    var pkg = T.pkg(pkgId); if (!pkg) return null;
    var R = T.region(pkg.region), ch = choicesFor(pkg, choices), n = pkg.stops.length;
    var veh = K().vehicles[ch.vehicle] || { perWeek: 0 }, stay = K().stays[ch.stay] || { perWeek: 0 }, ex = K().extras[ch.extra] || { cost: 0 };
    var inv = openInvite(s, pkg.region), ppl = people(s), flights = R.flight * ppl, disc = 0;
    if (inv || pkg.showcase) { disc = Math.round(flights * Math.max(inv ? cfg().invite.flights : 0, pkg.showcase ? cfg().showcase.flights : 0)); flights -= disc; }
    var rental = veh.perWeek * n, hotels = stay.perWeek * n, extra = ex.cost || 0, start = s.totalWeek + 1;
    var stops = stopsFor(pkg, start), payEst = 0;
    stops.forEach(function (st) { payEst += avgPay(st.venue ? T.venue(st.venue) : openVenue(pkg.region, st.city)); });
    var est = T.estimate(s, { packageId: pkgId, choices: ch });
    return { packageId: pkgId, region: pkg.region, name: pkg.name, choices: ch, people: ppl, flights: flights, inviteDiscount: disc, invite: inv ? inv.id : null,
      rental: rental, hotels: hotels, extra: extra, upfront: flights + rental + extra, total: flights + rental + extra + hotels,
      start: start, end: start + n - 1, weeks: n, stops: stops, payEst: payEst, fansEst: est.fans, vehicle: veh, stay: stay, extraDef: ex,
      affordable: s.fund >= flights + rental + extra };
  };
  T.canBook = function (s, pkgId, choices) {
    var pkg = T.pkg(pkgId), q = pkg ? T.quote(s, pkgId, choices) : null, t = T.ensure(s);
    function no(why) { return { ok: false, why: why, quote: q }; }
    if (!pkg) return no('No such tour.');
    if (s.ended) return no('The career is over.');
    if (s.era !== 'world') return no('World tours open in the World stage era.');
    if (!T.unlocked(s, pkg.region)) return no(T.region(pkg.region).name + ' is locked: ' + U.fmtNum(T.threshold(s, pkg.region)) + ' fans, or an invite.');
    if (t.active) return no(t.active.status === 'on' ? 'You are on tour right now.' : 'A tour is already booked.');
    if (GG.labels && GG.labels.inSession && GG.labels.inSession(s)) return no('You are in the studio.');
    if (s.phase === 'gig') return no('Play this weekend first.');
    if (pkg.needs === 'moose' && !(s.flags && (s.flags.mooseAlbum === 'ready' || s.flags.mooseAlbum === 'finland') && !t.moose)) return no('Finland is waiting for a certain concept album.');
    if (pkg.needs && pkg.needs !== 'moose' && !(T.needsMet(s, pkg) && !t.payoffs[pkg.id])) return no(pkg.needsText || 'Not yet. The story is still being written.');
    if (pkg.showcase && (rs(s, pkg.region).tours > 0 || t.history.some(function (h) { return h.packageId === pkg.id; }))) return no('A showcase is a first impression. You only get one.');
    if (pkg.minRegionFans && rs(s, pkg.region).fans < pkg.minRegionFans) return no('Needs ' + U.fmtNum(pkg.minRegionFans) + ' fans in ' + T.region(pkg.region).name + '.');
    var why = timing(s, pkg, s.totalWeek + 1);
    if (why) return no(why);
    if (!q.affordable) return no('Flights, the rental and extras cost ' + money(q.upfront) + ' up front.');
    return { ok: true, why: '', quote: q };
  };
  T.packages = function (s, region) {
    return K().packages.filter(function (p) { return !region || p.region === region; }).filter(function (p) {
      return !p.needs || T.needsMet(s, p);
    }).map(function (p) { var c = T.canBook(s, p.id); return Object.assign({}, p, { ok: c.ok, why: c.why, quote: c.quote, window: T.departWindow(p) }); });
  };
  // v0.9 (owner Q3): a World payoff package per band. needs: 'moose' (Hail Damage's Moose Opera, v0.7) or { flag, is?: [values]
  // | value, band?: [ids] }: the storyline flag that unlocks the package. payoff: { city?, flag?, value?, trophy?, line?, chat?,
  // card?, fans?, buzz? }: fires once, at the package's gig in `city` (else its last stop) and counts toward the Global Gong
  // like the Moose Opera. t.payoffs[pkgId] = { week, flag }.
  T.needsMet = function (s, p) {
    var n = p && p.needs;
    if (!n) return true;
    if (n === 'moose') return !!(s.flags && (s.flags.mooseAlbum === 'ready' || s.flags.mooseAlbum === 'finland'));
    if (typeof n === 'string') return !!(s.flags && s.flags[n]);
    if (n.band && [].concat(n.band).indexOf(s.bandId) < 0) return false;
    var v = s.flags && n.flag ? s.flags[n.flag] : null, is = n.is || (n.value != null ? [n.value] : null);
    return is ? [].concat(is).indexOf(v) >= 0 : !!v;
  };
  // Every band's World payoff counts for the Gong like the Moose Opera: a fired package payoff (t.payoffs), or the flag its
  // storyline leaves behind (cfg().payoffFlags: { flag: true (any value) | value | [values] }), e.g. a payoff card's own flag.
  T.payoffDone = function (s) {
    var t = T.ensure(s), F = cfg().payoffFlags || {}, f = s.flags || {};
    if (t.moose || Object.keys(t.payoffs || {}).length) return true;
    return Object.keys(F).some(function (k) {
      var want = F[k], v = f[k];
      if (v == null || v === false) return false;
      return want === true || [].concat(want).indexOf(v) >= 0;
    });
  };
  // The payoff gig: payoff.venue (a stop's venue id), else payoff.city, else the package's last stop.
  function payoffAt(s, g) {
    var a = T.active(s), p = a && T.pkg(a.packageId), P = p && p.payoff;
    if (!p || !p.needs || p.needs === 'moose' || !P || T.ensure(s).payoffs[p.id]) return null;
    if (P.venue) return g.venueId === P.venue || g.id === P.venue ? p : null;
    var last = a.stops[a.stops.length - 1] || {}, city = P.city || last.city;
    return g.cityId === city || g.city === city || (T.cityDef(city) && T.cityDef(city).name === g.city) ? p : null;
  }
  function payoff(s, p, r, d, g) {
    var t = T.ensure(s), P = p.payoff || {}, Q = cfg().moose, flag = P.flag || (typeof p.needs === 'string' ? p.needs + 'Payoff' : p.needs && p.needs.flag ? p.needs.flag + 'Payoff' : 'worldPayoff');
    t.payoffs[p.id] = { week: s.totalWeek, flag: flag };
    s.flags[flag] = P.value != null ? P.value : true;
    (s.trophies || (s.trophies = [])).push({ kind: P.trophyKind || 'payoff', title: GG.career.fillText(s, P.trophy || p.name), year: s.year });
    addRegionFans(s, p.region, P.fans != null ? P.fans : Q.fans, d);
    fx(s, { buzz: P.buzz != null ? P.buzz : Q.buzz }, d);
    if (r && r.lines && P.line) r.lines.push(GG.career.fillText(s, P.line));
    if (P.chat) chat(s, 'dj', P.chat, null, 'news');
    if (P.card) t.queue.unshift({ card: P.card, region: p.region, now: true });
    GG.emit('tour:payoff', { packageId: p.id, flag: flag, venueId: (g && g.venueId) || null });
  };
  T.book = function (s, pkgId, choices) {
    var c = T.canBook(s, pkgId, choices);
    if (!c.ok) return { error: c.why };
    var q = c.quote, pkg = T.pkg(pkgId), t = T.ensure(s), d = {};
    fx(s, { fund: -q.upfront }, d);
    var inv = q.invite ? t.invites.filter(function (i) { return i.id === q.invite; })[0] : null;
    if (inv) inv.status = 'used';
    t.active = { id: 'T' + s.totalWeek + '-' + pkg.id, region: pkg.region, packageId: pkg.id, name: pkg.name, choices: q.choices,
      booked: s.totalWeek, start: q.start, stops: q.stops, cost: { flights: q.flights, rental: q.rental, extra: q.extra, hotels: 0 },
      paid: q.upfront, invite: q.invite, status: 'booked', index: -1, endAfter: null, results: [], fans: 0, pay: 0, take: 0 };
    GG.emit('tour:booked', { tour: t.active });
    GG.emit('stats:changed', { state: s });
    return t.active;
  };
  T.cancel = function (s) {
    var t = T.ensure(s), a = t.active;
    if (!a || a.status !== 'booked') return null;
    var refund = a.cost.rental + a.cost.extra;
    fx(s, { fund: refund });
    t.active = null;
    GG.emit('stats:changed', { state: s });
    return { refund: refund };
  };

  /* ---- Gigs abroad ------------------------------------------------------------------------------------------------- */
  // A GIG for a world venue (flat fee, rolled from its pay range by a seeded rng; holiday pay applies).
  T.makeGig = function (s, venueId, opts) {
    opts = opts || {};
    var v = T.venue(venueId); if (!v) return null;
    var c = T.cityDef(v.city) || { name: v.city }, rng = opts.rng || seeded(s, 'pay|' + venueId), fit = T.fit(s.genre, v.region);
    var mult = GG.calendar ? GG.calendar.payMult(s, v) : 1;
    var pay = Math.round(rng.int(v.pay[0], v.pay[1]) * mult * cfg().payMult / 50) * 50;
    var g = { id: opts.id || null, venueId: v.id, name: v.name, city: c.name, cityId: v.city, region: v.region, tier: v.tier, kind: v.kind,
      capacity: v.capacity, deal: 'flat', pay: pay, gas: 0, quirk: v.quirk || '', source: opts.source || 'tour', catch: v.catch || '',
      minFans: 0, fit: Math.round(fit * 100) / 100, setSize: v.setSize || 4, repLevel: GG.world ? GG.world.rep(s, v.id) : 0, rebook: false,
      clash: fit < 0.45, opening: null, outdoor: !!v.outdoor, festival: !!v.festival, hall: !!v.hall, moose: !!v.moose,
      silent: v.region === 'japan' && v.city !== 'osaka', km: opts.km || 0, tour: true, stop: opts.stop != null ? opts.stop : null };
    g.tags = GG.calendar ? GG.calendar.tags(s, { kind: g.kind, city: g.city, outdoor: g.outdoor, id: g.venueId }, g.city) : [];
    if (g.festival) g.tags.unshift({ icon: '🎪', text: 'Festival slot' });
    if (g.silent) g.tags.push({ icon: '🙇', text: 'Silent until the song ends' });
    return g;
  };
  // The regional board on tour (open dates): clubs in the region, nearest to this week's city first.
  T.listings = function (s, rng) {
    var st = T.stop(s); if (!st) return [];
    rng = rng || seeded(s, 'board');
    var region = T.regionOf(s), pool = T.venues(region).filter(function (v) { return !v.festival && !v.hall && !v.moose; });
    pool.sort(function (a, b) { return legKm(st.city, a.city) - legKm(st.city, b.city); });
    var out = pool.slice(0, 4).map(function (v, i) {
      var g = T.makeGig(s, v.id, { rng: rng, source: 'book', km: st.km + legKm(st.city, v.city), stop: idxOf(s, T.active(s)) });
      g.id = 'L' + s.totalWeek + '-' + (i + 1);
      return g;
    });
    return out;
  };
  T.silentCrowd = function (g) { return !!(g && g.silent); };
  // Crowd draw abroad: walk-ins + region fans + buzz (scaled by genre fit); festivals add a slice of the festival crowd.
  T.draw = function (s, g) {
    var Q = cfg().crowd, r = rs(s, g.region) || { fans: 0 }, fit = T.fit(s.genre, g.region), a = T.active(s);
    var d = (Q.walkIns[g.tier] || 90) + r.fans * Q.fanDraw + (s.buzz || 0) * Q.buzzDraw * fit;
    if (g.festival) d += g.capacity * Q.festivalSlot * (0.6 + 0.4 * fit);
    if (g.hall) d += r.fans * Q.hallDraw;
    if (a && a.choices && a.choices.extra === 'publicist') d *= 1 + Q.publicist;
    return d;
  };
  function newFansAbroad(s, g, crowd, grade, rng) {
    var G = econ().gig || { conversion: { B: 0.28 } }, Q = cfg().fans, R = T.region(g.region) || { scene: 30000 }, r = rs(s, g.region);
    var head = Math.max(0, 1 - r.fans / R.scene), fm = GG.drama ? GG.drama.gigMods(s).fansMult : 1;
    var x = crowd * (G.conversion[grade] || 0) * (0.5 + 0.5 * (g.fit != null ? g.fit : 0.7)) * Q.mult * (g.festival ? Q.festival : 1) * head * fm;
    return rng ? rngRound(x, rng) : Math.round(x);
  }
  // Preview of a listing / gig ({ crowd, pay, fans, net, burnout }) or of a package ({ fans, pay } over its fixed stops).
  T.estimate = function (s, x) {
    if (x && x.packageId) {
      var pkg = T.pkg(x.packageId), fans = 0, pay = 0;
      if (!pkg) return { fans: 0, pay: 0 };
      pkg.stops.forEach(function (st, i) {
        var v = st.venue ? T.venue(st.venue) : openVenue(pkg.region, st.city); if (!v) return;
        var g = T.makeGig(s, v.id, { rng: GG.RNG(7 + i) });
        g.pay = avgPay(v);
        var e = T.estimate(s, g);
        fans += e.fans; pay += e.pay;
      });
      return { fans: fans, pay: pay };
    }
    var g2 = x, crowd = Math.min(g2.capacity || 0, Math.round(T.draw(s, g2)));
    var f = newFansAbroad(s, g2, crowd, 'B', null), costs = Math.round(g2.pay * (((GG.world && GG.world.cfg().commission) || {})[s.era] || 0));
    return { crowd: crowd, pay: g2.pay, fans: f, net: g2.pay - costs, costs: costs, burnout: 0 };
  };
  // world.shape for a gig abroad (once per result): region fans from the region's scene, weather/holiday, local colour.
  T.shape = function (s, g, r, rng) {
    if (!g || !r || r.shaped) return r;
    r.shaped = true; r.lines = r.lines || []; r.km = g.km || 0; r.region = g.region; r.tour = true;
    if (GG.calendar) GG.calendar.shape(s, g, r, rng);
    r.fans = newFansAbroad(s, g, r.crowd || 0, r.grade, rng);
    var a = T.active(s), ex = a && K().extras[a.choices.extra];
    if (ex && ex.buzz) r.buzz = (r.buzz || 0) + Math.round(ex.buzz / 2);
    var first = rs(s, g.region).gigs === 0;
    if (first) r.lines.push('Your first show in ' + T.region(g.region).name + '. ' + (g.silent ? 'Silence during every song. A roar after. Every single time.' : 'They came. They stayed. Some of them knew the words.'));
    var cl = GG.career.pool(s, K(), ['cityLines', g.cityId]);   // v0.9: world.cityLines[cityId] (+ byBand): a band's moment in that city
    if (Array.isArray(cl) && cl.length) r.lines.push(GG.career.fillText(s, rng.pick(cl)));
    else if (g.cityId === 'paris' && GG.songs && GG.songs.namerFr && GG.songs.namerFr(s)) r.lines.push(GG.career.fillText(s, 'France loves {namer}. Roses land on stage. All of them are for {namer}.'));
    if (g.festival) r.lines.push('A festival crowd: ' + U.fmtNum(r.crowd) + ' people, most of them hearing {band} for the first time.'.replace('{band}', bandName(s)));
    return r;
  };
  // world.afterGig for a gig abroad: region bookkeeping, "broken" check, the moose, then travel in the rental.
  T.afterGig = function (s, g, r, rng, d) {
    var t = T.ensure(s), reg = rs(s, g.region), a = T.active(s);
    reg.fans = Math.max(0, reg.fans + (r.fans || 0));
    reg.gigs++;
    if (!reg.best || GRADE_ORDER.indexOf(r.grade) < GRADE_ORDER.indexOf(reg.best)) reg.best = r.grade;
    var take = (r.pay || 0) - (r.cut || 0) - (r.commission || 0) - (r.crew || 0) - (r.fillInCost || 0);   // what the fund actually kept
    if (a) {
      if (a.stops.length === 1 && T.pkg(a.packageId) && T.pkg(a.packageId).showcase && !a.results.length) r.fans = (r.fans || 0) + addRegionFans(s, g.region, cfg().showcase.regionFans, d);   // industry buzz
      a.results.push({ week: s.totalWeek, city: g.city, venueId: g.venueId, name: g.name, grade: r.grade, fans: r.fans || 0, pay: r.pay || 0, take: take, festival: !!g.festival, score: r.score });
      a.fans += r.fans || 0; a.pay += r.pay || 0; a.take = (a.take || 0) + take;
    }
    if (g.cityId === 'helsinki' && s.flags && (s.flags.mooseAlbum === 'ready' || s.flags.mooseAlbum === 'finland') && !t.moose) moose(s, r, d);
    var po = payoffAt(s, g);   // v0.9: another band's World payoff
    if (po) payoff(s, po, r, d, g);
    return T.travel(s, g, rng, d);
  };
  T.travel = function (s, g, rng, d) {
    var Q = cfg().travel, a = T.active(s), veh = a ? K().vehicles[a.choices.vehicle] : null, km = g.km || 0;
    var comfort = veh ? veh.comfort : 2, burn = km < 60 ? 0 : Math.min(Q.burnoutMax, Math.round(km / 100 * (6 - comfort) * Q.burnoutPer100));
    if (burn) fx(s, { burnout: burn }, d);
    var out = { km: km, driven: km, wear: 0, burnout: burn, breakdown: null, driver: GG.world ? GG.world.driver(s).id : 'you', vehicle: veh ? veh.id : null, abroad: true };
    if (veh && km > 0 && rng.chance(veh.breakdown * (km >= 300 ? 1.5 : 1))) {
      var cost = rng.int(Q.breakdownCost[0], Q.breakdownCost[1]);
      fx(s, { fund: -cost, burnout: 3, chemistry: -2 }, d);
      out.breakdown = { cost: cost };
      r_line(s, veh, cost);
    }
    return out;
  };
  function r_line(s, veh, cost) { chat(s, 'dj', 'The ' + veh.name.replace(/^An? /, '').toLowerCase() + ' broke down between shows. Towing and a mechanic who spoke no English: ' + money(cost) + '.', null, 'news'); }
  // world.startTrip abroad: from the last stop (or the airport) to this week's city, in the rental, with a region road card.
  T.startTrip = function (s, gig) {
    var a = T.active(s), st = T.stop(s), rng = GG.rngFor(s);
    var i = idxOf(s, a), from = i > 0 ? a.stops[i - 1].city : (T.region(a.region) || {}).home, to = gig.cityId || (st && st.city);
    var km = gig.km != null ? gig.km : legKm(from, to), season = GG.calendar ? GG.calendar.seasonAt(s) : 'summer';
    var card = GG.world ? GG.world.drawRoad(s, km, season, rng, to) : null;
    if (card) s.seenCards[card.id] = s.totalWeek;
    var wx = GG.calendar ? GG.calendar.weatherAt(s, to) : { kind: 'clear', temp: 15 }, hol = GG.calendar ? GG.calendar.holiday(s.week, s) : null;
    var fc = T.cityDef(from), tc = T.cityDef(to), veh = K().vehicles[a.choices.vehicle] || {};
    s.trip = { w: s.totalWeek, venueId: gig.venueId, from: from, to: to, fromName: i > 0 && fc ? fc.name : (fc ? fc.name + ' airport' : 'the airport'),
      toName: tc ? tc.name : gig.city, km: km, highway: (T.region(a.region) || {}).road || '', season: season, night: km >= 400,
      cardId: card ? card.id : null, resolved: !card, choice: null, outcome: null, deltas: null, success: null,
      banter: GG.world ? GG.world.banter(s, 2) : [], weather: wx.kind, temp: wx.temp, holiday: hol ? hol.id : null,
      driver: GG.world ? GG.world.driver(s).id : 'you', abroad: true, region: a.region, vehicle: veh.id || null, vehicleName: veh.name || '', vehicleLook: veh.look || null };
    return s.trip;
  };
  T.roadCardOk = function (s, c) {
    var reg = c && c.gate && c.gate.region;
    return T.away(s) ? !!(reg && reg.indexOf(T.regionOf(s)) >= 0) : !(reg && reg.indexOf('canada') < 0);
  };

  /* ---- The week on tour ------------------------------------------------------------------------------------------------ */
  // career.startWeek (before the calendar): departure day, this week's stop + its show, the president.
  T.monday = function (s) {
    var t = T.ensure(s), a = t.active;
    if (!a || s.ended) return null;
    if (a.status === 'booked' && s.totalWeek >= a.start) {
      a.status = 'on';
      fx(s, { burnout: (cfg().jetLag[a.region] || 5) });
      chat(s, 'dj', pickText(s, seeded(s, 'depart'), ['lines', 'depart', a.region], 'Wheels up.'), null, 'news');
      GG.emit('tour:depart', { tour: a });
    }
    if (a.status !== 'on') return null;
    var i = idxOf(s, a);
    if (i < 0 || i >= a.stops.length) return null;
    a.index = i;
    var st = a.stops[i];
    s.offer = null;
    if (st.venue && !s.gig) s.gig = T.makeGig(s, st.venue, { km: st.km, stop: i });
    if (a.region === 'japan' && !t.president) {
      t.president = s.totalWeek;
      if (s.superfans && typeof s.superfans === 'object' && !s.superfans.japan) s.superfans.japan = { seen: 0, mood: 80, since: s.totalWeek };
      t.queue.unshift({ card: 'wt_president', region: 'japan', now: true });
      GG.emit('tour:president', {});
    }
    GG.emit('tour:week', { tour: a, stop: st, index: i });
    return st;
  };
  // runWeek, before the weekend: an open date takes the board pick (or the best regional listing).
  T.beforeGig = function (s) {
    var st = T.stop(s);
    if (!st || s.gig || st.venue || !GG.world) return null;
    var g = GG.world.takePick(s);
    if (g) { g.tour = true; g.stop = idxOf(s, T.active(s)); s.gig = g; }
    return s.gig;
  };
  T.allowedBlocks = function (s) { return T.away(s) ? BLOCKS.slice() : C.ACTIVITIES.slice(); };
  T.blockId = function (s, id, i) {
    if (!T.away(s)) return id;
    var Q = cfg(), out = BLOCKS.indexOf(id) >= 0 ? id : (Q.blocks[id] || 'rest');
    if (i === 0 && T.ensure(s).homesick >= Q.homesick.restAt) out = 'rest';   // homesickness forces a rest
    return out;
  };
  var BLOCK_LINES = {
    rest: ['A day off in {here}. Somebody finds a laundromat. It feels like church.', 'Everyone sleeps until noon in {here}. Nobody apologizes.', 'Rest day in {here}. Postcards home. Nobody knows the postage.'],
    promote: ['Promoting locally in {here}: radio, a record store signing, posters on every lamp post.', 'A morning-radio interview in {here}. The host pronounces the band name three new ways.', 'Flyering outside a record shop in {here}. A stranger already owns your album.'],
    rehearse: ['Hotel-room rehearsal in {here}: a practice pad, unplugged guitars, a noise complaint by 9 p.m.', 'Rehearsal in a rented room in {here} the size of the van. It helps. A bit.']
  };
  // career runActivity abroad: returns true when it handled the block (rehearse = half gains in a hotel room).
  T.block = function (s, id, A, f, rng, d, lines, ACT) {
    if (!T.away(s) || !ACT || !ACT[id]) return false;
    var Q = cfg(), st = T.stop(s), here = st ? st.cityName : 'town', a = T.active(s);
    lines[0] = rng.pick(BLOCK_LINES[id] || BLOCK_LINES.rest).replace('{here}', here);
    if (id === 'rehearse') {
      var half = Object.assign({}, A, { skill: A.skill * Q.rehearse.skill, drumSkill: A.drumSkill * Q.rehearse.skill, polish: A.polish * Q.rehearse.skill });
      ACT.rehearse(s, half, f, rng, d, lines);
    } else ACT[id](s, A, f, rng, d, lines);
    if (id === 'promote') {
      var P = Q.promote, n = rngRound(rng.int(P.regionFans[0], P.regionFans[1]) * f * (a && a.choices.extra === 'publicist' ? 1.4 : 1), rng);
      addRegionFans(s, a.region, n, d);
      if (P.buzz) fx(s, { buzz: P.buzz }, d);
    }
    if (id === 'rest') { var t = T.ensure(s); t.homesick = U.clamp(t.homesick + Q.homesick.rest, 0, 100); d.homesick = Q.homesick.rest; }
    return true;
  };

  /* ---- Monday cards abroad + story cards ------------------------------------------------------------------------------ */
  // v0.9: a story card for this band: '<id>_<bandId>' (gate + speaker ok), else the base card when it isn't gated to another
  // band and its speaker is ok (wt_homesick's speaker 'recruit' = a talker, set as ctx.who).
  function queuedCard(s, id) {
    var v = GG.career.cardById ? GG.career.cardById(id + '_' + s.bandId) : null;
    if (v && T.card(v.id) && GG.career.gatePasses(s, v.gate) && GG.career.cardOk(s, v)) return v;
    var c = T.card(id);
    if (!c || (c.gate && c.gate.band && c.gate.band.indexOf(s.bandId) < 0)) return null;
    return !GG.career.cardOk || GG.career.cardOk(s, c) ? c : null;
  }
  // v0.9: the week the homesick card was last dealt, under the base id or the band's variant (queuedCard deals
  // wt_homesick_<bandId> when it exists, and startWeek records seenCards under the id it dealt). -1e9 = never.
  function homesickSeen(s) {
    var a = s.seenCards.wt_homesick, b = s.seenCards['wt_homesick_' + s.bandId];
    return Math.max(a == null ? -1e9 : a, b == null ? -1e9 : b);
  }
  // Content text: a pool path over GG.content.world (+ byBand); string or [strings] (seeded pick).
  function pickText(s, rng, path, fallback) {
    var v = GG.career.pool ? GG.career.pool(s, K(), path) : null;
    if (Array.isArray(v)) return v.length ? rng.pick(v) : fallback;
    return typeof v === 'string' && v ? v : fallback;
  }
  T.pickText = pickText;
  function availableCard(s, c) {
    var w = s.seenCards && s.seenCards[c.id];
    if (w == null) return true;
    return c.once === false && s.totalWeek - w >= (c.cooldown || 0);
  }
  T.forcedCard = function (s) {
    var t = T.ensure(s), Q = cfg();
    if (s.ended || s.totalWeek <= 1) return null;
    // story cards first (the president and the moose come right away; the rest keep a gap)
    for (var i = 0; i < t.queue.length; i++) {
      var q = t.queue[i], c = queuedCard(s, q.card);
      if (!c) { t.queue.splice(i--, 1); continue; }
      if (!q.now && t.lastCard != null && s.totalWeek - t.lastCard < Q.cardGap) break;
      t.queue.splice(i, 1);
      t.ctx = { region: q.region || null, invite: q.invite || null, festival: q.festival || null, song: q.song || null, card: c.id };
      if (c.speaker === 'recruit') {   // v0.9: the homesick one is a bandmate who talks (the most homesick = the grumpiest)
        var tk = GG.career.talkers(s).slice().sort(function (a, b) { return a.mood - b.mood; })[0];
        if (tk) t.ctx.who = tk.id;
      }
      t.lastCard = s.totalWeek;
      return c;
    }
    if (!T.away(s)) return null;
    var st = T.stop(s), rng = seeded(s, 'card');
    if (!rng.chance(Q.cardChance)) return null;
    var pool = T.cards().filter(function (c) {
      return !c.story && availableCard(s, c) && (!c.city || c.city.indexOf(st.city) >= 0) && GG.career.gatePasses(s, c.gate)
        && (!GG.career.cardOk || GG.career.cardOk(s, c)) && !(GG.career.isVariantId && GG.career.isVariantId(c.id));   // v0.9 speaker / card guard
    });
    if (!pool.length) return null;
    var pick = rng.weighted(pool, function (c) { return (c.weight || 1) * (c.city ? 3 : 1); });
    t.ctx = { region: T.regionOf(s), card: pick.id };
    return pick;
  };
  T.fillText = function (s, text) {
    if (!text || text.indexOf('{') < 0) return text;
    var t = s && s.tour, ctx = (t && t.ctx) || {}, st = s && s.tour ? T.stop(s) : null;
    return text.replace(/\{(region|song|festival|here)\}/g, function (all, k) {
      if (k === 'region') { var R = T.region(ctx.region || (s && T.regionOf(s))); return R ? R.name : 'abroad'; }
      if (k === 'song') return ctx.song || 'your song';
      if (k === 'festival') return ctx.festival || 'A festival';
      return st ? st.cityName : 'town';
    });
  };
  T.afterCard = function (s, card, i, success, d) {
    if (!card || !T.card(card.id)) return;
    var t = T.ensure(s), ch = card.choices && card.choices[i], ctx = t.ctx || {}, region = ctx.region || T.regionOf(s);
    var list = [ch && ch.effects && ch.effects.tour];
    var br = ch && ch.roll && (success ? ch.roll.success : ch.roll.fail);
    if (br && br.effects) list.push(br.effects.tour);
    var accepted = false;
    list.forEach(function (v) {
      if (!v) return;
      if (v.regionFans && REGION_IDS.indexOf(region) >= 0) addRegionFans(s, region, v.regionFans, d);
      if (v.homesick) { t.homesick = U.clamp(t.homesick + v.homesick, 0, 100); d.homesick = (d.homesick || 0) + v.homesick; }
      if (v.gift && GG.fans && GG.fans.addGift) GG.fans.addGift(s, v.gift);
      if (v.endTour && t.active && t.active.status === 'on') t.active.endAfter = idxOf(s, t.active);
      if (v.accept) accepted = true;
      if (v.big && rs(s, region) && rs(s, region).big) rs(s, region).big.choice = v.big;
    });
    if (card.id === 'wt_invite' && ctx.invite) t.invites.forEach(function (inv) { if (inv.id === ctx.invite && inv.status === 'open') inv.status = accepted ? 'accepted' : 'declined'; });
  };

  /* ---- Weekly: hotels, homesickness, calls home, the end of a tour, unlocks, invites, big in one place, the Gong ----- */
  function finish(s, out) {
    var t = T.ensure(s), a = t.active, reg = rs(s, a.region);
    fx(s, { burnout: (cfg().jetLag[a.region] || 5) });
    a.status = 'done';
    reg.tours++;
    var best = a.results.reduce(function (b, r) { return !b || GRADE_ORDER.indexOf(r.grade) < GRADE_ORDER.indexOf(b) ? r.grade : b; }, null);
    var cost = a.paid + a.cost.hotels;
    var sum = { id: a.id, region: a.region, packageId: a.packageId, name: a.name, start: a.start, end: s.totalWeek, gigs: a.results.length,
      festivals: a.results.filter(function (r) { return r.festival; }).length, fans: a.fans, pay: a.pay, take: a.take || 0, cost: cost, net: (a.take || 0) - cost, best: best,
      cut: a.endAfter != null && a.endAfter < a.stops.length - 1 };
    t.history.push(sum);
    if (t.history.length > 20) t.history.splice(0, t.history.length - 20);
    t.active = null;
    var hl = GG.career.pool ? GG.career.pool(s, K(), ['lines', 'home']) : K().lines.home;   // v0.9: + byBand
    chat(s, 'mom', seeded(s, 'home').pick(Array.isArray(hl) && hl.length ? hl : ['Home.']), null, 'news');
    out.home = sum;
    GG.emit('tour:home', { summary: sum });
  }
  function callHome(s, rng, n) {
    var pools = K().callHome || {}, act = rng.shuffle(GG.career.talkers(s));   // v0.9: silent members never call home
    var gen = GG.career.pool ? GG.career.pool(s, K(), ['callHome', 'generic']) : pools.generic;
    for (var i = 0; i < Math.min(n, act.length); i++) {
      var m = act[i], pool = (pools[m.id] && pools[m.id].length && rng.chance(0.7)) ? pools[m.id] : gen;
      if (pool && pool.length) chat(s, m.id, rng.pick(pool), null, 'home');
    }
  }
  function checkBroken(s, out) {
    REGION_IDS.forEach(function (id) {
      var r = rs(s, id), R = T.region(id);
      if (!r.broken && r.fans >= R.breakAt) {
        r.broken = s.totalWeek;
        chat(s, 'dj', fill(s, pickText(s, seeded(s, 'line|broken'), ['lines', 'broken'], '{band} broke {region}.'), { region: R.name }), null, 'news');
        out.broken.push(id);
        GG.emit('tour:broken', { region: id });
      }
    });
  }
  function rollBig(s, R, out) {
    var Q = cfg().big, t = T.ensure(s);
    if (REGION_IDS.some(function (id) { var b = rs(s, id).big; return b && s.totalWeek - b.week < 12; })) return;
    for (var i = 0; i < REGION_IDS.length; i++) {
      var id = REGION_IDS[i], r = rs(s, id);
      if (r.big) continue;
      var open = r.unlocked && r.gigs >= Q.minGigs && r.fans >= Q.minRegionFans;
      var early = !r.unlocked && T.fit(s.genre, id) >= 0.8 && s.fans >= T.threshold(s, id) * 0.75;
      if (!(open || early) || !R.chance(Q.chance * (open ? 1 : 0.5))) continue;
      var songs = GG.songs && GG.songs.best ? GG.songs.best(s, 3) : [], song = songs.length ? R.pick(songs) : null;
      if (!song) return;
      r.big = { songId: song.id, title: song.title, week: s.totalWeek, choice: null };
      if (!r.unlocked) T.unlock(s, id, 'big', out);
      addRegionFans(s, id, Math.round(T.region(id).breakAt * 0.1));
      t.queue.push({ card: 'wt_big', region: id, song: song.title });
      chat(s, 'dj', fill(s, pickText(s, seeded(s, 'line|big'), ['lines', 'big'], '{song} is big in {region}.'), { song: '“' + song.title + '”', region: T.region(id).name }), null, 'news');
      out.big = { region: id, song: song.title };
      GG.emit('tour:big', { region: id, song: r.big });
      return;
    }
  }
  function moose(s, r, d) {
    var t = T.ensure(s), Q = cfg().moose;
    t.moose = { week: s.totalWeek };
    s.flags.mooseOpera = 'platinum';
    (s.trophies || (s.trophies = [])).push({ kind: 'platinum_fi', title: 'Platinum in Finland: the moose concept album', year: s.year });
    addRegionFans(s, 'uk_europe', Q.fans, d);
    fx(s, { buzz: Q.buzz }, d);
    if (r && r.lines) r.lines.push('The moose concept album went platinum in Finland tonight. The chandelier is shaped like antlers. It all makes sense now.');
    chat(s, 'dj', K().lines.moose || 'Platinum in Finland.', null, 'news');
    t.queue.unshift({ card: 'wt_moose', region: 'uk_europe', now: true });
    GG.emit('tour:moose', {});
  }
  T.weekly = function (s, rng, wrap) {
    var t = T.ensure(s), Q = cfg(), H = Q.homesick, out = { home: null, unlocked: [], invite: null, broken: [], big: null, gong: null, homesick: t.homesick, hotel: 0, away: false };
    if (wrap) wrap.tour = out;
    if (!t || t.w === s.totalWeek) return out;
    t.w = s.totalWeek;
    var R = seeded(s, 'week'), a = t.active;
    if (T.away(s)) {
      out.away = true;
      var stay = K().stays[a.choices.stay] || { perWeek: 0, homesick: 0, mood: 0 };
      if (stay.perWeek) { fx(s, { fund: -stay.perWeek }); a.cost.hotels += stay.perWeek; out.hotel = stay.perWeek; }
      if (stay.mood) fx(s, { mood: { all: stay.mood } });
      var low = activeMembers(s).filter(function (m) { return m.mood < 45; }).length;
      t.homesick = U.clamp(t.homesick + H.perWeek + low * H.lowMood + (stay.homesick || 0), 0, H.max);
      if (t.homesick >= H.moodAt) fx(s, { mood: { all: H.mood } });
      if (t.homesick >= H.burnoutAt) fx(s, { burnout: H.burnout });
      callHome(s, R, t.homesick >= 60 ? 2 : 1);
      if (t.homesick >= H.cardAt && !t.queue.some(function (q) { return q.card === 'wt_homesick'; }) && idxOf(s, a) < a.stops.length - 1
        && s.totalWeek - homesickSeen(s) >= 12) { t.queue.unshift({ card: 'wt_homesick', now: true, region: a.region }); GG.emit('tour:homesick', { value: t.homesick }); }
      var i = idxOf(s, a);
      if (i >= a.stops.length - 1 || (a.endAfter != null && i >= a.endAfter)) finish(s, out);
    } else t.homesick = U.clamp(t.homesick + H.home, 0, H.max);
    out.homesick = t.homesick;
    t.invites.forEach(function (inv) { if ((inv.status === 'open' || inv.status === 'accepted') && inv.expires < s.totalWeek) inv.status = 'expired'; });
    if (s.era === 'world') {
      REGION_IDS.forEach(function (id) { if (!T.unlocked(s, id) && s.fans >= T.threshold(s, id)) T.unlock(s, id, 'fans', out); });
      rollInvites(s, R, out);
      rollBig(s, R, out);
      checkBroken(s, out);
      var GW = (K().gong || {}).week || 22;
      if (s.week === GW - 1 && gongCase(s).nominated) chat(s, 'dj', fill(s, pickText(s, seeded(s, 'line|gongNominated'), ['lines', 'gongNominated'], '{band} is nominated for the Global Gong.')), null, 'news');
      if (s.week === GW) out.gong = T.runGong(s);
    }
    return out;
  };

  /* ---- The rival breaks regions first ------------------------------------------------------------------------------- */
  T.rivalWeekly = function (s, news) {
    var t = T.ensure(s), Q = cfg().rival, rv = s.rival;
    if (!rv || rv.cracked === 'breakup' || (rv.fans || 0) < Q.fans) return null;
    var next = Q.order.filter(function (id) { return !t.rival[id]; })[0];
    if (!next || !seeded(s, 'rival').chance(Q.chance)) return null;
    t.rival[next] = s.totalWeek;
    var r = rs(s, next), first = !r.broken;
    if (first) r.rivalFirst = s.totalWeek;
    var text = first ? fill(s, pickText(s, seeded(s, 'line|rival'), ['lines', 'rival'], '{rival} broke {region} first.'), { region: T.region(next).name })
      : fill(s, '{rival} finally toured {region}. The locals asked them if they know you.', { region: T.region(next).name });
    if (news) news(text); else chat(s, (GG.rival && GG.rival.frontSpeaker && GG.rival.frontSpeaker(s)) || 'dj', text, null, 'news');   // v0.9: the rival's own frontman
    GG.emit('tour:rival', { region: next, first: first });
    return next;
  };

  /* ---- The Global Gong -------------------------------------------------------------------------------------------- */
  function gongCase(s) {
    var t = T.ensure(s), Q = cfg().gong, broken = REGION_IDS.filter(function (id) { return rs(s, id).broken; }).length;
    var y0 = (s.year - 1) * WPY, fest = 0, recent = [];
    t.history.forEach(function (h) { if (h.end > y0 - WPY / 2) fest += h.festivals; });
    if (t.active) t.active.results.forEach(function (r) { if (r.festival) fest++; });
    var bigs = REGION_IDS.filter(function (id) { return rs(s, id).big; }).length;
    var score = Q.base + broken * Q.perBroken + Math.min(Q.fansMax, T.abroadFans(s) / Q.fansPer) + fest * Q.perFestival + bigs * Q.perBig + (T.payoffDone(s) ? Q.moose : 0);   // v0.9: any band's payoff
    return { nominated: broken >= Q.nominateBroken || fest > 0, score: score, broken: broken, festivals: fest };
  }
  T.gong = function (s) {
    var t = T.ensure(s), G = K().gong || {}, done = t.gongs.filter(function (g) { return g.year === s.year; })[0] || null, c = gongCase(s);
    return { name: G.name || 'The Global Gong', week: G.week || 22, city: G.city || 'Amsterdam', year: s.year, eligible: s.era === 'world',
      nominated: c.nominated, case: c, result: done, past: t.gongs.slice() };
  };
  T.runGong = function (s) {
    var t = T.ensure(s), done = t.gongs.filter(function (g) { return g.year === s.year; })[0];
    if (done) return done;
    if (s.era !== 'world') return null;
    var Q = cfg().gong, G = K().gong || { nominees: [] }, c = gongCase(s), rng = seeded(s, 'gong|' + s.year, 0);
    if (!c.nominated) { done = { year: s.year, week: s.totalWeek, nominated: false, won: false }; t.gongs.push(done); return done; }
    var field = rng.shuffle(G.nominees).slice(0, 3).map(function (n) { return { id: n.id, name: n.name, from: n.from, score: n.strength + rng.range(-Q.noise, Q.noise) }; });
    var rv = s.rival, rr = Object.keys(t.rival).length;
    if (rv && rr && rv.cracked !== 'breakup') field.push({ id: rv.id, name: GG.rival ? GG.rival.name(s) : 'the other band', from: 'Canada', rival: true, score: 50 + rr * 4 + rng.range(-Q.noise, Q.noise) });
    var you = c.score + rng.range(-Q.noise, Q.noise), top = field.reduce(function (b, x) { return !b || x.score > b.score ? x : b; }, null);
    var won = !top || you >= top.score;
    done = { year: s.year, week: s.totalWeek, nominated: true, won: won, score: Math.round(you), winner: won ? 'you' : top.name,
      against: field.map(function (x) { return { id: x.id, name: x.name, from: x.from, rival: !!x.rival, score: Math.round(x.score) }; }) };
    t.gongs.push(done);
    if (won) {
      var gain = Math.min(Q.fansMax, Math.round(s.fans * Q.fans));
      fx(s, { fund: Q.prize, fans: gain, buzz: Q.buzz });
      (s.trophies || (s.trophies = [])).push({ kind: 'gong', title: 'The Global Gong', year: s.year });
      done.prize = Q.prize; done.fans = gain;
      chat(s, 'dj', fill(s, pickText(s, seeded(s, 'line|gongWon'), ['lines', 'gongWon'], '{band} won the Global Gong.')), null, 'news');
    } else chat(s, 'dj', fill(s, pickText(s, seeded(s, 'line|gongLost'), ['lines', 'gongLost'], 'The Global Gong went to {venue}.'), { venue: top.name }), null, 'news');
    GG.emit('tour:gong', { result: done });
    return done;
  };

  /* ---- Views ---------------------------------------------------------------------------------------------------------- */
  T.map = function (s) {
    var t = T.ensure(s);
    return T.regions().map(function (R) {
      var r = t.regions[R.id], thr = T.threshold(s, R.id), inv = openInvite(s, R.id), f = T.fit(s.genre, R.id);
      return { id: R.id, name: R.name, short: R.short, icon: R.icon, blurb: R.blurb, pin: R.pin || null, unlocked: !!r.unlocked, via: r.via,
        threshold: thr, need: Math.max(0, thr - s.fans), progress: Math.min(1, s.fans / thr), worldEra: s.era === 'world',
        regionFans: r.fans, scene: R.scene, broken: !!r.broken, breakAt: R.breakAt, big: r.big, rivalFirst: r.rivalFirst, rivalToured: t.rival[R.id] || null,
        invite: inv, fit: f, fitLabel: fitLabel(f), tours: r.tours, gigs: r.gigs, best: r.best, here: T.regionOf(s) === R.id,
        season: GG.calendar && GG.calendar.seasonIn ? GG.calendar.seasonIn(R.id, s.week) : null };
    });
  };
  T.regionView = function (s, region) {
    var R = T.region(region); if (!R) return null;
    var t = T.ensure(s), visited = {};
    t.history.forEach(function () {});
    (t.active ? t.active.results : []).forEach(function (r) { visited[r.city] = true; });
    var cities = T.cities(region).map(function (c) {
      return { id: c.id, name: c.name, x: c.x, y: c.y, site: c.site, blurb: c.blurb, venues: T.venues(region).filter(function (v) { return v.city === c.id; }).map(function (v) { return { id: v.id, name: v.name, tier: v.tier, capacity: v.capacity, festival: !!v.festival, hall: !!v.hall, weeks: v.weeks || null }; }),
        here: T.here(s) === c.id };
    });
    var seasonId = GG.calendar && GG.calendar.seasonIn ? GG.calendar.seasonIn(region, s.week) : null;
    return { region: R, state: t.regions[region], threshold: T.threshold(s, region), unlocked: T.unlocked(s, region), cities: cities,
      packages: T.packages(s, region), vehicles: T.vehicles(region), stays: T.stays(), extras: T.extras(), season: seasonId,
      holidays: (K().holidays || []).filter(function (h) { return h.region === region; }), invite: openInvite(s, region), fit: T.fit(s.genre, region) };
  };
  T.status = function (s) {
    var t = T.ensure(s), a = t.active, st = T.stop(s), i = a ? idxOf(s, a) : -1, H = cfg().homesick;
    return { era: s.era, worldEra: s.era === 'world', active: a, booked: !!(a && a.status === 'booked'), onTour: !!st, stop: st, index: i,
      weeksLeft: a && st ? a.stops.length - 1 - i : null, departsIn: a && a.status === 'booked' ? a.start - s.totalWeek : null, here: st ? st.city : null,
      region: T.regionOf(s), homesick: t.homesick, homesickLabel: t.homesick >= H.restAt ? 'Desperately homesick' : t.homesick >= H.moodAt ? 'Homesick' : t.homesick >= 20 ? 'Missing home' : 'Fine',
      forcedRest: !!st && t.homesick >= H.restAt, blocks: T.allowedBlocks(s), last: t.history[t.history.length - 1] || null, abroadFans: T.abroadFans(s) };
  };
  T.summary = function (s) { var t = T.ensure(s); return t.history[t.history.length - 1] || null; };
  // Regional charts: your best song abroad, by region fans (a view; nothing stored).
  T.charts = function (s) {
    var best = GG.songs && GG.songs.best ? GG.songs.best(s, 1)[0] : null;
    return T.regions().map(function (R) {
      var r = rs(s, R.id), share = r.fans / R.scene, big = r.big;
      var pos = big ? Math.max(1, 3 - (big.choice === 'fly' ? 2 : big.choice === 'video' ? 1 : 0)) : r.fans < 300 ? null : Math.max(1, Math.round(60 - share * 120));
      return { region: R.id, chart: R.chart, song: big ? big.title : best ? best.title : null, pos: pos && pos <= 50 ? pos : null };
    });
  };

  /* ---- Bots (botTour) ------------------------------------------------------------------------------------------------- */
  // The bot's choices for a package (hostel + publicist + the comfiest vehicle when the good bot is rich).
  function botChoices(s, style, region) {
    var rich = s.fund > 15000, ch = { stay: style === 'good' ? 'hostel' : 'couch', extra: style === 'good' && rich ? 'publicist' : 'none' };
    if (style === 'good' && rich) ch.vehicle = T.vehicles(region).sort(function (a, b) { return b.comfort - a.comfort; })[0].id;
    return ch;
  }
  // v0.9: a story payoff package (owner Q3: needs met, never fired) leaves in a ~2-week window a year, so a bot books it the
  // way a player who has waited for it would: no gap since the last tour, a small cushion (bot.payoffCushion), the promoter's
  // floor when hostels don't fit the fund, and only a really fried band (bot.payoffBurnout) stays home. Hail Damage's Moose
  // Opera counts too once its album is ready.
  function botPayoff(s, style, B) {
    if (s.burnout >= (B.payoffBurnout != null ? B.payoffBurnout : 80)) return null;
    var cushion = B.payoffCushion != null ? B.payoffCushion : 500, pick = null;
    REGION_IDS.forEach(function (id) {
      if (pick || !T.unlocked(s, id)) return;
      K().packages.forEach(function (p) {
        if (pick || p.region !== id || !p.needs) return;
        [botChoices(s, style, id), { stay: 'couch', extra: 'none' }].forEach(function (ch) {   // (else the promoter's floor: it's the story)
          if (pick) return;
          var c = T.canBook(s, p.id, ch);
          if (c.ok && s.fund >= c.quote.total + cushion) pick = { id: p.id, ch: ch };
        });
      });
    });
    return pick;
  }
  T.botWeek = function (s, style) {
    if (s.era !== 'world' || s.ended) return null;
    var t = T.ensure(s), B = cfg().bot;
    if (t.active) return null;
    var fin = GG.rival && GG.rival.cfg ? GG.rival.cfg().final : null;
    if (fin && s.year === fin.year && s.week >= fin.week - 8 && s.week <= fin.week) return null;   // bots stay home to prepare for the Sad Dome
    var pay = botPayoff(s, style, B);
    if (pay) { var tp = T.book(s, pay.id, pay.ch); if (tp && !tp.error) return tp; }
    var last = t.history[t.history.length - 1];
    if (last && s.totalWeek - last.end < B.gap) return null;
    if (s.burnout >= 60 || (style !== 'good' && !seeded(s, 'bot').chance(B.avgChance))) return null;   // tired bands stay home
    var cushion = style === 'good' ? B.goodCushion : B.avgCushion, best = null, bestV = -Infinity;
    REGION_IDS.forEach(function (id) {
      if (!T.unlocked(s, id)) return;
      K().packages.filter(function (p) { return p.region === id; }).forEach(function (p) {
        var ch = botChoices(s, style, id);
        var c = T.canBook(s, p.id, ch);
        if (!c.ok || s.fund < c.quote.total + cushion) return;
        var q = c.quote, v = q.fansEst * 2.2 + q.payEst * 0.55 - q.total + (p.festival ? 1500 : 0) + (p.needs ? 3000 : 0);   // v0.9: any payoff package
        if (style !== 'good') v += seeded(s, 'botpick|' + p.id).range(-1500, 1500);
        if (v > bestV) { bestV = v; best = { id: p.id, ch: ch }; }
      });
    });
    if (!best || (style === 'good' && bestV < 0)) return null;
    var tr = T.book(s, best.id, best.ch);
    return tr && !tr.error ? tr : null;
  };
  T.botTour = T.botWeek;
  T.botPlan = function (s, style) {
    var t = T.ensure(s), B = cfg().bot, plan = [];
    if (t.homesick >= B.restHomesick || s.burnout >= 55) plan.push('rest');
    plan.push('promote', 'rehearse', 'promote', 'rest');
    if (style !== 'good' && seeded(s, 'botplan').chance(0.3)) plan.reverse();
    return plan.slice(0, C.BLOCKS_PER_WEEK);
  };

  /* ---- Saves: v7 -> v8 (idempotent). Chained onto GG.save.migrate. ------------------------------------------------ */
  T.migrate = function (s) {
    if (!s || typeof s !== 'object') return s;
    T.ensure(s);
    var E = econ().eras || {};
    if (E.worldEnabled && s.era === 'signed' && s.milestones && s.milestones.worldReady) {
      s.era = 'world';
      (s.eraHistory = Array.isArray(s.eraHistory) ? s.eraHistory : [{ era: 'garage', week: 1 }]).push({ era: 'world', week: s.milestones.worldReady });
    }
    if (typeof s.v !== 'number' || s.v < 8) s.v = 8;
    return s;
  };
  if (GG.save && GG.save.migrate && !GG.save.migrate.tour) {
    var prevMigrate = GG.save.migrate;
    GG.save.migrate = function (s) { return T.migrate(prevMigrate(s)); };
    GG.save.migrate.tour = true;
  }

  GG.registerDebug('tour', function () {
    var s = GG.state; if (!s) return { state: null };
    var st = T.status(s);
    return { era: s.era, onTour: st.onTour, booked: st.booked, here: st.here, region: st.region, homesick: st.homesick,
      active: st.active ? { id: st.active.id, packageId: st.active.packageId, status: st.active.status, start: st.active.start, index: st.index } : null,
      unlocked: REGION_IDS.filter(function (id) { return T.unlocked(s, id); }), abroadFans: st.abroadFans, gongs: s.tour.gongs.length, moose: !!s.tour.moose,
      payoffs: Object.keys(s.tour.payoffs || {}) };
  });
})(window.GG);
