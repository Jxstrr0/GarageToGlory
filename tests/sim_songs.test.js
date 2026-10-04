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
  eq([m.gear, m.pendingSongs, m.draft], [{ lanes: 4, doubleKick: false, owned: [], sections: [], quality: 0 }, [], null], 'v0.2 defaults (+ v0.8 gear fields)');
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

/* ---- v1.3 "Songwriter" stage 0 (plan_contract_1.3 §3.5, §4.1, §4.2, §4.4) ------------------------------------------ */
const V13 = ['chords', 'fillBars', 'mood', 'swing', 'recipe'];
const FULL = { lanes: 6, doubleKick: true, sections: ['outro', 'solo'] };
const J = x => JSON.stringify(x);
function bases(g) {
  const sig = S.signature(g), withPart = Object.assign(JSON.parse(J(sig)), { part: S.part.full(g, 'rhythm', sig, GG.RNG(4)) });
  return [sig, S.starter(g), S.generate(g, GG.RNG(1), {}), S.generate(g, GG.RNG(2), { gear: FULL }), withPart];
}
test('v1.3 fields survive sanitize only when present; absent -> the 1.2 JSON; idempotent', () => {
  for (const g of GENRES) bases(g).forEach((b, bi) => {
    [[null, null, true], [{ lanes: 4 }, g, false], [FULL, g, false]].forEach(([gear, genre, loose]) => {
      const a = S.sanitize(JSON.parse(J(b)), gear, genre, loose);
      ok(V13.every(k => !(k in a)), g + ' ' + bi + ': no v1.3 key appears');
      eq(J(S.sanitize(JSON.parse(J(a)), gear, genre, loose)), J(a), g + ' ' + bi + ' idempotent');
      const kick = 'xx..x...x.x.....';
      const q = Object.assign(JSON.parse(J(b)), {
        chords: { verse: [0, 5, 7, 0], chorus: [3, 3, 10, 0], bridge: [0, 12, 0, 0], solo: [0, 0, 0, 0] },
        fillBars: { verse: [kick, '....x.xx', 'x.x.x.x.x.x.x.x.x.x', 'abc'], nope: [kick] }, mood: 3, swing: 2,
        recipe: { id: 'neck-snapper', seed: 12, energy: 4, fills: 0, extra: 1 } });
      const c = S.sanitize(q, gear, genre, loose);
      eq(Object.keys(c).slice(Object.keys(c).indexOf('arrangement') + 1), (b.part ? ['part'] : []).concat(V13), g + ' ' + bi + ' key order after part');
      eq(c.chords, { verse: [0, 5, 7, 0], chorus: [3, 3, 10, 0] }, 'chords: valid sections only (bar 12 and solo dropped)');
      eq(Object.keys(c.fillBars), ['verse'], 'fillBars: sections the pattern has');
      eq(c.fillBars.verse.length, c.lanes, 'fill bar = one lane string per lane');
      eq(c.fillBars.verse[0], loose || (gear && gear.doubleKick) ? kick : 'x...x...x.x.....', 'fill bar kick rule (one foot without the pedal, unless loose)');
      eq(c.fillBars.verse[1], '....x.xx........'); eq(c.fillBars.verse[2], 'x.x.x.x.x.x.x.x.');
      ok(c.mood === 3 && c.swing === 2, 'mood / swing kept');
      eq(c.recipe, { id: 'neck-snapper', seed: 12, energy: 4, fills: 0 }, 'recipe: the four keys');
      eq(J(S.sanitize(JSON.parse(J(c)), gear, genre, loose)), J(c), 'idempotent with v1.3 keys');
      const strip = JSON.parse(J(c)); V13.forEach(k => delete strip[k]);
      eq(J(strip), J(a), 'without its v1.3 keys the pattern is the 1.2 JSON');
    });
    const bad = S.sanitize(Object.assign(JSON.parse(J(b)), { chords: { verse: [0, 5, 7], chorus: [0, 1.5, 0, 0], bridge: 'x' }, fillBars: [['x']],
      mood: 5, swing: -1, recipe: { id: 'Neck Snapper', seed: 1, energy: 1, fills: 1 } }), null, g);
    ok(V13.every(k => !(k in bad)), g + ' invalid v1.3 values are dropped');
    ['2', 2.5, null, NaN].forEach(v => ok(!('mood' in S.sanitize(Object.assign(JSON.parse(J(b)), { mood: v }), null, g)), 'mood ' + v));
    [{ id: 'x', seed: -1, energy: 0, fills: 0 }, { id: 'x', seed: 0, energy: 5, fills: 0 }, { id: 'x'.repeat(25), seed: 0, energy: 0, fills: 0 }, { id: 'x', seed: 0, energy: 0 }]
      .forEach(r => ok(!('recipe' in S.sanitize(Object.assign(JSON.parse(J(b)), { recipe: r }), null, g)), 'recipe ' + J(r)));
    // never rated: recipe / mood / swing change nothing; chords change nothing without a bass / rhythm part
    const r0 = S.rate(b, g, FULL), plus = Object.assign(JSON.parse(J(b)), { mood: 4, swing: 4, recipe: { id: 'a', seed: 1, energy: 1, fills: 1 } });
    eq(S.rate(plus, g, FULL), r0, g + ' ' + bi + ' mood / swing / recipe are never rated');
    if (!b.part) eq(S.rate(Object.assign(JSON.parse(J(b)), { chords: { verse: [0, 1, 2, 3], chorus: [0, 1, 2, 3] } }), g, FULL), r0, g + ' chords never touch a drum-only rating');
  });
});

