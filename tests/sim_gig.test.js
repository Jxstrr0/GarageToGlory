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
  // Any city on the map (v0.3: the Saskatchewan core) — venues must sit on a pin.
  const SK = Object.keys(GG.content.map.cities).map(k => GG.content.map.cities[k].name);
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
  eq(a.fund - s.fund, ra.pay - ra.cut - ra.fillInCost - ra.gas); eq(a.fans - s.fans, ra.fans);
  eq(ra.cut, Math.round(ra.pay * s.payCut), 'members take the pay-the-band cut');
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

/* ---- v0.3 live gig ------------------------------------------------------------------------------------- */
const L = GG.contracts.LANES;
const hitsOf = sec => sec.reduce((t, str) => t + (str.match(/x/g) || []).length, 0);
function decent(seed, n) {   // a band with n decent metal songs at a sane tempo
  const s = base(); s.songs = [];
  for (let i = 0; i < (n || 3); i++) {
    const p = GG.songs.generate('metal', GG.RNG(seed * 10 + i), { gear: s.gear }); p.bpm = Math.min(p.bpm, 160);
    GG.songs.create(s, p, null, { quality: 55 + i * 3, polish: 40 });
  }
  return s;
}
const legion = s => GG.gig.makeGig(s, 'legion_63', 'book');
const play = (s, bot, seed, set, g) => GG.gig.botPlay(GG.gig.session(s, g || legion(s), set || null, { emit: false }), bot, GG.RNG(seed || 1));
const PERFECT = { accuracy: 1, jitterMs: 0 }, AVG = { accuracy: 0.82, jitterMs: 55 };

test('chart: note count == pattern hits x bars; freestyle windows; solo easing; sneaky fills', () => {
  const s = base();
  const songs = s.songs.concat([{ id: 'sig', title: 'Sig', pattern: GG.songs.genre('metal').signature }]);
  songs.forEach(song => {
    const p = song.pattern, ch = GG.gig.chart(song), bars = GG.contracts.BARS_PER_SECTION;
    const want = p.arrangement.reduce((t, name) => t + hitsOf(p.sections[name]) * bars, 0);
    // v0.7.2: a double kick is one note standing for two hits -> notes + doubles + auto = every hit of the pattern
    eq(ch.notes.length + ch.doubles + ch.auto.length, want, song.id + ' notes'); eq(ch.notes.length + ch.doubles + ch.auto.length, GG.songs.toNotes(song).length);
    eq(ch.fills.length, p.arrangement.filter(x => x === 'bridge').length || 1, 'one freestyle window per bridge');
    eq(ch.total, ch.notes.filter(n => !n.free).length);
    ok(ch.notes.every((n, i) => i === 0 || ch.notes[i - 1].t <= n.t) && ch.notes.every(n => L[n.li] === n.lane && n.j === 0), 'sorted, lanes');
    ok(Math.abs(ch.duration - GG.songs.seconds(p)) < 1e-9 && ch.notes[ch.notes.length - 1].t < ch.duration, 'duration');
    ch.notes.filter(n => n.free).forEach(n => ok(n.bar === bars - 1, 'free notes sit in the last bar'));
    const solo = GG.gig.chart(song, { solo: true });
    ok(solo.notes.filter(n => n.section === 'bridge' && !n.free).every(n => n.step % 4 === 0), 'solo: quarter notes only');
    ok(solo.total <= ch.total && solo.solos.length === ch.fills.length, 'solo eases');
    const ex = GG.gig.chart(song, { extras: GG.RNG(4) }), extra = ex.notes.filter(n => n.extra);
    eq(extra.length, ex.extras); eq(ex.notes.length + ex.doubles + ex.auto.length, ch.notes.length + ch.doubles + ch.auto.length + ex.extras);
    extra.forEach(n => { ok(n.lane === 'snare' && n.section !== 'bridge' && n.bar === bars - 1 && n.step >= 10, 'extra spot');
      ok(!GG.songs.isHit(p.sections[n.section][1], n.step), 'extras never double a written snare'); });
  });
  let extras = 0; for (let i = 1; i <= 10; i++) extras += GG.gig.chart(s.songs[0], { extras: GG.RNG(i) }).extras;
  ok(extras > 0, 'fills happen');
});

test('windows: Forgiving at drum skill 10, widening with skill', () => {
  const s = base(); s.drumSkill = 10; eq(GG.gig.windows(s), { perfect: 0.06, good: 0.13 });
  let prev = null;
  for (const d of [1, 10, 30, 60, 100]) { s.drumSkill = d; const w = GG.gig.windows(s); if (prev) ok(w.perfect > prev.perfect && w.good > prev.good, 'widens @' + d); prev = w; }
  const sloppy = { accuracy: 1, jitterMs: 90 }, lo = decent(3), hi = decent(3); lo.drumSkill = 10; hi.drumSkill = 80;
  const a = play(lo, sloppy, 7), b = play(hi, sloppy, 7);
  ok(b.perfect > a.perfect && b.accuracy > a.accuracy && b.score > a.score, 'same hands, better drummer: ' + [a.perfect, b.perfect, a.accuracy, b.accuracy]);
});

test('perfect bot: 100% accuracy and an S on a decent song; average bot lands B-C', () => {
  const s = decent(5, 1), r = play(s, PERFECT, 1, [s.songs[0].id]);
  eq([r.accuracy, r.miss, r.grade], [1, 0, 'S']); eq(r.songResults[0].accuracy, 1); eq(r.perfect, r.songResults[0].notes);
  ok(r.live && r.maxCombo === r.perfect && r.songResults[0].crowdEnd >= 80, 'combo + crowd');
  const full = play(decent(5), PERFECT, 1); eq([full.accuracy, full.grade, full.songResults.length], [1, 'S', 3]);
  const grades = []; for (let i = 1; i <= 6; i++) grades.push(play(decent(i), AVG, i).grade);
  ok(grades.every(g => g === 'B' || g === 'C'), 'avg grades ' + grades.join(''));
  const weak = play(decent(2), { accuracy: 0.55, jitterMs: 90 }, 2);
  ok(/[CD]/.test(weak.grade) && weak.moments.includes('boo'), 'a bad run gets booed ' + weak.grade + ' ' + weak.moments);
});

test('live result: deterministic per seed, GIG_RESULT shape, pay/crowd rules, applyResult', () => {
  const a = decent(8), b = decent(8);
  const ra = play(a, AVG, 3), rb = play(b, AVG, 3);
  eq(JSON.stringify(ra), JSON.stringify(rb)); eq(JSON.stringify(a), JSON.stringify(b));
  ok(JSON.stringify(play(decent(8), AVG, 4)) !== JSON.stringify(ra), 'bot seed matters');
  ['venueId', 'name', 'city', 'deal', 'crowd', 'capacity', 'score', 'grade', 'pay', 'gas', 'fans', 'buzz', 'songs', 'songIds', 'reactions', 'lines']
    .forEach(k => ok(ra[k] !== undefined, 'has ' + k));
  eq(ra.pay, GG.gig.payFor(legion(a), ra.crowd)); ok(ra.crowd >= 1 && ra.crowd <= 60);
  eq(ra.songIds, a.liveGig.setlist); eq(ra.songs.length, 3); eq(ra.reactions.map(x => x.who).sort(), ['dana', 'jaxon', 'kenji', 'marcel']);
  a.songResults = null; const fund = a.fund, fans = a.fans; a.gig = legion(a);
  GG.gig.applyResult(a, ra);
  eq([a.liveGig, a.gig, a.stats.gigs, a.fund - fund, a.fans - fans], [null, null, 1, ra.pay - ra.cut - ra.gas, ra.fans]);
  ra.songIds.forEach(id => eq(GG.songs.byId(a, id).plays, 1));
});

