// 26_sim_world.js: the world outside the garage (v0.3, WORLD agent). The weekly gig board (listings), the three
// pay deals, opening slots (sometimes for your rival), venue reputation + the banned wall, genre-fit comedy,
// road km + gas from content/map.js, the van (The Moose Hearse: condition / space / comfort, wear per km,
// burnout on long drives, breakdowns only once the garage-era protection is off) and road trips + road cards.
// v0.5 (CAREER): world.maxTier(state) (tier-3 theatres from the Signed era, economy.world.eraTier), world.scene(state)
// (fans gigs can reach per era; shape() rescales gig fans to it; theatres convert fewer new fans); afterGig takes the
// Signed-era management commission + theatre crew (r.commission, r.crew; economy.world.commission / crew).
// Pure sim: no DOM, no audio. Randomness only from rngs passed in or seeded ones (the board and the banter use
// their own RNG seeded by career seed + week, so they never shift the career RNG).
//   GIG (listing) = contracts GIG + { id, km, catch, minFans, fit, setSize, repLevel, rebook, clash, opening: null|
//                   { id, name, genre, draw, rival } } + v0.6 (23_sim_rival): stolen { by, defended, id }, showdown { kind, id },
//                   headliner, slot, prize (festival listings and BotB offers come from GG.rival.monday)
//   state: listings [GIG], listingsWeek, bookPick (listing id | 'skip' | null), venueRep { id: -3..3 }, banned [id],
//          van VAN (+ trips, breakdowns), trip TRIP|null
//   TRIP = { w, venueId, from, to, fromName, toName, km, highway, season, night, cardId, resolved, choice, outcome,
//            deltas, success, banter: [{ who, text }] } + v0.6.1: weather, temp, holiday, driver
// v0.6.1 (WORLD, Addendum 1): Canada in rings (content/map.js rings; world.ring / ringOpen / cityOpen: Saskatchewan from
// day one, the West from Local Heroes, the East & North from Signed), the calendar hooks (GG.calendar: venues open by
// season/holiday, listing weight + pay, weather turnout, road risk) and van drivers (content.drivers; world.driver(state)
// → { id, name, you, def }: the band's designated driver while active, else YOU drive; world.driverMods, syncDriver).
// Road-card gates gain driver: [ids|'you'], weather: [C.WEATHER], holiday: [holidayIds].
// v0.7 (WORLDSIM): on tour (GG.tour.away) the board lists the region's clubs (GG.tour.listings), tour gigs (g.tour) are
// shaped/estimated/travelled by GG.tour (region fans, the rental vehicle, no Moose Hearse wear), trips abroad come from
// GG.tour.startTrip and road cards are the region's (gate.region); world.scene in the World era adds the fans abroad.
// v0.8 (KITSIM): the van has a tier (GG.shop: minivan -> 15-passenger + trailer -> sprinter -> tour bus) whose wear and
// breakdown factors (x upgrades: winter tires, block heater) scale travel; a tape deck adds chemistry on long drives;
// van.space = merch boxes hauled (GG.shop.hauling); a banned venue's sticker on the van gets crossed out.
// v0.9: homeRing(state) (bands.js homeRing, else the home city's ring) ; ringEra(state, ringId) ; ringsFor(state) (home first) ;
//   homeRooms(state) (small rooms in the home ring; too few = the garage rings open too) ; nearRing(state, ringId) ;
//   highwayOut(state) ; far listings are relative to home (owner Q1) ; defaultVan uses shop.vanName (id 'van') ; banter skips silent members (their own stage
//   directions only) + the driver's own pool ; the returning driver posts the syncDriver line ; state.venuePlays ({homeVenue}).
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
    tierWeight: { 1: 1, 2: 1.3, 3: 1.6 }, bigBandTier1: 250,
    clashFit: 0.45, hazardPay: 1.25,   // genre fit below clashFit: flat deals pay hazard rates, boots fly
    opening: { chance: 0.4, minFans: 20, needFrac: 0.35, pay: [20, 45], exposureChance: 0.35, setSize: 2,
               slice: 0.45, fanShare: 0.5, rivalChance: 0.08, rivalMinFans: 60, rivalDraw: 260 },
    road: { chanceLocal: 0.2, chanceLong: 0.9, longKm: 100 },
    farListings: 1,              // v0.6.1: at most this many gigs a week from outside your home ring (a weekend run out West)
    homeRooms: { min: 3, tier: 1, minFans: 60 },   // v0.9: fewer small rooms than this in the home ring = the garage rings open too
    // v0.5: tier by era (theatres open in the Signed era), the fan scene per era, new-fan factor at theatres
    eraTier: { garage: 2, local: 2, signed: 3, world: 3 },
    scene: { garage: 6000, local: 6000, signed: 40000, world: 250000 },
    theatreFans: 0.4,
    commission: { garage: 0, local: 0, signed: 0.15, world: 0.2 },   // management + booking agent, off the top of gig pay
    crew: { 3: 150 },            // $ per show by venue tier (theatres need a crew)
    van: { condition: 72, space: 3, comfort: 2, comfortMax: 5, wearPerKm: 0.008, wearBase: 0.3,
           burnoutFromKm: 60, burnoutPer100: 0.5, burnoutMax: 30, burnoutTaper: [300, 0.5], breakdownKmCap: 400, tiredAt: 30, breakdownK: 0.5, towCost: [60, 140],
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
  // v0.9: content lines through career.pool (flat neutral + lines.byBand[bandId]).
  function lines(key, state) {
    if (state && GG.career.pool) { var v = GG.career.pool(state, GG.content.lines, key); if (v != null && (!Array.isArray(v) || v.length)) return v; }
    return (GG.content.lines && GG.content.lines[key]) || null;
  }
  function pickLine(state, rng, key, fallback) { return GG.career.pickLine(state, rng, lines(key, state), fallback); }

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
  // Seasons by week of year (v0.6.1 contracts C.SEASONS via GG.calendar): summer 23–4, fall 5–10, winter 11–16, spring 17–22.
  world.season = function (week) {
    if (GG.calendar) return GG.calendar.season(week);
    var w = ((Math.max(1, week | 0) - 1) % 24) + 1;
    return w <= 4 || w >= 23 ? 'summer' : w <= 10 ? 'fall' : w <= 16 ? 'winter' : 'spring';
  };
  // v0.6.1 rings: which ring a city is in, and whether your era has opened it.
  world.rings = function () { return map().rings || [{ id: 'sask', era: 'garage' }]; };
  world.ring = function (x) { var c = world.city(x); return c ? c.ring || 'sask' : null; };
  function ringDef(id) { return world.rings().filter(function (x) { return x.id === id; })[0] || null; }
  // v0.9 (owner Q1): the band's home ring (bands.js homeRing when the map has it, else the home city's ring) is open from day
  // one; every other ring opens no earlier than Local Heroes (Saskatchewan for Gravel Kings, Alberta for the others), later
  // rings at their own era. "Far" listings are relative to home.
  world.homeRing = function (state) {
    var b = GG.career && GG.career.band ? GG.career.band(state) : null, hr = b && b.homeRing;
    if (hr && ringDef(hr)) return hr;
    return world.ring(world.home(state)) || (world.rings()[0] || {}).id || 'sask';
  };
  // A home ring with too few small rooms for a garage band (economy.world.homeRooms: tier <= 1, low minFans) can't carry a
  // career on its own (map content missing, e.g. no Alberta ring yet): then the garage-era rings open with it, as before v0.9.
  var thinCache = {};
  world.homeRooms = function (state) {
    var home = world.homeRing(state), V = venues(), key = home + '|' + V.length;
    var hit = thinCache[key];
    if (hit && hit.v === V && hit.m === map()) return hit.n;
    var K = cfg().homeRooms || { tier: 1, minFans: 60 };
    var n = V.filter(function (v) { return v && v.minFans < 99999 && (v.tier || 0) <= K.tier && (v.minFans || 0) <= K.minFans && world.ring(v.city) === home; }).length;
    thinCache[key] = { v: V, m: map(), n: n };
    return n;
  };
  world.ringEra = function (state, ringId) {
    var r = ringDef(ringId);
    if (!r || ringId === world.homeRing(state)) return 'garage';
    var e = r.era || 'garage';
    if (e === 'garage' && world.homeRooms(state) < ((cfg().homeRooms || {}).min || 3)) return 'garage';
    return C.ERAS.indexOf(e) < C.ERAS.indexOf('local') ? 'local' : e;
  };
  // A ring that counts as home on the board: the home ring, or a garage-era ring standing in for a thin home ring.
  world.nearRing = function (state, ringId) {
    if (ringId === world.homeRing(state)) return true;
    var r = ringDef(ringId);
    return !!r && (r.era || 'garage') === 'garage' && world.homeRooms(state) < ((cfg().homeRooms || {}).min || 3);
  };
  world.ringOpen = function (state, ringId) {
    if (!ringDef(ringId)) return true;
    return C.ERAS.indexOf(state && state.era || 'garage') >= C.ERAS.indexOf(world.ringEra(state, ringId));
  };
  world.cityOpen = function (state, x) { var r = world.ring(x); return !r || world.ringOpen(state, r); };
  // The rings in this career's order (home first, then by the era they open) with { era (for this band), open, home }.
  world.ringsFor = function (state) {
    var list = world.rings(), home = world.homeRing(state);
    return list.map(function (r, i) {
      var e = world.ringEra(state, r.id);
      return Object.assign({}, r, { era: e, baseEra: r.era || 'garage', open: world.ringOpen(state, r.id), home: r.id === home, order: i });
    }).sort(function (a, b) { return (b.home - a.home) || (C.ERAS.indexOf(a.era) - C.ERAS.indexOf(b.era)) || (a.order - b.order); });
  };

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
  // v0.6.1: + the venue's ring is open in your era, and the calendar has it on this week (season, holiday, Remembrance Day).
  // v0.9: venue.reach (km, optional): a neighbourhood room that only books bands based within that many road km of it.
  world.inReach = function (state, v) { return !v || !v.reach || world.km(world.home(state), v.city) <= v.reach; };
  world.bookable = function (state, v) {
    return !!v && (v.minFans || 0) < CARD_ONLY && v.tier <= world.maxTier(state) && !world.isBanned(state, v.id) && state.fans >= (v.minFans || 0)
      && world.cityOpen(state, v.city) && (!GG.calendar || GG.calendar.venueOpen(state, v)) && world.inReach(state, v);
  };
  // v0.5: the highest venue tier you can play in your era (tier 3 theatres from the Signed era).
  world.maxTier = function (state) { var K = cfg(), t = K.eraTier && K.eraTier[state && state.era]; return t != null ? t : K.maxTier; };
  // v0.5: how many fans gigs can reach in your era (the garage-era scene is Saskatchewan; Signed is national).
  world.scene = function (state) { var K = cfg(), v = K.scene && K.scene[state && state.era]; return (v || econ().gig.localScene) + (GG.tour && state && state.era === 'world' ? GG.tour.abroadFans(state) : 0); };
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
    g.outdoor = !!v.outdoor;   // v0.6.1: weather hits outdoor turnout; tags = holiday / weather / season chips for the board
    g.tags = GG.calendar ? GG.calendar.tags(state, { kind: g.kind, city: g.city, outdoor: g.outdoor, holiday: v.holiday, id: g.venueId }, g.city) : [];
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
      var mult = Math.max(0.5, 1 + K.repPay * rep) * (fit < K.clashFit && deal === 'flat' ? K.hazardPay : 1)
        * (GG.calendar ? GG.calendar.payMult(state, v) : 1);   // v0.6.1: NYE double pay, party + pub circuits
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
      * (K.tierWeight[v.tier] || 1) * (v.tier === 1 && state.fans > K.bigBandTier1 ? 0.5 : 1) * (0.5 + 0.5 * world.freshness(state, v.id))
      * (GG.calendar ? GG.calendar.listWeight(state, v) : 1);
  }
  function headliner(state, v, rng) {
    var K = cfg().opening, band = GG.career.band(state.bandId), rival = band && band.rival && GG.content.rivals && GG.content.rivals[band.rival];
    var rv = state.rival, gone = rv && (rv.cracked === 'breakup' || rv.cracked === 'opener');   // v0.6: a cracked rival stops headlining
    if (rival && !gone && state.fans >= K.rivalMinFans && rng.chance(K.rivalChance)) {
      return { id: rival.id, name: rv && rv.name || rival.name, genre: rival.genre, draw: K.rivalDraw, rival: true };
    }
    var list = GG.content.headliners || [];
    var h = list.length ? rng.weighted(list, function (x) { return (x.genre === state.genre ? 3 : 1) * (x.city === v.city ? 2 : 1); }) : null;
    return h ? { id: h.id, name: h.name, genre: h.genre, draw: h.draw, rival: false } : null;
  }
  // This week's board: 3–6 gigs in reach (a rebook when a venue loves you, sometimes an opening slot).
  // Pure apart from the rng (default: seeded by career seed + week, so the career RNG never moves).
  world.listings = function (state, rng) {
    if (GG.tour && GG.tour.away(state)) return GG.tour.listings(state, rng);   // v0.7: the regional board on tour
    rng = rng || seeded(state, 'board');
    var K = cfg(), out = [], used = {};
    var pool = venues().filter(function (v) { return world.bookable(state, v); });
    var n = rng.int(K.listings[0], K.listings[1]);
    function add(v, opts) { used[v.id] = true; out.push(world.makeListing(state, v, rng, opts)); }
    var fans = pool.filter(function (v) { return world.rep(state, v.id) >= K.rebookAt; });
    if (fans.length) add(rng.weighted(fans, function (v) { return 1 + world.rep(state, v.id); }), {});
    if (state.fans >= K.opening.minFans && rng.chance(K.opening.chance)) {
      var rooms = venues().filter(function (v) {
        return v.tier >= 2 && v.minFans < CARD_ONLY && world.inReach(state, v) && !world.isBanned(state, v.id) && !used[v.id] && state.fans >= openingNeed(v)
          && world.cityOpen(state, v.city) && (!GG.calendar || GG.calendar.venueOpen(state, v));
      });
      var room = rooms.length ? rng.weighted(rooms, function (v) { return listWeight(state, v); }) : null;
      var h = room ? headliner(state, room, rng) : null;
      if (h) add(room, { opening: h });
    }
    var homeRing = world.homeRing(state);   // v0.9: far = outside the band's home ring (+ the garage rings when home is thin)
    function far(v) { var r = world.ring(v.city); return !!r && r !== homeRing && !world.nearRing(state, r); }
    while (out.length < n) {
      var farN = out.filter(function (g) { return far(g); }).length;
      var left = pool.filter(function (v) { return !used[v.id] && (farN < K.farListings || !far(v)); });
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
  // v0.6: a listing the rival stole (l.stolen, not defended) can't be booked.
  world.canBook = function (state, l) { return !!l && !(l.stolen && !l.stolen.defended) && state.fans >= (l.minFans || 0) && !world.isBanned(state, l.venueId); };

  // An offer that arrives on its own (once you have fans): like v0.1, skewed to better venues, genre fit and rep.
  world.offer = function (state, rng) {
    var K = cfg(), maxTier = Math.max((econ() && econ().offerMaxTier) || 2, world.maxTier(state)), home = world.home(state);
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
    if (l && l.tour && GG.tour) return GG.tour.estimate(state, l);
    var G = econ().gig, K = cfg(), v = venueById(l.venueId) || {}, fit = l.fit != null ? l.fit : fitOf(v, state.genre);
    var crowd = Math.min(l.capacity || 0, Math.round((v.walkIns || 0) + state.fans * G.fanDraw + state.buzz * G.buzzDraw));
    var slice = l.opening ? Math.max(0, Math.min((l.capacity || 0) - crowd, Math.round(l.opening.draw * K.opening.slice))) : 0;
    var pay = l.deal === 'flat' ? l.pay : l.deal === 'door' ? Math.round(l.pay * crowd) : 0;
    var head = Math.max(0, 1 - state.fans / world.scene(state)) * ((l.tier || 0) >= 3 ? K.theatreFans : 1);
    var fans = Math.round((crowd * G.conversion.B * (0.5 + 0.5 * fit) * (l.deal === 'exposure' ? G.exposureFanBonus : 1)
      + slice * G.conversion.B * K.opening.fanShare) * head);
    fans = Math.round(fans * world.freshness(state, l.venueId));
    var costs = Math.round(pay * ((K.commission || {})[state.era] || 0)) + ((K.crew || {})[l.tier] || 0);   // v0.5: signed-era costs
    return { crowd: crowd + slice, pay: pay, fans: fans, net: pay - (l.gas || 0) - costs, costs: costs, burnout: tripBurnout(state, l.km || 0) };
  };
  world.value = function (state, l) {
    var W = econ().bot.value, e = world.estimate(state, l), fit = l.fit != null ? l.fit : 0.7;
    var broke = state.era === 'garage' || !GG.career.brokeLine ? W.broke : Math.max(W.broke, GG.career.brokeLine(state, econ().bot.avg));   // v0.5
    return e.net * (state.fund < broke ? W.fundBroke : W.fund) + e.fans * W.fans - e.burnout * W.burnout + (fit - 0.5) * 4;
  };
  // Bots pick a listing id ('skip' when nothing is worth it). 'good' = best value; 'avg' = best half the time.
  world.botBook = function (state, style) {
    var list = world.refresh(state).filter(function (l) { return world.canBook(state, l); });
    if (!list.length) return 'skip';
    var best = null, bestV = -Infinity;
    list.forEach(function (l) { var v = world.value(state, l); if (v > bestV) { bestV = v; best = l; } });
    if (style === 'avg') {
      var rng = GG.rngFor(state), B = econ().bot.avg;   // v0.5: a broke signed band books the best-paying show
      var broke = state.era !== 'garage' && GG.career.brokeLine && state.fund < GG.career.brokeLine(state, B);
      return broke || rng.chance(econ().bot.avgSmart) ? best.id : rng.pick(list).id;
    }
    return bestV > 0 ? best.id : 'skip';
  };

  /* ---- After the gig: opening slots, genre comedy, reputation, travel ------------------------------ */
  // Before GG.gig.applyResult: the headliner's crowd (opening slots), genre-clash comedy. Marks r.shaped.
  world.shape = function (state, g, r, rng) {
    if (g && g.tour && GG.tour) return GG.tour.shape(state, g, r, rng);   // v0.7: abroad
    if (!g || !r || r.shaped) return r;
    var K = cfg(), G = econ().gig;
    r.shaped = true;
    r.lines = r.lines || [];
    r.km = g.km != null ? g.km : world.km(world.home(state), g.city);
    r.opening = g.opening || null;
    // v0.5: the gig sim's fan headroom is the garage-era scene; bigger eras reach more people, theatres convert fewer
    var scene = world.scene(state), tier3 = (g.tier || 0) >= 3;
    if (scene !== G.localScene || tier3) {
      var fit = g.fit != null ? g.fit : 0.7, fm = GG.drama ? GG.drama.gigMods(state).fansMult : 1;
      var x0 = (r.crowd || 0) * (G.conversion[r.grade] || 0) * (0.5 + 0.5 * fit) * (g.deal === 'exposure' ? G.exposureFanBonus : 1) * fm;
      r.fans = rngRound(x0 * Math.max(0, 1 - state.fans / scene) * (tier3 ? K.theatreFans : 1), rng);
    }
    if (GG.calendar) GG.calendar.shape(state, g, r, rng);   // v0.6.1: weather turnout (outdoors), holiday buzz + lines
    if (g.opening) {
      var room = Math.max(0, (g.capacity || r.capacity || 0) - (r.crowd || 0));
      var slice = Math.min(room, Math.round(g.opening.draw * K.opening.slice));
      r.crowd = (r.crowd || 0) + slice;
      var x = slice * (G.conversion[r.grade] || 0) * K.opening.fanShare * Math.max(0, 1 - state.fans / world.scene(state));
      r.fans = (r.fans || 0) + rngRound(x, rng);
      if (g.deal === 'door' && GG.gig && GG.gig.payFor) r.pay = GG.gig.payFor(g, r.crowd);
      r.lines.push('Opening for ' + g.opening.name + '. ' + pickLine(state, rng, 'openingSlot', 'You stole a few of their fans.'));
      if (g.opening.rival) {   // v0.9: the rival's own line (cast.openingSlot), else a neutral one; its own seed
        var rc = GG.rival && GG.rival.cast ? GG.rival.cast(state) : null, op = rc && (rc.openingSlot || (rc.banter && rc.banter.opening));
        var od = OPENING_LINE[GG.rival && GG.rival.id ? GG.rival.id(state) : ''] || 'Afterwards {rivalFront} shakes your hand. It lasts a beat too long.';
        r.lines.push(GG.career.fillText(state, Array.isArray(op) && op.length ? seeded(state, 'openline').pick(op) : typeof op === 'string' && op ? op : od));
      }
    }
    if (g.clash) r.lines.push(pickLine(state, rng, 'genreClash', 'Wrong crowd. The boots came out. You still got paid.'));
    var fresh = world.freshness(state, g.venueId);
    if (fresh < 1 && r.fans > 0) {
      r.fans = Math.round(r.fans * fresh);
      r.lines.push(pickLine(state, rng, 'sameCrowd', 'Same faces as last time. Fewer new ones.'));
    }
    return r;
  };
  var OPENING_LINE = { tundra_wraith: "Afterwards {rivalFront}, their frontman, shakes your hand and calls you 'buddy'. Twice." };   // until the cast has its own
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
    var vp = state.venuePlays || (state.venuePlays = {});   // v0.9: plays per venue ({homeVenue})
    vp[id] = (vp[id] || 0) + 1;
    var banned = after <= K.banAt && !world.isBanned(state, id);
    if (banned) state.banned.push(id);
    if (banned && GG.shop) GG.shop.banSticker(state, id);   // v0.8: their sticker on the van gets crossed out
    r.rep = after - before; r.repAfter = after; r.banned = banned;
    r.lines = r.lines || [];
    if (banned) r.lines.push(pickLine(state, rng, 'venueBanned', 'Banned. Your photo goes on the wall.'));
    else if (after > before && after >= K.rebookAt) r.lines.push(pickLine(state, rng, 'venueUp', 'They want you back.'));
    else if (after < before) r.lines.push(pickLine(state, rng, 'venueDown', 'The owner is not impressed.'));
    var rate = (K.commission || {})[state.era] || 0;   // v0.5: a signed band has a manager and a booking agent
    r.commission = rate && r.pay > 0 ? Math.round(r.pay * rate) : 0;
    if (r.commission) {
      GG.career.applyEffects(state, { fund: -r.commission }, d);
      r.lines.push('Management and the booking agent take their ' + Math.round(rate * 100) + '% (' + U.fmtMoney(r.commission) + ').');
    }
    r.crew = (K.crew || {})[g.tier] || 0;
    if (r.crew) {
      GG.career.applyEffects(state, { fund: -r.crew }, d);
      r.lines.push('Crew, sound and lights: ' + U.fmtMoney(r.crew) + '.');
    }
    r.travel = g.tour && GG.tour ? GG.tour.afterGig(state, g, r, rng, d) : world.travel(state, g, rng, d);   // v0.7: the rental abroad
    var t = r.travel;
    if (t.breakdown) r.lines.push(pickLine(state, rng, 'breakdown', 'The van broke down.') + ' (Tow: ' + U.fmtMoney(t.breakdown.cost) + ')');
    else if (t.wear && world.van(state).condition < K.van.tiredAt) r.lines.push(pickLine(state, rng, 'vanTired', 'The van is tired.'));
    return r;
  };
  // v0.6.1: the driver's comfort (Moth's apartment: terrible) and pace (T-Bone, Earl: slow) + the week's weather.
  function tripBurnout(state, km, city) {
    var K = cfg().van, van = world.van(state), dm = world.driverMods(state);
    if (km < K.burnoutFromKm) return 0;
    var comfort = U.clamp(van.comfort + (dm.comfort || 0), 1, K.comfortMax);
    var wx = GG.calendar ? GG.calendar.roadMods(state, city).burnout : 0;
    var T = K.burnoutTaper || [300, 0.5], eff = km <= T[0] ? km : T[0] + (km - T[0]) * T[1];   // v0.6.1: long hauls settle in
    return Math.min(K.burnoutMax || 30, Math.round(eff / 100 * (K.comfortMax + 1 - comfort) * K.burnoutPer100 * (dm.burnout || 1)) + wx);
  }
  world.tripBurnout = tripBurnout;
  world.breakdownChance = function (state, km, city) {
    var K = cfg().van, van = world.van(state);
    if (state.protected) return 0;   // garage era: nothing breaks down (condition still drops)
    var road = GG.calendar ? GG.calendar.roadMods(state, city).road : 1;   // v0.6.1: icy roads, whiteouts, hail
    var kmRisk = Math.min(km, K.breakdownKmCap || 400);   // v0.6.1: a 1,400 km run isn't 4x riskier than a 350 km one
    var vm = GG.shop && state.van ? GG.shop.vanMods(state).breakdown : 1;   // v0.8: newer vehicles, winter tires, the block heater
    return U.clamp(Math.pow(1 - van.condition / 100, 2) * (0.2 + kmRisk / 300) * K.breakdownK * road * (world.driverMods(state).breakdown || 1) * vm, 0, 0.5);
  };
  // One round trip to gig g: wear, burnout from long drives, maybe a breakdown (never while state.protected).
  world.travel = function (state, g, rng, d) {
    var K = cfg().van, van = world.van(state);
    var km = g.km != null ? g.km : world.km(world.home(state), g.city), driven = km * 2;
    var before = van.condition, dm = world.driverMods(state), rm = GG.calendar ? GG.calendar.roadMods(state, g.city) : { wear: 1 };
    var vm = GG.shop ? GG.shop.vanMods(state) : { wear: 1, chemistry: 0 };   // v0.8: the vehicle tier + upgrades
    van.condition = U.clamp(van.condition - rngRound((driven * K.wearPerKm + K.wearBase) * rm.wear * (dm.wear || 1) * vm.wear, rng), 0, 100);   // v0.6.1: potholes, hail
    van.km += driven; van.trips = (van.trips || 0) + 1;
    var burn = tripBurnout(state, km, g.city);
    if (burn) GG.career.applyEffects(state, { burnout: burn }, d);
    if (dm.chemistry && km >= K.burnoutFromKm) GG.career.applyEffects(state, { chemistry: dm.chemistry }, d);   // Earl's road stories
    if (vm.chemistry && km >= K.burnoutFromKm) GG.career.applyEffects(state, { chemistry: vm.chemistry }, d);   // v0.8: a tape deck that works
    var out = { km: km, driven: driven, wear: before - van.condition, burnout: burn, breakdown: null, driver: world.driver(state).id };
    if (rng.chance(world.breakdownChance(state, km, g.city))) {
      var cost = rng.int(K.towCost[0], K.towCost[1]);
      GG.career.applyEffects(state, { fund: -cost, burnout: 3, chemistry: -2 }, d);
      van.breakdowns = (van.breakdowns || 0) + 1;
      out.breakdown = { cost: cost };
    }
    if (van.condition !== before && d) { d.van = d.van || {}; d.van.condition = (d.van.condition || 0) + van.condition - before; }
    return out;
  };

  /* ---- The van ---------------------------------------------------------------------------------------- */
  // v0.9: a neutral id; the name is the band's tier-0 vehicle (shop.vanName: The Moose Hearse, The Pothole, ...).
  world.defaultVan = function (state) {
    var K = cfg().van, bandId = state && state.bandId || 'hail_damage';
    var name = GG.shop && GG.shop.vanName ? GG.shop.vanName(bandId, 0) : 'The Van';
    return { id: 'van', name: name, condition: K.condition, space: K.space, comfort: K.comfort, km: 0, trips: 0, breakdowns: 0,
      driver: world.driverFor(bandId) || 'you' };
  };
  world.van = function (state) { if (!state.van || typeof state.van !== 'object') state.van = world.defaultVan(); return state.van; };
  world.vanLabel = function (condition) {
    return condition >= 80 ? 'Purring' : condition >= 60 ? 'Fine, mostly' : condition >= 40 ? 'Making a noise'
      : condition >= 20 ? 'Held together by tape' : 'A rolling miracle';
  };
  // Cousin Dale's garage: +repairStep condition for repairPerPoint $ a point. { cost, gain } (gain 0 = nothing to fix).
  world.repairQuote = function (state) {
    var K = cfg().van, van = world.van(state), gain = Math.max(0, Math.min(K.repairStep, 100 - van.condition));
    var rp = world.driverMods(state).repair;   // v0.6.1: Moth does her own maintenance, free
    return { cost: Math.round(gain * K.repairPerPoint * (rp != null ? rp : 1)), gain: gain };
  };

  /* ---- v0.6.1 van drivers (Addendum 1 C1) ------------------------------------------------------------------------------ */
  // content.drivers: { <memberId>: { id, band, name, dashboard, blurb, mods: { breakdown, wear, burnout, comfort, repair,
  //   chemistry, roadChance } } } + 'you' (the founder, when the band's driver is gone). Only Hail Damage plays now.
  var DRIVER_MODS = { breakdown: 1, wear: 1, burnout: 1, comfort: 0, repair: 1, chemistry: 0, roadChance: 1 };
  function drivers() { return GG.content.drivers || {}; }
  world.driverFor = function (bandId) {
    var D = drivers();
    for (var id in D) if (D[id].band === bandId) return id;
    return null;   // v0.9: no designated driver in content = you drive
  };
  // The one behind the wheel this week: the band's designated driver while active, otherwise you.
  world.driver = function (state) {
    var id = world.driverFor(state && state.bandId), m = id && state && state.members ? state.members.filter(function (x) { return x.id === id; })[0] : null;
    var on = !!(m && (!m.status || m.status === 'active')), key = on ? id : 'you', def = drivers()[key] || {};
    return { id: key, name: on ? (def.name || (m && m.name) || id) : 'You', you: !on, designated: id, def: def, dashboard: def.dashboard || null };
  };
  world.driverMods = function (state) {
    var d = world.driver(state).def.mods || {}, out = {};
    for (var k in DRIVER_MODS) out[k] = d[k] != null ? d[k] : DRIVER_MODS[k];
    return out;
  };
  // Keeps state.van.driver in step with the lineup (the driver quit -> you drive; they're back -> they drive).
  // Returns { from, to } when it changed (and posts one group-chat line), else null.
  // v0.9: the "you drive now" line: drivers.you.byBand[bandId].takeOver (career.pool), or a pack's per-band map
  // (takeOverBy / takeOverByBand [bandId]), else the neutral drivers.you.takeOver.
  function takeOverLine(state, you) {
    if (!you) return null;
    var b = state && state.bandId, own = (you.byBand && you.byBand[b] && you.byBand[b].takeOver) || (you.takeOverBy && you.takeOverBy[b])
      || (you.takeOverByBand && you.takeOverByBand[b]);
    if (own) return own;
    var v = GG.career && GG.career.pool ? GG.career.pool(state, you, 'takeOver') : you.takeOver;
    return typeof v === 'string' ? v : you.takeOver || null;
  }
  world.takeOverLine = function (state) { return takeOverLine(state, drivers().you); };
  world.syncDriver = function (state, quiet) {
    if (!state) return null;
    var van = world.van(state), cur = world.driver(state).id, was = van.driver;
    if (was === cur) return null;
    van.driver = cur;
    if (!was || quiet || !GG.career || !GG.career.postChat) return { from: was || null, to: cur };
    var D = drivers(), text = cur === 'you' ? takeOverLine(state, D.you) || 'You drive now. The seat is still warm. The mirrors are set for someone taller.'
      : (D[cur] && D[cur].back) || D[cur] && D[cur].name + ' is back behind the wheel.';
    // v0.9: the returning driver says it themselves; when you take over, the first bandmate who talks (else Mom)
    var tk = GG.career.talkers ? GG.career.talkers(state)[0] : state.members.filter(function (m) { return m.status === 'active'; })[0];
    GG.career.postChat(state, cur === 'you' ? (tk && tk.id) || 'mom' : cur, text, null, 'news');
    GG.emit('van:driver', { from: was, to: cur });
    return { from: was, to: cur };
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
  var ROAD_GATE = { minKm: 1, maxKm: 1, season: 1, driver: 1, weather: 1, holiday: 1 };
  // v0.6.1: driver: [memberId|'you'] (who is behind the wheel), weather: [kind] (at the destination), holiday: [id].
  world.roadGatePasses = function (state, gate, km, season, city) {
    if (!gate) return true;
    if (gate.minKm != null && km < gate.minKm) return false;
    if (gate.maxKm != null && km > gate.maxKm) return false;
    if (gate.season && gate.season.indexOf(season) < 0) return false;
    if (gate.driver && gate.driver.indexOf(world.driver(state).id) < 0) return false;
    if (gate.weather && (!GG.calendar || gate.weather.indexOf(GG.calendar.weatherAt(state, city).kind) < 0)) return false;
    if (gate.holiday && (!GG.calendar || !gate.holiday.some(function (h) { return GG.calendar.isHoliday(state, h); }))) return false;
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
  world.drawRoad = function (state, km, season, rng, city) {
    var K = cfg().road;
    if (!rng.chance(Math.min(0.97, (km >= K.longKm ? K.chanceLong : K.chanceLocal) * (world.driverMods(state).roadChance || 1)))) return null;
    var list = (GG.content.roadCards || []).filter(function (c) { return world.roadGatePasses(state, c.gate, km, season, city) && roadAvailable(state, c) && (!GG.tour || GG.tour.roadCardOk(state, c))
      && (!GG.career.cardOk || GG.career.cardOk(state, c)); });   // v0.9: no other band's speaker / member effects on the road
    return list.length ? rng.weighted(list, function (c) { return c.weight != null ? c.weight : 1; }) : null;
  };
  // 1–2 lines of van chatter (a bandmate or two; a silent member only ever gets a stage direction). Seeded, cosmetic.
  // v0.9: talkers = active members without `silent` who have lines.vanBanter; a silent member's stage directions are their own
  // lines.vanBanter[id] (Kenji: lines.vanKenji); the driver's own pool (content.drivers[id].banter) can add a line.
  world.banter = function (state, n) {
    var rng = seeded(state, 'banter'), pools = lines('vanBanter') || {}, out = [], K = GG.career;
    function silent(m) { return K.isSilent ? K.isSilent(state, m.id) : m.id === 'kenji'; }
    var talkers = rng.shuffle(state.members.filter(function (m) { return m.status === 'active' && !silent(m) && pools[m.id] && pools[m.id].length; }));
    var quiet = state.members.filter(function (m) { return m.status === 'active' && silent(m); }).map(function (m) {
      var p = (pools[m.id] && pools[m.id].length ? pools[m.id] : null) || (m.id === 'kenji' ? lines('vanKenji') : null);
      return p && p.length ? { id: m.id, pool: p } : null;
    }).filter(Boolean)[0] || null;
    n = n || 2;
    for (var i = 0; i < talkers.length && out.length < n; i++) {
      if (out.length && quiet && rng.chance(0.4)) break;   // sometimes the second line is the quiet one, not talking
      out.push({ who: talkers[i].id, text: GG.career.fillText(state, rng.pick(pools[talkers[i].id])) });
    }
    if (out.length < n && quiet) out.push({ who: quiet.id, text: rng.pick(quiet.pool) });
    var d = world.driver(state), dp = d && !d.you && d.def && d.def.banter;
    if (out.length < n && Array.isArray(dp) && dp.length && !out.some(function (x) { return x.who === d.id; })) out.push({ who: d.id, text: GG.career.fillText(state, rng.pick(dp)) });
    return out;
  };
  // v0.9: the highway out of town when the destination is off the map (per home city; content map city `highway` wins).
  var HOME_HWY = { saskatoon: 'Hwy 7 · the Trans-Canada', regina: 'Hwy 1 · the Trans-Canada', swift_current: 'Hwy 1 · the Trans-Canada',
    edmonton: 'Hwy 2 · the QEII', calgary: 'Hwy 2 · the QEII' };
  world.highwayOut = function (state) {
    var h = world.home(state), c = world.city(h);
    return (c && c.highway) || HOME_HWY[h] || 'the Trans-Canada';
  };
  world.trip = function (state) { return state.trip && state.trip.w === state.totalWeek ? state.trip : null; };
  // Starts (or returns) this week's trip to the booked gig: route, km, season, night, a road card, banter.
  // Draws the road card with the career RNG once per week (a reload mid-trip gets the same card back).
  world.startTrip = function (state, gig) {
    gig = gig || state.gig;
    if (!gig) return null;
    var t = world.trip(state);
    if (t && t.venueId === gig.venueId) return t;
    if (gig.tour && GG.tour && GG.tour.away(state)) return GG.tour.startTrip(state, gig);   // v0.7: the rental abroad
    var rng = GG.rngFor(state), from = world.home(state), toId = world.cityId(gig.city), to = toId || from;   // v0.6: Calgary is off the map
    var km = gig.km != null ? gig.km : world.km(from, to), season = world.season(state.week);
    var card = world.drawRoad(state, km, season, rng, to);
    if (card) state.seenCards[card.id] = state.totalWeek;
    var fc = world.city(from), tc = world.city(to);
    var wx = GG.calendar ? GG.calendar.weatherAt(state, to) : { kind: 'clear', temp: 20 }, hol = GG.calendar ? GG.calendar.holiday(state.week, state) : null;
    t = state.trip = { w: state.totalWeek, venueId: gig.venueId, from: from, to: to,
      fromName: fc ? fc.name : state.city, toName: toId && tc ? tc.name : gig.city, km: km, highway: toId ? world.highway(from, to) : world.highwayOut(state),
      season: season, night: km >= 180 || season === 'winter', cardId: card ? card.id : null, resolved: !card,
      choice: null, outcome: null, deltas: null, success: null, banter: world.banter(state, 2),
      weather: wx.kind, temp: wx.temp, holiday: hol ? hol.id : null, driver: world.driver(state).id };
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
    if (s.venuePlays !== undefined && (!s.venuePlays || typeof s.venuePlays !== 'object' || Array.isArray(s.venuePlays))) s.venuePlays = {};   // v0.9 (lazy; {homeVenue})
    if (!Array.isArray(s.banned)) s.banned = [];
    else if (s.banned.some(function (x) { return typeof x !== 'string'; })) s.banned = s.banned.filter(function (x) { return typeof x === 'string'; });
    var dv = world.defaultVan(s);
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