test('part v2: 6 / 6 / 7 rows and v: 2 kept by sanitize; a v1 part never gains v; upgrade / view / rowsOf / rowNames', () => {
  eq(C.PART_V2, { bass: 6, rhythm: 6, lead: 7 });
  for (const seat of ['bass', 'rhythm', 'lead']) {
    eq(S.part.LAYOUT[2][seat].length, C.PART_V2[seat], seat + ' layout');
    eq(S.part.LAYOUT[1][seat], S.part.ROW_NAMES[seat], seat + ' v1 layout = ROW_NAMES');
    eq(S.part.UP[seat].length, S.part.ROWS[seat], seat + ' UP covers every v1 row');
    for (const g of GENRES) {
      const sig = S.signature(g), v1 = S.part.full(g, seat, sig, GG.RNG(9)), up = S.part.upgrade(v1);
      ok(up.v === 2 && Object.keys(up)[1] === 'v', seat + ' upgrade -> { seat, v: 2, sections }');
      eq(S.part.rowsOf(v1), S.part.ROWS[seat]); eq(S.part.rowsOf(up), C.PART_V2[seat]); eq(S.part.rowNames(up), S.part.LAYOUT[2][seat]);
      Object.keys(v1.sections).forEach(name => S.part.UP[seat].forEach((r2, r1) => eq(up.sections[name].rows[r2], v1.sections[name].rows[r1], seat + ' row ' + r1 + ' -> ' + r2)));
      const a = S.sanitize(Object.assign(JSON.parse(J(sig)), { part: up }), null, g);
      ok(a.part.v === 2 && Object.values(a.part.sections).every(x => x.rows.length === C.PART_V2[seat]), seat + ' v2 rows kept');
      eq(J(S.sanitize(JSON.parse(J(a)), null, g)), J(a), 'v2 sanitize idempotent');
      eq(S.part.view(a.part), a.part, 'view of a v2 part = itself');
      ok(!('v' in S.sanitize(Object.assign(JSON.parse(J(sig)), { part: v1 }), null, g).part), 'v1 part: no v key');
      ok(!('v' in S.sanitize(Object.assign(JSON.parse(J(sig)), { part: Object.assign({}, v1, { v: 1 }) }), null, g).part), 'v: 1 is a v1 part');
      const miss = S.sanitize(Object.assign(JSON.parse(J(sig)), { part: { seat: seat, v: 2, sections: {} } }), null, g).part;
      eq(miss.sections.verse, S.part.upgrade({ seat: seat, sections: { verse: S.part.suggest(g, seat, 'verse') } }).sections.verse, 'a missing v2 section = the v1 suggestion through UP');
    }
  }
  eq(S.part.upgrade({ seat: 'drums', sections: {} }), null); eq(S.part.rowsOf(null), 0);
});

test('swingBeat: identity at s 0 and on whole beats; 1/2 -> 1/2 + C.SWING[s]; monotonic, inside the beat', () => {
  eq(C.SWING, [0, 0.04, 0.083, 0.125, 0.1667]);
  for (let s = 0; s <= 4; s++) {
    let prev = -1;
    for (let q = 0; q <= 32; q++) {
      const b = q / 4, w = S.swingBeat(b, s);
      if (q % 4 === 0 || !s) eq(w, b, 's' + s + ' fixed ' + b);
      ok(w > prev && w >= Math.floor(b) && w <= Math.floor(b) + 1, 's' + s + ' monotonic at ' + b);
      prev = w;
    }
    ok(Math.abs(S.swingBeat(3.5, s) - (3.5 + C.SWING[s])) < 1e-12, 's' + s + ' off-8th');
  }
  eq(S.swingBeat(1.25, undefined), 1.25);
});

test('moods: 5 rungs per genre, the native rung is today\'s mode / scale (metal 2, punk 1, rock 2, country 1); moodOf / rowPitch', () => {
  const NATIVE = { metal: 2, punk: 1, rock: 2, country: 1 }, LEN = { metal: 7, punk: 7, rock: 6, country: 5 };
  for (const g of GENRES) {
    const B = GG.content.genres[g].backing, n = S.nativeMood(g);
    eq(n, NATIVE[g], g + ' native rung'); eq(B.moods.length, 5);
    eq([B.moods[n].mode, B.moods[n].scale], [B.mode, B.scale], g + ' native rung == backing mode / scale');
    ok(B.moods.every(m => m.scale.length === LEN[g] && m.scale[0] === 0 && (m.third === 3 || m.third === 4) && (m.seventh === 10 || m.seventh === 11) && m.id && m.mode), g + ' rungs');
    eq([B.moods[n].third, B.moods[n].seventh], [g === 'metal' ? 3 : 4, 10], g + ' native third / seventh = what 1.2 plays');
    ok(S.moodOf(g, n) === null && S.moodOf(g, undefined) === null && S.moodOf(g, 7) === null && S.moodOf(g, 1.5) === null, g + ' moodOf null');
    const other = n === 0 ? 4 : 0, r = S.moodOf(g, other);
    eq(r, B.moods[other], g + ' moodOf = the rung'); r.third = 99; ok(B.moods[other].third !== 99, 'moodOf returns a copy');
    eq([0, 1, 2, 3, 4, 5].map(i => S.part.rowPitch(g, 'bass', i, {})), [-5, 0, B.moods[n].third, 7, 10, 12], g + ' bass rows (native)');
    eq(S.part.rowPitch(g, 'bass', 2, { mood: other }), B.moods[other].third); eq(S.part.rowPitch(g, 'bass', 4, { mood: other }), B.moods[other].seventh);
    eq([0, 1, 2, 3, 4, 5].map(i => S.part.rowPitch(g, 'rhythm', i)), [0, 0, 0, 7, 12, 'dead'], g + ' rhythm rows');
    eq([0, 1, 2, 3, 4, 5, 6].map(i => S.part.rowPitch(g, 'lead', i, { deg: [2, 4, 5, 7, 8] })), [1, 2, 4, 5, 7, 8, 9], g + ' lead degrees');
    ok(S.part.rowPitch(g, 'rhythm', 6) === null && S.part.rowPitch(g, 'lead', -1) === null, 'bad rows');
  }
});

