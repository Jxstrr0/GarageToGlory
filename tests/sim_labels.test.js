// Labels sim tests (v0.5): eras, offers, deals + recoup, deadlines/drops, demands, studio sessions + takes, releases,
// reviews (recycled patterns), Maple 100 / sales / streams, certs, Loonies, UI-facing calls, the v4 -> v5 migration.
// Fixture content is injected into GG.content so these tests don't depend on the CONTENT agent's words or numbers.
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');
const fs = require('fs'), path = require('path');

const FIX = {
  labels: {
    gopherwood: { id: 'gopherwood', name: 'Fixture Indie', advance: [2000, 2000], royalty: 0.5, albums: 2, deadlineWeeks: 20,
      demands: [{ kind: 'sampler', text: 'One song on the sampler.' }], offerMinFans: 400, offerMinBuzz: 10, dropOnFlop: 0 },
    monolith: { id: 'monolith', name: 'Fixture Major', advance: [10000, 10000], royalty: 0.16, albums: 3, deadlineWeeks: 20,
      demands: [{ kind: 'english', text: 'Sing in English.', card: 'fx_english' }], offerMinFans: 2500, offerMinBuzz: 30, dropOnFlop: 99999 },
    diy: { id: 'diy', name: 'DIY', advance: [0, 0], royalty: 1, albums: 0, deadlineWeeks: 0, demands: [], offerMinFans: 0, offerMinBuzz: 0, dropOnFlop: 0 }
  },
  studios: [
    { id: 'basement', name: 'Basement', city: 'Saskatoon', costPerWeek: 0, quality: 30, reverb: 5, era: 'local', quirk: 'Dryer.' },
    { id: 'silo', name: 'Silo', city: 'Rosthern', costPerWeek: 600, quality: 80, reverb: 90, era: 'local', quirk: 'Echo.' },
    { id: 'london', name: 'London', city: 'London', costPerWeek: 3000, quality: 97, reverb: 50, era: 'world', locked: true, quirk: 'Tourists.' }],
  producers: [
    { id: 'loud_guy', name: 'Loud Guy', costPerWeek: 200, style: 'loud', production: 8, polish: 2, hook: 0, weird: 3, era: 'local' },
    { id: 'pitch_guy', name: 'Pitch Guy', costPerWeek: 600, style: 'pitch', production: 7, polish: 9, hook: 4, weird: 1, era: 'signed' }],
  reviews: { scoreBands: { awful: 0, meh: 40, good: 62, great: 80 }, outlets: {
    rolling_scone: { id: 'rolling_scone', name: 'RS', scale: 5, decimals: 0, genres: { metal: 0.6, punk: 0.7, rock: 1, country: 0.8 }, bias: 0,
      weights: { quality: 0.5, production: 0.2, polish: 0.3, recycled: 0.5 }, quotes: { awful: ['A {album}'], meh: ['M {album}'], good: ['G {single}'], great: ['W {band}'] }, recycled: ['R {album}'] },
    pitchspork: { id: 'pitchspork', name: 'PS', scale: 10, decimals: 1, genres: { metal: 0.5, punk: 0.6, rock: 0.6, country: 0.4 }, bias: -10,
      weights: { quality: 0.3, production: 0.3, polish: 0.1, recycled: 0.3 }, quotes: { awful: ['a'], meh: ['m'], good: ['g'], great: ['w'] } },
    deci_hell: { id: 'deci_hell', name: 'DH', scale: 5, decimals: 0, caps: true, genres: { metal: 1, punk: 0.5, rock: 0.3, country: 0.1 }, bias: 0,
      weights: { quality: 0.3, production: 0.4, polish: 0.3, recycled: 0.6 }, quotes: { awful: ['loud {album}'], meh: ['loud {album}'], good: ['loud {album}'], great: ['loud {album}'] } } } },
  awards: { categories: { album: { id: 'album', name: 'Album of the Year', genreNames: { metal: 'Heavy Album of the Year' }, reward: { fund: 4000, fans: 300, buzz: 10 } } },
    speech: { id: 'fx_speech', title: 'Speech', text: 't', choices: [{ label: 'Mom', effects: { chemistry: 5 }, outcome: 'Thanks, Mom.' }, { label: 'Moose', effects: { buzz: 5 }, outcome: 'Moose.' }] },
    outfitCards: [{ id: 'fx_outfit', title: 'Outfit', text: 't', gate: { band: ['hail_damage'] }, choices: [{ label: 'Cape', effects: { flags: { loonieOutfit: 'cape' } }, outcome: 'Cape.' }] }],
    rivalThanks: { tundra_wraith: ['Thanks {band} for {category}.'] }, rivalLoses: { tundra_wraith: ['Well done {band}.'] } },
  albumWords: { titles: { metal: { forms: ['{adj} {noun}', 'The {noun} of {place}'], adj: ['Frozen', 'Eternal'], noun: ['Lawn', 'Hail'], place: ['the North'],
    fr: [{ fr: 'Le Gazon', en: 'The Lawn' }] } },
    covers: { motifs: [{ id: 'moose', genres: ['metal'] }], palettes: [{ id: 'ink', colors: ['#000000', '#ffffff', '#ff0000'] }], fonts: [{ id: 'serifish' }] } },
  studioEvents: [{ id: 'fx_dryer', type: 'weird', title: 'Dryer', text: 't', once: false, gate: { studio: ['basement'] },
    choices: [{ label: 'Wait', effects: { production: 5, burnout: 2 }, outcome: 'ok' }, { label: 'Go', effects: { production: -3 }, outcome: 'ok' }] }]
};
function fresh(opts) {
  const GG = load({ localStorage: load.fakeStorage() });
  Object.keys(FIX).forEach(k => { GG.content[k] = JSON.parse(JSON.stringify(FIX[k])); });
  GG.content.cards = (opts && opts.cards) || [];
  return GG;
}
const AUTO = { autoGig: true };
function career(GG, seed) { return GG.career.newCareer({ seed: seed || 7, player: { name: 'T' } }); }
// A band past the garage era with n unreleased jammed songs.
function local(GG, seed, fans, n) {
  const s = career(GG, seed);
  s.era = 'local'; s.protected = false; s.eraHistory.push({ era: 'local', week: 1 }); s.milestones.localHeroes = 1;
  s.fans = fans || 600; s.buzz = 40; s.fund = 5000; s.gig = null;
  const rng = GG.rngFor(s);
  for (let i = 0; i < (n || 12); i++) { const x = GG.songs.jam(s, rng); x.quality = 70 + (i % 5) * 5; x.polish = 80; }
  return s;
}
function week(GG, s, plan) {
  const r = GG.career.startWeek(s);
  if (r.card) GG.career.resolveCard(s, 0);
  GG.career.setPlan(s, plan || ['rest', 'rest', 'rest']);
  GG.career.runWeek(s, AUTO);
  return GG.career.endWeek(s);
}
function record(GG, s, kind, studioId, producerId) {
  const ids = GG.labels.freshSongs(s).slice(0, kind === 'ep' ? 4 : 8).map(x => x.id);
  const sess = GG.labels.book(s, { kind, studioId: studioId || 'basement', producerId: producerId || null, tracks: ids });
  ok(sess && !sess.error, 'booked: ' + JSON.stringify(sess && sess.error));
  while (GG.labels.inSession(s)) week(GG, s);
  return GG.labels.pending(s);
}
function releaseNextWeek(GG, s, a) {
  eq(GG.labels.schedule(s, a.id, s.totalWeek + 1), null, 'release week must be >= 2 weeks out');
  const w = GG.labels.schedule(s, a.id, s.totalWeek + 2);
  ok(w, 'scheduled');
  while (a.status !== 'released') week(GG, s, ['promote', 'rest', 'rest']);
  return a;
}

