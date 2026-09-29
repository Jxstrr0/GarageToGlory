// Tour sim tests (25_sim_tour, v0.7 "World"): content (regions/cities per C6, venues, festivals, packages, vehicles,
// climates, holidays, world + region road cards), unlocks (genre-shifted thresholds, invites, big in one place, the rival
// first), packages + quotes + booking, the on-tour week without any UI (autoGig) and with a live gig, homesickness,
// Japan's silent crowd + the fan-club president, overseas seasons/weather/holidays, the Global Gong, the Moose Opera,
// Abbot Lane, the v7 -> v8 migration and botTour.
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');
const fs = require('fs'), path = require('path');

const fresh = () => load({ localStorage: load.fakeStorage() });
const at = (s, tw) => { s.totalWeek = tw; s.year = Math.floor((tw - 1) / 24) + 1; s.week = (tw - 1) % 24 + 1; return s; };
// A World-era career at totalWeek tw (Monday), rich enough to tour.
function world(GG, seed, tw, extra) {
  const s = GG.career.newCareer({ seed: seed || 11, player: { name: 'T' } });
  at(s, tw || 125);
  Object.assign(s, { era: 'world', protected: false, fans: 30000, fund: 60000, buzz: 60, phase: 'monday', gig: null, weekStart: null }, extra || {});
  s.eraHistory.push({ era: 'local', week: 20 }, { era: 'signed', week: 40 }, { era: 'world', week: 100 });
  s.milestones.worldReady = 100;
  return s;
}
const REGIONS = ['uk_europe', 'japan', 'australia', 'russia'];
const C6 = {
  uk_europe: ['London', 'Manchester', 'Glasgow', 'Dublin', 'Paris', 'Amsterdam', 'Berlin', 'Prague', 'Madrid', 'Oslo', 'Stockholm', 'Helsinki'],
  japan: ['Tokyo', 'Osaka', 'Nagoya', 'Kyoto', 'Sendai', 'Sapporo', 'Fukuoka', 'Hiroshima'],
  australia: ['Sydney', 'Melbourne', 'Brisbane', 'Adelaide', 'Perth', 'Hobart', 'Darwin', 'Alice Springs'],
  russia: ['Moscow', 'St. Petersburg', 'Kazan', 'Yekaterinburg', 'Novosibirsk', 'Irkutsk', 'Vladivostok']
};
// Plays weeks with the bot until the tour is over (autoGig, no UI).
function playTour(GG, s, style) { let n = 0; while (GG.tour.active(s) && n++ < 12) GG.career.botWeek(s, style || 'good'); return n; }

test('content: four regions (no Canada, no USA), the C6 cities with map pins, venues, festivals, packages, vehicles', () => {
  const GG = fresh(), W = GG.content.world, C = GG.contracts;
  eq(Object.keys(W.regions).sort(), REGIONS.slice().sort());
  REGIONS.forEach(r => {
    ok(C.REGIONS.includes(r), r + ' in contracts');
    const R = W.regions[r];
    ok(R.name && R.fans > 0 && R.flight > 0 && R.scene > 0 && R.breakAt > 0 && R.kmScale > 0 && Array.isArray(R.pin) && R.chart && W.cities[R.home], r + ' fields');
    const names = GG.tour.cities(r).filter(c => !c.site).map(c => c.name);
    eq(names.slice().sort(), C6[r].slice().sort(), r + ' cities (C6)');
    GG.tour.cities(r).forEach(c => ok(c.x >= 0 && c.x <= 100 && c.y >= 0 && c.y <= 100 && c.blurb, c.id + ' pin + blurb'));
    ok(GG.tour.vehicles(r).length >= 2, r + ' rentals');
    ok(W.packages.filter(p => p.region === r).length >= 3 && W.packages.some(p => p.region === r && p.showcase) && W.packages.some(p => p.region === r && p.festival), r + ' packages');
    ok(W.climates[r] && W.climates[r].temps.length === 12 && ['summer', 'fall', 'winter', 'spring'].every(x => W.climates[r].weather[x]), r + ' climate');
    for (const g of C.GENRES) ok(W.fit[g][r] > 0 && W.fit[g][r] <= 1, 'fit ' + g + '/' + r);
  });
  ok(W.cities.mudstonbury.site && W.cities.wackelstein.site, 'festival grounds are pins too');
  const fest = n => W.venues.find(v => v.name === n);
  ['Mudstonbury', 'Wackelstein Open Air', 'Big Day Inn', 'Siberian Frostfest', 'Summer Sonicboom'].forEach(n => ok(fest(n) && fest(n).festival && fest(n).weeks, n));
  eq(fest('Siberian Frostfest').weeks, [13, 14], 'Frostfest in January'); eq(GG.calendar.month(13), 'Jan');
  ok(fest('Budokhan Hall').hall && fest('Budokhan Hall').city === 'tokyo', 'Budokhan Hall, Tokyo');
  ok(W.venues.some(v => v.moose && v.city === 'helsinki'), 'the Moose Opera is in Helsinki');
  W.venues.forEach(v => ok(W.cities[v.city] && v.region === W.cities[v.city].region && C.VENUE_KINDS.includes(v.kind) && v.pay[0] <= v.pay[1] && v.genreFit.metal > 0, 'venue ' + v.id));
  W.packages.forEach(p => {
    ok(p.stops.length >= 1 && p.stops.every(st => W.cities[st.city] && W.cities[st.city].region === p.region && (st.venue === null || (GG.tour.venue(st.venue) && GG.tour.venue(st.venue).city === st.city))), 'package ' + p.id);
    if (p.festival) ok(GG.tour.departWindow(p) && GG.tour.departWindow(p).length >= 1, p.id + ': festival stops line up with some departure week');
  });
  eq(GG.tour.departWindow(GG.tour.pkg('eu_festival_summer')), [22, 23], 'Mudstonbury in June');
  eq(GG.tour.departWindow(GG.tour.pkg('au_big_day_inn')), [11, 12], 'Big Day Inn in January = a Canadian winter escape');
  const txt = JSON.stringify(W);
  ok(!/\b(USA|America|United States|New York|Texas|Nashville|Las Vegas|California)\b/.test(txt), 'no USA content');
});

