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
    eq([x.quality, x.polish, x.plays], [old.quality, old.polish, old.plays], x.id + ' keeps v0.1 numbers');
    eq([x.title, x.titleEn, x.fr], [S.englishFor(old.title), S.englishFor(old.title), undefined], x.id + ' v0.7.2: the French title turns English');
    eq(x.rating, (r => ({ groove: r.groove, hook: r.hook, difficulty: r.difficulty }))(S.rate(x.pattern, m.genre, m.gear)), x.id + ' rated');
    ok(x.auto && x.stale === 0 && x.classic === false, x.id + ' v0.2 fields');
  });
  eq(m.rng, rec.state.rng, 'the career RNG is untouched');
  eq(m.lastGig.songs, rec.state.lastGig.songs.map(t => S.englishFor(t)), 'v0.7.2: last gig setlist follows the renames');
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

// ---- v0.7.2: English titles, Marcel rarely French (owner, 2026-09-30) --------------------------------------------
test('v0.7.2 titles: English by default; Marcel sneaks in a French one ~1 in 8 (seeded, career RNG untouched)', () => {
  const s = GG.career.newCareer({ seed: 41 });
  eq(s.songs.map(x => [x.title, x.titleEn, x.fr]), [['My Lawn, My Tomb', 'My Lawn, My Tomb', undefined],
    ['Dandelions of the Apocalypse (On My Lawn)', 'Dandelions of the Apocalypse (On My Lawn)', undefined]], 'starters are English (titleEn = title)');
  const pool = GG.content.songTitles.metal, byEn = new Map(pool.map(t => [t.en, t])), byFr = new Map(pool.map(t => [t.fr, t]));
  let fr = 0, n = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const c = GG.career.newCareer({ seed });
    for (let k = 0; k < 4; k++) {
      const t = S.pickTitle(c, GG.RNG(seed * 13 + k)), again = S.pickTitle(c, GG.RNG(seed * 13 + k));
      eq(JSON.stringify(again), JSON.stringify(t), 'deterministic for the same career + rng');
      n++;
      if (t.fr) { fr++; ok(byFr.has(t.title) && byFr.get(t.title).en === t.titleEn, 'French pick = fr + its English: ' + t.title); }
      else ok(byEn.has(t.title) && t.titleEn === t.title && !('fr' in t), 'English pick: ' + t.title);
    }
  }
  ok(fr / n > 0.07 && fr / n < 0.19, 'Marcel rarely goes French: ' + fr + '/' + n);
  // One rng draw per pick, as before v0.7.2 (the French roll has its own seed): the career RNG sequence is unchanged.
  const r1 = GG.RNG(99), r2 = GG.RNG(99); S.pickTitle(s, r1); r2.next();
  eq(r1.next(), r2.next(), 'pickTitle draws exactly once');
  // No Marcel, no French.
  const q = GG.career.newCareer({ seed: 42 }); q.members.find(m => m.id === 'marcel').status = 'quit';
  let any = false; for (let k = 0; k < 400; k++) any = any || !!S.pickTitle(q, GG.RNG(k), ['x' + k]).fr;
  ok(!any, 'with Marcel gone every title is English');
  // An entry is taken if either of its titles is: no "The Green Tomb" next to "Le Tombeau Vert".
  const u = GG.career.newCareer({ seed: 43 });
  pool.slice(1).forEach(t => S.create(u, S.signature('metal'), t.en));
  S.create(u, S.signature('metal'), pool[0].fr);
  const next = S.pickTitle(u, GG.RNG(5));
  ok(/ II$/.test(next.title), 'pool used up (Le Tombeau Vert counts for The Green Tomb): sequel ' + next.title);
});