test('eras: garage -> local at 250 fans (localHeroes), era:changed + eraHistory; forward only', () => {
  const GG = fresh(), s = career(GG, 3), seen = [];
  GG.on('era:changed', p => seen.push(p.era + ':' + p.from));
  eq([s.era, s.eraHistory], ['garage', [{ era: 'garage', week: 1 }]]);
  s.fans = 150; week(GG, s); eq(s.era, 'garage', 'still garage under 250');
  s.fans = 260; week(GG, s);
  eq([s.era, s.protected, seen], ['local', false, ['local:garage']]);
  ok(s.milestones.localHeroes && s.eraHistory[1].era === 'local', 'milestone + history');
  eq(GG.career.setEra(s, 'garage'), false, 'eras never go backwards');
  ok(GG.career.setEra(s, 'signed', 'test') && s.era === 'signed' && seen.length === 2);
});

test('offers: interest gates (era, fans, buzz), offers expire, decline cooldown, label:offer', () => {
  const GG = fresh(), s = local(GG, 5, 300), events = [];
  GG.on('label:offer', p => events.push(p.offer.labelId));
  eq(GG.labels.interest(s, 'gopherwood'), 0, 'below offerMinFans');
  s.fans = 900;
  ok(GG.labels.interest(s, 'gopherwood') > 0, 'Gopherwood is interested');
  eq(GG.labels.interest(s, 'monolith'), 0, 'Monolith wants 2,500 fans and a release');
  s.era = 'garage'; eq(GG.labels.interest(s, 'gopherwood'), 0, 'nobody signs a garage band'); s.era = 'local';
  const o = GG.labels.makeOffer(s, 'gopherwood', GG.rngFor(s));
  eq([o.labelId, o.advance, o.royalty, o.albums, o.deadlineWeeks, o.demands, o.expires - s.totalWeek], ['gopherwood', 2000, 0.5, 2, 20, ['sampler'], 4]);
  let n = 0; while (!GG.labels.offers(s).length && n++ < 60) week(GG, s);
  ok(GG.labels.offers(s).length === 1 && events[0] === 'gopherwood', 'an offer arrives: ' + n + ' weeks');
  const exp = GG.labels.offers(s)[0].expires;
  while (s.totalWeek <= exp) week(GG, s);
  eq(GG.labels.offers(s).length, 0, 'offer expired');
  ok(s.labelNext.gopherwood > s.totalWeek, 'cooldown after expiry');
  s.labelOffers = [GG.labels.makeOffer(s, 'gopherwood', GG.rngFor(s))];
  ok(GG.labels.decline(s, 'gopherwood') && !GG.labels.offers(s).length && s.labelNext.gopherwood > s.totalWeek + 5, 'decline by labelId');
});

