// World sim tests (26_sim_world): the weekly board, deals, opening slots, venue rep + bans, freshness, the van,
// road trips + road cards, the Book block pick, and the v2 -> v3 save migration.
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');

const fresh = () => load({ localStorage: load.fakeStorage() });
const career = (GG, seed, fans) => { const s = GG.career.newCareer({ seed: seed || 5, player: { name: 'T' } }); if (fans != null) s.fans = fans; return s; };
const result = (g, grade, extra) => Object.assign({ venueId: g.venueId, name: g.name, city: g.city, deal: g.deal, source: g.source,
  crowd: 20, capacity: g.capacity, score: 60, grade: grade || 'B', pay: 0, gas: g.gas, fans: 5, buzz: 1, songs: [], songIds: [],
  reactions: [], lines: [], deltas: null }, extra || {});

test('listings: 3–6 bookable gigs, deterministic per seed + week, career RNG untouched', () => {
  const GG = fresh(), W = GG.world;
  const a = career(GG, 11, 120), b = career(GG, 11, 120);
  const rng0 = a.rng, la = W.listings(a), lb = W.listings(b);
  eq(a.rng, rng0, 'listings never move the career RNG');
  eq(JSON.stringify(la), JSON.stringify(lb), 'same seed + week => same board');
  ok(la.length >= 3 && la.length <= 6, 'count ' + la.length);
  const ids = new Set(la.map(l => l.id)); eq(ids.size, la.length, 'unique ids');
  const venues = new Set(la.map(l => l.venueId)); eq(venues.size, la.length, 'one listing per venue');
  la.forEach(l => {
    const v = GG.gig.venue(l.venueId);
    ok(v && v.tier <= 2 && v.minFans < 99999, l.venueId + ' listed venue');
    ok(a.fans >= l.minFans, l.venueId + ' in reach');
    ok(GG.contracts.DEALS.includes(l.deal) && l.pay >= 0 && (l.deal !== 'exposure' || l.pay === 0), l.venueId + ' deal');
    eq(l.gas, Math.max(5, Math.round(l.km * 2 * 0.25)), l.venueId + ' gas from road km');
    ok(typeof l.catch === 'string' && l.catch && isFinite(l.fit) && l.setSize >= 2, l.venueId + ' board fields');
  });
  for (let i = 1; i < la.length; i++) ok(la[i - 1].km <= la[i].km, 'sorted by distance');
  b.totalWeek = 2; const lb2 = W.listings(b);
  ok(JSON.stringify(lb2) !== JSON.stringify(la), 'another week, another board');
  // refresh stores the board once per week
  const st = career(GG, 12, 60); GG.career.startWeek(st);
  eq(st.listingsWeek, 1); const first = JSON.stringify(st.listings);
  eq(JSON.stringify(W.board(st)), first, 'board() returns the stored week');
});

test('listings at 12 fans: only the zero-fan rooms; big rooms need fans', () => {
  const GG = fresh(), W = GG.world, s = career(GG, 3, 12);
  const l = W.listings(s);
  ok(l.length >= 3, 'enough to choose from: ' + l.length);
  ok(l.every(x => x.minFans <= 12 && !x.opening), 'all in reach, no openings under 20 fans');
  const big = career(GG, 3, 900), lb = [];
  for (let w = 1; w <= 30; w++) { big.totalWeek = w; lb.push(...W.listings(big)); }
  ok(lb.some(x => x.tier === 2) && lb.some(x => x.venueId === 'club_permafrost'), 'tier 2 and the big club show up with fans');
});