// The timeline's chords (30:2430 progression + 30:2936 the part's prog), mirrored: chordsOf must agree when p.chords is absent.
function chords12(p, name, g, part, seat) {
  const B = GG.content.genres[g].backing, q = S.sanitize(p, null, null, true), sec = q.sections[name], list = B.progressions[name] || [[0, 0, 0, 0]];
  let prog = list[GG.hashSeed(name + '|' + (sec[0] || '') + (sec[1] || '')) % list.length];
  const pt = part && part.sections && (!part.seat || part.seat === seat) ? part.sections[name] : null;
  if (seat !== 'lead' && seat !== 'drums' && pt && isFinite(pt.prog) && pt.prog !== null) prog = list[Math.max(0, Math.min(list.length - 1, pt.prog | 0))];
  return prog;
}
test('chordsOf: p.chords > the part\'s prog (not lead / drums) > the 1.2 hash pick; chordLabel; progChords (break bars home); progName', () => {
  for (const g of GENRES) {
    const pats = [S.signature(g), S.starter(g), S.generate(g, GG.RNG(3), {}), S.generate(g, GG.RNG(4), { gear: FULL })];
    pats.forEach(p => ['verse', 'chorus', 'bridge'].forEach(name => {
      eq(S.chordsOf(p, name, g), chords12(p, name, g, null, null), g + ' hash pick ' + name);
      ['bass', 'rhythm', 'lead'].forEach(seat => {
        const pt = S.part.full(g, seat, p, GG.RNG(7));
        eq(S.chordsOf(p, name, g, { part: pt, seat: seat }), chords12(p, name, g, pt, seat), g + ' ' + seat + ' ' + name);
        eq(S.chordsOf(Object.assign({}, p, { part: pt }), name, g), chords12(p, name, g, pt, seat), g + ' ' + seat + ' own part ' + name);
        eq(S.chordsOf(p, name, g, { part: pt, seat: 'drums' }), chords12(p, name, g, null, null), 'the drum seat ignores a part');
      });
      eq(S.chordsOf(Object.assign({}, p, { chords: { verse: [1, 2, 3, 4], chorus: [5, 6, 7, 8], bridge: [9, 10, 11, 0] } }), name, g, { part: S.part.full(g, 'bass', p), seat: 'bass' }),
        { verse: [1, 2, 3, 4], chorus: [5, 6, 7, 8], bridge: [9, 10, 11, 0] }[name], 'p.chords wins');
    }));
    const B = GG.content.genres[g].backing;
    B.progressions.bridge.forEach((pr, i) => {
      const pc = S.progChords(g, 'bridge', i, S.nativeMood(g));
      pc.forEach((x, bar) => eq(x, B.roles.bridge[bar] === 'break' ? 0 : pr[bar], g + ' progChords bridge ' + i + ' bar ' + bar));
    });
    eq(S.progChords(g, 'verse', 99), S.progChords(g, 'verse', B.progressions.verse.length - 1), 'index clamps');
    const p = S.signature(g), names = S.part.choices(g, 'bass', 'chorus');
    names.forEach((c, i) => eq(S.progName(g, 'bass', 'chorus', Object.assign({}, p, { chords: { chorus: S.progChords(g, 'chorus', i) } })), c.name, g + ' progName ' + i));
    eq(S.progName(g, 'rhythm', 'chorus', Object.assign({}, p, { chords: { chorus: [1, 1, 1, 6] } })), 'Custom');
    const pt = S.part.full(g, 'bass', p); pt.sections.verse.prog = 1;
    eq(S.progName(g, 'bass', 'verse', Object.assign({}, p, { part: pt })), names.length && S.part.choices(g, 'bass', 'verse')[1].name, g + ' progName from the part');
    const lp = S.part.full(g, 'lead', p); lp.sections.chorus.hook = 2;
    eq(S.progName(g, 'lead', 'chorus', Object.assign({}, p, { part: lp })), S.part.choices(g, 'lead', 'chorus')[2].name, g + ' lead: the hook name');
  }
  eq(['metal', 'punk', 'rock'].map(g => S.chordLabel(g, null, 40, 0)), ['E5', 'E5', 'E5'], 'power-chord genres');
  eq([S.chordLabel('country', null, 43, 0), S.chordLabel('country', null, 43, 5), S.chordLabel('country', null, 43, 7), S.chordLabel('country', null, 43, 9), S.chordLabel('country', null, 43, 2)],
    ['G', 'C', 'D', 'Em', 'Am'], 'country triads in G (native rung)');
  eq(S.chordLabel('country', 3, 43, 0), 'Gm', 'a minor rung'); eq(S.chordLabel('metal', 0, 41, 1), 'F♯5'); eq(S.NOTE.length, 12);
});

