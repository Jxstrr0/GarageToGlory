// sim_recap.test.js (v0.8.1 LICRECAP, handoff D3): the year-end recap. Built at the week-24 wrap (wrap.recap), one per
// year in state.recaps, compact (small numbers + short strings; the save code stays small); money in vs out (a parents'
// loan isn't income), fans, best / worst gig with a quote, songs, records, awards (Loonies, Global Gong), quits / returns,
// the scene rank vs the rival, regions unlocked, a Rolling Scone headline from the biggest event, year one's "what a good
// year looks like"; content; saves; determinism.
const { test, ok, eq, done } = require('./_t');
const load = require('./_load');

function fresh() { return load({ localStorage: load.fakeStorage() }); }
function botYear(GG, s, style) { let w = null; do { w = GG.career.botWeek(s, style || 'avg'); } while (!w.yearEnd && !s.ended); return w; }

test('content: headlines for every event, grade quotes, year one\'s good-year topics, the Rolling Scone masthead', () => {
  const GG = fresh(), K = GG.content.recap;
  ok(K.masthead === 'Rolling Scone', 'masthead');
  ['final_won', 'final_lost', 'gong', 'loonie', 'cert', 'world', 'signed', 'chart_top', 'charted', 'crack', 'license', 'region', 'quit', 'back',
    'best_s', 'banned', 'loans', 'fans', 'survive_van', 'survive'].forEach(k => ok(Array.isArray(K.headlines[k]) && K.headlines[k].length && K.headlines[k].every(t => t.length <= 90), 'headline ' + k));
  ['S', 'A', 'B', 'C', 'D'].forEach(g => ok(K.quotes[g].length >= 2, 'quotes ' + g));
  // v0.9: goodYear is an array (+ byBand) or { bandId: [..] } (the packs key it); Hail Damage keeps its five.
  const HD = Array.isArray(K.goodYear) ? K.goodYear : K.goodYear.hail_damage;
  eq(HD.map(g => g.topic), ['fans', 'songs', 'gigs', 'loans', 'chemistry']);
  ok(/^\(.*\)$/.test(HD[4].good) && /^\(.*\)$/.test(HD[4].bad), 'Kenji never speaks (a nod, in brackets)');
  Object.keys(GG.content.bands).forEach(b => {
    const l = GG.recap.goodYearList({ bandId: b, genre: GG.content.bands[b].genre });
    eq(l.map(g => g.topic), ['fans', 'songs', 'gigs', 'loans', 'chemistry'], b + ': one line per topic');
  });
});

test('the week-24 wrap builds a RECAP (contract shape), stores one per year, compact', () => {
  const GG = fresh(), s = GG.career.newCareer({ seed: 99, player: { name: 'T' } });
  ok(Array.isArray(s.recaps) && !s.recaps.length && s.yearStart && s.yearStart.fin === 0 && s.yearStart.act.length === 4, 'new career: recaps + year-start marks');
  const w = botYear(GG, s);
  const r = w.recap;
  ok(r && s.recaps.length === 1 && s.recaps[0] === r && r.y === 1, 'wrap.recap stored');
  ['y', 'fundIn', 'fundOut', 'fans', 'best', 'worst', 'songs', 'albums', 'awards', 'quit', 'back', 'rival', 'regions', 'headline', 'photo'].forEach(k => ok(k in r, 'field ' + k));
  ok(r.photo === null, 'the photo is never saved');
  ok(r.best && r.best.venueId && r.best.name && /^[SABCD]$/.test(r.best.grade) && r.best.quote, 'best gig: ' + JSON.stringify(r.best));
  ok(!r.worst || 'SABCD'.indexOf(r.worst.grade) >= 'SABCD'.indexOf(r.best.grade), 'worst gig is not better than the best');
  ok(r.fans === s.fans - 0 - (GG.content.economy.startFans || 0) || r.fans > 0, 'fans gained');
  ok(r.songs >= 1 && r.gigs >= 1 && r.rival && r.rival.rank >= 1 && r.rival.vs >= 1, 'songs, gigs, scene rank');
  ok(JSON.stringify(r).length < 900, 'compact: ' + JSON.stringify(r).length + ' chars');
  ok(s.yearStart.year === 2 && s.yearStart.fin === 0 && s.yearStart.best === null, 'the next year starts fresh');
  botYear(GG, s);
  ok(s.recaps.length === 2 && s.recaps[1].y === 2 && GG.recap.get(s, 1) === s.recaps[0], 'one per year');
});

test('money in vs out: in - out = the fund change; a parents\' loan is not income; out >= 0', () => {
  const GG = fresh(), s = GG.career.newCareer({ seed: 5, player: { name: 'T' } });
  const f0 = s.fund;
  s.phase = 'wrap'; s.weekStart = null;
  GG.career.startWeek(s); if (s.card && !s.card.resolved) GG.career.resolveCard(s, 0);
  GG.career.applyEffects(s, { fund: 500 }, {});
  GG.career.applyEffects(s, { fund: -200 }, {});
  ok(s.yearStart.fin >= 500, 'money in counts positive changes: ' + s.yearStart.fin);
  const fin0 = s.yearStart.fin;
  s.fund = -50; s.phase = 'week'; GG.career.setPlan(s, ['rest', 'rest', 'rest']); s.gig = null; s.phase = 'plan';
  GG.career.runWeek(s, { autoGig: true }); const w = GG.career.endWeek(s);
  ok(w.parentsLoan > 0 && s.yearStart.fin <= fin0 + 5, 'the loan is not income: ' + s.yearStart.fin + ' vs ' + fin0);
  const t = GG.career.newCareer({ seed: 6, player: { name: 'T' } }), start = t.fund;
  const wr = botYear(GG, t), r = wr.recap;
  ok(r.fundIn - r.fundOut === t.fund - start || r.fundOut === 0, 'in - out = net: ' + r.fundIn + ' - ' + r.fundOut + ' vs ' + (t.fund - start));
  ok(r.fundOut >= 0 && r.fundIn >= 0, 'non-negative');
  ok(f0 > 0, 'start fund');
});

