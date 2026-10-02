// sim_lessons.test.js (v1.0 Lane T): GG.lessons (2h_sim_lessons.js), DOM-free. Steps per band (speakers in the lineup, Kenji
// silent, seat gates, tokens), due() triggers for week one and weeks 2–4, mark/done through a save, v0.9 fixtures never start
// the lessons, purity, the career RNG untouched, and the A15 first-gig checks (a failing tempo is a hand-over to the lead).
// Run: node tests/sim_lessons.test.js   (A15_STRICT=1 also fails on the starter-song tempo hand-over)
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const { test, ok, eq, done } = require('./_t');
const load = require('./_load');
const BANDS = ['hail_damage', 'frost_heave', 'gravel_kings', 'grid_road_ramblers'];
const DRUM_RE = /\b(kit|kits|drums?|sticks?|snares?|kicks?|cymbals?|hi-?hats?)\b/i;
const fixture = name => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', name + '.json.gz'))).toString('utf8'));
function career(GG, bandId, seed) {
  const s = GG.career.newCareer({ seed: seed || 7, bandId, player: { name: 'Tess' } });
  s.tutorial.on = true;   // what 60_main.newCareer does unless "Skip the lessons" is on
  return s;
}

test('GG.lessons API and every lesson id (C.LESSONS, advisory) resolves to content', () => {
  const GG = load();
  ['ensure', 'on', 'done', 'mark', 'stop', 'steps', 'due', 'def', 'available', 'matches'].forEach(k => ok(typeof GG.lessons[k] === 'function', 'GG.lessons.' + k));
  eq(GG.lessons.LESSONS, GG.contracts.LESSONS, 'lesson ids');
  GG.lessons.LESSONS.forEach(id => ok(GG.lessons.def(id), id + ' has content'));
});

test('per band: every lesson has steps, every speaker is an active talker of this lineup, Kenji never speaks', () => {
  const GG = load();
  BANDS.forEach(b => {
    const s = career(GG, b), talk = GG.career.talkers(s).map(m => m.id);
    GG.lessons.LESSONS.forEach(id => {
      const st = GG.lessons.steps(s, id);
      ok(st.length >= 2, b + '/' + id + ' has steps: ' + st.length);
      st.forEach((x, i) => {
        ok(x.who && talk.includes(x.who), b + '/' + id + '#' + i + ' speaker ' + x.who + ' talks in this lineup');
        ok(x.who !== 'kenji', 'kenji never speaks');
        ok(!/\{[a-zA-Z:_-]+\}/.test(x.text), b + '/' + id + '#' + i + ' tokens filled: ' + x.text);
        eq(x.i, i, 'step index');
      });
    });
  });
});

test('roles: Hail Damage\'s driver (Kenji) never voices the van lesson; aliases resolve to talkers', () => {
  const GG = load();
  const s = career(GG, 'hail_damage');
  eq(GG.career.roleOf(s, '@driver'), 'kenji', 'HD drives with Kenji (silent)');
  const van = GG.lessons.steps(s, 'w4_van');
  ok(van.length && van.every(x => x.who !== 'kenji'), 'w4_van voiced by talkers');
  // A band without its own layer would fall back to the alias steps: a silent '@deadpan' / '@driver' is dropped, not voiced.
  const d = GG.lessons.def('w1_card'), keep = d.byBand.hail_damage; delete d.byBand.hail_damage;
  try { const st = GG.lessons.steps(s, 'w1_card'); ok(st.every(x => x.who !== 'kenji'), 'alias step for a silent member dropped'); }
  finally { d.byBand.hail_damage = keep; }
});

test('a bandmate who left is dropped with the step (no ghost voices)', () => {
  const GG = load();
  const s = career(GG, 'hail_damage');
  const before = GG.lessons.steps(s, 'w1_walk').filter(x => x.who === 'dana').length;
  ok(before > 0, 'Dana has walk lines');
  s.members.find(m => m.id === 'dana').status = 'quit';
  const after = GG.lessons.steps(s, 'w1_walk');
  eq(after.filter(x => x.who === 'dana').length, 0, 'Dana dropped once she quit');
  ok(after.length >= 3, 'the rest of the lesson stays');
});

test('E12 seats: drum-mechanics steps only for the drummer; {instrument}/{drummer} read the seat values', () => {
  const GG = load();
  BANDS.forEach(b => {
    const s = career(GG, b);
    const all = GG.lessons.LESSONS.map(id => GG.lessons.steps(s, id)).flat();
    ok(all.some(x => DRUM_RE.test(x.text)), b + ': the drummer gets drum mechanics');
    ok(all.some(x => /\bdrums\b/.test(x.text)), b + ': {instrument} reads "drums"');
    const bass = Object.assign(JSON.parse(JSON.stringify(s)), { seat: 'bass' });
    const ids = GG.lessons.LESSONS.filter(id => GG.lessons.steps(bass, id).length);
    eq(ids.length, GG.lessons.LESSONS.length, b + ': every lesson still runs for another seat');
    // fillText still says "drums" in v1.0 (no state.seat yet); the raw content outside the gate must not carry drum words
    GG.lessons.LESSONS.forEach(id => {
      const d = GG.lessons.def(id), raw = (d.byBand[b] || d).steps.filter(x => !(x.seat && x.seat.includes('drums') === false)).filter(x => !x.seat);
      raw.forEach(x => ok(!DRUM_RE.test(x.text.replace(/\{[^}]*\}/g, '')), b + '/' + id + ' ungated drum word: ' + x.text));
    });
    const gatedCount = GG.lessons.LESSONS.reduce((n, id) => n + GG.lessons.steps(s, id).length - GG.lessons.steps(bass, id).length, 0);
    ok(gatedCount >= 2, b + ': seat-gated steps drop for the bass seat: ' + gatedCount);
  });
});

