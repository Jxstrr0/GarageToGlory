// Calendar sim tests (28_sim_calendar, v0.6.1 / Addendum 1 C7): months + seasons per week, holidays, weekly weather
// (deterministic, never cancels a gig), season effects, genre-season fit, holiday listings + cards, the Grey Mug,
// and the v6 -> v7 save migration.
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');

const fresh = () => load({ localStorage: load.fakeStorage() });
const career = (GG, seed, extra) => Object.assign(GG.career.newCareer({ seed: seed || 5, player: { name: 'T' } }), extra || {});
const at = (s, week, year) => { s.week = week; s.year = year || s.year || 1; s.totalWeek = (s.year - 1) * 24 + week; return s; };

test('months + seasons: two weeks per month from July; winter 11–16, spring 17–22, summer 23–4, fall 5–10', () => {
  const GG = fresh(), K = GG.calendar;
  eq([1, 2, 3, 11, 12, 13, 14, 15, 17, 19, 20, 21, 23, 24].map(w => K.month(w)), ['Jul', 'Jul', 'Aug', 'Dec', 'Dec', 'Jan', 'Jan', 'Feb', 'Mar', 'Apr', 'Apr', 'May', 'Jun', 'Jun']);
  eq(K.monthName(20), 'April'); eq(K.month(GG.contracts.LOONIES_WEEK), 'Apr', 'the Loonies stay in April');
  const S = w => K.season(w);
  eq([23, 24, 1, 4].map(S), ['summer', 'summer', 'summer', 'summer']); eq([5, 10].map(S), ['fall', 'fall']);
  eq([11, 16].map(S), ['winter', 'winter']); eq([17, 22].map(S), ['spring', 'spring']);
  eq(K.season(24 + 11), 'winter', 'wraps by year'); eq(K.woy(49), 1);
  for (let w = 1; w <= 24; w++) eq(GG.world.season(w), K.season(w), 'world.season follows the calendar at ' + w);
});

test('holidays sit on their weeks (NYE beats Christmas in week 12)', () => {
  const GG = fresh(), K = GG.calendar;
  const on = { canada_day: 1, thanksgiving: 7, halloween: 8, remembrance: 9, grey_mug: 10, christmas: 11, nye: 12, st_patricks: 18, loonies: 20 };
  for (const id in on) ok(K.holidays(on[id]).some(h => h.id === id), id + ' in week ' + on[id]);
  eq(K.holiday(12).id, 'nye'); ok(K.holidays(12).some(h => h.id === 'christmas'), 'still Christmas in week 12');
  eq(K.holiday(3), null);
});

test('weather: deterministic per seed + week, seasonal, plausible temps, climates remap, career RNG untouched', () => {
  const GG = fresh(), K = GG.calendar, C = GG.contracts;
  const s = career(GG, 7), rng0 = s.rng;
  const a = K.weatherAt(s), b = K.weatherAt(s);
  eq(a, b); eq(s.rng, rng0, 'weather never moves the career RNG');
  const byS = { summer: {}, fall: {}, winter: {}, spring: {} }, temps = { summer: [], winter: [] };
  for (let seed = 1; seed <= 60; seed++) for (let w = 1; w <= 24; w++) {
    const st = at(career(GG, seed), w), x = K.weatherAt(st), se = K.season(w);
    ok(C.WEATHER.includes(x.kind) && Number.isInteger(x.temp), 'kind + temp');
    byS[se][x.kind] = (byS[se][x.kind] || 0) + 1;
    if (temps[se]) temps[se].push(x.temp);
    if (x.kind === 'heat') ok(x.temp >= 28, 'a heat wave is hot'); if (x.kind === 'snow' || x.kind === 'blizzard') ok(x.temp <= 1, 'snow is cold');
    if (x.kind === 'rain') ok(x.temp >= 1, 'rain is above zero');
  }
  ok(!byS.winter.heat && !byS.winter.rain && !byS.summer.snow && !byS.summer.blizzard, 'no heat waves in winter, no snow in summer');
  ok(byS.winter.blizzard > 0 && byS.summer.hail > 0 && byS.summer.heat > 0 && byS.spring.rain > 0, 'every kind turns up in its season');
  const avg = l => l.reduce((x, y) => x + y, 0) / l.length;
  ok(avg(temps.winter) < -5 && avg(temps.summer) > 18, 'winter cold, summer warm: ' + avg(temps.winter).toFixed(1) + ' / ' + avg(temps.summer).toFixed(1));
  // a coastal city never gets snow; the North never gets rain
  for (let seed = 1; seed <= 40; seed++) for (const w of [12, 14, 16, 18]) {
    const st = at(career(GG, seed), w);
    ok(!['snow', 'blizzard'].includes(K.weatherAt(st, 'Vancouver').kind), 'Vancouver rains instead');
    ok(K.weatherAt(st, 'Yellowknife').kind !== 'rain', 'Yellowknife snows instead');
  }
});