test('session: judging, fill taps, strays, liveGig saves between songs and resumes', () => {
  const s = decent(9), g = legion(s), ses = GG.gig.session(s, g, null, { emit: false }), W = ses.windows;
  eq(s.liveGig.index, 0); eq(s.liveGig.setlist.length, GG.gig.setSize(s, g));
  const ch = ses.startSong(), n = ch.notes.filter(x => !x.free);
  eq(ses.judge(n[0].lane, n[0].t + W.perfect * 0.5).judgement, 'perfect');
  const alone = x => ch.notes.every(y => y === x || y.lane !== x.lane || Math.abs(y.t - x.t) > 0.3);
  const n2 = n.find(x => x.lane !== n[0].lane && x.t > n[0].t + 0.5 && alone(x));
  eq(ses.judge(n2.li, n2.t - (W.perfect + W.good) / 2).judgement, 'good');
  const lone = n.find((x, i) => i > 2 && ch.notes.every(y => y === x || y.lane !== x.lane || Math.abs(y.t - x.t) > 0.5));
  if (lone) { const st = ses.judge(lone.lane, lone.t + W.good + 0.05); ok(st.judgement === null && st.stray, 'stray'); }
  const f = ch.fills[0], fr = []; for (let i = 0; i < 12; i++) fr.push(ses.judge('cymbal', f.t0 + 0.01 * i).judgement);
  ok(fr.filter(x => x === 'fill').length >= 8, 'fill taps'); ses.tick(ch.duration + 1);
  const r1 = ses.endSong(); eq(r1.fills, 8, 'fill taps cap at 8 per window');
  ok(r1.miss > 0 && r1.perfect === 1 && r1.good === 1, 'missed the rest');
  eq([s.liveGig.index, s.liveGig.songs.length], [1, 1]);
  const events = []; const off = GG.on('gig:song', p => events.push(p.index));
  const saved = JSON.parse(JSON.stringify(s));   // "reload" mid-gig
  const again = GG.gig.session(saved, saved.liveGig.gig, null, { emit: true });
  eq([again.index, again.done, again.crowd], [1, false, s.liveGig.crowd]);
  const r = GG.gig.botPlay(again, PERFECT, GG.RNG(1)); off();
  eq(events, [1, 2]); eq(r.songResults.length, 3); eq(r.songResults[0].perfect, 1); eq(saved.liveGig.index, 3);
});

test('due (v1.0.1 smart bridge): pure "would judge hit a note here", matches judge()', () => {
  const s = decent(9), g = legion(s), ses = GG.gig.session(s, g, null, { emit: false }), W = ses.windows;
  const ch = ses.startSong(), n = ch.notes.filter(x => !x.free);
  const alone = x => ch.notes.every(y => y === x || y.lane !== x.lane || Math.abs(y.t - x.t) > 0.5);
  const a = n.find((x, i) => i > 2 && alone(x)), snap = JSON.stringify([ses.crowd, ses.combo, a.j]);
  eq(ses.due(a.lane, a.t), true); eq(ses.due(a.li, a.t + W.good * 0.9), true);
  eq(ses.due(a.lane, a.t + W.good + 0.05), false); eq(ses.due(a.lane, a.t - W.good - 0.05), false);
  eq(ses.due(99, a.t), false); eq(ses.due('nope', a.t), false);
  eq(JSON.stringify([ses.crowd, ses.combo, a.j]), snap, 'due() changes nothing');
  eq(ses.judge(a.lane, a.t).judgement, 'perfect'); eq(ses.due(a.lane, a.t), false, 'a hit note is no longer due');
  const other = () => n.find(x => x.lane !== a.lane && alone(x) && x.t > a.t + 1);
  const b = other(); eq(ses.due(b.lane, b.t), !!ses.judge(b.lane, b.t).note);
  const k = GG.gig.session(decent(9), legion(decent(9)), null, { emit: false, autoKick: true }), kc = k.startSong(), kn = kc.notes.find(x => x.lane === 'kick' && !x.free);
  if (kn) eq(k.due('kick', kn.t), false, 'Auto-kick lanes are never due');
  eq(GG.gig.session(decent(9), legion(decent(9)), null, { emit: false }).due('kick', 0), false, 'no song yet');
});
test('stale songs score less; classics get a cheer; setlist opener + closer bonus', () => {
  const s1 = decent(11, 1), s2 = decent(11, 1), s3 = decent(11, 1);
  s2.songs[0].stale = 90; s3.songs[0].classic = true;
  const [a, b, c] = [s1, s2, s3].map(s => play(s, AVG, 5, [s.songs[0].id]).songResults[0]);
  ok(b.score < a.score && b.crowdAvg < a.crowdAvg, 'stale ' + [a.score, b.score]);
  ok(c.cheer && !a.cheer && c.score > a.score, 'classic ' + [a.score, c.score]);
  const s = decent(12, 4), g = legion(s), def = GG.gig.defaultSetlist(s, g);
  eq(def.length, 4); const bo = GG.gig.setlistBonuses(s, def); ok(bo.opener && bo.closer, 'default set earns both');
  const ranked = GG.songs.best(s).map(x => x.id), bad = ranked.slice().reverse();
  const bb = GG.gig.setlistBonuses(s, bad); ok(!bb.opener, 'weakest first: no opener bonus');
  const good = play(decent(12, 4), AVG, 6, def), worse = play(decent(12, 4), AVG, 6, bad);
  ok(good.setBonus.opener && good.setBonus.closer && !worse.setBonus.opener, 'flags');
  ok(good.lines.some(l => /Opening with/.test(l)) && good.lines.some(l => /Closing on/.test(l)), 'bonus lines');
  ok(good.score > worse.score, 'order matters ' + [good.score, worse.score]);
});

test('band effects: cape spin, solo, sneaky fills, unhappy members; genre moments for all four genres', () => {
  const plain = decent(13), caped = decent(13); caped.flags.cape = 'velvet';
  const rp = play(plain, PERFECT, 2), rc = play(caped, PERFECT, 2);
  ok(rc.moments.includes('capeSpin') && !rp.moments.includes('capeSpin'), 'cape spin needs a cape');
  ok(rc.songResults[0].crowdAvg >= rp.songResults[0].crowdAvg, 'the cape helps');
  ok(rc.songResults.filter(x => x.moments.includes('capeSpin')).length === rc.songResults.length, 'the cape spins in every song (v0.8.3; perSong): ' + rc.songResults.map(x => x.moments.includes('capeSpin')));
  ok(rc.reactions.find(x => x.who === 'marcel').text.length > 0);
  eq(GG.gig.roles(plain), { front: 'marcel', solo: 'dana', fill: 'jaxon' });
  ok(rp.moments.includes('solo') || !plain.songs.some(x => x.pattern.arrangement.includes('bridge')), 'solo moment');
  const easy = decent(14, 1); easy.songs[0].rating.difficulty = 30;
  const ses = GG.gig.session(easy, legion(easy), null, { emit: false }); let extras = 0;
  for (let i = 0; i < 6 && !extras; i++) { easy.seed = 100 + i; easy.liveGig = null; const x = GG.gig.session(easy, legion(easy), null, { emit: false }); extras += x.startSong().extras; }
  ok(extras > 0 && ses.startSong() && true, 'Jaxon sneaks fills into simple songs');
  const hard = decent(14, 1); hard.songs[0].rating.difficulty = 80; eq(GG.gig.session(hard, legion(hard), null, { emit: false }).startSong().extras, 0);
  const happy = decent(15), grumpy = decent(15); grumpy.members.forEach(m => { if (m.id !== 'marcel') m.mood = 10; });
  const rh = play(happy, AVG, 3), rg = play(grumpy, AVG, 3);
  ok(rg.songResults.every(r => r.flubs > 0) && rh.songResults.every(r => r.flubs === 0), 'unhappy members miss cues');
  ok(rg.score < rh.score, 'and drag the crowd ' + [rh.score, rg.score]);
  for (const [genre, kind] of [['metal', 'wallOfDeath'], ['punk', 'circlePit'], ['rock', 'lighters'], ['country', 'lineDance']]) {
    const s = decent(16); s.genre = genre; const seen = [];
    const off = GG.on('crowd:moment', p => seen.push(p.kind));
    const r = GG.gig.botPlay(GG.gig.session(s, legion(s), null, {}), PERFECT, GG.RNG(1)); off();
    ok(r.moments.includes(kind) && seen.includes(kind), genre + ' moment ' + r.moments);
  }
  for (const id of Object.keys(GG.content.bands)) {
    const st = GG.career.newCareer({ seed: 3, bandId: id }), ro = GG.gig.roles(st);
    ok(ro.front && ro.solo && ro.fill && ro.solo !== ro.fill, id + ' roles ' + JSON.stringify(ro));
  }
});