test('signing: DEAL shape, advance split (recording budget + members\' cut), era -> signed, flags.label', () => {
  const GG = fresh(), s = local(GG, 6, 900), got = [];
  GG.on('label:signed', p => got.push(p.deal.labelId));
  s.labelOffers = [GG.labels.makeOffer(s, 'gopherwood', GG.rngFor(s))];
  const f0 = s.fund, d = GG.labels.sign(s, 0);
  ok(d && s.label === d && got[0] === 'gopherwood', 'signed');
  eq([d.advance, d.budget, d.recouped, d.albumsOwed, d.albumsDelivered, d.deadline - s.totalWeek, d.dropped], [2000, 1200, 0, 2, 0, 20, false]);
  eq(s.fund - f0, 800 - Math.round(800 * s.payCut), 'cash part of the advance, minus the members\' cut');
  eq([s.era, s.flags.label, s.labelOffers.length], ['signed', 'gopherwood', 0]);
  eq(GG.labels.sign(s, 0), null, 'already signed');
  const st = GG.labels.dealStatus(s);
  eq([st.recoupTotal, st.recoupLeft, st.weeksLeft], [2000, 2000, 20]);
});

test('studio: availability, quotes (label budget vs DIY cash), session weeks replace blocks, takes, production, costs', () => {
  const GG = fresh(), s = local(GG, 8, 900), weeks = [];
  GG.on('session:week', p => weeks.push(p.week));
  const st = GG.labels.studios(s);
  eq(st.map(x => x.locked), [false, false, true]);
  eq(GG.labels.producers(s).map(p => p.lockedWhy), ['', 'Signed era']);
  eq(GG.labels.canRecord(s, 'album').ok, true);
  const c = GG.labels.canRecord(s); ok(c.ep && c.album && !c.busy, 'canRecord(state) shape');
  const ids = GG.labels.freshSongs(s).slice(0, 8).map(x => x.id);
  const q = GG.labels.quote(s, { kind: 'album', studioId: 'silo', producerId: 'loud_guy', tracks: ids });
  eq([q.weeks, q.perWeek, q.cost, q.payer, q.paidBy, q.bandPays], [3, 800, 2400, 'band', 'band', 2400]);
  ok(GG.labels.book(s, { kind: 'album', studioId: 'london', tracks: ids }).error, 'locked studio');
  ok(GG.labels.book(s, { kind: 'album', studioId: 'silo', tracks: ids.slice(0, 5) }).error, 'albums need 8-10 songs');
  const f0 = s.fund, sess = GG.labels.book(s, { kind: 'album', studioId: 'silo', producerId: 'loud_guy', tracks: ids });
  eq([sess.kind, sess.weeksTotal, sess.weeksDone, sess.payer], ['album', 3, 0, 'band']);
  ok(GG.labels.book(s, { kind: 'ep', studioId: 'basement', tracks: ids }).error, 'one session at a time');
  const r = week(GG, s, ['hustle', 'hustle', 'hustle']);
  const blocks = s.lastWeek.blocks;
  ok(blocks.length === 3 && blocks.every(b => b.activity === 'studio'), 'studio week replaces the planner blocks');
  eq(s.stats.hustles, 0, 'the plan was ignored');
  eq(GG.labels.recordTake(s, ids[0], 100), 100, 'a played take counts');
  eq(GG.labels.recordTake(s, ids[0], 10), 100, 'best take counts');
  eq(GG.labels.recordTake(s, 'nope', 50), null);
  ok(sess.production > 0 && sess.production <= 100, 'production ' + sess.production);
  while (GG.labels.inSession(s)) week(GG, s);
  eq(weeks, [1, 2, 3]);
  const a = GG.labels.pending(s);
  ok(a && a.status === 'recorded' && a.tracks.length === 8 && a.single && a.title && a.cover && a.cover.palette.length === 3, 'recorded with defaults');
  eq(s.session, null);
  ok(f0 - s.fund >= 2400 - 1 && a.cost === 2400, 'DIY paid cash: ' + (f0 - s.fund) + ' (+ upkeep)');
  void r;
});

test('studio events: drawn on session Mondays by studio gate; `production` effect key moves the session score', () => {
  const GG = fresh(), s = local(GG, 9, 900);
  ok(GG.contracts.EFFECT_KEYS.includes('production'), 'production is an effect key');
  const ids = GG.labels.freshSongs(s).slice(0, 4).map(x => x.id);
  GG.labels.book(s, { kind: 'ep', studioId: 'basement', tracks: ids });
  const r = GG.career.startWeek(s);
  eq(r.card && r.card.id, 'fx_dryer', 'studio event instead of a Monday card');
  const before = s.session.production;
  const res = GG.career.resolveCard(s, 0);
  eq([s.session.production - before, res.deltas.production], [5, 5]);
  const s2 = local(GG, 10, 900);
  GG.labels.book(s2, { kind: 'ep', studioId: 'silo', tracks: GG.labels.freshSongs(s2).slice(0, 4).map(x => x.id) });
  eq(GG.labels.studioEvent(s2, GG.rngFor(s2)), null, 'the dryer only runs in the basement');
});