test('awards, quits and returns, regions, licensing, a new era: all in the recap and the headline', () => {
  const GG = fresh(), R = GG.recap, s = GG.career.newCareer({ seed: 44, player: { name: 'T' } });
  for (let i = 0; i < 23; i++) GG.career.botWeek(s, 'avg');
  s.awards.push({ year: 1, category: 'live', nominated: true, won: true, against: [] }, { year: 1, category: 'worst_van', nominated: true, won: false, against: [] });
  s.tour.gongs.push({ year: 1, nominated: true, won: true });
  const marcel = s.members.find(m => m.id === 'marcel'); marcel.status = 'quit'; marcel.exit = { storyline: 'gone', since: s.totalWeek };
  const dana = s.members.find(m => m.id !== 'marcel' && m.status === 'active'); dana.returns = (dana.returns || 0) + 1;
  s.tour.regions.japan.unlocked = s.totalWeek;
  s.licensing.deals.push({ brandId: 'game', songId: s.songs[0].id, fee: 3000, cut: 0, week: s.totalWeek, countered: false });
  const r = GG.recap.build(s);   // (built directly: a bot week could have its own drama)
  ok(r.awards.includes('Best Live Act') && r.awards.includes('Global Gong') && r.noms === 1, 'awards: ' + JSON.stringify(r.awards) + ' noms ' + r.noms);
  ok(r.quit.includes('Marcel') && r.back.includes(dana.name.split(' ')[0]), 'quit / came back (first names): ' + JSON.stringify([r.quit, r.back]));
  ok(r.regions.includes('japan') && !r.regions.includes('canada'), 'regions unlocked (not home): ' + r.regions);
  ok(r.lic === 3000, 'licensing income this year');
  const ev = R.events(s, r).map(e => e.key);
  ok(ev[0] === 'gong' && ev.indexOf('loonie') < ev.indexOf('license') && ev.indexOf('license') < ev.indexOf('region') && ev[ev.length - 1] === 'survive', 'events biggest first: ' + ev.join(','));
  ok(/Gong/.test(r.headline), 'headline from the biggest event: ' + r.headline);
  const r2 = Object.assign({}, r, { awards: ['Best Live Act'] });
  ok(/Best Live Act|Loonie/.test(R.headline(s, r2)), 'Loonie headline: ' + R.headline(s, r2));
  ok(R.headline(s, Object.assign({}, r, { awards: [], regions: [], quit: [], back: [], lic: 0, best: null, loans: 0, fans: 10, era: null })).length > 5, 'always a headline');
});

test('year one: the bandmates explain a good year (Marcel, Dana, Jaxon, Mom; Kenji nods); later years don\'t', () => {
  const GG = fresh(), s = GG.career.newCareer({ seed: 12, player: { name: 'T' } });
  const r = botYear(GG, s).recap, gy = GG.recap.goodYear(s, r);
  eq(gy.map(g => g.who), ['marcel', 'dana', 'jaxon', 'mom', 'kenji']);
  ok(gy.every(g => g.text && !/\{/.test(g.text) && typeof g.good === 'boolean'), 'filled lines');
  ok(gy.find(g => g.who === 'jaxon').text.indexOf(String(r.gigs)) >= 0, 'the real numbers');
  const r2 = botYear(GG, s).recap;
  eq(GG.recap.goodYear(s, r2), [], 'year two: none');
});

test('saves: old saves get recaps; deterministic headlines; a 10-year career keeps recaps small', () => {
  const GG = fresh(), s = GG.career.newCareer({ seed: 3, player: { name: 'T' } });
  GG.legacy.noBonus = true;   // v1.0: a 10-year career (bonus years would add recaps 11-13)
  const old = JSON.parse(JSON.stringify(s)); delete old.recaps; old.v = 9;
  ok(Array.isArray(GG.save.migrate(old).recaps), 'old save filled');
  const a = GG.career.newCareer({ seed: 77, player: { name: 'T' } }), b = GG.career.newCareer({ seed: 77, player: { name: 'T' } });
  while (!a.ended) { GG.career.botWeek(a, 'good'); GG.career.botWeek(b, 'good'); }
  eq(JSON.stringify(a.recaps), JSON.stringify(b.recaps), 'same seed, same recaps');
  ok(a.recaps.length === 10 && a.recaps.map(r => r.y).join() === '1,2,3,4,5,6,7,8,9,10', 'ten recaps: ' + a.recaps.map(r => r.y));
  const bytes = JSON.stringify(a.recaps).length;
  ok(bytes < 7000, 'ten years of recaps stay small: ' + bytes + ' chars');
  const code = GG.save.toCode ? GG.save.toCode(a) : null;
  if (code) { const without = Object.assign({}, a, { recaps: [] }); const grow = code.length - GG.save.toCode(without).length; ok(grow < 4000 && grow / code.length < 0.05, 'ten recaps grow the save code by ' + grow + ' chars (< 5%)'); }
  ok(new Set(a.recaps.map(r => r.headline)).size >= 6, 'headlines vary: ' + a.recaps.map(r => r.headline).join(' | '));
});

done('sim_recap');