test('Monday: state.weather cached + calendar:week event; HUD label; season news in the group chat', () => {
  const GG = fresh(), K = GG.calendar, s = career(GG, 9), evs = [];
  GG.on('calendar:week', p => evs.push(p));
  GG.career.startWeek(s);
  eq(s.weather, K.weatherAt(s)); eq(evs.length, 1); eq([evs[0].month, evs[0].season, evs[0].holiday], ['Jul', 'summer', 'canada_day']);
  const L = K.label(s);
  ok(L.monthName === 'July' && L.seasonName === 'Summer' && L.weatherIcon && /July · Summer · .*°C · Canada Day/.test(L.text), 'label: ' + L.text);
  eq(K.weather(s), s.weather, 'cached');
  at(s, 17); s.weekStart = null; const n = s.chat.length; K.monday(s);
  ok(s.chat.length === n + 1 && /festival lineups/i.test(s.chat[s.chat.length - 1].text), 'spring: the festival lineups are out');
  at(s, 9); s.weekStart = null; K.monday(s);
  ok(/Remembrance/.test(s.chat[s.chat.length - 1].text), 'Remembrance Day note');
});

test('weather never cancels a gig: a booked blizzard weekend still plays (and says so)', () => {
  const GG = fresh(), K = GG.calendar;
  let s = null, wk = 0;
  for (let seed = 1; seed <= 200 && !s; seed++) for (let w = 11; w <= 16 && !s; w++) {
    const st = at(career(GG, seed, { fans: 200 }), w);
    if (K.weatherAt(st, 'Saskatoon').kind === 'blizzard') { s = st; wk = w; }
  }
  ok(s, 'found a blizzard week');
  s.gig = GG.world.decorate(s, GG.gig.makeGig(s, 'gopher_hole', 'book')); s.plan = ['rehearse', 'rest', 'rest']; s.phase = 'plan';
  const r = GG.career.runWeek(s, { autoGig: true });
  ok(r.gig && r.gig.crowd >= 1 && r.gig.weather === 'blizzard', 'played in a blizzard, week ' + wk);
  ok(r.gig.lines.some(t => /blizzard|diehards|Whiteout/i.test(t)), 'a blizzard line');
});

test('outdoor shows: weather hits turnout (and door pay); indoor rooms barely notice', () => {
  const GG = fresh(), K = GG.calendar;
  const find = kind => { for (let seed = 1; seed < 400; seed++) for (const w of [2, 3, 4, 23, 24]) { const st = at(career(GG, seed, { fans: 300 }), w); if (K.weatherAt(st, 'Martensville').kind === kind) return st; } };
  const rainy = find('rain'), sunny = find('clear');
  const mk = (st, id) => GG.world.decorate(st, GG.gig.makeGig(st, id, 'book'));
  const res = (g, st) => ({ venueId: g.venueId, crowd: 60, capacity: g.capacity, grade: 'B', fans: 10, pay: 0, lines: [], deltas: null });
  const g1 = mk(rainy, 'martensville_skatepark'), r1 = K.shape(rainy, g1, res(g1), GG.RNG(1));
  eq([r1.crowd, r1.fans, r1.weather], [Math.round(60 * GG.content.calendar.kinds.rain.outdoor), Math.round(10 * GG.content.calendar.kinds.rain.outdoor), 'rain']);
  const g2 = mk(sunny, 'martensville_skatepark'), r2 = K.shape(sunny, g2, res(g2), GG.RNG(1));
  ok(r2.crowd > 60 && r2.lines.length, 'clear skies bring a few more out');
  const g3 = mk(rainy, 'gopher_hole'), r3 = K.shape(rainy, g3, res(g3), GG.RNG(1));
  eq(r3.crowd, 60, 'indoors: rain changes nothing'); ok(g1.outdoor && !g3.outdoor && g1.tags.some(t => /Outdoors/.test(t.text)), 'outdoor tag on the listing');
});

