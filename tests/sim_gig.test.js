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
    eq(ch.notes.length, want, song.id + ' notes'); eq(ch.notes.length, GG.songs.toNotes(song).length);
    eq(ch.fills.length, p.arrangement.filter(x => x === 'bridge').length || 1, 'one freestyle window per bridge');
    eq(ch.total, ch.notes.filter(n => !n.free).length);
    ok(ch.notes.every((n, i) => i === 0 || ch.notes[i - 1].t <= n.t) && ch.notes.every(n => L[n.li] === n.lane && n.j === 0), 'sorted, lanes');
    ok(Math.abs(ch.duration - GG.songs.seconds(p)) < 1e-9 && ch.notes[ch.notes.length - 1].t < ch.duration, 'duration');
    ch.notes.filter(n => n.free).forEach(n => ok(n.bar === bars - 1, 'free notes sit in the last bar'));
    const solo = GG.gig.chart(song, { solo: true });
    ok(solo.notes.filter(n => n.section === 'bridge' && !n.free).every(n => n.step % 4 === 0), 'solo: quarter notes only');
    ok(solo.total <= ch.total && solo.solos.length === ch.fills.length, 'solo eases');
    const ex = GG.gig.chart(song, { extras: GG.RNG(4) }), extra = ex.notes.filter(n => n.extra);
    eq(extra.length, ex.extras); eq(ex.notes.length, ch.notes.length + ex.extras);
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
  eq([a.liveGig, a.gig, a.stats.gigs, a.fund - fund, a.fans - fans], [null, null, 1, ra.pay - ra.gas, ra.fans]);
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

done('sim_gig');