test('content: world cards (region + story) and region road cards are valid; Kenji never speaks', () => {
  const GG = fresh(), K = GG.content, C = GG.contracts, W = K.world;
  const ids = new Set((K.cards || []).map(c => c.id).concat(K.roadCards.map(c => c.id), GG.drama.cards().map(c => c.id), GG.labels.cards().map(c => c.id), GG.rival.cards().map(c => c.id), GG.fans.cards().map(c => c.id)));
  const speakers = Object.keys(K.npcs).concat(K.bands.hail_damage.members.map(m => m.id));
  const TOUR_KEYS = ['regionFans', 'homesick', 'gift', 'endTour', 'accept', 'big'];
  W.cards.forEach(c => {
    const w = 'world card ' + c.id;
    ok(/^wt_[a-z0-9_]+$/.test(c.id) && !ids.has(c.id), w + ': id'); ids.add(c.id);
    ok(C.CARD_TYPES.includes(c.type) && speakers.includes(c.speaker) && c.speaker !== 'kenji', w + ': type/speaker');
    ok(c.title.length <= 32 && c.text.length <= 280, w + ': lengths');
    Object.keys(c.gate).forEach(k => ok(C.GATE_KEYS.includes(k), w + ': gate ' + k));
    eq(c.gate.era, ['world'], w + ': World era');
    if (c.city) ok(c.city.every(x => W.cities[x] && (!c.gate.region || c.gate.region.includes(W.cities[x].region))), w + ': city');
    ok(c.choices.length >= 2 && c.choices.length <= 3, w + ': choices');
    c.choices.forEach(ch => {
      ok(ch.label.length <= 38 && ch.outcome.length <= 200 && (!ch.hint || ch.hint.length <= 48), w + ': choice lengths ' + ch.label);
      [ch.effects, ch.roll && ch.roll.success.effects, ch.roll && ch.roll.fail.effects].filter(Boolean).forEach(fx => {
        Object.keys(fx).forEach(k => ok(C.EFFECT_KEYS.includes(k) || k === 'tour', w + ': effect ' + k));
        if (fx.tour) Object.keys(fx.tour).forEach(k => ok(TOUR_KEYS.includes(k), w + ': tour.' + k));
        if (fx.tour && fx.tour.gift) ok(K.bandbook.scriptedGifts[fx.tour.gift], w + ': gift ' + fx.tour.gift);
      });
    });
  });
  REGIONS.forEach(r => {
    ok(W.cards.filter(c => !c.story && c.gate.region && c.gate.region.includes(r)).length >= 3, r + ': ≥3 region Monday cards');
    ok(K.roadCards.filter(c => c.gate && c.gate.region && c.gate.region.includes(r)).length >= 2, r + ': ≥2 region road cards');
  });
  ['wt_invite', 'wt_big', 'wt_president', 'wt_moose', 'wt_homesick'].forEach(id => ok(W.cards.find(c => c.id === id && c.story), id + ' story card'));
  const brief = JSON.stringify(W.cards) + JSON.stringify(K.roadCards);
  ['drink tickets', 'gear shop', 'France Loves Marcel', 'Silence', 'Spider in the Kick Drum', 'Minus Forty', 'taiga', 'Packed Like Sardines', 'Festival Mud'].forEach(x => ok(brief.includes(x), 'the brief: ' + x));
  ok(!/Kenji (says|said|asks|shouts|whispers|mutters)(?! nothing)|Kenji: /.test(brief + JSON.stringify(W.callHome)), 'Kenji never speaks');
  ok(!W.callHome.kenji, 'Kenji never calls home in the chat');
});