test('deals: all three appear; pay ranges, rep pay and hazard pay', () => {
  const GG = fresh(), W = GG.world, s = career(GG, 7, 500), seen = {};
  for (let w = 1; w <= 40; w++) { s.totalWeek = w; W.listings(s).forEach(l => { seen[l.deal] = true; }); }
  eq(Object.keys(seen).sort(), ['door', 'exposure', 'flat']);
  const v = GG.gig.venue('bingo_palace'), rng = () => GG.RNG(99);
  const base = W.makeListing(s, v, rng(), { deal: 'flat' });
  ok(base.pay >= 80 && base.pay <= 120 && base.pay % 5 === 0, 'flat in range: ' + base.pay);
  s.venueRep.bingo_palace = 3;
  const loved = W.makeListing(s, v, rng(), { deal: 'flat' });
  ok(loved.pay > base.pay && loved.rebook && loved.repLevel === 3, 'rebooked at better pay: ' + base.pay + ' -> ' + loved.pay);
  const door = W.makeListing(s, GG.gig.venue('gopher_hole'), rng(), { deal: 'door' });
  ok(door.pay >= 2 && door.pay <= 3 && door.pay * 2 === Math.round(door.pay * 2), 'door $/head in half dollars: ' + door.pay);
  eq(GG.gig.payFor(door, 100), Math.round(door.pay * 100), 'door pays per head');
  const cs = career(GG, 7, 500); cs.genre = 'metal';
  const saloon = W.makeListing(cs, GG.gig.venue('speedy_creek_saloon'), rng(), { deal: 'flat' });
  const hall = GG.gig.venue('speedy_creek_saloon').payRange.flat;
  ok(saloon.clash && saloon.pay > hall[0] * 1.2 - 5, 'metal at a country bar: hazard pay ' + saloon.pay);
  eq(W.fitLabel(saloon.fit).id, 'clash');
  const ex = W.makeListing(s, GG.gig.venue('buddys_house_party'), rng(), {});
  eq([ex.deal, ex.pay], ['exposure', 0]);
});

test('genre clash: the result gets a flying-boots line', () => {
  const GG = fresh(), W = GG.world, s = career(GG, 7, 300);
  const g = W.makeListing(s, GG.gig.venue('speedy_creek_saloon'), GG.RNG(3), {});
  const r = W.shape(s, g, result(g, 'B'), GG.RNG(4));
  ok(r.shaped && r.lines.some(t => GG.content.lines.genreClash.includes(t)), 'clash line');
  const again = r.lines.length; W.shape(s, g, r, GG.RNG(4)); eq(r.lines.length, again, 'shape is once-only');
});

test('opening slots: bad pay, a slice of the headliner crowd, sometimes your rival', () => {
  const GG = fresh(); GG.content.economy.world = { opening: { chance: 1, rivalChance: 0 } };
  const W = GG.world, s = career(GG, 8, 80);
  let op = null;
  for (let w = 1; w <= 5 && !op; w++) { s.totalWeek = w; op = W.listings(s).find(l => l.opening); }
  ok(op && op.tier === 2 && op.setSize === 2 && op.minFans <= 80 && op.minFans >= 20, 'an opening slot in reach');
  ok(op.deal === 'exposure' ? op.pay === 0 : op.pay >= 20 && op.pay <= 45, 'bad pay: ' + op.deal + ' ' + op.pay);
  ok(!op.opening.rival && GG.content.headliners.some(h => h.id === op.opening.id), 'a local headliner');
  const r = result(op, 'A', { crowd: 30, fans: 6 });
  W.shape(s, op, r, GG.RNG(1));
  ok(r.crowd > 30 && r.crowd <= op.capacity && r.fans > 6, 'crowd + fans from the headliner: ' + r.crowd + ' / ' + r.fans);
  ok(r.lines.some(t => t.indexOf('Opening for ' + op.opening.name) === 0), 'opening line');
  GG.content.economy.world = { opening: { chance: 1, rivalChance: 1 } };
  let riv = null;
  for (let w = 1; w <= 5 && !riv; w++) { s.totalWeek = w; riv = W.listings(s).find(l => l.opening && l.opening.rival); }
  ok(riv && riv.opening.name === 'Tundra Wraith', 'you open for your rival');
  const rr = W.shape(s, riv, result(riv, 'B'), GG.RNG(2));
  ok(rr.lines.some(t => /buddy/.test(t)), 'the frontman calls you buddy');
  s.fans = 40; GG.content.economy.world = { opening: { chance: 1, rivalChance: 1, rivalMinFans: 60 } };
  for (let w = 1; w <= 10; w++) { s.totalWeek = w; ok(!W.listings(s).some(l => l.opening && l.opening.rival), 'no rival under rivalMinFans'); }
});

