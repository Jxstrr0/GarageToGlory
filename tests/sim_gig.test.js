// Gig + songs sim tests, plus sanity checks on the SIM-owned content (venues, activities, economy).
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');

const GG = load({ localStorage: load.fakeStorage() });
GG.content.cards = [];
const base = () => { const s = GG.career.newCareer({ seed: 31 }); s.gig = null; return s; };
function tune(s, lvl) {   // lvl 0..1: a weak or a strong band
  s.members.forEach(m => { m.skill = 20 + 60 * lvl; });
  s.drumSkill = 5 + 65 * lvl; s.chemistry = 20 + 60 * lvl; s.burnout = 60 - 40 * lvl;
  s.songs.forEach(x => { x.quality = 20 + 60 * lvl; x.polish = 10 + 80 * lvl; });
  return s;
}

test('venues: required ids and fields, all Saskatchewan, card-only St. Vlad\'s', () => {
  const V = GG.content.venues;
  ['buddys_house_party', 'gopher_hole_openmic', 'legion_63', 'bingo_palace', 'st_vlads_hall', 'warman_curling_lounge',
    'martensville_skatepark', 'gopher_hole'].forEach(id => ok(GG.gig.venue(id), 'venue ' + id));
  const SK = ['Saskatoon', 'Warman', 'Martensville'];
  V.forEach(v => {
    ok(v.name && v.quirk && v.region === 'canada' && SK.indexOf(v.city) >= 0, v.id + ' basics');
    ok(GG.contracts.DEALS.indexOf(v.deal) >= 0 && v.capacity > 0 && v.tier >= 1 && isFinite(v.minFans), v.id + ' numbers');
    GG.contracts.GENRES.forEach(g => ok(v.genreFit[g] >= 0 && v.genreFit[g] <= 1, v.id + ' fit ' + g));
  });
  const b = GG.gig.venue('buddys_house_party');
  eq([b.name, b.city, b.tier, b.capacity, b.deal, b.quirk], ["Buddy's House Party", 'Saskatoon', 1, 15, 'exposure', 'Twelve people and a dog.']);
  eq(GG.gig.venue('st_vlads_hall').minFans, 99999);
  const g = GG.gig.venue('gopher_hole'); eq([g.tier, g.capacity, g.deal], [2, 150, 'door']);
});

test('activities + economy content have every contract key', () => {
  GG.contracts.ACTIVITIES.forEach(a => { const x = GG.content.activities[a]; ok(x && x.id === a && x.name && x.icon && x.blurb, a); });
  ['startFund', 'startFans', 'startBuzz', 'weeklyUpkeep', 'buzzDecay', 'quietWeekChance', 'offerMinFans'].forEach(k => ok(isFinite(GG.content.economy[k]), k));
  const txt = JSON.stringify([GG.content.venues, GG.content.activities]);
  ok(!/\b(USA|U\.S\.|America|American|United States|Texas|Nashville|Las Vegas|New York|California)\b/i.test(txt), 'no USA content');
});

test('makeGig / pay rules per deal', () => {
  const s = base();
  eq(GG.gig.makeGig(s, 'nope', 'book'), null);
  const ex = GG.gig.makeGig(s, 'buddys_house_party', 'forced'), fl = GG.gig.makeGig(s, 'legion_63', 'card'), dr = GG.gig.makeGig(s, 'gopher_hole', 'offer');
  eq([ex.pay, ex.source], [0, 'forced']);
  eq(GG.gig.payFor(ex, 15), 0); eq(GG.gig.payFor(fl, 3), fl.pay); eq(GG.gig.payFor(fl, 60), 80);
  eq(GG.gig.payFor(dr, 100), 100 * GG.gig.venue('gopher_hole').pay);
  for (let i = 1; i <= 40; i++) {
    const r = GG.gig.simulate(s, dr, GG.RNG(i));
    eq(r.pay, GG.gig.payFor(dr, r.crowd)); ok(r.crowd >= 1 && r.crowd <= 150, 'crowd within capacity');
    const r2 = GG.gig.simulate(s, fl, GG.RNG(i)); eq(r2.pay, 80);
  }
});