test('unlocks: World era only, genre fit shifts thresholds (metal huge in Japan, country a cult), the rival first raises it', () => {
  const GG = fresh(), T = GG.tour, s = world(GG, 3);
  const thr = r => T.threshold(s, r);
  ok(thr('japan') < thr('australia') && thr('uk_europe') < thr('russia'), 'metal: Japan/Europe first');
  const c = world(GG, 3); c.genre = 'country';
  ok(T.threshold(c, 'australia') < T.threshold(c, 'japan') && T.threshold(c, 'australia') < thr('australia'), 'country: huge in Australia, a cult in Japan');
  const sig = world(GG, 4); sig.era = 'signed'; sig.fans = 90000; sig.phase = 'wrap';
  GG.career.endWeek(sig); ok(REGIONS.every(r => !T.unlocked(sig, r)), 'nothing opens before the World era');
  s.fans = thr('uk_europe') + 10; s.phase = 'wrap';
  const ev = []; GG.on('tour:unlocked', p => ev.push(p));
  GG.career.endWeek(s);
  ok(T.unlocked(s, 'uk_europe') && s.tour.regions.uk_europe.via === 'fans' && ev.some(e => e.region === 'uk_europe'), 'UK & Europe opens at its threshold');
  ok(!T.unlocked(s, 'russia'), 'Russia still needs more');
  const before = thr('russia'); s.tour.regions.russia.rivalFirst = s.totalWeek;
  ok(thr('russia') > before, 'the rival toured Russia first: a higher bar');
  const map = T.map(s);
  eq(map.length, 4); ok(map.every(m => m.threshold > 0 && m.fitLabel && m.pin), 'world map view');
});

test('invites unlock a region early (festival slot / showcase), queue the invite card, halve the flights; decline keeps it open', () => {
  const GG = fresh(), T = GG.tour;
  let s = null;
  for (let seed = 1; seed < 400 && !s; seed++) {
    const x = world(GG, seed, 130, { fans: 16000 });
    for (let i = 0; i < 20 && !x.tour.invites.length; i++) { x.phase = 'wrap'; x.weekStart = null; GG.career.endWeek(x); }
    if (x.tour.invites.length) s = x;
  }
  ok(s, 'an invite arrives within 20 weeks for some seed');
  const inv = s.tour.invites[0];
  ok(T.unlocked(s, inv.region) && s.tour.regions[inv.region].via === 'invite', 'unlocked by invite');
  ok(s.tour.queue.some(q => q.card === 'wt_invite' && q.invite === inv.id), 'invite card queued');
  s.tour.lastCard = null; s.weekStart = null; s.phase = 'monday'; s.card = null;
  const st = GG.career.startWeek(s);
  eq(st.card && st.card.id, 'wt_invite');
  ok(/wants/.test(GG.career.fillText(s, st.card.text)) && !/\{region\}|\{festival\}/.test(GG.career.fillText(s, st.card.text)), 'tokens filled: ' + GG.career.fillText(s, st.card.text));
  const p = GG.content.world.packages.find(x => x.region === inv.region && !x.showcase && !x.festival);
  const q = T.quote(s, p.id);
  ok(q.inviteDiscount > 0 && q.flights === GG.content.world.regions[inv.region].flight * q.people - q.inviteDiscount, 'half the flights');
  GG.career.resolveCard(s, 1);
  eq(s.tour.invites[0].status, 'declined'); ok(T.unlocked(s, inv.region), 'declined: the region stays open');
  eq(T.quote(s, p.id).inviteDiscount, 0, 'no more discount');
});