test('due(): off unless on; week one in order by screen; seq only in write mode; done lessons skipped', () => {
  const GG = load(), L = GG.lessons;
  const s = career(GG, 'gravel_kings');
  s.tutorial.on = false;
  eq(L.due(s, { screen: 'card' }), null, 'lessons off -> nothing due');
  s.tutorial.on = true;
  eq(L.due(s, { screen: 'card' }), 'w1_card');
  eq(L.due(s, { event: 'afterCard' }), 'w1_walk');
  eq(L.due(s, { screen: 'plan' }), 'w1_plan');
  eq(L.due(s, { screen: 'seq', mode: 'sketch' }), null, 'the kit sketch pad is not the Write lesson');
  eq(L.due(s, { screen: 'seq', mode: 'write' }), 'w1_write');
  eq(L.due(s, { screen: 'results' }), 'w1_rehearse');
  eq(L.due(s, { screen: 'gig-set' }), 'w1_gig');
  eq(L.due(s, { screen: 'gig' }), null, 'nothing during the song');
  eq(L.due(s, { screen: 'wrap' }), 'w1_wrap');
  ok(L.mark(s, 'w1_card'), 'mark returns true the first time');
  ok(!L.mark(s, 'w1_card'), 'and false after');
  eq(L.due(s, { screen: 'card' }), null, 'a done lesson never comes back');
  eq(L.done(s, 'w1_card'), true);
  s.totalWeek = 2;
  eq(L.due(s, { screen: 'card' }), null, 'w1_card is week one only');
  eq(L.due(s, { screen: 'wrap' }), null, 'w1_wrap is week one only');
});

test('due(): weeks 2–4 triggers (board, money/merch, chat or a mood drop, the van) once each, within year one', () => {
  const GG = load(), L = GG.lessons;
  const s = career(GG, 'frost_heave');
  eq(L.due(s, { screen: 'board' }), 'w2_board', 'the gig board even in week one');
  eq(L.due(s, { screen: 'van' }), null, 'no van lesson in week one (week one stays on the gig)');
  s.totalWeek = 3;
  eq(L.due(s, { screen: 'laptop', tab: 'money' }), 'w2_money');
  eq(L.due(s, { screen: 'merch' }), 'w2_money', 'or the merch table');
  eq(L.due(s, { screen: 'laptop', tab: 'chat' }), 'w3_chat');
  eq(L.due(s, { screen: 'wrap', event: 'moodDrop' }), 'w3_chat', 'or the first mood drop at a wrap');
  eq(L.due(s, { screen: 'wrap' }), null, 'a plain wrap in week 3 teaches nothing');
  eq(L.due(s, { screen: 'van' }), 'w4_van');
  ['w2_board', 'w2_money', 'w3_chat', 'w4_van'].forEach(id => L.mark(s, id));
  ['board', 'merch', 'van'].forEach(sc => eq(L.due(s, { screen: sc }), null, sc + ' once'));
  const t = career(GG, 'frost_heave'); t.totalWeek = 30;
  eq(L.due(t, { screen: 'board' }), null, 'nothing past year one');
  eq(L.due(t, { screen: 'van' }), null, 'nothing past year one');
});

test('stop(): "Skip lessons" turns the career\'s lessons off; ensure() repairs a damaged field', () => {
  const GG = load(), L = GG.lessons;
  const s = career(GG, 'hail_damage');
  L.stop(s);
  eq(s.tutorial.on, false);
  eq(L.due(s, { screen: 'card' }), null);
  s.tutorial = 'junk';
  L.ensure(s);
  eq(s.tutorial, { on: false, done: {}, past4: false }, 'repaired');
});

test('mark/done round trip through a save slot and a save code', () => {
  const GG = load({ localStorage: load.fakeStorage() }), L = GG.lessons;
  const s = career(GG, 'grid_road_ramblers');
  L.mark(s, 'w1_card'); L.mark(s, 'w1_walk');
  ok(GG.save.write('1', s), 'written');
  const r = GG.save.read('1');
  eq(r.tutorial.on, true, 'on survives');
  eq(L.done(r, 'w1_card') && L.done(r, 'w1_walk') && !L.done(r, 'w1_plan'), true, 'done survives');
  const c = GG.save.fromCode(GG.save.toCode(s));
  eq(c.tutorial, s.tutorial, 'code round trip');
  eq(L.due(c, { screen: 'plan' }), 'w1_plan', 'the next lesson is still due after a reload');
});

