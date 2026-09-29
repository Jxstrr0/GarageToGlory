// 26_sim_world.js: the world outside the garage (v0.3, WORLD agent). The weekly gig board (listings), the three
// pay deals, opening slots (sometimes for your rival), venue reputation + the banned wall, genre-fit comedy,
// road km + gas from content/map.js, the van (The Moose Hearse: condition / space / comfort, wear per km,
// burnout on long drives, breakdowns only once the garage-era protection is off) and road trips + road cards.
// Pure sim: no DOM, no audio. Randomness only from rngs passed in or seeded ones (the board and the banter use
// their own RNG seeded by career seed + week, so they never shift the career RNG).
//   GIG (listing) = contracts GIG + { id, km, catch, minFans, fit, setSize, repLevel, rebook, clash, opening: null|
//                   { id, name, genre, draw, rival } }
//   state: listings [GIG], listingsWeek, bookPick (listing id | 'skip' | null), venueRep { id: -3..3 }, banned [id],
//          van VAN (+ trips, breakdowns), trip TRIP|null
//   TRIP = { w, venueId, from, to, fromName, toName, km, highway, season, night, cardId, resolved, choice, outcome,
//            deltas, success, banter: [{ who, text }] }
(function (GG) {
  var C = GG.contracts, U = GG.util;
  var world = GG.world = GG.world || {};
  var CARD_ONLY = 99999;

  // Tunables. content/economy.js may override any of them with an `economy.world` block (merged one level deep).
  var DEFAULTS = {
    listings: [3, 6],            // gigs on the board each week (fewer when not enough venues are in reach)
    maxTier: 2,                  // v0.3: DIY + bars & clubs
    kmSoft: 150,                 // a venue this far from home is half as likely to be listed
    gasPerKm: 0.25, gasMin: 5,   // $ per km driven (there and back); city driving costs gasMin
    repPay: 0.06, repWeight: 0.35,
    repDelta: { S: 2, A: 1, B: 0, C: 0, D: -2 },
    repRange: [-3, 3], banAt: -3, rebookAt: 2,
    fresh: [0.4, 0.6, 0.8],      // new-fan factor when you played the same venue 1 / 2 / 3 weeks ago (same faces)
    tierWeight: { 1: 1, 2: 1.3 }, bigBandTier1: 250,
    clashFit: 0.45, hazardPay: 1.25,   // genre fit below clashFit: flat deals pay hazard rates, boots fly
    opening: { chance: 0.4, minFans: 20, needFrac: 0.35, pay: [20, 45], exposureChance: 0.35, setSize: 2,
               slice: 0.45, fanShare: 0.5, rivalChance: 0.08, rivalMinFans: 60, rivalDraw: 260 },
    road: { chanceLocal: 0.2, chanceLong: 0.9, longKm: 100 },
    van: { condition: 72, space: 3, comfort: 2, comfortMax: 5, wearPerKm: 0.008, wearBase: 0.3,
           burnoutFromKm: 60, burnoutPer100: 0.5, tiredAt: 30, breakdownK: 0.5, towCost: [60, 140],
           repairPerPoint: 3, repairStep: 20 }
  };
  function cfg() {
    var o = GG.content.economy && GG.content.economy.world;
    if (!o) return DEFAULTS;
    var out = {};
    for (var k in DEFAULTS) {
      var d = DEFAULTS[k], v = o[k];
      out[k] = v === undefined ? d : (d && typeof d === 'object' && !Array.isArray(d)) ? Object.assign({}, d, v) : v;
    }
    return out;
  }
  world.cfg = cfg;
  function econ() { return GG.content.economy; }
  function rngRound(x, rng) { var f = Math.floor(x); return f + (rng.chance(x - f) ? 1 : 0); }
  function seeded(state, tag) { return GG.RNG(GG.hashSeed((state.seed >>> 0) + '|' + tag + '|' + state.totalWeek)); }
  function lines(key) { return (GG.content.lines && GG.content.lines[key]) || null; }
  function pickLine(state, rng, key, fallback) { return GG.career.pickLine(state, rng, lines(key), fallback); }

  /* ---- Map: cities, road km (shortest paths), gas, seasons ---------------------------------------- */
  function map() { return GG.content.map || { cities: {}, roads: [] }; }
  world.map = map;
  world.cityId = function (x) {
    var cs = map().cities;
    if (!x) return null;
    if (cs[x]) return x;
    var k = String(x).toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_+|_+$/g, '');
    if (cs[k]) return k;
    for (var id in cs) if (cs[id].name === x) return id;
    return null;
  };
  world.city = function (x) { var id = world.cityId(x); return id ? map().cities[id] : null; };
  var graph = null, graphOf = null;
  function paths() {   // Floyd–Warshall over a handful of cities, cached per map object
    var m = map();
    if (graph && graphOf === m) return graph;
    var ids = Object.keys(m.cities), d = {}, nx = {}, hw = {};
    ids.forEach(function (a) { d[a] = {}; nx[a] = {}; hw[a] = {}; ids.forEach(function (b) { d[a][b] = a === b ? 0 : Infinity; nx[a][b] = b; }); });
    (m.roads || []).forEach(function (r) {
      if (!d[r[0]] || !d[r[1]] || r[2] >= d[r[0]][r[1]]) return;
      d[r[0]][r[1]] = d[r[1]][r[0]] = r[2]; hw[r[0]][r[1]] = hw[r[1]][r[0]] = r[3] || '';
    });
    ids.forEach(function (k) { ids.forEach(function (i) { ids.forEach(function (j) {
      if (d[i][k] + d[k][j] < d[i][j]) { d[i][j] = d[i][k] + d[k][j]; nx[i][j] = nx[i][k]; }
    }); }); });
    graphOf = m; graph = { d: d, nx: nx, hw: hw };
    return graph;
  }
  // One-way road km between two cities (ids or names). Unknown cities count as local (0).
  world.km = function (from, to) {
    var a = world.cityId(from), b = world.cityId(to);
    if (!a || !b) return 0;
    var v = paths().d[a][b];
    return isFinite(v) ? v : 0;
  };
  world.route = function (from, to) {
    var a = world.cityId(from), b = world.cityId(to), g = paths(), out = a ? [a] : [];
    if (!a || !b || !isFinite(g.d[a][b])) return out;
    while (a !== b && out.length < 20) { a = g.nx[a][b]; out.push(a); }
    return out;
  };
  world.highway = function (from, to) {
    var r = world.route(from, to);
    return r.length > 1 ? paths().hw[r[r.length - 2]][r[r.length - 1]] || paths().hw[r[0]][r[1]] || '' : '';
  };
  world.home = function (state) { return world.cityId(state && state.city) || 'saskatoon'; };
  world.gasFor = function (state, city) {
    var K = cfg();
    return Math.max(K.gasMin, Math.round(world.km(world.home(state), city) * 2 * K.gasPerKm));
  };
  // Seasons by week of year (contracts): summer 1–6, fall 7–10, winter 11–18, spring 19–22, early summer 23–24.
  world.season = function (week) { return week <= 6 ? 'summer' : week <= 10 ? 'fall' : week <= 18 ? 'winter' : week <= 22 ? 'spring' : 'summer'; };

  /* ---- Venues: reputation, bans, genre fit ------------------------------------------------------- */
  function venues() { return GG.content.venues || []; }
  function venueById(id) { return GG.gig && GG.gig.venue ? GG.gig.venue(id) : venues().filter(function (v) { return v.id === id; })[0] || null; }
  function fitOf(v, genre) { var f = v && v.genreFit && v.genreFit[genre]; return f != null ? U.clamp(f, 0, 1) : 0.7; }
  world.rep = function (state, id) { var r = state.venueRep && state.venueRep[id]; return isFinite(r) ? r : 0; };
  world.isBanned = function (state, id) { return !!(state.banned && state.banned.indexOf(id) >= 0); };
  // 1 = a fresh crowd; less when you played this venue in the last few weeks (the same faces, fewer new fans).
  world.freshness = function (state, id) {
    var last = state.venueLast && state.venueLast[id], F = cfg().fresh, ago = isFinite(last) ? state.totalWeek - last : Infinity;
    return ago >= 1 && ago <= F.length ? F[ago - 1] : 1;
  };
  // A venue you could headline this week: listed venue, tier in range, enough fans, not banned, not card-only.
  world.bookable = function (state, v) {
    return !!v && (v.minFans || 0) < CARD_ONLY && v.tier <= cfg().maxTier && !world.isBanned(state, v.id) && state.fans >= (v.minFans || 0);
  };
  world.fitLabel = function (fit) {
    return fit >= 0.85 ? { id: 'great', label: 'Your crowd', icon: '🤘' } : fit >= 0.65 ? { id: 'good', label: 'Decent fit', icon: '👍' }
      : fit >= cfg().clashFit ? { id: 'meh', label: 'Tough room', icon: '😬' } : { id: 'clash', label: 'Wrong crowd: expect flying boots', icon: '👢' };
  };
  world.repLabel = function (rep) {
    return rep >= 2 ? 'They love you' : rep === 1 ? 'Liked here' : rep === 0 ? '' : rep === -1 ? 'On thin ice' : 'One more bad night and you\'re banned';
  };
  function openingNeed(v) { var O = cfg().opening; return Math.max(O.minFans, Math.round((v.minFans || 0) * O.needFrac)); }

  /* ---- Listings ------------------------------------------------------------------------------------- */
  // Adds the board fields to a GIG (km, gas from the map, catch, fit, set size, rep, clash).
  world.decorate = function (state, g) {
    if (!g) return g;
    var v = venueById(g.venueId) || {}, fit = fitOf(v, state.genre);
    g.km = world.km(world.home(state), g.city);
    g.gas = world.gasFor(state, g.city);
    if (g.catch == null) g.catch = v.catch || '';
    if (g.minFans == null) g.minFans = v.minFans >= CARD_ONLY ? 0 : (v.minFans || 0);
    g.fit = Math.round(fit * 100) / 100;
    if (g.setSize == null) g.setSize = v.setSize || 3;
    g.repLevel = world.rep(state, g.venueId);
    g.rebook = g.repLevel >= cfg().rebookAt;
    g.clash = fit < cfg().clashFit;
    if (g.opening === undefined) g.opening = null;
    return g;
  };
  // A listing for venue v. opts: { id, source, deal, opening: { id, name, genre, draw, rival } }.
  world.makeListing = function (state, v, rng, opts) {
    opts = opts || {};
    var K = cfg(), op = opts.opening || null, fit = fitOf(v, state.genre), rep = world.rep(state, v.id);
    var deals = op ? [rng.chance(K.opening.exposureChance) ? 'exposure' : 'flat']
      : (v.deals && v.deals.length ? v.deals : [v.deal || 'exposure']);
    var deal = opts.deal && deals.indexOf(opts.deal) >= 0 ? opts.deal : rng.pick(deals), pay = 0;
    if (op) pay = deal === 'flat' ? Math.round(rng.int(K.opening.pay[0], K.opening.pay[1]) / 5) * 5 : 0;
    else if (deal !== 'exposure') {
      var range = (v.payRange && v.payRange[deal]) || [v.pay || 0, v.pay || 0];
      var mult = Math.max(0.5, 1 + K.repPay * rep) * (fit < K.clashFit && deal === 'flat' ? K.hazardPay : 1);
      pay = deal === 'door' ? Math.round(rng.range(range[0], range[1]) * mult * 2) / 2
        : Math.round(rng.int(range[0], range[1]) * mult / 5) * 5;
    }
    var g = { id: opts.id || null, venueId: v.id, name: v.name, city: v.city, tier: v.tier, kind: v.kind, capacity: v.capacity,
      deal: deal, pay: pay, gas: 0, quirk: v.quirk || '', source: opts.source || 'book', catch: v.catch || '',
      minFans: op ? openingNeed(v) : (v.minFans || 0), setSize: op ? K.opening.setSize : (v.setSize || 3), opening: op };
    return world.decorate(state, g);
  };
  function listWeight(state, v) {
    var K = cfg(), km = world.km(world.home(state), v.city);
    return (0.3 + fitOf(v, state.genre)) / (1 + km / K.kmSoft) * Math.max(0.2, 1 + K.repWeight * world.rep(state, v.id))
      * (K.tierWeight[v.tier] || 1) * (v.tier === 1 && state.fans > K.bigBandTier1 ? 0.5 : 1) * (0.5 + 0.5 * world.freshness(state, v.id));
  }
  function headliner(state, v, rng) {
    var K = cfg().opening, band = GG.career.band(state.bandId), rival = band && band.rival && GG.content.rivals && GG.content.rivals[band.rival];
    if (rival && state.fans >= K.rivalMinFans && rng.chance(K.rivalChance)) {
      return { id: rival.id, name: rival.name, genre: rival.genre, draw: K.rivalDraw, rival: true };
    }
    var list = GG.content.headliners || [];
    var h = list.length ? rng.weighted(list, function (x) { return (x.genre === state.genre ? 3 : 1) * (x.city === v.city ? 2 : 1); }) : null;
    return h ? { id: h.id, name: h.name, genre: h.genre, draw: h.draw, rival: false } : null;
  }
  // This week's board: 3–6 gigs in reach (a rebook when a venue loves you, sometimes an opening slot).
  // Pure apart from the rng (default: seeded by career seed + week, so the career RNG never moves).
  world.listings = function (state, rng) {
    rng = rng || seeded(state, 'board');
    var K = cfg(), out = [], used = {};
    var pool = venues().filter(function (v) { return world.bookable(state, v); });
    var n = rng.int(K.listings[0], K.listings[1]);
    function add(v, opts) { used[v.id] = true; out.push(world.makeListing(state, v, rng, opts)); }
    var fans = pool.filter(function (v) { return world.rep(state, v.id) >= K.rebookAt; });
    if (fans.length) add(rng.weighted(fans, function (v) { return 1 + world.rep(state, v.id); }), {});
    if (state.fans >= K.opening.minFans && rng.chance(K.opening.chance)) {
      var rooms = venues().filter(function (v) {
        return v.tier >= 2 && v.minFans < CARD_ONLY && !world.isBanned(state, v.id) && !used[v.id] && state.fans >= openingNeed(v);
      });
      var room = rooms.length ? rng.weighted(rooms, function (v) { return listWeight(state, v); }) : null;
      var h = room ? headliner(state, room, rng) : null;
      if (h) add(room, { opening: h });
    }
    while (out.length < n) {
      var left = pool.filter(function (v) { return !used[v.id]; });
      if (!left.length) break;
      add(rng.weighted(left, function (v) { return listWeight(state, v); }), {});
    }
    out.sort(function (a, b) { return a.km - b.km || b.tier - a.tier; });
    out.forEach(function (g, i) { g.id = 'L' + state.totalWeek + '-' + (i + 1); });
    return out;
  };
  // The board for the current week (regenerated once per week; stored in state so saves keep it).
  world.refresh = function (state, force) {
    if (!force && state.listingsWeek === state.totalWeek && Array.isArray(state.listings)) return state.listings;
    state.listings = world.listings(state);
    state.listingsWeek = state.totalWeek;
    return state.listings;
  };
  world.board = function (state) { return world.refresh(state); };
  world.find = function (state, id) { return (state.listings || []).filter(function (l) { return l.id === id; })[0] || null; };
  world.canBook = function (state, l) { return !!l && state.fans >= (l.minFans || 0) && !world.isBanned(state, l.venueId); };

  // An offer that arrives on its own (once you have fans): like v0.1, skewed to better venues, genre fit and rep.
  world.offer = function (state, rng) {
    var K = cfg(), maxTier = (econ() && econ().offerMaxTier) || 2, home = world.home(state);
    var pool = venues().filter(function (v) { return world.bookable(state, v) && v.tier <= maxTier; });
    var v = pool.length ? rng.weighted(pool, function (x) {
      return fitOf(x, state.genre) * x.tier * Math.max(0.2, 1 + K.repWeight * world.rep(state, x.id)) / (1 + world.km(home, x.city) / K.kmSoft);
    }) : null;
    return v ? world.makeListing(state, v, rng, { source: 'offer', id: 'O' + state.totalWeek }) : null;
  };

  /* ---- Booking: the Book block ---------------------------------------------------------------------- */
  // Stores the board pick for this week's Book block: a listing id, or 'skip' (no gig). Returns the listing or null.
  world.pick = function (state, id) {
    if (id === 'skip') { state.bookPick = 'skip'; return null; }
    var l = world.find(state, id);
    if (!l || !world.canBook(state, l)) return null;
    state.bookPick = l.id;
    return l;
  };
  // Consumes the pick (the UI's, or the bot's). No pick at all = an automatic best pick (v0.1 behaviour for flows
  // without a board). Returns a GIG (a copy of the listing, source 'book') or null.
  world.takePick = function (state) {
    var pick = state.bookPick;
    state.bookPick = null;
    if (pick === 'skip') return null;
    world.refresh(state);
    var l = pick ? world.find(state, pick) : null;
    if (!l) { var id = world.botBook(state, 'good'); l = id !== 'skip' ? world.find(state, id) : null; }
    if (!l || !world.canBook(state, l)) return null;
    var g = U.clone(l); g.source = 'book';
    return g;
  };
  // A rough preview for the board and the bots: { crowd, pay, fans, net, burnout }.
  world.estimate = function (state, l) {
    var G = econ().gig, K = cfg(), v = venueById(l.venueId) || {}, fit = l.fit != null ? l.fit : fitOf(v, state.genre);
    var crowd = Math.min(l.capacity || 0, Math.round((v.walkIns || 0) + state.fans * G.fanDraw + state.buzz * G.buzzDraw));
    var slice = l.opening ? Math.max(0, Math.min((l.capacity || 0) - crowd, Math.round(l.opening.draw * K.opening.slice))) : 0;
    var pay = l.deal === 'flat' ? l.pay : l.deal === 'door' ? Math.round(l.pay * crowd) : 0;
    var head = Math.max(0, 1 - state.fans / G.localScene);
    var fans = Math.round((crowd * G.conversion.B * (0.5 + 0.5 * fit) * (l.deal === 'exposure' ? G.exposureFanBonus : 1)
      + slice * G.conversion.B * K.opening.fanShare) * head);
    fans = Math.round(fans * world.freshness(state, l.venueId));
    return { crowd: crowd + slice, pay: pay, fans: fans, net: pay - (l.gas || 0), burnout: tripBurnout(state, l.km || 0) };
  };
  world.value = function (state, l) {
    var W = econ().bot.value, e = world.estimate(state, l), fit = l.fit != null ? l.fit : 0.7;
    return e.net * (state.fund < W.broke ? W.fundBroke : W.fund) + e.fans * W.fans - e.burnout * W.burnout + (fit - 0.5) * 4;
  };
  // Bots pick a listing id ('skip' when nothing is worth it). 'good' = best value; 'avg' = best half the time.
  world.botBook = function (state, style) {
    var list = world.refresh(state).filter(function (l) { return world.canBook(state, l); });
    if (!list.length) return 'skip';
    var best = null, bestV = -Infinity;
    list.forEach(function (l) { var v = world.value(state, l); if (v > bestV) { bestV = v; best = l; } });
    if (style === 'avg') {
      var rng = GG.rngFor(state);
      return rng.chance(econ().bot.avgSmart) ? best.id : rng.pick(list).id;
    }
    return bestV > 0 ? best.id : 'skip';
  };

  /* ---- After the gig: opening slots, genre comedy, reputation, travel ------------------------------ */
  // Before GG.gig.applyResult: the headliner's crowd (opening slots), genre-clash comedy. Marks r.shaped.
  world.shape = function (state, g, r, rng) {
    if (!g || !r || r.shaped) return r;
    var K = cfg(), G = econ().gig;
    r.shaped = true;
    r.lines = r.lines || [];
    r.km = g.km != null ? g.km : world.km(world.home(state), g.city);
    r.opening = g.opening || null;
    if (g.opening) {
      var room = Math.max(0, (g.capacity || r.capacity || 0) - (r.crowd || 0));
      var slice = Math.min(room, Math.round(g.opening.draw * K.opening.slice));
      r.crowd = (r.crowd || 0) + slice;
      var x = slice * (G.conversion[r.grade] || 0) * K.opening.fanShare * Math.max(0, 1 - state.fans / G.localScene);
      r.fans = (r.fans || 0) + rngRound(x, rng);
      if (g.deal === 'door' && GG.gig && GG.gig.payFor) r.pay = GG.gig.payFor(g, r.crowd);
      r.lines.push('Opening for ' + g.opening.name + '. ' + pickLine(state, rng, 'openingSlot', 'You stole a few of their fans.'));
      if (g.opening.rival) r.lines.push("Afterwards " + g.opening.name + "'s frontman shakes your hand and calls you 'buddy'. Twice.");
    }
    if (g.clash) r.lines.push(pickLine(state, rng, 'genreClash', 'Wrong crowd. The boots came out. You still got paid.'));
    var fresh = world.freshness(state, g.venueId);
    if (fresh < 1 && r.fans > 0) {
      r.fans = Math.round(r.fans * fresh);
      r.lines.push(pickLine(state, rng, 'sameCrowd', 'Same faces as last time. Fewer new ones.'));
    }
    return r;
  };
  // After GG.gig.applyResult: venue rep (+ rebook / ban), van wear, long-drive burnout, breakdowns.
  // Adds r.rep (the rep change, a number), r.repAfter (-3..3), r.banned (bool) and
  // r.travel = { km, driven, wear, burnout, breakdown: null|{ cost } }. Once per result.
  world.afterGig = function (state, g, r, rng) {
    if (!g || !r || r.travel) return r;
    var K = cfg(), d = r.deltas || (r.deltas = {}), id = g.venueId;
    if (!state.venueRep) state.venueRep = {};
    if (!state.banned) state.banned = [];
    var before = world.rep(state, id), delta = K.repDelta[r.grade] || 0;
    if (g.opening) delta = U.clamp(delta, -1, 1);   // it's the headliner's night: your rep moves less
    var after = U.clamp(before + delta, K.repRange[0], K.repRange[1]);
    state.venueRep[id] = after;
    (state.venueLast || (state.venueLast = {}))[id] = state.totalWeek;
    var banned = after <= K.banAt && !world.isBanned(state, id);
    if (banned) state.banned.push(id);
    r.rep = after - before; r.repAfter = after; r.banned = banned;
    r.lines = r.lines || [];
    if (banned) r.lines.push(pickLine(state, rng, 'venueBanned', 'Banned. Your photo goes on the wall.'));
    else if (after > before && after >= K.rebookAt) r.lines.push(pickLine(state, rng, 'venueUp', 'They want you back.'));
    else if (after < before) r.lines.push(pickLine(state, rng, 'venueDown', 'The owner is not impressed.'));
    r.travel = world.travel(state, g, rng, d);
    var t = r.travel;
    if (t.breakdown) r.lines.push(pickLine(state, rng, 'breakdown', 'The van broke down.') + ' (Tow: ' + U.fmtMoney(t.breakdown.cost) + ')');
    else if (t.wear && world.van(state).condition < K.van.tiredAt) r.lines.push(pickLine(state, rng, 'vanTired', 'The van is tired.'));
    return r;
  };
  function tripBurnout(state, km) {
    var K = cfg().van, van = world.van(state);
    return km < K.burnoutFromKm ? 0 : Math.round(km / 100 * (K.comfortMax + 1 - U.clamp(van.comfort, 1, K.comfortMax)) * K.burnoutPer100);
  }
  world.tripBurnout = tripBurnout;
  world.breakdownChance = function (state, km) {
    var K = cfg().van, van = world.van(state);
    if (state.protected) return 0;   // garage era: nothing breaks down (condition still drops)
    return U.clamp(Math.pow(1 - van.condition / 100, 2) * (0.2 + km / 300) * K.breakdownK, 0, 0.5);
  };
  // One round trip to gig g: wear, burnout from long drives, maybe a breakdown (never while state.protected).
  world.travel = function (state, g, rng, d) {
    var K = cfg().van, van = world.van(state);
    var km = g.km != null ? g.km : world.km(world.home(state), g.city), driven = km * 2;
    var before = van.condition;
    van.condition = U.clamp(van.condition - rngRound(driven * K.wearPerKm + K.wearBase, rng), 0, 100);
    van.km += driven; van.trips = (van.trips || 0) + 1;
    var burn = tripBurnout(state, km);
    if (burn) GG.career.applyEffects(state, { burnout: burn }, d);
    var out = { km: km, driven: driven, wear: before - van.condition, burnout: burn, breakdown: null };
    if (rng.chance(world.breakdownChance(state, km))) {
      var cost = rng.int(K.towCost[0], K.towCost[1]);
      GG.career.applyEffects(state, { fund: -cost, burnout: 3, chemistry: -2 }, d);
      van.breakdowns = (van.breakdowns || 0) + 1;
      out.breakdown = { cost: cost };
    }
    if (van.condition !== before && d) { d.van = d.van || {}; d.van.condition = (d.van.condition || 0) + van.condition - before; }
    return out;
  };

  /* ---- The van ---------------------------------------------------------------------------------------- */
  world.defaultVan = function () {
    var K = cfg().van;
    return { id: 'moose_hearse', name: 'The Moose Hearse', condition: K.condition, space: K.space, comfort: K.comfort, km: 0, trips: 0, breakdowns: 0 };
  };
  world.van = function (state) { if (!state.van || typeof state.van !== 'object') state.van = world.defaultVan(); return state.van; };
  world.vanLabel = function (condition) {
    return condition >= 80 ? 'Purring' : condition >= 60 ? 'Fine, mostly' : condition >= 40 ? 'Making a noise'
      : condition >= 20 ? 'Held together by tape' : 'A rolling miracle';
  };
  // Cousin Dale's garage: +repairStep condition for repairPerPoint $ a point. { cost, gain } (gain 0 = nothing to fix).
  world.repairQuote = function (state) {
    var K = cfg().van, van = world.van(state), gain = Math.max(0, Math.min(K.repairStep, 100 - van.condition));
    return { cost: gain * K.repairPerPoint, gain: gain };
  };
  world.repairVan = function (state) {
    var q = world.repairQuote(state);
    if (!q.gain || state.fund < q.cost) return null;
    var d = GG.career.applyEffects(state, { fund: -q.cost }, {});
    world.van(state).condition += q.gain;
    GG.emit('stats:changed', { state: state });
    return { cost: q.cost, gain: q.gain, deltas: d };
  };

  /* ---- Road trips + road cards ------------------------------------------------------------------------ */
  var roadIndex = {}, roadList = null;
  world.roadCardById = function (id) {
    var list = GG.content.roadCards || [];
    if (list !== roadList) { roadIndex = {}; roadList = list; list.forEach(function (c) { roadIndex[c.id] = c; }); }
    return roadIndex[id] || null;
  };
  var ROAD_GATE = { minKm: 1, maxKm: 1, season: 1 };
  world.roadGatePasses = function (state, gate, km, season) {
    if (!gate) return true;
    if (gate.minKm != null && km < gate.minKm) return false;
    if (gate.maxKm != null && km > gate.maxKm) return false;
    if (gate.season && gate.season.indexOf(season) < 0) return false;
    var rest = {}, any = false;
    for (var k in gate) if (!ROAD_GATE[k]) { rest[k] = gate[k]; any = true; }
    return !any || GG.career.gatePasses(state, rest);
  };
  function roadAvailable(state, c) {
    var seen = state.seenCards && state.seenCards[c.id];
    if (seen == null) return true;
    if (c.once !== false) return false;
    return state.totalWeek - seen >= (c.cooldown || 0);
  }
  // A road card for a trip of `km` one-way km (null: a quiet drive). Uses the rng passed in.
  world.drawRoad = function (state, km, season, rng) {
    var K = cfg().road;
    if (!rng.chance(km >= K.longKm ? K.chanceLong : K.chanceLocal)) return null;
    var list = (GG.content.roadCards || []).filter(function (c) { return world.roadGatePasses(state, c.gate, km, season) && roadAvailable(state, c); });
    return list.length ? rng.weighted(list, function (c) { return c.weight != null ? c.weight : 1; }) : null;
  };
  // 1–2 lines of van chatter (a bandmate or two; Kenji only ever gets a stage direction). Seeded, cosmetic.
  world.banter = function (state, n) {
    var rng = seeded(state, 'banter'), pools = lines('vanBanter') || {}, out = [];
    var talkers = rng.shuffle(state.members.filter(function (m) { return m.status === 'active' && pools[m.id] && pools[m.id].length; }));
    var kenji = (lines('vanKenji') || []).length && state.members.some(function (m) { return m.id === 'kenji' && m.status === 'active'; });
    n = n || 2;
    for (var i = 0; i < talkers.length && out.length < n; i++) {
      if (out.length && kenji && rng.chance(0.4)) break;   // sometimes the second line is Kenji, not talking
      out.push({ who: talkers[i].id, text: GG.career.fillText(state, rng.pick(pools[talkers[i].id])) });
    }
    if (out.length < n && kenji) out.push({ who: 'kenji', text: rng.pick(lines('vanKenji')) });
    return out;
  };
  world.trip = function (state) { return state.trip && state.trip.w === state.totalWeek ? state.trip : null; };
  // Starts (or returns) this week's trip to the booked gig: route, km, season, night, a road card, banter.
  // Draws the road card with the career RNG once per week (a reload mid-trip gets the same card back).
  world.startTrip = function (state, gig) {
    gig = gig || state.gig;
    if (!gig) return null;
    var t = world.trip(state);
    if (t && t.venueId === gig.venueId) return t;
    var rng = GG.rngFor(state), from = world.home(state), to = world.cityId(gig.city) || from;
    var km = gig.km != null ? gig.km : world.km(from, to), season = world.season(state.week);
    var card = world.drawRoad(state, km, season, rng);
    if (card) state.seenCards[card.id] = state.totalWeek;
    var fc = world.city(from), tc = world.city(to);
    t = state.trip = { w: state.totalWeek, venueId: gig.venueId, from: from, to: to,
      fromName: fc ? fc.name : state.city, toName: tc ? tc.name : gig.city, km: km, highway: world.highway(from, to),
      season: season, night: km >= 180 || season === 'winter', cardId: card ? card.id : null, resolved: !card,
      choice: null, outcome: null, deltas: null, success: null, banter: world.banter(state, 2) };
    return t;
  };
  world.roadCard = function (state) { var t = world.trip(state); return t && t.cardId ? world.roadCardById(t.cardId) : null; };
  function applyRoad(state, fx, d) {
    if (!fx) return d;
    if (fx.van && isFinite(fx.van.condition)) {
      var van = world.van(state), b = van.condition;
      van.condition = U.clamp(Math.round(b + fx.van.condition), 0, 100);
      if (van.condition !== b) { d.van = d.van || {}; d.van.condition = (d.van.condition || 0) + van.condition - b; }
    }
    var rest = {};
    for (var k in fx) if (k !== 'van') rest[k] = fx[k];
    GG.career.applyEffects(state, rest, d);
    return d;
  }
  // Resolves choice i of this trip's road card, like a Monday card (choice effects, then the roll's branch).
  world.resolveRoad = function (state, i) {
    var t = world.trip(state), card = t && !t.resolved ? world.roadCard(state) : null;
    var choice = card && card.choices && card.choices[i];
    if (!choice) return null;
    var rng = GG.rngFor(state), d = {}, success = null, outcome = choice.outcome || '';
    applyRoad(state, choice.effects, d);
    if (choice.roll) {
      success = rng.chance(GG.career.rollChance(state, choice.roll));
      var branch = success ? choice.roll.success : choice.roll.fail;
      if (branch) {
        applyRoad(state, branch.effects, d);
        if (branch.outcome) outcome = outcome ? outcome + ' ' + branch.outcome : branch.outcome;
      }
    }
    outcome = GG.career.fillText(state, outcome);
    t.resolved = true; t.choice = i; t.outcome = outcome; t.deltas = d; t.success = success;
    var res = { cardId: card.id, choice: i, outcome: outcome, deltas: d, success: success };
    GG.emit('road:resolved', res);
    GG.emit('stats:changed', { state: state });
    return res;
  };
  // Bots and auto-played weekends: start the trip and resolve its card with the bot's choice.
  world.autoTrip = function (state, style) {
    var t = world.startTrip(state);
    var card = t && !t.resolved ? world.roadCard(state) : null;
    if (card) world.resolveRoad(state, GG.career.botChoice(state, card, style || 'avg'));
    return t;
  };

  /* ---- Saves: v2 -> v3 defaults (idempotent). Wraps GG.save.migrate so every load passes through it. ---- */
  world.migrate = function (s) {
    if (!s || typeof s !== 'object') return s;
    if (!Array.isArray(s.listings)) s.listings = [];
    if (!isFinite(s.listingsWeek)) s.listingsWeek = 0;
    if (s.bookPick === undefined) s.bookPick = null;
    if (!s.venueRep || typeof s.venueRep !== 'object' || Array.isArray(s.venueRep)) s.venueRep = {};
    var R = cfg().repRange;
    Object.keys(s.venueRep).forEach(function (k) {
      var v = s.venueRep[k];
      if (!isFinite(v)) delete s.venueRep[k]; else if (v < R[0] || v > R[1] || v !== Math.round(v)) s.venueRep[k] = U.clamp(Math.round(v), R[0], R[1]);
    });
    if (!s.venueLast || typeof s.venueLast !== 'object' || Array.isArray(s.venueLast)) s.venueLast = {};
    if (!Array.isArray(s.banned)) s.banned = [];
    else if (s.banned.some(function (x) { return typeof x !== 'string'; })) s.banned = s.banned.filter(function (x) { return typeof x === 'string'; });
    var dv = world.defaultVan();
    if (!s.van || typeof s.van !== 'object' || Array.isArray(s.van)) s.van = dv;
    else Object.keys(dv).forEach(function (k) {
      if (typeof dv[k] === 'number') { if (!isFinite(s.van[k])) s.van[k] = dv[k]; }
      else if (typeof s.van[k] !== 'string') s.van[k] = dv[k];
    });
    if (s.van.condition < 0 || s.van.condition > 100) s.van.condition = U.clamp(s.van.condition, 0, 100);
    if (s.trip === undefined) s.trip = null;
    if (s.liveGig === undefined) s.liveGig = null;
    if (s.phase === 'gig' && !s.gig) s.phase = 'wrap';
    return s;
  };
  if (GG.save && GG.save.migrate && !GG.save.migrate.world) {
    var baseMigrate = GG.save.migrate;
    GG.save.migrate = function (s) { return world.migrate(baseMigrate(s)); };
    GG.save.migrate.world = true;
  }

  GG.registerDebug('world', function () {
    var s = GG.state; if (!s) return { state: null };
    var t = world.trip(s);
    return { listings: (s.listings || []).map(function (l) { return l.id + ':' + l.venueId + (l.opening ? '(open)' : ''); }),
      listingsWeek: s.listingsWeek, bookPick: s.bookPick, van: s.van, venueRep: s.venueRep, banned: s.banned,
      trip: t ? { to: t.to, km: t.km, card: t.cardId, resolved: t.resolved } : null };
  });
})(window.GG);