test('packages: quotes (flights x people, rental + hotels per week), windows, the Loonies, the studio, the fund; book + cancel', () => {
  const GG = fresh(), T = GG.tour, s = world(GG, 5, 125);
  T.unlock(s, 'uk_europe', 'fans');
  const q = T.quote(s, 'uk_pub_crawl', { vehicle: 'splitter_bus', stay: 'hotel', extra: 'publicist' });
  const people = s.members.filter(m => m.status === 'active').length + 1;
  eq([q.people, q.weeks, q.flights, q.rental, q.hotels, q.extra], [people, 3, 550 * people, 850 * 3, 1000 * 3, 1200]);
  eq(q.upfront, q.flights + q.rental + q.extra); eq(q.start, s.totalWeek + 1);
  eq(q.stops.map(x => x.cityName), ['London', 'Manchester', 'Glasgow']); ok(q.stops[1].km > 0 && q.stops[2].km > 0, 'leg km');
  ok(q.payEst > 0 && q.fansEst > 0, 'estimates');
  ok(!T.canBook(s, 'jp_bullet').ok && /locked/.test(T.canBook(s, 'jp_bullet').why), 'Japan locked');
  ok(!T.canBook(s, 'eu_festival_summer').ok && /Mudstonbury/.test(T.canBook(s, 'eu_festival_summer').why), 'Mudstonbury only in June');
  const l = world(GG, 5, 18); T.unlock(l, 'uk_europe'); ok(/Loonies/.test(T.canBook(l, 'uk_pub_crawl').why), 'home for the Loonies');
  const st = world(GG, 5, 125); T.unlock(st, 'uk_europe'); st.session = { weeksDone: 0, weeksTotal: 3, tracks: [] }; ok(/studio/.test(T.canBook(st, 'uk_pub_crawl').why), 'not from the studio');
  const poor = world(GG, 5, 125, { fund: 500 }); T.unlock(poor, 'uk_europe'); ok(/up front/.test(T.canBook(poor, 'uk_pub_crawl').why), 'fund check');
  ok(/showcase|first impression/i.test(T.canBook(s, 'uk_showcase').why || 'showcase') || T.canBook(s, 'uk_showcase').ok, 'showcase bookable once');
  const f0 = s.fund, tour = T.book(s, 'uk_pub_crawl', { vehicle: 'splitter_bus', stay: 'hotel', extra: 'publicist' });
  ok(tour && tour.status === 'booked' && s.fund === f0 - q.upfront, 'booked, paid up front');
  ok(T.book(s, 'eu_continental').error, 'one tour at a time');
  ok(!GG.labels.canRecord(s, 'ep').ok, 'no studio while a tour is booked');
  const c = T.cancel(s); ok(c && c.refund === q.rental + q.extra && !s.tour.active, 'cancel refunds rental + extra');
  eq(T.packages(s, 'uk_europe').find(p => p.id === 'eu_moose_run'), undefined, 'the Moose Run hides until the album is ready');
});