test('venue rep: crush it -> up + rebook, bomb -> down, twice -> banned (off the board, no offers, no card bookings)', () => {
  const GG = fresh(), W = GG.world, s = career(GG, 9, 100);
  const g = W.decorate(s, GG.gig.makeGig(s, 'legion_63', 'book'));
  const up = W.afterGig(s, g, result(g, 'S'), GG.RNG(1));
  eq([up.rep, up.repAfter, up.banned], [2, 2, false]);
  ok(up.lines.some(t => GG.content.lines.venueUp.includes(t)), 'rebook line');
  W.afterGig(s, g, result(g, 'A'), GG.RNG(1)); eq(W.rep(s, 'legion_63'), 3);
  W.afterGig(s, g, result(g, 'S'), GG.RNG(1)); eq(W.rep(s, 'legion_63'), 3, 'clamped at +3');
  const b = W.decorate(s, GG.gig.makeGig(s, 'bingo_palace', 'book'));
  const d1 = W.afterGig(s, b, result(b, 'D'), GG.RNG(1));
  eq([d1.rep, d1.repAfter, d1.banned], [-2, -2, false]); ok(d1.lines.some(t => GG.content.lines.venueDown.includes(t)), 'down line');
  eq(W.rep(s, 'bingo_palace'), -2);
  const d2 = W.afterGig(s, b, result(b, 'D'), GG.RNG(1));
  eq([d2.rep, d2.repAfter, d2.banned], [-1, -3, true]); ok(d2.lines.some(t => GG.content.lines.venueBanned.includes(t)), 'banned line');
  eq(s.banned, ['bingo_palace']);
  for (let w = 1; w <= 30; w++) { s.totalWeek = w; ok(!W.listings(s).some(l => l.venueId === 'bingo_palace'), 'banned: never listed'); }
  for (let i = 0; i < 40; i++) { const o = W.offer(s, GG.RNG(i + 1)); ok(!o || o.venueId !== 'bingo_palace', 'banned: never offered'); }
  s.gig = null; const d = GG.career.applyEffects(s, { book: 'bingo_palace' }, {});
  ok(!s.gig && !d.book, 'a card cannot book you into a venue that banned you');
  W.afterGig(s, b, result(b, 'D'), GG.RNG(1)); eq(s.banned, ['bingo_palace'], 'banned once');
  s.totalWeek = 1; s.venueRep.legion_63 = 3;
  let rebooks = 0; for (let w = 1; w <= 12; w++) { s.totalWeek = w; if (W.listings(s).some(l => l.venueId === 'legion_63' && l.rebook)) rebooks++; }
  eq(rebooks, 12, 'a venue that loves you is on the board every week');
});

test('freshness: the same room next week brings fewer new fans', () => {
  const GG = fresh(), W = GG.world, s = career(GG, 4, 100);
  const g = W.decorate(s, GG.gig.makeGig(s, 'legion_63', 'book'));
  eq(W.freshness(s, 'legion_63'), 1);
  W.afterGig(s, g, result(g, 'B'), GG.RNG(1));
  s.totalWeek++; eq(W.freshness(s, 'legion_63'), 0.4);
  const r = W.shape(s, g, result(g, 'B', { fans: 20 }), GG.RNG(1));
  eq(r.fans, 8); ok(r.lines.some(t => GG.content.lines.sameCrowd.includes(t)), 'same-crowd line');
  s.totalWeek += 3; eq(W.freshness(s, 'legion_63'), 1, 'fresh again after 4 weeks');
});

test('van: wear per km, burnout on long drives, no breakdowns while protected', () => {
  const GG = fresh(), W = GG.world, s = career(GG, 6, 100);
  eq([s.van.id, s.van.name, s.van.condition, s.van.km], ['van', 'The Moose Hearse', 72, 0]);   // v0.9: a neutral id, the band's van name
  eq(W.km('Saskatoon', 'Regina'), 239); eq(W.km('regina', 'saskatoon'), 239);
  eq(W.km('Swift Current', 'Yorkton'), 174 + 71 + 187, 'shortest path through Moose Jaw and Regina');
  eq(W.route('saskatoon', 'swift_current'), ['saskatoon', 'swift_current']);
  const reg = W.decorate(s, GG.gig.makeGig(s, 'craigs_basement', 'book'));
  eq(reg.km, 239);
  const d = {}, t = W.travel(s, reg, GG.RNG(1), d);
  ok(t.wear >= 4 && t.wear <= 5 && s.van.condition === 72 - t.wear, 'Regina round trip wears ~4: ' + t.wear);
  eq(t.burnout, Math.round(2.39 * 4 * 0.5), 'long drive + comfort 2 = burnout'); eq(d.burnout, t.burnout);
  eq(d.van.condition, -t.wear); eq(s.van.km, 478);
  const home = W.decorate(s, GG.gig.makeGig(s, 'legion_63', 'book'));
  const t2 = W.travel(s, home, GG.RNG(2), {}); eq(t2.burnout, 0, 'no burnout across town');
  s.van.condition = 0; s.protected = true;
  const rng = GG.RNG(5); let bd = 0;
  for (let i = 0; i < 300; i++) if (W.travel(s, reg, rng, {}).breakdown) bd++;
  eq([bd, s.van.breakdowns, W.breakdownChance(s, 239)], [0, 0, 0], 'protected: nothing breaks down');
  eq(s.van.condition, 0, 'condition still drops (floored at 0)');
  s.protected = false; const f0 = s.fund;
  for (let i = 0; i < 60; i++) if (W.travel(s, reg, rng, {}).breakdown) bd++;
  ok(bd > 5 && s.van.breakdowns === bd && s.fund < f0, 'unprotected wreck breaks down: ' + bd);
  s.van.condition = 100; ok(W.breakdownChance(s, 239) === 0, 'a perfect van never breaks');
});