test('difficulty (v0.5.1): easy/normal thin the chart by time, widen windows, soften misses; hard = as written', () => {
  const s = decent(21, 2), song = s.songs[0];
  const hard = GG.gig.chart(song, {}), normal = GG.gig.chart(song, { difficulty: 'normal' }), easy = GG.gig.chart(song, { difficulty: 'easy' });
  ok(easy.total < normal.total && normal.total <= hard.total, 'easy < normal <= hard notes ' + [easy.total, normal.total, hard.total]);
  const E = GG.gig.DIFFICULTIES.easy, last = {};
  let prevT = -1e9, chord = 0;
  for (const n of easy.notes.filter(n => !n.free)) {
    if (last[n.lane] != null) ok(n.t - last[n.lane] >= E.laneGap[n.lane] - 1e-6, 'easy lane gap ' + n.lane);
    last[n.lane] = n.t;
    if (Math.abs(n.t - prevT) < 0.001) { chord++; ok(chord < E.chord, 'easy chord cap'); } else { ok(n.t - prevT >= E.anyGap - 1e-6, 'easy any gap'); chord = 0; }
    prevT = n.t;
  }
  const w = GG.gig.windows(s, 'hard'), we = GG.gig.windows(s, 'easy');
  ok(we.perfect > w.perfect && we.good > w.good, 'easy windows wider');
  eq(GG.gig.windows(s), w, 'no difficulty = hard windows');
  const ses = GG.gig.session(s, legion(s), null, { emit: false, difficulty: 'easy' });
  eq([ses.difficulty, s.liveGig.difficulty], ['easy', 'easy'], 'session keeps its difficulty for resume');
  const s2 = decent(21, 2), hardSes = GG.gig.session(s2, legion(s2), null, { emit: false });
  const et = ses.startSong().total, ht = hardSes.startSong().total;
  ok(et < ht, 'the live easy chart is thinner than the hard one ' + [et, ht]);
  const sloppy = { accuracy: 0.7, jitterMs: 75 };
  const rh = play(decent(22, 2), sloppy, 5), re = GG.gig.botPlay(GG.gig.session(decent(22, 2), legion(decent(22, 2)), null, { emit: false, difficulty: 'easy' }), sloppy, GG.RNG(5));
  ok(re.score > rh.score, 'a sloppy player does better on easy ' + [rh.score, re.score]);
});

test('two-thumb rule (v0.6.2): no difficulty ever asks for 3+ notes at once; dropped hits become auto notes', () => {
  const s = base(), pool = s.songs.concat(['metal', 'punk', 'rock', 'country'].map(g => ({ id: 'sig-' + g, title: g, pattern: GG.songs.genre(g).signature })));
  for (let i = 1; i <= 12; i++) pool.push({ id: 'gen' + i, title: 'g' + i, pattern: GG.songs.generate(['metal', 'punk', 'rock', 'country'][i % 4], GG.RNG(i), { wild: true }) });
  let chordSongs = 0, autos = 0;
  const pr = GG.gig.THUMB_PRIORITY;
  pool.forEach(song => {
    const raw = GG.gig.chart(song, { thumbs: false, free: false, doubles: false }), big = {};
    raw.notes.forEach(n => { const k = n.t.toFixed(4); big[k] = (big[k] || 0) + 1; });
    const had3 = Object.values(big).some(c => c >= 3); if (had3) chordSongs++;
    GG.contracts.GIG_DIFFICULTY.forEach(d => {
      [{}, { extras: GG.RNG(3), solo: true }].forEach(o => {
        const ch = GG.gig.chart(song, Object.assign({ difficulty: d === 'hard' ? null : d }, o)), at = {};
        ch.notes.filter(n => !n.free).forEach(n => { const k = n.t.toFixed(4); (at[k] = at[k] || []).push(n.lane); });
        ok(Object.values(at).every(l => l.length <= 2), song.id + ' ' + d + ': never more than 2 judged notes at once');
        ok(ch.auto.every(a => a.lane !== 'kick'), 'a kick is never a thumb drop');
        // v0.7.2: a double's second kick keeps the kick's thumb slot at t2 (merged after the two-thumb rule)
        ch.notes.filter(n => n.dbl).forEach(n => { const k = n.t2.toFixed(4); (at[k] = at[k] || []).push('kick'); });
        eq(ch.total, ch.notes.filter(n => !n.free).length, 'auto notes stay out of total');
        ok(ch.auto.every(a => a.auto && !ch.notes.includes(a)), 'auto notes are separate');
        ch.auto.forEach(a => { const kept = at[a.t.toFixed(4)] || []; ok((kept.length === 2 || GG.gig.DIFFICULTIES[d].laneGap) && kept.every(l => pr.indexOf(l) < pr.indexOf(a.lane)), 'priority kick > snare > cymbal > toms > ride > hat'); });
        if (had3 && !o.solo) ok(ch.auto.length > 0, song.id + ' ' + d + ': 3-note chords leave auto notes');
        autos += ch.auto.length;
      });
    });
  });
  ok(chordSongs >= 3 && autos > 0, 'some songs had 3+ note chords ' + chordSongs);
  // a perfect bot on a chord-heavy song: accuracy is over judged notes only
  const sesS = decent(23, 2); sesS.songs.unshift({ id: 'chordy', title: 'Chordy', quality: 60, polish: 60, pattern: GG.songs.genre('metal').signature });
  const ses = GG.gig.session(sesS, legion(sesS), ['chordy'], { emit: false, difficulty: 'expert' }), ch = ses.startSong();
  const r = GG.gig.botPlay(ses, { accuracy: 1, jitterMs: 0, one: true }, GG.RNG(1));
  ok(ch.auto.length > 0 && r.accuracy >= 0.99 && r.notes === ch.total && r.miss === 0, 'accuracy counts judged notes only ' + [r.accuracy, r.notes, ch.total, ch.auto.length]);
});

// ---- v0.7.2 double kicks (owner: one kick note hits twice: less compression on the highway, same pace) ---------------------
const E16 = '................';
const kickSong = (bpm, kick, rest) => ({ id: 'k' + bpm + kick, title: 'Kicks', quality: 60, polish: 60,
  pattern: { bpm, lanes: 4, arrangement: ['verse', 'chorus'], sections: { verse: [kick].concat(rest || ['....x.......x...', E16, E16]),
    chorus: [E16, E16, E16, E16], bridge: [E16, E16, E16, E16] } } });