test('on tour without any UI (autoGig): depart, shrunk blocks, region cards + board, region fans, hotels, homesick, calls home, home', () => {
  const GG = fresh(), T = GG.tour, s = world(GG, 7, 125);
  T.unlock(s, 'uk_europe');
  const ev = {}; ['tour:depart', 'tour:week', 'tour:home'].forEach(e => GG.on(e, p => { (ev[e] = ev[e] || []).push(p); }));
  T.book(s, 'eu_continental', { stay: 'hostel' });
  s.phase = 'wrap'; GG.career.endWeek(s);   // leaves next Monday
  const burn0 = s.burnout, start = GG.career.startWeek(s);
  ok(T.away(s) && s.tour.active.status === 'on' && ev['tour:depart'] && s.burnout > burn0, 'departure: jet lag');
  eq(T.here(s), 'amsterdam'); eq(T.regionOf(s), 'uk_europe');
  ok(s.gig && s.gig.tour && s.gig.venueId === 'paradiso_lost' && s.gig.city === 'Amsterdam', 'this week\'s show is booked');
  ok(!start.card || GG.content.world.cards.some(c => c.id === start.card.id), 'Monday: a region card or a quiet week, never the home deck');
  ok(!s.offer, 'no home offers abroad');
  ok(GG.world.refresh(s, true).every(l => l.tour && l.region === 'uk_europe'), 'the board lists the region');
  ok(GG.calendar.label(s).cityName === 'Amsterdam' && GG.calendar.weather(s).region === 'uk_europe', 'weather + label abroad');
  if (start.card) GG.career.resolveCard(s, 0);
  GG.career.setPlan(s, ['write', 'hustle', 'book']);
  const res = GG.career.runWeek(s, { autoGig: true });
  eq(res.blocks.map(b => b.activity), ['rehearse', 'rest', 'promote'], 'write → hotel rehearsal, hustle → rest, book → promote locally');
  ok(/Amsterdam/.test(res.blocks[0].lines[0]), 'block lines abroad');
  ok(res.gig && res.gig.tour && res.gig.region === 'uk_europe' && res.gig.travel.abroad && res.gig.travel.wear === 0, 'gig abroad: the rental, no Moose Hearse wear');
  ok(s.tour.regions.uk_europe.fans > 0 && s.tour.regions.uk_europe.gigs === 1, 'region fans');
  const fund = s.fund, hs = s.tour.homesick, chat0 = s.chat.length;
  const wrap = GG.career.endWeek(s);
  ok(wrap.tour && wrap.tour.away && wrap.tour.hotel === 350, 'hostel charged at the wrap');
  ok(s.tour.homesick > hs && s.chat.slice(chat0).some(m => m.tone === 'home'), 'homesick + calling home');
  void fund;
  GG.career.botWeek(s, 'good');   // Berlin
  GG.career.startWeek(s);         // Prague: an open date
  eq(T.here(s), 'prague'); eq(s.gig, null, 'open date: nothing booked yet');
  GG.career.setPlan(s, ['promote', 'rest', 'rehearse']); GG.career.runWeek(s, { autoGig: true });
  ok(s.lastGig && s.lastGig.region === 'uk_europe', 'the open date took the best regional listing');
  GG.career.endWeek(s);
  GG.career.botWeek(s, 'good');   // Paris, last stop
  ok(!T.active(s) && ev['tour:home'] && s.tour.history.length === 1, 'home after the last stop');
  const h = s.tour.history[0];
  ok(h.gigs === 4 && h.fans > 0 && h.cost > 0 && isFinite(h.net) && h.region === 'uk_europe' && s.tour.regions.uk_europe.tours === 1, 'summary ' + JSON.stringify(h));
  ok(!T.away(s) && T.regionOf(s) === 'canada', 'back in Canada');
});

test('a live tour gig (phase gig, the UI plays it) and a trip abroad with a region road card; finishGig(null) simulates', () => {
  const GG = fresh(), T = GG.tour, s = world(GG, 9, 125);
  T.unlock(s, 'australia'); T.book(s, 'au_big_lap'); s.phase = 'wrap'; GG.career.endWeek(s);
  GG.career.botWeek(s, 'good');   // Darwin
  GG.career.startWeek(s); if (s.card && !s.card.resolved) GG.career.resolveCard(s, 0);
  eq(T.here(s), 'alice_springs');
  const trip = GG.world.startTrip(s);
  ok(trip.abroad && trip.region === 'australia' && trip.fromName === 'Darwin' && trip.toName === 'Alice Springs' && trip.km > 500 && trip.vehicleName, 'trip abroad ' + JSON.stringify([trip.fromName, trip.toName, trip.km]));
  if (trip.cardId) ok(GG.world.roadCardById(trip.cardId).gate.region.includes('australia'), 'region road card');
  let n = 0;
  for (let seed = 1; seed < 60; seed++) { const x = JSON.parse(JSON.stringify(s)); x.seed = seed; x.trip = null; x.rng = seed; const t = GG.world.startTrip(x); if (t.cardId) { n++; ok(GG.world.roadCardById(t.cardId).gate.region.includes('australia'), 'only Aussie road cards'); } }
  ok(n > 0, 'road cards happen on vast drives');
  GG.career.setPlan(s, ['rest', 'promote', 'rehearse']); GG.career.runWeek(s);
  eq(s.phase, 'gig'); ok(s.gig && s.gig.tour, 'the tour gig waits for the UI');
  const r = GG.career.finishGig(s, null);
  ok(r && r.region === 'australia' && s.phase === 'wrap', 'finishGig simulates it');
});