test('hook gate: a v2 part without p.chords rates as its v1 source; with p.chords (bass / rhythm) the chord arrays decide; the lead keeps the index rule', () => {
  for (const g of GENRES) for (const seat of ['bass', 'rhythm', 'lead']) {
    const p = S.signature(g), k = S.part.key(seat), pt = S.part.full(g, seat, p);
    pt.sections.chorus.rows = pt.sections.verse.rows.slice();   // no row contrast: only the progression / hook floor lifts the hook
    pt.sections.verse[k] = 0; pt.sections.chorus[k] = 1;
    const v1 = Object.assign({}, p, { part: pt }), v2 = Object.assign({}, p, { part: S.part.upgrade(pt) });
    eq(S.rate(v2, g), S.rate(v1, g), g + ' ' + seat + ' v2 = v1'); eq(S.partRating(v2, g), S.partRating(v1, g));
    const same = Object.assign({}, v2, { chords: { verse: [0, 5, 7, 0], chorus: [0, 5, 7, 0] } }), moved = Object.assign({}, v2, { chords: { verse: [0, 5, 7, 0], chorus: [0, 3, 5, 0] } });
    const flat = JSON.parse(J(v2)); flat.part.sections.chorus[k] = 0;
    const movedFlat = Object.assign({}, flat, { chords: moved.chords });
    if (seat === 'lead') {
      eq(S.partRating(same, g), S.partRating(v2, g), 'lead: chords never touch the hook'); eq(S.partRating(movedFlat, g), S.partRating(flat, g));
    } else {
      ok(S.partRating(same, g).hook < S.partRating(v2, g).hook, g + ' ' + seat + ': same chords, different index -> no floor');
      ok(S.partRating(movedFlat, g).hook > S.partRating(flat, g).hook, g + ' ' + seat + ': different chords, same index -> the floor');
      eq(S.partRating(moved, g), S.partRating(v2, g), g + ' ' + seat + ': moved chords = a moved index');
    }
  }
});

/* ---- v1.3 Lane S: part v2 mods + Scratch, fillBars (Q2 = 1), the Quick song (recipes / sliders / surprise / compose) ---- */
const G4 = { lanes: 4 }, NOPED = { lanes: 6, doubleKick: false, sections: ['outro', 'solo'] };
const RECIPES = { metal: [['neck-snapper', 'Neck-snapper', 180], ['doom-crawl', 'Doom crawl', 75], ['thrash-attack', 'Thrash attack', 200], ['stadium-anthem', 'Stadium anthem', 140], ['gallop', 'Gallop', 165]],
  punk: [['three-chord-sprint', 'Three-chord sprint', 190], ['laundromat-d-beat', 'Laundromat D-beat', 185], ['pogo-party', 'Pogo party', 175], ['circle-pit', 'Circle pit', 220], ['skate-rat', 'Skate rat', 205]],
  rock: [['arena-anthem', 'Arena anthem', 125], ['lighter-waver', 'Lighter-waver', 100], ['bar-boogie', 'Bar boogie', 115], ['bleacher-stomp', 'Bleacher stomp', 118], ['highway-driver', 'Highway driver', 145]],
  country: [['train-song', 'Train song', 112], ['legion-two-step', 'Legion two-step', 95], ['sad-waltz', 'Sad waltz', 85], ['barn-burner', 'Barn burner', 120], ['porch-swing', 'Porch swing', 88]] };
const SEATS = ['drums', 'bass', 'rhythm', 'lead'];
const songSeed = (career, n) => GG.hashSeed(career + '|s' + n);   // D14: hashSeed(state.seed + '|' + songSeed(D)), songSeed = 's' + the next song id