test('van repair at Cousin Dale\'s: +20 condition for $3 a point', () => {
  const GG = fresh(), W = GG.world, s = career(GG, 6);
  s.van.condition = 50; s.fund = 100;
  eq(W.repairQuote(s), { cost: 60, gain: 20 });
  const r = W.repairVan(s); eq([r.cost, r.gain, s.van.condition, s.fund], [60, 20, 70, 40]);
  eq(W.repairVan(s), null, 'broke: no repair'); s.van.condition = 95; s.fund = 500;
  eq(W.repairQuote(s), { cost: 15, gain: 5 }); s.van.condition = 100; eq(W.repairVan(s), null, 'nothing to fix');
});

test('road trips: once per week, gated cards, resolved like a Monday card', () => {
  const GG = fresh(), W = GG.world, s = career(GG, 21, 100);
  s.gig = W.decorate(s, GG.gig.makeGig(s, 'craigs_basement', 'book'));
  const t = W.startTrip(s), again = W.startTrip(s);
  ok(t === again && t.km === 239 && t.fromName === 'Saskatoon' && t.toName === 'Regina' && t.highway === 'Hwy 11', 'same trip twice');
  eq(t.season, 'summer'); ok(Array.isArray(t.banter) && t.banter.length >= 1 && t.banter.length <= 2, 'banter lines');
  t.banter.forEach(b => ok(b.who !== 'kenji' || /^\(.*\)$/.test(b.text), 'Kenji never talks: ' + b.text));
  // gates: season + km
  const CARDS = GG.content.roadCards, byId = id => CARDS.find(c => c.id === id);
  ok(!W.roadGatePasses(s, byId('road_whiteout').gate, 239, 'summer') && W.roadGatePasses(s, byId('road_whiteout').gate, 239, 'winter'), 'whiteout: winter only');
  ok(!W.roadGatePasses(s, byId('road_yellowhead_flat').gate, 23, 'fall'), 'flat: long drives only');
  const rng = GG.RNG(8);
  for (let i = 0; i < 200; i++) { const c = W.drawRoad(s, 12, 'summer', rng); ok(!c || !(c.gate && c.gate.minKm > 12), 'local trip draws only local cards'); }
  let n = 0; for (let i = 0; i < 100; i++) if (W.drawRoad(s, 239, 'summer', rng)) n++;
  ok(n > 75, 'long drives nearly always get a card: ' + n);
  // resolve: force a known card with a van effect
  s.trip.cardId = 'road_van_noise'; s.trip.resolved = false;
  const f0 = s.fund, c0 = s.van.condition, evs = []; GG.on('road:resolved', p => evs.push(p));
  const r = W.resolveRoad(s, 1);
  eq([r.cardId, r.choice, s.fund, s.van.condition], ['road_van_noise', 1, f0 - 50, Math.min(100, c0 + 8)]);
  eq(r.deltas.van.condition, s.van.condition - c0); ok(r.outcome.length > 10 && evs.length === 1, 'outcome + event');
  eq(W.resolveRoad(s, 0), null, 'resolves once');
  eq(GG.career.effectSummary({ fund: -50, van: { condition: 8 } }), '−$50 · Van ↑↑');
  // next week: a new trip
  s.totalWeek++; ok(W.trip(s) === null && W.startTrip(s) !== t, 'a trip belongs to one week');
});