test('homesickness: forces a rest, the homesick card can fly the band home early', () => {
  const GG = fresh(), T = GG.tour, s = world(GG, 13, 125);
  T.unlock(s, 'russia'); T.book(s, 'ru_trans_siberian', { stay: 'couch' }); s.phase = 'wrap'; GG.career.endWeek(s);
  GG.career.startWeek(s); if (s.card && !s.card.resolved) GG.career.resolveCard(s, 0);
  s.tour.homesick = 72;
  ok(T.status(s).forcedRest && T.status(s).homesickLabel === 'Desperately homesick', 'status');
  GG.career.setPlan(s, ['promote', 'promote', 'promote']);
  const res = GG.career.runWeek(s, { autoGig: true });
  eq(res.blocks[0].activity, 'rest', 'homesickness forces a rest');
  s.tour.homesick = 90; GG.career.endWeek(s);
  ok(s.tour.queue.some(q => q.card === 'wt_homesick'), 'the homesick card is queued');
  const st = GG.career.startWeek(s); eq(st.card && st.card.id, 'wt_homesick');
  GG.career.resolveCard(s, 0);   // fly home early
  GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s, { autoGig: true }); GG.career.endWeek(s);
  ok(!T.active(s) && s.tour.history[0].cut && s.tour.history[0].gigs === 2, 'home after this week\'s show: ' + JSON.stringify(s.tour.history[0]));
});

test('Japan: silent crowd until the song ends (then applause), never boos; the fan-club president; gifts', () => {
  const GG = fresh(), T = GG.tour, s = world(GG, 17, 125);
  T.unlock(s, 'japan'); T.book(s, 'jp_bullet'); s.phase = 'wrap'; GG.career.endWeek(s);
  const st = GG.career.startWeek(s);
  eq(st.card && st.card.id, 'wt_president', 'the president greets you in week one');
  ok(s.superfans.japan && s.tour.president, 'met');
  ok(/Emiko/.test(GG.career.fillText(s, st.card.text)) || /President/.test(st.card.text), 'her card');
  GG.career.resolveCard(s, 0);
  ok(s.gifts.some(g => g.id === 'jp_omamori'), 'a good-luck charm for the van');
  ok(GG.fans.superfanList(s).find(x => x.id === 'japan').active, 'the president is on the Bandbook fans tab');
  const g = s.gig; ok(g.silent && GG.tour.silentCrowd(g), 'Tokyo crowds are silent');
  const S = GG.gig.session(s, g, null, { emit: false });
  S.startSong(0);
  const c0 = S.crowd, n = S.chart.notes;
  for (const x of n) { if (x.free) continue; S.tick(x.t); S.judge(x.lane, x.t); }
  eq(S.crowd, c0, 'the meter holds still during the song');
  ok(S.hidden > c0, 'but they love it');
  const r = S.endSong();
  ok(S.crowd > c0 && r.moments.includes('applause'), 'the roar at the end: ' + c0 + ' -> ' + S.crowd);
  S.startSong(1); const c1 = S.crowd;
  for (let t = 0; t < 20; t += 0.05) S.tick(t);   // miss everything
  ok(S.crowd === c1 && !S.stats().miss === false, 'still silent while it goes wrong');
  const r2 = S.endSong(); ok(!r2.moments.includes('boo'), 'polite crowds never boo');
  const osaka = T.makeGig(s, 'big_kitten'); ok(!osaka.silent, 'Osaka cheers between songs anyway');
  s.liveGig = null;
  GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s, { autoGig: true });
  ok(s.lastGig.president === 1 && s.lastGig.lines.some(x => /Emiko|president/i.test(x)), 'the president is at the show');
  ok(!s.lastGig.dale, 'Dale watches the livestream from Warman');
});

test('overseas seasons + weather + holidays (C7): Australia reversed, Siberian January, regional holidays replace Canada\'s', () => {
  const GG = fresh(), K = GG.calendar;
  eq(K.season(13), 'winter'); eq(K.seasonIn('australia', 13), 'summer', 'a Canadian winter is Aussie summer');
  eq(K.seasonIn('australia', 2), 'winter'); eq(K.seasonIn('japan', 19), 'spring');
  const s = world(GG, 19, 13 + 24 * 5);
  let cold = 0; for (let y = 0; y < 8; y++) cold += K.weatherAt(Object.assign({}, s, { seed: s.seed + y }), 'irkutsk').temp;
  ok(cold / 8 < -15, 'Irkutsk in January: ' + cold / 8);
  let hot = 0; for (let y = 0; y < 8; y++) hot += K.weatherAt(Object.assign({}, s, { seed: s.seed + y }), 'sydney').temp;
  ok(hot / 8 > 22, 'Sydney in January: ' + hot / 8);
  eq(JSON.stringify(K.weatherAt(s, 'sydney')), JSON.stringify(K.weatherAt(s, 'sydney')), 'deterministic');
  const r0 = s.rng; K.weatherAt(s, 'london'); eq(s.rng, r0, 'career RNG untouched');
  // on tour in Russia at New Year: no Canadian holidays, the region's instead
  GG.tour.unlock(s, 'russia'); at(s, 11 + 24 * 5); s.phase = 'monday';
  GG.tour.book(s, 'ru_frostfest'); s.phase = 'wrap'; GG.career.endWeek(s); GG.career.startWeek(s);
  eq(s.week, 12); ok(GG.tour.away(s), 'in Novosibirsk');
  ok(K.holidays(s.week, s).some(h => h.id === 'novy_god') && !K.holidays(s.week, s).some(h => h.id === 'nye'), 'Russian New Year, not the Bassborough NYE');
  eq(K.seasonAt(s), 'winter');
  ok(!K.holidays(12).some(h => h.id === 'novy_god'), 'at home (no state) it is Canada');
});