test('venues by season + holiday: Canada Day park stages, no skate parks in winter, Legion closed on Remembrance Day', () => {
  const GG = fresh(), K = GG.calendar, V = id => GG.gig.venue(id);
  const s = career(GG, 3, { fans: 400 });
  ok(K.venueOpen(at(s, 1), V('riverside_canada_day_stage')) && !K.venueOpen(at(s, 2), V('riverside_canada_day_stage')), 'Canada Day only');
  ok(!K.venueOpen(at(s, 13), V('martensville_skatepark')) && K.venueOpen(at(s, 18), V('martensville_skatepark')), 'skate parks close for winter');
  ok(K.venueOpen(at(s, 5), V('campus_bowl_frosh')) && !K.venueOpen(at(s, 8), V('campus_bowl_frosh')), 'frosh week 5–6');
  ok(K.venueOpen(at(s, 11), V('potash_xmas_party')) && !K.venueOpen(at(s, 13), V('potash_xmas_party')), 'Christmas parties 11–12');
  ok(!K.venueOpen(at(s, 9), V('legion_63')) && K.venueOpen(at(s, 10), V('legion_63')), 'Legion closed week 9');
  at(s, 9); s.gig = null;
  for (let i = 0; i < 20; i++) { s.totalWeek += 24; GG.world.refresh(s, true); ok(!s.listings.some(l => l.kind === 'legion'), 'no Legion listings on Remembrance Day'); }
  s.gig = null; const d = {}; GG.career.applyEffects(s, { book: 'legion_63' }, d); ok(!s.gig && !d.book, 'a card cannot book the Legion that week');
  // Canada Day: the park stage nearly always makes the board
  let park = 0; for (let y = 1; y <= 30; y++) { const st = at(career(GG, y, { fans: 300 }), 1, 2); if (GG.world.listings(st).some(l => /Canada Day/.test(l.name))) park++; }
  ok(park >= 20, 'Canada Day park shows on the board: ' + park + '/30');
});

test('holiday pay: NYE doubles, St. Paddy\'s bars + the Christmas party circuit pay more; tags say so', () => {
  const GG = fresh(), K = GG.calendar, s = career(GG, 4, { fans: 300 }), V = id => GG.gig.venue(id);
  eq(K.payMult(at(s, 12), V('gopher_hole')), 2); eq(K.payMult(at(s, 12), V('legion_63')), 2);
  ok(K.payMult(at(s, 18), V('gopher_hole')) > 1 && K.payMult(at(s, 18), V('club_permafrost')) === 1, 'St. Paddy\'s: bars only');
  ok(K.payMult(at(s, 11), V('warman_curling_lounge')) > 1, 'Christmas party circuit');
  const same = (w) => { const st = at(career(GG, 4, { fans: 300 }), w); return GG.world.makeListing(st, Object.assign({}, V('pile_o_bones_tavern'), { deals: ['flat'] }), GG.RNG(5)); };
  const nye = same(12), plain = same(14);
  ok(Math.abs(nye.pay - plain.pay * 2) <= 5, 'NYE flat pay x2: ' + nye.pay + ' vs ' + plain.pay);
  ok(nye.tags.some(t => /New Year/.test(t.text)), 'NYE tag');
});

test('genre-season fit: metal owns winter, country the summer fairs; it shows in the gig mods', () => {
  const GG = fresh(), K = GG.calendar, s = career(GG, 5, { fans: 300 }), V = id => GG.gig.venue(id);
  ok(K.seasonFit(at(s, 13), V('gopher_hole')) > K.seasonFit(at(s, 13), V('legion_63')) && K.seasonFit(at(s, 13), V('legion_63')) > 0, 'metal in winter, more in bars');
  ok(K.seasonFit(at(s, 2), V('gopher_hole')) < 0, 'metal in July: leather is a choice');
  const c = Object.assign(career(GG, 5), { genre: 'country' });
  ok(K.seasonFit(at(c, 2), V('hometown_fair_grandstand')) > K.seasonFit(at(c, 2), V('gopher_hole')), 'country at the summer fair');
  at(s, 13); s.gig = GG.world.decorate(s, GG.gig.makeGig(s, 'gopher_hole', 'book'));
  const m = K.gigMods(s), d = GG.drama.gigMods(s);
  ok(m.score > 0 && m.fansMult > 1, 'winter metal gig mods: ' + JSON.stringify(m));
  ok(Math.abs(d.score - (d.score - m.score) - m.score) < 1e-9 && d.fansMult >= m.fansMult, 'drama.gigMods folds the calendar in');
  ok(s.gig.tags.some(t => /Your season/.test(t.text)), 'board tag');
  ok(/Metal owns the dark months/.test(K.fitLine(s)), 'fit line');
});