test('simulate/autoResolve deterministic per seed; applies result and clears the gig', () => {
  const s = base(); s.gig = GG.gig.makeGig(s, 'legion_63', 'book');
  eq(JSON.stringify(GG.gig.simulate(s, s.gig, GG.RNG(5))), JSON.stringify(GG.gig.simulate(s, s.gig, GG.RNG(5))));
  const a = JSON.parse(JSON.stringify(s)), b = JSON.parse(JSON.stringify(s));
  const ra = GG.gig.autoResolve(a, GG.rngFor(a)), rb = GG.gig.autoResolve(b, GG.rngFor(b));
  eq(JSON.stringify(ra), JSON.stringify(rb)); eq(JSON.stringify(a), JSON.stringify(b));
  eq(a.gig, null); eq(a.lastGig, ra); eq(a.stats.gigs, 1); eq(a.stats.bestGrade, ra.grade);
  eq(a.fund - s.fund, ra.pay - ra.gas); eq(a.fans - s.fans, ra.fans);
  ok(GG.contracts.GRADES.indexOf(ra.grade) >= 0 && ra.score >= 0 && ra.score <= 100, 'grade/score');
  eq(ra.reactions.map(x => x.who).sort(), ['dana', 'jaxon', 'kenji', 'marcel']); ok(ra.reactions.every(x => x.text));
  ok(ra.songs.length === Math.min(4, s.songs.length) && ra.lines.length >= 1 && ra.deltas, 'songs/lines/deltas');
  ra.songIds.forEach(id => eq(a.songs.find(x => x.id === id).plays, 1));
  eq(GG.gig.autoResolve(a, GG.rngFor(a)), null, 'nothing booked');
});

test('better band => better average score; genre fit matters', () => {
  const g = GG.gig.makeGig(base(), 'legion_63', 'book'), avg = (s, gg) => {
    let t = 0; for (let i = 1; i <= 200; i++) t += GG.gig.simulate(s, gg || g, GG.RNG(i)).score; return t / 200;
  };
  const weak = avg(tune(base(), 0)), mid = avg(tune(base(), 0.5)), strong = avg(tune(base(), 1));
  ok(weak + 10 < mid && mid + 10 < strong, 'scores ' + [weak, mid, strong].map(Math.round));
  const s = tune(base(), 0.7);
  ok(avg(s, GG.gig.makeGig(s, 'gopher_hole', 'offer')) > avg(s, GG.gig.makeGig(s, 'st_vlads_hall', 'card')), 'metal fits the Gopher Hole better than a church hall');
  eq([GG.gig.gradeFor(80), GG.gig.gradeFor(79), GG.gig.gradeFor(65), GG.gig.gradeFor(64), GG.gig.gradeFor(0)], ['S', 'A', 'A', 'B', 'D']);
});

test('randomOffer / bookLocal respect fans and tiers, never card-only venues', () => {
  const s = base();
  for (const fans of [0, 45, 120, 400]) {
    s.fans = fans;
    for (let i = 1; i <= 60; i++) {
      const o = GG.gig.randomOffer(s, GG.RNG(i)), v = GG.gig.venue(o.venueId);
      ok(v.minFans <= fans && v.tier <= 2 && v.id !== 'st_vlads_hall' && o.source === 'offer', 'offer ' + o.venueId + ' @' + fans);
      const b = GG.gig.bookLocal(s, GG.RNG(i), 1);
      ok(GG.gig.venue(b.venueId).tier === 1 && GG.gig.venue(b.venueId).minFans <= fans && b.source === 'book', 'book');
    }
  }
  const saved = GG.content.venues; GG.content.venues = saved.filter(v => v.minFans > 0); s.fans = 0;
  eq(GG.gig.randomOffer(s, GG.RNG(1)), null); GG.content.venues = saved;
});

test('songs: jam, best, polish', () => {
  const s = base();
  const song = GG.songs.jam(s, GG.RNG(3));
  ok(song.id && song.title && song.titleEn && GG.songs.validate(song.pattern, s.gear).length === 0 && song.auto && song.plays === 0 && song.written === 1, 'shape');
  ok(song.quality >= 1 && song.quality <= 100 && s.stats.songsWritten === 1);
  const ids = new Set(s.songs.map(x => x.id)); eq(ids.size, s.songs.length, 'unique ids');
  for (let i = 0; i < 60; i++) GG.songs.jam(s, GG.RNG(100 + i));
  eq(new Set(s.songs.map(x => x.title)).size, s.songs.length, 'titles unique (sequels when the pool runs out)');
  const best = GG.songs.best(s, 3); eq(best.length, 3);
  ok(GG.songs.score(best[0]) >= GG.songs.score(best[1]) && GG.songs.score(best[1]) >= GG.songs.score(best[2]));
  const top = s.songs.slice().sort((a, b) => b.quality - a.quality).slice(0, 3).map(x => [x.id, x.polish]);
  const pol = GG.songs.polish(s, 10); eq(pol.length, 3);
  top.forEach(([id, p]) => eq(s.songs.find(x => x.id === id).polish, Math.min(100, p + 10)));
  const w2 = GG.songs.jam(tune(base(), 0.5), GG.RNG(9), { repeatFactor: 0.6 });
  const w1 = GG.songs.jam(tune(base(), 0.5), GG.RNG(9));
  eq(w1.quality - w2.quality, Math.round(0.4 * GG.content.activities.write.repeatPenalty), 'repeat penalty');
});

done('sim_gig');