test('autoTrip (bots): starts the trip and resolves its card with the bot choice', () => {
  const GG = fresh(), W = GG.world;
  let resolved = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const s = career(GG, seed, 100);
    s.gig = W.decorate(s, GG.gig.makeGig(s, 'yellowhead_inn_lounge', 'book'));
    const t = W.autoTrip(s, 'good');
    ok(t && t.resolved, 'resolved (or no card)'); if (t.cardId) resolved++;
  }
  ok(resolved >= 14, 'most long trips had a card: ' + resolved);
});

test('Book block: board pick, skip, or an automatic best pick', () => {
  const GG = fresh(), W = GG.world;
  const mk = () => { const s = career(GG, 31, 60); s.gig = null; GG.career.startWeek(s); return s; };
  let s = mk(); const pickL = s.listings[s.listings.length - 1];
  eq(GG.career.pickListing(s, pickL.id).id, pickL.id); eq(s.bookPick, pickL.id);
  eq(GG.career.pickListing(s, 'nope'), null, 'unknown id ignored'); eq(s.bookPick, pickL.id);
  GG.career.setPlan(s, ['book', 'rest', 'rest']); let r = GG.career.runWeek(s, { autoGig: true });
  eq([r.blocks[0].deltas.book, r.gig.venueId, s.bookPick], [pickL.venueId, pickL.venueId, null], 'the pick is booked and played');
  ok(r.blocks[0].lines.some(t => /^Booked: /.test(t)), 'booked line');
  s = mk(); GG.career.pickListing(s, 'skip'); GG.career.setPlan(s, ['book', 'rest', 'rest']);
  r = GG.career.runWeek(s, { autoGig: true });
  ok(!r.gig && !s.gig && r.blocks[0].deltas.buzz > 0 && /No gig/.test(r.blocks[0].lines.join(' ')), 'skip: no gig, posters');
  s = mk(); GG.career.setPlan(s, ['book', 'rest', 'rest']);
  const best = W.botBook(s, 'good'); r = GG.career.runWeek(s, { autoGig: true });
  eq(r.gig.venueId, W.find(s, best).venueId, 'no pick = the best listing');
  s = mk(); s.fans = 5000; ok(W.botBook(s, 'avg') !== undefined, 'avg bot picks something');
});

test('offers carry board fields; card bookings are decorated', () => {
  const GG = fresh(), W = GG.world, s = career(GG, 41, 200);
  const o = W.offer(s, GG.RNG(3));
  ok(o && o.source === 'offer' && isFinite(o.km) && isFinite(o.gas) && typeof o.catch === 'string' && o.minFans <= 200, 'offer shape');
  s.gig = null; GG.career.applyEffects(s, { book: 'st_vlads_hall' }, {});
  ok(s.gig && s.gig.source === 'card' && s.gig.km === 0 && s.gig.gas === 5 && s.gig.catch, 'card booking decorated');
  const s2 = career(GG, 42); ok(s2.gig.venueId === 'buddys_house_party' && s2.gig.km === 0 && s2.gig.catch, 'week-one gig decorated');
});

test('migration v2 -> v3: defaults for old saves, idempotent, schema bumped', () => {
  const GG = fresh(), s = career(GG, 51);
  ['listings', 'listingsWeek', 'bookPick', 'venueRep', 'venueLast', 'banned', 'van', 'trip', 'liveGig'].forEach(k => delete s[k]);
  s.v = 2;
  const m = GG.save.migrate(JSON.parse(JSON.stringify(s)));
  eq(m.v, GG.contracts.SAVE_SCHEMA); ok(GG.contracts.SAVE_SCHEMA >= 3, 'SAVE_SCHEMA is 3 in this build');
  eq([m.listings, m.listingsWeek, m.bookPick, m.venueRep, m.venueLast, m.banned, m.trip, m.liveGig], [[], 0, null, {}, {}, [], null, null]);
  eq(m.van, Object.assign(GG.world.defaultVan(), { tier: 0, baseName: 'The Moose Hearse', upgrades: [], stickers: [] }), 'v0.3 van + v0.8 tier/name/stickers');
  eq(JSON.stringify(GG.save.migrate(JSON.parse(JSON.stringify(m)))), JSON.stringify(m), 'idempotent');
  const bad = JSON.parse(JSON.stringify(m));
  Object.assign(bad, { venueRep: { a: 9, b: 'x', c: -1 }, banned: ['a', 3], van: { condition: 180, name: 7 }, phase: 'gig', gig: null });
  const f = GG.save.migrate(bad);
  eq([f.venueRep, f.banned, f.van.condition, f.van.name, f.van.comfort, f.phase], [{ a: 3, c: -1 }, ['a'], 100, 'The Moose Hearse', 2, 'wrap']);
  // a migrated old save keeps playing: the board fills in on the next Monday
  GG.career.startWeek(f); ok(f.listings.length >= 3 && f.listingsWeek === f.totalWeek, 'board after migration');
  const code = GG.save.toCode(m); eq(JSON.stringify(GG.save.fromCode(code)), JSON.stringify(m), 'save code round-trip');
});