test('v0.7.2 titles: a French song is flagged fr, Marcel insists and a bandmate sighs', () => {
  const s = GG.career.newCareer({ seed: 44 }), L = GG.content.lines.songReactions, pool = GG.content.songTitles.metal;
  let song = null;
  for (let k = 0; k < 400 && !song; k++) {
    const t = GG.career.newCareer({ seed: 1000 + k }), x = S.jam(t, GG.RNG(k));
    if (x.fr) song = { st: t, x };
  }
  ok(song, 'a jam eventually comes out French');
  const { st, x } = song, entry = pool.find(t => t.fr === x.title);
  ok(entry && x.fr === true && x.titleEn === entry.en, 'jam: title = fr, titleEn = en, fr: true (' + x.title + ')');
  const rs = S.reactions(st, x, GG.RNG(3));
  ok(rs[0].who === 'marcel' && L.marcel.nameFr.some(l => rs[0].text.startsWith(l)) && rs[0].text.includes('“' + x.title + '”'), 'Marcel insists: ' + rs[0].text);
  ok(['dana', 'jaxon', 'kenji'].includes(rs[1].who) && L[rs[1].who].frSigh.includes(rs[1].text), 'then someone sighs: ' + rs[1].who + ': ' + rs[1].text);
  eq(JSON.stringify(S.reactions(st, x, GG.RNG(3))), JSON.stringify(rs), 'reactions are deterministic');
  const r1 = GG.RNG(8), r2 = GG.RNG(8); S.reactions(st, x, r1);
  const en = S.create(st, S.signature('metal'), 'Plain English'), r3 = GG.RNG(8); S.reactions(st, en, r3);
  eq(r1.next(), r3.next(), 'the sigh does not draw from the career RNG');
  const er = S.reactions(st, en, GG.RNG(3));
  ok(L.marcel.name.some(l => er[0].text.startsWith(l)) && !er.some(r => Object.values(L).some(p => (p.frSigh || []).includes(r.text))), 'an English song: no insisting, no sighing');
  ok(!('fr' in en) && en.titleEn === en.title, 'English songs carry no fr flag');
  // A queued / typed title that is one of Marcel's French ones counts as French (its English shows as titleEn).
  const typed = S.create(s, S.signature('metal'), 'Trèfle Maudit');
  ok(typed.fr === true && typed.titleEn === 'Cursed Clover', 'typed French title: fr + its English');
  const custom = S.create(s, S.signature('metal'), 'Mon Premier', { titleEn: 'My First' });
  ok(!custom.fr && custom.titleEn === 'My First', 'a French title that is not Marcel\'s stays as typed, unflagged');
  ok(!S.isFrench('My Lawn, My Tomb') && S.isFrench('Ma Pelouse, Mon Tombeau') && S.englishFor('Mon Gazon, Ma Reine III') === 'My Lawn, My Queen III', 'englishFor: starters + sequels');
});