test('part v2: suggest / full with v = 2 are the v1 notes through UP (without v: 1.2 exactly); the v2 mods; Scratch is never odd, a Scratch-only bar x 0.6', () => {
  for (const g of GENRES) for (const seat of ['bass', 'rhythm', 'lead']) {
    ['verse', 'chorus', 'bridge', 'solo', 'outro'].forEach(sec => eq(S.part.suggest(g, seat, sec, null, 2), S.part.upgrade({ seat, sections: { x: S.part.suggest(g, seat, sec) } }).sections.x, g + ' ' + seat + ' ' + sec));
    const sig = S.signature(g), v2 = S.part.full(g, seat, sig, GG.RNG(3), 2);
    eq(v2, S.part.upgrade(S.part.full(g, seat, sig, GG.RNG(3))), g + ' ' + seat + ' full(.., 2) = upgrade(full)');
    ok(!('v' in S.part.full(g, seat, sig)), 'full without v: a v1 part');
  }
  const sig = S.signature('metal'), base = S.part.full('metal', 'rhythm', sig, null, 2);
  base.sections.verse.rows = ['x.x.x.x.x...x.x.', '..........x.....', '....x...........', '......x.........', '........x.......', '.x.x.x.x.x.x.x.x'];
  const p = Object.assign(JSON.parse(J(sig)), { part: base });
  const mod = id => S.part.modify(p, 'verse', id, G4, 'metal').pattern.part.sections.verse.rows;
  const ring = mod('ring');
  ok(ring.every(r => [...r].every((c, i) => c === '.' || i % 8 === 0)), 'ring: downbeats only');
  eq(ring[5], E, 'ring: no Scratch (dead strums do not ring)'); eq(ring[0], E, 'ring: the chug moves to the Open row'); ok(ring[1][0] === 'x', 'ring: an open chord on 1');
  const lock = mod('lock'), kick = sig.sections.verse[0];
  ok(lock.every(r => [...r].every((c, i) => c === '.' || kick[i] === 'x')), 'lock: every note on a kick');
  ok(![...lock[5]].some((c, i) => c === 'x' && base.sections.verse.rows[5][i] !== 'x'), 'lock never adds a Scratch');
  const call = mod('call');   // CALL2 rhythm: Chug -> Open, Open / Root -> 5th, 5th -> Oct, Oct stays, Scratch answers with Scratch
  eq(call.map(r => r.slice(0, 8)), base.sections.verse.rows.map(r => r.slice(0, 8)), 'call: the first half asks');
  eq(call.map(r => r.slice(8)), ['........', 'x.x.x.x.', '........', '....x...', '......x.', '.x.x.x.x'], 'call: the answer one pitched row up');
  ok(mod('double')[5] === base.sections.verse.rows[5], 'double never doubles a Scratch');
  ok(S.part.MODS.every(m => mod(m.id).length === 6), 'v2 mods keep 6 rows');
  // Scratch rating (rock: the plain kick-cover rule): the same onsets on Scratch vs the Root row
  const rsig = S.signature('rock'), rp = Object.assign(JSON.parse(J(rsig)), { part: S.part.full('rock', 'rhythm', rsig, null, 2) });
  const rowsAt = (row, steps) => { const r = Array(6).fill(E); r[row] = Array.from({ length: 16 }, (_, i) => steps.includes(i) ? 'x' : '.').join(''); return r; };
  const withRows = rows => { const q = JSON.parse(J(rp)); ['verse', 'chorus', 'bridge'].forEach(s => { q.part.sections[s].rows = rows.slice(); }); return q; };
  const odd = [1, 3, 5, 7, 9, 11, 13, 15], scr = S.rate(withRows(rowsAt(5, odd)), 'rock'), root = S.rate(withRows(rowsAt(2, odd)), 'rock');
  ok(scr.difficulty < root.difficulty, 'Scratch on the 16th off-beats is never odd: easier ' + scr.difficulty + ' < ' + root.difficulty);
  const evens = [0, 2, 4, 6, 8, 10, 12, 14], s1 = S.partRating(withRows(rowsAt(5, evens)), 'rock'), s2 = S.partRating(withRows(rowsAt(2, evens)), 'rock');
  ok(Math.abs(s1.groove - Math.round(0.6 * s2.groove)) <= 1, 'a Scratch-only bar grooves x 0.6: ' + s1.groove + ' vs ' + s2.groove);
  const mixed = rowsAt(2, [0, 4, 8, 12]); mixed[5] = rowsAt(5, [2, 6, 10, 14])[5];
  ok(S.partRating(withRows(mixed), 'rock').groove > s1.groove, 'Scratch next to pitched notes: no x 0.6');
});

test('fillBars (Q2 = 1): validate, toNotes (bar 4 of every entry, fill: true), rate (3/4 main + 1/4 fill; hook unchanged); absent: 1.2', () => {
  for (const g of GENRES) {
    const sig = S.signature(g), fill = ['x.x.x.x.x.x.x.x.', '....x.......xxxx', 'x.x.x.x.x.x.....', 'x...............'];
    const p = Object.assign(JSON.parse(J(sig)), { fillBars: { verse: fill } });
    eq(S.validate(p, G4), [], g + ' a clean fill validates');
    ok(S.validate(Object.assign({}, p, { fillBars: { verse: ['xx..............', E, E, E] } }), G4).some(e => /fill/.test(e)), 'fill kick pair without the pedal');
    eq(S.validate(Object.assign({}, p, { fillBars: { verse: ['xx..............', E, E, E] } }), FULL).filter(e => /fill/.test(e)), [], 'fine with the pedal');
    ok(S.validate(Object.assign({}, p, { fillBars: { verse: [E, E] } }), G4).some(e => /bad fill/.test(e)), 'wrong lane count');
    ok(S.validate(Object.assign({}, p, { fillBars: { solo: fill } }), G4).some(e => /without its section/.test(e)), 'a fill for a missing section');
    const n0 = S.toNotes(sig), n1 = S.toNotes(p);
    ok(n0.every(n => !('fill' in n)), 'no fill key without fillBars');
    const entries = p.arrangement.filter(x => x === 'verse').length, hits = b => b.join('').split('x').length - 1;
    eq(n1.length - n0.length, entries * (hits(fill) - hits(sig.sections.verse)), g + ' bar 4 of each verse plays the fill');
    ok(n1.filter(n => n.fill).every(n => n.section === 'verse' && n.bar === 3) && n1.filter(n => n.fill).length === entries * hits(fill), 'fill notes: verse, bar 4');
    eq(n1.filter(n => !n.fill), n0.filter(n => !(n.section === 'verse' && n.bar === 3)), 'the other bars are 1.2');
    const same = S.rate(Object.assign(JSON.parse(J(sig)), { fillBars: { verse: sig.sections.verse.slice() } }), g), r0 = S.rate(sig, g);
    eq([same.groove, same.hook, same.difficulty, same.notes], [r0.groove, r0.hook, r0.difficulty, r0.notes], g + ' a fill equal to the main bar rates as 1.2');
    const r1 = S.rate(p, g);
    eq(r1.hook, r0.hook, g + ' hook unchanged'); ok(r1.notes === r0.notes + entries * (hits(fill) - hits(sig.sections.verse)), 'notes count the fill bar');
    const empty = S.rate(Object.assign(JSON.parse(J(sig)), { fillBars: { verse: [E, E, E, E] } }), g);
    ok(empty.sections.verse <= Math.round(0.75 * r0.sections.verse) + 1 && empty.groove < r0.groove, g + ' an empty fill weighs 1/4: ' + empty.sections.verse + ' vs ' + r0.sections.verse);
  }
});