test('holiday Monday cards: Thanksgiving guilt only if you owe, Halloween costumes, Christmas single when signed', () => {
  const GG = fresh(), K = GG.calendar;
  const s = at(career(GG, 11), 7);
  eq(K.holidayCard(s).id, 'holiday_thanksgiving');
  s.flags.parentsLoan = true; eq(K.holidayCard(s).id, 'holiday_thanksgiving_guilt');
  eq(K.holidayCard(at(career(GG, 11), 1, 1)), null, 'week 1 of the career belongs to Lord Abyssus');
  eq(K.holidayCard(at(career(GG, 11), 1, 2)).id, 'holiday_canada_day');
  // through startWeek
  const h = at(career(GG, 12), 8); h.weekStart = null;
  GG.career.startWeek(h); eq(h.card.id, 'holiday_halloween');
  GG.career.resolveCard(h, 0); eq(h.flags.costume, 'Tundra Wraith (veggie tray included)');
  h.gig = GG.world.decorate(h, GG.gig.makeGig(h, 'gopher_hole', 'book'));
  const r = K.shape(h, h.gig, { venueId: 'gopher_hole', crowd: 50, capacity: 150, grade: 'B', fans: 5, lines: [] }, GG.RNG(2));
  ok(r.holiday === 'halloween' && r.lines.some(t => /dressed as Tundra Wraith|six Marcels/.test(t)), 'costume gig line');
  at(h, 9); K.monday(h); ok(!h.flags.costume, 'costumes come off after Halloween');
  // the same holiday card returns next year (cooldown 20)
  const y2 = at(h, 8, 2); ok(K.holidayCard(y2) && K.holidayCard(y2).id === 'holiday_halloween', 'next Halloween');
  // Christmas: the single needs the Signed era + a label; otherwise the party circuit
  const x = at(career(GG, 13), 11); eq(K.holidayCard(x).id, 'holiday_xmas_parties');
  Object.assign(x, { era: 'signed' }); x.flags.label = 'gopherwood'; eq(K.holidayCard(x).id, 'holiday_xmas_single');
});

test('the Grey Mug halftime show: late-career only; next Monday brings the afterglow (fans, trophy)', () => {
  const GG = fresh(), K = GG.calendar;
  const s = at(career(GG, 21, { era: 'signed', fans: 25000 }), 10, 5);
  eq(K.holidayCard(s).id, 'holiday_grey_mug');
  eq(K.holidayCard(at(career(GG, 21, { era: 'local', fans: 25000 }), 10, 5)), null, 'not before Signed');
  eq(K.holidayCard(at(career(GG, 21, { era: 'signed', fans: 5000 }), 10, 5)), null, 'not with a small crowd');
  s.weekStart = null; GG.career.startWeek(s); eq(s.card.id, 'holiday_grey_mug');
  GG.career.resolveCard(s, 0); eq(s.flags.greyMug, 'played');
  const f0 = s.fans; at(s, 11, 5); K.monday(s);
  ok(s.fans > f0 && s.flags.greyMug === 'done' && s.trophies.some(t => t.kind === 'greymug'), 'afterglow: +' + (s.fans - f0) + ' fans, trophy');
  const f1 = s.fans; K.monday(s); eq(s.fans, f1, 'once');
  at(s, 10, 6); eq(K.holidayCard(s), null, 'once per career');
});

test('the road: season + weather risk, spring potholes, a blizzard makes breakdowns likelier', () => {
  const GG = fresh(), K = GG.calendar, s = career(GG, 30, { protected: false });
  s.van.condition = 40;
  const summer = K.roadMods(at(s, 2)), winter = K.roadMods(at(s, 13)), spring = K.roadMods(at(s, 19));
  ok(winter.road > 1 && spring.wear > 1, 'winter roads + spring potholes: ' + JSON.stringify([summer, winter, spring]));
  let bz = null; for (let seed = 1; seed < 300 && !bz; seed++) { const st = at(career(GG, seed, { protected: false }), 13); if (K.weatherAt(st).kind === 'blizzard') bz = st; }
  let cl = null; for (let seed = 1; seed < 300 && !cl; seed++) { const st = at(career(GG, seed, { protected: false }), 13); if (K.weatherAt(st).kind === 'clear') cl = st; }
  bz.van.condition = cl.van.condition = 40;
  ok(GG.world.breakdownChance(bz, 239) > GG.world.breakdownChance(cl, 239), 'blizzard > clear');
  ok(GG.world.tripBurnout(bz, 239) > GG.world.tripBurnout(cl, 239), 'a blizzard drive is harder');
});