test('release: tracklist rules, lead single, title/cover options, schedule >= 2 weeks, promo, reviews, chart, fans', () => {
  const GG = fresh(), s = local(GG, 11, 1500), ev = [];
  ['album:released', 'album:reviews', 'chart:week'].forEach(e => GG.on(e, () => ev.push(e)));
  const a = record(GG, s, 'album', 'silo', 'loud_guy');
  const t = GG.labels.titleOptions(s, 3), t2 = GG.labels.titleOptions(s, 3), t3 = GG.labels.titleOptions(s, 3, 1);
  ok(t.length === 3 && t[0] === 'Le Gazon' && JSON.stringify(t) === JSON.stringify(t2), 'titles: fr first, repeatable');
  ok(JSON.stringify(t3) !== JSON.stringify(t) || t3.length === 3, 're-roll');
  eq(GG.labels.coverOptions(s, 2).map(c => [c.motif, c.font, c.palette.length]), [['moose', 'serifish', 3], ['moose', 'serifish', 3]]);
  const order = GG.labels.defaultTracklist(s);
  eq(order.slice().sort(), a.tracks.slice().sort());
  const tl = GG.labels.tracklistScore(s, order, a.single);
  ok(tl.score >= 0 && tl.score <= 100 && Array.isArray(tl.notes), 'tracklist score ' + tl.score);
  ok(GG.labels.release(s, { week: s.totalWeek + 1 }).error, 'release week too soon');
  ok(GG.labels.release(s, { tracks: order.slice(1) }).error, 'tracklist must use the recorded songs');
  const weeks = GG.labels.releaseWeeks(s);
  eq([weeks[0] - s.totalWeek, weeks.length], [2, 11]);
  const f0 = s.fund, fans0 = s.fans;
  const out = GG.labels.release(s, { title: '  My   Lawn  ', tracks: order, single: order[1], week: weeks[0], promo: ['posters'] });
  ok(out === a && a.status === 'scheduled' && a.title === 'My Lawn' && a.single === order[1] && a.bought[0] === 'posters', 'release() finalises');
  ok(s.fund <= f0 - 150, 'DIY pays for posters');
  week(GG, s, ['promote', 'promote', 'rest']);
  ok(a.promo >= 2, 'promote blocks build hype: ' + a.promo);
  while (a.status !== 'released') week(GG, s);
  eq(ev.slice(0, 3), ['album:released', 'album:reviews', 'chart:week']);
  eq(a.reviews.length, 3);
  const dh = a.reviews.find(r => r.outlet === 'deci_hell'), ps = a.reviews.find(r => r.outlet === 'pitchspork');
  ok(dh.quote === dh.quote.toUpperCase() && dh.quote.indexOf('MY LAWN') >= 0, 'caps outlet + {album}: ' + dh.quote);
  ok(ps.scale === 10 && Math.round(ps.score * 10) === ps.score * 10 && ps.score100 >= 0 && ps.score100 <= 100, 'one-decimal score');
  ok(a.critic > 0 && a.critic <= 100 && a.firstWeek > 0 && a.sales === a.firstWeek && a.streams > 0, 'week one');
  ok(a.chart.weeks === (a.chart.pos ? 1 : 0) && (a.chart.pos == null || a.chart.pos === a.chart.debut), 'debut');
  ok(s.fans > fans0, 'a release brings fans');
  eq(s.era, 'signed', 'a DIY album moves the band to the Signed era');
  eq(s.flags.label, 'diy', 'flags.label = diy after a DIY release');
  const cv = GG.labels.chartView(s, a.id);
  ok(cv.rows.length >= 10 && cv.rows.every((r, i, l) => i === 0 || r.pos > l[i - 1].pos), 'chart view rows sorted');
  if (a.chart.pos) ok(cv.rows.some(r => r.you && r.pos === a.chart.pos && r.title === 'My Lawn' && r.move === 'new'), 'you on the chart');
  eq(JSON.stringify(GG.labels.chartView(s, a.id)), JSON.stringify(cv), 'chart view is stable');
});

test('reviews: deterministic; recycled drum patterns lower scores', () => {
  const GG = fresh(), s = local(GG, 12, 1500, 8);
  const a = record(GG, s, 'album', 'silo');
  const clone = JSON.parse(JSON.stringify(s));
  const r1 = GG.labels.review(s, a, GG.rngFor(s)), r2 = GG.labels.review(clone, clone.albums[0], GG.rngFor(clone));
  eq(JSON.stringify(r1), JSON.stringify(r2), 'same state -> same reviews');
  eq(GG.labels.recycled(s, a.tracks, a.id).count, 0, 'jams are distinct enough');
  // make three tracks copies of the first: recycled
  const base = GG.songs.byId(s, a.tracks[0]);
  [1, 2, 3].forEach(i => { GG.songs.byId(s, a.tracks[i]).pattern = JSON.parse(JSON.stringify(base.pattern)); });
  const rec = GG.labels.recycled(s, a.tracks, a.id);
  ok(rec.count === 4 && rec.pairs.length >= 3, 'recycled tracks found: ' + rec.count);
  const s3 = JSON.parse(JSON.stringify(clone));
  const clean = GG.labels.review(s3, s3.albums[0], GG.RNG(5)), dirty = GG.labels.review(s, a, GG.RNG(5));
  const sum = l => l.reduce((t, r) => t + r.score100, 0);
  ok(sum(dirty) < sum(clean) - 20, 'recycled album scores lower: ' + sum(dirty) + ' vs ' + sum(clean));
});