test('recipes: exactly 5 per genre (contract names + tempos) + Surprise me last; pedal ones locked without the double kick (lockLabel = the seat pedal); sliders', () => {
  const pedal = GG.content.shop.gear.find(x => x.id === 'pedal');
  for (const g of GENRES) for (const seat of SEATS) {
    const R = S.recipes(g, G4, seat), RF = S.recipes(g, FULL, seat);
    eq(R.slice(0, 5).map(r => [r.id, r.name, r.bpm]), RECIPES[g].map(x => [x[0], x[1], 5 * Math.round(x[2] / 5)]), g + ' the five (card tempo = the composed one, on a 5)');
    eq(GG.content.grooves[g].recipes.map(r => r.bpm), RECIPES[g].map(x => x[2]), g + ' content tempos as the contract lists them');
    ok(R.length === 6 && R[5].surprise && R[5].id === 'surprise' && !R[5].locked && R[5].name === 'Surprise me', g + ' Surprise me last');
    R.slice(0, 5).forEach((r, i) => {
      const def = GG.content.grooves[g].recipes[i];
      eq(r.locked, !!def.pedal, g + ' ' + r.id + ' locked iff pedal (4 lanes)'); eq(RF[i].locked, false, 'unlocked with the pedal');
      eq(r.lockLabel, def.pedal ? (seat === 'drums' ? pedal.name : pedal.bySeat[seat].names[g]) : null, g + ' ' + seat + ' lockLabel');
      ok(r.desc.length <= 28 && ['energy', 'mood', 'swing', 'fills'].every(k => Number.isInteger(r.sliders[k]) && r.sliders[k] >= 0 && r.sliders[k] <= 4), r.id + ' desc + sliders');
    });
    const sl = S.sliders(g, seat);
    eq(sl.map(x => x.id), ['energy', 'mood', 'swing', 'fills', 'tempo']);
    eq(sl.map(x => x.name), C.SONG_SLIDERS.map(x => x.name)); eq(sl.map(x => [x.lo, x.hi]), C.SONG_SLIDERS.map(x => [x.lo, x.hi]));
    ok(sl.slice(0, 4).every(x => x.stops.length === 5 && x.stops.every(t => typeof t === 'string' && t.length && t.length <= 20)), g + ' 5 stop labels');
    eq(sl[1].stops, GG.content.grooves[g].sliders.mood, g + ' mood stops from content');
    const T = sl[4], G = GG.content.genres[g];
    ok(T.min === G.tempo[0] && T.max === G.tempo[1] && T.step === 5 && T.stops === null, g + ' tempo');
  }
  eq(S.sliders('rock', 'drums')[3].stops[4], 'Drum solo, sorry'); ok(S.sliders('rock', 'bass')[3].stops[4] !== 'Drum solo, sorry', 'the drum line is drum-seat only');
});

test('compose: pure (never reads GG.state), deterministic (fresh load too), sanitized + valid, the fields; drum seat no part; locked / unknown recipe -> the signature recipe', () => {
  const trap = {}; ['genre', 'seed', 'gear', 'songs', 'rng', 'week'].forEach(k => Object.defineProperty(trap, k, { get() { throw new Error('compose read GG.state.' + k); } }));
  const saved = GG.state; GG.state = trap;
  const fresh = load({ localStorage: load.fakeStorage() }).songs;
  try {
    for (const g of GENRES) for (const seat of SEATS) {
      const o = { recipe: RECIPES[g][1][0], energy: 3, mood: 0, swing: 2, fills: 2, bpm: 133, seed: 77, gear: FULL, seat };
      const a = S.compose(g, o);
      eq(J(S.compose(g, JSON.parse(J(o)))), J(a), g + ' ' + seat + ' deterministic'); eq(J(fresh.compose(g, o)), J(a), 'same JSON in a fresh load');
      eq(J(S.sanitize(JSON.parse(J(a)), FULL, g)), J(a), 'sanitized'); eq(S.validate(a, FULL), [], g + ' ' + seat + ' validates');
      const t = GG.content.genres[g].tempo;
      ok(a.mood === 0 && a.swing === 2 && a.bpm === Math.max(t[0], Math.min(t[1], 135)), g + ' mood / swing / bpm (133 -> 135, clamped)');
      eq(a.recipe, { id: o.recipe, seed: 77, energy: 3, fills: 2 }, 'recipe provenance');
      eq(Object.keys(a.chords), ['verse', 'chorus', 'bridge']);
      ok(a.fillBars && Object.keys(a.fillBars).every(n => ['verse', 'chorus', 'bridge'].includes(n)), 'fills 2 writes bar-4 fills');
      ok(!('fillBars' in S.compose(g, Object.assign({}, o, { fills: 0 }))), 'fills 0: no fillBars');
      if (seat === 'drums') ok(!('part' in a), 'drum seat: no part');
      else ok(a.part.v === 2 && a.part.seat === seat && Object.values(a.part.sections).every(x => x.rows.length === C.PART_V2[seat]), seat + ': a v2 part');
    }
  } finally { GG.state = saved; }
  for (const g of GENRES) {
    const first = RECIPES[g][0][0], o = { seed: 9, gear: G4, seat: 'rhythm' };
    eq(J(S.compose(g, Object.assign({ recipe: 'no-such-recipe' }, o))), J(S.compose(g, Object.assign({ recipe: first }, o))), g + ' unknown -> signature recipe');
    eq(S.compose(g, o).recipe.id, first, g + ' no recipe -> the signature recipe');
    const locked = GG.content.grooves[g].recipes.find(r => r.pedal);
    if (locked) {
      eq(J(S.compose(g, Object.assign({ recipe: locked.id }, o))), J(S.compose(g, Object.assign({ recipe: first }, o))), g + ' locked ' + locked.id + ' falls back');
      eq(S.compose(g, Object.assign({}, o, { recipe: locked.id, gear: FULL })).recipe.id, locked.id, 'unlocked with the pedal');
    }
    const t = GG.content.genres[g].tempo;
    eq([S.compose(g, Object.assign({ bpm: 1 }, o)).bpm, S.compose(g, Object.assign({ bpm: 999 }, o)).bpm], [t[0], t[1]], g + ' tempo clamps');
  }
});