test('big in one place: a song blows up in one region → a story card, region fans, even a locked region opens', () => {
  const GG = fresh(), T = GG.tour;
  let s = null;
  for (let seed = 1; seed < 500 && !s; seed++) {
    const x = world(GG, seed, 130, { fans: 24000 });
    x.tour.regions.uk_europe.unlocked = 100; x.tour.regions.uk_europe.gigs = 3; x.tour.regions.uk_europe.fans = 2000;
    for (let i = 0; i < 30 && !REGIONS.some(r => x.tour.regions[r].big); i++) { x.phase = 'wrap'; GG.career.endWeek(x); }
    if (REGIONS.some(r => x.tour.regions[r].big)) s = x;
  }
  ok(s, 'it happens');
  const reg = REGIONS.find(r => s.tour.regions[r].big), b = s.tour.regions[reg].big;
  ok(b.songId && b.title && T.unlocked(s, reg), 'big in ' + reg);
  const q = s.tour.queue.find(x => x.card === 'wt_big'); ok(q && q.song === b.title, 'story card queued');
  s.tour.lastCard = null; s.card = null; s.phase = 'monday';
  const st = GG.career.startWeek(s); eq(st.card.id, 'wt_big');
  ok(GG.career.fillText(s, st.card.text).includes(b.title), 'the song is named');
  const f0 = s.tour.regions[reg].fans; GG.career.resolveCard(s, 1);
  ok(s.tour.regions[reg].fans > f0 && s.tour.regions[reg].big.choice === 'video', 'the local video');
  ok(T.charts(s).find(c => c.region === reg).pos <= 3, 'top of the regional chart');
});

test('the rival breaks regions (first, if you haven\'t); news in the Scene tab', () => {
  const GG = fresh(), T = GG.tour, s = world(GG, 21, 130);
  s.rival.fans = 20000;
  const news = [];
  let hit = null; for (let w = 130; w < 260 && !hit; w++) { at(s, w); hit = T.rivalWeekly(s, t => news.push(t)); }
  eq(hit, 'uk_europe', 'Europe first');
  ok(s.tour.regions.uk_europe.rivalFirst && /Tundra Wraith|played/.test(news[0]), 'news: ' + news[0]);
  s.phase = 'wrap'; at(s, 300); const w0 = s.rival.news.length; GG.career.endWeek(s);
  ok(s.rival.news.length >= w0, 'rival weekly runs with the hook');
});

test('the Global Gong: World era only, nominated with a broken region or a festival; once a year; trophy + prize', () => {
  const GG = fresh(), T = GG.tour;
  const s = world(GG, 23, 22 + 24 * 6);
  eq(T.runGong(Object.assign(world(GG, 23), { era: 'signed' })), null, 'not before the World stage');
  let won = null, lost = null;
  for (let seed = 1; seed < 40 && !(won && lost); seed++) {
    const x = world(GG, seed, 22 + 24 * 6);
    x.tour.regions.japan.broken = 100; x.tour.regions.japan.fans = 6000; x.tour.regions.uk_europe.broken = 100; x.tour.regions.uk_europe.fans = 9000;
    const r = T.runGong(x);
    ok(r.nominated && r.against.length >= 3 && eq(T.runGong(x), r) === undefined, 'idempotent');
    if (r.won && !won) won = x; if (!r.won && !lost) lost = x;
  }
  ok(won && lost, 'winnable, not guaranteed');
  ok(won.trophies.some(t => t.kind === 'gong') && won.tour.gongs[0].prize > 0, 'trophy + prize');
  const n = T.runGong(s); ok(!n.nominated, 'no broken region, no festival: not nominated');
  const v = T.gong(won); ok(v.result && v.name === 'The Global Gong' && v.week === 22, 'view');
  const auto = world(GG, 1, 22 + 24 * 6); auto.tour.regions.japan.broken = 1; auto.phase = 'wrap';
  const wrap = GG.career.endWeek(auto); ok(wrap.tour.gong && wrap.tour.gong.nominated, 'auto-run at the wrap of the Gong week');
});

