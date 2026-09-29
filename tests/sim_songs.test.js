// Songs sim tests (v0.2): rating, generation, validation, staleness/classics, the Write block, the v1->v2 migration.
const fs = require('fs'), path = require('path');
const load = require('./_load');
const { test, ok, eq, done } = require('./_t');

const GG = load({ localStorage: load.fakeStorage() });
GG.content.cards = [];
const S = GG.songs, C = GG.contracts, GENRES = C.GENRES;
const E = '................';
const pat = (verse, chorus, bridge, bpm, arr) => ({ bpm: bpm || 150, lanes: 4, arrangement: arr || S.ARRANGEMENTS.classic.slice(),
  sections: { verse: verse.slice(), chorus: (chorus || verse).slice(), bridge: (bridge || verse).slice() } });
const hits = p => p.arrangement.reduce((t, s) => t + p.sections[s].join('').split('x').length - 1, 0);
function noise(rng) { return [0, 1, 2, 3].map(() => Array.from({ length: 16 }, () => rng.chance(0.5) ? 'x' : '.').join('')); }

test('content/genres.js is well-formed', () => {
  const G = GG.content.genres, bar = b => Array.isArray(b) && b.length === 4 && b.every(x => /^[x.]{16}$/.test(x));
  eq(Object.keys(G).sort(), GENRES.slice().sort());
  for (const g of GENRES) {
    const x = G[g];
    ok(x.tempo.length === 3 && x.tempo[0] < x.tempo[1] && x.tempo[2] >= x.tempo[0] && x.tempo[2] <= x.tempo[1], g + ' tempo');
    ok(x.jamTempo[0] >= x.tempo[0] && x.jamTempo[1] <= x.tempo[1], g + ' jamTempo inside the range');
    ok(x.groove.every(r => r.w > 0 && r.tip && (r.any || (r.f && r.lo <= r.hi && r.soft > 0))), g + ' rules');
    C.SECTIONS.forEach(sec => ok(x.parts[sec].length >= 2 && x.parts[sec].every(bar), g + ' parts.' + sec));
    ['signature', 'starter'].forEach(k => ok(C.SECTIONS.every(sec => bar(x[k].sections[sec])) && S.arrangementId(x[k]), g + ' ' + k));
    ok(x.backing.styles.length && C.SECTIONS.every(sec => x.backing.progressions[sec].every(p => p.length === 4)), g + ' backing');
    ok(['great', 'good', 'meh', 'bad'].every(k => typeof x.reactions[k] === 'string'), g + ' reactions');
  }
  eq(G.metal.backing.styles.map(s => s[1]), ['doom', 'chug', 'tremolo'], 'owner call: metal backing, tempo decides');
});

test('rate: deterministic, pure, shape', () => {
  const p = S.signature('metal'), a = S.rate(p, 'metal'), b = S.rate(JSON.parse(JSON.stringify(p)), 'metal');
  eq(a, b, 'same pattern, same numbers');
  eq(S.rate(p, 'metal'), load({ localStorage: load.fakeStorage() }).songs.rate(p, 'metal'), 'same numbers in a fresh load');
  ok(['groove', 'hook', 'difficulty'].every(k => Number.isInteger(a[k]) && a[k] >= 0 && a[k] <= 100), 'ints 0..100');
  ok(Array.isArray(a.tips) && a.tips.length <= 2 && a.notes === hits(p) * C.BARS_PER_SECTION, 'tips + notes');
  eq(JSON.stringify(p), JSON.stringify(S.signature('metal')), 'rate does not mutate the pattern');
});

test('groove: each genre signature fits its own genre (>= 80) and clearly not the others', () => {
  const table = {};
  for (const g of GENRES) {
    const p = S.signature(g);
    eq(S.validate(p, { lanes: 4, doubleKick: false }), [], g + ' signature is valid without the pedal');
    table[g] = GENRES.map(h => S.rate(p, h).groove);
    const own = S.rate(p, g).groove;
    ok(own >= 80, g + ' own groove ' + own);
    GENRES.filter(h => h !== g).forEach(h => ok(S.rate(p, h).groove <= own - 15, g + ' signature rated as ' + h + ': ' + S.rate(p, h).groove + ' vs ' + own));
  }
});