test('deal: album delivery, recoup before royalties, deadline miss -> dropped, fulfilled, drop flags', () => {
  const GG = fresh(), s = local(GG, 13, 1500), drops = [];
  GG.on('label:dropped', p => drops.push(p.reason));
  s.labelOffers = [GG.labels.makeOffer(s, 'gopherwood', GG.rngFor(s))];
  const d = GG.labels.sign(s, 'gopherwood');
  const a = record(GG, s, 'album', 'silo', 'loud_guy');
  eq([a.dealId, a.label, a.cost], [d.id, 'gopherwood', 2400]);
  eq([d.budget, d.spent], [0, 1200], 'the recording budget paid first');
  releaseNextWeek(GG, s, a);
  eq(d.albumsDelivered, 1);
  eq(d.deadline, s.totalWeek + 20 - 0 - (s.totalWeek - a.released), 'deadline resets on delivery');
  const r0 = d.recouped, e0 = a.earned;
  for (let i = 0; i < 6; i++) week(GG, s);
  ok(d.recouped > r0, 'royalties recoup the advance');
  if (GG.labels.recoupLeft(d) > 0) eq(a.earned, e0, 'no royalties paid before recoup');
  d.recouped = GG.labels.recoupTotal(d);
  const f1 = s.stats.royalties || 0;
  for (let i = 0; i < 3; i++) week(GG, s);
  ok((s.stats.royalties || 0) > f1 && a.earned > 0, 'after recoup the band gets paid');
  // miss the deadline: dropped
  s.label.deadline = s.totalWeek - 1;
  week(GG, s);
  ok(s.label === null && drops[0] === 'deadline' && s.pastDeals[0].dropped && s.pastDeals[0].reason === 'deadline', 'dropped for a missed deadline');
  eq([s.flags.label, s.era], [undefined, 'signed'], 'flag cleared, era stays');
  ok(s.labelNext.gopherwood > s.totalWeek + 40, 'they will not call again soon');
  ok(s.wrap.labels.news.some(n => n.kind === 'dropped'), 'wrap news');
  // fulfilled: two albums delivered
  const s2 = local(GG, 14, 1500, 20);
  s2.labelOffers = [GG.labels.makeOffer(s2, 'gopherwood', GG.rngFor(s2))];
  const d2 = GG.labels.sign(s2, 0);
  releaseNextWeek(GG, s2, record(GG, s2, 'album', 'basement'));
  releaseNextWeek(GG, s2, record(GG, s2, 'album', 'basement'));
  ok(s2.label === null && d2.fulfilled && s2.pastDeals.includes(d2), 'fulfilled after two albums');
  ok(d2.refund === 1200 || d2.budget === 0, 'unspent recording budget comes home');
});

test('demands: card flags settle DEAL demands; API demands come due; goodwill 0 drops you', () => {
  const GG = fresh(), s = local(GG, 15, 3000);
  s.labelOffers = [Object.assign(GG.labels.makeOffer(s, 'monolith', GG.rngFor(s)), {})];
  const d = GG.labels.sign(s, 'monolith');
  eq(d.demands.map(x => [x.kind, x.card, x.answered]), [['english', 'fx_english', null]]);
  eq(GG.labels.pendingDemand(s), null, 'card demands are not asked by the API');
  s.flags.demandEnglish = 'refused';
  week(GG, s);
  eq([d.demands[0].answered, d.goodwill], ['refused', 40]);
  const s2 = local(GG, 16, 900);
  s2.labelOffers = [GG.labels.makeOffer(s2, 'gopherwood', GG.rngFor(s2))];
  const d2 = GG.labels.sign(s2, 0);
  while (!GG.labels.pendingDemand(s2) && s2.totalWeek < 30) week(GG, s2);
  const pd = GG.labels.pendingDemand(s2);
  ok(pd && pd.demand.kind === 'sampler', 'API demand due');
  GG.labels.answerDemand(s2, pd.index, 'met');
  eq([d2.demands[0].answered, GG.labels.answerDemand(s2, pd.index, 'refused')], ['met', null]);
  d2.goodwill = 5; d2.demands.push({ kind: 'other', text: 'x', due: 0, answered: null });
  GG.labels.answerDemand(s2, 1, false);
  ok(s2.label === null && d2.reason === 'goodwill', 'goodwill 0 -> dropped');
});