test('compose: a slider moved and moved back is the same song; Feel + Tempo never rewrite notes (D15); Energy / Fills / Mood recompose; chords from the recipe (Energy never re-picks them)', () => {
  const notes = p => J([p.sections, p.part || null, p.fillBars || null, p.arrangement]);
  for (const g of GENRES) for (const seat of SEATS) {
    const o = { seed: 4242, gear: G4, seat }, a = S.compose(g, o);
    eq(J(S.compose(g, o)), J(a), 'moved back');
    eq(notes(S.compose(g, Object.assign({ swing: 4 }, o))), notes(a), g + ' ' + seat + ' Feel never rewrites notes');
    eq(notes(S.compose(g, Object.assign({ bpm: GG.content.genres[g].tempo[1] }, o))), notes(a), g + ' ' + seat + ' Tempo never rewrites notes');
    ok(notes(S.compose(g, Object.assign({ energy: 4 }, o))) !== notes(a) || notes(S.compose(g, Object.assign({ energy: 0 }, o))) !== notes(a), g + ' ' + seat + ' Energy recomposes');
    eq(S.compose(g, Object.assign({ energy: 4 }, o)).chords, a.chords, 'Energy keeps the chords');
    const R = GG.content.grooves[g].recipes[0];
    ['verse', 'chorus', 'bridge'].forEach(n => eq(a.chords[n], S.progChords(g, n, R.parts.prog[n], a.mood), g + ' chords = progChords of the recipe'));
    eq(S.compose(g, Object.assign({ mood: 0 }, o)).chords.verse, S.progChords(g, 'verse', R.parts.prog.verse, 0), 'Mood remaps the chords');
  }
  for (const g of GENRES) for (const r of GG.content.grooves[g].recipes) for (let m = 0; m <= 4; m++)
    ok(J(S.progChords(g, 'verse', r.parts.prog.verse, m)) !== J(S.progChords(g, 'chorus', r.parts.prog.chorus, m)), g + ' ' + r.id + ' mood ' + m + ': verse and chorus chords differ (the hook gate)');
});

test('surprise: deterministic per seed, unlocked recipes only, values in range; seeds differ', () => {
  for (const g of GENRES) for (const seat of SEATS) {
    const seen = new Set();
    for (let i = 0; i < 40; i++) {
      const x = S.surprise(g, G4, seat, i);
      eq(x, S.surprise(g, G4, seat, i), 'deterministic');
      const r = S.recipes(g, G4, seat).find(y => y.id === x.recipe);
      ok(r && !r.locked && !r.surprise, g + ' unlocked recipe ' + x.recipe);
      ok(['energy', 'mood', 'swing', 'fills'].every(k => Number.isInteger(x[k]) && x[k] >= 0 && x[k] <= 4), 'stops 0..4');
      const t = GG.content.genres[g].tempo; ok(x.bpm >= t[0] && x.bpm <= t[1] && x.bpm % 5 === 0, 'bpm');
      seen.add(J(x));
      eq(S.validate(S.compose(g, Object.assign({ seed: i, gear: G4, seat }, x)), G4), [], 'a surprise composes');
    }
    ok(seen.size >= 30, g + ' seeds differ: ' + seen.size);
    ok([...Array(40).keys()].some(i => S.surprise(g, FULL, seat, i).recipe === (GG.content.grooves[g].recipes.find(r => r.pedal) || {}).id) || !GG.content.grooves[g].recipes.some(r => r.pedal), g + ' the pedal recipe shows up once owned');
  }
});

test('Q4: breakdown bars take a chord (a chip there is kept, played by chordsOf, named Custom); new songs start the breakdown on home', () => {
  for (const g of GENRES) {
    const B = GG.content.genres[g].backing, roles = B.roles.bridge, brk = roles.map((r, i) => r === 'break' ? i : -1).filter(i => i >= 0);
    const a = S.compose(g, { seed: 3, gear: G4, seat: 'bass' });
    brk.forEach(i => eq(a.chords.bridge[i], 0, g + ' compose: break bar ' + i + ' starts on home'));
    if (!brk.length) continue;
    const q = JSON.parse(J(a)); q.chords.bridge = q.chords.bridge.map((x, i) => brk.includes(i) ? 5 : x);
    const c = S.sanitize(q, G4, g);
    eq(c.chords.bridge, q.chords.bridge, g + ' a chip on a break bar is kept');
    eq(S.chordsOf(c, 'bridge', g), q.chords.bridge, g + ' chordsOf plays it');
    eq(S.progName(g, 'bass', 'bridge', c), 'Custom', g + ' named Custom');
    eq(S.rate(c, g, G4).groove, S.rate(a, g, G4).groove, 'chords never move the groove');
  }
});