test('groove: empty and random patterns score low; tips explain', () => {
  const empty = pat([E, E, E, E]);
  for (const g of GENRES) { const r = S.rate(empty, g); eq([r.groove, r.hook, r.difficulty, r.notes], [0, 0, 0, 0], g + ' empty'); ok(r.tips.length >= 1, 'empty has a tip'); }
  const rng = GG.RNG(99);
  for (const g of GENRES) {
    let sum = 0, max = 0;
    for (let i = 0; i < 40; i++) { const r = S.rate(pat(noise(rng), noise(rng), noise(rng)), g).groove; sum += r; max = Math.max(max, r); }
    ok(sum / 40 < 35 && max < 55, g + ' random avg ' + (sum / 40).toFixed(1) + ' max ' + max);
  }
  const st = S.rate(S.starter('metal'), 'metal');
  ok(st.groove >= 50 && st.groove < 80 && /kick/i.test(st.tips.join(' ')), 'metal starter is a teaching beat: ' + st.groove + ' ' + st.tips);
});

test('hook: identical chorus < contrasting chorus > unrelated noise', () => {
  const v = ['x.x.x.x.x.x.x.x.', '....x.......x...', 'x.x.x.x.x.x.x.x.', E];
  const good = ['x.x.x.x.x.x.x.x.', '....x.......x...', E, 'x...x...x...x...'];
  const same = S.rate(pat(v, v), 'metal').hook, contrast = S.rate(pat(v, good), 'metal').hook;
  const rng = GG.RNG(7); let nz = 0;
  for (let i = 0; i < 20; i++) nz = Math.max(nz, S.rate(pat(v, noise(rng)), 'metal').hook);
  ok(same < contrast - 25 && nz < contrast - 15, 'curve: same ' + same + ' contrast ' + contrast + ' noise(max) ' + nz);
  ok(S.rate(pat(v, v), 'metal').tips.some(t => /copy of the verse/.test(t)), 'tip: chorus is a copy');
  const noCrash = S.rate(pat(v, ['x.x.x.x.x.x.x.x.', '....x.......x...', E, '....x...x...x...']), 'metal').hook;
  ok(noCrash < contrast, 'a crash on the chorus downbeat helps ' + noCrash + ' < ' + contrast);
});

test('difficulty: monotonic in notes and bpm', () => {
  let p = pat([E, E, E, E]), last = -1;
  const order = [[0, 0], [1, 4], [1, 12], [2, 0], [2, 2], [2, 4], [0, 8], [3, 0], [0, 3], [2, 7], [1, 9], [0, 14]];
  for (const [l, s] of order) {
    for (const sec of C.SECTIONS) p.sections[sec][l] = S.setHit(p.sections[sec][l], s, true);
    const d = S.rate(p, 'metal').difficulty; ok(d >= last, 'more notes never easier: ' + d + ' after ' + last); last = d;
  }
  ok(last > 20, 'dense enough to be hard: ' + last);
  let prev = -1;
  for (const bpm of [60, 90, 120, 150, 180, 210, 240]) { const d = S.rate(Object.assign({}, p, { bpm }), 'metal').difficulty; ok(d > prev, 'faster is harder at ' + bpm); prev = d; }
});