// ---- v0.6.1 (Addendum 1 C1 + C6): Canada in rings, van drivers ----------------------------------------------------
test('rings: Saskatchewan from day one, the West in Local Heroes, the East & North once Signed; one far gig a week', () => {
  const GG = fresh(), W = GG.world, V = id => GG.gig.venue(id);
  const s = career(GG, 61, 20000);
  eq([W.ring('Saskatoon'), W.ring('Humboldt'), W.ring('Calgary'), W.ring('Winnipeg'), W.ring('Toronto'), W.ring('Yellowknife')], ['sask', 'sask', 'west', 'west', 'eastnorth', 'eastnorth']);
  ok(W.ringOpen(s, 'sask') && !W.ringOpen(s, 'west') && !W.ringOpen(s, 'eastnorth'), 'garage: Saskatchewan only');
  ok(!W.bookable(s, V('cowtown_saloon')) && W.bookable(s, V('derrick_lounge')), 'Calgary locked in the garage, Estevan open');
  s.era = 'local'; ok(W.bookable(s, V('cowtown_saloon')) && !W.bookable(s, V('the_hoofprint')), 'Local Heroes: the West');
  s.era = 'signed'; ok(W.bookable(s, V('the_hoofprint')) && W.bookable(s, V('commandant_ballroom')), 'Signed: the East & North (+ theatres)');
  eq(W.km('saskatoon', 'calgary'), 620, 'the Sad Dome drive stays 620 km');
  for (let w = 1; w <= 40; w++) {
    s.totalWeek = w; s.week = ((w - 1) % 24) + 1;
    const far = W.listings(s).filter(l => W.ring(l.city) !== 'sask').length;
    ok(far <= W.cfg().farListings, 'at most one far gig on the board: week ' + w + ' has ' + far);
  }
  const g = W.makeListing(s, V('the_hoofprint'), GG.RNG(3));
  ok(g.km > 2000 && W.tripBurnout(s, g.km) <= W.cfg().van.burnoutMax, 'long hauls: burnout capped (' + W.tripBurnout(s, g.km) + ')');
  s.protected = false; s.van.condition = 30;
  ok(W.breakdownChance(s, 2600) <= W.breakdownChance(s, 400) * 1.001, 'a cross-country run is not 6x riskier than 400 km');
});

test('drivers: Kenji drives (fewer breakdowns); if he quits you drive, the road pool changes; he comes back', () => {
  const GG = fresh(), W = GG.world, s = career(GG, 62, 300);
  s.protected = false; s.van.condition = 40;
  const k = W.driver(s); eq([k.id, k.you, k.dashboard, s.van.driver], ['kenji', false, 'cactus', 'kenji']);
  const pk = W.breakdownChance(s, 239);
  const kenji = s.members.find(m => m.id === 'kenji'), chat0 = s.chat.length;
  GG.drama.applyMember(s, { id: 'kenji', act: 'quit' }, {});
  ok(kenji.status !== 'active' && s.van.driver === 'you' && W.driver(s).you, 'you drive now');
  ok(s.chat.length > chat0 && s.chat.some(c => /You drive now/.test(c.text)), 'the group chat notices');
  ok(W.breakdownChance(s, 239) > pk * 1.8, 'Kenji halved the breakdowns');
  const CARDS = GG.content.roadCards, byId = id => CARDS.find(c => c.id === id);
  ok(W.roadGatePasses(s, byId('road_wrong_turn').gate, 239, 'summer') && !W.roadGatePasses(s, byId('road_moose').gate, 239, 'summer'), 'you-drive pool on, Kenji cards off');
  const rng = GG.RNG(4), seen = new Set();
  for (let i = 0; i < 300; i++) { const c = W.drawRoad(s, 239, 'summer', rng); if (c) seen.add(c.id); }
  ok(seen.has('road_wrong_turn') || seen.has('road_gas_argument'), 'wrong turns + gas-station arguments: ' + [...seen].join(' '));
  ok([...seen].every(id => !(byId(id).gate && byId(id).gate.driver && byId(id).gate.driver.includes('kenji'))), 'no Kenji-at-the-wheel cards');
  s.gig = W.decorate(s, GG.gig.makeGig(s, 'craigs_basement', 'book'));
  eq(W.startTrip(s).driver, 'you');
  GG.drama.applyMember(s, { id: 'kenji', act: 'return' }, {});
  eq([s.van.driver, W.driver(s).id], ['kenji', 'kenji']); ok(s.chat.some(c => /Kenji is back/.test(c.text)), 'Kenji is back');
});