const kicksOf = ch => ch.notes.filter(n => n.lane === 'kick');
test('double kicks: fast pairs merge into one note (runs pair 1+2, 3+4; odd one single), by time, before thinning', () => {
  const G = GG.gig.DOUBLE_GAP, bars = GG.contracts.BARS_PER_SECTION;
  ok(G >= 0.15 && G <= 0.2, 'gap threshold ~0.16-0.2 s: ' + G);
  // 120 BPM: a 16th = 0.125 s (merges), two 16ths = 0.25 s (does not)
  const shape = (kick, want) => {
    const ch = GG.gig.chart(kickSong(120, kick), { free: false }), k = kicksOf(ch), per = k.length / bars, d = ch.doubles / bars;
    eq([per, d], want, kick + ' kick notes / doubles per bar');
    k.filter(n => n.dbl).forEach(n => ok(Math.abs(n.t2 - n.t - 0.125) < 1e-9, 'second hit one 16th later'));
    eq(k.length + ch.doubles, (kick.match(/x/g) || []).length * bars, 'every kick accounted for');
    return ch;
  };
  const pairs = shape('xx..xx..xx..xx..', [4, 4]);
  ok(kicksOf(pairs).every(n => n.dbl && n.step % 4 === 0), 'pairs: the first hit carries the note');
  const r3 = shape('xxx.....xxx.....', [4, 2]), r3k = kicksOf(r3);
  eq(r3k.slice(0, 2).map(n => [n.step, !!n.dbl]), [[0, true], [2, false]], 'run of 3: 1+2 double, 3 single');
  eq(kicksOf(shape('xxxx....xxxx....', [4, 4])).slice(0, 2).map(n => [n.step, !!n.dbl]), [[0, true], [2, true]], 'run of 4: 1+2, 3+4');
  const r5 = shape('xxxxx...xxxxx...', [6, 4]);                   // run of 5: 1+2, 3+4, 5 single
  eq(kicksOf(r5).slice(0, 3).map(n => [n.step, !!n.dbl]), [[0, true], [2, true], [4, false]], 'run of 5');
  shape('xxxxxxxxxxxxxxxx', [8, 8]);                              // a double-kick run: every note a double (runs span bars)
  shape('x...x...x...x...', [4, 0]);                              // quarters never merge
  // the threshold is time, not steps: 8th-note kicks merge only when fast enough
  const slow = Math.floor(30 / (G + 0.003)), fast = Math.ceil(30 / (G - 0.003)), eighths = 'x.x.x.x.x.x.x.x.';
  eq(GG.gig.chart(kickSong(slow, eighths), { free: false }).doubles, 0, '8ths at ' + slow + ' BPM stay single');
  eq(GG.gig.chart(kickSong(fast, eighths), { free: false }).doubles, 4 * bars, '8ths at ' + fast + ' BPM pair up');
  GG.gig.DOUBLE_GAP = 0.1; eq(GG.gig.chart(kickSong(fast, eighths), { free: false }).doubles, 0, 'tunable'); GG.gig.DOUBLE_GAP = G;
  eq(GG.gig.chart(kickSong(fast, eighths), { doubles: false }).doubles, 0, 'doubles: false = no merge');
  // determinism + the pattern invariant on every genre signature and wild jams, every difficulty
  const pool = ['metal', 'punk', 'rock', 'country'].map(g => ({ id: 'sig-' + g, title: g, pattern: GG.songs.genre(g).signature }));
  for (let i = 1; i <= 16; i++) pool.push({ id: 'gen' + i, title: 'g' + i, pattern: GG.songs.generate(['metal', 'punk'][i % 2], GG.RNG(i), { wild: true, gear: { lanes: 4, doubleKick: i % 3 === 0 } }) });
  let merged = 0;
  pool.forEach(song => {
    const hard = GG.gig.chart(song, {}), raw = GG.gig.chart(song, { doubles: false });
    eq(JSON.stringify(GG.gig.chart(song, {})), JSON.stringify(hard), song.id + ' deterministic');
    eq(hard.notes.length + hard.doubles + hard.auto.length, GG.songs.toNotes(song).length, song.id + ' notes + doubles + auto = pattern hits');
    eq(hard.auto.length, raw.auto.length, 'doubles never change the two-thumb drops');
    eq(hard.total, raw.total - hard.doubles, 'one note per double');
    hard.notes.filter(n => n.dbl).forEach(n => ok(n.lane === 'kick' && !n.free && n.t2 > n.t && n.t2 - n.t <= GG.gig.DOUBLE_GAP + 1e-6, 'double shape'));
    hard.fills.forEach(f => ok(hard.notes.every(n => !n.dbl || n.t2 < f.t0 - 1e-9 || n.t >= f.t1 - 1e-9), 'freestyle kicks never merge'));
    merged += hard.doubles;
    const byT = {}; hard.notes.filter(n => n.dbl).forEach(n => { byT[n.t.toFixed(4)] = n.t2; });
    ['normal', 'easy'].forEach(d => {
      const ch = GG.gig.chart(song, { difficulty: d }), E = GG.gig.DIFFICULTIES[d];
      ok(ch.total <= hard.total, d + ' thins');
      ch.notes.filter(n => n.dbl).forEach(n => ok(Math.abs(byT[n.t.toFixed(4)] - n.t2) < 1e-9, d + ': thinning keeps or drops a double whole'));
      let last = null; kicksOf(ch).filter(n => !n.free).forEach(n => { if (last != null) ok(n.t - last >= E.laneGap.kick - 1e-6, d + ': a double thins like one kick note'); last = n.t; });
    });
  });
  ok(merged > 50, 'fast songs have doubles: ' + merged);
  // Easy/Normal on the metal signature (170 BPM, kick on every 8th): the kick lane halves, the song keeps every hit's sound
  const sig = pool[0], h0 = GG.gig.chart(sig, { doubles: false, free: false }), h1 = GG.gig.chart(sig, { free: false });
  ok(kicksOf(h1).length * 2 === kicksOf(h0).length && h1.doubles === kicksOf(h1).length, 'signature: every kick note is now a double ' + [kicksOf(h0).length, kicksOf(h1).length]);
});
test('double kicks in the session: tap once, one judgement; the second hit is never a miss; misses stay one miss', () => {
  const s = decent(31, 1); s.songs.unshift(kickSong(120, 'xx..xx..xx..xx..', [E16, E16, E16]));
  const sid = s.songs[0].id, ses = GG.gig.session(s, legion(s), [sid], { emit: false, difficulty: 'hard' }), ch = ses.startSong(), W = ses.windows;
  const k = kicksOf(ch).filter(n => !n.free), a = k[0], b = k[1], c = k[2];
  ok(a.dbl && b.dbl && c.dbl, 'doubles on the chart');
  const r = ses.judge('kick', a.t + 0.01);
  eq([r.judgement, r.note === a, ses.combo, a.hitT], ['perfect', true, 1, a.t + 0.01], 'one tap, one judgement');
  const echo = ses.judge('kick', a.t2 + 0.005);
  ok(echo.echo && echo.judgement === null && !echo.stray && ses.combo === 1, 'tapping the second kick too is forgiven (no stray, combo kept)');
  ses.tick(b.t + W.good + 0.2);
  eq([b.j, ses.stats().miss, ses.combo], [3, 1, 0], 'an untapped double is ONE miss');
  ses.judge('kick', c.t - 0.02); ses.tick(c.t2 + 0.5);
  eq(ses.stats().miss, 1, 'the second kick never misses');
  const res = ses.endSong();
  eq([res.notes, res.stray], [ch.total, 0], 'total counts a double once; echo taps are not strays');
  // a perfect bot on a doubles song: 100%, combo = notes
  const s2 = decent(32, 1); s2.songs.unshift(kickSong(120, 'xxxxxxxxxxxxxxxx'));
  const rr = GG.gig.botPlay(GG.gig.session(s2, legion(s2), [s2.songs[0].id], { emit: false, difficulty: 'expert' }), PERFECT, GG.RNG(1));
  eq([rr.accuracy, rr.miss, rr.maxCombo], [1, 0, rr.perfect], 'perfect bot');
  // Auto-kick plays doubles (hitT set so the second kick can follow)
  const s3 = decent(33, 1); s3.songs.unshift(kickSong(120, 'xx..xx..xx..xx..'));
  const ak = GG.gig.session(s3, legion(s3), [s3.songs[0].id], { emit: false, autoKick: true, difficulty: 'hard' }), ch3 = ak.startSong();
  for (let T = 0; T <= 4; T += 0.05) ak.tick(T); const d3 = kicksOf(ch3).filter(n => n.t <= 3.9);
  ok(d3.length && d3.every(n => n.j === 2 && n.hitT >= n.t - 1e-6 && n.hitT - n.t < 0.3), 'auto-kick hits doubles');
});
test('double kicks: an early tap for the next kick note is never stolen by the echo rule (credited, not missed)', () => {
  ['hard', 'normal'].forEach((d, i) => {
    const s = decent(34 + i, 1); s.songs.unshift(kickSong(170, 'x.x.x.x.x.x.x.x.', [E16, E16, E16]));
    const ses = GG.gig.session(s, legion(s), [s.songs[0].id], { emit: false, difficulty: d }), ch = ses.startSong(), W = ses.windows;
    const k = kicksOf(ch).filter(n => !n.free && n.dbl), [a, b, c, e] = k;
    ok(b.t - a.t < 0.4 && Math.abs(b.t - 0.1 - a.t2) < 0.1, d + ': doubles back to back ' + [a.t, a.t2, b.t].map(x => x.toFixed(3)));
    eq(ses.judge('kick', a.t).judgement, 'perfect', d + ': A hit');
    const r = ses.judge('kick', b.t - 0.1);                           // 100 ms early for B: nearer A's second kick
    ok(r.echo && r.dbl === a && b.t - 0.1 - b.t >= -W.good, d + ': read as A\'s echo (inside B\'s window too)');
    ses.tick(b.t + W.good + 0.3);
    eq([b.j, ses.combo, ses.stats().miss], [2, 2, 0], d + ': B credited Good with that tap, combo kept');
    ok(Math.abs(b.hitT - (b.t - 0.1)) < 1e-9, d + ': B hit at the tap');
    // a both-kick tapper on the next pair: C, C's second kick (late 20 ms), D on time
    eq(ses.judge('kick', c.t).judgement, 'perfect', d + ': C');
    const ec = ses.judge('kick', c.t2 + 0.02);
    ok(ec.echo && ec.dbl === c, d + ': C\'s second kick = echo');
    eq(ses.judge('kick', e.t).judgement, 'perfect', d + ': D perfect (not eaten by C\'s echo)');
    ses.tick(e.t + W.good + 0.3);
    eq([ses.stats().miss, ses.combo], [0, 4], d + ': no misses');
    const res = ses.endSong();
    eq(res.stray, 0, d + ': no strays');
  });
});

