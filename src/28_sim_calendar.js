// 28_sim_calendar.js: the calendar (v0.6.1, WORLD agent; Addendum 1 C7). Two weeks per month from early July
// (contracts C.MONTHS), seasons by week (C.SEASONS: winter 11–16, spring 17–22, summer 23–4, fall 5–10), weekly weather
// by season and region (C.WEATHER; never cancels a gig), season effects, genre-season fit and Canadian holidays.
// Content: content/calendar.js (numbers have defaults here). Pure sim (no DOM or audio; seeded RNGs only): the weather
// uses its own RNG seeded by career seed + week (+ city climate), so it never shifts the career RNG.
// API (GG.calendar):
//   woy(week) 1..24 · monthIndex(w) 0..11 · month(w) 'Jul' · monthName(w) 'July' · season(w) · seasonInfo(season)
//   holidays(w, state?) [HOLIDAY] · holiday(w, state?) HOLIDAY|null (NYE beats Christmas in week 12) · isHoliday(state, id)
//   weatherAt(state, city?, totalWeek?) { week, kind, temp, city } (pure) · weather(state) (this week's, cached in
//   state.weather by monday) · kind(k) → weather-kind def · label(state) → HUD/UI summary
//   seasonFit(state, venueOrGig) -1..2 · fitLine(state) · venueOpen(state, v) · listWeight(state, v) · payMult(state, v)
//   tags(state, v) [{ icon, text }] · gigMods(state) { score, crowd, fansMult } (read by GG.drama.gigMods)
//   shape(state, g, r, rng) (called by GG.world.shape: outdoor turnout, holiday buzz, weather lines; r.weather, r.holiday)
//   roadMods(state, city?) { road, wear, burnout } · holidayCard(state) card|null (career.startWeek) · monday(state)
//   migrate(s) (v6 -> v7: state.weather; sets s.v = 7)
// v0.7 (WORLDSIM, C7 overseas): seasonIn(region, w) (Australia reversed: content.world.climates[].seasonShift) · seasonAt(state)
//   (the season where the band is this week) · abroad (GG.tour.away) the weather uses the tour city's regional climate
//   (content.world.climates + city temp offsets), holidays() returns the region's holidays (content.world.holidays) instead
//   of the Canadian ones, season fit / venue seasons / road risk / the label use the local season; no Canadian news abroad.
// Events: 'calendar:week' { totalWeek, week, month, season, weather, temp, holiday } (from monday).
(function (GG) {
  var C = GG.contracts, U = GG.util;
  var cal = GG.calendar = GG.calendar || {};
  var WPY = C.WEEKS_PER_YEAR;

  var DEF = {
    months: {}, temps: [25, 24, 18, 10, -1, -11, -15, -11, -3, 9, 17, 22],
    seasons: { summer: { name: 'Summer', icon: '☀️', fx: {} }, fall: { name: 'Fall', icon: '🍂', fx: {} },
      winter: { name: 'Winter', icon: '❄️', fx: { road: 1.3, outdoorOff: true } }, spring: { name: 'Spring', icon: '🌱', fx: { wear: 1.4 } } },
    weather: { summer: { clear: 1 }, fall: { clear: 1 }, winter: { clear: 1 }, spring: { clear: 1 } },
    climates: {}, kinds: {}, genreSeason: {}, genreKinds: {}, fitFx: { score: 1.5, crowd: 4, fans: 0.05, home: 1.5 }, fitLines: {},
    holidays: [], news: {}, lines: {}, costumes: ['{rival}']
  };
  var KIND_DEF = { label: 'Clear', icon: '☀️', temp: 0, outdoor: 1, indoor: 1, crowd: 0, road: 1, wear: 1, burnout: 0 };
  function part(k) { var c = GG.content.calendar; return (c && c[k] != null) ? c[k] : DEF[k]; }
  // v0.9: calendar.byBand[bandId] adds to (arrays) or overrides per key (objects: news by week, lines by kind) the flat part.
  function bandPart(state, k) {
    var c = GG.content.calendar, v = c && state && GG.career && GG.career.pool ? GG.career.pool(state, c, k) : undefined;
    return v != null ? v : part(k);
  }
  // v0.9: a band's weather affinity: bands.js weather { kind, crowd, lines: [..] | lineKey } (Hail Damage: hail, +5 crowd).
  function bandWeather(state) {
    var b = GG.career && GG.career.band ? GG.career.band(state) : null;
    if (b && b.weather && b.weather.kind) return b.weather;
    return state && state.bandId === 'hail_damage' ? { kind: 'hail', crowd: 5, lines: 'hailBand' } : null;
  }
  cal.bandWeather = bandWeather;
  cal.content = function () { return GG.content.calendar || DEF; };

  /* ---- Weeks, months, seasons -------------------------------------------------------------------------------- */
  function wk(x) { return x && typeof x === 'object' ? x.week : x; }
  cal.woy = function (w) { return ((Math.max(1, (wk(w) | 0) || 1) - 1) % WPY) + 1; };
  cal.monthIndex = function (w) { return Math.floor((cal.woy(w) - 1) / 2) % 12; };
  cal.month = function (w) { return C.MONTHS[cal.monthIndex(w)]; };
  cal.monthName = function (w) { var m = cal.month(w); return part('months')[m] || m; };
  cal.season = function (w) {
    w = cal.woy(w);
    for (var s in C.SEASONS) {
      var r = C.SEASONS[s];
      if (r[0] <= r[1] ? w >= r[0] && w <= r[1] : w >= r[0] || w <= r[1]) return s;
    }
    return 'summer';
  };
  // v0.7: the season in a region (Australia's are reversed) and where the band is this week.
  cal.seasonIn = function (region, w) {
    var cl = region && region !== 'canada' && GG.tour && GG.tour.climate ? GG.tour.climate(region) : null;
    return cal.season(cal.woy(w) + (cl && cl.seasonShift || 0));
  };
  function away(state) { return !!(state && GG.tour && GG.tour.away && GG.tour.away(state)); }
  cal.seasonAt = function (state) { return away(state) ? cal.seasonIn(GG.tour.regionOf(state), state.week) : cal.season(state.week); };
  cal.seasonInfo = function (season) {
    var s = part('seasons')[season] || DEF.seasons[season] || {};
    return { id: season, name: s.name || season, icon: s.icon || '', blurb: s.blurb || '', fx: s.fx || {} };
  };

  /* ---- Holidays ---------------------------------------------------------------------------------------------- */
  cal.holidays = function (w, state) {
    w = cal.woy(w);
    if (away(state)) {   // v0.7: abroad, the region's holidays replace the Canadian ones
      var reg = GG.tour.regionOf(state), W = GG.content.world;
      return ((W && W.holidays) || []).filter(function (h) { return h.region === reg && h.weeks && w >= h.weeks[0] && w <= h.weeks[1]; });
    }
    return part('holidays').filter(function (h) {
      return h.weeks && w >= h.weeks[0] && w <= h.weeks[1] && (!h.era || !state || h.era.indexOf(state.era) >= 0);
    });
  };
  cal.holiday = function (w, state) { var l = cal.holidays(w, state); return l.length ? l[l.length - 1] : null; };
  cal.isHoliday = function (state, id) { return cal.holidays(state.week, state).some(function (h) { return h.id === id; }); };
  cal.holidayById = function (id) { return part('holidays').filter(function (h) { return h.id === id; })[0] || null; };

  /* ---- Weather ------------------------------------------------------------------------------------------------ */
  cal.kind = function (k) { var d = part('kinds')[k]; return Object.assign({ id: k }, KIND_DEF, d || {}); };
  function cityOf(state, city) { return GG.world && GG.world.city ? GG.world.city(city || (state && state.city)) : null; }
  // Pure: the weather for (career, week, city). The same uniform roll everywhere, remapped by the city's climate.
  cal.weatherAt = function (state, city, totalWeek) {
    var tw = totalWeek || state.totalWeek || 1, w = ((tw - 1) % WPY) + 1, season = cal.season(w);
    var rng = GG.RNG(GG.hashSeed((state.seed >>> 0) + '|weather|' + tw));
    var wc = GG.tour && GG.tour.cityDef ? GG.tour.cityDef(city || (!totalWeek || totalWeek === state.totalWeek ? GG.tour.here(state) : null)) : null;
    if (wc) return worldWeather(wc, tw, w, rng);   // v0.7: a city abroad
    var table = part('weather')[season] || { clear: 1 }, kinds = Object.keys(table).filter(function (k) { return C.WEATHER.indexOf(k) >= 0; });
    var total = kinds.reduce(function (t, k) { return t + table[k]; }, 0), u = rng.next() * total, kind = kinds[kinds.length - 1] || 'clear';
    for (var i = 0; i < kinds.length; i++) { u -= table[kinds[i]]; if (u < 0) { kind = kinds[i]; break; } }
    var c = cityOf(state, city), remap = c && c.climate && part('climates')[c.climate];
    if (remap && remap[kind]) kind = remap[kind];
    var base = part('temps')[cal.monthIndex(w)];
    var temp = Math.round((isFinite(base) ? base : 10) + cal.kind(kind).temp + (rng.next() - 0.5) * 8 + (c && c.climate === 'coast' ? (season === 'winter' ? 12 : -2) : c && c.climate === 'north' ? -8 : 0));
    if (kind === 'heat' && temp < 28) temp = 28 + Math.round(rng.next() * 6);
    if ((kind === 'snow' || kind === 'blizzard') && temp > 1) temp = -Math.round(1 + rng.next() * 4);
    if (kind === 'rain' && temp < 1) temp = 1 + Math.round(rng.next() * 3);
    return { week: tw, kind: kind, temp: temp, city: c ? c.id : null };
  };
  function worldWeather(c, tw, w, rng) {
    var cl = GG.tour.climate(c.region) || {}, season = cal.seasonIn(c.region, w), table = (cl.weather || {})[season] || { clear: 1 };
    var kinds = Object.keys(table).filter(function (k) { return C.WEATHER.indexOf(k) >= 0; });
    var total = kinds.reduce(function (t, k) { return t + table[k]; }, 0), u = rng.next() * total, kind = kinds[kinds.length - 1] || 'clear';
    for (var i = 0; i < kinds.length; i++) { u -= table[kinds[i]]; if (u < 0) { kind = kinds[i]; break; } }
    var base = (cl.temps || [])[cal.monthIndex(w)], cold = season === 'winter' ? 2 : 1;
    var temp = Math.round((isFinite(base) ? base : 12) + cal.kind(kind).temp * 0.5 + (rng.next() - 0.5) * 6 + (c.temp || 0) * cold);
    if (kind === 'heat' && temp < 28) temp = 28 + Math.round(rng.next() * 8);
    if ((kind === 'snow' || kind === 'blizzard') && temp > 1) temp = -Math.round(1 + rng.next() * 4);
    if (kind === 'rain' && temp < 1) temp = 1 + Math.round(rng.next() * 3);
    return { week: tw, kind: kind, temp: temp, city: c.id, region: c.region };
  }
  cal.weather = function (state) {
    if (!state) return null;
    var w = state.weather;
    return w && w.week === state.totalWeek && C.WEATHER.indexOf(w.kind) >= 0 ? w : cal.weatherAt(state);
  };

  // HUD / UI summary for this week.
  cal.label = function (state) {
    var w = state.week, season = cal.seasonAt(state), si = cal.seasonInfo(season), wx = cal.weather(state), k = cal.kind(wx.kind);
    var h = cal.holiday(w, state), ab = away(state), tc = ab && GG.tour.cityDef(GG.tour.here(state));
    return { totalWeek: state.totalWeek, week: w, month: cal.month(w), monthName: cal.monthName(w), season: season,
      region: ab ? GG.tour.regionOf(state) : 'canada', cityName: tc ? tc.name : state.city,
      seasonName: si.name, seasonIcon: si.icon, seasonBlurb: si.blurb, weather: wx.kind, weatherLabel: k.label, weatherIcon: k.icon,
      temp: wx.temp, holiday: h ? { id: h.id, name: h.name, icon: h.icon || '', blurb: h.blurb || '' } : null,
      fit: cal.fitLine(state),
      text: cal.monthName(w) + ' · ' + si.name + (tc ? ' (' + tc.name + ')' : '') + ' · ' + k.label + ', ' + wx.temp + '°C' + (h ? ' · ' + h.name : '') };
  };

  /* ---- Genre-season fit ----------------------------------------------------------------------------------------- */
  // -1..2: how much this season suits your genre at this venue (doubled at your genre's kind of room / summer outdoors).
  cal.seasonFit = function (state, v) {
    var season = cal.seasonAt(state), gs = part('genreSeason')[state.genre] || {}, f = gs[season] || 0;
    if (!f || !v) return f;
    var kinds = part('genreKinds')[state.genre] || [];
    var home = kinds.indexOf(v.kind) >= 0 || (v.outdoor && season === 'summer' && (state.genre === 'country' || state.genre === 'punk'));
    return f > 0 && home ? f * (part('fitFx').home || 1.5) : f;
  };
  cal.fitLine = function (state) {
    var fl = part('fitLines')[state.genre] || {};
    return fl[cal.seasonAt(state)] || null;
  };

  /* ---- Venues: open this week? listing weight, pay, tags ---------------------------------------------------------- */
  cal.venueOpen = function (state, v) {
    if (!v) return false;
    var w = cal.woy(state.week), season = cal.seasonAt(state), hs = cal.holidays(w, state);
    if (v.holiday && !hs.some(function (h) { return h.id === v.holiday; })) return false;
    if (v.weeks && (w < v.weeks[0] || w > v.weeks[1])) return false;
    if (v.season && v.season.indexOf(season) < 0) return false;
    if (v.outdoor && !v.season && !v.holiday && cal.seasonInfo(season).fx.outdoorOff) return false;   // nobody plays outdoors in winter
    for (var i = 0; i < hs.length; i++) if (hs[i].closed && hs[i].closed.indexOf(v.kind) >= 0) return false;   // Remembrance Day
    return true;
  };
  cal.listWeight = function (state, v) {
    var x = 1, hs = cal.holidays(state.week, state);
    hs.forEach(function (h) {
      if (v.holiday === h.id) x *= 10;
      var W = h.weight || {};
      if (W[v.kind]) x *= W[v.kind];
      if (v.outdoor && W.outdoor) x *= W.outdoor;
    });
    if (v.season || v.weeks) x *= 2;   // seasonal rooms (fairs, frosh week, harvest dances) show up while they're on
    return x;
  };
  // Kind multipliers stack; an `all` multiplier (NYE) is a floor for everything that night, not stacked on top.
  cal.payMult = function (state, v) {
    var x = 1, all = 1;
    cal.holidays(state.week, state).forEach(function (h) {
      var P = h.pay || {};
      if (P.all) all = Math.max(all, P.all); else if (v && P[v.kind]) x *= P[v.kind];
    });
    return Math.max(x, all);
  };
  cal.tags = function (state, v, city) {
    var out = [], hs = cal.holidays(state.week, state);
    hs.forEach(function (h) {
      var P = h.pay || {}, W = h.weight || {};
      if (v.holiday === h.id || P.all || (v && P[v.kind]) || (v.outdoor && W.outdoor) || W[v.kind])
        out.push({ icon: h.icon || '🎉', text: h.name + (P.all ? ': ' + P.all + 'x pay' : P[v.kind] ? ': party pay' : '') });
    });
    if (v.outdoor) {
      var wx = cal.weatherAt(state, city || v.city), k = cal.kind(wx.kind);
      out.push({ icon: k.icon, text: 'Outdoors · ' + k.label + ', ' + wx.temp + '°C' });
    }
    var f = cal.seasonFit(state, v);
    if (f >= 1) out.push({ icon: '🔥', text: 'Your season' });
    return out;
  };

  /* ---- The gig: mods (score / crowd / fans) and the result -------------------------------------------------------- */
  function curGig(state) { return (state.liveGig && state.liveGig.gig) || state.gig || null; }
  function venueOf(g) { return g && GG.gig && GG.gig.venue ? GG.gig.venue(g.venueId) || g : g; }
  cal.gigMods = function (state) {
    var g = curGig(state), out = { score: 0, crowd: 0, fansMult: 1 };
    if (!g || !state.week) return out;
    var v = venueOf(g) || {}, F = part('fitFx'), f = cal.seasonFit(state, v);
    out.score += f * F.score; out.crowd += f * F.crowd; out.fansMult *= 1 + f * F.fans;
    var k = cal.kind(cal.weatherAt(state, g.city).kind), bw = bandWeather(state);
    out.crowd += k.crowd + (bw && k.id === bw.kind ? (bw.crowd != null ? bw.crowd : 5) : 0);
    cal.holidays(state.week, state).forEach(function (h) { if (h.gig) { out.crowd += h.gig.crowd || 0; out.fansMult *= h.gig.fans || 1; } });
    out.score = Math.round(out.score * 10) / 10; out.crowd = Math.round(out.crowd);
    return out;
  };
  // world.shape hook (once per result): outdoor turnout by weather, holiday buzz, a weather/holiday line.
  cal.shape = function (state, g, r, rng) {
    if (!g || !r || r.calendar) return r;
    r.calendar = true;
    var v = venueOf(g) || {}, wx = cal.weatherAt(state, g.city), k = cal.kind(wx.kind), L = bandPart(state, 'lines') || {}, bw = bandWeather(state);
    r.weather = wx.kind; r.temp = wx.temp; r.lines = r.lines || [];
    var outdoor = !!(v.outdoor || g.outdoor), turn = outdoor ? k.outdoor : k.indoor;
    if (turn !== 1 && r.crowd > 0) {
      var before = r.crowd;
      r.crowd = Math.max(1, Math.min(g.capacity || r.capacity || before, Math.round(before * turn)));
      if (r.fans > 0 && turn < 1) r.fans = Math.round(r.fans * turn);
      if (g.deal === 'door' && GG.gig && GG.gig.payFor) r.pay = GG.gig.payFor(g, r.crowd);
      r.turnout = r.crowd - before;
    }
    var mine = bw && k.id === bw.kind ? (Array.isArray(bw.lines) ? bw.lines : L[bw.lines || 'hailBand']) : null;
    var pool = mine ? mine : outdoor && k.id === 'clear' ? L.clearOutdoor
      : outdoor && turn < 1 ? (L[k.id] || L.outdoorBad) : k.id !== 'clear' && k.id !== 'rain' ? L[k.id] : null;
    if (pool && pool.length) r.lines.push(GG.career.fillText(state, rng.pick(pool)));
    var hs = cal.holidays(state.week, state).filter(function (h) { return h.gig; });
    if (hs.length) {
      var h = hs[hs.length - 1];
      r.holiday = h.id;
      if (h.gig.buzz) { r.buzz = (r.buzz || 0) + h.gig.buzz; }
      var extra = GG.content.calendar && GG.content.calendar.byBand && GG.content.calendar.byBand[state.bandId];   // v0.9: + byBand.holidayLines[id]
      var hl = (h.gig.lines || []).concat((extra && extra.holidayLines && extra.holidayLines[h.id]) || []);
      if (hl.length) {
        var cos = bandPart(state, 'costumes');
        var costume = (state.flags && typeof state.flags.costume === 'string' && state.flags.costume) || rng.pick(Array.isArray(cos) && cos.length ? cos : DEF.costumes);
        r.lines.push(GG.career.fillText(state, rng.pick(hl).replace('{costume}', costume)));
      }
    }
    return r;
  };

  /* ---- The road --------------------------------------------------------------------------------------------------- */
  // Breakdown risk x, van wear x and extra burnout on a drive this week (season + the weather at the destination).
  cal.roadMods = function (state, city) {
    var fx = cal.seasonInfo(cal.seasonAt(state)).fx, k = cal.kind(cal.weatherAt(state, city).kind);
    return { road: (fx.road || 1) * k.road, wear: (fx.wear || 1) * k.wear, burnout: k.burnout || 0, weather: k.id };
  };

  /* ---- Holiday Monday cards ----------------------------------------------------------------------------------------- */
  function availableCard(state, c) {
    var w = state.seenCards && state.seenCards[c.id];
    if (w == null) return true;
    return c.once === false && state.totalWeek - w > (c.cooldown || 0);
  }
  // This week's holiday card (content order = priority; e.g. the guilt dinner before the plain Thanksgiving), or null.
  // Week 1 of the career belongs to the forced opening card. Deterministic (no RNG).
  cal.holidayCard = function (state) {
    if (!state || state.totalWeek <= 1 || !GG.career || !GG.career.cardById) return null;
    var ids = [];
    cal.holidays(state.week, state).forEach(function (h) { (h.cards || []).forEach(function (id) { ids.push(id); }); });
    for (var i = 0; i < ids.length; i++) {
      var c = GG.career.cardById(ids[i]);
      if (c && c.forceWeek == null && availableCard(state, c) && GG.career.gatePasses(state, c.gate)
        && (!GG.career.speakerOk || GG.career.speakerOk(state, c.speaker))) return c;   // v0.9 speaker guard
    }
    return null;
  };

  /* ---- Monday: the week's weather, season news, the Grey Mug afterglow ------------------------------------------------ */
  var GREY_MUG = { fansPct: 0.05, fansMax: 5000 };
  cal.monday = function (state) {
    if (!state || state.ended) return null;
    state.weather = cal.weatherAt(state);
    var w = state.week, news = away(state) ? null : (bandPart(state, 'news') || {})[w], hs = cal.holidays(w, state), d = {};   // v0.7: no home news abroad; v0.9: byBand news replaces the flat week
    hs.forEach(function (h) { if (h.news) news = h.news; });   // a holiday note beats the season flavour
    if (news && state.totalWeek > 1 && GG.career.postChat) GG.career.postChat(state, news.who, news.text, null, 'news');
    if (state.flags) {
      if (state.flags.costume && !cal.isHoliday(state, 'halloween')) delete state.flags.costume;   // costumes off after Halloween
      if (state.flags.greyMug === 'played') {                                                       // the halftime afterglow
        var gain = Math.min(GREY_MUG.fansMax, Math.round(state.fans * GREY_MUG.fansPct));
        GG.career.applyEffects(state, { fans: gain, buzz: 10 }, d);
        state.flags.greyMug = 'done';
        (state.trophies || (state.trophies = [])).push({ kind: 'greymug', title: 'The Grey Mug halftime show', year: state.year });
        if (GG.career.postChat) GG.career.postChat(state, 'dj', 'The halftime ratings are in: 4.2 million watched. ' + U.fmtNum(gain) + ' of them are fans now.', null, 'news');
      }
    }
    if (GG.world && GG.world.syncDriver) GG.world.syncDriver(state);
    var lb = cal.label(state);
    GG.emit('calendar:week', { totalWeek: state.totalWeek, week: w, month: lb.month, season: lb.season, weather: lb.weather,
      temp: lb.temp, holiday: lb.holiday ? lb.holiday.id : null });
    return state.weather;
  };

  /* ---- Saves: v6 -> v7 (idempotent). Chained onto GG.save.migrate. ------------------------------------------------------- */
  cal.migrate = function (s) {
    if (!s || typeof s !== 'object') return s;
    var w = s.weather;
    if (!w || typeof w !== 'object' || C.WEATHER.indexOf(w.kind) < 0 || !isFinite(w.week) || !isFinite(w.temp)) {
      s.weather = isFinite(s.seed) && isFinite(s.totalWeek) ? cal.weatherAt(s) : null;
    }
    if (typeof s.v !== 'number' || s.v < 7) s.v = 7;
    return s;
  };
  if (GG.save && GG.save.migrate && !GG.save.migrate.calendar) {
    var prev = GG.save.migrate;
    GG.save.migrate = function (s) { return cal.migrate(prev(s)); };
    GG.save.migrate.calendar = true;
  }

  GG.registerDebug('calendar', function () {
    var s = GG.state; if (!s) return { state: null };
    return cal.label(s);
  });
})(window.GG);