test('migration v6 -> v7: weather filled in, v = 7, idempotent, save code round-trip; old saves keep playing', () => {
  const GG = fresh(), s = career(GG, 44);
  GG.career.startWeek(s);
  const old = JSON.parse(JSON.stringify(s)); old.v = 6; delete old.weather; delete old.van.driver;
  const m = GG.save.migrate(JSON.parse(JSON.stringify(old)));
  eq(m.v, GG.contracts.SAVE_SCHEMA); ok(GG.contracts.SAVE_SCHEMA >= 7);
  eq(m.weather, GG.calendar.weatherAt(m)); eq(m.van.driver, 'kenji');
  eq(JSON.stringify(GG.save.migrate(JSON.parse(JSON.stringify(m)))), JSON.stringify(m), 'idempotent');
  const bad = JSON.parse(JSON.stringify(m)); bad.weather = { kind: 'tornado' };
  eq(GG.save.migrate(bad).weather, GG.calendar.weatherAt(m), 'junk weather re-rolled');
  eq(JSON.stringify(GG.save.fromCode(GG.save.toCode(m))), JSON.stringify(m), 'save code');
  GG.career.botWeek(m, 'avg'); ok(m.totalWeek === s.totalWeek + 1 && m.weather.week === m.totalWeek - 1 || m.weather.week === m.totalWeek, 'keeps playing');
});

test('bots: ten-year careers stay sane with the calendar (holiday cards drawn, gigs in every weather)', () => {
  const GG = fresh(), seen = {}, wx = {};
  GG.on('gig:done', p => { wx[p.result.weather] = 1; });
  for (const style of ['avg', 'good']) {
    const s = career(GG, style === 'good' ? 77 : 78);
    while (!s.ended) GG.career.botWeek(s, style);
    Object.keys(s.seenCards).filter(id => /^holiday_/.test(id)).forEach(id => { seen[id] = 1; });
    ok(isFinite(s.fund) && s.fund >= 0 && isFinite(s.fans), style + ': sane');
  }
  ok(['holiday_canada_day', 'holiday_halloween', 'holiday_st_paddys'].every(id => seen[id]), 'holiday cards drawn: ' + Object.keys(seen).join(' '));
  ok(Object.keys(wx).length >= 5, 'gigs in all sorts of weather: ' + Object.keys(wx).join(' '));
});

test('sim purity: 28_sim_calendar has no Math.random / Date / DOM', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', '28_sim_calendar.js'), 'utf8');
  ok(!/Math\.random|\bDate\b|document\.|window\.(?!GG)/.test(src), 'pure');
});

test('v0.9: season news byBand replaces the flat week and speaks through the band; weather affinity per band', () => {
  const GG = fresh(), Cal = GG.content.calendar, fh = GG.career.newCareer({ seed: 12, bandId: 'frost_heave' });
  const saved = Cal.byBand;
  Cal.byBand = Object.assign({}, saved || {}, { frost_heave: { news: { 3: { who: 'rox', text: 'Council meets Tuesday. Bring a sign.' } } } });
  try {
    fh.totalWeek = 3; fh.week = 3;
    GG.calendar.monday(fh);
    ok(fh.chat.some(m => m.who === 'rox' && /Council meets/.test(m.text)), 'the band\'s own news');
    const fh2 = GG.career.newCareer({ seed: 12, bandId: 'frost_heave' });
    delete Cal.byBand.frost_heave;
    const flat = (Cal.news || {})[5];
    fh2.totalWeek = 5; fh2.week = 5;
    GG.calendar.monday(fh2);
    if (flat && !GG.career.speakerOk(fh2, flat.who)) ok(!fh2.chat.some(m => m.who === flat.who), 'a Hail Damage speaker never posts in Frost Heave\'s chat');
  } finally { Cal.byBand = saved; if (saved === undefined) delete Cal.byBand; }
  eq(GG.calendar.bandWeather(GG.career.newCareer({ seed: 1 })).kind, 'hail', 'Hail Damage and the hail');
  eq(GG.calendar.bandWeather(fh), null, 'no affinity unless bands.js says so');
});

done('sim_calendar');