test('v0.7.2 titles: old saves turn English on load, everywhere the title is stored; idempotent; fr:true stays French', () => {
  const s = GG.career.newCareer({ seed: 45 });
  const base = s.songs.length, pool = GG.content.songTitles.metal;
  // An old (v0.7.1) career: French starters + pool songs (title = fr, titleEn = the old gloss), a sequel, one of v0.7.2's
  // deliberate French songs, and a custom English one.
  s.songs[0].title = 'Ma Pelouse, Mon Tombeau'; s.songs[0].titleEn = 'My Lawn, My Tomb';
  s.songs[1].title = "Les Pissenlits de l'Apocalypse"; s.songs[1].titleEn = 'Dandelions of the Apocalypse (On My Lawn)';
  const tomb = S.create(s, S.signature('metal'), 'Le Tombeau Vert', { titleEn: 'The Green Tomb (It Is the Lawn)', fr: false });
  const reine = S.create(s, S.signature('metal'), 'Mon Gazon, Ma Reine II', { titleEn: 'My Lawn, My Queen II', fr: false });
  const keep = S.create(s, S.signature('metal'), 'Trèfle Maudit');      // fr: true (Marcel insisted, v0.7.2)
  const mine = S.create(s, S.signature('metal'), 'Garage Door Blues');
  ok(keep.fr === true && !('fr' in tomb), 'setup');
  s.pendingSongs = [Object.assign(S.signature('metal'), { title: 'Tonte à Minuit', titleEn: 'Midnight Mow' }),
    Object.assign(S.signature('metal'), { title: 'Chaume Éternel', titleEn: 'Eternal Thatch', fr: true })];
  s.liveGig = { gig: { venueId: 'x' }, setlist: [tomb.id, keep.id], index: 2, songs: [{ songId: tomb.id, title: 'Le Tombeau Vert', score: 80 },
    { songId: keep.id, title: 'Trèfle Maudit', score: 70 }], crowd: 50, started: s.totalWeek, attendance: 60 };
  s.lastGig = { songs: ['Le Tombeau Vert', 'Ma Pelouse, Mon Tombeau', 'Garage Door Blues'], songIds: [tomb.id, s.songs[0].id, mine.id],
    songResults: [{ songId: tomb.id, title: 'Le Tombeau Vert' }], lines: ['Opening with “Le Tombeau Vert” grabbed them by the collar.'] };
  s.lastWeek = { blocks: [{ activity: 'write', lines: ['New song: “Mon Gazon, Ma Reine II” (My Lawn, My Queen II).'],
    deltas: { song: { id: reine.id, title: 'Mon Gazon, Ma Reine II', titleEn: 'My Lawn, My Queen II', reactions: [] } } }], gig: null };
  s.tour = s.tour || {}; s.tour.regions = s.tour.regions || {};
  s.tour.regions.japan = Object.assign(s.tour.regions.japan || {}, { big: { songId: tomb.id, title: 'Le Tombeau Vert', week: 3, choice: null } });
  s.tour.queue = [{ card: 'wt_big', region: 'japan', song: 'Le Tombeau Vert' }];
  s.loonies = { year: 1, week: 20, nominations: [{ category: 'single', name: 'Single', what: '"Mon Gazon, Ma Reine II"', nominees: ['x'] },
    { category: 'album', name: 'Album', what: '"Le Tombeau Vert"', nominees: ['x'] }], results: null };
  s.chat.push({ week: 1, who: 'marcel', text: 'Le Tombeau Vert is my masterpiece.' });
  const raw = JSON.stringify(s), v = s.v;

  const m = GG.save.migrate(JSON.parse(raw));
  const title = id => m.songs.find(x => x.id === id);
  eq([m.songs[0].title, m.songs[0].titleEn, m.songs[1].title], ['My Lawn, My Tomb', 'My Lawn, My Tomb', 'Dandelions of the Apocalypse (On My Lawn)'], 'starters');
  eq([title(tomb.id).title, title(tomb.id).titleEn], ['The Green Tomb (It Is the Lawn)', 'The Green Tomb (It Is the Lawn)'], 'pool song');
  eq(title(reine.id).title, 'My Lawn, My Queen II', 'sequel');
  eq([title(keep.id).title, title(keep.id).titleEn, title(keep.id).fr], ['Trèfle Maudit', 'Cursed Clover', true], 'fr:true keeps its French title');
  eq(title(mine.id).title, 'Garage Door Blues', 'custom title untouched');
  eq(m.pendingSongs.map(x => [x.title, x.titleEn]), [['Midnight Mow', 'Midnight Mow'], ['Chaume Éternel', 'Eternal Thatch']], 'queued songs (fr:true kept)');
  eq(m.liveGig.songs.map(x => x.title), ['The Green Tomb (It Is the Lawn)', 'Trèfle Maudit'], 'live gig song results');
  eq(m.lastGig.songs, ['The Green Tomb (It Is the Lawn)', 'My Lawn, My Tomb', 'Garage Door Blues'], 'last gig setlist');
  eq(m.lastGig.songResults[0].title, 'The Green Tomb (It Is the Lawn)', 'last gig song results');
  eq(m.lastGig.lines[0], 'Opening with “Le Tombeau Vert” grabbed them by the collar.', 'written lines are history');
  eq([m.lastWeek.blocks[0].deltas.song.title, m.lastWeek.blocks[0].deltas.song.titleEn], ['My Lawn, My Queen II', 'My Lawn, My Queen II'], 'the new-song delta');
  eq([m.tour.regions.japan.big.title, m.tour.queue[0].song], ['The Green Tomb (It Is the Lawn)', 'The Green Tomb (It Is the Lawn)'], 'big in Japan');
  eq(m.loonies.nominations.map(x => x.what), ['"My Lawn, My Queen II"', '"Le Tombeau Vert"'], 'the single nomination (album titles are not songs)');
  eq(m.chat[m.chat.length - 1].text, 'Le Tombeau Vert is my masterpiece.', 'chat is history');
  eq(m.v, v, 'no schema bump');
  eq(m.v, C.SAVE_SCHEMA, 'schema stays current');
  eq(JSON.stringify(GG.save.migrate(JSON.parse(JSON.stringify(m)))), JSON.stringify(m), 'idempotent');
  // The pool never hands out a renamed title twice.
  const t = S.pickTitle(m, GG.RNG(1), pool.filter(x => x.en !== 'Midnight Mow').map(x => x.en));
  ok(t.title !== 'Midnight Mow' && t.title !== 'Tonte à Minuit', 'renamed titles count as used: ' + t.title);
  // Through the storage path too.
  const store = load.fakeStorage(); const G2 = load({ localStorage: store });
  G2.save.init(store); store.setItem(G2.save.KEYS.slot('3'), JSON.stringify({ state: JSON.parse(raw) }));
  const back = G2.save.read('3');
  ok(back && back.songs[0].title === 'My Lawn, My Tomb' && back.songs.find(x => x.id === keep.id).title === 'Trèfle Maudit', 'save.read renames too');
});

done('sim_songs');