test('kick adjacency: the rule, validate, sanitize, doubleKick', () => {
  const noPedal = { lanes: 4, doubleKick: false }, pedal = { lanes: 4, doubleKick: true };
  const p = pat(['xx..x...x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', E]);
  ok(S.validate(p, noPedal).some(e => /double-kick/.test(e)), 'validate flags back-to-back kicks');
  eq(S.validate(p, pedal), [], 'fine with the pedal');
  eq(S.sanitize(p, noPedal).sections.verse[0], 'x...x...x.......', 'sanitize keeps the earlier hit');
  eq(S.sanitize(p, pedal).sections.verse[0], 'xx..x...x.......', 'the pedal keeps both');
  ok(S.kickBlocked('x...............', 1, noPedal) && !S.kickBlocked('x...............', 2, noPedal) && !S.kickBlocked('x...............', 1, pedal), 'kickBlocked');
  const dk = pat(['xxxxxxxxxxxxxxxx', '....x.......x...', 'x.x.x.x.x.x.x.x.', 'x...............']);
  ok(S.rate(dk, 'metal', pedal).groove > S.rate(dk, 'metal', noPedal).groove, 'without the pedal the band only plays one foot of 16th kicks');
  ok(S.rate(S.signature('metal'), 'metal', pedal).tips.some(t => /kick/i.test(t)), 'with a pedal, metal wants 16th kicks');
  eq(S.validate({ bpm: 120, lanes: 4, arrangement: ['verse', 'solo'], sections: {} }, noPedal).length > 0, true, 'garbage is invalid');
});

test('generate / starter / similarity / toNotes', () => {
  for (const g of GENRES) {
    for (let i = 0; i < 25; i++) {
      const p = S.generate(g, GG.RNG(500 + i));
      eq(S.validate(p, { lanes: 4, doubleKick: false }), [], g + ' jam valid');
      const G = GG.content.genres[g];
      ok(p.bpm >= G.tempo[0] && p.bpm <= G.tempo[1] && S.arrangementId(p), g + ' tempo + preset');
    }
    eq(S.generate(g, GG.RNG(42)), S.generate(g, GG.RNG(42)), g + ' deterministic');
    let sum = 0; for (let i = 0; i < 30; i++) sum += S.rate(S.generate(g, GG.RNG(900 + i)), g).groove;
    ok(sum / 30 >= 75, g + ' jams are decent: ' + (sum / 30).toFixed(1));
  }
  eq(S.generate('metal', GG.RNG(3), { gear: { lanes: 6 } }).sections.verse.length, 6, '6-lane kit');
  eq(S.starter('metal'), S.starter('metal'), 'starter is fixed');
  const a = S.signature('metal'), b = S.signature('country');
  eq(S.similarity(a, a), 1); ok(S.similarity(a, b) < 0.4 && S.similarity(a, b) === S.similarity(b, a), 'similarity ' + S.similarity(a, b));
  for (const g of GENRES) {
    const p = S.signature(g), notes = S.toNotes(p);
    eq(notes.length, hits(p) * C.BARS_PER_SECTION, g + ' toNotes = hits x bars');
    ok(notes.every((n, i) => C.LANES.includes(n.lane) && C.SECTIONS.includes(n.section) && (i === 0 || n.beat >= notes[i - 1].beat)), 'sorted, valid');
    eq(notes[notes.length - 1].beat < S.beats(p), true, 'inside the song');
  }
  const secs = S.seconds(S.signature('metal'));
  ok(secs > 20 && secs < 120, 'a song lasts ' + secs.toFixed(0) + ' s');
});