// ---- v0.6.1 (Addendum C4, SETTINGS): Expert, assists, difficulty pay, calibration maths ---------------------------------
test('Expert: every hit as written, tighter windows than Hard, a sloppy player scores lower', () => {
  const s = base(), w = d => GG.gig.windows(s, d);
  ok(w('expert').perfect < w('hard').perfect && w('expert').good < w('hard').good, 'expert windows tighter');
  ok(GG.gig.DIFFICULTIES.expert.look < GG.gig.DIFFICULTIES.hard.look, 'expert scrolls faster');
  eq(GG.contracts.GIG_DIFFICULTY.filter(d => !GG.gig.DIFFICULTIES[d]), []);
  const sess = d => GG.gig.session(base(), legion(base()), null, { emit: false, difficulty: d });
  const bot = { accuracy: 0.9, jitterMs: 60 };
  const rh = GG.gig.botPlay(sess('hard'), bot, GG.RNG(4)), rx = GG.gig.botPlay(sess('expert'), bot, GG.RNG(4));
  eq(rx.difficulty, 'expert');
  ok(rx.score <= rh.score, 'sloppy on expert ' + rx.score + ' <= hard ' + rh.score);
});
test('assists: Auto-kick plays every kick, No-fail keeps the crowd off the floor, both land in the result', () => {
  const none = { accuracy: 0, jitterMs: 0 };
  const run = o => GG.gig.botPlay(GG.gig.session(base(), legion(base()), null, Object.assign({ emit: false, difficulty: 'hard' }, o)), none, GG.RNG(2));
  const plain = run({}), ak = run({ autoKick: true }), nf = run({ noFail: true });
  const kicks = ak.songResults.reduce((t, r) => t + r.good, 0);
  ok(plain.perfect + plain.good === 0 && kicks > 0 && ak.perfect === 0, 'auto kicks count as Goods: ' + kicks);
  eq(ak.assists, ['autoKick']); eq(nf.assists, ['noFail']); eq(plain.assists, []);
  ok(ak.score > plain.score, 'auto-kick helps ' + ak.score + ' > ' + plain.score);
  ok(nf.songResults.every(r => r.crowdEnd >= GG.gig.noFailFloor), 'no-fail floor');
  ok(nf.moments.indexOf('boo') < 0 && nf.moments.indexOf('drinks') < 0, 'nobody boos a no-fail show');
  ok(plain.songResults.some(r => r.crowdEnd < GG.gig.noFailFloor), 'without it the crowd hits the floor');
  // a kick tap under Auto-kick is ignored (no stray penalty)
  const S = GG.gig.session(base(), legion(base()), null, { emit: false, autoKick: true }); S.startSong();
  eq(S.judge('kick', 0.5).auto, true);
});
test('career difficulty scales gig pay once, in applyResult', () => {
  const pay = d => { const s = GG.career.newCareer({ seed: 31, careerDifficulty: d }); s.gig = legion(s); const r = GG.gig.simulate(s, s.gig, GG.RNG(3)); r.pay = 100; GG.gig.applyResult(s, r); return r.pay; };
  eq([pay('chill'), pay('normal'), pay('brutal')], [120, 100, 85]);
});
test('calibration maths: nearest click, trimmed mean, needs four taps', () => {
  const clicks = [0, 600, 1200, 1800, 2400, 3000, 3600, 4200].map(x => x + 1000);
  const r = GG.prefs.calibCompute(clicks, clicks.map((c, i) => c + 50 + (i % 2 ? 6 : -6)).concat([clicks[3] + 280]), { interval: 600 });
  ok(r.ok && Math.abs(r.offset - 50) <= 12, 'offset ~50: ' + JSON.stringify(r));
  eq(GG.prefs.calibCompute(clicks, [clicks[0] - 30, clicks[1] - 30], { interval: 600 }).ok, false);
  eq(GG.prefs.calibCompute(clicks, clicks.map(c => c - 40), { interval: 600 }).offset, -40);
  const pf = GG.prefs.get();
  eq([pf.audioProfile, pf.calib.speaker.audio, pf.calib.headphones.visual, pf.noteSpeed, pf.graphics, pf.cameraShake], ['speaker', 0, 0, 1, 'auto', true]);   // v1.0 (§0 Q8): a fresh profile is 'auto'
  GG.prefs.setCalib('headphones', { audio: 180, visual: 400 }); GG.prefs.setProfile('headphones');
  const o = GG.prefs.offsets(); eq([o.audio, o.visual], [0.18, 0.25]);
  eq(GG.prefs.get().calibSeen, true);
});

// ---- v1.3 "Songwriter" (plan_contract_1.3 §4.6, Lane A): swing + fills in the charts, Scratch / singles on the string
// highway. A second GG with 30_audio's pure timeline (the seat charts read it; the tests above keep the stub-free drum path).
const GA = (() => { const g = load({ localStorage: load.fakeStorage() }); g.content.cards = [];
  new Function('window', require('fs').readFileSync(require('path').join(__dirname, '..', 'src', '30_audio.js'), 'utf8'))({ GG: g }); return g; })();
const CA = GA.contracts, E13 = '................', BANDS13 = { metal: 'hail_damage', punk: 'frost_heave', rock: 'gravel_kings', country: 'grid_road_ramblers' };
const full13 = (g, bpm) => { const p = JSON.parse(JSON.stringify(GA.songs.signature(g))); if (bpm) p.bpm = bpm; p.sections.solo = p.sections.verse.slice(); p.sections.outro = p.sections.chorus.slice(); p.arrangement = ['verse', 'chorus', 'bridge', 'solo', 'chorus', 'outro']; return p; };
const song13 = (p, id) => ({ id: id || 'v13', title: 'V13', pattern: p, quality: 60, polish: 60 });
const grid13 = n => n.entry * CA.BARS_PER_SECTION * 4 + n.bar * 4 + n.step / 4;
const brk13 = g => { const R = GA.songs.genre(g).backing.roles || {}; return CA.SECTIONS.filter(n => (R[n] || []).indexOf('break') >= 0); };
// does toNotes bring the bar-4 fills in yet (Lane S, Q2)? the drum-chart fill checks need it; the timeline side is in sim_audio
const fillsInNotes = (() => { const p = full13('punk'); p.arrangement = ['verse']; p.fillBars = { verse: [E13, E13, E13, 'x..............x'] };
  return GA.songs.toNotes(p).some(n => n.bar === 3 && n.lane === 'cymbal' && n.step === 15); })();

test('v1.3 swing: every swung drum-chart note sounds at its timeline time (4 genres x Feel 1-4, extras too); steps / bars stay', () => {
  for (const g of CA.GENRES) for (const sw of [1, 2, 3, 4]) {
    const p = full13(g); p.swing = sw;
    const ch = GA.gig.chart(song13(p), { thumbs: false, doubles: false }), tl = GA.audio.timeline(p, { genre: g, songId: 'v13', backing: false, vocals: false });
    const at = {}; tl.events.filter(e => e.kind === 'drum').forEach(e => { at[e.lane + '@' + (e.g != null ? e.g : e.beat)] = e.beat; });
    const w = g + ' Feel ' + sw;
    eq(ch.notes.length, tl.events.filter(e => e.kind === 'drum').length, w + ': one note per drum hit');
    let moved = 0;
    ch.notes.forEach(n => {
      const b = at[n.lane + '@' + grid13(n)];
      ok(b != null && Math.abs(n.t - b * ch.spb) < 1e-9, w + ': note t == timeline time ' + JSON.stringify([n.lane, grid13(n), n.t, b]));
      if (Math.abs(n.t - grid13(n) * ch.spb) > 1e-9) moved++;
    });
    ok(moved > 0, w + ': the off-beats swing');
    const straight = GA.gig.chart(song13(full13(g)), { thumbs: false, doubles: false });
    eq(ch.notes.map(n => [n.lane, n.section, n.entry, n.bar, n.step, !!n.free]), straight.notes.map(n => [n.lane, n.section, n.entry, n.bar, n.step, !!n.free]).sort(() => 0), w + ': same notes, same grid');
    eq([ch.fills, ch.sections, ch.duration], [straight.fills, straight.sections, straight.duration], w + ': windows, sections, length never move');
    const ex = GA.gig.chart(song13(p), { extras: GA.RNG(4), thumbs: false, doubles: false });
    ex.notes.filter(n => n.extra).forEach(n => ok(Math.abs(n.t - GA.songs.swingBeat(grid13(n), sw) * ch.spb) < 1e-9, w + ': extras swing too'));
  }
});