test('flop: units under the label\'s dropOnFlop line after 12 weeks -> dropped (0 = never)', () => {
  const GG = fresh(), s = local(GG, 17, 3000, 20);
  s.labelOffers = [GG.labels.makeOffer(s, 'monolith', GG.rngFor(s))];
  GG.labels.sign(s, 'monolith');
  const a = releaseNextWeek(GG, s, record(GG, s, 'album', 'basement'));
  while (a.weeksOut < 12) week(GG, s);
  ok(a.flop && s.label === null && s.pastDeals[0].reason === 'flop', 'Monolith drops a flop');
});

test('sales, Maple 100, streams, certs: sane numbers and thresholds', () => {
  const GG = fresh(), L = GG.labels, rng = GG.RNG(3);
  eq([L.chartPos(100), L.chartPos(250), L.chartPos(15000), L.chartPos(1e6)], [null, 100, 1, 1]);
  ok(L.chartPos(2000) > L.chartPos(8000), 'more units, higher on the chart');
  const s = local(GG, 18, 20000, 20);
  const a = releaseNextWeek(GG, s, record(GG, s, 'album', 'silo'));
  ok(a.firstWeek > 1000 && a.firstWeek < 60000, 'week one for 20k fans: ' + a.firstWeek);
  const u1 = a.lastUnits, st1 = a.streams;
  week(GG, s);
  ok(a.lastUnits < u1 && a.streams > st1, 'sales decay, streams keep coming');
  let guard = 0; while ((a.lastUnits || a.streams < 1e9) && guard++ < 40) week(GG, s);
  ok(a.units >= a.sales && a.units === a.sales + Math.floor(a.streams / 1250), 'units = sales + streams / 1250');
  // certs
  const b = JSON.parse(JSON.stringify(a)); b.id = 'X'; b.status = 'released'; b.units = 39999; b.cert = null; s.albums.push(b);
  void rng;
  const tro = s.trophies.length, certs = [];
  GG.on('cert', p => certs.push(p.cert));
  b.lastUnits = 0; b.streamRate = 0; b.streams = 0; b.sales = GG.contracts.CERT.platinum;
  week(GG, s);
  ok(certs.includes('platinum') && b.cert === 'platinum' && s.trophies.length > tro && s.trophies.some(t => t.kind === 'platinum'), 'platinum on the wall');
});

test('Loonies: nominations at week 16, ceremony at week 20, envelopes, rival thanks, speech + outfit cards, rewards', () => {
  const GG = fresh(), s = local(GG, 19, 3000, 20), noms = [], res = [];
  GG.on('loonies:nominations', p => noms.push(p));
  GG.on('loonies:result', p => res.push(p));
  s.drumSkill = 80;
  const a = releaseNextWeek(GG, s, record(GG, s, 'album', 'silo'));
  a.critic = 95; a.chart.peak = 1; a.singleStrength = 95;
  while (s.week !== 17) week(GG, s);
  ok(noms.length === 1 && s.loonies && s.loonies.invited, 'nominated');
  const lv = GG.labels.loonies(s);
  const al = lv.noms.find(n => n.category === 'album');
  ok(al && al.name === 'Heavy Album of the Year' && al.won === null && al.against.includes('Tundra Wraith'), 'album nomination vs the rival');
  while (s.week !== 20) week(GG, s);
  ok(GG.labels.outfitCard(s) && GG.labels.outfit(s, 0).deltas.flags.loonieOutfit === 'cape', 'outfit card');
  const env = GG.labels.openEnvelope(s, 'album');
  ok(env && typeof env.won === 'boolean' && env.winner && res.length === 1, 'envelope opened');
  ok(env.won || env.winner !== 'Tundra Wraith' || /Thanks Hail Damage for Heavy Album/.test(env.thanks), 'rival thanks you personally: ' + env.thanks);
  eq(JSON.stringify(GG.labels.openEnvelope(s, 'album')), JSON.stringify(env), 'envelopes are idempotent');
  ok(s.awards.length === s.loonies.nominations.length && s.awards.every(x => x.nominated), 'AWARD per nomination');
  const won = s.loonies.results.some(r => r.won);
  const sp = GG.labels.speech(s, 0);
  if (won) ok(sp && sp.outcome === 'Thanks, Mom.' && s.trophies.some(t => t.kind === 'loonie'), 'speech + trophy');
  else eq(sp, null, 'no win, no speech');
  eq(GG.labels.speech(s, 1), null, 'one speech');
  week(GG, s);
  eq(res.length, 1, 'the wrap does not run it twice');
  // not run by the UI: the week-20 wrap resolves it
  const t = local(GG, 20, 3000, 20);
  const b = releaseNextWeek(GG, t, record(GG, t, 'album', 'silo'));
  b.critic = 95; b.chart.peak = 1;
  while (!(t.week === 21 && t.loonies && t.loonies.done) && t.totalWeek < 60) week(GG, t);
  ok(t.loonies.done && t.awards.length > 0, 'auto-resolved at week 20');
  // a garage band is never nominated
  const g = career(GG, 21); g.week = 16; eq(GG.labels.nominate(g, GG.rngFor(g)).nominations, []);
  // v0.6: the rival sim replaced the curve: no record out yet = no album case; a year later their debut album counts
  ok(GG.labels.rivalStrength(g, 'album') === 0 && GG.labels.rivalStrength(t, 'album') > 0 && GG.labels.rivalStrength(t, 'worst_van') === 0, 'rival strength from the rival sim');
});