test('create: craft, band ability and the repeat penalty shape quality', () => {
  const s = GG.career.newCareer({ seed: 8 });
  const great = S.create(s, S.signature('metal'), 'Bon'), poor = S.create(s, pat(['x...............', '........x.......', E, E]), 'Mauvais');
  ok(great.quality > poor.quality + 15, 'craft matters: ' + great.quality + ' vs ' + poor.quality);
  ok(great.rating.groove >= 80 && !great.auto && great.stale === 0 && great.hits === 0 && great.classic === false && great.lastPlayed === null, 'SONG shape');
  const hard = pat(['xxxxxxxxxxxxxxxx', 'x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxxxxxx', 'x.x.x.x.x.x.x.x.'], null, null, 240);
  const weak = GG.career.newCareer({ seed: 8 }), strong = GG.career.newCareer({ seed: 8 });
  strong.members.forEach(m => { m.skill = 95; }); strong.drumSkill = 95;
  ok(S.ability(strong) > S.ability(weak), 'ability grows with skill');
  const E2 = GG.content.economy.songs, keep = E2.overPenalty;
  const hw = S.create(weak, hard, 'Dur', { polish: 10 });
  E2.overPenalty = 0; const hw0 = S.create(GG.career.newCareer({ seed: 8 }), hard, 'Dur', { polish: 10 }); E2.overPenalty = keep;
  ok(hw.rating.difficulty > S.ability(weak) && hw0.quality - hw.quality >= Math.floor((hw.rating.difficulty - S.ability(weak)) * keep),
    'over-hard costs quality: ' + hw.quality + ' vs ' + hw0.quality);
  const pHard = S.create(GG.career.newCareer({ seed: 8 }), hard, 'A', { rng: GG.RNG(1) }).polish;
  const pEasy = S.create(GG.career.newCareer({ seed: 8 }), S.starter('metal'), 'B', { rng: GG.RNG(1) }).polish;
  ok(pHard < pEasy, 'over-hard songs start less polished: ' + pHard + ' < ' + pEasy);
  const r1 = S.create(GG.career.newCareer({ seed: 8 }), S.signature('metal'), 'X', { polish: 10 });
  const r2 = S.create(GG.career.newCareer({ seed: 8 }), S.signature('metal'), 'X', { polish: 10, repeatFactor: 0.6 });
  eq(r1.quality - r2.quality, Math.round(0.4 * GG.content.activities.write.repeatPenalty), 'repeat penalty');
});

test('stale and classic transitions', () => {
  const s = GG.career.newCareer({ seed: 12 }), song = S.create(s, S.signature('metal'), 'Hit', { quality: 60, polish: 60 });
  const E2 = GG.content.economy.songs, base = S.score(song);
  S.played(s, [song.id], 'B');
  eq([song.plays, song.stale, song.hits, song.lastPlayed, song.classic], [1, E2.stalePerPlay, 0, s.totalWeek, false]);
  ok(S.score(song) < base, 'stale songs score less');
  S.weekly(s); eq(song.stale, E2.stalePerPlay, 'played this week: no decay');
  s.totalWeek++; S.weekly(s); eq(song.stale, E2.stalePerPlay - E2.staleDecay, 'a week off freshens it');
  for (let i = 0; i < 20; i++) { s.totalWeek++; S.weekly(s); }
  eq(song.stale, 0, 'fully fresh again');
  let fresh = [];
  for (let i = 1; i <= E2.classicHits; i++) fresh = S.played(s, [song.id], i % 2 ? 'A' : 'S');
  ok(song.classic && fresh.length === 1 && fresh[0] === song && song.hits === E2.classicHits, 'classic after ' + E2.classicHits + ' great gigs');
  const before = song.stale; S.played(s, [song.id], 'C'); eq(song.stale - before, E2.stalePerPlay / 2, 'classics wear slower');
  ok(S.score(song) > song.quality * 0.7 + song.polish * 0.3 - song.stale * E2.staleWeight, 'classic bonus');
  for (let i = 0; i < 20; i++) S.played(s, [song.id], 'D');
  eq(song.stale, 100, 'stale caps at 100');
});