test('v1.3 neutral fields chart exactly as 1.2 (drum chart x difficulties, seat charts x seats); swing 0 = straight', () => {
  for (const g of CA.GENRES) {
    const p = full13(g), q = JSON.parse(JSON.stringify(p)), ch = {};
    q.mood = GA.songs.nativeMood(g); q.swing = 0;
    // v1.3 review (Q4): break sections too (chordsOf reads home on their breakdown bars); the drum chart is exact; a seat chart is
    // exact except the breakdown section's bar 4, where the walk's lead-in may aim at the chips' home (same notes, same times).
    CA.SECTIONS.forEach(n => { ch[n] = GA.songs.chordsOf(q, n, g); });
    q.chords = ch;
    brk13(g).forEach(n => { const R = GA.songs.genre(g).backing.roles[n]; R.forEach((r, i) => { if (r === 'break') eq(ch[n][i], 0, g + ' ' + n + ' bar ' + (i + 1) + ' reads home'); }); });
    const lastBrk = n => brk13(g).indexOf(n.section) >= 0 && n.bar === CA.BARS_PER_SECTION - 1;
    const exact = c => JSON.stringify(Object.assign({}, c, { notes: c.notes.filter(n => !lastBrk(n)) }));
    const shape = c => JSON.stringify(c.notes.filter(lastBrk).map(n => [n.t, n.section, n.entry, n.bar, n.step, n.kind, n.len]));
    for (const d of ['easy', 'normal', 'hard', 'expert']) {
      eq(JSON.stringify(GA.gig.chart(song13(q), { difficulty: d, extras: GA.RNG(3) })), JSON.stringify(GA.gig.chart(song13(p), { difficulty: d, extras: GA.RNG(3) })), g + ' drums ' + d);
      for (const seat of ['bass', 'rhythm', 'lead']) {
        const o = { seat, genre: g, difficulty: d, lanes: 5, runs: true }, cq = GA.gig.chart(song13(q), o), cp = GA.gig.chart(song13(p), o);
        eq(exact(cq), exact(cp), g + ' ' + seat + ' ' + d);
        eq(shape(cq), shape(cp), g + ' ' + seat + ' ' + d + ': the breakdown section\'s last bar keeps its notes');
      }
    }
  }
});

test('v1.3 fills: extras skip a section with a bar-4 fill, free windows stay free; toNotes brings the fill into the drum chart', () => {
  for (const g of CA.GENRES) {
    const p = full13(g), fill = ['x...x...x...x...', '....x.x.x.xxxxxx', '................', 'x...............'].slice(0, p.lanes);
    const q = JSON.parse(JSON.stringify(p)); q.fillBars = { verse: fill, bridge: fill };
    let inVerse = 0, total = 0;
    for (let i = 1; i <= 40; i++) {
      const ex = GA.gig.chart(song13(q), { extras: GA.RNG(i) });
      ex.notes.filter(n => n.extra).forEach(n => { total++; if (n.section === 'verse') inVerse++; });
    }
    let base = 0; for (let i = 1; i <= 40; i++) base += GA.gig.chart(song13(p), { extras: GA.RNG(i) }).extras;
    ok(inVerse === 0 && (total > 0 || base === 0), g + ': extras only where no fill sits ' + total + '/' + inVerse + ' (straight ' + base + ')');
    const a = GA.gig.chart(song13(p)), b = GA.gig.chart(song13(q));
    eq(b.fills, a.fills, g + ': the free windows never move');
    ok(b.notes.filter(n => n.section === 'bridge' && n.bar === 3).every(n => n.free), g + ': a bridge fill bar is still a free window');
    if (fillsInNotes) {
      const tl = GA.audio.timeline(q, { genre: g, songId: 'v13', backing: false, vocals: false }), ch = GA.gig.chart(song13(q), { thumbs: false, doubles: false });
      eq(ch.notes.map(n => n.lane + '@' + grid13(n)).sort(), tl.events.filter(e => e.kind === 'drum').map(e => e.lane + '@' + e.beat).sort(), g + ': the drum chart has the fill bar the band plays');
    }
  }
  if (!fillsInNotes) console.log('  (v1.3 fills: toNotes has no bar-4 fills yet: Lane S S3; the chart = timeline check runs once it lands)');
});

test('v1.3 seat charts: swing keeps every note on its grid step (where() reads e.g), t = the swung time; Q1 lanes = the pitch shape', () => {
  for (const g of CA.GENRES) for (const seat of ['bass', 'rhythm', 'lead']) {
    const p = full13(g), q = JSON.parse(JSON.stringify(p)); q.swing = 4;
    const o = { seat, genre: g, difficulty: 'expert', lanes: 6, thumbs: false }, a = GA.gig.chart(song13(p), o), b = GA.gig.chart(song13(q), o), w = g + '/' + seat;
    const cnt = c => c.notes.length + c.auto.length + c.notes.concat(c.auto).reduce((t, n) => t + (n.with ? n.with.length : 0), 0);
    eq(cnt(b), cnt(a), w + ': every event still charts');
    let moved = 0;
    b.notes.concat(b.auto).forEach(n => {
      ok(Math.abs(n.t - GA.songs.swingBeat(grid13(n), 4) * b.spb) < 1e-9, w + ': t = swingBeat(grid) ' + JSON.stringify([n.entry, n.bar, n.step, n.t]));
      if (grid13(n) % 1) moved++;
    });
    ok(moved > 0 || !a.notes.concat(a.auto).some(n => grid13(n) % 1), w + ': off-beat notes swing');
    eq(b.notes.map(n => n.li).length, b.notes.length, w + ': lanes');
  }
});

test('v1.3 Scratch + singles on the highway: dead copies through, root lane, never a run or a chord; singles never chord on Hard+', () => {
  const blank = n => Array(n).fill(E13);
  for (const g of CA.GENRES) {
    const p = full13(g, 200); p.arrangement = ['verse', 'chorus'];
    const rows = blank(6); rows[0] = 'x.......x.......'; rows[5] = '..xxxx....xxxx..'; rows[2] = '................'; rows[3] = '................x'.slice(0, 16);
    const r2 = blank(6); r2[2] = 'x.......x.......'; r2[3] = '....x.......x...'; r2[4] = '..x...x...x...x.';   // singles only, on downbeats too
    p.part = { seat: 'rhythm', v: 2, sections: { verse: { prog: 0, rows }, chorus: { prog: 0, rows: r2 } } };
    for (const d of ['hard', 'expert']) for (const runs of [false, true]) {
      const c = GA.gig.chart(song13(p), { seat: 'rhythm', genre: g, difficulty: d, lanes: 5, runs, thumbs: false }), all = c.notes.concat(c.auto), w = g + ' ' + d + (runs ? ' runs' : '');
      const dead = all.filter(n => n.dead), chug = all.filter(n => n.section === 'verse' && !n.dead && n.step % 8 === 0);
      ok(dead.length >= 16, w + ': Scratch notes carry dead ' + dead.length);
      ok(dead.every(n => n.mute && chug.some(x => x.entry === n.entry && x.midi === n.midi && x.li === n.li)), w + ': dead at the root, on the root lane');
      ok(c.notes.filter(n => n.dead).every(n => !n.run && !n.chord), w + ': a dead strum is never a run or a chord');
      ok(c.notes.filter(n => n.run).every(n => n.seq.every(x => x[1] === n.midi)) && !c.notes.some(n => n.run && n.dead), w + ': runs never swallow Scratch');
      ok(c.notes.filter(n => n.section === 'chorus').every(n => !n.chord), w + ': singles never chord');
    }
  }
});

test('v1.3 perfect bot = 100 % on swung songs with fills + Scratch (drum seat and every string seat)', () => {
  for (const g of CA.GENRES) for (const seat of CA.SEATS) {
    const s = GA.career.newCareer({ seed: 5, bandId: BANDS13[g], seat, player: { name: 'Swing' } }); s.gig = null;
    s.songs.forEach((x, i) => { x.pattern.swing = 1 + (i % 4); x.pattern.fillBars = { chorus: x.pattern.sections.verse.slice() };
      if (seat === 'rhythm') x.pattern.part = { seat: 'rhythm', v: 2, sections: { verse: { prog: 0, rows: ['x.......x.......', E13, '....x...........', E13, E13, '..x.....xx....xx'] } } }; });
    for (const d of ['normal', 'expert']) {
      const r = GA.gig.botPlay(GA.gig.session(s, GA.gig.makeGig(s, 'legion_63', 'book'), null, { emit: false, difficulty: d }), { accuracy: 1, jitterMs: 0 }, GA.RNG(2));
      ok(r.accuracy === 1 && r.miss === 0, g + '/' + seat + '/' + d + ': perfect bot ' + r.accuracy + ' miss ' + r.miss);
    }
  }
});