test('world: tier-3 theatres only in the Signed era; commission; era scene; world-ready threshold (era switch off)', () => {
  const GG = fresh(), s = local(GG, 22, 9000);
  const W = GG.world, theatres = GG.content.venues.filter(v => v.tier === 3);
  ok(theatres.length >= 6 && theatres.every(v => v.capacity >= 500 && v.capacity <= 2000), 'theatres 500-2,000');
  ok(W.listings(s).every(l => l.tier <= 2), 'no theatres for local heroes');
  s.era = 'signed';
  let seen = false; for (let i = 0; i < 20 && !seen; i++) { s.totalWeek++; seen = W.listings(s).some(l => l.tier === 3); }
  ok(seen, 'theatres on the board in the Signed era');
  ok(W.scene(s) > W.scene({ era: 'local' }), 'a bigger scene');
  const l = W.makeListing(s, theatres[0], GG.RNG(1));
  s.gig = GG.util.clone(l); s.gig.source = 'book';
  const f0 = s.fund; GG.career.setPlan(s, ['rest', 'rest', 'rest']); GG.career.runWeek(s, { autoGig: true });
  const r = s.lastGig;
  ok(r.commission === Math.round(r.pay * 0.15) && r.crew === 150 && r.pay > 0 && r.lines.some(x => /Management/.test(x)), 'commission + crew: ' + JSON.stringify([r.pay, r.commission, r.crew]));
  void f0;
  s.fans = 30000; eq(GG.labels.worldReady(s), false, 'needs a charting record');
  s.albums.push({ id: 'Z', status: 'released', tracks: [], chart: { peak: 40 } });
  ok(GG.labels.worldReady(s), 'threshold reached');
  GG.career.endWeek(s);
  ok(s.milestones.worldReady && s.era === 'world', 'v0.7: the World era switches on at the threshold');
});

test('migration v4 -> v5: defaults, past-protection saves become local heroes, idempotent, save codes round-trip', () => {
  const GG = fresh(), s = local(GG, 23, 900);
  const v4 = JSON.parse(JSON.stringify(s));
  v4.v = 4; v4.era = 'garage';
  ['eraHistory', 'label', 'labelOffers', 'labelNext', 'pastDeals', 'session', 'albums', 'awards', 'trophies', 'loonies', 'liveYear'].forEach(k => delete v4[k]);
  const m = GG.save.migrate(JSON.parse(JSON.stringify(v4)));
  eq([m.v, m.era, m.label, m.labelOffers, m.session, m.albums, m.awards, m.trophies, m.loonies], [GG.contracts.SAVE_SCHEMA, 'local', null, [], null, [], [], [], null]);
  eq(m.eraHistory.map(e => e.era), ['garage', 'local']);
  eq(JSON.stringify(GG.save.migrate(JSON.parse(JSON.stringify(m)))), JSON.stringify(m), 'idempotent');
  const p = JSON.parse(JSON.stringify(v4)); p.protected = true; p.fans = 100;
  eq(GG.save.migrate(p).era, 'garage', 'a protected save stays in the garage');
  week(GG, m);
  // a signed career with a session round-trips through a save code
  s.labelOffers = [GG.labels.makeOffer(s, 'gopherwood', GG.rngFor(s))]; GG.labels.sign(s, 0);
  GG.labels.book(s, { kind: 'ep', studioId: 'basement', tracks: GG.labels.freshSongs(s).slice(0, 4).map(x => x.id) });
  week(GG, s);
  const back = GG.save.fromCode(GG.save.toCode(s));
  eq(JSON.stringify([back.label, back.session, back.era, back.eraHistory]), JSON.stringify([s.label, s.session, s.era, s.eraHistory]));
});

test('bots: sign, record, release over a career; deterministic per seed; no DOM/Math.random/Date', () => {
  const GG = load({ localStorage: load.fakeStorage() });
  const run = seed => { const s = GG.career.newCareer({ seed, player: { name: 'Bot' } }); for (let i = 0; i < 24 * 5; i++) GG.career.botWeek(s, 'good'); return s; };
  const a = run(99), b = run(99);
  eq(JSON.stringify(a), JSON.stringify(b), 'same seed, same career');
  ok((a.era === 'signed' || a.era === 'world') && a.pastDeals.concat(a.label ? [a.label] : []).length >= 1, 'the good bot signs');
  const rel = a.albums.filter(x => x.status === 'released');
  ok(rel.length >= 3 && rel.every(x => x.reviews.length === 5 && x.critic > 0), 'the good bot records and releases: ' + rel.length);
  ok(rel.every(x => GG.labels.recycled(a, x.tracks, x.id).count <= Math.ceil(x.tracks.length / 2)), 'good bot avoids recycling (at most half the tracks)');
  ok(a.awards.length > 0, 'Loonie nominations happen');
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', '24_sim_labels.js'), 'utf8');
  ok(!/Math\.random|\bDate\b|document\.|window\.(?!GG)/.test(src), '24_sim_labels.js is pure');
});