test('the 1.2 corpus (tests/fixtures, 708 entries): SAN idempotent on every path, no v1.3 key appears; rate(upgrade(part)) == rate(part); toNotes has no fill key', () => {
  const FX = require('../tools/make_fixtures_v12.js'), fixture = JSON.parse(fs.readFileSync(path.join(FX.FIXDIR, 'v12_songs.json'), 'utf8'));
  const { GG: G2, store } = FX.loadGG(), entries = FX.corpus(G2, store, fixture.corpus, FX.careerStrings()), S2 = G2.songs, bad = [];
  eq(entries.length, 708, 'corpus size');
  entries.forEach(e => {
    [[null, null, true], [{ lanes: 4 }, e.genre, false], [FULL, e.genre, false]].forEach(([gear, genre, loose]) => {
      const a = S2.sanitize(JSON.parse(J(e.pat)), gear, genre, loose);
      if (J(S2.sanitize(JSON.parse(J(a)), gear, genre, loose)) !== J(a)) bad.push(e.id + ' SAN not idempotent');
      if (V13.some(k => k in a) || (a.part && 'v' in a.part)) bad.push(e.id + ' a v1.3 key appeared');
    });
    if (S2.toNotes(e.pat).some(n => 'fill' in n)) bad.push(e.id + ' fill key');
    const q = S2.sanitize(JSON.parse(J(e.pat)), null, null, true);
    if (q.part) {
      const up = Object.assign(JSON.parse(J(q)), { part: S2.part.upgrade(q.part) });
      if (J(S2.rate(up, e.genre, FULL)) !== J(S2.rate(q, e.genre, FULL))) bad.push(e.id + ' rate(upgrade) differs');
    }
  });
  eq(bad.slice(0, 10), [], 'corpus');
});

// The §4.4 ceiling (S5 "rate by the notes only"), per genre x seat x gear; the table is in plan/v13_lane_s_report.md.
test('ceiling (S5): (a) every recipe at its defaults >= 80 / 65; (b) >= 2 recipes reach top (90 / 85) over energy x fills (+ mood 0 / 4); (c) no single-slider extreme under 55 groove', () => {
  const seed = songSeed(7, 3), bad = [];
  for (const g of GENRES) for (const seat of SEATS) for (const [gn, gear] of [['4 lanes', G4], ['full', FULL]]) {
    let tops = 0;
    S.recipes(g, gear, seat).filter(r => !r.surprise && !r.locked).forEach(r => {
      const base = { recipe: r.id, seed, gear, seat }, d = S.compose(g, base), rd = S.rate(d, g, gear);
      if (rd.groove < 80 || rd.hook < 65) bad.push(`(a) ${g} ${seat} ${gn} ${r.id} ${rd.groove}/${rd.hook}`);
      if (S.validate(d, gear).length || (seat === 'drums') === !!d.part) bad.push(`valid ${g} ${seat} ${gn} ${r.id}`);
      const pts = [{ mood: 0 }, { mood: 4 }];
      for (let e = 0; e <= 4; e++) for (let f = 0; f <= 4; f++) pts.push({ energy: e, fills: f });
      if (pts.some(pt => { const x = S.rate(S.compose(g, Object.assign({}, base, pt)), g, gear); return x.groove >= 90 && x.hook >= 85; })) tops++;
      [['energy', 0], ['energy', 4], ['mood', 0], ['mood', 4], ['swing', 0], ['swing', 4], ['fills', 0], ['fills', 4], ['bpm', 1], ['bpm', 999]].forEach(([k, v]) => {
        const p = S.compose(g, Object.assign({}, base, { [k]: v })), x = S.rate(p, g, gear);
        if (x.groove < 55) bad.push(`(c) ${g} ${seat} ${gn} ${r.id} ${k}=${v} ${x.groove}`);
        if (S.validate(p, gear).length) bad.push(`valid (c) ${g} ${seat} ${gn} ${r.id} ${k}=${v}`);
      });
    });
    if (tops < 2) bad.push(`(b) ${g} ${seat} ${gn}: ${tops} recipes reach top`);
  }
  eq(bad, [], 'ceiling');
});

test('energy 0 keeps >= 8 drum hits a bar (the rating floors); compose stays under 20 ms (median of 50)', () => {
  for (const g of GENRES) GG.content.grooves[g].recipes.forEach(r => [G4, FULL].forEach(gear => {
    const p = S.compose(g, { recipe: r.id, energy: 0, seed: 5, gear, seat: 'drums' });
    ['verse', 'chorus', 'bridge'].forEach(n => ok(p.sections[n].join('').split('x').length - 1 >= 8, g + ' ' + r.id + ' ' + n + ' energy 0 >= 8 hits'));
  }));
  const ms = [];
  for (let i = 0; i < 50; i++) { const t0 = process.hrtime.bigint(); S.compose(GENRES[i % 4], { seed: i, gear: FULL, seat: SEATS[i % 4] }); ms.push(Number(process.hrtime.bigint() - t0) / 1e6); }
  ms.sort((a, b) => a - b);
  ok(ms[25] <= 20, 'compose median ' + ms[25].toFixed(2) + ' ms');
});

test('variety: the default recipe on 5 consecutive song slots of one career (D14 seeds), per genre x seat: no two equal, every pair < 0.9, at most 1 of 10 pairs >= 0.8', () => {
  const bad = [];
  for (const g of GENRES) for (const seat of SEATS) {
    const songs = [6, 7, 8, 9, 10].map(n => S.compose(g, { seed: songSeed(12345, n), gear: G4, seat })), sims = [];
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) {
      if (J(songs[i]) === J(songs[j])) bad.push(`${g} ${seat} ${i}=${j}`);
      sims.push(S.similarity(songs[i], songs[j], g));
    }
    if (Math.max(...sims) >= 0.9 || sims.filter(x => x >= 0.8).length > 1) bad.push(`${g} ${seat} ${sims.join(' ')}`);
  }
  eq(bad, [], 'variety');
});

done('sim_songs');