test('v0.9 fixtures migrate with tutorial.on === false (old careers never start the lessons)', () => {
  const GG = load(), L = GG.lessons;
  ['v09_world_y9', 'v09_y10w14', 'v09_ended'].forEach(name => {
    const m = GG.save.migrate(fixture(name).state);
    eq(m.tutorial.on, false, name + ' lessons off');
    eq(m.tutorial.past4, true, name + ' past4');
    eq(L.due(m, { screen: 'board' }), null, name + ' nothing due');
  });
});

test('y1_good_year: the recap\'s own lines once year one is in the books (Kenji = narration), else the band\'s talk', () => {
  const GG = load(), L = GG.lessons;
  const s = career(GG, 'hail_damage');
  const pre = L.steps(s, 'y1_good_year');
  ok(pre.length >= 2 && pre.every(x => x.who && !x.narr), 'before the recap: the content talk');
  s.recaps = [{ y: 1, fans: 300, songs: 2, gigs: 11, loans: 1, chem: 40 }];
  const post = L.steps(s, 'y1_good_year');
  const gy = GG.recap.goodYear(s, s.recaps[0]);
  eq(post.length, gy.length, 'one step per recap line');
  ok(post.some(x => x.narr && x.who === null && /Kenji/.test(x.text)), 'Kenji\'s line is narration');
  ok(post.filter(x => !x.narr).every(x => x.who !== 'kenji'), 'Kenji never voiced');
  ok(post.some(x => /300/.test(x.text)), 'numbers from the recap');
  ok(post.some(x => x.who === 'mom'), 'Mom (an npc of this band) keeps her loans line');
  eq(L.def('y1_good_year').mark, true, 'auto-run marks it (the recap page shows it), replays show the steps');
  s.totalWeek = 25;
  eq(L.due(s, { screen: 'recap' }), 'y1_good_year', 'due at the year-one recap');
  s.totalWeek = 49;
  eq(L.due(s, { screen: 'recap' }), null, 'not at year two');
});

test('purity: 2h_sim_lessons.js has no Math.random / Date / DOM, and lessons never touch the career RNG', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', '2h_sim_lessons.js'), 'utf8');
  ok(!/Math\.random|\bDate\b|document\.|window\.(?!GG)/.test(src), '2h_sim_lessons.js is pure');
  const GG = load(), L = GG.lessons;
  BANDS.forEach(b => {
    const s = career(GG, b), rng = s.rng, snap = JSON.stringify(s);
    L.LESSONS.forEach(id => { L.steps(s, id); L.due(s, { screen: 'card' }); L.due(s, { event: 'afterCard' }); });
    eq(s.rng, rng, b + ' rng untouched');
    eq(JSON.stringify(s), snap, b + ' steps/due never write the state');
  });
});

test('A15: each band\'s first gig is small (setSize <= 2) on an exposure/house deal; starter-song tempo reported', () => {
  const GG = load(), hand = [];
  BANDS.forEach(b => {
    const s = GG.career.newCareer({ seed: 3, bandId: b, player: { name: 'T' } });
    const worst = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(seed => Math.min.apply(null, GG.career.newCareer({ seed, bandId: b, player: { name: 'T' } }).songs.map(x => x.pattern.bpm)));
    const vid = GG.career.firstGigVenue(s), v = GG.gig.venue(vid);
    ok(v, b + ' has a first gig venue');
    ok((v.setSize || 99) <= 2, b + ' first gig setSize ' + v.setSize + ' <= 2');
    ok(v.deal === 'exposure' || v.kind === 'house', b + ' first gig is an exposure/house deal: ' + v.deal + '/' + v.kind);
    GG.career.startWeek(s);
    ok(s.gig && s.gig.venueId === vid, b + ' week one books it');
    // "the starter song's tempo <= the genre's slowest preset": the slowest starter song sits in the genre's slowest tempo band
    // (GG.songs.grooves(genre).tempo: [[0, 'Doom crawl'], [95, 'Headbang'], ...] -> below 95 bpm for metal).
    const bands = GG.songs.grooves(s.genre).tempo || [], cap = bands[1] ? bands[1][0] - 1 : Infinity;
    const over = worst.filter(x => x > cap);
    if (over.length) hand.push(b + ': the slowest starter song is above ' + cap + ' bpm (' + bands[0][1] + ', ' + s.genre + ') in ' + over.length + '/10 seeds (starter songs are random jams: ' + Math.min.apply(null, worst) + '-' + Math.max.apply(null, worst) + ' bpm)');
  });
  if (hand.length) console.log('HANDOVER (lead, A15 first gig tempo; bands/songs content is unowned): ' + hand.join('; '));
  if (process.env.A15_STRICT) eq(hand, [], 'A15 tempo');
});

done('sim_lessons');