test('drivers of the other bands: Moth fixes the van free (terrible comfort), T-Bone safe but slow, Earl\'s road stories', () => {
  const GG = fresh(), W = GG.world, D = GG.content.drivers;
  eq(Object.keys(D).sort(), ['earl', 'kenji', 'moth', 'tamara', 'you']);
  eq(['hail_damage', 'frost_heave', 'gravel_kings', 'grid_road_ramblers'].map(b => W.driverFor(b)), ['kenji', 'moth', 'tamara', 'earl']);
  const band = id => { const s = GG.career.newCareer({ seed: 63, bandId: id, player: { name: 'T' } }); s.van.condition = 50; return s; };
  const hd = band('hail_damage'), fh = band('frost_heave'), gk = band('gravel_kings'), gr = band('grid_road_ramblers');
  eq([hd.van.driver, fh.van.driver, gk.van.driver, gr.van.driver], ['kenji', 'moth', 'tamara', 'earl']);
  ok(W.repairQuote(fh).cost === 0 && W.repairQuote(fh).gain > 0 && W.repairQuote(hd).cost > 0, 'Moth: free maintenance');
  ok(W.tripBurnout(fh, 239) > W.tripBurnout(hd, 239), 'Moth: her stuff everywhere');
  [gk, hd].forEach(s => { s.protected = false; });
  ok(W.breakdownChance(gk, 239) < W.breakdownChance(Object.assign(band('gravel_kings'), { protected: false, members: [] }), 239), 'T-Bone: safe');
  ok(W.tripBurnout(gk, 239) > W.tripBurnout(hd, 239), 'T-Bone: slow');
  const d = {}; gr.gig = W.decorate(gr, GG.gig.makeGig(gr, 'craigs_basement', 'book'));
  const c0 = gr.chemistry; W.travel(gr, gr.gig, GG.RNG(5), d); ok(gr.chemistry > c0, 'Earl: road stories boost chemistry');
});

test('trips carry the weather, the holiday and the driver; road cards gate on weather + holidays', () => {
  const GG = fresh(), W = GG.world, s = career(GG, 64, 200);
  s.week = 12; s.totalWeek = 12;
  s.gig = W.decorate(s, GG.gig.makeGig(s, 'craigs_basement', 'book'));
  const t = W.startTrip(s);
  eq([t.weather, t.temp, t.holiday, t.driver], [GG.calendar.weatherAt(s, 'regina').kind, GG.calendar.weatherAt(s, 'regina').temp, 'nye', 'kenji']);
  const byId = id => GG.content.roadCards.find(c => c.id === id);
  ok(W.roadGatePasses(s, byId('road_xmas_lights').gate, 239, 'winter') && !W.roadGatePasses(s, byId('road_long_weekend').gate, 239, 'winter'), 'holiday gates');
  const hail = byId('road_hailstorm').gate, wk = GG.calendar.weatherAt(s, 'regina').kind;
  eq(W.roadGatePasses(s, hail, 239, 'winter', 'regina'), wk === 'hail', 'weather gate');
});

test('sim purity: 26_sim_world has no Math.random / Date / DOM', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', '26_sim_world.js'), 'utf8');
  ok(!/Math\.random|\bDate\b|document\.|window\.(?!GG)/.test(src), 'pure');
});

done('sim_world');