// ---- v1.3.1 "Simulate" (plan_1.3.1 §1.1 / §3, Lane G): a regular gig played headlessly at your own recent average.
// GA (30_audio's pure timeline) so the string seats chart their own parts, like the browser.
const simCareer = (seat, seed, bandId) => { const s = GA.career.newCareer({ seed: seed || 7, bandId: bandId || 'hail_damage', seat: seat || 'drums', player: { name: 'Sim' } });
  s.phase = 'gig'; s.gig = GA.gig.makeGig(s, 'legion_63', 'book'); return s; };
const logOf = (seat, diff, accs, ps) => accs.map((acc, i) => ({ acc, ps: ps == null ? 0.8 : ps, seat, diff, wk: i + 1 }));
const simGig = (s, diff, set) => { const S = GA.gig.session(s, s.gig, set || null, { emit: false, difficulty: diff || 'easy' }); return GA.gig.simShow(S, GA.gig.simBot(s, S.difficulty)); };

test('v1.3.1 canSimulate: a booked regular gig yes; every story show, a pending same-night / final, the lesson gig, off-phase no', () => {
  const G = GA.gig, s = simCareer();
  eq([G.canSimulate(s), G.canSimulate(s, s.gig), G.simReason(s)], [true, true, null]);
  for (const kind of ['botb', 'festival', 'final']) { const t = simCareer(); t.gig.showdown = { kind, id: 'x' }; eq([G.canSimulate(t), G.simReason(t)], [false, 'showdown'], kind); }
  const f = simCareer(); f.gig.festival = true; eq([G.canSimulate(f), G.simReason(f)], [false, 'festival'], 'tour festival slot');
  for (const kind of ['sameNight', 'final']) {
    const p = simCareer(); GA.rival.get(p).pending = { kind, week: p.totalWeek, id: 'p', status: 'set' };
    eq([G.canSimulate(p), G.simReason(p)], [false, 'rival'], 'pending ' + kind);
    GA.rival.get(p).pending.week = p.totalWeek - 1; ok(G.canSimulate(p), 'last week\'s pending is gone: ' + kind);
  }
  // review fix: a rival entry that does not ride on your regular gig never blocks it (owner A2: any regular gig)
  for (const [kind, status] of [['stolenSlot', 'done'], ['stolenSlot', 'set'], ['botb', 'passed'], ['botb', 'offered'], ['festival', 'listed'], ['poach', 'card'], ['poach', 'done'], ['sameNight', 'done']]) {
    const p = simCareer(); GA.rival.get(p).pending = { kind, week: p.totalWeek, id: 'p', status };
    eq([G.canSimulate(p), G.simReason(p)], [true, null], 'regular gig with a ' + kind + '/' + status + ' entry this week');
  }
  const off = simCareer(); off.phase = 'plan'; eq(G.simReason(off), 'phase');
  const none = simCareer(); none.gig = null; eq(G.simReason(none), 'phase');
  const other = simCareer(); eq(G.simReason(other, GA.gig.makeGig(other, 'gopher_hole', 'book')), 'gig');
  const les = simCareer(); les.tutorial = { on: true, done: {}, past4: false }; les.stats.gigs = 0; eq(G.simReason(les), 'lesson');
  les.stats.gigs = 1; ok(G.canSimulate(les), 'the lessons run, but this is not the first gig');
  les.tutorial.on = false; les.stats.gigs = 0; ok(G.canSimulate(les), 'lessons off: the first gig can be simulated');
});

test('v1.3.1 canSimulate (review fix): real weeks: a passed BotB, an unbooked festival, a stolen slot, a poach card leave the regular gig simulable; a same-night blocks', () => {
  for (const kind of ['botb', 'festival', 'stolenSlot', 'poach', 'sameNight']) {
    const s = GA.career.newCareer({ seed: 606, player: { name: 'Pat' } });
    GA.career.startWeek(s); GA.career.setPlan(s, ['rest', 'rest', 'rest']); GA.career.runWeek(s, { autoGig: true }); GA.career.endWeek(s);
    Object.assign(s, { gig: null, fans: 800, buzz: 30, fund: 3000, protected: false, era: 'local', totalWeek: 40, year: 2, week: 16, weekStart: null });
    if (s.tutorial) s.tutorial.on = false;
    GA.career.startWeek(s); if (s.card && !s.card.resolved) GA.career.resolveCard(s, 0);
    GA.rival.schedule(s, kind, kind === 'poach' ? s.members.find(m => !m.isPlayer).id : undefined);
    if (s.card && !s.card.resolved) GA.career.resolveCard(s, 0);
    if (kind === 'botb') ok(GA.rival.pass(s), 'pass the battle');
    GA.career.pickListing(s, s.listings.find(l => !l.showdown && !l.festival).id); GA.career.setPlan(s, ['book', 'rest', 'rest']); GA.career.runWeek(s);
    ok(s.phase === 'gig' && !s.gig.showdown && GA.rival.pending(s), kind + ': a regular gig booked in a rival week');
    if (kind === 'sameNight') { eq(GA.gig.simReason(s), 'rival', 'same-night rides on your gig'); continue; }
    eq(GA.gig.simReason(s), null, kind + '/' + GA.rival.pending(s).status + ': simulable');
    const S = GA.gig.session(s, s.gig, null, { emit: false, difficulty: 'easy' }), n = (s.showdowns || []).length;
    GA.career.finishGig(s, GA.gig.simShow(S, GA.gig.simBot(s, S.difficulty)));
    ok(s.phase === 'wrap' && s.lastGig.simulated && !s.lastGig.showdown && (s.showdowns || []).length === n, kind + ': applied as a regular gig, no showdown');
  }
});

test('v1.3.1 simBot: the band\'s level with < 2 played gigs of this seat, your own average with >= 2; same difficulty first; pure', () => {
  const G = GA.gig, s = simCareer('drums');
  const b0 = G.simBot(s, 'easy'); eq([b0.from, b0.n, b0.accuracy, b0.jitterMs], ['band', 0, 0.75, 65]);
  ok(b0.acc > 0.6 && b0.acc < 0.75 && b0.ps > 0 && b0.ps < 1, 'band: the expected hit share ' + JSON.stringify(b0));
  s.drumSkill = 80; const b1 = G.simBot(s, 'hard'); eq([b1.from, b1.accuracy, b1.jitterMs], ['band', 0.93, 25]);
  s.drumSkill = 10;
  s.playLog = logOf('drums', 'easy', [0.9]); eq([G.simBot(s, 'easy').from, G.simBot(s, 'easy').n], ['band', 1], 'one played gig is not an average yet');
  s.playLog = logOf('bass', 'easy', [0.9, 0.9, 0.9]).concat(logOf('drums', 'easy', [0.5])); eq(G.simBot(s, 'easy').from, 'band', 'another seat\'s gigs never count');
  s.playLog = logOf('drums', 'easy', [0.7, 0.9]); const o = G.simBot(s, 'easy');
  eq([o.from, o.n, o.acc, o.ps], ['own', 2, 0.8, 0.8]); ok(o.accuracy >= 0.8 && o.accuracy <= 1 && o.jitterMs >= 5 && o.jitterMs <= 150, 'own bot ' + JSON.stringify(o));
  s.playLog = logOf('drums', 'easy', [0.9, 0.9]).concat(logOf('drums', 'hard', [0.6, 0.6]));
  eq([G.simBot(s, 'hard').acc, G.simBot(s, 'hard').n], [0.6, 2], 'Hard: your Hard gigs'); eq([G.simBot(s, 'easy').acc, G.simBot(s, 'easy').n], [0.9, 2], 'Easy: your Easy gigs');
  eq([G.simBot(s, 'normal').acc, G.simBot(s, 'normal').n], [0.75, 4], 'no Normal gigs yet: every difficulty');
  const json = JSON.stringify(s); G.simBot(s, 'expert'); G.simBot(s, 'easy'); eq(JSON.stringify(s), json, 'pure');
  s.playLog = logOf('drums', 'hard', [0.95, 0.95], 0.5); const w = G.simBot(s, 'hard');
  ok(w.accuracy <= 1 && w.ps === 0.5, 'a wide-but-steady player stays reachable ' + JSON.stringify(w));
});