test('Write block: composed songs from pendingSongs, jams otherwise, reactions + event', () => {
  const s = GG.career.newCareer({ seed: 33 }); s.gig = null;
  const mine = Object.assign(S.signature('metal'), { title: 'Mon Premier', titleEn: 'My First' });
  s.pendingSongs = [null, mine];
  const evs = []; const off = GG.on('song:written', p => evs.push(p));
  GG.career.startWeek(s); GG.career.setPlan(s, ['write', 'write', 'rest']);
  const r = GG.career.runWeek(s); off();
  const [a, b] = s.songs.slice(-2);
  ok(a.auto && !b.auto && b.title === 'Mon Premier' && b.titleEn === 'My First', 'null = jam, then your song');
  eq(JSON.stringify(b.pattern), JSON.stringify(S.sanitize(S.signature('metal'), s.gear, 'metal')), 'your pattern, as written');
  eq(s.pendingSongs, [], 'queue consumed'); eq(s.stats.songsWritten, 2);
  eq(evs.length, 2); ok(evs[1].song === b && evs[1].reactions.length >= 1, 'song:written with reactions');
  const d = r.blocks[1].deltas.song;
  ok(d.id === b.id && d.groove === b.rating.groove && d.reactions.some(x => x.who === 'marcel' && x.text.includes('Mon Premier')), 'Marcel names it in the block result');
  ok(b.quality < a.quality + 60 && b.quality > 0, 'quality sane');
  // Reactions follow the song.
  const t = GG.career.newCareer({ seed: 34 }), rng = GG.RNG(1);
  const short = S.create(t, Object.assign(S.signature('metal'), { arrangement: S.ARRANGEMENTS.short.slice() }), 'Court');
  ok(S.reactions(t, short, rng).some(x => x.who === 'dana'), 'no bridge: Dana wants her solo');
  const simple = S.create(t, pat(['x.......x.......', '....x.......x...', 'x...x...x...x...', 'x...............'], null, null, 90), 'Simple');
  ok(S.reactions(t, simple, rng).some(x => x.who === 'jaxon'), 'simple part: Jaxon sneaks in fills');
  const great = S.create(t, S.signature('metal'), 'Grand', { quality: 70 });
  ok(S.reactions(t, great, rng).some(x => x.who === 'kenji' && /^(…|\.|👍|\(.*\))$/u.test(x.text)), 'Kenji nods (without words)');
});

test('v0.1 save fixture migrates to v2: patterns for every song, deterministic, keeps playing', () => {
  const raw = fs.readFileSync(path.join(__dirname, 'fixtures', 'save_v01.json'), 'utf8');
  const rec = JSON.parse(raw);
  eq(rec.state.v, 1, 'fixture is a v0.1 save');
  ok(rec.state.songs.every(x => x.pattern === null) && !rec.state.gear, 'v0.1 shape');
  const m = GG.save.migrate(JSON.parse(raw).state), m2 = GG.save.migrate(JSON.parse(raw).state);
  eq(m.v, C.SAVE_SCHEMA);
  eq(JSON.stringify(m), JSON.stringify(m2), 'deterministic');
  eq(JSON.stringify(GG.save.migrate(JSON.parse(JSON.stringify(m)))), JSON.stringify(m), 'idempotent');
  eq([m.gear, m.pendingSongs, m.draft], [{ lanes: 4, doubleKick: false }, [], null], 'v0.2 defaults');
  m.songs.forEach((x, i) => {
    eq(S.validate(x.pattern, m.gear), [], x.id + ' valid pattern');
    const old = rec.state.songs[i];
    eq([x.quality, x.polish, x.plays, x.title], [old.quality, old.polish, old.plays, old.title], x.id + ' keeps v0.1 numbers');
    eq(x.rating, (r => ({ groove: r.groove, hook: r.hook, difficulty: r.difficulty }))(S.rate(x.pattern, m.genre, m.gear)), x.id + ' rated');
    ok(x.auto && x.stale === 0 && x.classic === false, x.id + ' v0.2 fields');
  });
  eq(m.rng, rec.state.rng, 'the career RNG is untouched');
  // Through the storage path too.
  const store = load.fakeStorage(); const G2 = load({ localStorage: store });
  G2.save.init(store); store.setItem(G2.save.KEYS.slot('2'), raw.trim());
  const back = G2.save.read('2');
  eq(JSON.stringify(back.songs.map(x => x.pattern)), JSON.stringify(m.songs.map(x => x.pattern)), 'save.read migrates the same way');
  const tw = m.totalWeek;
  for (let i = 0; i < 6; i++) GG.career.botWeek(m, 'good');
  eq(m.totalWeek, tw + 6, 'a migrated save keeps playing');
  ok(m.songs.every(x => S.validate(x.pattern, m.gear).length === 0), 'all songs still valid');
});

done('sim_songs');