test('the Moose Opera: a ready moose album → the Nordic Moose Run → platinum in Finland (flags.mooseOpera)', () => {
  const GG = fresh(), T = GG.tour, s = world(GG, 29, 125);
  s.flags.mooseAlbum = 'finland'; T.unlock(s, 'uk_europe');
  ok(T.canBook(s, 'eu_moose_run').ok, 'the Moose Run is on');
  T.book(s, 'eu_moose_run'); s.phase = 'wrap'; GG.career.endWeek(s);
  const ev = []; GG.on('tour:moose', () => ev.push(1));
  playTour(GG, s);
  ok(s.tour.moose && s.flags.mooseOpera === 'platinum' && ev.length === 1, 'platinum in Finland');
  ok(s.trophies.some(t => t.kind === 'platinum_fi') && s.tour.regions.uk_europe.fans >= 3000, 'trophy + European fans');
  s.phase = 'monday'; s.weekStart = null; s.card = null;
  const st = GG.career.startWeek(s); eq(st.card && st.card.id, 'wt_moose', 'Marcel\'s moment');
  ok(!T.canBook(s, 'eu_moose_run').ok, 'once');
});

test('Abbot Lane Studios (London) unlocks in the World era; the World era switches on at the Steady threshold', () => {
  const GG = fresh(), s = world(GG, 31);
  ok(GG.labels.studios(s).find(x => x.id === 'abbot_lane').available, 'Abbot Lane in World');
  s.era = 'signed'; ok(!GG.labels.studios(s).find(x => x.id === 'abbot_lane').available, 'locked before');
  ok(GG.content.economy.eras.worldEnabled, 'economy.eras.worldEnabled');
});

test('save migration v7 -> v8: state.tour filled, a world-ready signed save enters the World era; idempotent; save code', () => {
  const GG = fresh(), s = world(GG, 37, 130);
  const old = JSON.parse(JSON.stringify(s)); old.v = 7; delete old.tour; old.era = 'signed'; old.eraHistory = old.eraHistory.filter(e => e.era !== 'world');
  const m = GG.save.migrate(JSON.parse(JSON.stringify(old)));
  eq(m.v, 8); eq(m.era, 'world'); eq(m.eraHistory[m.eraHistory.length - 1], { era: 'world', week: 100 });
  ok(m.tour && REGIONS.every(r => m.tour.regions[r] && m.tour.regions[r].fans === 0) && m.tour.active === null && m.tour.homesick === 0, 'tour state');
  eq(JSON.stringify(GG.save.migrate(JSON.parse(JSON.stringify(m)))), JSON.stringify(m), 'idempotent');
  const young = JSON.parse(JSON.stringify(old)); delete young.milestones.worldReady; eq(GG.save.migrate(young).era, 'signed', 'not world-ready: stays signed');
  GG.tour.unlock(m, 'japan'); GG.tour.book(m, 'jp_bullet');
  eq(JSON.stringify(GG.save.fromCode(GG.save.toCode(m)).tour), JSON.stringify(m.tour), 'a booked tour survives a save code');
});

test('botTour: bots tour in the World era, deterministic per seed, invariants hold; the module is pure', () => {
  const GG = fresh();
  const run = (seed, style) => { const s = world(GG, seed, 120, { fans: 32000, fund: 25000 }); for (let i = 0; i < 24 * 3; i++) GG.career.botWeek(s, style); return s; };
  const a = run(41, 'good'), b = run(41, 'good');
  eq(JSON.stringify(a), JSON.stringify(b), 'same seed, same career');
  ok(a.tour.history.length >= 2 && GG.tour.abroadFans(a) > 1000, 'the good bot tours: ' + a.tour.history.map(h => h.packageId).join(','));
  ok(a.fund >= 0 && a.fans < 100000 && a.burnout <= 100 && isFinite(a.tour.homesick), 'invariants');
  const v = run(43, 'avg'); ok(v.fund >= 0, 'avg bot solvent');
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', '25_sim_tour.js'), 'utf8');
  ok(!/Math\.random|\bDate\b|document\.|window\.(?!GG)/.test(src), '25_sim_tour.js is pure');
});

done('sim_tour');