test('v0.9: demandsByBand, a demand whose card can never be dealt settles half, rival-only labels never offer', () => {
  const GG = fresh({ cards: [{ id: 'dm_hd_only', type: 'money', speaker: 'marcel', title: 't', text: 't', gate: { band: ['hail_damage'] }, choices: [{ label: 'a', outcome: 'o' }] }] });
  const L = GG.labels, lab = L.label('monolith');
  const fh = GG.career.newCareer({ seed: 9, bandId: 'frost_heave' });
  const own = { monolith: [{ kind: 'image', text: 'Less council, more cardio.' }, { kind: 'council', text: 'Stop suing city hall.' }] };
  const saved = lab.demandsByBand;
  const LS = GG.content.labels && (GG.content.labels.labels || GG.content.labels), src = LS && LS.monolith || {};
  src.demandsByBand = { frost_heave: own.monolith };
  try {
    const d = L.demandsFor(fh, L.label('monolith')).map(x => x.kind || x);
    ok(d.indexOf('council') >= 0 && d.filter(k => k === 'image').length === 1, 'band demands on top, same kind replaced ' + d);
    eq(L.demandsFor(fh, L.label('monolith')).find(x => x.kind === 'image').text, 'Less council, more cardio.');
  } finally { if (saved === undefined) delete src.demandsByBand; else src.demandsByBand = saved; }
  const hdOnly = GG.content.cards[0];
  ok(L.cardNeverPasses(fh, hdOnly.id) && !L.cardNeverPasses(GG.career.newCareer({ seed: 9 }), hdOnly.id), 'gated to another band = never');
  ok(L.cardNeverPasses(fh, 'no_such_card'), 'missing = never');
  // a deal whose carded demand can never come up settles 'half' after the grace instead of hanging
  fh.era = 'signed'; fh.fans = 5000; fh.label = { id: 'x', labelId: 'monolith', name: 'Monolith', signed: 1, advance: 0, recouped: 0, costs: 0, royalty: 0.1,
    albumsOwed: 3, albumsDelivered: 0, deadline: 999, goodwill: 60, salesMult: 1, dropped: false,
    demands: [{ kind: 'english', text: '-', card: hdOnly.id, due: 2, answered: null }] };
  fh.totalWeek = 10;
  L.weekly(fh, GG.rngFor(fh), { chat: [] });
  eq(fh.label.demands[0].answered, 'half', 'settled');
  // rival-only labels
  const src2 = LS, add = { id: 'monolith_tv', name: 'Monolith TV', rivalOnly: true, advance: [1, 2], royalty: 0.1, albums: 1, deadlineWeeks: 10, offerMinFans: 0, offerMinBuzz: 0, demands: [] };
  src2.monolith_tv = add;
  try { eq(L.interest(fh, 'monolith_tv'), 0, 'never offered'); } finally { delete src2.monolith_tv; }
});

test('v0.9: a band line after each envelope (awards.win / lose + byBand), own voices only, the outcome unchanged', () => {
  const lines = {};
  ['hail_damage', 'frost_heave', 'gravel_kings', 'grid_road_ramblers'].forEach(b => {
    const run = withLine => {
      const GG = load({ localStorage: load.fakeStorage() });
      const s = GG.career.newCareer({ seed: 12, bandId: b, player: { name: 'T' } });
      if (!withLine) { GG.content.awards.win = []; GG.content.awards.lose = []; delete GG.content.awards.byBand; }
      s.loonies = { year: s.year, week: 20, nominations: [
        { category: 'album', name: 'Album', what: 'x', nominees: ['Us', s.rival.name, 'X'], strength: 99, rival: 1 },
        { category: 'live', name: 'Live', what: 'x', nominees: ['Us', s.rival.name, 'X'], strength: 1, rival: 99 }], invited: true, results: null, done: false };
      return { s, GG, res: GG.labels.runLoonies(s) };
    };
    const a = run(true), z = run(false);
    eq(a.res.map(r => [r.won, r.winner, r.you, r.them]), z.res.map(r => [r.won, r.winner, r.you, r.them]), b + ': same envelopes with or without the lines');
    ok(z.res.every(r => r.bandLine === null), b + ': no lines, no band line');
    const own = a.GG.content.bands[b].members.map(m => m.name.split(' ')[0]);
    const other = [].concat(...Object.keys(a.GG.content.bands).filter(x => x !== b).map(x => a.GG.content.bands[x].members.map(m => m.name.split(' ')[0])));
    a.res.forEach(r => {
      ok(typeof r.bandLine === 'string' && r.bandLine.length > 10 && !/\{/.test(r.bandLine), b + ': a filled line ' + r.bandLine);
      ok(!other.some(n => new RegExp('\\b' + n + '\\b').test(r.bandLine) && !own.includes(n)), b + ': no other band named: ' + r.bandLine);
    });
    lines[b] = a.res.map(r => r.bandLine).join(' ');
  });
  ok(/Kenji|Marcel|Dana|Jaxon/.test(lines.hail_damage) && /Rox|Benny|Moth/.test(lines.frost_heave), 'each band in its own voice');
});

done('sim_labels');