test('v1.3.1 simulate: your average (logs 0.6 / 0.8 / 0.95 x ps 0.5 / 0.8) -> the gig lands within 0.05, easy + hard, drums + bass', () => {
  const bad = [];
  for (const seat of ['drums', 'bass']) for (const diff of ['easy', 'hard']) for (const A of [0.6, 0.8, 0.95]) for (const P of [0.5, 0.8])
    for (const [band, seed] of [['hail_damage', 3], ['grid_road_ramblers', 7]]) {
      const s = simCareer(seat, seed, band); s.playLog = logOf(seat, diff, [A, A, A], P);
      const r = simGig(s, diff);
      if (!(Math.abs(r.accuracy - A) <= 0.05)) bad.push([seat, diff, A, P, band, r.accuracy].join('/'));
      if (!(r.simulated && r.sim.from === 'own' && r.sim.n === 3 && r.sim.acc === A && r.difficulty === diff)) bad.push('flags ' + JSON.stringify(r.sim));
    }
  eq(bad, [], 'off by more than 0.05');
  const lo = simCareer('drums'); lo.playLog = logOf('drums', 'easy', [0.55, 0.55]); const hi = simCareer('drums'); hi.playLog = logOf('drums', 'easy', [0.97, 0.97], 0.9);
  const rl = simGig(lo), rh = simGig(hi);
  ok(rh.score > rl.score && GA.contracts.GRADES.indexOf(rh.grade) <= GA.contracts.GRADES.indexOf(rl.grade), 'a better average plays a better show ' + rl.grade + rl.score + ' < ' + rh.grade + rh.score);
});

test('v1.3.1 simulate: deterministic; a reload between songs finishes the same show; the band level when you have not played', () => {
  const mk = () => { const s = simCareer('bass', 9); s.playLog = logOf('bass', 'hard', [0.7, 0.85, 0.8], 0.6); return s; };
  const a = mk(), b = mk(), ra = simGig(a, 'hard'), rb = simGig(b, 'hard');
  eq(JSON.stringify(ra), JSON.stringify(rb)); eq(JSON.stringify(a), JSON.stringify(b));
  const c = mk(), S = GA.gig.session(c, c.gig, null, { emit: false, difficulty: 'hard' }), bot = GA.gig.simBot(c, 'hard');
  GA.gig.simSong(S, bot); eq([c.liveGig.index, c.liveGig.sim.from, c.liveGig.sim.acc], [1, 'own', bot.acc], 'live.sim marks it');
  const saved = GA.save.migrate(JSON.parse(JSON.stringify(c)));   // "reload": the saved liveGig resumes
  const S2 = GA.gig.session(saved, saved.gig, null, { emit: false });
  const rc = GA.gig.simShow(S2, saved.liveGig.sim);
  eq(JSON.stringify(rc), JSON.stringify(ra), 'resumed = uninterrupted');
  const n = simCareer('drums', 4); n.drumSkill = 45; const rn = simGig(n, 'normal');
  ok(rn.simulated && rn.sim.from === 'band' && rn.sim.n === 0 && Math.abs(rn.accuracy - rn.sim.acc) <= 0.06, 'band level ' + JSON.stringify(rn.sim) + ' ' + rn.accuracy);
});

test('v1.3.1 simulate: everything counts (applied through career.finishGig exactly like the same result played); the average never moves', () => {
  const s = simCareer('drums', 12); s.playLog = logOf('drums', 'easy', [0.8, 0.85]);
  const S = GA.gig.session(s, s.gig, null, { emit: false, difficulty: 'easy' }), r = GA.gig.simShow(S, GA.gig.simBot(s, 'easy'));
  const twin = JSON.parse(JSON.stringify(s)), rp = JSON.parse(JSON.stringify(r)); delete rp.simulated; delete rp.sim;   // the same show, played
  delete twin.liveGig.sim;
  const done = []; const off = GA.on('gig:done', p => done.push(p.result)); let ach = 0; const g0 = GA.achieve.gig; GA.achieve.gig = function () { ach++; return g0.apply(this, arguments); };
  const fund = s.fund, fans = s.fans, buzz = s.buzz, gigs = s.stats.gigs, log = JSON.stringify(s.playLog);
  try { GA.career.finishGig(s, r); GA.career.finishGig(twin, rp); } finally { off(); GA.achieve.gig = g0; }
  eq([s.phase, s.gig, s.liveGig, s.stats.gigs, s.lastGig === r, done.length, done[0] === r, ach], ['wrap', null, null, gigs + 1, true, 2, true, 2]);
  ok(r.deltas && s.fans !== fans && s.fund !== fund && s.buzz !== buzz, 'pay, fans and buzz landed ' + JSON.stringify(r.deltas));
  eq(JSON.stringify(s.playLog), log, 'a simulated gig never joins the average');
  const strip = x => { const t = JSON.parse(JSON.stringify(x)); delete t.lastGig.simulated; delete t.lastGig.sim; if (t.lastWeek && t.lastWeek.gig) { delete t.lastWeek.gig.simulated; delete t.lastWeek.gig.sim; } delete t.playLog; return JSON.stringify(t); };
  eq(strip(s), strip(twin), 'the same state as the same result played (pay, fans, buzz, rep, recap, legacy, achievements)');
  eq(twin.playLog.length, 2 + 1, 'the played twin joins the average');
});

test('v1.3.1 playLog: a played live gig appends one entry (the 6th drops the oldest); a played result gains no field; 1.3.0 fingerprint', () => {
  const s = simCareer('drums', 21); ok(!('playLog' in s), 'no key before the first played gig');
  const S = GA.gig.session(s, s.gig, null, { emit: false, difficulty: 'normal' }), r = GA.gig.botPlay(S, AVG, GA.RNG(3));
  ok(!('simulated' in r) && !('sim' in r), 'a played GIG_RESULT has no new field');
  GA.career.finishGig(s, r);
  const hit = r.perfect + r.good;
  eq(s.playLog, [{ acc: r.accuracy, ps: Math.round(r.perfect / hit * 1000) / 1000, seat: 'drums', diff: 'normal', wk: s.totalWeek }]);
  eq(GA.save.playLog(s.playLog), s.playLog, 'stored as the save sanitizer keeps it');
  for (let i = 0; i < 5; i++) { s.phase = 'gig'; s.gig = GA.gig.makeGig(s, 'legion_63', 'book'); s.totalWeek++;
    GA.career.finishGig(s, GA.gig.botPlay(GA.gig.session(s, s.gig, null, { emit: false, difficulty: 'hard' }), AVG, GA.RNG(10 + i))); }
  eq([s.playLog.length, s.playLog[0].diff, s.playLog[4].wk], [GA.contracts.PLAY_LOG_MAX, 'hard', s.totalWeek], 'the last 5 played, newest last');
  const q = simCareer('drums', 22); GA.gig.autoResolve(q, GA.RNG(1)); ok(!('playLog' in q), 'the v0.1 auto-resolve (bots, balance) is not a played gig');
  // played gigs are byte-identical to 1.3.0 (fingerprint computed with the 1.3.0 22_sim_gig.js; playLog aside)
  const fp = [];
  for (const seat of ['drums', 'bass']) for (const d of ['easy', 'hard']) {
    const t = GA.career.newCareer({ seed: 11, bandId: 'hail_damage', seat, player: { name: 'Fp' } }); t.phase = 'gig'; t.gig = GA.gig.makeGig(t, 'legion_63', 'book');
    const rr = GA.gig.botPlay(GA.gig.session(t, t.gig, null, { emit: false, difficulty: d }), { accuracy: 0.82, jitterMs: 55 }, GA.RNG(5));
    GA.career.finishGig(t, rr); const u = JSON.parse(JSON.stringify(t)); delete u.playLog;
    fp.push(seat + '/' + d + ':' + GA.hashSeed(JSON.stringify(rr) + '|' + JSON.stringify(u)));
  }
  eq(fp.join(' '), 'drums/easy:1042753566 drums/hard:74364012 bass/easy:1477014130 bass/hard:222861556');
});

done('sim_gig');
